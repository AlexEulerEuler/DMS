from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_meta_and_pipeline() -> None:
    response = client.get("/api/overview/meta")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["package"] == "dms-console"
    assert len(body["pipeline"]["inputs"]) == 3
    assert len(body["pipeline"]["outputs"]) == 3
    assert body["pipeline"]["workflowSteps"][0]["order"] == 1


def test_get_known_doc() -> None:
    response = client.get("/api/overview/docs/glossary")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "glossary"
    assert "표준 목록" in body["content"]


def test_unknown_doc_is_not_found() -> None:
    response = client.get("/api/overview/docs/unknown")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_outputs_and_download() -> None:
    response = client.get("/api/overview/outputs")
    assert response.status_code == 200
    body = response.json()
    assert len(body["masterLists"]) >= 1
    assert len(body["generatedSchedules"]) >= 1
    assert len(body["exportFiles"]) >= 1

    download_url = body["masterLists"][0]["downloadUrl"]
    download = client.get(download_url)
    assert download.status_code == 200
    assert "attachment" in download.headers["content-disposition"]


def test_download_missing_file_is_not_found() -> None:
    response = client.get("/api/overview/outputs/master-list/does-not-exist/download")
    assert response.status_code == 404
