# D-0008 — Keep provider identity outside every V3 decision tie

Date: 2026-09-01
Status: Accepted

## Context and problem

The read-only V3-17T0 architecture audit confirmed that Engine V3 has no
provider-runtime dependency, but found three semantic tie-breaks that used
opaque identity: `solutionId` in Personal Utility Role Policy, and `hotelId`
in Search-wide Scale Coverage and Decision Robustness. The compatibility
adapter constructs `solutionId` from opaque hotel and offer references, so an
otherwise identical canonical decision could change when only provider
identity changed.

## Decision and scope

Provider name, hotel ID, offer ID, solution ID and every provider-derived
identity remain available only for lookup, correlation, provenance, tracing
and mapping a canonical result back to its source alternative. They cannot
select a winner, determine a role, alter a score, utility, regret, robustness,
abstention or explanation, or support a superiority claim.

All V3 semantic tie handling uses the shared provider-neutral
`decisionTieProjectionV3` boundary. The projection strips opaque identity,
provider, raw payload and commercial fields. When authorized decision fields
remain identical, the alternatives form a `DECISIONALLY_EQUIVALENT` class.
No arbitrary preference is added. A presentation representative may exist
only when a provider-neutral semantic projection distinguishes one; otherwise
it remains absent.

## Product rationale

An accommodation must be preferred because of traveler-relevant evidence,
not because one provider assigned a lexicographically smaller identifier or
returned it earlier. Preserving the equivalence class makes uncertainty
honest and lets a future provider attach through canonical normalization
without changing the V3 decision system.

## Evidence reviewed

- the complete V3-17T0 import and semantic boundary audit;
- V2 compatibility adapter and canonical V3 contracts;
- Personal Utility Role Policy, Scale Coverage and Decision Robustness;
- contextual value, decision geometry and explanation selection;
- Golden, replay and external provider-neutral session contracts;
- LiteAPI provider boundary, inspected only to confirm that its generated ID
  remains an opaque boundary reference;
- provider-ID, input-permutation and full V2/V3 regressions.

## Static comparator allowlist

Identity ordering remains allowed only where it cannot express preference:

- deterministic serialization and fingerprint input;
- uniqueness and exact-set coverage checks;
- map construction and lookup;
- deterministic output arrays of already-computed evaluations, exclusions,
  role assignments or source references;
- replay capsule canonicalization and output mapping.

The allowlist does not cover winner selection, boundary cutting, utility or
score comparison, regret, robustness, role eligibility, abstention,
explanation or any claim of superiority. Tests scan the corrected decision
comparators and fail on identity-based tie-breaks.

## Alternatives rejected

- deleting opaque IDs and breaking source lookup;
- replacing provider IDs with hotel name, raw address or coordinate precision;
- adding a new price, rating, popularity or provider preference to force a
  total order;
- preserving a single arbitrary winner while merely hiding its ID;
- changing weights, curves or materiality thresholds.

## Risks and safeguards

Existing consumers may expect one selected reference. The compatibility
boundary therefore exposes no winner when decision evidence is exactly tied,
while retaining all opaque candidates for lookup. New contract fields make
the equivalence explicit. Full V3 and V2 regressions protect non-tie behavior,
and the provider runtime remains unchanged.

## Implementation consequences

Personal Utility Role Policy, Search-wide Scale Coverage, Decision Robustness,
the V2 compatibility adapter, contextual upgrade selection and explanation
alternative selection share the same tie boundary. Exact ties are carried as
equivalence rather than broken by identity or input order. Reason codes and
the safety governor recognize the new non-selected state.

## Validation and rollback

Acceptance requires the dedicated provider-identity invariance suite, the
V3-17T0 re-audit, V3-17Q/R/S/S.1 regressions, complete Engine V3 and V2 suites,
TypeScript, B1/B2, legacy quarantine, F0B/F0C/F0D, integrity scans and both Git
diff checks. Rollback is a later explicit commit; it must not restore any
identity-based semantic tie-break.

## Approver

User-authorized V3-17T0A scope.

## Supersedes / superseded by

This record prospectively clarifies every earlier V3 determinism requirement:
determinism is over canonical decision evidence, never opaque provider
identity. No prior historical result is rewritten.
