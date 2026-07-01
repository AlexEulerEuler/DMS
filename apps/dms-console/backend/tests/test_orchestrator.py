from fastapi.testclient import TestClient

from app import store
from app.main import app
from app.orchestrator import run_once
from app.schemas.requests import WorkItemCreateRequest

client = TestClient(app)


def test_decomposition_parent_child() -> None:
    parent = store.create_work(WorkItemCreateRequest(title="결제 모듈 구현"))
    child = store.create_work(WorkItemCreateRequest(title="결제 API 연동", parentId=parent.id))
    assert child.parentId == parent.id

    # Unknown parent is rejected.
    resp = client.post("/api/work", json={"title": "고아 작업", "parentId": "nope_zz"})
    assert resp.status_code == 404


def test_orchestrator_claims_and_dispatches_demo_worker() -> None:
    a = store.create_work(WorkItemCreateRequest(title="자율 작업 A", status="planned"))
    b = store.create_work(WorkItemCreateRequest(title="자율 작업 B", status="planned"))

    processed = run_once(worker_cmd=None, executor="orchestrator")
    handled_ids = {p["work_id"] for p in processed}
    assert a.id in handled_ids and b.id in handled_ids

    # Each item is now claimed (executor set) and moved to review by the demo worker.
    after_a = store.get_work(a.id)
    after_b = store.get_work(b.id)
    assert after_a.executor == "orchestrator" and after_a.status == "review"
    assert after_b.executor == "orchestrator" and after_b.status == "review"
    assert "demo-worker" in (after_a.description or "")

    # A second pass has nothing left to claim (idempotent — no double-processing).
    assert run_once(worker_cmd=None, executor="orchestrator") == []


def test_mcp_split_work_tool() -> None:
    import app.mcp_server as mcp_server

    parent = store.create_work(WorkItemCreateRequest(title="대시보드 개편"))
    result = mcp_server.split_work(parent.id, ["레이아웃 재설계", "차트 컴포넌트", "접근성 점검"])
    children = result["children"]
    assert len(children) == 3
    assert all(c["parentId"] == parent.id for c in children)
