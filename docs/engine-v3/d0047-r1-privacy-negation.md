# D-0047 R1 — Scoped privacy negation at the evaluation boundary

Source: `627f2fd8f07d9f8a744b8634d0508cd450e6f745` on
`codex/evaluation-d0036-d0041`. D-0047 is retained, not amended. This repair
supersedes only its bounded privacy recognizer; the Balanced correction stays.

## Demonstrated failure before repair

The new PN01 regression clones the historical `bath-unknown-required` synthetic
case, retains required `private-bathroom`, empties the first property's amenities
and facilities and changes its first offer's room text to
`Private room without a private bathroom`. The complete
`runIntentRolePolicyBridgeV3` previously returned PRIVATE bathroom, hard=true,
eligible suitability and that offer as Best Choice. Its initial input, full output,
code hashes and failing test log are retained in the R1 delivery.

The old bathroom matcher stripped only three exact negations. An intervening
article, en-suite variant or postposed negation left an affirmative substring.
Unit classification likewise saw `private room` inside `No private room`.
This is an evidence-polarity defect, not a quality-weight or budget-policy defect.

## Repair and propagation

`staySuitabilityContextV3.privacyEvidence` classifies each occurrence before
passing affirmative unit phrases to the existing canonical unit classifier.
Feature boundaries keep private-room and bathroom evidence independent. Bounded
English/Italian articles, prefix denial and postposed unavailability are supported.
Non-pertinent negation such as `Private room, no breakfast` does not negate privacy.
Conditional, uncertain and unrecognized assertions remain UNKNOWN. Contradictory
affirmative/negative or private/shared evidence is CONFLICTING, never a certificate.

The evaluated offer's explicit unknown, negative or conflicting statement cannot
be erased by positive generic property features. Fallback is allowed only where
the offer is silent about the feature. A property category/name cannot fill it.
No private room is NOT_PRIVATE with unitType=unknown: no shared-room type is
invented. A confirmed shared bathroom can remain SHARED alongside a compatible
denial of a private bathroom.

`evaluateStaySuitabilityV3` rejects known nonprivate units outside the existing
nonshared context; that contextual mismatch alone is not a fabricated human hard
constraint. Explicit shared permission does not identify an undocumented shared
unit type. `intentRolePolicyBridgeV3.prepare` carries known nonprivacy into actual
required-unit and private-bath constraints; missing/conflicting data remains
unverified. The unchanged role policy sees these gates before selecting any role.

Evaluation versions are suitability **@2** and bridge **@3**. There is no change
to numerical weights, curves, thresholds, distance, Maximum Comfort, Upgrade,
public V2, public runtime, Golden gates or D-0037's seventeen sealed files.
No provider, real data, custody, collection or private progress is accessed.

## Synthetic proof and limitations

The R1 suite contains 34 tests: the exact bridge reproduction; 26 polarity cases;
fallback, explicit-unit, sharing, ambiguity, abstention, provider/order invariance
and contextual-vs-hard-constraint controls. Every negative required bathroom is
non-recommendable; all roles exclude the reproduced invalid proposal. UNKNOWN is
not transformed into a verified violation or low quality.

The initial expanded suite was 9 PASS / 24 FAIL. One supplementary invariance
test had an independent fixture error: noncanonical offer IDs were rejected by
`hotelOfferSelection.hasPublicOfferId`, and changing hotel names changed category
evidence. It now varies provider and valid opaque IDs/order only, preserving its
strict semantic assertions. Initial logs are retained; no historical fixture or
assertion was changed. The 26 polarity inputs are byte-identical before/after.

All 29 frozen D-0047 controls and 187 D-0046 scenarios are compared against the
pre-R1 results. Semantic decisions/metrics are unchanged outside the new negation
cases (version/fingerprint changes are explicit). This includes Balanced, private
hostel, explicit sharing, the unresolved Maximum Comfort 50m switch and the grid's
zero positive Upgrade assignments. Neither unrestricted language understanding
nor full robustness or real-world validity is claimed.

Run the new synthetic-only runner using the delivered, tested PowerShell command:
`node scripts/run-stay-privacy-negation-synthetic-proof.mjs --synthetic-proof NEW_EXTERNAL_DIRECTORY`.
It exports full invented inputs before evaluation, actual bridge outputs and test
results. The delivery command uses the exact committed tree and local dependencies,
excluding the seven preserved developer/private paths. It has no real-input mode.

Full clean-checkout gate results, the initially red regression, code/fixture
inventory, selected commit and observed remote state are in the R1 Evidence ZIP.
Dependency-registry audits and production-release environment checks require
separate network/production authority and are not claimed as offline PASS.
Only the explicitly authorized work branch may receive the two-commit succession;
main is not changed. Every delivery reports push status and any still-local commits.
