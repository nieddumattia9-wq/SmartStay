# StayOpti Engine V3-08 — Search-wide Scale & Coverage

## Status

V3-08 is an internal, deterministic and shadow-only scale layer. It does not
change V2 ranking, public recommendation cards, provider selection, booking,
analytics or the public Results experience.

Public V3 presentation remains disabled. Public-rate consistency and recheck
continuity for LiteAPI/Nuitee remain independent mandatory gates. SPLIT remains
contract-only and no Split card is created by this phase.

## Problem

A precise decision over a small or unknown sample is not automatically a good
search-wide decision. V3-08 therefore records the exact analyzed scope and
tests whether a bounded coarse-to-fine plan can preserve the full-computation
result across thousands of structures and offers.

The phase must never convert an incomplete provider result into a market-wide
claim. The strongest permitted scope labels are:

- `complete-source-result-set`, when an explicit reported source total exactly
  matches the analyzed set;
- `partial-source-result-set`, when the source reports a larger total;
- `current-analyzed-set`, when source completeness is unknown.

Every form keeps `marketCoverageClaimAllowed=false` and the fixed scope label
`analyzed-set-not-market`.

## Coarse-to-fine plan

Each candidate supplies:

- eligibility;
- a conservative lower and upper decision-score bound, or no bound;
- the full shadow score used only to audit equivalence;
- evidence coverage;
- whether an existing policy role protects the candidate.

The plan always retains:

1. existing policy finalists;
2. eligible candidates without safe bounds;
3. every candidate whose upper bound can still enter the finalist band;
4. every candidate whose upper bound can still be a strong alternative under
   the frozen tolerance.

Only ineligible candidates or candidates whose upper bound is provably below
the safe cutoff may be pruned. Missing evidence never becomes a disadvantage.

## Frozen shadow tolerances and budgets

The first V3-08 policy freezes:

- full-result equivalence tolerance: `0.5` decision points;
- strong-alternative band: `2` decision points from the full best score;
- target fine evaluations: `128`;
- maximum fine evaluations: `1,024`;
- maximum candidates: `50,000`;
- deterministic estimated working memory: `64 MiB`;
- deterministic coarse-operation budget: `2,000,000` operations.

These are shadow engineering limits, not calibrated user-facing claims. The
estimated working-memory model is deterministic and regression-testable;
platform-specific latency and real heap measurements remain mandatory before
canary or public promotion.

## Equivalence and safety gate

The phase passes only when:

- the best planned result is within the frozen tolerance of full computation;
- no strong alternative is lost;
- every observed full score lies inside its declared coarse bounds;
- fine-evaluation, operation, candidate and estimated-memory budgets all pass.

If full scores are unavailable, the evaluation is `unavailable`, not PASS. If
a bound is contradicted, an alternative is lost or a budget is exceeded, the
evaluation is `blocked`. A blocked evaluation remains a valid audit artifact
but cannot authorize runtime pruning.

## Search-wide context and scarcity

Relative scarcity is descriptive only of the current analyzed set. It cannot
create urgency, imply market exhaustion or be used as a commercial ranking
signal. The output therefore freezes:

- `scarcityBasis=current-analyzed-set-only`;
- `commercialUrgencyClaimAllowed=false`;
- `rankingApplication=shadow-only`;
- `runtimeApplication=shadow-plan-only`;
- `publicPresentation=disabled`.

## Determinism and integrity

Candidate order cannot change the plan, retained set, equivalence audit,
evaluation ID or fingerprint. Duplicate hotel identities and contradictory
source totals are rejected before planning. The V3 decision contract requires
V3-08 to cover every analyzed hotel exactly once and links its evaluation ID
into the internal Decision Trace.

## What this phase does not claim

V3-08 does not prove total market coverage, production latency, calibrated
confidence, cross-provider completeness or public readiness. It creates and
tests the safe scale mechanism needed before those later evaluation and rollout
gates.
