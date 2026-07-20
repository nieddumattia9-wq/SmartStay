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
  id: string,
  totalCost: number,
  refundable: boolean
): HotelOffer {
  return {
    id,
    provider:
      "LiteAPI",
    price:
      totalCost,
    basePrice:
      totalCost,
    saving:
      0,
    currency:
      "EUR",
    cancellationPolicy:
      refundable
        ? "Free cancellation"
        : "Non-refundable",
    refundableTag:
      refundable
        ? "Refundable"
        : "Non-refundable",
    refundable,
    freeCancellationUntil:
      refundable
        ? "2026-09-01"
        : null,
    cancellationPenalty:
      refundable
        ? 0
        : totalCost,
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
    id: string;
    offerIndex: number;
    name: string;
    totalCost: number;
    refundable: boolean;
    stars: number;
    reviewScore: number;
    reviewCount: number;
    distance: number;
    latitude: number;
    longitude: number;
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
        input.totalCost,
        input.refundable
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
    refundable:
      true,
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
      "saving-non-refundable",
    offerIndex:
      2,
    name:
      "Sensible Saving Hotel",
    totalCost:
      300,
    refundable:
      false,
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
    refundable:
      true,
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
    refundable:
      true,
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

function buildView() {
  return buildSmartStayFrontendViewV2({
    hotels:
      HOTELS,
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
      HOTELS.length,
  });
}

test(
  "Frontend explanations separate strengths from trade-offs and hide technical price benchmarks",
  () => {
    const view =
      buildView();

    assert.ok(
      view.rankedHotels.length >
        0
    );

    const visibleText =
      view.rankedHotels
        .flatMap(
          (evaluation) => [
            ...evaluation.strengths,
            ...evaluation.tradeOffs,
          ]
        )
        .join(" ")
        .toLowerCase();

    assert.ok(
      !visibleText.includes(
        "guest quality"
      )
    );

    assert.ok(
      !visibleText.includes(
        "median of comparable stays"
      )
    );

    assert.ok(
      !visibleText.includes(
        "search average"
      )
    );

    assert.ok(
      !visibleText.includes(
        "meaningful trade-off"
      )
    );

    assert.ok(
      view.rankedHotels.some(
        (evaluation) =>
          evaluation.strengths.some(
            (strength) =>
              strength.includes(
                "Guests rate this stay"
              )
          )
      )
    );

    for (
      const evaluation
      of view.rankedHotels
    ) {
      assert.deepEqual(
        evaluation.reasons,
        [
          ...evaluation.strengths,
          ...evaluation.tradeOffs,
        ].slice(
          0,
          4
        )
      );
    }
  }
);

test(
  "A non-refundable selected offer is shown as a concrete trade-off",
  () => {
    const view =
      buildView();

    const evaluation =
      view.rankedHotels.find(
        (candidate) =>
          candidate.hotel.id ===
          "saving-non-refundable"
      );

    assert.ok(
      evaluation
    );

    assert.ok(
      evaluation.tradeOffs.includes(
        "The selected offer is non-refundable."
      )
    );

    assert.ok(
      !evaluation.strengths.includes(
        "The selected offer is non-refundable."
      )
    );
  }
);

test(
  "HotelCard renders separate explanation sections and removes the global search-average badge",
  () => {
    const hotelCardSource =
      readFileSync(
        "src/components/HotelCard/HotelCard.tsx",
        "utf8"
      );

    const resultsSource =
      readFileSync(
        "src/pages/Results/Results.tsx",
        "utf8"
      );

    const adapterSource =
      readFileSync(
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
        "utf8"
      );

    assert.ok(
      hotelCardSource.includes(
        "What stands out"
      )
    );

    assert.ok(
      hotelCardSource.includes(
        "What to consider"
      )
    );

    assert.ok(
      !hotelCardSource.includes(
        "priceAdvantagePercent"
      )
    );

    assert.ok(
      !hotelCardSource.includes(
        "below search average"
      )
    );

    assert.ok(
      !resultsSource.includes(
        "calculateAverageSearchPrice"
      )
    );

    assert.ok(
      !resultsSource.includes(
        "calculatePriceAdvantagePercent"
      )
    );

    assert.ok(
      resultsSource.includes(
        "strengths={evaluation.strengths}"
      )
    );

    assert.ok(
      resultsSource.includes(
        "tradeOffs={evaluation.tradeOffs}"
      )
    );

    for (
      const forbiddenText
      of [
        "guest quality",
        "median of comparable stays",
        "meaningful trade-off",
      ]
    ) {
      assert.ok(
        !adapterSource
          .toLowerCase()
          .includes(
            forbiddenText
          )
      );
    }
  }
);

test(
  "Budget explanations keep the specific headroom statement without semantic duplication",
  () => {
    const view =
      buildView();

    for (
      const evaluation
      of view.rankedHotels
    ) {
      const budgetStrengths =
        evaluation
          .strengths
          .filter(
            (strength) =>
              strength.startsWith(
                "Fits your total budget"
              ) ||
              strength ===
                "Fits within your total budget."
          );

      assert.ok(
        budgetStrengths.length <=
          1
      );
    }

    const bestChoice =
      view.rankedHotels.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "best"
      );

    assert.ok(
      bestChoice
    );

    assert.ok(
      bestChoice.strengths.includes(
        "Fits your total budget, leaving €120."
      )
    );

    assert.ok(
      !bestChoice.strengths.includes(
        "Fits within your total budget."
      )
    );
  }
);

test(
  "Worthwhile upgrade labels follow the strongest user-facing dimension",
  () => {
    const adapterSource =
      readFileSync(
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
        "utf8"
      );

    for (
      const label
      of [
        "Worthwhile quality upgrade",
        "Worthwhile location upgrade",
        "Worthwhile comfort upgrade",
        "Worthwhile flexibility upgrade",
      ]
    ) {
      assert.ok(
        adapterSource.includes(
          label
        )
      );
    }

    assert.ok(
      adapterSource.includes(
        "Guest rating rises from "
      )
    );

    assert.ok(
      adapterSource.includes(
        "Moves you from "
      )
    );

    assert.ok(
      adapterSource.includes(
        "Offers a meaningful improvement in amenities and room features."
      )
    );

    assert.ok(
      adapterSource.includes(
        "Offers meaningfully better booking flexibility."
      )
    );
  }
);

test(
  "User-facing upgrade copy never exposes normalized engine point deltas",
  () => {
    const adapterSource =
      readFileSync(
        "src/engine-v2/frontend/smartStayFrontendAdapterV2.ts",
        "utf8"
      );

    for (
      const forbiddenText
      of [
        " improvement of ",
        "Improves the overall trip match by",
        "Gives up ${value} of overall trip fit",
        "Improves ${dimensionLabel} by",
      ]
    ) {
      assert.ok(
        !adapterSource.includes(
          forbiddenText
        )
      );
    }

    assert.ok(
      adapterSource.includes(
        "Offers stronger review-backed quality than"
      )
    );
  }
);

