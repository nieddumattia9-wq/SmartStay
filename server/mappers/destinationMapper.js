function mapDestination(destination) {
    return {
      id: destination.id,
  
      name: destination.fullName,
  
      country: destination.country,
  
      type: destination.type,
  
      city: destination.city,
  
      referenceId: destination.referenceId,
  
      lat: destination.coordinates?.lat,
  
      lng: destination.coordinates?.long,
    };
  }
  
  function mapDestinations(destinations) {
    return destinations.map(mapDestination);
  }
  
  module.exports = {
    mapDestination,
    mapDestinations,
  };