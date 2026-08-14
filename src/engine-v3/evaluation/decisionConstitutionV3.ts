export type StayOptiConstitutionProfileV3 =
  | "maximum-comfort"
  | "comfort"
  | "balanced"
  | "savings"
  | "maximum-savings";

export type StayOptiConstitutionRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "split-saver"
  | "abstention-near-tie";

export type StayOptiDiagnosticEngineV3 =
  | "v2"
  | "v3";

export type StayOptiInvariantViolationCodeV3 =
  | "budget-expansion-quality-regression"
  | "commercial-signal-present"
  | "dominated-best-choice"
  | "missing-evidence-penalized"
  | "profile-objective-incoherent"
  | "role-comparison-mismatch";

export interface StayOptiDiagnosticJudgmentV3 {
  diagnosticId:
    string;

  sourceCaseFingerprint:
    string;

  sourceBatch:
    "v3-10c-pilot" |
    "v3-10f-batch";

  profile:
    StayOptiConstitutionProfileV3;

  comparedRole:
    "best-choice";

  selectionAgreement:
    boolean;

  outcome:
    "tie-identical-selection" |
    "human-preference";

  preferredEngine:
    StayOptiDiagnosticEngineV3 |
    null;

  candidateGroundTruth:
    false;

  diagnosticOnly:
    true;
}

export interface StayOptiDiagnosticJudgmentSummaryV3 {
  total:
    number;

  v2Wins:
    number;

  v3Wins:
    number;

  ties:
    number;

  divergentComfortFirstCases:
    number;

  v2WinsInDivergentComfortFirstCases:
    number;
}

export interface StayOptiBudgetExpansionInvariantInputV3 {
  profile:
    StayOptiConstitutionProfileV3;

  previousBudget:
    number;

  expandedBudget:
    number;

  previousExperienceOrder:
    number;

  expandedExperienceOrder:
    number;

  expandedChoiceIsCheaper:
    boolean;

  materialNonPriceGain:
    boolean;
}

export interface StayOptiRoleComparisonInvariantInputV3 {
  evaluationQuestionRole:
    StayOptiConstitutionRoleV3;

  leftRole:
    StayOptiConstitutionRoleV3;

  rightRole:
    StayOptiConstitutionRoleV3;

  labelsHidden:
    boolean;
}

export interface StayOptiProfileCoherenceInvariantInputV3 {
  profile:
    StayOptiConstitutionProfileV3;

  selectedExperienceOrder:
    number;

  alternativeExperienceOrder:
    number;

  selectedCost:
    number;

  alternativeCost:
    number;

  decisiveReasonCodes:
    readonly string[];

  selectedIsDominated:
    boolean;

  missingEvidencePenalized:
    boolean;

  commercialSignalPresent:
    boolean;
}

export interface StayOptiInvariantResultV3 {
  pass:
    boolean;

  violations:
    StayOptiInvariantViolationCodeV3[];
}

export const STAYOPTI_DECISION_CONSTITUTION_VERSION_V3 =
  "3.0.0-decision-constitution.1" as const;

export const STAYOPTI_DIAGNOSTIC_JUDGMENT_SCHEMA_VERSION_V3 =
  "3.0.0-diagnostic-judgment.1" as const;

export const STAYOPTI_ROLE_AWARE_BLIND_PROTOCOL_VERSION_V3 =
  "3.0.0-role-aware-blind-review.1" as const;

export const STAYOPTI_DECISION_CONSTITUTION_V3 = {
  version:
    STAYOPTI_DECISION_CONSTITUTION_VERSION_V3,

  status:
    "diagnostic-freeze",

  northStar:
    "post-stay-same-choice-probability",

  evaluatedUnit:
    "stay-solution",

  objectiveOrder: [
    "hard-constraint-and-offer-integrity",
    "intent-and-preference-resolution",
    "profile-coherent-experience",
    "opportunity-cost-and-marginal-value",
    "role-aware-portfolio",
    "risk-robustness-and-confidence",
    "abstention-when-evidence-is-insufficient",
  ],

  publicRuntimeFreeze: {
    authoritativeEngine:
      "v2",
    v3AllowedModes: [
      "off",
      "shadow",
    ],
    splitEnabled:
      false,
    automaticPromotionAllowed:
      false,
  },

  profiles: {
    "maximum-comfort": {
      primaryObjective:
        "maximize-profile-coherent-experience-within-budget",
      budgetSemantics:
        "hard-ceiling-and-light-tiebreaker",
      unspentBudgetIsIntrinsicBenefit:
        false,
    },
    comfort: {
      primaryObjective:
        "prioritize-comfort-location-room-and-quality-within-budget",
      budgetSemantics:
        "ceiling-with-calibrated-opportunity-cost",
      unspentBudgetIsIntrinsicBenefit:
        false,
    },
    balanced: {
      primaryObjective:
        "optimize-overall-trade-off-and-marginal-value",
      budgetSemantics:
        "constraint-and-material-trade-off-signal",
      unspentBudgetIsIntrinsicBenefit:
        false,
    },
    savings: {
      primaryObjective:
        "reduce-cost-above-an-explicit-experience-floor",
      budgetSemantics:
        "cost-priority-after-quality-floor",
      unspentBudgetIsIntrinsicBenefit:
        true,
    },
    "maximum-savings": {
      primaryObjective:
        "minimize-cost-after-hard-constraints-and-minimum-floor",
      budgetSemantics:
        "strong-cost-priority",
      unspentBudgetIsIntrinsicBenefit:
        true,
    },
  },

  roles: {
    "best-choice":
      "best-profile-coherent-experience-within-budget-and-constraints",
    "best-sensible-saving":
      "largest-saving-with-explicitly-acceptable-experience-loss",
    "worthwhile-comfort-upgrade":
      "material-experience-gain-that-justifies-extra-cost",
    "split-saver":
      "verified-multi-stay-with-material-net-value-after-friction-and-risk",
    "abstention-near-tie":
      "no-forced-recommendation-when-evidence-or-separation-is-insufficient",
  },

  commercialFirewall: [
    "commission",
    "markup",
    "provider-priority",
    "revenue",
    "click-probability-as-ranking-objective",
    "user-commercial-value",
  ],

  permanentInvariants: [
    "budget-expansion-monotonicity-for-comfort-first",
    "free-material-improvement-cannot-worsen-choice",
    "dominated-solution-cannot-be-best-choice",
    "saving-cannot-replace-choice-without-negligible-loss-proof",
    "profiles-may-produce-different-decisions-on-same-set",
    "missing-evidence-cannot-become-invented-penalty",
    "roles-must-be-compared-like-for-like",
  ],
} as const;

const COMFORT_FIRST_PROFILES:
  readonly StayOptiConstitutionProfileV3[] = [
    "maximum-comfort",
    "comfort",
  ];

function sortedUniqueViolations(
  violations:
    readonly StayOptiInvariantViolationCodeV3[]
) {
  return [
    ...new Set(
      violations
    ),
  ].sort();
}

function createInvariantResult(
  violations:
    readonly StayOptiInvariantViolationCodeV3[]
): StayOptiInvariantResultV3 {
  const normalized =
    sortedUniqueViolations(
      violations
    );

  return {
    pass:
      normalized.length ===
        0,
    violations:
      normalized,
  };
}

export function evaluateBudgetExpansionInvariantV3(
  input:
    StayOptiBudgetExpansionInvariantInputV3
): StayOptiInvariantResultV3 {
  if (
    !Number.isFinite(
      input.previousBudget
    ) ||
    !Number.isFinite(
      input.expandedBudget
    ) ||
    input.previousBudget <=
      0 ||
    input.expandedBudget <=
      input.previousBudget
  ) {
    throw new Error(
      "Budget expansion requires a positive original budget and a strictly larger expanded budget."
    );
  }

  const violations:
    StayOptiInvariantViolationCodeV3[] = [];

  if (
    COMFORT_FIRST_PROFILES.includes(
      input.profile
    ) &&
    input.expandedExperienceOrder <
      input.previousExperienceOrder &&
    input.expandedChoiceIsCheaper &&
    !input.materialNonPriceGain
  ) {
    violations.push(
      "budget-expansion-quality-regression"
    );
  }

  return createInvariantResult(
    violations
  );
}

export function evaluateRoleComparisonInvariantV3(
  input:
    StayOptiRoleComparisonInvariantInputV3
): StayOptiInvariantResultV3 {
  const violations:
    StayOptiInvariantViolationCodeV3[] = [];

  if (
    input.leftRole !==
      input.evaluationQuestionRole ||
    input.rightRole !==
      input.evaluationQuestionRole ||
    !input.labelsHidden
  ) {
    violations.push(
      "role-comparison-mismatch"
    );
  }

  return createInvariantResult(
    violations
  );
}

export function evaluateProfileCoherenceInvariantV3(
  input:
    StayOptiProfileCoherenceInvariantInputV3
): StayOptiInvariantResultV3 {
  const violations:
    StayOptiInvariantViolationCodeV3[] = [];

  if (
    input.selectedIsDominated
  ) {
    violations.push(
      "dominated-best-choice"
    );
  }

  if (
    input.missingEvidencePenalized
  ) {
    violations.push(
      "missing-evidence-penalized"
    );
  }

  if (
    input.commercialSignalPresent
  ) {
    violations.push(
      "commercial-signal-present"
    );
  }

  const cheaperButWorse =
    input.selectedCost <
      input.alternativeCost &&
    input.selectedExperienceOrder <
      input.alternativeExperienceOrder;

  const unspentBudgetDecisive =
    input.decisiveReasonCodes.includes(
      "utility:unspent-budget-reward"
    );

  if (
    COMFORT_FIRST_PROFILES.includes(
      input.profile
    ) &&
    cheaperButWorse &&
    unspentBudgetDecisive
  ) {
    violations.push(
      "profile-objective-incoherent"
    );
  }

  return createInvariantResult(
    violations
  );
}

export function summarizeDiagnosticJudgmentsV3(
  judgments:
    readonly StayOptiDiagnosticJudgmentV3[]
): StayOptiDiagnosticJudgmentSummaryV3 {
  const divergentComfortFirst =
    judgments.filter(
      (judgment) =>
        !judgment.selectionAgreement &&
        COMFORT_FIRST_PROFILES.includes(
          judgment.profile
        )
    );

  return {
    total:
      judgments.length,
    v2Wins:
      judgments.filter(
        (judgment) =>
          judgment.preferredEngine ===
            "v2"
      ).length,
    v3Wins:
      judgments.filter(
        (judgment) =>
          judgment.preferredEngine ===
            "v3"
      ).length,
    ties:
      judgments.filter(
        (judgment) =>
          judgment.outcome ===
            "tie-identical-selection"
      ).length,
    divergentComfortFirstCases:
      divergentComfortFirst.length,
    v2WinsInDivergentComfortFirstCases:
      divergentComfortFirst.filter(
        (judgment) =>
          judgment.preferredEngine ===
            "v2"
      ).length,
  };
}
