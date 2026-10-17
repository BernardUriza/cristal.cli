"""ATELIER director — the LLM reads the narration and DECIDES the recipe; the browser draws it.

POST /atelier/direct {narration, seed} → {title, choices: [{field, value, because, source: "pedro"}]}

The model never produces pixels: it picks parameters of the procedural grammar
(web/src/graphics) and says why, so the browser can show every decision and the
player can override it. Invalid fields or values are dropped here, never guessed; a `program` with one bad
RuleCall is dropped whole, and the browser expands it with the grammar before using it.
The persona lives in prompts/atelier.md and speaks in its own AIRE casita.
"""

from __future__ import annotations

import json
from typing import Any, Awaitable, Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/atelier")

_PALETTES = ("friedeberg", "noche")
_SYMMETRIES = ("bilateral", "asymmetric")
_PROJECTIONS = ("perspective", "elevation")
_COLUMNS = (5, 7, 9)
_COMPOSITIONS = ("programa", "templo", "patio")
_MOTIFS = ("ojo", "mano", "craneo", "perro", "jaguar", "escalera", "mascara", "sirena")
_ORNAMENT = ("greca", "chevrón", "ajedrez", "estrías", "roseta", "sierpinski")
_ANOMALIES = ("none", "escalera-imposible", "edificio-anidado", "torre-flotante", "columna-figura")
_MAX_LIST = 3
_MAX_CHOICES = 12
_PARTS = ("cabeza", "ojos", "cuerpo", "manos", "cola", "pies")
_ARRANGEMENTS = ("fila", "circulo", "espiral", "escalera", "reticula", "procesion", "corona")
_PLACES = ("patio", "azoteas", "torres", "cielo", "escalera")
_ARCH = {"footprint": ("cuadrado", "alargado", "profundo"), "courtyard": ("chico", "medio", "grande"), "heights": ("bajo", "medio", "alto", "vertiginoso")}
_ARCH_DEFAULT = {"footprint": "cuadrado", "courtyard": "medio", "heights": "medio"}
_MAX_BECAUSE = 200
_ARCHETYPES = ("palace", "city", "temple", "labyrinth")
_GRAMMAR_RULES = ("R1", "R2", "R3", "R4", "R5", "R6")
_MAX_RULE_CALLS = 8
_MAX_SHORT = 24
_MAX_PARAMS = 4


class DirectRequest(BaseModel):
    narration: str = Field(min_length=3, max_length=300)
    seed: int = Field(ge=1, le=1_000_000)


class Choice(BaseModel):
    field: str
    value: str | int | float | list[str] | dict[str, Any]
    because: str
    source: str = "pedro"


class Direction(BaseModel):
    title: str
    choices: list[Choice]


RunText = Callable[[str], Awaitable[str]]
_run: RunText | None = None


def use_runner(run: RunText | None) -> None:
    global _run
    _run = run


def _extract_json(text: str) -> dict[str, Any]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"no JSON object in model output: {text[:200]!r}")
    return json.loads(text[start : end + 1])


def _subset(value: Any, allowed: tuple[str, ...]) -> list[str] | None:
    if not isinstance(value, list):
        return None
    kept = [v for v in dict.fromkeys(value) if isinstance(v, str) and v in allowed][:_MAX_LIST]
    return kept if kept or allowed is _MOTIFS else None


def _scene(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    groups = []
    for g in value.get("groups", []) if isinstance(value.get("groups"), list) else []:
        if len(groups) == 3 or not isinstance(g, dict):
            continue
        creature = g.get("creature") if isinstance(g.get("creature"), dict) else {}
        raw_parts = creature.get("parts") if isinstance(creature.get("parts"), dict) else {}
        parts = {k: v for k, v in raw_parts.items() if k in _PARTS and v in _MOTIFS}
        if not parts:
            continue
        try:
            count = max(1, min(24, int(round(float(g.get("count", 1))))))
            scale = max(0.4, min(2.5, float(g.get("scale", 1))))
        except (TypeError, ValueError):
            count, scale = 1, 1.0
        name = str(creature.get("name", "")).strip()[:40] or "figura"
        groups.append({
            "creature": {"name": name, "parts": parts},
            "count": count,
            "arrangement": g.get("arrangement") if g.get("arrangement") in _ARRANGEMENTS else "fila",
            "place": g.get("place") if g.get("place") in _PLACES else "patio",
            "scale": round(scale, 2),
        })
    if not groups:
        return None
    arch_in = value.get("architecture") if isinstance(value.get("architecture"), dict) else {}
    arch = {k: (arch_in.get(k) if arch_in.get(k) in allowed else _ARCH_DEFAULT[k]) for k, allowed in _ARCH.items()}
    return {"groups": groups, "architecture": arch}


def _short(value: Any) -> bool:
    return isinstance(value, str) and 0 < len(value) <= _MAX_SHORT


def _param(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    return isinstance(value, (int, float)) or _short(value)


def _rule_call(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or raw.get("rule") not in _GRAMMAR_RULES or not _short(raw.get("target")):
        return None
    params = raw.get("params", {})
    if not isinstance(params, dict) or len(params) > _MAX_PARAMS:
        return None
    if not all(_short(k) and _param(v) for k, v in params.items()):
        return None
    return {"rule": raw["rule"], "target": raw["target"], "params": dict(params)}


def _program(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict) or value.get("archetype") not in _ARCHETYPES:
        return None
    rules = value.get("rules")
    if not isinstance(rules, list) or not 1 <= len(rules) <= _MAX_RULE_CALLS:
        return None
    calls = [_rule_call(r) for r in rules]
    if any(c is None for c in calls):
        return None
    return {"archetype": value["archetype"], "rules": calls}


def _coerce(field: str, value: Any) -> str | int | float | list[str] | dict[str, Any] | None:
    numeric = isinstance(value, (int, float)) and not isinstance(value, bool)
    if field == "scene":
        return _scene(value)
    if field == "program":
        return _program(value)
    if field == "composition":
        return value if value in _COMPOSITIONS else None
    if field == "anomaly":
        return value if value in _ANOMALIES else None
    if field == "motifs":
        return _subset(value, _MOTIFS)
    if field == "ornament":
        return _subset(value, _ORNAMENT)
    if field == "palette":
        return value if value in _PALETTES else None
    if field == "symmetry":
        return value if value in _SYMMETRIES else None
    if field == "projection":
        return value if value in _PROJECTIONS else None
    if field == "complexity":
        return int(value) if numeric and 1 <= int(value) <= 5 else None
    if field in ("density", "anomalyRate"):
        return round(float(value), 3) if numeric and 0 <= float(value) <= 1 else None
    if field == "columns":
        return int(value) if numeric and int(value) in _COLUMNS else None
    return None


def coerce_direction(data: dict[str, Any]) -> Direction:
    seen: set[str] = set()
    choices: list[Choice] = []
    raw_choices = data.get("choices")
    for raw in raw_choices if isinstance(raw_choices, list) else []:
        if not isinstance(raw, dict):
            continue
        field = str(raw.get("field", ""))
        value = _coerce(field, raw.get("value"))
        if value is None or field in seen:
            continue
        seen.add(field)
        because = str(raw.get("because", "")).strip()[:_MAX_BECAUSE] or "el director lo decidió sin decir por qué"
        choices.append(Choice(field=field, value=value, because=because))
        if len(choices) == _MAX_CHOICES:
            break
    title = " ".join(str(data.get("title", "")).split()[:4]) or "sin título"
    return Direction(title=title, choices=choices)


@router.post("/direct", response_model=Direction)
async def direct(req: DirectRequest) -> Direction:
    if _run is None:
        raise HTTPException(status_code=503, detail="atelier director not configured")
    prompt = f"semilla={req.seed}. El jugador narra: «{req.narration.strip()}». Decide la receta."
    text = await _run(prompt)
    try:
        data = _extract_json(text)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=f"bad model output: {exc}") from exc
    direction = coerce_direction(data)
    if not direction.choices:
        raise HTTPException(status_code=502, detail="the director returned no valid choice")
    return direction
