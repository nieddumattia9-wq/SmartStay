"use strict";

const crypto =
  require("node:crypto");

const {
  Queue,
  createNodeRedisClient,
} = require("bullmq");

const {
  createClient,
} = require("redis");

const {
  SEARCH_QUEUE_JOB_NAMES,
  SEARCH_QUEUE_PRIORITIES,
} = require(
  "./searchQueueConfig"
);

const RESERVE_ADMISSION_SCRIPT =
  String.raw`
local now = tonumber(ARGV[4])
local expires_at = now + tonumber(ARGV[5])
local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', now)

for _, expired_job_id in ipairs(expired) do
  redis.call('HDEL', KEYS[2], expired_job_id)
  redis.call('HDEL', KEYS[3], expired_job_id)
end

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)

local existing = redis.call('HGET', KEYS[2], ARGV[1])
if existing then
  local record = cjson.decode(existing)
  if tostring(record.payloadFingerprint or '') ~= ARGV[7] then
    return {'conflict'}
  end
  record.expiresAt = expires_at
  redis.call('HSET', KEYS[2], ARGV[1], cjson.encode(record))
  redis.call('ZADD', KEYS[1], expires_at, ARGV[1])
  return {'existing', record.searchId, record.admissionToken}
end

if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[6]) then
  return {'full'}
end

local record = cjson.encode({
  schemaVersion = 1,
  searchId = ARGV[2],
  admissionToken = ARGV[3],
  payloadFingerprint = ARGV[7],
  admittedAt = now,
  expiresAt = expires_at
})

redis.call('HSET', KEYS[2], ARGV[1], record)
redis.call('ZADD', KEYS[1], expires_at, ARGV[1])
return {'created', ARGV[2], ARGV[3]}
`;

const BEGIN_EXECUTION_SCRIPT =
  String.raw`
local record_raw = redis.call('HGET', KEYS[2], ARGV[1])
if not record_raw then
  return {'missing'}
end

local record = cjson.decode(record_raw)
if record.admissionToken ~= ARGV[2] then
  return {'stale'}
end

local expires_at = tonumber(ARGV[3]) + tonumber(ARGV[4])
local fencing_number = redis.call('HINCRBY', KEYS[3], ARGV[1], 1)
record.expiresAt = expires_at
redis.call('HSET', KEYS[2], ARGV[1], cjson.encode(record))
redis.call('ZADD', KEYS[1], expires_at, ARGV[1])
return {'ok', tostring(fencing_number), record.searchId}
`;

const RENEW_ADMISSION_SCRIPT =
  String.raw`
local record_raw = redis.call('HGET', KEYS[2], ARGV[1])
if not record_raw then
  return 0
end

local record = cjson.decode(record_raw)
if record.admissionToken ~= ARGV[2] then
  return 0
end

local expected_fence = tonumber(ARGV[3] or '0')
local current_fence = tonumber(redis.call('HGET', KEYS[3], ARGV[1]) or '0')
if current_fence ~= expected_fence then
  return 0
end

local expires_at = tonumber(ARGV[4]) + tonumber(ARGV[5])
record.expiresAt = expires_at
redis.call('HSET', KEYS[2], ARGV[1], cjson.encode(record))
redis.call('ZADD', KEYS[1], expires_at, ARGV[1])
return 1
`;

const RELEASE_ADMISSION_SCRIPT =
  String.raw`
local record_raw = redis.call('HGET', KEYS[2], ARGV[1])
if not record_raw then
  return 0
end

local record = cjson.decode(record_raw)
if record.admissionToken ~= ARGV[2] then
  return 0
end

local expected_fence = tonumber(ARGV[3] or '0')
local current_fence = tonumber(redis.call('HGET', KEYS[3], ARGV[1]) or '0')
if current_fence ~= expected_fence then
  return 0
end

redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('HDEL', KEYS[3], ARGV[1])
redis.call('ZREM', KEYS[1], ARGV[1])
return 1
`;

const ADOPT_STORED_RESERVATION_SCRIPT =
  String.raw`
local record_raw = redis.call('HGET', KEYS[2], ARGV[1])
if not record_raw then
  return 0
end

local record = cjson.decode(record_raw)
if record.admissionToken ~= ARGV[2] then
  return 0
end

local current_fence = tonumber(redis.call('HGET', KEYS[3], ARGV[1]) or '0')
if current_fence ~= 0 then
  return 0
end

if tostring(record.payloadFingerprint or '') ~= ARGV[5] then
  return 0
end

local expires_at = tonumber(ARGV[6]) + tonumber(ARGV[7])
record.searchId = ARGV[3]
record.admissionToken = ARGV[4]
record.expiresAt = expires_at
redis.call('HSET', KEYS[2], ARGV[1], cjson.encode(record))
redis.call('HDEL', KEYS[3], ARGV[1])
redis.call('ZADD', KEYS[1], expires_at, ARGV[1])
return 1
`;

const RELEASE_TERMINAL_RESERVATION_SCRIPT =
  String.raw`
local record_raw = redis.call('HGET', KEYS[2], ARGV[1])
if not record_raw then
  return 1
end

local record = cjson.decode(record_raw)
if record.admissionToken ~= ARGV[2] then
  return 0
end

redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('HDEL', KEYS[3], ARGV[1])
redis.call('ZREM', KEYS[1], ARGV[1])
return 1
`;

const ADMISSION_SNAPSHOT_SCRIPT =
  String.raw`
local now = tonumber(ARGV[1])
local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', now)

for _, expired_job_id in ipairs(expired) do
  redis.call('HDEL', KEYS[2], expired_job_id)
  redis.call('HDEL', KEYS[3], expired_job_id)
end

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
return redis.call('ZCARD', KEYS[1])
`;

function createSearchQueueError({
  code,
  message,
  status = 503,
  retryable = true,
  retryAfterMs = null,
} = {}) {
  const error =
    new Error(message);

  error.name =
    "SearchQueueError";
  error.code =
    code;
  error.status =
    status;
  error.retryable =
    retryable;
  error.retryAfterMs =
    Number.isFinite(
      Number(retryAfterMs)
    ) &&
    Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : null;

  return error;
}

function createSearchQueueUnavailableError(
  retryAfterMs
) {
  return createSearchQueueError({
    code:
      "SEARCH_QUEUE_UNAVAILABLE",
    message:
      "Hotel search is temporarily unavailable. Please try again shortly.",
    retryAfterMs,
  });
}

function createSearchQueueCapacityError(
  retryAfterMs
) {
  return createSearchQueueError({
    code:
      "SEARCH_CAPACITY_TEMPORARILY_EXHAUSTED",
    message:
      "Hotel search capacity is temporarily full. Please try again shortly.",
    retryAfterMs,
  });
}

function normalizeText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function createSearchJobId({
  idempotencyKey,
  hmacSecret,
}) {
  const normalizedKey =
    normalizeText(idempotencyKey);

  if (!normalizedKey) {
    throw createSearchQueueError({
      code:
        "IDEMPOTENCY_KEY_REQUIRED",
      message:
        "Idempotency-Key is required for queued hotel searches.",
      status:
        400,
      retryable:
        false,
    });
  }

  const digest =
    crypto
      .createHmac(
        "sha256",
        hmacSecret
      )
      .update(
        normalizedKey,
        "utf8"
      )
      .digest("hex");

  return `search-${digest}`;
}

function cloneBoundedJobData(
  value,
  maxBytes
) {
  let serialized;

  try {
    serialized =
      JSON.stringify(value);
  }
  catch {
    serialized = null;
  }

  const bytes =
    typeof serialized === "string"
      ? Buffer.byteLength(
          serialized,
          "utf8"
        )
      : null;

  if (
    !Number.isSafeInteger(bytes) ||
    bytes > maxBytes
  ) {
    throw createSearchQueueError({
      code:
        "SEARCH_QUEUE_PAYLOAD_INVALID",
      message:
        "The queued search payload is invalid or too large.",
      status:
        413,
      retryable:
        false,
    });
  }

  return {
    value:
      JSON.parse(serialized),
    bytes,
  };
}

function createRawQueueClient(
  config,
  {
    worker = false,
  } = {}
) {
  const client =
    createClient({
      url:
        config.url,
      disableOfflineQueue:
        !worker,
      socket: {
        connectTimeout:
          config.connectTimeoutMs,
        reconnectStrategy(
          retries
        ) {
          if (worker) {
            return Math.min(
              100 *
                2 ** Math.min(
                  retries,
                  5
                ),
              3_000
            );
          }

          return Math.min(
            100 *
              2 ** Math.min(
                retries,
                4
              ),
            2_000
          );
        },
      },
    });

  client.on(
    "error",
    () => {
      // Converted into provider-neutral queue errors by the boundary methods.
    }
  );

  return client;
}

function createBullMqSearchQueueAdmission({
  config,
  createClientOverride =
    createRawQueueClient,
  QueueClass =
    Queue,
} = {}) {
  if (!config?.enabled) {
    throw new TypeError(
      "An enabled search queue configuration is required."
    );
  }

  const rawClient =
    createClientOverride(
      config,
      {
        worker:
          false,
      }
    );

  const queue =
    new QueueClass(
      config.queueName,
      {
        connection:
          createNodeRedisClient(
            rawClient
          ),
        prefix:
          config.prefix,
      }
    );

  queue.on(
    "error",
    () => {
      // Public callers receive one bounded, provider-neutral error.
    }
  );

  const admissionKeys =
    Object.freeze([
      `${config.admissionPrefix}:expiry`,
      `${config.admissionPrefix}:records`,
      `${config.admissionPrefix}:fences`,
    ]);

  let closed =
    false;

  async function withTimeout(
    operation
  ) {
    let timeoutHandle;

    const timeout =
      new Promise(
        (_, reject) => {
          timeoutHandle =
            setTimeout(
              () => reject(
                createSearchQueueUnavailableError(
                  config.retryAfterMs
                )
              ),
              config.commandTimeoutMs
            );

          timeoutHandle.unref?.();
        }
      );

    try {
      return await Promise.race([
        Promise.resolve()
          .then(operation),
        timeout,
      ]);
    }
    finally {
      clearTimeout(
        timeoutHandle
      );
    }
  }

  async function ensureReady() {
    if (closed) {
      throw createSearchQueueUnavailableError(
        config.retryAfterMs
      );
    }

    if (rawClient.isReady) {
      return;
    }

    await withTimeout(
      () => queue
        .waitUntilReady()
    );

    if (!rawClient.isReady) {
      throw createSearchQueueUnavailableError(
        config.retryAfterMs
      );
    }
  }

  async function executeQueueCommand(
    operation
  ) {
    try {
      await ensureReady();

      return await withTimeout(
        operation
      );
    }
    catch (error) {
      if (
        error?.name ===
          "SearchQueueError"
      ) {
        throw error;
      }

      throw createSearchQueueUnavailableError(
        config.retryAfterMs
      );
    }
  }

  async function releaseReservation({
    jobId,
    admissionToken,
    fencingNumber = 0,
  }) {
    return executeQueueCommand(
      async () => {
        const result =
          await rawClient.eval(
            RELEASE_ADMISSION_SCRIPT,
            {
              keys:
                admissionKeys,
              arguments: [
                jobId,
                admissionToken,
                String(
                  Number.isSafeInteger(
                    Number(fencingNumber)
                  )
                    ? Number(
                        fencingNumber
                      )
                    : 0
                ),
              ],
            }
          );

        return Number(result) === 1;
      }
    );
  }

  async function adoptStoredReservation({
    jobId,
    currentAdmissionToken,
    storedSearchId,
    storedAdmissionToken,
    payloadFingerprint,
  }) {
    return executeQueueCommand(
      async () => {
        const result =
          await rawClient.eval(
            ADOPT_STORED_RESERVATION_SCRIPT,
            {
              keys:
                admissionKeys,
              arguments: [
                jobId,
                currentAdmissionToken,
                storedSearchId,
                storedAdmissionToken,
                payloadFingerprint,
                String(Date.now()),
                String(
                  config.admissionLeaseMs
                ),
              ],
            }
          );

        return Number(result) === 1;
      }
    );
  }

  async function releaseTerminalReservation({
    jobId,
    currentAdmissionToken,
  }) {
    return executeQueueCommand(
      async () => {
        const result =
          await rawClient.eval(
            RELEASE_TERMINAL_RESERVATION_SCRIPT,
            {
              keys:
                admissionKeys,
              arguments: [
                jobId,
                currentAdmissionToken,
              ],
            }
          );

        return Number(result) === 1;
      }
    );
  }

  async function admitSearch({
    idempotencyKey,
    searchId,
    payload,
    payloadFingerprint,
    priority =
      SEARCH_QUEUE_PRIORITIES
        .INITIAL_SEARCH,
  } = {}) {
    const normalizedSearchId =
      normalizeText(searchId);
    const normalizedFingerprint =
      normalizeText(
        payloadFingerprint
      )
        .toLowerCase();

    if (!normalizedSearchId) {
      throw createSearchQueueError({
        code:
          "SEARCH_ID_REQUIRED",
        message:
          "A searchId is required before queue admission.",
        status:
          400,
        retryable:
          false,
      });
    }

    if (
      !/^[a-f0-9]{64}$/.test(
        normalizedFingerprint
      )
    ) {
      throw createSearchQueueError({
        code:
          "IDEMPOTENCY_PAYLOAD_INVALID",
        message:
          "Hotel search payload fingerprint is invalid.",
        status:
          400,
        retryable:
          false,
      });
    }

    if (
      priority !==
        SEARCH_QUEUE_PRIORITIES
          .INITIAL_SEARCH
    ) {
      throw createSearchQueueError({
        code:
          "SEARCH_QUEUE_PRIORITY_INVALID",
        message:
          "Queued search priority is invalid.",
        status:
          500,
        retryable:
          false,
      });
    }

    const jobId =
      createSearchJobId({
        idempotencyKey,
        hmacSecret:
          config.hmacSecret,
      });
    const requestedAdmissionToken =
      crypto.randomUUID();
    const boundedPayload =
      cloneBoundedJobData(
        payload,
        config.jobPayloadMaxBytes
      );

    let reservation =
      null;

    try {
      reservation =
        await executeQueueCommand(
          async () => {
            const result =
              await rawClient.eval(
                RESERVE_ADMISSION_SCRIPT,
                {
                  keys:
                    admissionKeys,
                  arguments: [
                    jobId,
                    normalizedSearchId,
                    requestedAdmissionToken,
                    String(Date.now()),
                    String(
                      config.admissionLeaseMs
                    ),
                    String(
                      config.maxAdmittedJobs
                    ),
                    normalizedFingerprint,
                  ],
                }
              );

            const outcome =
              String(
                result?.[0] ??
                ""
              );

            if (outcome === "full") {
              throw createSearchQueueCapacityError(
                config.retryAfterMs
              );
            }

            if (outcome === "conflict") {
              throw createSearchQueueError({
                code:
                  "IDEMPOTENCY_KEY_CONFLICT",
                message:
                  "This Idempotency-Key was already used for a different hotel search.",
                status:
                  409,
                retryable:
                  false,
              });
            }

            if (
              ![
                "created",
                "existing",
              ].includes(outcome)
            ) {
              throw createSearchQueueUnavailableError(
                config.retryAfterMs
              );
            }

            return {
              outcome,
              searchId:
                String(
                  result?.[1] ??
                  ""
                ),
              admissionToken:
                String(
                  result?.[2] ??
                  ""
                ),
            };
          }
        );

      const jobData = {
        schemaVersion:
          1,
        searchId:
          reservation.searchId,
        admissionToken:
          reservation.admissionToken,
        payloadFingerprint:
          normalizedFingerprint,
        enqueuedAt:
          Date.now(),
        payload:
          boundedPayload.value,
      };

      await executeQueueCommand(
        () => queue.add(
          SEARCH_QUEUE_JOB_NAMES
            .INITIAL_SEARCH,
          jobData,
          {
            jobId,
            priority,
            attempts:
              config.jobAttempts,
            backoff: {
              type:
                "exponential",
              delay:
                config.jobBackoffMs,
              jitter:
                config.jobBackoffJitter,
            },
            removeOnComplete: {
              age:
                config
                  .completedRetentionSeconds,
              count:
                config.maxAdmittedJobs,
            },
            removeOnFail: {
              age:
                config
                  .failedRetentionSeconds,
              count:
                Math.max(
                  100,
                  Math.ceil(
                    config
                      .maxAdmittedJobs /
                    2
                  )
                ),
            },
            sizeLimit:
              config.jobPayloadMaxBytes,
          }
        )
      );

      const storedJob =
        await executeQueueCommand(
          () => queue.getJob(
            jobId
          )
        );
      const storedSearchId =
        normalizeText(
          storedJob?.data
            ?.searchId
        );
      const storedAdmissionToken =
        normalizeText(
          storedJob?.data
            ?.admissionToken
        );
      const storedPayloadFingerprint =
        normalizeText(
          storedJob?.data
            ?.payloadFingerprint
        ).toLowerCase();

      if (
        !storedJob ||
        storedJob.name !==
          SEARCH_QUEUE_JOB_NAMES
            .INITIAL_SEARCH ||
        !storedSearchId ||
        !storedAdmissionToken ||
        !/^[a-f0-9]{64}$/.test(
          storedPayloadFingerprint
        )
      ) {
        throw createSearchQueueUnavailableError(
          config.retryAfterMs
        );
      }

      const retainedExistingJob =
        storedSearchId !==
          reservation.searchId ||
        storedAdmissionToken !==
          reservation.admissionToken;

      if (
        storedPayloadFingerprint !==
          normalizedFingerprint
      ) {
        throw createSearchQueueError({
          code:
            "IDEMPOTENCY_KEY_CONFLICT",
          message:
            "This Idempotency-Key was already used for a different hotel search.",
          status:
            409,
          retryable:
            false,
        });
      }

      if (
        retainedExistingJob
      ) {
        const storedState =
          await executeQueueCommand(
            () => storedJob
              .getState()
          );

        if (
          [
            "completed",
            "failed",
          ].includes(
            storedState
          )
        ) {
          const released =
            await releaseTerminalReservation({
              jobId,
              currentAdmissionToken:
                reservation
                  .admissionToken,
            });

          if (!released) {
            throw createSearchQueueUnavailableError(
              config.retryAfterMs
            );
          }

          reservation = {
            ...reservation,
            outcome:
              "existing",
          };
        }
        else if (
          [
            "active",
            "delayed",
            "paused",
            "prioritized",
            "waiting",
            "waiting-children",
          ].includes(
            storedState
          )
        ) {
          const adopted =
            await adoptStoredReservation({
              jobId,
              currentAdmissionToken:
                reservation
                  .admissionToken,
              storedSearchId,
              storedAdmissionToken,
              payloadFingerprint:
                normalizedFingerprint,
            });

          if (!adopted) {
            throw createSearchQueueUnavailableError(
              config.retryAfterMs
            );
          }

          reservation = {
            outcome:
              "existing",
            searchId:
              storedSearchId,
            admissionToken:
              storedAdmissionToken,
          };
        }
        else {
          throw createSearchQueueUnavailableError(
            config.retryAfterMs
          );
        }
      }

      return Object.freeze({
        admitted:
          true,
        jobId,
        searchId:
          storedSearchId,
        admissionToken:
          storedAdmissionToken,
        priority,
        replayed:
          reservation.outcome ===
            "existing" ||
          retainedExistingJob,
      });
    }
    catch (error) {
      if (
        reservation?.outcome ===
          "created"
      ) {
        try {
          await releaseReservation({
            jobId,
            admissionToken:
              reservation
                .admissionToken,
          });
        }
        catch {
          // The lease expires automatically if the queue store recovers later.
        }
      }

      throw error;
    }
  }

  async function beginSearchExecution({
    jobId,
    admissionToken,
  } = {}) {
    const normalizedJobId =
      normalizeText(jobId);
    const normalizedToken =
      normalizeText(
        admissionToken
      );

    if (
      !normalizedJobId ||
      !normalizedToken
    ) {
      throw createSearchQueueUnavailableError(
        config.retryAfterMs
      );
    }

    return executeQueueCommand(
      async () => {
        const result =
          await rawClient.eval(
            BEGIN_EXECUTION_SCRIPT,
            {
              keys:
                admissionKeys,
              arguments: [
                normalizedJobId,
                normalizedToken,
                String(Date.now()),
                String(
                  config.admissionLeaseMs
                ),
              ],
            }
          );
        const outcome =
          String(
            result?.[0] ??
            ""
          );

        if (outcome !== "ok") {
          throw createSearchQueueError({
            code:
              "SEARCH_QUEUE_ADMISSION_STALE",
            message:
              "The queued search admission is no longer valid.",
            status:
              409,
            retryable:
              false,
          });
        }

        return Object.freeze({
          fencingNumber:
            Number(result?.[1]),
          searchId:
            String(
              result?.[2] ??
              ""
            ),
        });
      }
    );
  }

  async function renewSearchAdmission({
    jobId,
    admissionToken,
    fencingNumber = 0,
  } = {}) {
    return executeQueueCommand(
      async () => {
        const result =
          await rawClient.eval(
            RENEW_ADMISSION_SCRIPT,
            {
              keys:
                admissionKeys,
              arguments: [
                normalizeText(jobId),
                normalizeText(
                  admissionToken
                ),
                String(
                  Number.isSafeInteger(
                    Number(fencingNumber)
                  )
                    ? Number(
                        fencingNumber
                      )
                    : 0
                ),
                String(Date.now()),
                String(
                  config.admissionLeaseMs
                ),
              ],
            }
          );

        return Number(result) === 1;
      }
    );
  }

  async function releaseSearchAdmission({
    jobId,
    admissionToken,
    fencingNumber = 0,
  } = {}) {
    return releaseReservation({
      jobId:
        normalizeText(jobId),
      admissionToken:
        normalizeText(
          admissionToken
        ),
      fencingNumber,
    });
  }

  async function getSearchQueueAdmissionSnapshot() {
    return executeQueueCommand(
      async () => {
        const [
          admitted,
          jobCounts,
        ] = await Promise.all([
          rawClient.eval(
            ADMISSION_SNAPSHOT_SCRIPT,
            {
              keys:
                admissionKeys,
              arguments: [
                String(Date.now()),
              ],
            }
          ),
          queue.getJobCounts(
            "wait",
            "active",
            "delayed",
            "prioritized"
          ),
        ]);

        return Object.freeze({
          enabled:
            true,
          mode:
            "bullmq-distributed",
          admitted:
            Number(admitted) || 0,
          active:
            Number(
              jobCounts.active
            ) || 0,
          waiting:
            (
              Number(
                jobCounts.wait
              ) || 0
            ) +
            (
              Number(
                jobCounts.prioritized
              ) || 0
            ),
          delayed:
            Number(
              jobCounts.delayed
            ) || 0,
          maximumAdmitted:
            config.maxAdmittedJobs,
        });
      }
    );
  }

  async function ping() {
    return executeQueueCommand(
      () => rawClient.ping()
    );
  }

  async function close() {
    if (closed) {
      return;
    }

    closed = true;

    try {
      await queue.close();
    }
    finally {
      if (rawClient.isOpen) {
        try {
          await rawClient.quit();
        }
        catch {
          rawClient.disconnect();
        }
      }
    }
  }

  return Object.freeze({
    enabled:
      true,
    admitSearch,
    beginSearchExecution,
    renewSearchAdmission,
    releaseSearchAdmission,
    getSearchQueueAdmissionSnapshot,
    ping,
    close,
    queueName:
      config.queueName,
    priority:
      SEARCH_QUEUE_PRIORITIES
        .INITIAL_SEARCH,
  });
}

module.exports = {
  createSearchQueueError,
  createSearchQueueUnavailableError,
  createSearchQueueCapacityError,
  createSearchJobId,
  createRawQueueClient,
  createBullMqSearchQueueAdmission,
};
