import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

import atelier


def make_client(reply):
    prompts: list[str] = []

    async def run(prompt: str) -> str:
        prompts.append(prompt)
        return reply if isinstance(reply, str) else json.dumps(reply)

    atelier.use_runner(run)
    app = FastAPI()
    app.include_router(atelier.router)
    return TestClient(app), prompts


def test_keeps_valid_choices_and_drops_the_rest():
    client, prompts = make_client(
        {
            "title": "La capilla que se inclina sola",
            "choices": [
                {"field": "palette", "value": "noche", "because": "dijiste noche"},
                {"field": "palette", "value": "friedeberg", "because": "repetido"},
                {"field": "complexity", "value": 9, "because": "fuera de rango"},
                {"field": "density", "value": 0.8, "because": "dijiste lleno"},
                {"field": "columns", "value": 6, "because": "par"},
                {"field": "columns", "value": 7, "because": "siete"},
                {"field": "mood", "value": "x", "because": "campo inventado"},
                {"field": "anomalyRate", "value": "mucho", "because": "no numérico"},
                {"field": "symmetry", "value": True, "because": "booleano"},
            ],
        }
    )
    res = client.post("/atelier/direct", json={"narration": "una capilla de noche llena", "seed": 42})
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "La capilla que se"
    assert [(c["field"], c["value"]) for c in body["choices"]] == [("palette", "noche"), ("density", 0.8), ("columns", 7)]
    assert all(c["source"] == "pedro" for c in body["choices"])
    assert "semilla=42" in prompts[0] and "una capilla de noche llena" in prompts[0]


def test_tolerates_prose_around_the_json():
    client, _ = make_client('Aquí va:\n{"title": "Sol", "choices": [{"field": "projection", "value": "elevation", "because": "de frente"}]}\nfin')
    body = client.post("/atelier/direct", json={"narration": "un templo de frente", "seed": 1}).json()
    assert body["choices"][0]["value"] == "elevation"


def test_bad_output_is_502_and_never_a_guess():
    client, _ = make_client("no soy json")
    assert client.post("/atelier/direct", json={"narration": "lo que sea", "seed": 1}).status_code == 502
    client, _ = make_client({"title": "x", "choices": [{"field": "palette", "value": "rojo", "because": ""}]})
    assert client.post("/atelier/direct", json={"narration": "lo que sea", "seed": 1}).status_code == 502


def test_rejects_narrations_out_of_bounds():
    client, _ = make_client({"title": "x", "choices": []})
    assert client.post("/atelier/direct", json={"narration": "ab", "seed": 1}).status_code == 422
    assert client.post("/atelier/direct", json={"narration": "x" * 301, "seed": 1}).status_code == 422
    assert client.post("/atelier/direct", json={"narration": "algo", "seed": 0}).status_code == 422


def test_unconfigured_director_is_503():
    atelier.use_runner(None)
    app = FastAPI()
    app.include_router(atelier.router)
    assert TestClient(app).post("/atelier/direct", json={"narration": "algo", "seed": 1}).status_code == 503
