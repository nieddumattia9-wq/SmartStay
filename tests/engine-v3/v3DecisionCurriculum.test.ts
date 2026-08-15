import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_DECISION_CURRICULUM_AUDIT_V3,
  STAYOPTI_DECISION_CURRICULUM_CASE_TYPES_V3,
  STAYOPTI_DECISION_CURRICULUM_PROFILES_V3,
  STAYOPTI_DECISION_CURRICULUM_VERSION_V3,
  assertDecisionCurriculumV3,
  createDecisionCurriculumV3,
  createDecisionScienceLibraryV3,
  validateDecisionCurriculumV3,
  type StayOptiDecisionCurriculumInputV3,
  type StayOptiDecisionCurriculumV3,
  type StayOptiDecisionScienceLibraryInputV3,
  type StayOptiDecisionScienceLibraryV3,
} from "../../src/engine-v3";

const libraryFixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-13-decision-science-library-v1.json"
);
const curriculumFixturePath = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-14-decision-curriculum-v1.json"
);

function loadLibrary(): StayOptiDecisionScienceLibraryV3 {
  const input = JSON.parse(
    readFileSync(libraryFixturePath, "utf8")
  ) as StayOptiDecisionScienceLibraryInputV3;
  return createDecisionScienceLibraryV3(input);
}

function loadInput(): StayOptiDecisionCurriculumInputV3 {
  return JSON.parse(
    readFileSync(curriculumFixturePath, "utf8")
  ) as StayOptiDecisionCurriculumInputV3;
}

function createCurriculum(): StayOptiDecisionCurriculumV3 {
  return createDecisionCurriculumV3(loadInput(), loadLibrary());
}

function violationCodes(curriculum: StayOptiDecisionCurriculumV3): string[] {
  return validateDecisionCurriculumV3(curriculum, loadLibrary()).violations.map(
    ({ code }) => code
  );
}

test("V3-14 builds a valid, versioned and fingerprinted curriculum", () => {
  const curriculum = createCurriculum();
  const validation = validateDecisionCurriculumV3(curriculum, loadLibrary());

  assert.equal(curriculum.curriculumVersion, STAYOPTI_DECISION_CURRICULUM_VERSION_V3);
  assert.equal(curriculum.application, "offline-teacher-lab-only");
  assert.equal(validation.valid, true, JSON.stringify(validation.violations));
  assert.doesNotThrow(() => assertDecisionCurriculumV3(curriculum, loadLibrary()));
  assert.match(curriculum.fingerprint, /^fnv1a32-[a-f0-9]{8}$/);
  assert.deepEqual(curriculum.counts, {
    lessons: 4,
    cases: 9,
    teacherJudgments: 9,
    disagreements: 4,
    profiles: 5,
    caseTypes: 7,
  });
});

test("all five profiles, required case types and decision roles are represented", () => {
  const curriculum = createCurriculum();
  const profiles = [...new Set(curriculum.cases.map(({ profile }) => profile))].sort();
  const caseTypes = [...new Set(curriculum.cases.map(({ caseType }) => caseType))].sort();
  const roles = [...new Set(curriculum.cases.map(({ decisionRole }) => decisionRole))].sort();

  assert.deepEqual(profiles, [...STAYOPTI_DECISION_CURRICULUM_PROFILES_V3].sort());
  for (const required of [
    "synthetic-controlled",
    "adversarial",
    "counterfactual",
    "near-tie",
    "no-good-option",
    "historical-error",
    "split",
  ]) {
    assert.ok(caseTypes.includes(required as typeof STAYOPTI_DECISION_CURRICULUM_CASE_TYPES_V3[number]));
  }
  assert.deepEqual(roles, [
    "abstention",
    "best-choice",
    "best-sensible-saving",
    "split",
    "worthwhile-comfort-upgrade",
  ]);
});

test("canonicalization is independent of top-level input ordering", () => {
  const input = loadInput();
  const reversed = createDecisionCurriculumV3(
    {
      lessons: [...input.lessons].reverse(),
      cases: [...input.cases].reverse(),
      teacherJudgments: [...input.teacherJudgments].reverse(),
      disagreements: [...input.disagreements].reverse(),
    },
    loadLibrary()
  );

  assert.deepEqual(reversed, createCurriculum());
});

test("every case and lesson remains linked to V3-13 claims and tests", () => {
  const library = loadLibrary();
  const curriculum = createCurriculum();
  const claims = new Map(library.claims.map((claim) => [claim.id, claim]));
  const tests = new Set(library.testMappings.map(({ id }) => id));

  for (const candidate of curriculum.cases) {
    assert.ok(candidate.claimIds.length > 0);
    assert.ok(candidate.testIds.length > 0);
    assert.ok(candidate.testIds.every((testId) => tests.has(testId)));
    for (const claimId of candidate.claimIds) {
      const claim = claims.get(claimId);
      assert.notEqual(claim, undefined);
      assert.ok(candidate.testIds.some((testId) => claim?.testIds.includes(testId)));
    }
  }

  for (const lesson of curriculum.lessons) {
    const lessonClaims = new Set(lesson.claimIds);
    const cases = curriculum.cases.filter(({ id }) => lesson.caseIds.includes(id));
    assert.ok(cases.every((candidate) => candidate.claimIds.every((id) => lessonClaims.has(id))));
  }
});

test("counterfactual cases preserve a base case and explicit changed variables", () => {
  const curriculum = createCurriculum();
  const counterfactuals = curriculum.cases.filter(({ caseType }) => caseType === "counterfactual");

  assert.ok(counterfactuals.length > 0);
  for (const candidate of counterfactuals) {
    const base = curriculum.cases.find(({ id }) => id === candidate.counterfactualOfCaseId);
    assert.notEqual(base, undefined);
    assert.notEqual(base?.id, candidate.id);
    assert.equal(base?.profile, candidate.profile);
    assert.ok(candidate.changedVariables.length > 0);
  }
});

test("confidence protocol forces low confidence and no-good options to abstain", () => {
  const curriculum = createCurriculum();

  for (const judgment of curriculum.teacherJudgments) {
    const selected = Object.values(judgment.roleSelections).filter(
      ({ status }) => status === "selected"
    );
    if (judgment.confidence.level === "low" || judgment.confidence.level === "none") {
      assert.equal(judgment.abstention.abstain, true);
      assert.equal(selected.length, 0);
    }
    if (judgment.confidence.level === "high") {
      assert.equal(judgment.confidence.evidenceCoverage, "high");
      assert.equal(judgment.confidence.materialUnknowns.length, 0);
    }
  }

  const noGood = curriculum.cases.find(({ caseType }) => caseType === "no-good-option");
  const noGoodJudgment = curriculum.teacherJudgments.find(
    ({ caseId }) => caseId === noGood?.id
  );
  assert.equal(noGoodJudgment?.abstention.abstain, true);
  assert.equal(noGoodJudgment?.abstention.reason, "no-good-option");
});

test("teacher selections never choose invalid offers or failed hard constraints", () => {
  const curriculum = createCurriculum();

  for (const judgment of curriculum.teacherJudgments) {
    const candidate = curriculum.cases.find(({ id }) => id === judgment.caseId);
    assert.notEqual(candidate, undefined);
    for (const selection of Object.values(judgment.roleSelections)) {
      if (selection.status !== "selected") continue;
      const option = candidate?.options.find(({ optionId }) => optionId === selection.optionId);
      assert.equal(option?.hardConstraintsSatisfied, true);
      assert.notEqual(option?.offerIntegrity, "invalid");
    }
  }
});

test("teacher outputs remain blind candidate supervision and never ground truth", () => {
  const curriculum = createCurriculum();

  assert.equal(curriculum.automaticGroundTruthAllowed, false);
  assert.equal(curriculum.automaticPolicyDistillationAllowed, false);
  assert.equal(curriculum.publicPromotionAllowed, false);
  assert.equal(curriculum.engineLabelsVisibleToTeacher, false);
  for (const judgment of curriculum.teacherJudgments) {
    assert.equal(judgment.supervisionStatus, "candidate-supervision-only");
    assert.equal(judgment.automaticGroundTruthAllowed, false);
    assert.equal(judgment.humanReviewRequired, true);
    assert.equal(judgment.publicPolicyUseAllowed, false);
  }

  const tampered = structuredClone(curriculum) as unknown as Record<string, unknown>;
  tampered.automaticGroundTruthAllowed = true;
  const codes = violationCodes(tampered as unknown as StayOptiDecisionCurriculumV3);
  assert.ok(codes.includes("ground-truth-firewall-open"));
  assert.ok(codes.includes("fingerprint-invalid"));
});

test("the disagreement set compares teacher, V2, V3 and humans without silent resolution", () => {
  const curriculum = createCurriculum();
  let observedDifference = false;

  for (const disagreement of curriculum.disagreements) {
    assert.deepEqual(Object.keys(disagreement.observations).sort(), ["human", "teacher", "v2", "v3"]);
    assert.notEqual(disagreement.observations.human.state, "not-observed");
    assert.equal(disagreement.automaticResolutionAllowed, false);
    assert.equal(disagreement.groundTruthPromoted, false);
    assert.ok(disagreement.uncertaintyNotes.length > 0);

    const outcomes = Object.values(disagreement.observations)
      .filter(({ state }) => state !== "not-observed")
      .map(({ state, optionId }) => `${state}:${optionId ?? "none"}`);
    observedDifference ||= new Set(outcomes).size > 1;
  }
  assert.equal(observedDifference, true);
});

test("missing research references, forbidden PII and payload mutation fail closed", () => {
  const input = loadInput();
  input.cases[0] = {
    ...input.cases[0],
    claimIds: ["claim-does-not-exist"],
    testIds: ["test-does-not-exist"],
  };
  const invalidReferences = createDecisionCurriculumV3(input, loadLibrary());
  assert.ok(violationCodes(invalidReferences).includes("case-reference-invalid"));

  const withPii = structuredClone(createCurriculum()) as unknown as Record<string, unknown>;
  withPii.email = "forbidden@example.invalid";
  assert.ok(
    violationCodes(withPii as unknown as StayOptiDecisionCurriculumV3).includes(
      "privacy-firewall-open"
    )
  );

  const mutated = structuredClone(createCurriculum());
  mutated.lessons[0].title = "Mutated after fingerprint";
  assert.ok(violationCodes(mutated).includes("fingerprint-invalid"));
});

test("V3-14 audit freezes public, ranking, provider and commercial boundaries", () => {
  assert.deepEqual(STAYOPTI_DECISION_CURRICULUM_AUDIT_V3, {
    application: "offline-teacher-lab-only",
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    rankingWeightsChanged: false,
    thresholdsChanged: false,
    automaticGroundTruthAllowed: false,
    automaticPolicyDistillationAllowed: false,
    humanReviewRequired: true,
    engineLabelsVisibleToTeacher: false,
    providerCallsAllowed: false,
    bookingOrPaymentChanged: false,
    analyticsChanged: false,
  });
  assert.equal(Object.isFrozen(STAYOPTI_DECISION_CURRICULUM_AUDIT_V3), true);
});
