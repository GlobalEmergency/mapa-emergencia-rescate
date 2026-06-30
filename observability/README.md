# Observability — command center (Prometheus + Loki + Grafana)

Stack de observabilidad del proyecto, en un **VPS dedicado** (`167.233.197.13`),
aislado del cluster y de staging. **Recibe** las métricas y logs que el cluster
k3s de prod **empuja** (push) y los visualiza en Grafana. Mide latencia por
endpoint, 500s por ruta, tasas de error, runtime de Node y logs centralizados.

> ¿Por qué un box dedicado? El monitor no debe morir ni competir por CPU/RAM con
> lo que vigila (best practice estándar). Es un RECEPTOR: no scrapea el cluster
> (nodos efímeros, sin IP estable, otra red) — el cluster empuja vía Alloy.

## Estructura (todo vive en este folder)

```
observability/
  docker-compose.observability.yml   # prometheus + loki + grafana + caddy
  Caddyfile.observability            # TLS + 3 vhosts + bearer-gate del push
  prometheus/prometheus.yml          # remote-write receiver + self-scrape
  loki/loki.yml                      # push receiver + retención/límites
  grafana/provisioning/*             # datasources + carga de dashboards
  grafana/dashboards/*.json          # dashboards (GitOps, se editan en el repo)
```

El **env** (`.observability.env`) vive en la **raíz del repo** (gitignored),
para subirse con `./upload-github-secrets.sh -f .observability.env -e observability`
igual que `.env` y `.staging.env`. Plantilla: `.observability.env.example` (raíz).

## Componentes

- **Prometheus** — métricas. Recibe `remote_write` en `/api/v1/write`
  (`--web.enable-remote-write-receiver`). Retención 30d / 8GB.
- **Loki** — logs. Recibe push en `/loki/api/v1/push`. Retención 15d.
- **Grafana** — la UI. Datasources y dashboards auto-provisionados desde el repo.
- **Caddy** — TLS (Let's Encrypt) + enruta los 3 dominios. Prometheus/Loki NO
  publican puertos: solo se llega por Caddy, que gatea el push con bearer token.

## Dominios (A/AAAA -> 167.233.197.13)

| Dominio | -> servicio | Acceso |
| --- | --- | --- |
| `grafana-observability.terremotovenezuela.app` | grafana | público + login |
| `prom-observability.terremotovenezuela.app` | prometheus `/api/v1/write` | bearer token |
| `loki-observability.terremotovenezuela.app` | loki `/loki/api/v1/push` | bearer token |

## Cómo llegan los datos (push desde k3s)

1. Los pods de la app exponen `/metrics` (`prom-client`, ver el PR de `backend/`).
   No llevan sidecar ni push: solo exponen.
2. **Grafana Alloy** corre como **DaemonSet** en k3s (un pod por nodo, sigue a
   los nodos efímeros). Scrapea `/metrics`, tail-ea logs, y **empuja** ambos aquí
   (`remote_write` + `loki.write`) sobre HTTPS con `Authorization: Bearer
   $OBS_PUSH_TOKEN`. Solo egress; sin inbound al cluster, sin firewall nuevo.

> Orden de arranque: levanta ESTE stack y verifica que recibe ANTES de apuntar
> Alloy (Alloy bufferea en WAL si el receptor no está).

## Deploy

`deploy-observability.yml` (push a la rama `observability`): arma
`.observability.env` desde secrets del environment `observability`, rsync por
**clave SSH** (mapa-key, secret `OBS_SSH_KEY`) al VPS y `docker compose up`.

Local / manual:

```bash
cp .observability.env.example .observability.env   # en la raíz; rellena valores
# token: openssl rand -hex 32
cd observability
docker compose --env-file ../.observability.env -f docker-compose.observability.yml up -d
```

> `OBS_PUSH_TOKEN` debe coincidir en 2 sitios: este stack (Caddy lo verifica) y
> la config de Alloy en k3s (lo envía).

## Relación con Argo Rollouts (futuro, opcional)

El Prometheus de aquí es la fuente de métricas para un eventual upgrade de
seguridad de deploy: pasar del smoke + auto-rollback actual (#178) a un canary
con análisis de métricas (Argo Rollouts `AnalysisTemplate` consultando
`http_errors_total` / latencia). Fuera de alcance hoy; este stack es el
prerequisito.
