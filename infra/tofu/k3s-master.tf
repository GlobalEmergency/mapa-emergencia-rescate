# k3s control-plane node. cloud-init installs k3s server (see template). Joins
# the private network at a fixed IP so workers/autoscaler can find it.
resource "hcloud_server" "k3s_master" {
  name         = "mapa-master"
  server_type  = var.server_type
  image        = var.image
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.mapa.id]
  firewall_ids = [hcloud_firewall.db.id]

  user_data = templatefile("${path.module}/cloud-init/k3s-master.yaml.tftpl", {
    k3s_token         = var.k3s_token
    master_private_ip = var.k3s_master_private_ip
    flannel_iface     = "enp7s0" # Hetzner private NIC on cx-line; verify on first boot
    hcloud_token      = var.hcloud_token
    network_name      = hcloud_network.mapa.name
  })

  network {
    network_id = hcloud_network.mapa.id
    ip         = var.k3s_master_private_ip
  }

  labels = { role = "k3s-master", managed_by = "opentofu" }

  depends_on = [hcloud_network_subnet.mapa]

  lifecycle {
    ignore_changes = [user_data] # cloud-init runs once; don't replace on edits
  }
}
