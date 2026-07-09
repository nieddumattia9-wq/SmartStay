const ACCOMMODATION_PROVIDER_IDS = {
    ROUTESTACK: "routestack",
    RATEHAWK: "ratehawk",
    LITE_API: "liteapi",
  };
  
  const PROVIDER_STATUSES = {
    ACTIVE: "active",
    CANDIDATE: "candidate",
    DISABLED: "disabled",
  };
  
  const PROVIDER_ROLES = {
    PRIMARY_SEARCH_PROVIDER: "primary_search_provider",
    SECONDARY_OFFER_PROVIDER: "secondary_offer_provider",
    ALTERNATIVE_OFFER_PROVIDER: "alternative_offer_provider",
    ENRICHMENT_PROVIDER: "enrichment_provider",
  };
  
  const accommodationProviders = [
    {
      id: ACCOMMODATION_PROVIDER_IDS.ROUTESTACK,
  
      name: "RouteStack",
  
      enabled: true,
  
      priority: 1,
  
      status: PROVIDER_STATUSES.ACTIVE,
  
      role: PROVIDER_ROLES.PRIMARY_SEARCH_PROVIDER,
  
      notes:
        "Current active provider. Supports asynchronous hotel search and real availability, but review score and review count are not available in search results.",
  
      capabilities: {
        searchDestinations: true,
        searchHotels: true,
        continueHotelSearch: true,
        hotelDetails: true,
  
        synchronousSearch: false,
        asynchronousSearch: true,
  
        reviewsInSearch: false,
        reviewCountInSearch: false,
        cancellationInSearch: false,
        taxesInSearch: false,
        roomDetailsInSearch: false,
  
        multipleOffersPerHotel: false,
  
        bookingRedirect: false,
        bookingFormRedirect: false,
        bookingApi: false,
  
        temporaryCachingAllowed: false,
        temporaryCachingMaxMinutes: null,
  
        requiresManagerApproval: false,
        requiresCertification: false,
        requiresDisplayCompliance: false,
      },
    },
  
    {
      id: ACCOMMODATION_PROVIDER_IDS.RATEHAWK,
  
      name: "RateHawk / ZenHotels",
  
      enabled: false,
  
      priority: 2,
  
      status: PROVIDER_STATUSES.CANDIDATE,
  
      role: PROVIDER_ROLES.SECONDARY_OFFER_PROVIDER,
  
      notes:
        "Candidate provider. Supports custom frontend, real-time prices, synchronous search, ZenHotels redirect and booking form redirect through book_hash. Requires registration, manager approval, sandbox API key, best practices and pre-certification checklist.",
  
      capabilities: {
        searchDestinations: true,
        searchHotels: true,
        continueHotelSearch: false,
        hotelDetails: true,
  
        synchronousSearch: true,
        asynchronousSearch: false,
  
        reviewsInSearch: false,
        reviewCountInSearch: false,
        cancellationInSearch: true,
        taxesInSearch: true,
        roomDetailsInSearch: true,
  
        multipleOffersPerHotel: true,
  
        bookingRedirect: true,
        bookingFormRedirect: true,
        bookingApi: true,
  
        temporaryCachingAllowed: true,
        temporaryCachingMaxMinutes: 30,
  
        requiresManagerApproval: true,
        requiresCertification: true,
        requiresDisplayCompliance: true,
      },
    },
  
    {
      id: ACCOMMODATION_PROVIDER_IDS.LITE_API,
  
      name: "LiteAPI",
  
      enabled: false,
  
      priority: 3,
  
      status: PROVIDER_STATUSES.CANDIDATE,
  
      role: PROVIDER_ROLES.ALTERNATIVE_OFFER_PROVIDER,
  
      notes:
        "Candidate provider to evaluate for MVP expansion. Potentially useful for hotel search, reviews, hotel details, deeplinks and booking flow. Needs technical validation before activation.",
  
      capabilities: {
        searchDestinations: true,
        searchHotels: true,
        continueHotelSearch: false,
        hotelDetails: true,
  
        synchronousSearch: true,
        asynchronousSearch: false,
  
        reviewsInSearch: true,
        reviewCountInSearch: true,
        cancellationInSearch: true,
        taxesInSearch: true,
        roomDetailsInSearch: true,
  
        multipleOffersPerHotel: true,
  
        bookingRedirect: true,
        bookingFormRedirect: false,
        bookingApi: true,
  
        temporaryCachingAllowed: true,
        temporaryCachingMaxMinutes: null,
  
        requiresManagerApproval: false,
        requiresCertification: false,
        requiresDisplayCompliance: true,
      },
    },
  ];
  
  function sortProvidersByPriority(providers) {
  
    return [...providers]
      .sort((firstProvider, secondProvider) => (
        firstProvider.priority -
        secondProvider.priority
      ));
  
  }
  
  function getAccommodationProviders() {
  
    return sortProvidersByPriority(
      accommodationProviders
    );
  
  }
  
  function getEnabledAccommodationProviders() {
  
    return sortProvidersByPriority(
      accommodationProviders.filter((provider) =>
        provider.enabled
      )
    );
  
  }
  
  function getCandidateAccommodationProviders() {
  
    return sortProvidersByPriority(
      accommodationProviders.filter((provider) => (
        provider.status === PROVIDER_STATUSES.CANDIDATE
      ))
    );
  
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
  
  function getProviderCapabilities(providerId) {
  
    const provider =
      getAccommodationProviderById(providerId);
  
    return provider?.capabilities ?? null;
  
  }
  
  function providerSupportsCapability(
    providerId,
    capabilityName
  ) {
  
    const capabilities =
      getProviderCapabilities(providerId);
  
    if (!capabilities) {
  
      return false;
  
    }
  
    return Boolean(
      capabilities[capabilityName]
    );
  
  }
  
  function getAccommodationProvidersByCapability(
    capabilityName,
    options = {}
  ) {
  
    const enabledOnly =
      options.enabledOnly ?? false;
  
    const providers =
      enabledOnly
        ? getEnabledAccommodationProviders()
        : getAccommodationProviders();
  
    return providers.filter((provider) =>
      Boolean(provider.capabilities?.[capabilityName])
    );
  
  }
  
  module.exports = {
    ACCOMMODATION_PROVIDER_IDS,
    PROVIDER_STATUSES,
    PROVIDER_ROLES,
    getAccommodationProviders,
    getEnabledAccommodationProviders,
    getCandidateAccommodationProviders,
    getAccommodationProviderById,
    isAccommodationProviderEnabled,
    getProviderCapabilities,
    providerSupportsCapability,
    getAccommodationProvidersByCapability,
  };