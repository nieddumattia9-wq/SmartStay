import readline from "node:readline";
import { createRequire } from "node:module";

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
});

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

async function main() {
  const initialPing = await state.ping();

  if (initialPing !== "PONG") {
    throw new Error(
      "Initial shared-state PING failed."
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
      try {
        await state.searchSessionStore
          .getSearchSessionState(
            "ss2.33333333-3333-4333-8333-333333333333"
          );

        throw new Error(
          "Shared-state outage did not fail closed."
        );
      } catch (error) {
        if (
          error?.code !==
          "OPERATIONAL_STATE_UNAVAILABLE"
        ) {
          throw error;
        }

        output("OUTAGE_FAIL_CLOSED", {
          errorCode: error.code,
        });
      }
    } else if (command === "PROBE_RECOVERY") {
      await retryPing();
      output("RECONNECT_PASS");
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
    await state.close();
  });
