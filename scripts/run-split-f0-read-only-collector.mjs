import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  SPLIT_F0_SCENARIO_MATRIX_VERSION_V1,
  buildSplitF0SegmentsV1,
  evaluateSplitF0EconomicOpportunityV1,
  validateSplitF0ScenarioV1,
} from "../src/engine-v3/evaluation/splitF0EconomicFeasibilityPilotV3.ts";

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const SPLIT_F0_REPOSITORY_ROOT = path.resolve(CURRENT_DIRECTORY, "..");
export const SPLIT_F0_MATRIX_PATH = path.join(
  SPLIT_F0_REPOSITORY_ROOT,
  "tests",
  "engine-v3",
  "fixtures",
  "split-f0-scenario-matrix-v1.json"
);
export const SPLIT_F0_OFFICIAL_BASE_URL = "https://api.liteapi.travel/v3.0";
export const SPLIT_F0_MAX_LOGICAL_SEARCHES = 40;
export const SPLIT_F0_MAX_HTTP_REQUESTS = 120;
export const SPLIT_F0_MAX_HTTP_REQUESTS_PER_SCENARIO = 15;
export const SPLIT_F0_MAX_REQUESTS_PER_SECOND = 4;
export const SPLIT_F0_MAX_RETRIES = 2;
export const SPLIT_F0_HTTP_TIMEOUT_MS = 15_000;

const ALLOWED_ENDPOINTS = new Map([
  ["POST /hotels/rates", "rates-search"],
  ["GET /data/hotels", "static-hotel-metadata"],
  ["GET /data/facilities", "static-hotel-facilities"],
]);
const FORBIDDEN_ENDPOINT_PARTS = [
  "prebook",
  "book",
  "booking",
  "cancel",
  "payment",
  "wallet",
  "checkout",
  "loyalty",
  "voucher",
  "markup",
  "commission",
];
const FORBIDDEN_PERSISTED_KEYS = new Set([
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "headers",
  "token",
  "rawhotelid",
  "rawofferid",
  "prebookid",
  "bookingid",
  "deeplink",
  "whitelabelurl",
  "hotelname",
  "propertyname",
  "address",
  "latitude",
  "longitude",
  "coordinates",
  "images",
  "guestdata",
  "pii",
  "commission",
  "markup",
  "wallet",
  "paymentdata",
]);

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

export function stableStringifySplitF0(value, indentation = 0) {
  return JSON.stringify(stableValue(value), null, indentation);
}

export function sha256SplitF0(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function isPathInsideRepository(candidatePath) {
  const repository = path.resolve(SPLIT_F0_REPOSITORY_ROOT).toLowerCase();
  const candidate = path.resolve(candidatePath).toLowerCase();
  return candidate === repository || candidate.startsWith(`${repository}${path.sep}`);
}

export function validateSplitF0OutputPath(outputPath) {
  if (typeof outputPath !== "string" || outputPath.trim().length === 0) {
    return { valid: false, reason: "output-path-required" };
  }
  const resolved = path.resolve(outputPath);
  if (isPathInsideRepository(resolved)) {
    return { valid: false, reason: "output-path-inside-repository" };
  }
  return { valid: true, resolved };
}

export function validateSplitF0SandboxKey(apiKey) {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    return { valid: false, reason: "sandbox-key-absent" };
  }
  if (apiKey.startsWith("prod_")) {
    return { valid: false, reason: "production-key-prohibited" };
  }
  if (!apiKey.startsWith("sand_")) {
    return { valid: false, reason: "sandbox-key-prefix-unrecognized" };
  }
  return { valid: true, reason: null };
}

export function validateSplitF0BaseUrl(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { valid: false, reason: "base-url-invalid" };
  }
  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "base-url-https-required" };
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return { valid: false, reason: "base-url-credentials-prohibited" };
  }
  if (parsed.hostname.toLowerCase() !== "api.liteapi.travel") {
    return { valid: false, reason: "base-url-host-not-allowlisted" };
  }
  if (parsed.port !== "" && parsed.port !== "443") {
    return { valid: false, reason: "base-url-port-not-allowlisted" };
  }
  if (parsed.pathname.replace(/\/+$/, "") !== "/v3.0") {
    return { valid: false, reason: "base-url-api-version-not-allowlisted" };
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    return { valid: false, reason: "base-url-query-or-fragment-prohibited" };
  }
  return { valid: true, normalized: SPLIT_F0_OFFICIAL_BASE_URL };
}

export function assertSplitF0EndpointAllowed(method, endpointPath) {
  const normalizedMethod = String(method ?? "").trim().toUpperCase();
  const normalizedPath = String(endpointPath ?? "").trim().toLowerCase();
  if (
    FORBIDDEN_ENDPOINT_PARTS.some((part) =>
      normalizedPath
        .split(/[/?#._-]+/)
        .some((token) => token === part || token.startsWith(part))
    )
  ) {
    throw new Error(`split-f0-endpoint-prohibited:${normalizedPath}`);
  }
  const key = `${normalizedMethod} ${normalizedPath}`;
  if (!ALLOWED_ENDPOINTS.has(key)) {
    throw new Error(`split-f0-endpoint-not-allowlisted:${key}`);
  }
  return ALLOWED_ENDPOINTS.get(key);
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (typeof value !== "string" || value.startsWith("--")) {
    throw new Error(`split-f0-cli-value-required:${optionName}`);
  }
  return value;
}

export function parseSplitF0CollectorArguments(argv) {
  const options = {
    mode: "dry-run",
    environment: null,
    outputPath: null,
    baseUrl: SPLIT_F0_OFFICIAL_BASE_URL,
  };
  let explicitDryRun = false;
  let explicitExecute = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      explicitDryRun = true;
      options.mode = "dry-run";
      continue;
    }
    if (argument === "--execute") {
      explicitExecute = true;
      options.mode = "execute";
      continue;
    }
    if (argument === "--environment") {
      options.environment = readOptionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--output") {
      options.outputPath = readOptionValue(argv, index, argument);
      index += 1;
      continue;
    }
    if (argument === "--base-url") {
      options.baseUrl = readOptionValue(argv, index, argument);
      index += 1;
      continue;
    }
    throw new Error(`split-f0-cli-flag-unknown:${argument}`);
  }
  if (explicitDryRun && explicitExecute) {
    throw new Error("split-f0-cli-modes-incompatible");
  }
  if (options.environment !== null && options.environment !== "sandbox") {
    throw new Error("split-f0-production-environment-prohibited");
  }
  if (options.mode === "execute") {
    if (options.environment !== "sandbox") {
      throw new Error("split-f0-execute-requires-explicit-sandbox-environment");
    }
    const outputValidation = validateSplitF0OutputPath(options.outputPath);
    if (!outputValidation.valid) {
      throw new Error(`split-f0-${outputValidation.reason}`);
    }
    options.outputPath = outputValidation.resolved;
  } else if (options.outputPath !== null) {
    const outputValidation = validateSplitF0OutputPath(options.outputPath);
    if (!outputValidation.valid) {
      throw new Error(`split-f0-${outputValidation.reason}`);
    }
    options.outputPath = outputValidation.resolved;
  }
  const baseUrlValidation = validateSplitF0BaseUrl(options.baseUrl);
  if (!baseUrlValidation.valid) {
    throw new Error(`split-f0-${baseUrlValidation.reason}`);
  }
  options.baseUrl = baseUrlValidation.normalized;
  return options;
}

export async function loadSplitF0ScenarioMatrix(matrixPath = SPLIT_F0_MATRIX_PATH) {
  return JSON.parse(await fs.readFile(matrixPath, "utf8"));
}

export function validateSplitF0ScenarioMatrixForCollector(matrix) {
  const issues = [];
  if (matrix?.schemaVersion !== SPLIT_F0_SCENARIO_MATRIX_VERSION_V1) {
    issues.push("matrix-schema-version-invalid");
  }
  if (!Array.isArray(matrix?.scenarios) || matrix.scenarios.length !== 8) {
    issues.push("matrix-scenario-count-invalid");
  }
  const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
  const ids = new Set();
  for (const scenario of scenarios) {
    const validation = validateSplitF0ScenarioV1(scenario);
    issues.push(...validation.issues.map((issue) => `${scenario?.scenarioId ?? "unknown"}:${issue}`));
    if (ids.has(scenario.scenarioId)) {
      issues.push(`matrix-scenario-duplicate:${scenario.scenarioId}`);
    }
    ids.add(scenario.scenarioId);
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}

function requestShape(scenario, period) {
  return {
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
}

function logicalSearch(scenario, kind, splitPointId, segmentOrdinal, period) {
  const request = requestShape(scenario, period);
  const requestFingerprint = `sha256:${sha256SplitF0(stableStringifySplitF0(request))}`;
  const suffix = kind === "full-stay" ? "full" : `${splitPointId}.segment-${segmentOrdinal}`;
  return {
    logicalSearchId: `${scenario.scenarioId}.${suffix}`,
    scenarioId: scenario.scenarioId,
    kind,
    splitPointId,
    segmentOrdinal,
    period,
    request,
    requestFingerprint,
  };
}

export function buildSplitF0LogicalSearchPlan(matrix) {
  const validation = validateSplitF0ScenarioMatrixForCollector(matrix);
  if (!validation.valid) {
    throw new Error(`split-f0-matrix-invalid:${validation.issues.join(",")}`);
  }
  const searches = [];
  for (const scenario of matrix.scenarios) {
    searches.push(logicalSearch(scenario, "full-stay", null, null, scenario));
    for (const splitPoint of scenario.splitPoints) {
      const segments = buildSplitF0SegmentsV1(scenario, splitPoint.splitPointId);
      for (const segment of segments) {
        searches.push(
          logicalSearch(
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
  if (searches.length !== SPLIT_F0_MAX_LOGICAL_SEARCHES) {
    throw new Error(`split-f0-logical-search-count-invalid:${searches.length}`);
  }
  return searches;
}

export function createSplitF0BudgetLedger() {
  const scenarioRequests = new Map();
  return {
    httpRequests: 0,
    retries: 0,
    rateLimitResponses: 0,
    timeouts: 0,
    providerErrors: 0,
    reserve(scenarioId) {
      if (this.httpRequests >= SPLIT_F0_MAX_HTTP_REQUESTS) {
        throw new Error("split-f0-global-http-budget-exhausted");
      }
      const scenarioCount = scenarioRequests.get(scenarioId) ?? 0;
      if (scenarioCount >= SPLIT_F0_MAX_HTTP_REQUESTS_PER_SCENARIO) {
        throw new Error(`split-f0-scenario-http-budget-exhausted:${scenarioId}`);
      }
      this.httpRequests += 1;
      scenarioRequests.set(scenarioId, scenarioCount + 1);
    },
    scenarioCount(scenarioId) {
      return scenarioRequests.get(scenarioId) ?? 0;
    },
    snapshot() {
      return {
        httpRequests: this.httpRequests,
        retries: this.retries,
        rateLimitResponses: this.rateLimitResponses,
        timeouts: this.timeouts,
        providerErrors: this.providerErrors,
        requestsByScenario: Object.fromEntries([...scenarioRequests].sort()),
      };
    },
  };
}

function errorStatus(error) {
  const candidate = error?.status ?? error?.response?.status;
  return Number.isInteger(candidate) ? candidate : null;
}

function errorCode(error) {
  return typeof error?.code === "string" ? error.code : null;
}

function isTimeout(error) {
  return ["ECONNABORTED", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(errorCode(error));
}

function isTransient(error) {
  const status = errorStatus(error);
  return status === 429 || isTimeout(error) || (status !== null && status >= 500 && status <= 599);
}

function classifiedProviderError(error) {
  const status = errorStatus(error);
  if (status === 429) return { classification: "RATE_LIMIT", status, code: errorCode(error) };
  if (isTimeout(error)) return { classification: "TIMEOUT", status, code: errorCode(error) };
  if (status !== null && status >= 500) return { classification: "TRANSIENT_PROVIDER", status, code: errorCode(error) };
  if (status !== null && status >= 400) return { classification: "PERMANENT_PROVIDER", status, code: errorCode(error) };
  return { classification: "PROVIDER_OR_NETWORK", status, code: errorCode(error) };
}

function deterministicBackoff(logicalSearchId, retryOrdinal) {
  const base = retryOrdinal === 1 ? 250 : 500;
  const jitter = Number.parseInt(sha256SplitF0(`${logicalSearchId}:${retryOrdinal}`).slice(0, 2), 16) % 51;
  return base + jitter;
}

async function requestWithPolicy({
  transport,
  search,
  budget,
  sleep,
  monotonicNow,
  rateState,
}) {
  for (let attempt = 0; attempt <= SPLIT_F0_MAX_RETRIES; attempt += 1) {
    const elapsed = monotonicNow() - rateState.lastStartedAt;
    const minimumInterval = 1000 / SPLIT_F0_MAX_REQUESTS_PER_SECOND;
    if (Number.isFinite(rateState.lastStartedAt) && elapsed < minimumInterval) {
      await sleep(minimumInterval - elapsed);
    }
    budget.reserve(search.scenarioId);
    rateState.lastStartedAt = monotonicNow();
    try {
      assertSplitF0EndpointAllowed("POST", "/hotels/rates");
      return await transport.request({
        method: "POST",
        endpointPath: "/hotels/rates",
        logicalSearch: search,
      });
    } catch (caught) {
      const status = errorStatus(caught);
      if (status === 429) budget.rateLimitResponses += 1;
      if (isTimeout(caught)) budget.timeouts += 1;
      if (attempt >= SPLIT_F0_MAX_RETRIES || !isTransient(caught)) {
        budget.providerErrors += 1;
        return { error: classifiedProviderError(caught), hotels: [], status: status ?? null };
      }
      budget.retries += 1;
      await sleep(deterministicBackoff(search.logicalSearchId, attempt + 1));
    }
  }
  throw new Error("split-f0-unreachable-retry-state");
}

function classifyBoard(mealPlan) {
  const value = String(mealPlan ?? "").toLowerCase();
  if (/all[ -]?inclusive/.test(value)) return "all-inclusive";
  if (/full[ -]?board/.test(value)) return "full-board";
  if (/half[ -]?board/.test(value)) return "half-board";
  if (/breakfast/.test(value)) return "breakfast-included";
  if (/room[ -]?only|no[ -]?meal|without[ -]?meal/.test(value)) return "room-only";
  return "unknown";
}

function classifyCancellation(offer) {
  if (offer?.refundable === false) return "non-refundable";
  if (offer?.refundable === true && Number(offer?.cancellationPenalty) > 0) {
    return "partially-refundable";
  }
  if (offer?.refundable === true) return "fully-refundable";
  return "unknown";
}

function classifyPaymentTiming(offer) {
  const value = String(offer?.paymentTiming ?? offer?.paymentType ?? "").toLowerCase();
  if (/pay[ -]?at[ -]?(hotel|property)|property/.test(value)) return "pay-at-property";
  if (/pay[ -]?later|deferred/.test(value)) return "pay-later";
  if (/pay[ -]?now|prepaid|immediate/.test(value)) return "pay-now";
  return "unknown";
}

function classifyPaymentEvidenceValue(key, value) {
  const normalizedKey = String(key ?? "").toLowerCase();
  const normalizedValue =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value).toLowerCase()
      : "";
  const combined = `${normalizedKey}:${normalizedValue}`;
  if (/pay.?at.?(hotel|property)|property.?pay|hotel.?pay/.test(combined)) {
    return normalizedValue === "false" ? "unrecognized-present" : "pay-at-property";
  }
  if (/pay.?later|deferred|postpaid|post.?pay/.test(combined)) {
    return normalizedValue === "false" ? "unrecognized-present" : "pay-later";
  }
  if (/pay.?now|prepaid|pre.?pay|immediate|merchant/.test(combined)) {
    return normalizedValue === "false" ? "unrecognized-present" : "pay-now";
  }
  return "unrecognized-present";
}

export function inspectSplitF0RatesPaymentFields(payload) {
  const pathValues = new Map();
  const visit = (value, segments = []) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, [...segments, "[]"]);
      }
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const next = [...segments, key];
      if (/payment|pay.?at|pay.?now|pay.?later|prepaid|postpaid|collect.?type/i.test(key)) {
        const pathKey = next.join(".");
        const current = pathValues.get(pathKey) ?? new Set();
        const values = Array.isArray(child) ? child : [child];
        for (const item of values) {
          current.add(classifyPaymentEvidenceValue(key, item));
        }
        pathValues.set(pathKey, current);
      }
      visit(child, next);
    }
  };
  visit(payload);
  const fields = [...pathValues]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([fieldPath, classifications]) => ({
      fieldPath,
      classifications: [...classifications].sort(),
    }));
  return {
    fieldPresent: fields.length > 0,
    usableTimingPresent: fields.some((field) =>
      field.classifications.some((value) =>
        ["pay-now", "pay-later", "pay-at-property"].includes(value)
      )
    ),
    fields,
  };
}

function aggregateSplitF0PaymentFieldEvidence(observations) {
  const paths = new Map();
  let responsesWithPaymentFields = 0;
  let responsesWithUsableTiming = 0;
  for (const observation of observations) {
    if (observation?.fieldPresent === true) {
      responsesWithPaymentFields += 1;
    }
    if (observation?.usableTimingPresent === true) {
      responsesWithUsableTiming += 1;
    }
    for (const field of observation?.fields ?? []) {
      const values = paths.get(field.fieldPath) ?? new Set();
      for (const classification of field.classifications) {
        values.add(classification);
      }
      paths.set(field.fieldPath, values);
    }
  }
  return {
    responsesInspected: observations.length,
    responsesWithPaymentFields,
    responsesWithUsableTiming,
    fieldPresent: paths.size > 0,
    usableTimingPresent: responsesWithUsableTiming > 0,
    fields: [...paths]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([fieldPath, classifications]) => ({
        fieldPath,
        classifications: [...classifications].sort(),
      })),
  };
}

function classifyRoom(roomName) {
  const value = String(roomName ?? "").toLowerCase();
  if (/apartment|studio/.test(value)) return "apartment";
  if (/suite/.test(value)) return "suite";
  if (/superior|deluxe|executive/.test(value)) return "superior";
  if (/standard|double|twin|single|room/.test(value)) return "standard";
  return value.length > 0 ? "other" : "unknown";
}

function normalizeMappedHotels(search, hotels, observedAt) {
  const snapshots = [];
  const rawIdentifiers = [];
  for (const hotel of Array.isArray(hotels) ? hotels : []) {
    const rawHotelId = String(hotel?.sourceHotelId ?? hotel?.id ?? "").trim();
    if (rawHotelId.length === 0) continue;
    const propertyDigest = sha256SplitF0(`liteapi-hotel:${rawHotelId}`);
    const propertyId = `property.${propertyDigest}`;
    rawIdentifiers.push(rawHotelId);
    for (const offer of Array.isArray(hotel?.offers) ? hotel.offers : []) {
      const rawOfferId = String(offer?.providerOfferReference ?? offer?.id ?? "").trim();
      if (rawOfferId.length === 0) continue;
      rawIdentifiers.push(rawOfferId);
      const offerDigest = sha256SplitF0(`liteapi-offer:${rawHotelId}:${rawOfferId}`);
      const canonical = {
        propertyId,
        offerFingerprint: `offer.${offerDigest}`,
        checkIn: search.period.checkIn,
        checkOut: search.period.checkOut,
        nights: search.period.nights,
        occupancy: search.request.occupancy,
        currency: String(offer.currency ?? hotel.currency ?? "").toUpperCase(),
        totalCost: Number(offer.totalKnownCost ?? offer.price),
        totalCostCompleteness:
          Number.isFinite(Number(offer.totalKnownCost ?? offer.price)) &&
          Number(offer.totalKnownCost ?? offer.price) > 0
            ? "complete"
            : "incomplete",
        taxes:
          Number(offer.unknownTaxes ?? hotel.unknownTaxes ?? 0) > 0
            ? "unknown"
            : offer.taxesIncluded === true
              ? "included"
              : offer.taxesIncluded === false
                ? "excluded-known-in-total"
                : "unknown",
        mandatoryCosts:
          Array.isArray(offer.taxBreakdown) &&
          offer.taxBreakdown.length > 0 &&
          Number(offer.unknownTaxes ?? 0) === 0
            ? "included"
            : "unknown",
        boardClass: classifyBoard(offer.mealPlan),
        cancellationClass: classifyCancellation(offer),
        paymentTiming: classifyPaymentTiming(offer),
        roomClass: classifyRoom(offer.roomName),
        rating: Number.isFinite(Number(hotel.reviewScore)) ? Number(hotel.reviewScore) : null,
        reviewCount: Number.isFinite(Number(hotel.reviewCount)) ? Number(hotel.reviewCount) : null,
        distanceKm: Number.isFinite(Number(hotel.distance)) ? Number(hotel.distance) : null,
        bookable: offer.bookable === true,
        freshness: "fresh",
      };
      const contentDigest = `sha256:${sha256SplitF0(stableStringifySplitF0(canonical))}`;
      snapshots.push({
        offerSnapshotId: `offer.${offerDigest}`,
        propertyId,
        checkIn: canonical.checkIn,
        checkOut: canonical.checkOut,
        nights: canonical.nights,
        occupancy: canonical.occupancy,
        currency: canonical.currency,
        totalCost: canonical.totalCost,
        totalCostCompleteness: canonical.totalCostCompleteness,
        taxes: canonical.taxes,
        mandatoryCosts: canonical.mandatoryCosts,
        boardClass: canonical.boardClass,
        cancellationClass: canonical.cancellationClass,
        paymentTiming: canonical.paymentTiming,
        roomClass: canonical.roomClass,
        rating: canonical.rating,
        reviewCount: canonical.reviewCount,
        distanceKm: canonical.distanceKm,
        bookable: canonical.bookable,
        freshness: canonical.freshness,
        provenance: {
          sourceKind: "sandbox-read-only",
          captureId: `capture.${sha256SplitF0(`${search.requestFingerprint}:${offerDigest}`).slice(0, 32)}`,
          observedAt,
          contentDigest,
        },
      });
    }
  }
  snapshots.sort((left, right) => left.offerSnapshotId.localeCompare(right.offerSnapshotId));
  return { snapshots, rawIdentifiers };
}

function assertPersistedPayloadSafe(payload, rawIdentifiers = []) {
  const walk = (value, keyPath = []) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...keyPath, String(index)]));
      return;
    }
    if (value !== null && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if (FORBIDDEN_PERSISTED_KEYS.has(key.toLowerCase())) {
          throw new Error(`split-f0-forbidden-persisted-field:${[...keyPath, key].join(".")}`);
        }
        walk(item, [...keyPath, key]);
      }
    }
  };
  walk(payload);
  const serialized = stableStringifySplitF0(payload);
  for (const identifier of rawIdentifiers.filter((item) => item.length > 0)) {
    if (serialized.includes(identifier)) {
      throw new Error("split-f0-raw-provider-identifier-persistence-detected");
    }
  }
  return true;
}

function evaluationResults(matrix, searches) {
  const byLogicalSearch = new Map(searches.map((search) => [search.logicalSearchId, search.offers]));
  const comparisons = [];
  for (const scenario of matrix.scenarios) {
    const singleStayOffers = byLogicalSearch.get(`${scenario.scenarioId}.full`) ?? [];
    for (const splitPoint of scenario.splitPoints) {
      comparisons.push(
        evaluateSplitF0EconomicOpportunityV1({
          scenario,
          splitPointId: splitPoint.splitPointId,
          singleStayOffers,
          firstSegmentOffers:
            byLogicalSearch.get(`${scenario.scenarioId}.${splitPoint.splitPointId}.segment-0`) ?? [],
          secondSegmentOffers:
            byLogicalSearch.get(`${scenario.scenarioId}.${splitPoint.splitPointId}.segment-1`) ?? [],
        })
      );
    }
  }
  return comparisons;
}

function grossSavingStatistics(comparisons) {
  const values = comparisons
    .map((item) => item.grossSavingAmount)
    .filter((value) => typeof value === "number" && value > 0)
    .sort((left, right) => left - right);
  const median =
    values.length === 0
      ? null
      : values.length % 2 === 1
        ? values[(values.length - 1) / 2]
        : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  return {
    count: values.length,
    maximum: values.length === 0 ? null : values.at(-1),
    median,
  };
}

function aggregateResultCounters(searches, comparisons, network) {
  const normalizedOffers = searches.reduce((total, search) => total + search.offers.length, 0);
  const comparable = comparisons.filter((item) => item.comparability === "COMPARABLE");
  const strict = comparable.filter((item) => item.comparabilityLevel === "STRICT_COMPARABLE");
  const conditional = comparable.filter(
    (item) => item.comparabilityLevel === "CONDITIONAL_COMPARABLE"
  );
  const comparableSingles = new Set(comparable.map((item) => item.singleOfferSnapshotId).filter(Boolean));
  const strictSingles = new Set(strict.map((item) => item.singleOfferSnapshotId).filter(Boolean));
  const conditionalSingles = new Set(
    conditional.map((item) => item.singleOfferSnapshotId).filter(Boolean)
  );
  const scenarioIdsWithComparable = new Set(comparable.map((item) => item.scenarioId));
  const allSavings = grossSavingStatistics(comparable);
  const strictSavings = grossSavingStatistics(strict);
  const conditionalSavings = grossSavingStatistics(conditional);
  const signalBands = {};
  for (const item of comparisons) {
    signalBands[item.economicSignal] = (signalBands[item.economicSignal] ?? 0) + 1;
  }
  return {
    sandboxScenariosAttempted: new Set(searches.map((search) => search.scenarioId)).size,
    sandboxScenariosCompleted: new Set(
      searches.filter((search) => search.status === "COMPLETED").map((search) => search.scenarioId)
    ).size,
    sandboxLogicalSearches: searches.length,
    sandboxHttpRequests: network.httpRequests,
    sandboxRetries: network.retries,
    sandboxRateLimitResponses: network.rateLimitResponses,
    sandboxTimeouts: network.timeouts,
    sandboxProviderErrors: network.providerErrors,
    sandboxNoRateSearches: searches.filter((search) => search.offers.length === 0).length,
    normalizedOffers,
    comparableSingleOffers: comparableSingles.size,
    comparableSplitPairs: comparable.length,
    scenariosWithComparableData: scenarioIdsWithComparable.size,
    scenariosWithGrossSaving: new Set(
      comparable.filter((item) => (item.grossSavingAmount ?? 0) > 0).map((item) => item.scenarioId)
    ).size,
    maxGrossSavingEur: allSavings.maximum,
    medianGrossSavingEur: allSavings.median,
    strictComparableSingleOffers: strictSingles.size,
    conditionalComparableSingleOffers: conditionalSingles.size,
    strictComparableSplitPairs: strict.length,
    conditionalComparableSplitPairs: conditional.length,
    scenariosWithStrictComparableData: new Set(strict.map((item) => item.scenarioId)).size,
    scenariosWithConditionalComparableData: new Set(
      conditional.map((item) => item.scenarioId)
    ).size,
    scenariosWithStrictGrossSaving: new Set(
      strict.filter((item) => (item.grossSavingAmount ?? 0) > 0).map((item) => item.scenarioId)
    ).size,
    scenariosWithConditionalGrossSaving: new Set(
      conditional
        .filter((item) => (item.grossSavingAmount ?? 0) > 0)
        .map((item) => item.scenarioId)
    ).size,
    strictMaxGrossSavingEur: strictSavings.maximum,
    strictMedianGrossSavingEur: strictSavings.median,
    conditionalMaxGrossSavingEur: conditionalSavings.maximum,
    conditionalMedianGrossSavingEur: conditionalSavings.median,
    signalBands,
  };
}

export function replaySplitF0SanitizedDataset(matrix, dataset) {
  if (
    dataset?.schemaVersion !== "stayopti.split-f0.sandbox-calibration@1" ||
    dataset?.environment !== "sandbox" ||
    dataset?.technicalCalibrationOnly !== true ||
    dataset?.marketEvidence !== false ||
    dataset?.policyEligible !== false ||
    dataset?.publicRecommendationAllowed !== false ||
    !Array.isArray(dataset?.searches)
  ) {
    throw new Error("split-f0-sanitized-replay-dataset-invalid");
  }
  const comparisons = evaluationResults(matrix, dataset.searches);
  const network = dataset.network ?? {
    httpRequests: 0,
    retries: 0,
    rateLimitResponses: 0,
    timeouts: 0,
    providerErrors: 0,
    requestsByScenario: {},
  };
  const replay = {
    ...dataset,
    comparisons,
    counters: aggregateResultCounters(dataset.searches, comparisons, network),
  };
  assertPersistedPayloadSafe(replay);
  return replay;
}

export async function runSplitF0Collector({
  matrix,
  options,
  apiKey,
  transportFactory,
  observedAt = new Date().toISOString(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  monotonicNow = () => performance.now(),
}) {
  const plan = buildSplitF0LogicalSearchPlan(matrix);
  const dryRun = {
    status: "PASS",
    scenarios: matrix.scenarios.length,
    logicalSearches: plan.length,
    httpRequests: 0,
  };
  if (options.mode !== "execute") {
    return {
      schemaVersion: "stayopti.split-f0.sandbox-calibration@1",
      environment: "sandbox",
      technicalCalibrationOnly: true,
      marketEvidence: false,
      policyEligible: false,
      publicRecommendationAllowed: false,
      collectorStatus: "DRY_RUN_ONLY",
      dryRun,
      network: null,
      counters: null,
      searches: [],
      comparisons: [],
      paymentFieldProbe: null,
    };
  }
  const keyValidation = validateSplitF0SandboxKey(apiKey);
  if (!keyValidation.valid) {
    return {
      schemaVersion: "stayopti.split-f0.sandbox-calibration@1",
      environment: "sandbox",
      technicalCalibrationOnly: true,
      marketEvidence: false,
      policyEligible: false,
      publicRecommendationAllowed: false,
      collectorStatus: "BLOCKED_SANDBOX_CREDENTIAL_NOT_PROVEN",
      credentialGate: keyValidation.reason,
      dryRun,
      network: {
        httpRequests: 0,
        retries: 0,
        rateLimitResponses: 0,
        timeouts: 0,
        providerErrors: 0,
        requestsByScenario: {},
      },
      counters: null,
      searches: [],
      comparisons: [],
      paymentFieldProbe: null,
    };
  }
  const baseValidation = validateSplitF0BaseUrl(options.baseUrl);
  if (!baseValidation.valid) {
    throw new Error(`split-f0-${baseValidation.reason}`);
  }
  const transport = await transportFactory({ apiKey, baseUrl: baseValidation.normalized });
  const budget = createSplitF0BudgetLedger();
  const rateState = { lastStartedAt: Number.NEGATIVE_INFINITY };
  const collectedSearches = [];
  const rawIdentifiers = [];
  const paymentFieldObservations = [];
  for (const search of plan) {
    const response = await requestWithPolicy({
      transport,
      search,
      budget,
      sleep,
      monotonicNow,
      rateState,
    });
    const normalized = normalizeMappedHotels(search, response.hotels, observedAt);
    if (response.paymentFieldEvidence !== undefined) {
      paymentFieldObservations.push(response.paymentFieldEvidence);
    }
    rawIdentifiers.push(...normalized.rawIdentifiers);
    collectedSearches.push({
      scenarioId: search.scenarioId,
      logicalSearchId: search.logicalSearchId,
      kind: search.kind,
      splitPointId: search.splitPointId,
      segmentOrdinal: search.segmentOrdinal,
      checkIn: search.period.checkIn,
      checkOut: search.period.checkOut,
      nights: search.period.nights,
      requestFingerprint: search.requestFingerprint,
      status: response.error ? "PROVIDER_ERROR" : "COMPLETED",
      providerStatus: response.status ?? null,
      error: response.error ?? null,
      offers: normalized.snapshots,
    });
  }
  const comparisons = evaluationResults(matrix, collectedSearches);
  const network = budget.snapshot();
  const result = {
    schemaVersion: "stayopti.split-f0.sandbox-calibration@1",
    environment: "sandbox",
    technicalCalibrationOnly: true,
    marketEvidence: false,
    policyEligible: false,
    publicRecommendationAllowed: false,
    collectorStatus: "COMPLETED",
    observedAt,
    matrixVersion: matrix.schemaVersion,
    matrixDigest: `sha256:${sha256SplitF0(stableStringifySplitF0(matrix))}`,
    dryRun,
    network,
    searches: collectedSearches,
    comparisons,
    paymentFieldProbe: aggregateSplitF0PaymentFieldEvidence(paymentFieldObservations),
    counters: aggregateResultCounters(collectedSearches, comparisons, network),
  };
  assertPersistedPayloadSafe(result, rawIdentifiers);
  return result;
}

function ratesPayloadForSearch(search) {
  return {
    checkin: search.request.checkIn,
    checkout: search.request.checkOut,
    currency: search.request.currency,
    guestNationality: search.request.guestNationality,
    occupancies: [
      {
        adults: search.request.occupancy.adults,
        children: [...search.request.occupancy.childAges],
      },
    ],
    limit: 80,
    timeout: 12,
    maxRatesPerHotel: 3,
    roomMapping: true,
    includeHotelData: true,
    sessionId: `splitf0_${search.requestFingerprint.slice(7, 31)}`,
    latitude: search.request.latitude,
    longitude: search.request.longitude,
    radius: search.request.radiusMeters,
  };
}

function createNativeFetchError(message, code, status = null) {
  const failure = new Error(message);
  failure.code = code;
  failure.status = status;
  return failure;
}

async function parseProviderJsonResponse(response) {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (text.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw createNativeFetchError(
      "LiteAPI sandbox response was not valid JSON.",
      "INVALID_PROVIDER_JSON",
      response.status
    );
  }
}

export async function createSplitF0LiteApiTransport({
  apiKey,
  baseUrl,
  fetchImplementation = globalThis.fetch,
  timeoutMs = SPLIT_F0_HTTP_TIMEOUT_MS,
}) {
  const keyValidation = validateSplitF0SandboxKey(apiKey);
  const baseValidation = validateSplitF0BaseUrl(baseUrl);
  if (!keyValidation.valid || !baseValidation.valid) {
    throw new Error("split-f0-live-transport-gate-failed");
  }
  if (typeof fetchImplementation !== "function") {
    throw new Error("split-f0-native-fetch-unavailable");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("split-f0-http-timeout-invalid");
  }
  const require = createRequire(import.meta.url);
  const { mapLiteApiHotelResponse } = require("../server/providers/liteApi/liteApiProvider.js");
  return {
    async request({ method, endpointPath, logicalSearch }) {
      assertSplitF0EndpointAllowed(method, endpointPath);
      const requestUrl = new URL(`${baseValidation.normalized}${endpointPath}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImplementation(requestUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
          },
          body: JSON.stringify(ratesPayloadForSearch(logicalSearch)),
          signal: controller.signal,
          redirect: "manual",
        });
      } catch (caught) {
        if (controller.signal.aborted || caught?.name === "AbortError") {
          throw createNativeFetchError(
            "LiteAPI sandbox request timed out.",
            "ECONNABORTED"
          );
        }
        throw caught;
      } finally {
        clearTimeout(timeout);
      }
      if (
        response.redirected === true ||
        (response.status >= 300 && response.status <= 399)
      ) {
        throw createNativeFetchError(
          "LiteAPI sandbox redirect was blocked.",
          "REDIRECT_PROHIBITED",
          response.status
        );
      }
      if (typeof response.url === "string" && response.url.length > 0) {
        const responseUrl = new URL(response.url);
        if (
          responseUrl.protocol !== requestUrl.protocol ||
          responseUrl.host.toLowerCase() !== requestUrl.host.toLowerCase()
        ) {
          throw createNativeFetchError(
            "LiteAPI sandbox response host was not allowlisted.",
            "RESPONSE_HOST_PROHIBITED",
            response.status
          );
        }
      }
      const data = await parseProviderJsonResponse(response);
      if (response.status < 200 || response.status >= 300) {
        throw createNativeFetchError(
          `LiteAPI sandbox request failed with status ${response.status}.`,
          "LITEAPI_HTTP_ERROR",
          response.status
        );
      }
      return {
        status: response.status,
        paymentFieldEvidence: inspectSplitF0RatesPaymentFields(data),
        hotels: data === null
          ? []
          : mapLiteApiHotelResponse(
              data,
              logicalSearch.request.currency,
              {
                latitude: logicalSearch.request.latitude,
                longitude: logicalSearch.request.longitude,
              },
              null,
              {
                maximumRecords: 80,
                commercialPricingPolicy: null,
                requestedSellerCommissionPercent: null,
              }
            ),
      };
    },
  };
}

function humanSummary(result) {
  return [
    `collectorStatus=${result.collectorStatus}`,
    `environment=${result.environment}`,
    `technicalCalibrationOnly=${result.technicalCalibrationOnly}`,
    `marketEvidence=${result.marketEvidence}`,
    `policyEligible=${result.policyEligible}`,
    `publicRecommendationAllowed=${result.publicRecommendationAllowed}`,
    `dryRunScenarios=${result.dryRun.scenarios}`,
    `dryRunLogicalSearches=${result.dryRun.logicalSearches}`,
    `dryRunHttpRequests=${result.dryRun.httpRequests}`,
    `sandboxHttpRequests=${result.network?.httpRequests ?? 0}`,
    `sandboxRetries=${result.network?.retries ?? 0}`,
    `normalizedOffers=${result.counters?.normalizedOffers ?? 0}`,
    `strictComparableSingleOffers=${result.counters?.strictComparableSingleOffers ?? 0}`,
    `conditionalComparableSingleOffers=${result.counters?.conditionalComparableSingleOffers ?? 0}`,
    `strictComparableSplitPairs=${result.counters?.strictComparableSplitPairs ?? 0}`,
    `conditionalComparableSplitPairs=${result.counters?.conditionalComparableSplitPairs ?? 0}`,
    `scenariosWithStrictComparableData=${result.counters?.scenariosWithStrictComparableData ?? 0}`,
    `scenariosWithConditionalComparableData=${result.counters?.scenariosWithConditionalComparableData ?? 0}`,
    `paymentFieldPresent=${result.paymentFieldProbe?.fieldPresent ?? false}`,
    `paymentUsableTimingPresent=${result.paymentFieldProbe?.usableTimingPresent ?? false}`,
  ].join("\n") + "\n";
}

export async function writeSplitF0CollectorOutputs(outputDirectory, result) {
  const validation = validateSplitF0OutputPath(outputDirectory);
  if (!validation.valid) {
    throw new Error(`split-f0-${validation.reason}`);
  }
  await fs.mkdir(validation.resolved, { recursive: true });
  const datasetName = "split-f0-sandbox-calibration-v1.json";
  const summaryName = "split-f0-sandbox-calibration-summary.txt";
  const manifestName = "manifest-sha256.json";
  const dataset = `${stableStringifySplitF0(result, 2)}\n`;
  const summary = humanSummary(result);
  const manifest = {
    schemaVersion: "stayopti.split-f0.collector-output-manifest@1",
    payloads: [
      { path: datasetName, bytes: Buffer.byteLength(dataset), sha256: sha256SplitF0(dataset) },
      { path: summaryName, bytes: Buffer.byteLength(summary), sha256: sha256SplitF0(summary) },
    ],
  };
  assertPersistedPayloadSafe(result);
  await fs.writeFile(path.join(validation.resolved, datasetName), dataset, { flag: "wx" });
  await fs.writeFile(path.join(validation.resolved, summaryName), summary, { flag: "wx" });
  await fs.writeFile(
    path.join(validation.resolved, manifestName),
    `${stableStringifySplitF0(manifest, 2)}\n`,
    { flag: "wx" }
  );
  return { outputDirectory: validation.resolved, manifest };
}

async function main() {
  const options = parseSplitF0CollectorArguments(process.argv.slice(2));
  const matrix = await loadSplitF0ScenarioMatrix();
  const apiKey = process.env.SPLIT_F0_SANDBOX_API_KEY ?? process.env.LITEAPI_API_KEY ?? null;
  const result = await runSplitF0Collector({
    matrix,
    options,
    apiKey,
    transportFactory: createSplitF0LiteApiTransport,
  });
  if (options.mode === "execute" && result.collectorStatus === "COMPLETED") {
    await writeSplitF0CollectorOutputs(options.outputPath, result);
  }
  process.stdout.write(humanSummary(result));
  if (result.collectorStatus === "BLOCKED_SANDBOX_CREDENTIAL_NOT_PROVEN") {
    process.exitCode = 2;
  }
}

const EXECUTED_DIRECTLY =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (EXECUTED_DIRECTLY) {
  main().catch((caught) => {
    process.stderr.write(`${caught instanceof Error ? caught.message : String(caught)}\n`);
    process.exitCode = 1;
  });
}
