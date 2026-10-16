#!/usr/bin/env bash
# One-time Azure provisioning for the CRISTAL.CLI API (Container App cristal-api in insult-rg/prod-env,
# next to persona-runner). Idempotent. Secrets are read from server/.env.local and ~/.secrets, never printed.
#   bash server/provision.sh
set -euo pipefail
cd "$(dirname "$0")"

APP=cristal-api
RG=insult-rg
ENV_NAME=prod-env
AAD_CLIENT_ID=5bae4482-4244-4c08-8309-71f1fa505a76
IMAGE=ghcr.io/bernarduriza/cristal.cli/api:latest
ORIGINS="https://tarot.bernarduriza.com,https://bernarduriza.com,https://www.bernarduriza.com,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8860,http://127.0.0.1:8860"

AIRE_GATE_URL=$(grep -m1 '^AIRE_GATE_URL=' .env.local | cut -d= -f2-)
AIRE_AUTH_TOKEN=$(grep -m1 '^AIRE_AUTH_TOKEN=' .env.local | cut -d= -f2-)
SUSURRO_KEY=$(grep -m1 '^SUSURRO_KEY=' ~/.secrets/susurro-key-cristal-tarot.txt | cut -d= -f2-)
[ -n "$AIRE_GATE_URL" ] && [ -n "$AIRE_AUTH_TOKEN" ] && [ -n "$SUSURRO_KEY" ] || { echo "missing AIRE_GATE_URL / AIRE_AUTH_TOKEN / SUSURRO_KEY" >&2; exit 1; }
echo "secrets loaded: aire token ${#AIRE_AUTH_TOKEN} chars, susurro key ${#SUSURRO_KEY} chars"

echo "== OIDC federated credential for GitHub Actions (cristal.cli main)"
OID=$(az ad app show --id "$AAD_CLIENT_ID" --query id -o tsv)
if ! az ad app federated-credential list --id "$OID" --query "[?name=='cristal-cli-main'].name" -o tsv | grep -q .; then
  az ad app federated-credential create --id "$OID" --parameters '{"name":"cristal-cli-main","issuer":"https://token.actions.githubusercontent.com","subject":"repo:BernardUriza/cristal.cli:ref:refs/heads/main","audiences":["api://AzureADTokenExchange"]}' --output none
  echo "   created"
else
  echo "   already there"
fi

echo "== Container App $APP"
if ! az containerapp show -n "$APP" -g "$RG" --query name -o tsv >/dev/null 2>&1; then
  az containerapp create -n "$APP" -g "$RG" --environment "$ENV_NAME" \
    --image "$IMAGE" --target-port 8080 --ingress external \
    --min-replicas 0 --max-replicas 1 --cpu 0.5 --memory 1.0Gi \
    --secrets "aire-gate-url=$AIRE_GATE_URL" "aire-auth-token=$AIRE_AUTH_TOKEN" "susurro-key=$SUSURRO_KEY" \
    --env-vars AIRE_GATE_URL=secretref:aire-gate-url AIRE_AUTH_TOKEN=secretref:aire-auth-token SUSURRO_KEY=secretref:susurro-key "CRISTAL_ALLOWED_ORIGINS=$ORIGINS" \
    --output none
  echo "   created"
else
  az containerapp secret set -n "$APP" -g "$RG" --secrets "aire-gate-url=$AIRE_GATE_URL" "aire-auth-token=$AIRE_AUTH_TOKEN" "susurro-key=$SUSURRO_KEY" --output none
  az containerapp update -n "$APP" -g "$RG" --set-env-vars AIRE_GATE_URL=secretref:aire-gate-url AIRE_AUTH_TOKEN=secretref:aire-auth-token SUSURRO_KEY=secretref:susurro-key "CRISTAL_ALLOWED_ORIGINS=$ORIGINS" --output none
  echo "   updated secrets + env"
fi
FQDN=$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)
echo "   https://$FQDN"
printf 'health -> '; curl -s -o /dev/null -w '%{http_code}\n' --max-time 60 "https://$FQDN/health" || true

echo "== CI service principal: Contributor on this Container App only"
SPOID=$(az ad sp show --id "$AAD_CLIENT_ID" --query id -o tsv)
APPID=$(az containerapp show -n "$APP" -g "$RG" --query id -o tsv)
az role assignment create --assignee-object-id "$SPOID" --assignee-principal-type ServicePrincipal --role Contributor --scope "$APPID" --output none && echo "   granted"
