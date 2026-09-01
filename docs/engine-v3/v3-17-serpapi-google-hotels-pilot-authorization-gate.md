# V3-17T1 — SerpApi Google Hotels pilot authorization gate

Status: `READY_FOR_EXPLICIT_AUTHORIZATION`

Source checkpoint: `640570740317cd36901fb605d73e6b7aeeadaff5`

Materialized at: `2026-09-01T14:51:15+02:00`

## Outcome

This phase prepares but does not execute the SerpApi Google Hotels pilot.
The user reports that the SerpApi account exists, is on the Free plan, is
owned by the user, has API access enabled, and requested neither a VAT number
nor a payment card during signup. Those facts establish account readiness;
they do not authorize an API call.

The gate ends at `READY_FOR_EXPLICIT_AUTHORIZATION`. Credentials were not
loaded, the process environment was not inspected for a key, and SerpApi,
Google Hotels and every other provider received zero requests.

The only permitted future architecture remains:

```text
SerpApi Google Hotels
  -> evaluation-only bounded collector
  -> SerpApi external adapter
  -> ExternalHotelChoiceSessionV3
  -> provider-neutral replay
  -> blind evaluation
```

The collector is not exported by the V3 core, is absent from the provider
registry and public runtime, and does not convert through LiteAPI.

## Frozen manifest

- pilot ID: `V3_17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_PILOT_001`;
- manifest version: `stayopti.v3.serpapi-google-hotels-pilot-manifest@1`;
- manifest SHA-256: `e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88`;
- sessions: 12 independent search sessions;
- main searches: at most 12;
- property-detail enrichments: at most three per session;
- absolute request ceiling: 48;
- concurrency: one;
- automatic retry: zero;
- automatic pagination: prohibited;
- reviews/photos requests: prohibited;
- `no_cache=true`: frozen for every main request;
- currency/market/language baseline: `EUR`, `gl=it`, `hl=it`.

The canonical manifest is the immutable
`STAYOPTI_SERPAPI_PILOT_MANIFEST_V3` value. Its hash is computed from stable,
recursively key-sorted serialization. Budget, occupancy, constraints and
dates are part of the hash. Any change creates a new manifest and requires a
new authorization. If any check-in is no longer future at execution time,
the collector rejects the manifest before credentials or transport; it does
not regenerate dates.

| # | Destination | Occupancy | Check-in | Check-out | Nights | Lead days | Budget EUR | Profile | Diagnostic purpose |
|---:|---|---|---|---|---:|---:|---:|---|---|
| 1 | Florence | couple | 2026-10-15 | 2026-10-17 | 2 | 44 | 700 | balanced | Italian medium-market balanced set |
| 2 | Rome | solo | 2026-10-29 | 2026-10-30 | 1 | 58 | 220 | maximum-savings | one-night budget boundary |
| 3 | Milan | solo/business | 2027-07-10 | 2027-07-12 | 2 | 312 | 520 | comfort | cancellation-sensitive business stay |
| 4 | Paris | couple | 2026-11-12 | 2026-11-15 | 3 | 72 | 1,050 | maximum-comfort | expensive-market quality evidence |
| 5 | London | couple | 2027-06-05 | 2027-06-09 | 4 | 277 | 1,200 | savings | non-euro expensive-market value |
| 6 | Barcelona | family, children 8/12 | 2027-01-16 | 2027-01-20 | 4 | 137 | 1,100 | comfort | family room and comfort evidence |
| 7 | Lisbon | couple | 2027-07-17 | 2027-07-24 | 7 | 319 | 1,400 | savings | nightly-versus-total semantics |
| 8 | Amsterdam | couple | 2026-11-26 | 2026-11-28 | 2 | 86 | 650 | balanced | location and coordinate missingness |
| 9 | Prague | three adults | 2027-02-13 | 2027-02-16 | 3 | 165 | 600 | savings | group occupancy and lower-price market |
| 10 | Vienna | family, child 5 | 2027-08-07 | 2027-08-12 | 5 | 340 | 1,300 | maximum-comfort | family comfort and amenities |
| 11 | Berlin | solo | 2027-03-06 | 2027-03-12 | 6 | 186 | 900 | maximum-savings | long stay and large visible set |
| 12 | Copenhagen | couple | 2026-12-12 | 2026-12-13 | 1 | 102 | 400 | comfort | expensive non-euro one-night quality |

Budgets are user-context inputs frozen before collection. They are never
derived from returned prices.

## Exact authorization contract

The only literal accepted by the future runner is:

```text
AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_MAX48
```

The present phase does not supply or consume that authorization. A subsequent
user message must contain the exact literal and must also authorize the
retention policy below. Generic wording such as “continue” or “execute” is
insufficient. The execution must additionally bind the exact post-T1 Git HEAD
supplied in that future phase, verify this source checkpoint as an ancestor,
verify the manifest hash, observe a Free account plan, find an unexpired
manifest and receive the key only through the process environment.

State transitions are fail-closed:

```text
DRAFT
  -> READY_FOR_EXPLICIT_AUTHORIZATION   (maximum state in T1)
  -> AUTHORIZED_NOT_STARTED             (future exact user authorization)
  -> RUNNING
  -> COMPLETED | ABORTED
```

`INVALIDATED` is terminal for a mismatched or expired manifest. A failed
request consumes its reserved ledger slot and is never retried automatically.

## Request governor

Every request is reserved atomically in a run-local ledger before transport.
The ledger rejects request 49 and concurrent reservation number two. Only the
official `https://serpapi.com/search.json` endpoint with
`engine=google_hotels` is allowlisted. Main searches are sequential.

The following remain forbidden:

- automatic pagination and any compensating query;
- `google_hotels_reviews` and `google_hotels_photos`;
- generic Google Search or another SerpApi engine;
- click-out, redirect, booking, prebook or payment;
- LiteAPI, RouteStack or any fallback provider;
- a request outside the manifest;
- an automatic retry after any HTTP, transport or parsing failure.

The enrichment selector accepts only canonical semantic signals. Opaque local
references and property tokens are carried for lookup after selection and do
not enter its comparator. Exact semantic duplicates remain one equivalence
class instead of being separated by identity. The initial executable runner
is more conservative: it performs the twelve main searches and zero detail
requests unless a later authorized implementation binds a tested semantic
detail-selection feed. The 48-call value remains an absolute ceiling, never a
target.

## Credential handling and redaction

The future runner accepts the key only as `SERPAPI_API_KEY` in the child
process environment. It does not read `.env`, search the filesystem, accept a
key command-line parameter or persist the environment. The PowerShell 5.1
wrapper:

1. prompts with `Read-Host -AsSecureString`;
2. converts the value only in memory;
3. sets only the process environment immediately before starting Node;
4. keeps the key out of arguments and output;
5. restores/removes the process value in `finally`;
6. releases unmanaged memory with `ZeroFreeBSTR`.

Because SerpApi requires `api_key` in the request URL, the collector constructs
that URL internally. Every diagnostic representation passes through mandatory
redaction and exposes only `api_key=[REDACTED]`. Transport errors are reduced
to allowlisted local classifications before receipt emission; raw exception
messages and URLs are not emitted.

## Proposed retention policy

This policy is proposed and implemented but is not yet authorized:

```text
RAW_PAYLOAD_RETENTION=EPHEMERAL_UNTIL_VALIDATED
RAW_PAYLOAD_STORAGE=UNIQUE_TEMP_DIRECTORY_OUTSIDE_REPOSITORY
RAW_HTML_RETENTION=NONE
IMAGE_RETENTION=NONE
URL_TOKEN_RETENTION=NONE
NORMALIZED_SANITIZED_SNAPSHOT_RETENTION=UNTIL_V3_17_CLOSURE
REDISTRIBUTION=PROHIBITED
PUBLICATION=PROHIBITED
MODEL_TRAINING=PROHIBITED
USE_SCOPE=INTERNAL_NON_REDISTRIBUTED_EVALUATION
RETENTION_AUTHORIZATION_GRANTED=NO
```

Raw JSON is written with exclusive-create semantics only under a unique
`%TEMP%` directory, then deleted immediately after normalization. A `finally`
path removes all residual files and the directory on success and abort. Raw
HTML, images, URLs, tokens and keys are never retained. Only provider-neutral
snapshots, field provenance, missingness, bias flags, hashes and a sanitized
receipt may survive after the future retention authorization.

The future receipt records request/completion times, the requested no-cache
flag, processing status, unknown cache state, source-freshness classification
and sanitized search parameters. It contains no destination/property/seller
token, raw response or key.

## Product and evidence boundary

Any future record remains `REAL_PUBLIC_MARKET_SNAPSHOT_CANDIDATE`. Twelve
sessions do not satisfy the 200 Golden-case, 100 replay, 300 human-judgment or
100 expert-judgment gates. No record is automatically admitted to Golden, no
weight or policy changes automatically, and no booking, click, satisfaction,
objective-best or complete-market claim follows.

Current counters remain:

```text
REAL_SESSIONS_COLLECTED=0
REAL_GOLDEN_CANDIDATES_COLLECTED=0
GOLDEN_CASES_ADMITTED=0
V3_17_GATE_MET=NO
V3_18_ENTRY_ALLOWED=NO
```

## Validation scope

Synthetic stub tests cover manifest binding, exact authorization, source and
expiry checks, zero-call failures, request-cap and concurrency enforcement,
forbidden endpoints, no retry/pagination, redaction, raw cleanup after success
and abort, deterministic detail selection, opaque-ID neutrality, unchanged
budget, evaluation-only imports and the Golden/V3-18 boundary. No test opens a
network socket.

Next recommendation:
`V3-17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_BOUNDED_PILOT_EXECUTION`.
It is not authorized until the exact literal above and retention consent are
provided in a later user message.
