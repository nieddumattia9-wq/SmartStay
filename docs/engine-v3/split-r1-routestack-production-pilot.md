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
