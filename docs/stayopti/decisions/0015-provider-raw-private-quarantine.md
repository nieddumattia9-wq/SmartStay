# D-0015 — Retain paid provider raw only in private encrypted expiring quarantine

Date: 2026-09-01

Status: Accepted; raw retention authorized, provider calls remain unauthorized

## Context and problem

The first SerpApi canary produced a useful main response and an unrecognized
property-detail response. Delete-always protected secrets but made the paid
detail response unavailable for offline parser repair. The user authorizes
internal, non-redistributed retention for development, testing and architecture
improvement, but not permanent or public storage.

## Decision and scope

Introduce a provider-neutral private raw quarantine outside the repository.
Every payload is AES-256-GCM encrypted with a fresh key; the key is protected
for the current Windows user with DPAPI. Successful payloads expire after 14
days, unrecognized/partial/error payloads after 90 days. A manual extension may
add 90 days before expiry with a controlled reason receipt.

Raw data, ciphertext and keys are excluded from Git, shareable Evidence,
documentation, logs and console output. Replay is offline, authenticated,
hash-verified and adapter-bound; no provider payload can enter the V3 core.

## Product rationale

Paid evidence should remain available long enough to repair adapters without
weakening privacy, provider neutrality or product claims. Missing evidence is
not reconstructed, and raw payloads do not become Golden cases or model input.

## Evidence reviewed

- the immutable aborted-canary Evidence ZIP and all 17 internal checksums;
- the sanitized 29-alternative snapshot and deletion receipts;
- collector, adapter, snapshot, resume and PowerShell runner boundaries;
- a synthetic AES-GCM suite and synthetic Windows CurrentUser DPAPI roundtrip.

## Alternatives rejected

- permanent raw retention: disproportionate and unauthorized;
- plaintext storage: fails closed;
- storing raw in Evidence ZIP, Git or Downloads: prohibited;
- deleting every paid response immediately: prevents lawful offline repair;
- a SerpApi format inside V3 core: violates provider neutrality;
- inventing the deleted historical detail shape: unsupported.

## Risks and safeguards

Authenticated metadata prevents silent expiry or provenance substitution.
Secret-bearing payloads are rejected before stable persistence. Archive paths
must be absolute and outside the repository. DPAPI readiness is probed before
any future credential load or network request. Replay creates no plaintext
file, and purge is deterministic.

## Implementation consequences

Evaluation-only quarantine/replay contracts, a DPAPI bridge and a private
store are added. The future SerpApi collector requires a ready quarantine,
captures raw text before parsing, preserves failures for 90 days and
reclassifies successful entries to 14 days. The runner bundle and future MAX2
literal change; no authorization is granted.

## Validation and rollback

Acceptance requires targeted encryption, retention, extension, purge,
tamper, replay, provider-neutrality and fault tests; both engine suites;
TypeScript; PowerShell parsing; security scans; and Git integrity checks.
Rollback is the atomic D-0015 implementation commit. Rollback cannot recover
the already deleted historical detail raw or restore consumed authorization.

Approver: user instruction V3-17T2A and T2A-R0 reconciliation.

Supersedes: D-0010 through D-0014 only where they required immediate raw
deletion. Their manifest, authorization separation, aborted-canary history and
provider-neutral decision boundaries remain accepted.
