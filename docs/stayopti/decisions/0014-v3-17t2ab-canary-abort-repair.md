# D-0014 — Preserve the aborted SerpApi canary and require a repaired MAX2 reauthorization

Date: 2026-09-01

Status: Accepted; all new provider calls and Stage REMAINING remain unauthorized

## Context and problem

The first authorized one-session canary transmitted a valid main search and
one property-detail request. The handoff and sanitized Evidence production
passed, but the detail response was not processable and the data canary
aborted. The deleted raw response makes the precise response shape impossible
to reconstruct. Historical console output also exposed an ambiguous
credential-cleanup receipt because postflight was recorded before final
cleanup.

## Decision and scope

Preserve the canary as `ABORTED`, consume its two-call authorization, reject
its ZIP for resume, keep Stage REMAINING unauthorized, and add only sanitized
response-shape diagnostics for a possible later attempt. Preserve displayed
aggregated prices as provider-neutral observational evidence without treating
them as exact or bookable.

Revoke the historical MAX4 canary path. Any future canary must use the same
first frozen session with a new bundle-bound MAX2 literal: one search, at most
one detail, no retry, no pagination and unconditional stop. This decision does
not authorize it.

## Product rationale

A valid operational handoff must not be confused with a successful data
canary. Missing raw evidence must not be replaced by conjecture. Useful public
market price evidence should survive normalization, but it must retain its
weaker aggregated-display semantics and cannot alter V3 policy implicitly.

## Evidence reviewed

- the external Evidence ZIP with matching SHA-256 and `17/17` checksums;
- the separate matching diagnostic log;
- sanitized pilot, session, ledger, deletion, credential and snapshot records;
- collector request construction, candidate selection, detail merge and error
  boundaries;
- replay, external-session, resume and PowerShell credential-lifecycle code.

## Alternatives rejected

- diagnosing the provider response from absent raw data: unsupported;
- retrying or executing Stage REMAINING: unauthorized and unsafe;
- calling observed prices exact or checkout-verifiable: false evidence;
- dropping all observed price evidence: unnecessary information loss;
- retaining MAX4 after two consumed calls: exceeds the repaired risk envelope;
- recording raw provider errors or tokens: violates the evidence policy.

## Risks and safeguards

The new diagnostic envelope is fixed and allowlisted. It excludes raw messages,
headers, URLs, tokens, identifiers and payloads. Credential cleanup precedes
postflight and is repeated in `finally`. Resume requires a completed canary,
verified cleanup, valid diagnostics, a two-request cap and an independently
authorized ZIP-bound remaining stage.

## Implementation consequences

Evaluation-only contracts carry `OBSERVED_AGGREGATED_DISPLAY_PRICE`; the
collector and Evidence schema emit response diagnostics; the launcher and
handoff expose separate canary and Evidence outcomes; Stage A is capped at two
future calls. Core V3, V2, providers, ranking, weights and public runtime do
not change.

## Validation and rollback

The atomic change requires targeted abort/price/credential tests, T1C through
T regressions, resume rejection, provider neutrality, both engine suites,
TypeScript, PowerShell 5.1 parsing and all security/integrity scans. Rollback is
the atomic T2A/T2B commit; previously consumed or revoked authorizations cannot
be restored by rollback.

Approver: user instruction V3-17T2A/T2B.

Supersedes: only D-0012/D-0013 future canary cap, receipt timing and outcome
reporting. Their immutable manifest, staged separation and provider-neutral
boundaries remain accepted.
