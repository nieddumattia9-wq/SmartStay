import readline from "node:readline";
import { createRequire } from "node:module";
import express from "../../server/node_modules/express/index.js";

const require = createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

const state = createValkeyOperationalState({
  url: process.env.SMARTSTAY_TEST_VALKEY_URL,
  environment:
    process.env.SMARTSTAY_TEST_STATE_ENVIRONMENT,
  hmacSecret:
    process.env.SMARTSTAY_TEST_STATE_SECRET,
  connectTimeoutMs: 1_000,
  commandTimeoutMs: 1_500,
  providerGlobalActiveLimit: 8,
  providerPerProviderActiveLimit: 8,
  providerAccountRateLimits: {
    "*": {
      maxRequests: 100,
      windowMs: 10_000,
    },
  },
  providerCircuitFailureThreshold: 3,
  providerCircuitCooldownMs: 1_000,
});

let endpointServer = null;
let endpointUrl = null;

function output(marker, details = {}) {
  process.stdout.write(
    `${JSON.stringify({ marker, ...details })}\n`
  );
}

async function retryPing() {
  const deadline = Date.now() + 15_000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await state.ping();

      if (response === "PONG") {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 200)
    );
  }

  throw lastError ??
    new Error("Valkey reconnect timeout.");
}

async function startEndpointProbe() {
  const app = express();
  const limiter =
    state
      .endpointRateLimitStoreFactory
      .createLimiter({
        policy: {
          windowMs: 10_000,
          maxRequests: 100,
        },
        scope: "outage-probe",
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

  endpointServer =
    await new Promise(
      (resolve, reject) => {
        const server = app.listen(
          0,
          "127.0.0.1",
          () => resolve(server)
        );
        server.on("error", reject);
      }
    );
  const address =
    endpointServer.address();
  endpointUrl =
    `http://127.0.0.1:${address.port}/probe`;
}

async function stopEndpointProbe() {
  if (!endpointServer) {
    return;
  }

  await new Promise(
    (resolve) => {
      endpointServer.close(() =>
        resolve()
      );
    }
  );
  endpointServer = null;
}

async function fetchEndpointProbe() {
  const response =
    await fetch(endpointUrl);
  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status,
    body,
    retryAfter:
      response.headers.get(
        "retry-after"
      ),
  };
}

async function requireUnavailable(
  operation
) {
  try {
    await operation();
  } catch (error) {
    if (
      error?.code ===
      "OPERATIONAL_STATE_UNAVAILABLE"
    ) {
      return error.code;
    }

    throw error;
  }

  throw new Error(
    "Shared provider protection did not fail closed."
  );
}

async function main() {
  const initialPing = await state.ping();

  if (initialPing !== "PONG") {
    throw new Error(
      "Initial shared-state PING failed."
    );
  }

  await startEndpointProbe();
  const initialEndpoint =
    await fetchEndpointProbe();

  if (initialEndpoint.status !== 200) {
    throw new Error(
      "Initial shared endpoint rate-limit probe failed."
    );
  }

  output("READY");

  const input = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const rawLine of input) {
    const command = rawLine.trim();

    if (command === "PROBE_OUTAGE") {
      const sessionError =
        await requireUnavailable(
          () =>
            state.searchSessionStore
              .getSearchSessionState(
                "ss2.33333333-3333-4333-8333-333333333333"
              )
        );
      const capacityError =
        await requireUnavailable(
          () =>
            state
              .providerCapacityCoordinator
              .acquireProviderOperationCapacity({
                providerId:
                  "provider-a",
                methodName:
                  "searchHotels",
                signal:
                  new AbortController()
                    .signal,
              })
        );
      const healthError =
        await requireUnavailable(
          () =>
            state.providerHealthStore
              .beginProviderAttempt(
                "provider-a"
              )
        );
      const endpoint =
        await fetchEndpointProbe();

      if (
        endpoint.status !== 503 ||
        endpoint.body?.code !==
          "RATE_LIMIT_STORE_UNAVAILABLE" ||
        !endpoint.retryAfter
      ) {
        throw new Error(
          "Shared endpoint rate limit did not fail closed with a bounded 503."
        );
      }

      output("OUTAGE_FAIL_CLOSED", {
        errorCode: sessionError,
        capacityError,
        healthError,
        endpointStatus:
          endpoint.status,
        endpointCode:
          endpoint.body.code,
      });
    } else if (command === "PROBE_RECOVERY") {
      await retryPing();
      const controller =
        new AbortController();
      const release =
        await state
          .providerCapacityCoordinator
          .acquireProviderOperationCapacity({
            providerId:
              "provider-a",
            methodName:
              "searchHotels",
            signal:
              controller.signal,
          });
      await release();
      const permission =
        await state.providerHealthStore
          .beginProviderAttempt(
            "provider-a"
          );

      if (!permission.allowed) {
        throw new Error(
          "Provider health did not recover after shared-state reconnect."
        );
      }

      await state.providerHealthStore
        .recordProviderHealthyResponse(
          "provider-a",
          {
            attemptToken:
              permission.attemptToken,
          }
        );

      const endpoint =
        await fetchEndpointProbe();

      if (endpoint.status !== 200) {
        throw new Error(
          "Endpoint rate limit did not recover after shared-state reconnect."
        );
      }

      output("RECONNECT_PASS", {
        capacity: "PASS",
        providerHealth: "PASS",
        endpointRateLimit: "PASS",
      });
      return;
    } else {
      throw new Error(
        "Unknown outage probe command."
      );
    }
  }
}

main()
  .catch((error) => {
    output("FAIL", {
      errorCode: error?.code ?? null,
      errorMessage:
        error?.message ?? "probe failure",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopEndpointProbe();
    await state.close();
  });
