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

import {
  diagnoseSmartStayEmptyStateV2,
} from "../../src/engine-v2/frontend/constraintAwareEmptyStateV2";

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
      "Double room",
    bookable:
      true,
    redirectable:
      false,
  };
}

function createHotel(
  id:
    string,
  distance:
    number,
  totalCost:
    number,
  offerIndex:
    number
): Hotel {
  return {
    id,
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
        `offer-${offerIndex}`,
        totalCost
      ),
    ],
    name:
      `Hotel ${id}`,
    provider:
      "LiteAPI",
    accommodationCategory:
      "hotel",
    stars:
      4,
    reviewScore:
      9,
    reviewCount:
      1200,
    reviewCountRelation:
      "equal",
    reviewText:
      "Excellent",
    price:
      totalCost,
    basePrice:
      totalCost,
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
      totalCost,
    distance,
    image:
      `https://images.example/${id}.jpg`,
    address:
      `${id} SmartStay Street`,
    city:
      "Paris",
    country:
      "France",
    latitude:
      48.8588897 +
      (
        distance /
        111
      ),
    longitude:
      2.320041,
    amenities: [
      "WiFi",
      "Air conditioning",
      "Private bathroom",
      "Reception",
      "Elevator",
    ],
    facilities: [
      "Front desk",
      "Daily housekeeping",
    ],
  };
}

test(
  "Empty-state diagnosis stays absent when visible results exist",
  () => {
    assert.equal(
      diagnoseSmartStayEmptyStateV2({
        providerHotelCount:
          10,
        visibleHotelCount:
          2,
      }),
      null
    );
  }
);

test(
  "Provider no-results remains distinct from policy filtering",
  () => {
    const result =
      diagnoseSmartStayEmptyStateV2({
        providerHotelCount:
          0,
        visibleHotelCount:
          0,
      });

    assert.equal(
      result?.reason,
      "provider-no-results"
    );

    assert.deepEqual(
      result?.recoveryDistanceKmOptions,
      []
    );
  }
);

test(
  "A hard distance limit is diagnosed only when every provider stay exceeds it",
  () => {
    const result =
      diagnoseSmartStayEmptyStateV2({
        providerHotelCount:
          57,
        visibleHotelCount:
          0,
        distanceExceededCount:
          57,
        maximumDistanceKm:
          0.5,
        recoveryCandidateDistancesKm: [
          0.8,
          1.4,
          3.2,
        ],
      });

    assert.equal(
      result?.reason,
      "distance-constraint"
    );

    assert.deepEqual(
      result?.recoveryDistanceKmOptions,
      [
        1,
        2,
        null,
      ]
    );
  }
);

test(
  "Budget and reliability empty states preserve separate causes",
  () => {
    const budgetResult =
      diagnoseSmartStayEmptyStateV2({
        providerHotelCount:
          12,
        visibleHotelCount:
          0,
        budgetHiddenCount:
          12,
        totalBudget:
          400,
      });

    const reliabilityResult =
      diagnoseSmartStayEmptyStateV2({
        providerHotelCount:
          12,
        visibleHotelCount:
          0,
        reliabilityBlockedCount:
          12,
        budgetHiddenCount:
          12,
        totalBudget:
          400,
      });

    assert.equal(
      budgetResult?.reason,
      "budget-constraint"
    );

    assert.equal(
      reliabilityResult?.reason,
      "reliability-gate"
    );
  }
);

test(
  "Frontend adapter diagnoses distance filtering and reranks the same snapshot after consent",
  () => {
    const hotels = [
      createHotel(
        "near",
        0.8,
        600,
        1
      ),
      createHotel(
        "farther",
        1.4,
        550,
        2
      ),
    ];

    const baseInput = {
      hotels,
      preferenceId:
        "balanced" as const,
      selectedIndex:
        2,
      preferenceSource:
        "manual" as const,
      totalBudget:
        2000,
      selectedLocation: {
        latitude:
          48.8588897,
        longitude:
          2.320041,
        confidence:
          1,
        label:
          "Paris",
      },
      nights:
        3,
      adults:
        2,
      children:
        0,
      rooms:
        1,
      destinationKey:
        "Paris, France",
      currency:
        "EUR",
      checkIn:
        "2026-09-04",
      checkOut:
        "2026-09-07",
      marketContextMode:
        "current-search" as const,
      maximumVisibleResults:
        hotels.length,
    };

    const strictView =
      buildSmartStayFrontendViewV2({
        ...baseInput,
        maximumDistanceKm:
          0.5,
      });

    assert.equal(
      strictView.rankedHotels.length,
      0
    );

    assert.equal(
      strictView.emptyState?.reason,
      "distance-constraint"
    );

    assert.deepEqual(
      strictView
        .emptyState
        ?.recoveryDistanceKmOptions,
      [
        1,
        2,
        null,
      ]
    );

    const relaxedView =
      buildSmartStayFrontendViewV2({
        ...baseInput,
        maximumDistanceKm:
          1,
      });

    assert.deepEqual(
      relaxedView.rankedHotels.map(
        (evaluation) =>
          evaluation.hotel.id
      ),
      [
        "near",
      ]
    );

    assert.equal(
      relaxedView.emptyState,
      null
    );
  }
);

test(
  "Results recovery is explicit, local and does not issue a second provider search",
  () => {
    const resultsSource =
      readFileSync(
        "src/pages/Results/Results.tsx",
        "utf8"
      );

    assert.match(
      resultsSource,
      /data-reuses-current-results="true"/
    );

    assert.match(
      resultsSource,
      /No new provider search was sent\./
    );

    assert.match(
      resultsSource,
      /setDistanceOverrideKm\(/
    );

    assert.doesNotMatch(
      resultsSource,
      /handleDistanceRecovery[\s\S]{0,700}searchHotels\(/
    );
  }
);

test(
  "Budget diagnosis ignores stays already excluded by non-budget constraints",
  () => {
    const hotels = [
      createHotel(
        "over-budget-one",
        1,
        450,
        1
      ),
      createHotel(
        "over-budget-two",
        2,
        520,
        2
      ),
      createHotel(
        "cheap-but-too-far",
        8,
        80,
        3
      ),
    ];

    const view =
      buildSmartStayFrontendViewV2({
        hotels,
        preferenceId:
          "maximum-savings",
        selectedIndex:
          4,
        preferenceSource:
          "manual",
        totalBudget:
          100,
        maximumDistanceKm:
          5,
        selectedLocation: {
          latitude:
            48.8588897,
          longitude:
            2.320041,
          confidence:
            1,
          label:
            "Test destination",
        },
        nights:
          3,
        adults:
          4,
        children:
          0,
        rooms:
          2,
        destinationKey:
          "Barcelona, Spain",
        currency:
          "EUR",
        checkIn:
          "2026-09-04",
        checkOut:
          "2026-09-07",
        marketContextMode:
          "current-search",
        maximumVisibleResults:
          hotels.length,
      });

    assert.equal(
      view.rankedHotels.length,
      0
    );

    assert.equal(
      view.emptyState?.reason,
      "budget-constraint"
    );

    assert.equal(
      view
        .emptyState
        ?.budgetEligibleCandidateCount,
      2
    );

    assert.equal(
      view
        .emptyState
        ?.budgetBlockedCandidateCount,
      2
    );
  }
);

test(
  "Loading lifecycle replaces the transient route and redirects stale loading entries safely",
  () => {
    const loadingSource =
      readFileSync(
        "src/components/LoadingScreen/LoadingScreen.tsx",
        "utf8"
      );

    assert.match(
      loadingSource,
      /`\/results\?searchId=\$\{encodeURIComponent\(finalSearchId\)\}`[\s\S]{0,180}replace:\s*true/
    );

    assert.match(
      loadingSource,
      /isMissingSearchData[\s\S]{0,500}navigate\([\s\S]{0,120}"\/"[\s\S]{0,180}replace:\s*true/
    );

    assert.match(
      loadingSource,
      /isMissingSearchData[\s\S]{0,700}return;/
    );
  }
);
