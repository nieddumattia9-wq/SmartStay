# StayOpti Engine V3-17N — Golden Dataset gap closure plan

**Status:** frozen offline plan; no collection authorized

**Source commit:** `ca0e1196f3d7f653dd54bb59467f081b84850601`

**Plan date:** 2026-08-31

**Recommended execution model:** `LEAN_CONTROLLED`

`RECOMMENDED_EXECUTION_MODEL=LEAN_CONTROLLED`

## 1. Decision and current boundary

V3-17N freezes an implementable, economically sustainable path to the real single-stay Golden Decision Dataset. It creates no case, judgment, replay or provider evidence. It neither authorizes live collection nor changes a policy, threshold, runtime or provider adapter.

The V3-17M result is preserved without reinterpretation:

- 115 receipts remain plumbing and binding evidence, not Golden cases;
- twelve V3-17 phases were inventoried;
- one referenced asset is not verifiable;
- twelve exact duplicate receipt occurrences remain excluded;
- valid Golden, adversarial, counterfactual, human, expert, abstention and provider-neutral replay counts remain zero;
- all V3-17 statistical metrics remain non-calculable;
- `V3_17_GATE_MET=NO`;
- `V3_18_ENTRY_ALLOWED=NO`.

Public Engine V2 remains unchanged. Engine V3 remains unpromoted. Public Split remains `OFF`. RouteStack Public remains on `LIVE_HOLD`; RateHawk remains `RESPONSE_PENDING`; LiteAPI is not qualified or authorized for this collection.

## 2. Frozen targets and statistical unit

The collection is based on distinct real search families, not on treating profile variants as independent market observations.

```text
TARGET_SEARCH_FAMILIES=50
MAX_PRIMARY_CASES_PER_FAMILY=4
TARGET_GOLDEN_CASES=200
TARGET_ADVERSARIAL_CASES=40
TARGET_COUNTERFACTUAL_CASES=40
TARGET_HUMAN_BLIND_JUDGMENTS=300
TARGET_EXPERT_BLIND_JUDGMENTS=100
TARGET_EVALUABLE_ABSTENTIONS=20
TARGET_PROVIDER_NEUTRAL_REPLAYS=100
SEARCH_FAMILY_AGGREGATION_REQUIRED=YES
CASE_AND_SEARCH_FAMILY_DUAL_DENOMINATOR_REQUIRED=YES
PROFILE_VARIANTS_INDEPENDENT=NO
BREAKPOINT_OR_PROFILE_VARIANTS_INDEPENDENT=NO
```

A search family is one immutable real base set defined by:

- destination scope;
- check-in and check-out dates and duration;
- occupancy and currency;
- one normalized alternatives snapshot;
- the provider collection boundary and pagination/completion state;
- one sanitized time bucket or collection window;
- one deterministic source-capsule fingerprint.

Changing only a profile, budget interpretation, role question or controlled evidence dimension does not create a new independent search family. Repeating an identical search against another provider or provider order creates a replay bound to the same family unless the pre-registered design explicitly defines a distinct collection boundary. Multiple judgments on a case increase adjudication evidence, not case or family count.

Every analysis must expose both:

- `CASE_DENOMINATOR`: the count of eligible Golden cases;
- `SEARCH_FAMILY_DENOMINATOR`: the count of distinct eligible real search families.

Case-level results are descriptive. Primary uncertainty, robustness and segment conclusions must be clustered or aggregated by `searchFamilyId`. Dataset partitions, bootstrap/resampling, error analysis and holdout assignment operate at family level so variants of the same snapshot cannot cross partitions.

## 3. Category semantics and non-overlap

The existing V3-17 contract assigns exactly one case kind: `baseline`, `adversarial` or `counterfactual`. The frozen campaign also defines 120 baseline, 40 adversarial and 40 counterfactual slots, totaling 200. V3-17N preserves that one-of taxonomy:

```text
ADVERSARIAL_AND_COUNTERFACTUAL_ARE_GOLDEN_SUBSETS=YES
ADVERSARIAL_COUNTERFACTUAL_OVERLAP_TARGET=0
GOLDEN_TOTAL_ADDITIVE_ACROSS_KINDS=120_BASELINE_PLUS_40_ADVERSARIAL_PLUS_40_COUNTERFACTUAL
```

Thus the specialist categories are subsets of the 200 Golden cases, but a case is counted once in the total and once in its single specialist kind. Overlap is explicitly zero in this plan. A future multi-label design would require a new schema version, migration and decision record; it cannot silently reinterpret this campaign.

The 50-family allocation reaches the current 120/40/40 contract while respecting four cases per family:

| Family allocation | Families | Baseline per family | Adversarial per family | Counterfactual per family | Cases |
| --- | ---: | ---: | ---: | ---: | ---: |
| Symmetric derived | 30 | 2 | 1 | 1 | 120 |
| Adversarial emphasis | 10 | 3 | 1 | 0 | 40 |
| Counterfactual emphasis | 10 | 3 | 0 | 1 | 40 |
| **Total** | **50** | **120** | **40** | **40** | **200** |

The allocation class of each family is assigned before provider collection, not after observing prices, V2/V3 decisions or evaluator preferences.

## 4. Minimum Golden case contract

V3-17O must implement a versioned schema and deterministic validator. Every eligible case must contain at least:

- `goldenCaseId`: stable local opaque ID unrelated to any provider ID;
- `searchFamilyId`, `caseVersion`, `schemaVersion` and `createdAtBucket`;
- sanitized provenance, origin class and transformation provenance;
- profile, budget, generalized destination, duration, occupancy and currency;
- complete normalized alternatives for the decision scope;
- total cost in integer minor units and explicit taxes/fees completeness state;
- quality, reviews and review-reliability evidence;
- location, room, cancellation/flexibility and comfort evidence;
- material missing-evidence declarations and reliability state;
- separate immutable V2 baseline and V3 candidate outputs over the same input;
- precommitted evaluation intent and candidate role;
- abstention eligibility and enumerated reason codes;
- source, decision, evidence and whole-case fingerprints;
- completeness status and enumerated exclusion reasons;
- declarations that commission and commercial ordering were not used;
- declarations that raw provider IDs, booking/prebook IDs, continuation IDs, raw payloads, credentials and PII are absent.

The normalized alternatives must preserve every material fact needed for deterministic replay: complete stay solution, exact room/occupancy scope, price/currency, mandatory-cost state, treatment, cancellation/payment conditions, availability, location, quality, reviews, comfort, evidence provenance, freshness and known/estimated/unknown status.

An incomplete or ambiguous case is retained only in a separate quarantine corpus with its failure reasons. It contributes zero to every Golden, specialist, judgment, abstention and replay denominator.

## 5. Permitted origins

### A. Real normalized snapshot

A real provider response collected under a separately authorized protocol is immediately normalized, minimized and sanitized into a forward-only source capsule. The Golden corpus retains the normalized decision evidence and its integrity bindings, never the raw provider response. This is the only source for baseline cases.

### B. Controlled adversarial case

An adversarial case applies a single pre-registered stress transformation, or a minimal explicitly enumerated transformation set, to an eligible baseline. Allowed challenges include:

- insertion of a dominated option;
- budget expansion monotonicity;
- materially superior quality;
- missing price or unknown taxes;
- high rating with very low review volume;
- better location at disproportionate cost;
- room mismatch;
- non-comparable cancellation;
- near tie;
- no-good-option.

It retains the baseline parent, unchanged source snapshot fingerprint, transformation specification and derivation fingerprint. It is never presented as a second real provider observation.

### C. Counterfactual pair

A counterfactual case changes exactly one pre-registered decision dimension relative to an eligible baseline: budget, profile, distance, comfort requirement, flexibility, quality, price or evidence availability. It contains `counterfactualPairId`, parent binding, changed-field allowlist and proof that all non-target dimensions are byte-equivalent after canonicalization.

Freely generated AI output can propose test ideas or synthetic validator fixtures. It is never a real case, blind human/expert judgment or ground truth.

## 6. Fifty-family stratification

Destinations and dates are not selected in this phase. V3-17Q must qualify a provider before materializing them. The frozen structural matrix uses ten destination slots and five family templates per destination:

```text
DESTINATION_SLOTS=10
SEARCH_FAMILIES_PER_DESTINATION_TARGET=5
MAX_SEARCH_FAMILIES_PER_DESTINATION=6
TOTAL_SEARCH_FAMILIES=10_X_5=50
```

At least three slots must be Italian and at least five must be elsewhere in Europe. The ten slots collectively cover economical, middle-cost and expensive markets and low, medium and high demand regimes. No actual city is frozen until provider coverage, commercial permission, pagination and cost are known.

| Template | Duration band | Lead time | Party | Budget relation | Evidence/cancellation emphasis |
| --- | --- | --- | --- | --- | --- |
| F1 | 1–2 nights | close, 0–14 days | solo | below market | restrictive cancellation |
| F2 | 3–4 nights | medium, 15–60 days | two adults | near market | mixed flexibility |
| F3 | 5–7 nights | advance, 61–120 days | family occupancy | near market | room and occupancy evidence |
| F4 | 8–14 nights | advance, 61–210 days | one or two guests | above market | quality/location trade-off |
| F5 | 15–28 nights | medium or advance | two adults or family | cyclic below/near/above | incomplete evidence and long-stay comfort |

The destination-slot × template assignment is precomputed from a stable seed. Market, demand and budget bands use documented provider-neutral rules fixed before V2/V3 execution. A family is not replaced because it is empty, unfavorable or produces agreement. Coverage failures remain visible.

The complete matrix must cover five approved profiles, the three single-stay roles, budget below/near/above market, one and two guests, family occupancy, flexible/restrictive cancellation, complete/incomplete evidence, multiple distance and quality bands, near ties and no-good-option cases. Controlled derived cases may fill structural challenge cells; they may not manufacture new real families.

## 7. Maximum four cases per family

Each family materializes exactly the number and kinds assigned in Section 3, never more than four primary cases. Case intents are frozen before V2/V3 evaluation. A typical deterministic order is:

1. Balanced Best Choice;
2. Comfort or Maximum Comfort Best Choice/Upgrade question;
3. Savings or Maximum Savings sensible-saving question;
4. the pre-assigned baseline, adversarial or counterfactual role needed by the 120/40/40 matrix.

The exact profile schedule cycles across family strata so all five profiles and three roles are covered. The visible evaluation question declares the neutral decision task—best overall fit, sensible saving or worthwhile upgrade—without exposing V2/V3, provider, policy or any engine-derived winning role. The precommitted evaluation intent cannot be changed after a decision or judgment is observed. Deblind may classify the resulting engine role only after the verdict and cannot change eligibility.

Additional interesting variants are diagnostic-only. They do not increase the Golden or family denominators.

## 8. Provider qualification and HTTP budget

No provider is selected or contacted by V3-17N. Before any collection, V3-17Q must verify and freeze:

- contractual permission for decision comparison and any multi-provider replay use;
- persistence/minimization rights for sanitized normalized evidence;
- documented pagination and deterministic continuation binding;
- observable distinction between provider exhaustion and a technical depth cap;
- numeric total prices, currency, taxes/fees, occupancy, room and cancellation semantics;
- recheck/public-rate capability where required by the Golden contract;
- per-call price, plan, quota, rate limit and the party responsible for billing;
- maximum initial and continuation depth, concurrency, spacing, retry and redirect policy;
- one explicit user authorization tied to a frozen request budget.

The future ceiling is calculated only after those inputs are known:

```text
TOTAL_HTTP_MAX = AUTH + DESTINATION_RESOLUTION + INITIAL_SEARCHES + AUTHORIZED_CONTINUATIONS
```

The plan and dispatcher must share one canonical in-memory request plan. All counters block pre-transport. A ceiling is never a target or minimum. Provider exhaustion and depth cap remain distinct; depth-capped evidence is quarantined or diagnostic according to the future schema and cannot be silently treated as complete.

Current provider state:

| Provider | State | V3-17N calls | Golden qualification |
| --- | --- | ---: | --- |
| RouteStack Public | `LIVE_HOLD` due exhausted public quota | 0 | blocked pending external resolution and new approval |
| RateHawk | `RESPONSE_PENDING` | 0 | not started |
| LiteAPI | existing integration, no authority for this phase | 0 | `NOT_YET_QUALIFIED` |

The executable-state freeze is explicit:

```text
ROUTESTACK_PUBLIC_CALLS_ALLOWED=NO
RATEHAWK_STATUS=RESPONSE_PENDING
LITEAPI_GOLDEN_FEASIBILITY=NOT_YET_QUALIFIED
LIVE_COLLECTION_AUTHORIZED=NO
NEW_USER_APPROVAL_REQUIRED_BEFORE_PROVIDER_CALLS=YES
```

Provider-neutral replay is performed offline over the same normalized case input using canonical provider-order/identity-neutral transformations. It does not create another case or family and does not require a provider call. The 100 replay slots should be distributed as two precommitted replay bindings per family.

## 9. Human blind judgments

The minimum feasible lean assignment is 20 distinct human evaluators × 15 judgments = 300. No evaluator may provide more than 30 judgments, which is 1,000 basis points (10%) of the human total.

```text
MIN_DISTINCT_HUMAN_EVALUATORS=20
MAX_HUMAN_JUDGMENT_SHARE_PER_EVALUATOR_BPS=1000
```

Requirements:

- random, balanced assignment from a frozen seed;
- at least one human judgment per Golden case, with a stratified second judgment on 100 cases;
- at most two judgments from the same evaluator within one search family;
- no duplicate evaluator/case/role assignment;
- alternative side order independently balanced and hidden;
- identical decision facts on both sides;
- V2/V3, provider and policy labels hidden;
- neutral role/task question declared before judgment;
- choices `A`, `B`, `tie` or `insufficient-evidence`/abstention as allowed by the frozen schema;
- confidence recorded separately from preference;
- response time stored only in a bounded bucket;
- immutable receipt before deterministic deblind.

The question evaluates the requested traveler decision under the provided profile and constraints. It must not ask which hotel the evaluator personally prefers without that context.

## 10. Expert blind judgments

The minimum feasible lean assignment is five distinct experts × 20 judgments = 100. No expert may provide more than 25 judgments, which is 2,500 basis points (25%) of the expert total.

```text
MIN_DISTINCT_EXPERT_EVALUATORS=5
MAX_EXPERT_JUDGMENT_SHARE_PER_EVALUATOR_BPS=2500
```

Expert qualification is documented in a separate access-controlled registry and never enters the Decision Trace or Golden case. Qualifying backgrounds may include hospitality operations, property management, travel consulting, revenue management, OTA/distribution or relevant academic research.

The 100 expert assignments are stratified across at least 40 families, all three case kinds, profiles, segments and roles. The same duplicate, side-order, blindness and immutable-receipt rules used for human judgments apply. Mattia may contribute as an experienced host, but cannot be the sole expert, a majority of experts or provide more than the per-evaluator cap.

## 11. Minimal evaluation capsule

V3-17P must build a private, local or access-controlled evaluation tool rather than a public platform. It presents one case at a time with alternatives side by side and equal evidence. It exposes neither engine/provider names nor explanations that reveal the model.

The tool must provide:

- exact phase/protocol version and consent gate;
- deterministic seeded randomization;
- an append-only judgment receipt bound to case, task and side assignment;
- duplicate rejection and replay-safe deblind;
- no free-form PII in the decision dataset;
- withdrawal, deletion and retention workflows;
- sanitized export and deterministic aggregate reconstruction;
- zero provider connectivity.

The evaluator identity/qualification mapping remains outside the dataset. A campaign-scoped pseudonym links valid assignments; the mapping is encrypted or access-controlled, has a retention policy and is deleted when no longer required. Withdrawal removes the evaluator's judgments before the dataset is frozen and forces aggregate regeneration.

## 12. Privacy and data retention

The Golden corpus contains no names, email addresses, phone numbers, precise addresses, credentials, booking/payment identifiers, raw provider identifiers, raw responses, full request URLs, commission or commercial-order fields.

Consent is explicit and versioned. DNT/GPC and withdrawal are fail-closed where applicable. Evaluator consent, qualification and contact data are separated from case and Decision Trace storage. Decision traces contain only decision evidence and local opaque bindings. Judgment exports contain evaluator pseudonyms, not identity.

Raw provider responses are not committed to the repository or included in Golden artifacts. If a future qualified-provider contract requires a protected audit staging area, V3-17Q must define encryption, access, jurisdiction, retention and deletion before collection. The Golden admission path still receives only normalized sanitized capsules.

Retention periods are not invented here. V3-17P/Q must freeze them after legal/privacy review and before consent. Every deletion invalidates affected fingerprints and requires deterministic dataset rebuilding; deleted records cannot remain in metrics.

## 13. Pilot gate

V3-17R is mandatory before the full collection:

```text
PILOT_SEARCH_FAMILIES=5
PILOT_GOLDEN_CASES_MAX=20
PILOT_HUMAN_JUDGMENTS_MIN=30
PILOT_EXPERT_JUDGMENTS_MIN=10
PILOT_EVALUABLE_ABSTENTIONS_TARGET=5
PILOT_PROVIDER_NEUTRAL_REPLAYS_MIN=10
```

The pilot tests schema admission, deterministic validation, family identity, blinding, randomization, evaluator comprehension, response-time buckets, consent, deblind, metric construction, quarantine and leakage prevention. It has a separately frozen provider budget and explicit user authorization.

Pilot cases may enter the final corpus only when schema, thresholds, policy/config versions, sampling rules and evaluator protocol were frozen before collection; no retroactive correction or cherry-picking occurred; and the same final validator accepts them. If a material contract change is needed, all affected pilot cases remain diagnostic-only and the revised pilot must receive separate authority.

## 14. Operational sequence

| Phase | Deliverable | Network/provider boundary | Exit condition |
| --- | --- | --- | --- |
| V3-17O — Golden Case Schema and Offline Validator | schema, family identity, validator, quarantine, SHA-256 binding, synthetic contract fixtures | zero HTTP | deterministic admission/rejection and unchanged thresholds |
| V3-17P — Blind Evaluation Capsule | minimal UI/runner, seeded randomization, consent, append-only receipts, deblind, privacy/delete/export | zero provider HTTP | fake end-to-end judgment flow passes without leakage |
| V3-17Q — Provider Qualification and Cost Freeze | written contract review, provider/exhaustion semantics, price/tax coverage, cost and exact HTTP ceiling, approval gate | documentary only unless separately authorized; no collection | one provider and campaign budget qualified and user-approved |
| V3-17R — Twenty-Case Pilot | no more than five families and twenty cases; pilot judgments, abstentions and offline replays | separately capped and authorized | pilot contract, privacy, blinding and metric pipeline PASS |
| V3-17S — Full Golden Collection | 50 families, 200 cases, 300 human and 100 expert judgments, 20 abstentions, 100 replays | separately capped and authorized | all minimum volumes valid with dual denominators |
| V3-17T — Frozen Evaluation and Gate Decision | immutable dataset/deblind, V2-vs-V3 metrics, family and segment analysis, critical-regression audit | zero collection calls | every frozen volume and performance criterion PASS |

Policy, thresholds and inclusion rules are frozen before the first eligible pilot judgment. No policy is modified after deblind and rescored on the same evidence as proof.

V3-18 may become eligible only after V3-17T returns `passed`. It still requires its own explicit authorization; V3-17T does not start it automatically.

## 15. Stop and fail-closed criteria

Future work stops before further collection when:

- provider terms do not allow comparison or sanitized evidence retention;
- costs, quota or maximum HTTP exposure are unknown and not explicitly accepted;
- pagination, continuation identity or provider exhaustion is not reconstructible;
- prices, taxes, room, occupancy or currency cannot be normalized coherently;
- the schema omits information required to reproduce the decision;
- raw IDs, secrets, PII or commercial fields may enter retained artifacts;
- blinding, seeded side assignment, consent or deletion fails;
- policy/config/thresholds change after eligible collection begins;
- families, profiles or destinations are selected based on observed outcomes;
- empty, adverse or agreeing families are replaced;
- the validator or replay is nondeterministic;
- case/family overlap, duplicate identity or partition leakage is unresolved;
- unrelated dirty paths cannot be preserved.

A stopped or failed attempt contributes zero eligible evidence. Technical test PASS never overrides an evidence-admission failure.

## 16. Cost model and execution options

No monetary amount is asserted because provider prices, evaluator incentives, expert compensation and Mattia's opportunity cost are not established. V3-17Q must freeze known amounts and label every remaining amount unknown before requesting collection authority.

```text
PROVIDER_COST_KNOWN=NO
EXPERT_RECRUITMENT_COST_KNOWN=NO
NO_COST_FIGURES_INVENTED=YES
```

Cost categories remain separate:

- provider authentication, destination, initial, continuation and recheck calls;
- local/private evaluation-tool infrastructure and storage;
- human evaluator recruitment and incentives;
- expert recruitment, qualification and incentives;
- Mattia's review, coordination and adjudication time;
- engineering, privacy and analysis time;
- contingency for invalid/quarantined evidence, never used to replace unfavorable evidence.

| Model | Families/cases | Human/expert judgments | Infrastructure and evidence posture | Cost status |
| --- | --- | --- | --- | --- |
| `LEAN_CONTROLLED` | 50 / 200; exact 120/40/40; max four per family | 300 / 100; 20 humans and 5 experts minimum | minimal private tool, offline derived cases/replays, one qualified provider, exact threshold volumes | unknown until V3-17Q |
| `BALANCED` | 50 / 200 | 400 / 160; broader evaluator redundancy | stronger double-review coverage and audit sampling, same family/case ceiling | unknown until V3-17Q |
| `HIGH_CONFIDENCE` | 60 / up to 240 | 600 / 250; wider evaluator and expert pool | more families, independent audit sample and additional replay redundancy | unknown until V3-17Q |

`LEAN_CONTROLLED` is recommended because it meets every frozen minimum while reducing provider cost through four cases per family, offline adversarial/counterfactual derivation, fully offline provider-neutral replay and a minimal private evaluator capsule. It does not weaken thresholds or treat correlated cases as independent.

## 17. V3-17T promotion gate

V3-17 passes only when all of the following hold simultaneously:

- at least 50 valid real search families and 200 valid Golden cases;
- at least 40 adversarial and 40 counterfactual cases under the frozen one-of taxonomy;
- at least 300 valid human and 100 valid expert blind judgments with evaluator caps satisfied;
- at least 20 evaluable abstentions and 100 provider-neutral replays;
- case and search-family denominators agree with canonical identity and contain no overlap leakage;
- normalized regret V3 ≤ 0.20 and improvement over V2 ≥ 0.02;
- human and expert pairwise V3 win rates each ≥ 0.55;
- V3 ECE ≤ 0.10 and no ECE regression versus V2;
- abstention precision and robust-choice rate each ≥ 0.80;
- instability rate ≤ 0.10;
- maximum segment regret gap ≤ 0.10;
- provider-dependence gap ≤ 0.05;
- zero critical regressions;
- provenance, privacy, consent, fingerprints, quarantine and deblind all validate;
- no post-result policy, threshold, family or inclusion-rule mutation occurred.

Failure of one minimum or metric leaves `V3_17_GATE_MET=NO` and `V3_18_ENTRY_ALLOWED=NO`. Passing the gate makes V3-18 eligible for a separately authorized freeze; it does not promote V3 publicly.

## 18. Immediate next step

The sole next implementation phase is:

`NEXT_STEP_RECOMMENDATION=V3-17O_GOLDEN_CASE_SCHEMA_AND_OFFLINE_VALIDATOR`

V3-17O is offline and must implement only schema, deterministic validation, search-family identity, quarantine and synthetic contract fixtures. It may not collect real cases, contact evaluators, call a provider or modify public runtime behavior.
