import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const routeUrl = new URL(
  "../../server/routes/search.js",
  import.meta.url
);

const require = createRequire(routeUrl);
const routePath = require.resolve(
  "../../server/routes/search.js"
);
const stayServicePath = require.resolve(
  "../../server/services/stayService.js"
);
const searchSessionPath = require.resolve(
  "../../server/storage/searchSession.js"
);

function installMock(
  modulePath,
  exports
) {
  const previous =
    require.cache[modulePath];

  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
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

async function readJson(
  url
) {
  const response =
    await fetch(url);

  return {
    status: response.status,
    retryAfter:
      response.headers.get(
        "Retry-After"
      ),
    body: await response.json(),
  };
}

test(
  "search HTTP errors expose canonical 429 and 504 lifecycle policies without raw provider details",
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
          requireSearchSession(
            searchId
          ) {
            const rateLimited =
              searchId ===
              "rate-limited";

            const error =
              new Error(
                rateLimited
                  ? "raw provider quota secret"
                  : "raw gateway timeout secret"
              );

            error.status =
              rateLimited
                ? 429
                : 504;

            if (rateLimited) {
              error.response = {
                status: 429,
                headers: {
                  "retry-after": "7",
                },
                data: {
                  message:
                    "raw provider quota secret",
                },
              };
            }

            throw error;
          },
        }
      );

    const previousRoute =
      require.cache[routePath];

    delete require.cache[routePath];

    const originalConsoleError =
      console.error;

    console.error = () => {};

    let server;

    try {
      const express =
        require("express");

      const router =
        require(routePath);

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
          (resolve, reject) => {
            const candidate =
              app.listen(
                0,
                "127.0.0.1",
                () => resolve(candidate)
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
        typeof address === "object"
      );

      const baseUrl =
        `http://127.0.0.1:${address.port}/api`;

      const rateLimited =
        await readJson(
          `${baseUrl}/search-session?searchId=rate-limited`
        );

      assert.equal(
        rateLimited.status,
        429
      );

      assert.equal(
        rateLimited.retryAfter,
        "7"
      );

      assert.equal(
        rateLimited.body.code,
        "SEARCH_RATE_LIMITED"
      );

      assert.equal(
        rateLimited.body.lifecycle
          ?.outcome,
        "rate-limited"
      );

      assert.equal(
        rateLimited.body.lifecycle
          ?.retryable,
        true
      );

      assert.equal(
        rateLimited.body.retryAfterMs,
        7_000
      );

      assert.equal(
        JSON.stringify(
          rateLimited.body
        ).includes(
          "raw provider quota secret"
        ),
        false
      );

      const timeout =
        await readJson(
          `${baseUrl}/search-session?searchId=timeout`
        );

      assert.equal(
        timeout.status,
        504
      );

      assert.equal(
        timeout.body.code,
        "SEARCH_TIMEOUT"
      );

      assert.equal(
        timeout.body.lifecycle
          ?.outcome,
        "timeout"
      );

      assert.equal(
        timeout.body.lifecycle
          ?.retryable,
        true
      );

      assert.equal(
        JSON.stringify(
          timeout.body
        ).includes(
          "raw gateway timeout secret"
        ),
        false
      );
    }
    finally {
      console.error =
        originalConsoleError;

      if (server) {
        await new Promise(
          (resolve) =>
            server.close(resolve)
        );
      }

      if (previousRoute) {
        require.cache[routePath] =
          previousRoute;
      }
      else {
        delete require.cache[routePath];
      }

      restoreSearchSession();
      restoreStayService();
    }
  }
);
