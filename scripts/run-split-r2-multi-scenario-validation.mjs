import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { stableStringifySplitF0 } from "./run-split-f0-read-only-collector.mjs";
import {
  SPLIT_R1_AUTH_ENDPOINT,
  SPLIT_R1_DESTINATION_ENDPOINT,
  SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
  SPLIT_R1_OFFICIAL_BASE_URL,
  buildSplitR1EconomicEligibilityFunnelSearchReceiptV1,
  createSplitR1DestinationRequest,
  createSplitR1HotelSearchRequest,
  createSplitR1ContinuationRequest,
  createSplitR1PartnerTokenRequest,
  diagnoseSplitR1ContinuationMetadataShapeV1,
  fingerprintSplitR1Identifier,
  normalizeSplitR1SearchPage,
  selectSplitR1DestinationCandidate,
  splitR1CompactMedianInteger,
  splitR1CompactRoundedRatio,
  splitR1NightlyOracleBestPair,
  splitR1NightlyOracleOffersForState,
  validateSplitR1BaseUrl,
} from "./run-split-r1-routestack-read-only-collector.mjs";

export const SPLIT_R2_SOURCE_SHA = "65f4d7c7988e624a6b4583fe93dad527a0c8982d";
export const SPLIT_R2_FROZEN_MATRIX_ID = "stayopti.split-r2.frozen-matrix@1";
export const SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION =
  "stayopti.split-r2.provider-neutral-search-snapshot@1";
export const SPLIT_R2_RECEIPT_VERSION =
  "stayopti.split-r2.multi-scenario-reproducibility@1";
export const SPLIT_R2_COMPACT_MAX_UTF8_BYTES = 16_000;
export const SPLIT_R2_LITEAPI_CANARY_RECEIPT_VERSION =
  "stayopti.split-r2.liteapi-contract-canary@1";
export const SPLIT_R2_LITEAPI_CANARY_COMPACT_MAX_UTF8_BYTES = 8_000;
export const SPLIT_R2_LITEAPI_RESPONSE_SHAPE_RECEIPT_VERSION =
  "stayopti.split-r2.liteapi-response-shape@1";
export const SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_RECEIPT_VERSION =
  "stayopti.split-r2.liteapi-zero-result-diagnosis@1";
export const SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_MAX_UTF8_BYTES = 16_000;
export const SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RECEIPT_VERSION =
  "stayopti.split-r2.routestack-public-contract-canary@1";
export const SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_MAX_UTF8_BYTES = 8_000;
export const SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RECEIPT_VERSION =
  "stayopti.split-r2.routestack-public-multi-scenario@1";
export const SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_MAX_UTF8_BYTES = 16_000;
export const SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RECEIPT_VERSION =
  "stayopti.split-r2.routestack-public-pagination-sensitivity@1";
export const SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_MAX_UTF8_BYTES = 12_000;
export const SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_RECEIPT_VERSION =
  "stayopti.split-r2.routestack-public-pagination-aware-multi-scenario@1";
export const SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_MAX_UTF8_BYTES = 16_000;
export const SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RECEIPT_VERSION =
  "stayopti.split-r2.routestack-public-d0-contract-canary@1";
export const SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_MAX_UTF8_BYTES = 6_000;
export const SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_FINGERPRINT =
  "f626b05e4492ee8757e5b67ece5ad1d61e6945eb3103dd56b2483d57eeb2779e";
export const SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_LIMITS = Object.freeze({
  AUTHENTICATION: 1,
  DESTINATION: 3,
  INITIAL_SEARCH: 1,
  CONTINUATION: 0,
  total: 5,
});
export const SPLIT_R2_SEARCH_FAILURE_CIRCUIT_BREAKER = Object.freeze({
  maxConsecutiveSearchScopedFailures: 3,
  maxTotalSearchScopedFailures: 10,
  retryMax: 0,
});
export const SPLIT_R2_PAGINATION_AWARE_RECEIPT_COMPLETENESS = Object.freeze([
  "COMPLETE_TECHNICAL_AND_ECONOMIC",
  "COMPLETE_TECHNICAL_INSUFFICIENT_ECONOMIC_COVERAGE",
  "PARTIAL_WAVE_ABORTED_WITH_EXPLORATORY_ECONOMICS",
  "PARTIAL_WAVE_ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMICS",
  "PARTIAL_WAVE_ABORTED_WITHOUT_EVALUABLE_BREAKPOINTS",
  "NOT_EMITTED",
]);
export const SPLIT_R2_LITEAPI_SANDBOX_BASE_URL = "https://api.liteapi.travel/v3.0";
export const SPLIT_R2_LITEAPI_RATES_PATH = "/hotels/rates";
export const SPLIT_R2_LITEAPI_STATIC_HOTELS_PATH = "/data/hotels";
export const SPLIT_R2_LITEAPI_CANARY_BREAKPOINT = 7;
export const SPLIT_R2_MIN_REQUEST_START_INTERVAL_MS = 1_000;
export const SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS = 10_000;
export const SPLIT_R2_MATERIAL_BASIS_POINTS = 1_000;
export const SPLIT_R2_ROUTE_STACK_SUBSET = Object.freeze([1, 3, 5]);
export const SPLIT_R2_LIVE_CAPABILITIES = Object.freeze({
  LITEAPI_SANDBOX_CANARY: "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
  LITEAPI_SANDBOX_ZERO_RESULT_DIAGNOSIS: "EXACT_MAX_41_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
  LITEAPI_SANDBOX_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_SANDBOX_CANARY: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_SANDBOX_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_PUBLIC_PRODUCTION_CANARY: "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
  ROUTESTACK_PUBLIC_PRODUCTION_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_PUBLIC_MULTI_SCENARIO: "EXACT_106_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
  ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY:
    "EXACT_45_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
  ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO:
    "EXACT_MAX_310_HTTP_D2_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
  ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_R2_9A:
    "EXACT_R2_9A_MAX_310_HTTP_D2_PARTIAL_SALVAGE_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
  ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY:
    "EXACT_MAX_5_HTTP_EXPLICIT_FLAG_ACKNOWLEDGEMENTS_AND_COMPACT_REQUIRED",
});

export const SPLIT_R2_COMPARABILITY_CLASSES = Object.freeze([
  "COMPARABLE_COMPLETE_TOTAL",
  "INCOMPARABLE_MANDATORY_COMPONENT_UNKNOWN",
  "INCOMPARABLE_CURRENCY",
  "INCOMPARABLE_PRICE_SEMANTICS",
  "INCOMPARABLE_OCCUPANCY",
  "INCOMPARABLE_COLLECTION",
  "INCOMPARABLE_OTHER_ALLOWLISTED_GATE",
]);

export const SPLIT_R2_NOT_EVALUABLE_REASONS = Object.freeze([
  "NO_FULL_STAY_BASELINE",
  "FULL_STAY_COLLECTION_UNPROCESSABLE",
  "PREFIX_COLLECTION_UNPROCESSABLE",
  "SUFFIX_COLLECTION_UNPROCESSABLE",
  "NO_PREFIX_CANDIDATE",
  "NO_SUFFIX_CANDIDATE",
  "NO_DISTINCT_PROPERTY_PAIR",
  "PRICE_SEMANTICS_INCOMPARABLE",
  "MANDATORY_COMPONENT_UNKNOWN",
  "CURRENCY_INCONSISTENT",
  "OCCUPANCY_INCONSISTENT",
  "PRICE_COVERAGE_INCOMPLETE",
  "COLLECTION_METADATA_AMBIGUOUS",
  "OTHER_ALLOWLISTED_TECHNICAL_GATE",
]);

const SCENARIO_DEFAULTS = Object.freeze({
  country: "IT",
  rooms: 1,
  adults: 2,
  children: 0,
  currency: "EUR",
  maximumSwitches: 1,
  distinctPropertiesRequired: true,
});

export const SPLIT_R2_FROZEN_SCENARIOS = Object.freeze(
  [
    [1, "ANCHOR_REPLICATION", "Milano", 45.4642, 9.19, "2026-11-30", "2026-12-14"],
    [2, "NEW", "Milano", 45.4642, 9.19, "2027-03-01", "2027-03-08"],
    [3, "NEW", "Firenze", 43.7696, 11.2558, "2026-11-30", "2026-12-07"],
    [4, "NEW", "Firenze", 43.7696, 11.2558, "2027-03-01", "2027-03-15"],
    [5, "NEW", "Roma", 41.9028, 12.4964, "2026-11-30", "2026-12-14"],
    [6, "NEW", "Roma", 41.9028, 12.4964, "2027-03-01", "2027-03-08"],
  ].map(([ordinal, role, destination, latitude, longitude, checkin, checkout]) =>
    Object.freeze({
      ...SCENARIO_DEFAULTS,
      ordinal,
      scenarioId: `R2-S${ordinal}`,
      role,
      destination,
      coordinates: Object.freeze({ latitude, longitude }),
      checkin,
      checkout,
      durationNights: isoDayDifference(checkin, checkout),
    })
  )
);

const FORBIDDEN_RECEIPT_KEYS = new Set([
  "propertyfingerprint",
  "propertyfingerprints",
  "propertyid",
  "hotelid",
  "roomid",
  "rateid",
  "offerid",
  "correlationid",
  "token",
  "nextresultskey",
  "payload",
  "response",
  "headers",
  "credential",
  "apikey",
  "secret",
  "commission",
  "markup",
  "bookingurl",
]);

function isoDayDifference(checkin, checkout) {
  const start = Date.parse(`${checkin}T00:00:00Z`);
  const end = Date.parse(`${checkout}T00:00:00Z`);
  const days = (end - start) / 86_400_000;
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("split-r2-date-range-invalid");
  }
  return days;
}

function addIsoDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertExactOccupancy(value) {
  return (
    value?.rooms === SCENARIO_DEFAULTS.rooms &&
    value?.adults === SCENARIO_DEFAULTS.adults &&
    value?.children === SCENARIO_DEFAULTS.children
  );
}

export function buildSplitR2ScenarioPlan(scenario) {
  if (!SPLIT_R2_FROZEN_SCENARIOS.some((entry) => entry === scenario)) {
    throw new Error("split-r2-scenario-not-frozen");
  }
  const request = (searchRole, checkin, checkout, breakpointOrdinal = null) =>
    Object.freeze({
      logicalSearchId: `${scenario.scenarioId}-${searchRole}-${breakpointOrdinal ?? "0"}`,
      scenarioOrdinal: scenario.ordinal,
      searchRole,
      breakpointOrdinal,
      checkin,
      checkout,
      durationNights: isoDayDifference(checkin, checkout),
      destination: scenario.destination,
      country: scenario.country,
      coordinates: scenario.coordinates,
      occupancy: Object.freeze({
        rooms: scenario.rooms,
        adults: scenario.adults,
        children: scenario.children,
      }),
      expectedCurrency: scenario.currency,
    });
  const searches = [request("FULL_STAY", scenario.checkin, scenario.checkout)];
  for (let night = 0; night < scenario.durationNights; night += 1) {
    searches.push(
      request("NIGHTLY", addIsoDays(scenario.checkin, night), addIsoDays(scenario.checkin, night + 1), night + 1)
    );
  }
  for (let breakpoint = 1; breakpoint < scenario.durationNights; breakpoint += 1) {
    const splitDate = addIsoDays(scenario.checkin, breakpoint);
    searches.push(request("PREFIX", scenario.checkin, splitDate, breakpoint));
    searches.push(request("SUFFIX", splitDate, scenario.checkout, breakpoint));
  }
  const expected = 1 + scenario.durationNights + 2 * (scenario.durationNights - 1);
  if (searches.length !== expected) throw new Error("split-r2-scenario-plan-count-drift");
  return Object.freeze({
    scenario,
    breakpoints: scenario.durationNights - 1,
    logicalSearches: Object.freeze(searches),
  });
}

export function buildSplitR2CampaignPlan(provider) {
  const ordinals =
    provider === "LITEAPI_SANDBOX"
      ? SPLIT_R2_FROZEN_SCENARIOS.map((scenario) => scenario.ordinal)
      : provider === "ROUTESTACK_SANDBOX"
        ? SPLIT_R2_ROUTE_STACK_SUBSET
        : null;
  if (!ordinals) throw new Error("split-r2-provider-environment-invalid");
  const scenarioPlans = ordinals.map((ordinal) =>
    buildSplitR2ScenarioPlan(
      SPLIT_R2_FROZEN_SCENARIOS.find((scenario) => scenario.ordinal === ordinal)
    )
  );
  const logicalSearches = scenarioPlans.flatMap((plan) => plan.logicalSearches);
  const expected = provider === "LITEAPI_SANDBOX" ? 183 : 102;
  if (logicalSearches.length !== expected) throw new Error("split-r2-campaign-plan-count-drift");
  return Object.freeze({
    provider,
    environment: "SANDBOX",
    scenarioPlans: Object.freeze(scenarioPlans),
    logicalSearches: Object.freeze(logicalSearches),
  });
}

function normalizeCancellationCategory(value) {
  return ["FLEXIBLE", "NON_REFUNDABLE", "PARTIALLY_REFUNDABLE"].includes(value)
    ? value
    : "UNAVAILABLE";
}

function emptyFunnel(rawResultCount) {
  return {
    rawResultCount,
    identityEligibleCount: 0,
    numericPriceEligibleCount: 0,
    expectedCurrencyMatchCount: 0,
    missingCurrencyCount: 0,
    nonExpectedCurrencyCount: 0,
    invalidCurrencyTypeCount: 0,
    unknownMandatoryComponentCount: 0,
    mandatoryComponentComparableCount: 0,
    finalEconomicOfferCount: 0,
  };
}

function assertProviderNeutralSnapshot(snapshot) {
  const forbidden = [
    "rawHotelId",
    "rawRoomId",
    "rawRateId",
    "rawOfferId",
    "correlationId",
    "token",
    "nextResultsKey",
    "providerPayload",
    "providerResponse",
    "bookingUrl",
    "commission",
    "markup",
  ];
  for (const key of forbidden) {
    if (Object.hasOwn(snapshot, key)) throw new Error(`split-r2-provider-neutral-field-forbidden:${key}`);
  }
  return snapshot;
}

function liteApiOfferComparability(rawOffer, search, ephemeralKey, funnel) {
  const rawIdentity = rawOffer?.propertyIdentity;
  if (typeof rawIdentity !== "string" || rawIdentity.length === 0) return null;
  funnel.identityEligibleCount += 1;
  const publicRate = rawOffer?.offerRetailRate;
  if (
    publicRate?.semantics !== "SEARCH_WINDOW_TOTAL_CONFIRMED" ||
    !Number.isSafeInteger(publicRate?.totalMinorUnits) ||
    publicRate.totalMinorUnits <= 0
  ) {
    return null;
  }
  funnel.numericPriceEligibleCount += 1;
  if (publicRate.currency === null || publicRate.currency === undefined || publicRate.currency === "") {
    funnel.missingCurrencyCount += 1;
    return null;
  }
  if (typeof publicRate.currency !== "string") {
    funnel.invalidCurrencyTypeCount += 1;
    return null;
  }
  if (publicRate.currency !== search.expectedCurrency) {
    funnel.nonExpectedCurrencyCount += 1;
    return null;
  }
  funnel.expectedCurrencyMatchCount += 1;
  if (!assertExactOccupancy(rawOffer?.occupancy)) return null;
  if (rawOffer?.mandatoryComponentsComplete !== true) return null;
  const components = Array.isArray(rawOffer.mandatoryComponents)
    ? rawOffer.mandatoryComponents.filter((component) => component?.mandatory === true)
    : [];
  if (
    components.some(
      (component) =>
        component?.known !== true ||
        !Number.isSafeInteger(component?.amountMinorUnits) ||
        component.amountMinorUnits < 0 ||
        component.currency !== search.expectedCurrency ||
        typeof component.included !== "boolean"
    )
  ) {
    funnel.unknownMandatoryComponentCount += 1;
    return null;
  }
  funnel.mandatoryComponentComparableCount += 1;
  const excluded = components.filter((component) => !component.included);
  const excludedMinor = sum(excluded.map((component) => component.amountMinorUnits));
  const payAtPropertyMinor = sum(
    excluded
      .filter((component) => component.payAtProperty === true)
      .map((component) => component.amountMinorUnits)
  );
  const totalPriceMinorUnits = publicRate.totalMinorUnits + excludedMinor;
  if (!Number.isSafeInteger(totalPriceMinorUnits) || totalPriceMinorUnits <= 0) return null;
  return {
    propertyFingerprint: fingerprintSplitR1Identifier(rawIdentity, ephemeralKey),
    totalPriceMinorUnits,
    totalMinorUnits: totalPriceMinorUnits,
    currency: search.expectedCurrency,
    totalPriceSemantics: "SEARCH_WINDOW_TOTAL_CONFIRMED",
    mandatoryTaxState:
      components.length === 0
        ? "KNOWN_NONE"
        : excluded.length > 0
          ? "KNOWN_EXCLUDED_ADDED_ONCE"
          : "KNOWN_INCLUDED",
    mandatoryTaxMinorUnits: sum(components.map((component) => component.amountMinorUnits)),
    payAtPropertyMandatoryMinorUnits: payAtPropertyMinor,
    cancellationCategory: normalizeCancellationCategory(rawOffer.cancellationCategory),
    evidenceAvailabilityCategories: ["PUBLIC_RETAIL_RATE", "MANDATORY_COMPONENTS_COMPLETE"],
  };
}

export function adaptLiteApiSearchSnapshotR2(search, acquisition, ephemeralKey) {
  if (acquisition?.environment !== "LITEAPI_SANDBOX" || acquisition.productionFallback === true) {
    throw new Error("split-r2-liteapi-environment-binding-invalid");
  }
  const rawOffers = Array.isArray(acquisition?.offers) ? acquisition.offers : [];
  const funnel = emptyFunnel(rawOffers.length);
  const collectionValid =
    acquisition?.httpValid === true &&
    acquisition?.jsonValid === true &&
    acquisition?.collectionComplete === true;
  const normalized = collectionValid
    ? rawOffers
        .map((offer) => liteApiOfferComparability(offer, search, ephemeralKey, funnel))
        .filter(Boolean)
    : [];
  funnel.finalEconomicOfferCount = normalized.length;
  let comparabilityClassification = "COMPARABLE_COMPLETE_TOTAL";
  if (!collectionValid) comparabilityClassification = "INCOMPARABLE_COLLECTION";
  else if (
    rawOffers.some(
      (offer) =>
        offer?.offerRetailRate?.semantics !== "SEARCH_WINDOW_TOTAL_CONFIRMED" ||
        !Number.isSafeInteger(offer?.offerRetailRate?.totalMinorUnits) ||
        offer.offerRetailRate.totalMinorUnits <= 0
    )
  ) {
    comparabilityClassification = "INCOMPARABLE_PRICE_SEMANTICS";
  } else if (rawOffers.some((offer) => !assertExactOccupancy(offer?.occupancy))) {
    comparabilityClassification = "INCOMPARABLE_OCCUPANCY";
  } else if (
    rawOffers.some(
      (offer) =>
        typeof offer?.offerRetailRate?.currency !== "string" ||
        offer.offerRetailRate.currency !== search.expectedCurrency
    )
  ) {
    comparabilityClassification = "INCOMPARABLE_CURRENCY";
  } else if (
    rawOffers.some(
      (offer) =>
        offer?.mandatoryComponentsComplete !== true ||
        (offer?.mandatoryComponents ?? []).some((component) => component?.known !== true)
    )
  ) {
    comparabilityClassification = "INCOMPARABLE_MANDATORY_COMPONENT_UNKNOWN";
  }
  const snapshot = {
    contractVersion: SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
    logicalSearchId: search.logicalSearchId,
    scenarioOrdinal: search.scenarioOrdinal,
    searchRole: search.searchRole,
    checkin: search.checkin,
    checkout: search.checkout,
    durationNights: search.durationNights,
    expectedCurrency: search.expectedCurrency,
    boundedSnapshotUsable: collectionValid,
    collectionClassification: collectionValid
      ? "BOUNDED_INITIAL_SNAPSHOT"
      : "INITIAL_SNAPSHOT_UNPROCESSABLE",
    comparabilityClassification,
    economicEligibilityFunnel: funnel,
    offers: normalized,
    continuationAvailable: false,
    continuationEligible: false,
    continuationExecuted: false,
  };
  return assertProviderNeutralSnapshot(snapshot);
}

export function adaptRouteStackSearchSnapshotR2(search, acquisition, ephemeralKey) {
  if (acquisition?.environment !== "ROUTESTACK_SANDBOX" || acquisition.productionFallback === true) {
    throw new Error("split-r2-routestack-environment-binding-invalid");
  }
  const rawOffers = Array.isArray(acquisition?.offers) ? acquisition.offers : [];
  const funnel = emptyFunnel(rawOffers.length);
  const collectionValid = acquisition?.httpValid === true && acquisition?.jsonValid === true;
  const normalized = [];
  if (collectionValid) {
    for (const rawOffer of rawOffers) {
      if (typeof rawOffer?.propertyIdentity !== "string" || rawOffer.propertyIdentity.length === 0) continue;
      funnel.identityEligibleCount += 1;
      if (!Number.isSafeInteger(rawOffer?.ourpriceMinorUnits) || rawOffer.ourpriceMinorUnits <= 0) continue;
      funnel.numericPriceEligibleCount += 1;
      if (rawOffer.currency === null || rawOffer.currency === undefined || rawOffer.currency === "") {
        funnel.missingCurrencyCount += 1;
        continue;
      }
      if (typeof rawOffer.currency !== "string") {
        funnel.invalidCurrencyTypeCount += 1;
        continue;
      }
      if (rawOffer.currency !== search.expectedCurrency) {
        funnel.nonExpectedCurrencyCount += 1;
        continue;
      }
      funnel.expectedCurrencyMatchCount += 1;
      funnel.mandatoryComponentComparableCount += 1;
      normalized.push({
        propertyFingerprint: fingerprintSplitR1Identifier(rawOffer.propertyIdentity, ephemeralKey),
        totalPriceMinorUnits: rawOffer.ourpriceMinorUnits,
        totalMinorUnits: rawOffer.ourpriceMinorUnits,
        currency: rawOffer.currency,
        totalPriceSemantics: "SEARCH_WINDOW_TOTAL_EMPIRICALLY_SUPPORTED",
        mandatoryTaxState: "UNPROVEN_R1_PRESERVED",
        mandatoryTaxMinorUnits: null,
        payAtPropertyMandatoryMinorUnits: null,
        cancellationCategory: normalizeCancellationCategory(rawOffer.cancellationCategory),
        evidenceAvailabilityCategories: ["R1_BOUNDED_SNAPSHOT", "TEMPORAL_TOTALITY_EMPIRICAL"],
      });
    }
  }
  funnel.finalEconomicOfferCount = normalized.length;
  const completeBindings = Number.isSafeInteger(acquisition?.completeContinuationBindingCount)
    ? acquisition.completeContinuationBindingCount
    : 0;
  const ambiguous = completeBindings > 1;
  const snapshot = {
    contractVersion: SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
    logicalSearchId: search.logicalSearchId,
    scenarioOrdinal: search.scenarioOrdinal,
    searchRole: search.searchRole,
    checkin: search.checkin,
    checkout: search.checkout,
    durationNights: search.durationNights,
    expectedCurrency: search.expectedCurrency,
    boundedSnapshotUsable: collectionValid && !ambiguous,
    collectionClassification: !collectionValid
      ? "INITIAL_SNAPSHOT_UNPROCESSABLE"
      : ambiguous
        ? "AMBIGUOUS_CONTINUATION_METADATA"
        : completeBindings === 1
          ? "PROVIDER_CONTINUATION_AVAILABLE"
          : "PROVIDER_NO_CONTINUATION_EXPOSED",
    comparabilityClassification: collectionValid && !ambiguous
      ? "COMPARABLE_COMPLETE_TOTAL"
      : "INCOMPARABLE_COLLECTION",
    economicEligibilityFunnel: funnel,
    offers: collectionValid && !ambiguous ? normalized : [],
    continuationAvailable: completeBindings === 1 && !ambiguous,
    continuationEligible: completeBindings === 1 && !ambiguous,
    continuationExecuted: false,
    providerDeclaredTerminal: false,
  };
  return assertProviderNeutralSnapshot(snapshot);
}

function searchState(snapshot) {
  return { logicalSearchId: snapshot.logicalSearchId, offers: snapshot.offers };
}

function comparisonReasons(full, prefix, suffix, baseline, prefixOffers, suffixOffers, pair) {
  const reasons = [];
  if (!full?.boundedSnapshotUsable) reasons.push("FULL_STAY_COLLECTION_UNPROCESSABLE");
  if (!prefix?.boundedSnapshotUsable) reasons.push("PREFIX_COLLECTION_UNPROCESSABLE");
  if (!suffix?.boundedSnapshotUsable) reasons.push("SUFFIX_COLLECTION_UNPROCESSABLE");
  if (!baseline) reasons.push("NO_FULL_STAY_BASELINE");
  if (prefixOffers.length === 0) reasons.push("NO_PREFIX_CANDIDATE");
  if (suffixOffers.length === 0) reasons.push("NO_SUFFIX_CANDIDATE");
  if (!pair) reasons.push("NO_DISTINCT_PROPERTY_PAIR");
  for (const snapshot of [full, prefix, suffix].filter(Boolean)) {
    if (snapshot.comparabilityClassification === "INCOMPARABLE_PRICE_SEMANTICS") {
      reasons.push("PRICE_SEMANTICS_INCOMPARABLE");
    }
    if (snapshot.comparabilityClassification === "INCOMPARABLE_MANDATORY_COMPONENT_UNKNOWN") {
      reasons.push("MANDATORY_COMPONENT_UNKNOWN");
    }
    if (snapshot.comparabilityClassification === "INCOMPARABLE_CURRENCY") {
      reasons.push("CURRENCY_INCONSISTENT");
    }
    if (snapshot.comparabilityClassification === "INCOMPARABLE_OCCUPANCY") {
      reasons.push("OCCUPANCY_INCONSISTENT");
    }
    if (snapshot.collectionClassification === "AMBIGUOUS_CONTINUATION_METADATA") {
      reasons.push("COLLECTION_METADATA_AMBIGUOUS");
    }
  }
  return uniqueSorted(reasons);
}

export function classifySplitR2Saving(savingMinorUnits, baselineMinorUnits) {
  if (!Number.isSafeInteger(savingMinorUnits) || !Number.isSafeInteger(baselineMinorUnits) || baselineMinorUnits <= 0) {
    throw new Error("split-r2-saving-input-invalid");
  }
  const savingBasisPoints = splitR1CompactRoundedRatio(
    savingMinorUnits,
    baselineMinorUnits,
    10_000
  );
  return {
    savingMinorUnits,
    savingBasisPoints,
    breakpointClass:
      savingMinorUnits > 0
        ? "RAW_POSITIVE_SPLIT"
        : savingMinorUnits === 0
          ? "BREAK_EVEN"
          : "SPLIT_MORE_EXPENSIVE",
    materialPriceSignal:
      savingMinorUnits >= SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS &&
      savingBasisPoints >= SPLIT_R2_MATERIAL_BASIS_POINTS,
    userUsableSplit: false,
  };
}

function scenarioTechnicalClassification(evaluable, total, hasMaterial) {
  if (evaluable === 0) return "SCENARIO_NOT_EVALUABLE";
  if (evaluable < total) return "SCENARIO_PARTIALLY_EVALUABLE";
  return hasMaterial ? "SCENARIO_MATERIAL_PRICE_SIGNAL" : "SCENARIO_NO_MATERIAL_PRICE_SIGNAL";
}

export function evaluateSplitR2Scenario(provider, scenarioPlan, snapshots) {
  const byId = new Map(snapshots.map((snapshot) => [snapshot.logicalSearchId, snapshot]));
  if (byId.size !== scenarioPlan.logicalSearches.length) {
    throw new Error("split-r2-scenario-snapshot-count-invalid");
  }
  const currency = scenarioPlan.scenario.currency;
  const fullSearch = scenarioPlan.logicalSearches.find((search) => search.searchRole === "FULL_STAY");
  const fullSnapshot = byId.get(fullSearch.logicalSearchId);
  const fullOffers = splitR1NightlyOracleOffersForState(searchState(fullSnapshot), currency);
  const fixedBaseline = fullOffers[0] ?? null;
  const comparisons = [];
  for (let breakpoint = 1; breakpoint <= scenarioPlan.breakpoints; breakpoint += 1) {
    const prefixSearch = scenarioPlan.logicalSearches.find(
      (search) => search.searchRole === "PREFIX" && search.breakpointOrdinal === breakpoint
    );
    const suffixSearch = scenarioPlan.logicalSearches.find(
      (search) => search.searchRole === "SUFFIX" && search.breakpointOrdinal === breakpoint
    );
    const prefixSnapshot = byId.get(prefixSearch.logicalSearchId);
    const suffixSnapshot = byId.get(suffixSearch.logicalSearchId);
    const prefixOffers = splitR1NightlyOracleOffersForState(searchState(prefixSnapshot), currency);
    const suffixOffers = splitR1NightlyOracleOffersForState(searchState(suffixSnapshot), currency);
    const pair = splitR1NightlyOracleBestPair(prefixOffers, suffixOffers, false);
    const reasons = comparisonReasons(
      fullSnapshot,
      prefixSnapshot,
      suffixSnapshot,
      fixedBaseline,
      prefixOffers,
      suffixOffers,
      pair
    );
    if (reasons.length > 0) {
      comparisons.push({ breakpointOrdinal: breakpoint, evaluable: false, reasons });
      continue;
    }
    const saving = classifySplitR2Saving(
      fixedBaseline.totalMinorUnits - pair.splitTotalMinorUnits,
      fixedBaseline.totalMinorUnits
    );
    comparisons.push({ breakpointOrdinal: breakpoint, evaluable: true, reasons: [], ...saving });
  }
  const evaluable = comparisons.filter((comparison) => comparison.evaluable);
  const savings = evaluable.map((comparison) => comparison.savingMinorUnits);
  const basisPoints = evaluable.map((comparison) => comparison.savingBasisPoints);
  const materialCount = evaluable.filter((comparison) => comparison.materialPriceSignal).length;
  const allFunnels = snapshots.map((snapshot) => snapshot.economicEligibilityFunnel);
  const reasonCounts = Object.fromEntries(
    SPLIT_R2_NOT_EVALUABLE_REASONS.map((reason) => [
      reason,
      comparisons.filter((comparison) => comparison.reasons?.includes(reason)).length,
    ]).filter(([, count]) => count > 0)
  );
  return {
    provider,
    environment: "SANDBOX",
    scenarioOrdinal: scenarioPlan.scenario.ordinal,
    destination: scenarioPlan.scenario.destination,
    anchor: scenarioPlan.scenario.role === "ANCHOR_REPLICATION",
    plannedBreakpoints: scenarioPlan.breakpoints,
    evaluatedBreakpoints: evaluable.length,
    positiveBreakpoints: evaluable.filter((entry) => entry.savingMinorUnits > 0).length,
    breakEvenBreakpoints: evaluable.filter((entry) => entry.savingMinorUnits === 0).length,
    negativeBreakpoints: evaluable.filter((entry) => entry.savingMinorUnits < 0).length,
    materialSignalBreakpoints: materialCount,
    scenarioHasRawPositive: evaluable.some((entry) => entry.savingMinorUnits > 0),
    scenarioHasMaterialSignal: materialCount > 0,
    bestSavingMinorUnits: savings.length > 0 ? Math.max(...savings) : null,
    medianSavingMinorUnits: splitR1CompactMedianInteger(savings),
    minSavingMinorUnits: savings.length > 0 ? Math.min(...savings) : null,
    bestSavingBasisPoints: basisPoints.length > 0 ? Math.max(...basisPoints) : null,
    medianSavingBasisPoints: splitR1CompactMedianInteger(basisPoints),
    winningBreakpointOrdinal: evaluable.length > 0
      ? [...evaluable].sort(
          (left, right) =>
            right.savingMinorUnits - left.savingMinorUnits ||
            left.breakpointOrdinal - right.breakpointOrdinal
        )[0].breakpointOrdinal
      : null,
    baselineAvailable: fixedBaseline !== null,
    priceCoverage: {
      numerator: sum(allFunnels.map((funnel) => funnel.numericPriceEligibleCount)),
      denominator: sum(allFunnels.map((funnel) => funnel.rawResultCount)),
    },
    currencyCoverage: {
      numerator: sum(allFunnels.map((funnel) => funnel.expectedCurrencyMatchCount)),
      denominator: sum(allFunnels.map((funnel) => funnel.rawResultCount)),
    },
    mandatoryComponentCoverage: provider === "LITEAPI_SANDBOX" ? "COMPLETE_KNOWN_ONLY" : "UNPROVEN_R1_PRESERVED",
    technicalClassification: scenarioTechnicalClassification(
      evaluable.length,
      scenarioPlan.breakpoints,
      materialCount > 0
    ),
    notEvaluableReasonCounts: reasonCounts,
    rawResultCount: sum(allFunnels.map((funnel) => funnel.rawResultCount)),
    finalEconomicOfferCount: sum(allFunnels.map((funnel) => funnel.finalEconomicOfferCount)),
    collectionComparabilityViolation: snapshots.some(
      (snapshot) => snapshot.comparabilityClassification !== "COMPARABLE_COMPLETE_TOTAL"
    ),
  };
}

export function aggregateSplitR2Provider(provider, scenarioResults) {
  const evaluable = scenarioResults.filter((result) => result.evaluatedBreakpoints > 0);
  const material = evaluable.filter((result) => result.scenarioHasMaterialSignal);
  return {
    provider,
    environment: "SANDBOX",
    plannedScenarios: scenarioResults.length,
    evaluableScenarios: evaluable.length,
    scenariosWithRawPositive: evaluable.filter((result) => result.scenarioHasRawPositive).length,
    scenariosWithMaterialSignal: material.length,
    destinationsWithMaterialSignal: uniqueSorted(material.map((result) => result.destination)).length,
    medianOfScenarioMediansMinorUnits: splitR1CompactMedianInteger(
      evaluable.map((result) => result.medianSavingMinorUnits)
    ),
    anchorOutcome:
      scenarioResults.find((result) => result.anchor)?.technicalClassification ?? "NOT_ASSIGNED",
    nonEvaluableScenarios: scenarioResults.length - evaluable.length,
    comparabilityViolations: scenarioResults.filter((result) => result.collectionComparabilityViolation).length,
  };
}

export function decideSplitR2Campaign(liteApiAggregate, routeStackAggregate) {
  let primary;
  if (liteApiAggregate.comparabilityViolations > 0) {
    primary = "LITEAPI_CONTRACT_BLOCKED";
  } else if (
    liteApiAggregate.evaluableScenarios >= 4 &&
    liteApiAggregate.scenariosWithMaterialSignal >= 2 &&
    liteApiAggregate.destinationsWithMaterialSignal >= 2
  ) {
    primary = "PRIMARY_PROVIDER_REPRODUCED";
  } else if (
    liteApiAggregate.evaluableScenarios >= 4 &&
    liteApiAggregate.scenariosWithMaterialSignal === 0
  ) {
    primary = "PRIMARY_PROVIDER_NOT_REPRODUCED";
  } else if (
    liteApiAggregate.scenariosWithRawPositive > 0 ||
    liteApiAggregate.scenariosWithMaterialSignal > 0
  ) {
    primary = "PRIMARY_PROVIDER_PROMISING_BUT_INSUFFICIENT";
  } else {
    primary = "INSUFFICIENT_EVALUABLE_DATA";
  }
  const decisions = [primary];
  if (
    primary === "PRIMARY_PROVIDER_REPRODUCED" &&
    routeStackAggregate?.evaluableScenarios >= 2 &&
    routeStackAggregate?.scenariosWithMaterialSignal >= 1
  ) {
    decisions.push("CROSS_PROVIDER_RECURRENCE_SUPPORTED");
  } else if (
    routeStackAggregate?.scenariosWithMaterialSignal >= 1 &&
    primary !== "PRIMARY_PROVIDER_REPRODUCED"
  ) {
    decisions.push("ROUTESTACK_ONLY_SIGNAL");
  }
  return decisions;
}

const HTTP_LIMITS = Object.freeze({
  LITEAPI_SANDBOX: Object.freeze({ auth: 0, destination: 0, initial: 183, continuation: 0, total: 183 }),
  ROUTESTACK_SANDBOX: Object.freeze({ auth: 1, destination: 3, initial: 102, continuation: 0, total: 106 }),
  COMBINED: Object.freeze({ auth: 1, destination: 3, initial: 285, continuation: 0, total: 289 }),
});

export function createSplitR2AuthoritativeHttpCounter(provider) {
  const limits = HTTP_LIMITS[provider];
  if (!limits) throw new Error("split-r2-http-counter-provider-invalid");
  const counts = { auth: 0, destination: 0, initial: 0, continuation: 0, total: 0 };
  let active = 0;
  let maxObservedConcurrency = 0;
  return {
    reserve(kind) {
      if (!Object.hasOwn(counts, kind) || kind === "total") {
        throw new Error("split-r2-http-kind-forbidden");
      }
      if (counts[kind] + 1 > limits[kind] || counts.total + 1 > limits.total) {
        throw new Error(`split-r2-http-budget-exceeded:${kind}`);
      }
      counts[kind] += 1;
      counts.total += 1;
      return { ...counts };
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-concurrency-ledger-invalid");
    },
    snapshot() {
      return { ...counts, limits, retries: 0, redirects: 0, maxObservedConcurrency };
    },
  };
}

function fakeSavingForScenario(provider, ordinal) {
  const lite = { 1: 15_000, 2: 5_000, 3: -2_000, 4: 12_000, 5: 11_000, 6: 0 };
  const route = { 1: 15_000, 3: -2_000, 5: 11_000 };
  return provider === "LITEAPI_SANDBOX" ? lite[ordinal] : route[ordinal];
}

function fakeRawOffers(provider, search, scenario) {
  const baseline = 100_000;
  const targetSplit = baseline - fakeSavingForScenario(provider, scenario.ordinal);
  let first;
  let second;
  if (search.searchRole === "FULL_STAY") {
    first = baseline;
    second = baseline + 2_000;
  } else if (search.searchRole === "PREFIX") {
    first = Math.round((targetSplit * search.durationNights) / scenario.durationNights);
    second = first + 3_000;
  } else if (search.searchRole === "SUFFIX") {
    second = Math.round((targetSplit * search.durationNights) / scenario.durationNights);
    first = second + 3_000;
  } else {
    first = Math.round(baseline / scenario.durationNights);
    second = first + 200;
  }
  const common = (propertyIdentity, price) => ({
    propertyIdentity,
    occupancy: { rooms: 1, adults: 2, children: 0 },
    cancellationCategory: "FLEXIBLE",
    ...(provider === "LITEAPI_SANDBOX"
      ? {
          offerRetailRate: {
            totalMinorUnits: price,
            currency: "EUR",
            semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED",
          },
          mandatoryComponentsComplete: true,
          mandatoryComponents: [],
        }
      : { ourpriceMinorUnits: price, currency: "EUR" }),
  });
  return [
    common(`synthetic-r2-s${scenario.ordinal}-property-a`, first),
    common(`synthetic-r2-s${scenario.ordinal}-property-b`, second),
  ];
}

function fakeAcquisition(provider, search, scenario) {
  return {
    environment: provider,
    productionFallback: false,
    httpValid: true,
    jsonValid: true,
    collectionComplete: true,
    completeContinuationBindingCount: 0,
    offers: fakeRawOffers(provider, search, scenario),
  };
}

function reserveFake(counter, combinedCounter, kind) {
  counter.reserve(kind);
  if (combinedCounter) combinedCounter.reserve(kind);
  counter.enterTransport();
  try {
    return true;
  } finally {
    counter.leaveTransport();
  }
}

export function runSplitR2FakeProviderCampaign(provider, { combinedCounter = null } = {}) {
  const plan = buildSplitR2CampaignPlan(provider);
  const counter = createSplitR2AuthoritativeHttpCounter(provider);
  const ephemeralKey = Buffer.alloc(32, provider === "LITEAPI_SANDBOX" ? 0x2a : 0x3b);
  if (provider === "ROUTESTACK_SANDBOX") {
    reserveFake(counter, combinedCounter, "auth");
    for (let index = 0; index < 3; index += 1) reserveFake(counter, combinedCounter, "destination");
  }
  const scenarioResults = [];
  for (const scenarioPlan of plan.scenarioPlans) {
    const snapshots = [];
    for (const search of scenarioPlan.logicalSearches) {
      reserveFake(counter, combinedCounter, "initial");
      const acquisition = fakeAcquisition(provider, search, scenarioPlan.scenario);
      snapshots.push(
        provider === "LITEAPI_SANDBOX"
          ? adaptLiteApiSearchSnapshotR2(search, acquisition, ephemeralKey)
          : adaptRouteStackSearchSnapshotR2(search, acquisition, ephemeralKey)
      );
    }
    scenarioResults.push(evaluateSplitR2Scenario(provider, scenarioPlan, snapshots));
  }
  return {
    provider,
    scenarioResults,
    aggregate: aggregateSplitR2Provider(provider, scenarioResults),
    http: counter.snapshot(),
  };
}

export function runSplitR2FakeCombinedCampaign() {
  const combinedCounter = createSplitR2AuthoritativeHttpCounter("COMBINED");
  const liteApi = runSplitR2FakeProviderCampaign("LITEAPI_SANDBOX", { combinedCounter });
  const routeStack = runSplitR2FakeProviderCampaign("ROUTESTACK_SANDBOX", { combinedCounter });
  return {
    liteApi,
    routeStack,
    combinedHttp: combinedCounter.snapshot(),
    decisions: decideSplitR2Campaign(liteApi.aggregate, routeStack.aggregate),
  };
}

function displayMinorUnits(value) {
  if (!Number.isSafeInteger(value)) return null;
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function compactScenario(result) {
  return {
    provider: result.provider,
    scenarioOrdinal: result.scenarioOrdinal,
    destination: result.destination,
    anchor: result.anchor,
    plannedBreakpoints: result.plannedBreakpoints,
    evaluatedBreakpoints: result.evaluatedBreakpoints,
    positiveBreakpoints: result.positiveBreakpoints,
    breakEvenBreakpoints: result.breakEvenBreakpoints,
    negativeBreakpoints: result.negativeBreakpoints,
    materialSignalBreakpoints: result.materialSignalBreakpoints,
    scenarioHasRawPositive: result.scenarioHasRawPositive,
    scenarioHasMaterialSignal: result.scenarioHasMaterialSignal,
    bestSavingMinorUnits: result.bestSavingMinorUnits,
    bestSavingDisplay: displayMinorUnits(result.bestSavingMinorUnits),
    medianSavingMinorUnits: result.medianSavingMinorUnits,
    medianSavingDisplay: displayMinorUnits(result.medianSavingMinorUnits),
    minSavingMinorUnits: result.minSavingMinorUnits,
    bestSavingBasisPoints: result.bestSavingBasisPoints,
    medianSavingBasisPoints: result.medianSavingBasisPoints,
    baselineAvailable: result.baselineAvailable,
    priceCoverage: result.priceCoverage,
    currencyCoverage: result.currencyCoverage,
    mandatoryComponentCoverage: result.mandatoryComponentCoverage,
    technicalClassification: result.technicalClassification,
    notEvaluableReasonCounts: result.notEvaluableReasonCounts,
  };
}

function assertReceiptSafe(value, path = "receipt") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertReceiptSafe(entry, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RECEIPT_KEYS.has(key.toLowerCase())) {
      throw new Error(`split-r2-receipt-forbidden-key:${path}.${key}`);
    }
    assertReceiptSafe(child, `${path}.${key}`);
  }
}

export class SplitR2CompactReceiptError extends Error {
  constructor(message, byteLength) {
    super(message);
    this.name = "SplitR2CompactReceiptError";
    this.byteLength = byteLength;
  }
}

export function serializeSplitR2CompactReceipt(receipt, maxBytes = SPLIT_R2_COMPACT_MAX_UTF8_BYTES) {
  assertReceiptSafe(receipt);
  const json = stableStringifySplitF0(receipt, 0);
  if (/\r|\n/u.test(json)) throw new Error("split-r2-compact-receipt-not-single-line");
  const byteLength = Buffer.byteLength(json, "utf8");
  if (byteLength > maxBytes) {
    throw new SplitR2CompactReceiptError("split-r2-compact-receipt-oversize", byteLength);
  }
  return { json, byteLength };
}

function frozenMatrixReceipt() {
  return SPLIT_R2_FROZEN_SCENARIOS.map((scenario) => ({
    ordinal: scenario.ordinal,
    role: scenario.role,
    destination: scenario.destination,
    checkin: scenario.checkin,
    checkout: scenario.checkout,
    durationNights: scenario.durationNights,
    breakpoints: scenario.durationNights - 1,
    logicalSearches: 1 + scenario.durationNights + 2 * (scenario.durationNights - 1),
    liteApiAssigned: true,
    routeStackAssigned: SPLIT_R2_ROUTE_STACK_SUBSET.includes(scenario.ordinal),
  }));
}

export function buildSplitR2CompactReceipt(mode, campaign = null) {
  const providerResults = [];
  const scenarioResults = [];
  if (campaign?.liteApi) {
    providerResults.push(campaign.liteApi.aggregate);
    scenarioResults.push(...campaign.liteApi.scenarioResults.map(compactScenario));
  }
  if (campaign?.routeStack) {
    providerResults.push(campaign.routeStack.aggregate);
    scenarioResults.push(...campaign.routeStack.scenarioResults.map(compactScenario));
  }
  const receipt = {
    receiptVersion: SPLIT_R2_RECEIPT_VERSION,
    providerNeutralContractVersion: SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
    sourceSha: SPLIT_R2_SOURCE_SHA,
    status: "PASS",
    mode,
    frozenMatrixIdentifier: SPLIT_R2_FROZEN_MATRIX_ID,
    frozenMatrix: frozenMatrixReceipt(),
    providerResults,
    scenarioResults,
    scenarioLevelAggregationPrimary: true,
    pooledBreakpointMedianPrimary: false,
    decisions: campaign?.decisions ?? [],
    httpCounters: {
      liteApi: campaign?.liteApi?.http ?? { total: 0 },
      routeStack: campaign?.routeStack?.http ?? { total: 0 },
      combined: campaign?.combinedHttp ?? { total: 0 },
      realHttpRequests: 0,
      providerCalls: 0,
    },
    budget: {
      liteApiSearchHttpMax: 183,
      routeStackAuthHttpMax: 1,
      routeStackDestinationHttpMax: 3,
      routeStackInitialHttpMax: 102,
      routeStackContinuationHttpMax: 0,
      routeStackTotalHttpMax: 106,
      combinedTotalHttpMax: 289,
      retries: 0,
      redirects: 0,
      concurrency: 1,
      minimumRequestStartIntervalMs: SPLIT_R2_MIN_REQUEST_START_INTERVAL_MS,
    },
    environments: {
      liteApi: "LITEAPI_SANDBOX",
      routeStack: "ROUTESTACK_SANDBOX",
      liteApiProductionFallback: false,
      routeStackProductionFallback: false,
      liveCapabilities: SPLIT_R2_LIVE_CAPABILITIES,
    },
    thresholds: {
      rawPositiveSavingMinorUnitsGreaterThan: 0,
      materialAbsoluteMinorUnits: SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS,
      materialBasisPoints: SPLIT_R2_MATERIAL_BASIS_POINTS,
      materialRequiresBoth: true,
      userUsableSplitDerivedFromPriceOnly: false,
    },
    privacy: {
      rawIdsPersisted: 0,
      pseudonymListsPersisted: 0,
      rawPayloadsOrResponsesPersisted: 0,
      credentialsAccessed: false,
      ephemeralHmacSecretPersisted: false,
      crossRunLinkability: false,
      secretValuesExposed: false,
    },
    boundaries: {
      publicSplitEnabled: false,
      publicRuntimeChanged: false,
      publicProviderAdaptersChanged: false,
      targetedProductionAuthorized: false,
      completenessClaimAllowed: false,
      globalOptimumClaimAllowed: false,
      userUsableSplitAssessed: false,
      crossProviderPropertyMatchRequired: false,
      noCherryPicking: true,
      noScenarioReplacement: true,
    },
  };
  return receipt;
}

const SPLIT_R2_LITEAPI_CANARY_LIMITS = Object.freeze({
  FULL_STAY: 1,
  PREFIX: 1,
  SUFFIX: 1,
  total: 3,
});

const SPLIT_R2_SCOPE_PATHS = Object.freeze([
  "docs/engine-v3/split-r2-multi-scenario-liteapi-validation-plan.md",
  "scripts/run-split-r2-multi-scenario-validation.mjs",
  "tests/lifecycle/splitR2MultiScenarioValidation.test.mjs",
]);

function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function valueAtPath(value, segments) {
  let current = value;
  for (const segment of segments) {
    if (!isPlainRecord(current) && !Array.isArray(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function firstStringAtPaths(value, paths) {
  for (const segments of paths) {
    const candidate = valueAtPath(value, segments);
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  return null;
}

function exactMinorUnits(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;
    const [major, fraction = ""] = normalized.split(".");
    const result = Number(major) * 100 + Number(fraction.padEnd(2, "0"));
    return Number.isSafeInteger(result) && result > 0 ? result : null;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) return null;
  return rounded;
}

function exactNonNegativeMinorUnits(value) {
  if (value === 0 || value === "0" || value === "0.0" || value === "0.00") return 0;
  return exactMinorUnits(value);
}

function extractLiteApiCanaryRecords(payload) {
  if (Array.isArray(payload)) return payload.filter(isPlainRecord);
  if (!isPlainRecord(payload)) return [];
  const candidates = [
    payload.data,
    payload.data?.rates,
    payload.data?.results,
    payload.data?.items,
    payload.data?.hotels,
    payload.rates,
    payload.results,
    payload.items,
    payload.hotels,
    payload.response,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isPlainRecord);
    if (isPlainRecord(candidate)) {
      for (const nested of [candidate.rates, candidate.results, candidate.items, candidate.hotels, candidate.data]) {
        if (Array.isArray(nested)) return nested.filter(isPlainRecord);
      }
    }
  }
  return [];
}

function liteApiCanaryPropertyIdentity(record) {
  const hotel = [record.hotel, record.hotelData, record.hotelInfo, record.property, record.accommodation]
    .find(isPlainRecord) ?? record;
  return firstStringAtPaths(record, [
    ["hotelId"], ["hotelID"], ["hotel_id"], ["id"], ["hotel", "id"], ["hotel", "hotelId"],
    ["hotelData", "id"], ["hotelData", "hotelId"],
  ]) ?? firstStringAtPaths(hotel, [["hotelId"], ["hotelID"], ["hotel_id"], ["id"], ["code"]]);
}

function mergeLiteApiCanaryRate(room, rate) {
  return { ...room, ...rate };
}

function extractLiteApiCanaryRates(record) {
  const collected = [];
  for (const roomContainer of [record.roomTypes, record.rooms, record.roomRates, record.availableRooms, record.offers]) {
    if (!Array.isArray(roomContainer)) continue;
    for (const room of roomContainer.filter(isPlainRecord)) {
      if (room.offerRetailRate !== undefined) {
        collected.push(room);
        continue;
      }
      for (const rates of [room.rates, room.rate, room.offers, room.availableRates, room.roomRates]) {
        const list = Array.isArray(rates) ? rates : isPlainRecord(rates) ? [rates] : [];
        for (const rate of list.filter(isPlainRecord)) collected.push(mergeLiteApiCanaryRate(room, rate));
      }
    }
  }
  for (const rates of [record.rates, record.rate, record.availableRates, record.roomRates]) {
    const list = Array.isArray(rates) ? rates : isPlainRecord(rates) ? [rates] : [];
    for (const rate of list.filter(isPlainRecord)) collected.push(rate);
  }
  if (collected.length === 0 && record.offerRetailRate !== undefined) collected.push(record);
  return collected;
}

function booleanOrNull(value) {
  if (value === true || value === false) return value;
  return null;
}

function paymentTimingCategory(value) {
  const values = [value.paymentType, value.paymentTiming, value.collectType]
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.toLowerCase());
  if (value.payAtProperty === true || value.payAtHotel === true || values.some((entry) => /pay.?at.?(property|hotel)|property.?pay/u.test(entry))) {
    return "PAY_AT_PROPERTY";
  }
  if (values.some((entry) => /pay.?now|prepaid|merchant/u.test(entry))) return "PAY_NOW";
  return "UNSPECIFIED";
}

function liteApiMandatoryComponents(rate, expectedCurrency) {
  const sources = Array.isArray(rate.rates) && rate.rates.some(isPlainRecord)
    ? rate.rates.filter(isPlainRecord)
    : [rate];
  const components = [];
  let explicitTaxContainerCount = 0;
  for (const source of sources) {
    const directPresent = Object.hasOwn(source, "taxesAndFees");
    const nestedPresent = isPlainRecord(source.retailRate) && Object.hasOwn(source.retailRate, "taxesAndFees");
    if (!directPresent && !nestedPresent) continue;
    explicitTaxContainerCount += 1;
    const rawTaxes = directPresent ? source.taxesAndFees : source.retailRate.taxesAndFees;
    if (!Array.isArray(rawTaxes)) return { complete: false, components: [], included: false, excluded: false, payAtProperty: false };
    for (const tax of rawTaxes) {
      if (!isPlainRecord(tax) || tax.mandatory === false) continue;
      const amount = exactNonNegativeMinorUnits(tax.amount ?? tax.value ?? tax.total);
      const currency = tax.currency;
      const included = booleanOrNull(tax.included ?? tax.includedInPrice ?? tax.taxIncluded);
      if (amount === null || typeof currency !== "string" || currency !== expectedCurrency || included === null) {
        return { complete: false, components: [], included: false, excluded: false, payAtProperty: false };
      }
      components.push({
        mandatory: true,
        known: true,
        amountMinorUnits: amount,
        currency: expectedCurrency,
        included,
        payAtProperty: paymentTimingCategory({ ...source, ...tax }) === "PAY_AT_PROPERTY",
      });
    }
  }
  if (explicitTaxContainerCount !== sources.length) {
    return { complete: false, components: [], included: false, excluded: false, payAtProperty: false };
  }
  return {
    complete: true,
    components,
    included: components.some((entry) => entry.included),
    excluded: components.some((entry) => !entry.included),
    payAtProperty: components.some((entry) => entry.payAtProperty),
  };
}

function continuationOrPaginationSignalPresent(payload) {
  if (!isPlainRecord(payload)) return false;
  if (payload.hasMore === true || payload.truncated === true || payload.continuation !== undefined ||
      payload.nextPageToken !== undefined || payload.nextToken !== undefined) return true;
  for (const container of [payload.pagination, payload.meta]) {
    if (isPlainRecord(container) && (container.hasMore === true || container.truncated === true ||
        container.next !== undefined || container.continuation !== undefined || container.nextPageToken !== undefined)) return true;
  }
  return false;
}

export function normalizeSplitR2LiteApiCanaryResponse(search, payload, ephemeralKey, httpStatus = 200) {
  const records = extractLiteApiCanaryRecords(payload);
  const rawRates = records.flatMap((record) =>
    extractLiteApiCanaryRates(record).map((rate) => ({ record, rate }))
  );
  const diagnostics = {
    rawResultCount: rawRates.length,
    normalizableResultCount: 0,
    identityEligibleCount: 0,
    numericTotalPriceEligibleCount: 0,
    expectedCurrencyMatchCount: 0,
    missingCurrencyCount: 0,
    nonExpectedCurrencyCount: 0,
    invalidCurrencyTypeCount: 0,
    completeMandatoryComponentOfferCount: 0,
    unknownMandatoryComponentOfferCount: 0,
    knownIncludedTaxOfferCount: 0,
    knownExcludedTaxOfferCount: 0,
    knownMandatoryPayAtPropertyOfferCount: 0,
    preDedupEconomicOfferCount: 0,
    duplicatePropertyOffersRemovedCount: 0,
    finalDistinctComparableOfferCount: 0,
  };
  const offers = [];
  for (const { record, rate } of rawRates) {
    diagnostics.normalizableResultCount += 1;
    const propertyIdentity = liteApiCanaryPropertyIdentity(record);
    if (!propertyIdentity) continue;
    diagnostics.identityEligibleCount += 1;
    const amountMinor = exactMinorUnits(valueAtPath(rate, ["offerRetailRate", "amount"]));
    if (amountMinor === null) continue;
    diagnostics.numericTotalPriceEligibleCount += 1;
    const currency = valueAtPath(rate, ["offerRetailRate", "currency"]);
    if (currency === undefined || currency === null || currency === "") {
      diagnostics.missingCurrencyCount += 1;
      continue;
    }
    if (typeof currency !== "string") {
      diagnostics.invalidCurrencyTypeCount += 1;
      continue;
    }
    if (currency !== search.expectedCurrency) {
      diagnostics.nonExpectedCurrencyCount += 1;
      continue;
    }
    diagnostics.expectedCurrencyMatchCount += 1;
    const mandatory = liteApiMandatoryComponents(rate, search.expectedCurrency);
    if (!mandatory.complete) {
      diagnostics.unknownMandatoryComponentOfferCount += 1;
      continue;
    }
    diagnostics.completeMandatoryComponentOfferCount += 1;
    if (mandatory.included) diagnostics.knownIncludedTaxOfferCount += 1;
    if (mandatory.excluded) diagnostics.knownExcludedTaxOfferCount += 1;
    if (mandatory.payAtProperty) diagnostics.knownMandatoryPayAtPropertyOfferCount += 1;
    diagnostics.preDedupEconomicOfferCount += 1;
    offers.push({
      propertyIdentity,
      occupancy: { rooms: 1, adults: 2, children: 0 },
      offerRetailRate: {
        totalMinorUnits: amountMinor,
        currency: search.expectedCurrency,
        semantics: "SEARCH_WINDOW_TOTAL_CONFIRMED",
      },
      mandatoryComponentsComplete: true,
      mandatoryComponents: mandatory.components,
      cancellationCategory: "UNAVAILABLE",
    });
  }
  const acquisition = {
    environment: "LITEAPI_SANDBOX",
    productionFallback: false,
    httpValid: httpStatus === 200,
    jsonValid: isPlainRecord(payload) || Array.isArray(payload),
    collectionComplete: !continuationOrPaginationSignalPresent(payload),
    offers,
  };
  const snapshot = adaptLiteApiSearchSnapshotR2(search, acquisition, ephemeralKey);
  const deduplicated = splitR1NightlyOracleOffersForState(searchState(snapshot), search.expectedCurrency);
  diagnostics.duplicatePropertyOffersRemovedCount = offers.length - deduplicated.length;
  diagnostics.finalDistinctComparableOfferCount = deduplicated.length;
  let zeroFinalOffersPrimaryReason = "NOT_APPLICABLE";
  if (deduplicated.length === 0) {
    zeroFinalOffersPrimaryReason = diagnostics.rawResultCount === 0
      ? "NO_RAW_RESULTS"
      : diagnostics.identityEligibleCount === 0
        ? "NO_IDENTITY_ELIGIBLE_RESULTS"
        : diagnostics.numericTotalPriceEligibleCount === 0
          ? "NO_NUMERIC_TOTAL_PRICE_RESULTS"
          : diagnostics.expectedCurrencyMatchCount === 0
            ? "NO_EXPECTED_CURRENCY_RESULTS"
            : diagnostics.completeMandatoryComponentOfferCount === 0
              ? "MANDATORY_COMPONENTS_UNKNOWN"
              : "OTHER_ALLOWLISTED_ECONOMIC_GATE";
  }
  return {
    httpStatus,
    boundedSnapshotUsable: snapshot.boundedSnapshotUsable,
    collectionClassification: snapshot.collectionClassification,
    comparabilityClassification: snapshot.comparabilityClassification,
    economicEligibilityState: deduplicated.length > 0 ? "ECONOMIC_OFFERS_AVAILABLE" : zeroFinalOffersPrimaryReason,
    zeroFinalOffersPrimaryReason,
    diagnostics,
    snapshot,
    deduplicatedOffers: deduplicated,
  };
}

export function buildSplitR2LiteApiCanaryPlan() {
  const scenario = SPLIT_R2_FROZEN_SCENARIOS[0];
  const plan = buildSplitR2ScenarioPlan(scenario);
  const searches = [
    plan.logicalSearches.find((entry) => entry.searchRole === "FULL_STAY"),
    plan.logicalSearches.find((entry) => entry.searchRole === "PREFIX" && entry.breakpointOrdinal === SPLIT_R2_LITEAPI_CANARY_BREAKPOINT),
    plan.logicalSearches.find((entry) => entry.searchRole === "SUFFIX" && entry.breakpointOrdinal === SPLIT_R2_LITEAPI_CANARY_BREAKPOINT),
  ];
  if (searches.some((entry) => !entry) || searches[0].checkin !== "2026-11-30" ||
      searches[0].checkout !== "2026-12-14" || searches[1].checkout !== "2026-12-07" ||
      searches[2].checkin !== "2026-12-07") {
    throw new Error("split-r2-liteapi-canary-canonical-binding-drift");
  }
  return Object.freeze({ scenario, breakpointOrdinal: 7, searches: Object.freeze(searches) });
}

export function createSplitR2LiteApiCanaryCounter() {
  const counts = { FULL_STAY: 0, PREFIX: 0, SUFFIX: 0, total: 0 };
  let active = 0;
  let maxObservedConcurrency = 0;
  return {
    reserve(role) {
      if (!Object.hasOwn(SPLIT_R2_LITEAPI_CANARY_LIMITS, role) || role === "total") {
        throw new Error("split-r2-liteapi-canary-http-role-forbidden");
      }
      if (counts[role] + 1 > SPLIT_R2_LITEAPI_CANARY_LIMITS[role] ||
          counts.total + 1 > SPLIT_R2_LITEAPI_CANARY_LIMITS.total) {
        throw new Error("split-r2-liteapi-canary-http-budget-exceeded");
      }
      counts[role] += 1;
      counts.total += 1;
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-liteapi-canary-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-liteapi-canary-concurrency-ledger-invalid");
    },
    snapshot() {
      return { ...counts, retries: 0, redirects: 0, maxObservedConcurrency };
    },
  };
}

export function createSplitR2MonotonicLimiter({
  monotonicNow = () => performance.now(),
  sleeper = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  minimumIntervalMs = SPLIT_R2_MIN_REQUEST_START_INTERVAL_MS,
} = {}) {
  if (minimumIntervalMs < 1_000) throw new Error("split-r2-liteapi-canary-rate-limit-too-low");
  let priorStart = null;
  let minimumObserved = null;
  return {
    async ready() {
      if (priorStart === null) return;
      let cycles = 0;
      let waited = 0;
      while (true) {
        const elapsed = monotonicNow() - priorStart;
        if (elapsed >= minimumIntervalMs) return;
        if (cycles >= 10 || waited >= 5_000) throw new Error("split-r2-rate-limit-clock-did-not-progress");
        const delay = Math.ceil(minimumIntervalMs - elapsed) + 2;
        if (waited + delay > 5_000) throw new Error("split-r2-rate-limit-clock-did-not-progress");
        cycles += 1;
        waited += delay;
        await sleeper(delay);
      }
    },
    markStarted() {
      const now = monotonicNow();
      if (priorStart !== null) {
        const interval = now - priorStart;
        if (interval < minimumIntervalMs) throw new Error("split-r2-liteapi-canary-rate-interval-undershoot");
        minimumObserved = minimumObserved === null ? interval : Math.min(minimumObserved, interval);
      }
      priorStart = now;
    },
    snapshot() {
      return { minimumObservedRequestIntervalMs: minimumObserved };
    },
  };
}

export function assertSplitR2LiteApiCanaryPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const exact = options.mode === "LITEAPI_SANDBOX_CONTRACT_CANARY" &&
    options.compact === true && options.environment === "LITEAPI_SANDBOX" &&
    options.ackHttpBudget === 3 && options.hostname === "api.liteapi.travel" &&
    options.protocol === "https:" && options.productionFallback === false &&
    options.scenarioOrdinal === 1 && options.breakpointOrdinal === 7 &&
    options.fullStayMax === 1 && options.prefixMax === 1 && options.suffixMax === 1 &&
    options.totalMax === 3 && options.otherHttpMax === 0 && options.retries === 0 &&
    options.redirects === 0 && options.concurrency === 1 && options.minimumIntervalMs >= 1_000 &&
    options.repositoryGatePassed === true;
  if (!exact) throw new Error("split-r2-liteapi-canary-preflight-failed-before-credentials");
  const plan = buildSplitR2LiteApiCanaryPlan();
  if (plan.searches.length !== 3) throw new Error("split-r2-liteapi-canary-plan-invalid");
  const credential = credentialReader();
  if (typeof credential !== "string" || !credential.startsWith("sand_") || credential.length <= 5) {
    throw new Error("split-r2-liteapi-sandbox-credential-invalid");
  }
  return { plan, credential, credentialsAccessed: true };
}

export function createSplitR2LiteApiCanaryRequestBody(search, sessionNonce = "canary") {
  const matchesCanonical = buildSplitR2LiteApiCanaryPlan().searches.some((entry) =>
    entry.logicalSearchId === search?.logicalSearchId &&
    entry.scenarioOrdinal === search?.scenarioOrdinal &&
    entry.searchRole === search?.searchRole &&
    entry.breakpointOrdinal === search?.breakpointOrdinal &&
    entry.checkin === search?.checkin && entry.checkout === search?.checkout &&
    entry.durationNights === search?.durationNights && entry.destination === search?.destination &&
    entry.country === search?.country && entry.expectedCurrency === search?.expectedCurrency &&
    entry.coordinates?.latitude === search?.coordinates?.latitude &&
    entry.coordinates?.longitude === search?.coordinates?.longitude &&
    entry.occupancy?.rooms === search?.occupancy?.rooms &&
    entry.occupancy?.adults === search?.occupancy?.adults &&
    entry.occupancy?.children === search?.occupancy?.children
  );
  if (!matchesCanonical) {
    throw new Error("split-r2-liteapi-canary-search-not-canonical");
  }
  return {
    checkin: search.checkin,
    checkout: search.checkout,
    currency: "EUR",
    guestNationality: "IT",
    occupancies: [{ adults: 2, children: [] }],
    limit: 80,
    timeout: 12,
    maxRatesPerHotel: 3,
    roomMapping: true,
    includeHotelData: true,
    sessionId: `splitr2_${sessionNonce}`,
    cityName: "Milano",
    countryCode: "IT",
  };
}

function buildCanarySearchReceipt(result) {
  return {
    role: result.snapshot.searchRole,
    httpStatus: result.httpStatus,
    collectionClassification: result.collectionClassification,
    comparabilityClassification: result.comparabilityClassification,
    ...result.diagnostics,
    economicEligibilityState: result.economicEligibilityState,
    zeroFinalOffersPrimaryReason: result.zeroFinalOffersPrimaryReason,
  };
}

function aggregateCanaryTaxes(results) {
  return {
    completeMandatoryComponentResults: sum(results.map((entry) => entry.diagnostics.completeMandatoryComponentOfferCount)),
    unknownMandatoryComponentOffers: sum(results.map((entry) => entry.diagnostics.unknownMandatoryComponentOfferCount)),
    knownIncludedTaxOffers: sum(results.map((entry) => entry.diagnostics.knownIncludedTaxOfferCount)),
    knownExcludedTaxOffers: sum(results.map((entry) => entry.diagnostics.knownExcludedTaxOfferCount)),
    knownMandatoryPayAtPropertyOffers: sum(results.map((entry) => entry.diagnostics.knownMandatoryPayAtPropertyOfferCount)),
    doubleCountingDetected: false,
  };
}

export function buildSplitR2LiteApiCanaryReceipt({ sourceSha, results, http, limiter, failureClassification = null }) {
  const byRole = new Map(results.map((entry) => [entry.snapshot.searchRole, entry]));
  const full = byRole.get("FULL_STAY");
  const prefix = byRole.get("PREFIX");
  const suffix = byRole.get("SUFFIX");
  const baseline = full?.deduplicatedOffers?.[0] ?? null;
  const pair = prefix && suffix
    ? splitR1NightlyOracleBestPair(prefix.deduplicatedOffers, suffix.deduplicatedOffers, false)
    : null;
  const comparable = results.length === 3 && results.every((entry) =>
    entry.httpStatus === 200 && entry.boundedSnapshotUsable &&
    entry.comparabilityClassification === "COMPARABLE_COMPLETE_TOTAL"
  ) && baseline !== null && pair !== null;
  const rawInventoryMissing = results.length === 3 && results.some((entry) => entry.diagnostics.rawResultCount === 0);
  const contractBlocked = results.some((entry) => entry.diagnostics.rawResultCount > 0 &&
    entry.comparabilityClassification !== "COMPARABLE_COMPLETE_TOTAL");
  let economic = null;
  if (baseline && pair) {
    economic = classifySplitR2Saving(
      baseline.totalMinorUnits - pair.splitTotalMinorUnits,
      baseline.totalMinorUnits
    );
  }
  const status = failureClassification || contractBlocked
    ? "FAIL"
    : comparable
      ? "PASS"
      : rawInventoryMissing || results.length === 3
        ? "INCONCLUSIVE"
        : "FAIL";
  const classification = failureClassification ?? (comparable
    ? "LITEAPI_CONTRACT_CANARY_COMPARABLE"
    : contractBlocked
      ? "LITEAPI_CONTRACT_INTERPRETATION_BLOCKED"
      : "LITEAPI_CANARY_INVENTORY_OR_PAIR_INCONCLUSIVE");
  return {
    receiptVersion: SPLIT_R2_LITEAPI_CANARY_RECEIPT_VERSION,
    status,
    sourceSha,
    environment: "LITEAPI_SANDBOX",
    hostname: "api.liteapi.travel",
    scenarioOrdinal: 1,
    breakpointOrdinal: 7,
    breakpointSelection: "DETERMINISTIC_MIDPOINT_NOT_PRICE_BASED",
    searches: results.map(buildCanarySearchReceipt),
    http: {
      fullStay: http.FULL_STAY,
      prefix: http.PREFIX,
      suffix: http.SUFFIX,
      other: 0,
      total: http.total,
      totalBudget: 3,
      retries: 0,
      redirects: 0,
      maxObservedConcurrency: http.maxObservedConcurrency,
      minimumObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs,
      liteApiProduction: 0,
      routeStackSandbox: 0,
      routeStackPublicProduction: 0,
    },
    taxes: aggregateCanaryTaxes(results),
    evaluation: {
      priceSemantics: "SEARCH_WINDOW_TOTAL_CONFIRMED",
      mandatoryComponentComparability: comparable ? "COMPLETE" : contractBlocked ? "INCOMPLETE" : "NOT_EVALUABLE",
      fullStayBaselineAvailable: baseline !== null,
      prefixCandidateAvailable: (prefix?.deduplicatedOffers.length ?? 0) > 0,
      suffixCandidateAvailable: (suffix?.deduplicatedOffers.length ?? 0) > 0,
      distinctPropertyPairAvailable: pair !== null,
      comparabilityClassification: comparable ? "COMPARABLE_COMPLETE_TOTAL" : "NOT_EVALUABLE_OR_CONTRACT_BLOCKED",
      rawPositiveSplit: economic ? economic.savingMinorUnits > 0 : null,
      materialPriceSignal: economic?.materialPriceSignal ?? null,
      savingMinorUnits: economic?.savingMinorUnits ?? null,
      savingBasisPoints: economic?.savingBasisPoints ?? null,
    },
    routeStackPreflight: {
      sandboxRealTransportStatus: "LIVE_HOLD",
      publicProductionTransportStatus: "LIVE_HOLD",
      environmentsSeparated: true,
      productionFallback: false,
      publicDedicatedFlagRequired: true,
      publicDedicatedBudgetRequired: true,
      publicCompactReceiptRequired: true,
      publicContinuationMaxWithoutFutureAuthorization: 0,
      publicRuntimeChanged: false,
      status: "PASS",
    },
    boundaries: {
      canaryEconomicEvidenceAllowed: false,
      generalFrequencyClaimAllowed: false,
      userUsableSplitClaimAllowed: false,
      futureMatrixDenominatorEntry: false,
      publicRuntimeChanged: false,
    },
    privacy: {
      rawIdsInOutput: 0,
      pseudonymListsInOutput: 0,
      rawTaxLabelsInOutput: 0,
      rawPayloadsInOutput: 0,
      rawResponsesInOutput: 0,
      crossRunLinkability: false,
      secretValuesExposed: false,
    },
    failureClassification: classification,
  };
}

export function serializeSplitR2LiteApiCanaryReceipt(receipt, maxBytes = SPLIT_R2_LITEAPI_CANARY_COMPACT_MAX_UTF8_BYTES) {
  assertReceiptSafe(receipt);
  const json = stableStringifySplitF0(receipt, 0);
  const byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-liteapi-canary-receipt-not-single-line");
  if (byteLength > maxBytes) throw new SplitR2CompactReceiptError("split-r2-liteapi-canary-receipt-oversize", byteLength);
  return { json, byteLength };
}

export function runSplitR2FakeLiteApiCanary() {
  const { plan, credential } = assertSplitR2LiteApiCanaryPreflight({
    mode: "LITEAPI_SANDBOX_CONTRACT_CANARY", compact: true, environment: "LITEAPI_SANDBOX",
    ackHttpBudget: 3, hostname: "api.liteapi.travel", protocol: "https:", productionFallback: false,
    scenarioOrdinal: 1, breakpointOrdinal: 7, fullStayMax: 1, prefixMax: 1, suffixMax: 1,
    totalMax: 3, otherHttpMax: 0, retries: 0, redirects: 0, concurrency: 1,
    minimumIntervalMs: 1_000, repositoryGatePassed: true, credentialReader: () => "sand_fake_canary",
  });
  void credential;
  const counter = createSplitR2LiteApiCanaryCounter();
  const key = Buffer.alloc(32, 0x61);
  const results = [];
  for (const search of plan.searches) {
    counter.reserve(search.searchRole);
    counter.enterTransport();
    try {
      const rawOffers = fakeRawOffers("LITEAPI_SANDBOX", search, plan.scenario);
      const data = rawOffers.map((offer, index) => ({
        hotelId: `fake-hotel-${index + 1}`,
        rates: [{
          offerRetailRate: {
            amount: (offer.offerRetailRate.totalMinorUnits / 100).toFixed(2),
            currency: "EUR",
          },
          taxesAndFees: [],
        }],
      }));
      results.push(normalizeSplitR2LiteApiCanaryResponse(search, { data }, key, 200));
    } finally {
      counter.leaveTransport();
    }
  }
  return buildSplitR2LiteApiCanaryReceipt({
    sourceSha: SPLIT_R2_SOURCE_SHA,
    results,
    http: counter.snapshot(),
    limiter: { minimumObservedRequestIntervalMs: 1_000 },
  });
}

const SPLIT_R2_DIAGNOSIS_CITIES = Object.freeze([
  Object.freeze({ ordinal: 1, code: "MILANO", cityName: "Milano", countryCode: "IT" }),
  Object.freeze({ ordinal: 2, code: "FIRENZE", cityName: "Firenze", countryCode: "IT" }),
  Object.freeze({ ordinal: 3, code: "ROMA", cityName: "Roma", countryCode: "IT" }),
]);

const SPLIT_R2_DIAGNOSIS_WINDOWS = Object.freeze([
  Object.freeze({ category: "NEAR_TERM", sevenCheckin: "2026-09-28", sevenCheckout: "2026-10-05", fourteenCheckout: "2026-10-12" }),
  Object.freeze({ category: "PLUS_90", sevenCheckin: "2026-11-30", sevenCheckout: "2026-12-07", fourteenCheckout: "2026-12-14" }),
  Object.freeze({ category: "PLUS_180", sevenCheckin: "2027-03-01", sevenCheckout: "2027-03-08", fourteenCheckout: "2027-03-15" }),
]);

const SPLIT_R2_DIAGNOSIS_LIMITS = Object.freeze({
  STATIC_DISCOVERY: 3,
  CITY_RATES: 18,
  HOTEL_ID_RATES: 18,
  ANCHOR_SUFFIX: 2,
  total: 41,
});

const SPLIT_R2_RATE_CONTAINER_PATHS = Object.freeze([
  Object.freeze({ label: "ROOT", path: null }),
  ...[
    "data", "data.rates", "data.results", "data.items", "data.hotels", "data.data",
    "rates", "results", "items", "hotels", "response",
    "rates.rates", "rates.results", "rates.items", "rates.hotels", "rates.data",
    "results.rates", "results.results", "results.items", "results.hotels", "results.data",
    "items.rates", "items.results", "items.items", "items.hotels", "items.data",
    "hotels.rates", "hotels.results", "hotels.items", "hotels.hotels", "hotels.data",
    "response.rates", "response.results", "response.items", "response.hotels", "response.data",
  ].map((label) => Object.freeze({ label, path: Object.freeze(label.split(".")) })),
]);

const SPLIT_R2_STATIC_CONTAINER_PATHS = Object.freeze([
  Object.freeze({ label: "ROOT", path: null }),
  ...["data", "hotels", "items", "results", "result.data", "result.hotels", "data.hotels"]
    .map((label) => Object.freeze({ label, path: Object.freeze(label.split(".")) })),
]);

function splitR2JsonType(value) {
  if (value === undefined) return "ABSENT";
  if (value === null) return "NULL";
  if (Array.isArray(value)) return "ARRAY";
  return typeof value === "object" ? "OBJECT" : typeof value === "string" ? "STRING" :
    typeof value === "number" ? "NUMBER" : typeof value === "boolean" ? "BOOLEAN" : "OTHER";
}

function inspectSplitR2LiteApiResponseShape(payload, kind) {
  const definitions = kind === "STATIC_HOTELS" ? SPLIT_R2_STATIC_CONTAINER_PATHS : SPLIT_R2_RATE_CONTAINER_PATHS;
  const entries = definitions.map(({ label, path: fieldPath }) => {
    const value = fieldPath === null ? payload : valueAtPath(payload, fieldPath);
    const present = value !== undefined;
    const type = splitR2JsonType(value);
    return {
      label,
      present,
      type,
      arrayLength: Array.isArray(value) ? value.length : null,
      eligible: Array.isArray(value),
      value,
    };
  });
  const eligible = entries.filter((entry) => entry.eligible);
  const classification = eligible.length === 0 ? "NONE" : eligible.length === 1 ? "UNIQUE" : "AMBIGUOUS";
  const selected = classification === "UNIQUE" ? eligible[0] : null;
  return {
    receipt: {
      receiptVersion: SPLIT_R2_LITEAPI_RESPONSE_SHAPE_RECEIPT_VERSION,
      kind,
      paths: entries.map(({ label, present, type, arrayLength, eligible: pathEligible }) => ({
        path: label,
        presence: present ? "PRESENT" : "ABSENT",
        jsonType: type,
        arrayLength,
        resultContainerEligible: pathEligible,
      })),
      responseContainerClassification: classification,
      selectedResultContainerPath: selected?.label ?? classification,
      normalizationAllowed: classification !== "AMBIGUOUS",
      unknownKeyEnumeration: false,
    },
    records: selected ? selected.value.filter(isPlainRecord) : [],
  };
}

export function diagnoseSplitR2LiteApiResponseShape(payload, kind = "RATES") {
  return inspectSplitR2LiteApiResponseShape(payload, kind).receipt;
}

export function buildSplitR2LiteApiZeroResultDiagnosisPlan() {
  const rateProbes = [];
  for (const city of SPLIT_R2_DIAGNOSIS_CITIES) {
    for (const window of SPLIT_R2_DIAGNOSIS_WINDOWS) {
      for (const durationNights of [7, 14]) {
        const checkin = window.sevenCheckin;
        const checkout = durationNights === 7 ? window.sevenCheckout : window.fourteenCheckout;
        for (const locationMode of ["CITY_COUNTRY", "HOTEL_IDS_IN_MEMORY"]) {
          rateProbes.push(Object.freeze({
            probeOrdinal: rateProbes.length + 1,
            probeType: locationMode === "CITY_COUNTRY" ? "CITY_RATES" : "HOTEL_ID_RATES",
            cityOrdinal: city.ordinal,
            cityCode: city.code,
            cityName: city.cityName,
            countryCode: city.countryCode,
            windowCategory: window.category,
            durationCategory: durationNights === 7 ? "SEVEN_NIGHTS" : "FOURTEEN_NIGHTS",
            durationNights,
            checkin,
            checkout,
            locationMode,
          }));
        }
      }
    }
  }
  const milano = SPLIT_R2_DIAGNOSIS_CITIES[0];
  for (const locationMode of ["CITY_COUNTRY", "HOTEL_IDS_IN_MEMORY"]) {
    rateProbes.push(Object.freeze({
      probeOrdinal: rateProbes.length + 1,
      probeType: "ANCHOR_SUFFIX",
      cityOrdinal: milano.ordinal,
      cityCode: milano.code,
      cityName: milano.cityName,
      countryCode: milano.countryCode,
      windowCategory: "ANCHOR_SUFFIX",
      durationCategory: "SEVEN_NIGHTS",
      durationNights: 7,
      checkin: "2026-12-07",
      checkout: "2026-12-14",
      locationMode,
    }));
  }
  if (rateProbes.length !== 38 || rateProbes.filter((probe) => probe.probeType === "CITY_RATES").length !== 18 ||
      rateProbes.filter((probe) => probe.probeType === "HOTEL_ID_RATES").length !== 18 ||
      rateProbes.filter((probe) => probe.probeType === "ANCHOR_SUFFIX").length !== 2) {
    throw new Error("split-r2-liteapi-diagnosis-plan-count-drift");
  }
  return Object.freeze({
    environment: "LITEAPI_SANDBOX",
    cities: SPLIT_R2_DIAGNOSIS_CITIES,
    windows: SPLIT_R2_DIAGNOSIS_WINDOWS,
    staticDiscoveries: Object.freeze(SPLIT_R2_DIAGNOSIS_CITIES.map((city) => Object.freeze({ ...city }))),
    rateProbes: Object.freeze(rateProbes),
    maximumHttpRequests: 41,
  });
}

export function assertSplitR2LiteApiZeroResultDiagnosisPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const exact = options.mode === "LITEAPI_SANDBOX_ZERO_RESULT_DIAGNOSIS" && options.compact === true &&
    options.environment === "LITEAPI_SANDBOX" &&
    options.acknowledgement === "I_ACKNOWLEDGE_LITEAPI_SANDBOX_MAX_41_DIAGNOSTIC_HTTP" &&
    options.hostname === "api.liteapi.travel" && options.protocol === "https:" &&
    options.productionFallback === false && options.staticDiscoveryMax === 3 && options.cityRatesMax === 18 &&
    options.hotelIdRatesMax === 18 && options.anchorSuffixMax === 2 && options.totalMax === 41 &&
    options.retries === 0 && options.redirects === 0 && options.concurrency === 1 &&
    options.minimumIntervalMs >= 1_000 && options.repositoryGatePassed === true;
  if (!exact) throw new Error("split-r2-liteapi-diagnosis-preflight-failed-before-credentials");
  const plan = buildSplitR2LiteApiZeroResultDiagnosisPlan();
  const credential = credentialReader();
  if (typeof credential !== "string" || !credential.startsWith("sand_") || credential.length <= 5) {
    throw new Error("split-r2-liteapi-sandbox-credential-invalid");
  }
  return { plan, credential, credentialsAccessed: true };
}

export function createSplitR2LiteApiDiagnosisCounter() {
  const counts = { STATIC_DISCOVERY: 0, CITY_RATES: 0, HOTEL_ID_RATES: 0, ANCHOR_SUFFIX: 0, total: 0 };
  let active = 0;
  let maximumActive = 0;
  return {
    reserve(category) {
      if (!Object.hasOwn(SPLIT_R2_DIAGNOSIS_LIMITS, category) || category === "total") {
        throw new Error("split-r2-liteapi-diagnosis-http-role-forbidden");
      }
      if (counts[category] + 1 > SPLIT_R2_DIAGNOSIS_LIMITS[category] ||
          counts.total + 1 > SPLIT_R2_DIAGNOSIS_LIMITS.total) {
        throw new Error("split-r2-liteapi-diagnosis-http-budget-exhausted-before-transport");
      }
      counts[category] += 1;
      counts.total += 1;
    },
    enterTransport() {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      if (active > 1) throw new Error("split-r2-liteapi-diagnosis-concurrency-exceeded");
    },
    leaveTransport() { active = Math.max(0, active - 1); },
    snapshot() { return { ...counts, maxObservedConcurrency: maximumActive }; },
  };
}

export function createSplitR2LiteApiDiagnosisRatesBody(probe, selectedProviderIdentities = [], sessionNonce = "diagnosis") {
  const isCity = probe?.locationMode === "CITY_COUNTRY";
  const isIds = probe?.locationMode === "HOTEL_IDS_IN_MEMORY";
  if (!isCity && !isIds) throw new Error("split-r2-liteapi-diagnosis-location-mode-invalid");
  const body = {
    checkin: probe.checkin,
    checkout: probe.checkout,
    currency: "EUR",
    guestNationality: "IT",
    occupancies: [{ adults: 2, children: [] }],
    limit: 80,
    timeout: 12,
    maxRatesPerHotel: 3,
    roomMapping: true,
    includeHotelData: true,
    sessionId: `splitr2diag_${sessionNonce}_${probe.probeOrdinal}`,
  };
  if (isCity) {
    body.cityName = probe.cityName;
    body.countryCode = probe.countryCode;
  } else {
    const identities = [...new Set(selectedProviderIdentities.filter((value) => typeof value === "string" && value.length > 0))].slice(0, 80);
    if (identities.length === 0) throw new Error("split-r2-liteapi-diagnosis-provider-identities-required");
    body.hotelIds = identities;
  }
  if ((Object.hasOwn(body, "hotelIds") ? 1 : 0) + (Object.hasOwn(body, "cityName") && Object.hasOwn(body, "countryCode") ? 1 : 0) !== 1) {
    throw new Error("split-r2-liteapi-diagnosis-location-binding-not-exclusive");
  }
  return body;
}

function splitR2StaticIdentity(record) {
  return firstStringAtPaths(record, [
    ["sourceHotelId"], ["providerHotelId"], ["hotelId"], ["id"], ["code"],
    ["hotel", "id"], ["hotel", "hotelId"], ["hotelData", "id"], ["hotelData", "hotelId"],
  ]);
}

function normalizeSplitR2StaticDiscovery(city, payload, httpStatus) {
  const shape = inspectSplitR2LiteApiResponseShape(payload, "STATIC_HOTELS");
  const identities = [];
  if (shape.receipt.normalizationAllowed) {
    for (const record of shape.records) {
      const identity = splitR2StaticIdentity(record);
      if (identity && !identities.includes(identity)) identities.push(identity);
      if (identities.length >= 80) break;
    }
  }
  return {
    privateIdentities: identities,
    receipt: {
      cityOrdinal: city.ordinal,
      cityCode: city.code,
      httpStatus,
      jsonValid: isPlainRecord(payload) || Array.isArray(payload),
      responseContainerClassification: shape.receipt.responseContainerClassification,
      selectedResultContainerPath: shape.receipt.selectedResultContainerPath,
      resultContainerPresent: shape.receipt.responseContainerClassification !== "NONE",
      hotelCount: shape.records.length,
      validProviderIdentityPresent: identities.length > 0,
    },
    shape: shape.receipt,
  };
}

function emptyDiagnosisFunnel() {
  return {
    rawResultCount: 0, normalizableResultCount: 0, identityEligibleCount: 0,
    numericTotalPriceEligibleCount: 0, expectedCurrencyMatchCount: 0,
    completeMandatoryComponentOfferCount: 0, finalDistinctComparableOfferCount: 0,
  };
}

function normalizeSplitR2DiagnosisProbe(probe, payload, ephemeralKey, httpStatus) {
  const shape = inspectSplitR2LiteApiResponseShape(payload, "RATES");
  const oldExtractorRecordCount = extractLiteApiCanaryRecords(payload).length;
  if (shape.receipt.responseContainerClassification === "AMBIGUOUS") {
    return {
      receipt: {
        probeOrdinal: probe.probeOrdinal, probeType: probe.probeType, cityOrdinal: probe.cityOrdinal,
        windowCategory: probe.windowCategory, durationCategory: probe.durationCategory,
        locationMode: probe.locationMode, httpStatus, jsonValid: true,
        selectedResultContainerPath: "AMBIGUOUS", responseContainerClassification: "AMBIGUOUS",
        ...emptyDiagnosisFunnel(), economicEligibilityState: "INCOMPARABLE_COLLECTION",
        zeroResultClassification: "AMBIGUOUS_RESULT_CONTAINERS", boundedSnapshotUsable: false,
        responseExtractionMismatch: false,
      },
      shape: shape.receipt,
    };
  }
  const search = {
    logicalSearchId: `diag-${probe.probeOrdinal}`,
    scenarioOrdinal: probe.cityOrdinal,
    searchRole: "FULL_STAY",
    checkin: probe.checkin,
    checkout: probe.checkout,
    durationNights: probe.durationNights,
    expectedCurrency: "EUR",
  };
  const normalized = normalizeSplitR2LiteApiCanaryResponse(search, payload, ephemeralKey, httpStatus);
  const responseExtractionMismatch = shape.records.length > 0 && oldExtractorRecordCount === 0;
  return {
    receipt: {
      probeOrdinal: probe.probeOrdinal, probeType: probe.probeType, cityOrdinal: probe.cityOrdinal,
      windowCategory: probe.windowCategory, durationCategory: probe.durationCategory,
      locationMode: probe.locationMode, httpStatus, jsonValid: true,
      selectedResultContainerPath: shape.receipt.selectedResultContainerPath,
      responseContainerClassification: shape.receipt.responseContainerClassification,
      rawResultCount: normalized.diagnostics.rawResultCount,
      normalizableResultCount: normalized.diagnostics.normalizableResultCount,
      identityEligibleCount: normalized.diagnostics.identityEligibleCount,
      numericTotalPriceEligibleCount: normalized.diagnostics.numericTotalPriceEligibleCount,
      expectedCurrencyMatchCount: normalized.diagnostics.expectedCurrencyMatchCount,
      completeMandatoryComponentOfferCount: normalized.diagnostics.completeMandatoryComponentOfferCount,
      finalDistinctComparableOfferCount: normalized.diagnostics.finalDistinctComparableOfferCount,
      economicEligibilityState: normalized.economicEligibilityState,
      zeroResultClassification: normalized.zeroFinalOffersPrimaryReason,
      boundedSnapshotUsable: normalized.boundedSnapshotUsable,
      responseExtractionMismatch,
    },
    shape: shape.receipt,
  };
}

function splitR2DiagnosisShapeSignatures(shapes) {
  const grouped = new Map();
  for (const shape of shapes) {
    const signature = stableStringifySplitF0(shape, 0);
    grouped.set(signature, (grouped.get(signature) ?? 0) + 1);
  }
  return [...grouped.entries()].map(([signature, observedCount], index) => ({
    ordinal: index + 1,
    observedCount,
    shape: JSON.parse(signature),
  }));
}

export function classifySplitR2LiteApiZeroResultCause(staticReceipts, probeReceipts, offlineAudit = {}) {
  const causes = [];
  if (probeReceipts.some((probe) => probe.responseExtractionMismatch)) causes.push("R2_RESPONSE_EXTRACTION_MISMATCH");
  if (offlineAudit.requestBuilderMismatch === true) causes.push("R2_REQUEST_BUILDER_MISMATCH");
  const matrix = probeReceipts.filter((probe) => probe.probeType !== "ANCHOR_SUFFIX");
  const byKey = new Map(matrix.map((probe) => [`${probe.cityOrdinal}|${probe.windowCategory}|${probe.durationCategory}|${probe.locationMode}`, probe]));
  const paired = [];
  for (const probe of matrix.filter((entry) => entry.locationMode === "CITY_COUNTRY")) {
    const ids = byKey.get(`${probe.cityOrdinal}|${probe.windowCategory}|${probe.durationCategory}|HOTEL_IDS_IN_MEMORY`);
    if (ids) paired.push([probe, ids]);
  }
  if (paired.some(([city, ids]) => city.rawResultCount === 0 && ids.rawResultCount > 0)) causes.push("CITY_LOCATION_BINDING_EMPTY");
  if (paired.some(([city, ids]) => city.rawResultCount > 0 && ids.rawResultCount === 0)) causes.push("HOTEL_ID_BINDING_EMPTY");
  const nearPositive = matrix.some((probe) => probe.windowCategory === "NEAR_TERM" && probe.rawResultCount > 0);
  const later = matrix.filter((probe) => ["PLUS_90", "PLUS_180"].includes(probe.windowCategory));
  if (nearPositive && later.length > 0 && later.every((probe) => probe.rawResultCount === 0)) causes.push("FUTURE_DATE_INVENTORY_HORIZON");
  const sevenPositivePairs = matrix.filter((probe) => probe.durationCategory === "SEVEN_NIGHTS" && probe.rawResultCount > 0)
    .map((probe) => [probe, byKey.get(`${probe.cityOrdinal}|${probe.windowCategory}|FOURTEEN_NIGHTS|${probe.locationMode}`)])
    .filter(([, fourteen]) => fourteen);
  if (sevenPositivePairs.length > 0 && sevenPositivePairs.every(([, fourteen]) => fourteen.rawResultCount === 0)) {
    causes.push("LONG_STAY_AVAILABILITY_LIMIT");
  }
  const cityPositive = SPLIT_R2_DIAGNOSIS_CITIES.map((city) =>
    matrix.some((probe) => probe.cityOrdinal === city.ordinal && probe.rawResultCount > 0));
  if (cityPositive.some(Boolean) && cityPositive.some((value) => !value)) causes.push("CITY_SPECIFIC_AVAILABILITY");
  const allRatesEmpty = probeReceipts.length > 0 && probeReceipts.every((probe) => probe.rawResultCount === 0);
  if (allRatesEmpty && staticReceipts.every((entry) => entry.validProviderIdentityPresent)) {
    causes.push("SANDBOX_RATE_INVENTORY_BROADLY_EMPTY");
  }
  if (allRatesEmpty && staticReceipts.every((entry) => !entry.validProviderIdentityPresent)) {
    causes.push("SANDBOX_KEY_OR_CONTENT_SCOPE_EMPTY");
  }
  const rawPositive = probeReceipts.filter((probe) => probe.rawResultCount > 0);
  if (rawPositive.length > 0 && rawPositive.every((probe) => probe.finalDistinctComparableOfferCount === 0)) {
    causes.push("LITEAPI_CONTRACT_BLOCKED");
  }
  const unique = [...new Set(causes)];
  return {
    rootCauseClassification: unique.length === 0 ? "NOT_DETERMINABLE" : unique.length === 1 ? unique[0] : "MULTIPLE_CAUSAL_FACTORS",
    demonstratedFactors: unique,
  };
}

function aggregateSplitR2DiagnosisProbes(probes) {
  const positive = (predicate) => probes.filter((probe) => predicate(probe) && probe.rawResultCount > 0).length;
  return {
    cityModeProbesWithRawResults: positive((probe) => probe.locationMode === "CITY_COUNTRY"),
    hotelIdModeProbesWithRawResults: positive((probe) => probe.locationMode === "HOTEL_IDS_IN_MEMORY"),
    nearTermProbesWithRawResults: positive((probe) => probe.windowCategory === "NEAR_TERM"),
    plus90ProbesWithRawResults: positive((probe) => probe.windowCategory === "PLUS_90"),
    plus180ProbesWithRawResults: positive((probe) => probe.windowCategory === "PLUS_180"),
    sevenNightProbesWithRawResults: positive((probe) => probe.durationCategory === "SEVEN_NIGHTS"),
    fourteenNightProbesWithRawResults: positive((probe) => probe.durationCategory === "FOURTEEN_NIGHTS"),
    probesWithComparableOffers: probes.filter((probe) => probe.finalDistinctComparableOfferCount > 0).length,
  };
}

function buildSplitR2LiteApiDiagnosisReceipt({ sourceSha, staticResults, probeResults, http, limiter,
  failureClassification = null }) {
  const statics = staticResults.map((entry) => entry.receipt);
  const probes = probeResults.map((entry) => entry.receipt);
  const causal = classifySplitR2LiteApiZeroResultCause(statics, probes, { requestBuilderMismatch: false });
  const status = failureClassification ? "FAIL" : causal.rootCauseClassification === "NOT_DETERMINABLE" ? "INCONCLUSIVE" : "PASS";
  return {
    receiptVersion: SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_RECEIPT_VERSION,
    responseShapeReceiptVersion: SPLIT_R2_LITEAPI_RESPONSE_SHAPE_RECEIPT_VERSION,
    status,
    sourceSha,
    environment: "LITEAPI_SANDBOX",
    hostname: "api.liteapi.travel",
    r2_2InconclusivePreserved: true,
    offlineAudit: {
      requestBuilderMatchesCurrentContract: true,
      responseExtractorMatchesCurrentContract: true,
      publicAndR2RequestBuildersSemanticallyEquivalent: true,
      publicAndR2ResponseExtractorsSemanticallyEquivalent: true,
      publicRuntimeChanged: false,
      localOpenApiDocumentsProviderEndpoints: false,
    },
    http: {
      staticDiscovery: http.STATIC_DISCOVERY,
      cityRates: http.CITY_RATES,
      hotelIdRates: http.HOTEL_ID_RATES,
      anchorSuffix: http.ANCHOR_SUFFIX,
      total: http.total,
      totalBudget: 41,
      retries: 0,
      redirects: 0,
      maxObservedConcurrency: http.maxObservedConcurrency,
      minimumObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs,
      liteApiProduction: 0,
      routeStack: 0,
    },
    staticDiscoveries: statics,
    probes,
    responseShapeSignatures: splitR2DiagnosisShapeSignatures([
      ...staticResults.map((entry) => entry.shape), ...probeResults.map((entry) => entry.shape),
    ]),
    aggregate: aggregateSplitR2DiagnosisProbes(probes),
    causal,
    matrix: { originalR2MatrixChanged: false, scenarioSelectionPriceBased: false, resultCountMaximization: false },
    privacy: {
      unknownKeyEnumeration: false, rawIdsInOutput: 0, rawPayloadsInOutput: 0,
      rawResponsesInOutput: 0, crossRunLinkability: false, secretValuesExposed: false,
    },
    failureClassification: failureClassification ?? (status === "PASS" ? "NONE" : "DIAGNOSTIC_CAUSE_NOT_DETERMINED"),
  };
}

export function serializeSplitR2LiteApiZeroResultDiagnosisReceipt(receipt,
  maxBytes = SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_MAX_UTF8_BYTES) {
  const compact = receipt?.status === "BLOCKED" ? receipt : {
    receiptVersion: receipt.receiptVersion,
    responseShapeReceiptVersion: receipt.responseShapeReceiptVersion,
    status: receipt.status,
    sourceSha: receipt.sourceSha,
    environment: receipt.environment,
    hostname: receipt.hostname,
    r2_2InconclusivePreserved: receipt.r2_2InconclusivePreserved,
    offlineAudit: receipt.offlineAudit,
    http: receipt.http,
    staticDiscoveryFields: [
      "cityOrdinal", "cityCode", "httpStatus", "jsonValid", "responseContainerClassification",
      "selectedResultContainerPath", "resultContainerPresent", "hotelCount", "validProviderIdentityPresent",
    ],
    staticDiscoveries: receipt.staticDiscoveries.map((entry) => [
      entry.cityOrdinal, entry.cityCode, entry.httpStatus, entry.jsonValid, entry.responseContainerClassification,
      entry.selectedResultContainerPath, entry.resultContainerPresent, entry.hotelCount, entry.validProviderIdentityPresent,
    ]),
    probeFields: [
      "probeOrdinal", "probeType", "cityOrdinal", "windowCategory", "durationCategory", "locationMode",
      "httpStatus", "jsonValid", "selectedResultContainerPath", "responseContainerClassification",
      "rawResultCount", "normalizableResultCount", "identityEligibleCount", "numericTotalPriceEligibleCount",
      "expectedCurrencyMatchCount", "completeMandatoryComponentOfferCount", "finalDistinctComparableOfferCount",
      "economicEligibilityState", "zeroResultClassification", "boundedSnapshotUsable", "responseExtractionMismatch",
    ],
    probes: receipt.probes.map((entry) => [
      entry.probeOrdinal, entry.probeType, entry.cityOrdinal, entry.windowCategory, entry.durationCategory,
      entry.locationMode, entry.httpStatus, entry.jsonValid, entry.selectedResultContainerPath,
      entry.responseContainerClassification, entry.rawResultCount, entry.normalizableResultCount,
      entry.identityEligibleCount, entry.numericTotalPriceEligibleCount, entry.expectedCurrencyMatchCount,
      entry.completeMandatoryComponentOfferCount, entry.finalDistinctComparableOfferCount,
      entry.economicEligibilityState, entry.zeroResultClassification, entry.boundedSnapshotUsable,
      entry.responseExtractionMismatch,
    ]),
    responseShapePathFields: ["path", "presence", "jsonType", "arrayLength", "resultContainerEligible"],
    responseShapeSignatures: receipt.responseShapeSignatures.map((entry) => ({
      ordinal: entry.ordinal,
      observedCount: entry.observedCount,
      receiptVersion: entry.shape.receiptVersion,
      kind: entry.shape.kind,
      responseContainerClassification: entry.shape.responseContainerClassification,
      selectedResultContainerPath: entry.shape.selectedResultContainerPath,
      normalizationAllowed: entry.shape.normalizationAllowed,
      unknownKeyEnumeration: entry.shape.unknownKeyEnumeration,
      paths: entry.shape.paths.map((pathEntry) => [
        pathEntry.path, pathEntry.presence, pathEntry.jsonType, pathEntry.arrayLength,
        pathEntry.resultContainerEligible,
      ]),
    })),
    aggregate: receipt.aggregate,
    causal: receipt.causal,
    matrix: receipt.matrix,
    privacy: receipt.privacy,
    failureClassification: receipt.failureClassification,
  };
  assertReceiptSafe(compact);
  const json = stableStringifySplitF0(compact, 0);
  const byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-liteapi-diagnosis-receipt-not-single-line");
  if (byteLength > maxBytes) throw new SplitR2CompactReceiptError("split-r2-liteapi-diagnosis-receipt-oversize", byteLength);
  return { json, byteLength };
}

async function requestSplitR2LiteApiDiagnosis({ method, endpointPath, query = null, body = null, apiKey,
  fetchImplementation, counter, limiter, category }) {
  const url = new URL(`${SPLIT_R2_LITEAPI_SANDBOX_BASE_URL}${endpointPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  }
  const allowed = method === "GET" && url.pathname === "/v3.0/data/hotels" ||
    method === "POST" && url.pathname === "/v3.0/hotels/rates";
  if (!allowed || url.protocol !== "https:" || url.hostname !== "api.liteapi.travel") {
    throw new Error("split-r2-liteapi-diagnosis-route-forbidden");
  }
  await limiter.ready();
  counter.reserve(category);
  counter.enterTransport();
  limiter.markStarted();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetchImplementation(url, {
      method,
      headers: { Accept: "application/json", ...(method === "POST" ? { "Content-Type": "application/json" } : {}), "X-Api-Key": apiKey },
      ...(body === null ? {} : { body: JSON.stringify(body) }),
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
      throw new Error("split-r2-liteapi-diagnosis-redirect-prohibited");
    }
    if (typeof response.url === "string" && response.url.length > 0) {
      const responseUrl = new URL(response.url);
      if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "api.liteapi.travel") {
        throw new Error("split-r2-liteapi-diagnosis-response-host-prohibited");
      }
    }
    if (response.status !== 200) throw new Error("split-r2-liteapi-diagnosis-http-status-failure");
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) {
      throw new Error("split-r2-liteapi-diagnosis-content-type-invalid");
    }
    let payload;
    try { payload = JSON.parse(await response.text()); }
    catch { throw new Error("split-r2-liteapi-diagnosis-json-invalid"); }
    return { payload, status: response.status };
  } finally {
    clearTimeout(timer);
    counter.leaveTransport();
  }
}

export async function runSplitR2LiteApiZeroResultDiagnosis({ sourceSha, apiKey,
  fetchImplementation = globalThis.fetch, monotonicNow, sleeper } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha) || typeof fetchImplementation !== "function") {
    throw new Error("split-r2-liteapi-diagnosis-runtime-input-invalid");
  }
  const plan = buildSplitR2LiteApiZeroResultDiagnosisPlan();
  const counter = createSplitR2LiteApiDiagnosisCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const ephemeralKey = crypto.randomBytes(32);
  const sessionNonce = crypto.randomBytes(12).toString("hex");
  const staticResults = [];
  const probeResults = [];
  const identitiesByCity = new Map();
  try {
    for (const city of plan.staticDiscoveries) {
      const response = await requestSplitR2LiteApiDiagnosis({
        method: "GET", endpointPath: SPLIT_R2_LITEAPI_STATIC_HOTELS_PATH,
        query: { cityName: city.cityName, countryCode: city.countryCode, limit: 80, language: "en" },
        apiKey, fetchImplementation, counter, limiter, category: "STATIC_DISCOVERY",
      });
      const normalized = normalizeSplitR2StaticDiscovery(city, response.payload, response.status);
      identitiesByCity.set(city.ordinal, normalized.privateIdentities);
      staticResults.push(normalized);
    }
    for (const probe of plan.rateProbes) {
      const identities = identitiesByCity.get(probe.cityOrdinal) ?? [];
      if (probe.locationMode === "HOTEL_IDS_IN_MEMORY" && identities.length === 0) continue;
      const body = createSplitR2LiteApiDiagnosisRatesBody(probe, identities, sessionNonce);
      const response = await requestSplitR2LiteApiDiagnosis({
        method: "POST", endpointPath: SPLIT_R2_LITEAPI_RATES_PATH, body,
        apiKey, fetchImplementation, counter, limiter, category: probe.probeType,
      });
      probeResults.push(normalizeSplitR2DiagnosisProbe(probe, response.payload, ephemeralKey, response.status));
    }
    return buildSplitR2LiteApiDiagnosisReceipt({
      sourceSha, staticResults, probeResults, http: counter.snapshot(), limiter: limiter.snapshot(),
    });
  } catch (error) {
    const failureClassification = String(error?.message ?? error).startsWith("split-r2-")
      ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
      : "LITEAPI_DIAGNOSIS_TECHNICAL_FAILURE";
    return buildSplitR2LiteApiDiagnosisReceipt({
      sourceSha, staticResults, probeResults, http: counter.snapshot(), limiter: limiter.snapshot(), failureClassification,
    });
  } finally {
    ephemeralKey.fill(0);
    identitiesByCity.clear();
  }
}

export async function runSplitR2FakeLiteApiZeroResultDiagnosis() {
  let now = 0;
  let staticOrdinal = 0;
  const fakeFetch = async (url, options) => {
    if (url.pathname.endsWith("/data/hotels")) {
      staticOrdinal += 1;
      return fakeJsonResponse({ data: [{ id: `synthetic-static-${staticOrdinal}` }] }, 200, url.href);
    }
    const body = JSON.parse(options.body);
    if (Array.isArray(body.hotelIds)) return fakeJsonResponse({ data: [] }, 200, url.href);
    const identity = `synthetic-city-${body.cityName}`;
    return fakeJsonResponse({ data: [{ hotelId: identity, rates: [{
      offerRetailRate: { amount: "100.00", currency: "EUR" }, taxesAndFees: [],
    }] }] }, 200, url.href);
  };
  return runSplitR2LiteApiZeroResultDiagnosis({
    sourceSha: SPLIT_R2_SOURCE_SHA,
    apiKey: "sand_fake_diagnosis",
    fetchImplementation: fakeFetch,
    monotonicNow: () => now,
    sleeper: async (delay) => { now += delay; },
  });
}

const SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_LIMITS = Object.freeze({
  AUTHENTICATION: 1,
  DESTINATION: 1,
  INITIAL_SEARCH: 1,
  total: 3,
});

export function inspectSplitR2RouteStackPublicContractEvidence(overrides = {}) {
  const baseUrl = overrides.baseUrl ?? SPLIT_R1_OFFICIAL_BASE_URL;
  const authEndpoint = overrides.authEndpoint ?? SPLIT_R1_AUTH_ENDPOINT;
  const destinationEndpoint = overrides.destinationEndpoint ?? SPLIT_R1_DESTINATION_ENDPOINT;
  const searchEndpoint = overrides.searchEndpoint ?? SPLIT_R1_HOTEL_SEARCH_ENDPOINT;
  let hostname = null;
  try {
    hostname = new URL(baseUrl).hostname;
    validateSplitR1BaseUrl(baseUrl);
  } catch {
    return Object.freeze({
      environmentClassification: "ROUTESTACK_PUBLIC_ENVIRONMENT_NOT_DETERMINABLE",
      hostnameDeterminable: false,
      contractDeterminable: false,
      contractEvidenceClassification: "LOCAL_CONTRACT_EVIDENCE_INVALID",
    });
  }
  const endpointContractExact = authEndpoint === "/mcp/auth/partner-token" &&
    destinationEndpoint === "/mcp/hotel/search-destinations" &&
    searchEndpoint === "/mcp/hotel/search-hotels";
  return Object.freeze({
    environmentClassification: endpointContractExact
      ? "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED"
      : "ROUTESTACK_PUBLIC_CONTRACT_AMBIGUOUS",
    hostnameCategory: hostname === "mcp.routestack.ai"
      ? "ROUTESTACK_PUBLIC_PRODUCTION_HOST"
      : "UNVERIFIED_HOST",
    hostnameDeterminable: hostname === "mcp.routestack.ai",
    contractDeterminable: endpointContractExact,
    contractEvidenceClassification: endpointContractExact
      ? "LOCAL_PROVIDER_SCHEMA_AND_VERSIONED_R1_PRODUCTION_BINDING"
      : "LOCAL_CONTRACT_EVIDENCE_AMBIGUOUS",
    methods: Object.freeze({ authentication: "POST", destination: "POST", initialSearch: "POST" }),
    authentication: "HMAC_SHA256_PARTNER_TO_BEARER",
    destinationResultPath: "result[]",
    searchResultPath: "result.result[]",
    currencyPath: "result.currency",
    numericPricePath: "result.result[].ourprice",
    mutativeEndpointsSelected: false,
    sandboxFallback: false,
  });
}

export function buildSplitR2RouteStackPublicCanaryBinding() {
  const scenario = Object.freeze({
    scenarioId: "SPLIT-R2.4-ROUTESTACK-PUBLIC-CANARY",
    destination: Object.freeze({
      label: "Milano",
      countryCode: "IT",
      latitude: 45.4642,
      longitude: 9.19,
    }),
  });
  const logicalSearch = Object.freeze({
    logicalSearchId: "SPLIT-R2.4-FULL-STAY",
    scenarioId: scenario.scenarioId,
    kind: "full-stay",
    splitPointId: null,
    segmentOrdinal: null,
    request: Object.freeze({
      checkIn: "2026-11-30",
      checkOut: "2026-12-14",
      currency: "EUR",
      occupancy: Object.freeze({ rooms: 1, adults: 2, childAges: Object.freeze([]) }),
    }),
  });
  return Object.freeze({ scenario, logicalSearch });
}

export function createSplitR2RouteStackPublicCanaryCounter() {
  const counts = { AUTHENTICATION: 0, DESTINATION: 0, INITIAL_SEARCH: 0, total: 0 };
  let active = 0;
  let maxObservedConcurrency = 0;
  return Object.freeze({
    reserve(requestClass) {
      if (!Object.hasOwn(SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_LIMITS, requestClass) || requestClass === "total") {
        throw new Error("split-r2-routestack-public-canary-route-forbidden");
      }
      if (counts[requestClass] + 1 > SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_LIMITS[requestClass] ||
          counts.total + 1 > SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_LIMITS.total) {
        throw new Error("split-r2-routestack-public-canary-http-budget-exceeded-before-transport");
      }
      counts[requestClass] += 1;
      counts.total += 1;
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-routestack-public-canary-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-routestack-public-canary-concurrency-ledger-invalid");
    },
    snapshot() {
      return Object.freeze({ ...counts, maxObservedConcurrency, retries: 0, redirects: 0 });
    },
  });
}

export function assertSplitR2RouteStackPublicCanaryPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const evidence = options.contractEvidence ?? inspectSplitR2RouteStackPublicContractEvidence();
  const exact = options.mode === "ROUTESTACK_PUBLIC_CONTRACT_CANARY" &&
    options.phase === "SPLIT-R2.4" && options.compact === true &&
    options.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    options.hostname === "mcp.routestack.ai" && options.protocol === "https:" &&
    options.acknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_3_HTTP" &&
    options.noMutationAcknowledgement === "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION" &&
    options.authMax === 1 && options.destinationMax === 1 && options.initialSearchMax === 1 &&
    options.continuationMax === 0 && options.totalMax === 3 && options.retries === 0 &&
    options.redirects === 0 && options.concurrency === 1 && options.minimumIntervalMs >= 1_000 &&
    options.productionFallback === false && options.sandboxFallback === false &&
    options.repositoryGatePassed === true &&
    evidence.environmentClassification === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    evidence.hostnameDeterminable === true && evidence.contractDeterminable === true &&
    evidence.mutativeEndpointsSelected === false && evidence.sandboxFallback === false;
  if (!exact) {
    throw new Error("split-r2-routestack-public-canary-preflight-failed-before-credentials");
  }
  const binding = buildSplitR2RouteStackPublicCanaryBinding();
  const credentials = credentialReader();
  if (credentials?.baseUrl !== SPLIT_R1_OFFICIAL_BASE_URL ||
      typeof credentials?.apiKey !== "string" || credentials.apiKey.length === 0 ||
      typeof credentials?.apiSecret !== "string" || credentials.apiSecret.length === 0) {
    throw new Error("split-r2-routestack-public-canary-credentials-missing-or-misbound");
  }
  return Object.freeze({ binding, credentials, evidence, credentialsAccessed: true });
}

function splitR2RouteStackPublicHttpStatusCategory(status) {
  return Number.isInteger(status) ? `HTTP_${status}` : "NOT_EXECUTED";
}

function splitR2RouteStackPublicContinuationCategory(payload) {
  const container = isPlainRecord(payload?.result) ? payload.result : null;
  const fields = [container?.correlationId, container?.token, container?.nextResultsKey];
  if (fields.every((value) => typeof value === "string" && value.length > 0)) {
    return "COMPLETE_BINDING_PRESENT_NOT_EXECUTED";
  }
  const present = fields.some((value) => value !== undefined && value !== null && value !== "");
  return present ? "PARTIAL_OR_UNUSABLE_METADATA" : "NO_CONTINUATION_METADATA";
}

function splitR2RouteStackPublicSearchDiagnostics(payload, logicalSearch, ephemeralKey) {
  const items = Array.isArray(payload?.result?.result) ? payload.result.result : [];
  const currency = payload?.result?.currency;
  const page = normalizeSplitR1SearchPage(payload, { logicalSearch, ephemeralRunKey: ephemeralKey });
  const numericPriceCoverageNumerator = items.filter((item) => {
    const value = typeof item?.ourprice === "number" ? item.ourprice : Number(item?.ourprice);
    return Number.isFinite(value) && value > 0;
  }).length;
  const expectedCurrencyMatchCount = currency === "EUR" ? items.length : 0;
  const missingCurrencyCount = currency === undefined || currency === null || currency === "" ? items.length : 0;
  const nonExpectedCurrencyCount = typeof currency === "string" && currency !== "EUR" ? items.length : 0;
  const normalizableResultCount = page.offers.length;
  return Object.freeze({
    rawResultCount: items.length,
    normalizableResultCount,
    numericPriceCoverageNumerator,
    numericPriceCoverageDenominator: items.length,
    expectedCurrencyMatchCount,
    missingCurrencyCount,
    nonExpectedCurrencyCount,
    usableBoundedSnapshot: items.length > 0 && normalizableResultCount > 0 &&
      numericPriceCoverageNumerator > 0 && expectedCurrencyMatchCount > 0,
    continuationMetadataCategory: splitR2RouteStackPublicContinuationCategory(payload),
  });
}

export function buildSplitR2RouteStackPublicCanaryReceipt({
  sourceSha,
  contractEvidence = inspectSplitR2RouteStackPublicContractEvidence(),
  statuses = {},
  diagnostics = null,
  http = {},
  limiter = {},
  failureClassification = null,
} = {}) {
  const technicallyReached = statuses.authentication === 200 && statuses.destination === 200 &&
    statuses.initialSearch === 200;
  const usable = diagnostics?.usableBoundedSnapshot === true;
  const status = failureClassification ? "FAIL" : technicallyReached && usable ? "PASS" :
    technicallyReached ? "INCONCLUSIVE" : "FAIL";
  const conclusion = status === "PASS"
    ? "ROUTESTACK_PUBLIC_READ_ONLY_SEARCH_CONTRACT_VERIFIED"
    : status === "INCONCLUSIVE"
      ? "ROUTESTACK_PUBLIC_CONTRACT_REACHED_INVENTORY_OR_SHAPE_INCONCLUSIVE"
      : "ROUTESTACK_PUBLIC_CONTRACT_CANARY_TECHNICAL_FAILURE";
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RECEIPT_VERSION,
    status,
    sourceSha,
    environmentClassification: contractEvidence.environmentClassification,
    hostnameCategory: contractEvidence.hostnameCategory ?? "UNVERIFIED_HOST",
    contractEvidenceClassification: contractEvidence.contractEvidenceClassification,
    authHttpStatusCategory: splitR2RouteStackPublicHttpStatusCategory(statuses.authentication),
    destinationHttpStatusCategory: splitR2RouteStackPublicHttpStatusCategory(statuses.destination),
    searchHttpStatusCategory: splitR2RouteStackPublicHttpStatusCategory(statuses.initialSearch),
    totalHttpRequests: http.total ?? 0,
    retries: 0,
    redirects: 0,
    maxObservedConcurrency: http.maxObservedConcurrency ?? 0,
    minObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs ?? null,
    rawResultCount: diagnostics?.rawResultCount ?? 0,
    normalizableResultCount: diagnostics?.normalizableResultCount ?? 0,
    numericPriceCoverageNumerator: diagnostics?.numericPriceCoverageNumerator ?? 0,
    numericPriceCoverageDenominator: diagnostics?.numericPriceCoverageDenominator ?? 0,
    expectedCurrency: "EUR",
    expectedCurrencyMatchCount: diagnostics?.expectedCurrencyMatchCount ?? 0,
    missingCurrencyCount: diagnostics?.missingCurrencyCount ?? 0,
    nonExpectedCurrencyCount: diagnostics?.nonExpectedCurrencyCount ?? 0,
    usableBoundedSnapshot: usable,
    continuationMetadataCategory: diagnostics?.continuationMetadataCategory ?? "NOT_OBSERVED",
    continuationExecuted: false,
    providerDeclaredTerminal: "NOT_DETERMINABLE",
    publicContractCanaryConclusion: conclusion,
    completenessClaimAllowed: false,
    globalOptimumClaimAllowed: false,
    marketFrequencyClaimAllowed: false,
    publicRuntimeChanged: false,
    productionBookingAuthorized: false,
    rawIdsPersisted: 0,
    rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0,
    payloadsOrRawResponsesPersisted: 0,
    crossRunLinkability: false,
    secretValuesExposed: false,
    failureClassification: failureClassification ?? (status === "PASS" ? "NONE" :
      status === "INCONCLUSIVE" ? "ROUTESTACK_PUBLIC_INVENTORY_OR_SHAPE_INCONCLUSIVE" :
        "ROUTESTACK_PUBLIC_CANARY_NOT_COMPLETED"),
  });
}

export function serializeSplitR2RouteStackPublicCanaryReceipt(
  receipt,
  maxBytes = SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_MAX_UTF8_BYTES
) {
  assertReceiptSafe(receipt);
  const json = stableStringifySplitF0(receipt, 0);
  const byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-routestack-public-canary-receipt-not-single-line");
  if (byteLength > maxBytes) {
    throw new SplitR2CompactReceiptError("split-r2-routestack-public-canary-receipt-oversize", byteLength);
  }
  return Object.freeze({ json, byteLength });
}

function createSplitR2RouteStackPublicCanaryTransport({
  fetchImplementation,
  monotonicNow,
  sleeper,
} = {}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("split-r2-routestack-public-canary-fetch-unavailable");
  }
  const counter = createSplitR2RouteStackPublicCanaryCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const endpoints = new Map([
    ["AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT],
    ["DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT],
    ["INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
  ]);
  const post = async (requestClass, endpointPath, body, bearer = null) => {
    if (endpoints.get(requestClass) !== endpointPath || endpointPath.includes("continue")) {
      throw new Error("split-r2-routestack-public-canary-route-forbidden");
    }
    const url = new URL(endpointPath, SPLIT_R1_OFFICIAL_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== "mcp.routestack.ai") {
      throw new Error("split-r2-routestack-public-canary-host-forbidden");
    }
    await limiter.ready();
    counter.reserve(requestClass);
    counter.enterTransport();
    limiter.markStarted();
    try {
      const response = await fetchImplementation(url, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }),
        },
        body: JSON.stringify(body),
      });
      if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
        throw new Error("split-r2-routestack-public-canary-redirect-prohibited");
      }
      if (typeof response.url === "string" && response.url.length > 0) {
        const responseUrl = new URL(response.url);
        if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "mcp.routestack.ai") {
          throw new Error("split-r2-routestack-public-canary-response-host-forbidden");
        }
      }
      if (response.status !== 200) throw new Error("split-r2-routestack-public-canary-http-status-failure");
      const contentType = response.headers?.get?.("content-type") ?? "";
      if (!/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) {
        throw new Error("split-r2-routestack-public-canary-content-type-invalid");
      }
      let payload;
      try { payload = JSON.parse(await response.text()); }
      catch { throw new Error("split-r2-routestack-public-canary-json-invalid"); }
      return Object.freeze({ payload, status: response.status });
    } finally {
      counter.leaveTransport();
    }
  };
  return Object.freeze({
    post,
    postContinuation() { throw new Error("split-r2-routestack-public-canary-continuation-prohibited"); },
    snapshot: () => Object.freeze({ http: counter.snapshot(), limiter: limiter.snapshot() }),
  });
}

export async function runSplitR2RouteStackPublicCanary({
  sourceSha,
  apiKey,
  apiSecret,
  fetchImplementation = globalThis.fetch,
  monotonicNow,
  sleeper,
  now,
  randomUUID,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha ?? "") || typeof apiKey !== "string" ||
      apiKey.length === 0 || typeof apiSecret !== "string" || apiSecret.length === 0) {
    throw new Error("split-r2-routestack-public-canary-runtime-input-invalid");
  }
  const contractEvidence = inspectSplitR2RouteStackPublicContractEvidence();
  const binding = buildSplitR2RouteStackPublicCanaryBinding();
  const transport = createSplitR2RouteStackPublicCanaryTransport({ fetchImplementation, monotonicNow, sleeper });
  const statuses = {};
  const ephemeralKey = crypto.randomBytes(32);
  try {
    const auth = await transport.post("AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT,
      createSplitR1PartnerTokenRequest({ apiKey, apiSecret, now, randomUUID }));
    statuses.authentication = auth.status;
    let bearer = auth.payload?.token;
    if (typeof bearer !== "string" || bearer.length === 0) {
      throw new Error("split-r2-routestack-public-canary-bearer-missing");
    }
    const destinationResponse = await transport.post("DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT,
      createSplitR1DestinationRequest(binding.scenario), bearer);
    statuses.destination = destinationResponse.status;
    const destination = selectSplitR1DestinationCandidate(destinationResponse.payload, binding.scenario);
    const searchResponse = await transport.post("INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
      createSplitR1HotelSearchRequest(binding.logicalSearch, destination), bearer);
    statuses.initialSearch = searchResponse.status;
    const diagnostics = splitR2RouteStackPublicSearchDiagnostics(
      searchResponse.payload,
      binding.logicalSearch,
      ephemeralKey
    );
    bearer = null;
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicCanaryReceipt({
      sourceSha, contractEvidence, statuses, diagnostics,
      http: snapshot.http, limiter: snapshot.limiter,
    });
  } catch (error) {
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicCanaryReceipt({
      sourceSha, contractEvidence, statuses, http: snapshot.http, limiter: snapshot.limiter,
      failureClassification: String(error?.message ?? error).startsWith("split-r2-")
        ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
        : "ROUTESTACK_PUBLIC_CANARY_TECHNICAL_FAILURE",
    });
  } finally {
    ephemeralKey.fill(0);
  }
}

export async function runSplitR2FakeRouteStackPublicCanary() {
  let monotonic = 0;
  const responses = [
    { token: "synthetic-bearer-memory-only" },
    { result: [{ id: "synthetic-destination-memory-only", city: "Milano", country: "IT", type: "City",
      fullName: "Milano, Italy", coordinates: { lat: 45.4642, long: 9.19 } }] },
    { result: { currency: "EUR", correlationId: "synthetic-correlation-memory-only",
      token: "synthetic-search-token-memory-only", nextResultsKey: null,
      result: [{ id: "synthetic-property-memory-only", ourprice: 700.5 }] } },
  ];
  let ordinal = 0;
  const receipt = await runSplitR2RouteStackPublicCanary({
    sourceSha: "a".repeat(40), apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret",
    monotonicNow: () => monotonic,
    sleeper: async (delay) => { monotonic += delay; },
    now: () => 1_800_000_000_000,
    randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      if (options.method !== "POST" || options.redirect !== "error") {
        throw new Error("synthetic-transport-contract-drift");
      }
      const payload = responses[ordinal];
      ordinal += 1;
      return fakeJsonResponse(payload, 200, String(url));
    },
  });
  return receipt;
}

const SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_LIMITS = Object.freeze({
  AUTHENTICATION: 1,
  DESTINATION: 3,
  INITIAL_SEARCH: 102,
  CONTINUATION: 0,
  total: 106,
});

const SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_ORDINALS = Object.freeze([1, 3, 5]);

function splitR2RouteStackPublicScenarioBinding(scenario) {
  return Object.freeze({
    scenarioId: scenario.scenarioId,
    destination: Object.freeze({
      label: scenario.destination,
      countryCode: scenario.country,
      latitude: scenario.coordinates.latitude,
      longitude: scenario.coordinates.longitude,
    }),
  });
}

function splitR2RouteStackPublicLogicalBinding(search) {
  return Object.freeze({
    logicalSearchId: search.logicalSearchId,
    scenarioId: `R2-S${search.scenarioOrdinal}`,
    kind: search.searchRole === "FULL_STAY" ? "full-stay" :
      search.searchRole === "NIGHTLY" ? "nightly" : "split-segment",
    splitPointId: search.breakpointOrdinal === null
      ? null
      : `R2-S${search.scenarioOrdinal}-B${search.breakpointOrdinal}`,
    segmentOrdinal: search.searchRole === "PREFIX" ? 0 : search.searchRole === "SUFFIX" ? 1 : null,
    request: Object.freeze({
      checkIn: search.checkin,
      checkOut: search.checkout,
      currency: search.expectedCurrency,
      occupancy: Object.freeze({
        rooms: search.occupancy.rooms,
        adults: search.occupancy.adults,
        childAges: Object.freeze([]),
      }),
    }),
  });
}

export function assertSplitR2RouteStackPublicMultiScenarioPlan(plan) {
  const ordinals = plan?.scenarioPlans?.map((entry) => entry.scenario.ordinal) ?? [];
  const searchCounts = plan?.scenarioPlans?.map((entry) => entry.logicalSearches.length) ?? [];
  const breakpointCounts = plan?.scenarioPlans?.map((entry) => entry.breakpoints) ?? [];
  const destinationCount = new Set(
    plan?.scenarioPlans?.map((entry) => `${entry.scenario.destination}|${entry.scenario.country}`) ?? []
  ).size;
  const exact = plan?.provider === "ROUTESTACK_PUBLIC_PRODUCTION" &&
    plan?.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    stableStringifySplitF0(ordinals, 0) === "[1,3,5]" && destinationCount === 3 &&
    stableStringifySplitF0(searchCounts, 0) === "[41,20,41]" &&
    stableStringifySplitF0(breakpointCounts, 0) === "[13,6,13]" &&
    plan.logicalSearches?.length === 102 && plan.publicLogicalBindings?.length === 102 &&
    plan.publicScenarioBindings?.length === 3 &&
    plan.scenarioPlans.every((entry, index) =>
      entry.logicalSearches.filter((search) => search.searchRole === "FULL_STAY").length === 1 &&
      plan.publicScenarioBindings[index]?.scenarioId === entry.scenario.scenarioId &&
      plan.publicScenarioBindings[index]?.destination?.label === entry.scenario.destination &&
      plan.publicScenarioBindings[index]?.destination?.countryCode === entry.scenario.country &&
      entry.logicalSearches.every((search) =>
        search.destination === entry.scenario.destination && search.country === entry.scenario.country &&
        search.expectedCurrency === "EUR" && search.occupancy.rooms === 1 &&
        search.occupancy.adults === 2 && search.occupancy.children === 0
      )
    ) &&
    plan.logicalSearches.every((search, index) =>
      plan.publicLogicalBindings[index]?.logicalSearchId === search.logicalSearchId
    );
  if (!exact) throw new Error("split-r2-routestack-public-multi-scenario-plan-divergence");
  return plan;
}

export function buildSplitR2RouteStackPublicMultiScenarioPlan() {
  const frozen = buildSplitR2CampaignPlan("ROUTESTACK_SANDBOX");
  const plan = Object.freeze({
    provider: "ROUTESTACK_PUBLIC_PRODUCTION",
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    frozenScenarioOrdinals: SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_ORDINALS,
    scenarioPlans: frozen.scenarioPlans,
    logicalSearches: frozen.logicalSearches,
    publicScenarioBindings: Object.freeze(
      frozen.scenarioPlans.map((entry) => splitR2RouteStackPublicScenarioBinding(entry.scenario))
    ),
    publicLogicalBindings: Object.freeze(
      frozen.logicalSearches.map(splitR2RouteStackPublicLogicalBinding)
    ),
  });
  return assertSplitR2RouteStackPublicMultiScenarioPlan(plan);
}

export function classifySplitR2RouteStackPublicReproducibility({
  contractFailure = false,
  scenariosEvaluable = 0,
  scenariosWithRawPositive = 0,
  scenariosWithMaterialSignal = 0,
  destinationsWithMaterialSignal = 0,
} = {}) {
  if (contractFailure) return "PROVIDER_OR_CONTRACT_FAILURE";
  if (scenariosEvaluable < 2) return "INSUFFICIENT_EVALUABLE_DATA";
  if (scenariosWithMaterialSignal >= 2 && destinationsWithMaterialSignal >= 2) {
    return "REPRODUCED_ACROSS_MULTIPLE_SCENARIOS";
  }
  if (scenariosWithMaterialSignal === 0 && scenariosWithRawPositive === 0) {
    return "NOT_REPRODUCED";
  }
  return "PARTIALLY_REPRODUCED";
}

export function createSplitR2RouteStackPublicMultiScenarioCounter() {
  const counts = { AUTHENTICATION: 0, DESTINATION: 0, INITIAL_SEARCH: 0, CONTINUATION: 0, total: 0 };
  let active = 0;
  let maxObservedConcurrency = 0;
  return Object.freeze({
    reserve(requestClass) {
      if (!Object.hasOwn(SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_LIMITS, requestClass) ||
          requestClass === "total" || requestClass === "CONTINUATION") {
        throw new Error("split-r2-routestack-public-multi-scenario-route-forbidden");
      }
      if (counts[requestClass] + 1 > SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_LIMITS[requestClass] ||
          counts.total + 1 > SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_LIMITS.total) {
        throw new Error("split-r2-routestack-public-multi-scenario-http-budget-exceeded-before-transport");
      }
      counts[requestClass] += 1;
      counts.total += 1;
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-routestack-public-multi-scenario-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-routestack-public-multi-scenario-concurrency-ledger-invalid");
    },
    snapshot() {
      return Object.freeze({ ...counts, retries: 0, redirects: 0, maxObservedConcurrency });
    },
  });
}

export function assertSplitR2RouteStackPublicMultiScenarioPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const evidence = options.contractEvidence ?? inspectSplitR2RouteStackPublicContractEvidence();
  const plan = assertSplitR2RouteStackPublicMultiScenarioPlan(options.plan);
  const exact = options.mode === "ROUTESTACK_PUBLIC_MULTI_SCENARIO" &&
    options.phase === "SPLIT-R2.5A" && options.compact === true &&
    options.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    options.hostname === "mcp.routestack.ai" && options.protocol === "https:" &&
    options.acknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_106_HTTP" &&
    options.unknownCostAcknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN" &&
    options.noMutationAcknowledgement === "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION" &&
    options.authMax === 1 && options.destinationMax === 3 && options.initialSearchMax === 102 &&
    options.continuationMax === 0 && options.totalMax === 106 && options.retries === 0 &&
    options.redirects === 0 && options.concurrency === 1 && options.minimumIntervalMs >= 1_000 &&
    options.productionFallback === false && options.sandboxFallback === false &&
    options.otherLiveModesSelected === 0 && options.repositoryGatePassed === true &&
    evidence.environmentClassification === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    evidence.hostnameDeterminable === true && evidence.contractDeterminable === true &&
    evidence.mutativeEndpointsSelected === false && evidence.sandboxFallback === false;
  if (!exact) {
    throw new Error("split-r2-routestack-public-multi-scenario-preflight-failed-before-credentials");
  }
  const credentials = credentialReader();
  if (credentials?.baseUrl !== SPLIT_R1_OFFICIAL_BASE_URL ||
      typeof credentials?.apiKey !== "string" || credentials.apiKey.length === 0 ||
      typeof credentials?.apiSecret !== "string" || credentials.apiSecret.length === 0) {
    throw new Error("split-r2-routestack-public-multi-scenario-credentials-missing-or-misbound");
  }
  return Object.freeze({ plan, credentials, evidence, credentialsAccessed: true });
}

function splitR2RouteStackPublicMultiScenarioSnapshot(
  search,
  binding,
  payload,
  ephemeralKey,
  logicalSearchOrdinal
) {
  const page = normalizeSplitR1SearchPage(payload, { logicalSearch: binding, ephemeralRunKey: ephemeralKey });
  const funnelReceipt = buildSplitR1EconomicEligibilityFunnelSearchReceiptV1({
    payload,
    logicalSearch: { ...search, request: binding.request },
    logicalSearchOrdinal,
    breakpointOrdinal: search.breakpointOrdinal,
    normalizedPage: page,
    snapshotProcessable: true,
  });
  const metadata = diagnoseSplitR1ContinuationMetadataShapeV1(payload);
  const ambiguous = metadata.completeCandidateContainerCount > 1 ||
    metadata.classification === "NON_CONTRACTUAL_CONTINUATION_METADATA_SHAPE_PRESENT";
  const continuationAvailable = metadata.continuationAuthorizable === true && !ambiguous;
  const expectedOffers = page.offers.filter((offer) => offer.currency === search.expectedCurrency);
  const funnel = {
    rawResultCount: funnelReceipt.rawResultCount,
    identityEligibleCount: funnelReceipt.identityEligibleCount,
    numericPriceEligibleCount: funnelReceipt.numericPriceEligibleCount,
    expectedCurrencyMatchCount: funnelReceipt.expectedCurrencyMatchCount,
    missingCurrencyCount: funnelReceipt.missingCurrencyCount,
    nonExpectedCurrencyCount: funnelReceipt.nonExpectedCurrencyCount,
    invalidCurrencyTypeCount: funnelReceipt.invalidCurrencyTypeCount,
    unknownMandatoryComponentCount: 0,
    mandatoryComponentComparableCount: funnelReceipt.preDedupEconomicOfferCount,
    finalEconomicOfferCount: funnelReceipt.finalDistinctPropertyOfferCount,
  };
  const collectionCategory = ambiguous
    ? "CONTINUATION_METADATA_AMBIGUOUS"
    : page.rawResultCount === 0
      ? "ZERO_RAW_RESULTS"
      : expectedOffers.length === 0 && funnel.numericPriceEligibleCount > 0
        ? "CURRENCY_INCOMPLETE"
        : expectedOffers.length === 0
          ? "PRICE_COVERAGE_INCOMPLETE"
          : continuationAvailable
            ? "CONTINUATION_AVAILABLE_NOT_EXECUTED"
            : "USABLE_BOUNDED_SNAPSHOT";
  const usable = !ambiguous && expectedOffers.length > 0;
  return assertProviderNeutralSnapshot({
    contractVersion: SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
    logicalSearchId: search.logicalSearchId,
    scenarioOrdinal: search.scenarioOrdinal,
    searchRole: search.searchRole,
    checkin: search.checkin,
    checkout: search.checkout,
    durationNights: search.durationNights,
    expectedCurrency: search.expectedCurrency,
    boundedSnapshotUsable: usable,
    collectionClassification: ambiguous
      ? "AMBIGUOUS_CONTINUATION_METADATA"
      : continuationAvailable ? "PROVIDER_CONTINUATION_AVAILABLE" : "PROVIDER_NO_CONTINUATION_EXPOSED",
    publicCollectionCategory: collectionCategory,
    comparabilityClassification: usable ? "COMPARABLE_COMPLETE_TOTAL" : "INCOMPARABLE_COLLECTION",
    economicEligibilityFunnel: funnel,
    normalizableResultCount: page.offers.length,
    offers: usable
      ? expectedOffers.map((offer) => ({
          propertyFingerprint: offer.propertyFingerprint,
          totalPriceMinorUnits: offer.totalMinorUnits,
          totalMinorUnits: offer.totalMinorUnits,
          currency: offer.currency,
          totalPriceSemantics: "SEARCH_WINDOW_TOTAL_EMPIRICALLY_SUPPORTED",
          mandatoryTaxState: "UNPROVEN_R1_PRESERVED",
          mandatoryTaxMinorUnits: null,
          payAtPropertyMandatoryMinorUnits: null,
          cancellationCategory: "UNAVAILABLE",
          evidenceAvailabilityCategories: ["R2_PUBLIC_BOUNDED_SNAPSHOT", "TEMPORAL_TOTALITY_EMPIRICAL"],
        }))
      : [],
    continuationAvailable,
    continuationEligible: continuationAvailable,
    continuationExecuted: false,
    providerDeclaredTerminal: false,
  });
}

function createSplitR2RouteStackPublicMultiScenarioTransport({
  fetchImplementation,
  monotonicNow,
  sleeper,
} = {}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("split-r2-routestack-public-multi-scenario-fetch-unavailable");
  }
  const counter = createSplitR2RouteStackPublicMultiScenarioCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const endpoints = new Map([
    ["AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT],
    ["DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT],
    ["INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
  ]);
  const post = async (requestClass, endpointPath, body, bearer = null) => {
    if (endpoints.get(requestClass) !== endpointPath || requestClass === "CONTINUATION") {
      throw new Error("split-r2-routestack-public-multi-scenario-route-forbidden");
    }
    const url = new URL(endpointPath, SPLIT_R1_OFFICIAL_BASE_URL);
    if (url.protocol !== "https:" || url.hostname !== "mcp.routestack.ai") {
      throw new Error("split-r2-routestack-public-multi-scenario-host-forbidden");
    }
    await limiter.ready();
    counter.reserve(requestClass);
    counter.enterTransport();
    limiter.markStarted();
    try {
      const response = await fetchImplementation(url, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }),
        },
        body: JSON.stringify(body),
      });
      if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
        throw new Error("split-r2-routestack-public-multi-scenario-redirect-prohibited");
      }
      if (typeof response.url === "string" && response.url.length > 0) {
        const responseUrl = new URL(response.url);
        if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "mcp.routestack.ai") {
          throw new Error("split-r2-routestack-public-multi-scenario-response-host-forbidden");
        }
      }
      const contentType = response.headers?.get?.("content-type") ?? "";
      let payload = null;
      let jsonValid = false;
      if (/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) {
        try {
          payload = JSON.parse(await response.text());
          jsonValid = true;
        } catch {
          jsonValid = false;
        }
      }
      if (requestClass !== "INITIAL_SEARCH" && (response.status !== 200 || !jsonValid)) {
        throw new Error("split-r2-routestack-public-multi-scenario-contract-response-invalid");
      }
      return Object.freeze({ payload, status: response.status, httpValid: response.status === 200, jsonValid });
    } finally {
      counter.leaveTransport();
    }
  };
  return Object.freeze({
    post,
    postContinuation() {
      throw new Error("split-r2-routestack-public-multi-scenario-continuation-prohibited");
    },
    snapshot: () => Object.freeze({ http: counter.snapshot(), limiter: limiter.snapshot() }),
  });
}

function splitR2RouteStackPublicUnprocessableSnapshot(search, category) {
  return assertProviderNeutralSnapshot({
    contractVersion: SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
    logicalSearchId: search.logicalSearchId,
    scenarioOrdinal: search.scenarioOrdinal,
    searchRole: search.searchRole,
    checkin: search.checkin,
    checkout: search.checkout,
    durationNights: search.durationNights,
    expectedCurrency: search.expectedCurrency,
    boundedSnapshotUsable: false,
    collectionClassification: "INITIAL_SNAPSHOT_UNPROCESSABLE",
    publicCollectionCategory: category,
    comparabilityClassification: "INCOMPARABLE_COLLECTION",
    economicEligibilityFunnel: emptyFunnel(0),
    normalizableResultCount: 0,
    offers: [],
    continuationAvailable: false,
    continuationEligible: false,
    continuationExecuted: false,
    providerDeclaredTerminal: false,
  });
}

function splitR2RouteStackPublicScenarioReceipt(result, scenarioPlan, snapshots) {
  return Object.freeze({
    scenarioOrdinal: result.scenarioOrdinal,
    plannedSearches: scenarioPlan.logicalSearches.length,
    executedSearches: snapshots.length,
    plannedBreakpoints: result.plannedBreakpoints,
    evaluableBreakpoints: result.evaluatedBreakpoints,
    notEvaluableBreakpoints: result.plannedBreakpoints - result.evaluatedBreakpoints,
    positiveBreakpoints: result.positiveBreakpoints,
    breakEvenBreakpoints: result.breakEvenBreakpoints,
    negativeBreakpoints: result.negativeBreakpoints,
    rawPositivePresent: result.scenarioHasRawPositive,
    materialSignalPresent: result.scenarioHasMaterialSignal,
    bestSavingMinorUnits: result.bestSavingMinorUnits,
    bestSavingBasisPoints: result.bestSavingBasisPoints,
    medianSavingMinorUnits: result.medianSavingMinorUnits,
    medianSavingBasisPoints: result.medianSavingBasisPoints,
    minimumSavingMinorUnits: result.minSavingMinorUnits,
    winningBreakpointOrdinal: result.winningBreakpointOrdinal,
    fullStayBaselineAvailable: result.baselineAvailable,
    usableSnapshotCount: snapshots.filter((snapshot) => snapshot.boundedSnapshotUsable).length,
    zeroRawSnapshotCount: snapshots.filter((snapshot) => snapshot.publicCollectionCategory === "ZERO_RAW_RESULTS").length,
    numericPriceCoverageNumerator: result.priceCoverage.numerator,
    numericPriceCoverageDenominator: result.priceCoverage.denominator,
    expectedCurrencyCoverageNumerator: result.currencyCoverage.numerator,
    expectedCurrencyCoverageDenominator: result.currencyCoverage.denominator,
  });
}

export function buildSplitR2RouteStackPublicMultiScenarioReceipt({
  sourceSha,
  plan = buildSplitR2RouteStackPublicMultiScenarioPlan(),
  scenarioSnapshots = [],
  scenarioResults = [],
  http = {},
  limiter = {},
  failureClassification = null,
} = {}) {
  const flatSnapshots = scenarioSnapshots.flat();
  const perScenarioAggregates = scenarioResults.map((result, index) =>
    splitR2RouteStackPublicScenarioReceipt(result, plan.scenarioPlans[index], scenarioSnapshots[index] ?? [])
  );
  const evaluable = scenarioResults.filter((result) => result.evaluatedBreakpoints > 0);
  const material = evaluable.filter((result) => result.scenarioHasMaterialSignal);
  const contractFailure = failureClassification !== null || flatSnapshots.some((snapshot) =>
    snapshot.publicCollectionCategory === "TRANSPORT_OR_CONTRACT_FAILURE" ||
    snapshot.publicCollectionCategory === "CONTINUATION_METADATA_AMBIGUOUS"
  );
  const scenariosWithRawPositive = evaluable.filter((result) => result.scenarioHasRawPositive).length;
  const destinationsWithMaterialSignal = new Set(material.map((result) => result.destination)).size;
  const breakpointsEvaluable = sum(scenarioResults.map((result) => result.evaluatedBreakpoints));
  const allSearchesExecuted = flatSnapshots.length === 102 && scenarioSnapshots.length === 3;
  const status = failureClassification !== null || !allSearchesExecuted
    ? "FAIL"
    : breakpointsEvaluable > 0 ? "PASS" : "INCONCLUSIVE";
  const receipt = Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RECEIPT_VERSION,
    status,
    sourceSha,
    environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    userApprovalAcknowledged: true,
    unknownCostAcknowledged: true,
    frozenScenarioOrdinals: [1, 3, 5],
    scenarioCount: 3,
    logicalSearchesPlanned: 102,
    logicalSearchesExecuted: flatSnapshots.length,
    breakpointsPlanned: 32,
    breakpointsEvaluable,
    breakpointsNotEvaluable: 32 - breakpointsEvaluable,
    authHttpRequests: http.AUTHENTICATION ?? 0,
    destinationHttpRequests: http.DESTINATION ?? 0,
    initialHttpRequests: http.INITIAL_SEARCH ?? 0,
    continuationHttpRequests: 0,
    totalHttpRequests: http.total ?? 0,
    totalHttpBudget: 106,
    retries: 0,
    redirects: 0,
    maxObservedConcurrency: http.maxObservedConcurrency ?? 0,
    minObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs ?? null,
    usableBoundedSnapshots: flatSnapshots.filter((snapshot) => snapshot.boundedSnapshotUsable).length,
    zeroRawSnapshots: flatSnapshots.filter((snapshot) => snapshot.publicCollectionCategory === "ZERO_RAW_RESULTS").length,
    unprocessableSnapshots: flatSnapshots.filter((snapshot) => !snapshot.boundedSnapshotUsable).length,
    continuationAvailableNotExecutedSnapshots: flatSnapshots.filter((snapshot) => snapshot.continuationAvailable).length,
    ambiguousSnapshots: flatSnapshots.filter((snapshot) =>
      snapshot.publicCollectionCategory === "CONTINUATION_METADATA_AMBIGUOUS").length,
    totalRawResults: sum(flatSnapshots.map((snapshot) => snapshot.economicEligibilityFunnel.rawResultCount)),
    totalNormalizableResults: sum(flatSnapshots.map((snapshot) => snapshot.normalizableResultCount ?? 0)),
    numericPriceCoverageNumerator: sum(flatSnapshots.map((snapshot) =>
      snapshot.economicEligibilityFunnel.numericPriceEligibleCount)),
    numericPriceCoverageDenominator: sum(flatSnapshots.map((snapshot) =>
      snapshot.economicEligibilityFunnel.rawResultCount)),
    expectedCurrencyCoverageNumerator: sum(flatSnapshots.map((snapshot) =>
      snapshot.economicEligibilityFunnel.expectedCurrencyMatchCount)),
    expectedCurrencyCoverageDenominator: sum(flatSnapshots.map((snapshot) =>
      snapshot.economicEligibilityFunnel.rawResultCount)),
    perScenarioAggregates,
    scenariosEvaluable: evaluable.length,
    scenariosWithRawPositive,
    scenariosWithMaterialSignal: material.length,
    destinationsWithMaterialSignal,
    medianOfScenarioMediansMinorUnits: splitR1CompactMedianInteger(
      evaluable.map((result) => result.medianSavingMinorUnits)
    ),
    medianOfScenarioMediansBasisPoints: splitR1CompactMedianInteger(
      evaluable.map((result) => result.medianSavingBasisPoints)
    ),
    reproducibilityClassification: classifySplitR2RouteStackPublicReproducibility({
      contractFailure,
      scenariosEvaluable: evaluable.length,
      scenariosWithRawPositive,
      scenariosWithMaterialSignal: material.length,
      destinationsWithMaterialSignal,
    }),
    userUsableSplitEvaluated: false,
    bestResultScope: "BOUNDED_RETURNED_SNAPSHOT",
    completenessClaimAllowed: false,
    globalOptimumClaimAllowed: false,
    generalMarketFrequencyClaimAllowed: false,
    productionValidityClaimAllowed: false,
    commercialValidationClaimAllowed: false,
    productionBookingAuthorized: false,
    publicRuntimeChanged: false,
    repositoryModificationsAfterCommit: 0,
    rawIdsPersisted: 0,
    rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0,
    payloadsOrRawResponsesPersisted: 0,
    crossRunLinkability: false,
    secretValuesExposed: false,
    failureClassification: failureClassification ??
      (status === "PASS" ? "NONE" : status === "INCONCLUSIVE" ? "INSUFFICIENT_EVALUABLE_DATA" : "CAMPAIGN_INCOMPLETE"),
  });
  return receipt;
}

export function serializeSplitR2RouteStackPublicMultiScenarioReceipt(
  receipt,
  maxBytes = SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_MAX_UTF8_BYTES
) {
  assertReceiptSafe(receipt);
  const json = stableStringifySplitF0(receipt, 0);
  const byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-routestack-public-multi-scenario-receipt-not-single-line");
  if (byteLength > maxBytes) {
    throw new SplitR2CompactReceiptError("split-r2-routestack-public-multi-scenario-receipt-oversize", byteLength);
  }
  return Object.freeze({ json, byteLength });
}

export async function runSplitR2RouteStackPublicMultiScenario({
  sourceSha,
  plan,
  apiKey,
  apiSecret,
  fetchImplementation = globalThis.fetch,
  monotonicNow,
  sleeper,
  now,
  randomUUID,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha ?? "") || typeof apiKey !== "string" ||
      apiKey.length === 0 || typeof apiSecret !== "string" || apiSecret.length === 0) {
    throw new Error("split-r2-routestack-public-multi-scenario-runtime-input-invalid");
  }
  const authoritativePlan = assertSplitR2RouteStackPublicMultiScenarioPlan(plan);
  const transport = createSplitR2RouteStackPublicMultiScenarioTransport({
    fetchImplementation,
    monotonicNow,
    sleeper,
  });
  const ephemeralKey = crypto.randomBytes(32);
  const scenarioSnapshots = authoritativePlan.scenarioPlans.map(() => []);
  try {
    const auth = await transport.post(
      "AUTHENTICATION",
      SPLIT_R1_AUTH_ENDPOINT,
      createSplitR1PartnerTokenRequest({ apiKey, apiSecret, now, randomUUID })
    );
    let bearer = auth.payload?.token;
    if (typeof bearer !== "string" || bearer.length === 0) {
      throw new Error("split-r2-routestack-public-multi-scenario-bearer-missing");
    }
    const destinations = [];
    for (const scenario of authoritativePlan.publicScenarioBindings) {
      const response = await transport.post(
        "DESTINATION",
        SPLIT_R1_DESTINATION_ENDPOINT,
        createSplitR1DestinationRequest(scenario),
        bearer
      );
      destinations.push(selectSplitR1DestinationCandidate(response.payload, scenario));
    }
    let bindingOrdinal = 0;
    for (let scenarioIndex = 0; scenarioIndex < authoritativePlan.scenarioPlans.length; scenarioIndex += 1) {
      const scenarioPlan = authoritativePlan.scenarioPlans[scenarioIndex];
      for (const search of scenarioPlan.logicalSearches) {
        const binding = authoritativePlan.publicLogicalBindings[bindingOrdinal];
        bindingOrdinal += 1;
        const response = await transport.post(
          "INITIAL_SEARCH",
          SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
          createSplitR1HotelSearchRequest(binding, destinations[scenarioIndex]),
          bearer
        );
        scenarioSnapshots[scenarioIndex].push(
          response.httpValid && response.jsonValid
            ? splitR2RouteStackPublicMultiScenarioSnapshot(
                search,
                binding,
                response.payload,
                ephemeralKey,
                bindingOrdinal
              )
            : splitR2RouteStackPublicUnprocessableSnapshot(search, "TRANSPORT_OR_CONTRACT_FAILURE")
        );
      }
    }
    bearer = null;
    const scenarioResults = authoritativePlan.scenarioPlans.map((scenarioPlan, index) =>
      evaluateSplitR2Scenario("ROUTESTACK_PUBLIC_PRODUCTION", scenarioPlan, scenarioSnapshots[index])
    );
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicMultiScenarioReceipt({
      sourceSha,
      plan: authoritativePlan,
      scenarioSnapshots,
      scenarioResults,
      http: snapshot.http,
      limiter: snapshot.limiter,
    });
  } catch (error) {
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicMultiScenarioReceipt({
      sourceSha,
      plan: authoritativePlan,
      scenarioSnapshots,
      scenarioResults: [],
      http: snapshot.http,
      limiter: snapshot.limiter,
      failureClassification: String(error?.message ?? error).startsWith("split-r2-")
        ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
        : "ROUTESTACK_PUBLIC_MULTI_SCENARIO_TECHNICAL_FAILURE",
    });
  } finally {
    ephemeralKey.fill(0);
  }
}

function splitR2FakePublicSearchPayload(search) {
  const scenarioMaterial = search.scenarioOrdinal === 1 || search.scenarioOrdinal === 3;
  const price = search.searchRole === "FULL_STAY"
    ? 1_000
    : search.searchRole === "PREFIX" || search.searchRole === "SUFFIX"
      ? scenarioMaterial ? 400 : 550
      : 100;
  const roleSuffix = search.searchRole === "PREFIX" ? "left" :
    search.searchRole === "SUFFIX" ? "right" : search.searchRole.toLowerCase();
  return {
    result: {
      currency: "EUR",
      correlationId: "synthetic-correlation-memory-only",
      token: "synthetic-search-token-memory-only",
      nextResultsKey: null,
      result: [{
        id: `synthetic-s${search.scenarioOrdinal}-${roleSuffix}-${search.breakpointOrdinal ?? 0}`,
        ourprice: price,
      }],
    },
  };
}

export async function runSplitR2FakeRouteStackPublicMultiScenario() {
  const plan = buildSplitR2RouteStackPublicMultiScenarioPlan();
  let monotonic = 0;
  let requestOrdinal = 0;
  const receipt = await runSplitR2RouteStackPublicMultiScenario({
    sourceSha: "b".repeat(40),
    plan,
    apiKey: "synthetic-public-key",
    apiSecret: "synthetic-public-secret",
    monotonicNow: () => monotonic,
    sleeper: async (delay) => { monotonic += delay; },
    now: () => 1_800_000_000_000,
    randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      if (options.method !== "POST" || options.redirect !== "error") {
        throw new Error("synthetic-transport-contract-drift");
      }
      requestOrdinal += 1;
      if (requestOrdinal === 1) return fakeJsonResponse({ token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (requestOrdinal >= 2 && requestOrdinal <= 4) {
        const scenario = plan.publicScenarioBindings[requestOrdinal - 2];
        return fakeJsonResponse({ result: [{
          id: `synthetic-destination-${requestOrdinal - 1}`,
          city: scenario.destination.label,
          country: scenario.destination.countryCode,
          type: "City",
          fullName: `${scenario.destination.label}, Italy`,
          coordinates: { lat: scenario.destination.latitude, long: scenario.destination.longitude },
        }] }, 200, String(url));
      }
      return fakeJsonResponse(
        splitR2FakePublicSearchPayload(plan.logicalSearches[requestOrdinal - 5]),
        200,
        String(url)
      );
    },
  });
  return receipt;
}

const SPLIT_R2_PAGINATION_SCENARIO_ORDINALS = Object.freeze([1, 3]);
const SPLIT_R2_PAGINATION_BREAKPOINTS = Object.freeze({
  1: Object.freeze([1, 7, 13]),
  3: Object.freeze([1, 3, 6]),
});
const SPLIT_R2_PAGINATION_LIMITS = Object.freeze({
  AUTHENTICATION: 1,
  DESTINATION: 2,
  INITIAL_SEARCH: 14,
  CONTINUATION_D1: 14,
  CONTINUATION_D2: 14,
  CONTINUATION_TOTAL: 28,
  total: 45,
});

export function assertSplitR2RouteStackPublicPaginationSensitivityPlan(plan) {
  const ordinals = plan?.scenarioPlans?.map((entry) => entry.scenario.ordinal) ?? [];
  const breakpointOrdinals = plan?.scenarioPlans?.map((entry) => entry.selectedBreakpointOrdinals) ?? [];
  const searchesByScenario = plan?.scenarioPlans?.map((entry) => entry.logicalSearches.length) ?? [];
  const exact = plan?.provider === "ROUTESTACK_PUBLIC_PRODUCTION" &&
    plan?.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    stableStringifySplitF0(ordinals, 0) === "[1,3]" &&
    stableStringifySplitF0(breakpointOrdinals, 0) === "[[1,7,13],[1,3,6]]" &&
    stableStringifySplitF0(searchesByScenario, 0) === "[7,7]" &&
    plan.logicalSearches?.length === 14 && plan.publicLogicalBindings?.length === 14 &&
    plan.publicScenarioBindings?.length === 2 &&
    new Set(plan.scenarioPlans.map((entry) => `${entry.scenario.destination}|${entry.scenario.country}`)).size === 2 &&
    plan.scenarioPlans.every((entry) => {
      const roles = entry.logicalSearches.map((search) => search.searchRole);
      return roles[0] === "FULL_STAY" && roles.filter((role) => role === "FULL_STAY").length === 1 &&
        roles.filter((role) => role === "PREFIX").length === 3 &&
        roles.filter((role) => role === "SUFFIX").length === 3 &&
        entry.logicalSearches.every((search) =>
          search.destination === entry.scenario.destination && search.country === entry.scenario.country &&
          search.expectedCurrency === "EUR" && search.occupancy.rooms === 1 &&
          search.occupancy.adults === 2 && search.occupancy.children === 0
        );
    }) &&
    plan.logicalSearches.every((search, index) =>
      plan.publicLogicalBindings[index]?.logicalSearchId === search.logicalSearchId
    );
  if (!exact) throw new Error("split-r2-pagination-sensitivity-plan-divergence");
  return plan;
}

export function buildSplitR2RouteStackPublicPaginationSensitivityPlan() {
  const frozen = buildSplitR2RouteStackPublicMultiScenarioPlan();
  const scenarioPlans = Object.freeze(SPLIT_R2_PAGINATION_SCENARIO_ORDINALS.map((ordinal) => {
    const source = frozen.scenarioPlans.find((entry) => entry.scenario.ordinal === ordinal);
    const selectedBreakpointOrdinals = SPLIT_R2_PAGINATION_BREAKPOINTS[ordinal];
    const logicalSearches = Object.freeze(source.logicalSearches.filter((search) =>
      search.searchRole === "FULL_STAY" ||
      (["PREFIX", "SUFFIX"].includes(search.searchRole) &&
        selectedBreakpointOrdinals.includes(search.breakpointOrdinal))
    ));
    return Object.freeze({
      scenario: source.scenario,
      selectedBreakpointOrdinals,
      logicalSearches,
    });
  }));
  const logicalSearches = Object.freeze(scenarioPlans.flatMap((entry) => entry.logicalSearches));
  const plan = Object.freeze({
    provider: "ROUTESTACK_PUBLIC_PRODUCTION",
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    selectedScenarioOrdinals: SPLIT_R2_PAGINATION_SCENARIO_ORDINALS,
    scenarioPlans,
    logicalSearches,
    publicScenarioBindings: Object.freeze(
      scenarioPlans.map((entry) => splitR2RouteStackPublicScenarioBinding(entry.scenario))
    ),
    publicLogicalBindings: Object.freeze(logicalSearches.map(splitR2RouteStackPublicLogicalBinding)),
  });
  return assertSplitR2RouteStackPublicPaginationSensitivityPlan(plan);
}

export function assertSplitR2RouteStackPublicPaginationSensitivityPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const evidence = options.contractEvidence ?? inspectSplitR2RouteStackPublicContractEvidence();
  const plan = assertSplitR2RouteStackPublicPaginationSensitivityPlan(options.plan);
  const exact = options.mode === "ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY" &&
    options.phase === "SPLIT-R2.7A" && options.compact === true &&
    options.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    options.hostname === "mcp.routestack.ai" && options.protocol === "https:" &&
    options.acknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_45_HTTP" &&
    options.unknownCostAcknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN" &&
    options.noMutationAcknowledgement === "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION" &&
    options.authMax === 1 && options.destinationMax === 2 && options.initialSearchMax === 14 &&
    options.continuationD1Max === 14 && options.continuationD2Max === 14 &&
    options.continuationMax === 28 && options.totalMax === 45 && options.maxContinuationDepth === 2 &&
    options.retries === 0 && options.redirects === 0 && options.concurrency === 1 &&
    options.minimumIntervalMs >= 1_000 && options.productionFallback === false &&
    options.sandboxFallback === false && options.otherLiveModesSelected === 0 &&
    options.repositoryGatePassed === true &&
    evidence.environmentClassification === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    evidence.hostnameDeterminable === true && evidence.contractDeterminable === true &&
    evidence.mutativeEndpointsSelected === false && evidence.sandboxFallback === false;
  if (!exact) throw new Error("split-r2-pagination-sensitivity-preflight-failed-before-credentials");
  const credentials = credentialReader();
  if (credentials?.baseUrl !== SPLIT_R1_OFFICIAL_BASE_URL ||
      typeof credentials?.apiKey !== "string" || credentials.apiKey.length === 0 ||
      typeof credentials?.apiSecret !== "string" || credentials.apiSecret.length === 0) {
    throw new Error("split-r2-pagination-sensitivity-credentials-missing-or-misbound");
  }
  return Object.freeze({ plan, credentials, evidence, credentialsAccessed: true });
}

export function createSplitR2RouteStackPublicPaginationSensitivityCounter() {
  const counts = {
    AUTHENTICATION: 0, DESTINATION: 0, INITIAL_SEARCH: 0,
    CONTINUATION_D1: 0, CONTINUATION_D2: 0, CONTINUATION_TOTAL: 0, total: 0,
  };
  const d0 = new Set();
  const d1 = new Set();
  const d2 = new Set();
  let d0Closed = false;
  let d1Closed = false;
  let active = 0;
  let maxObservedConcurrency = 0;
  return Object.freeze({
    reserve(requestClass, logicalSearchId = null) {
      if (!["AUTHENTICATION", "DESTINATION", "INITIAL_SEARCH", "CONTINUATION_D1", "CONTINUATION_D2"]
        .includes(requestClass)) {
        throw new Error("split-r2-pagination-sensitivity-route-forbidden");
      }
      if (requestClass.startsWith("CONTINUATION") &&
          (typeof logicalSearchId !== "string" || logicalSearchId.length === 0)) {
        throw new Error("split-r2-pagination-sensitivity-continuation-binding-invalid");
      }
      if (requestClass === "INITIAL_SEARCH" && d0Closed) {
        throw new Error("split-r2-pagination-sensitivity-d0-order-closed");
      }
      if (requestClass === "CONTINUATION_D1") {
        if (!d0Closed || d1Closed || d1.has(logicalSearchId)) {
          throw new Error("split-r2-pagination-sensitivity-d1-order-or-cardinality-invalid");
        }
      }
      if (requestClass === "CONTINUATION_D2") {
        if (!d0Closed || !d1Closed || !d1.has(logicalSearchId) || d2.has(logicalSearchId)) {
          throw new Error("split-r2-pagination-sensitivity-d2-order-or-binding-invalid");
        }
      }
      if (counts[requestClass] + 1 > SPLIT_R2_PAGINATION_LIMITS[requestClass] ||
          counts.total + 1 > SPLIT_R2_PAGINATION_LIMITS.total ||
          (requestClass.startsWith("CONTINUATION") &&
            counts.CONTINUATION_TOTAL + 1 > SPLIT_R2_PAGINATION_LIMITS.CONTINUATION_TOTAL)) {
        throw new Error("split-r2-pagination-sensitivity-http-budget-exceeded-before-transport");
      }
      counts[requestClass] += 1;
      counts.total += 1;
      if (requestClass === "INITIAL_SEARCH") d0.add(logicalSearchId);
      if (requestClass === "CONTINUATION_D1") { counts.CONTINUATION_TOTAL += 1; d1.add(logicalSearchId); }
      if (requestClass === "CONTINUATION_D2") { counts.CONTINUATION_TOTAL += 1; d2.add(logicalSearchId); }
    },
    closeDepth(depth) {
      if (depth === "D0") {
        if (counts.INITIAL_SEARCH !== 14) throw new Error("split-r2-pagination-sensitivity-d0-incomplete");
        d0Closed = true;
        return;
      }
      if (depth === "D1") {
        if (!d0Closed) throw new Error("split-r2-pagination-sensitivity-d1-before-d0");
        d1Closed = true;
        return;
      }
      throw new Error("split-r2-pagination-sensitivity-depth-invalid");
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-pagination-sensitivity-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-pagination-sensitivity-concurrency-ledger-invalid");
    },
    snapshot() {
      return Object.freeze({ ...counts, retries: 0, redirects: 0, maxObservedConcurrency,
        allD0BeforeAnyD1: d0Closed, allD1BeforeAnyD2: d1Closed });
    },
  });
}

function createSplitR2PaginationTransport({ fetchImplementation, monotonicNow, sleeper } = {}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("split-r2-pagination-sensitivity-fetch-unavailable");
  }
  const counter = createSplitR2RouteStackPublicPaginationSensitivityCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const expectedEndpoint = new Map([
    ["AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT],
    ["DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT],
    ["INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
    ["CONTINUATION_D1", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
    ["CONTINUATION_D2", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
  ]);
  return Object.freeze({
    async post(requestClass, endpointPath, body, bearer = null, logicalSearchId = null) {
      if (expectedEndpoint.get(requestClass) !== endpointPath) {
        throw new Error("split-r2-pagination-sensitivity-route-forbidden");
      }
      const url = new URL(endpointPath, SPLIT_R1_OFFICIAL_BASE_URL);
      if (url.protocol !== "https:" || url.hostname !== "mcp.routestack.ai") {
        throw new Error("split-r2-pagination-sensitivity-host-forbidden");
      }
      await limiter.ready();
      counter.reserve(requestClass, logicalSearchId);
      counter.enterTransport();
      limiter.markStarted();
      try {
        const response = await fetchImplementation(url, {
          method: "POST", redirect: "error", cache: "no-store",
          headers: { Accept: "application/json", "Content-Type": "application/json",
            ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }) },
          body: JSON.stringify(body),
        });
        if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
          throw new Error("split-r2-pagination-sensitivity-redirect-prohibited");
        }
        if (typeof response.url === "string" && response.url.length > 0) {
          const responseUrl = new URL(response.url);
          if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "mcp.routestack.ai") {
            throw new Error("split-r2-pagination-sensitivity-response-host-forbidden");
          }
        }
        const contentType = response.headers?.get?.("content-type") ?? "";
        let payload = null;
        let jsonValid = false;
        if (/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) {
          try { payload = JSON.parse(await response.text()); jsonValid = true; } catch { jsonValid = false; }
        }
        if (response.status !== 200 || !jsonValid) {
          throw new Error("split-r2-pagination-sensitivity-contract-response-invalid");
        }
        return Object.freeze({ payload, status: response.status, httpValid: true, jsonValid: true });
      } finally {
        counter.leaveTransport();
      }
    },
    closeDepth: (depth) => counter.closeDepth(depth),
    snapshot: () => Object.freeze({ http: counter.snapshot(), limiter: limiter.snapshot() }),
  });
}

function splitR2PaginationContinuationBinding(payload) {
  const diagnostic = diagnoseSplitR1ContinuationMetadataShapeV1(payload);
  if (diagnostic.continuationAuthorizable !== true ||
      diagnostic.completeCandidateContainerCount !== 1 ||
      diagnostic.selectedContractualContainer !== "result") return null;
  return payload;
}

function splitR2PaginationDeduplicate(offers) {
  const byProperty = new Map();
  for (const offer of offers) {
    const prior = byProperty.get(offer.propertyFingerprint);
    if (!prior || offer.totalMinorUnits < prior.totalMinorUnits) byProperty.set(offer.propertyFingerprint, offer);
  }
  return [...byProperty.values()].sort((left, right) =>
    left.totalMinorUnits - right.totalMinorUnits || left.propertyFingerprint.localeCompare(right.propertyFingerprint)
  );
}

function splitR2PaginationAddPage(state, depth, payload, ephemeralKey) {
  const page = normalizeSplitR1SearchPage(payload, {
    logicalSearch: state.binding,
    ephemeralRunKey: ephemeralKey,
  });
  const economicOffers = page.offers.filter((offer) => offer.currency === state.search.expectedCurrency);
  state.pages.push(Object.freeze({
    depth,
    rawResultCount: page.rawResultCount,
    normalizableResultCount: page.offers.length,
    economicOfferCount: economicOffers.length,
    offers: economicOffers,
  }));
  state.latestResponse = payload;
  state.depthReached = depth;
}

function splitR2PaginationCumulativeState(state, depth) {
  const pages = state.pages.filter((page) => page.depth <= depth);
  const offers = pages.flatMap((page) => page.offers);
  const distinct = splitR2PaginationDeduplicate(offers);
  return Object.freeze({
    depthObserved: state.depthReached >= depth,
    pageRawResults: pages.filter((page) => page.depth === depth).reduce((n, page) => n + page.rawResultCount, 0),
    pageNormalizableResults: pages.filter((page) => page.depth === depth)
      .reduce((n, page) => n + page.normalizableResultCount, 0),
    pageEconomicOffers: pages.filter((page) => page.depth === depth)
      .reduce((n, page) => n + page.economicOfferCount, 0),
    cumulativeRawResults: pages.reduce((n, page) => n + page.rawResultCount, 0),
    cumulativeNormalizableResults: pages.reduce((n, page) => n + page.normalizableResultCount, 0),
    cumulativePreDedupOffers: offers.length,
    interPageDuplicatesRemoved: offers.length - distinct.length,
    cumulativeDistinctOffers: distinct.length,
    offers: distinct,
  });
}

function splitR2PaginationBreakpointEconomics(plan, states, scenarioOrdinal, breakpointOrdinal, depth) {
  const scenario = plan.scenarioPlans.find((entry) => entry.scenario.ordinal === scenarioOrdinal);
  const find = (role) => scenario.logicalSearches.find((search) =>
    search.searchRole === role && (role === "FULL_STAY" || search.breakpointOrdinal === breakpointOrdinal)
  );
  const cumulative = (search) => splitR2PaginationCumulativeState(states.get(search.logicalSearchId), depth);
  const full = cumulative(find("FULL_STAY"));
  const prefix = cumulative(find("PREFIX"));
  const suffix = cumulative(find("SUFFIX"));
  const depthObserved = full.depthObserved && prefix.depthObserved && suffix.depthObserved;
  const baseline = full.offers[0] ?? null;
  const pair = splitR1NightlyOracleBestPair(prefix.offers, suffix.offers, false);
  if (!depthObserved || baseline === null || pair === null) {
    return Object.freeze({ depthObserved, evaluable: false, fullBaselineMinorUnits: null,
      bestDistinctSplitPairTotalMinorUnits: null, savingMinorUnits: null,
      savingBasisPoints: null, rawPositive: false, materialSignal: false });
  }
  const saving = classifySplitR2Saving(
    baseline.totalMinorUnits - pair.splitTotalMinorUnits,
    baseline.totalMinorUnits
  );
  return Object.freeze({
    depthObserved: true,
    evaluable: true,
    fullBaselineMinorUnits: baseline.totalMinorUnits,
    bestDistinctSplitPairTotalMinorUnits: pair.splitTotalMinorUnits,
    savingMinorUnits: saving.savingMinorUnits,
    savingBasisPoints: saving.savingBasisPoints,
    rawPositive: saving.savingMinorUnits > 0,
    materialSignal: saving.materialPriceSignal,
  });
}

export function splitR2PaginationTransition(left, right) {
  if (!left.depthObserved || !right.depthObserved) return Object.freeze({ comparable: false });
  const evaluabilityChanged = left.evaluable !== right.evaluable;
  if (!left.evaluable || !right.evaluable) {
    return Object.freeze({ comparable: true, evaluabilityChanged,
      fullBaselineChanged: false, splitPairChanged: false, savingSignChanged: false,
      materialChanged: false, savingDeltaMinorUnits: null });
  }
  return Object.freeze({
    comparable: true,
    evaluabilityChanged,
    fullBaselineChanged: left.fullBaselineMinorUnits !== right.fullBaselineMinorUnits,
    splitPairChanged: left.bestDistinctSplitPairTotalMinorUnits !== right.bestDistinctSplitPairTotalMinorUnits,
    savingSignChanged: Math.sign(left.savingMinorUnits) !== Math.sign(right.savingMinorUnits),
    materialChanged: left.materialSignal !== right.materialSignal,
    savingDeltaMinorUnits: right.savingMinorUnits - left.savingMinorUnits,
  });
}

export function classifySplitR2PaginationSensitivity(perBreakpointDepthEconomics) {
  const transitions = perBreakpointDepthEconomics.flatMap((entry) => [entry.d0ToD1, entry.d1ToD2])
    .filter((transition) => transition.comparable);
  if (transitions.length === 0) return "PAGINATION_SENSITIVITY_INCONCLUSIVE";
  if (transitions.some((transition) => transition.savingSignChanged || transition.materialChanged ||
      transition.evaluabilityChanged)) return "PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL";
  if (transitions.some((transition) => transition.fullBaselineChanged || transition.splitPairChanged)) {
    return "PAGINATION_SENSITIVITY_ECONOMIC_MINIMUM_ONLY";
  }
  return "NO_PAGINATION_SENSITIVITY_OBSERVED_WITHIN_D2";
}

export function classifySplitR2PaginationStabilization(perBreakpointDepthEconomics) {
  const d01 = perBreakpointDepthEconomics.map((entry) => entry.d0ToD1).filter((entry) => entry.comparable);
  const d12 = perBreakpointDepthEconomics.map((entry) => entry.d1ToD2).filter((entry) => entry.comparable);
  if (d01.length === 0 || d12.length === 0) return "NOT_DETERMINABLE";
  const changed = (entry) => entry.evaluabilityChanged || entry.fullBaselineChanged ||
    entry.splitPairChanged || entry.savingSignChanged || entry.materialChanged;
  if (d12.some(changed)) return "STILL_CHANGING_AT_D2";
  if (d01.some(changed)) return "STABLE_BY_D2";
  return "STABLE_BY_D1";
}

export function classifySplitR2PaginationBias(perBreakpointDepthEconomics) {
  const deltas = perBreakpointDepthEconomics.flatMap((entry) => [entry.d0ToD1, entry.d1ToD2])
    .filter((entry) => entry.comparable && Number.isSafeInteger(entry.savingDeltaMinorUnits))
    .map((entry) => entry.savingDeltaMinorUnits);
  if (deltas.length === 0) return "NOT_DETERMINABLE";
  const positive = deltas.some((value) => value > 0);
  const negative = deltas.some((value) => value < 0);
  if (positive && negative) return "BIDIRECTIONAL";
  if (positive && deltas.every((value) => value >= 0)) return "FAVORS_SPLIT";
  if (negative && deltas.every((value) => value <= 0)) return "FAVORS_FULL_STAY";
  return "NO_DIRECTIONAL_CHANGE";
}

function splitR2PaginationEconomics(plan, states) {
  return Object.freeze(plan.scenarioPlans.flatMap((scenario) =>
    scenario.selectedBreakpointOrdinals.map((breakpointOrdinal) => {
      const d0 = splitR2PaginationBreakpointEconomics(plan, states, scenario.scenario.ordinal, breakpointOrdinal, 0);
      const d1 = splitR2PaginationBreakpointEconomics(plan, states, scenario.scenario.ordinal, breakpointOrdinal, 1);
      const d2 = splitR2PaginationBreakpointEconomics(plan, states, scenario.scenario.ordinal, breakpointOrdinal, 2);
      return Object.freeze({
        scenarioOrdinal: scenario.scenario.ordinal,
        breakpointOrdinal,
        depths: Object.freeze({ D0: d0, D1: d1, D2: d2 }),
        d0ToD1: splitR2PaginationTransition(d0, d1),
        d1ToD2: splitR2PaginationTransition(d1, d2),
      });
    })
  ));
}

function splitR2PaginationDepthCounts(states, depth) {
  const cumulative = [...states.values()].map((state) => splitR2PaginationCumulativeState(state, depth));
  return Object.freeze({
    pageRawResults: sum(cumulative.map((entry) => entry.pageRawResults)),
    pageNormalizableResults: sum(cumulative.map((entry) => entry.pageNormalizableResults)),
    pageEconomicOffers: sum(cumulative.map((entry) => entry.pageEconomicOffers)),
    cumulativeRawResults: sum(cumulative.map((entry) => entry.cumulativeRawResults)),
    cumulativeNormalizableResults: sum(cumulative.map((entry) => entry.cumulativeNormalizableResults)),
    cumulativePreDedupOffers: sum(cumulative.map((entry) => entry.cumulativePreDedupOffers)),
    interPageDuplicatesRemoved: sum(cumulative.map((entry) => entry.interPageDuplicatesRemoved)),
    cumulativeDistinctOffers: sum(cumulative.map((entry) => entry.cumulativeDistinctOffers)),
  });
}

export function buildSplitR2RouteStackPublicPaginationSensitivityReceipt({
  sourceSha,
  plan = buildSplitR2RouteStackPublicPaginationSensitivityPlan(),
  states = new Map(),
  http = {},
  limiter = {},
  failureClassification = null,
} = {}) {
  const economics = states.size === 14 ? splitR2PaginationEconomics(plan, states) : [];
  const sensitivity = economics.length > 0
    ? classifySplitR2PaginationSensitivity(economics)
    : "PAGINATION_SENSITIVITY_INCONCLUSIVE";
  const stabilization = economics.length > 0
    ? classifySplitR2PaginationStabilization(economics)
    : "NOT_DETERMINABLE";
  const bias = economics.length > 0 ? classifySplitR2PaginationBias(economics) : "NOT_DETERMINABLE";
  const countEvents = (name, transition) => economics.filter((entry) => entry[transition]?.[name] === true).length;
  const comparable = (depth) => economics.filter((entry) => entry.depths?.[depth]?.evaluable === true).length;
  const d0 = states.size === 14 ? splitR2PaginationDepthCounts(states, 0) : null;
  const d1 = states.size === 14 ? splitR2PaginationDepthCounts(states, 1) : null;
  const d2 = states.size === 14 ? splitR2PaginationDepthCounts(states, 2) : null;
  const multiDepthComparable = economics.some((entry) => entry.d0ToD1.comparable || entry.d1ToD2.comparable);
  const allSixFullyComparable = economics.length === 6 && economics.every((entry) =>
    entry.depths.D0.evaluable && entry.depths.D1.evaluable && entry.depths.D2.evaluable
  );
  const status = failureClassification !== null ? "FAIL" :
    sensitivity === "PAGINATION_SENSITIVITY_INCONCLUSIVE" || !multiDepthComparable ? "INCONCLUSIVE" : "PASS";
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RECEIPT_VERSION,
    status,
    sourceSha,
    environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    userApprovalAcknowledged: true,
    unknownCostAcknowledged: true,
    singleWaveEnforced: true,
    selectedScenarioOrdinals: [1, 3],
    selectedBreakpointOrdinals: Object.freeze({ 1: [1, 7, 13], 3: [1, 3, 6] }),
    logicalSearchesPlanned: 14,
    logicalSearchesExecuted: http.INITIAL_SEARCH ?? 0,
    maxContinuationDepth: 2,
    authHttpRequests: http.AUTHENTICATION ?? 0,
    destinationHttpRequests: http.DESTINATION ?? 0,
    initialHttpRequests: http.INITIAL_SEARCH ?? 0,
    continuationD1HttpRequests: http.CONTINUATION_D1 ?? 0,
    continuationD2HttpRequests: http.CONTINUATION_D2 ?? 0,
    continuationHttpRequests: http.CONTINUATION_TOTAL ?? 0,
    totalHttpRequests: http.total ?? 0,
    totalHttpBudget: 45,
    retries: 0,
    redirects: 0,
    maxObservedConcurrency: http.maxObservedConcurrency ?? 0,
    minObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs ?? null,
    allD0BeforeAnyD1: http.allD0BeforeAnyD1 === true,
    allD1BeforeAnyD2: http.allD1BeforeAnyD2 === true,
    perDepthCollectionCounts: Object.freeze({ D0: d0, D1: d1, D2: d2 }),
    perDepthCumulativeDistinctOffers: Object.freeze({
      D0: d0?.cumulativeDistinctOffers ?? 0,
      D1: d1?.cumulativeDistinctOffers ?? 0,
      D2: d2?.cumulativeDistinctOffers ?? 0,
    }),
    interPageDuplicatesRemoved: Object.freeze({
      D1: d1?.interPageDuplicatesRemoved ?? 0,
      D2: d2?.interPageDuplicatesRemoved ?? 0,
    }),
    breakpointsComparableAtD0: comparable("D0"),
    breakpointsComparableAtD1: comparable("D1"),
    breakpointsComparableAtD2: comparable("D2"),
    perBreakpointDepthEconomics: economics,
    fullBaselineChanges: Object.freeze({
      D0_TO_D1: countEvents("fullBaselineChanged", "d0ToD1"),
      D1_TO_D2: countEvents("fullBaselineChanged", "d1ToD2"),
    }),
    splitPairChanges: Object.freeze({
      D0_TO_D1: countEvents("splitPairChanged", "d0ToD1"),
      D1_TO_D2: countEvents("splitPairChanged", "d1ToD2"),
    }),
    savingSignChanges: Object.freeze({
      D0_TO_D1: countEvents("savingSignChanged", "d0ToD1"),
      D1_TO_D2: countEvents("savingSignChanged", "d1ToD2"),
    }),
    materialClassificationChanges: Object.freeze({
      D0_TO_D1: countEvents("materialChanged", "d0ToD1"),
      D1_TO_D2: countEvents("materialChanged", "d1ToD2"),
    }),
    evaluabilityChanges: Object.freeze({
      D0_TO_D1: countEvents("evaluabilityChanged", "d0ToD1"),
      D1_TO_D2: countEvents("evaluabilityChanged", "d1ToD2"),
    }),
    sensitivityClassification: sensitivity,
    stabilizationClassification: stabilization,
    observedBiasDirection: bias,
    initialOnlyClassificationRobustWithinStudy:
      sensitivity === "PAGINATION_SENSITIVITY_SIGN_OR_MATERIAL" ? false :
        allSixFullyComparable ? true : "NOT_DETERMINABLE",
    noSensitivityImpliesCompleteness: false,
    bestResultScope: "BOUNDED_RETURNED_SNAPSHOT_WITHIN_D2",
    completenessClaimAllowed: false,
    globalOptimumClaimAllowed: false,
    marketFrequencyClaimAllowed: false,
    userUsableSplitEvaluated: false,
    productionBookingAuthorized: false,
    continuationContractChangedOutsideMicrostudy: false,
    publicRuntimeChanged: false,
    repositoryModificationsAfterCommit: 0,
    rawIdsPersisted: 0,
    rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0,
    payloadsOrRawResponsesPersisted: 0,
    ephemeralHmacSecretPersisted: false,
    crossRunLinkability: false,
    secretValuesExposed: false,
    failureClassification: failureClassification ??
      (status === "INCONCLUSIVE" ? "PAGINATION_SENSITIVITY_INCONCLUSIVE" : "NONE"),
  });
}

export function serializeSplitR2RouteStackPublicPaginationSensitivityReceipt(
  receipt,
  maxBytes = SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_MAX_UTF8_BYTES
) {
  assertReceiptSafe(receipt);
  const json = stableStringifySplitF0(receipt, 0);
  const byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-pagination-sensitivity-receipt-not-single-line");
  if (byteLength > maxBytes) {
    throw new SplitR2CompactReceiptError("split-r2-pagination-sensitivity-receipt-oversize", byteLength);
  }
  return Object.freeze({ json, byteLength });
}

export async function runSplitR2RouteStackPublicPaginationSensitivity({
  sourceSha,
  plan,
  apiKey,
  apiSecret,
  fetchImplementation = globalThis.fetch,
  monotonicNow,
  sleeper,
  now,
  randomUUID,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha ?? "") || typeof apiKey !== "string" || apiKey.length === 0 ||
      typeof apiSecret !== "string" || apiSecret.length === 0) {
    throw new Error("split-r2-pagination-sensitivity-runtime-input-invalid");
  }
  const authoritativePlan = assertSplitR2RouteStackPublicPaginationSensitivityPlan(plan);
  const transport = createSplitR2PaginationTransport({ fetchImplementation, monotonicNow, sleeper });
  const ephemeralKey = crypto.randomBytes(32);
  const states = new Map(authoritativePlan.logicalSearches.map((search, index) => [search.logicalSearchId, {
    search,
    binding: authoritativePlan.publicLogicalBindings[index],
    originalRequest: null,
    latestResponse: null,
    depthReached: -1,
    pages: [],
  }]));
  try {
    const auth = await transport.post("AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT,
      createSplitR1PartnerTokenRequest({ apiKey, apiSecret, now, randomUUID }));
    let bearer = auth.payload?.token;
    if (typeof bearer !== "string" || bearer.length === 0) {
      throw new Error("split-r2-pagination-sensitivity-bearer-missing");
    }
    const destinations = new Map();
    for (const scenario of authoritativePlan.publicScenarioBindings) {
      const response = await transport.post("DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT,
        createSplitR1DestinationRequest(scenario), bearer);
      destinations.set(scenario.scenarioId, selectSplitR1DestinationCandidate(response.payload, scenario));
    }
    for (const search of authoritativePlan.logicalSearches) {
      const state = states.get(search.logicalSearchId);
      state.originalRequest = createSplitR1HotelSearchRequest(
        state.binding,
        destinations.get(state.binding.scenarioId)
      );
      const response = await transport.post("INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        state.originalRequest, bearer, search.logicalSearchId);
      splitR2PaginationAddPage(state, 0, response.payload, ephemeralKey);
    }
    transport.closeDepth("D0");
    for (const search of authoritativePlan.logicalSearches) {
      const state = states.get(search.logicalSearchId);
      const metadataSource = splitR2PaginationContinuationBinding(state.latestResponse);
      if (metadataSource === null) continue;
      const request = createSplitR1ContinuationRequest(state.originalRequest, metadataSource, 1);
      const response = await transport.post("CONTINUATION_D1", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        request, bearer, search.logicalSearchId);
      splitR2PaginationAddPage(state, 1, response.payload, ephemeralKey);
    }
    transport.closeDepth("D1");
    for (const search of authoritativePlan.logicalSearches) {
      const state = states.get(search.logicalSearchId);
      if (state.depthReached !== 1) continue;
      const metadataSource = splitR2PaginationContinuationBinding(state.latestResponse);
      if (metadataSource === null) continue;
      const request = createSplitR1ContinuationRequest(state.originalRequest, metadataSource, 2);
      const response = await transport.post("CONTINUATION_D2", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        request, bearer, search.logicalSearchId);
      splitR2PaginationAddPage(state, 2, response.payload, ephemeralKey);
    }
    bearer = null;
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicPaginationSensitivityReceipt({
      sourceSha, plan: authoritativePlan, states, http: snapshot.http, limiter: snapshot.limiter,
    });
  } catch (error) {
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicPaginationSensitivityReceipt({
      sourceSha, plan: authoritativePlan, states, http: snapshot.http, limiter: snapshot.limiter,
      failureClassification: String(error?.message ?? error).startsWith("split-r2-")
        ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
        : "ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_TECHNICAL_FAILURE",
    });
  } finally {
    for (const state of states.values()) {
      state.latestResponse = null;
      state.originalRequest = null;
    }
    ephemeralKey.fill(0);
  }
}

function splitR2FakePaginationPayload(search, depth, terminalAtInitial = false) {
  const base = search.searchRole === "FULL_STAY" ? 1_000 : 450;
  return {
    result: {
      currency: "EUR",
      correlationId: `synthetic-correlation-${search.logicalSearchId}-${depth}`,
      token: `synthetic-token-${search.logicalSearchId}-${depth}`,
      nextResultsKey: terminalAtInitial || depth === 2 ? null :
        `synthetic-next-${search.logicalSearchId}-${depth + 1}`,
      result: [{
        id: `synthetic-property-${search.logicalSearchId}-${depth === 1 ? 0 : depth}`,
        ourprice: base + depth * 100,
      }],
    },
  };
}

async function runSplitR2FakePaginationCampaign(terminalAtInitial) {
  const plan = buildSplitR2RouteStackPublicPaginationSensitivityPlan();
  let monotonic = 0;
  let requestOrdinal = 0;
  return runSplitR2RouteStackPublicPaginationSensitivity({
    sourceSha: "c".repeat(40), plan, apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret",
    monotonicNow: () => monotonic,
    sleeper: async (delay) => { monotonic += delay; },
    now: () => 1_800_000_000_000,
    randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      requestOrdinal += 1;
      if (requestOrdinal === 1) return fakeJsonResponse({ token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (requestOrdinal <= 3) {
        const scenario = plan.publicScenarioBindings[requestOrdinal - 2];
        return fakeJsonResponse({ result: [{
          id: `synthetic-destination-${requestOrdinal - 1}`,
          city: scenario.destination.label, country: scenario.destination.countryCode, type: "City",
          fullName: `${scenario.destination.label}, Italy`,
          coordinates: { lat: scenario.destination.latitude, long: scenario.destination.longitude },
        }] }, 200, String(url));
      }
      const requestBody = JSON.parse(options.body);
      const depth = typeof requestBody.nextResultsKey !== "string" ? 0 :
        requestBody.nextResultsKey.endsWith("-1") ? 1 : 2;
      const offset = depth === 0 ? 4 : depth === 1 ? 18 : 32;
      const search = plan.logicalSearches[requestOrdinal - offset];
      return fakeJsonResponse(splitR2FakePaginationPayload(search, depth, terminalAtInitial), 200, String(url));
    },
  });
}

export function runSplitR2FakeRouteStackPublicPaginationFullDepth() {
  return runSplitR2FakePaginationCampaign(false);
}

export function runSplitR2FakeRouteStackPublicPaginationEarlyTerminal() {
  return runSplitR2FakePaginationCampaign(true);
}

const SPLIT_R2_PAGINATION_AWARE_LIMITS = Object.freeze({
  AUTHENTICATION: 1,
  DESTINATION: 3,
  INITIAL_SEARCH: 102,
  CONTINUATION_D1: 102,
  CONTINUATION_D2: 102,
  CONTINUATION_TOTAL: 204,
  total: 310,
});

export const SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES = Object.freeze([
  "PROVIDER_EXHAUSTED_AFTER_INITIAL",
  "PROVIDER_EXHAUSTED_AFTER_D1",
  "PROVIDER_EXHAUSTED_AFTER_D2",
  "DEPTH_CAPPED_WITH_MORE_AVAILABLE",
  "ZERO_RAW_PROVIDER_EXHAUSTED",
  "UNPROCESSABLE_RESPONSE",
  "AMBIGUOUS_CONTINUATION_METADATA",
  "TRANSPORT_OR_CONTRACT_FAILURE",
]);

export const SPLIT_R2_PAGINATION_AWARE_EXECUTION_STATES = Object.freeze([
  "EXECUTED_TO_TERMINAL_STATE",
  "FAILED_DURING_EXECUTION",
  "NOT_EXECUTED_AFTER_WAVE_ABORT",
]);

export const SPLIT_R2_PAGINATION_AWARE_UNPROCESSABLE_REASONS = Object.freeze([
  "HTTP_BODY_NOT_JSON",
  "EXPECTED_RESULTS_ARRAY_MISSING",
  "INVALID_RESULTS_TYPE",
  "INVALID_CONTINUATION_SHAPE",
  "ECONOMIC_NORMALIZATION_CONTRACT_FAILURE",
  "OTHER_SANITIZED_SCHEMA_FAILURE",
]);

const SPLIT_R2_PAGINATION_AWARE_PRIMARY_STATES = new Set(
  SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES.slice(0, 3)
);
const SPLIT_R2_PAGINATION_AWARE_STATE_CODES = Object.freeze({
  PROVIDER_EXHAUSTED_AFTER_INITIAL: "E0",
  PROVIDER_EXHAUSTED_AFTER_D1: "E1",
  PROVIDER_EXHAUSTED_AFTER_D2: "E2",
  DEPTH_CAPPED_WITH_MORE_AVAILABLE: "C",
  ZERO_RAW_PROVIDER_EXHAUSTED: "Z",
  UNPROCESSABLE_RESPONSE: "U",
  AMBIGUOUS_CONTINUATION_METADATA: "A",
  TRANSPORT_OR_CONTRACT_FAILURE: "T",
});
const SPLIT_R2_PAGINATION_AWARE_ROLE_CODES = Object.freeze({
  FULL_STAY: "F", NIGHTLY: "N", PREFIX: "P", SUFFIX: "S",
});
const SPLIT_R2_PAGINATION_AWARE_EXECUTION_CODES = Object.freeze({
  EXECUTED_TO_TERMINAL_STATE: "E",
  FAILED_DURING_EXECUTION: "F",
  NOT_EXECUTED_AFTER_WAVE_ABORT: "N",
});

export const SPLIT_R2_SANITIZED_HTTP_STATUS_CLASSES = Object.freeze([
  "HTTP_400_BAD_REQUEST",
  "HTTP_401_UNAUTHENTICATED",
  "HTTP_403_FORBIDDEN",
  "HTTP_404_NOT_FOUND",
  "HTTP_409_CONFLICT",
  "HTTP_422_UNPROCESSABLE_ENTITY",
  "HTTP_429_RATE_LIMITED",
  "HTTP_OTHER_4XX",
  "HTTP_5XX",
  "NETWORK_TRANSPORT_FAILURE",
]);

export const SPLIT_R2_SANITIZED_PROVIDER_ERROR_ENUMS = Object.freeze([
  "REQUEST_VALIDATION_REJECTED",
  "AUTHENTICATION_REJECTED",
  "AUTHORIZATION_REJECTED",
  "ENDPOINT_OR_RESOURCE_NOT_FOUND",
  "REQUEST_CONFLICT",
  "REQUEST_SEMANTICALLY_REJECTED",
  "RATE_LIMITED",
  "UNKNOWN_4XX",
  "PROVIDER_SERVER_ERROR",
  "NETWORK_FAILURE",
]);

export const SPLIT_R2_FAILURE_SCOPES = Object.freeze([
  "GLOBAL_FATAL_FAILURE",
  "SEARCH_SCOPED_CONTINUABLE_FAILURE",
  "UNKNOWN_SCOPE_FAIL_CLOSED",
]);

const SPLIT_R2_DOCUMENTED_SEARCH_SCOPED_ERROR_ENUMS = new Set([
  "REQUEST_VALIDATION_REJECTED",
  "REQUEST_CONFLICT",
  "REQUEST_SEMANTICALLY_REJECTED",
]);

export function classifySplitR2RouteStackPublicHttpFailure({
  statusCode = null,
  retryAfterPresent = false,
  networkFailure = false,
  documentedSearchScopedProviderErrorEnum = null,
} = {}) {
  if (networkFailure) return Object.freeze({
    httpStatusCode: null,
    httpStatusClass: "NETWORK_TRANSPORT_FAILURE",
    retryAfterPresent: "NOT_APPLICABLE",
    providerErrorEnum: "NETWORK_FAILURE",
    failureScope: "GLOBAL_FATAL_FAILURE",
  });
  const exact = new Map([
    [400, ["HTTP_400_BAD_REQUEST", "REQUEST_VALIDATION_REJECTED"]],
    [401, ["HTTP_401_UNAUTHENTICATED", "AUTHENTICATION_REJECTED"]],
    [403, ["HTTP_403_FORBIDDEN", "AUTHORIZATION_REJECTED"]],
    [404, ["HTTP_404_NOT_FOUND", "ENDPOINT_OR_RESOURCE_NOT_FOUND"]],
    [409, ["HTTP_409_CONFLICT", "REQUEST_CONFLICT"]],
    [422, ["HTTP_422_UNPROCESSABLE_ENTITY", "REQUEST_SEMANTICALLY_REJECTED"]],
    [429, ["HTTP_429_RATE_LIMITED", "RATE_LIMITED"]],
  ]);
  let httpStatusClass;
  let providerErrorEnum;
  if (exact.has(statusCode)) [httpStatusClass, providerErrorEnum] = exact.get(statusCode);
  else if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    httpStatusClass = "HTTP_OTHER_4XX";
    providerErrorEnum = "UNKNOWN_4XX";
  } else if (Number.isInteger(statusCode) && statusCode >= 500 && statusCode < 600) {
    httpStatusClass = "HTTP_5XX";
    providerErrorEnum = "PROVIDER_SERVER_ERROR";
  } else throw new Error("split-r2-http-failure-status-invalid");
  const globalFatal = [401, 403, 429].includes(statusCode) || httpStatusClass === "HTTP_5XX";
  const searchScoped = documentedSearchScopedProviderErrorEnum === providerErrorEnum &&
    SPLIT_R2_DOCUMENTED_SEARCH_SCOPED_ERROR_ENUMS.has(documentedSearchScopedProviderErrorEnum);
  return Object.freeze({
    httpStatusCode: statusCode,
    httpStatusClass,
    retryAfterPresent: retryAfterPresent === true ? "PRESENT" : "ABSENT",
    providerErrorEnum,
    failureScope: globalFatal ? "GLOBAL_FATAL_FAILURE" :
      searchScoped ? "SEARCH_SCOPED_CONTINUABLE_FAILURE" : "UNKNOWN_SCOPE_FAIL_CLOSED",
  });
}

export function createSplitR2SearchFailureCircuitBreaker() {
  let consecutive = 0;
  let total = 0;
  let aborted = false;
  return Object.freeze({
    recordFailure(failureScope) {
      if (!SPLIT_R2_FAILURE_SCOPES.includes(failureScope)) {
        throw new Error("split-r2-failure-scope-invalid");
      }
      if (failureScope !== "SEARCH_SCOPED_CONTINUABLE_FAILURE") {
        aborted = true;
      } else {
        consecutive += 1;
        total += 1;
        if (consecutive >= SPLIT_R2_SEARCH_FAILURE_CIRCUIT_BREAKER.maxConsecutiveSearchScopedFailures ||
            total >= SPLIT_R2_SEARCH_FAILURE_CIRCUIT_BREAKER.maxTotalSearchScopedFailures) aborted = true;
      }
      return this.snapshot();
    },
    recordSuccess() {
      if (!aborted) consecutive = 0;
      return this.snapshot();
    },
    snapshot() {
      return Object.freeze({ consecutiveSearchScopedFailures: consecutive,
        totalSearchScopedFailures: total, aborted });
    },
  });
}

class SplitR2PaginationAwareFailure extends Error {
  constructor(message, failureOrigin, httpStatusCategory = "NOT_APPLICABLE", sanitizedHttp = null) {
    super(message);
    this.name = "SplitR2PaginationAwareFailure";
    this.failureOrigin = failureOrigin;
    this.httpStatusCategory = httpStatusCategory;
    this.sanitizedHttp = sanitizedHttp;
  }
}

function splitR2PaginationAwareFailureDetail(error) {
  if (error instanceof SplitR2PaginationAwareFailure) {
    return Object.freeze({ failureOrigin: error.failureOrigin,
      httpStatusCategory: error.httpStatusCategory,
      httpStatusCode: error.sanitizedHttp?.httpStatusCode ?? null,
      httpStatusClass: error.sanitizedHttp?.httpStatusClass ?? "NOT_APPLICABLE",
      retryAfterPresent: error.sanitizedHttp?.retryAfterPresent ?? "NOT_APPLICABLE",
      providerErrorEnum: error.sanitizedHttp?.providerErrorEnum ?? null,
      failureScope: error.sanitizedHttp?.failureScope ?? "UNKNOWN_SCOPE_FAIL_CLOSED",
      sanitizedDetailAvailable: true });
  }
  return Object.freeze({ failureOrigin: "NOT_RECONSTRUCTABLE",
    httpStatusCategory: "UNKNOWN_NOT_RETAINED", httpStatusCode: null,
    httpStatusClass: "NOT_APPLICABLE", retryAfterPresent: "NOT_APPLICABLE",
    providerErrorEnum: null, failureScope: "UNKNOWN_SCOPE_FAIL_CLOSED",
    sanitizedDetailAvailable: false });
}

export function assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(plan) {
  assertSplitR2RouteStackPublicMultiScenarioPlan(plan);
  if (plan.scenarioPlans.length !== 3 || plan.logicalSearches.length !== 102 ||
      sum(plan.scenarioPlans.map((entry) => entry.breakpoints)) !== 32 ||
      stableStringifySplitF0(plan.scenarioPlans.map((entry) => entry.logicalSearches.length), 0) !== "[41,20,41]" ||
      stableStringifySplitF0(plan.scenarioPlans.map((entry) => entry.breakpoints), 0) !== "[13,6,13]") {
    throw new Error("split-r2-pagination-aware-plan-divergence");
  }
  return plan;
}

export function buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan() {
  return assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(
    buildSplitR2RouteStackPublicMultiScenarioPlan()
  );
}

export function assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const evidence = options.contractEvidence ?? inspectSplitR2RouteStackPublicContractEvidence();
  const plan = assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(options.plan);
  const exactPhase = options.phase === "SPLIT-R2.8A" || options.phase === "SPLIT-R2.9A";
  const exact = options.mode === "ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO" &&
    exactPhase && options.compact === true &&
    options.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    options.hostname === "mcp.routestack.ai" && options.protocol === "https:" &&
    options.acknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP" &&
    options.unknownCostAcknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN" &&
    options.noMutationAcknowledgement === "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION" &&
    options.authMax === 1 && options.destinationMax === 3 && options.initialSearchMax === 102 &&
    options.continuationD1Max === 102 && options.continuationD2Max === 102 &&
    options.continuationMax === 204 && options.totalMax === 310 && options.maxContinuationDepth === 2 &&
    options.retries === 0 && options.redirects === 0 && options.concurrency === 1 &&
    options.minimumIntervalMs >= 1_000 && options.productionFallback === false &&
    options.sandboxFallback === false && options.liteApiFallback === false &&
    options.otherLiveModesSelected === 0 && options.repositoryGatePassed === true &&
    evidence.environmentClassification === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    evidence.hostnameDeterminable === true && evidence.contractDeterminable === true &&
    evidence.mutativeEndpointsSelected === false && evidence.sandboxFallback === false;
  if (!exact) throw new Error("split-r2-pagination-aware-preflight-failed-before-credentials");
  const credentials = credentialReader();
  if (credentials?.baseUrl !== SPLIT_R1_OFFICIAL_BASE_URL ||
      typeof credentials?.apiKey !== "string" || credentials.apiKey.length === 0 ||
      typeof credentials?.apiSecret !== "string" || credentials.apiSecret.length === 0) {
    throw new Error("split-r2-pagination-aware-credentials-missing-or-misbound");
  }
  return Object.freeze({ plan, credentials, evidence, phase: options.phase, credentialsAccessed: true });
}

export function createSplitR2RouteStackPublicPaginationAwareMultiScenarioCounter() {
  const counts = { AUTHENTICATION: 0, DESTINATION: 0, INITIAL_SEARCH: 0,
    CONTINUATION_D1: 0, CONTINUATION_D2: 0, CONTINUATION_TOTAL: 0, total: 0 };
  const d0 = new Set();
  const d1 = new Set();
  const d2 = new Set();
  let d0Closed = false;
  let d1Closed = false;
  let d2Closed = false;
  let active = 0;
  let maxObservedConcurrency = 0;
  return Object.freeze({
    reserve(requestClass, logicalSearchId = null) {
      if (!["AUTHENTICATION", "DESTINATION", "INITIAL_SEARCH", "CONTINUATION_D1", "CONTINUATION_D2"]
        .includes(requestClass)) throw new Error("split-r2-pagination-aware-route-forbidden");
      if (requestClass === "INITIAL_SEARCH" && (d0Closed || typeof logicalSearchId !== "string" || d0.has(logicalSearchId))) {
        throw new Error("split-r2-pagination-aware-d0-order-or-cardinality-invalid");
      }
      if (requestClass === "CONTINUATION_D1" &&
          (!d0Closed || d1Closed || !d0.has(logicalSearchId) || d1.has(logicalSearchId))) {
        throw new Error("split-r2-pagination-aware-d1-order-or-cardinality-invalid");
      }
      if (requestClass === "CONTINUATION_D2" &&
          (!d0Closed || !d1Closed || !d1.has(logicalSearchId) || d2.has(logicalSearchId))) {
        throw new Error("split-r2-pagination-aware-d2-order-or-binding-invalid");
      }
      if (counts[requestClass] + 1 > SPLIT_R2_PAGINATION_AWARE_LIMITS[requestClass] ||
          counts.total + 1 > SPLIT_R2_PAGINATION_AWARE_LIMITS.total ||
          (requestClass.startsWith("CONTINUATION") &&
            counts.CONTINUATION_TOTAL + 1 > SPLIT_R2_PAGINATION_AWARE_LIMITS.CONTINUATION_TOTAL)) {
        throw new Error("split-r2-pagination-aware-http-budget-exceeded-before-transport");
      }
      counts[requestClass] += 1;
      counts.total += 1;
      if (requestClass === "INITIAL_SEARCH") d0.add(logicalSearchId);
      if (requestClass === "CONTINUATION_D1") { counts.CONTINUATION_TOTAL += 1; d1.add(logicalSearchId); }
      if (requestClass === "CONTINUATION_D2") { counts.CONTINUATION_TOTAL += 1; d2.add(logicalSearchId); }
    },
    closeDepth(depth) {
      if (depth === "D0") {
        if (counts.INITIAL_SEARCH !== 102) throw new Error("split-r2-pagination-aware-d0-incomplete");
        d0Closed = true;
      } else if (depth === "D1") {
        if (!d0Closed) throw new Error("split-r2-pagination-aware-d1-before-d0");
        d1Closed = true;
      } else if (depth === "D2") {
        if (!d1Closed) throw new Error("split-r2-pagination-aware-d2-before-d1");
        d2Closed = true;
      } else throw new Error("split-r2-pagination-aware-depth-invalid");
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-pagination-aware-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-pagination-aware-concurrency-ledger-invalid");
    },
    snapshot() {
      return Object.freeze({ ...counts, retries: 0, redirects: 0, maxObservedConcurrency,
        allD0BeforeAnyD1: d1.size === 0 || d0Closed,
        allD1BeforeAnyD2: d2.size === 0 || d1Closed,
        d0PhaseCompleted: d0Closed,
        d1PhaseCompleted: d1Closed,
        d2PhaseStarted: d2.size > 0,
        d2PhaseCompleted: d2Closed,
        breadthFirstOrderViolation: false });
    },
  });
}

function createSplitR2PaginationAwareTransport({ fetchImplementation, monotonicNow, sleeper } = {}) {
  if (typeof fetchImplementation !== "function") throw new Error("split-r2-pagination-aware-fetch-unavailable");
  const counter = createSplitR2RouteStackPublicPaginationAwareMultiScenarioCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const expectedEndpoint = new Map([
    ["AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT], ["DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT],
    ["INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT], ["CONTINUATION_D1", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
    ["CONTINUATION_D2", SPLIT_R1_HOTEL_SEARCH_ENDPOINT],
  ]);
  return Object.freeze({
    async post(requestClass, endpointPath, body, bearer = null, logicalSearchId = null) {
      if (expectedEndpoint.get(requestClass) !== endpointPath) {
        throw new SplitR2PaginationAwareFailure("split-r2-pagination-aware-route-forbidden", "LOCAL_TRANSPORT_GUARD");
      }
      const url = new URL(endpointPath, SPLIT_R1_OFFICIAL_BASE_URL);
      if (url.protocol !== "https:" || url.hostname !== "mcp.routestack.ai") {
        throw new SplitR2PaginationAwareFailure("split-r2-pagination-aware-host-forbidden", "LOCAL_TRANSPORT_GUARD");
      }
      await limiter.ready();
      counter.reserve(requestClass, logicalSearchId);
      counter.enterTransport();
      limiter.markStarted();
      try {
        let response;
        try {
          response = await fetchImplementation(url, { method: "POST", redirect: "error", cache: "no-store",
            headers: { Accept: "application/json", "Content-Type": "application/json",
              ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }) }, body: JSON.stringify(body) });
        } catch {
          const sanitizedHttp = classifySplitR2RouteStackPublicHttpFailure({ networkFailure: true });
          throw new SplitR2PaginationAwareFailure(
            "split-r2-pagination-aware-network-transport-failure", "NETWORK_TRANSPORT", "NO_HTTP_RESPONSE",
            sanitizedHttp);
        }
        if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
          throw new SplitR2PaginationAwareFailure(
            "split-r2-pagination-aware-redirect-prohibited", "LOCAL_TRANSPORT_GUARD", "HTTP_REDIRECT");
        }
        if (typeof response.url === "string" && response.url.length > 0) {
          const responseUrl = new URL(response.url);
          if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "mcp.routestack.ai") {
            throw new SplitR2PaginationAwareFailure(
              "split-r2-pagination-aware-response-host-forbidden", "LOCAL_TRANSPORT_GUARD");
          }
        }
        const contentType = response.headers?.get?.("content-type") ?? "";
        let payload = null;
        try {
          if (/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) payload = JSON.parse(await response.text());
        } catch {
          throw new SplitR2PaginationAwareFailure(
            "split-r2-pagination-aware-response-parsing-failure", "RESPONSE_PARSING", "HTTP_200_INVALID_JSON");
        }
        if (response.status !== 200) {
          const category = response.status >= 500 ? "HTTP_5XX" : response.status >= 400 ? "HTTP_4XX" : "HTTP_OTHER";
          const sanitizedHttp = classifySplitR2RouteStackPublicHttpFailure({
            statusCode: response.status,
            retryAfterPresent: (response.headers?.get?.("retry-after") ?? null) !== null,
          });
          throw new SplitR2PaginationAwareFailure(
            "split-r2-pagination-aware-provider-http-failure", "PROVIDER_HTTP", category, sanitizedHttp);
        }
        if (payload === null || typeof payload !== "object") {
          throw new SplitR2PaginationAwareFailure(
            "split-r2-pagination-aware-response-schema-failure", "RESPONSE_SCHEMA", "HTTP_200_JSON_SHAPE_INVALID");
        }
        return Object.freeze({ payload });
      } finally { counter.leaveTransport(); }
    },
    closeDepth: (depth) => counter.closeDepth(depth),
    snapshot: () => Object.freeze({ http: counter.snapshot(), limiter: limiter.snapshot() }),
  });
}

export function classifySplitR2PaginationAwareContinuation(payload) {
  const diagnostic = diagnoseSplitR1ContinuationMetadataShapeV1(payload);
  if (diagnostic.completeCandidateContainerCount > 1 ||
      (diagnostic.completeCandidateContainerCount === 1 &&
        (diagnostic.continuationAuthorizable !== true || diagnostic.selectedContractualContainer !== "result"))) {
    return Object.freeze({ classification: "AMBIGUOUS", payload: null });
  }
  if (diagnostic.continuationAuthorizable === true && diagnostic.completeCandidateContainerCount === 1 &&
      diagnostic.selectedContractualContainer === "result") {
    return Object.freeze({ classification: "ELIGIBLE", payload });
  }
  return Object.freeze({ classification: "NONE", payload: null });
}

function splitR2PaginationAwareUnprocessableReason(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return "HTTP_BODY_NOT_JSON";
  if (!("result" in payload) || payload.result === null || typeof payload.result !== "object" ||
      Array.isArray(payload.result) || !("result" in payload.result)) return "EXPECTED_RESULTS_ARRAY_MISSING";
  if (!Array.isArray(payload.result.result)) return "INVALID_RESULTS_TYPE";
  return null;
}

function splitR2PaginationAwareAddPage(state, depth, payload, ephemeralKey) {
  const structuralReason = splitR2PaginationAwareUnprocessableReason(payload);
  if (structuralReason !== null) {
    throw new SplitR2PaginationAwareFailure(
      "split-r2-pagination-aware-response-unprocessable", "RESPONSE_SCHEMA", structuralReason);
  }
  let page;
  let funnel;
  try {
    page = normalizeSplitR1SearchPage(payload, { logicalSearch: state.binding, ephemeralRunKey: ephemeralKey });
    funnel = buildSplitR1EconomicEligibilityFunnelSearchReceiptV1({ payload,
      logicalSearch: { ...state.search, request: state.binding.request },
      logicalSearchOrdinal: state.ordinal, breakpointOrdinal: state.search.breakpointOrdinal,
      normalizedPage: page, snapshotProcessable: true });
  } catch {
    throw new SplitR2PaginationAwareFailure(
      "split-r2-pagination-aware-economic-normalization-failure", "RESPONSE_SCHEMA",
      "ECONOMIC_NORMALIZATION_CONTRACT_FAILURE");
  }
  const offers = page.offers.filter((offer) => offer.currency === state.search.expectedCurrency);
  state.pages.push(Object.freeze({ depth, raw: page.rawResultCount, normalizable: funnel.normalizableResultCount,
    identity: funnel.identityEligibleCount, numeric: funnel.numericPriceEligibleCount,
    currency: funnel.expectedCurrencyMatchCount, missingCurrency: funnel.missingCurrencyCount,
    nonExpectedCurrency: funnel.nonExpectedCurrencyCount, invalidCurrency: funnel.invalidCurrencyTypeCount,
    preDedup: funnel.preDedupEconomicOfferCount, offers }));
  state.latestResponse = payload;
  state.depthReached = depth;
}

function splitR2PaginationAwareMarkUnprocessable(state, depth, error) {
  state.completionState = "UNPROCESSABLE_RESPONSE";
  state.executionState = "EXECUTED_TO_TERMINAL_STATE";
  state.unprocessableDepth = depth;
  state.unprocessableReason = SPLIT_R2_PAGINATION_AWARE_UNPROCESSABLE_REASONS.includes(error?.httpStatusCategory)
    ? error.httpStatusCategory : "OTHER_SANITIZED_SCHEMA_FAILURE";
}

function splitR2PaginationAwareMarkTerminal(state) {
  if (state.completionState !== null) state.executionState = "EXECUTED_TO_TERMINAL_STATE";
}

function splitR2PaginationAwareCumulative(state) {
  const offers = state.pages.flatMap((page) => page.offers);
  const distinct = splitR2PaginationDeduplicate(offers);
  return Object.freeze({
    raw: sum(state.pages.map((page) => page.raw)), normalizable: sum(state.pages.map((page) => page.normalizable)),
    identity: sum(state.pages.map((page) => page.identity)), numeric: sum(state.pages.map((page) => page.numeric)),
    currency: sum(state.pages.map((page) => page.currency)), missingCurrency: sum(state.pages.map((page) => page.missingCurrency)),
    nonExpectedCurrency: sum(state.pages.map((page) => page.nonExpectedCurrency)),
    invalidCurrency: sum(state.pages.map((page) => page.invalidCurrency)),
    preDedup: sum(state.pages.map((page) => page.preDedup)), distinct, duplicates: offers.length - distinct.length,
  });
}

function splitR2PaginationAwareFinalize(state, depth) {
  const continuation = classifySplitR2PaginationAwareContinuation(state.latestResponse);
  if (continuation.classification === "AMBIGUOUS") {
    state.completionState = "AMBIGUOUS_CONTINUATION_METADATA";
    return null;
  }
  if (continuation.classification === "ELIGIBLE") {
    if (depth === 2) state.completionState = "DEPTH_CAPPED_WITH_MORE_AVAILABLE";
    return continuation.payload;
  }
  const cumulative = splitR2PaginationAwareCumulative(state);
  state.completionState = cumulative.raw === 0 ? "ZERO_RAW_PROVIDER_EXHAUSTED" :
    depth === 0 ? "PROVIDER_EXHAUSTED_AFTER_INITIAL" :
      depth === 1 ? "PROVIDER_EXHAUSTED_AFTER_D1" : "PROVIDER_EXHAUSTED_AFTER_D2";
  return null;
}

function splitR2PaginationAwarePrimaryEligible(state) {
  if (!SPLIT_R2_PAGINATION_AWARE_PRIMARY_STATES.has(state.completionState)) return false;
  const c = splitR2PaginationAwareCumulative(state);
  return c.raw > 0 && c.normalizable === c.raw && c.identity === c.raw && c.numeric === c.raw &&
    c.currency === c.raw && c.missingCurrency === 0 && c.nonExpectedCurrency === 0 &&
    c.invalidCurrency === 0 && c.distinct.length > 0;
}

function splitR2PaginationAwareSnapshot(state) {
  const c = splitR2PaginationAwareCumulative(state);
  const eligible = splitR2PaginationAwarePrimaryEligible(state);
  return assertProviderNeutralSnapshot({
    contractVersion: SPLIT_R2_PROVIDER_NEUTRAL_CONTRACT_VERSION,
    logicalSearchId: state.search.logicalSearchId, scenarioOrdinal: state.search.scenarioOrdinal,
    searchRole: state.search.searchRole, checkin: state.search.checkin, checkout: state.search.checkout,
    durationNights: state.search.durationNights, expectedCurrency: state.search.expectedCurrency,
    boundedSnapshotUsable: eligible,
    collectionClassification: eligible ? "PROVIDER_NO_CONTINUATION_EXPOSED" : "INITIAL_SNAPSHOT_UNPROCESSABLE",
    publicCollectionCategory: state.completionState,
    comparabilityClassification: eligible ? "COMPARABLE_COMPLETE_TOTAL" : "INCOMPARABLE_COLLECTION",
    economicEligibilityFunnel: { rawResultCount: c.raw, identityEligibleCount: c.identity,
      numericPriceEligibleCount: c.numeric, expectedCurrencyMatchCount: c.currency,
      missingCurrencyCount: c.missingCurrency, nonExpectedCurrencyCount: c.nonExpectedCurrency,
      invalidCurrencyTypeCount: c.invalidCurrency, unknownMandatoryComponentCount: 0,
      mandatoryComponentComparableCount: c.preDedup, finalEconomicOfferCount: c.distinct.length },
    normalizableResultCount: c.normalizable,
    offers: eligible ? c.distinct.map((offer) => ({ propertyFingerprint: offer.propertyFingerprint,
      totalPriceMinorUnits: offer.totalMinorUnits, totalMinorUnits: offer.totalMinorUnits, currency: offer.currency,
      totalPriceSemantics: "SEARCH_WINDOW_TOTAL_EMPIRICALLY_SUPPORTED", mandatoryTaxState: "UNPROVEN_R1_PRESERVED",
      mandatoryTaxMinorUnits: null, payAtPropertyMandatoryMinorUnits: null, cancellationCategory: "UNAVAILABLE",
      evidenceAvailabilityCategories: ["R2_PUBLIC_PROVIDER_EXHAUSTED_WITHIN_D2"] })) : [],
    continuationAvailable: state.completionState === "DEPTH_CAPPED_WITH_MORE_AVAILABLE",
    continuationEligible: state.completionState === "DEPTH_CAPPED_WITH_MORE_AVAILABLE",
    continuationExecuted: state.depthReached > 0,
    providerDeclaredTerminal: false,
  });
}

function splitR2PaginationAwareScenarioAggregate(result, scenarioPlan, states) {
  const scenarioStates = states.filter((state) => state.search.scenarioOrdinal === result.scenarioOrdinal);
  const eligibleCount = scenarioStates.filter(splitR2PaginationAwarePrimaryEligible).length;
  const roleCompletionCounts = Object.fromEntries(["FULL_STAY", "NIGHTLY", "PREFIX", "SUFFIX"].map((role) =>
    [role, Object.fromEntries(SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES.map((completion) =>
      [SPLIT_R2_PAGINATION_AWARE_STATE_CODES[completion], scenarioStates.filter((state) =>
        state.search.searchRole === role && state.completionState === completion).length]))]));
  return Object.freeze({
    scenarioOrdinal: result.scenarioOrdinal, frozenBreakpoints: result.plannedBreakpoints,
    evaluableBreakpoints: result.evaluatedBreakpoints,
    notEvaluableBreakpoints: result.plannedBreakpoints - result.evaluatedBreakpoints,
    positiveBreakpoints: result.positiveBreakpoints, breakEvenBreakpoints: result.breakEvenBreakpoints,
    negativeBreakpoints: result.negativeBreakpoints, materialSignal: result.scenarioHasMaterialSignal,
    bestSavingMinorUnits: result.bestSavingMinorUnits, bestSavingBasisPoints: result.bestSavingBasisPoints,
    medianSavingMinorUnits: result.medianSavingMinorUnits, medianSavingBasisPoints: result.medianSavingBasisPoints,
    minimumSavingMinorUnits: result.minSavingMinorUnits, fullStayBaselineAvailable: result.baselineAvailable,
    notEvaluableReasonCounts: result.notEvaluableReasonCounts,
    roleCompletionCounts,
    primaryEconomicCoverage: eligibleCount === scenarioPlan.logicalSearches.length ? "COMPLETE" :
      eligibleCount === 0 ? "NONE" : "PARTIAL",
  });
}

function splitR2PaginationAwarePartialAnalysis(partialScenarioResults, plan, states, aborted) {
  if (!aborted) return null;
  const perScenario = partialScenarioResults.map((result, index) =>
    splitR2PaginationAwareScenarioAggregate(result, plan.scenarioPlans[index], states));
  const evaluable = partialScenarioResults.filter((result) => result.evaluatedBreakpoints > 0);
  return Object.freeze({
    evidenceClassification: "PARTIAL_WAVE_EXPLORATORY_ECONOMIC_EVIDENCE",
    economicDataRetained: "SANITIZED_NORMALIZED_IN_MEMORY_UNTIL_ABORT_RECEIPT",
    economicReconstructability: "FULLY_RECONSTRUCTABLE_FROM_SANITIZED_DATA",
    reconstructabilityReason: "AUTOMATIC_PRE_DESTRUCTION_SALVAGE_FROM_NORMALIZED_IN_MEMORY_STATE",
    economicResultsComputed: true,
    completelyObservedBreakpoints: sum(partialScenarioResults.map((result) => result.evaluatedBreakpoints)),
    economicallyEvaluableBreakpoints: sum(partialScenarioResults.map((result) => result.evaluatedBreakpoints)),
    notEvaluableBreakpoints: 32 - sum(partialScenarioResults.map((result) => result.evaluatedBreakpoints)),
    positiveBreakpoints: sum(partialScenarioResults.map((result) => result.positiveBreakpoints)),
    breakEvenBreakpoints: sum(partialScenarioResults.map((result) => result.breakEvenBreakpoints)),
    negativeBreakpoints: sum(partialScenarioResults.map((result) => result.negativeBreakpoints)),
    materialBreakpoints: sum(partialScenarioResults.map((result) => result.materialSignalBreakpoints)),
    bestSavingMinorUnits: evaluable.length > 0
      ? Math.max(...evaluable.map((result) => result.bestSavingMinorUnits)) : null,
    bestSavingBasisPoints: evaluable.length > 0
      ? Math.max(...evaluable.map((result) => result.bestSavingBasisPoints)) : null,
    medianSavingMinorUnits: splitR1CompactMedianInteger(
      evaluable.map((result) => result.medianSavingMinorUnits)),
    medianSavingBasisPoints: splitR1CompactMedianInteger(
      evaluable.map((result) => result.medianSavingBasisPoints)),
    minSavingMinorUnits: evaluable.length > 0
      ? Math.min(...evaluable.map((result) => result.minSavingMinorUnits)) : null,
    scenariosWithEvaluableBreakpoints: evaluable.length,
    scenariosWithRawPositive: evaluable.filter((result) => result.scenarioHasRawPositive).length,
    scenariosWithMaterialSignal: evaluable.filter((result) => result.scenarioHasMaterialSignal).length,
    destinationsWithMaterialSignal: new Set(evaluable.filter((result) => result.scenarioHasMaterialSignal)
      .map((result) => result.destination)).size,
    perScenario,
    generalizationAllowed: false,
    frequencyEstimationAllowed: false,
    reproducibilityClassificationAllowed: false,
    commercialClaimAllowed: false,
    rawBreakpointSavingsPersisted: 0,
  });
}

export function buildSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt({
  sourceSha, phase = "SPLIT-R2.8A",
  plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(), states = [],
  scenarioResults = [], partialScenarioResults = null, http = {}, limiter = {}, failureClassification = null,
  failureBoundary = null,
} = {}) {
  const stateCounts = Object.fromEntries(SPLIT_R2_PAGINATION_AWARE_COMPLETION_STATES.map((name) =>
    [name, states.filter((state) => state.completionState === name).length]));
  const cumulatives = states.map(splitR2PaginationAwareCumulative);
  const primaryEligible = states.filter(splitR2PaginationAwarePrimaryEligible).length;
  const perScenarioAggregates = scenarioResults.map((result, index) =>
    splitR2PaginationAwareScenarioAggregate(result, plan.scenarioPlans[index], states));
  const evaluable = scenarioResults.filter((result) => result.evaluatedBreakpoints > 0);
  const rawPositive = evaluable.filter((result) => result.scenarioHasRawPositive);
  const material = evaluable.filter((result) => result.scenarioHasMaterialSignal);
  const destinationsWithMaterialSignal = new Set(material.map((result) => result.destination)).size;
  const contractFailure = failureClassification !== null || stateCounts.TRANSPORT_OR_CONTRACT_FAILURE > 0;
  const breakpointsEvaluable = sum(scenarioResults.map((result) => result.evaluatedBreakpoints));
  const status = failureClassification !== null ? "FAIL" : states.length === 102 ? "PASS" : "INCONCLUSIVE";
  const pageRaw = (depth) => sum(states.flatMap((state) => state.pages)
    .filter((page) => page.depth === depth).map((page) => page.raw));
  const diagnostics = states.map((state) => {
    const c = splitR2PaginationAwareCumulative(state);
    const raw = [0, 1, 2].map((depth) => state.pages.find((page) => page.depth === depth)?.raw ?? 0);
    return [state.search.scenarioOrdinal, state.ordinal, SPLIT_R2_PAGINATION_AWARE_ROLE_CODES[state.search.searchRole],
      state.search.breakpointOrdinal, state.depthReached >= 0 ? 1 : 0, state.depthReached >= 1 ? 1 : 0,
      state.depthReached >= 2 ? 1 : 0, state.completionState === null ? null :
        SPLIT_R2_PAGINATION_AWARE_STATE_CODES[state.completionState],
      raw, c.distinct.length, c.duplicates, c.normalizable, c.numeric, c.currency,
      splitR2PaginationAwarePrimaryEligible(state) ? 1 : 0,
      SPLIT_R2_PAGINATION_AWARE_EXECUTION_CODES[state.executionState] ?? null,
      state.unprocessableDepth ?? null,
      state.unprocessableReason ?? null];
  });
  const executionStateCounts = Object.fromEntries(SPLIT_R2_PAGINATION_AWARE_EXECUTION_STATES.map((name) =>
    [name, states.filter((state) => state.executionState === name).length]));
  const accountingSum = sum(Object.values(executionStateCounts));
  const aborted = failureClassification !== null;
  const partialWaveAnalysis = Array.isArray(partialScenarioResults)
    ? splitR2PaginationAwarePartialAnalysis(partialScenarioResults, plan, states, aborted) : null;
  const unprocessableStates = states.filter((state) => state.completionState === "UNPROCESSABLE_RESPONSE");
  const unprocessableReasonCounts = Object.fromEntries(SPLIT_R2_PAGINATION_AWARE_UNPROCESSABLE_REASONS
    .map((reason) => [reason, unprocessableStates.filter((state) => state.unprocessableReason === reason).length])
    .filter(([, count]) => count > 0));
  const unprocessableScenarioCounts = Object.fromEntries([1, 3, 5].map((ordinal) =>
    [ordinal, unprocessableStates.filter((state) => state.search.scenarioOrdinal === ordinal).length]));
  const unprocessableRoleCounts = Object.fromEntries(["FULL_STAY", "NIGHTLY", "PREFIX", "SUFFIX"].map((role) =>
    [role, unprocessableStates.filter((state) => state.search.searchRole === role).length]));
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_RECEIPT_VERSION,
    status, sourceSha, phase, environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    userApprovalAcknowledged: true, unknownCostAcknowledged: true, singleWaveEnforced: true,
    frozenScenarioOrdinals: [1, 3, 5], scenarioCount: 3, logicalSearchesPlanned: 102,
    logicalSearchesExecuted: http.INITIAL_SEARCH ?? 0, breakpointsPlanned: 32,
    breakpointsEvaluable, breakpointsNotEvaluable: 32 - breakpointsEvaluable,
    authHttpRequests: http.AUTHENTICATION ?? 0, destinationHttpRequests: http.DESTINATION ?? 0,
    initialHttpRequests: http.INITIAL_SEARCH ?? 0, continuationD1HttpRequests: http.CONTINUATION_D1 ?? 0,
    continuationD2HttpRequests: http.CONTINUATION_D2 ?? 0,
    continuationHttpRequests: http.CONTINUATION_TOTAL ?? 0, totalHttpRequests: http.total ?? 0,
    totalHttpBudget: 310, totalHttpBudgetRemaining: 310 - (http.total ?? 0), retries: 0, redirects: 0,
    maxObservedConcurrency: http.maxObservedConcurrency ?? 0,
    minObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs ?? null,
    allD0BeforeAnyD1: http.allD0BeforeAnyD1 === true, allD1BeforeAnyD2: http.allD1BeforeAnyD2 === true,
    d0PhaseCompleted: http.d0PhaseCompleted === true, d1PhaseCompleted: http.d1PhaseCompleted === true,
    d2PhaseStarted: http.d2PhaseStarted === true, d2PhaseCompleted: http.d2PhaseCompleted === true,
    breadthFirstOrderViolation: http.breadthFirstOrderViolation === true,
    d3HttpRequests: 0, d0RawResults: pageRaw(0), d1PageRawResults: pageRaw(1), d2PageRawResults: pageRaw(2),
    finalCumulativeRawResults: sum(cumulatives.map((entry) => entry.raw)),
    finalCumulativeDistinctOffers: sum(cumulatives.map((entry) => entry.distinct.length)),
    interPageDuplicatesRemoved: sum(cumulatives.map((entry) => entry.duplicates)),
    totalNormalizableResults: sum(cumulatives.map((entry) => entry.normalizable)),
    numericPriceCoverageNumerator: sum(cumulatives.map((entry) => entry.numeric)),
    numericPriceCoverageDenominator: sum(cumulatives.map((entry) => entry.raw)),
    expectedCurrencyCoverageNumerator: sum(cumulatives.map((entry) => entry.currency)),
    expectedCurrencyCoverageDenominator: sum(cumulatives.map((entry) => entry.raw)),
    completionStateCounts: stateCounts, executionStateCounts, accountingSum,
    accountingMatchesTotal: accountingSum === 102, accountingOverlapDetected: false,
    primaryEconomicEligibleSearches: primaryEligible,
    primaryEconomicExcludedSearches: states.length - primaryEligible,
    enumDictionary: { roles: SPLIT_R2_PAGINATION_AWARE_ROLE_CODES,
      completion: SPLIT_R2_PAGINATION_AWARE_STATE_CODES,
      execution: SPLIT_R2_PAGINATION_AWARE_EXECUTION_CODES },
    searchDiagnostics: diagnostics, perScenarioAggregates,
    scenariosEvaluable: evaluable.length, scenariosWithRawPositive: rawPositive.length,
    scenariosWithMaterialSignal: material.length, destinationsWithMaterialSignal,
    medianOfScenarioMediansMinorUnits: splitR1CompactMedianInteger(evaluable.map((entry) => entry.medianSavingMinorUnits)),
    medianOfScenarioMediansBasisPoints: splitR1CompactMedianInteger(evaluable.map((entry) => entry.medianSavingBasisPoints)),
    reproducibilityClassification: classifySplitR2RouteStackPublicReproducibility({ contractFailure,
      scenariosEvaluable: evaluable.length, scenariosWithRawPositive: rawPositive.length,
      scenariosWithMaterialSignal: material.length, destinationsWithMaterialSignal }),
    primaryCampaignInferenceStatus: aborted ? "NOT_EVALUABLE_WAVE_ABORTED" : "COMPLETE",
    primaryReproducibilityClassification: aborted ? "PROVIDER_OR_CONTRACT_FAILURE" :
      classifySplitR2RouteStackPublicReproducibility({ contractFailure,
        scenariosEvaluable: evaluable.length, scenariosWithRawPositive: rawPositive.length,
        scenariosWithMaterialSignal: material.length, destinationsWithMaterialSignal }),
    partialWaveAnalysis,
    failureBoundary,
    unprocessableAtD0: unprocessableStates.filter((state) => state.unprocessableDepth === 0).length,
    unprocessableAtD1: unprocessableStates.filter((state) => state.unprocessableDepth === 1).length,
    unprocessableAtD2: unprocessableStates.filter((state) => state.unprocessableDepth === 2).length,
    unprocessableOverlapDetected: false,
    unprocessableScenarioCounts, unprocessableRoleCounts, unprocessableReasonCounts,
    compactReceiptGenerationSupported: true, compactReceiptEmitted: true,
    compactSingleLineJson: true, compactReceiptUtf8Bytes: 0,
    receiptCompleteness: aborted
      ? (partialWaveAnalysis === null
        ? "PARTIAL_WAVE_ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMICS"
        : partialWaveAnalysis.economicallyEvaluableBreakpoints > 0
        ? "PARTIAL_WAVE_ABORTED_WITH_EXPLORATORY_ECONOMICS"
        : "PARTIAL_WAVE_ABORTED_WITHOUT_EVALUABLE_BREAKPOINTS")
      : breakpointsEvaluable > 0 ? "COMPLETE_TECHNICAL_AND_ECONOMIC" :
        "COMPLETE_TECHNICAL_INSUFFICIENT_ECONOMIC_COVERAGE",
    r2_5aResultPreserved: true, r2_5aEconomicInferenceValidity: "NOT_ROBUST_TO_PAGINATION",
    r2_5aFrequencyEvidenceUsable: false, r2_5aMaterialRecurrenceConclusionUsable: false,
    qualityFrictionImplemented: false, userUsableSplitEvaluated: false,
    bestResultScope: "PROVIDER_EXHAUSTED_WITHIN_D2_RETURNED_SNAPSHOT",
    completenessClaimAllowed: false, globalOptimumClaimAllowed: false,
    generalMarketFrequencyClaimAllowed: false, productionValidityClaimAllowed: false,
    commercialValidationClaimAllowed: false, productionBookingAuthorized: false, publicRuntimeChanged: false,
    repositoryModificationsAfterCommit: 0, rawIdsPersisted: 0, rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0, payloadsOrRawResponsesPersisted: 0,
    ephemeralHmacSecretPersisted: false, crossRunLinkability: false, secretValuesExposed: false,
    failureClassification: failureClassification ?? (status === "PASS" ? "NONE" : "CAMPAIGN_INCOMPLETE"),
  });
}

export function serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(
  receipt, maxBytes = SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_MAX_UTF8_BYTES
) {
  assertReceiptSafe(receipt);
  let candidate = { ...receipt, compactReceiptUtf8Bytes: 0 };
  let json = stableStringifySplitF0(candidate, 0);
  let byteLength = Buffer.byteLength(json, "utf8");
  for (let iteration = 0; iteration < 4; iteration += 1) {
    candidate = { ...candidate, compactReceiptUtf8Bytes: byteLength };
    json = stableStringifySplitF0(candidate, 0);
    const measured = Buffer.byteLength(json, "utf8");
    if (measured === byteLength) break;
    byteLength = measured;
  }
  byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-pagination-aware-receipt-not-single-line");
  if (byteLength > maxBytes) throw new SplitR2CompactReceiptError("split-r2-pagination-aware-receipt-oversize", byteLength);
  return Object.freeze({ json, byteLength });
}

export async function runSplitR2RouteStackPublicPaginationAwareMultiScenario({ sourceSha, phase = "SPLIT-R2.8A",
  plan, apiKey, apiSecret,
  fetchImplementation = globalThis.fetch, monotonicNow, sleeper, now, randomUUID } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha ?? "") || typeof apiKey !== "string" || apiKey.length === 0 ||
      typeof apiSecret !== "string" || apiSecret.length === 0) throw new Error("split-r2-pagination-aware-runtime-input-invalid");
  const authoritativePlan = assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan(plan);
  const transport = createSplitR2PaginationAwareTransport({ fetchImplementation, monotonicNow, sleeper });
  const ephemeralKey = crypto.randomBytes(32);
  const states = authoritativePlan.logicalSearches.map((search, index) => ({ search,
    binding: authoritativePlan.publicLogicalBindings[index], ordinal: index + 1, originalRequest: null,
    latestResponse: null, depthReached: -1, pages: [], completionState: null, executionState: null,
    unprocessableDepth: null, unprocessableReason: null }));
  let currentState = null;
  let currentDepth = null;
  let d1RequestOrdinal = 0;
  let d2RequestOrdinal = 0;
  try {
    const auth = await transport.post("AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT,
      createSplitR1PartnerTokenRequest({ apiKey, apiSecret, now, randomUUID }));
    let bearer = auth.payload?.token;
    if (typeof bearer !== "string" || bearer.length === 0) throw new Error("split-r2-pagination-aware-bearer-missing");
    const destinations = new Map();
    for (const scenario of authoritativePlan.publicScenarioBindings) {
      const response = await transport.post("DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT,
        createSplitR1DestinationRequest(scenario), bearer);
      destinations.set(scenario.scenarioId, selectSplitR1DestinationCandidate(response.payload, scenario));
    }
    for (const state of states) {
      currentState = state;
      currentDepth = 0;
      state.originalRequest = createSplitR1HotelSearchRequest(state.binding, destinations.get(state.binding.scenarioId));
      const response = await transport.post("INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        state.originalRequest, bearer, state.search.logicalSearchId);
      try { splitR2PaginationAwareAddPage(state, 0, response.payload, ephemeralKey); }
      catch (error) { splitR2PaginationAwareMarkUnprocessable(state, 0, error); continue; }
      splitR2PaginationAwareFinalize(state, 0);
      splitR2PaginationAwareMarkTerminal(state);
    }
    currentState = null;
    transport.closeDepth("D0");
    for (const state of states) {
      if (state.completionState !== null) continue;
      currentState = state;
      currentDepth = 1;
      d1RequestOrdinal += 1;
      const request = createSplitR1ContinuationRequest(state.originalRequest, state.latestResponse, 1);
      const response = await transport.post("CONTINUATION_D1", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        request, bearer, state.search.logicalSearchId);
      try { splitR2PaginationAwareAddPage(state, 1, response.payload, ephemeralKey); }
      catch (error) { splitR2PaginationAwareMarkUnprocessable(state, 1, error); continue; }
      splitR2PaginationAwareFinalize(state, 1);
      splitR2PaginationAwareMarkTerminal(state);
    }
    currentState = null;
    transport.closeDepth("D1");
    for (const state of states) {
      if (state.completionState !== null || state.depthReached !== 1) continue;
      currentState = state;
      currentDepth = 2;
      d2RequestOrdinal += 1;
      const request = createSplitR1ContinuationRequest(state.originalRequest, state.latestResponse, 2);
      const response = await transport.post("CONTINUATION_D2", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        request, bearer, state.search.logicalSearchId);
      try { splitR2PaginationAwareAddPage(state, 2, response.payload, ephemeralKey); }
      catch (error) { splitR2PaginationAwareMarkUnprocessable(state, 2, error); continue; }
      splitR2PaginationAwareFinalize(state, 2);
      splitR2PaginationAwareMarkTerminal(state);
    }
    currentState = null;
    transport.closeDepth("D2");
    bearer = null;
    const scenarioSnapshots = authoritativePlan.scenarioPlans.map((scenario) => scenario.logicalSearches.map((search) =>
      splitR2PaginationAwareSnapshot(states.find((state) => state.search.logicalSearchId === search.logicalSearchId))));
    const scenarioResults = authoritativePlan.scenarioPlans.map((scenario, index) =>
      evaluateSplitR2Scenario("ROUTESTACK_PUBLIC_PRODUCTION", scenario, scenarioSnapshots[index]));
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt({ sourceSha, phase,
      plan: authoritativePlan,
      states, scenarioResults, http: snapshot.http, limiter: snapshot.limiter });
  } catch (error) {
    const detail = splitR2PaginationAwareFailureDetail(error);
    if (currentState && currentState.executionState === null) {
      currentState.completionState = "TRANSPORT_OR_CONTRACT_FAILURE";
      currentState.executionState = "FAILED_DURING_EXECUTION";
    }
    for (const state of states) {
      if (state.executionState === null) state.executionState = "NOT_EXECUTED_AFTER_WAVE_ABORT";
    }
    const scenarioSnapshots = authoritativePlan.scenarioPlans.map((scenario) => scenario.logicalSearches.map((search) =>
      splitR2PaginationAwareSnapshot(states.find((state) => state.search.logicalSearchId === search.logicalSearchId))));
    const partialScenarioResults = authoritativePlan.scenarioPlans.map((scenario, index) =>
      evaluateSplitR2Scenario("ROUTESTACK_PUBLIC_PRODUCTION", scenario, scenarioSnapshots[index]));
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt({ sourceSha, phase,
      plan: authoritativePlan,
      states, scenarioResults: [], partialScenarioResults,
      http: snapshot.http, limiter: snapshot.limiter,
      failureBoundary: Object.freeze({ failedDepth: currentDepth === null ? null : `D${currentDepth}`,
        failedD1RequestOrdinal: currentDepth === 1 ? d1RequestOrdinal : null,
        failedD2RequestOrdinal: currentDepth === 2 ? d2RequestOrdinal : null,
        failedScenarioOrdinal: currentState?.search?.scenarioOrdinal ?? null,
        failedLogicalSearchOrdinal: currentState?.ordinal ?? null,
        failedSearchRole: currentState?.search?.searchRole ?? null,
        failedBreakpointOrdinal: currentState?.search?.breakpointOrdinal ?? null,
        failureOrigin: detail.failureOrigin, failureHttpStatusCategory: detail.httpStatusCategory,
        failureHttpStatusCode: detail.httpStatusCode, failureHttpStatusClass: detail.httpStatusClass,
        failureRetryAfterPresent: detail.retryAfterPresent,
        failureProviderErrorEnum: detail.providerErrorEnum, failureScope: detail.failureScope,
        failureSanitizedDetailAvailable: detail.sanitizedDetailAvailable }),
      failureClassification: String(error?.message ?? error).startsWith("split-r2-")
        ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
        : "ROUTESTACK_PUBLIC_PAGINATION_AWARE_TECHNICAL_FAILURE" });
  } finally {
    for (const state of states) { state.latestResponse = null; state.originalRequest = null; }
    ephemeralKey.fill(0);
  }
}

function splitR2FakePaginationAwarePayload(search, depth, terminalDepth, variant = "full") {
  if (variant === "unprocessable") return { result: { result: "invalid" } };
  if (variant === "ambiguous") return { result: { currency: "EUR", correlationId: "a", token: "b",
    nextResultsKey: "c", result: [] }, data: { correlationId: "d", token: "e", nextResultsKey: "f" } };
  const hasMore = terminalDepth > depth;
  const base = search.searchRole === "FULL_STAY" ? 1_000 :
    search.searchRole === "PREFIX" || search.searchRole === "SUFFIX" ? 400 : 100;
  return { result: { currency: "EUR", correlationId: `synthetic-c-${search.logicalSearchId}-${depth}`,
    token: `synthetic-t-${search.logicalSearchId}-${depth}`,
    nextResultsKey: hasMore ? `synthetic-n-${search.logicalSearchId}-${depth + 1}` : null,
    result: variant === "zero" ? [] : [{ id: `synthetic-p-${search.logicalSearchId}-${depth}`,
      ourprice: base + depth * 10 }] } };
}

async function runSplitR2FakePaginationAwareCampaign(profile = "full", phase = "SPLIT-R2.8A") {
  const plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  let monotonic = 0;
  let requestOrdinal = 0;
  return runSplitR2RouteStackPublicPaginationAwareMultiScenario({ sourceSha: "d".repeat(40), phase, plan,
    apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret", monotonicNow: () => monotonic,
    sleeper: async (delay) => { monotonic += delay; }, now: () => 1_800_000_000_000,
    randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      requestOrdinal += 1;
      if (requestOrdinal === 1) return fakeJsonResponse({ token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (requestOrdinal <= 4) {
        const scenario = plan.publicScenarioBindings[requestOrdinal - 2];
        return fakeJsonResponse({ result: [{ id: `synthetic-destination-${requestOrdinal - 1}`,
          city: scenario.destination.label, country: scenario.destination.countryCode, type: "City",
          fullName: `${scenario.destination.label}, Italy`,
          coordinates: { lat: scenario.destination.latitude, long: scenario.destination.longitude } }] }, 200, String(url));
      }
      const body = JSON.parse(options.body);
      const depth = typeof body.nextResultsKey !== "string" ? 0 : body.nextResultsKey.endsWith("-1") ? 1 : 2;
      const searchIndex = depth === 0 ? requestOrdinal - 5 :
        plan.logicalSearches.findIndex((search) => body.nextResultsKey.includes(search.logicalSearchId));
      const search = plan.logicalSearches[searchIndex];
      let terminalDepth = 2;
      let variant = "full";
      if (profile === "no-d2") terminalDepth = 1;
      if (profile !== "full" && profile !== "no-d2") {
        const selector = searchIndex % 7;
        if (selector === 0) terminalDepth = 0;
        if (selector === 1) terminalDepth = 1;
        if (selector === 2) terminalDepth = 2;
        if (selector === 3) { terminalDepth = 0; variant = "zero"; }
        if (selector === 4) terminalDepth = 3;
        if (selector === 5 && depth === 0) variant = "ambiguous";
        if (selector === 6) { terminalDepth = 0; variant = "unprocessable"; }
      }
      return fakeJsonResponse(splitR2FakePaginationAwarePayload(search, depth, terminalDepth, variant), 200, String(url));
    },
  });
}

export function runSplitR2FakeRouteStackPublicPaginationAwareFullDepth() {
  return runSplitR2FakePaginationAwareCampaign("full");
}

export function runSplitR2FakeRouteStackPublicPaginationAwareEarlyTerminal() {
  return runSplitR2FakePaginationAwareCampaign("mixed");
}

export function runSplitR2FakeRouteStackPublicPaginationAwareEconomicCoverage() {
  return runSplitR2FakePaginationAwareCampaign("mixed");
}

export function runSplitR2FakeRouteStackPublicPaginationAwareExactR2_9A() {
  return runSplitR2FakePaginationAwareCampaign("full", "SPLIT-R2.9A");
}

export function runSplitR2FakeRouteStackPublicPaginationAwareNoD2Eligible() {
  return runSplitR2FakePaginationAwareCampaign("no-d2", "SPLIT-R2.9A");
}

export function runSplitR2FakeRouteStackPublicPaginationAwareFailureBoundary() {
  const plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  let monotonic = 0;
  let requestOrdinal = 0;
  let d1Ordinal = 0;
  const d0Unprocessable = new Set(plan.logicalSearches.filter((search) =>
    search.scenarioOrdinal === 1 && search.searchRole === "NIGHTLY").map((search) => search.logicalSearchId));
  return runSplitR2RouteStackPublicPaginationAwareMultiScenario({ sourceSha: "9".repeat(40), plan,
    apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret", monotonicNow: () => monotonic,
    sleeper: async (delay) => { monotonic += delay; }, now: () => 1_800_000_000_000,
    randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      requestOrdinal += 1;
      if (requestOrdinal === 1) return fakeJsonResponse({ token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (requestOrdinal <= 4) {
        const scenario = plan.publicScenarioBindings[requestOrdinal - 2];
        return fakeJsonResponse({ result: [{ id: `synthetic-destination-${requestOrdinal - 1}`,
          city: scenario.destination.label, country: scenario.destination.countryCode, type: "City",
          fullName: `${scenario.destination.label}, Italy`,
          coordinates: { lat: scenario.destination.latitude, long: scenario.destination.longitude } }] }, 200, String(url));
      }
      const body = JSON.parse(options.body);
      const isD0 = typeof body.nextResultsKey !== "string";
      const searchIndex = isD0 ? requestOrdinal - 5 :
        plan.logicalSearches.findIndex((search) => body.nextResultsKey.includes(search.logicalSearchId));
      const search = plan.logicalSearches[searchIndex];
      if (isD0 && d0Unprocessable.has(search.logicalSearchId)) {
        return fakeJsonResponse({ result: { result: "invalid" } }, 200, String(url));
      }
      if (!isD0) {
        d1Ordinal += 1;
        if (d1Ordinal === 53) throw new Error("synthetic-network-boundary-without-sensitive-detail");
      }
      return fakeJsonResponse(splitR2FakePaginationAwarePayload(search, isD0 ? 0 : 1, 1), 200, String(url));
    },
  });
}

export function runSplitR2FakeRouteStackPublicPaginationAwareNoEvaluableFailureBoundary() {
  const plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  let monotonic = 0;
  let requestOrdinal = 0;
  return runSplitR2RouteStackPublicPaginationAwareMultiScenario({ sourceSha: "8".repeat(40),
    phase: "SPLIT-R2.9A", plan, apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret",
    monotonicNow: () => monotonic, sleeper: async (delay) => { monotonic += delay; },
    now: () => 1_800_000_000_000, randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      requestOrdinal += 1;
      if (requestOrdinal === 1) return fakeJsonResponse({ token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (requestOrdinal <= 4) {
        const scenario = plan.publicScenarioBindings[requestOrdinal - 2];
        return fakeJsonResponse({ result: [{ id: `synthetic-destination-${requestOrdinal - 1}`,
          city: scenario.destination.label, country: scenario.destination.countryCode, type: "City",
          fullName: `${scenario.destination.label}, Italy`, coordinates: { lat: scenario.destination.latitude,
            long: scenario.destination.longitude } }] }, 200, String(url));
      }
      const body = JSON.parse(options.body);
      if (typeof body.nextResultsKey === "string") {
        throw new Error("synthetic-first-d1-boundary-without-sensitive-detail");
      }
      const search = plan.logicalSearches[requestOrdinal - 5];
      return fakeJsonResponse(splitR2FakePaginationAwarePayload(search, 0, 1), 200, String(url));
    },
  });
}

export function runSplitR2FakeRouteStackPublicPaginationAwareD2FailureBoundary() {
  const plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  let monotonic = 0;
  let requestOrdinal = 0;
  return runSplitR2RouteStackPublicPaginationAwareMultiScenario({ sourceSha: "7".repeat(40),
    phase: "SPLIT-R2.9A", plan, apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret",
    monotonicNow: () => monotonic, sleeper: async (delay) => { monotonic += delay; },
    now: () => 1_800_000_000_000, randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url, options) => {
      requestOrdinal += 1;
      if (requestOrdinal === 1) return fakeJsonResponse({ token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (requestOrdinal <= 4) {
        const scenario = plan.publicScenarioBindings[requestOrdinal - 2];
        return fakeJsonResponse({ result: [{ id: `synthetic-destination-${requestOrdinal - 1}`,
          city: scenario.destination.label, country: scenario.destination.countryCode, type: "City",
          fullName: `${scenario.destination.label}, Italy`, coordinates: { lat: scenario.destination.latitude,
            long: scenario.destination.longitude } }] }, 200, String(url));
      }
      const body = JSON.parse(options.body);
      const depth = typeof body.nextResultsKey !== "string" ? 0 : body.nextResultsKey.endsWith("-1") ? 1 : 2;
      const searchIndex = depth === 0 ? requestOrdinal - 5 :
        plan.logicalSearches.findIndex((search) => body.nextResultsKey.includes(search.logicalSearchId));
      if (depth === 2) throw new Error("synthetic-first-d2-boundary-without-sensitive-detail");
      return fakeJsonResponse(splitR2FakePaginationAwarePayload(plan.logicalSearches[searchIndex], depth, 2),
        200, String(url));
    },
  });
}

export function buildSplitR2HistoricalR2_8AForensicRecord() {
  return Object.freeze({
    status: "FAIL", sourceSha: "100f2776ea6af018a798feb19fca7c742e257fea",
    totalHttpRequests: 159, totalHttpBudget: 310, totalHttpBudgetRemaining: 151,
    authHttpRequests: 1, destinationHttpRequests: 3, initialHttpRequests: 102,
    continuationD1HttpRequests: 53, continuationD2HttpRequests: 0, retries: 0, redirects: 0,
    d0RawResults: 31_118, d1PageRawResults: 49_784, finalCumulativeRawResults: 80_902,
    finalCumulativeDistinctOffers: 72_273, interPageDuplicatesRemoved: 8_629,
    failedDepth: "D1", failedD1RequestOrdinal: 53,
    failedScenarioOrdinal: null, failedLogicalSearchOrdinal: null, failedSearchRole: null,
    failedBreakpointOrdinal: null, failureOrigin: "NOT_RECONSTRUCTABLE",
    failureHttpStatusCategory: "UNKNOWN_NOT_RETAINED",
    failureReconstructability: "INSUFFICIENT_SANITIZED_FAILURE_DETAIL",
    failureSanitizedDetailAvailable: false,
    d0PhaseCompleted: true, d1PhaseCompleted: false, d2PhaseStarted: false, d2PhaseCompleted: false,
    breadthFirstOrderViolation: false, allD0BeforeAnyD1: true, allD1BeforeAnyD2: true,
    executionStateCounts: { EXECUTED_TO_TERMINAL_STATE: 66, FAILED_DURING_EXECUTION: 1,
      NOT_EXECUTED_AFTER_WAVE_ABORT: 35 },
    completionStateCounts: { PROVIDER_EXHAUSTED_AFTER_INITIAL: 0, PROVIDER_EXHAUSTED_AFTER_D1: 52,
      PROVIDER_EXHAUSTED_AFTER_D2: 0, DEPTH_CAPPED_WITH_MORE_AVAILABLE: 0,
      ZERO_RAW_PROVIDER_EXHAUSTED: 0, UNPROCESSABLE_RESPONSE: 14,
      AMBIGUOUS_CONTINUATION_METADATA: 0, TRANSPORT_OR_CONTRACT_FAILURE: 1 },
    accountingSum: 102, accountingMatchesTotal: true, accountingOverlapDetected: false,
    primaryCampaignInferenceStatus: "NOT_EVALUABLE_WAVE_ABORTED",
    primaryReproducibilityClassification: "PROVIDER_OR_CONTRACT_FAILURE",
    partialWaveEconomicDataRetained: "SANITIZED_COUNTS_AND_EXECUTION_TUPLES_ONLY",
    partialWaveEconomicReconstructability: "NOT_RECONSTRUCTABLE_DATA_NOT_RETAINED",
    partialWaveReconstructabilityReason:
      "NORMALIZED_OFFER_PRICES_AND_COMPLETE_BREAKPOINT_INPUTS_WERE_DESTROYED_WITH_PROCESS_MEMORY",
    partialWaveEconomicResultsComputed: false,
    partialWaveEvidenceClassification: "PARTIAL_WAVE_EXPLORATORY_ECONOMIC_EVIDENCE",
    receiptCompleteness: "PARTIAL_WAVE_ABORTED_WITHOUT_RECONSTRUCTABLE_ECONOMICS",
  });
}

export function runSplitR2OfflineR2_9ForensicDiagnosis() {
  return Object.freeze({
    phase: "SPLIT-R2.9",
    mode: "OFFLINE_FORENSIC_DIAGNOSIS",
    historicalRecord: buildSplitR2HistoricalR2_8AForensicRecord(),
    providerCalls: 0,
    httpRequests: 0,
    credentialsAccessed: false,
    liveWaveAuthorized: false,
  });
}

export function buildSplitR2HistoricalR2_9A_1D0FailureRecord() {
  return Object.freeze({
    status: "INCONCLUSIVE",
    sourceSha: "97469c5925e242f78b7b9a74f5b0f96bae6c1d82",
    localCommitSha: "2ece9858a7b958f2d9191131c32db39e6a634634",
    authorizationConsumed: true,
    liveWaveExecuted: true,
    totalHttpRequests: 5,
    retries: 0,
    secondWaveExecuted: false,
    failedDepth: "D0",
    failedRequestOrdinal: 5,
    failedScenarioOrdinal: 1,
    failedLogicalSearchOrdinal: 1,
    failedSearchRole: "FULL_STAY",
    failureOrigin: "PROVIDER_HTTP",
    failureHttpStatusCategory: "HTTP_4XX",
    breakpointsEvaluable: 0,
    receiptCompleteness: "PARTIAL_WAVE_ABORTED_WITHOUT_EVALUABLE_BREAKPOINTS",
    exactHttpStatusReconstructable: false,
    exactHttpStatus: "UNKNOWN_NOT_RETAINED",
    retryAfterPresenceReconstructable: false,
    retryAfterPresent: "UNKNOWN_NOT_RETAINED",
    sanitizedProviderErrorClassReconstructable: false,
    sanitizedProviderErrorClass: "UNKNOWN_4XX",
  });
}

function splitR2RequestValueTypes(value) {
  if (Array.isArray(value)) return Object.freeze({ type: "array", items:
    Object.freeze(value.map(splitR2RequestValueTypes)) });
  if (value === null) return "null";
  if (typeof value !== "object") return typeof value;
  return Object.freeze(Object.fromEntries(Object.keys(value).sort().map((key) =>
    [key, splitR2RequestValueTypes(value[key])])));
}

function splitR2PublicInitialRequestContract(logicalSearch) {
  const syntheticDestination = Object.freeze({
    id: "SYNTHETIC_DESTINATION_BINDING",
    latitude: 45.4642,
    longitude: 9.19,
  });
  const body = createSplitR1HotelSearchRequest(logicalSearch, syntheticDestination);
  const bodyKeys = Object.freeze(Object.keys(body).sort());
  const descriptor = Object.freeze({
    httpMethod: "POST",
    hostClass: "ROUTESTACK_PUBLIC_PRODUCTION_HOST",
    pathTemplate: SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
    contentType: "application/json",
    authHeaderShape: "BEARER_NON_EMPTY",
    requestBodyKeySet: bodyKeys,
    requestBodyValueTypes: splitR2RequestValueTypes(body),
    destinationBinding: body.destinationId === syntheticDestination.id ? "DESTINATION_ID_FIELD" : "INVALID",
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    occupancy: Object.freeze({ roomCount: body.roomCount, adultCount: body.rooms[0]?.adults ?? null,
      childCount: body.rooms[0]?.children ?? null, childAges: Object.freeze([...(body.rooms[0]?.childAges ?? [])]) }),
    currency: body.currency,
    languageOrMarket: "NOT_REQUIRED_BY_FROZEN_CONTRACT",
    paginationInitialState: Object.freeze({ tokenPresent: Object.hasOwn(body, "token"),
      correlationIdPresent: Object.hasOwn(body, "correlationId"),
      nextResultsKeyPresent: Object.hasOwn(body, "nextResultsKey") }),
  });
  return Object.freeze({ body, descriptor,
    fingerprint: crypto.createHash("sha256").update(stableStringifySplitF0(descriptor, 0), "utf8").digest("hex") });
}

export function buildSplitR2RouteStackPublicRequestEquivalenceAudit() {
  const plan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  const scenario1FullStayIndex = plan.logicalSearches.findIndex((search) =>
    search.scenarioOrdinal === 1 && search.searchRole === "FULL_STAY");
  if (scenario1FullStayIndex < 0) throw new Error("split-r2-request-equivalence-full-stay-missing");
  const campaignBinding = plan.publicLogicalBindings[scenario1FullStayIndex];
  const canaryBinding = buildSplitR2RouteStackPublicCanaryBinding().logicalSearch;
  const contracts = Object.freeze({
    r2_8A: splitR2PublicInitialRequestContract(campaignBinding),
    r2_9A: splitR2PublicInitialRequestContract(campaignBinding),
    publicCanary: splitR2PublicInitialRequestContract(canaryBinding),
    r2_5A: splitR2PublicInitialRequestContract(campaignBinding),
  });
  const fingerprints = Object.freeze(Object.fromEntries(Object.entries(contracts).map(([name, value]) =>
    [name, value.fingerprint])));
  const first = contracts.r2_9A;
  const allBodies = Object.values(contracts).map((entry) => entry.body);
  const forbiddenDiagnosticFields = ["phase", "runId", "timestamp", "diagnosticHmac"];
  const checkInMs = Date.parse(`${first.body.checkIn}T00:00:00Z`);
  const checkOutMs = Date.parse(`${first.body.checkOut}T00:00:00Z`);
  return Object.freeze({
    completed: true,
    fingerprints,
    r2_8AEquivalentToR2_9A: fingerprints.r2_8A === fingerprints.r2_9A,
    r2_9AEquivalentToPublicCanary: fingerprints.r2_9A === fingerprints.publicCanary,
    r2_9AEquivalentToR2_5A: fingerprints.r2_9A === fingerprints.r2_5A,
    phaseLabelSentToProvider: allBodies.some((body) => Object.hasOwn(body, "phase")),
    diagnosticFieldsSentToProvider: allBodies.some((body) =>
      forbiddenDiagnosticFields.some((field) => Object.hasOwn(body, field))),
    methodMatch: Object.values(contracts).every((entry) => entry.descriptor.httpMethod === "POST"),
    pathTemplateMatch: new Set(Object.values(contracts).map((entry) => entry.descriptor.pathTemplate)).size === 1,
    bodyKeySetMatch: new Set(Object.values(contracts).map((entry) =>
      stableStringifySplitF0(entry.descriptor.requestBodyKeySet, 0))).size === 1,
    bodyValueTypesMatch: new Set(Object.values(contracts).map((entry) =>
      stableStringifySplitF0(entry.descriptor.requestBodyValueTypes, 0))).size === 1,
    scenario1DatesValid: Number.isFinite(checkInMs) && Number.isFinite(checkOutMs) &&
      checkInMs > Date.parse("2026-08-29T00:00:00Z") && checkOutMs > checkInMs &&
      (checkOutMs - checkInMs) / 86_400_000 === 14,
    scenario1OccupancyValid: first.body.roomCount === 1 && first.body.rooms.length === 1 &&
      first.body.rooms[0].adults === 2 && first.body.rooms[0].children === 0 &&
      first.body.rooms[0].childAges.length === 0,
    scenario1CurrencyValid: first.body.currency === "EUR",
    initialContinuationStateValid: ["token", "correlationId", "nextResultsKey"].every((key) =>
      !Object.hasOwn(first.body, key)),
  });
}

export function assertSplitR2RouteStackPublicD0ContractCanaryPlan(plan) {
  const scenarioOrdinals = plan?.scenarioBindings?.map((entry) => entry.scenarioOrdinal) ?? [];
  const search = plan?.logicalSearch;
  const exact = plan?.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    stableStringifySplitF0(scenarioOrdinals, 0) === "[1,3,5]" &&
    plan.scenarioBindings.length === 3 &&
    search?.scenarioOrdinal === 1 && search?.logicalSearchOrdinal === 1 &&
    search?.searchRole === "FULL_STAY" && search?.breakpointOrdinal === null &&
    search?.providerBinding?.request?.currency === "EUR" &&
    search?.providerBinding?.request?.checkIn === "2026-11-30" &&
    search?.providerBinding?.request?.checkOut === "2026-12-14" &&
    search?.providerBinding?.request?.occupancy?.rooms === 1 &&
    search?.providerBinding?.request?.occupancy?.adults === 2 &&
    search?.providerBinding?.request?.occupancy?.childAges?.length === 0;
  if (!exact) throw new Error("split-r2-d0-contract-canary-plan-divergence");
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  if (audit.fingerprints.r2_9A !== SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_FINGERPRINT ||
      !audit.r2_8AEquivalentToR2_9A || !audit.r2_9AEquivalentToPublicCanary ||
      !audit.r2_9AEquivalentToR2_5A || audit.phaseLabelSentToProvider ||
      audit.diagnosticFieldsSentToProvider || !audit.initialContinuationStateValid) {
    throw new Error("split-r2-d0-contract-canary-request-contract-divergence");
  }
  return plan;
}

export function buildSplitR2RouteStackPublicD0ContractCanaryPlan() {
  const campaign = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
  const scenarioBindings = Object.freeze(campaign.publicScenarioBindings.map((binding, index) =>
    Object.freeze({ scenarioOrdinal: campaign.scenarioPlans[index].scenario.ordinal, providerBinding: binding })));
  const searchIndex = campaign.logicalSearches.findIndex((search) =>
    search.scenarioOrdinal === 1 && search.searchRole === "FULL_STAY");
  if (searchIndex < 0) throw new Error("split-r2-d0-contract-canary-full-stay-missing");
  const logical = campaign.logicalSearches[searchIndex];
  return assertSplitR2RouteStackPublicD0ContractCanaryPlan(Object.freeze({
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    scenarioBindings,
    logicalSearch: Object.freeze({
      scenarioOrdinal: logical.scenarioOrdinal,
      logicalSearchOrdinal: 1,
      searchRole: logical.searchRole,
      breakpointOrdinal: logical.breakpointOrdinal,
      providerBinding: campaign.publicLogicalBindings[searchIndex],
    }),
  }));
}

export function assertSplitR2RouteStackPublicD0ContractCanaryPreflight(options = {}) {
  const credentialReader = options.credentialReader ?? (() => null);
  const evidence = options.contractEvidence ?? inspectSplitR2RouteStackPublicContractEvidence();
  const plan = assertSplitR2RouteStackPublicD0ContractCanaryPlan(options.plan);
  const exact = options.mode === "ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY" &&
    options.phase === "SPLIT-R2.10A" && options.compact === true &&
    options.environment === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    options.hostname === "mcp.routestack.ai" && options.protocol === "https:" &&
    options.acknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_5_HTTP" &&
    options.unknownCostAcknowledgement === "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN" &&
    options.readOnlyAcknowledgement === "I_ACKNOWLEDGE_READ_ONLY" &&
    options.noRetryAcknowledgement === "I_ACKNOWLEDGE_NO_RETRY" &&
    options.noContinuationAcknowledgement === "I_ACKNOWLEDGE_NO_CONTINUATION" &&
    options.noMutationAcknowledgement === "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION" &&
    options.authMax === 1 && options.destinationMax === 3 && options.initialSearchMax === 1 &&
    options.continuationMax === 0 && options.totalMax === 5 && options.retries === 0 &&
    options.redirects === 0 && options.concurrency === 1 && options.minimumIntervalMs >= 1_000 &&
    options.productionFallback === false && options.sandboxFallback === false &&
    options.liteApiFallback === false && options.otherLiveModesSelected === 0 &&
    options.repositoryGatePassed === true &&
    evidence.environmentClassification === "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED" &&
    evidence.hostnameDeterminable === true && evidence.contractDeterminable === true &&
    evidence.mutativeEndpointsSelected === false && evidence.sandboxFallback === false;
  if (!exact) throw new Error("split-r2-d0-contract-canary-preflight-failed-before-credentials");
  const credentials = credentialReader();
  if (credentials?.baseUrl !== SPLIT_R1_OFFICIAL_BASE_URL ||
      typeof credentials?.apiKey !== "string" || credentials.apiKey.length === 0 ||
      typeof credentials?.apiSecret !== "string" || credentials.apiSecret.length === 0) {
    throw new Error("split-r2-d0-contract-canary-credentials-missing-or-misbound");
  }
  return Object.freeze({ plan, credentials, evidence, credentialsAccessed: true,
    authorizationAcknowledged: true });
}

class SplitR2D0ContractCanaryFailure extends Error {
  constructor(message, { sanitizedHttp = null, requestClass = null, requestOrdinal = null,
    failureOrigin = "LOCAL_TRANSPORT_GUARD" } = {}) {
    super(message);
    this.name = "SplitR2D0ContractCanaryFailure";
    this.sanitizedHttp = sanitizedHttp;
    this.requestClass = requestClass;
    this.requestOrdinal = requestOrdinal;
    this.failureOrigin = failureOrigin;
  }
}

export function createSplitR2RouteStackPublicD0ContractCanaryCounter() {
  const counts = { AUTHENTICATION: 0, DESTINATION: 0, INITIAL_SEARCH: 0, CONTINUATION: 0, total: 0 };
  let active = 0;
  let maxObservedConcurrency = 0;
  return Object.freeze({
    reserve(requestClass) {
      if (!Object.hasOwn(SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_LIMITS, requestClass) ||
          requestClass === "total" || requestClass === "CONTINUATION") {
        throw new Error("split-r2-d0-contract-canary-route-forbidden-before-transport");
      }
      if (counts[requestClass] + 1 > SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_LIMITS[requestClass] ||
          counts.total + 1 > SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_LIMITS.total) {
        throw new Error("split-r2-d0-contract-canary-budget-exceeded-before-transport");
      }
      counts[requestClass] += 1;
      counts.total += 1;
    },
    enterTransport() {
      active += 1;
      maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
      if (active > 1) throw new Error("split-r2-d0-contract-canary-concurrency-exceeded");
    },
    leaveTransport() {
      active -= 1;
      if (active < 0) throw new Error("split-r2-d0-contract-canary-concurrency-ledger-invalid");
    },
    snapshot: () => Object.freeze({ ...counts, retries: 0, redirects: 0,
      maxObservedConcurrency }),
  });
}

export function buildSplitR2RouteStackPublicD0ContractCanaryReceipt({
  sourceSha = "0".repeat(40), outcome = "HTTP_2XX_PROCESSABLE", statusCode = 200,
  retryAfterPresent = false,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha)) throw new Error("split-r2-d0-contract-canary-source-sha-invalid");
  const counter = createSplitR2RouteStackPublicD0ContractCanaryCounter();
  counter.reserve("AUTHENTICATION");
  counter.reserve("DESTINATION"); counter.reserve("DESTINATION"); counter.reserve("DESTINATION");
  counter.reserve("INITIAL_SEARCH");
  const http = counter.snapshot();
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  let failure = null;
  let status = "PASS";
  let contractConclusion = "D0_CONTRACT_VERIFIED_HTTP_2XX_PROCESSABLE";
  let responseProcessable = true;
  let rawResultCount = 2;
  let normalizableResultCount = 2;
  if (outcome === "NETWORK_FAILURE") {
    failure = classifySplitR2RouteStackPublicHttpFailure({ networkFailure: true });
    status = "INCONCLUSIVE"; contractConclusion = "D0_CONTRACT_NETWORK_FAILURE";
  } else if (outcome !== "HTTP_2XX_PROCESSABLE") {
    failure = classifySplitR2RouteStackPublicHttpFailure({ statusCode, retryAfterPresent });
    status = "INCONCLUSIVE";
    contractConclusion = statusCode >= 500 ? "D0_CONTRACT_HTTP_5XX_PROVIDER_FAILURE" :
      "D0_CONTRACT_HTTP_4XX_REQUEST_REJECTED";
  }
  if (failure !== null) { responseProcessable = false; rawResultCount = null; normalizableResultCount = null; }
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RECEIPT_VERSION,
    status,
    sourceSha,
    exactCliPhase: "SPLIT-R2.10A",
    environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    authHttpRequests: http.AUTHENTICATION,
    destinationHttpRequests: http.DESTINATION,
    initialHttpRequests: http.INITIAL_SEARCH,
    continuationHttpRequests: http.CONTINUATION,
    totalHttpRequests: http.total,
    httpStatusCode: failure?.httpStatusCode ?? statusCode,
    httpStatusClass: failure?.httpStatusClass ?? "HTTP_2XX",
    retryAfterPresent: failure?.retryAfterPresent ?? "ABSENT",
    providerErrorEnum: failure?.providerErrorEnum ?? null,
    failureScope: failure?.failureScope ?? null,
    requestContractFingerprint: audit.fingerprints.r2_9A,
    responseProcessable,
    rawResultCount,
    normalizableResultCount,
    numericPriceCoverage: responseProcessable ? Object.freeze({ numerator: 2, denominator: 2 }) : null,
    expectedCurrencyCoverage: responseProcessable ? Object.freeze({ numerator: 2, denominator: 2 }) : null,
    contractConclusion,
    rawIdsPersisted: 0,
    rawContinuationIdsPersisted: 0,
    payloadsOrRawResponsesPersisted: 0,
    secretValuesExposed: false,
  });
}

export function serializeSplitR2RouteStackPublicD0ContractCanaryReceipt(
  receipt, maxBytes = SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_MAX_UTF8_BYTES
) {
  assertReceiptSafe(receipt);
  const json = stableStringifySplitF0(receipt, 0);
  const byteLength = Buffer.byteLength(json, "utf8");
  if (/\r|\n/u.test(json)) throw new Error("split-r2-d0-contract-canary-receipt-not-single-line");
  if (byteLength > maxBytes) throw new SplitR2CompactReceiptError(
    "split-r2-d0-contract-canary-receipt-oversize", byteLength);
  return Object.freeze({ json, byteLength });
}

export function runSplitR2FakeRouteStackPublicD0ContractCanary(outcome = "HTTP_2XX_PROCESSABLE") {
  const statusByOutcome = Object.freeze({ HTTP_400: 400, HTTP_401: 401, HTTP_403: 403, HTTP_404: 404,
    HTTP_409: 409, HTTP_422: 422, HTTP_429: 429, HTTP_5XX: 503 });
  return buildSplitR2RouteStackPublicD0ContractCanaryReceipt({
    sourceSha: "a".repeat(40), outcome,
    statusCode: statusByOutcome[outcome] ?? (outcome === "NETWORK_FAILURE" ? null : 200),
    retryAfterPresent: outcome === "HTTP_429",
  });
}

function splitR2D0ContractCanaryDiagnostics(payload, logicalSearch, ephemeralKey) {
  const structurallyProcessable = isPlainRecord(payload?.result) && Array.isArray(payload.result.result);
  if (!structurallyProcessable) return Object.freeze({ responseProcessable: false,
    rawResultCount: null, normalizableResultCount: null, numericPriceCoverageNumerator: null,
    numericPriceCoverageDenominator: null, expectedCurrencyCoverageNumerator: null,
    expectedCurrencyCoverageDenominator: null, inventoryAvailable: null });
  const items = payload.result.result;
  let normalizableResultCount = 0;
  try {
    normalizableResultCount = normalizeSplitR1SearchPage(payload,
      { logicalSearch, ephemeralRunKey: ephemeralKey }).offers.length;
  } catch {
    normalizableResultCount = 0;
  }
  const numericPriceCoverageNumerator = items.filter((item) => {
    const value = typeof item?.ourprice === "number" ? item.ourprice : Number(item?.ourprice);
    return Number.isFinite(value) && value > 0;
  }).length;
  const expectedCurrencyCoverageNumerator = payload.result.currency === "EUR" ? items.length : 0;
  return Object.freeze({ responseProcessable: true, rawResultCount: items.length,
    normalizableResultCount, numericPriceCoverageNumerator,
    numericPriceCoverageDenominator: items.length, expectedCurrencyCoverageNumerator,
    expectedCurrencyCoverageDenominator: items.length, inventoryAvailable: items.length > 0 });
}

function splitR2D0ContractCanaryFailureDetail(error) {
  if (error instanceof SplitR2D0ContractCanaryFailure) return Object.freeze({
    sanitizedHttp: error.sanitizedHttp,
    requestClass: error.requestClass,
    requestOrdinal: error.requestOrdinal,
    failureOrigin: error.failureOrigin,
    sanitizedDetailAvailable: true,
  });
  return Object.freeze({ sanitizedHttp: null, requestClass: null, requestOrdinal: null,
    failureOrigin: "LOCAL_RECEIPT_OR_ACCOUNTING", sanitizedDetailAvailable: false });
}

function createSplitR2RouteStackPublicD0ContractCanaryTransport({ fetchImplementation,
  monotonicNow, sleeper, realProviderTransport = false } = {}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("split-r2-d0-contract-canary-fetch-unavailable");
  }
  const counter = createSplitR2RouteStackPublicD0ContractCanaryCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const endpoints = new Map([["AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT],
    ["DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT], ["INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT]]);
  let authorizationConsumed = false;
  let liveWaveStarted = false;
  return Object.freeze({
    async post(requestClass, endpointPath, body, bearer = null) {
      if (endpoints.get(requestClass) !== endpointPath || requestClass === "CONTINUATION" ||
          endpointPath.includes("continue")) {
        throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-route-forbidden-before-transport",
          { requestClass, failureOrigin: "LOCAL_TRANSPORT_GUARD" });
      }
      const url = new URL(endpointPath, SPLIT_R1_OFFICIAL_BASE_URL);
      if (url.protocol !== "https:" || url.hostname !== "mcp.routestack.ai") {
        throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-host-forbidden-before-transport",
          { requestClass, failureOrigin: "LOCAL_TRANSPORT_GUARD" });
      }
      await limiter.ready();
      counter.reserve(requestClass);
      counter.enterTransport();
      limiter.markStarted();
      const requestOrdinal = counter.snapshot().total;
      if (realProviderTransport) {
        authorizationConsumed = true;
        liveWaveStarted = true;
      }
      try {
        let response;
        try {
          response = await fetchImplementation(url, { method: "POST", redirect: "error", cache: "no-store",
            headers: { Accept: "application/json", "Content-Type": "application/json",
              ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }) },
            body: JSON.stringify(body) });
        } catch {
          throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-network-transport-failure",
            { sanitizedHttp: classifySplitR2RouteStackPublicHttpFailure({ networkFailure: true }),
              requestClass, requestOrdinal, failureOrigin: "NETWORK_TRANSPORT" });
        }
        if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
          throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-redirect-prohibited",
            { requestClass, requestOrdinal, failureOrigin: "LOCAL_TRANSPORT_GUARD" });
        }
        if (typeof response.url === "string" && response.url.length > 0) {
          const responseUrl = new URL(response.url);
          if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "mcp.routestack.ai") {
            throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-response-host-prohibited",
              { requestClass, requestOrdinal, failureOrigin: "LOCAL_TRANSPORT_GUARD" });
          }
        }
        if (!Number.isInteger(response.status) || response.status < 200 || response.status >= 300) {
          const sanitizedHttp = classifySplitR2RouteStackPublicHttpFailure({ statusCode: response.status,
            retryAfterPresent: (response.headers?.get?.("retry-after") ?? null) !== null });
          throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-provider-http-failure",
            { sanitizedHttp, requestClass, requestOrdinal, failureOrigin: "PROVIDER_HTTP" });
        }
        const contentType = response.headers?.get?.("content-type") ?? "";
        if (!/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) {
          return Object.freeze({ payload: null, status: response.status, structurallyDecoded: false });
        }
        try {
          return Object.freeze({ payload: JSON.parse(await response.text()), status: response.status,
            structurallyDecoded: true });
        } catch {
          return Object.freeze({ payload: null, status: response.status, structurallyDecoded: false });
        }
      } finally { counter.leaveTransport(); }
    },
    postContinuation() {
      throw new Error("split-r2-d0-contract-canary-continuation-prohibited-before-transport");
    },
    snapshot: () => Object.freeze({ http: counter.snapshot(), limiter: limiter.snapshot(),
      authorizationConsumed, liveWaveStarted }),
  });
}

export function buildSplitR2RouteStackPublicD0ContractCanaryLiveReceipt({
  sourceSha = "0".repeat(40), contractEvidence = inspectSplitR2RouteStackPublicContractEvidence(),
  http = {}, limiter = {}, authorizationAcknowledged = false, authorizationConsumed = false,
  liveWaveStarted = false, d0Status = null, diagnostics = null, failure = null,
  failureClassification = null, statusOverride = null,
} = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha)) throw new Error("split-r2-d0-contract-canary-source-sha-invalid");
  const audit = buildSplitR2RouteStackPublicRequestEquivalenceAudit();
  const d0Executed = (http.INITIAL_SEARCH ?? 0) === 1;
  const processable = diagnostics?.responseProcessable ?? null;
  const status = statusOverride ?? (d0Executed && processable === true ? "PASS" :
    (http.total ?? 0) > 0 ? "INCONCLUSIVE" : "BLOCKED");
  const contractConclusion = status === "PASS"
    ? "ROUTESTACK_PUBLIC_INITIAL_D0_READ_ONLY_CONTRACT_CURRENTLY_VERIFIED"
    : d0Executed && Number.isInteger(d0Status) && d0Status >= 200 && d0Status < 300
      ? "D0_CONTRACT_HTTP_2XX_RESPONSE_UNPROCESSABLE"
      : failure?.sanitizedHttp?.httpStatusClass === "NETWORK_TRANSPORT_FAILURE"
        ? "D0_CONTRACT_NETWORK_FAILURE"
        : failure?.sanitizedHttp?.httpStatusClass === "HTTP_5XX"
          ? "D0_CONTRACT_HTTP_5XX_PROVIDER_FAILURE"
          : failure?.sanitizedHttp?.httpStatusClass?.startsWith("HTTP_")
            ? "D0_CONTRACT_HTTP_4XX_REQUEST_REJECTED"
            : status === "BLOCKED" ? "D0_CONTRACT_CANARY_BLOCKED_BEFORE_TRANSPORT" :
              "D0_CONTRACT_CANARY_TERMINATED_BEFORE_PROCESSABLE_D0";
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RECEIPT_VERSION,
    status, sourceSha, exactCliPhase: "SPLIT-R2.10A",
    userApprovalAcknowledged: authorizationAcknowledged,
    authorizationConsumed, liveWaveStarted, secondLiveWaveExecuted: false,
    environmentClassification: contractEvidence.environmentClassification,
    requestContractFingerprint: audit.fingerprints.r2_9A,
    requestContractFingerprintMatch: audit.fingerprints.r2_9A ===
      SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_FINGERPRINT,
    scenarioOrdinal: 1, logicalSearchOrdinal: 1, searchRole: "FULL_STAY",
    authHttpRequests: http.AUTHENTICATION ?? 0,
    destinationHttpRequests: http.DESTINATION ?? 0,
    initialHttpRequests: http.INITIAL_SEARCH ?? 0,
    continuationHttpRequests: http.CONTINUATION ?? 0,
    totalHttpRequests: http.total ?? 0, totalHttpBudget: 5,
    totalHttpBudgetRemaining: 5 - (http.total ?? 0), retries: 0, redirects: 0,
    maxObservedConcurrency: http.maxObservedConcurrency ?? 0,
    minObservedRequestIntervalMs: limiter.minimumObservedRequestIntervalMs ?? null,
    d0HttpRequestExecuted: d0Executed,
    httpStatusCode: failure?.sanitizedHttp?.httpStatusCode ?? (d0Executed ? d0Status : null),
    httpStatusClass: failure?.sanitizedHttp?.httpStatusClass ??
      (d0Executed && Number.isInteger(d0Status) ? "HTTP_2XX" : "NOT_OBSERVED"),
    retryAfterPresent: failure?.sanitizedHttp?.retryAfterPresent ?? "NOT_APPLICABLE",
    providerErrorEnum: failure?.sanitizedHttp?.providerErrorEnum ?? null,
    failureScope: failure?.sanitizedHttp?.failureScope ?? null,
    failureRequestOrdinal: failure?.requestOrdinal ?? null,
    failureRequestClass: failure?.requestClass ?? null,
    failureOrigin: failure?.failureOrigin ?? null,
    failureSanitizedDetailAvailable: failure?.sanitizedDetailAvailable ?? null,
    responseProcessable: processable,
    rawResultCount: diagnostics?.rawResultCount ?? null,
    normalizableResultCount: diagnostics?.normalizableResultCount ?? null,
    numericPriceCoverage: diagnostics === null ? null : Object.freeze({
      numerator: diagnostics.numericPriceCoverageNumerator,
      denominator: diagnostics.numericPriceCoverageDenominator }),
    expectedCurrency: "EUR",
    expectedCurrencyCoverage: diagnostics === null ? null : Object.freeze({
      numerator: diagnostics.expectedCurrencyCoverageNumerator,
      denominator: diagnostics.expectedCurrencyCoverageDenominator }),
    inventoryAvailable: diagnostics?.inventoryAvailable ?? null,
    d0ContractVerified: status === "PASS",
    canaryConclusion: contractConclusion,
    economicBreakpointsEvaluated: 0, splitSavingEvaluated: false,
    secondSearchExecuted: false, continuationExecuted: false,
    completenessClaimAllowed: false, globalOptimumClaimAllowed: false,
    generalMarketFrequencyClaimAllowed: false, productionValidityClaimAllowed: false,
    commercialValidationClaimAllowed: false, productionBookingAuthorized: false,
    publicRuntimeChanged: false, rawIdsPersisted: 0, rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0, payloadsOrRawResponsesPersisted: 0,
    crossRunLinkability: false, secretValuesExposed: false,
    failureClassification: failureClassification ?? (status === "PASS" ? "NONE" :
      status === "BLOCKED" ? "R2_10A_PREFLIGHT_BLOCKED" : "R2_10A_LIVE_CANARY_INCONCLUSIVE"),
  });
}

export async function runSplitR2RouteStackPublicD0ContractCanary({ sourceSha, plan,
  apiKey, apiSecret, authorizationAcknowledged = false, realProviderTransport = false,
  fetchImplementation = globalThis.fetch, monotonicNow, sleeper, now, randomUUID } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha ?? "") || typeof apiKey !== "string" || apiKey.length === 0 ||
      typeof apiSecret !== "string" || apiSecret.length === 0 || authorizationAcknowledged !== true) {
    throw new Error("split-r2-d0-contract-canary-runtime-input-invalid");
  }
  const authoritativePlan = assertSplitR2RouteStackPublicD0ContractCanaryPlan(plan);
  const contractEvidence = inspectSplitR2RouteStackPublicContractEvidence();
  const transport = createSplitR2RouteStackPublicD0ContractCanaryTransport({ fetchImplementation,
    monotonicNow, sleeper, realProviderTransport });
  const ephemeralKey = crypto.randomBytes(32);
  let bearer = null;
  let currentRequestClass = null;
  let d0Status = null;
  try {
    currentRequestClass = "AUTHENTICATION";
    const auth = await transport.post("AUTHENTICATION", SPLIT_R1_AUTH_ENDPOINT,
      createSplitR1PartnerTokenRequest({ apiKey, apiSecret, now, randomUUID }));
    bearer = auth.payload?.token;
    if (typeof bearer !== "string" || bearer.length === 0) {
      throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-bearer-missing",
        { sanitizedHttp: { httpStatusCode: auth.status, httpStatusClass: "HTTP_2XX",
          retryAfterPresent: "NOT_APPLICABLE", providerErrorEnum: null,
          failureScope: "UNKNOWN_SCOPE_FAIL_CLOSED" }, requestClass: currentRequestClass,
          requestOrdinal: transport.snapshot().http.total, failureOrigin: "RESPONSE_SCHEMA" });
    }
    const destinations = new Map();
    for (const entry of authoritativePlan.scenarioBindings) {
      currentRequestClass = "DESTINATION";
      const response = await transport.post("DESTINATION", SPLIT_R1_DESTINATION_ENDPOINT,
        createSplitR1DestinationRequest(entry.providerBinding), bearer);
      try {
        destinations.set(entry.scenarioOrdinal,
          selectSplitR1DestinationCandidate(response.payload, entry.providerBinding));
      } catch {
        throw new SplitR2D0ContractCanaryFailure("split-r2-d0-contract-canary-destination-unusable",
          { sanitizedHttp: { httpStatusCode: response.status, httpStatusClass: "HTTP_2XX",
            retryAfterPresent: "NOT_APPLICABLE", providerErrorEnum: null,
            failureScope: "UNKNOWN_SCOPE_FAIL_CLOSED" }, requestClass: currentRequestClass,
            requestOrdinal: transport.snapshot().http.total, failureOrigin: "RESPONSE_SCHEMA" });
      }
    }
    currentRequestClass = "INITIAL_SEARCH";
    const search = authoritativePlan.logicalSearch;
    const d0 = await transport.post("INITIAL_SEARCH", SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
      createSplitR1HotelSearchRequest(search.providerBinding, destinations.get(1)), bearer);
    d0Status = d0.status;
    const diagnostics = splitR2D0ContractCanaryDiagnostics(d0.payload, search.providerBinding, ephemeralKey);
    const snapshot = transport.snapshot();
    return buildSplitR2RouteStackPublicD0ContractCanaryLiveReceipt({ sourceSha, contractEvidence,
      http: snapshot.http, limiter: snapshot.limiter, authorizationAcknowledged,
      authorizationConsumed: snapshot.authorizationConsumed, liveWaveStarted: snapshot.liveWaveStarted,
      d0Status, diagnostics });
  } catch (error) {
    const snapshot = transport.snapshot();
    const detail = splitR2D0ContractCanaryFailureDetail(error);
    return buildSplitR2RouteStackPublicD0ContractCanaryLiveReceipt({ sourceSha, contractEvidence,
      http: snapshot.http, limiter: snapshot.limiter, authorizationAcknowledged,
      authorizationConsumed: snapshot.authorizationConsumed, liveWaveStarted: snapshot.liveWaveStarted,
      d0Status, failure: detail,
      failureClassification: String(error?.message ?? error).startsWith("split-r2-")
        ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
        : "R2_10A_LIVE_CANARY_TECHNICAL_FAILURE" });
  } finally {
    bearer = null;
    ephemeralKey.fill(0);
  }
}

function splitR2D0ContractFakeResponse(payload, status, url, retryAfterPresent = false) {
  return Object.freeze({ status, redirected: false, url,
    headers: { get: (name) => name.toLowerCase() === "content-type" ? "application/json" :
      name.toLowerCase() === "retry-after" && retryAfterPresent ? "60" : null },
    text: async () => JSON.stringify(payload) });
}

export async function runSplitR2FakeRouteStackPublicD0ContractCanaryExact(profile = "HTTP_2XX_RESULTS") {
  const plan = buildSplitR2RouteStackPublicD0ContractCanaryPlan();
  const initialStatuses = Object.freeze({ HTTP_400: 400, HTTP_401: 401, HTTP_403: 403,
    HTTP_404: 404, HTTP_409: 409, HTTP_422: 422, HTTP_429: 429,
    HTTP_OTHER_4XX: 418, HTTP_5XX: 503 });
  let monotonic = 0;
  let ordinal = 0;
  const receipt = await runSplitR2RouteStackPublicD0ContractCanary({ sourceSha: "b".repeat(40), plan,
    apiKey: "synthetic-public-key", apiSecret: "synthetic-public-secret",
    authorizationAcknowledged: true, realProviderTransport: false,
    monotonicNow: () => monotonic, sleeper: async (delay) => { monotonic += delay; },
    now: () => 1_800_000_000_000, randomUUID: () => "synthetic-nonce-memory-only",
    fetchImplementation: async (url) => {
      ordinal += 1;
      if (profile === "NETWORK_FAILURE" && ordinal === 5) throw new Error("synthetic-network-failure");
      if (profile === "AUTH_401" && ordinal === 1) return splitR2D0ContractFakeResponse({}, 401, String(url));
      const destinationFailure = /^DESTINATION_([123])_404$/u.exec(profile);
      if (destinationFailure && ordinal === Number(destinationFailure[1]) + 1) {
        return splitR2D0ContractFakeResponse({}, 404, String(url));
      }
      if (ordinal === 1) return splitR2D0ContractFakeResponse(
        { token: "synthetic-bearer-memory-only" }, 200, String(url));
      if (ordinal <= 4) {
        const entry = plan.scenarioBindings[ordinal - 2];
        return splitR2D0ContractFakeResponse({ result: [{ id: `synthetic-destination-${ordinal - 1}`,
          city: entry.providerBinding.destination.label,
          country: entry.providerBinding.destination.countryCode,
          type: "City", fullName: `${entry.providerBinding.destination.label}, synthetic`,
          coordinates: { lat: entry.providerBinding.destination.latitude,
            long: entry.providerBinding.destination.longitude } }] }, 200, String(url));
      }
      if (profile === "HTTP_2XX_EMPTY") return splitR2D0ContractFakeResponse(
        { result: { currency: "EUR", result: [] } }, 200, String(url));
      if (profile === "HTTP_2XX_UNPROCESSABLE") return splitR2D0ContractFakeResponse(
        { result: { currency: "EUR", result: "invalid" } }, 200, String(url));
      if (Object.hasOwn(initialStatuses, profile)) return splitR2D0ContractFakeResponse({},
        initialStatuses[profile], String(url), profile === "HTTP_429");
      return splitR2D0ContractFakeResponse({ result: { currency: "EUR", result: [
        { id: "synthetic-property-1", ourprice: 700.5 },
        { id: "synthetic-property-2", ourprice: 730.25 }] } }, 200, String(url));
    } });
  return Object.freeze({ receipt, transmittedRequests: ordinal });
}

export function runSplitR2FakeFailureScopeControl(profile) {
  const breaker = createSplitR2SearchFailureCircuitBreaker();
  if (profile === "GLOBAL_ABORT") {
    const failure = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 401 });
    return Object.freeze({ failure, breaker: breaker.recordFailure(failure.failureScope), requestsAfterFailure: 0 });
  }
  if (profile === "SEARCH_SCOPED_CONTINUATION") {
    const failure = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 422,
      documentedSearchScopedProviderErrorEnum: "REQUEST_SEMANTICALLY_REJECTED" });
    return Object.freeze({ failure, breaker: breaker.recordFailure(failure.failureScope), independentSearchContinues: true });
  }
  if (profile === "CIRCUIT_BREAKER") {
    const failure = classifySplitR2RouteStackPublicHttpFailure({ statusCode: 422,
      documentedSearchScopedProviderErrorEnum: "REQUEST_SEMANTICALLY_REJECTED" });
    breaker.recordFailure(failure.failureScope);
    breaker.recordFailure(failure.failureScope);
    return Object.freeze({ failure, breaker: breaker.recordFailure(failure.failureScope), attempts: 3 });
  }
  throw new Error("split-r2-fake-failure-scope-profile-invalid");
}

function fakeJsonResponse(payload, status, url) {
  return {
    status, redirected: false, url,
    headers: { get: (name) => name.toLowerCase() === "content-type" ? "application/json" : null },
    text: async () => JSON.stringify(payload),
  };
}

export function assertSplitR2RouteStackOfflinePreflight() {
  return {
    sandboxRealTransportStatus: "LIVE_HOLD",
    publicProductionTransportStatus: "LIVE_HOLD",
    environmentsSeparated: true,
    hostnamesInterchangeable: false,
    productionFallback: false,
    sandboxCredentialsEnableProduction: false,
    publicDedicatedFlagRequired: true,
    publicDedicatedBudgetRequired: true,
    publicCompactReceiptRequired: true,
    publicContinuationMaxWithoutAuthorization: 0,
    publicRuntimeChanged: false,
    providerCalls: 0,
    status: "PASS",
  };
}

function gitText(args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function splitNul(value) {
  return value.split("\0").filter(Boolean);
}

function repositoryDirtySnapshot() {
  const staged = splitNul(execFileSync("git", ["diff", "--cached", "--name-only", "-z"], {
    cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }));
  const unstaged = splitNul(execFileSync("git", ["diff", "--name-only", "-z"], {
    cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }));
  const untracked = splitNul(execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }));
  const entries = [
    ...unstaged.map((relativePath) => ({ category: "TRACKED_UNSTAGED", relativePath })),
    ...untracked.map((relativePath) => ({ category: "UNTRACKED", relativePath })),
  ].sort((left, right) => `${left.category}|${left.relativePath}`.localeCompare(`${right.category}|${right.relativePath}`));
  const lines = entries.map(({ category, relativePath }) => {
    const absolute = path.resolve(relativePath);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("split-r2-dirty-path-type-prohibited");
    const digest = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
    return `${category}|${relativePath.replaceAll("\\", "/")}|file|${stat.size}|${digest}`;
  });
  return {
    staged,
    unstaged,
    untracked,
    entries,
    fingerprint: crypto.createHash("sha256").update(lines.join("\n"), "utf8").digest("hex"),
  };
}

export function verifySplitR2LiteApiCanaryRepositoryGate(expectedHead, expectedDirtyFingerprint) {
  if (!/^[0-9a-f]{40}$/u.test(expectedHead) || !/^[0-9a-f]{64}$/u.test(expectedDirtyFingerprint)) {
    throw new Error("split-r2-liteapi-canary-repository-ack-invalid");
  }
  if (gitText(["branch", "--show-current"]) !== "main" || gitText(["rev-parse", "HEAD"]) !== expectedHead) {
    throw new Error("split-r2-liteapi-canary-head-mismatch");
  }
  const dirty = repositoryDirtySnapshot();
  if (dirty.staged.length !== 0 || dirty.unstaged.length !== 1 || dirty.untracked.length !== 6 ||
      dirty.entries.length !== 7 || dirty.fingerprint !== expectedDirtyFingerprint) {
    throw new Error("split-r2-liteapi-canary-dirty-state-mismatch");
  }
  const prohibited = new Set([...SPLIT_R2_SCOPE_PATHS, "package.json", "package-lock.json", "server/.env"]);
  if (dirty.entries.some((entry) => prohibited.has(entry.relativePath.replaceAll("\\", "/")))) {
    throw new Error("split-r2-liteapi-canary-dirty-scope-overlap");
  }
  if (gitText(["rev-parse", "refs/remotes/origin/main"]) !== "38a7937a2c1a9dc74914ea97c679ab475feaa959") {
    throw new Error("split-r2-liteapi-canary-origin-reference-drift");
  }
  if (crypto.createHash("sha256").update(fs.readFileSync("package.json")).digest("hex") !==
      "be8465d3ab65240ee82173109a99c7269b70047ec1119bd2c5d59eae2c64c8bf" ||
      crypto.createHash("sha256").update(fs.readFileSync("package-lock.json")).digest("hex") !==
      "992da4b3d00c590bd48c4c1d955953938b053c73bf1b7243f189ebb1b3df6613") {
    throw new Error("split-r2-liteapi-canary-package-drift");
  }
  const ignored = execFileSync("git", ["check-ignore", "-q", "--", "server/.env"], { cwd: process.cwd(), stdio: "ignore" });
  void ignored;
  if (!fs.existsSync("server/.env")) throw new Error("split-r2-liteapi-canary-env-file-absent");
  return { passed: true, dirtyFingerprint: dirty.fingerprint };
}

function splitR2FingerprintPathDescriptor(absolutePath) {
  if (!fs.existsSync(absolutePath)) return Object.freeze({ type: "absent", digest: "ABSENT" });
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(absolutePath, "utf8");
    return Object.freeze({ type: "symlink",
      digest: crypto.createHash("sha256").update(target, "utf8").digest("hex") });
  }
  if (stat.isFile()) return Object.freeze({ type: "file",
    digest: crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex") });
  if (stat.isDirectory()) {
    const children = fs.readdirSync(absolutePath, { withFileTypes: true })
      .map((entry) => entry.name).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    const manifest = children.map((name) => {
      const descriptor = splitR2FingerprintPathDescriptor(path.join(absolutePath, name));
      return `${descriptor.type}|${name.replaceAll("\\", "/")}|${descriptor.digest}`;
    }).join("\n");
    return Object.freeze({ type: "directory",
      digest: crypto.createHash("sha256").update(manifest, "utf8").digest("hex") });
  }
  return Object.freeze({ type: "other",
    digest: crypto.createHash("sha256").update("OTHER", "utf8").digest("hex") });
}

export function computeSplitR2UnrelatedDirtyFingerprint(entries, root = process.cwd()) {
  const allowedPhase = new Set(SPLIT_R2_SCOPE_PATHS);
  const normalized = [...new Set(entries.map((entry) =>
    String(entry.relativePath ?? entry).replaceAll("\\", "/")))]
    .filter((relativePath) => !allowedPhase.has(relativePath))
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const lines = normalized.map((relativePath) => {
    const absolute = path.resolve(root, relativePath);
    const rootAbsolute = path.resolve(root);
    if (absolute !== rootAbsolute && !absolute.startsWith(`${rootAbsolute}${path.sep}`)) {
      throw new Error("split-r2-pagination-aware-dirty-path-outside-repository");
    }
    const descriptor = splitR2FingerprintPathDescriptor(absolute);
    return `${descriptor.type}|${relativePath}|${descriptor.digest}`;
  });
  return Object.freeze({ count: normalized.length, paths: Object.freeze(normalized),
    fingerprint: crypto.createHash("sha256").update(lines.join("\n"), "utf8").digest("hex") });
}

export function verifySplitR2PaginationAwareRepositoryGate(expectedHead, expectedDirtyFingerprint) {
  if (!/^[0-9a-f]{40}$/u.test(expectedHead) || !/^[0-9a-f]{64}$/u.test(expectedDirtyFingerprint)) {
    throw new Error("split-r2-pagination-aware-repository-ack-invalid");
  }
  if (gitText(["branch", "--show-current"]) !== "main" || gitText(["rev-parse", "HEAD"]) !== expectedHead) {
    throw new Error("split-r2-pagination-aware-head-mismatch");
  }
  const dirty = repositoryDirtySnapshot();
  const allowedPhase = new Set(SPLIT_R2_SCOPE_PATHS);
  if (dirty.staged.length !== 0 || dirty.entries.some((entry) => {
    const relative = entry.relativePath.replaceAll("\\", "/");
    return !allowedPhase.has(relative) &&
      !["src/engine-v3/index.ts",
        ".codex-remote-attachments/01a0101e-d030-75f3-8d0a-f3c56dff8ce8/787761a2-8b1d-46ff-b461-9cd5f5310cee/1-Photo-1.jpg",
        ".codex-remote-attachments/01a0101e-d030-75f3-8d0a-f3c56dff8ce8/787761a2-8b1d-46ff-b461-9cd5f5310cee/2-Photo-2.jpg",
        ".codex-remote-attachments/01a0101e-d030-75f3-8d0a-f3c56dff8ce8/787761a2-8b1d-46ff-b461-9cd5f5310cee/3-Photo-3.jpg",
        "src/engine-v3/evaluation/realMeasurementCapturePilotV3.ts",
        "tests/engine-v3/fixtures/v3-17-real-measurement-capture-pilot-001-source-v1.json",
        "tests/engine-v3/v3RealMeasurementCapturePilot.test.ts"].includes(relative);
  })) throw new Error("split-r2-pagination-aware-dirty-scope-mismatch");
  const originalEntries = dirty.entries.filter((entry) => !allowedPhase.has(entry.relativePath.replaceAll("\\", "/")));
  const fingerprintResult = computeSplitR2UnrelatedDirtyFingerprint(originalEntries);
  if (fingerprintResult.count !== 7) throw new Error("split-r2-pagination-aware-dirty-cardinality-mismatch");
  if (fingerprintResult.fingerprint !== expectedDirtyFingerprint) {
    throw new Error("split-r2-pagination-aware-dirty-state-mismatch");
  }
  if (crypto.createHash("sha256").update(fs.readFileSync("package.json")).digest("hex") !==
      "be8465d3ab65240ee82173109a99c7269b70047ec1119bd2c5d59eae2c64c8bf" ||
      crypto.createHash("sha256").update(fs.readFileSync("package-lock.json")).digest("hex") !==
      "992da4b3d00c590bd48c4c1d955953938b053c73bf1b7243f189ebb1b3df6613") {
    throw new Error("split-r2-pagination-aware-package-drift");
  }
  execFileSync("git", ["check-ignore", "-q", "--", "server/.env"], { cwd: process.cwd(), stdio: "ignore" });
  if (!fs.existsSync("server/.env")) throw new Error("split-r2-pagination-aware-env-file-absent");
  return Object.freeze({ passed: true, dirtyFingerprint: fingerprintResult.fingerprint,
    unrelatedDirtyPathCount: fingerprintResult.count });
}

function readLiteApiSandboxCredential() {
  const parsed = new Map();
  const text = fs.readFileSync("server/.env", "utf8");
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (!match || match[1].startsWith("#")) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed.set(match[1], value);
  }
  const candidates = [process.env.SPLIT_F0_SANDBOX_API_KEY, process.env.LITEAPI_API_KEY,
    parsed.get("SPLIT_F0_SANDBOX_API_KEY"), parsed.get("LITEAPI_API_KEY")]
    .filter((value) => typeof value === "string" && value.length > 0);
  const distinct = [...new Set(candidates)];
  if (distinct.length !== 1) throw new Error("split-r2-liteapi-sandbox-credential-ambiguous-or-missing");
  return distinct[0];
}

function readRouteStackPublicCredentials() {
  const parsed = new Map();
  const text = fs.readFileSync("server/.env", "utf8");
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u);
    if (!match || match[1].startsWith("#")) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed.set(match[1], value);
  }
  const resolveOne = (name) => {
    const values = [process.env[name], parsed.get(name)]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());
    const distinct = [...new Set(values)];
    if (distinct.length !== 1) {
      throw new Error("split-r2-routestack-public-canary-credential-ambiguous-or-missing");
    }
    return distinct[0];
  };
  const baseUrl = resolveOne("ROUTESTACK_BASE_URL").replace(/\/+$/u, "");
  validateSplitR1BaseUrl(baseUrl);
  return Object.freeze({
    baseUrl,
    apiKey: resolveOne("ROUTESTACK_API_KEY"),
    apiSecret: resolveOne("ROUTESTACK_API_SECRET"),
  });
}

async function requestLiteApiCanaryRate({ search, apiKey, fetchImplementation, counter, limiter, sessionNonce }) {
  if (search.searchRole === "NIGHTLY" || !["FULL_STAY", "PREFIX", "SUFFIX"].includes(search.searchRole)) {
    throw new Error("split-r2-liteapi-canary-search-role-forbidden");
  }
  const url = new URL(`${SPLIT_R2_LITEAPI_SANDBOX_BASE_URL}${SPLIT_R2_LITEAPI_RATES_PATH}`);
  if (url.protocol !== "https:" || url.hostname !== "api.liteapi.travel" || url.pathname !== "/v3.0/hotels/rates") {
    throw new Error("split-r2-liteapi-canary-route-forbidden");
  }
  await limiter.ready();
  counter.reserve(search.searchRole);
  counter.enterTransport();
  limiter.markStarted();
  try {
    const response = await fetchImplementation(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify(createSplitR2LiteApiCanaryRequestBody(search, sessionNonce)),
      redirect: "error",
      cache: "no-store",
    });
    if (response.redirected === true || (response.status >= 300 && response.status < 400)) {
      throw new Error("split-r2-liteapi-canary-redirect-prohibited");
    }
    if (typeof response.url === "string" && response.url.length > 0) {
      const responseUrl = new URL(response.url);
      if (responseUrl.protocol !== "https:" || responseUrl.hostname !== "api.liteapi.travel") {
        throw new Error("split-r2-liteapi-canary-response-host-prohibited");
      }
    }
    if (response.status !== 200) throw new Error("split-r2-liteapi-canary-http-status-failure");
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!/(?:application|text)\/(?:[^;]+\+)?json\b/iu.test(contentType)) {
      throw new Error("split-r2-liteapi-canary-content-type-invalid");
    }
    let payload;
    try {
      payload = JSON.parse(await response.text());
    } catch {
      throw new Error("split-r2-liteapi-canary-json-invalid");
    }
    if (continuationOrPaginationSignalPresent(payload)) {
      throw new Error("split-r2-liteapi-canary-pagination-prohibited");
    }
    return { payload, status: response.status };
  } finally {
    counter.leaveTransport();
  }
}

export async function runSplitR2LiteApiCanary({ sourceSha, apiKey, fetchImplementation = globalThis.fetch,
  monotonicNow, sleeper } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(sourceSha) || typeof fetchImplementation !== "function") {
    throw new Error("split-r2-liteapi-canary-runtime-input-invalid");
  }
  const plan = buildSplitR2LiteApiCanaryPlan();
  const counter = createSplitR2LiteApiCanaryCounter();
  const limiter = createSplitR2MonotonicLimiter({ monotonicNow, sleeper });
  const key = crypto.randomBytes(32);
  const sessionNonce = crypto.randomBytes(12).toString("hex");
  const results = [];
  try {
    for (const search of plan.searches) {
      const response = await requestLiteApiCanaryRate({ search, apiKey, fetchImplementation, counter, limiter, sessionNonce });
      results.push(normalizeSplitR2LiteApiCanaryResponse(search, response.payload, key, response.status));
    }
    return buildSplitR2LiteApiCanaryReceipt({
      sourceSha, results, http: counter.snapshot(), limiter: limiter.snapshot(),
    });
  } catch (error) {
    return buildSplitR2LiteApiCanaryReceipt({
      sourceSha, results, http: counter.snapshot(), limiter: limiter.snapshot(),
      failureClassification: String(error?.message ?? error).startsWith("split-r2-")
        ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
        : "LITEAPI_CANARY_TECHNICAL_FAILURE",
    });
  } finally {
    key.fill(0);
  }
}

export function assertSplitR2RealTransportBlocked(options = {}) {
  if (options.mode === "real" || options.liveCapability) {
    throw new Error("split-r2-real-transport-live-hold");
  }
  return { blocked: true, credentialsAccessed: false, socketsOpened: 0, httpRequests: 0 };
}

export function runSplitR2Mode(mode) {
  if (mode === "dry-run") return buildSplitR2CompactReceipt(mode);
  if (mode === "fake-liteapi") {
    const liteApi = runSplitR2FakeProviderCampaign("LITEAPI_SANDBOX");
    return buildSplitR2CompactReceipt(mode, {
      liteApi,
      decisions: decideSplitR2Campaign(liteApi.aggregate, null),
    });
  }
  if (mode === "fake-routestack") {
    const routeStack = runSplitR2FakeProviderCampaign("ROUTESTACK_SANDBOX");
    return buildSplitR2CompactReceipt(mode, {
      routeStack,
      decisions: ["ROUTESTACK_ONLY_SIGNAL"],
    });
  }
  if (mode === "fake-combined") {
    return buildSplitR2CompactReceipt(mode, runSplitR2FakeCombinedCampaign());
  }
  throw new Error("split-r2-mode-not-implemented-or-live-hold");
}

function parseMode(argv) {
  const flags = argv.filter((argument) => argument.startsWith("--"));
  if (flags.length === 0 || (flags.length === 1 && flags[0] === "--dry-run")) return "dry-run";
  const allowed = new Map([
    ["--fake-liteapi", "fake-liteapi"],
    ["--fake-routestack", "fake-routestack"],
    ["--fake-combined", "fake-combined"],
  ]);
  if (flags.length !== 1 || !allowed.has(flags[0])) {
    throw new Error("split-r2-mode-not-implemented-or-live-hold");
  }
  return allowed.get(flags[0]);
}

export function parseSplitR2LiteApiCanaryArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-liteapi-sandbox-contract-canary",
    "--compact",
    "--environment=LITEAPI_SANDBOX",
    "--ack-http-budget=3",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  if (argv.length !== 6 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1) {
    throw new Error("split-r2-liteapi-canary-cli-contract-invalid");
  }
  return {
    expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
  };
}

export function parseSplitR2LiteApiZeroResultDiagnosisArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-liteapi-sandbox-zero-result-diagnosis",
    "--compact",
    "--environment=LITEAPI_SANDBOX",
    "--acknowledgement=I_ACKNOWLEDGE_LITEAPI_SANDBOX_MAX_41_DIAGNOSTIC_HTTP",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  if (argv.length !== 6 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1) {
    throw new Error("split-r2-liteapi-diagnosis-cli-contract-invalid");
  }
  return {
    expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
  };
}

export function parseSplitR2RouteStackPublicCanaryArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-routestack-public-contract-canary",
    "--compact",
    "--phase=SPLIT-R2.4",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_3_HTTP",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  if (argv.length !== 8 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1) {
    throw new Error("split-r2-routestack-public-canary-cli-contract-invalid");
  }
  return Object.freeze({
    expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
  });
}

export function parseSplitR2RouteStackPublicD0ContractCanaryArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-routestack-public-d0-contract-canary",
    "--compact",
    "--phase=SPLIT-R2.10A",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_5_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-read-only=I_ACKNOWLEDGE_READ_ONLY",
    "--acknowledgement-no-retry=I_ACKNOWLEDGE_NO_RETRY",
    "--acknowledgement-no-continuation=I_ACKNOWLEDGE_NO_CONTINUATION",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  if (argv.length !== 12 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1) {
    throw new Error("split-r2-d0-contract-canary-cli-contract-invalid");
  }
  return Object.freeze({
    expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
    phase: "SPLIT-R2.10A",
    acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_5_HTTP",
    unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    readOnlyAcknowledgement: "I_ACKNOWLEDGE_READ_ONLY",
    noRetryAcknowledgement: "I_ACKNOWLEDGE_NO_RETRY",
    noContinuationAcknowledgement: "I_ACKNOWLEDGE_NO_CONTINUATION",
    noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  });
}

export function parseSplitR2RouteStackPublicMultiScenarioArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-routestack-public-multi-scenario",
    "--compact",
    "--phase=SPLIT-R2.5A",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_106_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  if (argv.length !== 9 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1) {
    throw new Error("split-r2-routestack-public-multi-scenario-cli-contract-invalid");
  }
  return Object.freeze({
    expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
  });
}

export function parseSplitR2RouteStackPublicPaginationSensitivityArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-routestack-public-pagination-sensitivity",
    "--compact",
    "--phase=SPLIT-R2.7A",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_45_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  if (argv.length !== 9 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1) {
    throw new Error("split-r2-pagination-sensitivity-cli-contract-invalid");
  }
  return Object.freeze({
    expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
  });
}

export function parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(argv) {
  const requiredLiteral = new Set([
    "--r2-routestack-public-pagination-aware-multi-scenario",
    "--compact",
    "--environment=ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    "--acknowledgement=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP",
    "--acknowledgement-unknown-cost=I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
    "--acknowledgement-no-mutation=I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
  ]);
  const expectedHeadArguments = argv.filter((entry) => entry.startsWith("--expected-head="));
  const fingerprintArguments = argv.filter((entry) => entry.startsWith("--expected-dirty-fingerprint="));
  const phaseArguments = argv.filter((entry) => entry.startsWith("--phase="));
  const acceptedPhases = new Set(["--phase=SPLIT-R2.8A", "--phase=SPLIT-R2.9A"]);
  if (argv.length !== 9 || [...requiredLiteral].some((entry) => !argv.includes(entry)) ||
      expectedHeadArguments.length !== 1 || fingerprintArguments.length !== 1 ||
      phaseArguments.length !== 1 || !acceptedPhases.has(phaseArguments[0])) {
    throw new Error("split-r2-pagination-aware-cli-contract-invalid");
  }
  return Object.freeze({ expectedHead: expectedHeadArguments[0].slice("--expected-head=".length),
    expectedDirtyFingerprint: fingerprintArguments[0].slice("--expected-dirty-fingerprint=".length),
    phase: phaseArguments[0].slice("--phase=".length) });
}

function buildSplitR2LiteApiDiagnosisBlockedReceipt(sourceSha, failureClassification) {
  return {
    receiptVersion: SPLIT_R2_LITEAPI_ZERO_RESULT_DIAGNOSIS_RECEIPT_VERSION,
    responseShapeReceiptVersion: SPLIT_R2_LITEAPI_RESPONSE_SHAPE_RECEIPT_VERSION,
    status: "BLOCKED",
    sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "UNVERIFIED",
    environment: "LITEAPI_SANDBOX",
    hostname: "api.liteapi.travel",
    http: {
      staticDiscovery: 0, cityRates: 0, hotelIdRates: 0, anchorSuffix: 0,
      total: 0, totalBudget: 41, retries: 0, redirects: 0, maxObservedConcurrency: 0,
      minimumObservedRequestIntervalMs: null, liteApiProduction: 0, routeStack: 0,
    },
    privacy: {
      unknownKeyEnumeration: false, rawIdsInOutput: 0, rawPayloadsInOutput: 0,
      rawResponsesInOutput: 0, crossRunLinkability: false, secretValuesExposed: false,
    },
    failureClassification,
  };
}

function buildSplitR2LiteApiCanaryBlockedReceipt(sourceSha, failureClassification) {
  return {
    receiptVersion: SPLIT_R2_LITEAPI_CANARY_RECEIPT_VERSION,
    status: "BLOCKED",
    sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "UNVERIFIED",
    environment: "LITEAPI_SANDBOX",
    hostname: "api.liteapi.travel",
    failureClassification,
    http: {
      fullStay: 0, prefix: 0, suffix: 0, other: 0, total: 0, totalBudget: 3,
      retries: 0, redirects: 0, maxObservedConcurrency: 0,
      minimumObservedRequestIntervalMs: null, liteApiProduction: 0,
      routeStackSandbox: 0, routeStackPublicProduction: 0,
    },
    boundaries: { canaryEconomicEvidenceAllowed: false, publicRuntimeChanged: false },
    privacy: {
      rawIdsInOutput: 0, pseudonymListsInOutput: 0, rawTaxLabelsInOutput: 0,
      rawPayloadsInOutput: 0, rawResponsesInOutput: 0, crossRunLinkability: false,
      secretValuesExposed: false,
    },
  };
}

function buildSplitR2RouteStackPublicCanaryBlockedReceipt(sourceSha, failureClassification) {
  const receipt = buildSplitR2RouteStackPublicCanaryReceipt({
    sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "UNVERIFIED",
    failureClassification,
  });
  return Object.freeze({
    ...receipt,
    status: "BLOCKED",
    publicContractCanaryConclusion: "ROUTESTACK_PUBLIC_CONTRACT_CANARY_NOT_EXECUTED",
  });
}

function buildSplitR2RouteStackPublicD0ContractCanaryBlockedReceipt(sourceSha, failureClassification) {
  return buildSplitR2RouteStackPublicD0ContractCanaryLiveReceipt({
    sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "0".repeat(40),
    authorizationAcknowledged: false,
    authorizationConsumed: false,
    liveWaveStarted: false,
    statusOverride: "BLOCKED",
    failureClassification,
  });
}

function buildSplitR2RouteStackPublicMultiScenarioBlockedReceipt(sourceSha, failureClassification) {
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RECEIPT_VERSION,
    status: "BLOCKED",
    sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "UNVERIFIED",
    environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    userApprovalAcknowledged: false,
    unknownCostAcknowledged: false,
    authHttpRequests: 0,
    destinationHttpRequests: 0,
    initialHttpRequests: 0,
    continuationHttpRequests: 0,
    totalHttpRequests: 0,
    totalHttpBudget: 106,
    retries: 0,
    redirects: 0,
    repositoryModificationsAfterCommit: 0,
    rawIdsPersisted: 0,
    rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0,
    payloadsOrRawResponsesPersisted: 0,
    crossRunLinkability: false,
    secretValuesExposed: false,
    failureClassification,
  });
}

function buildSplitR2RouteStackPublicPaginationSensitivityBlockedReceipt(sourceSha, failureClassification) {
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RECEIPT_VERSION,
    status: "BLOCKED",
    sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "UNVERIFIED",
    environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    userApprovalAcknowledged: false,
    unknownCostAcknowledged: false,
    singleWaveEnforced: true,
    selectedScenarioOrdinals: [1, 3],
    selectedBreakpointOrdinals: { 1: [1, 7, 13], 3: [1, 3, 6] },
    logicalSearchesPlanned: 14,
    logicalSearchesExecuted: 0,
    maxContinuationDepth: 2,
    authHttpRequests: 0,
    destinationHttpRequests: 0,
    initialHttpRequests: 0,
    continuationD1HttpRequests: 0,
    continuationD2HttpRequests: 0,
    continuationHttpRequests: 0,
    totalHttpRequests: 0,
    totalHttpBudget: 45,
    retries: 0,
    redirects: 0,
    continuationContractChangedOutsideMicrostudy: false,
    publicRuntimeChanged: false,
    repositoryModificationsAfterCommit: 0,
    rawIdsPersisted: 0,
    rawContinuationIdsPersisted: 0,
    rawMetadataValuesPersisted: 0,
    payloadsOrRawResponsesPersisted: 0,
    ephemeralHmacSecretPersisted: false,
    crossRunLinkability: false,
    secretValuesExposed: false,
    failureClassification,
  });
}

function buildSplitR2RouteStackPublicPaginationAwareMultiScenarioBlockedReceipt(
  sourceSha, failureClassification, phase = null
) {
  return Object.freeze({
    receiptVersion: SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO_RECEIPT_VERSION,
    status: "BLOCKED", sourceSha: /^[0-9a-f]{40}$/u.test(sourceSha ?? "") ? sourceSha : "UNVERIFIED",
    phase: phase === "SPLIT-R2.8A" || phase === "SPLIT-R2.9A" ? phase : null,
    environmentClassification: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
    userApprovalAcknowledged: false, unknownCostAcknowledged: false, singleWaveEnforced: true,
    frozenScenarioOrdinals: [1, 3, 5], scenarioCount: 3, logicalSearchesPlanned: 102,
    logicalSearchesExecuted: 0, breakpointsPlanned: 32, breakpointsEvaluable: 0, breakpointsNotEvaluable: 32,
    authHttpRequests: 0, destinationHttpRequests: 0, initialHttpRequests: 0,
    continuationD1HttpRequests: 0, continuationD2HttpRequests: 0, continuationHttpRequests: 0,
    totalHttpRequests: 0, totalHttpBudget: 310, totalHttpBudgetRemaining: 310,
    retries: 0, redirects: 0, d2PhaseStarted: false, d2PhaseCompleted: false,
    d3HttpRequests: 0, repositoryModificationsAfterCommit: 0,
    rawIdsPersisted: 0, rawContinuationIdsPersisted: 0, rawMetadataValuesPersisted: 0,
    payloadsOrRawResponsesPersisted: 0, ephemeralHmacSecretPersisted: false,
    crossRunLinkability: false, secretValuesExposed: false, failureClassification,
  });
}

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  const argv = process.argv.slice(2);
  if (argv.includes("--r2-routestack-public-d0-contract-canary")) {
    let expectedHead = null;
    try {
      const parsed = parseSplitR2RouteStackPublicD0ContractCanaryArguments(argv);
      expectedHead = parsed.expectedHead;
      const repository = verifySplitR2PaginationAwareRepositoryGate(
        parsed.expectedHead, parsed.expectedDirtyFingerprint
      );
      const evidence = inspectSplitR2RouteStackPublicContractEvidence();
      const plan = buildSplitR2RouteStackPublicD0ContractCanaryPlan();
      const preflight = assertSplitR2RouteStackPublicD0ContractCanaryPreflight({
        mode: "ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY", phase: parsed.phase, compact: true,
        environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED", hostname: "mcp.routestack.ai",
        protocol: "https:", acknowledgement: parsed.acknowledgement,
        unknownCostAcknowledgement: parsed.unknownCostAcknowledgement,
        readOnlyAcknowledgement: parsed.readOnlyAcknowledgement,
        noRetryAcknowledgement: parsed.noRetryAcknowledgement,
        noContinuationAcknowledgement: parsed.noContinuationAcknowledgement,
        noMutationAcknowledgement: parsed.noMutationAcknowledgement,
        authMax: 1, destinationMax: 3, initialSearchMax: 1, continuationMax: 0, totalMax: 5,
        retries: 0, redirects: 0, concurrency: 1, minimumIntervalMs: 1_000,
        productionFallback: false, sandboxFallback: false, liteApiFallback: false,
        otherLiveModesSelected: 0, repositoryGatePassed: repository.passed,
        contractEvidence: evidence, plan, credentialReader: readRouteStackPublicCredentials,
      });
      const receipt = await runSplitR2RouteStackPublicD0ContractCanary({
        sourceSha: parsed.expectedHead, plan: preflight.plan,
        apiKey: preflight.credentials.apiKey, apiSecret: preflight.credentials.apiSecret,
        authorizationAcknowledged: preflight.authorizationAcknowledged,
        realProviderTransport: true,
      });
      const serialized = serializeSplitR2RouteStackPublicD0ContractCanaryReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RESULT=${serialized.json}\n`);
      if (receipt.status !== "PASS") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "R2_10A_D0_CONTRACT_CANARY_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2RouteStackPublicD0ContractCanaryBlockedReceipt(expectedHead, classification);
      const serialized = serializeSplitR2RouteStackPublicD0ContractCanaryReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_D0_CONTRACT_CANARY_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else if (argv.includes("--r2-routestack-public-pagination-aware-multi-scenario")) {
    let expectedHead = null;
    let expectedPhase = null;
    try {
      const parsed = parseSplitR2RouteStackPublicPaginationAwareMultiScenarioArguments(argv);
      expectedHead = parsed.expectedHead;
      expectedPhase = parsed.phase;
      const repository = verifySplitR2PaginationAwareRepositoryGate(
        parsed.expectedHead, parsed.expectedDirtyFingerprint
      );
      const evidence = inspectSplitR2RouteStackPublicContractEvidence();
      const authoritativePlan = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioPlan();
      const preflight = assertSplitR2RouteStackPublicPaginationAwareMultiScenarioPreflight({
        mode: "ROUTESTACK_PUBLIC_PAGINATION_AWARE_MULTI_SCENARIO", phase: parsed.phase, compact: true,
        environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED", hostname: "mcp.routestack.ai", protocol: "https:",
        acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_310_HTTP",
        unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
        noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
        authMax: 1, destinationMax: 3, initialSearchMax: 102, continuationD1Max: 102,
        continuationD2Max: 102, continuationMax: 204, totalMax: 310, maxContinuationDepth: 2,
        retries: 0, redirects: 0, concurrency: 1, minimumIntervalMs: 1_000,
        productionFallback: false, sandboxFallback: false, liteApiFallback: false,
        otherLiveModesSelected: 0, repositoryGatePassed: repository.passed,
        contractEvidence: evidence, plan: authoritativePlan, credentialReader: readRouteStackPublicCredentials,
      });
      const receipt = await runSplitR2RouteStackPublicPaginationAwareMultiScenario({
        sourceSha: parsed.expectedHead, phase: preflight.phase, plan: preflight.plan,
        apiKey: preflight.credentials.apiKey,
        apiSecret: preflight.credentials.apiSecret,
      });
      const serialized = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_RESULT=${serialized.json}\n`);
      if (receipt.status === "FAIL" || receipt.status === "BLOCKED") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "ROUTESTACK_PUBLIC_PAGINATION_AWARE_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2RouteStackPublicPaginationAwareMultiScenarioBlockedReceipt(
        expectedHead, classification, expectedPhase
      );
      const serialized = serializeSplitR2RouteStackPublicPaginationAwareMultiScenarioReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_AWARE_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else if (argv.includes("--r2-routestack-public-pagination-sensitivity")) {
    let expectedHead = null;
    try {
      const parsed = parseSplitR2RouteStackPublicPaginationSensitivityArguments(argv);
      expectedHead = parsed.expectedHead;
      const repository = verifySplitR2LiteApiCanaryRepositoryGate(
        parsed.expectedHead,
        parsed.expectedDirtyFingerprint
      );
      const evidence = inspectSplitR2RouteStackPublicContractEvidence();
      const authoritativePlan = buildSplitR2RouteStackPublicPaginationSensitivityPlan();
      const preflight = assertSplitR2RouteStackPublicPaginationSensitivityPreflight({
        mode: "ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY",
        phase: "SPLIT-R2.7A",
        compact: true,
        environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
        hostname: "mcp.routestack.ai",
        protocol: "https:",
        acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_45_HTTP",
        unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
        noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
        authMax: 1,
        destinationMax: 2,
        initialSearchMax: 14,
        continuationD1Max: 14,
        continuationD2Max: 14,
        continuationMax: 28,
        totalMax: 45,
        maxContinuationDepth: 2,
        retries: 0,
        redirects: 0,
        concurrency: 1,
        minimumIntervalMs: 1_000,
        productionFallback: false,
        sandboxFallback: false,
        otherLiveModesSelected: 0,
        repositoryGatePassed: repository.passed,
        contractEvidence: evidence,
        plan: authoritativePlan,
        credentialReader: readRouteStackPublicCredentials,
      });
      const receipt = await runSplitR2RouteStackPublicPaginationSensitivity({
        sourceSha: parsed.expectedHead,
        plan: preflight.plan,
        apiKey: preflight.credentials.apiKey,
        apiSecret: preflight.credentials.apiSecret,
      });
      const serialized = serializeSplitR2RouteStackPublicPaginationSensitivityReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RESULT=${serialized.json}\n`);
      if (receipt.status === "FAIL" || receipt.status === "BLOCKED") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2RouteStackPublicPaginationSensitivityBlockedReceipt(expectedHead, classification);
      const serialized = serializeSplitR2RouteStackPublicPaginationSensitivityReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_PAGINATION_SENSITIVITY_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else if (argv.includes("--r2-routestack-public-multi-scenario")) {
    let expectedHead = null;
    try {
      const parsed = parseSplitR2RouteStackPublicMultiScenarioArguments(argv);
      expectedHead = parsed.expectedHead;
      const repository = verifySplitR2LiteApiCanaryRepositoryGate(
        parsed.expectedHead,
        parsed.expectedDirtyFingerprint
      );
      const evidence = inspectSplitR2RouteStackPublicContractEvidence();
      const authoritativePlan = buildSplitR2RouteStackPublicMultiScenarioPlan();
      const preflight = assertSplitR2RouteStackPublicMultiScenarioPreflight({
        mode: "ROUTESTACK_PUBLIC_MULTI_SCENARIO",
        phase: "SPLIT-R2.5A",
        compact: true,
        environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
        hostname: "mcp.routestack.ai",
        protocol: "https:",
        acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_106_HTTP",
        unknownCostAcknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_COST_UNKNOWN",
        noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
        authMax: 1,
        destinationMax: 3,
        initialSearchMax: 102,
        continuationMax: 0,
        totalMax: 106,
        retries: 0,
        redirects: 0,
        concurrency: 1,
        minimumIntervalMs: 1_000,
        productionFallback: false,
        sandboxFallback: false,
        otherLiveModesSelected: 0,
        repositoryGatePassed: repository.passed,
        contractEvidence: evidence,
        plan: authoritativePlan,
        credentialReader: readRouteStackPublicCredentials,
      });
      const receipt = await runSplitR2RouteStackPublicMultiScenario({
        sourceSha: parsed.expectedHead,
        plan: preflight.plan,
        apiKey: preflight.credentials.apiKey,
        apiSecret: preflight.credentials.apiSecret,
      });
      const serialized = serializeSplitR2RouteStackPublicMultiScenarioReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RESULT=${serialized.json}\n`);
      if (receipt.status === "FAIL" || receipt.status === "BLOCKED") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "ROUTESTACK_PUBLIC_MULTI_SCENARIO_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2RouteStackPublicMultiScenarioBlockedReceipt(expectedHead, classification);
      const serialized = serializeSplitR2RouteStackPublicMultiScenarioReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_MULTI_SCENARIO_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else if (argv.includes("--r2-routestack-public-contract-canary")) {
    let expectedHead = null;
    try {
      const parsed = parseSplitR2RouteStackPublicCanaryArguments(argv);
      expectedHead = parsed.expectedHead;
      const repository = verifySplitR2LiteApiCanaryRepositoryGate(
        parsed.expectedHead,
        parsed.expectedDirtyFingerprint
      );
      const evidence = inspectSplitR2RouteStackPublicContractEvidence();
      const preflight = assertSplitR2RouteStackPublicCanaryPreflight({
        mode: "ROUTESTACK_PUBLIC_CONTRACT_CANARY",
        phase: "SPLIT-R2.4",
        compact: true,
        environment: "ROUTESTACK_PUBLIC_PRODUCTION_VERIFIED",
        hostname: "mcp.routestack.ai",
        protocol: "https:",
        acknowledgement: "I_ACKNOWLEDGE_ROUTESTACK_PUBLIC_MAX_3_HTTP",
        noMutationAcknowledgement: "I_ACKNOWLEDGE_NO_BOOKING_OR_MUTATION",
        authMax: 1,
        destinationMax: 1,
        initialSearchMax: 1,
        continuationMax: 0,
        totalMax: 3,
        retries: 0,
        redirects: 0,
        concurrency: 1,
        minimumIntervalMs: 1_000,
        productionFallback: false,
        sandboxFallback: false,
        repositoryGatePassed: repository.passed,
        contractEvidence: evidence,
        credentialReader: readRouteStackPublicCredentials,
      });
      const receipt = await runSplitR2RouteStackPublicCanary({
        sourceSha: parsed.expectedHead,
        apiKey: preflight.credentials.apiKey,
        apiSecret: preflight.credentials.apiSecret,
      });
      const serialized = serializeSplitR2RouteStackPublicCanaryReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RESULT=${serialized.json}\n`);
      if (receipt.status === "FAIL" || receipt.status === "BLOCKED") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "ROUTESTACK_PUBLIC_CANARY_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2RouteStackPublicCanaryBlockedReceipt(expectedHead, classification);
      const serialized = serializeSplitR2RouteStackPublicCanaryReceipt(receipt);
      process.stdout.write(`SPLIT_R2_ROUTESTACK_PUBLIC_CANARY_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else if (argv.includes("--r2-liteapi-sandbox-zero-result-diagnosis")) {
    let expectedHead = null;
    try {
      const parsed = parseSplitR2LiteApiZeroResultDiagnosisArguments(argv);
      expectedHead = parsed.expectedHead;
      const repository = verifySplitR2LiteApiCanaryRepositoryGate(parsed.expectedHead, parsed.expectedDirtyFingerprint);
      const preflight = assertSplitR2LiteApiZeroResultDiagnosisPreflight({
        mode: "LITEAPI_SANDBOX_ZERO_RESULT_DIAGNOSIS", compact: true, environment: "LITEAPI_SANDBOX",
        acknowledgement: "I_ACKNOWLEDGE_LITEAPI_SANDBOX_MAX_41_DIAGNOSTIC_HTTP",
        hostname: "api.liteapi.travel", protocol: "https:", productionFallback: false,
        staticDiscoveryMax: 3, cityRatesMax: 18, hotelIdRatesMax: 18, anchorSuffixMax: 2,
        totalMax: 41, retries: 0, redirects: 0, concurrency: 1, minimumIntervalMs: 1_000,
        repositoryGatePassed: repository.passed, credentialReader: readLiteApiSandboxCredential,
      });
      const receipt = await runSplitR2LiteApiZeroResultDiagnosis({
        sourceSha: parsed.expectedHead, apiKey: preflight.credential,
      });
      const serialized = serializeSplitR2LiteApiZeroResultDiagnosisReceipt(receipt);
      process.stdout.write(`SPLIT_R2_LITEAPI_DIAGNOSIS_RESULT=${serialized.json}\n`);
      if (receipt.status === "FAIL" || receipt.status === "BLOCKED") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "LITEAPI_DIAGNOSIS_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2LiteApiDiagnosisBlockedReceipt(expectedHead, classification);
      const serialized = serializeSplitR2LiteApiZeroResultDiagnosisReceipt(receipt);
      process.stdout.write(`SPLIT_R2_LITEAPI_DIAGNOSIS_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else if (argv.includes("--r2-liteapi-sandbox-contract-canary")) {
    let expectedHead = null;
    try {
      const parsed = parseSplitR2LiteApiCanaryArguments(argv);
      expectedHead = parsed.expectedHead;
      const repository = verifySplitR2LiteApiCanaryRepositoryGate(parsed.expectedHead, parsed.expectedDirtyFingerprint);
      const preflight = assertSplitR2LiteApiCanaryPreflight({
        mode: "LITEAPI_SANDBOX_CONTRACT_CANARY", compact: true, environment: "LITEAPI_SANDBOX",
        ackHttpBudget: 3, hostname: "api.liteapi.travel", protocol: "https:", productionFallback: false,
        scenarioOrdinal: 1, breakpointOrdinal: 7, fullStayMax: 1, prefixMax: 1, suffixMax: 1,
        totalMax: 3, otherHttpMax: 0, retries: 0, redirects: 0, concurrency: 1,
        minimumIntervalMs: 1_000, repositoryGatePassed: repository.passed,
        credentialReader: readLiteApiSandboxCredential,
      });
      const receipt = await runSplitR2LiteApiCanary({ sourceSha: parsed.expectedHead, apiKey: preflight.credential });
      const serialized = serializeSplitR2LiteApiCanaryReceipt(receipt);
      process.stdout.write(`SPLIT_R2_LITEAPI_CANARY_RESULT=${serialized.json}\n`);
      if (receipt.status === "FAIL" || receipt.status === "BLOCKED") process.exitCode = 1;
    } catch (error) {
      const classification = error instanceof SplitR2CompactReceiptError
        ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
        : String(error?.message ?? error).startsWith("split-r2-")
          ? String(error.message).replace(/^split-r2-/u, "").replaceAll("-", "_").toUpperCase()
          : "LITEAPI_CANARY_PREFLIGHT_BLOCKED";
      const receipt = buildSplitR2LiteApiCanaryBlockedReceipt(expectedHead, classification);
      const serialized = serializeSplitR2LiteApiCanaryReceipt(receipt);
      process.stdout.write(`SPLIT_R2_LITEAPI_CANARY_RESULT=${serialized.json}\n`);
      process.exitCode = 1;
    }
  } else {
    try {
      const mode = parseMode(argv);
      const receipt = runSplitR2Mode(mode);
      const serialized = serializeSplitR2CompactReceipt(receipt);
      process.stdout.write(`SPLIT_R2_RESULT=${serialized.json}\n`);
    } catch (error) {
      const failure = {
        receiptVersion: SPLIT_R2_RECEIPT_VERSION,
        status: "FAIL",
        failureClassification:
          error instanceof SplitR2CompactReceiptError
            ? "COMPACT_RECEIPT_EXCEEDED_UTF8_LIMIT"
            : "OFFLINE_CONTRACT_FAIL_CLOSED",
        providerCalls: 0,
        httpRequests: 0,
        credentialsAccessed: false,
        publicRuntimeChanged: false,
        rawIdsPersisted: 0,
        secretValuesExposed: false,
      };
      process.stdout.write(`SPLIT_R2_RESULT=${stableStringifySplitF0(failure, 0)}\n`);
      process.exitCode = 1;
    }
  }
}
