# D-0066 — Details-only enrichment, not a new commercial search

Base: `2005caed11a469ada3b00658a786a1d412278f51`.
Work branch: `codex/evaluation-d0036-d0041`. No acquisition in software validation.

## Components and invariants

| Responsibility | Implementation |
|---|---|
| Versioned plan, source-bound targets, checkpoint inventory and authorization | `scripts/liteapi-hotel-detail-plan-v1.mjs` |
| Authenticate completed coverage originals; retain all offer variants; pure mapped-room comparison | `scripts/liteapi-room-detail-comparison-v1.mjs` |
| Unchanged D-0065 clause interpretation, reusable without engine imports | `scripts/liteapi-bed-description-v1.mjs` |
| Fixed MAX5 journal wrapper | `scripts/liteapi-hotel-details-journal-v1.mjs` |
| Shared durable journal and bounded HTTP primitives | `scripts/bounded-acquisition-journal-core-v1.mjs`, `scripts/bounded-acquisition-http-v1.mjs` |
| Serial transport and authenticated original reading | `scripts/liteapi-hotel-details-capture-v1.mjs` |
| Inventory / Preflight / Simulate / Acquire | `scripts/run-liteapi-hotel-detail-enrichment.mjs` |
| Windows PowerShell 5.1 and shared protected prompt | `scripts/invoke-liteapi-hotel-detail-enrichment.ps1`, `scripts/invoke-liteapi-profile-runner.ps1` |

Legacy MAX17 retains its version, format, root and limits through a thin wrapper.
MAX3 uses the extracted HTTP primitive and shared prompt without widening its
capabilities. Their historical inventories are intentionally not rewritten;
a changed software closure does not authorize replay of consumed cases.

The production plan is derived from authenticated original requests/responses,
not a manually asserted list. It binds exact file hashes, final journal hash,
source checkpoint, scenario, every offer/rate, mapped room and observation time.
The new case cannot equal the source case. One sorted exact hotel list is sealed
before responses. Case-specific names, dates, identifiers and account evidence
are private configuration, not values embedded in the mechanism or test fixture.

The execution profile permits only up to five planned hotel-detail GETs. It
forbids search, facilities, prebook and booking operations even through altered
configuration. Reservation precedes sending; persistent exclusive markers and
authenticated records prohibit a sixth attempt, duplicate start or restart
after interruption. Checks apply to source, current code, configuration and
inventory, with no automatic rebinding to changed bytes.

## Documented provider boundary

[Get hotel details](https://docs.liteapi.travel/reference/get_data-hotel) documents
an opaque string hotelId, optional language and provider timeout in seconds,
default four. The profile explicitly uses that default; it does not import the
Rates timeout or infer undocumented endpoint bounds. Client timeout is twenty
seconds, pacing at least one second, concurrency one and response limit32MiB.
No retries, redirect following or pagination occur.

[Room details](https://docs.liteapi.travel/docs/room-details) links a rate's
mappedRoomId to `data.rooms[].id`. The exact original identifier is retained;
only the documented JSON integer/string representation is compared. Supplier
rate denomination and static room denomination remain separate sources.
AND, OR and undocumented/complex bed relations are not conflated. Capacity,
adult/child maxima, bedrooms, explicit bed types/counts and assigned places are
separate facts. Extra unrecognized clauses are retained, not discarded to
manufacture a compatible inventory.

[Standard API costs](https://docs.liteapi.travel/reference/api-pricing-usage-costs)
describe hotel-content access under the applicable standard terms. The approved
zero-euro usage ceiling is not an independent check of a private account or an
authorization to change its configuration. The old markup investigation is not
repeated and SSP arithmetic is not a prerequisite for this room-only operation.

## Pure result and limits

`compareHotelDetailCapture` distinguishes collection status, room existence and
compatibility that can actually be assessed. It retains all source offers,
missing room details, discordant duplicates, error records, unsupported bed
qualifiers and alternative assignments. Equivalent duplicate records can be
counted without being turned into extra rooms. Missing data stays in its field.

Rate and detail timestamps remain independent. Neither a successful GET nor a
matching room updates availability, price or provider expiry, proves the
historical room assignment or certifies bookability. No kernel/policy import or
invocation belongs to the new execution path. Comparison is private, not a
recommendation or Golden admission.

## Validation and publication

The final isolated candidate passed **380/380**, zero failures/skips. It was
exported from the base commit, overlaid only with the 26 explicit phase paths,
and compiled without the excluded developer files. Tests use invented
independent scenarios and exact
synthetic raw responses; no private commercial identifiers or observations are
copied into fixtures. The actual Windows PowerShell5.1/CurrentUser DPAPI path
is checked separately from pure portable tests. Local checks are not GitHub CI.

| Measured check | Result |
|---|---|
| New plan/source/comparison tests | 49/49 |
| New journal/transport tests | 41/41 |
| New actual PS5.1 launcher tests | 7/7 |
| Legacy MAX17 journal and boundary | 53/53 |
| MAX3 plan, arm-limit and classification regressions | 91/91 |
| Legacy actual MAX3 launcher | 15/15 |
| Legacy actual MAX17 launcher | 13/13 |
| Unchanged D-0065 interpretation regressions | 111/111 |
| Canonical `tsconfig.tests.json` compilation | exit0 |
| `npm.cmd run typecheck`, `npm.cmd run build` | exit0 / exit0 |
| Windows PowerShell5.1 Desktop parsing, five relevant scripts | 5/5 |
| Provider / kernel / policy invocations | 0 / 0 / 0 |

The eight measured Node invocations execute the compiled corresponding test
files under the isolated candidate, using its local installed dependencies.
Only owned synthetic temporary cases are created/removed. Actual20s timeout,
32MiB boundary, before-send reservation, crash, double start, changed files,
protected prompt ordering and authenticated CurrentUser reopening are covered.
The key prompt test uses invented SecureString input and a synthetic child;
it is not a real account or production-acquisition test.

A development counterexample found that invalid individual capacity limits
could look like documented violations. The initial1PASS/3FAIL and source hash
are retained in `d0066-mapped-capacity-initial-v1.json`; malformed limits now
remain field-specific UNKNOWN and do not certify full comparison. No historical
test was rewritten. Other initial failures were sandbox `realpath` permission
limits, resolved by running the same synthetic Windows checks in the authorized
CurrentUser context, not by weakening filesystem controls. A test-only TypeScript
annotation issue was corrected before final compilation. Review also tightened
single-buffer hash/parse and before-send operational-file checks.

The extracted D-0065 clause function is byte-identical to the base:
SHA-256 `89bd8124661b83555f3dfcae37a755befb94ce24f4e9d9d1bbfa7716989bb124`.
No complete unrelated engine suite is claimed or needed for this transport/pure
comparison change. Compilation of those sources is not engine execution.

### Selective publication inventory — 26 paths

- `scripts/bounded-acquisition-http-v1.mjs`
- `scripts/bounded-acquisition-journal-core-v1.mjs`
- `scripts/liteapi-acquisition-journal-v1.mjs`
- `scripts/liteapi-controlled-capture-v1.mjs`
- `scripts/liteapi-search-coverage-capture-v1.mjs`
- `scripts/liteapi-search-coverage-plan-v1.mjs`
- `scripts/invoke-liteapi-search-coverage.ps1`
- `scripts/invoke-liteapi-profile-runner.ps1`
- `scripts/liteapi-observation-diagnostic-v1.mjs`
- `scripts/liteapi-bed-description-v1.mjs`
- `scripts/liteapi-hotel-detail-plan-v1.mjs`
- `scripts/liteapi-room-detail-comparison-v1.mjs`
- `scripts/liteapi-hotel-details-journal-v1.mjs`
- `scripts/liteapi-hotel-details-capture-v1.mjs`
- `scripts/run-liteapi-hotel-detail-enrichment.mjs`
- `scripts/invoke-liteapi-hotel-detail-enrichment.ps1`
- `tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs`
- `tests/engine-v3/fixtures/d0066-mapped-capacity-initial-v1.json`
- `tests/engine-v3/v3LiteApiHotelDetailPlanAndComparison.test.ts`
- `tests/engine-v3/v3LiteApiHotelDetailsTransport.test.ts`
- `tests/engine-v3/v3LiteApiHotelDetailsLauncher.test.ts`
- `tests/engine-v3/v3LiteApiSearchCoverageLauncher.test.ts`
- `docs/stayopti/decisions/0066-bounded-hotel-detail-enrichment.md`
- `docs/engine-v3/d0066-hotel-detail-enrichment.md`
- `docs/stayopti/CURRENT_STATE.md`
- `docs/stayopti/DECISION_LOG.md`

Operational Inventory/Preflight must be generated on the final committed
checkpoint. A production Preflight authenticates existing coverage files but
does not construct a new store or create its directory/markers. It exercises
DPAPI only with invented bytes. Acquire requires the exact new literal and only
then a protected SecureString key prompt; no key in arguments, environment,
configuration or repository. The new custody uses AES-256-GCM with CurrentUser
DPAPI and fourteen-day retention; the user manages expiry with no automatic
deletion. Historical retention is not renewed.

Selective non-force publication is allowed only on the work branch. Main,
seven excluded paths, seventeen sealed files, previous private HTML, all
originals and consumed markers remain outside the modification scope.
