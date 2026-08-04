import crypto from "node:crypto";
import { fork, spawnSync } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
} from "node:fs";
import { createRequire } from "node:module";
import { platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  createSyntheticProcessRecord,
  describeSyntheticProcess,
  runSyntheticOperationWithDeadline,
  waitForSyntheticMessage,
} from "./lib/syntheticProcessSupervisor.mjs";

const require = createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require("../server/state/operationalState.js");
const {
  createBullMqSearchQueueAdmission,
} = require("../server/queue/searchQueueAdmission.js");
const {
  getSearchQueueConfig,
} = require("../server/queue/searchQueueConfig.js");
const {
  createClient,
} = require("../server/node_modules/redis");
const {
  getValkeyOperationalStateConfig,
} = require("../server/state/valkey/createValkeyOperationalState.js");

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);
const contractPath = join(
  repositoryRoot,
  "contracts",
  "SYNTHETIC-CAPACITY-CHAOS-CONTRACT.json"
);
const fixturePath = join(
  repositoryRoot,
  "tests",
  "fixtures",
  "syntheticCapacityProcess.mjs"
);
const valkeyUrl = String(
  process.env.SMARTSTAY_TEST_VALKEY_URL ?? ""
).trim();
const reportPath = String(
  process.env.SMARTSTAY_CAPACITY_REPORT_PATH ?? ""
).trim();
const journalPath = String(
  process.env.SMARTSTAY_CAPACITY_JOURNAL_PATH ?? ""
).trim();
const hmacSecret =
  "smartstay-39c25a4d-synthetic-capacity-secret-2026";
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const startedAt = new Date().toISOString();
const failures = [];
const valkeyMemorySamples = [];
const liveChildren = new Set();
const checkpointHistory = [];
const cleanupFailures = [];
let currentCheckpoint = Object.freeze({
  name: "CAPACITY_GATE_BOOT",
  at: startedAt,
  details: null,
});
const eventLoop = monitorEventLoopDelay({
  resolution: 10,
});
const gateHardTimeoutMs =
  Math.max(
    1_000,
    Number(
      contract.harness
        .controlledRunnerStageTimeoutMs
    ) - 30_000
  );
let gateHardTimeoutExpired =
  false;

eventLoop.enable();

function writeDiagnosticLine(line) {
  const output = `${String(line).replace(/[\r\n]+$/g, "")}\n`;

  process.stdout.write(output);

  if (!journalPath) {
    return;
  }

  try {
    mkdirSync(dirname(resolve(journalPath)), {
      recursive: true,
    });
    appendFileSync(resolve(journalPath), output, "utf8");
  } catch {
    // Console output and the final JSON report remain authoritative.
  }
}

function markCheckpoint(name, details = null) {
  currentCheckpoint = Object.freeze({
    name,
    at: new Date().toISOString(),
    details,
  });
  checkpointHistory.push(currentCheckpoint);

  if (checkpointHistory.length > 100) {
    checkpointHistory.shift();
  }

  writeDiagnosticLine(
    `CAPACITY_CHECKPOINT=${name}${details ? ` DETAILS=${JSON.stringify(details)}` : ""}`
  );
}

function liveProcessDiagnostics() {
  return Object.freeze(
    [...liveChildren].map((record) =>
      describeSyntheticProcess(record)
    )
  );
}

function diagnosticDetails(extra = null) {
  return Object.freeze({
    checkpoint: currentCheckpoint,
    recentCheckpoints: Object.freeze(
      checkpointHistory.slice(-20)
    ),
    liveProcesses: liveProcessDiagnostics(),
    cleanupFailures: Object.freeze(
      cleanupFailures.slice(-20)
    ),
    ...(extra ?? {}),
  });
}

async function runCleanupStep(
  label,
  operation,
  timeoutMs = contract.harness.cleanupOperationTimeoutMs
) {
  try {
    return await runSyntheticOperationWithDeadline(operation, {
      timeoutMs,
      code: "CAPACITY_CLEANUP_TIMEOUT",
      message: `Synthetic cleanup step ${label} exceeded its deadline.`,
      details: () => diagnosticDetails({
        cleanupLabel: label,
      }),
    });
  } catch (error) {
    cleanupFailures.push(Object.freeze({
      label,
      code: error?.code ?? "CAPACITY_CLEANUP_FAILED",
      message: error?.message ?? String(error),
    }));
    return null;
  }
}

function round(value, digits = 3) {
  const factor = 10 ** digits;

  return Math.round(Number(value) * factor) / factor;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)
  );

  return sorted[index];
}

function check(condition, code, details = null) {
  if (condition) {
    return;
  }

  const error = new Error(code);

  error.code = code;
  error.details = details;
  throw error;
}

function environmentName(label) {
  return `d${label}${process.pid}${Date.now().toString(36)}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

async function runPool(items, concurrency, operation) {
  const output = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;

      cursor += 1;

      if (index >= items.length) {
        return;
      }

      output[index] = await operation(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(Math.max(1, concurrency), items.length || 1),
      },
      () => worker()
    )
  );

  return output;
}

function assertLoopbackUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  check(
    parsed &&
      ["redis:", "rediss:"].includes(parsed.protocol) &&
      ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    "CAPACITY_VALKEY_MUST_BE_LOOPBACK_ONLY"
  );
}

async function createRawClient() {
  const client = createClient({
    url: valkeyUrl,
    disableOfflineQueue: true,
  });

  client.on("error", () => {});
  await client.connect();

  return client;
}

async function cleanupNamespace(environment) {
  const client = await createRawClient();

  try {
    const keys = [];

    for await (const batch of client.scanIterator({
      MATCH: `ss:v1:${environment}:*`,
      COUNT: 500,
    })) {
      keys.push(...(Array.isArray(batch) ? batch : [batch]));
    }

    for (let index = 0; index < keys.length; index += 500) {
      await client.del(keys.slice(index, index + 500));
    }

    return keys.length;
  } finally {
    client.destroy();
  }
}

function parseInfoValue(info, name) {
  const line = String(info)
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${name}:`));

  return line ? normalizeNumber(line.slice(name.length + 1), 0) : 0;
}

async function captureValkeyMemory(stage) {
  const client = await createRawClient();

  try {
    const info = await client.info("memory");
    const sample = Object.freeze({
      stage,
      usedMemoryBytes: parseInfoValue(info, "used_memory"),
      usedMemoryRssBytes: parseInfoValue(info, "used_memory_rss"),
      usedMemoryPeakBytes: parseInfoValue(info, "used_memory_peak"),
    });

    valkeyMemorySamples.push(sample);
    return sample;
  } finally {
    client.destroy();
  }
}

function createQueueConfig(environment, overrides = {}) {
  return getSearchQueueConfig({
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED: "true",
    SMARTSTAY_QUEUE_REDIS_URL: valkeyUrl,
    SMARTSTAY_QUEUE_ENVIRONMENT: environment,
    SMARTSTAY_QUEUE_KEY_SECRET: hmacSecret,
    SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED: "1000",
    SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS: "600000",
    SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS: "2000",
    SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS: "3000",
    SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS: "1000",
    SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS: "3",
    SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS: "100",
    SMARTSTAY_SEARCH_WORKER_CONCURRENCY: "4",
    SMARTSTAY_SEARCH_WORKER_START_TIMEOUT_MS: String(
      contract.harness.workerStartupTimeoutMs
    ),
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS: "250",
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS: "1000",
    SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS: "10000",
    ...overrides,
  });
}

function createState(environment, { queue = false } = {}) {
  const queueConfiguration = queue
    ? createQueueConfig(environment)
    : Object.freeze({
        enabled: false,
      });

  return createValkeyOperationalState({
    url: valkeyUrl,
    environment,
    hmacSecret,
    connectTimeoutMs: 2000,
    commandTimeoutMs: 3000,
    commandPoolSize:
      contract.sharedStore.commandPoolSizePerProcess,
    sessionTtlMs: 10 * 60 * 1000,
    tombstoneRetentionMs: 10 * 60 * 1000,
    continuationLeaseTtlMs: 5000,
    maxSessions: 2000,
    maxSessionBytes: 1024 * 1024,
    aggregateSessionBytes: 256 * 1024 * 1024,
    idempotencyMaxRecords: 1500,
    idempotencyMaxStoredResponseBytes: 64 * 1024 * 1024,
    verificationTtlMs: 60 * 1000,
    handoffTtlMs: 60 * 1000,
    maxBookingVerifications: 2000,
    maxBookingHandoffs: 2000,
    providerGlobalActiveLimit: 8,
    providerPerProviderActiveLimit: 8,
    providerGlobalQueuedLimit: 2048,
    providerPerProviderQueuedLimit: 2048,
    providerLeaseTtlMs: 750,
    providerAcquirePollMs: 5,
    providerAccountRateLimits: {},
    providerCircuitFailureThreshold: 3,
    providerCircuitCooldownMs: 1000,
    providerHalfOpenProbeLeaseMs: 1000,
    searchQueueConfig: queueConfiguration,
  });
}

function buildSyntheticSession(index) {
  const marker = `synthetic-session-${String(index).padStart(4, "0")}`;
  const description = "deterministic-capacity-evidence-".repeat(8);
  const hotels = Array.from(
    {
      length: 80,
    },
    (_, hotelIndex) => ({
      id: `${marker}-hotel-${String(hotelIndex).padStart(2, "0")}`,
      name: `Synthetic Stay ${hotelIndex}`,
      sessionMarker: marker,
      distanceMeters: 250 + hotelIndex * 25,
      reviewScore: 8 + (hotelIndex % 10) / 10,
      reviewCount: 100 + hotelIndex,
      totalPrice: 300 + hotelIndex,
      currency: "EUR",
      refundable: hotelIndex % 3 !== 0,
      amenities: ["wifi", "air-conditioning", "private-bathroom"],
      description,
    })
  );

  return {
    marker,
    status: "Completed",
    searchIncomplete: false,
    originalSearchData: {
      destinationId: "synthetic-destination",
      rooms: [
        {
          adults: 2,
          children: 0,
          childAges: [],
        },
      ],
    },
    providerId: "deterministic-stub",
    totalHotels: hotels.length,
    hotels,
    continuation: null,
  };
}

async function runActiveSessionScenario() {
  const settings = contract.activeSessions;
  const progressInterval = contract.harness.progressEverySessions;
  const environment = environmentName("sessions");
  const first = createState(environment);
  const second = createState(environment);
  const records = [];
  const writeLatencies = [];
  const readLatencies = [];
  const sizes = [];
  let lost = 0;
  let leakage = 0;
  let writesCompleted = 0;
  let readsCompleted = 0;

  await cleanupNamespace(environment);
  const memoryBefore = await captureValkeyMemory("sessions-before");

  try {
    markCheckpoint("ACTIVE_SESSION_WRITE", {
      target: settings.target,
    });
    process.stdout.write(
      `CAPACITY_PHASE=ACTIVE_SESSION_WRITE_START TARGET=${settings.target}\n`
    );
    await runPool(
      Array.from(
        {
          length: settings.target,
        },
        (_, index) => index
      ),
      settings.writeConcurrency,
      async (index) => {
        const session = buildSyntheticSession(index);
        const operationStarted = performance.now();
        const saved = await first.searchSessionStore.saveSearchSession(session);

        writeLatencies.push(performance.now() - operationStarted);
        sizes.push(Buffer.byteLength(JSON.stringify(saved), "utf8"));
        records.push({
          searchId: saved.searchId,
          marker: session.marker,
        });
        writesCompleted += 1;

        if (writesCompleted % progressInterval === 0) {
          process.stdout.write(
            `CAPACITY_PROGRESS=ACTIVE_SESSION_WRITE_${writesCompleted}_OF_${settings.target}\n`
          );
        }
      }
    );

    const activeCount = await first.searchSessionStore.getSearchSessionCount();

    process.stdout.write(
      `CAPACITY_PHASE=ACTIVE_SESSION_READ_START TARGET=${settings.target}\n`
    );
    markCheckpoint("ACTIVE_SESSION_READ", {
      target: settings.target,
    });
    await runPool(records, settings.readConcurrency, async (record) => {
      const operationStarted = performance.now();
      const session = await second.searchSessionStore.getSearchSession(
        record.searchId
      );

      readLatencies.push(performance.now() - operationStarted);

      if (!session) {
        lost += 1;
        return;
      }

      if (
        session.marker !== record.marker ||
        session.hotels?.[0]?.sessionMarker !== record.marker
      ) {
        leakage += 1;
      }

      readsCompleted += 1;

      if (readsCompleted % progressInterval === 0) {
        process.stdout.write(
          `CAPACITY_PROGRESS=ACTIVE_SESSION_READ_${readsCompleted}_OF_${settings.target}\n`
        );
      }
    });

    let oversizedRejected = false;

    try {
      await first.searchSessionStore.saveSearchSession({
        marker: "oversized-synthetic-session",
        hotels: [],
        oversized: "x".repeat(settings.hardSerializedBytesPerSession + 4096),
      });
    } catch (error) {
      oversizedRejected =
        error?.code === "SEARCH_SESSION_TOO_LARGE" ||
        error?.code === "OPERATIONAL_STATE_RECORD_TOO_LARGE";
    }

    const serializedP95 = percentile(sizes, 0.95);
    const serializedP99 = percentile(sizes, 0.99);
    const serializedMaximum = Math.max(...sizes);
    const readP95Ms = percentile(readLatencies, 0.95);
    const writeP95Ms = percentile(writeLatencies, 0.95);

    check(activeCount === settings.target, "CAPACITY_ACTIVE_SESSION_COUNT_MISMATCH", {
      activeCount,
    });
    check(lost === settings.lostAllowed, "CAPACITY_ACCEPTED_SESSION_LOSS", {
      lost,
    });
    check(
      leakage === settings.crossSessionLeakageAllowed,
      "CAPACITY_CROSS_SESSION_LEAKAGE",
      {
        leakage,
      }
    );
    check(
      serializedMaximum <= settings.hardSerializedBytesPerSession,
      "CAPACITY_SESSION_HARD_SIZE_EXCEEDED",
      {
        serializedMaximum,
      }
    );
    check(
      serializedP95 <= settings.p95SerializedBytesMaximum,
      "CAPACITY_SESSION_P95_SIZE_EXCEEDED",
      {
        serializedP95,
      }
    );
    check(
      serializedP99 <= settings.p99SerializedBytesMaximum,
      "CAPACITY_SESSION_P99_SIZE_EXCEEDED",
      {
        serializedP99,
      }
    );
    check(
      readP95Ms <= settings.sharedStoreReadP95MsMaximum,
      "CAPACITY_STATE_READ_P95_EXCEEDED",
      {
        readP95Ms,
      }
    );
    check(
      writeP95Ms <= settings.sharedStoreWriteP95MsMaximum,
      "CAPACITY_STATE_WRITE_P95_EXCEEDED",
      {
        writeP95Ms,
      }
    );
    check(oversizedRejected, "CAPACITY_OVERSIZED_SESSION_NOT_REJECTED");

    const memoryAfter = await captureValkeyMemory("sessions-loaded");

    return Object.freeze({
      status: "PASS",
      target: settings.target,
      activeCount,
      lost,
      crossSessionLeakage: leakage,
      serializedBytes: {
        p95: serializedP95,
        p99: serializedP99,
        maximum: serializedMaximum,
      },
      latencyMs: {
        readP95: round(readP95Ms),
        writeP95: round(writeP95Ms),
      },
      oversizedRejected,
      valkeyMemoryDeltaBytes: Math.max(
        0,
        memoryAfter.usedMemoryBytes - memoryBefore.usedMemoryBytes
      ),
    });
  } finally {
    await Promise.all([
      runCleanupStep(
        "active-session-first-state",
        () => first.close()
      ),
      runCleanupStep(
        "active-session-second-state",
        () => second.close()
      ),
    ]);
    await runCleanupStep(
      "active-session-namespace",
      () => cleanupNamespace(environment)
    );
  }
}

function childEnvironment({
  role,
  environment,
  webMode = "public-route",
  crashOnFirstActive = false,
  stubDelayMs = 25,
  maximumAdmitted = 1000,
}) {
  return {
    ...process.env,
    NODE_ENV: "test",
    DEPLOYMENT_ENV: "test",
    GEOAPIFY_API_KEY: "",
    LITEAPI_API_KEY: "",
    ROUTESTACK_API_KEY: "",
    RATEHAWK_API_KEY: "",
    SMARTSTAY_CAPACITY_ROLE: role,
    SMARTSTAY_CAPACITY_WEB_MODE: webMode,
    SMARTSTAY_CAPACITY_CRASH_ON_FIRST_ACTIVE: crashOnFirstActive ? "1" : "0",
    SMARTSTAY_CAPACITY_STUB_DELAY_MS: String(stubDelayMs),
    SMARTSTAY_CAPACITY_SERVER_CLOSE_TIMEOUT_MS: String(
      contract.harness.serverCloseTimeoutMs
    ),
    SMARTSTAY_OPERATIONAL_STATE_MODE: "valkey-distributed",
    SMARTSTAY_STATE_REDIS_URL: valkeyUrl,
    SMARTSTAY_STATE_ENVIRONMENT: environment,
    SMARTSTAY_STATE_KEY_SECRET: hmacSecret,
    SMARTSTAY_STATE_CONNECT_TIMEOUT_MS: "2000",
    SMARTSTAY_STATE_COMMAND_TIMEOUT_MS: "3000",
    SMARTSTAY_STATE_COMMAND_POOL_SIZE: String(
      contract.sharedStore.commandPoolSizePerProcess
    ),
    SMARTSTAY_STATE_MAX_SESSIONS: "1000",
    SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES: String(256 * 1024 * 1024),
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
    SMARTSTAY_SEARCH_WORKER_CONCURRENCY: "4",
    SMARTSTAY_SEARCH_WORKER_START_TIMEOUT_MS: String(
      contract.harness.workerStartupTimeoutMs
    ),
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS: "250",
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS: "1000",
    SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS: "10000",
    PROVIDER_MAX_CONCURRENT_OPERATIONS: "8",
    PROVIDER_MAX_CONCURRENT_OPERATIONS_PER_PROVIDER: "8",
    PROVIDER_MAX_QUEUED_OPERATIONS: "2048",
    PROVIDER_MAX_QUEUED_OPERATIONS_PER_PROVIDER: "2048",
    PROVIDER_CAPACITY_LEASE_TTL_MS: "750",
    PROVIDER_CAPACITY_ACQUIRE_POLL_MS: "5",
  };
}

function spawnSynthetic(options) {
  const child = fork(fixturePath, [], {
    cwd: repositoryRoot,
    env: childEnvironment(options),
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  const record = createSyntheticProcessRecord({
    child,
    options,
    onMessage(observedRecord, message) {
      if (
        [
          "boot",
          "initializing",
          "waiting-ready",
          "worker-connection",
          "worker-error",
          "ready",
          "fatal",
          "crash-ready",
          "stopped",
        ].includes(message?.event)
      ) {
        const connection =
          message?.connection ??
          message;

        writeDiagnosticLine(
          `CAPACITY_PROCESS_EVENT=${message.event} ROLE=${observedRecord.options.role} MODE=${observedRecord.options.webMode ?? "default"} PID=${observedRecord.child.pid ?? "unknown"} CODE=${message?.code ?? ""} DRIVER=${connection?.driver ?? ""} STATUS=${connection?.status ?? ""} OPEN=${connection?.open ?? ""} LAZY=${connection?.lazyConnect ?? ""} PHASE=${message?.phase ?? ""} ERRNO=${message?.errno ?? ""} SYSCALL=${message?.syscall ?? ""} ADDRESS=${message?.address ?? ""} PORT=${message?.port ?? ""} ERROR=${JSON.stringify(message?.message ?? "")}`
        );
      }
    },
    onExit(exitedRecord) {
      liveChildren.delete(exitedRecord);
      writeDiagnosticLine(
        `CAPACITY_PROCESS_EVENT=exit ROLE=${exitedRecord.options.role} MODE=${exitedRecord.options.webMode ?? "default"} PID=${exitedRecord.child.pid ?? "unknown"} EXIT_CODE=${exitedRecord.exitCode ?? ""} SIGNAL=${exitedRecord.signal ?? ""}`
      );
    },
  });

  liveChildren.add(record);

  return record;
}

function waitForMessage(
  record,
  predicate,
  timeoutMs = 15_000,
  expectedEvent = "matching-message"
) {
  return waitForSyntheticMessage(record, {
    predicate,
    timeoutMs,
    expectedEvent,
  });
}

async function waitForReady(record) {
  const message = await waitForMessage(
    record,
    (candidate) => candidate?.event === "ready",
    contract.harness.processReadyTimeoutMs,
    `ready:${record.options.role}:${record.options.webMode ?? "default"}`
  );

  check(!record.exited, "CAPACITY_PROCESS_EXITED_BEFORE_READY");
  return message;
}

async function requestMetrics(record) {
  const requestId = crypto.randomUUID();

  record.child.send({
    command: "metrics",
    requestId,
  });
  const message = await waitForMessage(
    record,
    (candidate) =>
      candidate?.event === "metrics" && candidate?.requestId === requestId,
    15_000,
    `metrics:${requestId}`
  );

  return message.metrics;
}

async function waitForExit(record, timeoutMs = 10_000) {
  if (record.exited) {
    return record.exitCode;
  }

  return new Promise((resolveExit, rejectExit) => {
    const timer = setTimeout(() => {
      rejectExit(new Error("Synthetic process exit timeout."));
    }, timeoutMs);

    record.child.once("exit", (code) => {
      clearTimeout(timer);
      resolveExit(code);
    });
  });
}

async function stopSynthetic(record) {
  if (!record || record.exited) {
    return null;
  }

  record.child.send({
    command: "stop",
  });
  const stopped = await waitForMessage(
    record,
    (candidate) => candidate?.event === "stopped",
    20_000,
    "stopped"
  );

  if (record.child.connected) {
    record.child.disconnect();
  }

  const code = await waitForExit(record, 10_000);

  check(code === 0, "CAPACITY_PROCESS_GRACEFUL_STOP_FAILED", {
    code,
  });
  return stopped;
}

async function hardKillSynthetic(record) {
  if (!record || record.exited) {
    return record?.exitCode ?? null;
  }

  record.child.stdout?.resume();
  record.child.stderr?.resume();

  try {
    record.child.kill("SIGKILL");
    return await waitForExit(record, 5_000);
  } catch (firstError) {
    if (
      platform() === "win32" &&
      Number.isSafeInteger(Number(record.child.pid))
    ) {
      spawnSync(
        "taskkill.exe",
        [
          "/PID",
          String(record.child.pid),
          "/T",
          "/F",
        ],
        {
          windowsHide: true,
          timeout: 5_000,
          stdio: "ignore",
        }
      );

      try {
        return await waitForExit(record, 5_000);
      } catch {
        // One last direct termination attempt follows.
      }
    }

    try {
      record.child.kill("SIGKILL");
    } catch {
      // The bounded exit wait below produces the authoritative error.
    }

    try {
      return await waitForExit(record, 5_000);
    } catch (finalError) {
      const error = new Error(
        "Synthetic process could not be terminated within the hard-kill deadline."
      );

      error.code = "CAPACITY_PROCESS_HARD_KILL_TIMEOUT";
      error.details = diagnosticDetails({
        process: describeSyntheticProcess(record),
        firstError: firstError?.message ?? String(firstError),
        finalError: finalError?.message ?? String(finalError),
      });
      throw error;
    }
  }
}

async function forceCleanupChildren() {
  await Promise.allSettled(
    [...liveChildren].map(
      (record) =>
        hardKillSynthetic(record)
    )
  );
}

async function spawnReadySynthetic(
  options,
  {
    label,
    maximumAttempts =
      contract.harness
        .processReadyMaximumAttempts,
    attemptLog = [],
  } = {}
) {
  let lastError =
    null;

  for (
    let attempt = 1;
    attempt <= maximumAttempts;
    attempt += 1
  ) {
    const record =
      spawnSynthetic(options);

    process.stdout.write(
      `CAPACITY_PROCESS_BOOT=${label}_ATTEMPT_${attempt}_OF_${maximumAttempts}\n`
    );

    try {
      const ready =
        await waitForReady(
          record
        );

      attemptLog.push({
        label,
        attempt,
        status:
          "ready",
        role:
          options.role,
        mode:
          options.webMode ??
          "default",
      });

      return {
        record,
        ready,
        attempts:
          attempt,
      };
    }
    catch (error) {
      lastError =
        error;
      attemptLog.push({
        label,
        attempt,
        status:
          "failed",
        role:
          options.role,
        mode:
          options.webMode ??
          "default",
        code:
          error?.code ??
          "CAPACITY_PROCESS_BOOT_FAILED",
      });

      try {
        await hardKillSynthetic(
          record
        );
      }
      catch {
        // The global failure cleanup performs one final bounded attempt.
      }

      if (
        attempt <
          maximumAttempts
      ) {
        await delay(
          contract.harness
            .processReadyRetryDelayMs
        );
      }
    }
  }

  if (lastError) {
    lastError.details =
      Object.freeze({
        ...(lastError.details ??
          {}),
        bootstrapLabel:
          label,
        maximumAttempts,
        attempts:
          Object.freeze(
            attemptLog
              .filter(
                (entry) =>
                  entry.label ===
                  label
              )
              .map(
                (entry) =>
                  Object.freeze({
                    ...entry,
                  })
              )
          ),
      });

    throw lastError;
  }

  throw new Error(
    "Synthetic process bootstrap did not execute."
  );
}

function futureDates() {
  const checkIn = new Date();

  checkIn.setUTCDate(checkIn.getUTCDate() + 60);
  const checkOut = new Date(checkIn);

  checkOut.setUTCDate(checkOut.getUTCDate() + 3);

  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

function publicSearchPayload() {
  const dates = futureDates();

  return {
    destinationId: "rome",
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    rooms: [
      {
        adults: 2,
        children: 0,
        childAges: [],
      },
    ],
  };
}

async function fetchJson(url, options = {}) {
  const operationStarted = performance.now();
  const controller =
    new AbortController();
  let timeoutHandle;
  const operation =
    (async () => {
      const response =
        await fetch(
          url,
          {
            ...options,
            signal:
              controller.signal,
          }
        );
      const body =
        await response.json();

      return {
        status:
          response.status,
        body,
        retryAfter:
          response.headers.get(
            "retry-after"
          ),
        replayed:
          response.headers.get(
            "idempotency-replayed"
          ),
        latencyMs:
          performance.now() -
          operationStarted,
      };
    })();
  const deadline =
    new Promise(
      (_, rejectDeadline) => {
        timeoutHandle =
          setTimeout(
            () => {
              controller.abort();
              const error =
                new Error(
                  "Synthetic loopback HTTP request exceeded its deadline."
                );

              error.code =
                "CAPACITY_HTTP_REQUEST_TIMEOUT";
              error.details = {
                timeoutMs:
                  contract.harness
                    .httpRequestTimeoutMs,
              };
              rejectDeadline(
                error
              );
            },
            contract.harness
              .httpRequestTimeoutMs
          );
      }
    );

  try {
    return await Promise.race([
      operation,
      deadline,
    ]);
  }
  finally {
    clearTimeout(
      timeoutHandle
    );
  }
}

async function postPublicSearch(port, key) {
  return fetchJson(`http://127.0.0.1:${port}/api/search-hotels`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": key,
    },
    body: JSON.stringify(publicSearchPayload()),
  });
}

async function getPublicStatus(port, searchId) {
  return fetchJson(
    `http://127.0.0.1:${port}/api/search-status?searchId=${encodeURIComponent(
      searchId
    )}`
  );
}

async function postAdmission(port, index, prefix) {
  return fetchJson(`http://127.0.0.1:${port}/admit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      key: `${prefix}-${String(index).padStart(6, "0")}`,
      marker: `${prefix}-${index}`,
    }),
  });
}

async function waitForSessionsComplete(state, searchIds, timeoutMs = 20_000) {
  const pending = new Set(searchIds);
  const completionMs = [];
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline && pending.size > 0) {
    const batch = [...pending];

    await runPool(batch, 32, async (searchId) => {
      const session = await state.searchSessionStore.getSearchSession(searchId);

      if (!session) {
        return;
      }

      if (session.status === "Failed") {
        throw new Error("CAPACITY_SYNTHETIC_SESSION_FAILED");
      }

      if (
        session.status === "Completed" &&
        session.initialSearchStage === "complete"
      ) {
        pending.delete(searchId);
        completionMs.push(
          Math.max(0, Number(session.updatedAt) - Number(session.createdAt))
        );
      }
    });

    if (pending.size > 0) {
      await delay(50);
    }
  }

  check(pending.size === 0, "CAPACITY_ACCEPTED_JOB_LOSS_OR_TIMEOUT", {
    missing: pending.size,
  });
  return completionMs;
}

function validateProcessMetrics(metrics, role) {
  const settings = contract.resources;
  const budget =
    role === "web"
      ? settings.webProcessBudgetBytes
      : settings.workerProcessBudgetBytes;
  const growthMaximum =
    role === "web"
      ? settings.webRssGrowthMaximumBytes
      : settings.workerRssGrowthMaximumBytes;

  check(
    metrics.rssBytes / budget <= settings.burstMemoryMaximumRatio,
    "CAPACITY_PROCESS_MEMORY_RATIO_EXCEEDED",
    {
      role,
      rssBytes: metrics.rssBytes,
      budget,
    }
  );
  check(
    metrics.rssGrowthBytes <= growthMaximum,
    "CAPACITY_PROCESS_MEMORY_GROWTH_EXCEEDED",
    {
      role,
      rssGrowthBytes: metrics.rssGrowthBytes,
      growthMaximum,
    }
  );
  check(
    metrics.eventLoopLagP95Ms <= settings.eventLoopLagP95MsMaximum,
    "CAPACITY_PROCESS_EVENT_LOOP_P95_EXCEEDED",
    {
      role,
      eventLoopLagP95Ms: metrics.eventLoopLagP95Ms,
    }
  );
}

async function runMultiProcessBurstAndRestartScenario() {
  const burst = contract.burstAdmission;
  const environment = environmentName("multi");
  const state = createState(environment, {
    queue: true,
  });
  const children = [];
  const startupAttempts = [];
  let providerActiveMaximum = 0;

  await cleanupNamespace(environment);
  await captureValkeyMemory("multi-process-before");

  try {
    markCheckpoint("MULTI_PROCESS_WEB_BOOT");
    process.stdout.write("CAPACITY_PHASE=MULTI_PROCESS_WEB_BOOT_START\n");
    const webAStartup =
      await spawnReadySynthetic(
        {
          role:
            "web",
          environment,
        },
        {
          label:
            "WEB_A",
          attemptLog:
            startupAttempts,
        }
      );
    const webA =
      webAStartup.record;
    const webAReady =
      webAStartup.ready;

    children.push(webA);
    const webBStartup =
      await spawnReadySynthetic(
        {
          role:
            "web",
          environment,
        },
        {
          label:
            "WEB_B",
          attemptLog:
            startupAttempts,
        }
      );
    const webB =
      webBStartup.record;
    const webBReady =
      webBStartup.ready;

    children.push(webB);

    process.stdout.write("CAPACITY_PHASE=MULTI_PROCESS_CRASH_WORKER_BOOT_START\n");
    markCheckpoint("MULTI_PROCESS_CRASH_WORKER_BOOT");
    const crashWorkerStartup =
      await spawnReadySynthetic(
        {
          role:
            "worker",
          environment,
          crashOnFirstActive:
            true,
          stubDelayMs:
            250,
        },
        {
          label:
            "CRASH_WORKER",
          attemptLog:
            startupAttempts,
        }
      );
    const crashWorker =
      crashWorkerStartup.record;

    children.push(crashWorker);
    process.stdout.write("CAPACITY_PHASE=MULTI_PROCESS_INITIAL_TOPOLOGY_READY\n");
    markCheckpoint("MULTI_PROCESS_CRASH_ADMISSION");
    const crashAdmission = await postPublicSearch(
      webAReady.port,
      "capacity-worker-restart-0001"
    );

    check(
      crashAdmission.status === 202,
      "CAPACITY_WORKER_RESTART_ADMISSION_FAILED",
      {
        status: crashAdmission.status,
        code: crashAdmission.body?.code ?? null,
        message: crashAdmission.body?.message ?? null,
      }
    );
    await waitForMessage(
      crashWorker,
      (message) => message?.event === "crash-ready",
      10_000,
      "crash-ready"
    );
    await hardKillSynthetic(crashWorker);

    markCheckpoint("MULTI_PROCESS_REPLACEMENT_WORKER_A_BOOT");
    const workerAStartup =
      await spawnReadySynthetic(
        {
          role:
            "worker",
          environment,
          stubDelayMs:
            25,
        },
        {
          label:
            "WORKER_A",
          attemptLog:
            startupAttempts,
        }
      );
    const workerA =
      workerAStartup.record;

    children.push(workerA);
    markCheckpoint("MULTI_PROCESS_REPLACEMENT_WORKER_B_BOOT");
    const workerBStartup =
      await spawnReadySynthetic(
        {
          role:
            "worker",
          environment,
          stubDelayMs:
            25,
        },
        {
          label:
            "WORKER_B",
          attemptLog:
            startupAttempts,
        }
      );
    const workerB =
      workerBStartup.record;

    children.push(workerB);
    process.stdout.write("CAPACITY_PHASE=MULTI_PROCESS_REPLACEMENT_WORKERS_READY\n");
    markCheckpoint("MULTI_PROCESS_CRASH_RECOVERY");
    const collectProviderMaximum = (record) => {
      record.child.on("message", (message) => {
        if (message?.event === "provider-capacity") {
          providerActiveMaximum = Math.max(
            providerActiveMaximum,
            normalizeNumber(message.active, 0)
          );
        }
      });
    };

    collectProviderMaximum(workerA);
    collectProviderMaximum(workerB);
    const crashCompletion = await waitForSessionsComplete(
      state,
      [crashAdmission.body.searchId],
      15_000
    );
    const replay = await postPublicSearch(
      webBReady.port,
      "capacity-worker-restart-0001"
    );

    check(replay.status === 202, "CAPACITY_IDEMPOTENT_REPLAY_FAILED");
    check(
      replay.body.searchId === crashAdmission.body.searchId,
      "CAPACITY_DUPLICATE_VISIBLE_SESSION"
    );

    await hardKillSynthetic(webA);
    markCheckpoint("MULTI_PROCESS_REPLACEMENT_WEB_BOOT");
    const replacementWebStartup =
      await spawnReadySynthetic(
        {
          role:
            "web",
          environment,
        },
        {
          label:
            "REPLACEMENT_WEB",
          attemptLog:
            startupAttempts,
        }
      );
    const replacementWeb =
      replacementWebStartup.record;

    children.push(replacementWeb);
    const replacementReady =
      replacementWebStartup.ready;
    const recoveredStatus = await getPublicStatus(
      replacementReady.port,
      crashAdmission.body.searchId
    );

    check(
      recoveredStatus.status === 200 &&
        recoveredStatus.body.status === "Completed",
      "CAPACITY_WEB_RESTART_LOST_SESSION"
    );
    const restartAdmission = await postPublicSearch(
      replacementReady.port,
      "capacity-web-restart-0001"
    );

    check(restartAdmission.status === 202, "CAPACITY_REPLACEMENT_WEB_ADMISSION_FAILED");
    await waitForSessionsComplete(state, [restartAdmission.body.searchId]);

    const webBaseline = await Promise.all([
      requestMetrics(webB),
      requestMetrics(replacementWeb),
    ]);
    const workerBaseline = await Promise.all([
      requestMetrics(workerA),
      requestMetrics(workerB),
    ]);
    markCheckpoint("MULTI_PROCESS_BURST", {
      requests: burst.requests,
    });
    const burstStarted = performance.now();
    const burstResponses = await runPool(
      Array.from(
        {
          length: burst.requests,
        },
        (_, index) => index
      ),
      50,
      (index) =>
        postPublicSearch(
          index % 2 === 0 ? webBReady.port : replacementReady.port,
          `capacity-burst-${String(index).padStart(6, "0")}`
        )
    );
    const burstWindowMs = performance.now() - burstStarted;
    const statuses = burstResponses.map((response) => response.status);
    const acknowledgementLatencies = burstResponses.map(
      (response) => response.latencyMs
    );
    const unexpected5xx = statuses.filter(
      (status) => status >= 500 && status <= 599
    ).length;
    const acceptedSearchIds = burstResponses
      .filter((response) => response.status === 202)
      .map((response) => response.body.searchId);

    check(
      statuses.every((status) => status === 202),
      "CAPACITY_BURST_UNEXPECTED_STATUS",
      {
        statuses: Object.fromEntries(
          [...new Set(statuses)].map((status) => [
            status,
            statuses.filter((candidate) => candidate === status).length,
          ])
        ),
      }
    );
    check(
      new Set(acceptedSearchIds).size === burst.requests,
      "CAPACITY_BURST_DUPLICATE_SEARCH_ID"
    );
    check(
      burstWindowMs <= burst.windowMsMaximum,
      "CAPACITY_BURST_WINDOW_EXCEEDED",
      {
        burstWindowMs,
      }
    );
    check(
      percentile(acknowledgementLatencies, 0.95) <=
        burst.acknowledgementP95MsMaximum,
      "CAPACITY_ACK_P95_EXCEEDED"
    );
    check(
      percentile(acknowledgementLatencies, 0.99) <=
        burst.acknowledgementP99MsMaximum,
      "CAPACITY_ACK_P99_EXCEEDED"
    );
    check(
      unexpected5xx / burst.requests <= burst.unexpected5xxRateMaximum,
      "CAPACITY_BURST_5XX_RATE_EXCEEDED"
    );

    const completionLatencies = await waitForSessionsComplete(
      state,
      acceptedSearchIds,
      20_000
    );
    markCheckpoint("MULTI_PROCESS_BURST_COMPLETED", {
      accepted: acceptedSearchIds.length,
    });

    check(
      percentile(completionLatencies, 0.95) <=
        burst.stubSearchCompletionP95MsMaximum,
      "CAPACITY_COMPLETION_P95_EXCEEDED"
    );

    const statusResponses = await runPool(
      acceptedSearchIds,
      50,
      (searchId, index) =>
        getPublicStatus(
          index % 2 === 0 ? webBReady.port : replacementReady.port,
          searchId
        )
    );
    const statusLatencies = statusResponses.map(
      (response) => response.latencyMs
    );

    check(
      statusResponses.every(
        (response) =>
          response.status === 200 && response.body.status === "Completed"
      ),
      "CAPACITY_STATUS_READ_INCORRECT"
    );
    check(
      percentile(statusLatencies, 0.95) <= burst.searchStatusP95MsMaximum,
      "CAPACITY_STATUS_P95_EXCEEDED"
    );

    const webMetrics = await Promise.all([
      requestMetrics(webB),
      requestMetrics(replacementWeb),
    ]);
    const workerMetrics = await Promise.all([
      requestMetrics(workerA),
      requestMetrics(workerB),
    ]);

    for (const metrics of webMetrics) {
      validateProcessMetrics(metrics, "web");
    }

    for (const metrics of workerMetrics) {
      validateProcessMetrics(metrics, "worker");
    }

    const workerActiveCounts = [workerA, workerB].map(
      (record) =>
        record.messages.filter((message) => message?.event === "queue-active")
          .length
    );

    check(
      workerActiveCounts.every((count) => count > 0),
      "CAPACITY_TWO_WORKERS_NOT_OBSERVED",
      {
        workerActiveCounts,
      }
    );
    check(
      providerActiveMaximum === contract.multiProcess.globalProviderActiveLimit &&
        providerActiveMaximum <=
          contract.multiProcess.maximumObservedAggregateProviderActive,
      "CAPACITY_GLOBAL_PROVIDER_LIMIT_NOT_EXERCISED_OR_EXCEEDED",
      {
        providerActiveMaximum,
      }
    );

    const queueSnapshot = await state.searchQueueAdmission
      .getSearchQueueAdmissionSnapshot();

    check(queueSnapshot.admitted === 0, "CAPACITY_QUEUE_NOT_DRAINED", {
      admitted: queueSnapshot.admitted,
    });
    await captureValkeyMemory("multi-process-complete");
    markCheckpoint("MULTI_PROCESS_COMPLETE");

    return Object.freeze({
      status: "PASS",
      topology: {
        webProcesses: 2,
        workerProcesses: 2,
      },
      startup: {
        order:
          "sequential",
        attempts:
          Object.freeze(
            startupAttempts.map(
              (entry) =>
                Object.freeze({
                  ...entry,
                })
            )
          ),
      },
      restart: {
        workerHardRestartRecovered: crashCompletion.length === 1,
        webHardRestartPreservedSession: true,
      },
      idempotency: {
        replayReturnedSameSearch: true,
        duplicateVisibleCompletions: 0,
      },
      burst: {
        attempted: burst.requests,
        accepted: acceptedSearchIds.length,
        windowMs: round(burstWindowMs),
        acknowledgementP95Ms: round(
          percentile(acknowledgementLatencies, 0.95)
        ),
        acknowledgementP99Ms: round(
          percentile(acknowledgementLatencies, 0.99)
        ),
        statusP95Ms: round(percentile(statusLatencies, 0.95)),
        completionP95Ms: round(percentile(completionLatencies, 0.95)),
        unexpected5xx,
      },
      providerActiveMaximum,
      workerActiveCounts,
      processMetrics: {
        webBaseline,
        webFinal: webMetrics,
        workerBaseline,
        workerFinal: workerMetrics,
      },
    });
  } finally {
    await Promise.all(
      children.reverse().map((child) =>
        runCleanupStep(
          `multi-process-child-${child.child.pid ?? "unknown"}`,
          async () => {
            if (child.exited) {
              return;
            }

            try {
              await stopSynthetic(child);
            } catch {
              await hardKillSynthetic(child);
            }
          },
          contract.harness.processCleanupTimeoutMs
        )
      )
    );
    await runCleanupStep(
      "multi-process-parent-state",
      () => state.close()
    );
    await runCleanupStep(
      "multi-process-namespace",
      () => cleanupNamespace(environment)
    );
  }
}

async function runExceptionalOverloadScenario() {
  const settings = contract.exceptionalOverload;
  const environment = environmentName("overload");
  const config = createQueueConfig(environment);
  const inspector = createBullMqSearchQueueAdmission({
    config,
  });
  const children = [];
  const startupAttempts = [];
  const childShutdown = [];
  let inspectorShutdown = null;
  let scenarioResult = null;
  let shutdownFailures = 0;

  await cleanupNamespace(environment);
  const memoryBefore = await captureValkeyMemory("overload-before");

  try {
    markCheckpoint("OVERLOAD_WEB_A_BOOT");
    const firstStartup =
      await spawnReadySynthetic(
        {
          role:
            "web",
          environment,
          webMode:
            "admission-only",
          maximumAdmitted:
            settings
              .hardAdmittedJobMaximum,
        },
        {
          label:
            "OVERLOAD_WEB_A",
          attemptLog:
            startupAttempts,
        }
      );
    const first =
      firstStartup.record;
    const firstReady =
      firstStartup.ready;

    children.push(first);
    markCheckpoint("OVERLOAD_WEB_B_BOOT");
    const secondStartup =
      await spawnReadySynthetic(
        {
          role:
            "web",
          environment,
          webMode:
            "admission-only",
          maximumAdmitted:
            settings
              .hardAdmittedJobMaximum,
        },
        {
          label:
            "OVERLOAD_WEB_B",
          attemptLog:
            startupAttempts,
        }
      );
    const second =
      secondStartup.record;
    const secondReady =
      secondStartup.ready;

    children.push(second);
    const baselineMetrics = await Promise.all([
      requestMetrics(first),
      requestMetrics(second),
    ]);
    const ports = [firstReady.port, secondReady.port];
    markCheckpoint("OVERLOAD_PREFILL", {
      requests: settings.prefillJobs,
    });
    const prefill = await runPool(
      Array.from(
        {
          length: settings.prefillJobs,
        },
        (_, index) => index
      ),
      50,
      (index) => postAdmission(ports[index % 2], index, "capacity-prefill")
    );

    check(
      prefill.every((response) => response.status === 202),
      "CAPACITY_OVERLOAD_PREFILL_FAILED"
    );

    const overloadStarted = performance.now();
    markCheckpoint("OVERLOAD_ADMISSION", {
      requests: settings.attemptedRequests,
    });
    const attempts = await runPool(
      Array.from(
        {
          length: settings.attemptedRequests,
        },
        (_, index) => index
      ),
      100,
      (index) => postAdmission(ports[index % 2], index, "capacity-overload")
    );
    const durationMs = performance.now() - overloadStarted;
    const accepted = attempts.filter((response) => response.status === 202);
    const rejected = attempts.filter((response) => response.status === 503);
    const unexpected = attempts.filter(
      (response) => !settings.allowedStatuses.includes(response.status)
    );
    const invalidRejections = rejected.filter(
      (response) =>
        response.body?.code !== settings.requiredCapacityCode ||
        (settings.retryAfterRequired && !response.retryAfter)
    );
    const snapshot = await inspector.getSearchQueueAdmissionSnapshot();

    check(unexpected.length === 0, "CAPACITY_OVERLOAD_UNEXPECTED_RESPONSE", {
      count: unexpected.length,
    });
    check(rejected.length > 0, "CAPACITY_OVERLOAD_DID_NOT_APPLY_BACKPRESSURE");
    check(
      invalidRejections.length === 0,
      "CAPACITY_OVERLOAD_REJECTION_CONTRACT_INVALID",
      {
        invalidRejections: invalidRejections.length,
      }
    );
    check(
      snapshot.admitted === settings.hardAdmittedJobMaximum,
      "CAPACITY_OVERLOAD_ADMITTED_COUNT_MISMATCH",
      {
        admitted: snapshot.admitted,
      }
    );
    check(
      snapshot.admitted <= settings.hardAdmittedJobMaximum,
      "CAPACITY_OVERLOAD_HARD_LIMIT_EXCEEDED"
    );
    check(
      accepted.length + settings.prefillJobs === settings.hardAdmittedJobMaximum,
      "CAPACITY_OVERLOAD_ACCEPTANCE_ACCOUNTING_MISMATCH"
    );

    const finalMetrics = await Promise.all([
      requestMetrics(first),
      requestMetrics(second),
    ]);

    for (const metrics of finalMetrics) {
      validateProcessMetrics(metrics, "web");
    }

    const memoryAfter = await captureValkeyMemory("overload-saturated");

    scenarioResult = {
      status: "PASS",
      prefill: settings.prefillJobs,
      attempted: settings.attemptedRequests,
      accepted: accepted.length,
      rejectedWith503: rejected.length,
      unexpectedResponses: unexpected.length,
      invalidCapacityResponses: invalidRejections.length,
      durationMs: round(durationMs),
      acknowledgementP95Ms: round(
        percentile(
          attempts.map((response) => response.latencyMs),
          0.95
        )
      ),
      maximumObservedAdmitted: snapshot.admitted,
      hardAdmittedMaximum: settings.hardAdmittedJobMaximum,
      valkeyMemoryDeltaBytes: Math.max(
        0,
        memoryAfter.usedMemoryBytes - memoryBefore.usedMemoryBytes
      ),
      processMetrics: {
        baseline: baselineMetrics,
        final: finalMetrics,
      },
      startup: {
        order:
          "sequential",
        attempts:
          Object.freeze(
            startupAttempts.map(
              (entry) =>
                Object.freeze({
                  ...entry,
                })
            )
          ),
      },
    };
    markCheckpoint("OVERLOAD_COMPLETE", {
      accepted: accepted.length,
      rejected: rejected.length,
    });
  } finally {
    const shutdownResults = await Promise.all(
      children.reverse().map(async (child) => {
        try {
          const stopped = await runSyntheticOperationWithDeadline(
            () => stopSynthetic(child),
            {
              timeoutMs: contract.harness.processCleanupTimeoutMs,
              code: "CAPACITY_PROCESS_CLEANUP_TIMEOUT",
              message: "Synthetic overload process cleanup exceeded its deadline.",
              details: () => diagnosticDetails({
                process: describeSyntheticProcess(child),
              }),
            }
          );

          return {
            stopped,
            failed: false,
          };
        } catch (error) {
          shutdownFailures += 1;
          cleanupFailures.push(Object.freeze({
            label: `overload-child-${child.child.pid ?? "unknown"}`,
            code: error?.code ?? "CAPACITY_PROCESS_CLEANUP_FAILED",
            message: error?.message ?? String(error),
          }));
          await runCleanupStep(
            `overload-hard-kill-${child.child.pid ?? "unknown"}`,
            () => hardKillSynthetic(child),
            contract.harness.processCleanupTimeoutMs
          );

          return {
            stopped: null,
            failed: true,
          };
        }
      })
    );

    childShutdown.push(
      ...shutdownResults.map(
        ({ stopped }) => stopped?.stopResult ?? null
      )
    );
    inspectorShutdown = await runCleanupStep(
      "overload-inspector",
      () => inspector.close()
    );
    await runCleanupStep(
      "overload-namespace",
      () => cleanupNamespace(environment)
    );
  }

  check(
    shutdownFailures === 0,
    "CAPACITY_OVERLOAD_PROCESS_SHUTDOWN_FAILED",
    {
      shutdownFailures,
    }
  );

  return Object.freeze({
    ...scenarioResult,
    shutdown: Object.freeze({
      childProcesses: Object.freeze(
        childShutdown
      ),
      inspector: inspectorShutdown,
      failures: shutdownFailures,
    }),
  });
}

async function writeReport(report) {
  if (!reportPath) {
    return;
  }

  await mkdir(dirname(resolve(reportPath)), {
    recursive: true,
  });
  await writeFile(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  assertLoopbackUrl(valkeyUrl);
  check(contract.contractId === "39C25A.4D", "CAPACITY_CONTRACT_ID_INVALID");
  check(
    contract.providerMode === "deterministic-loopback-stub",
    "CAPACITY_PROVIDER_MODE_INVALID"
  );
  check(contract.externalNetworkAllowed === false, "CAPACITY_NETWORK_POLICY_INVALID");
  const runtimeCapacityConfig = getValkeyOperationalStateConfig({
    DEPLOYMENT_ENV: "test",
    SMARTSTAY_STATE_REDIS_URL: valkeyUrl,
    SMARTSTAY_STATE_ENVIRONMENT: "capacity-contract",
    SMARTSTAY_STATE_KEY_SECRET: hmacSecret,
    SMARTSTAY_STATE_MAX_SESSIONS: String(contract.activeSessions.target),
    SMARTSTAY_STATE_SESSION_AGGREGATE_MAX_BYTES: String(
      256 * 1024 * 1024
    ),
    SMARTSTAY_STATE_COMMAND_POOL_SIZE: String(
      contract.sharedStore.commandPoolSizePerProcess
    ),
  });

  check(
    runtimeCapacityConfig.maxSessions === contract.activeSessions.target,
    "CAPACITY_RUNTIME_SESSION_LIMIT_NOT_CONFIGURABLE"
  );
  check(
    runtimeCapacityConfig.commandPoolSize ===
      contract.sharedStore.commandPoolSizePerProcess,
    "CAPACITY_RUNTIME_COMMAND_POOL_NOT_CONFIGURABLE"
  );

  const initialClient = await createRawClient();

  try {
    check((await initialClient.ping()) === "PONG", "CAPACITY_VALKEY_NOT_READY");
  } finally {
    initialClient.destroy();
  }

  markCheckpoint("ACTIVE_SESSION_SCENARIO_START");
  const activeSessions = await runSyntheticOperationWithDeadline(
    () => runActiveSessionScenario(),
    {
      timeoutMs: contract.harness.activeSessionScenarioTimeoutMs,
      code: "CAPACITY_ACTIVE_SESSION_SCENARIO_TIMEOUT",
      message: "The active-session capacity scenario exceeded its deadline.",
      details: () => diagnosticDetails(),
    }
  );

  process.stdout.write(
    `CAPACITY_ACTIVE_SESSIONS=${activeSessions.activeCount}_OF_${activeSessions.target}_PASS\n`
  );
  markCheckpoint("MULTI_PROCESS_SCENARIO_START");
  const multiProcess = await runSyntheticOperationWithDeadline(
    () => runMultiProcessBurstAndRestartScenario(),
    {
      timeoutMs: contract.harness.multiProcessScenarioTimeoutMs,
      code: "CAPACITY_MULTI_PROCESS_SCENARIO_TIMEOUT",
      message: "The multi-process capacity scenario exceeded its deadline.",
      details: () => diagnosticDetails(),
    }
  );

  process.stdout.write(
    `CAPACITY_BURST=${multiProcess.burst.accepted}_OF_${multiProcess.burst.attempted}_PASS\n`
  );
  markCheckpoint("OVERLOAD_SCENARIO_START");
  const overload = await runSyntheticOperationWithDeadline(
    () => runExceptionalOverloadScenario(),
    {
      timeoutMs: contract.harness.overloadScenarioTimeoutMs,
      code: "CAPACITY_OVERLOAD_SCENARIO_TIMEOUT",
      message: "The exceptional-overload scenario exceeded its deadline.",
      details: () => diagnosticDetails(),
    }
  );

  process.stdout.write(
    `CAPACITY_OVERLOAD=${overload.attempted}_ATTEMPTS_${overload.rejectedWith503}_BOUNDED_503_PASS\n`
  );
  process.stdout.write(
    `CAPACITY_OVERLOAD_SHUTDOWN=${overload.shutdown.failures}_FAILURES_${overload.shutdown.childProcesses.length}_CHILDREN_PASS\n`
  );
  check(
    cleanupFailures.length === 0,
    "CAPACITY_CLEANUP_FAILURE",
    diagnosticDetails()
  );
  const parentEventLoopP95Ms = normalizeNumber(
    eventLoop.percentile(95) / 1_000_000,
    0
  );

  check(
    parentEventLoopP95Ms <= contract.resources.eventLoopLagP95MsMaximum,
    "CAPACITY_PARENT_EVENT_LOOP_P95_EXCEEDED",
    {
      parentEventLoopP95Ms,
    }
  );

  const currentMemoryPeak = Math.max(
    ...valkeyMemorySamples.map((sample) => sample.usedMemoryPeakBytes),
    0
  );
  const recommendedMinimumValkeyPlanBytes = Math.ceil(
    currentMemoryPeak / contract.resources.valkeySizingHeadroomRatio
  );
  const report = Object.freeze({
    schemaVersion: "smartstay-capacity-chaos-report-v1",
    contractId: contract.contractId,
    scenarioVersion: contract.scenarioVersion,
    status: "PASS",
    startedAt,
    finishedAt: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: platform(),
      release: release(),
      architecture: process.arch,
    },
    providerMode: contract.providerMode,
    externalNetworkAllowed: false,
    externalProviderCalls: 0,
    externalBookingCalls: 0,
    externalAnalyticsCalls: 0,
    scenarios: {
      activeSessions,
      multiProcess,
      exceptionalOverload: overload,
      valkeyInterruption: "CONTROLLED_RUNNER_PROBE_REQUIRED",
      staleLockAndDuplicateDelivery: "REAL_VALKEY_REGRESSION_REQUIRED",
    },
    resources: {
      parentEventLoopP95Ms: round(parentEventLoopP95Ms),
      valkeyMemorySamples,
      currentMemoryPeakBytes: currentMemoryPeak,
      recommendedMinimumValkeyPlanBytes,
      sizingHeadroomRatio: contract.resources.valkeySizingHeadroomRatio,
    },
    runtimeConfiguration: {
      maximumActiveSessions: runtimeCapacityConfig.maxSessions,
      aggregateSessionBytes: runtimeCapacityConfig.aggregateSessionBytes,
      commandPoolSizePerProcess:
        runtimeCapacityConfig.commandPoolSize,
      workerQueueConnectionDriver:
        contract.multiProcess.workerQueueConnectionDriver,
      asynchronousQueueDefaultChanged: false,
    },
    failures: [],
  });

  await writeReport(report);
  process.stdout.write(
    `CAPACITY_TOPOLOGY=${multiProcess.topology.webProcesses}_WEB_${multiProcess.topology.workerProcesses}_WORKER_PASS\n`
  );
  process.stdout.write(
    `CAPACITY_PROVIDER_ACTIVE_MAX=${multiProcess.providerActiveMaximum}_LIMIT_${contract.multiProcess.globalProviderActiveLimit}_PASS\n`
  );
  markCheckpoint("CAPACITY_GATE_COMPLETE");
  process.stdout.write("CAPACITY_CHAOS_STATUS=PASS\n");
}

let gateHardTimeoutHandle;
const gateHardDeadline =
  new Promise(
    (_, rejectDeadline) => {
      gateHardTimeoutHandle =
        setTimeout(
          () => {
            gateHardTimeoutExpired =
              true;
            const error =
              new Error(
                "The synthetic capacity gate exceeded its hard runtime deadline."
              );

            error.code =
              "CAPACITY_GATE_HARD_TIMEOUT";
            error.details = diagnosticDetails({
              timeoutMs:
                gateHardTimeoutMs,
            });
            rejectDeadline(
              error
            );
          },
          gateHardTimeoutMs
        );
    }
  );

try {
  await Promise.race([
    main(),
    gateHardDeadline,
  ]);
} catch (error) {
  markCheckpoint("CAPACITY_GATE_FAILURE", {
    code: error?.code ?? "CAPACITY_CHAOS_FAILED",
  });
  failures.push({
    code: error?.code ?? "CAPACITY_CHAOS_FAILED",
    message: error?.message ?? String(error),
    details: error?.details ?? null,
  });
  await forceCleanupChildren();
  const failedReport = Object.freeze({
    schemaVersion: "smartstay-capacity-chaos-report-v1",
    contractId: contract.contractId,
    scenarioVersion: contract.scenarioVersion,
    status: "FAIL",
    startedAt,
    finishedAt: new Date().toISOString(),
    runtime: {
      node: process.version,
      platform: platform(),
      release: release(),
      architecture: process.arch,
    },
    providerMode: contract.providerMode,
    externalNetworkAllowed: false,
    externalProviderCalls: 0,
    externalBookingCalls: 0,
    externalAnalyticsCalls: 0,
    resources: {
      valkeyMemorySamples,
    },
    failures,
  });

  try {
    await writeReport(failedReport);
  } catch {
    // The original capacity failure remains authoritative.
  }

  process.stderr.write(
    `CAPACITY_CHAOS_STATUS=FAIL ${JSON.stringify(failures)}\n`
  );
  process.exitCode = 1;
} finally {
  clearTimeout(
    gateHardTimeoutHandle
  );
  eventLoop.disable();

  if (
    gateHardTimeoutExpired ||
    failures.length > 0
  ) {
    process.exit(1);
  }
}
