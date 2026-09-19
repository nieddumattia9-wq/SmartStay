# D-0067 — R01/R03/R04/R05 integration and Windows validation

Source checkpoint: `c5aa86615a344ff5cfe31e7c75fb6635f5395da8`.
Work branch: `codex/evaluation-d0036-d0041`.
Status: final integration validated locally on Windows; selective work-branch
consolidation authorized. GitHub CI success is not presumed.

## Scope and authority

The supplied candidate repairs public factual boundaries, not V3 policy:
Rates response classification, amenity assertion/cost semantics, opaque offer
identity and numeric absence. The explicit user instruction authorizes this
integration and selective work-branch publication after Windows gates. It does
not authorize main promotion, deployment, provider requests or private replay.
Corrected facts can change evaluations; no ranking weight or role is tuned to
preserve an outcome based on a previously false fact.

The immutable supplied archive SHA-256 is
`44a7f63429eddb3321f7cadb1ebf4e7ec516242060ce1b81ab6c1b2d2a998d1a`.
Its patch SHA-256 is
`7b7e685988aa875a7f8220a2dbadb8dac1ebb17b5f5684d15bd5f858468bb16c`.
All 58 internal checksums and 14 candidate hashes matched. Git base blobs
matched the manifest; the actual checkout has not advanced beyond that base.
The supplied Linux runtime evidence is retained, not called Windows proof.

## Review amendments

The initial source review found public legacy mapper paths carrying nested
application errors outside the new classifier's traversal, and competing rate
wrappers that could hide nonempty records behind an empty first array. These
must fail as provider error/unknown format rather than imply no availability.
Auxiliary static hotel metadata is not a second Rates result or protocol error.

The amenity review found a representation mismatch: text normalization removes
hyphens while the air-conditioned presentation alias required one. Equivalent
positive forms must agree without promoting negated or conditional statements.
Initial synthetic counterexamples are retained outside the repository.

The first full official Windows pass found two further gate failures: security
28/29 because a fourth old transport stub was not a valid Rates envelope, and
V3 3026/3027 because the preexisting bed helper used an ASCII word boundary
after accented `disponibilità`. The security fixture now reaches the same
801-record/80-delivered capacity assertions with a recognized envelope. The
bounded token-boundary repair preserves the existing LSI09 assertion; HD23
retains the historical extraction hash, allowing only that exact documented
delta. No test is skipped or weakened to hide either failure.

The initial isolated clone belonged to the sandbox identity; CurrentUser Git
refused it before any gate ran. A new clean CurrentUser-owned clone resolved
that environment issue without adding a safe.directory exception.

## Final Windows validation and limits

Canonical Windows PowerShell 5.1 runs: full Engine V2/V3, lifecycle, TypeScript
and build, plus the local security/release/analytics/capacity/beta boundaries.
The exact `audit:security` and `release:ci` commands required by D-0035 are also
run, with npm registry audit traffic distinguished from zero provider calls.
The candidate is an isolated committed local clone with only explicit software
scope, no ignored credentials and no preexisting developer-only files. Fixture
providers are synthetic; no acquisition, prebook or private engine run occurs.
Final isolated test commit: `d11ec2cde93583f72d16723b74d3fc103cf0114c`, parent
equal to the source checkpoint. This disposable local commit is not the
publication SHA. Source/test byte hashes are verified unchanged when staging;
only the four phase documents are finalized after the measured gates.

Environment: Windows CurrentUser, PowerShell 5.1.26100.9444, Node 24.18.0,
npm 11.16.0. Existing dependencies were copied locally into a clean clone with
no excluded developer files or private environment configuration. No install,
lock refresh, test-only source substitution or assertion bypass was used.

| Exact command/check | Observed final result |
| --- | --- |
| `npm.cmd run release:ci` | PASS, exit 0; full canonical sequence |
| `npm.cmd run audit:security` | PASS, exit 0; root all dependencies and server production each report zero vulnerabilities |
| Engine V2 (canonical runner) | 226/226 PASS, 0 SKIP |
| Engine V3 (canonical runner) | 3042/3042 PASS, 0 SKIP |
| Lifecycle | 618 PASS, 17 explicitly configured Valkey integration SKIP, 0 FAIL |
| Security / release | 29/29 and 101/101 PASS |
| Analytics / capacity contract / beta | 31/31, 9/9, 4/4 PASS |
| TypeScript / build / analytics measurement gate | PASS |
| Local staging smoke | PASS, 18 checks; no live provider |
| All tracked PowerShell scripts parsed with 5.1 | 17/17 PASS |
| Local release-candidate creation and verification | PASS, bound to the isolated candidate SHA |
| Synthetic browser presentation | PASS: conditions accessible, cost unknown distinct from paid/free, hyphenated positive alias conserved |

Targeted review evidence: 88/88 Rates/identity boundary checks, 30/30 service
checks and 215/215 bed/room/semantic-integrity regressions PASS. These overlap
the full suites and must not be added as distinct coverage. First failures are
retained: the UI alias probe 28/30 before its repair; original LSI09 4/5; first
official V3 3026/3027 and security 28/29. The published tests retain the existing
assertions and add 15 scoped bed-token cases. The supplied Linux counts remain
historical supporting evidence, not a replacement for these Windows results.

The 17 Valkey skips are the existing suite's opt-in distributed integration
tests: no Valkey test endpoint was configured and none of those modules changed.
This is not proof of real distributed infrastructure. Npm registry audits and
authorized Git remote operations are distinct from zero provider calls.
No GitHub workflow success, production readiness, acquisition or private replay
is asserted by these local gates.

The amenity grammar is intentionally bounded. Unsupported prose remains visible
and uncertain. Legacy offer tokens resolve only when unambiguous; exact original
provider bytes are not claimed beyond the canonical offer identity boundary.
Other audit lots and general private/commercial qualification remain separate.

## Exact consolidation scope (21 paths)

Sources (10):

- `scripts/liteapi-bed-description-v1.mjs`
- `server/mappers/hotelMapper.js`
- `server/providers/liteApi/liteApiAdapter.js`
- `server/providers/liteApi/liteApiProvider.js`
- `server/providers/liteApi/liteApiRatesResponse.js`
- `server/services/bookingOfferIntegrityService.js`
- `src/components/HotelDetailsPanel/HotelDetailsPanel.tsx`
- `src/engine-v2/evidence/hotelEvidenceModel.ts`
- `src/utils/amenityEvidence.ts`
- `src/utils/hotelDetailsPresentation.ts`

Tests (7):

- `tests/engine-v2/providerHotelTypeIntegrationV2.test.ts`
- `tests/engine-v2/semanticAmenityFactsV2.test.ts`
- `tests/engine-v3/v3RoomDescriptionBedInventory.test.ts`
- `tests/engine-v3/v3LiteApiHotelDetailPlanAndComparison.test.ts`
- `tests/lifecycle/semanticBoundaryIntegrity.test.mjs`
- `tests/lifecycle/semanticRatesEnvelopes.test.mjs`
- `tests/security/securityAbuseCapacityGate.test.mjs`

Documentation (4): this report, `docs/stayopti/decisions/0067-public-semantic-boundaries.md`,
`docs/stayopti/CURRENT_STATE.md`, and append-only `docs/stayopti/DECISION_LOG.md`.

The seven excluded paths, 17 sealed files and additional preexisting private
HTML remain byte-identical, with size and mtime checked. No source outside
this scope changes. No acquisition output, private fixture, screenshot, ZIP,
credential, package/lockfile or historical manifest is included.

## Synchronization

The gate condition for selective commit and non-force work-branch push is met.
The completion receipt must record actual local/remote SHA, push status,
remaining local commits and empty final staging after direct `ls-remote` checks.
This report cannot self-contain its own commit SHA and never substitutes stale
tracking refs for direct remote verification. Main and deployment remain out
of scope; no synthetic validation commit is to be published.
