const crypto = require("crypto");

const SEARCH_IDEMPOTENCY_TTL_MS =
  25 * 60 * 1000;

const MAX_SEARCH_IDEMPOTENCY_RECORDS =
  2_000;

const IDEMPOTENCY_KEY_MIN_LENGTH =
  16;

const IDEMPOTENCY_KEY_MAX_LENGTH =
  128;

const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9._~:-]+$/;

const records =
  new Map();

function createIdempotencyError({
  code,
  message,
  status,
}) {
  const error =
    new Error(message);

  error.code =
    code;

  error.status =
    status;

  error.isSearchIdempotencyError =
    true;

  return error;
}

function normalizeIdempotencyKey(
  value
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validateIdempotencyKey(
  value
) {
  const key =
    normalizeIdempotencyKey(
      value
    );

  if (!key) {
    throw createIdempotencyError({
      code:
        "IDEMPOTENCY_KEY_REQUIRED",

      message:
        "Idempotency-Key is required for hotel searches.",

      status:
        400,
    });
  }

  if (
    key.length <
      IDEMPOTENCY_KEY_MIN_LENGTH ||
    key.length >
      IDEMPOTENCY_KEY_MAX_LENGTH ||
    !IDEMPOTENCY_KEY_PATTERN.test(
      key
    )
  ) {
    throw createIdempotencyError({
      code:
        "IDEMPOTENCY_KEY_INVALID",

      message:
        "Idempotency-Key is invalid.",

      status:
        400,
    });
  }

  return key;
}

function canonicalizeJsonValue(
  value
) {
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
        code:
          "IDEMPOTENCY_PAYLOAD_INVALID",

        message:
          "Hotel search payload is not valid JSON.",

        status:
          400,
      });
    }

    return Object.is(value, -0)
      ? 0
      : value;
  }

  if (Array.isArray(value)) {
    return value.map(
      canonicalizeJsonValue
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const canonicalObject = {};

    for (
      const key of
      Object.keys(value).sort()
    ) {
      const propertyValue =
        value[key];

      if (
        propertyValue === undefined ||
        typeof propertyValue ===
          "function" ||
        typeof propertyValue ===
          "symbol" ||
        typeof propertyValue ===
          "bigint"
      ) {
        throw createIdempotencyError({
          code:
            "IDEMPOTENCY_PAYLOAD_INVALID",

          message:
            "Hotel search payload is not valid JSON.",

          status:
            400,
        });
      }

      canonicalObject[key] =
        canonicalizeJsonValue(
          propertyValue
        );
    }

    return canonicalObject;
  }

  throw createIdempotencyError({
    code:
      "IDEMPOTENCY_PAYLOAD_INVALID",

    message:
      "Hotel search payload is not valid JSON.",

    status:
      400,
  });
}

function createSearchPayloadFingerprint(
  payload
) {
  const canonicalPayload =
    canonicalizeJsonValue(
      payload
    );

  const serializedPayload =
    JSON.stringify(
      canonicalPayload
    );

  return crypto
    .createHash("sha256")
    .update(serializedPayload)
    .digest("hex");
}

function cloneResponse(
  value
) {
  try {
    return structuredClone(
      value
    );
  }
  catch (error) {
    const cloneError =
      new Error(
        "Idempotent search response must be safely cloneable."
      );

    cloneError.code =
      "IDEMPOTENCY_RESPONSE_INVALID";

    cloneError.status =
      500;

    cloneError.cause =
      error;

    throw cloneError;
  }
}

function removeExpiredRecords() {
  const now =
    Date.now();

  for (
    const [
      key,
      record,
    ] of records.entries()
  ) {
    if (
      record.expiresAt <= now
    ) {
      records.delete(
        key
      );
    }
  }
}

function removeOldestCompletedRecord() {
  for (
    const [
      key,
      record,
    ] of records.entries()
  ) {
    if (
      record.state ===
        "fulfilled"
    ) {
      records.delete(
        key
      );

      return true;
    }
  }

  return false;
}

function reserveCapacity() {
  removeExpiredRecords();

  while (
    records.size >=
      MAX_SEARCH_IDEMPOTENCY_RECORDS
  ) {
    if (
      !removeOldestCompletedRecord()
    ) {
      throw createIdempotencyError({
        code:
          "IDEMPOTENCY_CAPACITY_REACHED",

        message:
          "Hotel search is temporarily unable to accept another request. Please try again shortly.",

        status:
          503,
      });
    }
  }
}

function isSearchIdempotencyError(
  error
) {
  return (
    error?.isSearchIdempotencyError ===
      true
  );
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

  const key =
    validateIdempotencyKey(
      idempotencyKey
    );

  const fingerprint =
    createSearchPayloadFingerprint(
      payload
    );

  removeExpiredRecords();

  const existingRecord =
    records.get(
      key
    );

  if (existingRecord) {
    if (
      existingRecord.fingerprint !==
        fingerprint
    ) {
      throw createIdempotencyError({
        code:
          "IDEMPOTENCY_KEY_CONFLICT",

        message:
          "This Idempotency-Key was already used for a different hotel search.",

        status:
          409,
      });
    }

    if (
      existingRecord.state ===
        "fulfilled"
    ) {
      return {
        response:
          cloneResponse(
            existingRecord.response
          ),

        replayed:
          true,

        coalesced:
          false,
      };
    }

    const response =
      await existingRecord.promise;

    return {
      response:
        cloneResponse(
          response
        ),

      replayed:
        false,

      coalesced:
        true,
    };
  }

  reserveCapacity();

  const record = {
    fingerprint,

    state:
      "pending",

    createdAt:
      Date.now(),

    expiresAt:
      Date.now() +
      SEARCH_IDEMPOTENCY_TTL_MS,

    promise:
      null,

    response:
      null,
  };

  const promise =
    Promise.resolve()
      .then(execute)
      .then((response) => {
        const responseSnapshot =
          cloneResponse(
            response
          );

        const hasStableSearchId =
          typeof responseSnapshot
            ?.searchId === "string" &&
          responseSnapshot.searchId
            .trim();

        if (hasStableSearchId) {
          record.state =
            "fulfilled";

          record.response =
            responseSnapshot;

          record.expiresAt =
            Date.now() +
            SEARCH_IDEMPOTENCY_TTL_MS;
        }
        else if (
          records.get(key) ===
            record
        ) {
          records.delete(
            key
          );
        }

        return responseSnapshot;
      })
      .catch((error) => {
        if (
          records.get(key) ===
            record
        ) {
          records.delete(
            key
          );
        }

        throw error;
      });

  record.promise =
    promise;

  records.set(
    key,
    record
  );

  const response =
    await promise;

  return {
    response:
      cloneResponse(
        response
      ),

    replayed:
      false,

    coalesced:
      false,
  };
}

function clearSearchIdempotencyRecords() {
  records.clear();
}

function getSearchIdempotencyRecordCount() {
  removeExpiredRecords();

  return records.size;
}

module.exports = {
  SEARCH_IDEMPOTENCY_TTL_MS,
  MAX_SEARCH_IDEMPOTENCY_RECORDS,
  normalizeIdempotencyKey,
  validateIdempotencyKey,
  createSearchPayloadFingerprint,
  isSearchIdempotencyError,
  executeInitialSearchIdempotently,
  clearSearchIdempotencyRecords,
  getSearchIdempotencyRecordCount,
};
