"""Agent-facing loop (docs/ia/runtime.md §4).

Machine-readable orientation for coding agents: read the project's docs/spec,
see live project state, and pick up unclaimed work. Claim/report live under
/api/work/{id} (routes_work.py) so the write surface stays with the resource.
"""

from fastapi import APIRouter, Query

from app import store
from app.schemas.models import WorkItem

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/context")
def get_context() -> dict:
    return store.get_agent_context()


@router.get("/docs")
def list_docs() -> dict:
    return {"docs": store.list_project_docs()}


@router.get("/docs/{doc_path:path}")
def read_doc(doc_path: str) -> dict:
    return store.read_project_doc(doc_path)


@router.get("/work", response_model=list[WorkItem])
def list_open_work(unclaimed: bool = Query(default=False)) -> list[WorkItem]:
    return store.list_open_work(unclaimed_only=unclaimed)
