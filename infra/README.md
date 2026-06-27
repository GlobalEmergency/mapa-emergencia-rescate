# Hetzner (k3s) deployment

Zero-downtime, immutable deployment of this Next.js app (UI + `/api` route
handlers) on Hetzner Cloud using **k3s**. The app is full-stack — one image,
one Deployment; there is no separate backend.

## Topology

```
DOMAIN ──► Hetzner Load Balancer (TLS, managed Let's Encrypt)
              │  auto-created by the Hetzner cloud-controller-manager
              │  from the Service type=LoadBalancer (k8s/service.yaml)
              ▼
        k3s app pods  (2× replicas, "cattle", immutable)
              │  health check: GET /api/readyz (DB ping)
              ▼  (private network, 10.0.0.0/16)
     Postgres VPS (pet)        Valkey VPS (pet)
     4GB, DBs: app + imported  sessions + pub/sub
```

| Piece | What | Where defined |
|---|---|---|
| Cluster (master + workers, private net, LB controller, autoscaler) | k3s | `cluster.yaml` (hetzner-k3s) |
| App pods + rolling strategy + probes | Deployment | `k8s/deployment.yaml` |
| Public entry + Hetzner LB + health check | Service `LoadBalancer` | `k8s/service.yaml` |
| Runtime env | Secret `app-env` | `k8s/secret.example.yaml` (template) |
| Gated migrate step | Job (placeholder) | `k8s/migrate-job.yaml` |
| Build → push → roll | GitHub Actions | `../.github/workflows/deploy-hetzner.yml` |

Postgres and Valkey are **deliberately NOT in the cluster** — they're pets on
the same private network (provision via OpenTofu or by hand). Don't put the
database in the cattle orchestrator.

## How zero-downtime works

1. CI builds an immutable image → pushes `ghcr.io/<repo>:<sha>`.
2. `kubectl set image` points the Deployment at the new `:<sha>`.
3. k8s rolls with **`maxUnavailable: 0` / `maxSurge: 1`** — a new pod is created
   and must pass the **`/api/readyz` readiness probe** (which pings the DB)
   *before* any old pod is removed. Always ≥1 pod serving.
4. `kubectl rollout status` blocks the job until the roll is healthy, else fails.
5. Rollback: `kubectl -n mapa rollout undo deployment/app`.

## First-time setup

1. **Hetzner**: create a project, a **Read & Write API token**, and an SSH
   keypair (`~/.ssh/mapa_k3s` / `.pub` — paths referenced in `cluster.yaml`).
2. **Create the cluster** (locally, or via the workflow with
   `ensure_cluster=true`):
   ```bash
   HCLOUD_TOKEN=xxxx hetzner-k3s create --config infra/cluster.yaml
   export KUBECONFIG=$PWD/kubeconfig
   ```
3. **Postgres + Valkey VPS** on the same private network; create the `app` and
   `imported` databases on Postgres (one 4GB instance, two databases).
4. **App Secret** — create `app-env` from real values (see
   `k8s/secret.example.yaml`); `DATABASE_URL` points at the **private** Postgres.
5. **Deploy**: GitHub → Actions → *Deploy to Hetzner (k3s)* → Run workflow.

## GitHub secrets (Settings → Environments → production)

| Secret | Purpose |
|---|---|
| `HCLOUD_TOKEN` | Hetzner API (cluster create, LB) |
| `KUBECONFIG` | base64 of the cluster kubeconfig (`base64 -w0 kubeconfig`) |
| `SSH_PRIVATE_KEY` | node SSH (cluster ops) |

`GITHUB_TOKEN` (built-in) pushes images to GHCR — no secret needed.

## ⚠️ Open item: Neon vs plain Postgres

`lib/db.ts` uses the **Neon serverless HTTP driver** in production and only
falls back to the `pg` TCP driver for `localhost`. A Hetzner Postgres VPS is
plain TCP Postgres, **not** Neon — the `neon()` HTTP path will not connect to
it. Before this runs against a real Hetzner DB, `lib/db.ts` must use the `pg`
TCP path for the (non-Neon, non-localhost) production URL. Tracked separately;
the deploy plumbing above is independent of it.

## Not yet wired (next steps)

- `lib/db.ts` pg-TCP path for Hetzner Postgres (above).
- Managed TLS annotations in `k8s/service.yaml` (need the real domain).
- Cloudflare R2 + CDN for `/_next/static` (version-skew fix) once multi-pod
  traffic is live.
- OpenTofu module for the Postgres/Valkey VPS + firewall + DNS.
- Deploy ledger / codenames (port from Hermes) — optional.
