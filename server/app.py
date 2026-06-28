"""CRISTAL.CLI LLM server — procedural room generator for the labyrinth.

A thin FastAPI app over fi-runner. The browser game (localhost:5173) POSTs a
seed + archetype + depth; the corrupted-liturgy persona returns one room as JSON.
"""

from __future__ import annotations

import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from runner import build_runner

_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
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

_runner = build_runner()


class RoomRequest(BaseModel):
    seed: int
    archetype: str = "vision"
    depth: int = 0
    fragments: list[str] = []


class Room(BaseModel):
    name: str
    inscription: str
    description: str
    exits: list[str]
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
    return Room(
        name=str(data.get("name", "")),
        inscription=str(data.get("inscription", "")),
        description=str(data.get("description", "")),
        exits=[str(e) for e in data.get("exits", [])],
        dread=int(data.get("dread", 0)),
        seed=req.seed,
    )
