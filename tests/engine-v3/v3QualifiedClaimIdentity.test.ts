import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_TEST_VECTORS_V3,
  STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_VERSION_V3,
  STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
  STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3,
  STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
  canonicalizeQualifiedClaimJsonV3,
  deepFreezeQualifiedClaimValueV3,
  parseQualifiedClaimKeyV3,
  serializeQualifiedClaimIdentityV3,
  sha256QualifiedClaimTextV3,
  validateQualifiedClaimIdentityV3,
  type QualifiedClaimIdentityV3,
} from "../../src/engine-v3/research/qualifiedClaimIdentityV3";

import {
  STAYOPTI_QUALIFIED_CLAIM_OVERLAY_FINGERPRINT_V3,
  STAYOPTI_QUALIFIED_CLAIM_OVERLAY_SCHEMA_VERSION_V3,
  STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3,
  buildQualifiedClaimIdentityOverlayV3,
  type QualifiedClaimOverlayBuildInputV3,
  type QualifiedClaimOverlayBuildResultV3,
} from "../../src/engine-v3/research/qualifiedClaimIdentityOverlayV3";

import {
  loadDecisionScienceRegistryOnlyV3,
  type StayOptiDecisionScienceRegistryImportInputV3,
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

interface TestManifestAsset {
  path: string;
  role: string;
  sha256: string;
}

interface TestImportManifest {
  assets: TestManifestAsset[];
}

function readManifestText(): string {
  return readFileSync(IMPORT_MANIFEST_PATH, "utf8");
}

function readManifest(): TestImportManifest {
  return JSON.parse(readManifestText()) as TestImportManifest;
}

function resolveAssetPath(path: string): string {
  return resolve(REGISTRY_ROOT, ...path.split("/"));
}

function createImportInput(
  style: "posix" | "windows" = "posix"
): StayOptiDecisionScienceRegistryImportInputV3 {
  const manifest = readManifest();
  return {
    importManifest: readManifestText(),
    assets: manifest.assets.map((asset) => ({
      path: style === "windows" ? asset.path.replace(/\//g, "\\") : asset.path,
      content: readFileSync(resolveAssetPath(asset.path), "utf8"),
    })),
  };
}

function createOverlayInput(): QualifiedClaimOverlayBuildInputV3 {
  const manifest = readManifest();
  return {
    libraryRelease: STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3,
    packageFingerprint: STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3,
    manifestAssets: manifest.assets.map(({ path, role, sha256 }) => ({
      path,
      role,
      sha256,
    })),
    records: Object.fromEntries(
      manifest.assets.map(({ path }) => [
        path,
        JSON.parse(readFileSync(resolveAssetPath(path), "utf8")) as unknown,
      ])
    ),
  };
}

function cloneOverlayInput(): QualifiedClaimOverlayBuildInputV3 {
  return JSON.parse(JSON.stringify(createOverlayInput())) as QualifiedClaimOverlayBuildInputV3;
}

function validCoreIdentity(): QualifiedClaimIdentityV3 {
  return {
    namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
    identitySchemaVersion: STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
    registryScope: "core-appraised",
    track: null,
    claimId: "CLM-ACC-001",
    claimVersion: 1,
  };
}

function validCandidateIdentity(): QualifiedClaimIdentityV3 {
  return {
    namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
    identitySchemaVersion: STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
    registryScope: "candidate",
    track: "accommodation-types-and-unit",
    claimId: "CLM-ACC-001",
    claimVersion: null,
  };
}

function claimRegistry(
  input: QualifiedClaimOverlayBuildInputV3,
  path: "data/claim_registry.json" | "data/candidate_claim_registry.json"
): { claims: Array<Record<string, unknown>>; status: string } {
  return input.records[path] as {
    claims: Array<Record<string, unknown>>;
    status: string;
  };
}

function relationshipRegistry(
  input: QualifiedClaimOverlayBuildInputV3
): { constructs: Array<{ constructId: string; memberClaimRefs: string[] }> } {
  return input.records["data/claim_relationship_registry.json"] as {
    constructs: Array<{ constructId: string; memberClaimRefs: string[] }>;
  };
}

function assertOverlayBlocked(result: QualifiedClaimOverlayBuildResultV3): void {
  assert.equal(result.status, "blocked");
  assert.equal(result.overlay, null);
  assert.equal(result.resolver, null);
  assert.ok(result.issues.length > 0);
}

function assertLoaderBlocked(
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
    [
      result.goldenIncrement,
      result.adversarialIncrement,
      result.counterfactualIncrement,
      result.humanJudgmentIncrement,
      result.expertJudgmentIncrement,
      result.aiJudgmentIncrement,
    ],
    [0, 0, 0, 0, 0, 0]
  );
}

async function loadValidRegistry(
  style: "posix" | "windows" = "posix"
): Promise<StayOptiDecisionScienceRegistryLoadResultV3> {
  return loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => createImportInput(style)
  );
}

test("qualified identity constants freeze separate identity and canonical JSON domains", () => {
  assert.equal(STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3, "stayopti.dsl.claim");
  assert.equal(STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3, 1);
  assert.equal(
    STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_VERSION_V3,
    "stayopti.dsl.canonical-json@1"
  );
  assert.equal(STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3, "1.1.0");
});

test("core and candidate CLM-ACC-001 serialize to different qualified keys", () => {
  const core = serializeQualifiedClaimIdentityV3(validCoreIdentity());
  const candidate = serializeQualifiedClaimIdentityV3(validCandidateIdentity());
  assert.equal(core.status, "ready");
  assert.equal(candidate.status, "ready");
  assert.equal(
    core.qualifiedKey,
    "stayopti.dsl.claim@1|core-appraised|_|CLM-ACC-001|v1"
  );
  assert.equal(
    candidate.qualifiedKey,
    "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv"
  );
  assert.notEqual(core.qualifiedKey, candidate.qualifiedKey);
});

for (const [name, identity] of [
  ["core", validCoreIdentity()],
  ["candidate", validCandidateIdentity()],
] as const) {
  test(`parser/serializer round-trip is byte-exact for ${name}`, () => {
    const serialized = serializeQualifiedClaimIdentityV3(identity);
    assert.equal(serialized.status, "ready");
    const parsed = parseQualifiedClaimKeyV3(serialized.qualifiedKey);
    assert.equal(parsed.status, "ready");
    assert.equal(parsed.qualifiedKey, serialized.qualifiedKey);
    assert.deepEqual(parsed.identity, identity);
    assert.equal(Object.isFrozen(parsed.identity), true);
  });
}

const INVALID_KEY_CASES = [
  ["bare ID", "CLM-ACC-001"],
  ["lowercase ID", "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|clm-acc-001|nv"],
  ["trailing whitespace", "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv "],
  ["unicode namespace confusable", "stayopti.dsl.claіm@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv"],
  ["unicode claim confusable", "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-АCC-001|nv"],
  ["separator injection", "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC|001|nv"],
  ["wrong namespace", "stayopti.dsl.other@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv"],
  ["wrong identity version", "stayopti.dsl.claim@2|candidate|accommodation-types-and-unit|CLM-ACC-001|nv"],
  ["candidate invented version", "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-001|v1"],
  ["core missing version", "stayopti.dsl.claim@1|core-appraised|_|CLM-ACC-001|nv"],
  ["core track", "stayopti.dsl.claim@1|core-appraised|accommodation-types-and-unit|CLM-ACC-001|v1"],
  ["candidate missing track", "stayopti.dsl.claim@1|candidate|_|CLM-ACC-001|nv"],
  ["unknown track", "stayopti.dsl.claim@1|candidate|unknown-track|CLM-ACC-001|nv"],
] as const;

for (const [name, value] of INVALID_KEY_CASES) {
  test(`qualified parser blocks ${name} without fallback`, () => {
    const result = parseQualifiedClaimKeyV3(value);
    assert.equal(result.status, "blocked");
    assert.equal(result.identity, null);
    assert.equal(result.qualifiedKey, null);
  });
}

test("identity exact shape rejects extra, missing and inherited fields", () => {
  const extra = { ...validCoreIdentity(), unexpectedField: true };
  assert.equal(validateQualifiedClaimIdentityV3(extra).status, "blocked");

  const missing = { ...validCoreIdentity() } as Record<string, unknown>;
  Reflect.deleteProperty(missing, "claimId");
  assert.equal(validateQualifiedClaimIdentityV3(missing).status, "blocked");

  const inherited = Object.create({ claimId: "CLM-ACC-001" }) as Record<string, unknown>;
  Object.assign(inherited, validCoreIdentity());
  Reflect.deleteProperty(inherited, "claimId");
  assert.equal(validateQualifiedClaimIdentityV3(inherited).status, "blocked");
});

test("valid frozen and null-prototype identities remain accepted", () => {
  assert.equal(
    validateQualifiedClaimIdentityV3(Object.freeze(validCoreIdentity())).status,
    "ready"
  );
  const nullPrototype = Object.assign(
    Object.create(null) as Record<string, unknown>,
    validCandidateIdentity()
  );
  assert.equal(validateQualifiedClaimIdentityV3(nullPrototype).status, "ready");
});

test("identity accessors and Symbols block without invoking getters", () => {
  let getterCalls = 0;
  const accessor = validCoreIdentity() as unknown as Record<string, unknown>;
  Object.defineProperty(accessor, "unexpectedField", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return true;
    },
  });
  assert.equal(validateQualifiedClaimIdentityV3(accessor).status, "blocked");
  assert.equal(getterCalls, 0);

  const symbol = validCoreIdentity() as unknown as Record<string | symbol, unknown>;
  symbol[Symbol("hidden")] = true;
  assert.equal(validateQualifiedClaimIdentityV3(symbol).status, "blocked");
});

test("canonical JSON frozen vectors preserve byte-exact output", async () => {
  for (const vector of STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_TEST_VECTORS_V3) {
    const result = canonicalizeQualifiedClaimJsonV3(vector.input);
    assert.equal(result.status, "ready", vector.name);
    assert.equal(result.canonicalJson, vector.canonicalJson, vector.name);
    assert.match(await sha256QualifiedClaimTextV3(result.canonicalJson), /^sha256-[a-f0-9]{64}$/);
  }
});

test("canonical JSON does not normalize Unicode silently", () => {
  const composed = canonicalizeQualifiedClaimJsonV3({ value: "é" });
  const decomposed = canonicalizeQualifiedClaimJsonV3({ value: "e\u0301" });
  assert.equal(composed.status, "ready");
  assert.equal(decomposed.status, "ready");
  assert.notEqual(composed.canonicalJson, decomposed.canonicalJson);
});

const INVALID_CANONICAL_VALUES: Array<{
  name: string;
  create: () => unknown;
  getterCalls?: () => number;
}> = [
  { name: "undefined", create: () => ({ value: undefined }) },
  { name: "function", create: () => ({ value: () => true }) },
  { name: "BigInt", create: () => ({ value: BigInt(1) }) },
  { name: "NaN", create: () => ({ value: Number.NaN }) },
  { name: "Infinity", create: () => ({ value: Number.POSITIVE_INFINITY }) },
  { name: "negative zero", create: () => ({ value: -0 }) },
  {
    name: "non-enumerable field",
    create: () => {
      const value = { visible: true };
      Object.defineProperty(value, "hidden", { enumerable: false, value: 1 });
      return value;
    },
  },
  {
    name: "Symbol field",
    create: () => {
      const value: Record<string | symbol, unknown> = { visible: true };
      value[Symbol("hidden")] = 1;
      return value;
    },
  },
  {
    name: "sparse array",
    create: () => {
      const value = new Array<unknown>(2);
      value[1] = true;
      return value;
    },
  },
  {
    name: "array extra key",
    create: () => Object.assign([1], { unexpectedField: true }),
  },
  {
    name: "array Symbol",
    create: () => {
      const value = [1] as unknown as unknown[] & Record<string | symbol, unknown>;
      value[Symbol("hidden")] = true;
      return value;
    },
  },
  {
    name: "non-enumerable array index",
    create: () => {
      const value = [1];
      Object.defineProperty(value, "0", { enumerable: false, value: 1 });
      return value;
    },
  },
];

for (const invalid of INVALID_CANONICAL_VALUES) {
  test(`canonical JSON blocks ${invalid.name}`, () => {
    const result = canonicalizeQualifiedClaimJsonV3(invalid.create());
    assert.equal(result.status, "blocked");
    assert.equal(result.canonicalJson, null);
  });
}

test("canonical JSON getter and setter descriptors never execute", () => {
  let getterCalls = 0;
  let setterCalls = 0;
  const objectValue: Record<string, unknown> = {};
  Object.defineProperty(objectValue, "value", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return 1;
    },
    set: () => {
      setterCalls += 1;
    },
  });
  assert.equal(canonicalizeQualifiedClaimJsonV3(objectValue).status, "blocked");

  const arrayValue = [1];
  Object.defineProperty(arrayValue, "0", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return 1;
    },
  });
  assert.equal(canonicalizeQualifiedClaimJsonV3(arrayValue).status, "blocked");
  assert.equal(getterCalls, 0);
  assert.equal(setterCalls, 0);
});

test("valid registry-only load exposes 150 frozen bindings and 198 qualified references", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  const overlay = result.registry?.qualifiedClaimIdentityOverlay;
  assert.ok(overlay);
  assert.equal(overlay.overlaySchemaVersion, STAYOPTI_QUALIFIED_CLAIM_OVERLAY_SCHEMA_VERSION_V3);
  assert.equal(overlay.overlayFingerprintSha256, STAYOPTI_QUALIFIED_CLAIM_OVERLAY_FINGERPRINT_V3);
  assert.equal(overlay.rankingInfluence, "none");
  assert.deepEqual(overlay.counts, {
    totalClaims: 150,
    coreClaims: 5,
    candidateClaims: 145,
    qualifiedKeys: 150,
    relationshipBindings: 198,
    distinctReferencedCandidateClaims: 119,
    candidateClaimsWithoutConstruct: 26,
    qualifiedKeyCollisions: 0,
  });
  assert.equal(overlay.claimBindings.length, 150);
  assert.equal(overlay.relationshipBindings.length, 198);
  assert.equal(new Set(overlay.claimBindings.map(({ qualifiedKey }) => qualifiedKey)).size, 150);
  assert.equal(Object.isFrozen(overlay), true);
  assert.equal(Object.isFrozen(overlay.claimBindings), true);
  assert.equal(Object.isFrozen(overlay.claimBindings[0]), true);
  assert.equal(Object.isFrozen(overlay.claimBindings[0].identity), true);
  assert.equal(Object.isFrozen(overlay.relationshipBindings), true);
  assert.equal(Object.isFrozen(result.registry?.qualifiedClaimResolver), true);
});

test("the two CLM-ACC-001 bindings coexist with separate release identities", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  const matches = result.registry?.qualifiedClaimIdentityOverlay.claimBindings.filter(
    (binding) => binding.identity.claimId === "CLM-ACC-001"
  ) ?? [];
  assert.equal(matches.length, 2);
  assert.deepEqual(
    matches.map(({ qualifiedKey }) => qualifiedKey).sort(),
    [
      "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv",
      "stayopti.dsl.claim@1|core-appraised|_|CLM-ACC-001|v1",
    ]
  );
  assert.notEqual(matches[0].recordDigestSha256, matches[1].recordDigestSha256);
  assert.equal(matches.find(({ identity }) => identity.registryScope === "core-appraised")?.identity.track, null);
});

test("all relationship refs resolve candidate-only and both collision uses bind candidate ACC", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  const relationships = result.registry?.qualifiedClaimIdentityOverlay.relationshipBindings ?? [];
  const collisionUses = relationships.filter(
    ({ bareClaimRef }) => bareClaimRef === "CLM-ACC-001"
  );
  assert.equal(collisionUses.length, 2);
  assert.deepEqual(
    collisionUses.map(({ constructId }) => constructId).sort(),
    ["CST-ACCOMMODATION-PRODUCT-001", "CST-CATEGORY-001"]
  );
  for (const binding of relationships) {
    assert.match(binding.qualifiedKey, /^stayopti\.dsl\.claim@1\|candidate\|/);
  }
  for (const binding of collisionUses) {
    assert.equal(
      binding.qualifiedKey,
      "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv"
    );
  }
});

test("exact resolver resolves qualified keys and blocks bare, unknown or mismatched identities", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  const resolver = result.registry?.qualifiedClaimResolver;
  assert.ok(resolver);
  const candidateKey =
    "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-001|nv";
  const resolved = resolver.resolve(candidateKey);
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.binding?.qualifiedKey, candidateKey);

  for (const invalid of [
    "CLM-ACC-001",
    "stayopti.dsl.claim@1|candidate|hospitality-guest-experience|CLM-ACC-001|nv",
    "stayopti.dsl.claim@1|candidate|accommodation-types-and-unit|CLM-ACC-999|nv",
    "stayopti.dsl.claim@1|core-appraised|_|CLM-ACC-999|v1",
  ]) {
    const blocked = resolver.resolve(invalid);
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.binding, null);
  }
});

function containsMutableMapOrSet(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (value instanceof Map || value instanceof Set) {
    return true;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && "value" in descriptor) {
      if (containsMutableMapOrSet(descriptor.value, seen)) {
        return true;
      }
    }
  }
  return false;
}

test("overlay exposes no Map/Set and mutation attempts change no value", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  const overlay = result.registry?.qualifiedClaimIdentityOverlay;
  assert.ok(overlay);
  const firstKey = overlay.claimBindings[0].qualifiedKey;
  assert.equal(containsMutableMapOrSet(overlay), false);
  assert.equal(
    Reflect.set(overlay.claimBindings[0], "qualifiedKey", "mutated"),
    false
  );
  assert.equal(overlay.claimBindings[0].qualifiedKey, firstKey);

  const frozenMap = Object.freeze(new Map<string, string>());
  frozenMap.set("proof", "Object.freeze does not seal Map entries");
  assert.equal(frozenMap.size, 1);
});

test("overlay contains identity and provenance only, not decision fields", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  const serialized = JSON.stringify(result.registry?.qualifiedClaimIdentityOverlay);
  for (const forbidden of [
    '"score"',
    '"weight"',
    '"winner"',
    '"recommendationRole"',
    '"numericContribution"',
    '"trace"',
    '"commission"',
    '"providerPriority"',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("raw registry records remain opaque and receive no identity fields", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  const candidate = result.registry?.records[
    "data/candidate_claim_registry.json"
  ] as { claims: Array<Record<string, unknown>> };
  assert.equal(Object.hasOwn(candidate.claims[0], "qualifiedKey"), false);
  assert.equal(Object.hasOwn(candidate.claims[0], "identity"), false);
  assert.equal(Object.hasOwn(candidate.claims[0], "version"), false);
});

test("claim record permutation preserves overlay order and fingerprint", async () => {
  const baseline = await buildQualifiedClaimIdentityOverlayV3(createOverlayInput());
  const permuted = cloneOverlayInput();
  claimRegistry(permuted, "data/claim_registry.json").claims.reverse();
  claimRegistry(permuted, "data/candidate_claim_registry.json").claims.reverse();
  const result = await buildQualifiedClaimIdentityOverlayV3(permuted);
  assert.equal(baseline.status, "ready", JSON.stringify(baseline.issues));
  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  assert.equal(
    result.overlay?.overlayFingerprintSha256,
    baseline.overlay?.overlayFingerprintSha256
  );
  assert.deepEqual(
    result.overlay?.claimBindings.map(({ qualifiedKey }) => qualifiedKey),
    baseline.overlay?.claimBindings.map(({ qualifiedKey }) => qualifiedKey)
  );
});

const STALE_RECORD_CASES: Array<{
  name: string;
  mutate(input: QualifiedClaimOverlayBuildInputV3): void;
}> = [
  {
    name: "candidate explicit version null",
    mutate: (input) => {
      claimRegistry(input, "data/candidate_claim_registry.json").claims[0].version = null;
    },
  },
  {
    name: "candidate invented version one",
    mutate: (input) => {
      claimRegistry(input, "data/candidate_claim_registry.json").claims[0].version = 1;
    },
  },
  {
    name: "core missing version",
    mutate: (input) => {
      Reflect.deleteProperty(
        claimRegistry(input, "data/claim_registry.json").claims[0],
        "version"
      );
    },
  },
  {
    name: "core status mutation",
    mutate: (input) => {
      claimRegistry(input, "data/claim_registry.json").claims[0].status = "candidate";
    },
  },
  {
    name: "candidate status promotion",
    mutate: (input) => {
      claimRegistry(input, "data/candidate_claim_registry.json").claims[0].status = "appraised";
    },
  },
  {
    name: "candidate unknown track",
    mutate: (input) => {
      claimRegistry(input, "data/candidate_claim_registry.json").claims[0].track = "unknown-track";
    },
  },
  {
    name: "candidate known but mismatched track",
    mutate: (input) => {
      claimRegistry(input, "data/candidate_claim_registry.json").claims[0].track = "hospitality-guest-experience";
    },
  },
  {
    name: "candidate alias mutation",
    mutate: (input) => {
      claimRegistry(input, "data/candidate_claim_registry.json").claims[0].claimAlias = "changed-alias";
    },
  },
  {
    name: "core proposition mutation",
    mutate: (input) => {
      claimRegistry(input, "data/claim_registry.json").claims[0].proposition = "changed proposition";
    },
  },
];

for (const stale of STALE_RECORD_CASES) {
  test(`stale or invalid overlay blocks atomically: ${stale.name}`, async () => {
    const input = cloneOverlayInput();
    stale.mutate(input);
    let result: QualifiedClaimOverlayBuildResultV3 | undefined;
    await assert.doesNotReject(async () => {
      result = await buildQualifiedClaimIdentityOverlayV3(input);
    });
    assert.ok(result);
    assertOverlayBlocked(result);
  });
}

test("alias mutation preserves logical key but changes canonical record digest", async () => {
  const input = createOverlayInput();
  const candidate = claimRegistry(
    input,
    "data/candidate_claim_registry.json"
  ).claims[0];
  const identity = serializeQualifiedClaimIdentityV3({
    namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
    identitySchemaVersion: 1,
    registryScope: "candidate",
    track: candidate.track as QualifiedClaimIdentityV3["track"],
    claimId: candidate.claimId as string,
    claimVersion: null,
  });
  const before = canonicalizeQualifiedClaimJsonV3(candidate);
  candidate.claimAlias = "changed-alias";
  const after = canonicalizeQualifiedClaimJsonV3(candidate);
  assert.equal(identity.status, "ready");
  assert.equal(before.status, "ready");
  assert.equal(after.status, "ready");
  assert.notEqual(
    await sha256QualifiedClaimTextV3(before.canonicalJson),
    await sha256QualifiedClaimTextV3(after.canonicalJson)
  );
  assert.equal(
    identity.qualifiedKey,
    serializeQualifiedClaimIdentityV3(identity.identity).qualifiedKey
  );
});

test("source asset digest mutation makes the frozen overlay stale", async () => {
  const input = cloneOverlayInput();
  const asset = input.manifestAssets.find(
    ({ path }) => path === "data/candidate_claim_registry.json"
  );
  assert.ok(asset);
  asset.sha256 = "0".repeat(64);
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(input));
});

test("unknown registry, unknown role and manifest backslash block the entire overlay", async () => {
  const unknownRegistry = cloneOverlayInput();
  unknownRegistry.records["data/new_claim_registry.json"] = { claims: [] };
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(unknownRegistry));

  const unknownRole = cloneOverlayInput();
  unknownRole.manifestAssets[0].role = "new-registry-role";
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(unknownRole));

  const backslash = cloneOverlayInput();
  backslash.manifestAssets[0].path = backslash.manifestAssets[0].path.replace(/\//g, "\\");
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(backslash));
});

test("zero-match and multi-match candidate relationship resolution block", async () => {
  const zeroMatch = cloneOverlayInput();
  relationshipRegistry(zeroMatch).constructs[0].memberClaimRefs[0] = "CLM-BEH-999";
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(zeroMatch));

  const multiMatch = cloneOverlayInput();
  const candidates = claimRegistry(
    multiMatch,
    "data/candidate_claim_registry.json"
  ).claims;
  const original = candidates[0];
  candidates[1].claimId = original.claimId;
  candidates[1].track = original.track;
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(multiMatch));
});

test("overlay descriptor firewall blocks accessors without invocation", async () => {
  const input = cloneOverlayInput();
  const claim = claimRegistry(
    input,
    "data/candidate_claim_registry.json"
  ).claims[0];
  let getterCalls = 0;
  Object.defineProperty(claim, "claimId", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return "CLM-ACC-001";
    },
  });
  let result: QualifiedClaimOverlayBuildResultV3 | undefined;
  await assert.doesNotReject(async () => {
    result = await buildQualifiedClaimIdentityOverlayV3(input);
  });
  assert.ok(result);
  assertOverlayBlocked(result);
  assert.equal(getterCalls, 0);
});

test("overlay descriptor firewall blocks Symbol, sparse and accessor arrays", async () => {
  const symbolInput = cloneOverlayInput();
  const symbolClaims = claimRegistry(
    symbolInput,
    "data/candidate_claim_registry.json"
  ).claims as unknown[] & Record<string | symbol, unknown>;
  symbolClaims[Symbol("hidden")] = true;
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(symbolInput));

  const sparseInput = cloneOverlayInput();
  Reflect.deleteProperty(
    claimRegistry(sparseInput, "data/candidate_claim_registry.json").claims,
    "0"
  );
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(sparseInput));

  const accessorInput = cloneOverlayInput();
  const claims = claimRegistry(
    accessorInput,
    "data/candidate_claim_registry.json"
  ).claims;
  let getterCalls = 0;
  Object.defineProperty(claims, "0", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return {};
    },
  });
  assertOverlayBlocked(await buildQualifiedClaimIdentityOverlayV3(accessorInput));
  assert.equal(getterCalls, 0);
});

test("normal frozen overlay input remains valid", async () => {
  const input = deepFreezeQualifiedClaimValueV3(createOverlayInput());
  const result = await buildQualifiedClaimIdentityOverlayV3(input);
  assert.equal(result.status, "ready", JSON.stringify(result.issues));
});

test("runtime asset paths normalize Windows/POSIX while frozen manifest stays POSIX", async () => {
  const posix = await loadValidRegistry("posix");
  const windows = await loadValidRegistry("windows");
  assert.equal(posix.status, "ready", JSON.stringify(posix.issues));
  assert.equal(windows.status, "ready", JSON.stringify(windows.issues));
  assert.equal(
    posix.registry?.qualifiedClaimIdentityOverlay.overlayFingerprintSha256,
    windows.registry?.qualifiedClaimIdentityOverlay.overlayFingerprintSha256
  );
  const alteredManifest = createImportInput();
  const parsed = JSON.parse(alteredManifest.importManifest) as TestImportManifest;
  parsed.assets[0].path = parsed.assets[0].path.replace(/\//g, "\\");
  alteredManifest.importManifest = JSON.stringify(parsed);
  assertLoaderBlocked(await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => alteredManifest
  ));
});

for (const invalidPath of [
  "../data/claim_registry.json",
  "/data/claim_registry.json",
  "C:\\data\\claim_registry.json",
  "data//claim_registry.json",
]) {
  test(`unsafe runtime asset path blocks: ${invalidPath}`, async () => {
    const input = createImportInput();
    input.assets[0].path = invalidPath;
    assertLoaderBlocked(await loadDecisionScienceRegistryOnlyV3(
      "registry-only",
      async () => input
    ));
  });
}

test("path-equivalent duplicate runtime assets block", async () => {
  const input = createImportInput();
  input.assets.push({
    ...input.assets[0],
    path: input.assets[0].path.replace(/\//g, "\\"),
  });
  assertLoaderBlocked(await loadDecisionScienceRegistryOnlyV3(
    "registry-only",
    async () => input
  ));
});

test("OFF does not invoke importer or construct an overlay", async () => {
  let importerCalls = 0;
  const result = await loadDecisionScienceRegistryOnlyV3("off", async () => {
    importerCalls += 1;
    return createImportInput();
  });
  assert.equal(importerCalls, 0);
  assert.equal(result.status, "off");
  assert.equal(result.registry, null);
});

test("overlay or asset failure remains fail-closed with zero increments", async () => {
  const input = createImportInput();
  input.assets[0].content += " ";
  let result: StayOptiDecisionScienceRegistryLoadResultV3 | undefined;
  await assert.doesNotReject(async () => {
    result = await loadDecisionScienceRegistryOnlyV3(
      "registry-only",
      async () => input
    );
  });
  assert.ok(result);
  assertLoaderBlocked(result);
});

test("registry-only integration exposes no typed edge, contribution or trace", async () => {
  const result = await loadValidRegistry();
  assert.equal(result.status, "ready");
  assert.equal(result.traceEnabled, false);
  assert.equal(result.registry?.traceAttached, false);
  assert.equal(result.registry?.candidateRecordsCanInfluenceDecision, false);
  assert.equal(result.registry?.rankingInfluence, "none");
  assert.equal(result.rankingInfluence, "none");
});

test("primary runtime fingerprint equals the independently frozen receipt value", async () => {
  const result = await buildQualifiedClaimIdentityOverlayV3(createOverlayInput());
  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  assert.equal(
    result.overlay?.overlayFingerprintSha256,
    "sha256-43d6b3b0fe6477fc6e2fe20531df5678a98098461bb7327381aace301f0614fe"
  );
});
