function normalizeText(value = "") {

    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
  
  }
  
  function roundCoordinate(value) {
  
    const number =
      Number(value);
  
    if (!Number.isFinite(number)) {
  
      return null;
  
    }
  
    return number.toFixed(3);
  
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
  
    const name =
      normalizeText(hotel.name);
  
    const city =
      normalizeText(hotel.city);
  
    const country =
      normalizeText(hotel.country);
  
    const address =
      normalizeText(hotel.address);
  
    const latitude =
      roundCoordinate(hotel.latitude);
  
    const longitude =
      roundCoordinate(hotel.longitude);
  
    if (
      name &&
      latitude &&
      longitude
    ) {
  
      return [
        name,
        latitude,
        longitude,
      ].join("|");
  
    }
  
    if (
      name &&
      address
    ) {
  
      return [
        name,
        address,
        city,
        country,
      ].join("|");
  
    }
  
    return [
      name,
      city,
      country,
    ].join("|");
  
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
  
  function mergeOffers(firstOffers = [], secondOffers = []) {
  
    const offerMap =
      new Map();
  
    [
      ...firstOffers,
      ...secondOffers,
    ].forEach((offer) => {
  
      if (!offer) {
  
        return;
  
      }
  
      const key = [
        offer.id,
        offer.sourceProvider,
        offer.provider,
        offer.price,
        offer.currency,
      ].join("|");
  
      offerMap.set(
        key,
        offer
      );
  
    });
  
    return Array.from(
      offerMap.values()
    );
  
  }
  
  function getBestOffer(offers = []) {
  
    const validOffers =
      offers
        .filter((offer) => (
          offer &&
          Number.isFinite(Number(offer.price)) &&
          Number(offer.price) > 0
        ))
        .sort((firstOffer, secondOffer) => (
          Number(firstOffer.price) -
          Number(secondOffer.price)
        ));
  
    return validOffers[0] ?? null;
  
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
  
    const bestOffer =
      getBestOffer(offers);
  
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
  
    hotels.forEach((hotel) => {
  
      const mergeKey =
        createHotelMergeKey(hotel);
  
      if (!mergeKey) {
  
        return;
  
      }
  
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