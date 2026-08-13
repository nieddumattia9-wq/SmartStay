import type {
  HotelOffer,
} from "../../types/hotel";

import {
  selectIntentAwareHotelOfferV2,
  type SmartStaySelectedOfferV2,
} from "../../engine-v2/offers/intentAwareOfferSelectionV2";

import type {
  SmartStayEngineV2SearchInput,
  SmartStayEngineV2SearchResult,
} from "../../engine-v2/orchestrator/smartStayEngineV2";

import type {
  SmartStayEvaluationV2,
} from "../../engine-v2/model/smartStayEvaluationV2";

import type {
  SmartStayRecommendationPickV2,
} from "../../engine-v2/recommendation/recommendationRolesEngine";

import {
  assertCommercialFirewallV3,
} from "../contract/commercialFirewallV3";

import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  createStableHashV3,
} from "../contract/stableHashV3";

import {
  assertStayOptiDecisionV3,
  type StayOptiDecisionCandidateV3,
  type StayOptiDecisionRoleV3,
  type StayOptiDecisionV3,
} from "../contract/stayOptiDecisionV3";

import type {
  StayCostCompletenessV3,
  StaySolutionCostV3,
  StaySolutionV3,
} from "../contract/staySolutionV3";

import {
  SMARTSTAY_DECISION_SCHEMA_VERSION_V3,
  SMARTSTAY_ENGINE_VERSION_V3,
  SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3,
  SMARTSTAY_POLICY_VERSION_V3,
  SMARTSTAY_V2_ADAPTER_VERSION_V3,
} from "../contract/versionsV3";

import {
  createDecisionFingerprintV3,
} from "../replay/decisionReplayV3";

export interface StayOptiV3CompatibilityPolicyInput {
  maximumTransitions?:
    1;

  temporalOptimizationMode?:
    "contract-only";

  publicSplitCardEnabled?:
    false;

  commercialFirewallMode?:
    "strict";
}

export interface AdaptV2SearchResultToDecisionV3Input {
  searchInput:
    SmartStayEngineV2SearchInput;

  result:
    SmartStayEngineV2SearchResult;

  policy?:
    StayOptiV3CompatibilityPolicyInput;
}

const DEFAULT_POLICY = {
  maximumTransitions:
    1,

  temporalOptimizationMode:
    "contract-only",

  publicSplitCardEnabled:
    false,

  commercialFirewallMode:
    "strict",
} as const;

const ROLE_ORDER:
  Readonly<
    Record<
      StayOptiDecisionRoleV3,
      number
    >
  > = {
  "best-choice":
    0,

  "best-sensible-saving":
    1,

  "worthwhile-comfort-upgrade":
    2,

  "split-saver":
    3,
};

function uniqueSorted(
  values:
    string[]
) {
  return [
    ...new Set(
      values.filter(
        Boolean
      )
    ),
  ].sort();
}

function normalizePositiveInteger(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    value > 0
    ? value
    : null;
}

function normalizeNonNegativeInteger(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    value >= 0
    ? value
    : null;
}

function normalizePositiveNumber(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
    ? value
    : null;
}

function normalizeCurrency(
  value:
    unknown
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const currency =
    value
      .trim()
      .toUpperCase();

  return /^[A-Z]{3}$/.test(
    currency
  )
    ? currency
    : null;
}

function normalizeIsoDate(
  value:
    unknown
) {
  if (
    typeof value !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      `${value}T00:00:00.000Z`
    );

  return Number.isFinite(
    timestamp
  )
    ? value
    : null;
}

function calculateNights(
  checkIn:
    string |
    null,
  checkOut:
    string |
    null
) {
  if (
    checkIn === null ||
    checkOut === null
  ) {
    return null;
  }

  const difference =
    Date.parse(
      `${checkOut}T00:00:00.000Z`
    ) -
    Date.parse(
      `${checkIn}T00:00:00.000Z`
    );

  const nights =
    difference /
    (
      24 *
      60 *
      60 *
      1000
    );

  return Number.isInteger(
    nights
  ) &&
    nights > 0
    ? nights
    : null;
}

function resolvePreferenceId(
  input:
    SmartStayEngineV2SearchInput
) {
  if (
    typeof input.preferenceId ===
      "string" &&
    input.preferenceId.trim()
  ) {
    return input.preferenceId
      .trim();
  }

  const byIndex = [
    "maximum-comfort",
    "comfort",
    "balanced",
    "savings",
    "maximum-savings",
  ] as const;

  return typeof input.selectedIndex ===
      "number" &&
    Number.isInteger(
      input.selectedIndex
    ) &&
    input.selectedIndex >=
      0 &&
    input.selectedIndex <
      byIndex.length
    ? byIndex[
        input.selectedIndex
      ]
    : "balanced";
}

function resolvePreferenceSource(
  input:
    SmartStayEngineV2SearchInput
) {
  if (
    input.preferenceSource
  ) {
    return input.preferenceSource;
  }

  return input.preferenceId ||
    input.selectedIndex !==
      null &&
    input.selectedIndex !==
      undefined
    ? "manual"
    : "default";
}

function resolvePolicy(
  input:
    StayOptiV3CompatibilityPolicyInput =
      {}
) {
  const policy = {
    maximumTransitions:
      input.maximumTransitions ??
      DEFAULT_POLICY
        .maximumTransitions,

    temporalOptimizationMode:
      input.temporalOptimizationMode ??
      DEFAULT_POLICY
        .temporalOptimizationMode,

    publicSplitCardEnabled:
      input.publicSplitCardEnabled ??
      DEFAULT_POLICY
        .publicSplitCardEnabled,

    commercialFirewallMode:
      input.commercialFirewallMode ??
      DEFAULT_POLICY
        .commercialFirewallMode,
  } as const;

  if (
    policy.maximumTransitions !==
      1 ||
    policy.temporalOptimizationMode !==
      "contract-only" ||
    policy.publicSplitCardEnabled !==
      false ||
    policy.commercialFirewallMode !==
      "strict"
  ) {
    throw new Error(
      "V3-01 compatibility policy must keep one transition maximum, contract-only temporal optimization, a hidden Split card and the strict commercial firewall."
    );
  }

  return policy;
}

function mapRole(
  role:
    SmartStayRecommendationPickV2[
      "role"
    ]
): StayOptiDecisionRoleV3 {
  return role;
}

function getRoleReasonCode(
  role:
    StayOptiDecisionRoleV3
): SmartStayReasonCodeV3 {
  if (
    role ===
      "best-choice"
  ) {
    return "role:best-choice";
  }

  if (
    role ===
      "best-sensible-saving"
  ) {
    return "role:best-sensible-saving";
  }

  if (
    role ===
      "worthwhile-comfort-upgrade"
  ) {
    return "role:worthwhile-comfort-upgrade";
  }

  return "role:split-saver";
}

function resolveSelectedOffer(
  pick:
    SmartStayRecommendationPickV2,
  evaluation:
    SmartStayEvaluationV2,
  preferenceId:
    string
) {
  return pick.metrics
    .selectedOffer ??
    selectIntentAwareHotelOfferV2(
      evaluation.hotel,
      {
        preferenceId,
      }
    ).selectedOffer;
}

function findSourceOffer(
  evaluation:
    SmartStayEvaluationV2,
  selectedOffer:
    SmartStaySelectedOfferV2
): HotelOffer | null {
  return evaluation.hotel
    .offers.find(
      (offer) =>
        offer.id ===
        selectedOffer.offerId
    ) ??
    null;
}

function mapCost(
  selectedOffer:
    SmartStaySelectedOfferV2,
  sourceOffer:
    HotelOffer |
    null
): StaySolutionCostV3 {
  return {
    amount:
      normalizePositiveNumber(
        selectedOffer.amount
      ),

    currency:
      normalizeCurrency(
        selectedOffer.currency
      ),

    completeness:
      selectedOffer
        .completeness as StayCostCompletenessV3,

    taxesIncluded:
      selectedOffer
        .taxesIncluded,

    includedTaxes:
      Math.max(
        0,
        sourceOffer
          ?.includedTaxes ??
          0
      ),

    excludedTaxes:
      Math.max(
        0,
        selectedOffer
          .excludedTaxes
      ),

    unknownTaxes:
      Math.max(
        0,
        selectedOffer
          .unknownTaxes
      ),
  };
}

function createSingleSolution(
  pick:
    SmartStayRecommendationPickV2,
  evaluation:
    SmartStayEvaluationV2,
  context: {
    checkIn:
      string |
      null;

    checkOut:
      string |
      null;

    nights:
      number |
      null;

    preferenceId:
      string;
  }
): StaySolutionV3 | null {
  const selectedOffer =
    resolveSelectedOffer(
      pick,
      evaluation,
      context.preferenceId
    );

  if (
    selectedOffer ===
      null
  ) {
    return null;
  }

  const nights =
    context.nights ??
    calculateNights(
      context.checkIn,
      context.checkOut
    );

  if (
    nights ===
      null
  ) {
    return null;
  }

  const sourceOffer =
    findSourceOffer(
      evaluation,
      selectedOffer
    );

  const cost =
    mapCost(
      selectedOffer,
      sourceOffer
    );

  const evidenceIds =
    uniqueSorted([
      ...pick.evidenceIds,
      ...evaluation.evidence.map(
        (fact) =>
          fact.id
      ),
    ]);

  const solutionId = [
    "solution",
    "single",
    evaluation.hotel.id,
    selectedOffer.offerId,
  ].join(
    ":"
  );

  const completeDates =
    context.checkIn !==
      null &&
    context.checkOut !==
      null;

  const feasible =
    selectedOffer.bookable &&
    cost.amount !==
      null &&
    cost.currency !==
      null &&
    cost.completeness ===
      "reported-complete" &&
    completeDates;

  return {
    solutionId,
    kind:
      "single",
    feasibility:
      feasible
        ? "feasible"
        : "incomplete",
    segments: [
      {
        segmentId:
          `${solutionId}:segment:0`,
        ordinal:
          0,
        checkIn:
          context.checkIn,
        checkOut:
          context.checkOut,
        nights,
        hotelId:
          evaluation.hotel.id,
        offerId:
          selectedOffer.offerId,
        roomName:
          selectedOffer.roomName,
        mealPlan:
          sourceOffer
            ?.mealPlan ??
          null,
        bookable:
          selectedOffer.bookable,
        recheckRequired:
          true,
        cost,
        evidenceIds,
      },
    ],
    transitionCount:
      0,
    checkIn:
      context.checkIn,
    checkOut:
      context.checkOut,
    totalNights:
      nights,
    totalCost:
      cost,
    evidenceIds,
  };
}

function comparePicks(
  first:
    SmartStayRecommendationPickV2,
  second:
    SmartStayRecommendationPickV2
) {
  return ROLE_ORDER[
    mapRole(
      first.role
    )
  ] -
      ROLE_ORDER[
        mapRole(
          second.role
        )
      ] ||
    first.groupPosition -
      second.groupPosition ||
    first.hotelId.localeCompare(
      second.hotelId
    );
}

export function adaptV2SearchResultToDecisionV3(
  input:
    AdaptV2SearchResultToDecisionV3Input
): StayOptiDecisionV3 {
  const policy =
    resolvePolicy(
      input.policy
    );

  const preferenceId =
    resolvePreferenceId(
      input.searchInput
    );

  const checkIn =
    normalizeIsoDate(
      input.searchInput
        .checkIn
    );

  const checkOut =
    normalizeIsoDate(
      input.searchInput
        .checkOut
    );

  const nights =
    normalizePositiveInteger(
      input.searchInput
        .nights
    ) ??
    calculateNights(
      checkIn,
      checkOut
    );

  const evaluationsByHotelId =
    new Map(
      input.result.evaluations.map(
        (evaluation) => [
          evaluation.hotel.id,
          evaluation,
        ]
      )
    );

  const solutions:
    StaySolutionV3[] =
      [];

  const candidates:
    StayOptiDecisionCandidateV3[] =
      [];

  const solutionIds =
    new Set<string>();

  const roleAssignments:
    StayOptiDecisionV3[
      "internalTrace"
    ]["roleAssignments"] =
      [];

  const picks = [
    ...input.result
      .recommendationRoles
      .picks,
  ].sort(
    comparePicks
  );

  for (
    const pick
    of picks
  ) {
    const evaluation =
      evaluationsByHotelId.get(
        pick.hotelId
      );

    if (!evaluation) {
      continue;
    }

    const solution =
      createSingleSolution(
        pick,
        evaluation,
        {
          checkIn,
          checkOut,
          nights,
          preferenceId,
        }
      );

    if (
      solution ===
        null ||
      solutionIds.has(
        solution.solutionId
      )
    ) {
      continue;
    }

    solutionIds.add(
      solution.solutionId
    );

    solutions.push(
      solution
    );

    const role =
      mapRole(
        pick.role
      );

    candidates.push({
      solutionId:
        solution.solutionId,
      role,
      eligible:
        true,
      utilityScore:
        pick.metrics
          .utilityScore,
      scoreConfidence:
        pick.metrics
          .scoreConfidence,
      evidenceCoverage:
        pick.metrics
          .evidenceCoverage,
      riskScore:
        pick.metrics
          .riskScore,
      riskLevel:
        evaluation.risk
          .level,
      paretoStatus:
        evaluation.pareto
          .status,
      rank:
        evaluation.final
          .rank,
      reasonCodes:
        uniqueReasonCodesV3([
          "adapter:from-v2",
          "solution:single",
          getRoleReasonCode(
            role
          ),
        ]),
      sourceReasonCodes:
        uniqueSorted(
          pick.reasonCodes
        ),
      evidenceIds:
        uniqueSorted([
          ...pick.evidenceIds,
          ...evaluation
            .explanation
            .evidenceIds,
        ]),
    });

    roleAssignments.push({
      solutionId:
        solution.solutionId,
      role,
      sourceReasonCodes:
        uniqueSorted(
          pick.reasonCodes
        ),
    });
  }

  const bestChoiceCandidate =
    candidates.find(
      (candidate) =>
        candidate.role ===
          "best-choice" &&
        candidate.eligible
    ) ??
    null;

  const recommendedSolutionId =
    bestChoiceCandidate
      ?.solutionId ??
    null;

  const bestAlternativeSolutionId =
    candidates.find(
      (candidate) =>
        candidate.solutionId !==
          recommendedSolutionId &&
        candidate.eligible
    )?.solutionId ??
    null;

  const recommendedSolution =
    recommendedSolutionId ===
      null
      ? null
      : solutions.find(
          (solution) =>
            solution.solutionId ===
            recommendedSolutionId
        ) ??
        null;

  const recommendedEvaluation =
    bestChoiceCandidate ===
      null
      ? null
      : evaluationsByHotelId.get(
          recommendedSolution
            ?.segments[0]
            ?.hotelId ??
            ""
        ) ??
        null;

  const status =
    recommendedSolutionId !==
      null
      ? "recommended"
      : input.result.evaluations.length >
          0
        ? "abstained"
        : "no-feasible-solution";

  const statusReasonCode:
    SmartStayReasonCodeV3 =
      status ===
        "recommended"
        ? "decision:recommended"
        : status ===
            "abstained"
          ? "decision:abstained"
          : "decision:no-feasible-solution";

  const context = {
    checkIn,
    checkOut,
    nights,
    adults:
      normalizePositiveInteger(
        input.searchInput
          .adults
      ),
    children:
      normalizeNonNegativeInteger(
        input.searchInput
          .children
      ),
    rooms:
      normalizePositiveInteger(
        input.searchInput
          .rooms
      ),
    totalBudget:
      normalizePositiveNumber(
        input.searchInput
          .totalBudget
      ),
    maximumDistanceKm:
      normalizePositiveNumber(
        input.searchInput
          .maximumDistanceKm
      ),
    currency:
      normalizeCurrency(
        input.searchInput
          .currency
      ) ??
      recommendedSolution
        ?.totalCost
        .currency ??
      null,
    preferenceId,
    preferenceSource:
      resolvePreferenceSource(
        input.searchInput
      ),
  };

  const inputFingerprint =
    createStableHashV3(
      {
        context,
        candidates:
          input.result.evaluations
            .map(
              (evaluation) => ({
                hotelId:
                  evaluation.hotel.id,
                utilityScore:
                  evaluation.final
                    .utilityScore,
                scoreConfidence:
                  evaluation.final
                    .scoreConfidence,
                riskScore:
                  evaluation.risk
                    .score,
                paretoStatus:
                  evaluation.pareto
                    .status,
                evidenceIds:
                  uniqueSorted(
                    evaluation.evidence.map(
                      (fact) =>
                        fact.id
                    )
                  ),
              })
            )
            .sort(
              (
                first,
                second
              ) =>
                first.hotelId.localeCompare(
                  second.hotelId
                )
            ),
      },
      "stayopti-v3-input"
    );

  const configHash =
    createStableHashV3(
      {
        policyVersion:
          SMARTSTAY_POLICY_VERSION_V3,
        policy,
      },
      "stayopti-v3-config"
    );

  const primaryEvidenceIds =
    uniqueSorted(
      recommendedEvaluation
        ?.explanation
        .strengthFacts
        .flatMap(
          (fact) =>
            fact.evidenceIds
        ) ??
      []
    );

  const tradeOffEvidenceIds =
    uniqueSorted(
      recommendedEvaluation
        ?.explanation
        .weaknessFacts
        .flatMap(
          (fact) =>
            fact.evidenceIds
        ) ??
      []
    );

  const decisionWithoutFingerprint:
    StayOptiDecisionV3 = {
    schemaVersion:
      SMARTSTAY_DECISION_SCHEMA_VERSION_V3,
    engineVersion:
      SMARTSTAY_ENGINE_VERSION_V3,
    policyVersion:
      SMARTSTAY_POLICY_VERSION_V3,
    evidenceSchemaVersion:
      SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3,
    adapterVersion:
      SMARTSTAY_V2_ADAPTER_VERSION_V3,
    configHash,
    mode:
      "compatibility-v2",
    status,
    context,
    coverage: {
      analyzedHotelCount:
        input.result.evaluations
          .length,
      mappedSolutionCount:
        solutions.length,
      eligibleHotelCount:
        input.result.evaluations.filter(
          (evaluation) =>
            evaluation
              .reliabilityGate
              .eligible
        ).length,
      evidenceFactCount:
        input.result.evaluations.reduce(
          (
            total,
            evaluation
          ) =>
            total +
            evaluation.evidence
              .length,
          0
        ),
      scopeLabel:
        "current-search-result-set",
    },
    solutions,
    candidates,
    recommendedSolutionId,
    bestAlternativeSolutionId,
    temporalOptimization: {
      status:
        "not-evaluated",
      maximumTransitions:
        1,
      splitSolutionId:
        null,
      grossSavingAmount:
        null,
      grossSavingRatio:
        null,
      switchingCost:
        null,
      addedRisk:
        null,
      friction:
        null,
      netValue:
        null,
      reasonCodes: [
        "temporal:not-evaluated",
      ],
    },
    robustness: {
      status:
        "not-evaluated",
      robustChoiceScore:
        null,
      expectedRegret:
        null,
      reasonCodes: [
        "robustness:not-evaluated",
      ],
    },
    outcomeLearning: {
      status:
        "not-instrumented",
      reasonCodes: [
        "outcome:not-instrumented",
      ],
    },
    counterfactuals: {
      comparisonCount:
        input.result
          .counterfactualComparisons
          .comparisons
          .length,
      exactThresholdsAvailable:
        false,
      reasonCodes: [
        "counterfactual:exact-thresholds-unavailable",
      ],
    },
    thesis: {
      titleKey:
        status ===
          "recommended"
          ? "stayopti.v3.decision.recommended"
          : "stayopti.v3.decision.abstained",
      recommendedSolutionId,
      bestAlternativeSolutionId,
      primaryEvidenceIds,
      tradeOffEvidenceIds,
      sourceReasonCodes:
        uniqueSorted(
          input.result
            .recommendationRoles
            .picks.find(
              (pick) =>
                pick.role ===
                "best-choice"
            )?.reasonCodes ??
          []
        ),
      exactSwitchThresholdAvailable:
        false,
    },
    replay: {
      inputFingerprint,
      decisionFingerprint:
        "fnv1a32-00000000",
    },
    reasonCodes:
      uniqueReasonCodesV3([
        "adapter:from-v2",
        "adapter:v2-evidence-bridged",
        "temporal:not-evaluated",
        "robustness:not-evaluated",
        "counterfactual:exact-thresholds-unavailable",
        "outcome:not-instrumented",
        "firewall:commercial-fields-absent",
        statusReasonCode,
      ]),
    internalTrace: {
      internalOnly:
        true,
      commerciallyNeutral:
        true,
      sourceEngineVersion:
        input.result
          .engineVersion,
      sourcePipelineVersion:
        input.result
          .pipelineVersion,
      candidateHotelIds:
        input.result.evaluations
          .map(
            (evaluation) =>
              evaluation.hotel.id
          )
          .sort(),
      roleAssignments:
        roleAssignments.sort(
          (
            first,
            second
          ) =>
            ROLE_ORDER[
              first.role
            ] -
              ROLE_ORDER[
                second.role
              ] ||
            first.solutionId.localeCompare(
              second.solutionId
            )
        ),
    },
  };

  assertCommercialFirewallV3(
    decisionWithoutFingerprint
  );

  const decision:
    StayOptiDecisionV3 = {
    ...decisionWithoutFingerprint,
    replay: {
      ...decisionWithoutFingerprint
        .replay,
      decisionFingerprint:
        createDecisionFingerprintV3(
          decisionWithoutFingerprint
        ),
    },
  };

  assertStayOptiDecisionV3(
    decision
  );

  return decision;
}
