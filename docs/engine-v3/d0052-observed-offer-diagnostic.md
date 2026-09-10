# D-0052 — Executable observed-offer diagnostic path

Source checkpoint: `e3c6985cd5024d919a9d7af93bf421de6a85040b`.
Work branch only: `codex/evaluation-d0036-d0041`. Version:
`stayopti.observed-offer-diagnostic@1`; reviewed normalizer `@2.2`, R1 requirement
contract `@1.1`. No public entry point, policy weight, threshold or role changed.

## Actual execution path

`executeObservedOfferDiagnostic` in `scripts/observed-offer-execution-v1.mjs`
accepts an explicit `REVIEWED` or `SYNTHETIC` request. It invokes the supplied local
`computeObservedOfferDiagnosticV3` from
`src/engine-v3/evaluation/observedOfferDiagnosticV3.ts` after validation.

For reviewed material, the entry reruns `assessReviewedIntentRequirements`:
original scenario/hash, complete confirmed journal, final field values, evidence
references, essential-need coverage, transformation meaning and applicability.
It consumes **that returned assessment and original-need coverage**, not caller
flags or a precomputed PASS. Supplemental fields also come from the final reviewed
mapping, not a stale initial packet. The synthetic route requires an independent
explicit requirement basis and refuses a reviewed projection or reviewed request.

The kernel receives canonical evidence facts, room/rate keys, observations,
provenance, query and assessed requirements. It does not construct a `Hotel` or
`HotelOffer`, use a cast to them, insert coordinates, fabricate a total, or turn
unknown/observed availability into a boolean. The lower computation function is
an internal typed calculation boundary, not a reviewed-document intake API.

| Input/result | Computation actually reused | Recommendation consequence |
| --- | --- | --- |
| Applicable complete rate total | Price-value, peer, market and budget-intent functions | Still requires bookability and applicable accommodation evidence |
| Display price only / unknown complete total | Original price retained; canonical complete cost stays null | Incomplete candidate stays in output, cannot be recommended |
| Normalizable rating, review count, stars | Existing quality formula and review prior | Unknown scale omits rating; stars-only or unavailable quality is explicit |
| Amenities, bound-room privacy and stay context | Existing comfort, flexibility and suitability functions | Unknown is not evidence of absence or verified privacy |
| Common documented source centre | Unchanged `calculateDistanceFitScore`, then shared strong-distance policy | Not geographic equivalence with selected-location; no implicit exception |
| Unverified/incompatible distance | Observation retained, location score null | Unverified contextual suitability, not invented coordinates |
| Observed availability / UNKNOWN | Factual quality/comfort remain calculable | Actual bookable fact remains null; integrity remains partial |
| Known unavailable / conflicting availability | Observation and distinct cause retained | Invalid offer integrity; not a property-quality penalty |
| Missing / violated / conflicting accommodation | R1 individual requirements and mandatory-feature checks | null / false constraint eligibility, never automatic replacement |
| Unrepresented essential need | Representable factual dimensions can be computed | No policy call, `decision=null`; **not** labelled V3 abstention |

All candidates survive the path. With represented input the real
`runPersonalUtilityRolePolicyV3` executes and its output validator runs. For the
strong preference, the existing unrestricted baseline and final policy both run;
two policy invocations are one context evaluation, not two independent cases.
`policyExecuted`, `diagnosticCalculationsExecuted`, per-dimension availability,
candidate blockers and the actual decision distinguish computation from intake.
Full robustness and regret are explicitly `NOT_EXECUTED`.

## Shared calculation extraction, no public behavior change

The old V2 quality/comfort entry functions retain their original defaults and
invalid-gate behavior. New observation-only wrappers reuse the same arithmetic,
bypassing only the diagnostic early return caused by offer/price eligibility;
their own primary-ranking eligibility remains false. Quality observation peers
use the same category/unit/sample grouping and review-prior formula, based on
usable reviews rather than an invented price reference. They explicitly carry
zero price-reference count. Actual reliability/data-confidence calculations are
retained separately, not certified by those observation wrappers.

`bookingFlexibilityContextEngine` accepts its already-used factual fields through
a narrower interface with nullable facts; default legacy inputs and formulas are
unchanged. `createScoreBreakdown` and the existing location kernel are exported,
not reimplemented. The shared `strongDistancePreferenceV3` is extracted from the
old bridge: evidence-backed exceptions, in-range comparables and unknown distance
have the same rules; no tolerance, penalty or new ranking weight is introduced.

Complete synthetic controls compare all dimension scores and role equivalence
sets with the previous bridge; all five explicit profiles and the automatic
profile path are covered. The initial automatic control found a real reference-
sample mismatch (three new market peers versus two old in-range peers, Comfort
versus Balanced). Market/intent peers now use the same in-range sample as the
previous path; final offer integrity and strong-distance exceptions remain
separate. The regression retains the actual profile comparison, not a skip.
The source-centre mode names the actual reference in
its output. Existing location result properties such as `maximumDistanceKm` are
the scoring kernel's shape, **not a reclassification of strong preference as a
hard geographic bound**. The extracted strong-preference rule owns that meaning.

Canonical numeric evidence confidence uses the existing normalization conventions
(default .95, stars .90, positive feature tokens .84); these are software evidence
weights, not independent verification probabilities or human source confidence.
Original wrappers, applicability, source confidence, unknown reasons and proof
links remain available alongside them. Human feedback is neither read nor mapped
to candidate scores, exceptions or roles. Best Over Budget is not Upgrade.

## Bounded reviewed-language successor

`@2.2` adds only anchored, verifiable forms encountered at the reviewed boundary:
an explicit accommodation-and-sleeping-place need maps to sleeping/capacity, not
unrequested privacy or new child-admission obligations; a published capacity with
an equal adult/child count annotation; an explicitly counted suite and internal
rooms; child-price clauses and a selected-rate qualification. Contradictions and
unsupported prose are not guessed. An admission qualification cannot disappear
because clause order changes. The interpretation is versioned `@1.1`.

Room names do not prove unit counts. Beds do not prove separate units. A sofa or
bunk count does not create undocumented sleeping places. Family composition stays
unchanged by adult-pricing rules. Property-wide child-price observations do not
certify the selected rate. Unsupported cancellation prose is retained, not turned
into a boolean refundability flag or deadline.

## Reproducible synthetic proof

From a clean authorized checkout, Node 24 and Windows PowerShell 5.1:

```powershell
& npm.cmd run test:engine-v3
if ($LASTEXITCODE -ne 0) { throw 'ENGINE_V3_FAILED' }
```

The canonical runner compiles and executes `v3ObservedOfferDiagnostic.test.ts`.
Its explicit public entry calls the actual compiled local kernel; no mock policy,
provider transport or private dataset is required. The fixture helper contains
only invented cases copied from the existing synthetic requirement controls.
The targeted tests include all-new path checks plus the unchanged D-0050/D-0051
and six R1 counterexample regressions in the retained suites.

For an separately authorized reviewed request, the software call is:

```js
executeObservedOfferDiagnostic({
  kind: 'REVIEWED', reviewed, normalization, contextId,
}, computeObservedOfferDiagnosticV3);
```

`reviewed` is the existing source packet, journal and hash-bound original scenario/
prepared-input contract; `normalization` is a new explicit R1-compatible derivative.
No prior documents or custody bindings are migrated. This is a local API, not a
new provider runner or an authorization to collect, reopen custody or evaluate
other real cases.

## Evidence and limits

Validation results are recorded in the checkpoint and delivery. Local clean-tree
Windows proof is distinct from GitHub CI; the current workflow does not run on
an ordinary work-branch push. No registry/network audit or CI PASS is inferred.
The D-0038 launcher checkpoint requirement remains in force, and is exercised by
the full suite on a clean, explicitly bound isolated candidate.

Isolated local Windows result: 31 new tests and 92 retained D-0041/D-0050/D-0051/
R1 tests, **123/123**; canonical V3 **2030/2030**, V2 **196/196**. Lifecycle
530 PASS with 17 pre-existing explicit SKIP; security 29, release 101, analytics
31, capacity 9 and beta 4 PASS. TypeScript, build, analytics-beta gate, local
loopback smoke and actual PowerShell 5.1 parsing of all 13 scripts PASS. The
candidate contains only the 18 software/documentation paths, not local excluded
files or private data. Final publication checks also compare its Git tree with
the selectively staged source tree. Registry audit and GitHub CI are not claimed.

The authorized private case evaluation has a separate private report and code
manifest. No names, prices, source fields, journals, feedback, private inputs or
results from it are included here. Successful diagnostic execution does not
make incomplete candidates recommendable or establish agreement with a person.
No full robustness, regret, blind/Golden qualification, booking verification or
public rollout is claimed. D-0050 and historical D-0051/R1 evidence are preserved.
