"use strict";

function extractLiteApiFacilityRecords(
  data
) {
  const candidates = [
    data,
    data?.data,
    data?.facilities,
    data?.items,
    data?.results,
    data?.result?.data,
    data?.result?.facilities,
    data?.data?.facilities,
    data?.data?.items,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      Array.isArray(
        candidate
      )
    ) {
      return candidate;
    }
  }

  return [];
}

function normalizeLiteApiFacilityId(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  return normalized ||
    null;
}

function normalizeLiteApiFacilityText(
  value
) {
  if (
    typeof value ===
      "string"
  ) {
    return value.trim();
  }

  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return "";
  }

  const candidates = [
    value.en,
    value.english,
    value.name,
    value.label,
    value.value,
    value.description,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      typeof candidate ===
        "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return "";
}

function getLiteApiFacilityTranslationName(
  record,
  language =
    "en"
) {
  const translations =
    Array.isArray(
      record?.translation
    )
      ? record.translation
      : Array.isArray(
          record?.translations
        )
        ? record.translations
        : [];

  const normalizedLanguage =
    String(
      language
    )
      .trim()
      .toLowerCase();

  const preferredTranslation =
    translations.find(
      (
        translation
      ) => {
        if (
          !translation ||
          typeof translation !==
            "object" ||
          Array.isArray(
            translation
          )
        ) {
          return false;
        }

        const translationLanguage =
          String(
            translation.lang ??
            translation.language ??
            translation.locale ??
            ""
          )
            .trim()
            .toLowerCase();

        return (
          translationLanguage ===
            normalizedLanguage ||
          translationLanguage.startsWith(
            normalizedLanguage +
            "-"
          )
        );
      }
    );

  const candidates = [
    preferredTranslation
      ?.facility,

    preferredTranslation
      ?.name,

    preferredTranslation
      ?.label,

    ...translations.flatMap(
      (
        translation
      ) => [
        translation
          ?.facility,

        translation
          ?.name,

        translation
          ?.label,
      ]
    ),
  ];

  for (
    const candidate
    of candidates
  ) {
    const text =
      normalizeLiteApiFacilityText(
        candidate
      );

    if (text) {
      return text;
    }
  }

  return "";
}

function getLiteApiFacilityName(
  record
) {
  if (
    !record ||
    typeof record !==
      "object" ||
    Array.isArray(
      record
    )
  ) {
    return "";
  }

  const candidates = [
    getLiteApiFacilityTranslationName(
      record,
      "en"
    ),

    record.facility,
    record.name,
    record.facilityName,
    record.facility_name,
    record.title,
    record.label,
    record.description,
  ];

  for (
    const candidate
    of candidates
  ) {
    const text =
      normalizeLiteApiFacilityText(
        candidate
      );

    if (text) {
      return text;
    }
  }

  return "";
}

function createLiteApiFacilityNameIndex(
  data
) {
  const index =
    new Map();

  for (
    const record
    of extractLiteApiFacilityRecords(
      data
    )
  ) {
    if (
      !record ||
      typeof record !==
        "object" ||
      Array.isArray(
        record
      )
    ) {
      continue;
    }

    const id =
      normalizeLiteApiFacilityId(
        record.id ??
        record.facilityId ??
        record.facility_id ??
        record.code
      );

    const name =
      getLiteApiFacilityName(
        record
      );

    if (
      !id ||
      !name
    ) {
      continue;
    }

    index.set(
      id,
      name
    );
  }

  return index;
}

function normalizeLiteApiStringArray(
  value
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ) => {
        if (
          typeof item ===
            "string"
        ) {
          return item.trim();
        }

        if (
          item &&
          typeof item ===
            "object" &&
          !Array.isArray(
            item
          )
        ) {
          return normalizeLiteApiFacilityText(
            item
          );
        }

        return "";
      }
    )
    .filter(
      Boolean
    );
}

function enrichLiteApiHotelMetadataFacilities(
  hotelMetadata,
  facilityData
) {
  if (
    !hotelMetadata ||
    !Array.isArray(
      hotelMetadata.hotelData
    )
  ) {
    return hotelMetadata;
  }

  const facilityNames =
    createLiteApiFacilityNameIndex(
      facilityData
    );

  if (
    facilityNames.size ===
      0
  ) {
    return hotelMetadata;
  }

  return {
    ...hotelMetadata,

    hotelData:
      hotelMetadata
        .hotelData
        .map(
          (
            hotel
          ) => {
            if (
              !hotel ||
              typeof hotel !==
                "object" ||
              Array.isArray(
                hotel
              )
            ) {
              return hotel;
            }

            const resolvedNames =
              (
                Array.isArray(
                  hotel.facilityIds
                )
                  ? hotel.facilityIds
                  : []
              )
                .map(
                  (
                    facilityId
                  ) =>
                    facilityNames.get(
                      normalizeLiteApiFacilityId(
                        facilityId
                      )
                    ) ??
                    ""
                )
                .filter(
                  Boolean
                );

            const existingNames = [
              ...normalizeLiteApiStringArray(
                hotel.amenities
              ),

              ...normalizeLiteApiStringArray(
                hotel.facilities
              ),

              ...normalizeLiteApiStringArray(
                hotel.hotelFacilities
              ),
            ];

            const names = [
              ...new Set([
                ...existingNames,
                ...resolvedNames,
              ]),
            ];

            return names.length >
              0
              ? {
                  ...hotel,

                  facilities:
                    names,

                  hotelFacilities:
                    names,
                }
              : hotel;
          }
        ),
  };
}

module.exports = {
  enrichLiteApiHotelMetadataFacilities,
};
