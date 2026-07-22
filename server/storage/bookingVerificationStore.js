const crypto = require("crypto");

const BOOKING_VERIFICATION_TTL_MS =
  10 * 60 * 1000;

const MAX_BOOKING_VERIFICATIONS =
  2000;

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

function saveBookingVerification({
  searchId,
  hotelId,
  originalOfferId,
  confirmedOffer,
  sourceProvider,
  providerBookingReference = null,
} = {}) {
  cleanupBookingVerifications();

  if (
    verifications.size >=
    MAX_BOOKING_VERIFICATIONS
  ) {
    const error =
      new Error(
        "Booking verification capacity has been reached."
      );

    error.code =
      "BOOKING_VERIFICATION_CAPACITY_REACHED";

    error.status =
      503;

    throw error;
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
    typeof verificationId ===
      "string"
      ? verificationId.trim()
      : "";

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

module.exports = {
  BOOKING_VERIFICATION_TTL_MS,
  MAX_BOOKING_VERIFICATIONS,
  saveBookingVerification,
  getBookingVerification,
};
