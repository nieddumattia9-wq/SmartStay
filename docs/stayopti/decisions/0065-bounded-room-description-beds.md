# D-0065 — Explicit bed inventories in bounded room descriptions

Date: 2026-09-17. Base: `72ff17d818b351c5ef6062b250cafb3b421c9fc3`.
Scope: evaluation-only adapter and synthetic preparation tests. Work-branch
publication is authorized after the final checks, not publication on main.

## Evidence and decision

The existing whole-label English bed grammar rejects an explicit inventory
when surrounded by a room denomination. The preserved initial eight-test
experiment produced five failures and three passes: four supported inventories
became UNKNOWN and one OR description lost its separately traceable branches.
See `tests/engine-v3/fixtures/d0065-room-description-initial-regressions.json`.

Add a bounded, versioned room-description wrapper rather than removing arbitrary
words. Every character outside the inventory must belong to a recognized room
denomination/separator form. Preserve the original text, exact interpreted
UTF-16 span and the interpretation limits. A denomination conveys no verified
unit type, privacy, category or comfort. A capacity or bedroom count is not a
bed count. An inventory remains a documented lower bound, not a completeness
certificate. Unknown bed places remain unknown.

Keep the strict whole-label normalizer used by structured mapped-room bedTypes
unchanged. Preserve OR alternatives without addition, and retain relevant
qualifications across description clauses. Specific mapped-room contradictions
and missing mapped details remain independent of successful text parsing.

The wrapper is provider/scenario-independent logic at the adapter boundary;
no provider field is added to the decision core. No weights, thresholds,
recommendation roles, public runtime or acquisition mechanism changes.

## Verification and limits

Use invented source responses before their synthetic capture authentication,
then pure preparation and requirement assessment. No kernel/policy execution
is part of this phase, including its tests. Repeated preparation must preserve
the source and produce identical results. The final isolated-candidate results,
development failures and exact publication scope are in
`../../engine-v3/d0065-bounded-room-description-beds.md`.

The separate authorized commercial investigation is private. Its observations,
account evidence and derived prices are not software fixtures or policy inputs
and are excluded from this commit. No commercial rule is inferred from one
sample. Historical captures, manifests and approvals are not migrated.

This phase must report local/remote SHA, actual push status and any commits
still local. Test PASS alone does not establish remote synchronization or CI.
