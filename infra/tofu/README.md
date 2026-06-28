# OpenTofu — all Hetzner infra (one tool)

Declaratively provisions **everything** on Hetzner: private network, firewall,
SSH key, **Postgres VPS + volume**, **Valkey VPS**, and the **k3s cluster**
(1 master + N workers) with the **Hetzner CCM** wired in. hetzner-k3s was dropped
(too many opinionated, flaky validations) — the cluster is now plain
`hcloud_server` + cloud-init, same pattern as the DB servers.

The app deploy itself is NOT here (that's the GitHub Actions roll via kubectl).

Why OpenTofu over the `hcloud` CLI / hetzner-k3s: state tracking gives
idempotency and a `plan` you can review before touching the database;
`prevent_destroy` stops a bad run from deleting Postgres; and it's ONE tool with
no surprise validation steps.

## k3s cluster (tofu-native)

- `k3s-master.tf` + `cloud-init/k3s-master.yaml.tftpl` — control plane. Installs
  k3s with `--disable-cloud-controller` + `cloud-provider=external` (for the
  Hetzner CCM), `--disable traefik servicelb`, private-network flannel. Drops the
  **CCM** + `hcloud` secret as k3s **auto-deploy manifests**
  (`/var/lib/rancher/k3s/server/manifests/`) so LoadBalancer Services work.
  The CCM is a **raw Deployment** (the official `ccm-networks.yaml`), NOT a
  HelmChart: `cloud-provider=external` taints nodes `uninitialized:NoSchedule`
  until the CCM clears it, but the k3s HelmChart install-job can't tolerate that
  taint → deadlock (k3s#1807). The raw Deployment already tolerates it.
  Public IP is added as a TLS SAN at boot (config.yaml.d drop-in) so CI can reach
  the API over the public IP.
- **Recreating the cluster:** `ignore_changes=[user_data]` means editing the
  cloud-init won't replace running nodes. To force the master to re-run its
  cloud-init (e.g. after a template fix), `-replace` the master **and** the
  workers by hand (a fresh master gets a new cluster CA, so workers must rejoin).
  This is a manual tofu step — it is NOT wired into the deploy workflow. DB +
  Valkey are never touched.
- `k3s-workers.tf` + `cloud-init/k3s-agent.yaml.tftpl` — `k3s_worker_count`
  **fixed** agents that join the master over the private net. The default is
  **0**: in the fully-ephemeral model the fixed-worker resource creates nothing
  and the cluster-autoscaler owns ALL workers (see below). Set it `>0` only if
  you want a fixed base in addition to the CA pool (not recommended).
- Provisioning (scp the kubeconfig off the master after boot and rewrite the API
  address to the master's public IP) is done by hand, outside the deploy
  workflow — see RFC 0004 for the cutover runbook.

⚠️ **`flannel_iface = "enp7s0"`** in the k3s templates assumes the Hetzner
private NIC name on cx-line servers. Verify on first boot (`ip a` on a node); if
the private NIC differs, update both templates.

## cluster-autoscaler — ephemeral workers (configured)

The configured model is **fully ephemeral**: `k3s_worker_count` defaults to 0
and the cluster-autoscaler owns ALL workers. It lives in
`infra/k8s/cluster-autoscaler.yaml` (Hetzner CA, pool
`--nodes=2:5:cx23:hel1:mapa-pool` — min 2 floor, max 5 ceiling) and is applied
by the deploy workflow's "Apply manifests" step whenever the
`cluster-autoscaler-hcloud` secret exists. New VPS join with the SAME cloud-init
as the tofu agents (`cloud-init/k3s-agent.yaml.tftpl`: private-IP join + token +
`cloud-provider=external` for the CCM), injected via the CA's
`HCLOUD_CLUSTER_CONFIG`.

This is the target state wired into the manifests and tofu defaults; the cutover
runbook still has manual provisioning steps — see RFC 0004
(`docs/rfcs/0004-autoscaling-y-split-web-api.md`).

## Files

| File | What |
|---|---|
| `versions.tf` | hcloud provider |
| `backend.tf` | remote state in Hetzner Object Storage (`terremoto-vzla-bucket`, hel1) |
| `variables.tf` | inputs (token, ssh key, db/valkey creds, location, type) |
| `network.tf` / `firewall.tf` / `ssh.tf` | private net + subnet, SSH-only firewall, key |
| `postgres.tf` | Postgres VPS (cx23) + cloud-init + data volume, `prevent_destroy` |
| `valkey.tf` | Valkey VPS (cx23) + cloud-init, `prevent_destroy` |
| `cloud-init/*.tftpl` | templated cloud-init (creds injected at apply) |
| `outputs.tf` | private IPs + the DATABASE_URL/VALKEY_URL to paste as secrets |

## State backend (one-time, already done)

A private Hetzner Object Storage bucket `terremoto-vzla-bucket` (hel1) holds the
state. `tofu init` authenticates with S3 creds from env:

```
export AWS_ACCESS_KEY_ID=$HETZNER_S3_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=$HETZNER_S3_SECRET_KEY
```

## Run (locally)

```bash
cd infra/tofu
export AWS_ACCESS_KEY_ID=...        # Hetzner S3 access key
export AWS_SECRET_ACCESS_KEY=...    # Hetzner S3 secret key
export TF_VAR_hcloud_token=...      # Hetzner API token (R/W)
export TF_VAR_ssh_public_key="$(cat ~/.ssh/mapa_k3s.pub)"
export TF_VAR_postgres_user=mapa_app
export TF_VAR_postgres_password=...
export TF_VAR_valkey_password=...

tofu init
tofu plan
tofu apply
tofu output -raw database_url   # paste into the DATABASE_URL GitHub secret
```

This `tofu apply` is run **by hand** — it is not part of CI. The deploy workflow
(`../../.github/workflows/deploy-hetzner.yml`) does app-only rolls (build → push
to GHCR → apply k8s manifests → gated migrate → roll) and has a single
`workflow_dispatch` input, `target` (staging | prod); it has no provision /
recreate-master / apply-infra inputs or steps. Infra provisioning stays outside
the workflow — see RFC 0004 for the runbook.

## ⚠️ Before first apply — clear leftovers from the earlier CLI bootstrap

Earlier `hcloud` CLI runs may have already created `mapa-key`, `mapa-net`,
`mapa-db-fw`. OpenTofu doesn't know about them and will error on "already
exists". Either delete them in the Hetzner Console first (no servers depend on
them yet), or `tofu import` them. Deleting is simpler.

## Safety

- `prevent_destroy = true` on the Postgres server, its volume, and Valkey — a
  `tofu destroy` will refuse. Remove the block intentionally to tear down.
- `ignore_changes = [user_data]` — cloud-init runs once on first boot; editing
  the template later won't trigger a server replacement (which would wipe data).
