# Valkey VPS (a PET — sessions + pub/sub, persistence to disk). cx23 in hel1,
# private network, public IP for SSH admin. cloud-init sets the password,
# enables appendonly persistence, and binds it.
resource "hcloud_server" "valkey" {
  name         = "mapa-valkey"
  server_type  = var.server_type
  image        = var.image
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.mapa.id]
  firewall_ids = [hcloud_firewall.db.id]

  user_data = templatefile("${path.module}/cloud-init/valkey.yaml.tftpl", {
    valkey_password = var.valkey_password
  })

  network {
    network_id = hcloud_network.mapa.id
    ip         = var.valkey_private_ip
  }

  labels = { role = "valkey", managed_by = "opentofu" }

  depends_on = [hcloud_network_subnet.mapa]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [user_data]
  }
}
