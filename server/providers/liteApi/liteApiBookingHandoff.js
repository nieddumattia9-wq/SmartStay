function normalizeRequiredText(
  value
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function getLiteApiWhitelabelBaseUrl(
  configuredValue =
    process.env
      .LITEAPI_WHITELABEL_BASE_URL
) {
  const candidate =
    normalizeRequiredText(
      configuredValue
    );

  if (!candidate) {
    const error =
      new Error(
        "LiteAPI white-label checkout is not configured."
      );

    error.code =
      "PROVIDER_BOOKING_HANDOFF_NOT_CONFIGURED";

    error.status =
      503;

    throw error;
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
      throw new Error(
        "invalid"
      );
    }

    url.search =
      "";

    url.hash =
      "";

    url.pathname =
      url.pathname.replace(
        /\/+$/,
        ""
      );

    return url;
  } catch {
    const error =
      new Error(
        "LiteAPI white-label checkout URL is invalid."
      );

    error.code =
      "PROVIDER_BOOKING_HANDOFF_CONFIGURATION_INVALID";

    error.status =
      503;

    throw error;
  }
}

function createLiteApiWhitelabelCheckoutUrl({
  providerBookingReference,
  baseUrl =
    process.env
      .LITEAPI_WHITELABEL_BASE_URL,
} = {}) {
  const prebookId =
    normalizeRequiredText(
      providerBookingReference
    );

  if (!prebookId) {
    const error =
      new Error(
        "The private prebook reference is required."
      );

    error.code =
      "PROVIDER_BOOKING_REFERENCE_REQUIRED";

    error.status =
      409;

    throw error;
  }

  const url =
    getLiteApiWhitelabelBaseUrl(
      baseUrl
    );

  url.pathname =
    `${url.pathname}/booking`
      .replace(
        /\/{2,}/g,
        "/"
      );

  url.searchParams.set(
    "prebookId",
    prebookId
  );

  return url.toString();
}

module.exports = {
  createLiteApiWhitelabelCheckoutUrl,
  getLiteApiWhitelabelBaseUrl,
};
