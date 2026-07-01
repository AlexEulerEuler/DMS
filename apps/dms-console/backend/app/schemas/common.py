"""Canonical enums and shared aliases (source of truth: docs/spec/README.md §3)."""

from enum import StrEnum

# ISO 8601 datetime string, e.g. "2026-07-01T09:00:00Z"
DateTimeString = str

# Calendar date string, e.g. "2026-07-01"
DateString = str


class CommonStatus(StrEnum):
    planned = "planned"
    in_progress = "in_progress"
    done = "done"


class WorkStatus(StrEnum):
    planned = "planned"
    in_progress = "in_progress"
    review = "review"
    done = "done"


class AgentStatus(StrEnum):
    draft = "draft"
    confirmed = "confirmed"
    on_hold = "on_hold"


class IssueState(StrEnum):
    open = "open"
    closed = "closed"


class Priority(StrEnum):
    urgent = "urgent"
    high = "high"
    normal = "normal"
    low = "low"


class TaskNodeType(StrEnum):
    category = "category"
    group = "group"
    task = "task"


class ExportFormat(StrEnum):
    json = "json"
    xlsx = "xlsx"
    doc = "doc"


class ParsedStatus(StrEnum):
    pending = "pending"
    processing = "processing"
    done = "done"
    error = "error"


class MasterListStatus(StrEnum):
    draft = "draft"
    confirmed = "confirmed"


# README §5: list page size is fixed at 25.
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 25
