import express from "../../server/node_modules/express/index.js";
import readline from "node:readline";
import {
  createRequire,
} from "node:module";

const require =
  createRequire(import.meta.url);

const {
  createApp,
} = require(
  "../../server/app.js"
);

const {
  createRuntimeSecurityConfig,
} = require(
  "../../server/config/runtimeSecurityConfig.js"
);

const {
  createSecurityLogger,
} = require(
  "../../server/observability/securityLogger.js"
);

const {
  closeOperationalState,
  getOperationalState,
} = require(
  "../../server/state/operationalState.js"
);

const workerId =
  "123e4567-e89b-42d3-a456-426614174590";
const heartbeatToken =
  "123e4567-e89b-42d3-a456-426614174591";
const startedAt =
  Date.now();

function output(
  marker,
  details =
    {}
) {
  process.stdout.write(
    `${JSON.stringify({
      marker,
      ...details,
    })}\n`
  );
}

function delay(
  milliseconds
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

async function listen(
  app
) {
  return new Promise(
    (resolve, reject) => {
      const server =
        app.listen(
          0,
          "127.0.0.1",
          () =>
            resolve(server)
        );

      server.on(
        "error",
        reject
      );
    }
  );
}

async function closeServer(
  server
) {
  if (!server) {
    return;
  }

  await new Promise(
    (resolve) =>
      server.close(
        resolve
      )
  );
}

async function readHealth(
  baseUrl
) {
  const [
    liveness,
    readiness,
  ] = await Promise.all([
    fetch(
      `${baseUrl}/health/live`
    ),
    fetch(
      `${baseUrl}/health/ready`
    ),
  ]);

  return {
    liveness:
      liveness.status,
    readiness:
      readiness.status,
  };
}

async function main() {
  const operationalState =
    getOperationalState();
  const admission =
    operationalState
      .searchQueueAdmission;
  const config =
    createRuntimeSecurityConfig({
      environment:
        {},
      overrides: {
        nodeEnv:
          "test",
        allowedOrigins: [
          "http://127.0.0.1",
        ],
        rateLimitWindowMs:
          60_000,
        rateLimitMaxRequests:
          100,
      },
    });
  const logger =
    createSecurityLogger({
      environment:
        {},
      write() {},
    });
  const {
    app,
  } = createApp({
    config,
    logger,
    operationalState,
    searchRoutes:
      express.Router(),
  });
  let server =
    null;

  async function registerHeartbeat() {
    return admission
      .writeSearchWorkerHeartbeat({
        workerId,
        heartbeatToken,
        state:
          "ready",
        startedAt,
      });
  }

  async function retryRecovery() {
    const deadline =
      Date.now() +
      20_000;
    let lastError =
      null;

    while (
      Date.now() <
      deadline
    ) {
      try {
        await operationalState
          .getReadinessSnapshot();
        await registerHeartbeat();

        return;
      }
      catch (error) {
        lastError =
          error;
      }

      await delay(
        200
      );
    }

    throw lastError ??
      new Error(
        "Operational readiness reconnect timeout."
      );
  }

  try {
    await registerHeartbeat();
    server =
      await listen(app);
    const address =
      server.address();
    const baseUrl =
      `http://127.0.0.1:${address.port}`;
    const initial =
      await readHealth(
        baseUrl
      );

    if (
      initial.liveness !==
        200 ||
      initial.readiness !==
        200
    ) {
      throw new Error(
        "Initial operational health was not ready."
      );
    }

    output(
      "READY",
      initial
    );

    const input =
      readline.createInterface({
        input:
          process.stdin,
        crlfDelay:
          Infinity,
      });

    for await (
      const rawLine of input
    ) {
      const command =
        rawLine.trim();

      if (
        command ===
        "PROBE_OUTAGE"
      ) {
        const started =
          Date.now();
        const outage =
          await readHealth(
            baseUrl
          );

        if (
          outage.liveness !==
            200 ||
          outage.readiness !==
            503
        ) {
          throw new Error(
            "Operational health did not separate liveness from readiness during outage."
          );
        }

        output(
          "OUTAGE_NOT_READY",
          {
            ...outage,
            elapsedMs:
              Date.now() -
              started,
          }
        );
      }
      else if (
        command ===
        "PROBE_RECOVERY"
      ) {
        await retryRecovery();
        const recovered =
          await readHealth(
            baseUrl
          );

        if (
          recovered.liveness !==
            200 ||
          recovered.readiness !==
            200
        ) {
          throw new Error(
            "Operational readiness did not recover on the same clients."
          );
        }

        output(
          "RECONNECT_READY",
          recovered
        );

        return;
      }
      else {
        throw new Error(
          "Unknown operational readiness probe command."
        );
      }
    }
  }
  finally {
    await closeServer(
      server
    );

    try {
      await admission
        .removeSearchWorkerHeartbeat({
          workerId,
          heartbeatToken,
        });
    }
    catch {
      // Heartbeat expiry remains the fail-safe cleanup after an outage.
    }

    await closeOperationalState();
  }
}

main().catch(
  (error) => {
    output(
      "FAIL",
      {
        errorCode:
          error?.code ??
          null,
        errorMessage:
          error?.message ??
          "Operational readiness outage probe failed.",
      }
    );
    process.exitCode =
      1;
  }
);
