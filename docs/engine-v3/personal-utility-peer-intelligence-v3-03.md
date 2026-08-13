# StayOpti Engine V3-03: Personal Utility and Peer Intelligence

## Status and rollout

V3-03 is an offline/shadow decision layer. It does not replace the certified V2
ranking and it does not publish V3 or Split cards. Public promotion remains blocked
by the V3-02 public-rate consistency gate and by the later V3 calibration gates.

## Personal preference contract

The contract keeps three states separate:

- `declared`: an explicit valid manual preference;
- `inferred`: a valid automatic preference or a contextual inference;
- `neutral-default`: `balanced`, with no claim that the user expressed it.

Declared and inferred preferences are never merged into one opaque source. A
declared preference wins over contextual inference. Unknown values fall back to a
neutral default rather than creating a new profile ID.

The only profile IDs are the five existing product profiles:

- `maximum-comfort`;
- `comfort`;
- `balanced`;
- `savings`;
- `maximum-savings`.

## Utility behavior

Utility remains on a bounded 0-100 internal scale and is evaluated across price
value, quality, location, comfort, flexibility, category fit and user fit.

The following properties are explicit and regression-tested:

1. Higher dimension evidence never lowers that dimension's transformed value.
2. Gains diminish near the top of the scale.
3. A maximum budget is not a spending target.
4. For otherwise identical stays, a more expensive option never receives a higher
   budget utility merely because it uses more of the available budget.
5. Missing dimensions remain unavailable; they are not converted into zero quality.
6. Evidence coverage and score confidence remain separate from utility.
7. Hotel identity and input order do not change the score.

For an in-budget option with utilization `r = totalCost / totalBudget`, budget
utility is monotone decreasing in cost. Above budget, a steeper nonlinear penalty is
applied. Marginal-value and maximum-sensible-price decisions remain V3-04 work.

## Context interactions

V3-03 applies documented weight interactions rather than independent point bonuses:

- budget x duration for long stays;
- distance x trip type;
- flexibility x lead time;
- room/category/user fit x group composition.

The interaction trace records every changed dimension and delta. Context changes
that are not part of these rules cannot alter utility.

## Peer Intelligence

Every analyzed hotel receives exactly one peer assignment. Cohorts are built only
from offers with the same stay scope, destination, currency and usable total cost.

Modes:

- `exact-context`: same category, unit and compatible offer semantics;
- `compatible-context`: explicitly compatible category/unit plus compatible room,
  meal and cancellation semantics;
- `declared-fallback`: a broader same-search reference set that may contain
  incompatible categories and therefore cannot authorize direct comparison;
- `unavailable`: insufficient comparable evidence.

Unknown meal or cancellation semantics cannot authorize direct comparison. Search
scope, destination or currency mismatches are excluded. Cross-category fallback is
always labeled and `directComparisonAllowed` is false.

Peer output includes deterministic membership, exclusions with reason codes,
sample size, confidence and medians for total cost, quality and distance. Medians
are descriptive evidence only; V3-03 does not yet apply Pareto, dominance or
marginal-value elimination.

## Contract and auditability

The V3 decision now contains:

- one versioned preference resolution;
- one utility evaluation per analyzed hotel;
- one peer assignment per analyzed hotel;
- stable fingerprints for every utility and peer artifact;
- exact trace references for those artifacts;
- `rankingApplication: shadow-only`.

Validation rejects duplicate/missing coverage, preference contradictions, mutated
fingerprints and any fallback that is changed to permit direct comparison. The
recursive commercial firewall still rejects commission, markup, revenue and
provider-priority fields anywhere in the decision.

## Gate result expected from the patch runner

- Engine V2 regression suite: 196/196 PASS;
- Engine V3 suite: 39/39 PASS;
- TypeScript typecheck: PASS;
- production build: PASS;
- provider live calls: zero;
- deploys: zero.
