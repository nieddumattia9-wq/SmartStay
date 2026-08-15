import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";

export const STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_VERSION_V3 =
  "3.0.0-personal-utility-role-policy.1" as const;

export const STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_SCHEMA_VERSION_V3 =
  "3.0.0-personal-utility-role-policy-schema.1" as const;

export const STAYOPTI_ROLE_POLICY_PROFILES_V3 = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
] as const;

export const STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3 = [
  "quality",
  "comfort",
  "location",
  "room",
  "flexibility",
  "long-stays",
] as const;

export type StayOptiRolePolicyProfileV3 =
  typeof STAYOPTI_ROLE_POLICY_PROFILES_V3[number];

export type StayOptiRolePolicyExperienceDimensionV3 =
  typeof STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3[number];

export type StayOptiRolePolicyRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "split";

export type StayOptiRolePolicySelectionStatusV3 =
  | "selected"
  | "not-applicable"
  | "abstained"
  | "disabled";

export interface StayOptiRolePolicyDimensionInputV3 {
  score: number | null;
  evidenceIds: string[];
}

export interface StayOptiRolePolicySolutionInputV3 {
  solutionId: string;
  solutionType: "single-stay" | "split-stay";
  totalCost: number | null;
  currency: string;
  hardConstraintsSatisfied: boolean | null;
  offerIntegrity: "verified" | "partial" | "invalid";
  dimensions: Record<
    StayOptiRolePolicyExperienceDimensionV3,
    StayOptiRolePolicyDimensionInputV3
  >;
  evidenceIds: string[];
}

export interface RunStayOptiPersonalUtilityRolePolicyInputV3 {
  caseId: string;
  profile: StayOptiRolePolicyProfileV3;
  totalBudget: number;
  currency: string;
  nights: number;
  solutions: StayOptiRolePolicySolutionInputV3[];
}

export interface StayOptiRolePolicyProfileSettingsV3 {
  budgetTreatment:
    | "hard-ceiling-experience-first"
    | "soft-opportunity-cost"
    | "hard-ceiling-price-priority";
  dimensionWeights: Record<StayOptiRolePolicyExperienceDimensionV3, number>;
  choiceExperienceLossTolerance: number;
  opportunityCostPointsPerBudgetRatio: number;
  maximumBudgetOverrunRatio: number;
  minimumQualityScore: number;
  minimumExperienceScore: number;
  savingQualityLossTolerance: number;
  savingExperienceLossTolerance: number;
  upgradeMinimumExperienceGain: number;
  upgradeMinimumMarginalValuePer100: number;
}

export interface StayOptiRolePolicyDimensionContributionV3 {
  dimension: StayOptiRolePolicyExperienceDimensionV3;
  availability: "available" | "missing-neutral" | "not-applicable";
  sourceScore: number | null;
  configuredWeight: number;
  normalizedAvailableWeight: number;
  weightedValue: number | null;
  evidenceIds: string[];
  transform: "identity-premium-preserving" | "none";
}

export interface StayOptiRolePolicyCandidateEvaluationV3 {
  solutionId: string;
  solutionType: "single-stay" | "split-stay";
  status: "comparable" | "ineligible" | "incomplete" | "split-disabled";
  totalCost: number | null;
  currency: string;
  budgetStatus: "within" | "soft-overrun" | "over-ceiling" | "unknown";
  qualityScore: number | null;
  minimumQualityMet: boolean | null;
  experienceScore: number | null;
  opportunityCostPoints: number | null;
  personalUtilityScore: number | null;
  evidenceCoverage: number;
  availableDimensions: StayOptiRolePolicyExperienceDimensionV3[];
  missingDimensions: StayOptiRolePolicyExperienceDimensionV3[];
  contributions: StayOptiRolePolicyDimensionContributionV3[];
  dominatedBySolutionIds: string[];
  reasonCodes: string[];
}

export interface StayOptiRolePolicyMetricsV3 {
  totalCost: number | null;
  experienceScore: number | null;
  qualityScore: number | null;
  opportunityCostPoints: number | null;
  savingAmount: number | null;
  qualityLoss: number | null;
  experienceLoss: number | null;
  qualityLossTolerance: number | null;
  experienceLossTolerance: number | null;
  upgradePremium: number | null;
  experienceGain: number | null;
  marginalValuePer100: number | null;
  marginalValueThreshold: number | null;
}

export interface StayOptiRolePolicyExplanationV3 {
  headlineKey: string;
  mainSacrifice: string;
  decisiveVariable: string;
  choiceChangingCounterfactual: string;
  evidenceIds: string[];
  uncertaintyCodes: string[];
}

export interface StayOptiRolePolicySelectionV3 {
  role: StayOptiRolePolicyRoleV3;
  status: StayOptiRolePolicySelectionStatusV3;
  solutionId: string | null;
  metrics: StayOptiRolePolicyMetricsV3;
  explanation: StayOptiRolePolicyExplanationV3;
  reasonCodes: string[];
}

export interface StayOptiPersonalUtilityRolePolicyResultV3 {
  schemaVersion: typeof STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_SCHEMA_VERSION_V3;
  policyVersion: typeof STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_VERSION_V3;
  caseId: string;
  profile: StayOptiRolePolicyProfileV3;
  application: "offline-policy-candidate-only";
  status: "usable" | "abstained";
  inputFingerprint: string;
  policyConfigurationFingerprint: string;
  profileSettings: StayOptiRolePolicyProfileSettingsV3;
  candidates: StayOptiRolePolicyCandidateEvaluationV3[];
  portfolio: {
    bestChoice: StayOptiRolePolicySelectionV3;
    bestSensibleSaving: StayOptiRolePolicySelectionV3;
    worthwhileComfortUpgrade: StayOptiRolePolicySelectionV3;
    split: StayOptiRolePolicySelectionV3;
  };
  explanation: {
    format: "role-aware-decision-thesis-v1";
    profileSemanticsKey: string;
    budgetSemanticsKey: string;
    roleSeparationExplicit: true;
    evidenceLinked: true;
    missingEvidenceTreatment: "neutral-renormalization-with-lower-coverage";
  };
  counts: {
    candidates: number;
    comparable: number;
    dominated: number;
    missingEvidence: number;
    selectedRoles: number;
  };
  publicApplicationEnabled: false;
  runtimeIntegrationEnabled: false;
  v2PublicChanged: false;
  splitEnabled: false;
  legacyBudgetUtilityUsed: false;
  teacherOutputsUsedAsGroundTruth: false;
  commercialSignalsUsed: false;
  fingerprint: string;
}

export type StayOptiPersonalUtilityRolePolicyViolationCodeV3 =
  | "schema-invalid"
  | "fingerprint-invalid"
  | "candidate-invalid"
  | "choice-invalid"
  | "dominance-invalid"
  | "saving-invalid"
  | "upgrade-invalid"
  | "missing-evidence-penalized"
  | "role-separation-invalid"
  | "public-firewall-open"
  | "commercial-firewall-open";

export interface StayOptiPersonalUtilityRolePolicyViolationV3 {
  code: StayOptiPersonalUtilityRolePolicyViolationCodeV3;
  entityId: string;
  detail: string;
}

export interface StayOptiPersonalUtilityRolePolicyValidationV3 {
  valid: boolean;
  violations: StayOptiPersonalUtilityRolePolicyViolationV3[];
}

const PROFILE_SETTINGS: Readonly<
  Record<StayOptiRolePolicyProfileV3, StayOptiRolePolicyProfileSettingsV3>
> = {
  "maximum-comfort": {
    budgetTreatment: "hard-ceiling-experience-first",
    dimensionWeights: {
      quality: 0.32,
      comfort: 0.25,
      location: 0.16,
      room: 0.17,
      flexibility: 0.07,
      "long-stays": 0.03,
    },
    choiceExperienceLossTolerance: 0.5,
    opportunityCostPointsPerBudgetRatio: 0,
    maximumBudgetOverrunRatio: 0,
    minimumQualityScore: 70,
    minimumExperienceScore: 65,
    savingQualityLossTolerance: 3,
    savingExperienceLossTolerance: 4,
    upgradeMinimumExperienceGain: 2,
    upgradeMinimumMarginalValuePer100: 1,
  },
  comfort: {
    budgetTreatment: "hard-ceiling-experience-first",
    dimensionWeights: {
      quality: 0.28,
      comfort: 0.24,
      location: 0.18,
      room: 0.18,
      flexibility: 0.08,
      "long-stays": 0.04,
    },
    choiceExperienceLossTolerance: 3,
    opportunityCostPointsPerBudgetRatio: 4,
    maximumBudgetOverrunRatio: 0,
    minimumQualityScore: 65,
    minimumExperienceScore: 60,
    savingQualityLossTolerance: 6,
    savingExperienceLossTolerance: 7,
    upgradeMinimumExperienceGain: 3,
    upgradeMinimumMarginalValuePer100: 1.5,
  },
  balanced: {
    budgetTreatment: "soft-opportunity-cost",
    dimensionWeights: {
      quality: 0.25,
      comfort: 0.17,
      location: 0.22,
      room: 0.16,
      flexibility: 0.1,
      "long-stays": 0.1,
    },
    choiceExperienceLossTolerance: 0,
    opportunityCostPointsPerBudgetRatio: 24,
    maximumBudgetOverrunRatio: 0.15,
    minimumQualityScore: 60,
    minimumExperienceScore: 55,
    savingQualityLossTolerance: 10,
    savingExperienceLossTolerance: 12,
    upgradeMinimumExperienceGain: 4,
    upgradeMinimumMarginalValuePer100: 2,
  },
  savings: {
    budgetTreatment: "hard-ceiling-price-priority",
    dimensionWeights: {
      quality: 0.22,
      comfort: 0.13,
      location: 0.18,
      room: 0.12,
      flexibility: 0.1,
      "long-stays": 0.25,
    },
    choiceExperienceLossTolerance: 0,
    opportunityCostPointsPerBudgetRatio: 70,
    maximumBudgetOverrunRatio: 0,
    minimumQualityScore: 58,
    minimumExperienceScore: 52,
    savingQualityLossTolerance: 18,
    savingExperienceLossTolerance: 20,
    upgradeMinimumExperienceGain: 5,
    upgradeMinimumMarginalValuePer100: 3,
  },
  "maximum-savings": {
    budgetTreatment: "hard-ceiling-price-priority",
    dimensionWeights: {
      quality: 0.2,
      comfort: 0.12,
      location: 0.16,
      room: 0.12,
      flexibility: 0.08,
      "long-stays": 0.32,
    },
    choiceExperienceLossTolerance: 0,
    opportunityCostPointsPerBudgetRatio: 100,
    maximumBudgetOverrunRatio: 0,
    minimumQualityScore: 55,
    minimumExperienceScore: 50,
    savingQualityLossTolerance: 25,
    savingExperienceLossTolerance: 30,
    upgradeMinimumExperienceGain: 6,
    upgradeMinimumMarginalValuePer100: 4,
  },
};

const POLICY_CONFIGURATION_FINGERPRINT = createStableHashV3(
  PROFILE_SETTINGS,
  "stayopti-v3-personal-utility-role-policy-configuration"
);

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function cloneSettings(
  profile: StayOptiRolePolicyProfileV3,
  nights: number
): StayOptiRolePolicyProfileSettingsV3 {
  const settings = PROFILE_SETTINGS[profile];
  return {
    ...settings,
    dimensionWeights: {
      ...settings.dimensionWeights,
      "long-stays": nights >= 7 ? settings.dimensionWeights["long-stays"] : 0,
    },
  };
}

export function getPersonalUtilityRolePolicySettingsV3(
  profile: StayOptiRolePolicyProfileV3,
  nights: number
): StayOptiRolePolicyProfileSettingsV3 {
  return cloneSettings(profile, nights);
}

function canonicalInput(
  input: RunStayOptiPersonalUtilityRolePolicyInputV3
): RunStayOptiPersonalUtilityRolePolicyInputV3 {
  return {
    ...input,
    solutions: input.solutions
      .map((solution) => ({
        ...solution,
        dimensions: Object.fromEntries(
          STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3.map((dimension) => [
            dimension,
            {
              score: solution.dimensions[dimension].score,
              evidenceIds: uniqueSorted(solution.dimensions[dimension].evidenceIds),
            },
          ])
        ) as StayOptiRolePolicySolutionInputV3["dimensions"],
        evidenceIds: uniqueSorted(solution.evidenceIds),
      }))
      .sort((left, right) => left.solutionId.localeCompare(right.solutionId)),
  };
}

function assertInput(
  input: RunStayOptiPersonalUtilityRolePolicyInputV3
): void {
  if (
    /"(commission|markup|affiliateRevenue|clickProbability|providerPriority|userEconomicValue)"\s*:/.test(
      JSON.stringify(input)
    )
  ) {
    throw new Error("Role policy input contains forbidden commercial fields.");
  }
  if (
    input.caseId.trim().length === 0 ||
    !STAYOPTI_ROLE_POLICY_PROFILES_V3.includes(input.profile) ||
    !Number.isFinite(input.totalBudget) ||
    input.totalBudget <= 0 ||
    input.currency.trim().length === 0 ||
    !Number.isInteger(input.nights) ||
    input.nights <= 0 ||
    input.solutions.length < 2
  ) {
    throw new Error("Role policy input metadata is invalid.");
  }

  const ids = new Set<string>();
  for (const solution of input.solutions) {
    if (
      solution.solutionId.trim().length === 0 ||
      ids.has(solution.solutionId) ||
      solution.currency !== input.currency ||
      (solution.totalCost !== null &&
        (!Number.isFinite(solution.totalCost) || solution.totalCost < 0))
    ) {
      throw new Error(`Invalid role policy solution: ${solution.solutionId}.`);
    }
    ids.add(solution.solutionId);

    for (const dimension of STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3) {
      const value = solution.dimensions[dimension];
      if (
        !value ||
        (value.score !== null &&
          (!Number.isFinite(value.score) || value.score < 0 || value.score > 100))
      ) {
        throw new Error(`Invalid ${dimension} evidence for ${solution.solutionId}.`);
      }
    }
  }
}

function evaluateCandidate(
  solution: StayOptiRolePolicySolutionInputV3,
  input: RunStayOptiPersonalUtilityRolePolicyInputV3,
  settings: StayOptiRolePolicyProfileSettingsV3
): StayOptiRolePolicyCandidateEvaluationV3 {
  const activeWeight = STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3.reduce(
    (total, dimension) => total + settings.dimensionWeights[dimension],
    0
  );
  const availableWeight = STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3.reduce(
    (total, dimension) =>
      total +
      (solution.dimensions[dimension].score === null
        ? 0
        : settings.dimensionWeights[dimension]),
    0
  );

  const contributions = STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3.map(
    (dimension): StayOptiRolePolicyDimensionContributionV3 => {
      const source = solution.dimensions[dimension];
      const configuredWeight = settings.dimensionWeights[dimension];
      if (configuredWeight === 0) {
        return {
          dimension,
          availability: "not-applicable",
          sourceScore: source.score,
          configuredWeight,
          normalizedAvailableWeight: 0,
          weightedValue: null,
          evidenceIds: uniqueSorted(source.evidenceIds),
          transform: "none",
        };
      }
      if (source.score === null) {
        return {
          dimension,
          availability: "missing-neutral",
          sourceScore: null,
          configuredWeight,
          normalizedAvailableWeight: 0,
          weightedValue: null,
          evidenceIds: uniqueSorted(source.evidenceIds),
          transform: "none",
        };
      }
      const normalizedAvailableWeight =
        availableWeight === 0 ? 0 : configuredWeight / availableWeight;
      return {
        dimension,
        availability: "available",
        sourceScore: source.score,
        configuredWeight,
        normalizedAvailableWeight: round(normalizedAvailableWeight),
        weightedValue: round(source.score * normalizedAvailableWeight),
        evidenceIds: uniqueSorted(source.evidenceIds),
        transform: "identity-premium-preserving",
      };
    }
  );

  const experienceScore =
    availableWeight === 0
      ? null
      : round(
          STAYOPTI_ROLE_POLICY_EXPERIENCE_DIMENSIONS_V3.reduce(
            (total, dimension) => {
              const score = solution.dimensions[dimension].score;
              return (
                total +
                (score === null
                  ? 0
                  : score * settings.dimensionWeights[dimension])
              );
            },
            0
          ) / availableWeight
        );
  const evidenceCoverage =
    activeWeight === 0 ? 0 : round(availableWeight / activeWeight);
  const qualityScore = solution.dimensions.quality.score;
  const minimumQualityMet =
    qualityScore === null ? null : qualityScore >= settings.minimumQualityScore;

  const ratio =
    solution.totalCost === null ? null : solution.totalCost / input.totalBudget;
  const budgetStatus =
    ratio === null
      ? "unknown"
      : ratio <= 1
        ? "within"
        : settings.budgetTreatment === "soft-opportunity-cost" &&
            ratio <= 1 + settings.maximumBudgetOverrunRatio
          ? "soft-overrun"
          : "over-ceiling";
  const opportunityCostPoints =
    ratio === null
      ? null
      : round(
          ratio * settings.opportunityCostPointsPerBudgetRatio +
            (budgetStatus === "soft-overrun" ? (ratio - 1) * 40 : 0)
        );
  const personalUtilityScore =
    experienceScore === null || opportunityCostPoints === null
      ? null
      : round(experienceScore - opportunityCostPoints);

  const reasonCodes: string[] = [];
  if (solution.solutionType === "split-stay") reasonCodes.push("policy:split-disabled");
  if (solution.hardConstraintsSatisfied !== true) reasonCodes.push("policy:hard-constraint-unresolved");
  if (solution.offerIntegrity !== "verified") reasonCodes.push("policy:offer-not-verified");
  if (budgetStatus === "over-ceiling") reasonCodes.push("policy:budget-ceiling-exceeded");
  if (minimumQualityMet === false) reasonCodes.push("policy:minimum-quality-not-met");
  if (experienceScore !== null && experienceScore < settings.minimumExperienceScore) {
    reasonCodes.push("policy:minimum-experience-not-met");
  }
  if (evidenceCoverage < 1) reasonCodes.push("policy:missing-evidence-neutral");
  if (settings.opportunityCostPointsPerBudgetRatio === 0) {
    reasonCodes.push("policy:no-unused-budget-reward");
  } else {
    reasonCodes.push("policy:profile-calibrated-opportunity-cost");
  }

  let status: StayOptiRolePolicyCandidateEvaluationV3["status"] = "comparable";
  if (solution.solutionType === "split-stay") {
    status = "split-disabled";
  } else if (
    solution.hardConstraintsSatisfied === false ||
    solution.offerIntegrity === "invalid" ||
    budgetStatus === "over-ceiling" ||
    minimumQualityMet === false ||
    (experienceScore !== null && experienceScore < settings.minimumExperienceScore)
  ) {
    status = "ineligible";
  } else if (
    solution.hardConstraintsSatisfied === null ||
    solution.offerIntegrity === "partial" ||
    solution.totalCost === null ||
    qualityScore === null ||
    experienceScore === null ||
    evidenceCoverage < 0.5
  ) {
    status = "incomplete";
  }

  return {
    solutionId: solution.solutionId,
    solutionType: solution.solutionType,
    status,
    totalCost: solution.totalCost,
    currency: solution.currency,
    budgetStatus,
    qualityScore,
    minimumQualityMet,
    experienceScore,
    opportunityCostPoints,
    personalUtilityScore,
    evidenceCoverage,
    availableDimensions: contributions
      .filter(({ availability }) => availability === "available")
      .map(({ dimension }) => dimension),
    missingDimensions: contributions
      .filter(({ availability }) => availability === "missing-neutral")
      .map(({ dimension }) => dimension),
    contributions,
    dominatedBySolutionIds: [],
    reasonCodes: uniqueSorted(reasonCodes),
  };
}

function dominates(
  first: StayOptiRolePolicyCandidateEvaluationV3,
  second: StayOptiRolePolicyCandidateEvaluationV3
): boolean {
  if (
    first.status !== "comparable" ||
    second.status !== "comparable" ||
    first.totalCost === null ||
    second.totalCost === null ||
    first.totalCost > second.totalCost
  ) {
    return false;
  }

  const firstScores = new Map(
    first.contributions.map(({ dimension, sourceScore }) => [dimension, sourceScore])
  );
  const secondScores = new Map(
    second.contributions.map(({ dimension, sourceScore }) => [dimension, sourceScore])
  );
  const activeDimensions = first.contributions
    .filter(({ configuredWeight }) => configuredWeight > 0)
    .map(({ dimension }) => dimension);
  if (
    activeDimensions.some(
      (dimension) =>
        firstScores.get(dimension) === null || secondScores.get(dimension) === null
    )
  ) {
    return false;
  }

  const nonWorse = activeDimensions.every(
    (dimension) =>
      (firstScores.get(dimension) as number) >=
      (secondScores.get(dimension) as number)
  );
  const materiallyBetter =
    first.totalCost < second.totalCost ||
    activeDimensions.some(
      (dimension) =>
        (firstScores.get(dimension) as number) >
        (secondScores.get(dimension) as number)
    );
  return nonWorse && materiallyBetter;
}

function withDominance(
  candidates: StayOptiRolePolicyCandidateEvaluationV3[]
): StayOptiRolePolicyCandidateEvaluationV3[] {
  return candidates.map((candidate) => ({
    ...candidate,
    dominatedBySolutionIds: candidates
      .filter((other) => other.solutionId !== candidate.solutionId && dominates(other, candidate))
      .map(({ solutionId }) => solutionId)
      .sort(),
  }));
}

function compareNumberDescending(left: number | null, right: number | null): number {
  return (right ?? Number.NEGATIVE_INFINITY) - (left ?? Number.NEGATIVE_INFINITY);
}

function compareNumberAscending(left: number | null, right: number | null): number {
  return (left ?? Number.POSITIVE_INFINITY) - (right ?? Number.POSITIVE_INFINITY);
}

function chooseBestChoice(
  candidates: StayOptiRolePolicyCandidateEvaluationV3[],
  profile: StayOptiRolePolicyProfileV3,
  settings: StayOptiRolePolicyProfileSettingsV3
): StayOptiRolePolicyCandidateEvaluationV3 | null {
  const eligible = candidates.filter(
    ({ status, dominatedBySolutionIds }) =>
      status === "comparable" && dominatedBySolutionIds.length === 0
  );
  if (eligible.length === 0) return null;

  if (profile === "maximum-comfort") {
    return [...eligible].sort(
      (left, right) =>
        compareNumberDescending(left.experienceScore, right.experienceScore) ||
        compareNumberAscending(left.totalCost, right.totalCost) ||
        left.solutionId.localeCompare(right.solutionId)
    )[0];
  }

  if (profile === "comfort") {
    const maximumExperience = Math.max(
      ...eligible.map(({ experienceScore }) => experienceScore ?? Number.NEGATIVE_INFINITY)
    );
    const experienceBand = eligible.filter(
      ({ experienceScore }) =>
        experienceScore !== null &&
        maximumExperience - experienceScore <= settings.choiceExperienceLossTolerance
    );
    return [...experienceBand].sort(
      (left, right) =>
        compareNumberDescending(left.personalUtilityScore, right.personalUtilityScore) ||
        compareNumberDescending(left.experienceScore, right.experienceScore) ||
        compareNumberAscending(left.totalCost, right.totalCost) ||
        left.solutionId.localeCompare(right.solutionId)
    )[0];
  }

  if (profile === "maximum-savings") {
    return [...eligible].sort(
      (left, right) =>
        compareNumberAscending(left.totalCost, right.totalCost) ||
        compareNumberDescending(left.experienceScore, right.experienceScore) ||
        left.solutionId.localeCompare(right.solutionId)
    )[0];
  }

  return [...eligible].sort(
    (left, right) =>
      compareNumberDescending(left.personalUtilityScore, right.personalUtilityScore) ||
      compareNumberDescending(left.experienceScore, right.experienceScore) ||
      compareNumberAscending(left.totalCost, right.totalCost) ||
      left.solutionId.localeCompare(right.solutionId)
  )[0];
}

function emptyMetrics(): StayOptiRolePolicyMetricsV3 {
  return {
    totalCost: null,
    experienceScore: null,
    qualityScore: null,
    opportunityCostPoints: null,
    savingAmount: null,
    qualityLoss: null,
    experienceLoss: null,
    qualityLossTolerance: null,
    experienceLossTolerance: null,
    upgradePremium: null,
    experienceGain: null,
    marginalValuePer100: null,
    marginalValueThreshold: null,
  };
}

function evidenceFor(
  input: RunStayOptiPersonalUtilityRolePolicyInputV3,
  solutionId: string,
  dimension?: StayOptiRolePolicyExperienceDimensionV3
): string[] {
  const solution = input.solutions.find((candidate) => candidate.solutionId === solutionId);
  if (!solution) return [];
  return uniqueSorted([
    ...solution.evidenceIds,
    ...(dimension ? solution.dimensions[dimension].evidenceIds : []),
  ]);
}

function decisiveDimension(
  selected: StayOptiRolePolicyCandidateEvaluationV3,
  comparison: StayOptiRolePolicyCandidateEvaluationV3 | null
): StayOptiRolePolicyExperienceDimensionV3 | null {
  if (!comparison) return selected.availableDimensions[0] ?? null;
  let best: { dimension: StayOptiRolePolicyExperienceDimensionV3; value: number } | null = null;
  for (const contribution of selected.contributions) {
    const other = comparison.contributions.find(
      ({ dimension }) => dimension === contribution.dimension
    );
    if (
      contribution.sourceScore === null ||
      other === undefined ||
      other.sourceScore === null ||
      contribution.configuredWeight === 0
    ) continue;
    const value =
      (contribution.sourceScore - other.sourceScore) * contribution.configuredWeight;
    if (best === null || value > best.value) {
      best = { dimension: contribution.dimension, value };
    }
  }
  return best?.dimension ?? null;
}

function unavailableRole(
  role: StayOptiRolePolicyRoleV3,
  status: "not-applicable" | "abstained" | "disabled",
  reasonCode: string
): StayOptiRolePolicySelectionV3 {
  return {
    role,
    status,
    solutionId: null,
    metrics: emptyMetrics(),
    explanation: {
      headlineKey: `${role}:${status}`,
      mainSacrifice: "none",
      decisiveVariable: "insufficient-applicable-evidence",
      choiceChangingCounterfactual: "counterfactual:provide-applicable-evidence",
      evidenceIds: [],
      uncertaintyCodes: [reasonCode],
    },
    reasonCodes: [reasonCode],
  };
}

function choiceRole(
  choice: StayOptiRolePolicyCandidateEvaluationV3,
  alternatives: StayOptiRolePolicyCandidateEvaluationV3[],
  input: RunStayOptiPersonalUtilityRolePolicyInputV3,
  settings: StayOptiRolePolicyProfileSettingsV3
): StayOptiRolePolicySelectionV3 {
  const comparison = alternatives
    .filter(({ solutionId, status }) => solutionId !== choice.solutionId && status === "comparable")
    .sort(
      (left, right) =>
        compareNumberDescending(left.personalUtilityScore, right.personalUtilityScore) ||
        left.solutionId.localeCompare(right.solutionId)
    )[0] ?? null;
  const decisive = decisiveDimension(choice, comparison);
  const cheapest = alternatives
    .filter(({ status, totalCost }) => status === "comparable" && totalCost !== null)
    .sort((left, right) => compareNumberAscending(left.totalCost, right.totalCost))[0];
  const mainSacrifice =
    cheapest &&
    cheapest.solutionId !== choice.solutionId &&
    cheapest.totalCost !== null &&
    choice.totalCost !== null
      ? `higher-total-cost:${round(choice.totalCost - cheapest.totalCost)}`
      : "none-material";

  return {
    role: "best-choice",
    status: "selected",
    solutionId: choice.solutionId,
    metrics: {
      ...emptyMetrics(),
      totalCost: choice.totalCost,
      experienceScore: choice.experienceScore,
      qualityScore: choice.qualityScore,
      opportunityCostPoints: choice.opportunityCostPoints,
    },
    explanation: {
      headlineKey: `best-choice:${input.profile}`,
      mainSacrifice,
      decisiveVariable:
        input.profile === "maximum-savings" ? "total-cost" : decisive ?? "experience-fit",
      choiceChangingCounterfactual:
        settings.budgetTreatment === "hard-ceiling-experience-first"
          ? "counterfactual:experience-or-hard-budget-ceiling-changes"
          : "counterfactual:marginal-value-balance-changes",
      evidenceIds: evidenceFor(input, choice.solutionId, decisive ?? undefined),
      uncertaintyCodes:
        choice.evidenceCoverage < 1 ? ["uncertainty:missing-evidence"] : [],
    },
    reasonCodes: uniqueSorted([
      "role:best-choice-independent",
      settings.budgetTreatment === "hard-ceiling-experience-first"
        ? "budget:ceiling-before-choice"
        : "budget:profile-opportunity-cost",
      "quality:identity-premium-preserving",
    ]),
  };
}

function savingRole(
  choice: StayOptiRolePolicyCandidateEvaluationV3,
  candidates: StayOptiRolePolicyCandidateEvaluationV3[],
  input: RunStayOptiPersonalUtilityRolePolicyInputV3,
  settings: StayOptiRolePolicyProfileSettingsV3
): StayOptiRolePolicySelectionV3 {
  if (choice.totalCost === null || choice.experienceScore === null || choice.qualityScore === null) {
    return unavailableRole("best-sensible-saving", "not-applicable", "saving:choice-incomplete");
  }

  const eligible = candidates
    .filter(
      (candidate) =>
        candidate.status === "comparable" &&
        candidate.solutionId !== choice.solutionId &&
        candidate.totalCost !== null &&
        candidate.experienceScore !== null &&
        candidate.qualityScore !== null &&
        candidate.totalCost < (choice.totalCost as number) &&
        candidate.evidenceCoverage >= 0.6
    )
    .map((candidate) => ({
      candidate,
      savingAmount: round(choice.totalCost as number - (candidate.totalCost as number)),
      qualityLoss: round(Math.max(0, choice.qualityScore as number - (candidate.qualityScore as number))),
      experienceLoss: round(
        Math.max(0, choice.experienceScore as number - (candidate.experienceScore as number))
      ),
    }))
    .filter(
      ({ qualityLoss, experienceLoss }) =>
        qualityLoss <= settings.savingQualityLossTolerance &&
        experienceLoss <= settings.savingExperienceLossTolerance
    )
    .sort(
      (left, right) =>
        right.savingAmount - left.savingAmount ||
        left.experienceLoss - right.experienceLoss ||
        left.candidate.solutionId.localeCompare(right.candidate.solutionId)
    );

  const selected = eligible[0];
  if (!selected) {
    return unavailableRole(
      "best-sensible-saving",
      "not-applicable",
      "saving:no-cheaper-option-within-loss-tolerance"
    );
  }

  return {
    role: "best-sensible-saving",
    status: "selected",
    solutionId: selected.candidate.solutionId,
    metrics: {
      ...emptyMetrics(),
      totalCost: selected.candidate.totalCost,
      experienceScore: selected.candidate.experienceScore,
      qualityScore: selected.candidate.qualityScore,
      opportunityCostPoints: selected.candidate.opportunityCostPoints,
      savingAmount: selected.savingAmount,
      qualityLoss: selected.qualityLoss,
      experienceLoss: selected.experienceLoss,
      qualityLossTolerance: settings.savingQualityLossTolerance,
      experienceLossTolerance: settings.savingExperienceLossTolerance,
    },
    explanation: {
      headlineKey: "best-sensible-saving:bounded-loss",
      mainSacrifice: `experience-loss:${selected.experienceLoss}`,
      decisiveVariable: "total-cost-saving-within-quality-loss-tolerance",
      choiceChangingCounterfactual: "counterfactual:quality-loss-exceeds-profile-tolerance",
      evidenceIds: evidenceFor(input, selected.candidate.solutionId),
      uncertaintyCodes:
        selected.candidate.evidenceCoverage < 1 ? ["uncertainty:missing-evidence"] : [],
    },
    reasonCodes: [
      "role:saving-separated-from-choice",
      "saving:quality-loss-explicit",
      "saving:experience-loss-within-profile-tolerance",
    ],
  };
}

function upgradeRole(
  choice: StayOptiRolePolicyCandidateEvaluationV3,
  candidates: StayOptiRolePolicyCandidateEvaluationV3[],
  input: RunStayOptiPersonalUtilityRolePolicyInputV3,
  settings: StayOptiRolePolicyProfileSettingsV3
): StayOptiRolePolicySelectionV3 {
  if (choice.totalCost === null || choice.experienceScore === null) {
    return unavailableRole(
      "worthwhile-comfort-upgrade",
      "not-applicable",
      "upgrade:choice-incomplete"
    );
  }

  const eligible = candidates
    .filter(
      (candidate) =>
        candidate.status === "comparable" &&
        candidate.solutionId !== choice.solutionId &&
        candidate.totalCost !== null &&
        candidate.experienceScore !== null &&
        candidate.totalCost > (choice.totalCost as number) &&
        candidate.evidenceCoverage >= 0.6
    )
    .map((candidate) => {
      const upgradePremium = round((candidate.totalCost as number) - (choice.totalCost as number));
      const experienceGain = round(
        (candidate.experienceScore as number) - (choice.experienceScore as number)
      );
      return {
        candidate,
        upgradePremium,
        experienceGain,
        marginalValuePer100:
          upgradePremium === 0 ? 0 : round((experienceGain / upgradePremium) * 100),
      };
    })
    .filter(
      ({ experienceGain, marginalValuePer100 }) =>
        experienceGain >= settings.upgradeMinimumExperienceGain &&
        marginalValuePer100 >= settings.upgradeMinimumMarginalValuePer100
    )
    .sort(
      (left, right) =>
        right.experienceGain - left.experienceGain ||
        right.marginalValuePer100 - left.marginalValuePer100 ||
        left.candidate.solutionId.localeCompare(right.candidate.solutionId)
    );

  const selected = eligible[0];
  if (!selected) {
    return unavailableRole(
      "worthwhile-comfort-upgrade",
      "not-applicable",
      "upgrade:no-option-meets-marginal-value-threshold"
    );
  }

  return {
    role: "worthwhile-comfort-upgrade",
    status: "selected",
    solutionId: selected.candidate.solutionId,
    metrics: {
      ...emptyMetrics(),
      totalCost: selected.candidate.totalCost,
      experienceScore: selected.candidate.experienceScore,
      qualityScore: selected.candidate.qualityScore,
      opportunityCostPoints: selected.candidate.opportunityCostPoints,
      upgradePremium: selected.upgradePremium,
      experienceGain: selected.experienceGain,
      marginalValuePer100: selected.marginalValuePer100,
      marginalValueThreshold: settings.upgradeMinimumMarginalValuePer100,
    },
    explanation: {
      headlineKey: "worthwhile-comfort-upgrade:marginal-value-proven",
      mainSacrifice: `additional-cost:${selected.upgradePremium}`,
      decisiveVariable: "experience-gain-per-100-currency",
      choiceChangingCounterfactual: "counterfactual:marginal-value-below-profile-threshold",
      evidenceIds: evidenceFor(input, selected.candidate.solutionId),
      uncertaintyCodes:
        selected.candidate.evidenceCoverage < 1 ? ["uncertainty:missing-evidence"] : [],
    },
    reasonCodes: [
      "role:upgrade-separated-from-choice",
      "upgrade:premium-explicit",
      "upgrade:marginal-value-threshold-met",
    ],
  };
}

function resultFingerprint(
  result: Omit<StayOptiPersonalUtilityRolePolicyResultV3, "fingerprint">
): string {
  return createStableHashV3(result, "stayopti-v3-personal-utility-role-policy-result");
}

export function runPersonalUtilityRolePolicyV3(
  rawInput: RunStayOptiPersonalUtilityRolePolicyInputV3
): StayOptiPersonalUtilityRolePolicyResultV3 {
  assertInput(rawInput);
  const input = canonicalInput(rawInput);
  const settings = cloneSettings(input.profile, input.nights);
  const candidates = withDominance(
    input.solutions.map((solution) => evaluateCandidate(solution, input, settings))
  );
  const choice = chooseBestChoice(candidates, input.profile, settings);
  const bestChoice = choice
    ? choiceRole(choice, candidates, input, settings)
    : unavailableRole("best-choice", "abstained", "choice:no-comparable-option");
  const bestSensibleSaving = choice
    ? savingRole(choice, candidates, input, settings)
    : unavailableRole("best-sensible-saving", "abstained", "saving:no-best-choice");
  const worthwhileComfortUpgrade = choice
    ? upgradeRole(choice, candidates, input, settings)
    : unavailableRole("worthwhile-comfort-upgrade", "abstained", "upgrade:no-best-choice");
  const split = unavailableRole("split", "disabled", "split:disabled-until-single-stay-maturity");

  const payload: Omit<StayOptiPersonalUtilityRolePolicyResultV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_SCHEMA_VERSION_V3,
    policyVersion: STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_VERSION_V3,
    caseId: input.caseId,
    profile: input.profile,
    application: "offline-policy-candidate-only",
    status: choice ? "usable" : "abstained",
    inputFingerprint: createStableHashV3(input, "stayopti-v3-personal-utility-role-policy-input"),
    policyConfigurationFingerprint: POLICY_CONFIGURATION_FINGERPRINT,
    profileSettings: settings,
    candidates,
    portfolio: {
      bestChoice,
      bestSensibleSaving,
      worthwhileComfortUpgrade,
      split,
    },
    explanation: {
      format: "role-aware-decision-thesis-v1",
      profileSemanticsKey: `profile:${input.profile}`,
      budgetSemanticsKey: `budget:${settings.budgetTreatment}`,
      roleSeparationExplicit: true,
      evidenceLinked: true,
      missingEvidenceTreatment: "neutral-renormalization-with-lower-coverage",
    },
    counts: {
      candidates: candidates.length,
      comparable: candidates.filter(({ status }) => status === "comparable").length,
      dominated: candidates.filter(({ dominatedBySolutionIds }) => dominatedBySolutionIds.length > 0).length,
      missingEvidence: candidates.filter(({ missingDimensions }) => missingDimensions.length > 0).length,
      selectedRoles: [bestChoice, bestSensibleSaving, worthwhileComfortUpgrade, split].filter(
        ({ status }) => status === "selected"
      ).length,
    },
    publicApplicationEnabled: false,
    runtimeIntegrationEnabled: false,
    v2PublicChanged: false,
    splitEnabled: false,
    legacyBudgetUtilityUsed: false,
    teacherOutputsUsedAsGroundTruth: false,
    commercialSignalsUsed: false,
  };

  return {
    ...payload,
    fingerprint: resultFingerprint(payload),
  };
}

export function validatePersonalUtilityRolePolicyV3(
  result: StayOptiPersonalUtilityRolePolicyResultV3
): StayOptiPersonalUtilityRolePolicyValidationV3 {
  const violations: StayOptiPersonalUtilityRolePolicyViolationV3[] = [];
  const add = (
    code: StayOptiPersonalUtilityRolePolicyViolationCodeV3,
    entityId: string,
    detail: string
  ) => violations.push({ code, entityId, detail });

  if (
    result.schemaVersion !== STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_SCHEMA_VERSION_V3 ||
    result.policyVersion !== STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_VERSION_V3 ||
    result.application !== "offline-policy-candidate-only" ||
    result.policyConfigurationFingerprint !== POLICY_CONFIGURATION_FINGERPRINT
  ) {
    add("schema-invalid", result.caseId, "Policy version, schema or configuration binding is invalid.");
  }

  const { fingerprint: _fingerprint, ...payload } = result;
  if (!isStableHashV3(result.fingerprint) || result.fingerprint !== resultFingerprint(payload)) {
    add("fingerprint-invalid", result.caseId, "Result fingerprint does not bind the policy payload.");
  }

  const candidateById = new Map(result.candidates.map((candidate) => [candidate.solutionId, candidate]));
  if (candidateById.size !== result.candidates.length) {
    add("candidate-invalid", result.caseId, "Candidate IDs must be unique.");
  }
  for (const candidate of result.candidates) {
    const contributionTotal = round(
      candidate.contributions.reduce(
        (total, contribution) => total + (contribution.weightedValue ?? 0),
        0
      )
    );
    if (
      candidate.experienceScore !== null &&
      Math.abs(candidate.experienceScore - contributionTotal) > 0.00001
    ) {
      add("candidate-invalid", candidate.solutionId, "Experience score does not equal available weighted contributions.");
    }
    for (const contribution of candidate.contributions) {
      if (
        contribution.availability === "missing-neutral" &&
        (contribution.weightedValue !== null || contribution.normalizedAvailableWeight !== 0)
      ) {
        add("missing-evidence-penalized", candidate.solutionId, "Missing evidence must be neutral and reduce coverage only.");
      }
      if (
        contribution.availability === "available" &&
        contribution.transform !== "identity-premium-preserving"
      ) {
        add("candidate-invalid", candidate.solutionId, "Available premium-quality evidence must retain its identity scale.");
      }
    }
  }

  const choice = result.portfolio.bestChoice;
  const choiceCandidate = choice.solutionId ? candidateById.get(choice.solutionId) : undefined;
  if (result.status === "usable") {
    if (
      choice.status !== "selected" ||
      !choiceCandidate ||
      choiceCandidate.status !== "comparable"
    ) {
      add("choice-invalid", result.caseId, "Usable policy requires a comparable Best Choice.");
    }
    if ((choiceCandidate?.dominatedBySolutionIds.length ?? 0) > 0) {
      add("dominance-invalid", choice.solutionId ?? result.caseId, "A dominated solution cannot be Best Choice.");
    }
  } else if (choice.status !== "abstained" || choice.solutionId !== null) {
    add("choice-invalid", result.caseId, "Abstained policy cannot expose a Best Choice.");
  }

  const saving = result.portfolio.bestSensibleSaving;
  if (saving.status === "selected") {
    const selected = saving.solutionId ? candidateById.get(saving.solutionId) : undefined;
    if (
      !selected ||
      !choiceCandidate ||
      selected.totalCost === null ||
      choiceCandidate.totalCost === null ||
      selected.totalCost >= choiceCandidate.totalCost ||
      saving.metrics.savingAmount === null ||
      saving.metrics.savingAmount <= 0 ||
      saving.metrics.qualityLoss === null ||
      saving.metrics.qualityLossTolerance === null ||
      saving.metrics.qualityLoss > saving.metrics.qualityLossTolerance ||
      saving.metrics.experienceLoss === null ||
      saving.metrics.experienceLossTolerance === null ||
      saving.metrics.experienceLoss > saving.metrics.experienceLossTolerance
    ) {
      add("saving-invalid", saving.solutionId ?? result.caseId, "Saving must be cheaper and stay within explicit quality and experience loss tolerances.");
    }
  }

  const upgrade = result.portfolio.worthwhileComfortUpgrade;
  if (upgrade.status === "selected") {
    const selected = upgrade.solutionId ? candidateById.get(upgrade.solutionId) : undefined;
    if (
      !selected ||
      !choiceCandidate ||
      selected.totalCost === null ||
      choiceCandidate.totalCost === null ||
      selected.totalCost <= choiceCandidate.totalCost ||
      upgrade.metrics.upgradePremium === null ||
      upgrade.metrics.upgradePremium <= 0 ||
      upgrade.metrics.experienceGain === null ||
      upgrade.metrics.experienceGain < result.profileSettings.upgradeMinimumExperienceGain ||
      upgrade.metrics.marginalValuePer100 === null ||
      upgrade.metrics.marginalValueThreshold === null ||
      upgrade.metrics.marginalValuePer100 < upgrade.metrics.marginalValueThreshold
    ) {
      add("upgrade-invalid", upgrade.solutionId ?? result.caseId, "Upgrade must prove experience gain and profile-calibrated marginal value.");
    }
  }

  if (
    choice.role !== "best-choice" ||
    saving.role !== "best-sensible-saving" ||
    upgrade.role !== "worthwhile-comfort-upgrade" ||
    result.portfolio.split.role !== "split" ||
    result.portfolio.split.status !== "disabled" ||
    result.portfolio.split.solutionId !== null ||
    result.explanation.roleSeparationExplicit !== true
  ) {
    add("role-separation-invalid", result.caseId, "Choice, Saving, Upgrade and disabled SPLIT must remain independent roles.");
  }

  if (
    result.publicApplicationEnabled !== false ||
    result.runtimeIntegrationEnabled !== false ||
    result.v2PublicChanged !== false ||
    result.splitEnabled !== false ||
    result.legacyBudgetUtilityUsed !== false ||
    result.teacherOutputsUsedAsGroundTruth !== false
  ) {
    add("public-firewall-open", result.caseId, "Offline policy must not alter public V2, runtime, SPLIT or elevate teacher output.");
  }
  if (result.commercialSignalsUsed !== false) {
    add("commercial-firewall-open", result.caseId, "Commercial signals cannot influence policy selection.");
  }
  if (
    /"(commission|markup|affiliateRevenue|clickProbability|providerPriority|userEconomicValue)"\s*:/.test(
      JSON.stringify(result)
    )
  ) {
    add("commercial-firewall-open", result.caseId, "Forbidden commercial fields are present in the result.");
  }

  const roles = [choice, saving, upgrade, result.portfolio.split];
  if (
    result.counts.candidates !== result.candidates.length ||
    result.counts.comparable !== result.candidates.filter(({ status }) => status === "comparable").length ||
    result.counts.dominated !== result.candidates.filter(({ dominatedBySolutionIds }) => dominatedBySolutionIds.length > 0).length ||
    result.counts.missingEvidence !== result.candidates.filter(({ missingDimensions }) => missingDimensions.length > 0).length ||
    result.counts.selectedRoles !== roles.filter(({ status }) => status === "selected").length
  ) {
    add("schema-invalid", result.caseId, "Derived counts do not match the policy result.");
  }

  return { valid: violations.length === 0, violations };
}

export function verifyPersonalUtilityRolePolicyReplayV3(
  input: RunStayOptiPersonalUtilityRolePolicyInputV3,
  expected: StayOptiPersonalUtilityRolePolicyResultV3
): boolean {
  const replay = runPersonalUtilityRolePolicyV3(input);
  return (
    replay.inputFingerprint === expected.inputFingerprint &&
    replay.policyVersion === expected.policyVersion &&
    replay.policyConfigurationFingerprint === expected.policyConfigurationFingerprint &&
    replay.fingerprint === expected.fingerprint
  );
}

export function assertPersonalUtilityRolePolicyV3(
  result: StayOptiPersonalUtilityRolePolicyResultV3
): void {
  const validation = validatePersonalUtilityRolePolicyV3(result);
  if (!validation.valid) {
    throw new Error(
      `StayOpti Personal Utility Role Policy V3 invalid: ${validation.violations
        .map(({ code, entityId }) => `${code}:${entityId}`)
        .join(", ")}`
    );
  }
}

export const STAYOPTI_PERSONAL_UTILITY_ROLE_POLICY_AUDIT_V3 = Object.freeze({
  application: "offline-policy-candidate-only" as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  runtimeIntegrationEnabled: false as const,
  splitEnabled: false as const,
  legacyBudgetUtilityUsed: false as const,
  rankingWeightsChangedInPublicRuntime: false as const,
  teacherOutputsUsedAsGroundTruth: false as const,
  commercialSignalsUsed: false as const,
  providerCallsAllowed: false as const,
  bookingOrPaymentChanged: false as const,
  analyticsChanged: false as const,
});
