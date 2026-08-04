"use strict";

const crypto =
  require("node:crypto");

const {
  UnrecoverableError,
  Worker,
} = require("bullmq");

const IORedis =
  require("ioredis");

const {
  operationalLogger,
} = require(
  "../observability/operationalLogger"
);

const {
  getOperationalState,
} = require(
  "../state/operationalState"
);

const {
  SEARCH_QUEUE_JOB_NAMES,
  getSearchQueueConfig,
} = require(
  "./searchQueueConfig"
);

const JOB_ID_PATTERN =
  /^search-[a-f0-9]{64}$/;
const SEARCH_ID_PATTERN =
  /^ss2\.[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYLOAD_FINGERPRINT_PATTERN =
  /^[a-f0-9]{64}$/;

function createWorkerContractError(
  message
) {
  const error =
    new Error(message);

  error.name =
    "SearchQueueJobContractError";
  error.code =
    "SEARCH_QUEUE_JOB_INVALID";
  error.status =
    400;
  error.retryable =
    false;

  return error;
}

function createWorkerStartupTimeoutError(
  timeoutMs
) {
  const error =
    new Error(
      "The search queue worker did not become ready before its startup deadline."
    );

  error.name =
    "SearchQueueWorkerStartupError";
  error.code =
    "SEARCH_WORKER_START_TIMEOUT";
  error.status =
    503;
  error.retryable =
    true;
  error.retryAfterMs =
    Math.max(
      1_000,
      Number(timeoutMs) || 1_000
    );

  return error;
}

function validateQueuedSearchJob(
  job,
  config
) {
  const data =
    job?.data;
  const jobId =
    typeof job?.id === "string"
      ? job.id.trim()
      : "";
  const searchId =
    typeof data?.searchId ===
      "string"
      ? data.searchId.trim()
      : "";
  const admissionToken =
    typeof data?.admissionToken ===
      "string"
      ? data.admissionToken.trim()
      : "";
  const payloadFingerprint =
    typeof data?.payloadFingerprint ===
      "string"
      ? data.payloadFingerprint
          .trim()
          .toLowerCase()
      : "";

  if (
    job?.name !==
      SEARCH_QUEUE_JOB_NAMES
        .INITIAL_SEARCH ||
    !JOB_ID_PATTERN.test(jobId) ||
    data?.schemaVersion !== 1 ||
    !SEARCH_ID_PATTERN.test(
      searchId
    ) ||
    !TOKEN_PATTERN.test(
      admissionToken
    ) ||
    !PAYLOAD_FINGERPRINT_PATTERN
      .test(
        payloadFingerprint
      ) ||
    !data?.payload ||
    typeof data.payload !==
      "object" ||
    Array.isArray(data.payload)
  ) {
    throw createWorkerContractError(
      "The queued search job does not satisfy the v1 contract."
    );
  }

  let serialized;

  try {
    serialized =
      JSON.stringify(data);
  }
  catch {
    serialized = null;
  }

  if (
    typeof serialized !== "string" ||
    Buffer.byteLength(
      serialized,
      "utf8"
    ) > config.jobPayloadMaxBytes
  ) {
    throw createWorkerContractError(
      "The queued search job exceeds the v1 payload limit."
    );
  }

  return Object.freeze({
    jobId,
    searchId,
    admissionToken,
    payloadFingerprint,
    payload:
      structuredClone(
        data.payload
      ),
  });
}

function getMaximumAttempts(job) {
  const attempts =
    Number(
      job?.opts?.attempts
    );

  return Number.isSafeInteger(
    attempts
  ) &&
    attempts > 0
    ? attempts
    : 1;
}

function getCurrentAttempt(job) {
  const attemptsMade =
    Number(
      job?.attemptsMade
    );

  return (
    Number.isSafeInteger(
      attemptsMade
    ) &&
    attemptsMade >= 0
      ? attemptsMade
      : 0
  ) + 1;
}

function createSanitizedRetryError(
  source
) {
  const error =
    new Error(
      "Queued accommodation search will be retried."
    );

  error.name =
    "QueuedSearchRetryError";
  error.code =
    typeof source?.code ===
      "string"
      ? source.code
      : "PROVIDER_UNAVAILABLE";

  return error;
}

function createAdmissionOwnershipError() {
  const error =
    new Error(
      "Queued search admission ownership was lost."
    );

  error.name =
    "SearchQueueAdmissionStaleError";
  error.code =
    "SEARCH_QUEUE_ADMISSION_STALE";
  error.status =
    409;
  error.retryable =
    false;

  return error;
}

function createQueuedSearchProcessor({
  config,
  operationalState =
    getOperationalState(),
  executeSearch = null,
  markRetry = null,
  markFailed = null,
} = {}) {
  const {
    searchQueueAdmission,
  } = operationalState;

  if (
    !searchQueueAdmission
      ?.enabled
  ) {
    throw createWorkerContractError(
      "The search queue worker requires enabled distributed queue admission."
    );
  }

  const stayService =
    !executeSearch ||
    !markRetry ||
    !markFailed
      ? require(
          "../services/stayService"
        )
      : null;
  const effectiveExecuteSearch =
    executeSearch ??
    stayService
      .executeQueuedHotelSearch;
  const effectiveMarkRetry =
    markRetry ??
    stayService
      .markQueuedHotelSearchRetry;
  const effectiveMarkFailed =
    markFailed ??
    stayService
      .markQueuedHotelSearchFailed;

  return async function processQueuedSearch(
    job
  ) {
    let jobContract;

    try {
      jobContract =
        validateQueuedSearchJob(
          job,
          config
        );
    }
    catch (error) {
      throw new UnrecoverableError(
        error.message
      );
    }

    const executionToken =
      crypto.randomUUID();
    const execution =
      await searchQueueAdmission
        .beginSearchExecution({
          jobId:
            jobContract.jobId,
          admissionToken:
            jobContract
              .admissionToken,
        });

    if (
      execution.searchId !==
        jobContract.searchId ||
      !Number.isSafeInteger(
        execution.fencingNumber
      ) ||
      execution.fencingNumber <= 0
    ) {
      throw new UnrecoverableError(
        "Queued search admission and job data do not match."
      );
    }

    const initialSearchExecution =
      Object.freeze({
        executionToken,
        fencingNumber:
          execution
            .fencingNumber,
      });
    const currentAttempt =
      getCurrentAttempt(job);
    const maximumAttempts =
      getMaximumAttempts(job);
    const admissionHeartbeatMs =
      Math.max(
        250,
        Math.min(
          Math.floor(
            Number(
              config
                .admissionLeaseMs
            ) / 3
          ) || 10_000,
          30_000
        )
      );
    let ownershipLost =
      false;
    let renewalPromise =
      null;
    let terminal =
      false;

    function renewAdmissionOwnership() {
      if (ownershipLost) {
        return Promise.reject(
          createAdmissionOwnershipError()
        );
      }

      if (renewalPromise) {
        return renewalPromise;
      }

      renewalPromise =
        searchQueueAdmission
          .renewSearchAdmission({
            jobId:
              jobContract.jobId,
            admissionToken:
              jobContract
                .admissionToken,
            fencingNumber:
              execution
                .fencingNumber,
          })
          .then((renewed) => {
            if (!renewed) {
              ownershipLost =
                true;

              throw createAdmissionOwnershipError();
            }

            return true;
          })
          .finally(() => {
            renewalPromise =
              null;
          });

      return renewalPromise;
    }

    const heartbeat =
      setInterval(
        () => {
          void renewAdmissionOwnership()
            .catch(() => {
              // The synchronous ownership assertion converts the final result to fail-closed.
            });
        },
        admissionHeartbeatMs
      );

    heartbeat.unref?.();

    try {
      const result =
        await effectiveExecuteSearch({
          searchId:
            jobContract.searchId,
          searchData:
            jobContract.payload,
          initialSearchExecution,
          assertInitialSearchOwnership:
            renewAdmissionOwnership,
        });

      terminal =
        true;

      return {
        schemaVersion:
          1,
        searchId:
          jobContract.searchId,
        status:
          result?.status ??
          "Completed",
      };
    }
    catch (error) {
      if (
        error?.code ===
          "SEARCH_INITIAL_EXECUTION_STALE" ||
        error?.code ===
          "SEARCH_QUEUE_ADMISSION_STALE"
      ) {
        throw new UnrecoverableError(
          "A newer queued search attempt owns this session."
        );
      }

      const retryable =
        error?.retryable === true;
      const hasAttemptsRemaining =
        currentAttempt <
        maximumAttempts;

      if (
        retryable &&
        hasAttemptsRemaining
      ) {
        await effectiveMarkRetry({
          searchId:
            jobContract.searchId,
          initialSearchExecution,
          retryAfterMs:
            error?.retryAfterMs ??
            config.jobBackoffMs,
        });

        await renewAdmissionOwnership();

        throw createSanitizedRetryError(
          error
        );
      }

      await effectiveMarkFailed({
        searchId:
          jobContract.searchId,
        initialSearchExecution,
        code:
          error?.code ??
          "PROVIDER_UNAVAILABLE",
        retryable,
        retryAfterMs:
          error?.retryAfterMs ??
          null,
      });

      terminal =
        true;

      throw new UnrecoverableError(
        "Queued accommodation search could not be completed."
      );
    }
    finally {
      clearInterval(heartbeat);

      if (renewalPromise) {
        try {
          await renewalPromise;
        }
        catch {
          ownershipLost =
            true;
        }
      }

      if (terminal) {
        await searchQueueAdmission
          .releaseSearchAdmission({
            jobId:
              jobContract.jobId,
            admissionToken:
              jobContract
                .admissionToken,
            fencingNumber:
              execution
                .fencingNumber,
          });
      }
    }
  };
}

function calculatePercentile(
  values,
  percentile
) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (left, right) =>
      left - right
  );
  const index =
    Math.min(
      sorted.length - 1,
      Math.max(
        0,
        Math.ceil(
          percentile *
            sorted.length
        ) - 1
      )
    );

  return sorted[index];
}

function createIoredisWorkerClient(
  config
) {
  return new IORedis(
    config.url,
    {
      connectTimeout:
        config.connectTimeoutMs,
      enableOfflineQueue:
        true,
      enableReadyCheck:
        true,
      // BullMQ must observe reconnect events instead of a rejected lazy connect promise.
      lazyConnect:
        false,
      maxRetriesPerRequest:
        null,
      retryStrategy(
        retries
      ) {
        return Math.min(
          100 *
            2 ** Math.min(
              retries,
              5
            ),
          3_000
        );
      },
    }
  );
}

function isWorkerClientOpen(
  client
) {
  if (
    typeof client?.isOpen ===
      "boolean"
  ) {
    return client.isOpen;
  }

  return ![
    "close",
    "closed",
    "end",
  ].includes(
    String(
      client?.status ?? ""
    ).toLowerCase()
  );
}

function createSearchQueueWorker({
  config =
    getSearchQueueConfig(),
  operationalState =
    getOperationalState(),
  processor =
    null,
  createClientOverride =
    createIoredisWorkerClient,
  WorkerClass =
    Worker,
  workerOptions = {},
} = {}) {
  if (!config?.enabled) {
    throw createWorkerContractError(
      "The search queue worker feature flag is disabled."
    );
  }

  const rawClient =
    createClientOverride(
      config,
      {
        worker:
          true,
      }
    );
  const workerConnectionDriver =
    rawClient instanceof IORedis
      ? "ioredis"
      : "custom";
  const effectiveProcessor =
    processor ??
    createQueuedSearchProcessor({
      config,
      operationalState,
    });
  let activeExecutions =
    0;
  const inactiveWaiters =
    new Set();
  const queueWaitSamples =
    [];
  let completedTotal =
    0;
  let failedTotal =
    0;
  let stalledTotal =
    0;

  function resolveInactiveWaiters() {
    if (activeExecutions !== 0) {
      return;
    }

    for (const waiter of inactiveWaiters) {
      clearTimeout(
        waiter.timeoutHandle
      );
      waiter.resolve(true);
    }

    inactiveWaiters.clear();
  }

  async function trackedProcessor(
    ...argumentsList
  ) {
    activeExecutions +=
      1;

    try {
      return await effectiveProcessor(
        ...argumentsList
      );
    }
    finally {
      activeExecutions =
        Math.max(
          0,
          activeExecutions - 1
        );
      resolveInactiveWaiters();
    }
  }

  const worker =
    new WorkerClass(
      config.queueName,
      trackedProcessor,
      {
        connection:
          rawClient,
        prefix:
          config.prefix,
        concurrency:
          config.workerConcurrency,
        maxStalledCount:
          2,
        ...workerOptions,
      }
    );

  worker.on(
    "active",
    (job) => {
      const queuedAt =
        Number(job?.timestamp);

      if (
        Number.isFinite(
          queuedAt
        ) &&
        queuedAt > 0
      ) {
        queueWaitSamples.push(
          Math.max(
            0,
            Date.now() -
              queuedAt
          )
        );

        if (
          queueWaitSamples.length >
          512
        ) {
          queueWaitSamples.shift();
        }
      }
    }
  );

  worker.on(
    "error",
    (error) => {
      operationalLogger.error(
        "search.queue.worker.error",
        {
          code:
            error?.code ??
            null,
        }
      );
    }
  );

  worker.on(
    "completed",
    (job) => {
      completedTotal +=
        1;

      operationalLogger.info(
        "search.queue.job.completed",
        {
          jobId:
            job?.id ??
            null,
        }
      );
    }
  );

  worker.on(
    "failed",
    (job, error) => {
      failedTotal +=
        1;

      operationalLogger.error(
        "search.queue.job.failed",
        {
          jobId:
            job?.id ??
            null,
          code:
            error?.code ??
            null,
        }
      );
    }
  );

  worker.on(
    "stalled",
    () => {
      stalledTotal +=
        1;

      operationalLogger.warn(
        "search.queue.job.stalled",
        {
          stalledTotal,
        }
      );
    }
  );

  let closed =
    false;
  let closePromise =
    null;
  let drainPromise =
    null;
  let readyPromise =
    null;
  const workerStartTimeoutMs =
    Number.isSafeInteger(
      Number(
        config
          .workerStartTimeoutMs
      )
    ) &&
    Number(
      config
        .workerStartTimeoutMs
    ) >= 1_000
      ? Number(
          config
            .workerStartTimeoutMs
        )
      : 30_000;
  const workerCloseTimeoutMs =
    Math.max(
      1_000,
      Math.min(
        30_000,
        Number(
          config
            .commandTimeoutMs
        ) || 3_000
      )
    );

  function waitUntilInactive(
    timeoutMs
  ) {
    if (activeExecutions === 0) {
      return Promise.resolve(
        true
      );
    }

    return new Promise(
      (resolve) => {
        const waiter = {
          resolve,
          timeoutHandle:
            null,
        };

        waiter.timeoutHandle =
          setTimeout(
            () => {
              inactiveWaiters.delete(
                waiter
              );
              resolve(false);
            },
            timeoutMs
          );

        inactiveWaiters.add(
          waiter
        );
      }
    );
  }

  function forceDisconnectWorker() {
    try {
      Promise.resolve(
        worker.disconnect?.()
      ).catch(() => {});
    }
    catch {
      // The owned raw connection is still destroyed below.
    }

    if (
      !isWorkerClientOpen(
        rawClient
      )
    ) {
      return;
    }

    try {
      if (
        typeof rawClient.disconnect ===
          "function"
      ) {
        rawClient.disconnect();
      }
      else if (
        typeof rawClient.destroy ===
          "function"
      ) {
        rawClient.destroy();
      }
    }
    catch {
      // A concurrent worker close already owns the connection.
    }
  }

  async function waitUntilReady() {
    if (readyPromise) {
      return readyPromise;
    }

    readyPromise =
      (async () => {
        let timeoutHandle;
        const readiness =
          Promise.resolve()
            .then(
              () =>
                worker
                  .waitUntilReady()
            )
            .then(
              (result) => ({
                status:
                  "ready",
                result,
              }),
              (error) => ({
                status:
                  "error",
                error,
              })
            );
        const timeout =
          new Promise(
            (resolveTimeout) => {
              timeoutHandle =
                setTimeout(
                  () => resolveTimeout({
                    status:
                      "timeout",
                  }),
                  workerStartTimeoutMs
                );
            }
          );
        const outcome =
          await Promise.race([
            readiness,
            timeout,
          ]);

        clearTimeout(
          timeoutHandle
        );

        if (
          outcome.status ===
            "ready"
        ) {
          return outcome.result;
        }

        forceDisconnectWorker();

        if (
          outcome.status ===
            "error"
        ) {
          throw outcome.error;
        }

        throw createWorkerStartupTimeoutError(
          workerStartTimeoutMs
        );
      })();

    return readyPromise;
  }

  async function closeWorker(
    force = false
  ) {
    if (closePromise) {
      return closePromise;
    }

    closed = true;
    closePromise =
      (async () => {
        let timeoutHandle;
        const gracefulClose =
          Promise.resolve()
            .then(
              () =>
                worker.close(
                  force
                )
            )
            .then(
              () => ({
                status:
                  "closed",
              }),
              (error) => ({
                status:
                  "error",
                error,
              })
            );
        const timeout =
          new Promise(
            (resolveTimeout) => {
              timeoutHandle =
                setTimeout(
                  () => resolveTimeout({
                    status:
                      "timeout",
                  }),
                  workerCloseTimeoutMs
                );
            }
          );
        const outcome =
          await Promise.race([
            gracefulClose,
            timeout,
          ]);

        clearTimeout(
          timeoutHandle
        );

        if (
          outcome.status !==
            "closed"
        ) {
          forceDisconnectWorker();

          if (
            outcome.status ===
              "error"
          ) {
            throw outcome.error;
          }

          return Object.freeze({
            forced:
              true,
          });
        }

        if (
          isWorkerClientOpen(
            rawClient
          )
        ) {
          try {
            await rawClient.quit();
          }
          catch {
            forceDisconnectWorker();
          }
        }

        return Object.freeze({
          forced:
            Boolean(force),
        });
      })();

    return closePromise;
  }

  async function close() {
    if (closed) {
      return closePromise;
    }

    return closeWorker(
      false
    );
  }

  async function drain({
    timeoutMs =
      config.workerDrainTimeoutMs,
  } = {}) {
    if (drainPromise) {
      return drainPromise;
    }

    const safeTimeoutMs =
      Number.isSafeInteger(
        Number(timeoutMs)
      ) &&
      Number(timeoutMs) >= 1
        ? Number(timeoutMs)
        : config
            .workerDrainTimeoutMs;

    drainPromise =
      (async () => {
        const startedAt =
          Date.now();

        if (closed) {
          const closeResult =
            await closePromise;

          return Object.freeze({
            drained:
              activeExecutions ===
              0,
            forced:
              closeResult
                ?.forced ===
                true,
            activeAtTimeout:
              activeExecutions,
            durationMs:
              0,
          });
        }

        await worker.pause(
          true
        );

        const drained =
          await waitUntilInactive(
            safeTimeoutMs
          );
        const activeAtTimeout =
          activeExecutions;

        const closeResult =
          await closeWorker(
            !drained
          );

        return Object.freeze({
          drained,
          forced:
            !drained ||
            closeResult
              ?.forced ===
              true,
          activeAtTimeout,
          durationMs:
            Math.max(
              0,
              Date.now() -
                startedAt
            ),
        });
      })();

    return drainPromise;
  }

  function getWorkerMetricsSnapshot() {
    return Object.freeze({
      active:
        activeExecutions,
      completedTotal,
      failedTotal,
      stalledTotal,
      queueWaitP50Ms:
        calculatePercentile(
          queueWaitSamples,
          0.5
        ),
      queueWaitP95Ms:
        calculatePercentile(
          queueWaitSamples,
          0.95
        ),
      queueWaitP99Ms:
        calculatePercentile(
          queueWaitSamples,
          0.99
        ),
    });
  }

  function getConnectionDiagnostics() {
    return Object.freeze({
      driver:
        workerConnectionDriver,
      lazyConnect:
        rawClient?.options
          ?.lazyConnect === true,
      status:
        typeof rawClient?.status ===
          "string"
          ? rawClient.status
          : rawClient?.isReady
            ? "ready"
            : rawClient?.isOpen
              ? "open"
              : "closed",
      open:
        isWorkerClientOpen(
          rawClient
        ),
    });
  }

  return Object.freeze({
    worker,
    waitUntilReady:
      waitUntilReady,
    pauseAcquisition:
      () => worker.pause(
        true
      ),
    resumeAcquisition:
      () => worker.resume(),
    drain,
    getWorkerMetricsSnapshot,
    getConnectionDiagnostics,
    close,
  });
}

module.exports = {
  validateQueuedSearchJob,
  createQueuedSearchProcessor,
  createIoredisWorkerClient,
  createSearchQueueWorker,
};
