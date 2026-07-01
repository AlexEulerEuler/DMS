"""Idempotent DB seed (docs/ia/runtime.md §1).

Inserts realistic sample data ONLY when the DB is empty, so a fresh dev install
has something to click through while real user data still persists across
restarts. Disable in production with DMS_SEED=0 for a clean start.
"""

from datetime import UTC, datetime

from sqlalchemy import select

from app.db import session_scope
from app.models_db import (
    AgentRow,
    ExportFileRow,
    GeneratedScheduleRow,
    IssueOverlayRow,
    MasterListRow,
    TaskRow,
    WorkRow,
)
from app.store import PROJECT_ID, next_id

_TASK_SEED_PLAN = [
    (
        "프로젝트 관리",
        [
            ("기능 요건 정리 및 최종 산출물 정의", "done", "김도현", "2026-02-01", "2026-02-10", 100),
            ("데이터 수집 및 원천 데이터 정리", "in_progress", "이서연", "2026-02-05", "2026-02-20", 60),
            ("데이터 관리 체계 및 버전 관리 기준 수립", "planned", "박지민", "2026-02-18", "2026-02-28", None),
        ],
    ),
    (
        "표준 목록 생성",
        [
            ("통합 표준 목록 생성", "done", "이서연", "2026-02-10", "2026-02-24", 100),
            ("표준 목록 분류 체계 및 속성 정의", "done", "박지민", "2026-02-20", "2026-03-02", 100),
            ("통합 표준 목록 초안 자동 생성", "in_progress", "김도현", "2026-03-01", "2026-03-18", 45),
            ("협업 검토 기반 표준 목록 확정", "planned", "이서연", "2026-03-18", "2026-03-31", None),
        ],
    ),
    (
        "입력 문서 분석",
        [
            ("입력 문서 구조 파악", "done", "박지민", "2026-02-03", "2026-02-14", 100),
            ("요구 문서 및 제출 조건 추출", "in_progress", "김도현", "2026-02-14", "2026-03-05", 55),
            ("입력 문서–표준 목록 매칭 기준 수립", "planned", "이서연", "2026-03-05", "2026-03-20", None),
        ],
    ),
    (
        "일정 생성",
        [
            ("기준 일정 분석", "done", "박지민", "2026-03-02", "2026-03-16", 100),
            ("생성 일정/제출 마일스톤 기준 정의", "in_progress", "이서연", "2026-03-16", "2026-04-06", 40),
            ("문서별 제출 일정 생성", "planned", "김도현", "2026-04-06", "2026-04-30", None),
        ],
    ),
]

_AGENT_SEED = [
    (
        "표준 목록 정합 에이전트",
        "draft",
        "입력 문서와 기존 표준 목록 간 매칭을 검증하는 에이전트",
        "목적: 표준 목록 확정 전 매칭 오류를 사전에 잡아낸다.\n"
        "입력: 입력 문서 파싱 결과, 기존 표준 목록.\n"
        "동작: 유사도 매칭 후 불일치 항목을 리포트.\n"
        "필요 도구: 문서 파싱기, 임베딩 검색.",
        ["https://example.com/rag/master-list"],
        "2026-06-11T00:00:00Z",
        "2026-06-19T00:00:00Z",
    ),
    (
        "일정 생성 검증 에이전트",
        "confirmed",
        "생성 일정의 마일스톤 정합성을 검증",
        "목적: 생성 일정이 기준 일정 제약을 위반하지 않는지 확인.\n"
        "입력: 기준 일정, 생성 일정 초안.\n"
        "동작: 제약 조건 검사 후 위반 목록 반환.",
        [],
        "2026-06-12T00:00:00Z",
        "2026-06-20T00:00:00Z",
    ),
    (
        "이슈 트리아지 에이전트",
        "on_hold",
        "신규 이슈의 우선순위·라벨을 자동 추천",
        "목적: 신규 GitHub 이슈에 우선순위·라벨을 추천해 트리아지 속도를 높인다.\n"
        "현재 보류: 라벨 체계 확정 대기 중.",
        [],
        "2026-06-13T00:00:00Z",
        "2026-06-21T00:00:00Z",
    ),
]

_WORK_SEED = [
    ("비교 로직 구현", "김도현", "in_progress", "2026-03-02", "2026-03-20", "표준 목록 비교 로직 구현", "1", None),
    ("표준 목록 매칭 API 수정", "이서연", "planned", None, None, "매칭 API의 중복 매칭 버그 수정", "1", None),
    ("생성 일정 캐싱 적용", "박지민", "review", "2026-03-10", "2026-03-22", "생성 일정 API 응답 지연 개선", "3", None),
    (
        "표준 목록 정합 에이전트 프로토타입",
        "김도현",
        "planned",
        "2026-04-01",
        "2026-04-15",
        "표준 목록 정합 에이전트 기획을 프로토타입으로 구현",
        None,
        "agent_01",
    ),
    ("CLI 문서 갱신", "이서연", "done", "2026-06-25", "2026-06-26", "CLI 명령어 문서 최신화", "5", None),
]

_OVERLAY_SEED = {
    1: ("high", ["work_01", "work_02"]),
    2: ("urgent", []),
    3: ("normal", ["work_03"]),
    5: ("low", ["work_05"]),
}


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def seed_if_empty() -> None:
    with session_scope() as session:
        if session.execute(select(TaskRow).limit(1)).first() is not None:
            return  # already seeded — never overwrite real data

        for cat_order, (cat_title, tasks) in enumerate(_TASK_SEED_PLAN, start=1):
            cat_id = next_id(session, "cat")
            session.add(
                TaskRow(
                    id=cat_id, project_id=PROJECT_ID, type="category", title=cat_title, parent_id=None, order=cat_order
                )
            )
            for t_order, (title, status, owner, start, end, progress) in enumerate(tasks, start=1):
                task_id = next_id(session, "task")
                session.add(
                    TaskRow(
                        id=task_id,
                        project_id=PROJECT_ID,
                        type="task",
                        title=title,
                        parent_id=cat_id,
                        status=status,
                        owner=owner,
                        start_date=start,
                        end_date=end,
                        progress=progress,
                        order=t_order,
                        linked_wbs_id=task_id,
                    )
                )

        for name, status, desc, plan, refs, created, updated in _AGENT_SEED:
            session.add(
                AgentRow(
                    id=next_id(session, "agent"),
                    name=name,
                    status=status,
                    description=desc,
                    plan_note=plan,
                    references=refs,
                    created_at=_parse(created),
                    updated_at=_parse(updated),
                )
            )

        for title, owner, status, start, end, desc, linked_issue, linked_agent in _WORK_SEED:
            session.add(
                WorkRow(
                    id=next_id(session, "work"),
                    title=title,
                    owner=owner,
                    status=status,
                    start_date=start,
                    end_date=end,
                    description=desc,
                    linked_issue=linked_issue,
                    linked_agent=linked_agent,
                )
            )

        for number, (priority, linked) in _OVERLAY_SEED.items():
            session.add(IssueOverlayRow(issue_number=number, priority=priority, linked_work_items=linked))

        # Sample pipeline outputs (replaced by real generation in Phase 3).
        now = datetime(2026, 6, 22, tzinfo=UTC)
        master_id = next_id(session, "ml")
        session.add(
            MasterListRow(
                id=master_id,
                project_id=PROJECT_ID,
                items=[{"id": "mli_01", "title": "표준 항목 A"}, {"id": "mli_02", "title": "표준 항목 B"}],
                version="v3",
                status="confirmed",
                generated_at=datetime(2026, 6, 20, tzinfo=UTC),
            )
        )
        schedule_id = next_id(session, "gs")
        session.add(
            GeneratedScheduleRow(
                id=schedule_id,
                project_id=PROJECT_ID,
                milestones=[
                    {"id": "ms_01", "title": "1차 제출", "date": "2026-03-31"},
                    {"id": "ms_02", "title": "2차 제출", "date": "2026-05-15"},
                ],
                based_on="bs_01",
                generated_at=datetime(2026, 6, 21, tzinfo=UTC),
            )
        )
        session.add(
            ExportFileRow(
                id=next_id(session, "ex"),
                project_id=PROJECT_ID,
                format="xlsx",
                source_output=master_id,
                created_at=now,
            )
        )
        session.add(
            ExportFileRow(
                id=next_id(session, "ex"),
                project_id=PROJECT_ID,
                format="json",
                source_output=schedule_id,
                created_at=datetime(2026, 6, 23, tzinfo=UTC),
            )
        )
