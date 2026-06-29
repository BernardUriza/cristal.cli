#!/usr/bin/env bash
# Local dev launcher for the CRISTAL.CLI LLM server. Sources the gitignored
# .env.local for the auth token (never printed) and runs uvicorn on 8131.
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck disable=SC1091
source .venv/bin/activate
set -a; [ -f .env.local ] && source .env.local; set +a

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  unset CLAUDE_CODE_OAUTH_TOKEN || true
  echo "auth mode: ANTHROPIC_API_KEY (API billing)"
elif [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  unset ANTHROPIC_API_KEY || true
  echo "auth mode: CLAUDE_CODE_OAUTH_TOKEN (OAuth Max subscription)"
else
  echo "ERROR: set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN in .env.local" >&2
  exit 1
fi

exec uvicorn app:app --port 8131 --log-level info
