import crypto from "node:crypto";
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
export const SPLIT_R2_MIN_REQUEST_START_INTERVAL_MS = 1_000;
export const SPLIT_R2_MATERIAL_ABSOLUTE_MINOR_UNITS = 10_000;
export const SPLIT_R2_MATERIAL_BASIS_POINTS = 1_000;
export const SPLIT_R2_ROUTE_STACK_SUBSET = Object.freeze([1, 3, 5]);
export const SPLIT_R2_LIVE_CAPABILITIES = Object.freeze({
  LITEAPI_SANDBOX_CANARY: "NOT_IMPLEMENTED_OR_LIVE_HOLD",
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

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  try {
    const mode = parseMode(process.argv.slice(2));
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
