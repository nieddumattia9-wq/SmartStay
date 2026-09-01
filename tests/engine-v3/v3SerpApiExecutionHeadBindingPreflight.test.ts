import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3,
  STAYOPTI_SERPAPI_T2B_AMBIGUOUS_AUTHORIZATION_LITERAL_V3,
  STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3,
  createSerpApiT2CRequiredAuthorizationLiteralV3,
  executeSerpApiGoogleHotelsPilotV3,
  type StayOptiSerpApiPilotAuthorizationEnvelopeV3,
  type StayOptiSerpApiPilotRawStoreV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotGateV3";
import {
  STAYOPTI_SERPAPI_T2B_MAX2_STAGE_POLICY_V3,
  createSerpApiT2CMax2AuthorizationLiteralV3,
} from "../../src/engine-v3/evaluation/serpApiGoogleHotelsPilotStageV3";

const GATE_COMMIT = "17432a19083403492e3dd28c62affad405c70737";
const PREVIOUS_HEAD = STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3;
const SUCCESSOR_HEAD = "2".repeat(40);
const TEST_KEY = "SYNTHETIC_NOT_A_REAL_KEY";
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

class MemoryRawStore implements StayOptiSerpApiPilotRawStoreV3 {
  writeEphemeral() {}
  removeEphemeral() {}
  removeAllEphemeral() {}
}

function authorization(executionHead: string, literal = createSerpApiT2CRequiredAuthorizationLiteralV3(executionHead), manifestHash = STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3): StayOptiSerpApiPilotAuthorizationEnvelopeV3 {
  return {
    authorizationState: "AUTHORIZED_NOT_STARTED",
    literal,
    stage: "CANARY",
    sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    executionHead,
    manifestHash,
    accountPlan: "FREE",
    retentionAuthorized: true,
  };
}

async function rejected(input: {
  authorization: StayOptiSerpApiPilotAuthorizationEnvelopeV3;
  observedExecutionHead: string;
}) {
  let calls = 0;
  const result = await executeSerpApiGoogleHotelsPilotV3({
    authorization: input.authorization,
    apiKey: TEST_KEY,
    observedSourceSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    observedExecutionHead: input.observedExecutionHead,
    nowIso: "2026-09-02T00:00:00Z",
    transport: { async send() { calls += 1; throw new Error("transport reached"); } },
    rawStore: new MemoryRawStore(),
  }).catch((error) => error);
  return { result, calls };
}

test("T2C-PREFLIGHT 01 literal distinguishes source SHA and execution HEAD", () => {
  const literal = createSerpApiT2CRequiredAuthorizationLiteralV3(GATE_COMMIT);
  assert.match(literal, new RegExp(`SOURCE_SHA_${STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3}_EXECUTION_HEAD_${GATE_COMMIT}_`));
});

test("T2C-PREFLIGHT 02 old ambiguous T2B literal is explicitly revoked", () => {
  assert.ok(STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3.includes(STAYOPTI_SERPAPI_T2B_AMBIGUOUS_AUTHORIZATION_LITERAL_V3));
});

test("T2C-PREFLIGHT 03 old ambiguous literal is rejected before transport", async () => {
  const result = await rejected({ authorization: authorization(GATE_COMMIT, STAYOPTI_SERPAPI_T2B_AMBIGUOUS_AUTHORIZATION_LITERAL_V3), observedExecutionHead: GATE_COMMIT });
  assert.equal(result.calls, 0);
  assert.match(String(result.result), /AUTHORIZATION_LITERAL_MISMATCH/);
});

test("T2C-PREFLIGHT 04 previous HEAD literal is rejected on current execution HEAD", async () => {
  const result = await rejected({ authorization: authorization(PREVIOUS_HEAD), observedExecutionHead: GATE_COMMIT });
  assert.equal(result.calls, 0);
  assert.match(String(result.result), /AUTHORIZATION_LITERAL_MISMATCH|EXECUTION_HEAD_MISMATCH/);
});

test("T2C-PREFLIGHT 05 successor HEAD literal is rejected on current execution HEAD", async () => {
  const result = await rejected({ authorization: authorization(SUCCESSOR_HEAD), observedExecutionHead: GATE_COMMIT });
  assert.equal(result.calls, 0);
  assert.match(String(result.result), /AUTHORIZATION_LITERAL_MISMATCH|EXECUTION_HEAD_MISMATCH/);
});

test("T2C-PREFLIGHT 06 altered manifest is rejected before transport", async () => {
  const result = await rejected({ authorization: authorization(GATE_COMMIT, createSerpApiT2CRequiredAuthorizationLiteralV3(GATE_COMMIT), "0".repeat(64)), observedExecutionHead: GATE_COMMIT });
  assert.equal(result.calls, 0);
  assert.match(String(result.result), /MANIFEST_HASH_MISMATCH/);
});

test("T2C-PREFLIGHT 07 altered runner bundle literal is rejected before transport", async () => {
  const altered = createSerpApiT2CMax2AuthorizationLiteralV3({ sourceSha: STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3, executionHead: GATE_COMMIT, manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, runnerBundleHash: "0".repeat(64) });
  const result = await rejected({ authorization: authorization(GATE_COMMIT, altered), observedExecutionHead: GATE_COMMIT });
  assert.equal(result.calls, 0);
  assert.match(String(result.result), /AUTHORIZATION_LITERAL_MISMATCH/);
});

test("T2C-PREFLIGHT 08 malformed execution HEAD fails closed", () => {
  assert.throws(() => createSerpApiT2CRequiredAuthorizationLiteralV3("not-a-sha"), /EXECUTION_HEAD_INVALID/);
});

test("T2C-PREFLIGHT 09 node runner verifies Git HEAD and bundle before credential access", () => {
  const runner = source("scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs");
  assert.ok(runner.indexOf("validateGitPreflight") < runner.indexOf("process.env.SERPAPI_API_KEY"));
  assert.ok(runner.indexOf("computeV317T2RunnerBundleHash") < runner.indexOf("process.env.SERPAPI_API_KEY"));
  assert.match(runner, /T2A_SOURCE_SHA = "ed2633c1fc700a9d9199ce920b826d2909543ab8"/);
  assert.match(runner, /T2B_GATE_COMMIT_SHA = "17432a19083403492e3dd28c62affad405c70737"/);
  assert.match(runner, /merge-base", "--is-ancestor", T2B_GATE_COMMIT_SHA, observedHead/);
});

test("T2C-PREFLIGHT 10 node runner derives required literal from observed HEAD", () => {
  const runner = source("scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs");
  assert.match(runner, /createSerpApiT2CRequiredAuthorizationLiteralV3\(observedHead\)/);
});

test("T2C-PREFLIGHT 11 handoff proves source-to-gate ancestry and dynamic execution binding", () => {
  const handoff = source("scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1");
  assert.match(handoff, /merge-base --is-ancestor \$GateCommitSha \$ObservedHead/);
  assert.match(handoff, /SOURCE_SHA_\$\{SourceSha\}_EXECUTION_HEAD_\$\{ObservedHead\}/);
});

test("T2C-PREFLIGHT 12 dirty-set and bundle checks precede the secure prompt", () => {
  const handoff = source("scripts/invoke-v3-17t2-serpapi-google-hotels-canary-handoff.ps1");
  assert.ok(handoff.indexOf("DIRTY_PATH_INTEGRITY") < handoff.indexOf("SECURE_KEY_PROMPT"));
  assert.ok(handoff.indexOf("RUNNER_BUNDLE_HASH") < handoff.indexOf("SECURE_KEY_PROMPT"));
});

test("T2C-PREFLIGHT 13 manifest and MAX2 policy remain unchanged", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3, "e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88");
  assert.deepEqual(STAYOPTI_SERPAPI_T2B_MAX2_STAGE_POLICY_V3, {
    maximumTotalRequests: 2, mainSearchMaximum: 1, propertyDetailMaximum: 1,
    sessionsMaximum: 1, maximumConcurrency: 1, retryBudget: 0,
    paginationBudget: 0, propertyDetailSelectionMaximum: 1, autostop: true,
    remainingStageAuthorized: false, automaticGoldenAdmission: false,
    encryptedPrivateQuarantineRequired: true,
  });
});

test("T2C-PREFLIGHT 14 preflight grants no network authorization", () => {
  assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.explicitCallAuthorizationGranted, false);
  assert.equal(STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3.executionHeadVerifiedBeforeNetwork, true);
});
