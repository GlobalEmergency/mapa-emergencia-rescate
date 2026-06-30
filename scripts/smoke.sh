#!/usr/bin/env bash
#
# Smoke post-deploy: verifica que la web y la API sirven tráfico real DESPUÉS
# del roll, no solo que el build pasó. Lo corre el workflow de deploy
# (.github/workflows/deploy-hetzner.yml) contra el edge público; también se
# puede correr a mano para validar producción.
#
# Diseño (ver docs/deploy/proceso-de-deploy.md):
#   - Solo GET. NO crea reportes ni datos: humanitario, GitHub es público.
#   - Solo mira el STATUS CODE (curl -o /dev/null): nunca vuelca cuerpos, así
#     no aterrizan datos de reportes ni secretos en los logs de CI.
#   - Timeout por request (--max-time) + reintentos con backoff: el rollout
#     acaba de terminar y el LB puede tardar unos segundos en enrutar.
#   - Sale != 0 si CUALQUIER objetivo falla -> el deploy se marca rojo.
#
# Uso:
#   WEB_BASE=https://terremotovenezuela.app \
#   API_BASE=https://api.terremotovenezuela.app \
#   bash scripts/smoke.sh
#
# Variables (con defaults de producción):
#   WEB_BASE      base del frontend            (default https://terremotovenezuela.app)
#   API_BASE      base de la API               (default https://api.terremotovenezuela.app)
#   SMOKE_TIMEOUT segundos por request         (default 10)
#   SMOKE_RETRIES intentos por objetivo        (default 5)
set -euo pipefail

WEB_BASE="${WEB_BASE:-https://terremotovenezuela.app}"
API_BASE="${API_BASE:-https://api.terremotovenezuela.app}"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-10}"
SMOKE_RETRIES="${SMOKE_RETRIES:-5}"

# Quita la barra final para no construir URLs con "//".
WEB_BASE="${WEB_BASE%/}"
API_BASE="${API_BASE%/}"

# Objetivos: "<URL> <status_esperado>". Todos GET, todos públicos.
TARGETS=(
  "${WEB_BASE}/ 200"
  "${WEB_BASE}/robots.txt 200"
  "${WEB_BASE}/sitemap.xml 200"
  "${API_BASE}/api/healthz 200"
  "${API_BASE}/api/readyz 200"
  "${API_BASE}/api/reports 200"
  "${API_BASE}/api/missing/stats 200"
)

# Pega a una URL hasta SMOKE_RETRIES veces; devuelve 0 si llega al status
# esperado. Backoff lineal (2s, 4s, 6s...) entre intentos.
check() {
  local url="$1" expected="$2" code=""
  for attempt in $(seq 1 "$SMOKE_RETRIES"); do
    # curl ya imprime "000" vía -w cuando no conecta; `|| true` evita que set -e
    # corte el script en ese caso (lo tratamos como intento fallido, no fatal).
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$SMOKE_TIMEOUT" "$url" || true)"
    [ -z "$code" ] && code="000"
    if [ "$code" = "$expected" ]; then
      echo "  ✅ $url -> $code"
      return 0
    fi
    echo "  … intento $attempt/$SMOKE_RETRIES: $url -> $code (espera $expected)"
    [ "$attempt" -lt "$SMOKE_RETRIES" ] && sleep $(( attempt * 2 ))
  done
  echo "  ❌ $url -> $code (espera $expected) tras $SMOKE_RETRIES intentos"
  return 1
}

echo "Smoke post-deploy"
echo "  WEB_BASE=$WEB_BASE"
echo "  API_BASE=$API_BASE"
echo "  timeout=${SMOKE_TIMEOUT}s retries=${SMOKE_RETRIES}"
echo

failed=0
for target in "${TARGETS[@]}"; do
  # shellcheck disable=SC2086 -- target es "URL status" controlado por nosotros.
  set -- $target
  check "$1" "$2" || failed=$(( failed + 1 ))
done

echo
if [ "$failed" -ne 0 ]; then
  echo "Smoke FALLÓ: $failed objetivo(s) no respondieron como se esperaba."
  exit 1
fi
echo "Smoke OK: todos los objetivos respondieron."
