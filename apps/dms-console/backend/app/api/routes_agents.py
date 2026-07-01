from fastapi import APIRouter, Query

from app import store
from app.core.pagination import paginate
from app.schemas.common import AgentStatus
from app.schemas.models import Agent
from app.schemas.requests import AgentCreateRequest, AgentUpdateRequest

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def list_agents(
    status: AgentStatus | None = Query(default=None),
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=25, ge=1, le=25),
) -> dict:
    items = store.list_agents(status=status, q=q)
    return paginate(items, page, size)


@router.post("", response_model=Agent, status_code=201)
def create_agent(payload: AgentCreateRequest) -> Agent:
    return store.create_agent(payload)


@router.get("/{agent_id}", response_model=Agent)
def get_agent(agent_id: str) -> Agent:
    return store.get_agent(agent_id)


@router.patch("/{agent_id}", response_model=Agent)
def update_agent(agent_id: str, payload: AgentUpdateRequest) -> Agent:
    return store.update_agent(agent_id, payload)


@router.delete("/{agent_id}", status_code=204)
def delete_agent(agent_id: str) -> None:
    store.delete_agent(agent_id)
