from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_work_returns_page_envelope() -> None:
    response = client.get("/api/work")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"items", "total", "page", "size"}
    assert body["size"] <= 25


def test_create_get_update_delete_work_item() -> None:
    create_response = client.post(
        "/api/work",
        json={"title": "테스트 작업", "owner": "테스터", "linkedIssue": "1"},
    )
    assert create_response.status_code == 201
    work = create_response.json()
    assert work["status"] == "planned"  # default
    work_id = work["id"]

    get_response = client.get(f"/api/work/{work_id}")
    assert get_response.status_code == 200

    patch_response = client.patch(f"/api/work/{work_id}", json={"status": "review"})
    assert patch_response.status_code == 200
    assert patch_response.json()["status"] == "review"

    delete_response = client.delete(f"/api/work/{work_id}")
    assert delete_response.status_code == 204

    missing = client.get(f"/api/work/{work_id}")
    assert missing.status_code == 404


def test_end_before_start_is_rejected() -> None:
    response = client.post(
        "/api/work",
        json={"title": "잘못된 일정 작업", "startDate": "2026-05-10", "endDate": "2026-05-01"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"


def test_missing_title_is_rejected() -> None:
    response = client.post("/api/work", json={"title": "   "})
    assert response.status_code == 400


def test_status_filter() -> None:
    response = client.get("/api/work", params={"status": "done"})
    assert response.status_code == 200
    assert all(item["status"] == "done" for item in response.json()["items"])
