# D-0049 — Verified positive and negative Upgrade coverage

Date: 2026-09-10. Approver: Mattia, explicit D-0049 instruction.
Source: `2dbedcff702420a23a84b6138521f7a82245b9e5`.

## Context and decision

The existing isolated V3-15 test already produces an Upgrade. The D-0046 grid
has zero selected upgrades, which does not prove a missing evaluation bridge.
Add only raw synthetic fixtures, bridge regressions, reproducible proof and
documentation. Existing code correctly handles the supplied 400/500/510 EUR
controls; no policy or product behavior needs repair.

## Rationale, evidence and safeguards

Require computed experience, actual evaluated offer, admissibility and marginal
gain before accepting Upgrade coverage. Preserve all 187 historical inputs and
results, including the one contextual non-execution. The new 40-test proof covers
positive roles, marginal rejection versus budget exclusion, missing/violated
requirements, F3 multi-rate binding and identity-neutral equivalence.
See `docs/engine-v3/d0049-upgrade-bridge-coverage.md` for numeric results.

Reject: injecting final scores as proof of the bridge; changing thresholds to
force Upgrade; equating Upgrade with Best Over Budget; rewriting old fixtures;
claiming full robustness or real outcome validity. D-0048's historical coverage
limitation is prospectively closed only for these synthetic Upgrade examples.

## Implementation, validation and operations

No source engine, adapter, public runtime, numeric policy, Golden gate or sealed
D-0037 file changes. Isolated canonical gates plus actual Windows PowerShell 5.1
proof precede selective work-branch commit and non-force publication. Exact test
counts, commit/tree, remote observation and pending commits live in the delivery.
Any later change requires new validation; no automatic rollback or rewritten
history. No real case, custody, provider, training, main promotion or deploy.

Supersedes no decision policy; extends verified coverage only.
