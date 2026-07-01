"""Reference worker (docs/ia/runtime.md §8).

A worker is whatever actually *does* a work item — normally an external coding
agent (e.g. Claude Code with the DMS MCP attached). This built-in demo worker
just reports the item to `review` with a note, so the autonomous cycle
(orchestrator → claim → worker → report) is verifiable without an LLM.

The orchestrator can also invoke a real worker as a subprocess (DMS_WORKER_CMD);
that process receives DMS_WORK_ID / DMS_EXECUTOR / DMS_WORK_JSON in its env and
is expected to do the work and report back via the API or MCP.
"""

import os

from app import store


def handle(work_id: str, executor: str) -> dict:
    item = store.get_work(work_id)
    updated = store.report_work(
        work_id,
        status="review",
        note=f"[demo-worker] '{item.title}' 자동 처리 완료(모의 워커). 실제 코딩 에이전트로 교체하세요.",
        executor=executor,
    )
    return {"work_id": work_id, "status": updated.status}


def main() -> None:
    work_id = os.environ.get("DMS_WORK_ID")
    executor = os.environ.get("DMS_EXECUTOR", "demo-worker")
    if not work_id:
        raise SystemExit("DMS_WORK_ID is required")
    result = handle(work_id, executor)
    print(result)


if __name__ == "__main__":
    main()
