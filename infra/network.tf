# The default network and its ssh/icmp rules come with the project; this adds only the web rule,
# opening 80/443 (and 443/udp for HTTP/3) to the VM tagged jobpilot-web.
resource "google_compute_firewall" "jobpilot_web" {
  name    = "jobpilot-web"
  network = "default"

  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["jobpilot-web"]

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
  allow {
    protocol = "udp"
    ports    = ["443"] # HTTP/3
  }

  depends_on = [google_project_service.compute]
}
