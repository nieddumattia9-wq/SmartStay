import crypto from "node:crypto";
import { createRequire } from "node:module";
import { createInterface } from "node:readline";

const require = createRequire(import.meta.url);

const {
  createValkeyOperationalState,
} = require("../../server/state/operationalState.js");
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
const {
  createClient,
} = require("../../server/node_modules/redis");

configureOperationalLogger({
  logger: Object.freeze({
    debug() {},
    info() {},
    warn() {},
    error() {},
  }),
});

const valkeyUrl = String(
  process.env.SMARTSTAY_TEST_VALKEY_URL ?? ""
).trim();
const environment = String(
  process.env.SMARTSTAY_TEST_STATE_ENVIRONMENT ?? ""
).trim();
const hmacSecret = String(
  process.env.SMARTSTAY_TEST_STATE_SECRET ?? ""
);

if (
  !valkeyUrl ||
  !environment ||
  Buffer.byteLength(hmacSecret, "utf8") < 32
) {
  throw new Error("Valkey interruption probe configuration is incomplete.");
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}

function fingerprint(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function queueConfig() {
  return getSearchQueueConfig({
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED: "true",
    SMARTSTAY_QUEUE_REDIS_URL: valkeyUrl,
    SMARTSTAY_QUEUE_ENVIRONMENT: environment,
    SMARTSTAY_QUEUE_KEY_SECRET: hmacSecret,
    SMARTSTAY_SEARCH_QUEUE_MAX_ADMITTED: "10",
    SMARTSTAY_SEARCH_QUEUE_ADMISSION_LEASE_MS: "60000",
    SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS: "1000",
    SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS: "1500",
    SMARTSTAY_SEARCH_QUEUE_RETRY_AFTER_MS: "500",
    SMARTSTAY_SEARCH_QUEUE_JOB_ATTEMPTS: "3",
    SMARTSTAY_SEARCH_QUEUE_JOB_BACKOFF_MS: "100",
    SMARTSTAY_SEARCH_WORKER_CONCURRENCY: "1",
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_INTERVAL_MS: "250",
    SMARTSTAY_SEARCH_WORKER_HEARTBEAT_TTL_MS: "1000",
    SMARTSTAY_SEARCH_WORKER_DRAIN_TIMEOUT_MS: "5000",
  });
}

function createState(config) {
  return createValkeyOperationalState({
    url: valkeyUrl,
    environment,
    hmacSecret,
    connectTimeoutMs: 1000,
    commandTimeoutMs: 1500,
    sessionTtlMs: 10 * 60 * 1000,
    tombstoneRetentionMs: 10 * 60 * 1000,
    maxSessions: 10,
    maxSessionBytes: 1024 * 1024,
    aggregateSessionBytes: 8 * 1024 * 1024,
    providerGlobalActiveLimit: 8,
    providerPerProviderActiveLimit: 8,
    providerGlobalQueuedLimit: 64,
    providerPerProviderQueuedLimit: 64,
    providerLeaseTtlMs: 1000,
    providerAcquirePollMs: 10,
    providerAccountRateLimits: {},
    providerCircuitFailureThreshold: 3,
    providerCircuitCooldownMs: 1000,
    providerHalfOpenProbeLeaseMs: 1000,
    searchQueueConfig: config,
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

    for await (const batch of client.scanIterator({
      MATCH: `ss:v1:${environment}:*`,
      COUNT: 100,
    })) {
      keys.push(...(Array.isArray(batch) ? batch : [batch]));
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

async function waitForRecovery(state, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const [pong, snapshot] = await Promise.all([
        state.ping(),
        state.searchQueueAdmission.getSearchQueueAdmissionSnapshot(),
      ]);

      if (pong === "PONG") {
        return snapshot;
      }
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  throw new Error(
    `Valkey interruption probe did not reconnect: ${lastError?.code ?? "UNKNOWN"}`
  );
}

async function waitForCompletion(state, searchId, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const session = await state.searchSessionStore.getSearchSession(searchId);
    const snapshot = await state.searchQueueAdmission
      .getSearchQueueAdmissionSnapshot();

    if (
      session?.status === "Completed" &&
      session?.initialSearchStage === "complete" &&
      snapshot.admitted === 0
    ) {
      return {
        session,
        snapshot,
      };
    }

    await delay(50);
  }

  throw new Error("Accepted search did not complete after Valkey recovery.");
}

async function main() {
  const config = queueConfig();
  const state = createState(config);
  const payload = Object.freeze({
    destinationId: "rome",
    checkIn: "2027-01-10",
    checkOut: "2027-01-13",
    rooms: [
      {
        adults: 2,
        children: 0,
        childAges: [],
      },
    ],
  });
  const session = await state.searchSessionStore.saveSearchSession({
    originalSearchData: payload,
    initialSearchStage: "queued",
    initialSearchExecutionToken: null,
    initialSearchFencingNumber: 0,
    status: "Queued",
    searchIncomplete: true,
    totalHotels: 0,
    hotels: [],
    continuation: null,
    retryable: true,
    retryAfterMs: 500,
  });
  await state.searchQueueAdmission.admitSearch({
    idempotencyKey: "capacity-valkey-interruption-0001",
    searchId: session.searchId,
    payload,
    payloadFingerprint: fingerprint(payload),
  });
  const initialSnapshot = await state.searchQueueAdmission
    .getSearchQueueAdmissionSnapshot();

  if (initialSnapshot.admitted !== 1) {
    throw new Error("Valkey interruption probe failed to admit its durable job.");
  }

  emit({
    marker: "READY",
    activeSession: true,
    admittedJobs: initialSnapshot.admitted,
  });

  const input = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });
  let worker = null;

  try {
    for await (const rawLine of input) {
      const line = String(rawLine).trim();

      if (line === "PROBE_OUTAGE") {
        const outageStarted = Date.now();
        let stateFailedClosed = false;
        let queueFailedClosed = false;

        try {
          await state.ping();
        } catch (error) {
          stateFailedClosed = error?.code === "OPERATIONAL_STATE_UNAVAILABLE";
        }

        try {
          await state.searchQueueAdmission.getSearchQueueAdmissionSnapshot();
        } catch (error) {
          queueFailedClosed = error?.code === "SEARCH_QUEUE_UNAVAILABLE";
        }

        emit({
          marker: "OUTAGE_FAIL_CLOSED",
          stateFailedClosed,
          queueFailedClosed,
          elapsedMs: Date.now() - outageStarted,
        });
        continue;
      }

      if (line === "PROBE_RECOVERY") {
        const recoveredSnapshot = await waitForRecovery(state);
        const recoveredSession = await state.searchSessionStore
          .getSearchSession(session.searchId);

        if (
          !recoveredSession ||
          recoveredSnapshot.admitted !== 1 ||
          recoveredSnapshot.waiting !== 1
        ) {
          throw new Error("Accepted state or queued job was lost during Valkey restart.");
        }

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
            throw new Error("Recovered job could not claim its session.");
          }

          await assertInitialSearchOwnership();
          await state.searchSessionStore.updateInitialSearchExecution(
            searchId,
            {
              initialSearchStage: "complete",
              initialSearchExecutionToken: null,
              status: "Completed",
              searchIncomplete: false,
              totalHotels: 0,
              hotels: [],
              continuation: null,
              retryable: false,
              retryAfterMs: null,
              syntheticProviderMode: "deterministic-loopback-stub",
            },
            initialSearchExecution
          );

          return {
            status: "Completed",
          };
        }

        const processor = createQueuedSearchProcessor({
          config,
          operationalState: state,
          executeSearch,
          async markRetry() {},
          async markFailed() {},
        });

        worker = createSearchQueueWorker({
          config,
          operationalState: state,
          processor,
          workerOptions: {
            lockDuration: 750,
            stalledInterval: 250,
          },
        });
        await worker.waitUntilReady();
        const completed = await waitForCompletion(state, session.searchId);

        emit({
          marker: "RECONNECT_COMPLETED",
          sameClientsRecovered: true,
          durableSessionRecovered: Boolean(completed.session),
          durableJobRecovered: true,
          completedJobs: 1,
          admittedJobs: completed.snapshot.admitted,
        });
        break;
      }
    }
  } finally {
    input.close();

    if (worker) {
      await worker.close();
    }

    await state.close();

    try {
      await cleanupNamespace();
    } catch {
      // The controller restores Valkey separately; cleanup is best effort on failure.
    }
  }
}

main().catch((error) => {
  emit({
    marker: "FAIL",
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? "Valkey interruption probe failed.",
  });
  process.exitCode = 1;
});
