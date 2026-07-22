import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const serviceUrl = new URL(
  "../../server/services/stayService.js",
  import.meta.url
);

const require =
  createRequire(
    serviceUrl
  );

const servicePath =
  require.resolve(
    "../../server/services/stayService.js"
  );

const orchestratorPath =
  require.resolve(
    "../../server/providers/accommodationProviderOrchestrator.js"
  );

const searchSession =
  require(
    "../../server/storage/searchSession.js"
  );

const {
  createProviderExecutionStates,
} = require(
  "../../server/providers/common/providerContinuationState.js"
);

function installMock(
  modulePath,
  exports
) {
  const previous =
    require.cache[modulePath];

  require.cache[modulePath] = {
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
      require.cache[modulePath] =
        previous;
      return;
    }

    delete require.cache[modulePath];
  };
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

function createSuccessResult({
  providerId,
  hotelId,
  continuation = null,
} = {}) {
  const hotels =
    hotelId
      ? [
          {
            id:
              hotelId,

            sourceProvider:
              providerId,

            sourceHotelId:
              hotelId,

            name:
              hotelId,

            offers:
              [],
          },
        ]
      : [];

  return {
    providerId,

    outcome:
      "success",

    data: {
      success:
        true,

      code:
        null,

      message:
        null,

      result: {
        status:
          continuation
            ? "InProgress"
            : "Completed",
      },
    },

    currency:
      "EUR",

    hotels,

    continuation,

    providerContext: {
      providerId,
    },

    failedResponse:
      null,

    attempts: [
      {
        providerId,

        success:
          true,

        outcome:
          "success",

        retryable:
          false,

        retryAfterMs:
          null,
      },
    ],
  };
}

function createRetryableFailure(
  providerId
) {
  const attempt = {
    providerId,

    success:
      false,

    failed:
      true,

    outcome:
      "timeout",

    code:
      "PROVIDER_TIMEOUT",

    message:
      "raw provider timeout",

    retryable:
      true,

    retryAfterMs:
      25,
  };

  return {
    providerId:
      null,

    outcome:
      "error",

    currency:
      "EUR",

    hotels:
      [],

    continuation:
      null,

    attempts: [
      attempt,
    ],

    failedResponse: {
      success:
        false,

      code:
        "NO_PROVIDER_RETURNED_RESULTS",

      message:
        "raw aggregate failure",

      status:
        "Failed",

      retryable:
        true,

      retryAfterMs:
        25,

      attempts: [
        attempt,
      ],

      hotels:
        [],
    },
  };
}

test(
  "continuation coalesces concurrent calls and retries each provider cursor at most once",
  async () => {
    const firstProviderGate =
      createDeferred();

    const providerCalls =
      new Map();

    const restoreOrchestrator =
      installMock(
        orchestratorPath,
        {
          searchDestinationsAcrossProviders:
            async () => [],

          searchHotelsAcrossProviders:
            async () => ({}),

          searchHotelsWithPrimaryProvider:
            async () => ({}),

          getHotelDetailsFromProvider:
            async () => ({}),

          async continueHotelSearchForProvider({
            providerId,
          }) {
            const callNumber =
              (
                providerCalls.get(
                  providerId
                ) ??
                0
              ) + 1;

            providerCalls.set(
              providerId,
              callNumber
            );

            if (
              providerId ===
                "provider-a" &&
              callNumber === 1
            ) {
              await firstProviderGate
                .promise;

              return createRetryableFailure(
                providerId
              );
            }

            return createSuccessResult({
              providerId,

              hotelId:
                `${providerId}-hotel`,
            });
          },
        }
      );

    const previousService =
      require.cache[servicePath];

    delete require.cache[
      servicePath
    ];

    const providerExecutions =
      createProviderExecutionStates([
        {
          providerId:
            "provider-a",

          supportsContinuation:
            true,

          continuation: {
            providerId:
              "provider-a",

            cursor:
              "a-1",
          },

          providerContext: {
            opaque:
              "a",
          },
        },
        {
          providerId:
            "provider-b",

          supportsContinuation:
            true,

          continuation: {
            providerId:
              "provider-b",

            cursor:
              "b-1",
          },

          providerContext: {
            opaque:
              "b",
          },
        },
      ]);

    const session =
      searchSession
        .saveSearchSession({
          originalSearchData: {
            destinationId:
              "rome",

            checkIn:
              "2026-09-01",

            checkOut:
              "2026-09-04",

            currency:
              "EUR",
          },

          providerId:
            "provider-a",

          providerExecutions,

          continuation:
            providerExecutions[0]
              .continuation,

          providerContext:
            providerExecutions[0]
              .providerContext,

          status:
            "InProgress",

          searchIncomplete:
            true,

          currency:
            "EUR",

          hotels:
            [
              {
                id:
                  "initial-hotel",

                sourceProvider:
                  "provider-a",

                sourceHotelId:
                  "initial-hotel",

                name:
                  "Initial",

                offers:
                  [],
              },
            ],
        });

    try {
      const service =
        require(servicePath);

      const first =
        service.continueHotelSearch(
          session.searchId
        );

      while (
        (
          providerCalls.get(
            "provider-a"
          ) ??
          0
        ) === 0
      ) {
        await new Promise(
          (resolve) =>
            setImmediate(resolve)
        );
      }

      const concurrent =
        await service
          .continueHotelSearch(
            session.searchId
          );

      assert.equal(
        concurrent.searchId,
        session.searchId
      );

      assert.equal(
        concurrent.isContinuing,
        true
      );

      assert.equal(
        providerCalls.get(
          "provider-a"
        ),
        1
      );

      assert.equal(
        providerCalls.get(
          "provider-b"
        ),
        1
      );

      firstProviderGate.resolve();

      const firstResult =
        await first;

      assert.equal(
        firstResult.searchId,
        session.searchId
      );

      assert.equal(
        firstResult.status,
        "InProgress"
      );

      assert.equal(
        firstResult.searchIncomplete,
        true
      );

      assert.equal(
        firstResult.nextResultsKey,
        null
      );

      assert.equal(
        providerCalls.get(
          "provider-a"
        ),
        1
      );

      assert.equal(
        providerCalls.get(
          "provider-b"
        ),
        1
      );

      const waiting =
        await service
          .continueHotelSearch(
            session.searchId
          );

      assert.equal(
        waiting.status,
        "InProgress"
      );

      assert.equal(
        waiting.searchIncomplete,
        true
      );

      assert.equal(
        providerCalls.get(
          "provider-a"
        ),
        1
      );

      assert.equal(
        Number(waiting.retryAfterMs) > 0,
        true
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            35
          )
      );

      const completed =
        await service
          .continueHotelSearch(
            session.searchId
          );

      assert.equal(
        completed.searchId,
        session.searchId
      );

      assert.equal(
        completed.status,
        "Completed"
      );

      assert.equal(
        completed.searchIncomplete,
        false
      );

      assert.equal(
        completed.isContinuing,
        false
      );

      assert.equal(
        completed.nextResultsKey,
        null
      );

      assert.equal(
        providerCalls.get(
          "provider-a"
        ),
        2
      );

      assert.equal(
        providerCalls.get(
          "provider-b"
        ),
        1
      );

      assert.deepEqual(
        completed.hotels
          .map(
            (hotel) =>
              hotel.id
          )
          .sort(),
        [
          "initial-hotel",
          "provider-a-hotel",
          "provider-b-hotel",
        ]
      );

      const stored =
        searchSession
          .requireSearchSession(
            session.searchId
          );

      assert.equal(
        stored.continuation,
        null
      );

      assert.equal(
        stored.isContinuing,
        false
      );

      assert.equal(
        stored.continuationLock,
        null
      );

      assert.equal(
        stored.providerExecutions
          .every(
            (execution) =>
              execution.state ===
              "completed"
          ),
        true
      );
    }
    finally {
      searchSession
        .clearSearchSession(
          session.searchId
        );

      restoreOrchestrator();

      if (previousService) {
        require.cache[servicePath] =
          previousService;
      }
      else {
        delete require.cache[
          servicePath
        ];
      }
    }
  }
);
