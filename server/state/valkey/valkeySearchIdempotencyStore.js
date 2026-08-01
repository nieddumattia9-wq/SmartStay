"use strict";

const crypto = require("crypto");

const {
  createOperationalStateError,
  normalizePositiveInteger,
  serializeBounded,
  parseStoredJson,
  delay,
} = require("./valkeyShared");

const SEARCH_IDEMPOTENCY_RECORD_MAX_BYTES =
  2 * 1024;
const SEARCH_IDEMPOTENCY_RESPONSE_MAX_BYTES =
  1024 * 1024;
const DEFAULT_PENDING_WAIT_MS =
  120 * 1000;
const DEFAULT_PENDING_POLL_MS = 50;
const SEARCH_IDEMPOTENCY_TTL_MS =
  25 * 60 * 1000;
const MAX_SEARCH_IDEMPOTENCY_RECORDS = 250;
const MAX_SEARCH_IDEMPOTENCY_BYTES =
  64 * 1024 * 1024;
const IDEMPOTENCY_KEY_MIN_LENGTH = 16;
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9._~:-]+$/;

const CLAIM_SCRIPT = String.raw`
local total = tonumber(redis.call('GET', KEYS[6]) or '0')

local function remove_record(claim_key)
  local response_key = redis.call('HGET', KEYS[4], claim_key)
  local response_bytes = tonumber(redis.call('HGET', KEYS[5], claim_key) or '0')
  total = math.max(0, total - response_bytes)
  redis.call('DEL', claim_key)
  if response_key then
    redis.call('DEL', response_key)
  end
  redis.call('ZREM', KEYS[3], claim_key)
  redis.call('HDEL', KEYS[4], claim_key)
  redis.call('HDEL', KEYS[5], claim_key)
end

local now = tonumber(ARGV[4])
local expired = redis.call('ZRANGEBYSCORE', KEYS[3], '-inf', now)
for _, claim_key in ipairs(expired) do
  remove_record(claim_key)
end

local existing = redis.call('GET', KEYS[1])
if existing then
  local record = cjson.decode(existing)
  if record.fingerprint ~= ARGV[1] then
    return {'conflict'}
  end
  if record.state == 'fulfilled' then
    return {'fulfilled'}
  end
  return {'pending'}
end

while redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[6]) do
  local candidates = redis.call('ZRANGE', KEYS[3], 0, -1)
  local evicted = false

  for _, claim_key in ipairs(candidates) do
    local candidate_raw = redis.call('GET', claim_key)
    if not candidate_raw then
      remove_record(claim_key)
      evicted = true
      break
    end

    local candidate = cjson.decode(candidate_raw)
    if candidate.state == 'fulfilled' then
      remove_record(claim_key)
      evicted = true
      break
    end
  end

  if not evicted then
    redis.call('SET', KEYS[6], total)
    return {'capacity'}
  end
end

local record = cjson.encode({
  schemaVersion = 1,
  fingerprint = ARGV[1],
  state = 'pending',
  ownerToken = ARGV[2],
  createdAt = now
})
if string.len(record) > tonumber(ARGV[5]) then
  return {'record-too-large'}
end

local expires_at = now + tonumber(ARGV[3])
redis.call('SET', KEYS[1], record, 'PX', tonumber(ARGV[3]))
redis.call('ZADD', KEYS[3], expires_at, KEYS[1])
redis.call('HSET', KEYS[4], KEYS[1], KEYS[2])
redis.call('HSET', KEYS[5], KEYS[1], 0)
redis.call('SET', KEYS[6], total)
return {'created'}
`;

const COMPLETE_SCRIPT = String.raw`
local existing = redis.call('GET', KEYS[1])
if not existing then
  return {'missing'}
end
local record = cjson.decode(existing)
if record.state ~= 'pending' or record.ownerToken ~= ARGV[1] or record.fingerprint ~= ARGV[2] then
  return {'not-owner'}
end

local fulfilled = cjson.encode({
  schemaVersion = 1,
  fingerprint = ARGV[2],
  state = 'fulfilled',
  searchId = ARGV[3],
  responseBytes = tonumber(ARGV[4]),
  completedAt = tonumber(ARGV[6])
})
if string.len(fulfilled) > tonumber(ARGV[7]) then
  return {'record-too-large'}
end

local total = tonumber(redis.call('GET', KEYS[6]) or '0')
local old_bytes = tonumber(redis.call('HGET', KEYS[5], KEYS[1]) or '0')
local response_bytes = tonumber(ARGV[4])

local function remove_record(claim_key)
  local response_key = redis.call('HGET', KEYS[4], claim_key)
  local stored_bytes = tonumber(redis.call('HGET', KEYS[5], claim_key) or '0')
  total = math.max(0, total - stored_bytes)
  redis.call('DEL', claim_key)
  if response_key then
    redis.call('DEL', response_key)
  end
  redis.call('ZREM', KEYS[3], claim_key)
  redis.call('HDEL', KEYS[4], claim_key)
  redis.call('HDEL', KEYS[5], claim_key)
end

while math.max(0, total - old_bytes) + response_bytes > tonumber(ARGV[9]) do
  local candidates = redis.call('ZRANGE', KEYS[3], 0, -1)
  local evicted = false

  for _, claim_key in ipairs(candidates) do
    if claim_key ~= KEYS[1] then
      local candidate_raw = redis.call('GET', claim_key)
      if not candidate_raw then
        remove_record(claim_key)
        evicted = true
        break
      end

      local candidate = cjson.decode(candidate_raw)
      if candidate.state == 'fulfilled' then
        remove_record(claim_key)
        evicted = true
        break
      end
    end
  end

  if not evicted then
    redis.call('SET', KEYS[6], total)
    return {'aggregate-capacity'}
  end
end

local next_total = math.max(0, total - old_bytes) + response_bytes
local expires_at = tonumber(ARGV[6]) + tonumber(ARGV[8])
redis.call('SET', KEYS[2], ARGV[5], 'PX', tonumber(ARGV[8]))
redis.call('SET', KEYS[1], fulfilled, 'PX', tonumber(ARGV[8]))
redis.call('ZADD', KEYS[3], expires_at, KEYS[1])
redis.call('HSET', KEYS[4], KEYS[1], KEYS[2])
redis.call('HSET', KEYS[5], KEYS[1], response_bytes)
redis.call('SET', KEYS[6], next_total)
return {'ok'}
`;

const RELEASE_SCRIPT = String.raw`
local existing = redis.call('GET', KEYS[1])
if not existing then
  return 0
end
local record = cjson.decode(existing)
if record.state == 'pending' and record.ownerToken == ARGV[1] then
  local old_bytes = tonumber(redis.call('HGET', KEYS[5], KEYS[1]) or '0')
  local total = tonumber(redis.call('GET', KEYS[6]) or '0')
  redis.call('DEL', KEYS[1], KEYS[2])
  redis.call('ZREM', KEYS[3], KEYS[1])
  redis.call('HDEL', KEYS[4], KEYS[1])
  redis.call('HDEL', KEYS[5], KEYS[1])
  redis.call('SET', KEYS[6], math.max(0, total - old_bytes))
  return 1
end
return 0
`;

const STATS_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local total = tonumber(redis.call('GET', KEYS[4]) or '0')
local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', now)

for _, claim_key in ipairs(expired) do
  local response_key = redis.call('HGET', KEYS[2], claim_key)
  local response_bytes = tonumber(redis.call('HGET', KEYS[3], claim_key) or '0')
  total = math.max(0, total - response_bytes)
  redis.call('DEL', claim_key)
  if response_key then
    redis.call('DEL', response_key)
  end
  redis.call('HDEL', KEYS[2], claim_key)
  redis.call('HDEL', KEYS[3], claim_key)
end

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
redis.call('SET', KEYS[4], total)
return {tostring(redis.call('ZCARD', KEYS[1])), tostring(total)}
`;

function createIdempotencyError({
  code,
  message,
  status,
  retryable = false,
  retryAfterMs = null,
} = {}) {
  const error = new Error(message);

  error.name = "SearchIdempotencyError";
  error.code = code;
  error.status = status;
  error.retryable = retryable;
  error.retryAfterMs =
    Number.isFinite(Number(retryAfterMs)) &&
    Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : null;
  error.isSearchIdempotencyError = true;

  return error;
}

function normalizeIdempotencyKey(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validateIdempotencyKey(value) {
  const key = normalizeIdempotencyKey(value);

  if (!key) {
    throw createIdempotencyError({
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message:
        "Idempotency-Key is required for hotel searches.",
      status: 400,
    });
  }

  if (
    key.length < IDEMPOTENCY_KEY_MIN_LENGTH ||
    key.length > IDEMPOTENCY_KEY_MAX_LENGTH ||
    !IDEMPOTENCY_KEY_PATTERN.test(key)
  ) {
    throw createIdempotencyError({
      code: "IDEMPOTENCY_KEY_INVALID",
      message: "Idempotency-Key is invalid.",
      status: 400,
    });
  }

  return key;
}

function canonicalizeJsonValue(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw createIdempotencyError({
        code: "IDEMPOTENCY_PAYLOAD_INVALID",
        message:
          "Hotel search payload is not valid JSON.",
        status: 400,
      });
    }

    return Object.is(value, -0)
      ? 0
      : value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }

  if (value && typeof value === "object") {
    const result = {};

    for (const key of Object.keys(value).sort()) {
      const property = value[key];

      if (
        property === undefined ||
        ["function", "symbol", "bigint"].includes(
          typeof property
        )
      ) {
        throw createIdempotencyError({
          code: "IDEMPOTENCY_PAYLOAD_INVALID",
          message:
            "Hotel search payload is not valid JSON.",
          status: 400,
        });
      }

      result[key] = canonicalizeJsonValue(
        property
      );
    }

    return result;
  }

  throw createIdempotencyError({
    code: "IDEMPOTENCY_PAYLOAD_INVALID",
    message:
      "Hotel search payload is not valid JSON.",
    status: 400,
  });
}

function createSearchPayloadFingerprint(payload) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        canonicalizeJsonValue(payload)
      )
    )
    .digest("hex");
}

function cloneResponse(value) {
  try {
    return structuredClone(value);
  } catch {
    throw createIdempotencyError({
      code: "IDEMPOTENCY_RESPONSE_INVALID",
      message:
        "Idempotent search response must be safely cloneable.",
      status: 500,
    });
  }
}

function createValkeySearchIdempotencyStore({
  executor,
  keyspace,
  ttlMs =
    SEARCH_IDEMPOTENCY_TTL_MS,
  pendingWaitMs =
    DEFAULT_PENDING_WAIT_MS,
  pendingPollMs =
    DEFAULT_PENDING_POLL_MS,
  maxResponseBytes =
    SEARCH_IDEMPOTENCY_RESPONSE_MAX_BYTES,
  maxRecords =
    MAX_SEARCH_IDEMPOTENCY_RECORDS,
  maxStoredResponseBytes =
    MAX_SEARCH_IDEMPOTENCY_BYTES,
} = {}) {
  const safeTtlMs =
    normalizePositiveInteger(
      ttlMs,
      SEARCH_IDEMPOTENCY_TTL_MS,
      {
        minimum: 1_000,
        maximum: 24 * 60 * 60 * 1000,
      }
    );
  const safePendingWaitMs =
    normalizePositiveInteger(
      pendingWaitMs,
      DEFAULT_PENDING_WAIT_MS,
      {
        minimum: 100,
        maximum: safeTtlMs,
      }
    );
  const safePendingPollMs =
    normalizePositiveInteger(
      pendingPollMs,
      DEFAULT_PENDING_POLL_MS,
      {
        minimum: 10,
        maximum: 1_000,
      }
    );
  const safeMaxResponseBytes =
    normalizePositiveInteger(
      maxResponseBytes,
      SEARCH_IDEMPOTENCY_RESPONSE_MAX_BYTES,
      {
        minimum: 2_048,
        maximum:
          SEARCH_IDEMPOTENCY_RESPONSE_MAX_BYTES,
      }
    );
  const safeMaxRecords =
    normalizePositiveInteger(
      maxRecords,
      MAX_SEARCH_IDEMPOTENCY_RECORDS,
      {
        minimum: 1,
        maximum:
          MAX_SEARCH_IDEMPOTENCY_RECORDS,
      }
    );
  const safeMaxStoredResponseBytes =
    normalizePositiveInteger(
      maxStoredResponseBytes,
      MAX_SEARCH_IDEMPOTENCY_BYTES,
      {
        minimum: safeMaxResponseBytes,
        maximum:
          MAX_SEARCH_IDEMPOTENCY_BYTES,
      }
    );
  const metadataKeys = [
    keyspace.idempotencyExpiryIndex,
    keyspace.idempotencyResponseKeyIndex,
    keyspace.idempotencyResponseSizeIndex,
    keyspace.idempotencyTotalResponseBytes,
  ];

  async function claim({
    key,
    responseKey,
    fingerprint,
    ownerToken,
  }) {
    const result = await executor.execute(
      (client) => client.eval(
        CLAIM_SCRIPT,
        {
          keys: [
            key,
            responseKey,
            ...metadataKeys,
          ],
          arguments: [
            fingerprint,
            ownerToken,
            String(safeTtlMs),
            String(Date.now()),
            String(
              SEARCH_IDEMPOTENCY_RECORD_MAX_BYTES
            ),
            String(safeMaxRecords),
          ],
        }
      )
    );

    return String(result?.[0] ?? "");
  }

  async function release(
    key,
    responseKey,
    ownerToken
  ) {
    await executor.execute(
      (client) => client.eval(
        RELEASE_SCRIPT,
        {
          keys: [
            key,
            responseKey,
            ...metadataKeys,
          ],
          arguments: [ownerToken],
        }
      )
    );
  }

  async function readFulfilledResponse(
    key,
    responseKey
  ) {
    const [recordRaw, responseRaw] =
      await executor.execute(
        (client) => client.mGet([
          key,
          responseKey,
        ])
      );

    if (recordRaw === null) {
      return {
        state: "missing",
        response: null,
      };
    }

    const record = parseStoredJson(
      recordRaw,
      {
        code:
          "IDEMPOTENCY_RECORD_INVALID",
        message:
          "Shared idempotency state is invalid.",
      }
    );

    if (
      record?.schemaVersion !== 1 ||
      !["pending", "fulfilled"].includes(
        record.state
      )
    ) {
      throw createOperationalStateError({
        code: "OPERATIONAL_STATE_RECORD_INVALID",
        message:
          "Shared idempotency state is invalid.",
        status: 503,
      });
    }

    if (record.state === "pending") {
      return {
        state: "pending",
        response: null,
      };
    }

    if (responseRaw === null) {
      throw createOperationalStateError({
        code: "OPERATIONAL_STATE_RECORD_INVALID",
        message:
          "Shared idempotency response is unavailable.",
        status: 503,
      });
    }

    return {
      state: "fulfilled",
      response: parseStoredJson(
        responseRaw,
        {
          code:
            "IDEMPOTENCY_RESPONSE_INVALID",
          message:
            "Shared idempotency response is invalid.",
        }
      ),
    };
  }

  async function waitForCompletion({
    key,
    responseKey,
  }) {
    const deadline =
      Date.now() + safePendingWaitMs;

    while (Date.now() < deadline) {
      const result =
        await readFulfilledResponse(
          key,
          responseKey
        );

      if (result.state !== "pending") {
        return result;
      }

      await delay(safePendingPollMs);
    }

    throw createIdempotencyError({
      code: "IDEMPOTENCY_PENDING_TIMEOUT",
      message:
        "The original hotel search is still being processed. Please try again shortly.",
      status: 503,
      retryable: true,
      retryAfterMs: 500,
    });
  }

  async function executeInitialSearchIdempotently({
    idempotencyKey,
    payload,
    execute,
  }) {
    if (typeof execute !== "function") {
      throw new TypeError(
        "execute must be a function."
      );
    }

    const normalizedKey =
      validateIdempotencyKey(
        idempotencyKey
      );
    const fingerprint =
      createSearchPayloadFingerprint(
        payload
      );
    const key = keyspace.idempotency(
      normalizedKey
    );
    const responseKey =
      keyspace.idempotencyResponse(
        normalizedKey
      );
    const ownerToken = crypto.randomUUID();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const outcome = await claim({
        key,
        responseKey,
        fingerprint,
        ownerToken,
      });

      if (outcome === "conflict") {
        throw createIdempotencyError({
          code: "IDEMPOTENCY_KEY_CONFLICT",
          message:
            "This Idempotency-Key was already used for a different hotel search.",
          status: 409,
        });
      }

      if (outcome === "capacity") {
        throw createIdempotencyError({
          code:
            "IDEMPOTENCY_CAPACITY_REACHED",
          message:
            "Hotel search is temporarily unable to accept another request. Please try again shortly.",
          status: 503,
          retryable: true,
          retryAfterMs: 500,
        });
      }

      if (outcome === "fulfilled") {
        const stored =
          await readFulfilledResponse(
            key,
            responseKey
          );

        if (stored.state === "missing") {
          continue;
        }

        return {
          response:
            cloneResponse(stored.response),
          replayed: true,
          coalesced: false,
        };
      }

      if (outcome === "pending") {
        const stored = await waitForCompletion({
          key,
          responseKey,
        });

        if (stored.state === "missing") {
          continue;
        }

        return {
          response:
            cloneResponse(stored.response),
          replayed: false,
          coalesced: true,
        };
      }

      if (outcome !== "created") {
        throw createOperationalStateError({
          code: "OPERATIONAL_STATE_RECORD_INVALID",
          message:
            "Shared idempotency state could not be created safely.",
          status: 503,
        });
      }

      try {
        const response =
          cloneResponse(await execute());
        const searchId =
          typeof response?.searchId === "string"
            ? response.searchId.trim()
            : "";

        if (!searchId) {
          await release(
            key,
            responseKey,
            ownerToken
          );

          return {
            response,
            replayed: false,
            coalesced: false,
          };
        }

        let serialized;

        try {
          serialized = serializeBounded(
            response,
            {
              maxBytes: safeMaxResponseBytes,
              code:
                "IDEMPOTENCY_RESPONSE_TOO_LARGE",
              message:
                "The idempotent search response exceeds the shared-state size limit.",
              status: 503,
            }
          );
        } catch (error) {
          if (
            error?.code !==
            "IDEMPOTENCY_RESPONSE_TOO_LARGE"
          ) {
            throw error;
          }

          await release(
            key,
            responseKey,
            ownerToken
          );

          return {
            response,
            replayed: false,
            coalesced: false,
          };
        }

        const completed = await executor.execute(
          (client) => client.eval(
            COMPLETE_SCRIPT,
            {
              keys: [
                key,
                responseKey,
                ...metadataKeys,
              ],
              arguments: [
                ownerToken,
                fingerprint,
                searchId,
                String(serialized.bytes),
                serialized.serialized,
                String(Date.now()),
                String(
                  SEARCH_IDEMPOTENCY_RECORD_MAX_BYTES
                ),
                String(safeTtlMs),
                String(
                  safeMaxStoredResponseBytes
                ),
              ],
            }
          )
        );
        const completeOutcome = String(
          completed?.[0] ?? ""
        );

        if (
          completeOutcome ===
            "aggregate-capacity" ||
          completeOutcome ===
            "record-too-large"
        ) {
          await release(
            key,
            responseKey,
            ownerToken
          );

          return {
            response,
            replayed: false,
            coalesced: false,
          };
        }

        if (completeOutcome !== "ok") {
          throw createOperationalStateError({
            code:
              "OPERATIONAL_STATE_CONCURRENT_UPDATE",
            message:
              "Shared idempotency state changed concurrently.",
            status: 503,
            retryable: true,
            retryAfterMs: 250,
          });
        }

        return {
          response,
          replayed: false,
          coalesced: false,
        };
      } catch (error) {
        await release(
          key,
          responseKey,
          ownerToken
        );
        throw error;
      }
    }

    throw createIdempotencyError({
      code: "IDEMPOTENCY_PENDING_TIMEOUT",
      message:
        "The original hotel search is still being processed. Please try again shortly.",
      status: 503,
      retryable: true,
      retryAfterMs: 500,
    });
  }

  async function scanKeys(client, pattern) {
    const keys = [];

    for await (
      const batch of client.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })
    ) {
      if (Array.isArray(batch)) {
        keys.push(...batch);
      } else {
        keys.push(batch);
      }
    }

    return keys.filter(Boolean);
  }

  async function clearSearchIdempotencyRecords() {
    await executor.execute(async (client) => {
      const claimKeys = await scanKeys(
        client,
        `${keyspace.prefix}:initial-search-idempotency:*`
      );
      const responseKeys = await scanKeys(
        client,
        `${keyspace.prefix}:initial-search-response:*`
      );
      const keys = [
        ...claimKeys,
        ...responseKeys,
        ...metadataKeys,
      ];

      if (keys.length > 0) {
        await client.del(keys);
      }
    });
  }

  async function getSearchIdempotencyRecordCount() {
    const result = await executor.execute(
      (client) => client.eval(
        STATS_SCRIPT,
        {
          keys: metadataKeys,
          arguments: [
            String(Date.now()),
          ],
        }
      )
    );

    return Number(result?.[0] ?? 0);
  }

  async function getSearchIdempotencyStoredResponseBytes() {
    const result = await executor.execute(
      (client) => client.eval(
        STATS_SCRIPT,
        {
          keys: metadataKeys,
          arguments: [
            String(Date.now()),
          ],
        }
      )
    );

    return Number(result?.[1] ?? 0);
  }

  return Object.freeze({
    SEARCH_IDEMPOTENCY_TTL_MS:
      safeTtlMs,
    MAX_SEARCH_IDEMPOTENCY_RECORDS:
      safeMaxRecords,
    MAX_SEARCH_IDEMPOTENCY_BYTES:
      safeMaxStoredResponseBytes,
    normalizeIdempotencyKey:
      normalizeIdempotencyKey,
    validateIdempotencyKey:
      validateIdempotencyKey,
    createSearchPayloadFingerprint:
      createSearchPayloadFingerprint,
    isSearchIdempotencyError(error) {
      return error?.isSearchIdempotencyError ===
        true;
    },
    executeInitialSearchIdempotently,
    clearSearchIdempotencyRecords,
    getSearchIdempotencyRecordCount,
    getSearchIdempotencyStoredResponseBytes,
  });
}

module.exports = {
  SEARCH_IDEMPOTENCY_RECORD_MAX_BYTES,
  SEARCH_IDEMPOTENCY_RESPONSE_MAX_BYTES,
  createValkeySearchIdempotencyStore,
};
