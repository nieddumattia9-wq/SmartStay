# D-0075 R1 — authenticated time reference for the independent shadow

2026-09-22. Base `01d1ccfc02f70115860a6fbbf496457cd9c9de4a`.
Evaluation-only; the independent A02 compatibility consumer, not the intent
role-policy, public V3, full robustness/regret or Golden admission.

## Reproduced before correction

Three invented properties enter `authenticatedComparisonFixture`. Before
registration, SEARCH has `rates=[]` on the first property's sole offer. The
authenticated preparation retains all three records and qualifies two properties.
With the excluded record first, Execute reports
`EXECUTED_BUT_BINDING_OR_SAFETY_FAILED` and `Cannot read properties of null
(reading 'time')`. Its reported `shadowRuns=1` contradicts the spy's zero calls;
V3 constructions=1, binding creations=1, replay verifications=0.
With the same record last, the real shadow succeeds: V2=1, V3 constructions=3,
binding=1, shadow=1, replay=1. Choice is the same invented qualified property.
The initial three regression tests produce 1 PASS / 2 FAIL (exit 1).
`tests/engine-v3/fixtures/authenticatedComparisonR1InitialEvidence.json` retains
this initial result, separately from the corrected result.

## Narrow repair

`executeAuthenticatedCommercialV3` takes the segment reference from the actual
decision input's `bookingReferenceAt`. The existing authenticated projection
derives it from the authenticated journal's terminal evaluation time; it is not
the wall clock or the first provider observation. Before binding/shadow, the
executor uses the shared explicit-instant parser and exact comparator to check:

- reference and check-in date segment boundary are interpretable;
- runtime reference equals the projected reference;
- every qualified observed/verified fact has that same evaluation instant;
- runtime check-in remains the authenticated scenario's date.

Missing/invalid/unknown-offset references fail explicitly with
`AUTHENTICATED_SEGMENT_TIME_INVALID`; disagreement fails with
`AUTHENTICATED_SEGMENT_TIME_MISMATCH`. These are failures after the measured
initial decision construction, not a manufactured policy abstention.

The historical UTC-date segment convention is retained. It does not assert an
actual check-in hour. Integer-second cutoffs against the floor-second of the
reference preserve the segment boundary even with fractional timestamps; the
identity comparison still preserves all significant fractional digits. No
provider expiry, freshness renewal or `Date.now()` fallback is introduced.

Arguments/segment and binding are prepared before `shadowRuns` increments,
immediately before the real shadow call. Pre-call rejection records zero shadow
and replay calls; an invoked shadow that throws still counts as one invocation.

All alternatives, original hashes, exclusions and the full-set binding remain.
Reordering raw bytes changes provenance fingerprints legitimately, but the same
qualified facts produce the same input, decision, choice and segment. No legacy
validator, historical matrix, receipt, inventory or operational plan is migrated.

## Regression and validation scope

Eight new tests traverse authenticated synthetic preparation and actual Execute,
including both orders, entire bound-set retention, exact decision equality,
actual shadow/replay, invalid/substituted frontend reference and a throwing
shadow. Spies count calls rather than accepting the reported counter on trust.
The original complete-control test remains unchanged.

Targeted corrected run: 8/8 PASS on Windows. Final isolated candidate
`9c4d0302417ce25d5ae9f68cb022b99fd6c759cd` runs the exact canonical
`npm.cmd run release:ci` under Windows PowerShell 5.1.26100.9444 / Node 24.18.0:

| Local gate | Result |
|---|---|
| release:ci | exit 0 |
| V2 / V3 | 242/242 / 3397/3397 PASS; no skips |
| R1 / original D-0075 authenticated comparison tests | 8/8 / 41/41 PASS, included in V3 |
| Lifecycle | 665 PASS; 17 existing explicit opt-in Valkey skips |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript / build / analytics-beta gate | PASS |
| Dependency audit / local runtime smoke | PASS |

The full V3 suite includes actual PS5.1/DPAPI execution with invented captures,
the unchanged complete control and the separate authenticated CLI/replay path.
No stale gate result substitutes for the changed executor's final tests.
Only reporting Markdown follows these gates; software/test hashes are checked
against the isolated candidate before publication. No result is attributed to
GitHub CI. No real credential, capture, acquisition or private decision is used.
External activity is limited to canonical dependency audits and authorized Git
synchronization; no provider request. Initial failures remain separately retained.

## Exact publication scope

1. `src/engine-v3/evaluation/executeAuthenticatedCommercialV3.ts`
2. `tests/engine-v3/v3AuthenticatedCommercialTimeReference.test.ts`
3. `tests/engine-v3/fixtures/authenticatedComparisonR1InitialEvidence.json`
4. `docs/stayopti/decisions/0075-r1-authenticated-time-reference.md`
5. `docs/stayopti/CURRENT_STATE.md`
6. `docs/stayopti/DECISION_LOG.md`

Production remains HOLD. Acquisition authority, a real execution, provider
credentials and external commercial prerequisites are outside this correction.
Main, 25 protected files and unrelated changes remain protected. Selective
work-branch commit/push requires passing validation and direct remote readback;
actual synchronization and any remaining local commits are reported at delivery.
