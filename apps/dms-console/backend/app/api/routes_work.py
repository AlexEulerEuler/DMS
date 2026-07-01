from fastapi import APIRouter, Query
from pydantic import BaseModel

from app import store
from app.core.pagination import paginate
from app.schemas.common import WorkStatus
from app.schemas.models import WorkItem
from app.schemas.requests import WorkItemCreateRequest, WorkItemUpdateRequest

router = APIRouter(prefix="/work", tags=["work"])


class WorkClaimRequest(BaseModel):
    executor: str


class WorkReportRequest(BaseModel):
    status: WorkStatus | None = None
    note: str | None = None
    executor: str | None = None


@router.get("")
def list_work(
    view: str = Query(default="backlog"),
    status: WorkStatus | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=25, ge=1, le=25),
) -> dict:
    items = store.list_work(status=status, q=q)
    return paginate(items, page, size)


@router.post("", response_model=WorkItem, status_code=201)
def create_work(payload: WorkItemCreateRequest) -> WorkItem:
    return store.create_work(payload)


@router.get("/{work_id}", response_model=WorkItem)
def get_work(work_id: str) -> WorkItem:
    return store.get_work(work_id)


@router.patch("/{work_id}", response_model=WorkItem)
def update_work(work_id: str, payload: WorkItemUpdateRequest) -> WorkItem:
    return store.update_work(work_id, payload)


@router.delete("/{work_id}", status_code=204)
def delete_work(work_id: str) -> None:
    store.delete_work(work_id)


# Agent loop (docs/ia/runtime.md §4): claim a work item / report progress back.


@router.post("/{work_id}/claim", response_model=WorkItem)
def claim_work(work_id: str, payload: WorkClaimRequest) -> WorkItem:
    return store.claim_work(work_id, payload.executor)


@router.post("/{work_id}/report", response_model=WorkItem)
def report_work(work_id: str, payload: WorkReportRequest) -> WorkItem:
    status = payload.status.value if payload.status else None
    return store.report_work(work_id, status, payload.note, payload.executor)
