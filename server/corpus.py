"""The psychonaut corpus — CRISTAL's own RAG over substances, interactions and emergency signals.

Hard rule 5 of the game: the corpus is ours, structured and sourced; the model never answers about
a substance from memory when a fiche exists. Every claim carries source ids. The safety engine is
deterministic and runs BEFORE any model: a matched emergency signal yields a verified line to say.

Files (YAML, see corpus/SCHEMA.md): corpus/sustancias/<id>.yml, corpus/interacciones/<id>.yml,
corpus/urgencias/senales.yml. Loaded once per process from CRISTAL_CORPUS_PATH (default ./corpus).
"""

from __future__ import annotations

import os
import re
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/corpus")

MAX_CONTEXT_CHARS = 1400
MAX_ITEMS_PER_SECTION = 2


def plain(text: str) -> str:
    folded = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in folded if not unicodedata.combining(ch))


@dataclass
class Signal:
    id: str
    patterns: list[str]
    senal: str
    accion: str
    que_decir: str
    fuentes: list[str] = field(default_factory=list)


@dataclass
class Corpus:
    sustancias: dict[str, dict[str, Any]]
    interacciones: dict[str, list[dict[str, Any]]]
    senales: list[Signal]
    reglas_de_voz: list[dict[str, Any]]

    def names(self) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        for sid, fiche in self.sustancias.items():
            for name in [sid, *fiche.get("nombres", [])]:
                out.append((plain(str(name)), sid))
        return sorted(out, key=lambda pair: -len(pair[0]))


def _load_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_corpus(root: str | Path | None = None) -> Corpus:
    base = Path(root or os.getenv("CRISTAL_CORPUS_PATH") or Path(__file__).with_name("corpus"))
    sustancias: dict[str, dict[str, Any]] = {}
    for path in sorted((base / "sustancias").glob("*.yml")):
        fiche = _load_yaml(path)
        if isinstance(fiche, dict) and fiche.get("id"):
            sustancias[str(fiche["id"])] = fiche
    interacciones: dict[str, list[dict[str, Any]]] = {}
    for path in sorted((base / "interacciones").glob("*.yml")):
        data = _load_yaml(path)
        if isinstance(data, dict) and data.get("sustancia"):
            interacciones[str(data["sustancia"])] = list(data.get("interacciones", []))
    senales: list[Signal] = []
    reglas: list[dict[str, Any]] = []
    signals_path = base / "urgencias" / "senales.yml"
    if signals_path.exists():
        data = _load_yaml(signals_path)
        for raw in data.get("senales", []):
            senales.append(Signal(
                id=str(raw.get("id", "")),
                patterns=[plain(str(p)) for p in raw.get("patrones", [])],
                senal=str(raw.get("senal", "")),
                accion=str(raw.get("accion", "atencion")),
                que_decir=str(raw.get("que_decir", "")).strip(),
                fuentes=[str(f) for f in raw.get("fuentes", [])],
            ))
        reglas = list(data.get("reglas_de_voz", []))
    return Corpus(sustancias=sustancias, interacciones=interacciones, senales=senales, reglas_de_voz=reglas)


@lru_cache(maxsize=1)
def corpus() -> Corpus:
    return load_corpus()


def detect_substances(text: str, c: Corpus) -> list[str]:
    haystack = f" {plain(text)} "
    found: list[str] = []
    for name, sid in c.names():
        if sid in found or len(name) < 3:
            continue
        if re.search(rf"(?<![a-z0-9]){re.escape(name)}(?![a-z0-9])", haystack):
            found.append(sid)
    return found


def check_signals(text: str, c: Corpus) -> list[Signal]:
    haystack = plain(text)
    hits = [s for s in c.senales if any(p and p in haystack for p in s.patterns)]
    hits.sort(key=lambda s: 0 if s.accion == "urgente" else 1)
    return hits


def _items(fiche: dict[str, Any], key: str, n: int = MAX_ITEMS_PER_SECTION) -> list[str]:
    out: list[str] = []
    for item in fiche.get(key, [])[:n]:
        if isinstance(item, dict) and item.get("texto"):
            out.append(f"{item['texto']} [{', '.join(item.get('fuentes', [])) or 'sin fuente'}]")
    return out


def _one_temporalidad(t: dict[str, Any]) -> str:
    parts = []
    for key in ("inicio", "pico", "duracion"):
        rng = t.get(key)
        if isinstance(rng, list) and len(rng) == 2:
            parts.append(f"{key} {rng[0]}–{rng[1]} min")
    if not parts:
        return ""
    via = f"{t['via']}: " if t.get("via") else ""
    return via + ", ".join(parts) + f" [{', '.join(t.get('fuentes', []))}]"


def _temporalidad(fiche: dict[str, Any]) -> str:
    t = fiche.get("temporalidad")
    entries = t if isinstance(t, list) else [t] if isinstance(t, dict) else []
    return "; ".join(filter(None, (_one_temporalidad(e) for e in entries if isinstance(e, dict))))


def context_for(text: str, c: Corpus, mentioned_meds: bool = True) -> str:
    ids = detect_substances(text, c)
    if not ids:
        return ""
    blocks: list[str] = []
    for sid in ids[:2]:
        fiche = c.sustancias[sid]
        lines = [f"## {fiche.get('nombres', [sid])[0]} (corpus propio; cada dato lleva su fuente)"]
        tempo = _temporalidad(fiche)
        if tempo:
            lines.append(f"temporalidad: {tempo}")
        for key, label in (("acompanamiento", "qué ayuda ahora"), ("riesgos", "riesgos"), ("senales_de_urgencia", "pedir ayuda médica si")):
            for item in _items(fiche, key):
                lines.append(f"{label}: {item}")
        for item in _items(fiche, "fenomenologia", 1):
            lines.append(f"fenomenología (descripción, no hecho universal): {item}")
        if mentioned_meds:
            for inter in c.interacciones.get(sid, [])[:MAX_ITEMS_PER_SECTION]:
                lines.append(f"interacción con {inter.get('con')}: {inter.get('riesgo')} (gravedad {inter.get('gravedad')}) [{', '.join(inter.get('fuentes', []))}]")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)[:MAX_CONTEXT_CHARS]


class CheckRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1200)


class SignalOut(BaseModel):
    id: str
    senal: str
    accion: str
    que_decir: str
    fuentes: list[str]


class CheckResponse(BaseModel):
    sustancias: list[str]
    senales: list[SignalOut]
    contexto: str


@router.get("/sustancias")
async def list_substances() -> dict[str, Any]:
    c = corpus()
    return {"sustancias": [{"id": sid, "nombres": f.get("nombres", []), "familia": f.get("familia")} for sid, f in c.sustancias.items()], "senales": len(c.senales)}


@router.get("/sustancias/{sid}")
async def get_substance(sid: str) -> dict[str, Any]:
    c = corpus()
    if sid not in c.sustancias:
        raise HTTPException(status_code=404, detail="sustancia no está en el corpus")
    return {**c.sustancias[sid], "interacciones": c.interacciones.get(sid, [])}


@router.post("/check", response_model=CheckResponse)
async def check(req: CheckRequest) -> CheckResponse:
    c = corpus()
    return CheckResponse(
        sustancias=detect_substances(req.text, c),
        senales=[SignalOut(id=s.id, senal=s.senal, accion=s.accion, que_decir=s.que_decir, fuentes=s.fuentes) for s in check_signals(req.text, c)],
        contexto=context_for(req.text, c),
    )
