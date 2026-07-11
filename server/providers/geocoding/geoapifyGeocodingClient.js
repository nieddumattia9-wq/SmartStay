const GEOAPIFY_AUTOCOMPLETE_URL =
  "https://api.geoapify.com/v1/geocode/autocomplete";

const GEOAPIFY_REQUEST_TIMEOUT_MS =
  8_000;

const GEOAPIFY_RESULT_LIMIT =
  6;

function getGeoapifyApiKey() {

  const apiKey =
    process.env.GEOAPIFY_API_KEY?.trim();

  if (!apiKey) {

    const error =
      new Error(
        "GEOAPIFY_API_KEY is not configured."
      );

    error.code =
      "GEOAPIFY_NOT_CONFIGURED";

    throw error;

  }

  return apiKey;

}

function getStringValue(value) {

  return typeof value === "string"
    ? value.trim()
    : "";

}

function getFiniteNumber(value) {

  const number =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(number)
    ? number
    : null;

}

function getGeoapifyResults(data) {

  if (Array.isArray(data)) {

    return data;

  }

  if (Array.isArray(data?.results)) {

    return data.results;

  }

  if (Array.isArray(data?.features)) {

    return data.features.map((feature) => ({
      ...(feature.properties ?? {}),

      lat:
        feature.properties?.lat ??
        feature.geometry?.coordinates?.[1],

      lon:
        feature.properties?.lon ??
        feature.geometry?.coordinates?.[0],
    }));

  }

  return [];

}

function createDisplayName({
  city,
  state,
  country,
}) {

  const parts = [];

  for (const value of [
    city,
    state,
    country,
  ]) {

    const normalizedValue =
      getStringValue(value);

    if (!normalizedValue) {

      continue;

    }

    const alreadyIncluded =
      parts.some(
        (part) =>
          part.toLowerCase() ===
          normalizedValue.toLowerCase()
      );

    if (!alreadyIncluded) {

      parts.push(normalizedValue);

    }

  }

  return parts.join(", ");

}

function mapGeoapifyDestination(result) {

  const city =
    getStringValue(result?.city) ||
    getStringValue(result?.name) ||
    getStringValue(result?.municipality);

  const countryName =
    getStringValue(result?.country);

  const countryCode =
    getStringValue(
      result?.country_code
    ).toUpperCase();

  const state =
    getStringValue(result?.state);

  const lat =
    getFiniteNumber(result?.lat);

  const lng =
    getFiniteNumber(
      result?.lon ?? result?.lng
    );

  if (
    !city ||
    lat === null ||
    lng === null
  ) {

    return null;

  }

  const providerReference =
    getStringValue(result?.place_id) ||
    getStringValue(result?.result_id) ||
    [
      countryCode || "XX",
      lat.toFixed(6),
      lng.toFixed(6),
    ].join(":");

  return {
    id:
      `geoapify:${providerReference}`,

    name:
      createDisplayName({
        city,
        state,
        country: countryName,
      }) || city,

    country:
      countryCode || countryName,

    type:
      "City",

    city,

    referenceId:
      null,

    lat,

    lng,
  };

}

function removeDuplicateDestinations(
  destinations
) {

  const destinationsByLocation =
    new Map();

  for (const destination of destinations) {

    const key = [
      destination.city.toLowerCase(),
      destination.country.toLowerCase(),
      destination.lat.toFixed(4),
      destination.lng.toFixed(4),
    ].join("|");

    if (!destinationsByLocation.has(key)) {

      destinationsByLocation.set(
        key,
        destination
      );

    }

  }

  return Array.from(
    destinationsByLocation.values()
  );

}

async function searchGeoapifyDestinations(
  query
) {

  const normalizedQuery =
    getStringValue(query);

  if (normalizedQuery.length < 2) {

    return {
      success: true,
      message: null,
      code: 204,
      destinations: [],
    };

  }

  const apiKey =
    getGeoapifyApiKey();

  const url =
    new URL(
      GEOAPIFY_AUTOCOMPLETE_URL
    );

  url.search =
    new URLSearchParams({
      text:
        normalizedQuery,

      type:
        "city",

      format:
        "json",

      lang:
        "en",

      limit:
        String(
          GEOAPIFY_RESULT_LIMIT
        ),

      apiKey,
    }).toString();

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      GEOAPIFY_REQUEST_TIMEOUT_MS
    );

  try {

    const response =
      await fetch(url, {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },

        signal:
          controller.signal,
      });

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {

      const error =
        new Error(
          `Geoapify destination search failed with HTTP status ${response.status}.`
        );

      error.status =
        response.status;

      throw error;

    }

    const destinations =
      removeDuplicateDestinations(
        getGeoapifyResults(data)
          .map(mapGeoapifyDestination)
          .filter(Boolean)
      );

    console.log(
      "[DESTINATION:geoapify] Destinations mapped:",
      destinations.length
    );

    return {
      success:
        true,

      message:
        destinations.length > 0
          ? "data retrieved"
          : "No destinations found.",

      code:
        destinations.length > 0
          ? "GEOAPIFY"
          : 204,

      destinations,
    };

  } catch (error) {

    if (error.name === "AbortError") {

      const timeoutError =
        new Error(
          "Geoapify destination search timed out."
        );

      timeoutError.status =
        504;

      timeoutError.code =
        "GEOAPIFY_TIMEOUT";

      throw timeoutError;

    }

    throw error;

  } finally {

    clearTimeout(timeoutId);

  }

}

module.exports = {
  searchGeoapifyDestinations,
};