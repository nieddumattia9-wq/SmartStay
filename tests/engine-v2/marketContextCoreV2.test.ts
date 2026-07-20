import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMarketContextV2,
} from "../../src/engine-v2/market-context/marketContextEngine";

import type {
  SmartStayMarketContextCandidateV2,
  SmartStayMarketContextObservationV2,
} from "../../src/engine-v2/market-context/marketContextModel";

import {
  SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_V2,
} from "../../src/engine-v2/market-context/localMarketContextSeedV2";

function candidate(
  hotelId: string,
  totalCost: number,
  category = "hotel",
  stars = 4
): SmartStayMarketContextCandidateV2 {
  return {
    hotelId,
    eligibleForPrimaryRanking: true,
    totalCost,
    currency: "EUR",
    accommodationCategory: category,
    stars,
  };
}

function observation(
  id: string,
  overrides: Partial<SmartStayMarketContextObservationV2> = {}
): SmartStayMarketContextObservationV2 {
  return {
    id,
    destinationKey: "florence-italy",
    currency: "EUR",
    stayMonth: 5,
    segmentKey: "overall",
    distribution: {
      sampleSize: 40,
      minimum: 120,
      firstQuartile: 180,
      median: 260,
      thirdQuartile: 420,
      ninetiethPercentile: 720,
      maximum: 1100,
    },
    seasonalIndex: 1.35,
    source: "local-memory",
    confidence: 0.82,
    observedAt: "2026-04-01T00:00:00.000Z",
    leadTimeDays: 44,
    ...overrides,
  };
}

const CANDIDATES = [
  candidate("one", 200, "hotel", 3),
  candidate("two", 400, "hotel", 4),
  candidate("three", 600, "hotel", 5),
  candidate("four", 1000, "resort", 5),
];

test(
  "Local Market Context seed starts empty and never invents production prices",
  () => {
    assert.deepEqual(
      SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_V2.records,
      []
    );
  }
);

test(
  "Current-search Market Context normalizes prices per room-night",
  () => {
    const result =
      evaluateMarketContextV2({
        candidates:
          CANDIDATES,

        totalBudget:
          1500,

        nights:
          2,

        rooms:
          1,

        destinationKey:
          "Firenze, Italia",

        currency:
          "EUR",

        checkIn:
          "2026-05-15",

        checkOut:
          "2026-05-17",

        capturedAt:
          "2026-04-01T00:00:00.000Z",

        mode:
          "current-search",
      });

    assert.equal(
      result.source,
      "current-search"
    );

    assert.equal(
      result.destinationKey,
      "firenze-italia"
    );

    assert.equal(
      result.budgetPerRoomNight,
      750
    );

    assert.equal(
      result.distribution.minimum,
      100
    );

    assert.equal(
      result.distribution.median,
      250
    );

    assert.equal(
      result.distribution.maximum,
      500
    );

    assert.equal(
      result.generatedObservations[0]
        ?.leadTimeDays,
      44
    );
  }
);

test(
  "Current-search Market Context creates category and star-band segments",
  () => {
    const result =
      evaluateMarketContextV2({
        candidates: [
          candidate(
            "hotel-one",
            200,
            "hotel",
            5
          ),

          candidate(
            "hotel-two",
            300,
            "hotel",
            5
          ),

          candidate(
            "hotel-three",
            400,
            "hotel",
            5
          ),

          candidate(
            "resort-one",
            600,
            "resort",
            4
          ),
        ],

        totalBudget:
          1500,

        nights:
          1,

        rooms:
          1,

        destinationKey:
          "Florence",

        currency:
          "EUR",

        checkIn:
          "2026-05-15",

        mode:
          "current-search",
      });

    const hotelSegment =
      result.segments.find(
        (
          segment
        ) =>
          segment.key ===
          "category:hotel"
      );

    const fiveStarSegment =
      result.segments.find(
        (
          segment
        ) =>
          segment.key ===
          "star-band:5"
      );

    assert.equal(
      hotelSegment
        ?.currentSearchDistribution
        .sampleSize,
      3
    );

    assert.equal(
      hotelSegment
        ?.currentSearchDistribution
        .median,
      300
    );

    assert.equal(
      fiveStarSegment
        ?.currentSearchDistribution
        .sampleSize,
      3
    );
  }
);

test(
  "Local-only Market Context uses matching destination and month observations",
  () => {
    const result =
      evaluateMarketContextV2({
        candidates:
          [],

        totalBudget:
          1500,

        nights:
          1,

        rooms:
          1,

        destinationKey:
          "Florence Italy",

        currency:
          "EUR",

        checkIn:
          "2026-05-15",

        mode:
          "local-only",

        observations: [
          observation(
            "florence-may"
          ),
        ],
      });

    assert.equal(
      result.source,
      "local-memory"
    );

    assert.equal(
      result.distribution.median,
      260
    );

    assert.equal(
      result.seasonalIndex,
      1.35
    );

    assert.equal(
      result.matchingObservationCount,
      1
    );
  }
);

test(
  "Hybrid Market Context combines current search and local memory without paid APIs",
  () => {
    const result =
      evaluateMarketContextV2({
        candidates:
          CANDIDATES,

        totalBudget:
          1500,

        nights:
          1,

        rooms:
          1,

        destinationKey:
          "Florence Italy",

        currency:
          "EUR",

        checkIn:
          "2026-05-15",

        mode:
          "hybrid",

        observations: [
          observation(
            "florence-memory"
          ),
        ],
      });

    assert.equal(
      result.source,
      "hybrid"
    );

    assert.equal(
      result.currentSearchSampleSize,
      4
    );

    assert.equal(
      result.matchingObservationCount,
      1
    );

    assert.equal(
      result.seasonalIndex,
      1.35
    );
  }
);

test(
  "Market Context ignores another destination or season and remains deterministic",
  () => {
    const sharedInput = {
      totalBudget:
        1500,

      nights:
        1,

      rooms:
        1,

      destinationKey:
        "Florence Italy",

      currency:
        "EUR",

      checkIn:
        "2026-05-15",

      mode:
        "hybrid" as const,

      observations: [
        observation(
          "new-york",
          {
            destinationKey:
              "new-york-usa",
          }
        ),

        observation(
          "florence-december",
          {
            stayMonth:
              12,
          }
        ),
      ],
    };

    const forward =
      evaluateMarketContextV2({
        ...sharedInput,

        candidates:
          CANDIDATES,
      });

    const reversed =
      evaluateMarketContextV2({
        ...sharedInput,

        candidates:
          [
            ...CANDIDATES,
          ].reverse(),
      });

    assert.equal(
      forward.source,
      "current-search"
    );

    assert.equal(
      forward.matchingObservationCount,
      0
    );

    assert.deepEqual(
      reversed,
      forward
    );
  }
);

test(
  "Market Context off mode does not leak current or local distributions",
  () => {
    const result =
      evaluateMarketContextV2({
        candidates:
          CANDIDATES,

        totalBudget:
          1500,

        nights:
          1,

        rooms:
          1,

        destinationKey:
          "Florence Italy",

        currency:
          "EUR",

        checkIn:
          "2026-05-15",

        mode:
          "off",

        observations: [
          observation(
            "florence-memory"
          ),
        ],
      });

    assert.equal(
      result.status,
      "unavailable"
    );

    assert.equal(
      result.source,
      "unavailable"
    );

    assert.equal(
      result.distribution.sampleSize,
      0
    );
  }
);
