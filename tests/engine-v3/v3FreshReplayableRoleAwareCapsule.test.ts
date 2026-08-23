import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_AUDIT_V3,
  STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3,
  createFreshReplayableRoleAwareCapsuleV3,
  validateFreshReplayableRoleAwareCapsuleV3,
  verifyFreshReplayableRoleAwareCapsuleReplayV3,
  type StayOptiFreshRoleAwareCapsuleInputV3,
  type StayOptiFreshRoleAwareRoleV3,
} from "../../src/engine-v3/evaluation/freshReplayableRoleAwareCapsuleV3";

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
  schemaVersion: "stayopti.v3.fresh-role-aware-contract-fixture@1";
  technicalDiagnosticOnly: true;
  humanVerdictsIncluded: false;
  goldenAdmissionAllowed: false;
  baseCapsule: CapsuleBase;
  solutionTemplates: Record<
    "single" | "split",
    StayOptiFreshRoleAwareCapsuleInputV3["staySolutions"]
  >;
  roleCases: RoleCaseFixture[];
}

const fixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-12b1-fresh-role-aware-protocol-contract-v1.json"
);

function loadFixture() {
  return JSON.parse(
    readFileSync(fixturePath, "utf8")
  ) as ContractFixture;
}

function materializeCapsuleInput(
  fixture: ContractFixture,
  roleCase: RoleCaseFixture
): StayOptiFreshRoleAwareCapsuleInputV3 {
  const base = structuredClone(fixture.baseCapsule);
  return {
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
  };
}

function reverseObjectPropertyOrder(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectPropertyOrder);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [
        key,
        reverseObjectPropertyOrder(child),
      ])
  );
}

test(
  "V3-12B1 creates one deterministic SHA-256-bound synthetic capsule for every isolated role",
  () => {
    const fixture = loadFixture();
    const capsules = fixture.roleCases.map((roleCase) =>
      createFreshReplayableRoleAwareCapsuleV3(
        materializeCapsuleInput(fixture, roleCase)
      )
    );

    assert.equal(fixture.technicalDiagnosticOnly, true);
    assert.equal(fixture.humanVerdictsIncluded, false);
    assert.equal(fixture.goldenAdmissionAllowed, false);
    assert.deepEqual(
      capsules.map((capsule) => capsule.evaluationIntent.role),
      STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3
    );
    for (const capsule of capsules) {
      assert.match(capsule.contentDigest, /^sha256:[0-9a-f]{64}$/);
      assert.match(capsule.fingerprint, /^sha256:[0-9a-f]{64}$/);
      assert.equal(validateFreshReplayableRoleAwareCapsuleV3(capsule).valid, true);
      assert.equal(Object.isFrozen(capsule), true);
      assert.equal(Object.isFrozen(capsule.staySolutions), true);
      assert.equal(Object.isFrozen(capsule.staySolutions[0]), true);
      assert.equal(capsule.publicV2Changed, false);
      assert.equal(capsule.publicV3Enabled, false);
      assert.equal(capsule.splitPublicEnabled, false);
    }
  }
);

test(
  "canonical property order is irrelevant while every material mutation changes both bindings",
  () => {
    const fixture = loadFixture();
    const originalInput = materializeCapsuleInput(fixture, fixture.roleCases[0]);
    const original = createFreshReplayableRoleAwareCapsuleV3(originalInput);
    const reordered = createFreshReplayableRoleAwareCapsuleV3(
      reverseObjectPropertyOrder(originalInput)
    );
    const mutatedInput = structuredClone(originalInput);
    mutatedInput.searchContext.budget.total += 1;
    const mutated = createFreshReplayableRoleAwareCapsuleV3(mutatedInput);

    assert.equal(reordered.contentDigest, original.contentDigest);
    assert.equal(reordered.fingerprint, original.fingerprint);
    assert.notEqual(mutated.contentDigest, original.contentDigest);
    assert.notEqual(mutated.fingerprint, original.fingerprint);
    assert.equal(
      verifyFreshReplayableRoleAwareCapsuleReplayV3(originalInput, original),
      true
    );
    assert.equal(
      verifyFreshReplayableRoleAwareCapsuleReplayV3(mutatedInput, original),
      false
    );
  }
);

test(
  "incomplete, sensitive, commercial and legacy inputs are rejected fail-closed",
  () => {
    const fixture = loadFixture();
    const originalInput = materializeCapsuleInput(fixture, fixture.roleCases[0]);
    const incomplete = structuredClone(originalInput) as unknown as Record<string, unknown>;
    delete incomplete["createdAt"];

    const providerTagged = structuredClone(originalInput) as unknown as Record<string, unknown>;
    providerTagged["providerId"] = "private-provider-token";

    const commissioned = structuredClone(originalInput) as unknown as Record<string, unknown>;
    commissioned["commission"] = 12;

    const secretBearing = structuredClone(originalInput);
    secretBearing.sanitizedReplayInput.representation["contact"] =
      "traveler@example.test";

    const legacyFingerprint = structuredClone(originalInput);
    legacyFingerprint.caseId = "case-0123456789abcdef0123";

    const legacyFixture = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          "tests/engine-v3/fixtures/v3-12a-diagnostic-judgments.json"
        ),
        "utf8"
      )
    ) as unknown;

    for (const rejected of [
      incomplete,
      providerTagged,
      commissioned,
      secretBearing,
      legacyFingerprint,
      legacyFixture,
    ]) {
      assert.throws(
        () => createFreshReplayableRoleAwareCapsuleV3(rejected),
        /Fresh role-aware source capsule invalid/
      );
    }
  }
);

test(
  "technical capsule outputs cannot become Golden, tuning, scoring, ranking or promotion evidence",
  () => {
    assert.deepEqual(
      STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_AUDIT_V3,
      {
        application: "private-offline-forward-only-replay",
        providerNeutral: true,
        usesFullSha256ContentBinding: true,
        fnvContentBindingUsed: false,
        legacyCasesAccepted: false,
        realCorpusCreated: false,
        humanVerdictsCreated: false,
        goldenAdmissionAllowed: false,
        tuningAllowed: false,
        scoringAllowed: false,
        rankingAllowed: false,
        promotionAllowed: false,
        publicV2Changed: false,
        publicV3Enabled: false,
        splitPublicEnabled: false,
      }
    );
  }
);
