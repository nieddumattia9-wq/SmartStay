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

Credentials may enter a live process only from the existing `server/.env` through Node's native `--env-file` mechanism. The collector does not parse, copy or write the file. Dry-run exits before credential resolution. No automatic fallback, alternate host or endpoint exists.

Destination selection is provider-neutral and deterministic. Candidates must contain a non-empty ID and finite coordinates. The unique nearest candidate to the frozen scenario coordinates may be selected only within 25 km. Provider destination IDs and coordinates are held in memory only.

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
