# V3-17T4 — Comparable set-wide evidence requirements and collection gate

Status: `PASS_REQUIREMENTS_AND_GATE_READY` on source checkpoint
`b859441705a3ef99f62644a05fbebcbeed9d09e7`.

This phase is offline. It performs no HTTP request, loads no credential,
creates no operational authorization literal and grants no authority to resume
the historical collection. It preserves the T3 sample as `DIAGNOSTIC_ONLY`.

## Evidence and decision boundary

- T3 Evidence SHA-256:
  `1a669961375fc3838c100c7d7ca03623a9902acab4c87621799366aa671f50a6`;
  seven artifacts and `6/6` internal checksums pass.
- T2E seal SHA-256:
  `27d4c7274432599dbdc70ba695ac7877d39ea5690babb11e3cc3ab8113d08b26`;
  fifteen artifacts and `14/14` internal checksums pass.
- Both encrypted envelopes authenticate under AES-256-GCM with Windows
  CurrentUser DPAPI. They remain byte-identical outside the repository and no
  plaintext is written at rest.
- The T3 facts remain: 29 alternatives, 20 observed aggregated display
  prices, nine missing prices, one asymmetric detail and no exact-bookable
  evidence.

The result is a contract for future evidence collection, not a collection and
not a decision that the existing sample was better than previously assessed.

## Evidence-tier contract

| Tier | Permitted use | Prohibited claim |
|---|---|---|
| `DIAGNOSTIC_ONLY` | Shape, missingness, bias, rating/review/location/amenity coverage and display-price diagnostics | Reliable V3 recommendation, complete blind judgment, Golden candidacy |
| `LIMITED_COMPARABLE_JUDGMENT` | Relative value impression, qualitative coherence and explicitly caveated human comparison over a pre-frozen set | Exact bookable value, checkout total, final real-world convenience or Golden completeness |
| `FULL_DECISION_AND_BLIND_JUDGMENT` | Canonical V3 replay, complete blind task and manual Golden-candidate review | Automatic Golden admission, objective global optimum, public production validity |

The tier cannot be upgraded merely by dropping inconvenient alternatives
after observing the result. Every missing field remains explicit; `UNKNOWN`
is never converted to false, zero or negative quality.

## Comparable-set size

- `MINIMUM_COMPARABLE_SET_SIZE=5`
- `TARGET_COMPARABLE_SET_SIZE=8`
- `MAXIMUM_COMPARABLE_SET_SIZE=10`

Five is the minimum that can expose more than a binary or hand-picked
comparison and can contain value, quality, comfort, location and control
signals. Eight is the default balance between meaningful alternatives and
reviewer burden. Ten is the hard operational ceiling for a single blind task;
above ten, choice overload and enrichment cost increase faster than the
additional diagnostic value. Search-wide coverage remains separately
reported: a selected set is never called the market.

## Set-wide field matrix

Coverage uses basis points. Critical full-tier fields require `10000/10000`.

| Field | First required tier | Coverage | Missingness | Semantics and comparability | Use | Failure |
|---|---:|---:|---|---|---|---|
| Stay and occupancy scope | Full | 100% | None | Identical canonical dates, rooms and party | Decision | Fail full |
| Exact-scope availability | Full | 100% | None | Confirmed in one capture boundary | Decision | Fail full |
| Total-stay price | Full | 100% | None | `EXACT_BOOKABLE_PRICE`, integer minor units | Decision | Fail full |
| Currency | Limited | 100% | None | One ISO-4217 currency | Decision | Fail limited/full |
| Tax and fee status | Full | 100% | None | Identical known/excluded-amount semantics | Decision | Fail full |
| Freshness | Full | 100% | None | One capture window plus current recheck state | Confidence | Fail full |
| Room/offer | Full | 100% | None | Structured like-for-like or declared difference | Decision | Fail full |
| Cancellation | Full | 100% | None | Structured source-bound terms | Decision | Fail full |
| Rating plus review count | Limited | 80% | Explicit unknown | One normalized scale and provenance | Decision | Fail below 80% |
| Location | Limited | 80% | Explicit unknown | One canonical destination anchor | Decision | Fail below 80% |
| Essential amenities | Limited | 80% | Explicit unknown | One canonical allowlist | Decision | Fail below 80% |
| Property category | Full | 100% | None | One accommodation taxonomy | Decision | Fail full |
| Source order/sponsorship | Diagnostic | 0% | Allowed | Exposure-bias metadata | Audit only | None |

Full tier additionally requires symmetric detail coverage of `100%`. If a
detail-only field is not available for every selected alternative, that field
is excluded from decision and judgment; it cannot create an advantage or a
penalty.

## Price-semantic matrix

| Semantic | Ranking | Blind review | Golden | Required safeguards |
|---|---|---|---|---|
| `OBSERVED_AGGREGATED_DISPLAY_PRICE` | Not full-decision eligible | Limited with caveat | Prohibited | Display capture, unknown/partial taxes, availability unproven, recheck required |
| `SELLER_SPECIFIC_OBSERVED_PRICE` | Limited until bookability is confirmed | Limited with caveat | Prohibited without bookability | Explicit seller, scope, tax status, capture and recheck |
| `EXACT_BOOKABLE_PRICE` | Allowed | Allowed | Manual-review candidate | Total stay, exact scope, seller-specific availability, freshness and explicit tax/fee status |
| `VERIFIED_CHECKOUT_TOTAL` | Allowed | Allowed | Strongest manual-review candidate | Complete checkout-bound total and confirmed availability |

`FULL_TIER_REQUIRED_PRICE_SEMANTIC=EXACT_BOOKABLE_PRICE`. Verified checkout
is stronger but is not made a universal prerequisite for blind evaluation.
It is required when a claim specifically concerns final checkout equality.
No price semantic is promoted implicitly.

## Capability assessment of the current public-market source

Only the two encrypted responses, their offline replay, the sealed sanitized
shape and synthetic fixtures are used.

| Capability | Classification | Demonstrated evidence |
|---|---|---|
| Main-search rating, review and coordinates | `DEMONSTRATED` | 29/29 in the sealed sample |
| Main-search amenities | `PARTIALLY_DEMONSTRATED` | 28/29 |
| Aggregated display price | `PARTIALLY_DEMONSTRATED` | 20/29, not bookable |
| Property-detail structural replay | `PARTIALLY_DEMONSTRATED` | One direct-root detail |
| Set-wide total-stay price | `NOT_DEMONSTRATED` | Nine missing and incomplete semantics |
| Seller-specific exact-bookable offer | `NOT_DEMONSTRATED` | Existing projection explicitly sets exact bookability false |
| Taxes and fees | `PARTIALLY_DEMONSTRATED` | Before-tax evidence exists, checkout completeness does not |
| Cancellation | `NOT_DEMONSTRATED` | Unknown in the sealed sample |
| Exact-scope availability | `NOT_DEMONSTRATED` | Impression does not prove bookability |
| Freshness | `PARTIALLY_DEMONSTRATED` | Capture time exists; offer recheck does not |
| Full decision/blind tier | `NOT_DEMONSTRATED` | Multiple critical set-wide fields are absent |

Therefore `SERPAPI_FULL_TIER_FEASIBILITY=NO` under the presently demonstrated
contract. This is not a universal claim about every future response; it means
the current evidence cannot authorize spending credits on the assumption that
property details will reach the full tier.

## Provider-neutral selection contract

The comparable set is selected from set-wide main-search fields and sealed
before any detail call. The protocol nominates independent diagnostic strata:

1. lowest observed display-price signal;
2. closest-to-frozen-budget signal;
3. strongest normalized rating/review signal;
4. widest essential-amenity signal;
5. closest canonical-location signal;
6. mid-range price control;
7. deterministic semantic-diversity controls until the target is reached.

This is a sampling protocol, not a V3 recommendation and not a new weighting
policy. Exact semantic ties remain equivalent. The fingerprint uses only the
normalized fields above. It excludes sponsorship, original position, source
name, source identity, presence of an opaque detail reference, hotel brand,
detail richness and provider ordering. Inclusion and exclusion reason codes
are retained.

## Missing-price policy

`MISSING_PRICE_POLICY=SEPARATE_MISSING_STRATUM_EXCLUDED_FROM_LIMITED_PRICE_COMPARISON`.

An unpriced alternative is not presumed expensive, unavailable, bad or
irrelevant. It remains in the source denominator and a separate missing
stratum. It cannot enter a limited price comparison, and its exclusion is
recorded. If fewer than five priced, scope-consistent candidates remain, the
whole session fails the limited tier. Full tier fails whenever any selected
alternative lacks its critical exact price.

## Detail coverage

- Diagnostic tier may retain isolated detail as audit-only.
- Limited tier requires no detail if all displayed fields used in the task are
  already set-wide.
- If any detail-derived field is shown or scored, coverage must be symmetric
  across the frozen set.
- Full tier requires 100% structured room/offer, cancellation and exact-price
  coverage, either through symmetric details or through another qualified
  set-wide source.

The existing single detail remains `SINGLE_ITEM_DIAGNOSTIC_ONLY`.

## Collection-strategy comparison

| Strategy | Calls/session | Tier reachable | Main risk | Golden potential | Decision |
|---|---:|---|---|---|---|
| A — main-search-only frozen subset | 1 | Limited | Insufficient priced candidates or location anchor | No | Recommended low-credit limited path |
| B — main plus detail for every selected alternative | 6 / 9 / 11 for set 5 / 8 / 10 | Limited on current evidence | Detail failure/asymmetry; exact bookability still absent | No on current evidence | Rejected as expensive without full-tier proof |
| C — external main plus operational exact offers | Unresolved | Potentially full | Cross-source entity/offer matching and freshness skew | Conditional manual review | Requires separate provider qualification |
| D — one source with set-wide exact offers | Unresolved | Potentially full | Source, cost and depth not qualified | Conditional manual review | Preferred full-tier architecture if qualified |

No new provider integration is implemented in T4.

## Call-budget model

The selected limited strategy A has:

- minimum, target and maximum: one main-search call per session;
- target sessions: 12;
- maximum and worst-case total: 12 calls;
- concurrency: 1;
- retries: 0;
- pagination: 0;
- diagnostic error reserve: 0; a failed call consumes that session's budget;
- one-session canary: one call;
- global saving if the canary stops the plan: 11 calls;
- per-session and global autostop mandatory.

For comparison, strategy B would require 108 target calls or 132 worst-case
calls for 12 sessions. T4 rejects that expenditure because it still cannot
demonstrate exact bookability or full-tier eligibility.

## Future collection-gate contract

A future gate must bind exact `SOURCE_SHA`, exact `EXECUTION_HEAD`, manifest
hash, runner-bundle hash, 12-session count, set target eight, one call per
session, maximum 12 calls, concurrency one, retries/pagination zero,
autostop, encrypted private quarantine, per-session/global stop and a spend
ledger. It must preserve a separate remaining-stage authorization boundary.

T4 materializes neither manifest nor runner hash and creates no literal.
Runtime parameters cannot increase either the per-session or global cap. Any
historical authorization literal is rejected.

## Final decision

`GO_NO_GO_DECISION=GO_LIMITED_COMPARABLE_COLLECTION` with strategy A.

This decision means only that a future, separately authorized, low-credit
main-search collection could produce limited qualitative comparison inputs if
every session passes the frozen thresholds. It does not authorize calls and
does not make the current T3 sample eligible. Full decision replay, full blind
judgment and Golden candidacy still require strategy C or D after independent
source, matching, cost and legal qualification.

No operational literal exists, no network authorization is granted, Stage
REMAINING stays unauthorized, and Golden admission remains manual and off.
