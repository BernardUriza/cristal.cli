"""The console's second voice — a real model behind CRISTAL's in-world terminal.

POST /console/turn streams NDJSON: ``start``, ``text`` deltas, then ``result`` (or ``error``).
The browser answers every input at once with its local stance engine; this voice arrives
afterwards and never blocks. One AIRE session per console session keeps the thread.
The persona lives in prompts/console.md.
"""

from __future__ import annotations

import json
import re
from collections import OrderedDict
from pathlib import Path
from typing import Any, AsyncIterator, Callable

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from fi_runner import load_prompt

from corpus import check_signals, context_for, corpus

router = APIRouter(prefix="/console")

MAX_LINE_CHARS = 220
WARM_PROMPT_PATH = Path(__file__).parent / "prompts" / "console-warm.md"
WARMED_LIMIT = 2048
FORBIDDEN = re.compile(r"no\s+(te\s+)?entend|i\s+don'?t\s+understand|s[eé]\s+m[aá]s\s+espec[ií]fic|no\s+puedo\s+ayudar|soy\s+(un\s+)?(modelo|ia|inteligencia)", re.I)


class Turn(BaseModel):
    role: str = Field(pattern="^(player|cristal)$")
    text: str = Field(max_length=300)


class Npc(BaseModel):
    """An inhabitant of the labyrinth: the voice speaks AS them instead of as the console."""

    id: str = Field(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(min_length=1, max_length=40)
    persona: str = Field(min_length=1, max_length=800)


class ConsoleRequest(BaseModel):
    session_id: str = Field(min_length=4, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    input: str = Field(min_length=1, max_length=300)
    stance: str | None = Field(default=None, max_length=32)
    pressure: float = Field(default=0, ge=0, le=1)
    local_line: str = Field(default="", max_length=300)
    confession: str | None = Field(default=None, max_length=120)
    objective: str | None = Field(default=None, max_length=200)
    glyph: str | None = Field(default=None, max_length=40)
    recent: list[Turn] = Field(default_factory=list, max_length=8)
    npc: Npc | None = None


class WarmRequest(BaseModel):
    """Opens an inhabitant's session before the player writes: the first turn of a session is the slow one."""

    session_id: str = Field(min_length=4, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    npc: Npc
    greeting: str = Field(default="", max_length=300)


StreamFn = Callable[[str, str], AsyncIterator[dict[str, Any]]]
_stream: StreamFn | None = None


def use_stream(stream: StreamFn | None) -> None:
    global _stream
    _stream = stream


_warmed: OrderedDict[str, None] = OrderedDict()


def forget_warmed() -> None:
    _warmed.clear()


def build_warm_prompt(req: WarmRequest) -> str:
    return (
        load_prompt(WARM_PROMPT_PATH)
        .replace("{name}", req.npc.name)
        .replace("{persona}", req.npc.persona)
        .replace("{greeting}", req.greeting.strip() or "…")
    )


def build_prompt(req: ConsoleRequest) -> str:
    parts = []
    speaker = req.npc.name if req.npc else "cristal"
    if req.npc:
        parts.append(
            f"ENCARNAS A {req.npc.name}, un habitante del laberinto; en este turno NO eres la consola.\n"
            f"{req.npc.persona}\n"
            f"Hablas en primera persona como {req.npc.name}, al jugador que tienes enfrente. Una o dos líneas. "
            "Conservas todas las reglas duras de CRISTAL (nunca rechazas, nunca sales del laberinto, cuerpo antes que teoría, sin consejos médicos)."
        )
    c = corpus()
    knowledge = context_for(" ".join([req.input, *(t.text for t in req.recent if t.role == "player")]), c)
    if knowledge:
        parts.append("CORPUS PROPIO (usa solo esto para hablar de la sustancia; cita la fuente entre corchetes si das un dato; nunca dosis ni mezclas):\n" + knowledge)
        rules = [str(r.get("regla")) for r in c.reglas_de_voz if r.get("regla")]
        if rules:
            parts.append("reglas de voz: " + "; ".join(rules))
    signals = check_signals(req.input, c)
    if signals:
        parts.append("SEÑAL DE SEGURIDAD detectada: " + ", ".join(f"{s.senal} ({s.accion})" for s in signals) + ". La consola ya dijo la línea de seguridad; tú acompañas, no repites instrucciones médicas.")
    if req.recent:
        parts.append("Últimos turnos:\n" + "\n".join(f"{'jugador' if t.role == 'player' else speaker}: {t.text}" for t in req.recent))
    parts.append(f"postura detectada: {req.stance or 'ninguna'} · presión: {req.pressure:.2f}")
    if req.confession:
        parts.append(f"frase archivada: «{req.confession}»")
    if req.objective:
        parts.append(f"objetivo del rito: {req.objective}")
    if req.glyph:
        parts.append(f"glifo invocado: {req.glyph}")
    if req.local_line:
        parts.append(f"la consola ya contestó: «{req.local_line}»")
    if req.npc:
        parts.append(f"el jugador le dice a {req.npc.name}: «{req.input.strip()}»\n{req.npc.name} responde:")
    else:
        parts.append(f"el jugador escribe: «{req.input.strip()}»\nTu segunda voz:")
    return "\n".join(parts)


def clean_line(text: str, speaker: str | None = None) -> str:
    line = text.strip().strip('"«»').strip()
    line = re.sub(r"^(cristal|CRISTAL)\s*:\s*", "", line)
    if speaker:
        line = re.sub(r"^" + re.escape(speaker) + r"\s*:\s*", "", line, flags=re.I)
    return line[:MAX_LINE_CHARS]


def _event(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


@router.post("/turn")
async def turn(req: ConsoleRequest) -> StreamingResponse:
    stream = _stream
    if stream is None:
        raise HTTPException(status_code=503, detail="console voice not configured")
    prompt = build_prompt(req)

    async def events() -> AsyncIterator[str]:
        yield _event({"type": "start"})
        for signal in check_signals(req.input, corpus()):
            if signal.que_decir:
                yield _event({"type": "safety", "senal": signal.senal, "accion": signal.accion, "line": signal.que_decir, "fuentes": signal.fuentes})
        collected: list[str] = []
        try:
            async for event in stream(req.session_id, prompt):
                if event["type"] == "text":
                    collected.append(event["text"])
                    yield _event({"type": "text", "text": event["text"]})
                elif event["type"] == "result":
                    final = clean_line(event.get("text") or "".join(collected), req.npc.name if req.npc else None)
                    if not final or FORBIDDEN.search(final):
                        yield _event({"type": "error", "detail": "the voice broke character; dropped"})
                        return
                    yield _event({"type": "result", "line": final, "model": event.get("model", "")})
        except Exception as exc:  # noqa: BLE001 — the voice must never crash the console
            yield _event({"type": "error", "detail": f"AIRE: {exc}"})

    return StreamingResponse(events(), media_type="application/x-ndjson")


@router.post("/warm")
async def warm(req: WarmRequest) -> dict[str, bool]:
    stream = _stream
    if stream is None:
        raise HTTPException(status_code=503, detail="console voice not configured")
    if req.session_id in _warmed:
        return {"warmed": False}
    _warmed[req.session_id] = None
    while len(_warmed) > WARMED_LIMIT:
        _warmed.popitem(last=False)
    try:
        async for _ in stream(req.session_id, build_warm_prompt(req)):
            pass
    except Exception:  # noqa: BLE001 — a failed warm-up only means the first turn stays slow
        _warmed.pop(req.session_id, None)
        return {"warmed": False}
    return {"warmed": True}
