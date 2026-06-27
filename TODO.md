# TODO — Hetzner deployment pending items

Tracks what's deferred or needs attention in the Hetzner/k3s deploy. The data
tier (Postgres + Valkey) and the k3s cluster (master + 2 fixed workers + CCM)
are done via OpenTofu; these are the remaining pieces.

## Stage B — cluster-autoscaler (deferred)

The cluster runs **fixed** workers (min 2, no scale-up). Zero-downtime deploys
work without it (`maxUnavailable:0` on the Deployment). Autoscaling (2→4 under
load) is deferred so the cluster came up on a known-good base first.

**Plan (all via the k3s auto-deploy-manifest pattern, no new tooling):**
- Deploy the **kubernetes/autoscaler Hetzner provider** as an auto-deploy
  manifest dropped by the master's cloud-init (or applied post-provision).
- Config: `--nodes=2:4:cx23:hel1:mapa-autoscaled` (min 2, max 4).
- Give it `HCLOUD_TOKEN` (from the `hcloud` secret) and `HCLOUD_CLOUD_INIT` =
  base64 of `cloud-init/k3s-agent.yaml.tftpl` so scaled-up nodes join k3s
  identically to the static workers.
- Ref: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/hetzner/README.md
- ⚠️ This is the finicky part (node-template/labels must match exactly). Do it
  on the already-healthy cluster so it can be debugged in isolation.

## Other pending / verify-on-first-run

- [ ] **`flannel_iface`** — templates assume `enp7s0` (Hetzner private NIC on
      cx-line). Verify with `ip a` on a node; fix both k3s templates if different.
- [ ] **Save `KUBECONFIG` secret** after the first `provision` so everyday
      `deploy` runs can reach the cluster (provision fetches it fresh; deploy
      needs the secret). The provision run prints the reminder.
- [ ] **New GitHub secrets** required by the tofu-native cluster:
      `K3S_TOKEN` (openssl rand -hex 32) — upload via `upload-github-secrets.sh`.
- [ ] **DNS** — point `vzla-terremoto.dreamit.software` A-record at the Hetzner
      LB IP (created by the app's `Service: LoadBalancer`) so the managed
      Let's Encrypt cert issues. Use DNS-only (no Cloudflare proxy).
- [ ] **PGDATA on the volume** — `mapa-pgdata` (40GB) is attached but Postgres
      still writes to the boot disk. Move PGDATA onto the volume before real data.
- [ ] **Rotate secrets** — `HCLOUD_TOKEN` + Hetzner S3 keys were exposed during
      setup; regenerate and re-upload.
- [ ] **Drizzle migrations** — `infra/db/schema.ts` is descriptive only; wire
      `drizzle-kit migrate` into the gated migrate Job when schema becomes
      explicit (see infra/db/README.md).
- [ ] **Cloudflare R2 + CDN** for `/_next/static` (version-skew fix) once
      multi-pod traffic is live (see infra/README.md).
- [ ] **Tighten firewall** — SSH currently open to `0.0.0.0/0`; restrict to your
      admin IP for prod (infra/tofu/firewall.tf).
- [ ] **`lib/db.ts`** — `DB_DRIVER=tcp` pins Hetzner Postgres; confirm Vercel
      prod has `DB_DRIVER=neon` set (default is neon, so safe if unset).
