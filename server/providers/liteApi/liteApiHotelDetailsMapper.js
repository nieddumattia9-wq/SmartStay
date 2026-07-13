function isPlainObject(
  value
) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}

function getPathValue(
  source,
  path
) {

  let current =
    source;

  for (
    const segment of
    path
  ) {

    if (
      current === null ||
      current === undefined
    ) {

      return undefined;

    }

    current =
      current[segment];

  }

  return current;

}

function asText(
  value
) {

  if (
    typeof value === "string"
  ) {

    return value.trim();

  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {

    return String(value);

  }

  return "";

}

function asFiniteNumber(
  value
) {

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

function pickText(
  sources,
  paths
) {

  for (
    const source of
    sources
  ) {

    if (!source) {
      continue;
    }

    for (
      const path of
      paths
    ) {

      const value =
        asText(
          getPathValue(
            source,
            path
          )
        );

      if (value) {
        return value;
      }

    }

  }

  return "";

}

function pickNumber(
  sources,
  paths
) {

  for (
    const source of
    sources
  ) {

    if (!source) {
      continue;
    }

    for (
      const path of
      paths
    ) {

      const value =
        asFiniteNumber(
          getPathValue(
            source,
            path
          )
        );

      if (value !== null) {
        return value;
      }

    }

  }

  return null;

}

function looksLikeHotel(
  value
) {

  if (!isPlainObject(value)) {
    return false;
  }

  return Boolean(
    pickText(
      [value],
      [
        ["hotelId"],
        ["hotelID"],
        ["hotel_id"],
        ["id"],
        ["name"],
        ["hotelName"],
      ]
    )
  );

}

function extractRecords(
  data
) {

  if (Array.isArray(data)) {

    return data.filter(
      isPlainObject
    );

  }

  if (!isPlainObject(data)) {

    return [];

  }

  const candidates = [
    data.hotels,
    data.hotelData,
    data.hotelsData,
    data.hotelDetails,
    data.details,
    data.staticData,
    data.items,
    data.results,
    data.data?.hotels,
    data.data?.hotel,
    data.data,
  ];

  for (
    const candidate of
    candidates
  ) {

    if (Array.isArray(candidate)) {

      return candidate.filter(
        isPlainObject
      );

    }

    if (!isPlainObject(candidate)) {
      continue;
    }

    const nestedCandidates = [
      candidate.hotels,
      candidate.items,
      candidate.results,
      candidate.data,
    ];

    for (
      const nestedCandidate of
      nestedCandidates
    ) {

      if (
        Array.isArray(
          nestedCandidate
        )
      ) {

        return nestedCandidate.filter(
          isPlainObject
        );

      }

    }

    if (
      looksLikeHotel(candidate)
    ) {

      return [
        candidate,
      ];

    }

  }

  return looksLikeHotel(data)
    ? [data]
    : [];

}

function getHotelObject(
  record
) {

  if (!isPlainObject(record)) {

    return {};

  }

  const candidate =
    record.hotel ??
    record.hotelData ??
    record.hotelInfo ??
    record.property ??
    record.accommodation;

  return isPlainObject(candidate)
    ? candidate
    : record;

}

function getHotelId(
  record,
  hotel
) {

  return pickText(
    [
      record,
      hotel,
    ],
    [
      ["hotelId"],
      ["hotelID"],
      ["hotel_id"],
      ["id"],
      ["code"],
      ["hotel", "id"],
      ["hotelData", "id"],
    ]
  );

}

function getItemText(
  item
) {

  if (
    typeof item === "string"
  ) {

    return item.trim();

  }

  if (!isPlainObject(item)) {

    return "";

  }

  return pickText(
    [item],
    [
      ["name"],
      ["title"],
      ["description"],
      ["label"],
      ["value"],
    ]
  );

}

function collectNamedItems(
  sources,
  keys
) {

  const values = [];

  for (
    const source of
    sources
  ) {

    if (!source) {
      continue;
    }

    for (
      const key of
      keys
    ) {

      const candidate =
        source[key];

      if (Array.isArray(candidate)) {

        values.push(
          ...candidate
        );

      }

    }

  }

  return Array.from(
    new Set(
      values
        .map(
          getItemText
        )
        .filter(
          Boolean
        )
    )
  );

}

function getImageUrl(
  image
) {

  if (
    typeof image === "string"
  ) {

    return image.trim();

  }

  if (!isPlainObject(image)) {

    return "";

  }

  return pickText(
    [image],
    [
      ["url"],
      ["uri"],
      ["link"],
      ["href"],
      ["src"],
    ]
  );

}

function collectImages(
  sources
) {

  const images = [];

  for (
    const source of
    sources
  ) {

    if (!source) {
      continue;
    }

    for (
      const key of
      [
        "images",
        "photos",
        "gallery",
      ]
    ) {

      if (
        Array.isArray(
          source[key]
        )
      ) {

        images.push(
          ...source[key]
        );

      }

    }

    for (
      const key of
      [
        "mainImage",
        "mainPhoto",
        "thumbnail",
        "image",
        "imageUrl",
      ]
    ) {

      if (source[key]) {

        images.push(
          source[key]
        );

      }

    }

  }

  return Array.from(
    new Set(
      images
        .map(
          getImageUrl
        )
        .filter(
          Boolean
        )
    )
  );

}

function buildAddress(
  sources
) {

  const directAddress =
    pickText(
      sources,
      [
        ["address"],
        ["fullAddress"],
        ["formattedAddress"],
        ["location", "address"],
        ["address", "fullAddress"],
        ["address", "addressLine"],
        ["address", "line1"],
      ]
    );

  if (directAddress) {

    return directAddress;

  }

  const parts = [
    pickText(
      sources,
      [
        ["street"],
        ["address", "street"],
      ]
    ),

    pickText(
      sources,
      [
        ["postalCode"],
        ["zipCode"],
        ["address", "postalCode"],
      ]
    ),

    pickText(
      sources,
      [
        ["city"],
        ["cityName"],
        ["address", "city"],
      ]
    ),
  ].filter(Boolean);

  return parts.join(", ");

}

function decodeCodePoint(
  value,
  radix
) {

  const codePoint =
    Number.parseInt(
      value,
      radix
    );

  if (
    !Number.isInteger(
      codePoint
    ) ||
    codePoint < 0 ||
    codePoint > 0x10ffff
  ) {

    return "";

  }

  try {

    return String.fromCodePoint(
      codePoint
    );

  } catch {

    return "";

  }

}

function decodeHtmlEntities(
  value
) {

  return value
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&apos;/gi,
      "'"
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (
        _match,
        value
      ) =>
        decodeCodePoint(
          value,
          16
        )
    )
    .replace(
      /&#([0-9]+);/g,
      (
        _match,
        value
      ) =>
        decodeCodePoint(
          value,
          10
        )
    );

}

function normalizeDescription(
  value
) {

  const rawDescription =
    asText(
      value
    );

  if (!rawDescription) {

    return null;

  }

  const decoded =
    decodeHtmlEntities(
      rawDescription
    );

  const plainText =
    decoded
      .replace(
        /<!--[\s\S]*?-->/g,
        " "
      )
      .replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style\b[^>]*>[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<\s*br\s*\/?\s*>/gi,
        "\n"
      )
      .replace(
        /<\s*\/\s*(p|div|li|h[1-6]|section|article)\s*>/gi,
        "\n"
      )
      .replace(
        /<\s*li\b[^>]*>/gi,
        "? "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /\r/g,
        ""
      )
      .replace(
        /[ \t]+\n/g,
        "\n"
      )
      .replace(
        /\n[ \t]+/g,
        "\n"
      )
      .replace(
        /[ \t]{2,}/g,
        " "
      )
      .replace(
        /\n{3,}/g,
        "\n\n"
      )
      .trim();

  return plainText ||
    null;

}

function normalizeCountry(
  value
) {

  const country =
    asText(
      value
    );

  if (!country) {

    return "";

  }

  if (
    !/^[a-z]{2}$/i.test(
      country
    )
  ) {

    return country;

  }

  const countryCode =
    country.toUpperCase();

  try {

    const displayNames =
      new Intl.DisplayNames(
        ["en"],
        {
          type:
            "region",
        }
      );

    return (
      displayNames.of(
        countryCode
      ) ||
      countryCode
    );

  } catch {

    return countryCode;

  }

}

function findMatchingRecord(
  records,
  requestedHotelId
) {

  const normalizedRequestedId =
    asText(requestedHotelId);

  if (!normalizedRequestedId) {

    return records[0] ??
      null;

  }

  return records.find(
    (record) => {

      const hotel =
        getHotelObject(record);

      return (
        getHotelId(
          record,
          hotel
        ) === normalizedRequestedId
      );

    }
  ) ??
  records[0] ??
  null;

}

function mapLiteApiHotelDetailsResponse(
  data,
  requestedHotelId = null
) {

  const records =
    extractRecords(data);

  const record =
    findMatchingRecord(
      records,
      requestedHotelId
    );

  if (!record) {

    return null;

  }

  const hotel =
    getHotelObject(record);

  const sources = [
    hotel,
    record,
  ];

  const sourceHotelId =
    getHotelId(
      record,
      hotel
    );

  if (!sourceHotelId) {

    return null;

  }

  const stars =
    pickNumber(
      sources,
      [
        ["stars"],
        ["starRating"],
        ["hotelStars"],
        ["star_rating"],
      ]
    );

  const reviewScore =
    pickNumber(
      sources,
      [
        ["reviewScore"],
        ["rating"],
        ["guestRating"],
        ["reviews", "score"],
      ]
    );

  const reviewCount =
    pickNumber(
      sources,
      [
        ["reviewCount"],
        ["numberOfReviews"],
        ["reviewsCount"],
        ["reviews", "count"],
      ]
    );

  return {
    sourceHotelId,

    name:
      pickText(
        sources,
        [
          ["name"],
          ["hotelName"],
          ["title"],
        ]
      ) ||
      "Accommodation",

    description:
      normalizeDescription(
        pickText(
          sources,
          [
            ["description"],
            ["hotelDescription"],
            ["overview"],
            ["shortDescription"],
            ["descriptions", "en"],
          ]
        )
      ),

    stars:
      stars ?? 0,

    reviewScore,

    reviewCount,

    address:
      buildAddress(
        sources
      ),

    city:
      pickText(
        sources,
        [
          ["city"],
          ["cityName"],
          ["location", "city"],
          ["address", "city"],
        ]
      ),

    country:
      normalizeCountry(
        pickText(
          sources,
          [
            ["country"],
            ["countryName"],
            ["location", "country"],
            ["address", "country"],
            ["country", "name"],
          ]
        )
      ),

    latitude:
      pickNumber(
        sources,
        [
          ["latitude"],
          ["lat"],
          ["location", "latitude"],
          ["coordinates", "latitude"],
        ]
      ),

    longitude:
      pickNumber(
        sources,
        [
          ["longitude"],
          ["lng"],
          ["lon"],
          ["location", "longitude"],
          ["coordinates", "longitude"],
        ]
      ),

    images:
      collectImages(
        sources
      ),

    amenities:
      collectNamedItems(
        sources,
        [
          "amenities",
          "hotelAmenities",
        ]
      ),

    facilities:
      collectNamedItems(
        sources,
        [
          "facilities",
          "hotelFacilities",
        ]
      ),

    checkIn:
      pickText(
        sources,
        [
          ["checkIn"],
          ["checkin"],
          ["checkInTime"],
          ["policies", "checkIn"],
        ]
      ) ||
      null,

    checkOut:
      pickText(
        sources,
        [
          ["checkOut"],
          ["checkout"],
          ["checkOutTime"],
          ["policies", "checkOut"],
        ]
      ) ||
      null,
  };

}

module.exports = {
  mapLiteApiHotelDetailsResponse,
};
