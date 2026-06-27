# OpenTofu — stateful tier (pets)

Declaratively provisions the **persistent** infrastructure: private network,
firewall, SSH key, **Postgres VPS + data volume**, **Valkey VPS**. The k3s
cluster is NOT here (it's managed by hetzner-k3s + `../cluster.yaml`), and the
app deploy is NOT here (that's the GitHub Actions roll).

Why OpenTofu for these and not the `hcloud` CLI: state tracking gives idempotency
and a `plan` you can review before touching the database — and `prevent_destroy`
stops a bad run from deleting Postgres.

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
