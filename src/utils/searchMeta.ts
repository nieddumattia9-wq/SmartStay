import {
  normalizeSmartPreference,
  normalizeSmartStaySearchProfile,
  type SmartStayPreference,
  type SmartStaySearchProfile,
} from "./smartStaySearchProfile";

export type StoredSearchMeta = {
  destinationLabel: string;
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
};

type CreateStoredSearchMetaInput = {
  destinationLabel: string;
  smartPreference: unknown;
  smartStayProfile?: unknown;
  budgetInput: unknown;
  currency: string;
  checkIn: string;
  checkOut: string;
  maxDistanceKm: unknown;
};

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

  return {
    destinationLabel:
      normalizeText(
        input.destinationLabel
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

  return {
    destinationLabel:
      normalizeText(
        source.destinationLabel
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
  };
}
