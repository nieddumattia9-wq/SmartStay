import { stableSerializeV3 } from "../contract/stableHashV3";

import {
  STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3,
  type ExternalHotelChoiceSessionV3,
  type StayOptiExternalBiasFlagV3,
  type StayOptiExternalHotelAlternativeV3,
  type StayOptiExternalKnownValueV3,
} from "./externalHotelChoiceContractV3";
import { createExternalHotelChoiceSessionFingerprintV3 } from "./externalHotelChoiceReplayV3";

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_ADAPTER_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-external-adapter@1" as const;

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ID_V3 =
  "SERPAPI_GOOGLE_HOTELS" as const;

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3 =
  "REAL_PUBLIC_MARKET_CHOICE_SET_SOURCE" as const;

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3 =
  "REAL_PUBLIC_MARKET_SNAPSHOT_CANDIDATE" as const;

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_OFFICIAL_URLS_V3 = Object.freeze({
  api: "https://serpapi.com/google-hotels-api",
  pricing: "https://serpapi.com/pricing",
  terms: "https://serpapi.com/legal",
  googleRanking: "https://support.google.com/travel/answer/6276008?hl=en-EN",
  googleTaxPolicy: "https://support.google.com/hotelprices/answer/6064432?hl=en",
});

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_QUALIFICATION_V3 = Object.freeze({
  qualification: "CONDITIONAL" as const,
  sourceRole: STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3,
  recordClass: STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3,
  accountRequired: true,
  individualAccountEligibility: "NOT_STATED" as const,
  pivaRequirement: "NOT_STATED" as const,
  paymentCardRequired: "UNKNOWN" as const,
  freePlanAvailable: true,
  freePlanSearchesPerMonth: 250,
  hourlyLimit: 50,
  termsAcceptanceRequired: true,
  internalEvaluationUse: "CONDITIONAL" as const,
  persistentStorage: "CONDITIONAL" as const,
  redistribution: "PROHIBITED_WITHOUT_EXPRESS_WRITTEN_PERMISSION" as const,
  apiCallsAuthorizedInQualification: false,
  automaticGoldenAdmission: false,
  automaticV3WeightChange: false,
});

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_BIAS_REGISTER_V3 = Object.freeze([
  "GOOGLE_RANKING_BIAS",
  "SPONSORED_OR_ADVERTISING_BIAS",
  "LOWEST_PRICE_AGGREGATION_BIAS",
  "SELLER_COVERAGE_BIAS",
  "CACHE_OR_FRESHNESS_BIAS",
  "GEOLOCATION_BIAS",
  "LANGUAGE_AND_MARKET_BIAS",
  "CURRENCY_CONVERSION_UNCERTAINTY",
  "INCOMPLETE_TAX_VISIBILITY",
  "MISSING_CANCELLATION_CONDITIONS",
  "COLLAPSED_ROOM_OR_RATE_PLAN",
  "PROVIDER_AVAILABILITY_MISMATCH",
  "PERSONALIZATION_UNCERTAINTY",
  "POPULARITY_BIAS",
  "REVIEW_SOURCE_AGGREGATION",
  "UNOBSERVED_ALTERNATIVES",
  "PAGINATION_TRUNCATION",
  "PROPERTY_DETAIL_ENRICHMENT_ASYMMETRY",
] as const);

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_ALLOWED_USES_V3 = Object.freeze([
  "OFFLINE_PROVIDER_NEUTRAL_REPLAY_AFTER_TERMS_ADMISSION",
  "OFFLINE_V2_V3_COMPARISON_AFTER_TERMS_ADMISSION",
  "BLIND_JUDGMENT_AFTER_TERMS_ADMISSION",
  "ROBUSTNESS_ANALYSIS_AFTER_TERMS_ADMISSION",
  "MISSINGNESS_ANALYSIS",
  "PROVIDER_DEPENDENCE_TESTING",
  "CONTROLLED_COUNTERFACTUAL_BASE",
] as const);

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_PROHIBITED_CLAIMS_V3 = Object.freeze([
  "BOOKING_OBSERVED",
  "CLICK_OUT",
  "POST_STAY_SATISFIED",
  "WOULD_CHOOSE_AGAIN",
  "OBJECTIVE_BEST_CHOICE",
  "LITEAPI_PRODUCTION_SNAPSHOT",
  "EXACT_BOOKABLE_TOTAL",
  "COMPLETE_MARKET_COVERAGE",
  "GENERAL_MARKET_FREQUENCY",
  "LIVE_GOLDEN_CORPUS",
  "AUTOMATIC_V3_POLICY_IMPROVEMENT",
] as const);

export const STAYOPTI_SERPAPI_GOOGLE_HOTELS_PILOT_PLAN_V3 = Object.freeze({
  planVersion: "stayopti.v3.serpapi-google-hotels-12-session-pilot-plan@1" as const,
  proposedIndependentSessions: 12 as const,
  maximumMainSearches: 12 as const,
  maximumPropertyDetailEnrichmentsPerSession: 3 as const,
  proposedMaximumApiCalls: 48 as const,
  concurrency: 1 as const,
  indiscriminateRetryAllowed: false as const,
  automaticPaginationBeyondCapAllowed: false as const,
  noCacheDecision: "DEFERRED_TO_AUTHORIZATION_GATE" as const,
  relativeDatesMaterializedOnlyAtExecution: true as const,
  sessions: Object.freeze([
    Object.freeze({ id: "SERP_PILOT_01", traveler: "SOLO", stay: "ONE_NIGHT", leadTime: "SHORT", priority: "BUDGET", market: "LOWER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_02", traveler: "SOLO", stay: "MEDIUM", leadTime: "MEDIUM", priority: "QUALITY", market: "HIGHER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_03", traveler: "COUPLE", stay: "ONE_NIGHT", leadTime: "LONG", priority: "CANCELLATION", market: "MIXED_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_04", traveler: "COUPLE", stay: "MEDIUM", leadTime: "SHORT", priority: "BUDGET", market: "HIGHER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_05", traveler: "COUPLE", stay: "LONG", leadTime: "LONG", priority: "QUALITY", market: "LOWER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_06", traveler: "FAMILY", stay: "MEDIUM", leadTime: "MEDIUM", priority: "CANCELLATION", market: "MIXED_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_07", traveler: "FAMILY", stay: "LONG", leadTime: "LONG", priority: "BUDGET", market: "HIGHER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_08", traveler: "SOLO", stay: "MEDIUM", leadTime: "SHORT", priority: "CANCELLATION", market: "LOWER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_09", traveler: "COUPLE", stay: "ONE_NIGHT", leadTime: "MEDIUM", priority: "QUALITY", market: "MIXED_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_10", traveler: "FAMILY", stay: "MEDIUM", leadTime: "LONG", priority: "QUALITY", market: "HIGHER_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_11", traveler: "SOLO", stay: "LONG", leadTime: "MEDIUM", priority: "BUDGET", market: "MIXED_PRICE" }),
    Object.freeze({ id: "SERP_PILOT_12", traveler: "FAMILY", stay: "ONE_NIGHT", leadTime: "SHORT", priority: "CANCELLATION", market: "LOWER_PRICE" }),
  ]),
});

export interface SerpApiGoogleHotelsMoneyV3 {
  extracted_lowest?: number;
  before_taxes_fees?: string;
  extracted_before_taxes_fees?: number;
}

export interface SerpApiGoogleHotelsPriceV3 extends SerpApiGoogleHotelsMoneyV3 {
  source?: string;
}

export interface SerpApiGoogleHotelsPropertyV3 {
  type?: string;
  name?: string;
  property_token?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
  hotel_class?: string | number;
  overall_rating?: number;
  reviews?: number;
  rate_per_night?: SerpApiGoogleHotelsMoneyV3;
  total_rate?: SerpApiGoogleHotelsMoneyV3;
  prices?: SerpApiGoogleHotelsPriceV3[];
  amenities?: string[];
  free_cancellation?: boolean;
}

export interface SerpApiGoogleHotelsResponseV3 {
  search_metadata?: {
    created_at?: string;
    processed_at?: string;
    status?: string;
  };
  search_parameters?: {
    q?: string;
    check_in_date?: string;
    check_out_date?: string;
    adults?: number;
    children?: number;
    rooms?: number;
    currency?: string;
    gl?: string;
    hl?: string;
    sort_by?: number;
    free_cancellation?: boolean;
    amenities?: number[];
    no_cache?: boolean;
  };
  ads?: SerpApiGoogleHotelsPropertyV3[];
  properties?: SerpApiGoogleHotelsPropertyV3[];
  property?: SerpApiGoogleHotelsPropertyV3;
  serpapi_pagination?: { next_page_token?: string };
}

export type SerpApiObservedValueV3<T> =
  | { state: "OBSERVED"; value: T }
  | { state: "UNKNOWN"; value: null };

export interface SerpApiGoogleHotelsPriceSemanticsV3 {
  anonymousPropertyId: string;
  nightlyPrice: SerpApiObservedValueV3<number>;
  totalStayPrice: SerpApiObservedValueV3<number>;
  beforeTaxesAndFees: SerpApiObservedValueV3<number>;
  taxesAndFeesKnown: SerpApiObservedValueV3<boolean>;
  lowestObservedPrice: SerpApiObservedValueV3<number>;
  sellerSpecificPrice: SerpApiObservedValueV3<boolean>;
  exactBookableOfferKnown: SerpApiObservedValueV3<boolean>;
  priceFreshness: SerpApiObservedValueV3<"SOURCE_TIMESTAMP_BUCKET" | "CACHE_ELIGIBLE_UNKNOWN_AGE">;
  cachedResult: SerpApiObservedValueV3<boolean>;
}

export interface SerpApiGoogleHotelsLocationSemanticsV3 {
  anonymousPropertyId: string;
  latitude: SerpApiObservedValueV3<number>;
  longitude: SerpApiObservedValueV3<number>;
}

export interface SerpApiGoogleHotelsExternalProjectionV3 {
  adapterVersion: typeof STAYOPTI_SERPAPI_GOOGLE_HOTELS_ADAPTER_VERSION_V3;
  sourceRole: typeof STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3;
  recordClass: typeof STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3;
  session: ExternalHotelChoiceSessionV3;
  priceSemantics: SerpApiGoogleHotelsPriceSemanticsV3[];
  locationSemantics: SerpApiGoogleHotelsLocationSemanticsV3[];
  opaqueProvenanceReferenceCount: number;
  sellerCoverageCount: number;
  rawProviderIdentifiersPersisted: 0;
  rawPayloadPersisted: false;
  automaticGoldenAdmission: false;
  automaticV3WeightChange: false;
}

interface NodeDigestV3 {
  update(value: string, encoding: "utf8"): NodeDigestV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeDigestV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

function nodeCrypto() {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") {
    throw new Error("SerpApi evaluation adapter requires the Node built-in crypto module.");
  }
  return cryptoModule;
}

function sha256(value: unknown, namespace: string) {
  return nodeCrypto().createHash("sha256")
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex");
}

function known<T>(value: T, provenance: string): StayOptiExternalKnownValueV3<T> {
  return { state: "KNOWN", value, provenance };
}

function unknown<T>(provenance: string): StayOptiExternalKnownValueV3<T> {
  return { state: "UNKNOWN", value: null, provenance };
}

function observed<T>(value: T | undefined): SerpApiObservedValueV3<T> {
  return value === undefined ? { state: "UNKNOWN", value: null } : { state: "OBSERVED", value };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseHotelClass(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateBucket(value: string | undefined) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? "");
  return match?.[1] ?? "UNKNOWN_DATE_BUCKET";
}

function monthBucket(value: string) {
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "UNKNOWN_PERIOD";
}

function localAlternativeId(property: SerpApiGoogleHotelsPropertyV3, ordinal: number) {
  const opaqueSourceIdentity = property.property_token ?? `${property.name ?? "UNKNOWN"}|${ordinal}`;
  return `ANON_SERP_${sha256(opaqueSourceIdentity, "stayopti-serpapi-property-reference").slice(0, 20).toUpperCase()}`;
}

function sourcePrice(property: SerpApiGoogleHotelsPropertyV3) {
  const nightly = finiteNumber(property.rate_per_night?.extracted_lowest);
  const total = finiteNumber(property.total_rate?.extracted_lowest);
  const beforeTax = finiteNumber(property.total_rate?.extracted_before_taxes_fees)
    ?? finiteNumber(property.rate_per_night?.extracted_before_taxes_fees);
  const sellerPrices = (property.prices ?? [])
    .map((price) => finiteNumber(price.extracted_lowest))
    .filter((value): value is number => value !== undefined);
  return {
    nightly,
    total,
    beforeTax,
    lowest: sellerPrices.length > 0 ? Math.min(...sellerPrices) : undefined,
    hasSellerSpecificPrice: sellerPrices.length > 0 ? true : undefined,
    sellerCoverageCount: (property.prices ?? []).filter((price) => typeof price.source === "string").length,
  };
}

function missingnessFor(property: SerpApiGoogleHotelsPropertyV3, prices: ReturnType<typeof sourcePrice>) {
  const missing: string[] = [];
  if (parseHotelClass(property.hotel_class) === undefined) missing.push("HOTEL_CLASS");
  if (finiteNumber(property.overall_rating) === undefined) missing.push("REVIEW_RATING");
  if (finiteNumber(property.reviews) === undefined) missing.push("REVIEW_COUNT");
  if (!Array.isArray(property.amenities)) missing.push("AMENITIES");
  if (typeof property.free_cancellation !== "boolean") missing.push("FREE_CANCELLATION");
  if (finiteNumber(property.gps_coordinates?.latitude) === undefined || finiteNumber(property.gps_coordinates?.longitude) === undefined) {
    missing.push("COORDINATES");
  }
  if (prices.total === undefined) missing.push("TOTAL_STAY_PRICE");
  missing.push("EXACT_BOOKABILITY", "TAX_AND_FEE_COMPLETENESS");
  return [...new Set(missing)].sort();
}

function toAlternative(
  property: SerpApiGoogleHotelsPropertyV3,
  displayedRank: number,
  sponsored: boolean,
): {
  alternative: StayOptiExternalHotelAlternativeV3;
  priceSemantics: SerpApiGoogleHotelsPriceSemanticsV3;
  locationSemantics: SerpApiGoogleHotelsLocationSemanticsV3;
  opaqueReferencePresent: boolean;
  sellerCoverageCount: number;
} {
  const anonymousPropertyId = localAlternativeId(property, displayedRank);
  const prices = sourcePrice(property);
  const hotelClass = parseHotelClass(property.hotel_class);
  const reviewRating = finiteNumber(property.overall_rating);
  const reviewCount = finiteNumber(property.reviews);
  const latitude = finiteNumber(property.gps_coordinates?.latitude);
  const longitude = finiteNumber(property.gps_coordinates?.longitude);
  const amenities = Array.isArray(property.amenities)
    ? [...new Set(property.amenities.filter((entry) => typeof entry === "string"))].sort()
    : undefined;
  const freeCancellation = typeof property.free_cancellation === "boolean"
    ? property.free_cancellation
    : undefined;

  return {
    alternative: {
      anonymousPropertyId,
      displayedRank,
      sponsored: known(sponsored, sponsored ? "SERPAPI_GOOGLE_HOTELS.ads" : "SERPAPI_GOOGLE_HOTELS.properties"),
      starRating: hotelClass === undefined
        ? unknown("SERPAPI_GOOGLE_HOTELS.hotel_class.MISSING")
        : known(hotelClass, "SERPAPI_GOOGLE_HOTELS.hotel_class"),
      reviewRating: reviewRating === undefined
        ? unknown("SERPAPI_GOOGLE_HOTELS.overall_rating.MISSING")
        : known(reviewRating, "SERPAPI_GOOGLE_HOTELS.overall_rating"),
      reviewCount: reviewCount === undefined
        ? unknown("SERPAPI_GOOGLE_HOTELS.reviews.MISSING")
        : known(reviewCount, "SERPAPI_GOOGLE_HOTELS.reviews"),
      exactPriceMinorUnits: unknown("AGGREGATED_PRICE_NOT_EXACT_BOOKABLE_TOTAL"),
      priceBucket: unknown("NO_PRICE_BUCKET_DERIVATION_AUTHORIZED"),
      freeCancellation: freeCancellation === undefined
        ? unknown("SERPAPI_GOOGLE_HOTELS.free_cancellation.MISSING")
        : known(freeCancellation, "SERPAPI_GOOGLE_HOTELS.free_cancellation"),
      amenities: amenities === undefined
        ? unknown("SERPAPI_GOOGLE_HOTELS.amenities.MISSING")
        : known(amenities, "SERPAPI_GOOGLE_HOTELS.amenities"),
      availabilityStatus: unknown("DISPLAY_DOES_NOT_PROVE_EXACT_BOOKABILITY"),
      clicked: false,
      booked: false,
      missingness: missingnessFor(property, prices),
      fieldProvenance: {
        displayedRank: sponsored ? "SERPAPI_GOOGLE_HOTELS.ads.ORDER" : "SERPAPI_GOOGLE_HOTELS.properties.ORDER",
        priceSemantics: "SERPAPI_GOOGLE_HOTELS.rate_per_night,total_rate,prices",
        coordinates: "SERPAPI_GOOGLE_HOTELS.gps_coordinates",
        sellerCoverage: "SERPAPI_GOOGLE_HOTELS.prices[].source.OPAQUE_PROVENANCE_ONLY",
      },
    },
    priceSemantics: {
      anonymousPropertyId,
      nightlyPrice: observed(prices.nightly),
      totalStayPrice: observed(prices.total),
      beforeTaxesAndFees: observed(prices.beforeTax),
      taxesAndFeesKnown: { state: "UNKNOWN", value: null },
      lowestObservedPrice: observed(prices.lowest),
      sellerSpecificPrice: observed(prices.hasSellerSpecificPrice),
      exactBookableOfferKnown: { state: "UNKNOWN", value: null },
      priceFreshness: { state: "UNKNOWN", value: null },
      cachedResult: { state: "UNKNOWN", value: null },
    },
    locationSemantics: {
      anonymousPropertyId,
      latitude: observed(latitude),
      longitude: observed(longitude),
    },
    opaqueReferencePresent: typeof property.property_token === "string" || typeof property.name === "string",
    sellerCoverageCount: prices.sellerCoverageCount,
  };
}

function sortType(sortBy: number | undefined) {
  const knownSorts: Readonly<Record<number, string>> = Object.freeze({
    3: "LOWEST_PRICE",
    8: "HIGHEST_RATING",
    13: "MOST_REVIEWED",
  });
  return sortBy === undefined ? "SOURCE_DEFAULT_RELEVANCE" : knownSorts[sortBy] ?? "SOURCE_SORT_OTHER";
}

function filters(parameters: NonNullable<SerpApiGoogleHotelsResponseV3["search_parameters"]>) {
  const values: string[] = [];
  if (parameters.free_cancellation === true) values.push("FREE_CANCELLATION");
  if (Array.isArray(parameters.amenities) && parameters.amenities.length > 0) values.push("AMENITIES_FILTERED");
  return values.sort();
}

export function adaptSerpApiGoogleHotelsExternalSessionV3(
  input: SerpApiGoogleHotelsResponseV3,
): SerpApiGoogleHotelsExternalProjectionV3 {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("SERPAPI_GOOGLE_HOTELS_RESPONSE_INVALID");
  }
  const parameters = input.search_parameters ?? {};
  if (typeof parameters.q !== "string" || parameters.q.length === 0) {
    throw new Error("SERPAPI_GOOGLE_HOTELS_QUERY_MISSING");
  }
  if (typeof parameters.check_in_date !== "string" || typeof parameters.check_out_date !== "string") {
    throw new Error("SERPAPI_GOOGLE_HOTELS_STAY_DATES_MISSING");
  }

  const projected = [
    ...(input.ads ?? []).map((property, index) => toAlternative(property, index + 1, true)),
    ...(input.properties ?? []).map((property, index) =>
      toAlternative(property, (input.ads?.length ?? 0) + index + 1, false)),
  ];
  if (projected.length === 0) throw new Error("SERPAPI_GOOGLE_HOTELS_CHOICE_SET_EMPTY");

  const timestamp = dateBucket(input.search_metadata?.created_at ?? input.search_metadata?.processed_at);
  const hasPagination = typeof input.serpapi_pagination?.next_page_token === "string";
  const currency = typeof parameters.currency === "string" && parameters.currency.length === 3
    ? known(parameters.currency.toUpperCase(), "SERPAPI_GOOGLE_HOTELS.search_parameters.currency")
    : unknown<string>("SERPAPI_GOOGLE_HOTELS.search_parameters.currency.MISSING");
  const biasFlags = new Set<StayOptiExternalBiasFlagV3>([
    "POSITION_BIAS",
    "DEFAULT_SORT_BIAS",
    "POPULARITY_BIAS",
    "AVAILABILITY_BIAS",
    "PRICE_OR_PROMOTION_BIAS",
    "MARKET_OR_CURRENCY_BIAS",
    "UNOBSERVED_VISIBLE_INFORMATION",
    "TEMPORAL_OBSOLESCENCE",
    "EXACT_PRICE_NOT_RECONSTRUCTABLE",
  ]);
  if ((input.ads?.length ?? 0) > 0) biasFlags.add("ADVERTISING_BIAS");
  if (hasPagination) biasFlags.add("UNOBSERVED_ALTERNATIVES");
  if (projected.some((entry) => entry.alternative.missingness.length > 0)) biasFlags.add("MISSING_DATA_BIAS");

  const material: Omit<ExternalHotelChoiceSessionV3, "sessionFingerprint"> = {
    schemaVersion: STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3,
    sourceDatasetId: STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ID_V3,
    sourceVersion: "OFFICIAL_SCHEMA_REVIEWED_2026-09-01",
    sourceLicense: {
      status: "TERMS_ACCEPTANCE_REQUIRED",
      licenseName: "SerpApi public Terms of Service plus third-party rights",
      licenseUrl: STAYOPTI_SERPAPI_GOOGLE_HOTELS_OFFICIAL_URLS_V3.terms,
      commercialUse: "UNKNOWN",
      accountRequired: true,
      termsAcceptanceRequired: true,
      persistentIngestionAllowed: false,
    },
    provenance: {
      authority: "PRIMARY_OFFICIAL_SCHEMA",
      primarySourceUrl: STAYOPTI_SERPAPI_GOOGLE_HOTELS_OFFICIAL_URLS_V3.api,
      downloadUrl: null,
      adapterVersion: STAYOPTI_SERPAPI_GOOGLE_HOTELS_ADAPTER_VERSION_V3,
      mappingVersion: STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3,
      sourceRowGrouping: "ONE_SEARCH_SESSION",
      redistributionAllowed: false,
    },
    searchTimestamp: timestamp,
    historicalPeriod: monthBucket(timestamp),
    destinationToken: `DESTINATION_SERP_${sha256(parameters.q, "stayopti-serpapi-destination").slice(0, 20).toUpperCase()}`,
    checkin: parameters.check_in_date,
    checkout: parameters.check_out_date,
    adults: Number.isInteger(parameters.adults) ? parameters.adults ?? null : null,
    children: Number.isInteger(parameters.children) ? parameters.children ?? null : null,
    rooms: Number.isInteger(parameters.rooms) ? parameters.rooms ?? null : null,
    filters: filters(parameters),
    sortType: sortType(parameters.sort_by),
    deviceContext: null,
    currencyKnown: currency,
    exactPriceAvailable: false,
    choiceSetCompleteness: hasPagination ? "PARTIAL_VISIBLE_SET" : "UNKNOWN",
    alternatives: projected.map((entry) => entry.alternative),
    observedActions: [{
      ordinal: 1,
      actionType: "IMPRESSION",
      anonymousPropertyId: null,
      occurredAtBucket: "SNAPSHOT_CAPTURE",
    }],
    bookingObserved: false,
    biasFlags: [...biasFlags].sort(),
    evidenceStrength: "IMPRESSION_ONLY",
    mappingCompleteness: "PARTIAL_DIAGNOSTIC_ONLY",
    allowedUses: [...STAYOPTI_SERPAPI_GOOGLE_HOTELS_ALLOWED_USES_V3],
    prohibitedClaims: [...STAYOPTI_SERPAPI_GOOGLE_HOTELS_PROHIBITED_CLAIMS_V3],
    datasetPartition: "UNASSIGNED",
    anonymousUserCluster: null,
    corpusClass: "EXTERNAL_OBSERVATIONAL_CORPUS",
    automaticGoldenAdmission: false,
  };
  const session: ExternalHotelChoiceSessionV3 = {
    ...material,
    sessionFingerprint: createExternalHotelChoiceSessionFingerprintV3(material),
  };

  return {
    adapterVersion: STAYOPTI_SERPAPI_GOOGLE_HOTELS_ADAPTER_VERSION_V3,
    sourceRole: STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3,
    recordClass: STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3,
    session,
    priceSemantics: projected.map((entry) => entry.priceSemantics),
    locationSemantics: projected.map((entry) => entry.locationSemantics),
    opaqueProvenanceReferenceCount: projected.filter((entry) => entry.opaqueReferencePresent).length,
    sellerCoverageCount: projected.reduce((sum, entry) => sum + entry.sellerCoverageCount, 0),
    rawProviderIdentifiersPersisted: 0,
    rawPayloadPersisted: false,
    automaticGoldenAdmission: false,
    automaticV3WeightChange: false,
  };
}
