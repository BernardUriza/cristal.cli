"""Echoes between players — the relationship key CRISTAL otherwise lacks.

A player who archives a phrase leaves it here, anonymous: no session, no IP,
at most 64 characters. The next player asks for one and the labyrinth writes it
on a wall, deformed, so People Fun exists without multiplayer (Journey).

Configuration (environment):

    CRISTAL_ECHO_PATH   JSONL file the fragments append to
                        (default /home/runner/telemetry/echo.jsonl, the mounted share)
"""

from __future__ import annotations

import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/echo")

FRAGMENT_MAX = 64
POOL_LIMIT = 2000
RECENT_WINDOW = 400


def _path() -> Path:
    return Path(os.getenv("CRISTAL_ECHO_PATH", "/home/runner/telemetry/echo.jsonl"))


class Fragment(BaseModel):
    text: str = Field(min_length=3, max_length=FRAGMENT_MAX)


def clean(text: str) -> str:
    return " ".join(text.split())[:FRAGMENT_MAX]


def _read(path: Path) -> list[str]:
    if not path.exists():
        return []
    out: list[str] = []
    with path.open(encoding="utf-8") as handle:
        for raw in handle:
            raw = raw.strip()
            if not raw:
                continue
            try:
                text = json.loads(raw).get("text")
            except json.JSONDecodeError:
                continue
            if isinstance(text, str) and text:
                out.append(text)
    return out[-POOL_LIMIT:]


@router.post("", status_code=204)
async def leave(fragment: Fragment) -> None:
    text = clean(fragment.text)
    if len(text) < 3:
        return
    path = _path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "text": text}, ensure_ascii=False) + "\n")


@router.get("")
async def take(exclude: str = "") -> dict:
    pool = [text for text in _read(_path())[-RECENT_WINDOW:] if text != clean(exclude)]
    if not pool:
        return {"text": None, "pool": 0}
    return {"text": random.choice(pool), "pool": len(pool)}
