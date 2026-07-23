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
  createRuntimeState,
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
  sanitizeForLogs,
} = serverRequire(
  path.join(
    root,
    "server",
    "observability",
    "securityLogger.js"
  )
);

async function startTestServer({
  router,
  overrides =
    {},
  runtimeState =
    createRuntimeState(),
} = {}) {
  const logLines =
    [];

  const config =
    createRuntimeSecurityConfig({
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
          100,
        ...overrides,
      },
    });

  const logger =
    createSecurityLogger({
      environment: {
        TEST_API_KEY:
          "super-secret-value",
      },
      write:
        (line) =>
          logLines.push(
            JSON.parse(line)
          ),
      now:
        () =>
          new Date(
            "2026-07-23T00:00:00.000Z"
          ),
    });

  const fallbackRouter =
    express.Router();

  fallbackRouter.get(
    "/ping",
    (
      req,
      res
    ) => {
      res.json({
        success:
          true,
        requestId:
          req.requestId,
      });
    }
  );

  const {
    app,
  } =
    createApp({
      config,
      logger,
      runtimeState,
      searchRoutes:
        router ??
        fallbackRouter,
    });

  const server =
    http.createServer(
      app
    );

  await new Promise(
    (resolve) =>
      server.listen(
        0,
        "127.0.0.1",
        resolve
      )
  );

  const address =
    server.address();

  const origin =
    `http://127.0.0.1:${address.port}`;

  return {
    origin,
    logLines,
    runtimeState,

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

async function readJson(
  response
) {
  return response.json();
}

test(
  "HTTP security foundation exposes request ids, security headers and no server fingerprint",
  async () => {
    const harness =
      await startTestServer();

    try {
      const response =
        await fetch(
          `${harness.origin}/health/live`,
          {
            headers: {
              Origin:
                "http://allowed.example",
              "X-Request-ID":
                "client-request-1234",
            },
          }
        );

      assert.equal(
        response.status,
        200
      );

      assert.equal(
        response.headers.get(
          "x-request-id"
        ),
        "client-request-1234"
      );

      assert.equal(
        response.headers.get(
          "x-powered-by"
        ),
        null
      );

      assert.equal(
        response.headers.get(
          "x-content-type-options"
        ),
        "nosniff"
      );

      assert.equal(
        response.headers.get(
          "referrer-policy"
        ),
        "no-referrer"
      );

      assert.equal(
        response.headers.get(
          "access-control-allow-origin"
        ),
        "http://allowed.example"
      );

      assert.equal(
        response.headers.get(
          "cache-control"
        ),
        "no-store"
      );

      const payload =
        await readJson(
          response
        );

      assert.equal(
        payload.requestId,
        "client-request-1234"
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "invalid request ids are replaced and disallowed CORS origins receive a redacted 403",
  async () => {
    const harness =
      await startTestServer();

    try {
      const response =
        await fetch(
          `${harness.origin}/api/ping`,
          {
            headers: {
              Origin:
                "https://evil.example",
              "X-Request-ID":
                "bad request id",
            },
          }
        );

      assert.equal(
        response.status,
        403
      );

      const requestId =
        response.headers.get(
          "x-request-id"
        );

      assert.match(
        requestId,
        /^req-[0-9a-f-]{36}$/
      );

      const payload =
        await readJson(
          response
        );

      assert.equal(
        payload.code,
        "CORS_ORIGIN_DENIED"
      );

      assert.equal(
        payload.message,
        "Origin is not allowed."
      );

      assert.equal(
        payload.requestId,
        requestId
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "malformed JSON and unhandled errors never expose internal details",
  async () => {
    const router =
      express.Router();

    router.post(
      "/boom",
      (
        req,
        res,
        next
      ) => {
        const error =
          new Error(
            "provider token super-secret-value"
          );

        error.providerContext = {
          prebookId:
            "private-prebook",
        };

        next(error);
      }
    );

    const harness =
      await startTestServer({
        router,
      });

    try {
      const invalidJson =
        await fetch(
          `${harness.origin}/api/boom`,
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              "{invalid",
          }
        );

      assert.equal(
        invalidJson.status,
        400
      );

      const invalidPayload =
        await readJson(
          invalidJson
        );

      assert.equal(
        invalidPayload.code,
        "INVALID_JSON"
      );

      assert.equal(
        JSON.stringify(
          invalidPayload
        ).includes(
          "Unexpected"
        ),
        false
      );

      const unhandled =
        await fetch(
          `${harness.origin}/api/boom`,
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
        unhandled.status,
        500
      );

      const unhandledPayload =
        await readJson(
          unhandled
        );

      assert.equal(
        unhandledPayload.code,
        "INTERNAL_ERROR"
      );

      const serializedPublic =
        JSON.stringify(
          unhandledPayload
        );

      assert.equal(
        serializedPublic.includes(
          "super-secret-value"
        ),
        false
      );

      assert.equal(
        serializedPublic.includes(
          "private-prebook"
        ),
        false
      );

      const serializedLogs =
        JSON.stringify(
          harness.logLines
        );

      assert.equal(
        serializedLogs.includes(
          "super-secret-value"
        ),
        false
      );

      assert.equal(
        serializedLogs.includes(
          "private-prebook"
        ),
        false
      );

      assert.equal(
        serializedLogs.includes(
          "[REDACTED]"
        ),
        true
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "readiness is independent from liveness and changes during draining",
  async () => {
    const runtimeState =
      createRuntimeState();

    const harness =
      await startTestServer({
        runtimeState,
      });

    try {
      const initialReady =
        await fetch(
          `${harness.origin}/health/ready`
        );

      assert.equal(
        initialReady.status,
        200
      );

      runtimeState.setReady(
        false
      );

      const liveness =
        await fetch(
          `${harness.origin}/health/live`
        );

      assert.equal(
        liveness.status,
        200
      );

      const readiness =
        await fetch(
          `${harness.origin}/health/ready`
        );

      assert.equal(
        readiness.status,
        503
      );

      const payload =
        await readJson(
          readiness
        );

      assert.equal(
        payload.status,
        "not-ready"
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "global rate limiting returns a canonical public response",
  async () => {
    const harness =
      await startTestServer({
        overrides: {
          rateLimitMaxRequests:
            2,
        },
      });

    try {
      const first =
        await fetch(
          `${harness.origin}/api/ping`
        );

      const second =
        await fetch(
          `${harness.origin}/api/ping`
        );

      const third =
        await fetch(
          `${harness.origin}/api/ping`
        );

      assert.equal(
        first.status,
        200
      );

      assert.equal(
        second.status,
        200
      );

      assert.equal(
        third.status,
        429
      );

      const payload =
        await readJson(
          third
        );

      assert.equal(
        payload.code,
        "RATE_LIMITED"
      );

      assert.equal(
        typeof payload.requestId,
        "string"
      );

      assert.ok(
        third.headers.get(
          "ratelimit"
        ) ??
        third.headers.get(
          "ratelimit-limit"
        )
      );
    }
    finally {
      await harness.close();
    }
  }
);

test(
  "structured log sanitization redacts private booking and credential fields",
  () => {
    const sanitized =
      sanitizeForLogs(
        {
          authorization:
            "Bearer abc123",
          nested: {
            providerOfferReference:
              "private-offer",
            safe:
              "visible",
          },
          url:
            "https://example.test/path?token=secret-token&safe=yes",
        },
        {
          secretValues: [
            "secret-token",
          ],
        }
      );

    assert.equal(
      sanitized.authorization,
      "[REDACTED]"
    );

    assert.equal(
      sanitized.nested
        .providerOfferReference,
      "[REDACTED]"
    );

    assert.equal(
      sanitized.nested.safe,
      "visible"
    );

    assert.equal(
      JSON.stringify(
        sanitized
      ).includes(
        "secret-token"
      ),
      false
    );
  }
);
