# D-0066 R1 — Pure room comparison repair

Base: `88ab447058e200a2ff21d4075b227fe6dd38cd73`.
Scope: evaluation adapters and synthetic tests only. No acquisition, credential,
kernel/policy, public runtime, scoring/role change or commercial qualification.

## Before and after

| Concern | Before | Corrected boundary |
|---|---|---|
| Sufficient but unequal maxima | Source difference became capacity conflict | Per-source maxima and unexplained difference retained; party limits checked separately |
| Rate adult/child caps | Only room sublimits checked in D-0066 | Both sources' applicable limits checked; invalid/missing observations stay UNKNOWN |
| Generic rate title | Cancelled usable mapped inventory | No rate inventory invented; mapped inventory and sufficiency separately assessed |
| Sleeping quantity | Agreement could mask insufficient places | Known lower bound, unquantified places, alternative assignments and sufficiency separate |
| Room description conditions | Whole HTML/text interpreted as one bed clause | Bounded fragments with exact original offsets, main-bed versus extra/linen/other scope |
| Count-only assertion | Unparsed blanket uncertainty | Count compared with mapped quantities, no types/places inferred |

`compareMappedRoom` now emits `stayopti.mapped-room-comparison@2` and a
capacity assessment while preserving its shared caller's blocking signals.
`compareHotelDetailCapture` emits comparison @1.1; existing capture/source
formats and historic inventories do not change. The new condition helper is
pure and never fetches, renders or executes HTML.

Missing optional sublimits are reported UNKNOWN, not assumed unlimited or
new user requirements. A generic title supplies no bed information. Unsupported
bed statements and actual qualifications are not discarded. An OR configuration
is still unassigned even when every branch has enough documented places.
Source agreement does not prove contemporary assignment to a historical rate.

## Validation

Initial proof: 43 tests, 26 PASS / 17 FAIL. Historical fixture/result preserved.
The first isolated candidate passed233/233 but a subsequent concrete review
counterexample found ignored rate remarks with a generic title. Its two false
compatible results and exact source hashes are retained separately in
`d0066-r1-rate-remarks-initial-v1.json`. It is repaired by consuming the retained
rate remarks separately from mapped conditions, never by modifying originals.
Final isolated checks on the corrected executable tree: **245/245 PASS**,
zero failures/skips, plus canonical compilation, TypeScript and build PASS.
The candidate is exported from the exact base and overlaid only with the eleven paths below;
excluded developer files, private inputs and local `.env` were not required.

| Local check | Actual result |
|---|---|
| New complete pure comparison + shared preparation regressions | 71/71 |
| Existing D-0066 plan/comparison regressions | 49/49 |
| D-0065 bounded room-description regressions | 111/111 |
| Selected pure documentary wire tests DW07–13/DW15 | 11/11 |
| Selected pure commercial boundary CQ17/CQ18 | 2/2 |
| Pure semantic-integrity preparation LSI15 | 1/1 |
| Canonical `tsconfig.tests.json` compilation | exit 0 |
| `npm.cmd run typecheck`, `npm.cmd run build` in Windows PowerShell 5.1 | exit 0 / exit 0 |
| Provider, kernel, policy invocations | 0 / 0 / 0 |

HD14/HD15 intentionally retain the no-inferred-rate-beds assertions while
allowing separately documented mapped beds; the previous outcomes remain
preserved in the base and initial evidence. D-0065 source and its body-hash
regression stay unchanged. The narrow helper's interim conservative handling
was tightened before the isolated gate: unsupported bed assertions block;
only whole supplementary-bed statements have the separate extra-bed scope.
No private names, identifiers, prices, original text or reports belong here.

### Publication inventory

- `scripts/liteapi-offer-qualification-v1.mjs`
- `scripts/liteapi-room-detail-comparison-v1.mjs`
- `scripts/liteapi-mapped-bed-conditions-v1.mjs`
- `tests/engine-v3/v3LiteApiHotelDetailComparisonR1.test.ts`
- `tests/engine-v3/v3LiteApiHotelDetailPlanAndComparison.test.ts`
- `tests/engine-v3/fixtures/d0066-r1-comparison-initial-v1.json`
- `tests/engine-v3/fixtures/d0066-r1-rate-remarks-initial-v1.json`
- `docs/stayopti/decisions/0066-r1-room-evidence-and-party-sufficiency.md`
- `docs/engine-v3/d0066-r1-room-comparison.md`
- `docs/stayopti/CURRENT_STATE.md`
- `docs/stayopti/DECISION_LOG.md`

Reporting-only updates follow the gates; executable/test bytes must still
match the isolated manifest before selective staging. Historical operational
inventories are not regenerated. New inventory/authorization would be needed
for any future acquisition; this repair authorizes none.

## Limits and next step

Collection completed, room found, interpretable data, party adequacy and
commercial eligibility are separate. Price, SSP, tax completeness, freshness
and bookability are not refreshed by this comparison. No desired count of
compatible offers is prescribed. Private comparison derivations bind actual
code/input hashes; they are not evidence for the software's earlier version.

No full engine suites are executed: they would invoke the expressly excluded
kernel/policy. Run only pure affected regressions, canonical test compilation,
TypeScript/build and publication/preservation checks on the isolated candidate.
Local checks are not GitHub CI. Each completed phase must report local/remote
SHA, push result and commits still local. Only the evaluation work branch may
receive the selective non-force push; main stays unchanged.
