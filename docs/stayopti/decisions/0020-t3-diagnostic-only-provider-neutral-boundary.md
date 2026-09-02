# D-0020 — Keep the repaired real-market sample diagnostic-only

Date: 2026-09-02

Status: Accepted offline evidence boundary; no provider-call authority

## Context and problem

T2E sealed a valid offline repair of one property-detail response while
preserving an aborted two-request live canary. T3 had to decide whether the
repaired 29-alternative sample could fairly enter V3 replay or blind review.

## Decision and scope

Admit the material only to a provider-neutral diagnostic snapshot. Exclude
source identity, original order, sponsorship and the single-item detail
enrichment from decision use. Do not run V3, create a blind capsule, record a
judgment, deblind, admit Golden evidence, or authorize another collection.

## Product rationale

Twenty displayed prices are aggregated, not verified checkout totals; nine
alternatives have no observed price. The one detail response changes price
evidence for only one item. Treating those fields as comparable would create
false precision and could reward collection asymmetry rather than stay merit.

## Evidence reviewed

- T2E seal SHA-256 and 14 internal checksums;
- original live Evidence reference;
- two authenticated encrypted raw envelopes replayed in memory;
- repaired and base snapshots;
- Golden, blind-capsule, external-session and provider-neutrality contracts;
- integrated V3-17 roadmap requirements.

## Alternatives rejected

- Running V3 on aggregated price as canonical total: rejects price semantics.
- Dropping the nine unpriced alternatives: creates response-dependent choice-set bias.
- Showing the enriched detail in blind review: creates asymmetric information.
- Promoting the sample to Golden: lacks admission and complete decision evidence.

## Risks and safeguards

The original source ordering and provenance remain necessary for audit, so a
separate private ledger preserves them with `decisionUseProhibited=true`.
Shared Evidence contains no ledger, provider identity, raw, secret or token.
SHA-256 semantic labels and fingerprints make decision projection independent
of source IDs and order.

## Implementation consequences

An evaluation-only T3 gate creates the diagnostic snapshot, feature matrix,
missingness summary, integrity receipt and eligibility decision. It is not
exported by the public Engine V3 boundary and imports no ranking or weight
module.

## Validation and rollback

Deterministic tests cover counts, price semantics, asymmetric detail,
provider/order invariance, Evidence integrity and no-network/no-runtime
boundaries. Rollback is deletion of the evaluation-only module and documents;
no public behavior or stored Golden record depends on this decision.

Approver: repository owner through the V3-17T3 instruction.

Supersedes: none.

Superseded by: none.
