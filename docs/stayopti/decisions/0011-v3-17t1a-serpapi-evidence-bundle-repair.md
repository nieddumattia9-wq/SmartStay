# D-0011 — Bind SerpApi pilot authorization to replayable sanitized Evidence

Date: 2026-09-01
Status: Accepted; prospectively supersedes D-0010's authorization literal

## Context and problem

The first T2 preflight proved that the T1 runner could emit fingerprints but
not replayable snapshots or a verified Evidence ZIP, and did not execute the
planned property details. Zero calls occurred and the authorization was not
consumed.

## Decision and scope

Revoke the old manifest-only literal. Require a new exact literal bound to the
unchanged manifest hash, the complete runner-bundle hash, retention policy
version 2 and the 48-request ceiling. Add an evaluation-only export collector,
snapshot schema, deletion receipts, Evidence ZIP workflow and T3 input
validator. T1A remains fully offline and grants no replacement authorization.

## Product rationale

Real-market evidence is useful only when the full visible choice set can be
replayed and audited without retaining provider secrets or opaque identifiers.
A hash-bound executable bundle prevents an authorization for a weaker runner
from silently authorizing materially different persistence behavior.

## Evidence reviewed

- D-0008 provider-ID-neutral decision ties;
- D-0009 SerpApi evaluation-source boundary;
- D-0010 frozen pilot manifest and authorization gate;
- T2 zero-call preflight receipt;
- external-choice, replay, Golden and blind-capsule contracts;
- PowerShell 5.1 execution guardrails.

## Alternatives rejected

- treating fingerprints as sufficient replay evidence;
- retaining raw payloads to compensate for missing snapshots;
- reusing the previous authorization after changing the runner;
- selecting details with provider tokens or source order;
- putting raw payloads, URLs or credentials into the ZIP;
- adding a ZIP dependency or public/runtime integration.

## Risks and safeguards

Export failure could otherwise destroy the only useful normalized state, while
cleanup failure could retain raw data. Snapshot bytes are written and reread
before deletion, and deletion is verified. Abort bundles are explicitly
partial. ZIP entry allowlists, extraction into a second temporary directory,
checksums and security scans fail closed.

## Implementation consequences

The future evaluation runner can execute main and deterministic detail calls,
export provider-neutral snapshots, package sanitized Evidence and validate it
for T3. Core V3, V2, provider runtime, weights, thresholds and public behavior
are unchanged.

## Validation and rollback

Acceptance requires targeted lifecycle/ZIP/security tests and every requested
historical regression, plus byte-identical preservation of unrelated dirty
paths. Rollback requires a later explicit commit and cannot reactivate the old
literal.

## Approver

User-authorized V3-17T1A offline repair scope. Provider calls and retention are
not authorized.

## Supersedes / superseded by

Supersedes only D-0010's executable authorization literal and incomplete output
binding. It preserves D-0010's manifest, limits and product boundary.
