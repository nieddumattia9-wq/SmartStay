const {
    mapDestinations,
  } = require("../../mappers/destinationMapper");
  
  const {
    mapHotels,
  } = require("../../mappers/hotelMapper");
  
  const {
    ACCOMMODATION_PROVIDER_IDS,
  } = require("../providerRegistry");
  
  const ROUTESTACK_SUPPLIER_NO_RESULTS_CODE =
    204;
  
  function isRouteStackSupplierNoResults(data) {
  
    return (
      data?.success === false &&
      data?.code === ROUTESTACK_SUPPLIER_NO_RESULTS_CODE
    );
  
  }
  
  function getRouteStackCurrency(data, fallbackCurrency = "USD") {
  
    return (
      data.result?.currency ??
      fallbackCurrency ??
      "USD"
    );
  
  }
  
  function getRawHotelsFromRouteStackResponse(data) {
  
    return Array.isArray(data.result?.result)
      ? data.result.result
      : [];
  
  }
  
  function mapRouteStackDestinationResponse(data) {
  
    return {
      success:
        Boolean(data.success),
  
      message:
        data.message ?? null,
  
      code:
        data.code ?? null,
  
      destinations:
        mapDestinations(data.result),
    };
  
  }
  
  function mapRouteStackHotelResponse(data, currency = "USD") {
  
    const rawHotels =
      getRawHotelsFromRouteStackResponse(data);
  
    return mapHotels(
      rawHotels,
      {
        currency,
        sourceProvider:
          ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
      }
    );
  
  }
  
  function createRouteStackFailedSearchResponse(currency = "USD") {
  
    return {
      success:
        false,
  
      message:
        "Hotel supplier could not retrieve results for this search.",
  
      code:
        ROUTESTACK_SUPPLIER_NO_RESULTS_CODE,
  
      searchId:
        null,
  
      status:
        "Failed",
  
      searchIncomplete:
        false,
  
      nextResultsKey:
        null,
  
      currency,
  
      totalHotels:
        0,
  
      hotels:
        [],
    };
  
  }
  
  module.exports = {
    isRouteStackSupplierNoResults,
    getRouteStackCurrency,
    mapRouteStackDestinationResponse,
    mapRouteStackHotelResponse,
    createRouteStackFailedSearchResponse,
  };