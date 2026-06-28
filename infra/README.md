# Hetzner (k3s) deployment

Zero-downtime, immutable deployment of this Next.js app (UI + `/api` route
handlers) on Hetzner Cloud using **k3s**. The app is full-stack — one image,
no separate backend. That single image is deployed as **two app tiers** plus a
worker:

- **web** (`tier=web`) — serves UI/SSR (it also answers `/api`, same `server.js`).
  Routed by the public LB.
- **api** (`tier=api`) — serves the `/api` surface for external consumers
  (scrapers, integrations). Routed by a separate LB.
- **worker** — BullMQ consumer (sync/geocode/migrate-enqueue/photo jobs +
  schedulers). Its own Deployment.

Same image for web and api; splitting them into two Deployments + two Services
buys blast-radius isolation and independent scaling (one HPA per tier). See
`docs/rfcs/0004-autoscaling-y-split-web-api.md`.

## Topology

```
PUBLIC DOMAIN ──► Hetzner LB "mapa-lb"      (web tier)
API DOMAIN    ──► Hetzner LB "mapa-api-lb"   (api tier)
              │  auto-created by the Hetzner cloud-controller-manager
              │  from the type=LoadBalancer Services (k8s/service.yaml)
              ▼
        k3s pods  (web 3×, api 3×, worker — "cattle", immutable)
              │  health check: GET /api/readyz (DB ping)
              ▼  (private network, 10.0.0.0/16)
     Postgres VPS (pet)        Valkey VPS (pet)
     DBs: app + imported       sessions + pub/sub + BullMQ
```

| Piece | What | Where defined |
|---|---|---|
| Cluster (master + workers, private net, CCM/LB controller) | OpenTofu | `tofu/` (`k3s-master.tf`, `k3s-workers.tf`) |
| Postgres + Valkey VPS + firewall + network | OpenTofu | `tofu/postgres.tf`, `tofu/valkey.tf`, `tofu/firewall.tf`, `tofu/network.tf` |
| App pods (web + api) + rolling strategy + probes | Deployment ×2 | `k8s/deployment.yaml` |
| Worker pod (BullMQ) | Deployment | `k8s/worker-deployment.yaml` |
| Per-tier pod autoscaling (CPU 60%) | HPA ×2 | `k8s/hpa.yaml` |
| Ephemeral node autoscaling | Cluster Autoscaler | `k8s/cluster-autoscaler.yaml` |
| Public entry + Hetzner LBs + health check + TLS | Service `LoadBalancer` ×2 | `k8s/service.yaml` |
| Runtime env | Secret `app-env` | `k8s/secret.example.yaml` (template) |
| Gated schema migration (Drizzle migrator) | Job | `k8s/migrate-job.yaml` (runs `worker/migrate.ts`) |
| Build → push → roll | GitHub Actions | `../.github/workflows/deploy-hetzner.yml` |

Postgres and Valkey are **deliberately NOT in the cluster** — they're pets on
the same private network, provisioned by OpenTofu (`tofu/`). Don't put the
database in the cattle orchestrator.

## How zero-downtime works

1. CI builds an immutable image → pushes `ghcr.io/<repo>:<sha>` (+ a separate
   `-worker:<sha>` image).
2. `kubectl set image` points **both** the `web` and `api` Deployments at the
   new `:<sha>`.
3. k8s rolls each tier with **`maxUnavailable: 0` / `maxSurge: 1`** — a new pod
   is created and must pass the **`/api/readyz` readiness probe** (which pings
   the DB) *before* any old pod is removed. Always ≥1 pod serving per tier.
4. `kubectl rollout status` blocks the job until each roll is healthy, else fails.
5. Rollback: `kubectl -n mapa rollout undo deployment/web` and/or
   `deployment/api` (roll back the affected tier).

## Schema migrations

The schema is **never** created lazily at runtime (no `CREATE TABLE IF NOT
EXISTS`, no `ensureSchema()`). Source of truth is `db/schema.ts`
(27 tables); `db:generate` emits the `.sql` files in `db/migrations/`. Before
each roll, the gated **migrate Job** (`k8s/migrate-job.yaml`) runs the real
drizzle-orm migrator (`worker/migrate.ts`, `npm run migrate`), which applies
only pending migrations and records them in `__drizzle_migrations` (idempotent,
expand-contract). If the migration fails, the app does **not** roll.

## Database driver

`lib/db.ts` selects the driver explicitly via **`DB_DRIVER`**:

- `DB_DRIVER=tcp` → `node-postgres` (TCP) — used by the Hetzner Postgres VPS and
  local/compose.
- `DB_DRIVER=neon` (or unset) → the Neon serverless HTTP driver (the safe
  default for the current Vercel+Neon prod).

There is no host autodetection: a change in the URL never changes the driver by
surprise. The Hetzner app DB is plain TCP Postgres, so its `app-env` sets
`DB_DRIVER=tcp`.

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
   and `DB_DRIVER=tcp`.
4. **DNS** — point the public + api hostnames at the LBs (this is the only step
   still done by hand; everything else is in `tofu/`).
5. **Deploy**: merge a PR to `main` (auto-deploys to staging) or GitHub →
   Actions → *Deploy to Hetzner (k3s)* → Run workflow (choose `target`).

## Deploy workflow

`.github/workflows/deploy-hetzner.yml` triggers on **`pull_request: closed` to
`main`** (job-level `if`: `pull_request.merged == true && base.ref == 'main'`),
which auto-deploys to **staging**; plus **`workflow_dispatch`** with a single
input, `target` (`staging` | `prod`). A raw push / admin bypass to `main` does
**not** deploy. Provision / recreate-master / plan are run by hand
(tofu/kubectl), not from this workflow.

The Apply step renders both Services per target (TLS profile via `envsubst`),
applies `deployment.yaml` (web + api), `hpa.yaml`, `cluster-autoscaler.yaml`,
and the worker Deployment, runs the gated migrate Job, then rolls web + api.

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
`NEXT_PUBLIC_ASSET_PREFIX`). Fixes multi-pod version-skew.

## Not yet wired (next steps)

- DNS automation for the LB hostnames (still manual).
- Deploy ledger / codenames (port from Hermes) — optional.
