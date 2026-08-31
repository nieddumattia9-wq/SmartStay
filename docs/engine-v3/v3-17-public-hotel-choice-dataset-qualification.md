# StayOpti Engine V3-17S — Public hotel-choice dataset qualification

Status: source-access safe hold with offline contract implemented
Source checkpoint: `3d1f3591f4b89ae484d19cb4d7fdfbaf5526180c`
Public engine: V2 unchanged
V3: not public; weights unchanged
Split: `OFF`
Provider calls: zero

## Decision

No audited real-world source is admitted for persistent ingestion yet. The
Trivago RecSys Challenge 2019 is the best technical candidate because its
official schema preserves a click-out choice set, displayed order and exact
prices, but access requires a personal account and acceptance of terms whose
commercial-use scope has not been approved. Expedia RecTour has the richest
documented lodging-search signal, including impressions, clicks and bookings,
but the audit could not locate a current primary download archive or bind an
exact dataset license to that archive. Kaggle competition datasets remain
terms-gated. Official mirrors and unofficial copies are not substitutes.

V3-17S therefore implements a provider-neutral, fail-closed observation and
replay boundary using synthetic fixtures derived only from official schemas.
It does not download, ingest, train on or calibrate from real source rows.

## Research method and access boundary

The audit used public GET access only for official documentation, papers,
competition metadata and license text. No account was created, no terms were
accepted, and no large dataset or source sample was downloaded. Search pages
and papers are evidence about a dataset; they are not the dataset itself.

Persistent ingestion requires all of the following:

1. primary provenance or a cryptographically bound official distribution;
2. an exact dataset license, not merely the license of a paper or source code;
3. a documented permitted use compatible with StayOpti;
4. no login/terms action performed by an automated agent on the user's behalf;
5. an intact choice set and a mapping that does not promote labels to features.

Primary locators checked on 2026-08-31:

- Expedia RecTour paper: `https://ceur-ws.org/Vol-2974/invited1.pdf`;
- Expedia Group technical description:
  `https://medium.com/expedia-group-tech/expedia-group-recsys-2021-ff791f42ba07`;
- RecSys Challenge 2019: `https://www.recsyschallenge.com/2019/`;
- Trivago challenge description:
  `https://tech.trivago.com/post/2019-03-11-recsyschallenge2019`;
- official RecSys 2019 schema:
  `https://github.com/recsyschallenge/2019/blob/master/docs/problem_definition.md`;
- Expedia Hotel Recommendations data page:
  `https://www.kaggle.com/competitions/expedia-hotel-recommendations/data`;
- official ExpediaGroup ECML/PKDD 2022 repository and data terms:
  `https://github.com/ExpediaGroup/pkdd22-challenge-expediagroup` and
  `https://github.com/ExpediaGroup/pkdd22-challenge-expediagroup/blob/main/TERMS_OF_USE_DATA.md`;
- Expedia Hotel Ranking data page:
  `https://www.kaggle.com/c/expedia-hotel-ranking/data`.

## Source qualification matrix

| Source | Primary provenance | Dataset currently obtainable without user action | Download URL | Dataset license | Commercial use | Account / terms | Size | Choice set | Click | Booking | Price | Rating / reviews | Amenities / cancellation | Dates / occupancy | Bias notes | StayOpti role | Decision |
|---|---|---:|---|---|---|---|---|---:|---:|---:|---|---|---|---|---|---|---|
| Expedia Group RecTour Research Dataset (2021) | Expedia authors; CEUR paper and Expedia Group technical article | No verified archive located | `NONE_VERIFIED` | Paper says the dataset is under a Creative Commons license, but the exact license-to-archive binding was not retrievable; the CEUR paper itself is CC BY 4.0 | `UNKNOWN` | No active first-party download flow established | about 2.5M searches, over 800k users | Yes, ordered impressions | Yes | Yes | Bucket only | rating and rounded count | amenities and free cancellation | Yes | rank, travel ads, obfuscated/resampled distributions, selected users had a click | strongest future behavioral replay candidate if archive and license are verified | `CONDITIONAL` |
| Trivago RecSys Challenge 2019 | Official challenge, official problem definition and Trivago article | No; official page requires account plus terms | `https://recsys.trivago.cloud/` after user action | exact accepted dataset terms not available to this audit | `UNKNOWN` | Required | about 910k train sessions and 291k test sessions reported by the challenge literature | Yes, impressions per click-out | Click-out | No observed booking | Exact displayed prices | categorical item properties; no dependable review-count contract | categorical properties; cancellation not established | search interaction context; occupancy/date completeness not established | position, platform, default sort, ads/partners, click-out without booking, unobserved off-platform outcome | primary conditional source for exact-price click-out replay | `CONDITIONAL` |
| Expedia Hotel Recommendations (Kaggle 2016) | Expedia-hosted Kaggle competition | No | Kaggle competition data page after user action | `Subject to Competition Rules` | `UNKNOWN` | Kaggle sign-in and rules acceptance required | 4.52 GB; historical 2013–2015 split | No full shown alternatives per search | Yes | Yes | No exact choice-set price | latent destination and cluster features | No sufficient decision evidence | Yes | sampled/non-representative logs, cluster target, no full choice set | auxiliary booking-label research only, not StayOpti replay | `REJECTED` |
| Expedia Group ECML/PKDD 2022 cross-brand click data | Official ExpediaGroup GitHub repository | Yes | official repository release files | CC BY-NC 4.0 plus Expedia terms | No commercial use | No account observed | over 12M train users; click sequences and property attributes | No shown choice set | Yes | No | No | star/review rating; no dependable choice-set review count | property amenities | No search decision context | selection on at least two clicks, deduplication, cross-brand shift, no impressions | sequence-model research only | `REJECTED` |
| Expedia Hotel Ranking / Personalized Sort (Kaggle) | Expedia-hosted Kaggle competition | No | Kaggle competition data page after user action | `Subject to Competition Rules` | `UNKNOWN` | Kaggle sign-in and rules acceptance required | hundreds of MB; search/property rows | Yes by search ID | Yes | Yes | Exact historical price fields documented | rating/count fields documented | cancellation/amenity coverage incomplete | search context present | position, promotions, competitor missingness, historical platform policy | technically suitable conditional replay source after terms review | `CONDITIONAL` |

Counts: five sources audited; zero fully qualified; three conditional; two
rejected. The primary conditional source is Trivago RecSys Challenge 2019.
User action is required to review and personally accept its current terms, and
to obtain an explicit legal/product decision on commercial use before any
persistent ingestion. V3-17S does not perform that action.

## Behavioral evidence hierarchy

| Evidence | Meaning | Allowed interpretation |
|---|---|---|
| `IMPRESSION_ONLY` | the property was in the visible choice set | exposure only; no preference |
| `DETAIL_VIEW` | the traveler inspected more detail | weak interest |
| `CLICK_OUT` | the traveler selected an outbound offer | `MODERATE_REVEALED_PREFERENCE_WITH_CONFOUNDERS` |
| `BOOKING_OBSERVED` | a transaction was attributed inside the observed set/window | `STRONG_REVEALED_PREFERENCE_WITH_CONFOUNDERS` |
| `POST_STAY_SATISFIED` | a later satisfaction outcome is available | strong outcome evidence with its own measurement limits |
| `WOULD_CHOOSE_AGAIN` | the traveler states the decision would be repeated | particularly relevant to regret, still context-bound |

A booking is never `OBJECTIVE_BEST_CHOICE`. It can be affected by ordering,
advertising, loyalty, availability, price promotion, incomplete alternatives,
missing visible information, device, platform and off-platform behavior. No
action means no observed action; it does not mean rejection of every hotel.

## Canonical external contract

`ExternalHotelChoiceSessionV3` is versioned as
`stayopti.v3.external-hotel-choice-session@1`. It records the source and exact
license status, primary provenance, one session fingerprint, historical
context, anonymized destination, dates and occupancy when available, filters,
sort/device context, explicit currency and price knowledge, choice-set
completeness, alternatives, actions, booking label, bias flags, evidence
strength, mapping completeness, allowed uses, prohibited claims and a temporal
partition.

Each alternative preserves its anonymous local property key, displayed rank,
ad/sponsored state, quality and review evidence, exact price or price bucket,
cancellation, amenities, availability, missingness and field provenance. A
price bucket can never be promoted to an exact price. Unknown remains unknown.
The validator rejects raw provider identifiers, secrets, commercial fields,
unsafe objects, duplicate alternatives, broken action references, conflicting
price representations, missing required bias declarations and Golden-boundary
violations.

The license gate is independent from structural validity. `UNKNOWN`,
`TERMS_ACCEPTANCE_REQUIRED` and `VERIFIED_NON_COMMERCIAL` cannot enter a
persistent StayOpti product corpus without a later explicit decision. An
unverified mirror is rejected even when its rows match a known schema.

## Mandatory bias model

Every source mapping assesses and retains:

- position and default-sort bias;
- sponsored/advertising and popularity bias;
- availability, price/promotion and loyalty bias;
- device, market and currency effects;
- missing fields and information visible in the original UI but absent here;
- never-shown alternatives and unobserved off-platform transactions;
- click without booking and unknown cancellation outcome;
- anonymization, resampling and distribution obfuscation;
- temporal obsolescence;
- unreconstructable destination and exact price.

Without exposure propensities the system does not invent inverse-propensity
weights. Later analysis must use rank strata, ad exclusion/sensitivity,
matched comparisons and explicit uncertainty.

## Corpus firewalls

1. `LIVE_GOLDEN_CORPUS`: current, qualified LiteAPI snapshots and later blind
   decisions. External rows never enter automatically.
2. `EXTERNAL_OBSERVATIONAL_CORPUS`: historical anonymized behavior used only
   for benchmark and replay.
3. `DECISION_SCIENCE_LIBRARY`: scoped scientific propositions and contextual
   priors, never universal weights.
4. `SYNTHETIC_COUNTERFACTUAL_CORPUS`: declared transformations of real bases.
5. `BLIND_HUMAN_JUDGMENT_CORPUS`: blinded V2/V3 comparisons.
6. `STAYOPTI_OUTCOME_CORPUS`: future decisions, bookings, satisfaction and
   would-choose-again outcomes.

No record migrates between these corpora without a separate validator and an
explicit admission decision.

## Decision Science relationship and learning objective

External data says what people did in a historical interface. The Decision
Science Library supplies bounded hypotheses about why an attribute may matter.
LiteAPI supplies current alternatives. V3 composes a contextual decision.
Blind judgments assess decision quality. Post-stay outcomes eventually measure
real regret.

Future calibration may optimize:

`EXPECTED_CONTEXTUAL_STAY_UTILITY - EXPECTED_REGRET - RISK_COST`

subject to hard constraints, budget, evidence reliability, dominance,
fairness, Choice/Saving/Upgrade/Split role isolation and abstention. Contextual
priors may make flexibility more salient for uncertain long-lead travel,
location more salient for a short city stay, or review volume relevant to
rating reliability. Those are falsifiable hypotheses, not coefficients copied
from booking frequency.

## Provider-neutral replay adapter

The adapter emits a separate pre-decision feature block and evaluation-label
block. `clicked`, `booked`, `num_clicks`, `is_trans`, observed actions and
booking state are prohibited from the feature block. Alternatives retain the
complete observed choice set. One search session is one replay unit; hotel rows
are not independent samples. Exact duplicate session fingerprints are removed.

The replay always declares:

- external observations are not Golden;
- no automatic V3 weight change;
- no observed split outcome;
- no objective-best, global-optimum, market-frequency, satisfaction or
  commercial claim.

## Leakage controls

Before any full ingestion:

1. freeze temporal train/validation/test boundaries;
2. isolate the same anonymized user cluster and session fingerprint to one
   partition;
3. keep booking/click outcomes only as evaluation labels;
4. freeze feature audit and deterministic seed;
5. version dataset, mapping and policy independently;
6. perform no optimization on test sessions;
7. retain missingness and historical-period boundaries;
8. reject unverified mirrors and licenses that do not permit the intended use.

## Plan for 100 provider-neutral replays

Target: at least 100 independent sessions, sampled with a frozen deterministic
seed after lawful access. Sampling is stratified when fields permit across
solo/couple/family/group, one/medium/long stay, short/long lead time,
budget/quality/flexibility emphasis, amenities present/absent, many/few
reviews, small/large choice set, top/lower-rank choice, click/no booking,
booking/no action and ads present/absent.

The session denominator is primary. All available alternatives in its observed
choice set are retained. Several rows from one search never increase the
denominator. Missing strata are reported, not synthesized. The 100 replay
target is planned, not completed.

Ordinary Expedia/Trivago logs do not establish authentic split-stay outcomes.
A split experiment may use a real session only as a base and must be marked
`SYNTHETIC_COUNTERFACTUAL_FROM_REAL_BASE`, add explicit switching cost,
distance, luggage, party and duration context, and undergo separate blind
review. It is never represented as an observed split booking.

## Implementation and validation boundary

Implemented privately under `src/engine-v3/evaluation`:

- versioned session and replay contracts;
- deterministic SHA-256 session/replay binding;
- recursive unsafe-field and label-feature scans;
- evidence and bias classifiers;
- license/provenance admission gate;
- session deduplication and dual row/session denominators;
- temporal/user/session partition-isolation check;
- provider-neutral replay adapter;
- frozen 100-session sampling plan.

Tests use synthetic records following official public schemas. No source row,
personal data, dataset archive, credential or raw provider response is stored
in the repository. No public barrel, V2, V3 decision weights, UI, provider
runtime, booking flow or analytics path imports this module.

## Gate result and next action

`V3_17S_STATUS=SAFE_HOLD_SOURCE_ACCESS` is the correct result even when all
offline tests pass: the controlled ingestion boundary is ready, but no
real-world source has both accessible primary data and a verified permission
compatible with persistent StayOpti use.

Next recommendation:
`V3-17S.1_TRIVAGO_DATASET_TERMS_LICENSE_AND_USER_ACCESS_DECISION_GATE`.
That phase must not accept terms on the user's behalf and does not authorize
training, calibration, provider calls or V3-18.
