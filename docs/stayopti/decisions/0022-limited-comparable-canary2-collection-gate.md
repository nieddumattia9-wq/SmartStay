# D-0022 — Limited-comparable CANARY2 collection gate

Date: 2026-09-02

Status: Accepted offline gate; CANARY2 literal remains unaccepted and all
provider calls remain unauthorized

Approver: Mattia through the V3-17T5 instruction

## Context and problem

D-0021 established that the existing real-market sample is diagnostic-only
and that a low-credit main-search-only path may qualify limited-comparable
evidence. The twelve canonical sessions needed an immutable registry, a
credit-safe staged campaign and an authorization boundary that cannot reuse a
historical T2 literal or reach the remaining sessions automatically.

## Decision and scope

StayOpti freezes the twelve existing scenarios in a provider-neutral registry
and splits them deterministically into CANARY2 and REMAINING10. CANARY2 uses
two preselected, input-diverse sessions and permits exactly one main search per
session, two calls total, no property detail, retry or pagination, concurrency
one and mandatory autostop. Both sessions must pass the limited-comparable
tier; otherwise the stage aborts.

REMAINING10 is a separate future process with ten calls maximum. It receives
no literal and no authority in T5. A passing CANARY2 seal must be manually
reviewed before a separate gate can materialize any REMAINING10 authorization.

## Product rationale

The design buys the smallest new evidence unit capable of testing two
meaningfully different scenarios. It preserves missing-price denominators,
does not spend credits on asymmetric details and prevents provider exposure
order, sponsorship or identifiers from becoming decision signals.

## Evidence reviewed

- D-0021 and the T4 comparable-set contract.
- T3 Evidence SHA-256
  `1a669961375fc3838c100c7d7ca03623a9902acab4c87621799366aa671f50a6`,
  `6/6` checksums.
- T2E Evidence SHA-256
  `27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`,
  `14/14` checksums.
- Two authenticated encrypted raw envelopes under the existing private
  AES-256-GCM and Windows CurrentUser DPAPI boundary.

## Alternatives rejected

- Direct twelve-session execution: rejected because it bypasses a small
  evidence-and-credit canary.
- One-session canary: rejected because it cannot demonstrate behavior over
  two input-diverse scenarios.
- Property-detail enrichment: rejected because T4 found no demonstrated path
  to symmetric exact-bookable evidence and detail calls consume credits.
- Result-adaptive session choice or replacement calls: rejected as selection
  leakage and an uncontrolled budget expansion.

## Risks and safeguards

- Search results may still be insufficient: both sessions must independently
  reach the frozen limited tier and no diagnostic allowance exists.
- Aggregated display prices may be incomplete: their semantics remain
  non-exact and missing prices stay in a separate stratum.
- Raw provider data is sensitive: encrypted quarantine is mandatory before
  stable processing and shared Evidence excludes all raw.
- Authorization drift is controlled by exact source, execution HEAD,
  manifest, registry and runner-bundle binding.

## Implementation consequences

An evaluation-only gate, fail-closed runner, PowerShell 5.1 launcher and
synthetic tests are added. Engine V2, V3 core/ranking/weights, provider
runtime, public UI and booking flow remain unchanged.

## Validation and rollback

The targeted suite covers zero-authority preflight, stage partitioning, hard
caps, duplicate/concurrency rejection, quarantine failure, price/missingness
semantics, provider/sponsorship/order invariance, Evidence leakage and secure
credential handoff. Rollback removes the isolated T5 evaluation files and
documentation; it does not require provider or production mutation.

## Supersession

This decision implements the limited future path allowed by D-0021. It does
not supersede T3's diagnostic-only classification, does not accept a literal
and does not authorize CANARY2, REMAINING10 or Golden admission.
