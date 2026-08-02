import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const {
  getSearchQueueConfig,
} = require(
  "../../server/queue/searchQueueConfig.js"
);

const {
  createSearchQueueWorker,
} = require(
  "../../server/queue/searchQueueWorker.js"
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

async function main() {
  const config =
    getSearchQueueConfig();
  const searchWorker =
    createSearchQueueWorker({
      config,
      operationalState: {},
      workerOptions: {
        lockDuration:
          300,
        stalledInterval:
          100,
      },
      async processor(job) {
        send({
          ok:
            true,
          event:
            "active",
          jobId:
            job.id,
        });

        setTimeout(
          () =>
            process.exit(91),
          25
        ).unref();

        await new Promise(
          () => {}
        );
      },
    });

  await searchWorker
    .waitUntilReady();

  send({
    ok:
      true,
    event:
      "ready",
  });
}

main().catch((error) => {
  send({
    ok:
      false,
    event:
      "failed",
    errorCode:
      error?.code ?? null,
    errorMessage:
      error?.message ??
      "search queue crash probe failed",
  });
  process.exitCode = 1;
});
