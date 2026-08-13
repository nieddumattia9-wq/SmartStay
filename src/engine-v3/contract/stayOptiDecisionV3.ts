import {
  assertCommercialFirewallV3,
} from "./commercialFirewallV3";

import {
  isSmartStayReasonCodeV3,
  type SmartStayReasonCodeV3,
} from "./reasonCodesV3";

import {
  isStableHashV3,
  stableSerializeV3,
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

import {
  createStayIntegrityCoverageReportV3,
  type StayIntegrityCoverageReportV3,
} from "../integrity/integrityCoverageV3";

import {
  validateStayOfferIntegritySnapshotV3,
  type StayOfferIntegritySnapshotV3,
} from "../integrity/stayOfferIntegrityV3";

import {
  isStayOptiPreferenceIdV3,
  validatePersonalUtilityEvaluationV3,
  type StayOptiPersonalUtilityEvaluationV3,
  type StayOptiPreferenceResolutionV3,
} from "../utility/personalUtilityV3";

import {
  validatePeerAssignmentV3,
  type StayOptiPeerAssignmentV3,
} from "../peer/peerIntelligenceV3";

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

  offerSnapshotIds:
    string[];

  utilityEvaluationIds:
    string[];

  peerAssignmentIds:
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

export interface StayOptiDecisionIntegrityV3 {
  phase:
    "v3-02";

  offerSnapshots:
    StayOfferIntegritySnapshotV3[];

  coverage:
    StayIntegrityCoverageReportV3;

  recheckPolicy: {
    requiredBeforeHandoff:
      true;

    materialChangeRequiresUserConfirmation:
      true;

    materialChangeRequiresDecisionReplay:
      true;
  };

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface StayOptiDecisionPersonalizationV3 {
  phase:
    "v3-03";

  rankingApplication:
    "shadow-only";

  preference:
    StayOptiPreferenceResolutionV3;

  utilityEvaluations:
    StayOptiPersonalUtilityEvaluationV3[];

  peerAssignments:
    StayOptiPeerAssignmentV3[];

  reasonCodes:
    SmartStayReasonCodeV3[];
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

  integrity:
    StayOptiDecisionIntegrityV3;

  personalization:
    StayOptiDecisionPersonalizationV3;

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
  | "decision-integrity-snapshot-invalid"
  | "decision-integrity-snapshot-id-duplicate"
  | "decision-integrity-segment-snapshot-missing"
  | "decision-integrity-coverage-mismatch"
  | "decision-integrity-promotion-unsafe"
  | "decision-personalization-preference-invalid"
  | "decision-personalization-utility-invalid"
  | "decision-personalization-peer-invalid"
  | "decision-personalization-hotel-duplicate"
  | "decision-personalization-coverage-mismatch"
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
      "Decision versions do not match the frozen V3-03 contract."
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

  const snapshotIds =
    new Set<string>();

  const snapshotOfferKeys =
    new Set<string>();

  decision.integrity
    .offerSnapshots.forEach(
      (
        snapshot,
        index
      ) => {
        const validation =
          validateStayOfferIntegritySnapshotV3(
            snapshot
          );

        if (
          !validation.valid
        ) {
          addIssue(
            issues,
            "decision-integrity-snapshot-invalid",
            `integrity.offerSnapshots.${index}`,
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
          snapshotIds.has(
            snapshot.snapshotId
          )
        ) {
          addIssue(
            issues,
            "decision-integrity-snapshot-id-duplicate",
            `integrity.offerSnapshots.${index}.snapshotId`,
            "Offer integrity snapshot IDs must be unique."
          );
        }

        snapshotIds.add(
          snapshot.snapshotId
        );

        snapshotOfferKeys.add(
          `${snapshot.hotelId}\u0000${snapshot.offerId}`
        );
      }
    );

  const expectedIntegrityCoverage =
    createStayIntegrityCoverageReportV3({
      analyzedHotelCount:
        decision.coverage
          .analyzedHotelCount,
      snapshots:
        decision.integrity
          .offerSnapshots,
      publicRatesConsistency:
        decision.integrity
          .coverage
          .publicRatesConsistency,
    });

  if (
    stableSerializeV3(
      expectedIntegrityCoverage
    ) !==
      stableSerializeV3(
        decision.integrity
          .coverage
      )
  ) {
    addIssue(
      issues,
      "decision-integrity-coverage-mismatch",
      "integrity.coverage",
      "Integrity coverage must be reproducible from the attached offer snapshots."
    );
  }

  if (
    decision.mode ===
      "compatibility-v2" &&
    (
      decision.integrity
        .coverage
        .publicRatesConsistency !==
        "unverified" ||
      decision.integrity
        .coverage
        .publicV3Promotion !==
        "blocked" ||
      decision.integrity
        .coverage
        .publicSplitPromotion !==
        "blocked"
    )
  ) {
    addIssue(
      issues,
      "decision-integrity-promotion-unsafe",
      "integrity.coverage",
      "The V2 compatibility adapter cannot certify public-rate consistency or public V3/Split promotion."
    );
  }

  const preference =
    decision.personalization
      .preference;

  const validPreferenceShape =
    decision.personalization
      .phase ===
      "v3-03" &&
    decision.personalization
      .rankingApplication ===
      "shadow-only" &&
    isStayOptiPreferenceIdV3(
      preference
        .resolvedPreferenceId
    ) &&
    decision.context
      .preferenceId ===
      preference
        .resolvedPreferenceId &&
    (
      preference.origin ===
        "declared"
        ? preference
            .declaredPreferenceId !==
            null &&
          preference
            .inferredPreferenceId ===
            null &&
          preference
            .resolvedPreferenceId ===
            preference
              .declaredPreferenceId
        : preference.origin ===
            "inferred"
          ? preference
              .declaredPreferenceId ===
              null &&
            preference
              .inferredPreferenceId !==
              null &&
            preference
              .resolvedPreferenceId ===
              preference
                .inferredPreferenceId
          : preference.origin ===
              "neutral-default" &&
            preference
              .declaredPreferenceId ===
              null &&
            preference
              .inferredPreferenceId ===
              null &&
            preference
              .resolvedPreferenceId ===
              "balanced"
    );

  if (
    !validPreferenceShape
  ) {
    addIssue(
      issues,
      "decision-personalization-preference-invalid",
      "personalization.preference",
      "Declared, inferred and neutral preference states must remain separate and internally consistent."
    );
  }

  const utilityHotelIds =
    new Set<string>();

  const utilityEvaluationIds =
    new Set<string>();

  decision.personalization
    .utilityEvaluations
    .forEach(
      (
        evaluation,
        index
      ) => {
        if (
          !validatePersonalUtilityEvaluationV3(
            evaluation
          ).valid ||
          stableSerializeV3(
            evaluation.preference
          ) !==
            stableSerializeV3(
              preference
            )
        ) {
          addIssue(
            issues,
            "decision-personalization-utility-invalid",
            `personalization.utilityEvaluations.${index}`,
            "Personal utility evaluation is invalid or uses a different preference resolution."
          );
        }

        if (
          utilityHotelIds.has(
            evaluation.hotelId
          ) ||
          utilityEvaluationIds.has(
            evaluation.evaluationId
          )
        ) {
          addIssue(
            issues,
            "decision-personalization-hotel-duplicate",
            `personalization.utilityEvaluations.${index}`,
            "Personal utility evaluations require unique hotel and evaluation IDs."
          );
        }

        utilityHotelIds.add(
          evaluation.hotelId
        );

        utilityEvaluationIds.add(
          evaluation.evaluationId
        );
      }
    );

  const peerHotelIds =
    new Set<string>();

  const peerAssignmentIds =
    new Set<string>();

  decision.personalization
    .peerAssignments
    .forEach(
      (
        assignment,
        index
      ) => {
        if (
          !validatePeerAssignmentV3(
            assignment
          ).valid
        ) {
          addIssue(
            issues,
            "decision-personalization-peer-invalid",
            `personalization.peerAssignments.${index}`,
            "Peer assignment is invalid or permits an undeclared incompatible comparison."
          );
        }

        if (
          peerHotelIds.has(
            assignment.hotelId
          ) ||
          peerAssignmentIds.has(
            assignment.assignmentId
          )
        ) {
          addIssue(
            issues,
            "decision-personalization-hotel-duplicate",
            `personalization.peerAssignments.${index}`,
            "Peer assignments require unique hotel and assignment IDs."
          );
        }

        peerHotelIds.add(
          assignment.hotelId
        );

        peerAssignmentIds.add(
          assignment.assignmentId
        );
      }
    );

  const expectedPersonalizationHotelIds =
    decision.internalTrace
      .candidateHotelIds
      .slice()
      .sort();

  if (
    stableSerializeV3(
      [
        ...utilityHotelIds,
      ].sort()
    ) !==
      stableSerializeV3(
        expectedPersonalizationHotelIds
      ) ||
    stableSerializeV3(
      [
        ...peerHotelIds,
      ].sort()
    ) !==
      stableSerializeV3(
        expectedPersonalizationHotelIds
      )
  ) {
    addIssue(
      issues,
      "decision-personalization-coverage-mismatch",
      "personalization",
      "Utility and peer intelligence must cover every analyzed hotel exactly once."
    );
  }

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

      for (
        const segment
        of solution.segments
      ) {
        if (
          segment.offerId ===
            null ||
          !snapshotOfferKeys.has(
            `${segment.hotelId}\u0000${segment.offerId}`
          )
        ) {
          addIssue(
            issues,
            "decision-integrity-segment-snapshot-missing",
            `solutions.${index}.segments.${segment.ordinal}`,
            "Every decision segment must reference a canonical offer integrity snapshot."
          );
        }
      }
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

  validateReasonCodes(
    decision.integrity
      .reasonCodes,
    "integrity.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.integrity
      .coverage
      .reasonCodes,
    "integrity.coverage.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.personalization
      .reasonCodes,
    "personalization.reasonCodes",
    issues
  );

  const expectedTraceSnapshotIds = [
    ...snapshotIds,
  ].sort();

  if (
    stableSerializeV3(
      expectedTraceSnapshotIds
    ) !==
      stableSerializeV3(
        decision.internalTrace
          .offerSnapshotIds
      )
  ) {
    addIssue(
      issues,
      "decision-integrity-coverage-mismatch",
      "internalTrace.offerSnapshotIds",
      "Internal trace must reference every offer integrity snapshot exactly once."
    );
  }

  if (
    stableSerializeV3(
      [
        ...utilityEvaluationIds,
      ].sort()
    ) !==
      stableSerializeV3(
        decision.internalTrace
          .utilityEvaluationIds
      ) ||
    stableSerializeV3(
      [
        ...peerAssignmentIds,
      ].sort()
    ) !==
      stableSerializeV3(
        decision.internalTrace
          .peerAssignmentIds
      )
  ) {
    addIssue(
      issues,
      "decision-personalization-coverage-mismatch",
      "internalTrace.utilityEvaluationIds/peerAssignmentIds",
      "Internal trace must reference every V3 utility evaluation and peer assignment exactly once."
    );
  }

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
