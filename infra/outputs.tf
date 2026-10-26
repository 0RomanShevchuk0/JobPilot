output "external_ip" {
  description = "The server's public IP — point DuckDNS at it"
  value       = google_compute_address.jobpilot.address
}

output "s3_bucket" {
  description = "S3_BUCKET for .env"
  value       = google_storage_bucket.docs.name
}

output "s3_access_key_id" {
  description = "S3_ACCESS_KEY_ID for .env"
  value       = google_storage_hmac_key.storage.access_id
}

output "s3_secret_access_key" {
  description = "S3_SECRET_ACCESS_KEY for .env (terraform output -raw s3_secret_access_key)"
  value       = google_storage_hmac_key.storage.secret
  sensitive   = true
}
