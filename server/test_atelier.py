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


def test_studio_fields_composition_motifs_ornament_anomaly():
    client, _ = make_client(
        {
            "title": "Patio del ojo",
            "choices": [
                {"field": "composition", "value": "patio", "because": "un lugar que se recorre"},
                {"field": "motifs", "value": ["ojo", "dragón", "mano", "ojo", "jaguar", "sirena"], "because": "lo que nombraste"},
                {"field": "ornament", "value": ["greca", "neón"], "because": "laberinto en los muros"},
                {"field": "anomaly", "value": "escalera-imposible", "because": "dijiste subir"},
                {"field": "anomaly", "value": "torre-flotante", "because": "repetida"},
                {"field": "composition", "value": "catedral", "because": "fuera de la gramática"},
            ],
        }
    )
    body = client.post("/atelier/direct", json={"narration": "un patio con un ojo y una escalera", "seed": 9}).json()
    assert [(c["field"], c["value"]) for c in body["choices"]] == [
        ("composition", "patio"),
        ("motifs", ["ojo", "mano", "jaguar"]),
        ("ornament", ["greca"]),
        ("anomaly", "escalera-imposible"),
    ]


def test_scene_is_clamped_to_the_grammar():
    client, _ = make_client({"title": "x", "choices": [{"field": "scene", "because": "b", "value": {
        "groups": [
            {"creature": {"name": "robot", "parts": {"cabeza": "craneo", "alas": "ojo", "cuerpo": "dragon"}}, "count": 80, "arrangement": "escalera", "place": "luna", "scale": 9},
            {"creature": {"name": "nada", "parts": {"cola": "unicornio"}}, "count": 2},
        ],
        "architecture": {"courtyard": "grande", "heights": "nube"},
    }}]})
    value = client.post("/atelier/direct", json={"narration": "robots", "seed": 2}).json()["choices"][0]["value"]
    assert value["groups"] == [{"creature": {"name": "robot", "parts": {"cabeza": "craneo"}}, "count": 24, "arrangement": "escalera", "place": "patio", "scale": 2.5}]
    assert value["architecture"] == {"footprint": "cuadrado", "courtyard": "grande", "heights": "medio"}


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


def test_program_keeps_known_archetypes_and_rules_only():
    palace = {"archetype": "palace", "rules": [{"rule": "R2", "target": "root", "params": {"chambers": 5}}, {"rule": "R6", "target": "hall-1", "params": {}}]}
    client, _ = make_client({"title": "x", "choices": [
        {"field": "composition", "value": "programa", "because": "un palacio"},
        {"field": "program", "value": palace, "because": "salones y habitaciones"},
    ]})
    body = client.post("/atelier/direct", json={"narration": "un palacio de salones", "seed": 3}).json()
    assert [(c["field"], c["value"]) for c in body["choices"]] == [("composition", "programa"), ("program", palace)]


def test_program_with_one_bad_call_is_dropped_whole():
    bad = [
        {"archetype": "castle", "rules": [{"rule": "R1", "target": "root", "params": {}}]},
        {"archetype": "city", "rules": [{"rule": "R9", "target": "root", "params": {}}]},
        {"archetype": "city", "rules": [{"rule": "R3", "target": "root", "params": {"chambers": True}}]},
        {"archetype": "city", "rules": [{"rule": "R3", "target": "root", "params": {"style": "x" * 40}}]},
        {"archetype": "city", "rules": [{"rule": "R3", "target": "", "params": {}}]},
        {"archetype": "city", "rules": [{"rule": "R4", "target": "gallery-1", "params": {}}] * 9},
        {"archetype": "temple", "rules": []},
        {"archetype": "temple", "rules": "R1"},
    ]
    client, _ = make_client({"title": "x", "choices": [{"field": "program", "value": v, "because": "b"} for v in bad] + [{"field": "palette", "value": "noche", "because": "n"}]})
    body = client.post("/atelier/direct", json={"narration": "una ciudad", "seed": 3}).json()
    assert [c["field"] for c in body["choices"]] == ["palette"]


def test_prompt_teaches_the_program_grammar():
    prompt = open("prompts/atelier.md", encoding="utf-8").read()
    for word in ('"program"', '"programa"', "R1", "R2", "R3", "R4", "R5", "R6", "palace", "city", "temple", "labyrinth"):
        assert word in prompt


def _scene_with(program):
    group = {"creature": {"name": "bestia", "parts": {"cabeza": "craneo"}}, "count": 2, "program": program}
    return {"title": "x", "choices": [{"field": "scene", "because": "b", "value": {"groups": [group]}}]}


def test_creature_program_is_kept_when_every_operation_is_known():
    program = {"family": "quadruped", "seed": 8172, "operations": [
        {"op": "replace", "socket": "head", "motif": "craneo"},
        {"op": "graft", "socket": "tail", "family": "serpentine", "part": "tail"},
        {"op": "repeat", "socket": "arm", "count": 4, "arrangement": "bilateral"},
        {"op": "architecturalize", "socket": "torso", "grammar": "facade"},
    ]}
    client, _ = make_client(_scene_with(program))
    body = client.post("/atelier/direct", json={"narration": "una bestia", "seed": 3}).json()
    assert body["choices"][0]["value"]["groups"][0]["program"] == program


def test_creature_program_with_one_bad_operation_is_dropped_but_the_group_stays():
    bad = [
        {"family": "dragon", "operations": []},
        {"family": "biped", "operations": [{"op": "melt", "socket": "head"}]},
        {"family": "biped", "operations": [{"op": "replace", "socket": "wing", "motif": "ojo"}]},
        {"family": "biped", "operations": [{"op": "replace", "socket": "head", "motif": "dragon"}]},
        {"family": "biped", "operations": [{"op": "repeat", "socket": "arm", "count": 9, "arrangement": "radial"}]},
        {"family": "biped", "operations": [{"op": "repeat", "socket": "arm", "count": True, "arrangement": "radial"}]},
        {"family": "biped", "operations": [{"op": "graft", "socket": "tail", "family": "pez", "part": "tail"}]},
        {"family": "biped", "operations": [{"op": "architecturalize", "socket": "torso", "grammar": "castle"}]},
        {"family": "biped", "operations": [{"op": "replace", "socket": "head", "motif": "ojo"}] * 7},
    ]
    for program in bad:
        client, _ = make_client(_scene_with(program))
        group = client.post("/atelier/direct", json={"narration": "una bestia", "seed": 3}).json()["choices"][0]["value"]["groups"][0]
        assert "program" not in group and group["creature"]["parts"] == {"cabeza": "craneo"}


def test_prompt_teaches_the_creature_program():
    prompt = open("prompts/atelier.md", encoding="utf-8").read()
    for word in ("CreatureProgram", '"replace"', '"graft"', '"repeat"', '"architecturalize"', '"serpentine"', '"facade"', "hasta 6 operaciones"):
        assert word in prompt
