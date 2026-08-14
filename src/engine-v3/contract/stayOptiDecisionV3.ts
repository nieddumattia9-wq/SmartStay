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

import {
  validateDecisionGeometryV3,
  type StayOptiDecisionGeometryV3,
} from "../geometry/decisionGeometryV3";

import {
  validateDecisionRobustnessV3,
  type StayOptiDecisionRobustnessV3,
} from "../robustness/decisionRobustnessV3";

import {
  validateContextualStayValueV3,
  type StayOptiContextualStayValueEvaluationV3,
} from "../contextual/contextualStayValueV3";

import {
  validateDecisionExplanationV3,
  type StayOptiDecisionExplanationV3,
} from "../explanation/decisionExplanationV3";

import {
  validateSearchWideScaleCoverageV3,
  type StayOptiSearchWideScaleCoverageV3,
} from "../scale/searchWideScaleCoverageV3";

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

export type StayOptiDecisionThesisV3 =
  StayOptiDecisionExplanationV3;

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

  decisionGeometryEvaluationId:
    string;

  decisionRobustnessEvaluationId:
    string;

  contextualStayValueEvaluationId:
    string;

  decisionExplanationEvaluationId:
    string;

  searchWideScaleCoverageEvaluationId:
    string;

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

  decisionGeometry:
    StayOptiDecisionGeometryV3;

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

  robustness:
    StayOptiDecisionRobustnessV3;

  contextualStayValue:
    StayOptiContextualStayValueEvaluationV3;

  searchWideScaleCoverage:
    StayOptiSearchWideScaleCoverageV3;

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
  | "decision-geometry-invalid"
  | "decision-geometry-coverage-mismatch"
  | "decision-geometry-trace-mismatch"
  | "decision-robustness-invalid"
  | "decision-robustness-coverage-mismatch"
  | "decision-robustness-trace-mismatch"
  | "decision-contextual-invalid"
  | "decision-contextual-coverage-mismatch"
  | "decision-contextual-trace-mismatch"
  | "decision-explanation-invalid"
  | "decision-explanation-solution-mismatch"
  | "decision-explanation-source-mismatch"
  | "decision-explanation-trace-mismatch"
  | "decision-scale-coverage-invalid"
  | "decision-scale-coverage-candidate-mismatch"
  | "decision-scale-coverage-trace-mismatch"
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
      "Decision versions do not match the frozen V3-08 contract."
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

  if (
    decision.decisionGeometry.phase !==
      "v3-04" ||
    decision.decisionGeometry
      .rankingApplication !==
      "shadow-only" ||
    !validateDecisionGeometryV3(
      decision.decisionGeometry
    ).valid
  ) {
    addIssue(
      issues,
      "decision-geometry-invalid",
      "decisionGeometry",
      "Decision Geometry must be a valid V3-04 shadow-only evaluation."
    );
  }

  const geometryHotelIds =
    decision.decisionGeometry
      .candidates
      .map(
        (candidate) =>
          candidate.hotelId
      )
      .sort();

  if (
    stableSerializeV3(
      geometryHotelIds
    ) !==
      stableSerializeV3(
        expectedPersonalizationHotelIds
      )
  ) {
    addIssue(
      issues,
      "decision-geometry-coverage-mismatch",
      "decisionGeometry.candidates",
      "Decision Geometry must cover every analyzed hotel exactly once."
    );
  }

  if (
    decision.internalTrace
      .decisionGeometryEvaluationId !==
    decision.decisionGeometry
      .evaluationId
  ) {
    addIssue(
      issues,
      "decision-geometry-trace-mismatch",
      "internalTrace.decisionGeometryEvaluationId",
      "Internal trace must reference the attached Decision Geometry evaluation."
    );
  }

  if (
    decision.robustness.phase !==
      "v3-05" ||
    decision.robustness
      .rankingApplication !==
      "shadow-only" ||
    !validateDecisionRobustnessV3(
      decision.robustness
    ).valid
  ) {
    addIssue(
      issues,
      "decision-robustness-invalid",
      "robustness",
      "Risk, robustness, regret and abstention must be a valid V3-05 shadow-only evaluation."
    );
  }

  const robustnessHotelIds =
    decision.robustness
      .candidates
      .map(
        (candidate) =>
          candidate.hotelId
      )
      .sort();

  if (
    stableSerializeV3(
      robustnessHotelIds
    ) !==
      stableSerializeV3(
        expectedPersonalizationHotelIds
      )
  ) {
    addIssue(
      issues,
      "decision-robustness-coverage-mismatch",
      "robustness.candidates",
      "Decision Robustness must cover every analyzed hotel exactly once."
    );
  }

  if (
    decision.internalTrace
      .decisionRobustnessEvaluationId !==
    decision.robustness
      .evaluationId
  ) {
    addIssue(
      issues,
      "decision-robustness-trace-mismatch",
      "internalTrace.decisionRobustnessEvaluationId",
      "Internal trace must reference the attached V3-05 robustness evaluation."
    );
  }

  if (
    decision.contextualStayValue.phase !==
      "v3-06" ||
    decision.contextualStayValue
      .rankingApplication !==
      "shadow-only" ||
    decision.contextualStayValue
      .publicPresentation !==
      "disabled" ||
    !validateContextualStayValueV3(
      decision.contextualStayValue
    ).valid
  ) {
    addIssue(
      issues,
      "decision-contextual-invalid",
      "contextualStayValue",
      "Location, room, flexibility and friction must be a valid V3-06 shadow-only evaluation."
    );
  }

  const contextualHotelIds =
    decision.contextualStayValue
      .candidates
      .map(
        (candidate) =>
          candidate.hotelId
      )
      .sort();

  if (
    stableSerializeV3(
      contextualHotelIds
    ) !==
      stableSerializeV3(
        expectedPersonalizationHotelIds
      )
  ) {
    addIssue(
      issues,
      "decision-contextual-coverage-mismatch",
      "contextualStayValue.candidates",
      "Contextual Stay Value must cover every analyzed hotel exactly once."
    );
  }

  if (
    decision.internalTrace
      .contextualStayValueEvaluationId !==
    decision.contextualStayValue
      .evaluationId
  ) {
    addIssue(
      issues,
      "decision-contextual-trace-mismatch",
      "internalTrace.contextualStayValueEvaluationId",
      "Internal trace must reference the attached V3-06 contextual evaluation."
    );
  }

  if (
    decision.thesis.phase !==
      "v3-07" ||
    decision.thesis
      .rankingApplication !==
      "shadow-only" ||
    decision.thesis
      .publicPresentation !==
      "disabled" ||
    !validateDecisionExplanationV3(
      decision.thesis
    ).valid
  ) {
    addIssue(
      issues,
      "decision-explanation-invalid",
      "thesis",
      "The six-part Decision Thesis must be a valid V3-07 shadow-only explanation."
    );
  }

  if (
    decision.thesis
      .sourceEvaluationIds
      .decisionGeometryEvaluationId !==
      decision.decisionGeometry
        .evaluationId ||
    decision.thesis
      .sourceEvaluationIds
      .decisionRobustnessEvaluationId !==
      decision.robustness
        .evaluationId ||
    decision.thesis
      .sourceEvaluationIds
      .contextualStayValueEvaluationId !==
      decision.contextualStayValue
        .evaluationId
  ) {
    addIssue(
      issues,
      "decision-explanation-source-mismatch",
      "thesis.sourceEvaluationIds",
      "Decision Thesis source IDs must reference the attached geometry, robustness and contextual evaluations."
    );
  }

  if (
    decision.internalTrace
      .decisionExplanationEvaluationId !==
    decision.thesis
      .evaluationId
  ) {
    addIssue(
      issues,
      "decision-explanation-trace-mismatch",
      "internalTrace.decisionExplanationEvaluationId",
      "Internal trace must reference the attached V3-07 Decision Thesis."
    );
  }

  if (
    decision.searchWideScaleCoverage.phase !==
      "v3-08" ||
    decision.searchWideScaleCoverage
      .rankingApplication !==
      "shadow-only" ||
    decision.searchWideScaleCoverage
      .runtimeApplication !==
      "shadow-plan-only" ||
    decision.searchWideScaleCoverage
      .publicPresentation !==
      "disabled" ||
    !validateSearchWideScaleCoverageV3(
      decision.searchWideScaleCoverage
    ).valid
  ) {
    addIssue(
      issues,
      "decision-scale-coverage-invalid",
      "searchWideScaleCoverage",
      "Search-wide scale, coverage and safe pruning must be a valid V3-08 shadow-only evaluation."
    );
  }

  const scaleCoverageHotelIds =
    decision.searchWideScaleCoverage
      .candidates
      .map(
        (candidate) =>
          candidate.hotelId
      )
      .sort();

  if (
    stableSerializeV3(
      scaleCoverageHotelIds
    ) !==
      stableSerializeV3(
        expectedPersonalizationHotelIds
      ) ||
    decision.searchWideScaleCoverage
      .scope
      .analyzedHotelCount !==
      decision.coverage
        .analyzedHotelCount
  ) {
    addIssue(
      issues,
      "decision-scale-coverage-candidate-mismatch",
      "searchWideScaleCoverage.candidates",
      "V3-08 scale coverage must cover every analyzed hotel exactly once and preserve the decision coverage count."
    );
  }

  if (
    decision.internalTrace
      .searchWideScaleCoverageEvaluationId !==
    decision.searchWideScaleCoverage
      .evaluationId
  ) {
    addIssue(
      issues,
      "decision-scale-coverage-trace-mismatch",
      "internalTrace.searchWideScaleCoverageEvaluationId",
      "Internal trace must reference the attached V3-08 Search-wide Scale & Coverage evaluation."
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

  const explanationSolutionMatches = (
    hotelId:
      string |
      null,
    solutionId:
      string |
      null
  ) =>
    hotelId ===
      null
      ? solutionId ===
          null
      : solutionId !==
          null &&
        (
          solutionById.get(
            solutionId
          )?.segments.some(
            (segment) =>
              segment.hotelId ===
              hotelId
          ) ??
          false
        );

  if (
    !explanationSolutionMatches(
      decision.thesis
        .recommendedHotelId,
      decision.thesis
        .recommendedSolutionId
    ) ||
    !explanationSolutionMatches(
      decision.thesis
        .bestAlternativeHotelId,
      decision.thesis
        .bestAlternativeSolutionId
    )
  ) {
    addIssue(
      issues,
      "decision-explanation-solution-mismatch",
      "thesis.recommendedSolutionId/bestAlternativeSolutionId",
      "Decision Thesis hotel and solution references must resolve to the same attached stay solutions."
    );
  }

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

  decision.robustness
    .candidates
    .forEach(
      (
        candidate,
        index
      ) =>
        validateReasonCodes(
          candidate.reasonCodes,
          `robustness.candidates.${index}.reasonCodes`,
          issues
        )
    );

  decision.robustness
    .scenarios
    .forEach(
      (
        scenario,
        index
      ) =>
        validateReasonCodes(
          scenario.reasonCodes,
          `robustness.scenarios.${index}.reasonCodes`,
          issues
        )
    );

  validateReasonCodes(
    decision.robustness
      .constraintRelaxation
      .reasonCodes,
    "robustness.constraintRelaxation.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.contextualStayValue
      .reasonCodes,
    "contextualStayValue.reasonCodes",
    issues
  );

  decision.contextualStayValue
    .candidates
    .forEach(
      (
        candidate,
        index
      ) => {
        validateReasonCodes(
          candidate.reasonCodes,
          `contextualStayValue.candidates.${index}.reasonCodes`,
          issues
        );
        validateReasonCodes(
          candidate.location.reasonCodes,
          `contextualStayValue.candidates.${index}.location.reasonCodes`,
          issues
        );
        validateReasonCodes(
          candidate.roomUpgrade.reasonCodes,
          `contextualStayValue.candidates.${index}.roomUpgrade.reasonCodes`,
          issues
        );
        validateReasonCodes(
          candidate.flexibility.reasonCodes,
          `contextualStayValue.candidates.${index}.flexibility.reasonCodes`,
          issues
        );
        validateReasonCodes(
          candidate.contextInteractions.reasonCodes,
          `contextualStayValue.candidates.${index}.contextInteractions.reasonCodes`,
          issues
        );
        validateReasonCodes(
          candidate.convenience.reasonCodes,
          `contextualStayValue.candidates.${index}.convenience.reasonCodes`,
          issues
        );
      }
    );

  validateReasonCodes(
    decision.thesis
      .reasonCodes,
    "thesis.reasonCodes",
    issues
  );

  [
    decision.thesis
      .recommendation,
    decision.thesis
      .primaryReason,
    decision.thesis
      .mainTradeOff,
    decision.thesis
      .bestAlternative,
    decision.thesis
      .switchCondition,
    decision.thesis
      .uncertainty,
  ].forEach(
    (
      claim,
      index
    ) =>
      validateReasonCodes(
        claim.reasonCodes,
        `thesis.claims.${index}.reasonCodes`,
        issues
      )
  );

  validateReasonCodes(
    decision.searchWideScaleCoverage
      .reasonCodes,
    "searchWideScaleCoverage.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.searchWideScaleCoverage
      .scope
      .reasonCodes,
    "searchWideScaleCoverage.scope.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.searchWideScaleCoverage
      .searchWideContext
      .reasonCodes,
    "searchWideScaleCoverage.searchWideContext.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.searchWideScaleCoverage
      .equivalence
      .reasonCodes,
    "searchWideScaleCoverage.equivalence.reasonCodes",
    issues
  );

  validateReasonCodes(
    decision.searchWideScaleCoverage
      .workBudget
      .reasonCodes,
    "searchWideScaleCoverage.workBudget.reasonCodes",
    issues
  );

  decision.searchWideScaleCoverage
    .candidates
    .forEach(
      (
        candidate,
        index
      ) =>
        validateReasonCodes(
          candidate.reasonCodes,
          `searchWideScaleCoverage.candidates.${index}.reasonCodes`,
          issues
        )
    );

  const attachedExplanationEvidenceIds =
    new Set<string>([
      ...decision.candidates
        .flatMap(
          (candidate) =>
            candidate.evidenceIds
        ),
      ...decision.integrity
        .offerSnapshots
        .flatMap(
          (snapshot) =>
            snapshot.evidenceIds
        ),
      ...decision.personalization
        .utilityEvaluations
        .flatMap(
          (evaluation) =>
            evaluation.contributions
              .flatMap(
                (contribution) =>
                  contribution.evidenceIds
              )
        ),
      ...decision.personalization
        .peerAssignments
        .flatMap(
          (assignment) =>
            assignment.evidenceIds
        ),
      ...decision.robustness
        .candidates
        .flatMap(
          (candidate) =>
            candidate.riskSignals
              .flatMap(
                (signal) =>
                  signal.evidenceIds
              )
        ),
      ...decision.contextualStayValue
        .candidates
        .flatMap(
          (candidate) => [
            ...candidate.location
              .evidenceIds,
            ...candidate.roomUpgrade
              .evidenceIds,
            ...candidate.flexibility
              .evidenceIds,
            ...candidate.contextInteractions
              .evidenceIds,
            ...candidate.convenience
              .evidenceIds,
          ]
        ),
    ]);

  const hasDetachedExplanationEvidence =
    [
      decision.thesis
        .recommendation,
      decision.thesis
        .primaryReason,
      decision.thesis
        .mainTradeOff,
      decision.thesis
        .bestAlternative,
      decision.thesis
        .switchCondition,
      decision.thesis
        .uncertainty,
    ].some(
      (claim) =>
        claim.evidenceIds.some(
          (evidenceId) =>
            !attachedExplanationEvidenceIds
              .has(
                evidenceId
              )
        )
    );

  if (
    hasDetachedExplanationEvidence
  ) {
    addIssue(
      issues,
      "decision-explanation-source-mismatch",
      "thesis.copyEvidenceLinks",
      "Every Decision Thesis evidence ID must resolve to evidence attached to the same V3 decision."
    );
  }

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

  validateReasonCodes(
    decision.decisionGeometry
      .reasonCodes,
    "decisionGeometry.reasonCodes",
    issues
  );

  decision.decisionGeometry
    .candidates
    .forEach(
      (
        candidate,
        index
      ) =>
        validateReasonCodes(
          candidate.reasonCodes,
          `decisionGeometry.candidates.${index}.reasonCodes`,
          issues
        )
    );

  decision.decisionGeometry
    .dominanceRelations
    .forEach(
      (
        relation,
        index
      ) =>
        validateReasonCodes(
          relation.reasonCodes,
          `decisionGeometry.dominanceRelations.${index}.reasonCodes`,
          issues
        )
    );

  decision.decisionGeometry
    .pairwiseFinalistComparisons
    .forEach(
      (
        comparison,
        index
      ) =>
        validateReasonCodes(
          comparison.reasonCodes,
          `decisionGeometry.pairwiseFinalistComparisons.${index}.reasonCodes`,
          issues
        )
    );

  decision.decisionGeometry
    .marginalValueSegments
    .forEach(
      (
        segment,
        index
      ) =>
        validateReasonCodes(
          segment.reasonCodes,
          `decisionGeometry.marginalValueSegments.${index}.reasonCodes`,
          issues
        )
    );

  decision.decisionGeometry
    .tradeOffThresholds
    .forEach(
      (
        threshold,
        index
      ) =>
        validateReasonCodes(
          threshold.reasonCodes,
          `decisionGeometry.tradeOffThresholds.${index}.reasonCodes`,
          issues
        )
    );

  decision.decisionGeometry
    .decisionMap
    .points
    .forEach(
      (
        point,
        index
      ) =>
        validateReasonCodes(
          point.reasonCodes,
          `decisionGeometry.decisionMap.points.${index}.reasonCodes`,
          issues
        )
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
