# Private network the stateful servers (and later the k3s cluster) share.
# 10.0.0.0/16 with a 10.0.1.0/24 subnet in eu-central (Helsinki).
resource "hcloud_network" "mapa" {
  name     = "mapa-net"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "mapa" {
  network_id   = hcloud_network.mapa.id
  type         = "cloud"
  network_zone = var.network_zone
  ip_range     = "10.0.1.0/24"
}
