#!/usr/bin/env bash
# Exporta la base Neon configurada en .env.local a data/backups/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"
OUT_DIR="${ROOT}/data/backups"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No se encontró .env.local" >&2
  exit 1
fi

DATABASE_URL="$(
  grep '^DATABASE_URL=' "$ENV_FILE" | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'"
)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL vacío en .env.local" >&2
  exit 1
fi

PG_DUMP=""
for candidate in pg_dump /opt/homebrew/opt/libpq/bin/pg_dump /usr/local/opt/libpq/bin/pg_dump; do
  if command -v "$candidate" >/dev/null 2>&1 || [[ -x "$candidate" ]]; then
    PG_DUMP="$candidate"
    break
  fi
done

if [[ -z "$PG_DUMP" ]]; then
  echo "Instala pg_dump: brew install libpq" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_SQL="${OUT_DIR}/neondb-${STAMP}.sql"
OUT_GZ="${OUT_SQL}.gz"

echo "Exportando a ${OUT_GZ} …"
"$PG_DUMP" "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f "$OUT_SQL"

gzip -f "$OUT_SQL"
ls -lh "$OUT_GZ"
echo "Listo: ${OUT_GZ}"
