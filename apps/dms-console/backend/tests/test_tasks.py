from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_tasks_returns_tree_with_aggregated_category_status() -> None:
    response = client.get("/api/tasks")
    assert response.status_code == 200
    nodes = response.json()
    categories = [n for n in nodes if n["type"] == "category"]
    assert len(categories) == 4
    for category in categories:
        assert category["status"] in {"planned", "in_progress", "done"}
        assert category["progress"] is not None


def test_status_filter_keeps_tree_skeleton() -> None:
    response = client.get("/api/tasks", params={"status": "done"})
    assert response.status_code == 200
    nodes = response.json()
    categories = [n for n in nodes if n["type"] == "category"]
    tasks = [n for n in nodes if n["type"] == "task"]
    assert len(categories) == 4  # skeleton always present
    assert all(t["status"] == "done" for t in tasks)


def test_create_task_derives_wbs_item() -> None:
    categories = [n for n in client.get("/api/tasks").json() if n["type"] == "category"]
    parent_id = categories[0]["id"]

    create_response = client.post(
        "/api/tasks",
        json={
            "type": "task",
            "title": "신규 세부 업무",
            "parentId": parent_id,
            "status": "planned",
            "owner": "테스트 담당자",
            "startDate": "2026-05-01",
            "endDate": "2026-05-10",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["linkedWbsId"] == created["id"]

    wbs_ids = {item["id"] for item in client.get("/api/wbs").json()["items"]}
    assert created["id"] in wbs_ids


def test_depth_limit_rejects_fourth_level() -> None:
    categories = [n for n in client.get("/api/tasks").json() if n["type"] == "category"]
    category_id = categories[0]["id"]

    group = client.post("/api/tasks", json={"type": "group", "title": "임시 중분류", "parentId": category_id})
    assert group.status_code == 201
    group_id = group.json()["id"]

    task = client.post("/api/tasks", json={"type": "task", "title": "임시 세부 업무", "parentId": group_id})
    assert task.status_code == 201
    task_id = task.json()["id"]

    too_deep = client.post("/api/tasks", json={"type": "task", "title": "4단계 업무", "parentId": task_id})
    assert too_deep.status_code == 400
    assert too_deep.json()["error"]["code"] == "validation_error"


def test_update_and_cascade_delete() -> None:
    category = client.post("/api/tasks", json={"type": "category", "title": "삭제될 구분"})
    assert category.status_code == 201
    category_id = category.json()["id"]

    child = client.post("/api/tasks", json={"type": "task", "title": "삭제될 업무", "parentId": category_id})
    assert child.status_code == 201
    child_id = child.json()["id"]

    patched = client.patch(f"/api/tasks/{child_id}", json={"status": "in_progress"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "in_progress"

    delete_response = client.delete(f"/api/tasks/{category_id}")
    assert delete_response.status_code == 204

    remaining_ids = {n["id"] for n in client.get("/api/tasks").json()}
    assert category_id not in remaining_ids
    assert child_id not in remaining_ids


def test_missing_task_is_not_found() -> None:
    response = client.patch("/api/tasks/does-not-exist", json={"status": "done"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
