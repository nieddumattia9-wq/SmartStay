const {
  combineReviewCountRelations,
  inferReviewCountRelation,
} = require("../../utils/reviewCountRelation");
const { mergeOffers, normalizeCurrency, selectCommercialSummary } = require("./commercialSummary");

function normalizeText(value = "") {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim()
      .replace(
        /[^\p{L}\p{N}\s]/gu,
        " "
      )
      .replace(/\s+/g, " ");
  }

  function roundCoordinate(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return null;
    }

    if (
      number < -180 ||
      number > 180
    ) {
      return null;
    }

    return number.toFixed(4);
  }

  function uniqueValues(values = []) {
  
    return [
      ...new Set(
        values
          .filter(Boolean)
          .map((value) => String(value))
      ),
    ];
  
  }
  
  function mergeBooleanData(firstData = {}, secondData = {}) {
  
    const keys =
      uniqueValues([
        ...Object.keys(firstData),
        ...Object.keys(secondData),
      ]);
  
    return keys.reduce((mergedData, key) => {
  
      return {
        ...mergedData,
        [key]:
          Boolean(firstData[key]) ||
          Boolean(secondData[key]),
      };
  
    }, {});
  
  }
  
  function getConfidenceRank(dataConfidence) {
  
    if (dataConfidence === "full") {
  
      return 3;
  
    }
  
    if (dataConfidence === "partial") {
  
      return 2;
  
    }
  
    return 1;
  
  }
  
  function getBestDataConfidence(firstConfidence, secondConfidence) {
  
    return getConfidenceRank(secondConfidence) >
      getConfidenceRank(firstConfidence)
      ? secondConfidence
      : firstConfidence;
  
  }
  
  function createHotelMergeKey(hotel) {
    if (
      !hotel ||
      typeof hotel !== "object"
    ) {
      return null;
    }

    const sourceProvider =
      normalizeText(
        hotel.sourceProvider
      );

    const sourceHotelId =
      normalizeText(
        hotel.sourceHotelId
      );

    /*
     * Questa è l'identità più affidabile
     * all'interno dello stesso provider.
     *
     * Provider diversi possono usare lo
     * stesso ID per strutture differenti,
     * quindi entrambi i valori fanno parte
     * della chiave.
     */
    if (
      sourceProvider &&
      sourceHotelId
    ) {
      return [
        "source",
        sourceProvider,
        sourceHotelId,
      ].join("|");
    }

    const internalId =
      normalizeText(hotel.id);

    if (internalId) {
      return [
        "internal",
        internalId,
      ].join("|");
    }

    const name =
      normalizeText(hotel.name);

    const city =
      normalizeText(hotel.city);

    const country =
      normalizeText(hotel.country);

    const address =
      normalizeText(hotel.address);

    const latitude =
      roundCoordinate(
        hotel.latitude
      );

    const longitude =
      roundCoordinate(
        hotel.longitude
      );

    /*
     * Senza ID usiamo soltanto segnali
     * abbastanza forti. Nome e città da
     * soli non sono sufficienti.
     */
    if (
      name &&
      address &&
      city &&
      country
    ) {
      return [
        "address",
        name,
        address,
        city,
        country,
      ].join("|");
    }

    if (
      name &&
      latitude &&
      longitude
    ) {
      return [
        "coordinates",
        name,
        latitude,
        longitude,
      ].join("|");
    }

    return null;
  }

  function getOffers(hotel) {
    return Array.isArray(hotel.offers) ? hotel.offers : [];
  }

  function preferValue(firstValue, secondValue) {
  
    if (
      firstValue !== null &&
      firstValue !== undefined &&
      firstValue !== ""
    ) {
  
      return firstValue;
  
    }
  
    return secondValue;
  
  }
  
  function preferHigherNumber(firstValue, secondValue) {
  
    const firstNumber =
      Number(firstValue);
  
    const secondNumber =
      Number(secondValue);
  
    if (!Number.isFinite(firstNumber)) {
  
      return secondValue;
  
    }
  
    if (!Number.isFinite(secondNumber)) {
  
      return firstValue;
  
    }
  
    return Math.max(
      firstNumber,
      secondNumber
    );
  
  }
  
  function preferLowerDistance(firstDistance, secondDistance) {
  
    if (firstDistance === null || firstDistance === undefined) {
  
      return secondDistance ?? null;
  
    }
  
    if (secondDistance === null || secondDistance === undefined) {
  
      return firstDistance;
  
    }
  
    return Math.min(
      Number(firstDistance),
      Number(secondDistance)
    );
  
  }
  
  function createReviewBundle(
    hotel = {}
  ) {
    const reviewScore =
      Number(hotel.reviewScore);

    const reviewCount =
      Number(hotel.reviewCount);

    const sourceProvider =
      hotel.reviewSourceProvider ??
      hotel.sourceProvider ??
      null;

    const reviewCountRelation =
      inferReviewCountRelation({
        reviewCount:
          Number.isFinite(reviewCount)
            ? reviewCount
            : null,

        reviewCountRelation:
          hotel.reviewCountRelation,

        sourceProvider,

        provider:
          hotel.provider,
      });

    return {
      reviewScore:
        Number.isFinite(
          reviewScore
        )
          ? reviewScore
          : null,

      reviewCount:
        Number.isFinite(
          reviewCount
        ) &&
        reviewCount >= 0
          ? reviewCount
          : null,

      reviewCountRelation,

      reviewText:
        hotel.reviewText ??
        null,

      sourceProvider,

      sourceHotelId:
        hotel.reviewSourceHotelId ??
        hotel.sourceHotelId ??
        null,
    };
  }

  function hasReviewScore(
    reviewBundle
  ) {
    return Number.isFinite(
      reviewBundle?.reviewScore
    );
  }

  function hasReviewCount(
    reviewBundle
  ) {
    return (
      Number.isFinite(
        reviewBundle?.reviewCount
      ) &&
      reviewBundle.reviewCount >= 0
    );
  }

  function chooseReviewBundle(
    firstHotel,
    secondHotel
  ) {
    const firstBundle =
      createReviewBundle(
        firstHotel
      );

    const secondBundle =
      createReviewBundle(
        secondHotel
      );

    const firstHasScore =
      hasReviewScore(
        firstBundle
      );

    const secondHasScore =
      hasReviewScore(
        secondBundle
      );

    if (
      firstHasScore !==
      secondHasScore
    ) {
      return secondHasScore
        ? secondBundle
        : firstBundle;
    }

    const firstHasCount =
      hasReviewCount(
        firstBundle
      );

    const secondHasCount =
      hasReviewCount(
        secondBundle
      );

    if (
      firstHasCount !==
      secondHasCount
    ) {
      return secondHasCount
        ? secondBundle
        : firstBundle;
    }

    if (
      firstHasCount &&
      secondHasCount &&
      firstBundle.reviewCount !==
        secondBundle.reviewCount
    ) {
      return (
        secondBundle.reviewCount >
        firstBundle.reviewCount
      )
        ? secondBundle
        : firstBundle;
    }

    const combinedReviewCountRelation =
      (
        firstHasCount &&
        secondHasCount &&
        firstBundle.reviewCount ===
          secondBundle.reviewCount
      )
        ? combineReviewCountRelations(
            firstBundle.reviewCountRelation,
            secondBundle.reviewCountRelation
          )
        : firstBundle.reviewCountRelation;

    if (
      !firstBundle.reviewText &&
      secondBundle.reviewText
    ) {
      return {
        ...secondBundle,

        reviewCountRelation:
          combinedReviewCountRelation,
      };
    }

    return {
      ...firstBundle,

      reviewCountRelation:
        combinedReviewCountRelation,
    };
  }

  function createCommercialData(
    bestOffer
  ) {
    bestOffer ??= {};

    return {
      provider:
        bestOffer.provider ??
        null,

      price:
        bestOffer.price ??
        null,

      basePrice:
        bestOffer.basePrice ??
        null,

      saving:
        bestOffer.saving ??
        0,

      currency:
        normalizeCurrency(bestOffer.currency) ??
        null,

      taxesIncluded:
        bestOffer.taxesIncluded ??
        null,

      includedTaxes:
        bestOffer.includedTaxes ??
        0,

      excludedTaxes:
        bestOffer.excludedTaxes ??
        0,

      unknownTaxes:
        bestOffer.unknownTaxes ??
        0,

      taxBreakdown:
        Array.isArray(
          bestOffer.taxBreakdown
        )
          ? bestOffer.taxBreakdown
          : [],

      totalKnownCost:
        bestOffer.totalKnownCost ??
        null,

      cancellationPolicy:
        bestOffer.cancellationPolicy ??
        null,

      refundableTag:
        bestOffer.refundableTag ??
        null,

      refundable:
        bestOffer.refundable ??
        null,

      freeCancellationUntil:
        bestOffer
          .freeCancellationUntil ??
        null,

      cancellationPenalty:
        bestOffer
          .cancellationPenalty ??
        null,

      cancellationPenaltyCurrency:
        bestOffer
          .cancellationPenaltyCurrency ??
        null,

      cancellationPenaltyType:
        bestOffer
          .cancellationPenaltyType ??
        null,

      cancellationTimezone:
        bestOffer
          .cancellationTimezone ??
        null,

      cancellationPolicies:
        Array.isArray(
          bestOffer
            .cancellationPolicies
        )
          ? bestOffer
              .cancellationPolicies
          : [],

      roomName:
        bestOffer.roomName ??
        null,

      deepLink:
        bestOffer.deepLink ??
        null,
    };
  }

  function getFiniteNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function getValidStars(value) {
    const stars =
      getFiniteNumber(value);

    return (
      stars !== null &&
      stars > 0 &&
      stars <= 5
    )
      ? stars
      : null;
  }

  function getValidLatitude(value) {
    const latitude =
      getFiniteNumber(value);

    return (
      latitude !== null &&
      latitude >= -90 &&
      latitude <= 90
    )
      ? latitude
      : null;
  }

  function getValidLongitude(value) {
    const longitude =
      getFiniteNumber(value);

    return (
      longitude !== null &&
      longitude >= -180 &&
      longitude <= 180
    )
      ? longitude
      : null;
  }

  function getValidDistance(value) {
    const distance =
      getFiniteNumber(value);

    return (
      distance !== null &&
      distance >= 0
    )
      ? distance
      : null;
  }

  function hasValidCoordinatePair(
    hotel = {}
  ) {
    return (
      getValidLatitude(
        hotel.latitude
      ) !== null &&
      getValidLongitude(
        hotel.longitude
      ) !== null
    );
  }

  function getImageQuality(
    hotel = {}
  ) {
    if (hotel.mainImage) {
      return 3;
    }

    if (hotel.thumbnail) {
      return 2;
    }

    if (hotel.image) {
      return 1;
    }

    return 0;
  }

  function compareRankVectors(
    firstRank,
    secondRank
  ) {
    const length =
      Math.max(
        firstRank.length,
        secondRank.length
      );

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const firstValue =
        Number(
          firstRank[index] ?? 0
        );

      const secondValue =
        Number(
          secondRank[index] ?? 0
        );

      if (
        firstValue >
        secondValue
      ) {
        return 1;
      }

      if (
        firstValue <
        secondValue
      ) {
        return -1;
      }
    }

    return 0;
  }

  function createStableHotelMetadataKey(
    hotel = {}
  ) {
    return [
      normalizeText(
        hotel.sourceProvider
      ),
      normalizeText(
        hotel.sourceHotelId
      ),
      normalizeText(
        hotel.id
      ),
      normalizeText(
        hotel.mainImage
      ),
      normalizeText(
        hotel.thumbnail
      ),
      normalizeText(
        hotel.image
      ),
      normalizeText(
        hotel.address
      ),
      String(
        hotel.latitude ?? ""
      ),
      String(
        hotel.longitude ?? ""
      ),
      String(
        hotel.stars ?? ""
      ),
    ].join("|");
  }

  function chooseRankedHotel(
    firstHotel,
    secondHotel,
    getRank
  ) {
    const comparison =
      compareRankVectors(
        getRank(firstHotel),
        getRank(secondHotel)
      );

    if (comparison > 0) {
      return firstHotel;
    }

    if (comparison < 0) {
      return secondHotel;
    }

    const firstKey =
      createStableHotelMetadataKey(
        firstHotel
      );

    const secondKey =
      createStableHotelMetadataKey(
        secondHotel
      );

    return (
      firstKey.localeCompare(
        secondKey
      ) <= 0
    )
      ? firstHotel
      : secondHotel;
  }

  function chooseDescriptiveHotel(
    firstHotel,
    secondHotel
  ) {
    return chooseRankedHotel(
      firstHotel,
      secondHotel,
      (hotel) => [
        getConfidenceRank(
          hotel.dataConfidence
        ),
        getImageQuality(hotel),
        getValidStars(
          hotel.stars
        ) !== null
          ? 1
          : 0,
      ]
    );
  }

  function chooseLocationHotel(
    firstHotel,
    secondHotel
  ) {
    return chooseRankedHotel(
      firstHotel,
      secondHotel,
      (hotel) => [
        hasValidCoordinatePair(
          hotel
        )
          ? 1
          : 0,

        (
          getValidDistance(
            hotel.distance
          ) !== null &&
          hotel.distanceSource ===
            "calculated"
        )
          ? 1
          : 0,

        getValidDistance(
          hotel.distance
        ) !== null
          ? 1
          : 0,

        hotel.address
          ? 1
          : 0,

        hotel.city
          ? 1
          : 0,

        hotel.country
          ? 1
          : 0,

        getConfidenceRank(
          hotel.dataConfidence
        ),
      ]
    );
  }

  function mergeHotelRecords(firstHotel, secondHotel, context = {}) {
    const offers = mergeOffers(getOffers(firstHotel), getOffers(secondHotel));
    const { offer: bestOffer, summary: commercialSummary } = selectCommercialSummary(offers, context);
    const commercialData = createCommercialData(bestOffer);

    const reviewBundle =
      chooseReviewBundle(
        firstHotel,
        secondHotel
      );

    const descriptiveHotel =
      chooseDescriptiveHotel(
        firstHotel,
        secondHotel
      );

    const locationHotel =
      chooseLocationHotel(
        firstHotel,
        secondHotel
      );

    const stars =
      getValidStars(
        descriptiveHotel.stars
      ) ?? 0;

    const image =
      preferValue(
        descriptiveHotel.image,
        preferValue(
          descriptiveHotel.mainImage,
          descriptiveHotel.thumbnail
        )
      ) ?? null;

    const thumbnail =
      preferValue(
        descriptiveHotel.thumbnail,
        image
      ) ?? null;

    const mainImage =
      preferValue(
        descriptiveHotel.mainImage,
        image
      ) ?? null;

    const latitude =
      getValidLatitude(
        locationHotel.latitude
      );

    const longitude =
      getValidLongitude(
        locationHotel.longitude
      );

    const distance =
      getValidDistance(
        locationHotel.distance
      );

    const distanceUnit =
      distance !== null
        ? (
            locationHotel
              .distanceUnit ??
            null
          )
        : null;

    const distanceSource =
      distance !== null
        ? (
            locationHotel
              .distanceSource ??
            null
          )
        : null;

    const address =
      locationHotel.address ??
      null;

    const city =
      locationHotel.city ??
      null;

    const country =
      locationHotel.country ??
      null;

    const dataSources =
      uniqueValues([
        ...(firstHotel.dataSources ?? []),
        ...(secondHotel.dataSources ?? []),
        firstHotel.sourceProvider,
        secondHotel.sourceProvider,
      ]);

    const amenities =
      uniqueValues([
        ...(firstHotel.amenities ?? []),
        ...(secondHotel.amenities ?? []),
      ]);

    const facilities =
      uniqueValues([
        ...(firstHotel.facilities ?? []),
        ...(secondHotel.facilities ?? []),
      ]);

    const mergedAvailableData =
      mergeBooleanData(
        firstHotel.availableData,
        secondHotel.availableData
      );

    const price =
      Number(
        commercialData.price
      );

    const basePrice =
      Number(
        commercialData.basePrice
      );

    const saving =
      Number(
        commercialData.saving
      );

    const availableData = {
      ...mergedAvailableData,

      hasPrice:
        Number.isFinite(price) &&
        price > 0,

      hasBasePrice:
        Number.isFinite(basePrice) &&
        Number.isFinite(price) &&
        basePrice > price,

      hasSaving:
        Number.isFinite(saving) &&
        saving > 0,

      hasStars:
        stars > 0,

      hasReviewScore:
        hasReviewScore(
          reviewBundle
        ),

      hasReviewCount:
        hasReviewCount(
          reviewBundle
        ) &&
        reviewBundle.reviewCount > 0,

      hasImage:
        Boolean(image),

      hasAddress:
        Boolean(address),

      hasCoordinates:
        latitude !== null &&
        longitude !== null,

      hasDistance:
        distance !== null,

      hasAmenities:
        amenities.length > 0,
    };
    return {
      ...firstHotel,

      id:
        firstHotel.id,

      sourceProvider:
        firstHotel.sourceProvider,

      sourceHotelId:
        firstHotel.sourceHotelId,

      dataSources,

      dataConfidence:
        getBestDataConfidence(
          firstHotel.dataConfidence,
          secondHotel.dataConfidence
        ),

      availableData,

      offers,

      name:
        preferValue(
          firstHotel.name,
          secondHotel.name
        ),

      stars,

      descriptiveSourceProvider:
        descriptiveHotel
          .sourceProvider ??
        null,

      descriptiveSourceHotelId:
        descriptiveHotel
          .sourceHotelId ??
        null,

      reviewScore:
        reviewBundle.reviewScore,

      reviewCount:
        reviewBundle.reviewCount,

      reviewCountRelation:
        reviewBundle.reviewCountRelation,

      reviewText:
        reviewBundle.reviewText,

      reviewSourceProvider:
        reviewBundle.sourceProvider,

      reviewSourceHotelId:
        reviewBundle.sourceHotelId,

      ...commercialData,
      commercialSummary,

      distance,
      distanceUnit,
      distanceSource,

      locationSourceProvider:
        locationHotel
          .sourceProvider ??
        null,

      locationSourceHotelId:
        locationHotel
          .sourceHotelId ??
        null,

      image,
      thumbnail,
      mainImage,

      address,
      city,
      country,
      latitude,
      longitude,

      amenities,

      facilities,
    };
  }

  function mergeProviderHotelResults(hotels = [], context = {}) {
  
    if (!Array.isArray(hotels)) {
  
      return [];
  
    }
  
    const hotelMap =
      new Map();
  
    hotels.forEach((hotel, index) => {
      if (
        !hotel ||
        typeof hotel !== "object"
      ) {
        return;
      }

      /*
       * Un record senza identità sicura
       * viene conservato, non eliminato e
       * non unito arbitrariamente.
       */
      const mergeKey =
        createHotelMergeKey(hotel) ??
        `unmatched|${index}`;

      const existingHotel =
        hotelMap.get(mergeKey);
  
      if (!existingHotel) {
  
        hotelMap.set(
          mergeKey,
          hotel
        );
  
        return;
  
      }
  
      hotelMap.set(
        mergeKey,
        mergeHotelRecords(
          existingHotel,
          hotel,
          context
        )
      );
  
    });
  
    // Single records need the same currency check as duplicate records.
    return Array.from(hotelMap.values(), hotel => {
      const offers = mergeOffers(getOffers(hotel));
      const { offer, summary } = selectCommercialSummary(offers, context);
      const commercial = createCommercialData(offer);
      return {
        ...hotel, ...commercial, offers, commercialSummary: summary,
        availableData: {
          ...hotel.availableData,
          hasPrice: offer !== null,
          hasBasePrice: offer !== null && Number(commercial.basePrice) > Number(commercial.price),
          hasSaving: offer !== null && Number(commercial.saving) > 0,
        },
      };
    });
  
  }
  
  module.exports = {
    createHotelMergeKey,
    mergeHotelRecords,
    mergeProviderHotelResults,
  };
