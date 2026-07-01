"""Autonomous orchestrator (docs/ia/runtime.md §8).

The missing layer that makes the system self-run: it continuously pulls
UNCLAIMED planned work, claims each item (so no two runs grab the same one), and
dispatches a worker to do it. The human only plans + writes docs; agents pick up
and execute the rest.

Worker = whatever does the actual development:
- default: the built-in demo worker (proves the cycle without an LLM)
- real: set DMS_WORKER_CMD to a command that runs a coding agent with the DMS MCP
  attached; it receives DMS_WORK_ID / DMS_EXECUTOR / DMS_WORK_JSON in its env and
  reports progress back via the API/MCP.

Run:  python -m app.orchestrator --once          # one pass
      python -m app.orchestrator --poll 5        # keep running, poll every 5s
"""

import argparse
import os
import subprocess
import time

from app import store
from app.core.errors import AppError
from app.db import init_db


def _dispatch(worker_cmd: str | None, work_id: str, executor: str) -> dict:
    if not worker_cmd:
        from app import demo_worker

        return demo_worker.handle(work_id, executor)

    item = store.get_work(work_id)
    env = {
        **os.environ,
        "DMS_WORK_ID": work_id,
        "DMS_EXECUTOR": executor,
        "DMS_WORK_JSON": item.model_dump_json(),
    }
    result = subprocess.run(worker_cmd, shell=True, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        store.report_work(
            work_id,
            status=None,
            note=f"[orchestrator] 워커 실패(exit {result.returncode}): {(result.stderr or '')[:200]}",
            executor=executor,
        )
    return {"work_id": work_id, "returncode": result.returncode}


def run_once(worker_cmd: str | None, executor: str) -> list[dict]:
    """Claim + dispatch every unclaimed, planned work item once."""
    processed: list[dict] = []
    for item in store.list_open_work(unclaimed_only=True):
        if item.status != "planned":
            continue
        try:
            store.claim_work(item.id, executor)  # atomic — skip if another run grabbed it
        except AppError:
            continue
        processed.append(_dispatch(worker_cmd, item.id, executor))
    return processed


def run(
    worker_cmd: str | None = None,
    executor: str = "orchestrator",
    once: bool = False,
    poll_interval: float = 5.0,
    max_iters: int | None = None,
) -> int:
    init_db()
    total = 0
    iters = 0
    while True:
        processed = run_once(worker_cmd, executor)
        total += len(processed)
        iters += 1
        for entry in processed:
            print(f"dispatched {entry}")
        if once or (max_iters is not None and iters >= max_iters):
            break
        if not processed:
            time.sleep(poll_interval)
    return total


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app.orchestrator", description="DMS autonomous work orchestrator")
    parser.add_argument("--once", action="store_true", help="Run a single pass and exit")
    parser.add_argument("--executor", default="orchestrator", help="Executor id claimed work is attributed to")
    parser.add_argument(
        "--worker-cmd", default=os.environ.get("DMS_WORKER_CMD"), help="Shell command that does a work item"
    )
    parser.add_argument("--poll", type=float, default=5.0, help="Seconds between passes when idle")
    parser.add_argument("--max-iters", type=int, default=None, help="Stop after N passes (for testing)")
    args = parser.parse_args(argv)

    total = run(
        worker_cmd=args.worker_cmd,
        executor=args.executor,
        once=args.once,
        poll_interval=args.poll,
        max_iters=args.max_iters,
    )
    print(f"총 {total}건 처리")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
