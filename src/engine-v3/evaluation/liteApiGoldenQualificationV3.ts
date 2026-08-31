export const STAYOPTI_LITEAPI_GOLDEN_QUALIFICATION_VERSION_V3 =
  "stayopti.v3.liteapi-golden-qualification@1" as const;

export const STAYOPTI_LITEAPI_GOLDEN_QUALIFICATION_V3 =
  "QUALIFIED_FOR_BOUNDED_SANDBOX_PILOT" as const;

export const STAYOPTI_LITEAPI_GOLDEN_FIELD_AVAILABILITIES_V3 = [
  "NATIVE_IN_RATES_RESPONSE",
  "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE",
  "REQUIRES_EXISTING_READ_ONLY_ENDPOINT",
  "DOCUMENTED_BUT_NOT_IMPLEMENTED",
  "AMBIGUOUS",
  "NOT_AVAILABLE",
  "NOT_REQUIRED_FOR_PILOT",
] as const;

export type StayOptiLiteApiGoldenFieldAvailabilityV3 =
  typeof STAYOPTI_LITEAPI_GOLDEN_FIELD_AVAILABILITIES_V3[number];

export interface StayOptiLiteApiGoldenFieldCoverageV3 {
  goldenField: string;
  currentSource: string;
  availability: StayOptiLiteApiGoldenFieldAvailabilityV3;
  additionalHttpRequired: boolean;
  quality: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  decision: "USE" | "EXPLICIT_UNKNOWN" | "NOT_REQUIRED_FOR_PILOT";
}

export const STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3 = Object.freeze([
  { goldenField: "TOTAL_PRICE", currentSource: "rates mapped offer price/totalKnownCost", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "HIGH", decision: "USE" },
  { goldenField: "CURRENCY", currentSource: "rates mapped offer currency", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "HIGH", decision: "USE" },
  { goldenField: "TAXES_FEES", currentSource: "rates tax summary", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "AVAILABILITY", currentSource: "rates usable offers", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "ROOM_EVIDENCE", currentSource: "rates room mapping/room name", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "CANCELLATION", currentSource: "rates cancellation policies", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "HIGH", decision: "USE" },
  { goldenField: "MEAL_PLAN", currentSource: "rates meal plan", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "MEDIUM", decision: "NOT_REQUIRED_FOR_PILOT" },
  { goldenField: "RATING", currentSource: "includeHotelData/existing normalized hotel metadata", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "REVIEW_COUNT", currentSource: "includeHotelData/existing normalized hotel metadata", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "REVIEW_PROVENANCE", currentSource: "existing normalized review relation", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "LOW", decision: "EXPLICIT_UNKNOWN" },
  { goldenField: "LOCATION", currentSource: "includeHotelData/existing normalized coordinates", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "CATEGORY", currentSource: "includeHotelData/existing normalized hotel type/stars", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "AMENITIES_COMFORT", currentSource: "includeHotelData/existing normalized amenities", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "LOW", decision: "EXPLICIT_UNKNOWN" },
  { goldenField: "BOOKABILITY", currentSource: "rates mapped offer bookable flag", availability: "NATIVE_IN_RATES_RESPONSE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
  { goldenField: "RECHECK_STATUS", currentSource: "prebook boundary", availability: "NOT_REQUIRED_FOR_PILOT", additionalHttpRequired: false, quality: "UNKNOWN", decision: "NOT_REQUIRED_FOR_PILOT" },
  { goldenField: "RELIABILITY", currentSource: "existing normalized evidence/data confidence", availability: "AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE", additionalHttpRequired: false, quality: "MEDIUM", decision: "USE" },
] as const satisfies readonly StayOptiLiteApiGoldenFieldCoverageV3[]);

export const STAYOPTI_LITEAPI_GOLDEN_INTEGRATION_AUDIT_V3 = Object.freeze({
  method: "POST" as const,
  endpointPath: "/v3.0/hotels/rates" as const,
  nonSecretHeaders: ["Accept", "Content-Type", "X-Api-Key"] as const,
  currentConfiguredLimit: 80,
  currentOffsetBound: false,
  documentedLimitSupported: true,
  documentedOffsetSupported: true,
  currentMaxRatesPerHotel: 3,
  currentIncludeHotelData: true,
  currentRoomMapping: true,
  sessionIdConsistencyRequired: true,
  cityCountrySearchSupported: true,
  hotelIdSearchSupported: true,
  coordinateSearchSupported: true,
  defaultHttpTimeoutFormula: "max(configuredSeconds,6)*1000+3000",
  retryMax: 0,
  normalizedRawDataPersisted: false,
  currentMetadataEndpoint: "/v3.0/data/hotels",
  currentFacilitiesEndpoint: "/v3.0/data/facilities",
  prebookEndpointExcludedFromPilot: "/v3.0/rates/prebook",
});

export type StayOptiLiteApiGoldenOutcomeV3 =
  | "SUCCESS"
  | "NO_AVAILABILITY"
  | "REQUEST_INVALID"
  | "REQUIRED_FIELD_INVALID"
  | "AUTHENTICATION_FAILURE"
  | "ACCOUNT_SUSPENDED"
  | "RATE_LIMITED"
  | "RATE_LIMIT_SYSTEM_FAILURE"
  | "SUPPLIER_COMMUNICATION_FAILURE"
  | "LOCAL_TIMEOUT"
  | "MALFORMED_SUCCESS"
  | "CURRENCY_MISMATCH"
  | "EMPTY_USABLE_NORMALIZED_RESULT"
  | "UNCLASSIFIED_PROVIDER_FAILURE";

export interface StayOptiLiteApiGoldenOutcomeInputV3 {
  httpStatus: number | null;
  providerCode: number | string | null;
  localTimeout?: boolean;
  malformedSuccess?: boolean;
  currencyMismatch?: boolean;
  usableNormalizedCount?: number | null;
}

function normalizedCode(value: number | string | null) {
  return value === null ? "" : String(value).trim();
}

export function classifyLiteApiGoldenOutcomeV3(
  input: StayOptiLiteApiGoldenOutcomeInputV3,
): StayOptiLiteApiGoldenOutcomeV3 {
  const code = normalizedCode(input.providerCode);
  if (input.localTimeout === true) return "LOCAL_TIMEOUT";
  if (input.httpStatus === 200 && code === "2001") return "NO_AVAILABILITY";
  if (input.httpStatus === 400 && code === "4000") return "REQUEST_INVALID";
  if (input.httpStatus === 400 && code === "4002") return "REQUIRED_FIELD_INVALID";
  if (input.httpStatus === 401) return "AUTHENTICATION_FAILURE";
  if (code === "40302") return "ACCOUNT_SUSPENDED";
  if (code === "4290") return "RATE_LIMITED";
  if (code === "4291") return "RATE_LIMIT_SYSTEM_FAILURE";
  if (code === "4011") return "SUPPLIER_COMMUNICATION_FAILURE";
  if (input.httpStatus !== null && input.httpStatus >= 200 && input.httpStatus < 300) {
    if (input.malformedSuccess === true) return "MALFORMED_SUCCESS";
    if (input.currencyMismatch === true) return "CURRENCY_MISMATCH";
    if (input.usableNormalizedCount === 0) return "EMPTY_USABLE_NORMALIZED_RESULT";
    return "SUCCESS";
  }
  return "UNCLASSIFIED_PROVIDER_FAILURE";
}

export const STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3 = Object.freeze({
  environment: "LITEAPI_SANDBOX" as const,
  searchFamiliesMax: 5,
  goldenCasesMax: 20,
  ratesHttpMax: 5,
  metadataHttpMax: 0,
  placesHttpMax: 0,
  priceIndexHttpMax: 0,
  publicPriceHttpMax: 0,
  prebookHttpMax: 0,
  bookingHttpMax: 0,
  totalHttpMax: 5,
  retryMax: 0,
  redirectMax: 0,
  maxConcurrency: 1,
  minimumRequestIntervalMs: 1_000,
  wavesMax: 1,
  providerExhaustionRequired: false,
  collectionBoundary: "BOUNDED_PROVIDER_RETURNED_SNAPSHOT" as const,
});

export interface StayOptiLiteApiGoldenPilotPlanV3 {
  familyIds: string[];
  waveCount: number;
  ratesHttpMax: number;
  metadataHttpMax: 0;
  totalHttpMax: number;
  paidEndpointHttpMax: 0;
  valid: true;
}

const LOCAL_FAMILY_ID = /^SEARCH_FAMILY_[A-Z0-9_]{3,80}$/;

export function createLiteApiGoldenPilotPlanV3(
  familyIds: readonly string[],
  waveCount = 1,
): StayOptiLiteApiGoldenPilotPlanV3 {
  if (waveCount !== 1) throw new Error("V3_17Q_SECOND_WAVE_PROHIBITED");
  if (familyIds.length === 0 || familyIds.length > STAYOPTI_LITEAPI_GOLDEN_PILOT_LIMITS_V3.searchFamiliesMax) {
    throw new Error("V3_17Q_PILOT_FAMILY_LIMIT_EXCEEDED");
  }
  if (new Set(familyIds).size !== familyIds.length || familyIds.some((id) => !LOCAL_FAMILY_ID.test(id))) {
    throw new Error("V3_17Q_PILOT_FAMILY_PLAN_INVALID");
  }
  return {
    familyIds: [...familyIds],
    waveCount,
    ratesHttpMax: familyIds.length,
    metadataHttpMax: 0,
    totalHttpMax: familyIds.length,
    paidEndpointHttpMax: 0,
    valid: true,
  };
}

export function summarizeLiteApiGoldenFieldCoverageV3() {
  const count = (availability: StayOptiLiteApiGoldenFieldAvailabilityV3) =>
    STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3.filter((entry) => entry.availability === availability).length;
  return {
    total: STAYOPTI_LITEAPI_GOLDEN_FIELD_COVERAGE_V3.length,
    nativeInRates: count("NATIVE_IN_RATES_RESPONSE"),
    fromExistingNormalizedCache: count("AVAILABLE_FROM_EXISTING_NORMALIZED_CACHE"),
    requiringAdditionalEndpoint: count("REQUIRES_EXISTING_READ_ONLY_ENDPOINT"),
    ambiguous: count("AMBIGUOUS"),
    notAvailable: count("NOT_AVAILABLE"),
    notRequiredForPilot: count("NOT_REQUIRED_FOR_PILOT"),
  };
}
