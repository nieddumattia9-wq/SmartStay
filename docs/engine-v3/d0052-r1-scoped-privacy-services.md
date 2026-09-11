# D-0052 R1 — Privacy and services at the diagnostic boundary

Source: `b158284fd6d15064f778a0ad70cc5dd71da2b9d0`.
Only `codex/evaluation-d0036-d0041` may receive this repair.

## Reproduction and actual correction

The initial seven assertions failed before code edits; inputs and historical
outputs are retained in `evidence/d0052-r1-synthetic-before.json`. No historical
fixture or previous test outcome was rewritten.

| Synthetic input | Before | Corrected |
| --- | --- | --- |
| Positive and shared bathroom in one amenities field | PRIVATE | CONFLICTING |
| Positive and explicitly unavailable private bathroom | PRIVATE | CONFLICTING |
| Private and shared room in one amenities field | PRIVATE | CONFLICTING |
| Property bath/Wi-Fi positive, selected room denies both | PRIVATE / true | NOT_PRIVATE / false |
| Business control, structured conflicting bathroom | PRIVATE / usable | CONFLICTING / actual policy abstention |
| Business control, offer-scoped false bathroom | PRIVATE / usable | NOT_PRIVATE / actual policy abstention; same-offer positive text instead produces CONFLICTING |
| Business control, true bath and exclusive use, no privacy tokens | UNKNOWN / abstained | PRIVATE / usable, with unit type still UNKNOWN |

The reviewed synthetic controls have incomplete rate evidence and no contextual
bathroom requirement: a bathroom conflict alone does **not** invent a new required
feature or property-quality penalty. The shared-unit conflict makes contextual
suitability incomplete. Business controls exercise the actual existing contextual
bathroom rule. Separate tests exercise explicitly declared essential privacy and
existing mandatory features; factual contradictions reach those checks too.

## Data path and precedence

`reviewedSignals` now forwards full wrappers and individually linked observations.
`diagnostic-scoped-signals-v1.mjs` resolves bounded service clauses, including
negative/conditional/conflicting ones, into the existing evidence format. Wi-Fi
and other supported affirmative services remain scored; negative means known
false, unknown means null, conflict remains conflicting. Unsupported original
clauses survive in provenance and service interpretations, never silently become
a positive token. No new weight or scoring formula is introduced.

`resolveObservedOfferPrivacyV3` consumes those records plus verified structured
claims. The existing D-0047 `privacyEvidence` attaches polarity to each feature
occurrence; its new strict-scoped opt-in rejects unsupported prefixes/tails.
Legacy callers keep the same default behavior. Within a scope, conflicting facts
stay conflicting. Specific room/rate evidence, including uncertainty, prevents a
general property description from replacing it. A property-wide structured privacy
claim is not a selected-rate privacy certificate. Default absent claims do not
erase independently supported textual evidence.

`assessReviewedIntentRequirements` @2.3 verifies known structured booleans against
the linked original field. Exact typed booleans have meaning only in their own
field. Anchored supported phrases are recomputed; unrelated fields, unsupported
phrases, incompatible values or property-to-offer scope promotion are rejected
before the kernel. Conflicting/unknown observations are retained, not guessed.
This is a bounded grammar, not a universal language interpreter.

`computeObservedOfferDiagnosticV3` uses one resolved bathroom fact for contextual
privacy and comfort/mandatory-feature evaluation. Original essential requirement
flags are supplied only after R1 coverage checks; resolved conflicts cannot be
bypassed by a previously positive claim. These original requirements stay distinct
from contextual expectations. All candidates survive, with reasons and evidence.

## Absent, unsupported, previously disconnected

| Class | Representation and consequence |
| --- | --- |
| Evidence absent or explicitly undocumented | Original UNKNOWN and reason retained; no inferred false or privacy certificate |
| Evidence present, grammar cannot resolve it or it is conditional | Original known text retained; interpreted UNKNOWN, with `DATA_PRESENT_GRAMMAR_UNSUPPORTED_OR_CONDITIONAL` |
| Evidence present but contradictory | CONFLICTING, all selected source records retained |
| Valid data previously lost in transfer | Scoped negatives/shared clauses and applicable structured true/false now reach the evaluator |
| Source-incompatible normalized value | Explicit normalization error before calculation, not an invented documented violation |

Only explicit lexical accommodation descriptions support unit type. Exclusive
use does not certify hotel category, comfort, separate rooms, number of units or
sleeping places. Existing child/sofa/bunk/unit requirements and UNKNOWN semantics
are unchanged. Provider labels, input order and human feedback remain non-decisive.

## Verification and limits

The canonical command `npm.cmd run test:engine-v3` compiles and runs the new
`v3ObservedPrivacyIntegrity.test.ts` through the actual entry and compiled kernel.
No private inputs, source observations, feedback, custody or journal are included
in these fixtures. The report records local clean-checkout results separately from
CI; ordinary work-branch push does not trigger the current release workflow.

The old private D-0052 measurement and its exact measured-code copy are untouched
and are not evidence of the corrected behavior. No real recalculation is performed
in R1. No full robustness, regret, Golden readiness or public behavior claim is made.
Future unsupported phrases still need explicit evidence-preserving normalization,
not a positive substring or an invented fact. No entire registry-network audit or
GitHub CI result is inferred from offline local gates.

## Recorded local validation

Windows CurrentUser isolated candidate, installed offline dependencies and actual
Windows PowerShell 5.1 (not pwsh): **45/45 new regressions**, **168/168 targeted**
including the 123 retained D-0052/D-0051 R1/D-0050/D-0041 controls; canonical V3
**2075/2075**, V2 **196/196**. Lifecycle 530 PASS / 17 pre-existing explicit SKIP;
security 29, release 101, analytics 31, capacity 9 and beta 4 PASS. Typecheck,
build, analytics-beta gate, local loopback smoke and PS 5.1 parse **13/13 PASS**.
Scoped secret/private-artifact/raw-token scans and both Git whitespace checks PASS.
Seven excluded and seventeen sealed files are byte-identical. No registry-network
audit, new GitHub CI run, private diagnostic rerun or real custody operation is
claimed. Final tree/source preservation checks precede the selective commit.

Publication inventory: two entry/assessment scripts, the scoped-signal helper,
observed kernel and privacy resolver, the shared polarity opt-in, synthetic helper
and tests, historical synthetic failure record, R1 report/decision, current state
and append-only decision log (13 files). Delivery records actual push outcome,
exact local/remote SHA and remaining commits; success is not inferred from tests.
