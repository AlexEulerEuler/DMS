from fastapi import APIRouter, Query

from app import store
from app.core.errors import AppError
from app.core.pagination import paginate
from app.schemas.common import IssueState, Priority
from app.schemas.models import IssueView
from app.schemas.requests import IssueCreateRequest, IssueOverlayUpdateRequest
from app.services.github import get_github_client

router = APIRouter(prefix="/issues", tags=["issues"])

_PRIORITY_ORDER = {Priority.urgent: 0, Priority.high: 1, Priority.normal: 2, Priority.low: 3}


@router.get("")
def list_issues(
    state: IssueState = Query(default=IssueState.open),
    priority: Priority | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=25, ge=1, le=25),
) -> dict:
    client = get_github_client()
    raw_issues = client.list_issues(state=state.value if state else None)
    merged = [store.merge_issue(issue) for issue in raw_issues]
    if priority is not None:
        merged = [issue for issue in merged if issue.priority == priority]
    if q:
        needle = q.lower()
        merged = [issue for issue in merged if needle in issue.title.lower()]
    # README §5: Issues sort by priority (urgent→low), then registration date (newest first).
    merged.sort(key=lambda issue: issue.createdAt, reverse=True)
    merged.sort(key=lambda issue: _PRIORITY_ORDER.get(issue.priority, 2))
    return paginate(merged, page, size)


@router.get("/{number}", response_model=IssueView)
def get_issue(number: int) -> IssueView:
    client = get_github_client()
    raw = client.get_issue(number)
    if raw is None:
        raise AppError(404, "not_found", "해당 이슈를 찾을 수 없습니다.")
    return store.merge_issue(raw)


@router.post("", response_model=IssueView, status_code=201)
def create_issue(payload: IssueCreateRequest) -> IssueView:
    client = get_github_client()
    raw = client.create_issue(payload.title, payload.body or "")
    store.set_overlay(raw.id, payload.priority or Priority.normal, [])
    return store.merge_issue(raw)


@router.patch("/{number}/overlay", response_model=IssueView)
def update_overlay(number: int, payload: IssueOverlayUpdateRequest) -> IssueView:
    client = get_github_client()
    raw = client.get_issue(number)
    if raw is None:
        raise AppError(404, "not_found", "해당 이슈를 찾을 수 없습니다.")
    store.set_overlay(number, payload.priority, payload.linkedWorkItems)
    return store.merge_issue(raw)
