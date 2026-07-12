const {
  createDestinationSuccessResult,
  createDestinationNoResultsResult,
} = require(
  "../common/destinationSearchResult"
);

const PROVIDER_ID =
  "geoapify";

function normalizeDestinationQuery(
  query
) {
  if (
    typeof query !== "string"
  ) {
    return "";
  }

  return query.trim();
}

function loadDefaultDependencies() {
  const {
    searchGeoapifyDestinations,
  } = require(
    "./geoapifyGeocodingClient"
  );

  return {
    searchGeoapifyDestinations,
  };
}

function createGeoapifyDestinationAdapter(
  dependencies
) {
  const resolvedDependencies =
    dependencies ??
    loadDefaultDependencies();

  const {
    searchGeoapifyDestinations,
  } = resolvedDependencies;

  if (
    typeof searchGeoapifyDestinations !==
    "function"
  ) {
    throw new Error(
      'Geoapify adapter dependency "searchGeoapifyDestinations" must be a function.'
    );
  }

  return {
    providerId:
      PROVIDER_ID,

    async searchDestinations({
      query,
    } = {}) {
      const normalizedQuery =
        normalizeDestinationQuery(
          query
        );

      if (!normalizedQuery) {
        const error =
          new Error(
            "A destination search query is required."
          );

        error.code =
          "INVALID_DESTINATION_QUERY";

        error.status =
          400;

        throw error;
      }

      const response =
        await searchGeoapifyDestinations(
          normalizedQuery
        );

      const destinations =
        Array.isArray(
          response?.destinations
        )
          ? response.destinations
          : [];

      if (
        destinations.length === 0
      ) {
        return createDestinationNoResultsResult({
          providerId:
            PROVIDER_ID,

          rawData:
            response ?? null,

          message:
            response?.message ??
            "No matching destinations were found.",
        });
      }

      console.log(
        "[PROVIDER:geoapify] Destinations mapped:",
        destinations.length
      );

      return createDestinationSuccessResult({
        providerId:
          PROVIDER_ID,

        destinations,

        rawData:
          response ?? null,

        message:
          response?.message ??
          "Destinations retrieved successfully.",
      });
    },
  };
}

async function loadGeoapifyDestinationAdapter() {
  return createGeoapifyDestinationAdapter();
}

module.exports = {
  PROVIDER_ID,
  normalizeDestinationQuery,
  createGeoapifyDestinationAdapter,
  loadGeoapifyDestinationAdapter,
};
