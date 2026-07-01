from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_wbs_items_are_derived_and_read_only() -> None:
    response = client.get("/api/wbs")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) >= 13
    assert body["timeAxis"]["startDate"] <= body["timeAxis"]["endDate"]
    assert 0 <= body["overallProgress"] <= 100

    for item in body["items"]:
        assert item["group"]
        assert item["status"] in {"planned", "in_progress", "done"}


def test_wbs_has_no_write_methods() -> None:
    assert client.post("/api/wbs").status_code == 405
    assert client.patch("/api/wbs").status_code == 405
    assert client.delete("/api/wbs").status_code == 405


def test_wbs_milestones_carry_type_label_date() -> None:
    body = client.get("/api/wbs").json()
    assert len(body["milestones"]) >= 1
    milestone = body["milestones"][0]
    assert milestone["type"] in {"A", "B"}
    assert milestone["label"]
    assert milestone["date"]
