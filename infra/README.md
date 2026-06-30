# Hetzner (k3s) deployment

Zero-downtime, immutable deployment on Hetzner Cloud using **k3s**. The app is a
simple monorepo with **separate frontend (Next.js) and backend (Express)
images** — the frontend does NOT serve `/api`. It deploys as **three app tiers**
plus a worker:

- **web** (`tier=web`) — image `*-frontend:<sha>`, Next.js UI/SSR on `:3000`. It
  does NOT access the DB or serve `/api`; the browser calls the backend via
  `NEXT_PUBLIC_API_URL`. Routed by the public LB.
- **api** (`tier=api`) — image `*-backend:<sha>`, Express serving the whole
  `/api` surface on `:8080` (frontend SSR + external consumers). Routed by a
  separate LB.
- **admin** (`tier=admin`) — image `*-admin:<sha>`, standalone Next.js admin
  panel on `:3000`. Its BFF (`app/api/*`) forwards to the backend over the
  cluster's private network. Routed by a third LB. See
  `docs/rfcs/0005-panel-admin-standalone.md`.
- **worker** — BullMQ consumer (sync/geocode/migrate-enqueue/photo jobs +
  schedulers), reuses the backend image. Its own Deployment.

Splitting them into separate Deployments + Services buys blast-radius isolation
and independent scaling (one HPA per tier). See
`docs/rfcs/0004-autoscaling-y-split-web-api.md` and
`docs/rfcs/0005-panel-admin-standalone.md`.

## Topology

```
PUBLIC DOMAIN ──► Hetzner LB "mapa-lb"       (web tier,   frontend image)
API DOMAIN    ──► Hetzner LB "mapa-api-lb"   (api tier,   backend image)
ADMIN DOMAIN  ──► Hetzner LB "admin-lb"      (admin tier, admin image)
              │  auto-created by the Hetzner cloud-controller-manager
              │  from the type=LoadBalancer Services (k8s/service.yaml)
              ▼
        k3s pods  (web 3×, api 3×, admin 2×, worker — "cattle", immutable)
              │  health: web TCP :3000 (UI, sin /readyz); api GET /api/readyz (DB ping); admin GET /api/health (BFF)
              ▼  (private network, 10.0.0.0/16)
     Postgres VPS (pet)        Valkey VPS (pet)
     DBs: app + imported       sessions + pub/sub + BullMQ
```

| Piece | What | Where defined |
|---|---|---|
| Cluster (master + workers, private net, CCM/LB controller) | OpenTofu | `tofu/` (`k3s-master.tf`, `k3s-workers.tf`) |
| Postgres + Valkey VPS + firewall + network | OpenTofu | `tofu/postgres.tf`, `tofu/valkey.tf`, `tofu/firewall.tf`, `tofu/network.tf` |
| App pods (web + api + admin) + rolling strategy + probes | Deployment ×3 | `k8s/deployment.yaml` |
| Worker pod (BullMQ) | Deployment | `k8s/worker-deployment.yaml` |
| Per-tier pod autoscaling (CPU 60%) | HPA ×3 | `k8s/hpa.yaml` |
| Ephemeral node autoscaling | Cluster Autoscaler | `k8s/cluster-autoscaler.yaml` |
| Public entry + Hetzner LBs + health check + TLS | Service `LoadBalancer` ×3 | `k8s/service.yaml` |
| Runtime env | Secret `app-env` | `k8s/secret.example.yaml` (template) |
| Gated schema migration (Drizzle migrator) | Job | `k8s/migrate-job.yaml` (runs `worker/migrate.ts`) |
| Build → push → roll | GitHub Actions | `../.github/workflows/deploy-hetzner.yml` |

Postgres and Valkey are **deliberately NOT in the cluster** — they're pets on
the same private network, provisioned by OpenTofu (`tofu/`). Don't put the
database in the cattle orchestrator.

## How zero-downtime works

1. CI builds immutable images → pushes `ghcr.io/<repo>-frontend:<sha>`,
   `-backend:<sha>` and `-admin:<sha>` (the worker reuses the backend image).
2. `kubectl set image` points the `web`, `api` and `admin` Deployments at the
   new `:<sha>`.
3. k8s rolls each tier with **`maxUnavailable: 0` / `maxSurge: 1`** — a new pod
   is created and must pass its readiness probe (web: TCP `:3000` — pura UI, sin
   `/api/readyz`; api: `/api/readyz`, que hace ping a la DB; admin: `/api/health`)
   *before* any old pod is removed. Always
   ≥1 pod serving per tier.
4. `kubectl rollout status` blocks the job until each roll is healthy, else fails.
5. Rollback: `kubectl -n mapa rollout undo deployment/<web|api|admin>` (roll back
   the affected tier).

## Schema migrations

The schema is **never** created lazily at runtime (no `CREATE TABLE IF NOT
EXISTS`, no `ensureSchema()`). Source of truth is `db/schema.ts`
(38 tables, including the RBAC/auth tier — see `db/README.md`); `db:generate`
emits the `.sql` files in `db/migrations/`. Before
each roll, the gated **migrate Job** (`k8s/migrate-job.yaml`) runs the real
drizzle-orm migrator (`worker/migrate.ts`, `npm run migrate`), which applies
only pending migrations and records them in `__drizzle_migrations` (idempotent,
expand-contract). If the migration fails, the app does **not** roll.

## Database driver

The backend (`backend/src/db`) connects to the Hetzner Postgres VPS over plain
TCP with `node-postgres` (`pg`) via `DATABASE_URL`. Neon is only the **legacy
source** for one-time backfills (`NEON_DATABASE_URL`, used by
`backend/worker/`), not the live app DB.

## Ephemeral nodes (configured model)

The configured/target model is **fully ephemeral workers**: `tofu`
`k3s_worker_count` defaults to `0`, and the **Cluster Autoscaler**
(`k8s/cluster-autoscaler.yaml`, Hetzner CA, pool `--nodes=2:5`) owns the worker
pool — it boots VPS on demand when pods are Pending and destroys empty ones on
scale-down. HPA (pods) and CA (nodes) work together. This is wired in the
manifests and tofu defaults; the cutover runbook still has manual steps — see
`docs/rfcs/0004-autoscaling-y-split-web-api.md`.

## First-time setup

1. **Hetzner**: create a project, a **Read & Write API token**, and an SSH
   keypair (`~/.ssh/mapa_k3s` / `.pub` — paths referenced in `tofu/`).
2. **Provision with OpenTofu** (`infra/tofu/`): private network, firewall,
   Postgres + Valkey VPS, and the k3s cluster (master + worker floor). Create the
   `app` and `imported` databases on Postgres. See `tofu/README.md`.
3. **App Secret** — create `app-env` from real values (see
   `k8s/secret.example.yaml`); `DATABASE_URL` points at the **private** Postgres
   (plain TCP `node-postgres`).
4. **DNS** — point the public + api + admin hostnames at their LBs (this is the
   only step still done by hand; everything else is in `tofu/`).
5. **Deploy**: merge a PR to `main` (auto-deploys to staging) or GitHub →
   Actions → *Deploy to Hetzner (k3s)* → Run workflow (choose `target`).

## Deploy workflow

`.github/workflows/deploy-hetzner.yml` triggers on **`pull_request: closed` to
`main`** (job-level `if`: `pull_request.merged == true && base.ref == 'main'`),
which auto-deploys to **staging**; plus **`workflow_dispatch`** with a single
input, `target` (`staging` | `prod`). A raw push / admin bypass to `main` does
**not** deploy. Provision / recreate-master / plan are run by hand
(tofu/kubectl), not from this workflow.

The Apply step renders all three Services per target (TLS profile via
`envsubst`), applies `deployment.yaml` (web + api + admin), `hpa.yaml`,
`cluster-autoscaler.yaml`, and the worker Deployment, runs the gated migrate Job,
then rolls web + api + admin. CI also has a `verify-admin` gate (lint + typecheck
+ test of `admin/`).

## TLS

`k8s/service.yaml` already terminates TLS on port **443** per target (injected
via the `WEB_TLS_ANNOTATIONS` / `API_TLS_ANNOTATIONS` placeholders):

- `target=staging` → TLS at Cloudflare (proxied); the LB serves the Cloudflare
  Origin cert (`cf-origin`).
- `target=prod` → TLS at the LB with a Hetzner **managed** Let's Encrypt cert on
  `:443`.

## GitHub secrets (Settings → Environments)

| Secret | Purpose |
|---|---|
| `HCLOUD_TOKEN` | Hetzner API (LB, cluster-autoscaler node ops) |
| `KUBECONFIG` | base64 of the cluster kubeconfig (`base64 -w0 kubeconfig`) |
| `K3S_TOKEN` | join secret for autoscaled nodes |
| `GHCR_PULL_USER` | GHCR username (token owner) for push + pull |
| `TOKEN_GITHUB_PACKAGES` | PAT (write:packages) — push images to GHCR |
| `GHCR_PULL_TOKEN` | PAT (read:packages, no expiry) — cluster `ghcr-pull` secret |
| `PROD_HOST` | public hostname for the prod managed cert |
| `NEON_DATABASE_URL`, `R2_*` | migrate-env + R2 static upload (optional) |

GHCR push/pull uses **PAT secrets**, not the built-in `GITHUB_TOKEN`: after the
repo moved to the org, the run's `GITHUB_TOKEN` lacks write access to the org
package.

## R2 + CDN for `/_next/static`

Wired. The deploy uploads the freshly-built `/_next/static` to R2 before rolling
(push-then-roll, additive, content-hashed + immutable), and the app serves them
from the CDN via `assetPrefix` (`next.config.ts`, from
`NEXT_PUBLIC_ASSET_PREFIX`). Fixes multi-pod version-skew. The admin panel's
static assets go to the same bucket under a separate `/admin` prefix (its chunks
never mix with the frontend's).

## Not yet wired (next steps)

- DNS automation for the LB hostnames (still manual).
- Deploy ledger / codenames (port from Hermes) — optional.
