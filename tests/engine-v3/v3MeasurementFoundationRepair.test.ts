import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_MEASUREMENT_FOUNDATION_AUDIT_V3,
  STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
  aggregateMeasurementBlindResponsesV3,
  assignMeasurementBlindRoleAfterResponseV3,
  createGoldenDecisionDatasetV3,
  createGoldenExternalBaselineRegistryV3,
  createMeasurementBlindResponseV3,
  createMeasurementBlindReviewBundleV3,
  createNormalizedDecisionSourceCapsuleV3,
  createStableHashV3,
  deblindMeasurementBlindResponseV3,
  evaluateGoldenDecisionDatasetGateV3,
  validateGoldenDecisionDatasetV3,
  validateMeasurementBlindReviewBundleV3,
  validateNormalizedDecisionSourceCapsuleV3,
  verifyMeasurementBlindReviewReplayV3,
  verifyNormalizedDecisionSourceArtifactHashV3,
  verifyNormalizedDecisionSourceCapsuleReplayV3,
  type StayOptiGoldenDecisionCaseV3,
  type StayOptiMeasurementBlindResponseV3,
  type StayOptiMeasurementBlindSourceCaseV3,
  type StayOptiMeasurementBlindVerdictV3,
  type StayOptiNormalizedDecisionSourceCapsuleInputV3,
} from "../../src/engine-v3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-17-measurement-foundation-technical-diagnostic-v1.json"
);

function fixture(): StayOptiNormalizedDecisionSourceCapsuleInputV3 {
  return JSON.parse(
    readFileSync(fixturePath, "utf8")
  ) as StayOptiNormalizedDecisionSourceCapsuleInputV3;
}

function sourceCase(): StayOptiMeasurementBlindSourceCaseV3 {
  const capsule = createNormalizedDecisionSourceCapsuleV3(fixture());
  return {
    caseId: "measurement-technical-case-001",
    caseType: "adversarial",
    technicalDiagnosticOnly: true,
    statisticalUseAllowed: false,
    decisionQuestion:
      "Which option is the most sensible stay given total cost, flexibility, evidence, and uncertainty?",
    sourceCapsule: capsule,
    alternativeIds: [
      "local-alternative-technical-a",
      "local-alternative-technical-b",
    ],
    optionalSealedAssociations: [
      {
        alternativeId: "local-alternative-technical-a",
        engineLabel: "v2",
        policyVersion: "technical-policy.1",
        roleLabel: "best-sensible-saving",
        providerOpaqueReference: "opaque-provider-reference-a",
      },
      {
        alternativeId: "local-alternative-technical-b",
        engineLabel: "v3",
        policyVersion: "technical-policy.1",
        roleLabel: null,
        providerOpaqueReference: "opaque-provider-reference-b",
      },
    ],
  };
}

function technicalResponse(
  verdict: StayOptiMeasurementBlindVerdictV3,
  index: number
): StayOptiMeasurementBlindResponseV3 {
  const bundle = createMeasurementBlindReviewBundleV3([sourceCase()]);
  const packet = bundle.packets[0];
  assert.ok(packet !== undefined);
  return createMeasurementBlindResponseV3(bundle, {
    responseId: `technical-response-${index}`,
    packetId: packet.packetId,
    packetFingerprint: packet.fingerprint,
    caseId: packet.reviewCase.caseId,
    evaluatorToken: `technical-evaluator-${index}`,
    evaluatorCategory: "technical",
    evaluationOrigin: "technical-contract-test",
    blinded: true,
    verdict,
    reasoning: "Contract-only response used to verify distinct verdict encoding.",
    mainSacrificeAccepted: "No traveler sacrifice is adjudicated by this technical input.",
    uncertainty: "This is not a human or expert judgment.",
    decisiveInformation: "Only response schema behavior is under test.",
    reversalCondition: "A contract violation would reverse this technical assertion.",
    confidence: "moderate",
  });
}

function diagnosticCase(
  caseId: string,
  kind: "baseline" | "adversarial",
  parentCaseId: string | null
): StayOptiGoldenDecisionCaseV3 {
  return {
    caseId,
    statisticalEligibility: "diagnostic-only",
    kind,
    origin: kind === "baseline" ? "real-search-snapshot" : "adversarial-derived",
    profile: "maximum-savings",
    segment: "uncertain-evidence",
    role: "best-choice",
    parentCaseId,
    technicalDiagnosticOnly: true,
    sourceEvidenceFingerprints: [
      createStableHashV3({ caseId }, "stayopti-v3-measurement-foundation-test"),
    ],
    measurement: null,
  };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    key,
    ...collectKeys(child),
  ]);
}

test("normalized source capsule is valid, replayable, and deterministically canonical", () => {
  const input = fixture();
  const capsule = createNormalizedDecisionSourceCapsuleV3(input);
  const permuted = structuredClone(input);
  permuted.alternatives.reverse();
  permuted.alternatives.forEach(({ featureCodes }) => featureCodes.reverse());

  assert.equal(validateNormalizedDecisionSourceCapsuleV3(capsule).valid, true);
  assert.equal(verifyNormalizedDecisionSourceCapsuleReplayV3(input, capsule), true);
  assert.deepEqual(createNormalizedDecisionSourceCapsuleV3(permuted), capsule);
  assert.equal(capsule.technicalDiagnosticOnly, true);
  assert.equal(capsule.statisticalUseAllowed, false);
  assert.equal(capsule.providerCallsRequiredForReplay, false);
});

test("capsule rejects missing provenance, commissions, PII, and usable sensitive IDs", () => {
  const missingProvenance = fixture();
  missingProvenance.provenanceManifest.transformations = [];
  assert.throws(
    () => createNormalizedDecisionSourceCapsuleV3(missingProvenance),
    /provenance-invalid/
  );

  for (const forbidden of [
    { commission: 14 },
    { email: "traveler@example.test" },
    { rateId: "usable-rate-id" },
  ]) {
    const input = Object.assign(fixture(), forbidden) as unknown as
      StayOptiNormalizedDecisionSourceCapsuleInputV3;
    assert.throws(
      () => createNormalizedDecisionSourceCapsuleV3(input),
      /forbidden-sensitive-or-commercial-field/
    );
  }
});

test("source artifact hash and capsule fingerprint fail closed after alteration", () => {
  const capsule = createNormalizedDecisionSourceCapsuleV3(fixture());
  assert.equal(
    verifyNormalizedDecisionSourceArtifactHashV3(
      capsule,
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    ),
    true
  );
  assert.equal(
    verifyNormalizedDecisionSourceArtifactHashV3(
      capsule,
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    ),
    false
  );
  const altered = structuredClone(capsule);
  altered.sourceArtifact.sha256 =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  assert.equal(validateNormalizedDecisionSourceCapsuleV3(altered).valid, false);
});

test("blind packet hides sealed labels and leaves role unassigned until after response", () => {
  const bundle = createMeasurementBlindReviewBundleV3([sourceCase()]);
  const packet = bundle.packets[0];
  assert.ok(packet !== undefined);
  const keys = new Set(collectKeys(packet));

  for (const forbiddenKey of [
    "engineLabel",
    "policyVersion",
    "providerOpaqueReference",
    "roleLabel",
    "commission",
    "alternativeId",
  ]) {
    assert.equal(keys.has(forbiddenKey), false);
  }
  assert.equal(packet.roleAssignedBeforeResponse, false);
  assert.equal(packet.reviewCase.roleAssignedBeforeResponse, false);
  assert.equal(packet.reviewCase.measurementState, "unmeasured");
  assert.equal(validateMeasurementBlindReviewBundleV3(bundle).valid, true);

  const response = technicalResponse("option-a", 100);
  const deblinded = deblindMeasurementBlindResponseV3(bundle, response);
  assert.equal(deblinded.resolvedRole, null);
  const assignment = assignMeasurementBlindRoleAfterResponseV3(
    bundle,
    response,
    "best-sensible-saving"
  );
  assert.equal(assignment.assignedAfterResponse, true);
  assert.equal(assignment.responseFingerprint, response.fingerprint);
});

test("A/B and sealed mapping are deterministic and independent from source order", () => {
  const source = sourceCase();
  const first = createMeasurementBlindReviewBundleV3([source]);
  const permuted = structuredClone(source);
  permuted.alternativeIds.reverse();
  const permutedCapsuleInput = fixture();
  permutedCapsuleInput.alternatives.reverse();
  permuted.sourceCapsule = createNormalizedDecisionSourceCapsuleV3(
    permutedCapsuleInput
  );
  permuted.optionalSealedAssociations.reverse();
  const second = createMeasurementBlindReviewBundleV3([permuted]);

  assert.deepEqual(second, first);
  assert.equal(verifyMeasurementBlindReviewReplayV3([source], first), true);
});

test("all five blind responses remain distinct and technical inputs stay unmeasured", () => {
  const bundle = createMeasurementBlindReviewBundleV3([sourceCase()]);
  const verdicts: StayOptiMeasurementBlindVerdictV3[] = [
    "option-a",
    "option-b",
    "tie",
    "no-good-option",
    "insufficient-information",
  ];
  const responses = verdicts.map(technicalResponse);
  assert.deepEqual(responses.map(({ verdict }) => verdict), verdicts);

  const aggregation = aggregateMeasurementBlindResponsesV3(bundle, responses);
  const firstCase = aggregation.cases[0];
  assert.ok(firstCase !== undefined);
  assert.equal(firstCase.measurementState, "unmeasured");
  assert.equal(firstCase.technicalResponsesExcluded, 5);
  assert.equal(firstCase.realHumanJudgments, 0);
  assert.equal(firstCase.realExpertJudgments, 0);
  assert.deepEqual(firstCase.verdicts, {
    "option-a": 0,
    "option-b": 0,
    tie: 0,
    "no-good-option": 0,
    "insufficient-information": 0,
  });
});

test("legacy blind protocol exports remain available and unchanged", () => {
  assert.equal(
    STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
    "3.0.0-role-aware-blind-review.2"
  );
});

test("internal baseline parents remain valid", () => {
  const baseline = diagnosticCase("golden-case-technical-baseline", "baseline", null);
  const derived = diagnosticCase(
    "golden-case-technical-derived",
    "adversarial",
    baseline.caseId
  );
  const dataset = createGoldenDecisionDatasetV3({
    datasetId: "golden-dataset-measurement-foundation-internal",
    cases: [baseline, derived],
    judgments: [],
    diagnosticInventories: [],
  });
  assert.equal(validateGoldenDecisionDatasetV3(dataset).valid, true);
  assert.equal(evaluateGoldenDecisionDatasetGateV3(dataset).counts.eligibleGoldenCases, 0);
});

test("external baseline parent resolves only through an exact canonical registry entry", () => {
  const contentHash = `sha256-${"a".repeat(64)}`;
  const registry = createGoldenExternalBaselineRegistryV3({
    registryId: "golden-parent-registry-measurement-foundation",
    entries: [
      {
        caseId: "golden-case-external-baseline",
        contentHash,
        datasetVersion: "3.0.0-canonical-baseline.1",
        schemaVersion: "3.0.0-canonical-baseline-schema.1",
        kind: "baseline",
        statisticalEligibility: "diagnostic-only",
      },
    ],
  });
  assert.throws(
    () =>
      createGoldenExternalBaselineRegistryV3({
        registryId: "golden-parent-registry-ambiguous-test",
        entries: [registry.entries[0]!, registry.entries[0]!],
      }),
    /external-registry-parent-ambiguous/
  );
  const derived = diagnosticCase(
    "golden-case-technical-external-derived",
    "adversarial",
    "golden-case-external-baseline"
  );
  derived.externalParentReference = {
    registryId: registry.registryId,
    caseId: "golden-case-external-baseline",
    contentHash,
    datasetVersion: "3.0.0-canonical-baseline.1",
    schemaVersion: "3.0.0-canonical-baseline-schema.1",
  };
  const input = {
    datasetId: "golden-dataset-measurement-foundation-external",
    cases: [derived],
    judgments: [],
    diagnosticInventories: [],
  };
  const dataset = createGoldenDecisionDatasetV3(input, {
    externalParentRegistry: registry,
  });
  const gate = evaluateGoldenDecisionDatasetGateV3(dataset, {
    externalParentRegistry: registry,
  });

  assert.equal(
    validateGoldenDecisionDatasetV3(dataset, { externalParentRegistry: registry }).valid,
    true
  );
  assert.equal(gate.counts.eligibleGoldenCases, 0);
  assert.equal(gate.counts.adversarialCases, 0);
  assert.equal(gate.counts.counterfactualCases, 0);
  assert.equal(gate.counts.humanBlindJudgments, 0);
  assert.equal(gate.counts.expertBlindJudgments, 0);
  assert.equal(gate.counts.diagnosticCasesExcluded, 1);

  const unknown = structuredClone(input);
  unknown.cases[0]!.parentCaseId = "golden-case-unknown-baseline";
  unknown.cases[0]!.externalParentReference!.caseId = "golden-case-unknown-baseline";
  assert.throws(
    () => createGoldenDecisionDatasetV3(unknown, { externalParentRegistry: registry }),
    /external-derived-parent-unknown/
  );

  const wrongHash = structuredClone(input);
  wrongHash.cases[0]!.externalParentReference!.contentHash =
    `sha256-${"b".repeat(64)}`;
  assert.throws(
    () => createGoldenDecisionDatasetV3(wrongHash, { externalParentRegistry: registry }),
    /external-derived-parent-mismatch/
  );
  assert.throws(
    () => createGoldenDecisionDatasetV3(input),
    /external-derived-parent-unresolved/
  );
});

test("repair audit freezes all Golden and judgment counts", () => {
  assert.deepEqual(STAYOPTI_MEASUREMENT_FOUNDATION_AUDIT_V3, {
    application: "offline-measurement-foundation-only",
    goldenReceiptsBefore: 115,
    goldenReceiptsAfter: 115,
    decisionResearchUsableBefore: 5,
    decisionResearchUsableAfter: 5,
    newGoldenCases: 0,
    newAdversarialCases: 0,
    newCounterfactualCases: 0,
    newHumanJudgments: 0,
    newExpertJudgments: 0,
    aiJudgmentsCountedAsHumanOrExpert: 0,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    providerCalls: 0,
    bookingOrPaymentChanged: false,
    deployChanged: false,
  });
});
