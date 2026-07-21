import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  evaluateBookingFlexibilityContextV2,
  type SmartStayBookingFlexibilityContextV2,
} from "../../src/engine-v2/flexibility/bookingFlexibilityContextEngine";

import {
  compareSelectedOffersV2,
  selectIntentAwareHotelOfferV2,
  type SmartStayOfferSelectionV2,
} from "../../src/engine-v2/offers/intentAwareOfferSelectionV2";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  evaluateRecommendationRolesV2,
  type SmartStayRecommendationCandidateV2,
} from "../../src/engine-v2/recommendation/recommendationRolesEngine";

import type {
  SmartStayUtilityPreferenceIdV2,
} from "../../src/engine-v2/utility/userUtilityEngine";

function createOffer(input: {
  id: string;
  amount: number;
  refundable: boolean | null;
  roomName?: string;
  freeCancellationUntil?: string | null;
}): HotelOffer {
  return {
    id: input.id,
    provider: "LiteAPI",
    price: input.amount,
    basePrice: input.amount,
    saving: 0,
    currency: "EUR",
    cancellationPolicy:
      input.refundable === true
        ? "Refundable"
        : input.refundable === false
          ? "Non-refundable"
          : null,
    refundableTag:
      input.refundable === true
        ? "RFN"
        : input.refundable === false
          ? "NRFN"
          : null,
    refundable: input.refundable,
    freeCancellationUntil:
      input.freeCancellationUntil ??
      (input.refundable === true
        ? "2026-08-20T00:00:00Z"
        : null),
    cancellationPenalty: null,
    cancellationPenaltyCurrency: null,
    cancellationPenaltyType: null,
    cancellationTimezone: "Europe/Rome",
    taxesIncluded: true,
    includedTaxes: 20,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: input.amount,
    roomName: input.roomName ?? "Deluxe Room",
    bookable: true,
    redirectable: false,
  };
}

function createHotel(
  id: string,
  offers: HotelOffer[],
  input: Partial<{
    stars: number;
    reviewScore: number;
    reviewCount: number;
    distance: number;
  }> = {}
): Hotel {
  const cheapest = Math.min(
    ...offers.map(
      (offer) =>
        offer.totalKnownCost ??
        offer.price
    )
  );

  return {
    id,
    dataSources: ["LiteAPI"],
    dataConfidence: "full",
    availableData: {
      hasPrice: true,
      hasBasePrice: true,
      hasSaving: true,
      hasStars: true,
      hasReviewScore: true,
      hasReviewCount: true,
      hasDistance: true,
      hasImage: true,
      hasAddress: true,
      hasCoordinates: true,
      hasAmenities: true,
    },
    offers,
    name: id,
    provider: "LiteAPI",
    accommodationCategory: "hotel",
    stars: input.stars ?? 4,
    reviewScore: input.reviewScore ?? 9,
    reviewCount: input.reviewCount ?? 1200,
    reviewText: "Excellent",
    price: cheapest,
    basePrice: cheapest,
    saving: 0,
    currency: "EUR",
    taxesIncluded: true,
    includedTaxes: 20,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: cheapest,
    distance: input.distance ?? 0.5,
    image: `https://images.example/${id}.jpg`,
    address: "1 SmartStay Street",
    city: "Milan",
    country: "Italy",
    latitude: 45.4642,
    longitude: 9.19,
    amenities: [
      "Private bathroom",
      "WiFi",
      "Air conditioning",
      "Breakfast",
      "Reception",
      "Elevator",
      "Daily housekeeping",
    ],
    facilities: [
      "Spa",
      "Room service",
    ],
  };
}

function createMarketHotels(
  refundableHotelCount: number,
  nonRefundableHotelCount: number
) {
  const refundable = Array.from(
    {
      length: refundableHotelCount,
    },
    (_, index) =>
      createHotel(
        `refundable-${index}`,
        [
          createOffer({
            id: "offer-1",
            amount: 200 + index,
            refundable: true,
          }),
        ]
      )
  );

  const nonRefundable = Array.from(
    {
      length: nonRefundableHotelCount,
    },
    (_, index) =>
      createHotel(
        `non-refundable-${index}`,
        [
          createOffer({
            id: "offer-1",
            amount: 150 + index,
            refundable: false,
          }),
        ]
      )
  );

  return [
    ...refundable,
    ...nonRefundable,
  ];
}

function createContext(input: {
  leadTimeDays: number;
  refundableHotelCount: number;
  nonRefundableHotelCount: number;
}) {
  const referenceAt =
    "2026-08-01T10:00:00Z";

  const checkInDate =
    new Date(
      Date.UTC(
        2026,
        7,
        1 + input.leadTimeDays
      )
    )
      .toISOString()
      .slice(0, 10);

  return evaluateBookingFlexibilityContextV2({
    hotels:
      createMarketHotels(
        input.refundableHotelCount,
        input.nonRefundableHotelCount
      ),
    referenceAt,
    checkIn: checkInDate,
  });
}

const selectedIndexByPreference: Readonly<
  Record<
    SmartStayUtilityPreferenceIdV2,
    number
  >
> = {
  "maximum-comfort": 0,
  comfort: 1,
  balanced: 2,
  savings: 3,
  "maximum-savings": 4,
};

const utilityWeights = {
  priceValue: 0.12,
  quality: 0.25,
  location: 0.18,
  comfort: 0.18,
  flexibility: 0.15,
  categoryFit: 0.05,
  userFit: 0.07,
};

function createSelection(input: {
  hotelId: string;
  amount: number;
  refundable: boolean;
}): SmartStayOfferSelectionV2 {
  return {
    hotelId: input.hotelId,
    primary: null,
    offers: [],
    alternativeCount: 0,
    selectionMode: "lowest-price",
    selectedOffer: {
      hotelId: input.hotelId,
      offerId: `${input.hotelId}-offer`,
      provider: "LiteAPI",
      roomName: "Deluxe Room",
      amount: input.amount,
      currency: "EUR",
      completeness: "reported-complete",
      bookable: true,
      refundable: input.refundable,
      freeCancellationUntil:
        input.refundable
          ? "2026-08-05T00:00:00Z"
          : null,
      cancellationPolicyKnown: true,
      taxesIncluded: true,
      excludedTaxes: 0,
      unknownTaxes: 0,
      roomTier: "premium",
      roomTierRank: 4,
      selectionMode: "lowest-price",
      reasonCodes: [
        "test-offer-selection",
      ],
    },
    reasonCodes: [
      "test-offer-selection",
    ],
  };
}

function createRecommendationCandidate(input: {
  hotelId: string;
  smartScore: number;
  amount: number;
  refundable: boolean;
  context: SmartStayBookingFlexibilityContextV2;
}): SmartStayRecommendationCandidateV2 {
  const preferenceId =
    "maximum-comfort" as const;

  return {
    hotelId: input.hotelId,
    eligibleForPrimaryRanking: true,
    smartScore: input.smartScore,
    utility: {
      hotelId: input.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      preference: {
        id: preferenceId,
        selectedIndex:
          selectedIndexByPreference[
            preferenceId
          ],
        source: "default",
        weights: utilityWeights,
      },
      rawUtilityScore: input.smartScore,
      utilityScore: input.smartScore,
      scoreConfidence: 0.95,
      evidenceCoverage: 0.95,
      availableDimensionCodes: [
        "priceValue",
        "quality",
        "location",
        "comfort",
        "flexibility",
        "categoryFit",
        "userFit",
      ],
      unavailableDimensionCodes: [],
      contributions: [],
      warningCodes: [],
      evidenceIds: [
        `utility:${input.hotelId}`,
      ],
    },
    pareto: {
      status: "frontier",
      dominatedByHotelIds: [],
      dominatesHotelIds: [],
      reasonCodes: [
        "pareto:frontier",
      ],
    },
    risk: {
      score: 8,
      level: "low",
      factorCodes: [],
      evidenceIds: [
        `risk:${input.hotelId}`,
      ],
    },
    offerSelection:
      createSelection({
        hotelId: input.hotelId,
        amount: input.amount,
        refundable: input.refundable,
      }),
    priceValue: {
      hotelId: input.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      totalCost: input.amount,
      currency: "EUR",
      costCompleteness: "reported-complete",
      budget: {
        provided: true,
        total: 1000,
        withinBudget: true,
        differenceAmount:
          1000 - input.amount,
        overageAmount: 0,
        overageRatio: 0,
        utilizationRatio:
          input.amount / 1000,
        fitScore: 95,
      },
      peerBaseline: {
        available: false,
        mode: "unavailable",
        assignedSampleSize: 0,
        eligibleReferenceCount: 0,
        excludedCurrencyMismatchCount: 0,
        excludedMissingPriceCount: 0,
        minimum: null,
        firstQuartile: null,
        median: null,
        thirdQuartile: null,
        maximum: null,
        confidence: 0,
        referenceHotelIds: [],
        evidenceIds: [],
      },
      relativePrice: {
        ratioToMedian: null,
        savingAgainstMedian: null,
        savingPercentageAgainstMedian: null,
        pricePercentile: null,
        valueScore: null,
      },
      score: 90,
      confidence: 0.95,
      evidenceIds: [
        `price:${input.hotelId}`,
      ],
      warningCodes: [],
    },
    budgetIntent: {
      hotelId: input.hotelId,
      preferenceId,
      intentAdjustedScore:
        input.smartScore,
      experienceScore: 90,
      experienceTier: "premium",
      experienceTierRank: 3,
      marketPositionPercentile: 85,
      minimumBestChoiceMarketPositionPercentile: null,
      meetsAspirationalMarketFloor: true,
      bestChoiceEligible: true,
      savingEligible: true,
      maximumSavingExperienceLoss: 6,
      minimumSavingTierRank: 3,
      savingRequiresExperienceParity: true,
      intentLevel: "luxury",
      experienceGapFromBest: 0,
      reasonCodes: [
        "test-budget-intent",
      ],
    },
    comfortFlexibility: {
      hotelId: input.hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      tripProfile: "mixed",
      mandatoryRequirements: {
        satisfied: true,
        unmetFeatureCodes: [],
        unverifiedFeatureCodes: [],
        requiredUnitTypeStatus: "not-required",
      },
      unitType: {
        unitType: "hotel-room",
        requiredStatus: "not-required",
        score: 90,
        confidence: 0.95,
        evidenceIds: [
          `unit:${input.hotelId}`,
        ],
      },
      features: [],
      dimensions: {
        comfort: {
          score: 90,
          confidence: 0.95,
          evidenceCoverage: 0.95,
          totalWeight: 1,
          confirmedWeight: 1,
          evidenceIds: [
            `comfort:${input.hotelId}`,
          ],
        },
        practicality: {
          score: 90,
          confidence: 0.95,
          evidenceCoverage: 0.95,
          totalWeight: 1,
          confirmedWeight: 1,
          evidenceIds: [
            `practicality:${input.hotelId}`,
          ],
        },
        flexibility: {
          score:
            input.refundable
              ? 100
              : 40,
          confidence: 0.95,
          evidenceCoverage: 0.95,
          totalWeight: 1,
          confirmedWeight: 1,
          evidenceIds: [
            `flexibility:${input.hotelId}`,
          ],
        },
      },
      score: 90,
      confidence: 0.95,
      evidenceCoverage: 0.95,
      warningCodes: [],
      flexibilityContext:
        input.context,
      evidenceIds: [
        `comfort-flexibility:${input.hotelId}`,
      ],
    },
    exclusionReasonCodes: [],
  };
}

test(
  "Booking flexibility context recognizes close-in scarcity without treating unknown as non-refundable",
  () => {
    const context =
      createContext({
        leadTimeDays: 5,
        refundableHotelCount: 1,
        nonRefundableHotelCount: 9,
      });

    assert.equal(
      context.leadTimeBand,
      "last-minute"
    );
    assert.equal(
      context.marketAvailability,
      "scarce"
    );
    assert.equal(
      context.refundableAvailabilityShare,
      0.1
    );
    assert.equal(
      context.nonRefundablePenaltyMultiplier,
      0.2
    );

    const unknownContext =
      evaluateBookingFlexibilityContextV2({
        hotels: [
          createHotel(
            "unknown-refundability",
            [
              createOffer({
                id: "offer-1",
                amount: 200,
                refundable: null,
              }),
            ]
          ),
        ],
        referenceAt:
          "2026-08-01T10:00:00Z",
        checkIn:
          "2026-08-06",
      });

    assert.equal(
      unknownContext.nonRefundableOnlyHotelCount,
      0
    );
    assert.equal(
      unknownContext.unknownRefundabilityHotelCount,
      1
    );
  }
);

test(
  "Flexibility availability is measured against comparable category and star peers",
  () => {
    const luxuryNonRefundable =
      Array.from(
        {
          length: 3,
        },
        (_, index) =>
          createHotel(
            `luxury-non-refundable-${index}`,
            [
              createOffer({
                id: "offer-1",
                amount: 400 + index,
                refundable: false,
              }),
            ],
            {
              stars: 5,
            }
          )
      );

    const standardRefundable =
      Array.from(
        {
          length: 7,
        },
        (_, index) =>
          createHotel(
            `standard-refundable-${index}`,
            [
              createOffer({
                id: "offer-1",
                amount: 180 + index,
                refundable: true,
              }),
            ],
            {
              stars: 3,
            }
          )
      );

    const hotels = [
      ...luxuryNonRefundable,
      ...standardRefundable,
    ];

    const luxuryContext =
      evaluateBookingFlexibilityContextV2({
        hotels,
        targetHotelId:
          "luxury-non-refundable-0",
        referenceAt:
          "2026-08-01T10:00:00Z",
        checkIn:
          "2026-08-06",
      });

    const standardContext =
      evaluateBookingFlexibilityContextV2({
        hotels,
        targetHotelId:
          "standard-refundable-0",
        referenceAt:
          "2026-08-01T10:00:00Z",
        checkIn:
          "2026-08-06",
      });

    assert.equal(
      luxuryContext.cohortMode,
      "category-star-band"
    );
    assert.equal(
      luxuryContext.cohortHotelCount,
      3
    );
    assert.equal(
      luxuryContext.marketAvailability,
      "scarce"
    );
    assert.equal(
      luxuryContext.refundableAvailabilityShare,
      0
    );

    assert.equal(
      standardContext.cohortMode,
      "category-star-band"
    );
    assert.equal(
      standardContext.cohortHotelCount,
      7
    );
    assert.equal(
      standardContext.marketAvailability,
      "common"
    );
    assert.equal(
      standardContext.refundableAvailabilityShare,
      1
    );
  }
);

test(
  "Refundable hotels outside the hard distance limit do not inflate flexible peer supply",
  () => {
    const nearbyNonRefundable =
      Array.from(
        {
          length: 3,
        },
        (_, index) =>
          createHotel(
            `nearby-non-refundable-${index}`,
            [
              createOffer({
                id: "offer-1",
                amount: 200 + index,
                refundable: false,
              }),
            ],
            {
              stars: 4,
              distance: 0.5 +
                index *
                  0.1,
            }
          )
      );

    const distantRefundable =
      Array.from(
        {
          length: 7,
        },
        (_, index) =>
          createHotel(
            `distant-refundable-${index}`,
            [
              createOffer({
                id: "offer-1",
                amount: 180 + index,
                refundable: true,
              }),
            ],
            {
              stars: 4,
              distance: 8 +
                index *
                  0.1,
            }
          )
      );

    const context =
      evaluateBookingFlexibilityContextV2({
        hotels: [
          ...nearbyNonRefundable,
          ...distantRefundable,
        ],
        targetHotelId:
          "nearby-non-refundable-0",
        maximumDistanceKm: 2,
        referenceAt:
          "2026-08-01T10:00:00Z",
        checkIn:
          "2026-08-06",
      });

    assert.equal(
      context.cohortHotelCount,
      3
    );
    assert.equal(
      context.marketAvailability,
      "scarce"
    );
    assert.equal(
      context.refundableAvailableHotelCount,
      0
    );
  }
);

test(
  "Expired free-cancellation deadlines are not counted as active flexible supply",
  () => {
    const hotels =
      Array.from(
        {
          length: 3,
        },
        (_, index) =>
          createHotel(
            `expired-refundable-${index}`,
            [
              createOffer({
                id: "offer-1",
                amount: 200 + index,
                refundable: true,
                freeCancellationUntil:
                  "2026-07-31T23:00:00Z",
              }),
            ]
          )
      );

    const context =
      evaluateBookingFlexibilityContextV2({
        hotels,
        targetHotelId:
          "expired-refundable-0",
        referenceAt:
          "2026-08-01T10:00:00Z",
        checkIn:
          "2026-08-05",
      });

    assert.equal(
      context.refundableAvailableHotelCount,
      0
    );
    assert.equal(
      context.nonRefundableOnlyHotelCount,
      3
    );
    assert.equal(
      context.marketAvailability,
      "scarce"
    );
  }
);

test(
  "Close-in scarcity reduces the premium paid for a refundable rate",
  () => {
    const hotel =
      createHotel(
        "contextual-offer-selection",
        [
          createOffer({
            id: "offer-1",
            amount: 100,
            refundable: false,
          }),
          createOffer({
            id: "offer-2",
            amount: 106,
            refundable: true,
          }),
        ]
      );

    const closeInContext =
      createContext({
        leadTimeDays: 4,
        refundableHotelCount: 1,
        nonRefundableHotelCount: 9,
      });

    const advanceContext =
      createContext({
        leadTimeDays: 45,
        refundableHotelCount: 9,
        nonRefundableHotelCount: 1,
      });

    const closeInSelection =
      selectIntentAwareHotelOfferV2(
        hotel,
        {
          preferenceId:
            "maximum-comfort",
          flexibilityContext:
            closeInContext,
        }
      );

    const advanceSelection =
      selectIntentAwareHotelOfferV2(
        hotel,
        {
          preferenceId:
            "maximum-comfort",
          flexibilityContext:
            advanceContext,
        }
      );

    assert.equal(
      closeInSelection.selectedOffer?.offerId,
      "offer-1"
    );
    assert.equal(
      advanceSelection.selectedOffer?.offerId,
      "offer-2"
    );
  }
);

test(
  "A non-refundable stay loses fewer flexibility points when the booking is close-in and flexible supply is scarce",
  () => {
    const closeInHotels =
      createMarketHotels(
        0,
        5
      );

    const advanceHotels =
      createMarketHotels(
        4,
        1
      );

    const closeIn =
      evaluateSmartStaySearchV2({
        hotels:
          closeInHotels,
        preferenceId:
          "balanced",
        selectedIndex: 2,
        totalBudget: 1000,
        maximumDistanceKm: 10,
        nights: 2,
        adults: 2,
        children: 0,
        rooms: 1,
        checkIn:
          "2026-08-05",
        checkOut:
          "2026-08-07",
        bookingReferenceAt:
          "2026-08-01T10:00:00Z",
      });

    const advance =
      evaluateSmartStaySearchV2({
        hotels:
          advanceHotels,
        preferenceId:
          "balanced",
        selectedIndex: 2,
        totalBudget: 1000,
        maximumDistanceKm: 10,
        nights: 2,
        adults: 2,
        children: 0,
        rooms: 1,
        checkIn:
          "2026-09-15",
        checkOut:
          "2026-09-17",
        bookingReferenceAt:
          "2026-08-01T10:00:00Z",
        capturedAt:
          "2026-08-01T10:00:00Z",
      });

    const closeInFlexibility =
      closeIn.evaluations.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "non-refundable-0"
      )
        ?.scores
        .flexibility
        .score;

    const advanceFlexibility =
      advance.evaluations.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "non-refundable-0"
      )
        ?.scores
        .flexibility
        .score;

    assert.equal(
      typeof closeInFlexibility,
      "number"
    );
    assert.equal(
      typeof advanceFlexibility,
      "number"
    );
    assert.ok(
      (closeInFlexibility ?? 0) >
      (advanceFlexibility ?? 0)
    );
  }
);

test(
  "Maximum Comfort can show a large non-refundable saving when close-in scarcity makes the trade-off hard to avoid",
  () => {
    const closeInContext =
      createContext({
        leadTimeDays: 3,
        refundableHotelCount: 1,
        nonRefundableHotelCount: 9,
      });

    const result =
      evaluateRecommendationRolesV2([
        createRecommendationCandidate({
          hotelId: "best-choice",
          smartScore: 90,
          amount: 500,
          refundable: true,
          context: closeInContext,
        }),
        createRecommendationCandidate({
          hotelId: "close-in-saving",
          smartScore: 89,
          amount: 350,
          refundable: false,
          context: closeInContext,
        }),
      ]);

    const saving =
      result.picks.find(
        (pick) =>
          pick.role ===
          "best-sensible-saving"
      );

    assert.equal(
      saving?.hotelId,
      "close-in-saving"
    );
    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-flexibility-contextualized"
      )
    );
    assert.ok(
      saving?.reasonCodes.includes(
        "recommendation-saving-less-flexibility"
      )
    );
  }
);

test(
  "Maximum Comfort still rejects the same non-refundable downgrade for an advance booking with common flexible supply",
  () => {
    const advanceContext =
      createContext({
        leadTimeDays: 45,
        refundableHotelCount: 9,
        nonRefundableHotelCount: 1,
      });

    const result =
      evaluateRecommendationRolesV2([
        createRecommendationCandidate({
          hotelId: "best-choice",
          smartScore: 90,
          amount: 500,
          refundable: true,
          context: advanceContext,
        }),
        createRecommendationCandidate({
          hotelId: "advance-saving",
          smartScore: 89,
          amount: 350,
          refundable: false,
          context: advanceContext,
        }),
      ]);

    assert.equal(
      result.picks.some(
        (pick) =>
          pick.role ===
          "best-sensible-saving"
      ),
      false
    );
  }
);

test(
  "Two non-refundable offers remain commercially comparable and do not invent a flexibility downgrade",
  () => {
    const baseline =
      createSelection({
        hotelId: "baseline",
        amount: 500,
        refundable: false,
      });

    const candidate =
      createSelection({
        hotelId: "candidate",
        amount: 400,
        refundable: false,
      });

    const comparison =
      compareSelectedOffersV2(
        candidate,
        baseline
      );

    assert.equal(
      comparison.comparable,
      true
    );
    assert.equal(
      comparison.refundabilityCompatible,
      true
    );
    assert.equal(
      comparison.reasonCodes.includes(
        "offer-comparison-refundability-downgrade"
      ),
      false
    );
  }
);

test(
  "Frontend copy keeps the non-refundable fact but explains close-in market context",
  () => {
    const hotels =
      createMarketHotels(
        0,
        5
      );

    const frontend =
      buildSmartStayFrontendViewV2({
        hotels,
        preferenceId:
          "balanced",
        selectedIndex: 2,
        totalBudget: 1000,
        maximumDistanceKm: 10,
        nights: 2,
        adults: 2,
        children: 0,
        rooms: 1,
        checkIn:
          "2026-08-05",
        checkOut:
          "2026-08-07",
        bookingReferenceAt:
          "2026-08-01T10:00:00Z",
      });

    const copy =
      frontend
        .rankedHotels
        .flatMap(
          (evaluation) =>
            evaluation.tradeOffs
        )
        .join(" ");

    assert.match(
      copy,
      /non-refundable/i
    );
    assert.match(
      copy,
      /flexible alternatives are limited for these close-in dates/i
    );
  }
);

test(
  "Frontend preserves contextual non-refundable copy when tax inclusion is also unknown",
  () => {
    const hotels =
      createMarketHotels(
        0,
        5
      ).map(
        (hotel) => ({
          ...hotel,
          taxesIncluded:
            null,
          includedTaxes:
            0,
          excludedTaxes:
            0,
          unknownTaxes:
            0,
          offers:
            hotel.offers.map(
              (offer) => ({
                ...offer,
                taxesIncluded:
                  null,
                includedTaxes:
                  0,
                excludedTaxes:
                  0,
                unknownTaxes:
                  0,
              })
            ),
        })
      );

    const frontend =
      buildSmartStayFrontendViewV2({
        hotels,
        preferenceId:
          "maximum-savings",
        selectedIndex: 4,
        totalBudget: 1000,
        maximumDistanceKm: 10,
        nights: 2,
        adults: 2,
        children: 0,
        rooms: 1,
        checkIn:
          "2026-08-03",
        checkOut:
          "2026-08-05",
        bookingReferenceAt:
          "2026-08-01T10:00:00Z",
      });

    const evaluation =
      frontend
        .rankedHotels
        .find(
          (candidate) =>
            candidate
              .selectedOffer
              ?.refundable ===
            false
        );

    assert.ok(
      evaluation
    );

    const copy =
      evaluation
        .tradeOffs
        .join(" ");

    assert.match(
      copy,
      /tax inclusion was not confirmed/i
    );
    assert.match(
      copy,
      /flexible alternatives are limited for these close-in dates/i
    );
    assert.equal(
      evaluation
        .tradeOffs
        .includes(
          "The selected offer is non-refundable."
        ),
      false
    );
  }
);

test(
  "Frontend preserves short-notice non-refundable context in a mixed market with uncertain taxes",
  () => {
    const hotels =
      createMarketHotels(
        2,
        3
      ).map(
        (hotel) => ({
          ...hotel,
          taxesIncluded:
            null,
          includedTaxes:
            0,
          excludedTaxes:
            0,
          unknownTaxes:
            0,
          offers:
            hotel.offers.map(
              (offer) => ({
                ...offer,
                taxesIncluded:
                  null,
                includedTaxes:
                  0,
                excludedTaxes:
                  0,
                unknownTaxes:
                  0,
              })
            ),
        })
      );

    const frontend =
      buildSmartStayFrontendViewV2({
        hotels,
        preferenceId:
          "maximum-savings",
        selectedIndex: 4,
        totalBudget: 1000,
        maximumDistanceKm: 10,
        nights: 2,
        adults: 2,
        children: 0,
        rooms: 1,
        checkIn:
          "2026-08-11",
        checkOut:
          "2026-08-13",
        bookingReferenceAt:
          "2026-08-01T10:00:00Z",
      });

    const evaluation =
      frontend
        .recommendationPicks
        .map(
          (pick) =>
            pick.evaluation
        )
        .find(
          (candidate) =>
            candidate
              .selectedOffer
              ?.refundable ===
            false
        ) ??
      frontend
        .rankedHotels
        .find(
          (candidate) =>
            candidate
              .selectedOffer
              ?.refundable ===
            false
        );

    assert.ok(
      evaluation
    );

    assert.equal(
      evaluation
        .sourceEvaluation
        .flexibilityContext
        ?.marketAvailability,
      "mixed"
    );

    const copy =
      evaluation
        .tradeOffs
        .join(" ");

    assert.match(
      copy,
      /tax inclusion was not confirmed/i
    );
    assert.match(
      copy,
      /short booking window reduces the practical value of cancellation flexibility/i
    );
    assert.equal(
      evaluation
        .tradeOffs
        .includes(
          "The selected offer is non-refundable."
        ),
      false
    );
  }
);
