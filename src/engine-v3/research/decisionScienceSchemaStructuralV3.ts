export const STAYOPTI_SCHEMA_RESOURCE_PROFILE_VERSION_V3 =
  "stayopti.dsl.schema-admission.resources@1" as const;

export const STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3 = Object.freeze({
  maxPayloadBytes: 262_144,
  maxDepth: 16,
  maxNodes: 8_192,
  maxProperties: 2_048,
  maxStringLength: 16_384,
  maxArrayItems: 256,
  maxUniqueItems: 128,
  maxIssues: 50,
  maxIdentityBytes: 65_536,
  maxSharedMapBytes: 131_072,
  maxSnapshotBytes: 65_536,
  maxLegalLedgerBytes: 131_072,
  maxSharedSpaceObservations: 7,
  maxProvenanceOrEventRefs: 128,
  maxPermittedPurposes: 64,
} as const);

export type DecisionScienceSchemaStructuralIssueCodeV3 =
  | "SCH_INPUT_NOT_TEXT"
  | "SCH_PAYLOAD_BYTES_EXCEEDED"
  | "SCH_JSON_PARSE_FAILED"
  | "SCH_VALUE_NOT_JSON_SAFE"
  | "SCH_OBJECT_PROTOTYPE_INVALID"
  | "SCH_PROPERTY_DESCRIPTOR_INVALID"
  | "SCH_INHERITED_PROPERTY"
  | "SCH_SYMBOL_PROPERTY"
  | "SCH_ARRAY_INVALID"
  | "SCH_DEPTH_EXCEEDED"
  | "SCH_NODE_LIMIT_EXCEEDED"
  | "SCH_PROPERTY_LIMIT_EXCEEDED"
  | "SCH_STRING_LIMIT_EXCEEDED"
  | "SCH_ARRAY_LIMIT_EXCEEDED"
  | "SCH_REFERENCE_LIMIT_EXCEEDED"
  | "SCH_SHARED_SPACE_LIMIT_EXCEEDED"
  | "SCH_PERMITTED_PURPOSE_LIMIT_EXCEEDED"
  | "SCH_CYCLE_DETECTED"
  | "SCH_FORBIDDEN_FIELD"
  | "SCH_ERROR_LIMIT_REACHED"
  | "SCH_INTERNAL_FAILURE";

export interface DecisionScienceSchemaStructuralIssueV3 {
  code: DecisionScienceSchemaStructuralIssueCodeV3;
  path: string;
}

export type DecisionScienceSchemaStructuralResultV3 =
  | {
      status: "ready";
      value: unknown;
      bytes: number;
      nodes: number;
      properties: number;
      issues: readonly [];
    }
  | {
      status: "blocked";
      value: null;
      bytes: number;
      nodes: number;
      properties: number;
      issues: readonly DecisionScienceSchemaStructuralIssueV3[];
    };

const FORBIDDEN_FIELDS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "affiliatecommission",
  "partnerrevenue",
  "conversionvalue",
  "takerate",
  "commission",
  "commissionamount",
  "markup",
  "providerpriority",
  "commercialpriority",
  "prebookid",
  "bookingid",
  "paymenttoken",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "secret",
  "password",
  "credential",
  "credentials",
]);

const CANONICAL_ARRAY_INDEX = /^(0|[1-9][0-9]*)$/u;

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortIssues(
  issues: DecisionScienceSchemaStructuralIssueV3[]
): DecisionScienceSchemaStructuralIssueV3[] {
  return issues.sort(
    (left, right) =>
      compareOrdinal(left.path, right.path) ||
      compareOrdinal(left.code, right.code)
  );
}

function isCanonicalArrayIndex(key: string, length: number): boolean {
  if (!CANONICAL_ARRAY_INDEX.test(key)) {
    return false;
  }
  const numeric = Number(key);
  return (
    Number.isSafeInteger(numeric) &&
    numeric >= 0 &&
    numeric < length &&
    String(numeric) === key
  );
}

function arrayLimitForPath(path: string): number {
  if (path.endsWith(".observations")) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxSharedSpaceObservations;
  }
  if (
    path.endsWith(".identityProvenanceRefs") ||
    path.endsWith(".provenanceRefs") ||
    path.endsWith(".eventRefs")
  ) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxProvenanceOrEventRefs;
  }
  if (path.endsWith(".permittedPurposes")) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxPermittedPurposes;
  }
  return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxArrayItems;
}

function arrayLimitIssueForPath(
  path: string
): DecisionScienceSchemaStructuralIssueCodeV3 {
  if (path.endsWith(".observations")) {
    return "SCH_SHARED_SPACE_LIMIT_EXCEEDED";
  }
  if (
    path.endsWith(".identityProvenanceRefs") ||
    path.endsWith(".provenanceRefs") ||
    path.endsWith(".eventRefs")
  ) {
    return "SCH_REFERENCE_LIMIT_EXCEEDED";
  }
  if (path.endsWith(".permittedPurposes")) {
    return "SCH_PERMITTED_PURPOSE_LIMIT_EXCEEDED";
  }
  return "SCH_ARRAY_LIMIT_EXCEEDED";
}

export function maxDecisionScienceSchemaPayloadBytesV3(
  schemaId: string
): number {
  if (schemaId.endsWith("/accommodation_offer_identity.schema.json")) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxIdentityBytes;
  }
  if (schemaId.endsWith("/shared_space_map.schema.json")) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxSharedMapBytes;
  }
  if (schemaId.endsWith("/local_market_night_snapshot.schema.json")) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxSnapshotBytes;
  }
  if (schemaId.endsWith("/market_dataset_legal_ledger.schema.json")) {
    return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxLegalLedgerBytes;
  }
  return STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxPayloadBytes;
}

export function inspectDecisionScienceSchemaJsonTextV3(
  input: unknown,
  maxBytes: number = STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxPayloadBytes
):
  | { status: "ready"; text: string; bytes: number; issues: readonly [] }
  | {
      status: "blocked";
      text: null;
      bytes: number;
      issues: readonly DecisionScienceSchemaStructuralIssueV3[];
    } {
  if (typeof input !== "string") {
    return {
      status: "blocked",
      text: null,
      bytes: 0,
      issues: Object.freeze([{ code: "SCH_INPUT_NOT_TEXT", path: "$" }]),
    };
  }
  const bytes = new TextEncoder().encode(input).byteLength;
  if (
    bytes > maxBytes ||
    bytes > STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxPayloadBytes
  ) {
    return {
      status: "blocked",
      text: null,
      bytes,
      issues: Object.freeze([
        { code: "SCH_PAYLOAD_BYTES_EXCEEDED", path: "$" },
      ]),
    };
  }
  return { status: "ready", text: input, bytes, issues: Object.freeze([]) };
}

export function structuralCloneDecisionScienceSchemaValueV3(
  input: unknown,
  bytes = 0
): DecisionScienceSchemaStructuralResultV3 {
  const issues: DecisionScienceSchemaStructuralIssueV3[] = [];
  const active = new WeakSet<object>();
  let nodes = 0;
  let properties = 0;
  let issueLimitReached = false;

  const addIssue = (
    code: DecisionScienceSchemaStructuralIssueCodeV3,
    path: string
  ): void => {
    if (issues.length < STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxIssues) {
      issues.push({ code, path });
    } else {
      issueLimitReached = true;
    }
  };

  const visit = (value: unknown, path: string, depth: number): unknown => {
    nodes += 1;
    if (nodes > STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxNodes) {
      addIssue("SCH_NODE_LIMIT_EXCEEDED", path);
      return null;
    }
    if (depth > STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxDepth) {
      addIssue("SCH_DEPTH_EXCEEDED", path);
      return null;
    }
    if (value === null || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value.length > STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxStringLength) {
        addIssue("SCH_STRING_LIMIT_EXCEEDED", path);
      }
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value) || Object.is(value, -0)) {
        addIssue("SCH_VALUE_NOT_JSON_SAFE", path);
        return null;
      }
      return value;
    }
    if (typeof value !== "object") {
      addIssue("SCH_VALUE_NOT_JSON_SAFE", path);
      return null;
    }
    if (active.has(value)) {
      addIssue("SCH_CYCLE_DETECTED", path);
      return null;
    }
    active.add(value);
    try {
      if (Array.isArray(value)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        if (
          lengthDescriptor === undefined ||
          lengthDescriptor.enumerable ||
          !("value" in lengthDescriptor) ||
          typeof lengthDescriptor.value !== "number"
        ) {
          addIssue("SCH_ARRAY_INVALID", path);
          return null;
        }
        const limit = Math.min(
          arrayLimitForPath(path),
          STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxArrayItems
        );
        if (value.length > limit) {
          addIssue(arrayLimitIssueForPath(path), path);
        }
        const ownKeys = Reflect.ownKeys(value);
        for (const key of ownKeys) {
          if (typeof key === "symbol") {
            addIssue("SCH_SYMBOL_PROPERTY", path);
            continue;
          }
          if (key === "length") {
            continue;
          }
          if (!isCanonicalArrayIndex(key, value.length)) {
            addIssue("SCH_ARRAY_INVALID", `${path}.${key}`);
          }
        }
        const clone: unknown[] = [];
        for (let index = 0; index < value.length; index += 1) {
          const key = String(index);
          if (!Object.hasOwn(value, key)) {
            addIssue("SCH_ARRAY_INVALID", `${path}[${index}]`);
            clone.push(null);
            continue;
          }
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (
            descriptor === undefined ||
            !descriptor.enumerable ||
            !("value" in descriptor) ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined
          ) {
            addIssue("SCH_PROPERTY_DESCRIPTOR_INVALID", `${path}[${index}]`);
            clone.push(null);
            continue;
          }
          clone.push(visit(descriptor.value, `${path}[${index}]`, depth + 1));
        }
        return clone;
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        addIssue("SCH_OBJECT_PROTOTYPE_INVALID", path);
        return null;
      }
      for (const inheritedKey in value) {
        if (!Object.hasOwn(value, inheritedKey)) {
          addIssue("SCH_INHERITED_PROPERTY", `${path}.${inheritedKey}`);
        }
      }
      const clone = Object.create(null) as Record<string, unknown>;
      for (const key of Reflect.ownKeys(value)) {
        if (typeof key === "symbol") {
          addIssue("SCH_SYMBOL_PROPERTY", path);
          continue;
        }
        properties += 1;
        if (properties > STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxProperties) {
          addIssue("SCH_PROPERTY_LIMIT_EXCEEDED", `${path}.${key}`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          !("value" in descriptor) ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined
        ) {
          addIssue("SCH_PROPERTY_DESCRIPTOR_INVALID", `${path}.${key}`);
          continue;
        }
        if (FORBIDDEN_FIELDS.has(key.toLowerCase())) {
          addIssue("SCH_FORBIDDEN_FIELD", `${path}.${key}`);
          continue;
        }
        clone[key] = visit(descriptor.value, `${path}.${key}`, depth + 1);
      }
      return clone;
    } finally {
      active.delete(value);
    }
  };

  try {
    const value = visit(input, "$", 0);
    if (issueLimitReached) {
      issues[STAYOPTI_SCHEMA_RESOURCE_PROFILE_V3.maxIssues - 1] = {
        code: "SCH_ERROR_LIMIT_REACHED",
        path: "$",
      };
    }
    if (issues.length > 0) {
      return {
        status: "blocked",
        value: null,
        bytes,
        nodes,
        properties,
        issues: Object.freeze(sortIssues(issues)),
      };
    }
    return {
      status: "ready",
      value,
      bytes,
      nodes,
      properties,
      issues: Object.freeze([]),
    };
  } catch {
    return {
      status: "blocked",
      value: null,
      bytes,
      nodes,
      properties,
      issues: Object.freeze([{ code: "SCH_INTERNAL_FAILURE", path: "$" }]),
    };
  }
}

export function parseAndCloneDecisionScienceSchemaJsonV3(
  text: string,
  bytes = new TextEncoder().encode(text).byteLength
): DecisionScienceSchemaStructuralResultV3 {
  try {
    return structuralCloneDecisionScienceSchemaValueV3(JSON.parse(text), bytes);
  } catch {
    return {
      status: "blocked",
      value: null,
      bytes,
      nodes: 0,
      properties: 0,
      issues: Object.freeze([{ code: "SCH_JSON_PARSE_FAILED", path: "$" }]),
    };
  }
}

export function deepFreezeDecisionScienceSchemaValueV3<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor !== undefined && "value" in descriptor) {
        deepFreezeDecisionScienceSchemaValueV3(descriptor.value);
      }
    }
    Object.freeze(value);
  }
  return value;
}
