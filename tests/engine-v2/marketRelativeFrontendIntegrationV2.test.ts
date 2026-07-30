import assert from "node:assert/strict";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  buildSmartStayFrontendViewV2,
} from "../../src/engine-v2/frontend/smartStayFrontendAdapterV2";

function createOffer(
  index: number,
  totalCost: number
): HotelOffer {
  return {
    id:
      `offer-${index}`,
    provider:
      "Test Provider",
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
  index: number,
  totalCost: number,
  city: string
): Hotel {
  const stars =
    3 +
    (
      index %
      3
    );

  return {
    id:
      `market-hotel-${city}-${index}`,
    dataSources: [
      "Test Provider",
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
        index,
        totalCost
      ),
    ],
    name:
      `Market Hotel ${index}`,
    provider:
      "Test Provider",
    stars,
    reviewScore:
      8 +
      index *
      0.08,
    reviewCount:
      200 +
      index *
      50,
    reviewText:
      "Very good",
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
      24,
    excludedTaxes:
      0,
    unknownTaxes:
      0,
    totalKnownCost:
      totalCost,
    distance:
      0.4 +
      index *
      0.12,
    image:
      `https://images.example/market-${index}.jpg`,
    address:
      `${index} Market Street`,
    city,
    country:
      "Test Country",
    latitude:
      43.77 +
      index *
      0.001,
    longitude:
      11.25 +
      index *
      0.001,
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

function createMarketHotels(
  costs:
    number[],
  city:
    string
) {
  return costs.map(
    (
      cost,
      index
    ) =>
      createHotel(
        index + 1,
        cost,
        city
      )
  );
}

function buildView(
  hotels:
    Hotel[],
  destinationKey:
    string,
  options: {
    marketRelativeAutomaticBalance:
      boolean;
    preferenceId?:
      "maximum-comfort" |
      "balanced";
    selectedIndex?:
      0 |
      2;
    preferenceSource?:
      "automatic" |
      "manual";
  }
) {
  return buildSmartStayFrontendViewV2({
    hotels,
    preferenceId:
      options.preferenceId ??
      "balanced",
    selectedIndex:
      options.selectedIndex ??
      2,
    preferenceSource:
      options.preferenceSource ??
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
        destinationKey,
    },
    nights:
      3,
    adults:
      2,
    children:
      0,
    rooms:
      1,
    destinationKey,
    currency:
      "EUR",
    checkIn:
      "2026-09-10",
    checkOut:
      "2026-09-13",
    bookingReferenceAt:
      "2026-08-01T00:00:00.000Z",
    marketContextMode:
      "hybrid",
    marketRelativeAutomaticBalance:
      options.marketRelativeAutomaticBalance,
    fallbackBalanceExplanation:
      "Existing automatic balance.",
    maximumVisibleResults:
      hotels.length,
  });
}

const LOWER_COST_HOTELS =
  createMarketHotels(
    [
      165,
      180,
      195,
      210,
      225,
      240,
      255,
      270,
      285,
      300,
    ],
    "Lower Cost Destination"
  );

const HIGHER_COST_HOTELS =
  createMarketHotels(
    [
      480,
      900,
      960,
      1020,
      1080,
      1140,
      1200,
      1260,
      1320,
      1380,
    ],
    "Higher Cost Destination"
  );

test(
  "Frontend Engine reranks the same budget toward comfort in a lower-cost destination",
  () => {
    const neutral =
      buildView(
        LOWER_COST_HOTELS,
        "Lower Cost Destination",
        {
          marketRelativeAutomaticBalance:
            false,
        }
      );

    const result =
      buildView(
        LOWER_COST_HOTELS,
        "Lower Cost Destination",
        {
          marketRelativeAutomaticBalance:
            true,
        }
      );

    assert.equal(
      neutral.marketContext
        .source,
      "current-search"
    );

    assert.equal(
      neutral.marketContext
        .currentSearchSampleSize,
      LOWER_COST_HOTELS.length
    );

    assert.equal(
      result.preferenceResolution
        ?.marketContextSource,
      "current-search"
    );

    assert.equal(
      result.preferenceResolution
        ?.marketSampleSize,
      LOWER_COST_HOTELS.length
    );

    assert.equal(
      result.preferenceResolution
        ?.effectivePreferenceId,
      "maximum-comfort"
    );

    assert.equal(
      result.preferenceResolution
        ?.source,
      "market-strong-data"
    );

    assert.deepEqual(
      result.marketContext.distribution,
      neutral.marketContext.distribution
    );

    assert.ok(
      result.bestChoiceGroup
    );

    assert.equal(
      result.bestChoiceGroup
        .preferenceId,
      "maximum-comfort"
    );
  }
);

test(
  "Frontend Engine reranks the same budget toward Maximum Savings in a higher-cost destination",
  () => {
    const neutral =
      buildView(
        HIGHER_COST_HOTELS,
        "Higher Cost Destination",
        {
          marketRelativeAutomaticBalance:
            false,
        }
      );

    const result =
      buildView(
        HIGHER_COST_HOTELS,
        "Higher Cost Destination",
        {
          marketRelativeAutomaticBalance:
            true,
        }
      );

    assert.equal(
      neutral.marketContext
        .source,
      "current-search"
    );

    assert.equal(
      neutral.marketContext
        .currentSearchSampleSize,
      HIGHER_COST_HOTELS.length
    );

    assert.equal(
      result.preferenceResolution
        ?.marketContextSource,
      "current-search"
    );

    assert.equal(
      result.preferenceResolution
        ?.marketSampleSize,
      HIGHER_COST_HOTELS.length
    );

    assert.equal(
      result.preferenceResolution
        ?.effectivePreferenceId,
      "maximum-savings"
    );

    assert.equal(
      result.preferenceResolution
        ?.marketIntentLevel,
      "constrained"
    );

    assert.deepEqual(
      result.marketContext.distribution,
      neutral.marketContext.distribution
    );

    assert.ok(
      result.bestChoiceGroup
    );

    assert.equal(
      result.bestChoiceGroup
        .preferenceId,
      "maximum-savings"
    );
  }
);

test(
  "Manual Maximum Comfort remains manual even in a constrained destination market",
  () => {
    const result =
      buildView(
        HIGHER_COST_HOTELS,
        "Higher Cost Destination",
        {
          marketRelativeAutomaticBalance:
            true,
          preferenceId:
            "maximum-comfort",
          selectedIndex:
            0,
          preferenceSource:
            "manual",
        }
      );

    assert.equal(
      result.preferenceResolution
        ?.effectivePreferenceId,
      "maximum-comfort"
    );

    assert.equal(
      result.preferenceResolution
        ?.source,
      "manual"
    );

    assert.ok(
      result.bestChoiceGroup
    );

    assert.equal(
      result.bestChoiceGroup
        .preferenceId,
      "maximum-comfort"
    );
  }
);

test(
  "Market-relative adaptation remains opt-in for existing adapter callers",
  () => {
    const result =
      buildView(
        HIGHER_COST_HOTELS,
        "Higher Cost Destination",
        {
          marketRelativeAutomaticBalance:
            false,
        }
      );

    assert.equal(
      result.preferenceResolution,
      undefined
    );

    assert.ok(
      result.bestChoiceGroup
    );

    assert.equal(
      result.bestChoiceGroup
        .preferenceId,
      "balanced"
    );
  }
);
