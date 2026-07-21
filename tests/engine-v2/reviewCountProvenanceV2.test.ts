import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
  HotelReviewCountRelation,
} from "../../src/types/hotel";

import {
  buildHotelEvidenceModelV2,
} from "../../src/engine-v2/evidence/hotelEvidenceModel";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  formatReviewCountEvidencePhrase,
  formatReviewCountLabel,
} from "../../src/utils/reviewCountDisplay";

type ReviewRelationRuntime = {
  combineReviewCountRelations:
    (
      firstRelation:
        unknown,
      secondRelation:
        unknown
    ) =>
      string;

  inferReviewCountRelation:
    (
      input: {
        reviewCount?:
          unknown;
        reviewCountRelation?:
          unknown;
        sourceProvider?:
          unknown;
        provider?:
          unknown;
      }
    ) =>
      string;
};

const reviewRelationRuntime =
  require(
    process.cwd() +
      "/server/utils/reviewCountRelation.js"
  ) as ReviewRelationRuntime;

const mapHotel =
  (
    require(
      process.cwd() +
        "/server/mappers/hotelMapper.js"
    ) as {
      mapHotel:
        (
          hotel:
            Record<
              string,
              unknown
            >,
          options?:
            Record<
              string,
              unknown
            >
        ) =>
          Record<
            string,
            unknown
          >;
    }
  ).mapHotel;

const mapLiteApiRecordToHotel =
  (
    require(
      process.cwd() +
        "/server/providers/liteApi/liteApiProvider.js"
    ) as {
      mapLiteApiRecordToHotel:
        (
          record:
            Record<
              string,
              unknown
            >,
          fallbackCurrency?:
            string,
          hotelDataIndex?:
            Map<
              string,
              unknown
            >,
          searchLocation?:
            Record<
              string,
              unknown
            > |
            null
        ) =>
          Record<
            string,
            unknown
          > |
          null;
    }
  ).mapLiteApiRecordToHotel;

const mapLiteApiHotelDetailsResponse =
  (
    require(
      process.cwd() +
        "/server/providers/liteApi/liteApiHotelDetailsMapper.js"
    ) as {
      mapLiteApiHotelDetailsResponse:
        (
          data:
            unknown,
          requestedHotelId?:
            string |
            null
        ) =>
          Record<
            string,
            unknown
          > |
          null;
    }
  ).mapLiteApiHotelDetailsResponse;

const mergeHotelRecords =
  (
    require(
      process.cwd() +
        "/server/providers/common/hotelMergeService.js"
    ) as {
      mergeHotelRecords:
        (
          firstHotel:
            Record<
              string,
              unknown
            >,
          secondHotel:
            Record<
              string,
              unknown
            >
        ) =>
          Record<
            string,
            unknown
          >;
    }
  ).mergeHotelRecords;

const createPublicHotel =
  (
    require(
      process.cwd() +
        "/server/presenters/publicHotelPresenter.js"
    ) as {
      createPublicHotel:
        (
          hotel:
            Record<
              string,
              unknown
            >
        ) =>
          Record<
            string,
            unknown
          > |
          null;
    }
  ).createPublicHotel;

function createOffer(
  id:
    string,
  totalCost:
    number
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
      "Free cancellation",
    refundableTag:
      "Refundable",
    refundable:
      true,
    freeCancellationUntil:
      "2026-10-01",
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
      "Double room",
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
    totalCost:
      number;
    reviewScore:
      number;
    reviewCount:
      number;
    reviewCountRelation:
      HotelReviewCountRelation;
    distance:
      number;
  }
): Hotel {
  return {
    id:
      input.id,
    dataSources: [
      "liteapi",
    ],
    dataConfidence:
      "full",
    availableData: {
      hasPrice:
        true,
      hasBasePrice:
        true,
      hasSaving:
        false,
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
        "offer-1",
        input.totalCost
      ),
    ],
    name:
      input.id,
    provider:
      "LiteAPI",
    stars:
      4,
    reviewScore:
      input.reviewScore,
    reviewCount:
      input.reviewCount,
    reviewCountRelation:
      input.reviewCountRelation,
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
      "SmartStay Street",
    city:
      "Florence",
    country:
      "Italy",
    latitude:
      43.7696,
    longitude:
      11.2558,
    amenities: [
      "WiFi",
      "Private bathroom",
      "Air conditioning",
      "Reception",
    ],
    facilities: [
      "Daily housekeeping",
    ],
  };
}

function createFrontendView(
  targetRelation:
    HotelReviewCountRelation
) {
  const hotels = [
    createHotel({
      id:
        "target",
      totalCost:
        420,
      reviewScore:
        9.2,
      reviewCount:
        20000,
      reviewCountRelation:
        targetRelation,
      distance:
        0.8,
    }),
    createHotel({
      id:
        "peer-one",
      totalCost:
        390,
      reviewScore:
        8.8,
      reviewCount:
        1200,
      reviewCountRelation:
        "equal",
      distance:
        1.1,
    }),
    createHotel({
      id:
        "peer-two",
      totalCost:
        460,
      reviewScore:
        9,
      reviewCount:
        900,
      reviewCountRelation:
        "equal",
      distance:
        1.4,
    }),
  ];

  return buildSmartStayFrontendViewV2({
    hotels,
    preferenceId:
      "balanced",
    selectedIndex:
      2,
    preferenceSource:
      "automatic",
    totalBudget:
      700,
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
      2,
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
  "Review count relation identifies the verified LiteAPI 20,000 lower bound",
  () => {
    assert.equal(
      reviewRelationRuntime
        .inferReviewCountRelation({
          reviewCount:
            20000,
          sourceProvider:
            "liteapi",
        }),
      "at-least"
    );

    assert.equal(
      reviewRelationRuntime
        .inferReviewCountRelation({
          reviewCount:
            19999,
          provider:
            "LiteAPI",
        }),
      "equal"
    );

    assert.equal(
      reviewRelationRuntime
        .inferReviewCountRelation({
          reviewCount:
            800,
          provider:
            "Another provider",
        }),
      "unknown"
    );

    assert.equal(
      reviewRelationRuntime
        .inferReviewCountRelation({
          reviewCount:
            20000,
          reviewCountRelation:
            "estimated",
          sourceProvider:
            "liteapi",
        }),
      "estimated"
    );

    assert.equal(
      reviewRelationRuntime
        .combineReviewCountRelations(
          "equal",
          "at-least"
        ),
      "at-least"
    );
  }
);

test(
  "Generic hotel mapping carries review count provenance without inventing exactness",
  () => {
    const liteApiHotel =
      mapHotel(
        {
          id:
            "lp59e41",
          name:
            "Plus Florence Hotel & Hostel",
          providerName:
            "LiteAPI",
          starRating:
            3,
          reviewScore:
            8.4,
          reviewCount:
            20000,
          ourprice:
            250,
          baseprice:
            250,
          currency:
            "EUR",
        },
        {
          sourceProvider:
            "liteapi",
        }
      );

    assert.equal(
      liteApiHotel.reviewCount,
      20000
    );

    assert.equal(
      liteApiHotel.reviewCountRelation,
      "at-least"
    );

    const unknownProviderHotel =
      mapHotel(
        {
          id:
            "other-1",
          name:
            "Other Hotel",
          providerName:
            "Other Provider",
          reviewCount:
            500,
          ourprice:
            100,
        },
        {
          sourceProvider:
            "other",
        }
      );

    assert.equal(
      unknownProviderHotel
        .reviewCountRelation,
      "unknown"
    );
  }
);

test(
  "Live LiteAPI rate mapping exposes the lower-bound relation on search hotels",
  () => {
    const hotel =
      mapLiteApiRecordToHotel(
        {
          hotelId:
            "lp59e41",
          name:
            "Plus Florence Hotel & Hostel",
          reviewScore:
            8.4,
          reviewCount:
            20000,
          stars:
            3,
          roomTypes: [
            {
              offerId:
                "offer-1",
              price:
                250,
              currency:
                "EUR",
              roomName:
                "Double room",
            },
          ],
        },
        "EUR",
        new Map(),
        {
          latitude:
            43.7696,
          longitude:
            11.2558,
        }
      );

    assert.ok(hotel);

    assert.equal(
      hotel.reviewCount,
      20000
    );

    assert.equal(
      hotel.reviewCountRelation,
      "at-least"
    );
  }
);

test(
  "LiteAPI details mapping marks the 20,000 response as at least",
  () => {
    const details =
      mapLiteApiHotelDetailsResponse(
        {
          data: {
            id:
              "lp59e41",
            name:
              "Plus Florence Hotel & Hostel",
            reviewScore:
              8.4,
            reviewCount:
              20000,
          },
        },
        "lp59e41"
      );

    assert.ok(details);

    assert.equal(
      details.reviewCount,
      20000
    );

    assert.equal(
      details.reviewCountRelation,
      "at-least"
    );
  }
);

test(
  "Merge and public presentation keep the conservative review relation",
  () => {
    const first = {
      ...createHotel({
        id:
          "merge-hotel",
        totalCost:
          300,
        reviewScore:
          8.4,
        reviewCount:
          20000,
        reviewCountRelation:
          "equal",
        distance:
          1,
      }),
      sourceProvider:
        "other",
      sourceHotelId:
        "merge-hotel",
      reviewText:
        "",
    };

    const second = {
      ...first,
      sourceProvider:
        "liteapi",
      reviewCountRelation:
        "at-least",
      reviewText:
        "Very good",
    };

    const merged =
      mergeHotelRecords(
        first,
        second
      );

    assert.equal(
      merged.reviewCountRelation,
      "at-least"
    );

    const publicHotel =
      createPublicHotel(
        merged
      );

    assert.ok(publicHotel);

    assert.equal(
      publicHotel.reviewCountRelation,
      "at-least"
    );

    const legacyPublicHotel =
      createPublicHotel({
        ...second,
        reviewCountRelation:
          undefined,
      });

    assert.equal(
      legacyPublicHotel
        ?.reviewCountRelation,
      "at-least"
    );
  }
);

test(
  "User-facing review count copy distinguishes exact, lower-bound, estimated and unknown values",
  () => {
    assert.equal(
      formatReviewCountLabel(
        20000,
        "at-least"
      ),
      "20,000+ reviews"
    );

    assert.equal(
      formatReviewCountEvidencePhrase(
        20000,
        "at-least"
      ),
      " across at least 20,000 reviews"
    );

    assert.equal(
      formatReviewCountLabel(
        1250,
        "estimated"
      ),
      "About 1,250 reviews"
    );

    assert.equal(
      formatReviewCountLabel(
        800,
        "unknown"
      ),
      "800 reported reviews"
    );

    assert.equal(
      formatReviewCountLabel(
        1,
        "equal"
      ),
      "1 review"
    );
  }
);

test(
  "Evidence Model records lower-bound semantics without changing the numeric count",
  () => {
    const hotel =
      createHotel({
        id:
          "evidence-hotel",
        totalCost:
          400,
        reviewScore:
          8.8,
        reviewCount:
          20000,
        reviewCountRelation:
          "at-least",
        distance:
          1,
      });

    const evidence =
      buildHotelEvidenceModelV2({
        hotel,
        accommodation: {
          category:
            "hotel",
          unitType:
            "hotel-room",
          originalCategory:
            "hotel",
          confidence:
            1,
          evidenceIds: [],
        },
      });

    const reviewCountFact =
      evidence.facts.find(
        (fact) =>
          fact.code ===
          "review.count"
      );

    assert.ok(reviewCountFact);

    assert.equal(
      reviewCountFact.value,
      20000
    );

    assert.equal(
      reviewCountFact.unit,
      "reviews-minimum"
    );

    assert.equal(
      reviewCountFact.sourceField,
      "reviewCount|reviewCountRelation"
    );

    assert.equal(
      reviewCountFact.confidence,
      0.95
    );
  }
);

test(
  "Lower-bound review provenance changes copy but not SmartScore, ranking or recommendation roles",
  () => {
    const exactView =
      createFrontendView(
        "equal"
      );

    const lowerBoundView =
      createFrontendView(
        "at-least"
      );

    assert.deepEqual(
      lowerBoundView
        .rankedHotels
        .map(
          (evaluation) =>
            evaluation.hotel.id
        ),
      exactView
        .rankedHotels
        .map(
          (evaluation) =>
            evaluation.hotel.id
        )
    );

    const exactTarget =
      exactView
        .rankedHotels
        .find(
          (evaluation) =>
            evaluation.hotel.id ===
            "target"
        );

    const lowerBoundTarget =
      lowerBoundView
        .rankedHotels
        .find(
          (evaluation) =>
            evaluation.hotel.id ===
            "target"
        );

    assert.ok(exactTarget);
    assert.ok(lowerBoundTarget);

    assert.equal(
      lowerBoundTarget.smartScore,
      exactTarget.smartScore
    );

    assert.equal(
      lowerBoundTarget
        .sourceEvaluation
        .recommendation
        .role,
      exactTarget
        .sourceEvaluation
        .recommendation
        .role
    );

    assert.ok(
      lowerBoundTarget.strengths.some(
        (strength) =>
          strength.includes(
            "at least 20,000 reviews"
          )
      )
    );

    assert.ok(
      exactTarget.strengths.some(
        (strength) =>
          strength.includes(
            "across 20,000 reviews"
          )
      )
    );
  }
);
