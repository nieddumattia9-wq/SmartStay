import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPLIT_F0D_ACTUAL_HTTP_REQUESTS,
  SPLIT_F0D_ENVIRONMENTS,
  SPLIT_F0D_EXPECTED_LIVE_DURATIONS,
  SPLIT_F0D_HARD_REQUEST_BUDGET,
  SPLIT_F0D_REPOSITORY_ROOT,
  SPLIT_F0D_WAVES,
  buildSplitF0dPairedSchedule,
  classifySplitF0dCredential,
  createSplitF0dDryRunConfigReceipt,
  fingerprintSplitF0dProviderIdentifierHmacV1,
  loadSplitF0dRunPlan,
  parseSplitF0dArguments,
  runSplitF0dDryRun,
  runSplitF0dOfflineControls,
  validateSplitF0dFutureLiveConfiguration,
  validateSplitF0dRunPlan,
} from "../../scripts/run-split-f0d-paired-read-only-equivalence.mjs";
import {
  buildSplitF0LogicalSearchPlan,
  createSplitF0RatesRequestBodyV1,
  loadSplitF0ScenarioMatrix,
  sha256SplitF0,
  stableStringifySplitF0,
} from "../../scripts/run-split-f0-read-only-collector.mjs";

test("the paired plan binds the one existing eight-scenario matrix without duplicating live inputs", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const runPlan = await loadSplitF0dRunPlan();
  assert.deepEqual(await validateSplitF0dRunPlan(matrix, runPlan), {
    valid: true,
    issues: [],
  });
  assert.equal(matrix.scenarios.length, 8);
  assert.deepEqual(
    matrix.scenarios.map((scenario) => scenario.nights),
    SPLIT_F0D_EXPECTED_LIVE_DURATIONS
  );
  assert.deepEqual(
    runPlan.liveScenarioIds,
    matrix.scenarios.map((scenario) => scenario.scenarioId)
  );
  assert.equal(runPlan.sourceScenarioMatrixPath, "tests/engine-v3/fixtures/split-f0-scenario-matrix-v1.json");
  const fixtureText = await fs.readFile(
    path.join(SPLIT_F0D_REPOSITORY_ROOT, "tests/engine-v3/fixtures/split-f0d-equivalence-run-plan-v1.json"),
    "utf8"
  );
  for (const forbiddenDuplicatedField of ["destination", "checkIn", "checkOut", "occupancy"]) {
    assert.equal(fixtureText.includes(`\"${forbiddenDuplicatedField}\"`), false);
  }
});

test("two waves counterbalance every pair and prove identical sandbox/production request hashes", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const runPlan = await loadSplitF0dRunPlan();
  const schedule = buildSplitF0dPairedSchedule(matrix, runPlan);
  const logicalSearches = buildSplitF0LogicalSearchPlan(matrix);
  assert.equal(logicalSearches.length, 40);
  assert.equal(schedule.pairs.length, 80);
  assert.equal(schedule.plannedHttpRequests, 160);
  assert.equal(schedule.plannedHttpRequests, SPLIT_F0D_HARD_REQUEST_BUDGET);
  assert.deepEqual(SPLIT_F0D_ENVIRONMENTS, ["sandbox", "production"]);
  assert.deepEqual(SPLIT_F0D_WAVES, ["wave-a", "wave-b"]);

  const expectedReceiptKeys = [
    "canonicalBodySha256",
    "checkIn",
    "checkOut",
    "currency",
    "durationNights",
    "guestNationality",
    "logicalSearchId",
    "nonSecretConfiguration",
    "occupancy",
    "scenarioId",
    "searchKind",
    "segmentOrdinal",
    "splitPointId",
    "waveId",
  ];
  for (const pair of schedule.pairs) {
    assert.equal(
      pair.environmentRequestHashes.sandbox,
      pair.environmentRequestHashes.production
    );
    assert.deepEqual(Object.keys(pair.requestReceipt).sort(), expectedReceiptKeys);
    assert.equal("environment" in pair.requestReceipt, false);
    assert.equal("baseUrl" in pair.requestReceipt, false);
    assert.equal("credential" in pair.requestReceipt, false);
    assert.equal("headers" in pair.requestReceipt, false);
    assert.equal("timestamp" in pair.requestReceipt, false);
  }

  for (let ordinal = 0; ordinal < 40; ordinal += 1) {
    const waveA = schedule.pairs[ordinal];
    const waveB = schedule.pairs[40 + ordinal];
    assert.deepEqual(waveB.environmentOrder, [...waveA.environmentOrder].reverse());
    const body = createSplitF0RatesRequestBodyV1(logicalSearches[ordinal]);
    const expectedHash = `sha256:${sha256SplitF0(stableStringifySplitF0(body))}`;
    assert.equal(waveA.requestReceipt.canonicalBodySha256, expectedHash);
    assert.equal(waveB.requestReceipt.canonicalBodySha256, expectedHash);
  }
});

test("the complete D1 run is deterministic, dry-run-only and plans exactly 160 future requests", async () => {
  const first = await runSplitF0dDryRun();
  const second = await runSplitF0dDryRun();
  assert.equal(stableStringifySplitF0(first), stableStringifySplitF0(second));
  assert.equal(first.status, "PASS");
  assert.equal(first.executionMode, "DRY_RUN_ONLY");
  assert.equal(first.originalScenarioMatrixReused, true);
  assert.equal(first.liveScenarioCount, 8);
  assert.deepEqual(first.liveDurations, [5, 7, 10, 12, 14, 21, 28, 30]);
  assert.equal(first.logicalSearchesPerScenario, 5);
  assert.equal(first.requestPairCount, 80);
  assert.equal(first.plannedLiveHttpRequests, 160);
  assert.equal(first.actualHttpRequests, 0);
  assert.equal(first.actualHttpRequests, SPLIT_F0D_ACTUAL_HTTP_REQUESTS);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.sandboxCalls, 0);
  assert.equal(first.productionCalls, 0);
  assert.equal(first.prebookCalls, 0);
  assert.equal(first.bookingCalls, 0);
  assert.equal(first.paymentCalls, 0);
  assert.equal(first.pairedRequestHashMatch, true);
  assert.equal(first.pairLevelExecutionPlanned, true);
  assert.equal(first.sandboxProductionOrderCounterbalanced, true);
  assert.equal(first.marketEvidence, false);
  assert.equal(first.policyEligible, false);
  assert.equal(first.publicRecommendationAllowed, false);
});

test("offline controls cover the two-night boundary and four provider-neutral replay branches", async () => {
  const matrix = await loadSplitF0ScenarioMatrix();
  const runPlan = await loadSplitF0dRunPlan();
  const offline = runSplitF0dOfflineControls(matrix, runPlan);
  assert.equal(offline.twoNightControl.nights, 2);
  assert.equal(offline.twoNightControl.fullStayValid, true);
  assert.deepEqual(offline.twoNightControl.admissibleSplitPoints, []);
  assert.equal(offline.twoNightControl.plannedProviderRequests, 0);
  assert.equal(offline.twoNightControl.actualProviderRequests, 0);
  assert.equal(offline.replayControls.length, 4);

  const [noSaving, candidate, incomplete, availability] = offline.replayControls;
  assert.equal(noSaving.economicSignal, "NO_GROSS_SAVING");
  assert.equal(candidate.grossSavingMinorUnits, 8_000);
  assert.equal(candidate.baselineSelectionMode, "PRIMARY_FIXED_BEST_SINGLE");
  assert.equal(candidate.matchedBucketDiagnosticOnly, true);
  assert.equal(candidate.publicRecommendationProduced, false);
  assert.equal(Number.isInteger(candidate.fixedBaselineTotalMinorUnits), true);
  assert.equal(Number.isInteger(candidate.grossSavingMinorUnits), true);
  assert.equal(incomplete.comparabilityLevel, "NON_COMPARABLE");
  assert.equal(incomplete.issues.includes("total-cost-incomplete"), true);
  assert.equal(availability.bestSingleChanged, true);
  assert.equal(availability.beforeLoss.fixedBaselineOfferSnapshotId, "offline.single-a");
  assert.equal(availability.afterLoss.fixedBaselineOfferSnapshotId, "offline.single-b");
  assert.equal(availability.publicRecommendationProduced, false);
});

test("future live configuration is fail-closed without exposing credential values", () => {
  const sandboxCredential = ["sand", "unit-test-only"].join("_");
  const productionCredential = ["prod", "unit-test-only"].join("_");
  const valid = validateSplitF0dFutureLiveConfiguration({
    sandboxBaseUrl: "https://api.liteapi.travel/v3.0",
    productionBaseUrl: "https://api.liteapi.travel/v3.0",
    sandboxCredential,
    productionCredential,
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.issues, []);
  const serialized = JSON.stringify(valid);
  assert.equal(serialized.includes(sandboxCredential), false);
  assert.equal(serialized.includes(productionCredential), false);
  assert.equal(valid.credentialReceipt.valuesExposed, false);
  assert.equal(classifySplitF0dCredential(sandboxCredential), "SAND");
  assert.equal(classifySplitF0dCredential(productionCredential), "PROD");

  const wrongProduction = validateSplitF0dFutureLiveConfiguration({
    sandboxBaseUrl: "https://api.liteapi.travel/v3.0",
    productionBaseUrl: "https://api.liteapi.travel/v3.0",
    sandboxCredential,
    productionCredential: sandboxCredential,
  });
  assert.equal(wrongProduction.valid, false);
  assert.equal(wrongProduction.issues.includes("PRODUCTION_CREDENTIAL_CLASS_NOT_PROVEN"), true);

  for (const invalidBaseUrl of [
    "http://api.liteapi.travel/v3.0",
    "https://localhost/v3.0",
    "https://api.liteapi.travel/v2.0",
    "https://user:password@api.liteapi.travel/v3.0",
  ]) {
    const invalid = validateSplitF0dFutureLiveConfiguration({
      sandboxBaseUrl: invalidBaseUrl,
      productionBaseUrl: "https://api.liteapi.travel/v3.0",
      sandboxCredential,
      productionCredential,
    });
    assert.equal(invalid.valid, false, invalidBaseUrl);
  }

  const receipt = createSplitF0dDryRunConfigReceipt();
  assert.equal(receipt.method, "POST");
  assert.equal(receipt.endpointPath, "/hotels/rates");
  assert.equal(receipt.httpsRequired, true);
  assert.deepEqual(receipt.hostAllowlist, ["api.liteapi.travel"]);
  assert.equal(receipt.redirects, "disabled");
  assert.equal(receipt.cache, "disabled");
  assert.equal(receipt.continuation, "none");
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.concurrency, 1);
  assert.equal(receipt.maxRequestsPerSecond, 1);
  assert.equal(receipt.hardRequestBudget, 160);
  assert.equal(receipt.fallbackBetweenEnvironments, false);
  assert.equal(receipt.credentialValuesExposed, false);
});

test("future identifier correlation uses only an ephemeral HMAC fingerprint", () => {
  const firstKey = new Uint8Array(32).fill(17);
  const secondKey = new Uint8Array(32).fill(23);
  const rawIdentifier = "synthetic-provider-id-for-contract-test";
  const first = fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, firstKey);
  const repeat = fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, firstKey);
  const differentRun = fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, secondKey);
  assert.match(first, /^hmac-sha256:[0-9a-f]{64}$/);
  assert.equal(first, repeat);
  assert.notEqual(first, differentRun);
  assert.equal(first.includes(rawIdentifier), false);
  assert.throws(
    () => fingerprintSplitF0dProviderIdentifierHmacV1(rawIdentifier, new Uint8Array(8)),
    /ephemeral-hmac-key-invalid/
  );
});

test("CLI defaults to dry-run and blocks live execution before environment or transport access", () => {
  assert.deepEqual(parseSplitF0dArguments([]), { mode: "dry-run" });
  assert.deepEqual(parseSplitF0dArguments(["--dry-run"]), { mode: "dry-run" });
  assert.throws(
    () => parseSplitF0dArguments(["--execute"]),
    /live-execution-not-authorized-in-d1/
  );
  assert.throws(() => parseSplitF0dArguments(["--unknown"]), /arguments-invalid/);
});

test("paired runner remains outside server, frontend, V2/V3 decision cores and public policy", async () => {
  const runnerPath = path.join(
    SPLIT_F0D_REPOSITORY_ROOT,
    "scripts",
    "run-split-f0d-paired-read-only-equivalence.mjs"
  );
  const source = await fs.readFile(runnerPath, "utf8");
  const importSpecifiers = [
    ...source.matchAll(/(?:from\s+|require\(\s*)(["'])([^"']+)\1/g),
  ].map((match) => match[2]);
  for (const forbidden of [
    "engine-v2",
    "independentDecisionEngineV3",
    "orchestrator",
    "frontend",
    "server/",
    "server\\",
    "policy",
  ]) {
    assert.equal(importSpecifiers.some((specifier) => specifier.includes(forbidden)), false, forbidden);
  }
  assert.equal(
    importSpecifiers.some((specifier) => specifier.endsWith("run-split-f0-read-only-collector.mjs")),
    true
  );
  assert.equal(
    importSpecifiers.some((specifier) => specifier.endsWith("splitF0EconomicFeasibilityPilotV3.ts")),
    true
  );
  assert.equal(source.includes("globalThis.fetch"), false);
  assert.equal(source.includes("/rates/prebook"), false);
  assert.equal(source.includes("/book"), false);
  assert.equal(source.includes("/payment"), false);

  const indexSource = await fs.readFile(
    path.join(SPLIT_F0D_REPOSITORY_ROOT, "src/engine-v3/index.ts"),
    "utf8"
  );
  assert.equal(indexSource.includes("splitF0dPaired"), false);
  assert.equal(indexSource.includes("run-split-f0d-paired"), false);
});
