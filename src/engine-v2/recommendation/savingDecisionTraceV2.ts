import type {
  SmartStayParetoEvaluationV2,
  SmartStayRecommendationRoleV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayUtilityPreferenceIdV2,
} from "../utility/userUtilityEngine";

import type {
  SmartStayBudgetIntentCandidateEvaluationV2,
} from "../intent/budgetIntentEngine";

import type {
  SmartStaySelectedOfferV2,
} from "../offers/intentAwareOfferSelectionV2";

export type SmartStaySavingDecisionOutcomeV2 =
  | "selected"
  | "eligible-not-selected"
  | "rejected"
  | "not-applicable";

export type SmartStaySavingOfferConditionModeV2 =
  | "comparable"
  | "less-flexibility";

export interface SmartStaySavingDecisionMetricsV2 {
  roleEligible: boolean;
  paretoStatus: SmartStayParetoEvaluationV2["status"];
  smartScore: number | null;
  recommendationScore: number | null;
  utilityScore: number | null;
  bestChoiceUtilityScore: number | null;
  minimumAlternativeUtilityScore: number;
  riskScore: number;
  verifiedWithinBudget: boolean;
  totalCost: number | null;
  currency: string | null;
  bestChoiceTotalCost: number | null;
  bestChoiceCurrency: string | null;
  savingAmount: number | null;
  minimumSavingAmount: number | null;
  savingRatio: number | null;
  minimumSavingRatio: number;
  utilityLoss: number | null;
  maximumUtilityLoss: number;
  locationScore: number | null;
  bestChoiceLocationScore: number | null;
  distanceKm: number | null;
  bestChoiceDistanceKm: number | null;
  locationLoss: number | null;
  maximumLocationLoss: number;
  comfortScore: number | null;
  bestChoiceComfortScore: number | null;
  comfortLoss: number | null;
  preferenceId: SmartStayUtilityPreferenceIdV2;
  intentLevel: SmartStayBudgetIntentCandidateEvaluationV2["intentLevel"] | null;
  candidateExperienceTier: SmartStayBudgetIntentCandidateEvaluationV2["experienceTier"] | null;
  bestChoiceExperienceTier: SmartStayBudgetIntentCandidateEvaluationV2["experienceTier"] | null;
  candidateExperienceTierRank: number | null;
  bestChoiceExperienceTierRank: number | null;
  minimumSavingTierRank: number | null;
  experienceTierLoss: number | null;
  candidateExperienceScore: number | null;
  bestChoiceExperienceScore: number | null;
  experienceScoreLoss: number | null;
  maximumSavingExperienceLoss: number | null;
  candidateMarketPositionPercentile: number | null;
  bestChoiceMarketPositionPercentile: number | null;
  savingRequiresExperienceParity: boolean;
  candidateSavingEligible: boolean | null;
  candidateRefundable: boolean | null;
  bestChoiceRefundable: boolean | null;
  candidateCostCompleteness: SmartStaySelectedOfferV2["completeness"] | null;
  bestChoiceCostCompleteness: SmartStaySelectedOfferV2["completeness"] | null;
  candidateUnknownTaxes: number | null;
  bestChoiceUnknownTaxes: number | null;
  candidateRoomTierRank: number | null;
  bestChoiceRoomTierRank: number | null;
  offerComparable: boolean | null;
  offerConditionMode: SmartStaySavingOfferConditionModeV2 | null;
}

export interface SmartStaySavingDecisionTraceV2 {
  hotelId: string;
  finalRole: SmartStayRecommendationRoleV2;
  comparisonTargetHotelId: string | null;
  outcome: SmartStaySavingDecisionOutcomeV2;
  reasonCodes: string[];
  metrics: SmartStaySavingDecisionMetricsV2;
}

export interface SmartStaySavingDecisionTraceInputV2 {
  hotelId: string;
  finalRole: SmartStayRecommendationRoleV2;
  comparisonTargetHotelId: string | null;
  outcome: SmartStaySavingDecisionOutcomeV2;
  alreadyAssigned: boolean;
  offerConditionCompatible: boolean;
  offerConditionMode: SmartStaySavingOfferConditionModeV2 | null;
  selectedReasonCodes: string[];
  metrics: SmartStaySavingDecisionMetricsV2;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function createSavingDecisionTraceV2(
  input: SmartStaySavingDecisionTraceInputV2
): SmartStaySavingDecisionTraceV2 {
  const reasonCodes: string[] = [];
  const metrics = input.metrics;

  if (input.outcome === "selected") {
    reasonCodes.push(
      "recommendation-saving-selected",
      ...input.selectedReasonCodes
    );
  } else if (input.outcome === "eligible-not-selected") {
    reasonCodes.push(
      "recommendation-saving-eligible-outside-equivalence-group",
      ...input.selectedReasonCodes
    );
  } else if (input.outcome === "not-applicable") {
    reasonCodes.push(
      input.comparisonTargetHotelId === null
        ? "recommendation-saving-not-applicable-best-choice-unavailable"
        : input.alreadyAssigned
          ? "recommendation-saving-not-applicable-already-assigned"
          : "recommendation-saving-not-applicable"
    );
  } else {
    if (!metrics.roleEligible) {
      reasonCodes.push(
        "recommendation-saving-rejected-role-ineligible"
      );
    }

    if (metrics.paretoStatus !== "frontier") {
      reasonCodes.push(
        metrics.paretoStatus === "dominated"
          ? "recommendation-saving-rejected-pareto-dominated"
          : "recommendation-saving-rejected-pareto-unavailable"
      );
    }

    if (metrics.utilityScore === null) {
      reasonCodes.push(
        "recommendation-saving-rejected-utility-unavailable"
      );
    } else if (
      metrics.utilityScore < metrics.minimumAlternativeUtilityScore
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-utility-below-minimum"
      );
    }

    if (!metrics.verifiedWithinBudget) {
      reasonCodes.push(
        "recommendation-saving-rejected-budget-not-verified"
      );
    }

    if (metrics.bestChoiceTotalCost === null) {
      reasonCodes.push(
        "recommendation-saving-rejected-best-choice-cost-unavailable"
      );
    }

    if (metrics.bestChoiceUtilityScore === null) {
      reasonCodes.push(
        "recommendation-saving-rejected-best-choice-utility-unavailable"
      );
    }

    if (metrics.totalCost === null) {
      reasonCodes.push(
        "recommendation-saving-rejected-cost-unavailable"
      );
    } else if (
      metrics.bestChoiceCurrency !== null &&
      metrics.currency !== metrics.bestChoiceCurrency
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-currency-mismatch"
      );
    }

    if (
      metrics.savingAmount !== null &&
      metrics.minimumSavingAmount !== null &&
      metrics.savingAmount < metrics.minimumSavingAmount
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-saving-amount"
      );
    }

    if (
      metrics.savingRatio !== null &&
      metrics.savingRatio < metrics.minimumSavingRatio
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-saving-ratio"
      );
    }

    if (
      metrics.utilityLoss !== null &&
      metrics.utilityLoss > metrics.maximumUtilityLoss
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-utility-loss"
      );
    }

    if (metrics.savingRequiresExperienceParity) {
      if (
        metrics.candidateExperienceTierRank === null ||
        metrics.minimumSavingTierRank === null ||
        metrics.candidateSavingEligible !== true
      ) {
        reasonCodes.push(
          "recommendation-saving-rejected-experience-tier"
        );
      } else if (
        metrics.candidateExperienceTierRank <
        metrics.minimumSavingTierRank
      ) {
        reasonCodes.push(
          "recommendation-saving-rejected-experience-tier"
        );
      }

      if (
        metrics.experienceScoreLoss === null ||
        metrics.maximumSavingExperienceLoss === null
      ) {
        reasonCodes.push(
          "recommendation-saving-rejected-experience-score-unavailable"
        );
      } else if (
        metrics.experienceScoreLoss >
        metrics.maximumSavingExperienceLoss
      ) {
        reasonCodes.push(
          "recommendation-saving-rejected-experience-loss"
        );
      }
    }

    if (!input.offerConditionCompatible) {
      reasonCodes.push(
        "recommendation-saving-rejected-offer-condition"
      );
    }

    if (
      metrics.bestChoiceLocationScore !== null &&
      metrics.locationScore === null
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-location-unavailable"
      );
    } else if (
      metrics.locationLoss !== null &&
      metrics.locationLoss > metrics.maximumLocationLoss
    ) {
      reasonCodes.push(
        "recommendation-saving-rejected-location-loss"
      );
    }

    if (reasonCodes.length === 0) {
      reasonCodes.push(
        "recommendation-saving-rejected-unclassified"
      );
    }
  }

  return {
    hotelId: input.hotelId,
    finalRole: input.finalRole,
    comparisonTargetHotelId: input.comparisonTargetHotelId,
    outcome: input.outcome,
    reasonCodes: uniqueSorted(reasonCodes),
    metrics: {
      ...metrics,
      offerConditionMode: input.offerConditionMode,
    },
  };
}
