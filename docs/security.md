# Security requirements

This project can control host-level virtualization and is security-sensitive.

- Never accept arbitrary shell commands from API requests or customers.
- Use a strict allowlist of typed operations in the KVM agent.
- Authenticate nodes using certificate-based identity and protect enrollment tokens.
- Enforce tenant ownership and role permissions in both API and background workers.
- Store password hashes with Argon2id; hash API tokens and session identifiers at rest where applicable.
- Use TLS, secure cookies, CSRF protection where relevant, rate limits and request validation.
- Keep PostgreSQL, Redis, libvirt sockets and management endpoints off the public internet.
- Use least-privilege Proxmox API tokens; do not store administrator passwords.
- Keep license signing private keys only on the licensing service.
- Verify image checksums and provenance before provisioning.
- Use idempotency keys, durable job state and explicit confirmation for destructive actions.
- Audit privileged actions and license changes without logging secrets.
- Test backups and restores; do not claim backup support until restore tests pass.
- Do not abruptly power off running customer VMs because a license server is temporarily unavailable.

Production deployment is blocked until threat modeling, integration tests and security review are completed.
