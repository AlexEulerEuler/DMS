from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_upload_list_delete_document() -> None:
    upload = client.post(
        "/api/inputs/document",
        files={"file": ("spec.txt", b"line one\nline two\n", "text/plain")},
    )
    assert upload.status_code == 201
    body = upload.json()
    assert body["fileName"] == "spec.txt"
    assert body["fileType"] == "txt"
    assert body["parsedStatus"] == "pending"
    doc_id = body["id"]

    listing = client.get("/api/inputs")
    assert listing.status_code == 200
    assert any(d["id"] == doc_id for d in listing.json()["documents"])

    deleted = client.delete(f"/api/inputs/{doc_id}")
    assert deleted.status_code == 204
    assert all(d["id"] != doc_id for d in client.get("/api/inputs").json()["documents"])


def test_upload_master_list_counts_items() -> None:
    upload = client.post(
        "/api/inputs/master-list",
        files={"file": ("existing.csv", b"item A\nitem B\nitem C\n", "text/csv")},
    )
    assert upload.status_code == 201
    assert upload.json()["itemCount"] == 3


def test_upload_baseline_extracts_date_range() -> None:
    upload = client.post(
        "/api/inputs/baseline",
        files={"file": ("baseline.txt", b"start 2026-02-01\nend 2026-05-31\n", "text/plain")},
    )
    assert upload.status_code == 201
    body = upload.json()
    assert body["startDate"] == "2026-02-01"
    assert body["endDate"] == "2026-05-31"


def test_unknown_source_type_rejected() -> None:
    response = client.post(
        "/api/inputs/bogus",
        files={"file": ("x.txt", b"x", "text/plain")},
    )
    assert response.status_code == 400


def test_delete_missing_input_is_not_found() -> None:
    assert client.delete("/api/inputs/nope_zzz").status_code == 404
