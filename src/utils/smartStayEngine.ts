import { getBestComparableStayCost } from "./stayCost";
import type { Hotel } from "../types/hotel";

export type SmartRiskLevel =
  | "low"
  | "medium"
  | "high";

export type SmartStayPreferenceId =
  | "maximum-comfort"
  | "comfort"
  | "balanced"
  | "savings"
  | "maximum-savings";

export type SmartStaySearchConstraints = {
  totalBudget?: number | null;
  maxDistanceKm?: number | null;
  currency?: string | null;
};

export type SmartBadge =
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

export type SmartScoreBreakdown = {
  price: number;
  reviews: number;
  location: number;
  stars: number;
  saving: number;
  amenities: number;
  dataQuality: number;
  offer: number;
  reliability: number;
};

export type SmartStayFitBreakdown = {
  marketPriceFit: number;
  budgetFit: number | null;
  distanceFit: number | null;
};

export type SmartStayEvaluation = {
  hotel: Hotel;
  smartScore: number;
  riskLevel: SmartRiskLevel;
  badges: SmartBadge[];
  reasons: string[];
  fit: SmartStayFitBreakdown;
  breakdown: SmartScoreBreakdown;
};

export type SmartStayPriceBaseline = {
  averagePrice: number;
  medianPrice: number;
  firstQuartilePrice: number;
  thirdQuartilePrice: number;
  minPrice: number;
  maxPrice: number;
  comparablePriceCount: number;
  referencePriceCount: number;
  excludedOutlierCount: number;
};

type SmartStayContext =
  SmartStayPriceBaseline & {
    totalBudget: number | null;
    maxDistanceKm: number | null;
    currency: string | null;
  };

type PreferenceWeights = {
  price: number;
  reviews: number;
  location: number;
  stars: number;
  saving: number;
  amenities: number;
  dataQuality: number;
  offer: number;
  reliability: number;
};

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function roundScore(value: number) {
  return Math.round(
    clamp(value, 0, 100)
  );
}

function normalizePreferenceId(
  preferenceId?: string
): SmartStayPreferenceId {
  if (
    preferenceId === "maximum-comfort" ||
    preferenceId === "comfort" ||
    preferenceId === "balanced" ||
    preferenceId === "savings" ||
    preferenceId === "maximum-savings"
  ) {
    return preferenceId;
  }

  return "balanced";
}

function isValidNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function hasPositiveNumber(value: unknown): value is number {
  return (
    isValidNumber(value) &&
    value > 0
  );
}

function normalizePositiveConstraint(
  value: unknown
): number | null {
  return hasPositiveNumber(value)
    ? value
    : null;
}

function normalizeConstraintCurrency(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const normalized =
    value.trim().toUpperCase();

  return /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : null;
}

function getComparableBudgetCost(
  hotel: Hotel,
  context: SmartStayContext
) {
  const cost =
    getBestComparableStayCost(hotel);

  if (!cost) {
    return null;
  }

  if (
    context.currency &&
    cost.currency !== context.currency
  ) {
    return null;
  }

  return cost;
}

function getBudgetPriority(
  evaluation: SmartStayEvaluation,
  context: SmartStayContext
) {
  if (context.totalBudget === null) {
    return 0;
  }

  const cost =
    getComparableBudgetCost(
      evaluation.hotel,
      context
    );

  if (!cost) {
    return 4;
  }

  const isWithinBudget =
    cost.amount <= context.totalBudget;

  const isReliableBudgetCost =
    evaluation.riskLevel !== "high" &&
    cost.completeness ===
      "reported-complete";

  if (isReliableBudgetCost) {
    return isWithinBudget
      ? 0
      : 1;
  }

  return isWithinBudget
    ? 2
    : 3;
}

function getBestOfferPrice(hotel: Hotel) {
  return (
    getBestComparableStayCost(
      hotel
    )?.amount ??
    null
  );
}

function hasValidOffer(hotel: Hotel) {
  return getBestOfferPrice(hotel) !== null;
}

function calculateAverage(
  values: number[]
) {
  if (values.length === 0) {
    return 0;
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    );

  return total / values.length;
}

function calculateQuantile(
  sortedValues: number[],
  quantile: number
) {
  if (sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const position =
    (
      sortedValues.length - 1
    ) *
    clamp(
      quantile,
      0,
      1
    );

  const lowerIndex =
    Math.floor(position);

  const upperIndex =
    Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const interpolationWeight =
    position - lowerIndex;

  return (
    sortedValues[lowerIndex] +
    (
      sortedValues[upperIndex] -
      sortedValues[lowerIndex]
    ) *
    interpolationWeight
  );
}

export function createSmartStayPriceBaseline(
  values: number[]
): SmartStayPriceBaseline {
  const sortedPrices =
    values
      .filter(hasPositiveNumber)
      .slice()
      .sort(
        (firstPrice, secondPrice) =>
          firstPrice - secondPrice
      );

  if (sortedPrices.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      firstQuartilePrice: 0,
      thirdQuartilePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      comparablePriceCount: 0,
      referencePriceCount: 0,
      excludedOutlierCount: 0,
    };
  }

  const medianPrice =
    calculateQuantile(
      sortedPrices,
      0.5
    );

  const firstQuartilePrice =
    calculateQuantile(
      sortedPrices,
      0.25
    );

  const thirdQuartilePrice =
    calculateQuantile(
      sortedPrices,
      0.75
    );

  const interquartileRange =
    thirdQuartilePrice -
    firstQuartilePrice;

  let referencePrices =
    sortedPrices;

  if (
    sortedPrices.length >= 5 &&
    interquartileRange > 0
  ) {
    const lowerFence =
      firstQuartilePrice -
      interquartileRange * 1.5;

    const upperFence =
      thirdQuartilePrice +
      interquartileRange * 1.5;

    const pricesWithinFences =
      sortedPrices.filter(
        (price) =>
          price >= lowerFence &&
          price <= upperFence
      );

    if (
      pricesWithinFences.length >= 3
    ) {
      referencePrices =
        pricesWithinFences;
    }
  }

  return {
    averagePrice:
      calculateAverage(
        referencePrices
      ),

    medianPrice,

    firstQuartilePrice,

    thirdQuartilePrice,

    minPrice:
      referencePrices[0],

    maxPrice:
      referencePrices[
        referencePrices.length - 1
      ],

    comparablePriceCount:
      sortedPrices.length,

    referencePriceCount:
      referencePrices.length,

    excludedOutlierCount:
      sortedPrices.length -
      referencePrices.length,
  };
}

function getValidPrices(
  hotels: Hotel[],
  currency: string | null
) {
  return hotels
    .map((hotel) => {
      const cost =
        getBestComparableStayCost(
          hotel
        );

      if (!cost) {
        return null;
      }

      const costCurrency =
        normalizeConstraintCurrency(
          cost.currency
        );

      if (
        currency &&
        costCurrency !== currency
      ) {
        return null;
      }

      return cost.amount;
    })
    .filter(hasPositiveNumber);
}

function createSmartStayContext(
  hotels: Hotel[],
  constraints:
    SmartStaySearchConstraints = {}
): SmartStayContext {
  const totalBudget =
    normalizePositiveConstraint(
      constraints.totalBudget
    );

  const maxDistanceKm =
    normalizePositiveConstraint(
      constraints.maxDistanceKm
    );

  const currency =
    normalizeConstraintCurrency(
      constraints.currency
    );

  const prices =
    getValidPrices(
      hotels,
      currency
    );

  const priceBaseline =
    createSmartStayPriceBaseline(
      prices
    );

  return {
    ...priceBaseline,
    totalBudget,
    maxDistanceKm,
    currency,
  };
}

function getPreferenceWeights(
  preferenceIdInput: string
): PreferenceWeights {
  const preferenceId =
    normalizePreferenceId(preferenceIdInput);

  if (preferenceId === "maximum-comfort") {
    return {
      price: 0.12,
      reviews: 0.24,
      location: 0.21,
      stars: 0.11,
      saving: 0.03,
      amenities: 0.09,
      dataQuality: 0.1,
      offer: 0.03,
      reliability: 0.07,
    };
  }

  if (preferenceId === "comfort") {
    return {
      price: 0.16,
      reviews: 0.22,
      location: 0.2,
      stars: 0.1,
      saving: 0.05,
      amenities: 0.08,
      dataQuality: 0.09,
      offer: 0.04,
      reliability: 0.06,
    };
  }

  if (preferenceId === "savings") {
    return {
      price: 0.3,
      reviews: 0.15,
      location: 0.12,
      stars: 0.05,
      saving: 0.15,
      amenities: 0.04,
      dataQuality: 0.07,
      offer: 0.07,
      reliability: 0.05,
    };
  }

  if (preferenceId === "maximum-savings") {
    return {
      price: 0.36,
      reviews: 0.11,
      location: 0.09,
      stars: 0.04,
      saving: 0.18,
      amenities: 0.03,
      dataQuality: 0.06,
      offer: 0.08,
      reliability: 0.05,
    };
  }

  return {
    price: 0.22,
    reviews: 0.2,
    location: 0.17,
    stars: 0.08,
    saving: 0.09,
    amenities: 0.07,
    dataQuality: 0.08,
    offer: 0.04,
    reliability: 0.05,
  };
}

function calculateBudgetFitScore(
  hotel: Hotel,
  context: SmartStayContext
): number | null {
  if (context.totalBudget === null) {
    return null;
  }

  const cost =
    getComparableBudgetCost(
      hotel,
      context
    );

  if (!cost) {
    return 30;
  }

  const ratio =
    cost.amount / context.totalBudget;

  let score: number;

  if (ratio <= 0.75) {
    score = 100;
  } else if (ratio <= 1) {
    score =
      100 -
      ((ratio - 0.75) / 0.25) * 8;
  } else if (ratio <= 1.05) {
    score =
      92 -
      ((ratio - 1) / 0.05) * 17;
  } else if (ratio <= 1.15) {
    score =
      75 -
      ((ratio - 1.05) / 0.1) * 20;
  } else if (ratio <= 1.3) {
    score =
      55 -
      ((ratio - 1.15) / 0.15) * 20;
  } else {
    score =
      Math.max(
        10,
        35 - (ratio - 1.3) * 30
      );
  }

  if (cost.completeness === "partial") {
    score -= 6;
  }

  if (cost.completeness === "unknown") {
    score -= 14;
  }

  return roundScore(score);
}

function calculateMarketPriceFitScore(
  hotel: Hotel,
  context: SmartStayContext
) {
  const hotelPrice =
    getBestOfferPrice(
      hotel
    );

  let marketPriceScore = 40;

  if (
    hotelPrice &&
    context.averagePrice > 0
  ) {
    if (
      context.minPrice ===
      context.maxPrice
    ) {
      marketPriceScore = 72;
    } else {
      const pricePosition =
        (
          hotelPrice -
          context.minPrice
        ) /
        (
          context.maxPrice -
          context.minPrice
        );

      const rangeScore =
        100 -
        pricePosition * 75;

      const comparedToAverage =
        context.averagePrice /
        hotelPrice;

      const averageBonus =
        clamp(
          (
            comparedToAverage -
            1
          ) *
          22,
          -16,
          16
        );

      marketPriceScore =
        roundScore(
          rangeScore +
          averageBonus
        );
    }
  }

  return marketPriceScore;
}

function calculatePriceScore(
  hotel: Hotel,
  context: SmartStayContext
) {
  const marketPriceScore =
    calculateMarketPriceFitScore(
      hotel,
      context
    );

  const budgetFitScore =
    calculateBudgetFitScore(
      hotel,
      context
    );

  if (budgetFitScore === null) {
    return marketPriceScore;
  }

  return roundScore(
    marketPriceScore * 0.55 +
    budgetFitScore * 0.45
  );
}

function calculateReviewScore(
  hotel: Hotel
) {
  if (hotel.reviewScore === null) {
    return 38;
  }

  const normalizedRating =
    clamp(
      hotel.reviewScore,
      0,
      10
    ) * 10;

  const reviewCount =
    hotel.reviewCount ?? 0;

  const confidence =
    reviewCount <= 0
      ? 0.35
      : clamp(
          Math.log10(reviewCount + 1) / 3,
          0.45,
          1
        );

  const neutralScore = 52;

  return roundScore(
    normalizedRating * confidence +
    neutralScore * (1 - confidence)
  );
}

function calculateAbsoluteLocationScore(
  hotel: Hotel
) {
  if (hotel.distance === null) {
    return 55;
  }

  if (hotel.distance <= 0.5) {
    return 100;
  }

  if (hotel.distance <= 1) {
    return 92;
  }

  if (hotel.distance <= 2) {
    return 82;
  }

  if (hotel.distance <= 4) {
    return 68;
  }

  if (hotel.distance <= 7) {
    return 50;
  }

  if (hotel.distance <= 10) {
    return 38;
  }

  return 25;
}

function calculatePreferredDistanceFit(
  distance: number,
  maxDistanceKm: number
) {
  const ratio =
    distance / maxDistanceKm;

  if (ratio <= 0.5) {
    return 100;
  }

  if (ratio <= 0.75) {
    return 96;
  }

  if (ratio <= 1) {
    return 90;
  }

  if (ratio <= 1.25) {
    return 72;
  }

  if (ratio <= 1.5) {
    return 56;
  }

  if (ratio <= 2) {
    return 38;
  }

  return 22;
}

function calculateDistanceFitScore(
  hotel: Hotel,
  context: SmartStayContext
): number | null {
  if (
    context.maxDistanceKm === null
  ) {
    return null;
  }

  if (hotel.distance === null) {
    return 42;
  }

  return calculatePreferredDistanceFit(
    hotel.distance,
    context.maxDistanceKm
  );
}

function calculateLocationScore(
  hotel: Hotel,
  context: SmartStayContext
) {
  const absoluteScore =
    calculateAbsoluteLocationScore(
      hotel
    );

  const distanceFitScore =
    calculateDistanceFitScore(
      hotel,
      context
    );

  if (distanceFitScore === null) {
    return absoluteScore;
  }

  if (hotel.distance === null) {
    return distanceFitScore;
  }

  return roundScore(
    distanceFitScore * 0.75 +
    absoluteScore * 0.25
  );
}

function calculateStarScore(
  hotel: Hotel
) {
  if (hotel.stars <= 0) {
    return 55;
  }

  return roundScore(
    (clamp(hotel.stars, 0, 5) / 5) * 100
  );
}

function calculateSavingScore(
    hotel: Hotel,
    context: SmartStayContext
  ) {
    const hotelPrice =
      getBestOfferPrice(hotel);
  
    if (
      !hotelPrice ||
      context.averagePrice <= 0 ||
      hotelPrice >= context.averagePrice
    ) {
      return 45;
    }
  
    const belowAveragePercent =
      ((context.averagePrice - hotelPrice) /
        context.averagePrice) *
      100;
  
    if (
      !Number.isFinite(belowAveragePercent) ||
      belowAveragePercent < 5
    ) {
      return 45;
    }
  
    if (belowAveragePercent >= 40) {
      return 95;
    }
  
    if (belowAveragePercent >= 30) {
      return 88;
    }
  
    if (belowAveragePercent >= 20) {
      return 78;
    }
  
    if (belowAveragePercent >= 10) {
      return 65;
    }
  
    return 55;
  }
  
  function normalizeTextList(
    values: string[]
  ) {
    return values
      .join(" ")
      .toLowerCase();
  }
  
  function calculateAmenityScore(
    hotel: Hotel
  ) {
    const text = normalizeTextList([
      ...hotel.amenities,
      ...hotel.facilities,
    ]);
  
    if (!text) {
      return 45;
    }
  
    const importantSignals = [
      "wifi",
      "internet",
      "air conditioning",
      "air-conditioned",
      "air condition",
      "kitchen",
      "breakfast",
      "parking",
      "elevator",
      "lift",
      "washing",
      "washer",
      "private bathroom",
      "non-smoking",
    ];
  
    const matchedSignals =
      importantSignals.filter((signal) =>
        text.includes(signal)
      ).length;
  
    const varietyBonus = clamp(
      hotel.facilities.length * 1.25,
      0,
      14
    );
  
    return roundScore(
      45 + matchedSignals * 6 + varietyBonus
    );
  }
  
  function calculateDataQualityScore(
    hotel: Hotel
  ) {
    const availableData = hotel.availableData;
  
    if (!availableData) {
      return 45;
    }
  
    let score = 0;
  
    if (availableData.hasPrice) score += 18;
    if (availableData.hasBasePrice) score += 4;
    if (availableData.hasStars) score += 8;
    if (availableData.hasReviewScore) score += 16;
    if (availableData.hasReviewCount) score += 10;
    if (availableData.hasDistance) score += 9;
    if (availableData.hasImage) score += 6;
    if (availableData.hasAddress) score += 5;
    if (availableData.hasCoordinates) score += 8;
    if (availableData.hasAmenities) score += 7;
  
    if (hotel.dataConfidence === "full") {
      score += 6;
    }
  
    if (hotel.dataConfidence === "limited") {
      score -= 10;
    }
  
    return roundScore(score);
  }
  
  function calculateOfferScore(
    hotel: Hotel
  ) {
    const offers = hotel.offers ?? [];
  
    const validOffers =
      offers.filter((offer) =>
        hasPositiveNumber(offer.price)
      );
  
    if (
      validOffers.length === 0 &&
      !hasPositiveNumber(hotel.price)
    ) {
      return 25;
    }
  
    let score =
      validOffers.length > 0
        ? 58
        : 52;
  
    if (validOffers.length >= 3) {
      score += 18;
    } else if (validOffers.length === 2) {
      score += 12;
    } else if (validOffers.length === 1) {
      score += 7;
    }
  
    if (
      validOffers.some((offer) =>
        offer.bookable === true
      )
    ) {
      score += 7;
    }
  
    if (
      validOffers.some((offer) =>
        Boolean(offer.cancellationPolicy)
      )
    ) {
      score += 7;
    }
  
    if (
      validOffers.some((offer) =>
        Boolean(offer.roomName)
      )
    ) {
      score += 5;
    }
  
    if (
      validOffers.some((offer) =>
        typeof offer.taxesIncluded === "boolean"
      )
    ) {
      score += 5;
    }
  
    return roundScore(score);
  }
  
  function calculateReliabilityScore(
    hotel: Hotel,
    reviewScore: number,
    priceScore: number,
    dataQualityScore: number,
    offerScore: number
  ) {
    const reviewCount =
      hotel.reviewCount ?? 0;
  
    const reviewCountScore =
      reviewCount <= 0
        ? 18
        : roundScore(
            clamp(
              Math.log10(reviewCount + 1) / 3,
              0,
              1
            ) * 100
          );
  
    const hasUsefulIdentity = Boolean(
      hotel.name &&
      hotel.provider &&
      hotel.image
    );
  
    const identityScore =
      hasUsefulIdentity
        ? 86
        : 55;
  
    const priceSafetyScore =
      hasValidOffer(hotel)
        ? priceScore
        : 20;
  
    const missingReviewPenalty =
      hotel.reviewScore === null ||
      reviewCount <= 0
        ? 16
        : 0;
  
    const dataConfidenceAdjustment =
      hotel.dataConfidence === "full"
        ? 8
        : hotel.dataConfidence === "partial"
          ? 2
          : hotel.dataConfidence === "limited"
            ? -12
            : 0;
  
    const multipleSourcesBonus =
      (hotel.dataSources?.length ?? 0) >= 2
        ? 7
        : 0;
  
    return roundScore(
      reviewScore * 0.3 +
      reviewCountScore * 0.24 +
      identityScore * 0.14 +
      priceSafetyScore * 0.1 +
      dataQualityScore * 0.14 +
      offerScore * 0.08 -
      missingReviewPenalty +
      dataConfidenceAdjustment +
      multipleSourcesBonus
    );
  }
  
  function calculateRiskLevel(
    hotel: Hotel,
    reliabilityScore: number,
    dataQualityScore: number,
    offerScore: number
  ): SmartRiskLevel {
    const hasReviewData =
      hotel.reviewScore !== null &&
      (hotel.reviewCount ?? 0) > 0;
  
    if (!hasValidOffer(hotel)) {
      return "high";
    }
  
    if (
      reliabilityScore < 42 ||
      dataQualityScore < 35 ||
      offerScore < 35
    ) {
      return "high";
    }
  
    if (!hasReviewData) {
      return "medium";
    }
  
    if (
      hotel.dataConfidence === "limited" ||
      reliabilityScore < 66 ||
      dataQualityScore < 58
    ) {
      return "medium";
    }
  
    return "low";
  }

  function createBadges(
    breakdown: SmartScoreBreakdown,
    smartScore: number,
    riskLevel: SmartRiskLevel,
    hotel: Hotel
  ): SmartBadge[] {
    const badges: SmartBadge[] = [];
  
    if (
      smartScore >= 84 &&
      riskLevel === "low"
    ) {
      badges.push("Smart Pick");
    }
  
    if (
      hotel.dataConfidence === "limited" ||
      breakdown.dataQuality < 48
    ) {
      badges.push("Limited Data");
    }
  
    if (breakdown.price >= 82) {
      badges.push("Great Value");
    }
  
    if (breakdown.location >= 82) {
      badges.push("Great Location");
    }
  
    if (
      breakdown.reviews >= 82 &&
      (hotel.reviewCount ?? 0) >= 50
    ) {
      badges.push("Reliable Reviews");
    }
  
    if (breakdown.amenities >= 75) {
      badges.push("Strong Amenities");
    }
  
    if (breakdown.offer >= 75) {
      badges.push("Multiple Offers");
    }
  
    if (
      breakdown.dataQuality >= 75 &&
      breakdown.reliability >= 70
    ) {
      badges.push("Solid Data");
    }
  
    if (riskLevel === "low") {
      badges.push("Low Risk");
    }
  
    if (badges.length === 0) {
      badges.push("Balanced Choice");
    }
  
    return badges.slice(0, 3);
  }
  
  function createReasons(
    breakdown: SmartScoreBreakdown,
    riskLevel: SmartRiskLevel,
    hotel: Hotel
  ) {
    const reasons: string[] = [];
  
    if (
      hotel.reviewScore === null ||
      (hotel.reviewCount ?? 0) <= 0
    ) {
      reasons.push(
        "Limited review data, so SmartStay keeps this score more conservative."
      );
    }
  
    if (
      hotel.dataConfidence === "limited" ||
      breakdown.dataQuality < 48
    ) {
      reasons.push(
        "Some important hotel data is missing, so SmartStay treats this result with extra caution."
      );
    }
  
    if (!hasValidOffer(hotel)) {
      reasons.push(
        "The available offer data is weak, so this option should be verified carefully before booking."
      );
    }
  
    if (breakdown.reviews >= 80) {
      reasons.push(
        "Strong guest rating with better review reliability."
      );
    }
  
    if (breakdown.price >= 80) {
      reasons.push(
        "Good price compared to other available stays."
      );
    }
  
    if (breakdown.location >= 80) {
      reasons.push(
        "Convenient location for the selected destination."
      );
    }
  
    if (breakdown.amenities >= 75) {
      reasons.push(
        "Useful amenities and facilities detected."
      );
    }
  
    if (breakdown.saving >= 75) {
      reasons.push(
        "The price is clearly below the average available option for this search."
      );
    }
  
    if (breakdown.offer >= 75) {
      reasons.push(
        "The offer information looks stronger than average for this search."
      );
    }
  
    if (
      breakdown.dataQuality >= 75 &&
      breakdown.reliability >= 70
    ) {
      reasons.push(
        "The available data is solid enough to support a more confident recommendation."
      );
    }
  
    if (riskLevel === "high") {
      reasons.push(
        "Higher uncertainty due to limited reliability signals."
      );
    }
  
    if (
      reasons.length === 0 &&
      hotel.reviewScore !== null
    ) {
      reasons.push(
        "Balanced option based on price, reviews, and location."
      );
    }
  
    if (reasons.length === 0) {
      reasons.push(
        "Limited data available, but still comparable with other results."
      );
    }
  
    return reasons.slice(0, 4);
  }
  
  function applyDataConfidenceAdjustment(
    hotel: Hotel,
    smartScore: number,
    dataQualityScore: number,
    offerScore: number,
    reliabilityScore: number
  ) {
    let adjustedScore = smartScore;
  
    const hasReviewScore =
      hotel.reviewScore !== null;
  
    const hasReviewCount =
      (hotel.reviewCount ?? 0) > 0;
  
    if (
      !hasReviewScore &&
      !hasReviewCount
    ) {
      adjustedScore = Math.min(
        adjustedScore - 8,
        72
      );
    } else if (
      hasReviewScore &&
      !hasReviewCount
    ) {
      adjustedScore = Math.min(
        adjustedScore - 4,
        78
      );
    } else if (
      hasReviewCount &&
      (hotel.reviewCount ?? 0) < 10
    ) {
      adjustedScore = Math.min(
        adjustedScore - 3,
        82
      );
    }
  
    if (hotel.dataConfidence === "limited") {
      adjustedScore -= 7;
    }
  
    if (dataQualityScore < 50) {
      adjustedScore -= 5;
    }
  
    if (offerScore < 45) {
      adjustedScore -= 4;
    }
  
    if (reliabilityScore < 50) {
      adjustedScore -= 5;
    }
  
    if (!hasValidOffer(hotel)) {
      adjustedScore = Math.min(
        adjustedScore - 10,
        55
      );
    }
  
    return adjustedScore;
  }
  
  function calculatePreferenceAdjustment(
    breakdown: SmartScoreBreakdown,
    riskLevel: SmartRiskLevel,
    preferenceIdInput: string
  ) {
    const preferenceId =
      normalizePreferenceId(preferenceIdInput);
  
    let adjustment = 0;
  
    if (preferenceId === "maximum-comfort") {
      if (riskLevel === "low") adjustment += 4;
      if (riskLevel === "medium") adjustment -= 3;
      if (riskLevel === "high") adjustment -= 12;
  
      if (breakdown.reviews < 50) adjustment -= 4;
      if (breakdown.location >= 82) adjustment += 3;
      if (breakdown.stars >= 80) adjustment += 2;
      if (breakdown.dataQuality >= 75) adjustment += 3;
      if (breakdown.reliability >= 72) adjustment += 3;
    }
  
    if (preferenceId === "comfort") {
      if (riskLevel === "low") adjustment += 3;
      if (riskLevel === "medium") adjustment -= 1;
      if (riskLevel === "high") adjustment -= 9;
  
      if (breakdown.location >= 82) adjustment += 2;
      if (breakdown.reviews >= 75) adjustment += 2;
      if (breakdown.dataQuality < 50) adjustment -= 3;
    }
  
    if (preferenceId === "savings") {
      if (breakdown.price >= 80) adjustment += 4;
      if (breakdown.saving >= 70) adjustment += 3;
      if (breakdown.offer >= 70) adjustment += 2;
  
      if (riskLevel === "high") adjustment -= 8;
      if (breakdown.reliability < 50) adjustment -= 4;
      if (breakdown.dataQuality < 45) adjustment -= 3;
    }
  
    if (preferenceId === "maximum-savings") {
      if (breakdown.price >= 82) adjustment += 6;
      if (breakdown.saving >= 70) adjustment += 4;
      if (breakdown.offer >= 70) adjustment += 3;
  
      if (riskLevel === "low") adjustment += 1;
      if (riskLevel === "medium") adjustment -= 1;
      if (riskLevel === "high") adjustment -= 12;
  
      if (breakdown.reliability < 45) adjustment -= 7;
      if (breakdown.dataQuality < 40) adjustment -= 5;
    }
  
    return adjustment;
  }
  
  export function evaluateHotelWithSmartStayEngine(
    hotel: Hotel,
    context: SmartStayContext,
    preferenceIdInput: string = "balanced"
  ): SmartStayEvaluation {
    const preferenceId =
      normalizePreferenceId(preferenceIdInput);
  
    const weights =
      getPreferenceWeights(preferenceId);
  
    const marketPriceFit =
      calculateMarketPriceFitScore(
        hotel,
        context
      );

    const budgetFit =
      calculateBudgetFitScore(
        hotel,
        context
      );

    const distanceFit =
      calculateDistanceFitScore(
        hotel,
        context
      );

    const priceScore =
      calculatePriceScore(
        hotel,
        context
      );

    const reviewScore =
      calculateReviewScore(hotel);
  
    const locationScore =
      calculateLocationScore(
        hotel,
        context
      );
  
    const starScore =
      calculateStarScore(hotel);
  
    const savingScore =
      calculateSavingScore(hotel, context);
  
    const amenityScore =
      calculateAmenityScore(hotel);
  
    const dataQualityScore =
      calculateDataQualityScore(hotel);
  
    const offerScore =
      calculateOfferScore(hotel);
  
    const reliabilityScore =
      calculateReliabilityScore(
        hotel,
        reviewScore,
        priceScore,
        dataQualityScore,
        offerScore
      );
  
    const breakdown: SmartScoreBreakdown = {
      price: priceScore,
      reviews: reviewScore,
      location: locationScore,
      stars: starScore,
      saving: savingScore,
      amenities: amenityScore,
      dataQuality: dataQualityScore,
      offer: offerScore,
      reliability: reliabilityScore,
    };
  
    const riskLevel =
      calculateRiskLevel(
        hotel,
        reliabilityScore,
        dataQualityScore,
        offerScore
      );
  
    const rawSmartScore = roundScore(
      priceScore * weights.price +
      reviewScore * weights.reviews +
      locationScore * weights.location +
      starScore * weights.stars +
      savingScore * weights.saving +
      amenityScore * weights.amenities +
      dataQualityScore * weights.dataQuality +
      offerScore * weights.offer +
      reliabilityScore * weights.reliability
    );
  
    const preferenceAdjustment =
      calculatePreferenceAdjustment(
        breakdown,
        riskLevel,
        preferenceId
      );
  
    const smartScore = roundScore(
      applyDataConfidenceAdjustment(
        hotel,
        rawSmartScore + preferenceAdjustment,
        dataQualityScore,
        offerScore,
        reliabilityScore
      )
    );
  
    return {
      hotel,
      smartScore,
      riskLevel,
      badges: createBadges(
        breakdown,
        smartScore,
        riskLevel,
        hotel
      ),
      reasons: createReasons(
        breakdown,
        riskLevel,
        hotel
      ),

      fit: {
        marketPriceFit,
        budgetFit,
        distanceFit,
      },

      breakdown,
    };
  }
export function rankHotelsWithSmartStayEngine(
  hotels: Hotel[],
  preferenceIdInput:
    string = "balanced",
  constraints:
    SmartStaySearchConstraints = {}
): SmartStayEvaluation[] {
  const preferenceId =
    normalizePreferenceId(
      preferenceIdInput
    );

  const context =
    createSmartStayContext(
      hotels,
      constraints
    );

  return hotels
    .map((hotel, index) => {
      const evaluation =
        evaluateHotelWithSmartStayEngine(
          hotel,
          context,
          preferenceId
        );

      return {
        ...evaluation,

        budgetPriority:
          getBudgetPriority(
            evaluation,
            context
          ),

        originalIndex: index,
      };
    })
    .sort((firstHotel, secondHotel) => {
      if (
        firstHotel.budgetPriority !==
        secondHotel.budgetPriority
      ) {
        return (
          firstHotel.budgetPriority -
          secondHotel.budgetPriority
        );
      }

      if (
        secondHotel.smartScore !==
        firstHotel.smartScore
      ) {
        return (
          secondHotel.smartScore -
          firstHotel.smartScore
        );
      }

      if (
        preferenceId === "savings" ||
        preferenceId ===
          "maximum-savings"
      ) {
        const firstPrice =
          getBestOfferPrice(
            firstHotel.hotel
          ) ?? Infinity;

        const secondPrice =
          getBestOfferPrice(
            secondHotel.hotel
          ) ?? Infinity;

        if (firstPrice !== secondPrice) {
          return (
            firstPrice -
            secondPrice
          );
        }
      }

      if (
        secondHotel.breakdown
          .reliability !==
        firstHotel.breakdown
          .reliability
      ) {
        return (
          secondHotel.breakdown
            .reliability -
          firstHotel.breakdown
            .reliability
        );
      }

      if (
        secondHotel.breakdown
          .dataQuality !==
        firstHotel.breakdown
          .dataQuality
      ) {
        return (
          secondHotel.breakdown
            .dataQuality -
          firstHotel.breakdown
            .dataQuality
        );
      }

      if (
        secondHotel.breakdown.location !==
        firstHotel.breakdown.location
      ) {
        return (
          secondHotel.breakdown.location -
          firstHotel.breakdown.location
        );
      }

      const firstPrice =
        getBestOfferPrice(
          firstHotel.hotel
        ) ?? Infinity;

      const secondPrice =
        getBestOfferPrice(
          secondHotel.hotel
        ) ?? Infinity;

      if (firstPrice !== secondPrice) {
        return (
          firstPrice -
          secondPrice
        );
      }

      return (
        firstHotel.originalIndex -
        secondHotel.originalIndex
      );
    })
    .map(({
      originalIndex,
      budgetPriority,
      ...evaluation
    }) => evaluation);
}
