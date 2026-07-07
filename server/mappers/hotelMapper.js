function toNumber(value, fallback = null) {

    const number = Number(value);
  
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
  
  function mapHotel(hotel = {}, options = {}) {
  
    const currency =
      hotel.currency ??
      options.currency ??
      "USD";
  
    return {
  
      id: toString(
        hotel.id ??
        hotel.hotelId
      ),
  
      name: toString(
        hotel.name
      ),
  
      provider: toString(
        hotel.providerName
      ),
  
      stars: toNumber(
        hotel.starRating,
        0
      ),
  
      reviewScore: toNumber(
        hotel.reviewScore,
        null
      ),
  
      reviewText: toString(
        hotel.reviewText,
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
  
      amenities: Array.isArray(hotel.mainamenity)
        ? hotel.mainamenity
        : [],
  
      facilities: normalizeFacilities(
        hotel.facilities
      ),
  
    };
  
  }
  
  function mapHotels(hotels = [], options = {}) {
  
    if (!Array.isArray(hotels)) {
  
      return [];
  
    }
  
    return hotels
      .map((hotel) => mapHotel(hotel, options))
      .filter((hotel) => (
        hotel.id &&
        hotel.name
      ));
  
  }
  
  module.exports = {
    mapHotel,
    mapHotels,
  };