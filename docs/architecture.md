# Architecture

## Services

- `apps/web`: Admin and customer UI.
- `apps/api`: Authentication, authorization, resource APIs and orchestration entry points.
- `apps/worker`: Durable provisioning and scheduled jobs.
- `apps/license-server`: Independent licensing API; deployed separately in production.
- `services/kvm-agent`: Restricted Go agent installed on supported Linux KVM nodes.
- `packages/hypervisor-sdk`: Shared contracts and capability model.
- `packages/kvm-adapter`: Standalone KVM/libvirt implementation.
- `packages/proxmox-adapter`: Proxmox VE API implementation.
- `packages/database`: Prisma schema and migrations.
- `packages/license-sdk`: Public-key entitlement verification.

## Request flow

1. A customer or administrator calls the versioned API.
2. The API authenticates the identity and authorizes the requested resource.
3. The API persists a job and idempotency key.
4. A worker dispatches the job to the appropriate backend adapter.
5. KVM operations go to an authenticated, restricted node agent; Proxmox operations go to the Proxmox API using a scoped token.
6. The worker records the outcome and reconciles inventory state.
7. The UI reads job state and updated resource status.

## Backend separation

A VM must have one authoritative backend. Do not allow the KVM adapter and Proxmox adapter to manage the same VM. Backend capabilities (snapshots, migration, console, backups and resizing) must be reported explicitly rather than assuming feature parity.

## Security boundaries

- The web process must not expose arbitrary shell execution.
- KVM agent endpoints require strong machine identity, TLS, request validation and an operation allowlist.
- Proxmox credentials are least-privilege and stored encrypted or in a secret manager.
- The license-signing private key is isolated to the license service; panel installations only receive public verification keys.
- Tenant ownership is enforced in every API and worker operation.
- Database and Redis ports are private to the application network.
