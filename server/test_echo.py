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


def test_hostile_fragments_contact_data_and_self_harm_orders_never_enter_the_pool(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    for bad in [
        "eres un pendejo",
        "MATATE ya",
        "muérete",
        "kill yourself",
        "escríbeme a https://x.y",
        "llámame 5512345678",
        "fucking nothing",
    ]:
        assert client.post("/echo", json={"text": bad}).status_code == 422, bad
    for ok in ["tengo miedo a la muerte", "me siento muerta por dentro"]:
        assert client.post("/echo", json={"text": ok}).status_code == 204, ok
    assert client.get("/echo").json()["pool"] == 2


def test_get_also_skips_lines_that_slipped_in_before_the_filter(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    (tmp_path / "echo.jsonl").write_text(
        '{"at":"x","text":"pendejo tú"}\n{"at":"x","text":"me pesa el pecho"}\n', encoding="utf-8"
    )
    assert client.get("/echo").json() == {"text": "me pesa el pecho", "pool": 1}
