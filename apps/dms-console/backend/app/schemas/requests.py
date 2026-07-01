"""Request bodies for write endpoints (api-contract.md §5, §7, §8, §9)."""

from pydantic import BaseModel, ConfigDict

from app.schemas.common import (
    AgentStatus,
    CommonStatus,
    DateString,
    Priority,
    TaskNodeType,
    WorkStatus,
)


class TaskCreateRequest(BaseModel):
    type: TaskNodeType
    title: str
    parentId: str | None = None
    status: CommonStatus | None = None
    owner: str | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    progress: int | None = None
    order: int | None = None


class TaskUpdateRequest(BaseModel):
    type: TaskNodeType | None = None
    title: str | None = None
    parentId: str | None = None
    status: CommonStatus | None = None
    owner: str | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    progress: int | None = None
    order: int | None = None


class WorkItemCreateRequest(BaseModel):
    title: str
    owner: str | None = None
    status: WorkStatus | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    description: str | None = None
    linkedIssue: str | None = None
    linkedAgent: str | None = None
    # Decomposition: when an agent splits a goal, the child references its parent.
    parentId: str | None = None


class WorkItemUpdateRequest(BaseModel):
    title: str | None = None
    owner: str | None = None
    status: WorkStatus | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    description: str | None = None
    linkedIssue: str | None = None
    linkedAgent: str | None = None


class AgentCreateRequest(BaseModel):
    name: str
    status: AgentStatus | None = None
    description: str | None = None
    planNote: str | None = None
    references: list[str] | None = None


class AgentUpdateRequest(BaseModel):
    name: str | None = None
    status: AgentStatus | None = None
    description: str | None = None
    planNote: str | None = None
    references: list[str] | None = None


class IssueCreateRequest(BaseModel):
    title: str
    body: str | None = None
    priority: Priority | None = None


class IssueOverlayUpdateRequest(BaseModel):
    """Only priority/linkedWorkItems are writable — extra fields are rejected (400)."""

    model_config = ConfigDict(extra="forbid")

    priority: Priority | None = None
    linkedWorkItems: list[str] | None = None
