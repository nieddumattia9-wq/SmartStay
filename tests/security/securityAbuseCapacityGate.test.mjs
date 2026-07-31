import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(import.meta.url);

const root =
  process.cwd();

function requireFromRoot(
  relativePath
) {
  return require(
    path.join(
      root,
      relativePath
    )
  );
}

function createDeferred() {
  let resolve;

  const promise =
    new Promise(
      (resolvePromise) => {
        resolve =
          resolvePromise;
      }
    );

  return {
    promise,
    resolve,
  };
}

async function waitUntil(
  predicate,
  timeoutMs = 1_000
) {
  const startedAt =
    Date.now();

  while (
    Date.now() - startedAt <
      timeoutMs
  ) {
    if (predicate()) {
      return true;
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          5
        )
    );
  }

  return predicate();
}

test(
  "search-session capacity is finite and returns a canonical retryable 503",
  () => {
    const store =
      requireFromRoot(
        "server/storage/searchSession.js"
      );

    assert.ok(
      Number.isInteger(
        store.MAX_SEARCH_SESSIONS
      )
    );

    assert.ok(
      store.MAX_SEARCH_SESSIONS >
        0
    );

    assert.ok(
      store.MAX_SEARCH_SESSIONS <=
        1_000
    );

    const savedIds =
      [];

    try {
      for (
        let index = 0;
        index <
          store.MAX_SEARCH_SESSIONS;
        index += 1
      ) {
        savedIds.push(
          store.saveSearchSession({
            hotels:
              [],
          }).searchId
        );
      }

      assert.equal(
        store.getSearchSessionCount(),
        store.MAX_SEARCH_SESSIONS
      );

      assert.throws(
        () =>
          store.saveSearchSession({
            hotels:
              [],
          }),
        (error) =>
          error?.status === 503 &&
          error?.code ===
            "SEARCH_SESSION_CAPACITY_REACHED" &&
          error?.retryable === true &&
          Number(error?.retryAfterMs) >=
            0
      );
    }
    finally {
      for (const searchId of savedIds) {
        store.clearSearchSession(
          searchId
        );
      }
    }
  }
);

test(
  "idempotency responses remain within record and byte budgets",
  async () => {
    const store =
      requireFromRoot(
        "server/storage/searchIdempotency.js"
      );

    assert.ok(
      store.MAX_SEARCH_IDEMPOTENCY_RECORDS <=
        250
    );

    assert.ok(
      store.MAX_SEARCH_IDEMPOTENCY_BYTES <=
        64 * 1024 * 1024
    );

    store.clearSearchIdempotencyRecords();

    try {
      const probeCount =
        store.MAX_SEARCH_IDEMPOTENCY_RECORDS +
        12;

      for (
        let index = 0;
        index < probeCount;
        index += 1
      ) {
        await store
          .executeInitialSearchIdempotently({
            idempotencyKey:
              `security-capacity-${String(index).padStart(5, "0")}`,

            payload: {
              index,
            },

            execute:
              async () => ({
                success:
                  true,

                searchId:
                  `security-search-${index}`,

                hotels: [
                  {
                    id:
                      `hotel-${index}`,
                  },
                ],
              }),
          });
      }

      assert.equal(
        store.getSearchIdempotencyRecordCount(),
        store.MAX_SEARCH_IDEMPOTENCY_RECORDS
      );

      assert.ok(
        store.getSearchIdempotencyStoredResponseBytes() <=
          store.MAX_SEARCH_IDEMPOTENCY_BYTES
      );
    }
    finally {
      store.clearSearchIdempotencyRecords();
    }
  }
);

test(
  "provider operations apply bounded global backpressure before execution",
  async () => {
    const capacity =
      requireFromRoot(
        "server/providers/common/providerOperationTimeoutService.js"
      );

    assert.ok(
      capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS <=
        8
    );

    const blocker =
      createDeferred();

    const requested =
      capacity
        .MAX_PROVIDER_CONCURRENT_OPERATIONS +
      capacity
        .MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER +
      1;

    let started =
      0;

    let active =
      0;

    let peak =
      0;

    const operations =
      Array.from(
        {
          length:
            requested,
        },
        (_, index) => {
          const operationPromise =
            capacity
              .executeProviderOperationWithTimeout({
              providerId:
                "security-capacity-stub",

              methodName:
                "searchHotels",

              timeoutMs:
                4_000,

              operation:
                async () => {
                  started +=
                    1;

                  active +=
                    1;

                  peak =
                    Math.max(
                      peak,
                      active
                    );

                  try {
                    await blocker.promise;

                    return {
                      index,
                    };
                  }
                  finally {
                    active -=
                      1;
                  }
                },
              });

          operationPromise.catch(
            () => {}
          );

          return operationPromise;
        }
      );

    try {
      assert.equal(
        await waitUntil(
          () =>
            started >=
              capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS
        ),
        true
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            25
          )
      );

      assert.ok(
        peak <=
          capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS
      );

      const during =
        capacity
          .getProviderOperationCapacitySnapshot();

      assert.ok(
        during.active <=
          capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS
      );

      assert.ok(
        during.queued >
          0
      );
    }
    finally {
      blocker.resolve();
    }

    const settled =
      await Promise.allSettled(
        operations
      );

    const unexpectedRejections =
      settled.filter(
        (item) =>
          item.status ===
            "rejected" &&
          item.reason?.code !==
            "PROVIDER_CAPACITY_EXCEEDED"
      );

    assert.equal(
      unexpectedRejections.length,
      0
    );

    const capacityRejections =
      settled.filter(
        (item) =>
          item.status ===
            "rejected" &&
          item.reason?.code ===
            "PROVIDER_CAPACITY_EXCEEDED"
      );

    assert.equal(
      capacityRejections.length,
      1
    );

    assert.equal(
      capacityRejections[0]
        .reason.status,
      503
    );

    assert.equal(
      capacityRejections[0]
        .reason.retryable,
      true
    );

    assert.equal(
      peak <=
        capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS,
      true
    );

    assert.deepEqual(
      capacity
        .getProviderOperationCapacitySnapshot(),
      {
        active:
          0,

        queued:
          0,

        activeByProvider:
          {},

        maximumActive:
          capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS,

        maximumActivePerProvider:
          capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS_PER_PROVIDER,

        maximumQueued:
          capacity.MAX_PROVIDER_QUEUED_OPERATIONS,

        maximumQueuedPerProvider:
          capacity.MAX_PROVIDER_QUEUED_OPERATIONS_PER_PROVIDER,
      }
    );
  }
);

test(
  "queued provider operations time out without leaking queue capacity",
  async () => {
    const capacity =
      requireFromRoot(
        "server/providers/common/providerOperationTimeoutService.js"
      );

    const blocker =
      createDeferred();

    const activeOperations =
      Array.from(
        {
          length:
            capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS,
        },
        () =>
          capacity
            .executeProviderOperationWithTimeout({
              providerId:
                "queued-timeout-stub",

              methodName:
                "searchHotels",

              timeoutMs:
                2_000,

              operation:
                async () => {
                  await blocker.promise;

                  return {
                    ok:
                      true,
                  };
                },
            })
      );

    let queuedOperationStarted =
      false;

    try {
      assert.equal(
        await waitUntil(
          () =>
            capacity
              .getProviderOperationCapacitySnapshot()
              .active ===
            capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS
        ),
        true
      );

      await assert.rejects(
        capacity
          .executeProviderOperationWithTimeout({
            providerId:
              "queued-timeout-stub",

            methodName:
              "searchHotels",

            timeoutMs:
              25,

            operation:
              async () => {
                queuedOperationStarted =
                  true;

                return {
                  ok:
                    true,
                };
              },
          }),
        (error) =>
          error?.code ===
            "PROVIDER_TIMEOUT" &&
          error?.status ===
            504
      );

      assert.equal(
        queuedOperationStarted,
        false
      );

      const during =
        capacity
          .getProviderOperationCapacitySnapshot();

      assert.equal(
        during.queued,
        0
      );

      assert.equal(
        during.active,
        capacity.MAX_PROVIDER_CONCURRENT_OPERATIONS
      );
    }
    finally {
      blocker.resolve();
    }

    await Promise.all(
      activeOperations
    );

    const after =
      capacity
        .getProviderOperationCapacitySnapshot();

    assert.equal(
      after.active,
      0
    );

    assert.equal(
      after.queued,
      0
    );
  }
);

test(
  "LiteAPI oversized responses cannot amplify enrichment beyond the search budget",
  async () => {
    const {
      createLiteApiAdapter,
      MAX_LITEAPI_HOTELS_PER_SEARCH,
    } =
      requireFromRoot(
        "server/providers/liteApi/liteApiAdapter.js"
      );

    const probeHotels =
      Array.from(
        {
          length:
            801,
        },
        (_, index) => ({
          id:
            `liteapi:stub-hotel-${index}`,

          sourceHotelId:
            `stub-hotel-${index}`,

          providerHotelTypeId:
            null,

          sourceProvider:
            "liteapi",

          offers:
            [],
        })
      );

    let rateCalls =
      0;

    let metadataCalls =
      0;

    let facilityCalls =
      0;

    let largestMetadataBatch =
      0;

    const adapter =
      createLiteApiAdapter({
        searchLiteApiRates:
          async () => {
            rateCalls +=
              1;

            return {
              data: {
                contractStub:
                  true,
              },

              noContent:
                false,
            };
          },

        getLiteApiHotels:
          async ({
            hotelIds,
          }) => {
            metadataCalls +=
              1;

            const ids =
              String(
                hotelIds ??
                  ""
              )
                .split(",")
                .filter(Boolean);

            largestMetadataBatch =
              Math.max(
                largestMetadataBatch,
                ids.length
              );

            return {
              noContent:
                false,

              data: {
                data:
                  ids.map(
                    (id) => ({
                      id,
                    })
                  ),
              },
            };
          },

        getLiteApiFacilities:
          async () => {
            facilityCalls +=
              1;

            return {
              noContent:
                true,

              data:
                null,
            };
          },

        isLiteApiNoResults:
          () => false,

        getLiteApiCurrency:
          () => "EUR",

        mapLiteApiHotelResponse:
          () => probeHotels,

        mapLiteApiHotelDetailsResponse:
          () => null,

        mergeProviderHotelResults:
          (hotels) => hotels,
      });

    const result =
      await adapter.searchHotels({
        request: {
          destination: {
            cityName:
              "Stub City",

            countryCode:
              "IT",
          },

          stay: {
            checkin:
              "2030-01-10",

            checkout:
              "2030-01-12",
          },

          rooms: [
            {
              adults:
                2,

              childAges:
                [],
            },
          ],

          currency:
            "EUR",
        },
      });

    assert.equal(
      result.hotels.length,
      MAX_LITEAPI_HOTELS_PER_SEARCH
    );

    assert.equal(
      result.rawData,
      null
    );

    assert.equal(
      result.data,
      null
    );

    assert.equal(
      rateCalls,
      1
    );

    assert.ok(
      metadataCalls <=
        2
    );

    assert.equal(
      facilityCalls,
      1
    );

    assert.ok(
      rateCalls +
        metadataCalls +
        facilityCalls <=
        4
    );

    assert.ok(
      largestMetadataBatch <=
        40
    );
  }
);

test(
  "public media and booking URLs accept only credential-free HTTPS",
  () => {
    const {
      getSafeHttpUrl,
    } =
      requireFromRoot(
        "server/presenters/publicHotelPresenter.js"
      );

    const {
      getSafeBookingUrl,
    } =
      requireFromRoot(
        "server/services/bookingOfferIntegrityService.js"
      );

    const {
      getSafeExternalUrl,
    } =
      requireFromRoot(
        "server/providers/common/providerBookingHandoffResult.js"
      );

    for (
      const sanitize of [
        getSafeHttpUrl,
        getSafeBookingUrl,
        getSafeExternalUrl,
      ]
    ) {
      assert.equal(
        sanitize(
          "http://public.example.test/path"
        ),
        null
      );

      assert.equal(
        sanitize(
          "https://user:pass@public.example.test/path"
        ),
        null
      );

      assert.equal(
        sanitize(
          "https://public.example.test/path"
        ),
        "https://public.example.test/path"
      );
    }
  }
);

test(
  "frontend headers, workflow references and HTTP socket limits stay hardened",
  () => {
    const renderYaml =
      fs.readFileSync(
        path.join(
          root,
          "render.yaml"
        ),
        "utf8"
      );

    assert.match(
      renderYaml,
      /name:\s*Content-Security-Policy[\s\S]*default-src[\s\S]*object-src 'none'[\s\S]*base-uri[\s\S]*frame-ancestors/i
    );

    assert.match(
      renderYaml,
      /name:\s*Permissions-Policy[\s\S]*camera=\(\)[\s\S]*microphone=\(\)[\s\S]*geolocation=\(\)[\s\S]*payment=\(\)/i
    );

    const workflow =
      fs.readFileSync(
        path.join(
          root,
          ".github",
          "workflows",
          "release-gate.yml"
        ),
        "utf8"
      );

    const actionReferences =
      Array.from(
        workflow.matchAll(
          /^\s*uses:\s*[^@\s]+@([^\s#]+)/gm
        ),
        (match) =>
          match[1]
      );

    assert.ok(
      actionReferences.length >
        0
    );

    assert.equal(
      actionReferences.every(
        (reference) =>
          /^[0-9a-f]{40}$/i.test(
            reference
          )
      ),
      true
    );

    const serverSource =
      fs.readFileSync(
        path.join(
          root,
          "server",
          "server.js"
        ),
        "utf8"
      );

    for (
      const [
        property,
        limit,
      ] of [
        [
          "requestTimeout",
          "requestTimeoutMs",
        ],
        [
          "headersTimeout",
          "headersTimeoutMs",
        ],
        [
          "keepAliveTimeout",
          "keepAliveTimeoutMs",
        ],
        [
          "maxRequestsPerSocket",
          "maxRequestsPerSocket",
        ],
      ]
    ) {
      assert.match(
        serverSource,
        new RegExp(
          `server\\s*\\.\\s*${property}\\s*=\\s*HTTP_SERVER_CAPACITY_LIMITS\\s*\\.\\s*${limit}`
        )
      );
    }

    const readLimit =
      (name) => {
        const match =
          serverSource.match(
            new RegExp(
              `${name}\\s*:\\s*([0-9_]+)`
            )
          );

        assert.ok(
          match,
          `Missing ${name}`
        );

        return Number(
          match[1].replaceAll(
            "_",
            ""
          )
        );
      };

    assert.ok(
      readLimit(
        "headersTimeoutMs"
      ) <
        readLimit(
          "requestTimeoutMs"
        )
    );
  }
);
