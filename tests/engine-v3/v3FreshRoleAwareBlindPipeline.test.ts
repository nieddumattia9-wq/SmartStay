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
  STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3,
  createFreshReplayableRoleAwareCapsuleV3,
  createFreshRoleAwareSha256V3,
  type StayOptiFreshRoleAwareCapsuleInputV3,
  type StayOptiFreshRoleAwareCapsuleV3,
  type StayOptiFreshRoleAwareRoleV3,
} from "../../src/engine-v3/evaluation/freshReplayableRoleAwareCapsuleV3";

import {
  STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3,
  createFreshRoleAwareBlindBundleV3,
  createFreshRoleAwareDeblindReportV3,
  createFreshRoleAwareVerdictReceiptV3,
  validateFreshRoleAwareBlindBundleV3,
  type StayOptiFreshBlindAlternativeV3,
  type StayOptiFreshBlindSourceV3,
} from "../../src/engine-v3/evaluation/freshRoleAwareBlindPipelineV3";

type CapsuleProfile =
  StayOptiFreshRoleAwareCapsuleInputV3["preferences"]["profile"];

type CapsuleBase = Omit<
  StayOptiFreshRoleAwareCapsuleInputV3,
  "caseId" | "evaluationIntent" | "provenance" | "staySolutions"
> & {
  provenance: Omit<
    StayOptiFreshRoleAwareCapsuleInputV3["provenance"],
    "captureId"
  >;
};

interface RoleCaseFixture {
  caseId: string;
  captureId: string;
  role: StayOptiFreshRoleAwareRoleV3;
  question: string;
  profile: CapsuleProfile;
  solutionTemplate: "single" | "split";
}

interface ContractFixture {
  baseCapsule: CapsuleBase;
  solutionTemplates: Record<
    "single" | "split",
    StayOptiFreshRoleAwareCapsuleInputV3["staySolutions"]
  >;
  roleCases: RoleCaseFixture[];
}

function loadFixture() {
  return JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "tests/engine-v3/fixtures/v3-12b1-fresh-role-aware-protocol-contract-v1.json"
      ),
      "utf8"
    )
  ) as ContractFixture;
}

function materializeCapsule(
  fixture: ContractFixture,
  roleCase: RoleCaseFixture
): StayOptiFreshRoleAwareCapsuleV3 {
  const base = structuredClone(fixture.baseCapsule);
  return createFreshReplayableRoleAwareCapsuleV3({
    ...base,
    caseId: roleCase.caseId,
    evaluationIntent: {
      role: roleCase.role,
      question: roleCase.question,
    },
    preferences: {
      ...base.preferences,
      profile: roleCase.profile,
    },
    staySolutions: structuredClone(
      fixture.solutionTemplates[roleCase.solutionTemplate]
    ),
    sanitizedReplayInput: {
      ...base.sanitizedReplayInput,
      representation: {
        ...base.sanitizedReplayInput.representation,
        fixtureCaseId: roleCase.caseId,
        evaluationRole: roleCase.role,
      },
    },
    provenance: {
      ...base.provenance,
      captureId: roleCase.captureId,
    },
  });
}

function createAlternative(
  capsule: StayOptiFreshRoleAwareCapsuleV3,
  engineKey: "baseline-engine" | "candidate-engine",
  solutionIndex: number,
  decisionState: "recommended" | "abstained" = "recommended"
): StayOptiFreshBlindAlternativeV3 {
  const solution = capsule.staySolutions[solutionIndex];
  const solutionId = decisionState === "abstained"
    ? null
    : solution?.solutionId ?? null;
  return {
    engineKey,
    role: capsule.evaluationIntent.role,
    decisionState,
    solutionId,
    decisionFingerprint: createFreshRoleAwareSha256V3(
      {
        capsuleFingerprint: capsule.fingerprint,
        engineKey,
        role: capsule.evaluationIntent.role,
        solutionId,
      },
      "stayopti-v3-fresh-role-aware-synthetic-decision"
    ),
    reasonCodes: engineKey === "baseline-engine"
      ? ["evidence:complete", "role:fit"]
      : ["evidence:complete", "value:marginal-gain"],
  };
}

function createSource(
  capsule: StayOptiFreshRoleAwareCapsuleV3
): StayOptiFreshBlindSourceV3 {
  const abstention = capsule.evaluationIntent.role === "abstention-near-tie";
  return {
    caseId: capsule.caseId,
    capsule,
    evaluationRole: capsule.evaluationIntent.role,
    alternatives: [
      createAlternative(capsule, "baseline-engine", 0),
      createAlternative(
        capsule,
        "candidate-engine",
        1,
        abstention ? "abstained" : "recommended"
      ),
    ],
  };
}

function collectKeys(value: unknown, keys: string[] = []) {
  if (Array.isArray(value)) {
    for (const child of value) {
      collectKeys(child, keys);
    }
  }
  else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function collectStrings(value: unknown, strings: string[] = []) {
  if (typeof value === "string") {
    strings.push(value);
  }
  else if (Array.isArray(value)) {
    for (const child of value) {
      collectStrings(child, strings);
    }
  }
  else if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectStrings(child, strings);
    }
  }
  return strings;
}

test(
  "V3-12B1 creates deterministic blind packets for all five isolated roles without public Split",
  () => {
    const fixture = loadFixture();
    const bundles = fixture.roleCases.map((roleCase) =>
      createFreshRoleAwareBlindBundleV3(
        createSource(materializeCapsule(fixture, roleCase))
      )
    );

    assert.deepEqual(
      bundles.map((bundle) => bundle.packet.evaluationRole),
      STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3
    );
    for (const bundle of bundles) {
      assert.equal(validateFreshRoleAwareBlindBundleV3(bundle).valid, true);
      assert.equal(bundle.packet.sides[0].label, "option-a");
      assert.equal(bundle.packet.sides[1].label, "option-b");
      assert.equal(Object.isFrozen(bundle), true);
      assert.equal(Object.isFrozen(bundle.packet), true);
      assert.equal(Object.isFrozen(bundle.sealedAssignment), true);
      assert.equal(bundle.capsule.publicV2Changed, false);
      assert.equal(bundle.capsule.publicV3Enabled, false);
      assert.equal(bundle.capsule.splitPublicEnabled, false);
    }
  }
);

test(
  "visible packets contain no engine, policy, provider, original-order, current-choice or commercial binding",
  () => {
    const fixture = loadFixture();
    const bundle = createFreshRoleAwareBlindBundleV3(
      createSource(materializeCapsule(fixture, fixture.roleCases[0]))
    );
    const keys = new Set(collectKeys(bundle.packet));
    const strings = new Set(collectStrings(bundle.packet));
    const forbiddenKeys = [
      "engine",
      "engineKey",
      "policyVersion",
      "provider",
      "providerId",
      "originalOrder",
      "currentChoice",
      "commission",
      "markup",
      "commercialOrder",
      "engineFingerprint",
      "decisionFingerprint",
      "reasonCodes",
      "solutionId",
      "canonicalOfferRef",
      "otherEvaluatorVerdicts",
    ];

    for (const forbidden of forbiddenKeys) {
      assert.equal(keys.has(forbidden), false, forbidden);
    }
    assert.equal(strings.has("v2"), false);
    assert.equal(strings.has("v3"), false);
    assert.equal(strings.has("baseline-engine"), false);
    assert.equal(strings.has("candidate-engine"), false);
  }
);

test(
  "cross-role alternatives and altered or missing sealed assignments fail closed",
  () => {
    const fixture = loadFixture();
    const capsule = materializeCapsule(fixture, fixture.roleCases[0]);
    const crossRole = createSource(capsule);
    crossRole.alternatives[1].role = "best-sensible-saving";

    assert.throws(
      () => createFreshRoleAwareBlindBundleV3(crossRole),
      /role-mismatched/
    );

    const valid = createFreshRoleAwareBlindBundleV3(createSource(capsule));
    const altered = structuredClone(valid);
    altered.sealedAssignment.packetFingerprint =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    assert.equal(validateFreshRoleAwareBlindBundleV3(altered).valid, false);

    const missing = structuredClone(valid) as unknown as Record<string, unknown>;
    delete missing["sealedAssignment"];
    assert.equal(validateFreshRoleAwareBlindBundleV3(missing).valid, false);
  }
);

test(
  "immutable receipts bind deterministic deblind and reject alteration, absence and repeated recording",
  () => {
    const fixture = loadFixture();
    const bundle = createFreshRoleAwareBlindBundleV3(
      createSource(materializeCapsule(fixture, fixture.roleCases[0]))
    );
    const receipt = createFreshRoleAwareVerdictReceiptV3(bundle, {
      verdictId: "technical-verdict-001",
      evaluatorToken: "technical-evaluator-001",
      evaluatorClass: "technical-contract-test",
      selected: "option-a",
      recordedAt: "2026-08-21T20:15:00.000Z",
    });
    const report = createFreshRoleAwareDeblindReportV3(bundle, receipt);

    assert.equal(Object.isFrozen(receipt), true);
    assert.equal(Object.isFrozen(report), true);
    assert.equal(report.evaluationRole, bundle.packet.evaluationRole);
    assert.equal(report.sameRoleComparison, true);
    assert.equal(report.humanEvidenceCounted, false);
    assert.equal(report.goldenAdmissionAllowed, false);
    assert.equal(report.tuningAllowed, false);
    assert.equal(report.scoringAllowed, false);
    assert.equal(report.rankingAllowed, false);
    assert.equal(report.promotionAllowed, false);

    const alteredReceipt = structuredClone(receipt);
    alteredReceipt.selected = "option-b";
    assert.throws(
      () => createFreshRoleAwareDeblindReportV3(bundle, alteredReceipt),
      /missing, altered or unbound/
    );
    assert.throws(
      () => createFreshRoleAwareDeblindReportV3(bundle, null),
      /missing, altered or unbound/
    );
    assert.throws(
      () => createFreshRoleAwareDeblindReportV3(
        bundle,
        receipt,
        report.fingerprint
      ),
      /already been recorded/
    );
  }
);

test(
  "technical pipeline remains private, legacy-ineligible and outside every evidence or promotion gate",
  () => {
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.legacyCasesAccepted, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.realCorpusCreated, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.humanVerdictsCreated, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.goldenAdmissionAllowed, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.tuningAllowed, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.scoringAllowed, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.rankingAllowed, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.promotionAllowed, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.publicV2Changed, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.publicV3Enabled, false);
    assert.equal(STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3.splitPublicEnabled, false);

    const boundaryFiles = [
      "src/engine-v3/index.ts",
      "src/engine-v3/orchestrator/independentDecisionEngineV3.ts",
      "src/engine-v2/orchestrator/smartStayEngineV2.ts",
      "src/main.tsx",
      "server/server.js",
      "src/engine-v3/evaluation/legacyDiagnosticQuarantineV3.ts",
    ];
    for (const relativePath of boundaryFiles) {
      const absolutePath = resolve(process.cwd(), relativePath);
      assert.equal(
        existsSync(absolutePath),
        true,
        `Static boundary target missing: ${relativePath}`
      );
      const source = readFileSync(absolutePath, "utf8");
      assert.equal(source.includes("freshReplayableRoleAwareCapsuleV3"), false, relativePath);
      assert.equal(source.includes("freshRoleAwareBlindPipelineV3"), false, relativePath);
    }
  }
);
