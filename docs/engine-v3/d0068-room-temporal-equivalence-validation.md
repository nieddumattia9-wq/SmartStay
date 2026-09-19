# D-0068 — R02/R06 Windows validation

Source: `f03b83d0b403e1b8bd82c92606d9855df7133db2`.
Branch: `codex/evaluation-d0036-d0041`.

## Boundary

Two corrections only: inert room-presentation interpretation with scoped
uncertainty, and explicit cancellation-instant comparison. R07/A01/A02 are not
part of this lot. All proofs use invented inputs. Original captures, private
data, sealed code and excluded developer files are not part of the candidate.

## Reproduced failures and correction

| Synthetic observation | Before | Corrected behavior |
| --- | --- | --- |
| Plain explicit inventory with an accessory request | Two observations assessable | Same control remains assessable |
| The same description inside common attribute-bearing HTML or a list | Zero assessable; sleeping UNKNOWN | Same bed facts and sufficiency as plain text |
| Explicit inventory inside inline markup in the rate name | Zero assessable | Same result as the corresponding plain rate name |
| `Iron; on request` beside documented beds | Sleeping UNKNOWN | Accessory qualification remains visible, does not cancel bed sufficiency |
| Beds themselves on request inside HTML | Not certified | Still not certified |
| The same room duplicated using equivalent plain/HTML text | False duplicate conflict | Equivalent observations, all originals retained |
| `12:00Z` versus `13:00+01:00` on the same day | False commercial conflict; synthetic policy abstained | Same instant; complete synthetic control usable |
| Different second, changed penalty, absent/invalid zone | Conflict or insufficient interpretation | Remains different or uncertain; no false equivalence |

The initial R02 probe had 2 PASS / 4 FAIL. Its input strings, base code hashes
and observed outcomes remain in `tests/engine-v3/fixtures/d0068-r02-initial-v1.json`.
The initial R06 probe had 3 PASS / 2 FAIL through both supported diagnostic wire
profiles, with one kernel and one policy invocation per case. Its compact record
is `tests/engine-v3/fixtures/d0068-r06-initial-counterexamples.json`; full synthetic
inputs/results and logs are retained outside the repository. Public backend and
the actual extracted UI comparison also reproduced the false deadline change.
Intermediate newline and duplicate-presentation counterexamples were reproduced
during review and covered without weakening historical assertions.

## Responsibilities and preserved semantics

`interpretRoomPresentation` is provider/scenario independent and non-executable:
it handles bounded balanced common inline/block tags, inert attributes and
supported entities, retaining exact original text and UTF-16 source spans.
Unknown, active or malformed markup stays uncertain. CSS does not hide contrary
text. Plain LF/CRLF separates clauses; whitespace inside formatted HTML source
does not invent a clause boundary. Attribute values never supply bed facts.

`qualifyMappedBedConditions` keeps qualifications attached to the original field
and subject. A narrowly identifiable accessory can scope a following qualification;
it does not create a verified service-availability fact. Bed negations, conditions,
unknown places and OR alternatives remain effective. The historical bed parser
body is unchanged. `compareHotelDetailCapture` uses the same presentation logic
for rate and mapped-room text. Duplicate equivalence compares all supported text,
not merely favorable bed tokens, and retains every matched original/pointer.

`parseExplicitInstant` validates a bounded ISO calendar form with an explicit
`Z` or `+/-HH:MM` offset. Calendar errors, local-only times, named zones and
`-00:00` do not receive an equivalence certificate. Fractional precision is kept;
distinct sub-millisecond instants are not rounded together. Identical unparsed
representations keep the previous no-change behavior but remain uninterpretable.

Only the cancellation deadline participates in temporal equivalence. The
evaluation adapter compares `cancelPolicyInfos[].cancelTime`; backend and UI
compare `freeCancellationUntil`. Raw values, opaque identity fingerprints,
amounts, currencies, penalties and free-form policy prose are not rewritten.
The shared pure helper lives under `server/shared` so it is included in the
existing backend release-file closure, as well as compiled into the UI bundle.
No ranking, weights, recommendation role or V3 activation policy changes.

## Targeted Windows evidence

The actual Windows PowerShell 5.1 process compiled the canonical test configuration
and ran the compiled relevant tests. Targeted results on the final executable files:

- R02: 306/306 PASS, including 60 new tests and 246 relevant existing tests.
- R06 diagnostic: 52/52 PASS; 11 synthetic kernel/policy executions in that program.
- Public cancellation/service/UI/identity group: 43/43 PASS.
- Zero skips in those targeted runs; no provider calls or private inputs.

The tests cover another invented scenario, representation changes, exact originals,
unknown markup, negations split across tags/entities, ancillary versus main-bed
conditions, duplication/order, equal offsets, real time/term differences, invalid
calendar values and precision. The actual public mapper already canonicalizes
supported offset variants and its generated prose: a regression checks that path
rather than inventing a free-text policy interpreter.

## Official isolated Windows gates

The clean committed candidate is `bcdb060c5ee20bae2b8f7785478ec38162f99885`,
parent `f03b83d0b403e1b8bd82c92606d9855df7133db2`. It has local Git history and
the 21 explicit phase paths, without excluded pilot files or private environment.
Dependencies were copied locally without install or provider access. Node
24.18.0, npm 11.16.0, Windows PowerShell 5.1.26100.9444.

Exact `npm run release:ci` PASS, exit 0, 2026-09-19 09:18:52Z–09:22:23Z.
The separately required exact `npm run audit:security` also PASS, exit 0.
All commands ran in Windows PowerShell 5.1; these are local, not GitHub CI results.

| Official gate within release:ci | Observed result |
| --- | --- |
| TypeScript | PASS |
| Engine V2 | 226/226 PASS |
| Engine V3 | 3154/3154 PASS, zero skip |
| Lifecycle | 646 PASS, 17 explicit existing Valkey integration SKIP, zero fail |
| Security | 29/29 PASS |
| Release contract | 101/101 PASS |
| Analytics | 31/31 PASS |
| Capacity contract | 9/9 PASS |
| Beta | 4/4 PASS |
| Analytics-beta measurement gate | PASS |
| Build | PASS |
| Dependency audit, both canonical scopes | PASS, zero vulnerabilities |
| Local staging smoke | PASS, 18 checks |

The 17 opt-in Valkey integration tests were not run without their endpoint;
they are not represented as passing or replaced by a narrower command. No new
skip or weakened assertion was introduced. Additional PS5.1 parsing passed
17/17 tracked scripts. Release-manifest creation and verification passed for
the same explicit isolated SHA. Its backend file list includes the temporal
helper with SHA-256 `75db76600e2d9bf59e9f5dbbec2ab98cdbb9aad3b032975b9da5f4db0bc30728`.

All executable/test files in the publication candidate are checked byte-for-byte
against the tested inventory. Only these documentation receipts were finalized
after the gates. The original 7 excluded paths, 17 sealed files and additional
private HTML retained hashes, sizes and timestamps; all other out-of-scope tracked
files were checked unchanged. Secret/private-artifact and staged/unstaged
whitespace checks are required again before selective commit. No package file,
lockfile, historical inventory or private acquisition is included in the scope.

## Remaining limits

This is not an HTML browser, universal NLP grammar, historical reprocessing or
certification of assigned beds, price completeness or bookability. Unsupported
markup and ambiguous bed qualifications remain explicit. No CSS visibility is
certified. Genuine source discrepancies continue to be reported.

Arbitrary cancellation prose is still compared exactly. The pre-existing public
mapper's own permissive date parsing/precision behavior is not rewritten by this
comparison fix; this lot proves valid explicit forms and rejects unsupported
forms at the comparison boundary, not a general audit of every upstream parser.
R07, A01 and A02 remain separate work. No private acquisition was reopened or
decrypted, no historical inventory regenerated, no real engine run performed.

## Explicit publication scope

- `scripts/room-presentation-text-v1.mjs`
- `scripts/liteapi-mapped-bed-conditions-v1.mjs`
- `scripts/liteapi-room-detail-comparison-v1.mjs`
- `scripts/liteapi-cancellation-comparison-v1.mjs`
- `scripts/liteapi-offer-qualification-v1.mjs`
- `scripts/liteapi-observation-diagnostic-v1.mjs`
- `server/shared/explicit-instant.mjs`
- `server/shared/explicit-instant.d.mts`
- `server/services/bookingOfferIntegrityService.js`
- `src/utils/bookingOfferComparison.ts`
- `src/components/HotelDetailsPanel/HotelDetailsPanel.tsx`
- `tests/engine-v3/v3RoomPresentationEquivalence.test.ts`
- `tests/engine-v3/v3CancellationInstantEquivalence.test.ts`
- `tests/engine-v3/fixtures/d0068-r02-initial-v1.json`
- `tests/engine-v3/fixtures/d0068-r06-initial-counterexamples.json`
- `tests/lifecycle/cancellationInstantComparison.test.mjs`
- `tests/lifecycle/bookingOfferRecheckContract.test.mjs`
- `docs/stayopti/decisions/0068-room-presentation-and-cancellation-instants.md`
- `docs/stayopti/CURRENT_STATE.md`
- `docs/stayopti/DECISION_LOG.md`
- `docs/engine-v3/d0068-room-temporal-equivalence-validation.md`

## Publication boundary

No deployment, main update or real provider call is authorized. The final delivery
reports the selective commit, directly observed remote SHA and any local commits
still pending. Synthetic validation commits are never pushed. Historical
inventories and approvals are not regenerated for this new checkpoint.
