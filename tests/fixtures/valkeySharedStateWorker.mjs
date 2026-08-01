import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

function send(message) {
  if (typeof process.send === "function") {
    process.send(message);
  } else {
    process.stdout.write(
      `${JSON.stringify(message)}\n`
    );
  }
}

async function main() {
  const state = createValkeyOperationalState({
    url:
      process.env.SMARTSTAY_TEST_VALKEY_URL,
    environment:
      process.env.SMARTSTAY_TEST_STATE_ENVIRONMENT,
    hmacSecret:
      process.env.SMARTSTAY_TEST_STATE_SECRET,
    commandTimeoutMs: 2_000,
    connectTimeoutMs: 2_000,
    idempotencyPendingWaitMs: 10_000,
    idempotencyPendingPollMs: 25,
  });

  try {
    if (
      process.env.SMARTSTAY_TEST_WORKER_OPERATION ===
      "idempotency"
    ) {
      let executions = 0;

      const result =
        await state
          .initialSearchIdempotencyStore
          .executeInitialSearchIdempotently({
            idempotencyKey:
              process.env
                .SMARTSTAY_TEST_IDEMPOTENCY_KEY,
            payload: {
              city: "Firenze",
              checkin: "2026-08-07",
              checkout: "2026-08-10",
            },
            execute: async () => {
              executions += 1;

              await new Promise((resolve) =>
                setTimeout(resolve, 150)
              );

              return {
                success: true,
                searchId:
                  "ss2.11111111-1111-4111-8111-111111111111",
                executedBy:
                  process.pid,
              };
            },
          });

      send({
        ok: true,
        operation: "idempotency",
        executions,
        result,
      });

      return;
    }

    if (
      process.env.SMARTSTAY_TEST_WORKER_OPERATION ===
      "handoff-consume"
    ) {
      try {
        const handoff =
          await state
            .bookingHandoffStore
            .requireBookingHandoff(
              process.env
                .SMARTSTAY_TEST_HANDOFF_ID
            );

        send({
          ok: true,
          operation: "handoff-consume",
          consumed: true,
          handoff,
        });
      } catch (error) {
        send({
          ok: true,
          operation: "handoff-consume",
          consumed: false,
          errorCode:
            error?.code ?? null,
        });
      }

      return;
    }

    throw new Error(
      "Unknown Valkey worker operation."
    );
  } finally {
    await state.close();
  }
}

main().catch((error) => {
  send({
    ok: false,
    errorCode:
      error?.code ?? null,
    errorMessage:
      error?.message ?? "worker failure",
  });
  process.exitCode = 1;
});
