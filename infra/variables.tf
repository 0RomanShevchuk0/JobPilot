variable "project_id" {
  description = "The GCP project to deploy JobPilot into"
  type        = string
}

variable "region" {
  description = "Region for the VM, its IP and the documents bucket"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zone for the VM; empty = <region>-a. e2-micro in us-central1/us-west1/us-east1 is Always Free"
  type        = string
  default     = ""
}

variable "repo_url" {
  description = "Git URL the VM clones to /opt/jobpilot on boot; empty to skip. A private repo needs its own auth"
  type        = string
  default     = "https://github.com/0RomanShevchuk0/JobPilot.git"
}

variable "bucket_name" {
  description = "Globally-unique documents bucket name; empty = <project_id>-docs"
  type        = string
  default     = ""
}

variable "bucket_location" {
  description = "Documents bucket location; empty = the region (co-located with the VM)"
  type        = string
  default     = ""
}

variable "ssh_user" {
  description = "Deploy user to add an SSH key for (sudo, for the GitHub Actions deploy); empty to skip"
  type        = string
  default     = ""
}

variable "ssh_public_key" {
  description = "The deploy user's SSH public key (e.g. 'ssh-ed25519 AAAA...'); required when ssh_user is set"
  type        = string
  default     = ""
}
