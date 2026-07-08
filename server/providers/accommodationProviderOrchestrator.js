const {
    ACCOMMODATION_PROVIDER_IDS,
    getEnabledAccommodationProviders,
    isAccommodationProviderEnabled,
  } = require("./providerRegistry");
  
  const {
    mergeProviderHotelResults,
  } = require("./common/hotelMergeService");
  
  const {
    searchRouteStackDestinations,
    searchRouteStackHotels,
    getRouteStackHotelDetails,
  } = require("./routeStack/routeStackClient");
  
  const {
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackDestinationResponse,
    mapRouteStackHotelResponse,
    createRouteStackFailedSearchResponse,
  } = require("./routeStack/routeStackProvider");
  
  function createNoProviderAvailableResponse() {
  
    return {
      success: false,
      message: "No accommodation provider is currently available.",
      code: "NO_PROVIDER_AVAILABLE",
      searchId: null,
      status: "Failed",
      searchIncomplete: false,
      nextResultsKey: null,
      currency: "USD",
      totalHotels: 0,
      hotels: [],
    };
  
  }
  
  function getPrimaryAccommodationProvider() {
  
    const providers =
      getEnabledAccommodationProviders();
  
    return providers[0] ?? null;
  
  }
  
  function ensureRouteStackEnabled() {
  
    return isAccommodationProviderEnabled(
      ACCOMMODATION_PROVIDER_IDS.ROUTESTACK
    );
  
  }
  
  async function searchDestinationsAcrossProviders(query) {
  
    if (!ensureRouteStackEnabled()) {
  
      return {
        success: false,
        message: "Destination search provider is not available.",
        code: "NO_DESTINATION_PROVIDER_AVAILABLE",
        destinations: [],
      };
  
    }
  
    const data =
      await searchRouteStackDestinations(query);
  
    return mapRouteStackDestinationResponse(data);
  
  }
  
  async function searchHotelsWithPrimaryProvider({
    searchData,
    title,
    fallbackCurrency = "USD",
  }) {
  
    const primaryProvider =
      getPrimaryAccommodationProvider();
  
    if (!primaryProvider) {
  
      return {
        providerId: null,
        data: null,
        currency: fallbackCurrency,
        hotels: [],
        failedResponse: createNoProviderAvailableResponse(),
      };
  
    }
  
    if (primaryProvider.id !== ACCOMMODATION_PROVIDER_IDS.ROUTESTACK) {
  
      return {
        providerId: primaryProvider.id,
        data: null,
        currency: fallbackCurrency,
        hotels: [],
        failedResponse: {
          ...createNoProviderAvailableResponse(),
          message: "Selected accommodation provider is not implemented yet.",
        },
      };
  
    }
  
    const data =
      await searchRouteStackHotels(
        searchData,
        title
      );
  
    const currency =
      getRouteStackCurrency(
        data,
        fallbackCurrency
      );
  
    if (isRouteStackSupplierNoResults(data)) {
  
      return {
        providerId: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
        data,
        currency,
        hotels: [],
        failedResponse:
          createRouteStackFailedSearchResponse(currency),
      };
  
    }
  
    const routeStackHotels =
      mapRouteStackHotelResponse(
        data,
        currency
      );
  
    const hotels =
      mergeProviderHotelResults(
        routeStackHotels
      );
  
    return {
      providerId: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
      data,
      currency,
      hotels,
      failedResponse: null,
    };
  
  }
  
  async function getHotelDetailsFromProvider({
    sourceProvider,
    hotelId,
    token,
    correlationId,
  }) {
  
    const providerId =
      sourceProvider ??
      ACCOMMODATION_PROVIDER_IDS.ROUTESTACK;
  
    if (providerId !== ACCOMMODATION_PROVIDER_IDS.ROUTESTACK) {
  
      throw new Error(
        `Hotel details are not implemented for provider: ${providerId}`
      );
  
    }
  
    return getRouteStackHotelDetails({
      hotelId,
      token,
      correlationId,
    });
  
  }
  
  module.exports = {
    searchDestinationsAcrossProviders,
    searchHotelsWithPrimaryProvider,
    getHotelDetailsFromProvider,
  };