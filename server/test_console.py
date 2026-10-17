import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

import console


def make_client(chunks, final=None, fail=False):
    seen: dict[str, str] = {}

    async def stream(session_id: str, prompt: str):
        seen["session"] = session_id
        seen["prompt"] = prompt
        if fail:
            raise RuntimeError("door closed")
        for c in chunks:
            yield {"type": "text", "text": c}
        yield {"type": "result", "text": final if final is not None else "".join(chunks), "model": "test"}

    console.use_stream(stream)
    app = FastAPI()
    app.include_router(console.router)
    return TestClient(app), seen


def events(res):
    return [json.loads(line) for line in res.text.splitlines() if line.strip()]


REQ = {
    "session_id": "abc-123",
    "input": "me pesa el pecho",
    "stance": "confession",
    "pressure": 0.2,
    "local_line": "Lo guardé. Ahora vive en mí, contigo.",
    "confession": "me pesa el pecho",
    "objective": "escribe lo que sientes",
    "recent": [{"role": "player", "text": "hola"}, {"role": "cristal", "text": "Te oigo."}],
}


def test_streams_deltas_then_a_clean_result_and_keeps_the_session():
    client, seen = make_client(["«Pesa ", "en el pecho. ", "¿Caliente o frío?»"])
    res = client.post("/console/turn", json=REQ)
    assert res.status_code == 200
    ev = events(res)
    assert ev[0] == {"type": "start"}
    assert [e["text"] for e in ev if e["type"] == "text"] == ["«Pesa ", "en el pecho. ", "¿Caliente o frío?»"]
    assert ev[-1]["type"] == "result" and ev[-1]["line"] == "Pesa en el pecho. ¿Caliente o frío?"
    assert seen["session"] == "abc-123"
    assert "la consola ya contestó: «Lo guardé" in seen["prompt"]
    assert "jugador: hola" in seen["prompt"] and "cristal: Te oigo." in seen["prompt"]
    assert "postura detectada: confession" in seen["prompt"]


def test_a_line_that_breaks_character_is_dropped_not_shown():
    client, _ = make_client(["No te entendí, sé más específico."])
    ev = events(client.post("/console/turn", json=REQ))
    assert ev[-1]["type"] == "error"
    client, _ = make_client(["Soy un modelo de lenguaje."])
    assert events(client.post("/console/turn", json=REQ))[-1]["type"] == "error"


def test_backend_failure_is_an_error_event_not_a_500():
    client, _ = make_client([], fail=True)
    res = client.post("/console/turn", json=REQ)
    assert res.status_code == 200
    assert events(res)[-1]["type"] == "error"


def test_rejects_bad_sessions_and_long_inputs():
    client, _ = make_client(["ok"])
    assert client.post("/console/turn", json={**REQ, "session_id": "bad session!"}).status_code == 422
    assert client.post("/console/turn", json={**REQ, "input": "x" * 301}).status_code == 422
    assert client.post("/console/turn", json={**REQ, "recent": [{"role": "player", "text": "a"}] * 9}).status_code == 422


def test_unconfigured_voice_is_503():
    console.use_stream(None)
    app = FastAPI()
    app.include_router(console.router)
    assert TestClient(app).post("/console/turn", json=REQ).status_code == 503
