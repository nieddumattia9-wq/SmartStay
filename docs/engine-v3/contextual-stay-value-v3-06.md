# StayOpti Engine V3-06: Contextual Stay Value

## Status and rollout

V3-06 adds a deterministic, evidence-gated layer for location, room,
flexibility, group/long-stay context, decision friction, and convenience.
The layer is internal and shadow-only. It does not change the certified V2
ranking, recommendation roles, public cards, or booking path.

Every V3-06 evaluation records:

- `rankingApplication: shadow-only`;
- `publicPresentation: disabled`;
- `decisionGainGate.status: pending-golden-dataset`;
- `rankingEnabled: false` and `publicCopyEnabled: false`.

Signals can be measured offline, but none can influence ranking until it
demonstrates decision gain on the Golden Dataset and real evidence-backed cases.
The public V3 gate also remains blocked by the LiteAPI/Nuitee public-rate and
price-continuity validation.

Temporal Optimization and the Split Saver card remain hidden and not evaluated.
V3-06 supplies contextual primitives that a later temporal optimizer can reuse;
it does not fabricate or publish a split.

## Trip-specific location

V3-06 evaluates verified travel time to points that matter for the trip.
Supported direct sources are a routing engine, a transit timetable, or an
explicit provider travel-time field. Each point has its own category,
importance, mode, confidence, and evidence IDs.

Straight-line distance is retained only as a fallback fact. It cannot become a
travel time, cannot activate the travel-time signal, and does not penalize an
option when direct routing evidence is absent.

Trip type changes the relative importance of point categories. Destination
adjustments are applied only when an explicit user-declared or calibrated
destination context provides evidence-backed weight overrides. City names do
not trigger stereotypes or hidden weights.

## Room upgrade intelligence

An upgrade comparison is eligible only when both room offers are:

- bookable;
- in the same currency;
- covered by the same stay/occupancy/condition fingerprint;
- supported by a structured room tier, not a name-only inference;
- priced with a known stay total.

The output retains the premium amount, premium ratio, tier gain, verified
attribute gain, preference-specific maximum premium ratio, and verdict.
An over-priced upgrade remains visible internally as `not-worthwhile`; it is
never promoted merely because its room name sounds better.

The premium limits are frozen shadow policy constants. They are not public
claims and remain ineligible for ranking until calibrated by the V3-06 gate.

## Cancellation and payment timing value

The cancellation layer separates three concepts:

1. protected amount supported by known cancellation terms;
2. protection score relative to the real stay total;
3. expected monetary value.

Expected cancellation value is computed only when a change probability is
explicitly user-declared or supplied by a calibrated model with evidence. A
refundable label alone never creates a probability.

Pay-later value is computed only when payment timing, deferral days, and an
explicit user-declared or calibrated annual value rate are all available. If
payment timing is unknown, the output stays unknown rather than assuming pay-now
or pay-later. Cross-currency cancellation penalties are not monetized.

## Group, family, long-stay, and destination context

Verified property capabilities can create internal utility interactions for:

- kitchen, laundry, workspace, and air conditioning on long stays;
- family rooms, private bathrooms, cribs, elevators, and luggage storage for
  families or groups.

Missing capability data is not treated as a negative. A negative contribution
requires an explicit, sufficiently strong `false` signal. Destination
multipliers are accepted only from an evidence-backed context and are bounded.

These deltas remain traceable shadow components. V3-06 does not add them to the
public V2 ranking, preventing accidental double counting with Personal Utility.

## Decision friction and convenience

The convenience index uses explicit friction signals such as front desk,
self-check-in, luggage storage, elevator, arrival window, transport changes,
property access, and rules complexity.

At least two verified signals are required before the aggregate convenience and
friction scores are produced. With one signal the status is `partial`; with no
signals it is `unavailable`. Unverified or unknown concerns lower coverage only
and never become an invented penalty.

## Determinism and contract integrity

Candidate inputs and outputs are sorted deterministically. Every candidate and
the full V3-06 evaluation have stable fingerprints. Contract validation rejects:

- duplicate or empty hotel identities;
- mutated candidate or evaluation fingerprints;
- non-finite contextual values;
- scores that contradict unavailable/partial component states;
- rollout settings that would enable ranking or public copy;
- decision traces that do not reference the attached V3-06 evaluation;
- contextual coverage that does not match the analyzed hotel set.

The V2 compatibility adapter is conservative:

- provider distance remains a straight-line fallback;
- room tiers inferred from names cannot authorize upgrades;
- cancellation facts use the canonical V3-02 offer snapshot;
- payment timing stays unknown unless the canonical snapshot proves it;
- only positively present structured amenities create capability signals;
- absence of an amenity is not converted into `false`.

## V3-06 gate evidence

The automated suite covers direct travel-time gating, trip and destination
weights, straight-line fallback behavior, room comparability and premium gates,
cancellation probability requirements, pay-later requirements, group/long-stay
interactions, convenience coverage, permutation determinism, fingerprint
mutation, V2 adapter compatibility, commercial neutrality, and hidden public
presentation.

Passing these tests proves contract and algorithm behavior. It does not by itself
prove production decision gain. That separate Golden Dataset/real-case gate is
intentionally recorded as pending.
