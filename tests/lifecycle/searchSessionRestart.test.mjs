import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const searchSessionPath =
  require.resolve(
    "../../server/storage/searchSession.js"
  );

function loadFreshSearchSession() {
  delete require.cache[
    searchSessionPath
  ];

  return require(
    searchSessionPath
  );
}

function assertSessionError(
  execute,
  {
    status,
    code,
  }
) {
  assert.throws(
    execute,
    (error) => {
      assert.equal(
        error.status,
        status
      );

      assert.equal(
        error.code,
        code
      );

      return true;
    }
  );
}

test(
  "search sessions distinguish TTL expiry, backend restart and never-created ids",
  () => {
    const originalNow =
      Date.now;

    let now =
      2_000_000_000_000;

    Date.now =
      () => now;

    try {
      const firstProcess =
        loadFreshSearchSession();

      const expiringSession =
        firstProcess
          .saveSearchSession({
            status:
              "Completed",
            searchIncomplete:
              false,
            hotels:
              [],
          });

      assert.match(
        expiringSession.searchId,
        /^ss1\.[a-f0-9]{16}\.[0-9a-f-]{36}$/i
      );

      now +=
        firstProcess
          .SEARCH_SESSION_TTL_MS +
        1;

      assertSessionError(
        () =>
          firstProcess
            .requireSearchSession(
              expiringSession.searchId
            ),
        {
          status:
            410,
          code:
            "SEARCH_SESSION_EXPIRED",
        }
      );

      const restartSession =
        firstProcess
          .saveSearchSession({
            status:
              "Completed",
            searchIncomplete:
              false,
            hotels:
              [],
          });

      const secondProcess =
        loadFreshSearchSession();

      assertSessionError(
        () =>
          secondProcess
            .requireSearchSession(
              restartSession.searchId
            ),
        {
          status:
            410,
          code:
            "SEARCH_SESSION_EXPIRED",
        }
      );

      assertSessionError(
        () =>
          secondProcess
            .requireSearchSession(
              "never-created-search"
            ),
        {
          status:
            404,
          code:
            "SEARCH_SESSION_NOT_FOUND",
        }
      );

      assertSessionError(
        () =>
          secondProcess
            .requireSearchSession(
              null
            ),
        {
          status:
            400,
          code:
            "SEARCH_ID_REQUIRED",
        }
      );
    }
    finally {
      Date.now =
        originalNow;

      loadFreshSearchSession();
    }
  }
);
