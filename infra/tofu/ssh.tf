# The SSH public key placed on every server. The matching private key stays on
# your machine / in the SSH_PRIVATE_KEY GitHub secret — never here.
resource "hcloud_ssh_key" "mapa" {
  name       = "mapa-key"
  public_key = var.ssh_public_key
}
