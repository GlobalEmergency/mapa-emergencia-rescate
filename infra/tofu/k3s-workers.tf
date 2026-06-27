# Fixed baseline workers (min 2). The cluster-autoscaler manages ADDITIONAL
# workers on top of these via its own pool (see autoscaler.tf) — these are the
# always-on floor so the app always has >=2 nodes for zero-downtime rolls.
resource "hcloud_server" "k3s_worker" {
  count        = var.k3s_worker_count
  name         = "mapa-worker-${count.index + 1}"
  server_type  = var.server_type
  image        = var.image
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.mapa.id]
  firewall_ids = [hcloud_firewall.db.id]

  user_data = templatefile("${path.module}/cloud-init/k3s-agent.yaml.tftpl", {
    k3s_token         = var.k3s_token
    master_private_ip = var.k3s_master_private_ip
    flannel_iface     = "enp7s0"
  })

  network {
    network_id = hcloud_network.mapa.id
    # workers at 10.0.1.20, .21, ... (autoscaler nodes get DHCP elsewhere)
    ip = "10.0.1.${20 + count.index}"
  }

  labels = { role = "k3s-worker", managed_by = "opentofu" }

  depends_on = [hcloud_server.k3s_master]

  lifecycle {
    ignore_changes = [user_data]
  }
}
