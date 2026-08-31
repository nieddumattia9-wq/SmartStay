# StayOpti Engine V3-17Q — LiteAPI Golden provider qualification

**Status:** `QUALIFIED_FOR_BOUNDED_SANDBOX_PILOT`

**Source commit:** `f5cba6b5a8c525682ebd9fc525659054da4614be`

**Frozen on:** 2026-08-31

**Execution boundary:** offline qualification only; zero credentials, HTTP, provider calls, real cases, judgments, booking, prebook, payment, deploy, push or fetch.

## 1. Decision and preserved state

LiteAPI is the primary operational provider for the next bounded Golden pilot. This is a collection-source choice, not an Engine dependency:

```text
PRIMARY_OPERATIONAL_PROVIDER=LITEAPI
GOLDEN_DATASET_PROVIDER_QUALIFICATION_TARGET=LITEAPI
ENGINE_PROVIDER_AGNOSTIC_REQUIRED=YES
ROUTESTACK_STATUS=HISTORICAL_EVIDENCE_ONLY_LIVE_HOLD
ROUTESTACK_FUTURE_COLLECTION_ALLOWED=NO
RATEHAWK_STATUS=RESPONSE_PENDING_OPTIONAL_FUTURE_PROVIDER
```

V3-17P remains preserved. The repository still contains zero real Golden cases and zero real judgments; V3-17 is not met and V3-18 is not eligible. Public V2 and runtime behavior are unchanged, Engine V3 remains unpromoted, and Split remains `OFF`.

Qualification means only that the existing read-only rates contract, a provider-neutral normalized boundary, the V3-17O validator and the new pure projection are sufficient to test a five-family sandbox pilot. Sandbox output is `PILOT_CONTRACT_EVIDENCE`; it does not automatically enter the 200 real Golden cases.

## 2. Frozen public documentation

The following public sources and facts were supplied as verified on 2026-08-31. V3-17Q did not access the web or the LiteAPI dashboard:

- [Rates endpoint](https://docs.liteapi.travel/reference/post_hotels-rates)
- [Rate request parameters](https://docs.liteapi.travel/docs/rate-request-parameters-guide)
- [Hotel list and pagination](https://docs.liteapi.travel/reference/get_data-hotels)
- [API pricing and usage costs](https://docs.liteapi.travel/reference/api-pricing-usage-costs)
- [Performance, reliability and rate limiting](https://docs.liteapi.travel/docs/performance-reliability-rate-limiting)
- [Hotel-booking workflow errors](https://docs.liteapi.travel/reference/api-errors-for-hotel-booking-workflow)
- [API overview and sandbox](https://docs.liteapi.travel/reference/overview)

The frozen public-documentation facts are not account-specific guarantees. They describe `POST /v3.0/hotels/rates`, rate/room/meal-plan/cancellation data, hotel-ID/city/coordinate/Place search, `limit` and `offset`, a documented default of 200 hotels and maximum of 5,000, `maxRatesPerHotel`, `includeHotelData`, consistent `sessionId`, HTTP 200/code 2001 no-availability semantics, a documented standard ceiling of 500 RPS per customer, Places at USD 0.01/request, Price Index at USD 0.05/request, and other endpoints as having no additional cost subject to terms, fair use and a reasonable look-to-book ratio. Sandbox is described publicly as production-like.

`ACCOUNT_SPECIFIC_COST_CONFIRMED=NO`. No account plan, balance, quota, endpoint entitlement, fair-use interpretation or contractual charge was inspected.

## 3. Existing integration audit

### 3.1 Client and request

The current client builds its base from the configured LiteAPI base URL (defaulting to `https://api.liteapi.travel/v3.0`) and calls:

| Operation | Method | Current path | Pilot use |
| --- | --- | --- | --- |
| Rates | POST | `/v3.0/hotels/rates` | required, one per family maximum |
| Hotel metadata | GET | `/v3.0/data/hotels` | excluded from minimal pilot |
| Facility dictionary | GET | `/v3.0/data/facilities` | excluded from minimal pilot |
| Prebook | POST | `/v3.0/rates/prebook` | prohibited |

Non-secret header names are `Accept`, `Content-Type` and `X-Api-Key`; the key value was neither read nor printed. Axios follows no application-level retry policy here and accepts every HTTP status for local classification. The effective default HTTP timeout formula is `max(configuredSeconds, 6) * 1000 + 3000`; with the repository default of 12 seconds that is 15,000 ms.

The rates payload currently binds:

- `checkin`, `checkout`, `currency`, `guestNationality`;
- normalized `occupancies` with adults and child ages;
- `limit` (repository default 80);
- provider timeout (repository default 12 seconds);
- `maxRatesPerHotel=3`;
- `roomMapping=true`;
- `includeHotelData=true`;
- one locally created `sessionId` per search;
- either city/country, hotel IDs, or coordinates/radius.

`offset` is supported by the frozen public documentation but is not currently bound by `createLiteApiRatesPayload`; therefore `RATES_OFFSET_SUPPORTED=NO` for repository reality. The pilot is initial-offset-only and records a bounded returned snapshot. Adding pagination requires a later offline contract change and a separately frozen budget.

The public adapter creates one session ID, calls rates, maps offers, limits the mapped result to 80 hotels, deduplicates through the provider-neutral merge service, and then currently tries metadata enrichment in batches of 40 hotel IDs plus facility enrichment. Those extra calls serve the public product path; V3-17Q does not import or change that adapter. The minimal private pilot must consume the rates-derived provider-neutral snapshot and preserve unavailable content as explicit `UNKNOWN`, so its frozen metadata HTTP budget is zero.

### 3.2 Normalization and lifecycle

The existing mapper extracts and normalizes multiple offers per hotel, public price, currency, included/excluded/unknown taxes, total known cost, room name, meal plan, cancellation policies, bookability, hotel category/stars, reviews, coordinates, distance, amenities and a data-confidence classification. It sorts offers by price and the common merge service performs provider-neutral hotel/offer merging and lower-price offer selection without granting provider ordering authority to ranking.

No raw provider response is retained by the adapter success/no-results result (`rawData=null`). Provider IDs and offer references exist inside the operational adapter and prebook boundary, but the Golden projector consumes only the provider-agnostic normalized capsule, rebinds alternatives to `ALT_###`, and emits none of those identities.

No-results currently includes HTTP 204, an empty/unusable mapped collection, and response shapes from which no records can be extracted. The new offline classifier makes code 2001 explicit rather than relying only on emptiness. Prebook/recheck verifies a selected offer and price after search; it is outside the Golden pilot, which records `REQUIRES_RECHECK` where appropriate and performs zero prebook or booking.

There is no live retry in the qualification or future pilot plan. The documented 500 RPS ceiling is not an operational target; the frozen pilot uses concurrency one and at least 1,000 ms between request starts.

## 4. Golden-field coverage

The matrix describes what can reach the provider-neutral normalized boundary. `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` includes hotel content carried by `includeHotelData` or already represented by the normalizer; it does not authorize additional HTTP. If a value is absent, the projection emits an explicit `UNKNOWN` wrapper.

| Golden field | Current LiteAPI source | Availability | Additional call | Quality | Decision |
| --- | --- | --- | ---: | --- | --- |
| Total price | rates mapped offer price/total known cost | `NATIVE_IN_RATES_RESPONSE` | 0 | high | use |
| Currency | rates offer currency | `NATIVE_IN_RATES_RESPONSE` | 0 | high | use; mismatch fails closed |
| Taxes/fees | rates tax summary | `NATIVE_IN_RATES_RESPONSE` | 0 | medium | use or explicit unknown |
| Availability | usable rates/offers | `NATIVE_IN_RATES_RESPONSE` | 0 | medium | use |
| Room evidence | rates room mapping/name | `NATIVE_IN_RATES_RESPONSE` | 0 | medium | use or explicit unknown |
| Cancellation | rates cancellation policies | `NATIVE_IN_RATES_RESPONSE` | 0 | high | use or explicit unknown |
| Meal plan | rates meal plan | `NATIVE_IN_RATES_RESPONSE` | 0 | medium | `NOT_REQUIRED_FOR_PILOT` |
| Rating | included/normalized hotel metadata | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | medium | use or explicit unknown |
| Review count | included/normalized hotel metadata | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | medium | use or explicit unknown |
| Review provenance | normalized review relation | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | low | explicit unknown unless controlled class exists |
| Location | included/normalized coordinates | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | medium | use or explicit unknown |
| Category | included/normalized hotel type/stars | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | medium | use or explicit unknown |
| Amenities/comfort | included/normalized amenities | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | low | explicit unknown when incomplete |
| Bookability | rates mapped offer flag | `NATIVE_IN_RATES_RESPONSE` | 0 | medium | use |
| Recheck status | prebook boundary | `NOT_REQUIRED_FOR_PILOT` | 0 | unknown | requires-recheck; no prebook |
| Reliability | normalized evidence/data confidence | `AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE` | 0 | medium | use |

Counts: 16 fields total; 8 native in rates; 7 from existing normalized content/cache; 0 requiring an additional endpoint; 0 ambiguous; 0 unavailable; 1 not required for the pilot.

This matrix is sufficient for contract and blinding tests, not a promise of complete evidence. A missing review count, tax component, room detail, location or amenity remains missing evidence and lowers confidence. It is never imputed as neutral or favorable.

## 5. Provider-neutral projection

The implemented boundary is:

```text
LiteAPI raw response
        ↓ existing adapter/normalizer (future authorized collector)
StayOpti normalized decision-source capsule
        ↓ pure goldenNormalizedSearchProjectionV3
Golden Case candidate with local IDs
        ↓ V3-17O validateGoldenCaseV3
GOLDEN_VALID | QUARANTINED_INCOMPLETE | REJECTED_CONTRACT
```

The projector imports no LiteAPI client, raw schema, environment loader or transport. It performs no I/O, does not mutate its input, maps transient normalized alternative identities to deterministic local `ALT_###` identifiers, produces a local search-family ID, accepts at most four pre-frozen profiles, preserves explicit missing evidence and runs the unchanged V3-17O validator. It persists zero raw hotel, offer, rate, prebook, booking or continuation IDs, payloads, commissions or markup. Split is structurally excluded.

The frozen profile order is `balanced`, `maximum-comfort`, `savings`, `maximum-savings`. Plans with a fifth case, duplicate/non-frozen profile, Split role, invalid currency/price, duplicate normalized alternative, or dangling decision reference fail closed.

The projector records its collection class as `BOUNDED_PROVIDER_RETURNED_SNAPSHOT`. For compatibility with the unchanged V3-17O provenance contract, only an independently observed `providerExhaustedWithinCap=true` candidate maps to `PROVIDER_EXHAUSTED_WITHIN_CAP` and may validate as a real-source Golden case. A bounded non-exhausted candidate maps to `DEPTH_CAPPED_DIAGNOSTIC_ONLY`, is rejected by the current real-source admission rule, and cannot masquerade as exhausted evidence. Provider exhaustion is not required to run the sandbox pilot, because sandbox cases are contract evidence and do not automatically count as real Golden.

## 6. Pagination and collection semantics

The pilot records exactly what the provider returned under the frozen rates limit. It distinguishes:

- bounded initial rates result;
- provider-declared no availability;
- limit reached or non-exhausted boundary;
- timeout or partial supplier failure;
- malformed success;
- empty usable normalized output.

`BOUNDED_PROVIDER_RETURNED_SNAPSHOT=YES` and `COLLECTION_BOUNDARY_MUST_BE_RECORDED=YES`. Provider exhaustion is not required for this sandbox contract pilot. No result authorizes a complete-market, global-optimum or market-frequency claim. The pilot does not paginate the hotel list, does not bind rates `offset`, and does not select replacement families after observing outcomes.

## 7. Frozen error contract

Classification uses provider code before an HTTP-only fallback:

| Observed boundary | Classification | Action |
| --- | --- | --- |
| HTTP 200 + code 2001 | `NO_AVAILABILITY` | record; advance to next pre-frozen family |
| HTTP 400 + code 4000 | `REQUEST_INVALID` | stop contract collection |
| HTTP 400 + code 4002 | `REQUIRED_FIELD_INVALID` | stop contract collection |
| HTTP 401 | `AUTHENTICATION_FAILURE` | global stop |
| code 40302 | `ACCOUNT_SUSPENDED` | global stop |
| code 4290 | `RATE_LIMITED` | stop; no retry |
| code 4291 | `RATE_LIMIT_SYSTEM_FAILURE` | stop; no retry |
| code 4011 | `SUPPLIER_COMMUNICATION_FAILURE` | stop; no retry |
| local timeout | `LOCAL_TIMEOUT` | stop; no retry |
| 2xx malformed shape | `MALFORMED_SUCCESS` | stop contract collection |
| normalized currency mismatch | `CURRENCY_MISMATCH` | fail closed |
| zero usable normalized alternatives | `EMPTY_USABLE_NORMALIZED_RESULT` | record; no opportunistic replacement |

No live retry, continuation, second wave or substitute scenario is part of V3-17Q or implicitly authorized for V3-17R.

## 8. Frozen sandbox pilot

Dates and destinations remain deliberately unfrozen until the separately authorized pilot gate, but the structure is fixed:

- environment: `LITEAPI_SANDBOX`;
- five pre-registered search families;
- no more than four pre-frozen profiles and 20 projected cases;
- direct city/country search unless a later offline gate proves it unusable;
- one initial rates request per family, offset zero by omission;
- `limit=80`, `maxRatesPerHotel=3`, `includeHotelData=true`, `roomMapping=true`;
- EUR, frozen occupancy and guest nationality;
- one local session ID per family;
- no Places, Price Index, Public Price beta, metadata endpoint, prebook or booking;
- one wave, concurrency one, minimum interval 1,000 ms, retry zero, redirect zero;
- stop on the first global error.

```text
PILOT_SEARCH_FAMILIES=5
PILOT_GOLDEN_CASES_MAX=20
PILOT_RATES_HTTP_MAX=5
PILOT_METADATA_HTTP_MAX=0
PILOT_PLACES_HTTP_MAX=0
PILOT_PRICE_INDEX_HTTP_MAX=0
PILOT_PUBLIC_PRICE_HTTP_MAX=0
PILOT_PREBOOK_HTTP_MAX=0
PILOT_BOOKING_HTTP_MAX=0
PILOT_TOTAL_HTTP_MAX=5
PILOT_RETRY_MAX=0
PILOT_REDIRECT_MAX=0
PILOT_MAX_CONCURRENCY=1
PILOT_MIN_REQUEST_INTERVAL_MS=1000
PILOT_SINGLE_WAVE_ONLY=YES
```

Five is a safety ceiling, not a required call count. A terminal error or no-availability outcome may consume fewer requests. No sixth family or second wave is allowed.

## 9. Cost model

### Public-documentation cost

The frozen public documentation states Places at USD 0.01/request and Price Index at USD 0.05/request. It describes core/other endpoints as having no additional charge subject to terms, fair use and a reasonable look-to-book ratio. The minimal pilot uses neither paid endpoint and therefore has:

`PUBLIC_DOCUMENTATION_ESTIMATED_PILOT_CHARGE=0`

This is a calculation under the supplied public-documentation model, not a statement about the account.

### Account-specific confirmed cost

No dashboard or account terms were accessed:

```text
ACCOUNT_SPECIFIC_COST_CONFIRMED=NO
MAX_THEORETICAL_ACCOUNT_SPECIFIC_PILOT_COST=NOT_CONFIRMED
```

### Authorization gate

V3-17Q authorizes no call. Before V3-17R, the user must explicitly authorize one LiteAPI Sandbox wave with the exact five-request ceiling and acknowledge that account-specific charging remains unconfirmed. The gate must recheck credentials without printing them, sandbox host, five frozen families, zero paid/mutative endpoints, one-wave enforcement, receipt readiness and worktree integrity.

## 10. Qualification and stop conditions

`LITEAPI_QUALIFICATION=QUALIFIED_FOR_BOUNDED_SANDBOX_PILOT` because the existing rates contract supplies the core economic and offer evidence, optional content can remain explicit unknown, the pure projection reaches the V3-17O validator, the five-call plan avoids documented paid endpoints, and the sandbox evidence is not misrepresented as real Golden.

The future pilot must stop before or during collection if the sandbox contract is unavailable, the normalized snapshot cannot preserve material decision evidence, currency or minor units are incoherent, provider-code classification is ambiguous, privacy/identity controls fail, account cost is not accepted, or an attempted sixth family/second wave/retry/paid/mutative call is detected.

## 11. Non-objectives and claims

V3-17Q does not use or qualify production, collect cases or judgments, score V2 against V3, change ranking, create a public route, authorize booking, re-enable RouteStack, implement RateHawk, or promote V3. It grants no complete-inventory, global-optimum, market-frequency, commercial-validation or production-validity claim.

The only next recommendation is `V3-17R_LITEAPI_SANDBOX_TWENTY_CASE_PILOT_AUTHORIZATION_GATE`. No provider call is authorized until that new explicit gate passes.
