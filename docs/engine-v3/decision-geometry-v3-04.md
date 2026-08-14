# StayOpti Engine V3-04: Decision Geometry

## Status and rollout

V3-04 is an offline/shadow decision layer. It does not replace the certified V2
ranking, the V2 recommendation roles, or the public Pareto status. It does not
publish V3 cards and it does not evaluate or reveal a Split card.

Public V3 and Split promotion remain blocked by the V3-02 public-rate consistency
gate and by the later calibration, robustness, explanation, evaluation, and rollout
gates.

## Comparison firewall

Decision Geometry may compare two candidates only when all of these conditions
hold:

- both candidates are eligible;
- both have a complete canonical stay cost in the same currency;
- both have every configured non-price benefit dimension;
- both peer assignments explicitly allow direct comparison;
- each peer assignment contains the other candidate.

An exact or compatible V3-03 peer cohort can authorize a direct comparison. A
declared fallback or unavailable cohort cannot. Missing data, provisional cost,
unknown currency, or incompatible offer semantics produce `unknown` or
`incomparable`; they never produce a loss.

The geometry uses these seven axes:

- `totalCost`, lower is better;
- `quality`, higher is better;
- `location`, higher is better;
- `comfort`, higher is better;
- `flexibility`, higher is better;
- `categoryFit`, higher is better;
- `userFit`, higher is better.

The six benefit axes use the V3-03 diminishing-return transforms. The aggregate
`priceValue` score is deliberately not a Pareto axis because `totalCost` is already
explicit; including both would count price twice.

Confidence controls evidence availability but is not added to or subtracted from
hotel value. Risk adjustment remains a separate V3-05 responsibility.

## Strong and weak Pareto definitions

V3-04 exposes two nested mathematical frontiers with explicit definitions:

- the **strong Pareto frontier** contains candidates for which no direct peer is no
  worse on every axis and materially better on at least one axis;
- the **weak Pareto frontier** contains candidates for which no direct peer is
  materially better on every axis.

Therefore the strong frontier is a subset of the weak frontier. A relation tagged
`pareto-non-worse` removes a candidate from the strong frontier. A relation also
tagged `strict-all` removes it from both frontiers.

The frozen V3-04 engineering tolerances are:

- benefit non-worse tolerance: 0.25 transformed points;
- material benefit improvement: 1 transformed point;
- cost equality tolerance: 0.01 currency unit;
- material cost improvement: the greater of 1 currency unit or 0.5% of the
  dominated price;
- pairwise utility equivalence tolerance: 0.25 utility points.

These are versioned comparison tolerances, not public marketing claims and not
final outcome-calibrated policy thresholds.

## Dominance and elimination evidence

Every dominance relation records:

- dominant and dominated hotel IDs;
- compared, better, and equivalent dimensions;
- whether the relation is `pareto-non-worse`, `strict-all`, or both;
- the decisive dimension with the largest normalized advantage;
- deterministic reason codes.

Every candidate records its strong and weak Pareto status, its dominators, the
alternatives it dominates, and the primary variable that caused elimination. A
candidate with insufficient evidence has no dominator and no elimination variable.

## Pairwise finalist comparison

Strong-frontier candidates enter deterministic pairwise comparisons. A Pareto
relation decides the comparison first. If neither candidate dominates, the V3-03
personal utility difference determines `first-preferred`, `second-preferred`, or
`utility-equivalent`. The decisive variable is the largest positive weighted
contribution for the preferred option.

Pairwise output remains analysis evidence. It cannot reorder the public V2 result
during shadow mode.

## Marginal value and diminishing returns

Within each direct peer cohort, strong-frontier candidates are ordered by complete
total stay cost. Adjacent points produce:

- incremental cost;
- incremental personal utility;
- utility gained per currency unit;
- utility gained per 100 currency units;
- the marginal trend.

The trend is `baseline`, `increasing-return`, `stable-return`,
`diminishing-return`, or `negative-return`. Diminishing returns are detected from a
lower marginal slope than the preceding efficient segment; no provider or
commercial input participates.

## Saving, upgrade, and maximum sensible price

V3-04 does not invent a fixed euro value for one utility point. It derives monetary
thresholds by inverting the same monotone V3-03 budget utility curve used for the
candidate decision.

For a target candidate against a direct peer, the engine holds the target's
non-price evidence constant and solves for the price at which its personal utility
equals the peer's current personal utility. This produces:

- maximum sensible price for the higher-cost option;
- maximum justified upgrade premium;
- maximum sensible price for the lower-cost option;
- minimum saving required to accept the lower-value option;
- current saving and premium verdicts.

The solver is deterministic and uses bounded bisection on the documented budget
curve. It returns one of four honest states:

- `available`: a finite switch price exists;
- `unattainable`: the candidate cannot match the peer even near zero price;
- `unbounded-by-utility`: non-price value remains higher after the price component
  reaches zero, so the model cannot claim a finite maximum;
- `unavailable`: there is no compatible real budget/currency/peer comparison.

Only `available` thresholds count as exact. Unavailable or unbounded cases do not
receive an invented cap.

## Internal decision map

The internal-only map assigns each candidate to one evidence-backed zone:

- `saving-edge`;
- `efficient-frontier`;
- `diminishing-returns`;
- `unsupported-premium`;
- `dominated`;
- `insufficient-evidence`.

This map is part of the reproducible decision trace. It is not an MVP visualization
and is not exposed to users in V3-04.

## Contract, replay, and commercial neutrality

V3-04 advances the engine, decision schema, policy, evidence schema, and V2 adapter
to revision 4 and adds a versioned `decisionGeometry` fingerprint. The decision
trace references the exact geometry evaluation ID. Replay fingerprints include the
geometry result and the frozen geometry module version.

The commercial firewall remains strict. Commission, markup, revenue, provider
priority, and provider identity cannot affect Pareto, pairwise, marginal value,
thresholds, or the decision map.

## Explicitly deferred

V3-04 does not implement risk-adjusted utility, sensitivity, expected regret,
near-tie policy, abstention, or constraint relaxation; those belong to V3-05. It
does not add contextual travel-time, room value, or friction calibration from
V3-06, and it does not publish the ten-second narrative from V3-07.

SPLIT remains hidden and not evaluated until reliable nightly/segment prices,
availability, recheck evidence, quality equivalence, switching cost, added risk,
friction, and material net saving are all proven. Its first public form remains an
explicit optional final card with exactly two contiguous segments and at most one
accommodation transition; it never silently replaces Best Choice.
