from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_agent_context_lists_docs_and_state() -> None:
    context = client.get("/api/agent/context").json()
    assert isinstance(context["docs"], list)
    assert any(d["path"].startswith("spec/") for d in context["docs"])
    assert "workByStatus" in context["project"]
    assert isinstance(context["openWork"], list)


def test_read_project_doc_and_traversal_guard() -> None:
    ok = client.get("/api/agent/docs/spec/README.md")
    assert ok.status_code == 200
    assert "DMS Console" in ok.json()["content"]

    # Path traversal is rejected.
    bad = client.get("/api/agent/docs/../../secrets.md")
    assert bad.status_code in (400, 404)

    missing = client.get("/api/agent/docs/spec/does-not-exist.md")
    assert missing.status_code == 404


def test_claim_is_atomic_and_report_writes_back() -> None:
    created = client.post("/api/work", json={"title": "에이전트 클레임 대상", "status": "planned"}).json()
    work_id = created["id"]

    claim = client.post(f"/api/work/{work_id}/claim", json={"executor": "agent-alpha"})
    assert claim.status_code == 200
    body = claim.json()
    assert body["executor"] == "agent-alpha"
    assert body["status"] == "in_progress"  # planned → in_progress on claim
    assert body["claimedAt"] is not None

    # A different agent cannot steal a claimed item.
    conflict = client.post(f"/api/work/{work_id}/claim", json={"executor": "agent-beta"})
    assert conflict.status_code == 409

    # The owner reports progress; the note is appended and status advances.
    report = client.post(
        f"/api/work/{work_id}/report",
        json={"status": "review", "note": "구현 완료, 리뷰 요청", "executor": "agent-alpha"},
    )
    assert report.status_code == 200
    reported = report.json()
    assert reported["status"] == "review"
    assert "리뷰 요청" in reported["description"]


def test_list_open_work_unclaimed_filter() -> None:
    all_open = client.get("/api/agent/work").json()
    unclaimed = client.get("/api/agent/work", params={"unclaimed": "true"}).json()
    assert all(w.get("executor") is None for w in unclaimed)
    assert len(unclaimed) <= len(all_open)


def test_mcp_server_imports() -> None:
    # The MCP server registers its tools on import without side effects.
    import app.mcp_server as mcp_server

    assert mcp_server.mcp is not None
