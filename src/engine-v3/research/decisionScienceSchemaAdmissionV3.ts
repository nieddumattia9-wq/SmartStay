import {
  canonicalizeQualifiedClaimJsonV3,
  deepFreezeQualifiedClaimValueV3,
  sha256QualifiedClaimTextV3,
} from "./qualifiedClaimIdentityV3";

import {
  DECISION_SCIENCE_SCHEMA_IDS_V3,
  validateDecisionScienceSchemaSemanticsV3,
  type DecisionScienceSchemaSemanticIssueV3,
} from "./decisionScienceSchemaSemanticV3";

import {
  STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3,
  STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3,
  deepFreezeDecisionScienceSchemaValueV3,
  inspectDecisionScienceSchemaJsonTextV3,
  maxDecisionScienceSchemaPayloadBytesV3,
  parseAndCloneDecisionScienceSchemaJsonV3,
  structuralCloneDecisionScienceSchemaValueV3,
  type DecisionScienceSchemaStructuralIssueV3,
} from "./decisionScienceSchemaStructuralV3";

import {
  createNodeDecisionScienceSchemaWorkerV3,
  type DecisionScienceSchemaWorkerAssetV3,
  type DecisionScienceSchemaWorkerFactoryV3,
  type DecisionScienceSchemaWorkerMessageV3,
  type DecisionScienceSchemaWorkerRequestV3,
} from "./decisionScienceSchemaWorkerV3";

export const STAYOPTI_SCHEMA_ADMISSION_NAMESPACE_V3 =
  "stayopti.dsl.schema-admission@1" as const;

export const STAYOPTI_SCHEMA_ADMISSION_LIBRARY_RELEASE_V3 =
  "1.1.0" as const;

export const STAYOPTI_SCHEMA_ADMISSION_DRAFT_URI_V3 =
  "https://json-schema.org/draft/2020-12/schema" as const;

export const STAYOPTI_SCHEMA_ADMISSION_AJV_VERSION_V3 =
  "8.20.0" as const;

export const STAYOPTI_SCHEMA_ADMISSION_AJV_FORMATS_VERSION_V3 =
  "3.0.1" as const;

export const STAYOPTI_SCHEMA_ADMISSION_SOURCE_ARCHIVE_SHA256_V3 =
  "d0bd932106d6784a1a0245a5ddb71cbb6b9fa643aa201cca51afe171906dae99" as const;

export const STAYOPTI_SCHEMA_ADMISSION_PACKAGE_FINGERPRINT_V3 =
  "sha256-aaa3e1b20345751ac435100e8a7d6ba025c950779e2888d5698bbd65b2b56907" as const;

export const STAYOPTI_SCHEMA_ADMISSION_BUNDLE_FINGERPRINT_V3 =
  "sha256-7569a00ac0d5671c6c48ea32b63d330541baf9da3048959eb50235bb92a215fc" as const;

export const STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3 =
  deepFreezeQualifiedClaimValueV3({
    strict: true,
    strictSchema: true,
    strictNumbers: true,
    validateSchema: true,
    validateFormats: true,
    allErrors: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
    $data: false,
    ownProperties: true,
    messages: false,
    verbose: false,
    logger: false,
    formatMode: "full",
    formats: ["date", "date-time"],
    formatKeywords: false,
    customKeywords: false,
    compileAsync: false,
    loadSchema: false,
    remoteResolution: false,
  } as const);

export const STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_FINGERPRINT_V3 =
  "sha256-d1e8da20371ffac9318822774924d7224577a6ec3a06eae0f1e4d93357da40df" as const;

export const STAYOPTI_SCHEMA_ADMISSION_WATCHDOGS_V3 = Object.freeze({
  compileTargetMs: 500,
  compileHardMs: 5_000,
  validationTargetMs: 100,
  validationHardMs: 1_000,
} as const);

export interface DecisionScienceSchemaTextAssetV3 {
  path: string;
  content: string;
}

export interface DecisionScienceSchemaImportInputV3 {
  manifestText: string;
  assets: DecisionScienceSchemaTextAssetV3[];
}

export type DecisionScienceSchemaImporterV3 = () => Promise<unknown>;

export interface DecisionScienceSchemaAdmissionIssueV3 {
  code: string;
  schemaId: string;
  instancePath: string;
  schemaPath: string;
  keyword: string;
}

export interface DecisionScienceSchemaAdmissionReceiptV3 {
  admissionNamespace: typeof STAYOPTI_SCHEMA_ADMISSION_NAMESPACE_V3;
  libraryRelease: typeof STAYOPTI_SCHEMA_ADMISSION_LIBRARY_RELEASE_V3;
  bundleFingerprintSha256: string;
  runtimeOptionsFingerprintSha256: string;
  resourceProfileVersion: typeof STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3;
  schemaId: string;
  schemaDigestSha256: string;
  payloadDigestSha256: string;
  semanticState: "consistent" | "indeterminate";
  issueCodes: readonly string[];
  compileDurationMs: number;
  validationDurationMs: number;
  decisionUse: "forbidden";
  rankingInfluence: "none";
}

export type DecisionScienceSchemaAdmissionResultV3 =
  | {
      status: "admitted";
      semanticState: "consistent" | "indeterminate";
      receipt: Readonly<DecisionScienceSchemaAdmissionReceiptV3>;
      payload: Readonly<unknown>;
      issues: readonly DecisionScienceSchemaAdmissionIssueV3[];
      decisionUse: "forbidden";
      rankingInfluence: "none";
    }
  | {
      status: "blocked";
      semanticState: null;
      receipt: null;
      payload: null;
      issues: readonly DecisionScienceSchemaAdmissionIssueV3[];
      decisionUse: "forbidden";
      rankingInfluence: "none";
    };

export interface DecisionScienceSchemaAdmissionServiceV3 {
  mode: "registry-only";
  schemaCount: 4;
  metaSchemaValidCount: 4;
  formatAssertionValid: true;
  bundleFingerprintSha256: string;
  runtimeOptionsFingerprintSha256: string;
  resourceProfileVersion: typeof STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3;
  rankingInfluence: "none";
  decisionUse: "forbidden";
  compileDurationMs: number;
  admit(
    schemaId: string,
    payloadJsonText: unknown
  ): Promise<DecisionScienceSchemaAdmissionResultV3>;
}

export interface DecisionScienceSchemaBundleLoadResultV3 {
  requestedMode: unknown;
  resolvedMode: "off" | "registry-only";
  status: "off" | "ready" | "blocked";
  service: Readonly<DecisionScienceSchemaAdmissionServiceV3> | null;
  issues: readonly DecisionScienceSchemaAdmissionIssueV3[];
  decisionUse: "forbidden";
  rankingInfluence: "none";
  decisionCoreChanged: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  traceEnabled: false;
  goldenIncrement: 0;
  adversarialIncrement: 0;
  counterfactualIncrement: 0;
  humanJudgmentIncrement: 0;
  expertJudgmentIncrement: 0;
  aiJudgmentIncrement: 0;
}

export interface DecisionScienceSchemaLoadOptionsV3 {
  mode?: unknown;
  importer?: DecisionScienceSchemaImporterV3;
  workerFactory?: DecisionScienceSchemaWorkerFactoryV3;
  compileHardMs?: number;
  validationHardMs?: number;
}

interface ValidatedSchemaBundleV3 {
  manifest: Readonly<Record<string, unknown>>;
  assets: readonly DecisionScienceSchemaWorkerAssetV3[];
  bundleFingerprintSha256: string;
  runtimeOptionsFingerprintSha256: string;
}

interface WorkerRunReadyV3 {
  status: "ready";
  compileDurationMs: number;
  validationDurationMs: number;
  payload: unknown;
  issues: readonly DecisionScienceSchemaAdmissionIssueV3[];
}

type WorkerRunResultV3 =
  | WorkerRunReadyV3
  | { status: "blocked"; issues: readonly DecisionScienceSchemaAdmissionIssueV3[] };

const IMPORT_KEYS = ["manifestText", "assets"] as const;
const RUNTIME_ASSET_KEYS = ["path", "content"] as const;
const MANIFEST_KEYS = [
  "admissionNamespace",
  "schemaVersion",
  "libraryRelease",
  "sourceArchive",
  "packageFingerprint",
  "runtime",
  "mode",
  "schemas",
  "bundleFingerprintSha256",
] as const;
const SOURCE_ARCHIVE_KEYS = ["fileName", "sha256"] as const;
const RUNTIME_KEYS = [
  "ajvVersion",
  "ajvFormatsVersion",
  "options",
  "runtimeOptionsFingerprintSha256",
  "resourceProfileVersion",
] as const;
const MODE_KEYS = [
  "maximum",
  "rankingInfluence",
  "publicImportAllowed",
  "traceAllowed",
  "decisionImportAllowed",
] as const;
const SCHEMA_KEYS = [
  "path",
  "bytes",
  "sha256",
  "schemaId",
  "draftUri",
] as const;

const EXPECTED_SCHEMAS = deepFreezeQualifiedClaimValueV3([
  {
    path: "schemas/accommodation_offer_identity.schema.json",
    bytes: 4_021,
    sha256: "413e41e0d5b5e42ebc908b24c886bee236849b8227a37efd03b7c1591e4f49cc",
    schemaId: DECISION_SCIENCE_SCHEMA_IDS_V3.identity,
    draftUri: STAYOPTI_SCHEMA_ADMISSION_DRAFT_URI_V3,
  },
  {
    path: "schemas/shared_space_map.schema.json",
    bytes: 1_622,
    sha256: "6f6cd95fd47249d2205be7731b164a973bd90746f4321da950e390ad22822812",
    schemaId: DECISION_SCIENCE_SCHEMA_IDS_V3.shared,
    draftUri: STAYOPTI_SCHEMA_ADMISSION_DRAFT_URI_V3,
  },
  {
    path: "schemas/local_market_night_snapshot.schema.json",
    bytes: 3_438,
    sha256: "278d0fb43d26770b4ff94fe8152f6f1d393e41fcfda1a3ae0d1fcfa1751df90e",
    schemaId: DECISION_SCIENCE_SCHEMA_IDS_V3.snapshot,
    draftUri: STAYOPTI_SCHEMA_ADMISSION_DRAFT_URI_V3,
  },
  {
    path: "schemas/market_dataset_legal_ledger.schema.json",
    bytes: 2_087,
    sha256: "d3f4392eb150c9b638e66e93fdc648eec4be3cbff315cf58f1e6d85c6693b513",
    schemaId: DECISION_SCIENCE_SCHEMA_IDS_V3.legal,
    draftUri: STAYOPTI_SCHEMA_ADMISSION_DRAFT_URI_V3,
  },
] as const);

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortIssues(
  issues: DecisionScienceSchemaAdmissionIssueV3[]
): DecisionScienceSchemaAdmissionIssueV3[] {
  return issues.sort(
    (left, right) =>
      compareOrdinal(left.schemaId, right.schemaId) ||
      compareOrdinal(left.instancePath, right.instancePath) ||
      compareOrdinal(left.schemaPath, right.schemaPath) ||
      compareOrdinal(left.keyword, right.keyword) ||
      compareOrdinal(left.code, right.code)
  );
}

function capIssues(
  issues: readonly DecisionScienceSchemaAdmissionIssueV3[]
): DecisionScienceSchemaAdmissionIssueV3[] {
  const limit = STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxIssues;
  const withoutMarker = issues.filter(
    (entry) => entry.code !== "SCH_ERROR_LIMIT_REACHED"
  );
  const wasTruncated = issues.length > limit || withoutMarker.length !== issues.length;
  const sorted = sortIssues(withoutMarker);
  if (!wasTruncated && sorted.length <= limit) {
    return sorted;
  }
  return [
    ...sorted.slice(0, limit - 1),
    issue("SCH_ERROR_LIMIT_REACHED", "", "", "", "error-limit"),
  ];
}

function issue(
  code: string,
  schemaId = "",
  instancePath = "",
  schemaPath = "",
  keyword = "admission"
): DecisionScienceSchemaAdmissionIssueV3 {
  return { code, schemaId, instancePath, schemaPath, keyword };
}

function structuralIssues(
  entries: readonly DecisionScienceSchemaStructuralIssueV3[],
  schemaId = ""
): DecisionScienceSchemaAdmissionIssueV3[] {
  return entries.map((entry) =>
    issue(entry.code, schemaId, entry.path, "", "structural")
  );
}

function semanticIssues(
  entries: readonly DecisionScienceSchemaSemanticIssueV3[]
): DecisionScienceSchemaAdmissionIssueV3[] {
  return entries.map((entry) => ({ ...entry }));
}

function exactKeys(
  value: unknown,
  allowed: readonly string[]
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    return false;
  }
  const keys = Reflect.ownKeys(value);
  return (
    keys.every((key) => typeof key === "string" && allowed.includes(key)) &&
    allowed.every((key) => Object.hasOwn(value, key)) &&
    keys.length === allowed.length
  );
}

function normalizeRuntimePath(path: string): string | null {
  const normalized = path.replace(/\\/gu, "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//u.test(normalized) ||
    normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return null;
  }
  return normalized;
}

async function sha256RawText(text: string): Promise<string> {
  return (await sha256QualifiedClaimTextV3(text)).slice("sha256-".length);
}

async function fingerprintValue(value: unknown): Promise<string | null> {
  const canonical = canonicalizeQualifiedClaimJsonV3(value);
  if (canonical.status !== "ready") {
    return null;
  }
  return sha256QualifiedClaimTextV3(canonical.canonicalJson);
}

function baseLoadResult(
  requestedMode: unknown,
  resolvedMode: "off" | "registry-only",
  status: "off" | "ready" | "blocked",
  service: Readonly<DecisionScienceSchemaAdmissionServiceV3> | null,
  issues: readonly DecisionScienceSchemaAdmissionIssueV3[]
): DecisionScienceSchemaBundleLoadResultV3 {
  return deepFreezeQualifiedClaimValueV3({
    requestedMode,
    resolvedMode,
    status,
    service,
    issues,
    decisionUse: "forbidden" as const,
    rankingInfluence: "none" as const,
    decisionCoreChanged: false as const,
    publicV2Changed: false as const,
    publicV3Enabled: false as const,
    splitEnabled: false as const,
    traceEnabled: false as const,
    goldenIncrement: 0 as const,
    adversarialIncrement: 0 as const,
    counterfactualIncrement: 0 as const,
    humanJudgmentIncrement: 0 as const,
    expertJudgmentIncrement: 0 as const,
    aiJudgmentIncrement: 0 as const,
  });
}

function blockedAdmission(
  issues: readonly DecisionScienceSchemaAdmissionIssueV3[]
): DecisionScienceSchemaAdmissionResultV3 {
  return deepFreezeQualifiedClaimValueV3({
    status: "blocked" as const,
    semanticState: null,
    receipt: null,
    payload: null,
    issues: capIssues(issues),
    decisionUse: "forbidden" as const,
    rankingInfluence: "none" as const,
  });
}

async function validateBundleInput(
  input: unknown
): Promise<
  | { status: "ready"; bundle: ValidatedSchemaBundleV3 }
  | { status: "blocked"; issues: readonly DecisionScienceSchemaAdmissionIssueV3[] }
> {
  const structural = structuralCloneDecisionScienceSchemaValueV3(input);
  if (structural.status !== "ready" || !exactKeys(structural.value, IMPORT_KEYS)) {
    return {
      status: "blocked",
      issues: structural.status === "blocked"
        ? structuralIssues(structural.issues)
        : [issue("SCH_IMPORT_SHAPE_INVALID")],
    };
  }
  const importInput = structural.value;
  if (
    typeof importInput.manifestText !== "string" ||
    !Array.isArray(importInput.assets)
  ) {
    return { status: "blocked", issues: [issue("SCH_IMPORT_SHAPE_INVALID")] };
  }
  const manifestResult = parseAndCloneDecisionScienceSchemaJsonV3(
    importInput.manifestText
  );
  if (
    manifestResult.status !== "ready" ||
    !exactKeys(manifestResult.value, MANIFEST_KEYS)
  ) {
    return {
      status: "blocked",
      issues: manifestResult.status === "blocked"
        ? structuralIssues(manifestResult.issues)
        : [issue("SCH_MANIFEST_SHAPE_INVALID")],
    };
  }
  const manifest = manifestResult.value;
  const sourceArchive = manifest.sourceArchive;
  const runtime = manifest.runtime;
  const mode = manifest.mode;
  const schemas = manifest.schemas;
  if (
    manifest.admissionNamespace !== STAYOPTI_SCHEMA_ADMISSION_NAMESPACE_V3 ||
    manifest.schemaVersion !== "1.0.0" ||
    manifest.libraryRelease !== STAYOPTI_SCHEMA_ADMISSION_LIBRARY_RELEASE_V3 ||
    manifest.packageFingerprint !== STAYOPTI_SCHEMA_ADMISSION_PACKAGE_FINGERPRINT_V3 ||
    !exactKeys(sourceArchive, SOURCE_ARCHIVE_KEYS) ||
    sourceArchive.fileName !== "StayOpti_Decision_Science_Library_v1.1_2026-08-17.zip" ||
    sourceArchive.sha256 !== STAYOPTI_SCHEMA_ADMISSION_SOURCE_ARCHIVE_SHA256_V3 ||
    !exactKeys(runtime, RUNTIME_KEYS) ||
    runtime.ajvVersion !== STAYOPTI_SCHEMA_ADMISSION_AJV_VERSION_V3 ||
    runtime.ajvFormatsVersion !== STAYOPTI_SCHEMA_ADMISSION_AJV_FORMATS_VERSION_V3 ||
    runtime.resourceProfileVersion !== STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3 ||
    !exactKeys(mode, MODE_KEYS) ||
    mode.maximum !== "registry-only" ||
    mode.rankingInfluence !== "none" ||
    mode.publicImportAllowed !== false ||
    mode.traceAllowed !== false ||
    mode.decisionImportAllowed !== false ||
    !Array.isArray(schemas) ||
    schemas.length !== 4
  ) {
    return { status: "blocked", issues: [issue("SCH_MANIFEST_CONTRACT_INVALID")] };
  }
  const optionsFingerprint = await fingerprintValue(
    STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3
  );
  if (
    optionsFingerprint === null ||
    runtime.runtimeOptionsFingerprintSha256 !== optionsFingerprint ||
    runtime.runtimeOptionsFingerprintSha256 !==
      STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_FINGERPRINT_V3 ||
    JSON.stringify(runtime.options) !==
      JSON.stringify(STAYOPTI_SCHEMA_ADMISSION_RUNTIME_OPTIONS_V3)
  ) {
    return { status: "blocked", issues: [issue("SCH_RUNTIME_OPTIONS_STALE")] };
  }
  const fingerprintPayload = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(manifest)) {
    if (typeof key === "string" && key !== "bundleFingerprintSha256") {
      fingerprintPayload[key] = manifest[key];
    }
  }
  const bundleFingerprint = await fingerprintValue(fingerprintPayload);
  if (
    bundleFingerprint === null ||
    manifest.bundleFingerprintSha256 !== bundleFingerprint ||
    bundleFingerprint !== STAYOPTI_SCHEMA_ADMISSION_BUNDLE_FINGERPRINT_V3
  ) {
    return { status: "blocked", issues: [issue("SCH_MANIFEST_FINGERPRINT_STALE")] };
  }
  const manifestSchemas: Array<Record<string, unknown>> = [];
  for (let index = 0; index < schemas.length; index += 1) {
    const entry = schemas[index];
    if (!exactKeys(entry, SCHEMA_KEYS)) {
      return { status: "blocked", issues: [issue("SCH_MANIFEST_SCHEMA_INVALID")] };
    }
    const expected = EXPECTED_SCHEMAS[index];
    if (
      entry.path !== expected.path ||
      typeof entry.path !== "string" ||
      entry.path.includes("\\") ||
      entry.bytes !== expected.bytes ||
      entry.sha256 !== expected.sha256 ||
      entry.schemaId !== expected.schemaId ||
      entry.draftUri !== expected.draftUri
    ) {
      return { status: "blocked", issues: [issue("SCH_MANIFEST_SCHEMA_STALE")] };
    }
    manifestSchemas.push(entry);
  }
  if (importInput.assets.length !== 4) {
    return { status: "blocked", issues: [issue("SCH_BUNDLE_ASSET_SET_INVALID")] };
  }
  const runtimeAssets = new Map<string, string>();
  for (const rawAsset of importInput.assets) {
    if (!exactKeys(rawAsset, RUNTIME_ASSET_KEYS)) {
      return { status: "blocked", issues: [issue("SCH_RUNTIME_ASSET_INVALID")] };
    }
    if (typeof rawAsset.path !== "string" || typeof rawAsset.content !== "string") {
      return { status: "blocked", issues: [issue("SCH_RUNTIME_ASSET_INVALID")] };
    }
    const path = normalizeRuntimePath(rawAsset.path);
    if (path === null || runtimeAssets.has(path)) {
      return { status: "blocked", issues: [issue("SCH_RUNTIME_ASSET_PATH_INVALID")] };
    }
    runtimeAssets.set(path, rawAsset.content);
  }
  const workerAssets: DecisionScienceSchemaWorkerAssetV3[] = [];
  for (let index = 0; index < manifestSchemas.length; index += 1) {
    const schema = manifestSchemas[index];
    const path = schema.path as string;
    const content = runtimeAssets.get(path);
    if (content === undefined) {
      return { status: "blocked", issues: [issue("SCH_BUNDLE_ASSET_MISSING")] };
    }
    const bytes = new TextEncoder().encode(content).byteLength;
    const digest = await sha256RawText(content);
    const parsed = parseAndCloneDecisionScienceSchemaJsonV3(content, bytes);
    const parsedSchema =
      parsed.status === "ready" &&
      parsed.value !== null &&
      typeof parsed.value === "object" &&
      !Array.isArray(parsed.value)
        ? parsed.value as Record<string, unknown>
        : null;
    if (
      bytes !== schema.bytes ||
      digest !== schema.sha256 ||
      parsedSchema === null ||
      parsedSchema.$schema !== schema.draftUri ||
      parsedSchema.$id !== schema.schemaId
    ) {
      return { status: "blocked", issues: [issue("SCH_BUNDLE_DIGEST_OR_SCHEMA_MISMATCH")] };
    }
    workerAssets.push({
      path,
      bytes,
      sha256: digest,
      schemaId: schema.schemaId as string,
      draftUri: schema.draftUri as string,
      content,
    });
  }
  return {
    status: "ready",
    bundle: {
      manifest: deepFreezeDecisionScienceSchemaValueV3(manifest),
      assets: deepFreezeDecisionScienceSchemaValueV3(workerAssets),
      bundleFingerprintSha256: bundleFingerprint,
      runtimeOptionsFingerprintSha256: optionsFingerprint,
    },
  };
}

function runWorker(
  request: DecisionScienceSchemaWorkerRequestV3,
  factory: DecisionScienceSchemaWorkerFactoryV3,
  compileHardMs: number,
  validationHardMs: number
): Promise<WorkerRunResultV3> {
  return new Promise((resolve) => {
    let worker: ReturnType<DecisionScienceSchemaWorkerFactoryV3>;
    let settled = false;
    let compiled = false;
    let compileDurationMs = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (
      result: WorkerRunResultV3,
      terminate = true
    ): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      if (terminate) {
        void worker.terminate().catch(() => undefined).finally(() => resolve(result));
      } else {
        resolve(result);
      }
    };

    try {
      worker = factory(request);
      timer = setTimeout(
        () =>
          finish({
            status: "blocked",
            issues: [issue("SCH_WORKER_COMPILE_TIMEOUT")],
          }),
        compileHardMs
      );
      worker.on("message", (message: DecisionScienceSchemaWorkerMessageV3) => {
        if (message.type === "compiled") {
          compiled = true;
          compileDurationMs = message.compileDurationMs;
          if (
            message.schemaCount !== 4 ||
            message.metaSchemaValidCount !== 4 ||
            message.formatAssertionValid !== true
          ) {
            finish({ status: "blocked", issues: [issue("SCH_WORKER_COMPILE_INCOMPLETE")] });
            return;
          }
          if (timer !== undefined) clearTimeout(timer);
          timer = setTimeout(
            () =>
              finish({
                status: "blocked",
                issues: [issue("SCH_WORKER_VALIDATION_TIMEOUT", request.schemaId ?? "")],
              }),
            validationHardMs
          );
          return;
        }
        if (message.type === "blocked") {
          finish({ status: "blocked", issues: [issue(message.code, request.schemaId ?? "")] });
          return;
        }
        if (!compiled) {
          finish({ status: "blocked", issues: [issue("SCH_WORKER_PROTOCOL_INVALID")] });
          return;
        }
        finish({
          status: "ready",
          compileDurationMs,
          validationDurationMs: message.validationDurationMs,
          payload: message.payload,
          issues: message.issues.map((entry) => ({ ...entry })),
        });
      });
      worker.on("error", () =>
        finish({ status: "blocked", issues: [issue("SCH_WORKER_ERROR")] })
      );
      worker.on("exit", (code) => {
        if (!settled) {
          finish(
            {
              status: "blocked",
              issues: [issue(code === 0 ? "SCH_WORKER_EARLY_EXIT" : "SCH_WORKER_NONZERO_EXIT")],
            },
            false
          );
        }
      });
    } catch {
      resolve({ status: "blocked", issues: [issue("SCH_WORKER_START_FAILED")] });
    }
  });
}

async function admitPayload(
  bundle: ValidatedSchemaBundleV3,
  schemaId: string,
  payloadJsonText: unknown,
  factory: DecisionScienceSchemaWorkerFactoryV3,
  compileHardMs: number,
  validationHardMs: number
): Promise<DecisionScienceSchemaAdmissionResultV3> {
  try {
    const schemaAsset = bundle.assets.find((asset) => asset.schemaId === schemaId);
    if (schemaAsset === undefined) {
      return blockedAdmission([issue("SCH_SCHEMA_ID_UNKNOWN", schemaId)]);
    }
    const textBoundary = inspectDecisionScienceSchemaJsonTextV3(
      payloadJsonText,
      maxDecisionScienceSchemaPayloadBytesV3(schemaId)
    );
    if (textBoundary.status !== "ready") {
      return blockedAdmission(structuralIssues(textBoundary.issues, schemaId));
    }
    const workerResult = await runWorker(
      {
        operation: "validate",
        assets: bundle.assets,
        schemaId,
        payloadText: textBoundary.text,
      },
      factory,
      compileHardMs,
      validationHardMs
    );
    if (workerResult.status !== "ready") {
      return blockedAdmission(workerResult.issues);
    }
    if (workerResult.issues.length > 0 || workerResult.payload === null) {
      return blockedAdmission(workerResult.issues);
    }
    const resourceCheck = structuralCloneDecisionScienceSchemaValueV3(
      workerResult.payload,
      textBoundary.bytes
    );
    if (resourceCheck.status !== "ready") {
      return blockedAdmission(structuralIssues(resourceCheck.issues, schemaId));
    }
    if (
      resourceCheck.value === null ||
      typeof resourceCheck.value !== "object" ||
      Array.isArray(resourceCheck.value)
    ) {
      return blockedAdmission([issue("SCH_SCHEMA_ROOT_INVALID", schemaId)]);
    }
    const semantic = validateDecisionScienceSchemaSemanticsV3(
      schemaId,
      resourceCheck.value as Readonly<Record<string, unknown>>
    );
    const semIssues = semanticIssues(semantic.issues);
    if (semantic.status === "blocked") {
      return blockedAdmission(semIssues);
    }
    const canonical = canonicalizeQualifiedClaimJsonV3(resourceCheck.value);
    if (canonical.status !== "ready") {
      return blockedAdmission([issue("SCH_PAYLOAD_CANONICALIZATION_FAILED", schemaId)]);
    }
    const payloadDigestSha256 = await sha256QualifiedClaimTextV3(
      canonical.canonicalJson
    );
    const payload = deepFreezeDecisionScienceSchemaValueV3(resourceCheck.value);
    const receipt = deepFreezeQualifiedClaimValueV3({
      admissionNamespace: STAYOPTI_SCHEMA_ADMISSION_NAMESPACE_V3,
      libraryRelease: STAYOPTI_SCHEMA_ADMISSION_LIBRARY_RELEASE_V3,
      bundleFingerprintSha256: bundle.bundleFingerprintSha256,
      runtimeOptionsFingerprintSha256: bundle.runtimeOptionsFingerprintSha256,
      resourceProfileVersion: STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3,
      schemaId,
      schemaDigestSha256: `sha256-${schemaAsset.sha256}`,
      payloadDigestSha256,
      semanticState: semantic.status,
      issueCodes: semIssues.map((entry) => entry.code),
      compileDurationMs: workerResult.compileDurationMs,
      validationDurationMs: workerResult.validationDurationMs,
      decisionUse: "forbidden" as const,
      rankingInfluence: "none" as const,
    });
    return deepFreezeQualifiedClaimValueV3({
      status: "admitted" as const,
      semanticState: semantic.status,
      receipt,
      payload,
      issues: sortIssues(semIssues),
      decisionUse: "forbidden" as const,
      rankingInfluence: "none" as const,
    });
  } catch {
    return blockedAdmission([issue("SCH_INTERNAL_FAILURE", schemaId)]);
  }
}

export async function loadDecisionScienceSchemaAdmissionV3(
  options: DecisionScienceSchemaLoadOptionsV3 = {}
): Promise<DecisionScienceSchemaBundleLoadResultV3> {
  const requestedMode = options.mode;
  if (requestedMode === undefined || requestedMode === "off") {
    return baseLoadResult(requestedMode, "off", "off", null, Object.freeze([]));
  }
  if (requestedMode !== "registry-only" || typeof options.importer !== "function") {
    return baseLoadResult(
      requestedMode,
      "off",
      "blocked",
      null,
      Object.freeze([issue("SCH_MODE_OR_IMPORTER_INVALID")])
    );
  }
  try {
    const imported = await options.importer();
    const validated = await validateBundleInput(imported);
    if (validated.status !== "ready") {
      return baseLoadResult(
        requestedMode,
        "registry-only",
        "blocked",
        null,
        validated.issues
      );
    }
    const factory = options.workerFactory ?? createNodeDecisionScienceSchemaWorkerV3;
    const compileHardMs = options.compileHardMs ?? STAYOPTI_SCHEMA_ADMISSION_WATCHDOGS_V3.compileHardMs;
    const validationHardMs = options.validationHardMs ?? STAYOPTI_SCHEMA_ADMISSION_WATCHDOGS_V3.validationHardMs;
    const compileResult = await runWorker(
      {
        operation: "compile",
        assets: validated.bundle.assets,
        schemaId: null,
        payloadText: null,
      },
      factory,
      compileHardMs,
      validationHardMs
    );
    if (compileResult.status !== "ready") {
      return baseLoadResult(
        requestedMode,
        "registry-only",
        "blocked",
        null,
        compileResult.issues
      );
    }
    const service: DecisionScienceSchemaAdmissionServiceV3 = {
      mode: "registry-only",
      schemaCount: 4,
      metaSchemaValidCount: 4,
      formatAssertionValid: true,
      bundleFingerprintSha256: validated.bundle.bundleFingerprintSha256,
      runtimeOptionsFingerprintSha256:
        validated.bundle.runtimeOptionsFingerprintSha256,
      resourceProfileVersion: STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3,
      rankingInfluence: "none",
      decisionUse: "forbidden",
      compileDurationMs: compileResult.compileDurationMs,
      admit: (schemaId, payloadJsonText) =>
        admitPayload(
          validated.bundle,
          schemaId,
          payloadJsonText,
          factory,
          compileHardMs,
          validationHardMs
        ),
    };
    Object.freeze(service);
    return baseLoadResult(
      requestedMode,
      "registry-only",
      "ready",
      service,
      Object.freeze([])
    );
  } catch {
    return baseLoadResult(
      requestedMode,
      "registry-only",
      "blocked",
      null,
      Object.freeze([issue("SCH_INTERNAL_FAILURE")])
    );
  }
}
