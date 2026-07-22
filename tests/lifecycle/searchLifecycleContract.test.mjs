import assert from "node:assert/strict";
import test from "node:test";

import searchLifecycleModule from "../../server/utils/searchLifecycle.js";
import publicSearchPresenterModule from "../../server/presenters/publicSearchPresenter.js";

const {
  deriveSearchLifecycle,
  SEARCH_LIFECYCLE_OUTCOMES,
  SEARCH_PUBLIC_CODES,
} = searchLifecycleModule;

const {
  createPublicSearchPayload,
  createPublicSearchSession,
  createPublicSearchStatus,
} = publicSearchPresenterModule;

function createHotel(id = "hotel-1") {
  return {
    id,
    provider: "InternalProvider",
    sourceProvider: "internal-provider",
    sourceHotelId: id,
    name: `Hotel ${id}`,
    price: 100,
    currency: "EUR",
    offers: [],
  };
}

test("completed searches with hotels expose the results lifecycle", () => {
  const lifecycle = deriveSearchLifecycle({
    success: true,
    status: "Completed",
    hotels: [createHotel()],
  });

  assert.equal(
    lifecycle.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.RESULTS
  );

  assert.equal(
    lifecycle.publicCode,
    SEARCH_PUBLIC_CODES.RESULTS_READY
  );

  assert.equal(lifecycle.retryable, false);
});

test("completed zero-result searches are commercial no-results, not provider errors", () => {
  const lifecycle = deriveSearchLifecycle({
    success: true,
    status: "Completed",
    code: "NO_RESULTS",
    hotels: [],
  });

  assert.equal(
    lifecycle.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.NO_RESULTS
  );

  assert.equal(
    lifecycle.publicCode,
    SEARCH_PUBLIC_CODES.NO_RESULTS
  );
});

test("failed continuation with accumulated hotels becomes partial results", () => {
  const lifecycle = deriveSearchLifecycle({
    success: false,
    status: "Failed",
    hotels: [createHotel()],
    lastError: "provider stack trace must stay internal",
  });

  assert.equal(
    lifecycle.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.PARTIAL_RESULTS
  );

  assert.equal(
    lifecycle.publicCode,
    SEARCH_PUBLIC_CODES.PARTIAL_RESULTS
  );

  assert.equal(lifecycle.retryable, true);
});

test("provider timeout and rate limit are stable provider-agnostic outcomes", () => {
  const timeout = deriveSearchLifecycle({
    success: false,
    status: "Failed",
    code: "NO_PROVIDER_RETURNED_RESULTS",
    attempts: [
      {
        providerId: "secret-provider",
        outcome: "timeout",
        message: "raw timeout",
      },
    ],
  });

  assert.equal(
    timeout.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.TIMEOUT
  );

  assert.equal(
    timeout.publicCode,
    SEARCH_PUBLIC_CODES.TIMEOUT
  );

  const rateLimited = deriveSearchLifecycle({
    success: false,
    status: "Failed",
    attempts: [
      {
        providerId: "secret-provider",
        status: 429,
        retryAfterMs: 42000,
      },
    ],
  });

  assert.equal(
    rateLimited.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.RATE_LIMITED
  );

  assert.equal(
    rateLimited.retryAfterMs,
    42000
  );
});

test("public initial-search payload redacts provider attempts and raw errors", () => {
  const publicPayload = createPublicSearchPayload({
    success: false,
    status: "Failed",
    code: "NO_PROVIDER_RETURNED_RESULTS",
    message: "Provider X secret failure detail",
    providerId: "provider-x",
    providerContext: {
      token: "secret",
    },
    attempts: [
      {
        providerId: "provider-x",
        outcome: "unavailable",
        message: "internal provider message",
      },
    ],
    hotels: [],
  });

  assert.equal(
    publicPayload.code,
    SEARCH_PUBLIC_CODES.PROVIDER_UNAVAILABLE
  );

  assert.equal(
    publicPayload.message,
    "Accommodation search is temporarily unavailable. Please try again shortly."
  );

  assert.equal("attempts" in publicPayload, false);
  assert.equal("providerId" in publicPayload, false);
  assert.equal("providerContext" in publicPayload, false);
  assert.equal("continuation" in publicPayload, false);

  assert.equal(
    JSON.stringify(publicPayload).includes("provider-x"),
    false
  );

  assert.equal(
    JSON.stringify(publicPayload).includes("secret"),
    false
  );
});

test("public session and status never expose raw lastError", () => {
  const source = {
    searchId: "search-1",
    success: true,
    status: "Failed",
    searchIncomplete: false,
    isContinuing: false,
    currency: "EUR",
    hotels: [],
    lastError: "LiteAPI raw error body and stack trace",
    providerId: "liteapi",
    providerContext: {
      token: "secret-token",
    },
    attempts: [
      {
        providerId: "liteapi",
        outcome: "error",
      },
    ],
    createdAt: 100,
    updatedAt: 200,
  };

  const session = createPublicSearchSession(source);
  const status = createPublicSearchStatus(source);

  assert.equal(
    session.lastError,
    "We could not retrieve reliable results for this search. Please try again."
  );

  assert.equal(
    status.lastError,
    "We could not retrieve reliable results for this search. Please try again."
  );

  for (const value of [session, status]) {
    const serialized = JSON.stringify(value);

    assert.equal(
      serialized.includes("LiteAPI"),
      false
    );

    assert.equal(
      serialized.includes("liteapi"),
      false
    );

    assert.equal(
      serialized.includes("secret-token"),
      false
    );
  }
});


test("public status preserves totalHotels without serializing hotel payloads", () => {
  const status = createPublicSearchStatus({
    success: true,
    searchId: "search-status-1",
    status: "Completed",
    totalHotels: 12,
    searchIncomplete: false,
  });

  assert.equal(status.totalHotels, 12);
  assert.equal(
    status.lifecycle.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.RESULTS
  );
  assert.equal("hotels" in status, false);
});

test("session expiry and missing-session failures remain distinct", () => {
  const expired = deriveSearchLifecycle({
    success: false,
    code: "SEARCH_SESSION_EXPIRED",
    httpStatus: 410,
  });

  const missing = deriveSearchLifecycle({
    success: false,
    code: "SEARCH_SESSION_NOT_FOUND",
    httpStatus: 404,
  });

  assert.equal(
    expired.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.SESSION_EXPIRED
  );

  assert.equal(
    missing.outcome,
    SEARCH_LIFECYCLE_OUTCOMES.SESSION_MISSING
  );

  assert.notEqual(
    expired.publicCode,
    missing.publicCode
  );
});
