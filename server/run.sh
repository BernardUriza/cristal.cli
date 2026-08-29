#!/usr/bin/env bash
# Local dev launcher for the CRISTAL.CLI LLM server. Sources the gitignored
# .env.local for the AIRE door config (never printed) and runs uvicorn on 8131.
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck disable=SC1091
source .venv/bin/activate
set -a; [ -f .env.local ] && source .env.local; set +a

if [ -z "${AIRE_GATE_URL:-}" ] || [ -z "${AIRE_AUTH_TOKEN:-}" ]; then
  echo "ERROR: set AIRE_GATE_URL and AIRE_AUTH_TOKEN in .env.local" >&2
  exit 1
fi
echo "backend: AIRE door at ${AIRE_GATE_URL} (project ${CRISTAL_AIRE_PROJECT:-cristal})"

exec uvicorn app:app --port 8131 --log-level info
