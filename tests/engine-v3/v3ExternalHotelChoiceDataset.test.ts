import assert from "node:assert/strict";
import test from "node:test";

import {
  type ExternalHotelChoiceSessionV3,
  STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3,
  STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3,
  STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3,
  STAYOPTI_EXTERNAL_REPLAY_SAMPLING_PLAN_V3,
  type StayOptiExternalHotelAlternativeV3,
} from "../../src/engine-v3/evaluation/externalHotelChoiceContractV3";

import {
  auditExternalReplayFeatureLeakageV3,
  classifyExternalHotelChoiceBiasesV3,
  classifyExternalHotelChoiceEvidenceV3,
  createExternalHotelChoiceSessionFingerprintV3,
  createExternalProviderNeutralReplayV3,
  deduplicateExternalChoiceSessionsV3,
  validateExternalDatasetPartitionIsolationV3,
  validateExternalHotelChoiceSessionV3,
} from "../../src/engine-v3/evaluation/externalHotelChoiceReplayV3";

function known<T>(value: T, provenance = "OFFICIAL_SCHEMA_FIELD") {
  return { state: "KNOWN" as const, value, provenance };
}

function unknown<T>(provenance = "SOURCE_FIELD_NOT_AVAILABLE") {
  void (null as T | null);
  return { state: "UNKNOWN" as const, value: null, provenance };
}

function alternative(
  anonymousPropertyId: string,
  displayedRank: number,
  overrides: Partial<StayOptiExternalHotelAlternativeV3> = {},
): StayOptiExternalHotelAlternativeV3 {
  return {
    anonymousPropertyId,
    displayedRank,
    sponsored: known(false),
    starRating: known(4),
    reviewRating: known(4.4),
    reviewCount: known(250),
    exactPriceMinorUnits: known(18_900),
    priceBucket: unknown<string>(),
    freeCancellation: known(true),
    amenities: known(["BREAKFAST", "WIFI"]),
    availabilityStatus: known("AVAILABLE"),
    clicked: false,
    booked: false,
    missingness: [],
    fieldProvenance: { displayedRank: "OFFICIAL_SCHEMA_FIELD" },
    ...overrides,
  };
}

function createSession(
  overrides: Partial<ExternalHotelChoiceSessionV3> = {},
): ExternalHotelChoiceSessionV3 {
  const base = {
    schemaVersion: STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3,
    sourceDatasetId: "STAYOPTI_SYNTHETIC_EXTERNAL_CHOICE_FIXTURE",
    sourceVersion: "1.0.0",
    sourceLicense: {
      status: "SYNTHETIC_FIXTURE_ONLY" as const,
      licenseName: "StayOpti synthetic test fixture",
      licenseUrl: null,
      commercialUse: "NO" as const,
      accountRequired: false,
      termsAcceptanceRequired: false,
      persistentIngestionAllowed: true,
    },
    provenance: {
      authority: "PRIMARY_OFFICIAL_SCHEMA" as const,
      primarySourceUrl: "https://www.recsyschallenge.com/2019/",
      downloadUrl: null,
      adapterVersion: "stayopti.synthetic-external-choice-adapter.1",
      mappingVersion: "stayopti.v3.external-hotel-choice-session@1",
      sourceRowGrouping: "ONE_SEARCH_SESSION" as const,
      redistributionAllowed: true,
    },
    searchTimestamp: "2019-01",
    historicalPeriod: "2018-11",
    destinationToken: "DESTINATION_ANON_001",
    checkin: "2019-03-10",
    checkout: "2019-03-13",
    adults: 2,
    children: 0,
    rooms: 1,
    filters: ["FREE_CANCELLATION"],
    sortType: "DEFAULT",
    deviceContext: "DESKTOP",
    currencyKnown: known("EUR"),
    exactPriceAvailable: true,
    choiceSetCompleteness: "COMPLETE_VISIBLE_SET" as const,
    alternatives: [
      alternative("ANON_PROPERTY_A", 1),
      alternative("ANON_PROPERTY_B", 2, { clicked: true, booked: true }),
    ],
    observedActions: [
      { ordinal: 1, actionType: "IMPRESSION" as const, anonymousPropertyId: null, occurredAtBucket: "STEP_1" },
      { ordinal: 2, actionType: "CLICK_OUT" as const, anonymousPropertyId: "ANON_PROPERTY_B", occurredAtBucket: "STEP_2" },
      { ordinal: 3, actionType: "BOOKING" as const, anonymousPropertyId: "ANON_PROPERTY_B", occurredAtBucket: "WITHIN_ATTRIBUTION_WINDOW" },
    ],
    bookingObserved: true,
    biasFlags: ["POSITION_BIAS", "DEFAULT_SORT_BIAS", "CANCELLATION_OUTCOME_UNOBSERVED"] as const,
    evidenceStrength: "BOOKING_OBSERVED" as const,
    mappingCompleteness: "COMPLETE_FOR_REPLAY" as const,
    allowedUses: ["OFFLINE_PROVIDER_NEUTRAL_REPLAY", "BEHAVIORAL_BENCHMARK"],
    prohibitedClaims: ["OBJECTIVE_BEST_CHOICE", "GENERAL_MARKET_FREQUENCY", "POST_STAY_SATISFACTION"],
    datasetPartition: "TRAIN" as const,
    anonymousUserCluster: "ANON_USER_CLUSTER_001",
    corpusClass: "EXTERNAL_OBSERVATIONAL_CORPUS" as const,
    automaticGoldenAdmission: false as const,
  };
  const candidate = { ...base, ...overrides } as Omit<ExternalHotelChoiceSessionV3, "sessionFingerprint">;
  return {
    ...candidate,
    sessionFingerprint: createExternalHotelChoiceSessionFingerprintV3(candidate),
  };
}

test("V3-17S booking is an evaluation label and never a pre-decision feature", () => {
  const replay = createExternalProviderNeutralReplayV3(createSession());
  assert.equal(replay.evaluationLabels.bookingClassification, STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3);
  assert.equal(JSON.stringify(replay.preDecisionFeatures).includes("booked"), false);
  assert.equal(auditExternalReplayFeatureLeakageV3(replay).valid, true);
});

test("V3-17S click-out is weaker than booking", () => {
  assert.equal(classifyExternalHotelChoiceEvidenceV3([{ actionType: "CLICK_OUT" }]), "CLICK_OUT");
  assert.equal(classifyExternalHotelChoiceEvidenceV3([{ actionType: "BOOKING" }]), "BOOKING_OBSERVED");
  assert.ok(STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3.includes("MODERATE"));
});

test("V3-17S impression-only is exposure, not preference", () => {
  const session = createSession({
    alternatives: [alternative("ANON_PROPERTY_A", 1), alternative("ANON_PROPERTY_B", 2)],
    observedActions: [{ ordinal: 1, actionType: "IMPRESSION", anonymousPropertyId: null, occurredAtBucket: "STEP_1" }],
    bookingObserved: false,
    evidenceStrength: "IMPRESSION_ONLY",
  });
  const replay = createExternalProviderNeutralReplayV3(session);
  assert.equal(replay.evaluationLabels.clickedAlternativeIds.length, 0);
  assert.equal(replay.evaluationLabels.bookedAlternativeIds.length, 0);
  assert.equal(replay.evaluationLabels.evidenceStrength, "IMPRESSION_ONLY");
});

test("V3-17S advertising and position bias remain explicit", () => {
  const session = createSession({
    alternatives: [alternative("ANON_PROPERTY_A", 1, { sponsored: known(true) }), alternative("ANON_PROPERTY_B", 2)],
    biasFlags: ["POSITION_BIAS", "ADVERTISING_BIAS", "DEFAULT_SORT_BIAS", "CANCELLATION_OUTCOME_UNOBSERVED"],
  });
  assert.deepEqual(classifyExternalHotelChoiceBiasesV3(session).slice(0, 2), ["ADVERTISING_BIAS", "CANCELLATION_OUTCOME_UNOBSERVED"]);
  assert.ok(classifyExternalHotelChoiceBiasesV3(session).includes("POSITION_BIAS"));
});

test("V3-17S missing values are explicit and never invented", () => {
  const session = createSession({
    alternatives: [
      alternative("ANON_PROPERTY_A", 1, { reviewCount: unknown<number>(), missingness: ["REVIEW_COUNT"] }),
      alternative("ANON_PROPERTY_B", 2, { clicked: true, booked: true }),
    ],
    biasFlags: ["POSITION_BIAS", "DEFAULT_SORT_BIAS", "CANCELLATION_OUTCOME_UNOBSERVED", "MISSING_DATA_BIAS"],
  });
  const replay = createExternalProviderNeutralReplayV3(session);
  assert.equal(replay.preDecisionFeatures.alternatives[0]?.reviewCount.state, "UNKNOWN");
  assert.equal(replay.preDecisionFeatures.alternatives[0]?.reviewCount.value, null);
});

test("V3-17S a price bucket cannot become an exact price", () => {
  const conflicted = alternative("ANON_PROPERTY_A", 1, { priceBucket: { state: "BUCKETED", value: "LOW", provenance: "OFFICIAL_BUCKET" } });
  const result = validateExternalHotelChoiceSessionV3(createSession({ alternatives: [conflicted, alternative("ANON_PROPERTY_B", 2)] }));
  assert.ok(result.issues.some((entry) => entry.reasonCode === "EXTERNAL_PRICE_REPRESENTATION_CONFLICT"));
});

test("V3-17S one search is one session rather than one case per hotel", () => {
  const session = createSession();
  const result = deduplicateExternalChoiceSessionsV3([session]);
  assert.equal(result.sessionDenominator, 1);
  assert.equal(result.sourceRowDenominator, 2);
  assert.equal(result.oneSessionNotOneHotel, true);
});

test("V3-17S duplicate session fingerprints do not increase replay counts", () => {
  const session = createSession();
  const result = deduplicateExternalChoiceSessionsV3([session, structuredClone(session)]);
  assert.equal(result.sessionDenominator, 1);
  assert.equal(result.duplicateFingerprints.length, 1);
});

test("V3-17S anonymous identity stays opaque and raw provider identity fails closed", () => {
  const unsafe = createSession() as unknown as Record<string, unknown>;
  unsafe.providerId = "forbidden-value";
  const result = validateExternalHotelChoiceSessionV3(unsafe);
  assert.ok(result.issues.some((entry) => entry.reasonCode === "EXTERNAL_UNSAFE_FIELD_PRESENT"));
  assert.equal(JSON.stringify(result).includes("forbidden-value"), false);
});

test("V3-17S external observations never become Golden live cases", () => {
  const replay = createExternalProviderNeutralReplayV3(createSession());
  assert.equal(replay.automaticGoldenAdmission, false);
  assert.equal(replay.automaticV3WeightChange, false);
});

test("V3-17S real ordinary hotel sessions contain no observed split outcome", () => {
  const replay = createExternalProviderNeutralReplayV3(createSession());
  assert.equal(replay.splitOutcomeObserved, false);
  assert.equal(STAYOPTI_EXTERNAL_REPLAY_SAMPLING_PLAN_V3.splitStayHandling, "SYNTHETIC_COUNTERFACTUAL_FROM_REAL_BASE");
});

test("V3-17S label-named fields in features are rejected", () => {
  const replay = createExternalProviderNeutralReplayV3(createSession());
  const unsafe = structuredClone(replay) as unknown as Record<string, unknown>;
  (unsafe.preDecisionFeatures as Record<string, unknown>).bookingObserved = true;
  assert.equal(auditExternalReplayFeatureLeakageV3(unsafe as unknown as typeof replay).valid, false);
});

test("V3-17S train validation and test isolate session and user clusters", () => {
  const train = createSession({ datasetPartition: "TRAIN", anonymousUserCluster: "ANON_USER_CLUSTER_SHARED" });
  const testSession = createSession({
    datasetPartition: "TEST",
    anonymousUserCluster: "ANON_USER_CLUSTER_SHARED",
    destinationToken: "DESTINATION_ANON_002",
  });
  assert.equal(validateExternalDatasetPartitionIsolationV3([train, testSession]).valid, false);
});

test("V3-17S unknown or terms-gated license blocks persistent replay", () => {
  const session = createSession({
    sourceLicense: {
      status: "TERMS_ACCEPTANCE_REQUIRED",
      licenseName: null,
      licenseUrl: null,
      commercialUse: "UNKNOWN",
      accountRequired: true,
      termsAcceptanceRequired: true,
      persistentIngestionAllowed: false,
    },
  });
  const validation = validateExternalHotelChoiceSessionV3(session);
  assert.equal(validation.persistentIngestionAllowed, false);
  assert.throws(() => createExternalProviderNeutralReplayV3(session), /NOT_ADMITTED/);
});

test("V3-17S an unverified mirror is rejected even when its schema looks usable", () => {
  const session = createSession({ provenance: { ...createSession().provenance, authority: "UNVERIFIED_MIRROR" } });
  const result = validateExternalHotelChoiceSessionV3(session);
  assert.ok(result.issues.some((entry) => entry.reasonCode === "EXTERNAL_SOURCE_NOT_PRIMARY"));
});

test("V3-17S absence of action is not interpreted as rejection of every hotel", () => {
  const session = createSession({
    alternatives: [alternative("ANON_PROPERTY_A", 1), alternative("ANON_PROPERTY_B", 2)],
    observedActions: [{ ordinal: 1, actionType: "NO_ACTION", anonymousPropertyId: null, occurredAtBucket: "SESSION_END" }],
    bookingObserved: false,
    evidenceStrength: "IMPRESSION_ONLY",
  });
  const replay = createExternalProviderNeutralReplayV3(session);
  assert.equal(replay.evaluationLabels.clickedAlternativeIds.length, 0);
  assert.equal(replay.prohibitedClaims.includes("OBJECTIVE_BEST_CHOICE"), true);
});

test("V3-17S canonical fingerprint ignores row and set ordering but detects material change", () => {
  const original = createSession();
  const reordered = createSession({
    alternatives: [...original.alternatives].reverse(),
    filters: [...original.filters].reverse(),
    biasFlags: [...original.biasFlags].reverse(),
  });
  assert.equal(original.sessionFingerprint, reordered.sessionFingerprint);
  const changed = createSession({ destinationToken: "DESTINATION_ANON_CHANGED" });
  assert.notEqual(original.sessionFingerprint, changed.sessionFingerprint);
});

test("V3-17S validator records required bias instead of silently correcting the declaration", () => {
  const result = validateExternalHotelChoiceSessionV3(createSession({ biasFlags: [] }));
  assert.ok(result.issues.some((entry) => entry.reasonCode === "EXTERNAL_BIAS_FLAG_MISSING"));
});

test("V3-17S replay plan freezes at least 100 independent sessions and leaves V3-18 blocked", () => {
  assert.equal(STAYOPTI_EXTERNAL_REPLAY_SAMPLING_PLAN_V3.targetIndependentSessions, 100);
  assert.equal(STAYOPTI_EXTERNAL_REPLAY_SAMPLING_PLAN_V3.unitOfIndependence, "SEARCH_SESSION");
  assert.equal(STAYOPTI_EXTERNAL_REPLAY_SAMPLING_PLAN_V3.strata.length, 25);
  const replay = createExternalProviderNeutralReplayV3(createSession());
  assert.equal(replay.automaticV3WeightChange, false);
});
