# Remote state in Hetzner Object Storage (S3-compatible), bucket
# terremoto-vzla-bucket in hel1. The state file is where OpenTofu remembers what
# it created — it MUST persist between runs (the CI runner is ephemeral), hence a
# bucket and not local disk.
#
# Credentials are NOT hardcoded here. `tofu init` reads them from env vars set by
# the workflow from GitHub secrets:
#   AWS_ACCESS_KEY_ID     <- HETZNER_S3_ACCESS_KEY
#   AWS_SECRET_ACCESS_KEY <- HETZNER_S3_SECRET_KEY
# (the S3 backend uses the AWS_* names even on non-AWS S3.)
#
# The skip_* flags tell the AWS S3 backend "this isn't real AWS" so it doesn't
# try AWS-only validation/endpoints against Hetzner.
terraform {
  backend "s3" {
    bucket = "terremoto-vzla-bucket"
    key    = "tofu/mapa.tfstate"
    region = "hel1"

    endpoints = {
      s3 = "https://hel1.your-objectstorage.com"
    }

    use_path_style              = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}
