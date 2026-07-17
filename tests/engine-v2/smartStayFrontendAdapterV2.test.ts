import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  createStoredSearchMeta,
  normalizeStoredSearchMeta,
} from "../../src/utils/searchMeta";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

function createOffer(
  id:
    string,
  provider:
    string,
  totalCost:
    number
): HotelOffer {
  return {
    id,
    provider,
    price:
      totalCost,
    basePrice:
      totalCost,
    saving:
      0,
    currency:
      "EUR",
    cancellationPolicy:
      "Free cancellation",
    refundableTag:
      "Refundable",
    refundable:
      true,
    freeCancellationUntil:
      "2026-09-01",
    cancellationPenalty:
      0,
    cancellationPenaltyCurrency:
      "EUR",
    cancellationPenaltyType:
      "amount",
    cancellationTimezone:
      "Europe/Rome",
    taxesIncluded:
      true,
    includedTaxes:
      20,
    excludedTaxes:
      0,
    unknownTaxes:
      0,
    totalKnownCost:
      totalCost,
    roomName:
      "Double hotel room",
    bookable:
      true,

    redirectable:
      false,
  };
}

function createHotel(
  input: {
    id:
      string;
    offerIndex:
      number;
    name:
      string;
    totalCost:
      number;
    stars:
      number;
    reviewScore:
      number;
    reviewCount:
      number;
    distance:
      number;
    latitude:
      number;
    longitude:
      number;
  }
): Hotel {
  return {
    id:
      input.id,
    dataSources: [
      "LiteAPI",
    ],
    dataConfidence:
      "full",
    availableData: {
      hasPrice:
        true,
      hasBasePrice:
        true,
      hasSaving:
        true,
      hasStars:
        true,
      hasReviewScore:
        true,
      hasReviewCount:
        true,
      hasDistance:
        true,
      hasImage:
        true,
      hasAddress:
        true,
      hasCoordinates:
        true,
      hasAmenities:
        true,
    },
    offers: [
      createOffer(
        `offer-${input.offerIndex}`,
        "LiteAPI",
        input.totalCost
      ),
    ],
    name:
      input.name,
    provider:
      "LiteAPI",
    stars:
      input.stars,
    reviewScore:
      input.reviewScore,
    reviewCount:
      input.reviewCount,
    reviewText:
      "Excellent",
    price:
      input.totalCost,
    basePrice:
      input.totalCost,
    saving:
      0,
    currency:
      "EUR",
    taxesIncluded:
      true,
    includedTaxes:
      20,
    excludedTaxes:
      0,
    unknownTaxes:
      0,
    totalKnownCost:
      input.totalCost,
    distance:
      input.distance,
    image:
      `https://images.example/${input.id}.jpg`,
    address:
      `${input.id} SmartStay Street`,
    city:
      "Florence",
    country:
      "Italy",
    latitude:
      input.latitude,
    longitude:
      input.longitude,
    amenities: [
      "Hotel room",
      "Private bathroom",
      "WiFi",
      "Air conditioning",
      "Breakfast",
      "Reception",
      "Elevator",
    ],
    facilities: [
      "Front desk",
      "Daily housekeeping",
    ],
  };
}

const HOTELS: Hotel[] = [
  createHotel({
    id:
      "best",
    offerIndex:
      1,
    name:
      "Central Value Hotel",
    totalCost:
      380,
    stars:
      4,
    reviewScore:
      8.9,
    reviewCount:
      900,
    distance:
      0.8,
    latitude:
      43.773,
    longitude:
      11.255,
  }),
  createHotel({
    id:
      "saving",
    offerIndex:
      2,
    name:
      "Sensible Saving Hotel",
    totalCost:
      300,
    stars:
      3,
    reviewScore:
      8.3,
    reviewCount:
      550,
    distance:
      1.5,
    latitude:
      43.777,
    longitude:
      11.246,
  }),
  createHotel({
    id:
      "upgrade",
    offerIndex:
      3,
    name:
      "Comfort Upgrade Hotel",
    totalCost:
      470,
    stars:
      5,
    reviewScore:
      9.3,
    reviewCount:
      1250,
    distance:
      1,
    latitude:
      43.768,
    longitude:
      11.267,
  }),
  createHotel({
    id:
      "far",
    offerIndex:
      4,
    name:
      "Far Cheap Hotel",
    totalCost:
      250,
    stars:
      4,
    reviewScore:
      8.7,
    reviewCount:
      700,
    distance:
      8,
    latitude:
      43.84,
    longitude:
      11.35,
  }),
];

const BUDGET_VISIBILITY_HOTELS:
  Hotel[] = [
    createHotel({
      id:
        "within-budget",

      offerIndex:
        10,

      name:
        "Within Budget Hotel",

      totalCost:
        420,

      stars:
        4,

      reviewScore:
        8.8,

      reviewCount:
        900,

      distance:
        1,

      latitude:
        43.77,

      longitude:
        11.256,
    }),

    createHotel({
      id:
        "near-budget-508",

      offerIndex:
        11,

      name:
        "Near Budget 508",

      totalCost:
        508,

      stars:
        4,

      reviewScore:
        9.1,

      reviewCount:
        1400,

      distance:
        0.8,

      latitude:
        43.771,

      longitude:
        11.257,
    }),

    createHotel({
      id:
        "near-budget-540",

      offerIndex:
        12,

      name:
        "Near Budget 540",

      totalCost:
        540,

      stars:
        5,

      reviewScore:
        9.2,

      reviewCount:
        1600,

      distance:
        0.7,

      latitude:
        43.772,

      longitude:
        11.258,
    }),

    createHotel({
      id:
        "near-budget-575",

      offerIndex:
        13,

      name:
        "Near Budget 575",

      totalCost:
        575,

      stars:
        5,

      reviewScore:
        9,

      reviewCount:
        1200,

      distance:
        0.9,

      latitude:
        43.773,

      longitude:
        11.259,
    }),

    createHotel({
      id:
        "near-budget-600",

      offerIndex:
        14,

      name:
        "Near Budget 600",

      totalCost:
        600,

      stars:
        5,

      reviewScore:
        8.9,

      reviewCount:
        1100,

      distance:
        1.1,

      latitude:
        43.774,

      longitude:
        11.26,
    }),

    createHotel({
      id:
        "far-over-budget-650",

      offerIndex:
        15,

      name:
        "Far Over Budget 650",

      totalCost:
        650,

      stars:
        5,

      reviewScore:
        9.4,

      reviewCount:
        1800,

      distance:
        0.6,

      latitude:
        43.775,

      longitude:
        11.261,
    }),

    createHotel({
      id:
        "far-over-budget-900",

      offerIndex:
        16,

      name:
        "Far Over Budget 900",

      totalCost:
        900,

      stars:
        5,

      reviewScore:
        9.5,

      reviewCount:
        2000,

      distance:
        0.5,

      latitude:
        43.776,

      longitude:
        11.262,
    }),

    createHotel({
      id:
        "far-over-budget-1300",

      offerIndex:
        17,

      name:
        "Far Over Budget 1300",

      totalCost:
        1300,

      stars:
        5,

      reviewScore:
        9.6,

      reviewCount:
        2200,

      distance:
        0.4,

      latitude:
        43.777,

      longitude:
        11.263,
    }),
  ];

function buildView(
  hotels:
    Hotel[]
) {
  return buildSmartStayFrontendViewV2({
    hotels,
    preferenceId:
      "balanced",
    selectedIndex:
      2,
    preferenceSource:
      "automatic",
    totalBudget:
      500,
    maximumDistanceKm:
      5,
    selectedLocation: {
      latitude:
        43.7696,
      longitude:
        11.2558,
      confidence:
        1,
      label:
        "Florence",
    },
    nights:
      3,
    adults:
      2,
    children:
      0,
    rooms:
      1,
    maximumVisibleResults:
      hotels.length,
  });
}

test(
  "Budget visibility hides far-over-budget stays from the main list",
  () => {
    const view =
      buildView(
        BUDGET_VISIBILITY_HOTELS
      );

    assert.equal(
      view
        .budgetPolicy
        .totalBudget,
      500
    );

    assert.equal(
      view
        .budgetPolicy
        .nearBudgetLimit,
      600
    );

    assert.ok(
      view.rankedHotels.some(
        (evaluation) =>
          evaluation.hotel.id ===
          "within-budget"
      )
    );

    assert.ok(
      view.rankedHotels.every(
        (evaluation) =>
          evaluation.totalCost !==
            null &&
          evaluation.totalCost <=
            600
      )
    );

    assert.deepEqual(
      [
        ...view
          .hiddenFarOverBudgetHotelIds,
      ].sort(),
      [
        "far-over-budget-1300",
        "far-over-budget-650",
        "far-over-budget-900",
      ]
    );

    assert.ok(
      view.recommendationPicks.every(
        (pick) =>
          pick
            .evaluation
            .totalCost !==
            null &&
          pick
            .evaluation
            .totalCost <=
            600
      )
    );
  }
);

test(
  "Budget visibility exposes at most three deterministic near-budget upgrades",
  () => {
    const forward =
      buildView(
        BUDGET_VISIBILITY_HOTELS
      );

    const reversed =
      buildView(
        [
          ...BUDGET_VISIBILITY_HOTELS,
        ].reverse()
      );

    const forwardIds =
      forward
        .rankedHotels
        .map(
          (evaluation) =>
            evaluation.hotel.id
        );

    const reversedIds =
      reversed
        .rankedHotels
        .map(
          (evaluation) =>
            evaluation.hotel.id
        );

    assert.deepEqual(
      reversedIds,
      forwardIds
    );

    const visibleNearBudget =
      forward
        .rankedHotels
        .filter(
          (evaluation) =>
            evaluation
              .budgetVisibility ===
            "near-budget"
        );

    assert.equal(
      visibleNearBudget.length,
      3
    );

    assert.equal(
      forward
        .budgetPolicy
        .nearBudgetCandidateCount,
      4
    );

    assert.equal(
      forward
        .budgetPolicy
        .nearBudgetVisibleCount,
      3
    );

    assert.equal(
      forward
        .budgetPolicy
        .hiddenNearBudgetCount,
      1
    );

    assert.equal(
      forward
        .hiddenNearBudgetHotelIds
        .length,
      1
    );

    assert.deepEqual(
      reversed
        .hiddenNearBudgetHotelIds,
      forward
        .hiddenNearBudgetHotelIds
    );

    const visibilityOrder =
      forward
        .rankedHotels
        .map(
          (evaluation) =>
            evaluation
              .budgetVisibility
        );

    const firstNearBudgetIndex =
      visibilityOrder.indexOf(
        "near-budget"
      );

    assert.ok(
      firstNearBudgetIndex >
        0
    );

    assert.ok(
      visibilityOrder
        .slice(
          0,
          firstNearBudgetIndex
        )
        .every(
          (visibility) =>
            visibility ===
            "within-budget"
        )
    );
  }
);

test(
  "Frontend V2 adapter exposes ranked display evaluations",
  () => {
    const view =
      buildView(
        HOTELS
      );

    assert.equal(
      view.analyzedHotelCount,
      HOTELS.length
    );

    assert.ok(
      view.rankedHotels.length >
        0
    );

    assert.ok(
      view.excludedHotelIds.includes(
        "far"
      )
    );

    assert.ok(
      !view.rankedHotels.some(
        (evaluation) =>
          evaluation.hotel.id ===
          "far"
      )
    );

    for (
      const evaluation
      of view.rankedHotels
    ) {
      assert.ok(
        evaluation.smartScore >=
          0 &&
        evaluation.smartScore <=
          100
      );

      assert.ok(
        evaluation.badges.length >
          0
      );

      assert.ok(
        evaluation.reasons.length >
          0
      );

      assert.equal(
        evaluation.sourceEvaluation
          .hotel.id,
        evaluation.hotel.id
      );
    }
  }
);

test(
  "Frontend V2 recommendations come from Recommendation Roles V2",
  () => {
    const view =
      buildView(
        HOTELS
      );

    assert.ok(
      view.recommendationPicks.length >
        0
    );

    assert.equal(
      view.recommendationPicks[0]
        ?.sourceRole,
      "best-choice"
    );

    const recommendationIds =
      view.recommendationPicks.map(
        (pick) =>
          pick.evaluation.hotel.id
      );

    assert.equal(
      new Set(
        recommendationIds
      ).size,
      recommendationIds.length
    );

    for (
      const pick
      of view.recommendationPicks
    ) {
      assert.ok(
        pick.label.length >
          0
      );

      assert.ok(
        pick.reason.length >
          0
      );
    }
  }
);

test(
  "Frontend V2 adapter is deterministic across provider order",
  () => {
    const forward =
      buildView(
        HOTELS
      );

    const reversed =
      buildView(
        [
          ...HOTELS,
        ].reverse()
      );

    assert.deepEqual(
      reversed,
      forward
    );
  }
);

test(
  "Live provider offers remain rankable without a redirect URL",
  () => {
    const view =
      buildView(
        HOTELS
      );

    assert.ok(
      view.rankedHotels.length >
        0
    );

    for (
      const evaluation
      of view.rankedHotels
    ) {
      const offer =
        evaluation.hotel
          .offers[0];

      assert.equal(
        offer?.bookable,
        true
      );

      assert.equal(
        offer?.redirectable,
        false
      );
    }
  }
);

test(
  "Search metadata preserves valid destination coordinates",
  () => {
    const created =
      createStoredSearchMeta({
        destinationLabel:
          "Florence, Italy",

        destinationLatitude:
          43.7696,

        destinationLongitude:
          11.2558,

        smartPreference: {
          selectedIndex:
            2,
        },

        budgetInput:
          500,

        currency:
          "EUR",

        checkIn:
          "2026-09-15",

        checkOut:
          "2026-09-18",

        maxDistanceKm:
          5,
      });

    assert.equal(
      created
        .destinationLatitude,
      43.7696
    );

    assert.equal(
      created
        .destinationLongitude,
      11.2558
    );

    const normalized =
      normalizeStoredSearchMeta({
        ...created,

        destinationLatitude:
          91,

        destinationLongitude:
          181,
      });

    assert.equal(
      normalized
        ?.destinationLatitude,
      null
    );

    assert.equal(
      normalized
        ?.destinationLongitude,
      null
    );
  }
);

test(
  "Results and HotelCard no longer depend on legacy ranking bridges",
  () => {
    const resultsSource =
      readFileSync(
        "src/pages/Results/Results.tsx",
        "utf8"
      );

    const hotelCardSource =
      readFileSync(
        "src/components/HotelCard/HotelCard.tsx",
        "utf8"
      );

    const tripOptimizerSource =
      readFileSync(
        "src/components/TripOptimizer/TripOptimizer.tsx",
        "utf8"
      );

    const searchMetaSource =
      readFileSync(
        "src/utils/searchMeta.ts",
        "utf8"
      );

    const hotelTypeSource =
      readFileSync(
        "src/types/hotel.ts",
        "utf8"
      );

    const publicPresenterSource =
      readFileSync(
        "server/presenters/publicHotelPresenter.js",
        "utf8"
      );

    const frontendAdapterSource =
      readFileSync(
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
        "utf8"
      );

    assert.ok(
      !resultsSource.includes(
        "rankHotelsWithSmartStayEngine"
      )
    );

    assert.ok(
      !resultsSource.includes(
        "selectSmartStayRecommendationRoles"
      )
    );

    assert.ok(
      resultsSource.includes(
        "await import("
      )
    );

    assert.ok(
      resultsSource.includes(
        "smartStayFrontendAdapterV2"
      )
    );

    assert.ok(
      !hotelCardSource.includes(
        "../../utils/smartStayEngine"
      )
    );

    assert.ok(
      resultsSource.includes(
        "selectedLocation:"
      )
    );

    assert.ok(
      resultsSource.includes(
        ".redirectable ==="
      )
    );

    assert.ok(
      !resultsSource.includes(
        "primaryOffer.offer.bookable !== true"
      )
    );

    assert.ok(
      tripOptimizerSource.includes(
        "destinationLatitude:"
      )
    );

    assert.ok(
      tripOptimizerSource.includes(
        "destinationLongitude:"
      )
    );

    assert.ok(
      searchMetaSource.includes(
        "destinationLatitude:"
      )
    );

    assert.ok(
      searchMetaSource.includes(
        "destinationLongitude:"
      )
    );

    assert.ok(
      hotelTypeSource.includes(
        "redirectable?: boolean;"
      )
    );

    assert.ok(
      publicPresenterSource.includes(
        "redirectable:"
      )
    );

    assert.ok(
      !/bookable:\s*Boolean\(\s*getSafeHttpUrl\(/s.test(
        publicPresenterSource
      )
    );

    assert.ok(
      frontendAdapterSource.includes(
        "MAXIMUM_NEAR_BUDGET_RESULTS"
      )
    );

    assert.ok(
      frontendAdapterSource.includes(
        "hiddenFarOverBudgetHotelIds"
      )
    );

    assert.ok(
      resultsSource.includes(
        "const nearBudgetHotels ="
      )
    );

    assert.ok(
      resultsSource.includes(
        "Near-budget alternative"
      )
    );

    assert.ok(
      resultsSource.includes(
        "did not pass SmartStay verification"
      )
    );

    assert.ok(
      resultsSource.includes(
        "distanceGain.toFixed"
      )
    );

    assert.ok(
      !resultsSource.includes(
        "useful near-budget upgrade"
      )
    );
  }
);