"""Echoes between players — the relationship key CRISTAL otherwise lacks.

A player who archives a phrase leaves it here, anonymous: no session, no IP,
at most 64 characters. The next player asks for one and the labyrinth writes it
on a wall, deformed, so People Fun exists without multiplayer (Journey).

Configuration (environment):

    CRISTAL_ECHO_PATH   JSONL file the fragments append to
                        (default /home/runner/telemetry/echo.jsonl, the mounted share)

echo-denylist.txt next to this module keeps hostile words, self-harm orders and
contact data out of the pool: the reader may be in an altered state (regla 6).
"""

from __future__ import annotations

import json
import os
import random
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/echo")

FRAGMENT_MAX = 64
POOL_LIMIT = 2000
RECENT_WINDOW = 400
DENYLIST_PATH = Path(__file__).with_name("echo-denylist.txt")
CONTACT = re.compile(r"https?://|www\.|@\w|\d{7,}", re.IGNORECASE)


def _path() -> Path:
    return Path(os.getenv("CRISTAL_ECHO_PATH", "/home/runner/telemetry/echo.jsonl"))


class Fragment(BaseModel):
    text: str = Field(min_length=3, max_length=FRAGMENT_MAX)


def clean(text: str) -> str:
    return " ".join(text.split())[:FRAGMENT_MAX]


def _normalize(text: str) -> str:
    stripped = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in stripped if unicodedata.category(ch) != "Mn")


def _denylist() -> list[re.Pattern[str]]:
    patterns: list[re.Pattern[str]] = []
    if not DENYLIST_PATH.exists():
        return patterns
    for raw in DENYLIST_PATH.read_text(encoding="utf-8").splitlines():
        term = raw.strip()
        if not term or term.startswith("#"):
            continue
        if term.endswith("*"):
            patterns.append(re.compile(r"\b" + re.escape(term[:-1])))
        else:
            patterns.append(re.compile(r"\b" + re.escape(term) + r"\b"))
    return patterns


def admissible(text: str) -> bool:
    plain = _normalize(text)
    if CONTACT.search(plain):
        return False
    return not any(pattern.search(plain) for pattern in _denylist())


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
            if isinstance(text, str) and text and admissible(text):
                out.append(text)
    return out[-POOL_LIMIT:]


@router.post("", status_code=204)
async def leave(fragment: Fragment) -> None:
    text = clean(fragment.text)
    if len(text) < 3:
        return
    if not admissible(text):
        raise HTTPException(status_code=422, detail="fragmento no admitido")
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
