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
  compareSelectedOffersV2,
  selectIntentAwareHotelOfferV2,
} from "../../src/engine-v2/offers/intentAwareOfferSelectionV2";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

function createOffer(input: {
  id: string;
  amount: number;
  roomName: string;
  refundable: boolean;
  freeCancellationUntil?: string | null;
  taxesIncluded?: boolean | null;
  excludedTaxes?: number;
  unknownTaxes?: number;
}): HotelOffer {
  return {
    id: input.id,
    provider: "LiteAPI",
    price: input.amount,
    basePrice: input.amount,
    saving: 0,
    currency: "EUR",
    cancellationPolicy: input.refundable ? "Refundable" : "Non-refundable",
    refundableTag: input.refundable ? "RFN" : "NRFN",
    refundable: input.refundable,
    freeCancellationUntil:
      input.freeCancellationUntil ??
      (input.refundable ? "2026-08-07T00:00:00Z" : null),
    cancellationPenalty: null,
    cancellationPenaltyCurrency: null,
    cancellationPenaltyType: null,
    cancellationTimezone: "Europe/Rome",
    taxesIncluded: input.taxesIncluded ?? true,
    includedTaxes: 24,
    excludedTaxes: input.excludedTaxes ?? 0,
    unknownTaxes: input.unknownTaxes ?? 0,
    totalKnownCost: input.amount,
    roomName: input.roomName,
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
    ...offers.map((offer) => offer.totalKnownCost ?? offer.price)
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
    stars: input.stars ?? 5,
    reviewScore: input.reviewScore ?? 9.6,
    reviewCount: input.reviewCount ?? 1200,
    reviewText: "Excellent",
    price: cheapest,
    basePrice: cheapest,
    saving: 0,
    currency: "EUR",
    taxesIncluded: true,
    includedTaxes: 24,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: cheapest,
    distance: input.distance ?? 0.3,
    image: `https://images.example/${id}.jpg`,
    address: "1 SmartStay Street",
    city: "Florence",
    country: "Italy",
    latitude: 43.77,
    longitude: 11.25,
    amenities: [
      "Private bathroom",
      "WiFi",
      "Air conditioning",
      "Breakfast",
      "Reception",
      "Elevator",
      "Daily housekeeping",
    ],
    facilities: ["Spa", "Room service"],
  };
}

const GOLDEN_TOWER = createHotel(
  "golden-tower",
  [
    createOffer({
      id: "offer-1",
      amount: 361.53,
      roomName: "Deluxe Room",
      refundable: false,
    }),
    createOffer({
      id: "offer-2",
      amount: 363.37,
      roomName: "Deluxe Room",
      refundable: true,
      freeCancellationUntil: "2026-08-02T10:00:00Z",
    }),
  ]
);

const ROCCO_FORTE = createHotel(
  "rocco-forte",
  [
    createOffer({
      id: "offer-1",
      amount: 1136.73,
      roomName: "Superior Room",
      refundable: true,
      freeCancellationUntil: "2026-08-07T00:00:00Z",
      taxesIncluded: false,
      excludedTaxes: 16,
    }),
  ],
  { reviewScore: 9.5, reviewCount: 234, distance: 0.25 }
);

const VILLE_SULL_ARNO = createHotel(
  "ville-sull-arno",
  [
    createOffer({
      id: "offer-1",
      amount: 195.48,
      roomName: "Double Superior",
      refundable: false,
    }),
  ],
  { reviewScore: 9.6, reviewCount: 1658, distance: 2.36 }
);

test(
  "Maximum Comfort selects a marginal refundable upgrade for the same room tier",
  () => {
    const selection = selectIntentAwareHotelOfferV2(GOLDEN_TOWER, {
      preferenceId: "maximum-comfort",
    });
    assert.equal(selection.selectedOffer?.offerId, "offer-2");
    assert.equal(selection.selectedOffer?.amount, 363.37);
    assert.equal(selection.selectedOffer?.refundable, true);
    assert.equal(selection.selectionMode, "intent-aware-flexibility");
  }
);

test(
  "Maximum Savings preserves the lowest valid non-refundable offer",
  () => {
    const selection = selectIntentAwareHotelOfferV2(GOLDEN_TOWER, {
      preferenceId: "maximum-savings",
    });
    assert.equal(selection.selectedOffer?.offerId, "offer-1");
    assert.equal(selection.selectedOffer?.amount, 361.53);
    assert.equal(selection.selectedOffer?.refundable, false);
    assert.equal(selection.selectionMode, "lowest-price");
  }
);

test(
  "Maximum Comfort does not buy flexibility when the premium is excessive",
  () => {
    const hotel = createHotel("expensive-flexibility", [
      createOffer({
        id: "offer-1",
        amount: 300,
        roomName: "Deluxe Room",
        refundable: false,
      }),
      createOffer({
        id: "offer-2",
        amount: 390,
        roomName: "Deluxe Room",
        refundable: true,
      }),
    ]);
    const selection = selectIntentAwareHotelOfferV2(hotel, {
      preferenceId: "maximum-comfort",
    });
    assert.equal(selection.selectedOffer?.offerId, "offer-1");
    assert.equal(selection.selectionMode, "lowest-price");
  }
);

test(
  "Offer Comparability rejects a non-refundable saving against a refundable Best Choice",
  () => {
    const bestChoice = selectIntentAwareHotelOfferV2(ROCCO_FORTE, {
      preferenceId: "maximum-comfort",
    });
    const saving = selectIntentAwareHotelOfferV2(VILLE_SULL_ARNO, {
      preferenceId: "maximum-comfort",
    });
    const comparison = compareSelectedOffersV2(saving, bestChoice);
    assert.equal(comparison.comparable, false);
    assert.equal(comparison.refundabilityCompatible, false);
    assert.ok(
      comparison.reasonCodes.includes(
        "offer-comparison-refundability-downgrade"
      )
    );
  }
);

test(
  "Offer Comparability accepts a refundable same-tier premium alternative",
  () => {
    const bestChoice = selectIntentAwareHotelOfferV2(ROCCO_FORTE, {
      preferenceId: "maximum-comfort",
    });
    const saving = selectIntentAwareHotelOfferV2(GOLDEN_TOWER, {
      preferenceId: "maximum-comfort",
    });
    const comparison = compareSelectedOffersV2(saving, bestChoice);
    assert.equal(comparison.comparable, true);
    assert.equal(comparison.refundabilityCompatible, true);
    assert.equal(comparison.costCompletenessCompatible, true);
    assert.equal(comparison.roomTierCompatible, true);
  }
);

test(
  "Engine V2 exposes and prices the intent-selected refundable offer",
  () => {
    const input = {
      hotels: [GOLDEN_TOWER, ROCCO_FORTE, VILLE_SULL_ARNO],
      preferenceId: "maximum-comfort" as const,
      selectedIndex: 0,
      preferenceSource: "manual" as const,
      totalBudget: 1500,
      maximumDistanceKm: 5,
      selectedLocation: {
        latitude: 43.77,
        longitude: 11.25,
        confidence: 1,
        label: "Florence",
      },
      nights: 1,
      rooms: 1,
      maximumVisibleResults: 3,
      capturedAt: null,
    };

    const result = evaluateSmartStaySearchV2(input);
    const golden = result.recommendationRoles.evaluations.find(
      (evaluation) => evaluation.hotelId === "golden-tower"
    );
    const ville = result.recommendationRoles.evaluations.find(
      (evaluation) => evaluation.hotelId === "ville-sull-arno"
    );
    const villeFinalEvaluation = result.evaluations.find(
      (evaluation) => evaluation.hotel.id === "ville-sull-arno"
    );
    const saving = result.recommendationRoles.picks.find(
      (pick) => pick.role === "best-sensible-saving" && pick.primaryInGroup
    );

    assert.equal(result.recommendationRoles.bestChoiceHotelId, "rocco-forte");
    assert.ok(golden);
    assert.equal(golden.metrics.selectedOffer?.offerId, "offer-2");
    assert.equal(golden.metrics.selectedOffer?.refundable, true);
    assert.equal(golden.metrics.totalCost, 363.37);
    assert.equal(
      ville?.metrics.offerComparisonToBestChoice?.comparable,
      false
    );
    assert.equal(saving?.hotelId, "golden-tower");
    assert.notEqual(saving?.hotelId, "ville-sull-arno");
    assert.equal(
      saving?.metrics.offerComparisonToBestChoice?.comparable,
      true
    );
    assert.ok(
      !villeFinalEvaluation?.explanation.comparisonFacts.some(
        (fact) =>
          fact.code ===
          "explanation-comparison-saves-money"
      )
    );

    const frontend = buildSmartStayFrontendViewV2(input);
    const frontendBestChoice = frontend.recommendationPicks.find(
      (pick) => pick.sourceRole === "best-choice"
    );
    assert.equal(
      frontendBestChoice?.evaluation.hotel.id,
      "rocco-forte"
    );

    const frontendSaving =
      frontend.recommendationPicks.find(
        (pick) =>
          pick.sourceRole ===
          "best-sensible-saving"
      );

    assert.equal(
      frontendSaving?.evaluation.hotel.id,
      "golden-tower"
    );

    assert.equal(
      frontendSaving?.label,
      "Premium value alternative"
    );

    const frontendGolden = frontend.rankedHotels.find(
      (evaluation) => evaluation.hotel.id === "golden-tower"
    );

    assert.equal(
      frontendGolden?.selectedOffer?.offerId,
      "offer-2"
    );
    assert.equal(
      frontendGolden?.selectedOffer?.refundable,
      true
    );
    assert.equal(
      frontendGolden?.totalCost,
      363.37
    );
  }
);

test(
  "Results and HotelCard render the selected offer and avoid misleading recommendation language",
  () => {
    const resultsSource = readFileSync(
      "src/pages/Results/Results.tsx",
      "utf8"
    );

    const hotelCardSource = readFileSync(
      "src/components/HotelCard/HotelCard.tsx",
      "utf8"
    );

    assert.ok(
      resultsSource.includes(
        "selectedOffer={"
      )
    );
    assert.ok(
      resultsSource.includes(
        "evaluation.selectedOffer"
      )
    );
    assert.ok(
      hotelCardSource.includes(
        "selectedOffer?: SmartStaySelectedOfferV2"
      )
    );
    assert.ok(
      hotelCardSource.includes(
        "Refundable offer selected"
      )
    );
    assert.ok(
      hotelCardSource.includes(
        "How this stay compares"
      )
    );
    assert.ok(
      resultsSource.includes(
        "evaluation.selectedOffer"
      )
    );
  }
);
