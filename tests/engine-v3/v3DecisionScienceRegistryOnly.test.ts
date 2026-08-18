import assert from "node:assert/strict";
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
  createStableHashV3,
} from "../../src/engine-v3/contract/stableHashV3";

import {
  createGoldenNegativeOutcomeBaselineV3,
} from "../../src/engine-v3/evaluation/goldenNegativeOutcomeBaselineV3";

import {
  STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3,
  STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3,
  STAYOPTI_DECISION_SCIENCE_REGISTRY_MODE_DEFAULT_V3,
  STAYOPTI_DECISION_SCIENCE_REGISTRY_ONLY_AUDIT_V3,
  STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3,
  loadDecisionScienceRegistryOnlyV3,
  normalizeDecisionScienceRegistryPathV3,
  validateDecisionScienceRegistryRecordsV3,
  type StayOptiDecisionScienceRegistryCountsV3,
  type StayOptiDecisionScienceRegistryImportInputV3,
  type StayOptiDecisionScienceRegistryIssueCodeV3,
  type StayOptiDecisionScienceRegistryLoadResultV3,
} from "../../src/engine-v3/research/decisionScienceRegistryOnlyV3";

const REGISTRY_ROOT = resolve(
  process.cwd(),
  "data/engine-v3/decision-science-library/v1.1"
);

const IMPORT_MANIFEST_PATH = resolve(
  REGISTRY_ROOT,
  "STAYOPTI_IMPORT_MANIFEST.json"
);

interface TestImportManifest {
  expectedCounts: StayOptiDecisionScienceRegistryCountsV3;
  assets: Array<{
    path: string;
  }>;
}

function readImportManifestText(): string {
  return readFileSync(IMPORT_MANIFEST_PATH, "utf8");
}

function readImportManifest(): TestImportManifest {
  return JSON.parse(readImportManifestText()) as TestImportManifest;
}

function resolveAssetPath(canonicalPath: string): string {
  return resolve(
    REGISTRY_ROOT,
    ...canonicalPath.split("/")
  );
}

function createImportInput(
  pathStyle: "posix" | "windows" = "posix"
): StayOptiDecisionScienceRegistryImportInputV3 {
  const manifest = readImportManifest();
  return {
    importManifest: readImportManifestText(),
    assets: manifest.assets.map(({ path }) => ({
      path:
        pathStyle === "windows"
          ? path.replace(/\//g, "\\")
          : path,
      content: readFileSync(resolveAssetPath(path), "utf8"),
    })),
  };
}

function createInputWithManifestAssets(
  assets: unknown[]
): StayOptiDecisionScienceRegistryImportInputV3 {
  const input = createImportInput();
  const manifest = JSON.parse(input.importManifest) as Record<string, unknown>;
  manifest.assets = assets;
  return {
    ...input,
    importManifest: JSON.stringify(manifest),
  };
}

function assertBlockedWithoutInfluence(
  result: StayOptiDecisionScienceRegistryLoadResultV3
): void {
  assert.equal(result.status, "blocked");
  assert.equal(result.registry, null);
  assert.equal(result.rankingInfluence, "none");
  assert.equal(result.decisionCoreChanged, false);
  assert.equal(result.publicV2Changed, false);
  assert.equal(result.publicV3Enabled, false);
  assert.equal(result.splitEnabled, false);
  assert.deepEqual(
    {
      goldenIncrement: result.goldenIncrement,
      adversarialIncrement: result.adversarialIncrement,
      counterfactualIncrement: result.counterfactualIncrement,
      humanJudgmentIncrement: result.humanJudgmentIncrement,
      expertJudgmentIncrement: result.expertJudgmentIncrement,
      aiJudgmentIncrement: result.aiJudgmentIncrement,
    },
    {
      goldenIncrement: 0,
      adversarialIncrement: 0,
      counterfactualIncrement: 0,
      humanJudgmentIncrement: 0,
      expertJudgmentIncrement: 0,
      aiJudgmentIncrement: 0,
    }
  );
}

const MALFORMED_IMPORTER_CASES: Array<{
  name: string;
  createValue: () => unknown;
}> = [
  {
    name: "null result",
    createValue: () => null,
  },
  {
    name: "undefined result",
    createValue: () => undefined,
  },
  {
    name: "primitive result",
    createValue: () => "invalid",
  },
  {
    name: "array result",
    createValue: () => [],
  },
  {
    name: "non-plain object result",
    createValue: () => new Date(0),
  },
  {
    name: "hostile object result",
    createValue: () => new Proxy({}, {
      getPrototypeOf: () => {
        throw new Error("hostile prototype trap");
      },
    }),
  },
  {
    name: "empty object",
    createValue: () => ({}),
  },
  {
    name: "missing importManifest",
    createValue: () => ({
      assets: [],
    }),
  },
  {
    name: "null importManifest",
    createValue: () => ({
      importManifest: null,
      assets: [],
    }),
  },
  {
    name: "non-string importManifest",
    createValue: () => ({
      importManifest: 1,
      assets: [],
    }),
  },
  {
    name: "missing assets",
    createValue: () => ({
      importManifest: readImportManifestText(),
    }),
  },
  {
    name: "null assets",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: null,
    }),
  },
  {
    name: "non-array assets",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: {},
    }),
  },
  {
    name: "null runtime asset",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [null],
    }),
  },
  {
    name: "primitive runtime asset",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [1],
    }),
  },
  {
    name: "non-plain runtime asset",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [new Date(0)],
    }),
  },
  {
    name: "runtime asset missing path",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [{ content: "{}" }],
    }),
  },
  {
    name: "runtime asset path is not a string",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [{ path: 1, content: "{}" }],
    }),
  },
  {
    name: "runtime asset missing content",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [{ path: "data/source_registry.json" }],
    }),
  },
  {
    name: "runtime asset content is not a string",
    createValue: () => ({
      importManifest: readImportManifestText(),
      assets: [{ path: "data/source_registry.json", content: [] }],
    }),
  },
  {
    name: "manifest contains a null asset",
    createValue: () => createInputWithManifestAssets([null]),
  },
  {
    name: "manifest contains a primitive asset",
    createValue: () => createInputWithManifestAssets([1]),
  },
  {
    name: "manifest asset contains invalid primitive fields",
    createValue: () => createInputWithManifestAssets([{
      path: 1,
      bytes: "0",
      sha256: null,
      role: [],
    }]),
  },
];

type ClosedShapeLevel =
  | "importer result"
  | "runtime asset"
  | "manifest root"
  | "sourceArchive"
  | "mode"
  | "expectedCounts"
  | "manifest asset";

const CLOSED_SHAPE_LEVELS: ClosedShapeLevel[] = [
  "importer result",
  "runtime asset",
  "manifest root",
  "sourceArchive",
  "mode",
  "expectedCounts",
  "manifest asset",
];

const CLOSED_SHAPE_EXTRA_FIELDS = [
  "unexpectedField",
  "affiliateCommission",
  "partnerRevenue",
  "conversionValue",
  "takeRate",
] as const;

const TEST_IMPORT_FINGERPRINT_NAMESPACE =
  "stayopti-v3-decision-science-registry-only-import";

function createInputWithExtraField(
  level: ClosedShapeLevel,
  field: typeof CLOSED_SHAPE_EXTRA_FIELDS[number]
): unknown {
  const input = createImportInput();
  const value = field === "unexpectedField" ? "unexpected" : 0;

  if (level === "importer result") {
    return {
      ...input,
      [field]: value,
    };
  }

  if (level === "runtime asset") {
    return {
      ...input,
      assets: input.assets.map((asset, index) =>
        index === 0
          ? {
              ...asset,
              [field]: value,
            }
          : asset
      ),
    };
  }

  const manifest = JSON.parse(input.importManifest) as Record<string, unknown>;
  let target: Record<string, unknown>;
  switch (level) {
    case "manifest root":
      target = manifest;
      break;
    case "sourceArchive":
      target = manifest.sourceArchive as Record<string, unknown>;
      break;
    case "mode":
      target = manifest.mode as Record<string, unknown>;
      break;
    case "expectedCounts":
      target = manifest.expectedCounts as Record<string, unknown>;
      break;
    case "manifest asset":
      target = (manifest.assets as Array<Record<string, unknown>>)[0];
      break;
    default:
      throw new Error("Unsupported closed-shape test level.");
  }
  target[field] = value;
  return {
    ...input,
    importManifest: JSON.stringify(manifest),
  };
}

function recalculateRawManifestFingerprint(
  input: StayOptiDecisionScienceRegistryImportInputV3
): StayOptiDecisionScienceRegistryImportInputV3 {
  const manifest = JSON.parse(input.importManifest) as Record<string, unknown>;
  const {
    registryFingerprint: _registryFingerprint,
    ...rawFingerprintPayload
  } = manifest;
  manifest.registryFingerprint = createStableHashV3(
    rawFingerprintPayload,
    TEST_IMPORT_FINGERPRINT_NAMESPACE
  );
  return {
    ...input,
    importManifest: JSON.stringify(manifest),
  };
}

interface DescriptorRuntimeFixture {
  value: unknown;
  getterCalls: () => number;
  cleanup: () => void;
}

interface DescriptorRuntimeCase {
  name: string;
  createFixture: () => DescriptorRuntimeFixture;
}

function descriptorFixture(
  value: unknown,
  getterCalls: () => number = () => 0,
  cleanup: () => void = () => undefined
): DescriptorRuntimeFixture {
  return {
    value,
    getterCalls,
    cleanup,
  };
}

function defineTemporaryProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor
): () => void {
  const previous = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, descriptor);
  return () => {
    if (previous === undefined) {
      if (!Reflect.deleteProperty(target, key)) {
        throw new Error("Failed to restore temporary prototype property.");
      }
    } else {
      Object.defineProperty(target, key, previous);
    }
  };
}

const PROPERTY_DESCRIPTOR_NEGATIVE_CASES: DescriptorRuntimeCase[] = [
  {
    name: "A1 non-enumerable unexpectedField on importer result",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input, "unexpectedField", {
        value: "unexpected",
        enumerable: false,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "A2 non-enumerable affiliateCommission on importer result",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input, "affiliateCommission", {
        value: 0,
        enumerable: false,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "A3 non-enumerable unexpectedField on runtime asset",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets[0], "unexpectedField", {
        value: "unexpected",
        enumerable: false,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "A4 non-enumerable affiliateCommission on runtime asset",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets[0], "affiliateCommission", {
        value: 0,
        enumerable: false,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "A5 non-enumerable extra field on assets array",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets, "unexpectedField", {
        value: "unexpected",
        enumerable: false,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "B1 Symbol on importer result",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input, Symbol("importer-symbol"), {
        value: true,
        enumerable: true,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "B2 Symbol on runtime asset",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets[0], Symbol("asset-symbol"), {
        value: true,
        enumerable: true,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "B3 Symbol on assets array",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets, Symbol("array-symbol-b"), {
        value: true,
        enumerable: true,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "C1 extra getter on importer result",
    createFixture: () => {
      const input = createImportInput();
      let calls = 0;
      Object.defineProperty(input, "unexpectedField", {
        enumerable: true,
        configurable: true,
        get: () => {
          calls += 1;
          return "unexpected";
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "C2 extra getter on runtime asset",
    createFixture: () => {
      const input = createImportInput();
      let calls = 0;
      Object.defineProperty(input.assets[0], "unexpectedField", {
        enumerable: true,
        configurable: true,
        get: () => {
          calls += 1;
          return "unexpected";
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "C3 getter used as importManifest",
    createFixture: () => {
      const input = createImportInput();
      let calls = 0;
      Object.defineProperty(input, "importManifest", {
        enumerable: true,
        configurable: true,
        get: () => {
          calls += 1;
          return readImportManifestText();
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "C4 getter used as runtime asset path",
    createFixture: () => {
      const input = createImportInput();
      const original = input.assets[0].path;
      let calls = 0;
      Object.defineProperty(input.assets[0], "path", {
        enumerable: true,
        configurable: true,
        get: () => {
          calls += 1;
          return original;
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "C5 getter used as runtime asset content",
    createFixture: () => {
      const input = createImportInput();
      const original = input.assets[0].content;
      let calls = 0;
      Object.defineProperty(input.assets[0], "content", {
        enumerable: true,
        configurable: true,
        get: () => {
          calls += 1;
          return original;
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "C6 extra setter on importer result",
    createFixture: () => {
      const input = createImportInput();
      let calls = 0;
      Object.defineProperty(input, "unexpectedField", {
        enumerable: true,
        configurable: true,
        set: () => {
          calls += 1;
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "C7 setter used as importManifest",
    createFixture: () => {
      const input = createImportInput();
      let calls = 0;
      Object.defineProperty(input, "importManifest", {
        enumerable: true,
        configurable: true,
        set: () => {
          calls += 1;
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "D1 inherited importManifest cannot satisfy the importer contract",
    createFixture: () => {
      const input = createImportInput() as unknown as Record<string, unknown>;
      const inherited = input.importManifest;
      Reflect.deleteProperty(input, "importManifest");
      const cleanup = defineTemporaryProperty(
        Object.prototype,
        "importManifest",
        {
          value: inherited,
          enumerable: true,
          configurable: true,
          writable: true,
        }
      );
      return descriptorFixture(input, () => 0, cleanup);
    },
  },
  {
    name: "D2 inherited assets cannot satisfy the importer contract",
    createFixture: () => {
      const input = createImportInput() as unknown as Record<string, unknown>;
      const inherited = input.assets;
      Reflect.deleteProperty(input, "assets");
      const cleanup = defineTemporaryProperty(Object.prototype, "assets", {
        value: inherited,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      return descriptorFixture(input, () => 0, cleanup);
    },
  },
  {
    name: "D3 inherited runtime asset path cannot satisfy the contract",
    createFixture: () => {
      const input = createImportInput();
      const asset = input.assets[0] as unknown as Record<string, unknown>;
      const inherited = asset.path;
      Reflect.deleteProperty(asset, "path");
      const cleanup = defineTemporaryProperty(Object.prototype, "path", {
        value: inherited,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      return descriptorFixture(input, () => 0, cleanup);
    },
  },
  {
    name: "D4 inherited runtime asset content cannot satisfy the contract",
    createFixture: () => {
      const input = createImportInput();
      const asset = input.assets[0] as unknown as Record<string, unknown>;
      const inherited = asset.content;
      Reflect.deleteProperty(asset, "content");
      const cleanup = defineTemporaryProperty(Object.prototype, "content", {
        value: inherited,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      return descriptorFixture(input, () => 0, cleanup);
    },
  },
  {
    name: "E1 assets array with enumerable string property",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets, "unexpectedField", {
        value: "unexpected",
        enumerable: true,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "E2 assets array with commercial property",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets, "affiliateCommission", {
        value: 0,
        enumerable: true,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "E3 assets array with Symbol property",
    createFixture: () => {
      const input = createImportInput();
      Object.defineProperty(input.assets, Symbol("array-symbol-e"), {
        value: true,
        enumerable: true,
        configurable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "E4 sparse assets array",
    createFixture: () => {
      const input = createImportInput();
      Reflect.deleteProperty(input.assets, "0");
      return descriptorFixture(input);
    },
  },
  {
    name: "E5 non-enumerable assets array index",
    createFixture: () => {
      const input = createImportInput();
      const first = input.assets[0];
      Object.defineProperty(input.assets, "0", {
        value: first,
        enumerable: false,
        configurable: true,
        writable: true,
      });
      return descriptorFixture(input);
    },
  },
  {
    name: "E6 accessor assets array index",
    createFixture: () => {
      const input = createImportInput();
      const first = input.assets[0];
      let calls = 0;
      Object.defineProperty(input.assets, "0", {
        enumerable: true,
        configurable: true,
        get: () => {
          calls += 1;
          return first;
        },
      });
      return descriptorFixture(input, () => calls);
    },
  },
  {
    name: "E7 inherited assets array index",
    createFixture: () => {
      const input = createImportInput();
      const first = input.assets[0];
      const inheritedArrayPrototype = Object.create(
        Array.prototype
      ) as unknown[];
      Object.defineProperty(inheritedArrayPrototype, "0", {
        value: first,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      Reflect.deleteProperty(input.assets, "0");
      Object.setPrototypeOf(input.assets, inheritedArrayPrototype);
      return descriptorFixture(input);
    },
  },
];

function freezeValidImportInput(): unknown {
  const input = createImportInput();
  input.assets.forEach((asset) => Object.freeze(asset));
  Object.freeze(input.assets);
  return Object.freeze(input);
}

function createNullPrototypeImportInput(): unknown {
  const input = createImportInput();
  const assets = input.assets.map((asset) =>
    Object.assign(Object.create(null) as Record<string, unknown>, asset)
  );
  return Object.assign(Object.create(null) as Record<string, unknown>, {
    importManifest: input.importManifest,
    assets,
  });
}

function createParsedRecords(): Record<string, unknown> {
  return Object.fromEntries(
    createImportInput().assets.map(({ path, content }) => [
      normalizeDecisionScienceRegistryPathV3(path),
      JSON.parse(content) as unknown,
    ])
  );
}

function validateMutation(
  mutate: (
    records: Record<string, unknown>
  ) => void
): StayOptiDecisionScienceRegistryIssueCodeV3[] {
  const records = structuredClone(createParsedRecords());
  mutate(records);
  return validateDecisionScienceRegistryRecordsV3(
    records,
    readImportManifest().expectedCounts
  ).issues.map(({ code }) => code);
}

function candidateClaims(
  records: Record<string, unknown>
): Array<Record<string, unknown>> {
  const root =
    records["data/candidate_claim_registry.json"] as {
      claims: Array<Record<string, unknown>>;
    };
  return root.claims;
}

function candidateSources(
  records: Record<string, unknown>
): Array<Record<string, unknown>> {
  const root =
    records["data/candidate_source_registry.json"] as {
      sources: Array<Record<string, unknown>>;
    };
  return root.sources;
}

function createOffer(
  index: number,
  provider: string,
  totalCost: number
): HotelOffer {
  return {
    id: "registry-diff-offer-" + index,
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
  input: {
    id: string;
    provider: string;
    totalCost: number;
    stars: number;
    reviewScore: number;
    reviewCount: number;
    distance: number;
    offerIndex: number;
  }
): Hotel {
  return {
    id: input.id,
    dataSources: [
      input.provider,
    ],
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
    offers: [
      createOffer(
        input.offerIndex,
        input.provider,
        input.totalCost
      ),
    ],
    name: "Registry differential " + input.id,
    provider: input.provider,
    stars: input.stars,
    reviewScore: input.reviewScore,
    reviewCount: input.reviewCount,
    reviewCountRelation: "equal",
    reviewText: "Stable differential evidence",
    price: input.totalCost,
    basePrice: input.totalCost,
    saving: 0,
    currency: "EUR",
    taxesIncluded: true,
    includedTaxes: 24,
    excludedTaxes: 0,
    unknownTaxes: 0,
    totalKnownCost: input.totalCost,
    distance: input.distance,
    image: "https://images.example/" + input.id + ".jpg",
    address: input.offerIndex + " Registry Street",
    city: "Florence",
    country: "Italy",
    latitude: 43.77 + input.offerIndex / 1000,
    longitude: 11.25 + input.offerIndex / 1000,
    amenities: [
      "Hotel room",
      "Private bathroom",
      "WiFi",
      "Air conditioning",
      "Breakfast",
      "Reception",
      "Elevator",
    ],
    facilities: [
      "Front desk",
      "Daily housekeeping",
    ],
  };
}

const HOTELS: Hotel[] = [
  createHotel({
    id: "registry-central-value",
    provider: "Provider A",
    totalCost: 420,
    stars: 4,
    reviewScore: 8.9,
    reviewCount: 920,
    distance: 0.7,
    offerIndex: 1,
  }),
  createHotel({
    id: "registry-sensible-saving",
    provider: "Provider B",
    totalCost: 330,
    stars: 3,
    reviewScore: 8.4,
    reviewCount: 640,
    distance: 1.1,
    offerIndex: 2,
  }),
  createHotel({
    id: "registry-comfort-upgrade",
    provider: "Provider A",
    totalCost: 510,
    stars: 5,
    reviewScore: 9.2,
    reviewCount: 1100,
    distance: 0.5,
    offerIndex: 3,
  }),
];

const SEARCH_INPUT = {
  hotels: HOTELS,
  preferenceId: "balanced" as const,
  preferenceSource: "manual" as const,
  totalBudget: 450,
  maximumDistanceKm: 3,
  selectedLocation: {
    latitude: 43.77,
    longitude: 11.25,
    confidence: 1,
  },
  nights: 4,
  adults: 2,
  children: 0,
  rooms: 1,
  checkIn: "2026-10-10",
  checkOut: "2026-10-14",
  currency: "EUR",
};

function createCurrentDecisions() {
  const v2 = evaluateSmartStaySearchV2(SEARCH_INPUT);
  const v3 = adaptV2SearchResultToDecisionV3({
    searchInput: SEARCH_INPUT,
    result: v2,
  });
  return {
    v2,
    v3,
  };
}

test("V3-13B1 is default-off and OFF does not invoke the importer", async () => {
  let importerCalls = 0;
  const result = await loadDecisionScienceRegistryOnlyV3(
    STAYOPTI_DECISION_SCIENCE_REGISTRY_MODE_DEFAULT_V3,
    async () => {
      importerCalls += 1;
      return createImportInput();
    }
  );

  assert.equal(importerCalls, 0);
  assert.equal(result.status, "off");
  assert.equal(result.registry, null);
  assert.equal(result.resolvedMode, "off");
});

test("the frozen v1.1 registry subset loads as opaque registry-only data", async () => {
  const result = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput()
  );

  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  assert.equal(result.registry?.libraryVersion, STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3);
  assert.equal(
    result.registry?.packageFingerprint,
    STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3
  );
  assert.equal(
    result.registry?.registryFingerprint,
    STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3
  );
  assert.equal(result.registry?.rankingInfluence, "none");
  assert.equal(result.registry?.candidateRecordsCanInfluenceDecision, false);
  assert.equal(result.registry?.traceAttached, false);
  assert.equal(result.registry?.publicImportAllowed, false);
  assert.deepEqual(result.registry?.counts, readImportManifest().expectedCounts);
  assert.equal(Object.isFrozen(result.registry), true);
  assert.equal(Object.isFrozen(result.registry?.records), true);
});

test("manifest paths and fingerprint are deterministic on Windows and POSIX", async () => {
  const releaseAttributes = readFileSync(
    resolve(REGISTRY_ROOT, ".gitattributes"),
    "utf8"
  );
  assert.match(
    releaseAttributes,
    /^STAYOPTI_IMPORT_MANIFEST\.json text eol=lf\ndata\/\*\.json text eol=lf\n$/
  );
  assert.equal(
    normalizeDecisionScienceRegistryPathV3("data\\candidate_claim_registry.json"),
    "data/candidate_claim_registry.json"
  );
  assert.equal(
    normalizeDecisionScienceRegistryPathV3("data/candidate_claim_registry.json"),
    "data/candidate_claim_registry.json"
  );
  assert.throws(
    () => normalizeDecisionScienceRegistryPathV3("../candidate_claim_registry.json")
  );
  assert.throws(
    () => normalizeDecisionScienceRegistryPathV3({ path: "data/file.json" })
  );

  const posix = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput("posix")
  );
  const windows = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput("windows")
  );
  assert.equal(posix.status, "ready");
  assert.equal(windows.status, "ready");
  assert.equal(
    posix.registry?.registryFingerprint,
    windows.registry?.registryFingerprint
  );
  assert.deepEqual(posix.registry?.counts, windows.registry?.counts);
});

for (const malformedCase of MALFORMED_IMPORTER_CASES) {
  test(
    "malformed importer payload fails closed without rejection: " +
      malformedCase.name,
    async () => {
      let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
      await assert.doesNotReject(async () => {
        result = await loadDecisionScienceRegistryOnlyV3(
          "registry-only",
          async () => malformedCase.createValue()
        );
      });
      assert.ok(result);
      assertBlockedWithoutInfluence(result);
    }
  );
}

for (const level of CLOSED_SHAPE_LEVELS) {
  for (const field of CLOSED_SHAPE_EXTRA_FIELDS) {
    test(
      "closed-shape loader rejects " + field + " at " + level,
      async () => {
        let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
        await assert.doesNotReject(async () => {
          result = await loadDecisionScienceRegistryOnlyV3(
            "registry-only",
            async () => createInputWithExtraField(level, field)
          );
        });
        assert.ok(result);
        assertBlockedWithoutInfluence(result);
        assert.ok(
          result.issues.some(
            ({ code, path }) =>
              code === "unexpected-field" && path.endsWith("." + field)
          ),
          JSON.stringify(result.issues)
        );
        if (field !== "unexpectedField") {
          assert.ok(
            result.issues.some(
              ({ code, path }) =>
                code === "commercial-or-sensitive-field" &&
                path.endsWith("." + field)
            ),
            JSON.stringify(result.issues)
          );
        }
      }
    );
  }
}

test("an unchanged valid raw manifest remains ready", async () => {
  const result = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput()
  );
  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  assert.ok(result.registry);
});

test("an extra raw field invalidates the original manifest fingerprint", async () => {
  const input = createInputWithExtraField(
    "manifest root",
    "unexpectedField"
  );
  let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
  await assert.doesNotReject(async () => {
    result = await loadDecisionScienceRegistryOnlyV3(
      "registry-only",
      async () => input
    );
  });
  assert.ok(result);
  assertBlockedWithoutInfluence(result);
  assert.ok(
    result.issues.some(({ code }) => code === "unexpected-field")
  );
  assert.ok(
    result.issues.some(({ code }) => code === "import-manifest-invalid"),
    "The raw extra field must participate in fingerprint verification."
  );
});

test("a recalculated fingerprint cannot bypass the closed manifest shape", async () => {
  const input = recalculateRawManifestFingerprint(
    createInputWithExtraField(
      "manifest root",
      "unexpectedField"
    ) as StayOptiDecisionScienceRegistryImportInputV3
  );
  let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
  await assert.doesNotReject(async () => {
    result = await loadDecisionScienceRegistryOnlyV3(
      "registry-only",
      async () => input
    );
  });
  assert.ok(result);
  assertBlockedWithoutInfluence(result);
  assert.ok(
    result.issues.some(({ code }) => code === "unexpected-field"),
    JSON.stringify(result.issues)
  );
});

for (const descriptorCase of PROPERTY_DESCRIPTOR_NEGATIVE_CASES) {
  test(
    "property-descriptor firewall rejects " + descriptorCase.name,
    async () => {
      const fixture = descriptorCase.createFixture();
      const before = createCurrentDecisions();
      let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
      try {
        await assert.doesNotReject(async () => {
          result = await loadDecisionScienceRegistryOnlyV3(
            "registry-only",
            async () => fixture.value
          );
        });
        assert.equal(
          fixture.getterCalls(),
          0,
          "Validation must not invoke a getter."
        );
      } finally {
        fixture.cleanup();
      }

      assert.ok(result);
      assertBlockedWithoutInfluence(result);
      if (descriptorCase.name.includes("affiliateCommission")) {
        assert.ok(
          result.issues.some(
            ({ code }) => code === "commercial-or-sensitive-field"
          ),
          JSON.stringify(result.issues)
        );
      }
      const after = createCurrentDecisions();
      assert.deepEqual(after.v2, before.v2);
      assert.deepEqual(after.v3, before.v3);
    }
  );
}

const PROPERTY_DESCRIPTOR_POSITIVE_CASES: Array<{
  name: string;
  createValue: () => unknown;
}> = [
  {
    name: "normal valid input",
    createValue: () => createImportInput(),
  },
  {
    name: "deep-frozen valid input",
    createValue: () => freezeValidImportInput(),
  },
  {
    name: "normal JSON arrays",
    createValue: () => JSON.parse(JSON.stringify(createImportInput())),
  },
  {
    name: "null-prototype valid objects",
    createValue: () => createNullPrototypeImportInput(),
  },
];

for (const positiveCase of PROPERTY_DESCRIPTOR_POSITIVE_CASES) {
  test(
    "property-descriptor firewall accepts " + positiveCase.name,
    async () => {
      const result = await loadDecisionScienceRegistryOnlyV3(
        "registry-only",
        async () => positiveCase.createValue()
      );
      assert.equal(result.status, "ready", JSON.stringify(result.issues));
      assert.ok(result.registry);
      assert.equal(result.rankingInfluence, "none");
      assert.equal(result.decisionCoreChanged, false);
      assert.equal(result.publicV2Changed, false);
      assert.equal(result.publicV3Enabled, false);
      assert.equal(result.splitEnabled, false);
    }
  );
}

test("duplicate IDs are rejected inside their registry namespace", () => {
  const codes = validateMutation((records) => {
    const claims = candidateClaims(records);
    claims.push(structuredClone(claims[0]));
  });
  assert.ok(codes.includes("duplicate-id"));
});

test("unresolved candidate sourceRefs are rejected", () => {
  const codes = validateMutation((records) => {
    candidateClaims(records)[0].sourceRefs = [
      "SRC-UNKNOWN-999",
    ];
  });
  assert.ok(codes.includes("unresolved-source-ref"));
});

test("records outside their frozen track namespace are rejected", () => {
  const codes = validateMutation((records) => {
    candidateClaims(records)[0].track = "travel-value-risk";
  });
  assert.ok(codes.includes("namespace-invalid"));
});

test("direct or nested ranking influence is rejected", () => {
  const codes = validateMutation((records) => {
    candidateClaims(records)[0].diagnostic = {
      rankingInfluence: "direct",
    };
  });
  assert.ok(codes.includes("ranking-influence-forbidden"));
});

test("hidden commercial or sensitive fields are rejected recursively", () => {
  const codes = validateMutation((records) => {
    candidateClaims(records)[0].metadata = {
      nested: {
        commissionAmount: 0,
      },
    };
  });
  assert.ok(codes.includes("commercial-or-sensitive-field"));
});

for (const field of [
  "affiliateCommission",
  "partnerRevenue",
  "conversionValue",
  "takeRate",
]) {
  test("commercial field is rejected explicitly: " + field, () => {
    const codes = validateMutation((records) => {
      candidateClaims(records)[0].metadata = {
        nested: {
          [field]: 0,
        },
      };
    });
    assert.ok(codes.includes("commercial-or-sensitive-field"));
  });
}

test("objects cannot replace required primitive fields", () => {
  const codes = validateMutation((records) => {
    candidateSources(records)[0].sourceId = {
      value: "SRC-ACC-001",
    };
  });
  assert.ok(codes.includes("primitive-required"));
});

test("candidate effects without an executable test idea are rejected", () => {
  const codes = validateMutation((records) => {
    candidateClaims(records)[0].testIdea = "";
  });
  assert.ok(codes.includes("record-invalid"));
});

test("a stale manifest or changed vendored byte fails closed", async () => {
  const stale = createImportInput();
  const parsed = JSON.parse(stale.importManifest) as Record<string, unknown>;
  parsed.registryFingerprint = "fnv1a32-00000000";
  stale.importManifest = JSON.stringify(parsed);
  const staleResult = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => stale
  );
  assert.equal(staleResult.status, "blocked");
  assert.equal(staleResult.registry, null);
  assert.ok(
    staleResult.issues.some(({ code }) => code === "import-manifest-invalid")
  );

  const changed = createImportInput();
  changed.assets[0] = {
    ...changed.assets[0],
    content: changed.assets[0].content + "\n",
  };
  const changedResult = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => changed
  );
  assert.equal(changedResult.status, "blocked");
  assert.equal(changedResult.registry, null);
  assert.ok(
    changedResult.issues.some(({ code }) => code === "asset-hash-mismatch")
  );
});

test("offline import failure exposes no registry and leaves the decision core available", async () => {
  const before = createCurrentDecisions();
  let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
  await assert.doesNotReject(async () => {
    result = await loadDecisionScienceRegistryOnlyV3(
      "registry-only",
      async () => {
        throw new Error("simulated offline import failure");
      }
    );
  });
  const after = createCurrentDecisions();

  assert.ok(result);
  assertBlockedWithoutInfluence(result);
  assert.deepEqual(after.v2, before.v2);
  assert.deepEqual(after.v3, before.v3);
});

test("Library OFF and registry-only ON are identical on the real V2 and V3 decision cores", async () => {
  const before = createCurrentDecisions();
  const result = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput()
  );
  const after = createCurrentDecisions();

  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  assert.deepEqual(after.v2, before.v2);
  assert.deepEqual(after.v3, before.v3);
  assert.deepEqual(
    after.v3.candidates.map(({ solutionId, utilityScore, role }) => ({
      solutionId,
      utilityScore,
      role,
    })),
    before.v3.candidates.map(({ solutionId, utilityScore, role }) => ({
      solutionId,
      utilityScore,
      role,
    }))
  );
  assert.equal(after.v3.recommendedSolutionId, before.v3.recommendedSolutionId);
  assert.equal(after.v3.bestAlternativeSolutionId, before.v3.bestAlternativeSolutionId);
  assert.deepEqual(after.v3.thesis, before.v3.thesis);
  assert.equal(
    after.v3.replay.decisionFingerprint,
    before.v3.replay.decisionFingerprint
  );
});

test("registry-only cannot increment Golden, adversarial, counterfactual or judgment counts", async () => {
  const before = createGoldenNegativeOutcomeBaselineV3();
  const result = await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput()
  );
  const after = createGoldenNegativeOutcomeBaselineV3();

  assert.equal(result.status, "ready");
  assert.deepEqual(after, before);
  assert.equal(before.counts.goldenReceipts, 115);
  assert.equal(before.counts.decisionResearchUsableNegativeCases, 5);
  assert.deepEqual(
    {
      goldenIncrement: result.goldenIncrement,
      adversarialIncrement: result.adversarialIncrement,
      counterfactualIncrement: result.counterfactualIncrement,
      humanJudgmentIncrement: result.humanJudgmentIncrement,
      expertJudgmentIncrement: result.expertJudgmentIncrement,
      aiJudgmentIncrement: result.aiJudgmentIncrement,
    },
    {
      goldenIncrement: 0,
      adversarialIncrement: 0,
      counterfactualIncrement: 0,
      humanJudgmentIncrement: 0,
      expertJudgmentIncrement: 0,
      aiJudgmentIncrement: 0,
    }
  );
});

test("the registry-only subset does not import Lisbon or expose any public runtime hook", () => {
  const manifest = readImportManifest();
  const publicBarrel = readFileSync(
    resolve(process.cwd(), "src/engine-v3/index.ts"),
    "utf8"
  );
  const runtimeConfig = readFileSync(
    resolve(process.cwd(), "src/config/runtimeConfig.ts"),
    "utf8"
  );

  assert.equal(
    manifest.assets.some(({ path }) => /lisbon/i.test(path)),
    false
  );
  assert.doesNotMatch(publicBarrel, /decisionScienceRegistryOnlyV3/);
  assert.doesNotMatch(runtimeConfig, /DECISION_SCIENCE_REGISTRY/);
  assert.deepEqual(STAYOPTI_DECISION_SCIENCE_REGISTRY_ONLY_AUDIT_V3, {
    defaultMode: "off",
    allowedEnabledMode: "registry-only",
    importedByDecisionCore: false,
    importedByPublicBarrel: false,
    traceEnabled: false,
    applicabilityEnabled: false,
    contributionLedgerEnabled: false,
    teacherLabEnabled: false,
    policyShadowEnabled: false,
    rankingInfluence: "none",
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    providerCallsAllowed: false,
    commercialInputsAllowed: false,
  });
});
