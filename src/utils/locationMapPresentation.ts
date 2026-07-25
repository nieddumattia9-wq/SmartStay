export type LocationMapPoint = {
  latitude:
    number;

  longitude:
    number;
};

export type GoogleMapsEmbedInput =
  LocationMapPoint & {
    apiKey:
      string;

    accommodationName:
      string;

    address:
      string;
  };

export function hasValidLocationCoordinates(
  latitude:
    number | null,
  longitude:
    number | null
) {
  return (
    typeof latitude ===
      "number" &&
    Number.isFinite(
      latitude
    ) &&
    latitude >=
      -90 &&
    latitude <=
      90 &&
    typeof longitude ===
      "number" &&
    Number.isFinite(
      longitude
    ) &&
    longitude >=
      -180 &&
    longitude <=
      180
  );
}

export function getValidLocationCoordinates(
  latitude:
    number | null,
  longitude:
    number | null
): LocationMapPoint | null {
  return hasValidLocationCoordinates(
    latitude,
    longitude
  )
    ? {
        latitude:
          latitude as number,
        longitude:
          longitude as number,
      }
    : null;
}

function formatCoordinate(
  value:
    number
) {
  return value.toFixed(
    6
  );
}

export function buildGoogleMapsSearchUrl({
  latitude,
  longitude,
}: LocationMapPoint) {
  const query =
    [
      formatCoordinate(
        latitude
      ),
      formatCoordinate(
        longitude
      ),
    ].join(",");

  const params =
    new URLSearchParams({
      api:
        "1",
      query,
    });

  return (
    "https://www.google.com/maps/search/?" +
    params.toString()
  );
}

export function buildGoogleMapsEmbedUrl({
  apiKey,
  accommodationName,
  address,
  latitude,
  longitude,
}: GoogleMapsEmbedInput) {
  const normalizedKey =
    apiKey.trim();

  if (!normalizedKey) {
    return null;
  }

  const center =
    [
      formatCoordinate(
        latitude
      ),
      formatCoordinate(
        longitude
      ),
    ].join(",");

  const query =
    [
      accommodationName.trim(),
      address.trim(),
    ]
      .filter(Boolean)
      .join(", ");

  if (query) {
    const params =
      new URLSearchParams({
        key:
          normalizedKey,
        q:
          query,
        center,
        zoom:
          "15",
        maptype:
          "roadmap",
        language:
          "en",
      });

    return (
      "https://www.google.com/maps/embed/v1/place?" +
      params.toString()
    );
  }

  const params =
    new URLSearchParams({
      key:
        normalizedKey,
      center,
      zoom:
        "15",
      maptype:
        "roadmap",
      language:
        "en",
    });

  return (
    "https://www.google.com/maps/embed/v1/view?" +
    params.toString()
  );
}
