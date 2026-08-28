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
