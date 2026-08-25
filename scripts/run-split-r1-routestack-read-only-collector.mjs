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
export const SPLIT_R1_MAX_EARLY_WAKE_CYCLES = 10;
export const SPLIT_R1_MAX_RATE_LIMIT_WAIT_MS = 5_000;
export const SPLIT_R1_RATE_LIMIT_SAFETY_MARGIN_MS = 1;
export const SPLIT_R1_RETRIES = 0;
export const SPLIT_R1_CONCURRENCY = 1;
export const SPLIT_R1_HTTP_TIMEOUT_MS = 120_000;
export const SPLIT_R1_CAUSAL_LEDGER_VERSION = "stayopti.split-r1.causal-ledger@1";
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
  const logicalSearches = buildSplitF0LogicalSearchPlan(matrix);
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
