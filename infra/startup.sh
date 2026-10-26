#!/bin/bash
# First-boot provisioning: Docker, the Compose plugin and the repo. The app itself (.env, then
# `docker compose up`) is set up by hand or the deploy workflow afterwards.
set -euxo pipefail

apt-get update
apt-get install -y git ca-certificates curl

# Docker Engine + the compose plugin, from Docker's own installer
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

mkdir -p /opt/jobpilot
%{ if repo_url != "" ~}
git clone ${repo_url} /opt/jobpilot || true
%{ endif ~}
