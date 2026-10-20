# Implementation roadmap

## Phase 1 — Foundation
- [ ] Monorepo and reproducible workspace scripts
- [ ] Configuration validation and safe secret handling
- [ ] PostgreSQL schema and migrations
- [ ] Admin bootstrap and secure authentication
- [ ] Role-based access control and tenant ownership
- [ ] Audit events and health endpoints
- [ ] API documentation and automated tests

## Phase 2 — Standalone KVM MVP
- [ ] Go agent enrollment and certificate identity
- [ ] Node health and capacity reporting
- [ ] Verified OS image catalogue
- [ ] Durable, idempotent provisioning jobs
- [ ] Create, start, graceful shutdown, restart and delete VM
- [ ] Ownership and quota enforcement
- [ ] Integration tests on a disposable KVM host

## Phase 3 — Proxmox VE
- [ ] Scoped API token configuration
- [ ] Version and capability detection
- [ ] Node and VM inventory discovery
- [ ] Supported lifecycle operations
- [ ] Integration tests against a separate test environment

## Phase 4 — Customer features
- [ ] VPS overview and controls
- [ ] Console access integration
- [ ] Metrics, IP assignment and networking
- [ ] Reinstall and rescue workflows
- [ ] Snapshot and backup integration where supported

## Phase 5 — Licensing
- [ ] License plans and issuance
- [ ] Activation and installation identity
- [ ] Signed entitlements and public-key verification
- [ ] Expiry, renewals, revocation and node limits
- [ ] Offline grace period and outage tests

## Phase 6 — Production readiness
- [ ] Control-plane and node installers
- [ ] Signed releases, upgrade and rollback
- [ ] Backup/restore and disaster recovery tests
- [ ] Threat modeling, dependency scanning and security tests
- [ ] Operational documentation and release checklist

A phase is complete only when its implementation, automated tests and documented limitations are checked. UI mockups alone do not count as working virtualization functionality.
