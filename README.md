# VampireVPSPanel

VampireVPSPanel is a separate VPS hosting control plane inspired by the workflows of commercial virtualization panels. It is designed to manage standalone KVM/QEMU hosts and existing Proxmox VE environments through distinct, explicit backend adapters.

> **Development status:** Early planning/scaffolding. This repository is not yet production-ready and must not be used to manage production hypervisors until implementation and security testing are complete.

## Planned capabilities

- Admin and customer dashboards
- VPS inventory and lifecycle orchestration
- Standalone KVM/QEMU integration through a restricted Linux node agent
- Proxmox VE integration through scoped API credentials
- Node, storage, network and IP-pool management
- OS image catalogue and provisioning jobs
- Resource usage and health monitoring
- Independent VampireVPSPanel license service with signed entitlements
- Optional billing, invoices, reseller accounts and extensions

## Planned stack

- **Web:** Next.js, React, TypeScript and Tailwind CSS
- **API:** NestJS, TypeScript and versioned REST endpoints
- **Data:** PostgreSQL and Prisma
- **Jobs:** Redis and BullMQ
- **KVM agent:** Go, using libvirt APIs
- **Proxmox:** Proxmox VE API adapter
- **Licensing:** Separate service using asymmetric signatures

## Architecture principles

1. KVM and Proxmox are separate backends behind a common capability-aware interface.
2. Privileged host operations are performed by the restricted KVM agent or the Proxmox API—not by arbitrary commands supplied by the web application.
3. Long-running operations use durable, idempotent jobs.
4. Every request enforces authentication, role permissions and resource ownership.
5. License verification outages must not abruptly power off existing customer VMs.
6. Secrets, signing keys and production databases are isolated from public endpoints.

## Development roadmap

1. Foundation: monorepo, configuration, database, authentication, RBAC and audit trail.
2. KVM MVP: secure enrollment, node health, verified images and VM lifecycle jobs.
3. Proxmox adapter: scoped credentials, inventory discovery and supported lifecycle actions.
4. Customer experience: VPS controls, console integration, metrics and networking.
5. Licensing: activation, signed entitlements, renewals, revocation and offline grace policy.
6. Production hardening: installers, backup/restore, upgrade/rollback and security testing.

## Development

The repository is being built in phases. Setup commands will be documented after the initial workspace and applications are implemented. Do not copy example secrets into production or expose PostgreSQL/Redis directly to the public internet.

## License

No software license has been selected yet. Until a license is added, do not assume this project grants permission to redistribute or use the source under an open-source license.
