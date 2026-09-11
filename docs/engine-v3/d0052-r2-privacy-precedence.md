# D-0052 R2 — Privacy applicability and neutral room names

Source `fca75449ca90d914bd3896e6bc7fc88437e6c8a0`, work branch
`codex/evaluation-d0036-d0041`. No real data or private execution in this phase.

## Preserved reproduction and before/after

`evidence/d0052-r2-synthetic-before.json` preserves the synthetic source/claim
inputs, first test-file fingerprint, initial exit code and five failing results.
The unchanged `reviewedPrivacy` / `privacyControl` helpers construct the original
source, journal and normalization; the new tests call
`executeObservedOfferDiagnostic` and the actual compiled kernel, not the parser
alone. No historical fixture or previous failure record is rewritten.

| Counterexample | Before | R2 |
| --- | --- | --- |
| A: generic private bath claim; selected room explicitly shared | UNKNOWN, claimConsumed=false | SHARED, claim remains unconsumed |
| B: generic non-private bath claim; selected room explicitly private | UNKNOWN, claimConsumed=false | PRIVATE, claim remains unconsumed |
| Standard Quadruple Room + reviewed true bath/exclusive use | Unit UNKNOWN | Unit PRIVATE; unit type still unknown |
| Camera Quadrupla Standard + same reviewed facts | Unit UNKNOWN | Unit PRIVATE; unit type still unknown |
| Complete business control: Unit A versus Italian neutral name | usable versus abstained | Both usable, same policy dimensions and portfolio |

The four reviewed fixtures still abstain for their other incomplete rate facts.
Repairing privacy does not supply complete cost, verified bookability or missing
requirements. The separate complete synthetic control demonstrates recommendability.

## Resolution rules and trace

`resolveObservedOfferPrivacyV3` now makes `activeClaim` require OFFER_SCOPED
applicability as well as a factual state. `claimConsumed=false` means the claim
contributes no state to fusion. Its original value, applicability, linked proof
and `CLAIM_NOT_OFFER_APPLICABLE` reason remain available. The absence of scoped
evidence still blocks a generic/unverified certificate; no automatic fallback
promotion is introduced. Actual property fallback is reported only when used.

`scopedTextEvidence` excludes only bounded neutral denomination clauses in the
room-name field from unit-privacy evidence. Examples: Standard Quadruple Room,
Double Room, Camera Quadrupla Standard, Stanza Singola. Matching clauses remain
in `neutralDenominations` and in the original source record. They create no
PRIVATE state and no unit-type, capacity, category or comfort inference.

Private/shared/negated/conditional clauses are not neutral. Room privacy unknown,
dedicated UNKNOWN fields, unsupported room descriptions and same-scope
contradictions continue to make privacy unknown/conflicting. Different field
roles remain distinct. The legacy parser's defaults are not changed.

The candidate review also tested a neutral denomination followed by `privacy
UNKNOWN`, `non privata` or `on request`. All three initially failed on the first
candidate (not on a new private measurement): removing the noun had orphaned the
qualifier. R2 retains these bounded fragments as explicit uncertainty in
`unresolvedPrivacyQualifiers`. Bathroom-specific clauses remain separate. This
does not invent a non-private fact or general-purpose language interpretation.

The reviewed source verifier is unchanged: true/false normalized claims still
must match their original typed field or supported exact phrase. Room names
cannot be reused as boolean proof. Source/hash/applicability validation is not
replaced by this resolver.

## Reproduction and validation

Canonical full command (installed dependencies, offline):

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:engine-v3
```

New suite: `v3ObservedPrivacyPrecedence.test.ts`, 45 tests. Targeted run: 213/213
PASS, including all 168 existing D-0052/R1, D-0051/R1, D-0050 and D-0041 controls.
Tests cover actual reviewed and complete synthetic entries, specific true/false,
PROPERTY_WIDE/UNVERIFIED, ignored conflicts, missing scope, authentic uncertainty,
source-incompatible transformations, retained originals and recommendable parity.
Final code validation in a clean isolated Windows CurrentUser checkout:

| Gate | Observed result |
| --- | --- |
| New R2 / combined targeted | 45/45 / 213/213 PASS |
| Canonical Engine V3 | 2120/2120 PASS, zero skip/fail |
| Canonical Engine V2 | 196/196 PASS |
| Lifecycle | 530 PASS, 17 pre-existing explicit SKIP, zero fail |
| Security / release | 29/29 / 101/101 PASS |
| Analytics / capacity / beta | 31/31 / 9/9 / 4/4 PASS |
| TypeScript / build / analytics-beta gate | PASS |
| Synthetic local-loopback staging smoke | PASS |
| Actual Windows PowerShell 5.1 parsing | 13/13 PASS |
| Scoped secret/private-artifact/raw-token/provenance checks | PASS |
| Git whitespace checks, excluded/sealed hashes | PASS |

The first complete candidate passed 2117 V3 tests; three added qualifier checks
then failed and were repaired before the final 2120/2120 run. That earlier PASS
is not substituted for the final code validation. Only the observed result
report/current-state paragraphs are added after testing; an isolated documentation
reseal verifies unchanged tested code, tests and other files before consolidation.
No native Linux run, dependency-registry audit or GitHub CI result is claimed.

## Scope, synchronization and limits

Nine-file inventory: observed privacy resolver; entry and kernel version constants;
new synthetic test; initial synthetic evidence; this report; R2 decision; current
state; append-only decision log. All other code remains byte-identical, including
legacy privacy and reviewed transformation checks, public V2, policy weights,
thresholds, role and distance code, seven excluded paths and seventeen sealed
D-0037 files. Existing source bindings are not regenerated.

This is a bounded language repair, not a universal interpreter or a privacy
inspection. Other unsupported names/clauses may still require explicit evidence.
No full robustness, regret, Golden eligibility, real recalculation, provider
request or public behavior change is claimed. The previous private measurement
and its actual measured code are not accessed or relabelled as R2 proof.

Local canonical gates are distinct from GitHub CI and registry-network audit.
The current workflow does not automatically run on this work-branch push.
Delivery records the actual local/remote SHA and pending commits after a
selective non-force push; main is not a publication target.
