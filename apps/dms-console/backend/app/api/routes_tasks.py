from fastapi import APIRouter, Query

from app import store
from app.schemas.common import CommonStatus
from app.schemas.models import TaskIA
from app.schemas.requests import TaskCreateRequest, TaskUpdateRequest

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskIA])
def list_tasks(status: CommonStatus | None = Query(default=None)) -> list[TaskIA]:
    return store.list_tasks(status)


@router.post("", response_model=TaskIA, status_code=201)
def create_task(payload: TaskCreateRequest) -> TaskIA:
    return store.create_task(payload)


@router.patch("/{task_id}", response_model=TaskIA)
def update_task(task_id: str, payload: TaskUpdateRequest) -> TaskIA:
    return store.update_task(task_id, payload)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str) -> None:
    store.delete_task(task_id)
