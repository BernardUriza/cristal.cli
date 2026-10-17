from fastapi import FastAPI
from fastapi.testclient import TestClient

import echo


def make_client(tmp_path, monkeypatch):
    monkeypatch.setenv("CRISTAL_ECHO_PATH", str(tmp_path / "echo.jsonl"))
    app = FastAPI()
    app.include_router(echo.router)
    return TestClient(app)


def test_empty_pool_answers_null(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    assert client.get("/echo").json() == {"text": None, "pool": 0}


def test_leaves_anonymous_fragments_and_hands_back_someone_elses(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    assert client.post("/echo", json={"text": "  me pesa   el pecho "}).status_code == 204
    assert client.post("/echo", json={"text": "tengo frío en las manos"}).status_code == 204
    lines = (tmp_path / "echo.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    assert "session" not in lines[0] and "ip" not in lines[0]
    assert '"text": "me pesa el pecho"' in lines[0]
    res = client.get("/echo", params={"exclude": "me pesa el pecho"}).json()
    assert res == {"text": "tengo frío en las manos", "pool": 1}


def test_rejects_too_short_or_too_long(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    assert client.post("/echo", json={"text": "ab"}).status_code == 422
    assert client.post("/echo", json={"text": "x" * 65}).status_code == 422
    assert client.get("/echo").json()["pool"] == 0
