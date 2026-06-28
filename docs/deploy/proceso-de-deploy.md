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

Antes de construir/desplegar corre el job **`verify`** (tsc app + worker, eslint,
generación de la spec OpenAPI). El job `deploy` tiene `needs: verify`, así que un
build roto NUNCA llega al clúster.

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

1. **Build + push** de dos imágenes a GHCR, tag `:<sha>` y `:latest`:
   - `app` (Next.js, target `runtime`),
   - `worker` (BullMQ + migrador, target `worker`).
2. **kubectl** desde el secret `KUBECONFIG` (base64).
3. **migrate-env** secret (NEON + R2) — re-aplicado por si cambió.
4. **Sube `/_next/static` a R2** (push-then-roll, aditivo, nunca `--delete`):
   arregla el version-skew multi-pod sirviendo los assets content-hashed desde
   el CDN.
5. **Aplica manifests**: renderiza con `envsubst` los **dos `Service`** (web y
   api) inyectando el perfil TLS por target (`WEB_TLS_ANNOTATIONS` /
   `API_TLS_ANNOTATIONS`; api replica el perfil de web). Luego aplica:
   - `deployment.yaml` (Deployments `web` + `api`, mismo image),
   - `hpa.yaml` (HPA por tier),
   - `cluster-autoscaler.yaml` (si existe su secret),
   - `worker-deployment` (si hay `migrate-env`).
6. **Migración de esquema gateada** (Job `migrate-<sha>`): aplica las
   migraciones Drizzle pendientes ANTES del roll. Si falla, **la app NO rota**.
   Ver [migraciones-de-base-de-datos.md](migraciones-de-base-de-datos.md).
7. **Roll zero-downtime**: `kubectl set image` + `rollout status` sobre
   `deployment/web` y `deployment/api` (bloquea hasta que los pods nuevos pasen
   `/api/readyz` y los viejos drenen). El `migrate-worker` se rola aparte.

## `target`: staging vs prod (perfil TLS del LB)

Hay **dos LoadBalancer**: `mapa-lb` (web, dominio público) y `mapa-api-lb`
(api, terceros). El perfil TLS se inyecta por target con `envsubst` y la api
**replica el perfil de web**.

| target | TLS | DNS |
| --- | --- | --- |
| `staging` | El LB sirve el **cert Origin de Cloudflare** (`cf-origin-dreamit`); Cloudflare en "Full" | `vzla-terremoto.dreamit.software` (Cloudflare proxied) |
| `prod` | El LB emite un **cert gestionado de Hetzner** para `PROD_HOST` | `terremotovenezuela.app` (ver [dominio-y-dns.md](dominio-y-dns.md)) |

Ver detalles de DNS/TLS en [dominio-y-dns.md](dominio-y-dns.md).

## Qué NO hace este workflow (a propósito)

Tareas de infraestructura raras/peligrosas se sacaron del deploy. Cuando las
necesites, córrelas **manualmente**:

- **Provisionar / recrear cluster** (`tofu apply`, kubeconfig, secrets
  iniciales): desde `infra/tofu/` con OpenTofu. Tras provisionar, guarda el
  secret `KUBECONFIG` y crea `app-env` (DATABASE_URL/VALKEY_URL/R2_*) y
  `migrate-env`.
- **Migrar datos** (Neon→Hetzner, fotos→R2): Job `migrate-enqueue`, ver
  [worker/README.md](../../worker/README.md).

## Secrets que usa (GitHub Actions)

`KUBECONFIG`, `PROD_HOST`, `GHCR_PULL_USER`, `TOKEN_GITHUB_PACKAGES`,
`GHCR_PULL_TOKEN`, `NEXT_PUBLIC_ASSET_PREFIX`,
`NEXT_PUBLIC_OPENPANEL_CLIENT_ID`, `NEXT_PUBLIC_OPENPANEL_DASHBOARD_URL`,
`OPENPANEL_CLIENT_SECRET`, `ADMIN_PASSWORD`, `NEON_DATABASE_URL`, `R2_ENDPOINT`,
`R2_STATIC_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE`,
`HCLOUD_TOKEN`, `K3S_TOKEN`.

Variable opcional de repo:
`NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST` (default `terremotovenezuela.app`).

> **GHCR.** El push de imágenes NO usa el `GITHUB_TOKEN` del run (tras mover el
> repo a la org, no tiene write sobre el package de la org). Usa un PAT clásico:
> username `GHCR_PULL_USER`, password `TOKEN_GITHUB_PACKAGES` (write:packages).
> El secret de pull del clúster (`ghcr-pull`) usa `GHCR_PULL_USER` +
> `GHCR_PULL_TOKEN` (read:packages, sin expiración).

> **OpenPanel + admin (parche a `app-env`).** `NEXT_PUBLIC_OPENPANEL_CLIENT_ID`
> se inyecta en el bundle como build-arg (es público; viaja al navegador).
> `OPENPANEL_CLIENT_SECRET` (proxy server-side) y `ADMIN_PASSWORD` (panel admin)
> son server-side: el workflow los **parchea** dentro del secret `app-env`
> (strategic merge, sin recrear; cada clave se omite si su secret de GH no está
> seteado) y los pods nuevos los leen al rolar.

## Rollback

Si el roll falla, el workflow lo dice. El image se sirve desde **dos
Deployments** (`web` y `api`), así que para revertir a la versión anterior hay
que rotar atrás **cada uno**:

```bash
kubectl -n mapa rollout undo deployment/web
kubectl -n mapa rollout undo deployment/api
```

(Si el `migrate-worker` también se actualizó: `kubectl -n mapa rollout undo
deployment/migrate-worker`.)
