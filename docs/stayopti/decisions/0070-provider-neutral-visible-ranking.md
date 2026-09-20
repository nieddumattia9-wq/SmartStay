# D-0070 / A01 — provider-neutral visible ranking

Date: 2026-09-20. Approver: Mattia, explicit A01/A02 implementation instruction.
Base: `fdca9e3457cfe1bf9757dfe092e47362627733be`. Scope: A01 only.

## Decision

New evaluations use `traveler-relevant@1`. Only the provider repetition penalty,
provider soft quota and provider diversification dimension are disabled. Merit
scores, role assignment/anchors, category, unit type, price/distance bands and
canonical-property deduplication retain their existing formulas/options.
Provider provenance, offer namespaces and booking routing remain present.

`provider-diversity@1` is the explicit historical replay policy. Unversioned
previous-order arrays are legacy, never implicitly neutral. Cross-policy orders
are ignored with `previousOrderStatus=policy-mismatch`; matching versions retain
the existing within-equivalence-band stability. Results explicitly pins neutral
and uses a version-specific storage key plus versioned payload. Legacy storage
is not rewritten. Existing receipts are not migrated.

## Evidence and acceptance

On the frozen eight-property synthetic control, changing only source of property
06 moved the remaining list from 05,08,06,07 to 05,06,08,07. The initial official
Windows V2 runner passed 226 tests and failed the new invariance regression.
Legacy replay retains those exact lists as an executable historical control.
New tests traverse orchestrator, frontend adapter and independent V3 comparator:
provider renaming/splitting/merging/absence/singletons, two window sizes, reversed
inputs, selected offers, role anchors, score invariance, actual Results wiring,
saved-order version dispatch, deduplication and useful diversity.

This intentionally changes candidate visible ordering, not merit or purchase
channel policy. It does not enable public V3 or deploy anything. Canonical local
validation and publication status are recorded below only after observation.

## Risks / rejected alternatives

Do not erase provider namespaces, replace the offer tie-break with a commercial
preference, remove all diversification, or replay old orders under a new label.
Changing exact channel representation among fact-equivalent offers is not this
decision. Browser DOM interaction is not claimed by frontend-adapter tests.
Rollback means explicit legacy replay or a later version, never rewriting history.

Supersedes only the provider-identity dimension of the old presentation policy.

## Observed local validation

Windows PowerShell 5.1, isolated clean software candidate: exact `release:ci`
PASS; V2 242/242, V3 3154/3154; lifecycle665 PASS with17 preexisting opt-in
Valkey skips. Security29, release101, analytics31, capacity9, beta4 PASS.
TypeScript/build, dependency security audit, analytics-beta and local staging
smoke PASS. The initial failure and a test-only compilation/duplicate-edit
correction are retained externally; no assertion was weakened. Documentation
records the observed results after the software gate; no historical data changes.
Public deployment and GitHub CI are not claimed. Publication is separately
verified against the work-branch remote; no main update is authorized.
