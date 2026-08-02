import readline from "node:readline";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createBullMqSearchQueueAdmission,
} = require(
  "../../server/queue/searchQueueAdmission.js"
);

const {
  getSearchQueueConfig,
} = require(
  "../../server/queue/searchQueueConfig.js"
);

const config =
  getSearchQueueConfig();
const admission =
  createBullMqSearchQueueAdmission({
    config,
  });

function fingerprint(payload) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(payload)
    )
    .digest("hex");
}

function output(marker, details = {}) {
  process.stdout.write(
    `${JSON.stringify({
      marker,
      ...details,
    })}\n`
  );
}

function delay(milliseconds) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

async function retryPing() {
  const deadline =
    Date.now() + 15_000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response =
        await admission.ping();

      if (response === "PONG") {
        return response;
      }
    }
    catch (error) {
      lastError = error;
    }

    await delay(200);
  }

  throw lastError ??
    new Error(
      "Search queue reconnect timeout."
    );
}

async function main() {
  if (
    await admission.ping() !==
      "PONG"
  ) {
    throw new Error(
      "Initial search queue PING failed."
    );
  }

  output("READY");

  const input =
    readline.createInterface({
      input:
        process.stdin,
      crlfDelay:
        Infinity,
    });

  for await (const rawLine of input) {
    const command =
      rawLine.trim();

    if (command === "PROBE_OUTAGE") {
      const startedAt =
        Date.now();
      let observed = null;

      try {
        const payload = {
          destinationId:
            "rome",
        };

        await admission.admitSearch({
          idempotencyKey:
            "queue-outage-probe-0001",
          searchId:
            "ss2.123e4567-e89b-42d3-a456-426614174300",
          payload,
          payloadFingerprint:
            fingerprint(payload),
        });
      }
      catch (error) {
        observed = error;
      }

      const elapsedMs =
        Date.now() - startedAt;

      if (
        observed?.code !==
          "SEARCH_QUEUE_UNAVAILABLE" ||
        observed?.status !== 503 ||
        elapsedMs > 5_000
      ) {
        throw new Error(
          "Search queue producer did not fail closed within the bounded outage budget."
        );
      }

      output(
        "OUTAGE_FAIL_CLOSED",
        {
          errorCode:
            observed.code,
          elapsedMs,
        }
      );
    }
    else if (
      command ===
        "PROBE_RECOVERY"
    ) {
      await retryPing();
      const payload = {
        destinationId:
          "rome",
      };
      const queued =
        await admission.admitSearch({
          idempotencyKey:
            "queue-recovery-probe-0001",
          searchId:
            "ss2.123e4567-e89b-42d3-a456-426614174301",
          payload,
          payloadFingerprint:
            fingerprint(payload),
        });
      const released =
        await admission
          .releaseSearchAdmission({
            jobId:
              queued.jobId,
            admissionToken:
              queued
                .admissionToken,
          });

      if (!released) {
        throw new Error(
          "Recovered search queue admission could not be released."
        );
      }

      output(
        "RECONNECT_PASS",
        {
          admitted:
            true,
          released,
        }
      );
      return;
    }
    else {
      throw new Error(
        "Unknown search queue outage probe command."
      );
    }
  }
}

main()
  .catch((error) => {
    output("FAIL", {
      errorCode:
        error?.code ?? null,
      errorMessage:
        error?.message ??
        "search queue outage probe failure",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await admission.close();
  });
