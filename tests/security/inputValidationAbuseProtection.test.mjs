import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const root =
  process.cwd();

const serverRequire =
  createRequire(
    path.join(
      root,
      "server",
      "server.js"
    )
  );

const express =
  serverRequire(
    "express"
  );

const {
  createApp,
} = serverRequire(
  path.join(
    root,
    "server",
    "app.js"
  )
);

const {
  createRuntimeSecurityConfig,
} = serverRequire(
  path.join(
    root,
    "server",
    "config",
    "runtimeSecurityConfig.js"
  )
);

const {
  createSecurityLogger,
} = serverRequire(
  path.join(
    root,
    "server",
    "observability",
    "securityLogger.js"
  )
);

const {
  validateBookingHandoffRequest,
  validateBookingOfferRecheckRequest,
  validateHotelSearchRequest,
  validateSearchReadRequest,
} = serverRequire(
  path.join(
    root,
    "server",
    "validation",
    "requestValidation.js"
  )
);

function createJsonRequest(
  body
) {
  return {
    body,
    is:
      (mediaType) =>
        mediaType ===
        "application/json",
  };
}

function createTestConfig(
  overrides =
    {}
) {
  return createRuntimeSecurityConfig({
    environment:
      {},
    overrides: {
      nodeEnv:
        "test",
      allowedOrigins: [
        "http://allowed.example",
      ],
      rateLimitWindowMs:
        60_000,
      rateLimitMaxRequests:
        1000,
      ...overrides,
    },
  });
}

async function startServer({
  router,
  config =
    createTestConfig(),
} = {}) {
  const logger =
    createSecurityLogger({
      environment:
        {},
      write:
        () => {},
    });

  const {
    app,
  } = createApp({
    config,
    logger,
    searchRoutes:
      router,
  });

  const server =
    http.createServer(
      app
    );

  await new Promise(
    (
      resolve,
      reject
    ) => {
      server.once(
        "error",
        reject
      );

      server.listen(
        0,
        "127.0.0.1",
        resolve
      );
    }
  );

  const address =
    server.address();

  assert.ok(
    address &&
    typeof address ===
      "object"
  );

  return {
    origin:
      `http://127.0.0.1:${address.port}`,

    async close() {
      await new Promise(
        (resolve) =>
          server.close(
            resolve
          )
      );
    },
  };
}

function installMock(
  modulePath,
  exports
) {
  const previous =
    serverRequire.cache[
      modulePath
    ];

  serverRequire.cache[
    modulePath
  ] = {
    id:
      modulePath,
    filename:
      modulePath,
    loaded:
      true,
    exports,
  };

  return () => {
    if (previous) {
      serverRequire.cache[
        modulePath
      ] =
        previous;
    }
    else {
      delete serverRequire.cache[
        modulePath
      ];
    }
  };
}

function createValidSearchPayload() {
  return {
    destinationId:
      "barcelona-city",
    destinationType:
      "city",
    destinationName:
      "Barcelona, Spain",
    cityName:
      "Barcelona",
    countryCode:
      "ES",
    lat:
      41.3825802,
    long:
      2.177073,
    radiusMeters:
      5000,
    checkIn:
      "2026-09-01",
    checkOut:
      "2026-09-04",
    currency:
      "EUR",
    rooms: [
      {
        adults:
          2,
        children:
          1,
        childAges: [
          8,
        ],
      },
    ],
  };
}

test(
  "canonical validation accepts the frontend search contract and rejects impossible stays",
  () => {
    const payload =
      createValidSearchPayload();

    const validated =
      validateHotelSearchRequest(
        createJsonRequest(
          payload
        )
      );

    assert.equal(
      validated,
      payload
    );

    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest({
            ...createValidSearchPayload(),
            lat:
              120,
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_REQUEST"
        );

        assert.equal(
          error.field,
          "body.lat"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest({
            ...createValidSearchPayload(),
            checkOut:
              "2026-08-31",
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_SEARCH_REQUEST"
        );

        assert.equal(
          error.field,
          "body.checkOut"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest({
            ...createValidSearchPayload(),
            rooms: [
              {
                adults:
                  2,
                children:
                  2,
                childAges: [
                  8,
                ],
              },
            ],
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_SEARCH_REQUEST"
        );

        assert.equal(
          error.field,
          "body.rooms[0].children"
        );

        return true;
      }
    );
  }
);

test(
  "SmartStay treats ages 0 through 12 as children and requires ages 13 or older to be adults",
  () => {
    const ageTwelvePayload =
      createValidSearchPayload();

    ageTwelvePayload
      .rooms[0]
      .childAges = [
        12,
      ];

    assert.equal(
      validateHotelSearchRequest(
        createJsonRequest(
          ageTwelvePayload
        )
      ),
      ageTwelvePayload
    );

    const ageThirteenPayload =
      createValidSearchPayload();

    ageThirteenPayload
      .rooms[0]
      .childAges = [
        13,
      ];

    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest(
            ageThirteenPayload
          )
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_SEARCH_REQUEST"
        );

        assert.equal(
          error.field,
          "body.rooms[0].childAges[0]"
        );

        assert.match(
          error.message,
          /13 or older must be counted as adults/
        );

        return true;
      }
    );
  }
);

test(
  "public search input rejects private fields, reserved keys and excessive occupancy",
  () => {
    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest({
            ...createValidSearchPayload(),
            providerContext: {
              token:
                "private",
            },
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_REQUEST"
        );

        assert.equal(
          error.field,
          "body.providerContext"
        );

        return true;
      }
    );

    const reservedPayload =
      JSON.parse(
        JSON.stringify(
          createValidSearchPayload()
        )
      );

    Object.defineProperty(
      reservedPayload,
      "__proto__",
      {
        configurable:
          true,
        enumerable:
          true,
        value: {
          polluted:
            true,
        },
      }
    );

    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest(
            reservedPayload
          )
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_REQUEST"
        );

        assert.equal(
          error.field,
          "body.__proto__"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        validateHotelSearchRequest(
          createJsonRequest({
            ...createValidSearchPayload(),
            rooms: [
              {
                adults:
                  8,
                childAges:
                  [],
              },
              {
                adults:
                  8,
                childAges:
                  [],
              },
              {
                adults:
                  8,
                childAges:
                  [],
              },
              {
                adults:
                  8,
                childAges: [
                  3,
                ],
              },
            ],
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_SEARCH_REQUEST"
        );

        assert.equal(
          error.field,
          "body.rooms"
        );

        return true;
      }
    );
  }
);

test(
  "booking and query validation reject malformed public identities",
  () => {
    assert.throws(
      () =>
        validateBookingOfferRecheckRequest(
          createJsonRequest({
            searchId:
              "search-1",
            hotelId:
              "hotel-1",
            offerId:
              "offer-1",
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "OFFER_ID_INVALID"
        );

        assert.equal(
          error.field,
          "offerId"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        validateBookingHandoffRequest(
          createJsonRequest({
            verificationId:
              `verify-${"a".repeat(36)}`,
            acceptChanges:
              "true",
          })
        ),
      (error) => {
        assert.equal(
          error.code,
          "INVALID_REQUEST"
        );

        assert.equal(
          error.field,
          "body.acceptChanges"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        validateSearchReadRequest({
          query: {
            searchId: [
              "search-1",
              "search-2",
            ],
          },
        }),
      (error) => {
        assert.equal(
          error.code,
          "SEARCH_ID_INVALID"
        );

        return true;
      }
    );
  }
);

test(
  "invalid hotel-search input is rejected before the provider service is called",
  async () => {
    const routePath =
      serverRequire.resolve(
        path.join(
          root,
          "server",
          "routes",
          "search.js"
        )
      );

    const stayServicePath =
      serverRequire.resolve(
        path.join(
          root,
          "server",
          "services",
          "stayService.js"
        )
      );

    const searchSessionPath =
      serverRequire.resolve(
        path.join(
          root,
          "server",
          "storage",
          "searchSession.js"
        )
      );

    const idempotencyPath =
      serverRequire.resolve(
        path.join(
          root,
          "server",
          "storage",
          "searchIdempotency.js"
        )
      );

    let providerCalls =
      0;

    const restoreStayService =
      installMock(
        stayServicePath,
        {
          searchDestinations:
            async () => [],
          searchHotels:
            async () => {
              providerCalls +=
                1;

              return {
                success:
                  true,
                searchId:
                  "search-validation-1",
                status:
                  "Completed",
                searchIncomplete:
                  false,
                totalHotels:
                  0,
                hotels:
                  [],
              };
            },
          continueHotelSearch:
            async () => ({}),
          getHotelDetails:
            async () => ({}),
          getSearchStatus:
            async () => ({}),
        }
      );

    const restoreSearchSession =
      installMock(
        searchSessionPath,
        {
          requireSearchSession:
            () => ({}),
        }
      );

    const previousRoute =
      serverRequire.cache[
        routePath
      ];

    delete serverRequire.cache[
      routePath
    ];

    let harness;

    try {
      serverRequire(
        idempotencyPath
      ).clearSearchIdempotencyRecords();

      const router =
        serverRequire(
          routePath
        );

      harness =
        await startServer({
          router,
        });

      const invalidPayload = {
        ...createValidSearchPayload(),
        checkOut:
          "2026-09-01",
      };

      const invalid =
        await fetch(
          `${harness.origin}/api/search-hotels`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "Idempotency-Key":
                "validation-test-search-0001",
            },
            body:
              JSON.stringify(
                invalidPayload
              ),
          }
        );

      assert.equal(
        invalid.status,
        400
      );

      const invalidBody =
        await invalid.json();

      assert.equal(
        invalidBody.code,
        "INVALID_SEARCH_REQUEST"
      );

      assert.equal(
        invalidBody.field,
        "body.checkOut"
      );

      assert.equal(
        providerCalls,
        0
      );

      const privateField =
        await fetch(
          `${harness.origin}/api/search-hotels`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "Idempotency-Key":
                "validation-test-search-0002",
            },
            body:
              JSON.stringify({
                ...createValidSearchPayload(),
                providerContext: {
                  token:
                    "private",
                },
              }),
          }
        );

      assert.equal(
        privateField.status,
        400
      );

      assert.equal(
        (
          await privateField.json()
        ).field,
        "body.providerContext"
      );

      assert.equal(
        providerCalls,
        0
      );

      const wrongMediaType =
        await fetch(
          `${harness.origin}/api/search-hotels`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "text/plain",
              "Idempotency-Key":
                "validation-test-search-0003",
            },
            body:
              JSON.stringify(
                createValidSearchPayload()
              ),
          }
        );

      assert.equal(
        wrongMediaType.status,
        415
      );

      assert.equal(
        (
          await wrongMediaType.json()
        ).code,
        "UNSUPPORTED_MEDIA_TYPE"
      );

      assert.equal(
        providerCalls,
        0
      );

      const valid =
        await fetch(
          `${harness.origin}/api/search-hotels`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              "Idempotency-Key":
                "validation-test-search-0004",
            },
            body:
              JSON.stringify(
                createValidSearchPayload()
              ),
          }
        );

      assert.equal(
        valid.status,
        200
      );

      assert.equal(
        providerCalls,
        1
      );
    }
    finally {
      await harness?.close();

      restoreStayService();
      restoreSearchSession();

      delete serverRequire.cache[
        routePath
      ];

      if (previousRoute) {
        serverRequire.cache[
          routePath
        ] =
          previousRoute;
      }

      serverRequire(
        idempotencyPath
      ).clearSearchIdempotencyRecords();
    }
  }
);

test(
  "expensive endpoints have independent canonical rate limits",
  async () => {
    const router =
      express.Router();

    router.post(
      "/search-hotels",
      (
        req,
        res
      ) => {
        res.json({
          success:
            true,
        });
      }
    );

    const config =
      createTestConfig({
        endpointRateLimits: {
          hotelSearch: {
            windowMs:
              60_000,
            maxRequests:
              1,
          },
        },
      });

    const harness =
      await startServer({
        router,
        config,
      });

    try {
      const first =
        await fetch(
          `${harness.origin}/api/search-hotels`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              "{}",
          }
        );

      const second =
        await fetch(
          `${harness.origin}/api/search-hotels`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              "{}",
          }
        );

      assert.equal(
        first.status,
        200
      );

      assert.equal(
        second.status,
        429
      );

      const payload =
        await second.json();

      assert.equal(
        payload.code,
        "RATE_LIMITED"
      );

      assert.equal(
        typeof payload.requestId,
        "string"
      );

      assert.equal(
        typeof payload.retryAfterMs,
        "number"
      );

      assert.ok(
        second.headers.get(
          "retry-after"
        )
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "oversized JSON receives a canonical 413 without reaching the route",
  async () => {
    let routeCalls =
      0;

    const router =
      express.Router();

    router.post(
      "/echo",
      (
        req,
        res
      ) => {
        routeCalls +=
          1;

        res.json({
          success:
            true,
        });
      }
    );

    const harness =
      await startServer({
        router,
        config:
          createTestConfig({
            jsonLimit:
              "1kb",
          }),
      });

    try {
      const response =
        await fetch(
          `${harness.origin}/api/echo`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                value:
                  "x".repeat(
                    2048
                  ),
              }),
          }
        );

      assert.equal(
        response.status,
        413
      );

      const payload =
        await response.json();

      assert.equal(
        payload.code,
        "PAYLOAD_TOO_LARGE"
      );

      assert.equal(
        typeof payload.requestId,
        "string"
      );

      assert.equal(
        routeCalls,
        0
      );
    }
    finally {
      await harness.close();
    }
  }
);
