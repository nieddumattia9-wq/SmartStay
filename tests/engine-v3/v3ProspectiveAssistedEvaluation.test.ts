import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  PROSPECTIVE_ASSISTED_FIELDS_V3,
  createProspectiveAssistedComparisonV3,
  createProspectiveAssistedSessionV3,
  createSyntheticProspectiveAssistedInputV3,
  createSyntheticProspectiveAssistedPlanV3,
  fingerprintProspectiveAssistedV3,
  normalizeProspectiveAssistedEvidenceV3,
  prospectiveAssistedContentFingerprintV3,
  prospectiveAssistedLeadTimeDaysV3,
  prospectiveAssistedLocalDateV3,
  prospectiveAssistedLocalDateTimeV3,
  replayProspectiveAssistedEventsV3,
  transitionProspectiveAssistedSessionV3,
  validateProspectiveAssistedSessionV3,
  type ProspectiveAssistedEventV3,
  type ProspectiveAssistedInputV3,
  type ProspectiveAssistedJudgmentV3,
  type ProspectiveAssistedStateV3,
} from "../../src/engine-v3/evaluation/prospectiveAssistedEvaluationV3";

const input = (count: 5 | 8 = 5) => createSyntheticProspectiveAssistedInputV3(count);
const state = (count: 5 | 8 = 5) => createProspectiveAssistedSessionV3(input(count));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function eventBase(current: ProspectiveAssistedStateV3) {
  return { eventId: `SYNTHETIC_EVENT_${current.revision + 1}`, at: new Date(Date.parse("2030-01-01T11:00:00.000Z") + current.revision * 1000).toISOString(), expectedRevision: current.revision };
}
function reviewed(current = state()) {
  for (const alternative of current.input.alternatives) for (const field of PROSPECTIVE_ASSISTED_FIELDS_V3) {
    current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "REVIEW_FIELD", alternativeId: alternative.alternativeId, field, status: alternative.fields[field].status === "UNKNOWN" ? "NOT_VERIFIABLE" : "CONFIRMED", reviewerId: "SYNTHETIC_MATTIA" });
  }
  return transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CONFIRM_REVIEW", reviewerId: "SYNTHETIC_MATTIA", contentFingerprint: prospectiveAssistedContentFingerprintV3(current.input) });
}
function judgment(current: ProspectiveAssistedStateV3): ProspectiveAssistedJudgmentV3 {
  return {
    judgmentVersion: "stayopti.v3.prospective-assisted-judgment@1", judgmentId: "SYNTHETIC_JUDGMENT_001", sessionId: current.input.sessionId,
    contentFingerprint: prospectiveAssistedContentFingerprintV3(current.input), evaluatorPseudonym: "SYNTHETIC_MATTIA", evaluatorClass: "HUMAN_SIMULATION",
    choice: "SELECT", selectedAlternativeIds: [current.input.alternatives[0]!.alternativeId], confidence: 4,
    reasonCodes: ["BETTER_CONTEXTUAL_FIT"], consentVersion: "synthetic-consent@1", createdAtBucket: "2030-01", blockingField: null,
  };
}
function record(current = reviewed(), value = judgment(current)) {
  // Positive fixtures include the actual declaration event, separately from the
  // review events. PA62/63 exercise the raw transition without this fixture step.
  if (!current.events.some((record) => record.event.type === "RECORD_EXPOSURE" && record.event.reviewerId === value.evaluatorPseudonym)) {
    current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_EXPOSURE", reviewerId: value.evaluatorPseudonym, exposure: { ...current.exposures[value.evaluatorPseudonym]! } });
  }
  return transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_JUDGMENT", judgment: value });
}
function rejectInput(mutate: (value: ProspectiveAssistedInputV3) => void, expected: RegExp) {
  const value = input(); mutate(value); assert.throws(() => createProspectiveAssistedSessionV3(value), expected);
}
function rejectJudgment(mutate: (value: ProspectiveAssistedJudgmentV3) => void, expected: RegExp) {
  const current = reviewed(); const value = judgment(current); mutate(value); assert.throws(() => record(current, value), expected);
}

test("PA01 five alternatives form a synthetic diagnostic technical candidate", () => {
  const result = validateProspectiveAssistedSessionV3(state());
  assert.equal(result.valid, true); assert.equal(result.eligible, true); assert.equal(result.transcriptReviewed, false);
  assert.equal(result.classification, "DIAGNOSTIC_ONLY"); assert.equal(result.engineReplayAllowed, false); assert.equal(result.automaticGoldenAdmission, false);
});
test("PA02 eight alternatives are preserved without reducing evidence", () => {
  const current = state(8); assert.equal(current.input.alternatives.length, 8); assert.equal(current.input.evidence.length, 16); assert.equal(validateProspectiveAssistedSessionV3(current).valid, true);
});
test("PA03 real input and non-synthetic identity are rejected", () => {
  rejectInput((value) => { (value as unknown as { synthetic: boolean }).synthetic = false; }, /SYNTHETIC_BOUNDARY_REQUIRED/);
  rejectInput((value) => { value.sessionId = "REAL_SESSION"; }, /SYNTHETIC_BOUNDARY_REQUIRED/);
});
test("PA04 scenario plan contains no observations and precedes generated data", () => {
  const plan = createSyntheticProspectiveAssistedPlanV3(5, "2030-01-01T10:00:00.000Z");
  assert.deepEqual(Object.keys(plan).sort(), ["scenario", "selection"]); assert.deepEqual(plan.scenario, input().scenario); assert.deepEqual(plan.selection, input().selection);
});
test("PA05 scenario frozen at or after observation is rejected", () => {
  rejectInput((value) => { value.scenario.frozenAt = value.collectionWindow.start; }, /PROSPECTIVE_WINDOW_INVALID/);
});
test("PA06 selection must be frozen before observation", () => {
  rejectInput((value) => { value.selection.frozenAt = "2030-01-01T10:02:00.000Z"; }, /PROSPECTIVE_WINDOW_INVALID/);
});
test("PA07 observedAt cannot be replaced by import/custody time", () => {
  rejectInput((value) => { value.alternatives[0]!.observedAt = "2030-01-02T10:01:00.000Z"; }, /OBSERVATION_OUTSIDE_WINDOW/);
});
test("PA08 IANA timezone uses destination calendar dates across UTC midnight", () => {
  assert.equal(prospectiveAssistedLocalDateV3("2030-01-01T23:30:00.000Z", "Europe/Rome"), "2030-01-02");
  assert.equal(prospectiveAssistedLeadTimeDaysV3("2030-01-01T23:30:00.000Z", "2030-01-03", "Europe/Rome"), 1);
});
test("PA09 IANA daylight-saving conversion does not invent check-in time", () => {
  assert.equal(prospectiveAssistedLocalDateV3("2026-03-29T22:30:00.000Z", "Europe/Rome"), "2026-03-30");
  assert.equal(prospectiveAssistedLeadTimeDaysV3("2026-03-29T22:30:00.000Z", "2026-03-31", "Europe/Rome"), 1);
  assert.equal(prospectiveAssistedLocalDateV3("2026-10-25T22:30:00.000Z", "Europe/Rome"), "2026-10-25");
});
test("PA10 unknown IANA zone and inconsistent declared local date are rejected", () => {
  assert.throws(() => prospectiveAssistedLocalDateV3("2030-01-01T10:00:00.000Z", "Europe/NotAZone"), /IANA_ZONE_INVALID/);
  rejectInput((value) => { value.alternatives[0]!.observedLocalDate = "2030-01-02"; }, /LOCAL_DATE_OR_LEAD_TIME_INVALID/);
});
test("PA11 collection-window limit is enforced", () => {
  rejectInput((value) => { value.collectionWindow.end = "2030-01-02T10:01:00.000Z"; }, /PROSPECTIVE_WINDOW_INVALID/);
});
test("PA12 missing, malformed and unbound source hashes fail closed", () => {
  rejectInput((value) => { value.sourceBindings.descriptorSha256 = "wrong"; }, /SOURCE_BINDINGS_INVALID/);
  rejectInput((value) => { delete (value.sourceBindings as Partial<typeof value.sourceBindings>).archiveSha256; }, /SOURCE_BINDINGS_INVALID/);
});
test("PA13 each screenshot and field reference belongs to its own alternative", () => {
  rejectInput((value) => { value.alternatives[0]!.fields.room.evidenceRefs = ["EVIDENCE_SCREEN_2"]; }, /FIELD_EVIDENCE_REFERENCE_INVALID/);
  rejectInput((value) => { value.evidence = value.evidence.filter((entry) => entry.evidenceRef !== "EVIDENCE_SCREEN_1"); }, /ALTERNATIVE_SCREENSHOT_REQUIRED/);
});
test("PA14 four or nine alternatives cannot pass as a complete 5–8 set", () => {
  rejectInput((value) => { value.alternatives.pop(); }, /ALTERNATIVE_COUNT_INVALID/);
  const nine = input(8); nine.alternatives.push(clone(nine.alternatives[0]!)); assert.throws(() => createProspectiveAssistedSessionV3(nine), /ALTERNATIVE_COUNT_INVALID/);
});
test("PA15 duplicate alternatives do not create additional cases", () => {
  rejectInput((value) => { value.alternatives[1]!.alternativeId = value.alternatives[0]!.alternativeId; }, /ALTERNATIVE_ID_INVALID_OR_DUPLICATE/);
});
test("PA16 guest occupancy and source surface remain uniform", () => {
  rejectInput((value) => { value.alternatives[0]!.guestConfigurationFingerprint = "3||1"; }, /ALTERNATIVE_SCOPE_MISMATCH/);
  rejectInput((value) => { (value.alternatives[0] as unknown as { sourceSurface: string }).sourceSurface = "OTHER_SURFACE"; }, /ALTERNATIVE_SCOPE_MISMATCH/);
});
test("PA17 assisted mode never claims browser automation was not used", () => {
  assert.equal(input().acquisition.browserAutomation, "ASSISTED_BROWSER_INTERACTION_DISCLOSED");
  rejectInput((value) => { (value.acquisition as unknown as { browserAutomation: string }).browserAutomation = "NOT_USED_VERIFIED"; }, /ACQUISITION_DISCLOSURE_INVALID/);
});
test("PA18 incognito, logged-out and personalization are separate states", () => {
  const value = input(); value.acquisition.loggedOut = "UNKNOWN";
  const result = validateProspectiveAssistedSessionV3(createProspectiveAssistedSessionV3(value));
  assert.equal(result.valid, true); assert.equal(result.eligible, false); assert.deepEqual(result.eligibilityBlockers, ["CONSUMER_CONDITIONS_NOT_VERIFIED"]);
  assert.equal(input().acquisition.incognito, "UNKNOWN");
});
test("PA19 explicit UNKNOWN is normalized case-insensitively without zero or false", () => {
  const source = input().alternatives[0]!.fields.mealPlan;
  for (const text of ["UNKNOWN", "unknown", " Unknown "]) {
    const result = normalizeProspectiveAssistedEvidenceV3({ ...source, value: text });
    assert.equal(result.status, "UNKNOWN"); assert.equal(result.value, null); assert.equal(result.reliability, "UNKNOWN"); assert.equal(result.unknownReason, "EXPLICIT_UNKNOWN_TEXT");
  }
});
test("PA20 missing required wrapper is not an explicit UNKNOWN", () => {
  rejectInput((value) => { delete (value.alternatives[0]!.fields as Partial<typeof value.alternatives[0]["fields"]>).mealPlan; }, /EVIDENCE_WRAPPER_REQUIRED|FIELD_SET_INVALID/);
});
test("PA21 unknown meal plan preserves evidence but blocks decision eligibility", () => {
  const value = input(); value.alternatives[0]!.fields.mealPlan = { status: "UNKNOWN", value: null, unknownReason: "NOT_DOCUMENTED", reliability: "UNKNOWN", evidenceRefs: [] };
  const result = validateProspectiveAssistedSessionV3(createProspectiveAssistedSessionV3(value));
  assert.equal(result.valid, true); assert.equal(result.eligible, false); assert.ok(result.eligibilityBlockers.some((code) => code.endsWith(":mealPlan")));
});
test("PA22 total must equal both known payment components, unknown remains unknown", () => {
  rejectInput((value) => {
    const fields = value.alternatives[0]!.fields; fields.payNowMinorUnits = { ...fields.totalStayPriceMinorUnits, value: 39960 }; fields.payAtPropertyMinorUnits = { ...fields.totalStayPriceMinorUnits, value: 0 };
  }, /PAYMENT_DECOMPOSITION_INVALID/);
  assert.equal(validateProspectiveAssistedSessionV3(state()).eligible, true);
});
test("PA23 observed inclusive-tax words and missing breakdown remain separate", () => {
  const fields = state().input.alternatives[0]!.fields;
  assert.equal(fields.taxInclusionStatement.value, "Include tasse e costi"); assert.equal(fields.taxBreakdown.status, "UNKNOWN");
  const result = validateProspectiveAssistedSessionV3(state()); assert.equal(result.exactBookable, false); assert.equal(result.verifiedCheckoutTotal, false);
});
test("PA24 verified textual location does not become numeric center distance", () => {
  const current = reviewed(); const result = createProspectiveAssistedComparisonV3(current);
  assert.equal(result.publicView.alternatives[0]!.fields.distanceMeters!.value, null);
  assert.equal(result.publicView.alternatives[0]!.fields.locationText!.status, "KNOWN");
});
test("PA25 numeric refundability and implausible dates are rejected", () => {
  rejectInput((value) => { value.alternatives[0]!.fields.refundability.value = "218.50"; }, /CONDITION_TEXT_INVALID/);
  rejectInput((value) => { value.alternatives[0]!.fields.cancellation.value = "Cancellazione gratuita prima del 122 ottobre 2030"; }, /CONDITION_TEXT_INVALID/);
});
test("PA26 asymmetric declared detail coverage blocks comparative eligibility", () => {
  const value = input(); value.alternatives[0]!.detailCoverageKeys.pop();
  const result = validateProspectiveAssistedSessionV3(createProspectiveAssistedSessionV3(value)); assert.equal(result.eligible, false); assert.ok(result.eligibilityBlockers.includes("ASYMMETRIC_DETAIL_COVERAGE"));
});
test("PA27 single-item optional evidence is retained with explicit non-comparable scope", () => {
  const value = input(); value.alternatives[0]!.fields.taxBreakdown = { ...value.alternatives[0]!.fields.taxInclusionStatement, value: "Synthetic separate tax detail" };
  const current = reviewed(createProspectiveAssistedSessionV3(value)); const view = createProspectiveAssistedComparisonV3(current);
  assert.equal(current.input.alternatives[0]!.fields.taxBreakdown.status, "KNOWN");
  assert.ok(view.publicView.excludedFromComparison.includes("taxBreakdown")); assert.equal(view.publicView.alternatives.filter((entry) => entry.fields.taxBreakdown!.value !== null).length, 1); assert.ok(view.publicView.alternatives.every((entry) => entry.fields.taxBreakdown!.comparativeEligibility === "AUDIT_ONLY_NOT_COMPARABLE"));
});
test("PA28 no public comparison before explicit review", () => {
  assert.throws(() => createProspectiveAssistedComparisonV3(state()), /COMPARISON_NOT_READY/);
  assert.equal(createProspectiveAssistedComparisonV3(reviewed()).publicView.alternatives.length, 5);
});
test("PA29 field review is versioned and marks actual synthetic exposure", () => {
  const current = state(); const next = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "REVIEW_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "room", status: "CONFIRMED", reviewerId: "SYNTHETIC_MATTIA" });
  assert.equal(next.fieldReviews["SYNTHETIC_ALTERNATIVE_1.room"]!.status, "CONFIRMED"); assert.equal(next.exposures.SYNTHETIC_MATTIA!.caseDataSeen, true); assert.equal(next.reviewedFingerprint, null);
});
test("PA30 UNVERIFIABLE cannot be marked while a known value remains", () => {
  const current = state(); assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "REVIEW_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "room", status: "NOT_VERIFIABLE", reviewerId: "SYNTHETIC_MATTIA" }), /UNVERIFIABLE_FIELD_MUST_BE_UNKNOWN/);
});
test("PA31 full review must bind exact current content fingerprint", () => {
  const current = state(); assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CONFIRM_REVIEW", reviewerId: "SYNTHETIC_MATTIA", contentFingerprint: "a".repeat(64) }), /REVIEW_BINDING_INVALID/);
});
test("PA32 targeted correction resets approval without mutating previous state", () => {
  const current = reviewed(); const before = JSON.stringify(current); const value = { ...current.input.alternatives[0]!.fields.mealPlan, value: "Solo pernottamento sintetico confermato" };
  const next = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CORRECT_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "mealPlan", value, reasonCode: "TRANSCRIPTION_CORRECTION" });
  assert.equal(JSON.stringify(current), before); assert.equal(next.reviewedFingerprint, null); assert.equal(next.dataRevision, 1); assert.equal(next.input.scenario.budgetMinorUnits, current.input.scenario.budgetMinorUnits);
});
test("PA33 invalid payment correction rejected atomically", () => {
  let current = state();
  current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CORRECT_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "payNowMinorUnits", value: { ...current.input.alternatives[0]!.fields.totalStayPriceMinorUnits, value: 39960 }, reasonCode: "TRANSCRIPTION_CORRECTION" });
  const before = current.stateFingerprint;
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CORRECT_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "payAtPropertyMinorUnits", value: { ...current.input.alternatives[0]!.fields.totalStayPriceMinorUnits, value: 0 }, reasonCode: "TRANSCRIPTION_CORRECTION" }), /PAYMENT_DECOMPOSITION_INVALID/);
  assert.equal(current.stateFingerprint, before);
});
test("PA34 events replay deterministically, preserve source hashes and chain", () => {
  const current = record(); assert.deepEqual(replayProspectiveAssistedEventsV3(current.originalInput, current.events), current);
  assert.deepEqual(current.input.sourceBindings, current.originalInput.sourceBindings); assert.equal(current.events[1]!.previousHash, current.events[0]!.eventHash);
});
test("PA35 tampered event rejected even if outer state hash is recomputed", () => {
  const current = clone(record()); current.events[0]!.previousHash = "0".repeat(64);
  const { stateFingerprint: _ignored, ...material } = current; current.stateFingerprint = fingerprintProspectiveAssistedV3(material, "prospective-state");
  assert.throws(() => validateProspectiveAssistedSessionV3(current), /EVENT_CHAIN_INVALID/);
});
test("PA36 stale revisions, duplicate IDs and backdated events are rejected", () => {
  const current = reviewed(); const value = { ...eventBase(current), type: "CONFIRM_REVIEW" as const, reviewerId: "SYNTHETIC_MATTIA", contentFingerprint: prospectiveAssistedContentFingerprintV3(current.input) };
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...value, expectedRevision: 0 }), /EVENT_ORDER_INVALID/);
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...value, eventId: current.events[0]!.event.eventId }), /EVENT_ORDER_INVALID/);
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...value, at: "2030-01-01T09:00:00.000Z" }), /EVENT_ORDER_INVALID/);
});
test("PA37 all four setwise outcomes preserve their distinct meaning", () => {
  for (const choice of ["SELECT", "TIE", "NO_GOOD_OPTION", "INSUFFICIENT_EVIDENCE"] as const) {
    const current = reviewed(); const value = judgment(current); value.choice = choice;
    if (choice === "TIE") { value.selectedAlternativeIds = current.input.alternatives.slice(0, 2).map((entry) => entry.alternativeId); value.reasonCodes = ["OPTIONS_EQUIVALENT"]; }
    if (choice === "NO_GOOD_OPTION") {
      assert.ok(validateProspectiveAssistedSessionV3(current).hardConstraintAssessment.every((entry) => entry.status === "VERIFIED_PRESENT"));
      value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"]; value.blockingField = null;
    }
    if (choice === "INSUFFICIENT_EVIDENCE") { value.selectedAlternativeIds = []; value.reasonCodes = ["EVIDENCE_TOO_INCOMPLETE"]; value.blockingField = "taxBreakdown"; }
    const next = record(current, value); assert.equal(next.judgments[0]!.judgment.choice, choice); assert.equal(next.realHumanJudgmentCount, 0); assert.equal(next.realExpertJudgmentCount, 0);
  }
});
test("PA38 confidence, consent, reason, precision and expert escalation are rejected", () => {
  rejectJudgment((value) => { value.confidence = 0; }, /JUDGMENT_METADATA_INVALID/);
  rejectJudgment((value) => { value.confidence = 2.5; }, /JUDGMENT_METADATA_INVALID/);
  rejectJudgment((value) => { value.consentVersion = ""; }, /JUDGMENT_METADATA_INVALID/);
  rejectJudgment((value) => { value.reasonCodes = ["FREE_TEXT"]; }, /JUDGMENT_METADATA_INVALID/);
  rejectJudgment((value) => { value.createdAtBucket = "2030-01-01T10:00:00.000Z"; }, /JUDGMENT_METADATA_INVALID/);
  rejectJudgment((value) => { (value as unknown as { evaluatorClass: string }).evaluatorClass = "EXPERT"; }, /JUDGMENT_SCHEMA_INVALID/);
});
test("PA39 tie and no-good-option require matching counts and structured reasons", () => {
  rejectJudgment((value) => { value.choice = "TIE"; }, /JUDGMENT_CHOICE_INVALID/);
  rejectJudgment((value) => { value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; }, /JUDGMENT_REASON_MISMATCH/);
  rejectJudgment((value) => { value.selectedAlternativeIds = ["SYNTHETIC_UNKNOWN_ALT"]; }, /JUDGMENT_CHOICE_INVALID/);
});
test("PA40 exposure cannot be cleared by hiding labels or changing interface", () => {
  const current = reviewed(); assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_EXPOSURE", reviewerId: "SYNTHETIC_MATTIA", exposure: { caseDataSeen: false, caseRecognized: false, engineRecommendationSeen: false } }), /EXPOSURE_CANNOT_BE_ERASED/);
  assert.equal(record(current).judgments[0]!.qualification, "SYNTHETIC_EXPOSED_DIAGNOSTIC");
});
test("PA41 an unexposed simulation is distinct, never a real human or expert", () => {
  let current = reviewed(); current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_EXPOSURE", reviewerId: "SYNTHETIC_OTHER_REVIEWER", exposure: { caseDataSeen: false, caseRecognized: false, engineRecommendationSeen: false } });
  const value = judgment(current); value.evaluatorPseudonym = "SYNTHETIC_OTHER_REVIEWER";
  const next = record(current, value); assert.equal(next.judgments[0]!.qualification, "SYNTHETIC_UNEXPOSED_REHEARSAL"); assert.equal(next.realHumanJudgmentCount, 0);
});
test("PA42 duplicate judgment ID or evaluator cannot overwrite or repeat", () => {
  const current = record(); assert.throws(() => record(current, judgment(current)), /DUPLICATE_JUDGMENT_REJECTED/);
  const value = judgment(current); value.judgmentId = "SYNTHETIC_JUDGMENT_002"; assert.throws(() => record(current, value), /DUPLICATE_JUDGMENT_REJECTED/);
});
test("PA43 correction invalidates previous judgment without rewriting it", () => {
  const current = record(); const originalJudgment = clone(current.judgments[0]);
  const next = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CORRECT_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "mealPlan", value: { ...current.input.alternatives[0]!.fields.mealPlan, value: "Trattamento sintetico corretto" }, reasonCode: "TRANSCRIPTION_CORRECTION" });
  assert.deepEqual(next.judgments[0], originalJudgment); assert.deepEqual(next.invalidatedJudgmentIds, [originalJudgment!.judgment.judgmentId]); assert.equal(next.reviewedFingerprint, null);
  assert.throws(() => transitionProspectiveAssistedSessionV3(next, { ...eventBase(next), type: "REVEAL_DECISION", responseHash: "a".repeat(64) }), /REVEAL_BEFORE_VALID_JUDGMENT_REJECTED/);
});
test("PA44 no decision can be revealed before a valid bound response", () => {
  const current = reviewed(); assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "REVEAL_DECISION", responseHash: "a".repeat(64) }), /REVEAL_BEFORE_VALID_JUDGMENT_REJECTED/);
  const withJudgment = record(current); const next = transitionProspectiveAssistedSessionV3(withJudgment, { ...eventBase(withJudgment), type: "REVEAL_DECISION", responseHash: "a".repeat(64) }); assert.equal(next.decisionRevealed, true); assert.throws(() => record(next), /JUDGMENT_AFTER_REVEAL_REJECTED/);
});
test("PA45 public comparison invariant to alternative arrival order and local identity", () => {
  const first = createProspectiveAssistedComparisonV3(reviewed()).publicView;
  const value = input(); value.alternatives.reverse(); value.evidence.reverse();
  for (const alternative of value.alternatives) { const old = alternative.alternativeId; alternative.alternativeId = `${old}_CHANGED`; for (const evidence of value.evidence) if (evidence.alternativeId === old) evidence.alternativeId = alternative.alternativeId; }
  const second = createProspectiveAssistedComparisonV3(reviewed(createProspectiveAssistedSessionV3(value))).publicView;
  assert.deepEqual(second, first); assert.equal(JSON.stringify(first).includes("evidenceRefs"), false); assert.equal(JSON.stringify(first).includes("SYNTHETIC_ALTERNATIVE_"), false);
});
test("PA46 provider names, IDs, commercials and source order cannot enter input", () => {
  for (const key of ["provider", "providerId", "hotelId", "offerId", "solutionId", "propertyToken", "commission", "markup", "originalOrder", "originalRank", "sponsored"]) {
    rejectInput((value) => { Object.assign(value.alternatives[0]!, { [key]: "SYNTHETIC_VALUE" }); }, /UNSAFE_FIELD/);
  }
});
test("PA47 getters, prototype pollution and unknown fields fail closed", () => {
  let invoked = false; const value = input(); Object.defineProperty(value, "unexpected", { get() { invoked = true; return "bad"; }, enumerable: true });
  assert.throws(() => createProspectiveAssistedSessionV3(value), /ACCESSOR_REJECTED/); assert.equal(invoked, false);
  rejectInput((other) => { Object.assign(other, { unexpected: true }); }, /INPUT_KEYS_INVALID/);
  const polluted = input(); Object.defineProperty(polluted, "__proto__", { value: {}, enumerable: true }); assert.throws(() => createProspectiveAssistedSessionV3(polluted), /UNSAFE_FIELD/);
});
test("PA48 no real network, filesystem, engine execution or public export in pure boundary", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/prospectiveAssistedEvaluationV3.ts"), "utf8");
  assert.doesNotMatch(source, /from\s+["']node:(?:http|https|fs|child_process)["']|\bfetch\s*\(|process\.env|runEngine|evaluateEngine/);
  const publicIndex = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8"); assert.doesNotMatch(publicIndex, /prospectiveAssistedEvaluationV3/);
  assert.equal(PROSPECTIVE_ASSISTED_FIELDS_V3.length, 17);
});
test("PA49 sealed state mutation cannot bypass replay by resealing only outer hash", () => {
  const current = clone(reviewed()); current.input.scenario.budgetMinorUnits += 1;
  const { stateFingerprint: _ignored, ...material } = current; current.stateFingerprint = fingerprintProspectiveAssistedV3(material, "prospective-state"); assert.throws(() => validateProspectiveAssistedSessionV3(current), /STATE_REPLAY_MISMATCH/);
});
test("PA50 no-op and unknown event cannot manufacture a reviewed version", () => {
  const current = state(); assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CORRECT_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "room", value: current.input.alternatives[0]!.fields.room, reasonCode: "TRANSCRIPTION_CORRECTION" }), /NO_OP_CORRECTION_REJECTED/);
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "AUTHORIZE_GOLDEN" } as unknown as ProspectiveAssistedEventV3), /EVENT_TYPE_INVALID/);
});
test("PA51 summary confirmation cannot automatically approve unseen fields", () => {
  const current = state(); assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CONFIRM_REVIEW", reviewerId: "SYNTHETIC_MATTIA", contentFingerprint: prospectiveAssistedContentFingerprintV3(current.input) }), /ALL_FIELDS_REVIEW_REQUIRED/);
  const complete = reviewed(current); assert.equal(Object.keys(complete.fieldReviews).length, 85); assert.equal(validateProspectiveAssistedSessionV3(complete).transcriptReviewed, true);
});
test("PA52 same reviewer may record a new bound response only after correction and renewed review", () => {
  let current = record(); const oldJudgment = clone(current.judgments[0]);
  current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "CORRECT_FIELD", alternativeId: current.input.alternatives[0]!.alternativeId, field: "mealPlan", value: { ...current.input.alternatives[0]!.fields.mealPlan, value: "Trattamento sintetico modificato e documentato" }, reasonCode: "TRANSCRIPTION_CORRECTION" });
  current = reviewed(current); const nextJudgment = judgment(current); nextJudgment.judgmentId = "SYNTHETIC_JUDGMENT_REVISED";
  const next = record(current, nextJudgment); assert.equal(next.judgments.length, 2); assert.deepEqual(next.judgments[0], oldJudgment); assert.ok(next.invalidatedJudgmentIds.includes(oldJudgment!.judgment.judgmentId)); assert.equal(next.judgments[1]!.qualification, "SYNTHETIC_EXPOSED_DIAGNOSTIC");
});
test("PA53 insufficient evidence needs a controlled blocking field; arbitrary free text is rejected", () => {
  rejectJudgment((value) => { value.choice = "INSUFFICIENT_EVIDENCE"; value.selectedAlternativeIds = []; value.reasonCodes = ["EVIDENCE_TOO_INCOMPLETE"]; }, /BLOCKING_FIELD_REQUIRED/);
  rejectJudgment((value) => { (value as unknown as { blockingField: string }).blockingField = "ANY_FREE_TEXT"; }, /BLOCKING_FIELD_INVALID/);
});
test("PA54 local time matches the exact UTC instant through DST repeated hours", () => {
  assert.equal(prospectiveAssistedLocalDateTimeV3("2026-10-25T00:30:00.000Z", "Europe/Rome"), "2026-10-25T02:30:00.000");
  assert.equal(prospectiveAssistedLocalDateTimeV3("2026-10-25T01:30:00.000Z", "Europe/Rome"), "2026-10-25T02:30:00.000");
  rejectInput((value) => { value.alternatives[0]!.observedLocalDateTime = "2030-01-01T11:02:00.000"; }, /LOCAL_DATE_OR_LEAD_TIME_INVALID/);
});
test("PA55 absent service is not UNKNOWN and never proves an essential service", () => {
  const absent = input(); absent.alternatives[0]!.fields.amenities.value = ["PRIVATE_ROOM", "ABSENT_PRIVATE_BATHROOM"];
  const absentResult = validateProspectiveAssistedSessionV3(createProspectiveAssistedSessionV3(absent)); assert.equal(absentResult.eligible, false); assert.ok(absentResult.eligibilityBlockers.some((code) => code.includes("PRIVATE_BATHROOM"))); assert.equal(absentResult.missingness.some((entry) => entry.field === "amenities"), false);
  assert.ok(absentResult.hardConstraintAssessment.some((entry) => entry.requirement === "PRIVATE_BATHROOM" && entry.status === "VERIFIED_ABSENT"));
  const unknown = input(); unknown.alternatives[0]!.fields.amenities = { status: "UNKNOWN", reliability: "UNKNOWN", value: null, unknownReason: "NOT_DOCUMENTED", evidenceRefs: [] };
  const unknownResult = validateProspectiveAssistedSessionV3(createProspectiveAssistedSessionV3(unknown)); assert.equal(unknownResult.eligible, false); assert.equal(unknownResult.missingness.some((entry) => entry.field === "amenities"), true);
  assert.ok(unknownResult.hardConstraintAssessment.some((entry) => entry.requirement === "PRIVATE_BATHROOM" && entry.status === "UNKNOWN"));
  rejectInput((value) => { value.alternatives[0]!.fields.amenities.value = ["PRIVATE_ROOM", "PRIVATE_BATHROOM", "ABSENT_PRIVATE_BATHROOM"]; }, /AMENITY_PRESENCE_CONTRADICTION/);
});
test("PA56 five and eight examples are different synthetic cases not profile replicates", () => {
  const first = input(5); const second = input(8); assert.notEqual(first.sessionId, second.sessionId); assert.notEqual(first.scenario.destinationToken, second.scenario.destinationToken); assert.equal(first.scenario.profile, "balanced"); assert.equal(second.scenario.profile, "comfort"); assert.deepEqual(second.scenario.childAges, [8, 12]); assert.equal(second.scenario.budgetMinorUnits, 120000);
  assert.equal((Date.parse(second.scenario.checkOut) - Date.parse(second.scenario.checkIn)) / 86400000, 7); assert.equal(second.alternatives[0]!.guestConfigurationFingerprint, "2|8,12|1");
});
test("PA57 six and seven alternatives use the same bounded contract", () => {
  for (const count of [6, 7] as const) assert.equal(validateProspectiveAssistedSessionV3(createProspectiveAssistedSessionV3(createSyntheticProspectiveAssistedInputV3(count))).eligible, true);
});
test("PA58 unknown value must be null with a documented absence reason", () => {
  rejectInput((value) => { value.alternatives[0]!.fields.taxBreakdown.unknownReason = ""; }, /UNKNOWN_WRAPPER_INVALID/);
  rejectInput((value) => { value.alternatives[0]!.fields.payNowMinorUnits.value = 0; }, /UNKNOWN_WRAPPER_INVALID/);
});
test("PA59 event proof holds after persistence and immutable in-memory shortcut", () => {
  const current = reviewed(); assert.equal(Object.isFrozen(current.input.alternatives[0]!.fields.room), true); assert.equal(validateProspectiveAssistedSessionV3(clone(current)).transcriptReviewed, true);
  const tampered = clone(current); tampered.reviewedFingerprint = "a".repeat(64); assert.throws(() => validateProspectiveAssistedSessionV3(tampered), /STATE_FINGERPRINT_INVALID/);
});
test("PA60 canceled field changes are not events and do not lose reviewed data", () => {
  const current = reviewed(); const before = JSON.stringify(current); const unsaved = { ...current.input.alternatives[0]!.fields.room, value: "Unsaved synthetic correction" };
  assert.notEqual(unsaved.value, current.input.alternatives[0]!.fields.room.value); assert.equal(JSON.stringify(current), before); assert.equal(current.events.length, 86);
});
test("PA61 judgment month is bound to the actual controlled recording event", () => {
  rejectJudgment((value) => { value.createdAtBucket = "2030-02"; }, /JUDGMENT_TIME_BUCKET_MISMATCH/);
});
test("PA62 inferred review exposure does not replace explicit three-answer declaration", () => {
  const current = reviewed();
  assert.deepEqual(current.exposures.SYNTHETIC_MATTIA, { caseDataSeen: true, caseRecognized: false, engineRecommendationSeen: false });
  assert.equal(current.events.some((record) => record.event.type === "RECORD_EXPOSURE"), false);
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_JUDGMENT", judgment: judgment(current) }), /EXPOSURE_DECLARATION_REQUIRED/);
  assert.equal(current.judgments.length, 0);
});
test("PA63 another evaluator's declaration cannot authorize the current evaluator", () => {
  let current = reviewed();
  current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_EXPOSURE", reviewerId: "SYNTHETIC_OTHER_REVIEWER", exposure: { caseDataSeen: false, caseRecognized: false, engineRecommendationSeen: false } });
  assert.throws(() => transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_JUDGMENT", judgment: judgment(current) }), /EXPOSURE_DECLARATION_REQUIRED/);
  current = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_EXPOSURE", reviewerId: "SYNTHETIC_MATTIA", exposure: { caseDataSeen: true, caseRecognized: false, engineRecommendationSeen: false } });
  const recorded = transitionProspectiveAssistedSessionV3(current, { ...eventBase(current), type: "RECORD_JUDGMENT", judgment: judgment(current) });
  assert.equal(recorded.judgments.length, 1);
  assert.deepEqual(replayProspectiveAssistedEventsV3(recorded.originalInput, recorded.events), recorded);
});
test("PA64 no-good-option records an overall unacceptable trade-off without inventing a constraint violation", () => {
  const current = reviewed(); const value = judgment(current);
  value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"];
  const next = record(current, value);
  assert.equal(next.judgments[0]!.judgment.blockingField, null);
  assert.deepEqual(next.judgments[0]!.judgment.reasonCodes, ["TRADEOFF_NOT_JUSTIFIED"]);
  assert.equal(next.classification, "DIAGNOSTIC_ONLY"); assert.equal(next.automaticGoldenAdmission, false);
  assert.deepEqual(replayProspectiveAssistedEventsV3(next.originalInput, next.events), next);
});
test("PA65 no-good-option accepts an optional known comparable field but not unknown evidence as quality", () => {
  const current = reviewed(); const value = judgment(current);
  value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"]; value.blockingField = "totalStayPriceMinorUnits";
  assert.equal(record(current, value).judgments[0]!.judgment.blockingField, "totalStayPriceMinorUnits");
  value.blockingField = "taxBreakdown";
  assert.throws(() => record(current, value), /TRADEOFF_FIELD_NOT_COMPARABLE/);
});
test("PA66 no-good-option cannot conflate a trade-off with a tie or insufficient evidence", () => {
  for (const contradictoryReason of ["OPTIONS_EQUIVALENT", "EVIDENCE_TOO_INCOMPLETE"]) {
    rejectJudgment((value) => { value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED", contradictoryReason]; }, /JUDGMENT_REASON_MISMATCH/);
  }
  rejectJudgment((value) => { value.choice = "TIE"; value.selectedAlternativeIds = input().alternatives.slice(0, 2).map((entry) => entry.alternativeId); value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"]; }, /JUDGMENT_REASON_MISMATCH/);
  rejectJudgment((value) => { value.choice = "INSUFFICIENT_EVIDENCE"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"]; value.blockingField = "taxBreakdown"; }, /JUDGMENT_REASON_MISMATCH/);
});
test("PA67 eligible alternatives cannot be falsely described as violating essential constraints", () => {
  rejectJudgment((value) => { value.reasonCodes = ["HARD_CONSTRAINT_NOT_MET"]; }, /JUDGMENT_CONTRADICTS_ELIGIBILITY/);
  rejectJudgment((value) => { value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED", "HARD_CONSTRAINT_NOT_MET"]; }, /JUDGMENT_CONTRADICTS_ELIGIBILITY/);
  rejectJudgment((value) => { value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"]; value.blockingField = "hardConstraints"; }, /JUDGMENT_CONTRADICTS_ELIGIBILITY/);
});
test("PA68 no-good-option does not bypass missing critical fields or unverified essential constraints", () => {
  for (const field of ["mealPlan", "amenities"] as const) {
    const source = input(); source.alternatives[0]!.fields[field] = { status: "UNKNOWN", reliability: "UNKNOWN", value: null, unknownReason: "NOT_DOCUMENTED", evidenceRefs: [] };
    const current = reviewed(createProspectiveAssistedSessionV3(source)); const value = judgment(current);
    value.choice = "NO_GOOD_OPTION"; value.selectedAlternativeIds = []; value.reasonCodes = ["TRADEOFF_NOT_JUSTIFIED"];
    assert.equal(validateProspectiveAssistedSessionV3(current).eligible, false);
    assert.throws(() => record(current, value), /JUDGMENT_INPUT_NOT_READY/);
    assert.equal(current.judgments.length, 0); assert.equal(current.automaticGoldenAdmission, false);
  }
});
