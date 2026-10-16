"""Voice for the tarot — a thin proxy to susurro, Bernard's STT/TTS gateway.

The page speaks the reading aloud and takes the question by dictation. It never
talks to susurro itself: a susurro key is per APP and must not ship to a
browser, so the key lives here and the page calls these three routes.

Configuration (read from the environment, see server/.env.local):

    SUSURRO_KEY   this app's susurro key (redeem a claim link from susurro's /admin)
    SUSURRO_URL     the gateway (default https://sus.bernarduriza.com)

Without a token the routes answer 503 and ``GET /tarot/voice`` says so, which is
how the page knows to hide its voice buttons instead of offering dead ones.
"""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/tarot/voice")

_URL = os.getenv("SUSURRO_URL", "https://sus.bernarduriza.com").rstrip("/")
_TOKEN = os.getenv("SUSURRO_KEY", "")
_MAX_AUDIO_BYTES = 5 * 1024 * 1024  # a dictated question, not a recording session
# susurro scales to zero: its first answer after a quiet spell has taken over 40 s
_TIMEOUT = httpx.Timeout(120, connect=60)


async def _susurro(path: str, **request) -> httpx.Response:
    if not _TOKEN:
        raise HTTPException(status_code=503, detail="susurro is not configured: SUSURRO_KEY is missing")
    headers = {"Authorization": f"Bearer {_TOKEN}", **request.pop("headers", {})}
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(f"{_URL}{path}", headers=headers, **request)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"susurro: {exc!r}") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"susurro {response.status_code}: {response.text[:200]}")
    return response


@router.get("")
async def status() -> dict[str, bool]:
    return {"available": bool(_TOKEN)}


class Speech(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    # empty = the gateway's default voice
    voice: str = Field(default="", max_length=40, pattern=r"^[a-z0-9_-]*$")


@router.post("/speak")
async def speak(req: Speech) -> Response:
    body = {"input": req.text, "format": "mp3"}
    if req.voice:
        body["voice"] = req.voice
    spoken = await _susurro("/v1/tts", json=body)
    return Response(content=spoken.content, media_type="audio/mpeg")


@router.post("/listen")
async def listen(request: Request, language: str = "es", format: str = "webm") -> dict[str, str]:
    audio = await request.body()
    if not audio:
        raise HTTPException(status_code=400, detail="no audio")
    if len(audio) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="the recording is too long")
    heard = await _susurro(
        "/v1/stt",
        params={"language": language, "format": format},
        content=audio,
        headers={"content-type": request.headers.get("content-type", "audio/webm")},
    )
    return {"transcript": str(heard.json().get("transcript", "")).strip()}
