# Proceso de deploy

El despliegue es **deploy-only** y **solo desde `main`**.

Workflow: `.github/workflows/deploy-hetzner.yml` — **Deploy to Hetzner (k3s)**.

## Triggers

| Evento | Resultado |
| --- | --- |
| **push / merge a `main`** | auto-deploy a **staging** (CD) |
| **workflow_dispatch (manual)** | deploy al `target` elegido (`staging` o `prod`) |
| push a otra rama | nada (el guard de job lo salta) |

> **prod nunca es automático.** Solo sale de un `workflow_dispatch` manual con
> `target=prod`. Un merge a main jamás despliega prod.

## Cómo desplegar a prod (manual)

1. El cambio debe estar en **`main`**.
2. GitHub → Actions → **Deploy to Hetzner (k3s)** → **Run workflow**.
3. Elige **`target` = prod** → Run.

## Gate de verificación

Antes de construir/desplegar corre el job **`verify`** (tsc app + worker, eslint,
generación de la spec OpenAPI). El job `deploy` tiene `needs: verify`, así que un
build roto NUNCA llega al clúster.

> **Solo corre desde `main`.** Ambos jobs tienen
> `if: github.ref == 'refs/heads/main'` y el `push` está acotado a
> `branches: [main]`. El filtro `branches:` de `workflow_dispatch` NO se respeta
> en GitHub Actions, por eso el guard real es a nivel de job. Refuérzalo con
> branch protection en `main`.

## Qué hace, paso a paso

1. **Build + push** de dos imágenes a GHCR, tag `:<sha>` y `:latest`:
   - `app` (Next.js, target `runtime`),
   - `worker` (BullMQ + migrador, target `worker`).
2. **kubectl** desde el secret `KUBECONFIG` (base64).
3. **migrate-env** secret (NEON + R2) — re-aplicado por si cambió.
4. **Sube `/_next/static` a R2** (push-then-roll, aditivo, nunca `--delete`):
   arregla el version-skew multi-pod sirviendo los assets content-hashed desde
   el CDN.
5. **Aplica manifests**: renderiza el `Service` según `target` (perfil TLS) con
   `envsubst`, aplica `deployment.yaml` y el `worker-deployment` (si hay
   migrate-env).
6. **Migración de esquema gateada** (Job `migrate-<sha>`): aplica las
   migraciones Drizzle pendientes ANTES del roll. Si falla, **la app NO rota**.
   Ver [migraciones-de-base-de-datos.md](migraciones-de-base-de-datos.md).
7. **Roll zero-downtime**: `kubectl set image` + `rollout status` (bloquea hasta
   que los pods nuevos pasen `/api/readyz` y los viejos drenen).

## `target`: staging vs prod (perfil TLS del LB)

| target | TLS | DNS |
| --- | --- | --- |
| `staging` | El LB sirve el **cert Origin de Cloudflare** (`cf-origin-dreamit`); Cloudflare en "Full" | `vzla-terremoto.dreamit.software` (Cloudflare proxied) |
| `prod` | El LB emite un **cert gestionado Let's Encrypt** para `PROD_HOST` | `terremotovenezuela.app` (ver [dominio-y-dns.md](dominio-y-dns.md)) |

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

`KUBECONFIG`, `PROD_HOST`, `NEXT_PUBLIC_ASSET_PREFIX`,
`NEXT_PUBLIC_OPENPANEL_CLIENT_ID`, `OPENPANEL_CLIENT_SECRET`,
`NEON_DATABASE_URL`, `R2_ENDPOINT`, `R2_STATIC_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE`, `GITHUB_TOKEN` (automático).

> **OpenPanel.** `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` se inyecta en el bundle como
> build-arg (es público; viaja al navegador). `OPENPANEL_CLIENT_SECRET` es
> server-side: el workflow lo **parchea** dentro del secret `app-env` (merge,
> sin recrear) y los pods nuevos lo leen al rolar. Variable opcional de repo:
> `NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST` (default `terremotovenezuela.app`).

## Rollback

Si el roll falla, el workflow lo dice. Para revertir a la versión anterior:

```bash
kubectl -n mapa rollout undo deployment/app
```
