# D-0019 — Seal the repaired SerpApi detail replay without changing live outcome

Date: 2026-09-02
Status: Accepted offline evidence boundary; no provider-call authority

## Context and problem

The MAX2 live canary transmitted two requests. Its main-search response was
processed, while a valid direct-root property-detail object was rejected by a
parser that supported only wrapped shapes. D-0018 repaired that evaluation
boundary and proved the same encrypted raw could be replayed successfully.
The repair needed a durable, independently checkable evidence link without
exposing or copying private provider material.

## Decision and scope

Create a sanitized offline seal that binds the original Evidence ZIP, the two
encrypted-envelope hashes, the repair commit, parser version and schema
fingerprints, expected pre-repair failure, post-repair success, security gates
and regression gates.

Preserve the live canary as `ABORTED`, collection as `PARTIAL`, and live
Evidence as `PASS`. Record the offline replay separately as `PASS`. Do not
include plaintext or encrypted raw in the seal and do not infer new network,
Golden, Stage REMAINING, training or calibration authority.

## Product rationale

StayOpti needs replayable evidence, but provider payload custody and decision
claims must remain separate. A checksum-bound sanitized seal proves the parser
repair against the original captured material while maintaining the product's
provider-neutrality, missing-evidence and no-invention rules.

## Evidence reviewed

- original canary Evidence ZIP and all 18 listed internal checksums;
- two uniquely matched AES-256-GCM/CurrentUser-DPAPI quarantine envelopes;
- controlled historical compatibility result;
- repaired parser replay result;
- D-0015 private quarantine and D-0018 direct-root parser boundary;
- targeted seal tests and canonical V2/V3 regressions.

## Alternatives rejected

- Retrofitting the live outcome to PASS: historically false.
- Copying encrypted or plaintext raw into the seal: violates custody scope.
- Reintroducing the old parser into runtime: unnecessary and unsafe.
- Promoting the replay directly to Golden: bypasses admission and judgment.
- Re-running the provider call: unauthorized and unnecessary.

## Risks and safeguards

- Seal tampering: exact artifact set, common context hash and per-artifact
  SHA-256 checksums.
- Secret/provider leakage: recursive field/value denylist plus ZIP scans.
- Semantic overclaim: explicit live/offline split and disabled promotion flags.
- Parser drift: parser version, parser-contract fingerprint, observed-shape
  fingerprint and repair commit are all bound.
- Raw custody: only non-reversible envelope/file hashes leave quarantine.

## Implementation consequences

A pure evaluation-only seal builder and validator are added with a synthetic
test suite. Documentation records the evidence semantics. Core V3, V2,
provider runtime, ranking, weights and public runtime are unchanged.

## Validation and rollback

Validation requires targeted tamper/omission/mismatch/security tests, offline
encrypted replay, V2/V3 regressions, typecheck, PowerShell parsing, scans and
Git integrity checks. Rollback is deletion/reversion of the seal-only module,
tests and documentation; it does not affect the historical Evidence or raw
quarantine.

## Approver

User instruction for V3-17T2E, 2026-09-02.

## Supersedes / superseded by

Does not supersede D-0015 or D-0018; it seals their resulting evidence
boundary. No successor is authorized by this decision.
