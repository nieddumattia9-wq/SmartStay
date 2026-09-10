# D-0051 R1 — Original needs, applicability and faithful normalization

Source: `4efd81d1b82f950555bb35d74394cf1a6015aae4`, branch
`codex/evaluation-d0036-d0041`. Synthetic evaluation only. D-0050, original
D-0051 results/documents, public runtime, V3 policies and D-0037 sealed files
are not rewritten. No private observation, feedback, progress or custody is read
or published by this correction.

## Reproduced before correction

The original D-0051 `fixture` / `reviewedFixture` functions were exercised before
editing either evaluator. The original compiled test's registrations were
suppressed only in the isolated probe; the fixture constructors, actual MJS
assessors and actual compiled `runIntentRolePolicyBridgeV3` were executed.
This probe is not represented as a substitute for the canonical test suite.
Full synthetic inputs, original source/journal, prepared input and engine output
are retained outside Git. Their immutable record SHA-256 is
`a64c232fcdea8c214c8d56d8cac3c52ae7d5710c3dbc75de780680cab4b3aab5`.
The compact before/after evidence is in
`evidence/d0051-r1-synthetic-counterexamples.json`.

| Counterexample | Before, actual source | R1, same facts under explicit new synthetic version |
|---|---|---|
| Essential sleeping/capacity flags false, all mapping indexes empty, facts UNKNOWN | Accepted, accommodation SATISFIED / checks NOT_REQUIRED | Rejected: ESSENTIAL_REQUIREMENT_COVERAGE |
| Complete total KNOWN but UNVERIFIED | SUPPORTED_DIAGNOSTIC_INPUT; actual bridge usable with selected Choice | NON_EXECUTABLE, COMPLETE_TOTAL_APPLICABILITY_UNVERIFIED; no engine invoked |
| Complete total KNOWN but PROPERTY_WIDE | Same improper acceptance and usable decision | Same refusal, even with a property/offer link |
| Distance KNOWN but UNVERIFIED | Supported / usable | NON_EXECUTABLE, DISTANCE_APPLICABILITY_UNVERIFIED |
| Same distance case with every hotel coordinate absent | Supported / usable | Same refusal; no coordinate workaround |
| Original `Two guests` normalized to zero with original roomCapacity proof/hash | Accepted as DOCUMENTED_VIOLATION | Rejected: CAPACITY_NORMALIZATION_CHANGED |

Before software repair, the initial expanded focused run had **67 PASS / 20 FAIL
/ 0 SKIP** out of 87: the failures also included newly specified neighboring
guards and the version check, not twenty distinct production root causes.
All original 34 D-0051 tests passed. The final expanded focused suite has
**92/92 PASS**: 34 retained D-0051 cases, 27 R1 cases, 12 immutable D-0050 and
19 immutable D-0041 regressions.

## 1. Essential requirements cannot be remapped away

`assessReviewedIntentRequirements` derives coverage from the **original**
essential needs verified by D-0050, not from the proposed flags. Every supported
need has an exact set of required checks; supplied indexes must match that set.
Removing capacity, mapping both checks only to privacy, duplicates or extra
requirements fail. Optional needs and a scenario without additional essential
needs do not create privacy or sleeping requirements.

The bounded English/Italian vocabulary is listed in `supportedNeeds`. It is not
a general language model or universal intent interpreter. Unrecognized essential
wording yields `UNREPRESENTED_ESSENTIAL_NEEDS`, original need indexes and explicit
conversion/recommendation blockers. Diagnostic facts and proven violations remain
available, but accommodation cannot report SATISFIED. Missing sleeping facts under
a recognized requirement yield INSUFFICIENT_INFORMATION, not NOT_REQUIRED.
No transcription event or new human approval is generated.

## 2. Applicability is data-specific, not a quality penalty

`usable`, `evaluateGeographicReference`, `evaluateDiagnosticOfferRequirements`
and `prepareSupportedIntentBridgeInput` now enforce:

- A complete price must be KNOWN **and OFFER_SCOPED** to the selected room/rate.
  A generic property price is not rescued by a property link. Inapplicable known
  prices remain observations and block conversion rather than disappearing,
  becoming UNKNOWN, lowering quality or silently eliminating an alternative.
- A distance requires a documented common reference and usable applicability.
  An unverified distance stays visible but cannot produce a within-preference
  decision input, with or without hotel coordinates. No invented reference,
  tolerance or extra hard maximum is introduced.
- Property-level reference/distance/rating facts can be used only with
  `propertyBinding={alternativeId,scope:{roomKey,rateKey},reason,links}`. Its
  identity, selected scope and individual evidence hashes are checked. The
  reviewed successor additionally checks these links against actual reviewed
  fields. This is documented applicability, not independent geographic truth.
- An unverified rating/scale cannot populate `reviewScore`; omission remains
  possible while retaining both observations. Direct offer-scoped and properly
  bound property-scoped ratings retain their supported behavior.

UNKNOWN complete total still permits supported *diagnostic computation* through
the unchanged engine but cannot recommend that incomplete candidate. This differs
from passing a known but inapplicable amount as an applicable complete total.
Complete supported controls, including missing hotel coordinates and family
input, produce exactly the same bridge output. Availability semantics are unchanged.

## 3. A source hash does not certify a transformation

The reviewed successor recomputes a bounded normalization before accepting a
KNOWN claim and requires the actual supporting field, not any field sharing a
screenshot hash:

- Capacity: nonnegative integers or exact limited numeric/number-word guest
  expressions (including `Two guests`, `2 guests`, `Capienza: 4 ospiti` and
  explicit adult/child counts). Unsupported prose requires UNKNOWN/CONFLICTING;
  it is not partially interpreted as a factual violation.
- Units and internal rooms: distinct explicit fields, or the anchored
  `Suite with two internal rooms, one unit` / corresponding Italian structure.
  Neither a room category nor bed count establishes units. Conflicting explicit
  sources cannot support a KNOWN value; an explicit conflict may remain.
- Child conditions: complete, allowlisted semicolon-separated clauses separately
  identify admission, minimum age, adult-price threshold and extra-bed availability.
  Prefix matches with unsupported or contradictory trailing prose are rejected.
  Adult pricing alone proves neither admission nor minimum age; the family stays
  adults plus children at their original ages. No extra beds are added.

These are source-transcription checks, not guarantees that the published source
is factually correct or that a property-wide rule sets the selected tariff amount.
The grammar is deliberately limited. Extending it requires concrete evidence and
regressions, not inferring missing facts or requesting another unchanged review.

The D-0051 test fixture's former universal `beds` link was insufficient proof of
units/capacity. R1 positive controls add **invented explicit source unit fields**
before sealing the synthetic journal and bind claims to their actual source
fields. The original pre-repair counterexamples are retained unchanged. Two
intermediate test-builder mistakes (multi-offer UNKNOWN update and changed room
name without updated scope) were corrected without weakening rejection assertions.

## Versioning, verification and limits

Runtime versions are `stayopti.diagnostic-offer-requirements@1.1` and
`stayopti.reviewed-intent-input-assessment@2.1`; stable module filenames are kept.
An old @1 document is rejected, not silently migrated. The frozen synthetic
counterexamples were explicitly cloned and only their version field updated to
measure the repaired semantic guards. No real preparation or custody binding is
updated, and previous reports remain historical rather than R1 validation.

Local clean-candidate gates: focused **92/92**, complete V3 **1999/1999** (zero
skips), V2 **196/196**; lifecycle **530 PASS / 17 pre-existing SKIP / 0 FAIL**;
security **29/29**, release **101/101**, analytics **31/31**, capacity **9/9**,
beta **4/4**. TypeScript, build, analytics-beta, local-loopback smoke and actual
Windows PowerShell 5.1 parsing pass. The final candidate tree is matched before
selective commit; exact commit/remote binding is recorded in delivery evidence.
This is not GitHub CI, a registry dependency audit or production release
certification. Windows PowerShell 5.1 and CurrentUser-dependent canonical tests
use synthetic fixtures only.

The first CurrentUser full-gate launch stopped before tests with Git's dubious-
ownership check on the sandbox-owned synthetic checkout. A fresh isolated clone
was created by the actual Windows user; no global safe.directory exception, ACL
change or main-worktree modification was used. The tests above ran there.

The old source-centre / selected-location and observed availability / boolean
bookability bridge boundaries remain. No real decision, abstention, recommendation,
custody, training or Golden eligibility is produced. Unsupported vocabulary and
missing evidence require explicit follow-up, not a forced diagnostic execution.

Publication is selective and non-force, work branch only. Each completed software
phase reports local/remote SHA, push status and commits still local. Main, public
behavior, weights, thresholds and roles remain unchanged.
