import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertSplitF0PersistedPayloadSafeV1,
  buildSplitF0LogicalSearchPlan,
  createSplitF0LiteApiTransport,
  createSplitF0RatesRequestBodyV1,
  loadSplitF0ScenarioMatrix,
  normalizeSplitF0MappedHotelsV1,
  sha256SplitF0,
  stableStringifySplitF0,
  validateSplitF0OutputPath,
} from "./run-split-f0-read-only-collector.mjs";
import {
  analyzeSplitF0CrossCaptureStabilityV1,
  buildSplitF0SegmentsV1,
  evaluateSplitF0EconomicOpportunityV1,
  selectSplitF0FixedSingleBaselineV1,
  summarizeSplitF0PrimarySavingsV1,
} from "../src/engine-v3/evaluation/splitF0EconomicFeasibilityPilotV3.ts";

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
export const SPLIT_F0D_REPOSITORY_ROOT = path.resolve(CURRENT_DIRECTORY, "..");
export const SPLIT_F0D_RUN_PLAN_PATH = path.join(
  SPLIT_F0D_REPOSITORY_ROOT,
  "tests",
  "engine-v3",
  "fixtures",
  "split-f0d-equivalence-run-plan-v1.json"
);
export const SPLIT_F0D_EXPECTED_LIVE_DURATIONS = [5, 7, 10, 12, 14, 21, 28, 30];
export const SPLIT_F0D_ENVIRONMENTS = ["sandbox", "production"];
export const SPLIT_F0D_WAVES = ["wave-a", "wave-b"];
export const SPLIT_F0D_LOGICAL_SEARCHES_PER_SCENARIO = 5;
export const SPLIT_F0D_HARD_REQUEST_BUDGET = 160;
export const SPLIT_F0D_ACTUAL_HTTP_REQUESTS = 0;
export const SPLIT_F0D_OFFICIAL_BASE_URL = "https://api.liteapi.travel/v3.0";
export const SPLIT_F0D_RATES_ENDPOINT = "/hotels/rates";
export const SPLIT_F0D_HTTP_TIMEOUT_MS = 15_000;
export const SPLIT_F0D_LIVE_CONFIRMATIONS = [
  "--execute-paired-live",
  "--confirm-rates-only-production-access",
];

const FUTURE_NON_SECRET_REQUEST_CONFIGURATION = Object.freeze({
  method: "POST",
  endpointPath: "/hotels/rates",
  httpsRequired: true,
  hostAllowlist: ["api.liteapi.travel"],
  redirects: "disabled",
  cache: "disabled",
  continuation: "none",
  stopOnTruncationOrContinuation: true,
  retries: 0,
  concurrency: 1,
  maxRequestsPerSecond: 1,
  hardRequestBudget: SPLIT_F0D_HARD_REQUEST_BUDGET,
});

const ALLOWED_REQUEST_RECEIPT_KEYS = [
  "scenarioId",
  "waveId",
  "logicalSearchId",
  "durationNights",
  "checkIn",
  "checkOut",
  "occupancy",
  "currency",
  "guestNationality",
  "searchKind",
  "splitPointId",
  "segmentOrdinal",
  "nonSecretConfiguration",
  "canonicalBodySha256",
];

export async function loadSplitF0dRunPlan(runPlanPath = SPLIT_F0D_RUN_PLAN_PATH) {
  return JSON.parse(await fs.readFile(runPlanPath, "utf8"));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function validateExactArray(actual, expected, issue, issues) {
  if (!Array.isArray(actual) || stableStringifySplitF0(actual) !== stableStringifySplitF0(expected)) {
    issues.push(issue);
  }
}

export function classifySplitF0dCredential(value) {
  if (typeof value !== "string" || value.length === 0) return "NONE";
  if (value.startsWith("sand_")) return "SAND";
  if (value.startsWith("prod_")) return "PROD";
  return "UNKNOWN";
}

function validateEnvironmentBaseUrl(value, label, issues) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    issues.push(`${label}-base-url-invalid`);
    return;
  }
  if (parsed.protocol !== "https:") issues.push(`${label}-base-url-https-required`);
  if (parsed.username !== "" || parsed.password !== "") {
    issues.push(`${label}-base-url-credentials-prohibited`);
  }
  if (parsed.hostname.toLowerCase() !== "api.liteapi.travel") {
    issues.push(`${label}-base-url-host-not-allowlisted`);
  }
  if (parsed.port !== "" && parsed.port !== "443") {
    issues.push(`${label}-base-url-port-not-allowlisted`);
  }
  if (parsed.pathname.replace(/\/+$/, "") !== "/v3.0") {
    issues.push(`${label}-base-url-api-version-not-allowlisted`);
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    issues.push(`${label}-base-url-query-or-fragment-prohibited`);
  }
}

export function validateSplitF0dFutureLiveConfiguration({
  sandboxBaseUrl,
  productionBaseUrl,
  sandboxCredential,
  productionCredential,
  sandboxCredentialVariableName = "SPLIT_F0D_SANDBOX_API_KEY",
  productionCredentialVariableName = "SPLIT_F0D_PRODUCTION_API_KEY",
} = {}) {
  const issues = [];
  validateEnvironmentBaseUrl(sandboxBaseUrl, "sandbox", issues);
  validateEnvironmentBaseUrl(productionBaseUrl, "production", issues);
  if (classifySplitF0dCredential(sandboxCredential) !== "SAND") {
    issues.push("SANDBOX_CREDENTIAL_CLASS_NOT_PROVEN");
  }
  if (classifySplitF0dCredential(productionCredential) !== "PROD") {
    issues.push("PRODUCTION_CREDENTIAL_CLASS_NOT_PROVEN");
  }
  if (
    typeof sandboxCredential === "string" &&
    sandboxCredential.length > 0 &&
    sandboxCredential === productionCredential
  ) {
    issues.push("SANDBOX_PRODUCTION_CREDENTIALS_MUST_DIFFER");
  }
  for (const [label, variableName] of [
    ["sandbox", sandboxCredentialVariableName],
    ["production", productionCredentialVariableName],
  ]) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variableName)) {
      issues.push(`${label}-credential-variable-name-invalid`);
    }
  }
  return {
    valid: issues.length === 0,
    issues: uniqueSorted(issues),
    credentialReceipt: {
      sandbox: {
        variableName: sandboxCredentialVariableName,
        requiredClass: "SAND",
        observedClass: classifySplitF0dCredential(sandboxCredential),
      },
      production: {
        variableName: productionCredentialVariableName,
        requiredClass: "PROD",
        observedClass: classifySplitF0dCredential(productionCredential),
      },
      valuesExposed: false,
    },
  };
}

export function fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, ephemeralKey) {
  if (typeof rawIdentifier !== "string" || rawIdentifier.length === 0) {
    throw new Error("split-f0d-raw-identifier-required");
  }
  if (!(ephemeralKey instanceof Uint8Array) || ephemeralKey.byteLength < 32) {
    throw new Error("split-f0d-ephemeral-hmac-key-invalid");
  }
  return `hmac-sha256:${crypto.createHmac("sha256", ephemeralKey).update(rawIdentifier).digest("hex")}`;
}

export function createSplitF0dDryRunConfigReceipt() {
  return {
    ...FUTURE_NON_SECRET_REQUEST_CONFIGURATION,
    baseUrlBindings: {
      sandbox: "SPLIT_F0D_SANDBOX_BASE_URL",
      production: "SPLIT_F0D_PRODUCTION_BASE_URL",
    },
    credentialBindings: {
      sandbox: {
        variableName: "SPLIT_F0D_SANDBOX_API_KEY",
        requiredClass: "SAND",
        presence: "NOT_READ_IN_D1",
      },
      production: {
        variableName: "SPLIT_F0D_PRODUCTION_API_KEY",
        requiredClass: "PROD",
        presence: "NOT_READ_IN_D1",
      },
    },
    fallbackBetweenEnvironments: false,
    credentialValuesExposed: false,
  };
}

function createRequestReceipt(search, waveId, canonicalBodySha256) {
  const receipt = {
    scenarioId: search.scenarioId,
    waveId,
    logicalSearchId: search.logicalSearchId,
    durationNights: search.period.nights,
    checkIn: search.period.checkIn,
    checkOut: search.period.checkOut,
    occupancy: search.request.occupancy,
    currency: search.request.currency,
    guestNationality: search.request.guestNationality,
    searchKind: search.kind,
    splitPointId: search.splitPointId,
    segmentOrdinal: search.segmentOrdinal,
    nonSecretConfiguration: FUTURE_NON_SECRET_REQUEST_CONFIGURATION,
    canonicalBodySha256,
  };
  if (stableStringifySplitF0(Object.keys(receipt).sort()) !== stableStringifySplitF0([...ALLOWED_REQUEST_RECEIPT_KEYS].sort())) {
    throw new Error("split-f0d-request-receipt-surface-invalid");
  }
  return receipt;
}

function pairEnvironmentOrder(searchOrdinal, waveId) {
  const sandboxFirstInWaveA = searchOrdinal % 2 === 0;
  const sandboxFirst = waveId === "wave-a" ? sandboxFirstInWaveA : !sandboxFirstInWaveA;
  return sandboxFirst ? ["sandbox", "production"] : ["production", "sandbox"];
}

export function buildSplitF0dPairedSchedule(matrix, runPlan) {
  const baseSearches = buildSplitF0LogicalSearchPlan(matrix);
  const pairs = [];
  for (const waveId of SPLIT_F0D_WAVES) {
    baseSearches.forEach((search, searchOrdinal) => {
      const body = createSplitF0RatesRequestBodyV1(search);
      const canonicalBodySha256 = `sha256:${sha256SplitF0(stableStringifySplitF0(body))}`;
      const requestReceipt = createRequestReceipt(search, waveId, canonicalBodySha256);
      pairs.push({
        pairId: `${waveId}.${search.logicalSearchId}`,
        waveId,
        pairOrdinalWithinWave: searchOrdinal,
        environmentOrder: pairEnvironmentOrder(searchOrdinal, waveId),
        requestReceipt,
        environmentRequestHashes: {
          sandbox: canonicalBodySha256,
          production: canonicalBodySha256,
        },
      });
    });
  }
  const plannedHttpRequests = pairs.length * SPLIT_F0D_ENVIRONMENTS.length;
  if (plannedHttpRequests !== runPlan.plannedLiveHttpRequests) {
    throw new Error(`split-f0d-live-request-budget-mismatch:${plannedHttpRequests}`);
  }
  if (
    pairs.some(
      (pair) => pair.environmentRequestHashes.sandbox !== pair.environmentRequestHashes.production
    )
  ) {
    throw new Error("split-f0d-paired-request-hash-mismatch");
  }
  return { baseSearches, pairs, plannedHttpRequests };
}

function createSyntheticOffer(scenario, period, offerSnapshotId, propertyId, totalCost, overrides = {}) {
  const canonical = {
    offerSnapshotId,
    propertyId,
    checkIn: period.checkIn,
    checkOut: period.checkOut,
    nights: period.nights,
    occupancy: scenario.occupancy,
    currency: scenario.currency,
    totalCost,
    totalCostCompleteness: "complete",
    taxes: "included",
    mandatoryCosts: "included",
    boardClass: "breakfast-included",
    cancellationClass: "fully-refundable",
    paymentTiming: "pay-later",
    roomClass: "standard",
    rating: scenario.constraints.minimumRating + 0.4,
    reviewCount: scenario.constraints.minimumReviewCount + 50,
    distanceKm: Math.max(0, scenario.constraints.maximumDistanceKm - 0.5),
    bookable: true,
    freshness: "fresh",
    ...overrides,
  };
  return {
    ...canonical,
    provenance: {
      sourceKind: "synthetic-contract-fixture",
      captureId: `capture.${sha256SplitF0(offerSnapshotId).slice(0, 32)}`,
      observedAt: "2026-08-24T12:00:00.000Z",
      contentDigest: `sha256:${sha256SplitF0(stableStringifySplitF0(canonical))}`,
    },
  };
}

function summarizeOfflineEvaluation(controlId, evaluation) {
  return {
    controlId,
    technicalValidity: evaluation.technicalValidity,
    comparability: evaluation.comparability,
    comparabilityLevel: evaluation.comparabilityLevel,
    fixedBaselineOfferSnapshotId: evaluation.fixedBaseline?.offerSnapshotId ?? null,
    fixedBaselineTotalMinorUnits: evaluation.fixedBaseline?.totalMinorUnits ?? null,
    baselineSelectionMode: evaluation.baselineSelectionMode,
    grossSavingMinorUnits: evaluation.grossSavingMinorUnits,
    economicSignal: evaluation.economicSignal,
    matchedBucketDiagnosticOnly:
      evaluation.matchedBucketDiagnostic === null ||
      evaluation.matchedBucketDiagnostic.evidenceLimits.includes("matched-bucket-diagnostic-only"),
    outlierClassification: evaluation.outlierAssessment.classification,
    publicRecommendationProduced: evaluation.publicRecommendationProduced,
    issues: evaluation.issues,
  };
}

function evaluateOfflineControl({ controlId, scenario, splitPointId, singles, first, second }) {
  const fixedSingleBaseline = selectSplitF0FixedSingleBaselineV1(scenario, singles);
  return summarizeOfflineEvaluation(
    controlId,
    evaluateSplitF0EconomicOpportunityV1({
      scenario,
      splitPointId,
      singleStayOffers: singles,
      fixedSingleBaseline,
      firstSegmentOffers: first,
      secondSegmentOffers: second,
    })
  );
}

export function runSplitF0dOfflineControls(matrix, runPlan) {
  const scenario = matrix.scenarios[0];
  const splitPointId = scenario.splitPoints[0].splitPointId;
  const segments = buildSplitF0SegmentsV1(scenario, splitPointId);
  const singleA = createSyntheticOffer(scenario, scenario, "offline.single-a", "offline.property-single-a", 500);
  const singleB = createSyntheticOffer(scenario, scenario, "offline.single-b", "offline.property-single-b", 550);
  const first = createSyntheticOffer(scenario, segments[0], "offline.segment-a", "offline.property-a", 200);
  const second = createSyntheticOffer(scenario, segments[1], "offline.segment-b", "offline.property-b", 220);

  const noGrossSaving = evaluateOfflineControl({
    controlId: runPlan.replayControls[0].controlId,
    scenario,
    splitPointId,
    singles: [singleA],
    first: [{ ...first, totalCost: 260 }],
    second: [{ ...second, totalCost: 260 }],
  });
  const economicCandidate = evaluateOfflineControl({
    controlId: runPlan.replayControls[1].controlId,
    scenario,
    splitPointId,
    singles: [singleA],
    first: [first],
    second: [second],
  });
  const incomplete = evaluateOfflineControl({
    controlId: runPlan.replayControls[2].controlId,
    scenario,
    splitPointId,
    singles: [singleA],
    first: [{ ...first, totalCostCompleteness: "incomplete" }],
    second: [second],
  });
  const beforeLoss = evaluateOfflineControl({
    controlId: `${runPlan.replayControls[3].controlId}.before`,
    scenario,
    splitPointId,
    singles: [singleB, singleA],
    first: [first],
    second: [second],
  });
  const afterLoss = evaluateOfflineControl({
    controlId: `${runPlan.replayControls[3].controlId}.after`,
    scenario,
    splitPointId,
    singles: [singleB],
    first: [first],
    second: [second],
  });
  const admissibleSplitPoints = Array.from(
    { length: runPlan.offlineTwoNightControl.nights - 1 },
    (_unused, index) => index + 1
  ).filter(
    (nightsFromStart) =>
      nightsFromStart >= 2 &&
      runPlan.offlineTwoNightControl.nights - nightsFromStart >= 2
  );
  return {
    twoNightControl: {
      ...runPlan.offlineTwoNightControl,
      admissibleSplitPoints,
      actualProviderRequests: 0,
    },
    replayControls: [
      noGrossSaving,
      economicCandidate,
      incomplete,
      {
        controlId: runPlan.replayControls[3].controlId,
        beforeLoss,
        afterLoss,
        bestSingleChanged:
          beforeLoss.fixedBaselineOfferSnapshotId !== afterLoss.fixedBaselineOfferSnapshotId,
        publicRecommendationProduced:
          beforeLoss.publicRecommendationProduced || afterLoss.publicRecommendationProduced,
      },
    ],
  };
}

export async function validateSplitF0dRunPlan(matrix, runPlan) {
  const issues = [];
  if (runPlan?.schemaVersion !== "stayopti.split-f0d.equivalence-run-plan@1") {
    issues.push("run-plan-schema-version-invalid");
  }
  if (runPlan?.sourceScenarioMatrixPath !== "tests/engine-v3/fixtures/split-f0-scenario-matrix-v1.json") {
    issues.push("source-matrix-path-invalid");
  }
  const matrixBytes = await fs.readFile(
    path.join(SPLIT_F0D_REPOSITORY_ROOT, runPlan.sourceScenarioMatrixPath)
  );
  if (sha256SplitF0(matrixBytes) !== runPlan.sourceScenarioMatrixSha256) {
    issues.push("source-matrix-sha256-mismatch");
  }
  validateExactArray(
    runPlan.liveScenarioIds,
    matrix.scenarios.map((scenario) => scenario.scenarioId),
    "live-scenario-ids-invalid",
    issues
  );
  validateExactArray(
    runPlan.liveDurations,
    SPLIT_F0D_EXPECTED_LIVE_DURATIONS,
    "live-durations-invalid",
    issues
  );
  validateExactArray(runPlan.environmentIds, SPLIT_F0D_ENVIRONMENTS, "environment-ids-invalid", issues);
  validateExactArray(runPlan.waveIds, SPLIT_F0D_WAVES, "wave-ids-invalid", issues);
  if (runPlan.logicalSearchesPerScenario !== SPLIT_F0D_LOGICAL_SEARCHES_PER_SCENARIO) {
    issues.push("logical-searches-per-scenario-invalid");
  }
  if (runPlan.plannedLiveHttpRequests !== SPLIT_F0D_HARD_REQUEST_BUDGET) {
    issues.push("hard-request-budget-invalid");
  }
  if (!Array.isArray(runPlan.replayControls) || runPlan.replayControls.length !== 4) {
    issues.push("replay-control-count-invalid");
  }
  if (
    runPlan?.offlineTwoNightControl?.nights !== 2 ||
    runPlan.offlineTwoNightControl.plannedProviderRequests !== 0
  ) {
    issues.push("offline-two-night-control-invalid");
  }
  if (runPlan?.networkAuthorizedInD1 !== false) issues.push("d1-network-must-be-disabled");
  if (
    runPlan?.marketEvidence !== false ||
    runPlan?.policyEligible !== false ||
    runPlan?.publicRecommendationAllowed !== false
  ) {
    issues.push("claim-boundary-invalid");
  }
  return { valid: issues.length === 0, issues: uniqueSorted(issues) };
}

export async function runSplitF0dDryRun() {
  const [matrix, runPlan] = await Promise.all([
    loadSplitF0ScenarioMatrix(),
    loadSplitF0dRunPlan(),
  ]);
  const validation = await validateSplitF0dRunPlan(matrix, runPlan);
  if (!validation.valid) {
    throw new Error(`split-f0d-run-plan-invalid:${validation.issues.join(",")}`);
  }
  const schedule = buildSplitF0dPairedSchedule(matrix, runPlan);
  const offline = runSplitF0dOfflineControls(matrix, runPlan);
  const pairedRequestHashMatch = schedule.pairs.every(
    (pair) => pair.environmentRequestHashes.sandbox === pair.environmentRequestHashes.production
  );
  const result = {
    schemaVersion: "stayopti.split-f0d.zero-network-dry-run@1",
    status: pairedRequestHashMatch ? "PASS" : "FAIL",
    executionMode: "DRY_RUN_ONLY",
    originalScenarioMatrixReused: true,
    sourceScenarioMatrixPath: runPlan.sourceScenarioMatrixPath,
    sourceScenarioMatrixSha256: runPlan.sourceScenarioMatrixSha256,
    liveScenarioCount: matrix.scenarios.length,
    liveDurations: matrix.scenarios.map((scenario) => scenario.nights),
    replayControlCount: offline.replayControls.length,
    waveCount: SPLIT_F0D_WAVES.length,
    environmentCount: SPLIT_F0D_ENVIRONMENTS.length,
    logicalSearchesPerScenario: SPLIT_F0D_LOGICAL_SEARCHES_PER_SCENARIO,
    requestPairCount: schedule.pairs.length,
    plannedLiveHttpRequests: schedule.plannedHttpRequests,
    actualHttpRequests: SPLIT_F0D_ACTUAL_HTTP_REQUESTS,
    pairedRequestHashMatch,
    pairLevelExecutionPlanned: true,
    sandboxProductionOrderCounterbalanced: true,
    configReceipt: createSplitF0dDryRunConfigReceipt(),
    offline,
    pairs: schedule.pairs,
    marketEvidence: false,
    policyEligible: false,
    publicRecommendationAllowed: false,
    providerCalls: 0,
    sandboxCalls: 0,
    productionCalls: 0,
    prebookCalls: 0,
    bookingCalls: 0,
    paymentCalls: 0,
  };
  result.dryRunDigest = `sha256:${sha256SplitF0(stableStringifySplitF0(result))}`;
  return result;
}

function splitF0dRatesSchemaInterpretable(payload) {
  if (Array.isArray(payload)) return true;
  if (payload === null || typeof payload !== "object") return false;
  return ["data", "rates", "results", "items", "hotels", "response"].some(
    (key) => Object.prototype.hasOwnProperty.call(payload, key)
  );
}

export async function createSplitF0dRatesOnlyTransport({
  environment,
  credential,
  baseUrl,
  fetchImplementation = globalThis.fetch,
  timeoutMs = SPLIT_F0D_HTTP_TIMEOUT_MS,
}) {
  if (!SPLIT_F0D_ENVIRONMENTS.includes(environment)) {
    throw new Error("split-f0d-environment-invalid");
  }
  return createSplitF0LiteApiTransport({
    apiKey: credential,
    baseUrl,
    fetchImplementation,
    timeoutMs,
    requiredCredentialClass: environment === "sandbox" ? "SAND" : "PROD",
    redirectMode: "error",
    requiredStatus: 200,
    requireJsonContentType: true,
    stopOnContinuationOrTruncation: true,
    responseSchemaValidator: splitF0dRatesSchemaInterpretable,
    cacheMode: "no-store",
    environmentLabel: environment,
  });
}

function credentialVariableName(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`split-f0d-${label}-credential-variable-name-invalid`);
  }
  return value;
}

export function resolveSplitF0dLiveConfiguration(
  options,
  environmentVariables = process.env
) {
  const sandboxCredentialVariableName = credentialVariableName(
    options.sandboxCredentialVariableName,
    "sandbox"
  );
  const productionCredentialVariableName = credentialVariableName(
    options.productionCredentialVariableName,
    "production"
  );
  const sandboxBaseUrlVariableName = options.sandboxBaseUrlVariableName;
  const productionBaseUrlVariableName = options.productionBaseUrlVariableName;
  for (const [label, variableName] of [
    ["sandbox-base-url", sandboxBaseUrlVariableName],
    ["production-base-url", productionBaseUrlVariableName],
  ]) {
    if (
      variableName !== null &&
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(variableName)
    ) {
      throw new Error(`split-f0d-${label}-variable-name-invalid`);
    }
  }
  const sandboxCredential = environmentVariables[sandboxCredentialVariableName];
  const productionCredential = environmentVariables[productionCredentialVariableName];
  const sandboxBaseUrl = sandboxBaseUrlVariableName === null
    ? SPLIT_F0D_OFFICIAL_BASE_URL
    : environmentVariables[sandboxBaseUrlVariableName];
  const productionBaseUrl = productionBaseUrlVariableName === null
    ? SPLIT_F0D_OFFICIAL_BASE_URL
    : environmentVariables[productionBaseUrlVariableName];
  const validation = validateSplitF0dFutureLiveConfiguration({
    sandboxBaseUrl,
    productionBaseUrl,
    sandboxCredential,
    productionCredential,
    sandboxCredentialVariableName,
    productionCredentialVariableName,
  });
  return {
    valid: validation.valid,
    issues: validation.issues,
    credentials: {
      sandbox: sandboxCredential,
      production: productionCredential,
    },
    baseUrls: {
      sandbox: sandboxBaseUrl,
      production: productionBaseUrl,
    },
    credentialReceipt: {
      ...validation.credentialReceipt,
      equal: false,
    },
    baseUrlReceipt: {
      sandbox: sandboxBaseUrl === SPLIT_F0D_OFFICIAL_BASE_URL
        ? "OFFICIAL_ALLOWLIST_MATCH"
        : "INVALID",
      production: productionBaseUrl === SPLIT_F0D_OFFICIAL_BASE_URL
        ? "OFFICIAL_ALLOWLIST_MATCH"
        : "INVALID",
    },
  };
}

function evaluateSplitF0dSearches(matrix, searches) {
  const byLogicalSearch = new Map(
    searches.map((search) => [search.logicalSearchId, search.offers])
  );
  const comparisons = [];
  for (const scenario of matrix.scenarios) {
    const singleStayOffers =
      byLogicalSearch.get(`${scenario.scenarioId}.full`) ?? [];
    const fixedSingleBaseline = selectSplitF0FixedSingleBaselineV1(
      scenario,
      singleStayOffers
    );
    for (const splitPoint of scenario.splitPoints) {
      comparisons.push(
        evaluateSplitF0EconomicOpportunityV1({
          scenario,
          splitPointId: splitPoint.splitPointId,
          singleStayOffers,
          fixedSingleBaseline,
          firstSegmentOffers:
            byLogicalSearch.get(
              `${scenario.scenarioId}.${splitPoint.splitPointId}.segment-0`
            ) ?? [],
          secondSegmentOffers:
            byLogicalSearch.get(
              `${scenario.scenarioId}.${splitPoint.splitPointId}.segment-1`
            ) ?? [],
        })
      );
    }
  }
  return comparisons;
}

function summarizeSplitF0dWave(matrix, searches) {
  const comparisons = evaluateSplitF0dSearches(matrix, searches);
  const comparable = comparisons.filter(
    (comparison) => comparison.comparability === "COMPARABLE"
  );
  return {
    searches,
    comparisons,
    counters: {
      normalizedOffers: searches.reduce(
        (total, search) => total + search.offers.length,
        0
      ),
      scenariosWithRates: new Set(
        searches
          .filter((search) => search.offers.length > 0)
          .map((search) => search.scenarioId)
      ).size,
      fixedBaselineScenarios: new Set(
        comparisons
          .filter((comparison) => comparison.fixedBaseline !== null)
          .map((comparison) => comparison.scenarioId)
      ).size,
      comparableSplitScenarios: new Set(
        comparable.map((comparison) => comparison.scenarioId)
      ).size,
      positiveScenarios: new Set(
        comparable
          .filter((comparison) => (comparison.grossSavingMinorUnits ?? 0) > 0)
          .map((comparison) => comparison.scenarioId)
      ).size,
      strictComparisons: comparable.filter(
        (comparison) => comparison.comparabilityLevel === "STRICT_COMPARABLE"
      ).length,
      conditionalComparisons: comparable.filter(
        (comparison) =>
          comparison.comparabilityLevel === "CONDITIONAL_COMPARABLE"
      ).length,
    },
  };
}

function positiveComparisonsByScenario(wave) {
  const result = new Map();
  for (const comparison of wave.comparisons) {
    if (
      comparison.comparability === "COMPARABLE" &&
      (comparison.grossSavingMinorUnits ?? 0) > 0
    ) {
      const current = result.get(comparison.scenarioId);
      if (
        current === undefined ||
        comparison.grossSavingMinorUnits > current.grossSavingMinorUnits
      ) {
        result.set(comparison.scenarioId, comparison);
      }
    }
  }
  return result;
}

function summarizeSplitF0dProduction(matrix, waveA, waveB, runComplete) {
  const positiveA = positiveComparisonsByScenario(waveA);
  const positiveB = positiveComparisonsByScenario(waveB);
  const repeatedScenarioIds = [...positiveA.keys()]
    .filter((scenarioId) => positiveB.has(scenarioId))
    .sort();
  const scenarioById = new Map(
    matrix.scenarios.map((scenario) => [scenario.scenarioId, scenario])
  );
  const repeatedPositiveDurations = repeatedScenarioIds.map(
    (scenarioId) => scenarioById.get(scenarioId).nights
  );
  const crossWave = analyzeSplitF0CrossCaptureStabilityV1(
    waveA.comparisons,
    waveB.comparisons
  );
  const allComparisons = [...waveA.comparisons, ...waveB.comparisons];
  const robustSavings = summarizeSplitF0PrimarySavingsV1(
    allComparisons,
    crossWave.quarantinedScenarioIds
  );
  const robustRepeated = repeatedScenarioIds.filter((scenarioId) => {
    const left = positiveA.get(scenarioId);
    const right = positiveB.get(scenarioId);
    return (
      left.outlierAssessment.classification === "NONE" &&
      right.outlierAssessment.classification === "NONE" &&
      !crossWave.quarantinedScenarioIds.includes(scenarioId)
    );
  });
  const repeatedNetAtPositiveFriction = robustRepeated.filter((scenarioId) => {
    const left = positiveA.get(scenarioId);
    const right = positiveB.get(scenarioId);
    return [25, 50, 75, 100, 150].some((friction) => {
      const leftPoint = left.frictionSensitivity.find(
        (item) => item.hypotheticalFrictionEur === friction
      );
      const rightPoint = right.frictionSensitivity.find(
        (item) => item.hypotheticalFrictionEur === friction
      );
      return (
        (leftPoint?.netSavingAtFrictionMinorUnits ?? 0) > 0 &&
        (rightPoint?.netSavingAtFrictionMinorUnits ?? 0) > 0
      );
    });
  });
  const comparableCount = allComparisons.filter(
    (comparison) => comparison.comparability === "COMPARABLE"
  ).length;
  let pilotResultClassification = "INCONCLUSIVE";
  if (runComplete && repeatedNetAtPositiveFriction.length > 0) {
    pilotResultClassification = "REPEATED_PRODUCTION_NET_SIGNAL";
  } else if (runComplete && repeatedScenarioIds.length > 0) {
    pilotResultClassification = "PRODUCTION_GROSS_SIGNAL_ONLY";
  } else if (runComplete && comparableCount > 0) {
    pilotResultClassification = "NO_PRODUCTION_SIGNAL_IN_THIS_PILOT";
  }
  const netPositiveAtFriction = Object.fromEntries(
    [25, 50, 75, 100, 150].map((friction) => [
      String(friction),
      allComparisons.filter((comparison) =>
        comparison.frictionSensitivity.some(
          (item) =>
            item.hypotheticalFrictionEur === friction &&
            item.netSavingAtFrictionMinorUnits > 0
        )
      ).length,
    ])
  );
  const robustRatios = allComparisons
    .filter(
      (comparison) =>
        comparison.outlierAssessment.classification === "NONE" &&
        !crossWave.quarantinedScenarioIds.includes(comparison.scenarioId) &&
        typeof comparison.grossSavingRatio === "number"
    )
    .map((comparison) => comparison.grossSavingRatio);
  const durationResults = Object.fromEntries(
    matrix.scenarios.map((scenario) => {
      const waveAResult = positiveA.get(scenario.scenarioId) ?? null;
      const waveBResult = positiveB.get(scenario.scenarioId) ?? null;
      return [
        String(scenario.nights),
        {
          scenarioId: scenario.scenarioId,
          waveA: waveAResult === null ? "NO_POSITIVE_PRIMARY_SIGNAL" : {
            splitPointId: waveAResult.splitPointId,
            comparabilityLevel: waveAResult.comparabilityLevel,
            grossSavingAmount: waveAResult.grossSavingAmount,
            grossSavingRatio: waveAResult.grossSavingRatio,
            outlier: waveAResult.outlierAssessment.classification,
          },
          waveB: waveBResult === null ? "NO_POSITIVE_PRIMARY_SIGNAL" : {
            splitPointId: waveBResult.splitPointId,
            comparabilityLevel: waveBResult.comparabilityLevel,
            grossSavingAmount: waveBResult.grossSavingAmount,
            grossSavingRatio: waveBResult.grossSavingRatio,
            outlier: waveBResult.outlierAssessment.classification,
          },
          repeated: waveAResult !== null && waveBResult !== null,
          robustRepeated: robustRepeated.includes(scenario.scenarioId),
        },
      ];
    })
  );
  return {
    pilotResultClassification,
    repeatedPositiveDurations,
    repeatedNetPositiveDurations: repeatedNetAtPositiveFriction.map(
      (scenarioId) => scenarioById.get(scenarioId).nights
    ),
    strictComparisons: allComparisons.filter(
      (comparison) => comparison.comparabilityLevel === "STRICT_COMPARABLE"
    ).length,
    conditionalComparisons: allComparisons.filter(
      (comparison) =>
        comparison.comparabilityLevel === "CONDITIONAL_COMPARABLE"
    ).length,
    robustMaximumGrossSaving: robustSavings.robustMaximumSaving,
    robustMedianPositiveSaving: robustSavings.robustMedianSaving,
    maximumSavingRatio:
      robustRatios.length === 0 ? null : Math.max(...robustRatios),
    outlierComparisons: allComparisons.filter(
      (comparison) => comparison.outlierAssessment.classification !== "NONE"
    ).length,
    crossWaveUnstableScenarios: crossWave.unstableScenarioIds,
    netPositiveAtFriction,
    durationResults,
  };
}

export function classifySplitF0dTransportFailure(caught) {
  const status = Number.isInteger(caught?.status) ? caught.status : null;
  const code = String(caught?.code ?? "UNEXPECTED_TRANSPORT_FAILURE");
  if (status === 401 || status === 403) {
    return { classification: "PROVIDER_AUTHORIZATION_FAILURE", globalStop: true };
  }
  if (status === 429) {
    return { classification: "RATE_LIMIT_STOP", globalStop: true };
  }
  if (code === "ECONNABORTED") {
    return { classification: "TIMEOUT", globalStop: false };
  }
  if (status !== null && status >= 500 && status <= 599) {
    return { classification: "PROVIDER_5XX", globalStop: false };
  }
  if (
    [
      "REDIRECT_PROHIBITED",
      "RESPONSE_HOST_PROHIBITED",
      "INVALID_PROVIDER_CONTENT_TYPE",
      "INVALID_PROVIDER_JSON",
      "INVALID_PROVIDER_SCHEMA",
      "CONTINUATION_OR_TRUNCATION_PROHIBITED",
    ].includes(code)
  ) {
    return { classification: code, globalStop: true };
  }
  return { classification: code, globalStop: true };
}

function emptyWaveStore() {
  return {
    sandbox: { "wave-a": [], "wave-b": [] },
    production: { "wave-a": [], "wave-b": [] },
  };
}

export async function runSplitF0dPairedLive({
  liveConfiguration,
  transportFactory = createSplitF0dRatesOnlyTransport,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  monotonicNow = () => performance.now(),
  wallClockNow = () => Date.now(),
  hmacKey = crypto.randomBytes(32),
}) {
  if (!liveConfiguration?.valid) {
    throw new Error(
      `split-f0d-live-configuration-invalid:${(
        liveConfiguration?.issues ?? ["configuration-missing"]
      ).join(",")}`
    );
  }
  const [matrix, runPlan] = await Promise.all([
    loadSplitF0ScenarioMatrix(),
    loadSplitF0dRunPlan(),
  ]);
  const runPlanValidation = await validateSplitF0dRunPlan(matrix, runPlan);
  if (!runPlanValidation.valid) {
    throw new Error(
      `split-f0d-run-plan-invalid:${runPlanValidation.issues.join(",")}`
    );
  }
  const schedule = buildSplitF0dPairedSchedule(matrix, runPlan);
  const searchById = new Map(
    schedule.baseSearches.map((search) => [search.logicalSearchId, search])
  );
  const transports = Object.fromEntries(
    await Promise.all(
      SPLIT_F0D_ENVIRONMENTS.map(async (environment) => [
        environment,
        await transportFactory({
          environment,
          credential: liveConfiguration.credentials[environment],
          baseUrl: liveConfiguration.baseUrls[environment],
          timeoutMs: SPLIT_F0D_HTTP_TIMEOUT_MS,
        }),
      ])
    )
  );
  const collected = emptyWaveStore();
  const rawIdentifiers = [];
  const executionLedger = [];
  const errorLedger = [];
  const counters = {
    actualHttpRequests: 0,
    sandboxHttpRequests: 0,
    productionHttpRequests: 0,
    completePairedSearches: 0,
    incompletePairedSearches: 0,
    rateLimitResponses: 0,
    timeouts: 0,
    providerErrors: 0,
    maximumPairTimeSkewSeconds: 0,
  };
  let lastRequestStartedAt = Number.NEGATIVE_INFINITY;
  let globalFailure = null;
  const fingerprintIdentifier = (kind, value) =>
    crypto
      .createHmac("sha256", hmacKey)
      .update(`${kind}\u0000${value}`)
      .digest("hex");

  pairLoop: for (const pair of schedule.pairs) {
    if (
      pair.environmentRequestHashes.sandbox !==
      pair.environmentRequestHashes.production
    ) {
      globalFailure = "PAIRED_REQUEST_HASH_MISMATCH";
      break;
    }
    const logicalSearch = searchById.get(pair.requestReceipt.logicalSearchId);
    if (logicalSearch === undefined) {
      globalFailure = "LOGICAL_SEARCH_NOT_FOUND";
      break;
    }
    const pairStartedAt = [];
    let pairComplete = true;
    for (const environment of pair.environmentOrder) {
      if (
        counters.actualHttpRequests >= SPLIT_F0D_HARD_REQUEST_BUDGET ||
        counters[`${environment}HttpRequests`] >= 80
      ) {
        globalFailure = "HARD_REQUEST_BUDGET_EXCEEDED";
        pairComplete = false;
        break pairLoop;
      }
      const elapsed = monotonicNow() - lastRequestStartedAt;
      if (elapsed < 1_000) {
        await sleep(1_000 - elapsed);
      }
      lastRequestStartedAt = monotonicNow();
      const startedAt = wallClockNow();
      pairStartedAt.push(startedAt);
      counters.actualHttpRequests += 1;
      counters[`${environment}HttpRequests`] += 1;
      try {
        const response = await transports[environment].request({
          method: "POST",
          endpointPath: SPLIT_F0D_RATES_ENDPOINT,
          logicalSearch,
        });
        const observedAt = new Date(wallClockNow()).toISOString();
        const normalized = normalizeSplitF0MappedHotelsV1(
          logicalSearch,
          response.hotels,
          observedAt,
          {
            sourceKind: `${environment}-read-only`,
            fingerprintIdentifier,
          }
        );
        rawIdentifiers.push(...normalized.rawIdentifiers);
        collected[environment][pair.waveId].push({
          scenarioId: logicalSearch.scenarioId,
          logicalSearchId: logicalSearch.logicalSearchId,
          kind: logicalSearch.kind,
          splitPointId: logicalSearch.splitPointId,
          segmentOrdinal: logicalSearch.segmentOrdinal,
          checkIn: logicalSearch.period.checkIn,
          checkOut: logicalSearch.period.checkOut,
          nights: logicalSearch.period.nights,
          requestFingerprint: logicalSearch.requestFingerprint,
          status: "COMPLETED",
          providerStatus: response.status,
          offers: normalized.snapshots,
        });
        executionLedger.push({
          pairId: pair.pairId,
          environment,
          ordinal: counters.actualHttpRequests,
          requestHash: pair.requestReceipt.canonicalBodySha256,
          result: "HTTP_200_JSON_INTERPRETABLE",
        });
      } catch (caught) {
        const failure = classifySplitF0dTransportFailure(caught);
        if (failure.classification === "RATE_LIMIT_STOP") {
          counters.rateLimitResponses += 1;
        } else if (failure.classification === "TIMEOUT") {
          counters.timeouts += 1;
        } else {
          counters.providerErrors += 1;
        }
        errorLedger.push({
          pairId: pair.pairId,
          environment,
          ordinal: counters.actualHttpRequests,
          classification: failure.classification,
          status: Number.isInteger(caught?.status) ? caught.status : null,
          retryAttempted: false,
        });
        executionLedger.push({
          pairId: pair.pairId,
          environment,
          ordinal: counters.actualHttpRequests,
          requestHash: pair.requestReceipt.canonicalBodySha256,
          result: failure.classification,
        });
        pairComplete = false;
        if (failure.globalStop) {
          globalFailure = failure.classification;
          break pairLoop;
        }
        break;
      }
    }
    if (pairStartedAt.length === 2) {
      counters.maximumPairTimeSkewSeconds = Math.max(
        counters.maximumPairTimeSkewSeconds,
        Math.abs(pairStartedAt[1] - pairStartedAt[0]) / 1_000
      );
    }
    if (pairComplete) {
      counters.completePairedSearches += 1;
    } else {
      counters.incompletePairedSearches += 1;
    }
  }
  if (globalFailure !== null) {
    counters.incompletePairedSearches +=
      schedule.pairs.length -
      counters.completePairedSearches -
      counters.incompletePairedSearches;
  }
  const waves = Object.fromEntries(
    SPLIT_F0D_ENVIRONMENTS.map((environment) => [
      environment,
      Object.fromEntries(
        SPLIT_F0D_WAVES.map((waveId) => [
          waveId,
          summarizeSplitF0dWave(matrix, collected[environment][waveId]),
        ])
      ),
    ])
  );
  const runComplete =
    globalFailure === null &&
    counters.actualHttpRequests === SPLIT_F0D_HARD_REQUEST_BUDGET &&
    counters.completePairedSearches === schedule.pairs.length;
  const productionSummary = summarizeSplitF0dProduction(
    matrix,
    waves.production["wave-a"],
    waves.production["wave-b"],
    runComplete
  );
  const result = {
    schemaVersion: "stayopti.split-f0d.paired-rates-live@1",
    liveRunStatus: runComplete ? "COMPLETED" : "INCONCLUSIVE",
    failureClassification: globalFailure,
    technicalPilotOnly: true,
    marketEvidence: runComplete
      ? "LIMITED_PRODUCTION_PILOT_ONLY"
      : "INCONCLUSIVE",
    policyEligible: false,
    publicRecommendationAllowed: false,
    configReceipt: {
      method: "POST",
      endpoint: "https://api.liteapi.travel/v3.0/hotels/rates",
      redirects: "disabled",
      retries: 0,
      concurrency: 1,
      maxRequestsPerSecond: 1,
      hardRequestBudget: SPLIT_F0D_HARD_REQUEST_BUDGET,
      cache: "disabled",
      continuation: "none",
      credentialReceipt: liveConfiguration.credentialReceipt,
      credentialValuesExposed: false,
    },
    requestHashLedger: schedule.pairs.map((pair) => ({
      pairId: pair.pairId,
      waveId: pair.waveId,
      logicalSearchId: pair.requestReceipt.logicalSearchId,
      environmentOrder: pair.environmentOrder,
      canonicalBodySha256: pair.requestReceipt.canonicalBodySha256,
      pairedHashMatch:
        pair.environmentRequestHashes.sandbox ===
        pair.environmentRequestHashes.production,
    })),
    executionLedger,
    errorLedger,
    counters,
    waves,
    productionSummary,
    safetyCounters: {
      retries: 0,
      prebookCalls: 0,
      bookingCalls: 0,
      paymentCalls: 0,
      metadataCalls: 0,
      placesCalls: 0,
      priceIndexCalls: 0,
      credentialValuesPersisted: 0,
      rawProviderIdentifiersPersisted: 0,
    },
  };
  assertSplitF0PersistedPayloadSafeV1(result, rawIdentifiers);
  return result;
}

export async function writeSplitF0dLiveOutputs(outputDirectory, result) {
  const pathValidation = validateSplitF0OutputPath(outputDirectory);
  if (!pathValidation.valid) {
    throw new Error(`split-f0d-${pathValidation.reason}`);
  }
  await fs.mkdir(pathValidation.resolved, { recursive: false });
  const datasetPath = path.join(
    pathValidation.resolved,
    "split-f0d-paired-live-sanitized.json"
  );
  const summaryPath = path.join(pathValidation.resolved, "summary.txt");
  const datasetText = `${stableStringifySplitF0(result, 2)}\n`;
  await fs.writeFile(datasetPath, datasetText, { encoding: "utf8", flag: "wx" });
  const summary = [
    `liveRunStatus=${result.liveRunStatus}`,
    `failureClassification=${result.failureClassification ?? "NONE"}`,
    `actualHttpRequests=${result.counters.actualHttpRequests}`,
    `sandboxHttpRequests=${result.counters.sandboxHttpRequests}`,
    `productionHttpRequests=${result.counters.productionHttpRequests}`,
    `completePairedSearches=${result.counters.completePairedSearches}`,
    `incompletePairedSearches=${result.counters.incompletePairedSearches}`,
    `pilotResultClassification=${result.productionSummary.pilotResultClassification}`,
    `marketEvidence=${result.marketEvidence}`,
    "policyEligible=false",
    "publicRecommendationAllowed=false",
  ].join("\n");
  await fs.writeFile(summaryPath, `${summary}\n`, { encoding: "utf8", flag: "wx" });
  return {
    outputDirectory: pathValidation.resolved,
    datasetPath,
    summaryPath,
    datasetSha256: `sha256:${sha256SplitF0(datasetText)}`,
  };
}

export function parseSplitF0dArguments(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--dry-run")) {
    return { mode: "dry-run" };
  }
  const executeConfirmed = argv.includes("--execute-paired-live");
  const productionAccessConfirmed = argv.includes(
    "--confirm-rates-only-production-access"
  );
  if (!executeConfirmed || !productionAccessConfirmed) {
    throw new Error("split-f0d-live-confirmations-required");
  }
  const options = {
    mode: "paired-live",
    sandboxCredentialVariableName: "SPLIT_F0D_SANDBOX_API_KEY",
    productionCredentialVariableName: "SPLIT_F0D_PRODUCTION_API_KEY",
    sandboxBaseUrlVariableName: null,
    productionBaseUrlVariableName: null,
    outputDirectory: null,
  };
  const valueFlags = new Map([
    ["--sandbox-key-env", "sandboxCredentialVariableName"],
    ["--production-key-env", "productionCredentialVariableName"],
    ["--sandbox-base-url-env", "sandboxBaseUrlVariableName"],
    ["--production-base-url-env", "productionBaseUrlVariableName"],
    ["--output", "outputDirectory"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (SPLIT_F0D_LIVE_CONFIRMATIONS.includes(argument)) continue;
    const optionKey = valueFlags.get(argument);
    if (optionKey === undefined) {
      throw new Error(`split-f0d-cli-argument-invalid:${argument}`);
    }
    const value = argv[index + 1];
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.startsWith("--")
    ) {
      throw new Error(`split-f0d-cli-value-required:${argument}`);
    }
    options[optionKey] = value;
    index += 1;
  }
  if (options.outputDirectory === null) {
    throw new Error("split-f0d-live-output-directory-required");
  }
  const outputValidation = validateSplitF0OutputPath(options.outputDirectory);
  if (!outputValidation.valid) {
    throw new Error(`split-f0d-${outputValidation.reason}`);
  }
  options.outputDirectory = outputValidation.resolved;
  return options;
}

async function main() {
  const options = parseSplitF0dArguments(process.argv.slice(2));
  if (options.mode === "dry-run") {
    const result = await runSplitF0dDryRun();
    process.stdout.write(`${stableStringifySplitF0(result, 2)}\n`);
    return;
  }
  const liveConfiguration = resolveSplitF0dLiveConfiguration(options);
  if (!liveConfiguration.valid) {
    throw new Error(
      `split-f0d-live-configuration-invalid:${liveConfiguration.issues.join(",")}`
    );
  }
  const result = await runSplitF0dPairedLive({ liveConfiguration });
  const outputReceipt = await writeSplitF0dLiveOutputs(
    options.outputDirectory,
    result
  );
  process.stdout.write(
    `${stableStringifySplitF0({
      liveRunStatus: result.liveRunStatus,
      failureClassification: result.failureClassification,
      counters: result.counters,
      productionSummary: result.productionSummary,
      outputReceipt,
      credentialValuesExposed: false,
    }, 2)}\n`
  );
  if (result.liveRunStatus !== "COMPLETED") {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((caught) => {
    process.stderr.write(`${caught instanceof Error ? caught.message : String(caught)}\n`);
    process.exitCode = 1;
  });
}
