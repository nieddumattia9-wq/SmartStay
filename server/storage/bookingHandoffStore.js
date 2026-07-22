const crypto = require("crypto");

const BOOKING_HANDOFF_TTL_MS =
  5 * 60 * 1000;

const MAX_BOOKING_HANDOFFS =
  2000;

const BOOKING_HANDOFF_ID_PATTERN =
  /^handoff-[a-f0-9]{36}$/i;

const handoffs =
  new Map();

function cleanupBookingHandoffs() {
  const now =
    Date.now();

  for (const [
    handoffId,
    handoff,
  ] of handoffs.entries()) {
    if (
      handoff.expiresAt <=
      now
    ) {
      handoffs.delete(
        handoffId
      );
    }
  }
}

function createHandoffError({
  code,
  message,
  status,
} = {}) {
  const error =
    new Error(message);

  error.code =
    code;

  error.status =
    status;

  return error;
}

function getSafeRedirectUrl(
  value
) {
  const candidate =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  try {
    const url =
      new URL(candidate);

    if (
      url.protocol !==
        "https:" ||
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

function saveBookingHandoff({
  verificationId,
  sourceProvider,
  redirectUrl,
} = {}) {
  cleanupBookingHandoffs();

  if (
    handoffs.size >=
    MAX_BOOKING_HANDOFFS
  ) {
    throw createHandoffError({
      code:
        "BOOKING_HANDOFF_CAPACITY_REACHED",
      message:
        "Booking handoff capacity has been reached.",
      status:
        503,
    });
  }

  const safeRedirectUrl =
    getSafeRedirectUrl(
      redirectUrl
    );

  if (!safeRedirectUrl) {
    throw createHandoffError({
      code:
        "BOOKING_HANDOFF_URL_INVALID",
      message:
        "The booking handoff URL is invalid.",
      status:
        502,
    });
  }

  const now =
    Date.now();

  const handoff = {
    handoffId:
      `handoff-${crypto.randomBytes(18).toString("hex")}`,
    verificationId,
    sourceProvider,
    redirectUrl:
      safeRedirectUrl,
    createdAt:
      now,
    expiresAt:
      now +
      BOOKING_HANDOFF_TTL_MS,
  };

  handoffs.set(
    handoff.handoffId,
    handoff
  );

  return structuredClone(
    handoff
  );
}

function requireBookingHandoff(
  handoffId
) {
  cleanupBookingHandoffs();

  const normalized =
    typeof handoffId ===
      "string"
      ? handoffId.trim()
      : "";

  if (
    !BOOKING_HANDOFF_ID_PATTERN.test(
      normalized
    )
  ) {
    throw createHandoffError({
      code:
        "BOOKING_HANDOFF_ID_INVALID",
      message:
        "The booking handoff id is invalid.",
      status:
        400,
    });
  }

  const handoff =
    handoffs.get(
      normalized
    );

  if (!handoff) {
    throw createHandoffError({
      code:
        "BOOKING_HANDOFF_EXPIRED",
      message:
        "This booking handoff has expired. Check the offer again.",
      status:
        410,
    });
  }

  return structuredClone(
    handoff
  );
}

module.exports = {
  BOOKING_HANDOFF_TTL_MS,
  MAX_BOOKING_HANDOFFS,
  BOOKING_HANDOFF_ID_PATTERN,
  saveBookingHandoff,
  requireBookingHandoff,
};
