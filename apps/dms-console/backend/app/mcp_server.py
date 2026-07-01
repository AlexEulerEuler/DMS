"""MCP server for coding agents (docs/ia/runtime.md §4).

Exposes the agent-facing loop as MCP tools over stdio, backed by the same SQLite
DB as the REST API (via DMS_DB_PATH). A coding agent connects, reads the project's
spec/IA docs, picks up unclaimed work, claims it atomically, and reports progress
back — the same operations available at /api/agent and /api/work/{id}/claim|report.

Run:  python -m app.mcp_server   (stdio transport)
"""

from fastapi.encoders import jsonable_encoder
from mcp.server.fastmcp import FastMCP

from app import store
from app.core.errors import AppError
from app.db import init_db
from app.schemas.requests import TaskCreateRequest, WorkItemCreateRequest

mcp = FastMCP("dms-console")


def _safe(fn, *args, **kwargs):
    try:
        return jsonable_encoder(fn(*args, **kwargs))
    except AppError as exc:
        return {"error": {"code": exc.code, "message": exc.message}}


@mcp.tool()
def get_context() -> dict:
    """Orientation for a coding agent: the spec/IA docs it can read plus a live
    snapshot of project state (work counts, open work items)."""
    return _safe(store.get_agent_context)


@mcp.tool()
def list_docs() -> dict:
    """List the project's readable spec/IA documents (path + title)."""
    return {"docs": jsonable_encoder(store.list_project_docs())}


@mcp.tool()
def read_doc(path: str) -> dict:
    """Read one project doc by path, e.g. 'spec/screens.md' or 'ia/runtime.md'."""
    return _safe(store.read_project_doc, path)


@mcp.tool()
def list_open_work(unclaimed_only: bool = False) -> dict:
    """List open work items (planned/in_progress/review). Set unclaimed_only to
    see only work no agent has claimed yet."""
    return {"work": jsonable_encoder(store.list_open_work(unclaimed_only=unclaimed_only))}


@mcp.tool()
def create_work(
    title: str, description: str | None = None, parent_id: str | None = None, linked_issue: str | None = None
) -> dict:
    """Create a new work item. Use this to record work an agent decides needs
    doing. Set parent_id to make it a subtask of a larger work item."""
    return _safe(
        store.create_work,
        WorkItemCreateRequest(title=title, description=description, parentId=parent_id, linkedIssue=linked_issue),
    )


@mcp.tool()
def split_work(parent_id: str, titles: list[str]) -> dict:
    """Decompose a work item into child subtasks — one new work item per title,
    each linked to parent_id. Returns the created children."""

    def _split() -> list:
        return [
            store.create_work(WorkItemCreateRequest(title=title, parentId=parent_id))
            for title in titles
            if title.strip()
        ]

    return {"children": jsonable_encoder(_safe(_split))}


@mcp.tool()
def create_task(
    type: str, title: str, parent_id: str | None = None, status: str | None = None, owner: str | None = None
) -> dict:
    """Create an IA task node (type: category|group|task) to structure planned
    work. task-type nodes derive a WBS row for scheduling/progress."""
    request = TaskCreateRequest(type=type, title=title, parentId=parent_id, status=status, owner=owner)
    return _safe(store.create_task, request)


@mcp.tool()
def claim_work(work_id: str, executor: str) -> dict:
    """Atomically claim an unclaimed work item as `executor` (fails if another
    agent already holds it). Moves planned → in_progress."""
    return _safe(store.claim_work, work_id, executor)


@mcp.tool()
def report_work(
    work_id: str, status: str | None = None, note: str | None = None, executor: str | None = None
) -> dict:
    """Report progress on a claimed work item: optional status transition
    (planned|in_progress|review|done) and a timestamped note appended to the item."""
    return _safe(store.report_work, work_id, status, note, executor)


def main() -> None:
    init_db()
    mcp.run()


if __name__ == "__main__":
    main()
