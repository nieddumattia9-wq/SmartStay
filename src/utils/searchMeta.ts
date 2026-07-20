import {
  normalizeSmartPreference,
  normalizeSmartStaySearchProfile,
  type SmartStayPreference,
  type SmartStaySearchProfile,
} from "./smartStaySearchProfile";

export type StoredSearchMeta = {
  destinationLabel: string;

  destinationLatitude:
    number | null;

  destinationLongitude:
    number | null;

  smartPreference:
    SmartStayPreference;

  smartStayProfile:
    SmartStaySearchProfile | null;

  totalBudget: number | null;
  currency: string;
  checkIn: string;
  checkOut: string;
  nightCount: number | null;
  maxDistanceKm: number | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
};

type CreateStoredSearchMetaInput = {
  destinationLabel: string;

  destinationLatitude?:
    unknown;

  destinationLongitude?:
    unknown;

  smartPreference: unknown;
  smartStayProfile?: unknown;
  budgetInput: unknown;
  currency: string;
  checkIn: string;
  checkOut: string;
  maxDistanceKm: unknown;
  adults?: unknown;
  children?: unknown;
  rooms?: unknown;
};

function normalizeCoordinate(
  value:
    unknown,
  minimum:
    number,
  maximum:
    number
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numericValue
    ) ||
    numericValue <
      minimum ||
    numericValue >
      maximum
  ) {
    return null;
  }

  return numericValue;
}

function normalizeLatitude(
  value:
    unknown
) {
  return normalizeCoordinate(
    value,
    -90,
    90
  );
}

function normalizeLongitude(
  value:
    unknown
) {
  return normalizeCoordinate(
    value,
    -180,
    180
  );
}

function normalizeCurrency(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return "EUR";
  }

  return value
    .trim()
    .toUpperCase();
}

function normalizeText(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizePositiveInteger(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isInteger(
      numericValue
    ) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function normalizeNonNegativeInteger(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isInteger(
      numericValue
    ) ||
    numericValue < 0
  ) {
    return null;
  }

  return numericValue;
}

function normalizeGuestComposition(
  adultsValue: unknown,
  childrenValue: unknown,
  roomsValue: unknown
) {
  const adults =
    normalizePositiveInteger(
      adultsValue
    );

  const children =
    normalizeNonNegativeInteger(
      childrenValue
    );

  const normalizedRooms =
    normalizePositiveInteger(
      roomsValue
    );

  const rooms =
    adults !== null &&
    normalizedRooms !== null &&
    normalizedRooms > adults
      ? null
      : normalizedRooms;

  return {
    adults,
    children,
    rooms,
  };
}

export function normalizeTotalBudget(
  value: unknown
): number | null {
  const normalizedValue =
    typeof value === "string"
      ? value
          .trim()
          .replace(",", ".")
      : value;

  if (
    normalizedValue === "" ||
    normalizedValue === null ||
    normalizedValue === undefined
  ) {
    return null;
  }

  const numericValue =
    Number(normalizedValue);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return Math.round(
    numericValue * 100
  ) / 100;
}

function parseIsoDateToUtc(
  value: unknown
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const timestamp =
    Date.UTC(
      year,
      month - 1,
      day
    );

  const parsedDate =
    new Date(timestamp);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !==
      month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

export function calculateStayNights(
  checkIn: unknown,
  checkOut: unknown
): number | null {
  const checkInTimestamp =
    parseIsoDateToUtc(checkIn);

  const checkOutTimestamp =
    parseIsoDateToUtc(checkOut);

  if (
    checkInTimestamp === null ||
    checkOutTimestamp === null ||
    checkOutTimestamp <=
      checkInTimestamp
  ) {
    return null;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const nightCount =
    (
      checkOutTimestamp -
      checkInTimestamp
    ) / millisecondsPerDay;

  if (
    !Number.isInteger(nightCount) ||
    nightCount <= 0
  ) {
    return null;
  }

  return nightCount;
}

const ALLOWED_DISTANCE_VALUES = [
  0.5,
  1,
  2,
  5,
  10,
] as const;

export function normalizeMaxDistanceKm(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(numericValue)
  ) {
    return null;
  }

  return ALLOWED_DISTANCE_VALUES
    .includes(
      numericValue as
        typeof ALLOWED_DISTANCE_VALUES[number]
    )
      ? numericValue
      : null;
}

export function createStoredSearchMeta(
  input: CreateStoredSearchMetaInput
): StoredSearchMeta {
  const legacySmartPreference =
    normalizeSmartPreference(
      input.smartPreference
    );

  const smartStayProfile =
    normalizeSmartStaySearchProfile(
      input.smartStayProfile,
      legacySmartPreference
    );

  const effectiveSmartPreference =
    smartStayProfile
      ?.effectivePreference ??
    legacySmartPreference;

  const guestComposition =
    normalizeGuestComposition(
      input.adults,
      input.children,
      input.rooms
    );

  return {
    destinationLabel:
      normalizeText(
        input.destinationLabel
      ),

    destinationLatitude:
      normalizeLatitude(
        input.destinationLatitude
      ),

    destinationLongitude:
      normalizeLongitude(
        input.destinationLongitude
      ),

    smartPreference:
      effectiveSmartPreference,

    smartStayProfile,

    totalBudget:
      normalizeTotalBudget(
        input.budgetInput
      ),

    currency:
      normalizeCurrency(
        input.currency
      ),

    checkIn:
      normalizeText(
        input.checkIn
      ),

    checkOut:
      normalizeText(
        input.checkOut
      ),

    nightCount:
      calculateStayNights(
        input.checkIn,
        input.checkOut
      ),

    maxDistanceKm:
      normalizeMaxDistanceKm(
        input.maxDistanceKm
      ),

    adults:
      guestComposition.adults,

    children:
      guestComposition.children,

    rooms:
      guestComposition.rooms,
  };
}

export function normalizeStoredSearchMeta(
  value: unknown
): StoredSearchMeta | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const checkIn =
    normalizeText(
      source.checkIn
    );

  const checkOut =
    normalizeText(
      source.checkOut
    );

  const legacySmartPreference =
    normalizeSmartPreference(
      source.smartPreference
    );

  const smartStayProfile =
    normalizeSmartStaySearchProfile(
      source.smartStayProfile,
      legacySmartPreference
    );

  const effectiveSmartPreference =
    smartStayProfile
      ?.effectivePreference ??
    legacySmartPreference;

  const guestComposition =
    normalizeGuestComposition(
      source.adults,
      source.children,
      source.rooms
    );

  return {
    destinationLabel:
      normalizeText(
        source.destinationLabel
      ),

    destinationLatitude:
      normalizeLatitude(
        source.destinationLatitude ??
        source.latitude ??
        source.lat
      ),

    destinationLongitude:
      normalizeLongitude(
        source.destinationLongitude ??
        source.longitude ??
        source.lng ??
        source.long
      ),

    smartPreference:
      effectiveSmartPreference,

    smartStayProfile,

    totalBudget:
      normalizeTotalBudget(
        source.totalBudget ??
        source.budget
      ),

    currency:
      normalizeCurrency(
        source.currency
      ),

    checkIn,

    checkOut,

    nightCount:
      calculateStayNights(
        checkIn,
        checkOut
      ),

    maxDistanceKm:
      normalizeMaxDistanceKm(
        source.maxDistanceKm ??
        source.distanceKm ??
        source.maxDistance
      ),

    adults:
      guestComposition.adults,

    children:
      guestComposition.children,

    rooms:
      guestComposition.rooms,
  };
}
