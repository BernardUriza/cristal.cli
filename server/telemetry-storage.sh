#!/usr/bin/env bash
# Persist the first-five-minutes funnel and protect its summary. Run from the repo root as Bernard
# (the Container App lives in an Azure account this machine's default `az` login does not see):
#   ! bash server/telemetry-storage.sh
# Idempotent. Researched against the Container Apps docs (Azure Files volume via env storage + YAML
# update), NOT yet run end to end: read its output before trusting the mount.
set -euo pipefail
cd "$(dirname "$0")/.."

APP=cristal-api
RG=insult-rg
ENV_NAME=prod-env
LOCATION=eastus2
STORAGE_ACCOUNT=${CRISTAL_TELEMETRY_STORAGE:-cristaltelemetry}
SHARE=telemetry
MOUNT_PATH=/home/runner/telemetry
TOKEN=$(grep -m1 '^CRISTAL_TELEMETRY_TOKEN=' ~/.secrets/cristal-telemetry-token.txt | cut -d= -f2-)
[ -n "$TOKEN" ] || { echo "missing CRISTAL_TELEMETRY_TOKEN in ~/.secrets/cristal-telemetry-token.txt" >&2; exit 1; }

echo "== storage account $STORAGE_ACCOUNT (Azure Files share $SHARE)"
if ! az storage account show -n "$STORAGE_ACCOUNT" -g "$RG" -o none 2>/dev/null; then
  az storage account create -n "$STORAGE_ACCOUNT" -g "$RG" -l "$LOCATION" --sku Standard_LRS --kind StorageV2 --output none
  echo "   created"
else
  echo "   already there"
fi
KEY=$(az storage account keys list -n "$STORAGE_ACCOUNT" -g "$RG" --query "[0].value" -o tsv)
az storage share-rm create --storage-account "$STORAGE_ACCOUNT" -g "$RG" -n "$SHARE" --quota 1 --output none 2>/dev/null || true

echo "== environment storage $SHARE on $ENV_NAME"
az containerapp env storage set -n "$ENV_NAME" -g "$RG" --storage-name "$SHARE" \
  --azure-file-account-name "$STORAGE_ACCOUNT" --azure-file-account-key "$KEY" \
  --azure-file-share-name "$SHARE" --access-mode ReadWrite --output none
echo "   set"

echo "== secret telemetry-token + env"
az containerapp secret set -n "$APP" -g "$RG" --secrets "telemetry-token=$TOKEN" --output none
az containerapp update -n "$APP" -g "$RG" \
  --set-env-vars CRISTAL_TELEMETRY_TOKEN=secretref:telemetry-token "CRISTAL_TELEMETRY_PATH=$MOUNT_PATH/funnel.jsonl" --output none
echo "   updated"

echo "== mount $SHARE at $MOUNT_PATH (YAML update)"
TMP=$(mktemp -d)
az containerapp show -n "$APP" -g "$RG" -o yaml > "$TMP/app.yaml"
python3 - "$TMP/app.yaml" "$SHARE" "$MOUNT_PATH" <<'PY'
import sys, yaml
path, share, mount = sys.argv[1:4]
doc = yaml.safe_load(open(path, encoding="utf-8"))
template = doc["properties"]["template"]
volumes = [v for v in (template.get("volumes") or []) if v.get("name") != share]
volumes.append({"name": share, "storageType": "AzureFile", "storageName": share})
template["volumes"] = volumes
container = template["containers"][0]
mounts = [m for m in (container.get("volumeMounts") or []) if m.get("volumeName") != share]
mounts.append({"volumeName": share, "mountPath": mount})
container["volumeMounts"] = mounts
yaml.safe_dump(doc, open(path, "w", encoding="utf-8"), sort_keys=False)
PY
az containerapp update -n "$APP" -g "$RG" --yaml "$TMP/app.yaml" --output none
rm -rf "$TMP"
echo "   mounted"

FQDN=$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)
printf 'health -> '; curl -s -o /dev/null -w '%{http_code}\n' --max-time 60 "https://$FQDN/health" || true
printf 'summary -> '; curl -s --max-time 60 -H "X-Admin-Token: $TOKEN" "https://$FQDN/telemetry/funnel/summary" | head -c 400; echo
