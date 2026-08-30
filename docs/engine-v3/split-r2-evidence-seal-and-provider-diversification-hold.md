# SPLIT-R2.11 — Split evidence seal and provider diversification hold

Status: sealed offline decision record for the current R1/R2 evidence chain

Source commit: `3226637368d63b200037d8a9cdd43009f9c0357b`

Public Split: `OFF`

Public runtime: unchanged

## 1. Authority and boundary

This document closes the current R2 sequence. It separates technical
execution evidence, economic observations and commercial validation. It does
not implement a provider, change the Split evaluator or material thresholds,
authorize a provider call, open R2.12, enable a Split card, alter public
ranking, or authorize booking. Historical results remain historical and are
not reinterpreted as stronger evidence.

## 2. Sealed evidence chronology

### R1 — RouteStack Sandbox

One Sandbox scenario produced 11 positive breakpoints out of 13. The best
observed saving was 16,931 minor units and 2,267 basis points; the median was
10,185 minor units and 1,364 basis points. This is a strong technical and
economic signal in one bounded Sandbox scenario only. It establishes neither
generalizability, Production validity nor an estimable market frequency.

`R1_SANDBOX_EVIDENCE_CLASSIFICATION=STRONG_SINGLE_SANDBOX_SCENARIO_NON_GENERALIZABLE`

### R2.5A — RouteStack Public Production, initial page

The frozen campaign planned three scenarios. Two scenarios and 15 of 32
breakpoints were evaluable. One scenario contained a raw-positive result; zero
scenarios and zero destinations contained a material signal. The best saving
was 5,163 minor units and 646 basis points, below both required material
thresholds: at least 10,000 minor units and at least 1,000 basis points.

The historical contract classification `PARTIALLY_REPRODUCED` is preserved,
but it is not evidence of material reproducibility. Its effective evidentiary
classification is `RAW_POSITIVE_ONLY_NON_MATERIAL`, and its initial-only
economic inference was subsequently found not robust to pagination.

`R2_5A_EVIDENCE_CLASSIFICATION=RAW_POSITIVE_ONLY_NON_MATERIAL`

### R2.7A — Pagination sensitivity

Across six structurally selected breakpoints, pagination changed the full-stay
baseline in 6/6, the best distinct-property Split pair in 6/6, the saving sign
in 5/6 and the material class in 1/6. Distinct inventory grew from 572 offers
at D0 to 13,949 cumulative offers at D1, approximately 24.386 times D0. The
observed direction was bidirectional. No D2 was available and stabilization
was not determinable.

`R2_7A_PAGINATION_CLASSIFICATION=PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL`

Therefore the initial page is not a reliable basis for primary economic
inference. Pagination did not systematically favor either full-stay or Split,
and the observed result cannot be corrected by applying a simple coefficient.

### R2.8A — Interrupted pagination-aware campaign

R2.8A completed D0 and stopped during D1 at continuation request 53. It used
159 HTTP requests and accumulated 72,273 distinct offers. It economically
evaluated zero breakpoints. The normalized economic state existed only in
process memory and was destroyed after the abort, so the economic outcome is
not reconstructable and no economic conclusion is allowed.

`R2_8A_EVIDENCE_CLASSIFICATION=ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMIC_RESULT`

### R2.9A.1 and R2.10A.1 — D0 boundary and HTTP 402

R2.9A.1 stopped at the first D0. The later R2.10A.1 canary completed successful
authentication and three destination resolutions, then the initial D0 returned
HTTP 402. Its sanitized request contract was equivalent to earlier successful
requests. The user subsequently confirmed the operational account state as
`ROUTESTACK_PUBLIC_FREE_CALL_QUOTA_EXHAUSTED`. Current evidence supports no
request-shape defect. Neither wave produced an economic evaluation and neither
was followed by a second wave.

`R2_9A_1_EVIDENCE_CLASSIFICATION=NOT_EVALUABLE_WAVE_ABORTED`

`R2_10A_1_HTTP_STATUS=402`

`ROUTESTACK_PUBLIC_FREE_CALL_QUOTA_EXHAUSTED=YES`

### R2.10C.1 — Canonical environment gate and quota seal

R2.10C.1 resolved the false `.env` alarm. The canonical file remained
`server/.env`; the prior mismatch came from a relative path evaluated under a
different current working directory. It sealed the exhausted free quota,
placed RouteStack Public on live hold and made zero external calls. Its commit
is `3226637368d63b200037d8a9cdd43009f9c0357b`.

## 3. Evidence conclusion

```text
SPLIT_CONCEPT_PROVEN=NO
SPLIT_CONCEPT_DISPROVEN=NO
PRODUCTION_MATERIAL_REPRODUCIBILITY_PROVEN=NO
PRODUCTION_RAW_POSITIVE_OBSERVED=YES
PRODUCTION_RAW_POSITIVE_MATERIAL=NO
MARKET_FREQUENCY_ESTIMABLE=NO
COMMERCIAL_VALIDATION_AVAILABLE=NO
USER_USABLE_SPLIT_VALIDATED=NO
CURRENT_SPLIT_EVIDENCE_STATUS=INSUFFICIENT_FOR_PRODUCTION_OR_MARKET_CLAIMS
```

> Lo split ha mostrato un segnale forte in un singolo scenario sandbox e un piccolo segnale positivo non materiale in produzione. La successiva microprova ha dimostrato che i risultati economici dipendono fortemente dalla profondità di paginazione. Le campagne pagination-aware non hanno prodotto un risultato economico completo a causa di interruzioni tecniche e dell’esaurimento della quota pubblica. Pertanto lo split non è né convalidato né smentito: rimane una funzionalità promettente ma non dimostrata.

This seal does not state that Split works, does not work, normally saves money,
benefits most stays, validates the market, or reproduces the Sandbox result in
Production.

## 4. Product decision

Split remains part of the StayOpti vision and a possible Engine V3 capability,
but it is not treated as the product's sole moat. It remains a research
capability: no public card, ranking change, Split booking or quality-friction
implementation is allowed. Quality friction may be considered only after a
material signal is reproduced. Primary development returns to single-stay
Decision Intelligence and the main Engine V3 roadmap.

```text
SPLIT_PRODUCT_STATUS=RESEARCH_CAPABILITY
SPLIT_PUBLIC_STATUS=OFF
SPLIT_PROMOTION_ALLOWED=NO
QUALITY_FRICTION_ENTRY_GATE_MET=NO
RETURN_TO_PRIMARY_ENGINE_V3_ROADMAP=YES
```

## 5. RouteStack Public hold

```text
ROUTESTACK_PUBLIC_STATUS=LIVE_HOLD
LIVE_HOLD_REASON=PUBLIC_FREE_CALL_QUOTA_EXHAUSTED
ROUTESTACK_PUBLIC_CALLS_ALLOWED=NO
CURRENT_LIVE_AUTHORIZATION_AVAILABLE=NO
AUTOMATIC_RETRY_AFTER_QUOTA_RESET=NO
NEW_USER_APPROVAL_REQUIRED=YES
```

The hold may be reconsidered only after quota renewal or purchase, review of
the economic terms, a newly authorized D0 canary and a new explicit user
authorization. A quota reset alone never triggers an automatic retry.

## 6. Provider diversification gate

| Provider | Current state | Split qualification | Live calls |
|---|---|---|---|
| LiteAPI | Existing operational provider | To be verified separately | Not authorized |
| RouteStack Public | Free quota exhausted | Incomplete evidence | Prohibited |
| RateHawk | Inquiry sent, response pending | Not started | Prohibited |

`LITEAPI_SPLIT_QUALIFICATION=NOT_ESTABLISHED`

A future provider must pass all of these checks before a Split campaign is
planned:

1. Sandbox or developer access.
2. Authorization to operate as a multi-provider comparator.
3. Compatible redirect, affiliate handoff or white-label support.
4. Any requirement to act as merchant or reseller.
5. API and per-call costs.
6. Rate limits.
7. Documented pagination.
8. An explicit provider-exhaustion state.
9. Full-stay, prefix and suffix availability.
10. Numeric total price.
11. Taxes and fees.
12. Coherent currency.
13. Occupancy.
14. Rooms and rates.
15. Cancellation conditions.
16. Stable deduplication identity.
17. Recheck capability.
18. Permission or prohibition for comparison with other providers.
19. Responsibility for support, cancellations and refunds.
20. Corporate, fiscal, certification and volume requirements.

### RateHawk boundary

```text
RATEHAWK_CONTACT_STATUS=INQUIRY_SENT_RESPONSE_PENDING
RATEHAWK_INTEGRATION_STATUS=NOT_STARTED
RATEHAWK_SANDBOX_ACCESS=UNKNOWN
RATEHAWK_MULTI_PROVIDER_COMPARISON_PERMISSION=UNKNOWN
RATEHAWK_BOOKING_MODEL_COMPATIBILITY=UNKNOWN
NO_RATEHAWK_CODE_BEFORE_WRITTEN_CLARIFICATION=YES
```

No personal email address, telephone number, tax identifier, VAT number,
certified-email address, registration detail or full email body belongs in
this record.

## 7. Future protocol — not an authorization

For a future provider that passes the qualification gate, the order is:

1. Documentary and commercial verification.
2. Offline adapter with fixtures.
3. Zero-HTTP dry run.
4. Fake contract tests.
5. Canary capped at five HTTP requests.
6. Limited pagination-aware campaign.
7. Only then, a 20–30-scenario campaign.

This sequence authorizes no call. Every future campaign must freeze scenarios
before observing results, retain sanitized economic inputs sufficient for
abort salvage, distinguish provider-exhausted from depth-capped, and never
replace adverse or empty scenarios. It must retain neither raw provider IDs,
continuation IDs, payloads nor raw responses; it must avoid cross-run
linkability. Reporting must use both all-scenario and evaluable-scenario
denominators, with the scenario—not the breakpoint—as the primary statistical
unit.

## 8. Closure

The current R2 sequence is closed. No R2.12 is opened automatically. Split
remains `OFF` while provider qualification is pending, and the next product
work returns to the primary Engine V3 single-stay roadmap.

`NEXT_STEP_RECOMMENDATION=RETURN_TO_ENGINE_V3_PRIMARY_ROADMAP_WITH_SPLIT_OFF_WHILE_PROVIDER_QUALIFICATION_IS_PENDING`
