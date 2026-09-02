# D-0021 — Comparable set-wide evidence gate

Date: 2026-09-02

Status: Accepted offline requirements boundary; no collection authority

Approver: Mattia through the V3-17T4 instruction

## Context and problem

T3 reconstructed 29 provider-neutral alternatives but found only 20 observed
aggregated display prices, nine missing prices and one asymmetric detail.
Those facts were diagnostic, not sufficient for V3 replay or a fair blind
judgment. A future collector needs immutable minimum evidence requirements
before credits are spent.

## Decision and scope

StayOpti adopts three evidence tiers: diagnostic, limited comparable judgment
and full decision/blind judgment. Comparable sets contain at least five,
target eight and at most ten alternatives. Critical full-tier price,
availability, currency, stay/occupancy, tax/fee, room/offer, cancellation,
freshness and detail coverage are 100% set-wide.

The current public-market source is demonstrated only for diagnostic and
potential limited main-search evidence. Its property detail does not
demonstrate exact-bookable, seller-specific, tax-complete, cancellation or
availability evidence across a set. A one-main-search-per-session strategy is
the only recommended low-credit future path, limited to qualitative
comparison. No operational literal or provider authority is created.

## Product rationale

A decision system cannot manufacture comparability by enriching the apparent
winner, deleting unpriced alternatives after observation or treating display
prices as checkout totals. Five to ten alternatives give a useful but
reviewable set, while keeping search-wide coverage distinct from market-wide
claims.

## Evidence reviewed

- T3 Evidence SHA-256
  `1a669961375fc3838c100c7d7ca03623a9902acab4c87621799366aa671f50a6`,
  `6/6` checksums.
- T2E seal SHA-256
  `27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`,
  `14/14` checksums.
- Two authenticated encrypted raw envelopes replayed offline under the
  existing AES-256-GCM and CurrentUser DPAPI boundary.
- Existing Golden, blind, provider-neutral and cost-integrity contracts.

## Alternatives rejected

- Enriching every selected item now: rejected because 108 target or 132
  worst-case calls across 12 sessions still do not prove the full tier.
- Promoting aggregated display price: rejected because bookability, seller,
  checkout total and complete tax semantics are not demonstrated.
- Excluding missing-price items as inferior: rejected as unsupported.
- Cross-source exact-offer matching now: deferred pending provider and entity
  matching qualification.

## Risks and safeguards

- A limited set can omit unobserved market alternatives; claims remain about
  the frozen analyzed set only.
- Missing-price exclusions remain visible in a separate denominator.
- Sponsorship, original order, identity and detail richness are audit-only.
- Caps are immutable and no historical literal is accepted.
- Full tier and Golden admission remain unavailable without independent
  qualification and manual review.

## Implementation consequences

The evaluation boundary gains versioned tier, field, price, capability,
selection, strategy, call-budget and future-gate contracts. Engine V2, V3
ranking/weights, provider runtime and public output are unchanged.

## Validation and rollback

Targeted tests cover thresholds, asymmetry, missingness, selection invariance,
budget arithmetic, cap override rejection and authority boundaries. Rollback
is removal of the isolated evaluation contract and documentation; no public
runtime state or provider state is mutated.

## Supersession

This decision extends D-0020. It does not supersede the T3 diagnostic-only
classification and grants no authority to collect.
