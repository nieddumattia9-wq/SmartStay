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
  SmartStayBestChoiceGroupV2,
  SmartStayRecommendationEvaluationV2,
  SmartStayRecommendationPickV2,
} from "../recommendation/recommendationRolesEngine";

import type {
  SmartStaySelectedOfferV2,
} from "../offers/intentAwareOfferSelectionV2";

import type {
  SmartStayMarketContextSnapshotV2,
} from "../market-context/marketContextModel";

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

export type SmartStayFrontendBudgetVisibilityV2 =
  | "not-set"
  | "within-budget"
  | "near-budget"
  | "far-over-budget"
  | "unverified";

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

  strengths:
    string[];

  tradeOffs:
    string[];

  reasons:
    string[];

  totalCost:
    number | null;

  selectedOffer:
    SmartStaySelectedOfferV2 | null;

  budgetVisibility:
    SmartStayFrontendBudgetVisibilityV2;

  sourceEvaluation:
    SmartStayEvaluationV2;
}

type SmartStayFrontendBaseEvaluationV2 =
  Omit<
    SmartStayFrontendEvaluationV2,
    "totalCost" |
    "budgetVisibility"
  >;

export interface SmartStayFrontendRecommendationPickV2 {
  sourcePick:
    SmartStayRecommendationPickV2;

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

export interface SmartStayFrontendBudgetPolicyV2 {
  totalBudget:
    number | null;

  nearBudgetLimit:
    number | null;

  maximumNearBudgetResults:
    number;

  withinBudgetVisibleCount:
    number;

  nearBudgetCandidateCount:
    number;

  nearBudgetUsefulCandidateCount:
    number;

  nearBudgetVisibleCount:
    number;

  hiddenNearBudgetCount:
    number;

  hiddenNearBudgetNotUsefulCount:
    number;

  hiddenNearBudgetOverflowCount:
    number;

  hiddenFarOverBudgetCount:
    number;

  hiddenBudgetUnverifiedCount:
    number;
}

export interface SmartStayFrontendViewV2 {
  engineVersion:
    string;

  pipelineVersion:
    string;

  analyzedHotelCount:
    number;

  marketContext:
    SmartStayMarketContextSnapshotV2;

  rankedHotels:
    SmartStayFrontendEvaluationV2[];

  recommendationPicks:
    SmartStayFrontendRecommendationPickV2[];

  bestChoiceGroup:
    SmartStayBestChoiceGroupV2 | null;

  budgetPolicy:
    SmartStayFrontendBudgetPolicyV2;

  hiddenNearBudgetHotelIds:
    string[];

  hiddenNearBudgetNotUsefulHotelIds:
    string[];

  hiddenNearBudgetOverflowHotelIds:
    string[];

  hiddenFarOverBudgetHotelIds:
    string[];

  hiddenBudgetUnverifiedHotelIds:
    string[];

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

  destinationKey?:
    SmartStayEngineV2SearchInput[
      "destinationKey"
    ];

  currency?:
    SmartStayEngineV2SearchInput[
      "currency"
    ];

  checkIn?:
    SmartStayEngineV2SearchInput[
      "checkIn"
    ];

  checkOut?:
    SmartStayEngineV2SearchInput[
      "checkOut"
    ];

  marketContextMode?:
    SmartStayEngineV2SearchInput[
      "marketContextMode"
    ];

  marketContextObservations?:
    SmartStayEngineV2SearchInput[
      "marketContextObservations"
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
      "guest reviews",

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

function getExplanationSemanticKey(
  reason:
    string
) {
  const normalized =
    reason
      .trim()
      .toLowerCase();

  if (
    normalized.startsWith(
      "fits your total budget"
    ) ||
    normalized ===
      "fits within your total budget."
  ) {
    return "budget-fit";
  }

  if (
    normalized.startsWith(
      "exceeds your total budget"
    )
  ) {
    return "budget-overage";
  }

  return normalized;
}

function uniqueExplanationReasons(
  reasons:
    string[]
) {
  const seenKeys =
    new Set<
      string
    >();

  return reasons.filter(
    (reason) => {
      const semanticKey =
        getExplanationSemanticKey(
          reason
        );

      if (
        seenKeys.has(
          semanticKey
        )
      ) {
        return false;
      }

      seenKeys.add(
        semanticKey
      );

      return true;
    }
  );
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

function formatReviewStrength(
  evaluation:
    SmartStayEvaluationV2
) {
  const reviewScore =
    evaluation
      .hotel
      .reviewScore;

  const reviewCount =
    evaluation
      .hotel
      .reviewCount;

  if (
    typeof reviewScore ===
      "number" &&
    Number.isFinite(
      reviewScore
    )
  ) {
    const reviewSummary =
      typeof reviewCount ===
        "number" &&
      Number.isFinite(
        reviewCount
      ) &&
      reviewCount >
        0
        ? (
            " across " +
            formatNumber(
              reviewCount,
              0
            ) +
            (
              reviewCount ===
                1
                ? " review"
                : " reviews"
            )
          )
        : "";

    return (
      "Guests rate this stay " +
      formatNumber(
        reviewScore
      ) +
      "/10" +
      reviewSummary +
      "."
    );
  }

  return "Guest reviews are a strong signal for this stay.";
}

function formatReviewTradeOff(
  evaluation:
    SmartStayEvaluationV2
) {
  const reviewScore =
    evaluation
      .hotel
      .reviewScore;

  if (
    typeof reviewScore ===
      "number" &&
    Number.isFinite(
      reviewScore
    )
  ) {
    return (
      "Its " +
      formatNumber(
        reviewScore
      ) +
      "/10 guest rating is weaker than the strongest alternatives in this search."
    );
  }

  return "Guest review evidence is weaker than the strongest alternatives in this search.";
}

function formatExplanationFact(
  fact:
    SmartStayComparisonFactV2,
  hotelNames:
    Map<
      string,
      string
    >,
  evaluation:
    SmartStayEvaluationV2
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
      "below_peer_median"
    ) ||
    key.includes(
      "above_peer_median"
    )
  ) {
    return null;
  }

  if (
    key.includes(
      "within_budget"
    )
  ) {
    return value
      ? `Fits your total budget, leaving ${value}.`
      : "Fits within your total budget.";
  }

  if (
    key.includes(
      "above_budget"
    )
  ) {
    return value
      ? `Exceeds your total budget by ${value}.`
      : "Exceeds your total budget.";
  }

  if (
    key.includes(
      "non_refundable"
    )
  ) {
    return "The selected offer is non-refundable.";
  }

  if (
    key.includes(
      "limited_data"
    )
  ) {
    return "Some important information is missing or uncertain.";
  }

  if (
    key.includes(
      "high_risk"
    )
  ) {
    return "Available evidence indicates a higher level of booking uncertainty.";
  }

  if (
    key.includes(
      "medium_risk"
    )
  ) {
    return "Available evidence indicates some booking uncertainty.";
  }

  if (
    key.includes(
      "solid_data"
    ) ||
    key.includes(
      "low_risk"
    )
  ) {
    return null;
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
    return "Improves the overall trip match.";
  }

  if (
    key.includes(
      "utility_loss"
    )
  ) {
    return "Gives up some overall trip fit.";
  }

  if (
    key.includes(
      "diminishing_returns"
    )
  ) {
    return "The extra spend is entering diminishing returns.";
  }

  if (
    key.includes(
      ".comparison.upgrade_"
    )
  ) {
    const dimensionKey =
      key.split(
        ".comparison.upgrade_"
      )[1] ??
      "";

    const comparisonTarget =
      targetName ??
      "the reference choice";

    if (
      dimensionKey ===
        "quality"
    ) {
      return `Offers stronger review-backed quality than ${comparisonTarget}.`;
    }

    if (
      dimensionKey ===
        "location"
    ) {
      return `Offers a more convenient location than ${comparisonTarget}.`;
    }

    if (
      dimensionKey ===
        "comfort"
    ) {
      return `Offers stronger amenities and room features than ${comparisonTarget}.`;
    }

    if (
      dimensionKey ===
        "flexibility"
    ) {
      return `Offers better booking flexibility than ${comparisonTarget}.`;
    }

    const dimensionLabel =
      DIMENSION_LABELS[
        dimensionKey
      ] ??
      dimensionKey.replace(
        /_/g,
        " "
      );

    return `Offers a meaningful ${dimensionLabel} improvement compared with ${comparisonTarget}.`;
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

    if (
      dimension ===
        "guest reviews"
    ) {
      return formatReviewStrength(
        evaluation
      );
    }

    if (
      dimension ===
        "location"
    ) {
      return value
        ? `Located ${value} from your selected point.`
        : "Well located for this search.";
    }

    if (
      dimension ===
        "comfort"
    ) {
      return "Amenities and room features are a strong fit for this trip.";
    }

    if (
      dimension ===
        "booking flexibility"
    ) {
      return "Booking flexibility is a strong fit for this search.";
    }

    if (
      dimension ===
        "price and value"
    ) {
      return "Price and overall trip fit are well balanced.";
    }

    return dimension
      ? `${dimension[0].toUpperCase()}${dimension.slice(1)} is a strong fit for this search.`
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

    if (
      dimension ===
        "guest reviews"
    ) {
      return formatReviewTradeOff(
        evaluation
      );
    }

    if (
      dimension ===
        "location"
    ) {
      return value
        ? `At ${value} from your selected point, its location is less convenient than the strongest alternatives.`
        : "Its location is less convenient than the strongest alternatives.";
    }

    if (
      dimension ===
        "comfort"
    ) {
      return "Amenities and room features are less aligned with this trip than the strongest alternatives.";
    }

    if (
      dimension ===
        "booking flexibility"
    ) {
      return "Booking terms are less flexible than the strongest alternatives.";
    }

    return dimension
      ? `${dimension[0].toUpperCase()}${dimension.slice(1)} is weaker than the strongest alternatives.`
      : null;
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

function createFallbackStrengths(
  evaluation:
    SmartStayEvaluationV2
) {
  const strengths:
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
    strengths.push(
      "Fits within your total budget."
    );
  }

  if (
    distance?.status ===
      "satisfied"
  ) {
    strengths.push(
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
    strengths.push(
      "Price and overall trip fit are well balanced."
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
    strengths.push(
      formatReviewStrength(
        evaluation
      )
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
    const distanceKm =
      evaluation
        .hotel
        .distance;

    strengths.push(
      typeof distanceKm ===
        "number" &&
      Number.isFinite(
        distanceKm
      )
        ? (
            "Located " +
            formatNumber(
              distanceKm,
              2
            ) +
            " km from your selected point."
          )
        : "Well located for this search."
    );
  }

  return strengths;
}

function createFallbackTradeOffs(
  evaluation:
    SmartStayEvaluationV2
) {
  const tradeOffs:
    string[] = [];

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
    tradeOffs.push(
      "Some important information is missing or uncertain."
    );
  }

  if (
    evaluation
      .risk
      .level ===
      "high"
  ) {
    tradeOffs.push(
      "Available evidence indicates a higher level of booking uncertainty."
    );
  }
  else if (
    evaluation
      .risk
      .level ===
      "medium"
  ) {
    tradeOffs.push(
      "Available evidence indicates some booking uncertainty."
    );
  }

  return tradeOffs;
}

function createSelectedOfferExplanation(
  selectedOffer:
    SmartStaySelectedOfferV2 | null
) {
  if (
    selectedOffer?.selectionMode ===
      "intent-aware-flexibility" &&
    selectedOffer.refundable ===
      true
  ) {
    return {
      strength:
        selectedOffer
          .freeCancellationUntil
          ? "A refundable offer with verified free cancellation was selected for this search."
          : "A refundable offer was selected for this search.",

      tradeOff:
        null,
    };
  }

  if (
    selectedOffer?.refundable ===
      false
  ) {
    return {
      strength:
        null,

      tradeOff:
        "The selected offer is non-refundable.",
    };
  }

  return {
    strength:
      null,

    tradeOff:
      null,
  };
}

function createExplanationSections(
  evaluation:
    SmartStayEvaluationV2,
  hotelNames:
    Map<
      string,
      string
    >,
  selectedOffer:
    SmartStaySelectedOfferV2 | null
) {
  const selectedOfferExplanation =
    createSelectedOfferExplanation(
      selectedOffer
    );

  const strengthFacts = [
    ...evaluation
      .explanation
      .strengthFacts,

    ...evaluation
      .explanation
      .comparisonFacts
      .filter(
        (fact) =>
          fact.direction ===
          "better"
      ),
  ];

  const tradeOffFacts = [
    ...evaluation
      .explanation
      .comparisonFacts
      .filter(
        (fact) =>
          fact.direction ===
            "worse" ||
          fact.messageKey.includes(
            "diminishing_returns"
          )
      ),

    ...evaluation
      .explanation
      .weaknessFacts,
  ];

  const strengths =
    uniqueExplanationReasons([
      selectedOfferExplanation
        .strength,

      ...strengthFacts.map(
        (fact) =>
          formatExplanationFact(
            fact,
            hotelNames,
            evaluation
          )
      ),

      ...createFallbackStrengths(
        evaluation
      ),
    ].filter(
      (
        reason
      ): reason is string =>
        Boolean(
          reason
        )
    )).slice(
      0,
      3
    );

  const tradeOffs =
    uniqueExplanationReasons([
      selectedOfferExplanation
        .tradeOff,

      ...tradeOffFacts.map(
        (fact) =>
          formatExplanationFact(
            fact,
            hotelNames,
            evaluation
          )
      ),

      ...createFallbackTradeOffs(
        evaluation
      ),
    ].filter(
      (
        reason
      ): reason is string =>
        Boolean(
          reason
        )
    )).slice(
      0,
      2
    );

  if (
    strengths.length ===
      0 &&
    tradeOffs.length ===
      0
  ) {
    strengths.push(
      "Balanced evidence-backed option for this search."
    );
  }

  return {
    strengths,
    tradeOffs,
  };
}

function createFrontendEvaluation(
  evaluation:
    SmartStayEvaluationV2,
  recommendationEvaluation:
    SmartStayRecommendationEvaluationV2 | null,
  hotelNames:
    Map<
      string,
      string
    >
): SmartStayFrontendBaseEvaluationV2 {
  const selectedOffer =
    recommendationEvaluation
      ?.metrics
      .selectedOffer ??
    null;

  const explanationSections =
    createExplanationSections(
      evaluation,
      hotelNames,
      selectedOffer
    );

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

    strengths:
      explanationSections
        .strengths,

    tradeOffs:
      explanationSections
        .tradeOffs,

    reasons:
      [
        ...explanationSections
          .strengths,

        ...explanationSections
          .tradeOffs,
      ].slice(
        0,
        4
      ),

    selectedOffer,

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

function isMaximumComfortRecommendation(
  pick:
    SmartStayRecommendationPickV2
) {
  return pick.reasonCodes.includes(
    "budget-intent-preference:maximum-comfort"
  );
}

function createRecommendationLabel(
  pick:
    SmartStayRecommendationPickV2
) {
  if (
    pick.role ===
      "best-sensible-saving"
  ) {
    return isMaximumComfortRecommendation(
      pick
    )
      ? "Premium value alternative"
      : "Best sensible saving";
  }

  if (
    pick.role ===
      "worthwhile-comfort-upgrade"
  ) {
    const dimension =
      pick
        .metrics
        .upgradeStrongestGainDimension;

    if (
      dimension ===
        "quality"
    ) {
      return "Worthwhile quality upgrade";
    }

    if (
      dimension ===
        "location"
    ) {
      return "Worthwhile location upgrade";
    }

    if (
      dimension ===
        "flexibility"
    ) {
      return "Worthwhile flexibility upgrade";
    }

    if (
      dimension ===
        "comfort"
    ) {
      return "Worthwhile comfort upgrade";
    }

    return "Worthwhile upgrade";
  }

  return "Best choice for you";
}

function createRecommendationReason(
  pick:
    SmartStayRecommendationPickV2,
  evaluationsById:
    Map<
      string,
      SmartStayFrontendEvaluationV2
    >
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
        (
          isMaximumComfortRecommendation(
            pick
          )
            ? "% less while preserving a comparable premium experience and offer conditions."
            : "% less while remaining a reliable overall match."
        )
      );
    }

    return isMaximumComfortRecommendation(
      pick
    )
      ? "Preserves a comparable premium experience at a lower total cost."
      : "Reduces the total cost without giving up too much overall trip fit.";
  }

  if (
    pick.role ===
      "worthwhile-comfort-upgrade"
  ) {
    const dimension =
      metrics
        .upgradeStrongestGainDimension;

    const candidateEvaluation =
      evaluationsById.get(
        pick.hotelId
      );

    const targetEvaluation =
      pick.comparisonTargetHotelId
        ? evaluationsById.get(
            pick.comparisonTargetHotelId
          )
        : null;

    if (
      dimension ===
        "quality"
    ) {
      const candidateRating =
        candidateEvaluation
          ?.hotel
          .reviewScore;

      const targetRating =
        targetEvaluation
          ?.hotel
          .reviewScore;

      if (
        typeof candidateRating ===
          "number" &&
        Number.isFinite(
          candidateRating
        ) &&
        typeof targetRating ===
          "number" &&
        Number.isFinite(
          targetRating
        ) &&
        candidateRating >
          targetRating
      ) {
        return (
          "Guest rating rises from " +
          formatNumber(
            targetRating
          ) +
          "/10 to " +
          formatNumber(
            candidateRating
          ) +
          "/10."
        );
      }

      return "Offers a meaningful improvement in review-backed quality.";
    }

    if (
      dimension ===
        "location"
    ) {
      const candidateDistance =
        candidateEvaluation
          ?.hotel
          .distance;

      const targetDistance =
        targetEvaluation
          ?.hotel
          .distance;

      if (
        typeof candidateDistance ===
          "number" &&
        Number.isFinite(
          candidateDistance
        ) &&
        typeof targetDistance ===
          "number" &&
        Number.isFinite(
          targetDistance
        ) &&
        candidateDistance <
          targetDistance
      ) {
        return (
          "Moves you from " +
          formatNumber(
            targetDistance,
            2
          ) +
          " km to " +
          formatNumber(
            candidateDistance,
            2
          ) +
          " km from your selected point."
        );
      }

      return "Offers a meaningfully more convenient location.";
    }

    if (
      dimension ===
        "flexibility"
    ) {
      const selectedOffer =
        candidateEvaluation
          ?.selectedOffer;

      const targetOffer =
        targetEvaluation
          ?.selectedOffer;

      if (
        selectedOffer
          ?.freeCancellationUntil &&
        targetOffer
          ?.freeCancellationUntil ===
          null
      ) {
        return "Adds a refundable offer with verified free cancellation.";
      }

      if (
        selectedOffer
          ?.refundable ===
          true &&
        targetOffer
          ?.refundable ===
          false
      ) {
        return "Adds a refundable booking option.";
      }

      return "Offers meaningfully better booking flexibility.";
    }

    if (
      dimension ===
        "comfort"
    ) {
      return "Offers a meaningful improvement in amenities and room features.";
    }

    return "Offers a meaningful overall upgrade for the extra cost.";
  }

  if (
    pick.reasonCodes.includes(
      "budget-intent-preference:maximum-comfort"
    )
  ) {
    return "Strongest coherent premium experience for your Maximum Comfort search.";
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
    >,
  bestChoiceGroup:
    SmartStayBestChoiceGroupV2 | null
) {
  const usedHotelIds =
    new Set<
      string
    >();
  const visibleBestChoiceHotelIds =
    new Set(
      bestChoiceGroup
        ?.visibleHotelIds ??
      []
    );

  return sourcePicks
    .filter(
      (pick) =>
        pick.role ===
          "best-choice"
          ? visibleBestChoiceHotelIds.has(
              pick.hotelId
            )
          : pick.primaryInGroup ||
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
          sourcePick:
            pick,

          role,

          sourceRole:
            pick.role,

          label:
            createRecommendationLabel(
              pick
            ),

          reason:
            createRecommendationReason(
              pick,
              evaluationsById
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
        ] ||
        first.sourcePick.groupPosition -
          second.sourcePick.groupPosition ||
        first.evaluation.hotel.id.localeCompare(
          second.evaluation.hotel.id
        )
    );
}

function prioritizeBestChoiceGroup(
  evaluations:
    SmartStayFrontendEvaluationV2[],
  bestChoiceGroup:
    SmartStayBestChoiceGroupV2 | null
) {
  if (!bestChoiceGroup) {
    return evaluations;
  }

  const priorityByHotelId =
    new Map(
      bestChoiceGroup
        .allEquivalentHotelIds
        .map(
          (hotelId, index) => [
            hotelId,
            index,
          ] as const
        )
    );

  return evaluations
    .map(
      (evaluation, index) => ({
        evaluation,
        index,
        priority:
          priorityByHotelId.get(
            evaluation.hotel.id
          ) ??
          Number.POSITIVE_INFINITY,
      })
    )
    .sort(
      (first, second) =>
        first.priority -
          second.priority ||
        first.index -
          second.index
    )
    .map(
      (entry) =>
        entry.evaluation
    );
}

const MAXIMUM_NEAR_BUDGET_RESULTS =
  3;

const NEAR_BUDGET_RATIO =
  0.2;

const MAXIMUM_NEAR_BUDGET_AMOUNT =
  150;

function normalizePositiveNumber(
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

function resolveTotalBudget(
  value:
    SmartStayFrontendInputV2[
      "totalBudget"
    ]
) {
  return normalizePositiveNumber(
    value
  );
}

function resolveNearBudgetLimit(
  totalBudget:
    number | null
) {
  if (
    totalBudget ===
    null
  ) {
    return null;
  }

  return (
    totalBudget +
    Math.min(
      totalBudget *
        NEAR_BUDGET_RATIO,
      MAXIMUM_NEAR_BUDGET_AMOUNT
    )
  );
}

function resolveEvaluationTotalCost(
  evaluation:
    SmartStayEvaluationV2,
  selectedOffer:
    SmartStaySelectedOfferV2 | null
) {
  const selectedOfferCost =
    normalizePositiveNumber(
      selectedOffer
        ?.amount
    );

  if (
    selectedOfferCost !==
    null
  ) {
    return selectedOfferCost;
  }

  const budgetConstraint =
    evaluation
      .constraints
      .find(
        (constraint) =>
          constraint.kind ===
          "budget"
      );

  const constraintCost =
    normalizePositiveNumber(
      budgetConstraint
        ?.actualValue
    );

  if (
    constraintCost !==
    null
  ) {
    return constraintCost;
  }

  const hotelCost =
    normalizePositiveNumber(
      evaluation
        .hotel
        .totalKnownCost
    );

  if (
    hotelCost !==
    null
  ) {
    return hotelCost;
  }

  const offerCosts =
    evaluation
      .hotel
      .offers
      .flatMap(
        (offer) => {
          const totalKnownCost =
            normalizePositiveNumber(
              offer
                .totalKnownCost
            );

          if (
            totalKnownCost !==
            null
          ) {
            return [
              totalKnownCost,
            ];
          }

          const price =
            normalizePositiveNumber(
              offer.price
            );

          return price ===
            null
            ? []
            : [
                price,
              ];
        }
      );

  if (
    offerCosts.length >
    0
  ) {
    return Math.min(
      ...offerCosts
    );
  }

  return normalizePositiveNumber(
    evaluation
      .hotel
      .price
  );
}

function classifyBudgetVisibility(
  totalCost:
    number | null,
  totalBudget:
    number | null,
  nearBudgetLimit:
    number | null
): SmartStayFrontendBudgetVisibilityV2 {
  if (
    totalBudget ===
    null
  ) {
    return "not-set";
  }

  if (
    totalCost ===
    null
  ) {
    return "unverified";
  }

  if (
    totalCost <=
    totalBudget
  ) {
    return "within-budget";
  }

  if (
    nearBudgetLimit !==
      null &&
    totalCost <=
      nearBudgetLimit
  ) {
    return "near-budget";
  }

  return "far-over-budget";
}

function getBudgetVisibilityOrder(
  visibility:
    SmartStayFrontendBudgetVisibilityV2
) {
  if (
    visibility ===
    "within-budget" ||
    visibility ===
    "not-set"
  ) {
    return 0;
  }

  if (
    visibility ===
    "near-budget"
  ) {
    return 1;
  }

  if (
    visibility ===
    "unverified"
  ) {
    return 2;
  }

  return 3;
}

function compareBudgetVisibleEvaluations(
  first:
    SmartStayFrontendEvaluationV2,
  second:
    SmartStayFrontendEvaluationV2
) {
  const firstEngineRank =
    first
      .sourceEvaluation
      .final
      .rank ??
    Number.POSITIVE_INFINITY;

  const secondEngineRank =
    second
      .sourceEvaluation
      .final
      .rank ??
    Number.POSITIVE_INFINITY;

  return (
    getBudgetVisibilityOrder(
      first.budgetVisibility
    ) -
      getBudgetVisibilityOrder(
        second.budgetVisibility
      ) ||
    second.smartScore -
      first.smartScore ||
    firstEngineRank -
      secondEngineRank ||
    (
      first.totalCost ??
      Number.POSITIVE_INFINITY
    ) -
      (
        second.totalCost ??
        Number.POSITIVE_INFINITY
      ) ||
    first.hotel.id.localeCompare(
      second.hotel.id
    )
  );
}

const MINIMUM_NEAR_BUDGET_SMART_SCORE_GAIN =
  3;

const MAXIMUM_SMART_SCORE_DROP_FOR_DIMENSION_GAIN =
  4;

const MINIMUM_NEAR_BUDGET_DISTANCE_GAIN_KM =
  1;

const MINIMUM_NEAR_BUDGET_QUALITY_GAIN =
  8;

const MINIMUM_NEAR_BUDGET_COMFORT_GAIN =
  10;

const MINIMUM_NEAR_BUDGET_DIMENSION_CONFIDENCE =
  0.6;

const MAXIMUM_NEAR_BUDGET_SCORE_CONFIDENCE_DROP =
  0.1;

function getRiskOrder(
  level:
    SmartStayRiskLevelV2
) {
  if (
    level ===
    "low"
  ) {
    return 0;
  }

  if (
    level ===
    "medium"
  ) {
    return 1;
  }

  return 2;
}

function getDataConfidenceOrder(
  level:
    SmartStayDataConfidenceLevelV2
) {
  if (
    level ===
    "high"
  ) {
    return 3;
  }

  if (
    level ===
    "medium"
  ) {
    return 2;
  }

  return 1;
}

function resolveEvaluationDistanceKm(
  evaluation:
    SmartStayFrontendEvaluationV2
) {
  const distanceConstraint =
    evaluation
      .sourceEvaluation
      .constraints
      .find(
        (constraint) =>
          constraint.kind ===
          "distance"
      );

  return normalizePositiveNumber(
    distanceConstraint
      ?.actualValue
  );
}

function resolveDimensionGain(
  candidate:
    SmartStayFrontendEvaluationV2,
  reference:
    SmartStayFrontendEvaluationV2,
  dimension:
    "quality" |
    "comfort"
) {
  const candidateDimension =
    candidate
      .sourceEvaluation
      .scores[
        dimension
      ];

  const referenceDimension =
    reference
      .sourceEvaluation
      .scores[
        dimension
      ];

  if (
    candidateDimension.score ===
      null ||
    referenceDimension.score ===
      null ||
    candidateDimension.confidence <
      MINIMUM_NEAR_BUDGET_DIMENSION_CONFIDENCE ||
    referenceDimension.confidence <
      MINIMUM_NEAR_BUDGET_DIMENSION_CONFIDENCE
  ) {
    return null;
  }

  return (
    candidateDimension.score -
    referenceDimension.score
  );
}

function hasNearBudgetReliabilityParity(
  candidate:
    SmartStayFrontendEvaluationV2,
  reference:
    SmartStayFrontendEvaluationV2
) {
  const candidateRiskOrder =
    getRiskOrder(
      candidate.riskLevel
    );

  const referenceRiskOrder =
    getRiskOrder(
      reference.riskLevel
    );

  const candidateConfidenceOrder =
    getDataConfidenceOrder(
      candidate
        .dataConfidenceLevel
    );

  const referenceConfidenceOrder =
    getDataConfidenceOrder(
      reference
        .dataConfidenceLevel
    );

  return (
    candidateRiskOrder <=
      referenceRiskOrder &&
    candidateConfidenceOrder >=
      referenceConfidenceOrder &&
    candidate
      .sourceEvaluation
      .final
      .scoreConfidence +
      MAXIMUM_NEAR_BUDGET_SCORE_CONFIDENCE_DROP >=
      reference
        .sourceEvaluation
        .final
        .scoreConfidence
  );
}

function isUsefulNearBudgetCandidate(
  candidate:
    SmartStayFrontendEvaluationV2,
  reference:
    SmartStayFrontendEvaluationV2 | null
) {
  if (
    reference ===
    null
  ) {
    return true;
  }

  if (
    !hasNearBudgetReliabilityParity(
      candidate,
      reference
    )
  ) {
    return false;
  }

  const smartScoreGain =
    candidate.smartScore -
    reference.smartScore;

  if (
    smartScoreGain >=
    MINIMUM_NEAR_BUDGET_SMART_SCORE_GAIN
  ) {
    return true;
  }

  const candidateDistanceKm =
    resolveEvaluationDistanceKm(
      candidate
    );

  const referenceDistanceKm =
    resolveEvaluationDistanceKm(
      reference
    );

  const distanceGainKm =
    candidateDistanceKm !==
      null &&
    referenceDistanceKm !==
      null
      ? (
          referenceDistanceKm -
          candidateDistanceKm
        )
      : null;

  if (
    distanceGainKm !==
      null &&
    distanceGainKm >=
      MINIMUM_NEAR_BUDGET_DISTANCE_GAIN_KM &&
    smartScoreGain >=
      -MAXIMUM_SMART_SCORE_DROP_FOR_DIMENSION_GAIN
  ) {
    return true;
  }

  const qualityGain =
    resolveDimensionGain(
      candidate,
      reference,
      "quality"
    );

  if (
    qualityGain !==
      null &&
    qualityGain >=
      MINIMUM_NEAR_BUDGET_QUALITY_GAIN &&
    smartScoreGain >=
      -MAXIMUM_SMART_SCORE_DROP_FOR_DIMENSION_GAIN
  ) {
    return true;
  }

  const comfortGain =
    resolveDimensionGain(
      candidate,
      reference,
      "comfort"
    );

  return (
    comfortGain !==
      null &&
    comfortGain >=
      MINIMUM_NEAR_BUDGET_COMFORT_GAIN &&
    smartScoreGain >=
      -MAXIMUM_SMART_SCORE_DROP_FOR_DIMENSION_GAIN
  );
}

function applyBudgetVisibilityPolicy(
  evaluations:
    SmartStayFrontendEvaluationV2[],
  totalBudget:
    number | null,
  nearBudgetLimit:
    number | null
) {
  if (
    totalBudget ===
    null
  ) {
    return {
      visibleEvaluations:
        evaluations
          .slice()
          .sort(
            compareBudgetVisibleEvaluations
          ),

      hiddenNearBudgetHotelIds:
        [] as string[],

      hiddenNearBudgetNotUsefulHotelIds:
        [] as string[],

      hiddenNearBudgetOverflowHotelIds:
        [] as string[],

      hiddenFarOverBudgetHotelIds:
        [] as string[],

      hiddenBudgetUnverifiedHotelIds:
        [] as string[],

      budgetPolicy: {
        totalBudget:
          null,

        nearBudgetLimit:
          null,

        maximumNearBudgetResults:
          MAXIMUM_NEAR_BUDGET_RESULTS,

        withinBudgetVisibleCount:
          evaluations.length,

        nearBudgetCandidateCount:
          0,

        nearBudgetUsefulCandidateCount:
          0,

        nearBudgetVisibleCount:
          0,

        hiddenNearBudgetCount:
          0,

        hiddenNearBudgetNotUsefulCount:
          0,

        hiddenNearBudgetOverflowCount:
          0,

        hiddenFarOverBudgetCount:
          0,

        hiddenBudgetUnverifiedCount:
          0,
      } satisfies SmartStayFrontendBudgetPolicyV2,
    };
  }

  const withinBudget =
    evaluations
      .filter(
        (evaluation) =>
          evaluation
            .budgetVisibility ===
          "within-budget"
      )
      .sort(
        compareBudgetVisibleEvaluations
      );

  const nearBudgetCandidates =
    evaluations
      .filter(
        (evaluation) =>
          evaluation
            .budgetVisibility ===
          "near-budget"
      )
      .sort(
        compareBudgetVisibleEvaluations
      );

  const nearBudgetReference =
    withinBudget.find(
      (evaluation) =>
        evaluation
          .sourceEvaluation
          .recommendation
          .role ===
        "best-choice"
    ) ??
    withinBudget[0] ??
    null;

  const usefulNearBudgetCandidates =
    nearBudgetCandidates.filter(
      (evaluation) =>
        isUsefulNearBudgetCandidate(
          evaluation,
          nearBudgetReference
        )
    );

  const hiddenNearBudgetNotUseful =
    nearBudgetCandidates.filter(
      (evaluation) =>
        !usefulNearBudgetCandidates.some(
          (candidate) =>
            candidate.hotel.id ===
            evaluation.hotel.id
        )
    );

  const visibleNearBudget =
    usefulNearBudgetCandidates.slice(
      0,
      MAXIMUM_NEAR_BUDGET_RESULTS
    );

  const hiddenNearBudgetOverflow =
    usefulNearBudgetCandidates.slice(
      MAXIMUM_NEAR_BUDGET_RESULTS
    );

  const hiddenNearBudget = [
    ...hiddenNearBudgetNotUseful,
    ...hiddenNearBudgetOverflow,
  ].sort(
    compareBudgetVisibleEvaluations
  );

  const hiddenFarOverBudget =
    evaluations
      .filter(
        (evaluation) =>
          evaluation
            .budgetVisibility ===
          "far-over-budget"
      )
      .sort(
        compareBudgetVisibleEvaluations
      );

  const hiddenBudgetUnverified =
    evaluations
      .filter(
        (evaluation) =>
          evaluation
            .budgetVisibility ===
          "unverified"
      )
      .sort(
        compareBudgetVisibleEvaluations
      );

  return {
    visibleEvaluations: [
      ...withinBudget,
      ...visibleNearBudget,
    ],

    hiddenNearBudgetHotelIds:
      hiddenNearBudget.map(
        (evaluation) =>
          evaluation.hotel.id
      ),

    hiddenNearBudgetNotUsefulHotelIds:
      hiddenNearBudgetNotUseful.map(
        (evaluation) =>
          evaluation.hotel.id
      ),

    hiddenNearBudgetOverflowHotelIds:
      hiddenNearBudgetOverflow.map(
        (evaluation) =>
          evaluation.hotel.id
      ),

    hiddenFarOverBudgetHotelIds:
      hiddenFarOverBudget.map(
        (evaluation) =>
          evaluation.hotel.id
      ),

    hiddenBudgetUnverifiedHotelIds:
      hiddenBudgetUnverified.map(
        (evaluation) =>
          evaluation.hotel.id
      ),

    budgetPolicy: {
      totalBudget,

      nearBudgetLimit,

      maximumNearBudgetResults:
        MAXIMUM_NEAR_BUDGET_RESULTS,

      withinBudgetVisibleCount:
        withinBudget.length,

      nearBudgetCandidateCount:
        nearBudgetCandidates.length,

      nearBudgetUsefulCandidateCount:
        usefulNearBudgetCandidates.length,

      nearBudgetVisibleCount:
        visibleNearBudget.length,

      hiddenNearBudgetCount:
        hiddenNearBudget.length,

      hiddenNearBudgetNotUsefulCount:
        hiddenNearBudgetNotUseful.length,

      hiddenNearBudgetOverflowCount:
        hiddenNearBudgetOverflow.length,

      hiddenFarOverBudgetCount:
        hiddenFarOverBudget.length,

      hiddenBudgetUnverifiedCount:
        hiddenBudgetUnverified.length,
    } satisfies SmartStayFrontendBudgetPolicyV2,
  };
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

      destinationKey:
        input.destinationKey,

      currency:
        input.currency,

      checkIn:
        input.checkIn,

      checkOut:
        input.checkOut,

      marketContextMode:
        input.marketContextMode,

      marketContextObservations:
        input.marketContextObservations,

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

  const recommendationEvaluationsById =
    new Map(
      result
        .recommendationRoles
        .evaluations
        .map(
          (evaluation) => [
            evaluation.hotelId,
            evaluation,
          ] as const
        )
    );

  const totalBudget =
    resolveTotalBudget(
      input.totalBudget
    );

  const nearBudgetLimit =
    resolveNearBudgetLimit(
      totalBudget
    );

  const frontendEvaluations =
    result.evaluations.map(
      (evaluation) => {
        const frontendEvaluation =
          createFrontendEvaluation(
            evaluation,
            recommendationEvaluationsById.get(
              evaluation.hotel.id
            ) ??
            null,
            hotelNames
          );

        const totalCost =
          resolveEvaluationTotalCost(
            evaluation,
            frontendEvaluation
              .selectedOffer
          );

        return {
          ...frontendEvaluation,

          totalCost,

          budgetVisibility:
            classifyBudgetVisibility(
              totalCost,
              totalBudget,
              nearBudgetLimit
            ),
        };
      }
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

  const eligibleRankedHotels =
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

  const budgetVisibility =
    applyBudgetVisibilityPolicy(
      eligibleRankedHotels,
      totalBudget,
      nearBudgetLimit
    );

  const rankedHotels =
    prioritizeBestChoiceGroup(
      budgetVisibility
        .visibleEvaluations,
      result
        .recommendationRoles
        .bestChoiceGroup
    );

  const visibleHotelIds =
    new Set(
      rankedHotels.map(
        (evaluation) =>
          evaluation.hotel.id
      )
    );

  const recommendationPicks =
    createRecommendationPicks(
      result
        .recommendationRoles
        .picks,
      evaluationsById,
      result
        .recommendationRoles
        .bestChoiceGroup
    ).filter(
      (pick) =>
        visibleHotelIds.has(
          pick
            .evaluation
            .hotel
            .id
        )
    );

  return {
    engineVersion:
      result.engineVersion,

    pipelineVersion:
      result.pipelineVersion,

    analyzedHotelCount:
      input.hotels.length,

    marketContext:
      result.marketContext,

    rankedHotels,

    recommendationPicks,

    bestChoiceGroup:
      result
        .recommendationRoles
        .bestChoiceGroup,

    budgetPolicy:
      budgetVisibility
        .budgetPolicy,

    hiddenNearBudgetHotelIds:
      budgetVisibility
        .hiddenNearBudgetHotelIds,

    hiddenNearBudgetNotUsefulHotelIds:
      budgetVisibility
        .hiddenNearBudgetNotUsefulHotelIds,

    hiddenNearBudgetOverflowHotelIds:
      budgetVisibility
        .hiddenNearBudgetOverflowHotelIds,

    hiddenFarOverBudgetHotelIds:
      budgetVisibility
        .hiddenFarOverBudgetHotelIds,

    hiddenBudgetUnverifiedHotelIds:
      budgetVisibility
        .hiddenBudgetUnverifiedHotelIds,

    excludedHotelIds,
    suppressedHotelIds,
  };
}