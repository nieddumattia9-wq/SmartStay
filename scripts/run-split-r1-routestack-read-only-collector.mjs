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

export function selectSplitR1DestinationCandidate(payload, scenario) {
  const candidates = getResponseItems(payload)
    .map((candidate) => {
      const id = candidate?.id ?? candidate?.destinationId;
      const latitude = finiteNumber(candidate?.coordinates?.lat);
      const longitude = finiteNumber(candidate?.coordinates?.long);
      if (typeof id !== "string" || id.length === 0 || latitude === null || longitude === null) {
        return null;
      }
      return {
        id,
        latitude,
        longitude,
        distanceKm: splitR1HaversineKm(
          { latitude: scenario.destination.latitude, longitude: scenario.destination.longitude },
          { latitude, longitude }
        ),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceKm - right.distanceKm || left.id.localeCompare(right.id));
  if (candidates.length === 0 || candidates[0].distanceKm > 25) {
    throw new Error("split-r1-destination-not-within-25km");
  }
  if (candidates[1] && Math.abs(candidates[0].distanceKm - candidates[1].distanceKm) < 1e-9) {
    throw new Error("split-r1-destination-nearest-ambiguous");
  }
  return candidates[0];
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

export function createSplitR1NativeTransport({
  baseUrl = SPLIT_R1_OFFICIAL_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = SPLIT_R1_HTTP_TIMEOUT_MS,
}) {
  validateSplitR1BaseUrl(baseUrl);
  if (typeof fetchImpl !== "function") throw new Error("split-r1-native-fetch-unavailable");
  let httpRequests = 0;
  const post = async (endpointPath, body, bearerToken = null) => {
    assertSplitR1EndpointAllowed("POST", endpointPath);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    httpRequests += 1;
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
      clearTimeout(timeout);
    }
  };
  return {
    post,
    getHttpRequestCount: () => httpRequests,
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
}) {
  const dryRun = buildSplitR1DryRunPlan(matrix);
  if (options.mode === "dry-run") return dryRun;

  const configuration = resolveProductionConfiguration(environment, execArgv);
  const transport = createSplitR1NativeTransport({ baseUrl: configuration.baseUrl, fetchImpl });
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
  const allOffers = [];
  for (const scenario of matrix.scenarios) {
    const destinationPayload = await transport.post(
      SPLIT_R1_DESTINATION_ENDPOINT,
      createSplitR1DestinationRequest(scenario),
      partnerToken
    );
    const destination = selectSplitR1DestinationCandidate(destinationPayload, scenario);
    for (const logicalSearch of logicalSearches.filter((search) => search.scenarioId === scenario.scenarioId)) {
      const originalRequest = createSplitR1HotelSearchRequest(logicalSearch, destination);
      let responsePayload = await transport.post(
        SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
        originalRequest,
        partnerToken
      );
      allOffers.push(...normalizeSplitR1SearchResponse(responsePayload, { logicalSearch, ephemeralRunKey }));
      for (let continuationOrdinal = 1; continuationOrdinal <= 2; continuationOrdinal += 1) {
        const container = normalizeResponseContainer(responsePayload);
        if (typeof container?.nextResultsKey !== "string" || container.nextResultsKey.length === 0) break;
        const continuationRequest = createSplitR1ContinuationRequest(
          originalRequest,
          responsePayload,
          continuationOrdinal
        );
        responsePayload = await transport.post(
          SPLIT_R1_HOTEL_SEARCH_ENDPOINT,
          continuationRequest,
          partnerToken
        );
        allOffers.push(...normalizeSplitR1SearchResponse(responsePayload, { logicalSearch, ephemeralRunKey }));
      }
      const finalContainer = normalizeResponseContainer(responsePayload);
      if (typeof finalContainer?.nextResultsKey === "string" && finalContainer.nextResultsKey.length > 0) {
        throw new Error("split-r1-continuation-budget-exceeded");
      }
    }
  }
  const result = {
    schemaVersion: "stayopti.split-r1.production-search-level-result@1",
    environment: "production",
    privatePilotOnly: true,
    marketEvidence: "LIMITED_SEARCH_LEVEL_ONLY",
    policyEligible: false,
    publicRecommendationAllowed: false,
    httpRequests: transport.getHttpRequestCount(),
    scenarios: matrix.scenarios.map((scenario) =>
      evaluateSplitR1SearchLevelScenario(
        scenario,
        allOffers.filter((offer) => offer.scenarioId === scenario.scenarioId)
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
