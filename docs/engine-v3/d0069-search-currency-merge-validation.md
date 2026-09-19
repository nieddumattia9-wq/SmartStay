# D-0069 / R07 — Currency-bound merge validation

## Before and after

The initial Windows PowerShell 5.1 regression failed (0 PASS / 1 FAIL) on
`7d3fe511881da58b7055c75d7c86227ff7cafff4`. Synthetic observations from the same
property, 600 EUR and 500 USD, produced 600 EUR forward and 500 USD reversed,
even with EUR requested. The immutable synthetic receipt is
`tests/lifecycle/fixtures/d0069-r07-initial-counterexample.json`.
Raw initial test output is retained outside the repository.

The cause was twofold: `mergeHotelRecords` inferred currency from the first
record, and `createCommercialData` fell back to that record when comparison
failed. Single records bypassed the comparison. The repaired path explicitly
selects in search currency and exposes non-selection without fallback.

## Actual callers and scope

- `server/providers/liteApi/liteApiAdapter.js`: preliminary and enriched merges
  use `providerInput.currency`, not the response's preferred/first currency.
- `server/providers/routeStack/routeStackAdapter.js`: common result builder for
  initial and continuation requests uses the request currency, including its
  existing EUR request default. This is not inferred from offer observations.
- `server/providers/common/commercialSummary.js`: bounded display selection,
  explicit absence states, exact observation retention and stable binding.
- `server/providers/common/hotelMergeService.js`: carries context through merges
  and applies the same check to singleton records. Review/location logic is
  unchanged. Exact JSON duplicates collapse; differing observations survive.
- `server/presenters/publicHotelPresenter.js`: public status and linked public
  offer ID; no invented zero/EUR for an unavailable explicit summary.
- `tests/lifecycle/hotelMergeCurrency.test.mjs` and synthetic initial receipt.
- This report, D-0069, CURRENT_STATE and append-only DECISION_LOG.

Session stores retain provider-normalized hotel records; they do not run another
cross-currency summary comparator. No session migration or historical rewrite
is introduced. The direct review-count test caller may omit currency: review
provenance still merges, but an absent commercial context is now explicit.

## Measured validation

Final targeted implementation: 19/19 synthetic tests PASS locally. Includes
all permutations of EUR/USD/JPY observations, CHF ties, context absence,
incomplete and disagreeing records, preserved inputs, public offer coherence,
real LiteAPI/RouteStack mappers/adapters and RouteStack continuation. Provider
transport is simulated; no real provider request or private evidence is used.
An additional pre-fix test found that two snapshots with the same opaque ID and
known cost but different displayed prices share the existing public offer ID.
The regression failed (two matches, expected one); an additive SHA-256 observation
binding now identifies the exact selected snapshot. The existing booking ID and
its ambiguity-rejection behavior are unchanged. This does not broaden A01/A02.
Official gates ran in real Windows PowerShell 5.1 on clean isolated candidate
`0e9742206b9c75e9586c61097b4fca8ac2ef6978`, parent equal to the source checkpoint,
with only the 11 declared files and unchanged installed dependencies copied
offline. Excluded developer files and private materials were not available to
the tests. Executable/test SHA-256 values are frozen in the external validation
inventory and rechecked before publication; only this measured documentation
is finalized after the gates.

| Local check | Observed result |
| --- | --- |
| R07 through Windows PowerShell 5.1 | 19/19 PASS |
| Exact `npm run release:ci` | PASS, exit 0 |
| Engine V2 / Engine V3 | 226/226 / 3154/3154 PASS |
| Lifecycle | 665 PASS, 17 existing explicit opt-in Valkey SKIP, 0 FAIL |
| Security / release | 29/29 / 101/101 PASS |
| Analytics / capacity / beta | 31/31 / 9/9 / 4/4 PASS |
| TypeScript / build / analytics-beta gate | PASS |
| Separate exact `npm run audit:security` | PASS; zero vulnerabilities in both canonical scopes |
| Local staging-runtime smoke | PASS |
| Windows PowerShell 5.1 parsing | 17/17 PASS |
| Release manifest creation / verification, explicit candidate SHA | PASS |

The earlier 18-test candidate was superseded by the observation-binding
regression; its interrupted full gate is not counted as PASS. The final complete
gate above covers the actual executable/test candidate. Results are local,
not GitHub CI. No assertion was weakened to obtain PASS.

## Limits and product effect

This is a display-summary correction, not ranking, a best-purchase-provider
decision, certified complete cost, availability or freshness. Known cost remains
known cost. Ties use canonical observation order solely to bind a reproducible
representative; all variants remain available for downstream qualification.
Real contradictions in retained offers are not silently reconciled.

The provider mapper still defines which observations reach this common merge.
This change proves no loss at the merge of those received observations; it does
not claim recovery of records an upstream mapper never emitted. Property merge
identity and opaque-ID public identity rules are unchanged (A01/A02 out of scope).
Mixed currencies with no requested-currency offer remain non-comparable; no FX
or invented public selling price is introduced.

The public integration proof reaches the actual adapter, mapper, merge and
sanitized API presenter. It is not a new browser/UI visual certification.
Downstream legacy offer selectors and recommendation policies are not rewritten;
the new summary is explicit API data, not authority to select across currencies
in those independent consumers.

Only local Windows results can be claimed here. Push status, final local/remote
SHA and pending commits must be obtained by direct remote readback at delivery.
