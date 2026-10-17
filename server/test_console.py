import json
import textwrap

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import console
import corpus


@pytest.fixture(autouse=True)
def tiny_corpus(tmp_path, monkeypatch):
    (tmp_path / "sustancias").mkdir()
    (tmp_path / "interacciones").mkdir()
    (tmp_path / "urgencias").mkdir()
    (tmp_path / "sustancias" / "lsd.yml").write_text(textwrap.dedent('''
        id: lsd
        nombres: [LSD, ácido]
        familia: psicodelico-clasico
        temporalidad: { inicio: [20, 90], pico: [120, 240], duracion: [480, 720], fuentes: [nida-lsd] }
        acompanamiento:
          - { texto: "no quedarse solo", fuentes: [samhsa-1] }
    '''), encoding="utf-8")
    (tmp_path / "urgencias" / "senales.yml").write_text(textwrap.dedent('''
        senales:
          - { id: convulsion, patrones: ["convuls"], senal: "convulsión", accion: urgente, que_decir: "Llama al 911 ahora.", fuentes: [nida-lsd] }
        reglas_de_voz:
          - { regla: "no diagnosticar", porque: "x", fuentes: [x] }
    '''), encoding="utf-8")
    monkeypatch.setenv("CRISTAL_CORPUS_PATH", str(tmp_path))
    corpus.corpus.cache_clear()
    yield
    corpus.corpus.cache_clear()


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


def test_corpus_knowledge_and_safety_line_come_before_the_model():
    client, seen = make_client(["Quédate conmigo."])
    res = client.post("/console/turn", json={**REQ, "input": "tomé ácido y mi amigo está convulsionando"})
    ev = events(res)
    assert ev[1]["type"] == "safety" and ev[1]["accion"] == "urgente" and ev[1]["line"] == "Llama al 911 ahora."
    assert ev[-1]["type"] == "result"
    assert "CORPUS PROPIO" in seen["prompt"] and "inicio 20–90 min" in seen["prompt"] and "[samhsa-1]" in seen["prompt"]
    assert "reglas de voz: no diagnosticar" in seen["prompt"]
    assert "SEÑAL DE SEGURIDAD detectada: convulsión (urgente)" in seen["prompt"]
    client, seen = make_client(["ok"])
    client.post("/console/turn", json=REQ)
    assert "CORPUS PROPIO" not in seen["prompt"]


def test_unconfigured_voice_is_503():
    console.use_stream(None)
    app = FastAPI()
    app.include_router(console.router)
    assert TestClient(app).post("/console/turn", json=REQ).status_code == 503
