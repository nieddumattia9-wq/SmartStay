import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const {
  createValkeyOperationalState,
  getOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

const {
  createValkeyKeyspace,
} = require(
  "../../server/state/valkey/valkeyShared.js"
);

const {
  parseProviderAccountRateLimits,
} = require(
  "../../server/state/valkey/valkeyProviderCapacityCoordinator.js"
);

const {
  createSharedStoreFailureHandler,
} = require(
  "../../server/state/valkey/valkeyEndpointRateLimitStore.js"
);

const root = process.cwd();

test(
  "4C3 keeps in-memory default while all provider-protection ports become distributed in Valkey mode",
  async () => {
    assert.equal(
      getOperationalState().mode,
      "in-memory-single-instance"
    );

    const state =
      createValkeyOperationalState({
        url:
          "redis://127.0.0.1:6389/15",
        environment:
          "c3-contract",
        hmacSecret:
          "smartstay-4c3-contract-secret-at-least-32-bytes",
        providerAccountRateLimits: {
          "*": {
            maxRequests: 10,
            windowMs: 1_000,
          },
        },
      });

    try {
      assert.equal(
        state.distributed,
        true
      );
      assert.equal(
        state
          .endpointRateLimitStoreFactory
          .implementation,
        "valkey-distributed"
      );
      assert.equal(
        state
          .providerCapacityCoordinator
          .implementation,
        "valkey-distributed"
      );
      assert.equal(
        state.providerHealthStore
          .implementation,
        "valkey-distributed"
      );
      assert.deepEqual(
        state.deferredStages,
        {
          searchQueueAdmission:
            "39C25A.4C4",
        }
      );
      assert.equal(
        state.searchQueueAdmission
          .implementation,
        "in-memory-deferred"
      );
      assert.equal(
        state.productionReady,
        false
      );
    } finally {
      await state.close();
    }
  }
);

test(
  "rate-limit clients and provider coordination use environment-scoped HMAC keys",
  () => {
    const keyspace =
      createValkeyKeyspace({
        environment:
          "c3-contract",
        hmacSecret:
          "smartstay-4c3-contract-secret-at-least-32-bytes",
      });
    const rawIp =
      "203.0.113.42";
    const rawProvider =
      "provider-private-account";
    const keys = [
      keyspace.endpointRateLimit(
        "hotel-search",
        rawIp
      ),
      keyspace.providerCapacity(
        rawProvider
      ),
      keyspace.providerAccountRate(
        rawProvider
      ),
      keyspace.providerCircuit(
        rawProvider
      ),
    ];

    for (const key of keys) {
      assert.match(
        key,
        /^ss:v1:c3-contract:[a-z0-9:-]+:[a-f0-9]{64}$/
      );
      assert.equal(
        key.includes(rawIp),
        false
      );
      assert.equal(
        key.includes(rawProvider),
        false
      );
    }
  }
);

test(
  "account-level provider quotas are validated and mandatory for live distributed modes",
  async () => {
    assert.deepEqual(
      parseProviderAccountRateLimits(
        JSON.stringify({
          "provider-a": {
            maxRequests: 25,
            windowMs: 1_000,
          },
        })
      ),
      {
        "provider-a": {
          maxRequests: 25,
          windowMs: 1_000,
        },
      }
    );

    assert.throws(
      () =>
        createValkeyOperationalState({
          url:
            "redis://127.0.0.1:6389/15",
          environment:
            "c3-contract",
          hmacSecret:
            "smartstay-4c3-contract-secret-at-least-32-bytes",
          providerAccountRateLimitsRequired:
            true,
          providerAccountRateLimits: {},
        }),
      (error) =>
        error?.code ===
          "OPERATIONAL_STATE_CONFIGURATION_INVALID" &&
        error?.status === 500
    );

    const state =
      createValkeyOperationalState({
        url:
          "redis://127.0.0.1:6389/15",
        environment:
          "c3-contract",
        hmacSecret:
          "smartstay-4c3-contract-secret-at-least-32-bytes",
        providerAccountRateLimitsRequired:
          true,
        providerAccountRateLimits: {
          "provider-a": {
            maxRequests: 25,
            windowMs: 1_000,
          },
        },
      });

    await state.close();
  }
);

test(
  "shared rate-limit store failure produces a bounded fail-closed 503 contract",
  () => {
    const headers = {};
    let status = null;
    let body = null;
    const handler =
      createSharedStoreFailureHandler({
        scope: "hotel-search",
        retryAfterMs: 500,
      });
    const response = {
      set(name, value) {
        headers[name] = value;
        return this;
      },
      status(value) {
        status = value;
        return this;
      },
      json(value) {
        body = value;
        return this;
      },
    };

    handler(
      {
        code:
          "OPERATIONAL_STATE_UNAVAILABLE",
      },
      {
        method: "POST",
        path:
          "/api/search-hotels",
        requestId:
          "request-contract",
        log: {
          warn() {},
        },
      },
      response
    );

    assert.equal(status, 503);
    assert.equal(
      headers["Retry-After"],
      "1"
    );
    assert.deepEqual(body, {
      success: false,
      code:
        "RATE_LIMIT_STORE_UNAVAILABLE",
      message:
        "Request protection is temporarily unavailable. Please try again shortly.",
      retryAfterMs: 500,
      requestId:
        "request-contract",
    });
  }
);

test(
  "provider orchestration awaits shared circuit transitions and remains infrastructure-neutral",
  () => {
    const files = [
      "server/providers/accommodationProviderOrchestrator.js",
      "server/providers/destinationSearchOrchestrator.js",
    ];

    for (const relativePath of files) {
      const source =
        fs.readFileSync(
          path.join(
            root,
            relativePath
          ),
          "utf8"
        );

      assert.doesNotMatch(
        source,
        /require\(["'](?:redis|bullmq|ioredis)["']\)/
      );
      assert.doesNotMatch(
        source,
        /(?<!await )beginProviderAttempt\(/
      );
      assert.doesNotMatch(
        source,
        /(?<!await )recordProviderHealthyResponse\(/
      );
      assert.doesNotMatch(
        source,
        /(?<!await )recordProviderFailure\(/
      );
      assert.match(
        source,
        /attemptToken:\s*permission\.attemptToken/
      );
    }
  }
);
