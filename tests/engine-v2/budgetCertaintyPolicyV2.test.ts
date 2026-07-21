import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  evaluateRecommendationRolesV2,
  type SmartStayRecommendationCandidateV2,
} from "../../src/engine-v2/recommendation/recommendationRolesEngine";

import type {
  SmartStayUtilityPreferenceIdV2,
} from "../../src/engine-v2/utility/userUtilityEngine";

const selectedIndexByPreference: Readonly<
  Record<SmartStayUtilityPreferenceIdV2, number>
> = {
  "maximum-comfort": 0,
  comfort: 1,
  balanced: 2,
  savings: 3,
  "maximum-savings": 4,
};

const weights = {
  priceValue: 0.26,
  quality: 0.22,
  location: 0.18,
  comfort: 0.13,
  flexibility: 0.08,
  categoryFit: 0.05,
  userFit: 0.08,
};

const dimensionCodes = [
  "priceValue",
  "quality",
  "location",
  "comfort",
  "flexibility",
  "categoryFit",
  "userFit",
] as const;

type CostCompleteness =
  | "reported-complete"
  | "reported-tax-status-unknown";

function recommendationCandidate({
  hotelId,
  score,
  totalCost,
  budgetTotal = 500,
  completeness,
  preferenceId = "balanced",
  experienceScore = 80,
  experienceTier = "premium",
  experienceTierRank = 2,
}: {
  hotelId: string;
  score: number;
  totalCost: number;
  budgetTotal?: number;
  completeness: CostCompleteness;
  preferenceId?: SmartStayUtilityPreferenceIdV2;
  experienceScore?: number;
  experienceTier?:
    | "essential"
    | "standard"
    | "premium"
    | "luxury";
  experienceTierRank?: number;
}): SmartStayRecommendationCandidateV2 {
  const overageAmount =
    Math.max(
      totalCost - budgetTotal,
      0
    );

  const withinBudget =
    totalCost > budgetTotal
      ? false
      : completeness ===
          "reported-complete"
        ? true
        : null;

  return {
    hotelId,
    eligibleForPrimaryRanking: true,
    smartScore: score,

    utility: {
      hotelId,
      status: "strong-data",
      eligibleForPrimaryRanking: true,
      preference: {
        id: preferenceId,
        selectedIndex:
          selectedIndexByPreference[
            preferenceId
          ],
        source: "default",
        weights,
      },
      rawUtilityScore: score,
      utilityScore: score,
      scoreConfidence: 0.95,
      evidenceCoverage: 0.95,
      availableDimensionCodes:
        [
          ...dimensionCodes,
        ],
      unavailableDimensionCodes: [],
      contributions: [],
      warningCodes: [],
      evidenceIds: [
        `utility:${hotelId}`,
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
      score:
        completeness ===
          "reported-complete"
          ? 10
          : 24,
      level:
        completeness ===
          "reported-complete"
          ? "low"
          : "medium",
      factorCodes:
        completeness ===
          "reported-complete"
          ? []
          : [
              "tax-inclusion-status-unknown",
            ],
      evidenceIds: [
        `risk:${hotelId}`,
      ],
    },

    offerSelection: {
      hotelId,
      primary: null,
      offers: [],
      alternativeCount: 0,
      selectionMode: "lowest-price",
      selectedOffer: {
        hotelId,
        offerId: "offer-1",
        provider: "LiteAPI",
        roomName: "Standard Room",
        amount: totalCost,
        currency: "EUR",
        completeness,
        bookable: true,
        refundable: true,
        freeCancellationUntil:
          "2026-08-07T00:00:00Z",
        cancellationPolicyKnown: true,
        taxesIncluded:
          completeness ===
            "reported-complete"
            ? true
            : null,
        excludedTaxes: 0,
        unknownTaxes: 0,
        roomTier: "standard",
        roomTierRank: 2,
        selectionMode: "lowest-price",
        reasonCodes: [
          "test-offer-selection",
        ],
      },
      reasonCodes: [
        "test-offer-selection",
      ],
    },

    budgetIntent: {
      hotelId,
      preferenceId,
      intentAdjustedScore: score,
      experienceScore,
      experienceTier,
      experienceTierRank,
      marketPositionPercentile: 80,
      minimumBestChoiceMarketPositionPercentile:
        null,
      meetsAspirationalMarketFloor: true,
      bestChoiceEligible: true,
      savingEligible: true,
      maximumSavingExperienceLoss: 100,
      minimumSavingTierRank: 0,
      savingRequiresExperienceParity: false,
      intentLevel:
        preferenceId ===
          "maximum-comfort"
          ? "luxury"
          : "balanced",
      experienceGapFromBest: 0,
      reasonCodes: [
        "test-budget-intent",
      ],
    },

    priceValue: {
      hotelId,
      status:
        completeness ===
          "reported-complete"
          ? "strong-data"
          : "usable",
      eligibleForPrimaryRanking: true,
      totalCost,
      currency: "EUR",
      costCompleteness: completeness,
      budget: {
        provided: true,
        total: budgetTotal,
        withinBudget,
        differenceAmount:
          budgetTotal - totalCost,
        overageAmount,
        overageRatio:
          overageAmount /
          budgetTotal,
        utilizationRatio:
          totalCost /
          budgetTotal,
        fitScore: 90,
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
        savingPercentageAgainstMedian:
          null,
        pricePercentile: null,
        valueScore: null,
      },
      score: 90,
      confidence:
        completeness ===
          "reported-complete"
          ? 0.95
          : 0.82,
      warningCodes:
        completeness ===
          "reported-complete"
          ? []
          : [
              "target-tax-status-unknown",
            ],
      evidenceIds: [
        `price:${hotelId}`,
      ],
    },
  };
}

function createOffer(
  id: string,
  totalCost: number,
  completeness: CostCompleteness
): HotelOffer {
  return {
    id,
    provider: "LiteAPI",
    price: totalCost,
    basePrice: totalCost,
    saving: 0,
    currency: "EUR",
    cancellationPolicy:
      "Refundable",
    refundableTag: "RFN",
    refundable: true,
    freeCancellationUntil:
      "2026-08-07T00:00:00Z",
    cancellationPenalty: null,
    cancellationPenaltyCurrency: null,
    cancellationPenaltyType: null,
    cancellationTimezone:
      "Europe/Rome",
    taxesIncluded:
      completeness ===
        "reported-complete"
        ? true
        : null,
    includedTaxes: 0,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: totalCost,
    roomName: "Double Room",
    bookable: true,
    redirectable: false,
  };
}

function createHotel({
  id,
  totalCost,
  completeness,
  reviewScore,
}: {
  id: string;
  totalCost: number;
  completeness: CostCompleteness;
  reviewScore: number;
}): Hotel {
  return {
    id,
    dataSources: [
      "liteapi",
    ],
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
    offers: [
      createOffer(
        id === "verified"
          ? "offer-1"
          : "offer-2",
        totalCost,
        completeness
      ),
    ],
    name: id,
    provider: "LiteAPI",
    accommodationCategory: "hotel",
    stars: 4,
    reviewScore,
    reviewCount: 1000,
    reviewText: "Excellent",
    price: totalCost,
    basePrice: totalCost,
    saving: 0,
    currency: "EUR",
    taxesIncluded:
      completeness ===
        "reported-complete"
        ? true
        : null,
    includedTaxes: 0,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: totalCost,
    distance:
      id === "verified"
        ? 0.8
        : 1.6,
    image:
      `https://images.example/${id}.jpg`,
    address:
      `${id} SmartStay Street`,
    city: "Florence",
    country: "Italy",
    latitude:
      id === "verified"
        ? 43.773
        : 43.781,
    longitude:
      id === "verified"
        ? 11.255
        : 11.264,
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
      "Room service",
    ],
  };
}

function createSearchInput() {
  return {
    hotels: [
      createHotel({
        id: "verified",
        totalCost: 420,
        completeness:
          "reported-complete",
        reviewScore: 9,
      }),
      createHotel({
        id: "provisional",
        totalCost: 350,
        completeness:
          "reported-tax-status-unknown",
        reviewScore: 9.3,
      }),
    ],
    preferenceId:
      "balanced" as const,
    selectedIndex: 2,
    preferenceSource:
      "automatic" as const,
    totalBudget: 500,
    maximumDistanceKm: 5,
    selectedLocation: {
      latitude: 43.7696,
      longitude: 11.2558,
      confidence: 1,
      label: "Florence",
    },
    nights: 2,
    adults: 2,
    children: 0,
    rooms: 1,
    destinationKey:
      "Florence, Italy",
    currency: "EUR",
    checkIn: "2026-08-10",
    checkOut: "2026-08-12",
    maximumVisibleResults: 10,
    capturedAt: null,
  };
}

test(
  "Price Value keeps a tax-unknown amount provisional instead of verified within budget",
  () => {
    const result =
      evaluateSmartStaySearchV2(
        createSearchInput()
      );


    const provisional =
      result.evaluations.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "provisional"
      );

    assert.equal(
      provisional
        ?.scores
        .priceValue
        .signalCodes
        .includes(
          "target-tax-status-unknown"
        ),
      true
    );

    assert.equal(
      provisional
        ?.constraints
        .find(
          (constraint) =>
            constraint.kind ===
            "budget"
        )
        ?.status,
      "unknown"
    );

    const recommendation =
      result
        .recommendationRoles
        .evaluations
        .find(
          (evaluation) =>
            evaluation.hotelId ===
            "provisional"
        );

    assert.equal(
      recommendation
        ?.metrics
        .withinBudget,
      null
    );
  }
);

test(
  "Frontend separates verified and provisional under-budget stays",
  () => {
    const view =
      buildSmartStayFrontendViewV2(
        createSearchInput()
      );

    const verified =
      view.rankedHotels.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "verified"
      );

    const provisional =
      view.rankedHotels.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "provisional"
      );


    assert.equal(
      verified?.budgetVisibility,
      "within-budget"
    );

    assert.equal(
      provisional?.budgetVisibility,
      "provisionally-under-budget"
    );

    assert.equal(
      view
        .budgetPolicy
        .withinBudgetVisibleCount,
      1
    );

    assert.equal(
      view
        .budgetPolicy
        .provisionalUnderBudgetVisibleCount,
      1
    );

    assert.ok(
      view.rankedHotels.findIndex(
        (evaluation) =>
          evaluation.hotel.id ===
          "verified"
      ) <
      view.rankedHotels.findIndex(
        (evaluation) =>
          evaluation.hotel.id ===
          "provisional"
      )
    );
  }
);

test(
  "Verified equivalent Best Choice is preferred over a merely provisional option",
  () => {
    const result =
      evaluateRecommendationRolesV2([
        recommendationCandidate({
          hotelId: "verified",
          score: 90,
          totalCost: 360,
          completeness:
            "reported-complete",
        }),
        recommendationCandidate({
          hotelId: "provisional",
          score: 93,
          totalCost: 300,
          completeness:
            "reported-tax-status-unknown",
        }),
      ]);

    assert.equal(
      result.bestChoiceHotelId,
      "verified"
    );

    assert.deepEqual(
      result
        .bestChoiceGroup
        ?.allEquivalentHotelIds,
      [
        "verified",
      ]
    );
  }
);

test(
  "A safe provisional Best Choice remains available as a transparent fallback",
  () => {
    const result =
      evaluateRecommendationRolesV2([
        recommendationCandidate({
          hotelId: "provisional",
          score: 92,
          totalCost: 350,
          completeness:
            "reported-tax-status-unknown",
        }),
      ]);

    const pick =
      result.picks[0];

    assert.equal(
      result.bestChoiceHotelId,
      "provisional"
    );

    assert.equal(
      pick.metrics.withinBudget,
      null
    );

    assert.ok(
      pick.reasonCodes.includes(
        "recommendation-provisionally-under-budget"
      )
    );

    assert.ok(
      pick.reasonCodes.includes(
        "recommendation-provisional-budget-fallback"
      )
    );

    assert.ok(
      !pick.reasonCodes.includes(
        "recommendation-within-budget-required"
      )
    );
  }
);

test(
  "A provisional amount with insufficient headroom cannot become Best Choice",
  () => {
    const result =
      evaluateRecommendationRolesV2([
        recommendationCandidate({
          hotelId: "tight-margin",
          score: 96,
          totalCost: 470,
          completeness:
            "reported-tax-status-unknown",
        }),
      ]);

    assert.equal(
      result.bestChoiceHotelId,
      null
    );

    assert.ok(
      result
        .evaluations[0]
        .reasonCodes
        .includes(
          "recommendation-no-budget-safe-best-choice"
        )
    );
  }
);

test(
  "A materially stronger safe provisional option can beat a verified alternative",
  () => {
    const result =
      evaluateRecommendationRolesV2([
        recommendationCandidate({
          hotelId: "verified",
          score: 88,
          totalCost: 370,
          completeness:
            "reported-complete",
        }),
        recommendationCandidate({
          hotelId: "materially-stronger",
          score: 95,
          totalCost: 300,
          completeness:
            "reported-tax-status-unknown",
        }),
      ]);

    const pick =
      result.picks.find(
        (candidate) =>
          candidate.hotelId ===
          "materially-stronger"
      );

    assert.equal(
      result.bestChoiceHotelId,
      "materially-stronger"
    );

    assert.ok(
      pick?.reasonCodes.includes(
        "recommendation-provisional-material-advantage"
      )
    );
  }
);

test(
  "Frontend discloses a provisional Best Choice without claiming verified budget fit",
  () => {
    const input =
      createSearchInput();

    const view =
      buildSmartStayFrontendViewV2({
        ...input,
        hotels:
          input.hotels.filter(
            (hotel) =>
              hotel.id ===
              "provisional"
          ),
      });

    const pick =
      view.recommendationPicks.find(
        (candidate) =>
          candidate.sourceRole ===
          "best-choice"
      );

    assert.equal(
      pick
        ?.evaluation
        .budgetVisibility,
      "provisionally-under-budget"
    );

    assert.equal(
      pick
        ?.sourcePick
        .metrics
        .withinBudget,
      null
    );

    assert.ok(
      pick
        ?.reason
        .includes(
          "tax inclusion was not confirmed"
        )
    );

    assert.ok(
      !pick
        ?.sourcePick
        .reasonCodes
        .includes(
          "recommendation-within-budget-required"
        )
    );
  }
);
