# D-0016 — Bind any new SerpApi canary to a MAX2 encrypted-quarantine gate

- Date: 2026-09-01
- Status: Accepted; calls remain unauthorized
- Approver: Mattia, through the V3-17T2B instruction
- Supersedes: the unaccepted T2A MAX2 runner literal only

## Context and problem

T2A introduced the private encrypted provider-raw quarantine and offline
replay. Its runner literal did not bind every new operational invariant or the
T2B source checkpoint in one exact authorization string. Reusing it would make
the future call boundary harder to audit.

## Decision and scope

Generate a new, currently unaccepted literal bound to the T2B source SHA,
immutable manifest hash, complete runner bundle and exact limits: one session,
one main search, one property detail, two calls total, concurrency one, retry
and pagination zero, encrypted quarantine required, autostop and no remaining
stage. Enforce the sequence in the request ledger rather than relying on an
informational constant.

## Product rationale

The real-market source is evaluation evidence, not a runtime provider. A
two-call canary limits credit exposure and still tests the only unresolved
detail boundary while preserving evidence needed for offline repair.

## Evidence reviewed

- V3-17T2A encrypted quarantine and replay implementation;
- frozen twelve-session manifest and registered hash;
- staged request ledger, collector, Evidence schema and PowerShell handoff;
- T2A abort semantics and provider-neutral display-price projection.

## Alternatives rejected

- reuse the prior literal: rejected because it is not bound to the expanded
  T2B policy and checkpoint;
- authorize the remaining eleven sessions: rejected as outside scope;
- discard failed raw immediately: rejected because it prevents lawful offline
  parser diagnosis after a paid request;
- place raw in Evidence: rejected because Evidence is shareable and sanitized.

## Risks and safeguards

Raw provider material is sensitive and may contain unstable identifiers. It is
redacted for secrets, encrypted with AES-256-GCM, protected per Windows user,
stored outside the repository, expired after 14 or 90 days and excluded from
Evidence. The detail token is never durable metadata. Ledger sequencing,
strict literal matching and bundle hashing stop silent cap expansion.

## Implementation consequences

Only the evaluation collector/gate, private handoff, tests and documentation
change. Engine V2, core V3, rankings, weights, provider runtime, UI and booking
remain unchanged. The manifest remains byte-identical.

## Validation and rollback

Validation requires deterministic MAX2 tests, quarantine/replay regressions,
PowerShell 5.1 parsing, full Engine V3/V2 suites, static secret/raw-ID/license
scans and Git diff checks. Reverting this atomic commit removes the new literal
and gate; no network-side state exists to roll back.
