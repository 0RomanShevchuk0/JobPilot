#!/bin/bash
# GCE runs this on every boot, so keep it idempotent: install Docker only when it's missing, clone the
# repo only when it isn't there yet. The app itself (.env, then `docker compose up`) is set up afterwards.
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y git ca-certificates curl
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

command -v git >/dev/null 2>&1 || { apt-get update && apt-get install -y git; }

mkdir -p /opt/jobpilot
%{ if repo_url != "" ~}
[ -d /opt/jobpilot/.git ] || git clone ${repo_url} /opt/jobpilot
%{ endif ~}
