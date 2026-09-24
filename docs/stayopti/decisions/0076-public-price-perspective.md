# D-0076 — retail, public floor, proposal and verified quote

2026-09-24. Evaluation-only implementation from
`d3ef117aca371d912587ad3ad940c7b957ca93ee`.
User decision: the current analytical proposal equals the documented public
minimum, with zero **additional** local markup. Account commission, request
parameters and acquisition profiles do not change. Production remains HOLD.

## Before and after

The authenticated set @2 applies its public-minimum check to observed retail.
That historical qualification remains intact. The opt-in @2.1 perspective
separates four meanings without modifying an original:

| Fact/choice | Meaning and consumer |
|---|---|
| `originalRetail` | Provider observation, amount/currency/source and unchanged historical floor qualification. |
| `documentedMinimum` | Separately preserved observed and verification-time floors, applicable scope and provenance. Extraction of SSP remains in the adapter. |
| `proposal` | Local analytical choice, **not** a provider observation or verification. Current mode selects the documented minimum with additional markup zero; explicit scoped proposals may exceed it. |
| `verifiedPrice` | Authenticated quote and source, distinct original transaction quote, scoped components and cost qualification. It does not claim checkout/payment or current bookability. |

A below-floor retail is not erased, increased with `max()` or declared
compliant. The new proposal is tested independently against each applicable
documented floor. A minimum that is missing, contradictory or in another
currency cannot be used as a numeric certification. No currency conversion.
The policy compares floors, not equality: a verified proposal **above** the
floor is allowed. There is no new scoring weight, commission preference or
purchase-channel selection rule.

## Versioned boundary and actual consumer

The existing default remains facts/set/preparation/binding @2, with the same
legacy qualifier and full-set fingerprint formula. Only an explicit
`stayopti.public-price-policy@1` enables facts/set/preparation/binding @2.1.
Mismatched facts/policy versions are rejected; no historical receipt, inventory,
capture or private matrix is migrated or regenerated.

Current policy shape:

```json
{"version":"stayopti.public-price-policy@1","mode":"DOCUMENTED_MINIMUM","additionalMarkup":0}
```

The alternative `EXPLICIT_PROPOSALS` contains per-offer `scope` and `money`.
Scope includes property, exact offer/room, dates, adults, child count and ages,
units and currency. Equivalent child-age ordering is normalized with the
existing common interpreter; missing positive-count ages are not completed.
No provider fields, destination, account or trip-specific constants are in
the new core contract. The existing one-unit ingress limitation remains.

`prepareAuthenticatedCommercialSetV3(locator, policy?)` still authenticates
the journal with the fixed reader before normalization. Local policy is deep
copied/frozen and fingerprinted with **all** alternatives. It never issues
proof. Caller objects, JSON copies and rehashing cannot acquire preparation
or binding capabilities.

The actual path is fixed authenticated adapter → pure qualification →
`authenticatedDecisionInputV3` → independent V2/V3 compatibility construction
→ whole-set binding → independent A02 shadow and its replay. Only a
qualified **verified complete cost**, not an unverified proposal or floor,
enters decision input and every alternative's binding checks. Incomplete
offers remain in the preparation with reasons. Preparation rejection is not
called policy abstention. This is not the intent role-policy, public V3,
full robustness/regret, LIVE or Golden.

## Price verification is a separate requirement

An authenticated transaction quote can support an identical amount, currency
and scope; it cannot verify a different local proposal. For a separately
evidenced public quote, the common contract additionally preserves source,
exact scope, contrary observations and complete-cost evidence. A malformed
explicit quote does **not** fall back to the transaction retail.

The only new extraction of that separate public quote in this lot is an
explicitly **invented**, authenticated extension of
`SYNTHETIC_ATTESTED_QUOTE@1`, `invented-public-price-quote@1`. It is not a
newly asserted LiteAPI schema. Real LiteAPI `sellingPriceToUser`, SSP or a
caller flag does not become this proof. Its unsupported field qualifications
remain. Both existing synthetic protocols also exercise the path where the
transaction quote itself exactly matches the scoped proposal.

Common cost qualification reuses the existing rule: verified quoted amount
plus documented compulsory excluded charges, once, only with complete
coverage and compatible currency/stay/guest scope. Included charges are not
added again; optional extras and refundable deposits do not become stay cost.
Unknown components, duplicate component identities and contrary conditions
remain blockers. Neither original retail, the floor, account commission nor
an additional markup is summed into the proposed amount.
The new proof's coverage is `DOCUMENTED_EXHAUSTIVE_COMPONENTS`, not a claim
that every charge is included in its quoted amount. An internal compatibility
projection uses the unchanged historical cost evaluator's completeness switch;
it is not written back into the authenticated proof or historical observations.

Only the old conflated floor check is superseded. Original known transaction
changes, offer continuity, room/family suitability, conditions, availability,
expiry, full-set identity and all other commercial controls remain effective.
The verified cost check may use the new independently evidenced public cost;
it is never waived by choosing a proposal. Absent provider expiry stays
UNKNOWN; no clock renewal or internal TTL is introduced.

## Offline runner

The existing `run-authenticated-commercial-comparison.mjs` optionally accepts
paired `--PricePolicyPath=...` and `--PricePolicySha=...`. Both Prepare and
Execute verify the exact policy bytes. Prepare does not invoke the engine.
Execute requires its separately generated, full-set-specific authorization.
The new adapter dependency is part of the fresh code inventory. Existing
inventories remain unchanged and cannot be used to absorb changed software.

No private command or inventory was generated in this task. Tests use only
invented DPAPI originals. This optional runner interface is **not** authority
to acquire or execute a real case.

## Validation

The retained @2 control and @2.1 candidate process the same invented originals:
retail 820, floor 1100, separately authenticated public quote 1100. Legacy @2
stops with the historical floor violation. @2.1 retains that fact and reaches
actual binding/shadow/replay only with all other commercial proofs satisfied.
Removing the public quote preserves proposal conformity but stops before the
engine because the proposed amount has not been verified.

Initial local compiler feedback on nullable canonical ages was corrected with
the existing validated KNOWN-state invariant. The first sandbox test invocation
failed on native path inspection (`EPERM realpath`); its logs are retained.
The first real Windows targeted run passes 45/45. The final suite includes two
additional age/no-fallback guards: **47 new tests**, all PASS. These traverse
the authenticated preparer, both supported synthetic protocols, actual decision
projection, whole-set binding, independent shadow and replay. The CLI opt-in
also runs on invented DPAPI CurrentUser originals; Prepare counters are zero,
Execute requires separate authority and a changed policy hash is rejected.

Final isolated candidate on Windows PowerShell 5.1.26100.9444 / Node 24.18.0:

| Local canonical check | Observed result |
|---|---|
| `npm.cmd run test:engine-v3` | 3444/3444 PASS, zero skips; includes the 47 new tests and D-0075/R1, A01/A02/temporal/family regressions |
| `npm.cmd run test:engine-v2` | 242/242 PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run build` | PASS |
| `npm.cmd run test:lifecycle` | 665 PASS, 17 preexisting opt-in Valkey skips |
| Source/candidate phase hashes, legacy body, 25 protected paths | PASS |
| `git diff --check` and staged equivalent | PASS; staging empty |

Each successful complete synthetic execution measures V2=1, V3
constructions=3 (including shadow/replay reconstruction), binding=1, shadow=1,
replay=1. Rejected preparation has all five counters zero; it is not an
abstention attributed to the policy. No private decision was executed.

Retained environment failures are not software regressions: the first isolated
lifecycle run lacked the separately installed server dependencies. A guarded
copy initially stopped because package/lock bytes differed by CRLF/LF; a
subsequent content comparison proved newline-only equivalence. Dependencies
were copied locally, without installation/network, and lifecycle passed.
The first full V3 run was 3443 PASS/1 FAIL: clone CRLF conversion added a final
carriage return to the historical validator test's extracted slice. The
unchanged original LF file was copied byte-identically into the isolated
candidate, after comparison to HEAD; **neither test nor validator was edited**.
The final canonical V3 rerun is 3444/3444 PASS. Initial logs are preserved.

Evidence and phase SHA-256 inventories are outside the repository under the
local temporary directory `stayopti-d0076`. Only reporting Markdown follows
the final software/test gates. Lifecycle dependencies and exercised paths are
unchanged by the subsequent new-contract coverage-label refinement; its result
is reused on that basis. TypeScript, build, V2 and V3 were rerun on the final
software/test candidate. Network dependency audits and the whole release:ci
pipeline were **not** run or claimed in this offline, unpublished task. No
local result is attributed to GitHub CI.

## Bounded inventory

- `src/engine-v3/contract/publicPricePerspectiveV3.ts`
- `src/engine-v3/contract/authenticatedCommercialSetV3.ts`
- `src/engine-v3/evaluation/authenticatedCommercialPreparationV3.ts`
- `src/engine-v3/evaluation/authenticatedCommercialDecisionInputV3.ts`
- `src/engine-v3/evaluation/boundAuthenticatedCommercialV3.ts`
- `scripts/comparison-public-price-proof-v1.mjs`
- `scripts/liteapi-comparison-facts-v1.mjs`
- `scripts/run-authenticated-commercial-comparison.mjs`
- `tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs`
- `tests/engine-v3/fixtures/publicPriceSyntheticV3.mjs`
- `tests/engine-v3/v3PublicPricePerspective.test.ts`
- this decision, `CURRENT_STATE.md`, append-only `DECISION_LOG.md`.

## Remaining boundaries

This fixes representation and consumption, not missing commercial evidence.
A real proposal still needs applicable price verification, exhaustive mandatory
cost evidence and the unchanged room/family/availability/continuity/terms/time
requirements. A distinct public price extraction for a real provider requires
a documented supported source, not relabeling the invented protocol. Current
MAX11 acquisition stop rules are intentionally unchanged, including its
historical below-SSP retail stop; no production profile is made READY here.

No private analysis/decision is rerun; old derived results keep their original
code version. No external calls, real key access, private decryption, request,
acquisition, account change, commit or push. Publication is not authorized by
this software-only task. Local branch/HEAD and unchanged staging are reported
at delivery; remote is not contacted during this offline phase.

## Authorized consolidation — 2026-09-25

This addendum supersedes only the preceding phase's no-publication authority.
The user explicitly authorizes consolidation of the same fourteen files on
`codex/evaluation-d0036-d0041`. HEAD and the directly observed remote work
branch both start at `d3ef117aca371d912587ad3ad940c7b957ca93ee`; initial staging
is empty. Local main and remote main are separately recorded and preserved.

All fourteen starting SHA-256 values equal the delivered D-0076 inventory and
isolated candidate. All eleven software/test files also equal the final test
inventory. The 958 other tracked candidate files match their committed input;
the 15,527 installed dependency files have no modifications after those tests.
The retained checkout remains isolated from the unrelated local work. The
historical qualifier, MAX11 plan/capture, public baseline and all 25 protected
files remain unchanged. The final diff contains only the bounded inventory
above; fixtures are invented, with no private acquisition payloads or credentials.

| Consolidation evidence | Result / reuse basis |
|---|---|
| V3, V2, TypeScript, build | Reuse final D-0076 receipts: 3444/3444, 242/242, PASS, PASS; identical software/test and relevant dependency inputs |
| Lifecycle | Reuse 665 PASS / 17 existing skips; unchanged server inputs, dependencies and exercised paths |
| `test:security` | New PS5.1 run: 29/29 PASS |
| `test:release` | New PS5.1 run: 101/101 PASS |
| `test:analytics` | New PS5.1 run: 31/31 PASS |
| `test:capacity-contract` | New PS5.1 run: 9/9 PASS |
| `test:beta` | New PS5.1 run: 4/4 PASS |
| `gate:analytics-beta` | New local synthetic run: PASS; zero external analytics/provider calls |
| `smoke:staging:local` | New local runtime run: 18/18 PASS; not distributed remote acceptance |
| Dependency audit | Reuse retained 2026-09-22 PASS, root/server-production zero reported vulnerabilities; both package manifests/lockfiles and audit script have identical content, with recorded CRLF/LF-only differences |

The attempted fresh npm audit was rejected by the environment before execution
because dependency metadata would be sent to the external registry. No network
workaround is used. The retained audit is explicitly dated: it does **not**
establish absence of advisories published since that run. This reuse follows
the task's unchanged-input allowance; no current online audit is claimed.
The constituent release checks are accounted for, but the entire `release:ci`
command is not rerun or reported as newly executed. All results are local,
not GitHub CI. Previous failures and successful receipts remain unmodified.

Only this reporting addendum and the corresponding state/log are edited during
consolidation. Software/test bytes remain the already verified candidate.
Selective commit and non-force push use only the work-branch ref; final SHA,
staging and pending commits are established by direct readback at delivery.
No acquisition, key read, private decryption, private preparation/decision or
deploy. The four delivery limits remain: synthetic separate-public-quote proof;
unchanged MAX11 below-SSP retail stop; SSP selection is not checkout/complete-cost
verification; **Production HOLD**.
