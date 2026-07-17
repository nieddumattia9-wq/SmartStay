import type {
  Hotel,
} from "../../types/hotel";

import {
  evaluateSmartStaySearchV2,
} from "../orchestrator/smartStayEngineV2";

import type {
  SmartStayEngineV2SearchInput,
} from "../orchestrator/smartStayEngineV2";

import type {
  SmartStayComparisonFactV2,
  SmartStayDataConfidenceLevelV2,
  SmartStayEvaluationV2,
  SmartStayRecommendationRoleV2,
  SmartStayRiskLevelV2,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayRecommendationPickV2,
} from "../recommendation/recommendationRolesEngine";

export type SmartStayFrontendBadgeV2 =
  | "Smart Pick"
  | "Great Value"
  | "Great Location"
  | "Reliable Reviews"
  | "Strong Amenities"
  | "Low Risk"
  | "Balanced Choice"
  | "Solid Data"
  | "Multiple Offers"
  | "Limited Data";

export type SmartStayFrontendRecommendationRoleV2 =
  | "best-choice"
  | "cheaper-alternative"
  | "comfort-upgrade";

export interface SmartStayFrontendEvaluationV2 {
  hotel:
    Hotel;

  smartScore:
    number;

  riskLevel:
    SmartStayRiskLevelV2;

  dataConfidenceLevel:
    SmartStayDataConfidenceLevelV2;

  badges:
    SmartStayFrontendBadgeV2[];

  reasons:
    string[];

  sourceEvaluation:
    SmartStayEvaluationV2;
}

export interface SmartStayFrontendRecommendationPickV2 {
  role:
    SmartStayFrontendRecommendationRoleV2;

  sourceRole:
    Exclude<
      SmartStayRecommendationRoleV2,
      "unassigned" |
      "best-location"
    >;

  label:
    string;

  reason:
    string;

  evaluation:
    SmartStayFrontendEvaluationV2;
}

export interface SmartStayFrontendViewV2 {
  engineVersion:
    string;

  pipelineVersion:
    string;

  analyzedHotelCount:
    number;

  rankedHotels:
    SmartStayFrontendEvaluationV2[];

  recommendationPicks:
    SmartStayFrontendRecommendationPickV2[];

  excludedHotelIds:
    string[];

  suppressedHotelIds:
    string[];
}

export interface SmartStayFrontendInputV2 {
  hotels:
    Hotel[];

  preferenceId?:
    SmartStayEngineV2SearchInput[
      "preferenceId"
    ];

  selectedIndex?:
    SmartStayEngineV2SearchInput[
      "selectedIndex"
    ];

  preferenceSource?:
    SmartStayEngineV2SearchInput[
      "preferenceSource"
    ];

  totalBudget?:
    SmartStayEngineV2SearchInput[
      "totalBudget"
    ];

  maximumDistanceKm?:
    SmartStayEngineV2SearchInput[
      "maximumDistanceKm"
    ];

  selectedLocation?:
    SmartStayEngineV2SearchInput[
      "selectedLocation"
    ];

  nights?:
    SmartStayEngineV2SearchInput[
      "nights"
    ];

  adults?:
    SmartStayEngineV2SearchInput[
      "adults"
    ];

  children?:
    SmartStayEngineV2SearchInput[
      "children"
    ];

  rooms?:
    SmartStayEngineV2SearchInput[
      "rooms"
    ];

  previousRankingHotelIds?:
    string[];

  maximumVisibleResults?:
    number;
}

const DIMENSION_LABELS:
  Record<
    string,
    string
  > = {
    priceValue:
      "price and value",

    quality:
      "guest quality",

    location:
      "location",

    comfort:
      "comfort",

    flexibility:
      "booking flexibility",

    categoryFit:
      "property fit",

    userFit:
      "fit for this trip",

    reliability:
      "data reliability",
  };

const RECOMMENDATION_ORDER:
  Record<
    SmartStayFrontendRecommendationRoleV2,
    number
  > = {
    "best-choice":
      0,

    "cheaper-alternative":
      1,

    "comfort-upgrade":
      2,
  };

function uniqueStable<
  Value
>(
  values:
    Value[]
) {
  return [
    ...new Set(
      values
    ),
  ];
}

function formatNumber(
  value:
    number,
  maximumFractionDigits =
    1
) {
  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits,
    }
  );
}

function formatMoney(
  value:
    number,
  currency:
    string
) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency,

        maximumFractionDigits:
          0,
      }
    ).format(
      value
    );
  }
  catch {
    return (
      currency +
      " " +
      formatNumber(
        value,
        0
      )
    );
  }
}

function formatFactValue(
  fact:
    SmartStayComparisonFactV2
) {
  if (
    typeof fact.value !==
      "number" ||
    !Number.isFinite(
      fact.value
    )
  ) {
    return null;
  }

  const absoluteValue =
    Math.abs(
      fact.value
    );

  if (
    fact.unit &&
    /^[A-Z]{3}$/.test(
      fact.unit
    )
  ) {
    return formatMoney(
      absoluteValue,
      fact.unit
    );
  }

  if (
    fact.unit ===
      "%" ||
    fact.unit ===
      "percent"
  ) {
    return (
      formatNumber(
        absoluteValue
      ) +
      "%"
    );
  }

  if (
    fact.unit ===
      "km"
  ) {
    return (
      formatNumber(
        absoluteValue,
        2
      ) +
      " km"
    );
  }

  if (
    fact.unit ===
      "points" ||
    fact.unit ===
      "risk-points"
  ) {
    return (
      formatNumber(
        absoluteValue
      ) +
      " points"
    );
  }

  return formatNumber(
    absoluteValue
  );
}

function getTargetName(
  fact:
    SmartStayComparisonFactV2,
  hotelNames:
    Map<
      string,
      string
    >
) {
  if (
    !fact.targetHotelId
  ) {
    return null;
  }

  return (
    hotelNames.get(
      fact.targetHotelId
    ) ??
    "the comparison stay"
  );
}

function getDimensionFromKey(
  value:
    string
) {
  const parts =
    value.split(
      "."
    );

  const candidate =
    parts[
      parts.length -
      1
    ]?.replace(
      /_/g,
      "-"
    );

  if (!candidate) {
    return null;
  }

  const normalized =
    candidate ===
      "price-value"
      ? "priceValue"
      : candidate ===
          "category-fit"
        ? "categoryFit"
        : candidate ===
            "user-fit"
          ? "userFit"
          : candidate;

  return (
    DIMENSION_LABELS[
      normalized
    ] ??
    null
  );
}

function formatExplanationFact(
  fact:
    SmartStayComparisonFactV2,
  hotelNames:
    Map<
      string,
      string
    >
) {
  const key =
    fact.messageKey;

  const value =
    formatFactValue(
      fact
    );

  const targetName =
    getTargetName(
      fact,
      hotelNames
    );

  if (
    key.includes(
      "within_budget"
    )
  ) {
    return value
      ? `Fits your total budget with ${value} of headroom.`
      : "Fits within your total budget.";
  }

  if (
    key.includes(
      "below_peer_median"
    )
  ) {
    return value
      ? `Costs ${value} less than the median of comparable stays.`
      : "Costs less than the median of comparable stays.";
  }

  if (
    key.includes(
      "above_peer_median"
    )
  ) {
    return value
      ? `Costs ${value} more than the median of comparable stays.`
      : "Costs more than the median of comparable stays.";
  }

  if (
    key.includes(
      "solid_data"
    )
  ) {
    return value
      ? `Supported by strong data coverage (${value}).`
      : "Supported by strong data coverage.";
  }

  if (
    key.includes(
      "low_risk"
    )
  ) {
    return "Carries a low level of booking and data uncertainty.";
  }

  if (
    key.includes(
      "saves_money"
    ) ||
    key.includes(
      "price_saving"
    )
  ) {
    return value
      ? `Saves ${value} compared with ${targetName ?? "the reference choice"}.`
      : `Costs less than ${targetName ?? "the reference choice"}.`;
  }

  if (
    key.includes(
      "costs_more"
    ) ||
    key.includes(
      "price_premium"
    )
  ) {
    return value
      ? `Costs ${value} more than ${targetName ?? "the reference choice"}.`
      : `Costs more than ${targetName ?? "the reference choice"}.`;
  }

  if (
    key.includes(
      "closer"
    )
  ) {
    return value
      ? `${value} closer than ${targetName ?? "the reference choice"}.`
      : `Closer than ${targetName ?? "the reference choice"}.`;
  }

  if (
    key.includes(
      "farther"
    )
  ) {
    return value
      ? `${value} farther away than ${targetName ?? "the reference choice"}.`
      : `Farther away than ${targetName ?? "the reference choice"}.`;
  }

  if (
    key.includes(
      "utility_gain"
    )
  ) {
    return value
      ? `Improves the overall trip match by ${value}.`
      : "Improves the overall trip match.";
  }

  if (
    key.includes(
      "utility_loss"
    )
  ) {
    return value
      ? `Trades away ${value} of overall trip fit.`
      : "Trades away some overall trip fit.";
  }

  if (
    key.includes(
      ".strength."
    )
  ) {
    const dimension =
      getDimensionFromKey(
        key
      );

    return dimension
      ? `${dimension[0].toUpperCase()}${dimension.slice(1)} is a clear strength for this search.`
      : "This stay has a strong evidence-backed advantage.";
  }

  if (
    key.includes(
      ".weakness."
    )
  ) {
    const dimension =
      getDimensionFromKey(
        key
      );

    return dimension
      ? `${dimension[0].toUpperCase()}${dimension.slice(1)} is weaker than the strongest alternatives.`
      : "This stay includes a meaningful trade-off.";
  }

  if (
    key.includes(
      ".comparison."
    )
  ) {
    const dimension =
      getDimensionFromKey(
        key
      );

    if (
      dimension &&
      targetName
    ) {
      return fact.direction ===
        "better"
        ? `Stronger ${dimension} than ${targetName}.`
        : fact.direction ===
            "worse"
          ? `Weaker ${dimension} than ${targetName}.`
          : `Similar ${dimension} to ${targetName}.`;
    }
  }

  return null;
}

function addBadge(
  badges:
    SmartStayFrontendBadgeV2[],
  badge:
    SmartStayFrontendBadgeV2
) {
  if (
    !badges.includes(
      badge
    )
  ) {
    badges.push(
      badge
    );
  }
}

function createBadges(
  evaluation:
    SmartStayEvaluationV2
) {
  const badges:
    SmartStayFrontendBadgeV2[] = [];

  if (
    evaluation
      .recommendation
      .role ===
      "best-choice"
  ) {
    addBadge(
      badges,
      "Smart Pick"
    );
  }

  if (
    (
      evaluation
        .scores
        .priceValue
        .score ??
      0
    ) >=
      80
  ) {
    addBadge(
      badges,
      "Great Value"
    );
  }

  if (
    (
      evaluation
        .scores
        .location
        .score ??
      0
    ) >=
      82
  ) {
    addBadge(
      badges,
      "Great Location"
    );
  }

  if (
    (
      evaluation
        .scores
        .quality
        .score ??
      0
    ) >=
      80 &&
    evaluation
      .scores
      .quality
      .confidence >=
      0.65
  ) {
    addBadge(
      badges,
      "Reliable Reviews"
    );
  }

  if (
    (
      evaluation
        .scores
        .comfort
        .score ??
      0
    ) >=
      78
  ) {
    addBadge(
      badges,
      "Strong Amenities"
    );
  }

  if (
    evaluation
      .risk
      .level ===
      "low"
  ) {
    addBadge(
      badges,
      "Low Risk"
    );
  }

  if (
    evaluation
      .dataConfidence
      .level ===
      "high"
  ) {
    addBadge(
      badges,
      "Solid Data"
    );
  }

  if (
    evaluation
      .hotel
      .offers
      .length >
      1
  ) {
    addBadge(
      badges,
      "Multiple Offers"
    );
  }

  if (
    evaluation
      .dataConfidence
      .level ===
      "none" ||
    evaluation
      .dataConfidence
      .level ===
      "low" ||
    evaluation
      .reliabilityGate
      .status ===
      "low-confidence"
  ) {
    addBadge(
      badges,
      "Limited Data"
    );
  }

  if (
    badges.length ===
    0
  ) {
    addBadge(
      badges,
      "Balanced Choice"
    );
  }

  return badges.slice(
    0,
    4
  );
}

function createFallbackReasons(
  evaluation:
    SmartStayEvaluationV2
) {
  const reasons:
    string[] = [];

  const budget =
    evaluation
      .constraints
      .find(
        (constraint) =>
          constraint.kind ===
          "budget"
      );

  const distance =
    evaluation
      .constraints
      .find(
        (constraint) =>
          constraint.kind ===
          "distance"
      );

  if (
    budget?.status ===
      "satisfied"
  ) {
    reasons.push(
      "Fits within your total budget."
    );
  }

  if (
    distance?.status ===
      "satisfied"
  ) {
    reasons.push(
      "Stays within your selected distance limit."
    );
  }

  if (
    (
      evaluation
        .scores
        .priceValue
        .score ??
      0
    ) >=
      75
  ) {
    reasons.push(
      "Shows strong value against comparable properties."
    );
  }

  if (
    (
      evaluation
        .scores
        .quality
        .score ??
      0
    ) >=
      75
  ) {
    reasons.push(
      "Guest quality is one of its stronger signals."
    );
  }

  if (
    (
      evaluation
        .scores
        .location
        .score ??
      0
    ) >=
      75
  ) {
    reasons.push(
      "Location is a strong fit for this search."
    );
  }

  if (
    evaluation
      .risk
      .level ===
      "low"
  ) {
    reasons.push(
      "The available evidence indicates relatively low uncertainty."
    );
  }

  if (
    evaluation
      .dataConfidence
      .level ===
      "high"
  ) {
    reasons.push(
      "The recommendation is supported by high data confidence."
    );
  }

  if (
    evaluation
      .dataConfidence
      .level ===
      "low" ||
    evaluation
      .dataConfidence
      .level ===
      "none"
  ) {
    reasons.push(
      "Some important evidence is limited, so the score remains conservative."
    );
  }

  return reasons;
}

function createReasons(
  evaluation:
    SmartStayEvaluationV2,
  hotelNames:
    Map<
      string,
      string
    >
) {
  const explanationFacts = [
    ...evaluation
      .explanation
      .strengthFacts,

    ...evaluation
      .explanation
      .comparisonFacts,

    ...evaluation
      .explanation
      .weaknessFacts,
  ];

  const explanationReasons =
    explanationFacts
      .map(
        (fact) =>
          formatExplanationFact(
            fact,
            hotelNames
          )
      )
      .filter(
        (
          reason
        ): reason is string =>
          Boolean(
            reason
          )
      );

  const reasons =
    uniqueStable([
      ...explanationReasons,
      ...createFallbackReasons(
        evaluation
      ),
    ]);

  if (
    reasons.length ===
    0
  ) {
    reasons.push(
      "Balanced evidence-backed option for this search."
    );
  }

  return reasons.slice(
    0,
    4
  );
}

function createFrontendEvaluation(
  evaluation:
    SmartStayEvaluationV2,
  hotelNames:
    Map<
      string,
      string
    >
): SmartStayFrontendEvaluationV2 {
  return {
    hotel:
      evaluation.hotel,

    smartScore:
      Math.round(
        evaluation
          .final
          .smartScore
      ),

    riskLevel:
      evaluation
        .risk
        .level,

    dataConfidenceLevel:
      evaluation
        .dataConfidence
        .level,

    badges:
      createBadges(
        evaluation
      ),

    reasons:
      createReasons(
        evaluation,
        hotelNames
      ),

    sourceEvaluation:
      evaluation,
  };
}

function mapFrontendRole(
  role:
    SmartStayRecommendationPickV2[
      "role"
    ]
): SmartStayFrontendRecommendationRoleV2 {
  if (
    role ===
      "best-sensible-saving"
  ) {
    return "cheaper-alternative";
  }

  if (
    role ===
      "worthwhile-comfort-upgrade"
  ) {
    return "comfort-upgrade";
  }

  return "best-choice";
}

function createRecommendationLabel(
  role:
    SmartStayRecommendationPickV2[
      "role"
    ]
) {
  if (
    role ===
      "best-sensible-saving"
  ) {
    return "Best sensible saving";
  }

  if (
    role ===
      "worthwhile-comfort-upgrade"
  ) {
    return "Worthwhile comfort upgrade";
  }

  return "Best choice for you";
}

function createRecommendationReason(
  pick:
    SmartStayRecommendationPickV2
) {
  const metrics =
    pick.metrics;

  if (
    pick.role ===
      "best-sensible-saving"
  ) {
    const savingPercent =
      typeof metrics
        .priceDifferencePercent ===
        "number"
        ? Math.abs(
            metrics
              .priceDifferencePercent
          )
        : null;

    if (
      savingPercent !==
        null &&
      savingPercent >=
        1
    ) {
      return (
        "Costs " +
        formatNumber(
          savingPercent
        ) +
        "% less while remaining a reliable overall match."
      );
    }

    return "Reduces the total cost without giving up too much overall trip fit.";
  }

  if (
    pick.role ===
      "worthwhile-comfort-upgrade"
  ) {
    const dimension =
      metrics
        .upgradeStrongestGainDimension;

    const dimensionLabel =
      dimension
        ? (
            DIMENSION_LABELS[
              dimension
            ] ??
            dimension
          )
        : "experience";

    const gain =
      metrics
        .upgradeStrongestGain;

    if (
      typeof gain ===
        "number" &&
      Number.isFinite(
        gain
      )
    ) {
      return (
        "Offers a worthwhile " +
        dimensionLabel +
        " improvement of " +
        formatNumber(
          gain
        ) +
        " points."
      );
    }

    return "Provides a meaningful comfort improvement for the extra cost.";
  }

  return "Strongest evidence-backed match for your budget, distance and selected SmartStay balance.";
}

function createRecommendationPicks(
  sourcePicks:
    SmartStayRecommendationPickV2[],
  evaluationsById:
    Map<
      string,
      SmartStayFrontendEvaluationV2
    >
) {
  const usedHotelIds =
    new Set<
      string
    >();

  return sourcePicks
    .filter(
      (pick) =>
        pick.primaryInGroup ||
        pick.groupPosition ===
          0
    )
    .map(
      (pick) => {
        const evaluation =
          evaluationsById.get(
            pick.hotelId
          );

        if (
          !evaluation ||
          usedHotelIds.has(
            pick.hotelId
          )
        ) {
          return null;
        }

        usedHotelIds.add(
          pick.hotelId
        );

        const role =
          mapFrontendRole(
            pick.role
          );

        return {
          role,

          sourceRole:
            pick.role,

          label:
            createRecommendationLabel(
              pick.role
            ),

          reason:
            createRecommendationReason(
              pick
            ),

          evaluation,
        };
      }
    )
    .filter(
      (
        pick
      ): pick is SmartStayFrontendRecommendationPickV2 =>
        pick !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        RECOMMENDATION_ORDER[
          first.role
        ] -
        RECOMMENDATION_ORDER[
          second.role
        ]
    );
}

export function buildSmartStayFrontendViewV2(
  input:
    SmartStayFrontendInputV2
): SmartStayFrontendViewV2 {
  const result =
    evaluateSmartStaySearchV2({
      hotels:
        input.hotels,

      preferenceId:
        input.preferenceId,

      selectedIndex:
        input.selectedIndex,

      preferenceSource:
        input.preferenceSource,

      totalBudget:
        input.totalBudget,

      maximumDistanceKm:
        input.maximumDistanceKm,

      selectedLocation:
        input.selectedLocation,

      nights:
        input.nights,

      adults:
        input.adults,

      children:
        input.children,

      rooms:
        input.rooms,

      previousRankingHotelIds:
        input
          .previousRankingHotelIds,

      maximumVisibleResults:
        input
          .maximumVisibleResults ??
        Math.max(
          input.hotels.length,
          1
        ),

      capturedAt:
        null,
    });

  const hotelNames =
    new Map(
      result.evaluations.map(
        (evaluation) => [
          evaluation.hotel.id,
          evaluation.hotel.name,
        ] as const
      )
    );

  const frontendEvaluations =
    result.evaluations.map(
      (evaluation) =>
        createFrontendEvaluation(
          evaluation,
          hotelNames
        )
    );

  const evaluationsById =
    new Map(
      frontendEvaluations.map(
        (evaluation) => [
          evaluation.hotel.id,
          evaluation,
        ] as const
      )
    );

  const excludedHotelIds =
    uniqueStable(
      result
        .ranking
        .excludedHotelIds
    );

  const suppressedHotelIds =
    uniqueStable(
      result
        .ranking
        .nearDuplicateGroups
        .flatMap(
          (group) =>
            group.suppressedHotelIds
        )
    );

  const excludedSet =
    new Set(
      excludedHotelIds
    );

  const suppressedSet =
    new Set(
      suppressedHotelIds
    );

  const rankedHotelIds =
    uniqueStable([
      ...result
        .ranking
        .visibleHotelIds,

      ...result
        .ranking
        .additionalHotelIds,

      ...result
        .ranking
        .diversifiedRankingHotelIds,
    ]).filter(
      (hotelId) =>
        !excludedSet.has(
          hotelId
        ) &&
        !suppressedSet.has(
          hotelId
        )
    );

  const rankedHotels =
    rankedHotelIds
      .map(
        (hotelId) =>
          evaluationsById.get(
            hotelId
          ) ??
          null
      )
      .filter(
        (
          evaluation
        ): evaluation is SmartStayFrontendEvaluationV2 =>
          evaluation !==
          null
      );

  return {
    engineVersion:
      result.engineVersion,

    pipelineVersion:
      result.pipelineVersion,

    analyzedHotelCount:
      input.hotels.length,

    rankedHotels,

    recommendationPicks:
      createRecommendationPicks(
        result
          .recommendationRoles
          .picks,
        evaluationsById
      ),

    excludedHotelIds,
    suppressedHotelIds,
  };
}