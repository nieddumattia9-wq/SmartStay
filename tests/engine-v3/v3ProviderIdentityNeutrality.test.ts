import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createDecisionTieProjectionV3,
  resolveDecisionTieV3,
} from "../../src/engine-v3/decision/decisionTieProjectionV3";

const ROOT = process.cwd();

function source(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function functionBody(file: string, name: string, nextName: string): string {
  const text = source(file);
  const start = text.indexOf(`function ${name}`);
  const end = text.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(start, -1, `Missing ${name} in ${file}.`);
  assert.notEqual(end, -1, `Missing ${nextName} after ${name} in ${file}.`);
  return text.slice(start, end);
}

test("shared tie resolution never manufactures a winner from opaque identity", () => {
  const candidates = [
    { opaqueId: "provider-z:999", utility: 80, price: 400 },
    { opaqueId: "provider-a:001", utility: 80, price: 400 },
  ];
  const resolveTie = (values: typeof candidates) => resolveDecisionTieV3(
    values,
    (left, right) => right.utility - left.utility || left.price - right.price,
    ({ utility, price }) => ({ utility, price })
  );

  for (const values of [candidates, [...candidates].reverse()]) {
    const resolution = resolveTie(values);
    assert.equal(resolution.classification, "DECISIONALLY_EQUIVALENT");
    assert.equal(resolution.presentationRepresentative, null);
    assert.equal(resolution.leaders.length, 2);
  }
});

test("provider-neutral semantic presentation may map a reference without claiming superiority", () => {
  const resolution = resolveDecisionTieV3(
    [
      { opaqueId: "smaller-id", utility: 80, price: 400, roomTier: 2 },
      { opaqueId: "larger-id", utility: 80, price: 400, roomTier: 1 },
    ],
    (left, right) => right.utility - left.utility || left.price - right.price,
    ({ utility, price, roomTier }) => ({ utility, price, roomTier })
  );

  assert.equal(resolution.classification, "DECISIONALLY_EQUIVALENT");
  assert.equal(resolution.presentationRepresentative?.roomTier, 1);
  assert.equal(resolution.leaders.length, 2);
});

test("decision comparators contain no provider-derived identity tie-break", () => {
  const banned = /\.(?:hotelId|offerId|solutionId|providerId|provider|sourceProvider)\s*\.localeCompare/;
  const bodies = [
    functionBody(
      "src/engine-v3/policy/personalUtilityRolePolicyV3.ts",
      "chooseBestChoice",
      "emptyMetrics"
    ),
    functionBody(
      "src/engine-v3/scale/searchWideScaleCoverageV3.ts",
      "compareFullScore",
      "createEquivalenceAudit"
    ),
    functionBody(
      "src/engine-v3/robustness/decisionRobustnessV3.ts",
      "createComparisonCohort",
      "createScenarios"
    ),
    functionBody(
      "src/engine-v3/robustness/decisionRobustnessV3.ts",
      "createCandidateRegret",
      "detectNearTie"
    ),
    functionBody(
      "src/engine-v3/adapter/v2CompatibilityAdapterV3.ts",
      "comparePicks",
      "adaptV2SearchResultToDecisionV3"
    ),
  ];

  for (const body of bodies) assert.doesNotMatch(body, banned);
});

test("LiteAPI identity construction remains an opaque provider boundary only", () => {
  const liteApiProvider = source("server/providers/liteApi/liteApiProvider.js");
  assert.match(liteApiProvider, /id:\s*`\$\{SOURCE_PROVIDER\}:\$\{sourceHotelId\}`/);

  const coreFiles = [
    "src/engine-v3/policy/personalUtilityRolePolicyV3.ts",
    "src/engine-v3/scale/searchWideScaleCoverageV3.ts",
    "src/engine-v3/robustness/decisionRobustnessV3.ts",
    "src/engine-v3/decision/decisionTieProjectionV3.ts",
  ];
  for (const file of coreFiles) {
    assert.doesNotMatch(source(file), /server[\\/]providers|liteApiProvider/);
  }
});

test("commercial fields cannot enter the shared decision tie projection", () => {
  assert.deepEqual(
    createDecisionTieProjectionV3({
      utility: 80,
      valid: true,
      provider: "Provider A",
      hotelId: "provider:123",
      offerId: "offer:123",
      commission: 12,
      markup: 5,
    }),
    { utility: 80, valid: true }
  );
});
