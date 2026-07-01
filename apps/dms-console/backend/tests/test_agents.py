from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_agents_default_sorted_desc_by_created_at() -> None:
    response = client.get("/api/agents")
    assert response.status_code == 200
    body = response.json()
    created_ats = [a["createdAt"] for a in body["items"]]
    assert created_ats == sorted(created_ats, reverse=True)


def test_create_requires_name() -> None:
    response = client.post("/api/agents", json={"name": ""})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_create_defaults_to_draft_status() -> None:
    response = client.post("/api/agents", json={"name": "새 에이전트", "description": "설명"})
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"

    agent_id = body["id"]
    updated = client.patch(f"/api/agents/{agent_id}", json={"status": "confirmed"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "confirmed"
    assert updated.json()["updatedAt"] >= body["updatedAt"]

    deleted = client.delete(f"/api/agents/{agent_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/agents/{agent_id}").status_code == 404


def test_missing_agent_is_not_found() -> None:
    assert client.get("/api/agents/does-not-exist").status_code == 404
