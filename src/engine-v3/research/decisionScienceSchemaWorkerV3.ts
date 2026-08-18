export interface DecisionScienceSchemaWorkerAssetV3 {
  path: string;
  bytes: number;
  sha256: string;
  schemaId: string;
  draftUri: string;
  content: string;
}

export interface DecisionScienceSchemaWorkerRequestV3 {
  operation: "compile" | "validate";
  assets: readonly DecisionScienceSchemaWorkerAssetV3[];
  schemaId: string | null;
  payloadText: string | null;
}

export type DecisionScienceSchemaWorkerMessageV3 =
  | {
      type: "compiled";
      compileDurationMs: number;
      schemaCount: number;
      metaSchemaValidCount: number;
      formatAssertionValid: true;
    }
  | {
      type: "complete";
      validationDurationMs: number;
      payload: unknown;
      issues: ReadonlyArray<{
        code: string;
        schemaId: string;
        instancePath: string;
        schemaPath: string;
        keyword: string;
      }>;
    }
  | {
      type: "blocked";
      code: string;
      phase: "bundle" | "compile" | "structural" | "validation" | "internal";
    };

export interface DecisionScienceSchemaWorkerLikeV3 {
  on(
    event: "message",
    listener: (message: DecisionScienceSchemaWorkerMessageV3) => void
  ): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number) => void): this;
  terminate(): Promise<number>;
}

export type DecisionScienceSchemaWorkerFactoryV3 = (
  request: DecisionScienceSchemaWorkerRequestV3
) => DecisionScienceSchemaWorkerLikeV3;

interface NodeWorkerConstructorV3 {
  new (
    source: string,
    options: {
      eval: true;
      workerData: DecisionScienceSchemaWorkerRequestV3;
    }
  ): DecisionScienceSchemaWorkerLikeV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

function nodeWorkerConstructorV3(): NodeWorkerConstructorV3 {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const workerModule = runtimeProcess?.getBuiltinModule?.("node:worker_threads") as
    | { Worker?: NodeWorkerConstructorV3 }
    | undefined;
  if (typeof workerModule?.Worker !== "function") {
    throw new Error("Node worker_threads is unavailable");
  }
  return workerModule.Worker;
}

export const DECISION_SCIENCE_SCHEMA_WORKER_SOURCE_V3 = String.raw`
"use strict";
const { parentPort, workerData } = require("node:worker_threads");
const { createHash } = require("node:crypto");
const AjvModule = require("ajv/dist/2020.js");
const FormatsModule = require("ajv-formats");
const Ajv2020 = AjvModule.default || AjvModule;
const addFormats = FormatsModule.default || FormatsModule;
const DRAFT = "https://json-schema.org/draft/2020-12/schema";

function post(message) {
  if (parentPort) parentPort.postMessage(message);
}
function blocked(code, phase) {
  post({ type: "blocked", code, phase });
}
function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor", "affiliatecommission", "partnerrevenue", "conversionvalue", "takerate", "commission", "commissionamount", "markup", "providerpriority", "commercialpriority", "prebookid", "bookingid", "paymenttoken", "accesstoken", "refreshtoken", "apikey", "secret", "password", "credential", "credentials"]);
function structuralClone(value, active = new WeakSet(), state = { nodes: 0, properties: 0 }, path = "$", depth = 0) {
  state.nodes += 1;
  if (state.nodes > 8192) throw new Error("node-limit");
  if (depth > 16) throw new Error("depth-limit");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > 16384) throw new Error("string-limit");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("unsafe-number");
    return value;
  }
  if (typeof value !== "object") throw new Error("unsafe-value");
  if (active.has(value)) throw new Error("cycle");
  active.add(value);
  try {
    if (Array.isArray(value)) {
      let limit = 256;
      if (path.endsWith(".observations")) limit = 7;
      else if (path.endsWith(".identityProvenanceRefs") || path.endsWith(".provenanceRefs") || path.endsWith(".eventRefs")) limit = 128;
      else if (path.endsWith(".permittedPurposes")) limit = 64;
      if (value.length > limit) throw new Error("array-limit");
      const keys = Reflect.ownKeys(value);
      for (const key of keys) {
        if (typeof key === "symbol") throw new Error("symbol");
        if (key === "length") continue;
        if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) throw new Error("array-key");
      }
      const clone = [];
      for (let index = 0; index < value.length; index += 1) {
        const key = String(index);
        if (!Object.hasOwn(value, key)) throw new Error("sparse-array");
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set) throw new Error("array-descriptor");
        clone.push(structuralClone(descriptor.value, active, state, path + "[" + index + "]", depth + 1));
      }
      return clone;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error("prototype");
    const clone = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") throw new Error("symbol");
      state.properties += 1;
      if (state.properties > 2048) throw new Error("property-limit");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor) || descriptor.get || descriptor.set) throw new Error("descriptor");
      if (FORBIDDEN.has(key.toLowerCase())) throw new Error("forbidden-field");
      clone[key] = structuralClone(descriptor.value, active, state, path + "." + key, depth + 1);
    }
    return clone;
  } finally {
    active.delete(value);
  }
}
function issueCode(keyword) {
  return "SCH_SCHEMA_" + String(keyword).replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
}
function sortIssues(issues) {
  const compareOrdinal = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  return issues.sort((a, b) =>
    compareOrdinal(a.schemaId, b.schemaId) ||
    compareOrdinal(a.instancePath, b.instancePath) ||
    compareOrdinal(a.schemaPath, b.schemaPath) ||
    compareOrdinal(a.keyword, b.keyword) ||
    compareOrdinal(a.code, b.code)
  );
}
function containsForbiddenDataKeyword(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenDataKeyword);
  if (value === null || typeof value !== "object") return false;
  return Object.keys(value).some((key) =>
    key === "$data" || containsForbiddenDataKeyword(value[key])
  );
}

process.on("unhandledRejection", () => blocked("SCH_WORKER_REJECTION", "internal"));
process.on("uncaughtException", () => blocked("SCH_WORKER_EXCEPTION", "internal"));

(async () => {
  try {
    const compileStarted = performance.now();
    if (!workerData || !Array.isArray(workerData.assets) || workerData.assets.length !== 4) {
      blocked("SCH_BUNDLE_ASSET_SET_INVALID", "bundle");
      return;
    }
    if (require("ajv/package.json").version !== "8.20.0" || require("ajv-formats/package.json").version !== "3.0.1") {
      blocked("SCH_BUNDLE_DEPENDENCY_VERSION", "bundle");
      return;
    }
    const ajv = new Ajv2020({
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
    });
    addFormats(ajv, { mode: "full", formats: ["date", "date-time"], keywords: false });
    const validators = Object.create(null);
    const ids = new Set();
    let metaSchemaValidCount = 0;
    for (const asset of workerData.assets) {
      if (
        typeof asset.path !== "string" || asset.path.includes("\\") ||
        typeof asset.content !== "string" || Buffer.byteLength(asset.content, "utf8") !== asset.bytes ||
        sha256(asset.content) !== asset.sha256 || asset.draftUri !== DRAFT
      ) {
        blocked("SCH_BUNDLE_DIGEST_OR_PATH", "bundle");
        return;
      }
      let schema;
      try { schema = structuralClone(JSON.parse(asset.content)); }
      catch { blocked("SCH_BUNDLE_SCHEMA_STRUCTURAL", "bundle"); return; }
      if (containsForbiddenDataKeyword(schema)) {
        blocked("SCH_SCHEMA_DATA_KEYWORD_FORBIDDEN", "compile");
        return;
      }
      if (schema.$schema !== DRAFT || schema.$id !== asset.schemaId || ids.has(schema.$id)) {
        blocked("SCH_BUNDLE_SCHEMA_ID_OR_DRAFT", "bundle");
        return;
      }
      ids.add(schema.$id);
      if (ajv.validateSchema(schema) !== true) {
        blocked("SCH_META_SCHEMA_INVALID", "compile");
        return;
      }
      metaSchemaValidCount += 1;
      try { validators[schema.$id] = ajv.compile(schema); }
      catch { blocked("SCH_SCHEMA_COMPILE_FAILED", "compile"); return; }
    }
    let dateValidator;
    let dateTimeValidator;
    try {
      dateValidator = ajv.compile({ type: "string", format: "date" });
      dateTimeValidator = ajv.compile({ type: "string", format: "date-time" });
    } catch {
      blocked("SCH_FORMAT_ASSERTION_COMPILE", "compile");
      return;
    }
    const formatAssertionValid =
      dateValidator("2028-02-29") === true &&
      dateValidator("2026-02-30") === false &&
      dateTimeValidator("2026-08-18T12:00:00Z") === true &&
      dateTimeValidator("2026-08-18T12:00:00") === false;
    if (!formatAssertionValid) {
      blocked("SCH_FORMAT_ASSERTION_FAILED", "compile");
      return;
    }
    post({
      type: "compiled",
      compileDurationMs: performance.now() - compileStarted,
      schemaCount: ids.size,
      metaSchemaValidCount,
      formatAssertionValid: true,
    });
    if (workerData.operation === "compile") {
      post({ type: "complete", validationDurationMs: 0, payload: null, issues: [] });
      return;
    }
    const validator = validators[workerData.schemaId];
    if (typeof validator !== "function" || typeof workerData.payloadText !== "string") {
      blocked("SCH_SCHEMA_ID_UNKNOWN", "validation");
      return;
    }
    let payload;
    try { payload = structuralClone(JSON.parse(workerData.payloadText)); }
    catch { blocked("SCH_PAYLOAD_STRUCTURAL", "structural"); return; }
    const validationStarted = performance.now();
    const valid = validator(payload);
    const validationDurationMs = performance.now() - validationStarted;
    const errors = valid ? [] : (validator.errors || []);
    const issues = sortIssues(errors.slice(0, 49).map((error) => ({
      code: issueCode(error.keyword),
      schemaId: workerData.schemaId,
      instancePath: error.instancePath || "",
      schemaPath: error.schemaPath || "",
      keyword: error.keyword || "unknown",
    })));
    if (errors.length > 50) {
      issues.push({
        code: "SCH_ERROR_LIMIT_REACHED",
        schemaId: workerData.schemaId,
        instancePath: "",
        schemaPath: "",
        keyword: "error-limit",
      });
    }
    post({ type: "complete", validationDurationMs, payload: valid ? payload : null, issues });
  } catch {
    blocked("SCH_INTERNAL_FAILURE", "internal");
  }
})();
`;

export function createNodeDecisionScienceSchemaWorkerV3(
  request: DecisionScienceSchemaWorkerRequestV3
): DecisionScienceSchemaWorkerLikeV3 {
  const Worker = nodeWorkerConstructorV3();
  const options = {
    eval: true,
    workerData: request,
  } as const;
  return new Worker(DECISION_SCIENCE_SCHEMA_WORKER_SOURCE_V3, options);
}
