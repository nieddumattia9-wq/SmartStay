async function searchDestinationsAcrossProviders(
  query
) {
  const {
    searchGeoapifyDestinations,
  } = require(
    "./geocoding/geoapifyGeocodingClient"
  );

  try {
    const response =
      await searchGeoapifyDestinations(
        query
      );

    console.log(
      "[DESTINATION:selected]",
      {
        providerId:
          "geoapify",

        destinations:
          response.destinations
            ?.length ??
          0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "[DESTINATION] Search failed:",
      error.message
    );

    const unavailableError =
      new Error(
        "No destination search provider is currently available."
      );

    unavailableError.code =
      "DESTINATION_PROVIDER_UNAVAILABLE";

    unavailableError.status =
      error.status ??
      error.response?.status ??
      503;

    throw unavailableError;
  }
}

module.exports = {
  searchDestinationsAcrossProviders,
};
