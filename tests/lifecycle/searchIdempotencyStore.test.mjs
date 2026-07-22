import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(
    import.meta.url
  );

const idempotency =
  require(
    "../../server/storage/searchIdempotency.js"
  );

function createDeferred() {
  let resolve;

  const promise =
    new Promise((resolvePromise) => {
      resolve =
        resolvePromise;
    });

  return {
    promise,
    resolve,
  };
}

test(
  "payload fingerprints are canonical and payload-sensitive",
  () => {
    const first =
      idempotency
        .createSearchPayloadFingerprint({
          destinationId:
            "rome",

          checkIn:
            "2026-09-01",

          rooms: [
            {
              adults:
                2,
            },
          ],
        });

    const reordered =
      idempotency
        .createSearchPayloadFingerprint({
          rooms: [
            {
              adults:
                2,
            },
          ],

          checkIn:
            "2026-09-01",

          destinationId:
            "rome",
        });

    const changed =
      idempotency
        .createSearchPayloadFingerprint({
          destinationId:
            "rome",

          checkIn:
            "2026-09-02",

          rooms: [
            {
              adults:
                2,
            },
          ],
        });

    assert.equal(
      first,
      reordered
    );

    assert.notEqual(
      first,
      changed
    );
  }
);

test(
  "idempotency store coalesces, replays, rejects conflicts and does not cache failures",
  async () => {
    idempotency
      .clearSearchIdempotencyRecords();

    const payload = {
      destinationId:
        "rome",

      checkIn:
        "2026-09-01",
    };

    let calls =
      0;

    const deferred =
      createDeferred();

    const execute =
      async () => {
        calls += 1;

        await deferred.promise;

        return {
          success:
            true,

          searchId:
            "search-1",
        };
      };

    const firstPromise =
      idempotency
        .executeInitialSearchIdempotently({
          idempotencyKey:
            "search-concurrent-0001",

          payload,

          execute,
        });

    const secondPromise =
      idempotency
        .executeInitialSearchIdempotently({
          idempotencyKey:
            "search-concurrent-0001",

          payload,

          execute,
        });

    assert.equal(
      calls,
      0
    );

    await Promise.resolve();

    assert.equal(
      calls,
      1
    );

    deferred.resolve();

    const [
      first,
      second,
    ] =
      await Promise.all([
        firstPromise,
        secondPromise,
      ]);

    assert.equal(
      first.coalesced,
      false
    );

    assert.equal(
      second.coalesced,
      true
    );

    assert.deepEqual(
      first.response,
      second.response
    );

    const replay =
      await idempotency
        .executeInitialSearchIdempotently({
          idempotencyKey:
            "search-concurrent-0001",

          payload,

          execute,
        });

    assert.equal(
      replay.replayed,
      true
    );

    assert.equal(
      calls,
      1
    );

    await assert.rejects(
      idempotency
        .executeInitialSearchIdempotently({
          idempotencyKey:
            "search-concurrent-0001",

          payload: {
            ...payload,

            checkIn:
              "2026-09-02",
          },

          execute,
        }),
      (error) =>
        error?.status === 409 &&
        error?.code ===
          "IDEMPOTENCY_KEY_CONFLICT"
    );

    let attempts =
      0;

    const retryingExecute =
      async () => {
        attempts += 1;

        if (attempts === 1) {
          throw new Error(
            "temporary failure"
          );
        }

        return {
          success:
            true,

          searchId:
            "search-2",
        };
      };

    await assert.rejects(
      idempotency
        .executeInitialSearchIdempotently({
          idempotencyKey:
            "search-retry-after-error-01",

          payload,

          execute:
            retryingExecute,
        })
    );

    const retried =
      await idempotency
        .executeInitialSearchIdempotently({
          idempotencyKey:
            "search-retry-after-error-01",

          payload,

          execute:
            retryingExecute,
        });

    assert.equal(
      retried.response.searchId,
      "search-2"
    );

    assert.equal(
      attempts,
      2
    );

    let failedResponses =
      0;

    const failedResponseExecute =
      async () => {
        failedResponses += 1;

        return {
          success:
            false,

          code:
            "SEARCH_PROVIDER_ERROR",
        };
      };

    await idempotency
      .executeInitialSearchIdempotently({
        idempotencyKey:
          "search-no-session-error-01",

        payload,

        execute:
          failedResponseExecute,
      });

    await idempotency
      .executeInitialSearchIdempotently({
        idempotencyKey:
          "search-no-session-error-01",

        payload,

        execute:
          failedResponseExecute,
      });

    assert.equal(
      failedResponses,
      2
    );

    idempotency
      .clearSearchIdempotencyRecords();
  }
);
