import crypto from "node:crypto";
import fs from "node:fs/promises";
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
export const SPLIT_R1_MAX_EARLY_WAKE_CYCLES = 10;
export const SPLIT_R1_MAX_RATE_LIMIT_WAIT_MS = 5_000;
export const SPLIT_R1_RATE_LIMIT_SAFETY_MARGIN_MS = 1;
export const SPLIT_R1_RETRIES = 0;
export const SPLIT_R1_CONCURRENCY = 1;
export const SPLIT_R1_HTTP_TIMEOUT_MS = 120_000;
export const SPLIT_R1_CAUSAL_LEDGER_VERSION = "stayopti.split-r1.causal-ledger@1";
export const SPLIT_R1_TARGETED_MATRIX_VERSION =
  "stayopti.split-r1.targeted-scenario-matrix@1";
export const SPLIT_R1_TARGETED_SCENARIO_VERSION =
  "stayopti.split-r1.targeted-scenario@1";
export const SPLIT_R1_TARGETED_MATRIX_PATH = path.join(
  SPLIT_R1_REPOSITORY_ROOT,
  "tests",
  "engine-v3",
  "fixtures",
  "split-r1-targeted-scenario-matrix-v1.json"
);
export const SPLIT_R1_TARGETED_EXPECTED_DURATIONS = [7, 10, 12, 14, 21, 30];
export const SPLIT_R1_TARGETED_PRICE_SEMANTICS_GATE = "HOLD";
export const SPLIT_R1_TARGETED_RUN_STATUS = "HOLD_PRICE_SEMANTICS_UNPROVEN";
export const SPLIT_R1_OURPRICE_PROBE_VERSION =
  "stayopti.split-r1.ourprice-semantics-probe@1";
export const SPLIT_R1_OURPRICE_PROBE_PATH = path.join(
  SPLIT_R1_REPOSITORY_ROOT,
  "tests",
  "engine-v3",
  "fixtures",
  "split-r1-ourprice-semantics-probe-v1.json"
);
export const SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET = 3;
export const SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET = 5;
export const SPLIT_R1_OURPRICE_PROBE_CONTINUATIONS = 0;
export const SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS = [
  "--execute-ourprice-semantics-probe-live",
  "--confirm-ourprice-semantics-search-only",
];
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
  amsterdam: ["amsterdam"],
  madrid: ["madrid"],
});

const SPLIT_R1_DESTINATION_COUNTRY_ALIASES = Object.freeze({
  AT: ["at", "aut", "austria"],
  DE: ["de", "deu", "germany", "deutschland"],
  ES: ["es", "esp", "spain", "espana"],
  FR: ["fr", "fra", "france"],
  IT: ["it", "ita", "italy", "italia"],
  NL: ["nl", "nld", "netherlands", "nederland"],
  PT: ["pt", "prt", "portugal"],
});

const SPLIT_R1_COMPATIBLE_DESTINATION_TYPES = new Set(["city", "destination"]);

const SPLIT_R1_SEARCH_REJECTION_REASONS = Object.freeze([
  "MISSING_PROPERTY_ID",
  "MISSING_OURPRICE",
  "NON_NUMERIC_OURPRICE",
  "NON_POSITIVE_OURPRICE",
  "MISSING_CURRENCY",
  "CURRENCY_MISMATCH",
  "UNSUPPORTED_PRECISION",
  "DUPLICATE_PROPERTY_WORSE_PRICE",
  "SEARCH_INCOMPLETE",
]);

const SPLIT_R1_PAIR_FUNNEL_REASONS = Object.freeze([
  "NO_FULL_STAY_BASELINE",
  "SAME_PROPERTY_PAIR",
  "TEMPORAL_MISMATCH",
  "NO_SEGMENT_CANDIDATE",
  "NO_DISTINCT_PROPERTY_PAIR",
  "CONDITIONAL_PAIR_ACCEPTED",
]);

const SPLIT_R1_EVIDENCE_LIMITS = Object.freeze([
  "search-level-total-cost-semantics-unproven",
  "taxes-and-mandatory-costs-unproven",
  "room-board-cancellation-payment-unproven",
]);

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
  const targetedFlag = "--targeted-matrix-v1";
  const ourpriceProbeFlag = "--ourprice-semantics-probe-v1";
  const allowed = new Set([
    "--dry-run",
    targetedFlag,
    ourpriceProbeFlag,
    ...SPLIT_R1_LIVE_CONFIRMATIONS,
    ...SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS,
  ]);
  for (const argument of argv) {
    if (!allowed.has(argument)) {
      throw new Error(`split-r1-unknown-argument:${argument}`);
    }
  }
  if (argv.includes("--dry-run") && SPLIT_R1_LIVE_CONFIRMATIONS.some((flag) => argv.includes(flag))) {
    throw new Error("split-r1-incompatible-mode-flags");
  }
  const probeConfirmationsPresent = SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS.filter(
    (flag) => argv.includes(flag)
  );
  if (probeConfirmationsPresent.length > 0 && !argv.includes(ourpriceProbeFlag)) {
    throw new Error("split-r1-ourprice-probe-flag-required");
  }
  if (argv.includes(ourpriceProbeFlag)) {
    if (
      argv.includes(targetedFlag) ||
      SPLIT_R1_LIVE_CONFIRMATIONS.some((flag) => argv.includes(flag)) ||
      (argv.includes("--dry-run") && probeConfirmationsPresent.length > 0)
    ) {
      throw new Error("split-r1-ourprice-probe-incompatible-mode-flags");
    }
    if (probeConfirmationsPresent.length === 0) {
      return { mode: "ourprice-probe-dry-run" };
    }
    if (probeConfirmationsPresent.length !== SPLIT_R1_OURPRICE_PROBE_LIVE_CONFIRMATIONS.length) {
      throw new Error("split-r1-ourprice-probe-live-confirmations-incomplete");
    }
    return { mode: "ourprice-probe-live" };
  }
  if (argv.includes(targetedFlag) && SPLIT_R1_LIVE_CONFIRMATIONS.some((flag) => argv.includes(flag))) {
    throw new Error("split-r1-targeted-live-not-authorized");
  }
  if (argv.includes(targetedFlag)) {
    return { mode: "targeted-dry-run" };
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

function emptySplitR1SearchRejectionCounts() {
  return Object.fromEntries(SPLIT_R1_SEARCH_REJECTION_REASONS.map((reason) => [reason, 0]));
}

function splitR1SearchRole(logicalSearch) {
  if (logicalSearch.kind === "full-stay") return "FULL_STAY";
  if (logicalSearch.kind === "split-segment" && logicalSearch.segmentOrdinal === 0) {
    return "SEGMENT_1";
  }
  if (logicalSearch.kind === "split-segment" && logicalSearch.segmentOrdinal === 1) {
    return "SEGMENT_2";
  }
  throw new Error("split-r1-causal-search-role-invalid");
}

export function normalizeSplitR1SearchPage(payload, { logicalSearch, ephemeralRunKey }) {
  const container = normalizeResponseContainer(payload);
  const currency = typeof container?.currency === "string" && container.currency.length === 3
    ? container.currency.toUpperCase()
    : null;
  const expectedCurrency = logicalSearch?.request?.currency;
  const items = getResponseItems(payload);
  const rejectionCounts = emptySplitR1SearchRejectionCounts();
  const normalized = [];
  for (const hotel of items) {
    const rawId = hotel?.id ?? hotel?.hotelId;
    if (typeof rawId !== "string" || rawId.length === 0) {
      rejectionCounts.MISSING_PROPERTY_ID += 1;
      continue;
    }
    if (
      !Object.prototype.hasOwnProperty.call(hotel ?? {}, "ourprice") ||
      hotel.ourprice === null ||
      hotel.ourprice === undefined ||
      hotel.ourprice === ""
    ) {
      rejectionCounts.MISSING_OURPRICE += 1;
      continue;
    }
    const price = finiteNumber(hotel.ourprice);
    if (price === null) {
      rejectionCounts.NON_NUMERIC_OURPRICE += 1;
      continue;
    }
    if (price <= 0) {
      rejectionCounts.NON_POSITIVE_OURPRICE += 1;
      continue;
    }
    if (currency === null) {
      rejectionCounts.MISSING_CURRENCY += 1;
      continue;
    }
    if (currency !== expectedCurrency) {
      rejectionCounts.CURRENCY_MISMATCH += 1;
    }
    let totalMinorUnits;
    try {
      totalMinorUnits = splitF0MoneyToMinorUnitsV1(price);
    } catch {
      rejectionCounts.UNSUPPORTED_PRECISION += 1;
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
      evidenceLimits: [...SPLIT_R1_EVIDENCE_LIMITS],
    });
  }
  return {
    rawResultCount: items.length,
    rejectionCounts,
    offers: normalized.sort(
      (left, right) =>
        left.totalMinorUnits - right.totalMinorUnits ||
        left.propertyFingerprint.localeCompare(right.propertyFingerprint)
    ),
  };
}

export function normalizeSplitR1SearchResponse(payload, context) {
  return normalizeSplitR1SearchPage(payload, context).offers;
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

function emptySplitR1PairFunnel() {
  return Object.fromEntries(SPLIT_R1_PAIR_FUNNEL_REASONS.map((reason) => [reason, 0]));
}

function compareSplitR1Properties(left, right) {
  return (
    left.bestOurpriceMinor - right.bestOurpriceMinor ||
    left.propertyFingerprint.localeCompare(right.propertyFingerprint)
  );
}

function compareSplitR1Pairs(left, right) {
  return (
    left.splitTotalMinor - right.splitTotalMinor ||
    left.segment1.propertyFingerprint.localeCompare(right.segment1.propertyFingerprint) ||
    left.segment2.propertyFingerprint.localeCompare(right.segment2.propertyFingerprint)
  );
}

function splitR1WindowNights(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);
  const nights = (end.getTime() - start.getTime()) / 86_400_000;
  if (!Number.isSafeInteger(nights) || nights < 1) {
    throw new Error("split-r1-causal-window-invalid");
  }
  return nights;
}

function aggregateSplitR1SearchState(state, scenario) {
  const rejectionCounts = emptySplitR1SearchRejectionCounts();
  const pageDiagnostics = Array.isArray(state.pageDiagnostics) ? state.pageDiagnostics : [];
  const rawResultCount = pageDiagnostics.reduce((total, page) => total + page.rawResultCount, 0);
  for (const page of pageDiagnostics) {
    for (const reason of SPLIT_R1_SEARCH_REJECTION_REASONS) {
      if (reason === "DUPLICATE_PROPERTY_WORSE_PRICE" || reason === "SEARCH_INCOMPLETE") continue;
      rejectionCounts[reason] += page.rejectionCounts[reason] ?? 0;
    }
  }
  const economicallyEligibleOffers = (state.offers ?? []).filter(
    (offer) => offer.currency === scenario.currency
  );
  const bestByProperty = new Map();
  for (const offer of economicallyEligibleOffers) {
    const prior = bestByProperty.get(offer.propertyFingerprint);
    if (
      prior === undefined ||
      offer.totalMinorUnits < prior.totalMinorUnits
    ) {
      bestByProperty.set(offer.propertyFingerprint, offer);
    }
  }
  rejectionCounts.DUPLICATE_PROPERTY_WORSE_PRICE =
    economicallyEligibleOffers.length - bestByProperty.size;
  rejectionCounts.SEARCH_INCOMPLETE = state.status === "COMPLETE" ? 0 : 1;
  const directRejected = SPLIT_R1_SEARCH_REJECTION_REASONS
    .filter((reason) => reason !== "DUPLICATE_PROPERTY_WORSE_PRICE" && reason !== "SEARCH_INCOMPLETE")
    .reduce((total, reason) => total + rejectionCounts[reason], 0);
  const reconciledRawResultCount = directRejected +
    rejectionCounts.DUPLICATE_PROPERTY_WORSE_PRICE +
    bestByProperty.size;
  if (pageDiagnostics.length > 0 && reconciledRawResultCount !== rawResultCount) {
    throw new Error("split-r1-causal-search-funnel-not-reconciled");
  }
  const logicalSearch = state.logicalSearch;
  return {
    logicalSearchId: logicalSearch.logicalSearchId,
    scenarioId: logicalSearch.scenarioId,
    duration: scenario.nights,
    searchRole: splitR1SearchRole(logicalSearch),
    splitPointId: logicalSearch.splitPointId,
    checkIn: logicalSearch.request.checkIn,
    checkOut: logicalSearch.request.checkOut,
    windowNights: splitR1WindowNights(
      logicalSearch.request.checkIn,
      logicalSearch.request.checkOut
    ),
    currency: logicalSearch.request.currency,
    requestCompletionStatus: state.status,
    initialPageCount: state.initialPageCount ?? 0,
    continuationPageCount: state.continuationCount ?? 0,
    pageCount: (state.initialPageCount ?? 0) + (state.continuationCount ?? 0),
    rawResultCount,
    normalizedResultCount: bestByProperty.size,
    rejectionCounts,
    funnel: {
      RAW_RESULTS: rawResultCount,
      ...rejectionCounts,
    },
    funnelReconciled:
      pageDiagnostics.length === 0 || reconciledRawResultCount === rawResultCount,
    properties: [...bestByProperty.values()]
      .map((offer) => ({
        propertyFingerprint: offer.propertyFingerprint,
        bestOurpriceMinor: offer.totalMinorUnits,
        currency: offer.currency,
        searchRole: splitR1SearchRole(logicalSearch),
        scenarioId: logicalSearch.scenarioId,
        splitPointId: logicalSearch.splitPointId,
        requiredFieldsPresent: {
          propertyIdentity: true,
          ourprice: true,
          currency: true,
        },
      }))
      .sort(compareSplitR1Properties),
  };
}

function buildSplitR1CausalScenarioRecords(matrix, logicalSearches) {
  return matrix.scenarios.map((scenario) => ({
    scenarioId: scenario.scenarioId,
    duration: scenario.nights,
    checkIn: scenario.checkIn,
    checkOut: scenario.checkOut,
    currency: scenario.currency,
    splitPoints: scenario.splitPoints.map((splitPoint) => {
      const first = logicalSearches.find(
        (search) =>
          search.scenarioId === scenario.scenarioId &&
          search.splitPointId === splitPoint.splitPointId &&
          search.segmentOrdinal === 0
      );
      const second = logicalSearches.find(
        (search) =>
          search.scenarioId === scenario.scenarioId &&
          search.splitPointId === splitPoint.splitPointId &&
          search.segmentOrdinal === 1
      );
      if (!first || !second) throw new Error("split-r1-causal-segment-plan-missing");
      return {
        splitPointId: splitPoint.splitPointId,
        segment1: {
          checkIn: first.request.checkIn,
          checkOut: first.request.checkOut,
          nights: first.request.nights,
        },
        segment2: {
          checkIn: second.request.checkIn,
          checkOut: second.request.checkOut,
          nights: second.request.nights,
        },
      };
    }),
  }));
}

function splitR1LedgerOffers(searches) {
  return searches.flatMap((search) => search.properties.map((property) => ({
    schemaVersion: "stayopti.split-r1.search-level-offer@1",
    logicalSearchId: search.logicalSearchId,
    scenarioId: search.scenarioId,
    searchKind: search.searchRole === "FULL_STAY" ? "full-stay" : "split-segment",
    splitPointId: search.splitPointId,
    segmentOrdinal:
      search.searchRole === "SEGMENT_1" ? 0 : search.searchRole === "SEGMENT_2" ? 1 : null,
    propertyFingerprint: property.propertyFingerprint,
    totalMinorUnits: property.bestOurpriceMinor,
    total: splitF0MinorUnitsToMoneyV1(property.bestOurpriceMinor),
    currency: property.currency,
    basePriceDiagnosticAvailable: false,
    providerSavingUsed: false,
    taxCompleteness: "unknown",
    comparabilityCeiling: "CONDITIONAL_COMPARABLE",
    evidenceLimits: [...SPLIT_R1_EVIDENCE_LIMITS],
  })));
}

function splitR1TemporalCoverageValid(scenario, splitPoint, firstSearch, secondSearch) {
  return Boolean(
    firstSearch &&
    secondSearch &&
    firstSearch.checkIn === scenario.checkIn &&
    firstSearch.checkOut === secondSearch.checkIn &&
    secondSearch.checkOut === scenario.checkOut &&
    firstSearch.checkIn === splitPoint.segment1.checkIn &&
    firstSearch.checkOut === splitPoint.segment1.checkOut &&
    secondSearch.checkIn === splitPoint.segment2.checkIn &&
    secondSearch.checkOut === splitPoint.segment2.checkOut &&
    firstSearch.windowNights + secondSearch.windowNights === scenario.duration
  );
}

function bestSplitR1Pair(firstProperties, secondProperties, allowSameProperty) {
  let bestPair = null;
  let samePropertyPairs = 0;
  let acceptedPairs = 0;
  for (const segment1 of firstProperties) {
    for (const segment2 of secondProperties) {
      if (segment1.propertyFingerprint === segment2.propertyFingerprint && !allowSameProperty) {
        samePropertyPairs += 1;
        continue;
      }
      acceptedPairs += 1;
      const candidate = {
        segment1,
        segment2,
        splitTotalMinor: segment1.bestOurpriceMinor + segment2.bestOurpriceMinor,
      };
      if (bestPair === null || compareSplitR1Pairs(candidate, bestPair) < 0) bestPair = candidate;
    }
  }
  return { bestPair, samePropertyPairs, acceptedPairs };
}

function splitR1BreakEven(grossSavingMinor) {
  return SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1.map((frictionEur) => {
    const frictionMinor = splitF0MoneyToMinorUnitsV1(frictionEur);
    const requiredImprovementMinor = Math.max(0, frictionMinor - grossSavingMinor);
    return {
      hypotheticalFrictionEur: frictionEur,
      requiredImprovementMinor,
      requiredImprovement: splitF0MinorUnitsToMoneyV1(requiredImprovementMinor),
    };
  });
}

function splitR1SelectedPairRecord(baseline, pair) {
  if (pair === null) return null;
  const grossSavingMinor = baseline === null
    ? null
    : baseline.bestOurpriceMinor - pair.splitTotalMinor;
  const grossSavingRatio = baseline === null
    ? null
    : grossSavingMinor / baseline.bestOurpriceMinor;
  const outlierFlags = grossSavingRatio !== null && Math.abs(grossSavingRatio) > 0.5
    ? ["SAVING_RATIO_OUTLIER"]
    : [];
  return {
    segment1PropertyFingerprint: pair.segment1.propertyFingerprint,
    segment2PropertyFingerprint: pair.segment2.propertyFingerprint,
    segment1Minor: pair.segment1.bestOurpriceMinor,
    segment2Minor: pair.segment2.bestOurpriceMinor,
    splitTotalMinor: pair.splitTotalMinor,
    fixedSingleMinor: baseline?.bestOurpriceMinor ?? null,
    grossSavingMinor,
    grossSavingRatio,
    frictionSensitivity: grossSavingMinor === null ? [] : frictionSensitivity(grossSavingMinor),
    breakEven: grossSavingMinor === null ? [] : splitR1BreakEven(grossSavingMinor),
    classification:
      grossSavingMinor === null
        ? "DIAGNOSTIC_WITHOUT_FIXED_BASELINE"
        : outlierFlags.length > 0
          ? "OUTLIER_DIAGNOSTIC"
          : "HEADLINE_CONDITIONAL",
    outlierFlags,
  };
}

function splitR1SetIntersection(left, right) {
  return new Set([...left].filter((value) => right.has(value)));
}

function filterSplitR1Properties(properties, allowedFingerprints) {
  if (allowedFingerprints === null) return properties;
  return properties.filter((property) => allowedFingerprints.has(property.propertyFingerprint));
}

function evaluateSplitR1CounterfactualMode({
  scenario,
  searches,
  mode,
}) {
  const fullSearch = searches.find((search) => search.searchRole === "FULL_STAY");
  const fullProperties = [...(fullSearch?.properties ?? [])].sort(compareSplitR1Properties);
  const results = [];
  for (const splitPoint of scenario.splitPoints) {
    const firstSearch = searches.find(
      (search) => search.searchRole === "SEGMENT_1" && search.splitPointId === splitPoint.splitPointId
    );
    const secondSearch = searches.find(
      (search) => search.searchRole === "SEGMENT_2" && search.splitPointId === splitPoint.splitPointId
    );
    const firstAll = [...(firstSearch?.properties ?? [])].sort(compareSplitR1Properties);
    const secondAll = [...(secondSearch?.properties ?? [])].sort(compareSplitR1Properties);
    const fullSet = new Set(fullProperties.map((property) => property.propertyFingerprint));
    const firstSet = new Set(firstAll.map((property) => property.propertyFingerprint));
    const secondSet = new Set(secondAll.map((property) => property.propertyFingerprint));
    let allowedFingerprints = null;
    if (mode === "COMMON_PROPERTY_UNIVERSE_ONLY") {
      allowedFingerprints = splitR1SetIntersection(fullSet, new Set([...firstSet, ...secondSet]));
    } else if (mode === "FULL_STAY_AND_BOTH_SEGMENTS_INTERSECTION") {
      allowedFingerprints = splitR1SetIntersection(splitR1SetIntersection(fullSet, firstSet), secondSet);
    }
    const baselineCandidates = filterSplitR1Properties(fullProperties, allowedFingerprints);
    const firstProperties = filterSplitR1Properties(firstAll, allowedFingerprints);
    const secondProperties = filterSplitR1Properties(secondAll, allowedFingerprints);
    const baseline = baselineCandidates[0] ?? null;
    const allowSameProperty = [
      "SAME_PROPERTY_ALLOWED_DIAGNOSTIC",
      "UNCONSTRAINED_BEST_OBSERVED_SPLIT",
      "NO_DISTINCT_PROPERTY_REQUIREMENT",
    ].includes(mode);
    const temporalValid = splitR1TemporalCoverageValid(
      scenario,
      splitPoint,
      firstSearch,
      secondSearch
    );
    const funnel = emptySplitR1PairFunnel();
    if (baseline === null) funnel.NO_FULL_STAY_BASELINE = 1;
    if (!temporalValid) funnel.TEMPORAL_MISMATCH = 1;
    if (firstProperties.length === 0 || secondProperties.length === 0) {
      funnel.NO_SEGMENT_CANDIDATE = 1;
    }
    const pairSelection = temporalValid
      ? bestSplitR1Pair(firstProperties, secondProperties, allowSameProperty)
      : { bestPair: null, samePropertyPairs: 0, acceptedPairs: 0 };
    funnel.SAME_PROPERTY_PAIR = pairSelection.samePropertyPairs;
    funnel.CONDITIONAL_PAIR_ACCEPTED = pairSelection.acceptedPairs;
    if (
      !allowSameProperty &&
      firstProperties.length > 0 &&
      secondProperties.length > 0 &&
      pairSelection.acceptedPairs === 0
    ) {
      funnel.NO_DISTINCT_PROPERTY_PAIR = 1;
    }
    results.push({
      splitPointId: splitPoint.splitPointId,
      baselinePropertyFingerprint: baseline?.propertyFingerprint ?? null,
      selectedPair: splitR1SelectedPairRecord(baseline, pairSelection.bestPair),
      funnel,
    });
  }
  return { mode, splitResults: results };
}

export function replaySplitR1CausalLedger(ledger) {
  if (ledger?.schemaVersion !== SPLIT_R1_CAUSAL_LEDGER_VERSION) {
    throw new Error("split-r1-causal-ledger-version-invalid");
  }
  const searches = [...ledger.searches].sort((left, right) =>
    left.logicalSearchId.localeCompare(right.logicalSearchId)
  );
  const modes = [
    "CURRENT_DISTINCT_PROPERTY_POLICY",
    "SAME_PROPERTY_ALLOWED_DIAGNOSTIC",
    "UNCONSTRAINED_BEST_OBSERVED_SPLIT",
    "COMMON_PROPERTY_UNIVERSE_ONLY",
    "FULL_STAY_AND_BOTH_SEGMENTS_INTERSECTION",
    "NO_DISTINCT_PROPERTY_REQUIREMENT",
  ];
  return {
    schemaVersion: "stayopti.split-r1.causal-replay@1",
    scenarios: [...ledger.scenarios]
      .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId))
      .map((scenario) => {
        const scenarioSearches = searches.filter(
          (search) =>
            search.scenarioId === scenario.scenarioId &&
            search.requestCompletionStatus === "COMPLETE"
        );
        const headline = evaluateSplitR1SearchLevelScenario(
          { ...scenario, nights: scenario.duration },
          splitR1LedgerOffers(scenarioSearches)
        );
        return {
          scenarioId: scenario.scenarioId,
          headline,
          counterfactuals: modes.map((mode) =>
            evaluateSplitR1CounterfactualMode({ scenario, searches: scenarioSearches, mode })
          ),
        };
      }),
  };
}

export function buildSplitR1CausalLedger(matrix, searchStates) {
  const logicalSearches = buildSplitR1LogicalSearchPlan(matrix);
  const scenarioById = new Map(matrix.scenarios.map((scenario) => [scenario.scenarioId, scenario]));
  const baseLedger = {
    schemaVersion: SPLIT_R1_CAUSAL_LEDGER_VERSION,
    priceNature: "UNPROVEN_SEARCH_LEVEL_WINDOW_PRICE",
    strictComparisons: 0,
    comparability: "CONDITIONAL_SEARCH_LEVEL_ONLY",
    economicPolicy: {
      fixedBestSingle: true,
      distinctPropertyRequired: true,
      integerMinorUnits: true,
      frictionSensitivityEur: [...SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1],
      outlierQuarantine: true,
      publicRecommendationAllowed: false,
      policyEligible: false,
    },
    privacy: {
      propertyIdentity: "RUN_LOCAL_HMAC_SHA256",
      ephemeralSecretPersisted: false,
      crossRunLinkability: false,
      rawIdentifiersPersisted: 0,
      piiPersisted: 0,
      commercialUrlsPersisted: 0,
    },
    scenarios: buildSplitR1CausalScenarioRecords(matrix, logicalSearches),
    searches: [...searchStates]
      .map((state) => {
        const scenario = scenarioById.get(state.logicalSearch.scenarioId);
        if (!scenario) throw new Error("split-r1-causal-scenario-missing");
        return aggregateSplitR1SearchState(state, scenario);
      })
      .sort((left, right) => left.logicalSearchId.localeCompare(right.logicalSearchId)),
  };
  const replay = replaySplitR1CausalLedger(baseLedger);
  const ledger = { ...baseLedger, replay };
  assertSplitR1PersistedPayloadSafe(ledger);
  return ledger;
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

const SPLIT_R1_TARGETED_EXPECTED_SCENARIOS = Object.freeze([
  {
    scenarioId: "SPLIT-R1-TGT-01-ROMA-NEW-YEAR-7N",
    canonicalId: "it-roma",
    label: "Roma",
    countryCode: "IT",
    latitude: 41.9028,
    longitude: 12.4964,
    checkIn: "2026-12-28",
    checkOut: "2027-01-04",
    nights: 7,
    targetMechanism: "NEW_YEAR_PEAK_INSIDE_SHOULDER_STAY",
    anchors: ["EVENT:2027-01-01"],
    splitNights: [3, 4],
  },
  {
    scenarioId: "SPLIT-R1-TGT-02-FIRENZE-EASTER-10N",
    canonicalId: "it-firenze",
    label: "Firenze",
    countryCode: "IT",
    latitude: 43.7696,
    longitude: 11.2558,
    checkIn: "2027-03-24",
    checkOut: "2027-04-03",
    nights: 10,
    targetMechanism: "EASTER_WEEKEND_INSIDE_LONGER_STAY",
    anchors: ["EVENT:2027-03-28"],
    splitNights: [4, 5],
  },
  {
    scenarioId: "SPLIT-R1-TGT-03-AMSTERDAM-KINGS-DAY-12N",
    canonicalId: "nl-amsterdam",
    label: "Amsterdam",
    countryCode: "NL",
    latitude: 52.3676,
    longitude: 4.9041,
    checkIn: "2027-04-22",
    checkOut: "2027-05-04",
    nights: 12,
    targetMechanism: "KINGS_DAY_AND_MONTH_BOUNDARY",
    anchors: ["EVENT:2027-04-27", "MONTH_BOUNDARY:2027-05-01"],
    splitNights: [5, 9],
  },
  {
    scenarioId: "SPLIT-R1-TGT-04-PARIS-BASTILLE-14N",
    canonicalId: "fr-paris",
    label: "Paris",
    countryCode: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
    checkIn: "2027-07-07",
    checkOut: "2027-07-21",
    nights: 14,
    targetMechanism: "BASTILLE_DAY_PEAK_INSIDE_STAY",
    anchors: ["EVENT:2027-07-14"],
    splitNights: [7, 8],
  },
  {
    scenarioId: "SPLIT-R1-TGT-05-MADRID-EASTER-21N",
    canonicalId: "es-madrid",
    label: "Madrid",
    countryCode: "ES",
    latitude: 40.4168,
    longitude: -3.7038,
    checkIn: "2027-03-20",
    checkOut: "2027-04-10",
    nights: 21,
    targetMechanism: "EASTER_AND_MULTI_WEEKEND_VARIANCE",
    anchors: ["EVENT:2027-03-28"],
    splitNights: [8, 11],
  },
  {
    scenarioId: "SPLIT-R1-TGT-06-BARCELONA-MONTH-BOUNDARY-30N",
    canonicalId: "es-barcelona",
    label: "Barcelona",
    countryCode: "ES",
    latitude: 41.3874,
    longitude: 2.1686,
    checkIn: "2027-06-20",
    checkOut: "2027-07-20",
    nights: 30,
    targetMechanism: "MONTH_BOUNDARY_AND_HIGH_SEASON_REGIME_CHANGE",
    anchors: ["MONTH_BOUNDARY:2027-07-01"],
    splitNights: [10, 15],
  },
]);

const SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA = Object.freeze({
  minimumValidScenariosForGo: 5,
  minimumValidScenariosForConclusion: 4,
  goMinimumDistinctScenariosNetPositiveAt50Eur: 2,
  minimumGrossSavingRatio: 0.1,
  goRequiresAtLeastOnePositiveDurationAtOrAboveNights: 14,
  conditionalExactDistinctScenarioCount: 1,
  holdNetPositiveThresholdEur: 25,
  distinctPropertiesRequired: true,
  outliersExcluded: true,
  baselineStabilityRequired: true,
  samePropertyOnlyIsHold: true,
  completeCausalLedgerRequired: true,
  deterministicReplayRequired: true,
  priceSemanticsMustBeProven: true,
  providerDataMustBeSufficient: true,
});

const SPLIT_R1_TARGETED_ANTI_CHERRY_PICKING = Object.freeze({
  scenarioReplacementAllowed: false,
  dateChangesAllowed: false,
  splitPointChangesAllowed: false,
  hotelFilteringAfterObservationAllowed: false,
  thresholdChangesAllowed: false,
  outlierRuleChangesAllowed: false,
  frictionThresholdChangesAllowed: false,
  fixedBestSingleChangesAllowed: false,
  missingScenarioSubstitutionAllowed: false,
  sameScenarioSplitPointsCountAsDistinctSignals: false,
  samePropertyPromotionAllowed: false,
  newProviderCallsAuthorized: false,
});

function splitR1UtcDateMilliseconds(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function splitR1TargetedScenarioFreezeView(scenario) {
  return {
    scenarioId: scenario?.scenarioId,
    canonicalId: scenario?.destination?.canonicalId,
    label: scenario?.destination?.label,
    countryCode: scenario?.destination?.countryCode,
    latitude: scenario?.destination?.latitude,
    longitude: scenario?.destination?.longitude,
    checkIn: scenario?.checkIn,
    checkOut: scenario?.checkOut,
    nights: scenario?.nights,
    targetMechanism: scenario?.targetMechanism,
    anchors: Array.isArray(scenario?.mechanismAnchors)
      ? scenario.mechanismAnchors.map((anchor) => `${anchor?.kind}:${anchor?.date}`)
      : [],
    splitNights: Array.isArray(scenario?.splitPoints)
      ? scenario.splitPoints.map((splitPoint) => splitPoint?.nightsFromStart)
      : [],
  };
}

export function validateSplitR1TargetedScenarioMatrixV1(matrix) {
  const issues = [];
  if (matrix?.schemaVersion !== SPLIT_R1_TARGETED_MATRIX_VERSION) {
    issues.push("targeted-matrix-schema-version-invalid");
  }
  if (!Array.isArray(matrix?.scenarios) || matrix.scenarios.length !== 6) {
    issues.push("targeted-matrix-scenario-count-invalid");
  }
  if (
    stableStringifySplitF0(matrix?.precommittedCriteria) !==
    stableStringifySplitF0(SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA)
  ) {
    issues.push("targeted-precommitted-criteria-drift");
  }
  if (
    stableStringifySplitF0(matrix?.antiCherryPicking) !==
    stableStringifySplitF0(SPLIT_R1_TARGETED_ANTI_CHERRY_PICKING)
  ) {
    issues.push("targeted-anti-cherry-picking-contract-drift");
  }
  if (
    matrix?.networkRequired !== false ||
    matrix?.targetedLiveAuthorized !== false ||
    matrix?.prebookAllowed !== false ||
    matrix?.bookingAllowed !== false ||
    matrix?.paymentAllowed !== false ||
    matrix?.publicRecommendationAllowed !== false
  ) {
    issues.push("targeted-safety-boundary-invalid");
  }
  if (
    matrix?.priceSemantics?.field !== "ourprice" ||
    matrix?.priceSemantics?.contractStatus !== "UNPROVEN" ||
    matrix?.priceSemantics?.comparisonLevel !== "CONDITIONAL_SEARCH_LEVEL_ONLY" ||
    matrix?.priceSemantics?.targetedRunGate !== SPLIT_R1_TARGETED_RUN_STATUS
  ) {
    issues.push("targeted-price-semantics-gate-invalid");
  }
  if (
    matrix?.causalLedger?.required !== true ||
    matrix?.causalLedger?.schemaVersion !== SPLIT_R1_CAUSAL_LEDGER_VERSION ||
    matrix?.causalLedger?.deterministicReplayRequired !== true
  ) {
    issues.push("targeted-causal-ledger-contract-invalid");
  }

  const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
  const ids = new Set();
  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index];
    const expected = SPLIT_R1_TARGETED_EXPECTED_SCENARIOS[index];
    const prefix = scenario?.scenarioId ?? `index-${index}`;
    if (scenario?.schemaVersion !== SPLIT_R1_TARGETED_SCENARIO_VERSION) {
      issues.push(`${prefix}:scenario-schema-version-invalid`);
    }
    if (
      expected === undefined ||
      stableStringifySplitF0(splitR1TargetedScenarioFreezeView(scenario)) !==
        stableStringifySplitF0(expected)
    ) {
      issues.push(`${prefix}:frozen-scenario-drift`);
    }
    if (ids.has(scenario?.scenarioId)) issues.push(`${prefix}:scenario-id-duplicate`);
    ids.add(scenario?.scenarioId);
    const checkIn = splitR1UtcDateMilliseconds(scenario?.checkIn);
    const checkOut = splitR1UtcDateMilliseconds(scenario?.checkOut);
    if (
      checkIn === null ||
      checkOut === null ||
      checkOut <= checkIn ||
      (checkOut - checkIn) / 86_400_000 !== scenario?.nights ||
      checkIn <= Date.UTC(2026, 7, 25)
    ) {
      issues.push(`${prefix}:date-window-invalid`);
    }
    if (
      !Number.isFinite(scenario?.destination?.latitude) ||
      !Number.isFinite(scenario?.destination?.longitude) ||
      Math.abs(scenario.destination.latitude) > 90 ||
      Math.abs(scenario.destination.longitude) > 180
    ) {
      issues.push(`${prefix}:canonical-coordinates-invalid`);
    }
    if (
      scenario?.currency !== "EUR" ||
      scenario?.guestNationality !== "IT" ||
      scenario?.occupancy?.adults !== 2 ||
      scenario?.occupancy?.rooms !== 1 ||
      scenario?.occupancy?.pets !== 0 ||
      !Array.isArray(scenario?.occupancy?.childAges) ||
      scenario.occupancy.childAges.length !== 0
    ) {
      issues.push(`${prefix}:common-occupancy-or-currency-invalid`);
    }
    if (
      scenario?.constraints?.maximumDistanceKm !== 25 ||
      scenario?.constraints?.minimumRating !== null ||
      scenario?.constraints?.minimumReviewCount !== null ||
      scenario?.constraints?.maximumTotalPrice !== null ||
      scenario?.constraints?.maximumSwitches !== 1 ||
      scenario?.constraints?.distinctPropertiesRequired !== true ||
      scenario?.constraints?.minimumSegmentNights !== 2
    ) {
      issues.push(`${prefix}:economic-constraints-invalid`);
    }
    if (!Array.isArray(scenario?.splitPoints) || scenario.splitPoints.length !== 2) {
      issues.push(`${prefix}:split-point-count-invalid`);
    } else {
      for (const splitPoint of scenario.splitPoints) {
        if (
          typeof splitPoint?.splitPointId !== "string" ||
          splitPoint.splitPointId.length === 0 ||
          !Number.isInteger(splitPoint?.nightsFromStart) ||
          splitPoint.nightsFromStart < 2 ||
          scenario.nights - splitPoint.nightsFromStart < 2
        ) {
          issues.push(`${prefix}:split-point-invalid`);
        }
      }
    }
    if (!Array.isArray(scenario?.mechanismAnchors) || scenario.mechanismAnchors.length === 0) {
      issues.push(`${prefix}:mechanism-anchor-missing`);
    } else {
      for (const anchor of scenario.mechanismAnchors) {
        const anchorDate = splitR1UtcDateMilliseconds(anchor?.date);
        if (anchorDate === null || checkIn === null || checkOut === null || anchorDate < checkIn || anchorDate >= checkOut) {
          issues.push(`${prefix}:mechanism-anchor-outside-window`);
        }
      }
    }
  }
  return { valid: issues.length === 0, issues: uniqueSorted(issues) };
}

export async function loadSplitR1TargetedScenarioMatrixV1(
  matrixPath = SPLIT_R1_TARGETED_MATRIX_PATH
) {
  const matrix = JSON.parse(await fs.readFile(matrixPath, "utf8"));
  const validation = validateSplitR1TargetedScenarioMatrixV1(matrix);
  if (!validation.valid) {
    throw new Error(`split-r1-targeted-matrix-invalid:${validation.issues.join(",")}`);
  }
  return matrix;
}

function splitR1TargetedLogicalSearch(scenario, kind, splitPointId, segmentOrdinal, period) {
  const request = {
    destinationCanonicalId: scenario.destination.canonicalId,
    countryCode: scenario.destination.countryCode,
    latitude: scenario.destination.latitude,
    longitude: scenario.destination.longitude,
    radiusMeters: Math.round(scenario.constraints.maximumDistanceKm * 1000),
    checkIn: period.checkIn,
    checkOut: period.checkOut,
    nights: period.nights,
    occupancy: scenario.occupancy,
    currency: scenario.currency,
    guestNationality: scenario.guestNationality,
  };
  const suffix = kind === "full-stay" ? "full" : `${splitPointId}.segment-${segmentOrdinal}`;
  return {
    logicalSearchId: `${scenario.scenarioId}.${suffix}`,
    scenarioId: scenario.scenarioId,
    kind,
    splitPointId,
    segmentOrdinal,
    period,
    request,
    requestFingerprint: `sha256:${crypto
      .createHash("sha256")
      .update(stableStringifySplitF0(request))
      .digest("hex")}`,
  };
}

export function buildSplitR1TargetedLogicalSearchPlanV1(matrix) {
  const validation = validateSplitR1TargetedScenarioMatrixV1(matrix);
  if (!validation.valid) {
    throw new Error(`split-r1-targeted-matrix-invalid:${validation.issues.join(",")}`);
  }
  const searches = [];
  for (const scenario of matrix.scenarios) {
    searches.push(splitR1TargetedLogicalSearch(scenario, "full-stay", null, null, scenario));
    for (const splitPoint of scenario.splitPoints) {
      const boundary = addUtcDays(scenario.checkIn, splitPoint.nightsFromStart);
      const segments = [
        {
          ordinal: 0,
          checkIn: scenario.checkIn,
          checkOut: boundary,
          nights: splitPoint.nightsFromStart,
          currency: scenario.currency,
          occupancy: scenario.occupancy,
        },
        {
          ordinal: 1,
          checkIn: boundary,
          checkOut: scenario.checkOut,
          nights: scenario.nights - splitPoint.nightsFromStart,
          currency: scenario.currency,
          occupancy: scenario.occupancy,
        },
      ];
      for (const segment of segments) {
        searches.push(
          splitR1TargetedLogicalSearch(
            scenario,
            "split-segment",
            splitPoint.splitPointId,
            segment.ordinal,
            segment
          )
        );
      }
    }
  }
  if (searches.length !== 30) throw new Error("split-r1-targeted-logical-search-count-invalid");
  return searches;
}

function buildSplitR1LogicalSearchPlan(matrix) {
  return matrix?.schemaVersion === SPLIT_R1_TARGETED_MATRIX_VERSION
    ? buildSplitR1TargetedLogicalSearchPlanV1(matrix)
    : buildSplitF0LogicalSearchPlan(matrix);
}

function splitR1ScenarioHasQualifyingComparison(scenario, predicate) {
  return Array.isArray(scenario?.splitComparisons) && scenario.splitComparisons.some(predicate);
}

export function classifySplitR1TargetedResultV1(input) {
  const scenarios = Array.isArray(input?.scenarios) ? input.scenarios : [];
  const uniqueScenarioIds = new Set(scenarios.map((scenario) => scenario?.scenarioId));
  if (uniqueScenarioIds.size !== scenarios.length) {
    throw new Error("split-r1-targeted-classification-duplicate-scenario");
  }
  const validScenarios = scenarios.filter((scenario) => scenario?.validComparison === true);
  const methodologyReasons = [];
  if (input?.priceSemanticsProven !== true) methodologyReasons.push("PRICE_SEMANTICS_UNPROVEN");
  if (input?.causalLedgerComplete !== true) methodologyReasons.push("CAUSAL_LEDGER_INCOMPLETE");
  if (input?.replayDeterministic !== true) methodologyReasons.push("REPLAY_INCOMPLETE_OR_DIVERGENT");
  if (input?.providerDataSufficient !== true) methodologyReasons.push("PROVIDER_DATA_INSUFFICIENT");
  if (
    validScenarios.length <
    SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.minimumValidScenariosForConclusion
  ) {
    methodologyReasons.push("VALID_COVERAGE_BELOW_4_OF_6");
  }
  if (methodologyReasons.length > 0) {
    return {
      classification: "METHODOLOGY_INCONCLUSIVE",
      validScenarioCount: validScenarios.length,
      qualifyingScenarioIds: [],
      reasonCodes: uniqueSorted(methodologyReasons),
    };
  }

  const robustDistinctPositiveAt25 = validScenarios.filter(
    (scenario) =>
      scenario?.baselineStable === true &&
      splitR1ScenarioHasQualifyingComparison(
        scenario,
        (comparison) =>
          comparison?.distinctProperties === true &&
          comparison?.outlier !== true &&
          Number.isSafeInteger(comparison?.netSavingAt25Minor) &&
          comparison.netSavingAt25Minor > 0
      )
  );
  const qualifyingAt50 = validScenarios.filter(
    (scenario) =>
      scenario?.baselineStable === true &&
      splitR1ScenarioHasQualifyingComparison(
        scenario,
        (comparison) =>
          comparison?.distinctProperties === true &&
          comparison?.outlier !== true &&
          Number.isSafeInteger(comparison?.netSavingAt50Minor) &&
          comparison.netSavingAt50Minor > 0 &&
          Number.isFinite(comparison?.grossSavingRatio) &&
          comparison.grossSavingRatio >=
            SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.minimumGrossSavingRatio
      )
  );
  const qualifyingIds = uniqueSorted(qualifyingAt50.map((scenario) => scenario.scenarioId));
  const hasLongPositive = qualifyingAt50.some(
    (scenario) =>
      Number.isInteger(scenario?.duration) &&
      scenario.duration >=
        SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.goRequiresAtLeastOnePositiveDurationAtOrAboveNights
  );
  if (
    validScenarios.length >= SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.minimumValidScenariosForGo &&
    qualifyingAt50.length >=
      SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.goMinimumDistinctScenariosNetPositiveAt50Eur &&
    hasLongPositive
  ) {
    return {
      classification: "CANDIDATE_GO",
      validScenarioCount: validScenarios.length,
      qualifyingScenarioIds: qualifyingIds,
      reasonCodes: ["PRECOMMITTED_GO_CRITERIA_MET"],
    };
  }
  if (
    qualifyingAt50.length ===
    SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.conditionalExactDistinctScenarioCount
  ) {
    return {
      classification: "CANDIDATE_CONDITIONAL",
      validScenarioCount: validScenarios.length,
      qualifyingScenarioIds: qualifyingIds,
      reasonCodes: ["EXACTLY_ONE_DISTINCT_SCENARIO_QUALIFIES"],
    };
  }

  const holdReasons = [];
  if (robustDistinctPositiveAt25.length === 0) holdReasons.push("ZERO_ROBUST_DISTINCT_POSITIVE_AT_25_EUR");
  const anyPositiveAt25 = validScenarios.some((scenario) =>
    splitR1ScenarioHasQualifyingComparison(
      scenario,
      (comparison) =>
        Number.isSafeInteger(comparison?.netSavingAt25Minor) && comparison.netSavingAt25Minor > 0
    )
  );
  const anyRatioAtLeastTenPercent = validScenarios.some((scenario) =>
    splitR1ScenarioHasQualifyingComparison(
      scenario,
      (comparison) =>
        Number.isSafeInteger(comparison?.netSavingAt25Minor) &&
        comparison.netSavingAt25Minor > 0 &&
        Number.isFinite(comparison?.grossSavingRatio) &&
        comparison.grossSavingRatio >= SPLIT_R1_TARGETED_PRECOMMITTED_CRITERIA.minimumGrossSavingRatio
    )
  );
  if (anyPositiveAt25 && !anyRatioAtLeastTenPercent) holdReasons.push("ALL_POSITIVE_RATIOS_BELOW_10_PERCENT");
  if (
    robustDistinctPositiveAt25.length === 0 &&
    validScenarios.some((scenario) => scenario?.samePropertyCounterfactualPositive === true)
  ) {
    holdReasons.push("SAME_PROPERTY_ONLY_POSITIVITY");
  }
  const positivityInvalidatedByOutlierOrBaseline = validScenarios.some(
    (scenario) =>
      splitR1ScenarioHasQualifyingComparison(
        scenario,
        (comparison) =>
          Number.isSafeInteger(comparison?.netSavingAt25Minor) &&
          comparison.netSavingAt25Minor > 0 &&
          (comparison?.outlier === true || scenario?.baselineStable !== true)
      )
  );
  if (anyPositiveAt25 && robustDistinctPositiveAt25.length === 0 && positivityInvalidatedByOutlierOrBaseline) {
    holdReasons.push("POSITIVITY_DEPENDS_ON_OUTLIER_OR_UNSTABLE_BASELINE");
  }
  if (holdReasons.length === 0) holdReasons.push("PRECOMMITTED_GO_CRITERIA_NOT_MET");
  return {
    classification: "HOLD_NO_SIGNAL",
    validScenarioCount: validScenarios.length,
    qualifyingScenarioIds: qualifyingIds,
    reasonCodes: uniqueSorted(holdReasons),
  };
}

export function buildSplitR1TargetedDryRunPlanV1(matrix) {
  const logicalSearches = buildSplitR1TargetedLogicalSearchPlanV1(matrix);
  const durations = matrix.scenarios.map((scenario) => scenario.nights);
  if (
    stableStringifySplitF0(durations) !==
    stableStringifySplitF0(SPLIT_R1_TARGETED_EXPECTED_DURATIONS)
  ) {
    throw new Error("split-r1-targeted-duration-matrix-mismatch");
  }
  return {
    schemaVersion: "stayopti.split-r1.targeted-dry-run@1",
    status: "PASS",
    mode: "TARGETED_DRY_RUN_ONLY",
    matrixVersion: matrix.schemaVersion,
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
    targetedLiveAuthorized: false,
    priceSemanticsGate: SPLIT_R1_TARGETED_PRICE_SEMANTICS_GATE,
    targetedRunStatus: SPLIT_R1_TARGETED_RUN_STATUS,
    causalLedgerRequired: SPLIT_R1_CAUSAL_LEDGER_VERSION,
    strictComparabilityAllowed: false,
    conditionalComparabilityImplemented: true,
    fixedBaselineImplemented: true,
    antiCherryPickingFrozen: true,
    publicRecommendationAllowed: false,
    policyEligible: false,
  };
}

const SPLIT_R1_OURPRICE_PROBE_EXPECTED_SCENARIO = Object.freeze({
  scenarioId: "split-r1-ourprice-semantics-001",
  destination: {
    canonicalId: "it-roma",
    label: "Roma",
    countryCode: "IT",
    latitude: 41.9028,
    longitude: 12.4964,
    providerDestinationIds: [],
  },
  currency: "EUR",
  occupancy: {
    roomCount: 1,
    rooms: [{ adults: 2, children: 0, childAges: [] }],
  },
  windows: [
    { windowId: "A", checkIn: "2027-02-02", checkOut: "2027-02-03", nights: 1 },
    { windowId: "B", checkIn: "2027-02-03", checkOut: "2027-02-04", nights: 1 },
    { windowId: "AB", checkIn: "2027-02-02", checkOut: "2027-02-04", nights: 2 },
  ],
});

const SPLIT_R1_OURPRICE_PROBE_LIVE_CONTRACT = Object.freeze({
  liveAuthorizedByThisPhase: false,
  partnerTokenHttpBudget: 1,
  destinationHttpBudget: 1,
  hotelSearchHttpBudget: SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET,
  totalRouteStackHttpBudget: SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET,
  continuationAllowed: false,
  retries: 0,
  redirects: 0,
  maxRequestsPerSecond: 1,
  minRequestStartIntervalMs: SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS,
  concurrency: 1,
  detailsAllowed: false,
  roomsAndRatesAllowed: false,
  revalidationAllowed: false,
  prebookAllowed: false,
  bookingAllowed: false,
  paymentAllowed: false,
});

const SPLIT_R1_OURPRICE_PROBE_MATCHING_CONTRACT = Object.freeze({
  commonPropertyUniverseOnly: true,
  propertyIdentity: "RUN_LOCAL_HMAC_SHA256",
  ephemeralSecretPersisted: false,
  crossRunLinkability: false,
  requiredCurrency: "EUR",
  currencyConversionAllowed: false,
  missingValueImputationAllowed: false,
  manualPropertySelectionAllowed: false,
  outlierRemovalAllowed: false,
});

export const SPLIT_R1_OURPRICE_PROBE_CRITERIA = Object.freeze({
  totalStay: {
    minimumCommonPropertyCount: 10,
    maximumMedianTotalError: 0.2,
    minimumMedianNightlyError: 0.35,
    minimumShareTotalCloser: 0.8,
  },
  nightly: {
    minimumCommonPropertyCount: 10,
    maximumMedianNightlyError: 0.2,
    minimumMedianTotalError: 0.35,
    minimumShareNightlyCloser: 0.8,
  },
  otherwise: "INCONCLUSIVE",
  ambiguousInvariantFailure: "AMBIGUOUS_CLASSIFICATION_INVARIANT_FAILURE",
  percentileMethod: "LINEAR_INTERPOLATION_R7",
  outlierRemovalAllowed: false,
  postHocSubsetSelectionAllowed: false,
});

const SPLIT_R1_OURPRICE_PROBE_CONCLUSION_LIMITS = Object.freeze({
  taxCompleteness: "UNPROVEN",
  mandatoryChargesCompleteness: "UNPROVEN",
  bookablePriceEquivalence: "UNPROVEN",
  contractualProviderConfirmation: false,
  targetedLiveMatrixAuthorized: false,
  publicRecommendationAllowed: false,
  policyEligible: false,
});

export function validateSplitR1OurpriceSemanticsProbeV1(probe) {
  const issues = [];
  if (probe?.schemaVersion !== SPLIT_R1_OURPRICE_PROBE_VERSION) {
    issues.push("ourprice-probe-schema-version-invalid");
  }
  if (
    stableStringifySplitF0(probe?.scenario) !==
    stableStringifySplitF0(SPLIT_R1_OURPRICE_PROBE_EXPECTED_SCENARIO)
  ) {
    issues.push("ourprice-probe-scenario-drift");
  }
  if (
    stableStringifySplitF0(probe?.futureLiveContract) !==
    stableStringifySplitF0(SPLIT_R1_OURPRICE_PROBE_LIVE_CONTRACT)
  ) {
    issues.push("ourprice-probe-live-contract-drift");
  }
  if (
    stableStringifySplitF0(probe?.matchingContract) !==
    stableStringifySplitF0(SPLIT_R1_OURPRICE_PROBE_MATCHING_CONTRACT)
  ) {
    issues.push("ourprice-probe-matching-contract-drift");
  }
  if (
    stableStringifySplitF0(probe?.classificationCriteria) !==
    stableStringifySplitF0(SPLIT_R1_OURPRICE_PROBE_CRITERIA)
  ) {
    issues.push("ourprice-probe-classification-criteria-drift");
  }
  if (
    stableStringifySplitF0(probe?.conclusionLimits) !==
    stableStringifySplitF0(SPLIT_R1_OURPRICE_PROBE_CONCLUSION_LIMITS)
  ) {
    issues.push("ourprice-probe-conclusion-limits-drift");
  }
  const windows = Array.isArray(probe?.scenario?.windows) ? probe.scenario.windows : [];
  if (windows.length !== 3 || stableStringifySplitF0(windows.map((window) => window.windowId)) !== '["A","B","AB"]') {
    issues.push("ourprice-probe-window-set-invalid");
  }
  for (const window of windows) {
    const checkIn = splitR1UtcDateMilliseconds(window?.checkIn);
    const checkOut = splitR1UtcDateMilliseconds(window?.checkOut);
    if (
      checkIn === null ||
      checkOut === null ||
      checkOut <= checkIn ||
      (checkOut - checkIn) / 86_400_000 !== window?.nights
    ) {
      issues.push(`ourprice-probe-window-invalid:${window?.windowId ?? "unknown"}`);
    }
  }
  if (
    windows.length === 3 &&
    (windows[0].checkOut !== windows[1].checkIn ||
      windows[0].checkIn !== windows[2].checkIn ||
      windows[1].checkOut !== windows[2].checkOut)
  ) {
    issues.push("ourprice-probe-window-composition-invalid");
  }
  return { valid: issues.length === 0, issues: uniqueSorted(issues) };
}

export async function loadSplitR1OurpriceSemanticsProbeV1(
  probePath = SPLIT_R1_OURPRICE_PROBE_PATH
) {
  const probe = JSON.parse(await fs.readFile(probePath, "utf8"));
  const validation = validateSplitR1OurpriceSemanticsProbeV1(probe);
  if (!validation.valid) {
    throw new Error(`split-r1-ourprice-probe-invalid:${validation.issues.join(",")}`);
  }
  return probe;
}

function splitR1OurpriceProbeOccupancyForLogicalSearch(probe) {
  const room = probe.scenario.occupancy.rooms[0];
  return {
    adults: room.adults,
    childAges: [...room.childAges],
    rooms: probe.scenario.occupancy.roomCount,
    pets: 0,
  };
}

export function buildSplitR1OurpriceSemanticsLogicalSearchesV1(probe) {
  const validation = validateSplitR1OurpriceSemanticsProbeV1(probe);
  if (!validation.valid) {
    throw new Error(`split-r1-ourprice-probe-invalid:${validation.issues.join(",")}`);
  }
  const occupancy = splitR1OurpriceProbeOccupancyForLogicalSearch(probe);
  return probe.scenario.windows.map((window) => {
    const request = {
      destinationCanonicalId: probe.scenario.destination.canonicalId,
      countryCode: probe.scenario.destination.countryCode,
      latitude: probe.scenario.destination.latitude,
      longitude: probe.scenario.destination.longitude,
      checkIn: window.checkIn,
      checkOut: window.checkOut,
      nights: window.nights,
      occupancy,
      currency: probe.scenario.currency,
      guestNationality: "IT",
    };
    return {
      logicalSearchId: `${probe.scenario.scenarioId}.window-${window.windowId}`,
      scenarioId: probe.scenario.scenarioId,
      kind: "ourprice-semantics-window",
      windowId: window.windowId,
      splitPointId: null,
      segmentOrdinal: null,
      period: window,
      request,
      requestFingerprint: `sha256:${crypto
        .createHash("sha256")
        .update(stableStringifySplitF0(request))
        .digest("hex")}`,
    };
  });
}

export function buildSplitR1OurpriceSemanticsDryRunV1(probe) {
  const searches = buildSplitR1OurpriceSemanticsLogicalSearchesV1(probe);
  return {
    schemaVersion: "stayopti.split-r1.ourprice-semantics-probe-dry-run@1",
    status: "PASS",
    mode: "OURPRICE_SEMANTICS_PROBE_DRY_RUN_ONLY",
    probeVersion: probe.schemaVersion,
    scenarios: 1,
    logicalHotelSearches: searches.length,
    windows: searches.map((search) => ({
      windowId: search.windowId,
      checkIn: search.period.checkIn,
      checkOut: search.period.checkOut,
      nights: search.period.nights,
      requestFingerprint: search.requestFingerprint,
    })),
    httpRequests: 0,
    futureHotelSearchHttpCap: SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET,
    futureTotalHttpCap: SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET,
    continuationAllowed: false,
    retries: 0,
    redirects: 0,
    minRequestStartIntervalMs: SPLIT_R1_MIN_REQUEST_START_INTERVAL_MS,
    concurrency: 1,
    targetedLiveMatrixAuthorized: false,
    priceSemanticsGate: SPLIT_R1_TARGETED_PRICE_SEMANTICS_GATE,
    publicRecommendationAllowed: false,
    policyEligible: false,
  };
}

function splitR1LinearInterpolatedQuantile(values, probability) {
  if (!Array.isArray(values) || values.length === 0 || !Number.isFinite(probability) || probability < 0 || probability > 1) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  const fraction = position - lowerIndex;
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * fraction;
}

function splitR1ProbeWindowEligiblePrices(receipt, expectedOccupancy) {
  if (
    receipt === null ||
    typeof receipt !== "object" ||
    stableStringifySplitF0(receipt.occupancy) !== stableStringifySplitF0(expectedOccupancy)
  ) {
    throw new Error("split-r1-ourprice-probe-occupancy-mismatch");
  }
  const rejections = {
    PROPERTY_FINGERPRINT_INVALID: 0,
    PRICE_NON_INTEGER: 0,
    PRICE_NON_POSITIVE: 0,
    CURRENCY_MISMATCH: 0,
    DUPLICATE_PROPERTY_WORSE_PRICE: 0,
  };
  const prices = new Map();
  for (const offer of Array.isArray(receipt.offers) ? receipt.offers : []) {
    if (typeof offer?.propertyFingerprint !== "string" || !/^hmac-sha256:[a-f0-9]{64}$/.test(offer.propertyFingerprint)) {
      rejections.PROPERTY_FINGERPRINT_INVALID += 1;
      continue;
    }
    if (!Number.isSafeInteger(offer?.totalMinorUnits)) {
      rejections.PRICE_NON_INTEGER += 1;
      continue;
    }
    if (offer.totalMinorUnits <= 0) {
      rejections.PRICE_NON_POSITIVE += 1;
      continue;
    }
    if (receipt.currency !== "EUR" || offer?.currency !== "EUR") {
      rejections.CURRENCY_MISMATCH += 1;
      continue;
    }
    const previous = prices.get(offer.propertyFingerprint);
    if (previous !== undefined) {
      rejections.DUPLICATE_PROPERTY_WORSE_PRICE += 1;
      if (offer.totalMinorUnits >= previous) continue;
    }
    prices.set(offer.propertyFingerprint, offer.totalMinorUnits);
  }
  return { prices, rejections };
}

export function assertSplitR1OurpriceClassificationExclusiveV1(totalSupported, nightlySupported) {
  if (totalSupported === true && nightlySupported === true) {
    throw new Error("AMBIGUOUS_CLASSIFICATION_INVARIANT_FAILURE");
  }
  return true;
}

export function classifySplitR1OurpriceSemanticsMetricsV1(metrics) {
  const totalSupported =
    metrics?.commonPropertyCount >= SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.minimumCommonPropertyCount &&
    metrics?.medianTotalError <= SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.maximumMedianTotalError &&
    metrics?.medianNightlyError >= SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.minimumMedianNightlyError &&
    metrics?.shareTotalCloser >= SPLIT_R1_OURPRICE_PROBE_CRITERIA.totalStay.minimumShareTotalCloser;
  const nightlySupported =
    metrics?.commonPropertyCount >= SPLIT_R1_OURPRICE_PROBE_CRITERIA.nightly.minimumCommonPropertyCount &&
    metrics?.medianNightlyError <= SPLIT_R1_OURPRICE_PROBE_CRITERIA.nightly.maximumMedianNightlyError &&
    metrics?.medianTotalError >= SPLIT_R1_OURPRICE_PROBE_CRITERIA.nightly.minimumMedianTotalError &&
    metrics?.shareNightlyCloser >= SPLIT_R1_OURPRICE_PROBE_CRITERIA.nightly.minimumShareNightlyCloser;
  assertSplitR1OurpriceClassificationExclusiveV1(totalSupported, nightlySupported);
  if (totalSupported) return "TOTAL_STAY_EMPIRICALLY_SUPPORTED";
  if (nightlySupported) return "NIGHTLY_EMPIRICALLY_SUPPORTED";
  return "INCONCLUSIVE";
}

function splitR1ProbePriceDistribution(values) {
  return {
    minimumMinorUnits: values.length === 0 ? null : Math.min(...values),
    medianMinorUnits: splitR1LinearInterpolatedQuantile(values, 0.5),
    maximumMinorUnits: values.length === 0 ? null : Math.max(...values),
  };
}

export function evaluateSplitR1OurpriceSemanticsProbeV1(probe, receipts) {
  const validation = validateSplitR1OurpriceSemanticsProbeV1(probe);
  if (!validation.valid) {
    throw new Error(`split-r1-ourprice-probe-invalid:${validation.issues.join(",")}`);
  }
  const expectedOccupancy = probe.scenario.occupancy;
  const receiptMap = new Map(
    (Array.isArray(receipts) ? receipts : []).map((receipt) => [receipt?.windowId, receipt])
  );
  if (receiptMap.size !== 3 || !["A", "B", "AB"].every((windowId) => receiptMap.has(windowId))) {
    throw new Error("split-r1-ourprice-probe-receipts-incomplete");
  }
  const windows = Object.fromEntries(
    ["A", "B", "AB"].map((windowId) => [
      windowId,
      splitR1ProbeWindowEligiblePrices(receiptMap.get(windowId), expectedOccupancy),
    ])
  );
  const commonFingerprints = [...windows.A.prices.keys()]
    .filter((fingerprint) => windows.B.prices.has(fingerprint) && windows.AB.prices.has(fingerprint))
    .sort();
  const totalErrors = [];
  const nightlyErrors = [];
  const pricesA = [];
  const pricesB = [];
  const pricesAB = [];
  let totalCloser = 0;
  let nightlyCloser = 0;
  let ties = 0;
  for (const fingerprint of commonFingerprints) {
    const priceA = windows.A.prices.get(fingerprint);
    const priceB = windows.B.prices.get(fingerprint);
    const priceAB = windows.AB.prices.get(fingerprint);
    const expectedTotal = priceA + priceB;
    if (!Number.isSafeInteger(expectedTotal) || expectedTotal <= 0) {
      throw new Error("split-r1-ourprice-probe-expected-total-invalid");
    }
    const totalError = Math.abs(priceAB - expectedTotal) / expectedTotal;
    const nightlyError = Math.abs(2 * priceAB - expectedTotal) / expectedTotal;
    totalErrors.push(totalError);
    nightlyErrors.push(nightlyError);
    pricesA.push(priceA);
    pricesB.push(priceB);
    pricesAB.push(priceAB);
    if (totalError < nightlyError) totalCloser += 1;
    else if (nightlyError < totalError) nightlyCloser += 1;
    else ties += 1;
  }
  const commonPropertyCount = commonFingerprints.length;
  const denominator = commonPropertyCount === 0 ? null : commonPropertyCount;
  const metrics = {
    commonPropertyCount,
    medianTotalError: splitR1LinearInterpolatedQuantile(totalErrors, 0.5),
    p25TotalError: splitR1LinearInterpolatedQuantile(totalErrors, 0.25),
    p75TotalError: splitR1LinearInterpolatedQuantile(totalErrors, 0.75),
    medianNightlyError: splitR1LinearInterpolatedQuantile(nightlyErrors, 0.5),
    p25NightlyError: splitR1LinearInterpolatedQuantile(nightlyErrors, 0.25),
    p75NightlyError: splitR1LinearInterpolatedQuantile(nightlyErrors, 0.75),
    shareTotalCloser: denominator === null ? 0 : totalCloser / denominator,
    shareNightlyCloser: denominator === null ? 0 : nightlyCloser / denominator,
    shareTies: denominator === null ? 0 : ties / denominator,
    priceDistributions: {
      A: splitR1ProbePriceDistribution(pricesA),
      B: splitR1ProbePriceDistribution(pricesB),
      AB: splitR1ProbePriceDistribution(pricesAB),
    },
  };
  const result = {
    schemaVersion: "stayopti.split-r1.ourprice-semantics-probe-result@1",
    scenarioId: probe.scenario.scenarioId,
    classification: classifySplitR1OurpriceSemanticsMetricsV1(metrics),
    metrics,
    rejectionCountsByWindow: Object.fromEntries(
      ["A", "B", "AB"].map((windowId) => [windowId, windows[windowId].rejections])
    ),
    percentileMethod: SPLIT_R1_OURPRICE_PROBE_CRITERIA.percentileMethod,
    outlierRemovalApplied: false,
    postHocSubsetSelectionApplied: false,
    propertyFingerprintsPersisted: 0,
    rawIdentifiersPersisted: 0,
    ephemeralSecretPersisted: false,
    crossRunLinkability: false,
    conclusionLimits: { ...SPLIT_R1_OURPRICE_PROBE_CONCLUSION_LIMITS },
  };
  assertSplitR1PersistedPayloadSafe(result);
  return result;
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
      let requestStart = monotonicNow();
      if (!Number.isFinite(requestStart)) throw new Error("split-r1-monotonic-clock-invalid");
      let earlyWakeCycles = 0;
      let requestedWaitMilliseconds = 0;
      while (
        lastRequestStart !== null &&
        requestStart - lastRequestStart < minRequestStartIntervalMs
      ) {
        if (earlyWakeCycles >= SPLIT_R1_MAX_EARLY_WAKE_CYCLES) {
          throw new Error("RATE_LIMIT_CLOCK_DID_NOT_PROGRESS");
        }
        const remainingMilliseconds =
          minRequestStartIntervalMs - (requestStart - lastRequestStart);
        const waitMilliseconds =
          Math.ceil(remainingMilliseconds) + SPLIT_R1_RATE_LIMIT_SAFETY_MARGIN_MS;
        if (
          requestedWaitMilliseconds + waitMilliseconds >
          SPLIT_R1_MAX_RATE_LIMIT_WAIT_MS
        ) {
          throw new Error("RATE_LIMIT_CLOCK_DID_NOT_PROGRESS");
        }
        await sleep(waitMilliseconds);
        requestedWaitMilliseconds += waitMilliseconds;
        earlyWakeCycles += 1;
        requestStart = monotonicNow();
        if (!Number.isFinite(requestStart)) {
          throw new Error("split-r1-monotonic-clock-invalid");
        }
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
    await rateLimiter.awaitStartSlot();
    const reservation = budgetLedger.reserve(requestClass);
    if (!reservation.reserved) {
      throw new SplitR1BudgetBoundedError(reservation.reason);
    }
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

export async function runSplitR1OurpriceSemanticsProbeV1({
  probe,
  options,
  environment = process.env,
  execArgv = process.execArgv,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  randomUUID = crypto.randomUUID,
  ephemeralRunKey = crypto.randomBytes(32),
  monotonicNow,
  sleep,
}) {
  const dryRun = buildSplitR1OurpriceSemanticsDryRunV1(probe);
  if (options?.mode === "ourprice-probe-dry-run") return dryRun;
  if (options?.mode !== "ourprice-probe-live") {
    throw new Error("split-r1-ourprice-probe-mode-invalid");
  }
  const configuration = resolveProductionConfiguration(environment, execArgv);
  const transport = createSplitR1NativeTransport({
    baseUrl: configuration.baseUrl,
    fetchImpl,
    monotonicNow,
    sleep,
    budgetLimits: {
      hotelSearchHttpBudget: SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET,
      totalRouteStackHttpBudget: SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET,
    },
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
  const destinationPayload = await transport.post(
    SPLIT_R1_DESTINATION_ENDPOINT,
    createSplitR1DestinationRequest(probe.scenario),
    partnerToken
  );
  const destination = selectSplitR1DestinationCandidate(destinationPayload, probe.scenario);
  const searches = buildSplitR1OurpriceSemanticsLogicalSearchesV1(probe);
  const receipts = [];
  for (const logicalSearch of searches) {
    const responsePayload = await transport.post(
      SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
      createSplitR1HotelSearchRequest(logicalSearch, destination),
      partnerToken
    );
    const container = normalizeResponseContainer(responsePayload);
    if (
      typeof container?.nextResultsKey === "string" &&
      container.nextResultsKey.length > 0
    ) {
      throw new Error("split-r1-ourprice-probe-continuation-prohibited");
    }
    const page = normalizeSplitR1SearchPage(responsePayload, {
      logicalSearch,
      ephemeralRunKey,
    });
    receipts.push({
      windowId: logicalSearch.windowId,
      currency: logicalSearch.request.currency,
      occupancy: probe.scenario.occupancy,
      offers: page.offers,
    });
  }
  const budget = transport.getBudgetSnapshot();
  if (
    budget.hotelSearchRequests !== SPLIT_R1_OURPRICE_PROBE_HOTEL_SEARCH_HTTP_BUDGET ||
    budget.totalRouteStackRequests !== SPLIT_R1_OURPRICE_PROBE_TOTAL_HTTP_BUDGET
  ) {
    throw new Error("split-r1-ourprice-probe-request-count-invalid");
  }
  const result = {
    schemaVersion: "stayopti.split-r1.ourprice-semantics-probe-live-result@1",
    environment: "production",
    privateDiagnosticOnly: true,
    httpRequests: budget.totalRouteStackRequests,
    hotelSearchHttpRequests: budget.hotelSearchRequests,
    continuationHttpRequests: 0,
    retries: 0,
    redirects: 0,
    evaluation: evaluateSplitR1OurpriceSemanticsProbeV1(probe, receipts),
    targetedLiveMatrixAuthorized: false,
    publicRecommendationAllowed: false,
    policyEligible: false,
  };
  assertSplitR1PersistedPayloadSafe(result);
  return result;
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
  if (
    options.mode === "ourprice-probe-dry-run" ||
    options.mode === "ourprice-probe-live"
  ) {
    return runSplitR1OurpriceSemanticsProbeV1({
      probe: matrix,
      options,
      environment,
      execArgv,
      fetchImpl,
      now,
      randomUUID,
      ephemeralRunKey,
      monotonicNow,
      sleep,
    });
  }
  if (options.mode === "targeted-dry-run") {
    return buildSplitR1TargetedDryRunPlanV1(matrix);
  }
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
  const logicalSearches = buildSplitR1LogicalSearchPlan(matrix);
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
    initialPageCount: 0,
    continuationCount: 0,
    pageDiagnostics: [],
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
    state.initialPageCount = 1;
    const initialPage = normalizeSplitR1SearchPage(state.latestResponse, {
      logicalSearch: state.logicalSearch,
      ephemeralRunKey,
    });
    state.pageDiagnostics.push(initialPage);
    state.offers.push(...initialPage.offers);
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
      const continuationPage = normalizeSplitR1SearchPage(state.latestResponse, {
        logicalSearch: state.logicalSearch,
        ephemeralRunKey,
      });
      state.pageDiagnostics.push(continuationPage);
      state.offers.push(...continuationPage.offers);
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
  const economicScenarios = matrix.scenarios.map((scenario) =>
    evaluateSplitR1SearchLevelScenario(
      scenario,
      completedOffers.filter((offer) => offer.scenarioId === scenario.scenarioId)
    )
  );
  const causalLedger = buildSplitR1CausalLedger(matrix, searchStates);
  const replayedScenarios = causalLedger.replay.scenarios.map((scenario) => scenario.headline);
  if (
    stableStringifySplitF0(economicScenarios) !==
    stableStringifySplitF0(replayedScenarios)
  ) {
    throw new Error("split-r1-causal-headline-replay-diverged");
  }
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
    scenarios: economicScenarios,
    causalLedger,
  };
  assertSplitR1PersistedPayloadSafe(result);
  return result;
}

async function main() {
  const options = parseSplitR1Arguments(process.argv.slice(2));
  const matrix =
    options.mode === "ourprice-probe-dry-run" || options.mode === "ourprice-probe-live"
      ? await loadSplitR1OurpriceSemanticsProbeV1()
      : options.mode === "targeted-dry-run"
      ? await loadSplitR1TargetedScenarioMatrixV1()
      : await loadSplitF0ScenarioMatrix();
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
