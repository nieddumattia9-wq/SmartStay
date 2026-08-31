import assert from "node:assert/strict";
import test from "node:test";

import {
  STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
  type StayOptiGoldenAlternativeV3,
  type StayOptiGoldenCaseV3,
  type StayOptiGoldenSingleStayRoleV3,
} from "../../src/engine-v3/evaluation/goldenCaseContractV3";
import {
  createGoldenCaseFingerprintV3,
} from "../../src/engine-v3/evaluation/goldenCaseValidatorV3";
import {
  STAYOPTI_GOLDEN_BLIND_CAPSULE_AUDIT_V3,
  createGoldenBlindBatchV3,
  renderGoldenBlindEvaluationHtmlV3,
  scanGoldenBlindCapsuleForLeaksV3,
} from "../../src/engine-v3/evaluation/goldenBlindCapsuleV3";
import {
  STAYOPTI_GOLDEN_JUDGMENT_SCHEMA_VERSION_V3,
  type StayOptiGoldenBlindJudgmentV3,
} from "../../src/engine-v3/evaluation/goldenJudgmentContractV3";
import {
  appendGoldenBlindJudgmentV3,
  createEmptyGoldenJudgmentLedgerV3,
  validateGoldenBlindJudgmentV3,
  validateGoldenJudgmentLedgerV3,
} from "../../src/engine-v3/evaluation/goldenJudgmentValidatorV3";
import {
  createGoldenDeblindReportV3,
} from "../../src/engine-v3/evaluation/goldenDeblindV3";

function known<T>(value: T) {
  return {
    status: "KNOWN" as const,
    reliability: "HIGH" as const,
    value,
    unknownReason: null,
    evidenceRefs: ["EVIDENCE_SYNTHETIC_001"],
  };
}

function alternative(id: string, price: number): StayOptiGoldenAlternativeV3 {
  return {
    localAlternativeId: id,
    totalTripCostMinorUnits: price,
    currency: "EUR",
    taxFeeEvidence: known({ totalKnownMinorUnits: price, taxesIncluded: true, feesIncluded: true }),
    ratingEvidence: known({ score: 8.4, scale: 10 }),
    reviewEvidence: known({ count: 250, sourceClass: "VERIFIED_GUESTS" as const }),
    distanceEvidence: known({ meters: 1_100, measurement: "WALKING_DISTANCE" as const }),
    accommodationCategoryEvidence: known("CATEGORY_FOUR_STAR"),
    roomEvidence: known({ roomTypeCode: "ROOM_STANDARD", adults: 2, childAges: [], rooms: 1 }),
    cancellationEvidence: known({
      refundability: "REFUNDABLE" as const,
      freeCancellationUntilBucket: "BEFORE_ARRIVAL",
      penaltyMinorUnits: 0,
      penaltyCurrency: "EUR",
    }),
    comfortEvidence: known({ featureCodes: ["FEATURE_WIFI"] }),
    dataReliability: "HIGH",
    costCompleteness: "COMPLETE",
    bookabilityStatus: "AVAILABLE",
    missingEvidence: [],
    reasonCodes: ["solution:single"],
  };
}

function makeCase(
  ordinal: number,
  familyOrdinal = ordinal,
  role: StayOptiGoldenSingleStayRoleV3 = "best-choice",
): StayOptiGoldenCaseV3 {
  const candidate: StayOptiGoldenCaseV3 = {
    schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
    caseVersion: "1.0.0",
    goldenCaseId: `GOLDEN_CASE_BLIND_SYNTHETIC_${String(ordinal).padStart(3, "0")}`,
    searchFamilyId: `SEARCH_FAMILY_BLIND_SYNTHETIC_${String(familyOrdinal).padStart(3, "0")}`,
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
      checkIn: "2027-02-10",
      checkOut: "2027-02-15",
      nights: 5,
      adults: 2,
      childAges: [],
      rooms: 1,
      expectedCurrency: "EUR",
      destinationBucket: `DESTINATION_BUCKET_${familyOrdinal}`,
      bookingLeadTimeBucket: "ADVANCE",
      stayLengthBucket: "MEDIUM",
      seasonBucket: "SHOULDER",
    },
    travelerContext: {
      budgetMinorUnits: 100_000,
      profile: "balanced",
      essentialConstraintCodes: ["CONSTRAINT_SINGLE_STAY"],
      distancePreference: { status: "KNOWN", maximumDistanceMeters: 3_000, unknownReason: null },
      comfortRequirements: { status: "KNOWN", requiredCodes: ["FEATURE_WIFI"], unknownReason: null },
      flexibilityRequirements: {
        status: "KNOWN",
        minimumRefundability: "REFUNDABLE",
        payLaterRequired: false,
        unknownReason: null,
      },
    },
    alternatives: [alternative("ALT_A", 72_000), alternative("ALT_B", 79_000)],
    decisions: {
      v2: {
        engineKey: "V2_BASELINE",
        policyVersion: "baseline.synthetic.1",
        status: "SELECTED",
        selectedAlternativeIds: ["ALT_A"],
        role,
        confidenceBps: 7_000,
        reasonCodes: ["decision:recommended"],
        evidenceRefs: ["EVIDENCE_SYNTHETIC_001"],
        fallbackStatus: "NOT_USED",
      },
      v3Candidate: {
        engineKey: "V3_CANDIDATE",
        policyVersion: "candidate.synthetic.1",
        status: "SELECTED",
        selectedAlternativeIds: ["ALT_B"],
        role,
        confidenceBps: 7_500,
        reasonCodes: ["decision:recommended"],
        evidenceRefs: ["EVIDENCE_SYNTHETIC_001"],
        fallbackStatus: "NOT_USED",
      },
    },
    expectedRole: role,
    abstentionEligibility: { status: "NOT_EVALUABLE", reasonCodes: ["decision:recommended"] },
    evidenceRefs: ["EVIDENCE_SYNTHETIC_001"],
  };
  candidate.declaredFingerprint = createGoldenCaseFingerprintV3(candidate);
  return candidate;
}

const batchInput = (cases: readonly StayOptiGoldenCaseV3[], suffix = "A") => ({
  cases,
  batchId: `BATCH_SYNTHETIC_BLIND_${suffix}`,
  privateSeed: `SYNTHETIC_PRIVATE_SEED_${suffix}_0123456789`,
  batchKey: `SYNTHETIC_BATCH_KEY_${suffix}_0123456789`,
});

function judgment(
  taskId: string,
  batchId: string,
  ordinal: number,
  choice: StayOptiGoldenBlindJudgmentV3["choice"] = "A",
  evaluatorClass: StayOptiGoldenBlindJudgmentV3["evaluatorClass"] = "HUMAN",
): StayOptiGoldenBlindJudgmentV3 {
  return {
    judgmentSchemaVersion: STAYOPTI_GOLDEN_JUDGMENT_SCHEMA_VERSION_V3,
    judgmentId: `JUDGMENT_SYNTHETIC_${String(ordinal).padStart(3, "0")}`,
    batchId,
    evaluationTaskId: taskId,
    evaluatorPseudonym: `EVALUATOR_SYNTHETIC_${String(ordinal).padStart(3, "0")}`,
    evaluatorClass,
    choice,
    confidence: 4,
    reasonCodes: choice === "TIE"
      ? ["OPTIONS_EFFECTIVELY_EQUIVALENT"]
      : choice === "INSUFFICIENT_EVIDENCE"
        ? ["EVIDENCE_TOO_INCOMPLETE"]
        : ["BETTER_TOTAL_VALUE"],
    durationBucket: "DURATION_MEDIUM",
    consentVersion: "consent.1",
    createdAtBucket: "2026-08",
  };
}

test("V3-17P generation is deterministic for the same caller-provided seed", () => {
  const input = batchInput([makeCase(1), makeCase(2)]);
  assert.deepEqual(createGoldenBlindBatchV3(input), createGoldenBlindBatchV3(input));
});

test("different batch secrets produce different pseudonyms and no cross-batch linkability", () => {
  const cases = [makeCase(1), makeCase(2)];
  const first = createGoldenBlindBatchV3(batchInput(cases, "A"));
  const second = createGoldenBlindBatchV3(batchInput(cases, "B"));
  assert.notEqual(first.capsule.tasks[0]!.evaluationTaskId, second.capsule.tasks[0]!.evaluationTaskId);
  assert.notEqual(first.capsule.tasks[0]!.blindedCaseId, second.capsule.tasks[0]!.blindedCaseId);
});

test("A/B assignment is balanced and task order deterministic", () => {
  const cases = [makeCase(1), makeCase(2), makeCase(3), makeCase(4), makeCase(5)];
  const created = createGoldenBlindBatchV3(batchInput(cases));
  const candidateOnA = created.manifest.entries.filter((entry) => entry.sideAEngine === "V3_CANDIDATE").length;
  assert.ok(Math.abs(candidateOnA - (cases.length - candidateOnA)) <= 1);
  assert.deepEqual(
    created.capsule.tasks.map((task) => task.evaluationTaskId),
    createGoldenBlindBatchV3(batchInput(cases)).capsule.tasks.map((task) => task.evaluationTaskId),
  );
});

test("role-aware tasks never compare different roles", () => {
  const roles: StayOptiGoldenSingleStayRoleV3[] = [
    "best-choice",
    "best-sensible-saving",
    "worthwhile-comfort-upgrade",
    "abstention-near-tie",
  ];
  const created = createGoldenBlindBatchV3(batchInput(
    roles.map((role, index) => makeCase(index + 1, index + 1, role)),
  ));
  for (const task of created.capsule.tasks) {
    const entry = created.manifest.entries.find((item) => item.evaluationTaskId === task.evaluationTaskId);
    assert.equal(entry?.role, task.role);
  }
});

test("quarantined, rejected and Split cases fail closed", () => {
  const incomplete = structuredClone(makeCase(1)) as unknown as Record<string, unknown>;
  delete incomplete.tripContext;
  assert.throws(() => createGoldenBlindBatchV3(batchInput([incomplete as unknown as StayOptiGoldenCaseV3])));
  const rejected = structuredClone(makeCase(2)) as unknown as StayOptiGoldenCaseV3 & { rawPayload: object };
  rejected.rawPayload = {};
  assert.throws(() => createGoldenBlindBatchV3(batchInput([rejected])));
  const split = structuredClone(makeCase(3)) as StayOptiGoldenCaseV3;
  split.expectedRole = "split-saver" as StayOptiGoldenSingleStayRoleV3;
  split.decisions.v2.role = split.expectedRole;
  split.decisions.v3Candidate.role = split.expectedRole;
  assert.throws(() => createGoldenBlindBatchV3(batchInput([split])));
});

test("manifest is physically separate and capsule anti-leak scan is clean", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  assert.equal(Object.hasOwn(created.capsule, "manifest"), false);
  assert.deepEqual(scanGoldenBlindCapsuleForLeaksV3(created.capsule), []);
  const serialized = JSON.stringify(created.capsule);
  for (const forbidden of ["goldenCaseId", "searchFamilyId", "policyVersion", "providerSourceKey", "V2_BASELINE", "V3_CANDIDATE", "commission", "markup", "seed"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("visible alternatives are reordered without changing decision values", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const task = created.capsule.tasks[0]!;
  assert.equal(task.alternatives.length, 2);
  assert.deepEqual(
    task.alternatives.map((item) => item.totalTripCostMinorUnits).sort((a, b) => a - b),
    [72_000, 79_000],
  );
  assert.equal(task.decisionA.selectedAlternativeRefs.length, 1);
  assert.equal(task.decisionB.selectedAlternativeRefs.length, 1);
});

test("private HTML is offline, symmetric and free of sealed mappings", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const html = renderGoldenBlindEvaluationHtmlV3(created.capsule);
  assert.match(html, /Private blind review/);
  assert.doesNotMatch(html, /https?:|fetch\(|XMLHttpRequest|localStorage|analytics/i);
  assert.doesNotMatch(html, /goldenCaseId|searchFamilyId|policyVersion|providerSourceKey|V2_BASELINE|V3_CANDIDATE/i);
  assert.doesNotMatch(html, new RegExp(created.manifest.entries[0]!.goldenCaseId, "i"));
});

for (const [index, choice] of (["A", "B", "TIE", "INSUFFICIENT_EVIDENCE"] as const).entries()) {
  test(`judgment choice ${choice} validates with required confidence and consent`, () => {
    const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
    const value = judgment(created.capsule.tasks[0]!.evaluationTaskId, created.capsule.batchId, index + 1, choice);
    assert.deepEqual(validateGoldenBlindJudgmentV3(value, created.capsule.tasks), { valid: true, issues: [] });
  });
}

test("confidence, reason and consent violations are rejected deterministically", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const taskId = created.capsule.tasks[0]!.evaluationTaskId;
  const invalidConfidence = { ...judgment(taskId, created.capsule.batchId, 1), confidence: 6 };
  const invalidReason = { ...judgment(taskId, created.capsule.batchId, 2), reasonCodes: ["FREE_TEXT_REASON"] };
  const missingConsent = { ...judgment(taskId, created.capsule.batchId, 3), consentVersion: "" };
  assert.ok(validateGoldenBlindJudgmentV3(invalidConfidence, created.capsule.tasks).issues.some((i) => i.reasonCode === "JUDGMENT_CONFIDENCE_INVALID"));
  assert.ok(validateGoldenBlindJudgmentV3(invalidReason, created.capsule.tasks).issues.some((i) => i.reasonCode === "JUDGMENT_REASON_UNKNOWN"));
  assert.ok(validateGoldenBlindJudgmentV3(missingConsent, created.capsule.tasks).issues.some((i) => i.reasonCode === "JUDGMENT_CONSENT_MISSING"));
});

test("PII, raw identifiers, commercial fields and unexpected keys are rejected", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const base = judgment(created.capsule.tasks[0]!.evaluationTaskId, created.capsule.batchId, 1) as unknown as Record<string, unknown>;
  for (const [key, value] of [["email", "person@example.invalid"], ["hotelId", "RAW_1"], ["accessToken", "sk-synthetic-123456789"], ["commission", 5]]) {
    const candidate = { ...base, [key]: value };
    const result = validateGoldenBlindJudgmentV3(candidate, created.capsule.tasks);
    assert.equal(result.valid, false, String(key));
    assert.ok(result.issues.some((issue) => issue.reasonCode === "JUDGMENT_UNSAFE_FIELD_PRESENT"), String(key));
  }
});

test("non-plain objects, getters and prototype pollution fail closed", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const taskId = created.capsule.tasks[0]!.evaluationTaskId;
  const polluted = Object.create({ injected: true }) as Record<string, unknown>;
  Object.assign(polluted, judgment(taskId, created.capsule.batchId, 1));
  assert.equal(validateGoldenBlindJudgmentV3(polluted, created.capsule.tasks).valid, false);
  const getter = structuredClone(judgment(taskId, created.capsule.batchId, 2)) as unknown as Record<string, unknown>;
  Object.defineProperty(getter, "unexpected", { enumerable: true, get: () => "value" });
  assert.equal(validateGoldenBlindJudgmentV3(getter, created.capsule.tasks).valid, false);
});

test("append-only ledger returns a new canonical value without mutating inputs", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const empty = createEmptyGoldenJudgmentLedgerV3(created.capsule.batchId);
  const before = structuredClone(empty);
  const value = judgment(created.capsule.tasks[0]!.evaluationTaskId, created.capsule.batchId, 1);
  const appended = appendGoldenBlindJudgmentV3(empty, value, created.capsule.tasks);
  assert.deepEqual(empty, before);
  assert.equal(appended.judgments.length, 1);
  assert.equal(Object.isFrozen(appended), true);
  assert.equal(Object.isFrozen(appended.judgments), true);
  assert.equal(Object.isFrozen(appended.judgments[0]), true);
  assert.equal(validateGoldenJudgmentLedgerV3(appended, created.capsule.tasks).valid, true);
});

test("duplicate judgment IDs and duplicate evaluator-task pairs reject overwrite", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const taskId = created.capsule.tasks[0]!.evaluationTaskId;
  const first = judgment(taskId, created.capsule.batchId, 1);
  const ledger = appendGoldenBlindJudgmentV3(
    createEmptyGoldenJudgmentLedgerV3(created.capsule.batchId),
    first,
    created.capsule.tasks,
  );
  assert.throws(() => appendGoldenBlindJudgmentV3(ledger, first, created.capsule.tasks));
  const duplicateEvaluator = { ...judgment(taskId, created.capsule.batchId, 2), evaluatorPseudonym: first.evaluatorPseudonym };
  assert.throws(() => appendGoldenBlindJudgmentV3(ledger, duplicateEvaluator, created.capsule.tasks));
  const altered = { ...ledger, judgments: [{ ...ledger.judgments[0]!, choice: "B" as const }] };
  assert.equal(validateGoldenJudgmentLedgerV3(altered, created.capsule.tasks).valid, false);
});

test("deterministic deblind maps A/B to sealed engines", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1), makeCase(2)]));
  let ledger = createEmptyGoldenJudgmentLedgerV3(created.capsule.batchId);
  created.capsule.tasks.forEach((task, index) => {
    ledger = appendGoldenBlindJudgmentV3(
      ledger,
      judgment(task.evaluationTaskId, created.capsule.batchId, index + 1, index === 0 ? "A" : "B"),
      created.capsule.tasks,
    );
  });
  const report = createGoldenDeblindReportV3(created.capsule, created.manifest, ledger);
  assert.equal(report.overall.total, 2);
  assert.equal(report.overall.v2 + report.overall.v3, 2);
  assert.equal(report.v3GateEvaluated, false);
});

test("deblind preserves case and search-family denominators", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1, 1), makeCase(2, 1), makeCase(3, 2)]));
  let ledger = createEmptyGoldenJudgmentLedgerV3(created.capsule.batchId);
  created.capsule.tasks.forEach((task, index) => {
    ledger = appendGoldenBlindJudgmentV3(ledger, judgment(task.evaluationTaskId, created.capsule.batchId, index + 1), created.capsule.tasks);
  });
  const report = createGoldenDeblindReportV3(created.capsule, created.manifest, ledger);
  assert.equal(report.caseDenominator, 3);
  assert.equal(report.searchFamilyDenominator, 2);
  assert.equal(report.familyDistribution.length, 2);
});

test("concentration report remains NOT_YET_APPLICABLE for fixture volume", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1)]));
  const ledger = appendGoldenBlindJudgmentV3(
    createEmptyGoldenJudgmentLedgerV3(created.capsule.batchId),
    judgment(created.capsule.tasks[0]!.evaluationTaskId, created.capsule.batchId, 1, "A", "EXPERT"),
    created.capsule.tasks,
  );
  const report = createGoldenDeblindReportV3(created.capsule, created.manifest, ledger);
  assert.equal(report.humanConcentration.status, "NOT_YET_APPLICABLE");
  assert.equal(report.expertConcentration.status, "NOT_YET_APPLICABLE");
  assert.equal(report.expertConcentration.limitBps, 2500);
});

test("deblind rejects missing judgments, manifest mismatch and capsule version mismatch", () => {
  const created = createGoldenBlindBatchV3(batchInput([makeCase(1), makeCase(2)]));
  const partial = appendGoldenBlindJudgmentV3(
    createEmptyGoldenJudgmentLedgerV3(created.capsule.batchId),
    judgment(created.capsule.tasks[0]!.evaluationTaskId, created.capsule.batchId, 1),
    created.capsule.tasks,
  );
  assert.throws(() => createGoldenDeblindReportV3(created.capsule, created.manifest, partial));
  const mismatched = structuredClone(created.manifest);
  mismatched.entries[0]!.role = "best-sensible-saving";
  assert.throws(() => createGoldenDeblindReportV3(created.capsule, mismatched, partial));
  const versionMismatch = structuredClone(created.capsule) as unknown as Record<string, unknown>;
  versionMismatch.capsuleVersion = "unsupported";
  assert.throws(() => createGoldenDeblindReportV3(versionMismatch as unknown as typeof created.capsule, created.manifest, partial));
});

test("offline audit exposes no network, analytics or public route capability", () => {
  assert.deepEqual(STAYOPTI_GOLDEN_BLIND_CAPSULE_AUDIT_V3, {
    privateOfflineOnly: true,
    callerProvidedPrivateSeedRequired: true,
    defaultSeedAllowed: false,
    seedPersisted: false,
    seedPrinted: false,
    crossBatchLinkability: false,
    splitAccepted: false,
    publicFrontendRouteAdded: false,
    publicBackendEndpointAdded: false,
    analyticsEmitted: false,
    providerCallsRequired: false,
  });
});
