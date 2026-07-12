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
  
    const availableData =
      mergeBooleanData(
        firstHotel.availableData,
        secondHotel.availableData
      );
  
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
  
      provider:
        bestOffer?.provider ??
        firstHotel.provider,
  
      stars:
        preferHigherNumber(
          firstHotel.stars,
          secondHotel.stars
        ),
  
      reviewScore:
        preferValue(
          firstHotel.reviewScore,
          secondHotel.reviewScore
        ),
  
      reviewCount:
        preferHigherNumber(
          firstHotel.reviewCount,
          secondHotel.reviewCount
        ),
  
      reviewText:
        preferValue(
          firstHotel.reviewText,
          secondHotel.reviewText
        ),
  
      price:
        bestOffer?.price ??
        firstHotel.price,
  
      basePrice:
        bestOffer?.basePrice ??
        firstHotel.basePrice,
  
      saving:
        bestOffer?.saving ??
        firstHotel.saving,
  
      currency:
        bestOffer?.currency ??
        firstHotel.currency,
  
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