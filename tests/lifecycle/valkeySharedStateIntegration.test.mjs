import assert from "node:assert/strict";
import test from "node:test";
import { fork } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

const {
  createClient,
} = require(
  "../../server/node_modules/redis"
);

const valkeyUrl =
  process.env.SMARTSTAY_TEST_VALKEY_URL;
const integrationEnabled =
  typeof valkeyUrl === "string" &&
  valkeyUrl.trim().length > 0;
const workerPath = fileURLToPath(
  new URL(
    "../fixtures/valkeySharedStateWorker.mjs",
    import.meta.url
  )
);
const environment =
  `c2b${process.pid}${Date.now()}`
    .toLowerCase()
    .slice(0, 32);
const hmacSecret =
  "smartstay-4c2b-real-valkey-test-secret-2026";

function createState(overrides = {}) {
  return createValkeyOperationalState({
    url: valkeyUrl,
    environment,
    hmacSecret,
    connectTimeoutMs: 2_000,
    commandTimeoutMs: 2_000,
    sessionTtlMs: 250,
    tombstoneRetentionMs: 500,
    continuationLeaseTtlMs: 150,
    maxSessions: 50,
    maxSessionBytes: 16 * 1024,
    aggregateSessionBytes:
      256 * 1024,
    idempotencyTtlMs: 5_000,
    idempotencyPendingWaitMs: 5_000,
    idempotencyPendingPollMs: 20,
    verificationTtlMs: 2_000,
    handoffTtlMs: 2_000,
    ...overrides,
  });
}

async function cleanupNamespace() {
  const client = createClient({
    url: valkeyUrl,
    disableOfflineQueue: true,
  });
  client.on("error", () => {});

  try {
    await client.connect();

    const keys = [];

    for await (
      const batch of client.scanIterator({
        MATCH: `ss:v1:${environment}:*`,
        COUNT: 100,
      })
    ) {
      if (Array.isArray(batch)) {
        keys.push(...batch);
      } else {
        keys.push(batch);
      }
    }

    if (keys.length > 0) {
      await client.del(keys);
    }
  } finally {
    if (client.isOpen) {
      client.destroy();
    }
  }
}

function runWorker(operation, extraEnvironment = {}) {
  return new Promise((resolve, reject) => {
    const child = fork(
      workerPath,
      [],
      {
        env: {
          ...process.env,
          SMARTSTAY_TEST_VALKEY_URL:
            valkeyUrl,
          SMARTSTAY_TEST_STATE_ENVIRONMENT:
            environment,
          SMARTSTAY_TEST_STATE_SECRET:
            hmacSecret,
          SMARTSTAY_TEST_WORKER_OPERATION:
            operation,
          ...extraEnvironment,
        },
        stdio: [
          "ignore",
          "pipe",
          "pipe",
          "ipc",
        ],
      }
    );
    let stderr = "";
    let message = null;
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `Valkey worker timeout: ${stderr}`
        )
      );
    }, 12_000);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("message", (value) => {
      message = value;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);

      if (code !== 0 || !message?.ok) {
        reject(
          new Error(
            `Valkey worker failed (${code}): ${stderr || message?.errorMessage || "unknown"}`
          )
        );
        return;
      }

      resolve(message);
    });
  });
}

test(
  "real Valkey provides cross-client session CAS, tombstones, leases and fencing",
  {
    skip: !integrationEnabled,
    timeout: 15_000,
  },
  async () => {
    await cleanupNamespace();

    const first = createState();
    const second = createState();

    try {
      assert.equal(await first.ping(), "PONG");

      const session =
        await first.searchSessionStore
          .saveSearchSession({
            hotels: [],
            marker: "cross-client",
            continuationFencingNumber: 7,
          });

      assert.match(
        session.searchId,
        /^ss2\.[0-9a-f-]{36}$/
      );
      assert.equal(
        (
          await second.searchSessionStore
            .requireSearchSession(
              session.searchId
            )
        ).marker,
        "cross-client"
      );

      await Promise.all([
        first.searchSessionStore
          .appendHotelsToSearchSession(
            session.searchId,
            [{ id: "hotel-a" }]
          ),
        second.searchSessionStore
          .appendHotelsToSearchSession(
            session.searchId,
            [{ id: "hotel-b" }]
          ),
      ]);

      const merged =
        await first.searchSessionStore
          .requireSearchSession(
            session.searchId
          );

      assert.deepEqual(
        merged.hotels
          .map((hotel) => hotel.id)
          .sort(),
        ["hotel-a", "hotel-b"]
      );

      const firstLease =
        await first.continuationLeaseStore
          .tryAcquireSearchContinuation(
            session.searchId
          );
      const blockedLease =
        await second.continuationLeaseStore
          .tryAcquireSearchContinuation(
            session.searchId
          );

      assert.equal(firstLease.acquired, true);
      assert.ok(firstLease.fencingNumber > 7);
      assert.equal(blockedLease.acquired, false);
      assert.equal(
        (
          await first.continuationLeaseStore
            .renewSearchContinuation(
              session.searchId,
              firstLease.lockToken,
              firstLease.fencingNumber
            )
        ).renewed,
        true
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 190)
      );

      const secondLease =
        await second.continuationLeaseStore
          .tryAcquireSearchContinuation(
            session.searchId
          );

      assert.equal(secondLease.acquired, true);
      assert.ok(
        secondLease.fencingNumber >
          firstLease.fencingNumber
      );

      await assert.rejects(
        () =>
          first.searchSessionStore
            .updateSearchSession(
              session.searchId,
              { marker: "stale-write" },
              {
                lockToken:
                  firstLease.lockToken,
                fencingNumber:
                  firstLease.fencingNumber,
              }
            ),
        (error) =>
          error?.code ===
          "SEARCH_CONTINUATION_LEASE_STALE"
      );

      const released =
        await second.continuationLeaseStore
          .releaseSearchContinuation(
            session.searchId,
            secondLease.lockToken,
            { marker: "fresh-write" },
            {
              fencingNumber:
                secondLease.fencingNumber,
            }
          );

      assert.equal(released.released, true);
      assert.equal(
        released.session.marker,
        "fresh-write"
      );

      const expiring =
        await first.searchSessionStore
          .saveSearchSession({
            hotels: [],
          });

      await new Promise((resolve) =>
        setTimeout(resolve, 310)
      );
      assert.equal(
        await second.searchSessionStore
          .getSearchSessionState(
            expiring.searchId
          ),
        "expired"
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );
      assert.equal(
        await second.searchSessionStore
          .getSearchSessionState(
            expiring.searchId
          ),
        "not_found"
      );
    } finally {
      await Promise.all([
        first.close(),
        second.close(),
      ]);
      await cleanupNamespace();
    }
  }
);

test(
  "real Valkey shares verification state and atomically consumes one handoff once",
  {
    skip: !integrationEnabled,
    timeout: 15_000,
  },
  async () => {
    await cleanupNamespace();

    const first = createState();
    const second = createState();

    try {
      const verification =
        await first.bookingVerificationStore
          .saveBookingVerification({
            searchId:
              "ss2.22222222-2222-4222-8222-222222222222",
            hotelId: "hotel-1",
            originalOfferId: "offer-1",
            confirmedOffer: {
              id: "offer-1",
              totalKnownCost: 100,
              currency: "EUR",
            },
            sourceProvider: "provider-a",
            providerBookingReference:
              "private-reference",
          });
      const crossClientVerification =
        await second.bookingVerificationStore
          .requireBookingVerification(
            verification.verificationId
          );

      assert.equal(
        crossClientVerification.hotelId,
        "hotel-1"
      );
      assert.equal(
        Object.hasOwn(
          crossClientVerification,
          "schemaVersion"
        ),
        false
      );

      const handoff =
        await first.bookingHandoffStore
          .saveBookingHandoff({
            verificationId:
              verification.verificationId,
            sourceProvider: "provider-a",
            redirectUrl:
              "https://checkout.example/booking",
          });

      const results = await Promise.all([
        runWorker("handoff-consume", {
          SMARTSTAY_TEST_HANDOFF_ID:
            handoff.handoffId,
        }),
        runWorker("handoff-consume", {
          SMARTSTAY_TEST_HANDOFF_ID:
            handoff.handoffId,
        }),
      ]);

      assert.equal(
        results.filter(
          (result) => result.consumed
        ).length,
        1
      );
      assert.equal(
        results.filter(
          (result) =>
            result.errorCode ===
            "BOOKING_HANDOFF_EXPIRED"
        ).length,
        1
      );
    } finally {
      await Promise.all([
        first.close(),
        second.close(),
      ]);
      await cleanupNamespace();
    }
  }
);

test(
  "two processes coalesce one idempotent execution and never expose the raw key in Valkey",
  {
    skip: !integrationEnabled,
    timeout: 15_000,
  },
  async () => {
    await cleanupNamespace();

    const idempotencyKey =
      "4c2b-two-process-idempotency-key";

    try {
      const results = await Promise.all([
        runWorker("idempotency", {
          SMARTSTAY_TEST_IDEMPOTENCY_KEY:
            idempotencyKey,
        }),
        runWorker("idempotency", {
          SMARTSTAY_TEST_IDEMPOTENCY_KEY:
            idempotencyKey,
        }),
      ]);

      assert.equal(
        results.reduce(
          (total, result) =>
            total + result.executions,
          0
        ),
        1
      );
      assert.equal(
        results[0].result.response.searchId,
        results[1].result.response.searchId
      );
      assert.equal(
        results.filter(
          (result) =>
            result.result.coalesced ||
            result.result.replayed
        ).length,
        1
      );

      const client = createClient({
        url: valkeyUrl,
        disableOfflineQueue: true,
      });
      client.on("error", () => {});

      try {
        await client.connect();
        const keys = [];

        for await (
          const batch of client.scanIterator({
            MATCH:
              `ss:v1:${environment}:*`,
            COUNT: 100,
          })
        ) {
          keys.push(
            ...(Array.isArray(batch)
              ? batch
              : [batch])
          );
        }

        assert.equal(
          keys.some((key) =>
            key.includes(idempotencyKey)
          ),
          false
        );
      } finally {
        if (client.isOpen) {
          client.destroy();
        }
      }
    } finally {
      await cleanupNamespace();
    }
  }
);

test(
  "real Valkey enforces atomic session, idempotency and booking capacity bounds",
  {
    skip: !integrationEnabled,
    timeout: 15_000,
  },
  async () => {
    await cleanupNamespace();

    const state = createState({
      maxSessions: 2,
      idempotencyMaxRecords: 2,
      maxBookingVerifications: 2,
      maxBookingHandoffs: 2,
    });

    try {
      await state.searchSessionStore
        .saveSearchSession({ hotels: [] });
      await state.searchSessionStore
        .saveSearchSession({ hotels: [] });

      await assert.rejects(
        () =>
          state.searchSessionStore
            .saveSearchSession({ hotels: [] }),
        (error) =>
          error?.code ===
          "SEARCH_SESSION_CAPACITY_REACHED"
      );

      let executions = 0;

      for (let index = 0; index < 3; index += 1) {
        await state
          .initialSearchIdempotencyStore
          .executeInitialSearchIdempotently({
            idempotencyKey:
              `4c2b-capacity-idempotency-${index}`,
            payload: { index },
            execute: async () => {
              executions += 1;

              return {
                success: true,
                searchId:
                  `ss2.44444444-4444-4444-8444-${String(index).padStart(12, "0")}`,
                marker: "bounded",
              };
            },
          });
      }

      assert.equal(executions, 3);
      assert.equal(
        await state
          .initialSearchIdempotencyStore
          .getSearchIdempotencyRecordCount(),
        2
      );
      const storedResponseBytes =
        await state
          .initialSearchIdempotencyStore
          .getSearchIdempotencyStoredResponseBytes();

      assert.ok(
        storedResponseBytes <=
          64 * 1024 * 1024,
        `${storedResponseBytes} shared response bytes exceed the configured budget.`
      );

      const verificationInput = {
        searchId:
          "ss2.55555555-5555-4555-8555-555555555555",
        hotelId: "hotel-capacity",
        originalOfferId: "offer-capacity",
        confirmedOffer: {
          id: "offer-capacity",
        },
        sourceProvider: "provider-a",
      };

      await state.bookingVerificationStore
        .saveBookingVerification(
          verificationInput
        );
      await state.bookingVerificationStore
        .saveBookingVerification(
          verificationInput
        );

      await assert.rejects(
        () =>
          state.bookingVerificationStore
            .saveBookingVerification(
              verificationInput
            ),
        (error) =>
          error?.code ===
          "BOOKING_VERIFICATION_CAPACITY_REACHED"
      );

      const handoffInput = {
        verificationId:
          "verify-666666666666666666666666666666666666",
        sourceProvider: "provider-a",
        redirectUrl:
          "https://checkout.example/capacity",
      };

      await state.bookingHandoffStore
        .saveBookingHandoff(handoffInput);
      await state.bookingHandoffStore
        .saveBookingHandoff(handoffInput);

      await assert.rejects(
        () =>
          state.bookingHandoffStore
            .saveBookingHandoff(handoffInput),
        (error) =>
          error?.code ===
          "BOOKING_HANDOFF_CAPACITY_REACHED"
      );
    } finally {
      await state.close();
      await cleanupNamespace();
    }
  }
);
