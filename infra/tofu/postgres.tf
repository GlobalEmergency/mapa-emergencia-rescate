# Postgres VPS (a PET — stateful, never recreated casually). cx23/4GB in hel1,
# private network only for app traffic, public IP kept for SSH admin. cloud-init
# installs Postgres + creates the mapa_app role and app/imported databases.
resource "hcloud_server" "postgres" {
  name         = "mapa-postgres"
  server_type  = var.server_type
  image        = var.image
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.mapa.id]
  firewall_ids = [hcloud_firewall.db.id]

  # Backups automáticos de Hetzner: snapshots diarios, retención 7 días, ~20% del
  # costo del server. Es la red de seguridad de la BD (personas desaparecidas /
  # hospitales): si el VPS muere o se corrompe, se restaura. Update in-place (no
  # recrea el server). Para PITR fino, complementar con pg_dump/WAL a R2 aparte.
  backups = true

  # Protección de borrado: bloquea eliminar el server por accidente (consola/API).
  # Complementa al prevent_destroy de Tofu (que solo cubre `tofu destroy`).
  delete_protection  = true
  rebuild_protection = true

  user_data = templatefile("${path.module}/cloud-init/postgres.yaml.tftpl", {
    postgres_user        = var.postgres_user
    postgres_password    = var.postgres_password
    postgres_app_db      = var.postgres_app_db
    postgres_imported_db = var.postgres_imported_db
  })

  network {
    network_id = hcloud_network.mapa.id
    ip         = var.postgres_private_ip
  }

  labels = { role = "postgres", managed_by = "opentofu" }

  # depends_on the subnet so the private network is ready before the server
  # attaches (avoids the documented attach concurrency issue).
  depends_on = [hcloud_network_subnet.mapa]

  lifecycle {
    # The database is a pet. Block `tofu destroy` from deleting it. To
    # intentionally tear it down, remove this block first.
    prevent_destroy = true
    # cloud-init only runs on first boot; don't replace the server if the
    # rendered user_data changes later.
    # ssh_keys: Hetzner aplica llaves SOLO al crear (sus docs). Cambiar la lista
    # en este server VIVO forzaría destruir+recrear -> perdería la DB. Se ignora;
    # las llaves del server vivo se gestionan vía authorized_keys, no aquí.
    ignore_changes = [user_data, ssh_keys]
  }
}

# Data volume for PGDATA durability (survives a server rebuild). Mounting/moving
# PGDATA onto it is a follow-up; created here so it exists from day one.
resource "hcloud_volume" "pgdata" {
  name      = "mapa-pgdata"
  size      = var.postgres_volume_size
  server_id = hcloud_server.postgres.id
  automount = true
  format    = "ext4"

  # El volumen guarda (o guardará) PGDATA: protégelo de borrado accidental igual
  # que el server. Update in-place. prevent_destroy cubre `tofu destroy`;
  # delete_protection cubre consola/API.
  delete_protection = true

  lifecycle {
    prevent_destroy = true
  }
}
