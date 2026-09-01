# V3-17T — SerpApi Google Hotels real-market source qualification

Status: `CONDITIONAL_SOURCE_QUALIFIED_FOR_USER_ACCESS`

Evidence cutoff: `2026-09-01T14:12:05+02:00`

Source checkpoint: `bcce90c8663cce92c8242ad5451a5619158f6331`

## Decision

SerpApi Google Hotels is qualified conditionally as an evaluation source:

- source ID: `SERPAPI_GOOGLE_HOTELS`;
- source role: `REAL_PUBLIC_MARKET_CHOICE_SET_SOURCE`;
- record class: `REAL_PUBLIC_MARKET_SNAPSHOT_CANDIDATE`;
- runtime-provider role: none;
- booking role: none;
- automatic Golden eligibility: no;
- automatic V3 policy or weight change: no.

The source exposes current public-market choice sets through an official,
documented API and offers a free plan. It requires an account and acceptance
of the current terms. Public materials do not state a VAT-number requirement,
individual-account eligibility, or whether a payment card is required. Their
absence from the pages reviewed is not proof that they are unnecessary.

Internal evaluation and sanitized snapshot retention remain conditional. The
public terms place responsibility for third-party rights and downstream use on
the user and do not grant an unambiguous right to redistribute Google-derived
results. Raw results, source URLs and provider identifiers are therefore not
admitted to persistent replay. Distribution is prohibited absent express
written permission. A future live pilot requires personal account creation,
personal acceptance of then-current terms, a separate authorization, a frozen
request budget and an explicit retention decision.

This is a qualification of user access, not permission to call the API.

## Architectural boundary

The only accepted path is:

```text
SERPAPI GOOGLE HOTELS RESPONSE
  -> EVALUATION-SOURCE ADAPTER
  -> EXTERNAL HOTEL CHOICE CONTRACT
  -> PROVIDER-NEUTRAL REPLAY (only after legal admission)
  -> ENGINE V3
  -> BLIND EVALUATION
```

These paths are forbidden:

```text
SERPAPI RESPONSE -> ENGINE V3 DIRECT
SERPAPI RESPONSE -> LITEAPI CONVERSION -> ENGINE V3
```

The adapter is private to `src/engine-v3/evaluation/`. It performs no fetch,
does not read configuration or credentials, does not enter the provider
registry and is not imported by the public runtime or V3 core. Provider,
property and seller identity are input provenance only. The adapter emits
local anonymous alternative references and counts of opaque provenance; it
does not persist source tokens, seller names, raw URLs or payloads.

## Official evidence register

All sources below were consulted without login. No account was created, no
terms were accepted and no Google Hotels query was executed.

| Evidence | Official URL | Observed at | Nature of proof |
|---|---|---|---|
| Google Hotels API reference | <https://serpapi.com/google-hotels-api> | 2026-09-01 14:12 CEST | Official request/response schema, cache controls, pagination and property-detail mechanism |
| SerpApi pricing | <https://serpapi.com/pricing> | 2026-09-01 14:12 CEST | Official free-plan quota, throughput and search-credit rules |
| SerpApi terms/privacy | <https://serpapi.com/legal> | 2026-09-01 14:12 CEST | Official account/use/cancellation, third-party-rights and redistribution constraints; page marked updated 2026-04-08 |
| Google hotel ranking and prices | <https://support.google.com/travel/answer/6276008?hl=en-EN> | 2026-09-01 14:12 CEST | Official organic/ad separation, ranking inputs, personalization and partner-price caveats |
| Google taxes and fees policy | <https://support.google.com/hotelprices/answer/6064432?hl=en> | 2026-09-01 14:12 CEST | Official partner requirements and regional presentation caveats for mandatory taxes/fees |

No third-party blog is used as dispositive evidence. Documentation examples
are schema evidence, not evidence that every field is present in every result.

## Access, pricing and terms matrix

| Question | Determination | Evidence and limitation |
|---|---|---|
| Account required | `YES` | Requests require an API key; account creation was not performed. |
| Free plan | `YES` | Official pricing lists 250 searches/month at USD 0. |
| Searches/month | `250` | Free-plan listing at evidence cutoff. |
| Hourly throughput | `50` | Free-plan listing at evidence cutoff. This is throughput, not permission to call. |
| Payment card | `UNKNOWN` | Not stated on the reviewed public pricing/terms pages. |
| VAT number / partita IVA | `NOT_STATED` | Not stated; this is not `PIVA_NOT_REQUIRED`. |
| Individual-account eligibility | `NOT_STATED` | Terms apply to users and require majority age, but no explicit public statement was found for individual free-plan eligibility. |
| Terms acceptance | `YES` | Use of the service constitutes agreement to the terms. The user must act personally. |
| Query accounting | `DOCUMENTED` | Successful searches, including empty result sets, count; cached, errored and failed searches are stated not to consume search credits. |
| Cache | `DOCUMENTED_PARTIAL` | Exact parameter matches may be served from cache; the documented cache expires after one hour. `no_cache=true` requests fresh retrieval. |
| Cache status per result | `UNKNOWN` | The reviewed response schema does not provide a sufficient, stable field proving that a specific result was cached. |
| `no_cache` | `AVAILABLE_NOT_AUTHORIZED` | Whether to pay the freshness cost is deferred to the pilot authorization gate. |
| Search retention | `UNKNOWN` | The one-hour cache duration is not a general retention period. Exact search-result retention was not stated. ZeroTrace is an Enterprise feature. |
| Plan cancellation | `AVAILABLE` | Pricing states cancel/upgrade/downgrade anytime. Account/data deletion may require contacting support. |
| Internal evaluation | `CONDITIONAL` | Technically supported; legal use remains subject to current terms and Google/third-party rights. |
| Persistent sanitized storage | `CONDITIONAL` | No raw persistence. Admission requires an explicit later rights/retention decision. |
| Redistribution | `PROHIBITED` | No redistribution of Service/content absent express written permission under current public terms. |
| Public product integration | `NOT_AUTHORIZED` | Not part of this gate and not established by public terms review. |

Pricing values are observations at the evidence cutoff, not a permanent cost
promise. The future authorization gate must re-check the official page and
freeze a hard technical ceiling before any request.

## Field-availability matrix

`AVAILABLE_EXACT` means the official schema has a direct field, not that every
response contains it or that the value is objectively complete. `PARTIAL`
means the schema or semantics do not justify a stronger claim.

| Field | Classification | Mapping rule |
|---|---|---|
| Destination/query | `AVAILABLE_EXACT` | Hashed to a local destination token; raw query is not emitted. |
| Check-in/check-out | `AVAILABLE_EXACT` | Preserved as dates. |
| Adults | `AVAILABLE_EXACT` | Preserved when supplied; documented default is not silently treated as user intent. |
| Children and ages | `AVAILABLE_EXACT` | Supported by query schema; absence remains unknown where not explicit. |
| Rooms | `AVAILABLE_PARTIAL` | Accepted if present; schema examples do not establish universal response confirmation. |
| Currency | `AVAILABLE_EXACT` | Preserved only when an explicit ISO-like code is supplied. |
| Country/language | `AVAILABLE_EXACT` | Request-market metadata only; never a quality feature. |
| Choice set | `AVAILABLE_PARTIAL` | Current visible page only; market completeness is forbidden. |
| Displayed rank | `AVAILABLE_DERIVED` | Array position is recorded solely as exposure/bias evidence. |
| Hotel/vacation-rental type | `AVAILABLE_EXACT` | Source classification only. |
| Name | `AVAILABLE_EXACT` | Used only to derive a local fallback reference, never emitted or scored. |
| Coordinates | `AVAILABLE_PARTIAL` | Diagnostic location sidecar; missing remains unknown. |
| Hotel class/stars | `AVAILABLE_PARTIAL` | Parsed only when explicit; no provider-specific default. |
| Rating | `AVAILABLE_PARTIAL` | Preserved as observed; source aggregation and scale are caveats. |
| Review count | `AVAILABLE_PARTIAL` | Preserved when numeric; absence remains unknown. |
| Nightly price | `AVAILABLE_PARTIAL` | Kept separately as observed aggregate. |
| Total-stay price | `AVAILABLE_PARTIAL` | Kept separately; never assumed tax-complete or bookable. |
| Taxes and fees | `AVAILABLE_PARTIAL` | Before-tax evidence may exist; completeness remains unknown without proof. |
| Seller/source | `AVAILABLE_PARTIAL` | Only coverage and field provenance are emitted; identity stays opaque. |
| Multiple offers per hotel | `AVAILABLE_PARTIAL` | `prices` can contain multiple sources but coverage is not guaranteed. |
| Amenities | `AVAILABLE_PARTIAL` | Explicit list only; absence is unknown. |
| Free cancellation | `AVAILABLE_PARTIAL` | Explicit boolean only; absent does not become false. |
| Sponsored/ad | `AVAILABLE_EXACT` | Separate ad collection is recorded as advertising bias, never quality. |
| Property details | `AVAILABLE_PARTIAL` | Requires a separately counted property-detail request. |
| Nearby places | `AVAILABLE_PARTIAL` | Optional property field, not universally available. |
| Images | `AVAILABLE_PARTIAL` | Optional and not ingested by the adapter. |
| Search timestamp | `AVAILABLE_DERIVED` | Bucketed from official metadata when present. |
| Cache status | `UNKNOWN` | No positive cached/fresh claim without direct evidence. |
| Pagination | `AVAILABLE_EXACT` | `next_page_token` marks the page partial; it is never emitted or persisted. |
| Click label | `NOT_AVAILABLE` | No click outcome is fabricated. |
| Booking label | `NOT_AVAILABLE` | No booking outcome is fabricated. |
| Post-stay outcome | `NOT_AVAILABLE` | No satisfaction or repeat-choice outcome is available. |

## Price contract

The adapter keeps these facts distinct:

- `nightlyPrice`;
- `totalStayPrice`;
- `beforeTaxesAndFees`;
- `taxesAndFeesKnown`;
- `lowestObservedPrice`;
- `sellerSpecificPrice`;
- `exactBookableOfferKnown`;
- `priceFreshness`;
- `cachedResult`.

An observed Google aggregate is never promoted to
`EXACT_BOOKABLE_TOTAL`. The canonical `exactPriceMinorUnits` remains unknown
until an admitted future boundary proves a total, currency, tax completeness,
freshness and exact bookable offer. A missing total is not inferred from
nightly price and nights. A before-tax amount is not promoted to after-tax.

## Bias register

The source always carries a source-specific diagnostic register. General
flags that fit the external contract are mapped; more specific flags remain
documented and must not be “corrected” by invented values.

| Bias or limitation | Required handling |
|---|---|
| Google ranking bias | Display order is exposure metadata, not quality. |
| Sponsored/advertising bias | Separate and label ads; never add merit. |
| Lowest-price aggregation bias | Preserve price semantics; do not infer a bookable offer. |
| Seller coverage bias | Treat seller set as partial. |
| Cache/freshness bias | Keep freshness/cache unknown unless explicitly proven. |
| Geolocation bias | Record market context; do not generalize. |
| Language and market bias | Preserve request context; stratify later. |
| Currency conversion | Do not invent conversion provenance or exactness. |
| Incomplete tax visibility | Preserve before-tax and unknown tax state. |
| Missing cancellation conditions | Missing remains unknown, not restrictive. |
| Collapsed room/rate plans | Do not equate a property aggregate with a comparable room offer. |
| Provider availability mismatch | Display does not prove LiteAPI availability or checkout success. |
| Personalization uncertainty | Google may personalize; no propensity is invented. |
| Popularity bias | Ratings/reviews and ranking do not prove quality. |
| Review-source aggregation | Keep source uncertainty; do not normalize without evidence. |
| Alternatives not shown | A page is a partial visible set. |
| Pagination truncation | Additional pages are not independent sessions. |
| Property-detail asymmetry | Enrichment is separately budgeted and cannot be cherry-picked post-result. |

## Adapter disposition

The synthetic adapter:

- accepts only a caller-supplied value;
- performs no network or credential access;
- emits exactly one external session per response page;
- derives local anonymous IDs and drops source tokens and seller names;
- records ads, rank, missingness, coordinates and price semantics;
- emits impression-only actions;
- sets `automaticGoldenAdmission=false` and
  `automaticV3WeightChange=false`;
- marks source rights `TERMS_ACCEPTANCE_REQUIRED` and
  `persistentIngestionAllowed=false`;
- therefore passes structural validation but is rejected by the persistent
  replay gate until rights are explicitly admitted.

No full or official response sample is committed. Tests use an invented,
obviously synthetic three-property fixture.

## Future twelve-session pilot

The plan is proposed, not authorized. Relative dates will be materialized only
at execution after checking current terms, pricing and validity.

| ID | Traveler | Stay | Lead time | Priority | Market band | Diagnostic purpose |
|---|---|---|---|---|---|---|
| 01 | solo | one night | short | budget | lower | small, price-sensitive set |
| 02 | solo | medium | medium | quality | higher | rating/review coverage |
| 03 | couple | one night | long | cancellation | mixed | flexibility evidence |
| 04 | couple | medium | short | budget | higher | price compression |
| 05 | couple | long | long | quality | lower | total-vs-nightly semantics |
| 06 | family | medium | medium | cancellation | mixed | children/room context |
| 07 | family | long | long | budget | higher | total-cost uncertainty |
| 08 | solo | medium | short | cancellation | lower | missingness under short lead |
| 09 | couple | one night | medium | quality | mixed | near-tie quality evidence |
| 10 | family | medium | long | quality | higher | amenities/review reliability |
| 11 | solo | long | medium | budget | mixed | pagination and large set |
| 12 | family | one night | short | cancellation | lower | small-set/flexibility boundary |

Frozen proposal:

- independent main sessions: 12;
- main searches: at most 12;
- property-detail enrichments: at most three per session;
- theoretical ceiling: 48 API calls;
- concurrency: one;
- indiscriminate retries: none;
- automatic pagination beyond the future cap: none;
- `no_cache`: deferred; it is not enabled by this gate.

The 48-call value is a proposal derived from 12 main requests plus at most 36
separately counted detail requests. It is not authorization. The execution
gate must re-confirm whether every request consumes one search credit and
must enforce the final budget before transport. Enrichment targets must be
selected by a frozen rule, not after inspecting attractive results.

The pilot exercises solo/couple/family, one-night/medium/long stays,
short/medium/long lead time, budget/quality/cancellation priorities, different
price markets and small/large choice sets. Twelve sessions do not satisfy the
200 Golden-case, 100 replay, 300 human-judgment or 100 expert-judgment gates.

## Future manual cross-check

For a preselected subset, a human may open the public Google Hotels page and
record only a sanitized checklist for destination, dates, occupancy, hotel
presence, approximate displayed price, rating, sponsor label and timestamp
bucket. The check is not performed here, must not use automation or scraping,
and cannot prove exact bookability. Differences are diagnostics, not grounds
for substituting sessions or repeating calls.

## Claims and gates

This phase collected zero sessions, zero Golden candidates and zero judgments.
It does not establish booking, satisfaction, lack of regret, complete market
coverage, LiteAPI availability, prebook consistency or a booking handoff.
Engine V3 weights and core are unchanged. V3-17 remains unmet and V3-18
remains blocked.

Required user action before any pilot:

1. create the SerpApi account personally, if desired;
2. review and accept the then-current terms personally;
3. confirm the account/free-plan state and whether a card is requested;
4. obtain clarification or make an explicit legal/retention decision for
   internal sanitized snapshots; redistribution remains prohibited absent
   written permission;
5. authorize a separate bounded pilot with a frozen credit/request ceiling.

Recommended next phase:
`V3-17T1_SERPAPI_GOOGLE_HOTELS_12_SESSION_PILOT_AUTHORIZATION_GATE`.
That phase is an authorization gate only and cannot inherit permission to
issue API calls from V3-17T.
