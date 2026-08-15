import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";

import {
  STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3,
  validateDecisionScienceLibraryV3,
  type StayOptiDecisionScienceDomainV3,
  type StayOptiDecisionScienceLibraryV3,
} from "../research/decisionScienceLibraryV3";

export const STAYOPTI_DECISION_CURRICULUM_VERSION_V3 =
  "3.0.0-decision-curriculum.1" as const;

export const STAYOPTI_DECISION_CURRICULUM_SCHEMA_VERSION_V3 =
  "3.0.0-decision-curriculum-schema.1" as const;

export const STAYOPTI_TEACHER_JUDGMENT_SCHEMA_VERSION_V3 =
  "3.0.0-teacher-judgment-schema.1" as const;

export const STAYOPTI_DECISION_CURRICULUM_PROFILES_V3 = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
] as const;

export const STAYOPTI_DECISION_CURRICULUM_CASE_TYPES_V3 = [
  "real-redacted",
  "synthetic-controlled",
  "adversarial",
  "counterfactual",
  "near-tie",
  "no-good-option",
  "historical-error",
  "split",
] as const;

export type StayOptiCurriculumProfileV3 =
  typeof STAYOPTI_DECISION_CURRICULUM_PROFILES_V3[number];

export type StayOptiCurriculumCaseTypeV3 =
  typeof STAYOPTI_DECISION_CURRICULUM_CASE_TYPES_V3[number];

export type StayOptiCurriculumDecisionRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "split"
  | "abstention";

export type StayOptiCurriculumConfidenceLevelV3 =
  | "none"
  | "low"
  | "moderate"
  | "high";

export type StayOptiCurriculumEvidenceCoverageV3 =
  | "low"
  | "medium"
  | "high";

export type StayOptiCurriculumAbstentionReasonV3 =
  | "not-required"
  | "near-tie"
  | "no-good-option"
  | "material-evidence-missing"
  | "hard-constraint-conflict"
  | "role-ambiguity";

export interface StayOptiCurriculumCaseContextV3 {
  duration: "short-stay" | "medium-stay" | "long-stay";
  leadTime: "short" | "medium" | "long";
  destination: "urban" | "resort" | "remote" | "mixed";
  travelParty: "solo" | "couple" | "family" | "group";
  coverage: StayOptiCurriculumEvidenceCoverageV3;
  nights: number;
  budget: number;
  currency: string;
  hardConstraints: string[];
}

export interface StayOptiCurriculumOptionV3 {
  optionId: string;
  kind: "single-stay" | "split-stay";
  totalCost: number | null;
  hardConstraintsSatisfied: boolean | null;
  offerIntegrity: "verified" | "partial" | "invalid";
  dimensions: Record<StayOptiDecisionScienceDomainV3, number | null>;
  evidenceLimitations: string[];
  splitMoveCount: number;
  splitFriction: "none" | "low" | "medium" | "high";
}

export interface StayOptiCurriculumCaseV3 {
  id: string;
  version: string;
  title: string;
  caseType: StayOptiCurriculumCaseTypeV3;
  origin: "synthetic-controlled" | "real-redacted" | "historical-pattern-redacted";
  profile: StayOptiCurriculumProfileV3;
  decisionRole: StayOptiCurriculumDecisionRoleV3;
  learningObjective: string;
  teacherPrompt: string;
  context: StayOptiCurriculumCaseContextV3;
  options: StayOptiCurriculumOptionV3[];
  claimIds: string[];
  testIds: string[];
  counterfactualOfCaseId: string | null;
  changedVariables: string[];
  piiIncluded: false;
  engineLabelsVisibleToTeacher: false;
  groundTruthStatus: "unresolved";
}

export interface StayOptiCurriculumLessonV3 {
  id: string;
  version: string;
  title: string;
  objective: string;
  caseIds: string[];
  claimIds: string[];
  profiles: StayOptiCurriculumProfileV3[];
  roles: StayOptiCurriculumDecisionRoleV3[];
  successCriteria: string[];
}

export interface StayOptiTeacherRoleSelectionV3 {
  optionId: string | null;
  status: "selected" | "not-applicable" | "abstained";
  rationaleCodes: string[];
}

export interface StayOptiTeacherJudgmentV3 {
  id: string;
  version: string;
  schemaVersion: typeof STAYOPTI_TEACHER_JUDGMENT_SCHEMA_VERSION_V3;
  caseId: string;
  teacherVersion: string;
  roleSelections: {
    bestChoice: StayOptiTeacherRoleSelectionV3;
    bestSensibleSaving: StayOptiTeacherRoleSelectionV3;
    worthwhileComfortUpgrade: StayOptiTeacherRoleSelectionV3;
    split: StayOptiTeacherRoleSelectionV3;
  };
  mainSacrifice: string;
  decisiveVariable: string;
  choiceChangingCounterfactual: string;
  confidence: {
    level: StayOptiCurriculumConfidenceLevelV3;
    evidenceCoverage: StayOptiCurriculumEvidenceCoverageV3;
    materialUnknowns: string[];
    rationale: string;
  };
  abstention: {
    abstain: boolean;
    reason: StayOptiCurriculumAbstentionReasonV3;
  };
  claimIds: string[];
  limitations: string[];
  supervisionStatus: "candidate-supervision-only";
  automaticGroundTruthAllowed: false;
  humanReviewRequired: true;
  publicPolicyUseAllowed: false;
}

export interface StayOptiCurriculumObservationV3 {
  state: "selected" | "abstained" | "not-observed";
  optionId: string | null;
  confidence: StayOptiCurriculumConfidenceLevelV3 | "not-recorded";
}

export interface StayOptiCurriculumDisagreementV3 {
  id: string;
  caseId: string;
  role: StayOptiCurriculumDecisionRoleV3;
  provenance: "controlled-lab" | "redacted-diagnostic-pattern";
  observations: {
    teacher: StayOptiCurriculumObservationV3;
    v2: StayOptiCurriculumObservationV3;
    v3: StayOptiCurriculumObservationV3;
    human: StayOptiCurriculumObservationV3;
  };
  disagreementKinds: Array<
    | "teacher-v2"
    | "teacher-v3"
    | "teacher-human"
    | "v2-v3"
    | "v2-human"
    | "v3-human"
    | "insufficient-observation"
  >;
  resolutionStatus: "unresolved" | "human-reviewed-non-ground-truth";
  uncertaintyNotes: string[];
  automaticResolutionAllowed: false;
  groundTruthPromoted: false;
}

export interface StayOptiDecisionCurriculumInputV3 {
  lessons: StayOptiCurriculumLessonV3[];
  cases: StayOptiCurriculumCaseV3[];
  teacherJudgments: StayOptiTeacherJudgmentV3[];
  disagreements: StayOptiCurriculumDisagreementV3[];
}

export interface StayOptiDecisionCurriculumV3
  extends StayOptiDecisionCurriculumInputV3 {
  schemaVersion: typeof STAYOPTI_DECISION_CURRICULUM_SCHEMA_VERSION_V3;
  curriculumVersion: typeof STAYOPTI_DECISION_CURRICULUM_VERSION_V3;
  application: "offline-teacher-lab-only";
  libraryLink: {
    libraryVersion: typeof STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3;
    libraryFingerprint: string;
  };
  automaticGroundTruthAllowed: false;
  automaticPolicyDistillationAllowed: false;
  publicPromotionAllowed: false;
  engineLabelsVisibleToTeacher: false;
  counts: {
    lessons: number;
    cases: number;
    teacherJudgments: number;
    disagreements: number;
    profiles: number;
    caseTypes: number;
  };
  fingerprint: string;
}

export type StayOptiDecisionCurriculumViolationCodeV3 =
  | "schema-invalid"
  | "fingerprint-invalid"
  | "library-link-invalid"
  | "duplicate-id"
  | "profile-coverage-missing"
  | "case-type-coverage-missing"
  | "case-invalid"
  | "case-reference-invalid"
  | "lesson-invalid"
  | "teacher-judgment-invalid"
  | "confidence-protocol-invalid"
  | "disagreement-invalid"
  | "privacy-firewall-open"
  | "ground-truth-firewall-open";

export interface StayOptiDecisionCurriculumViolationV3 {
  code: StayOptiDecisionCurriculumViolationCodeV3;
  entityId: string;
  detail: string;
}

export interface StayOptiDecisionCurriculumValidationV3 {
  valid: boolean;
  violations: StayOptiDecisionCurriculumViolationV3[];
}

function compareById<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort() as T[];
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function canonicalSelection(
  selection: StayOptiTeacherRoleSelectionV3
): StayOptiTeacherRoleSelectionV3 {
  return {
    ...selection,
    rationaleCodes: uniqueSorted(selection.rationaleCodes),
  };
}

function canonicalObservation(
  observation: StayOptiCurriculumObservationV3
): StayOptiCurriculumObservationV3 {
  return { ...observation };
}

function canonicalInput(
  input: StayOptiDecisionCurriculumInputV3
): StayOptiDecisionCurriculumInputV3 {
  const cases = input.cases
    .map((candidate) => ({
      ...candidate,
      context: {
        ...candidate.context,
        hardConstraints: uniqueSorted(candidate.context.hardConstraints),
      },
      options: candidate.options
        .map((option) => ({
          ...option,
          dimensions: { ...option.dimensions },
          evidenceLimitations: [...option.evidenceLimitations],
        }))
        .sort((left, right) => left.optionId.localeCompare(right.optionId)),
      claimIds: uniqueSorted(candidate.claimIds),
      testIds: uniqueSorted(candidate.testIds),
      changedVariables: uniqueSorted(candidate.changedVariables),
    }))
    .sort(compareById);

  const lessons = input.lessons
    .map((lesson) => ({
      ...lesson,
      caseIds: uniqueSorted(lesson.caseIds),
      claimIds: uniqueSorted(lesson.claimIds),
      profiles: uniqueSorted(lesson.profiles),
      roles: uniqueSorted(lesson.roles),
      successCriteria: [...lesson.successCriteria],
    }))
    .sort(compareById);

  const teacherJudgments = input.teacherJudgments
    .map((judgment) => ({
      ...judgment,
      roleSelections: {
        bestChoice: canonicalSelection(judgment.roleSelections.bestChoice),
        bestSensibleSaving: canonicalSelection(judgment.roleSelections.bestSensibleSaving),
        worthwhileComfortUpgrade: canonicalSelection(judgment.roleSelections.worthwhileComfortUpgrade),
        split: canonicalSelection(judgment.roleSelections.split),
      },
      confidence: {
        ...judgment.confidence,
        materialUnknowns: uniqueSorted(judgment.confidence.materialUnknowns),
      },
      abstention: { ...judgment.abstention },
      claimIds: uniqueSorted(judgment.claimIds),
      limitations: [...judgment.limitations],
    }))
    .sort(compareById);

  const disagreements = input.disagreements
    .map((disagreement) => ({
      ...disagreement,
      observations: {
        teacher: canonicalObservation(disagreement.observations.teacher),
        v2: canonicalObservation(disagreement.observations.v2),
        v3: canonicalObservation(disagreement.observations.v3),
        human: canonicalObservation(disagreement.observations.human),
      },
      disagreementKinds: uniqueSorted(disagreement.disagreementKinds),
      uncertaintyNotes: [...disagreement.uncertaintyNotes],
    }))
    .sort(compareById);

  return {
    lessons,
    cases,
    teacherJudgments,
    disagreements,
  };
}

function fingerprintPayload(
  curriculum: Omit<StayOptiDecisionCurriculumV3, "fingerprint">
): string {
  return createStableHashV3(curriculum, "stayopti-v3-decision-curriculum");
}

export function createDecisionCurriculumV3(
  input: StayOptiDecisionCurriculumInputV3,
  library: StayOptiDecisionScienceLibraryV3
): StayOptiDecisionCurriculumV3 {
  const libraryValidation = validateDecisionScienceLibraryV3(library);
  if (!libraryValidation.valid) {
    throw new Error("Decision Curriculum requires a valid Decision Science Library.");
  }

  const canonical = canonicalInput(input);
  const payload: Omit<StayOptiDecisionCurriculumV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_DECISION_CURRICULUM_SCHEMA_VERSION_V3,
    curriculumVersion: STAYOPTI_DECISION_CURRICULUM_VERSION_V3,
    application: "offline-teacher-lab-only",
    libraryLink: {
      libraryVersion: STAYOPTI_DECISION_SCIENCE_LIBRARY_VERSION_V3,
      libraryFingerprint: library.fingerprint,
    },
    automaticGroundTruthAllowed: false,
    automaticPolicyDistillationAllowed: false,
    publicPromotionAllowed: false,
    engineLabelsVisibleToTeacher: false,
    ...canonical,
    counts: {
      lessons: canonical.lessons.length,
      cases: canonical.cases.length,
      teacherJudgments: canonical.teacherJudgments.length,
      disagreements: canonical.disagreements.length,
      profiles: new Set(canonical.cases.map((candidate) => candidate.profile)).size,
      caseTypes: new Set(canonical.cases.map((candidate) => candidate.caseType)).size,
    },
  };

  return {
    ...payload,
    fingerprint: fingerprintPayload(payload),
  };
}

function selectionForRole(
  judgment: StayOptiTeacherJudgmentV3,
  role: StayOptiCurriculumDecisionRoleV3
): StayOptiTeacherRoleSelectionV3 | null {
  if (role === "best-choice") {
    return judgment.roleSelections.bestChoice;
  }
  if (role === "best-sensible-saving") {
    return judgment.roleSelections.bestSensibleSaving;
  }
  if (role === "worthwhile-comfort-upgrade") {
    return judgment.roleSelections.worthwhileComfortUpgrade;
  }
  if (role === "split") {
    return judgment.roleSelections.split;
  }
  return null;
}

function observationKey(observation: StayOptiCurriculumObservationV3): string {
  return `${observation.state}:${observation.optionId ?? "none"}`;
}

export function validateDecisionCurriculumV3(
  curriculum: StayOptiDecisionCurriculumV3,
  library: StayOptiDecisionScienceLibraryV3
): StayOptiDecisionCurriculumValidationV3 {
  const violations: StayOptiDecisionCurriculumViolationV3[] = [];
  const add = (
    code: StayOptiDecisionCurriculumViolationCodeV3,
    entityId: string,
    detail: string
  ) => violations.push({ code, entityId, detail });

  if (
    curriculum.schemaVersion !== STAYOPTI_DECISION_CURRICULUM_SCHEMA_VERSION_V3 ||
    curriculum.curriculumVersion !== STAYOPTI_DECISION_CURRICULUM_VERSION_V3 ||
    curriculum.application !== "offline-teacher-lab-only"
  ) {
    add("schema-invalid", "curriculum", "Version or offline application boundary is invalid.");
  }

  const { fingerprint: _fingerprint, ...payload } = curriculum;
  if (!isStableHashV3(curriculum.fingerprint) || curriculum.fingerprint !== fingerprintPayload(payload)) {
    add("fingerprint-invalid", "curriculum", "Fingerprint does not bind the canonical curriculum payload.");
  }

  const libraryValidation = validateDecisionScienceLibraryV3(library);
  if (
    !libraryValidation.valid ||
    curriculum.libraryLink.libraryVersion !== library.libraryVersion ||
    curriculum.libraryLink.libraryFingerprint !== library.fingerprint
  ) {
    add("library-link-invalid", "curriculum", "Curriculum is not bound to the validated V3-13 library.");
  }

  if (
    curriculum.automaticGroundTruthAllowed !== false ||
    curriculum.automaticPolicyDistillationAllowed !== false ||
    curriculum.publicPromotionAllowed !== false ||
    curriculum.engineLabelsVisibleToTeacher !== false
  ) {
    add("ground-truth-firewall-open", "curriculum", "Teacher output cannot become ground truth or public policy automatically.");
  }

  const allIds = [
    ...curriculum.lessons.map(({ id }) => id),
    ...curriculum.cases.map(({ id }) => id),
    ...curriculum.teacherJudgments.map(({ id }) => id),
    ...curriculum.disagreements.map(({ id }) => id),
  ];
  const seenIds = new Set<string>();
  for (const id of allIds) {
    if (!hasText(id) || seenIds.has(id)) {
      add("duplicate-id", id || "empty-id", "Curriculum entity IDs must be non-empty and globally unique.");
    }
    seenIds.add(id);
  }

  const caseById = new Map(curriculum.cases.map((candidate) => [candidate.id, candidate]));
  const judgmentByCaseId = new Map(curriculum.teacherJudgments.map((judgment) => [judgment.caseId, judgment]));
  const claimById = new Map(library.claims.map((claim) => [claim.id, claim]));
  const testById = new Map(library.testMappings.map((mapping) => [mapping.id, mapping]));

  for (const profile of STAYOPTI_DECISION_CURRICULUM_PROFILES_V3) {
    if (!curriculum.cases.some((candidate) => candidate.profile === profile)) {
      add("profile-coverage-missing", profile, "Every approved profile requires at least one curriculum case.");
    }
  }

  const requiredCaseTypes: StayOptiCurriculumCaseTypeV3[] = [
    "synthetic-controlled",
    "adversarial",
    "counterfactual",
    "near-tie",
    "no-good-option",
    "historical-error",
    "split",
  ];
  for (const caseType of requiredCaseTypes) {
    if (!curriculum.cases.some((candidate) => candidate.caseType === caseType)) {
      add("case-type-coverage-missing", caseType, "Required curriculum case type is missing.");
    }
  }

  for (const candidate of curriculum.cases) {
    const optionIds = new Set<string>();
    for (const option of candidate.options) {
      if (!hasText(option.optionId) || optionIds.has(option.optionId)) {
        add("case-invalid", candidate.id, "Option IDs must be non-empty and unique within a case.");
      }
      optionIds.add(option.optionId);
      if (
        (option.totalCost !== null && (!Number.isFinite(option.totalCost) || option.totalCost < 0)) ||
        option.splitMoveCount < 0 ||
        !Number.isInteger(option.splitMoveCount) ||
        (option.kind === "single-stay" && (option.splitMoveCount !== 0 || option.splitFriction !== "none")) ||
        (option.kind === "split-stay" && option.splitMoveCount < 1)
      ) {
        add("case-invalid", candidate.id, `Option structure is invalid: ${option.optionId}.`);
      }
    }

    if (
      !hasText(candidate.version) ||
      !hasText(candidate.title) ||
      !hasText(candidate.learningObjective) ||
      !hasText(candidate.teacherPrompt) ||
      candidate.options.length < 2 ||
      candidate.context.nights <= 0 ||
      !Number.isInteger(candidate.context.nights) ||
      candidate.context.budget < 0 ||
      !hasText(candidate.context.currency) ||
      candidate.claimIds.length === 0 ||
      candidate.testIds.length === 0
    ) {
      add("case-invalid", candidate.id, "Case metadata, options, context, claims or tests are incomplete.");
    }

    if (
      candidate.piiIncluded !== false ||
      candidate.engineLabelsVisibleToTeacher !== false ||
      candidate.groundTruthStatus !== "unresolved"
    ) {
      add("privacy-firewall-open", candidate.id, "Cases must be PII-free, label-blind and unresolved.");
    }

    for (const claimId of candidate.claimIds) {
      const claim = claimById.get(claimId);
      if (!claim) {
        add("case-reference-invalid", candidate.id, `Unknown library claim: ${claimId}.`);
        continue;
      }
      if (!candidate.testIds.some((testId) => claim.testIds.includes(testId))) {
        add("case-reference-invalid", candidate.id, `Claim has no linked case test: ${claimId}.`);
      }
    }
    for (const testId of candidate.testIds) {
      if (!testById.has(testId)) {
        add("case-reference-invalid", candidate.id, `Unknown library test: ${testId}.`);
      }
    }

    if (candidate.caseType === "counterfactual") {
      const base = candidate.counterfactualOfCaseId === null
        ? undefined
        : caseById.get(candidate.counterfactualOfCaseId);
      if (!base || base.id === candidate.id || base.profile !== candidate.profile || candidate.changedVariables.length === 0) {
        add("case-reference-invalid", candidate.id, "Counterfactual requires a different base case with the same profile and explicit changed variables.");
      }
    }
    if (candidate.caseType !== "counterfactual" && candidate.counterfactualOfCaseId !== null) {
      add("case-reference-invalid", candidate.id, "Only counterfactual cases may reference a base case.");
    }
  }

  const casesCoveredByLessons = new Set<string>();
  for (const lesson of curriculum.lessons) {
    const lessonCases = lesson.caseIds
      .map((caseId) => caseById.get(caseId))
      .filter((candidate): candidate is StayOptiCurriculumCaseV3 => candidate !== undefined);
    lesson.caseIds.forEach((caseId) => casesCoveredByLessons.add(caseId));
    if (
      !hasText(lesson.version) ||
      !hasText(lesson.title) ||
      !hasText(lesson.objective) ||
      lesson.caseIds.length === 0 ||
      lessonCases.length !== lesson.caseIds.length ||
      lesson.claimIds.length === 0 ||
      lesson.successCriteria.length === 0 ||
      lessonCases.some((candidate) => !lesson.profiles.includes(candidate.profile) || !lesson.roles.includes(candidate.decisionRole)) ||
      lessonCases.some((candidate) => candidate.claimIds.some((claimId) => !lesson.claimIds.includes(claimId)))
    ) {
      add("lesson-invalid", lesson.id, "Lesson scope must fully cover its cases, claims, profiles, roles and success criteria.");
    }
  }
  for (const candidate of curriculum.cases) {
    if (!casesCoveredByLessons.has(candidate.id)) {
      add("lesson-invalid", candidate.id, "Every case must belong to at least one lesson.");
    }
  }

  const judgmentCaseIds = new Set<string>();
  for (const judgment of curriculum.teacherJudgments) {
    const candidate = caseById.get(judgment.caseId);
    if (judgmentCaseIds.has(judgment.caseId)) {
      add("teacher-judgment-invalid", judgment.id, "A case may have only one teacher judgment in curriculum v1.");
    }
    judgmentCaseIds.add(judgment.caseId);

    const selections = Object.values(judgment.roleSelections);
    if (
      !candidate ||
      judgment.schemaVersion !== STAYOPTI_TEACHER_JUDGMENT_SCHEMA_VERSION_V3 ||
      !hasText(judgment.teacherVersion) ||
      !hasText(judgment.mainSacrifice) ||
      !hasText(judgment.decisiveVariable) ||
      !hasText(judgment.choiceChangingCounterfactual) ||
      !hasText(judgment.confidence.rationale) ||
      judgment.claimIds.length === 0 ||
      judgment.limitations.length === 0 ||
      judgment.supervisionStatus !== "candidate-supervision-only" ||
      judgment.automaticGroundTruthAllowed !== false ||
      judgment.humanReviewRequired !== true ||
      judgment.publicPolicyUseAllowed !== false
    ) {
      add("teacher-judgment-invalid", judgment.id, "Teacher judgment metadata or supervision firewalls are invalid.");
      continue;
    }

    const candidateOptionIds = new Set(candidate.options.map(({ optionId }) => optionId));
    for (const selection of selections) {
      if (
        (selection.status === "selected" && (selection.optionId === null || !candidateOptionIds.has(selection.optionId))) ||
        (selection.status !== "selected" && selection.optionId !== null) ||
        selection.rationaleCodes.length === 0
      ) {
        add("teacher-judgment-invalid", judgment.id, "Role selections must resolve options and include rationale codes.");
      }
      if (selection.status === "selected" && selection.optionId !== null) {
        const option = candidate.options.find(({ optionId }) => optionId === selection.optionId);
        if (!option || option.offerIntegrity === "invalid" || option.hardConstraintsSatisfied !== true) {
          add("teacher-judgment-invalid", judgment.id, "Teacher cannot select an invalid or hard-constraint-failing option.");
        }
      }
    }

    const splitSelection = judgment.roleSelections.split;
    if (splitSelection.status === "selected") {
      const splitOption = candidate.options.find(({ optionId }) => optionId === splitSelection.optionId);
      if (splitOption?.kind !== "split-stay") {
        add("teacher-judgment-invalid", judgment.id, "Split role must resolve a verified split-stay option.");
      }
    }

    if (judgment.abstention.abstain) {
      if (
        judgment.abstention.reason === "not-required" ||
        selections.some((selection) => selection.status === "selected")
      ) {
        add("confidence-protocol-invalid", judgment.id, "Abstention requires a reason and forbids selected roles.");
      }
    } else if (
      judgment.abstention.reason !== "not-required" ||
      judgment.roleSelections.bestChoice.status !== "selected" ||
      (judgment.confidence.level !== "moderate" && judgment.confidence.level !== "high")
    ) {
      add("confidence-protocol-invalid", judgment.id, "A recommendation requires Best Choice, no abstention reason and moderate/high confidence.");
    }

    if (
      (judgment.confidence.level === "low" || judgment.confidence.level === "none") && !judgment.abstention.abstain
    ) {
      add("confidence-protocol-invalid", judgment.id, "Low or absent confidence must abstain.");
    }
    if (
      judgment.confidence.level === "high" &&
      (judgment.confidence.evidenceCoverage !== "high" || judgment.confidence.materialUnknowns.length > 0)
    ) {
      add("confidence-protocol-invalid", judgment.id, "High confidence requires high coverage and no material unknowns.");
    }
    if (judgment.claimIds.some((claimId) => !candidate.claimIds.includes(claimId))) {
      add("teacher-judgment-invalid", judgment.id, "Judgment may cite only claims declared by its case.");
    }
  }
  for (const candidate of curriculum.cases) {
    if (!judgmentCaseIds.has(candidate.id)) {
      add("teacher-judgment-invalid", candidate.id, "Every case requires one candidate teacher judgment.");
    }
  }

  let observedDisagreementCount = 0;
  let observedHumanCount = 0;
  for (const disagreement of curriculum.disagreements) {
    const candidate = caseById.get(disagreement.caseId);
    const judgment = judgmentByCaseId.get(disagreement.caseId);
    const observations = Object.values(disagreement.observations);
    if (!candidate || !judgment || disagreement.uncertaintyNotes.length === 0) {
      add("disagreement-invalid", disagreement.id, "Disagreement must resolve a case, teacher judgment and uncertainty notes.");
      continue;
    }

    for (const observation of observations) {
      if (
        (observation.state === "selected" && (observation.optionId === null || !candidate.options.some(({ optionId }) => optionId === observation.optionId))) ||
        (observation.state !== "selected" && observation.optionId !== null) ||
        (observation.state === "not-observed" && observation.confidence !== "not-recorded")
      ) {
        add("disagreement-invalid", disagreement.id, "Observation state, option and confidence are inconsistent.");
      }
    }

    const teacherSelection = selectionForRole(judgment, disagreement.role);
    const expectedTeacherState = disagreement.role === "abstention" || judgment.abstention.abstain
      ? "abstained"
      : teacherSelection?.status === "selected"
        ? "selected"
        : "not-observed";
    const expectedTeacherOption = expectedTeacherState === "selected"
      ? teacherSelection?.optionId ?? null
      : null;
    if (
      disagreement.observations.teacher.state !== expectedTeacherState ||
      disagreement.observations.teacher.optionId !== expectedTeacherOption
    ) {
      add("disagreement-invalid", disagreement.id, "Teacher observation does not match the sealed teacher judgment.");
    }

    const observedKeys = observations
      .filter(({ state }) => state !== "not-observed")
      .map(observationKey);
    if (new Set(observedKeys).size > 1) {
      observedDisagreementCount += 1;
    }
    if (disagreement.observations.human.state !== "not-observed") {
      observedHumanCount += 1;
    }
    if (
      disagreement.disagreementKinds.length === 0 ||
      disagreement.automaticResolutionAllowed !== false ||
      disagreement.groundTruthPromoted !== false
    ) {
      add("disagreement-invalid", disagreement.id, "Disagreement must remain explicit, unresolved and non-ground-truth.");
    }
  }
  if (curriculum.disagreements.length === 0 || observedDisagreementCount === 0 || observedHumanCount === 0) {
    add("disagreement-invalid", "disagreement-set", "Set requires at least one observed disagreement and one human observation.");
  }

  const serialized = JSON.stringify(curriculum);
  if (/"(email|phone|passport|bookingId|providerId|commission|markup|affiliateRevenue)"\s*:/.test(serialized)) {
    add("privacy-firewall-open", "curriculum", "Curriculum contains forbidden PII, provider or commercial fields.");
  }

  if (
    curriculum.counts.lessons !== curriculum.lessons.length ||
    curriculum.counts.cases !== curriculum.cases.length ||
    curriculum.counts.teacherJudgments !== curriculum.teacherJudgments.length ||
    curriculum.counts.disagreements !== curriculum.disagreements.length ||
    curriculum.counts.profiles !== new Set(curriculum.cases.map((candidate) => candidate.profile)).size ||
    curriculum.counts.caseTypes !== new Set(curriculum.cases.map((candidate) => candidate.caseType)).size
  ) {
    add("schema-invalid", "curriculum-counts", "Derived counts do not match curriculum contents.");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function assertDecisionCurriculumV3(
  curriculum: StayOptiDecisionCurriculumV3,
  library: StayOptiDecisionScienceLibraryV3
): void {
  const validation = validateDecisionCurriculumV3(curriculum, library);
  if (!validation.valid) {
    throw new Error(
      `StayOpti Decision Curriculum V3 invalid: ${validation.violations
        .map((violation) => `${violation.code}:${violation.entityId}`)
        .join(", ")}`
    );
  }
}

export const STAYOPTI_DECISION_CURRICULUM_AUDIT_V3 = Object.freeze({
  application: "offline-teacher-lab-only" as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  rankingWeightsChanged: false as const,
  thresholdsChanged: false as const,
  automaticGroundTruthAllowed: false as const,
  automaticPolicyDistillationAllowed: false as const,
  humanReviewRequired: true as const,
  engineLabelsVisibleToTeacher: false as const,
  providerCallsAllowed: false as const,
  bookingOrPaymentChanged: false as const,
  analyticsChanged: false as const,
});
