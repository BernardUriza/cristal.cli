"""CRISTAL.CLI LLM server — procedural room generator for the labyrinth.

A thin FastAPI app over fi-runner. The browser game (localhost:5173) POSTs a
seed + archetype + depth; the corrupted-liturgy persona returns one room as JSON.

It also reads the Thoth tarot (github.com/BernardUriza/tarot-thoth, localhost:8860 in dev): the page retrieves
the passages of "El Libro de Thoth" for the three drawn cards and POSTs them;
the tarot persona returns one reading grounded in them, streamed as it is
written (a turn through AIRE takes about a minute; nobody should stare at a
spinner for that long without seeing words arrive).
"""

from __future__ import annotations

import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fi_runner import BackendError
from pydantic import BaseModel, Field

from runner import build_atelier_runner, build_runner, build_tarot_runner
import atelier
from echo import router as echo_router
from telemetry import router as telemetry_router
from voice import router as voice_router

_DEFAULT_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8860,http://127.0.0.1:8860"
)
_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CRISTAL_ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
]

app = FastAPI(title="CRISTAL.CLI LLM", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(telemetry_router)
app.include_router(echo_router)
app.include_router(atelier.router)

_runner = build_runner()
_tarot = build_tarot_runner()
_atelier = build_atelier_runner()


async def _direct_text(prompt: str) -> str:
    return (await _atelier.run(prompt)).text


atelier.use_runner(_direct_text)


class RoomRequest(BaseModel):
    seed: int
    archetype: str = "vision"
    depth: int = 0
    fragments: list[str] = []


_SHAPES = ("chamber", "corridor", "shaft", "void")


class Room(BaseModel):
    name: str
    inscription: str
    description: str
    exits: list[str]
    shape: str
    dread: int
    seed: int


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


def _extract_json(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"no JSON object in model output: {text[:200]!r}")
    return json.loads(text[start : end + 1])


@app.post("/generate", response_model=Room)
async def generate(req: RoomRequest) -> Room:
    prompt = (
        f"semilla={req.seed} arquetipo={req.archetype} profundidad={req.depth} "
        f"fragmentos={req.fragments}. Genera el cuarto."
    )
    result = await _runner.run(prompt)
    try:
        data = _extract_json(result.text)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail=f"bad model output: {exc}") from exc
    shape = str(data.get("shape", "")).strip().lower()
    if shape not in _SHAPES:
        shape = _SHAPES[req.seed % len(_SHAPES)]
    return Room(
        name=str(data.get("name", "")),
        inscription=str(data.get("inscription", "")),
        description=str(data.get("description", "")),
        exits=[str(e) for e in data.get("exits", [])],
        shape=shape,
        dread=int(data.get("dread", 0)),
        seed=req.seed,
    )


class Passage(BaseModel):
    section: str = Field(max_length=200)
    page: int
    text: str = Field(max_length=4000)


class DrawnCard(BaseModel):
    slot: str = Field(max_length=40)
    name: str = Field(max_length=120)
    # how its neighbours leave it (elemental dignity), worked out by the page; empty when not judged
    dignity: str = Field(default="", max_length=200)
    passages: list[Passage] = Field(max_length=6)


class ReadingRequest(BaseModel):
    question: str = Field(default="", max_length=300)
    cards: list[DrawnCard] = Field(min_length=3, max_length=3)


def _line(event: dict) -> str:
    return json.dumps(event, ensure_ascii=False) + "\n"


@app.post("/tarot/reading")
async def tarot_reading(req: ReadingRequest) -> StreamingResponse:
    """One reading as NDJSON events: ``start``, then ``text`` deltas, then ``result`` (or ``error``)."""
    parts = [f"Pregunta del consultante: {req.question.strip()}"] if req.question.strip() else []
    for card in req.cards:
        passages = "\n\n".join(f"[{p.section}, p. {p.page}]\n{p.text}" for p in card.passages)
        dignity = f"\nDignidad: {card.dignity}" if card.dignity else ""
        parts.append(f"### {card.slot}: {card.name}{dignity}\n\n{passages}")

    async def events():
        yield _line({"type": "start"})
        try:
            # no session_id: every spread is a fresh reading, the casita keeps no thread between them
            async for event in _tarot.run_stream("\n\n".join(parts)):
                if event["type"] == "text":
                    yield _line({"type": "text", "text": event["text"]})
                elif event["type"] == "result":
                    result = event["result"]
                    reading = (result.answer or result.text).strip()
                    yield _line({"type": "result", "reading": reading, "model": result.model})
        except BackendError as exc:
            yield _line({"type": "error", "detail": f"AIRE: {exc}"})

    return StreamingResponse(events(), media_type="application/x-ndjson")
