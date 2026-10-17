"""First-five-minutes funnel for the labyrinth — the one number no paper has.

The browser reports, once per visit and per step, how many seconds after loading
laberinto.html the player reached: pointer lock, first step, console, first
phrase, glyph, door. Nothing else travels: no IP is stored, no text the player
typed, and the session id is a random string the page made up.

Configuration (environment):

    CRISTAL_TELEMETRY_PATH   JSONL file the events append to
                             (default /home/runner/telemetry/funnel.jsonl; mount a
                             volume there or the file dies with the revision)
    CRISTAL_TELEMETRY_TOKEN  shared secret for GET /telemetry/funnel/summary
                             (unset -> the summary answers 503 and says so)
"""

from __future__ import annotations

import json
import os
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

FUNNEL_STEPS = (
    "laberinto",
    "pointer_lock",
    "first_step",
    "console_open",
    "first_phrase",
    "glyph_invoked",
    "door_crossed",
)

FunnelStep = Literal[
    "laberinto",
    "pointer_lock",
    "first_step",
    "console_open",
    "first_phrase",
    "glyph_invoked",
    "door_crossed",
]

router = APIRouter(prefix="/telemetry")


def _path() -> Path:
    return Path(os.getenv("CRISTAL_TELEMETRY_PATH", "/home/runner/telemetry/funnel.jsonl"))


def _token() -> str:
    return os.getenv("CRISTAL_TELEMETRY_TOKEN", "").strip()


class FunnelEvent(BaseModel):
    session: str = Field(min_length=4, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    step: FunnelStep
    t: float = Field(ge=0, le=86_400)
    build: str = Field(default="", max_length=64, pattern=r"^[A-Za-z0-9_.-]*$")


@router.post("/funnel", status_code=204)
async def record_funnel(event: FunnelEvent) -> None:
    path = _path()
    path.parent.mkdir(parents=True, exist_ok=True)
    line = {
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "session": event.session,
        "step": event.step,
        "t": round(event.t, 1),
        "build": event.build,
    }
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(line, ensure_ascii=False) + "\n")


def summarize(lines: list[dict]) -> dict:
    first_t: dict[str, dict[str, float]] = defaultdict(dict)
    for item in lines:
        step, session = item.get("step"), item.get("session")
        if step not in FUNNEL_STEPS or not session:
            continue
        t = float(item.get("t", 0))
        if step not in first_t[session] or t < first_t[session][step]:
            first_t[session][step] = t
    sessions = len(first_t)
    reached = {step: sum(1 for steps in first_t.values() if step in steps) for step in FUNNEL_STEPS}
    median_t = {
        step: statistics.median([steps[step] for steps in first_t.values() if step in steps])
        for step in FUNNEL_STEPS
        if reached[step] > 0
    }
    drop = {}
    previous = None
    for step in FUNNEL_STEPS:
        if previous is not None and reached[previous] > 0:
            drop[step] = round(1 - reached[step] / reached[previous], 3)
        previous = step
    return {"sessions": sessions, "reached": reached, "median_t": median_t, "drop_from_previous": drop}


@router.get("/funnel/summary")
async def funnel_summary(x_admin_token: str = Header(default="")) -> dict:
    token = _token()
    if not token:
        raise HTTPException(status_code=503, detail="CRISTAL_TELEMETRY_TOKEN unset")
    if x_admin_token != token:
        raise HTTPException(status_code=401, detail="bad token")
    path = _path()
    lines: list[dict] = []
    if path.exists():
        with path.open(encoding="utf-8") as handle:
            for raw in handle:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    lines.append(json.loads(raw))
                except json.JSONDecodeError:
                    continue
    return {"path": str(path), "events": len(lines), **summarize(lines)}
