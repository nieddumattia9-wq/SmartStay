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
const idempotencyPath = require.resolve(
  "../../server/storage/searchIdempotency.js"
);

function installMock(modulePath, exports) {
  const previous = require.cache[modulePath];

  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };

  return () => {
    if (previous) {
      require.cache[modulePath] = previous;
    }
    else {
      delete require.cache[modulePath];
    }
  };
}

async function postSearch(
  baseUrl,
  payload,
  idempotencyKey = null
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] =
      idempotencyKey;
  }

  const response = await fetch(
    `${baseUrl}/search-hotels`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
    replayed: response.headers.get(
      "idempotency-replayed"
    ),
    coalesced: response.headers.get(
      "idempotency-coalesced"
    ),
  };
}

test(
  "search-hotels enforces idempotency key, replay and conflict over HTTP",
  async () => {
    const idempotency = require(
      idempotencyPath
    );
    idempotency
      .clearSearchIdempotencyRecords();

    let calls = 0;

    const restoreStayService =
      installMock(
        stayServicePath,
        {
          searchDestinations:
            async () => [],
          searchHotels:
            async () => {
              calls += 1;

              return {
                success: true,
                searchId: `search-${calls}`,
                status: "Completed",
                searchIncomplete: false,
                totalHotels: 0,
                hotels: [],
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

      app.use(express.json());
      app.use("/api", router);

      server = await new Promise(
        (resolve, reject) => {
          const candidate = app.listen(
            0,
            "127.0.0.1",
            () => resolve(candidate)
          );
          candidate.on("error", reject);
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
      const payload = {
        destinationId: "rome",
        checkIn: "2026-09-01",
        checkOut: "2026-09-04",
        rooms: [
          {
            adults: 2,
            children: 0,
            childAges: [],
          },
        ],
      };

      const missing =
        await postSearch(
          baseUrl,
          payload
        );

      assert.equal(missing.status, 400);
      assert.equal(
        missing.body.code,
        "IDEMPOTENCY_KEY_REQUIRED"
      );
      assert.equal(calls, 0);

      const key =
        "search-http-replay-0001";
      const first =
        await postSearch(
          baseUrl,
          payload,
          key
        );

      assert.equal(first.status, 200);
      assert.equal(
        first.replayed,
        "false"
      );
      assert.equal(
        first.coalesced,
        "false"
      );
      assert.equal(calls, 1);

      const replay =
        await postSearch(
          baseUrl,
          {
            rooms: payload.rooms,
            checkOut: payload.checkOut,
            destinationId:
              payload.destinationId,
            checkIn: payload.checkIn,
          },
          key
        );

      assert.equal(replay.status, 200);
      assert.equal(
        replay.replayed,
        "true"
      );
      assert.deepEqual(
        replay.body,
        first.body
      );
      assert.equal(calls, 1);

      const conflict =
        await postSearch(
          baseUrl,
          {
            ...payload,
            checkOut: "2026-09-05",
          },
          key
        );

      assert.equal(conflict.status, 409);
      assert.equal(
        conflict.body.code,
        "IDEMPOTENCY_KEY_CONFLICT"
      );
      assert.equal(
        "lifecycle" in conflict.body,
        false
      );
      assert.equal(calls, 1);
    }
    finally {
      console.error =
        originalConsoleError;
      idempotency
        .clearSearchIdempotencyRecords();

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
