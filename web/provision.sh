#!/usr/bin/env bash
# One-time Azure provisioning for the CRISTAL.CLI web: Static Web App cristal-cli (Free) in portfolio-rg
# next to the portfolio and tarot-thoth, its deployment token into ~/.secrets and into the GitHub secret the
# workflow reads, the custom domain cristal.bernarduriza.com, and the new origin on the API's CORS list.
# DNS (Namecheap): CNAME cristal -> <defaultHostname> must exist before the hostname step validates.
#   bash web/provision.sh
set -euo pipefail
APP=cristal-cli
RG=portfolio-rg
DOMAIN=cristal.bernarduriza.com
TOKEN_FILE=~/.secrets/azure-swa-cristal-cli.txt
GH_SECRET=AZURE_STATIC_WEB_APPS_API_TOKEN_CRISTAL
REPO=BernardUriza/cristal.cli
API_APP=cristal-api
API_RG=insult-rg

if ! az staticwebapp show -n "$APP" -g "$RG" --query name -o tsv >/dev/null 2>&1; then
  az staticwebapp create -n "$APP" -g "$RG" -l eastus2 --sku Free --output none
  echo "created $APP"
fi
HOST=$(az staticwebapp show -n "$APP" -g "$RG" --query defaultHostname -o tsv)
echo "default host: $HOST  (Namecheap: CNAME cristal -> $HOST)"

TOKEN=$(az staticwebapp secrets list -n "$APP" -g "$RG" --query properties.apiKey -o tsv)
printf '# Azure Static Web App deployment token for cristal-cli (cristal.bernarduriza.com). Mirrored into the GitHub secret %s for .github/workflows/azure-static-web-app.yml. Created 2026-10-16.\nAZURE_STATIC_WEB_APPS_API_TOKEN=%s\n' "$GH_SECRET" "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"; echo "token saved to $TOKEN_FILE (${#TOKEN} chars)"
printf '%s' "$TOKEN" | gh secret set "$GH_SECRET" --repo "$REPO" && echo "github secret $GH_SECRET set"

ORIGINS=$(az containerapp show -n "$API_APP" -g "$API_RG" --query "properties.template.containers[0].env[?name=='CRISTAL_ALLOWED_ORIGINS'].value | [0]" -o tsv)
if ! printf '%s' "$ORIGINS" | grep -q "https://$DOMAIN"; then
  az containerapp update -n "$API_APP" -g "$API_RG" --set-env-vars "CRISTAL_ALLOWED_ORIGINS=$ORIGINS,https://$DOMAIN,https://$HOST" --output none
  echo "API CORS now allows https://$DOMAIN and https://$HOST"
else
  echo "API CORS already allows https://$DOMAIN"
fi

if ! az staticwebapp hostname list -n "$APP" -g "$RG" --query "[?name=='$DOMAIN'].name" -o tsv | grep -q .; then
  if dig +short CNAME "$DOMAIN" @8.8.8.8 | grep -q "$HOST"; then
    az staticwebapp hostname set -n "$APP" -g "$RG" --hostname "$DOMAIN" --output none && echo "hostname $DOMAIN added"
  else
    echo "DNS not propagated yet: add CNAME cristal -> $HOST in Namecheap, then re-run"
  fi
fi
az staticwebapp hostname list -n "$APP" -g "$RG" -o table
