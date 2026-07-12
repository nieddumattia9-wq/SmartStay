const {
    ACCOMMODATION_PROVIDER_IDS,
  } = require("../providerRegistry");
  
  const {
  createLiteApiOffer:
    createMappedLiteApiOffer,

  getLiteApiOfferRecords,
} = require("./liteApiOfferMapper");
const SOURCE_PROVIDER = ACCOMMODATION_PROVIDER_IDS.LITE_API;
  const PROVIDER_NAME = "LiteAPI";

function createLiteApiOfferFromMapper(
  options
) {
  return createMappedLiteApiOffer({
    ...options,

    sourceProvider:
      SOURCE_PROVIDER,

    providerName:
      PROVIDER_NAME,
  });
}
  
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  
  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }
  
  function asString(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
  }
  
  function asNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
  
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) ? parsed : null;
    }
  
    if (Array.isArray(value)) {
      const numbers = value.map(asNumber).filter((number) => number !== null);
      return numbers.length > 0 ? numbers[0] : null;
    }
  
    if (isPlainObject(value)) {
      return asNumber(value.amount ?? value.value ?? value.total ?? value.price);
    }
  
    return null;
  }
  
  function asBooleanOrNull(value) {
    if (typeof value === "boolean") return value;
  
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
  
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
  
    return null;
  }
  
  function getValueByPath(source, path) {
    return path.reduce((currentValue, key) => {
      if (currentValue === null || currentValue === undefined) {
        return undefined;
      }
  
      return currentValue[key];
    }, source);
  }
  
  function pickFirst(source, paths) {
    for (const path of paths) {
      const value = getValueByPath(source, path);
  
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
  
    return null;
  }
  
  function pickString(source, paths) {
    return asString(pickFirst(source, paths));
  }
  
  function pickNumber(source, paths) {
    return asNumber(pickFirst(source, paths));
  }
  
  function pickArray(source, paths) {
    return asArray(pickFirst(source, paths));
  }
  
  function calculateSavingPercent(price, basePrice) {
    if (!price || !basePrice || basePrice <= price) return 0;
  
    const saving = ((basePrice - price) / basePrice) * 100;
  
    if (!Number.isFinite(saving) || saving <= 0 || saving > 80) {
      return 0;
    }
  
    return Number(saving.toFixed(2));
  }
  
  function getPricePaths() {
    return [
      ["offerRetailRate", "amount"],
      ["offerRetailRate"],
      ["retailRate", "total", 0, "amount"],
      ["retailRate", "total", "amount"],
      ["retailRate", "amount"],
      ["retailRate", "suggestedSellingPrice", 0, "amount"],
      ["retailRate", "initialPrice", 0, "amount"],
      ["price", "amount"],
      ["price"],
      ["amount"],
      ["total"],
      ["totalPrice"],
      ["sellingPrice"],
      ["suggestedSellingPrice"],
      ["netPrice"],
    ];
  }
  
  function hasUsableRatePrice(record) {
    const price = pickNumber(record, getPricePaths());
    return price !== null && price > 0;
  }
  
  function extractRecords(data) {
    if (Array.isArray(data)) return data;
    if (!isPlainObject(data)) return [];
  
    const candidates = [
      data.data,
      data.data?.rates,
      data.data?.results,
      data.data?.items,
      data.data?.hotels,
      data.rates,
      data.results,
      data.items,
      data.hotels,
      data.response,
    ];
  
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
  
      if (isPlainObject(candidate)) {
        const nestedCandidates = [
          candidate.rates,
          candidate.results,
          candidate.items,
          candidate.hotels,
          candidate.data,
        ];
  
        for (const nestedCandidate of nestedCandidates) {
          if (Array.isArray(nestedCandidate)) return nestedCandidate;
        }
      }
    }
  
    return [];
  }
  
  function extractHotelDataRecords(data) {
    if (!isPlainObject(data)) return [];
  
    const candidates = [
      data.hotels,
      data.hotelData,
      data.hotelsData,
      data.hotelDetails,
      data.details,
      data.staticData,
      data.data?.hotels,
    ];
  
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
  
      if (isPlainObject(candidate)) {
        const nestedCandidates = [
          candidate.hotels,
          candidate.data,
          candidate.items,
          candidate.results,
        ];
  
        for (const nestedCandidate of nestedCandidates) {
          if (Array.isArray(nestedCandidate)) return nestedCandidate;
        }
  
        const objectValues = Object.values(candidate).filter(isPlainObject);
  
        if (objectValues.length > 0) return objectValues;
      }
    }
  
    return [];
  }
  
  function getHotelObject(record) {
    if (!isPlainObject(record)) return {};
  
    const hotel =
      record.hotel ??
      record.hotelData ??
      record.hotelInfo ??
      record.property ??
      record.accommodation;
  
    return isPlainObject(hotel) ? hotel : record;
  }
  
  function getLiteApiHotelId(record, hotel) {
    return (
      pickString(record, [
        ["hotelId"],
        ["hotelID"],
        ["hotel_id"],
        ["id"],
        ["hotel", "id"],
        ["hotel", "hotelId"],
        ["hotelData", "id"],
        ["hotelData", "hotelId"],
      ]) ||
      pickString(hotel, [
        ["hotelId"],
        ["hotelID"],
        ["hotel_id"],
        ["id"],
        ["code"],
      ])
    );
  }
  
  function getLiteApiHotelName(record, hotel) {
    return (
      pickString(hotel, [
        ["name"],
        ["hotelName"],
        ["title"],
      ]) ||
      pickString(record, [
        ["name"],
        ["hotelName"],
        ["title"],
        ["hotel", "name"],
        ["hotel", "hotelName"],
        ["hotelData", "name"],
        ["hotelData", "hotelName"],
      ]) ||
      "Unnamed hotel"
    );
  }
  
  function getLiteApiCurrency(data, fallbackCurrency = "EUR") {
    if (!data || typeof data !== "object") return fallbackCurrency;
  
    return (
      pickString(data, [
        ["currency"],
        ["data", "currency"],
        ["result", "currency"],
        ["hotels", 0, "currency"],
        ["hotels", 0, "rates", 0, "currency"],
        ["hotels", 0, "rates", 0, "retailRate", "currency"],
        ["hotels", 0, "rates", 0, "retailRate", "total", 0, "currency"],
        ["data", 0, "currency"],
        ["data", 0, "rates", 0, "currency"],
        ["data", 0, "rates", 0, "retailRate", "currency"],
        ["data", 0, "rates", 0, "retailRate", "total", 0, "currency"],
        ["data", 0, "roomTypes", 0, "rates", 0, "retailRate", "total", 0, "currency"],
      ]) ||
      fallbackCurrency ||
      "EUR"
    );
  }
  
  function createHotelDataIndex(data) {
    const index = new Map();
    const records = extractHotelDataRecords(data);
  
    for (const record of records) {
      const hotel = getHotelObject(record);
      const hotelId = getLiteApiHotelId(record, hotel);
  
      if (hotelId) {
        index.set(String(hotelId), hotel);
      }
    }
  
    return index;
  }
  
  function mergeRateWithRoomData(room, rate, index) {
    const roomName =
      pickString(rate, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["name"],
      ]) ||
      pickString(room, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["name"],
      ]);
  
    const boardName =
      pickString(rate, [
        ["boardName"],
        ["board"],
      ]) ||
      pickString(room, [
        ["boardName"],
        ["board"],
      ]);
  
    return {
      ...room,
      ...rate,
      roomName,
      roomTypeName: roomName,
      boardName,
      offerId:
        pickString(room, [["offerId"]]) ||
        pickString(rate, [["offerId"]]),
      rateId:
        pickString(rate, [
          ["rateId"],
          ["id"],
          ["rateToken"],
        ]) ||
        pickString(room, [
          ["offerId"],
          ["roomTypeId"],
          ["id"],
        ]) ||
        `rate_${index + 1}`,
    };
  }
  
  function getNestedRateCandidates(room) {
    return [
      room.rates,
      room.rate,
      room.offers,
      room.availableRates,
      room.roomRates,
    ];
  }
  
  function getRateRecords(record) {
    if (!isPlainObject(record)) return [];
  
    const collectedRates = [];
  
    const roomCandidates = [
      record.roomTypes,
      record.rooms,
      record.roomRates,
      record.availableRooms,
      record.offers,
    ];
  
    for (const roomCandidate of roomCandidates) {
      const rooms = asArray(roomCandidate);
  
      for (const room of rooms) {
        if (!isPlainObject(room)) continue;

        /*
         * LiteAPI groups all requested occupancies inside one
         * roomType offer. offerRetailRate is the total price for
         * every room in that offer.
         */
        if (hasUsableRatePrice(room)) {
          collectedRates.push(
            mergeRateWithRoomData(
              {},
              room,
              collectedRates.length
            )
          );

          continue;
        }
  
        const nestedRateCandidates =
          getNestedRateCandidates(room);
  
        for (
          const nestedRateCandidate
          of nestedRateCandidates
        ) {
          const rates =
            asArray(nestedRateCandidate);
  
          for (const rate of rates) {
            if (
              !isPlainObject(rate) ||
              !hasUsableRatePrice(rate)
            ) {
              continue;
            }
  
            collectedRates.push(
              mergeRateWithRoomData(
                room,
                rate,
                collectedRates.length
              )
            );
          }
        }
      }
    }
  
    const directRateCandidates = [
      record.rates,
      record.rate,
      record.availableRates,
      record.roomRates,
    ];
  
    for (
      const directRateCandidate
      of directRateCandidates
    ) {
      const rates =
        asArray(directRateCandidate);
  
      for (const rate of rates) {
        if (
          isPlainObject(rate) &&
          hasUsableRatePrice(rate)
        ) {
          collectedRates.push(
            mergeRateWithRoomData(
              {},
              rate,
              collectedRates.length
            )
          );
        }
      }
    }
  
    if (
      collectedRates.length === 0 &&
      hasUsableRatePrice(record)
    ) {
      collectedRates.push(
        mergeRateWithRoomData(
          {},
          record,
          collectedRates.length
        )
      );
    }
  
    return collectedRates;
  }
  
  function getImageUrlFromImage(image) {
    if (typeof image === "string") return image;
    if (!isPlainObject(image)) return "";
  
    return (
      asString(image.url) ||
      asString(image.uri) ||
      asString(image.link) ||
      asString(image.href)
    );
  }
  
  function getPrimaryImage(record, hotel) {
    const imageCandidates = [
      ...pickArray(hotel, [["images"]]),
      ...pickArray(hotel, [["photos"]]),
      ...pickArray(hotel, [["gallery"]]),
      ...pickArray(record, [["images"]]),
      ...pickArray(record, [["photos"]]),
      ...pickArray(record, [["gallery"]]),
    ];
  
    for (const image of imageCandidates) {
      const imageUrl = getImageUrlFromImage(image);
  
      if (imageUrl) return imageUrl;
    }
  
    return (
      pickString(hotel, [
        ["mainImage"],
        ["mainPhoto"],
        ["thumbnail"],
        ["image"],
        ["imageUrl"],
        ["main_photo"],
      ]) ||
      pickString(record, [
        ["mainImage"],
        ["mainPhoto"],
        ["thumbnail"],
        ["image"],
        ["imageUrl"],
        ["main_photo"],
      ])
    );
  }

  function getAmenities(record, hotel) {
    const values = [
      ...pickArray(hotel, [["amenities"]]),
      ...pickArray(hotel, [["facilities"]]),
      ...pickArray(hotel, [["hotelFacilities"]]),
      ...pickArray(record, [["amenities"]]),
      ...pickArray(record, [["facilities"]]),
      ...pickArray(record, [["hotelFacilities"]]),
    ];
  
    return [
      ...new Set(
        values
          .map((item) => {
            if (typeof item === "string") return item.trim();
  
            if (isPlainObject(item)) {
              return (
                asString(item.name) ||
                asString(item.title) ||
                asString(item.description)
              );
            }
  
            return "";
          })
          .filter(Boolean)
      ),
    ];
  }
  
  function getCancellationPolicy(rate) {
    const directPolicy =
      pickString(rate, [
        ["cancellationPolicy"],
        ["cancellation"],
        ["refundability"],
        ["refundable"],
        ["policies", "cancellation"],
      ]);
  
    if (directPolicy) return directPolicy;
  
    const policies = [
      ...pickArray(rate, [["cancellationPolicies"]]),
      ...pickArray(rate, [["cancelPenalties"]]),
      ...pickArray(rate, [["policies"]]),
    ];
  
    const policyTexts = policies
      .map((policy) => {
        if (typeof policy === "string") return policy;
  
        if (isPlainObject(policy)) {
          return (
            asString(policy.description) ||
            asString(policy.text) ||
            asString(policy.name)
          );
        }
  
        return "";
      })
      .filter(Boolean);
  
    return policyTexts.length > 0 ? policyTexts.join(" ") : null;
  }
  
  function getRoomName(rate) {
    const nestedRoomNames =
      pickArray(rate, [["rates"]])
        .map((nestedRate) =>
          pickString(nestedRate, [
            ["roomName"],
            ["roomType"],
            ["roomTypeName"],
            ["name"],
          ])
        )
        .filter(Boolean);

    const uniqueRoomNames =
      [...new Set(nestedRoomNames)];

    if (uniqueRoomNames.length === 1) {
      return nestedRoomNames.length > 1
        ? `${uniqueRoomNames[0]} × ${nestedRoomNames.length}`
        : uniqueRoomNames[0];
    }

    if (uniqueRoomNames.length > 1) {
      return uniqueRoomNames.join(" + ");
    }

    return (
      pickString(rate, [
        ["roomName"],
        ["roomType"],
        ["roomTypeName"],
        ["boardName"],
        ["roomTypes", 0, "name"],
        ["roomTypes", 0, "roomName"],
        ["rooms", 0, "name"],
        ["name"],
      ]) ||
      null
    );
  }
  
  function getTaxesIncluded(rate) {
    return asBooleanOrNull(
      pickFirst(rate, [
        ["taxesIncluded"],
        ["taxIncluded"],
        ["includesTaxes"],
        ["retailRate", "taxesAndFees", "included"],
        ["retailRate", "taxesAndFees", 0, "included"],
        ["retailRate", "taxesAndFees", 0, "includedInPrice"],
      ])
    );
  }
  
  function getRatePrice(rate) {
    return pickNumber(rate, getPricePaths());
  }
  
  function getRateBasePrice(rate) {
    return pickNumber(rate, [
      ["originalRetailRate", "total", 0, "amount"],
      ["originalRetailRate", "amount"],
      ["strikethroughPrice", "amount"],
      ["strikethroughPrice"],
      ["priceBeforeDiscount", "amount"],
      ["priceBeforeDiscount"],
      ["basePrice", "amount"],
      ["basePrice"],
      ["retailRate", "suggestedSellingPrice", 0, "amount"],
      ["retailRate", "initialPrice", 0, "amount"],
    ]);
  }
  
  function getRateCurrency(rate, fallbackCurrency) {
    return (
      pickString(rate, [
        ["offerRetailRate", "currency"],
        ["retailRate", "total", 0, "currency"],
        ["retailRate", "currency"],
        ["retailRate", "suggestedSellingPrice", 0, "currency"],
        ["retailRate", "initialPrice", 0, "currency"],
        ["price", "currency"],
        ["currency"],
      ]) ||
      fallbackCurrency ||
      "EUR"
    );
  }
  
  function getRateDeepLink(rate) {
    return (
      pickString(rate, [
        ["deepLink"],
        ["deeplink"],
        ["bookingUrl"],
        ["bookingURL"],
        ["checkoutUrl"],
        ["url"],
      ]) ||
      null
    );
  }
  
  function createLiteApiOffer({
    rate,
    hotelId,
    index,
    fallbackCurrency,
  }) {
    const price = getRatePrice(rate);
  
    if (price === null || price <= 0) {
      return null;
    }
  
    const rateId =
      pickString(rate, [
        ["offerId"],
        ["rateId"],
        ["id"],
        ["roomId"],
        ["rateToken"],
      ]) ||
      `rate_${index + 1}`;
  
    const basePriceCandidate = getRateBasePrice(rate);
  
    const basePrice =
      basePriceCandidate && basePriceCandidate > price
        ? basePriceCandidate
        : price;
  
    const currency = getRateCurrency(rate, fallbackCurrency);
  
    return {
      id: `${SOURCE_PROVIDER}:${hotelId}:${rateId}`,
      provider: PROVIDER_NAME,
      sourceProvider: SOURCE_PROVIDER,
      price,
      basePrice,
      saving: calculateSavingPercent(price, basePrice),
      currency,
      cancellationPolicy: getCancellationPolicy(rate),
      taxesIncluded: getTaxesIncluded(rate),
      roomName: getRoomName(rate),
      deepLink: getRateDeepLink(rate),
    };
  }
  
  function isValidLatitude(value) {
    return (
      Number.isFinite(value) &&
      value >= -90 &&
      value <= 90
    );
  }

  function isValidLongitude(value) {
    return (
      Number.isFinite(value) &&
      value >= -180 &&
      value <= 180
    );
  }

  function toRadians(value) {
    return value * (Math.PI / 180);
  }

  function calculateDistanceKilometers(
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude
  ) {
    if (
      !isValidLatitude(originLatitude) ||
      !isValidLongitude(originLongitude) ||
      !isValidLatitude(destinationLatitude) ||
      !isValidLongitude(destinationLongitude)
    ) {
      return null;
    }

    const earthRadiusKilometers =
      6371.0088;

    const latitudeDifference =
      toRadians(
        destinationLatitude -
        originLatitude
      );

    const longitudeDifference =
      toRadians(
        destinationLongitude -
        originLongitude
      );

    const originLatitudeRadians =
      toRadians(originLatitude);

    const destinationLatitudeRadians =
      toRadians(destinationLatitude);

    const haversineValue =
      Math.sin(
        latitudeDifference / 2
      ) ** 2 +
      Math.cos(
        originLatitudeRadians
      ) *
        Math.cos(
          destinationLatitudeRadians
        ) *
        Math.sin(
          longitudeDifference / 2
        ) ** 2;

    const angularDistance =
      2 *
      Math.asin(
        Math.min(
          1,
          Math.sqrt(haversineValue)
        )
      );

    const distance =
      earthRadiusKilometers *
      angularDistance;

    return Number(
      distance.toFixed(2)
    );
  }

  function createAvailableData({
    price,
    basePrice,
    saving,
    stars,
    reviewScore,
    reviewCount,
    distance,
    image,
    address,
    latitude,
    longitude,
    amenities,
  }) {
    const hasValidLatitude =
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90;

    const hasValidLongitude =
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180;

    return {
      hasPrice:
        Number.isFinite(price) &&
        price > 0,

      hasBasePrice:
        Number.isFinite(basePrice) &&
        basePrice > price,

      hasSaving:
        Number.isFinite(saving) &&
        saving > 0,

      hasStars:
        Number.isFinite(stars) &&
        stars > 0 &&
        stars <= 5,

      hasReviewScore:
        Number.isFinite(reviewScore) &&
        reviewScore >= 0,

      hasReviewCount:
        Number.isFinite(reviewCount) &&
        reviewCount > 0,

      hasDistance:
        Number.isFinite(distance) &&
        distance >= 0,

      hasImage:
        Boolean(image),

      hasAddress:
        Boolean(address),

      hasCoordinates:
        hasValidLatitude &&
        hasValidLongitude,

      hasAmenities:
        Array.isArray(amenities) &&
        amenities.length > 0,
    };
  }

  function calculateDataConfidence(
    availableData
  ) {
    const coreSignals = [
      availableData.hasPrice,
      availableData.hasImage,
      availableData.hasAddress,
      availableData.hasCoordinates,
      availableData.hasStars,
      availableData.hasReviewScore,
      availableData.hasReviewCount,
    ];

    const coreScore =
      coreSignals.filter(Boolean).length;

    const hasFullCoverage =
      coreScore === coreSignals.length &&
      availableData.hasDistance &&
      availableData.hasAmenities;

    if (hasFullCoverage) {
      return "full";
    }

    if (
      availableData.hasPrice &&
      coreScore >= 5
    ) {
      return "partial";
    }

    return "limited";
  }

  function normalizeCountry(value) {
    const country =
      asString(value);

    if (country.length === 2) {
      return country.toUpperCase();
    }

    return country;
  }

  function createReviewText(reviewScore) {
    if (reviewScore === null) return "No reviews";
    if (reviewScore >= 9) return "Excellent";
    if (reviewScore >= 8) return "Very good";
    if (reviewScore >= 7) return "Good";
  
    return "Guest rated";
  }
  
  function mergeHotelObjects(indexedHotel, recordHotel) {
    if (!indexedHotel || !isPlainObject(indexedHotel)) {
      return recordHotel;
    }
  
    return {
      ...indexedHotel,
      ...recordHotel,
    };
  }
  
  function mapLiteApiRecordToHotel(
    record,
    fallbackCurrency = "EUR",
    hotelDataIndex = new Map(),
    searchLocation = null
  ) {
    const recordHotel = getHotelObject(record);
  
    const preliminaryHotelId = getLiteApiHotelId(record, recordHotel);
  
    const indexedHotel = preliminaryHotelId
      ? hotelDataIndex.get(String(preliminaryHotelId))
      : null;
  
    const hotel = mergeHotelObjects(indexedHotel, recordHotel);
  
    const sourceHotelId = getLiteApiHotelId(record, hotel);
  
    if (!sourceHotelId) return null;
  
    const rates = getLiteApiOfferRecords(record);
  
    const offers = rates
      .map((rate, index) =>
        createLiteApiOfferFromMapper({
          rate,
          hotelId: sourceHotelId,
          index,
          fallbackCurrency,
        })
      )
      .filter(Boolean)
      .sort((firstOffer, secondOffer) => firstOffer.price - secondOffer.price);
  
    if (offers.length === 0) return null;
  
    const bestOffer = offers[0];
  
    const starsRaw = pickNumber(hotel, [
      ["stars"],
      ["starRating"],
      ["hotelStars"],
      ["star_rating"],
    ]);
  
    const stars =
      starsRaw === null
        ? 0
        : clamp(starsRaw, 0, 5);
  
    const reviewScore = pickNumber(hotel, [
      ["reviewScore"],
      ["guestReviewScore"],
      ["guestRating"],
      ["reviews", "score"],
      ["reviews", "rating"],
      ["review", "score"],
      ["rating"],
      ["score"],
    ]);
  
    const reviewCount = pickNumber(hotel, [
      ["reviewCount"],
      ["guestReviewCount"],
      ["reviews", "count"],
      ["reviewsCount"],
      ["numberOfReviews"],
      ["review_count"],
    ]);
  
    const latitude = pickNumber(hotel, [
      ["latitude"],
      ["lat"],
      ["location", "latitude"],
      ["coordinates", "latitude"],
      ["coordinates", "lat"],
    ]);
  
    const longitude = pickNumber(hotel, [
      ["longitude"],
      ["lng"],
      ["lon"],
      ["location", "longitude"],
      ["coordinates", "longitude"],
      ["coordinates", "lng"],
    ]);
    const address = pickString(hotel, [
      ["address"],
      ["addressLine"],
      ["address1"],
      ["location", "address"],
      ["address_line"],
    ]);

    const city = pickString(hotel, [
      ["city"],
      ["cityName"],
      ["city_name"],
      ["location", "city"],
    ]);

    const country = normalizeCountry(
      pickString(hotel, [
        ["country"],
        ["countryName"],
        ["country_code"],
        ["countryCode"],
        ["location", "country"],
      ])
    );

    const providerDistance = pickNumber(record, [
      ["distance"],
      ["distanceFromCenter"],
      ["distanceFromCentre"],
      ["hotel", "distance"],
    ]);

    const searchLatitude =
      asNumber(
        searchLocation?.latitude ??
        searchLocation?.lat
      );

    const searchLongitude =
      asNumber(
        searchLocation?.longitude ??
        searchLocation?.lng ??
        searchLocation?.lon
      );

    const calculatedDistance =
      calculateDistanceKilometers(
        searchLatitude,
        searchLongitude,
        latitude,
        longitude
      );

    const distance =
      calculatedDistance ??
      providerDistance;

    const distanceSource =
      calculatedDistance !== null
        ? "calculated"
        : providerDistance !== null
          ? "provider"
          : null;

    const distanceUnit =
      calculatedDistance !== null
        ? "km"
        : null;

    const image =
      getPrimaryImage(
        record,
        hotel
      );

    const thumbnail =
      pickString(hotel, [
        ["thumbnail"],
        ["thumbnailUrl"],
        ["thumbnail_url"],
      ]) ||
      image;

    const mainImage =
      pickString(hotel, [
        ["main_photo"],
        ["mainPhoto"],
        ["mainImage"],
        ["main_image"],
      ]) ||
      image;
    
      const amenities = getAmenities(record, hotel);
      const facilities = amenities;
      const saving = bestOffer.saving;
    
      const availableData = createAvailableData({
        price: bestOffer.price,
        basePrice: bestOffer.basePrice,
        saving,
        stars,
        reviewScore,
        reviewCount,
        distance,
        image,
        address,
        latitude,
        longitude,
        amenities,
      });
    
      const dataConfidence = calculateDataConfidence(availableData);
    
      return {
        id: `${SOURCE_PROVIDER}:${sourceHotelId}`,
        sourceProvider: SOURCE_PROVIDER,
        sourceHotelId,
        dataSources: [SOURCE_PROVIDER],
        dataConfidence,
        availableData,
        offers,
    
        name: getLiteApiHotelName(record, hotel),
        provider: PROVIDER_NAME,
        stars,
        reviewScore: reviewScore ?? null,
        reviewCount: reviewCount ?? null,
        reviewText: createReviewText(reviewScore ?? null),
    
        price: bestOffer.price,
        basePrice: bestOffer.basePrice,
        saving,
        currency: bestOffer.currency,


        taxesIncluded:
          bestOffer.taxesIncluded,

        includedTaxes:
          bestOffer.includedTaxes,

        excludedTaxes:
          bestOffer.excludedTaxes,

        unknownTaxes:
          bestOffer.unknownTaxes,

        taxBreakdown:
          bestOffer.taxBreakdown,

        totalKnownCost:
          bestOffer.totalKnownCost,

        cancellationPolicy:
          bestOffer.cancellationPolicy,

        refundableTag:
          bestOffer.refundableTag,

        refundable:
          bestOffer.refundable,

        freeCancellationUntil:
          bestOffer.freeCancellationUntil,

        cancellationPenalty:
          bestOffer.cancellationPenalty,

        cancellationPenaltyCurrency:
          bestOffer
            .cancellationPenaltyCurrency,

        cancellationPenaltyType:
          bestOffer
            .cancellationPenaltyType,

        cancellationTimezone:
          bestOffer
            .cancellationTimezone,

        cancellationPolicies:
          bestOffer.cancellationPolicies,
        distance: distance ?? null,
        distanceUnit,
        distanceSource,
        image,
        thumbnail,
        mainImage,
        address,
        city,
        country,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        amenities,
        facilities,
      };
    }
    
    function mapLiteApiDestinationResponse(data) {
      const records = extractRecords(data);
    
      return records
        .map((record) => {
          const hotel = getHotelObject(record);
          const id = getLiteApiHotelId(record, hotel);
          const name = getLiteApiHotelName(record, hotel);
    
          if (!id || !name) return null;
    
          return {
            id,
            name,
            type: "hotel",
            city: pickString(hotel, [
              ["city"],
              ["cityName"],
              ["city_name"],
              ["location", "city"],
            ]),
            country: normalizeCountry(
              pickString(hotel, [
                ["country"],
                ["countryName"],
                ["country_code"],
                ["countryCode"],
                ["location", "country"],
              ])
            ),
          };
        })
        .filter(Boolean);
    }
    
    function mapLiteApiHotelResponse(
      data,
      fallbackCurrency = "EUR",
      searchLocation = null
    ) {
      const records = extractRecords(data);
      const hotelDataIndex = createHotelDataIndex(data);
    
      return records
        .map((record) => {
          const sourceHotelId = getLiteApiHotelId(record, record);
    
          const indexedHotel = sourceHotelId
            ? hotelDataIndex.get(String(sourceHotelId))
            : null;
    
          const enrichedRecord = indexedHotel
            ? {
                ...record,
                hotel: indexedHotel,
              }
            : record;
    
          return mapLiteApiRecordToHotel(
            enrichedRecord,
            fallbackCurrency,
            hotelDataIndex,
            searchLocation
          );
        })
        .filter(Boolean);
    }
    
    function isLiteApiNoResults(data) {
      return !data || extractRecords(data).length === 0;
    }
    
function createLiteApiFailedSearchResponse(currency = "EUR") {
  const message =
    "LiteAPI returned no usable hotel results for this search.";

  return {
    success: false,
    message,
    code: 204,
    status: "Completed",
    searchIncomplete: false,
    nextResultsKey: null,
    currency,
    totalHotels: 0,
    hotels: [],
    result: {
      status: "Completed",
      currency,
      hotels: [],
      nextResultsKey: null,
    },
    error: message,
  };
}
    module.exports = {
      mapLiteApiDestinationResponse,
      mapLiteApiHotelResponse,
      mapLiteApiRecordToHotel,
      isLiteApiNoResults,
      getLiteApiCurrency,
      createLiteApiFailedSearchResponse,
    };