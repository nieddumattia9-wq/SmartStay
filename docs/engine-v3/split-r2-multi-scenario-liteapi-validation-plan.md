# SPLIT-R2.0 — Multi-scenario reproducibility and LiteAPI validation master plan

Plan version: `stayopti.split-r2.master-plan@1`

Future receipt: `stayopti.split-r2.multi-scenario-reproducibility@1`

Frozen source: `38a7937a2c1a9dc74914ea97c679ab475feaa959`

Frozen tree: `2fa84f70126711fe5370466e29a6d8ea33d8c2ef`

Plan date: 2026-08-28

Status: offline pre-registration only; no live call, product policy, public runtime, booking, or payment is authorized.

## 1. Purpose and authority boundary

R2 is a bounded reproducibility study, not a public Split implementation. It asks four separate questions:

1. whether the RouteStack technical signal observed in R1 recurs in frozen scenarios not selected from their outcomes;
2. whether the same Split arithmetic is technically observable through LiteAPI/Nuitee, the operational accommodation provider;
3. whether recurrence exists across providers without requiring equal inventory, properties, or absolute prices;
4. which evidence is still required before a price-only result could support a traveler-usable Split recommendation.

This document freezes the proposed study design. It does not implement a runner, inspect credentials, authorize a provider request, change V2/V3 decision logic, enable public Split, or alter the public provider boundary. Every later live phase requires a new direct authorization that names the environment, endpoints, request caps, and permitted operations.

## 2. Sealed R1 evidence and claim boundary

The authoritative R1 receipt is `stayopti.split-r1.compact-pilot-result@1`, sealed by commit `38a7937a2c1a9dc74914ea97c679ab475feaa959`.

The frozen RouteStack Sandbox observation covered Milano, 2026-11-30 through 2026-12-14, fourteen nights, one room, two adults, no children, EUR, distinct properties, and at most one change. The run executed 41 logical searches and evaluated all 13 breakpoints. Eleven were positive, none was break-even, and two made Split more expensive. The best observed diagnostic delta was 16,931 minor units (EUR 169.31), or 2,267 basis points (22.67%); the median was 10,185 minor units (EUR 101.85), or 1,364 basis points (13.64%); the minimum was -3,416 minor units (EUR -34.16). Winning breakpoint ordinal was 2.

All 41 returned snapshots were usable. The run observed 35,693 raw, normalizable, and economically eligible results, 1,056 run-local pseudonymized properties, and an available full-stay baseline with 814 offers. HTTP accounting was one auth, one destination lookup, and 41 initial hotel searches: 43 total, with zero continuation, retry, or Production calls.

R1 supports only:

`TECHNICAL_EXISTENCE_OF_SPLIT_SAVING=YES`

R1 does not support general market frequency, real-user average saving, a global optimum, inventory completeness, Production validity, commercial validity, quality equivalence, net value after switching friction, or LiteAPI validity. R2 preserves that evidence and does not reinterpret it retroactively.

## 3. Frozen scenario matrix

All dates are future relative to 2026-08-28. Date subtraction was checked in UTC calendar days. Every scenario uses Italy as country, EUR, Italian guest nationality, one room, two adults, no children, distinct properties, and at most one change. Canonical coordinates are reused from committed provider-neutral fixtures; provider IDs are not frozen.

| Ordinal | Role | Destination | Canonical coordinates | Check-in | Check-out | Nights | Breakpoints | Logical searches |
|---:|---|---|---|---|---|---:|---:|---:|
| 1 | anchor replication | Milano | 45.4642, 9.1900 | 2026-11-30 | 2026-12-14 | 14 | 13 | 41 |
| 2 | new | Milano | 45.4642, 9.1900 | 2027-03-01 | 2027-03-08 | 7 | 6 | 20 |
| 3 | new | Firenze | 43.7696, 11.2558 | 2026-11-30 | 2026-12-07 | 7 | 6 | 20 |
| 4 | new | Firenze | 43.7696, 11.2558 | 2027-03-01 | 2027-03-15 | 14 | 13 | 41 |
| 5 | new | Roma | 41.9028, 12.4964 | 2026-11-30 | 2026-12-14 | 14 | 13 | 41 |
| 6 | new | Roma | 41.9028, 12.4964 | 2027-03-01 | 2027-03-08 | 7 | 6 | 20 |

The matrix contains six scenarios, one anchor, five new scenarios, three destinations, three seven-night stays, and three fourteen-night stays. It is frozen before any new network observation. An empty full-stay baseline remains in the denominator as a non-evaluable scenario. It is never replaced, shifted, or substituted after seeing availability, result count, or economic outcome.

### Generator compatibility

The committed R1 nightly-oracle builder establishes the actual search construction:

- one `FULL_STAY` window;
- one `NIGHTLY` window per night;
- one `PREFIX` and one `SUFFIX` window for every breakpoint;
- all breakpoint offsets from 1 through `N - 1`;
- the source contract records `1 + N + 2 * (N - 1)`.

This was derived from `buildSplitR1SandboxNightlyOracleSearchPlanV1`, not assumed independently. It gives:

| Duration | Full-stay | Nightly | Segment windows | Breakpoints | Total logical searches |
|---:|---:|---:|---:|---:|---:|
| 7 nights | 1 | 7 | 12 | 6 | 20 |
| 14 nights | 1 | 14 | 26 | 13 | 41 |

The existing R1 wrapper is fixed to 14 nights, 13 breakpoints, 41 searches, and a RouteStack-named fixture. The earlier F0 provider-neutral generator supports only two preselected split points. Therefore the six-scenario R2 plan is arithmetically compatible with the underlying construction but is not dispatchable unchanged. R2.1 must create a provider-neutral, duration-parameterized contract that reproduces these counts and fails closed on any drift; it must not alter the economic formula, ordering, tie-break, fixed baseline, or distinct-property rule.

## 4. Provider allocation and anti-selection rules

### LiteAPI primary provider

LiteAPI is assigned all six frozen scenarios. It is the operationally relevant provider, so broader evidence must come from it rather than being inferred from RouteStack.

### RouteStack independent limited replication

RouteStack is assigned the precommitted subset `[1, 3, 5]`: the Milano anchor, the seven-night Firenze case, and the fourteen-night Roma case. This provides one scenario per city and the frozen duration pattern 14/7/14 nights.

The provider allocation is not price-based and does not maximize result counts. No provider needs to return the same properties, identifiers, rooms, rates, inventory, or absolute prices. Cross-provider price subtraction is prohibited. Recurrence compares only independently classified scenario outcomes under the same provider-neutral arithmetic.

## 5. LiteAPI/Nuitee local contract audit

The audit used only committed code, tests, fixtures, and local documentation. No provider documentation was fetched and no credential was read.

### Environment and authentication

`LITEAPI_ENVIRONMENT_CLASSIFICATION=LITEAPI_SANDBOX_VERIFIED_AVAILABLE`

The local V3-10A receipt documents a controlled Sandbox public-rate validation. The F0D protocol defines separate Sandbox and Production credential classes, but explicitly treats Production access and data equivalence as unproved until a separately authorized live run. The default runtime base URL is `https://api.liteapi.travel/v3.0`; a configured URL alone is not evidence that a usable Production credential or permitted quota exists.

LiteAPI uses an `X-Api-Key` header on each request. There is no separate HTTP authentication call. The Rates payload accepts city/country or coordinates directly, so there is no LiteAPI destination-lookup HTTP call in this plan.

### Endpoint and implicit-call audit

The narrow read-only acquisition surface is `POST /hotels/rates`. The general runtime adapter may subsequently request `/data/hotels` in batches and `/data/facilities` to enrich metadata. Those are implicit extra calls and are excluded from R2. The R2 collector must use a dedicated Rates-only transport, preserve the exact host allowlist, and account for every request before transport.

Prebook, Book, recheck, White Label, checkout, cancellation, payment, metadata enrichment, facilities, price-index, and any other endpoint are outside the R2 campaign.

### Price semantics

`LITEAPI_PRICE_SEMANTICS=SEARCH_WINDOW_TOTAL_CONFIRMED`

The committed V3-10A evidence records Nuitee support confirmation that `offerRetailRate` is the public stay price used by search and checkout mapping. The mapper also records that a grouped room offer's `offerRetailRate` is the total for every requested room in that offer. The controlled three-night sample remained stable across Rates and Prebook to one cent.

This classification applies only to the support-confirmed public-rate path. The general mapper contains compatibility fallbacks such as `price`, `amount`, `total`, `totalPrice`, and legacy suggested-selling-price paths whose temporal semantics are not equally proved. R2 economic admission must therefore require a positive public `offerRetailRate` with explicit currency and must reject legacy/fallback price paths rather than infer totality.

### Tax, mandatory-charge, and payment comparability

`LITEAPI_TAX_COMPARABILITY=CONDITIONAL_ON_COMPLETE_KNOWN_MANDATORY_COMPONENTS`

The local mapper separates included taxes, excluded taxes, and unknown taxes. It derives `totalKnownCost` as the public stay price plus quantified excluded taxes. This supports comparison only when all three offers in a comparison meet every one of these gates:

- identical expected currency with no fallback-invented currency;
- positive integer-minor-unit window total;
- every mandatory included or excluded component is quantified in the same currency;
- `unknownTaxes` and unknown mandatory charges are zero;
- pay-now and pay-at-property components are classified and compatible, or the comparison is explicitly held as non-user-usable;
- occupancy and full temporal coverage match exactly.

Included taxes are accepted only when the provider marks them included. Excluded taxes are accepted only when separately quantifiable and added once. Unknown tax or fee completeness blocks the economic comparison. Rates-only evidence does not by itself prove a final payable or bookable total.

### Identity, cancellation, pagination, and operational controls

- Property identity is available from the provider hotel identity and must be converted immediately to an HMAC-SHA256 fingerprint using one campaign-ephemeral secret. Raw property, room, rate, and offer IDs must not enter a receipt.
- Room/rate identity and selection fingerprints exist in the current adapter, including multi-room handling. R2 uses one room but must still fail closed on missing property identity or ambiguous price identity.
- Cancellation/refundability mapping exists, but the R2 price signal does not establish equivalent quality or flexibility. These fields belong to a later quality/friction layer.
- No provider OpenAPI for LiteAPI is stored locally. The strongest local price evidence is the support-confirmed V3-10A receipt plus implementation/tests. Internal tests are not promoted to provider documentation.
- The Rates payload has a result limit and the runtime adapter caps mapped hotels. No provider pagination/continuation contract is locally proved for R2. Any continuation, pagination, or truncation signal makes the affected acquisition contract-blocked or non-evaluable; it does not authorize another request.
- The general client has a timeout but no authoritative campaign rate limiter. Axios redirect behavior is not frozen fail-closed. R2 must use the existing Rates-only native-transport pattern with `redirect: "error"`, cache disabled, retry zero, a monotonic limiter, concurrency one, and an authoritative pre-transport counter.
- Local quota and per-request cost are not documented. `LITEAPI_COST_CLASSIFICATION=UNKNOWN_REQUIRES_USER_APPROVAL_BEFORE_LIVE`.

## 6. Provider-neutral evaluator compatibility

`LITEAPI_CURRENT_SPLIT_COMPATIBILITY=REQUIRES_PROVIDER_NEUTRAL_CONTRACT_EXTENSION`

The economic kernel is already provider-neutral in substance: it consumes a logical search ID, run-local property fingerprint, positive integer minor-unit total, and currency; it selects the fixed full-stay baseline before Split pairs; it requires distinct properties; it sums left and right totals; and it uses stable fingerprint tie-breaks. It does not need equal property identity across providers.

The current executable boundary is nevertheless not reusable unchanged:

- the exhaustive R1 planner/evaluator is embedded in a RouteStack collector and a RouteStack-specific 14-night fixture contract;
- seven-night exhaustive plans are not accepted by that wrapper;
- the current LiteAPI adapter does not emit the R1 sanitized state directly and can perform implicit metadata calls;
- the broad LiteAPI mapper has price and currency fallbacks that are too permissive for the R2 economic contract;
- tax, mandatory-charge, and payment-timing completeness must be represented explicitly in the provider-neutral admission record.

R2.1 may extend only the provider-neutral acquisition/normalization contract and plan wrapper. The existing formulas, fixed-baseline timing, distinct-property rule, one-switch limit, deduplication, currency policy, ordering, and tie-breaking remain unchanged.

## 7. Logical-search and HTTP budgets

### Scenario search budget

| Scenario | Nights | Breakpoints | Full | Nightly | Segment | LiteAPI searches | RouteStack searches |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 14 | 13 | 1 | 14 | 26 | 41 | 41 |
| 2 | 7 | 6 | 1 | 7 | 12 | 20 | 0 |
| 3 | 7 | 6 | 1 | 7 | 12 | 20 | 20 |
| 4 | 14 | 13 | 1 | 14 | 26 | 41 | 0 |
| 5 | 14 | 13 | 1 | 14 | 26 | 41 | 41 |
| 6 | 7 | 6 | 1 | 7 | 12 | 20 | 0 |
| **Total** | — | **57 / 32** | **6 / 3** | **63 / 35** | **114 / 64** | **183** | **102** |

Totals in cells separated by `/` are LiteAPI / RouteStack.

### Provider HTTP cap

| Provider | Auth | Destination | Initial/Rates | Pagination/continuation | Hard HTTP maximum | Minimum request-start span at 1,000 ms |
|---|---:|---:|---:|---:|---:|---:|
| LiteAPI | 0 | 0 | 183 | 0 | 183 | 182 seconds |
| RouteStack | 1 | 3 | 102 | 0 | 106 | 105 seconds |
| **Single sequential campaign** | **1** | **3** | **285** | **0** | **289** | **at least 288 seconds** |

The RouteStack budget assumes one fresh authenticated campaign and one destination resolution for each of Milano, Firenze, and Roma. The LiteAPI budget uses city/country in the Rates request and no separate auth or destination call. The overall limiter is global to the campaign, so all 289 request starts remain at least 1,000 ms apart. Response latency can only increase elapsed time.

These are maximum live caps for the proposed R2.3 campaign, not authorization to spend them. R2.2 must first prove the LiteAPI contract with a separately authorized minimal canary and validate the RouteStack preflight. Any pagination/continuation requirement, implicit call, quota conflict, or cost uncertainty that would exceed these caps stops before the campaign and requires a new plan and user authorization.

## 8. Units of analysis

### Breakpoint level

Every breakpoint is exactly one of `RAW_POSITIVE_SPLIT`, `BREAK_EVEN`, `SPLIT_MORE_EXPENSIVE`, or `NOT_EVALUABLE`. A breakpoint is evaluable only when the fixed full-stay baseline and both segment windows pass provider, currency, identity, total-price, tax/mandatory-cost, and distinct-property gates.

### Scenario level — primary

Each scenario reports planned/evaluable breakpoint counts, positive/break-even/negative counts, positive share, best/median/minimum diagnostic delta, baseline availability, numeric-price coverage, expected-currency coverage, tax comparability, and a technical classification. A scenario has a material price signal when at least one non-quarantined evaluable breakpoint meets both frozen material thresholds. The scenario, not the pooled breakpoint, is the primary campaign unit so a longer stay cannot gain more voting weight merely by having more breakpoints.

### Campaign level

Campaign aggregation reports total/evaluable scenarios, scenarios with raw positive evidence, scenarios with a material signal, cities with recurrence, median of scenario medians, provider breakdown, and anchor replication outcome. Pooled breakpoint distributions remain descriptive and cannot alone establish reproducibility.

## 9. Pre-registered thresholds and decision classes

### Price-signal levels

- `RAW_POSITIVE_SPLIT`: `savingMinorUnits > 0`.
- `MATERIAL_PRICE_SIGNAL`: absolute saving at least 10,000 minor units (EUR 100) **and** saving percentage at least 1,000 basis points (10%). Both conditions are mandatory.
- `USER_USABLE_SPLIT`: cannot be inferred from price alone.

The material threshold is analytical and provisional; it is not a traveler recommendation threshold.

### Provider and campaign decisions

- `PRIMARY_PROVIDER_REPRODUCED`: at least four of six LiteAPI scenarios are evaluable; at least two LiteAPI scenarios have a material signal; those signals cover at least two cities; and no price-comparability violation exists.
- `PRIMARY_PROVIDER_PROMISING_BUT_INSUFFICIENT`: at least one raw positive or material signal exists, but reproducibility conditions are not met, including when fewer than four scenarios are evaluable.
- `PRIMARY_PROVIDER_NOT_REPRODUCED`: at least four LiteAPI scenarios are evaluable and zero has a material signal. This rejects reproduction in the frozen matrix, not the universal possibility of Split.
- `LITEAPI_CONTRACT_BLOCKED`: environment or allowed endpoint cannot be established, full and segment totals are not semantically comparable, taxes/fees make the comparison unreliable, pagination/truncation is unresolved, or normalization would require an unproved assumption.
- `CROSS_PROVIDER_RECURRENCE_SUPPORTED`: `PRIMARY_PROVIDER_REPRODUCED`, at least two of three RouteStack scenarios evaluable, at least one RouteStack material signal, and no claim of equal inventory.
- `ROUTESTACK_ONLY_SIGNAL`: RouteStack recurrence exists but LiteAPI reproduction is absent or contract-blocked. It cannot authorize a public feature.

No post-result scenario replacement, result-count maximization, price-based selection, or threshold tuning is allowed.

## 10. Quality and friction boundary

The R1/R2 economic evaluator remains unchanged. A separate later layer is required before `USER_USABLE_SPLIT` can be considered. It must require:

- semantically comparable total prices and sufficiently known mandatory taxes/fees;
- the same occupancy and complete overall stay interval;
- effective availability and later recheck/prebook evidence under separate authority;
- no material quality loss relative to the fixed baseline;
- location within frozen constraints;
- compatible cancellation and flexibility;
- explicit transfer time, baggage, switching risk, and traveler-friction costs;
- a material net advantage after those costs.

The quality/friction layer must not rewrite the observed gross diagnostic delta. It produces a separate eligibility decision and may abstain.

## 11. Proposed compact receipt

The future single-line receipt is `stayopti.split-r2.multi-scenario-reproducibility@1`. It contains only deterministic, aggregate, sanitized fields:

- non-linkable campaign identity and source/version fingerprints;
- provider and environment classification;
- the six frozen scenario descriptors and provider allocation;
- per-scenario evaluability and saving-distribution aggregates;
- scenario material-signal classification;
- campaign scenario-level aggregates and provider breakdown;
- anchor replication outcome;
- provider contract coverage and collection limitations;
- temporal-price and tax/mandatory-cost comparability;
- authoritative HTTP counters and frozen caps;
- privacy invariants, claim boundaries, and final decision class.

It excludes raw hotel/property/rate/room/offer IDs, individual pseudonym lists, continuation IDs, tokens, headers, credentials, payloads, raw responses, arbitrary names from provider payloads, individual-property prices, commercial URLs, and persistent cross-run correlations. Property correlation within one campaign uses one ephemeral HMAC-SHA256 secret that is destroyed and never persisted.

The output must be one deterministic compact JSON line with a hard UTF-8 byte cap checked before printing. Oversize output fails closed without truncation or a second live wave.

## 12. Privacy, security, and runtime invariants

- concurrency 1;
- retry 0 and redirect 0;
- monotonic minimum request-start interval of 1,000 ms;
- authoritative counters reserve budget only immediately before transport;
- every forbidden endpoint and over-budget request stops pre-transport;
- no booking, Prebook, recheck, payment, cancellation, White Label, or checkout;
- no raw payload or response persistence;
- no secret, raw ID, or non-ephemeral cross-run linkage;
- no commission, provider ordering, or commercial field in the evaluator;
- public V2 protected; V3 and public Split remain disabled;
- Sandbox observations remain technical bounded-snapshot evidence, never market evidence.

## 13. Four-phase execution plan

### R2.1 — Offline dual-provider acquisition and receipt implementation

Implement a provider-neutral duration-parameterized plan, strict LiteAPI public-rate adapter, RouteStack adapter, shared evaluator boundary, receipts, hard counters, and fake transports. Prove 7-night 6/20 and 14-night 13/41 plans, all scenario overlays, deterministic aggregation, tax/currency gates, privacy, compact output, and unchanged R1 arithmetic. Provider calls remain zero.

### R2.2 — Minimal LiteAPI contract canary and RouteStack preflight

After direct authorization, perform only the smallest LiteAPI Rates canary needed to verify environment binding, public `offerRetailRate` window-total semantics, currency, tax/mandatory-cost fields, schema, truncation behavior, and sanitized normalization. RouteStack receives offline preflight only unless separately authorized. A canary proves contract behavior, not economic recurrence.

### R2.3 — Single authorized multi-scenario campaign

After a new authorization naming both provider environments and exact caps, execute one fresh campaign over the frozen matrix: LiteAPI six scenarios and RouteStack `[1,3,5]`, maximum 183 and 106 HTTP respectively, zero continuation/retry/redirect, global concurrency one, one ephemeral identity key, and one compact receipt. Do not replace failed or empty scenarios.

### R2.4 — Offline seal and product decision

Validate receipt integrity, reproduce all arithmetic offline, apply the pre-registered scenario-level rules, document the provider-specific and cross-provider conclusion, retain the quality/friction hold, and decide whether further validation is justified. No public activation follows automatically.

An extra phase is permitted only for a concrete blocking defect observed in these phases, not for indefinite diagnostic expansion.

## 14. Stop conditions

Stop before credentials or transport on source/tree drift, unexpected repository state, non-exclusive live mode, unfrozen matrix drift, plan-count drift, wrong provider host/environment, unproved credential class, unknown or unacceptable cost/quota, externally increaseable budget, missing compact mode, or raw persistence enabled.

Stop before the affected request on budget exhaustion, interval under 1,000 ms, concurrency above one, retry or redirect, endpoint outside the allowlist, implicit metadata request, continuation/pagination/truncation requirement, ambiguous destination, payload drift, or mixed scenario dispatch.

Stop and classify the relevant scenario or campaign on invalid JSON/schema, missing identity, non-positive or non-integer price, legacy/unproved price path, currency fallback or mismatch, unknown mandatory taxes/fees, incompatible payment timing, unprocessable full-stay snapshot, raw-ID/secret exposure, arithmetic divergence, repository mutation, or compact receipt overflow.

An empty full-stay response is a retained non-evaluable observation, not permission to substitute a scenario.

## 15. Explicit future authorization requirements

This phase authorizes no live call. Before R2.2 or R2.3, the user must explicitly authorize:

- provider and exact environment;
- exact HTTPS host and endpoint allowlist;
- auth, destination, Rates/initial, and total HTTP caps;
- zero or separately specified continuation cap;
- retry, redirect, concurrency, and monotonic interval;
- acknowledgement of LiteAPI cost/quota classification;
- no Prebook, booking, recheck, payment, cancellation, or public runtime mutation;
- one wave only and no automatic rerun.

Until that authorization and a passing contract canary exist, LiteAPI economic validation remains planned, not authorized.

## 16. R2.1 offline acquisition and reproducibility implementation

Implementation version: `stayopti.split-r2.provider-neutral-search-snapshot@1`

Compact receipt version: `stayopti.split-r2.multi-scenario-reproducibility@1`

R2.1 implements only an offline runner with dependency-injected fake acquisition. It does not contain a real provider transport, does not read credentials, and exposes no live mode. The only executable modes are plan/dry-run, fake LiteAPI Sandbox, fake RouteStack Sandbox, and fake combined campaign. Every requested real or future-live mode remains `NOT_IMPLEMENTED_OR_LIVE_HOLD` and fails before credentials, host resolution, sockets, or HTTP.

The runner materializes the frozen six-scenario matrix through one duration-parameterized generator. Seven-night scenarios produce six breakpoints and twenty logical searches; fourteen-night scenarios produce thirteen breakpoints and forty-one logical searches. LiteAPI receives all six frozen scenarios for 183 logical searches. RouteStack receives only ordinals `[1,3,5]` for 102 logical searches. Empty or non-evaluable scenarios are retained and cannot be replaced after an outcome is observed.

The acquisition boundary is:

```text
fake provider transport
→ provider-specific acquisition adapter
→ stayopti.split-r2.provider-neutral-search-snapshot@1
→ allowlisted economic comparability gate
→ unchanged exported R1 primitives
→ scenario result
→ provider aggregate
→ campaign decision
→ stayopti.split-r2.multi-scenario-reproducibility@1
```

The provider-neutral snapshot contains only logical search context, bounded collection status, run-local property fingerprints, integer-minor-unit search-window totals, mandatory-component state, canonical cancellation availability, allowlisted collection/comparability classifications, and a diagnostic funnel. Raw property, room, rate, offer, destination, continuation, payload, response, URL, credential, commission, and markup fields are excluded.

### 16.1 LiteAPI boundary

The R2 wrapper binds only `LITEAPI_SANDBOX` and prohibits Production fallback. It accepts only a positive public `offerRetailRate` explicitly classified as `SEARCH_WINDOW_TOTAL_CONFIRMED`, with the expected currency and exact frozen occupancy. Known included mandatory components remain included; known excluded mandatory components are added exactly once; known mandatory pay-at-property components remain separately observable; any unknown or unquantified mandatory component fails comparison closed. No SSP, net, markup, White Label, legacy price fallback, commission, metadata enrichment, or provider-order signal enters the evaluator.

The adapter emits only the frozen comparability allowlist. A diagnostic snapshot remains available when collection, semantics, occupancy, currency, or mandatory-component gates fail, but its offers cannot become economic candidates.

### 16.2 RouteStack boundary

The R2 wrapper binds only `ROUTESTACK_SANDBOX`; `ROUTESTACK_PUBLIC_PRODUCTION` is a separate held capability. It preserves the prospective R1 bounded-snapshot contract: `applicationStatus` is not required, no status proves terminality, a unique complete continuation binding may be detected, and no continuation can execute. Missing continuation metadata means only `PROVIDER_NO_CONTINUATION_EXPOSED`. A bounded snapshot never implies completeness or global optimality.

### 16.3 Unchanged economic kernel

R2 imports the existing R1 offer normalization/deduplication, best distinct-property pair, integer median, and rounded ratio primitives. Their bodies and callers remain unchanged; R1 adds exports only. The fixed full-stay baseline is selected before breakpoint pairs, the two segment totals are added, properties must differ, at most one change is allowed, price remains in integer minor units, saving ratios remain basis points, and ordering, tie-breaking, currency policy, and median semantics are preserved.

`RAW_POSITIVE_SPLIT` requires a positive minor-unit delta. `MATERIAL_PRICE_SIGNAL` requires both at least 10,000 minor units and at least 1,000 basis points. Neither label establishes `USER_USABLE_SPLIT`, quality equivalence, market evidence, completeness, Production validity, or a public recommendation.

### 16.4 Aggregation and decision contract

The primary unit is the frozen scenario. Each provider aggregate uses the median of evaluable scenario medians; it does not use a pooled-breakpoint median as the primary metric. Provider decisions implement the pre-registered classes `PRIMARY_PROVIDER_REPRODUCED`, `PRIMARY_PROVIDER_PROMISING_BUT_INSUFFICIENT`, `PRIMARY_PROVIDER_NOT_REPRODUCED`, `LITEAPI_CONTRACT_BLOCKED`, `CROSS_PROVIDER_RECURRENCE_SUPPORTED`, `ROUTESTACK_ONLY_SIGNAL`, and `INSUFFICIENT_EVALUABLE_DATA`. Cross-provider recurrence never requires or infers property-identity equality.

### 16.5 Offline budgets, compact receipt, and privacy

Authoritative pre-transport fake counters enforce LiteAPI 183 search requests, RouteStack one auth plus three destination resolutions plus 102 initial searches (106 total), and 289 combined requests. The 184th LiteAPI search, second RouteStack auth, fourth RouteStack destination, 103rd RouteStack initial, any continuation, 107th RouteStack total, and 290th combined request fail before fake transport. Retry and redirect remain zero; concurrency remains one; the future monotonic interval remains 1,000 ms.

The compact receipt is deterministic single-line JSON with a hard 16,000-byte UTF-8 limit checked before output. It contains the frozen matrix, aggregate provider/scenario results, decision classes, fake counters, environment holds, privacy invariants, and claim boundaries. It contains no individual properties or pseudonym lists, raw identifiers, payloads, responses, continuation values, credentials, or commercial fields. Oversize output fails closed without truncation. Public provider adapters, the public runtime, V2/V3 decision cores, and public Split remain unchanged and disabled.

## 17. R2.2 minimal LiteAPI Sandbox contract canary

Canary receipt version: `stayopti.split-r2.liteapi-contract-canary@1`

R2.2 adds one explicit, default-disabled live mode for the separately authorized LiteAPI Sandbox contract canary. Credentials alone cannot activate it. The mode requires the exact canary flag, compact output, explicit `LITEAPI_SANDBOX` environment, an acknowledgement of the three-request budget, the committed HEAD, and the preserved seven-path working-tree fingerprint before any credential is read.

The live boundary is a dedicated Rates-only native transport. It permits exactly three sequential `POST https://api.liteapi.travel/v3.0/hotels/rates` requests and no implicit authentication, destination, hotel metadata, facility, pagination, continuation, details, review, recheck, Prebook, booking, White Label, or payment request. Roles and dates are frozen to Scenario 1 at deterministic midpoint breakpoint 7:

- `FULL_STAY`: 2026-11-30 through 2026-12-14;
- `PREFIX`: 2026-11-30 through 2026-12-07;
- `SUFFIX`: 2026-12-07 through 2026-12-14.

The canary does not use the R1 winning breakpoint and does not select an outcome opportunistically. Each request body is derived from the canonical Scenario 1 binding and preserves Milano, Italy, one room, two adults, no children, EUR, and Italian guest nationality. An authoritative role counter blocks a repeated role, a fourth request, and any other route before transport. Retry and redirect are zero, concurrency is one, and a monotonic early-wake loop does not permit a request start before a real 1,000 ms interval.

### 17.1 Strict live normalization

Only explicit response containers already supported by the local LiteAPI contract are inspected. Economic admission requires a property identity, positive `offerRetailRate.amount` convertible exactly to integer minor units, explicit EUR in `offerRetailRate.currency`, the exact requested occupancy, and complete known mandatory components. Compatibility price paths such as SSP, `price`, `total`, `totalPrice`, net, markup, or commission are not accepted.

An explicitly present empty `taxesAndFees` array is treated as known-none for that rate. Every present mandatory component must have a non-negative exact amount, EUR, and an explicit included/excluded state. Included components are not added again. Excluded mandatory components, including known pay-at-property components, are added exactly once. A missing, malformed, unquantified, wrong-currency, or ambiguous mandatory-component container fails that offer closed. Raw tax labels and non-expected currency values never enter the receipt.

The receipt reports only aggregate per-search funnel counts, collection/comparability classes, availability of the fixed full-stay baseline and distinct-property segment pair, and the optional diagnostic saving in integer minor units and basis points. It is deterministic single-line JSON, capped at 8,000 UTF-8 bytes, and fails without truncation when oversized. Raw provider identifiers, individual fingerprints, provider names, room names, individual prices, tax labels, payloads, responses, credentials, URLs, and cross-run correlations are excluded.

Even a passing canary is only `LITEAPI_CONTRACT_CANARY_COMPARABLE`. Its economic delta is not matrix evidence, is not entered into the future R2 denominator, and cannot establish recurrence, frequency, user-usable Split, completeness, a global optimum, Production behavior, or a public recommendation.

### 17.2 RouteStack offline public-API preflight

R2.2 does not implement or call a RouteStack transport. `ROUTESTACK_SANDBOX` and `ROUTESTACK_PUBLIC_PRODUCTION` remain distinct `LIVE_HOLD` capabilities with non-interchangeable environment bindings and no fallback. Sandbox credentials cannot enable Production. Any future public/Production mode requires a separately authorized dedicated flag, authoritative budget, compact receipt, exact host binding, and zero continuation unless a later authorization explicitly changes that cap. RouteStack remains disconnected from the public runtime.

## 18. R2.3 — LiteAPI Sandbox zero-result diagnosis

R2.2 remains `INCONCLUSIVE`: three HTTP 200 responses with zero raw results do not establish general inventory absence, a Split failure, incompatible dates, or an extractor defect. R2.3 adds a separate, explicit, default-disabled diagnostic mode. It does not alter the frozen six-scenario R2 matrix, the R1 evaluator, the public LiteAPI adapter, RouteStack, or the public runtime.

### 18.1 Offline contract audit

The current R2 Rates request has the same material contract as `createLiteApiRatesPayload`: `checkin`, `checkout`, EUR, Italian guest nationality, one occupancy with two adults and no children, limit 80, timeout 12, three rates per hotel, room mapping and included hotel data. The diagnostic builder makes the location binding mutually exclusive: either `cityName` plus `countryCode`, or provider identities obtained from the same run's static discovery. The R2 Rates response-container order is equivalent to the provider mapper's explicit allowlist. The repository OpenAPI describes the StayOpti boundary and does not itself document the upstream LiteAPI provider endpoints; the local LiteAPI client and mapper are therefore the operative local contract evidence. No public-runtime change is authorized or made.

### 18.2 Frozen diagnostic matrix and hard budget

Static discovery uses exactly one `GET /data/hotels` request for Milano, Firenze and Roma. Only the first 80 valid provider identities in provider order are held in memory per city. They are never emitted or persisted. The Rates matrix contains three frozen windows—28 September 2026, 30 November 2026 and 1 March 2027—at seven and fourteen nights for all three cities. Every combination has one city/country request and, only when same-city discovery produced identities, one identity-bound request. Two additional Milano suffix controls cover 7–14 December 2026 in both location modes.

The immutable maxima are 3 static requests, 18 city-bound Rates requests, 18 identity-bound Rates requests, 2 anchor controls and 41 total HTTP. Retry and redirect are zero, concurrency is one and request starts remain at least 1,000 ms apart. A missing same-city identity set skips only its identity-bound probes and leaves budget unused. No alternate city, date, endpoint, pagination request, Production call or RouteStack call is permitted.

### 18.3 Sanitized response-shape and causal receipts

`stayopti.split-r2.liteapi-response-shape@1` inspects only explicit paths already present in the local static-content client/adapter or Rates mapper. For each allowlisted path it records presence, JSON type, array length and result-container eligibility. It never recursively enumerates unknown keys. Multiple eligible containers fail closed as `AMBIGUOUS` and prohibit normalization.

`stayopti.split-r2.liteapi-zero-result-diagnosis@1` records only city/window/duration ordinals and categories, location mode, HTTP/JSON state, selected allowlisted path and aggregate funnel counts. Repeated per-probe keys and response shapes use versioned field dictionaries so the deterministic single-line JSON remains below 16,000 UTF-8 bytes. Raw provider identities, hotel or room names, rates, tax labels, payloads, responses, credentials and cross-run fingerprints are excluded.

The causal classifier is deterministic and allowlisted. It distinguishes extractor or request mismatch, city versus identity binding asymmetry, date horizon, long-stay restriction, city-specific availability, broadly empty rate inventory, empty key/content scope and economically blocked raw rates. Independent simultaneous causes produce `MULTIPLE_CAUSAL_FACTORS`; absent sufficient evidence produces `NOT_DETERMINABLE`. This diagnosis may qualify technical availability only and cannot retroactively select scenarios by price, maximize result counts, or produce economic evidence.

## 19. R2.4 — LiteAPI rate-feed block seal and RouteStack public read-only canary

R2.2 and R2.3 remain immutable `INCONCLUSIVE` observations. Prospectively, their combined evidence is classified as `LITEAPI_SANDBOX_RATE_FEED_OR_ACCOUNT_SCOPE_UNRESOLVED`: the Sandbox static catalog responded and contained Milano and Roma, both city/country and provider-identity Rates bindings were exercised, request builders and extractors were contract-equivalent to the local public LiteAPI implementation, and near-term, +90, +180, seven-night and fourteen-night searches all returned zero rates. This is compatible with an unresolved Sandbox rate-feed or account-scope condition, but proves neither a LiteAPI defect nor a Split defect, real-inventory absence, Production behavior, or permission to replace frozen scenarios. R2.4 authorizes no additional LiteAPI request.

### 19.1 Sanitized LiteAPI support packet

The optional support packet is documentation only and is not sent automatically. Environment: LiteAPI Sandbox. Host category: `api.liteapi.travel`. The observed aggregate comprises three static-discovery HTTP 200 responses, eighteen city-bound Rates HTTP 200 responses, twelve executable provider-identity Rates HTTP 200 responses and two suffix-control HTTP 200 responses. Milano and Roma had static-catalog identities; Firenze did not. Every Rates probe returned zero raw and zero comparable results across the three frozen date horizons and both seven- and fourteen-night durations. Retry and redirect were zero. The local R2 request builder and explicit response-container extractor follow the operative documented/local contract. No API key, Authorization header, raw hotel or supplier identifier, payload, response, continuation value, secret or arbitrary metadata is included.

Questions for LiteAPI support, if Mattia later chooses to send them:

1. Does this Sandbox key have an active rate feed?
2. Can static catalog access remain available when no rate supplier is associated with the key?
3. Is account or feed configuration required for `/v3.0/hotels/rates`?
4. Is there a guaranteed hotel/date pair for a Sandbox contract test?
5. Should the key return live availability or simulated inventory?
6. Are additional public-contract parameters or scopes required?
7. Are supplier, nationality, currency or market restrictions attached to the key?

### 19.2 RouteStack public contract evidence

The public/Production environment is frozen as `ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED` from concordant local evidence: the versioned provider schema `server/docs/openapi.yaml`, the Production configuration names `ROUTESTACK_BASE_URL`, `ROUTESTACK_API_KEY` and `ROUTESTACK_API_SECRET`, and the sealed R1 Production collector binding `https://mcp.routestack.ai`. The Sandbox host `evolvemcp.routestack.ai` remains a distinct environment and is explicitly rejected in public mode. There is no Sandbox or alternate-host fallback.

The only selected public operations are `POST /mcp/auth/partner-token`, `POST /mcp/hotel/search-destinations` and `POST /mcp/hotel/search-hotels`. Authentication uses the documented HMAC-SHA256 partner request and a returned bearer token. Destination candidates come from `result[]`; hotel items, currency and numeric `ourprice` come from `result.result[]`, `result.currency` and `result.result[].ourprice`. None of the three operations mutates a reservation. Booking, prebooking, cancellation, payment, details, rooms/rates, recheck, availability hold and continuation are outside the allowlist.

### 19.3 Exact canary boundary

`stayopti.split-r2.routestack-public-contract-canary@1` is an explicit, default-disabled compact canary. Credentials alone cannot enable it. It requires the exact R2.4 phase, public-Production environment, both budget and no-mutation acknowledgements, committed HEAD and preserved seven-path dirty fingerprint before credentials are read. The scenario is Milano, 30 November–14 December 2026, one room, two adults, no children and EUR. Prefix, suffix, alternate dates, price-based selection and second waves are prohibited.

The hard pre-transport caps are one authentication, one destination resolution, one initial hotel search, zero continuation and three total HTTP requests. Retry and redirect are zero, concurrency is one and monotonic request starts remain at least 1,000 ms apart. A complete continuation binding may be recorded only as an allowlisted category; it never authorizes a fourth request. The receipt is deterministic single-line JSON, capped at 8,000 UTF-8 bytes, and contains only aggregate HTTP, normalization, numeric-price, expected-currency and bounded-snapshot diagnostics. It contains no raw identifiers, individual fingerprints or offers, continuation values, credentials, payloads or responses.

A valid HTTP 200 search with at least one normalizable numeric EUR result is only `ROUTESTACK_PUBLIC_READ_ONLY_SEARCH_CONTRACT_VERIFIED`. Zero or unusable results remain `ROUTESTACK_PUBLIC_CONTRACT_REACHED_INVENTORY_OR_SHAPE_INCONCLUSIVE`. Neither outcome proves completeness, global optimality, market frequency or booking validity, changes the public runtime, authorizes booking, or supplies R2 economic evidence.

## 20. R2.5 — RouteStack public multi-scenario reproducibility freeze

Freeze source: `7cef3a86086241356bda42c406dc68d2fdba9f2b`

Future receipt version: `stayopti.split-r2.routestack-public-multi-scenario@1`

Status: offline pre-registration only. This section implements no live mode, reads no credential and authorizes no provider request. R1 sealed evidence, the R2.2 and R2.3 `INCONCLUSIVE` observations, the R2.4 `FAIL`, and the R2.4.1 public-canary `PASS` remain separate historical results and are not reinterpreted.

### 20.1 Frozen RouteStack public matrix

The public campaign uses exactly the RouteStack subset precommitted by R2.0 and materialized by R2.1: scenario ordinals `[1, 3, 5]`. Every scenario uses Italy, EUR, one room, two adults, no children, distinct properties and at most one property change. Provider destination identifiers are resolved in memory and are never part of the freeze or receipt.

| Ordinal | Destination | Country | Check-in | Check-out | Nights | Occupancy | Currency | Breakpoints | Logical searches | Canonical roles |
|---:|---|---|---|---|---:|---|---|---:|---:|---|
| 1 | Milano | IT | 2026-11-30 | 2026-12-14 | 14 | 1 room, 2 adults, 0 children | EUR | 13 | 41 | 1 full, 14 nightly, 13 prefix, 13 suffix |
| 3 | Firenze | IT | 2026-11-30 | 2026-12-07 | 7 | 1 room, 2 adults, 0 children | EUR | 6 | 20 | 1 full, 7 nightly, 6 prefix, 6 suffix |
| 5 | Roma | IT | 2026-11-30 | 2026-12-14 | 14 | 1 room, 2 adults, 0 children | EUR | 13 | 41 | 1 full, 14 nightly, 13 prefix, 13 suffix |

The exact totals are three scenarios, three distinct destinations, 102 logical searches and 32 breakpoints. No empty, sparse, inconclusive, negative or low-saving scenario may be replaced, shifted or omitted.

The logical-search identifiers are frozen by the existing generator:

- `R2-S{ordinal}-FULL_STAY-0` exactly once per scenario;
- `R2-S{ordinal}-NIGHTLY-{n}` for every night ordinal in ascending order;
- `R2-S{ordinal}-PREFIX-{b}` and `R2-S{ordinal}-SUFFIX-{b}` for every breakpoint ordinal in ascending order.

The initial-search order is scenario ordinal `1`, then `3`, then `5`. Within each scenario it is `FULL_STAY`, all `NIGHTLY` windows in ascending ordinal, then alternating `PREFIX-b`, `SUFFIX-b` for ascending `b`. All 102 hotel searches are depth-zero initial searches. Auth is first, all three destinations are resolved in scenario order, and all depth-zero searches are dispatched in the frozen order before any deeper acquisition could be considered. Continuation depth is prohibited, so equal-depth breadth-first execution ends after the 102nd initial search.

The canonical sanitized plan was reconstructed with the versioned generator and deterministic serializer. Its fingerprints are:

- ordered logical-search identifiers SHA-256: `2c33cc844d24c8cac7618f2def71ebe433730422854f1e6b05bbc441663f0ebb`;
- sanitized payload descriptors SHA-256: `028e1a37c7931e5d13e622a462735cd168c5948195574b17d2c34d07aa60dbe1`;
- scenario 1 plan SHA-256: `466f24c1fd55ac3cbe5d8114df821807ecd195be737900f4b4a8220cfb93ccd7`;
- scenario 3 plan SHA-256: `fe1f1ed45e7c7a959811cb26247f5163027f809a0b158c3d4bb8d90c8d25617b`;
- scenario 5 plan SHA-256: `2256f80a17d540f6a72434a559137f30e8f60407a7a0f3a602b0e7e95ae75921`.

The sanitized payload descriptor contains only logical search ID, scenario ordinal, role, breakpoint ordinal, dates, canonical destination/country/coordinates, room count, one room with two adults and zero children, and EUR. The future provider request must be derived from that descriptor through the already sealed RouteStack request contract. It may add only the destination identifier selected from the same campaign's destination response; that identifier stays memory-only. No independently handwritten dates, occupancy, currency, alternate payload or provider ID is authorized.

### 20.2 Immutable public network contract

The only future environment is `ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED` on the exact R2.4.1 public host. Sandbox and alternate-host fallback are prohibited. The only allowed operations remain partner authentication, destination search and initial hotel search.

| Request class | Hard maximum |
|---|---:|
| Auth | 1 |
| Destination | 3 |
| Initial hotel search | 102 |
| Continuation | 0 |
| Total RouteStack HTTP | 106 |

The budget equation is frozen as `1 auth + 3 distinct-destination resolutions + 102 initial searches = 106 total HTTP`. The 103rd initial request, fourth destination request, second auth request, any continuation and the 107th total request must fail before transport. Retry and redirect are zero, concurrency is one, and monotonic request starts are separated by at least 1,000 milliseconds. The future run is one wave only, with no automatic rerun, alternate scenario, payload fallback or second campaign.

Booking, prebook, reservation, cancellation, payment, availability hold, unnecessary hotel or room details, recheck and every non-allowlisted or mutative endpoint are prohibited. A complete continuation binding may be classified but cannot be executed. No continuation identifier may be passed to another transport call or persisted.

### 20.3 Bounded collection classification

Every initial search is classified into exactly one allowlisted category:

- `USABLE_BOUNDED_SNAPSHOT`;
- `ZERO_RAW_RESULTS`;
- `UNPROCESSABLE_INITIAL`;
- `CURRENCY_INCOMPLETE`;
- `PRICE_COVERAGE_INCOMPLETE`;
- `CONTINUATION_AVAILABLE_NOT_EXECUTED`;
- `CONTINUATION_METADATA_AMBIGUOUS`;
- `TRANSPORT_OR_CONTRACT_FAILURE`.

`PROVIDER_NO_CONTINUATION_EXPOSED` means only that the provider exposed no usable continuation in that response. A complete continuation binding is recorded as `CONTINUATION_AVAILABLE_NOT_EXECUTED`; it does not invalidate an otherwise processable initial snapshot and does not prove completeness. More than one complete binding is ambiguous and fails the affected acquisition closed. No initial snapshot, regardless of result count, implies terminal market coverage, inventory completeness or a global optimum.

### 20.4 Frozen economic semantics

The provider-neutral R2 contract, RouteStack normalization and existing R1 evaluator remain authoritative and unchanged. Prices are positive integer minor units in explicit EUR. The fixed full-stay baseline is selected independently before Split pairs. Each Split total is the prefix window total plus the suffix window total, the two properties must differ, and at most one change is permitted. Identity eligibility, deduplication, ordering, tie-breaking, ratio rounding, integer-median semantics and the full-window-total baseline remain unchanged.

The price-signal thresholds remain:

- raw positive: `savingMinorUnits > 0`;
- material price signal: `savingMinorUnits >= 10000` **and** `savingBasisPoints >= 1000`;
- both material conditions are mandatory;
- neither raw-positive nor material-price signal implies `USER_USABLE_SPLIT`.

Quality equivalence, room equivalence, cancellation, mandatory charges, tax completeness, bookability and switching friction remain separate holds. A future price result is a diagnostic gross delta within returned bounded snapshots only.

### 20.5 Scenario-primary aggregation and reproducibility decision

Each scenario records planned, evaluable, positive, break-even, negative and non-evaluable breakpoints; raw-positive and material-signal presence; best, median and minimum saving in integer minor units and basis points; winning breakpoint ordinal; full-stay baseline availability; and usable-snapshot ratio. Negative and non-evaluable observations remain in their precommitted denominator.

The primary campaign unit is the scenario. Primary aggregation records scenarios with raw-positive evidence, scenarios with a material signal, destinations with a material signal and the median of evaluable scenario medians. A pooled breakpoint distribution is secondary diagnostic context only and is never the primary median.

The following classification preserves the R2.0/R2.1 predicates: the RouteStack evaluability quorum is at least two of three scenarios; a reproduced price signal requires at least two material-signal scenarios covering at least two destinations; promising evidence is at least one raw-positive or material-signal scenario below that reproduced condition; and zero material signals with the evaluability quorum is non-reproduction in this frozen matrix only.

Classification precedence and exact conditions are:

1. `PROVIDER_OR_CONTRACT_FAILURE` when a hard provider/transport contract, budget, route, security, privacy, arithmetic or receipt invariant fails. An individually empty or non-evaluable snapshot is not by itself a campaign contract failure.
2. `REPRODUCED_ACROSS_MULTIPLE_SCENARIOS` when there is no campaign contract failure, at least two of three scenarios are evaluable, at least two scenarios have a material price signal, those material signals cover at least two destinations, and no price-comparability violation exists.
3. `NOT_REPRODUCED` when there is no campaign contract failure, at least two of three scenarios are evaluable, and zero scenarios have a material price signal. This rejects reproduction only in the frozen RouteStack matrix.
4. `PARTIALLY_REPRODUCED` when there is no campaign contract failure, at least one scenario has a raw-positive or material signal, but the reproduced condition is not met and the non-reproduced condition does not apply.
5. `INSUFFICIENT_EVALUABLE_DATA` for all remaining conforming runs, including fewer than two evaluable scenarios with no raw-positive or material signal.

These categories do not change the R2.0 LiteAPI-primary or cross-provider decision classes. They are the prospective RouteStack-public receipt projection and do not reinterpret R1 or any prior R2 observation.

### 20.6 Compact receipt freeze

The future output is exactly one deterministic, single-line JSON object with receipt version `stayopti.split-r2.routestack-public-multi-scenario@1` and a hard maximum of 16,000 UTF-8 bytes. Stable field ordering is required. The byte length is checked before output; oversize fails closed without truncation, field deletion, partial JSON or a second wave.

The receipt contains only scalar fields, small aggregate objects and three sanitized per-scenario aggregates. It includes phase status and source SHA; public environment; planned/executed scenario, logical-search and breakpoint counts; authoritative HTTP counters; concurrency and minimum observed interval; collection category totals; aggregate raw, normalizable, numeric-price and expected-currency coverage; the three per-scenario aggregates; scenarios with raw-positive and material signals; median of scenario medians in minor units and basis points; reproducibility classification; bounded-snapshot scope; claim boundaries; and privacy invariants.

The receipt never contains raw hotel, property, destination, room, rate or offer IDs; individual property fingerprints or lists; correlation ID, token or next-results key; individual offers or prices; payloads or responses; arbitrary provider metadata; credentials or secrets; commercial URLs; or cross-run identifiers. One campaign-ephemeral HMAC secret may correlate properties only within the single wave and is destroyed without persistence.

### 20.7 Future result policy

A future campaign is technical `PASS` only when all three frozen scenarios were executed within 106 HTTP, the receipt is valid and sanitized, no hard invariant failed, and at least one breakpoint is evaluable. `PASS` does not require a positive saving.

It is `INCONCLUSIVE` when the contract was reached conformingly but evaluable data are insufficient, including missing baselines, incomplete price/currency coverage or unusable bounded snapshots without a runner violation. It is `FAIL` for budget, scenario, continuation, fallback, retry, redirect, endpoint, privacy, arithmetic, threshold, formula or receipt violations, or when a partial campaign is presented as complete. It is `BLOCKED` before credentials or transport when the exact live mode, environment, authority, cost acknowledgement, credentials, plan fingerprints or `3 scenarios / 102 searches / 106 HTTP` contract cannot be established.

The campaign may support only technical RouteStack public reproducibility and observed scenario-level price-signal distribution within bounded returned snapshots. It cannot support market frequency, real-user average saving, complete inventory, a global optimum, equivalent rooms or conditions, final bookability, tax completeness, commercial validity or future provider behavior. No public runtime, booking path or automatic user recommendation is authorized.

### 20.8 Local cost evidence and next-phase authority

The local provider schema, sealed R1/R2 receipts, committed code and tests document request contracts and counters but contain no verifiable RouteStack per-request price, billing rule, billable-operation distinction, currency, quota or account limit. They do not establish whether auth, destination or hotel-search requests are separately billed.

Therefore:

- `COST_CLASSIFICATION=COST_UNKNOWN`;
- `SEARCH_CALL_UNIT_COST=NOT_DOCUMENTED`;
- `MAX_THEORETICAL_CAMPAIGN_COST=NOT_DETERMINABLE`;
- `USER_APPROVAL_REQUIRED_BEFORE_LIVE=YES`.

R2.5 performs zero provider calls and grants no live authority. If this freeze passes, the immediate next phase is one combined phase only: offline implementation, validation, one scoped local commit and—only after every gate passes—a single directly authorized RouteStack public campaign capped at 106 HTTP. No additional intermediate phase is introduced absent a concrete technical blocker.

## 21. R2.5A — RouteStack public multi-scenario exact-mode implementation

Receipt version: `stayopti.split-r2.routestack-public-multi-scenario@1`

R2.5A implements a dedicated `ROUTESTACK_PUBLIC_MULTI_SCENARIO` capability without replacing or relaxing `ROUTESTACK_PUBLIC_PRODUCTION_CANARY`. It is disabled by default. Credentials alone cannot activate it. The exact mode requires the R2.5A phase acknowledgement, compact output, the verified public Production environment and host, explicit acceptance of the 106-request maximum and unknown Production cost, the no-booking/no-mutation acknowledgement, the committed repository gate, and no simultaneously selected Sandbox or public live mode. Every failed gate stops before credentials.

The authoritative plan is constructed once from the frozen R2 matrix subset `[1, 3, 5]`. Preflight, destination binding, payload generation, dispatch and evaluation share that same in-memory plan. It must contain exactly three distinct destinations, search counts `[41, 20, 41]`, breakpoint counts `[13, 6, 13]`, one full-stay binding per scenario, 102 ordered logical searches, unchanged occupancy and EUR, and the existing full/nightly/prefix/suffix ordering. Scenario replacement, price-based selection, result-count maximization, omission and post-preflight regeneration fail closed.

Separate authoritative counters reserve immediately before transport and enforce one authentication, three destination resolutions, 102 initial searches, zero continuation and 106 total requests. A second auth, fourth destination, 103rd initial, any continuation, any non-allowlisted endpoint and a 107th total request are rejected before transport. Retry and redirect remain zero, concurrency remains one, and the monotonic limiter retains the 1,000 ms minimum. The Sandbox host, alternate hosts, booking, prebook, payment, cancellation and every mutative operation remain prohibited.

Each response is normalized with the sealed RouteStack request/normalization contract and one run-ephemeral HMAC key. Continuation metadata is inspected only through the existing allowlisted structural diagnosis; values are never emitted. A complete unique binding is recorded and never executed. Ambiguity fails the affected snapshot closed. Price and expected-currency coverage stay separate, and no missing value is inferred or converted.

The three scenario evaluations reuse the provider-neutral R2 contract and R1 evaluator unchanged. Raw-positive and material-price signals remain distinct from user usability. Reproducibility is scenario-primary and applies the frozen R2.5 precedence; pooled breakpoint values cannot affect it. The final stdout contract is one deterministic JSON line, no per-search output, with a 16,000-byte UTF-8 cap checked before emission and no truncation. It contains only aggregate collection, economic, scenario, HTTP, claim-boundary and privacy fields. It contains no provider identifier, destination identifier, individual fingerprint, offer, payload, response, continuation value, credential or secret.

This implementation does not reinterpret R1, R2.2, R2.3, R2.4, R2.4.1 or R2.5. It changes no public runtime and authorizes no booking. A technically successful future wave can only report RouteStack public price-signal reproducibility within the returned bounded snapshots; it cannot establish inventory completeness, global optimality, general market frequency, real-user average savings, room or cancellation equivalence, tax completeness, final bookability or commercial validity.

## 22. R2.6 — Partial Production reproducibility evidence seal and pagination decision

R2.6 seals the single R2.5A RouteStack public Production wave without changing its evaluator, thresholds, receipt, provider contract or historical interpretation. The sealed wave used `stayopti.split-r2.routestack-public-multi-scenario@1` in `ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED`, executed all three frozen scenarios and all 102 logical searches, and remained within the exact `1 auth + 3 destination + 102 initial + 0 continuation = 106 HTTP` contract. Retry and redirect were zero, maximum concurrency was one, and the limiter remained conforming. The wave returned 26,655 raw and 26,655 normalizable results, with complete `26,655/26,655` numeric-price and expected-currency coverage. It produced 86 usable bounded snapshots, 16 zero-raw snapshots, 16 non-usable snapshots, 86 snapshots reporting continuation availability without execution, and zero ambiguous snapshots.

The contractual reproducibility classification remains `PARTIALLY_REPRODUCED`. Its mandatory evidence-strength qualifier is `RAW_POSITIVE_ONLY_NON_MATERIAL`. Scenario 1 had 13/13 evaluable breakpoints, one raw-positive, zero break-even and twelve negative results; its best result was `+5163` minor units and `+646` basis points, its median was `-22588` minor units and `-2828` basis points, and its minimum was `-63158` minor units. Scenario 3 had 2/6 evaluable breakpoints, both negative; its best was `-3073` minor units and `-1247` basis points, its median was `-4046` minor units and `-1642` basis points, and its minimum was `-5019` minor units. Scenario 5 had 0/13 evaluable breakpoints. Across the campaign, 15/32 breakpoints and 2/3 scenarios were evaluable, one scenario contained a raw-positive, no scenario and no destination contained a material signal, and the median of evaluable scenario medians was `-13317` minor units and `-2235` basis points.

This means only that the Production pipeline worked end to end and at least one raw-positive was observed. The best observed Production result was EUR 51.63 / 6.46%, but no scenario jointly met EUR 100 and 10%, there was no material recurrence across scenarios or destinations, and the aggregate scenario-level median was negative. The strong bounded-Sandbox price signal sealed in R1 was not materially reproduced by these three Production scenarios. The result is not evidence that Split is generally effective, frequently convenient, commercially validated or representative of market frequency. It does not establish a double-digit reproduced saving, complete inventory, a global optimum, final bookability or user usability.

### 22.1 Evaluability audit of the seventeen unavailable breakpoints

The evaluator resolves one fixed `FULL_STAY` baseline per scenario and, for each breakpoint, one `PREFIX` and one `SUFFIX` snapshot. `NIGHTLY` searches are collected by the canonical plan but are not inputs to the breakpoint comparison. A missing or unusable `FULL_STAY` snapshot can therefore make every breakpoint in its scenario non-evaluable; a missing or unusable `PREFIX` or `SUFFIX` can directly affect only its linked breakpoint. This explains why 16 unusable searches and 17 non-evaluable breakpoints are not expected to be numerically equal.

In the implementation, `zeroRawSnapshots` counts snapshots whose allowlisted collection category is `ZERO_RAW_RESULTS`, while `unprocessableSnapshots` counts every snapshot for which `boundedSnapshotUsable` is false. A zero-raw snapshot is necessarily non-usable. Because both sealed campaign counts are 16, the two sets fully overlap in this wave: every non-usable snapshot was zero-raw, rather than the receipt reporting 32 independent failures.

Scenario 3 retained a full-stay baseline and evaluated two of six breakpoints. Four breakpoint comparisons were non-evaluable. Complete aggregate price and currency coverage excludes a retained raw result being silently repaired or converted, but the compact receipt does not preserve which of the seven zero-raw searches in that scenario were `NIGHTLY`, `PREFIX` or `SUFFIX`, nor which comparison reasons applied to each breakpoint. The exact four-breakpoint role mapping is therefore not reconstructable. The defensible diagnosis is that required comparison inputs or a distinct-property pair were unavailable for those four comparisons; no narrower per-role allocation is asserted.

Scenario 5 retained no full-stay baseline and evaluated zero of thirteen breakpoints. Under the sealed code, a missing fixed baseline adds `NO_FULL_STAY_BASELINE` to every breakpoint. Given the complete price/currency coverage of all returned results and the observed identity between the zero-raw and non-usable sets, the unavailable full-stay input is a zero-raw bounded acquisition, not a StayOpti post-collection price or currency filter. That single shared full-stay failure is sufficient to make all thirteen breakpoints non-evaluable. Other zero-raw searches may add prefix or suffix reasons, but their exact roles and breakpoint assignments are not retained.

The reconstruction classification is `PARTIALLY_RECONSTRUCTABLE`. `evaluateSplitR2Scenario` computes allowlisted `notEvaluableReasonCounts`, but `splitR2RouteStackPublicScenarioReceipt` deliberately projects only aggregate breakpoint counts, baseline availability, usable/zero-raw snapshot counts and coverage. Exact reconstruction would additionally require sanitized per-search `scenarioOrdinal`, `logicalSearchOrdinal`, `searchRole`, `breakpointOrdinal`, collection category and usability, plus per-scenario allowlisted `notEvaluableReasonCounts` and explicit full/prefix/suffix zero-raw counts. Provider identifiers, payloads, offers and continuation values remain unnecessary and prohibited.

### 22.2 Continuation and economic-minimum sensitivity

The sealed receipt reports 86 usable bounded snapshots and 86 snapshots with continuation available but not executed. These equal marginal totals do not prove a one-to-one intersection: the compact receipt does not retain a joint `usableAndContinuationAvailableCount` or per-search continuation flag. It therefore cannot prove that every usable search had a complete continuation binding, even though it proves that 86 unique complete bindings were observed and none was executed.

The local provider schema documents `result.correlationId`, `result.token` and `result.nextResultsKey`, but it provides no verifiable ordering guarantee for the initial result page and no guarantee that the initial page contains the minimum economic offer for a full, prefix or suffix window. Continuation availability states only that further results can be requested. It does not prove completeness, quality ordering, terminality or the location of the cheapest eligible offer.

Each logical search has an independent provider session and continuation state, so full-stay, prefix and suffix searches can expose different pagination depths. Additional pages can lower the fixed full-stay baseline, lower either segment minimum, introduce a new distinct-property pairing, or affect those sides unequally. Consequently pagination can change the selected full baseline, the selected Split pair, the saving sign and the material-signal classification. It need not improve Split: lowering the full-stay baseline tends to reduce apparent saving, while lowering prefix/suffix minima or enabling a better distinct pair tends to increase it. The possible direction is therefore bidirectional, and the actual R2.5A effect is unmeasured.

The local evidence does not prove initial-page economic sufficiency. The decision is `PAGINATION_SENSITIVITY_UNMEASURED`; initial-only comparisons are also unsuitable for estimating market frequency until a bounded sensitivity study measures how economic minima and classifications change with continuation depth. No continuation is authorized by this section.

### 22.3 Statistical unit and prospective calibration design

The primary statistical unit is one scenario: destination + dates + occupancy + duration. Breakpoints are correlated alternatives inside that scenario, not independent stays. The 15 evaluable breakpoint comparisons therefore are not 15 independent observations, `1/15` is not a market-frequency estimate, and two evaluable scenarios out of three are insufficient for statistical calibration.

Any later calibration campaign is only a design target in R2.6, not an implemented or authorized plan. It must pre-register 20–30 frozen travel-query scenarios spanning at least five destinations, durations of 3/5/7/10/14 nights, short/medium/long lead times and high/medium/low season, with frozen occupancy and dates chosen before provider responses. No empty or weak scenario may be replaced, and neither price nor result count may influence selection. Definitive dates are intentionally not frozen here.

The future analysis must keep two denominators:

1. `ALL_FROZEN_TRAVEL_QUERIES` includes every pre-registered scenario, including zero-inventory and non-evaluable cases, and measures how often StayOpti can materially produce a comparison.
2. `EVALUABLE_BOOKABLE_BASELINE_QUERIES` includes only scenarios with a full-stay baseline and comparable segments and measures price-signal frequency conditional on evaluability.

Non-evaluable scenarios remain visible in the first denominator. Scenario-level recurrence remains primary; pooled breakpoint counts remain secondary diagnostics.

### 22.4 Price signal, quality friction and next step

The three levels remain separate: `RAW_POSITIVE` requires only `savingMinorUnits > 0`; `MATERIAL_PRICE_SIGNAL` requires both `savingMinorUnits >= 10000` and `savingBasisPoints >= 1000`; `USER_USABLE_SPLIT` was not evaluated in R2.5A. Quality friction must not be designed until a sufficient number of material price signals exists. R2.6 introduces no arbitrary euro penalty, rating or room equivalence, location or transfer penalty, luggage friction, cancellation equivalence, tax-completeness assumption or final-bookability claim.

Because initial-page economic sufficiency is not supported by verifiable provider evidence, the next step is `SPLIT-R2.7_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_MICROSTUDY_FREEZE`. That study must remain small and precommit a comparison of initial-only minima against initial-plus-continuation minima, including changes in saving sign and material classification, before any 20–30-scenario campaign is frozen or run.

## 23. R2.7 — RouteStack public pagination-sensitivity microstudy freeze

R2.7 is an offline, document-only freeze for a future RouteStack public Production microstudy. It preserves R1, R2.5A and R2.6 without reinterpretation, changes no evaluator or material threshold, implements no live mode, grants no provider-call authority and does not estimate market frequency or user usability. Before the study, pagination sensitivity remains `PAGINATION_SENSITIVITY_UNMEASURED`.

### 23.1 Structural sample and canonical bindings

The future study uses only frozen R2 scenarios 1 and 3 because they are the only R2.5A scenarios with at least one evaluable breakpoint. Scenario 5 is excluded structurally because its zero-raw full-stay search provided no baseline on which pagination sensitivity could be measured. This is an evaluability-based diagnostic selection, not a price-based or market-representative sample. No destination, date, duration, occupancy, currency, breakpoint generator or scenario result may be replaced or altered.

Exactly three breakpoint ordinals are selected per scenario by the precommitted `FIRST_CENTRAL_LAST` rule:

- scenario 1 of thirteen breakpoints: `1, 7, 13`;
- scenario 3 of six breakpoints: `1, 3, 6`.

The central ordinal is the deterministic centre for an odd count and the lower central ordinal for an even count. Selection cannot depend on saving, winning breakpoint, materiality, price, result count or availability. An empty or non-evaluable selected breakpoint remains in the study.

For each scenario the canonical plan contributes one `FULL_STAY` search and one `PREFIX` plus one `SUFFIX` search for each of its three selected breakpoints: seven distinct logical searches per scenario and fourteen total. The versioned plan reconstructs all fourteen as distinct logical IDs and bindings. Deduplication is allowed only if the canonical plan proves both payload and economic role identical; no such identity exists in this frozen set, and heuristic deduplication cannot reduce the total below fourteen. `NIGHTLY` searches and all unselected breakpoints are outside the microstudy.

### 23.2 Depth, eligibility and hard network budget

Each logical search has at most three page requests:

- `D0`: one initial page;
- `D1`: the cumulative state after at most one first continuation;
- `D2`: the cumulative state after at most one second continuation.

A next depth is eligible only when the immediately preceding response exposes one unique, non-ambiguous contractual binding whose `correlationId`, `token` and `nextResultsKey` are non-empty strings. Null, absent, empty or wrongly typed keys, absent or invalid correlation/token components, ambiguous metadata, invalid JSON, no further continuation, or arrival at D2 stops that logical search. No identifier is invented, substituted or resolved through a fallback. A stop at an earlier depth does not authorize replacement of the search.

The future hard budget is:

| Request class | Maximum |
|---|---:|
| Authentication | 1 |
| Distinct destination resolution | 2 |
| Initial D0 | 14 |
| First continuation D1 | 14 |
| Second continuation D2 | 14 |
| All continuation | 28 |
| Total RouteStack HTTP | 45 |

The exact maximum equation is `1 + 2 + 14 + 14 + 14 = 45`. Retry and redirect are zero, concurrency is one, and monotonic request starts remain separated by at least 1,000 ms. The run is one wave. Booking, prebook, payment, cancellation and every mutative or non-allowlisted endpoint remain prohibited. `COST_CLASSIFICATION=COST_UNKNOWN` and `MAX_THEORETICAL_CAMPAIGN_COST=NOT_DETERMINABLE`; a future live phase requires new explicit user authorization for at most 45 Production HTTP requests.

Dispatch is breadth-first and equal-depth: authenticate once; resolve the two destinations; dispatch all fourteen D0 searches in canonical order; dispatch all eligible D1 requests in that same logical-search order; then dispatch all eligible D2 requests in that order; stop and emit the compact receipt. Per-search depth-first dispatch (`D0 → D1 → D2` before the other D0 searches) is prohibited.

### 23.3 Cumulative acquisition and economic comparison

One run-ephemeral HMAC secret, the existing identity function, EUR policy, `ourprice` search-window-total semantics, integer minor units, deterministic tie-breaking, deduplication and the unchanged R1/R2 evaluator apply across every depth. D0 normalizes and deduplicates the initial page. D1 unions the D0 and first-continuation offers and deduplicates the cumulative set again. D2 unions every available D0, D1 and second-continuation page and deduplicates the complete observed cumulative set again. A later page never replaces an earlier page.

For each page depth the sanitized collection diagnostics record raw results, normalizable results, pre-dedup offers, newly introduced distinct properties, inter-page duplicates removed and cumulative distinct offers. They never retain a provider ID, individual fingerprint, property list, individual offer, payload, raw response or continuation value.

For each of the six selected breakpoints, each available D0/D1/D2 cumulative state records only the full-stay baseline minor units, best distinct-pair total minor units, saving minor units, saving basis points, raw-positive boolean, material boolean and evaluability boolean. The full baseline and distinct pair are recomputed from the cumulative depth state with the unchanged evaluator. Property identities and individual offer prices are not emitted.

The following sensitivity events are computed as booleans from the authoritative minor-unit/basis-point states:

- `FULL_BASELINE_CHANGED_D0_TO_D1` and `FULL_BASELINE_CHANGED_D1_TO_D2`;
- `SPLIT_PAIR_TOTAL_CHANGED_D0_TO_D1` and `SPLIT_PAIR_TOTAL_CHANGED_D1_TO_D2`;
- `SAVING_SIGN_CHANGED_D0_TO_D1` and `SAVING_SIGN_CHANGED_D1_TO_D2`;
- `MATERIAL_CLASS_CHANGED_D0_TO_D1` and `MATERIAL_CLASS_CHANGED_D1_TO_D2`;
- `EVALUABILITY_CHANGED_WITH_DEPTH`.

No event compares raw payload values. A transition is comparable only when the required cumulative depth states exist; unavailable transitions remain explicitly not observed rather than being coerced to `false`.

### 23.4 Mutually exclusive sensitivity, stabilization and bias decisions

Sensitivity uses this deterministic precedence:

1. `PAGINATION_SENSITIVITY_INCONCLUSIVE` when a hard contract error occurs or no breakpoint supplies a constructible multi-depth economic comparison.
2. `PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL` when at least one constructible breakpoint changes saving sign, material classification or evaluability with depth.
3. `PAGINATION_SENSITIVITY_ECONOMIC_MINIMUM_ONLY` when sign, materiality and evaluability remain invariant but at least one full baseline or distinct-pair minimum changes.
4. `NO_PAGINATION_SENSITIVITY_OBSERVED_WITHIN_D2` when sufficient multi-depth comparison exists and every observed comparable breakpoint remains economically identical, including when new offers do not alter baseline, pair, saving or classification.

The first applicable rule wins, so the four categories are mutually exclusive. `NO_PAGINATION_SENSITIVITY_OBSERVED_WITHIN_D2` means only that no sensitivity was observed within the selected sample and two-continuation bound; it never proves complete inventory or universal D2 sufficiency.

The receipt separately derives `D0_TO_D1_CHANGE_OBSERVED` and `D1_TO_D2_CHANGE_OBSERVED`. Stabilization is:

- `STABLE_BY_D1` only when both transitions are sufficiently observed and no relevant economic quantity changes in either;
- `STABLE_BY_D2` when at least one relevant quantity changes D0→D1 and none changes D1→D2;
- `STILL_CHANGING_AT_D2` when at least one relevant economic quantity changes D1→D2;
- `NOT_DETERMINABLE` when the required depth comparisons are unavailable.

“Stable” always means observed stability within D2, never provider completeness.

Bias direction uses all observed saving deltas for transitions whose endpoints are evaluable:

- `FAVORS_SPLIT` only when every delta is non-negative and at least one is positive;
- `FAVORS_FULL_STAY` only when every delta is non-positive and at least one is negative;
- `BIDIRECTIONAL` when both positive and negative deltas occur;
- `NO_DIRECTIONAL_CHANGE` when every comparable saving delta is zero;
- `NOT_DETERMINABLE` when no comparable saving delta exists.

More results are never assumed to favor Split. `initialOnlyClassificationRobustWithinStudy` is `true` only when all six selected breakpoints have sufficient D0/D1/D2 comparisons and no saving-sign, material-classification or evaluability event changes the D0 classification; it is `false` when at least one such change occurs and `NOT_DETERMINABLE` otherwise.

### 23.5 Compact receipt and claim boundary

The future receipt is `stayopti.split-r2.routestack-public-pagination-sensitivity@1`: deterministic single-line JSON, stable key order, no stdout progress, maximum 12,000 UTF-8 bytes, size checked before emission, oversize fail-closed, and no truncation or partial JSON.

It contains the phase status, source SHA, verified public environment, scenario ordinals `[1,3]`, breakpoint binding `{1:[1,7,13],3:[1,3,6]}`, planned/executed logical-search counts, authoritative auth/destination/initial/D1/D2/total counters, retry/redirect/concurrency/limiter metrics, per-depth collection and distinct-offer aggregates, inter-page duplicate counts, six compact per-breakpoint depth-economic objects, comparable-breakpoint counts at D0/D1/D2, aggregate baseline/pair/sign/material/evaluability change counts, sensitivity/stabilization/bias classifications, D0 robustness, claim boundaries and privacy invariants.

The minimum stable field set is:

```text
status, sourceSha, environmentClassification, scenarioOrdinals,
selectedBreakpointOrdinals, logicalSearchesPlanned, logicalSearchesExecuted,
authHttpRequests, destinationHttpRequests, initialHttpRequests,
continuationD1HttpRequests, continuationD2HttpRequests, totalHttpRequests,
totalHttpBudget, retries, redirects, maxObservedConcurrency,
minObservedRequestIntervalMs, perDepthCollectionCounts,
perDepthDistinctOfferCounts, interPageDuplicatesRemoved,
perBreakpointDepthEconomics, breakpointsComparableAtD0,
breakpointsComparableAtD1, breakpointsComparableAtD2, fullBaselineChanges,
splitPairChanges, savingSignChanges, materialClassificationChanges,
evaluabilityChanges, sensitivityClassification, stabilizationClassification,
observedBiasDirection, initialOnlyClassificationRobustWithinStudy,
completenessClaimAllowed, globalOptimumClaimAllowed,
marketFrequencyClaimAllowed, userUsableSplitEvaluated,
productionBookingAuthorized, publicRuntimeChanged, rawIdsPersisted,
rawContinuationIdsPersisted, rawMetadataValuesPersisted,
payloadsOrRawResponsesPersisted, crossRunLinkability, secretValuesExposed
```

It contains no raw hotel, property, destination, room, rate or offer ID; fingerprint list; individual offer; payload; response; arbitrary provider metadata; correlation ID; token; next-results key; credential or secret. Raw IDs, raw continuation IDs, raw metadata values and payload/raw-response persistence are zero. The HMAC secret remains memory-only, cross-run linkability is false and secret exposure is false.

The microstudy may support only observed pagination sensitivity within D2, its observed direction and stabilization, and robustness or non-robustness of D0 classifications within this structurally selected sample. It cannot support inventory completeness, global optimality, market frequency, commercial validity, user usability, universal two-continuation sufficiency or quality equivalence. Completeness, global-optimum and market-frequency claims remain false; user usability remains unevaluated; Production booking and public runtime changes remain unauthorized.

### 23.6 Prospective result routing

- `PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL` or `STILL_CHANGING_AT_D2` routes to `SPLIT-R2.8_PAGINATION_AWARE_ECONOMIC_COLLECTION_CONTRACT_REASSESSMENT`; a 20–30-scenario campaign remains blocked.
- `PAGINATION_SENSITIVITY_ECONOMIC_MINIMUM_ONLY` together with `STABLE_BY_D2` may route to `SPLIT-R2.8_20_TO_30_SCENARIO_PAGINATION_DEPTH_CALIBRATION_FREEZE`.
- `NO_PAGINATION_SENSITIVITY_OBSERVED_WITHIN_D2` with sufficient data routes to `SPLIT-R2.8_20_TO_30_SCENARIO_PRODUCTION_CALIBRATION_FREEZE`.
- `PAGINATION_SENSITIVITY_INCONCLUSIVE` routes to `SPLIT-R2.8_PAGINATION_MICROSTUDY_DIAGNOSTIC_REPAIR`.

R2.7 itself makes zero provider calls and authorizes no live execution. The immediate next step is `SPLIT-R2.7A_PUBLIC_PAGINATION_SENSITIVITY_IMPLEMENTATION_VALIDATION_AND_SINGLE_LIVE_MICROSTUDY`.

## 24. R2.7A isolated pagination-sensitivity execution contract

R2.7A implements the frozen R2.7 study as the isolated capability
`ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY`. It is disabled by default, is not
enabled by credentials alone, and requires the exact R2.7A flag, compact mode,
verified Production host, phase acknowledgement, 45-HTTP acknowledgement,
unknown-cost acknowledgement, and no-booking/no-mutation acknowledgement.
Selection of any other live mode at the same time fails before credentials.
Continuation remains prohibited in R1, the public contract canary, the R2.5A
multi-scenario campaign, legacy modes, and the StayOpti public runtime.

The preflight and dispatcher share one authoritative in-memory plan derived
from the frozen R2 matrix. It contains scenarios 1 and 3, breakpoint ordinals
`1,7,13` and `1,3,6`, two destinations, six breakpoint comparisons, and exactly
fourteen searches. Dispatch is breadth-first: all D0 requests precede every D1
request, and all eligible D1 requests precede every D2 request. D2 can use only
the complete, unique contractual metadata returned by D1 for the same logical
search. The pre-transport ledger rejects cross-search metadata use, repeated
depths, D3, retry, redirect, alternate hosts, non-allowlisted routes, mutation,
request 46, continuation 29, initial 15, destination 3, or authentication 2.

Each depth is a cumulative union. A single ephemeral HMAC key spans the wave;
the existing normalizer, EUR policy, integer price contract, deduplication,
distinct-property evaluator, tie-breaking, median semantics, and material
thresholds are unchanged. The final receipt is
`stayopti.split-r2.routestack-public-pagination-sensitivity@1`, deterministic
single-line JSON capped at 12,000 UTF-8 bytes. It contains only sanitized
counts, six depth-economic comparisons, derived change events, and the frozen
sensitivity, stabilization, and bias categories. It persists no raw identifier,
continuation value, payload, response, HMAC secret, or arbitrary metadata.

This implementation is prospective only. R1 sealed evidence, R2.5A's
`PARTIALLY_REPRODUCED` outcome, and R2.6's
`PAGINATION_SENSITIVITY_UNMEASURED` conclusion remain unchanged. Even a stable
D2 result cannot establish inventory completeness, global optimality, general
market frequency, user usability, commercial validity, or booking authority.
