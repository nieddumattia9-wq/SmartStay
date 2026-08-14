# StayOpti V3-12A — V3-10F Root-Cause Report

Status: frozen diagnostic  
Scope: 3-case pilot plus 12-case blind batch  
Public impact: none

## Observed evidence

The real-case evaluation produced fifteen usable diagnostic comparisons:

| Outcome | Count |
|---|---:|
| V2 preferred | 6 |
| V3 preferred | 1 |
| Identical selection/tie | 8 |
| Total | 15 |

All five divergent `comfort` or `maximum-comfort` cases preferred V2. The only V3 win occurred in a `balanced` case where a modest extra cost bought better reviews, refundability, flexibility and lower risk.

This sample is too small for a superiority claim. It is sufficient to identify a repeatable failure pattern and block promotion.

## Data-path findings

The failure pattern is not explained by missing profile propagation or incorrect blind binding:

- the resolved profile reaches V3;
- budget, duration, distance and selected total cost reach Personal Utility;
- the blind packet is bound to the exact selected offer;
- public projection binding passed;
- V2 public behavior remained unchanged;
- V3 remained non-authoritative;
- SPLIT remained disabled.

## Primary root cause: universal under-budget reward

The current `createBudgetUtilityV3` implementation applies the same under-budget curve before profile weighting:

```text
budget utility = 100 - 35 * (total cost / total budget)^1.35
```

For any two valid offers below budget, the cheaper offer receives higher budget utility merely because it leaves more money unused. Profile weights reduce or amplify the signal, but they do not change its meaning.

That meaning is coherent for a savings-first objective. It is not coherent as a universal objective for comfort-first profiles, where budget is primarily a ceiling used to obtain the best fitting experience.

The new diagnostic test deliberately reproduces this current behavior. V3-12A does not change the formula; the future V3-15 policy candidate must replace the objective and update the diagnostic expectation under a new policy version.

## Secondary cause: premium-quality compression

The current diminishing-returns transformation compresses differences near the high end. A material experience difference can therefore contribute a small numerical delta, while a large price difference remains highly visible through budget and price/value signals.

This must not be corrected by blindly increasing one weight. V3-15 must model profile-specific objectives, interactions and explicit quality-loss tolerances.

## Role defect

The independent candidate runtime selects one V3 candidate and derives a public role relative to the V2 choice. A substantially cheaper candidate can therefore be a credible `best-sensible-saving` while still being presented in a pairwise comparison against V2 `best-choice`.

One founder judgment explicitly identified this pattern: the comfort-first V2 option was the preferred Best Choice, while the cheaper V3 option was considered a valid cheapest/saving alternative.

The V3-12B protocol must generate and compare a portfolio by role rather than relabel one primary candidate after selection.

## Robustness limitation

Robustness evaluates perturbations around the supplied objective. If that objective rewards the wrong thing, robustness can confirm a stable but semantically wrong decision. Robustness is therefore necessary but cannot validate the objective itself.

## Frozen conclusions

1. The current V3 must not be promoted.
2. V2 remains public and is preserved as fallback.
3. The fifteen cases are diagnostic fixtures, not final ground truth.
4. No threshold is tuned in V3-12A.
5. Best Choice, Saving, Upgrade, Split and Abstention require separate semantics and evaluation questions.
6. The correct fix belongs to V3-15 after Decision Science Library and Curriculum work, not to an immediate weight patch.

## Falsification path

The diagnosis must be reconsidered if a future replay demonstrates that:

- the profile or exact offer was not actually bound as recorded;
- the divergence disappears when roles are compared like for like;
- the comfort-first losses are explained by a missing decisive experience fact;
- a larger blinded sample contradicts the observed segment pattern.

Until then, the pattern is a blocking diagnostic regression.

