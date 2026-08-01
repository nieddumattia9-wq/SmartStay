import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  OPERATIONAL_STATE_MODES,
  OPERATIONAL_STATE_PORT_CONTRACTS,
} = require(
  "../../server/state/operationalStateContracts.js"
);

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

test(
  "4C2 keeps in-memory as the default and declares explicit Valkey distributed mode",
  () => {
    const previous =
      process.env
        .SMARTSTAY_OPERATIONAL_STATE_MODE;

    delete process.env
      .SMARTSTAY_OPERATIONAL_STATE_MODE;

    try {
      assert.equal(
        getOperationalState().mode,
        OPERATIONAL_STATE_MODES
          .IN_MEMORY_SINGLE_INSTANCE
      );

      assert.equal(
        OPERATIONAL_STATE_MODES
          .VALKEY_DISTRIBUTED,
        "valkey-distributed"
      );
    } finally {
      if (previous === undefined) {
        delete process.env
          .SMARTSTAY_OPERATIONAL_STATE_MODE;
      } else {
        process.env
          .SMARTSTAY_OPERATIONAL_STATE_MODE =
            previous;
      }
    }
  }
);

test(
  "client-derived shared keys use environment-scoped HMAC identifiers",
  () => {
    const keyspace = createValkeyKeyspace({
      environment: "contract-test",
      hmacSecret:
        "contract-test-secret-with-more-than-32-bytes",
    });
    const rawIdempotencyKey =
      "browser-visible-idempotency-key";
    const sharedKey = keyspace.idempotency(
      rawIdempotencyKey
    );

    assert.match(
      sharedKey,
      /^ss:v1:contract-test:initial-search-idempotency:[a-f0-9]{64}$/
    );
    assert.equal(
      sharedKey.includes(rawIdempotencyKey),
      false
    );
  }
);

test(
  "Valkey composition refuses incomplete or unsafe configuration before connecting",
  () => {
    assert.throws(
      () =>
        createValkeyOperationalState({
          url: "http://127.0.0.1:6389",
          environment: "contract-test",
          hmacSecret:
            "contract-test-secret-with-more-than-32-bytes",
        }),
      (error) =>
        error?.code ===
        "OPERATIONAL_STATE_CONFIGURATION_INVALID"
    );

    assert.throws(
      () =>
        createValkeyOperationalState({
          url: "redis://127.0.0.1:6389/15",
          environment: "contract-test",
          hmacSecret: "too-short",
        }),
      (error) =>
        error?.code ===
        "OPERATIONAL_STATE_CONFIGURATION_INVALID"
    );
  }
);

test(
  "continuation contract exposes renewal and fencing-capable adapters",
  () => {
    assert.deepEqual(
      OPERATIONAL_STATE_PORT_CONTRACTS
        .continuationLeaseStore
        .methods,
      [
        "tryAcquireSearchContinuation",
        "renewSearchContinuation",
        "releaseSearchContinuation",
      ]
    );
  }
);
