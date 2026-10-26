# infra

Terraform for JobPilot's GCP infra: an `e2-micro` VM (Always Free in `us-central1`/`us-west1`/`us-east1`),
a static external IP, the web firewall rule, a Cloud-Logging-only service account for the VM, and the
documents bucket with an S3 HMAC key. The VM boots with Docker and the repo cloned.

It does not manage the running app (code, `.env`, containers) — that stays in git and the deploy workflow.

## Usage

```
cd infra
terraform init
terraform apply -var project_id=<gcp-project> \
  -var ssh_user=<deploy-user> -var ssh_public_key="ssh-ed25519 AAAA..."
```

`region`/`zone`, `bucket_name` (defaults to `<project_id>-docs`) and `repo_url` are overridable vars.

## After apply

- point DuckDNS at the `external_ip` output
- `.env` on the VM (`/opt/jobpilot`): `S3_BUCKET`/`S3_REGION`/`S3_ACCESS_KEY_ID` from the matching
  outputs, `S3_SECRET_ACCESS_KEY` from `terraform output -raw s3_secret_access_key`, plus the rest of
  the secrets. **Generate a fresh session-key pair** (`pnpm session-keys:generate`); keep a copy of
  `.env` off the VM — `SESSION_PRIVATE_KEY` is the only thing that can't be regenerated.
- point `vars.JOBPILOT_HOST` (GitHub) at the new IP/host
- add `https://<domain>/api/auth/callback/google` to the Google OAuth client's redirect URIs
- `docker login ghcr.io` on the VM if the images are private, then
  `docker compose -f docker-compose.prod.yml up -d`

## Notes

- **State is local** and holds the HMAC secret (gitignored, `sensitive` in outputs). Keep a backup: if
  you lose it, a re-apply hits 409s on every name (import to recover), and the HMAC secret is only
  retrievable from the server's `.env`. For a shared/durable setup use a `gcs` backend (bucket with
  versioning, created once before `init`).
- The VM and the bucket both have `prevent_destroy`: a full `terraform destroy` fails on each until you
  remove that lifecycle block. The VM's boot disk carries `.env`, Caddy certs and Redis AOF.
- Terraform owns the VM's `ssh-keys` metadata (the deploy key). Add your own SSH key at the **project**
  level, not the instance, or a later `apply` will drop it as drift.
- SSH (`0.0.0.0/0`, key-only) comes from the project's default network, not managed here.
- The startup script installs Docker via `get.docker.com`, which assumes Docker supports the VM's
  Ubuntu release.
