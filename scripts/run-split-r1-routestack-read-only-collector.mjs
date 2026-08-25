import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSplitF0LogicalSearchPlan,
  loadSplitF0ScenarioMatrix,
  stableStringifySplitF0,
} from "./run-split-f0-read-only-collector.mjs";
import {
  SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1,
  splitF0MinorUnitsToMoneyV1,
  splitF0MoneyToMinorUnitsV1,
} from "../src/engine-v3/evaluation/splitF0EconomicFeasibilityPilotV3.ts";

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const SPLIT_R1_REPOSITORY_ROOT = path.resolve(CURRENT_DIRECTORY, "..");
export const SPLIT_R1_SERVER_ENV_PATH = path.join(SPLIT_R1_REPOSITORY_ROOT, "server", ".env");
export const SPLIT_R1_OFFICIAL_BASE_URL = "https://mcp.routestack.ai";
export const SPLIT_R1_AUTH_ENDPOINT = "/mcp/auth/partner-token";
export const SPLIT_R1_DESTINATION_ENDPOINT = "/mcp/hotel/search-destinations";
export const SPLIT_R1_HOTEL_SEARCH_ENDPOINT = "/mcp/hotel/search-hotels";
export const SPLIT_R1_EXPECTED_DURATIONS = [5, 7, 10, 12, 14, 21, 28, 30];
export const SPLIT_R1_MAX_CONTINUATIONS_PER_SEARCH = 2;
export const SPLIT_R1_HARD_HOTEL_SEARCH_HTTP_BUDGET = 80;
export const SPLIT_R1_HARD_TOTAL_ROUTESTACK_HTTP_BUDGET = 100;
export const SPLIT_R1_MAX_REQUESTS_PER_SECOND = 1;
export const SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS = 1_000;
export const SPLIT_R1_RETRIES = 0;
export const SPLIT_R1_CONCURRENCY = 1;
export const SPLIT_R1_HTTP_TIMEOUT_MS = 120_000;
export const SPLIT_R1_LIVE_CONFIRMATIONS = [
  "--execute-production-read-only",
  "--confirm-routestack-search-only",
];

const ROUTESTACK_ENVIRONMENT_NAMES = Object.freeze({
  baseUrl: "ROUTESTACK_BASE_URL",
  apiKey: "ROUTESTACK_API_KEY",
  apiSecret: "ROUTESTACK_API_SECRET",
});

const ALLOWED_ENDPOINTS = new Set([
  SPLIT_R1_AUTH_ENDPOINT,
  SPLIT_R1_DESTINATION_ENDPOINT,
  SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
]);

const FORBIDDEN_ENDPOINT_WORDS = [
  "detail",
  "room",
  "rate",
  "revalidate",
  "prebook",
  "book",
  "booking",
  "cancel",
  "payment",
  "wallet",
  "webhook",
];

const FORBIDDEN_PERSISTED_KEYS = new Set([
  "apikey",
  "apisecret",
  "authorization",
  "cookie",
  "correlationid",
  "destinationid",
  "header",
  "hmac",
  "hotelid",
  "jwt",
  "nextresultskey",
  "nonce",
  "offeringid",
  "offerid",
  "partnerToken".toLowerCase(),
  "rateid",
  "roomid",
  "token",
]);

const SPLIT_R1_DESTINATION_CITY_ALIASES = Object.freeze({
  roma: ["roma", "rome"],
  milano: ["milano", "milan"],
  lisboa: ["lisboa", "lisbon"],
  barcelona: ["barcelona"],
  firenze: ["firenze", "florence"],
  berlin: ["berlin"],
  wien: ["wien", "vienna"],
  paris: ["paris"],
});

const SPLIT_R1_DESTINATION_COUNTRY_ALIASES = Object.freeze({
  AT: ["at", "aut", "austria"],
  DE: ["de", "deu", "germany", "deutschland"],
  ES: ["es", "esp", "spain", "espana"],
  FR: ["fr", "fra", "france"],
  IT: ["it", "ita", "italy", "italia"],
  PT: ["pt", "prt", "portugal"],
});

const SPLIT_R1_COMPATIBLE_DESTINATION_TYPES = new Set(["city", "destination"]);

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function addUtcDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (!Number.isInteger(days) || Number.isNaN(date.getTime())) {
    throw new Error("split-r1-date-input-invalid");
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeResponseContainer(payload) {
  const outer = payload?.result;
  return outer !== null && typeof outer === "object" && !Array.isArray(outer)
    ? outer
    : payload;
}

function getResponseItems(payload) {
  const container = normalizeResponseContainer(payload);
  return Array.isArray(container?.result) ? container.result : [];
}

function finiteNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function assertSafeIntegerSeconds(timestamp) {
  if (!Number.isSafeInteger(timestamp) || timestamp < 1_000_000_000 || timestamp > 9_999_999_999) {
    throw new Error("split-r1-auth-timestamp-not-integer-seconds");
  }
}

export function parseSplitR1Arguments(argv) {
  const allowed = new Set(["--dry-run", ...SPLIT_R1_LIVE_CONFIRMATIONS]);
  for (const argument of argv) {
    if (!allowed.has(argument)) {
      throw new Error(`split-r1-unknown-argument:${argument}`);
    }
  }
  if (argv.includes("--dry-run") && SPLIT_R1_LIVE_CONFIRMATIONS.some((flag) => argv.includes(flag))) {
    throw new Error("split-r1-incompatible-mode-flags");
  }
  const confirmationsPresent = SPLIT_R1_LIVE_CONFIRMATIONS.filter((flag) => argv.includes(flag));
  if (confirmationsPresent.length === 0) {
    return { mode: "dry-run" };
  }
  if (confirmationsPresent.length !== SPLIT_R1_LIVE_CONFIRMATIONS.length) {
    throw new Error("split-r1-live-confirmations-incomplete");
  }
  return { mode: "execute-production-read-only" };
}

export function validateSplitR1BaseUrl(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("split-r1-base-url-invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "mcp.routestack.ai" ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    (parsed.pathname !== "" && parsed.pathname !== "/") ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("split-r1-base-url-not-allowlisted");
  }
  return SPLIT_R1_OFFICIAL_BASE_URL;
}

export function assertSplitR1EndpointAllowed(method, endpointPath) {
  if (method !== "POST" || !ALLOWED_ENDPOINTS.has(endpointPath)) {
    throw new Error("split-r1-endpoint-not-allowlisted");
  }
  if (
    endpointPath !== SPLIT_R1_HOTEL_SEARCH_ENDPOINT &&
    FORBIDDEN_ENDPOINT_WORDS.some((word) => endpointPath.toLowerCase().includes(word))
  ) {
    throw new Error("split-r1-forbidden-endpoint");
  }
  return true;
}

export function createSplitR1PartnerTokenRequest({
  apiKey,
  apiSecret,
  now = Date.now,
  randomUUID = crypto.randomUUID,
}) {
  if (typeof apiKey !== "string" || apiKey.length === 0 || typeof apiSecret !== "string" || apiSecret.length === 0) {
    throw new Error("split-r1-production-credentials-missing");
  }
  const timestamp = Math.floor(now() / 1000);
  assertSafeIntegerSeconds(timestamp);
  const nonce = randomUUID();
  if (typeof nonce !== "string" || nonce.length === 0) {
    throw new Error("split-r1-auth-nonce-invalid");
  }
  const hmac = crypto
    .createHmac("sha256", apiSecret)
    .update(`${apiKey}:${timestamp}:${nonce}`)
    .digest("base64url");
  return { apiKey, timestamp, nonce, hmac };
}

export function splitR1HaversineKm(left, right) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left.latitude)) *
      Math.cos(radians(right.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSplitR1DestinationIdentity(value) {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function splitR1DelimitedIdentityPart(value, position) {
  if (typeof value !== "string") return null;
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return position === "first" ? parts[0] : parts.at(-1);
}

function splitR1ScenarioCityAliases(scenario) {
  const canonical = normalizeSplitR1DestinationIdentity(scenario?.destination?.label);
  if (canonical === null) return new Set();
  return new Set(SPLIT_R1_DESTINATION_CITY_ALIASES[canonical] ?? [canonical]);
}

function splitR1ScenarioCountryAliases(scenario) {
  const countryCode = typeof scenario?.destination?.countryCode === "string"
    ? scenario.destination.countryCode.toUpperCase()
    : "";
  return new Set(SPLIT_R1_DESTINATION_COUNTRY_ALIASES[countryCode] ?? []);
}

function splitR1CandidateIdentity(candidate, scenario) {
  const cityAliases = splitR1ScenarioCityAliases(scenario);
  const countryAliases = splitR1ScenarioCountryAliases(scenario);
  const cityValues = [
    candidate?.city,
    splitR1DelimitedIdentityPart(candidate?.fullName, "first"),
    splitR1DelimitedIdentityPart(candidate?.label, "first"),
    splitR1DelimitedIdentityPart(candidate?.name, "first"),
  ]
    .map(normalizeSplitR1DestinationIdentity)
    .filter(Boolean);
  const countryValues = [
    candidate?.country,
    splitR1DelimitedIdentityPart(candidate?.fullName, "last"),
    splitR1DelimitedIdentityPart(candidate?.label, "last"),
    splitR1DelimitedIdentityPart(candidate?.name, "last"),
  ]
    .map(normalizeSplitR1DestinationIdentity)
    .filter(Boolean);
  const normalizedType = normalizeSplitR1DestinationIdentity(candidate?.type);
  return {
    cityMatches: cityAliases.size > 0 && cityValues.some((value) => cityAliases.has(value)),
    countryMatches:
      countryAliases.size > 0 && countryValues.some((value) => countryAliases.has(value)),
    typeCompatible:
      normalizedType === null || SPLIT_R1_COMPATIBLE_DESTINATION_TYPES.has(normalizedType),
  };
}

function splitR1CoordinateNumber(value) {
  if (typeof value === "string" && value.trim().length === 0) return null;
  return finiteNumber(value);
}

function splitR1CandidateCoordinates(candidate) {
  if (!("coordinates" in (candidate ?? {})) || candidate.coordinates === null) {
    return { state: "absent" };
  }
  if (
    typeof candidate.coordinates !== "object" ||
    Array.isArray(candidate.coordinates) ||
    !("lat" in candidate.coordinates) ||
    !("long" in candidate.coordinates)
  ) {
    return { state: "invalid" };
  }
  const latitude = splitR1CoordinateNumber(candidate.coordinates.lat);
  const longitude = splitR1CoordinateNumber(candidate.coordinates.long);
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { state: "invalid" };
  }
  return { state: "finite", latitude, longitude };
}

function splitR1FrozenScenarioCoordinates(scenario) {
  const latitude = splitR1CoordinateNumber(scenario?.destination?.latitude);
  const longitude = splitR1CoordinateNumber(scenario?.destination?.longitude);
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("split-r1-frozen-destination-coordinates-invalid");
  }
  return { latitude, longitude };
}

export function selectSplitR1DestinationCandidate(payload, scenario) {
  const frozenCoordinates = splitR1FrozenScenarioCoordinates(scenario);
  const candidates = getResponseItems(payload).map((candidate) => {
    const id = candidate?.id ?? candidate?.destinationId;
    const coordinates = splitR1CandidateCoordinates(candidate);
    const identity = splitR1CandidateIdentity(candidate, scenario);
    const validId = typeof id === "string" && id.trim().length > 0;
    if (coordinates.state !== "finite") {
      return { id, validId, coordinates, identity };
    }
    const distanceKm = splitR1HaversineKm(frozenCoordinates, coordinates);
    const swappedCoordinates = {
      latitude: coordinates.longitude,
      longitude: coordinates.latitude,
    };
    const swappedCoordinatesValid =
      swappedCoordinates.latitude >= -90 &&
      swappedCoordinates.latitude <= 90 &&
      swappedCoordinates.longitude >= -180 &&
      swappedCoordinates.longitude <= 180;
    const swappedDistanceKm = swappedCoordinatesValid
      ? splitR1HaversineKm(frozenCoordinates, swappedCoordinates)
      : null;
    return {
      id,
      validId,
      coordinates,
      identity,
      distanceKm,
      appearsSwapped:
        distanceKm > 25 && swappedDistanceKm !== null && swappedDistanceKm <= 25,
    };
  });
  const geospatialCandidates = candidates
    .filter((candidate) => candidate.validId && candidate.coordinates.state === "finite")
    .sort(
      (left, right) => left.distanceKm - right.distanceKm || left.id.localeCompare(right.id)
    );
  if (geospatialCandidates[0]?.distanceKm <= 25) {
    if (
      geospatialCandidates[1] &&
      Math.abs(geospatialCandidates[0].distanceKm - geospatialCandidates[1].distanceKm) < 1e-9
    ) {
      throw new Error("split-r1-destination-nearest-ambiguous");
    }
    const selected = geospatialCandidates[0];
    return {
      id: selected.id,
      latitude: selected.coordinates.latitude,
      longitude: selected.coordinates.longitude,
      distanceKm: selected.distanceKm,
      selectionMode: "GEOSPATIAL_PRIMARY",
      destinationIdSource: "ROUTESTACK_DESTINATION_RESPONSE",
      searchCoordinatesSource: "ROUTESTACK_DESTINATION_RESPONSE",
      providerDestinationCoordinatesAvailable: true,
    };
  }
  if (geospatialCandidates.some((candidate) => candidate.appearsSwapped)) {
    throw new Error("split-r1-destination-coordinates-appear-swapped");
  }
  const identityMatches = candidates.filter(
    (candidate) =>
      candidate.validId &&
      candidate.identity.cityMatches &&
      candidate.identity.countryMatches &&
      candidate.identity.typeCompatible
  );
  if (identityMatches.some((candidate) => candidate.coordinates.state === "invalid")) {
    throw new Error("split-r1-destination-text-match-coordinates-invalid");
  }
  if (
    identityMatches.some(
      (candidate) =>
        candidate.coordinates.state === "finite" && candidate.distanceKm > 25
    )
  ) {
    throw new Error("split-r1-destination-text-match-coordinates-contradict");
  }
  const coordinateLessMatches = identityMatches.filter(
    (candidate) => candidate.coordinates.state === "absent"
  );
  if (coordinateLessMatches.length > 1) {
    throw new Error("split-r1-destination-nearest-ambiguous");
  }
  if (coordinateLessMatches.length === 0) {
    throw new Error("split-r1-destination-not-within-25km");
  }
  return {
    id: coordinateLessMatches[0].id,
    latitude: frozenCoordinates.latitude,
    longitude: frozenCoordinates.longitude,
    distanceKm: null,
    selectionMode: "UNIQUE_TEXT_COUNTRY_MATCH_WITH_FROZEN_COORDINATES",
    destinationIdSource: "ROUTESTACK_DESTINATION_RESPONSE",
    searchCoordinatesSource: "FROZEN_SCENARIO_MATRIX",
    providerDestinationCoordinatesAvailable: false,
  };
}

export function createSplitR1DestinationRequest(scenario) {
  return { query: scenario.destination.label, type: "DESTINATION" };
}

export function createSplitR1HotelSearchRequest(logicalSearch, destination) {
  const occupancy = logicalSearch.request.occupancy;
  const childAges = [...occupancy.childAges];
  const rooms = Array.from({ length: occupancy.rooms }, () => ({
    adults: occupancy.adults,
    children: childAges.length,
    childAges: [...childAges],
  }));
  if (rooms.length !== occupancy.rooms || rooms.some((room) => room.children !== room.childAges.length)) {
    throw new Error("split-r1-room-occupancy-invalid");
  }
  return {
    destinationId: destination.id,
    lat: destination.latitude,
    long: destination.longitude,
    checkIn: logicalSearch.request.checkIn,
    checkOut: logicalSearch.request.checkOut,
    roomCount: rooms.length,
    rooms,
    currency: logicalSearch.request.currency,
  };
}

export function createSplitR1ContinuationRequest(originalRequest, responsePayload, continuationOrdinal) {
  if (!Number.isInteger(continuationOrdinal) || continuationOrdinal < 1 || continuationOrdinal > 2) {
    throw new Error("split-r1-continuation-budget-exceeded");
  }
  const container = normalizeResponseContainer(responsePayload);
  for (const key of ["token", "correlationId", "nextResultsKey"]) {
    if (typeof container?.[key] !== "string" || container[key].length === 0) {
      throw new Error(`split-r1-continuation-${key.toLowerCase()}-missing`);
    }
  }
  return {
    ...originalRequest,
    token: container.token,
    correlationId: container.correlationId,
    nextResultsKey: container.nextResultsKey,
  };
}

export function fingerprintSplitR1Identifier(rawIdentifier, ephemeralRunKey) {
  if (typeof rawIdentifier !== "string" || rawIdentifier.length === 0 || !Buffer.isBuffer(ephemeralRunKey)) {
    throw new Error("split-r1-fingerprint-input-invalid");
  }
  return `hmac-sha256:${crypto.createHmac("sha256", ephemeralRunKey).update(rawIdentifier).digest("hex")}`;
}

export function normalizeSplitR1SearchResponse(payload, { logicalSearch, ephemeralRunKey }) {
  const container = normalizeResponseContainer(payload);
  const currency = typeof container?.currency === "string" && container.currency.length === 3
    ? container.currency.toUpperCase()
    : null;
  const normalized = [];
  for (const hotel of getResponseItems(payload)) {
    const rawId = hotel?.id ?? hotel?.hotelId;
    const price = finiteNumber(hotel?.ourprice);
    if (typeof rawId !== "string" || rawId.length === 0 || currency === null || price === null || price <= 0) {
      continue;
    }
    let totalMinorUnits;
    try {
      totalMinorUnits = splitF0MoneyToMinorUnitsV1(price);
    } catch {
      continue;
    }
    normalized.push({
      schemaVersion: "stayopti.split-r1.search-level-offer@1",
      logicalSearchId: logicalSearch.logicalSearchId,
      scenarioId: logicalSearch.scenarioId,
      searchKind: logicalSearch.kind,
      splitPointId: logicalSearch.splitPointId,
      segmentOrdinal: logicalSearch.segmentOrdinal,
      propertyFingerprint: fingerprintSplitR1Identifier(rawId, ephemeralRunKey),
      totalMinorUnits,
      total: splitF0MinorUnitsToMoneyV1(totalMinorUnits),
      currency,
      basePriceDiagnosticAvailable: finiteNumber(hotel?.baseprice) !== null,
      providerSavingUsed: false,
      taxCompleteness: "unknown",
      comparabilityCeiling: "CONDITIONAL_COMPARABLE",
      evidenceLimits: [
        "search-level-total-cost-semantics-unproven",
        "taxes-and-mandatory-costs-unproven",
        "room-board-cancellation-payment-unproven",
      ],
    });
  }
  return normalized.sort(
    (left, right) =>
      left.totalMinorUnits - right.totalMinorUnits ||
      left.propertyFingerprint.localeCompare(right.propertyFingerprint)
  );
}

function frictionSensitivity(grossSavingMinorUnits) {
  return SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1.map((frictionEur) => {
    const frictionMinorUnits = splitF0MoneyToMinorUnitsV1(frictionEur);
    const netMinorUnits = grossSavingMinorUnits - frictionMinorUnits;
    return {
      hypotheticalFrictionEur: frictionEur,
      netSavingMinorUnits: netMinorUnits,
      netSaving: splitF0MinorUnitsToMoneyV1(netMinorUnits),
    };
  });
}

export function evaluateSplitR1SearchLevelScenario(scenario, offers) {
  const fullOffers = offers
    .filter((offer) => offer.searchKind === "full-stay" && offer.currency === scenario.currency)
    .sort(
      (left, right) =>
        left.totalMinorUnits - right.totalMinorUnits ||
        left.propertyFingerprint.localeCompare(right.propertyFingerprint)
    );
  const baseline = fullOffers[0] ?? null;
  const splitResults = [];
  for (const splitPoint of scenario.splitPoints) {
    const firstOffers = offers.filter(
      (offer) =>
        offer.splitPointId === splitPoint.splitPointId &&
        offer.segmentOrdinal === 0 &&
        offer.currency === scenario.currency
    );
    const secondOffers = offers.filter(
      (offer) =>
        offer.splitPointId === splitPoint.splitPointId &&
        offer.segmentOrdinal === 1 &&
        offer.currency === scenario.currency
    );
    const pairs = [];
    for (const first of firstOffers) {
      for (const second of secondOffers) {
        if (first.propertyFingerprint === second.propertyFingerprint) continue;
        pairs.push({
          first,
          second,
          splitTotalMinorUnits: first.totalMinorUnits + second.totalMinorUnits,
        });
      }
    }
    pairs.sort(
      (left, right) =>
        left.splitTotalMinorUnits - right.splitTotalMinorUnits ||
        left.first.propertyFingerprint.localeCompare(right.first.propertyFingerprint) ||
        left.second.propertyFingerprint.localeCompare(right.second.propertyFingerprint)
    );
    const bestPair = pairs[0] ?? null;
    if (baseline === null || bestPair === null) {
      splitResults.push({
        splitPointId: splitPoint.splitPointId,
        comparabilityLevel: "NON_COMPARABLE",
        reason: baseline === null ? "fixed-full-stay-baseline-missing" : "distinct-property-pair-missing",
      });
      continue;
    }
    const grossSavingMinorUnits = baseline.totalMinorUnits - bestPair.splitTotalMinorUnits;
    const grossSavingRatio = grossSavingMinorUnits / baseline.totalMinorUnits;
    const outlierFlags = [];
    if (Math.abs(grossSavingRatio) > 0.5) outlierFlags.push("SAVING_RATIO_OUTLIER");
    splitResults.push({
      splitPointId: splitPoint.splitPointId,
      comparabilityLevel: "CONDITIONAL_COMPARABLE",
      evidenceLimits: uniqueSorted([
        ...baseline.evidenceLimits,
        ...bestPair.first.evidenceLimits,
        ...bestPair.second.evidenceLimits,
      ]),
      knownIncompatibilities: [],
      fixedBaselineTotalMinorUnits: baseline.totalMinorUnits,
      fixedBaselineTotal: splitF0MinorUnitsToMoneyV1(baseline.totalMinorUnits),
      splitTotalMinorUnits: bestPair.splitTotalMinorUnits,
      splitTotal: splitF0MinorUnitsToMoneyV1(bestPair.splitTotalMinorUnits),
      grossSavingMinorUnits,
      grossSaving: splitF0MinorUnitsToMoneyV1(grossSavingMinorUnits),
      grossSavingRatio,
      frictionSensitivity: frictionSensitivity(grossSavingMinorUnits),
      outlierFlags,
      headlineEligible: outlierFlags.length === 0,
      publicRecommendationAllowed: false,
      policyEligible: false,
    });
  }
  return {
    scenarioId: scenario.scenarioId,
    fixedBaseline: baseline === null
      ? null
      : {
          propertyFingerprint: baseline.propertyFingerprint,
          totalMinorUnits: baseline.totalMinorUnits,
          total: baseline.total,
          currency: baseline.currency,
          selectedBeforeSplit: true,
        },
    strictComparisons: 0,
    conditionalComparisons: splitResults.filter(
      (result) => result.comparabilityLevel === "CONDITIONAL_COMPARABLE"
    ).length,
    splitResults,
  };
}

export function assertSplitR1PersistedPayloadSafe(payload) {
  const visit = (value, keyPath = []) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...keyPath, String(index)]));
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_PERSISTED_KEYS.has(key.toLowerCase())) {
        throw new Error(`split-r1-forbidden-persisted-key:${[...keyPath, key].join(".")}`);
      }
      visit(child, [...keyPath, key]);
    }
  };
  visit(payload);
  return true;
}

export function buildSplitR1DryRunPlan(matrix) {
  const logicalSearches = buildSplitF0LogicalSearchPlan(matrix);
  const durations = matrix.scenarios.map((scenario) => scenario.nights);
  if (stableStringifySplitF0(durations) !== stableStringifySplitF0(SPLIT_R1_EXPECTED_DURATIONS)) {
    throw new Error("split-r1-duration-matrix-mismatch");
  }
  return {
    schemaVersion: "stayopti.split-r1.dry-run@1",
    status: "PASS",
    mode: "DRY_RUN_ONLY",
    scenarios: matrix.scenarios.length,
    durations,
    logicalSearches: logicalSearches.length,
    httpRequests: 0,
    searchesByScenario: Object.fromEntries(
      matrix.scenarios.map((scenario) => [
        scenario.scenarioId,
        logicalSearches.filter((search) => search.scenarioId === scenario.scenarioId).length,
      ])
    ),
    strictComparabilityAllowed: false,
    conditionalComparabilityImplemented: true,
    fixedBaselineImplemented: true,
    publicRecommendationAllowed: false,
    policyEligible: false,
  };
}

function ensureServerEnvBinding(execArgv) {
  const bindings = execArgv
    .filter((argument) => argument.startsWith("--env-file="))
    .map((argument) => argument.slice("--env-file=".length))
    .map((value) => path.resolve(value));
  if (bindings.length !== 1 || bindings[0].toLowerCase() !== SPLIT_R1_SERVER_ENV_PATH.toLowerCase()) {
    throw new Error("split-r1-live-requires-server-env-native-binding");
  }
}

function resolveProductionConfiguration(environment, execArgv) {
  ensureServerEnvBinding(execArgv);
  const baseUrl = validateSplitR1BaseUrl(environment[ROUTESTACK_ENVIRONMENT_NAMES.baseUrl]);
  const apiKey = environment[ROUTESTACK_ENVIRONMENT_NAMES.apiKey];
  const apiSecret = environment[ROUTESTACK_ENVIRONMENT_NAMES.apiSecret];
  if (typeof apiKey !== "string" || apiKey.length === 0 || typeof apiSecret !== "string" || apiSecret.length === 0) {
    throw new Error("split-r1-production-credentials-missing");
  }
  return { baseUrl, apiKey, apiSecret };
}

async function parseJsonResponse(response, operation) {
  if (response.status !== 200) {
    throw new Error(`split-r1-${operation}-http-${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`split-r1-${operation}-content-type-invalid`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`split-r1-${operation}-json-invalid`);
  }
}

function requestClassForEndpoint(endpointPath) {
  if (endpointPath === SPLIT_R1_HOTEL_SEARCH_ENDPOINT) return "hotel-search";
  if (endpointPath === SPLIT_R1_DESTINATION_ENDPOINT) return "destination";
  if (endpointPath === SPLIT_R1_AUTH_ENDPOINT) return "authentication";
  throw new Error("split-r1-request-class-unknown");
}

function validateRestrictiveLimit(value, hardLimit, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`split-r1-${label}-invalid`);
  }
  if (value > hardLimit) {
    throw new Error(`split-r1-${label}-increase-prohibited`);
  }
  return value;
}

export function createSplitR1RequestBudgetLedger({
  hotelSearchHttpBudget = SPLIT_R1_HARD_HOTEL_SEARCH_HTTP_BUDGET,
  totalRouteStackHttpBudget = SPLIT_R1_HARD_TOTAL_ROUTESTACK_HTTP_BUDGET,
} = {}) {
  const hotelLimit = validateRestrictiveLimit(
    hotelSearchHttpBudget,
    SPLIT_R1_HARD_HOTEL_SEARCH_HTTP_BUDGET,
    "hotel-search-http-budget"
  );
  const totalLimit = validateRestrictiveLimit(
    totalRouteStackHttpBudget,
    SPLIT_R1_HARD_TOTAL_ROUTESTACK_HTTP_BUDGET,
    "total-routestack-http-budget"
  );
  if (hotelLimit > totalLimit) {
    throw new Error("split-r1-hotel-budget-exceeds-total-budget");
  }
  let totalRouteStackRequests = 0;
  let hotelSearchRequests = 0;
  const requestsByClass = {
    authentication: 0,
    destination: 0,
    "hotel-search": 0,
  };

  return {
    reserve(requestClass) {
      if (!(requestClass in requestsByClass)) {
        throw new Error("split-r1-budget-request-class-invalid");
      }
      if (totalRouteStackRequests + 1 > totalLimit) {
        return {
          reserved: false,
          reason: "TOTAL_ROUTESTACK_HTTP_BUDGET_EXHAUSTED",
        };
      }
      if (requestClass === "hotel-search" && hotelSearchRequests + 1 > hotelLimit) {
        return {
          reserved: false,
          reason: "HOTEL_SEARCH_HTTP_BUDGET_EXHAUSTED",
        };
      }
      totalRouteStackRequests += 1;
      requestsByClass[requestClass] += 1;
      if (requestClass === "hotel-search") hotelSearchRequests += 1;
      return {
        reserved: true,
        ordinal: totalRouteStackRequests,
        hotelSearchOrdinal: requestClass === "hotel-search" ? hotelSearchRequests : null,
      };
    },
    snapshot() {
      return {
        hardHotelSearchHttpBudget: SPLIT_R1_HARD_HOTEL_SEARCH_HTTP_BUDGET,
        hardTotalRouteStackHttpBudget: SPLIT_R1_HARD_TOTAL_ROUTESTACK_HTTP_BUDGET,
        effectiveHotelSearchHttpBudget: hotelLimit,
        effectiveTotalRouteStackHttpBudget: totalLimit,
        totalRouteStackRequests,
        hotelSearchRequests,
        requestsByClass: { ...requestsByClass },
        remainingHotelSearchRequests: hotelLimit - hotelSearchRequests,
        remainingTotalRouteStackRequests: totalLimit - totalRouteStackRequests,
      };
    },
  };
}

export function createSplitR1MonotonicRateLimiter({
  monotonicNow = () => performance.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  minRequestStartIntervalMs = SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS,
} = {}) {
  if (typeof monotonicNow !== "function" || typeof sleep !== "function") {
    throw new Error("split-r1-rate-limiter-dependency-invalid");
  }
  if (
    !Number.isFinite(minRequestStartIntervalMs) ||
    minRequestStartIntervalMs < SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS
  ) {
    throw new Error("split-r1-rate-limit-increase-prohibited");
  }
  let lastRequestStart = null;
  return {
    async awaitStartSlot() {
      const beforeWait = monotonicNow();
      if (!Number.isFinite(beforeWait)) throw new Error("split-r1-monotonic-clock-invalid");
      if (lastRequestStart !== null) {
        const elapsed = beforeWait - lastRequestStart;
        const waitMilliseconds = Math.max(0, minRequestStartIntervalMs - elapsed);
        if (waitMilliseconds > 0) await sleep(waitMilliseconds);
      }
      const requestStart = monotonicNow();
      if (!Number.isFinite(requestStart)) throw new Error("split-r1-monotonic-clock-invalid");
      if (
        lastRequestStart !== null &&
        requestStart - lastRequestStart < minRequestStartIntervalMs
      ) {
        throw new Error("split-r1-rate-limit-interval-not-satisfied");
      }
      lastRequestStart = requestStart;
      return requestStart;
    },
  };
}

export class SplitR1BudgetBoundedError extends Error {
  constructor(reason) {
    super(`split-r1-budget-bounded:${reason}`);
    this.name = "SplitR1BudgetBoundedError";
    this.code = "SPLIT_R1_BUDGET_BOUNDED";
    this.reason = reason;
  }
}

function isSplitR1BudgetBoundedError(error) {
  return error instanceof SplitR1BudgetBoundedError;
}

export function createSplitR1NativeTransport({
  baseUrl = SPLIT_R1_OFFICIAL_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = SPLIT_R1_HTTP_TIMEOUT_MS,
  budgetLimits,
  monotonicNow,
  sleep,
  minRequestStartIntervalMs = SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS,
}) {
  validateSplitR1BaseUrl(baseUrl);
  if (typeof fetchImpl !== "function") throw new Error("split-r1-native-fetch-unavailable");
  const budgetLedger = createSplitR1RequestBudgetLedger(budgetLimits);
  const rateLimiter = createSplitR1MonotonicRateLimiter({
    monotonicNow,
    sleep,
    minRequestStartIntervalMs,
  });
  let activeRequests = 0;
  let maxObservedConcurrency = 0;
  let serializedTail = Promise.resolve();

  const performPost = async (endpointPath, body, bearerToken = null) => {
    assertSplitR1EndpointAllowed("POST", endpointPath);
    const requestClass = requestClassForEndpoint(endpointPath);
    const reservation = budgetLedger.reserve(requestClass);
    if (!reservation.reserved) {
      throw new SplitR1BudgetBoundedError(reservation.reason);
    }
    await rateLimiter.awaitStartSlot();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    activeRequests += 1;
    maxObservedConcurrency = Math.max(maxObservedConcurrency, activeRequests);
    try {
      const response = await fetchImpl(`${baseUrl}${endpointPath}`, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(bearerToken === null ? {} : { Authorization: `Bearer ${bearerToken}` }),
        },
        body: JSON.stringify(body),
      });
      return await parseJsonResponse(response, endpointPath.split("/").at(-1));
    } finally {
      activeRequests -= 1;
      clearTimeout(timeout);
    }
  };

  const post = (endpointPath, body, bearerToken = null) => {
    const operation = serializedTail.then(() => performPost(endpointPath, body, bearerToken));
    serializedTail = operation.catch(() => undefined);
    return operation;
  };

  return {
    post,
    getHttpRequestCount: () => budgetLedger.snapshot().totalRouteStackRequests,
    getBudgetSnapshot: () => budgetLedger.snapshot(),
    getMaxObservedConcurrency: () => maxObservedConcurrency,
  };
}

export async function runSplitR1Collector({
  matrix,
  options,
  environment = process.env,
  execArgv = process.execArgv,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  randomUUID = crypto.randomUUID,
  ephemeralRunKey = crypto.randomBytes(32),
  monotonicNow,
  sleep,
  budgetLimits,
}) {
  const dryRun = buildSplitR1DryRunPlan(matrix);
  if (options.mode === "dry-run") return dryRun;

  const configuration = resolveProductionConfiguration(environment, execArgv);
  const transport = createSplitR1NativeTransport({
    baseUrl: configuration.baseUrl,
    fetchImpl,
    monotonicNow,
    sleep,
    budgetLimits,
  });
  const authRequest = createSplitR1PartnerTokenRequest({
    apiKey: configuration.apiKey,
    apiSecret: configuration.apiSecret,
    now,
    randomUUID,
  });
  const authResponse = await transport.post(SPLIT_R1_AUTH_ENDPOINT, authRequest);
  const partnerToken = authResponse?.token;
  if (typeof partnerToken !== "string" || partnerToken.length === 0) {
    throw new Error("split-r1-partner-token-missing");
  }
  const logicalSearches = buildSplitF0LogicalSearchPlan(matrix);
  const destinations = new Map();
  for (const scenario of matrix.scenarios) {
    const destinationPayload = await transport.post(
      SPLIT_R1_DESTINATION_ENDPOINT,
      createSplitR1DestinationRequest(scenario),
      partnerToken
    );
    destinations.set(
      scenario.scenarioId,
      selectSplitR1DestinationCandidate(destinationPayload, scenario)
    );
  }

  const searchStates = logicalSearches.map((logicalSearch) => ({
    logicalSearch,
    originalRequest: createSplitR1HotelSearchRequest(
      logicalSearch,
      destinations.get(logicalSearch.scenarioId)
    ),
    latestResponse: null,
    continuationCount: 0,
    offers: [],
    status: "PENDING_INITIAL",
  }));

  const markAllPendingBudgetBounded = () => {
    for (const state of searchStates) {
      if (state.status === "PENDING_INITIAL" || state.status === "CONTINUATION_PENDING") {
        state.status = "BUDGET_BOUNDED_INCOMPLETE";
      }
    }
  };

  for (const state of searchStates) {
    try {
      state.latestResponse = await transport.post(
        SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        state.originalRequest,
        partnerToken
      );
    } catch (error) {
      if (!isSplitR1BudgetBoundedError(error)) throw error;
      markAllPendingBudgetBounded();
      break;
    }
    state.offers.push(
      ...normalizeSplitR1SearchResponse(state.latestResponse, {
        logicalSearch: state.logicalSearch,
        ephemeralRunKey,
      })
    );
    const container = normalizeResponseContainer(state.latestResponse);
    state.status =
      typeof container?.nextResultsKey === "string" && container.nextResultsKey.length > 0
        ? "CONTINUATION_PENDING"
        : "COMPLETE";
  }

  for (
    let continuationOrdinal = 1;
    continuationOrdinal <= SPLIT_R1_MAX_CONTINUATIONS_PER_SEARCH;
    continuationOrdinal += 1
  ) {
    const eligibleStates = searchStates.filter(
      (state) => state.status === "CONTINUATION_PENDING"
    );
    if (eligibleStates.length === 0) break;
    let budgetExhausted = false;
    for (const state of eligibleStates) {
      try {
        const continuationRequest = createSplitR1ContinuationRequest(
          state.originalRequest,
          state.latestResponse,
          continuationOrdinal
        );
        state.latestResponse = await transport.post(
          SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
          continuationRequest,
          partnerToken
        );
      } catch (error) {
        if (!isSplitR1BudgetBoundedError(error)) throw error;
        markAllPendingBudgetBounded();
        budgetExhausted = true;
        break;
      }
      state.continuationCount += 1;
      state.offers.push(
        ...normalizeSplitR1SearchResponse(state.latestResponse, {
          logicalSearch: state.logicalSearch,
          ephemeralRunKey,
        })
      );
      const container = normalizeResponseContainer(state.latestResponse);
      state.status =
        typeof container?.nextResultsKey === "string" && container.nextResultsKey.length > 0
          ? "CONTINUATION_PENDING"
          : "COMPLETE";
    }
    if (budgetExhausted) break;
  }

  for (const state of searchStates) {
    if (state.status === "CONTINUATION_PENDING") {
      state.status = "CONTINUATION_LIMIT_INCOMPLETE";
    }
  }
  const completedOffers = searchStates
    .filter((state) => state.status === "COMPLETE")
    .flatMap((state) => state.offers);
  const budgetSnapshot = transport.getBudgetSnapshot();
  const incompleteSearches = searchStates.filter((state) => state.status !== "COMPLETE");
  const result = {
    schemaVersion: "stayopti.split-r1.production-search-level-result@1",
    environment: "production",
    privatePilotOnly: true,
    marketEvidence: "LIMITED_SEARCH_LEVEL_ONLY",
    policyEligible: false,
    publicRecommendationAllowed: false,
    runStatus: incompleteSearches.length === 0 ? "COMPLETE" : "INCONCLUSIVE",
    tokenUsage: "UNKNOWN_NOT_EXPOSED",
    httpRequests: budgetSnapshot.totalRouteStackRequests,
    requestBudget: budgetSnapshot,
    maxObservedConcurrency: transport.getMaxObservedConcurrency(),
    logicalSearchesCompleted: searchStates.length - incompleteSearches.length,
    logicalSearchesIncomplete: incompleteSearches.length,
    incompleteSearches: incompleteSearches.map((state) => ({
      logicalSearchId: state.logicalSearch.logicalSearchId,
      status: state.status,
    })),
    scenarios: matrix.scenarios.map((scenario) =>
      evaluateSplitR1SearchLevelScenario(
        scenario,
        completedOffers.filter((offer) => offer.scenarioId === scenario.scenarioId)
      )
    ),
  };
  assertSplitR1PersistedPayloadSafe(result);
  return result;
}

async function main() {
  const options = parseSplitR1Arguments(process.argv.slice(2));
  const matrix = await loadSplitF0ScenarioMatrix();
  const result = await runSplitR1Collector({ matrix, options });
  process.stdout.write(`${stableStringifySplitF0(result, 2)}\n`);
}

const EXECUTED_AS_MAIN = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (EXECUTED_AS_MAIN) {
  main().catch((error) => {
    process.stderr.write(`SPLIT_R1_COLLECTOR_ERROR=${error?.message ?? "unknown"}\n`);
    process.exitCode = 1;
  });
}
