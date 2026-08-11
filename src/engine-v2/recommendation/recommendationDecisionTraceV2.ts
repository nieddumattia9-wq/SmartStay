import type {
  HotelReviewCountRelation,
} from "../../types/hotel";

import type {
  StayCostCompleteness,
} from "../../utils/stayCost";

import type {
  SmartStayBudgetIntentStatusV2,
  SmartStayExperienceTierV2,
} from "../intent/budgetIntentEngine";

import type {
  SmartStayAccommodationCategory,
  SmartStayDataConfidenceLevelV2,
  SmartStayEngineV2Version,
  SmartStayParetoStatus,
  SmartStayPeerGroupMode,
  SmartStayRankBand,
  SmartStayRecommendationRoleV2,
  SmartStayReliabilityGateStatus,
  SmartStayRiskLevelV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayRoomTierV2,
} from "../offers/intentAwareOfferSelectionV2";

import type {
  SmartStayUtilityPreferenceIdV2,
  SmartStayUtilityPreferenceSourceV2,
} from "../utility/userUtilityEngine";

export const SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2 =
  "smartstay-recommendation-decision-trace-v2" as const;

export const SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2 =
  true as const;

export const SMARTSTAY_DECISION_TRACE_ROLES_V2 = [
  "best-choice",
  "best-sensible-saving",
  "worthwhile-comfort-upgrade",
  "best-location",
] as const satisfies readonly Exclude<
  SmartStayRecommendationRoleV2,
  "unassigned"
>[];

export type SmartStayDecisionTraceRoleV2 =
  typeof SMARTSTAY_DECISION_TRACE_ROLES_V2[number];

export type SmartStayDecisionTraceCandidateDispositionV2 =
  | "recommended"
  | "eligible-full-list"
  | "excluded";

export type SmartStayDecisionTraceRoleOutcomeV2 =
  | "selected"
  | "eligible-not-selected"
  | "rejected"
  | "not-applicable";

export type SmartStayDecisionTraceThresholdOutcomeV2 =
  | "passed"
  | "failed"
  | "not-evaluated";

export type SmartStayDecisionTraceComparisonOperatorV2 =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "includes"
  | "not-includes";

export type SmartStayDecisionTraceValueV2 =
  | string
  | number
  | boolean
  | null;

export interface SmartStayDecisionTraceContextV2 {
  preferenceId: SmartStayUtilityPreferenceIdV2;
  preferenceSource: SmartStayUtilityPreferenceSourceV2;
  totalBudget: number | null;
  budgetCurrency: string | null;
  nights: number;
  rooms: number;
  budgetPerRoomNight: number | null;
  marketStatus: SmartStayBudgetIntentStatusV2;
  marketMedianPerRoomNight: number | null;
  marketBudgetPercentile: number | null;
  reasonCodes: string[];
}

export interface SmartStayDecisionTraceIdentityV2 {
  hotelId: string;
  offerId: string | null;
}

export interface SmartStayDecisionTracePriceV2 {
  totalAmount: number | null;
  perRoomNightAmount: number | null;
  currency: string | null;
  completeness: StayCostCompleteness;
  taxesIncluded: boolean | null;
  includedTaxes: number | null;
  excludedTaxes: number | null;
  unknownTaxes: number | null;
}

export interface SmartStayDecisionTraceAccommodationV2 {
  category: SmartStayAccommodationCategory;
  roomName: string | null;
  roomTier: SmartStayRoomTierV2;
}

export interface SmartStayDecisionTraceReputationV2 {
  starRating: number | null;
  reviewRating: number | null;
  reviewCount: number | null;
  reviewCountRelation: HotelReviewCountRelation;
  reviewProvenanceEvidenceIds: string[];
}

export interface SmartStayDecisionTraceLocationV2 {
  distanceKm: number | null;
  locationScore: number | null;
  evidenceIds: string[];
}

export interface SmartStayDecisionTraceBookingConditionsV2 {
  bookable: boolean | null;
  refundable: boolean | null;
  freeCancellationUntil: string | null;
  cancellationPolicyKnown: boolean;
  evidenceIds: string[];
}

export interface SmartStayDecisionTraceReliabilityV2 {
  status: SmartStayReliabilityGateStatus;
  eligible: boolean;
  dataConfidenceScore: number;
  dataConfidenceLevel: SmartStayDataConfidenceLevelV2;
  choiceRiskScore: number;
  choiceRiskLevel: SmartStayRiskLevelV2;
  reasonCodes: string[];
  evidenceIds: string[];
}

export interface SmartStayDecisionTraceScoresV2 {
  smartStayFitScore: number | null;
  utilityScore: number | null;
  experienceScore: number | null;
  experienceTier: SmartStayExperienceTierV2;
}

export interface SmartStayDecisionTracePeerGroupV2 {
  id: string | null;
  mode: SmartStayPeerGroupMode;
  category: SmartStayAccommodationCategory;
  sampleSize: number;
  confidence: number;
  evidenceIds: string[];
}

export interface SmartStayDecisionTraceBestChoiceComparisonV2 {
  bestChoiceHotelId: string | null;
  savingAmount: number | null;
  savingRatio: number | null;
  utilityLoss: number | null;
  reasonCodes: string[];
  evidenceIds: string[];
}

export interface SmartStayDecisionTraceParetoV2 {
  status: SmartStayParetoStatus;
  dominatedByHotelIds: string[];
  dominatesHotelIds: string[];
  reasonCodes: string[];
}

export interface SmartStayDecisionTraceRankingV2 {
  finalRank: number | null;
  rankBand: SmartStayRankBand;
  tieGroupId: string | null;
}

export interface SmartStayDecisionTraceThresholdCheckV2 {
  code: string;
  outcome: SmartStayDecisionTraceThresholdOutcomeV2;
  actualValue: SmartStayDecisionTraceValueV2;
  thresholdValue: SmartStayDecisionTraceValueV2;
  comparisonOperator: SmartStayDecisionTraceComparisonOperatorV2 | null;
  unit: string | null;
  reasonCodes: string[];
  evidenceIds: string[];
}

export interface SmartStayDecisionTraceRoleDecisionV2 {
  role: SmartStayDecisionTraceRoleV2;
  outcome: SmartStayDecisionTraceRoleOutcomeV2;
  eligible: boolean;
  comparisonTargetHotelId: string | null;
  assignmentScore: number | null;
  thresholdChecks: SmartStayDecisionTraceThresholdCheckV2[];
  reasonCodes: string[];
  evidenceIds: string[];
}

export interface SmartStayRecommendationDecisionCandidateTraceV2 {
  identity: SmartStayDecisionTraceIdentityV2;
  price: SmartStayDecisionTracePriceV2;
  accommodation: SmartStayDecisionTraceAccommodationV2;
  reputation: SmartStayDecisionTraceReputationV2;
  location: SmartStayDecisionTraceLocationV2;
  bookingConditions: SmartStayDecisionTraceBookingConditionsV2;
  reliability: SmartStayDecisionTraceReliabilityV2;
  scores: SmartStayDecisionTraceScoresV2;
  peerGroup: SmartStayDecisionTracePeerGroupV2;
  bestChoiceComparison: SmartStayDecisionTraceBestChoiceComparisonV2;
  pareto: SmartStayDecisionTraceParetoV2;
  ranking: SmartStayDecisionTraceRankingV2;
  roleDecisions: SmartStayDecisionTraceRoleDecisionV2[];
  disposition: SmartStayDecisionTraceCandidateDispositionV2;
  finalRole: SmartStayRecommendationRoleV2;
  exclusionReasonCodes: string[];
  explanationEvidenceIds: string[];
}

export interface SmartStayRecommendationDecisionTraceV2 {
  schemaVersion: typeof SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2;
  internalOnly: typeof SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2;
  engineVersion: SmartStayEngineV2Version;
  generatedAt: string | null;
  context: SmartStayDecisionTraceContextV2;
  candidates: SmartStayRecommendationDecisionCandidateTraceV2[];
}

export type SmartStayDecisionTraceValidationIssueCodeV2 =
  | "decision-trace-schema-version-invalid"
  | "decision-trace-public-exposure-forbidden"
  | "decision-trace-candidate-hotel-id-missing"
  | "decision-trace-candidate-hotel-id-duplicate"
  | "decision-trace-role-decision-duplicate"
  | "decision-trace-role-coverage-incomplete"
  | "decision-trace-role-reason-missing"
  | "decision-trace-selected-role-count-invalid"
  | "decision-trace-selected-role-mismatch"
  | "decision-trace-recommended-role-unassigned"
  | "decision-trace-non-recommended-role-assigned"
  | "decision-trace-excluded-reason-missing"
  | "decision-trace-threshold-code-missing"
  | "decision-trace-threshold-code-duplicate";

export interface SmartStayDecisionTraceValidationIssueV2 {
  code: SmartStayDecisionTraceValidationIssueCodeV2;
  hotelId: string | null;
  role: SmartStayDecisionTraceRoleV2 | null;
  thresholdCode: string | null;
}

export interface SmartStayDecisionTraceValidationResultV2 {
  valid: boolean;
  issues: SmartStayDecisionTraceValidationIssueV2[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function compareNullableStrings(
  first: string | null,
  second: string | null
) {
  return (first ?? "").localeCompare(second ?? "");
}

function compareIssues(
  first: SmartStayDecisionTraceValidationIssueV2,
  second: SmartStayDecisionTraceValidationIssueV2
) {
  return first.code.localeCompare(second.code) ||
    compareNullableStrings(first.hotelId, second.hotelId) ||
    compareNullableStrings(first.role, second.role) ||
    compareNullableStrings(first.thresholdCode, second.thresholdCode);
}

export function validateRecommendationDecisionTraceV2(
  trace: SmartStayRecommendationDecisionTraceV2
): SmartStayDecisionTraceValidationResultV2 {
  const issues: SmartStayDecisionTraceValidationIssueV2[] = [];
  const addIssue = (
    code: SmartStayDecisionTraceValidationIssueCodeV2,
    hotelId: string | null = null,
    role: SmartStayDecisionTraceRoleV2 | null = null,
    thresholdCode: string | null = null
  ) => {
    issues.push({
      code,
      hotelId,
      role,
      thresholdCode,
    });
  };

  if (
    trace.schemaVersion !==
    SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2
  ) {
    addIssue("decision-trace-schema-version-invalid");
  }

  if (trace.internalOnly !== true) {
    addIssue("decision-trace-public-exposure-forbidden");
  }

  const candidateHotelIds = new Set<string>();

  for (const candidate of trace.candidates) {
    const hotelId = isNonEmptyString(candidate.identity.hotelId)
      ? candidate.identity.hotelId
      : null;

    if (hotelId === null) {
      addIssue("decision-trace-candidate-hotel-id-missing");
    } else if (candidateHotelIds.has(hotelId)) {
      addIssue("decision-trace-candidate-hotel-id-duplicate", hotelId);
    } else {
      candidateHotelIds.add(hotelId);
    }

    const roleDecisions = new Map<
      SmartStayDecisionTraceRoleV2,
      SmartStayDecisionTraceRoleDecisionV2
    >();

    for (const decision of candidate.roleDecisions) {
      if (roleDecisions.has(decision.role)) {
        addIssue(
          "decision-trace-role-decision-duplicate",
          hotelId,
          decision.role
        );
      } else {
        roleDecisions.set(decision.role, decision);
      }

      if (decision.reasonCodes.length === 0) {
        addIssue(
          "decision-trace-role-reason-missing",
          hotelId,
          decision.role
        );
      }

      const thresholdCodes = new Set<string>();

      for (const threshold of decision.thresholdChecks) {
        if (!isNonEmptyString(threshold.code)) {
          addIssue(
            "decision-trace-threshold-code-missing",
            hotelId,
            decision.role
          );
        } else if (thresholdCodes.has(threshold.code)) {
          addIssue(
            "decision-trace-threshold-code-duplicate",
            hotelId,
            decision.role,
            threshold.code
          );
        } else {
          thresholdCodes.add(threshold.code);
        }
      }
    }

    for (const role of SMARTSTAY_DECISION_TRACE_ROLES_V2) {
      if (!roleDecisions.has(role)) {
        addIssue(
          "decision-trace-role-coverage-incomplete",
          hotelId,
          role
        );
      }
    }

    const selectedDecisions = candidate.roleDecisions.filter(
      (decision) => decision.outcome === "selected"
    );

    if (candidate.disposition === "recommended") {
      if (candidate.finalRole === "unassigned") {
        addIssue(
          "decision-trace-recommended-role-unassigned",
          hotelId
        );
      }

      if (selectedDecisions.length !== 1) {
        addIssue(
          "decision-trace-selected-role-count-invalid",
          hotelId
        );
      } else if (selectedDecisions[0].role !== candidate.finalRole) {
        addIssue(
          "decision-trace-selected-role-mismatch",
          hotelId,
          selectedDecisions[0].role
        );
      }
    } else if (
      candidate.finalRole !== "unassigned" ||
      selectedDecisions.length > 0
    ) {
      addIssue(
        "decision-trace-non-recommended-role-assigned",
        hotelId
      );
    }

    if (
      candidate.disposition === "excluded" &&
      candidate.exclusionReasonCodes.length === 0
    ) {
      addIssue(
        "decision-trace-excluded-reason-missing",
        hotelId
      );
    }
  }

  issues.sort(compareIssues);

  return {
    valid: issues.length === 0,
    issues,
  };
}
