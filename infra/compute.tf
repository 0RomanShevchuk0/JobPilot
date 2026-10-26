data "google_compute_default_service_account" "default" {
  depends_on = [google_project_service.compute]
}

# The server's public address; point DuckDNS at it (output external_ip).
resource "google_compute_address" "jobpilot" {
  name       = "jobpilot-rs"
  region     = var.region
  depends_on = [google_project_service.compute]
}

resource "google_compute_instance" "jobpilot" {
  name         = "jobpilot-us"
  machine_type = "e2-micro" # Always Free in us-central1/us-west1/us-east1
  zone         = var.zone
  tags         = ["jobpilot-web"]

  boot_disk {
    initialize_params {
      image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-minimal-2604-lts"
      size  = 30 # GB; the Always Free pd-standard allowance
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.jobpilot.address
    }
  }

  # the default SA with cloud-platform: the gcplogs Docker driver writes to Cloud Logging through it
  service_account {
    email  = data.google_compute_default_service_account.default.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = templatefile("${path.module}/startup.sh", {
    repo_url = var.repo_url
  })

  # a machine-type or disk change recreates in place instead of failing on a running VM
  allow_stopping_for_update = true
}
