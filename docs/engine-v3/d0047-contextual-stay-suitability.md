# D-0047 — Contextual stay suitability (offline evaluation)

Source: `62fe765e9423bc8b9134c3eb16e94b72cfa46d62`, work branch
`codex/evaluation-d0036-d0041`. This supersedes only the evaluation behavior
described below, not the historical D-0046 evidence or public V2.

## Cause and narrow intervention

`comfortFlexibilityEngine.getContextualUnitTypeScore` deliberately returns null
for leisure/mixed without unit preferences. In D-0046 the shared unit is known,
but its room fit and comfort score are null. `personalUtilityRolePolicyV3`
renormalizes available dimensions. A high-review cheap dorm can therefore beat
private stays under manual Balanced, whose V2 numerical experience target is off.
This is not evidence that Balanced means consenting to a dorm.

`staySuitabilityContextV3` now supplies a distinct fact/expectation/eligibility
boundary inside `intentRolePolicyBridgeV3.prepare`, before the numerical role
policy and distance exception comparisons. Versions: bridge **@2**, suitability
**@1**. The existing numerical role-policy version, weights, curves, thresholds,
profile resolver and public V2 remain unchanged. The complete behavior is bound
by both evaluation versions and the code manifest, not the numerical version alone.

Four distinct objects remain visible: explicit/manual or automatic profile;
inferred contextual expectation; documented bound-offer facts; explicit mandatory
requirements and their verification. The contextual non-shared expectation is a
cautious recommendation rule, **not a human hard constraint**. Known shared units
are outside it; unknown/conflicting unit evidence is incomplete, not bad quality.
Explicit required/preferred shared units permit sharing unless another actual
requirement or contextual check prevents it. A small budget alone is not consent.
This rule applies to all profiles, not only Balanced, and may require abstention.

Unit evidence uses the existing classifier with name/category inference disabled,
first the F3 evaluated room text, then documented features. Bounded common private
room qualifiers are recognized; unrecognized text stays unknown. Hostel category
never vetoes a private offer. Property hotel category does not prove unit privacy
or a private bath. Explicit unit fit and mandatory privacy verification consume
the bound offer, not the property's shared inventory. Original V2 constraints
remain in the trace; `applicableConstraints` records the verified privacy projection.
Other mandatory features, exact costs, offer integrity and distance retain their
existing gates. Existing V2 aggregate merit is not globally rebuilt or retuned.

Private/shared/non-private/unknown/conflicting bathroom evidence is separate from
room sharing. Bathroom verification is pertinent when explicitly required or
preferred, or contextually for children, groups (3+ adults), business, long stays
(7+ nights), or a strong comparable market suggesting premium/luxury purchasing
power. These contexts reuse existing comfort/market semantics. An explicit avoided
private-bath preference prevents inferred private-bath requirements, not an actual
hard requirement. Nonpertinent missing bathroom evidence remains neutral and
unverified, never a certificate. The conservative contextual gate is not a new
public question and does not claim that all travelers share these expectations.

## Capacity, market and fallback

Budget is still normalized per room-night. Occupancy, guests per room and budget
per guest-night are reported separately, not used as per-person offer prices or
invented willingness to share. The same EUR 1500 means 500/125/125/31.25 per
room-night in the four frozen duration/room controls. Per-guest descriptors also
change. These are capacity controls with declared synthetic totals, not real
multi-room availability evidence or a claim that the winning stay must change.

The existing V2 market source/status/sample/confidence and level are retained.
Candidate fallback is **not** a supported premium expectation. Usable non-fallback
samples support only limited context; strong data supports a strong comparable
sample, never certainty about the whole market. No new luxury floor, minimum spend,
star preference or occupancy-specific market distribution is manufactured.

## Frozen synthetic evidence and concrete choices

29 cases and semantic expectations were SHA-sealed before correction/execution.
The unchanged D-0046 grid was re-executed from its immutable source beforehand:
187 scenarios, targeted 34/34 and D-0044 41/41 PASS. Both full frozen input files
are byte-identical before/after. Historical outputs remain in the new delivery;
previous packages and private artifacts are untouched. Supplemental regression
tests cover explicit private hostel requirements, negative bathroom text and fit.

| Invented control | Before | After / reason |
|---|---|---|
| Balanced, 1500 / 3 nights / 1 room | Shared dorm 90 | Private superior 650; shared unit contextually ineligible |
| Explicit shared preference | Shared dorm 90 | Shared dorm 90; no inferred private requirement overrides the preference |
| Private room in hostel | 300, legacy inventory says shared | 300, actual offer recorded private and comparable |
| Equivalent adequate private experience | 300 | 300; cheaper remains advantageous |
| Adequate modest private vs costly premium | 360 | 360; no automatic expensive/star winner |
| Low budget, documented modest private | 60 | 60; no premium standard imposed |
| Low budget, all shared, no shared preference | 60 | Abstention; no inferred sharing consent |
| Unknown unit / family-relevant unknown bath | 360 | 420; first proposal unverified, not zero quality |

In the main Balanced control the numerical metrics remain: dorm experience
87.635088 / utility 86.195088, private superior 88.401757 / 78.001757,
third private 79.163514 / 72.923514. The new gate prevents recommending the
high-utility shared unit; among admissible stays the unchanged policy chooses 650.
The remaining sacrifice is 560 more than the dorm, or 260 more than the third
private proposal, with 850 of budget unspent. This is not an objective-best claim.

Only five choice sets change in the frozen 187-case grid: shared-unit perturbations
in Balanced, Maximum Savings and same-day F3; premium/manual-Balanced (90→650);
premium/manual-Maximum-Savings (90→390). No historical assertion is weakened or
fixture amended. Contextual metrics/reasons and partial-reference denominators
are reported in the delivery, including unchanged cases.

**Separate unresolved issue:** Maximum Comfort's equal-experience 50m perturbation
still switches 300→400. It is not fixed incidentally. Upgrade positive assignments
remain **0** in this D-0046 grid before and after; this is not positive Upgrade
coverage or full robustness certification. The existing V2 intent aggregate still
contains its classification-confidence component. Full room luxury, unrestricted
text interpretation and complete multi-axis robustness are not claimed.

## Reproduction and safeguards

`node scripts/run-stay-suitability-synthetic-proof.mjs --synthetic-proof NEW_EXTERNAL_DIRECTORY`
has no real-input option. It uses the canonical TypeScript compiler, seals complete
inputs before evaluation, records code hashes, executes the actual bridge and runs
D-0047/D-0046/D-0044 tests. The delivery's PowerShell 5.1 command exports the exact
committed tree with local dependencies, excluding dirty private paths. Do not run
the full suite over unrelated local real-measurement pilot inputs.

Final full-gate logs, exact tree, selective commit, remote SHA and still-local
commit count are recorded in delivery evidence, not inferred from this document.
The seven excluded paths, seventeen D-0037 sealed files, packages and progress
remain unchanged. No provider, real dataset, public integration, Golden admission,
main publication, force push, fetch or deployment is part of this phase.
