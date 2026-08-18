export const STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3 =
  "stayopti.dsl.claim" as const;

export const STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3 =
  1 as const;

export const STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_VERSION_V3 =
  "stayopti.dsl.canonical-json@1" as const;

export const STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3 =
  "1.1.0" as const;

export type QualifiedClaimRegistryScopeV3 =
  | "core-appraised"
  | "candidate";

export type QualifiedCandidateTrackV3 =
  | "accommodation-types-and-unit"
  | "behavioral-decision-science"
  | "hospitality-guest-experience"
  | "season-and-local-market"
  | "travel-value-risk";

export interface QualifiedClaimIdentityV3 {
  namespace: typeof STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3;
  identitySchemaVersion:
    typeof STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3;
  registryScope: QualifiedClaimRegistryScopeV3;
  track: QualifiedCandidateTrackV3 | null;
  claimId: string;
  claimVersion: number | null;
}

export interface QualifiedClaimReleaseBindingV3 {
  identity: Readonly<QualifiedClaimIdentityV3>;
  qualifiedKey: string;
  claimStatus: "appraised" | "candidate-second-pass-required";
  libraryRelease: typeof STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3;
  registrySchemaVersion: "1.0.0" | "1.1.0";
  sourceAssetPath: string;
  sourceAssetDigestSha256: `sha256-${string}`;
  recordDigestSha256: `sha256-${string}`;
}

export type QualifiedClaimIdentityIssueCodeV3 =
  | "canonical-json-invalid"
  | "claim-id-invalid"
  | "claim-version-forbidden"
  | "claim-version-incompatible"
  | "claim-version-required"
  | "identity-shape-invalid"
  | "identity-unexpected-field"
  | "namespace-unknown"
  | "qualified-key-invalid"
  | "scope-unknown"
  | "track-forbidden"
  | "track-missing"
  | "track-unknown";

export interface QualifiedClaimIdentityIssueV3 {
  code: QualifiedClaimIdentityIssueCodeV3;
  path: string;
  detail: string;
}

export type QualifiedClaimIdentityResultV3 =
  | {
      status: "ready";
      identity: Readonly<QualifiedClaimIdentityV3>;
      qualifiedKey: string;
      issues: readonly [];
    }
  | {
      status: "blocked";
      identity: null;
      qualifiedKey: null;
      issues: readonly QualifiedClaimIdentityIssueV3[];
    };

export type QualifiedClaimCanonicalJsonResultV3 =
  | {
      status: "ready";
      canonicalJson: string;
      issues: readonly [];
    }
  | {
      status: "blocked";
      canonicalJson: null;
      issues: readonly QualifiedClaimIdentityIssueV3[];
    };

const IDENTITY_KEYS = [
  "namespace",
  "identitySchemaVersion",
  "registryScope",
  "track",
  "claimId",
  "claimVersion",
] as const;

const REGISTRY_SCOPES = new Set<QualifiedClaimRegistryScopeV3>([
  "core-appraised",
  "candidate",
]);

const CANDIDATE_TRACKS = new Set<QualifiedCandidateTrackV3>([
  "accommodation-types-and-unit",
  "behavioral-decision-science",
  "hospitality-guest-experience",
  "season-and-local-market",
  "travel-value-risk",
]);

const CLAIM_ID_PATTERN = /^CLM-[A-Z]{2,3}-[0-9]{3}$/;
const QUALIFIED_KEY_PREFIX =
  `${STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3}@${STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3}`;

const INVALID_PROPERTY = Symbol("invalid-property");

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareIssues(
  left: QualifiedClaimIdentityIssueV3,
  right: QualifiedClaimIdentityIssueV3
): number {
  return (
    compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.path, right.path) ||
    compareOrdinal(left.detail, right.detail)
  );
}

function addIssue(
  issues: QualifiedClaimIdentityIssueV3[],
  code: QualifiedClaimIdentityIssueCodeV3,
  path: string,
  detail: string
): void {
  issues.push({ code, path, detail });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownEnumerableDataValue(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: QualifiedClaimIdentityIssueV3[]
): unknown | typeof INVALID_PROPERTY {
  if (!Object.hasOwn(record, key)) {
    addIssue(
      issues,
      "identity-shape-invalid",
      `${path}.${key}`,
      "Required fields must be own properties."
    );
    return INVALID_PROPERTY;
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (
    descriptor === undefined ||
    !descriptor.enumerable ||
    !("value" in descriptor) ||
    descriptor.get !== undefined ||
    descriptor.set !== undefined
  ) {
    addIssue(
      issues,
      "identity-shape-invalid",
      `${path}.${key}`,
      "Expected an enumerable own data property."
    );
    return INVALID_PROPERTY;
  }
  return descriptor.value;
}

function validateIdentityShape(
  input: unknown,
  issues: QualifiedClaimIdentityIssueV3[]
): Record<string, unknown> | null {
  if (!isPlainRecord(input)) {
    addIssue(
      issues,
      "identity-shape-invalid",
      "identity",
      "Qualified identity must be a plain or null-prototype object."
    );
    return null;
  }

  const allowed = new Set<string>(IDENTITY_KEYS);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === "symbol") {
      addIssue(
        issues,
        "identity-shape-invalid",
        `identity[${String(key)}]`,
        "Symbol keys are not JSON-like."
      );
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      addIssue(
        issues,
        "identity-shape-invalid",
        `identity.${key}`,
        "Identity fields must be enumerable own data properties."
      );
    }
    if (!allowed.has(key)) {
      addIssue(
        issues,
        "identity-unexpected-field",
        `identity.${key}`,
        "Qualified identity is a closed-shape object."
      );
    }
  }
  return input;
}

function blockedIdentityResult(
  issues: QualifiedClaimIdentityIssueV3[]
): QualifiedClaimIdentityResultV3 {
  issues.sort(compareIssues);
  return {
    status: "blocked",
    identity: null,
    qualifiedKey: null,
    issues: deepFreezeQualifiedClaimValueV3(issues),
  };
}

function serializeValidatedIdentity(identity: QualifiedClaimIdentityV3): string {
  const trackToken = identity.track === null ? "_" : identity.track;
  const versionToken =
    identity.claimVersion === null ? "nv" : `v${identity.claimVersion}`;
  return [
    QUALIFIED_KEY_PREFIX,
    identity.registryScope,
    trackToken,
    identity.claimId,
    versionToken,
  ].join("|");
}

export function validateQualifiedClaimIdentityV3(
  input: unknown
): QualifiedClaimIdentityResultV3 {
  try {
    const issues: QualifiedClaimIdentityIssueV3[] = [];
    const record = validateIdentityShape(input, issues);
    if (record === null) {
      return blockedIdentityResult(issues);
    }

    const namespace = ownEnumerableDataValue(record, "namespace", "identity", issues);
    const identitySchemaVersion = ownEnumerableDataValue(
      record,
      "identitySchemaVersion",
      "identity",
      issues
    );
    const registryScope = ownEnumerableDataValue(
      record,
      "registryScope",
      "identity",
      issues
    );
    const track = ownEnumerableDataValue(record, "track", "identity", issues);
    const claimId = ownEnumerableDataValue(record, "claimId", "identity", issues);
    const claimVersion = ownEnumerableDataValue(
      record,
      "claimVersion",
      "identity",
      issues
    );

    if (namespace !== STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3) {
      addIssue(
        issues,
        "namespace-unknown",
        "identity.namespace",
        "Qualified claim namespace must match the frozen ASCII literal."
      );
    }
    if (
      identitySchemaVersion !==
      STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3
    ) {
      addIssue(
        issues,
        "identity-shape-invalid",
        "identity.identitySchemaVersion",
        "Unsupported qualified claim identity schema version."
      );
    }
    if (
      typeof registryScope !== "string" ||
      !REGISTRY_SCOPES.has(registryScope as QualifiedClaimRegistryScopeV3)
    ) {
      addIssue(
        issues,
        "scope-unknown",
        "identity.registryScope",
        "Registry scope is outside the closed vocabulary."
      );
    }
    if (typeof claimId !== "string" || !CLAIM_ID_PATTERN.test(claimId)) {
      addIssue(
        issues,
        "claim-id-invalid",
        "identity.claimId",
        "Claim ID must match the frozen uppercase ASCII grammar."
      );
    }

    if (registryScope === "core-appraised") {
      if (track !== null) {
        addIssue(
          issues,
          "track-forbidden",
          "identity.track",
          "Core/appraised claim identities require a null track."
        );
      }
      if (claimVersion === null || claimVersion === INVALID_PROPERTY) {
        addIssue(
          issues,
          "claim-version-required",
          "identity.claimVersion",
          "Core/appraised claims require their explicit record version."
        );
      } else if (
        typeof claimVersion !== "number" ||
        !Number.isInteger(claimVersion) ||
        claimVersion !== 1
      ) {
        addIssue(
          issues,
          "claim-version-incompatible",
          "identity.claimVersion",
          "The frozen core registry requires claim version 1."
        );
      }
    } else if (registryScope === "candidate") {
      if (typeof track !== "string") {
        addIssue(
          issues,
          "track-missing",
          "identity.track",
          "Candidate claim identities require an explicit track."
        );
      } else if (!CANDIDATE_TRACKS.has(track as QualifiedCandidateTrackV3)) {
        addIssue(
          issues,
          "track-unknown",
          "identity.track",
          "Candidate track is outside the closed vocabulary."
        );
      }
      if (claimVersion !== null) {
        addIssue(
          issues,
          "claim-version-forbidden",
          "identity.claimVersion",
          "Candidate source records have no claim version in this release."
        );
      }
    }

    if (issues.length > 0) {
      return blockedIdentityResult(issues);
    }

    const identity: QualifiedClaimIdentityV3 = {
      namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
      identitySchemaVersion:
        STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
      registryScope: registryScope as QualifiedClaimRegistryScopeV3,
      track: track as QualifiedCandidateTrackV3 | null,
      claimId: claimId as string,
      claimVersion: claimVersion as number | null,
    };
    deepFreezeQualifiedClaimValueV3(identity);
    return {
      status: "ready",
      identity,
      qualifiedKey: serializeValidatedIdentity(identity),
      issues: [],
    };
  } catch {
    return blockedIdentityResult([{
      code: "identity-shape-invalid",
      path: "identity",
      detail: "Unexpected identity validation failure was contained.",
    }]);
  }
}

export function serializeQualifiedClaimIdentityV3(
  input: unknown
): QualifiedClaimIdentityResultV3 {
  return validateQualifiedClaimIdentityV3(input);
}

export function parseQualifiedClaimKeyV3(
  input: unknown
): QualifiedClaimIdentityResultV3 {
  try {
    if (
      typeof input !== "string" ||
      input === "" ||
      !/^[\x21-\x7e]+$/.test(input)
    ) {
      return blockedIdentityResult([{
        code: "qualified-key-invalid",
        path: "qualifiedKey",
        detail: "Qualified key must be non-empty printable ASCII without whitespace.",
      }]);
    }
    const parts = input.split("|");
    if (parts.length !== 5 || parts.some((part) => part === "")) {
      return blockedIdentityResult([{
        code: "qualified-key-invalid",
        path: "qualifiedKey",
        detail: "Qualified key must contain exactly five non-empty components.",
      }]);
    }
    const [prefix, registryScope, trackToken, claimId, versionToken] = parts;
    if (prefix !== QUALIFIED_KEY_PREFIX) {
      return blockedIdentityResult([{
        code: "namespace-unknown",
        path: "qualifiedKey",
        detail: "Qualified key namespace or schema version is unknown.",
      }]);
    }

    let claimVersion: number | null;
    if (versionToken === "nv") {
      claimVersion = null;
    } else if (/^v[1-9][0-9]*$/.test(versionToken)) {
      claimVersion = Number(versionToken.slice(1));
      if (!Number.isSafeInteger(claimVersion)) {
        return blockedIdentityResult([{
          code: "claim-version-incompatible",
          path: "qualifiedKey",
          detail: "Claim version token exceeds the safe integer domain.",
        }]);
      }
    } else {
      return blockedIdentityResult([{
        code: "claim-version-incompatible",
        path: "qualifiedKey",
        detail: "Qualified key contains an invalid claim version token.",
      }]);
    }

    const result = validateQualifiedClaimIdentityV3({
      namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
      identitySchemaVersion:
        STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
      registryScope,
      track: trackToken === "_" ? null : trackToken,
      claimId,
      claimVersion,
    });
    if (result.status === "blocked") {
      return result;
    }
    if (result.qualifiedKey !== input) {
      return blockedIdentityResult([{
        code: "qualified-key-invalid",
        path: "qualifiedKey",
        detail: "Qualified key is not in byte-exact canonical form.",
      }]);
    }
    return result;
  } catch {
    return blockedIdentityResult([{
      code: "qualified-key-invalid",
      path: "qualifiedKey",
      detail: "Unexpected qualified-key parsing failure was contained.",
    }]);
  }
}

function isCanonicalArrayIndex(key: string): boolean {
  if (!/^(0|[1-9][0-9]*)$/.test(key)) {
    return false;
  }
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < 0xffffffff &&
    String(index) === key
  );
}

function canonicalizeJsonValue(
  value: unknown,
  path: string,
  ancestors: Set<object>,
  issues: QualifiedClaimIdentityIssueV3[]
): string | null {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      addIssue(
        issues,
        "canonical-json-invalid",
        path,
        "Canonical JSON rejects NaN, Infinity and negative zero."
      );
      return null;
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    addIssue(
      issues,
      "canonical-json-invalid",
      path,
      "Canonical JSON accepts only JSON-safe primitive, object and array values."
    );
    return null;
  }
  if (ancestors.has(value)) {
    addIssue(
      issues,
      "canonical-json-invalid",
      path,
      "Canonical JSON rejects cyclic values."
    );
    return null;
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      let length: number | null = null;
      for (const key of ownKeys) {
        if (typeof key === "symbol") {
          addIssue(
            issues,
            "canonical-json-invalid",
            `${path}[${String(key)}]`,
            "Canonical arrays reject Symbol keys."
          );
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (key === "length") {
          if (
            descriptor === undefined ||
            descriptor.enumerable ||
            !("value" in descriptor) ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined ||
            typeof descriptor.value !== "number" ||
            !Number.isInteger(descriptor.value) ||
            descriptor.value < 0
          ) {
            addIssue(
              issues,
              "canonical-json-invalid",
              `${path}.length`,
              "Canonical arrays require their ordinary length descriptor."
            );
          } else {
            length = descriptor.value;
          }
          continue;
        }
        if (!isCanonicalArrayIndex(key)) {
          addIssue(
            issues,
            "canonical-json-invalid",
            `${path}.${key}`,
            "Canonical arrays allow only indices and length."
          );
          continue;
        }
        if (
          descriptor === undefined ||
          !descriptor.enumerable ||
          !("value" in descriptor) ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined
        ) {
          addIssue(
            issues,
            "canonical-json-invalid",
            `${path}[${key}]`,
            "Canonical array indices must be enumerable own data properties."
          );
        }
      }
      if (length === null) {
        return null;
      }
      const serialized: string[] = [];
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        if (!Object.hasOwn(value, key)) {
          addIssue(
            issues,
            "canonical-json-invalid",
            `${path}[${index}]`,
            "Canonical arrays must be dense."
          );
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
          continue;
        }
        const nested = canonicalizeJsonValue(
          descriptor.value,
          `${path}[${index}]`,
          ancestors,
          issues
        );
        if (nested !== null) {
          serialized.push(nested);
        }
      }
      return serialized.length === length ? `[${serialized.join(",")}]` : null;
    }

    if (!isPlainRecord(value)) {
      addIssue(
        issues,
        "canonical-json-invalid",
        path,
        "Canonical objects must use Object.prototype or a null prototype."
      );
      return null;
    }
    const keys: string[] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        addIssue(
          issues,
          "canonical-json-invalid",
          `${path}[${String(key)}]`,
          "Canonical objects reject Symbol keys."
        );
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
        addIssue(
          issues,
          "canonical-json-invalid",
          `${path}.${key}`,
          "Canonical object fields must be enumerable own data properties."
        );
        continue;
      }
      keys.push(key);
    }
    keys.sort(compareOrdinal);
    const serialized: string[] = [];
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        continue;
      }
      const nested = canonicalizeJsonValue(
        descriptor.value,
        `${path}.${key}`,
        ancestors,
        issues
      );
      if (nested !== null) {
        serialized.push(`${JSON.stringify(key)}:${nested}`);
      }
    }
    return serialized.length === keys.length ? `{${serialized.join(",")}}` : null;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalizeQualifiedClaimJsonV3(
  input: unknown
): QualifiedClaimCanonicalJsonResultV3 {
  try {
    const issues: QualifiedClaimIdentityIssueV3[] = [];
    const canonicalJson = canonicalizeJsonValue(
      input,
      "$",
      new Set<object>(),
      issues
    );
    if (canonicalJson === null || issues.length > 0) {
      issues.sort(compareIssues);
      return {
        status: "blocked",
        canonicalJson: null,
        issues: deepFreezeQualifiedClaimValueV3(issues),
      };
    }
    return {
      status: "ready",
      canonicalJson,
      issues: [],
    };
  } catch {
    return {
      status: "blocked",
      canonicalJson: null,
      issues: deepFreezeQualifiedClaimValueV3([{
        code: "canonical-json-invalid" as const,
        path: "$",
        detail: "Unexpected canonical JSON failure was contained.",
      }]),
    };
  }
}

export async function sha256QualifiedClaimTextV3(
  value: string
): Promise<`sha256-${string}`> {
  if (globalThis.crypto?.subtle === undefined) {
    throw new Error("SHA-256 is unavailable in this runtime.");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256-${hex}`;
}

export function deepFreezeQualifiedClaimValueV3<T>(value: T): T {
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    !Object.isFrozen(value)
  ) {
    for (const key of Reflect.ownKeys(value as object)) {
      const descriptor = Object.getOwnPropertyDescriptor(value as object, key);
      if (descriptor !== undefined && "value" in descriptor) {
        deepFreezeQualifiedClaimValueV3(descriptor.value);
      }
    }
    Object.freeze(value);
  }
  return value;
}

export const STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_TEST_VECTORS_V3 =
  deepFreezeQualifiedClaimValueV3([
    {
      name: "object-key-order",
      input: { z: 1, a: true, middle: null },
      canonicalJson: '{"a":true,"middle":null,"z":1}',
    },
    {
      name: "nested-array-order",
      input: { b: [3, { y: "é", x: "e\u0301" }], a: "|" },
      canonicalJson: '{"a":"|","b":[3,{"x":"é","y":"é"}]}',
    },
    {
      name: "null-prototype-equivalent",
      input: Object.assign(Object.create(null) as Record<string, unknown>, {
        two: 2,
        one: 1,
      }),
      canonicalJson: '{"one":1,"two":2}',
    },
  ] as const);
