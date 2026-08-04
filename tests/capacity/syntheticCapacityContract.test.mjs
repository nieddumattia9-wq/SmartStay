import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import test from "node:test";
import { createRequire } from "node:module";

import {
  createSyntheticProcessRecord,
  runSyntheticOperationWithDeadline,
  waitForSyntheticMessage,
} from "../../scripts/lib/syntheticProcessSupervisor.mjs";

const require = createRequire(import.meta.url);

const {
  RedisConnection,
} = require(
  "../../server/node_modules/bullmq"
);
const {
  createValkeyCommandExecutor,
} = require(
  "../../server/state/valkey/valkeyShared.js"
);
const {
  createValkeySearchSessionAdapters,
} = require(
  "../../server/state/valkey/valkeySearchSessionStore.js"
);
const {
  createBullMqSearchQueueAdmission,
} = require(
  "../../server/queue/searchQueueAdmission.js"
);
const {
  createIoredisWorkerClient,
  createSearchQueueWorker,
} = require(
  "../../server/queue/searchQueueWorker.js"
);
const {
  getSearchQueueConfig,
} = require(
  "../../server/queue/searchQueueConfig.js"
);

const repositoryRoot = new URL("../../", import.meta.url);
const contractPath = new URL(
  "../../contracts/SYNTHETIC-CAPACITY-CHAOS-CONTRACT.json",
  import.meta.url
);
const gatePath = new URL(
  "../../scripts/run-synthetic-capacity-chaos-gate.mjs",
  import.meta.url
);
const fixturePath = new URL(
  "../fixtures/syntheticCapacityProcess.mjs",
  import.meta.url
);
const interruptionProbePath = new URL(
  "./valkeyInterruptionProbe.mjs",
  import.meta.url
);
const packagePath = new URL("../../package.json", import.meta.url);
const stateConfigPath = new URL(
  "../../server/state/valkey/createValkeyOperationalState.js",
  import.meta.url
);
const workerPath = new URL(
  "../../server/queue/searchQueueWorker.js",
  import.meta.url
);

async function readText(url) {
  return readFile(url, "utf8");
}

function listenLoopback(server, port = 0) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      reject(error);
    };

    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve(server.address().port);
    });
  });
}

function closeLoopbackServer(server, sockets = new Set()) {
  for (const socket of sockets) {
    socket.destroy();
  }

  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function readRespArray(buffer) {
  const firstLineEnd = buffer.indexOf("\r\n");

  if (
    firstLineEnd < 0 ||
    buffer[0] !== 42
  ) {
    return null;
  }

  const itemCount = Number(
    buffer
      .subarray(1, firstLineEnd)
      .toString("ascii")
  );
  let offset = firstLineEnd + 2;
  const items = [];

  for (
    let index = 0;
    index < itemCount;
    index += 1
  ) {
    const lengthLineEnd =
      buffer.indexOf("\r\n", offset);

    if (
      lengthLineEnd < 0 ||
      buffer[offset] !== 36
    ) {
      return null;
    }

    const itemLength = Number(
      buffer
        .subarray(
          offset + 1,
          lengthLineEnd
        )
        .toString("ascii")
    );
    const itemStart =
      lengthLineEnd + 2;
    const itemEnd =
      itemStart + itemLength;

    if (
      !Number.isSafeInteger(
        itemLength
      ) ||
      itemLength < 0 ||
      buffer.length <
        itemEnd + 2
    ) {
      return null;
    }

    items.push(
      buffer
        .subarray(
          itemStart,
          itemEnd
        )
        .toString("utf8")
    );
    offset = itemEnd + 2;
  }

  return {
    items,
    remaining:
      buffer.subarray(offset),
  };
}

function createReadyCheckServer() {
  const sockets = new Set();
  const server = net.createServer(
    (socket) => {
      sockets.add(socket);
      socket.once(
        "close",
        () => sockets.delete(socket)
      );
      let buffer = Buffer.alloc(0);

      socket.on("data", (chunk) => {
        buffer = Buffer.concat([
          buffer,
          chunk,
        ]);

        while (buffer.length > 0) {
          const command =
            readRespArray(buffer);

          if (!command) {
            break;
          }

          buffer = command.remaining;

          if (
            String(
              command.items[0] ?? ""
            ).toUpperCase() === "INFO"
          ) {
            const info =
              "# Server\r\n" +
              "redis_version:8.1.9\r\n" +
              "loading:0\r\n";

            socket.write(
              `$${Buffer.byteLength(info)}\r\n${info}\r\n`
            );
          }
          else {
            socket.write("+OK\r\n");
          }
        }
      });
    }
  );

  return {
    server,
    sockets,
  };
}

test("4D capacity thresholds remain exact, bounded and provider-free", async () => {
  const contract = JSON.parse(await readText(contractPath));

  assert.equal(contract.contractId, "39C25A.4D");
  assert.equal(contract.activeSessions.target, 1000);
  assert.equal(contract.burstAdmission.requests, 100);
  assert.equal(contract.burstAdmission.windowMsMaximum, 10_000);
  assert.equal(contract.exceptionalOverload.attemptedRequests, 1000);
  assert.equal(contract.exceptionalOverload.hardAdmittedJobMaximum, 1000);
  assert.equal(contract.multiProcess.minimumWebProcesses, 2);
  assert.equal(contract.multiProcess.minimumWorkerProcesses, 2);
  assert.equal(
    contract.multiProcess.workerQueueConnectionDriver,
    "ioredis"
  );
  assert.equal(contract.multiProcess.globalProviderActiveLimit, 8);
  assert.equal(contract.externalNetworkAllowed, false);
  assert.equal(contract.massProviderCallsAllowed, 0);
  assert.equal(contract.massBookingCallsAllowed, 0);
  assert.equal(contract.externalAnalyticsCallsAllowed, 0);
  assert.equal(contract.sharedStore.commandPoolSizePerProcess, 4);
  assert.equal(contract.sharedStore.commandPoolMaximum, 8);
  assert.equal(
    contract.sharedStore.scheduling,
    "least-inflight-round-robin"
  );
  assert.equal(contract.sharedStore.offlineQueueEnabled, false);
  assert.equal(contract.chaos.acceptedJobLossAllowed, 0);
  assert.equal(contract.harness.processReadyTimeoutMs, 45_000);
  assert.equal(contract.harness.workerStartupTimeoutMs, 20_000);
  assert.equal(contract.harness.processReadyMaximumAttempts, 2);
  assert.equal(contract.harness.processReadyRetryDelayMs, 500);
  assert.equal(contract.harness.httpRequestTimeoutMs, 15_000);
  assert.equal(contract.harness.controlledRunnerStageTimeoutMs, 720_000);
  assert.equal(contract.harness.activeSessionScenarioTimeoutMs, 180_000);
  assert.equal(contract.harness.multiProcessScenarioTimeoutMs, 240_000);
  assert.equal(contract.harness.overloadScenarioTimeoutMs, 240_000);
  assert.equal(contract.harness.cleanupOperationTimeoutMs, 10_000);
  assert.equal(contract.harness.processCleanupTimeoutMs, 35_000);
  assert.equal(contract.harness.serverCloseTimeoutMs, 5_000);
  assert.equal(contract.harness.initialStartupOrder, "web-before-worker");
  assert.equal(
    contract.harness.replacementWorkerStartupOrder,
    "sequential"
  );
  assert.equal(contract.harness.fatalMessageFailFastRequired, true);
  assert.equal(contract.harness.roleSpecificTimeoutEvidenceRequired, true);
  assert.equal(contract.harness.capacityJournalRequired, true);
  assert.equal(
    contract.harness.workerConnectionJournalRequired,
    true
  );
  assert.equal(
    contract.harness.workerInitialReconnectRequired,
    true
  );
  assert.equal(
    contract.harness.workerLazyConnectionAllowed,
    false
  );
  assert.equal(contract.harness.windowsProcessTreeKillFallbackRequired, true);
  assert.equal(contract.harness.failureExitImmediateRequired, true);
  assert.equal(contract.harness.progressEverySessions, 100);
});

test("4D executable surfaces are explicit and cannot import live providers", async () => {
  const [
    gateSource,
    fixtureSource,
    interruptionSource,
    packageSource,
    stateConfigSource,
    workerSource,
  ] =
    await Promise.all([
    readText(gatePath),
    readText(fixturePath),
    readText(interruptionProbePath),
    readText(packagePath),
    readText(stateConfigPath),
    readText(workerPath),
  ]);
  const executableSource = `${gateSource}\n${fixtureSource}\n${interruptionSource}`;
  const forbiddenImports = [
    /providers\/liteApi/i,
    /providers\/routeStack/i,
    /providers\/rateHawk/i,
    /liteApiClient/i,
    /routeStackClient/i,
    /rateHawkClient/i,
  ];

  for (const pattern of forbiddenImports) {
    assert.doesNotMatch(executableSource, pattern);
  }

  const packageJson = JSON.parse(packageSource);

  assert.equal(
    packageJson.scripts["gate:capacity-chaos"],
    "node scripts/run-synthetic-capacity-chaos-gate.mjs"
  );
  assert.match(packageJson.scripts.test, /test:capacity-contract/);
  assert.match(stateConfigSource, /SMARTSTAY_STATE_MAX_SESSIONS/);
  assert.match(gateSource, /CAPACITY_GATE_HARD_TIMEOUT/);
  assert.match(gateSource, /Promise\.race\(\[\s*main\(\),\s*gateHardDeadline/s);
  assert.match(gateSource, /SMARTSTAY_SEARCH_WORKER_START_TIMEOUT_MS/);
  assert.match(gateSource, /SMARTSTAY_CAPACITY_JOURNAL_PATH/);
  assert.match(gateSource, /CAPACITY_MULTI_PROCESS_SCENARIO_TIMEOUT/);
  assert.match(gateSource, /taskkill\.exe/);
  assert.match(fixtureSource, /closeAllConnections/);
  assert.match(fixtureSource, /worker-connection/);
  assert.match(workerSource, /require\("ioredis"\)/);
  assert.match(workerSource, /connection:\s*rawClient/);
  assert.match(workerSource, /lazyConnect:\s*false/);
  assert.doesNotMatch(workerSource, /lazyConnect:\s*true/);
  assert.doesNotMatch(workerSource, /createNodeRedisClient/);
  assert.match(workerSource, /getConnectionDiagnostics/);
  assert.ok(repositoryRoot);
});

test("shared session reads use one Valkey round trip for state and payload", async () => {
  const searchId =
    "ss2.12345678-1234-4123-8123-123456789abc";
  const storedSession = {
    searchId,
    marker: "single-round-trip",
    hotels: [],
  };
  const envelope = JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    session: storedSession,
  });
  let executeCalls = 0;
  let mGetCalls = 0;
  let getCalls = 0;
  const executor = {
    async execute(operation) {
      executeCalls += 1;

      return operation({
        async mGet(keys) {
          mGetCalls += 1;
          assert.deepEqual(keys, [
            `session:${searchId}`,
            `tombstone:${searchId}`,
          ]);
          return [envelope, "known"];
        },
        async get() {
          getCalls += 1;
          return envelope;
        },
      });
    },
  };
  const keyspace = {
    session(id) {
      return `session:${id}`;
    },
    tombstone(id) {
      return `tombstone:${id}`;
    },
  };
  const { searchSessionStore } =
    createValkeySearchSessionAdapters({
      executor,
      keyspace,
    });

  const session =
    await searchSessionStore.getSearchSession(
      searchId
    );

  assert.deepEqual(session, storedSession);
  assert.equal(executeCalls, 1);
  assert.equal(mGetCalls, 1);
  assert.equal(getCalls, 0);
});

test("shared state commands use a bounded least-inflight connection pool", async () => {
  const createdClients = [];
  const clientUsage = new Map();
  const releases = [];
  let resolveAllStarted;
  const allStarted = new Promise((resolve) => {
    resolveAllStarted = resolve;
  });

  function createFakeClient(options) {
    const client = new EventEmitter();

    client.id = createdClients.length;
    client.isOpen = false;
    client.isReady = false;
    client.options = options;
    client.connect = async () => {
      client.isOpen = true;
      client.isReady = true;
    };
    client.destroy = () => {
      client.isOpen = false;
      client.isReady = false;
      client.destroyed = true;
    };
    createdClients.push(client);
    return client;
  }

  const executor = createValkeyCommandExecutor({
    url: "redis://127.0.0.1:6379/15",
    commandPoolSize: 4,
    createClient: createFakeClient,
  });
  const operations = Array.from(
    {
      length: 32,
    },
    () =>
      executor.execute(
        (client) =>
          new Promise((resolve) => {
            clientUsage.set(
              client.id,
              (clientUsage.get(client.id) ?? 0) + 1
            );
            releases.push(() => resolve(client.id));

            if (releases.length === 32) {
              resolveAllStarted();
            }
          })
      )
  );

  await allStarted;

  assert.equal(executor.commandPoolSize, 4);
  assert.equal(createdClients.length, 4);
  assert.deepEqual(
    [...clientUsage.values()].sort((left, right) => left - right),
    [8, 8, 8, 8]
  );
  assert.ok(
    createdClients.every(
      (client) =>
        client.options.disableOfflineQueue === true
    )
  );

  for (const release of releases) {
    release();
  }

  await Promise.all(operations);
  await executor.close();
  assert.ok(
    createdClients.every(
      (client) => client.destroyed === true
    )
  );
});

test("queue admission close is bounded and force-disconnects a stuck BullMQ close", async () => {
  let rawDestroyCalls = 0;
  let queueDisconnectCalls = 0;
  let queueCloseCalls = 0;
  const rawClient = new EventEmitter();

  rawClient.isOpen = true;
  rawClient.isReady = true;
  rawClient.options = {};
  rawClient.destroy = () => {
    rawDestroyCalls += 1;
    rawClient.isOpen = false;
    rawClient.isReady = false;
    rawClient.emit("end");
  };
  rawClient.quit = async () => {
    throw new Error("Graceful raw close must not run before BullMQ closes.");
  };

  class StuckQueue extends EventEmitter {
    close() {
      queueCloseCalls += 1;
      return new Promise(() => {});
    }

    disconnect() {
      queueDisconnectCalls += 1;
    }
  }

  const config = getSearchQueueConfig({
    SMARTSTAY_ASYNC_SEARCH_QUEUE_ENABLED: "true",
    SMARTSTAY_QUEUE_REDIS_URL: "redis://127.0.0.1:6379",
    SMARTSTAY_QUEUE_ENVIRONMENT: "bounded-close-contract",
    SMARTSTAY_QUEUE_KEY_SECRET:
      "smartstay-bounded-close-contract-secret-2026",
    SMARTSTAY_QUEUE_CONNECT_TIMEOUT_MS: "100",
    SMARTSTAY_QUEUE_COMMAND_TIMEOUT_MS: "100",
  });
  const admission = createBullMqSearchQueueAdmission({
    config,
    createClientOverride() {
      return rawClient;
    },
    QueueClass: StuckQueue,
  });
  const startedAt = Date.now();
  const first = await admission.close();
  const elapsedMs = Date.now() - startedAt;
  const second = await admission.close();

  assert.deepEqual(first, {
    closed: true,
    forced: true,
  });
  assert.equal(second, first);
  assert.equal(queueCloseCalls, 1);
  assert.equal(queueDisconnectCalls, 1);
  assert.equal(rawDestroyCalls, 1);
  assert.ok(elapsedMs >= 90, `close returned too early: ${elapsedMs}ms`);
  assert.ok(elapsedMs < 1000, `close remained pending: ${elapsedMs}ms`);
});

test("queue worker startup is bounded, forceable and survives an initial connection refusal", async () => {
  let workerDisconnectCalls = 0;
  let rawDestroyCalls = 0;
  const rawClient = new EventEmitter();

  rawClient.isOpen = true;
  rawClient.isReady = false;
  rawClient.options = {};
  rawClient.destroy = () => {
    rawDestroyCalls += 1;
    rawClient.isOpen = false;
    rawClient.isReady = false;
  };
  rawClient.disconnect = rawClient.destroy;
  rawClient.sendCommand = async () => {
    throw new Error("No command is expected during the synthetic timeout.");
  };

  class StuckWorker extends EventEmitter {
    waitUntilReady() {
      return new Promise(() => {});
    }

    disconnect() {
      workerDisconnectCalls += 1;
    }

    close() {
      return Promise.resolve();
    }

    pause() {
      return Promise.resolve();
    }

    resume() {
      return Promise.resolve();
    }
  }

  const worker = createSearchQueueWorker({
    config: {
      enabled: true,
      queueName: "bounded-worker-startup",
      prefix: "bounded-worker-startup",
      workerConcurrency: 1,
      workerStartTimeoutMs: 1_000,
      workerDrainTimeoutMs: 1_000,
      commandTimeoutMs: 100,
    },
    operationalState: {},
    processor: async () => {},
    createClientOverride() {
      return rawClient;
    },
    WorkerClass: StuckWorker,
  });
  const startedAt = Date.now();

  await assert.rejects(
    worker.waitUntilReady(),
    (error) => {
      assert.equal(error.code, "SEARCH_WORKER_START_TIMEOUT");
      assert.equal(error.status, 503);
      assert.equal(error.retryable, true);
      return true;
    }
  );

  const elapsedMs = Date.now() - startedAt;

  assert.ok(elapsedMs >= 900, `startup returned too early: ${elapsedMs}ms`);
  assert.ok(elapsedMs < 2500, `startup remained pending: ${elapsedMs}ms`);
  assert.equal(workerDisconnectCalls, 1);
  assert.equal(rawDestroyCalls, 1);

  const reservation =
    createReadyCheckServer();
  const delayedPort =
    await listenLoopback(
      reservation.server
    );

  await closeLoopbackServer(
    reservation.server,
    reservation.sockets
  );

  const connectionErrors = [];
  const delayedClient =
    createIoredisWorkerClient({
      url:
        `redis://127.0.0.1:${delayedPort}/15`,
      connectTimeoutMs:
        100,
    });

  delayedClient.on(
    "error",
    (error) => {
      connectionErrors.push(
        error?.code ?? null
      );
    }
  );

  let delayedServer = null;
  let startTimer = null;
  let deadlineTimer = null;
  const delayedServerPromise =
    new Promise((resolve, reject) => {
      startTimer = setTimeout(
        async () => {
          try {
            const readyCheckServer =
              createReadyCheckServer();

            await listenLoopback(
              readyCheckServer.server,
              delayedPort
            );
            resolve(
              readyCheckServer
            );
          }
          catch (error) {
            reject(error);
          }
        },
        120
      );
    });

  try {
    await Promise.race([
      RedisConnection.waitUntilReady(
        delayedClient
      ),
      new Promise((
        _resolve,
        reject
      ) => {
        deadlineTimer = setTimeout(
          () => reject(
            new Error(
              "Initial ioredis reconnect regression exceeded its deadline."
            )
          ),
          3_000
        );
      }),
    ]);
    delayedServer =
      await delayedServerPromise;

    assert.equal(
      delayedClient.options
        .lazyConnect,
      false
    );
    assert.equal(
      delayedClient.status,
      "ready"
    );
    assert.ok(
      connectionErrors.includes(
        "ECONNREFUSED"
      ),
      "the delayed endpoint must exercise an initial connection refusal"
    );
  }
  finally {
    clearTimeout(startTimer);
    clearTimeout(deadlineTimer);
    delayedClient.disconnect();

    if (!delayedServer) {
      delayedServer =
        await delayedServerPromise
          .catch(() => null);
    }

    if (delayedServer) {
      await closeLoopbackServer(
        delayedServer.server,
        delayedServer.sockets
      );
    }
  }
});

function createFakeSyntheticRecord(options = {}, recordOptions = {}) {
  const child = new EventEmitter();

  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 4242;
  child.connected = true;

  return {
    child,
    record: createSyntheticProcessRecord({
      child,
      options: {
        role: "worker",
        webMode: "default",
        ...options,
      },
      ...recordOptions,
    }),
  };
}

test("synthetic process supervisor resolves labelled readiness", async () => {
  const observedEvents = [];
  const { child, record } = createFakeSyntheticRecord(
    {},
    {
      onMessage(_record, message) {
        observedEvents.push(message?.event);
      },
    }
  );
  const pending = waitForSyntheticMessage(record, {
    predicate: (message) => message?.event === "ready",
    expectedEvent: "ready:worker:default",
    timeoutMs: 100,
  });

  child.emit("message", {
    event: "boot",
  });
  child.emit("message", {
    event: "ready",
  });

  assert.deepEqual(await pending, {
    event: "ready",
  });
  assert.deepEqual(observedEvents, ["boot", "ready"]);
});

test("synthetic process supervisor fails fast on fatal IPC", async () => {
  const { child, record } = createFakeSyntheticRecord();
  const pending = waitForSyntheticMessage(record, {
    predicate: (message) => message?.event === "ready",
    expectedEvent: "ready:worker:default",
    timeoutMs: 1000,
  });
  const startedAt = Date.now();

  child.emit("message", {
    event: "boot",
  });
  child.emit("message", {
    event: "fatal",
    code: "SYNTHETIC_BOOT_FAILURE",
    message: "deterministic supervisor regression",
  });

  await assert.rejects(pending, (error) => {
    assert.equal(error.code, "CAPACITY_PROCESS_FATAL");
    assert.equal(error.details.role, "worker");
    assert.equal(error.details.pid, 4242);
    assert.equal(error.details.fatalCode, "SYNTHETIC_BOOT_FAILURE");
    assert.deepEqual(error.details.receivedEvents, ["boot", "fatal"]);
    return true;
  });
  assert.ok(Date.now() - startedAt < 500);
});

test("synthetic process supervisor timeout preserves role and lifecycle evidence", async () => {
  const { child, record } = createFakeSyntheticRecord({
    role: "web",
    webMode: "public-route",
  });

  child.emit("message", {
    event: "boot",
  });
  child.emit("message", {
    event: "initializing",
  });

  await assert.rejects(
    waitForSyntheticMessage(record, {
      predicate: (message) => message?.event === "ready",
      expectedEvent: "ready:web:public-route",
      timeoutMs: 20,
    }),
    (error) => {
      assert.equal(error.code, "CAPACITY_PROCESS_MESSAGE_TIMEOUT");
      assert.equal(error.details.role, "web");
      assert.equal(error.details.mode, "public-route");
      assert.equal(error.details.pid, 4242);
      assert.equal(error.details.expectedEvent, "ready:web:public-route");
      assert.deepEqual(error.details.receivedEvents, ["boot", "initializing"]);
      return true;
    }
  );

  const deadlineStartedAt = Date.now();

  await assert.rejects(
    runSyntheticOperationWithDeadline(
      () => new Promise(() => {}),
      {
        timeoutMs: 20,
        code: "CAPACITY_TEST_OPERATION_TIMEOUT",
        message: "Synthetic regression deadline.",
        details: () => ({
          checkpoint: "regression",
        }),
      }
    ),
    (error) => {
      assert.equal(error.code, "CAPACITY_TEST_OPERATION_TIMEOUT");
      assert.equal(error.details.timeoutMs, 20);
      assert.equal(error.details.checkpoint, "regression");
      return true;
    }
  );
  assert.ok(Date.now() - deadlineStartedAt < 500);
});
