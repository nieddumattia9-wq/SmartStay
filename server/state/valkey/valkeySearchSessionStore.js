"use strict";

const crypto = require("crypto");

const SEARCH_SESSION_TTL_MS =
  30 * 60 * 1000;
const MAX_SEARCH_SESSIONS = 500;
const EXPIRED_SEARCH_ID_RETENTION_MS =
  SEARCH_SESSION_TTL_MS;
const CONTINUATION_LOCK_TTL_MS =
  5 * 60 * 1000;
const SEARCH_SESSION_STATES =
  Object.freeze({
    MISSING: "missing",
    ACTIVE: "active",
    EXPIRED: "expired",
    NOT_FOUND: "not_found",
  });

const {
  createOperationalStateError,
  normalizePositiveInteger,
  serializeBounded,
  parseStoredJson,
} = require("./valkeyShared");

const SEARCH_SESSION_ID_VERSION = "ss2";
const SEARCH_SESSION_ID_PATTERN =
  /^ss2\.([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

const MAX_SEARCH_SESSION_BYTES =
  1024 * 1024;
const DEFAULT_AGGREGATE_SESSION_BYTES =
  64 * 1024 * 1024;
const DEFAULT_CAS_RETRIES = 12;

const SESSION_WRITE_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local session_ttl = tonumber(ARGV[2])
local tombstone_ttl = tonumber(ARGV[3])
local session_key = ARGV[4]
local serialized = ARGV[5]
local new_bytes = tonumber(ARGV[6])
local expected_revision = tonumber(ARGV[7])
local max_count = tonumber(ARGV[8])
local aggregate_budget = tonumber(ARGV[9])
local lock_mode = ARGV[10]
local lock_token = ARGV[11]
local fencing_number = tonumber(ARGV[12])
local lease_action = ARGV[13]
local lease_ttl = tonumber(ARGV[14])
local initial_execution_token = ARGV[15]
local initial_fencing_number = tonumber(ARGV[16])

local total = tonumber(redis.call('GET', KEYS[5]) or '0')
local expired = redis.call('ZRANGEBYSCORE', KEYS[3], '-inf', now)
for _, expired_key in ipairs(expired) do
  local expired_bytes = tonumber(redis.call('HGET', KEYS[4], expired_key) or '0')
  if expired_bytes > 0 then
    total = math.max(0, total - expired_bytes)
  end
  redis.call('HDEL', KEYS[4], expired_key)
  redis.call('DEL', expired_key)
end
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now)

local current = redis.call('GET', KEYS[1])
local decoded = nil
if expected_revision == -1 then
  if current then
    return {'exists'}
  end
  if redis.call('EXISTS', KEYS[2]) == 1 then
    return {'tombstoned'}
  end
  if redis.call('HLEN', KEYS[4]) >= max_count then
    return {'capacity'}
  end
else
  if not current then
    return {'missing'}
  end

  decoded = cjson.decode(current)
  if tonumber(decoded.revision) ~= expected_revision then
    return {'conflict', tostring(decoded.revision)}
  end
end

if lock_mode == 'initial-claim' then
  local current_stage = tostring(decoded.session.initialSearchStage or '')
  if current_stage == 'complete' or current_stage == 'failed' then
    return {'initial-terminal'}
  end

  local current_fence = tonumber(decoded.session.initialSearchFencingNumber or '0')
  if initial_fencing_number <= current_fence then
    return {'stale-initial-search'}
  end
end

if lock_mode == 'initial-owned' then
  local current_token = tostring(decoded.session.initialSearchExecutionToken or '')
  local current_fence = tonumber(decoded.session.initialSearchFencingNumber or '0')
  if current_token ~= initial_execution_token or current_fence ~= initial_fencing_number then
    return {'stale-initial-search'}
  end
end

if lock_mode == 'unlocked' and redis.call('EXISTS', KEYS[6]) == 1 then
  return {'locked'}
end

if lock_mode == 'owned' then
  local lease_value = redis.call('GET', KEYS[6])
  if not lease_value then
    return {'stale-lease'}
  end
  local lease = cjson.decode(lease_value)
  if lease.token ~= lock_token or tonumber(lease.fencingNumber) ~= fencing_number then
    return {'stale-lease'}
  end
end

local old_bytes = tonumber(redis.call('HGET', KEYS[4], session_key) or '0')
local next_total = math.max(0, total - old_bytes) + new_bytes
if next_total > aggregate_budget then
  return {'aggregate-budget'}
end

redis.call('SET', KEYS[1], serialized, 'PX', session_ttl)
redis.call('SET', KEYS[2], 'known', 'PX', tombstone_ttl)
redis.call('ZADD', KEYS[3], now + session_ttl, session_key)
redis.call('HSET', KEYS[4], session_key, new_bytes)
redis.call('SET', KEYS[5], next_total)

if lease_action == 'delete' then
  redis.call('DEL', KEYS[6])
elseif lease_action == 'renew' then
  redis.call('PEXPIRE', KEYS[6], lease_ttl)
end

return {'ok', tostring(next_total)}
`;

const ACQUIRE_LEASE_SCRIPT = String.raw`
local session_value = redis.call('GET', KEYS[3])
if not session_value then
  return {'missing'}
end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return {'busy'}
end

local envelope = cjson.decode(session_value)
local session_fence = tonumber(envelope.session.continuationFencingNumber or '0')
local stored_fence = tonumber(redis.call('GET', KEYS[2]) or '0')
if session_fence > stored_fence then
  redis.call('SET', KEYS[2], session_fence)
end

local fence = redis.call('INCR', KEYS[2])
local lease = cjson.encode({token = ARGV[1], fencingNumber = fence})
redis.call('SET', KEYS[1], lease, 'PX', tonumber(ARGV[2]))
redis.call('PEXPIRE', KEYS[2], tonumber(ARGV[3]))
return {'ok', tostring(fence)}
`;

const RELEASE_LEASE_ONLY_SCRIPT = String.raw`
local lease_value = redis.call('GET', KEYS[1])
if not lease_value then
  return 0
end
local lease = cjson.decode(lease_value)
if lease.token ~= ARGV[1] or tostring(lease.fencingNumber) ~= ARGV[2] then
  return 0
end
return redis.call('DEL', KEYS[1])
`;

const CLEAR_SESSION_SCRIPT = String.raw`
local total = tonumber(redis.call('GET', KEYS[5]) or '0')
local old_bytes = tonumber(redis.call('HGET', KEYS[4], KEYS[1]) or '0')
local next_total = math.max(0, total - old_bytes)
redis.call('DEL', KEYS[1], KEYS[2], KEYS[6], KEYS[7])
redis.call('ZREM', KEYS[3], KEYS[1])
redis.call('HDEL', KEYS[4], KEYS[1])
redis.call('SET', KEYS[5], next_total)
return 1
`;

const SESSION_STATS_SCRIPT = String.raw`
local now = tonumber(ARGV[1])
local total = tonumber(redis.call('GET', KEYS[3]) or '0')
local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', now)
for _, expired_key in ipairs(expired) do
  local expired_bytes = tonumber(redis.call('HGET', KEYS[2], expired_key) or '0')
  if expired_bytes > 0 then
    total = math.max(0, total - expired_bytes)
  end
  redis.call('HDEL', KEYS[2], expired_key)
  redis.call('DEL', expired_key)
end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
redis.call('SET', KEYS[3], total)
return {tostring(redis.call('HLEN', KEYS[2])), tostring(total)}
`;

function createSearchSessionError({
  code,
  message,
  status,
  retryable = false,
  retryAfterMs = null,
} = {}) {
  const error = new Error(message);

  error.name = "SearchSessionError";
  error.code = code;
  error.status = status;
  error.retryable = retryable;
  error.retryAfterMs =
    Number.isFinite(Number(retryAfterMs)) &&
    Number(retryAfterMs) >= 0
      ? Number(retryAfterMs)
      : null;

  return error;
}

function normalizeSearchId(searchId) {
  return typeof searchId === "string"
    ? searchId.trim()
    : "";
}

function createSearchId() {
  return `${SEARCH_SESSION_ID_VERSION}.${crypto.randomUUID()}`;
}

function cloneSession(value) {
  try {
    return structuredClone(value);
  } catch {
    throw createSearchSessionError({
      code: "INVALID_SEARCH_SESSION_DATA",
      message:
        "Search session data must be safely cloneable.",
      status: 400,
    });
  }
}

function getLeaseContext(options = {}) {
  const source =
    options?.continuationLease ??
    options;
  const lockToken =
    typeof source?.lockToken === "string"
      ? source.lockToken
      : "";
  const fencingNumber = Number(
    source?.fencingNumber
  );

  if (
    !lockToken ||
    !Number.isSafeInteger(fencingNumber) ||
    fencingNumber <= 0
  ) {
    return null;
  }

  return Object.freeze({
    lockToken,
    fencingNumber,
  });
}

function getInitialSearchExecutionContext(
  options = {}
) {
  const source =
    options?.initialSearchExecution ??
    options;
  const executionToken =
    typeof source?.executionToken ===
      "string"
      ? source.executionToken.trim()
      : "";
  const fencingNumber = Number(
    source?.fencingNumber
  );

  if (
    !executionToken ||
    !Number.isSafeInteger(fencingNumber) ||
    fencingNumber <= 0
  ) {
    return null;
  }

  return Object.freeze({
    executionToken,
    fencingNumber,
  });
}

function createValkeySearchSessionAdapters({
  executor,
  keyspace,
  sessionTtlMs = SEARCH_SESSION_TTL_MS,
  tombstoneRetentionMs =
    EXPIRED_SEARCH_ID_RETENTION_MS,
  continuationLeaseTtlMs =
    CONTINUATION_LOCK_TTL_MS,
  maxSessions = MAX_SEARCH_SESSIONS,
  maxSessionBytes =
    MAX_SEARCH_SESSION_BYTES,
  aggregateSessionBytes =
    DEFAULT_AGGREGATE_SESSION_BYTES,
  casRetries = DEFAULT_CAS_RETRIES,
} = {}) {
  const safeSessionTtlMs =
    normalizePositiveInteger(
      sessionTtlMs,
      SEARCH_SESSION_TTL_MS,
      { minimum: 50, maximum: 24 * 60 * 60 * 1000 }
    );
  const safeTombstoneRetentionMs =
    normalizePositiveInteger(
      tombstoneRetentionMs,
      EXPIRED_SEARCH_ID_RETENTION_MS,
      { minimum: 50, maximum: 24 * 60 * 60 * 1000 }
    );
  const safeContinuationLeaseTtlMs =
    normalizePositiveInteger(
      continuationLeaseTtlMs,
      CONTINUATION_LOCK_TTL_MS,
      { minimum: 50, maximum: 60 * 60 * 1000 }
    );
  const safeMaxSessions =
    normalizePositiveInteger(
      maxSessions,
      MAX_SEARCH_SESSIONS,
      { maximum: 100_000 }
    );
  const safeMaxSessionBytes =
    normalizePositiveInteger(
      maxSessionBytes,
      MAX_SEARCH_SESSION_BYTES,
      { minimum: 1024, maximum: MAX_SEARCH_SESSION_BYTES }
    );
  const safeAggregateSessionBytes =
    normalizePositiveInteger(
      aggregateSessionBytes,
      DEFAULT_AGGREGATE_SESSION_BYTES,
      {
        minimum: safeMaxSessionBytes,
        maximum: 8 * 1024 * 1024 * 1024,
      }
    );
  const safeCasRetries =
    normalizePositiveInteger(
      casRetries,
      DEFAULT_CAS_RETRIES,
      { minimum: 1, maximum: 50 }
    );
  const tombstoneLifetimeMs =
    safeSessionTtlMs +
    safeTombstoneRetentionMs;

  function sessionKeys(searchId) {
    return [
      keyspace.session(searchId),
      keyspace.tombstone(searchId),
      keyspace.sessionExpiryIndex,
      keyspace.sessionSizeIndex,
      keyspace.sessionTotalBytes,
      keyspace.continuationLease(searchId),
    ];
  }

  function parseEnvelope(raw) {
    if (typeof raw !== "string") {
      return null;
    }

    const envelope = parseStoredJson(raw, {
      code: "SEARCH_SESSION_RECORD_INVALID",
      message:
        "Shared search-session state is invalid.",
    });

    if (
      envelope?.schemaVersion !== 1 ||
      !Number.isSafeInteger(envelope.revision) ||
      envelope.revision <= 0 ||
      !envelope.session ||
      typeof envelope.session !== "object" ||
      Array.isArray(envelope.session)
    ) {
      throw createOperationalStateError({
        code: "OPERATIONAL_STATE_RECORD_INVALID",
        message:
          "Shared search-session state is invalid.",
        status: 503,
      });
    }

    return envelope;
  }

  async function readEnvelope(searchId) {
    const raw = await executor.execute(
      (client) => client.get(
        keyspace.session(searchId)
      )
    );

    return parseEnvelope(raw);
  }

  function getLocalSearchSessionState(searchId) {
    if (!searchId) {
      return SEARCH_SESSION_STATES.MISSING;
    }

    if (!SEARCH_SESSION_ID_PATTERN.test(searchId)) {
      return searchId.startsWith("ss1.")
        ? SEARCH_SESSION_STATES.EXPIRED
        : SEARCH_SESSION_STATES.NOT_FOUND;
    }

    return null;
  }

  async function readSearchSessionSnapshot(searchId) {
    const [sessionValue, tombstoneValue] =
      await executor.execute(
        (client) => client.mGet([
          keyspace.session(searchId),
          keyspace.tombstone(searchId),
        ])
      );

    if (sessionValue !== null) {
      return {
        state: SEARCH_SESSION_STATES.ACTIVE,
        sessionValue,
      };
    }

    return {
      state:
        tombstoneValue !== null
          ? SEARCH_SESSION_STATES.EXPIRED
          : SEARCH_SESSION_STATES.NOT_FOUND,
      sessionValue: null,
    };
  }

  function buildSavedSession(
    session,
    searchId,
    now,
    existing = null
  ) {
    const snapshot = cloneSession(session);

    return {
      ...snapshot,
      searchId,
      createdAt:
        existing?.createdAt ??
        snapshot.createdAt ??
        now,
      updatedAt: now,
      expiresAt:
        now + safeSessionTtlMs,
      hotels:
        Array.isArray(snapshot.hotels)
          ? snapshot.hotels
          : [],
      status:
        snapshot.status ??
        "InProgress",
      searchIncomplete:
        snapshot.searchIncomplete ??
        true,
      isContinuing:
        snapshot.isContinuing ??
        false,
      continuationLock:
        snapshot.continuationLock ??
        null,
      continuationLockExpiresAt:
        Number.isFinite(
          Number(snapshot.continuationLockExpiresAt)
        )
          ? Number(snapshot.continuationLockExpiresAt)
          : null,
      continuationFencingNumber:
        Number.isSafeInteger(
          Number(snapshot.continuationFencingNumber)
        )
          ? Number(snapshot.continuationFencingNumber)
          : null,
      lastError:
        snapshot.lastError ??
        null,
      retryable:
        Boolean(snapshot.retryable),
      retryAfterMs:
        snapshot.retryAfterMs !== null &&
        snapshot.retryAfterMs !== undefined &&
        snapshot.retryAfterMs !== "" &&
        Number.isFinite(Number(snapshot.retryAfterMs)) &&
        Number(snapshot.retryAfterMs) >= 0
          ? Number(snapshot.retryAfterMs)
          : null,
    };
  }

  async function writeEnvelope({
    searchId,
    session,
    expectedRevision,
    lockMode = "unlocked",
    leaseContext = null,
    leaseAction = "keep",
    initialSearchExecution = null,
  }) {
    const envelope = {
      schemaVersion: 1,
      revision:
        expectedRevision < 0
          ? 1
          : expectedRevision + 1,
      session,
    };
    const serialized = serializeBounded(
      envelope,
      {
        maxBytes: safeMaxSessionBytes,
        code: "SEARCH_SESSION_TOO_LARGE",
        message:
          "The search session exceeds the shared-state size limit.",
        status: 503,
      }
    );
    const keys = sessionKeys(searchId);
    const result = await executor.execute(
      (client) => client.eval(
        SESSION_WRITE_SCRIPT,
        {
          keys,
          arguments: [
            String(Date.now()),
            String(safeSessionTtlMs),
            String(tombstoneLifetimeMs),
            keys[0],
            serialized.serialized,
            String(serialized.bytes),
            String(expectedRevision),
            String(safeMaxSessions),
            String(safeAggregateSessionBytes),
            lockMode,
            leaseContext?.lockToken ?? "",
            String(
              leaseContext?.fencingNumber ?? 0
            ),
            leaseAction,
            String(safeContinuationLeaseTtlMs),
            initialSearchExecution
              ?.executionToken ?? "",
            String(
              initialSearchExecution
                ?.fencingNumber ?? 0
            ),
          ],
        }
      )
    );

    const outcome = String(result?.[0] ?? "");

    return {
      outcome,
      envelope,
    };
  }

  function throwWriteFailure(outcome) {
    if (outcome === "capacity") {
      throw createSearchSessionError({
        code: "SEARCH_SESSION_CAPACITY_REACHED",
        message:
          "Hotel search capacity is temporarily full. Please try again shortly.",
        status: 503,
        retryable: true,
        retryAfterMs: 1_000,
      });
    }

    if (outcome === "aggregate-budget") {
      throw createSearchSessionError({
        code: "SEARCH_SESSION_CAPACITY_REACHED",
        message:
          "Hotel search capacity is temporarily full. Please try again shortly.",
        status: 503,
        retryable: true,
        retryAfterMs: 1_000,
      });
    }

    if (
      outcome === "stale-lease" ||
      outcome === "locked"
    ) {
      throw createSearchSessionError({
        code:
          outcome === "stale-lease"
            ? "SEARCH_CONTINUATION_LEASE_STALE"
            : "SEARCH_CONTINUATION_IN_PROGRESS",
        message:
          "This search continuation is already being processed.",
        status: 409,
        retryable: true,
        retryAfterMs: 250,
      });
    }

    if (
      outcome ===
        "stale-initial-search"
    ) {
      throw createSearchSessionError({
        code:
          "SEARCH_INITIAL_EXECUTION_STALE",
        message:
          "This queued search attempt is no longer current.",
        status:
          409,
        retryable:
          false,
      });
    }

    throw createSearchSessionError({
      code: "SEARCH_SESSION_CONCURRENT_UPDATE",
      message:
        "The search session changed concurrently. Please try again.",
      status: 409,
      retryable: true,
      retryAfterMs: 100,
    });
  }

  async function saveSearchSession(session) {
    if (!session || typeof session !== "object") {
      throw new Error(
        "Unable to save search session: invalid session."
      );
    }

    const providedSearchId =
      normalizeSearchId(session.searchId);

    if (
      providedSearchId &&
      !SEARCH_SESSION_ID_PATTERN.test(
        providedSearchId
      )
    ) {
      throw createSearchSessionError({
        code: "SEARCH_ID_INVALID",
        message:
          "The shared search session id is invalid.",
        status: 400,
      });
    }

    for (
      let attempt = 0;
      attempt < safeCasRetries;
      attempt += 1
    ) {
      const searchId =
        providedSearchId ||
        createSearchId();
      const current = providedSearchId
        ? await readEnvelope(searchId)
        : null;
      const now = Date.now();
      const savedSession = buildSavedSession(
        session,
        searchId,
        now,
        current?.session ?? null
      );
      const write = await writeEnvelope({
        searchId,
        session: savedSession,
        expectedRevision:
          current?.revision ?? -1,
        lockMode: "unlocked",
      });

      if (write.outcome === "ok") {
        return cloneSession(savedSession);
      }

      if (
        !providedSearchId &&
        ["exists", "tombstoned"].includes(
          write.outcome
        )
      ) {
        continue;
      }

      if (
        providedSearchId &&
        ["conflict", "missing"].includes(
          write.outcome
        )
      ) {
        continue;
      }

      throwWriteFailure(write.outcome);
    }

    throwWriteFailure("conflict");
  }

  async function getSearchSessionState(searchId) {
    const normalized = normalizeSearchId(searchId);
    const localState =
      getLocalSearchSessionState(normalized);

    if (localState) {
      return localState;
    }

    return (
      await readSearchSessionSnapshot(normalized)
    ).state;
  }

  async function getSearchSession(searchId) {
    const normalized = normalizeSearchId(searchId);
    const localState =
      getLocalSearchSessionState(normalized);

    if (localState) {
      return null;
    }

    const snapshot =
      await readSearchSessionSnapshot(normalized);

    if (
      snapshot.state !==
      SEARCH_SESSION_STATES.ACTIVE
    ) {
      return null;
    }

    const envelope = parseEnvelope(
      snapshot.sessionValue
    );

    return envelope
      ? cloneSession(envelope.session)
      : null;
  }

  async function requireSearchSession(searchId) {
    const normalized = normalizeSearchId(searchId);
    const localState =
      getLocalSearchSessionState(normalized);
    const snapshot = localState
      ? {
          state: localState,
          sessionValue: null,
        }
      : await readSearchSessionSnapshot(
          normalized
        );
    const { state } = snapshot;

    if (state === SEARCH_SESSION_STATES.MISSING) {
      throw createSearchSessionError({
        code: "SEARCH_ID_REQUIRED",
        message: "searchId is required.",
        status: 400,
      });
    }

    if (state === SEARCH_SESSION_STATES.EXPIRED) {
      throw createSearchSessionError({
        code: "SEARCH_SESSION_EXPIRED",
        message:
          "This search session has expired. Start a new search.",
        status: 410,
      });
    }

    if (state === SEARCH_SESSION_STATES.NOT_FOUND) {
      throw createSearchSessionError({
        code: "SEARCH_SESSION_NOT_FOUND",
        message:
          "The requested search session was not found.",
        status: 404,
      });
    }

    const envelope = parseEnvelope(
      snapshot.sessionValue
    );

    if (!envelope) {
      return requireSearchSession(normalized);
    }

    return cloneSession(envelope.session);
  }

  async function mutateSession(
    searchId,
    mutate,
    options = {}
  ) {
    const normalized = normalizeSearchId(searchId);

    if (!normalized) {
      return null;
    }

    const leaseContext = getLeaseContext(options);
    const initialSearchExecution =
      getInitialSearchExecutionContext(
        options
      );
    const lockMode =
      initialSearchExecution
        ? "initial-owned"
        : leaseContext
          ? "owned"
          : "unlocked";

    for (
      let attempt = 0;
      attempt < safeCasRetries;
      attempt += 1
    ) {
      const current = await readEnvelope(normalized);

      if (!current) {
        return null;
      }

      const nextCandidate = await mutate(
        cloneSession(current.session)
      );

      if (!nextCandidate) {
        return cloneSession(current.session);
      }

      const now = Date.now();
      const nextSession = {
        ...current.session,
        ...cloneSession(nextCandidate),
        searchId:
          current.session.searchId,
        createdAt:
          current.session.createdAt,
        updatedAt: now,
        expiresAt:
          now + safeSessionTtlMs,
      };
      const write = await writeEnvelope({
        searchId: normalized,
        session: nextSession,
        expectedRevision: current.revision,
        lockMode,
        leaseContext,
        initialSearchExecution,
      });

      if (write.outcome === "ok") {
        return cloneSession(nextSession);
      }

      if (write.outcome === "conflict") {
        continue;
      }

      if (write.outcome === "missing") {
        return null;
      }

      throwWriteFailure(write.outcome);
    }

    throwWriteFailure("conflict");
  }

  async function updateSearchSession(
    searchId,
    updates = {},
    options = {}
  ) {
    return mutateSession(
      searchId,
      () => cloneSession(updates),
      options
    );
  }

  async function claimInitialSearchExecution(
    searchId,
    execution
  ) {
    const normalized =
      normalizeSearchId(searchId);
    const initialSearchExecution =
      getInitialSearchExecutionContext(
        execution
      );

    if (!initialSearchExecution) {
      throwWriteFailure(
        "stale-initial-search"
      );
    }

    for (
      let attempt = 0;
      attempt < safeCasRetries;
      attempt += 1
    ) {
      const current =
        await readEnvelope(
          normalized
        );

      if (!current) {
        return requireSearchSession(
          normalized
        );
      }

      if (
        ["complete", "failed"]
          .includes(
            current.session
              .initialSearchStage
          )
      ) {
        return {
          claimed:
            false,
          terminal:
            true,
          session:
            cloneSession(
              current.session
            ),
        };
      }

      const currentFence =
        Number(
          current.session
            .initialSearchFencingNumber
        ) || 0;

      if (
        initialSearchExecution
          .fencingNumber <=
          currentFence
      ) {
        return {
          claimed:
            false,
          terminal:
            false,
          session:
            cloneSession(
              current.session
            ),
        };
      }

      const now = Date.now();
      const claimedSession = {
        ...current.session,
        initialSearchStage:
          "running",
        initialSearchExecutionToken:
          initialSearchExecution
            .executionToken,
        initialSearchFencingNumber:
          initialSearchExecution
            .fencingNumber,
        status:
          "Running",
        searchIncomplete:
          true,
        isContinuing:
          false,
        lastError:
          null,
        retryable:
          false,
        retryAfterMs:
          2_000,
        updatedAt:
          now,
        expiresAt:
          now + safeSessionTtlMs,
      };
      const write =
        await writeEnvelope({
          searchId:
            normalized,
          session:
            claimedSession,
          expectedRevision:
            current.revision,
          lockMode:
            "initial-claim",
          initialSearchExecution,
        });

      if (write.outcome === "ok") {
        return {
          claimed:
            true,
          terminal:
            false,
          session:
            cloneSession(
              claimedSession
            ),
        };
      }

      if (write.outcome === "conflict") {
        continue;
      }

      if (
        write.outcome ===
          "initial-terminal"
      ) {
        const terminalSession =
          await requireSearchSession(
            normalized
          );

        return {
          claimed:
            false,
          terminal:
            true,
          session:
            terminalSession,
        };
      }

      if (
        write.outcome ===
          "stale-initial-search"
      ) {
        return {
          claimed:
            false,
          terminal:
            false,
          session:
            await requireSearchSession(
              normalized
            ),
        };
      }

      throwWriteFailure(
        write.outcome
      );
    }

    throwWriteFailure("conflict");
  }

  async function updateInitialSearchExecution(
    searchId,
    updates = {},
    execution
  ) {
    const initialSearchExecution =
      getInitialSearchExecutionContext(
        execution
      );

    if (!initialSearchExecution) {
      throwWriteFailure(
        "stale-initial-search"
      );
    }

    const nextUpdates =
      cloneSession(updates);

    if (
      ["complete", "failed"]
        .includes(
          nextUpdates
            .initialSearchStage
        )
    ) {
      nextUpdates
        .initialSearchExecutionToken =
          null;
    }

    return mutateSession(
      searchId,
      () => nextUpdates,
      {
        initialSearchExecution,
      }
    );
  }

  async function appendHotelsToSearchSession(
    searchId,
    hotels = [],
    options = {}
  ) {
    if (!Array.isArray(hotels)) {
      return getSearchSession(searchId);
    }

    return mutateSession(
      searchId,
      (currentSession) => {
        const hotelsById = new Map();

        for (
          const hotel of
          currentSession.hotels ?? []
        ) {
          if (hotel?.id) {
            hotelsById.set(hotel.id, hotel);
          }
        }

        for (const hotel of hotels) {
          if (hotel?.id) {
            hotelsById.set(hotel.id, hotel);
          }
        }

        const mergedHotels =
          Array.from(hotelsById.values());

        return {
          hotels: mergedHotels,
          totalHotels: mergedHotels.length,
        };
      },
      options
    );
  }

  async function tryAcquireSearchContinuation(
    searchId
  ) {
    const normalized = normalizeSearchId(searchId);
    const currentSession =
      await requireSearchSession(normalized);
    const lockToken = crypto.randomUUID();
    const leaseResult = await executor.execute(
      (client) => client.eval(
        ACQUIRE_LEASE_SCRIPT,
        {
          keys: [
            keyspace.continuationLease(
              normalized
            ),
            keyspace.continuationFence(
              normalized
            ),
            keyspace.session(normalized),
          ],
          arguments: [
            lockToken,
            String(safeContinuationLeaseTtlMs),
            String(tombstoneLifetimeMs),
          ],
        }
      )
    );
    const outcome = String(
      leaseResult?.[0] ?? ""
    );

    if (outcome === "busy") {
      return {
        acquired: false,
        lockToken: null,
        fencingNumber: null,
        session: currentSession,
      };
    }

    if (outcome === "missing") {
      return requireSearchSession(normalized);
    }

    if (outcome !== "ok") {
      throwWriteFailure(outcome);
    }

    const fencingNumber = Number(
      leaseResult[1]
    );
    const leaseContext = {
      lockToken,
      fencingNumber,
    };

    try {
      const lockedSession =
        await mutateSession(
          normalized,
          () => ({
            isContinuing: true,
            continuationLock:
              lockToken,
            continuationLockExpiresAt:
              Date.now() +
              safeContinuationLeaseTtlMs,
            continuationFencingNumber:
              fencingNumber,
            lastError: null,
          }),
          leaseContext
        );

      return {
        acquired: true,
        lockToken,
        fencingNumber,
        session: lockedSession,
      };
    } catch (error) {
      await executor.execute(
        (client) => client.eval(
          RELEASE_LEASE_ONLY_SCRIPT,
          {
            keys: [
              keyspace.continuationLease(
                normalized
              ),
            ],
            arguments: [
              lockToken,
              String(fencingNumber),
            ],
          }
        )
      );

      throw error;
    }
  }

  async function renewSearchContinuation(
    searchId,
    lockToken,
    fencingNumber
  ) {
    const normalized = normalizeSearchId(searchId);
    const leaseContext = getLeaseContext({
      lockToken,
      fencingNumber,
    });

    if (!normalized || !leaseContext) {
      return {
        renewed: false,
        session:
          normalized
            ? await getSearchSession(normalized)
            : null,
      };
    }

    for (
      let attempt = 0;
      attempt < safeCasRetries;
      attempt += 1
    ) {
      const current = await readEnvelope(normalized);

      if (!current) {
        return {
          renewed: false,
          session: null,
        };
      }

      const now = Date.now();
      const renewedSession = {
        ...current.session,
        isContinuing: true,
        continuationLock:
          leaseContext.lockToken,
        continuationLockExpiresAt:
          now + safeContinuationLeaseTtlMs,
        continuationFencingNumber:
          leaseContext.fencingNumber,
        updatedAt: now,
        expiresAt:
          now + safeSessionTtlMs,
      };
      const write = await writeEnvelope({
        searchId: normalized,
        session: renewedSession,
        expectedRevision: current.revision,
        lockMode: "owned",
        leaseContext,
        leaseAction: "renew",
      });

      if (write.outcome === "ok") {
        return {
          renewed: true,
          session: cloneSession(
            renewedSession
          ),
        };
      }

      if (write.outcome === "conflict") {
        continue;
      }

      if (
        ["missing", "stale-lease"].includes(
          write.outcome
        )
      ) {
        return {
          renewed: false,
          session:
            await getSearchSession(normalized),
        };
      }

      throwWriteFailure(write.outcome);
    }

    throwWriteFailure("conflict");
  }

  async function releaseSearchContinuation(
    searchId,
    lockToken,
    updates = {},
    options = {}
  ) {
    const normalized = normalizeSearchId(searchId);
    const leaseContext = getLeaseContext({
      lockToken,
      fencingNumber:
        options?.fencingNumber ??
        updates?.continuationFencingNumber,
    });

    if (!normalized || !leaseContext) {
      return {
        released: false,
        session:
          normalized
            ? await getSearchSession(normalized)
            : null,
      };
    }

    for (
      let attempt = 0;
      attempt < safeCasRetries;
      attempt += 1
    ) {
      const current = await readEnvelope(normalized);

      if (!current) {
        return {
          released: false,
          session: null,
        };
      }

      const now = Date.now();
      const releasedSession = {
        ...current.session,
        ...cloneSession(updates),
        searchId:
          current.session.searchId,
        createdAt:
          current.session.createdAt,
        isContinuing: false,
        continuationLock: null,
        continuationLockExpiresAt: null,
        continuationFencingNumber:
          leaseContext.fencingNumber,
        updatedAt: now,
        expiresAt:
          now + safeSessionTtlMs,
      };
      const write = await writeEnvelope({
        searchId: normalized,
        session: releasedSession,
        expectedRevision: current.revision,
        lockMode: "owned",
        leaseContext,
        leaseAction: "delete",
      });

      if (write.outcome === "ok") {
        return {
          released: true,
          session: cloneSession(
            releasedSession
          ),
        };
      }

      if (write.outcome === "conflict") {
        continue;
      }

      if (
        ["missing", "stale-lease"].includes(
          write.outcome
        )
      ) {
        return {
          released: false,
          session:
            await getSearchSession(normalized),
        };
      }

      throwWriteFailure(write.outcome);
    }

    throwWriteFailure("conflict");
  }

  async function clearSearchSession(searchId) {
    const normalized = normalizeSearchId(searchId);

    if (!normalized) {
      return;
    }

    const keys = sessionKeys(normalized);

    await executor.execute(
      (client) => client.eval(
        CLEAR_SESSION_SCRIPT,
        {
          keys: [
            ...keys,
            keyspace.continuationFence(
              normalized
            ),
          ],
          arguments: [],
        }
      )
    );
  }

  async function getSearchSessionCount() {
    const result = await executor.execute(
      (client) => client.eval(
        SESSION_STATS_SCRIPT,
        {
          keys: [
            keyspace.sessionExpiryIndex,
            keyspace.sessionSizeIndex,
            keyspace.sessionTotalBytes,
          ],
          arguments: [
            String(Date.now()),
          ],
        }
      )
    );

    return Number(result?.[0] ?? 0);
  }

  const searchSessionStore = Object.freeze({
    SEARCH_SESSION_TTL_MS:
      safeSessionTtlMs,
    MAX_SEARCH_SESSIONS:
      safeMaxSessions,
    EXPIRED_SEARCH_ID_RETENTION_MS:
      safeTombstoneRetentionMs,
    SEARCH_SESSION_ID_VERSION,
    SEARCH_SESSION_STATES,
    saveSearchSession,
    getSearchSession,
    getSearchSessionState,
    requireSearchSession,
    claimInitialSearchExecution,
    updateInitialSearchExecution,
    updateSearchSession,
    appendHotelsToSearchSession,
    clearSearchSession,
    getSearchSessionCount,
  });

  const continuationLeaseStore =
    Object.freeze({
      CONTINUATION_LOCK_TTL_MS:
        safeContinuationLeaseTtlMs,
      tryAcquireSearchContinuation,
      renewSearchContinuation,
      releaseSearchContinuation,
    });

  return Object.freeze({
    searchSessionStore,
    continuationLeaseStore,
  });
}

module.exports = {
  SEARCH_SESSION_ID_VERSION,
  SEARCH_SESSION_ID_PATTERN,
  MAX_SEARCH_SESSION_BYTES,
  DEFAULT_AGGREGATE_SESSION_BYTES,
  createValkeySearchSessionAdapters,
};
