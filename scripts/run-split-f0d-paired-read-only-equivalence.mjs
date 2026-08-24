import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSplitF0LogicalSearchPlan,
  createSplitF0RatesRequestBodyV1,
  loadSplitF0ScenarioMatrix,
  sha256SplitF0,
  stableStringifySplitF0,
} from "./run-split-f0-read-only-collector.mjs";
import {
  buildSplitF0SegmentsV1,
  evaluateSplitF0EconomicOpportunityV1,
  selectSplitF0FixedSingleBaselineV1,
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
  return {
    valid: issues.length === 0,
    issues: uniqueSorted(issues),
    credentialReceipt: {
      sandbox: {
        variableName: "SPLIT_F0D_SANDBOX_API_KEY",
        requiredClass: "SAND",
        observedClass: classifySplitF0dCredential(sandboxCredential),
      },
      production: {
        variableName: "SPLIT_F0D_PRODUCTION_API_KEY",
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

export function parseSplitF0dArguments(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--dry-run")) {
    return { mode: "dry-run" };
  }
  if (argv.includes("--execute")) {
    throw new Error("split-f0d-live-execution-not-authorized-in-d1");
  }
  throw new Error(`split-f0d-cli-arguments-invalid:${argv.join(",")}`);
}

async function main() {
  parseSplitF0dArguments(process.argv.slice(2));
  const result = await runSplitF0dDryRun();
  process.stdout.write(`${stableStringifySplitF0(result, 2)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((caught) => {
    process.stderr.write(`${caught instanceof Error ? caught.message : String(caught)}\n`);
    process.exitCode = 1;
  });
}
