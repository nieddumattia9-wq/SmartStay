function getStringValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function getNestedValue(source, path) {
  return path.reduce(
    (currentValue, key) => {
      if (
        currentValue === null ||
        currentValue === undefined
      ) {
        return undefined;
      }

      return currentValue[key];
    },
    source
  );
}

function pickFirstValue(source, paths) {
  for (const path of paths) {
    const value =
      getNestedValue(
        source,
        path
      );

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function pickStringValue(source, paths) {
  return getStringValue(
    pickFirstValue(
      source,
      paths
    )
  );
}

function pickNumberValue(source, paths) {
  const value =
    pickFirstValue(
      source,
      paths
    );

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed =
      Number(
        value.replace(",", ".")
      );

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function normalizeChildAges(children) {
  if (!Array.isArray(children)) {
    return [];
  }

  return children
    .map((child) => {
      const rawAge =
        typeof child === "object" &&
        child !== null
          ? child.age
          : child;

      const parsedAge =
        typeof rawAge === "number"
          ? rawAge
          : Number(rawAge);

      if (
        !Number.isFinite(parsedAge) ||
        parsedAge < 0
      ) {
        return null;
      }

      return Math.round(parsedAge);
    })
    .filter(
      (age) =>
        age !== null
    );
}

function normalizeAdults(
  value,
  fallbackValue
) {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return fallbackValue;
  }

  return Math.max(
    1,
    Math.round(parsedValue)
  );
}

function extractDefaultAdults(
  searchData
) {
  const adults =
    pickNumberValue(
      searchData,
      [
        ["adults"],
        ["guests", "adults"],
        ["occupancy", "adults"],
        ["rooms", 0, "adults"],
      ]
    );

  return normalizeAdults(
    adults,
    2
  );
}

function extractDefaultChildAges(
  searchData
) {
  const children =
    pickFirstValue(
      searchData,
      [
        ["children"],
        ["childAges"],
        ["childrenAges"],
        ["guests", "children"],
        ["guests", "childAges"],
        ["guests", "childrenAges"],
        ["occupancy", "children"],
        ["rooms", 0, "children"],
        ["rooms", 0, "childAges"],
        ["rooms", 0, "childrenAges"],
      ]
    );

  return normalizeChildAges(
    children
  );
}

function normalizeRooms(searchData) {
  const rawRooms =
    Array.isArray(searchData?.rooms)
      ? searchData.rooms
      : [];

  if (rawRooms.length === 0) {
    return [
      {
        adults:
          extractDefaultAdults(
            searchData
          ),

        childAges:
          extractDefaultChildAges(
            searchData
          ),
      },
    ];
  }

  return rawRooms.map((room) => {
    const rawChildren =
      room?.childAges ??
      room?.childrenAges ??
      room?.children ??
      [];

    return {
      adults:
        normalizeAdults(
          room?.adults,
          1
        ),

      childAges:
        normalizeChildAges(
          rawChildren
        ),
    };
  });
}

function extractCityName(searchData) {
  const rawDestination =
    pickFirstValue(
      searchData,
      [
        ["cityName"],
        ["city"],
        ["destinationName"],
        ["query"],
        ["destination", "cityName"],
        ["destination", "city"],
        ["destination", "name"],
        ["destination", "label"],
        ["destination", "displayName"],
      ]
    );

  if (
    rawDestination &&
    typeof rawDestination ===
      "object"
  ) {
    return "";
  }

  const destinationText =
    getStringValue(
      rawDestination
    );

  return destinationText
    ? destinationText
        .split(",")[0]
        .trim()
    : "";
}

function extractCountryCode(
  searchData,
  fallbackCountryCode
) {
  const countryCode =
    pickStringValue(
      searchData,
      [
        ["countryCode"],
        ["country"],
        ["destination", "countryCode"],
        ["destination", "country_code"],
        ["destination", "country"],
      ]
    );

  const selectedCode =
    countryCode ||
    fallbackCountryCode ||
    "";

  return selectedCode.length === 2
    ? selectedCode.toUpperCase()
    : "";
}

function extractRadiusMeters(
  searchData,
  fallbackRadiusMeters
) {
  const radius =
    pickNumberValue(
      searchData,
      [
        ["radiusMeters"],
        ["radius"],
        ["searchRadius"],
        ["destination", "radiusMeters"],
        ["destination", "radius"],
      ]
    );

  if (
    radius === null ||
    radius <= 0
  ) {
    return fallbackRadiusMeters;
  }

  return Math.round(radius);
}

function normalizeCurrency(
  searchData,
  fallbackCurrency
) {
  const currency =
    pickStringValue(
      searchData,
      [
        ["currency"],
        ["selectedCurrency"],
      ]
    ) ||
    fallbackCurrency ||
    "EUR";

  return currency
    .trim()
    .toUpperCase();
}

function normalizeContinuation(
  searchData
) {
  const continuation =
    searchData?.continuation;

  if (
    !continuation ||
    typeof continuation !==
      "object" ||
    Array.isArray(continuation)
  ) {
    return null;
  }

  const providerId =
    getStringValue(
      continuation.providerId
    ).toLowerCase();

  if (
    !providerId ||
    continuation.cursor ===
      undefined ||
    continuation.cursor ===
      null
  ) {
    return null;
  }

  return {
    providerId,
    cursor:
      continuation.cursor,
  };
}

function createInvalidSearchRequestError(
  message,
  field
) {
  const error =
    new Error(message);

  error.code =
    "INVALID_SEARCH_REQUEST";

  error.field =
    field;

  return error;
}

function normalizeAccommodationSearchRequest(
  searchData,
  options = {}
) {
  if (
    !searchData ||
    typeof searchData !==
      "object" ||
    Array.isArray(searchData)
  ) {
    throw createInvalidSearchRequestError(
      "Accommodation search data must be an object.",
      "searchData"
    );
  }

  const cityName =
    extractCityName(
      searchData
    );

  const countryCode =
    extractCountryCode(
      searchData,
      options.fallbackCountryCode
    );

  const latitude =
    pickNumberValue(
      searchData,
      [
        ["latitude"],
        ["lat"],
        ["destination", "latitude"],
        ["destination", "lat"],
        ["location", "latitude"],
        ["location", "lat"],
      ]
    );

  const longitude =
    pickNumberValue(
      searchData,
      [
        ["longitude"],
        ["long"],
        ["lng"],
        ["lon"],
        ["destination", "longitude"],
        ["destination", "long"],
        ["destination", "lng"],
        ["destination", "lon"],
        ["location", "longitude"],
        ["location", "long"],
        ["location", "lng"],
        ["location", "lon"],
      ]
    );

  const checkin =
    pickStringValue(
      searchData,
      [
        ["checkin"],
        ["checkIn"],
        ["check_in"],
        ["arrivalDate"],
        ["startDate"],
        ["dates", "checkin"],
        ["dates", "checkIn"],
        ["dates", "startDate"],
      ]
    );

  const checkout =
    pickStringValue(
      searchData,
      [
        ["checkout"],
        ["checkOut"],
        ["check_out"],
        ["departureDate"],
        ["endDate"],
        ["dates", "checkout"],
        ["dates", "checkOut"],
        ["dates", "endDate"],
      ]
    );

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  if (
    !cityName &&
    !hasCoordinates
  ) {
    throw createInvalidSearchRequestError(
      "A destination name or valid coordinates are required.",
      "destination"
    );
  }

  if (!checkin) {
    throw createInvalidSearchRequestError(
      "A check-in date is required.",
      "checkin"
    );
  }

  if (!checkout) {
    throw createInvalidSearchRequestError(
      "A check-out date is required.",
      "checkout"
    );
  }

  return {
    destination: {
      cityName,
      countryCode,

      latitude:
        hasCoordinates
          ? latitude
          : null,

      longitude:
        hasCoordinates
          ? longitude
          : null,

      radiusMeters:
        extractRadiusMeters(
          searchData,
          options.fallbackRadiusMeters ??
            8000
        ),
    },

    stay: {
      checkin,
      checkout,
    },

    rooms:
      normalizeRooms(
        searchData
      ),

    currency:
      normalizeCurrency(
        searchData,
        options.fallbackCurrency
      ),

    continuation:
      normalizeContinuation(
        searchData
      ),
  };
}

module.exports = {
  normalizeChildAges,
  normalizeRooms,
  normalizeAccommodationSearchRequest,
};
