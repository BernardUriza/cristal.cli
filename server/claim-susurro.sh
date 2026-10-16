#!/usr/bin/env bash
# Redeem a susurro claim code into this server's config, without the token ever
# being printed. A claim burns on first use and its token is shown only once, so
# this writes it straight into the gitignored env file.
#
#   1. In https://sus.bernarduriza.com/admin -> "Onboard a new app" -> copy the claim code.
#   2. ./claim-susurro.sh <claim-code>
#   3. Restart ./run.sh
set -euo pipefail
cd "$(dirname "$0")"

CODE="${1:?usage: ./claim-susurro.sh <claim-code>}"
CODE="${CODE##*[/=]}" # accept the whole claim link too
ENV_FILE=".env.local"
GATE="${SUSURRO_URL:-https://sus.bernarduriza.com}"

if grep -q '^SUSURRO_KEY=' "$ENV_FILE" 2>/dev/null; then
  echo "ERROR: $ENV_FILE already has a SUSURRO_KEY; remove that line first if you mean to replace it." >&2
  exit 1
fi

# name: how this app shows up in susurro's /admin usage (ignored if the claim already carries one)
ANSWER=$(curl -sS -m 90 -X POST "$GATE/v1/claim" -H 'Content-Type: application/json' \
  -d "{\"claim_code\":\"$CODE\",\"name\":\"cristal-tarot\"}")

TOKEN=$(printf '%s' "$ANSWER" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("token",""))' 2>/dev/null || true)
if [ -z "$TOKEN" ]; then
  echo "ERROR: susurro did not hand over a token: $ANSWER" >&2
  exit 1
fi

printf 'SUSURRO_KEY=%s\n' "$TOKEN" >> "$ENV_FILE"
echo "susurro key saved to $ENV_FILE (${#TOKEN} chars). Restart ./run.sh to use it."
