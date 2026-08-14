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
  SMARTSTAY_CONTEXTUAL_STAY_VALUE_VERSION_V3,
  SMARTSTAY_DECISION_GEOMETRY_VERSION_V3,
  SMARTSTAY_DECISION_EXPLANATION_VERSION_V3,
  SMARTSTAY_DECISION_ROBUSTNESS_VERSION_V3,
  SMARTSTAY_ENGINE_VERSION_V3,
  SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3,
  SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3,
  SMARTSTAY_OUTCOME_DATA_LOOP_VERSION_V3,
  SMARTSTAY_PEER_INTELLIGENCE_VERSION_V3,
  SMARTSTAY_PERSONAL_UTILITY_VERSION_V3,
  SMARTSTAY_POLICY_VERSION_V3,
  SMARTSTAY_SEARCH_WIDE_SCALE_VERSION_V3,
  SMARTSTAY_V2_ADAPTER_VERSION_V3,
} from "../contract/versionsV3";

import {
  createDecisionFingerprintV3,
} from "../replay/decisionReplayV3";

import {
  createStayIntegrityCoverageReportV3,
} from "../integrity/integrityCoverageV3";

import {
  createStayOfferIntegritySnapshotV3,
  parseIsoDateV3,
  type StayOfferIntegritySnapshotV3,
} from "../integrity/stayOfferIntegrityV3";

import {
  evaluatePersonalUtilityV3,
  isStayOptiPreferenceIdV3,
  resolvePersonalPreferenceV3,
  type StayOptiTripTypeV3,
} from "../utility/personalUtilityV3";

import {
  evaluatePeerIntelligenceV3,
  type StayOptiPeerCandidateV3,
} from "../peer/peerIntelligenceV3";

import {
  evaluateDecisionGeometryV3,
} from "../geometry/decisionGeometryV3";

import {
  evaluateDecisionRobustnessV3,
} from "../robustness/decisionRobustnessV3";

import {
  evaluateContextualStayValueV3,
  type StayOptiContextualCapabilityInputV3,
  type StayOptiFrictionSignalInputV3,
} from "../contextual/contextualStayValueV3";

import {
  evaluateDecisionExplanationV3,
} from "../explanation/decisionExplanationV3";

import {
  evaluateSearchWideScaleCoverageV3,
} from "../scale/searchWideScaleCoverageV3";

import {
  createOutcomeDataLoopPlanV3,
} from "../outcome/outcomeDataLoopV3";

import {
  createEvaluationCalibrationPlanV3,
} from "../evaluation/evaluationCalibrationV3";

export interface StayOptiV3CompatibilityPolicyInput {
  maximumTransitions?:
    1;

  temporalOptimizationMode?:
    "contract-only";

  publicSplitCardEnabled?:
    false;

  commercialFirewallMode?:
    "strict";

  outcomeDataLoopMode?:
    "contract-only";

  outcomeCollectionEnabled?:
    false;

  evaluationCalibrationMode?:
    "offline-protocol-only";
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

  outcomeDataLoopMode:
    "contract-only",

  outcomeCollectionEnabled:
    false,

  evaluationCalibrationMode:
    "offline-protocol-only",
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

const CONTEXTUAL_CAPABILITY_PATTERNS: ReadonlyArray<{
  code: StayOptiContextualCapabilityInputV3["code"];
  pattern: RegExp;
}> = [
  { code: "kitchen", pattern: /\b(kitchen|kitchenette|cucina)\b/i },
  { code: "laundry", pattern: /\b(laundry|laundromat|lavanderia)\b/i },
  { code: "workspace", pattern: /\b(workspace|desk|business center|cowork)\b/i },
  { code: "family-room", pattern: /\b(family room|connecting room|interconnecting)\b/i },
  { code: "private-bathroom", pattern: /\b(private bathroom|ensuite|en suite)\b/i },
  { code: "crib", pattern: /\b(crib|cot|culla)\b/i },
  { code: "elevator", pattern: /\b(elevator|lift|ascensore)\b/i },
  { code: "front-desk", pattern: /\b(front desk|reception|receptionist)\b/i },
  { code: "luggage-storage", pattern: /\b(luggage storage|bag storage|deposito bagagli)\b/i },
  { code: "self-check-in", pattern: /\b(self check in|self-check-in|keyless entry)\b/i },
  { code: "air-conditioning", pattern: /\b(air conditioning|air-conditioned|a\/c|aria condizionata)\b/i },
];

function mapContextualCapabilities(
  evaluation:
    SmartStayEvaluationV2
) {
  const sourceText = [
    ...evaluation.hotel.amenities,
    ...evaluation.hotel.facilities,
  ].join(" | ");
  const evidenceIds = uniqueSorted([
    ...evaluation.scores.comfort.evidenceIds,
    ...evaluation.accommodation.evidenceIds,
  ]);
  const confidence = Math.min(
    1,
    Math.max(
      0,
      evaluation.scores.comfort.confidence
    )
  );

  return CONTEXTUAL_CAPABILITY_PATTERNS
    .filter(({ pattern }) => pattern.test(sourceText))
    .map(({ code }): StayOptiContextualCapabilityInputV3 => ({
      code,
      state: true,
      source: "provider-structured",
      confidence,
      evidenceIds,
    }));
}

function mapContextualFrictionSignals(
  capabilities:
    StayOptiContextualCapabilityInputV3[]
) {
  const mapping: Partial<Record<
    StayOptiContextualCapabilityInputV3["code"],
    {
      code: StayOptiFrictionSignalInputV3["code"];
      convenienceImpact: number;
      weight: number;
    }
  >> = {
    "front-desk": {
      code: "front-desk",
      convenienceImpact: 0.5,
      weight: 0.8,
    },
    "self-check-in": {
      code: "self-check-in",
      convenienceImpact: 0.45,
      weight: 0.7,
    },
    "luggage-storage": {
      code: "luggage-storage",
      convenienceImpact: 0.6,
      weight: 0.8,
    },
    elevator: {
      code: "elevator",
      convenienceImpact: 0.3,
      weight: 0.5,
    },
  };

  return capabilities.flatMap(
    (capability): StayOptiFrictionSignalInputV3[] => {
      const signal = mapping[capability.code];
      return signal === undefined
        ? []
        : [{
            ...signal,
            source: capability.source,
            confidence: capability.confidence,
            evidenceIds: capability.evidenceIds,
          }];
    }
  );
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
  return parseIsoDateV3(
    value
  )?.value ??
  null;
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
    isStayOptiPreferenceIdV3(
      input.preferenceId
    )
  ) {
    return input.preferenceId;
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

function resolveTripType(
  input:
    SmartStayEngineV2SearchInput,
  counts: {
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
  }
): StayOptiTripTypeV3 {
  if (
    input.tripProfile
  ) {
    return input.tripProfile;
  }

  if (
    (
      counts.children ??
      0
    ) > 0
  ) {
    return "family";
  }

  if (
    (
      counts.adults ??
      0
    ) >= 3 ||
    (
      counts.rooms ??
      0
    ) >= 2
  ) {
    return "group";
  }

  if (
    (
      counts.nights ??
      0
    ) >= 7
  ) {
    return "long-stay";
  }

  return "mixed";
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

    outcomeDataLoopMode:
      input.outcomeDataLoopMode ??
      DEFAULT_POLICY
        .outcomeDataLoopMode,

    outcomeCollectionEnabled:
      input.outcomeCollectionEnabled ??
      DEFAULT_POLICY
        .outcomeCollectionEnabled,

    evaluationCalibrationMode:
      input.evaluationCalibrationMode ??
      DEFAULT_POLICY
        .evaluationCalibrationMode,
  } as const;

  if (
    policy.maximumTransitions !==
      1 ||
    policy.temporalOptimizationMode !==
      "contract-only" ||
    policy.publicSplitCardEnabled !==
      false ||
    policy.commercialFirewallMode !==
      "strict" ||
    policy.outcomeDataLoopMode !==
      "contract-only" ||
    policy.outcomeCollectionEnabled !==
      false ||
    policy.evaluationCalibrationMode !==
      "offline-protocol-only"
  ) {
    throw new Error(
      "V3 compatibility policy must keep one transition maximum, contract-only temporal optimization and outcome learning, offline-only evaluation, hidden public cards, and strict safety firewalls."
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
  selectedOffer:
    SmartStaySelectedOfferV2,
  sourceOffer:
    HotelOffer |
    null,
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

function createCompatibilityIntegritySnapshot(
  evaluation:
    SmartStayEvaluationV2,
  selectedOffer:
    SmartStaySelectedOfferV2,
  sourceOffer:
    HotelOffer |
    null,
  scope: {
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
  }
) {
  const evidenceIds =
    uniqueSorted(
      evaluation.evidence.map(
        (fact) =>
          fact.id
      )
    );

  return createStayOfferIntegritySnapshotV3({
    hotelId:
      evaluation.hotel.id,
    offerId:
      selectedOffer.offerId,
    scope,
    roomName:
      selectedOffer.roomName,
    mealPlan:
      sourceOffer
        ?.mealPlan ??
      null,
    cancellation: {
      refundable:
        selectedOffer.refundable,
      freeCancellationUntil:
        selectedOffer
          .freeCancellationUntil,
      penaltyAmount:
        sourceOffer
          ?.cancellationPenalty ??
        null,
      penaltyCurrency:
        sourceOffer
          ?.cancellationPenaltyCurrency ??
        null,
      policyKnown:
        selectedOffer
          .cancellationPolicyKnown,
    },
    payment: {
      timing:
        "unknown",
      state:
        "unknown",
    },
    cost: {
      amount:
        selectedOffer.amount,
      currency:
        selectedOffer.currency,
      completeness:
        selectedOffer
          .completeness as StayCostCompletenessV3,
      taxesIncluded:
        selectedOffer
          .taxesIncluded,
      includedTaxes:
        sourceOffer
          ?.includedTaxes ??
        0,
      excludedTaxes:
        selectedOffer
          .excludedTaxes,
      unknownTaxes:
        selectedOffer
          .unknownTaxes,
      feeAmount:
        null,
      feeState:
        "unknown",
    },
    bookable:
      selectedOffer.bookable,
    recheckRequired:
      true,
    observedAt:
      null,
    freshness:
      "unknown",
    nightlyPrices:
      [],
    evidenceIds,
  });
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

  const adults =
    normalizePositiveInteger(
      input.searchInput
        .adults
    );

  const children =
    normalizeNonNegativeInteger(
      input.searchInput
        .children
    );

  const rooms =
    normalizePositiveInteger(
      input.searchInput
        .rooms
    );

  const tripType =
    resolveTripType(
      input.searchInput,
      {
        nights,
        adults,
        children,
        rooms,
      }
    );

  const resolvedPreferenceId =
    resolvePreferenceId(
      input.searchInput
    );

  const preferenceResolution =
    resolvePersonalPreferenceV3({
      preferenceId:
        resolvedPreferenceId,
      preferenceSource:
        resolvePreferenceSource(
          input.searchInput
        ),
      nights,
      adults,
      children,
      rooms,
      tripType,
    });

  const preferenceId =
    preferenceResolution
      .resolvedPreferenceId;

  const stayScope = {
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    rooms,
  };

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

  const integritySnapshotByOffer =
    new Map<
      string,
      StayOfferIntegritySnapshotV3
    >();

  const selectedOfferByHotelId =
    new Map<
      string,
      SmartStaySelectedOfferV2
    >();

  const sourceOfferByHotelId =
    new Map<
      string,
      HotelOffer |
      null
    >();

  const addIntegritySnapshot = (
    evaluation:
      SmartStayEvaluationV2,
    selectedOffer:
      SmartStaySelectedOfferV2,
    sourceOffer:
      HotelOffer |
      null
  ) => {
    const key =
      `${evaluation.hotel.id}\u0000${selectedOffer.offerId}`;

    const existing =
      integritySnapshotByOffer.get(
        key
      );

    if (
      existing
    ) {
      return existing;
    }

    const snapshot =
      createCompatibilityIntegritySnapshot(
        evaluation,
        selectedOffer,
        sourceOffer,
        stayScope
      );

    integritySnapshotByOffer.set(
      key,
      snapshot
    );

    return snapshot;
  };

  for (
    const evaluation
    of [
      ...input.result
        .evaluations,
    ].sort(
      (
        first,
        second
      ) =>
        first.hotel.id.localeCompare(
          second.hotel.id
        )
    )
  ) {
    const selectedOffer =
      selectIntentAwareHotelOfferV2(
        evaluation.hotel,
        {
          preferenceId,
        }
      ).selectedOffer;

    if (
      selectedOffer !==
        null
    ) {
      const sourceOffer =
        findSourceOffer(
          evaluation,
          selectedOffer
        );

      selectedOfferByHotelId.set(
        evaluation.hotel.id,
        selectedOffer
      );

      sourceOfferByHotelId.set(
        evaluation.hotel.id,
        sourceOffer
      );

      addIntegritySnapshot(
        evaluation,
        selectedOffer,
        sourceOffer
      );
    }
  }

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

    const selectedOffer =
      resolveSelectedOffer(
        pick,
        evaluation,
        preferenceId
      );

    if (
      selectedOffer ===
        null
    ) {
      continue;
    }

    const sourceOffer =
      findSourceOffer(
        evaluation,
        selectedOffer
      );

    selectedOfferByHotelId.set(
      evaluation.hotel.id,
      selectedOffer
    );

    sourceOfferByHotelId.set(
      evaluation.hotel.id,
      sourceOffer
    );

    addIntegritySnapshot(
      evaluation,
      selectedOffer,
      sourceOffer
    );

    const solution =
      createSingleSolution(
        pick,
        evaluation,
        selectedOffer,
        sourceOffer,
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
    adults,
    children,
    rooms,
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

  const scopeFingerprint =
    createStableHashV3(
      {
        checkIn,
        checkOut,
        nights,
        adults,
        children,
        rooms,
        currency:
          context.currency,
      },
      "stayopti-v3-peer-scope"
    );

  const sortedEvaluations = [
    ...input.result
      .evaluations,
  ].sort(
    (
      first,
      second
    ) =>
      first.hotel.id.localeCompare(
        second.hotel.id
      )
  );

  const peerCandidates:
    StayOptiPeerCandidateV3[] =
      sortedEvaluations.map(
        (evaluation) => {
          const selectedOffer =
            selectedOfferByHotelId.get(
              evaluation.hotel.id
            ) ??
            null;

          const sourceOffer =
            sourceOfferByHotelId.get(
              evaluation.hotel.id
            ) ??
            null;

          return {
            hotelId:
              evaluation.hotel.id,
            scopeFingerprint,
            destinationKey:
              input.searchInput
                .destinationKey
                ?.trim() ||
              [
                evaluation.hotel.city,
                evaluation.hotel.country,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ":"
                ) ||
              "unknown-destination",
            category:
              evaluation
                .accommodation
                .category,
            unitType:
              evaluation
                .accommodation
                .unitType,
            roomName:
              selectedOffer
                ?.roomName ??
              null,
            mealPlan:
              sourceOffer
                ?.mealPlan ??
              null,
            refundable:
              sourceOffer
                ?.refundable ??
              selectedOffer
                ?.refundable ??
              null,
            totalCost:
              selectedOffer ===
                null
                ? null
                : normalizePositiveNumber(
                    selectedOffer.amount
                  ),
            currency:
              selectedOffer ===
                null
                ? context.currency
                : normalizeCurrency(
                    selectedOffer.currency
                  ),
            qualityScore:
              evaluation.scores
                .quality.score,
            distanceKm:
              typeof evaluation
                .hotel.distance ===
                  "number" &&
                Number.isFinite(
                  evaluation.hotel
                    .distance
                ) &&
                evaluation.hotel
                  .distance >= 0
                ? evaluation.hotel
                    .distance
                : null,
            eligible:
              evaluation
                .reliabilityGate
                .eligible &&
              selectedOffer
                ?.bookable ===
                true,
            evidenceIds:
              uniqueSorted([
                ...evaluation.evidence.map(
                  (fact) =>
                    fact.id
                ),
                ...evaluation
                  .accommodation
                  .evidenceIds,
              ]),
          };
        }
      );

  const peerAssignments =
    evaluatePeerIntelligenceV3(
      peerCandidates
    );

  const utilityEvaluations =
    sortedEvaluations.map(
      (evaluation) => {
        const selectedOffer =
          selectedOfferByHotelId.get(
            evaluation.hotel.id
          ) ??
          null;

        const mapDimension = (
          dimension:
            | "priceValue"
            | "quality"
            | "location"
            | "comfort"
            | "flexibility"
            | "categoryFit"
            | "userFit"
        ) => {
          const source =
            evaluation.scores[
              dimension
            ];

          return {
            score:
              source.score,
            confidence:
              source.confidence,
            evidenceIds:
              source.evidenceIds,
          };
        };

        return evaluatePersonalUtilityV3({
          hotelId:
            evaluation.hotel.id,
          preference:
            preferenceResolution,
          context: {
            totalBudget:
              context.totalBudget,
            totalCost:
              selectedOffer ===
                null
                ? null
                : normalizePositiveNumber(
                    selectedOffer.amount
                  ),
            nights,
            adults,
            children,
            rooms,
            maximumDistanceKm:
              context.maximumDistanceKm,
            leadTimeDays:
              evaluation
                .flexibilityContext
                ?.leadTimeDays ??
              null,
            tripType,
          },
          dimensions: {
            priceValue:
              mapDimension(
                "priceValue"
              ),
            quality:
              mapDimension(
                "quality"
              ),
            location:
              mapDimension(
                "location"
              ),
            comfort:
              mapDimension(
                "comfort"
              ),
            flexibility:
              mapDimension(
                "flexibility"
              ),
            categoryFit:
              mapDimension(
                "categoryFit"
              ),
            userFit:
              mapDimension(
                "userFit"
              ),
          },
        });
      }
    );

  const utilityByHotelId =
    new Map(
      utilityEvaluations.map(
        (evaluation) => [
          evaluation.hotelId,
          evaluation,
        ]
      )
    );

  const peerAssignmentByHotelId =
    new Map(
      peerAssignments.map(
        (assignment) => [
          assignment.hotelId,
          assignment,
        ]
      )
    );

  const solutionIdByHotelId =
    new Map<string, string>();

  for (
    const solution
    of solutions
  ) {
    const hotelId =
      solution.kind ===
        "single"
        ? solution.segments[0]
            ?.hotelId ??
          null
        : null;

    if (
      hotelId !==
        null
    ) {
      solutionIdByHotelId.set(
        hotelId,
        solution.solutionId
      );
    }
  }

  const decisionGeometry =
    evaluateDecisionGeometryV3(
      sortedEvaluations.map(
        (evaluation) => {
          const hotelId =
            evaluation.hotel.id;

          const selectedOffer =
            selectedOfferByHotelId.get(
              hotelId
            ) ??
            null;

          const integritySnapshot =
            selectedOffer ===
              null
              ? null
              : integritySnapshotByOffer.get(
                  `${hotelId}\u0000${selectedOffer.offerId}`
                ) ??
                null;

          const utility =
            utilityByHotelId.get(
              hotelId
            );

          const peerAssignment =
            peerAssignmentByHotelId.get(
              hotelId
            );

          if (
            utility ===
              undefined ||
            peerAssignment ===
              undefined
          ) {
            throw new Error(
              `V3-04 geometry evidence is incomplete for ${hotelId}.`
            );
          }

          return {
            hotelId,
            solutionId:
              solutionIdByHotelId.get(
                hotelId
              ) ??
              null,
            eligible:
              evaluation
                .reliabilityGate
                .eligible &&
              selectedOffer
                ?.bookable ===
                true,
            totalCost:
              integritySnapshot
                ?.cost
                .total
                .amount ??
              null,
            currency:
              integritySnapshot
                ?.cost
                .total
                .currency ??
              null,
            costIntegrityStatus:
              integritySnapshot
                ?.cost
                .integrityStatus ??
              "incomplete",
            utility,
            peerAssignment,
          };
        }
      )
    );

  const solutionHotelId = (
    solutionId:
      string |
      null
  ) =>
    solutionId ===
      null
      ? null
      : solutions.find(
          (solution) =>
            solution.solutionId ===
              solutionId &&
            solution.kind ===
              "single"
        )?.segments[0]
          ?.hotelId ??
        null;

  const recommendedHotelId =
    solutionHotelId(
      recommendedSolutionId
    );

  const bestAlternativeHotelId =
    solutionHotelId(
      bestAlternativeSolutionId
    );

  const decisionRobustness =
    evaluateDecisionRobustnessV3({
      candidates:
        sortedEvaluations.map(
          (evaluation) => {
            const hotelId =
              evaluation.hotel.id;

            const selectedOffer =
              selectedOfferByHotelId.get(
                hotelId
              ) ??
              null;

            const integritySnapshot =
              selectedOffer ===
                null
                ? null
                : integritySnapshotByOffer.get(
                    `${hotelId}\u0000${selectedOffer.offerId}`
                  ) ??
                  null;

            const utility =
              utilityByHotelId.get(
                hotelId
              );

            const geometry =
              decisionGeometry
                .candidates
                .find(
                  (candidate) =>
                    candidate.hotelId ===
                      hotelId
                );

            if (
              utility ===
                undefined ||
              geometry ===
                undefined
            ) {
              throw new Error(
                `V3-05 robustness evidence is incomplete for ${hotelId}.`
              );
            }

            return {
              hotelId,
              solutionId:
                solutionIdByHotelId.get(
                  hotelId
                ) ??
                null,
              eligible:
                evaluation
                  .reliabilityGate
                  .eligible &&
                selectedOffer
                  ?.bookable ===
                  true,
              utility,
              geometry,
              offerSnapshot:
                integritySnapshot,
              sourceRiskScore:
                evaluation.risk
                  .score,
              sourceRiskLevel:
                evaluation.risk
                  .level,
            };
          }
        ),
      decisionGeometry,
      anchorHotelId:
        recommendedHotelId,
      constraintRelaxations:
        [],
    });

  const contextualStayValue =
    evaluateContextualStayValueV3({
      context: {
        preferenceId,
        tripType,
        nights,
        adults,
        children,
        rooms,
        leadTimeDays:
          sortedEvaluations.find(
            (evaluation) =>
              evaluation.flexibilityContext
                ?.leadTimeDays !==
                null &&
              evaluation.flexibilityContext
                ?.leadTimeDays !==
                undefined
          )?.flexibilityContext
            ?.leadTimeDays ??
          null,
        destination:
          null,
      },
      candidates:
        sortedEvaluations.map(
          (evaluation) => {
            const hotelId =
              evaluation.hotel.id;
            const selectedOffer =
              selectedOfferByHotelId.get(
                hotelId
              ) ??
              null;
            const integritySnapshot =
              selectedOffer ===
                null
                ? null
                : integritySnapshotByOffer.get(
                    `${hotelId}\u0000${selectedOffer.offerId}`
                  ) ??
                  null;
            const capabilities =
              mapContextualCapabilities(
                evaluation
              );
            const totalCost =
              integritySnapshot
                ?.cost.total.amount ??
              null;
            const currency =
              integritySnapshot
                ?.cost.total.currency ??
              null;
            const snapshotEvidenceIds =
              uniqueSorted(
                integritySnapshot
                  ?.evidenceIds ??
                []
              );
            const cancellationStateKnown =
              integritySnapshot
                ?.cancellation.state ===
                "known";
            const paymentStateKnown =
              integritySnapshot
                ?.payment.state ===
                "known";
            const canonicalPaymentTiming =
              integritySnapshot
                ?.payment.timing;
            const paymentTiming =
              canonicalPaymentTiming ===
                "pay-now" ||
              canonicalPaymentTiming ===
                "pay-later"
                ? canonicalPaymentTiming
                : "unknown";

            return {
              hotelId,
              totalCost,
              currency,
              straightLineDistanceKm:
                typeof evaluation.hotel
                  .distance ===
                  "number" &&
                Number.isFinite(
                  evaluation.hotel
                    .distance
                ) &&
                evaluation.hotel
                  .distance >=
                  0
                  ? evaluation.hotel
                      .distance
                  : null,
              straightLineEvidenceIds:
                uniqueSorted(
                  evaluation.scores
                    .location
                    .evidenceIds
                ),
              travelPoints:
                [],
              selectedRoom:
                selectedOffer ===
                  null
                  ? null
                  : {
                      offerId:
                        selectedOffer
                          .offerId,
                      roomName:
                        selectedOffer
                          .roomName,
                      totalCost:
                        normalizePositiveNumber(
                          selectedOffer.amount
                        ),
                      currency:
                        normalizeCurrency(
                          selectedOffer.currency
                        ),
                      bookable:
                        selectedOffer
                          .bookable,
                      comparisonScopeFingerprint:
                        scopeFingerprint,
                      tierRank:
                        selectedOffer
                          .roomTierRank >
                          0
                          ? selectedOffer
                              .roomTierRank
                          : null,
                      tierSource:
                        "semantic-inference" as const,
                      attributes:
                        [],
                      evidenceIds:
                        snapshotEvidenceIds,
                    },
              roomAlternatives:
                [],
              cancellation:
                integritySnapshot ===
                  null
                  ? null
                  : {
                      policyKnown:
                        cancellationStateKnown,
                      refundable:
                        integritySnapshot
                          .cancellation
                          .status ===
                          "refundable"
                          ? true
                          : integritySnapshot
                              .cancellation
                              .status ===
                              "non-refundable"
                            ? false
                            : null,
                      freeCancellationUntil:
                        integritySnapshot
                          .cancellation
                          .freeCancellationUntil,
                      penaltyAmount:
                        integritySnapshot
                          .cancellation
                          .penaltyAmount,
                      penaltyCurrency:
                        integritySnapshot
                          .cancellation
                          .penaltyCurrency,
                      changeProbability:
                        null,
                      source:
                        cancellationStateKnown
                          ? "provider-structured" as const
                          : "unverified" as const,
                      confidence:
                        cancellationStateKnown
                          ? 0.8
                          : 0,
                      evidenceIds:
                        snapshotEvidenceIds,
                    },
              payment:
                integritySnapshot ===
                  null
                  ? null
                  : {
                      timing:
                        paymentTiming,
                      deferralDays:
                        null,
                      annualValueRate:
                        null,
                      source:
                        paymentStateKnown
                          ? "provider-structured" as const
                          : "unverified" as const,
                      confidence:
                        paymentStateKnown
                          ? 0.8
                          : 0,
                      evidenceIds:
                        snapshotEvidenceIds,
                    },
              capabilities,
              frictionSignals:
                mapContextualFrictionSignals(
                  capabilities
                ),
              evidenceIds:
                uniqueSorted([
                  ...evaluation.evidence.map(
                    (fact) =>
                      fact.id
                  ),
                  ...snapshotEvidenceIds,
                ]),
            };
          }
        ),
    });

  const robustnessCandidateByHotelId =
    new Map(
      decisionRobustness
        .candidates
        .map(
          (candidate) => [
            candidate.hotelId,
            candidate,
          ]
        )
    );

  const protectedScaleHotelIds =
    new Set<string>(
      [
        recommendedHotelId,
        bestAlternativeHotelId,
        decisionRobustness
          .robustChoiceHotelId,
        ...solutions.flatMap(
          (solution) =>
            solution.segments.map(
              (segment) =>
                segment.hotelId
            )
        ),
      ].filter(
        (
          hotelId
        ): hotelId is string =>
          hotelId !==
          null
      )
    );

  const searchWideScaleCoverage =
    evaluateSearchWideScaleCoverageV3({
      sourceSetCompleteness:
        "unknown",
      sourceReportedHotelCount:
        null,
      candidates:
        sortedEvaluations.map(
          (evaluation) => {
            const hotelId =
              evaluation.hotel.id;
            const robustnessCandidate =
              robustnessCandidateByHotelId.get(
                hotelId
              );
            const utility =
              utilityByHotelId.get(
                hotelId
              );
            const selectedOffer =
              selectedOfferByHotelId.get(
                hotelId
              ) ??
              null;
            const fullDecisionScore =
              robustnessCandidate
                ?.riskAdjustedUtility ??
              null;
            const coarseScoreLowerBound =
              robustnessCandidate
                ?.downsideUtility ??
              null;
            const coarseScoreUpperBound =
              fullDecisionScore ===
                null ||
              robustnessCandidate ===
                undefined
                ? null
                : Math.min(
                    100,
                    fullDecisionScore +
                      robustnessCandidate
                        .uncertaintyWidth
                  );

            return {
              hotelId,
              eligible:
                evaluation
                  .reliabilityGate
                  .eligible &&
                selectedOffer
                  ?.bookable ===
                  true,
              coarseScoreLowerBound,
              coarseScoreUpperBound,
              fullDecisionScore,
              evidenceCoverage:
                utility
                  ?.evidenceCoverage ??
                0,
              protectedByPolicy:
                protectedScaleHotelIds.has(
                  hotelId
                ),
            };
          }
        ),
    });

  const preferenceReasonCode:
    SmartStayReasonCodeV3 =
      preferenceResolution.origin ===
        "declared"
        ? "preference:declared"
        : preferenceResolution.origin ===
            "inferred"
          ? "preference:inferred"
          : "preference:neutral-default";

  const peerReasonCodes:
    SmartStayReasonCodeV3[] =
      peerAssignments.map(
        (assignment) =>
          assignment.mode ===
            "exact-context"
            ? "peer:exact-context"
            : assignment.mode ===
                "compatible-context"
              ? "peer:compatible-context"
              : assignment.mode ===
                  "declared-fallback"
                ? "peer:declared-fallback"
                : "peer:unavailable"
      );

  const personalizationReasonCodes =
    uniqueReasonCodesV3([
      preferenceReasonCode,
      "utility:shadow-only",
      ...(
        utilityEvaluations.some(
          (evaluation) =>
            evaluation.status ===
              "usable"
        )
          ? [
              "utility:evaluated" as const,
              "utility:non-linear" as const,
              "utility:budget-no-spend-bias" as const,
            ]
          : [
              "utility:unavailable" as const,
            ]
      ),
      ...peerReasonCodes,
    ]);

  const offerIntegritySnapshots = [
    ...integritySnapshotByOffer
      .values(),
  ].sort(
    (
      first,
      second
    ) =>
      first.snapshotId.localeCompare(
        second.snapshotId
      )
  );

  const integrityCoverage =
    createStayIntegrityCoverageReportV3({
      analyzedHotelCount:
        input.result.evaluations
          .length,
      snapshots:
        offerIntegritySnapshots,
      publicRatesConsistency:
        "unverified",
    });

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
        offerIntegritySnapshotIds:
          offerIntegritySnapshots.map(
            (snapshot) =>
              snapshot.snapshotId
          ),
        preferenceResolution,
        utilityEvaluationFingerprints:
          utilityEvaluations.map(
            (evaluation) =>
              evaluation.fingerprint
          ),
        peerAssignmentFingerprints:
          peerAssignments.map(
            (assignment) =>
              assignment.fingerprint
          ),
        decisionGeometryFingerprint:
          decisionGeometry
            .fingerprint,
        decisionRobustnessFingerprint:
          decisionRobustness
            .fingerprint,
        contextualStayValueFingerprint:
          contextualStayValue
            .fingerprint,
        searchWideScaleCoverageFingerprint:
          searchWideScaleCoverage
            .fingerprint,
      },
      "stayopti-v3-input"
    );

  const outcomeDataLoop =
    createOutcomeDataLoopPlanV3({
      sourceDecisionInputFingerprint:
        inputFingerprint,
    });

  const evaluationCalibration =
    createEvaluationCalibrationPlanV3({
      sourceDecisionInputFingerprint:
        inputFingerprint,
    });

  const configHash =
    createStableHashV3(
      {
        policyVersion:
          SMARTSTAY_POLICY_VERSION_V3,
        personalUtilityVersion:
          SMARTSTAY_PERSONAL_UTILITY_VERSION_V3,
        peerIntelligenceVersion:
          SMARTSTAY_PEER_INTELLIGENCE_VERSION_V3,
        decisionGeometryVersion:
          SMARTSTAY_DECISION_GEOMETRY_VERSION_V3,
        decisionRobustnessVersion:
          SMARTSTAY_DECISION_ROBUSTNESS_VERSION_V3,
        contextualStayValueVersion:
          SMARTSTAY_CONTEXTUAL_STAY_VALUE_VERSION_V3,
        decisionExplanationVersion:
          SMARTSTAY_DECISION_EXPLANATION_VERSION_V3,
        searchWideScaleVersion:
          SMARTSTAY_SEARCH_WIDE_SCALE_VERSION_V3,
        outcomeDataLoopVersion:
          SMARTSTAY_OUTCOME_DATA_LOOP_VERSION_V3,
        evaluationCalibrationVersion:
          SMARTSTAY_EVALUATION_CALIBRATION_VERSION_V3,
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

  const sourceRoleReasonCodes =
    uniqueSorted(
      input.result
        .recommendationRoles
        .picks.find(
          (pick) =>
            pick.role ===
            "best-choice"
        )?.reasonCodes ??
      []
    );

  const decisionExplanation =
    evaluateDecisionExplanationV3({
      solutionMappings:
        solutions.flatMap(
          (solution) => {
            const hotelId =
              solution.segments[0]
                ?.hotelId ??
              null;

            return hotelId ===
              null
              ? []
              : [{
                  hotelId,
                  solutionId:
                    solution.solutionId,
                }];
          }
        ),
      preferredAlternativeHotelId:
        bestAlternativeHotelId,
      utilityEvaluations,
      decisionGeometry,
      decisionRobustness,
      contextualStayValue,
      legacyPrimaryEvidenceIds:
        primaryEvidenceIds,
      legacyTradeOffEvidenceIds:
        tradeOffEvidenceIds,
      sourceReasonCodes:
        sourceRoleReasonCodes,
    });

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
    integrity: {
      phase:
        "v3-02",
      offerSnapshots:
        offerIntegritySnapshots,
      coverage:
        integrityCoverage,
      recheckPolicy: {
        requiredBeforeHandoff:
          true,
        materialChangeRequiresUserConfirmation:
          true,
        materialChangeRequiresDecisionReplay:
          true,
      },
      reasonCodes:
        uniqueReasonCodesV3([
          ...integrityCoverage
            .reasonCodes,
          ...(
            offerIntegritySnapshots.length >
              0
              ? [
                  "integrity:offer-canonicalized" as const,
                ]
              : []
          ),
        ]),
    },
    personalization: {
      phase:
        "v3-03",
      rankingApplication:
        "shadow-only",
      preference:
        preferenceResolution,
      utilityEvaluations,
      peerAssignments,
      reasonCodes:
        personalizationReasonCodes,
    },
    decisionGeometry,
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
    robustness:
      decisionRobustness,
    contextualStayValue,
    searchWideScaleCoverage,
    outcomeLearning:
      outcomeDataLoop,
    evaluationCalibration,
    counterfactuals: {
      comparisonCount:
        input.result
          .counterfactualComparisons
          .comparisons
          .length,
      exactThresholdsAvailable:
        decisionGeometry
          .exactThresholdCount >
        0,
      reasonCodes: [
        decisionGeometry
          .exactThresholdCount >
          0
          ? "counterfactual:exact-thresholds-available"
          : "counterfactual:exact-thresholds-unavailable",
      ],
    },
    thesis:
      decisionExplanation,
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
        ...decisionRobustness
          .reasonCodes,
        ...contextualStayValue
          .reasonCodes,
        ...decisionExplanation
          .reasonCodes,
        ...searchWideScaleCoverage
          .reasonCodes,
        ...decisionGeometry
          .reasonCodes,
        ...(
          decisionGeometry
            .exactThresholdCount >
            0
            ? [
                "counterfactual:exact-thresholds-available" as const,
              ]
            : [
                "counterfactual:exact-thresholds-unavailable" as const,
              ]
        ),
        ...outcomeDataLoop
          .reasonCodes,
        ...evaluationCalibration
          .reasonCodes,
        "firewall:commercial-fields-absent",
        ...integrityCoverage
          .reasonCodes,
        ...personalizationReasonCodes,
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
      offerSnapshotIds:
        offerIntegritySnapshots.map(
          (snapshot) =>
            snapshot.snapshotId
        ),
      utilityEvaluationIds:
        utilityEvaluations.map(
          (evaluation) =>
            evaluation.evaluationId
        ).sort(),
      peerAssignmentIds:
        peerAssignments.map(
          (assignment) =>
            assignment.assignmentId
        ).sort(),
      decisionGeometryEvaluationId:
        decisionGeometry
          .evaluationId,
      decisionRobustnessEvaluationId:
        decisionRobustness
          .evaluationId,
      contextualStayValueEvaluationId:
        contextualStayValue
          .evaluationId,
      decisionExplanationEvaluationId:
        decisionExplanation
          .evaluationId,
      searchWideScaleCoverageEvaluationId:
        searchWideScaleCoverage
          .evaluationId,
      outcomeDataLoopEvaluationId:
        outcomeDataLoop
          .evaluationId,
      evaluationCalibrationEvaluationId:
        evaluationCalibration
          .evaluationId,
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
