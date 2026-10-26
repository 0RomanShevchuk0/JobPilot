terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  # keep zone in the region, and co-locate the bucket with the VM, unless overridden
  zone            = var.zone != "" ? var.zone : "${var.region}-a"
  bucket_name     = var.bucket_name != "" ? var.bucket_name : "${var.project_id}-docs"
  bucket_location = var.bucket_location != "" ? var.bucket_location : upper(var.region)
}

# APIs a fresh project needs on first apply
resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

# service accounts and their IAM bindings need the IAM API, off by default on a new project
resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

# project-level IAM bindings go through the Resource Manager API
resource "google_project_service" "cloudresourcemanager" {
  service            = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}
