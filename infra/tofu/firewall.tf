# Public-ingress firewall for the DB/Valkey servers. Only SSH is allowed from
# the public internet (tighten source_ips to your admin IP for real prod).
#
# IMPORTANT — do NOT add 5432/6379 rules here. Hetzner Cloud firewalls filter
# ONLY public internet traffic; private-network (10.0.0.0/16) traffic BYPASSES
# the firewall entirely (per Hetzner's Firewall FAQ — private nets are treated as
# "secure"). So:
#   - public -> 5432/6379: blocked simply by NOT opening them here. ✅
#   - private -> 5432/6379: always allowed (firewall doesn't touch private). ✅
# A `source_ips` rule only governs PUBLIC ingress, so there's no "allow from VPC"
# rule to write. DB-level access is further locked by Postgres pg_hba.conf
# (host all mapa_app 10.0.0.0/16 scram-sha-256) set in cloud-init.
resource "hcloud_firewall" "db" {
  name = "mapa-db-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}
