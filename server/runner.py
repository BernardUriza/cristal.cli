"""CRISTAL.CLI Runner — fi-runner composed inline, Claude Code backend via OAuth.

Same proven pattern as og118/insult_ai: a `Runner` with `ClaudeCodeBackend`
authed by the ambient `CLAUDE_CODE_OAUTH_TOKEN`. This server is a procedural
ROOM GENERATOR for the labyrinth — no filesystem, no repo, no capabilities; the
persona emits the corrupted-liturgy room JSON.
"""

from __future__ import annotations

import os
from pathlib import Path

from fi_runner import (
    ClaudeCodeBackend,
    PermissionMode,
    Runner,
    ToolPolicy,
    load_prompt,
)

PERSONA_PATH = Path(__file__).parent / "prompts" / "persona.md"


def build_runner() -> Runner:
    return Runner(
        backend=ClaudeCodeBackend(
            default_model=os.getenv("CRISTAL_MODEL", "claude-sonnet-4-5"),
        ),
        persona=load_prompt(PERSONA_PATH),
        capabilities=[],
        tool_policy=ToolPolicy(
            builtin_disallowed=[
                "Bash", "Write", "Edit", "NotebookEdit",
                "Read", "Grep", "Glob", "LS", "Task",
            ],
            permission_mode=PermissionMode.BYPASS,
        ),
    )
