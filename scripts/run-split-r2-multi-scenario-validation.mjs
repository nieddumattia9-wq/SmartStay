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

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  const argv = process.argv.slice(2);
  if (argv.includes("--r2-routestack-public-pagination-sensitivity")) {
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
