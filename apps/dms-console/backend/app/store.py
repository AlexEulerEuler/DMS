"""Data-access layer (docs/ia/runtime.md §1).

Console-owned state lives in SQLite via SQLAlchemy so it survives restarts.
Each public function opens a short-lived session, so the router/API layer calls
``store.X(...)`` exactly as before. Static reference content (project meta,
pipeline summary, overview docs) stays as module constants since it is read-only.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import session_scope
from app.models_db import (
    AgentRow,
    ExportFileRow,
    GeneratedScheduleRow,
    IssueOverlayRow,
    MasterListRow,
    SequenceRow,
    TaskRow,
    WorkRow,
)
from app.schemas.common import (
    AgentStatus,
    CommonStatus,
    ExportFormat,
    MasterListStatus,
    Priority,
    TaskNodeType,
    WorkStatus,
)
from app.schemas.models import (
    Agent,
    ExportFile,
    GeneratedSchedule,
    GitHubIssue,
    IssueView,
    MasterList,
    MasterListItem,
    Milestone,
    PipelineInput,
    PipelineOutput,
    PipelineSummary,
    ProjectMeta,
    TaskIA,
    WBSItem,
    WorkflowStep,
    WorkItem,
)
from app.schemas.requests import (
    AgentCreateRequest,
    AgentUpdateRequest,
    TaskCreateRequest,
    TaskUpdateRequest,
    WorkItemCreateRequest,
    WorkItemUpdateRequest,
)

PROJECT_ID = "proj_dms"


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def next_id(session: Session, prefix: str) -> str:
    """Atomically increment a per-prefix counter and return e.g. 'task_07'."""
    row = session.get(SequenceRow, prefix)
    if row is None:
        row = SequenceRow(prefix=prefix, value=0)
        session.add(row)
    row.value += 1
    session.flush()
    return f"{prefix}_{row.value:02d}"


# ---------------------------------------------------------------------------
# Static reference content (Overview §6) — read-only, not user data.
# ---------------------------------------------------------------------------

_project_meta = ProjectMeta(
    version="0.4.1",
    language="TypeScript · Python 3.11",
    branch="main",
    package="dms-console",
    apiEndpoint="/api",
)

_pipeline_summary = PipelineSummary(
    inputs=[
        PipelineInput(key="input1", title="입력 문서", description="생성 기준이 되는 원본 입력(예: PDF)"),
        PipelineInput(key="input2", title="기존 표준 목록", description="생성 시 참조·정합에 쓰는 이미 확보된 목록"),
        PipelineInput(key="input3", title="기준 일정", description="생성 일정 산출의 기준선"),
    ],
    outputs=[
        PipelineOutput(title="표준 목록", description="입력 문서·기존 표준 목록을 근거로 생성·확정한 통합 목록"),
        PipelineOutput(title="생성 일정", description="기준 일정·표준 목록 기반 문서별 제출 일정(마일스톤 포함)"),
        PipelineOutput(title="내보내기 파일", description="JSON/XLSX/문서로 내보낸 산출 결과"),
    ],
    workflowSteps=[
        WorkflowStep(order=1, label="업로드"),
        WorkflowStep(order=2, label="파싱"),
        WorkflowStep(order=3, label="청킹"),
        WorkflowStep(order=4, label="표준 목록 매칭"),
        WorkflowStep(order=5, label="표준 목록 초안 생성"),
        WorkflowStep(order=6, label="표준 목록 확정"),
        WorkflowStep(order=7, label="생성 일정 산출"),
        WorkflowStep(order=8, label="내보내기"),
    ],
)

_overview_docs: dict[str, dict[str, str]] = {
    "overview": {
        "title": "프로젝트 개요",
        "content": (
            "입력 문서, 기존 표준 목록, 기준 일정을 입력받아 표준 목록과 생성 일정을 자동으로 "
            "산출하는 시스템입니다. 생성된 산출물은 Task/WBS/Work/Agent 모듈에서 계획·진행·실행으로 이어집니다."
        ),
    },
    "glossary": {
        "title": "도메인 용어",
        "content": (
            "- 표준 목록(Master List): 입력 문서·기존 표준 목록을 근거로 생성·확정하는 통합 목록\n"
            "- 입력 문서(Source Document): 생성 기준이 되는 원본 입력\n"
            "- 기존 표준 목록(Existing Master List): 생성 시 참조하는 이미 확보된 표준 목록\n"
            "- 기준 일정(Baseline Schedule): 생성 일정 산출의 기준선\n"
            "- 생성 일정(Generated Schedule): 산출된 문서별 제출 일정\n"
            "- 내보내기 파일(Export File): JSON/XLSX/문서로 내보낸 결과\n"
            "- 마일스톤: 제출 기준 시점(유형 A/B)\n"
            "- 진행률: 상태 기반 평균"
        ),
    },
    "pipeline": {
        "title": "전체 파이프라인",
        "content": (
            "업로드 → 파싱 → 청킹 → 표준 목록 매칭 → 표준 목록 초안 생성 → 표준 목록 확정 → "
            "생성 일정 산출 → 내보내기 순으로 진행됩니다. 각 단계의 산출은 다음 단계의 입력이 됩니다."
        ),
    },
    "modules": {
        "title": "서비스 모듈",
        "content": (
            "- Overview: 프로젝트 문서 허브\n- Task: 업무 정보구조(IA)\n- WBS: 일정·진행 현황\n"
            "- Issues: GitHub 이슈 미러 + 우선순위/연결\n- Work: 개발 작업 백로그·칸반\n- Agent: 에이전트 기획"
        ),
    },
    "api": {
        "title": "API 엔드포인트",
        "content": (
            "콘솔 REST API는 /api 하위에 있습니다. "
            "Overview·Task·WBS·Work·Agent·Issues 모듈과 입력 업로드(/api/inputs)·파이프라인(/api/pipeline)·"
            "에이전트 루프(/api/agent)를 제공합니다."
        ),
    },
    "cli": {
        "title": "CLI 명령어",
        "content": (
            "python -m app.cli generate — 업로드된 입력으로 표준 목록·생성 일정·내보내기 파일을 산출합니다."
        ),
    },
    "folder-structure": {
        "title": "폴더 구조",
        "content": "apps/dms-console/{frontend,backend,docs,contracts,integrations} 구조로 구성됩니다.",
    },
    "data": {
        "title": "주요 데이터",
        "content": "입력 문서를 업로드하고, 생성된 표준 목록·생성 일정·내보내기 파일을 조회·다운로드합니다.",
    },
    "tech-stack": {
        "title": "기술 스택",
        "content": "프론트엔드: Next.js(React) + TypeScript. 백엔드: FastAPI + SQLAlchemy(SQLite). GitHub Issues 연동.",
    },
    "env": {
        "title": "환경 변수",
        "content": (
            "- DMS_DB_PATH / DMS_STORAGE_DIR / DMS_SEED: 영속성·저장·시드\n"
            "- DMS_API_TOKEN: 설정 시 API 토큰 게이트\n"
            "- DMS_GITHUB_TOKEN / DMS_GITHUB_OWNER / DMS_GITHUB_REPO: GitHub 연동(미설정 시 모의 데이터)\n"
            "- NEXT_PUBLIC_API_URL: 프론트엔드가 호출할 백엔드 API 베이스 URL"
        ),
    },
    "runbook": {
        "title": "실행 방법",
        "content": "백엔드: npm run dev:dms:backend. 프론트엔드: npm run dev:dms:frontend. 배포: docker compose up.",
    },
    "limitations": {
        "title": "알려진 한계",
        "content": "GitHub webhook 실시간 반영 미지원(수동 새로고침), 다중 사용자·RBAC는 향후, 다크 모드 미지원.",
    },
}


def get_meta() -> ProjectMeta:
    return _project_meta


def get_pipeline_summary() -> PipelineSummary:
    return _pipeline_summary


def get_doc(slug: str) -> dict:
    doc = _overview_docs.get(slug)
    if doc is None:
        raise AppError(404, "not_found", "정의되지 않은 문서입니다.")
    return {"slug": slug, "title": doc["title"], "content": doc["content"]}


# ---------------------------------------------------------------------------
# ORM ↔ Pydantic converters
# ---------------------------------------------------------------------------


def _task_to_schema(row: TaskRow) -> TaskIA:
    return TaskIA(
        id=row.id,
        projectId=row.project_id,
        type=TaskNodeType(row.type),
        title=row.title,
        parentId=row.parent_id,
        status=CommonStatus(row.status) if row.status else None,
        owner=row.owner,
        startDate=row.start_date,
        endDate=row.end_date,
        progress=row.progress,
        order=row.order,
        linkedWbsId=row.linked_wbs_id,
        createdAt=_iso(row.created_at),
        updatedAt=_iso(row.updated_at),
    )


def _work_to_schema(row: WorkRow) -> WorkItem:
    return WorkItem(
        id=row.id,
        title=row.title,
        owner=row.owner,
        status=WorkStatus(row.status) if row.status else None,
        startDate=row.start_date,
        endDate=row.end_date,
        description=row.description,
        linkedIssue=row.linked_issue,
        linkedAgent=row.linked_agent,
    )


def _agent_to_schema(row: AgentRow) -> Agent:
    return Agent(
        id=row.id,
        name=row.name,
        status=AgentStatus(row.status) if row.status else None,
        description=row.description,
        planNote=row.plan_note,
        references=list(row.references or []),
        createdAt=_iso(row.created_at),
        updatedAt=_iso(row.updated_at),
    )


def _master_to_schema(row: MasterListRow) -> MasterList:
    return MasterList(
        id=row.id,
        projectId=row.project_id,
        items=[MasterListItem(**item) for item in (row.items or [])],
        version=row.version,
        generatedAt=_iso(row.generated_at),
        status=MasterListStatus(row.status) if row.status else None,
        downloadUrl=f"/api/overview/outputs/master-list/{row.id}/download",
    )


def _schedule_to_schema(row: GeneratedScheduleRow) -> GeneratedSchedule:
    return GeneratedSchedule(
        id=row.id,
        projectId=row.project_id,
        milestones=[Milestone(**m) for m in (row.milestones or [])],
        basedOn=row.based_on,
        generatedAt=_iso(row.generated_at),
        downloadUrl=f"/api/overview/outputs/schedule/{row.id}/download",
    )


def _export_to_schema(row: ExportFileRow) -> ExportFile:
    return ExportFile(
        id=row.id,
        projectId=row.project_id,
        format=ExportFormat(row.format),
        sourceOutput=row.source_output,
        createdAt=_iso(row.created_at),
        downloadUrl=f"/api/overview/outputs/export/{row.id}/download",
    )


def _require_title(title: str, field: str = "제목") -> None:
    if not title or not title.strip():
        raise AppError(400, "validation_error", f"{field}은(는) 필수입니다.")


# ---------------------------------------------------------------------------
# TaskIA tree
# ---------------------------------------------------------------------------


def _progress_of_row(row: TaskRow) -> int:
    if row.progress is not None:
        return row.progress
    return {"done": 100, "in_progress": 50, "planned": 0}.get(row.status or "planned", 0)


def _descendant_task_rows(all_rows: list[TaskRow], node_id: str) -> list[TaskRow]:
    result: list[TaskRow] = []
    for child in [r for r in all_rows if r.parent_id == node_id]:
        if child.type == TaskNodeType.task.value:
            result.append(child)
        else:
            result.extend(_descendant_task_rows(all_rows, child.id))
    return result


def _aggregate(desc_rows: list[TaskRow]) -> tuple[CommonStatus | None, int | None]:
    statuses = [d.status for d in desc_rows if d.status]
    if not statuses:
        return None, None
    if all(s == "done" for s in statuses):
        agg = CommonStatus.done
    elif any(s == "in_progress" for s in statuses) or (
        any(s == "done" for s in statuses) and any(s == "planned" for s in statuses)
    ):
        agg = CommonStatus.in_progress
    else:
        agg = CommonStatus.planned
    progresses = [_progress_of_row(d) for d in desc_rows]
    avg = round(sum(progresses) / len(progresses)) if progresses else None
    return agg, avg


def list_tasks(status_filter: CommonStatus | None = None) -> list[TaskIA]:
    with session_scope() as session:
        rows = list(session.execute(select(TaskRow)).scalars().all())
        nodes: list[TaskIA] = []
        for row in sorted(rows, key=lambda r: (r.parent_id or "", r.order or 0)):
            if row.type == TaskNodeType.task.value:
                if status_filter is not None and row.status != status_filter.value:
                    continue
                nodes.append(_task_to_schema(row))
            else:
                agg_status, agg_progress = _aggregate(_descendant_task_rows(rows, row.id))
                node = _task_to_schema(row)
                node.status = agg_status
                node.progress = agg_progress
                nodes.append(node)
        return nodes


def _depth_of(session: Session, parent_id: str | None) -> int:
    depth = 0
    current = parent_id
    while current:
        node = session.get(TaskRow, current)
        if node is None:
            break
        depth += 1
        current = node.parent_id
    return depth


def _child_count(session: Session, parent_id: str | None) -> int:
    stmt = select(TaskRow).where(
        TaskRow.parent_id.is_(None) if parent_id is None else TaskRow.parent_id == parent_id
    )
    return len(list(session.execute(stmt).scalars().all()))


def create_task(payload: TaskCreateRequest) -> TaskIA:
    _require_title(payload.title)
    with session_scope() as session:
        if payload.parentId is not None and session.get(TaskRow, payload.parentId) is None:
            raise AppError(404, "not_found", "상위 노드를 찾을 수 없습니다.")
        if _depth_of(session, payload.parentId) + 1 > 3:
            raise AppError(400, "validation_error", "구분–중분류–세부 업무 3단을 초과할 수 없습니다.")

        is_task = payload.type == TaskNodeType.task
        prefix = "cat" if payload.type == TaskNodeType.category else "task"
        node_id = next_id(session, prefix)
        row = TaskRow(
            id=node_id,
            project_id=PROJECT_ID,
            type=payload.type.value,
            title=payload.title,
            parent_id=payload.parentId,
            status=payload.status.value if payload.status else None,
            owner=payload.owner,
            start_date=payload.startDate,
            end_date=payload.endDate,
            progress=payload.progress,
            order=payload.order if payload.order is not None else _child_count(session, payload.parentId) + 1,
            linked_wbs_id=node_id if is_task else None,
        )
        session.add(row)
        session.flush()
        return _task_to_schema(row)


_TASK_FIELD_MAP = {
    "type": "type",
    "title": "title",
    "parentId": "parent_id",
    "status": "status",
    "owner": "owner",
    "startDate": "start_date",
    "endDate": "end_date",
    "progress": "progress",
    "order": "order",
}


def update_task(task_id: str, payload: TaskUpdateRequest) -> TaskIA:
    updates = payload.model_dump(exclude_unset=True)
    with session_scope() as session:
        row = session.get(TaskRow, task_id)
        if row is None:
            raise AppError(404, "not_found", "해당 업무를 찾을 수 없습니다.")
        if "title" in updates:
            _require_title(updates["title"])
        if "parentId" in updates and updates["parentId"] != row.parent_id:
            new_parent = updates["parentId"]
            if new_parent is not None and session.get(TaskRow, new_parent) is None:
                raise AppError(404, "not_found", "상위 노드를 찾을 수 없습니다.")
            if _depth_of(session, new_parent) + 1 > 3:
                raise AppError(400, "validation_error", "구분–중분류–세부 업무 3단을 초과할 수 없습니다.")
        for key, value in updates.items():
            attr = _TASK_FIELD_MAP.get(key)
            if attr is None:
                continue
            if key in {"type", "status"} and value is not None:
                value = value.value if hasattr(value, "value") else value
            setattr(row, attr, value)
        session.flush()
        return _task_to_schema(row)


def delete_task(task_id: str) -> None:
    with session_scope() as session:
        root = session.get(TaskRow, task_id)
        if root is None:
            raise AppError(404, "not_found", "해당 업무를 찾을 수 없습니다.")
        all_rows = list(session.execute(select(TaskRow)).scalars().all())
        to_delete = {task_id}
        stack = [task_id]
        while stack:
            current = stack.pop()
            for child in [r for r in all_rows if r.parent_id == current]:
                if child.id not in to_delete:
                    to_delete.add(child.id)
                    stack.append(child.id)
        for row in all_rows:
            if row.id in to_delete:
                session.delete(row)


# ---------------------------------------------------------------------------
# WBS derivation
# ---------------------------------------------------------------------------


def _wbs_progress(item: WBSItem) -> int:
    if item.progress is not None:
        return item.progress
    return {CommonStatus.done: 100, CommonStatus.in_progress: 50, CommonStatus.planned: 0}.get(item.status, 0)


def get_wbs() -> dict:
    with session_scope() as session:
        rows = list(session.execute(select(TaskRow)).scalars().all())
        by_id = {r.id: r for r in rows}
        categories = {r.id: r for r in rows if r.type == TaskNodeType.category.value}

        def category_of(row: TaskRow) -> TaskRow | None:
            current = row.parent_id
            while current:
                parent = by_id.get(current)
                if parent is None:
                    break
                if parent.type == TaskNodeType.category.value:
                    return parent
                current = parent.parent_id
            return None

        task_rows = [r for r in rows if r.type == TaskNodeType.task.value]
        cat_order = {c.id: (c.order or 0) for c in categories.values()}
        task_rows.sort(key=lambda r: (cat_order.get(category_of(r).id, 0) if category_of(r) else 0, r.order or 0))

        items = [
            WBSItem(
                id=r.id,
                group=(category_of(r).title if category_of(r) else "미분류"),
                title=r.title,
                status=CommonStatus(r.status) if r.status else CommonStatus.planned,
                owner=r.owner,
                startDate=r.start_date,
                endDate=r.end_date,
                progress=r.progress,
                order=r.order or 0,
            )
            for r in task_rows
        ]

        if items:
            overall = round(sum(_wbs_progress(i) for i in items) / len(items))
            starts = [i.startDate for i in items if i.startDate]
            ends = [i.endDate for i in items if i.endDate]
            time_axis = {"startDate": min(starts) if starts else None, "endDate": max(ends) if ends else None}
        else:
            overall = 0
            time_axis = {"startDate": None, "endDate": None}

        latest = session.execute(
            select(GeneratedScheduleRow).order_by(GeneratedScheduleRow.generated_at.desc())
        ).scalars().first()
        source_ms = list(latest.milestones or []) if latest else []
        milestones = [
            {"id": m.get("id"), "type": "A" if idx == 0 else "B", "label": m.get("title"), "date": m.get("date")}
            for idx, m in enumerate(source_ms)
        ]

        return {"items": items, "milestones": milestones, "overallProgress": overall, "timeAxis": time_axis}


# ---------------------------------------------------------------------------
# WorkItem
# ---------------------------------------------------------------------------


def _validate_work_dates(start: str | None, end: str | None) -> None:
    if start and end and end < start:
        raise AppError(400, "validation_error", "종료일은 시작일보다 빠를 수 없습니다.")


def list_work(status: WorkStatus | None = None, q: str | None = None) -> list[WorkItem]:
    with session_scope() as session:
        stmt = select(WorkRow).order_by(WorkRow.created_at.desc(), WorkRow.id.desc())
        if status is not None:
            stmt = stmt.where(WorkRow.status == status.value)
        rows = list(session.execute(stmt).scalars().all())
        if q:
            needle = q.lower()
            rows = [r for r in rows if needle in r.title.lower()]
        return [_work_to_schema(r) for r in rows]


def create_work(payload: WorkItemCreateRequest) -> WorkItem:
    _require_title(payload.title, "작업명")
    _validate_work_dates(payload.startDate, payload.endDate)
    with session_scope() as session:
        row = WorkRow(
            id=next_id(session, "work"),
            title=payload.title,
            owner=payload.owner,
            status=(payload.status or WorkStatus.planned).value,
            start_date=payload.startDate,
            end_date=payload.endDate,
            description=payload.description,
            linked_issue=payload.linkedIssue,
            linked_agent=payload.linkedAgent,
        )
        session.add(row)
        session.flush()
        return _work_to_schema(row)


def get_work(work_id: str) -> WorkItem:
    with session_scope() as session:
        row = session.get(WorkRow, work_id)
        if row is None:
            raise AppError(404, "not_found", "해당 작업을 찾을 수 없습니다.")
        return _work_to_schema(row)


_WORK_FIELD_MAP = {
    "title": "title",
    "owner": "owner",
    "status": "status",
    "startDate": "start_date",
    "endDate": "end_date",
    "description": "description",
    "linkedIssue": "linked_issue",
    "linkedAgent": "linked_agent",
}


def update_work(work_id: str, payload: WorkItemUpdateRequest) -> WorkItem:
    updates = payload.model_dump(exclude_unset=True)
    with session_scope() as session:
        row = session.get(WorkRow, work_id)
        if row is None:
            raise AppError(404, "not_found", "해당 작업을 찾을 수 없습니다.")
        if "title" in updates:
            _require_title(updates["title"], "작업명")
        new_start = updates.get("startDate", row.start_date)
        new_end = updates.get("endDate", row.end_date)
        _validate_work_dates(new_start, new_end)
        for key, value in updates.items():
            attr = _WORK_FIELD_MAP.get(key)
            if attr is None:
                continue
            if key == "status" and value is not None:
                value = value.value if hasattr(value, "value") else value
            setattr(row, attr, value)
        session.flush()
        return _work_to_schema(row)


def delete_work(work_id: str) -> None:
    with session_scope() as session:
        row = session.get(WorkRow, work_id)
        if row is None:
            raise AppError(404, "not_found", "해당 작업을 찾을 수 없습니다.")
        session.delete(row)


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------


def list_agents(status: AgentStatus | None = None, q: str | None = None) -> list[Agent]:
    with session_scope() as session:
        stmt = select(AgentRow).order_by(AgentRow.created_at.desc(), AgentRow.id.desc())
        if status is not None:
            stmt = stmt.where(AgentRow.status == status.value)
        rows = list(session.execute(stmt).scalars().all())
        if q:
            needle = q.lower()
            rows = [r for r in rows if needle in r.name.lower()]
        return [_agent_to_schema(r) for r in rows]


def create_agent(payload: AgentCreateRequest) -> Agent:
    _require_title(payload.name, "에이전트명")
    with session_scope() as session:
        row = AgentRow(
            id=next_id(session, "agent"),
            name=payload.name,
            status=(payload.status or AgentStatus.draft).value,
            description=payload.description,
            plan_note=payload.planNote,
            references=payload.references or [],
        )
        session.add(row)
        session.flush()
        return _agent_to_schema(row)


def get_agent(agent_id: str) -> Agent:
    with session_scope() as session:
        row = session.get(AgentRow, agent_id)
        if row is None:
            raise AppError(404, "not_found", "해당 에이전트를 찾을 수 없습니다.")
        return _agent_to_schema(row)


_AGENT_FIELD_MAP = {
    "name": "name",
    "status": "status",
    "description": "description",
    "planNote": "plan_note",
    "references": "references",
}


def update_agent(agent_id: str, payload: AgentUpdateRequest) -> Agent:
    updates = payload.model_dump(exclude_unset=True)
    with session_scope() as session:
        row = session.get(AgentRow, agent_id)
        if row is None:
            raise AppError(404, "not_found", "해당 에이전트를 찾을 수 없습니다.")
        if "name" in updates:
            _require_title(updates["name"], "에이전트명")
        for key, value in updates.items():
            attr = _AGENT_FIELD_MAP.get(key)
            if attr is None:
                continue
            if key == "status" and value is not None:
                value = value.value if hasattr(value, "value") else value
            if key == "references" and value is None:
                value = []
            setattr(row, attr, value)
        session.flush()
        return _agent_to_schema(row)


def delete_agent(agent_id: str) -> None:
    with session_scope() as session:
        row = session.get(AgentRow, agent_id)
        if row is None:
            raise AppError(404, "not_found", "해당 에이전트를 찾을 수 없습니다.")
        session.delete(row)


# ---------------------------------------------------------------------------
# Issue overlay
# ---------------------------------------------------------------------------


def get_overlay(number: int) -> dict:
    with session_scope() as session:
        row = session.get(IssueOverlayRow, number)
        if row is None:
            return {"priority": Priority.normal, "linkedWorkItems": []}
        return {"priority": Priority(row.priority), "linkedWorkItems": list(row.linked_work_items or [])}


def set_overlay(number: int, priority: Priority | None, linked: list[str] | None) -> dict:
    with session_scope() as session:
        row = session.get(IssueOverlayRow, number)
        if row is None:
            row = IssueOverlayRow(issue_number=number, priority=Priority.normal.value, linked_work_items=[])
            session.add(row)
        if priority is not None:
            row.priority = priority.value
        if linked is not None:
            row.linked_work_items = list(linked)
        session.flush()
        return {"priority": Priority(row.priority), "linkedWorkItems": list(row.linked_work_items or [])}


def merge_issue(raw: GitHubIssue) -> IssueView:
    overlay = get_overlay(raw.id)
    return IssueView(**raw.model_dump(), **overlay)


# ---------------------------------------------------------------------------
# Pipeline outputs (populated by seed + generation pipeline)
# ---------------------------------------------------------------------------


def get_outputs() -> dict:
    with session_scope() as session:
        masters = list(session.execute(select(MasterListRow).order_by(MasterListRow.generated_at.desc())).scalars())
        schedules = list(
            session.execute(select(GeneratedScheduleRow).order_by(GeneratedScheduleRow.generated_at.desc())).scalars()
        )
        exports = list(session.execute(select(ExportFileRow).order_by(ExportFileRow.created_at.desc())).scalars())
        return {
            "masterLists": [_master_to_schema(r) for r in masters],
            "generatedSchedules": [_schedule_to_schema(r) for r in schedules],
            "exportFiles": [_export_to_schema(r) for r in exports],
        }


def get_download(kind: str, item_id: str) -> tuple[str, str] | tuple[str, bytes] | None:
    """Return (filename, content) for an output artifact, or None if missing.

    master-list/schedule serialize the record to JSON; export streams the real
    generated file from storage when present (Phase 3), else a JSON fallback.
    """
    with session_scope() as session:
        if kind == "master-list":
            row = session.get(MasterListRow, item_id)
            return (f"{item_id}.json", _master_to_schema(row).model_dump_json(indent=2)) if row else None
        if kind == "schedule":
            row = session.get(GeneratedScheduleRow, item_id)
            return (f"{item_id}.json", _schedule_to_schema(row).model_dump_json(indent=2)) if row else None
        if kind == "export":
            row = session.get(ExportFileRow, item_id)
            if row is None:
                return None
            filename = f"{item_id}.{row.format}"
            if row.stored_path:
                import os

                if os.path.exists(row.stored_path):
                    with open(row.stored_path, "rb") as handle:
                        return filename, handle.read()
            return filename, _export_to_schema(row).model_dump_json(indent=2)
        return None
