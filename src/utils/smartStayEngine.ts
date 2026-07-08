import type { Hotel } from "../types/hotel";

export type SmartRiskLevel =
  | "low"
  | "medium"
  | "high";

export type SmartBadge =
  | "Smart Pick"
  | "Great Value"
  | "Great Location"
  | "Reliable Reviews"
  | "Strong Amenities"
  | "Good Saving"
  | "Low Risk"
  | "Balanced Choice";

export type SmartScoreBreakdown = {

  price: number;

  reviews: number;

  location: number;

  stars: number;

  saving: number;

  amenities: number;

  reliability: number;

};

export type SmartStayEvaluation = {

  hotel: Hotel;

  smartScore: number;

  riskLevel: SmartRiskLevel;

  badges: SmartBadge[];

  reasons: string[];

  breakdown: SmartScoreBreakdown;

};

type SmartStayContext = {

  averagePrice: number;

  minPrice: number;

  maxPrice: number;

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

function getValidPrices(hotels: Hotel[]) {

  return hotels
    .map((hotel) => hotel.price)
    .filter((price) => (
      Number.isFinite(price) &&
      price > 0
    ));

}

function createSmartStayContext(
  hotels: Hotel[]
): SmartStayContext {

  const prices =
    getValidPrices(hotels);

  if (prices.length === 0) {

    return {
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
    };

  }

  const totalPrice =
    prices.reduce(
      (sum, price) => sum + price,
      0
    );

  return {
    averagePrice:
      totalPrice / prices.length,

    minPrice:
      Math.min(...prices),

    maxPrice:
      Math.max(...prices),
  };

}

function calculatePriceScore(
  hotel: Hotel,
  context: SmartStayContext
) {

  if (
    hotel.price <= 0 ||
    context.averagePrice <= 0
  ) {

    return 40;

  }

  if (context.minPrice === context.maxPrice) {

    return 72;

  }

  const pricePosition =
    (hotel.price - context.minPrice) /
    (context.maxPrice - context.minPrice);

  const rangeScore =
    100 - pricePosition * 75;

  const comparedToAverage =
    context.averagePrice / hotel.price;

  const averageBonus =
    clamp(
      (comparedToAverage - 1) * 22,
      -16,
      16
    );

  return roundScore(
    rangeScore + averageBonus
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

  const neutralScore =
    52;

  return roundScore(
    normalizedRating * confidence +
    neutralScore * (1 - confidence)
  );

}

function calculateLocationScore(
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
  hotel: Hotel
) {

  if (hotel.saving <= 0) {

    return 45;

  }

  const savingPercent =
    hotel.saving <= 1
      ? hotel.saving * 100
      : hotel.saving;

  return roundScore(
    45 + savingPercent * 1.7
  );

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

  const text =
    normalizeTextList([
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

  const varietyBonus =
    clamp(
      hotel.facilities.length * 1.25,
      0,
      14
    );

  return roundScore(
    45 + matchedSignals * 6 + varietyBonus
  );

}

function calculateReliabilityScore(
  hotel: Hotel,
  reviewScore: number,
  priceScore: number
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

  const hasUsefulIdentity =
    Boolean(
      hotel.name &&
      hotel.provider &&
      hotel.image
    );

  const identityScore =
    hasUsefulIdentity
      ? 86
      : 55;

  const priceSafetyScore =
    hotel.price > 0
      ? priceScore
      : 20;

  const missingReviewPenalty =
    hotel.reviewScore === null ||
    reviewCount <= 0
      ? 16
      : 0;

  return roundScore(
    reviewScore * 0.38 +
    reviewCountScore * 0.32 +
    identityScore * 0.18 +
    priceSafetyScore * 0.12 -
    missingReviewPenalty
  );

}

function calculateRiskLevel(
    hotel: Hotel,
    reliabilityScore: number
  ): SmartRiskLevel {
  
    const hasReviewData =
      hotel.reviewScore !== null &&
      (hotel.reviewCount ?? 0) > 0;
  
    if (!hasReviewData) {
  
      if (reliabilityScore < 45) {
  
        return "high";
  
      }
  
      return "medium";
  
    }
  
    if (reliabilityScore >= 72) {
  
      return "low";
  
    }
  
    if (reliabilityScore >= 50) {
  
      return "medium";
  
    }
  
    return "high";
  
  }
  
  function createBadges(
    breakdown: SmartScoreBreakdown,
    smartScore: number,
    riskLevel: SmartRiskLevel,
    hotel: Hotel
  ): SmartBadge[] {
  
    const badges: SmartBadge[] = [];
  
    if (smartScore >= 84) {
  
      badges.push("Smart Pick");
  
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
  
    if (breakdown.saving >= 75) {
  
      badges.push("Good Saving");
  
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
        "Notable saving compared to the listed base price."
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
  
    return reasons.slice(0, 3);
  
  }
  
  function applyDataConfidenceAdjustment(
    hotel: Hotel,
    smartScore: number
  ) {
  
    const hasReviewScore =
      hotel.reviewScore !== null;
  
    const hasReviewCount =
      (hotel.reviewCount ?? 0) > 0;
  
    if (
      !hasReviewScore &&
      !hasReviewCount
    ) {
  
      return Math.min(
        smartScore - 8,
        72
      );
  
    }
  
    if (
      hasReviewScore &&
      !hasReviewCount
    ) {
  
      return Math.min(
        smartScore - 4,
        78
      );
  
    }
  
    if (
      hasReviewCount &&
      (hotel.reviewCount ?? 0) < 10
    ) {
  
      return Math.min(
        smartScore - 3,
        82
      );
  
    }
  
    return smartScore;
  
  }
  
  export function evaluateHotelWithSmartStayEngine(
    hotel: Hotel,
    context: SmartStayContext
  ): SmartStayEvaluation {
  
    const priceScore =
      calculatePriceScore(
        hotel,
        context
      );
  
    const reviewScore =
      calculateReviewScore(hotel);
  
    const locationScore =
      calculateLocationScore(hotel);
  
    const starScore =
      calculateStarScore(hotel);
  
    const savingScore =
      calculateSavingScore(hotel);
  
    const amenityScore =
      calculateAmenityScore(hotel);
  
    const reliabilityScore =
      calculateReliabilityScore(
        hotel,
        reviewScore,
        priceScore
      );
  
    const breakdown: SmartScoreBreakdown = {
      price: priceScore,
      reviews: reviewScore,
      location: locationScore,
      stars: starScore,
      saving: savingScore,
      amenities: amenityScore,
      reliability: reliabilityScore,
    };
  
    const rawSmartScore =
      roundScore(
        priceScore * 0.24 +
        reviewScore * 0.23 +
        locationScore * 0.18 +
        starScore * 0.09 +
        savingScore * 0.11 +
        amenityScore * 0.08 +
        reliabilityScore * 0.07
      );
  
    const smartScore =
      roundScore(
        applyDataConfidenceAdjustment(
          hotel,
          rawSmartScore
        )
      );
  
    const riskLevel =
      calculateRiskLevel(
        hotel,
        reliabilityScore
      );
  
    return {
      hotel,
      smartScore,
      riskLevel,
      badges:
        createBadges(
          breakdown,
          smartScore,
          riskLevel,
          hotel
        ),
      reasons:
        createReasons(
          breakdown,
          riskLevel,
          hotel
        ),
      breakdown,
    };
  
  }
  
  export function rankHotelsWithSmartStayEngine(
    hotels: Hotel[]
  ) {
  
    const context =
      createSmartStayContext(hotels);
  
    return hotels
      .map((hotel, index) => ({
        ...evaluateHotelWithSmartStayEngine(
          hotel,
          context
        ),
        originalIndex: index,
      }))
      .sort((firstHotel, secondHotel) => {
  
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
          secondHotel.breakdown.reliability !==
          firstHotel.breakdown.reliability
        ) {
  
          return (
            secondHotel.breakdown.reliability -
            firstHotel.breakdown.reliability
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
  
        if (
          firstHotel.hotel.price !==
          secondHotel.hotel.price
        ) {
  
          return (
            firstHotel.hotel.price -
            secondHotel.hotel.price
          );
  
        }
  
        return (
          firstHotel.originalIndex -
          secondHotel.originalIndex
        );
  
      })
      .map(({ originalIndex, ...evaluation }) =>
        evaluation
      );
  
  }