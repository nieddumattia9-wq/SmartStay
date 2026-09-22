# D-0075 — Authenticated commercial comparison and MAX11

2026-09-22. Base `3c51454582ac935d9fff03defc77d35c2505137b`; authorized branch
`codex/evaluation-d0036-d0041`. Evaluation-only, invented captures and credentials.

## Decision and boundary

Add `stayopti.authenticated-commercial-facts@2`, a pure commercial set qualifier,
an issued preparation, a distinct bound and dispatch to the existing independent
A02 compatibility shadow. Historical A02 @1/@1.1, D-0073 matrices, receipts and
validators are unchanged. This does **not** execute the intent role-policy,
activate public V3, prove full robustness/regret, or admit a Golden case.

Before: authenticated provider observations could produce the historical matrix,
but not an issued A02 binding. Arbitrary objects or a changed origin cannot bridge
that boundary. After: the fixed reader authenticates the complete new journal
and original bytes before the fixed protocol adapter interprets them. A locator,
not caller-authored facts or a replaceable real verifier, enters preparation.
Internal frozen/WeakSet capabilities authorize projection/binding. Serialized
preparations are reports, not capabilities. Execute authenticates and prepares
again; it does not trust saved JSON as an issued preparation.

Two protocols are exercised: the documented LiteAPI wire shape and an invented
observation/attestation protocol with a distinct envelope and no session creation
or retrieval. The latter is allowed only on synthetic journals. Equivalent facts
produce equivalent choices; provenance/original hashes remain different. This
is a tested protocol boundary, not support for arbitrary real providers.

## Identity, qualification and time

- Provider offer IDs remain exact opaque strings. The existing decision DTO
  needs a routing alias: `offer-<24 SHA256 hex>`, derived from property/offer ID.
  It is explicitly a **local alias, not a provider revision**. Local observation
  identity, original SHA, providerVersion UNKNOWN, verification request/response,
  session ID and retrieval count remain separate.
- Exact authenticated request offerId, response identity/scope, room, occupancy,
  search-derived ages and known commercial terms establish the alternate
  observation-bound continuity. Unknown occupancy-index semantics, rate changes,
  room changes or contrary provider signals are not repaired by conversion.
- Public minimum/SSP, complete applicable cost, mapped-room capacity/beds, scoped
  family conditions, cancellation, meal and payment are consumed as eligibility
  gates, not decorative notes. Below SSP is not corrected with max(retail, SSP).
  Commissions never feed merit. Price deltas reuse the existing 0.02 tolerance.
- Complete verified information can resolve historically unknown coverage only
  when all known amounts/components/terms remain consistent. Observed facts are
  retained. A known price, payment, cancellation or room change blocks continuity.
- The bounded payment grammar accepts `Payment: pay now`, `Payment: pay later`
  or `Payment: mixed` as an entire semicolon/newline clause in offer-scoped terms.
  Unknown wording remains unknown; this is not a claim that production responses
  necessarily supply this field or prove payment timing.
- No normalized rating without a qualified scale. No coordinates, distance
  preference, provider expiry, family consent or sofa places are invented.
- A nonempty component list is retained but does not itself attest exhaustive
  coverage in this new adapter. The documented `taxesAndFees: null` meaning is
  supported in its specific schema, subject to contrary remarks/conditions.
  Missing/null/empty/list remain distinct. Other exhaustive representations need
  documented evidence and a separately tested semantic mapping, not a caller flag.
- Expiry uses the existing explicit-instant semantics, preserving significant
  fractional precision and rejecting unknown offset `-00:00`. Missing expiry
  remains UNKNOWN. Historical evaluation/booking-reference time is explicit;
  later analysis/detail acquisition does not renew commercial validity.
- Single-unit age multisets retain multiplicity and original order in evidence.
  Only complete equivalent permutations are normalized for sample selection;
  differences/partial echoes remain blocking. Multicamera is outside this profile.

All raw variants and exclusions remain in the full-set fingerprint. Identical
repetitions remain traced but do not add candidates; conflicting duplicates fail
closed. Only fully qualified sampled offers reach the decision DTO. The decision
uses complete verified cost as its all-in evaluation amount; retail/components
remain separately available in the bound preparation. This is not a rewritten
provider retail price or a fabricated tax breakdown.

At least two **distinct qualified properties** is a pilot condition, not a global
product rule. Full input/set/context and each snapshot's identity, cost, room,
meal and cancellation are checked. Payment and qualified restrictions, which
the legacy snapshot cannot express, remain in the bound issued preparation and
are checked before projection. Altering a non-winning alternative fails binding.

## Execution and actual consumer

`prepareAuthenticatedCommercialSetV3` invokes neither V2 nor V3. The separate
`executeAuthenticatedCommercialV3` requires its set-specific execution literal.

| Result | Meaning |
|---|---|
| PREPARATION_STOPPED | No adequate set; engine zero, not an abstention |
| TECHNICAL_SINGLE_PROPERTY_ONLY | One adequate property; engine zero |
| COMPARISON_EXECUTED_ABSTAINED | Real policy abstention, no invented winner/bound |
| COMPARISON_EXECUTED_RECOMMENDED | Bound accepted by actual independent A02 shadow and replay |
| EXECUTED_BUT_BINDING_OR_SAFETY_FAILED | Execution occurred, but no completed commercial recommendation |

Origin is reported separately as authenticated synthetic/provider. A successful
synthetic comparison actually runs V2 once, constructs V3 three times (including
the two shadow reconstructions), creates one bound, runs shadow once and verifies
replay once. The abstention control constructs V3 once and creates no winner bound.
No real capture or private decision was processed in this development phase.

## Separate MAX11 capability

`stayopti.authenticated-comparison-max11@1`: Rates 1, detail <=5, POST prebook <=5;
total <=11, concurrency 1. Fixed host/method/path allowlist; no GET prebook,
facilities, catalog, booking, payment, retry, redirect or pagination. Rates window
200, offset 0, rates/property 3; provider timeouts 12/4/30 seconds, client 20 seconds
(35 for POST prebook), pacing >=1000ms and 32MiB response cap.

Scenario, national tariff context, case identity, seed and external conditions
belong to the validated plan. Fixed hash sampling is not merit selection. Pool,
original hash, selection, exclusions and derived requests are encrypted/sealed
before any details/prebook. No replacement based on later responses. Fewer than
two bindable properties stops before details/prebooks; fewer than two potentially
qualifiable after details stops before POST. Documented no-results is distinct
from unknown schema/provider error. SSP/known accommodation contradictions prevent
the selected offer's POST. Uncertainty that verification could resolve is retained.

The existing journal core gains only an opt-in selection-seal capability.
Transport, AES-GCM/DPAPI, reserve-before-send, one-shot registry and shared
PowerShell credential runner are reused. Legacy profiles do not enable the new
capability. A timeout consumes POST and leaves its remote effect uncertain;
restart/changed hashes cannot reset the budget. Errors/partial responses remain
recorded, never retried. Credentials are retrieved only after preflight and a new
accepted literal, through D-0074 protected stdin; no real credential was read.

New originals have their own profile root and 14-day retention from acquisition,
named responsible operator, CurrentUser protection and no automatic deletion.
Nothing renews historical retention or reopens consumed cases.

## Supported commands and operational HOLD

`scripts/invoke-liteapi-comparison-max11.ps1` supports Inventory, Preflight,
Simulate and Acquire through Windows PowerShell 5.1. Run it in a child process:
`powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File ...`.
Arguments are `-ExpectedHead`, `-ExpectedBranch`, `-ConfigPath`, `-ConfigSha`,
`-InventoryPath`, `-InventorySha`, `-OutputPath`; Simulate additionally requires
`-SimulationPath` and `-SimulationSha`. Inventory requires an explicit new output.
No permanent execution-policy change. Acquire is **not authorized by this lot**.

`scripts/run-authenticated-commercial-comparison.mjs` supports separate Inventory,
Prepare and Execute. Arguments use `--Name=value`: ExpectedHead, ExpectedBranch,
InventoryPath/InventorySha, LocatorPath/LocatorSha and OutputPath. The locator
contains only root/registryRoot. Prepare emits its proposed execution literal and
zero counters; Execute additionally requires `--Authorization=<that literal>`.
It verifies code/compiler/runtime inventory, compiles with the local canonical
TypeScript configuration and uses the fixed authenticated preparation. No API
credential, transport or acquisition is reachable from this runner.

**Production remains HOLD_CONFIGURATION_PENDING.** Public payable price/SSP and
permitted use/retention conditions still require the documented external facts.
Configuration reference/hash fields identify reviewed documentation; hashes do
not themselves certify those commercial rights. No private operational plan,
inventory or literal was manufactured in this implementation. Future configuration
must use final checkpoint hashes and genuine references; no use of old authority.

## Evidence, initial failures and inventory

Initial development failures are retained in the local evidence directory and
the synthetic counterexample record. Raw opaque offer IDs initially passed pure
qualification but the legacy decision projection considered them unavailable;
the explicit local alias fixes routing without inventing a revision. An undefined
optional value initially broke stable serialization: it now remains explicit null.
An additional pure synthetic counterexample with the same partial component list
in observation and verification initially prepared a complete set. The new adapter
now preserves the list but requires an exhaustive proof; cost remains unqualified.
An incorrect literal `complete` caused a compiler error and was changed to the
existing `reported-complete`, not an extension of the cost contract. A development
run observed `SELECTION_CHANGED` while the new selection schema was being edited;
final tests use an immutable isolated tree, without migration of that test capture.

Public inventory: the plan/capture/facts/CLI/PowerShell modules; separate offline
commercial runner; additive contract and preparation/input/bound/executor modules;
minimal shared journal, room comparison export and independent shadow dispatch;
two regression files and invented fixture; this decision, initial counterexample
record, CURRENT_STATE and DECISION_LOG. The exact hash inventory and final local
gate results are recorded at consolidation. No captured provider payload, account,
private case, operational configuration, credential or historical receipt is added.

## Final local validation

Immutable isolated candidate `05a64bea8d756fa7519571083041dd8eddd923bf`:

| Gate (Windows local, not GitHub CI) | Observed result |
|---|---|
| Exact `npm.cmd run release:ci` | exit 0 |
| V2 official runner | 242/242 PASS |
| V3 official runner | 3389/3389 PASS, no skips |
| New authenticated chain / MAX11 regressions | 41 + 15 = 56 PASS, included above |
| Lifecycle | 665 PASS, 17 preexisting explicit opt-in Valkey skips |
| Security / release / analytics / capacity / beta | 29 / 101 / 31 / 9 / 4 PASS |
| TypeScript, build, analytics-beta gate | PASS |
| Root + server-production dependency audit | PASS, 0 vulnerabilities |
| Local runtime smoke | 18/18 PASS |
| Actual Windows PowerShell 5.1 parsing | 20/20 scripts PASS |
| Candidate manifest creation + same-SHA verification | PASS |

Real PS5.1/DPAPI tests use only invented material, including separate-process
Prepare/Execute, actual loopback launcher, MAX11 timeout/concurrent start and
the unchanged D-0074 protected-credential regressions. Prepare reports zero;
successful Execute measures 1 V2 + 3 V3 constructions + 1 binding + 1 shadow +
1 replay verification. The counts concern these actual entry points, not a
claim that every internal scoring function runs once.

Only reporting Markdown follows these gates; software/tests/dependency bytes are
checked against the isolated candidate. Initial failures remain distinct from
final results. One auxiliary parse invocation had shell quoting errors; invoking
the explicit PS5.1 script with `-File` passes without application changes.
No suite assertion was relaxed and no test was skipped to close this phase.

### Exact selective inventory (21 files)

```text
docs/stayopti/CURRENT_STATE.md
docs/stayopti/DECISION_LOG.md
docs/stayopti/decisions/0075-authenticated-commercial-max11.md
scripts/bounded-acquisition-journal-core-v1.mjs
scripts/invoke-liteapi-comparison-max11.ps1
scripts/liteapi-comparison-capture-v1.mjs
scripts/liteapi-comparison-facts-v1.mjs
scripts/liteapi-comparison-plan-v1.mjs
scripts/liteapi-room-detail-comparison-v1.mjs
scripts/run-authenticated-commercial-comparison.mjs
scripts/run-liteapi-comparison-max11.mjs
src/engine-v3/contract/authenticatedCommercialSetV3.ts
src/engine-v3/evaluation/authenticatedCommercialDecisionInputV3.ts
src/engine-v3/evaluation/authenticatedCommercialPreparationV3.ts
src/engine-v3/evaluation/boundAuthenticatedCommercialV3.ts
src/engine-v3/evaluation/executeAuthenticatedCommercialV3.ts
src/engine-v3/orchestrator/independentDecisionEngineV3.ts
tests/engine-v3/fixtures/authenticatedComparisonInitialEvidence.json
tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs
tests/engine-v3/v3AuthenticatedCommercialComparison.test.ts
tests/engine-v3/v3ComparisonMax11.test.ts
```

Main, the 25 protected files and all preexisting changes are preserved. The
selective commit/push is authorized; its actual local/remote SHA and pending
commits are verified by direct readback at delivery, not inferred from tests.
This software checkpoint does not change historical inventories or results.

## Remaining operational limits

The end-to-end software chain and finite launcher are implemented and tested.
Production is **not READY**: actual public price/SSP basis and applicable
use/retention conditions need genuine documentary resolution before a new plan
and literal. No account/markup change or external message was performed.
The restricted payment/exhaustiveness mappings, unknown rating scale and any
unresolved source scope remain explicit reasons for nonqualification; adding
documentation to a note does not certify them. A missing expiry never guarantees
present/future availability. Even after later acquisition, a real Execute needs
separate authorization and may stop or abstain; no winner is promised.
