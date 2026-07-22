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
    body: await response.json(),
  };
}

test(
  "search-session HTTP errors redact raw expired and missing messages",
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
            const error =
              new Error(
                searchId === "expired"
                  ? "raw expired internal"
                  : "raw missing internal"
              );

            error.code =
              searchId === "expired"
                ? "SEARCH_SESSION_EXPIRED"
                : "SEARCH_SESSION_NOT_FOUND";

            error.status =
              searchId === "expired"
                ? 410
                : 404;

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

      const expired =
        await readJson(
          `${baseUrl}/search-session?searchId=expired`
        );

      assert.equal(
        expired.status,
        410
      );

      assert.equal(
        expired.body.code,
        "SEARCH_SESSION_EXPIRED"
      );

      assert.equal(
        expired.body.message,
        "This search has expired. Please start a new search."
      );

      assert.equal(
        expired.body.lifecycle?.outcome,
        "session-expired"
      );

      assert.equal(
        JSON.stringify(expired.body)
          .includes(
            "raw expired internal"
          ),
        false
      );

      const missing =
        await readJson(
          `${baseUrl}/search-session?searchId=missing`
        );

      assert.equal(
        missing.status,
        404
      );

      assert.equal(
        missing.body.code,
        "SEARCH_SESSION_MISSING"
      );

      assert.equal(
        missing.body.message,
        "These search results are no longer available. Please start a new search."
      );

      assert.equal(
        missing.body.lifecycle?.outcome,
        "session-missing"
      );

      assert.equal(
        JSON.stringify(missing.body)
          .includes(
            "raw missing internal"
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
