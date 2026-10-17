"""ATELIER director — the LLM reads the narration and DECIDES the recipe; the browser draws it.

POST /atelier/direct {narration, seed} → {title, choices: [{field, value, because, source: "pedro"}]}

The model never produces pixels: it picks parameters of the procedural grammar
(web/src/graphics) and says why, so the browser can show every decision and the
player can override it. Invalid fields or values are dropped here, never guessed.
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
_COMPOSITIONS = ("templo", "patio")
_MOTIFS = ("ojo", "mano", "craneo", "perro", "jaguar", "escalera", "mascara", "sirena")
_ORNAMENT = ("greca", "chevrón", "ajedrez", "estrías", "roseta", "sierpinski")
_ANOMALIES = ("none", "escalera-imposible", "edificio-anidado", "torre-flotante", "columna-figura")
_MAX_LIST = 3
_MAX_CHOICES = 11
_MAX_BECAUSE = 200


class DirectRequest(BaseModel):
    narration: str = Field(min_length=3, max_length=300)
    seed: int = Field(ge=1, le=1_000_000)


class Choice(BaseModel):
    field: str
    value: str | int | float | list[str]
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


def _coerce(field: str, value: Any) -> str | int | float | list[str] | None:
    numeric = isinstance(value, (int, float)) and not isinstance(value, bool)
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
