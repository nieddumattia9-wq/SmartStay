import assert from "node:assert/strict";
import {
  EventEmitter,
} from "node:events";
import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import test from "node:test";

import {
  STAYOPTI_SCHEMA_ADMISSION_AJV_FORMATS_VERSION_V3,
  STAYOPTI_SCHEMA_ADMISSION_AJV_VERSION_V3,
  STAYOPTI_SCHEMA_ADMISSION_BUNDLE_FINGERPRINT_V3,
  STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_FINGERPRINT_V3,
  STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3,
  loadDecisionScienceSchemaAdmissionV3,
  type DecisionScienceSchemaAdmissionResultV3,
  type DecisionScienceSchemaBundleLoadResultV3,
  type DecisionScienceSchemaImportInputV3,
} from "../../src/engine-v3/research/decisionScienceSchemaAdmissionV3";

import {
  DECISION_SCIENCE_SCHEMA_IDS_V3,
} from "../../src/engine-v3/research/decisionScienceSchemaSemanticV3";

import {
  loadDecisionScienceRegistrySchemaAdmissionV3,
} from "../../src/engine-v3/research/decisionScienceRegistrySchemaAdmissionV3";

import {
  STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3,
  inspectDecisionScienceSchemaJsonTextV3,
  structuralCloneDecisionScienceSchemaValueV3,
} from "../../src/engine-v3/research/decisionScienceSchemaStructuralV3";

import type {
  DecisionScienceSchemaWorkerFactoryV3,
  DecisionScienceSchemaWorkerMessageV3,
} from "../../src/engine-v3/research/decisionScienceSchemaWorkerV3";

const LIBRARY_ROOT = resolve(
  process.cwd(),
  "data/engine-v3/decision-science-library/v1.1"
);
const MANIFEST_PATH = resolve(
  LIBRARY_ROOT,
  "schemas/STAYOPTI_SCHEMA_ADMISSION_MANIFEST.json"
);
const CORPUS_PATH = resolve(
  process.cwd(),
  "tests/engine-v3/fixtures/v3-13b2b2-schema-admission-corpus-v1.json"
);
const REGISTRY_MANIFEST_PATH = resolve(LIBRARY_ROOT, "STAYOPTI_IMPORT_MANIFEST.json");

interface ManifestFixture {
  schemas: Array<{
    path: string;
  }>;
}

interface CorpusCase {
  id: string;
  schema: string;
  schemaId: string;
  kind: "positive" | "negative";
  expectedStage:
    | "admitted"
    | "schema-blocked"
    | "semantic-blocked"
    | "admitted-indeterminate";
  payload: unknown;
}

interface CorpusFixture {
  counts: {
    total: number;
    positiveAdmitted: number;
    schemaBlocked: number;
    semanticBlocked: number;
    admittedIndeterminate: number;
  };
  cases: CorpusCase[];
}

function readManifestText(): string {
  return readFileSync(MANIFEST_PATH, "utf8");
}

function createSchemaImportInput(
  style: "posix" | "windows" = "posix"
): DecisionScienceSchemaImportInputV3 {
  const manifestText = readManifestText();
  const manifest = JSON.parse(manifestText) as ManifestFixture;
  return {
    manifestText,
    assets: manifest.schemas.map(({ path }) => ({
      path: style === "windows" ? path.replace(/\//gu, "\\") : path,
      content: readFileSync(resolve(LIBRARY_ROOT, ...path.split("/")), "utf8"),
    })),
  };
}

function createRegistryImportInput(): {
  importManifest: string;
  assets: Array<{ path: string; content: string }>;
} {
  const importManifest = readFileSync(REGISTRY_MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(importManifest) as { assets: Array<{ path: string }> };
  return {
    importManifest,
    assets: manifest.assets.map(({ path }) => ({
      path,
      content: readFileSync(resolve(LIBRARY_ROOT, ...path.split("/")), "utf8"),
    })),
  };
}

async function loadRealBundle(
  style: "posix" | "windows" = "posix"
): Promise<DecisionScienceSchemaBundleLoadResultV3> {
  return loadDecisionScienceSchemaAdmissionV3({
    mode: "registry-only",
    importer: async () => createSchemaImportInput(style),
  });
}

function assertBlocked(result: DecisionScienceSchemaAdmissionResultV3): void {
  assert.equal(result.status, "blocked");
  assert.equal(result.payload, null);
  assert.equal(result.receipt, null);
  assert.equal(result.semanticState, null);
  assert.equal(result.decisionUse, "forbidden");
  assert.equal(result.rankingInfluence, "none");
}

function containsMutableMapOrSet(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (value instanceof Map || value instanceof Set) return true;
  return Reflect.ownKeys(value).some((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor
      ? containsMutableMapOrSet(descriptor.value, seen)
      : false;
  });
}

test("schema admission is default OFF and invokes neither importer nor worker", async () => {
  let importerCalls = 0;
  let workerCalls = 0;
  const result = await loadDecisionScienceSchemaAdmissionV3({
    importer: async () => {
      importerCalls += 1;
      return createSchemaImportInput();
    },
    workerFactory: (() => {
      workerCalls += 1;
      throw new Error("must not run");
    }) as DecisionScienceSchemaWorkerFactoryV3,
  });
  assert.equal(result.status, "off");
  assert.equal(result.service, null);
  assert.equal(importerCalls, 0);
  assert.equal(workerCalls, 0);
  assert.equal(result.rankingInfluence, "none");
  assert.equal(result.decisionUse, "forbidden");
});

test("the frozen four-schema bundle compiles all-or-nothing with assertive formats", async () => {
  const result = await loadRealBundle();
  assert.equal(result.status, "ready", JSON.stringify(result.issues));
  assert.equal(result.service?.schemaCount, 4);
  assert.equal(result.service?.metaSchemaValidCount, 4);
  assert.equal(result.service?.formatAssertionValid, true);
  assert.equal(
    result.service?.bundleFingerprintSha256,
    STAYOPTI_SCHEMA_ADMISSION_BUNDLE_FINGERPRINT_V3
  );
  assert.equal(
    result.service?.runtimeOptionsFingerprintSha256,
    STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_FINGERPRINT_V3
  );
  assert.equal(STAYOPTI_SCHEMA_ADMISSION_AJV_VERSION_V3, "8.20.0");
  assert.equal(STAYOPTI_SCHEMA_ADMISSION_AJV_FORMATS_VERSION_V3, "3.0.1");
  assert.equal(STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3.$data, false);
  assert.equal(STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3.compileAsync, false);
  assert.equal(STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3.loadSchema, false);
  assert.equal(STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3.remoteResolution, false);
});

test("all 149 B2B1 corpus cases execute under the real Draft 2020-12 admission", async (context) => {
  const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf8")) as CorpusFixture;
  assert.deepEqual(corpus.counts, {
    total: 149,
    positiveAdmitted: 74,
    schemaBlocked: 62,
    semanticBlocked: 8,
    admittedIndeterminate: 5,
  });
  const loaded = await loadRealBundle();
  assert.equal(loaded.status, "ready", JSON.stringify(loaded.issues));
  assert.ok(loaded.service);
  const observed = {
    positiveAdmitted: 0,
    schemaBlocked: 0,
    semanticBlocked: 0,
    admittedIndeterminate: 0,
  };
  for (const corpusCase of corpus.cases) {
    await context.test(corpusCase.id, async () => {
      const result = await loaded.service?.admit(
        corpusCase.schemaId,
        JSON.stringify(corpusCase.payload)
      );
      assert.ok(result);
      if (corpusCase.expectedStage === "admitted") {
        assert.equal(result.status, "admitted", JSON.stringify(result.issues));
        observed.positiveAdmitted += 1;
      } else if (corpusCase.expectedStage === "admitted-indeterminate") {
        assert.equal(result.status, "admitted", JSON.stringify(result.issues));
        assert.equal(result.semanticState, "indeterminate");
        assert.ok(result.issues.every(({ keyword }) => keyword === "semantic"));
        observed.admittedIndeterminate += 1;
      } else if (corpusCase.expectedStage === "semantic-blocked") {
        assertBlocked(result);
        assert.ok(result.issues.some(({ code }) => code.startsWith("SCH_SEM_")));
        observed.semanticBlocked += 1;
      } else {
        assertBlocked(result);
        assert.ok(result.issues.every(({ code }) => !code.startsWith("SCH_SEM_")));
        observed.schemaBlocked += 1;
      }
    });
  }
  assert.deepEqual(observed, {
    positiveAdmitted: 74,
    schemaBlocked: 62,
    semanticBlocked: 8,
    admittedIndeterminate: 5,
  });
});

test("admitted payload and receipt are deeply frozen and expose no Map or Set", async () => {
  const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf8")) as CorpusFixture;
  const sample = corpus.cases.find(({ id }) => id === "id-pos-minimum");
  assert.ok(sample);
  const loaded = await loadRealBundle();
  const result = await loaded.service?.admit(
    sample.schemaId,
    JSON.stringify(sample.payload)
  );
  assert.ok(result);
  assert.equal(result.status, "admitted");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.payload), true);
  assert.equal(Object.isFrozen(result.receipt), true);
  assert.equal(containsMutableMapOrSet(result), false);
  assert.throws(() => {
    (result.payload as Record<string, unknown>).schemaVersion = "mutated";
  });
});

test("runtime asset paths support Windows and POSIX while the frozen manifest remains POSIX-only", async () => {
  const posix = await loadRealBundle("posix");
  const windows = await loadRealBundle("windows");
  assert.equal(posix.status, "ready", JSON.stringify(posix.issues));
  assert.equal(windows.status, "ready", JSON.stringify(windows.issues));

  const alteredManifest = JSON.parse(readManifestText()) as Record<string, unknown>;
  const schemas = alteredManifest.schemas as Array<Record<string, unknown>>;
  schemas[0] = {
    ...schemas[0],
    path: String(schemas[0]?.path).replace(/\//gu, "\\"),
  };
  const altered = await loadDecisionScienceSchemaAdmissionV3({
    mode: "registry-only",
    importer: async () => ({
      ...createSchemaImportInput(),
      manifestText: JSON.stringify(alteredManifest),
    }),
  });
  assert.equal(altered.status, "blocked");
  assert.equal(altered.service, null);
});

for (const path of [
  "../schemas/accommodation_offer_identity.schema.json",
  "C:\\absolute\\schema.json",
  "/absolute/schema.json",
]) {
  test(`runtime asset path is fail-closed: ${path}`, async () => {
    const input = createSchemaImportInput();
    input.assets[0] = { ...input.assets[0]!, path };
    const result = await loadDecisionScienceSchemaAdmissionV3({
      mode: "registry-only",
      importer: async () => input,
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.service, null);
  });
}

test("duplicate, stale schema and stale manifest inputs expose no partial bundle", async () => {
  const duplicate = createSchemaImportInput();
  duplicate.assets[1] = { ...duplicate.assets[0]! };
  const staleSchema = createSchemaImportInput();
  staleSchema.assets[0] = {
    ...staleSchema.assets[0]!,
    content: `${staleSchema.assets[0]!.content}\n`,
  };
  const staleManifest = createSchemaImportInput();
  const parsed = JSON.parse(staleManifest.manifestText) as Record<string, unknown>;
  parsed.libraryRelease = "1.1.1";
  staleManifest.manifestText = JSON.stringify(parsed);
  for (const input of [duplicate, staleSchema, staleManifest]) {
    const result = await loadDecisionScienceSchemaAdmissionV3({
      mode: "registry-only",
      importer: async () => input,
    });
    assert.equal(result.status, "blocked");
    assert.equal(result.service, null);
    assert.equal(result.rankingInfluence, "none");
    assert.equal(result.decisionUse, "forbidden");
  }
});

test("import rejection and malformed importer results never escape as rejection", async () => {
  for (const importer of [
    async () => { throw new Error("controlled importer rejection"); },
    async () => null,
    async () => ({ manifestText: null, assets: [] }),
    async () => ({ manifestText: readManifestText(), assets: [null] }),
  ]) {
    let result: DecisionScienceSchemaBundleLoadResultV3 | undefined;
    await assert.doesNotReject(async () => {
      result = await loadDecisionScienceSchemaAdmissionV3({
        mode: "registry-only",
        importer,
      });
    });
    assert.equal(result?.status, "blocked");
    assert.equal(result?.service, null);
  }
});

test("primary admission accepts text only and never invokes object getters", async () => {
  const loaded = await loadRealBundle();
  assert.ok(loaded.service);
  let getterCalls = 0;
  const hostile = Object.defineProperty({}, "payload", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return "not reached";
    },
  });
  const result = await loaded.service.admit(
    DECISION_SCIENCE_SCHEMA_IDS_V3.identity,
    hostile
  );
  assertBlocked(result);
  assert.equal(getterCalls, 0);
});

test("descriptor firewall rejects 18 hostile/non-JSON shapes without invoking accessors", async (context) => {
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, "value", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return 1;
    },
  });
  const setter = Object.defineProperty({}, "value", {
    enumerable: true,
    set: () => {
      getterCalls += 1;
    },
  });
  const nonEnumerable = Object.defineProperty({}, "hidden", {
    value: true,
    enumerable: false,
  });
  const symbol = { [Symbol("hidden")]: true };
  const inherited = Object.create({ inherited: true }) as Record<string, unknown>;
  inherited.own = true;
  const sparse = new Array(2);
  sparse[1] = true;
  const accessorArray: unknown[] = [true];
  Object.defineProperty(accessorArray, "0", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      return true;
    },
  });
  const extraArray: unknown[] & { extra?: boolean } = [true];
  extraArray.extra = true;
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const hostileProxy = new Proxy({}, {
    getPrototypeOf: () => {
      throw new Error("hostile prototype trap");
    },
  });
  const cases: Array<[string, unknown]> = [
    ["undefined", undefined],
    ["function", () => undefined],
    ["bigint", BigInt(1)],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["negative zero", -0],
    ["getter", accessor],
    ["setter", setter],
    ["non-enumerable", nonEnumerable],
    ["symbol", symbol],
    ["inherited", inherited],
    ["sparse array", sparse],
    ["accessor array", accessorArray],
    ["extra array", extraArray],
    ["cycle", cycle],
    ["forbidden prototype key", JSON.parse('{"prototype":true}')],
    ["commercial field", { affiliateCommission: 1 }],
    ["hostile proxy", hostileProxy],
  ];
  for (const [name, value] of cases) {
    await context.test(name, () => {
      const result = structuralCloneDecisionScienceSchemaValueV3(value);
      assert.equal(result.status, "blocked");
    });
  }
  assert.equal(getterCalls, 0);
});

test("resource boundaries accept the exact limit and reject limit plus one", () => {
  const profile = STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3;
  assert.equal(
    inspectDecisionScienceSchemaJsonTextV3("x".repeat(profile.maxIdentityBytes), profile.maxIdentityBytes).status,
    "ready"
  );
  assert.equal(
    inspectDecisionScienceSchemaJsonTextV3("x".repeat(profile.maxIdentityBytes + 1), profile.maxIdentityBytes).status,
    "blocked"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3("x".repeat(profile.maxStringLength)).status,
    "ready"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3("x".repeat(profile.maxStringLength + 1)).status,
    "blocked"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ values: Array(profile.maxArrayItems).fill(null) }).status,
    "ready"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ values: Array(profile.maxArrayItems + 1).fill(null) }).status,
    "blocked"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ observations: Array(7).fill(null) }).status,
    "ready"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ observations: Array(8).fill(null) }).status,
    "blocked"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ permittedPurposes: Array(64).fill(null) }).status,
    "ready"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ permittedPurposes: Array(65).fill(null) }).status,
    "blocked"
  );
  for (const limit of [
    profile.maxIdentityBytes,
    profile.maxSharedMapBytes,
    profile.maxSnapshotBytes,
    profile.maxLegalLedgerBytes,
  ]) {
    assert.equal(inspectDecisionScienceSchemaJsonTextV3("x".repeat(limit), limit).status, "ready");
    assert.equal(inspectDecisionScienceSchemaJsonTextV3("x".repeat(limit + 1), limit).status, "blocked");
  }

  const nested = (depth: number): unknown => {
    let value: unknown = null;
    for (let index = 0; index < depth; index += 1) value = { child: value };
    return value;
  };
  assert.equal(structuralCloneDecisionScienceSchemaValueV3(nested(profile.maxDepth)).status, "ready");
  assert.equal(structuralCloneDecisionScienceSchemaValueV3(nested(profile.maxDepth + 1)).status, "blocked");

  const propertiesAtLimit = Object.fromEntries(
    Array.from({ length: profile.maxProperties }, (_, index) => [`p${index}`, null])
  );
  const propertiesOverLimit = { ...propertiesAtLimit, overflow: null };
  assert.equal(structuralCloneDecisionScienceSchemaValueV3(propertiesAtLimit).status, "ready");
  assert.equal(structuralCloneDecisionScienceSchemaValueV3(propertiesOverLimit).status, "blocked");

  const nodesAtLimit = Object.fromEntries(
    Array.from({ length: profile.maxProperties }, (_, index) => [
      `n${index}`,
      Array(index === profile.maxProperties - 1 ? 2 : 3).fill(null),
    ])
  );
  const nodesOverLimit = {
    ...nodesAtLimit,
    [`n${profile.maxProperties - 1}`]: Array(3).fill(null),
  };
  assert.equal(structuralCloneDecisionScienceSchemaValueV3(nodesAtLimit).status, "ready");
  assert.equal(structuralCloneDecisionScienceSchemaValueV3(nodesOverLimit).status, "blocked");

  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ provenanceRefs: Array(128).fill(null) }).status,
    "ready"
  );
  assert.equal(
    structuralCloneDecisionScienceSchemaValueV3({ provenanceRefs: Array(129).fill(null) }).status,
    "blocked"
  );
});

class ControlledWorker extends EventEmitter {
  terminateCalls = 0;

  override on(
    event: "message" | "error" | "exit",
    listener: ((message: DecisionScienceSchemaWorkerMessageV3) => void) |
      ((error: Error) => void) |
      ((code: number) => void)
  ): this {
    return super.on(event, listener);
  }

  async terminate(): Promise<number> {
    this.terminateCalls += 1;
    return 0;
  }
}

test("compile watchdog terminates a controlled worker and exposes no partial service", async () => {
  const worker = new ControlledWorker();
  const result = await loadDecisionScienceSchemaAdmissionV3({
    mode: "registry-only",
    importer: async () => createSchemaImportInput(),
    workerFactory: (() => worker) as DecisionScienceSchemaWorkerFactoryV3,
    compileHardMs: 5,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.service, null);
  assert.equal(worker.terminateCalls, 1);
  assert.ok(result.issues.some(({ code }) => code === "SCH_WORKER_COMPILE_TIMEOUT"));
});

test("worker nonzero exit is contained without rejection or partial service", async () => {
  const worker = new ControlledWorker();
  queueMicrotask(() => worker.emit("exit", 2));
  let result: DecisionScienceSchemaBundleLoadResultV3 | undefined;
  await assert.doesNotReject(async () => {
    result = await loadDecisionScienceSchemaAdmissionV3({
      mode: "registry-only",
      importer: async () => createSchemaImportInput(),
      workerFactory: (() => worker) as DecisionScienceSchemaWorkerFactoryV3,
    });
  });
  assert.equal(result?.status, "blocked");
  assert.equal(result?.service, null);
});

test("validation watchdog terminates a controlled worker after successful compilation", async () => {
  const workers: ControlledWorker[] = [];
  const factory: DecisionScienceSchemaWorkerFactoryV3 = (request) => {
    const worker = new ControlledWorker();
    workers.push(worker);
    queueMicrotask(() => {
      worker.emit("message", {
        type: "compiled",
        compileDurationMs: 1,
        schemaCount: 4,
        metaSchemaValidCount: 4,
        formatAssertionValid: true,
      } satisfies DecisionScienceSchemaWorkerMessageV3);
      if (request.operation === "compile") {
        worker.emit("message", {
          type: "complete",
          validationDurationMs: 0,
          payload: null,
          issues: [],
        } satisfies DecisionScienceSchemaWorkerMessageV3);
      }
    });
    return worker;
  };
  const loaded = await loadDecisionScienceSchemaAdmissionV3({
    mode: "registry-only",
    importer: async () => createSchemaImportInput(),
    workerFactory: factory,
    validationHardMs: 5,
  });
  assert.equal(loaded.status, "ready");
  const result = await loaded.service?.admit(
    DECISION_SCIENCE_SCHEMA_IDS_V3.identity,
    JSON.stringify({ schemaVersion: "1.1.0" })
  );
  assert.ok(result);
  assertBlocked(result);
  assert.ok(result.issues.some(({ code }) => code === "SCH_WORKER_VALIDATION_TIMEOUT"));
  assert.equal(workers.length, 2);
  assert.deepEqual(workers.map(({ terminateCalls }) => terminateCalls), [1, 1]);
});

test("registry plus schema composition is all-or-nothing and fail-closed", async () => {
  const off = await loadDecisionScienceRegistrySchemaAdmissionV3({
    registryImporter: async () => createRegistryImportInput(),
    schemaImporter: async () => createSchemaImportInput(),
  });
  assert.equal(off.status, "off");
  assert.equal(off.value, null);

  const schemaFailure = await loadDecisionScienceRegistrySchemaAdmissionV3({
    mode: "registry-only",
    registryImporter: async () => createRegistryImportInput(),
    schemaImporter: async () => {
      throw new Error("controlled schema importer failure");
    },
  });
  assert.equal(schemaFailure.status, "blocked");
  assert.equal(schemaFailure.value, null);
  assert.equal(schemaFailure.rankingInfluence, "none");
  assert.equal(schemaFailure.decisionUse, "forbidden");

  const registryFailure = await loadDecisionScienceRegistrySchemaAdmissionV3({
    mode: "registry-only",
    registryImporter: async () => null,
    schemaImporter: async () => createSchemaImportInput(),
  });
  assert.equal(registryFailure.status, "blocked");
  assert.equal(registryFailure.value, null);
});

test("issue output is deterministically ordered, redacted and capped", async () => {
  const loaded = await loadRealBundle();
  const result = await loaded.service?.admit(
    DECISION_SCIENCE_SCHEMA_IDS_V3.identity,
    JSON.stringify({ secretValue: "must-not-appear" })
  );
  assert.ok(result);
  assertBlocked(result);
  assert.ok(result.issues.length <= 50);
  const serialized = JSON.stringify(result.issues);
  assert.doesNotMatch(serialized, /must-not-appear/u);
  assert.doesNotMatch(serialized, /secretValue/u);
  const sorted = [...result.issues].sort((left, right) =>
    left.schemaId.localeCompare(right.schemaId) ||
    left.instancePath.localeCompare(right.instancePath) ||
    left.schemaPath.localeCompare(right.schemaPath) ||
    left.keyword.localeCompare(right.keyword) ||
    left.code.localeCompare(right.code)
  );
  assert.deepEqual(result.issues, sorted);

  const overflowing = Object.fromEntries(
    Array.from({ length: 64 }, (_, index) => [`unexpected${index}`, true])
  );
  const capped = await loaded.service?.admit(
    DECISION_SCIENCE_SCHEMA_IDS_V3.identity,
    JSON.stringify(overflowing)
  );
  assert.ok(capped);
  assertBlocked(capped);
  assert.equal(capped.issues.length, STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxIssues);
  assert.equal(capped.issues.at(-1)?.code, "SCH_ERROR_LIMIT_REACHED");
});
