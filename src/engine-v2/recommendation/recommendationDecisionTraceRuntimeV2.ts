import {
  classifyStayCostCompleteness,
} from "../../utils/stayCost";

import type {
  HotelOffer,
  HotelReviewCountRelation,
} from "../../types/hotel";

import type {
  SmartStayBudgetIntentCandidateEvaluationV2,
} from "../intent/budgetIntentEngine";

import type {
  SmartStayEvaluationV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayEngineV2SearchInput,
  SmartStayEngineV2SearchResult,
} from "../orchestrator/smartStayEngineV2";

import type {
  SmartStayRankingCandidateEvaluationV2,
} from "../ranking/rankingStabilityDiversityEngine";

import type {
  SmartStayRecommendationEvaluationV2,
} from "./recommendationRolesEngine";

import type {
  SmartStaySavingDecisionTraceV2,
} from "./savingDecisionTraceV2";

import {
  SMARTSTAY_DECISION_TRACE_ROLES_V2,
  SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2,
  SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2,
} from "./recommendationDecisionTraceV2";

import type {
  SmartStayDecisionTraceRoleDecisionV2,
  SmartStayDecisionTraceRoleOutcomeV2,
  SmartStayDecisionTraceThresholdCheckV2,
  SmartStayRecommendationDecisionCandidateTraceV2,
  SmartStayRecommendationDecisionTraceV2,
} from "./recommendationDecisionTraceV2";

export interface SmartStayRecommendationDecisionTraceRuntimeInputV2 {
  searchInput: SmartStayEngineV2SearchInput;
  result: SmartStayEngineV2SearchResult;
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeCurrency(value: unknown) {
  const normalized = normalizeText(value)?.toUpperCase() ?? null;

  return normalized && /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : null;
}

function normalizeFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function normalizeNonNegativeNumber(value: unknown) {
  const normalized = normalizeFiniteNumber(value);

  return normalized !== null && normalized >= 0
    ? normalized
    : null;
}

function requireByHotelId<T extends { hotelId: string }>(
  values: readonly T[],
  hotelId: string,
  label: string
) {
  const value = values.find((candidate) => candidate.hotelId === hotelId);

  if (!value) {
    throw new Error(`${label} is missing hotelId: ${hotelId}.`);
  }

  return value;
}

function collectEvidenceIds(
  evaluation: SmartStayEvaluationV2,
  codes: readonly string[]
) {
  return uniqueSorted(
    evaluation.evidence
      .filter((fact) =>
        codes.some(
          (code) => fact.code === code || fact.code.startsWith(`${code}.`)
        )
      )
      .map((fact) => fact.id)
  );
}

function findSelectedHotelOffer(
  evaluation: SmartStayEvaluationV2,
  offerId: string | null
): HotelOffer | null {
  if (offerId === null) {
    return null;
  }

  return evaluation.hotel.offers.find((offer) => offer.id === offerId) ?? null;
}

function resolveReviewCountRelation(
  evaluation: SmartStayEvaluationV2
): HotelReviewCountRelation {
  const relation = evaluation.hotel.reviewCountRelation;

  return relation === "equal" ||
    relation === "at-least" ||
    relation === "estimated" ||
    relation === "unknown"
    ? relation
    : "unknown";
}

function createBooleanThresholdCheck(
  code: string,
  actualValue: boolean | null,
  reasonCodes: string[],
  evidenceIds: string[]
): SmartStayDecisionTraceThresholdCheckV2 {
  return {
    code,
    outcome:
      actualValue === null
        ? "not-evaluated"
        : actualValue
          ? "passed"
          : "failed",
    actualValue,
    thresholdValue: true,
    comparisonOperator: "eq",
    unit: null,
    reasonCodes: uniqueSorted(reasonCodes),
    evidenceIds: uniqueSorted(evidenceIds),
  };
}

function createNumericThresholdCheck(
  code: string,
  actualValue: number | null,
  thresholdValue: number | null,
  comparisonOperator: "gte" | "lte",
  unit: string | null,
  reasonCodes: string[],
  evidenceIds: string[]
): SmartStayDecisionTraceThresholdCheckV2 {
  const evaluated = actualValue !== null && thresholdValue !== null;
  const passed = evaluated && (
    comparisonOperator === "gte"
      ? actualValue >= thresholdValue
      : actualValue <= thresholdValue
  );

  return {
    code,
    outcome: evaluated ? (passed ? "passed" : "failed") : "not-evaluated",
    actualValue,
    thresholdValue,
    comparisonOperator,
    unit,
    reasonCodes: uniqueSorted(reasonCodes),
    evidenceIds: uniqueSorted(evidenceIds),
  };
}

function resolvePreferenceSource(
  input: SmartStayEngineV2SearchInput
) {
  if (input.preferenceSource) {
    return input.preferenceSource;
  }

  return input.preferenceId ||
    input.selectedIndex !== null && input.selectedIndex !== undefined
    ? "automatic" as const
    : "default" as const;
}

function createBestChoiceDecision(
  evaluation: SmartStayEvaluationV2,
  recommendation: SmartStayRecommendationEvaluationV2,
  budgetCandidate: SmartStayBudgetIntentCandidateEvaluationV2,
  bestChoiceHotelId: string | null
): SmartStayDecisionTraceRoleDecisionV2 {
  const eligible =
    recommendation.eligible === true &&
    evaluation.pareto.status === "frontier" &&
    budgetCandidate.bestChoiceEligible === true;

  const outcome: SmartStayDecisionTraceRoleOutcomeV2 =
    recommendation.role === "best-choice"
      ? "selected"
      : eligible
        ? "eligible-not-selected"
        : "rejected";

  const evidenceIds = uniqueSorted([
    ...recommendation.evidenceIds,
    ...evaluation.scores.priceValue.evidenceIds,
    ...evaluation.scores.quality.evidenceIds,
    ...evaluation.scores.location.evidenceIds,
    ...evaluation.scores.comfort.evidenceIds,
    ...evaluation.risk.evidenceIds,
  ]);

  return {
    role: "best-choice",
    outcome,
    eligible,
    comparisonTargetHotelId:
      bestChoiceHotelId === evaluation.hotel.id
        ? null
        : bestChoiceHotelId,
    assignmentScore:
      recommendation.role === "best-choice"
        ? recommendation.assignmentScore
        : budgetCandidate.intentAdjustedScore ?? evaluation.final.smartScore,
    thresholdChecks: [
      createBooleanThresholdCheck(
        "best-choice-primary-ranking-eligible",
        recommendation.eligible,
        recommendation.reasonCodes,
        recommendation.evidenceIds
      ),
      createBooleanThresholdCheck(
        "best-choice-pareto-frontier",
        evaluation.pareto.status === "unknown"
          ? null
          : evaluation.pareto.status === "frontier",
        evaluation.pareto.reasonCodes,
        evaluation.scores.userFit.evidenceIds
      ),
      createBooleanThresholdCheck(
        "best-choice-budget-intent-eligible",
        budgetCandidate.bestChoiceEligible,
        budgetCandidate.reasonCodes,
        evaluation.scores.priceValue.evidenceIds
      ),
    ],
    reasonCodes: uniqueSorted([
      `decision-trace-best-choice-${outcome}`,
      ...recommendation.reasonCodes,
      ...budgetCandidate.reasonCodes,
      ...evaluation.pareto.reasonCodes,
    ]),
    evidenceIds,
  };
}

function createSavingDecision(
  evaluation: SmartStayEvaluationV2,
  recommendation: SmartStayRecommendationEvaluationV2,
  savingTrace: SmartStaySavingDecisionTraceV2
): SmartStayDecisionTraceRoleDecisionV2 {
  const metrics = savingTrace.metrics;
  const evidenceIds = uniqueSorted([
    ...recommendation.evidenceIds,
    ...evaluation.scores.priceValue.evidenceIds,
    ...evaluation.scores.location.evidenceIds,
    ...evaluation.scores.quality.evidenceIds,
    ...evaluation.scores.comfort.evidenceIds,
    ...evaluation.scores.flexibility.evidenceIds,
    ...evaluation.risk.evidenceIds,
  ]);

  return {
    role: "best-sensible-saving",
    outcome: savingTrace.outcome,
    eligible:
      savingTrace.outcome === "selected" ||
      savingTrace.outcome === "eligible-not-selected",
    comparisonTargetHotelId: savingTrace.comparisonTargetHotelId,
    assignmentScore:
      recommendation.role === "best-sensible-saving"
        ? recommendation.assignmentScore
        : null,
    thresholdChecks: [
      createBooleanThresholdCheck(
        "saving-primary-ranking-eligible",
        metrics.roleEligible,
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "saving-pareto-frontier",
        metrics.paretoStatus === "unknown"
          ? null
          : metrics.paretoStatus === "frontier",
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createNumericThresholdCheck(
        "saving-minimum-utility",
        metrics.utilityScore,
        metrics.minimumAlternativeUtilityScore,
        "gte",
        "score",
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "saving-verified-within-budget",
        metrics.verifiedWithinBudget,
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "saving-cost-comparable",
        metrics.totalCost === null || metrics.bestChoiceTotalCost === null
          ? null
          : metrics.currency === metrics.bestChoiceCurrency,
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createNumericThresholdCheck(
        "saving-minimum-amount",
        metrics.savingAmount,
        metrics.minimumSavingAmount,
        "gte",
        metrics.currency,
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createNumericThresholdCheck(
        "saving-minimum-ratio",
        metrics.savingRatio,
        metrics.minimumSavingRatio,
        "gte",
        "ratio",
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createNumericThresholdCheck(
        "saving-maximum-utility-loss",
        metrics.utilityLoss,
        metrics.maximumUtilityLoss,
        "lte",
        "score",
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "saving-experience-compatible",
        metrics.savingRequiresExperienceParity
          ? metrics.candidateSavingEligible
          : null,
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "saving-offer-comparable",
        metrics.offerComparable,
        savingTrace.reasonCodes,
        evidenceIds
      ),
      createNumericThresholdCheck(
        "saving-maximum-location-loss",
        metrics.locationLoss,
        metrics.maximumLocationLoss,
        "lte",
        "score",
        savingTrace.reasonCodes,
        evidenceIds
      ),
    ],
    reasonCodes: savingTrace.reasonCodes,
    evidenceIds,
  };
}

function createUpgradeDecision(
  evaluation: SmartStayEvaluationV2,
  recommendation: SmartStayRecommendationEvaluationV2,
  result: SmartStayEngineV2SearchResult
): SmartStayDecisionTraceRoleDecisionV2 {
  const curve = result.recommendationRoles.upgradeCurve;
  const point = curve?.points.find(
    (candidate) => candidate.hotelId === evaluation.hotel.id
  ) ?? null;
  const alreadyAssigned =
    recommendation.role !== "unassigned" &&
    recommendation.role !== "worthwhile-comfort-upgrade";
  const eligible =
    point?.curveEligible === true &&
    point.status === "worthwhile" &&
    point.efficientFrontier === true &&
    !alreadyAssigned;

  let outcome: SmartStayDecisionTraceRoleOutcomeV2;

  if (recommendation.role === "worthwhile-comfort-upgrade") {
    outcome = "selected";
  } else if (curve === null || point?.status === "baseline" || alreadyAssigned) {
    outcome = "not-applicable";
  } else if (eligible) {
    outcome = "eligible-not-selected";
  } else {
    outcome = "rejected";
  }

  const evidenceIds = uniqueSorted([
    ...(point?.evidenceIds ?? []),
    ...evaluation.scores.priceValue.evidenceIds,
    ...evaluation.scores.quality.evidenceIds,
    ...evaluation.scores.location.evidenceIds,
    ...evaluation.scores.comfort.evidenceIds,
    ...evaluation.scores.flexibility.evidenceIds,
    ...evaluation.risk.evidenceIds,
  ]);

  return {
    role: "worthwhile-comfort-upgrade",
    outcome,
    eligible:
      outcome === "selected" || outcome === "eligible-not-selected",
    comparisonTargetHotelId: curve?.baselineHotelId ?? null,
    assignmentScore:
      recommendation.role === "worthwhile-comfort-upgrade"
        ? recommendation.assignmentScore
        : point?.adjustedBenefit !== null && point?.adjustedBenefit !== undefined &&
            point.efficiencyPerBudgetPercent !== null
          ? point.adjustedBenefit + point.efficiencyPerBudgetPercent
          : null,
    thresholdChecks: [
      createBooleanThresholdCheck(
        "upgrade-curve-available",
        curve === null ? null : true,
        curve?.reasonCodes ?? ["decision-trace-upgrade-curve-unavailable"],
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "upgrade-curve-eligible",
        point?.curveEligible ?? null,
        point?.reasonCodes ?? ["decision-trace-upgrade-point-unavailable"],
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "upgrade-status-worthwhile",
        point === null || point.status === "baseline"
          ? null
          : point.status === "worthwhile",
        point?.reasonCodes ?? ["decision-trace-upgrade-point-unavailable"],
        evidenceIds
      ),
      createBooleanThresholdCheck(
        "upgrade-efficient-frontier",
        point?.efficientFrontier ?? null,
        point?.reasonCodes ?? ["decision-trace-upgrade-point-unavailable"],
        evidenceIds
      ),
    ],
    reasonCodes: uniqueSorted([
      `decision-trace-upgrade-${outcome}`,
      ...(curve?.reasonCodes ?? ["decision-trace-upgrade-curve-unavailable"]),
      ...(point?.reasonCodes ?? []),
      ...(alreadyAssigned
        ? ["decision-trace-upgrade-not-applicable-already-assigned"]
        : []),
    ]),
    evidenceIds,
  };
}

function createBestLocationDecision(
  evaluation: SmartStayEvaluationV2
): SmartStayDecisionTraceRoleDecisionV2 {
  return {
    role: "best-location",
    outcome: "not-applicable",
    eligible: false,
    comparisonTargetHotelId: null,
    assignmentScore: null,
    thresholdChecks: [
      createBooleanThresholdCheck(
        "best-location-runtime-role-implemented",
        false,
        ["decision-trace-best-location-role-not-implemented"],
        evaluation.scores.location.evidenceIds
      ),
    ],
    reasonCodes: ["decision-trace-best-location-role-not-implemented"],
    evidenceIds: uniqueSorted(evaluation.scores.location.evidenceIds),
  };
}

function createExclusionReasonCodes(
  evaluation: SmartStayEvaluationV2,
  recommendation: SmartStayRecommendationEvaluationV2,
  ranking: SmartStayRankingCandidateEvaluationV2,
  disposition: SmartStayRecommendationDecisionCandidateTraceV2["disposition"]
) {
  if (disposition !== "excluded") {
    return [];
  }

  const reasonCodes: string[] = [];

  if (!evaluation.reliabilityGate.eligible) {
    reasonCodes.push(
      "reliability-gate-ineligible",
      ...evaluation.reliabilityGate.blockingReasonCodes
    );
  }

  for (const constraint of evaluation.constraints) {
    if (constraint.kind === "distance") {
      if (constraint.status === "exceeded") {
        reasonCodes.push("distance-limit-exceeded");
      } else if (constraint.status === "unknown") {
        reasonCodes.push("distance-limit-unverified");
      }
    }

    if (constraint.kind === "mandatory-feature") {
      if (constraint.status === "exceeded") {
        reasonCodes.push("mandatory-requirements-not-satisfied");
      } else if (constraint.status === "unknown") {
        reasonCodes.push("mandatory-requirements-unverified");
      }
    }
  }

  if (recommendation.reasonCodes.includes("recommendation-not-eligible")) {
    reasonCodes.push("utility-ineligible");
  }

  reasonCodes.push(...ranking.reasonCodes);

  if (ranking.suppressedByHotelId) {
    reasonCodes.push("ranking-near-duplicate-suppressed");
  }

  if (reasonCodes.length === 0) {
    reasonCodes.push("decision-trace-candidate-excluded-by-ranking");
  }

  return uniqueSorted(reasonCodes);
}

function resolveDisposition(
  evaluation: SmartStayEvaluationV2,
  eligibleFullListHotelIds: ReadonlySet<string>
): SmartStayRecommendationDecisionCandidateTraceV2["disposition"] {
  if (evaluation.recommendation.role !== "unassigned") {
    return "recommended";
  }

  return eligibleFullListHotelIds.has(evaluation.hotel.id)
    ? "eligible-full-list"
    : "excluded";
}

function createCandidateTrace(
  evaluation: SmartStayEvaluationV2,
  input: SmartStayRecommendationDecisionTraceRuntimeInputV2,
  eligibleFullListHotelIds: ReadonlySet<string>
): SmartStayRecommendationDecisionCandidateTraceV2 {
  const result = input.result;
  const hotelId = evaluation.hotel.id;
  const recommendation = requireByHotelId(
    result.recommendationRoles.evaluations,
    hotelId,
    "Recommendation Decision Trace recommendation evaluation"
  );
  const ranking = requireByHotelId(
    result.ranking.evaluations,
    hotelId,
    "Recommendation Decision Trace ranking evaluation"
  );
  const budgetCandidate = requireByHotelId(
    result.budgetIntent.candidateEvaluations,
    hotelId,
    "Recommendation Decision Trace budget-intent evaluation"
  );
  const savingTrace = requireByHotelId(
    result.recommendationRoles.savingDecisionTrace,
    hotelId,
    "Recommendation Decision Trace saving trace"
  );
  const selectedOffer = recommendation.metrics.selectedOffer ?? null;
  const hotelOffer = findSelectedHotelOffer(
    evaluation,
    selectedOffer?.offerId ?? null
  );
  const totalAmount =
    selectedOffer?.amount ??
    normalizeFiniteNumber(evaluation.hotel.totalKnownCost) ??
    normalizeFiniteNumber(evaluation.hotel.price);
  const nights = result.budgetIntent.nights;
  const rooms = result.budgetIntent.rooms;
  const perRoomNightAmount =
    totalAmount !== null && nights > 0 && rooms > 0
      ? totalAmount / (nights * rooms)
      : null;
  const disposition = resolveDisposition(
    evaluation,
    eligibleFullListHotelIds
  );
  const roleDecisions = [
    createBestChoiceDecision(
      evaluation,
      recommendation,
      budgetCandidate,
      result.recommendationRoles.bestChoiceHotelId
    ),
    createSavingDecision(evaluation, recommendation, savingTrace),
    createUpgradeDecision(evaluation, recommendation, result),
    createBestLocationDecision(evaluation),
  ];

  if (
    roleDecisions.map((decision) => decision.role).join("|") !==
    SMARTSTAY_DECISION_TRACE_ROLES_V2.join("|")
  ) {
    throw new Error("Recommendation Decision Trace runtime role order drifted.");
  }

  return {
    identity: {
      hotelId,
      offerId: selectedOffer?.offerId ?? null,
    },
    price: {
      totalAmount,
      perRoomNightAmount,
      currency:
        normalizeCurrency(selectedOffer?.currency) ??
        normalizeCurrency(evaluation.hotel.currency),
      completeness:
        selectedOffer?.completeness ??
        classifyStayCostCompleteness(
          evaluation.hotel.taxesIncluded,
          evaluation.hotel.excludedTaxes,
          evaluation.hotel.unknownTaxes
        ),
      taxesIncluded:
        selectedOffer?.taxesIncluded ??
        evaluation.hotel.taxesIncluded ??
        null,
      includedTaxes:
        normalizeNonNegativeNumber(hotelOffer?.includedTaxes) ??
        normalizeNonNegativeNumber(evaluation.hotel.includedTaxes),
      excludedTaxes:
        normalizeNonNegativeNumber(selectedOffer?.excludedTaxes) ??
        normalizeNonNegativeNumber(evaluation.hotel.excludedTaxes),
      unknownTaxes:
        normalizeNonNegativeNumber(selectedOffer?.unknownTaxes) ??
        normalizeNonNegativeNumber(evaluation.hotel.unknownTaxes),
    },
    accommodation: {
      category: evaluation.accommodation.category,
      roomName: selectedOffer?.roomName ?? hotelOffer?.roomName ?? null,
      roomTier: selectedOffer?.roomTier ?? "unknown",
    },
    reputation: {
      starRating: normalizeNonNegativeNumber(evaluation.hotel.stars),
      reviewRating: normalizeNonNegativeNumber(evaluation.hotel.reviewScore),
      reviewCount: normalizeNonNegativeNumber(evaluation.hotel.reviewCount),
      reviewCountRelation: resolveReviewCountRelation(evaluation),
      reviewProvenanceEvidenceIds: collectEvidenceIds(
        evaluation,
        ["review.count"]
      ),
    },
    location: {
      distanceKm: recommendation.metrics.distanceKm,
      locationScore: recommendation.metrics.locationScore,
      evidenceIds: uniqueSorted(evaluation.scores.location.evidenceIds),
    },
    bookingConditions: {
      bookable: selectedOffer?.bookable ?? null,
      refundable: selectedOffer?.refundable ?? null,
      freeCancellationUntil: selectedOffer?.freeCancellationUntil ?? null,
      cancellationPolicyKnown:
        selectedOffer?.cancellationPolicyKnown ?? false,
      evidenceIds: collectEvidenceIds(evaluation, ["offer"]),
    },
    reliability: {
      status: evaluation.reliabilityGate.status,
      eligible: evaluation.reliabilityGate.eligible,
      dataConfidenceScore: evaluation.dataConfidence.score,
      dataConfidenceLevel: evaluation.dataConfidence.level,
      choiceRiskScore: evaluation.risk.score,
      choiceRiskLevel: evaluation.risk.level,
      reasonCodes: uniqueSorted([
        ...evaluation.reliabilityGate.blockingReasonCodes,
        ...evaluation.reliabilityGate.warningCodes,
        ...evaluation.risk.factorCodes,
      ]),
      evidenceIds: uniqueSorted([
        ...evaluation.reliabilityGate.evidenceIds,
        ...evaluation.dataConfidence.evidenceIds,
        ...evaluation.risk.evidenceIds,
      ]),
    },
    scores: {
      smartStayFitScore: evaluation.final.smartScore,
      utilityScore: evaluation.final.utilityScore,
      experienceScore: budgetCandidate.experienceScore,
      experienceTier: budgetCandidate.experienceTier,
    },
    peerGroup: {
      id: evaluation.peerGroup.id,
      mode: evaluation.peerGroup.mode,
      category: evaluation.peerGroup.category,
      sampleSize: evaluation.peerGroup.sampleSize,
      confidence: evaluation.peerGroup.confidence,
      evidenceIds: uniqueSorted(evaluation.peerGroup.evidenceIds),
    },
    bestChoiceComparison: {
      bestChoiceHotelId: savingTrace.comparisonTargetHotelId,
      savingAmount: savingTrace.metrics.savingAmount,
      savingRatio: savingTrace.metrics.savingRatio,
      utilityLoss: savingTrace.metrics.utilityLoss,
      reasonCodes: savingTrace.reasonCodes,
      evidenceIds: uniqueSorted([
        ...evaluation.scores.priceValue.evidenceIds,
        ...evaluation.scores.userFit.evidenceIds,
        ...recommendation.evidenceIds,
      ]),
    },
    pareto: {
      status: evaluation.pareto.status,
      dominatedByHotelIds: [...evaluation.pareto.dominatedByHotelIds],
      dominatesHotelIds: [...evaluation.pareto.dominatesHotelIds],
      reasonCodes: [...evaluation.pareto.reasonCodes],
    },
    ranking: {
      finalRank: evaluation.final.rank,
      rankBand: evaluation.final.rankBand,
      tieGroupId: evaluation.final.tieGroupId,
    },
    roleDecisions,
    disposition,
    finalRole: evaluation.recommendation.role,
    exclusionReasonCodes: createExclusionReasonCodes(
      evaluation,
      recommendation,
      ranking,
      disposition
    ),
    explanationEvidenceIds: uniqueSorted(
      evaluation.explanation.evidenceIds
    ),
  };
}

export function createRecommendationDecisionTraceRuntimeV2(
  input: SmartStayRecommendationDecisionTraceRuntimeInputV2
): SmartStayRecommendationDecisionTraceV2 {
  const result = input.result;
  const excludedHotelIds = new Set(result.ranking.excludedHotelIds);
  const suppressedHotelIds = new Set(
    result.ranking.nearDuplicateGroups.flatMap(
      (group) => group.suppressedHotelIds
    )
  );
  const eligibleFullListHotelIds = new Set(
    uniqueSorted([
      ...result.ranking.visibleHotelIds,
      ...result.ranking.additionalHotelIds,
      ...result.ranking.diversifiedRankingHotelIds,
    ]).filter(
      (hotelId) =>
        !excludedHotelIds.has(hotelId) && !suppressedHotelIds.has(hotelId)
    )
  );
  const firstRecommendation =
    result.recommendationRoles.evaluations[0] ?? null;
  const budgetCurrency =
    normalizeCurrency(input.searchInput.currency) ??
    normalizeCurrency(result.budgetIntent.market.currency) ??
    normalizeCurrency(
      firstRecommendation?.metrics.selectedOffer?.currency
    );

  return {
    schemaVersion: SMARTSTAY_RECOMMENDATION_DECISION_TRACE_SCHEMA_V2,
    internalOnly: SMARTSTAY_RECOMMENDATION_DECISION_TRACE_INTERNAL_ONLY_V2,
    engineVersion: result.engineVersion,
    generatedAt: normalizeText(input.searchInput.capturedAt),
    context: {
      preferenceId: result.budgetIntent.preferenceId,
      preferenceSource: resolvePreferenceSource(input.searchInput),
      totalBudget: result.budgetIntent.totalBudget,
      budgetCurrency,
      nights: result.budgetIntent.nights,
      rooms: result.budgetIntent.rooms,
      budgetPerRoomNight: result.budgetIntent.budgetPerRoomNight,
      marketStatus: result.budgetIntent.status,
      marketMedianPerRoomNight: result.budgetIntent.market.median,
      marketBudgetPercentile: result.budgetIntent.market.budgetPercentile,
      reasonCodes: uniqueSorted([
        ...result.marketContext.reasonCodes,
        ...result.budgetIntent.reasonCodes,
      ]),
    },
    candidates: result.evaluations.map((evaluation) =>
      createCandidateTrace(evaluation, input, eligibleFullListHotelIds)
    ),
  };
}
