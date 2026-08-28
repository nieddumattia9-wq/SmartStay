import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { stableStringifySplitF0 } from "./run-split-f0-read-only-collector.mjs";
import {
  fingerprintSplitR1Identifier,
  splitR1CompactMedianInteger,
  splitR1CompactRoundedRatio,
  splitR1NightlyOracleBestPair,
  splitR1NightlyOracleOffersForState,
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
export const SPLIT_R2_LITEAPI_SANDBOX_BASE_URL = "https://api.liteapi.travel/v3.0";
export const SPLIT_R2_LITEAPI_RATES_PATH = "/hotels/rates";
export const SPLIT_R2_LITEAPI_CANARY_BREAKPOINT = 7;
export const SPLIT_R2_MIN_REQUEST_START_INTERVAL_MS = 1_000;
export const SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS = 10_000;
export const SPLIT_R2_MATERIAL_BASIS_POINTS = 1_000;
export const SPLIT_R2_ROUTE_STACK_SUBSET = Object.freeze([1, 3, 5]);
export const SPLIT_R2_LIVE_CAPABILITIES = Object.freeze({
  LITEAPI_SANDBOX_CANARY: "EXACT_3_HTTP_EXPLICIT_FLAG_AND_COMPACT_REQUIRED",
  LITEAPI_SANDBOX_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_SANDBOX_CANARY: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_SANDBOX_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_PUBLIC_PRODUCTION_CANARY: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
  ROUTESTACK_PUBLIC_PRODUCTION_CAMPAIGN: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
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

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  const argv = process.argv.slice(2);
  if (argv.includes("--r2-liteapi-sandbox-contract-canary")) {
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
