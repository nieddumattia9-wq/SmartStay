import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  SMARTSTAY_ENGINE_V2_PIPELINE_VERSION,
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  SMARTSTAY_ENGINE_V2_VERSION,
} from "../../src/engine-v2/model/smartStayEvaluationV2";

function createOffer(
  index:
    number,
  provider:
    string,
  totalCost:
    number
): HotelOffer {
  return {
    id:
      `offer-${index}`,

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
      "Free cancellation before arrival",

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
      24,

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

    name:
      string;

    provider:
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

    offerIndex:
      number;
  }
): Hotel {
  return {
    id:
      input.id,

    dataSources: [
      input.provider,
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
        input.offerIndex,
        input.provider,
        input.totalCost
      ),
    ],

    name:
      input.name,

    provider:
      input.provider,

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
      24,

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
      `${input.offerIndex} SmartStay Street`,

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
      "Non-smoking rooms",
    ],
  };
}

const HOTELS: Hotel[] = [
  createHotel({
    id:
      "central-value",

    name:
      "Central Value Hotel",

    provider:
      "LiteAPI",

    totalCost:
      380,

    stars:
      4,

    reviewScore:
      8.8,

    reviewCount:
      850,

    distance:
      0.8,

    latitude:
      43.773,

    longitude:
      11.255,

    offerIndex:
      1,
  }),

  createHotel({
    id:
      "budget-stay",

    name:
      "Budget Stay Hotel",

    provider:
      "LiteAPI",

    totalCost:
      300,

    stars:
      3,

    reviewScore:
      8.2,

    reviewCount:
      500,

    distance:
      1.5,

    latitude:
      43.777,

    longitude:
      11.246,

    offerIndex:
      2,
  }),

  createHotel({
    id:
      "comfort-upgrade",

    name:
      "Comfort Upgrade Hotel",

    provider:
      "LiteAPI",

    totalCost:
      470,

    stars:
      5,

    reviewScore:
      9.2,

    reviewCount:
      1200,

    distance:
      1,

    latitude:
      43.768,

    longitude:
      11.267,

    offerIndex:
      3,
  }),

  createHotel({
    id:
      "far-cheap",

    name:
      "Far Cheap Hotel",

    provider:
      "LiteAPI",

    totalCost:
      250,

    stars:
      4,

    reviewScore:
      8.6,

    reviewCount:
      700,

    distance:
      8,

    latitude:
      43.84,

    longitude:
      11.35,

    offerIndex:
      4,
  }),
];

function runPipeline(
  hotels:
    Hotel[]
) {
  return evaluateSmartStaySearchV2({
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

    tripProfile:
      "leisure",

    maximumVisibleResults:
      4,

    capturedAt:
      null,
  });
}

test(
  "Engine V2 orchestrator assembles the complete production contract",
  () => {
    const result =
      runPipeline(
        HOTELS
      );

    assert.equal(
      result.engineVersion,
      SMARTSTAY_ENGINE_V2_VERSION
    );

    assert.equal(
      result.pipelineVersion,
      SMARTSTAY_ENGINE_V2_PIPELINE_VERSION
    );

    assert.equal(
      result.evaluations.length,
      HOTELS.length
    );

    assert.equal(
      result.ranking.evaluations.length,
      HOTELS.length
    );

    assert.equal(
      result.recommendationRoles.evaluations.length,
      HOTELS.length
    );

    assert.equal(
      result.explanations.evaluations.length,
      HOTELS.length
    );

    assert.ok(
      result.ranking.visibleHotelIds.length >
        0
    );

    assert.ok(
      result.recommendationRoles
        .bestChoiceHotelId
    );

    assert.ok(
      result.ranking.visibleHotelIds.some(
        (hotelId) =>
          hotelId !==
          "far-cheap"
      )
    );

    for (
      const evaluation
      of result.evaluations
    ) {
      assert.equal(
        evaluation.engineVersion,
        SMARTSTAY_ENGINE_V2_VERSION
      );

      assert.ok(
        evaluation.final
          .deterministicKey
          .length >
          0
      );

      assert.ok(
        evaluation.evidence.length >
          0
      );

      assert.ok(
        evaluation.final.smartScore >=
          0 &&
        evaluation.final.smartScore <=
          100
      );

      assert.ok(
        evaluation.final.utilityScore >=
          0 &&
        evaluation.final.utilityScore <=
          100
      );

      assert.ok(
        evaluation.final.scoreConfidence >=
          0 &&
        evaluation.final.scoreConfidence <=
          1
      );

      assert.equal(
        evaluation.constraints.length,
        3
      );
    }
  }
);

test(
  "Engine V2 orchestrator blocks a stay outside the hard distance limit",
  () => {
    const result =
      runPipeline(
        HOTELS
      );

    assert.ok(
      result.ranking.excludedHotelIds.includes(
        "far-cheap"
      )
    );

    assert.ok(
      !result.ranking.visibleHotelIds.includes(
        "far-cheap"
      )
    );

    assert.notEqual(
      result.recommendationRoles
        .bestChoiceHotelId,
      "far-cheap"
    );

    const farEvaluation =
      result.evaluations.find(
        (evaluation) =>
          evaluation.hotel.id ===
          "far-cheap"
      );

    assert.ok(
      farEvaluation
    );

    assert.equal(
      farEvaluation.constraints.find(
        (constraint) =>
          constraint.kind ===
          "distance"
      )?.status,
      "exceeded"
    );

    assert.equal(
      farEvaluation.final.rankBand,
      "excluded"
    );
  }
);

test(
  "Engine V2 orchestrator is deterministic when provider order changes",
  () => {
    const forward =
      runPipeline(
        HOTELS
      );

    const reversed =
      runPipeline(
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