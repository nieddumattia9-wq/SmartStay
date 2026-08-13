import {
  assertCommercialFirewallV3,
} from "./commercialFirewallV3";

import {
  isSmartStayReasonCodeV3,
  type SmartStayReasonCodeV3,
} from "./reasonCodesV3";

import {
  isStableHashV3,
} from "./stableHashV3";

import {
  validateStaySolutionV3,
  type StaySolutionV3,
} from "./staySolutionV3";

import {
  SMARTSTAY_DECISION_SCHEMA_VERSION_V3,
  SMARTSTAY_ENGINE_VERSION_V3,
  SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3,
  SMARTSTAY_POLICY_VERSION_V3,
  SMARTSTAY_V2_ADAPTER_VERSION_V3,
  type SmartStayDecisionSchemaVersionV3,
  type SmartStayEngineVersionV3,
  type SmartStayEvidenceSchemaVersionV3,
  type SmartStayPolicyVersionV3,
  type SmartStayV2AdapterVersionV3,
} from "./versionsV3";

export type StayOptiDecisionModeV3 =
  | "compatibility-v2"
  | "native-v3";

export type StayOptiDecisionStatusV3 =
  | "recommended"
  | "abstained"
  | "no-feasible-solution";

export type StayOptiDecisionRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "split-saver";

export interface StayOptiDecisionContextV3 {
  checkIn:
    string |
    null;

  checkOut:
    string |
    null;

  nights:
    number |
    null;

  adults:
    number |
    null;

  children:
    number |
    null;

  rooms:
    number |
    null;

  totalBudget:
    number |
    null;

  maximumDistanceKm:
    number |
    null;

  currency:
    string |
    null;

  preferenceId:
    string;

  preferenceSource:
    string;
}

export interface StayOptiDecisionCoverageV3 {
  analyzedHotelCount:
    number;

  mappedSolutionCount:
    number;

  eligibleHotelCount:
    number;

  evidenceFactCount:
    number;

  scopeLabel:
    "current-search-result-set";
}

export interface StayOptiDecisionCandidateV3 {
  solutionId:
    string;

  role:
    StayOptiDecisionRoleV3;

  eligible:
    boolean;

  utilityScore:
    number |
    null;

  scoreConfidence:
    number;

  evidenceCoverage:
    number;

  riskScore:
    number;

  riskLevel:
    "low" |
    "medium" |
    "high";

  paretoStatus:
    "frontier" |
    "dominated" |
    "unknown";

  rank:
    number |
    null;

  reasonCodes:
    SmartStayReasonCodeV3[];

  sourceReasonCodes:
    string[];

  evidenceIds:
    string[];
}

export interface StayOptiTemporalOptimizationV3 {
  status:
    | "not-evaluated"
    | "no-valuable-split"
    | "split-recommended";

  maximumTransitions:
    1;

  splitSolutionId:
    string |
    null;

  grossSavingAmount:
    number |
    null;

  grossSavingRatio:
    number |
    null;

  switchingCost:
    number |
    null;

  addedRisk:
    number |
    null;

  friction:
    number |
    null;

  netValue:
    number |
    null;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiDecisionThesisV3 {
  titleKey:
    string;

  recommendedSolutionId:
    string |
    null;

  bestAlternativeSolutionId:
    string |
    null;

  primaryEvidenceIds:
    string[];

  tradeOffEvidenceIds:
    string[];

  sourceReasonCodes:
    string[];

  exactSwitchThresholdAvailable:
    boolean;
}

export interface StayOptiDecisionTraceV3 {
  internalOnly:
    true;

  commerciallyNeutral:
    true;

  sourceEngineVersion:
    string;

  sourcePipelineVersion:
    string;

  candidateHotelIds:
    string[];

  roleAssignments:
    Array<{
      solutionId:
        string;

      role:
        StayOptiDecisionRoleV3;

      sourceReasonCodes:
        string[];
    }>;
}

export interface StayOptiDecisionReplayV3 {
  inputFingerprint:
    string;

  decisionFingerprint:
    string;
}

export interface StayOptiDecisionV3 {
  schemaVersion:
    SmartStayDecisionSchemaVersionV3;

  engineVersion:
    SmartStayEngineVersionV3;

  policyVersion:
    SmartStayPolicyVersionV3;

  evidenceSchemaVersion:
    SmartStayEvidenceSchemaVersionV3;

  adapterVersion:
    SmartStayV2AdapterVersionV3;

  configHash:
    string;

  mode:
    StayOptiDecisionModeV3;

  status:
    StayOptiDecisionStatusV3;

  context:
    StayOptiDecisionContextV3;

  coverage:
    StayOptiDecisionCoverageV3;

  solutions:
    StaySolutionV3[];

  candidates:
    StayOptiDecisionCandidateV3[];

  recommendedSolutionId:
    string |
    null;

  bestAlternativeSolutionId:
    string |
    null;

  temporalOptimization:
    StayOptiTemporalOptimizationV3;

  robustness: {
    status:
      "not-evaluated";

    robustChoiceScore:
      null;

    expectedRegret:
      null;

    reasonCodes:
      SmartStayReasonCodeV3[];
  };

  outcomeLearning: {
    status:
      "not-instrumented";

    reasonCodes:
      SmartStayReasonCodeV3[];
  };

  counterfactuals: {
    comparisonCount:
      number;

    exactThresholdsAvailable:
      boolean;

    reasonCodes:
      SmartStayReasonCodeV3[];
  };

  thesis:
    StayOptiDecisionThesisV3;

  replay:
    StayOptiDecisionReplayV3;

  reasonCodes:
    SmartStayReasonCodeV3[];

  internalTrace:
    StayOptiDecisionTraceV3;
}

export type StayOptiDecisionValidationIssueCodeV3 =
  | "decision-version-mismatch"
  | "decision-hash-invalid"
  | "decision-solution-invalid"
  | "decision-solution-id-duplicate"
  | "decision-candidate-solution-missing"
  | "decision-recommended-solution-invalid"
  | "decision-best-alternative-invalid"
  | "decision-temporal-solution-invalid"
  | "decision-reason-code-invalid"
  | "decision-commercial-firewall-failed";

export interface StayOptiDecisionValidationIssueV3 {
  code:
    StayOptiDecisionValidationIssueCodeV3;

  path:
    string;

  message:
    string;
}

export interface StayOptiDecisionValidationV3 {
  valid:
    boolean;

  issues:
    StayOptiDecisionValidationIssueV3[];
}

function addIssue(
  issues:
    StayOptiDecisionValidationIssueV3[],
  code:
    StayOptiDecisionValidationIssueCodeV3,
  path:
    string,
  message:
    string
) {
  issues.push({
    code,
    path,
    message,
  });
}

function validateReasonCodes(
  values:
    readonly string[],
  path:
    string,
  issues:
    StayOptiDecisionValidationIssueV3[]
) {
  for (
    const value
    of values
  ) {
    if (
      !isSmartStayReasonCodeV3(
        value
      )
    ) {
      addIssue(
        issues,
        "decision-reason-code-invalid",
        path,
        `Unknown V3 reason code: ${value}.`
      );
    }
  }
}

export function validateStayOptiDecisionV3(
  decision:
    StayOptiDecisionV3
): StayOptiDecisionValidationV3 {
  const issues:
    StayOptiDecisionValidationIssueV3[] =
      [];

  if (
    decision.schemaVersion !==
      SMARTSTAY_DECISION_SCHEMA_VERSION_V3 ||
    decision.engineVersion !==
      SMARTSTAY_ENGINE_VERSION_V3 ||
    decision.policyVersion !==
      SMARTSTAY_POLICY_VERSION_V3 ||
    decision.evidenceSchemaVersion !==
      SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3 ||
    decision.adapterVersion !==
      SMARTSTAY_V2_ADAPTER_VERSION_V3
  ) {
    addIssue(
      issues,
      "decision-version-mismatch",
      "versions",
      "Decision versions do not match the frozen V3-01 contract."
    );
  }

  if (
    !isStableHashV3(
      decision.configHash
    ) ||
    !isStableHashV3(
      decision.replay
        .inputFingerprint
    ) ||
    !isStableHashV3(
      decision.replay
        .decisionFingerprint
    )
  ) {
    addIssue(
      issues,
      "decision-hash-invalid",
      "configHash/replay",
      "Config, input and decision fingerprints must use the stable V3 hash format."
    );
  }

  const solutionIds =
    new Set<string>();

  const solutionById =
    new Map<
      string,
      StaySolutionV3
    >();

  decision.solutions.forEach(
    (
      solution,
      index
    ) => {
      const validation =
        validateStaySolutionV3(
          solution
        );

      if (
        !validation.valid
      ) {
        addIssue(
          issues,
          "decision-solution-invalid",
          `solutions.${index}`,
          validation.issues
            .map(
              (issue) =>
                issue.code
            )
            .join(
              ", "
            )
        );
      }

      if (
        solutionIds.has(
          solution.solutionId
        )
      ) {
        addIssue(
          issues,
          "decision-solution-id-duplicate",
          `solutions.${index}.solutionId`,
          "Decision solution IDs must be unique."
        );
      }

      solutionIds.add(
        solution.solutionId
      );

      solutionById.set(
        solution.solutionId,
        solution
      );
    }
  );

  decision.candidates.forEach(
    (
      candidate,
      index
    ) => {
      if (
        !solutionIds.has(
          candidate.solutionId
        )
      ) {
        addIssue(
          issues,
          "decision-candidate-solution-missing",
          `candidates.${index}.solutionId`,
          "Every candidate must reference a decision solution."
        );
      }

      validateReasonCodes(
        candidate.reasonCodes,
        `candidates.${index}.reasonCodes`,
        issues
      );
    }
  );

  const hasRecommendedSolution =
    decision.recommendedSolutionId !==
      null &&
    solutionIds.has(
      decision.recommendedSolutionId
    );

  if (
    (
      decision.status ===
        "recommended" &&
      !hasRecommendedSolution
    ) ||
    (
      decision.status !==
        "recommended" &&
      decision.recommendedSolutionId !==
        null
    )
  ) {
    addIssue(
      issues,
      "decision-recommended-solution-invalid",
      "recommendedSolutionId",
      "Recommendation status and recommendedSolutionId are inconsistent."
    );
  }

  if (
    decision.bestAlternativeSolutionId !==
      null &&
    (
      !solutionIds.has(
        decision.bestAlternativeSolutionId
      ) ||
      decision.bestAlternativeSolutionId ===
        decision.recommendedSolutionId
    )
  ) {
    addIssue(
      issues,
      "decision-best-alternative-invalid",
      "bestAlternativeSolutionId",
      "Best alternative must be a different existing solution."
    );
  }

  if (
    decision.temporalOptimization.status ===
      "split-recommended"
  ) {
    const splitSolution =
      decision.temporalOptimization
        .splitSolutionId ===
        null
        ? null
        : solutionById.get(
            decision.temporalOptimization
              .splitSolutionId
          ) ??
          null;

    if (
      splitSolution?.kind !==
        "split"
    ) {
      addIssue(
        issues,
        "decision-temporal-solution-invalid",
        "temporalOptimization.splitSolutionId",
        "A split recommendation must reference a valid split solution."
      );
    }
  }

  validateReasonCodes(
    decision.reasonCodes,
    "reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.temporalOptimization
      .reasonCodes,
    "temporalOptimization.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.robustness
      .reasonCodes,
    "robustness.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.outcomeLearning
      .reasonCodes,
    "outcomeLearning.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.counterfactuals
      .reasonCodes,
    "counterfactuals.reasonCodes",
    issues
  );

  try {
    assertCommercialFirewallV3(
      decision
    );
  }
  catch (
    error
  ) {
    addIssue(
      issues,
      "decision-commercial-firewall-failed",
      "decision",
      error instanceof Error
        ? error.message
        : String(
            error
          )
    );
  }

  return {
    valid:
      issues.length ===
      0,

    issues:
      issues.sort(
        (
          first,
          second
        ) =>
          first.path.localeCompare(
            second.path
          ) ||
          first.code.localeCompare(
            second.code
          )
      ),
  };
}

export function assertStayOptiDecisionV3(
  decision:
    StayOptiDecisionV3
) {
  const validation =
    validateStayOptiDecisionV3(
      decision
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Invalid StayOptiDecisionV3: ${validation.issues.map((issue) => issue.code).join(", ")}.`
    );
  }

  return decision;
}
