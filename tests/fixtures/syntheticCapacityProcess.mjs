import crypto from "node:crypto";
import { createRequire } from "node:module";
import { monitorEventLoopDelay } from "node:perf_hooks";

import express from "../../server/node_modules/express/index.js";

const require = createRequire(import.meta.url);

const {
  closeOperationalState,
  createValkeyOperationalState,
} = require("../../server/state/operationalState.js");
const {
  createBullMqSearchQueueAdmission,
} = require("../../server/queue/searchQueueAdmission.js");
const {
  getSearchQueueConfig,
} = require("../../server/queue/searchQueueConfig.js");
const {
  createQueuedSearchProcessor,
  createSearchQueueWorker,
} = require("../../server/queue/searchQueueWorker.js");
const {
  configureOperationalLogger,
} = require("../../server/observability/operationalLogger.js");

const silentLogger = Object.freeze({
  debug() {},
  info() {},
  warn() {},
  error() {},
});

configureOperationalLogger({
  logger: silentLogger,
});

const role = String(process.env.SMARTSTAY_CAPACITY_ROLE ?? "").trim();
const webMode = String(
  process.env.SMARTSTAY_CAPACITY_WEB_MODE ?? "public-route"
).trim();
const valkeyUrl = String(
  process.env.SMARTSTAY_TEST_VALKEY_URL ?? ""
).trim();
const environment = String(
  process.env.SMARTSTAY_TEST_STATE_ENVIRONMENT ??
    process.env.SMARTSTAY_STATE_ENVIRONMENT ??
    ""
).trim();
const hmacSecret = String(
  process.env.SMARTSTAY_TEST_STATE_SECRET ??
    process.env.SMARTSTAY_STATE_KEY_SECRET ??
    ""
);
const maximumAdmitted = Number(
  process.env.SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED ?? 1000
);
const workerConcurrency = Number(
  process.env.SMARTSTAY_SEARCH_WORKER_CONCURRENCY ?? 4
);
const providerActiveLimit = Number(
  process.env.PROVIDER_MAX_CONCURRENT_OPERATIONS ?? 8
);
const stubDelayMs = Number(
  process.env.SMARTSTAY_CAPACITY_STUB_DELAY_MS ?? 25
);
const serverCloseTimeoutMs = Math.max(
  1_000,
  Number(
    process.env.SMARTSTAY_CAPACITY_SERVER_CLOSE_TIMEOUT_MS ?? 5_000
  ) || 5_000
);
const crashOnFirstActive =
  process.env.SMARTSTAY_CAPACITY_CRASH_ON_FIRST_ACTIVE === "1";

if (
  !["web", "worker"].includes(role) ||
  !valkeyUrl ||
  !environment ||
  Buffer.byteLength(hmacSecret, "utf8") < 32
) {
  throw new Error("Synthetic capacity process configuration is incomplete.");
}

const eventLoop = monitorEventLoopDelay({
  resolution: 10,
});
const startedCpu = process.cpuUsage();
const startedMemory = process.memoryUsage();

eventLoop.enable();

function send(message) {
  if (typeof process.send === "function" && process.connected) {
    process.send(message);
  }
}

function normalizeMetric(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function processMetrics(extra = {}) {
  const currentCpu = process.cpuUsage(startedCpu);
  const memory = process.memoryUsage();
  const percentile = eventLoop.percentile(95);

  return Object.freeze({
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    rssGrowthBytes: Math.max(0, memory.rss - startedMemory.rss),
    heapGrowthBytes: Math.max(
      0,
      memory.heapUsed - startedMemory.heapUsed
    ),
    cpuUserMs: currentCpu.user / 1000,
    cpuSystemMs: currentCpu.system / 1000,
    eventLoopLagP95Ms: normalizeMetric(percentile / 1_000_000),
    ...extra,
  });
}

function queueConfig() {
  return getSearchQueueConfig({
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED: "true",
    SMARTSTAY_QUEUE_REDIS_URL: valkeyUrl,
    SMARTSTAY_QUEUE_ENVIRONMENT: environment,
    SMARTSTAY_QUEUE_KEY_SECRET: hmacSecret,
    SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED: String(maximumAdmitted),
    SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS: "600000",
    SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS: "2000",
    SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS: "3000",
    SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS: "1000",
    SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS: "3",
    SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS: "100",
    SMARTSTAY_SEARCH_WORKER_CONCURRENCY: String(workerConcurrency),
    SMARTSTAY_SEARCH_WORKER_START_TIMEOUT_MS: String(
      process.env.SMARTSTAY_SEARCH_WORKER_START_TIMEOUT_MS ?? "15000"
    ),
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS: "250",
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS: "1000",
    SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS: "10000",
  });
}

function createWorkerState(config) {
  return createValkeyOperationalState({
    url: valkeyUrl,
    environment,
    hmacSecret,
    connectTimeoutMs: 2000,
    commandTimeoutMs: 3000,
    sessionTtlMs: 10 * 60 * 1000,
    tombstoneRetentionMs: 10 * 60 * 1000,
    continuationLeaseTtlMs: 5000,
    maxSessions: 2000,
    maxSessionBytes: 1024 * 1024,
    aggregateSessionBytes: 256 * 1024 * 1024,
    idempotencyMaxRecords: 1500,
    providerGlobalActiveLimit: providerActiveLimit,
    providerPerProviderActiveLimit: providerActiveLimit,
    providerGlobalQueuedLimit: 2048,
    providerPerProviderQueuedLimit: 2048,
    providerLeaseTtlMs: 750,
    providerAcquirePollMs: 5,
    providerAccountRateLimits: {},
    providerCircuitFailureThreshold: 3,
    providerCircuitCooldownMs: 1000,
    providerHalfOpenProbeLeaseMs: 1000,
    searchQueueConfig: config,
  });
}

function fingerprint(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

async function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));

    server.on("error", reject);
  });
}

async function closeServer(server) {
  if (!server) {
    return;
  }

  let timeoutHandle;
  const gracefulClose = new Promise((resolve) => {
    server.close(() => resolve({
      forced: false,
    }));
  });
  const forcedClose = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => {
      try {
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
      } catch {
        // The process supervisor still owns a bounded hard-kill fallback.
      }

      resolve({
        forced: true,
      });
    }, serverCloseTimeoutMs);
  });

  try {
    return await Promise.race([
      gracefulClose,
      forcedClose,
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function installCommandHandler({ metrics, stop }) {
  let stopping = false;

  async function stopOnce(signal) {
    if (stopping) {
      return;
    }

    stopping = true;

    try {
      const stopResult = await stop(signal);

      send({
        event: "stopped",
        metrics: metrics(),
        stopResult: stopResult ?? null,
      });
      process.exitCode = 0;
    } catch (error) {
      send({
        event: "fatal",
        code: error?.code ?? null,
        message: error?.message ?? "Synthetic process stop failed.",
      });
      process.exitCode = 1;
    } finally {
      eventLoop.disable();
    }
  }

  process.on("message", (message) => {
    if (message?.command === "metrics") {
      send({
        event: "metrics",
        requestId: message.requestId ?? null,
        metrics: metrics(),
      });
      return;
    }

    if (message?.command === "stop") {
      void stopOnce("ipc-stop");
    }
  });

  process.once("SIGTERM", () => {
    void stopOnce("SIGTERM");
  });

  process.once("SIGINT", () => {
    void stopOnce("SIGINT");
  });
}

async function runPublicWeb() {
  send({
    event: "initializing",
    role: "web",
    component: "public-route",
  });
  const route = require("../../server/routes/search.js");
  const app = express();
  let server = null;

  app.use(express.json({
    limit: "256kb",
  }));
  app.use("/api", route);

  server = await listen(app);
  const address = server.address();

  installCommandHandler({
    metrics: () => processMetrics(),
    stop: async () => {
      await closeServer(server);
      await closeOperationalState();
    },
  });

  send({
    event: "ready",
    role: "web",
    mode: "public-route",
    port: address.port,
  });
}

async function runAdmissionOnlyWeb() {
  send({
    event: "initializing",
    role: "web",
    component: "admission-only",
  });
  const config = queueConfig();
  const admission = createBullMqSearchQueueAdmission({
    config,
  });
  const app = express();
  let server = null;

  app.use(express.json({
    limit: "16kb",
  }));
  app.post("/admit", async (req, res) => {
    const key = String(req.body?.key ?? "").trim();
    const marker = String(req.body?.marker ?? "").trim();
    const payload = Object.freeze({
      schemaVersion: 1,
      marker,
    });

    try {
      await admission.admitSearch({
        idempotencyKey: key,
        searchId: `ss2.${crypto.randomUUID()}`,
        payload,
        payloadFingerprint: fingerprint(payload),
      });

      res.status(202).json({
        accepted: true,
      });
    } catch (error) {
      if (error?.code === "SEARCH_CAPACITY_TEMPORARILY_EXHAUSTED") {
        const retryAfterMs = Number(error.retryAfterMs) || 1000;

        res.set("Retry-After", String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
        res.status(503).json({
          accepted: false,
          code: error.code,
          retryAfterMs,
        });
        return;
      }

      res.status(500).json({
        accepted: false,
        code: "SYNTHETIC_ADMISSION_FAILED",
      });
    }
  });

  server = await listen(app);
  const address = server.address();

  installCommandHandler({
    metrics: () => processMetrics(),
    stop: async () => {
      await closeServer(server);
      return admission.close();
    },
  });

  send({
    event: "ready",
    role: "web",
    mode: "admission-only",
    port: address.port,
  });
}

async function runWorker() {
  send({
    event: "initializing",
    role: "worker",
    component: "search-queue-worker",
  });
  const config = queueConfig();
  const state = createWorkerState(config);
  let crashArmed = crashOnFirstActive;

  async function executeSearch({
    searchId,
    initialSearchExecution,
    assertInitialSearchOwnership,
  }) {
    const claim = await state.searchSessionStore.claimInitialSearchExecution(
      searchId,
      initialSearchExecution
    );

    if (!claim?.claimed) {
      if (claim?.terminal) {
        return {
          status: claim.session?.status ?? "Completed",
        };
      }

      const stale = new Error("Synthetic queued execution lost ownership.");

      stale.code = "SEARCH_INITIAL_EXECUTION_STALE";
      stale.retryable = false;
      throw stale;
    }

    const controller = new AbortController();
    const releaseProvider = await state.providerCapacityCoordinator
      .acquireProviderOperationCapacity({
        providerId: "deterministic-stub",
        methodName: "searchHotels",
        signal: controller.signal,
        leaseTtlMs: 750,
      });

    try {
      const capacity = await state.providerCapacityCoordinator
        .getProviderOperationCapacitySnapshot();

      send({
        event: "provider-capacity",
        active: capacity.active,
      });

      if (crashArmed) {
        crashArmed = false;
        send({
          event: "crash-ready",
        });

        await new Promise(() => {});
      }

      await new Promise((resolve) => {
        setTimeout(resolve, Math.max(1, stubDelayMs));
      });
      await assertInitialSearchOwnership();
      await state.searchSessionStore.updateInitialSearchExecution(
        searchId,
        {
          initialSearchStage: "complete",
          initialSearchExecutionToken: null,
          status: "Completed",
          searchIncomplete: false,
          continuation: null,
          totalHotels: 0,
          hotels: [],
          isContinuing: false,
          lastError: null,
          failureCode: null,
          retryable: false,
          retryAfterMs: null,
          syntheticProviderMode: "deterministic-loopback-stub",
        },
        initialSearchExecution
      );

      return {
        status: "Completed",
      };
    } finally {
      await releaseProvider();
    }
  }

  async function markRetry({
    searchId,
    initialSearchExecution,
    retryAfterMs,
  }) {
    return state.searchSessionStore.updateInitialSearchExecution(
      searchId,
      {
        initialSearchStage: "retrying",
        status: "Queued",
        retryable: true,
        retryAfterMs: Number(retryAfterMs) || 100,
      },
      initialSearchExecution
    );
  }

  async function markFailed({
    searchId,
    initialSearchExecution,
    code,
  }) {
    return state.searchSessionStore.updateInitialSearchExecution(
      searchId,
      {
        initialSearchStage: "failed",
        initialSearchExecutionToken: null,
        status: "Failed",
        searchIncomplete: false,
        retryable: false,
        retryAfterMs: null,
        failureCode: code ?? "SYNTHETIC_PROVIDER_FAILURE",
      },
      initialSearchExecution
    );
  }

  const processor = createQueuedSearchProcessor({
    config,
    operationalState: state,
    executeSearch,
    markRetry,
    markFailed,
  });
  const worker = createSearchQueueWorker({
    config,
    operationalState: state,
    processor,
    workerOptions: {
      lockDuration: 750,
      stalledInterval: 250,
      maxStalledCount: 2,
    },
  });

  worker.worker.on("active", () => {
    send({
      event: "queue-active",
    });
  });
  worker.worker.on("error", (error) => {
    send({
      event: "worker-error",
      role: "worker",
      code: error?.code ?? null,
      name: error?.name ?? null,
      message: error?.message ?? null,
      errno: error?.errno ?? null,
      syscall: error?.syscall ?? null,
      address: error?.address ?? null,
      port: error?.port ?? null,
      connection: worker.getConnectionDiagnostics(),
    });
  });

  send({
    event: "worker-connection",
    role: "worker",
    phase: "created",
    ...worker.getConnectionDiagnostics(),
  });

  send({
    event: "waiting-ready",
    role: "worker",
    component: "search-queue-worker",
  });
  try {
    await worker.waitUntilReady();
  } catch (error) {
    await Promise.allSettled([
      worker.close(),
      state.close(),
    ]);
    throw error;
  }

  send({
    event: "worker-connection",
    role: "worker",
    phase: "ready",
    ...worker.getConnectionDiagnostics(),
  });

  installCommandHandler({
    metrics: () => processMetrics({
      worker: worker.getWorkerMetricsSnapshot(),
    }),
    stop: async () => {
      const result = await worker.drain({
        timeoutMs: 10_000,
      });

      await state.close();
      return result;
    },
  });

  send({
    event: "ready",
    role: "worker",
    concurrency: config.workerConcurrency,
  });
}

async function main() {
  send({
    event: "boot",
    role,
    mode: role === "web" ? webMode : "search-queue-worker",
  });

  if (role === "web") {
    if (webMode === "admission-only") {
      await runAdmissionOnlyWeb();
    } else {
      await runPublicWeb();
    }
    return;
  }

  await runWorker();
}

main().catch((error) => {
  send({
    event: "fatal",
    code: error?.code ?? null,
    message: error?.message ?? "Synthetic capacity process failed.",
    errno: error?.errno ?? null,
    syscall: error?.syscall ?? null,
    address: error?.address ?? null,
    port: error?.port ?? null,
  });
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
