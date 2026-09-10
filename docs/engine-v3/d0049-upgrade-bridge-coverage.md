# D-0049 — Upgrade through the full evaluation bridge

Source: `2dbedcff702420a23a84b6138521f7a82245b9e5`, branch
`codex/evaluation-d0036-d0041`. Synthetic, evaluation-only coverage; **no
application, policy, weight, threshold, eligibility or public-runtime change**.

## Result and actual path

`intentFixture('balanced','manual')` supplies raw invented hotels/offers.
`runIntentRolePolicyBridgeV3` resolves V2 intent, evaluates the offers, verifies
them with `resolveEvaluatedOfferV3`, checks suitability/mandatory constraints,
projects computed dimensions, and invokes `runPersonalUtilityRolePolicyV3`.
`evaluateCandidate` establishes comparability before `upgradeRole` filters for
positive premium, coverage >= 0.6, Balanced experience gain >= 4 and marginal
value >= 2 points per 100 EUR. The new fixture injects no final score.

Manual Balanced remains Balanced with its intent policy inactive; the bridge
still records the user budget 450 EUR, three nights, two adults, one room and
150 EUR per room-night. No maximum distance is requested in the control.

| Synthetic comparison | Best Choice | Upgrade | Actual reason |
|---|---|---|---|
| A 200 / B 400 EUR | A | B | Experience 87.906081 / 94.042027; gain 6.135946; premium 200; marginal value 3.067973 |
| A 200 / B 500 EUR | A | B | Same gain; premium 300; marginal value 2.045315; existing Balanced soft overrun |
| A 200 / B 510 EUR | A | none | B remains comparable and soft-overrun; prospective marginal value 1.979337 < 2 |
| Same experience, B 400 EUR | A | none | No experience gain; greater cost alone is insufficient |
| Maximum Comfort, A 200 / B 400 | B | none | Primary already maximizes the relevant experience; no forced role |

The prospective 510 metric is a diagnostic calculation, not an emitted selected
Upgrade metric: the unavailable role correctly contains null metrics. Its four
stars do not override the failed marginal-value condition. Upgrade is not Best
Over Budget: 400 qualifies below budget, 500 qualifies above it, and 510 does
not qualify despite still being within the existing 15% soft-overrun bound.

## Negative evidence, binding and equivalence

An incomplete full total retains an observed display price and diagnostic
experience, but is not recommendable as Upgrade. Explicitly nonprivate required
bathroom and known distance-cap violation are ineligible/hard=false; unknown or
conflicting privacy and unknown required distance are incomplete/hard=null.
No substitution of missing facts with low quality or invented violations.

The unchanged historical F3 same-day multi-rate case verifies the non-picked
candidate's evaluated NRF offer-2 / 420, its non-refundable condition, snapshot,
dimensions and evidence. The alternative RFN offer-4 / 437 is not substituted
by a reduced-context re-selection. F3 is a binding control, not a new positive
Upgrade observation. Six identity/provider/order variants for each of four
cases preserve semantic roles, metrics, eligibility, explanation and classes.
Two identical Upgrade alternatives retain an equivalence class, null selected
ID and no arbitrary presentation representative. A true primary tie does not
force dependent roles.

## Frozen proof and validation

38 complete raw-input cases: 14 declared base/control variants plus 24 identity
permutations. They are not 38 independent market observations. All are serialized
and SHA-256 sealed before evaluator execution. The first targeted execution
passes **40/40**; no failing application result or numerical repair was needed.
The pre-existing V3-15 isolated numeric Upgrade test remains separate evidence.

`scripts/run-upgrade-bridge-synthetic-proof.mjs --synthetic-proof NEW_EXTERNAL_DIR`
reuses D-0048's proof for the original 187 D-0046 inputs and the D-0047/R1/D-0048
controls. All eight historical input/output files match the actual D-0048
PowerShell proof byte for byte: 186 executed, one unsupported strong-distance
exception NOT_EXECUTED_CONTEXT_CHANGED, zero changed results. Zero Upgrade in
that old grid was a coverage limit, not proof of a missing bridge. The new grid
has two positive base cases plus twelve corresponding invariance results.

Full canonical V3/V2 and required offline groups are run in an isolated committed
candidate excluding the seven developer paths. Actual Windows PowerShell 5.1
invocation and code/input hashes accompany exact exit codes in the delivery.
CurrentUser DPAPI checks there use only synthetic tests, not any real custody.
No dependency-registry audit or production release-environment authorization is
implied by these offline gates; `release:ci`/GitHub PASS is not claimed.

The delivered `Invoke-D0049-SyntheticProof.ps1` checks explicit HEAD and empty
staging, extracts that immutable Git tree to an isolated directory, and uses the
local installed compiler. No dirty, excluded, private or real inputs are loaded.
The historical D-0038 branch restriction is repaired by D-0045, not bypassed:
its explicit branch/HEAD/inventory/source/compiled bindings remain in full tests.

## Limits and next step

This proves bounded Upgrade coverage, not scientific calibration, full robustness,
regret, role-specific experience-floor relaxation, Best Over Budget or Golden
readiness. No real Bologna execution, human review, import/custody, provider,
training or public activation. Next: separately specify any further role-policy
robustness coverage; do not infer production or real-data authority from PASS.

Selective work-branch commit/push is authorized only after the gates. The delivery
records local/remote SHA, exact refspec, main unchanged and pending commit count.
Seven excluded paths, seventeen sealed D-0037 files and historical ZIPs remain
unchanged; no sealed manifest is regenerated.
