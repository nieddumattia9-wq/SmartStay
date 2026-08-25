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
