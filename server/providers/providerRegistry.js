const ACCOMMODATION_PROVIDER_IDS = {
    ROUTESTACK: "routestack",
  };
  
  const accommodationProviders = [
    {
      id: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
  
      name: "RouteStack",
  
      enabled: true,
  
      priority: 1,
  
      capabilities: {
        searchDestinations: true,
        searchHotels: true,
        continueHotelSearch: true,
        hotelDetails: true,
        reviewsInSearch: false,
        cancellationInSearch: false,
        multipleOffersPerHotel: false,
      },
    },
  ];
  
  function getEnabledAccommodationProviders() {
  
    return accommodationProviders
      .filter((provider) => provider.enabled)
      .sort((firstProvider, secondProvider) => (
        firstProvider.priority -
        secondProvider.priority
      ));
  
  }
  
  function getAccommodationProviderById(providerId) {
  
    return accommodationProviders
      .find((provider) => provider.id === providerId) ??
      null;
  
  }
  
  function isAccommodationProviderEnabled(providerId) {
  
    const provider =
      getAccommodationProviderById(providerId);
  
    return Boolean(
      provider?.enabled
    );
  
  }
  
  module.exports = {
    ACCOMMODATION_PROVIDER_IDS,
    getEnabledAccommodationProviders,
    getAccommodationProviderById,
    isAccommodationProviderEnabled,
  };