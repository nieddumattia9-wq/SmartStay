# SPLIT-R1 RouteStack Production Search-Level Pilot

Version: `stayopti.split-r1.routestack-production-pilot@1`

Status: private collector contract. The implementation is not exported, RouteStack remains disabled in the public runtime, and this phase authorizes dry-run only.

## Purpose and authority boundary

SPLIT-R1 tests whether RouteStack production search results can support a limited, private comparison between one full stay and a stay split across two different properties. It reuses the frozen SPLIT-F0 scenario matrix and its 5, 7, 10, 12, 14, 21, 28 and 30-night scenarios. It does not modify V2, V3, ranking, policy, frontend, server routes or public Split availability.

Search-level observations are not booking proof. No result is Golden evidence, a market-wide claim, a public recommendation or an authorization to revalidate, prebook, book or pay.

## Frozen request plan

The sole input is `tests/engine-v3/fixtures/split-f0-scenario-matrix-v1.json`. Each of its eight scenarios produces exactly five logical searches:

- one full-stay search;
- two segment searches for the near-half split point;
- two segment searches for the alternative split point.

The complete dry-run therefore contains eight scenarios, forty logical searches and zero HTTP requests. Destination labels, coordinates, dates, occupancy, currency and split points are never duplicated in an R1 fixture.

## Private RouteStack transport

The future controlled run is fail-closed around these surfaces only:

- `POST https://mcp.routestack.ai/mcp/auth/partner-token`;
- `POST https://mcp.routestack.ai/mcp/hotel/search-destinations`;
- `POST https://mcp.routestack.ai/mcp/hotel/search-hotels`.

It uses native Node `fetch` and `node:crypto`, HTTPS, `redirect: error`, concurrency one, retry zero and at most two continuations for one logical hotel search. Authentication uses a fresh nonce and integer Unix seconds for every run, with HMAC-SHA256 over `apiKey:timestamp:nonce` encoded as base64url.

The operational limits are immutable hard caps: at most 80 hotel-search HTTP requests, at most 100 RouteStack HTTP requests in total and at most one request start per second. Request starts are separated by at least 1,000 milliseconds on a monotonic clock. No CLI argument, environment variable or external configuration can increase these values; injected test configuration may only lower a cap or increase the interval. Timer wake-up is not trusted as proof that the interval elapsed: the limiter rereads the monotonic clock and sleeps again, using the ceiling of the remaining interval plus a one-millisecond conservative margin, until at least 1,000 milliseconds are demonstrated. It fails closed with `RATE_LIMIT_CLOCK_DID_NOT_PROGRESS` after at most ten early-wake cycles or 5,000 requested wait milliseconds. A synchronous ledger reserves the request class only after the rate slot is ready and immediately before `fetch`, so waiting or a clock failure consumes no budget; the 80th hotel request and 100th total request are admitted while the 81st and 101st are blocked. A transmitted request remains counted even when it times out or returns an HTTP error.

Live scheduling is breadth-first: authenticate once, resolve all eight destinations, issue all forty initial hotel searches, then issue the first continuation round in deterministic logical-search order. A second continuation round is considered only after every still-eligible search received its first continuation. Budget exhaustion is a normal fail-closed outcome: affected searches become `BUDGET_BOUNDED_INCOMPLETE`, their partial observations are excluded from economic headline metrics, and the run is marked inconclusive rather than throwing an unhandled runtime error.

Credentials may enter a live process only from the existing `server/.env` through Node's native `--env-file` mechanism. The collector does not parse, copy or write the file. Dry-run exits before credential resolution. No automatic fallback, alternate host or endpoint exists.

Destination selection is provider-neutral, deterministic and two-level. The geospatial primary path requires a non-empty ID, finite `coordinates.lat/long`, a unique nearest candidate and a maximum distance of 25 km from the frozen scenario coordinates. That path always has priority and the distance threshold is never widened.

RouteStack production has demonstrated that destination coordinates are optional in otherwise valid results: the unique Rome/Italy identity was returned with an ID but without `coordinates.lat/long`. The refined cause is `PROVIDER_DESTINATION_COORDINATES_OPTIONAL_OR_MISSING_NOT_HANDLED`, not a coordinate-path mismatch because no alternate coordinate path was observed.

Only when no geospatial candidate is eligible, a coordinate-less identity fallback may select one candidate. It requires an exact controlled city identity match, a structured country match, a compatible type when present, a unique match, a non-empty provider ID and finite canonical coordinates in the frozen scenario matrix. Controlled aliases cover the frozen cities, including Roma/Rome. A terminal country component in `fullName` is accepted as structured response identity when the dedicated country field is absent; substring-only city matches are prohibited. A candidate with invalid coordinates, a same-identity candidate located beyond 25 km, an apparent latitude/longitude inversion, ambiguous text matches, a country mismatch or invalid frozen coordinates fails closed.

The fallback records `UNIQUE_TEXT_COUNTRY_MATCH_WITH_FROZEN_COORDINATES`, keeps the destination ID in memory from the RouteStack response and uses the frozen matrix coordinates only for the subsequent search request. It never represents those coordinates as provider-supplied. Provider destination IDs and all destination coordinates remain in memory only and are absent from persisted output.

## Search-level economic semantics

Only a finite, positive numeric `ourprice` associated with a response currency is an eligible search-level price. `baseprice` is diagnostic only, and RouteStack's `saving` field is ignored. Monetary values are converted to integer minor units before selection, addition or subtraction.

The cheapest eligible full-stay result is selected once, before any split pair is considered, using a run-local property fingerprint as the deterministic tie-break. That fixed baseline is reused for both split points. A split requires two genuinely different property fingerprints and the same currency; its total is the integer-cent sum of its two segments.

RouteStack search results do not establish total-cost/tax completeness, room or rate identity, board, cancellation or payment timing. Consequently:

- `STRICT_COMPARABLE` is prohibited;
- structurally valid search-level comparisons are at most `CONDITIONAL_COMPARABLE`;
- every conditional result records explicit evidence limits, including unproven taxes and mandatory costs;
- missing or invalid price/currency data and duplicated properties remain non-comparable.

Gross saving is indicative only. Friction sensitivity is reported at EUR 0, 25, 50, 75, 100 and 150. Provider-supplied savings, commissions, markup and provider ordering never influence the result. Outlier or unstable observations remain visible for diagnosis but are excluded from headline aggregates.

## Data minimization and fail-closed rules

Provider identities are transformed with an HMAC-SHA256 key created in memory for a single run. The key and the raw IDs are never persisted. Persistable output must not contain credentials, HMAC inputs, authorization headers, tokens, destination IDs, hotel IDs, correlation IDs, continuation keys, commercial URLs, provider payloads or personal data.

Details, rooms-and-rates, revalidation, prebook, booking, cancellation and payment endpoints are unreachable from the allowlist. Continuation reuses the original search body and the same in-memory session values; a third continuation is rejected.

The collector remains private, provider-specific acquisition infrastructure. The F0 economic contract remains the provider-neutral decision-analysis boundary, and no R1 output is linked to public runtime or policy.

## Sanitized causal ledger and offline replay

Future live captures include the versioned diagnostic contract `stayopti.split-r1.causal-ledger@1`. This addition does not change the search-level economic policy or reinterpret the R1B.7 result. It records enough minimized evidence to reproduce and explain a future result without another provider request.

Each logical search records its scenario and window, `FULL_STAY`, `SEGMENT_1` or `SEGMENT_2` role, completion status, initial and continuation page counts, raw and normalized counts, and a deterministic rejection funnel. Raw observations reconcile to first-cause rejections, one best admissible price per run-local property fingerprint, and duplicate-property worse-price counts. Incomplete searches remain visible in the ledger but stay excluded from the economic headline.

The rejection vocabulary separates missing property identity or price, non-numeric and non-positive prices, missing or mismatched currency, unsupported monetary precision, worse duplicates and incomplete searches. Scenario replay separately counts a missing fixed baseline, temporal mismatch, missing segment candidates, same-property pairs, absence of a distinct-property pair and accepted conditional pairs. No quality or location gate is invented at this search-level layer.

For each selected conditional Split, the replay preserves the two run-local property fingerprints, each segment price in integer minor units, their integer sum, the fixed single baseline, gross difference, ratio, the frozen EUR 0/25/50/75/100/150 friction analysis and outlier classification. Full cross-products are derived from the minimized per-property best-price universe rather than redundantly persisted.

Pure replay modes are diagnostic and cannot alter the primary result:

- `CURRENT_DISTINCT_PROPERTY_POLICY` reproduces the current fixed-baseline and distinct-property rule;
- `SAME_PROPERTY_ALLOWED_DIAGNOSTIC` and `NO_DISTINCT_PROPERTY_REQUIREMENT` show the isolated effect of relaxing the distinct-property constraint;
- `UNCONSTRAINED_BEST_OBSERVED_SPLIT` retains the best observed segment pair even when no fixed full-stay baseline exists, without promoting it to a saving;
- `COMMON_PROPERTY_UNIVERSE_ONLY` limits candidates to properties observed full-stay and in at least one segment window;
- `FULL_STAY_AND_BOTH_SEGMENTS_INTERSECTION` uses only properties observed in all three windows.

The baseline remains selected before any Split, comparisons remain conditional, `ourprice` retains `UNPROVEN_SEARCH_LEVEL_WINDOW_PRICE`, strict comparisons remain zero, and outliers remain quarantined. A future capture fails if replay does not reproduce the primary scenario result byte-for-byte after canonical serialization. Search and property order do not influence replay.

Property pseudonyms are `HMAC-SHA256(runEphemeralSecret, rawPropertyIdentity)`. The secret is generated in memory, is never persisted and deliberately changes between runs; therefore fingerprints support correlations only inside one capture. Raw property, offer and destination identifiers, hotel names, addresses, URLs, credentials, session material, payloads and PII remain prohibited.

## Targeted high-variance matrix and precommitted kill criteria

SPLIT-R1C.2 freezes a second, explicitly targeted calibration matrix at `tests/engine-v3/fixtures/split-r1-targeted-scenario-matrix-v1.json`. It does not replace or edit the original eight-scenario generic matrix and it does not reinterpret the prior result: the current generic sample remains `NO_SIGNAL_IN_CURRENT_SAMPLE`, with zero positive comparisons out of eight. The targeted matrix asks a narrower question—whether a Split signal appears around a predeclared tariff-regime boundary—and is not a representative market sample.

The targeted matrix contains exactly six fixed windows and two fixed split points per window:

- Roma, 28 December 2026 to 4 January 2027, 7 nights, `NEW_YEAR_PEAK_INSIDE_SHOULDER_STAY`, splits 3/4 and 4/3;
- Firenze, 24 March to 3 April 2027, 10 nights, `EASTER_WEEKEND_INSIDE_LONGER_STAY`, splits 4/6 and 5/5;
- Amsterdam, 22 April to 4 May 2027, 12 nights, King's Day plus month boundary, splits 5/7 and 9/3;
- Paris, 7 to 21 July 2027, 14 nights, Bastille Day peak, splits 7/7 and 8/6;
- Madrid, 20 March to 10 April 2027, 21 nights, `EASTER_AND_MULTI_WEEKEND_VARIANCE`, splits 8/13 and 11/10;
- Barcelona, 20 June to 20 July 2027, 30 nights, `MONTH_BOUNDARY_AND_HIGH_SEASON_REGIME_CHANGE`, splits 10/20 and 15/15.

Every scenario freezes canonical coordinates, EUR, Italian guest nationality, one room, two adults, no children, no pets, no monetary ceiling, at most one change, two different properties and a minimum of two nights per segment. Each event or regime anchor falls inside its stay window. This produces exactly thirty logical searches, but SPLIT-R1C.2 authorizes zero provider requests and zero economic campaign budget.

The command `--targeted-matrix-v1` is an explicit offline-only mode. It validates the frozen fixture, produces six scenarios, thirty logical searches and zero HTTP requests, and exits before environment or credentials are considered. It cannot be combined with the production confirmations. The no-argument and `--dry-run` generic behavior remains eight scenarios, forty logical searches and zero HTTP requests.

### Price-semantics hard gate

RouteStack `ourprice` remains `UNPROVEN_SEARCH_LEVEL_WINDOW_PRICE`. SPLIT-R1C.2 does not authorize a live targeted run. Its receipt must therefore state `PRICE_SEMANTICS_GATE=HOLD` and `TARGETED_RUN_STATUS=HOLD_PRICE_SEMANTICS_UNPROVEN`. A future targeted run requires an independent authoritative confirmation that `ourprice` represents the same complete stay-window price concept for full stays and both segments. Search-level numerical behavior alone is not that proof.

Every future result must carry and deterministically replay `stayopti.split-r1.causal-ledger@1`. Incomplete ledger data, divergent replay or insufficient provider data is methodology-inconclusive; it cannot be converted into a negative or positive economic conclusion.

### Frozen classification contract

Classification is scenario-level: two positive split points in one scenario count as one signal. A `CANDIDATE_GO` requires all of the following:

- at least five of six scenarios have a valid baseline and comparison;
- at least two distinct scenarios remain net positive after EUR 50 friction;
- each counted signal has gross saving ratio at least 10%;
- at least one counted positive duration is 14 nights or longer;
- each counted Split uses different properties, is not an outlier and has stable baseline evidence;
- causal replay matches the primary result.

`CANDIDATE_CONDITIONAL` requires exactly one distinct scenario to meet the EUR 50, 10%, distinct-property, non-outlier and stable-baseline conditions. It can authorize only a later targeted confirmation of that same scenario, not a public claim.

`HOLD_NO_SIGNAL` applies when no scenario remains positive after EUR 25, every positive ratio is below 10%, positivity exists only in the same-property counterfactual, or positivity depends on an outlier or unstable baseline. It also applies whenever the evidence is methodologically complete but the full GO or exact-one-scenario conditional contract is not met.

`METHODOLOGY_INCONCLUSIVE` is reserved for fewer than four valid scenarios, unproven price semantics, an incomplete causal ledger, non-deterministic replay or insufficient provider data. It must never be used merely to avoid an otherwise negative result.

These outcomes are research controls only. Even `CANDIDATE_GO` does not activate Split, change ranking or policy, create market evidence, or permit a public recommendation.

### Anti-cherry-picking freeze

After this freeze, no scenario, date, split point, hotel filter, threshold or outlier rule may change after results are observed. A scenario without rates cannot be substituted. Two split points in one scenario never become two independent signals. A methodology-inconclusive result cannot be called positive or negative. New scenarios or additional provider requests require a new explicit phase and authorization.

## RouteStack `ourprice` temporal-scale micro-probe

SPLIT-R1C.3 freezes `stayopti.split-r1.ourprice-semantics-probe@1` as an offline diagnostic contract. It does not reinterpret SPLIT-R1B.7, remove the R1C methodology limitation, or unlock the targeted R1C.2 matrix. Its only future question is whether RouteStack search-level `ourprice` behaves empirically like a complete requested-window price or like an unmultiplied nightly price.

SPLIT-R1C.5 refines only the micro-probe continuation boundary after the preserved R1C.4 fail-closed result. Continuation metadata returned with an initial search page—including `nextResultsKey`, correlation context or a continuation token—is observable but does not represent an HTTP continuation request. The micro-probe processes only the results already present on that initial page, discards all raw continuation values before persistence and records only whether continuation metadata was present. It proceeds through A, B and AB even when each initial page advertises continuation. Constructing or sending a continuation remains prohibited, the continuation request count remains zero, and the immutable three hotel-search/five total-request budgets are unchanged.

The sole frozen scenario is Roma, EUR, one room, two adults and no children, using canonical coordinates 41.9028/12.4964. It contains exactly three windows:

- `A`: 2–3 February 2027, one night;
- `B`: 3–4 February 2027, one night;
- `AB`: 2–4 February 2027, two nights.

The explicit `--ourprice-semantics-probe-v1` command defaults to offline dry-run and produces one scenario, three logical hotel searches and zero HTTP requests. A future live execution requires both probe-specific confirmation flags. It has separate, non-increasable hard caps of three hotel-search requests and five RouteStack requests in total: one authentication, one deterministic destination lookup and the three initial searches. Continuation, retry, redirect, details, rooms/rates, revalidation, prebook, booking and payment are prohibited. Concurrency remains one and request starts remain at least 1,000 monotonic milliseconds apart. These micro-probe limits do not change the generic 80/100 R1 caps or any targeted matrix contract.

Only properties observed in all three windows can enter the calculation. The same run-local HMAC-SHA256 pseudonym must identify a property across A, B and AB; neither the ephemeral secret nor a fingerprint is persisted in the aggregate result. Cross-run linkage, raw provider identifiers, manual hotel selection, currency conversion, missing-value imputation, outlier removal and post-hoc subset selection are prohibited. Eligible observations require positive integer-minor-unit `ourprice`, EUR, identical occupancy and a common property pseudonym.

For each common property, the precommitted calculation is:

- `expectedTotal = priceA + priceB`;
- `expectedNightly = (priceA + priceB) / 2`;
- `totalError = abs(priceAB - expectedTotal) / expectedTotal`;
- `nightlyError = abs(priceAB - expectedNightly) / expectedNightly`.

The implementation uses the algebraically equivalent integer-minor-unit form for nightly error before division, avoiding monetary rounding. The aggregate includes the common-property count, median and R7 linearly interpolated p25/p75 for both errors, total-closer/nightly-closer/tie shares, and sanitized minimum/median/maximum prices for A, B and AB over the complete common universe.

`TOTAL_STAY_EMPIRICALLY_SUPPORTED` requires at least ten common properties, median total error at most 0.20, median nightly error at least 0.35 and total-closer share at least 0.80. `NIGHTLY_EMPIRICALLY_SUPPORTED` requires at least ten common properties, median nightly error at most 0.20, median total error at least 0.35 and nightly-closer share at least 0.80. Every other result is `INCONCLUSIVE`. Simultaneous truth of both predicates is an invariant failure named `AMBIGUOUS_CLASSIFICATION_INVARIANT_FAILURE`.

Even a total-stay empirical result leaves taxes, mandatory charges and bookable-price equivalence unproven. It is not contractual provider confirmation, market evidence, policy eligibility or a public recommendation, and it does not authorize the targeted live matrix. Only a separately authorized phase may execute the five-request micro-probe.

### Bounded-continuation micro-probe v2

SPLIT-R1C.7 preserves the v1 contract and its R1C.6 `INCONCLUSIVE` result without reinterpretation. It freezes `stayopti.split-r1.ourprice-semantics-probe@2` solely because all three successful initial A/B/AB responses carried continuation metadata but materialized no normalized offers. The resulting root-cause classification is `INITIAL_SEARCH_ASYNC_ENVELOPE_REQUIRES_BOUNDED_CONTINUATION_FOR_RESULT_MATERIALIZATION`. V2 changes acquisition only; the scenario, common-property universe, pseudonymization, money handling, formulas, percentiles and total/nightly/inconclusive predicates remain unchanged.

The v2 dry-run remains one scenario, three logical searches and zero HTTP. A future separately authorized live run is hard-limited to one authentication, one destination lookup, three initial hotel searches, at most two continuations per window, at most six continuation requests, at most nine hotel-search requests and at most eleven RouteStack requests in total. These values are constants and exact fixture fields: no CLI flag, environment variable or injected external budget can increase them. Retry and redirect remain zero, concurrency remains one, and request starts remain separated by at least 1,000 monotonic milliseconds.

Continuation scheduling is breadth-first and deterministic: initial A, B and AB; continuation round one A, B and AB where eligible; common-universe evaluation; then, only when fewer than ten common properties exist, continuation round two A, B and AB where eligible. A window is ineligible when it lacks a non-empty `nextResultsKey`, is terminal, already used two continuations or would exceed a hard budget. A third continuation is impossible. When the common universe reaches ten properties after round one, acquisition stops before round two; this threshold controls acquisition only and does not change classification.

Initial and continuation offers for a window are accumulated and deterministically reduced under the existing best-price-per-run-local-property contract. Continuation `token`, `correlationId` and `nextResultsKey` exist only in memory long enough to build the immediately following request. They are never logged or persisted and are discarded before the aggregate result is returned. Persisted continuation information is restricted to booleans and integer counts: metadata presence, rounds executed and continuation HTTP requests. Raw continuation values, provider IDs, HMAC secrets and property fingerprints remain absent from output; cross-run linkability remains disabled.

V2 is still a private diagnostic. It does not authorize a provider call in SPLIT-R1C.7, does not unlock the targeted matrix, does not establish taxes or mandatory-charge completeness, does not establish bookable-price equivalence, and cannot change V2, V3, ranking, policy or any public recommendation.

## Empirical totality receipt and tax-semantics decision

SPLIT-R1C.9 preserves the v1 micro-probe, the v2 acquisition contract and every earlier result. It records the successful R1C.8 aggregate as the immutable, sanitized receipt `stayopti.split-r1.ourprice-empirical-totality-receipt@1`, bound to source SHA `5662c56542d51eeafd3106c8aa9070cae65f8e34` and probe `stayopti.split-r1.ourprice-semantics-probe@2`. The receipt contains only the precommitted criteria, aggregate metrics, decision boundaries and zero-valued privacy counters. It contains no property fingerprint, provider identifier, continuation value, credential or cross-run linkage.

The preserved aggregate comprises 1,210 common properties and 1,210 eligible triples. Median total error is `0.010575498616742446`, with R7 p25/p75 `0.0009658711290823479` and `0.03916262947299449`. Median nightly error is `1.0001592224733593`, with R7 p25/p75 `0.98702609903896` and `1.0279044580576178`. Total is closer for `0.9851239669421488` of triples, nightly is closer for `0.01487603305785124`, and ties are zero. Under the unchanged precommitted predicates, the result is `TOTAL_STAY_EMPIRICALLY_SUPPORTED`.

The only admitted temporal statement is:

`OURPRICE_TEMPORAL_SEMANTICS=SEARCH_WINDOW_TOTAL_EMPIRICALLY_SUPPORTED`

This means that, in this bounded production probe, `ourprice` behaved empirically as a price for the complete requested search window rather than as an unmultiplied nightly price. It must not be described as a final, tax-inclusive, all-in, payable, bookable or confirmed total. Temporal totality is distinct from fiscal and transactional completeness, so the gates remain independently recorded:

- `TEMPORAL_TOTALITY_GATE=PASS_EMPIRICAL`;
- `TAX_COMPLETENESS_GATE=HOLD`;
- `MANDATORY_CHARGES_GATE=HOLD`;
- `BOOKABLE_EQUIVALENCE_GATE=HOLD`;
- `CONTRACTUAL_PROVIDER_CONFIRMATION=NO`.

Temporal totality is therefore no longer the blocker for the frozen targeted research matrix. The matrix becomes eligible only for a future, separately and directly authorized private diagnostic run. Its output label is `diagnostic gross price delta`, not confirmed saving. Taxes, mandatory supplements, rate conditions and bookability remain compulsory limitations. A positive diagnostic delta cannot create commercial GO, policy eligibility or a public recommendation without a separately authorized recheck/prebook step and verification of mandatory costs. A negative result remains evidence about the frozen sample only and cannot prove universally that Split never works.

The targeted scenario fixture remains byte-identical and retains its historical pre-R1C.8 HOLD field. The collector overlays the versioned empirical receipt when producing the targeted dry-run contract; it does not mutate the matrix, enable live execution or weaken the direct-authorization boundary. Fixed baseline, distinct-property enforcement, funnel accounting, causal replay ledger, budgets, breadth-first scheduler, continuation policy, outlier quarantine and anti-cherry-picking rules are unchanged. RouteStack remains disabled in the public provider registry, and no V2, V3 decision-core, ranking or public-policy boundary changes in this phase.

## Sandbox nightly dynamic-pricing methodology freeze

SPLIT-R1C.10 preserves the prior generic and targeted evidence without reinterpretation. The historical eight RouteStack comparisons remain valid for the two frozen `half/alt` breakpoints that were actually tested, but their breakpoint method is classified as `LIMITED_ARBITRARY_TWO_BREAKPOINT_SAMPLE`. Zero positive comparisons in that limited sample is not sufficient for a universal Split kill decision. No prior dataset, receipt, fixture or result is changed.

The frozen replacement methodology has four deliberately separate layers:

1. **Nightly Scout** builds one-night price curves for run-local property pseudonyms and ranks promising breakpoints from price increases, decreases or stability, crossovers, proxy delta magnitude, remaining nights, persistence, availability and observable comparability. These signals generate and explain candidates only. A budget is never a candidate filter.
2. **Exhaustive Breakpoint Oracle** obtains an actual prefix and suffix search-window quote for every possible breakpoint. It never treats the sum of one-night observations as an economic price.
3. **Candidate Validation** compares each exact prefix-plus-suffix total with the one fixed best full-stay baseline selected before breakpoints are inspected. The headline requires two different properties; same-property results remain a separate counterfactual.
4. **Commercial Validation** remains a future, separately authorized step for taxes, mandatory charges, rate conditions and recheck/prebook evidence. Nothing in the Sandbox methodology creates commercial GO, policy eligibility or a public recommendation.

For an `N`-night stay, the oracle freezes exactly `1 + N + 2 * (N - 1)` logical hotel searches: one full stay, `N` one-night windows, and one real prefix plus one real suffix for every breakpoint `1..N-1`. The one frozen pilot fixture, `stayopti.split-r1.sandbox-nightly-oracle-pilot@1`, uses Milano from 4–18 October 2027, EUR, one room, two adults, no children, fourteen nights and all thirteen breakpoints. Its dry-run is therefore one scenario, one full-stay search, fourteen nightly searches, thirteen prefixes, thirteen suffixes, forty-one logical searches and zero HTTP requests.

Every economic comparison uses only `SEARCH_WINDOW_TOTAL_EMPIRICALLY_SUPPORTED` full, prefix and suffix observations in integer minor units. Taxes, mandatory charges and bookable-price equivalence remain `UNPROVEN`. The comparison records the exact segment prices and their sum, fixed baseline, diagnostic gross price delta and ratio, explicit EUR 0/25/50/75/100/150 friction sensitivity, available rating/distance evidence, currency and occupancy constraints, and comparability rejection reasons. Friction is never silently subtracted and no result is called a confirmed saving.

### Scout recall and precommitted near-best rule

The oracle produces the exact best observed breakpoint, while the Scout reports `TOP_1_EXACT_BEST_RECALL`, `TOP_3_EXACT_BEST_RECALL`, `TOP_5_EXACT_BEST_RECALL`, `TOP_3_NEAR_BEST_RECALL` and `TOP_5_NEAR_BEST_RECALL`. It also reports the oracle rank of every proposal, absolute and baseline-relative regret, and an explicit false-negative reason when the exact optimum falls outside the top five.

The immutable `stayopti.split-r1.near-best-threshold@1` rule was fixed offline before any Sandbox result: absolute regret must be at most 2,500 minor units and baseline-relative regret must be at most 0.02. Both limits must pass. This threshold is a methodological recall boundary, not a commercial relevance threshold, and was not calibrated on live results.

### Equal-coverage continuation and claims

Continuation is `BREADTH_FIRST_EQUAL_DEPTH`: all forty-one initial windows precede continuation round one, and no search receives a deeper page before every eligible search has equal opportunity at the prior depth. Each search permits at most two continuation requests. The immutable caps are forty-one initial hotel requests, eighty-two continuations, 123 hotel-search requests and 125 total RouteStack requests, including one authentication and one destination lookup. Retry and redirect remain zero, concurrency remains one, and request starts remain at least 1,000 monotonic milliseconds apart. No CLI, environment variable or external configuration can increase these limits.

Coverage is explicitly `PROVIDER_COMPLETED` or `BOUNDED_TRUNCATED`. Only complete equal-depth coverage permits the claim `GLOBAL_OPTIMUM_WITHIN_PROVIDER_COMPLETED_SEARCH_SET`. Any bounded truncation is labeled `BEST_OBSERVED_WITHIN_EQUAL_COVERAGE`; the unqualified claim `GLOBAL_OPTIMUM` is prohibited.

### Sanitized nightly-oracle causal ledger

The versioned `stayopti.split-r1.sandbox-nightly-oracle-causal-ledger@1` records a per-search funnel, aggregate nightly curves, Scout proposals, every quoted breakpoint, exact prefix and suffix prices, the fixed full-stay baseline, split total, Scout and oracle ranks, regret, comparability rejections and coverage class. Property identity is represented only by a run-local HMAC-SHA256 pseudonym created with an ephemeral in-memory secret. Raw property, destination and continuation IDs, tokens, credentials, HMAC keys and provider payloads are prohibited. The secret is not persisted and cross-run linkability is deliberately unavailable.

### Offline Sandbox contract preflight

The local preflight found only the existing production-style `ROUTESTACK_BASE_URL`, `ROUTESTACK_API_KEY` and `ROUTESTACK_API_SECRET` binding, with the configured HTTPS host `mcp.routestack.ai`. It found no Sandbox-specific base URL or credential variables, no Sandbox-specific auth/search/continuation contract, no documented Sandbox rate limit or CTS proof, and no evidence that Sandbox quota is separate, non-production or unbilled. No secret value was read into output.

Accordingly, the frozen receipt is:

- `SANDBOX_BASE_URL_CLASS=PRODUCTION_ONLY_CONFIGURATION_PRESENT`;
- `SANDBOX_CREDENTIALS_PRESENT=NO`;
- `SANDBOX_AUTH_CONTRACT_MATCH=UNPROVEN_SANDBOX_SPECIFIC`;
- `SANDBOX_SEARCH_CONTRACT_MATCH=UNPROVEN_SANDBOX_SPECIFIC`;
- `SANDBOX_QUOTA_CLASSIFICATION=CREDENTIALS_OR_CONTRACT_UNAVAILABLE`;
- `SANDBOX_LIVE_AUTHORIZED=NO`.

The offline methodology and dry-run may be validated, but no Sandbox network execution is authorized. Even after a future contract preflight, Sandbox can validate candidate generation, recall, deterministic oracle behavior and causal explanations only: `SANDBOX_METHOD_VALIDATION_ALLOWED=YES`, `SANDBOX_MARKET_EVIDENCE_ALLOWED=NO`, `SANDBOX_SPLIT_FREQUENCY_CLAIM_ALLOWED=NO`, `SANDBOX_COMMERCIAL_GO_ALLOWED=NO` and `SANDBOX_PUBLIC_RECOMMENDATION_ALLOWED=NO`. RouteStack remains disabled in the public provider registry.

### Dedicated Sandbox environment binding

SPLIT-R1C.11 supersedes only the local availability finding in the preceding R1C.10 preflight; it does not rewrite that historical receipt or change the nightly-oracle fixture. The ignored, untracked `server/.env` now contains all three dedicated names `ROUTESTACK_SANDBOX_BASE_URL`, `ROUTESTACK_SANDBOX_API_KEY` and `ROUTESTACK_SANDBOX_API_SECRET` while preserving the three Production bindings. The two key values and the two secret values are distinct in the local file. Only presence and equality booleans were inspected; no credential value, prefix, suffix, length or fingerprint is recorded.

The configured Sandbox URL is structurally valid as HTTPS, root-only, default port 443, without user information, query or fragment. Its hostname is `evolvemcp.routestack.ai`, differs from the Production host, belongs syntactically to the `routestack.ai` domain, and is neither localhost nor an IP literal. Those structural facts do not prove that RouteStack operates it as an official Sandbox endpoint.

The production OpenAPI and local examples document the auth, destination, hotel-search and continuation shapes for the Production surface only. They contain no Sandbox server declaration, Sandbox-specific contract, documented rate limit, CTS evidence or quota-separation statement. Consequently the current classifications are:

- `SANDBOX_HOST_OFFICIALITY=UNPROVEN`;
- `SANDBOX_HOST_ALLOWLIST_STATUS=HOLD`;
- `SANDBOX_AUTH_CONTRACT=UNPROVEN`;
- `SANDBOX_DESTINATION_CONTRACT=UNPROVEN`;
- `SANDBOX_HOTEL_SEARCH_CONTRACT=UNPROVEN`;
- `SANDBOX_CONTINUATION_CONTRACT=UNPROVEN`;
- `SANDBOX_QUOTA_CLASSIFICATION=NOT_DOCUMENTED`;
- `SANDBOX_LIVE_AUTHORIZED=NO`.

The private collector now owns the versioned binding `stayopti.split-r1.sandbox-environment-binding@1`. `--sandbox-nightly-oracle-v1` remains dry-run by default. A future live attempt must also supply both `--execute-sandbox-nightly-oracle-live` and `--confirm-routestack-sandbox-search-only`, must be a fresh Node process bound natively to the existing `server/.env`, and reads only the three `ROUTESTACK_SANDBOX_*` names. There is no fallback to `ROUTESTACK_*`, `MCP_BASE_URL`, Production credentials or the Production base URL.

The Sandbox URL validator rejects HTTP, non-default ports, user information, query strings, fragments, non-root paths, the Production hostname, localhost, IP literals and hosts outside `routestack.ai`. Domain membership alone is not an allowlist: because exact officiality is unproven, no hostname—including `evolvemcp.routestack.ai` or another plausible subdomain—is currently frozen as allowed. The binding therefore terminates before transport creation and before `fetch` even when both confirmation flags are present.

Future budget constants remain immutable caps rather than consumption targets: one auth, one destination lookup, forty-one initial hotel searches, at most two equal-depth breadth-first continuations per search, eighty-two continuation requests, 123 hotel-search requests and 125 RouteStack requests total. Retry and redirect are zero, concurrency is one and the minimum monotonic request-start interval is 1,000 milliseconds. CLI and environment inputs cannot increase any cap; continuation stops when the provider declares completion.

Before any future Sandbox execution, RouteStack must provide authoritative confirmation of the exact Sandbox hostname, applicability of the auth/destination/search/continuation contract, and whether its quota is separate, non-production and non-billable or instead shared/billable. Until all three points are documented and frozen in a later explicitly authorized phase, Sandbox remains a zero-network design surface only.

### Sanitized continuation metadata shape diagnosis

SPLIT-R1C.14 adds the offline receipt `stayopti.split-r1.continuation-metadata-shape@1` after the R1C.13 initial Sandbox response proved that `result.correlationId`, `result.token` and `result.nextResultsKey` were not simultaneously complete. This receipt does not reinterpret that result and does not attest that the Sandbox continuation contract is proven.

Diagnosis is restricted to the explicitly allowlisted structural paths at the root, `result`, `data` and `result.data` containers for the three known field names. Each record contains only the path, presence, JSON type, scalar/array/object shape and empty/non-empty string state. The implementation performs no recursive key enumeration and persists no metadata value, raw provider identifier, secret or reusable fingerprint.

The existing contractual container remains `result`. A complete non-contractual container is diagnostic only and cannot authorize continuation. Missing or partially typed fields classify as `INCOMPLETE_CONTINUATION_METADATA_SHAPE`. Multiple complete containers with discordant in-memory values classify as `AMBIGUOUS_CONTINUATION_METADATA_SHAPE`. Both outcomes fail closed. Matching duplicate containers may be reported structurally, but only a complete, unambiguous `result` container can be selected by the unchanged continuation contract.

This change is offline-only. It does not alter request construction, scheduler, rate limiter, budget, retry or redirect policy, breadth-first continuation, Split economics, Production configuration, provider enablement or public runtime. A later separately authorized canary may invoke the pure diagnostic function on an initial response and retain only its sanitized receipt.

### Sandbox terminal completion and continuation reassessment

SPLIT-R1C.16 adds the offline receipt `stayopti.split-r1.sandbox-initial-search-state@1`. It preserves the R1C.15 canary as observed: HTTP 200 JSON, provider application status `Completed`, 167 processable initial results, non-empty `result.correlationId` and `result.token`, and a present `result.nextResultsKey` whose value is `null`. No continuation was attempted. The receipt stores only the existing allowlisted path shapes and aggregate counts; it never stores continuation values or raw provider identifiers.

The Sandbox-only state machine distinguishes four classes. `SANDBOX_TERMINAL_COMPLETED_INITIAL` maps to coverage `PROVIDER_DECLARED_TERMINAL_INITIAL` only when the HTTP/JSON response is valid, the case-insensitive exact application status is `Completed`, `result.nextResultsKey` is present and null, the initial page was processed, and no continuation was attempted. This means only that the provider declared that one Sandbox search terminal. It does not prove universal inventory coverage, market completeness, a global optimum, Production behavior or commercial validity.

`SANDBOX_CONTINUATION_AVAILABLE` maps to `PROVIDER_CONTINUATION_AVAILABLE` only for a complete non-empty string triple at the exact `result` paths. A complete triple takes precedence even if the application status says `Completed`; this phase only marks technical eligibility and does not execute it. A non-terminal response with a null, empty, missing or wrongly typed component maps to `SANDBOX_INCOMPLETE_ASYNC_METADATA` / `ASYNC_METADATA_INCOMPLETE`. Multiple complete groups, or a terminal-null result state contradicted by a complete alternate group, map to `SANDBOX_AMBIGUOUS_ASYNC_METADATA` / `ASYNC_METADATA_AMBIGUOUS`. Both remain fail-closed.

This reassessment is Sandbox-specific. It does not change the Production continuation request contract, fixed budgets, monotonic limiter, concurrency one, zero retry/redirect policy, equal-depth breadth-first scheduling, the 41-search/13-breakpoint oracle, economic comparability, fixed baseline, distinct-property headline, same-property diagnostic, RouteStack provider enablement or public runtime. No Sandbox campaign or global-optimum claim is authorized.

### Sanitized Sandbox asynchronous application-status diagnosis

SPLIT-R1C.18 preserves the R1C.17 canary as inconclusive: its initial Sandbox response was HTTP 200 JSON with eight processable EUR results and numeric `ourprice`, but no eligible `applicationStatus` was observed while the exact `result.nextResultsKey` path was present and null. No continuation was executed. This result is not reinterpreted as terminal, and the earlier R1C.13/R1C.15 observations of `Completed` with 165/167 processable results remain separate historical canaries.

The versioned receipt `stayopti.split-r1.async-status-shape@1` diagnoses exactly four allowlisted paths: root `applicationStatus`, `result.applicationStatus`, `data.applicationStatus` and `result.data.applicationStatus`. It does not inspect a generic `status` field and performs no recursive key enumeration. For each path it persists only presence, JSON type, structural shape, empty/non-empty string state, an allowlisted canonical category and application-status eligibility. Canonical categories are `COMPLETED`, `PENDING`, `IN_PROGRESS`, `FAILED`, `OTHER_NON_EMPTY_STRING`, `NULL`, `EMPTY_STRING`, `ABSENT` and `INVALID_TYPE`; the underlying text for `OTHER_NON_EMPTY_STRING` is never retained.

Exactly one eligible status path may be selected. Two or more eligible paths fail closed as ambiguous even when their canonical categories agree; discordant categories are additionally marked contradictory. A terminal initial response still requires HTTP 200 JSON, one uniquely selected `COMPLETED` status, a present-null exact `result.nextResultsKey`, processable initial results and no continuation attempt. Missing, null, empty or invalid status with a null key remains `SANDBOX_INCOMPLETE_ASYNC_METADATA`. Pending or InProgress with a null key also remains incomplete. Result counts—including 8, 165 or 167—never influence the asynchronous classification.

Continuation eligibility remains independent of a missing status only when the exact `result.correlationId`, `result.token` and `result.nextResultsKey` triple consists of non-empty strings and no status or continuation-shape ambiguity exists. `correlationId` and `token` alone remain insufficient. A complete triple may be technically eligible even when the single status is `Completed`, but this offline phase executes no HTTP and changes neither continuation request construction nor the Production classifier.

The receipt stores no raw status, continuation value, provider identifier, response payload, secret or reusable fingerprint. Rate limiting, concurrency one, retry/redirect zero, immutable budgets, breadth-first equal-depth scheduling, the 41 logical searches and 13 breakpoints, Split economics, fixed baseline, comparability, deduplication and public boundaries remain unchanged. The Sandbox pilot, market-evidence claim and global-optimum claim remain unauthorized.

### Prospective bounded-snapshot collection contract

SPLIT-R1C.21 introduces `stayopti.split-r1.collection-coverage@1` after the offline provenance audit established that the historical `Completed` observations cannot be reconstructed from a versioned live renderer, `applicationStatus` is absent from the local provider schema, and neither `result.status` nor `nextResultsKey=null` is documented locally as a terminality signal. The R1C.13, R1C.15, R1C.17, R1C.19 and R1C.20 results retain their original classifications and context. They are not reinterpreted or promoted. This contract supersedes the R1C.16/R1C.18 terminal assumption prospectively for executions after R1C.21 only.

An initial HTTP 200 JSON response with processable results and no unique complete continuation binding is `PROVIDER_NO_CONTINUATION_EXPOSED`, with coverage `BOUNDED_INITIAL_SNAPSHOT_NO_CONTINUATION_EXPOSED`. Null, absent, empty or wrongly typed `result.nextResultsKey` values all have the same narrow meaning: no usable continuation was exposed in that response. They do not prove provider-declared terminality, completeness of inventory, completeness of the market or a global optimum. Such a snapshot may be used only to measure the technical Split opportunity inside the returned bounded snapshot.

A continuation is available only when exactly one complete binding exists at the contractual `result.correlationId`, `result.token` and `result.nextResultsKey` paths, with all three values non-empty strings. A complete non-contractual binding or more than one complete binding is `AMBIGUOUS_CONTINUATION_METADATA` and fails closed. Invalid HTTP, invalid JSON or unprocessable initial results are `INITIAL_SNAPSHOT_UNPROCESSABLE` and cannot contribute to Split conclusions. Current local provider evidence documents no terminal signal, so `providerDeclaredTerminal=false` and `providerTerminalSignalDocumented=false` are invariant.

The four allowlisted `applicationStatus` paths remain a sanitized observational diagnostic only. `applicationStatus` is not required to process a snapshot and has no terminal or continuation authority. Generic `status` is not added to that allowlist, and schema-documented `result.status` is not treated as terminal without explicit provider documentation. There is no fallback, recursive key enumeration or synthetic equivalence between status fields.

The only permitted result wording is “best observed within the returned bounded snapshot” / “migliore soluzione osservata nello snapshot delimitato restituito”. “Global optimum” and “best available in the market” are prohibited. The receipt always sets completeness, global-optimum and Sandbox-market-evidence claims to false and persists only aggregate counts, structural booleans and sanitized metadata shapes. It stores no continuation value, provider ID, raw payload, secret or cross-run identity.

This prospective repair changes neither the Split arithmetic nor fixed-baseline, distinct-property, comparability, deduplication, causal-ledger, breakpoint, anti-cherry-picking or friction rules. The monotonic limiter, concurrency one, retry/redirect zero, per-phase HTTP budgets and breadth-first equal-depth scheduler remain unchanged. It also changes neither the Production contract nor RouteStack provider enablement, V2/V3 decision cores, policy or public runtime. No live Sandbox or Production call is authorized by this section.

### Exact bounded-snapshot live runner contract

SPLIT-R1C.22A preserves the R1C.22 `BLOCKED` result, zero HTTP, unread credentials and `SANDBOX_NIGHTLY_ORACLE_LIVE_EXECUTION_NOT_IMPLEMENTED_EXACT_43_HTTP_ZERO_CONTINUATION_CONTRACT` classification without reinterpretation. It adds a prospectively usable, explicitly selected Sandbox mode for a later separately authorized R1C.22B execution. The default `--sandbox-nightly-oracle-v1` path remains the canonical one-scenario, forty-one-search, thirteen-breakpoint, zero-HTTP dry-run. Credentials alone cannot enable live execution. The historical continuation-capable 125/123/82 fixture contract and every other live path remain held.

The new mode additionally requires `--live-bounded-pilot` and both dedicated Sandbox confirmations. It is eligible only when the live plan is byte-equivalent under deterministic serialization to the plan materialized by the dry-run generator and the exact immutable contract is present: one authentication, one destination lookup, forty-one initial hotel searches, zero continuations and forty-three RouteStack requests total. Retry and redirect are zero, concurrency is one, request starts are separated by at least 1,000 monotonic milliseconds, and the only accepted base URL is `https://evolvemcp.routestack.ai`. Production fallback and similar-host matching are prohibited.

One authoritative in-memory ledger accounts separately for authentication, destination, initial hotel search, continuation and forbidden requests. It reserves a category only after the monotonic rate slot is ready and immediately before transport. The forty-second initial request, any continuation and any request beyond the forty-third total are rejected before `fetch`. The transport exposes no generic endpoint method: details, rates, recheck, prebook, booking and payment routes are structurally unreachable. An initial response with a complete continuation triple remains `PROVIDER_CONTINUATION_AVAILABLE` and `continuationEligible=true`, but the initial bounded snapshot alone may be processed and `continuationExecuted=false`; no continuation value is passed to another request, logged or persisted.

The mode uses `stayopti.split-r1.collection-coverage@1`. `applicationStatus` remains unnecessary and has no terminal authority; `result.status` remains non-authoritative. Bounded snapshots never imply completeness, a global optimum or Sandbox market evidence. Output remains a private technical diagnostic described only as the best observed within the returned bounded snapshot. Raw metadata, provider identifiers, credentials, payloads, responses and cross-run fingerprints remain prohibited. This implementation changes neither Split economics, fixed baseline, distinct-property comparison, pseudonymization, causal replay, public provider enablement nor any V2/V3/public boundary. R1C.22A itself authorizes no provider call.

### Sanitized per-search economic-eligibility funnel

SPLIT-R1C.24 introduces the diagnostic receipt `stayopti.split-r1.economic-eligibility-funnel@1`. It preserves the R1C.22B live result and the R1C.23 offline causal conclusion without reinterpretation. In particular, the fixed full-stay baseline remains independent from every Split pair, cross-query HMAC identity remains run-local, and the economic evaluator, currency requirement, deduplication, distinct-property rule, minor-unit arithmetic, breakpoint comparisons and multi-label rejection reasons are unchanged.

The receipt follows every one of the forty-one canonical logical searches by ordinal and allowlisted role only: `FULL_STAY`, `NIGHTLY`, `SPLIT_LEFT` or `SPLIT_RIGHT`. It counts raw results, normalizable results, identity-eligible results, positive precision-safe prices, expected-currency matches, missing currency, non-expected currency and invalid currency representation. It then records the number of pre-dedup economic offers, duplicate property offers removed, final distinct-property offers, baseline contribution and Split-pair contribution. For multi-page inputs the counters accumulate deterministically before run-local property deduplication; the bounded live contract itself remains exactly forty-one initial searches and zero continuations.

Currency diagnostics persist only `MATCH`, `MISSING`, `NON_MATCH` or `INVALID_TYPE`, together with the categories `EUR_EXPECTED`, `OTHER_CONFIGURED_EXPECTED`, `EXPECTED_ONLY`, `NON_EXPECTED_ONLY`, `MIXED`, `NONE` and `INVALID_PRESENT`. A non-expected raw currency code is never retained. The deterministic zero-offer state is limited to the allowlist `NO_RAW_RESULTS`, `NO_NORMALIZABLE_RESULTS`, `NO_IDENTITY_ELIGIBLE_RESULTS`, `NO_NUMERIC_PRICE_ELIGIBLE_RESULTS`, `NO_EXPECTED_CURRENCY_RESULTS`, `ALL_RESULTS_MISSING_CURRENCY`, `ALL_RESULTS_NON_EXPECTED_CURRENCY`, `ALL_RESULTS_INVALID_CURRENCY_TYPE`, `MIXED_CURRENCY_ELIGIBILITY_FAILURE`, `DEDUPLICATION_LEFT_NO_DISTINCT_PROPERTIES` and `OTHER_ALLOWLISTED_ECONOMIC_GATE`; a non-empty final set is `ECONOMIC_OFFERS_AVAILABLE`.

Exactly one canonical full-stay search supplies all thirteen breakpoint comparisons. Its counts are aggregated once, never multiplied by thirteen, and expose whether `fullOffers[0]` can exist and, if not, the deterministic sanitized reason. A separate breakpoint section records only left/right final distinct-property counts and whether a cross-property pair exists; it contains neither individual prices nor fingerprints.

The receipt contains no provider identifier, property fingerprint, individual price, raw currency code, continuation metadata, payload, response, credential or cross-run identity. It remains diagnostic-only and explicitly denies completeness, global-optimum and Sandbox-market-evidence claims. It authorizes no live execution and changes neither the exact 43/41/0 budget, monotonic limiter, concurrency one, zero retry/redirect policy, Production prohibition nor public runtime.

### Canonical full-stay three-request canary mode

SPLIT-R1C.25A preserves the preceding R1C.25 `BLOCKED` result, its zero HTTP count and its `CANONICAL_FULL_STAY_THREE_HTTP_CANARY_MODE_NOT_IMPLEMENTED` classification. Prospectively, it adds the separate explicit flag `--live-canonical-full-stay-canary`. The flag requires the existing Sandbox nightly-oracle flag and both dedicated Sandbox confirmations, is disabled by default, and is mutually exclusive with `--live-bounded-pilot`. Credentials alone still cannot select a live path, and every non-exact mode remains behind the existing hold.

The canary materializes the same complete one-scenario, forty-one-search, thirteen-breakpoint plan used by the dry-run, full bounded pilot and evaluator before reading any environment binding. It selects the unique `FULL_STAY` binding through the same selector now used by `evaluateSplitR1SandboxNightlyOracleV1`; absence, multiplicity, plan drift or deterministic binding/payload drift fails closed before credential access. The request is derived from that canonical binding after the single destination has been selected. No NIGHTLY, PREFIX, SUFFIX or alternative payload can execute.

The immutable canary contract permits exactly one authentication, one destination lookup, one initial hotel search, zero continuations and three RouteStack requests total. Retry and redirect remain zero, concurrency remains one, and request starts remain separated by at least 1,000 monotonic milliseconds. A dedicated in-memory ledger blocks the second initial request, fourth total request, every continuation and every non-allowlisted route before `fetch`. The exact full-pilot contract remains independently frozen at 43/41/0 and cannot be substituted into the canary or vice versa.

The result contains the existing `stayopti.split-r1.collection-coverage@1` receipt and a single-search `stayopti.split-r1.economic-eligibility-funnel@1` receipt for the canonical full-stay only. A complete continuation triple may set availability and eligibility to true, but continuation execution stays false by construction and none of its values is passed to a subsequent transport or persisted. The receipt remains diagnostic-only and changes no economic selection, comparability, deduplication, currency gate, Split formula, completeness claim, global-optimum claim, Sandbox market-evidence boundary, Production contract or public runtime. This offline implementation itself authorizes and performs no provider call.

### R1C.26A alternative full-stay qualification mode

R1C.26A adds the separate, explicit and default-disabled flag `--live-alternative-full-stay-qualification`. It is mutually exclusive with both `--live-bounded-pilot` and `--live-canonical-full-stay-canary`, requires the existing Sandbox nightly-oracle flag plus both dedicated Sandbox confirmations, and cannot be enabled by credentials alone. Every other configuration remains behind the live-contract hold.

The qualification contract is immutable: one authentication, one destination lookup, exactly three initial full-stay searches, zero continuation and five RouteStack HTTP requests in total. Retry and redirect counts remain zero, concurrency remains one, and request starts remain at least 1,000 ms apart. The fourth initial search, sixth total request, every continuation and every non-allowlisted route are rejected before transport. The full bounded pilot remains `43/41/0`; the canonical canary remains `3/1/0`.

The three ordered candidate windows are frozen as 2026-11-30 through 2026-12-14, 2027-03-01 through 2027-03-15, and 2027-05-24 through 2027-06-07. Each candidate is built by cloning the canonical Sandbox scenario in memory and replacing only `checkIn` and `checkOut`. The existing canonical generator must then reproduce one scenario, forty-one logical searches, thirteen breakpoints and exactly one `FULL_STAY` binding. Destination, occupancy, EUR currency, constraints and every non-date field must remain byte-equivalent under deterministic serialization. Only the derived full-stay binding is executed; the other forty searches are not.

All three searches execute in frozen order even when an earlier candidate has a baseline. Selection occurs only after collection and is `FIRST_ORDERED_CANDIDATE_WITH_BASELINE`: the first bounded, usable candidate with at least one final distinct-property economic offer and a baseline wins. Later result counts and prices cannot override it. If no candidate qualifies, the full pilot remains stopped. Promotion is prepared offline by applying only the selected dates to the canonical in-memory scenario and rebuilding through the same generator; it fails closed unless the result is again exactly `1/41/13` with one full-stay binding. Qualification never executes that promoted pilot.

Each candidate emits only allowlisted aggregate fields from `stayopti.split-r1.collection-coverage@1` and `stayopti.split-r1.economic-eligibility-funnel@1`. No raw property or destination identifier, hotel name, individual price, unexpected raw currency, continuation value, payload, response, secret or cross-run pseudonym is persisted. The receipts are diagnostic only and do not change economic selection, comparability, deduplication, currency policy, Split formulas, completeness claims, global-optimum boundaries, Sandbox market-evidence status, Production behavior or the public runtime. R1C.22B, R1C.25B and R1C.26 remain historical results and are not reinterpreted.

### R1C.27A selected-alternative full-pilot binding

R1C.27A preserves the R1C.27 `BLOCKED` result, its zero HTTP count and the `SELECTED_CANDIDATE_DATE_OVERLAY_NOT_BOUND_TO_FULL_BOUNDED_LIVE_DISPATCH` classification. Prospectively, it adds the explicit and default-disabled flag `--live-selected-alternative-bounded-pilot`. This fourth Sandbox live mode remains mutually exclusive with the historical bounded pilot, canonical full-stay canary and three-window qualification. It still requires the nightly-oracle flag and both dedicated Sandbox confirmations; credentials alone cannot select it.

The selected mode freezes Candidate 1 and `FIRST_ORDERED_CANDIDATE_WITH_BASELINE`: Milano from 2026-11-30 through 2026-12-14, fourteen nights, one room, two adults, no children and EUR. The original 2027-10-04 through 2027-10-18 fixture remains byte-unchanged and continues to drive only the historical bounded mode. A run-local overlay clones that fixture and replaces only `checkIn` and `checkOut`, then rebuilds the complete plan through the existing canonical generator.

One recursively immutable authoritative binding owns the promoted fixture, all forty-one logical searches and the sanitized `stayopti.split-r1.selected-alternative-full-pilot-binding@1` receipt. The same fixture and plan object identities are used by preflight, request dispatch, payload generation, economic evaluation and final receipt. The selected dispatcher cannot validate one plan and execute another, cannot regenerate the historical plan after preflight and cannot mix searches from the two windows.

Preflight requires exactly one scenario, forty-one searches, thirteen breakpoints and one full-stay binding. Every search must remain inside the selected window and preserve the canonical destination, occupancy and currency. The full stay must cover the complete selected window; each PREFIX/SUFFIX pair must meet contiguously and reconstruct all fourteen nights. Any historical October 2027 date, mixed context, missing or duplicate breakpoint binding, alternate candidate or non-date overlay fails before environment access.

The selected mode reuses the immutable bounded transport contract: one authentication, one destination lookup, forty-one initial searches, zero continuations and forty-three total requests; retry and redirect are zero, concurrency is one and request starts are at least 1,000 monotonic milliseconds apart. The forty-second initial, forty-fourth request, every continuation and every forbidden route remain blocked before transport. The historical `43/41/0`, canonical canary `3/1/0` and qualification `5/3/0` paths remain unchanged.

### R1C.27C compact sanitized selected-pilot result

R1C.27C preserves the R1C.27B `FAIL` result and the `SANITIZED_RESULT_STDOUT_EXCEEDED_CAPTURE_LIMIT_AFTER_SUCCESSFUL_SINGLE_WAVE` classification. It does not reconstruct, infer or promote the economic aggregates that were absent from the truncated historical output. Prospectively, `--compact-sanitized-result` is mandatory with `--live-selected-alternative-bounded-pilot`; omitting it blocks before credential access and before HTTP. The flag is invalid outside that selected-alternative live mode.

The versioned receipt `stayopti.split-r1.compact-pilot-result@1` retains only scalar aggregate fields and one small allowlisted non-evaluability-count object. Detailed collection, economic-funnel and causal-ledger structures remain available in memory to the unchanged evaluator, but per-search receipts, breakpoint arrays, property or pair arrays, individual pseudonyms, provider identifiers, continuation values, payloads, raw responses and individual prices never enter compact stdout. On success the executable emits exactly one unindented line prefixed `SPLIT_R1C_COMPACT_RESULT=` and no progress or detailed receipt lines.

The compact JSON is deterministically ordered and measured once as UTF-8 before emission. `COMPACT_RECEIPT_MAX_UTF8_BYTES` is hard-frozen at 12,000 bytes and cannot be increased by CLI, environment or runtime configuration. Oversize output is never truncated: the process emits one valid allowlisted compact failure receipt and exits non-zero without another provider request. Authoritative economic amounts remain integer minor units, ratios remain integer basis points, and EUR/percentage displays are deterministic derivations. Collection, selected Candidate 1, the promoted 1/41/13 plan, 43/41/0 budget, zero continuation/retry/Production, baseline selection, distinct-property policy, comparability, deduplication, currency policy, formulae, median semantics and tie-breaking are unchanged.

The binding receipt persists only the selected ordinal and allowlisted rule, selected dates and duration, plan counts and structural booleans proving date-window containment, promoted-plan dispatch, absence of historical-date dispatch and absence of mixed scenarios. It contains no payload, provider identifier, continuation value, hotel name, individual price, unexpected raw currency or reusable fingerprint. This offline binding changes neither economic selection, comparability, deduplication, currency policy, Split arithmetic, completeness/global-optimum claims, Sandbox market-evidence boundaries, Production behavior nor public runtime, and authorizes no provider call by itself.

### R1C.27D — First positive bounded-snapshot Split pilot

This evidence seal records the first positive technical Split pilot without changing any runtime, policy, evaluator, comparison rule or public boundary. Its authoritative receipt is `stayopti.split-r1.compact-pilot-result@1` at source SHA `322eb6f2fef3250c033c1abc48322bdbe73ff2c2`.

The frozen Sandbox scenario is Milano from 2026-11-30 through 2026-12-14: fourteen nights, one room, two adults, no children, EUR, distinct properties and at most one change. The run executed all forty-one logical searches and evaluated all thirteen breakpoints inside bounded returned snapshots. Eleven breakpoints had positive observed saving, none was break-even and two made Split more expensive. The best observed diagnostic result was 16,931 minor units (EUR 169.31) and 2,267 basis points (22.67%); the median was 10,185 minor units (EUR 101.85) and 1,364 basis points (13.64%). The observed range began at -3,416 minor units (EUR -34.16) and ended at 16,931 minor units, with winning breakpoint ordinal 2.

Collection was internally coherent: all forty-one snapshots were usable; 35,693 raw results were all normalizable, economically eligible before deduplication and present as final distinct-property offers; numeric-price and expected-currency coverage were both 35,693/35,693. The run-local universe contained 1,056 pseudonymized properties. The full-stay search supplied 814 raw and normalizable results, 814 final distinct-property offers and an available fixed baseline. HTTP accounting was one authentication, one destination lookup and forty-one initial hotel searches, totaling forty-three requests, with zero continuation, retry or Production calls, maximum concurrency one and a minimum observed request-start interval of 1001.2876 ms.

#### Dimostrato

- Il motore tecnico Split è stato eseguito end-to-end sul piano promosso e delimitato.
- Tutti i 13 breakpoint erano valutabili con baseline full-stay e proprietà distinte.
- 11 breakpoint su 13 hanno prodotto un risparmio positivo nello snapshot osservato.
- Il miglior risparmio osservato è stato EUR 169.31 (22.67%).
- Il risparmio mediano osservato è stato EUR 101.85 (13.64%).
- Il campione Sandbox osservato dimostra l'esistenza empirica di opportunità Split entro gli snapshot delimitati restituiti.

#### Non dimostrato

- La frequenza generale delle opportunità Split nel mercato.
- Il risparmio medio reale degli utenti.
- La completezza dell'inventario RouteStack o del mercato.
- Un optimum globale o la migliore soluzione disponibile sul mercato.
- L'equivalenza qualitativa delle strutture.
- L'equivalenza delle condizioni di cancellazione.
- L'inclusione completa di tasse, supplementi e altri costi obbligatori.
- La convenienza netta dopo il fastidio logistico, il tempo, i bagagli e il rischio del cambio.
- La validità in RouteStack Production.
- Una validazione commerciale o l'autorizzazione a una raccomandazione pubblica.

#### Conclusione consentita

> Nel pilot tecnico RouteStack Sandbox relativo a Milano, 30 novembre–14 dicembre 2026, lo Split con massimo un cambio e proprietà distinte ha prodotto un risparmio positivo in 11 dei 13 breakpoint valutabili. Il miglior risparmio osservato nello snapshot delimitato è stato 169,31 EUR (22,67%) e la mediana 101,85 EUR (13,64%).

The result scope remains `BOUNDED_RETURNED_SNAPSHOT`. Completeness claims, global-optimum claims, Sandbox market-evidence claims, targeted Production authorization and public recommendations remain prohibited. No raw provider or continuation identifier, payload, response, secret or cross-run identity is sealed here.
