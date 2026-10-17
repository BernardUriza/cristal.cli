import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

import telemetry


def make_client(tmp_path, monkeypatch, token=""):
    monkeypatch.setenv("CRISTAL_TELEMETRY_PATH", str(tmp_path / "funnel.jsonl"))
    monkeypatch.setenv("CRISTAL_TELEMETRY_TOKEN", token)
    app = FastAPI()
    app.include_router(telemetry.router)
    return TestClient(app)


def test_records_one_line_per_event_without_ip_or_text(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    res = client.post("/telemetry/funnel", json={"session": "abcd1234", "step": "pointer_lock", "t": 12.34})
    assert res.status_code == 204
    lines = (tmp_path / "funnel.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    row = json.loads(lines[0])
    assert row["step"] == "pointer_lock" and row["t"] == 12.3 and row["session"] == "abcd1234"
    assert set(row) == {"at", "session", "step", "t", "build"}


def test_rejects_unknown_steps_and_bad_sessions(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    assert client.post("/telemetry/funnel", json={"session": "abcd1234", "step": "typed_text", "t": 1}).status_code == 422
    assert client.post("/telemetry/funnel", json={"session": "a b", "step": "laberinto", "t": 1}).status_code == 422
    assert client.post("/telemetry/funnel", json={"session": "abcd1234", "step": "laberinto", "t": -1}).status_code == 422


def test_summary_needs_the_token_and_counts_distinct_sessions(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch, token="s3cret")
    for session, steps in {"sess1": ["laberinto", "pointer_lock", "first_step"], "sess2": ["laberinto", "pointer_lock"], "sess3": ["laberinto"]}.items():
        for i, step in enumerate(steps):
            client.post("/telemetry/funnel", json={"session": session, "step": step, "t": 10 * (i + 1)})
    client.post("/telemetry/funnel", json={"session": "sess1", "step": "pointer_lock", "t": 5})

    assert client.get("/telemetry/funnel/summary").status_code == 401
    res = client.get("/telemetry/funnel/summary", headers={"X-Admin-Token": "s3cret"})
    assert res.status_code == 200
    body = res.json()
    assert body["sessions"] == 3
    assert body["reached"]["laberinto"] == 3 and body["reached"]["pointer_lock"] == 2 and body["reached"]["first_step"] == 1
    assert body["median_t"]["pointer_lock"] == 12.5
    assert body["drop_from_previous"]["pointer_lock"] == 0.333
    assert body["reached"]["door_crossed"] == 0


def test_summary_says_so_when_unconfigured(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    res = client.get("/telemetry/funnel/summary", headers={"X-Admin-Token": "x"})
    assert res.status_code == 503
