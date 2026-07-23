import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import {
  createRequire,
} from "node:module";
import {
  test,
} from "node:test";

const require =
  createRequire(
    import.meta.url
  );

const serverRequire =
  createRequire(
    path.join(
      process.cwd(),
      "server",
      "server.js"
    )
  );

const {
  createAnalyticsEventHandler,
  hasPrivacyOptOutSignal,
} = require(
  "../../server/routes/analytics.js"
);

function createRequest({
  headers = {},
  body = {},
} = {}) {
  const normalizedHeaders =
    Object.fromEntries(
      Object.entries(headers)
        .map(
          ([key, value]) => [
            key.toLowerCase(),
            value,
          ]
        )
    );

  return {
    body,
    get(name) {
      return normalizedHeaders[
        name.toLowerCase()
      ];
    },
  };
}

function createResponse() {
  return {
    statusCode:
      null,
    payload:
      null,
    ended:
      false,
    status(value) {
      this.statusCode =
        value;
      return this;
    },
    json(value) {
      this.payload =
        value;
      return this;
    },
    end() {
      this.ended =
        true;
      return this;
    },
  };
}

function createValidEvent() {
  return {
    eventId:
      "00000000-0000-4000-8000-000000000011",
    eventName:
      "page_view",
    eventVersion:
      1,
    occurredAt:
      new Date().toISOString(),
    sessionId:
      "00000000-0000-4000-8000-000000000012",
    releaseSha:
      "7ac6936",
    page:
      "home",
    properties: {
      entrySource:
        "direct",
    },
  };
}

test(
  "analytics endpoint remains inert while disabled",
  () => {
    let writes =
      0;

    const handler =
      createAnalyticsEventHandler({
        enabled:
          false,
        store: {
          write() {
            writes += 1;
          },
        },
      });

    const response =
      createResponse();

    handler(
      createRequest({
        body: {
          events: [
            createValidEvent(),
          ],
        },
      }),
      response,
      assert.fail
    );

    assert.equal(
      response.statusCode,
      204
    );
    assert.equal(writes, 0);
  }
);

test(
  "analytics endpoint respects DNT and Global Privacy Control before storage",
  () => {
    for (
      const headers of
      [
        {
          DNT: "1",
        },
        {
          "Sec-GPC": "1",
        },
      ]
    ) {
      let writes =
        0;

      const handler =
        createAnalyticsEventHandler({
          enabled:
            true,
          store: {
            write() {
              writes += 1;
            },
          },
        });

      const request =
        createRequest({
          headers,
          body: {
            events: [
              createValidEvent(),
            ],
          },
        });

      const response =
        createResponse();

      assert.equal(
        hasPrivacyOptOutSignal(
          request
        ),
        true
      );

      handler(
        request,
        response,
        assert.fail
      );

      assert.equal(
        response.statusCode,
        204
      );
      assert.equal(writes, 0);
    }
  }
);

test(
  "analytics endpoint validates and stores enabled first-party events",
  () => {
    const stored =
      [];

    const handler =
      createAnalyticsEventHandler({
        enabled:
          true,
        store: {
          write(events) {
            stored.push(
              ...events
            );
            return events.length;
          },
        },
      });

    const response =
      createResponse();

    handler(
      createRequest({
        body: {
          events: [
            createValidEvent(),
          ],
        },
      }),
      response,
      assert.fail
    );

    assert.equal(
      response.statusCode,
      202
    );
    assert.equal(
      response.payload.accepted,
      1
    );
    assert.equal(
      stored.length,
      1
    );
  }
);


async function startAnalyticsHttpServer({
  enabled,
}) {
  const express =
    serverRequire(
      "express"
    );

  const {
    createApp,
  } = require(
    "../../server/app.js"
  );

  const {
    createRuntimeSecurityConfig,
  } = require(
    "../../server/config/runtimeSecurityConfig.js"
  );

  const {
    createSecurityLogger,
  } = require(
    "../../server/observability/securityLogger.js"
  );

  const {
    createInMemoryAnalyticsEventStore,
  } = require(
    "../../server/analytics/analyticsEventStore.js"
  );

  const store =
    createInMemoryAnalyticsEventStore({
      maxEvents:
        100,
    });

  const config =
    createRuntimeSecurityConfig({
      environment: {},
      overrides: {
        nodeEnv:
          "test",
        allowedOrigins: [
          "http://allowed.example",
        ],
        rateLimitWindowMs:
          60_000,
        rateLimitMaxRequests:
          1_000,
        analyticsEnabled:
          enabled,
      },
    });

  const logger =
    createSecurityLogger({
      environment: {},
      write:
        () => {},
    });

  const {
    app,
  } = createApp({
    config,
    logger,
    searchRoutes:
      express.Router(),
    analyticsEventStore:
      store,
  });

  const server =
    http.createServer(app);

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
    store,

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

async function postAnalytics(
  origin,
  event,
  headers = {}
) {
  return fetch(
    `${origin}/api/analytics/events`,
    {
      method:
        "POST",
      headers: {
        "Content-Type":
          "application/json",
        Origin:
          "http://allowed.example",
        ...headers,
      },
      body:
        JSON.stringify({
          events: [
            event,
          ],
        }),
    }
  );
}

test(
  "real analytics HTTP endpoint is disabled by default, privacy-aware, strict and idempotent",
  async () => {
    const disabledHarness =
      await startAnalyticsHttpServer({
        enabled:
          false,
      });

    try {
      const response =
        await postAnalytics(
          disabledHarness.origin,
          createValidEvent()
        );

      assert.equal(
        response.status,
        204
      );
      assert.equal(
        response.headers.get(
          "cache-control"
        ),
        "no-store"
      );
      assert.equal(
        disabledHarness.store.count(),
        0
      );
    } finally {
      await disabledHarness.close();
    }

    const enabledHarness =
      await startAnalyticsHttpServer({
        enabled:
          true,
      });

    try {
      const optedOutResponse =
        await postAnalytics(
          enabledHarness.origin,
          createValidEvent(),
          {
            DNT:
              "1",
          }
        );

      assert.equal(
        optedOutResponse.status,
        204
      );
      assert.equal(
        enabledHarness.store.count(),
        0
      );

      const firstResponse =
        await postAnalytics(
          enabledHarness.origin,
          createValidEvent()
        );

      assert.equal(
        firstResponse.status,
        202
      );
      assert.equal(
        (
          await firstResponse.json()
        ).accepted,
        1
      );
      assert.equal(
        enabledHarness.store.count(),
        1
      );

      const duplicateResponse =
        await postAnalytics(
          enabledHarness.origin,
          createValidEvent()
        );

      assert.equal(
        duplicateResponse.status,
        202
      );
      assert.equal(
        (
          await duplicateResponse.json()
        ).accepted,
        0
      );
      assert.equal(
        enabledHarness.store.count(),
        1
      );

      const forbiddenResponse =
        await postAnalytics(
          enabledHarness.origin,
          {
            ...createValidEvent(),
            properties: {
              entrySource:
                "direct",
              searchId:
                "private-search",
            },
          }
        );

      assert.equal(
        forbiddenResponse.status,
        400
      );

      const failure =
        await forbiddenResponse.json();

      assert.equal(
        failure.code,
        "INVALID_ANALYTICS_EVENT"
      );
      assert.equal(
        enabledHarness.store.count(),
        1
      );
    } finally {
      await enabledHarness.close();
    }
  }
);
