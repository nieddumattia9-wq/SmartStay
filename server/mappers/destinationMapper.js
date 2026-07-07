function normalizeCountry(country) {

    if (!country) {
  
      return "";
  
    }
  
    if (typeof country === "string") {
  
      return country;
  
    }
  
    return (
      country.name ??
      country.code ??
      ""
    );
  
  }
  
  function mapDestination(destination = {}) {
  
    return {
  
      id: String(
        destination.id ??
        destination.referenceId ??
        ""
      ),
  
      name:
        destination.fullName ??
        destination.name ??
        "",
  
      country: normalizeCountry(
        destination.country
      ),
  
      type:
        destination.type ??
        "",
  
      city:
        destination.city ??
        "",
  
      referenceId:
        destination.referenceId ??
        null,
  
      lat:
        destination.coordinates?.lat ??
        destination.lat ??
        null,
  
      lng:
        destination.coordinates?.long ??
        destination.coordinates?.lng ??
        destination.long ??
        null,
  
    };
  
  }
  
  function mapDestinations(destinations = []) {
  
    if (!Array.isArray(destinations)) {
  
      return [];
  
    }
  
    return destinations
      .map(mapDestination)
      .filter((destination) => (
        destination.id &&
        destination.name
      ));
  
  }
  
  module.exports = {
    mapDestination,
    mapDestinations,
  };