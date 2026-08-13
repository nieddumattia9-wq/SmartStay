# StayOpti Engine V3-02 — Stay and cost integrity

V3-02 adds an integrity layer before utility, ranking or Temporal Optimization. It does not change Engine V2 ranking and does not enable a public Split card.

## Canonical unit

Every mapped offer snapshot binds the following facts to the same stay scope:

- exact check-in, check-out and night count;
- adults, children and rooms;
- hotel and source offer identifiers;
- room, meal plan, cancellation and payment semantics;
- reported total, currency, taxes, fees and completeness;
- search-time bookability, freshness and recheck requirement;
- optional nightly price and availability evidence.

Missing information remains unknown. It is never converted into a negative quality signal and it is never inferred from unrelated fields.

## Temporal evidence invariant

A reported stay total is not a nightly price vector. V3-02 never divides the total by the number of nights.

Nightly evidence is `complete` only when:

1. every stay night appears exactly once;
2. every amount and currency is known and coherent;
3. every night is reported available;
4. the nightly sum reconciles with the reported stay total;
5. dates, nights and occupancy form an exact stay scope.

Otherwise the evidence is `partial`, `not-provided` or `invalid`.

## Promotion gates

The integrity coverage report keeps three distinct gates:

- `offlineTemporalEvaluation`: enough coherent temporal evidence exists to evaluate split candidates offline;
- `publicV3Promotion`: at least one decision-ready offer exists and public-rate consistency is verified;
- `publicSplitPromotion`: a compatible pair of decision-ready offers has complete temporal evidence and public-rate consistency is verified.

The V2 compatibility adapter always reports public-rate consistency as `unverified`. Consequently public V3 and public Split promotion remain blocked.

## Recheck policy

Recheck compares semantic offer content, not provenance timestamps. A material change to price, currency, scope, room, meal plan, cancellation, payment, taxes, fees, bookability or temporal evidence requires deterministic decision replay. Changed offers also require explicit user confirmation. Sold-out offers always require a new decision.

## Commercial independence

Integrity snapshots contain no commission, markup, affiliate revenue or provider-priority fields. The V3 commercial firewall still validates the complete decision recursively.
