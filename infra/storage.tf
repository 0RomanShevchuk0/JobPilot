# Documents bucket, reached over the S3-compatible API with the HMAC key below. It holds users'
# documents, so public access is blocked and a change can't destroy it.
resource "google_storage_bucket" "docs" {
  name                        = local.bucket_name
  location                    = local.bucket_location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  depends_on                  = [google_project_service.storage]

  lifecycle {
    prevent_destroy = true
  }
}

# A service account whose HMAC key is the S3 access key/secret the app uses; objectUser = read/write
# objects in the bucket only.
resource "google_service_account" "storage" {
  account_id   = "jobpilot-storage"
  display_name = "JobPilot document storage (S3 HMAC)"
  depends_on   = [google_project_service.iam]
}

resource "google_storage_bucket_iam_member" "storage_object_user" {
  bucket = google_storage_bucket.docs.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.storage.email}"
}

resource "google_storage_hmac_key" "storage" {
  service_account_email = google_service_account.storage.email
}
