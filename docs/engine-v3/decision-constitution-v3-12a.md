# StayOpti V3-12A — Decision Constitution

Version: `3.0.0-decision-constitution.1`  
Status: diagnostic freeze  
Date: 2026-08-14  
Public authority: Engine V2 only

## Purpose

StayOpti evaluates a complete `StaySolution`, not an abstract hotel. The solution includes the property, room, occupancy, exact offer, total cost, taxes, conditions, location, evidence, risk and, only when separately authorized, a verified split configuration.

The North Star is the probability that, after the stay, the user would make the same choice again knowing the alternatives that were genuinely available at decision time.

## Objective hierarchy

1. Enforce hard constraints, offer integrity and bookability.
2. Resolve declared and inferred intent without hiding uncertainty.
3. Maximize the experience coherent with that user's profile.
4. Evaluate opportunity cost and marginal value.
5. Build separate Choice, Saving, Upgrade and Split roles.
6. Evaluate evidence, risk, robustness and confidence.
7. Abstain when the evidence does not justify a recommendation.

## Budget principle

Unspent budget is not an intrinsic benefit. It becomes a benefit only when saving does not cause a material loss in the experience the user is seeking.

For `maximum-comfort` and `comfort`, the budget is primarily a ceiling. Price may break a genuine near tie or express calibrated opportunity cost, but it cannot automatically reward unused budget.

For `balanced`, cost and experience are an explicit marginal-value trade-off.

For `savings` and `maximum-savings`, lower cost is an objective only after hard constraints and the applicable minimum experience floor.

## Profile semantics

| Profile | Primary objective | Price semantics |
|---|---|---|
| Maximum Comfort | Best coherent experience within budget | Ceiling and light tie-breaker |
| Comfort | Comfort, room, location and quality within budget | Ceiling plus calibrated opportunity cost |
| Balanced | Best overall trade-off | Material marginal-value signal |
| Savings | Lower cost without crossing the experience floor | Cost priority after the floor |
| Maximum Savings | Lowest valid cost | Strong cost priority after the non-negotiable floor |

## Public roles

- `best-choice`: the best profile-coherent experience within budget and constraints.
- `best-sensible-saving`: the largest saving whose experience loss is explicitly acceptable.
- `worthwhile-comfort-upgrade`: a material experience gain that justifies its extra cost.
- `split-saver`: a verified multi-stay whose net value remains material after friction and risk.
- `abstention-near-tie`: no forced recommendation when evidence or separation is insufficient.

Roles answer different questions. A Saving or Upgrade candidate cannot be evaluated as Best Choice without an explicit, evidence-backed proof that the role boundary has disappeared.

## Permanent invariants

1. Expanding the budget cannot make a comfort-first profile choose a worse experience solely because it is cheaper.
2. A free material improvement cannot worsen the decision.
3. A dominated solution cannot be Best Choice.
4. Saving cannot replace Choice without proof of negligible experience loss.
5. Different profiles may select different solutions from the same candidate set.
6. Missing evidence cannot become an invented negative fact.
7. Blind evaluation must compare the same role on both sides.
8. Commission, markup, provider priority, revenue, click probability and user commercial value cannot influence ranking.

## Runtime freeze

- V2 remains the only authoritative public engine and emergency fallback.
- V3 may run only in `off` or non-authoritative `shadow` mode.
- SPLIT remains disabled.
- Automatic promotion remains prohibited.
- V3-12A changes no ranking threshold or public result.

## Evidence status

The fifteen existing founder judgments are diagnostic evidence, not a Golden Dataset and not automatic ground truth. They may expose failure modes and become regression fixtures, but they cannot authorize policy tuning after results, public promotion or a superiority claim.

## Change control

Any future constitution revision must receive a new version and must document:

- the proposition changed;
- the evidence that motivated it;
- affected profiles and roles;
- new or changed invariants;
- expected counterexamples;
- required human and automated gates;
- whether the change affects policy, schema or public eligibility.

