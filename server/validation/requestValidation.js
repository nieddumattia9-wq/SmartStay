"use strict";

const DATE_ONLY_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const SAFE_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@~-]*$/;

const PUBLIC_OFFER_ID_PATTERN =
  /^offer-[a-f0-9]{24}$/i;

const BOOKING_VERIFICATION_ID_PATTERN =
  /^verify-[a-f0-9]{36}$/i;

const BOOKING_HANDOFF_ID_PATTERN =
  /^handoff-[a-f0-9]{36}$/i;

const COUNTRY_CODE_PATTERN =
  /^[A-Za-z]{2}$/;

const CURRENCY_PATTERN =
  /^[A-Za-z]{3}$/;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001F\u007F]/;

const MAX_REQUEST_DEPTH =
  8;

const MAX_OBJECT_KEYS =
  64;

const MAX_ARRAY_ITEMS =
  32;

const MAX_GENERIC_STRING_LENGTH =
  512;

const MAX_DESTINATION_TEXT_LENGTH =
  200;

const MAX_DESTINATION_QUERY_LENGTH =
  120;

const MAX_SEARCH_ID_LENGTH =
  192;

const MAX_HOTEL_ID_LENGTH =
  256;

const MAX_ROOMS =
  8;

const MAX_ADULTS_PER_ROOM =
  8;

const MAX_CHILDREN_PER_ROOM =
  8;

const MAX_SMARTSTAY_CHILD_AGE =
  12;

const MAX_TOTAL_OCCUPANTS =
  32;

const MAX_STAY_NIGHTS =
  90;

const MIN_RADIUS_METERS =
  100;

const MAX_RADIUS_METERS =
  100_000;

const RESERVED_OBJECT_KEYS =
  new Set([
    "__proto__",
    "prototype",
    "constructor",
  ]);

const HOTEL_SEARCH_KEYS =
  new Set([
    "destinationId",
    "destinationType",
    "destinationName",
    "cityName",
    "countryCode",
    "lat",
    "long",
    "radiusMeters",
    "checkIn",
    "checkOut",
    "currency",
    "rooms",
  ]);

const ROOM_KEYS =
  new Set([
    "adults",
    "children",
    "childAges",
  ]);

function createRequestValidationError({
  code =
    "INVALID_REQUEST",
  message =
    "Invalid request.",
  status =
    400,
  field =
    null,
} = {}) {
  const error =
    new Error(message);

  error.code =
    code;

  error.status =
    status;

  error.field =
    field;

  error.exposePublic =
    true;

  error.isRequestValidationError =
    true;

  return error;
}

function isRequestValidationError(
  error
) {
  return error
    ?.isRequestValidationError ===
    true;
}

function isPlainObject(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  return (
    prototype ===
      Object.prototype ||
    prototype ===
      null
  );
}

function assertSafeStructure(
  value,
  {
    path =
      "body",
    depth =
      0,
    seen =
      new WeakSet(),
  } = {}
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return;
  }

  if (
    typeof value ===
      "string"
  ) {
    if (
      value.length >
      MAX_GENERIC_STRING_LENGTH
    ) {
      throw createRequestValidationError({
        code:
          "INVALID_REQUEST",
        message:
          "A request value is too long.",
        field:
          path,
      });
    }

    if (
      CONTROL_CHARACTER_PATTERN.test(
        value
      )
    ) {
      throw createRequestValidationError({
        code:
          "INVALID_REQUEST",
        message:
          "A request value contains unsupported characters.",
        field:
          path,
      });
    }

    return;
  }

  if (
    typeof value !==
      "object"
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "A request value has an unsupported type.",
      field:
        path,
    });
  }

  if (
    depth >=
    MAX_REQUEST_DEPTH
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "The request payload is nested too deeply.",
      field:
        path,
    });
  }

  if (
    seen.has(value)
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "The request payload contains a circular value.",
      field:
        path,
    });
  }

  seen.add(value);

  if (
    Array.isArray(value)
  ) {
    if (
      value.length >
      MAX_ARRAY_ITEMS
    ) {
      throw createRequestValidationError({
        code:
          "INVALID_REQUEST",
        message:
          "A request list contains too many items.",
        field:
          path,
      });
    }

    value.forEach(
      (
        item,
        index
      ) =>
        assertSafeStructure(
          item,
          {
            path:
              `${path}[${index}]`,
            depth:
              depth + 1,
            seen,
          }
        )
    );

    return;
  }

  if (
    !isPlainObject(value)
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "The request payload contains an unsupported object.",
      field:
        path,
    });
  }

  const keys =
    Object.keys(value);

  if (
    keys.length >
    MAX_OBJECT_KEYS
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "The request payload contains too many fields.",
      field:
        path,
    });
  }

  for (
    const key of
    keys
  ) {
    if (
      RESERVED_OBJECT_KEYS.has(
        key
      )
    ) {
      throw createRequestValidationError({
        code:
          "INVALID_REQUEST",
        message:
          "The request payload contains a reserved field.",
        field:
          `${path}.${key}`,
      });
    }

    assertSafeStructure(
      value[key],
      {
        path:
          `${path}.${key}`,
        depth:
          depth + 1,
        seen,
      }
    );
  }
}

function assertAllowedKeys(
  value,
  allowedKeys,
  path
) {
  for (
    const key of
    Object.keys(value)
  ) {
    if (
      !allowedKeys.has(key)
    ) {
      throw createRequestValidationError({
        code:
          "INVALID_REQUEST",
        message:
          "The request contains an unsupported field.",
        field:
          `${path}.${key}`,
      });
    }
  }
}

function validateJsonRequest(
  req
) {
  if (
    typeof req?.is !==
      "function" ||
    !req.is(
      "application/json"
    )
  ) {
    throw createRequestValidationError({
      code:
        "UNSUPPORTED_MEDIA_TYPE",
      message:
        "Content-Type must be application/json.",
      status:
        415,
      field:
        "headers.content-type",
    });
  }

  if (
    !isPlainObject(
      req.body
    )
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "The request body must be a JSON object.",
      field:
        "body",
    });
  }

  assertSafeStructure(
    req.body
  );

  return req.body;
}

function normalizeRequiredString(
  value,
  {
    field,
    code =
      "INVALID_REQUEST",
    message =
      "A required value is missing.",
    minLength =
      1,
    maxLength =
      MAX_GENERIC_STRING_LENGTH,
    pattern =
      null,
  } = {}
) {
  const normalized =
    typeof value ===
      "string"
      ? value.trim()
      : "";

  if (
    normalized.length <
      minLength ||
    normalized.length >
      maxLength ||
    (
      pattern &&
      !pattern.test(
        normalized
      )
    )
  ) {
    throw createRequestValidationError({
      code,
      message,
      field,
    });
  }

  return normalized;
}

function normalizeOptionalString(
  value,
  {
    field,
    maxLength =
      MAX_GENERIC_STRING_LENGTH,
    pattern =
      null,
  } = {}
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  return normalizeRequiredString(
    value,
    {
      field,
      maxLength,
      pattern,
      message:
        "A request value is invalid.",
    }
  );
}

function normalizeOptionalNumber(
  value,
  {
    field,
    minimum =
      Number.NEGATIVE_INFINITY,
    maximum =
      Number.POSITIVE_INFINITY,
    integer =
      false,
    code =
      "INVALID_REQUEST",
    message =
      "A numeric request value is invalid.",
  } = {}
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  const parsed =
    typeof value ===
      "number"
      ? value
      : typeof value ===
          "string" &&
        value.trim()
        ? Number(
            value.trim()
          )
        : Number.NaN;

  if (
    !Number.isFinite(parsed) ||
    (
      integer &&
      !Number.isInteger(
        parsed
      )
    ) ||
    parsed <
      minimum ||
    parsed >
      maximum
  ) {
    throw createRequestValidationError({
      code,
      message,
      field,
    });
  }

  return parsed;
}

function parseDateOnly(
  value,
  field
) {
  const normalized =
    normalizeRequiredString(
      value,
      {
        field,
        maxLength:
          10,
        pattern:
          DATE_ONLY_PATTERN,
        code:
          "INVALID_SEARCH_REQUEST",
        message:
          "Dates must use YYYY-MM-DD format.",
      }
    );

  const [
    year,
    month,
    day,
  ] = normalized
    .split("-")
    .map(Number);

  const timestamp =
    Date.UTC(
      year,
      month - 1,
      day
    );

  const date =
    new Date(timestamp);

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_SEARCH_REQUEST",
      message:
        "A search date is not valid.",
      field,
    });
  }

  return {
    value:
      normalized,
    timestamp,
  };
}

function validateRooms(
  rooms
) {
  if (
    !Array.isArray(rooms) ||
    rooms.length <
      1 ||
    rooms.length >
      MAX_ROOMS
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_SEARCH_REQUEST",
      message:
        `rooms must contain between 1 and ${MAX_ROOMS} rooms.`,
      field:
        "body.rooms",
    });
  }

  let totalOccupants =
    0;

  rooms.forEach(
    (
      room,
      index
    ) => {
      const path =
        `body.rooms[${index}]`;

      if (
        !isPlainObject(room)
      ) {
        throw createRequestValidationError({
          code:
            "INVALID_SEARCH_REQUEST",
          message:
            "Each room must be an object.",
          field:
            path,
        });
      }

      assertAllowedKeys(
        room,
        ROOM_KEYS,
        path
      );

      const adults =
        normalizeOptionalNumber(
          room.adults,
          {
            field:
              `${path}.adults`,
            minimum:
              1,
            maximum:
              MAX_ADULTS_PER_ROOM,
            integer:
              true,
          }
        );

      if (
        adults ===
          null
      ) {
        throw createRequestValidationError({
          code:
            "INVALID_SEARCH_REQUEST",
          message:
            "Each room needs at least one adult.",
          field:
            `${path}.adults`,
        });
      }

      const childAges =
        room.childAges ===
          undefined ||
        room.childAges ===
          null
          ? []
          : room.childAges;

      if (
        !Array.isArray(
          childAges
        ) ||
        childAges.length >
          MAX_CHILDREN_PER_ROOM
      ) {
        throw createRequestValidationError({
          code:
            "INVALID_SEARCH_REQUEST",
          message:
            `A room can contain at most ${MAX_CHILDREN_PER_ROOM} children.`,
          field:
            `${path}.childAges`,
        });
      }

      childAges.forEach(
        (
          age,
          childIndex
        ) => {
          normalizeOptionalNumber(
            age,
            {
              field:
                `${path}.childAges[${childIndex}]`,
              minimum:
                0,
              maximum:
                MAX_SMARTSTAY_CHILD_AGE,
              integer:
                true,
              code:
                "INVALID_SEARCH_REQUEST",
              message:
                `Children must be between 0 and ${MAX_SMARTSTAY_CHILD_AGE} years old. Guests aged ${MAX_SMARTSTAY_CHILD_AGE + 1} or older must be counted as adults.`,
            }
          );
        }
      );

      const declaredChildren =
        normalizeOptionalNumber(
          room.children,
          {
            field:
              `${path}.children`,
            minimum:
              0,
            maximum:
              MAX_CHILDREN_PER_ROOM,
            integer:
              true,
          }
        );

      if (
        declaredChildren !==
          null &&
        declaredChildren !==
          childAges.length
      ) {
        throw createRequestValidationError({
          code:
            "INVALID_SEARCH_REQUEST",
          message:
            "children must match the number of child ages.",
          field:
            `${path}.children`,
        });
      }

      totalOccupants +=
        adults +
        childAges.length;
    }
  );

  if (
    totalOccupants >
    MAX_TOTAL_OCCUPANTS
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_SEARCH_REQUEST",
      message:
        `A search can contain at most ${MAX_TOTAL_OCCUPANTS} guests.`,
      field:
        "body.rooms",
    });
  }
}

function validateDestinationSearchRequest(
  req
) {
  const body =
    validateJsonRequest(
      req
    );

  assertAllowedKeys(
    body,
    new Set([
      "query",
    ]),
    "body"
  );

  const query =
    normalizeRequiredString(
      body.query,
      {
        field:
          "body.query",
        code:
          "DESTINATION_QUERY_INVALID",
        message:
          `Search query must contain between 2 and ${MAX_DESTINATION_QUERY_LENGTH} characters.`,
        minLength:
          2,
        maxLength:
          MAX_DESTINATION_QUERY_LENGTH,
      }
    );

  return {
    query,
  };
}

function validateHotelSearchRequest(
  req
) {
  const body =
    validateJsonRequest(
      req
    );

  assertAllowedKeys(
    body,
    HOTEL_SEARCH_KEYS,
    "body"
  );

  const destinationId =
    normalizeOptionalString(
      body.destinationId,
      {
        field:
          "body.destinationId",
        maxLength:
          MAX_DESTINATION_TEXT_LENGTH,
      }
    );

  normalizeOptionalString(
    body.destinationType,
    {
      field:
        "body.destinationType",
      maxLength:
        64,
    }
  );

  const destinationName =
    normalizeOptionalString(
      body.destinationName,
      {
        field:
          "body.destinationName",
        maxLength:
          MAX_DESTINATION_TEXT_LENGTH,
      }
    );

  const cityName =
    normalizeOptionalString(
      body.cityName,
      {
        field:
          "body.cityName",
        maxLength:
          MAX_DESTINATION_TEXT_LENGTH,
      }
    );

  normalizeOptionalString(
    body.countryCode,
    {
      field:
        "body.countryCode",
      maxLength:
        2,
      pattern:
        COUNTRY_CODE_PATTERN,
    }
  );

  const latitude =
    normalizeOptionalNumber(
      body.lat,
      {
        field:
          "body.lat",
        minimum:
          -90,
        maximum:
          90,
      }
    );

  const longitude =
    normalizeOptionalNumber(
      body.long,
      {
        field:
          "body.long",
        minimum:
          -180,
        maximum:
          180,
      }
    );

  if (
    (
      latitude ===
        null
    ) !==
    (
      longitude ===
        null
    )
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_SEARCH_REQUEST",
      message:
        "Latitude and longitude must be provided together.",
      field:
        latitude ===
          null
          ? "body.lat"
          : "body.long",
    });
  }

  if (
    !destinationId &&
    !destinationName &&
    !cityName &&
    latitude ===
      null
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_SEARCH_REQUEST",
      message:
        "A destination id, destination name, or coordinates are required.",
      field:
        "body.destinationId",
    });
  }

  normalizeOptionalNumber(
    body.radiusMeters,
    {
      field:
        "body.radiusMeters",
      minimum:
        MIN_RADIUS_METERS,
      maximum:
        MAX_RADIUS_METERS,
      integer:
        true,
    }
  );

  const checkIn =
    parseDateOnly(
      body.checkIn,
      "body.checkIn"
    );

  const checkOut =
    parseDateOnly(
      body.checkOut,
      "body.checkOut"
    );

  const stayNights =
    Math.round(
      (
        checkOut.timestamp -
        checkIn.timestamp
      ) /
      86_400_000
    );

  if (
    stayNights <
      1 ||
    stayNights >
      MAX_STAY_NIGHTS
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_SEARCH_REQUEST",
      message:
        `The stay must contain between 1 and ${MAX_STAY_NIGHTS} nights.`,
      field:
        "body.checkOut",
    });
  }

  normalizeOptionalString(
    body.currency,
    {
      field:
        "body.currency",
      maxLength:
        3,
      pattern:
        CURRENCY_PATTERN,
    }
  );

  validateRooms(
    body.rooms
  );

  return body;
}

function normalizeIdentifier(
  value,
  {
    field,
    requiredCode,
    invalidCode,
    missingMessage,
    invalidMessage,
    maxLength,
    pattern =
      SAFE_IDENTIFIER_PATTERN,
    required =
      true,
  }
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    if (!required) {
      return null;
    }

    throw createRequestValidationError({
      code:
        requiredCode,
      message:
        missingMessage,
      field,
    });
  }

  return normalizeRequiredString(
    value,
    {
      field,
      code:
        invalidCode,
      message:
        invalidMessage,
      maxLength,
      pattern,
    }
  );
}

function normalizeSearchId(
  value,
  {
    required =
      true,
  } = {}
) {
  return normalizeIdentifier(
    value,
    {
      field:
        "searchId",
      requiredCode:
        "SEARCH_ID_REQUIRED",
      invalidCode:
        "SEARCH_ID_INVALID",
      missingMessage:
        "searchId is required.",
      invalidMessage:
        "searchId is invalid.",
      maxLength:
        MAX_SEARCH_ID_LENGTH,
      required,
    }
  );
}

function normalizeHotelId(
  value
) {
  return normalizeIdentifier(
    value,
    {
      field:
        "hotelId",
      requiredCode:
        "HOTEL_ID_REQUIRED",
      invalidCode:
        "HOTEL_ID_INVALID",
      missingMessage:
        "hotelId is required.",
      invalidMessage:
        "hotelId is invalid.",
      maxLength:
        MAX_HOTEL_ID_LENGTH,
    }
  );
}

function normalizeOfferId(
  value,
  {
    required =
      true,
  } = {}
) {
  return normalizeIdentifier(
    value,
    {
      field:
        "offerId",
      requiredCode:
        "OFFER_ID_REQUIRED",
      invalidCode:
        "OFFER_ID_INVALID",
      missingMessage:
        "offerId is required.",
      invalidMessage:
        "offerId is invalid.",
      maxLength:
        30,
      pattern:
        PUBLIC_OFFER_ID_PATTERN,
      required,
    }
  );
}

function validateContinueHotelSearchRequest(
  req
) {
  const body =
    validateJsonRequest(
      req
    );

  assertAllowedKeys(
    body,
    new Set([
      "searchId",
    ]),
    "body"
  );

  return {
    searchId:
      normalizeSearchId(
        body.searchId,
        {
          required:
            false,
        }
      ),
  };
}

function validateBookingOfferRecheckRequest(
  req
) {
  const body =
    validateJsonRequest(
      req
    );

  assertAllowedKeys(
    body,
    new Set([
      "searchId",
      "hotelId",
      "offerId",
    ]),
    "body"
  );

  return {
    searchId:
      normalizeSearchId(
        body.searchId
      ),
    hotelId:
      normalizeHotelId(
        body.hotelId
      ),
    offerId:
      normalizeOfferId(
        body.offerId
      ),
  };
}

function validateBookingHandoffRequest(
  req
) {
  const body =
    validateJsonRequest(
      req
    );

  assertAllowedKeys(
    body,
    new Set([
      "verificationId",
      "acceptChanges",
    ]),
    "body"
  );

  const verificationId =
    normalizeIdentifier(
      body.verificationId,
      {
        field:
          "verificationId",
        requiredCode:
          "BOOKING_VERIFICATION_ID_INVALID",
        invalidCode:
          "BOOKING_VERIFICATION_ID_INVALID",
        missingMessage:
          "The booking verification id is invalid.",
        invalidMessage:
          "The booking verification id is invalid.",
        maxLength:
          43,
        pattern:
          BOOKING_VERIFICATION_ID_PATTERN,
      }
    );

  if (
    typeof body.acceptChanges !==
      "boolean"
  ) {
    throw createRequestValidationError({
      code:
        "INVALID_REQUEST",
      message:
        "acceptChanges must be a boolean.",
      field:
        "body.acceptChanges",
    });
  }

  return {
    verificationId,
    acceptChanges:
      body.acceptChanges,
  };
}

function assertAllowedQueryKeys(
  req,
  allowedKeys
) {
  const query =
    isPlainObject(
      req.query
    )
      ? req.query
      : {};

  assertSafeStructure(
    query,
    {
      path:
        "query",
    }
  );

  assertAllowedKeys(
    query,
    allowedKeys,
    "query"
  );

  return query;
}

function validateBookingHandoffOpenRequest(
  req
) {
  const query =
    assertAllowedQueryKeys(
      req,
      new Set([
        "handoffId",
      ])
    );

  return {
    handoffId:
      normalizeIdentifier(
        query.handoffId,
        {
          field:
            "query.handoffId",
          requiredCode:
            "BOOKING_HANDOFF_ID_INVALID",
          invalidCode:
            "BOOKING_HANDOFF_ID_INVALID",
          missingMessage:
            "The booking handoff id is invalid.",
          invalidMessage:
            "The booking handoff id is invalid.",
          maxLength:
            44,
          pattern:
            BOOKING_HANDOFF_ID_PATTERN,
        }
      ),
  };
}

function validateBookingRedirectRequest(
  req
) {
  const query =
    assertAllowedQueryKeys(
      req,
      new Set([
        "searchId",
        "hotelId",
        "offerId",
      ])
    );

  return {
    searchId:
      normalizeSearchId(
        query.searchId
      ),
    hotelId:
      normalizeHotelId(
        query.hotelId
      ),
    offerId:
      normalizeOfferId(
        query.offerId
      ),
  };
}

function validateHotelDetailsRequest(
  req
) {
  const body =
    validateJsonRequest(
      req
    );

  assertAllowedKeys(
    body,
    new Set([
      "searchId",
      "hotelId",
      "offerId",
    ]),
    "body"
  );

  return {
    searchId:
      normalizeSearchId(
        body.searchId
      ),
    hotelId:
      normalizeHotelId(
        body.hotelId
      ),
    offerId:
      normalizeOfferId(
        body.offerId,
        {
          required:
            false,
        }
      ),
  };
}

function validateSearchReadRequest(
  req
) {
  const query =
    assertAllowedQueryKeys(
      req,
      new Set([
        "searchId",
      ])
    );

  return {
    searchId:
      normalizeSearchId(
        query.searchId,
        {
          required:
            false,
        }
      ),
  };
}

module.exports = {
  BOOKING_HANDOFF_ID_PATTERN,
  BOOKING_VERIFICATION_ID_PATTERN,
  PUBLIC_OFFER_ID_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
  createRequestValidationError,
  isPlainObject,
  isRequestValidationError,
  validateBookingHandoffOpenRequest,
  validateBookingHandoffRequest,
  validateBookingOfferRecheckRequest,
  validateBookingRedirectRequest,
  validateContinueHotelSearchRequest,
  validateDestinationSearchRequest,
  validateHotelDetailsRequest,
  validateHotelSearchRequest,
  validateJsonRequest,
  validateSearchReadRequest,
};
