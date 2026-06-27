# Private IPs are fixed (set in variables), so the connection strings are
# predictable. These outputs print them after apply so you can paste the URLs
# into GitHub secrets (DATABASE_URL / IMPORTED_DATABASE_URL / VALKEY_URL).
# Marked sensitive where they embed credentials.

output "postgres_private_ip" {
  value = var.postgres_private_ip
}

output "valkey_private_ip" {
  value = var.valkey_private_ip
}

output "postgres_public_ip" {
  description = "For SSH admin."
  value       = hcloud_server.postgres.ipv4_address
}

output "valkey_public_ip" {
  description = "For SSH admin."
  value       = hcloud_server.valkey.ipv4_address
}

output "database_url" {
  description = "Set as the DATABASE_URL secret."
  sensitive   = true
  value       = "postgres://${var.postgres_user}:${var.postgres_password}@${var.postgres_private_ip}:5432/${var.postgres_app_db}"
}

output "imported_database_url" {
  description = "Set as the IMPORTED_DATABASE_URL secret."
  sensitive   = true
  value       = "postgres://${var.postgres_user}:${var.postgres_password}@${var.postgres_private_ip}:5432/${var.postgres_imported_db}"
}

output "valkey_url" {
  description = "Set as the VALKEY_URL secret."
  sensitive   = true
  value       = "redis://:${var.valkey_password}@${var.valkey_private_ip}:6379"
}

# The network id of the shared private network.
output "network_id" {
  value = hcloud_network.mapa.id
}

# k3s master — the workflow scp's the kubeconfig from here after boot, rewrites
# the server address to the master's IP, and uses it for the app deploy.
output "k3s_master_public_ip" {
  value = hcloud_server.k3s_master.ipv4_address
}
output "k3s_master_private_ip" {
  value = var.k3s_master_private_ip
}
