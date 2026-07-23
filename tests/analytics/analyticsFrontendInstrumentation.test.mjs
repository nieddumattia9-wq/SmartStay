import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  test,
} from "node:test";
import {
  fileURLToPath,
} from "node:url";

const testDirectory =
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const repositoryRoot =
  path.resolve(
    testDirectory,
    "..",
    ".."
  );

function read(relativePath) {
  return fs.readFileSync(
    path.join(
      repositoryRoot,
      relativePath
    ),
    "utf8"
  );
}

const instrumentationFiles = [
  "src/App.tsx",
  "src/components/TripOptimizer/TripOptimizer.tsx",
  "src/components/LoadingScreen/LoadingScreen.tsx",
  "src/pages/Results/Results.tsx",
  "src/components/HotelCard/HotelCard.tsx",
  "src/components/HotelDetailsPanel/HotelDetailsPanel.tsx",
  "src/analytics/analyticsClient.ts",
];

const combinedInstrumentation =
  instrumentationFiles
    .map(read)
    .join("\n");

test(
  "frontend instrumentation exposes every canonical analytics event point",
  () => {
    for (
      const eventName of
      [
        "page_view",
        "search_started",
        "search_completed",
        "search_failed",
        "results_viewed",
        "recommendation_selected",
        "hotel_details_opened",
        "explanation_toggled",
        "search_preferences_changed",
        "search_retried",
        "booking_recheck_started",
        "booking_recheck_completed",
        "booking_handoff_prepared",
        "booking_handoff_opened",
        "journey_abandoned",
        "results_recovery_applied",
      ]
    ) {
      assert.equal(
        combinedInstrumentation.includes(
          `"${eventName}"`
        ),
        true,
        `${eventName} must be instrumented`
      );
    }
  }
);

test(
  "frontend analytics is disabled by default and uses only tab-scoped storage",
  () => {
    const runtimeConfig =
      read(
        "src/config/runtimeConfig.ts"
      );

    const client =
      read(
        "src/analytics/analyticsClient.ts"
      );

    assert.match(
      runtimeConfig,
      /VITE_ANALYTICS_ENABLED/
    );
    assert.match(
      client,
      /sessionStorage/
    );
    assert.doesNotMatch(
      client,
      /localStorage/
    );
    assert.doesNotMatch(
      client,
      /document\.cookie/
    );
    assert.match(
      client,
      /globalPrivacyControl/
    );
    assert.match(
      client,
      /doNotTrack/
    );
    assert.match(
      client,
      /credentials:\s*"omit"/
    );
    assert.match(
      client,
      /referrerPolicy:\s*"no-referrer"/
    );
    assert.match(
      client,
      /response\.status\s*>=\s*400/
    );
    assert.match(
      client,
      /response\.status\s*!==\s*429/
    );
  }
);

test(
  "analytics boundary does not reference raw travel, booking, provider or search identifiers",
  () => {
    const boundary = [
      read(
        "src/analytics/analyticsClient.ts"
      ),
      read(
        "src/analytics/analyticsBuckets.ts"
      ),
      read(
        "src/analytics/analyticsTypes.ts"
      ),
    ].join("\n");

    for (
      const forbidden of
      [
        "searchId",
        "requestId",
        "idempotencyKey",
        "hotelId",
        "offerId",
        "verificationId",
        "handoffId",
        "providerId",
        "providerContext",
        "destinationName",
        "checkIn",
        "checkOut",
        "childAges",
      ]
    ) {
      assert.equal(
        boundary.includes(
          forbidden
        ),
        false,
        `${forbidden} must not cross the analytics boundary`
      );
    }
  }
);

test(
  "server registers a dedicated first-party endpoint with parser and rate limit",
  () => {
    const app =
      read(
        "server/app.js"
      );

    const limiters =
      read(
        "server/middleware/endpointRateLimits.js"
      );

    assert.match(
      app,
      /\/api\/analytics\/events/
    );
    assert.match(
      app,
      /analyticsJsonLimit/
    );
    assert.match(
      limiters,
      /analytics-events/
    );

    const frontendApp =
      read(
        "src/App.tsx"
      );

    assert.match(
      frontendApp,
      /previousPageRef/
    );

    assert.match(
      frontendApp,
      /trackAnalyticsJourneyAbandonment/
    );
  }
);
