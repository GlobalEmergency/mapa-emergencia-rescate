# Proceso de deploy

El despliegue es **deploy-only** y solo se dispara cuando un **PR se mergea a
`main`** (o por dispatch manual).

Workflow: `.github/workflows/deploy-hetzner.yml` — **Deploy to Hetzner (k3s)**.

## Triggers

| Evento | Resultado |
| --- | --- |
| **PR mergeado a `main`** (`pull_request: closed` + `merged==true`) | auto-deploy a **staging** (CD) |
| **workflow_dispatch (manual)** | deploy al `target` elegido (`staging` o `prod`) |
| PR cerrado sin merge / push crudo / bypass de admin | nada (el guard de job lo salta) |

> **prod nunca es automático.** Solo sale de un `workflow_dispatch` manual con
> `target=prod`. Un merge a main jamás despliega prod.
>
> **El trigger NO es `push`.** Es `pull_request: types:[closed]` acotado a
> `branches:[main]`. Un push crudo a `main` (incluido un bypass de admin) NO
> dispara el workflow.

## Cómo desplegar a prod (manual)

1. El cambio debe estar en **`main`**.
2. GitHub → Actions → **Deploy to Hetzner (k3s)** → **Run workflow**.
3. Elige **`target` = prod** → Run.

## Gate de verificación

Antes de construir/desplegar corre el job **`verify`**: instala dependencias en
`backend/` y `frontend/`, typecheckea la API, typecheckea el worker y corre el
lint del frontend. El job **`verify-admin`** corre `lint` + `typecheck` + `test`
del panel (`admin/`). El job `deploy` tiene `needs: [verify, verify-admin]`, así
que un build roto NUNCA llega al clúster.

> **El guard real es a nivel de job.** Ambos jobs (`verify` y `deploy`) tienen:
>
> ```yaml
> if: >-
>   github.event_name == 'workflow_dispatch' ||
>   (github.event.pull_request.merged == true &&
>    github.event.pull_request.base.ref == 'main')
> ```
>
> No depende de `github.ref`: lo que importa es que el PR se haya **mergeado**
> con base `main`, o que sea un dispatch manual. Refuérzalo con branch
> protection / ruleset en `main` (PR + review de code-owner + check Build &
> Test).

## Qué hace, paso a paso

1. **Build + push** de tres imágenes a GHCR, tag `:<sha>` y `:latest`:
   - `frontend` (Next.js standalone, target `runtime`),
   - `backend` (Express API + worker + migrador),
   - `admin` (panel Next standalone; build-arg `APP_BUILD_SHA`).
2. **kubectl** desde el secret `KUBECONFIG` (base64).
3. **migrate-env** secret (NEON + R2) — re-aplicado por si cambió.
4. **Sube `/_next/static` a R2** (push-then-roll, aditivo, nunca `--delete`):
   arregla el version-skew multi-pod sirviendo los assets content-hashed desde
   el CDN (frontend en la raíz; panel bajo `/admin`).
5. **Aplica manifests**: renderiza con `envsubst` los **tres `Service`** (web,
   api y admin) inyectando el perfil TLS por target (`WEB_TLS_ANNOTATIONS` /
   `API_TLS_ANNOTATIONS` / `ADMIN_TLS_ANNOTATIONS`; api y admin replican el
   perfil de web). Luego aplica:
   - `deployment.yaml` (Deployment `web` con imagen frontend + Deployment `api`
     con imagen backend + Deployment `admin` con imagen admin),
   - `hpa.yaml` (HPA por tier),
   - `cluster-autoscaler.yaml` (si existe su secret),
   - `worker-deployment` (si hay `migrate-env`).
6. **Migración de esquema gateada** (Job `migrate-<sha>`): aplica las
   migraciones Drizzle pendientes ANTES del roll. Si falla, **la app NO rota**.
   Ver [migraciones-de-base-de-datos.md](migraciones-de-base-de-datos.md).
7. **Roll zero-downtime**: `kubectl set image` + `rollout status` en el loop
   `for tier in web api admin` (bloquea hasta que los pods nuevos estén Ready y
   los viejos drenen). El `migrate-worker` se rola aparte.
8. **Smoke post-deploy** (`scripts/smoke.sh`): tras el roll, pega al **edge
   público** (web `WEB_BASE`, api `API_BASE`) y verifica que sirve tráfico real.
   Hoy es **solo informativo** (`::warning::`, no tumba el deploy); ver
   [Smoke post-deploy y rollback](#smoke-post-deploy-y-rollback).

## `target`: staging vs prod (perfil TLS del LB)

Hay **tres LoadBalancer**: `mapa-lb` (web, dominio público), `mapa-api-lb`
(api, terceros) y `admin-lb` (panel, `admin.terremotovenezuela.app`). El perfil
TLS se inyecta por target con `envsubst` y la api y el admin **replican el perfil
de web**.

| target | TLS | DNS |
| --- | --- | --- |
| `staging` | El LB sirve el **cert Origin de Cloudflare** (`cf-origin-dreamit`); Cloudflare en "Full" | `vzla-terremoto.dreamit.software` (Cloudflare proxied) |
| `prod` | El LB emite un **cert gestionado de Hetzner** para `PROD_HOST` | `terremotovenezuela.app` + `api.terremotovenezuela.app` (ver [dominio-y-dns.md](dominio-y-dns.md)) |

Ver detalles de DNS/TLS en [dominio-y-dns.md](dominio-y-dns.md).
Como `api` replica el perfil de `web`, `PROD_HOST` debe cubrir los hostnames de
ambos LoadBalancer; si se usa una lista, mantenla sincronizada con los registros
DNS públicos.

## Qué NO hace este workflow (a propósito)

Tareas de infraestructura raras/peligrosas se sacaron del deploy. Cuando las
necesites, córrelas **manualmente**:

- **Provisionar / recrear cluster** (`tofu apply`, kubeconfig, secrets
  iniciales): desde `infra/tofu/` con OpenTofu. Tras provisionar, guarda el
  secret `KUBECONFIG` y crea `app-env` (DATABASE_URL/VALKEY_URL/R2_*) y
  `migrate-env`.
- **Migrar datos** (Neon→Hetzner, fotos→R2): Job `migrate-enqueue`, ver
  [backend/worker/README.md](../../backend/worker/README.md).

## Secrets que usa (GitHub Actions)

`KUBECONFIG`, `PROD_HOST`, `GHCR_PULL_USER`, `TOKEN_GITHUB_PACKAGES`,
`GHCR_PULL_TOKEN`, `NEXT_PUBLIC_ASSET_PREFIX`,
`NEXT_PUBLIC_OPENPANEL_CLIENT_ID`, `NEXT_PUBLIC_OPENPANEL_DASHBOARD_URL`,
`TURNSTILE_SITE_KEY`, `OPENPANEL_CLIENT_SECRET`, `ADMIN_PASSWORD`,
`CORS_ORIGINS`, `TURNSTILE_SECRET_KEY`, `NEON_DATABASE_URL`, `R2_ENDPOINT`,
`R2_STATIC_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_PUBLIC_BASE`, `HCLOUD_TOKEN`, `K3S_TOKEN`,
`JWT_SECRET`, `COOKIE_SECURE`, `APP_BASE_URL`,
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`.

> **`JWT_SECRET` y `COOKIE_SECURE` son obligatorios en producción.** El backend
> hace fail-fast (`process.exit`) si faltan — sin ellos el pod de API y el Job
> `migrate` crashean al arrancar. `SEED_ADMIN_*` siembra el superadmin inicial
> (idempotente). `SMTP_*` habilitan emails de invitación/reset; sin ellos
> degradan a devolver el enlace en la respuesta JSON.

Variables opcionales de repo:
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_R2_PUBLIC_BASE` y
`NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST` (default `terremotovenezuela.app`).

> **GHCR.** El push de imágenes NO usa el `GITHUB_TOKEN` del run (tras mover el
> repo a la org, no tiene write sobre el package de la org). Usa un PAT clásico:
> username `GHCR_PULL_USER`, password `TOKEN_GITHUB_PACKAGES` (write:packages).
> El secret de pull del clúster (`ghcr-pull`) usa `GHCR_PULL_USER` +
> `GHCR_PULL_TOKEN` (read:packages, sin expiración).

> **OpenPanel, admin, CORS y Turnstile.** `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` y
> `TURNSTILE_SITE_KEY` se inyectan en el bundle como build-args públicos.
> `OPENPANEL_CLIENT_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGINS` y
> `TURNSTILE_SECRET_KEY` son server-side: el workflow los **parchea** dentro del
> secret `app-env` (strategic merge, sin recrear; cada clave se omite si su
> secret de GH no está seteado) y los pods nuevos los leen al rolar.

## Smoke post-deploy y rollback

### Health checks

La API expone dos endpoints separados (`backend/src/server.ts`), que también
usan las probes de k8s (`infra/k8s/deployment.yaml`):

| Endpoint | Qué verifica | Probe | Fallo |
| --- | --- | --- | --- |
| `GET /api/healthz` | proceso vivo, **sin I/O** | `livenessProbe` | kubelet reinicia el pod |
| `GET /api/readyz` | conectividad a la DB (`select 1`, timeout ~2s) → 200/503 | `readinessProbe` + health-check del LB api | saca el pod de rotación (no lo reinicia) |

Separarlos evita que un blip de DB reinicie pods: liveness no toca la DB, así un
fallo de readiness solo **drena**, no entra en restart-loop.

### Smoke

Tras el roll, el workflow corre `scripts/smoke.sh` contra el **edge público**.
El script:

- Solo **GET** (no crea reportes ni datos).
- Mira **solo el status code** (`curl -o /dev/null`): nunca vuelca cuerpos, así
  no aterrizan datos de reportes ni secretos en los logs.
- Timeout por request (`SMOKE_TIMEOUT`, default 10s) + reintentos con backoff
  (`SMOKE_RETRIES`, default 5).
- Objetivos: web `/`, `/robots.txt`, `/sitemap.xml`; api `/api/healthz`,
  `/api/readyz`, `/api/reports`, `/api/missing/stats`.

Bases (overrideables por repo vars): `WEB_BASE`
(`https://${NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST}`) y `API_BASE`
(`NEXT_PUBLIC_API_URL`). Para correrlo a mano:

```bash
WEB_BASE=https://terremotovenezuela.app \
API_BASE=https://api.terremotovenezuela.app \
bash scripts/smoke.sh
```

### Rollback

> **Estado actual (informativo):** el smoke corre con `WEB_BASE`/`API_BASE`
> apuntando a los hostnames de **prod** (las `vars` de repo son únicas y traen
> valores de prod), así que NO debe disparar rollback automático en un deploy de
> staging — podría revertir por un blip ajeno. Por eso hoy el smoke es
> **solo `::warning::`**. Para activar el auto-rollback hay que separar
> `WEB_BASE`/`API_BASE` por entorno (GitHub Environments) y verificar el host
> real de la API de staging con un maintainer.

Cuando un roll falla (o se decide revertir a mano), la imagen se sirve desde
**tres Deployments** (`web`, `api`, `admin`), así que hay que rotar atrás **cada
uno**:

```bash
kubectl -n mapa rollout undo deployment/web
kubectl -n mapa rollout undo deployment/api
kubectl -n mapa rollout undo deployment/admin
```

(Si el `migrate-worker` también se actualizó: `kubectl -n mapa rollout undo
deployment/migrate-worker`.)
