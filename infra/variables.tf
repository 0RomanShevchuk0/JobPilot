variable "project_id" {
  description = "The GCP project to deploy JobPilot into"
  type        = string
}

variable "region" {
  description = "Region for the VM, its IP and subnet"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zone for the VM. e2-micro in us-central1/us-west1/us-east1 is Always Free"
  type        = string
  default     = "us-central1-a"
}

variable "repo_url" {
  description = "Git URL the VM clones to /opt/jobpilot on first boot; empty to skip. A private repo needs its own auth"
  type        = string
  default     = "https://github.com/0RomanShevchuk0/JobPilot.git"
}

variable "bucket_name" {
  description = "Globally-unique name for the documents bucket (S3-compatible via GCS)"
  type        = string
  default     = "jobpilot-docs"
}

variable "bucket_location" {
  description = "Location for the documents bucket"
  type        = string
  default     = "US-EAST1"
}
