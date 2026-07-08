function toNumber(value, fallback = null) {

    const number =
      Number(value);
  
    return Number.isFinite(number)
      ? number
      : fallback;
  
  }
  
  function toString(value, fallback = "") {
  
    if (
      value === null ||
      value === undefined
    ) {
  
      return fallback;
  
    }
  
    return String(value);
  
  }
  
  function getNestedValue(source, path) {
  
    return path
      .split(".")
      .reduce((currentValue, key) => {
  
        if (
          currentValue === null ||
          currentValue === undefined
        ) {
  
          return undefined;
  
        }
  
        return currentValue[key];
  
      }, source);
  
  }
  
  function getFirstDefinedValue(source, paths) {
  
    for (const path of paths) {
  
      const value =
        getNestedValue(source, path);
  
      if (
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
  
        return value;
  
      }
  
    }
  
    return undefined;
  
  }
  
  function normalizeFacilities(facilities = []) {
  
    if (!Array.isArray(facilities)) {
  
      return [];
  
    }
  
    return facilities
      .map((facility) => {
  
        if (typeof facility === "string") {
  
          return facility;
  
        }
  
        return facility?.name ?? null;
  
      })
      .filter(Boolean);
  
  }
  
  function normalizeAmenities(mainAmenity) {
  
    if (Array.isArray(mainAmenity)) {
  
      return mainAmenity
        .map((amenity) => toString(amenity, ""))
        .filter(Boolean);
  
    }
  
    if (typeof mainAmenity === "string") {
  
      return [mainAmenity]
        .filter(Boolean);
  
    }
  
    return [];
  
  }
  
  const reviewScorePaths = [
    "reviews.rating",
    "reviews.score",
    "reviews.average",
    "reviews.averageRating",
    "reviews.guestRating",
    "review.rating",
    "review.score",
    "review.average",
    "guestRating",
    "guestReviewScore",
    "reviewScore",
    "reviewRating",
    "hotelReviewScore",
  ];
  
  const reviewCountPaths = [
    "reviews.count",
    "reviews.total",
    "reviews.reviewCount",
    "reviews.totalCount",
    "review.count",
    "review.total",
    "review.reviewCount",
    "guestReviewCount",
    "reviewCount",
    "reviewsCount",
    "numberOfReviews",
    "totalReviews",
    "hotelReviewsCount",
  ];
  
  const reviewTextPaths = [
    "reviewText",
    "reviews.text",
    "reviews.label",
    "reviews.description",
    "review.text",
    "review.label",
  ];
  
  function createAvailableData(mappedHotel) {
  
    return {
      hasPrice:
        mappedHotel.price > 0,
  
      hasBasePrice:
        mappedHotel.basePrice > 0,
  
      hasSaving:
        mappedHotel.saving > 0,
  
      hasStars:
        mappedHotel.stars > 0,
  
      hasReviewScore:
        mappedHotel.reviewScore !== null,
  
      hasReviewCount:
        mappedHotel.reviewCount !== null &&
        mappedHotel.reviewCount > 0,
  
      hasDistance:
        mappedHotel.distance !== null,
  
      hasImage:
        Boolean(mappedHotel.image),
  
      hasAddress:
        Boolean(mappedHotel.address),
  
      hasCoordinates:
        mappedHotel.latitude !== null &&
        mappedHotel.longitude !== null,
  
      hasAmenities:
        mappedHotel.amenities.length > 0 ||
        mappedHotel.facilities.length > 0,
    };
  
  }
  
  function calculateDataConfidence(availableData) {
  
    const availableSignals =
      Object.values(availableData)
        .filter(Boolean)
        .length;
  
    const hasReviewData =
      availableData.hasReviewScore &&
      availableData.hasReviewCount;
  
    if (
      hasReviewData &&
      availableSignals >= 8
    ) {
  
      return "full";
  
    }
  
    if (availableSignals >= 5) {
  
      return "partial";
  
    }
  
    return "limited";
  
  }

  function createPrimaryOffer(mappedHotel, sourceProvider) {

    return {
      id:
        `${sourceProvider}:${mappedHotel.sourceHotelId}:primary`,
  
      provider:
        mappedHotel.provider || sourceProvider,
  
      sourceProvider,
  
      price:
        mappedHotel.price,
  
      basePrice:
        mappedHotel.basePrice,
  
      saving:
        mappedHotel.saving,
  
      currency:
        mappedHotel.currency,
  
      cancellationPolicy:
        null,
  
      taxesIncluded:
        null,
  
      roomName:
        null,
  
      deepLink:
        null,
    };
  
  }
  
  function mapHotel(hotel = {}, options = {}) {
  
    const currency =
      hotel.currency ??
      options.currency ??
      "USD";
  
    const sourceProvider =
      options.sourceProvider ??
      "routestack";
  
    const sourceHotelId =
      toString(
        hotel.id ??
        hotel.hotelId
      );
  
    const reviewScore =
      getFirstDefinedValue(
        hotel,
        reviewScorePaths
      );
  
    const reviewCount =
      getFirstDefinedValue(
        hotel,
        reviewCountPaths
      );
  
    const reviewText =
      getFirstDefinedValue(
        hotel,
        reviewTextPaths
      );
  
    const mappedHotel = {
  
      id:
        `${sourceProvider}:${sourceHotelId}`,
  
      sourceProvider,
  
      sourceHotelId,
  
      dataSources: [
        sourceProvider,
      ],
  
      name: toString(
        hotel.name
      ),
  
      provider: toString(
        hotel.providerName,
        sourceProvider
      ),
  
      stars: toNumber(
        hotel.starRating,
        0
      ),
  
      reviewScore: toNumber(
        reviewScore,
        null
      ),
  
      reviewCount: toNumber(
        reviewCount,
        null
      ),
  
      reviewText: toString(
        reviewText,
        ""
      ),
  
      price: toNumber(
        hotel.ourprice,
        0
      ),
  
      basePrice: toNumber(
        hotel.baseprice,
        0
      ),
  
      saving: toNumber(
        hotel.saving,
        0
      ),
  
      currency: toString(
        currency,
        "USD"
      ),
  
      distance: toNumber(
        hotel.distance,
        null
      ),
  
      image: toString(
        hotel.heroImage,
        ""
      ),
  
      address: toString(
        hotel.contact?.address?.line1
      ),
  
      city: toString(
        hotel.contact?.address?.city?.name
      ),
  
      country: toString(
        hotel.contact?.address?.country?.code ??
        hotel.contact?.address?.country?.name
      ),
  
      latitude: toNumber(
        hotel.location?.latitude ??
        hotel.coordinates?.lat,
        null
      ),
  
      longitude: toNumber(
        hotel.location?.longitude ??
        hotel.coordinates?.long ??
        hotel.coordinates?.lng,
        null
      ),
  
      amenities: normalizeAmenities(
        hotel.mainamenity
      ),
  
      facilities: normalizeFacilities(
        hotel.facilities
      ),
  
    };
  
    const availableData =
      createAvailableData(mappedHotel);
  
    const dataConfidence =
      calculateDataConfidence(availableData);
  
    const offers = [
      createPrimaryOffer(
        mappedHotel,
        sourceProvider
      ),
    ];
  
    return {
      ...mappedHotel,
  
      availableData,
  
      dataConfidence,
  
      offers,
    };
  
  }
  
  function mapHotels(hotels = [], options = {}) {
  
    if (!Array.isArray(hotels)) {
  
      return [];
  
    }
  
    return hotels
      .map((hotel) => mapHotel(
        hotel,
        {
          ...options,
          sourceProvider:
            options.sourceProvider ??
            "routestack",
        }
      ))
      .filter((hotel) => (
        hotel.sourceHotelId &&
        hotel.name
      ));
  
  }
  
  module.exports = {
    mapHotel,
    mapHotels,
  };