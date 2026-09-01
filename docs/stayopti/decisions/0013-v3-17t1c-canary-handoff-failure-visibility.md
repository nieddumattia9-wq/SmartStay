# D-0013 — Fail-visible, no-exit SerpApi canary handoff

Date: 2026-09-01

Status: Accepted; calls and retention remain unauthorized

## Context and problem

The first user-operated T2 handoff closed before showing the secure key prompt.
The user entered no key, observed zero SerpApi calls and credits, and obtained
no Evidence ZIP. Offline reproduction showed Windows PowerShell 5.1 rejecting
the committed launcher under the local execution policy before its script body;
the wrapper then terminated the calling console.

## Decision and scope

Replace the pasted long wrapper with one hash-bound committed handoff. Use a
process-scoped execution-policy allowance only for the verified committed
scripts, add a launcher preflight-only mode, prohibit PowerShell exit statements
in the handoff chain, persist only allowlisted diagnostics, and pause the visible
console on success and failure.

The old unconsumed `c412...MAX4` literal is revoked because the runner bundle
changes. Its replacement remains a four-call, one-session canary literal and is
not authorized by this decision.

## Product rationale

A user must be able to inspect a pre-key or pre-network failure without losing
the shell or exposing credentials. Better operational visibility must not
weaken the immutable manifest, request cap, provider-neutral boundary or
separate authorization gate.

## Evidence reviewed

- the exact previously delivered PowerShell block;
- the user's zero-key, zero-call, zero-credit and no-ZIP observations;
- Windows PowerShell 5.1 execution-policy reproduction;
- T1B staged runner, launcher, collector, Evidence and resume contracts;
- canonical Windows execution guardrails and repository product rules.

## Alternatives rejected

- another long pasted block: too fragile and not independently hash-bound;
- changing machine/user execution policy: broader than required;
- swallowing the launcher failure without a log: not diagnosable;
- retaining the old literal after changing covered files: breaks bundle binding;
- performing a test call: unauthorized and unnecessary.

## Risks and safeguards

Process-local policy bypass is constrained by exact checkpoint, bundle,
manifest, literal, dirty-set and session/cap validation. Test-only fault
controls are preflight-only. Diagnostics use fixed fields and sanitized enums;
raw exception text and transport data are excluded. The final pause is
unconditional outside offline tests.

## Implementation consequences

The launcher supports `-HandoffPreflightOnly` and process-environment key
handoff. A dedicated script performs all checks, key lifecycle, Evidence
verification, cleanup, result logging and pause. Both scripts use .NET SHA-256
and contain no process-termination statement.

## Validation and rollback

Targeted fault and parent-sentinel tests plus all required regressions must
pass before commit. Rollback is the atomic T1C commit; the old literal remains
revoked and cannot be silently restored.

Approver: user instruction V3-17T1C.

Supersedes: only the operational handoff mechanics and canary literal published
by D-0012. The staged canary/remaining separation in D-0012 remains accepted.
