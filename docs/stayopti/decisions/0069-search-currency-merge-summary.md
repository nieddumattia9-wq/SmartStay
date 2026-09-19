# D-0069 — Search-currency-bound commercial merge summary

Date: 2026-09-19. Authorization: Mattia, rigidity audit R07 only.
Source: `7d3fe511881da58b7055c75d7c86227ff7cafff4`.

## Decision

A property display summary may compare monetary offers only in the explicit
search currency. It must not infer that currency from the first property record,
nor reuse that record's commercial values when no comparable offer exists.
LiteAPI's preliminary/final merge and RouteStack's initial/continuation merge
carry the currency actually sent by their existing request builder.

The common merge reports `search-currency-summary@1`: SELECTED,
SEARCH_CURRENCY_MISSING, SEARCH_CURRENCY_INVALID or NO_COMPARABLE_OFFER.
Non-selected summaries have no price, currency or linked offer, including for
single records. The requested currency remains separately visible. The public
presenter retains this distinction and binds a selected summary to a public
offer identifier rather than exposing a provider reference. An additive exact
observation fingerprint disambiguates retained snapshots with the same public
offer ID; this is not a new booking identity or authority to bypass an ambiguous
handoff.

Preserve incomplete and differing offer observations. Collapse only equivalent
JSON observations, not observations deemed less complete by a heuristic. Keep
opaque identifiers, conditions, original amounts/currencies and provenance.
The existing known-cost-then-price comparator is restricted to the requested
currency; stable canonical tie-breaking chooses a display representative only,
not recommendation merit, refund superiority or a recommendation role.

## Boundaries

No foreign exchange, guessed currency/price, tax-completeness certification,
commercial recheck or recommendation-policy change. Property identity matching,
A01 and A02 are not redesigned. Different currencies cannot be compared here.
Unknown/malformed prices remain visible as observations and are not comparable.
Upstream mapper limitations are not certified away by successful merging.

Historical evidence, inventories, private custody, developer work and sealed
files remain immutable. No provider requests, credentials, private decryption,
real engine run, acquisition, main promotion or deployment.

## Validation and consolidation

Preserve the failing synthetic counterexample before implementation. Validate
permutations, missing/unmatched currency, incomplete data, same-ID variants,
single/monocurrency records and the actual public adapter/mapper/presenter
paths with simulated transports. Run the official Windows release gates in
an isolated committed candidate and report actual local results, not CI claims.
See `../../engine-v3/d0069-search-currency-merge-validation.md`.

Only selective work-branch commit and non-force push are authorized after PASS.
Every completed software phase reports actual push status, remote SHA and
pending local commits; never infer synchronization from tests.
