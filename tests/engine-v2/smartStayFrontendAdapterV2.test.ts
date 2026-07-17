import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

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
  }
);