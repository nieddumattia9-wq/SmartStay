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

function scoreRouteStackDestination(
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

  const candidateType =
    normalizeComparisonText(
      candidate?.type
    );

  let score = 0;

  if (
    requestedCity &&
    candidateCity === requestedCity
  ) {
    score += 120;
  } else if (
    requestedCity &&
    candidateName
      .split(",")[0]
      .trim() === requestedCity
  ) {
    score += 100;
  } else if (
    requestedCity &&
    candidateName.includes(
      requestedCity
    )
  ) {
    score += 65;
  }

  if (
    requestedCountry &&
    candidateCountry ===
      requestedCountry
  ) {
    score += 25;
  } else if (
    requestedCountry.length === 2 &&
    candidateCountry.length === 2 &&
    candidateCountry !==
      requestedCountry
  ) {
    score -= 35;
  }

  if (
    candidateType.includes("city")
  ) {
    score += 10;
  }

  const distanceKm =
    calculateDistanceKm(
      requested.latitude,
      requested.longitude,
      candidate?.lat,
      candidate?.lng
    );

  if (distanceKm !== null) {
    if (distanceKm <= 25) {
      score += 55;
    } else if (
      distanceKm <= 100
    ) {
      score += 20;
    } else if (
      distanceKm > 500
    ) {
      score -= 35;
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

  return ranked[0].score >= 50
    ? ranked[0].destination
    : null;
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
  scoreRouteStackDestination,
  selectRouteStackDestination,
  createRouteStackDestinationResolver,
};
