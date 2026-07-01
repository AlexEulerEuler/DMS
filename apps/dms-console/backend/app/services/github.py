"""GitHub Issues proxy (api-contract.md §10).

Two implementations share the same `GitHubClient` protocol:

- `RealGitHubClient` calls the real GitHub REST API using a server-held token
  (README §6 — single user, credentials never reach the console/response).
- `MockGitHubClient` simulates GitHub Issues in memory so the console runs
  end-to-end without external credentials configured.

`get_github_client()` picks the real client when `DMS_GITHUB_TOKEN`,
`DMS_GITHUB_OWNER`, and `DMS_GITHUB_REPO` are all set, otherwise falls back to
the mock.
"""

import itertools
from datetime import UTC, datetime
from typing import Protocol

import httpx

from app.core.config import settings
from app.core.errors import AppError
from app.schemas.common import IssueState
from app.schemas.models import GitHubIssue


class GitHubClient(Protocol):
    def list_issues(self, state: str | None = None) -> list[GitHubIssue]: ...

    def get_issue(self, number: int) -> GitHubIssue | None: ...

    def create_issue(self, title: str, body: str) -> GitHubIssue: ...


class MockGitHubClient:
    """In-memory GitHub Issues simulator used when no GitHub App/token is configured."""

    def __init__(self) -> None:
        self._issues: dict[int, GitHubIssue] = {}
        self._counter = itertools.count(1)
        self._seed()

    def _next_number(self) -> int:
        return next(self._counter)

    def _seed(self) -> None:
        samples = [
            (
                "표준 목록 매칭 오류",
                "표준 목록 확정 단계에서 일부 항목이 중복 매칭됩니다. 재현 절차와 로그를 첨부합니다.",
                ["bug"],
                "octocat",
                "2026-06-15T02:12:00Z",
                False,
            ),
            (
                "입력 문서 파싱 실패",
                "특정 PDF 포맷에서 파싱 파이프라인이 예외를 던집니다.",
                ["bug", "urgent"],
                "hubot",
                "2026-06-18T05:40:00Z",
                False,
            ),
            (
                "생성 일정 API 응답 지연",
                "대량 마일스톤 조회 시 응답이 3초 이상 걸립니다. 캐싱 적용을 검토합니다.",
                ["performance"],
                "octocat",
                "2026-06-20T09:05:00Z",
                False,
            ),
            (
                "구버전 표준 목록 호환성 검토",
                "v2 표준 목록 포맷과의 호환성을 확인해야 합니다.",
                ["enhancement"],
                "monalisa",
                "2026-05-30T01:20:00Z",
                True,
            ),
            (
                "CLI 명령어 문서 업데이트 요청",
                "generate 명령의 옵션 설명이 최신 상태가 아닙니다.",
                ["docs"],
                "hubot",
                "2026-06-25T07:00:00Z",
                False,
            ),
        ]
        for title, body, labels, assignee, created_at, closed in samples:
            number = self._next_number()
            self._issues[number] = GitHubIssue(
                id=number,
                title=title,
                body=body,
                state=IssueState.closed if closed else IssueState.open,
                labels=labels,
                assignee=assignee,
                createdAt=created_at,
                htmlUrl=f"https://github.com/dms-org/dms-console/issues/{number}",
            )

    def list_issues(self, state: str | None = None) -> list[GitHubIssue]:
        values = list(self._issues.values())
        if state:
            values = [issue for issue in values if issue.state.value == state]
        return values

    def get_issue(self, number: int) -> GitHubIssue | None:
        return self._issues.get(number)

    def create_issue(self, title: str, body: str) -> GitHubIssue:
        number = self._next_number()
        issue = GitHubIssue(
            id=number,
            title=title,
            body=body or "",
            state=IssueState.open,
            labels=[],
            assignee=None,
            createdAt=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            htmlUrl=f"https://github.com/dms-org/dms-console/issues/{number}",
        )
        self._issues[number] = issue
        return issue


class RealGitHubClient:
    """Thin proxy over the GitHub REST API using a server-held token (§10.1, §10.2)."""

    def __init__(self, token: str, owner: str, repo: str, base_url: str) -> None:
        self._owner = owner
        self._repo = repo
        self._client = httpx.Client(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=10.0,
        )

    def _to_issue(self, raw: dict) -> GitHubIssue:
        assignee = raw.get("assignee")
        return GitHubIssue(
            id=raw["number"],
            title=raw["title"],
            body=raw.get("body") or "",
            state=IssueState(raw["state"]),
            labels=[label["name"] if isinstance(label, dict) else label for label in raw.get("labels", [])],
            assignee=assignee.get("login") if assignee else None,
            createdAt=raw["created_at"],
            htmlUrl=raw["html_url"],
        )

    def _raise_for_status(self, response: httpx.Response) -> None:
        if response.status_code == 429:
            raise AppError(429, "rate_limited", "GitHub API 레이트리밋을 초과했습니다.")
        if response.status_code >= 400:
            raise AppError(502, "github_error", "GitHub 연동 요청이 실패했습니다.")

    def list_issues(self, state: str | None = None) -> list[GitHubIssue]:
        try:
            response = self._client.get(
                f"/repos/{self._owner}/{self._repo}/issues",
                params={"state": state or "all", "per_page": 100},
            )
        except httpx.HTTPError as exc:
            raise AppError(502, "github_error", "GitHub 연동에 실패했습니다.") from exc
        self._raise_for_status(response)
        return [self._to_issue(item) for item in response.json() if "pull_request" not in item]

    def get_issue(self, number: int) -> GitHubIssue | None:
        try:
            response = self._client.get(f"/repos/{self._owner}/{self._repo}/issues/{number}")
        except httpx.HTTPError as exc:
            raise AppError(502, "github_error", "GitHub 연동에 실패했습니다.") from exc
        if response.status_code == 404:
            return None
        self._raise_for_status(response)
        return self._to_issue(response.json())

    def create_issue(self, title: str, body: str) -> GitHubIssue:
        try:
            response = self._client.post(
                f"/repos/{self._owner}/{self._repo}/issues",
                json={"title": title, "body": body or ""},
            )
        except httpx.HTTPError as exc:
            raise AppError(502, "github_error", "GitHub 이슈 생성에 실패했습니다.") from exc
        self._raise_for_status(response)
        return self._to_issue(response.json())


_client_singleton: GitHubClient | None = None


def get_github_client() -> GitHubClient:
    global _client_singleton
    if _client_singleton is None:
        if settings.github_token and settings.github_owner and settings.github_repo:
            _client_singleton = RealGitHubClient(
                settings.github_token,
                settings.github_owner,
                settings.github_repo,
                settings.github_api_url,
            )
        else:
            _client_singleton = MockGitHubClient()
    return _client_singleton


def reset_github_client() -> None:
    """Test helper: force re-selection of the client implementation."""
    global _client_singleton
    _client_singleton = None
