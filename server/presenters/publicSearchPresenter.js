const {
  createPublicHotels,
} = require(
  "./publicHotelPresenter"
);

const {
  deriveSearchLifecycle,
  getPublicLifecycleMessage,
  isLifecycleFailure,
} = require(
  "../utils/searchLifecycle"
);

function normalizeSearchId(value) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function normalizeNullableText(value) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function normalizeLegacyStatus(value) {
  return normalizeNullableText(value);
}

function normalizeLegacyBoolean(
  value,
  fallback = false
) {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function normalizeTimestamp(
  value
) {
  const timestamp =
    Number(
      value
    );

  return Number.isFinite(
    timestamp
  ) &&
  timestamp > 0
    ? timestamp
    : null;
}

function createPublicSearchPayload(
  payload = {}
) {
  const source =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
      ? payload
      : {};

  const hasHotelsArray =
    Array.isArray(
      source.hotels
    );

  const hotels =
    createPublicHotels(
      source.hotels
    );

  const sourceTotalHotels =
    Number(source.totalHotels);

  const totalHotels =
    hasHotelsArray
      ? hotels.length
      : (
          Number.isFinite(
            sourceTotalHotels
          ) &&
          sourceTotalHotels > 0
            ? sourceTotalHotels
            : 0
        );

  const lifecycle =
    deriveSearchLifecycle({
      ...source,
      ...(hasHotelsArray
        ? {
            hotels,
          }
        : {
            hotels:
              undefined,
          }),
      totalHotels,
    });

  const lifecycleMessage =
    getPublicLifecycleMessage(
      lifecycle
    );

  const publicMessage =
    lifecycleMessage ??
    (
      source.success === true
        ? normalizeNullableText(
            source.message
          )
        : null
    );

  return {
    success:
      source.success === true,

    message:
      publicMessage,

    code:
      lifecycle.publicCode,

    searchId:
      normalizeSearchId(
        source.searchId
      ),

    status:
      normalizeLegacyStatus(
        source.status ??
        source.result?.status
      ),

    searchIncomplete:
      normalizeLegacyBoolean(
        source.searchIncomplete,
        Boolean(
          source.continuation
        )
      ),

    isContinuing:
      normalizeLegacyBoolean(
        source.isContinuing,
        false
      ),

    nextResultsKey:
      normalizeNullableText(
        source.nextResultsKey
      ),

    currency:
      normalizeNullableText(
        source.currency
      ),

    totalHotels,

    hotels,

    retryAfterMs:
      lifecycle.retryAfterMs,

    lifecycle,
  };
}

function createPublicSearchSession(
  session = {}
) {
  const payload =
    createPublicSearchPayload({
      ...session,
      success: true,
    });

  return {
    searchId:
      payload.searchId,

    status:
      payload.status,

    searchIncomplete:
      payload.searchIncomplete,

    isContinuing:
      payload.isContinuing,

    currency:
      payload.currency,

    nextResultsKey:
      payload.nextResultsKey,

    totalHotels:
      payload.totalHotels,

    hotels:
      payload.hotels,

    lastError:
      isLifecycleFailure(
        payload.lifecycle
      )
        ? payload.message
        : null,

    createdAt:
      normalizeTimestamp(
        session.createdAt
      ),

    updatedAt:
      normalizeTimestamp(
        session.updatedAt
      ),

    expiresAt:
      normalizeTimestamp(
        session.expiresAt
      ),

    retryAfterMs:
      payload.retryAfterMs,

    lifecycle:
      payload.lifecycle,
  };
}

function createPublicSearchStatus(
  payload = {}
) {
  const publicPayload =
    createPublicSearchPayload(
      payload
    );

  return {
    success:
      publicPayload.success,

    message:
      publicPayload.message,

    code:
      publicPayload.code,

    searchId:
      publicPayload.searchId,

    status:
      publicPayload.status,

    searchIncomplete:
      publicPayload.searchIncomplete,

    isContinuing:
      publicPayload.isContinuing,

    totalHotels:
      publicPayload.totalHotels,

    nextResultsKey:
      publicPayload.nextResultsKey,

    lastError:
      isLifecycleFailure(
        publicPayload.lifecycle
      )
        ? publicPayload.message
        : null,

    updatedAt:
      normalizeTimestamp(
        payload.updatedAt
      ),

    expiresAt:
      normalizeTimestamp(
        payload.expiresAt
      ),

    retryAfterMs:
      publicPayload.retryAfterMs,

    lifecycle:
      publicPayload.lifecycle,
  };
}

module.exports = {
  createPublicSearchPayload,
  createPublicSearchSession,
  createPublicSearchStatus,
};
