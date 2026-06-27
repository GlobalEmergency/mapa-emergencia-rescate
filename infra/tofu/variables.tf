variable "hcloud_token" {
  description = "Hetzner Cloud API token (Read & Write). From TF_VAR_hcloud_token."
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key registered on the servers (mapa_k3s.pub)."
  type        = string
}

variable "location" {
  description = "Hetzner location for the stateful servers."
  type        = string
  default     = "hel1"
}

variable "network_zone" {
  description = "Network zone for the private subnet (Helsinki is eu-central)."
  type        = string
  default     = "eu-central"
}

variable "server_type" {
  description = "Server type for Postgres/Valkey (cx23 = 2 vCPU / 4GB)."
  type        = string
  default     = "cx23"
}

variable "image" {
  description = "OS image for the stateful servers."
  type        = string
  default     = "debian-12"
}

# --- Postgres ---
variable "postgres_user" {
  type      = string
  sensitive = true
}
variable "postgres_password" {
  type      = string
  sensitive = true
}
variable "postgres_app_db" {
  type    = string
  default = "app"
}
variable "postgres_imported_db" {
  type    = string
  default = "imported"
}
variable "postgres_volume_size" {
  description = "Data volume size (GB) for Postgres."
  type        = number
  default     = 40
}

# --- Valkey ---
variable "valkey_password" {
  type      = string
  sensitive = true
}

# Static private IPs (so DATABASE_URL/VALKEY_URL are stable and predictable).
variable "postgres_private_ip" {
  type    = string
  default = "10.0.1.10"
}
variable "valkey_private_ip" {
  type    = string
  default = "10.0.1.11"
}

# --- k3s cluster ---
variable "k3s_token" {
  description = "Shared secret that joins agents to the server. From TF_VAR_k3s_token (openssl rand -hex 32)."
  type        = string
  sensitive   = true
}
variable "k3s_master_private_ip" {
  type    = string
  default = "10.0.1.5"
}
variable "k3s_worker_count" {
  description = "Fixed/baseline workers (the autoscaler manages 2..max on top via its own pool)."
  type        = number
  default     = 2
}
