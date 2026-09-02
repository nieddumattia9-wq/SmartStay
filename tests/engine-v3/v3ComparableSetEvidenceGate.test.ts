import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_COMPARABLE_EVIDENCE_TIERS_V3,
  STAYOPTI_CURRENT_SOURCE_CAPABILITY_MATRIX_V3,
  STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3,
  STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3,
  STAYOPTI_PRICE_SEMANTIC_MATRIX_V3,
  STAYOPTI_SET_WIDE_FIELD_MATRIX_V3,
  STAYOPTI_T4_COLLECTION_GATE_CONTRACT_V3,
  STAYOPTI_T4_COLLECTION_STRATEGIES_V3,
  STAYOPTI_T4_EXISTING_T3_SAMPLE_DECISION_V3,
  STAYOPTI_T4_GO_NO_GO_DECISION_V3,
  STAYOPTI_T4_SELECTED_CALL_BUDGET_V3,
  STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3,
  evaluateComparableSetEvidenceTierV3,
  freezeProviderNeutralComparableSetSelectionV3,
  validateT4OfflineGateInvocationV3,
  type StayOptiComparableCandidateV3,
  type StayOptiComparableSetCoverageV3,
} from "../../src/engine-v3/evaluation/comparableSetEvidenceGateV3";

function candidates(): StayOptiComparableCandidateV3[] {
  return Array.from({ length: 12 }, (_, index) => ({
    localReference: `ALT_SYNTHETIC_${String(index + 1).padStart(2, "0")}`,
    displayPriceMinorUnits: index >= 10 ? null : 20_000 + index * 3_500,
    currency: index >= 10 ? null : "EUR",
    budgetMinorUnits: 50_000,
    reviewRating: 7.2 + index / 5,
    reviewCount: 80 + index * 40,
    locationDistanceMeters: 300 + index * 250,
    essentialAmenities: index === 9 ? null : ["WIFI", ...(index % 2 === 0 ? ["AIR_CONDITIONING"] : [])],
    propertyCategory: "HOTEL",
    stayScopeConsistent: true,
    occupancyScopeConsistent: true,
    auditOnly: {
      sourceLabel: "SYNTHETIC_SOURCE",
      opaqueIdentity: `OPAQUE_${index}`,
      originalPosition: index + 1,
      sponsored: index < 3,
      detailRichness: index,
    },
  }));
}

function coverage(overrides: Partial<StayOptiComparableSetCoverageV3> = {}): StayOptiComparableSetCoverageV3 {
  return {
    setSize: 8,
    selectionFrozenBeforeDetail: true,
    asymmetricDecisionDetailCoverage: false,
    displayPriceCoverageBps: 10000,
    exactBookablePriceCoverageBps: 10000,
    availabilityCoverageBps: 10000,
    currencyCoverageBps: 10000,
    stayOccupancyCoverageBps: 10000,
    taxFeeStatusCoverageBps: 10000,
    freshnessCoverageBps: 10000,
    cancellationCoverageBps: 10000,
    roomOfferCoverageBps: 10000,
    ratingReviewCoverageBps: 10000,
    locationCoverageBps: 10000,
    amenityCoverageBps: 10000,
    propertyCategoryCoverageBps: 10000,
    detailCoverageBps: 10000,
    ...overrides,
  };
}

test("T4 01 defines exactly three evidence tiers", () => {
  assert.deepEqual(STAYOPTI_COMPARABLE_EVIDENCE_TIERS_V3.map((entry) => entry.tier), ["DIAGNOSTIC_ONLY", "LIMITED_COMPARABLE_JUDGMENT", "FULL_DECISION_AND_BLIND_JUDGMENT"]);
});

test("T4 02 freezes minimum target and maximum comparable set sizes", () => {
  assert.equal(STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3, 5);
  assert.equal(STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3, 8);
  assert.equal(STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3, 10);
});

test("T4 03 existing T3 sample remains diagnostic only", () => {
  assert.equal(STAYOPTI_T4_EXISTING_T3_SAMPLE_DECISION_V3.existingSampleEligibility, "DIAGNOSTIC_ONLY");
  assert.equal(STAYOPTI_T4_EXISTING_T3_SAMPLE_DECISION_V3.automaticEligibilityUpgrade, false);
});

test("T4 04 full set-wide evidence reaches full tier", () => {
  const result = evaluateComparableSetEvidenceTierV3(coverage());
  assert.equal(result.tier, "FULL_DECISION_AND_BLIND_JUDGMENT");
  assert.equal(result.decisionReplayAllowed, true);
});

test("T4 05 aggregated display price supports only limited tier", () => {
  const result = evaluateComparableSetEvidenceTierV3(coverage({ exactBookablePriceCoverageBps: 0, availabilityCoverageBps: 0, taxFeeStatusCoverageBps: 0, freshnessCoverageBps: 0, cancellationCoverageBps: 0, roomOfferCoverageBps: 0, propertyCategoryCoverageBps: 0, detailCoverageBps: 0 }));
  assert.equal(result.tier, "LIMITED_COMPARABLE_JUDGMENT");
  assert.equal(result.decisionReplayAllowed, false);
});

test("T4 06 critical display price below threshold fails limited tier", () => {
  assert.equal(evaluateComparableSetEvidenceTierV3(coverage({ displayPriceCoverageBps: 9999 })).tier, "DIAGNOSTIC_ONLY");
});

test("T4 07 currency below full coverage fails limited tier", () => {
  assert.equal(evaluateComparableSetEvidenceTierV3(coverage({ currencyCoverageBps: 9999 })).tier, "DIAGNOSTIC_ONLY");
});

test("T4 08 asymmetric detail coverage fails closed", () => {
  const result = evaluateComparableSetEvidenceTierV3(coverage({ asymmetricDecisionDetailCoverage: true }));
  assert.equal(result.tier, "DIAGNOSTIC_ONLY");
  assert.ok(result.issues.includes("T4_ASYMMETRIC_DETAIL_COVERAGE"));
});

test("T4 09 a selection not frozen before detail stays diagnostic", () => {
  assert.equal(evaluateComparableSetEvidenceTierV3(coverage({ selectionFrozenBeforeDetail: false })).tier, "DIAGNOSTIC_ONLY");
});

test("T4 10 review coverage threshold is explicit", () => {
  assert.equal(evaluateComparableSetEvidenceTierV3(coverage({ ratingReviewCoverageBps: 7999 })).tier, "DIAGNOSTIC_ONLY");
});

test("T4 11 missing prices remain in a separate recorded stratum", () => {
  const result = freezeProviderNeutralComparableSetSelectionV3(candidates());
  assert.equal(result.missingPriceLocalReferences.length, 2);
  assert.equal(result.missingPricePolicy, "SEPARATE_MISSING_STRATUM_EXCLUDED_FROM_LIMITED_PRICE_COMPARISON");
});

test("T4 12 no missing price becomes false or zero", () => {
  const input = candidates();
  const result = freezeProviderNeutralComparableSetSelectionV3(input);
  assert.ok(result.missingPriceLocalReferences.every((reference) => input.find((entry) => entry.localReference === reference)?.displayPriceMinorUnits === null));
});

test("T4 13 selection produces the frozen target size", () => {
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(candidates()).selectedLocalReferences.length, 8);
});

test("T4 14 sponsored status cannot affect selection", () => {
  const input = candidates();
  const mutated = input.map((entry) => ({ ...entry, auditOnly: { ...entry.auditOnly, sponsored: !entry.auditOnly?.sponsored } }));
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(input).selectionFingerprint, freezeProviderNeutralComparableSetSelectionV3(mutated).selectionFingerprint);
});

test("T4 15 original rank cannot affect selection", () => {
  const input = candidates();
  const mutated = input.map((entry, index) => ({ ...entry, auditOnly: { ...entry.auditOnly, originalPosition: 999 - index } }));
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(input).selectionFingerprint, freezeProviderNeutralComparableSetSelectionV3(mutated).selectionFingerprint);
});

test("T4 16 source label cannot affect selection", () => {
  const input = candidates();
  const mutated = input.map((entry) => ({ ...entry, auditOnly: { ...entry.auditOnly, sourceLabel: "DIFFERENT_SOURCE" } }));
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(input).selectionFingerprint, freezeProviderNeutralComparableSetSelectionV3(mutated).selectionFingerprint);
});

test("T4 17 opaque source identity cannot affect selection", () => {
  const input = candidates();
  const mutated = input.map((entry, index) => ({ ...entry, auditOnly: { ...entry.auditOnly, opaqueIdentity: `RANDOMIZED_${1000 - index}` } }));
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(input).selectionFingerprint, freezeProviderNeutralComparableSetSelectionV3(mutated).selectionFingerprint);
});

test("T4 18 detail richness cannot affect selection", () => {
  const input = candidates();
  const mutated = input.map((entry, index) => ({ ...entry, auditOnly: { ...entry.auditOnly, detailRichness: 10_000 - index } }));
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(input).selectionFingerprint, freezeProviderNeutralComparableSetSelectionV3(mutated).selectionFingerprint);
});

test("T4 19 input permutation cannot enable cherry-picking", () => {
  const input = candidates();
  assert.equal(freezeProviderNeutralComparableSetSelectionV3(input).selectionFingerprint, freezeProviderNeutralComparableSetSelectionV3([...input].reverse()).selectionFingerprint);
});

test("T4 20 target size cannot exceed the frozen maximum", () => {
  assert.throws(() => freezeProviderNeutralComparableSetSelectionV3(candidates(), 11), /T4_COMPARABLE_SET_SIZE_OUT_OF_BOUNDS/);
});

test("T4 21 fewer than five priced candidates fail closed", () => {
  const input = candidates().map((entry, index) => ({ ...entry, displayPriceMinorUnits: index < 4 ? entry.displayPriceMinorUnits : null, currency: index < 4 ? "EUR" : null }));
  assert.throws(() => freezeProviderNeutralComparableSetSelectionV3(input), /T4_INSUFFICIENT_PRICED_COMPARABLE_CANDIDATES/);
});

test("T4 22 display price is never promoted to exact", () => {
  const display = STAYOPTI_PRICE_SEMANTIC_MATRIX_V3.find((entry) => entry.semantic === "OBSERVED_AGGREGATED_DISPLAY_PRICE");
  assert.equal(display?.rankingUse, "PROHIBITED_FOR_FULL_DECISION");
  assert.equal(display?.goldenUse, "PROHIBITED");
});

test("T4 23 seller-specific observed price is not checkout verification", () => {
  const seller = STAYOPTI_PRICE_SEMANTIC_MATRIX_V3.find((entry) => entry.semantic === "SELLER_SPECIFIC_OBSERVED_PRICE");
  assert.equal(seller?.goldenUse, "PROHIBITED_WITHOUT_BOOKABILITY");
  assert.equal(seller?.recheckRequired, true);
});

test("T4 24 full tier requires exact bookable total-stay semantics", () => {
  const exact = STAYOPTI_SET_WIDE_FIELD_MATRIX_V3.find((entry) => entry.field === "totalStayPrice");
  assert.equal(exact?.semanticType, "EXACT_BOOKABLE_PRICE");
  assert.equal(exact?.requiredCoverageBps, 10000);
});

test("T4 25 current source capabilities do not claim full-tier feasibility", () => {
  assert.equal(STAYOPTI_CURRENT_SOURCE_CAPABILITY_MATRIX_V3.find((entry) => entry.capability === "FULL_DECISION_AND_BLIND_JUDGMENT")?.status, "NOT_DEMONSTRATED");
});

test("T4 26 strategy A freezes exact twelve-call arithmetic", () => {
  assert.deepEqual(STAYOPTI_T4_SELECTED_CALL_BUDGET_V3, {
    strategy: "A", minimumCallsPerSession: 1, targetCallsPerSession: 1, maximumCallsPerSession: 1,
    targetSessionCount: 12, maximumTotalCalls: 12, worstCaseTotalCalls: 12,
    oneSessionCanaryCalls: 1, callsSavedOnCanaryStop: 11, diagnosticErrorReserveCalls: 0,
    failedCallConsumesSessionBudget: true, retries: 0, concurrency: 1, pagination: 0, autostopRequired: true,
  });
});

test("T4 27 expensive all-detail strategy cannot claim full tier", () => {
  const strategy = STAYOPTI_T4_COLLECTION_STRATEGIES_V3.find((entry) => entry.strategy === "B");
  assert.equal(strategy?.worstCaseCallsForTwelveSessions, 132);
  assert.equal(strategy?.goldenPotential, "NO_WITH_CURRENT_EVIDENCE");
});

test("T4 28 runtime parameters cannot increase call caps", () => {
  const result = validateT4OfflineGateInvocationV3({ maximumCallsPerSession: 2, maximumTotalCalls: 13 });
  assert.equal(result.allowed, false);
  assert.ok(result.issues.includes("T4_PER_SESSION_CAP_OVERRIDE_REJECTED"));
  assert.ok(result.issues.includes("T4_GLOBAL_CAP_OVERRIDE_REJECTED"));
});

test("T4 29 old authorization literals are rejected", () => {
  const result = validateT4OfflineGateInvocationV3({ authorizationLiteral: "AUTHORIZE_V3_17T2C_MAX2_OBSOLETE" });
  assert.equal(result.httpRequests, 0);
  assert.ok(result.issues.includes("T4_AUTHORIZATION_LITERAL_NOT_MATERIALIZED_OR_ACCEPTED"));
});

test("T4 30 remaining stage and automatic Golden admission remain disabled", () => {
  assert.equal(STAYOPTI_T4_COLLECTION_GATE_CONTRACT_V3.remainingStageAuthorized, false);
  assert.equal(STAYOPTI_T4_COLLECTION_GATE_CONTRACT_V3.automaticGoldenAdmission, false);
  assert.equal(STAYOPTI_T4_COLLECTION_GATE_CONTRACT_V3.authorizationLiteralCreated, false);
});

test("T4 31 collection decision is limited and grants no calls", () => {
  assert.equal(STAYOPTI_T4_GO_NO_GO_DECISION_V3.decision, "GO_LIMITED_COMPARABLE_COLLECTION");
  assert.equal(STAYOPTI_T4_GO_NO_GO_DECISION_V3.selectedStrategy, "A");
  assert.equal(STAYOPTI_T4_GO_NO_GO_DECISION_V3.newCollectionAuthorizationGranted, false);
});

test("T4 32 evaluation gate has no network credential or runtime-provider capability", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/evaluation/comparableSetEvidenceGateV3.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|node:https|node:http|process\.env|SERPAPI_API_KEY|server[\\/]providers/);
});

test("T4 33 public V3 core does not import the evaluation gate", () => {
  const source = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8");
  assert.doesNotMatch(source, /comparableSetEvidenceGateV3/);
});

test("T4 34 contract artifacts contain neither raw payload nor secret fields", () => {
  const serialized = JSON.stringify({ tiers: STAYOPTI_COMPARABLE_EVIDENCE_TIERS_V3, fields: STAYOPTI_SET_WIDE_FIELD_MATRIX_V3, prices: STAYOPTI_PRICE_SEMANTIC_MATRIX_V3, capabilities: STAYOPTI_CURRENT_SOURCE_CAPABILITY_MATRIX_V3, strategies: STAYOPTI_T4_COLLECTION_STRATEGIES_V3, gate: STAYOPTI_T4_COLLECTION_GATE_CONTRACT_V3 });
  assert.doesNotMatch(serialized, /rawPayload|rawResponse|property_token|api[_-]?key|authorization\s*header/i);
});
