# D-0065 — Bounded room-description parsing

Base: `72ff17d818b351c5ef6062b250cafb3b421c9fc3`.
Branch: `codex/evaluation-d0036-d0041`. Evaluation-only, synthetic verification.

## Before and after

| Synthetic description | Original result | Intended bounded interpretation |
|---|---|---|
| SUITE TWO DOUBLE BEDS | UNKNOWN | Two double beds, documented lower bound four |
| Deluxe Room - 3 single beds | UNKNOWN | Three single beds, lower bound three |
| Studio with one queen bed and two twin beds | UNKNOWN | One queen and two twins, lower bound four |
| 2 king beds - Executive Suite | UNKNOWN | Two kings, lower bound four |
| Suite: two double beds OR four single beds | UNKNOWN, branches lost | UNKNOWN assignment, two preserved alternative inventories |
| KING TWO BEDROOM SUITE | UNKNOWN | Still UNKNOWN; bedrooms do not count beds |
| FAMILY 4 PAX | UNKNOWN | Still UNKNOWN; occupancy does not count beds |
| SUITE TWO DOUBLE BEDS on request | UNKNOWN | Still UNKNOWN; request is not a guarantee |

The initial pure-preparation regression failed **5/8**, with the three negative
controls passing. Original source/test/log hashes and per-case observations are
preserved in `tests/engine-v3/fixtures/d0065-room-description-initial-regressions.json`.
No historical fixture was rewritten to conceal the failure.

## Supported boundary and provenance

`qualifyEnglishRoomDescriptionBeds` introduces
`stayopti.room-description-bed-inventory@1`; the fresh-observation adapter becomes
`stayopti.liteapi-fresh-observation-diagnostic@1.3`. Existing stored results are
not relabelled. The strict `normalizeEnglishBedInventory` and mapped-room
comparison remain separate.

The bounded denomination is room, suite, studio or apartment, optionally
preceded by up to three recognized descriptors: standard, superior, deluxe,
executive, family, junior, classic, premium, economy or basic. Supported forms
place an explicit bed inventory before/after that denomination with a recognized
separator, or inside balanced parentheses following it. Unknown surrounding
words are not discarded. The denomination itself is not accommodation evidence.
Every OR branch in a surrounding-denomination form must include an explicit
bed noun: `one king suite` counts no beds. Legacy whole-inventory shorthand
remains accepted by the unchanged strict normalizer.

The trace retains full original description and clauses, exact interpreted
substring/offsets, surrounding text, unsupported text and explicit limits.
AND preserves counts; OR preserves separate assignments rather than adding
them. Sofa/bunk counts alone do not invent places per bed. Missing details,
capacity conflicts and strict mapped bed-type parsing remain effective.
Subjectless qualifications immediately before/after an inventory remain
uncertainty, including unsupported tails; explicit unrelated subjects such as
breakfast are not rebound to the beds. Repeated semicolon assertions are not
added, and different semicolon inventories without a documented relation stay
UNKNOWN with both inventories visible. AND within one supported inventory
continues to combine its explicitly stated quantities.

## Validation

Final isolated candidate: **121/121 PASS**, comprising 111 new pure preparation
tests and ten selected existing pure regressions, with zero failures/skips.
The candidate was exported from the base commit, overlaid with only this
phase's explicit paths and compiled without excluded local developer files.
The new fixture mutates invented responses before their capture authentication;
it verifies source immutability and repeatable preparation, with no decision
output. An independent reviewer also checked eighteen pure cases.

| Check | Observed result |
|---|---|
| Canonical `tsconfig.tests.json` compilation to an external directory | exit0 |
| `v3RoomDescriptionBedInventory.test` | 111/111 PASS |
| Existing DW07/08/09/11/12/13/15 and CQ18 only | 10/10 PASS |
| `npm.cmd run typecheck` | exit0 |
| `npm.cmd run build` | exit0 |
| Kernel / policy / provider invocations | 0 / 0 / 0 |

Compilation uses the canonical local TypeScript compiler and test configuration,
then `{ "type": "commonjs" }` in the external compiled root. The focused Node
invocation runs the new compiled test and separately filters the existing
documentary/commercial files with
`--test-name-pattern=^(DW(?:07|08|09|11|12|13|15)|CQ18)\b`.
Unselected tests were not executed or claimed as passing. Full unrelated
decision suites are deliberately not run: this task forbids engine execution.
Typecheck/build used Windows PowerShell5.1 and locally installed dependencies,
without installation. These are local results, not GitHub CI.

Final source hashes (the Windows candidate bytes actually tested):

- qualifier: `007967a3664a5961fb1d8b7f5a28d65f9d81c96612c8a03ed52939972e080733`
- observation adapter: `b3b1653a506a1a1479e0b3e851c279b6ce11f4c7b0589d94b55dfb119702748a`
- new test: `167cc77194056345b51aacf691d5aa3ca183c220bcb59fac7fc08675ffa6818e`
- initial/development evidence: `d3bc81d000c48ba3de5bedbffb56f7e4b0ee818fb659e6ca0fc2282d5b41da87`

Targeted-test stdout SHA-256:
`1fbbcb677836c922392b13b6ba966589788235eb76448e87ce6f9921a7b5a264`.
Existing-pure-regression stdout SHA-256:
`2aff600b1cdd7b73d44e2856ada5f15136866cd6dfe332325382163c5b98c571`.
Only this report and state documentation were finalized after these checks;
executable and test hashes remain bound to that isolated candidate.

Independent review first found false positives in ordinary room denominations
with omitted bed nouns and in adjacent subjectless qualifications. Those
counterexamples, plus semicolon repetition/composition, were added before the
corresponding corrections. An earlier expansion also caught a signed count
being mistaken for a dash separator. Development failures are retained rather
than relabelled as successful validation.

## Publication inventory

Only eight paths belong to this phase:

- `scripts/liteapi-offer-qualification-v1.mjs`
- `scripts/liteapi-observation-diagnostic-v1.mjs`
- `tests/engine-v3/v3RoomDescriptionBedInventory.test.ts`
- `tests/engine-v3/fixtures/d0065-room-description-initial-regressions.json`
- `docs/stayopti/decisions/0065-bounded-room-description-beds.md`
- `docs/engine-v3/d0065-bounded-room-description-beds.md`
- `docs/stayopti/CURRENT_STATE.md`
- `docs/stayopti/DECISION_LOG.md`

## Remaining boundaries

Recognizing a description does not prove its consistency with the mapped room,
the quantity purchased, adequate accommodation, complete cost, current
bookability or a provider expiry. Such facts keep their independent source,
scope and uncertainty. No provider call, prebook or acquisition retry occurs.

Commercial analysis stays in a new private report, not this repository. No
private offer/account figures, originals, screenshots or derived inputs are
published. No markup, price, request configuration or historical inventory is
changed. The seven excluded paths, seventeen sealed files and preexisting
private HTML remain protected.

Publication is selective on the authorized evaluation branch only. Final
local/remote SHA, actual non-force push and remaining-local count are checked
and reported at delivery; this document does not infer them from test success.
