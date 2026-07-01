"""In-memory data store + seed data for the console's own entities.

There is no database in this build (docs/spec leaves state management to
implementation discretion). All console-owned entities (TaskIA, WorkItem,
Agent, overview docs/outputs, issue overlays) live in module-level state,
seeded with realistic sample data on import. GitHub issues themselves are
owned by app.services.github (mock or real).
"""

import itertools
from datetime import UTC, datetime

from app.core.errors import AppError
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


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


class _Sequence:
    def __init__(self, prefix: str) -> None:
        self._prefix = prefix
        self._counter = itertools.count(1)

    def next(self) -> str:
        return f"{self._prefix}_{next(self._counter):02d}"


_cat_seq = _Sequence("cat")
_task_seq = _Sequence("task")
_work_seq = _Sequence("work")
_agent_seq = _Sequence("agent")

_tasks: dict[str, TaskIA] = {}
_work_items: dict[str, WorkItem] = {}
_agents: dict[str, Agent] = {}
_issue_overlays: dict[int, dict] = {}

# ---------------------------------------------------------------------------
# Project meta / pipeline summary (Overview §6)
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
        WorkflowStep(order=2, label="파싱·청킹"),
        WorkflowStep(order=3, label="표준 목록 매칭"),
        WorkflowStep(order=4, label="표준 목록 초안 생성"),
        WorkflowStep(order=5, label="협업 검토"),
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
            "업로드 → 파싱·청킹 → 표준 목록 매칭 → 표준 목록 초안 생성 → 협업 검토 → 표준 목록 확정 → "
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
            "Overview·Task·WBS·Work·Agent·Issues 모듈별 엔드포인트를 제공합니다."
        ),
    },
    "cli": {
        "title": "CLI 명령어",
        "content": (
            "generate master-list · generate schedule · export 명령으로 "
            "표준 목록·생성 일정·내보내기 파이프라인을 실행합니다."
        ),
    },
    "folder-structure": {
        "title": "폴더 구조",
        "content": "apps/dms-console/{frontend,backend,docs,contracts,integrations} 구조로 구성됩니다.",
    },
    "data": {
        "title": "주요 데이터",
        "content": "생성된 표준 목록·생성 일정·내보내기 파일을 조회하고 다운로드합니다.",
    },
    "tech-stack": {
        "title": "기술 스택",
        "content": "프론트엔드: Next.js(React) + TypeScript. 백엔드: FastAPI(Python). GitHub Issues 연동.",
    },
    "env": {
        "title": "환경 변수",
        "content": (
            "- DMS_GITHUB_TOKEN / DMS_GITHUB_OWNER / DMS_GITHUB_REPO: GitHub 연동(미설정 시 모의 데이터 사용)\n"
            "- NEXT_PUBLIC_API_URL: 프론트엔드가 호출할 백엔드 API 베이스 URL"
        ),
    },
    "runbook": {
        "title": "실행 방법",
        "content": "백엔드: npm run dev:dms:backend. 프론트엔드: npm run dev:dms:frontend.",
    },
    "limitations": {
        "title": "알려진 한계",
        "content": "GitHub webhook 실시간 반영 미지원(수동 새로고침), 다국어 미지원, 다크 모드 미지원.",
    },
}

_master_lists = [
    MasterList(
        id="ml_01",
        projectId=PROJECT_ID,
        items=[MasterListItem(id="mli_01", title="표준 항목 A"), MasterListItem(id="mli_02", title="표준 항목 B")],
        version="v3",
        generatedAt="2026-06-20T00:00:00Z",
        status=MasterListStatus.confirmed,
        downloadUrl="/api/overview/outputs/master-list/ml_01/download",
    ),
]

_generated_schedules = [
    GeneratedSchedule(
        id="gs_01",
        projectId=PROJECT_ID,
        milestones=[
            Milestone(id="ms_01", title="1차 제출", date="2026-03-31"),
            Milestone(id="ms_02", title="2차 제출", date="2026-05-15"),
        ],
        basedOn="bs_01",
        generatedAt="2026-06-21T00:00:00Z",
        downloadUrl="/api/overview/outputs/schedule/gs_01/download",
    ),
]

_export_files = [
    ExportFile(
        id="ex_01",
        projectId=PROJECT_ID,
        format=ExportFormat.xlsx,
        sourceOutput="ml_01",
        createdAt="2026-06-22T00:00:00Z",
        downloadUrl="/api/overview/outputs/export/ex_01/download",
    ),
    ExportFile(
        id="ex_02",
        projectId=PROJECT_ID,
        format=ExportFormat.json,
        sourceOutput="gs_01",
        createdAt="2026-06-23T00:00:00Z",
        downloadUrl="/api/overview/outputs/export/ex_02/download",
    ),
]


def get_meta() -> ProjectMeta:
    return _project_meta


def get_pipeline_summary() -> PipelineSummary:
    return _pipeline_summary


def get_doc(slug: str) -> dict:
    doc = _overview_docs.get(slug)
    if doc is None:
        raise AppError(404, "not_found", "정의되지 않은 문서입니다.")
    return {"slug": slug, "title": doc["title"], "content": doc["content"]}


def get_outputs() -> dict:
    return {
        "masterLists": _master_lists,
        "generatedSchedules": _generated_schedules,
        "exportFiles": _export_files,
    }


def get_download(kind: str, item_id: str) -> tuple[str, str] | None:
    if kind == "master-list":
        match = next((m for m in _master_lists if m.id == item_id), None)
        return (f"{item_id}.json", match.model_dump_json(indent=2)) if match else None
    if kind == "schedule":
        match = next((s for s in _generated_schedules if s.id == item_id), None)
        return (f"{item_id}.json", match.model_dump_json(indent=2)) if match else None
    if kind == "export":
        match = next((e for e in _export_files if e.id == item_id), None)
        if not match:
            return None
        return f"{item_id}.{match.format.value}", f"내보내기 파일 {item_id} ({match.format.value})\n"
    return None


# ---------------------------------------------------------------------------
# TaskIA tree (task.md, data-model.md §3.4)
# ---------------------------------------------------------------------------


def _add_category(title: str, order: int) -> TaskIA:
    node = TaskIA(
        id=_cat_seq.next(),
        projectId=PROJECT_ID,
        type=TaskNodeType.category,
        title=title,
        parentId=None,
        order=order,
        createdAt=_now(),
        updatedAt=_now(),
    )
    _tasks[node.id] = node
    return node


def _add_task(
    parent: TaskIA,
    title: str,
    status: CommonStatus,
    owner: str,
    start: str | None,
    end: str | None,
    progress: int | None,
    order: int,
) -> TaskIA:
    node_id = _task_seq.next()
    node = TaskIA(
        id=node_id,
        projectId=PROJECT_ID,
        type=TaskNodeType.task,
        title=title,
        parentId=parent.id,
        status=status,
        owner=owner,
        startDate=start,
        endDate=end,
        progress=progress,
        order=order,
        linkedWbsId=node_id,
        createdAt=_now(),
        updatedAt=_now(),
    )
    _tasks[node.id] = node
    return node


#: (category title, [(task title, status, owner, start, end, progress), ...])
_TASK_SEED_PLAN: list[tuple[str, list[tuple[str, CommonStatus, str, str | None, str | None, int | None]]]] = [
    (
        "프로젝트 관리",
        [
            ("기능 요건 정리 및 최종 산출물 정의", CommonStatus.done, "김도현", "2026-02-01", "2026-02-10", 100),
            ("데이터 수집 및 원천 데이터 정리", CommonStatus.in_progress, "이서연", "2026-02-05", "2026-02-20", 60),
            (
                "데이터 관리 체계 및 버전 관리 기준 수립",
                CommonStatus.planned,
                "박지민",
                "2026-02-18",
                "2026-02-28",
                None,
            ),
        ],
    ),
    (
        "표준 목록 생성",
        [
            ("통합 표준 목록 생성", CommonStatus.done, "이서연", "2026-02-10", "2026-02-24", 100),
            ("표준 목록 분류 체계 및 속성 정의", CommonStatus.done, "박지민", "2026-02-20", "2026-03-02", 100),
            ("통합 표준 목록 초안 자동 생성", CommonStatus.in_progress, "김도현", "2026-03-01", "2026-03-18", 45),
            ("협업 검토 기반 표준 목록 확정", CommonStatus.planned, "이서연", "2026-03-18", "2026-03-31", None),
        ],
    ),
    (
        "입력 문서 분석",
        [
            ("입력 문서 구조 파악", CommonStatus.done, "박지민", "2026-02-03", "2026-02-14", 100),
            ("요구 문서 및 제출 조건 추출", CommonStatus.in_progress, "김도현", "2026-02-14", "2026-03-05", 55),
            ("입력 문서–표준 목록 매칭 기준 수립", CommonStatus.planned, "이서연", "2026-03-05", "2026-03-20", None),
        ],
    ),
    (
        "일정 생성",
        [
            ("기준 일정 분석", CommonStatus.done, "박지민", "2026-03-02", "2026-03-16", 100),
            ("생성 일정/제출 마일스톤 기준 정의", CommonStatus.in_progress, "이서연", "2026-03-16", "2026-04-06", 40),
            ("문서별 제출 일정 생성", CommonStatus.planned, "김도현", "2026-04-06", "2026-04-30", None),
        ],
    ),
]


def _seed_tasks() -> None:
    for cat_order, (category_title, tasks) in enumerate(_TASK_SEED_PLAN, start=1):
        category = _add_category(category_title, cat_order)
        for task_order, (title, status, owner, start, end, progress) in enumerate(tasks, start=1):
            _add_task(category, title, status, owner, start, end, progress, task_order)


def _children(parent_id: str | None) -> list[TaskIA]:
    return sorted((t for t in _tasks.values() if t.parentId == parent_id), key=lambda t: (t.order or 0))


def _descendant_tasks(node_id: str) -> list[TaskIA]:
    result: list[TaskIA] = []
    for child in _children(node_id):
        if child.type == TaskNodeType.task:
            result.append(child)
        else:
            result.extend(_descendant_tasks(child.id))
    return result


def _progress_of(node: TaskIA) -> int:
    if node.progress is not None:
        return node.progress
    return {CommonStatus.done: 100, CommonStatus.in_progress: 50, CommonStatus.planned: 0}.get(node.status, 0)


def _aggregate(descendants: list[TaskIA]) -> tuple[CommonStatus | None, int | None]:
    statuses = [d.status for d in descendants if d.status]
    if not statuses:
        return None, None
    if all(s == CommonStatus.done for s in statuses):
        agg_status = CommonStatus.done
    elif any(s == CommonStatus.in_progress for s in statuses) or (
        any(s == CommonStatus.done for s in statuses) and any(s == CommonStatus.planned for s in statuses)
    ):
        agg_status = CommonStatus.in_progress
    else:
        agg_status = CommonStatus.planned
    progresses = [_progress_of(d) for d in descendants]
    avg_progress = round(sum(progresses) / len(progresses)) if progresses else None
    return agg_status, avg_progress


def list_tasks(status_filter: CommonStatus | None = None) -> list[TaskIA]:
    """Full tree, flattened. Category/group status+progress are always computed from
    descendants; task rows are filtered by status while ancestor nodes stay (task.md §10)."""
    nodes: list[TaskIA] = []
    for node in sorted(_tasks.values(), key=lambda t: (t.parentId or "", t.order or 0)):
        if node.type == TaskNodeType.task:
            if status_filter is not None and node.status != status_filter:
                continue
            nodes.append(node)
        else:
            agg_status, agg_progress = _aggregate(_descendant_tasks(node.id))
            nodes.append(node.model_copy(update={"status": agg_status, "progress": agg_progress}))
    return nodes


def _depth_of(parent_id: str | None) -> int:
    depth = 0
    current = parent_id
    while current:
        node = _tasks.get(current)
        if node is None:
            break
        depth += 1
        current = node.parentId
    return depth


def _require_title(title: str) -> None:
    if not title or not title.strip():
        raise AppError(400, "validation_error", "제목은 필수입니다.")


def create_task(payload: TaskCreateRequest) -> TaskIA:
    _require_title(payload.title)
    if payload.parentId is not None and payload.parentId not in _tasks:
        raise AppError(404, "not_found", "상위 노드를 찾을 수 없습니다.")
    if _depth_of(payload.parentId) + 1 > 3:
        raise AppError(400, "validation_error", "구분–중분류–세부 업무 3단을 초과할 수 없습니다.")
    node_id = _cat_seq.next() if payload.type == TaskNodeType.category else _task_seq.next()
    now = _now()
    node = TaskIA(
        id=node_id,
        projectId=PROJECT_ID,
        type=payload.type,
        title=payload.title,
        parentId=payload.parentId,
        status=payload.status,
        owner=payload.owner,
        startDate=payload.startDate,
        endDate=payload.endDate,
        progress=payload.progress,
        order=payload.order if payload.order is not None else len(_children(payload.parentId)) + 1,
        linkedWbsId=node_id if payload.type == TaskNodeType.task else None,
        createdAt=now,
        updatedAt=now,
    )
    _tasks[node.id] = node
    return node


def update_task(task_id: str, payload: TaskUpdateRequest) -> TaskIA:
    node = _tasks.get(task_id)
    if node is None:
        raise AppError(404, "not_found", "해당 업무를 찾을 수 없습니다.")
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates:
        _require_title(updates["title"])
    if "parentId" in updates and updates["parentId"] != node.parentId:
        new_parent = updates["parentId"]
        if new_parent is not None and new_parent not in _tasks:
            raise AppError(404, "not_found", "상위 노드를 찾을 수 없습니다.")
        if _depth_of(new_parent) + 1 > 3:
            raise AppError(400, "validation_error", "구분–중분류–세부 업무 3단을 초과할 수 없습니다.")
    merged = node.model_dump()
    merged.update(updates)
    merged["updatedAt"] = _now()
    updated = TaskIA(**merged)
    _tasks[task_id] = updated
    return updated


def delete_task(task_id: str) -> None:
    if task_id not in _tasks:
        raise AppError(404, "not_found", "해당 업무를 찾을 수 없습니다.")
    to_delete = [task_id]
    stack = [task_id]
    while stack:
        current = stack.pop()
        kids = [t.id for t in _tasks.values() if t.parentId == current]
        to_delete.extend(kids)
        stack.extend(kids)
    for node_id in to_delete:
        _tasks.pop(node_id, None)


# ---------------------------------------------------------------------------
# WBS derivation (wbs.md §6-7)
# ---------------------------------------------------------------------------


def _wbs_progress_of(item: WBSItem) -> int:
    if item.progress is not None:
        return item.progress
    return {CommonStatus.done: 100, CommonStatus.in_progress: 50, CommonStatus.planned: 0}.get(item.status, 0)


def _category_of(node: TaskIA) -> TaskIA | None:
    current = node.parentId
    while current:
        parent = _tasks.get(current)
        if parent is None:
            break
        if parent.type == TaskNodeType.category:
            return parent
        current = parent.parentId
    return None


def _group_title_of(node: TaskIA) -> str:
    category = _category_of(node)
    return category.title if category else "미분류"


def get_wbs() -> dict:
    task_nodes = [t for t in _tasks.values() if t.type == TaskNodeType.task]
    category_order = {node.id: (node.order or 0) for node in _tasks.values() if node.type == TaskNodeType.category}

    def sort_key(node: TaskIA) -> tuple[int, int]:
        category = _category_of(node)
        return (category_order.get(category.id, 0) if category else 0, node.order or 0)

    task_nodes.sort(key=sort_key)
    items = [
        WBSItem(
            id=node.id,
            group=_group_title_of(node),
            title=node.title,
            status=node.status or CommonStatus.planned,
            owner=node.owner,
            startDate=node.startDate,
            endDate=node.endDate,
            progress=node.progress,
            order=node.order or 0,
        )
        for node in task_nodes
    ]

    if items:
        overall_progress = round(sum(_wbs_progress_of(i) for i in items) / len(items))
        starts = [i.startDate for i in items if i.startDate]
        ends = [i.endDate for i in items if i.endDate]
        time_axis = {"startDate": min(starts) if starts else None, "endDate": max(ends) if ends else None}
    else:
        overall_progress = 0
        time_axis = {"startDate": None, "endDate": None}

    source_milestones = _generated_schedules[0].milestones if _generated_schedules else []
    milestones = [
        {"id": m.id, "type": "A" if idx == 0 else "B", "label": m.title, "date": m.date}
        for idx, m in enumerate(source_milestones)
    ]

    return {
        "items": items,
        "milestones": milestones,
        "overallProgress": overall_progress,
        "timeAxis": time_axis,
    }


# ---------------------------------------------------------------------------
# WorkItem (work.md)
# ---------------------------------------------------------------------------


def _validate_work_dates(start: str | None, end: str | None) -> None:
    if start and end and end < start:
        raise AppError(400, "validation_error", "종료일은 시작일보다 빠를 수 없습니다.")


def list_work(status: WorkStatus | None = None, q: str | None = None) -> list[WorkItem]:
    values = list(reversed(list(_work_items.values())))
    if status is not None:
        values = [w for w in values if w.status == status]
    if q:
        needle = q.lower()
        values = [w for w in values if needle in w.title.lower()]
    return values


def create_work(payload: WorkItemCreateRequest) -> WorkItem:
    _require_title(payload.title)
    _validate_work_dates(payload.startDate, payload.endDate)
    item = WorkItem(
        id=_work_seq.next(),
        title=payload.title,
        owner=payload.owner,
        status=payload.status or WorkStatus.planned,
        startDate=payload.startDate,
        endDate=payload.endDate,
        description=payload.description,
        linkedIssue=payload.linkedIssue,
        linkedAgent=payload.linkedAgent,
    )
    _work_items[item.id] = item
    return item


def get_work(work_id: str) -> WorkItem:
    item = _work_items.get(work_id)
    if item is None:
        raise AppError(404, "not_found", "해당 작업을 찾을 수 없습니다.")
    return item


def update_work(work_id: str, payload: WorkItemUpdateRequest) -> WorkItem:
    item = get_work(work_id)
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates:
        _require_title(updates["title"])
    merged = item.model_dump()
    merged.update(updates)
    _validate_work_dates(merged.get("startDate"), merged.get("endDate"))
    updated = WorkItem(**merged)
    _work_items[work_id] = updated
    return updated


def delete_work(work_id: str) -> None:
    if work_id not in _work_items:
        raise AppError(404, "not_found", "해당 작업을 찾을 수 없습니다.")
    del _work_items[work_id]


def _seed_work_items() -> None:
    entries = [
        (
            "비교 로직 구현",
            "김도현",
            WorkStatus.in_progress,
            "2026-03-02",
            "2026-03-20",
            "표준 목록과 입력 문서 비교 로직 구현",
            "1",
            None,
        ),
        (
            "표준 목록 매칭 API 수정",
            "이서연",
            WorkStatus.planned,
            None,
            None,
            "매칭 API의 중복 매칭 버그 수정",
            "1",
            None,
        ),
        (
            "생성 일정 캐싱 적용",
            "박지민",
            WorkStatus.review,
            "2026-03-10",
            "2026-03-22",
            "생성 일정 API 응답 지연 개선을 위한 캐싱 적용",
            "3",
            None,
        ),
        (
            "표준 목록 정합 에이전트 프로토타입",
            "김도현",
            WorkStatus.planned,
            "2026-04-01",
            "2026-04-15",
            "표준 목록 정합 에이전트 기획을 프로토타입으로 구현",
            None,
            "agent_01",
        ),
        ("CLI 문서 갱신", "이서연", WorkStatus.done, "2026-06-25", "2026-06-26", "CLI 명령어 문서 최신화", "5", None),
    ]
    for title, owner, work_status, start, end, desc, linked_issue, linked_agent in entries:
        work_id = _work_seq.next()
        _work_items[work_id] = WorkItem(
            id=work_id,
            title=title,
            owner=owner,
            status=work_status,
            startDate=start,
            endDate=end,
            description=desc,
            linkedIssue=linked_issue,
            linkedAgent=linked_agent,
        )


# ---------------------------------------------------------------------------
# Agent (agent.md)
# ---------------------------------------------------------------------------


def list_agents(status: AgentStatus | None = None, q: str | None = None) -> list[Agent]:
    values = list(_agents.values())
    if status is not None:
        values = [a for a in values if a.status == status]
    if q:
        needle = q.lower()
        values = [a for a in values if needle in a.name.lower()]
    return sorted(values, key=lambda a: a.createdAt or "", reverse=True)


def create_agent(payload: AgentCreateRequest) -> Agent:
    _require_title(payload.name)
    agent_id = _agent_seq.next()
    now = _now()
    agent = Agent(
        id=agent_id,
        name=payload.name,
        status=payload.status or AgentStatus.draft,
        description=payload.description,
        planNote=payload.planNote,
        references=payload.references or [],
        createdAt=now,
        updatedAt=now,
    )
    _agents[agent_id] = agent
    return agent


def get_agent(agent_id: str) -> Agent:
    agent = _agents.get(agent_id)
    if agent is None:
        raise AppError(404, "not_found", "해당 에이전트를 찾을 수 없습니다.")
    return agent


def update_agent(agent_id: str, payload: AgentUpdateRequest) -> Agent:
    agent = get_agent(agent_id)
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        _require_title(updates["name"])
    merged = agent.model_dump()
    merged.update(updates)
    merged["updatedAt"] = _now()
    updated = Agent(**merged)
    _agents[agent_id] = updated
    return updated


def delete_agent(agent_id: str) -> None:
    if agent_id not in _agents:
        raise AppError(404, "not_found", "해당 에이전트를 찾을 수 없습니다.")
    del _agents[agent_id]


def _seed_agents() -> None:
    entries = [
        (
            "표준 목록 정합 에이전트",
            AgentStatus.draft,
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
            AgentStatus.confirmed,
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
            AgentStatus.on_hold,
            "신규 이슈의 우선순위·라벨을 자동 추천",
            "목적: 신규 GitHub 이슈에 우선순위·라벨을 추천해 트리아지 속도를 높인다.\n"
            "현재 보류: 라벨 체계 확정 대기 중.",
            [],
            "2026-06-13T00:00:00Z",
            "2026-06-21T00:00:00Z",
        ),
    ]
    for name, agent_status, description, plan_note, refs, created_at, updated_at in entries:
        agent_id = _agent_seq.next()
        _agents[agent_id] = Agent(
            id=agent_id,
            name=name,
            status=agent_status,
            description=description,
            planNote=plan_note,
            references=refs,
            createdAt=created_at,
            updatedAt=updated_at,
        )


# ---------------------------------------------------------------------------
# Issue overlay (issues.md §6, data-model.md §3.6)
# ---------------------------------------------------------------------------


def get_overlay(number: int) -> dict:
    return _issue_overlays.get(number, {"priority": Priority.normal, "linkedWorkItems": []})


def set_overlay(number: int, priority: Priority | None, linked: list[str] | None) -> dict:
    current = dict(get_overlay(number))
    if priority is not None:
        current["priority"] = priority
    if linked is not None:
        current["linkedWorkItems"] = linked
    _issue_overlays[number] = current
    return current


def merge_issue(raw: GitHubIssue) -> IssueView:
    overlay = get_overlay(raw.id)
    return IssueView(**raw.model_dump(), **overlay)


def _seed_issue_overlays() -> None:
    _issue_overlays.update(
        {
            1: {"priority": Priority.high, "linkedWorkItems": ["work_01", "work_02"]},
            2: {"priority": Priority.urgent, "linkedWorkItems": []},
            3: {"priority": Priority.normal, "linkedWorkItems": ["work_03"]},
            5: {"priority": Priority.low, "linkedWorkItems": ["work_05"]},
        }
    )


def seed_all() -> None:
    """Idempotent-ish seed: only runs once per process since sequences are module-level."""
    if _tasks:
        return
    _seed_tasks()
    _seed_agents()
    _seed_work_items()
    _seed_issue_overlays()


seed_all()
