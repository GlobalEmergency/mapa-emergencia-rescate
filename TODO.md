# TODO — Hetzner deployment pending items

Tracks what's deferred or needs attention in the Hetzner/k3s deploy. The data
tier (Postgres + Valkey) and the k3s master + CCM are done via OpenTofu; these
are the remaining pieces.

## Cluster-autoscaler — configured (see RFC 0004 for the cutover runbook)

The infra is wired for **fully-ephemeral** workers: `infra/tofu/variables.tf`
sets `k3s_worker_count` default `0` (no fixed workers managed by tofu), and the
Hetzner cluster-autoscaler in `infra/k8s/cluster-autoscaler.yaml` owns ALL
workers via its pool `--nodes=2:5:cx23:hel1:mapa-pool` (min 2 floor, max 5
ceiling), creating/destroying VPS on demand. Zero-downtime deploys are imposed
by the manifests (`maxUnavailable:0` + `/api/readyz` readiness probe).

The cutover to this ephemeral model is the **target state** in the manifests and
tofu defaults; the runbook still has **manual steps** (provision, secrets,
KUBECONFIG) — see `docs/rfcs/0004-autoscaling-y-split-web-api.md` before flipping
prod, and verify the node-template/labels match the pool exactly.

## Other pending / verify-on-first-run

- [ ] **`flannel_iface`** — templates assume `enp7s0` (Hetzner private NIC on
      cx-line). Verify with `ip a` on a node; fix both k3s templates if different.
- [ ] **Save `KUBECONFIG` secret** after the first `provision` so everyday
      `deploy` runs can reach the cluster (provision fetches it fresh; deploy
      needs the secret). The provision run prints the reminder.
- [ ] **New GitHub secrets** required by the tofu-native cluster:
      `K3S_TOKEN` (openssl rand -hex 32) — upload via `upload-github-secrets.sh`.
- [ ] **DNS** — there are now TWO LoadBalancer Services (`infra/k8s/service.yaml`):
      `web` → LB `mapa-lb` (public domain) and `api` → LB `mapa-api-lb` (3rd
      parties, `api.` host). Point each A-record at its LB IP. Prod uses a
      Hetzner managed cert (DNS-only, no Cloudflare proxy); staging is
      Cloudflare-proxied with a cf-origin cert.
- [ ] **PGDATA on the volume** — `mapa-pgdata` (40GB) is attached but Postgres
      still writes to the boot disk. Move PGDATA onto the volume before real data.
- [ ] **Rotate secrets** — `HCLOUD_TOKEN` + Hetzner S3 keys were exposed during
      setup; regenerate and re-upload.
- [x] **Drizzle migrations** — done. `infra/db/schema.ts` is the source of
      truth; migrations `0000`..`0006` live in `infra/db/migrations/` and the
      gated migrate Job applies them via `worker/migrate.ts` (drizzle-orm
      `migrate()` at runtime, NOT the drizzle-kit CLI). Idempotent and
      re-runnable (tracked in `__drizzle_migrations`).
- [x] **Cloudflare R2 + CDN** for `/_next/static` — done. `next.config.ts`
      sets `assetPrefix` from `NEXT_PUBLIC_ASSET_PREFIX`; the deploy uploads
      static assets to R2 (see infra/README.md).
- [ ] **Tighten firewall** — SSH currently open to `0.0.0.0/0`; restrict to your
      admin IP for prod (infra/tofu/firewall.tf).
- [ ] **`lib/db.ts`** — `DB_DRIVER=tcp` pins Hetzner Postgres; confirm Vercel
      prod has `DB_DRIVER=neon` set (default is neon, so safe if unset).
