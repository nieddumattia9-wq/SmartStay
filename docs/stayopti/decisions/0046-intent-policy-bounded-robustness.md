# D-0046 — Same-policy bounded intent diagnostics

Date: 2026-09-08. Source: e2ba339041c5320fecdc0f9478a61fe57b4be90e.
Approver: Mattia, explicit D-0046 authorization; synthetic evaluation and work-branch publication only.

## Context and decision

D-0044 selection follows V3-15 role policy, not the historical utility. D-0045 restored the explicitly bound synthetic launcher without branch renaming or migrated progress. Reusing historical robustness/regret would assign another selector's confidence to this candidate. Introduce a separate evaluation module, frozen synthetic grid, reproducible runner and regressions; preserve both earlier repairs and all policies/weights/thresholds.

Measure full Best Choice equivalence sets. Use a limited policy-membership displacement loss plus signed cost/experience/utility/evidence components, never utility argmax as a substitute selector. Report incomplete/absent reference offers, abstention and contextual non-execution with null loss and all denominators. Separate intentional preference changes, user-context changes, observations and invariance controls. Keep Saving/Upgrade checks distinct.

The detailed versioned protocol, semantics, limits and invocation are in `docs/engine-v3/d0046-intent-policy-robustness.md`. All fixture observations are invented; the runner exposes no real-data input option. Existing validated bridge calls and evaluated-offer binding F3 are retained. Contextual exceptions require evidence; unknown schema/integrity errors are not swallowed. No public export/registry or caller is added.

## Evidence and rejected alternatives

The first 32-test execution passed 30 and failed 2: the supported-exception fixture used underscore rather than the actual canonical hyphen evidence IDs. The gate correctly rejected it. Fixture revision 2 fixes only these two references and records the reason. Original inputs/seal/results remain in the delivery; no observations, thresholds or expected traveler behavior were tuned. The corrected targeted suite includes 34 passing checks, including explicit counterexamples for Maximum Savings cost-first and Comfort experience-band selection when utility argmax differs. Forty-one D-0044 regressions pass. Full consolidated gate results are recorded in the delivery, not inferred from these targeted checks.

## Scope and residual risks

The grid is finite, not a probability model or complete robustness certification. Policy displacement is not cardinal regret or post-stay outcome. Similar experiences near exact decision boundaries can switch on small changes. Manual Balanced may still prefer the invented cheap, high-review shared unit if privacy/comfort is not required; this phase records that behavior instead of imposing universal luxury. Existing room-unit fit and intent classification-confidence limitations remain. No real Bologna execution, training, Golden admission or promotion is authorized.

## Validation and operations

Use a clean local candidate excluding seven preexisting paths; run actual Windows PowerShell 5.1 gates, complete V3, V2 and required offline groups. Hash the seventeen D-0037 sealed files and all out-of-scope tracked files before/after. Selectively commit only this phase after PASS; push only `codex/evaluation-d0036-d0041`, verify exact SHA and zero pending commits, leave main unchanged. Delivery records actual push status; offline PASS alone does not imply synchronization. No rewrite of old checkpoints or custody manifests. Removing this standalone module later requires a separate change, not an automatic rollback or history rewrite.

Supersedes no ranking decision. Extends D-0044's diagnostic coverage without changing its limited sensitivity flags or making them a new certification.
