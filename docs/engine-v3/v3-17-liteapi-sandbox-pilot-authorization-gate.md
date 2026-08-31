# StayOpti Engine V3-17R — LiteAPI Sandbox bounded pilot authorization gate

**Status:** `SAFE_HOLD_PRE_NETWORK`

**Source checkpoint:** `69715d22fc16b75460a4517cf80dc56eb1f2e4f2`

**Frozen on:** 2026-08-31

**Execution boundary:** offline gate implementation only; credentials were not loaded and HTTP/provider calls were zero.

## 1. Decision

The user authorized one LiteAPI Sandbox wave capped at five Rates requests only if both the sandbox identity and zero account-specific cost could be proven deterministically before the first request. Repository evidence does not satisfy those two conditions.

The configured base URL is account-configurable and the repository contains no account-specific sandbox entitlement, billing plan, zero-cost attestation or dashboard export. Public documentation, the V3-17Q cost estimate and a default URL do not prove the terms or identity of Mattia's account. Consequently:

```text
V3_17R_STATUS=SAFE_HOLD_PRE_NETWORK
SANDBOX_IDENTITY_VERIFIED=NO
SANDBOX_BASE_URL_VERIFIED=NO
ACCOUNT_SPECIFIC_ZERO_COST_VERIFIED=NO
CREDENTIALS_LOADED=NO
PROVIDER_CALLS=0
HTTP_REQUESTS=0
```

This is the intended fail-closed result, not a technical failure. The user's conditional authorization was acknowledged but was not consumed because no HTTP request was transmitted.

## 2. Preserved state

- V3-17Q remains `PASS` and LiteAPI remains qualified only for a bounded sandbox pilot after its external prerequisites are proven.
- Public V2 and public runtime behavior are unchanged; Engine V3 remains unpromoted.
- Split remains `OFF`.
- RouteStack remains historical evidence only and on live hold.
- RateHawk remains an optional candidate with response pending.
- Real Golden cases remain zero, real judgments remain zero, V3-17 is not met and V3-18 is not eligible.
- Sandbox output, if a later authorized run becomes possible, is always `SANDBOX_DIAGNOSTIC_NOT_REAL_GOLDEN`.

## 3. Repository and integration audit

The V3-17Q checkpoint and its parent were verified before mutation. The existing LiteAPI integration was inspected without importing its configuration module or reading `.env` values:

- the client derives its base URL from configuration and otherwise defaults to `https://api.liteapi.travel/v3.0`;
- Rates uses `POST /hotels/rates` below that configured base;
- the public adapter also knows metadata, facility, prebook and booking-handoff operations, which are outside this pilot;
- the existing Rates payload binds EUR, nationality, occupancies, limit 80, `maxRatesPerHotel=3`, `roomMapping=true`, `includeHotelData=true` and a session identifier;
- the existing provider mapper and offer mapper normalize prices, taxes, rooms, meal plans, cancellation, reviews, coordinates, amenities, bookability and reliability-related fields;
- the V3-17Q projector consumes only a provider-neutral normalized capsule and has no raw LiteAPI client or response dependency.

The canonical `server/.env` integrity gate was executed independently of the current directory. It verified the intended absolute file and its integrity without parsing variable names or values.

## 4. Structured pre-network gate

All fields must be `YES` before credentials may be read or transport may be authorized.

| Gate | Observed | Basis |
| --- | --- | --- |
| `SANDBOX_IDENTITY_VERIFIED` | `NO` | No account-specific sandbox entitlement or identity attestation is stored locally. |
| `SANDBOX_BASE_URL_VERIFIED` | `NO` | A configurable/default URL is not proof that the selected account and endpoint are sandbox. |
| `PRODUCTION_ENDPOINT_EXCLUDED` | `YES` | Governor accepts only the single exact base candidate and has no fallback. |
| `RATES_ONLY_ENFORCED` | `YES` | Exact method/path allowlist is `POST /hotels/rates`. |
| `ACCOUNT_SPECIFIC_ZERO_COST_VERIFIED` | `NO` | No account plan, billing export or provider confirmation proves zero cost. |
| `PAID_ENDPOINTS_EXCLUDED` | `YES` | Places, Price Index, Public Price, prebook and booking cannot pass the allowlist. |
| `HTTP_HARD_CAP_ENFORCED` | `YES` | The counter rejects a potential sixth request before transport. |
| `RETRY_DISABLED` | `YES` | Only retry ordinal zero is accepted. |
| `REDIRECT_DISABLED` | `YES` | Any non-zero redirect count is rejected. |
| `CONCURRENCY_ONE_ENFORCED` | `YES` | A second request cannot start while one is in flight. |
| `MIN_INTERVAL_ENFORCED` | `YES` | Starts less than 1,000 ms apart are rejected. |
| `SINGLE_WAVE_ENFORCED` | `YES` | Only wave ordinal one may start once. |

Missing deterministic evidence, in canonical order:

1. `ACCOUNT_SPECIFIC_ZERO_COST_ATTESTATION_MISSING`;
2. `SANDBOX_BASE_URL_ACCOUNT_BINDING_MISSING`;
3. `SANDBOX_IDENTITY_ATTESTATION_MISSING`.

## 5. Offline governor

`liteApiSandboxGoldenPilotGateV3.ts` is a private Engine V3 evaluation module. It imports neither the LiteAPI client/adapter nor environment configuration and performs no I/O.

Before transport it enforces:

- the complete pre-network decision is ready;
- credentials were loaded only after that decision, represented solely as a boolean and never as a value;
- plan SHA-256 matches;
- method, base candidate and Rates path match the exact allowlist;
- family belongs to the frozen plan and has not already been attempted;
- HTTP total remains below five;
- retry and redirect are zero;
- no request is already in flight;
- monotonic start spacing is at least 1,000 ms;
- wave ordinal is exactly one.

After a response it requires request binding and session consistency. `NO_RESULTS` is diagnostic and permits the next pre-frozen family without retry. HTTP/provider error, rate limit, timeout, malformed response or session mismatch aborts the wave and blocks every later dispatch.

The governor is deliberately not bound to live transport in V3-17R because the observed gate is not ready. It is testable through injected/synthetic dispatch intents without loading credentials or contacting LiteAPI.

## 6. Frozen five-family plan

Plan version: `stayopti.v3.liteapi-sandbox-golden-pilot-gate@1`

Canonical plan SHA-256:

`34e450c9cfafad2fec76898dc74c4b935dbe7f6ac3485f45e9068078ae557c9a`

The hash covers the ordered canonical plan, not provider responses. The plan was frozen before network and remains unchanged by the safe hold.

| Family | Destination | Dates | Occupancy/rooms | Diagnostic purpose |
| --- | --- | --- | --- | --- |
| `SEARCH_FAMILY_V3_17R_001` | Rome, IT | 2027-02-10 → 2027-02-12 | 1 adult / 1 room | short solo stay and dense urban inventory |
| `SEARCH_FAMILY_V3_17R_002` | Vienna, AT | 2027-03-08 → 2027-03-13 | 2 adults / 1 room | medium couple stay and cross-border EUR normalization |
| `SEARCH_FAMILY_V3_17R_003` | Lisbon, PT | 2027-04-19 → 2027-04-26 | 2 adults / 1 room | longer stay and accumulated tax/cancellation evidence |
| `SEARCH_FAMILY_V3_17R_004` | Prague, CZ | 2027-05-17 → 2027-05-21 | 2 adults + child age 8 / 1 room | child-age occupancy handling |
| `SEARCH_FAMILY_V3_17R_005` | Barcelona, ES | 2027-06-14 → 2027-06-17 | 4 adults / 2 rooms | multi-room normalized evidence |

Every family freezes currency EUR, guest nationality IT, limit 80, `maxRatesPerHotel=3`, `includeHotelData=true` and `roomMapping=true`. It does not claim market representativeness. No family may be replaced because of no-results or an unfavorable response.

## 7. HTTP and endpoint budget

```text
SEARCH_FAMILIES_MAX=5
RATES_HTTP_MAX=5
TOTAL_HTTP_MAX=5
PREBOOK_HTTP_MAX=0
BOOKING_HTTP_MAX=0
PLACES_HTTP_MAX=0
PRICE_INDEX_HTTP_MAX=0
PUBLIC_PRICE_HTTP_MAX=0
PAID_ENDPOINT_HTTP_MAX=0
RETRY_MAX=0
REDIRECT_MAX=0
MAX_CONCURRENCY=1
MIN_REQUEST_INTERVAL_MS=1000
WAVES_MAX=1
PROJECTED_SANDBOX_CASES_MAX=20
```

Five is a ceiling, never a required call count. The observed run count is zero because the gate stopped before credentials.

## 8. Projection and diagnostic boundary

The existing V3-17Q provider-neutral projector remains unchanged. A future eligible response would follow:

```text
temporary redacted raw response outside repository
  → existing LiteAPI adapter/normalizer
  → provider-neutral normalized snapshot
  → V3-17Q Golden projector
  → V3-17O validator
  → SANDBOX_DIAGNOSTIC_NOT_REAL_GOLDEN wrapper
```

The bounded selector sorts by local Golden case ID and fingerprint, retains no more than 20, never mutates input and marks every selected item `countsTowardRealGolden=false`. A recursive output guard rejects raw response/payload fields, provider identifiers, booking/prebook/continuation identifiers, API keys and authorization material.

No live field completeness can be reported. The V3-17Q static matrix remains 16 fields (8 native Rates, 7 existing normalized content/cache, 1 not required for the pilot), but no real sandbox response was observed in this phase.

## 9. Evidence boundary and privacy

Evidence for this safe hold contains only repository hashes/state, the plan hash, structured gate values, zero HTTP counters, test results and sanitized scope/integrity checks. It contains no `.env` names or values, request headers, raw request/response, provider identifiers, sessions, credentials or PII.

No raw provider payload is committed. No provider-neutral snapshot was created because no response existed. No case was collected or projected.

## 10. Removal criteria and next step

The safe hold may be reconsidered only after obtaining both:

1. deterministic evidence binding the intended account/key and base URL to LiteAPI Sandbox; and
2. account-specific evidence that the exact five Rates requests incur zero charge and trigger no paid accessory service.

Acceptable evidence could be a sanitized dashboard/account export or a written provider confirmation whose scope covers the exact endpoint, environment and account. It must be reviewed offline without exposing credentials. Public documentation alone remains insufficient.

After those artifacts exist, a new phase must re-run this gate and obtain fresh explicit user authorization if the evidence, endpoint, budget or account terms differ. This document does not authorize a future wave.

`NEXT_STEP_RECOMMENDATION=V3-17R.1_LITEAPI_SANDBOX_IDENTITY_AND_ACCOUNT_ZERO_COST_EVIDENCE_GATE`

## 11. Non-objectives and claims

V3-17R did not contact LiteAPI, RouteStack or RateHawk; did not access a dashboard; did not load credentials; did not perform Rates, Places, Price Index, Public Price, prebook, booking or redirect; did not change ranking or public runtime; and did not collect cases or judgments.

It grants no real-Golden, market-frequency, global-optimum, production, commercial or V3-superiority claim. V3-18 remains blocked.
