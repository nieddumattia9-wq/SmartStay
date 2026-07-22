const PROVIDER_BOOKING_HANDOFF_TYPES =
  Object.freeze({
    EXTERNAL_REDIRECT:
      "external_redirect",
  });

function normalizeProviderId(
  value
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}

function getSafeExternalUrl(
  value
) {
  const candidate =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  if (!candidate) {
    return null;
  }

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

function createProviderExternalBookingHandoff({
  providerId,
  redirectUrl,
} = {}) {
  const normalizedProviderId =
    normalizeProviderId(
      providerId
    );

  const safeRedirectUrl =
    getSafeExternalUrl(
      redirectUrl
    );

  if (
    !normalizedProviderId ||
    !safeRedirectUrl
  ) {
    throw new Error(
      "A valid providerId and HTTPS redirectUrl are required."
    );
  }

  return {
    type:
      PROVIDER_BOOKING_HANDOFF_TYPES
        .EXTERNAL_REDIRECT,
    providerId:
      normalizedProviderId,
    redirectUrl:
      safeRedirectUrl,
  };
}

function validateProviderBookingHandoffResult(
  result
) {
  if (
    !result ||
    typeof result !==
      "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      "Provider booking handoff result must be an object."
    );
  }

  if (
    result.type !==
      PROVIDER_BOOKING_HANDOFF_TYPES
        .EXTERNAL_REDIRECT
  ) {
    throw new Error(
      "Provider booking handoff type is unsupported."
    );
  }

  return createProviderExternalBookingHandoff({
    providerId:
      result.providerId,
    redirectUrl:
      result.redirectUrl,
  });
}

module.exports = {
  PROVIDER_BOOKING_HANDOFF_TYPES,
  createProviderExternalBookingHandoff,
  getSafeExternalUrl,
  validateProviderBookingHandoffResult,
};
