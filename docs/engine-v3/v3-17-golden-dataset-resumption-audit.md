# StayOpti Engine V3-17M — Golden Dataset inventory and gate reconciliation

**Status:** offline inventory complete; V3-17 gate not met

**Source commit:** `5391e493131f49aa3bbab9da07d4c02091440c45`

**Audit date:** 2026-08-30

**Public state:** Engine V2 unchanged; Engine V3 not promoted; public Split `OFF`; RouteStack Public `LIVE_HOLD`; RateHawk `RESPONSE_PENDING`

## 1. Decision

V3-17M reconstructs the current single-stay Golden Decision Dataset state without collecting or manufacturing evidence. The inventory is reliable, but the V3-17 gate is not met.

The repository contains an authoritative cumulative ledger of **115 Golden receipts** and **five decision-research-usable negative-outcome contexts**. Neither category is automatically a Golden case. The retained local evidence does not provide an admitted, independently replayable single-stay case with the complete decision input, alternatives, evidence, profile, evaluated role, V2 baseline, V3 candidate, provenance and integrity binding required by V3-17A. Consequently, this audit admits **zero** cases or judgments into every quantitative V3-17 threshold.

This is deliberately conservative. It does not erase the 115 receipts or the five research contexts; it keeps them in their proper evidence classes. It also does not count collection plans, technical fixtures, synthetic curricula, teacher outputs, Split evidence or test passes as real Golden evidence.

`V3_17M_STATUS=PASS` means that the inventory and gaps below are reproducible from local evidence. It does not mean that V3-17 passed.

## 2. Method and precedence

The audit was performed offline from the exact source commit and used these rules:

1. Follow the Product Constitution, current-state record, execution guardrails, decision log and source-registry precedence.
2. Treat the integrated V3 roadmap and the accepted V3-17 measurement-foundation decision as normative. Later accepted decisions override older checkpoint wording without rewriting history.
3. Classify every object before counting it: collection receipt, execution receipt, validation receipt, Golden case, blind judgment, evaluator, comparison or provider-neutral replay.
4. Admit a Golden case only when the locally retained object satisfies the full V3-17A contract and has verifiable provenance and integrity.
5. Deduplicate by canonical identity or fingerprint. Historical cumulative checkpoints are not additive.
6. Keep planned slots, synthetic diagnostics, technical tests and Split assets out of the single-stay evidence denominator.
7. Mark a referenced asset that cannot be inspected locally as `REFERENCED_NOT_VERIFIABLE` and do not infer its content.
8. Preserve all frozen thresholds; no threshold is recalibrated after observing the inventory.

No credential file was loaded, no provider was contacted and no HTTP request was made.

## 3. Sources inspected

The inventory used the following locally verifiable source classes:

- the current integrated Engine V3 roadmap, including V3-12 through V3-18;
- the V3-17A contract and metrics gate;
- V3-17B campaign plan and field guide;
- V3-17C intake contract and operator guide;
- V3-17D capture protocol and operator guide;
- the V3-17F checkpoint and committed fixture;
- the canonical Windows runner guardrails describing V3-17G through V3-17L;
- available V3-17A–V3-17L Evidence ZIP summaries, manifests and sanitized results;
- available post-L recovery and accounting Evidence ZIPs, including V3-17BA, V3-17BC and V3-17BF;
- committed V3-17 fixtures, ledger modules and tests;
- the V3-12B1 capsule contract, V3-12B2 30-case synthetic corpus, V3-12A legacy quarantine, V3-14 nine-case teacher curriculum and V3-14 abstention protocol;
- blind packet, deblind, teacher and measurement infrastructure;
- the R2.11 Split evidence seal, solely to enforce separation from single-stay Golden evidence.

The historical Lisbon material referenced by the accepted measurement-foundation decision has no retained complete normalized replay snapshot. It is classified as one `REFERENCED_NOT_VERIFIABLE` asset and contributes zero cases.

Uncommitted, pre-existing user work was not treated as canonical evidence and was neither read as authority nor modified.

## 4. Object inventory and counting boundary

### 4.1 Receipts are not cases

The current ledger reports 115 Golden receipts. V3-17F's three-receipt checkpoint and V3-17G's nine-receipt cumulative checkpoint are historical subsets of that ledger; adding `3 + 9 + 115` would count the same receipt occurrences more than once. Twelve historical receipt occurrences are therefore excluded from additive totals. This is a detected counting overlap, not evidence corruption.

The 115 receipts prove collection plumbing, deterministic binding and cumulative accounting. The accepted V3-17 measurement-foundation decision explicitly states that they do not, by themselves, provide the complete normalized case objects required for regret, blind comparison, calibration or provider-neutral replay metrics.

### 4.2 Five research contexts are not Golden cases

The committed negative-outcome baseline binds five sanitized, decision-research-usable contexts. They cover Balanced, Savings, Comfort and Maximum Comfort profiles; central, southern and northern European urban market classes; and stays of seven or ten nights. They do not retain a complete normalized alternatives snapshot, evaluated single-stay role, blind V2/V3 comparison or admitted human/expert judgment. They remain useful research context and contribute zero Golden cases.

### 4.3 Technical and synthetic assets

- V3-12B2 contains 30 deterministic synthetic cases and explicitly declares `technicalDiagnosticOnly`, no human verdicts and no Golden admission.
- V3-14 contains nine synthetic curriculum cases and nine teacher judgments. Teacher/Codex output is not a blind human or expert judgment.
- V3-12A contains 15 legacy diagnostic judgments in quarantine; they are non-replayable and excluded.
- The measurement-foundation technical fixture is a diagnostic capsule and adds no Golden evidence.
- B1 capsule, B1 blind pipeline, B2 corpus, lifecycle and regression passes validate infrastructure only.

### 4.4 Split boundary

R1, R2 and Split fixtures do not satisfy the autonomous single-stay Golden contract and can leak a Split outcome into the decision target. They are excluded. The R2.11 seal remains authoritative: public Split is `OFF` and its research evidence is neither added to nor used to compensate for the single-stay dataset.

## 5. Quantitative inventory

`Found` counts locally identifiable candidate objects of the relevant class, not planned slots. `Verifiable` means that the candidate's retained local representation can be inspected and integrity-bound. `Valid` is the only column used against the frozen threshold.

| Category | Found | Verifiable | Valid | Duplicates | Excluded | Threshold | Gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Golden cases | 5 | 5 | 0 | 0 | 5 | 200 | 200 |
| Adversarial cases | 0 | 0 | 0 | 0 | 0 | 40 | 40 |
| Counterfactual cases | 0 | 0 | 0 | 0 | 0 | 40 | 40 |
| Human blind judgments | 15 | 15 | 0 | 0 | 15 | 300 | 300 |
| Expert blind judgments | 0 | 0 | 0 | 0 | 0 | 100 | 100 |
| Evaluable abstentions | 2 | 2 | 0 | 0 | 2 | 20 | 20 |
| Provider-neutral replays | 5 | 5 | 0 | 0 | 5 | 100 | 100 |

The two abstention objects and five replay objects are sanitized proof fingerprints/bindings from the early receipt checkpoints. They are verifiable as receipt attachments, but no locally admitted Golden case and adjudicated evaluation makes them evaluable for the V3-17 metrics gate. They are therefore excluded rather than silently upgraded.

Planned campaign volumes—200 case slots, 300 human assignments, 100 expert assignments, 20 abstention challenges and 100 replay slots—are not included in `Found`.

`COUNTING_OVERLAP_DETECTED=YES`

`EXACT_DUPLICATES_EXCLUDED=12`

`SEMANTIC_DUPLICATES_EXCLUDED=0`

No semantic duplicate count is asserted because the retained evidence is insufficient to compare complete case semantics. Revisions are resolved by the canonical current ledger, not by choosing the variant most favorable to V3. Cases with non-reconstructible identity contribute zero.

## 6. V3-17A–V3-17L reconstruction

| Phase | Historical status | Expected assets | Assets found | Verifiability | Valid contribution |
| --- | --- | --- | --- | --- | --- |
| V3-17A | PASS — contract frozen, gate collection-required | dataset contract, metrics gate, initial diagnostic inventory | contract, gate, fixture with 0 cases, 0 judgments and 15 legacy diagnostics | Fully locally verifiable | 0 cases; 0 judgments |
| V3-17B | PASS — campaign planned | 200 slots, 400 blind assignments, 20 abstention challenges, 100 replay slots | deterministic campaign plan; 0 receipts and 0 assignment claims in fixture | Fully locally verifiable as a plan | 0 evidence objects |
| V3-17C | PASS — intake boundary installed | real capture intake and receipt validation | intake contract and empty capture fixture | Fully locally verifiable as infrastructure | 0 evidence objects |
| V3-17D | PASS — controlled-capture protocol installed | baseline plan and controlled session contract | protocol, guide and empty session fixture | Fully locally verifiable as infrastructure | 0 evidence objects |
| V3-17E | PASS — controlled live pilot | three captured baseline receipts and sanitized source evidence | Evidence v2 reports 3/3 captures and 15 calls | Receipt capture verifiable; not an admitted complete Golden dataset | 3 receipts only; 0 valid cases |
| V3-17F | PASS — checkpoint committed | three receipts, two replay proofs, one abstention proof | document, module and fixture with 3 receipts | Fully locally verifiable as a checkpoint | 0 valid cases/replays/abstentions |
| V3-17G | REVIEW — partial batch retained | ten requested captures | six captured, four failed, nine cumulative receipts; three replay proofs and one abstention challenge in batch evidence | Sanitized Evidence available; historical wording inconsistency resolved by structured total 9 | 6 new receipts only; 0 valid cases |
| V3-17H | FAIL — PowerShell collection error | resumed live collection | failure evidence; cumulative receipts preserved at 9 | Failure boundary locally verifiable | 0 |
| V3-17I | FAIL — runner/preflight repair attempts | reproducible Windows loader | v1–v5 failure history; no patch or receipt change | Canonical guardrails and Evidence available | 0 |
| V3-17J | FAIL diagnostic followed by later audit closure | canonical Windows command audit | failed collector Evidence and later canonical closure record | Outcome verifiable; not case evidence | 0 |
| V3-17K | PASS — Prebook identity repair | deterministic identity and Windows runner repair | v3 repair recorded; no provider collection | Fully verifiable as technical repair | 0 |
| V3-17L | PASS technical verification; Golden unchanged | controlled Rates/Prebook verification | latest Evidence reports two read-only calls and `countedAsGoldenReceipt=false`; cumulative 9 | Fully verifiable as technical evidence | 0 |

Twelve phases were inventoried. A phase name, PASS receipt or technical verification does not close the Golden gate. Later V3-17 work outside A–L brought the cumulative receipt ledger to 115 and retained five negative-outcome research contexts, but the accepted V3-17 decision keeps every Golden and evaluator increment at zero.

## 7. Qualitative coverage

There is no valid Golden-case denominator, so percentages would be invented. The table distinguishes planned or diagnostic coverage from gate-valid evidence.

| Dimension | Locally observed planning or diagnostic coverage | Gate-valid coverage |
| --- | --- | --- |
| User profiles | V3-17B plans five profiles; the five research contexts cover Balanced, Savings, Comfort and Maximum Comfort, not the full matrix | Not measurable |
| Choice / Saving / Upgrade | Role-aware contracts and synthetic fixtures exercise these roles | Not measurable |
| Abstention | Synthetic near-tie/no-good-option cases and two early proof bindings exist | 0 evaluable abstentions |
| Destinations | V3-17D plans 20 European destinations; research contexts expose only broad sanitized market classes | Not measurable |
| Stay duration | Campaign plans multiple durations; research contexts cover 7 and 10 nights | Not measurable |
| Budget band | Planned campaign stratification exists | Not measurable |
| Property category | Required by the Golden contract but not reconstructible in an admitted corpus | Not measurable |
| Quality | Synthetic and decision-science fixtures cover quality trade-offs | Not measurable |
| Distance | Synthetic and planned cases cover location trade-offs | Not measurable |
| Cancellation | Contract requires evidence, but no admitted corpus denominator exists | Not measurable |
| Known/unknown taxes | Technical fixtures exercise cost completeness | Not measurable |
| Room evidence | Required by capture/intake contracts; no admitted corpus denominator exists | Not measurable |
| Missing evidence | Technical curricula include missing-evidence diagnostics | Not measurable |
| Near tie | Synthetic B2/curriculum cases exist | Not measurable |
| No good option | Synthetic curriculum and abstention protocol cover it | Not measurable |
| Provider | Provider-neutral by contract; provider-dependence pairs are not admitted | Not measurable |
| User segments | Campaign plans segmented allocation | Not measurable |

The visible concentration in the five research contexts—urban European markets, seven/ten-night durations and no Maximum Savings profile—cannot be corrected or generalized in this audit. The much broader synthetic coverage is useful for engineering regressions but cannot fill the evidence gap.

## 8. Frozen metric gates

The quantitative performance gates remain unchanged:

- normalized regret V3 at most 0.20;
- regret improvement over V2 at least 0.02;
- human pairwise V3 win rate at least 0.55;
- expert pairwise V3 win rate at least 0.55;
- V3 expected calibration error at most 0.10 with no ECE regression versus V2;
- abstention precision at least 0.80;
- robust-choice rate at least 0.80;
- instability rate at most 0.10;
- maximum segment regret gap at most 0.10;
- provider-dependence gap at most 0.05;
- zero critical regressions.

None of the statistical metrics is calculable from a zero-case, zero-valid-judgment corpus. Passing technical regressions does not substitute for their denominators.

| Metric | Calculable | Reason |
| --- | --- | --- |
| Normalized regret and V2 improvement | No | no admitted cases with outcome/baseline/candidate measurement |
| Human pairwise win rate | No | 0 valid blind human judgments |
| Expert pairwise win rate | No | 0 valid blind expert judgments |
| Expected calibration error | No | no admitted predictions and observed outcomes |
| Abstention precision | No | 0 evaluable abstentions |
| Robust-choice rate | No | no admitted replay/judgment denominator |
| Instability rate | No | 0 valid provider-neutral replays |
| Segment regret gap | No | no admitted segment outcomes |
| Provider-dependence gap | No | 0 valid provider-neutral replays |

## 9. Gate and blocker

`V3_17_GATE_MET=NO` because every required evidence category is below its frozen minimum and the downstream statistical gates are not calculable. `V3_18_ENTRY_ALLOWED=NO`.

The primary blocker is not missing technical infrastructure. It is the absence of a locally retained, schema-complete and integrity-verifiable corpus of real single-stay cases plus blind human/expert judgments, evaluable abstentions and provider-neutral replay pairs. Existing receipts cannot be promoted by relabeling, and missing normalized source evidence cannot be reconstructed from aggregate counts.

This finding does not assert that V3 is worse than V2. It says that the evidence required to compare them has not been admitted.

## 10. Resume decision

The single next operational step is:

`NEXT_STEP_RECOMMENDATION=V3-17N_GOLDEN_DATASET_GAP_CLOSURE_PLAN`

V3-17N must plan how to acquire or admit the exact missing evidence without new live collection unless separately authorized. It must retain the current frozen thresholds and explicitly address complete normalized source retention, blind evaluator provenance, abstention adjudication, replay pairing and non-overlapping case identity.

V3-18 is not started by this audit. Public V2 remains unchanged, Engine V3 remains unpromoted, public Split remains `OFF`, RouteStack Public remains on `LIVE_HOLD`, and RateHawk remains `RESPONSE_PENDING`.
