# D-0051 — Diagnostic offer requirements, without a fabricated engine input

Source: `26d561e5baa51839c6baabb63705f2b8b365652f`, work branch
`codex/evaluation-d0036-d0041`. Evaluation-only. This public report contains
only software semantics and invented test examples, not private observations.
D-0050's module, tests, decision and report remain byte-identical.

## Implemented path

1. `reviewed-intent-input-assessment-v2.mjs::assessReviewedIntentRequirements`
   calls the immutable D-0050 verifier again, checks the confirmed journal,
   source hashes, original scenario, contextual variants and selected-rate hash.
2. An explicit versioned normalization document binds every new claim to its
   source field and existing proof SHA-256. It records which original essential
   need supports each requested check. No new human review is created. All
   original observations and UNKNOWN wrappers survive separately and unchanged.
3. `diagnostic-offer-requirements-v1.mjs` validates this document and evaluates
   reference comparability, availability, units, capacity, sleeping places, child
   admission, age-dependent pricing and **requested** privacy independently.
4. `prepareSupportedIntentBridgeInput` validates an explicitly supplied existing
   canonical bridge input against these requirements. It either returns that
   input unchanged or precise blockers plus `input=null`. It does not construct
   booleans, select coordinates, run the engine or drop problematic alternatives.
   A supported input still has to pass the existing engine's schema/eligibility
   and policy checks. This is not an all-fields canonical serializer.

No existing policy, ranking, threshold, public export, runtime or D-0037 sealed
file changes. There is no feedback argument in the requirements path. An exposed
human over-budget label never becomes Upgrade or a distance exception.

## Versioned runtime contract

Version: `stayopti.diagnostic-offer-requirements@1`. Required top-level fields:
`caseId`, `mode` (`SYNTHETIC` or `REVIEWED_DIAGNOSTIC`), `evaluatedAt`, `stay`,
`party`, `geography`, `offers`. Stay contains dates and currency. Party contains
adult count, child ages **at stay**, requested units and explicit booleans for
sleeping-place/capacity/child-admission/exclusivity/private-bathroom requirements.
Offer scope binds exact room/rate reference, stay and party. These opaque keys
are correlation keys only. The reviewed successor uses an opaque hash of the
already-reviewed room/selected-rate/price/cancellation evidence, not an invented
provider rate identifier; another gallery rate is not merged into that scope.

Each claim carries `state=KNOWN|UNKNOWN|CONFLICTING`, `value`, a nonempty `reason`,
`scope`, `applicability=OFFER_SCOPED|PROPERTY_WIDE|SET_DOCUMENTED|UNVERIFIED`,
`observedAt`, `timeSource` and individual `links={field,evidence:[{ref,sha256}]}`.
UNKNOWN/conflicting claims have `value=null`. Known claims require actual linked
evidence and a declared observation time. Future evidence relative to the explicit
evaluation instant, malformed scope and invalid numeric domains are rejected.
Neither a hash nor these declared timestamps certify factual truth, freshness or
independent capture time. The private normalization preserves original capture
times; the later evaluation instant is recorded separately.

The reviewed successor also requires its D-0050 projection fingerprint,
scenario-need mapping and exact selected-offer fingerprint. It rejects links
outside the field's reviewed references, changed hashes, promoted UNKNOWNs,
unverified boolean bookability, changed numeric observations or invented contexts.
It recomputes the supported lexical bed normalization and the observed adult-price
age threshold, and checks that the raw rating observation has not changed; an
unchanged proof hash alone cannot justify changing those derived values.
Normalization remains an explicit evidence interpretation: linking a text field
is not automatic proof of every possible inference from that text.

## Actual evaluators and boundaries

| Subject | Implemented deterministic result | Remaining boundary |
|---|---|---|
| Geography | Explicit selected point versus source centre; same documented common identity, mismatched identities, conflicting points and unknown distance are distinct. Source-centre distances can be diagnosed without coordinates. | Same source-centre label is not independent geodetic equivalence to the selected point. The existing bridge still requires its selected-location context/coordinates. No fake point or bypass is supplied. |
| Strong preference | Exact `distance <= preference` follows the existing V2 distance constraint and V3 strong-preference branch. Outside means `OUTSIDE_REQUIRES_JUSTIFIED_EXCEPTION`, not a hard violation. | No automatic tolerance or accepted exception. Actual policy requires its existing case-specific evidenced experience gain and eligible in-range comparison. This evaluator does not choose an exception or an alternative. |
| Availability | Observed available, verified bookable, verified not-bookable, known unavailable, UNKNOWN and conflicting claims are separate, dated and offer-scoped. | Only direct offer-scoped bookability evidence supplies the required boolean. Observed availability cannot supply either value; property-wide claims cannot certify a rate. Unknown does not lower property quality. Contradictory claims need resolution, not an implicit latest-wins rule. |
| Units/capacity | Requested units checked against offered units; declared guest capacity checked against adults plus children. Internal room count is retained but never multiplied into units or sleeping places. | Public capacity remains declared capacity, not purchase verification or proof of beds. |
| Sleeping | Documented lower bound and, only for a complete inventory without unknown components, exact sleeping places. Enough documented places passes; complete known shortfall violates; unresolved places are insufficient. | Sofa/bunk names do not define sleeping places. The bounded Italian normalizer uses the lexical meaning single=one/double=two; it does not infer dimensions, exclusive allocation or unlisted extra beds. Unsupported/negated/disjunctive text is not parsed as a complete inventory. |
| Children | Exact ages remain outside and alongside the unchanged legacy count-only DTO. Selected-party admission and minimum-age conflict/violation are assessed separately from pricing. | A threshold for adult pricing does not turn a child into an adult or create a minimum admission age. A property-wide pricing rule can be evaluated arithmetically but remains `RATE_APPLICABILITY_UNVERIFIED`; it does not certify the selected rate's final amount. |
| Privacy | Only explicit requested exclusivity/bathroom requirements receive satisfied/violated/unknown/conflicting checks. | A private room is not a sleeping-place assessment. Unrequested privacy does not become a new human hard requirement; existing engine contextual suitability remains unchanged. |
| Price/rating | Complete total UNKNOWN is a recommendation finding, not a universal parser failure. Unknown rating scale retains the observation and requires omission of normalized score. | Unchanged V3 policy excludes incomplete total candidates and may abstain. Such an engine result is measured only on synthetic inputs in this phase. No real abstention or agreement is inferred. |

Accommodation outcomes are `SATISFIED`, `DOCUMENTED_VIOLATION`,
`INSUFFICIENT_INFORMATION`, `CONFLICTING`, with individual `NOT_REQUIRED` checks.
Confidence/evidence completeness is not a quality score. A true unavailable claim
without direct verified bookability remains visible but is not converted through
an invented false placeholder. Unknown pricing components and tax observations
are not inferred from payment terms or occupancy labels.

## Proof and limits

Focused tests run through the actual D-0050 verifier and actual
`runIntentRolePolicyBridgeV3`, using **invented** inputs. Complete control and
supported family input have identical bridge input/output before and after the
new check. Tests cover source-reference mismatch, boundary distances, positive/
negative/unknown availability, offer/time/proof binding, sleeping/capacity
disagreement, sofa/bunk uncertainty, two internal rooms in one unit, child
pricing/admission, requested privacy, unknown totals and rating scale, provider/
order independence, feedback separation and unchanged review history.

The first focused run exposed an alias in the synthetic test builder: changing
one reference also changed the common reference. Cloning fixture values fixed
the stimulus; the non-comparability assertion was retained. Private preparation
also stopped before output on an unsupported singular-bed normalization; the
bounded normalizer now has dedicated singular/plural and ambiguity regressions.
An external preparation helper's Windows ESM URL error was corrected before
private output. No failure was passed off as a policy PASS or engine abstention.

Windows offline validation: 34 new focused tests plus 31 unchanged D-0041/D-0050
regressions, **65/65 PASS**; complete canonical V3 **1972/1972 PASS**, V2
**196/196 PASS**. Lifecycle **530 PASS / 17 pre-existing SKIP / 0 FAIL**;
security **29/29**, release **101/101**, analytics **31/31**, capacity **9/9**,
beta **4/4**. TypeScript, build, analytics-beta gate, local-loopback smoke and
Windows PowerShell 5.1 parsing pass. V3 contains zero skipped tests on this
Windows validation. These are local results, not a new GitHub CI result.

Final offline gates are executed in a clean isolated candidate excluding the
seven developer paths and preserving all seventeen sealed files. Full counts,
exit codes and final tree/remote hashes are in delivery evidence. Windows-only
PowerShell 5.1/CurrentUser tests use synthetic fixtures; they are not evidence of
real custody. Dependency-registry audit and production release-environment/CI
certification are outside this offline/Git-only phase and are not claimed.

## Private outcome and minimal next step

The authorized private evaluation evaluates only requirements, retains all
original UNKNOWNs and returns `engineExecuted=false`, `decision=null`,
`abstention=null`. No real ranking, review event, custody or Golden admission is
created. The detailed per-offer matrix and original field/proof associations
remain outside Git, with source/journal hashes rechecked read-only.

The software can now diagnose a documented common source reference and evaluate
party/bed/age evidence rather than report those dimensions as unimplemented.
This does **not** silently extend the legacy selected-location or boolean
bookability contracts. Next work must separately authorize that faithful
diagnostic conversion, or supply the precise missing proof. Resolve only actual
missing sleeping/allocation/rate-price evidence, without repeating unchanged
transcription or calling a missing value a documented violation. Two contextual
variants remain one case; no blind or Golden eligibility follows.

Every completed software phase reports branch, local/remote SHA, push outcome and
still-local commits. Only this phase's software, synthetic tests and public docs
are eligible for selective work-branch publication. Main remains unchanged.
