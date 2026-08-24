# SPLIT-F0 Real-Data Economic Feasibility Pilot

Version: `stayopti.split-f0.protocol@1`

Status: private, offline contract foundation. It does not implement V3-19 and does not authorize provider calls.

## Purpose and boundaries

SPLIT-F0 asks one narrow question: can a stay using at most two genuinely different properties and one change produce a material economic opportunity relative to the best comparable single stay?

The pilot is provider-neutral and independent from V2, V3 policy, ranking, frontend, server and public runtime. V2 remains the sole public authority. V3 remains OFF/shadow and public Split remains disabled. No result becomes a recommendation, policy threshold, ranking signal, Golden evidence or promotion evidence automatically.

The initial eight scenarios cover 5, 7, 10, 12, 14, 21, 28 and 30 nights. They are a calibration set for technical validation and an initial search for signal. Eight scenarios are not statistically representative and are not sufficient for a definitive NO-GO. Stays longer than 30 nights are outside this direction.

## Frozen phases

1. **Technical sandbox calibration:** validate request construction, normalization, receipts and failure handling. Sandbox output is not market evidence.
2. **Sandbox-production equivalence check:** execute the same frozen scenario descriptors and compare contract coverage, not price equality.
3. **Production read-only feasibility pilot:** only sanitized production read-only observations may contribute to economic feasibility.
4. **Future recheck:** separately authorized, because the existing LiteAPI recheck uses Prebook. It is not authorized by this protocol.
5. **Economic analysis:** compare only technically valid offers in the same transparent comparability bucket and report sensitivity to hypothetical switching friction.
6. **Decision:** a later, manual GO / CONDITIONAL / NO-GO decision based on declared coverage and limitations. No automatic policy or runtime change follows.

No Prebook, Book, payment, booking confirmation, deploy or public activation is part of SPLIT-F0B.

## Scenario and split contract

Each scenario has a provider-neutral destination identity, fixed future dates, EUR currency, Italian guest nationality, one room, no pets, explicit occupancy and quality/location evidence floors. Provider destination and offer IDs are not frozen.

Each scenario freezes exactly two split points:

- one near the middle of the stay;
- one alternative near a weekly or weekend/weekday boundary.

Every generated option has exactly two contiguous segments, at least two nights per segment, no gap or overlap and at most one property change. A pair using the same property twice is not a Split.

## Economic comparability

A comparison is admitted only when the full-stay offer and both segment offers satisfy the same economic and structural gates. Its epistemic level is reported separately:

- `STRICT_COMPARABLE`: all material conditions are known and compatible;
- `CONDITIONAL_COMPARABLE`: cost, validity and structural gates pass, but payment timing is incomplete without a demonstrated incompatibility;
- `NON_COMPARABLE`: a material incompatibility is demonstrated or evidence essential to cost, validity or safety is missing.

The three offers must have compatible:

- currency and occupancy;
- board class;
- cancellation/refundability class;
- payment timing;
- complete total-cost semantics;
- rating and review evidence above the scenario floor;
- location within the scenario limit;
- room class when the class is available on both sides.

Identical commercial room names across different hotels are not required. Broad room classes compare only like for like: standard, superior, suite or apartment. `other` and `unknown` are not promoted automatically. Unknown essential costs, taxes or mandatory fees, stale rates, non-bookable offers, incomplete dates, missing provenance and duplicated properties fail closed.

Unknown payment timing is uncertainty, not proof of incompatibility. Equal known values are strict; differing known values are non-comparable; unknown values produce a conditional comparison with an explicit `payment-timing-unknown` or `payment-timing-known-unknown` evidence limit. Conditional results are technical signal-search only: they do not establish equivalence, market evidence, policy eligibility or a public recommendation.

The single baseline is the cheapest eligible full-stay offer inside the same comparability bucket. Commission, markup, provider ordering and provider-specific pricing preferences are excluded.

## Metrics and friction sensitivity

For comparable data only:

```text
singleTotal = complete full-stay total
splitTotal = first-segment total + second-segment total
grossSavingAmount = singleTotal - splitTotal
grossSavingRatio = grossSavingAmount / singleTotal
netSavingAtFriction = grossSavingAmount - hypotheticalFriction
```

There is no scientifically calibrated switching-cost model. The deterministic EUR penalties `0, 25, 50, 75, 100, 150` are analytical sensitivity scenarios, not estimates of human discomfort and not policy thresholds.

The descriptive signals are `NO_COMPARABLE_DATA`, `NO_GROSS_SAVING`, `POSITIVE_BELOW_50`, `POSITIVE_50_TO_149`, `POSITIVE_150_TO_299` and `POSITIVE_300_PLUS`. Technical validity, comparability, gross saving, friction sensitivity and evidence limitations remain separate.

## Data minimization for later phases

A future authorized collector may retain canonical request descriptors, environment label, timestamps, content hashes, normalized property/offer identifiers and the fields required by this contract. It must not retain credentials, headers, cookies, PII, commission, markup, booking URLs or unrelated raw provider payloads in the repository.

Sandbox and production receipts must remain separately named and stored. Production evidence must never be inferred from sandbox observations.
