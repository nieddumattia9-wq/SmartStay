import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import type {
  Hotel,
  HotelOffer,
} from "../../src/types/hotel";

import {
  evaluateSmartStaySearchV2,
} from "../../src/engine-v2/orchestrator/smartStayEngineV2";

import {
  adaptV2SearchResultToDecisionV3,
} from "../../src/engine-v3/adapter/v2CompatibilityAdapterV3";

import {
  createGoldenNegativeOutcomeBaselineV3,
} from "../../src/engine-v3/evaluation/goldenNegativeOutcomeBaselineV3";

import {
  loadDecisionScienceSchemaAdmissionV3,
  type DecisionScienceSchemaImportInputV3,
} from "../../src/engine-v3/research/decisionScienceSchemaAdmissionV3";

import {
  DECISION_SCIENCE_SCHEMA_IDS_V3,
} from "../../src/engine-v3/research/decisionScienceSchemaSemanticV3";

import {
  createNodeDecisionScienceSchemaWorkerV3,
  type DecisionScienceSchemaWorkerAssetV3,
  type DecisionScienceSchemaWorkerMessageV3,
} from "../../src/engine-v3/research/decisionScienceSchemaWorkerV3";

const LIBRARY_ROOT = resolve(
  process.cwd(),
  "data/engine-v3/decision-science-library/v1.1"
);
const MANIFEST_PATH = resolve(
  LIBRARY_ROOT,
  "schemas/STAYOPTI_SCHEMA_ADMISSION_MANIFEST.json"
);

interface ManifestFixture {
  schemas: Array<{
    path: string;
    bytes: number;
    sha256: string;
    schemaId: string;
    draftUri: string;
  }>;
}

function createSchemaInput(): DecisionScienceSchemaImportInputV3 {
  const manifestText = readFileSync(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(manifestText) as ManifestFixture;
  return {
    manifestText,
    assets: manifest.schemas.map(({ path }) => ({
      path,
      content: readFileSync(resolve(LIBRARY_ROOT, ...path.split("/")), "utf8"),
    })),
  };
}

async function loadService() {
  const loaded = await loadDecisionScienceSchemaAdmissionV3({
    mode: "registry-only",
    importer: async () => createSchemaInput(),
  });
  assert.equal(loaded.status, "ready", JSON.stringify(loaded.issues));
  assert.ok(loaded.service);
  return loaded.service;
}

const ACCOMMODATION_TYPES = [
  "hotel",
  "serviced-apartment",
  "vacation-rental-entire-unit",
  "vacation-rental-private-room",
  "bed-and-breakfast-or-guesthouse",
  "hostel-private-room",
  "hostel-dorm-bed",
  "resort",
  "campground-pitch",
  "campground-rental-unit",
  "holiday-park",
  "glamping-unit",
  "other",
  "unknown",
] as const;

const SHARE_SCOPES = [
  "entire-unit",
  "private-room-shared-common-space",
  "private-room-private-common-space",
  "shared-room-or-dorm",
  "private-site-or-pitch",
  "shared-site-or-pitch",
  "unknown",
] as const;

const SCHEMA_ALLOWED = Object.freeze({
  hotel: new Set(["private-room-shared-common-space", "private-room-private-common-space"]),
  "serviced-apartment": new Set(["entire-unit"]),
  "vacation-rental-entire-unit": new Set(["entire-unit"]),
  "vacation-rental-private-room": new Set(["private-room-shared-common-space", "private-room-private-common-space"]),
  "bed-and-breakfast-or-guesthouse": new Set(["private-room-shared-common-space", "private-room-private-common-space"]),
  "hostel-private-room": new Set(["private-room-shared-common-space", "private-room-private-common-space"]),
  "hostel-dorm-bed": new Set(["shared-room-or-dorm"]),
  "campground-pitch": new Set(["private-site-or-pitch", "shared-site-or-pitch"]),
} as const);

const INDETERMINATE = new Set([
  "resort|shared-room-or-dorm",
  "resort|private-site-or-pitch",
  "resort|shared-site-or-pitch",
  "resort|unknown",
  "campground-rental-unit|private-room-shared-common-space",
  "campground-rental-unit|private-room-private-common-space",
  "campground-rental-unit|shared-room-or-dorm",
  "campground-rental-unit|shared-site-or-pitch",
  "campground-rental-unit|unknown",
  "holiday-park|private-room-shared-common-space",
  "holiday-park|private-room-private-common-space",
  "holiday-park|shared-room-or-dorm",
  "holiday-park|unknown",
  "glamping-unit|private-room-shared-common-space",
  "glamping-unit|private-room-private-common-space",
  "glamping-unit|shared-room-or-dorm",
  "glamping-unit|unknown",
  "other|unknown",
  "unknown|unknown",
]);

function identityPayload(
  canonicalProductType: string,
  shareScope: string
): Record<string, unknown> {
  return {
    schemaVersion: "1.1.0",
    identityModelVersion: "accommodation-identity:v1.1",
    propertyIdentity: "property:parity",
    unitOrBedOrSiteIdentity: "unit:parity",
    rateOfferIdentity: "offer:parity",
    rawDeclaredLabel: "Declared unit",
    canonicalProductType,
    taxonomyAuthority: "stayopti",
    taxonomyVersion: "1.1.0",
    shareScope,
    statedCapacity: 2,
    requestedOccupancy: 2,
    stayBinding: { checkIn: "2026-11-12", checkOut: "2026-11-19" },
    partyBinding: { adults: 2, children: 0, requestedUnits: 1 },
    observationTimestamp: "2026-08-18T12:00:00Z",
    identityProvenanceRefs: ["source:parity"],
    rankingInfluence: "none",
  };
}

test("all 98 accommodation type x share-scope combinations preserve the audited disposition", async (context) => {
  const service = await loadService();
  let indeterminate = 0;
  let schemaRejected = 0;
  let consistent = 0;
  for (const accommodationType of ACCOMMODATION_TYPES) {
    for (const shareScope of SHARE_SCOPES) {
      await context.test(`${accommodationType} x ${shareScope}`, async () => {
        const result = await service.admit(
          DECISION_SCIENCE_SCHEMA_IDS_V3.identity,
          JSON.stringify(identityPayload(accommodationType, shareScope))
        );
        const schemaRule = SCHEMA_ALLOWED[
          accommodationType as keyof typeof SCHEMA_ALLOWED
        ];
        const schemaAccepts = schemaRule === undefined || schemaRule.has(shareScope);
        const key = `${accommodationType}|${shareScope}`;
        if (!schemaAccepts) {
          assert.equal(result.status, "blocked");
          schemaRejected += 1;
        } else if (INDETERMINATE.has(key)) {
          assert.equal(result.status, "admitted", JSON.stringify(result.issues));
          assert.equal(result.semanticState, "indeterminate");
          indeterminate += 1;
        } else {
          assert.equal(result.status, "admitted", JSON.stringify(result.issues));
          assert.equal(result.semanticState, "consistent");
          consistent += 1;
        }
      });
    }
  }
  assert.equal(indeterminate, 19);
  assert.equal(schemaRejected + consistent, 79);
  assert.equal(schemaRejected + consistent + indeterminate, 98);
});

async function runPrivateWorker(
  assets: readonly DecisionScienceSchemaWorkerAssetV3[]
): Promise<DecisionScienceSchemaWorkerMessageV3[]> {
  return new Promise((resolve, reject) => {
    const messages: DecisionScienceSchemaWorkerMessageV3[] = [];
    const worker = createNodeDecisionScienceSchemaWorkerV3({
      operation: "compile",
      assets,
      schemaId: null,
      payloadText: null,
    });
    worker.on("message", (message) => {
      messages.push(message);
      if (message.type === "blocked" || message.type === "complete") {
        void worker.terminate().finally(() => resolve(messages));
      }
    });
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (messages.length === 0 && code !== 0) reject(new Error(`worker exit ${code}`));
    });
  });
}

function workerAssets(): DecisionScienceSchemaWorkerAssetV3[] {
  const input = createSchemaInput();
  const manifest = JSON.parse(input.manifestText) as ManifestFixture;
  return manifest.schemas.map((schema, index) => ({
    ...schema,
    content: input.assets[index]!.content,
  }));
}

test("$data schema injection is rejected by the private Ajv 2020 worker", async () => {
  const assets = workerAssets();
  const schema = JSON.parse(assets[0]!.content) as Record<string, unknown>;
  const properties = schema.properties as Record<string, unknown>;
  properties.schemaVersion = { const: { $data: "1/schemaVersion" } };
  const content = `${JSON.stringify(schema)}\n`;
  assets[0] = {
    ...assets[0]!,
    content,
    bytes: Buffer.byteLength(content, "utf8"),
    sha256: createHash("sha256").update(content, "utf8").digest("hex"),
  };
  const messages = await runPrivateWorker(assets);
  const terminal = messages.find((message) => message.type === "blocked");
  assert.ok(terminal, JSON.stringify(messages));
  assert.equal(terminal.code, "SCH_SCHEMA_DATA_KEYWORD_FORBIDDEN");
  assert.equal(messages.some((message) => message.type === "compiled"), false);
});

test("remote $ref cannot trigger loading and fails compilation locally", async () => {
  const assets = workerAssets();
  const schema = JSON.parse(assets[0]!.content) as Record<string, unknown>;
  schema.$ref = "https://unreachable.invalid/remote.schema.json";
  const content = `${JSON.stringify(schema)}\n`;
  assets[0] = {
    ...assets[0]!,
    content,
    bytes: Buffer.byteLength(content, "utf8"),
    sha256: createHash("sha256").update(content, "utf8").digest("hex"),
  };
  const messages = await runPrivateWorker(assets);
  assert.ok(
    messages.some(
      (message) =>
        message.type === "blocked" && message.code === "SCH_SCHEMA_COMPILE_FAILED"
    )
  );
});

function createOffer(index: number, provider: string, totalCost: number): HotelOffer {
  return {
    id: `schema-diff-offer-${index}`,
    provider,
    price: totalCost,
    basePrice: totalCost,
    saving: 0,
    currency: "EUR",
    cancellationPolicy: "Free cancellation before arrival",
    refundableTag: "RFN",
    refundable: true,
    freeCancellationUntil: "2026-09-01",
    cancellationPenalty: 0,
    cancellationPenaltyCurrency: "EUR",
    cancellationPenaltyType: "amount",
    cancellationTimezone: "Europe/Rome",
    taxesIncluded: true,
    includedTaxes: 24,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: totalCost,
    roomName: "Double hotel room",
    mealPlan: "Breakfast included",
    bookable: true,
  };
}

function createHotel(
  id: string,
  provider: string,
  totalCost: number,
  stars: number,
  reviewScore: number,
  reviewCount: number,
  distance: number,
  offerIndex: number
): Hotel {
  return {
    id,
    dataSources: [provider],
    dataConfidence: "full",
    availableData: {
      hasPrice: true,
      hasBasePrice: true,
      hasSaving: true,
      hasStars: true,
      hasReviewScore: true,
      hasReviewCount: true,
      hasDistance: true,
      hasImage: true,
      hasAddress: true,
      hasCoordinates: true,
      hasAmenities: true,
    },
    offers: [createOffer(offerIndex, provider, totalCost)],
    name: `Schema differential ${id}`,
    provider,
    stars,
    reviewScore,
    reviewCount,
    reviewCountRelation: "equal",
    reviewText: "Stable differential evidence",
    price: totalCost,
    basePrice: totalCost,
    saving: 0,
    currency: "EUR",
    taxesIncluded: true,
    includedTaxes: 24,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: totalCost,
    distance,
    image: `https://images.example/${id}.jpg`,
    address: `${offerIndex} Schema Street`,
    city: "Florence",
    country: "Italy",
    latitude: 43.77 + offerIndex / 1000,
    longitude: 11.25 + offerIndex / 1000,
    amenities: ["Hotel room", "Private bathroom", "WiFi", "Air conditioning", "Breakfast", "Reception", "Elevator"],
    facilities: ["Front desk", "Daily housekeeping"],
  };
}

const SEARCH_INPUT = {
  hotels: [
    createHotel("schema-central", "Provider A", 420, 4, 8.9, 920, 0.7, 1),
    createHotel("schema-saving", "Provider B", 330, 3, 8.4, 640, 1.1, 2),
    createHotel("schema-upgrade", "Provider A", 510, 5, 9.2, 1100, 0.5, 3),
  ],
  preferenceId: "balanced" as const,
  preferenceSource: "manual" as const,
  totalBudget: 450,
  maximumDistanceKm: 3,
  selectedLocation: { latitude: 43.77, longitude: 11.25, confidence: 1 },
  nights: 4,
  adults: 2,
  children: 0,
  rooms: 1,
  checkIn: "2026-10-10",
  checkOut: "2026-10-14",
  currency: "EUR",
};

function currentDecisions() {
  const v2 = evaluateSmartStaySearchV2(SEARCH_INPUT);
  const v3 = adaptV2SearchResultToDecisionV3({ searchInput: SEARCH_INPUT, result: v2 });
  return { v2, v3 };
}

test("schema admission ON is byte-identical to OFF on the real V2/V3 decision outputs", async () => {
  const before = currentDecisions();
  const loaded = await loadService();
  const after = currentDecisions();
  assert.equal(loaded.rankingInfluence, "none");
  assert.equal(loaded.decisionUse, "forbidden");
  assert.deepEqual(after.v2, before.v2);
  assert.deepEqual(after.v3, before.v3);
  assert.deepEqual(
    after.v3.candidates.map(({ solutionId, utilityScore, role }) => ({ solutionId, utilityScore, role })),
    before.v3.candidates.map(({ solutionId, utilityScore, role }) => ({ solutionId, utilityScore, role }))
  );
  assert.equal(after.v3.recommendedSolutionId, before.v3.recommendedSolutionId);
  assert.equal(after.v3.bestAlternativeSolutionId, before.v3.bestAlternativeSolutionId);
  assert.deepEqual(after.v3.thesis, before.v3.thesis);
  assert.equal(after.v3.replay.decisionFingerprint, before.v3.replay.decisionFingerprint);
});

test("schema admission leaves Golden and judgment counts unchanged", async () => {
  const before = createGoldenNegativeOutcomeBaselineV3();
  await loadService();
  const after = createGoldenNegativeOutcomeBaselineV3();
  assert.deepEqual(after, before);
  assert.equal(before.counts.goldenReceipts, 115);
  assert.equal(before.counts.decisionResearchUsableNegativeCases, 5);
});

test("schema admission modules remain private and absent from public/core boundaries", () => {
  const publicBarrel = readFileSync(resolve(process.cwd(), "src/engine-v3/index.ts"), "utf8");
  const runtimeConfig = readFileSync(resolve(process.cwd(), "src/config/runtimeConfig.ts"), "utf8");
  const decisionFiles = [
    "src/engine-v3/orchestrator/stayOptiEngineV3.ts",
    "src/engine-v3/decision/decisionCoreV3.ts",
  ].filter((path) => {
    try { readFileSync(resolve(process.cwd(), path)); return true; } catch { return false; }
  });
  assert.doesNotMatch(publicBarrel, /SchemaAdmission|decisionScienceSchema/u);
  assert.doesNotMatch(runtimeConfig, /SchemaAdmission|decisionScienceSchema/u);
  for (const path of decisionFiles) {
    assert.doesNotMatch(
      readFileSync(resolve(process.cwd(), path), "utf8"),
      /SchemaAdmission|decisionScienceSchema/u
    );
  }
});
