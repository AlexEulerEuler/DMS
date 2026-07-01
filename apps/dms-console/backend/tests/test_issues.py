from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_open_issues_sorted_by_priority_then_date() -> None:
    response = client.get("/api/issues")
    assert response.status_code == 200
    body = response.json()
    assert all(item["state"] == "open" for item in body["items"])

    priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
    priorities = [priority_order[item["priority"]] for item in body["items"]]
    assert priorities == sorted(priorities)


def test_closed_issue_hidden_by_default_and_visible_via_archive_filter() -> None:
    open_only = client.get("/api/issues").json()
    assert all(item["state"] == "open" for item in open_only["items"])

    closed = client.get("/api/issues", params={"state": "closed"}).json()
    assert len(closed["items"]) >= 1
    assert all(item["state"] == "closed" for item in closed["items"])


def test_unpriotized_issue_defaults_to_normal() -> None:
    detail = client.get("/api/issues/4").json()  # closed sample issue with no seeded overlay
    assert detail["priority"] == "normal"


def test_missing_issue_is_not_found() -> None:
    response = client.get("/api/issues/999999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_create_issue_write_through_and_overlay() -> None:
    response = client.post(
        "/api/issues",
        json={"title": "신규 이슈", "body": "본문 내용", "priority": "urgent"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["state"] == "open"
    assert body["priority"] == "urgent"
    assert body["htmlUrl"]

    number = body["id"]
    fetched = client.get(f"/api/issues/{number}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "신규 이슈"


def test_overlay_update_only_touches_local_fields() -> None:
    response = client.patch(
        "/api/issues/2/overlay",
        json={"priority": "low", "linkedWorkItems": ["work_01"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["priority"] == "low"
    assert body["linkedWorkItems"] == ["work_01"]
    # GitHub-owned fields are untouched
    assert body["title"] == "입력 문서 파싱 실패"


def test_overlay_rejects_unknown_fields() -> None:
    response = client.patch("/api/issues/2/overlay", json={"title": "해킹 시도"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "validation_error"
