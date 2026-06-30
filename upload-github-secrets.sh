#!/usr/bin/env bash
# Upload .env-style secrets to a GitHub repository environment.
# Requires: GitHub CLI (gh) installed and authenticated with repo write perms.
#
# Entornos de este repo (sube a uno con -e <env>):
#   production-hetzner  -> PROD (deploy-hetzner.yml, job `deploy`). Sube .env:
#       ./upload-github-secrets.sh -f .env -e production-hetzner
#   staging             -> STAGING (deploy-staging.yml, VPS Debian único). Sube
#       el .staging.env como UN solo secret STAGING_ENV + los 4 de conexión SSH:
#       gh secret set STAGING_ENV --env staging < .staging.env
#       gh secret set STAGING_HOST --env staging --body <ip-del-vps>
#       gh secret set STAGING_USER --env staging --body <usuario-ssh>
#       gh secret set STAGING_PROJECT_PATH --env staging --body <ruta-en-el-vps>
#       gh secret set STAGING_SSH_KEY --env staging < ~/.ssh/<clave-privada-staging>
#   observability       -> COMMAND CENTER (deploy-observability.yml, VPS dedicado
#       167.233.197.13). Sube .observability.env (per-key) + la clave SSH:
#       ./upload-github-secrets.sh -f .observability.env -e observability
#       gh secret set OBS_SSH_KEY --env observability < ~/.ssh/<clave-privada-mapa>
#
# Supports two value forms:
#   KEY=value          -> single-line value uploaded as-is
#   KEY=@/path/to/file -> the FILE CONTENTS are uploaded (for multi-line secrets
#                         like SSH_PRIVATE_KEY / KUBECONFIG). gh handles newlines.
set -euo pipefail
shopt -s extglob

ENV_FILE=".env"
REPO="terremotovenezuela/mapa-emergencia-rescate"
# Empty => REPO-LEVEL secrets. Para los deploys reales pasa -e con el entorno:
#   -e production-hetzner  (prod, deploy-hetzner.yml)
#   -e staging             (staging, deploy-staging.yml)
#   -e observability       (command center, deploy-observability.yml)
ENVIRONMENT=""

usage() {
  cat <<'EOF'
Usage: ./upload-github-secrets.sh [-f env_file] [-r owner/repo] [-e environment]
  -f  Path to env file (default: .env)
  -r  GitHub repo owner/name (default: ArturoRiosMock/mapa-emergencia-rescate)
  -e  GitHub environment name (production-hetzner | staging; omit = repo-level)

Value forms in the env file:
  KEY=value          single-line value
  KEY=@/path/to/file file contents become the secret (multi-line OK)
EOF
}

while getopts "f:r:e:h" opt; do
  case "$opt" in
    f) ENV_FILE="$OPTARG" ;;
    r) REPO="$OPTARG" ;;
    e) ENVIRONMENT="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

command -v gh >/dev/null 2>&1 || { echo "Error: gh CLI not found (https://cli.github.com/)" >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "Error: env file '$ENV_FILE' not found." >&2; exit 1; }

# Build the optional --env flag once. Empty ENVIRONMENT => repo-level secrets.
ENV_ARGS=()
if [ -n "$ENVIRONMENT" ]; then
  ENV_ARGS=(--env "$ENVIRONMENT")
  echo "Uploading secrets from $ENV_FILE to $REPO (environment: $ENVIRONMENT)"
else
  echo "Uploading secrets from $ENV_FILE to $REPO (repo-level — no environment)"
fi

while IFS= read -r line || [ -n "$line" ]; do
  line=${line%$'\r'}
  line="${line##+([[:space:]])}"
  line="${line%%+([[:space:]])}"
  # skip blanks and comments
  [[ -z "$line" || "$line" == \#* ]] && continue

  if [[ $line =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    name="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    value=${value%$'\r'}

    # Guard against pushing the unfilled placeholder.
    if [[ "$value" == PUT_YOUR_* ]]; then
      echo "Skipping $name — still a placeholder, fill it first." >&2
      continue
    fi

    if [[ "$value" == @* ]]; then
      # @path form: upload file contents (multi-line safe).
      file="${value#@}"
      file="${file/#\~/$HOME}"
      if [ ! -f "$file" ]; then
        echo "Warning: $name points to missing file '$file' — skipping." >&2
        continue
      fi
      echo "Uploading secret (from file): $name  <- $file"
      gh secret set "$name" --repo "$REPO" "${ENV_ARGS[@]}" < "$file"
    else
      echo "Uploading secret: $name"
      gh secret set "$name" --body "$value" --repo "$REPO" "${ENV_ARGS[@]}"
    fi
  else
    echo "Warning: skipping invalid line: $line" >&2
  fi
done < "$ENV_FILE"

if [ -n "$ENVIRONMENT" ]; then
  echo "Done. Secrets uploaded to environment '$ENVIRONMENT' in '$REPO'."
else
  echo "Done. Repo-level secrets uploaded to '$REPO'."
fi
