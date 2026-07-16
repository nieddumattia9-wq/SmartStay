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

function normalizeComparisonText(value) {
  return getStringValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calculateDistanceKm(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude
) {
  const coordinates = [
    firstLatitude,
    firstLongitude,
    secondLatitude,
    secondLongitude,
  ].map(getFiniteNumber);

  if (
    coordinates.some(
      (value) => value === null
    )
  ) {
    return null;
  }

  const [
    latitudeA,
    longitudeA,
    latitudeB,
    longitudeB,
  ] = coordinates;

  const toRadians =
    (degrees) =>
      degrees * Math.PI / 180;

  const latitudeDelta =
    toRadians(
      latitudeB - latitudeA
    );

  const longitudeDelta =
    toRadians(
      longitudeB - longitudeA
    );

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
    Math.cos(toRadians(latitudeB)) *
    Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}

function createRouteStackDestinationQuery(
  request
) {
  const destination =
    request?.destination ?? {};

  return [
    destination.cityName,
    destination.countryCode,
  ]
    .map(getStringValue)
    .filter(Boolean)
    .join(", ");
}

const ROUTESTACK_CITY_LEVEL_TYPES =
  new Set([
    "city",
    "locality",
    "municipality",
    "town",
    "village",
  ]);

const MAX_DESTINATION_DISTANCE_KM =
  35;

const MAX_TRANSLATED_NAME_DISTANCE_KM =
  15;

function normalizeRouteStackDestinationType(
  value
) {
  return normalizeComparisonText(
    value
  ).replace(
    /[^a-z0-9]/g,
    ""
  );
}

function isRouteStackCityLevelDestination(
  candidate
) {
  const candidateType =
    normalizeRouteStackDestinationType(
      candidate?.type
    );

  return ROUTESTACK_CITY_LEVEL_TYPES
    .has(candidateType);
}

function getRouteStackDestinationMatchInfo(
  candidate,
  request
) {
  const requested =
    request?.destination ?? {};

  const requestedCity =
    normalizeComparisonText(
      requested.cityName
    );

  const requestedCountry =
    normalizeComparisonText(
      requested.countryCode
    );

  const candidateCity =
    normalizeComparisonText(
      candidate?.city
    );

  const candidateName =
    normalizeComparisonText(
      candidate?.name
    );

  const candidateCountry =
    normalizeComparisonText(
      candidate?.country
    );

  const firstNamePart =
    candidateName
      .split(",")[0]
      .trim();

  const exactCityMatch =
    Boolean(
      requestedCity &&
      candidateCity === requestedCity
    );

  const exactNameMatch =
    Boolean(
      requestedCity &&
      firstNamePart === requestedCity
    );

  const partialNameMatch =
    Boolean(
      requestedCity &&
      candidateName.includes(
        requestedCity
      )
    );

  const textMatch =
    exactCityMatch ||
    exactNameMatch ||
    partialNameMatch;

  const countryMatch =
    Boolean(
      requestedCountry &&
      candidateCountry ===
        requestedCountry
    );

  const countryConflict =
    Boolean(
      requestedCountry.length === 2 &&
      candidateCountry.length === 2 &&
      candidateCountry !==
        requestedCountry
    );

  const distanceKm =
    calculateDistanceKm(
      requested.latitude,
      requested.longitude,
      candidate?.lat,
      candidate?.lng
    );

  return {
    requestedCity,
    exactCityMatch,
    exactNameMatch,
    partialNameMatch,
    textMatch,
    countryMatch,
    countryConflict,
    distanceKm,
  };
}

function isRouteStackDestinationEligible(
  candidate,
  request
) {
  if (
    !isRouteStackCityLevelDestination(
      candidate
    )
  ) {
    return false;
  }

  const matchInfo =
    getRouteStackDestinationMatchInfo(
      candidate,
      request
    );

  if (matchInfo.countryConflict) {
    return false;
  }

  if (
    matchInfo.distanceKm !== null &&
    matchInfo.distanceKm >
      MAX_DESTINATION_DISTANCE_KM
  ) {
    return false;
  }

  if (!matchInfo.requestedCity) {
    return (
      matchInfo.distanceKm !== null &&
      matchInfo.distanceKm <=
        MAX_DESTINATION_DISTANCE_KM
    );
  }

  if (matchInfo.textMatch) {
    return true;
  }

  return (
    matchInfo.distanceKm !== null &&
    matchInfo.distanceKm <=
      MAX_TRANSLATED_NAME_DISTANCE_KM
  );
}

function scoreRouteStackDestination(
  candidate,
  request
) {
  if (
    !isRouteStackDestinationEligible(
      candidate,
      request
    )
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  const matchInfo =
    getRouteStackDestinationMatchInfo(
      candidate,
      request
    );

  const candidateType =
    normalizeRouteStackDestinationType(
      candidate?.type
    );

  let score =
    0;

  if (candidateType === "city") {
    score += 90;
  } else if (
    candidateType === "municipality" ||
    candidateType === "locality"
  ) {
    score += 80;
  } else {
    score += 70;
  }

  if (matchInfo.exactCityMatch) {
    score += 140;
  } else if (
    matchInfo.exactNameMatch
  ) {
    score += 120;
  } else if (
    matchInfo.partialNameMatch
  ) {
    score += 50;
  }

  if (matchInfo.countryMatch) {
    score += 30;
  }

  if (matchInfo.distanceKm !== null) {
    if (matchInfo.distanceKm <= 5) {
      score += 100;
    } else if (
      matchInfo.distanceKm <= 15
    ) {
      score += 70;
    } else {
      score += 25;
    }
  }

  return score;
}

function selectRouteStackDestination(
  destinations,
  request
) {
  if (
    !Array.isArray(destinations) ||
    destinations.length === 0
  ) {
    return null;
  }

  const ranked =
    destinations
      .map(
        (
          destination,
          index
        ) => ({
          destination,
          index,

          score:
            scoreRouteStackDestination(
              destination,
              request
            ),
        })
      )
      .filter(
        (candidate) =>
          Number.isFinite(
            candidate.score
          )
      )
      .sort(
        (
          first,
          second
        ) => (
          second.score -
          first.score ||
          first.index -
          second.index
        )
      );

  if (
    ranked.length === 0 ||
    ranked[0].score < 100
  ) {
    return null;
  }

  return ranked[0].destination;
}
function createResolverError({
  message,
  code,
  status = 502,
} = {}) {
  const error =
    new Error(
      message ??
      "RouteStack destination resolution failed."
    );

  error.code =
    code ??
    "ROUTESTACK_DESTINATION_RESOLUTION_FAILED";

  error.status =
    Number.isFinite(status)
      ? status
      : 502;

  return error;
}

function createRouteStackDestinationResolver({
  searchRouteStackDestinations,
  mapRouteStackDestinationResponse,
} = {}) {
  const dependencies = {
    searchRouteStackDestinations,
    mapRouteStackDestinationResponse,
  };

  for (
    const [
      dependencyName,
      dependencyValue,
    ] of Object.entries(
      dependencies
    )
  ) {
    if (
      typeof dependencyValue !==
        "function"
    ) {
      throw new Error(
        `RouteStack destination resolver dependency "${dependencyName}" must be a function.`
      );
    }
  }

  return async function resolveRouteStackDestination({
    request,
    signal,
  } = {}) {
    const query =
      createRouteStackDestinationQuery(
        request
      );

    if (!query) {
      throw createResolverError({
        message:
          "RouteStack requires a destination city.",

        code:
          "ROUTESTACK_DESTINATION_REQUIRED",

        status:
          400,
      });
    }

    const rawData =
      await searchRouteStackDestinations(
        query,
        {
          signal,
        }
      );

    const mappedResponse =
      mapRouteStackDestinationResponse(
        rawData
      );

    if (
      mappedResponse.success ===
        false &&
      mappedResponse.code !== 204 &&
      mappedResponse.code !== "204"
    ) {
      throw createResolverError({
        message:
          mappedResponse.message ??
          "RouteStack destination search failed.",

        code:
          "ROUTESTACK_DESTINATION_SEARCH_FAILED",
      });
    }

    return {
      query,
      rawData,

      destination:
        selectRouteStackDestination(
          mappedResponse.destinations,
          request
        ),
    };
  };
}

module.exports = {
  getStringValue,
  calculateDistanceKm,
  createRouteStackDestinationQuery,
  isRouteStackCityLevelDestination,
  isRouteStackDestinationEligible,
  scoreRouteStackDestination,
  selectRouteStackDestination,
  createRouteStackDestinationResolver,
};
