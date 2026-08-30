import assert from "node:assert/strict";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
  type StayOptiGoldenAlternativeV3,
  type StayOptiGoldenCaseV3,
} from "../../src/engine-v3/evaluation/goldenCaseContractV3";
import {
  canonicalSerializeGoldenCaseV3,
  createGoldenCaseFingerprintV3,
  validateCounterfactualPairV3,
  validateGoldenCaseV3,
} from "../../src/engine-v3/evaluation/goldenCaseValidatorV3";
import {
  validateGoldenCorpusV3,
} from "../../src/engine-v3/evaluation/goldenCorpusValidatorV3";

function known<T>(value: T, reference = "EVIDENCE_PRIMARY_001") {
  return {
    status: "KNOWN" as const,
    reliability: "HIGH" as const,
    value,
    unknownReason: null,
    evidenceRefs: [reference],
  };
}

function alternative(
  localAlternativeId: string,
  totalTripCostMinorUnits: number,
): StayOptiGoldenAlternativeV3 {
  return {
    localAlternativeId,
    totalTripCostMinorUnits,
    currency: "EUR",
    taxFeeEvidence: known({
      totalKnownMinorUnits: totalTripCostMinorUnits,
      taxesIncluded: true,
      feesIncluded: true,
    }),
    ratingEvidence: known({ score: 8.6, scale: 10 }),
    reviewEvidence: known({ count: 420, sourceClass: "VERIFIED_GUESTS" as const }),
    distanceEvidence: known({ meters: 1_200, measurement: "WALKING_DISTANCE" as const }),
    accommodationCategoryEvidence: known("CATEGORY_HOTEL_4_STAR"),
    roomEvidence: known({
      roomTypeCode: "ROOM_DOUBLE_STANDARD",
      adults: 2,
      childAges: [],
      rooms: 1,
    }),
    cancellationEvidence: known({
      refundability: "REFUNDABLE" as const,
      freeCancellationUntilBucket: "BEFORE_CHECKIN_7_DAYS",
      penaltyMinorUnits: 0,
      penaltyCurrency: "EUR",
    }),
    comfortEvidence: known({ featureCodes: ["FEATURE_BREAKFAST", "FEATURE_WIFI"] }),
    dataReliability: "HIGH",
    costCompleteness: "COMPLETE",
    bookabilityStatus: "AVAILABLE",
    missingEvidence: [],
    reasonCodes: ["solution:single"],
  };
}

function withFingerprint(
  value: Omit<StayOptiGoldenCaseV3, "declaredFingerprint">,
): StayOptiGoldenCaseV3 {
  const candidate = value as StayOptiGoldenCaseV3;
  return {
    ...candidate,
    declaredFingerprint: createGoldenCaseFingerprintV3(candidate),
  };
}

function makeValidCase(
  overrides: Partial<StayOptiGoldenCaseV3> = {},
): StayOptiGoldenCaseV3 {
  const base: Omit<StayOptiGoldenCaseV3, "declaredFingerprint"> = {
    schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
    caseVersion: "1.0.0",
    goldenCaseId: "GOLDEN_CASE_SYNTHETIC_001",
    searchFamilyId: "SEARCH_FAMILY_SYNTHETIC_001",
    sourceKind: "REAL_NORMALIZED_SNAPSHOT",
    createdAtBucket: "2026-08",
    provenance: {
      origin: "REAL_NORMALIZED_SNAPSHOT",
      collectionBoundary: "PROVIDER_EXHAUSTED_WITHIN_CAP",
      normalizerVersion: "normalizer.synthetic.1",
      evidenceSchemaVersion: "evidence.synthetic.1",
      providerSourceKey: "SOURCE_SYNTHETIC_AUTHORIZED",
      freshnessBucket: "SAME_DAY",
      transformationProcess: "SYNTHETIC_TEST_ONLY",
      parentGoldenCaseId: null,
    },
    tripContext: {
      checkIn: "2027-01-10",
      checkOut: "2027-01-15",
      nights: 5,
      adults: 2,
      childAges: [],
      rooms: 1,
      expectedCurrency: "EUR",
      destinationBucket: "DESTINATION_SYNTHETIC_CITY",
      bookingLeadTimeBucket: "ADVANCE",
      stayLengthBucket: "MEDIUM",
      seasonBucket: "SHOULDER",
    },
    travelerContext: {
      budgetMinorUnits: 100_000,
      profile: "balanced",
      essentialConstraintCodes: ["CONSTRAINT_SINGLE_STAY"],
      distancePreference: {
        status: "KNOWN",
        maximumDistanceMeters: 3_000,
        unknownReason: null,
      },
      comfortRequirements: {
        status: "KNOWN",
        requiredCodes: ["FEATURE_WIFI"],
        unknownReason: null,
      },
      flexibilityRequirements: {
        status: "KNOWN",
        minimumRefundability: "REFUNDABLE",
        payLaterRequired: false,
        unknownReason: null,
      },
    },
    alternatives: [alternative("ALT_A", 72_000), alternative("ALT_B", 81_000)],
    decisions: {
      v2: {
        engineKey: "V2_BASELINE",
        policyVersion: "v2.synthetic.1",
        status: "SELECTED",
        selectedAlternativeIds: ["ALT_A"],
        role: "best-choice",
        confidenceBps: 7_000,
        reasonCodes: ["decision:recommended"],
        evidenceRefs: ["EVIDENCE_PRIMARY_001"],
        fallbackStatus: "NOT_USED",
      },
      v3Candidate: {
        engineKey: "V3_CANDIDATE",
        policyVersion: "v3.synthetic.1",
        status: "SELECTED",
        selectedAlternativeIds: ["ALT_A"],
        role: "best-choice",
        confidenceBps: 7_500,
        reasonCodes: ["decision:recommended"],
        evidenceRefs: ["EVIDENCE_PRIMARY_001"],
        fallbackStatus: "NOT_USED",
      },
    },
    expectedRole: "best-choice",
    abstentionEligibility: {
      status: "NOT_EVALUABLE",
      reasonCodes: ["decision:recommended"],
    },
    evidenceRefs: ["EVIDENCE_PRIMARY_001"],
  };
  const merged = {
    ...base,
    ...overrides,
  } as Omit<StayOptiGoldenCaseV3, "declaredFingerprint">;
  delete (merged as Partial<StayOptiGoldenCaseV3>).declaredFingerprint;
  return withFingerprint(merged);
}

function deriveCase(
  kind: "CONTROLLED_ADVERSARIAL" | "COUNTERFACTUAL_DERIVED",
  id: string,
  family: string,
  budgetMinorUnits: number,
  pairId?: string,
): StayOptiGoldenCaseV3 {
  const parentGoldenCaseId = "GOLDEN_CASE_SYNTHETIC_PARENT";
  const base = makeValidCase({
    goldenCaseId: id,
    searchFamilyId: family,
    sourceKind: kind,
  });
  const candidate: Omit<StayOptiGoldenCaseV3, "declaredFingerprint"> = {
    ...base,
    travelerContext: { ...base.travelerContext, budgetMinorUnits },
    provenance: {
      ...base.provenance,
      origin: kind,
      collectionBoundary: "CONTROLLED_OFFLINE_DERIVATION",
      parentGoldenCaseId,
      transformationProcess: "PRECOMMITTED_SYNTHETIC_DERIVATION",
    },
    transformations: [{
      ordinal: 0,
      transformationId: kind === "CONTROLLED_ADVERSARIAL"
        ? "TRANSFORM_ADVERSARIAL_001"
        : "TRANSFORM_COUNTERFACTUAL_001",
      kind: kind === "CONTROLLED_ADVERSARIAL" ? "ADVERSARIAL" : "COUNTERFACTUAL",
      changedDimension: kind === "COUNTERFACTUAL_DERIVED" ? "BUDGET" : null,
      descriptionCode: kind === "CONTROLLED_ADVERSARIAL"
        ? "CODE_DOMINATED_OPTION_INJECTED"
        : "CODE_BUDGET_CHANGED",
      precommitted: true,
    }],
  };
  delete (candidate as Partial<StayOptiGoldenCaseV3>).declaredFingerprint;
  if (kind === "COUNTERFACTUAL_DERIVED") {
    candidate.counterfactual = {
      counterfactualPairId: pairId ?? "PAIR_SYNTHETIC_BUDGET_001",
      parentGoldenCaseId,
      changedDimension: "BUDGET",
      changedPaths: ["travelerContext.budgetMinorUnits"],
      precommittedBeforeEvaluation: true,
      sameSearchFamilyRequired: true,
    };
  }
  return withFingerprint(candidate);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function refresh(value: StayOptiGoldenCaseV3): StayOptiGoldenCaseV3 {
  const candidate = clone(value);
  delete candidate.declaredFingerprint;
  return withFingerprint(candidate);
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, nested]) => [key, reverseObjectKeys(nested)]),
  );
}

test("V3-17O accepts a complete real normalized synthetic case without mutation", () => {
  const value = makeValidCase();
  const before = structuredClone(value);
  const result = validateGoldenCaseV3(value);
  assert.equal(result.disposition, "GOLDEN_VALID");
  assert.equal(result.providerNeutralReplayEligible, true);
  assert.deepEqual(value, before);
});

test("V3-17O accepts a controlled adversarial case and a precommitted counterfactual pair", () => {
  const adversarial = deriveCase(
    "CONTROLLED_ADVERSARIAL",
    "GOLDEN_CASE_SYNTHETIC_ADV_001",
    "SEARCH_FAMILY_SYNTHETIC_ADV_001",
    100_000,
  );
  const first = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_001A",
    "SEARCH_FAMILY_SYNTHETIC_CF_001",
    90_000,
  );
  const second = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_001B",
    "SEARCH_FAMILY_SYNTHETIC_CF_001",
    110_000,
  );
  assert.equal(validateGoldenCaseV3(adversarial).disposition, "GOLDEN_VALID");
  assert.equal(validateCounterfactualPairV3(first, second).valid, true);
});

test("explicit UNKNOWN evidence is valid while an absent required wrapper is quarantined", () => {
  const unknown = makeValidCase();
  unknown.alternatives[0]!.distanceEvidence = {
    status: "UNKNOWN",
    reliability: "UNKNOWN",
    value: null,
    unknownReason: "NOT_OBSERVED_IN_SYNTHETIC_SOURCE",
    evidenceRefs: [],
  };
  const accepted = validateGoldenCaseV3(refresh(unknown));
  assert.equal(accepted.disposition, "GOLDEN_VALID");
  assert.equal(accepted.explicitUnknownEvidenceAccepted, true);

  const incomplete = clone(makeValidCase()) as unknown as {
    alternatives: Array<Record<string, unknown>>;
  };
  delete incomplete.alternatives[0]!.distanceEvidence;
  const quarantined = validateGoldenCaseV3(incomplete);
  assert.equal(quarantined.disposition, "QUARANTINED_INCOMPLETE");
  assert.ok(quarantined.issues.some((issue) => issue.reasonCode === "GOLDEN_REQUIRED_FIELD_MISSING"));
});

test("unsafe provider, raw, secret, PII, and commercial fields fail closed", () => {
  const unsafeFields = [
    ["provider_id", "SYNTHETIC_PROVIDER_IDENTIFIER", "GOLDEN_RAW_PROVIDER_IDENTIFIER_PRESENT"],
    ["rawPayload", { synthetic: true }, "GOLDEN_UNSAFE_FIELD_PRESENT"],
    ["accessToken", "SYNTHETIC_REDACTED", "GOLDEN_SECRET_OR_TOKEN_PRESENT"],
    ["email", "synthetic@example.invalid", "GOLDEN_PII_PRESENT"],
    ["commission", 1, "GOLDEN_COMMERCIAL_FIELD_PRESENT"],
  ] as const;
  for (const [key, fieldValue, reason] of unsafeFields) {
    const value = clone(makeValidCase()) as unknown as Record<string, unknown>;
    value[key] = fieldValue;
    const result = validateGoldenCaseV3(value);
    assert.equal(result.disposition, "REJECTED_CONTRACT", key);
    assert.ok(result.issues.some((issue) => issue.reasonCode === reason), key);
  }
});

test("duplicate alternative IDs and dangling decision references are rejected", () => {
  const duplicate = makeValidCase();
  duplicate.alternatives[1]!.localAlternativeId = "ALT_A";
  assert.ok(validateGoldenCaseV3(refresh(duplicate)).issues.some(
    (issue) => issue.reasonCode === "GOLDEN_DUPLICATE_ALTERNATIVE_ID",
  ));

  const dangling = makeValidCase();
  dangling.decisions.v3Candidate.selectedAlternativeIds = ["ALT_MISSING"];
  assert.ok(validateGoldenCaseV3(refresh(dangling)).issues.some(
    (issue) => issue.reasonCode === "GOLDEN_DECISION_REFERENCE_INVALID",
  ));
});

test("currency mismatch and invalid minor-unit values are rejected deterministically", () => {
  const values: unknown[] = [12.5, Number.NaN, Number.POSITIVE_INFINITY, -1];
  for (const amount of values) {
    const value = makeValidCase();
    value.alternatives[0]!.totalTripCostMinorUnits = amount as number;
    const result = validateGoldenCaseV3(value);
    assert.equal(result.disposition, "REJECTED_CONTRACT");
  }
  const mismatch = makeValidCase();
  mismatch.alternatives[0]!.currency = "USD";
  const result = validateGoldenCaseV3(refresh(mismatch));
  assert.ok(result.issues.some((issue) => issue.reasonCode === "GOLDEN_CURRENCY_MISMATCH"));
});

test("unsupported schema and unrecoverable types are rejected", () => {
  const schema = clone(makeValidCase()) as unknown as Record<string, unknown>;
  schema.schemaVersion = "stayopti.v3.golden-case@999";
  assert.ok(validateGoldenCaseV3(schema).issues.some(
    (issue) => issue.reasonCode === "GOLDEN_SCHEMA_UNSUPPORTED",
  ));
  const wrongType = clone(makeValidCase()) as unknown as Record<string, unknown>;
  wrongType.alternatives = "not-an-array";
  assert.equal(validateGoldenCaseV3(wrongType).disposition, "REJECTED_CONTRACT");
});

test("corpus validation rejects duplicate IDs and equal content under renamed IDs", () => {
  const first = makeValidCase();
  const sameId = clone(first);
  const renamed = makeValidCase({ goldenCaseId: "GOLDEN_CASE_SYNTHETIC_RENAMED" });
  const report = validateGoldenCorpusV3([first, sameId, renamed]);
  assert.equal(report.counts.exactDuplicates, 2);
  assert.equal(report.counts.valid, 0);
  assert.ok(report.issues.some((issue) => issue.reasonCode === "GOLDEN_DUPLICATE_CASE_ID"));
  assert.ok(report.issues.some((issue) => issue.reasonCode === "GOLDEN_EXACT_DUPLICATE"));
});

test("the fifth primary variant rejects the entire over-limit family without cherry-picking", () => {
  const cases = Array.from({ length: 5 }, (_, index) => makeValidCase({
    goldenCaseId: `GOLDEN_CASE_SYNTHETIC_FAMILY_${index + 1}`,
    travelerContext: {
      ...makeValidCase().travelerContext,
      budgetMinorUnits: 100_000 + index,
    },
  }));
  const report = validateGoldenCorpusV3(cases);
  assert.equal(report.counts.valid, 0);
  assert.equal(report.counts.rejected, 5);
  assert.ok(report.issues.some((issue) => issue.reasonCode === "GOLDEN_FAMILY_LIMIT_EXCEEDED"));
});

test("counterfactual validation rejects two changed dimensions and no real change", () => {
  const first = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_BAD_A",
    "SEARCH_FAMILY_SYNTHETIC_CF_BAD",
    90_000,
    "PAIR_SYNTHETIC_BAD_001",
  );
  const twoDimensions = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_BAD_B",
    "SEARCH_FAMILY_SYNTHETIC_CF_BAD",
    110_000,
    "PAIR_SYNTHETIC_BAD_001",
  );
  twoDimensions.travelerContext.profile = "savings";
  assert.equal(validateCounterfactualPairV3(first, refresh(twoDimensions)).valid, false);

  const noChange = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_BAD_C",
    "SEARCH_FAMILY_SYNTHETIC_CF_BAD",
    90_000,
    "PAIR_SYNTHETIC_BAD_001",
  );
  assert.equal(validateCounterfactualPairV3(first, noChange).valid, false);
});

test("fingerprints ignore key and provider arrival order but change with material evidence", () => {
  const original = makeValidCase();
  const reverseAlternatives = clone(original);
  reverseAlternatives.alternatives.reverse();
  reverseAlternatives.evidenceRefs.reverse();
  assert.equal(
    createGoldenCaseFingerprintV3(original),
    createGoldenCaseFingerprintV3(reverseAlternatives),
  );
  const reordered = reverseObjectKeys(original) as StayOptiGoldenCaseV3;
  assert.equal(
    createGoldenCaseFingerprintV3(original),
    createGoldenCaseFingerprintV3(reordered),
  );
  assert.equal(
    canonicalSerializeGoldenCaseV3(original),
    canonicalSerializeGoldenCaseV3(reordered),
  );

  const changed = clone(original);
  changed.alternatives[0]!.totalTripCostMinorUnits += 1;
  assert.notEqual(
    createGoldenCaseFingerprintV3(original),
    createGoldenCaseFingerprintV3(changed),
  );
});

test("declared fingerprint mismatch is rejected", () => {
  const value = makeValidCase();
  value.travelerContext.budgetMinorUnits += 1;
  const result = validateGoldenCaseV3(value);
  assert.ok(result.issues.some((issue) => issue.reasonCode === "GOLDEN_FINGERPRINT_MISMATCH"));
});

test("prototype pollution keys, getters, and non-plain objects are rejected without reading values", () => {
  const pollution = JSON.parse('{"__proto__":{"synthetic":"value"}}') as Record<string, unknown>;
  const polluted = Object.assign(clone(makeValidCase()), pollution);
  assert.equal(validateGoldenCaseV3(polluted).disposition, "REJECTED_CONTRACT");

  const getter = clone(makeValidCase()) as unknown as Record<string, unknown>;
  Object.defineProperty(getter, "unsafeGetter", { enumerable: true, get: () => "not-read" });
  assert.equal(validateGoldenCaseV3(getter).disposition, "REJECTED_CONTRACT");

  const nonPlain = new (class SyntheticCase {})();
  Object.assign(nonPlain, clone(makeValidCase()));
  assert.equal(validateGoldenCaseV3(nonPlain).disposition, "REJECTED_CONTRACT");
});

test("Split fixtures never count automatically as single-stay Golden evidence", () => {
  const split = clone(makeValidCase()) as unknown as Record<string, unknown>;
  split.expectedRole = "split-saver";
  const report = validateGoldenCorpusV3([split]);
  assert.equal(report.counts.splitCasesExcluded, 1);
  assert.equal(report.counts.valid, 0);
});

test("corpus reports dual denominators, specialist counts, and frozen gate state", () => {
  const real = makeValidCase();
  const adversarial = deriveCase(
    "CONTROLLED_ADVERSARIAL",
    "GOLDEN_CASE_SYNTHETIC_ADV_COUNT",
    "SEARCH_FAMILY_SYNTHETIC_ADV_COUNT",
    100_000,
  );
  const first = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_COUNT_A",
    "SEARCH_FAMILY_SYNTHETIC_CF_COUNT",
    90_000,
    "PAIR_SYNTHETIC_COUNT_001",
  );
  const second = deriveCase(
    "COUNTERFACTUAL_DERIVED",
    "GOLDEN_CASE_SYNTHETIC_CF_COUNT_B",
    "SEARCH_FAMILY_SYNTHETIC_CF_COUNT",
    110_000,
    "PAIR_SYNTHETIC_COUNT_001",
  );
  const report = validateGoldenCorpusV3([real, adversarial, first, second]);
  assert.equal(report.caseDenominator, 4);
  assert.equal(report.searchFamilyDenominator, 3);
  assert.equal(report.counts.adversarialCases, 1);
  assert.equal(report.counts.counterfactualCases, 2);
  assert.equal(report.v3_17GateMet, false);
  assert.equal(report.v3_18EntryAllowed, false);
});

test("results and reason-code paths are deterministic and sorted", () => {
  const value = clone(makeValidCase()) as unknown as Record<string, unknown>;
  value.bookingId = "SYNTHETIC_FORBIDDEN";
  value.commission = 1;
  const first = validateGoldenCaseV3(value);
  const second = validateGoldenCaseV3(value);
  assert.deepEqual(first, second);
  const keys = first.issues.map((issue) => `${issue.path}\u0000${issue.reasonCode}`);
  assert.deepEqual(keys, [...keys].sort());
});
