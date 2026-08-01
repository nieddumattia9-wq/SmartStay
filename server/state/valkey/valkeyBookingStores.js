"use strict";

const crypto = require("crypto");

const BOOKING_VERIFICATION_TTL_MS =
  10 * 60 * 1000;
const MAX_BOOKING_VERIFICATIONS = 2000;
const BOOKING_VERIFICATION_ID_PATTERN =
  /^verify-[a-f0-9]{36}$/i;
const BOOKING_HANDOFF_TTL_MS =
  5 * 60 * 1000;
const MAX_BOOKING_HANDOFFS = 2000;
const BOOKING_HANDOFF_ID_PATTERN =
  /^handoff-[a-f0-9]{36}$/i;

const {
  normalizePositiveInteger,
  serializeBounded,
  parseStoredJson,
} = require("./valkeyShared");

const BOOKING_RECORD_MAX_BYTES =
  64 * 1024;

const STORE_RECORD_SCRIPT = String.raw`
local now = tonumber(ARGV[3])
local expired = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', now)
for _, record_key in ipairs(expired) do
  redis.call('DEL', record_key)
end
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)

if redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[4]) then
  return {'capacity'}
end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return {'collision'}
end

redis.call('SET', KEYS[1], ARGV[1], 'PX', tonumber(ARGV[2]))
redis.call('ZADD', KEYS[2], now + tonumber(ARGV[2]), KEYS[1])
return {'ok'}
`;

const CONSUME_HANDOFF_SCRIPT = String.raw`
local value = redis.call('GET', KEYS[1])
if not value then
  redis.call('ZREM', KEYS[2], KEYS[1])
  return nil
end
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], KEYS[1])
return value
`;

function createBookingStateError({
  code,
  message,
  status,
} = {}) {
  const error = new Error(message);

  error.name = "BookingStateError";
  error.code = code;
  error.status = status;

  return error;
}

function normalizeIdentifier(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getSafeRedirectUrl(value) {
  const candidate =
    typeof value === "string"
      ? value.trim()
      : "";

  try {
    const url = new URL(candidate);

    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function cloneRecord(value) {
  try {
    return structuredClone(value);
  } catch {
    throw createBookingStateError({
      code: "BOOKING_STATE_RECORD_INVALID",
      message:
        "Booking state must be safely cloneable.",
      status: 400,
    });
  }
}

async function saveUniqueRecord({
  executor,
  createKey,
  createRecord,
  ttlMs,
  expiryIndexKey,
  maxRecords,
  collisionCode,
  capacityCode,
  capacityMessage,
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const record = createRecord();
    const serialized = serializeBounded(
      record,
      {
        maxBytes: BOOKING_RECORD_MAX_BYTES,
        code: "BOOKING_STATE_RECORD_TOO_LARGE",
        message:
          "The booking state exceeds the shared-state size limit.",
        status: 503,
      }
    );
    const recordKey = createKey(record);
    const stored = await executor.execute(
      (client) => client.eval(
        STORE_RECORD_SCRIPT,
        {
          keys: [
            recordKey,
            expiryIndexKey,
          ],
          arguments: [
            serialized.serialized,
            String(ttlMs),
            String(Date.now()),
            String(maxRecords),
          ],
        }
      )
    );
    const outcome = String(
      stored?.[0] ?? ""
    );

    if (outcome === "ok") {
      return cloneRecord(record);
    }

    if (outcome === "capacity") {
      throw createBookingStateError({
        code: capacityCode,
        message: capacityMessage,
        status: 503,
      });
    }
  }

  throw createBookingStateError({
    code: collisionCode,
    message:
      "Unable to allocate secure booking state.",
    status: 503,
  });
}

function createValkeyBookingStores({
  executor,
  keyspace,
  verificationTtlMs =
    BOOKING_VERIFICATION_TTL_MS,
  handoffTtlMs =
    BOOKING_HANDOFF_TTL_MS,
  maxBookingVerifications =
    MAX_BOOKING_VERIFICATIONS,
  maxBookingHandoffs =
    MAX_BOOKING_HANDOFFS,
} = {}) {
  const safeVerificationTtlMs =
    normalizePositiveInteger(
      verificationTtlMs,
      BOOKING_VERIFICATION_TTL_MS,
      {
        minimum: 50,
        maximum: 24 * 60 * 60 * 1000,
      }
    );
  const safeHandoffTtlMs =
    normalizePositiveInteger(
      handoffTtlMs,
      BOOKING_HANDOFF_TTL_MS,
      {
        minimum: 50,
        maximum: 24 * 60 * 60 * 1000,
      }
    );
  const safeMaxBookingVerifications =
    normalizePositiveInteger(
      maxBookingVerifications,
      MAX_BOOKING_VERIFICATIONS,
      {
        minimum: 1,
        maximum:
          MAX_BOOKING_VERIFICATIONS,
      }
    );
  const safeMaxBookingHandoffs =
    normalizePositiveInteger(
      maxBookingHandoffs,
      MAX_BOOKING_HANDOFFS,
      {
        minimum: 1,
        maximum:
          MAX_BOOKING_HANDOFFS,
      }
    );

  async function saveBookingVerification({
    searchId,
    hotelId,
    originalOfferId,
    confirmedOffer,
    stayContext = null,
    sourceProvider,
    providerBookingReference = null,
    requiresUserConfirmation = false,
    changedFields = [],
  } = {}) {
    const verification =
      await saveUniqueRecord({
      executor,
      ttlMs: safeVerificationTtlMs,
      expiryIndexKey:
        keyspace.bookingVerificationExpiryIndex,
      maxRecords:
        safeMaxBookingVerifications,
      collisionCode:
        "BOOKING_VERIFICATION_ID_COLLISION",
      capacityCode:
        "BOOKING_VERIFICATION_CAPACITY_REACHED",
      capacityMessage:
        "Booking verification capacity has been reached.",
      createKey(record) {
        return keyspace.bookingVerification(
          record.verificationId
        );
      },
      createRecord() {
        const now = Date.now();

        return {
          schemaVersion: 1,
          verificationId:
            `verify-${crypto.randomBytes(18).toString("hex")}`,
          searchId,
          hotelId,
          originalOfferId,
          confirmedOffer:
            cloneRecord(confirmedOffer),
          stayContext:
            stayContext &&
            typeof stayContext === "object"
              ? cloneRecord(stayContext)
              : null,
          sourceProvider,
          providerBookingReference,
          requiresUserConfirmation:
            requiresUserConfirmation === true,
          changedFields: [
            ...new Set(
              Array.isArray(changedFields)
                ? changedFields
                    .filter(
                      (field) =>
                        typeof field === "string" &&
                        field.trim()
                    )
                    .map((field) =>
                      field.trim()
                    )
                : []
            ),
          ],
          createdAt: now,
          expiresAt:
            now + safeVerificationTtlMs,
        };
      },
      });

    delete verification.schemaVersion;

    return verification;
  }

  async function getBookingVerification(
    verificationId
  ) {
    const normalized =
      normalizeIdentifier(verificationId);

    if (
      !BOOKING_VERIFICATION_ID_PATTERN.test(
        normalized
      )
    ) {
      return null;
    }

    const raw = await executor.execute(
      (client) => client.get(
        keyspace.bookingVerification(
          normalized
        )
      )
    );

    if (raw === null) {
      return null;
    }

    const verification = parseStoredJson(
      raw,
      {
        code:
          "BOOKING_VERIFICATION_RECORD_INVALID",
        message:
          "Shared booking verification state is invalid.",
      }
    );

    if (
      verification?.schemaVersion !== 1 ||
      verification.verificationId !==
        normalized
    ) {
      throw createBookingStateError({
        code:
          "BOOKING_VERIFICATION_RECORD_INVALID",
        message:
          "Shared booking verification state is invalid.",
        status: 503,
      });
    }

    const result = cloneRecord(verification);
    delete result.schemaVersion;

    return result;
  }

  async function requireBookingVerification(
    verificationId
  ) {
    const normalized =
      normalizeIdentifier(verificationId);

    if (
      !BOOKING_VERIFICATION_ID_PATTERN.test(
        normalized
      )
    ) {
      throw createBookingStateError({
        code:
          "BOOKING_VERIFICATION_ID_INVALID",
        message:
          "The booking verification id is invalid.",
        status: 400,
      });
    }

    const verification =
      await getBookingVerification(normalized);

    if (!verification) {
      throw createBookingStateError({
        code:
          "BOOKING_VERIFICATION_EXPIRED",
        message:
          "This booking verification has expired. Check the offer again.",
        status: 410,
      });
    }

    return verification;
  }

  async function saveBookingHandoff({
    verificationId,
    sourceProvider,
    redirectUrl,
  } = {}) {
    const safeRedirectUrl =
      getSafeRedirectUrl(redirectUrl);

    if (!safeRedirectUrl) {
      throw createBookingStateError({
        code: "BOOKING_HANDOFF_URL_INVALID",
        message:
          "The booking handoff URL is invalid.",
        status: 502,
      });
    }

    const handoff =
      await saveUniqueRecord({
      executor,
      ttlMs: safeHandoffTtlMs,
      expiryIndexKey:
        keyspace.bookingHandoffExpiryIndex,
      maxRecords:
        safeMaxBookingHandoffs,
      collisionCode:
        "BOOKING_HANDOFF_ID_COLLISION",
      capacityCode:
        "BOOKING_HANDOFF_CAPACITY_REACHED",
      capacityMessage:
        "Booking handoff capacity has been reached.",
      createKey(record) {
        return keyspace.bookingHandoff(
          record.handoffId
        );
      },
      createRecord() {
        const now = Date.now();

        return {
          schemaVersion: 1,
          handoffId:
            `handoff-${crypto.randomBytes(18).toString("hex")}`,
          verificationId,
          sourceProvider,
          redirectUrl: safeRedirectUrl,
          createdAt: now,
          expiresAt:
            now + safeHandoffTtlMs,
        };
      },
      });

    delete handoff.schemaVersion;

    return handoff;
  }

  async function requireBookingHandoff(
    handoffId
  ) {
    const normalized =
      normalizeIdentifier(handoffId);

    if (
      !BOOKING_HANDOFF_ID_PATTERN.test(
        normalized
      )
    ) {
      throw createBookingStateError({
        code:
          "BOOKING_HANDOFF_ID_INVALID",
        message:
          "The booking handoff id is invalid.",
        status: 400,
      });
    }

    const raw = await executor.execute(
      (client) => client.eval(
        CONSUME_HANDOFF_SCRIPT,
        {
          keys: [
            keyspace.bookingHandoff(
              normalized
            ),
            keyspace.bookingHandoffExpiryIndex,
          ],
          arguments: [],
        }
      )
    );

    if (raw === null) {
      throw createBookingStateError({
        code: "BOOKING_HANDOFF_EXPIRED",
        message:
          "This booking handoff has expired. Check the offer again.",
        status: 410,
      });
    }

    const handoff = parseStoredJson(raw, {
      code: "BOOKING_HANDOFF_RECORD_INVALID",
      message:
        "Shared booking handoff state is invalid.",
    });

    if (
      handoff?.schemaVersion !== 1 ||
      handoff.handoffId !== normalized
    ) {
      throw createBookingStateError({
        code: "BOOKING_HANDOFF_RECORD_INVALID",
        message:
          "Shared booking handoff state is invalid.",
        status: 503,
      });
    }

    const result = cloneRecord(handoff);
    delete result.schemaVersion;

    return result;
  }

  return Object.freeze({
    bookingVerificationStore:
      Object.freeze({
        BOOKING_VERIFICATION_TTL_MS:
          safeVerificationTtlMs,
        MAX_BOOKING_VERIFICATIONS:
          safeMaxBookingVerifications,
        BOOKING_VERIFICATION_ID_PATTERN,
        saveBookingVerification,
        getBookingVerification,
        requireBookingVerification,
      }),
    bookingHandoffStore:
      Object.freeze({
        BOOKING_HANDOFF_TTL_MS:
          safeHandoffTtlMs,
        MAX_BOOKING_HANDOFFS:
          safeMaxBookingHandoffs,
        BOOKING_HANDOFF_ID_PATTERN,
        saveBookingHandoff,
        requireBookingHandoff,
      }),
  });
}

module.exports = {
  BOOKING_RECORD_MAX_BYTES,
  createValkeyBookingStores,
};
