import type {
  Hotel,
} from "../../types/hotel";

import {
  classifyAccommodationV2,
} from "../categories/accommodationCategoryModel";

import type {
  SmartStayAccommodationFeatureCodeV2,
} from "../categories/accommodationCategoryModel";

import {
  buildHotelEvidenceModelV2,
} from "../evidence/hotelEvidenceModel";

import {
  evaluateReliabilityGateV2,
} from "../reliability/reliabilityGate";

import {
  buildPeerGroupsV2,
} from "../peer-groups/peerGroupModel";

import type {
  SmartStayPeerGroupAssignmentV2,
} from "../peer-groups/peerGroupModel";

import {
  evaluatePriceValueV2,
} from "../price-value/priceValueEngine";

import type {
  SmartStayPriceValueEvaluationV2,
} from "../price-value/priceValueEngine";

import {
  evaluateQualityV2,
} from "../quality/qualityEngine";

import type {
  SmartStayQualityEvaluationV2,
} from "../quality/qualityEngine";

import {
  evaluateLocationV2,
} from "../location/locationEngine";

import type {
  SmartStayGeoPointV2,
  SmartStayLocationEvaluationV2,
} from "../location/locationEngine";

import {
  evaluateComfortFlexibilityV2,
} from "../comfort/comfortFlexibilityEngine";

import type {
  SmartStayComfortFlexibilityEvaluationV2,
  SmartStayComfortPreferencesV2,
  SmartStayTripProfileV2,
} from "../comfort/comfortFlexibilityEngine";

import {
  evaluateDataConfidenceV2,
} from "../risk/dataConfidenceEngine";

import type {
  SmartStayDataConfidenceEvaluationV2,
} from "../risk/dataConfidenceEngine";

import {
  evaluateRiskV2,
} from "../risk/riskEngine";

import type {
  SmartStayRiskEvaluationV2,
} from "../risk/riskEngine";

import {
  evaluateUserUtilityV2,
} from "../utility/userUtilityEngine";

import type {
  SmartStayUserUtilityEvaluationV2,
  SmartStayUtilityPreferenceIdV2,
  SmartStayUtilityPreferenceSourceV2,
} from "../utility/userUtilityEngine";

import {
  evaluateParetoFrontierV2,
} from "../pareto/paretoFrontierEngine";

import type {
  SmartStayParetoCandidateEvaluationV2,
  SmartStayParetoFrontierEvaluationV2,
} from "../pareto/paretoFrontierEngine";

import {
  evaluateRecommendationRolesV2,
} from "../recommendation/recommendationRolesEngine";

import {
  evaluateBudgetIntentV2,
} from "../intent/budgetIntentEngine";

import type {
  SmartStayBudgetIntentEvaluationV2,
} from "../intent/budgetIntentEngine";

import {
  evaluateMarketContextV2,
} from "../market-context/marketContextEngine";

import type {
  SmartStayMarketContextModeV2,
  SmartStayMarketContextObservationV2,
  SmartStayMarketContextSnapshotV2,
} from "../market-context/marketContextModel";

import {
  SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_V2,
} from "../market-context/localMarketContextSeedV2";

import type {
  SmartStayRecommendationEvaluationV2,
  SmartStayRecommendationRolesEvaluationV2,
} from "../recommendation/recommendationRolesEngine";

import {
  evaluateEvidenceBasedExplanationsV2,
} from "../explanations/evidenceBasedExplanationsEngine";

import type {
  SmartStayEvidenceBasedExplanationEvaluationV2,
  SmartStayEvidenceBasedExplanationsEvaluationV2,
} from "../explanations/evidenceBasedExplanationsEngine";

import {
  evaluateCounterfactualComparisonsV2,
} from "../comparisons/counterfactualComparisonsEngine";

import type {
  SmartStayCounterfactualComparisonsEvaluationV2,
} from "../comparisons/counterfactualComparisonsEngine";

import {
  evaluateRankingStabilityDiversityV2,
} from "../ranking/rankingStabilityDiversityEngine";

import type {
  SmartStayRankingCandidateEvaluationV2,
  SmartStayRankingStabilityDiversityEvaluationV2,
} from "../ranking/rankingStabilityDiversityEngine";

import {
  evaluateBookingFlexibilityContextV2,
} from "../flexibility/bookingFlexibilityContextEngine";


import {
  SMARTSTAY_ENGINE_V2_VERSION,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayConstraintEvaluationV2,
  SmartStayDimensionScoreV2,
  SmartStayEvaluationV2,
  SmartStayScoreBreakdownV2,
} from "../model/smartStayEvaluationV2";

export const SMARTSTAY_ENGINE_V2_PIPELINE_VERSION =
  "2.0.0-pipeline.10" as const;

export interface SmartStayEngineV2SearchInput {
  hotels:
    Hotel[];

  preferenceId?:
    SmartStayUtilityPreferenceIdV2 |
    string |
    null;

  selectedIndex?:
    number |
    null;

  preferenceSource?:
    SmartStayUtilityPreferenceSourceV2;

  totalBudget?:
    number |
    null;

  maximumDistanceKm?:
    number |
    null;

  selectedLocation?:
    SmartStayGeoPointV2 |
    null;

  nights?:
    number |
    null;

  adults?:
    number |
    null;

  children?:
    number |
    null;

  rooms?:
    number |
    null;

  tripProfile?:
    SmartStayTripProfileV2;

  comfortPreferences?:
    SmartStayComfortPreferencesV2;

  previousRankingHotelIds?:
    string[];

  maximumVisibleResults?:
    number;

  capturedAt?:
    string |
    null;

  bookingReferenceAt?:
    string |
    null;

  destinationKey?:
    string |
    null;

  currency?:
    string |
    null;

  checkIn?:
    string |
    null;

  checkOut?:
    string |
    null;

  marketContextMode?:
    SmartStayMarketContextModeV2;

  marketContextObservations?:
    readonly SmartStayMarketContextObservationV2[];
}

export interface SmartStayEngineV2SearchResult {
  engineVersion:
    typeof SMARTSTAY_ENGINE_V2_VERSION;

  pipelineVersion:
    typeof SMARTSTAY_ENGINE_V2_PIPELINE_VERSION;

  evaluations:
    SmartStayEvaluationV2[];

  marketContext:
    SmartStayMarketContextSnapshotV2;

  budgetIntent:
    SmartStayBudgetIntentEvaluationV2;

  paretoFrontier:
    SmartStayParetoFrontierEvaluationV2;

  recommendationRoles:
    SmartStayRecommendationRolesEvaluationV2;

  explanations:
    SmartStayEvidenceBasedExplanationsEvaluationV2;

  counterfactualComparisons:
    SmartStayCounterfactualComparisonsEvaluationV2;

  ranking:
    SmartStayRankingStabilityDiversityEvaluationV2;
}

interface FoundationCandidate {
  hotel:
    Hotel;

  accommodation:
    ReturnType<
      typeof classifyAccommodationV2
    >;

  evidence:
    ReturnType<
      typeof buildHotelEvidenceModelV2
    >;

  reliabilityGate:
    ReturnType<
      typeof evaluateReliabilityGateV2
    >;
}

interface DimensionCandidate
  extends FoundationCandidate {
  peerGroupAssignment:
    SmartStayPeerGroupAssignmentV2;

  priceValue:
    SmartStayPriceValueEvaluationV2;

  quality:
    SmartStayQualityEvaluationV2;

  location:
    SmartStayLocationEvaluationV2;

  comfortFlexibility:
    SmartStayComfortFlexibilityEvaluationV2;

  dataConfidence:
    SmartStayDataConfidenceEvaluationV2;

  risk:
    SmartStayRiskEvaluationV2;

  scores:
    SmartStayScoreBreakdownV2;

  utility:
    SmartStayUserUtilityEvaluationV2;

  eligibleForPrimaryRanking:
    boolean;

  exclusionReasonCodes:
    string[];
}

function clamp(
  value:
    number,
  minimum:
    number,
  maximum:
    number
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}

function round(
  value:
    number,
  decimalPlaces =
    2
) {
  const factor =
    10 ** decimalPlaces;

  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
      factor
    ) /
    factor
  );
}

function uniqueSorted(
  values:
    string[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort();
}

function normalizeOptionalPositiveNumber(
  value:
    unknown
) {
  return (
    typeof value === "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
  )
    ? value
    : null;
}

function normalizeOptionalPositiveInteger(
  value:
    unknown
) {
  return (
    typeof value === "number" &&
    Number.isInteger(
      value
    ) &&
    value > 0
  )
    ? value
    : null;
}

function resolveOfferSelectionPreferenceId(
  input:
    SmartStayEngineV2SearchInput
) {
  const supportedPreferenceIds =
    new Set([
      "maximum-comfort",
      "comfort",
      "balanced",
      "savings",
      "maximum-savings",
    ]);

  if (
    typeof input.preferenceId ===
      "string" &&
    supportedPreferenceIds.has(
      input.preferenceId
    )
  ) {
    return input.preferenceId;
  }

  const selectedIndexMap = [
    "maximum-comfort",
    "comfort",
    "balanced",
    "savings",
    "maximum-savings",
  ] as const;

  return (
    typeof input.selectedIndex ===
      "number" &&
    Number.isInteger(
      input.selectedIndex
    ) &&
    input.selectedIndex >=
      0 &&
    input.selectedIndex <
      selectedIndexMap.length
  )
    ? selectedIndexMap[
        input.selectedIndex
      ]
    : "balanced";
}

function normalizeOptionalNonNegativeInteger(
  value:
    unknown
) {
  return (
    typeof value === "number" &&
    Number.isInteger(
      value
    ) &&
    value >= 0
  )
    ? value
    : null;
}

function normalizeMaximumVisibleResults(
  value:
    unknown,
  hotelCount:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(
      value
    ) ||
    value <= 0
  ) {
    return Math.max(
      Math.min(
        hotelCount,
        12
      ),
      1
    );
  }

  return Math.max(
    Math.min(
      value,
      Math.max(
        hotelCount,
        1
      )
    ),
    1
  );
}

function validateHotels(
  hotels:
    Hotel[]
) {
  const hotelIds =
    hotels.map(
      (hotel) =>
        hotel.id.trim()
    );

  if (
    hotelIds.some(
      (hotelId) =>
        !hotelId
    )
  ) {
    throw new Error(
      "SmartStay Engine V2 requires every hotel to have a non-empty id."
    );
  }

  if (
    new Set(
      hotelIds
    ).size !==
    hotelIds.length
  ) {
    throw new Error(
      "SmartStay Engine V2 received duplicate hotel ids."
    );
  }
}

function createDimension(
  score:
    number |
    null,
  confidence:
    number,
  signalCodes:
    string[],
  evidenceIds:
    string[]
): SmartStayDimensionScoreV2 {
  return {
    score:
      score === null
        ? null
        : round(
            clamp(
              score,
              0,
              100
            )
          ),

    confidence:
      round(
        clamp(
          confidence,
          0,
          1
        ),
        4
      ),

    signalCodes:
      uniqueSorted(
        signalCodes
      ),

    evidenceIds:
      uniqueSorted(
        evidenceIds
      ),
  };
}

function createCategoryFitDimension(
  candidate:
    FoundationCandidate
) {
  const accommodation =
    candidate
      .accommodation
      .profile;

  const available =
    accommodation.category !==
      "unknown" ||
    accommodation.unitType !==
      "unknown";

  return createDimension(
    available
      ? accommodation.confidence *
        100
      : null,
    available
      ? accommodation.confidence
      : 0,
    [
      ...candidate
        .accommodation
        .matchedCategoryCodes,
      ...candidate
        .accommodation
        .matchedUnitTypeCodes,
    ],
    accommodation.evidenceIds
  );
}

function weightedAvailableScore(
  values:
    Array<{
      score:
        number |
        null;

      confidence:
        number;

      weight:
        number;

      evidenceIds:
        string[];
    }>
) {
  const available =
    values.filter(
      (value) =>
        value.score !== null &&
        value.weight > 0
    );

  const totalWeight =
    available.reduce(
      (
        total,
        value
      ) =>
        total +
        value.weight,
      0
    );

  if (totalWeight <= 0) {
    return {
      score:
        null,

      confidence:
        0,

      evidenceIds:
        [] as string[],
    };
  }

  const score =
    available.reduce(
      (
        total,
        value
      ) =>
        total +
        (
          value.score ??
          0
        ) *
        value.weight,
      0
    ) /
    totalWeight;

  const confidence =
    available.reduce(
      (
        total,
        value
      ) =>
        total +
        value.confidence *
        value.weight,
      0
    ) /
    totalWeight;

  return {
    score:
      round(
        score
      ),

    confidence:
      round(
        confidence,
        4
      ),

    evidenceIds:
      uniqueSorted(
        available.flatMap(
          (value) =>
            value.evidenceIds
        )
      ),
  };
}

function createUserFitDimension(
  comfort:
    SmartStayComfortFlexibilityEvaluationV2
) {
  const mandatory =
    comfort
      .mandatoryRequirements;

  if (!mandatory.satisfied) {
    return createDimension(
      0,
      Math.max(
        comfort.confidence,
        0.5
      ),
      [
        "mandatory-requirements-not-satisfied",
        ...mandatory.unmetFeatureCodes.map(
          (
            featureCode:
              SmartStayAccommodationFeatureCodeV2
          ) =>
            `required-feature-unmet:${featureCode}`
        ),
        ...mandatory.unverifiedFeatureCodes.map(
          (
            featureCode:
              SmartStayAccommodationFeatureCodeV2
          ) =>
            `required-feature-unverified:${featureCode}`
        ),
      ],
      comfort.evidenceIds
    );
  }

  const weighted =
    weightedAvailableScore([
      {
        score:
          comfort
            .dimensions
            .practicality
            .score,

        confidence:
          comfort
            .dimensions
            .practicality
            .confidence,

        weight:
          0.5,

        evidenceIds:
          comfort
            .dimensions
            .practicality
            .evidenceIds,
      },
      {
        score:
          comfort
            .unitType
            .score,

        confidence:
          comfort
            .unitType
            .confidence,

        weight:
          0.25,

        evidenceIds:
          comfort
            .unitType
            .evidenceIds,
      },
      {
        score:
          comfort
            .dimensions
            .comfort
            .score,

        confidence:
          comfort
            .dimensions
            .comfort
            .confidence,

        weight:
          0.25,

        evidenceIds:
          comfort
            .dimensions
            .comfort
            .evidenceIds,
      },
    ]);

  return createDimension(
    weighted.score,
    weighted.confidence,
    [
      "user-fit-from-practicality",
      "user-fit-from-unit-type",
      "user-fit-from-comfort",
    ],
    weighted.evidenceIds
  );
}

function createReliabilityDimension(
  candidate: {
    reliabilityGate:
      FoundationCandidate[
        "reliabilityGate"
      ];

    dataConfidence:
      SmartStayDataConfidenceEvaluationV2;

    risk:
      SmartStayRiskEvaluationV2;
  }
) {
  const score =
    candidate
      .reliabilityGate
      .status ===
      "invalid"
      ? 0
      : (
          candidate
            .dataConfidence
            .score *
            0.55 +
          (
            100 -
            candidate
              .risk
              .score
          ) *
            0.45
        );

  const confidence =
    candidate
      .reliabilityGate
      .status ===
      "strong-data"
      ? Math.max(
          candidate
            .dataConfidence
            .weightedCoverage,
          0.85
        )
      : candidate
          .dataConfidence
          .weightedCoverage;

  return createDimension(
    score,
    confidence,
    [
      `reliability-gate:${candidate.reliabilityGate.status}`,
      ...candidate
        .reliabilityGate
        .warningCodes,
      ...candidate
        .risk
        .factorCodes,
    ],
    [
      ...candidate
        .reliabilityGate
        .evidenceIds,
      ...candidate
        .dataConfidence
        .evidenceIds,
      ...candidate
        .risk
        .evidenceIds,
    ]
  );
}

function createScoreBreakdown(
  candidate: {
    foundation:
      FoundationCandidate;

    priceValue:
      SmartStayPriceValueEvaluationV2;

    quality:
      SmartStayQualityEvaluationV2;

    location:
      SmartStayLocationEvaluationV2;

    comfortFlexibility:
      SmartStayComfortFlexibilityEvaluationV2;

    dataConfidence:
      SmartStayDataConfidenceEvaluationV2;

    risk:
      SmartStayRiskEvaluationV2;
  }
): SmartStayScoreBreakdownV2 {
  return {
    priceValue:
      createDimension(
        candidate
          .priceValue
          .score,
        candidate
          .priceValue
          .confidence,
        [
          `price-value-status:${candidate.priceValue.status}`,
          ...candidate
            .priceValue
            .warningCodes,
        ],
        candidate
          .priceValue
          .evidenceIds
      ),

    quality:
      createDimension(
        candidate
          .quality
          .score,
        candidate
          .quality
          .confidence,
        [
          `quality-status:${candidate.quality.status}`,
          ...candidate
            .quality
            .warningCodes,
        ],
        candidate
          .quality
          .evidenceIds
      ),

    location:
      createDimension(
        candidate
          .location
          .score,
        candidate
          .location
          .confidence,
        [
          `location-status:${candidate.location.status}`,
          `location-source:${candidate.location.distance.source}`,
          ...candidate
            .location
            .warningCodes,
        ],
        candidate
          .location
          .evidenceIds
      ),

    comfort:
      createDimension(
        candidate
          .comfortFlexibility
          .dimensions
          .comfort
          .score,
        candidate
          .comfortFlexibility
          .dimensions
          .comfort
          .confidence,
        [
          `comfort-status:${candidate.comfortFlexibility.status}`,
        ],
        candidate
          .comfortFlexibility
          .dimensions
          .comfort
          .evidenceIds
      ),

    flexibility:
      createDimension(
        candidate
          .comfortFlexibility
          .dimensions
          .flexibility
          .score,
        candidate
          .comfortFlexibility
          .dimensions
          .flexibility
          .confidence,
        [
          `flexibility-status:${candidate.comfortFlexibility.status}`,
        ],
        candidate
          .comfortFlexibility
          .dimensions
          .flexibility
          .evidenceIds
      ),

    categoryFit:
      createCategoryFitDimension(
        candidate.foundation
      ),

    userFit:
      createUserFitDimension(
        candidate
          .comfortFlexibility
      ),

    reliability:
      createReliabilityDimension({
        reliabilityGate:
          candidate
            .foundation
            .reliabilityGate,

        dataConfidence:
          candidate
            .dataConfidence,

        risk:
          candidate
            .risk,
      }),
  };
}

function hasMandatoryPreferences(
  preferences:
    SmartStayComfortPreferencesV2 |
    undefined
) {
  return Boolean(
    preferences &&
    (
      (
        preferences
          .requiredFeatureCodes
          ?.length ??
        0
      ) >
        0 ||
      (
        preferences
          .requiredUnitTypes
          ?.length ??
        0
      ) >
        0
    )
  );
}

function createConstraintEvaluations(
  candidate:
    DimensionCandidate,
  input:
    SmartStayEngineV2SearchInput
): SmartStayConstraintEvaluationV2[] {
  const budgetStatus:
    SmartStayConstraintEvaluationV2[
      "status"
    ] =
      !candidate
        .priceValue
        .budget
        .provided
        ? "not-set"
        : candidate
            .priceValue
            .budget
            .withinBudget ===
            false
          ? "exceeded"
          : candidate
              .priceValue
              .budget
              .withinBudget ===
              true &&
            candidate
              .priceValue
              .costCompleteness ===
              "reported-complete"
            ? "satisfied"
            : "unknown";

  const distanceStatus:
    SmartStayConstraintEvaluationV2[
      "status"
    ] =
      !candidate
        .location
        .constraint
        .provided
        ? "not-set"
        : candidate
            .location
            .constraint
            .withinLimit ===
            true
          ? "satisfied"
          : candidate
              .location
              .constraint
              .withinLimit ===
              false
            ? "exceeded"
            : "unknown";

  const mandatoryWasRequested =
    hasMandatoryPreferences(
      input
        .comfortPreferences
    );

  const mandatoryStatus:
    SmartStayConstraintEvaluationV2[
      "status"
    ] =
      !mandatoryWasRequested
        ? "not-applicable"
        : candidate
            .comfortFlexibility
            .mandatoryRequirements
            .satisfied
          ? "satisfied"
          : (
              candidate
                .comfortFlexibility
                .mandatoryRequirements
                .unmetFeatureCodes
                .length >
                0 ||
              candidate
                .comfortFlexibility
                .mandatoryRequirements
                .requiredUnitTypeStatus ===
                "unmet"
            )
            ? "exceeded"
            : "unknown";

  return [
    {
      code:
        "budget-total",

      kind:
        "budget",

      status:
        budgetStatus,

      actualValue:
        candidate
          .priceValue
          .totalCost,

      limitValue:
        candidate
          .priceValue
          .budget
          .total,

      evidenceIds:
        candidate
          .priceValue
          .evidenceIds,
    },
    {
      code:
        "maximum-distance",

      kind:
        "distance",

      status:
        distanceStatus,

      actualValue:
        candidate
          .location
          .distance
          .selectedDistanceKm,

      limitValue:
        candidate
          .location
          .constraint
          .maximumDistanceKm,

      evidenceIds:
        candidate
          .location
          .evidenceIds,
    },
    {
      code:
        "mandatory-accommodation-requirements",

      kind:
        "mandatory-feature",

      status:
        mandatoryStatus,

      actualValue:
        candidate
          .comfortFlexibility
          .mandatoryRequirements
          .satisfied,

      limitValue:
        mandatoryWasRequested
          ? true
          : null,

      evidenceIds:
        candidate
          .comfortFlexibility
          .evidenceIds,
    },
  ];
}

function createExclusionReasonCodes(
  candidate: {
    foundation:
      FoundationCandidate;

    location:
      SmartStayLocationEvaluationV2;

    comfortFlexibility:
      SmartStayComfortFlexibilityEvaluationV2;

    utility:
      SmartStayUserUtilityEvaluationV2;
  },
  input:
    SmartStayEngineV2SearchInput
) {
  const reasons:
    string[] = [];

  if (
    !candidate
      .foundation
      .reliabilityGate
      .eligible
  ) {
    reasons.push(
      "reliability-gate-ineligible"
    );
  }

  if (
    !candidate
      .utility
      .eligibleForPrimaryRanking
  ) {
    reasons.push(
      "utility-ineligible"
    );
  }

  const maximumDistanceKm =
    normalizeOptionalPositiveNumber(
      input.maximumDistanceKm
    );

  if (
    maximumDistanceKm !==
    null
  ) {
    if (
      candidate
        .location
        .constraint
        .withinLimit ===
        false
    ) {
      reasons.push(
        "distance-limit-exceeded"
      );
    }
    else if (
      candidate
        .location
        .constraint
        .withinLimit !==
        true
    ) {
      reasons.push(
        "distance-limit-unverified"
      );
    }
  }

  if (
    hasMandatoryPreferences(
      input.comfortPreferences
    ) &&
    !candidate
      .comfortFlexibility
      .mandatoryRequirements
      .satisfied
  ) {
    const mandatory =
      candidate
        .comfortFlexibility
        .mandatoryRequirements;

    if (
      mandatory
        .unmetFeatureCodes
        .length >
        0 ||
      mandatory
        .requiredUnitTypeStatus ===
        "unmet"
    ) {
      reasons.push(
        "mandatory-requirements-not-satisfied"
      );
    }
    else {
      reasons.push(
        "mandatory-requirements-unverified"
      );
    }
  }

  return uniqueSorted(
    reasons
  );
}

function normalizeIdentityText(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
        .normalize(
          "NFD"
        )
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .trim()
        .replace(
          /\s+/g,
          "-"
        )
    : "";
}

function createPropertyIdentityKey(
  hotel:
    Hotel
) {
  const name =
    normalizeIdentityText(
      hotel.name
    );

  if (!name) {
    return null;
  }

  const city =
    normalizeIdentityText(
      hotel.city
    );

  const country =
    normalizeIdentityText(
      hotel.country
    );

  const hasCoordinates =
    typeof hotel.latitude ===
      "number" &&
    Number.isFinite(
      hotel.latitude
    ) &&
    typeof hotel.longitude ===
      "number" &&
    Number.isFinite(
      hotel.longitude
    );

  const coordinateKey =
    hasCoordinates
      ? [
          round(
            hotel.latitude as number,
            4
          ).toFixed(
            4
          ),
          round(
            hotel.longitude as number,
            4
          ).toFixed(
            4
          ),
        ].join(",")
      : "";

  const identityParts = [
    name,
    city,
    country,
    coordinateKey,
  ].filter(Boolean);

  return identityParts.length >=
    2
    ? identityParts.join(
        "|"
      )
    : null;
}

function createOfferIdentityKey(
  hotel:
    Hotel,
  selectedOfferId:
    string |
    null
) {
  const provider =
    normalizeIdentityText(
      hotel.provider
    ) ||
    "unknown-provider";

  const bookableOffer =
    (
      hotel.offers ??
      []
    ).find(
      (offer) =>
        offer.bookable ===
          true &&
        Boolean(
          offer.id.trim()
        )
    );

  const offerId =
    selectedOfferId
      ?.trim() ||
    bookableOffer
      ?.id
      .trim() ||
    hotel.id.trim();

  return `${provider}|${offerId}`;
}

function requireByHotelId<
  Value extends {
    hotelId:
      string;
  }
>(
  values:
    Value[],
  hotelId:
    string,
  componentName:
    string
) {
  const value =
    values.find(
      (candidate) =>
        candidate.hotelId ===
        hotelId
    );

  if (!value) {
    throw new Error(
      `${componentName} did not return hotel ${hotelId}.`
    );
  }

  return value;
}

function createFoundationCandidates(
  hotels:
    Hotel[],
  capturedAt:
    string |
    null,
  offerSelectionPreferenceId:
    string,
  checkIn:
    string |
    null |
    undefined,
  bookingReferenceAt:
    string,
  maximumDistanceKm:
    number |
    null |
    undefined
): FoundationCandidate[] {
  return hotels
    .map(
      (hotel) => {
        const accommodation =
          classifyAccommodationV2({
            hotel,

            explicitCategory:
              hotel
                .accommodationCategory ??
              hotel
                .providerHotelTypeName,

            categorySourceField:
              hotel
                .accommodationCategory
                ? "accommodationCategory"
                : hotel
                    .providerHotelTypeName
                  ? "providerHotelTypeName"
                  : null,
          });

        const flexibilityContext =
          evaluateBookingFlexibilityContextV2({
            hotels,

            targetHotelId:
              hotel.id,

            checkIn,

            referenceAt:
              bookingReferenceAt,

            maximumDistanceKm,
          });

        const evidence =
          buildHotelEvidenceModelV2({
            hotel,

            accommodation:
              accommodation.profile,

            categoryEvidence:
              accommodation.evidence,

            capturedAt,

            offerSelectionPreferenceId,

            flexibilityContext,
          });

        const reliabilityGate =
          evaluateReliabilityGateV2({
            evidence:
              evidence.facts,
          });

        return {
          hotel,
          accommodation,
          evidence,
          reliabilityGate,
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        first.hotel.id.localeCompare(
          second.hotel.id
        )
    );
}

function createDimensionCandidates(
  foundations:
    FoundationCandidate[],
  peerGroups:
    SmartStayPeerGroupAssignmentV2[],
  input:
    SmartStayEngineV2SearchInput
): DimensionCandidate[] {
  const priceCandidates =
    foundations.map(
      (candidate) => ({
        hotelId:
          candidate.hotel.id,

        evidence:
          candidate
            .evidence
            .facts,

        reliabilityGate:
          candidate
            .reliabilityGate,
      })
    );

  const qualityCandidates =
    priceCandidates;

  const budgetTotal =
    normalizeOptionalPositiveNumber(
      input.totalBudget
    );

  const maximumDistanceKm =
    normalizeOptionalPositiveNumber(
      input.maximumDistanceKm
    );

  const nights =
    normalizeOptionalPositiveInteger(
      input.nights
    );

  const adults =
    normalizeOptionalPositiveInteger(
      input.adults
    );

  const children =
    normalizeOptionalNonNegativeInteger(
      input.children
    );

  const rooms =
    normalizeOptionalPositiveInteger(
      input.rooms
    );

  return foundations.map(
    (foundation) => {
      const hotelId =
        foundation.hotel.id;

      const peerGroupAssignment =
        requireByHotelId(
          peerGroups,
          hotelId,
          "Peer Groups V2"
        );

      const priceValue =
        evaluatePriceValueV2({
          targetHotelId:
            hotelId,

          candidates:
            priceCandidates,

          peerGroupAssignment,

          budgetTotal,
        });

      const quality =
        evaluateQualityV2({
          targetHotelId:
            hotelId,

          candidates:
            qualityCandidates,

          peerGroupAssignment,
        });

      const location =
        evaluateLocationV2({
          targetHotelId:
            hotelId,

          evidence:
            foundation
              .evidence
              .facts,

          reliabilityGate:
            foundation
              .reliabilityGate,

          selectedLocation:
            input.selectedLocation ??
            null,

          maximumDistanceKm,

          providerDistanceReference:
            "selected-location",
        });

      const comfortFlexibility =
        evaluateComfortFlexibilityV2({
          targetHotelId:
            hotelId,

          accommodation:
            foundation
              .accommodation
              .profile,

          evidence:
            foundation
              .evidence
              .facts,

          reliabilityGate:
            foundation
              .reliabilityGate,

          stayContext: {
            nights,
            adults,
            children,
            rooms,

            tripProfile:
              input.tripProfile,

            flexibilityContext:
              foundation
                .evidence
                .flexibilityContext,
          },

          preferences:
            input
              .comfortPreferences,
        });

      const dataConfidence =
        evaluateDataConfidenceV2({
          evidence:
            foundation
              .evidence
              .facts,
        });

      const risk =
        evaluateRiskV2({
          evidence:
            foundation
              .evidence
              .facts,

          reliabilityGate:
            foundation
              .reliabilityGate,

          dataConfidence,

          priceValue,
          quality,
          location,
          comfortFlexibility,
        });

      const scores =
        createScoreBreakdown({
          foundation,
          priceValue,
          quality,
          location,
          comfortFlexibility,
          dataConfidence,
          risk,
        });

      const utility =
        evaluateUserUtilityV2({
          targetHotelId:
            hotelId,

          scores,

          reliabilityGate:
            foundation
              .reliabilityGate,

          preferenceId:
            input.preferenceId,

          selectedIndex:
            input.selectedIndex,

          preferenceSource:
            input.preferenceSource,
        });

      const exclusionReasonCodes =
        createExclusionReasonCodes(
          {
            foundation,
            location,
            comfortFlexibility,
            utility,
          },
          input
        );

      return {
        ...foundation,
        peerGroupAssignment,
        priceValue,
        quality,
        location,
        comfortFlexibility,
        dataConfidence,
        risk,
        scores,
        utility,

        eligibleForPrimaryRanking:
          exclusionReasonCodes.length ===
          0,

        exclusionReasonCodes,
      };
    }
  );
}

export function evaluateSmartStaySearchV2(
  input:
    SmartStayEngineV2SearchInput
): SmartStayEngineV2SearchResult {
  validateHotels(
    input.hotels
  );

  const capturedAt =
    typeof input.capturedAt ===
      "string" &&
    input.capturedAt.trim()
      ? input.capturedAt.trim()
      : null;

  const bookingReferenceAt =
    typeof input.bookingReferenceAt ===
      "string" &&
    input.bookingReferenceAt.trim()
      ? input.bookingReferenceAt.trim()
      : capturedAt ??
        new Date().toISOString();


  if (
    input.hotels.length ===
    0
  ) {
    const marketContext =
      evaluateMarketContextV2({
        candidates:
          [],

        totalBudget:
          input.totalBudget,

        nights:
          input.nights,

        rooms:
          input.rooms,

        destinationKey:
          input.destinationKey ??
          input.selectedLocation?.label ??
          null,

        currency:
          input.currency,

        checkIn:
          input.checkIn,

        checkOut:
          input.checkOut,

        capturedAt:
          input.capturedAt,

        mode:
          input.marketContextMode,

        observations: [
          ...SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_V2.records,
          ...(
            input.marketContextObservations ??
            []
          ),
        ],
      });

    const budgetIntent =
      evaluateBudgetIntentV2({
        candidates:
          [],

        totalBudget:
          input.totalBudget,

        nights:
          input.nights,

        rooms:
          input.rooms,

        preferenceId:
          input.preferenceId,

        marketContext,
      });

    const paretoFrontier =
      evaluateParetoFrontierV2(
        []
      );

    const recommendationRoles =
      evaluateRecommendationRolesV2(
        []
      );

    const explanations =
      evaluateEvidenceBasedExplanationsV2({
        candidates:
          [],
      });

    const counterfactualComparisons =
      evaluateCounterfactualComparisonsV2({
        candidates:
          [],

        paretoFrontier,
      });

    const ranking =
      evaluateRankingStabilityDiversityV2(
        {
          candidates:
            [],

          previousRankingHotelIds:
            input
              .previousRankingHotelIds,
        },
        {
          maximumVisibleResults:
            1,
        }
      );

    return {
      engineVersion:
        SMARTSTAY_ENGINE_V2_VERSION,

      pipelineVersion:
        SMARTSTAY_ENGINE_V2_PIPELINE_VERSION,

      evaluations:
        [],

      marketContext,
      budgetIntent,
      paretoFrontier,
      recommendationRoles,
      explanations,
      counterfactualComparisons,
      ranking,
    };
  }

  const foundations =
    createFoundationCandidates(
      input.hotels,
      capturedAt,
      resolveOfferSelectionPreferenceId(
        input
      ),
      input.checkIn,
      bookingReferenceAt,
      input.maximumDistanceKm
    );

  const peerGroups =
    buildPeerGroupsV2(
      foundations.map(
        (candidate) => ({
          hotelId:
            candidate.hotel.id,

          accommodation:
            candidate
              .accommodation
              .profile,

          evidence:
            candidate
              .evidence
              .facts,

          reliabilityGate:
            candidate
              .reliabilityGate,
        })
      )
    );

  const candidates =
    createDimensionCandidates(
      foundations,
      peerGroups,
      input
    );

  const marketContext =
    evaluateMarketContextV2({
      candidates:
        candidates.map(
          (candidate) => ({
            hotelId:
              candidate.hotel.id,

            eligibleForPrimaryRanking:
              candidate
                .eligibleForPrimaryRanking,

            totalCost:
              candidate
                .evidence
                .offerSelection
                .selectedOffer
                ?.amount ??
              candidate
                .priceValue
                .totalCost,

            currency:
              candidate
                .evidence
                .offerSelection
                .selectedOffer
                ?.currency ??
              candidate
                .priceValue
                .currency,

            accommodationCategory:
              candidate
                .accommodation
                .profile
                .category,

            stars:
              candidate
                .quality
                .starQuality
                .stars,
          })
        ),

      totalBudget:
        input.totalBudget,

      nights:
        input.nights,

      rooms:
        input.rooms,

      destinationKey:
        input.destinationKey ??
        input.selectedLocation?.label ??
        null,

      currency:
        input.currency,

      checkIn:
        input.checkIn,

      checkOut:
        input.checkOut,

      capturedAt,

      mode:
        input.marketContextMode,

      observations: [
        ...SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_V2.records,
        ...(
          input.marketContextObservations ??
          []
        ),
      ],
    });

  const budgetIntent =
    evaluateBudgetIntentV2({
      candidates:
        candidates.map(
          (candidate) => ({
            hotelId:
              candidate.hotel.id,

            eligibleForPrimaryRanking:
              candidate
                .eligibleForPrimaryRanking,

            accommodationCategory:
              candidate
                .accommodation
                .profile
                .category,

            utility:
              candidate.utility,

            priceValue:
              candidate.priceValue,

            quality:
              candidate.quality,

            location:
              candidate.location,

            comfortFlexibility:
              candidate
                .comfortFlexibility,

            scores:
              candidate.scores,
          })
        ),

      totalBudget:
        input.totalBudget,

      nights:
        input.nights,

      rooms:
        input.rooms,

      preferenceId:
        candidates[0]
          ?.utility
          .preference
          .id ??
        input.preferenceId,

      marketContext,
    });

  const paretoFrontier =
    evaluateParetoFrontierV2(
      candidates.map(
        (candidate) => ({
          hotelId:
            candidate.hotel.id,

          utility:
            candidate.utility,

          eligibleForPrimaryRanking:
            candidate
              .eligibleForPrimaryRanking,

          exclusionReasonCodes:
            candidate
              .exclusionReasonCodes,
        })
      )
    );

  const paretoEvaluations =
    paretoFrontier
      .evaluations;

  const recommendationRoles =
    evaluateRecommendationRolesV2(
      candidates.map(
        (candidate) => ({
          hotelId:
            candidate.hotel.id,

          eligibleForPrimaryRanking:
            candidate
              .eligibleForPrimaryRanking,

          utility:
            candidate.utility,

          pareto:
            requireByHotelId<
              SmartStayParetoCandidateEvaluationV2
            >(
              paretoEvaluations,
              candidate.hotel.id,
              "Pareto Frontier V2"
            ),

          risk:
            candidate.risk,

          smartScore:
            candidate
              .utility
              .utilityScore,

          priceValue:
            candidate
              .priceValue,

          location:
            candidate.location,

          comfortFlexibility:
            candidate
              .comfortFlexibility,

          offerSelection:
            candidate
              .evidence
              .offerSelection,

          budgetIntent:
            requireByHotelId(
              budgetIntent
                .candidateEvaluations,
              candidate.hotel.id,
              "Budget Intent V2"
            ),

          exclusionReasonCodes:
            candidate
              .exclusionReasonCodes,
        }))
    );

  const recommendationEvaluations =
    recommendationRoles
      .evaluations;

  const explanations =
    evaluateEvidenceBasedExplanationsV2({
      candidates:
        candidates.map(
          (candidate) => ({
            hotelId:
              candidate.hotel.id,

            evidence:
              candidate
                .evidence
                .facts,

            utility:
              candidate.utility,

            recommendation:
              requireByHotelId(
                recommendationEvaluations,
                candidate.hotel.id,
                "Recommendation Roles V2"
              ),

            risk:
              candidate.risk,

            priceValue:
              candidate
                .priceValue,

            quality:
              candidate.quality,

            location:
              candidate.location,

            comfortFlexibility:
              candidate
                .comfortFlexibility,
          })
        ),
    });

  const counterfactualComparisons =
    evaluateCounterfactualComparisonsV2({
      candidates:
        candidates.map(
          (candidate) => ({
            hotelId:
              candidate.hotel.id,

            evidence:
              candidate
                .evidence
                .facts,

            utility:
              candidate.utility,

            recommendation:
              requireByHotelId(
                recommendationEvaluations,
                candidate.hotel.id,
                "Recommendation Roles V2"
              ),

            risk:
              candidate.risk,

            pareto:
              requireByHotelId<
                SmartStayParetoCandidateEvaluationV2
              >(
                paretoEvaluations,
                candidate.hotel.id,
                "Pareto Frontier V2"
              ),

            priceValue:
              candidate
                .priceValue,

            location:
              candidate.location,

            comfortFlexibility:
              candidate
                .comfortFlexibility,
          })
        ),

      paretoFrontier,
    });

  const ranking =
    evaluateRankingStabilityDiversityV2(
      {
        candidates:
          candidates.map(
            (candidate) => ({
              hotelId:
                candidate.hotel.id,

              eligibleForRanking:
                candidate
                  .eligibleForPrimaryRanking,

              recommendation:
                requireByHotelId(
                  recommendationEvaluations,
                  candidate.hotel.id,
                  "Recommendation Roles V2"
                ),

              utility:
                candidate.utility,

              accommodation:
                candidate
                  .accommodation
                  .profile,

              risk:
                candidate.risk,

              priceValue:
                candidate
                  .priceValue,

              location:
                candidate.location,

              sourceProvider:
                candidate
                  .hotel
                  .provider,

              propertyIdentityKey:
                createPropertyIdentityKey(
                  candidate.hotel
                ),

              offerIdentityKey:
                createOfferIdentityKey(
                  candidate.hotel,
                  candidate
                    .evidence
                    .offerSelection
                    .selectedOffer
                    ?.offerId ??
                  null
                ),

              exclusionReasonCodes:
                candidate
                  .exclusionReasonCodes,
            })
          ),

        previousRankingHotelIds:
          input
            .previousRankingHotelIds,
      },
      {
        maximumVisibleResults:
          normalizeMaximumVisibleResults(
            input
              .maximumVisibleResults,
            candidates.length
          ),
      }
    );

  const explanationEvaluations =
    explanations.evaluations;

  const rankingEvaluations =
    ranking.evaluations;

  const candidatesById =
    new Map(
      candidates.map(
        (candidate) => [
          candidate.hotel.id,
          candidate,
        ] as const
      )
    );

  const orderedHotelIds = [
    ...ranking
      .diversifiedRankingHotelIds,

    ...candidates
      .map(
        (candidate) =>
          candidate.hotel.id
      )
      .filter(
        (hotelId) =>
          !ranking
            .diversifiedRankingHotelIds
            .includes(
              hotelId
            )
      )
      .sort(),
  ];

  const evaluations =
    orderedHotelIds.map(
      (hotelId) => {
        const candidate =
          candidatesById.get(
            hotelId
          );

        if (!candidate) {
          throw new Error(
            `Ranking V2 returned an unknown hotel id: ${hotelId}.`
          );
        }

        const pareto =
          requireByHotelId<
            SmartStayParetoCandidateEvaluationV2
          >(
            paretoEvaluations,
            hotelId,
            "Pareto Frontier V2"
          );

        const recommendation:
          SmartStayRecommendationEvaluationV2 =
            requireByHotelId(
              recommendationEvaluations,
              hotelId,
              "Recommendation Roles V2"
            );

        const explanation =
          requireByHotelId<
            SmartStayEvidenceBasedExplanationEvaluationV2
          >(
            explanationEvaluations,
            hotelId,
            "Evidence-based Explanations V2"
          );

        const rankingEvaluation =
          requireByHotelId<
            SmartStayRankingCandidateEvaluationV2
          >(
            rankingEvaluations,
            hotelId,
            "Ranking Stability & Diversity V2"
          );

        const utilityScore =
          candidate
            .utility
            .utilityScore ??
          0;

        const displayedSmartScore =
          recommendation
            .metrics
            .displayedSmartScore ??
          recommendation
            .metrics
            .smartScore ??
          utilityScore;

        return {
          engineVersion:
            SMARTSTAY_ENGINE_V2_VERSION,

          hotel:
            candidate.hotel,

          accommodation:
            candidate
              .accommodation
              .profile,

          evidence:
            candidate
              .evidence
              .facts,

          reliabilityGate:
            candidate
              .reliabilityGate,

          constraints:
            createConstraintEvaluations(
              candidate,
              input
            ),

          peerGroup:
            candidate
              .peerGroupAssignment
              .peerGroup,

          scores:
            candidate.scores,

          dataConfidence:
            candidate
              .dataConfidence,

          risk:
            candidate.risk,

          flexibilityContext:
            candidate
              .comfortFlexibility
              .flexibilityContext
              ? {
                  leadTimeDays:
                    candidate
                      .comfortFlexibility
                      .flexibilityContext
                      .leadTimeDays,

                  leadTimeBand:
                    candidate
                      .comfortFlexibility
                      .flexibilityContext
                      .leadTimeBand,

                  marketAvailability:
                    candidate
                      .comfortFlexibility
                      .flexibilityContext
                      .marketAvailability,

                  nonRefundablePenaltyMultiplier:
                    candidate
                      .comfortFlexibility
                      .flexibilityContext
                      .nonRefundablePenaltyMultiplier,

                  reasonCodes: [
                    ...candidate
                      .comfortFlexibility
                      .flexibilityContext
                      .reasonCodes,
                  ],
                }
              : null,

          pareto,
          recommendation,
          explanation,

          final: {
            smartScore:
              round(
                clamp(
                  displayedSmartScore,
                  0,
                  100
                )
              ),

            utilityScore:
              round(
                clamp(
                  utilityScore,
                  0,
                  100
                )
              ),

            scoreConfidence:
              candidate
                .utility
                .scoreConfidence,

            rank:
              rankingEvaluation
                .diversifiedRank,

            rankBand:
              rankingEvaluation
                .rankBand,

            tieGroupId:
              rankingEvaluation
                .stabilityBandId ??
              recommendation
                .tieGroupId,

            deterministicKey:
              rankingEvaluation
                .deterministicKey,
          },
        };
      }
    );

  return {
    engineVersion:
      SMARTSTAY_ENGINE_V2_VERSION,

    pipelineVersion:
      SMARTSTAY_ENGINE_V2_PIPELINE_VERSION,

    evaluations,
    marketContext,
    budgetIntent,
    paretoFrontier,
    recommendationRoles,
    explanations,
    counterfactualComparisons,
    ranking,
  };
}
