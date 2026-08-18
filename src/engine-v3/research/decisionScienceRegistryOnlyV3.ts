import {
  createStableHashV3,
} from "../contract/stableHashV3";

import {
  buildQualifiedClaimIdentityOverlayV3,
  type QualifiedClaimExactResolverV3,
  type QualifiedClaimIdentityOverlayV3,
} from "./qualifiedClaimIdentityOverlayV3";

export const STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3 =
  "1.1.0" as const;

export const STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3 =
  "sha256-aaa3e1b20345751ac435100e8a7d6ba025c950779e2888d5698bbd65b2b56907" as const;

export const STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3 =
  "fnv1a32-e6c34818" as const;

export const STAYOPTI_DECISION_SCIENCE_REGISTRY_MODE_DEFAULT_V3 =
  "off" as const;

export type StayOptiDecisionScienceRegistryModeV3 =
  | "off"
  | "registry-only";

export type StayOptiDecisionScienceRegistryIssueCodeV3 =
  | "asset-hash-mismatch"
  | "asset-set-invalid"
  | "commercial-or-sensitive-field"
  | "count-mismatch"
  | "duplicate-id"
  | "import-manifest-invalid"
  | "manifest-stale"
  | "namespace-invalid"
  | "package-manifest-invalid"
  | "path-invalid"
  | "primitive-required"
  | "qualified-identity-invalid"
  | "ranking-influence-forbidden"
  | "record-invalid"
  | "unexpected-field"
  | "unresolved-source-ref";

export interface StayOptiDecisionScienceRegistryIssueV3 {
  code: StayOptiDecisionScienceRegistryIssueCodeV3;
  path: string;
  detail: string;
}

export interface StayOptiDecisionScienceRegistryCountsV3 {
  packageFiles: number;
  coreSources: number;
  coreClaims: number;
  candidateSourceAliases: number;
  globalCandidateSources: number;
  globalCandidateSourceAliases: number;
  candidateClaims: number;
  resolvedCandidateSourceRefs: number;
  booksManualsAndStandards: number;
  crossTrackConstructs: number;
  accommodationTypes: number;
  marketContextAxes: number;
  potentialSecretFindings: number;
  goldenIncrement: number;
  adversarialIncrement: number;
  counterfactualIncrement: number;
  humanJudgmentIncrement: number;
  expertJudgmentIncrement: number;
  aiJudgmentIncrement: number;
}

export interface StayOptiDecisionScienceRegistryValidationV3 {
  valid: boolean;
  issues: StayOptiDecisionScienceRegistryIssueV3[];
  counts: StayOptiDecisionScienceRegistryCountsV3 | null;
}

export interface StayOptiDecisionScienceRegistryTextAssetV3 {
  path: string;
  content: string;
}

export interface StayOptiDecisionScienceRegistryImportInputV3 {
  importManifest: string;
  assets: StayOptiDecisionScienceRegistryTextAssetV3[];
}

export type StayOptiDecisionScienceRegistryImporterV3 =
  () => Promise<unknown>;

export interface StayOptiDecisionScienceOpaqueRegistryV3 {
  libraryVersion:
    typeof STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3;
  packageFingerprint:
    typeof STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3;
  registryFingerprint:
    typeof STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3;
  mode: "registry-only";
  rankingInfluence: "none";
  candidateRecordsCanInfluenceDecision: false;
  traceAttached: false;
  publicImportAllowed: false;
  counts: Readonly<StayOptiDecisionScienceRegistryCountsV3>;
  records: Readonly<Record<string, unknown>>;
  qualifiedClaimIdentityOverlay: Readonly<QualifiedClaimIdentityOverlayV3>;
  qualifiedClaimResolver: QualifiedClaimExactResolverV3;
}

export interface StayOptiDecisionScienceRegistryLoadResultV3 {
  requestedMode: unknown;
  resolvedMode: StayOptiDecisionScienceRegistryModeV3;
  status: "off" | "ready" | "blocked";
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
  issues: StayOptiDecisionScienceRegistryIssueV3[];
  registry: StayOptiDecisionScienceOpaqueRegistryV3 | null;
}

interface ImportAssetV3 {
  path: string;
  bytes: number;
  sha256: string;
  role: string;
}

interface ImportManifestV3 {
  schemaVersion: string;
  importId: string;
  libraryVersion: string;
  sourceArchive: {
    fileName: string;
    sha256: string;
  };
  packageFingerprint: string;
  mode: {
    default: string;
    allowed: string[];
    rankingInfluence: string;
    decisionCoreImportAllowed: boolean;
    publicImportAllowed: boolean;
    traceAllowed: boolean;
  };
  expectedCounts: StayOptiDecisionScienceRegistryCountsV3;
  assets: ImportAssetV3[];
  registryFingerprint: string;
}

const IMPORT_ID =
  "stayopti-v3-13b1-decision-science-library-v1.1-registry-only";

const SOURCE_ARCHIVE_SHA256 =
  "d0bd932106d6784a1a0245a5ddb71cbb6b9fa643aa201cca51afe171906dae99";

const IMPORT_FINGERPRINT_NAMESPACE =
  "stayopti-v3-decision-science-registry-only-import";

const EXPECTED_ASSET_PATHS = [
  "data/accommodation_type_decision_facets.json",
  "data/candidate_claim_registry.json",
  "data/candidate_registry_manifest.json",
  "data/candidate_source_registry.json",
  "data/claim_registry.json",
  "data/claim_relationship_registry.json",
  "data/global_candidate_source_registry.json",
  "data/package_validation_manifest.json",
  "data/season_local_market_context_contract.json",
  "data/source_registry.json",
] as const;

const IMPORT_RESULT_KEYS = [
  "importManifest",
  "assets",
] as const;

const RUNTIME_ASSET_KEYS = [
  "path",
  "content",
] as const;

const MANIFEST_ROOT_KEYS = [
  "schemaVersion",
  "importId",
  "libraryVersion",
  "sourceArchive",
  "packageFingerprint",
  "mode",
  "expectedCounts",
  "assets",
  "registryFingerprint",
] as const;

const SOURCE_ARCHIVE_KEYS = [
  "fileName",
  "sha256",
] as const;

const MODE_KEYS = [
  "default",
  "allowed",
  "rankingInfluence",
  "decisionCoreImportAllowed",
  "publicImportAllowed",
  "traceAllowed",
] as const;

const EXPECTED_COUNT_KEYS = [
  "packageFiles",
  "coreSources",
  "coreClaims",
  "candidateSourceAliases",
  "globalCandidateSources",
  "globalCandidateSourceAliases",
  "candidateClaims",
  "resolvedCandidateSourceRefs",
  "booksManualsAndStandards",
  "crossTrackConstructs",
  "accommodationTypes",
  "marketContextAxes",
  "potentialSecretFindings",
  "goldenIncrement",
  "adversarialIncrement",
  "counterfactualIncrement",
  "humanJudgmentIncrement",
  "expertJudgmentIncrement",
  "aiJudgmentIncrement",
] as const;

const MANIFEST_ASSET_KEYS = [
  "path",
  "bytes",
  "sha256",
  "role",
] as const;

const TRACK_CONTRACTS = {
  "accommodation-types-and-unit": {
    sourcePrefix: "SRC-ACC-",
    claimPrefix: "CLM-ACC-",
    sourceReport: "research/accommodation_types_decision_science.md",
  },
  "behavioral-decision-science": {
    sourcePrefix: "SRC-BEH-",
    claimPrefix: "CLM-BEH-",
    sourceReport: "research/behavioral_decision_science.md",
  },
  "hospitality-guest-experience": {
    sourcePrefix: "SRC-HOS-",
    claimPrefix: "CLM-HOS-",
    sourceReport: "research/hospitality_guest_experience.md",
  },
  "season-and-local-market": {
    sourcePrefix: "SRC-SEA-",
    claimPrefix: "CLM-SEA-",
    sourceReport: "research/season_local_market_context.md",
  },
  "travel-value-risk": {
    sourcePrefix: "SRC-TRV-",
    claimPrefix: "CLM-TRV-",
    sourceReport: "research/travel_value_risk.md",
  },
} as const;

const FORBIDDEN_FIELD_KEYS = new Set([
  "affiliatecommission",
  "affiliaterevenue",
  "apikey",
  "apisecret",
  "authorization",
  "bid",
  "bookingid",
  "clickprobability",
  "commercialinput",
  "commercialinputs",
  "commercialscore",
  "commercialweight",
  "commission",
  "commissionamount",
  "commissionrate",
  "conversionvalue",
  "cookie",
  "credential",
  "margin",
  "markup",
  "markupamount",
  "merchantmargin",
  "numericcontribution",
  "password",
  "partnerrevenue",
  "paymentid",
  "payout",
  "policyweight",
  "prebookid",
  "providerpriority",
  "providerpriorityscore",
  "providerrank",
  "rankingscore",
  "revenue",
  "revenuepersale",
  "secret",
  "selectedoption",
  "takerate",
  "token",
  "userspecificpayout",
  "winner",
]);

const EMPTY_COUNTS: StayOptiDecisionScienceRegistryCountsV3 = {
  packageFiles: 0,
  coreSources: 0,
  coreClaims: 0,
  candidateSourceAliases: 0,
  globalCandidateSources: 0,
  globalCandidateSourceAliases: 0,
  candidateClaims: 0,
  resolvedCandidateSourceRefs: 0,
  booksManualsAndStandards: 0,
  crossTrackConstructs: 0,
  accommodationTypes: 0,
  marketContextAxes: 0,
  potentialSecretFindings: 0,
  goldenIncrement: 0,
  adversarialIncrement: 0,
  counterfactualIncrement: 0,
  humanJudgmentIncrement: 0,
  expertJudgmentIncrement: 0,
  aiJudgmentIncrement: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function compareIssues(
  left: StayOptiDecisionScienceRegistryIssueV3,
  right: StayOptiDecisionScienceRegistryIssueV3
): number {
  return (
    left.code.localeCompare(right.code) ||
    left.path.localeCompare(right.path) ||
    left.detail.localeCompare(right.detail)
  );
}

function addIssue(
  issues: StayOptiDecisionScienceRegistryIssueV3[],
  code: StayOptiDecisionScienceRegistryIssueCodeV3,
  path: string,
  detail: string
): void {
  issues.push({
    code,
    path,
    detail,
  });
}

const INVALID_OWN_PROPERTY = Symbol("invalid-own-property");

function propertyPath(path: string, key: string | symbol): string {
  return typeof key === "symbol"
    ? path + "[" + String(key) + "]"
    : path + "." + key;
}

function sortedOwnKeys(value: object): Array<string | symbol> {
  return Reflect.ownKeys(value).sort((left, right) =>
    String(left).localeCompare(String(right))
  );
}

function readOwnEnumerableDataProperty(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): unknown | typeof INVALID_OWN_PROPERTY {
  const targetPath = propertyPath(path, key);
  if (!Object.hasOwn(record, key)) {
    addIssue(
      issues,
      "record-invalid",
      targetPath,
      "Required fields must be own properties."
    );
    return INVALID_OWN_PROPERTY;
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
      "record-invalid",
      targetPath,
      "Expected an enumerable own data property."
    );
    return INVALID_OWN_PROPERTY;
  }

  return descriptor.value;
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

function validateCanonicalJsonArray(
  value: unknown[],
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): boolean {
  const issueCountBefore = issues.length;
  const indexValues: number[] = [];
  let length: number | null = null;

  for (const key of sortedOwnKeys(value)) {
    const targetPath = propertyPath(path, key);
    if (typeof key === "symbol") {
      addIssue(
        issues,
        "record-invalid",
        targetPath,
        "JSON arrays cannot contain Symbol keys."
      );
      continue;
    }
    if (!Object.hasOwn(value, key)) {
      addIssue(
        issues,
        "record-invalid",
        targetPath,
        "Array fields must be own properties."
      );
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined) {
      addIssue(
        issues,
        "record-invalid",
        targetPath,
        "Array property descriptor is unavailable."
      );
      continue;
    }
    if (key === "length") {
      if (
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
          "record-invalid",
          targetPath,
          "Array length must be the normal non-enumerable data property."
        );
      } else {
        length = descriptor.value;
      }
      continue;
    }
    if (!isCanonicalArrayIndex(key)) {
      addIssue(
        issues,
        "unexpected-field",
        targetPath,
        "JSON arrays permit only canonical indices and length."
      );
      continue;
    }
    if (
      !descriptor.enumerable ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      addIssue(
        issues,
        "record-invalid",
        targetPath,
        "Array indices must be enumerable own data properties."
      );
      continue;
    }
    indexValues.push(Number(key));
  }

  if (length === null) {
    addIssue(
      issues,
      "record-invalid",
      path + ".length",
      "Array length must be an own data property."
    );
  } else {
    indexValues.sort((left, right) => left - right);
    if (
      indexValues.length !== length ||
      indexValues.some((index, position) => index !== position)
    ) {
      addIssue(
        issues,
        "record-invalid",
        path,
        "Sparse arrays and inherited array elements are forbidden."
      );
    }
  }

  return issues.length === issueCountBefore;
}

function validateExactKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const allowed = new Set(allowedKeys);
  for (const key of sortedOwnKeys(record)) {
    const targetPath = propertyPath(path, key);
    if (typeof key === "symbol") {
      addIssue(
        issues,
        "record-invalid",
        targetPath,
        "Closed-shape JSON objects cannot contain Symbol keys."
      );
      continue;
    }
    if (!Object.hasOwn(record, key)) {
      addIssue(
        issues,
        "record-invalid",
        targetPath,
        "Closed-shape fields must be own properties."
      );
      continue;
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
        "record-invalid",
        targetPath,
        "Closed-shape fields must be enumerable own data properties."
      );
    }
    if (!allowed.has(key)) {
      addIssue(
        issues,
        "unexpected-field",
        targetPath,
        "Closed-shape registry input forbids this field."
      );
    }
  }
}

function readRecord(
  value: unknown,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    addIssue(issues, "record-invalid", path, "Expected a plain JSON object.");
    return null;
  }

  return value;
}

function readRecordProperty(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): Record<string, unknown> | null {
  const value = readOwnEnumerableDataProperty(record, key, path, issues);
  if (value === INVALID_OWN_PROPERTY) {
    return null;
  }
  return readRecord(value, path + "." + key, issues);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): string | null {
  const value = readOwnEnumerableDataProperty(record, key, path, issues);
  if (value === INVALID_OWN_PROPERTY) {
    return null;
  }
  if (typeof value !== "string") {
    addIssue(
      issues,
      "primitive-required",
      path + "." + key,
      "Expected a string primitive."
    );
    return null;
  }

  return value;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): number | null {
  const value = readOwnEnumerableDataProperty(record, key, path, issues);
  if (value === INVALID_OWN_PROPERTY) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    addIssue(
      issues,
      "primitive-required",
      path + "." + key,
      "Expected a finite number primitive."
    );
    return null;
  }

  return value;
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): boolean | null {
  const value = readOwnEnumerableDataProperty(record, key, path, issues);
  if (value === INVALID_OWN_PROPERTY) {
    return null;
  }
  if (typeof value !== "boolean") {
    addIssue(
      issues,
      "primitive-required",
      path + "." + key,
      "Expected a boolean primitive."
    );
    return null;
  }

  return value;
}

function readArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): unknown[] | null {
  const value = readOwnEnumerableDataProperty(record, key, path, issues);
  if (value === INVALID_OWN_PROPERTY) {
    return null;
  }
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      "record-invalid",
      path + "." + key,
      "Expected an array."
    );
    return null;
  }

  if (!validateCanonicalJsonArray(value, path + "." + key, issues)) {
    return null;
  }

  return value;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): string[] | null {
  const values = readArray(record, key, path, issues);
  if (values === null) {
    return null;
  }

  if (!values.every((value) => typeof value === "string")) {
    addIssue(
      issues,
      "primitive-required",
      path + "." + key,
      "Expected an array of string primitives."
    );
    return null;
  }

  return values as string[];
}

function parseImportInput(
  value: unknown,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): StayOptiDecisionScienceRegistryImportInputV3 | null {
  const issueCountBefore = issues.length;
  const input = readRecord(value, "importer.result", issues);
  if (input === null) {
    return null;
  }
  scanRankAndSensitiveFields(input, "importer.result", issues);
  validateExactKeys(input, IMPORT_RESULT_KEYS, "importer.result", issues);

  const importManifest = readString(
    input,
    "importManifest",
    "importer.result",
    issues
  );
  const assetValues = readArray(
    input,
    "assets",
    "importer.result",
    issues
  );
  if (importManifest === null || assetValues === null) {
    return null;
  }

  const assets: StayOptiDecisionScienceRegistryTextAssetV3[] = [];
  assetValues.forEach((value, index) => {
    const path = "importer.result.assets[" + index + "]";
    const asset = readRecord(value, path, issues);
    if (asset === null) {
      return;
    }
    validateExactKeys(asset, RUNTIME_ASSET_KEYS, path, issues);

    const assetPath = readString(asset, "path", path, issues);
    const content = readString(asset, "content", path, issues);
    if (assetPath !== null && content !== null) {
      assets.push({
        path: assetPath,
        content,
      });
    }
  });

  if (issues.length !== issueCountBefore) {
    return null;
  }

  return {
    importManifest,
    assets,
  };
}

function scanRankAndSensitiveFields(
  value: unknown,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const arrayValue = Array.isArray(value);
  if (!arrayValue && !isRecord(value)) {
    return;
  }

  for (const key of sortedOwnKeys(value)) {
    const entryPath =
      arrayValue && typeof key === "string" && isCanonicalArrayIndex(key)
        ? path + "[" + key + "]"
        : propertyPath(path, key);
    if (typeof key === "symbol") {
      addIssue(
        issues,
        "record-invalid",
        entryPath,
        "JSON-like values cannot contain Symbol keys."
      );
      continue;
    }
    if (arrayValue && key === "length") {
      continue;
    }

    const keyToken = normalizedKey(key);

    if (FORBIDDEN_FIELD_KEYS.has(keyToken)) {
      addIssue(
        issues,
        "commercial-or-sensitive-field",
        entryPath,
        "Commercial, sensitive or decision-output fields are forbidden."
      );
    }

    if (!Object.hasOwn(value, key)) {
      addIssue(
        issues,
        "record-invalid",
        entryPath,
        "JSON-like fields must be own properties."
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
        "record-invalid",
        entryPath,
        "JSON-like fields must be enumerable own data properties."
      );
      continue;
    }
    const entry = descriptor.value;

    if (keyToken === "rankinginfluence" && entry !== "none") {
      addIssue(
        issues,
        "ranking-influence-forbidden",
        entryPath,
        "Every declared ranking influence must be exactly none."
      );
    }

    if (keyToken === "status" && entry === "policy-eligible") {
      addIssue(
        issues,
        "ranking-influence-forbidden",
        entryPath,
        "Registry-only import cannot contain a policy-eligible record."
      );
    }

    scanRankAndSensitiveFields(entry, entryPath, issues);
  }
}

function ensureUnique(
  values: string[],
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      addIssue(
        issues,
        "duplicate-id",
        path,
        "Duplicate identifier: " + value + "."
      );
    }
    seen.add(value);
  }
}

function equalNumber(
  actual: number,
  expected: number,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  if (actual !== expected) {
    addIssue(
      issues,
      "count-mismatch",
      path,
      "Expected " + expected + ", received " + actual + "."
    );
  }
}

function validateCandidateBoundary(
  record: Record<string, unknown>,
  path: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const status = readString(record, "status", path, issues);
  const rankingInfluence = readString(
    record,
    "rankingInfluence",
    path,
    issues
  );

  if (status !== "candidate-second-pass-required") {
    addIssue(
      issues,
      "record-invalid",
      path + ".status",
      "Candidate records must remain candidate-second-pass-required."
    );
  }

  if (rankingInfluence !== "none") {
    addIssue(
      issues,
      "ranking-influence-forbidden",
      path + ".rankingInfluence",
      "Candidate records must remain rank-neutral."
    );
  }
}

function validateCandidateSources(
  asset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): {
  sourceIds: Set<string>;
  sourceTrackById: Map<string, string>;
} {
  const sourceIds = new Set<string>();
  const sourceTrackById = new Map<string, string>();
  const root = readRecord(asset, "candidateSourceRegistry", issues);
  if (root === null) {
    return { sourceIds, sourceTrackById };
  }

  validateCandidateBoundary(root, "candidateSourceRegistry", issues);
  const sources = readArray(root, "sources", "candidateSourceRegistry", issues) ?? [];
  equalNumber(
    sources.length,
    expected.candidateSourceAliases,
    "candidateSourceRegistry.sources",
    issues
  );
  equalNumber(
    readNumber(root, "actualCount", "candidateSourceRegistry", issues) ?? -1,
    expected.candidateSourceAliases,
    "candidateSourceRegistry.actualCount",
    issues
  );

  const ids: string[] = [];
  sources.forEach((value, index) => {
    const path = "candidateSourceRegistry.sources[" + index + "]";
    const source = readRecord(value, path, issues);
    if (source === null) {
      return;
    }
    validateCandidateBoundary(source, path, issues);

    const sourceId = readString(source, "sourceId", path, issues);
    const track = readString(source, "track", path, issues);
    const sourceReport = readString(source, "sourceReport", path, issues);
    readString(source, "sourceType", path, issues);
    const contract =
      track === null
        ? undefined
        : TRACK_CONTRACTS[track as keyof typeof TRACK_CONTRACTS];

    if (
      sourceId === null ||
      track === null ||
      contract === undefined ||
      !sourceId.startsWith(contract.sourcePrefix) ||
      sourceReport !== contract.sourceReport
    ) {
      addIssue(
        issues,
        "namespace-invalid",
        path,
        "Source ID, track and source report must remain in one frozen namespace."
      );
    } else {
      ids.push(sourceId);
      sourceIds.add(sourceId);
      sourceTrackById.set(sourceId, track);
    }
  });
  ensureUnique(ids, "candidateSourceRegistry.sources.sourceId", issues);

  return { sourceIds, sourceTrackById };
}

function validateCandidateClaims(
  asset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  sourceIds: Set<string>,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): Set<string> {
  const claimIds = new Set<string>();
  const root = readRecord(asset, "candidateClaimRegistry", issues);
  if (root === null) {
    return claimIds;
  }

  validateCandidateBoundary(root, "candidateClaimRegistry", issues);
  const claims = readArray(root, "claims", "candidateClaimRegistry", issues) ?? [];
  equalNumber(
    claims.length,
    expected.candidateClaims,
    "candidateClaimRegistry.claims",
    issues
  );

  const ids: string[] = [];
  let resolvedSourceRefs = 0;
  claims.forEach((value, index) => {
    const path = "candidateClaimRegistry.claims[" + index + "]";
    const claim = readRecord(value, path, issues);
    if (claim === null) {
      return;
    }
    validateCandidateBoundary(claim, path, issues);

    const claimId = readString(claim, "claimId", path, issues);
    const track = readString(claim, "track", path, issues);
    const sourceReport = readString(claim, "sourceReport", path, issues);
    const effectType = readString(claim, "effectType", path, issues);
    const testIdea = readString(claim, "testIdea", path, issues);
    const sourceRefs = readStringArray(claim, "sourceRefs", path, issues) ?? [];
    readStringArray(claim, "requiredFacets", path, issues);

    const contract =
      track === null
        ? undefined
        : TRACK_CONTRACTS[track as keyof typeof TRACK_CONTRACTS];
    if (
      claimId === null ||
      contract === undefined ||
      !claimId.startsWith(contract.claimPrefix) ||
      sourceReport !== contract.sourceReport
    ) {
      addIssue(
        issues,
        "namespace-invalid",
        path,
        "Claim ID, track and source report must remain in one frozen namespace."
      );
    } else {
      ids.push(claimId);
      claimIds.add(claimId);
    }

    if (
      effectType === null ||
      effectType.trim() === "" ||
      testIdea === null ||
      testIdea.trim() === ""
    ) {
      addIssue(
        issues,
        "record-invalid",
        path,
        "A candidate effect requires a non-empty executable test idea."
      );
    }

    for (const sourceRef of sourceRefs) {
      if (!sourceIds.has(sourceRef)) {
        addIssue(
          issues,
          "unresolved-source-ref",
          path + ".sourceRefs",
          "Unresolved source reference: " + sourceRef + "."
        );
      } else {
        resolvedSourceRefs += 1;
      }
    }
  });
  ensureUnique(ids, "candidateClaimRegistry.claims.claimId", issues);
  equalNumber(
    resolvedSourceRefs,
    expected.resolvedCandidateSourceRefs,
    "candidateClaimRegistry.resolvedSourceRefs",
    issues
  );

  return claimIds;
}

function validateGlobalSources(
  asset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  sourceIds: Set<string>,
  sourceTrackById: Map<string, string>,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const root = readRecord(asset, "globalCandidateSourceRegistry", issues);
  if (root === null) {
    return;
  }

  validateCandidateBoundary(root, "globalCandidateSourceRegistry", issues);
  const globalSources =
    readArray(root, "globalSources", "globalCandidateSourceRegistry", issues) ?? [];
  equalNumber(
    globalSources.length,
    expected.globalCandidateSources,
    "globalCandidateSourceRegistry.globalSources",
    issues
  );
  equalNumber(
    readNumber(root, "trackAliasCount", "globalCandidateSourceRegistry", issues) ?? -1,
    expected.globalCandidateSourceAliases,
    "globalCandidateSourceRegistry.trackAliasCount",
    issues
  );

  const globalIds: string[] = [];
  const identities: string[] = [];
  const flattenedAliases: string[] = [];
  globalSources.forEach((value, index) => {
    const path = "globalCandidateSourceRegistry.globalSources[" + index + "]";
    const globalSource = readRecord(value, path, issues);
    if (globalSource === null) {
      return;
    }
    validateCandidateBoundary(globalSource, path, issues);
    const globalSourceId = readString(globalSource, "globalSourceId", path, issues);
    const identityKey = readString(globalSource, "identityKey", path, issues);
    const aliases = readArray(globalSource, "trackAliases", path, issues) ?? [];
    equalNumber(
      readNumber(globalSource, "aliasCount", path, issues) ?? -1,
      aliases.length,
      path + ".aliasCount",
      issues
    );

    if (globalSourceId !== null) {
      globalIds.push(globalSourceId);
    }
    if (identityKey !== null) {
      identities.push(identityKey);
    }

    aliases.forEach((aliasValue, aliasIndex) => {
      const aliasPath = path + ".trackAliases[" + aliasIndex + "]";
      const alias = readRecord(aliasValue, aliasPath, issues);
      if (alias === null) {
        return;
      }
      const sourceId = readString(alias, "sourceId", aliasPath, issues);
      const track = readString(alias, "track", aliasPath, issues);
      if (
        sourceId === null ||
        track === null ||
        !sourceIds.has(sourceId) ||
        sourceTrackById.get(sourceId) !== track
      ) {
        addIssue(
          issues,
          "unresolved-source-ref",
          aliasPath,
          "Global alias must resolve exactly one track source."
        );
      } else {
        flattenedAliases.push(sourceId);
      }
    });
  });

  ensureUnique(globalIds, "globalCandidateSourceRegistry.globalSourceId", issues);
  ensureUnique(identities, "globalCandidateSourceRegistry.identityKey", issues);
  ensureUnique(flattenedAliases, "globalCandidateSourceRegistry.trackAliases", issues);
  equalNumber(
    flattenedAliases.length,
    expected.globalCandidateSourceAliases,
    "globalCandidateSourceRegistry.flattenedAliases",
    issues
  );
}

function validateCoreRegistries(
  sourceAsset: unknown,
  claimAsset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const sourceRoot = readRecord(sourceAsset, "coreSourceRegistry", issues);
  const claimRoot = readRecord(claimAsset, "coreClaimRegistry", issues);
  if (sourceRoot === null || claimRoot === null) {
    return;
  }

  const sources = readArray(sourceRoot, "sources", "coreSourceRegistry", issues) ?? [];
  const claims = readArray(claimRoot, "claims", "coreClaimRegistry", issues) ?? [];
  equalNumber(sources.length, expected.coreSources, "coreSourceRegistry.sources", issues);
  equalNumber(claims.length, expected.coreClaims, "coreClaimRegistry.claims", issues);

  const sourceIds = sources.flatMap((value, index) => {
    const source = readRecord(value, "coreSourceRegistry.sources[" + index + "]", issues);
    if (source === null) {
      return [];
    }
    const sourceId = readString(
      source,
      "sourceId",
      "coreSourceRegistry.sources[" + index + "]",
      issues
    );
    return sourceId === null ? [] : [sourceId];
  });
  ensureUnique(sourceIds, "coreSourceRegistry.sources.sourceId", issues);
  const sourceIdSet = new Set(sourceIds);

  const claimIds: string[] = [];
  claims.forEach((value, index) => {
    const path = "coreClaimRegistry.claims[" + index + "]";
    const claim = readRecord(value, path, issues);
    if (claim === null) {
      return;
    }
    const claimId = readString(claim, "claimId", path, issues);
    const status = readString(claim, "status", path, issues);
    const sourceRefs = readStringArray(claim, "sourceRefs", path, issues) ?? [];
    const effects = readArray(claim, "effects", path, issues) ?? [];
    const testIds = readStringArray(claim, "linkedTestIds", path, issues) ?? [];

    if (claimId !== null) {
      claimIds.push(claimId);
    }
    if (status !== "appraised") {
      addIssue(
        issues,
        "record-invalid",
        path + ".status",
        "The frozen core claim registry contains appraised metadata only."
      );
    }
    if (effects.length === 0 || testIds.length === 0) {
      addIssue(
        issues,
        "record-invalid",
        path,
        "Every appraised core claim requires effects and linked tests."
      );
    }
    for (const sourceRef of sourceRefs) {
      if (!sourceIdSet.has(sourceRef)) {
        addIssue(
          issues,
          "unresolved-source-ref",
          path + ".sourceRefs",
          "Unresolved core source reference: " + sourceRef + "."
        );
      }
    }
  });
  ensureUnique(claimIds, "coreClaimRegistry.claims.claimId", issues);
}

function validateRelationships(
  asset: unknown,
  candidateClaimIds: Set<string>,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const root = readRecord(asset, "claimRelationshipRegistry", issues);
  if (root === null) {
    return;
  }
  validateCandidateBoundary(root, "claimRelationshipRegistry", issues);
  const constructs =
    readArray(root, "constructs", "claimRelationshipRegistry", issues) ?? [];
  equalNumber(
    constructs.length,
    expected.crossTrackConstructs,
    "claimRelationshipRegistry.constructs",
    issues
  );

  const ids: string[] = [];
  constructs.forEach((value, index) => {
    const path = "claimRelationshipRegistry.constructs[" + index + "]";
    const construct = readRecord(value, path, issues);
    if (construct === null) {
      return;
    }
    const constructId = readString(construct, "constructId", path, issues);
    const memberClaimRefs =
      readStringArray(construct, "memberClaimRefs", path, issues) ?? [];
    if (constructId !== null) {
      ids.push(constructId);
    }
    for (const claimRef of memberClaimRefs) {
      if (!candidateClaimIds.has(claimRef)) {
        addIssue(
          issues,
          "record-invalid",
          path + ".memberClaimRefs",
          "Relationship membership refers to an unknown candidate claim."
        );
      }
    }
  });
  ensureUnique(ids, "claimRelationshipRegistry.constructId", issues);
}

function validateCandidateContracts(
  accommodationAsset: unknown,
  marketAsset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const accommodation = readRecord(
    accommodationAsset,
    "accommodationContract",
    issues
  );
  const market = readRecord(marketAsset, "marketContextContract", issues);
  if (accommodation === null || market === null) {
    return;
  }

  validateCandidateBoundary(accommodation, "accommodationContract", issues);
  validateCandidateBoundary(market, "marketContextContract", issues);
  const types = readArray(accommodation, "types", "accommodationContract", issues) ?? [];
  equalNumber(types.length, expected.accommodationTypes, "accommodationContract.types", issues);
  const typeIds = types.flatMap((value, index) => {
    const record = readRecord(value, "accommodationContract.types[" + index + "]", issues);
    if (record === null) {
      return [];
    }
    const typeId = readString(
      record,
      "typeId",
      "accommodationContract.types[" + index + "]",
      issues
    );
    return typeId === null ? [] : [typeId];
  });
  ensureUnique(typeIds, "accommodationContract.types.typeId", issues);

  const axes = readRecordProperty(
    market,
    "orthogonalAxes",
    "marketContextContract",
    issues
  );
  const axisCount =
    axes === null
      ? 0
      : [
          "priceRegime",
          "availabilityPressure",
          "eventAttribution",
          "axisSufficiency",
        ].filter((axis) => Object.prototype.hasOwnProperty.call(axes, axis)).length;
  equalNumber(
    axisCount,
    expected.marketContextAxes,
    "marketContextContract.orthogonalAxes",
    issues
  );
}

function validateCandidateManifest(
  asset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const root = readRecord(asset, "candidateRegistryManifest", issues);
  if (root === null) {
    return;
  }
  if (
    readString(root, "validationStatus", "candidateRegistryManifest", issues) !== "pass" ||
    readString(root, "recordStatus", "candidateRegistryManifest", issues) !==
      "candidate-second-pass-required" ||
    readString(root, "rankingInfluence", "candidateRegistryManifest", issues) !== "none"
  ) {
    addIssue(
      issues,
      "manifest-stale",
      "candidateRegistryManifest",
      "Candidate manifest release boundaries are stale or unsafe."
    );
  }

  const counts = readRecordProperty(
    root,
    "actualCounts",
    "candidateRegistryManifest",
    issues
  );
  if (counts !== null) {
    equalNumber(
      readNumber(counts, "sources", "candidateRegistryManifest.actualCounts", issues) ?? -1,
      expected.candidateSourceAliases,
      "candidateRegistryManifest.actualCounts.sources",
      issues
    );
    equalNumber(
      readNumber(counts, "globalSources", "candidateRegistryManifest.actualCounts", issues) ?? -1,
      expected.globalCandidateSources,
      "candidateRegistryManifest.actualCounts.globalSources",
      issues
    );
    equalNumber(
      readNumber(counts, "claims", "candidateRegistryManifest.actualCounts", issues) ?? -1,
      expected.candidateClaims,
      "candidateRegistryManifest.actualCounts.claims",
      issues
    );
  }

  const checks = readRecordProperty(
    root,
    "checks",
    "candidateRegistryManifest",
    issues
  );
  if (
    checks === null ||
    sortedOwnKeys(checks).some((key) => {
      if (typeof key === "symbol") {
        return true;
      }
      const value = readOwnEnumerableDataProperty(
        checks,
        key,
        "candidateRegistryManifest.checks",
        issues
      );
      if (value === INVALID_OWN_PROPERTY) {
        return true;
      }
      return key === "unresolvedSourceRefs"
        ? value !== 0
        : key === "resolvedSourceRefCount"
          ? value !== expected.resolvedCandidateSourceRefs
          : value !== true;
    })
  ) {
    addIssue(
      issues,
      "manifest-stale",
      "candidateRegistryManifest.checks",
      "Candidate manifest checks must remain fully passing."
    );
  }
}

function validatePackageManifest(
  asset: unknown,
  expected: StayOptiDecisionScienceRegistryCountsV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): void {
  const root = readRecord(asset, "packageValidationManifest", issues);
  if (root === null) {
    return;
  }
  if (
    readString(root, "validationStatus", "packageValidationManifest", issues) !== "PASS" ||
    readString(root, "packageFingerprint", "packageValidationManifest", issues) !==
      STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3
  ) {
    addIssue(
      issues,
      "package-manifest-invalid",
      "packageValidationManifest",
      "The frozen package validation identity is not valid."
    );
  }

  const counts = readRecordProperty(
    root,
    "counts",
    "packageValidationManifest",
    issues
  );
  if (counts === null) {
    return;
  }
  const checks: Array<[string, keyof StayOptiDecisionScienceRegistryCountsV3]> = [
    ["files", "packageFiles"],
    ["coreSources", "coreSources"],
    ["coreClaims", "coreClaims"],
    ["candidateSources", "candidateSourceAliases"],
    ["globalCandidateSources", "globalCandidateSources"],
    ["globalCandidateSourceAliases", "globalCandidateSourceAliases"],
    ["candidateClaims", "candidateClaims"],
    ["resolvedCandidateSourceRefs", "resolvedCandidateSourceRefs"],
    ["booksManualsAndStandards", "booksManualsAndStandards"],
    ["crossTrackConstructs", "crossTrackConstructs"],
    ["accommodationTypes", "accommodationTypes"],
    ["marketContextAxes", "marketContextAxes"],
    ["potentialSecretFindings", "potentialSecretFindings"],
  ];
  for (const [sourceKey, expectedKey] of checks) {
    equalNumber(
      readNumber(counts, sourceKey, "packageValidationManifest.counts", issues) ?? -1,
      expected[expectedKey],
      "packageValidationManifest.counts." + sourceKey,
      issues
    );
  }
}

function expectedCountsFromManifest(
  manifest: ImportManifestV3,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): StayOptiDecisionScienceRegistryCountsV3 {
  const result = {
    ...EMPTY_COUNTS,
  };
  const counts = readRecord(
    manifest.expectedCounts,
    "importManifest.expectedCounts",
    issues
  );
  if (counts === null) {
    return result;
  }

  for (const key of EXPECTED_COUNT_KEYS) {
    const value = readNumber(
      counts,
      key,
      "importManifest.expectedCounts",
      issues
    );
    if (value === null || !Number.isInteger(value) || value < 0) {
      addIssue(
        issues,
        "primitive-required",
        "importManifest.expectedCounts." + key,
        "Expected a non-negative integer."
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function normalizeDecisionScienceRegistryPathV3(path: unknown): string {
  if (typeof path !== "string") {
    throw new Error("Decision Science registry path must be a string.");
  }
  if (path === "" || /^[\\/]|^[a-zA-Z]:/.test(path)) {
    throw new Error("Decision Science registry path must be relative.");
  }

  const parts = path.replace(/\\/g, "/").split("/");
  if (
    parts.some(
      (part) =>
        part === "" ||
        part === "." ||
        part === ".."
    )
  ) {
    throw new Error("Decision Science registry path is not canonical and safe.");
  }

  return parts.join("/");
}

export function resolveDecisionScienceRegistryModeV3(
  value: unknown
): StayOptiDecisionScienceRegistryModeV3 {
  return value === "registry-only" ? "registry-only" : "off";
}

function parseImportManifest(
  text: string,
  issues: StayOptiDecisionScienceRegistryIssueV3[]
): ImportManifestV3 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    addIssue(
      issues,
      "import-manifest-invalid",
      "importManifest",
      "Import manifest is not valid JSON."
    );
    return null;
  }
  const manifest = readRecord(parsed, "importManifest", issues);
  if (manifest === null) {
    return null;
  }

  const {
    registryFingerprint: _rawRegistryFingerprint,
    ...rawFingerprintPayload
  } = manifest;
  const calculatedRawFingerprint = createStableHashV3(
    rawFingerprintPayload,
    IMPORT_FINGERPRINT_NAMESPACE
  );
  if (
    manifest.registryFingerprint !==
      STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3 ||
    calculatedRawFingerprint !==
      STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3
  ) {
    addIssue(
      issues,
      "import-manifest-invalid",
      "importManifest",
      "Raw import manifest fingerprint is invalid."
    );
  }
  scanRankAndSensitiveFields(manifest, "importManifest", issues);
  validateExactKeys(manifest, MANIFEST_ROOT_KEYS, "importManifest", issues);

  const issueCountBeforeStructure = issues.length;
  const schemaVersion = readString(
    manifest,
    "schemaVersion",
    "importManifest",
    issues
  );
  const importId = readString(
    manifest,
    "importId",
    "importManifest",
    issues
  );
  const libraryVersion = readString(
    manifest,
    "libraryVersion",
    "importManifest",
    issues
  );
  const packageFingerprint = readString(
    manifest,
    "packageFingerprint",
    "importManifest",
    issues
  );
  const registryFingerprint = readString(
    manifest,
    "registryFingerprint",
    "importManifest",
    issues
  );
  const sourceArchive = readRecordProperty(
    manifest,
    "sourceArchive",
    "importManifest",
    issues
  );
  const mode = readRecordProperty(
    manifest,
    "mode",
    "importManifest",
    issues
  );
  const expectedCounts = readRecordProperty(
    manifest,
    "expectedCounts",
    "importManifest",
    issues
  );
  const assetValues = readArray(manifest, "assets", "importManifest", issues);
  if (
    schemaVersion === null ||
    importId === null ||
    libraryVersion === null ||
    packageFingerprint === null ||
    registryFingerprint === null ||
    sourceArchive === null ||
    mode === null ||
    expectedCounts === null ||
    assetValues === null
  ) {
    return null;
  }

  validateExactKeys(
    sourceArchive,
    SOURCE_ARCHIVE_KEYS,
    "importManifest.sourceArchive",
    issues
  );
  validateExactKeys(mode, MODE_KEYS, "importManifest.mode", issues);
  validateExactKeys(
    expectedCounts,
    EXPECTED_COUNT_KEYS,
    "importManifest.expectedCounts",
    issues
  );

  const sourceArchiveFileName = readString(
    sourceArchive,
    "fileName",
    "importManifest.sourceArchive",
    issues
  );
  const sourceArchiveSha256 = readString(
    sourceArchive,
    "sha256",
    "importManifest.sourceArchive",
    issues
  );
  const modeDefault = readString(
    mode,
    "default",
    "importManifest.mode",
    issues
  );
  const modeAllowed = readStringArray(
    mode,
    "allowed",
    "importManifest.mode",
    issues
  );
  const modeRankingInfluence = readString(
    mode,
    "rankingInfluence",
    "importManifest.mode",
    issues
  );
  const decisionCoreImportAllowed = readBoolean(
    mode,
    "decisionCoreImportAllowed",
    "importManifest.mode",
    issues
  );
  const publicImportAllowed = readBoolean(
    mode,
    "publicImportAllowed",
    "importManifest.mode",
    issues
  );
  const traceAllowed = readBoolean(
    mode,
    "traceAllowed",
    "importManifest.mode",
    issues
  );

  const assets: ImportAssetV3[] = [];
  assetValues.forEach((value, index) => {
    const path = "importManifest.assets[" + index + "]";
    const asset = readRecord(value, path, issues);
    if (asset === null) {
      return;
    }
    validateExactKeys(asset, MANIFEST_ASSET_KEYS, path, issues);

    const assetPath = readString(asset, "path", path, issues);
    const bytes = readNumber(asset, "bytes", path, issues);
    const sha256 = readString(asset, "sha256", path, issues);
    const role = readString(asset, "role", path, issues);
    if (
      assetPath !== null &&
      bytes !== null &&
      sha256 !== null &&
      role !== null
    ) {
      assets.push({
        path: assetPath,
        bytes,
        sha256,
        role,
      });
    }
  });

  if (
    sourceArchiveFileName === null ||
    sourceArchiveSha256 === null ||
    modeDefault === null ||
    modeAllowed === null ||
    modeRankingInfluence === null ||
    decisionCoreImportAllowed === null ||
    publicImportAllowed === null ||
    traceAllowed === null ||
    issues.length !== issueCountBeforeStructure
  ) {
    return null;
  }

  const parsedManifest: ImportManifestV3 = {
    schemaVersion,
    importId,
    libraryVersion,
    sourceArchive: {
      fileName: sourceArchiveFileName,
      sha256: sourceArchiveSha256,
    },
    packageFingerprint,
    mode: {
      default: modeDefault,
      allowed: modeAllowed,
      rankingInfluence: modeRankingInfluence,
      decisionCoreImportAllowed,
      publicImportAllowed,
      traceAllowed,
    },
    expectedCounts:
      expectedCounts as unknown as StayOptiDecisionScienceRegistryCountsV3,
    assets,
    registryFingerprint,
  };

  if (
    parsedManifest.schemaVersion !== "1.0.0" ||
    parsedManifest.importId !== IMPORT_ID ||
    parsedManifest.libraryVersion !==
      STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3 ||
    parsedManifest.sourceArchive.sha256 !== SOURCE_ARCHIVE_SHA256 ||
    parsedManifest.packageFingerprint !==
      STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3 ||
    parsedManifest.mode.default !== "off" ||
    JSON.stringify(parsedManifest.mode.allowed) !==
      JSON.stringify(["off", "registry-only"]) ||
    parsedManifest.mode.rankingInfluence !== "none" ||
    parsedManifest.mode.decisionCoreImportAllowed !== false ||
    parsedManifest.mode.publicImportAllowed !== false ||
    parsedManifest.mode.traceAllowed !== false
  ) {
    addIssue(
      issues,
      "import-manifest-invalid",
      "importManifest",
      "Import manifest identity, mode boundary or fingerprint is invalid."
    );
  }

  return parsedManifest;
}

async function sha256Hex(value: string): Promise<string> {
  if (globalThis.crypto?.subtle === undefined) {
    throw new Error("SHA-256 is unavailable in this runtime.");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function validateDecisionScienceRegistryRecordsV3(
  records: Readonly<Record<string, unknown>>,
  expected: StayOptiDecisionScienceRegistryCountsV3
): StayOptiDecisionScienceRegistryValidationV3 {
  const issues: StayOptiDecisionScienceRegistryIssueV3[] = [];
  scanRankAndSensitiveFields(records, "records", issues);

  const {
    sourceIds,
    sourceTrackById,
  } = validateCandidateSources(
    records["data/candidate_source_registry.json"],
    expected,
    issues
  );
  const candidateClaimIds = validateCandidateClaims(
    records["data/candidate_claim_registry.json"],
    expected,
    sourceIds,
    issues
  );
  validateGlobalSources(
    records["data/global_candidate_source_registry.json"],
    expected,
    sourceIds,
    sourceTrackById,
    issues
  );
  validateCoreRegistries(
    records["data/source_registry.json"],
    records["data/claim_registry.json"],
    expected,
    issues
  );
  validateRelationships(
    records["data/claim_relationship_registry.json"],
    candidateClaimIds,
    expected,
    issues
  );
  validateCandidateContracts(
    records["data/accommodation_type_decision_facets.json"],
    records["data/season_local_market_context_contract.json"],
    expected,
    issues
  );
  validateCandidateManifest(
    records["data/candidate_registry_manifest.json"],
    expected,
    issues
  );
  validatePackageManifest(
    records["data/package_validation_manifest.json"],
    expected,
    issues
  );

  issues.sort(compareIssues);
  return {
    valid: issues.length === 0,
    issues,
    counts: issues.length === 0 ? { ...expected } : null,
  };
}

function baseLoadResult(
  requestedMode: unknown,
  resolvedMode: StayOptiDecisionScienceRegistryModeV3,
  status: "off" | "ready" | "blocked",
  issues: StayOptiDecisionScienceRegistryIssueV3[],
  registry: StayOptiDecisionScienceOpaqueRegistryV3 | null
): StayOptiDecisionScienceRegistryLoadResultV3 {
  return {
    requestedMode,
    resolvedMode,
    status,
    rankingInfluence: "none",
    decisionCoreChanged: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitEnabled: false,
    traceEnabled: false,
    goldenIncrement: 0,
    adversarialIncrement: 0,
    counterfactualIncrement: 0,
    humanJudgmentIncrement: 0,
    expertJudgmentIncrement: 0,
    aiJudgmentIncrement: 0,
    issues,
    registry,
  };
}

async function loadDecisionScienceRegistryOnlyUncheckedV3(
  requestedMode: unknown = STAYOPTI_DECISION_SCIENCE_REGISTRY_MODE_DEFAULT_V3,
  importer?: StayOptiDecisionScienceRegistryImporterV3
): Promise<StayOptiDecisionScienceRegistryLoadResultV3> {
  const resolvedMode = resolveDecisionScienceRegistryModeV3(requestedMode);
  if (resolvedMode === "off") {
    return baseLoadResult(requestedMode, resolvedMode, "off", [], null);
  }

  if (importer === undefined) {
    return baseLoadResult(
      requestedMode,
      resolvedMode,
      "blocked",
      [{
        code: "asset-set-invalid",
        path: "importer",
        detail: "Registry-only mode requires an explicit offline importer.",
      }],
      null
    );
  }

  let imported: unknown;
  try {
    imported = await importer();
  } catch {
    return baseLoadResult(
      requestedMode,
      resolvedMode,
      "blocked",
      [{
        code: "asset-set-invalid",
        path: "importer",
        detail: "Offline registry import failed; no registry was exposed.",
      }],
      null
    );
  }

  const issues: StayOptiDecisionScienceRegistryIssueV3[] = [];
  const input = parseImportInput(imported, issues);
  if (input === null) {
    issues.sort(compareIssues);
    return baseLoadResult(requestedMode, resolvedMode, "blocked", issues, null);
  }
  const manifest = parseImportManifest(input.importManifest, issues);
  if (manifest === null) {
    issues.sort(compareIssues);
    return baseLoadResult(requestedMode, resolvedMode, "blocked", issues, null);
  }
  const expected = expectedCountsFromManifest(manifest, issues);

  const textByPath = new Map<string, string>();
  for (const asset of input.assets) {
    let path: string;
    try {
      path = normalizeDecisionScienceRegistryPathV3(asset.path);
    } catch {
      addIssue(
        issues,
        "path-invalid",
        "assets",
        "Asset path is unsafe or non-portable."
      );
      continue;
    }
    if (textByPath.has(path)) {
      addIssue(
        issues,
        "asset-set-invalid",
        path,
        "Duplicate or path-equivalent asset."
      );
    }
    textByPath.set(path, asset.content);
  }

  const manifestPaths = manifest.assets.map((asset) => asset.path);
  const expectedPaths = [...EXPECTED_ASSET_PATHS];
  if (
    JSON.stringify(manifestPaths) !== JSON.stringify(expectedPaths) ||
    JSON.stringify([...textByPath.keys()].sort()) !==
      JSON.stringify([...expectedPaths].sort())
  ) {
    addIssue(
      issues,
      "asset-set-invalid",
      "assets",
      "Imported asset set differs from the frozen registry-only subset."
    );
  }

  const records: Record<string, unknown> = {};
  for (const asset of manifest.assets) {
    let path: string;
    try {
      path = normalizeDecisionScienceRegistryPathV3(asset.path);
    } catch {
      addIssue(
        issues,
        "path-invalid",
        "importManifest.assets",
        "Manifest asset path is unsafe or non-portable."
      );
      continue;
    }
    if (
      typeof asset.bytes !== "number" ||
      !Number.isInteger(asset.bytes) ||
      asset.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      typeof asset.role !== "string"
    ) {
      addIssue(
        issues,
        "import-manifest-invalid",
        path,
        "Asset metadata must use primitive, frozen values."
      );
      continue;
    }

    const content = textByPath.get(path);
    if (content === undefined) {
      continue;
    }
    const bytes = new TextEncoder().encode(content).byteLength;
    let sha256: string;
    try {
      sha256 = await sha256Hex(content);
    } catch {
      addIssue(
        issues,
        "asset-hash-mismatch",
        path,
        "SHA-256 verification was unavailable; import failed closed."
      );
      continue;
    }
    if (bytes !== asset.bytes || sha256 !== asset.sha256) {
      addIssue(
        issues,
        "asset-hash-mismatch",
        path,
        "Vendored bytes do not match the frozen package asset."
      );
      continue;
    }
    try {
      records[path] = JSON.parse(content);
    } catch {
      addIssue(
        issues,
        "record-invalid",
        path,
        "Registry asset is not valid JSON."
      );
    }
  }

  if (issues.length === 0) {
    const validation = validateDecisionScienceRegistryRecordsV3(
      records,
      expected
    );
    issues.push(...validation.issues);
  }
  let qualifiedClaimIdentityOverlay:
    Readonly<QualifiedClaimIdentityOverlayV3> | null = null;
  let qualifiedClaimResolver: QualifiedClaimExactResolverV3 | null = null;
  if (issues.length === 0) {
    const overlayResult = await buildQualifiedClaimIdentityOverlayV3({
      libraryRelease:
        STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3,
      packageFingerprint:
        STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3,
      manifestAssets: manifest.assets.map((asset) => ({
        path: asset.path,
        role: asset.role,
        sha256: asset.sha256,
      })),
      records,
    });
    if (overlayResult.status === "blocked") {
      issues.push(...overlayResult.issues.map((issue) => ({
        code: "qualified-identity-invalid" as const,
        path: issue.path,
        detail: `${issue.code}: ${issue.detail}`,
      })));
    } else {
      qualifiedClaimIdentityOverlay = overlayResult.overlay;
      qualifiedClaimResolver = overlayResult.resolver;
    }
  }
  issues.sort(compareIssues);
  if (
    issues.length > 0 ||
    qualifiedClaimIdentityOverlay === null ||
    qualifiedClaimResolver === null
  ) {
    return baseLoadResult(requestedMode, resolvedMode, "blocked", issues, null);
  }

  const registry = deepFreeze({
    libraryVersion:
      STAYOPTI_DECISION_SCIENCE_REGISTRY_LIBRARY_VERSION_V3,
    packageFingerprint:
      STAYOPTI_DECISION_SCIENCE_REGISTRY_PACKAGE_FINGERPRINT_V3,
    registryFingerprint:
      STAYOPTI_DECISION_SCIENCE_REGISTRY_IMPORT_FINGERPRINT_V3,
    mode: "registry-only" as const,
    rankingInfluence: "none" as const,
    candidateRecordsCanInfluenceDecision: false as const,
    traceAttached: false as const,
    publicImportAllowed: false as const,
    counts: {
      ...expected,
    },
    records,
    qualifiedClaimIdentityOverlay,
    qualifiedClaimResolver,
  });

  return baseLoadResult(
    requestedMode,
    resolvedMode,
    "ready",
    [],
    registry
  );
}

export async function loadDecisionScienceRegistryOnlyV3(
  requestedMode: unknown = STAYOPTI_DECISION_SCIENCE_REGISTRY_MODE_DEFAULT_V3,
  importer?: StayOptiDecisionScienceRegistryImporterV3
): Promise<StayOptiDecisionScienceRegistryLoadResultV3> {
  let resolvedMode: StayOptiDecisionScienceRegistryModeV3 = "off";
  try {
    resolvedMode = resolveDecisionScienceRegistryModeV3(requestedMode);
    return await loadDecisionScienceRegistryOnlyUncheckedV3(
      requestedMode,
      importer
    );
  } catch {
    return baseLoadResult(
      requestedMode,
      resolvedMode,
      "blocked",
      [{
        code: "asset-set-invalid",
        path: "registry-only-validation",
        detail: "Unexpected registry validation failure; import failed closed.",
      }],
      null
    );
  }
}

export const STAYOPTI_DECISION_SCIENCE_REGISTRY_ONLY_AUDIT_V3 =
  Object.freeze({
    defaultMode: "off" as const,
    allowedEnabledMode: "registry-only" as const,
    importedByDecisionCore: false as const,
    importedByPublicBarrel: false as const,
    traceEnabled: false as const,
    applicabilityEnabled: false as const,
    contributionLedgerEnabled: false as const,
    teacherLabEnabled: false as const,
    policyShadowEnabled: false as const,
    rankingInfluence: "none" as const,
    publicV2Changed: false as const,
    publicV3Enabled: false as const,
    splitEnabled: false as const,
    providerCallsAllowed: false as const,
    commercialInputsAllowed: false as const,
  });
