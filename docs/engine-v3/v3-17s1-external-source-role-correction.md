# StayOpti Engine V3-17S.1 — External source-role correction and lawful access recovery

Status: `SAFE_HOLD_SOURCE_ACCESS`
Source checkpoint: `48ee75d72c4d15718ccc782922536c8712fb0cf5`
Research date: 2026-08-31
Provider calls: zero
Dataset ingestion: none

## Decision

The V3-17S access hold remains valid, but it must not determine the order of
strategic value. The corrected source roles are:

1. Expedia RecTour is `PRIMARY_BOOKING_CHOICE_DATASET_TARGET` because its
   documented schema is the closest match to the real hotel decision: ordered
   impressions, clicks, attributed purchases, search context, occupancy,
   price buckets and hotel attributes.
2. Trivago RecSys Challenge 2019 is
   `SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK`. It provides session intent,
   impression sets, displayed position, price and click-out; it does not
   provide booking ground truth.
3. Expedia Personalized Sort is
   `CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK`, subject to the user
   personally reviewing and accepting the official Kaggle/Expedia rules and a
   later legal/product decision on the allowed use.

This prospectively corrects the source-role statement in V3-17S and D-0006.
It does not rewrite the historical V3-17S result, relax the ingestion firewall
or treat external behavior as Golden evidence.

## Bounded official-source audit

Research used only public GET access to owner pages, official challenge pages,
the authors' workshop page and the academic paper. No account was created, no
terms were accepted and no dataset archive or mirror was downloaded.

### Expedia RecTour

The Expedia-authored paper describes about 2.5 million real lodging searches
from more than 800,000 users. Each search contains an ordered impression set;
clicks and purchases within a 180-minute attribution window are labels. The
schema also documents dates, adults, children, infants, rooms, sort/filter
context, position, travel ads, review evidence, stars, free cancellation,
amenities and price buckets.

The legal layers are not interchangeable:

| Layer | Verified statement | Consequence |
|---|---|---|
| Paper | The CEUR paper is CC BY 4.0 | This licenses the paper, not necessarily the data archive. |
| Dataset statement in paper | “available under a Creative Commons license” | Exact license and archive binding are not stated there. |
| Official workshop presentation | Dataset described as CC BY-NC 4.0 with additional accompanying terms | Strong evidence of intended research-only terms, but the referenced data file and its accompanying terms were not retrievable. |
| Actual dataset file | No current official Expedia, author or RecTour archive was found | File-level provenance and integrity cannot be checked. |
| File-level license | Not retrievable | Persistent ingestion is forbidden. |
| Commercial use | Not verified for the actual file; the available official presentation points to non-commercial terms | StayOpti must not assume commercial use. |
| Derived-data redistribution | Not verified for the actual file and additional terms | Redistribution is forbidden until the terms are reviewed. |

The official Expedia technical article and RecTour workshop still describe or
reference the dataset, but their live links resolve to the paper/presentation,
not to a verifiable current data archive. Unverified Kaggle, Zenodo, GitHub or
other mirrors are not lawful substitutes.

### Trivago RecSys Challenge 2019

The official challenge page says the data were hosted at
`https://recsys.trivago.cloud/` and required account creation plus agreement
to terms. On 2026-08-31 the official portal fetch reproduced `502 Bad Gateway`;
a direct DNS check also failed to resolve the host. The historical official
schema remains available, but the original file and current terms are not.

Trivago's owner article says the task predicts the final accommodation
click-out from session interactions. The traveler is redirected to a booking
site after the click. The dataset therefore supports click/session intent,
not an observed completed hotel booking. Position, default ordering,
advertising and off-platform outcomes remain confounders.

### Expedia Personalized Sort / Kaggle

The official Kaggle competition page remains visible and documents one search
as a set of displayed hotel rows with position, click, booking, price,
promotion, dates and occupancy. Its data page states:

- metadata license: `Subject to Competition Rules`;
- access action: sign in or register, then accept the competition rules;
- the data file is not visible for download before that action.

Codex did not sign in, register, join, accept rules or download files. The
exact user action, if the user wishes to continue this track, is: personally
sign in to Kaggle (or create an account), open the official Expedia
Personalized Sort competition, review the current Competition Rules and only
then decide whether to accept them. Acceptance alone would not decide whether
commercial StayOpti use or derived redistribution is permitted; those scopes
must be reviewed separately from the authenticated rules.

## Provider-neutral source registry

Private module:
`src/engine-v3/evaluation/externalHotelChoiceSourceRegistryV3.ts`.

Each entry freezes:

- `sourceId` and `sourceRole`;
- `observedOutcomeType`;
- availability of choice set, click, booking, price, occupancy, amenities and
  cancellation;
- `accessStatus`, `provenanceStatus`, `licenseStatus` and
  `commercialUseStatus`;
- `ingestionAllowed` and `goldenEligibility`;
- permitted evaluation uses and forbidden claims;
- automatic-V3-change and real-Golden-block flags, both permanently false.

The admission check fails closed unless the exact official file is available,
file-level primary provenance is verified, the exact file license is verified
and commercial-use status is not unknown. An unverified mirror remains
inadmissible even if its schema or checksum resembles a described dataset.

## Evidence semantics

- `CLICK_OUT` is
  `MODERATE_REVEALED_PREFERENCE_WITH_CONFOUNDERS`.
- `BOOKING_OBSERVED` is
  `STRONG_REVEALED_PREFERENCE_WITH_CONFOUNDERS`.
- Neither is `OBJECTIVE_BEST_CHOICE`.
- Trivago click-out is never promoted to booking.
- External replay is never a real Golden case.
- External observations never change V3 policy or weights automatically.

The original interface can shape behavior through rank, advertising,
availability, price/promotion, loyalty, missing alternatives and unobserved
off-platform actions. These fields remain labels and bias context, not an
automatic decision target.

## Source-role and access registry

| Source | Source role | Outcomes | Choice set | Click | Booking | Price | Occupancy | Amenities | Cancellation | Access | Provenance | File license | Commercial use | Ingest | Golden eligibility |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---:|---|
| Expedia RecTour 2021 | `PRIMARY_BOOKING_CHOICE_DATASET_TARGET` | impressions, click, attributed booking | Yes | Yes | Yes | bucket | Yes | Yes | Yes | official file not found | paper/owner description verified; file unavailable | not verified for file | unknown; official presentation indicates non-commercial | No | external observational only |
| Trivago RecSys 2019 | `SECONDARY_SESSION_INTENT_AND_CLICK_BENCHMARK` | impressions, click-out | Yes | Yes | No | displayed price | Not established | Not established | No | official portal 502 | official schema verified; file unavailable | unknown | unknown | No | external observational only |
| Expedia Personalized Sort 2013 | `CONDITIONAL_CLICK_AND_BOOKING_RANKING_BENCHMARK` | impressions, click, booking | Yes | Yes | Yes | displayed price | Yes | No | No | Kaggle terms-gated | official competition page; file not accessed | competition rules not reviewed/accepted | unknown | No | external observational only |

## Non-blocking decision

No complete source is currently both officially obtainable and admitted under
a file-level license compatible with the intended use. The external track
therefore remains `SAFE_HOLD_SOURCE_ACCESS` as a future accelerator.

This hold does **not** block the independently governed collection of current
real Golden cases from LiteAPI. It creates no provider authorization. The next
phase is:

`V3-17T_LITEAPI_BOUNDED_PRODUCTION_REAL_GOLDEN_PILOT_AUTHORIZATION_GATE`

V3-17T is an authorization gate only. It may specify contract, budget,
privacy, pagination and stop criteria, but it may not issue a production call
without a new explicit user authorization.

## Preserved boundaries

- dataset ingested: `NO`;
- provider calls: `0`;
- credentials loaded: `NO`;
- external observations automatically Golden: `NO`;
- external observations automatically change V3: `NO`;
- public V2 runtime changed: `NO`;
- V3-17 gate met: `NO`;
- V3-18 entry allowed: `NO`.
