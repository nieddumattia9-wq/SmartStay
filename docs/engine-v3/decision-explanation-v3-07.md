# StayOpti Engine V3-07: Decision Explanation in ten seconds

## Status and rollout

V3-07 adds a deterministic Decision Thesis layer above the V3 utility,
geometry, robustness and contextual evaluations.

The layer is shadow-only:

- `rankingApplication: shadow-only`;
- `publicPresentation: disabled`;
- `publicGate.status: pending-blind-comprehension`;
- `publicGate.copyEnabled: false`.

It does not change the certified V2 ranking, recommendation roles, public
cards, booking handoff or Split visibility.

## The six-statement thesis

The engine emits no more than six semantic statements:

1. the recommended choice, or an honest abstention;
2. the main comparative reason;
3. the main sacrifice;
4. the best evidenced alternative;
5. the exact condition that would change the choice, when available;
6. the relevant uncertainty or stability result.

Each statement is a typed claim with a localization key. The engine does not
generate free prose and does not expose internal utility scores as decorative
precision.

## Evidence-to-copy alignment

Every available claim must contain:

- at least one source `evidenceId`;
- at least one deterministic `derivationId` from geometry, robustness,
  contextual value, a pairwise comparison or an exact threshold;
- a stable `claimId`;
- an entry in `copyEvidenceLinks`.

If either evidence or derivation is missing, the claim becomes `unavailable`.
It cannot retain a message, a number or an implied factual assertion.

This preserves a one-to-one path:

`public semantic claim -> evidence IDs -> deterministic decision artifact`

The V3 contract verifies the explanation fingerprint, source evaluation IDs,
hotel-to-solution mapping and Decision Trace reference.

## Comparative explanations

The primary reason and sacrifice are relative to the best evidenced
alternative. They are not generic hotel descriptions.

Supported public numeric facts are deliberately narrow:

- absolute stay-cost difference with currency;
- direct travel-time difference in minutes;
- exact switch price derived from the utility curve;
- verified constraint-relaxation amount.

Straight-line distance cannot become travel time. A non-exact threshold cannot
be rounded or rewritten as an exact counterfactual.

## Uncertainty and abstention

The explanation keeps these states distinct:

- indistinguishable near-tie;
- insufficient evidence;
- no good option;
- unstable choice;
- recheck required;
- material evidence gap;
- stable under the tested deterministic scenarios.

An abstention has no recommended hotel or recommended solution. The engine
does not force a winner to fill the thesis.

## Numeric confidence policy

V3-07 exposes:

- `publicNumericConfidence: null`;
- `publicPercentageCount: 0`;
- `uncalibratedPercentagesAllowed: false`.

Scenario win rates, internal risk-adjusted utility and raw confidence values
remain internal. A public confidence percentage requires a later calibrated
policy and cannot be inferred from deterministic scenario counts.

## Determinism and integrity

The explanation is stable under candidate and evidence-order permutations.
The fingerprint covers all six claims, evidence links, public gates, numeric
policy and source evaluation references. Post-evaluation copy mutation fails
validation.

The Decision Trace records `decisionExplanationEvaluationId`, and the V3
contract requires it to match the attached thesis.

## Promotion gate

Public copy stays disabled until all of the following are complete:

1. blind comprehension testing demonstrates that users understand choice,
   reason, sacrifice, alternative, switch condition and uncertainty;
2. every visible phrase remains aligned with its evidence IDs;
3. confidence labels or percentages, if introduced later, are calibrated;
4. Golden Dataset and adversarial tests show no fabricated or contradictory
   explanation;
5. public-rate consistency and recheck/handoff gates are closed.

Until then, V2 remains the public fallback. V3-07 is an auditable shadow
artifact only, and Split remains hidden.
