# StayOpti Engine V3-05: Risk, Robustness, Regret and Smart Abstention

## Status and rollout

V3-05 is an offline/shadow decision layer. It does not replace the certified V2
ranking, recommendation roles, cards, or public booking path. Public V3 promotion
remains blocked until the LiteAPI/Nuitee public-rate and price-continuity gate is
closed with evidence and the later explanation, evaluation, calibration, canary,
and rollback gates pass.

Temporal Optimization and the Split card remain hidden and not evaluated. V3-05
supplies risk and robustness primitives that V3-08 will later reuse; it does not
prematurely recommend a split.

## Risk and uncertainty remain separate

V3-05 preserves the Source of Truth distinction:

- **choice risk** describes the chance that a stay is problematic;
- **evidence strength** describes how well the utility estimate is supported;
- **uncertainty width** describes the plausible downside around that estimate.

The canonical risk floor is derived from offer facts such as conflicting or
incomplete costs, unknown taxes, non-refundable pay-now conditions, stale or
unbookable offers, and recheck requirements. The existing V2 choice-risk score is
retained as an independent source signal. The final choice-risk score is the
greater of the V2 score and the canonical floor, preventing both silent risk loss
and double-counting of the same concern.

Risk-adjusted utility is:

`personal utility - calibrated choice-risk penalty`

Evidence weakness is not added to the choice-risk score. It creates a separate
downside utility and powers the evidence-downside scenario.

## Deterministic sensitivity scenarios

The fixed V3-05 scenario set is:

1. baseline;
2. budget -10%;
3. budget +10%;
4. savings weight +25%;
5. quality weight +25%;
6. location weight +25%;
7. comfort weight +25%;
8. flexibility weight +25%;
9. evidence downside.

Budget scenarios recompute the same V3-03 no-spend-bias budget curve. Preference
scenarios reweight the existing transformed dimension scores and renormalize only
over available dimensions. The evidence-downside scenario lowers uncertain
evidence without inventing missing values.

Scenario comparisons are restricted to the selected anchor and mutually declared
direct peers from V3-04. Incompatible fallback cohorts never become a global
tournament merely because V3-05 exists.

## Robust choice and expected regret

For each comparable candidate V3-05 records:

- scenario win rate;
- expected regret in utility points;
- maximum scenario regret;
- robust choice score;
- risk-adjusted and downside utility.

Expected regret is the average gap between a candidate and the best candidate in
each evaluated scenario. Robust Choice combines scenario stability, regret
protection, and evidence strength. It remains internal and is not an hotel-quality
score.

## Near ties, no-good options and abstention

Near ties are detected from risk-adjusted utility. A near tie is informative but
does not automatically force abstention. Abstention is reserved for:

- no feasible usable solution;
- deliberately insufficient evidence;
- a genuinely no-good option set;
- alternatives indistinguishable inside both utility and robustness tolerances;
- a materially unstable choice where the robust winner contradicts the current
  anchor.

A single strong, well-supported option is not rejected merely because there is no
second direct peer. This protects coverage and prevents excessive conservatism.

V3-05 emits an internal recommendation policy while the public V2 decision remains
unchanged in compatibility mode.

## Constraint relaxation without invented advice

The constraint-relaxation selector accepts only externally evaluated alternatives
with a verified expected improvement. It chooses the largest improvement per
normalized constraint change, with deterministic tie-breaking.

When no verified alternate search exists, the result is `unavailable`. V3-05 does
not invent “add 50 euro” or “increase distance by 1 km” from a static candidate
set. Runtime alternate-search orchestration remains a later integration task.

## Contract, replay and neutrality

V3-05 advances engine, decision schema, policy, evidence schema, and V2 adapter to
revision 5. The decision contains a versioned robustness evaluation and the
internal trace references its evaluation ID. Input, config, and decision replay
fingerprints include the V3-05 result and module version.

Commission, markup, revenue, affiliate data, provider priority, and provider
identity do not enter risk, sensitivity, regret, abstention, or relaxation.

## Explicitly deferred

V3-06 owns contextual travel time, room value, payment timing value, flexibility
value, group/long-stay utility, friction, and convenience. V3-07 owns the public
ten-second explanation. Calibration of thresholds on Golden Dataset, blind tests,
expert evaluation, and real outcomes occurs in later gates.
