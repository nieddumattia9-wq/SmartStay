import assert from "node:assert/strict";
import test from "node:test";

import {
  createNormalizedDecisionSourceCapsuleV3,
  type StayOptiNormalizedDecisionSourceCapsuleInputV3,
} from "../../src/engine-v3/evaluation/normalizedDecisionSourceCapsuleV3";

import {
  projectNormalizedSearchFamilyToGoldenCasesV3,
  STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3,
  STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3,
  type StayOptiGoldenFrozenCasePlanV3,
  type StayOptiGoldenProjectionInputV3,
} from "../../src/engine-v3/evaluation/goldenNormalizedSearchProjectionV3";

import {
  classifyLiteApiGoldenOutcomeV3,
  createLiteApiGoldenPilotPlanV3,
  STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3,
  STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3,
  STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3,
  STAYOPTI_LITEAPI_GOLDEN_QUALIFICATION_V3,
  summarizeLiteApiGoldenFieldCoverageV3,
} from "../../src/engine-v3/evaluation/liteApiGoldenQualificationV3";

function sourceInput(): StayOptiNormalizedDecisionSourceCapsuleInputV3 {
  const alternative = (alternativeId: string, price: number) => ({
    alternativeId,
    totalPrice: price,
    currency: "EUR",
    mandatoryCostStatus: "complete" as const,
    mandatoryCostAbsenceReason: null,
    cancellation: {
      refundability: "refundable" as const,
      freeCancellationUntil: "2027-04-25T00:00:00Z",
      penaltyAmount: 0,
      penaltyCurrency: "EUR",
      evidenceState: "available" as const,
      absenceReason: null,
    },
    quality: {
      starCategory: 4,
      reviewScore: 8.7,
      reviewScale: 10,
      reviewCount: 380,
    },
    distanceKm: alternativeId.endsWith("a") ? 1.2 : 2.4,
    featureCodes: ["feature:wifi", "feature:breakfast"],
    availabilityState: "available" as const,
    recheckState: "not-rechecked" as const,
    evidence: {
      state: "available" as const,
      reliability: "high" as const,
      freshness: "fresh" as const,
      observedAt: "2026-08-31T10:00:00Z",
      validUntil: null,
      absenceReason: null,
    },
  });
  return {
    capsuleId: "CAPSULE_GOLDEN_PILOT_001",
    technicalDiagnosticOnly: false,
    context: {
      destination: { label: "Synthetic City", countryCode: "IT", latitude: 45.0, longitude: 9.0 },
      checkIn: "2027-05-01",
      checkOut: "2027-05-06",
      nights: 5,
      occupancy: { adults: 2, childAges: [], rooms: 1 },
      budget: { total: 1_200, currency: "EUR" },
      maximumDistanceKm: 5,
      profile: "balanced",
    },
    alternatives: [alternative("normalized_alt_a", 720), alternative("normalized_alt_b", 810)],
    versions: {
      adapterVersion: "synthetic-adapter.1",
      normalizerVersion: "synthetic-normalizer.1",
      policyVersion: "synthetic-policy.1",
    },
    collectedAt: "2026-08-31T10:00:00Z",
    sourceArtifact: {
      sha256: "a".repeat(64),
      byteLength: 100,
      mediaType: "application/vnd.stayopti.normalized+json",
    },
    provenanceManifest: {
      manifestId: "MANIFEST_GOLDEN_PILOT_001",
      sourceArtifactSha256: "a".repeat(64),
      transformations: [{
        transformationId: "TRANSFORM_NORMALIZE_PILOT_001",
        version: "1.0.0",
        description: "Synthetic provider-agnostic normalization.",
      }],
    },
  };
}

const roles = [
  "best-choice",
  "worthwhile-comfort-upgrade",
  "best-sensible-saving",
  "abstention-near-tie",
] as const;

function plan(count = 4): StayOptiGoldenFrozenCasePlanV3[] {
  return STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3.slice(0, count).map((profile, index) => ({
    goldenCaseId: `GOLDEN_CASE_PILOT_SYNTHETIC_00${index + 1}`,
    profile,
    expectedRole: roles[index] ?? "best-choice",
    budgetMinorUnits: 120_000,
    essentialConstraintCodes: ["CONSTRAINT_SINGLE_STAY"],
    maximumDistanceMeters: 5_000,
    comfortRequirementCodes: ["FEATURE_WIFI"],
    minimumRefundability: "REFUNDABLE",
    payLaterRequired: false,
    abstentionEvaluable: index === 3,
    v2: {
      status: "SELECTED",
      sourceAlternativeId: "normalized_alt_a",
      policyVersion: "v2.synthetic.1",
      confidenceBps: 7_000,
    },
    v3Candidate: {
      status: "SELECTED",
      sourceAlternativeId: "normalized_alt_b",
      policyVersion: "v3.synthetic.1",
      confidenceBps: 7_500,
    },
  }));
}

function projectionInput(): StayOptiGoldenProjectionInputV3 {
  return {
    normalizedSnapshot: createNormalizedDecisionSourceCapsuleV3(sourceInput()),
    frozenCasePlan: plan(),
    projectionVersion: STAYOPTI_GOLDEN_NORMALIZED_PROJECTION_VERSION_V3,
    searchFamilyId: "SEARCH_FAMILY_PILOT_SYNTHETIC_001",
    providerSourceKey: "SOURCE_LITEAPI_SANDBOX",
    providerExhaustedWithinCap: true,
    evidenceBySourceAlternativeId: {
      normalized_alt_a: {
        taxFeeEvidence: { totalKnownMinorUnits: 72_000, taxesIncluded: true, feesIncluded: true },
        roomEvidence: { roomTypeCode: "ROOM_DOUBLE_STANDARD" },
        reviewSourceClass: "VERIFIED_GUESTS",
        accommodationCategoryCode: "CATEGORY_HOTEL_4_STAR",
        distanceMeasurement: "STRAIGHT_LINE",
      },
      normalized_alt_b: {
        taxFeeEvidence: { totalKnownMinorUnits: 81_000, taxesIncluded: true, feesIncluded: true },
        roomEvidence: { roomTypeCode: "ROOM_DOUBLE_DELUXE" },
        reviewSourceClass: "VERIFIED_GUESTS",
        accommodationCategoryCode: "CATEGORY_HOTEL_4_STAR",
        distanceMeasurement: "STRAIGHT_LINE",
      },
    },
  };
}

test("V3-17Q qualifies the bounded sandbox plan and freezes the audited request contract", () => {
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_QUALIFICATION_V3, "QUALIFIED_FOR_BOUNDED_SANDBOX_PILOT");
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.method, "POST");
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.endpointPath, "/v3.0/hotels/rates");
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.currentConfiguredLimit, 80);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.currentOffsetBound, false);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.currentMaxRatesPerHotel, 3);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.currentIncludeHotelData, true);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3.currentRoomMapping, true);
});

test("V3-17Q field matrix covers exactly sixteen fields without paid pilot endpoints", () => {
  const summary = summarizeLiteApiGoldenFieldCoverageV3();
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3.length, 16);
  assert.deepEqual(summary, {
    total: 16,
    nativeInRates: 8,
    fromExistingNormalizedCache: 7,
    requiringAdditionalEndpoint: 0,
    ambiguous: 0,
    notAvailable: 0,
    notRequiredForPilot: 1,
  });
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3.every((entry) => entry.additionalHttpRequired === false), true);
});

test("V3-17Q projects one normalized family into four pre-frozen Golden cases", () => {
  const input = projectionInput();
  const before = structuredClone(input);
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(input);
  assert.equal(result.issues.length, 0);
  assert.equal(result.cases.length, 4);
  assert.equal(result.validCases, 4);
  assert.equal(result.quarantinedCases, 0);
  assert.equal(result.rejectedCases, 0);
  assert.equal(result.inputMutated, false);
  assert.equal(result.splitIncluded, false);
  assert.equal(result.rawProviderIdentifiersPersisted, 0);
  assert.deepEqual(input, before);
  assert.deepEqual(result.cases.map(({ goldenCase }) => goldenCase.travelerContext.profile), [...STAYOPTI_GOLDEN_PILOT_FROZEN_PROFILES_V3]);
});

test("V3-17Q emits only local alternative IDs and preserves normalized evidence", () => {
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(projectionInput());
  const alternatives = result.cases[0]?.goldenCase.alternatives ?? [];
  assert.deepEqual(alternatives.map(({ localAlternativeId }) => localAlternativeId), ["ALT_001", "ALT_002"]);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("normalized_alt_a"), false);
  assert.equal(serialized.includes("normalized_alt_b"), false);
  assert.equal(serialized.includes("hotelId"), false);
  assert.equal(serialized.includes("rateId"), false);
  assert.equal(serialized.includes("offerId"), false);
  assert.equal(serialized.includes("prebookId"), false);
  assert.equal(alternatives.every((entry) => entry.roomEvidence.status === "KNOWN"), true);
  assert.equal(alternatives.every((entry) => entry.cancellationEvidence.status === "KNOWN"), true);
});

test("V3-17Q preserves missing taxes and review counts as explicit UNKNOWN evidence", () => {
  const input = projectionInput();
  delete (input.evidenceBySourceAlternativeId as Record<string, unknown>).normalized_alt_a;
  const source = sourceInput();
  source.alternatives[0]!.quality.reviewCount = null;
  input.normalizedSnapshot = createNormalizedDecisionSourceCapsuleV3(source);
  input.frozenCasePlan = plan(1);
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(input);
  assert.equal(result.validCases, 1);
  const first = result.cases[0]!.goldenCase.alternatives.find((entry) => entry.totalTripCostMinorUnits === 72_000)!;
  assert.equal(first.taxFeeEvidence.status, "UNKNOWN");
  assert.equal(first.reviewEvidence.status, "UNKNOWN");
  assert.equal(first.missingEvidence.includes("MISSING_TAX_FEE_EVIDENCE"), true);
  assert.equal(first.missingEvidence.includes("MISSING_REVIEW_EVIDENCE"), true);
});

test("V3-17Q rejects a fifth profile variant before projection", () => {
  const input = projectionInput();
  input.frozenCasePlan = [...plan(), {
    ...plan(1)[0]!,
    goldenCaseId: "GOLDEN_CASE_PILOT_SYNTHETIC_005",
    profile: "comfort",
  }];
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(input);
  assert.equal(result.cases.length, 0);
  assert.equal(result.issues.some(({ code }) => code === "PROJECTION_PLAN_LIMIT_EXCEEDED"), true);
  assert.equal(result.issues.some(({ code }) => code === "PROJECTION_PROFILE_NOT_FROZEN"), true);
});

test("V3-17Q rejects currency mismatch and invalid price fail-closed", () => {
  const currency = projectionInput();
  currency.normalizedSnapshot.alternatives[0]!.currency = "USD";
  assert.equal(projectNormalizedSearchFamilyToGoldenCasesV3(currency).issues.some(({ code }) => code === "PROJECTION_CURRENCY_MISMATCH"), true);
  const price = projectionInput();
  price.normalizedSnapshot.alternatives[0]!.totalPrice = Number.NaN;
  assert.equal(projectNormalizedSearchFamilyToGoldenCasesV3(price).issues.some(({ code }) => code === "PROJECTION_SOURCE_CAPSULE_INVALID"), true);
  assert.equal(projectNormalizedSearchFamilyToGoldenCasesV3(price).issues.some(({ code }) => code === "PROJECTION_PRICE_INVALID"), true);
});

test("V3-17Q rejects duplicate normalized alternatives", () => {
  const input = projectionInput();
  const first = input.normalizedSnapshot.alternatives[0]!;
  const second = input.normalizedSnapshot.alternatives[1]!;
  Object.assign(second, structuredClone(first), { alternativeId: "normalized_alt_b" });
  const supplements = input.evidenceBySourceAlternativeId as Record<string, NonNullable<StayOptiGoldenProjectionInputV3["evidenceBySourceAlternativeId"]>[string]>;
  supplements.normalized_alt_b = structuredClone(supplements.normalized_alt_a!);
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(input);
  assert.equal(result.issues.some(({ code }) => code === "PROJECTION_NORMALIZED_ALTERNATIVE_DUPLICATE"), true);
  assert.equal(result.cases.length, 0);
});

test("V3-17Q rejects missing decision references and never introduces Split", () => {
  const input = projectionInput();
  input.frozenCasePlan = plan(1);
  input.frozenCasePlan[0]!.v3Candidate.sourceAlternativeId = "unknown_normalized_alternative";
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(input);
  assert.equal(result.issues[0]?.code, "PROJECTION_DECISION_REFERENCE_INVALID");
  assert.equal(result.splitIncluded, false);
});

test("V3-17Q projection and fingerprints are deterministic across normalized arrival order", () => {
  const first = projectNormalizedSearchFamilyToGoldenCasesV3(projectionInput());
  const secondInput = projectionInput();
  const reversedSource = sourceInput();
  reversedSource.alternatives.reverse();
  secondInput.normalizedSnapshot = createNormalizedDecisionSourceCapsuleV3(reversedSource);
  const second = projectNormalizedSearchFamilyToGoldenCasesV3(secondInput);
  assert.deepEqual(
    first.cases.map(({ goldenCase }) => goldenCase.declaredFingerprint),
    second.cases.map(({ goldenCase }) => goldenCase.declaredFingerprint),
  );
});

test("V3-17Q bounded non-exhausted snapshots remain diagnostic and cannot masquerade as exhausted Golden", () => {
  const input = projectionInput();
  input.providerExhaustedWithinCap = false;
  input.frozenCasePlan = plan(1);
  const result = projectNormalizedSearchFamilyToGoldenCasesV3(input);
  assert.equal(result.collectionBoundary, "BOUNDED_PROVIDER_RETURNED_SNAPSHOT");
  assert.equal(result.providerExhaustedWithinCap, false);
  assert.equal(result.rejectedCases, 1);
  assert.equal(result.validCases, 0);
});

test("V3-17Q classifies documented LiteAPI codes before HTTP-only categories", () => {
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 200, providerCode: 2001 }), "NO_AVAILABILITY");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 400, providerCode: 4000 }), "REQUEST_INVALID");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 400, providerCode: 4002 }), "REQUIRED_FIELD_INVALID");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 401, providerCode: null }), "AUTHENTICATION_FAILURE");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 403, providerCode: 40302 }), "ACCOUNT_SUSPENDED");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 429, providerCode: 4290 }), "RATE_LIMITED");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 500, providerCode: 4291 }), "RATE_LIMIT_SYSTEM_FAILURE");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 502, providerCode: 4011 }), "SUPPLIER_COMMUNICATION_FAILURE");
});

test("V3-17Q classifies local and normalized boundaries without retry", () => {
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: null, providerCode: null, localTimeout: true }), "LOCAL_TIMEOUT");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 200, providerCode: null, malformedSuccess: true }), "MALFORMED_SUCCESS");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 200, providerCode: null, currencyMismatch: true }), "CURRENCY_MISMATCH");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 200, providerCode: null, usableNormalizedCount: 0 }), "EMPTY_USABLE_NORMALIZED_RESULT");
  assert.equal(classifyLiteApiGoldenOutcomeV3({ httpStatus: 200, providerCode: null, usableNormalizedCount: 2 }), "SUCCESS");
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.retryMax, 0);
});

test("V3-17Q freezes a five-request, zero-paid-endpoint, single-wave pilot", () => {
  const families = Array.from({ length: 5 }, (_, index) => `SEARCH_FAMILY_PILOT_${String(index + 1).padStart(3, "0")}`);
  const result = createLiteApiGoldenPilotPlanV3(families);
  assert.equal(result.ratesHttpMax, 5);
  assert.equal(result.metadataHttpMax, 0);
  assert.equal(result.totalHttpMax, 5);
  assert.equal(result.paidEndpointHttpMax, 0);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.placesHttpMax, 0);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.priceIndexHttpMax, 0);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.prebookHttpMax, 0);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.bookingHttpMax, 0);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.maxConcurrency, 1);
  assert.equal(STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.minimumRequestIntervalMs, 1_000);
});

test("V3-17Q blocks a sixth family and a second wave", () => {
  const six = Array.from({ length: 6 }, (_, index) => `SEARCH_FAMILY_PILOT_${String(index + 1).padStart(3, "0")}`);
  assert.throws(() => createLiteApiGoldenPilotPlanV3(six), /V3_17Q_PILOT_FAMILY_LIMIT_EXCEEDED/);
  assert.throws(() => createLiteApiGoldenPilotPlanV3(six.slice(0, 5), 2), /V3_17Q_SECOND_WAVE_PROHIBITED/);
});

test("V3-17Q private modules contain no network, environment, LiteAPI client, or public runtime binding", async () => {
  const fs = await import("node:fs/promises");
  const projection = await fs.readFile("src/engine-v3/evaluation/goldenNormalizedSearchProjectionV3.ts", "utf8");
  const qualification = await fs.readFile("src/engine-v3/evaluation/liteApiGoldenQualificationV3.ts", "utf8");
  const publicIndex = await fs.readFile("src/engine-v3/index.ts", "utf8");
  assert.equal(/\bfetch\s*\(/.test(projection + qualification), false);
  assert.equal(/process\.env|dotenv|liteApiClient|server\/providers\/liteApi/i.test(projection + qualification), false);
  assert.equal(publicIndex.includes("goldenNormalizedSearchProjectionV3"), false);
  assert.equal(publicIndex.includes("liteApiGoldenQualificationV3"), false);
});
