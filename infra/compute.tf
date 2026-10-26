# A dedicated SA for the VM with only Cloud Logging rights: the gcplogs Docker driver writes logs
# through it, and a container breakout can't reach the project-wide Editor the default compute SA holds.
resource "google_service_account" "vm" {
  account_id   = "jobpilot-vm"
  display_name = "JobPilot VM (Cloud Logging)"
  depends_on   = [google_project_service.iam]
}

resource "google_project_iam_member" "vm_log_writer" {
  project    = var.project_id
  role       = "roles/logging.logWriter"
  member     = "serviceAccount:${google_service_account.vm.email}"
  depends_on = [google_project_service.cloudresourcemanager]
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
  zone         = local.zone
  tags         = ["jobpilot-web"]

  boot_disk {
    initialize_params {
      image = "projects/ubuntu-os-cloud/global/images/family/ubuntu-minimal-2604-lts-amd64"
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

  service_account {
    email  = google_service_account.vm.email
    scopes = ["cloud-platform"] # the SA's one role (logWriter) is the real limit, not the scope
  }

  # startup-script goes in the metadata map, not metadata_startup_script: that one is ForceNew, so
  # editing the script would destroy+recreate the VM and wipe the boot disk (.env, certs, Redis AOF).
  # ssh-keys provisions the deploy user the GitHub Actions workflow logs in as.
  metadata = merge(
    { startup-script = templatefile("${path.module}/startup.sh", { repo_url = var.repo_url }) },
    var.ssh_user != "" && var.ssh_public_key != "" ? { ssh-keys = "${var.ssh_user}:${var.ssh_public_key}" } : {}
  )

  allow_stopping_for_update = true

  # a live server with its .env, Caddy certs and Redis AOF on the boot disk: never let a change recreate
  # it, and ignore image-family bumps (destroy the VM on purpose by removing this block first)
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [boot_disk[0].initialize_params[0].image]

    precondition {
      condition     = (var.ssh_user == "") == (var.ssh_public_key == "")
      error_message = "Set ssh_user and ssh_public_key together, or neither."
    }
    precondition {
      condition     = startswith(local.zone, "${var.region}-")
      error_message = "zone must be in region (e.g. zone us-central1-a for region us-central1)."
    }
  }
}
