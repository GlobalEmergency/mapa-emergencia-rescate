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
- `k3s-workers.tf` + `cloud-init/k3s-agent.yaml.tftpl` — `k3s_worker_count`
  (default 2) agents that join the master over the private net. This is the
  always-on floor (min 2) for zero-downtime rolls.
- The GitHub Actions `provision` step scp's the kubeconfig off the master after
  boot and rewrites the API address to the master's public IP.

⚠️ **`flannel_iface = "enp7s0"`** in the k3s templates assumes the Hetzner
private NIC name on cx-line servers. Verify on first boot (`ip a` on a node); if
the private NIC differs, update both templates.

## ⛏️ Stage B — cluster-autoscaler (NOT done yet — see ../../TODO.md)

The cluster currently has **fixed** workers (min 2, no autoscaling). The
autoscaler (scale 2→4 under load) is intentionally deferred to a second step so
we bring the cluster up on a known-good base first. Plan: add the
kubernetes/autoscaler (hetzner provider) as one more auto-deploy manifest on the
master, with `--nodes=2:4:cx23:hel1:mapa-autoscaled` and the agent cloud-init as
its `HCLOUD_CLOUD_INIT`. Full notes in ../../TODO.md.

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

In CI the same is driven by the confirm-gated job in
`../../.github/workflows/deploy-hetzner.yml` (`provision_confirm=apply-infra`).

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
