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

  function getValidOffers(hotel) {
  
    if (!Array.isArray(hotel.offers)) {
  
      return [];
  
    }
  
    return hotel.offers
      .filter((offer) => (
        offer &&
        Number.isFinite(Number(offer.price)) &&
        Number(offer.price) > 0
      ));
  
  }
  
  function normalizeCurrency(value) {
    const currency =
      String(
        value ?? ""
      )
        .trim()
        .toUpperCase();

    return /^[A-Z]{3}$/.test(currency)
      ? currency
      : "";
  }

  function getOfferCompletenessScore(
    offer
  ) {
    if (
      !offer ||
      typeof offer !== "object"
    ) {
      return 0;
    }

    let score = 0;

    if (offer.roomName) score += 1;

    if (
      Number.isFinite(
        Number(offer.totalKnownCost)
      )
    ) {
      score += 1;
    }

    if (
      Number.isFinite(
        Number(offer.excludedTaxes)
      )
    ) {
      score += 1;
    }

    if (
      offer.refundable === true ||
      offer.refundable === false
    ) {
      score += 1;
    }

    if (offer.cancellationPolicy) {
      score += 1;
    }

    if (
      Array.isArray(
        offer.cancellationPolicies
      ) &&
      offer.cancellationPolicies
        .length > 0
    ) {
      score += 1;
    }

    if (offer.deepLink) score += 1;

    return score;
  }

  function createOfferMergeKey(
    offer
  ) {
    const sourceProvider =
      normalizeText(
        offer?.sourceProvider
      );

    const provider =
      normalizeText(
        offer?.provider
      );

    const offerId =
      String(
        offer?.id ?? ""
      ).trim();

    const currency =
      normalizeCurrency(
        offer?.currency
      );

    if (offerId) {
      return [
        "id",
        sourceProvider,
        provider,
        offerId,
        currency,
      ].join("|");
    }

    const price =
      Number(offer?.price);

    const totalKnownCost =
      Number(
        offer?.totalKnownCost
      );

    const excludedTaxes =
      Number(
        offer?.excludedTaxes
      );

    const cancellationPenalty =
      Number(
        offer?.cancellationPenalty
      );

    const refundable =
      offer?.refundable === true
        ? "true"
        : offer?.refundable === false
          ? "false"
          : "";

    return [
      "fingerprint",
      sourceProvider,
      provider,
      normalizeText(
        offer?.roomName
      ),
      Number.isFinite(price)
        ? price.toFixed(2)
        : "",
      currency,
      refundable,
      normalizeText(
        offer?.refundableTag
      ),
      normalizeText(
        offer?.cancellationPolicy
      ),
      Number.isFinite(
        totalKnownCost
      )
        ? totalKnownCost.toFixed(2)
        : "",
      Number.isFinite(
        excludedTaxes
      )
        ? excludedTaxes.toFixed(2)
        : "",
      Number.isFinite(
        cancellationPenalty
      )
        ? cancellationPenalty
            .toFixed(2)
        : "",
    ].join("|");
  }

  function mergeOffers(
    firstOffers = [],
    secondOffers = []
  ) {
    const offerMap =
      new Map();

    [
      ...firstOffers,
      ...secondOffers,
    ].forEach((offer) => {
      if (!offer) {
        return;
      }

      const key =
        createOfferMergeKey(
          offer
        );

      const existingOffer =
        offerMap.get(key);

      if (!existingOffer) {
        offerMap.set(
          key,
          offer
        );

        return;
      }

      const existingScore =
        getOfferCompletenessScore(
          existingOffer
        );

      const candidateScore =
        getOfferCompletenessScore(
          offer
        );

      if (
        candidateScore >
        existingScore
      ) {
        offerMap.set(
          key,
          offer
        );
      }
    });

    return Array.from(
      offerMap.values()
    );
  }

  function getOfferComparableCost(
    offer
  ) {
    const totalKnownCost =
      Number(
        offer?.totalKnownCost
      );

    if (
      Number.isFinite(
        totalKnownCost
      ) &&
      totalKnownCost > 0
    ) {
      return totalKnownCost;
    }

    return Number(offer?.price);
  }

  function getBestOffer(
    offers = [],
    preferredCurrency = ""
  ) {
    const validOffers =
      offers.filter((offer) => (
        offer &&
        Number.isFinite(
          Number(offer.price)
        ) &&
        Number(offer.price) > 0
      ));

    if (validOffers.length === 0) {
      return null;
    }

    const normalizedPreferredCurrency =
      normalizeCurrency(
        preferredCurrency
      );

    let comparableOffers =
      validOffers;

    if (
      normalizedPreferredCurrency
    ) {
      comparableOffers =
        validOffers.filter(
          (offer) =>
            normalizeCurrency(
              offer.currency
            ) ===
            normalizedPreferredCurrency
        );

      /*
       * Non confrontiamo numericamente
       * prezzi appartenenti a valute
       * differenti.
       */
      if (
        comparableOffers.length === 0
      ) {
        return null;
      }
    } else {
      const currencies =
        uniqueValues(
          validOffers
            .map((offer) =>
              normalizeCurrency(
                offer.currency
              )
            )
            .filter(Boolean)
        );

      if (currencies.length > 1) {
        return null;
      }
    }

    return comparableOffers
      .slice()
      .sort(
        (
          firstOffer,
          secondOffer
        ) => {
          const costDifference =
            getOfferComparableCost(
              firstOffer
            ) -
            getOfferComparableCost(
              secondOffer
            );

          if (costDifference !== 0) {
            return costDifference;
          }

          return (
            Number(
              firstOffer.price
            ) -
            Number(
              secondOffer.price
            )
          );
        }
      )[0] ?? null;
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

      reviewText:
        hotel.reviewText ??
        null,

      sourceProvider:
        hotel.reviewSourceProvider ??
        hotel.sourceProvider ??
        null,

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

    if (
      !firstBundle.reviewText &&
      secondBundle.reviewText
    ) {
      return secondBundle;
    }

    return firstBundle;
  }

  function createCommercialData(
    bestOffer,
    fallbackHotel = {}
  ) {
    if (!bestOffer) {
      return {
        provider:
          fallbackHotel.provider ??
          null,

        price:
          fallbackHotel.price ??
          null,

        basePrice:
          fallbackHotel.basePrice ??
          null,

        saving:
          fallbackHotel.saving ??
          0,

        currency:
          fallbackHotel.currency ??
          null,

        taxesIncluded:
          fallbackHotel.taxesIncluded ??
          null,

        includedTaxes:
          fallbackHotel.includedTaxes ??
          0,

        excludedTaxes:
          fallbackHotel.excludedTaxes ??
          0,

        unknownTaxes:
          fallbackHotel.unknownTaxes ??
          0,

        taxBreakdown:
          Array.isArray(
            fallbackHotel.taxBreakdown
          )
            ? fallbackHotel.taxBreakdown
            : [],

        totalKnownCost:
          fallbackHotel.totalKnownCost ??
          null,

        cancellationPolicy:
          fallbackHotel
            .cancellationPolicy ??
          null,

        refundableTag:
          fallbackHotel.refundableTag ??
          null,

        refundable:
          fallbackHotel.refundable ??
          null,

        freeCancellationUntil:
          fallbackHotel
            .freeCancellationUntil ??
          null,

        cancellationPenalty:
          fallbackHotel
            .cancellationPenalty ??
          null,

        cancellationPenaltyCurrency:
          fallbackHotel
            .cancellationPenaltyCurrency ??
          null,

        cancellationPenaltyType:
          fallbackHotel
            .cancellationPenaltyType ??
          null,

        cancellationTimezone:
          fallbackHotel
            .cancellationTimezone ??
          null,

        cancellationPolicies:
          Array.isArray(
            fallbackHotel
              .cancellationPolicies
          )
            ? fallbackHotel
                .cancellationPolicies
            : [],

        roomName:
          fallbackHotel.roomName ??
          null,

        deepLink:
          fallbackHotel.deepLink ??
          null,
      };
    }

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
        bestOffer.currency ??
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

  function mergeHotelRecords(firstHotel, secondHotel) {
    const offers =
      mergeOffers(
        getValidOffers(firstHotel),
        getValidOffers(secondHotel)
      );

    const preferredCurrency =
      normalizeCurrency(
        firstHotel.currency
      ) ||
      normalizeCurrency(
        secondHotel.currency
      ) ||
      normalizeCurrency(
        getValidOffers(
          firstHotel
        )[0]?.currency
      ) ||
      normalizeCurrency(
        getValidOffers(
          secondHotel
        )[0]?.currency
      );

    const bestOffer =
      getBestOffer(
        offers,
        preferredCurrency
      );

    const commercialData =
      createCommercialData(
        bestOffer,
        firstHotel
      );

    const reviewBundle =
      chooseReviewBundle(
        firstHotel,
        secondHotel
      );

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

      hasReviewScore:
        hasReviewScore(
          reviewBundle
        ),

      hasReviewCount:
        hasReviewCount(
          reviewBundle
        ) &&
        reviewBundle.reviewCount > 0,

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

      stars:
        preferHigherNumber(
          firstHotel.stars,
          secondHotel.stars
        ),

      reviewScore:
        reviewBundle.reviewScore,

      reviewCount:
        reviewBundle.reviewCount,

      reviewText:
        reviewBundle.reviewText,

      reviewSourceProvider:
        reviewBundle.sourceProvider,

      reviewSourceHotelId:
        reviewBundle.sourceHotelId,

      ...commercialData,

      distance:
        preferLowerDistance(
          firstHotel.distance,
          secondHotel.distance
        ),

      image:
        preferValue(
          firstHotel.image,
          secondHotel.image
        ),

      address:
        preferValue(
          firstHotel.address,
          secondHotel.address
        ),

      city:
        preferValue(
          firstHotel.city,
          secondHotel.city
        ),

      country:
        preferValue(
          firstHotel.country,
          secondHotel.country
        ),

      latitude:
        preferValue(
          firstHotel.latitude,
          secondHotel.latitude
        ),

      longitude:
        preferValue(
          firstHotel.longitude,
          secondHotel.longitude
        ),

      amenities,

      facilities,
    };
  }

  function mergeProviderHotelResults(hotels = []) {
  
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
          hotel
        )
      );
  
    });
  
    return Array.from(
      hotelMap.values()
    );
  
  }
  
  module.exports = {
    createHotelMergeKey,
    mergeHotelRecords,
    mergeProviderHotelResults,
  };