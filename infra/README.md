# infra

Terraform to stand up JobPilot's GCP infra on a fresh project: an `e2-micro` VM (Always Free in
`us-central1`/`us-west1`/`us-east1`), a static external IP, the web firewall rule, and the documents
bucket with an S3 HMAC key. The VM boots with Docker and the repo cloned; the app is set up afterwards.

It does not manage the running app (code, `.env`, containers) — that stays in git and the deploy workflow.

## Usage

```
cd infra
terraform init
terraform apply -var project_id=<gcp-project>
```

Then:

- point DuckDNS at the `external_ip` output
- put these into the server's `.env` (with the rest of the secrets):
  `S3_BUCKET` = `s3_bucket`, `S3_ACCESS_KEY_ID` = `s3_access_key_id`,
  `S3_SECRET_ACCESS_KEY` = `terraform output -raw s3_secret_access_key`
- ssh in, drop `.env` in `/opt/jobpilot`, `docker compose -f docker-compose.prod.yml up -d`

The state file holds the HMAC secret, so `terraform.tfstate` and `*.tfvars` are gitignored.
