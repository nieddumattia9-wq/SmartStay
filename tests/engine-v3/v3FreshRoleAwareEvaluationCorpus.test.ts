import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  stableSerializeV3,
} from "../../src/engine-v3/contract/stableHashV3";

import {
  STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3,
  validateFreshReplayableRoleAwareCapsuleV3,
  verifyFreshReplayableRoleAwareCapsuleReplayV3,
} from "../../src/engine-v3/evaluation/freshReplayableRoleAwareCapsuleV3";

import {
  validateFreshRoleAwareBlindBundleV3,
} from "../../src/engine-v3/evaluation/freshRoleAwareBlindPipelineV3";

import {
  STAYOPTI_FRESH_ROLE_AWARE_CORPUS_AUDIT_V3,
  STAYOPTI_FRESH_ROLE_AWARE_CORPUS_DURATIONS_V3,
  containsLegacyDiagnosticIdentifierV3,
  createFreshRoleAwareEvaluationCorpusV3,
  validateFreshRoleAwareEvaluationCorpusV3,
  type StayOptiFreshRoleAwareCorpusFixtureV3,
} from "../../src/engine-v3/evaluation/freshRoleAwareEvaluationCorpusV3";

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-12b2-fresh-role-aware-corpus-v1.json"
);

function loadFixture() {
  return JSON.parse(
    readFileSync(fixturePath, "utf8")
  ) as StayOptiFreshRoleAwareCorpusFixtureV3;
}

function countBy(values: readonly string[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [
      value,
      values.filter((candidate) => candidate === value).length,
    ])
  );
}

function collectKeys(value: unknown, output: string[] = []) {
  if (Array.isArray(value)) {
    for (const child of value) {
      collectKeys(child, output);
    }
  }
  else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      output.push(key);
      collectKeys(child, output);
    }
  }
  return output;
}

function collectStrings(value: unknown, output: string[] = []) {
  if (typeof value === "string") {
    output.push(value);
  }
  else if (Array.isArray(value)) {
    for (const child of value) {
      collectStrings(child, output);
    }
  }
  else if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectStrings(child, output);
    }
  }
  return output;
}

test(
  "V3-12B2 freezes a complete 30-case role-duration matrix with balanced partitions",
  () => {
    const fixture = loadFixture();
    const corpus = createFreshRoleAwareEvaluationCorpusV3(fixture);
    const validation = validateFreshRoleAwareEvaluationCorpusV3(fixture, corpus);
    const roleCounts = countBy(
      corpus.records.map((record) => record.capsule.evaluationIntent.role)
    );
    const durationCounts = countBy(
      corpus.records.map((record) => String(record.capsule.searchContext.nights))
    );
    const partitionCounts = countBy(
      corpus.records.map((record) => record.partition)
    );
    const manifestBindings = fixture.cases.flatMap((item) => [
      item.expectedContentDigest,
      item.expectedCapsuleFingerprint,
      item.expectedPacketFingerprint,
      item.expectedAssignmentFingerprint,
      item.expectedBundleFingerprint,
    ]);
    const sealedHoldoutProfiles = new Set(
      fixture.cases
        .filter((item) => item.partition === "sealed-holdout")
        .map((item) => item.profile)
    );
    const hasLegacyBoundaryIssue = validation.issues.some((issue) =>
      issue.startsWith("corpus-record-boundary-invalid:")
    );

    assert.equal(hasLegacyBoundaryIssue, false);
    assert.deepEqual(validation, { valid: true, issues: [] });
    assert.equal(corpus.records.length, 30);
    assert.deepEqual(
      roleCounts,
      Object.fromEntries(STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3.map((role) => [role, 6]))
    );
    assert.deepEqual(
      durationCounts,
      Object.fromEntries(STAYOPTI_FRESH_ROLE_AWARE_CORPUS_DURATIONS_V3.map((nights) => [String(nights), 5]))
    );
    assert.deepEqual(partitionCounts, {
      "blind-evaluation": 10,
      development: 10,
      "frozen-regression": 5,
      "sealed-holdout": 5,
    });
    assert.equal(
      new Set(
        corpus.records.map((record) =>
          `${record.capsule.evaluationIntent.role}:${record.capsule.searchContext.nights}`
        )
      ).size,
      30
    );
    assert.equal(manifestBindings.length, 150);
    assert.equal(
      manifestBindings.some(
        (binding) => binding === `sha256:${"0".repeat(64)}`
      ),
      false
    );
    assert.ok(sealedHoldoutProfiles.size >= 2);

    console.log(
      `V3_12B2_CORPUS_COUNTS=${JSON.stringify({
        cases: corpus.records.length,
        roles: roleCounts,
        durations: durationCounts,
        partitions: partitionCounts,
        realManifestBindings: manifestBindings.length,
        zeroBindingPlaceholders: 0,
        sealedHoldoutProfileDiversity: sealedHoldoutProfiles.size,
      })}`
    );
  }
);

test(
  "all capsules replay and all blind bundles validate with unique frozen bindings",
  () => {
    const fixture = loadFixture();
    const corpus = createFreshRoleAwareEvaluationCorpusV3(fixture);
    const fingerprints = new Set<string>();
    const contentDigests = new Set<string>();

    for (const record of corpus.records) {
      assert.equal(validateFreshReplayableRoleAwareCapsuleV3(record.capsule).valid, true);
      assert.equal(
        verifyFreshReplayableRoleAwareCapsuleReplayV3(record.input, record.capsule),
        true
      );
      assert.equal(validateFreshRoleAwareBlindBundleV3(record.blindBundle).valid, true);
      assert.equal(record.blindBundle.packet.evaluationRole, record.capsule.evaluationIntent.role);
      assert.equal(
        record.blindBundle.sealedAssignment.alternatives.every(
          (alternative) => alternative.role === record.capsule.evaluationIntent.role
        ),
        true
      );
      assert.equal(record.verdictReceipt, null);
      assert.equal(record.deblindReport, null);
      fingerprints.add(record.capsule.fingerprint);
      contentDigests.add(record.capsule.contentDigest);
    }
    assert.equal(fingerprints.size, 30);
    assert.equal(contentDigests.size, 30);
  }
);

test(
  "visible packets contain neither engine or commercial labels nor previous decisions",
  () => {
    const corpus = createFreshRoleAwareEvaluationCorpusV3(loadFixture());
    const forbiddenKeys = new Set([
      "engine",
      "engineKey",
      "policyVersion",
      "configHash",
      "provider",
      "providerId",
      "originalOrder",
      "currentChoice",
      "verdict",
      "verdicts",
      "commission",
      "markup",
      "commercialOrder",
      "decisionFingerprint",
      "reasonCodes",
      "solutionId",
    ]);
    const forbiddenStrings = new Set([
      "v2",
      "v3",
      "baseline-engine",
      "candidate-engine",
    ]);

    for (const record of corpus.records) {
      const keys = collectKeys(record.blindBundle.packet);
      const strings = collectStrings(record.blindBundle.packet);
      assert.equal(keys.some((key) => forbiddenKeys.has(key)), false);
      assert.equal(strings.some((value) => forbiddenStrings.has(value)), false);
    }
  }
);

test(
  "split records keep one change, contiguous two-night segments and a full single-stay comparator",
  () => {
    const corpus = createFreshRoleAwareEvaluationCorpusV3(loadFixture());
    const splitRecords = corpus.records.filter(
      (record) => record.capsule.evaluationIntent.role === "split-saver"
    );
    assert.equal(splitRecords.length, 6);
    for (const record of splitRecords) {
      const splitSolutions = record.capsule.staySolutions.filter(
        (solution) => solution.segments.length === 2
      );
      const singleSolutions = record.capsule.staySolutions.filter(
        (solution) => solution.segments.length === 1
      );
      assert.equal(splitSolutions.length, 2);
      assert.equal(singleSolutions.length, 1);
      for (const solution of splitSolutions) {
        const [first, second] = solution.segments;
        assert.ok(first);
        assert.ok(second);
        assert.ok(first.nights >= 2);
        assert.ok(second.nights >= 2);
        assert.equal(first.checkOut, second.checkIn);
        assert.equal(first.nights + second.nights, record.capsule.searchContext.nights);
      }
    }
  }
);

test(
  "generation is byte-identical and remains outside legacy, Golden and public boundaries",
  () => {
    const fixture = loadFixture();
    const first = createFreshRoleAwareEvaluationCorpusV3(fixture);
    const second = createFreshRoleAwareEvaluationCorpusV3(fixture);
    const exactLegacyCaseId = "case-00000000000000000000";
    const freshCaseId = "freshcase-000000000000000000000001";
    assert.equal(stableSerializeV3(first), stableSerializeV3(second));
    assert.equal(containsLegacyDiagnosticIdentifierV3(exactLegacyCaseId), true);
    assert.equal(containsLegacyDiagnosticIdentifierV3(freshCaseId), false);
    assert.equal(containsLegacyDiagnosticIdentifierV3(first), false);
    const legacyInjected = JSON.parse(stableSerializeV3(first)) as typeof first;
    const legacyInjectedRecord = legacyInjected.records[0];
    assert.ok(legacyInjectedRecord);
    legacyInjectedRecord.input.caseId = exactLegacyCaseId;
    assert.equal(
      validateFreshRoleAwareEvaluationCorpusV3(fixture, legacyInjected).issues.includes(
        "corpus-record-boundary-invalid:1"
      ),
      true
    );
    assert.equal(first.legacyCasesUsedAsInput, 0);
    assert.equal(first.humanVerdictsCreated, 0);
    assert.equal(first.goldenAdmissionAllowed, false);
    assert.equal(first.tuningAllowed, false);
    assert.equal(first.scoringAllowed, false);
    assert.equal(first.rankingAllowed, false);
    assert.equal(first.promotionAllowed, false);
    assert.deepEqual(STAYOPTI_FRESH_ROLE_AWARE_CORPUS_AUDIT_V3, {
      application: "private-offline-technical-evaluation-only",
      expectedCases: 30,
      expectedCasesPerRole: 6,
      expectedCasesPerDuration: 5,
      legacyCasesAccepted: false,
      humanVerdictsCreated: false,
      goldenAdmissionAllowed: false,
      tuningAllowed: false,
      scoringAllowed: false,
      rankingAllowed: false,
      promotionAllowed: false,
      publicV2Changed: false,
      publicV3Enabled: false,
      splitPublicEnabled: false,
    });

    const boundaryFiles = [
      "src/engine-v3/index.ts",
      "src/engine-v3/orchestrator/independentDecisionEngineV3.ts",
      "src/engine-v2/orchestrator/smartStayEngineV2.ts",
      "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
      "server/server.js",
      "src/engine-v3/evaluation/legacyDiagnosticQuarantineV3.ts",
    ];
    for (const relativePath of boundaryFiles) {
      const absolutePath = resolve(process.cwd(), relativePath);
      assert.equal(existsSync(absolutePath), true, relativePath);
      const source = readFileSync(absolutePath, "utf8");
      assert.equal(source.includes("freshRoleAwareEvaluationCorpusV3"), false, relativePath);
      assert.equal(source.includes("v3-12b2-fresh-role-aware-corpus"), false, relativePath);
    }
  }
);
