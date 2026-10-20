# VampireVPSPanel

VampireVPSPanel is a custom VPS hosting control-panel project for eventual KVM/QEMU and Proxmox VE management.

> **Current status — early implementation, not production-ready.** The current application includes a Next.js web UI, first-run administrator setup, cookie-based sessions, SQLite persistence, admin inventory records and an audit log. Inventory records are not real virtual machines. The repository does **not** yet provide production-ready KVM/Proxmox provisioning, live VM metrics, customer VPS lifecycle controls, event-triggered email notifications, signed offline license enforcement, or scheduled expiry suspension. Do not sell VPS services through it or connect it to production hypervisors until these are implemented and security-tested.

## Install the current web application

Supported targets: fresh Debian/Ubuntu servers with root access. The installer installs Node.js 22+, dependencies, builds the current web app, configures a systemd service and creates an Nginx reverse proxy.

```bash
apt-get update && apt-get install -y curl
curl -fsSL https://raw.githubusercontent.com/Afzalplays/vampire-vpspanel/feat/production-install-foundation/install.sh -o install.sh
bash install.sh
```

To use a domain, point its DNS to the server first and pass the domain to the installer:

```bash
DOMAIN=panel.example.com bash install.sh
```

The installer currently configures HTTP only. Configure HTTPS with a trusted certificate before exposing the panel publicly. After the service starts, open `/setup` once and create the initial administrator with a unique password of at least 12 characters. Initial setup closes after the first account is created.

Useful commands:

```bash
systemctl status vampire-vpspanel
journalctl -u vampire-vpspanel -f
systemctl restart vampire-vpspanel
```

Application files default to `/opt/vampire-vpspanel`; persistent SQLite data is under `data/`. The generated `.env.production` contains a random session secret and must remain private. Back up the data directory and environment file securely.

## Implemented in the current web app

- One-time first-run administrator creation; public registration is disabled.
- Password hashing and signed, HTTP-only session cookies.
- Admin-gated user and inventory API routes.
- SQLite storage and basic audit logging.
- Basic dashboard and inventory management UI.
- A web-app installer and systemd/Nginx deployment setup.

## Not implemented yet — no fake status claims

- Actual KVM/QEMU VM creation, power controls, console and networking.
- Limited Proxmox VE API connector foundation: admin configuration, HTTPS-only API calls, connection/version/node diagnostics, and read-only node/VM inventory endpoints. This is not VM provisioning or a production-ready hypervisor integration.
- Customer-facing VPS panel and resource ownership enforcement across VM APIs.
- Admin-managed branding persisted and applied across all app surfaces.
- SMTP settings, delivery tests, email templates and event-triggered notifications.
- VPS expiry scheduler, grace periods and real hypervisor suspension/reactivation.
- Signed license issuance, activation, expiry and revocation.
- Production-grade backup/restore, migration, monitoring and security test suite.

These are implementation tasks, not working features just because they appear in a UI or roadmap. The installer deploys the current web application only. The Proxmox connector requires a reachable Proxmox VE API, a least-privilege API token, and a manually configured `PROXMOX_TOKEN_SECRET`; it does not create, resize, suspend, or delete VMs.

## Proxmox connector foundation (read-only)

1. In Proxmox VE, create a dedicated API user/token with only the permissions needed for inventory and version checks. Do not use `root@pam` or a full-privilege token.
2. Set `PROXMOX_TOKEN_SECRET` in `/opt/vampire-vpspanel/.env.production` (never commit it). The admin API saves the HTTPS base URL, token ID, and node name in SQLite; the token secret is read only from the environment.
3. Restart the service: `systemctl restart vampire-vpspanel`.
4. As an authenticated admin, use `/api/admin/hypervisor` to read config, `PUT /api/admin/hypervisor` to save `{ "url": "https://pve.example.com:8006", "tokenId": "panel@pve!inventory", "node": "pve1" }`, and `POST /api/admin/hypervisor` to test connectivity. `GET /api/admin/hypervisor?mode=nodes` and `?mode=vms` expose read-only inventory.
5. Use a trusted TLS certificate on Proxmox. TLS verification is intentionally not disabled. This connector has not been tested against a live Proxmox server and does not provision or control VMs.

## Security notes

- Do not expose the app publicly before configuring HTTPS.
- Keep `.env.production`, session secrets, mail credentials and hypervisor tokens out of Git.
- Never grant the web app arbitrary root shell access to hypervisor nodes.
- Hypervisor actions should use a restricted agent or scoped Proxmox API credentials, strict authorization, durable jobs and audit events.
- Do not treat a database status change as a real VM suspend operation.
- Test upgrades and restore procedures on a disposable server before production use.

## Planned architecture

- **Web:** Next.js, React, TypeScript
- **Data:** currently SQLite for the early web scaffold; production data architecture remains to be completed.
- **Virtualization:** restricted KVM/libvirt agent and/or Proxmox VE API adapter.
- **Background work:** durable jobs for provisioning, notifications, license refresh and expiry enforcement.
- **Licensing:** signed entitlements with explicit offline grace policy.

## License

No software license has been selected yet. Until a license is added, do not assume this project grants permission to redistribute or use the source under an open-source license.
