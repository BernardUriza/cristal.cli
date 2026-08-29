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

    CRISTAL_MODEL          model pinned on the session's pooled client
    CRISTAL_AIRE_PROJECT   the casita name (default "cristal")
"""

from __future__ import annotations

import os
from pathlib import Path

from fi_runner import AIREBackend, Runner, load_prompt

PERSONA_PATH = Path(__file__).parent / "prompts" / "persona.md"


def build_runner() -> Runner:
    return Runner(
        backend=AIREBackend(
            project=os.getenv("CRISTAL_AIRE_PROJECT", "cristal"),
            default_model=os.getenv("CRISTAL_MODEL", "claude-sonnet-4-5"),
            default_mode="complete",
        ),
        persona=load_prompt(PERSONA_PATH),
        capabilities=[],
        # A narration is a SECOND backend call whose system prompt would be
        # /init'ed onto the casita, overwriting the persona that IS its base.
        flow_narrator=None,
    )
