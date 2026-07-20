import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  createStoredSearchMeta,
  normalizeStoredSearchMeta,
} from "../../src/utils/searchMeta";

import {
  evaluateComfortFlexibilityV2,
} from "../../src/engine-v2/comfort/comfortFlexibilityEngine";

import type {
  SmartStayReliabilityGateV2,
} from "../../src/engine-v2/model/smartStayEvaluationV2";

const reliabilityGate:
  SmartStayReliabilityGateV2 = {
    status:
      "strong-data",

    eligible:
      true,

    blockingReasonCodes:
      [],

    warningCodes:
      [],

    evidenceIds:
      [],
  };

const accommodation = {
  category:
    "hotel" as const,

  unitType:
    "hotel-room" as const,

  originalCategory:
    "Hotels",

  confidence:
    0.99,

  evidenceIds:
    [],
};

function createMeta(
  guestContext: {
    adults:
      unknown;

    children:
      unknown;

    rooms:
      unknown;
  }
) {
  return createStoredSearchMeta({
    destinationLabel:
      "Florence",

    destinationLatitude:
      43.7696,

    destinationLongitude:
      11.2558,

    smartPreference:
      "balanced",

    budgetInput:
      500,

    currency:
      "eur",

    checkIn:
      "2026-08-10",

    checkOut:
      "2026-08-13",

    maxDistanceKm:
      5,

    adults:
      guestContext.adults,

    children:
      guestContext.children,

    rooms:
      guestContext.rooms,
  });
}

test(
  "Search metadata preserves the exact guest composition",
  () => {
    const metadata =
      createMeta({
        adults:
          4,

        children:
          2,

        rooms:
          2,
      });

    assert.equal(
      metadata.adults,
      4
    );

    assert.equal(
      metadata.children,
      2
    );

    assert.equal(
      metadata.rooms,
      2
    );

    const restored =
      normalizeStoredSearchMeta(
        JSON.parse(
          JSON.stringify(
            metadata
          )
        )
      );

    assert.ok(
      restored
    );

    assert.deepEqual(
      {
        adults:
          restored.adults,

        children:
          restored.children,

        rooms:
          restored.rooms,
      },
      {
        adults:
          4,

        children:
          2,

        rooms:
          2,
      }
    );
  }
);

test(
  "Guest metadata keeps zero children and does not invent missing legacy values",
  () => {
    const coupleMetadata =
      createMeta({
        adults:
          2,

        children:
          0,

        rooms:
          1,
      });

    assert.equal(
      coupleMetadata.children,
      0
    );

    const legacyMetadata =
      normalizeStoredSearchMeta({
        destinationLabel:
          "Florence",

        smartPreference:
          "balanced",

        totalBudget:
          500,

        currency:
          "EUR",

        checkIn:
          "2026-08-10",

        checkOut:
          "2026-08-13",

        maxDistanceKm:
          5,
      });

    assert.ok(
      legacyMetadata
    );

    assert.equal(
      legacyMetadata.adults,
      null
    );

    assert.equal(
      legacyMetadata.children,
      null
    );

    assert.equal(
      legacyMetadata.rooms,
      null
    );
  }
);

test(
  "Impossible or malformed guest counts are not propagated",
  () => {
    const metadata =
      createMeta({
        adults:
          2,

        children:
          -1,

        rooms:
          3,
      });

    assert.equal(
      metadata.adults,
      2
    );

    assert.equal(
      metadata.children,
      null
    );

    assert.equal(
      metadata.rooms,
      null
    );
  }
);

test(
  "TripOptimizer stores guest counts and Results forwards them to Engine V2",
  () => {
    const tripOptimizerSource =
      readFileSync(
        "src/components/TripOptimizer/TripOptimizer.tsx",
        "utf8"
      );

    const resultsSource =
      readFileSync(
        "src/pages/Results/Results.tsx",
        "utf8"
      );

    assert.match(
      tripOptimizerSource,
      /adults:\s*guests\.adults/
    );

    assert.match(
      tripOptimizerSource,
      /children:\s*guests\.children/
    );

    assert.match(
      tripOptimizerSource,
      /rooms:\s*guests\.rooms/
    );

    assert.match(
      resultsSource,
      /adults:\s*searchMeta\s*\?\s*\.adults\s*\?\?\s*null/
    );

    assert.match(
      resultsSource,
      /children:\s*searchMeta\s*\?\s*\.children\s*\?\?\s*null/
    );

    assert.match(
      resultsSource,
      /rooms:\s*searchMeta\s*\?\s*\.rooms\s*\?\?\s*null/
    );

    assert.match(
      resultsSource,
      /searchMeta\s*\?\s*\.adults/
    );

    assert.match(
      resultsSource,
      /searchMeta\s*\?\s*\.children/
    );

    assert.match(
      resultsSource,
      /searchMeta\s*\?\s*\.rooms/
    );
  }
);

test(
  "Guest composition reaches the contextual comfort profile",
  () => {
    const couple =
      evaluateComfortFlexibilityV2({
        targetHotelId:
          "guest-context-couple",

        accommodation,

        evidence:
          [],

        reliabilityGate,

        stayContext: {
          nights:
            3,

          adults:
            2,

          children:
            0,

          rooms:
            1,
        },
      });

    const family =
      evaluateComfortFlexibilityV2({
        targetHotelId:
          "guest-context-family",

        accommodation,

        evidence:
          [],

        reliabilityGate,

        stayContext: {
          nights:
            3,

          adults:
            2,

          children:
            2,

          rooms:
            2,
        },
      });

    const group =
      evaluateComfortFlexibilityV2({
        targetHotelId:
          "guest-context-group",

        accommodation,

        evidence:
          [],

        reliabilityGate,

        stayContext: {
          nights:
            3,

          adults:
            4,

          children:
            0,

          rooms:
            2,
        },
      });

    assert.equal(
      couple.tripProfile,
      "mixed"
    );

    assert.equal(
      family.tripProfile,
      "family"
    );

    assert.equal(
      group.tripProfile,
      "group"
    );
  }
);
