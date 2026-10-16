#!/bin/bash
# Container entrypoint: the AIRE door and susurro are configured by env vars set on the Container App, never baked in.
set -euo pipefail
echo "[entrypoint] booting — python $(python -V 2>&1)"
if [[ -z "${AIRE_GATE_URL:-}" || -z "${AIRE_AUTH_TOKEN:-}" ]]; then
  echo "[entrypoint] WARN: AIRE_GATE_URL / AIRE_AUTH_TOKEN unset — /health answers, every reading will fail."
fi
exec uvicorn app:app --host 0.0.0.0 --port 8080
