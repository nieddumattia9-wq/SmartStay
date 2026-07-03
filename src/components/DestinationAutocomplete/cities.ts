export type City = {
    id: string;
    name: string;
    country: string;
  };
  
  export const cities: City[] = [
    { id: "paris-fr", name: "Paris", country: "France" },
    { id: "london-gb", name: "London", country: "United Kingdom" },
    { id: "new-york-us", name: "New York", country: "United States" },
    { id: "tokyo-jp", name: "Tokyo", country: "Japan" },
    { id: "dubai-ae", name: "Dubai", country: "United Arab Emirates" },
    { id: "singapore-sg", name: "Singapore", country: "Singapore" },
    { id: "barcelona-es", name: "Barcelona", country: "Spain" },
    { id: "rome-it", name: "Rome", country: "Italy" },
    { id: "amsterdam-nl", name: "Amsterdam", country: "Netherlands" },
    { id: "berlin-de", name: "Berlin", country: "Germany" },
    { id: "madrid-es", name: "Madrid", country: "Spain" },
    { id: "lisbon-pt", name: "Lisbon", country: "Portugal" },
    { id: "vienna-at", name: "Vienna", country: "Austria" },
    { id: "prague-cz", name: "Prague", country: "Czech Republic" },
    { id: "budapest-hu", name: "Budapest", country: "Hungary" },
    { id: "athens-gr", name: "Athens", country: "Greece" },
    { id: "istanbul-tr", name: "Istanbul", country: "Turkey" },
    { id: "cairo-eg", name: "Cairo", country: "Egypt" },
    { id: "cape-town-za", name: "Cape Town", country: "South Africa" },
    { id: "marrakech-ma", name: "Marrakech", country: "Morocco" },
    { id: "nairobi-ke", name: "Nairobi", country: "Kenya" },
    { id: "mumbai-in", name: "Mumbai", country: "India" },
    { id: "delhi-in", name: "Delhi", country: "India" },
    { id: "bangkok-th", name: "Bangkok", country: "Thailand" },
    { id: "bali-id", name: "Bali", country: "Indonesia" },
    { id: "jakarta-id", name: "Jakarta", country: "Indonesia" },
    { id: "hanoi-vn", name: "Hanoi", country: "Vietnam" },
    { id: "ho-chi-minh-vn", name: "Ho Chi Minh City", country: "Vietnam" },
    { id: "seoul-kr", name: "Seoul", country: "South Korea" },
    { id: "beijing-cn", name: "Beijing", country: "China" },
    { id: "shanghai-cn", name: "Shanghai", country: "China" },
    { id: "hong-kong-hk", name: "Hong Kong", country: "China" },
    { id: "taipei-tw", name: "Taipei", country: "Taiwan" },
    { id: "sydney-au", name: "Sydney", country: "Australia" },
    { id: "melbourne-au", name: "Melbourne", country: "Australia" },
    { id: "auckland-nz", name: "Auckland", country: "New Zealand" },
    { id: "los-angeles-us", name: "Los Angeles", country: "United States" },
    { id: "san-francisco-us", name: "San Francisco", country: "United States" },
    { id: "chicago-us", name: "Chicago", country: "United States" },
    { id: "miami-us", name: "Miami", country: "United States" },
    { id: "boston-us", name: "Boston", country: "United States" },
    { id: "washington-us", name: "Washington D.C.", country: "United States" },
    { id: "las-vegas-us", name: "Las Vegas", country: "United States" },
    { id: "toronto-ca", name: "Toronto", country: "Canada" },
    { id: "vancouver-ca", name: "Vancouver", country: "Canada" },
    { id: "montreal-ca", name: "Montreal", country: "Canada" },
    { id: "mexico-city-mx", name: "Mexico City", country: "Mexico" },
    { id: "cancun-mx", name: "Cancun", country: "Mexico" },
    { id: "rio-br", name: "Rio de Janeiro", country: "Brazil" },
    { id: "sao-paulo-br", name: "Sao Paulo", country: "Brazil" },
    { id: "buenos-aires-ar", name: "Buenos Aires", country: "Argentina" },
    { id: "santiago-cl", name: "Santiago", country: "Chile" },
    { id: "lima-pe", name: "Lima", country: "Peru" },
    { id: "bogota-co", name: "Bogota", country: "Colombia" },
    { id: "medellin-co", name: "Medellin", country: "Colombia" },
    { id: "dublin-ie", name: "Dublin", country: "Ireland" },
    { id: "edinburgh-gb", name: "Edinburgh", country: "United Kingdom" },
    { id: "manchester-gb", name: "Manchester", country: "United Kingdom" },
    { id: "brussels-be", name: "Brussels", country: "Belgium" },
    { id: "zurich-ch", name: "Zurich", country: "Switzerland" },
    { id: "geneva-ch", name: "Geneva", country: "Switzerland" },
    { id: "copenhagen-dk", name: "Copenhagen", country: "Denmark" },
    { id: "stockholm-se", name: "Stockholm", country: "Sweden" },
    { id: "oslo-no", name: "Oslo", country: "Norway" },
    { id: "helsinki-fi", name: "Helsinki", country: "Finland" },
    { id: "warsaw-pl", name: "Warsaw", country: "Poland" },
    { id: "krakow-pl", name: "Krakow", country: "Poland" },
    { id: "bucharest-ro", name: "Bucharest", country: "Romania" },
    { id: "sofia-bg", name: "Sofia", country: "Bulgaria" },
    { id: "belgrade-rs", name: "Belgrade", country: "Serbia" },
    { id: "zagreb-hr", name: "Zagreb", country: "Croatia" },
    { id: "dubrovnik-hr", name: "Dubrovnik", country: "Croatia" },
    { id: "split-hr", name: "Split", country: "Croatia" },
    { id: "milan-it", name: "Milan", country: "Italy" },
    { id: "florence-it", name: "Florence", country: "Italy" },
    { id: "venice-it", name: "Venice", country: "Italy" },
    { id: "naples-it", name: "Naples", country: "Italy" },
    { id: "munich-de", name: "Munich", country: "Germany" },
    { id: "frankfurt-de", name: "Frankfurt", country: "Germany" },
    { id: "hamburg-de", name: "Hamburg", country: "Germany" },
    { id: "porto-pt", name: "Porto", country: "Portugal" },
    { id: "seville-es", name: "Seville", country: "Spain" },
    { id: "valencia-es", name: "Valencia", country: "Spain" },
    { id: "nice-fr", name: "Nice", country: "France" },
    { id: "lyon-fr", name: "Lyon", country: "France" },
    { id: "marseille-fr", name: "Marseille", country: "France" },
    { id: "reykjavik-is", name: "Reykjavik", country: "Iceland" },
    { id: "tel-aviv-il", name: "Tel Aviv", country: "Israel" },
    { id: "jerusalem-il", name: "Jerusalem", country: "Israel" },
    { id: "doha-qa", name: "Doha", country: "Qatar" },
    { id: "abu-dhabi-ae", name: "Abu Dhabi", country: "United Arab Emirates" },
    { id: "riyadh-sa", name: "Riyadh", country: "Saudi Arabia" },
    { id: "muscat-om", name: "Muscat", country: "Oman" },
    { id: "manila-ph", name: "Manila", country: "Philippines" },
    { id: "cebu-ph", name: "Cebu", country: "Philippines" },
    { id: "kuala-lumpur-my", name: "Kuala Lumpur", country: "Malaysia" },
    { id: "phuket-th", name: "Phuket", country: "Thailand" },
    { id: "chiang-mai-th", name: "Chiang Mai", country: "Thailand" },
    { id: "colombo-lk", name: "Colombo", country: "Sri Lanka" },
    { id: "kathmandu-np", name: "Kathmandu", country: "Nepal" },
    { id: "ulaanbaatar-mn", name: "Ulaanbaatar", country: "Mongolia" },
    { id: "osaka-jp", name: "Osaka", country: "Japan" },
    { id: "kyoto-jp", name: "Kyoto", country: "Japan" },
    { id: "honolulu-us", name: "Honolulu", country: "United States" },
  ];
  
  export function formatCityLabel(city: City): string {
    return `${city.name}, ${city.country}`;
  }
  
  export function filterCities(query: string): City[] {
    const normalized = query.trim().toLowerCase();
  
    if (!normalized) return [];
  
    const startsWith = cities.filter((city) => {
      const name = city.name.toLowerCase();
      const country = city.country.toLowerCase();
      const label = formatCityLabel(city).toLowerCase();
  
      return (
        name.startsWith(normalized) ||
        country.startsWith(normalized) ||
        label.startsWith(normalized)
      );
    });
  
    const includes = cities.filter((city) => {
      if (startsWith.includes(city)) return false;
  
      const name = city.name.toLowerCase();
      const country = city.country.toLowerCase();
      const label = formatCityLabel(city).toLowerCase();
  
      return (
        name.includes(normalized) ||
        country.includes(normalized) ||
        label.includes(normalized)
      );
    });
  
    return [...startsWith, ...includes];
  }