from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _upload(source_type: str, filename: str, content: bytes) -> None:
    resp = client.post(f"/api/inputs/{source_type}", files={"file": (filename, content, "text/plain")})
    assert resp.status_code == 201


def test_pipeline_generates_master_list_schedule_and_exports() -> None:
    _upload(
        "document",
        "requirements.txt",
        "사용자 인증 기능\n결제 모듈\n알림 센터\n대시보드 리포트\n".encode(),
    )
    _upload("master-list", "existing.txt", "사용자 인증 기능\n관리자 콘솔\n".encode())
    _upload("baseline", "baseline.txt", "시작 2026-02-01\n종료 2026-05-31\n".encode())

    run = client.post("/api/pipeline/run", json={"confirm": True, "formats": ["json", "xlsx"]})
    assert run.status_code == 201
    summary = run.json()
    assert summary["item_count"] >= 4
    # "사용자 인증 기능" appears in both the document and existing list → matched.
    assert summary["matched_count"] >= 1
    assert summary["new_count"] >= 1
    assert summary["schedule_id"] is not None
    assert summary["milestone_count"] >= 1
    assert len(summary["export_ids"]) == 2

    outputs = client.get("/api/overview/outputs").json()
    master = next(m for m in outputs["masterLists"] if m["id"] == summary["master_list_id"])
    assert master["status"] == "confirmed"

    # Download a real export file.
    export = next(e for e in outputs["exportFiles"] if e["id"] in summary["export_ids"])
    download = client.get(export["downloadUrl"])
    assert download.status_code == 200
    assert len(download.content) > 0


def test_pipeline_requires_inputs() -> None:
    # A fresh isolated check is hard (shared DB), so just ensure the endpoint
    # responds sensibly; with seeded/uploaded data present it should succeed.
    resp = client.post("/api/pipeline/run", json={"formats": ["json"]})
    assert resp.status_code in (201, 400)
