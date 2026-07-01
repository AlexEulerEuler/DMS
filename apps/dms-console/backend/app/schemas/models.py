"""Entity models (data-schema.md)."""

from pydantic import BaseModel, Field

from app.schemas.common import (
    AgentStatus,
    CommonStatus,
    DateString,
    DateTimeString,
    ExportFormat,
    IssueState,
    MasterListStatus,
    ParsedStatus,
    Priority,
    TaskNodeType,
    WorkStatus,
)

# ---------------------------------------------------------------------------
# Project / Overview (data-schema.md §4, §6)
# ---------------------------------------------------------------------------


class ProjectMeta(BaseModel):
    version: str | None = None
    language: str | None = None
    branch: str | None = None
    package: str | None = None
    apiEndpoint: str | None = None


class PipelineInput(BaseModel):
    key: str
    title: str
    description: str | None = None


class PipelineOutput(BaseModel):
    title: str
    description: str | None = None


class WorkflowStep(BaseModel):
    order: int
    label: str


class PipelineSummary(BaseModel):
    inputs: list[PipelineInput] = Field(default_factory=list)
    outputs: list[PipelineOutput] = Field(default_factory=list)
    workflowSteps: list[WorkflowStep] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pipeline inputs (data-schema.md §5)
# ---------------------------------------------------------------------------


class SourceDocument(BaseModel):
    id: str
    projectId: str
    fileName: str
    fileType: str | None = None
    uploadedAt: DateTimeString | None = None
    parsedStatus: ParsedStatus | None = None


class ExistingMasterList(BaseModel):
    id: str
    projectId: str
    fileName: str | None = None
    version: str | None = None
    itemCount: int | None = None


class BaselineSchedule(BaseModel):
    id: str
    projectId: str
    fileName: str | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None


# ---------------------------------------------------------------------------
# Pipeline outputs (data-schema.md §6)
# ---------------------------------------------------------------------------


class MasterListItem(BaseModel):
    id: str
    title: str | None = None


class MasterList(BaseModel):
    id: str
    projectId: str
    items: list[MasterListItem] = Field(default_factory=list)
    version: str | None = None
    generatedAt: DateTimeString | None = None
    status: MasterListStatus | None = None
    downloadUrl: str | None = None


class Milestone(BaseModel):
    id: str
    title: str | None = None
    date: DateString | None = None


class GeneratedSchedule(BaseModel):
    id: str
    projectId: str
    milestones: list[Milestone] = Field(default_factory=list)
    basedOn: str | None = None
    generatedAt: DateTimeString | None = None
    downloadUrl: str | None = None


class ExportFile(BaseModel):
    id: str
    projectId: str
    format: ExportFormat
    sourceOutput: str | None = None
    createdAt: DateTimeString | None = None
    downloadUrl: str | None = None


# ---------------------------------------------------------------------------
# TaskIA (data-schema.md §7)
# ---------------------------------------------------------------------------


class TaskIA(BaseModel):
    id: str
    projectId: str
    type: TaskNodeType
    title: str
    parentId: str | None = None
    status: CommonStatus | None = None
    owner: str | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    progress: int | None = None
    order: int | None = None
    linkedWbsId: str | None = None
    createdAt: DateTimeString | None = None
    updatedAt: DateTimeString | None = None


# ---------------------------------------------------------------------------
# WBSItem — derived view (data-schema.md §8)
# ---------------------------------------------------------------------------


class WBSItem(BaseModel):
    id: str
    group: str
    title: str
    status: CommonStatus
    owner: str | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    progress: int | None = None
    order: int | None = None


# ---------------------------------------------------------------------------
# Issue — GitHub mirror + local overlay (data-schema.md §9)
# ---------------------------------------------------------------------------


class GitHubIssue(BaseModel):
    # NOTE: api-contract.md's wire examples use `id` (the GitHub issue number) as the
    # field name, while data-schema.md names it `number`. We follow the wire contract
    # (api-contract.md) here since that is what the frontend actually consumes.
    id: int
    title: str
    body: str = ""
    state: IssueState
    labels: list[str] = Field(default_factory=list)
    assignee: str | None = None
    createdAt: DateTimeString
    htmlUrl: str


class IssueView(GitHubIssue):
    priority: Priority = Priority.normal
    linkedWorkItems: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# WorkItem (data-schema.md §10)
# ---------------------------------------------------------------------------


class WorkItem(BaseModel):
    id: str
    title: str
    owner: str | None = None
    status: WorkStatus | None = None
    startDate: DateString | None = None
    endDate: DateString | None = None
    description: str | None = None
    linkedIssue: str | None = None
    linkedAgent: str | None = None


# ---------------------------------------------------------------------------
# Agent (data-schema.md §11)
# ---------------------------------------------------------------------------


class Agent(BaseModel):
    id: str
    name: str
    status: AgentStatus | None = None
    description: str | None = None
    planNote: str | None = None
    references: list[str] = Field(default_factory=list)
    createdAt: DateTimeString | None = None
    updatedAt: DateTimeString | None = None
