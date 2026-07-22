import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const routeUrl =
  new URL(
    "../../server/routes/search.js",
    import.meta.url
  );

const require =
  createRequire(routeUrl);

const routePath =
  require.resolve(
    "../../server/routes/search.js"
  );

const stayServicePath =
  require.resolve(
    "../../server/services/stayService.js"
  );

const searchSessionPath =
  require.resolve(
    "../../server/storage/searchSession.js"
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
    }
    else {
      delete require.cache[
        modulePath
      ];
    }
  };
}

function createSessionError(
  searchId
) {
  const normalizedSearchId =
    typeof searchId === "string"
      ? searchId.trim()
      : "";

  const error =
    new Error(
      normalizedSearchId ===
        "expired"
        ? "raw restart detail"
        : normalizedSearchId
          ? "raw missing detail"
          : "raw required detail"
    );

  if (!normalizedSearchId) {
    error.code =
      "SEARCH_ID_REQUIRED";

    error.status =
      400;

    return error;
  }

  if (
    normalizedSearchId ===
      "expired"
  ) {
    error.code =
      "SEARCH_SESSION_EXPIRED";

    error.status =
      410;

    return error;
  }

  error.code =
    "SEARCH_SESSION_NOT_FOUND";

  error.status =
    404;

  return error;
}

async function readJson(
  url,
  options
) {
  const response =
    await fetch(
      url,
      options
    );

  return {
    status:
      response.status,

    cacheControl:
      response.headers.get(
        "Cache-Control"
      ),

    body:
      await response.json(),
  };
}

function assertCanonicalFailure(
  response,
  {
    status,
    code,
    outcome,
  }
) {
  assert.equal(
    response.status,
    status
  );

  assert.equal(
    response.body.code,
    code
  );

  assert.equal(
    response.body.lifecycle
      ?.outcome,
    outcome
  );

  assert.match(
    response.cacheControl ?? "",
    /no-store/i
  );

  const serialized =
    JSON.stringify(
      response.body
    );

  assert.equal(
    serialized.includes(
      "raw restart detail"
    ),
    false
  );

  assert.equal(
    serialized.includes(
      "raw missing detail"
    ),
    false
  );

  assert.equal(
    serialized.includes(
      "raw required detail"
    ),
    false
  );
}

test(
  "search session endpoints expose a canonical 400/404/410 matrix",
  async () => {
    const restoreStayService =
      installMock(
        stayServicePath,
        {
          searchDestinations:
            async () => [],

          searchHotels:
            async () => ({}),

          continueHotelSearch:
            async (
              searchId
            ) => {
              throw createSessionError(
                searchId
              );
            },

          getHotelDetails:
            async () => ({}),

          getSearchStatus:
            async (
              searchId
            ) => {
              throw createSessionError(
                searchId
              );
            },
        }
      );

    const restoreSearchSession =
      installMock(
        searchSessionPath,
        {
          requireSearchSession(
            searchId
          ) {
            throw createSessionError(
              searchId
            );
          },
        }
      );

    const previousRoute =
      require.cache[
        routePath
      ];

    delete require.cache[
      routePath
    ];

    const originalConsoleError =
      console.error;

    console.error =
      () => {};

    let server;

    try {
      const express =
        require(
          "express"
        );

      const router =
        require(
          routePath
        );

      const app =
        express();

      app.use(
        express.json()
      );

      app.use(
        "/api",
        router
      );

      server =
        await new Promise(
          (
            resolve,
            reject
          ) => {
            const candidate =
              app.listen(
                0,
                "127.0.0.1",
                () =>
                  resolve(
                    candidate
                  )
              );

            candidate.on(
              "error",
              reject
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

      const baseUrl =
        `http://127.0.0.1:${address.port}/api`;

      const requiredResponses =
        await Promise.all([
          readJson(
            `${baseUrl}/search-session`
          ),

          readJson(
            `${baseUrl}/search-status`
          ),

          readJson(
            `${baseUrl}/search-hotels/continue`,
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  {}
                ),
            }
          ),
        ]);

      for (
        const response of
        requiredResponses
      ) {
        assertCanonicalFailure(
          response,
          {
            status:
              400,
            code:
              "SEARCH_ID_REQUIRED",
            outcome:
              "session-missing",
          }
        );
      }

      const expiredResponses =
        await Promise.all([
          readJson(
            `${baseUrl}/search-session?searchId=expired`
          ),

          readJson(
            `${baseUrl}/search-status?searchId=expired`
          ),

          readJson(
            `${baseUrl}/search-hotels/continue`,
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  searchId:
                    "expired",
                }),
            }
          ),
        ]);

      for (
        const response of
        expiredResponses
      ) {
        assertCanonicalFailure(
          response,
          {
            status:
              410,
            code:
              "SEARCH_SESSION_EXPIRED",
            outcome:
              "session-expired",
          }
        );
      }

      const missingResponses =
        await Promise.all([
          readJson(
            `${baseUrl}/search-session?searchId=missing`
          ),

          readJson(
            `${baseUrl}/search-status?searchId=missing`
          ),

          readJson(
            `${baseUrl}/search-hotels/continue`,
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  searchId:
                    "missing",
                }),
            }
          ),
        ]);

      for (
        const response of
        missingResponses
      ) {
        assertCanonicalFailure(
          response,
          {
            status:
              404,
            code:
              "SEARCH_SESSION_MISSING",
            outcome:
              "session-missing",
          }
        );
      }
    }
    finally {
      console.error =
        originalConsoleError;

      if (server) {
        await new Promise(
          (resolve) =>
            server.close(
              resolve
            )
        );
      }

      if (previousRoute) {
        require.cache[
          routePath
        ] =
          previousRoute;
      }
      else {
        delete require.cache[
          routePath
        ];
      }

      restoreSearchSession();
      restoreStayService();
    }
  }
);
