# D-0064 — Explicit CITY200 / ID20 plan version

Date: 2026-09-17. Base: `9d02ae2de113909a34cb1eb4279e0ad53c88f868`.
Authority: evaluation-only implementation, synthetic validation and selective
publication on `codex/evaluation-d0036-d0041`. No live acquisition authorized.

## Decision

Add explicit configuration version `stayopti.liteapi-search-coverage@1.2` with
`cityRatesLimit` and `idRatesLimit`, replacing the common `ratesLimit` only in
that new version. The caps are city200, ID20 and catalog100. Require the sealed
selection maximum not to exceed the ID search window. Actual selected IDs must
fit both bounds; never enlarge, truncate or substitute the sealed sample.

Retain historical @1.1 configuration, default proposal and requests unchanged.
Unversioned internal legacy plans retain the old shape; new fields require the
new version. Mixed fields and unknown versions fail closed. This is not a
migration. Inventory format @1.1, journal @1 and result @1 remain unchanged;
their exact configuration/checkpoint hashes bind the new plan version too.

Only the plan validator and request builder change. Both branches use their
own limit; catalog selection, durable reservation, transport, private encryption,
MAX3 / CATALOG1 / CITY1 / IDS1, prompt order and no-restart rule are reused.
No engine, provider-specific ranking, public runtime or historical authorization
is changed. The mechanism contains no new case-specific destination or dates.

The new production configuration is prepared privately after publication with
an unused case, explicit final inventory and actual Preflight literal. That
literal is not accepted by this software task. Previously confirmed scenario,
account/cost constraints and retention are reused only within their scope.

## Evidence and limits

See [validation report](../../engine-v3/d0064-city200-id20.md). Synthetic tests
must cover legacy compatibility, arm separation, multiple valid combinations,
another scenario, sealed selection, R2 classifications and one-shot safeguards.
Actual Windows PowerShell 5.1 / CurrentUser DPAPI tests do not certify a live
account or a provider result. No kernel/policy is part of this profile.

A broader city window is not a guarantee of more availability, a geographical
radius, inventory exhaustion or bookability. The catalog and ID sample remain
bounded. Sequential windows and historical measurements are not a controlled
causal experiment; provider inventory, ordering and timing can differ.
