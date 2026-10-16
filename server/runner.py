"""CRISTAL.CLI Runner — fi-runner composed inline, AIRE backend over HTTPS.

The turn no longer spawns a local Claude Code CLI: it crosses the network to
AIRE (Bernard's always-up server that wraps the Claude Agent SDK and owns the
transcript in its own Postgres). AIRE owns the server side — memory, tools and
permissions — so this file configures WHICH casita the room generator speaks in
and nothing else.

This server is a procedural ROOM GENERATOR for the labyrinth: no filesystem, no
repo, no capabilities; the persona emits the corrupted-liturgy room JSON. That
"no tools" guarantee is now `default_mode="complete"`, the AIRE door mode that
grants NO builtin at all (Bash is prohibited in both of the door's modes), which
replaces the old local `ToolPolicy(builtin_disallowed=[...])` — AIRE does not
forward a caller's tool policy, it configures tools server-side.

Configuration (both required, read from the environment by `AIREBackend`):

    AIRE_GATE_URL     https base of the AIRE door
    AIRE_AUTH_TOKEN   the door's long Bearer secret

Optional:

    CRISTAL_MODEL                model pinned on the session's pooled client
    CRISTAL_AIRE_PROJECT         the room generator's casita (default "cristal")
    CRISTAL_TAROT_AIRE_PROJECT   the tarot reader's casita (default "cristal-tarot")

The tarot reader (the tarot-thoth repo) is a second voice on the same door: its own
casita, because a persona is per-CASITA and the room generator's must not be
overwritten by it.
"""

from __future__ import annotations

import os
from pathlib import Path

from fi_runner import AIREBackend, Runner, load_prompt

PERSONA_PATH = Path(__file__).parent / "prompts" / "persona.md"
TAROT_PERSONA_PATH = Path(__file__).parent / "prompts" / "tarot.md"


def build_runner() -> Runner:
    return _complete_runner(os.getenv("CRISTAL_AIRE_PROJECT", "cristal"), PERSONA_PATH)


def build_tarot_runner() -> Runner:
    return _complete_runner(os.getenv("CRISTAL_TAROT_AIRE_PROJECT", "cristal-tarot"), TAROT_PERSONA_PATH)


def _complete_runner(project: str, persona_path: Path) -> Runner:
    return Runner(
        backend=AIREBackend(
            project=project,
            default_model=os.getenv("CRISTAL_MODEL", "claude-sonnet-4-5"),
            default_mode="complete",
        ),
        persona=load_prompt(persona_path),
        capabilities=[],
        # A narration is a SECOND backend call whose system prompt would be
        # /init'ed onto the casita, overwriting the persona that IS its base.
        flow_narrator=None,
    )
