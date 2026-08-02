import express from "../../server/node_modules/express/index.js";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

function send(message) {
  if (
    typeof process.send ===
    "function"
  ) {
    process.send(message);
    return;
  }

  process.stdout.write(
    `${JSON.stringify(message)}\n`
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createState() {
  return createValkeyOperationalState({
    url:
      process.env
        .SMARTSTAY_TEST_VALKEY_URL,
    environment:
      process.env
        .SMARTSTAY_TEST_STATE_ENVIRONMENT,
    hmacSecret:
      process.env
        .SMARTSTAY_TEST_STATE_SECRET,
    connectTimeoutMs: 2_000,
    commandTimeoutMs: 2_000,
    providerGlobalActiveLimit:
      Number(
        process.env
          .SMARTSTAY_TEST_GLOBAL_ACTIVE
      ) || 8,
    providerPerProviderActiveLimit:
      Number(
        process.env
          .SMARTSTAY_TEST_PROVIDER_ACTIVE
      ) || 8,
    providerGlobalQueuedLimit: 64,
    providerPerProviderQueuedLimit: 64,
    providerLeaseTtlMs:
      Number(
        process.env
          .SMARTSTAY_TEST_LEASE_TTL_MS
      ) || 500,
    providerAcquirePollMs: 10,
    providerAccountRateLimits:
      process.env
        .SMARTSTAY_TEST_ACCOUNT_RATE_LIMITS ??
      {},
    providerCircuitFailureThreshold: 3,
    providerCircuitCooldownMs:
      Number(
        process.env
          .SMARTSTAY_TEST_CIRCUIT_COOLDOWN_MS
      ) || 150,
    providerHalfOpenProbeLeaseMs:
      Number(
        process.env
          .SMARTSTAY_TEST_HALF_OPEN_LEASE_MS
      ) || 500,
  });
}

async function listen(app) {
  return new Promise(
    (resolve, reject) => {
      const server = app.listen(
        0,
        "127.0.0.1",
        () => resolve(server)
      );
      server.on("error", reject);
    }
  );
}

async function closeServer(server) {
  await new Promise(
    (resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    }
  );
}

async function main() {
  const operation =
    process.env
      .SMARTSTAY_TEST_WORKER_OPERATION;
  const state = createState();

  try {
    if (operation === "capacity-hold") {
      const controller =
        new AbortController();
      const release =
        await state
          .providerCapacityCoordinator
          .acquireProviderOperationCapacity({
            providerId: "provider-a",
            methodName: "searchHotels",
            signal:
              controller.signal,
            leaseTtlMs:
              Number(
                process.env
                  .SMARTSTAY_TEST_LEASE_TTL_MS
              ) || 500,
          });

      send({
        ok: true,
        event: "acquired",
        pid: process.pid,
      });

      await delay(
        Number(
          process.env
            .SMARTSTAY_TEST_HOLD_MS
        ) || 180
      );

      const released =
        await release();

      send({
        ok: true,
        event: "released",
        pid: process.pid,
        released,
      });

      return;
    }

    if (operation === "endpoint-burst") {
      const app = express();
      const limiter =
        state
          .endpointRateLimitStoreFactory
          .createLimiter({
            policy: {
              windowMs: 2_000,
              maxRequests: 5,
            },
            scope:
              "integration-probe",
          });

      app.set("trust proxy", false);
      app.get(
        "/probe",
        limiter,
        (_req, res) => {
          res.status(200).json({
            ok: true,
          });
        }
      );

      const server =
        await listen(app);
      const address =
        server.address();
      const statuses = [];

      try {
        for (
          let index = 0;
          index < 3;
          index += 1
        ) {
          const response =
            await fetch(
              `http://127.0.0.1:${address.port}/probe`
            );
          statuses.push(
            response.status
          );
          await response.arrayBuffer();
        }
      } finally {
        await closeServer(server);
      }

      send({
        ok: true,
        event: "complete",
        statuses,
      });

      return;
    }

    if (operation === "health-fail") {
      let health = null;

      for (
        let attempt = 0;
        attempt < 3;
        attempt += 1
      ) {
        health =
          await state
            .providerHealthStore
            .recordProviderFailure(
              "provider-a",
              {
                errorType:
                  "timeout",
                status: 504,
              }
            );
      }

      send({
        ok: true,
        event: "complete",
        health,
      });

      return;
    }

    if (operation === "health-begin") {
      const permission =
        await state
          .providerHealthStore
          .beginProviderAttempt(
            "provider-a"
          );

      send({
        ok: true,
        event: "complete",
        permission,
      });

      return;
    }

    throw new Error(
      "Unknown Valkey provider-protection worker operation."
    );
  } finally {
    await state.close();
  }
}

main().catch((error) => {
  send({
    ok: false,
    event: "failed",
    errorCode:
      error?.code ?? null,
    errorMessage:
      error?.message ??
      "worker failure",
  });
  process.exitCode = 1;
});
