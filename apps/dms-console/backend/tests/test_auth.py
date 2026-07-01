from fastapi.testclient import TestClient

import app.core.config as config
from app.main import create_app


def test_token_gate(monkeypatch) -> None:
    monkeypatch.setattr(config.settings, "api_token", "s3cret")
    client = TestClient(create_app())

    # Health is exempt even with the gate on.
    assert client.get("/api/health").status_code == 200

    # Gated endpoints require the bearer token.
    assert client.get("/api/tasks").status_code == 401
    assert client.get("/api/tasks", headers={"Authorization": "Bearer wrong"}).status_code == 401

    ok = client.get("/api/tasks", headers={"Authorization": "Bearer s3cret"})
    assert ok.status_code == 200


def test_open_when_no_token(monkeypatch) -> None:
    monkeypatch.setattr(config.settings, "api_token", None)
    client = TestClient(create_app())
    # No gate → open access (default single-user local mode).
    assert client.get("/api/tasks").status_code == 200
