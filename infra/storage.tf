# Documents bucket, reached over the S3-compatible API with the HMAC key below.
resource "google_storage_bucket" "docs" {
  name                        = var.bucket_name
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  depends_on                  = [google_project_service.storage]
}

# A service account whose HMAC key is the S3 access key/secret the app uses.
resource "google_service_account" "storage" {
  account_id   = "jobpilot-storage"
  display_name = "JobPilot document storage (S3 HMAC)"
}

resource "google_storage_bucket_iam_member" "storage_object_admin" {
  bucket = google_storage_bucket.docs.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.storage.email}"
}

resource "google_storage_hmac_key" "storage" {
  service_account_email = google_service_account.storage.email
}
