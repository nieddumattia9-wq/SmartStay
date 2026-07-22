const crypto = require("crypto");

const BOOKING_VERIFICATION_TTL_MS =
  10 * 60 * 1000;

const MAX_BOOKING_VERIFICATIONS =
  2000;

const BOOKING_VERIFICATION_ID_PATTERN =
  /^verify-[a-f0-9]{36}$/i;

const verifications =
  new Map();

function cleanupBookingVerifications() {
  const now = Date.now();

  for (const [
    verificationId,
    verification,
  ] of verifications.entries()) {
    if (
      verification.expiresAt <=
      now
    ) {
      verifications.delete(
        verificationId
      );
    }
  }
}

function createBookingVerificationError({
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

function normalizeVerificationId(
  value
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function saveBookingVerification({
  searchId,
  hotelId,
  originalOfferId,
  confirmedOffer,
  sourceProvider,
  providerBookingReference = null,
  requiresUserConfirmation = false,
  changedFields = [],
} = {}) {
  cleanupBookingVerifications();

  if (
    verifications.size >=
    MAX_BOOKING_VERIFICATIONS
  ) {
    throw createBookingVerificationError({
      code:
        "BOOKING_VERIFICATION_CAPACITY_REACHED",
      message:
        "Booking verification capacity has been reached.",
      status:
        503,
    });
  }

  const now = Date.now();

  const verificationId =
    `verify-${crypto.randomBytes(18).toString("hex")}`;

  const verification = {
    verificationId,
    searchId,
    hotelId,
    originalOfferId,
    confirmedOffer:
      structuredClone(
        confirmedOffer
      ),
    sourceProvider,
    providerBookingReference,
    requiresUserConfirmation:
      requiresUserConfirmation ===
      true,
    changedFields: [
      ...new Set(
        Array.isArray(
          changedFields
        )
          ? changedFields
              .filter(
                (field) =>
                  typeof field ===
                    "string" &&
                  field.trim()
              )
              .map(
                (field) =>
                  field.trim()
              )
          : []
      ),
    ],
    createdAt:
      now,
    expiresAt:
      now +
      BOOKING_VERIFICATION_TTL_MS,
  };

  verifications.set(
    verificationId,
    verification
  );

  return structuredClone(
    verification
  );
}

function getBookingVerification(
  verificationId
) {
  cleanupBookingVerifications();

  const normalized =
    normalizeVerificationId(
      verificationId
    );

  const verification =
    verifications.get(
      normalized
    );

  return verification
    ? structuredClone(
        verification
      )
    : null;
}

function requireBookingVerification(
  verificationId
) {
  const normalized =
    normalizeVerificationId(
      verificationId
    );

  if (
    !BOOKING_VERIFICATION_ID_PATTERN.test(
      normalized
    )
  ) {
    throw createBookingVerificationError({
      code:
        "BOOKING_VERIFICATION_ID_INVALID",
      message:
        "The booking verification id is invalid.",
      status:
        400,
    });
  }

  const verification =
    getBookingVerification(
      normalized
    );

  if (!verification) {
    throw createBookingVerificationError({
      code:
        "BOOKING_VERIFICATION_EXPIRED",
      message:
        "This booking verification has expired. Check the offer again.",
      status:
        410,
    });
  }

  return verification;
}

module.exports = {
  BOOKING_VERIFICATION_TTL_MS,
  MAX_BOOKING_VERIFICATIONS,
  BOOKING_VERIFICATION_ID_PATTERN,
  saveBookingVerification,
  getBookingVerification,
  requireBookingVerification,
};
