import {
  STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_VERSION_V3,
  STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
  STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3,
  STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
  canonicalizeQualifiedClaimJsonV3,
  deepFreezeQualifiedClaimValueV3,
  parseQualifiedClaimKeyV3,
  serializeQualifiedClaimIdentityV3,
  sha256QualifiedClaimTextV3,
  type QualifiedCandidateTrackV3,
  type QualifiedClaimReleaseBindingV3,
} from "./qualifiedClaimIdentityV3";

export const STAYOPTI_QUALIFIED_CLAIM_OVERLAY_SCHEMA_VERSION_V3 =
  "stayopti.dsl.claim-overlay@1" as const;

export const STAYOPTI_QUALIFIED_CLAIM_OVERLAY_FINGERPRINT_V3 =
  "sha256-43d6b3b0fe6477fc6e2fe20531df5678a98098461bb7327381aace301f0614fe" as const;

export const STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3 =
  "sha256-aaa3e1b20345751ac435100e8a7d6ba025c950779e2888d5698bbd65b2b56907" as const;

export interface QualifiedClaimOverlayManifestAssetV3 {
  path: string;
  role: string;
  sha256: string;
}

export interface QualifiedClaimOverlayBuildInputV3 {
  libraryRelease: typeof STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3;
  packageFingerprint: typeof STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3;
  manifestAssets: QualifiedClaimOverlayManifestAssetV3[];
  records: Record<string, unknown>;
}

export interface QualifiedClaimRelationshipBindingV3 {
  relationshipRegistrySchemaVersion: "1.1.0";
  sourceAssetPath: "data/claim_relationship_registry.json";
  sourceAssetDigestSha256: `sha256-${string}`;
  constructId: string;
  memberIndex: number;
  bareClaimRef: string;
  qualifiedKey: string;
}

export interface QualifiedClaimIdentityOverlayCountsV3 {
  totalClaims: 150;
  coreClaims: 5;
  candidateClaims: 145;
  qualifiedKeys: 150;
  relationshipBindings: 198;
  distinctReferencedCandidateClaims: 119;
  candidateClaimsWithoutConstruct: 26;
  qualifiedKeyCollisions: 0;
}

export interface QualifiedClaimIdentityOverlayV3 {
  overlaySchemaVersion:
    typeof STAYOPTI_QUALIFIED_CLAIM_OVERLAY_SCHEMA_VERSION_V3;
  canonicalJsonVersion:
    typeof STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_VERSION_V3;
  identityNamespace: typeof STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3;
  identitySchemaVersion:
    typeof STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3;
  libraryRelease: typeof STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3;
  packageFingerprint: typeof STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3;
  rankingInfluence: "none";
  claimBindings: readonly Readonly<QualifiedClaimReleaseBindingV3>[];
  relationshipBindings:
    readonly Readonly<QualifiedClaimRelationshipBindingV3>[];
  counts: Readonly<QualifiedClaimIdentityOverlayCountsV3>;
  overlayFingerprintSha256: `sha256-${string}`;
}

export type QualifiedClaimOverlayIssueCodeV3 =
  | "asset-binding-invalid"
  | "canonical-json-invalid"
  | "claim-record-invalid"
  | "claim-unknown"
  | "identity-invalid"
  | "input-shape-invalid"
  | "overlay-count-invalid"
  | "overlay-fingerprint-invalid"
  | "qualified-key-collision"
  | "reference-ambiguous"
  | "reference-unresolved"
  | "relationship-record-invalid";

export interface QualifiedClaimOverlayIssueV3 {
  code: QualifiedClaimOverlayIssueCodeV3;
  path: string;
  detail: string;
}

export type QualifiedClaimOverlayBuildResultV3 =
  | {
      status: "ready";
      overlay: Readonly<QualifiedClaimIdentityOverlayV3>;
      resolver: QualifiedClaimExactResolverV3;
      issues: readonly [];
    }
  | {
      status: "blocked";
      overlay: null;
      resolver: null;
      issues: readonly QualifiedClaimOverlayIssueV3[];
    };

export type QualifiedClaimResolutionV3 =
  | {
      status: "resolved";
      binding: Readonly<QualifiedClaimReleaseBindingV3>;
      issues: readonly [];
    }
  | {
      status: "blocked";
      binding: null;
      issues: readonly QualifiedClaimOverlayIssueV3[];
    };

export interface QualifiedClaimExactResolverV3 {
  resolve(qualifiedKey: unknown): QualifiedClaimResolutionV3;
}

const EXPECTED_ASSET_ROLES = deepFreezeQualifiedClaimValueV3({
  "data/accommodation_type_decision_facets.json":
    "candidate-accommodation-contract",
  "data/candidate_claim_registry.json": "candidate-claim-registry",
  "data/candidate_registry_manifest.json": "candidate-registry-manifest",
  "data/candidate_source_registry.json": "candidate-source-registry",
  "data/claim_registry.json": "appraised-core-claim-registry",
  "data/claim_relationship_registry.json":
    "candidate-relationship-membership-registry",
  "data/global_candidate_source_registry.json":
    "candidate-global-source-alias-registry",
  "data/package_validation_manifest.json":
    "frozen-package-validation-manifest",
  "data/season_local_market_context_contract.json":
    "candidate-market-context-contract",
  "data/source_registry.json": "appraised-core-source-registry",
} as const);

const EXPECTED_ASSET_PATHS = Object.keys(EXPECTED_ASSET_ROLES).sort(compareOrdinal);
const CORE_CLAIM_ASSET_PATH = "data/claim_registry.json";
const CANDIDATE_CLAIM_ASSET_PATH = "data/candidate_claim_registry.json";
const RELATIONSHIP_ASSET_PATH = "data/claim_relationship_registry.json";
const CLAIM_ID_PATTERN = /^CLM-[A-Z]{2,3}-[0-9]{3}$/;
const CONSTRUCT_ID_PATTERN = /^CST-[A-Z-]+-[0-9]{3}$/;
const RAW_SHA256_PATTERN = /^[a-f0-9]{64}$/;

const CANDIDATE_TRACKS = new Set<QualifiedCandidateTrackV3>([
  "accommodation-types-and-unit",
  "behavioral-decision-science",
  "hospitality-guest-experience",
  "season-and-local-market",
  "travel-value-risk",
]);

const CANDIDATE_TRACK_CLAIM_PREFIXES: Readonly<
  Record<QualifiedCandidateTrackV3, string>
> = deepFreezeQualifiedClaimValueV3({
  "accommodation-types-and-unit": "CLM-ACC-",
  "behavioral-decision-science": "CLM-BEH-",
  "hospitality-guest-experience": "CLM-HOS-",
  "season-and-local-market": "CLM-SEA-",
  "travel-value-risk": "CLM-TRV-",
});

const INVALID_VALUE = Symbol("invalid-value");

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareIssues(
  left: QualifiedClaimOverlayIssueV3,
  right: QualifiedClaimOverlayIssueV3
): number {
  return (
    compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.path, right.path) ||
    compareOrdinal(left.detail, right.detail)
  );
}

function addIssue(
  issues: QualifiedClaimOverlayIssueV3[],
  code: QualifiedClaimOverlayIssueCodeV3,
  path: string,
  detail: string
): void {
  issues.push({ code, path, detail });
}

function blockedOverlay(
  issues: QualifiedClaimOverlayIssueV3[]
): QualifiedClaimOverlayBuildResultV3 {
  issues.sort(compareIssues);
  return {
    status: "blocked",
    overlay: null,
    resolver: null,
    issues: deepFreezeQualifiedClaimValueV3(issues),
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readOwnDataValue(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: QualifiedClaimOverlayIssueV3[]
): unknown | typeof INVALID_VALUE {
  if (!Object.hasOwn(record, key)) {
    addIssue(
      issues,
      "claim-record-invalid",
      `${path}.${key}`,
      "Required fields must be own properties."
    );
    return INVALID_VALUE;
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
      "claim-record-invalid",
      `${path}.${key}`,
      "Required fields must be enumerable own data properties."
    );
    return INVALID_VALUE;
  }
  return descriptor.value;
}

function asPlainRecord(
  value: unknown,
  path: string,
  issues: QualifiedClaimOverlayIssueV3[],
  code: QualifiedClaimOverlayIssueCodeV3 = "claim-record-invalid"
): Record<string, unknown> | null {
  if (!isPlainRecord(value)) {
    addIssue(issues, code, path, "Expected a plain or null-prototype object.");
    return null;
  }
  return value;
}

function asDenseArray(
  value: unknown,
  path: string,
  issues: QualifiedClaimOverlayIssueV3[]
): unknown[] | null {
  const canonical = canonicalizeQualifiedClaimJsonV3(value);
  if (canonical.status === "blocked" || !Array.isArray(value)) {
    addIssue(
      issues,
      "claim-record-invalid",
      path,
      "Expected a canonical dense JSON array."
    );
    return null;
  }
  return value;
}

function validateBuildInputShape(
  input: unknown,
  issues: QualifiedClaimOverlayIssueV3[]
): QualifiedClaimOverlayBuildInputV3 | null {
  const canonical = canonicalizeQualifiedClaimJsonV3(input);
  if (canonical.status === "blocked") {
    addIssue(
      issues,
      "canonical-json-invalid",
      "overlayInput",
      canonical.issues.map((issue) => issue.detail).join("; ")
    );
    return null;
  }
  const record = asPlainRecord(input, "overlayInput", issues, "input-shape-invalid");
  if (record === null) {
    return null;
  }
  const expectedKeys = new Set([
    "libraryRelease",
    "packageFingerprint",
    "manifestAssets",
    "records",
  ]);
  const actualKeys = Reflect.ownKeys(record);
  if (
    actualKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key)) ||
    expectedKeys.size !== actualKeys.length
  ) {
    addIssue(
      issues,
      "input-shape-invalid",
      "overlayInput",
      "Overlay input is a closed-shape object."
    );
    return null;
  }
  const libraryRelease = readOwnDataValue(
    record,
    "libraryRelease",
    "overlayInput",
    issues
  );
  const packageFingerprint = readOwnDataValue(
    record,
    "packageFingerprint",
    "overlayInput",
    issues
  );
  const manifestAssets = readOwnDataValue(
    record,
    "manifestAssets",
    "overlayInput",
    issues
  );
  const records = readOwnDataValue(record, "records", "overlayInput", issues);
  if (
    libraryRelease !== STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3 ||
    packageFingerprint !== STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3 ||
    !Array.isArray(manifestAssets) ||
    !isPlainRecord(records)
  ) {
    addIssue(
      issues,
      "input-shape-invalid",
      "overlayInput",
      "Overlay release, package, manifest assets or records are invalid."
    );
    return null;
  }
  return {
    libraryRelease,
    packageFingerprint,
    manifestAssets: manifestAssets as QualifiedClaimOverlayManifestAssetV3[],
    records,
  };
}

function validateAssetBindings(
  input: QualifiedClaimOverlayBuildInputV3,
  issues: QualifiedClaimOverlayIssueV3[]
): Map<string, QualifiedClaimOverlayManifestAssetV3> {
  const result = new Map<string, QualifiedClaimOverlayManifestAssetV3>();
  const manifestPaths: string[] = [];
  for (let index = 0; index < input.manifestAssets.length; index += 1) {
    const path = `overlayInput.manifestAssets[${index}]`;
    const value = input.manifestAssets[index] as unknown;
    const asset = asPlainRecord(value, path, issues, "asset-binding-invalid");
    if (asset === null) {
      continue;
    }
    const keys = Reflect.ownKeys(asset);
    if (
      keys.length !== 3 ||
      keys.some(
        (key) =>
          typeof key !== "string" ||
          !["path", "role", "sha256"].includes(key)
      )
    ) {
      addIssue(
        issues,
        "asset-binding-invalid",
        path,
        "Manifest asset binding is a closed-shape object."
      );
      continue;
    }
    const assetPath = readOwnDataValue(asset, "path", path, issues);
    const role = readOwnDataValue(asset, "role", path, issues);
    const sha256 = readOwnDataValue(asset, "sha256", path, issues);
    if (
      typeof assetPath !== "string" ||
      typeof role !== "string" ||
      typeof sha256 !== "string" ||
      !RAW_SHA256_PATTERN.test(sha256) ||
      assetPath.includes("\\") ||
      assetPath.startsWith("/") ||
      /^[A-Za-z]:/.test(assetPath) ||
      assetPath.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      addIssue(
        issues,
        "asset-binding-invalid",
        path,
        "Manifest paths must stay canonical POSIX paths with frozen raw SHA-256."
      );
      continue;
    }
    const expectedRole = EXPECTED_ASSET_ROLES[
      assetPath as keyof typeof EXPECTED_ASSET_ROLES
    ];
    if (expectedRole === undefined || role !== expectedRole || result.has(assetPath)) {
      addIssue(
        issues,
        "asset-binding-invalid",
        path,
        "Unknown, duplicate or role-mismatched manifest asset."
      );
      continue;
    }
    const typedAsset: QualifiedClaimOverlayManifestAssetV3 = {
      path: assetPath,
      role,
      sha256,
    };
    result.set(assetPath, typedAsset);
    manifestPaths.push(assetPath);
  }

  manifestPaths.sort(compareOrdinal);
  const recordPaths = Reflect.ownKeys(input.records)
    .filter((key): key is string => typeof key === "string")
    .sort(compareOrdinal);
  if (
    JSON.stringify(manifestPaths) !== JSON.stringify(EXPECTED_ASSET_PATHS) ||
    JSON.stringify(recordPaths) !== JSON.stringify(EXPECTED_ASSET_PATHS) ||
    Reflect.ownKeys(input.records).some((key) => typeof key === "symbol")
  ) {
    addIssue(
      issues,
      "asset-binding-invalid",
      "overlayInput",
      "The overlay requires exactly the frozen ten-asset registry subset."
    );
  }
  return result;
}

async function digestCanonicalRecord(
  record: unknown,
  path: string,
  issues: QualifiedClaimOverlayIssueV3[]
): Promise<`sha256-${string}` | null> {
  const canonical = canonicalizeQualifiedClaimJsonV3(record);
  if (canonical.status === "blocked") {
    addIssue(
      issues,
      "canonical-json-invalid",
      path,
      canonical.issues.map((issue) => issue.detail).join("; ")
    );
    return null;
  }
  try {
    return await sha256QualifiedClaimTextV3(canonical.canonicalJson);
  } catch {
    addIssue(
      issues,
      "canonical-json-invalid",
      path,
      "SHA-256 is unavailable for the canonical record digest."
    );
    return null;
  }
}

async function deriveCoreBindings(
  asset: unknown,
  sourceDigestRaw: string,
  issues: QualifiedClaimOverlayIssueV3[]
): Promise<QualifiedClaimReleaseBindingV3[]> {
  const root = asPlainRecord(asset, "coreClaimRegistry", issues);
  if (root === null) {
    return [];
  }
  const schemaVersion = readOwnDataValue(
    root,
    "schemaVersion",
    "coreClaimRegistry",
    issues
  );
  const registryStatus = readOwnDataValue(
    root,
    "status",
    "coreClaimRegistry",
    issues
  );
  const claimsValue = readOwnDataValue(root, "claims", "coreClaimRegistry", issues);
  const claims = asDenseArray(claimsValue, "coreClaimRegistry.claims", issues);
  if (
    schemaVersion !== "1.0.0" ||
    registryStatus !== "research-in-progress-no-ranking-influence" ||
    claims === null ||
    claims.length !== 5
  ) {
    addIssue(
      issues,
      "claim-record-invalid",
      "coreClaimRegistry",
      "Frozen core registry schema, status or count is invalid."
    );
    return [];
  }

  const bindings: QualifiedClaimReleaseBindingV3[] = [];
  for (let index = 0; index < claims.length; index += 1) {
    const path = `coreClaimRegistry.claims[${index}]`;
    const claim = asPlainRecord(claims[index], path, issues);
    if (claim === null) {
      continue;
    }
    const claimId = readOwnDataValue(claim, "claimId", path, issues);
    const version = readOwnDataValue(claim, "version", path, issues);
    const status = readOwnDataValue(claim, "status", path, issues);
    if (
      typeof claimId !== "string" ||
      !CLAIM_ID_PATTERN.test(claimId) ||
      version !== 1 ||
      status !== "appraised" ||
      Object.hasOwn(claim, "track")
    ) {
      addIssue(
        issues,
        "claim-record-invalid",
        path,
        "Core claim ID, explicit v1, appraised status or null-track contract failed."
      );
      continue;
    }
    const identityResult = serializeQualifiedClaimIdentityV3({
      namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
      identitySchemaVersion:
        STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
      registryScope: "core-appraised",
      track: null,
      claimId,
      claimVersion: 1,
    });
    const recordDigest = await digestCanonicalRecord(claim, path, issues);
    if (identityResult.status === "blocked" || recordDigest === null) {
      addIssue(
        issues,
        "identity-invalid",
        path,
        "Core claim could not be assigned a qualified identity."
      );
      continue;
    }
    bindings.push({
      identity: identityResult.identity,
      qualifiedKey: identityResult.qualifiedKey,
      claimStatus: "appraised",
      libraryRelease: STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3,
      registrySchemaVersion: "1.0.0",
      sourceAssetPath: CORE_CLAIM_ASSET_PATH,
      sourceAssetDigestSha256: `sha256-${sourceDigestRaw}`,
      recordDigestSha256: recordDigest,
    });
  }
  return bindings;
}

async function deriveCandidateBindings(
  asset: unknown,
  sourceDigestRaw: string,
  issues: QualifiedClaimOverlayIssueV3[]
): Promise<QualifiedClaimReleaseBindingV3[]> {
  const root = asPlainRecord(asset, "candidateClaimRegistry", issues);
  if (root === null) {
    return [];
  }
  const schemaVersion = readOwnDataValue(
    root,
    "schemaVersion",
    "candidateClaimRegistry",
    issues
  );
  const registryStatus = readOwnDataValue(
    root,
    "status",
    "candidateClaimRegistry",
    issues
  );
  const rankingInfluence = readOwnDataValue(
    root,
    "rankingInfluence",
    "candidateClaimRegistry",
    issues
  );
  const claimsValue = readOwnDataValue(
    root,
    "claims",
    "candidateClaimRegistry",
    issues
  );
  const claims = asDenseArray(
    claimsValue,
    "candidateClaimRegistry.claims",
    issues
  );
  if (
    schemaVersion !== "1.1.0" ||
    registryStatus !== "candidate-second-pass-required" ||
    rankingInfluence !== "none" ||
    claims === null ||
    claims.length !== 145
  ) {
    addIssue(
      issues,
      "claim-record-invalid",
      "candidateClaimRegistry",
      "Frozen candidate registry schema, status, boundary or count is invalid."
    );
    return [];
  }

  const bindings: QualifiedClaimReleaseBindingV3[] = [];
  for (let index = 0; index < claims.length; index += 1) {
    const path = `candidateClaimRegistry.claims[${index}]`;
    const claim = asPlainRecord(claims[index], path, issues);
    if (claim === null) {
      continue;
    }
    const claimId = readOwnDataValue(claim, "claimId", path, issues);
    const track = readOwnDataValue(claim, "track", path, issues);
    const status = readOwnDataValue(claim, "status", path, issues);
    const claimRanking = readOwnDataValue(
      claim,
      "rankingInfluence",
      path,
      issues
    );
    if (
      typeof claimId !== "string" ||
      !CLAIM_ID_PATTERN.test(claimId) ||
      typeof track !== "string" ||
      !CANDIDATE_TRACKS.has(track as QualifiedCandidateTrackV3) ||
      !claimId.startsWith(
        CANDIDATE_TRACK_CLAIM_PREFIXES[track as QualifiedCandidateTrackV3] ?? ""
      ) ||
      status !== "candidate-second-pass-required" ||
      claimRanking !== "none" ||
      Object.hasOwn(claim, "version")
    ) {
      addIssue(
        issues,
        "claim-record-invalid",
        path,
        "Candidate identity requires a frozen track/status, no version and no ranking influence."
      );
      continue;
    }
    const identityResult = serializeQualifiedClaimIdentityV3({
      namespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
      identitySchemaVersion:
        STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
      registryScope: "candidate",
      track: track as QualifiedCandidateTrackV3,
      claimId,
      claimVersion: null,
    });
    const recordDigest = await digestCanonicalRecord(claim, path, issues);
    if (identityResult.status === "blocked" || recordDigest === null) {
      addIssue(
        issues,
        "identity-invalid",
        path,
        "Candidate claim could not be assigned a qualified identity."
      );
      continue;
    }
    bindings.push({
      identity: identityResult.identity,
      qualifiedKey: identityResult.qualifiedKey,
      claimStatus: "candidate-second-pass-required",
      libraryRelease: STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3,
      registrySchemaVersion: "1.1.0",
      sourceAssetPath: CANDIDATE_CLAIM_ASSET_PATH,
      sourceAssetDigestSha256: `sha256-${sourceDigestRaw}`,
      recordDigestSha256: recordDigest,
    });
  }
  return bindings;
}

function deriveRelationshipBindings(
  asset: unknown,
  sourceDigestRaw: string,
  candidateBindings: readonly QualifiedClaimReleaseBindingV3[],
  issues: QualifiedClaimOverlayIssueV3[]
): QualifiedClaimRelationshipBindingV3[] {
  const root = asPlainRecord(asset, "claimRelationshipRegistry", issues);
  if (root === null) {
    return [];
  }
  const schemaVersion = readOwnDataValue(
    root,
    "schemaVersion",
    "claimRelationshipRegistry",
    issues
  );
  const status = readOwnDataValue(
    root,
    "status",
    "claimRelationshipRegistry",
    issues
  );
  const rankingInfluence = readOwnDataValue(
    root,
    "rankingInfluence",
    "claimRelationshipRegistry",
    issues
  );
  const constructsValue = readOwnDataValue(
    root,
    "constructs",
    "claimRelationshipRegistry",
    issues
  );
  const constructs = asDenseArray(
    constructsValue,
    "claimRelationshipRegistry.constructs",
    issues
  );
  if (
    schemaVersion !== "1.1.0" ||
    status !== "candidate-second-pass-required" ||
    rankingInfluence !== "none" ||
    constructs === null ||
    constructs.length !== 21
  ) {
    addIssue(
      issues,
      "relationship-record-invalid",
      "claimRelationshipRegistry",
      "Frozen relationship registry schema, status, boundary or count is invalid."
    );
    return [];
  }

  const candidateByLocalId = new Map<string, QualifiedClaimReleaseBindingV3[]>();
  for (const binding of candidateBindings) {
    const existing = candidateByLocalId.get(binding.identity.claimId) ?? [];
    existing.push(binding);
    candidateByLocalId.set(binding.identity.claimId, existing);
  }

  const relationshipBindings: QualifiedClaimRelationshipBindingV3[] = [];
  const constructIds = new Set<string>();
  for (let constructIndex = 0; constructIndex < constructs.length; constructIndex += 1) {
    const path = `claimRelationshipRegistry.constructs[${constructIndex}]`;
    const construct = asPlainRecord(constructs[constructIndex], path, issues);
    if (construct === null) {
      continue;
    }
    const constructId = readOwnDataValue(construct, "constructId", path, issues);
    const relationship = readOwnDataValue(construct, "relationship", path, issues);
    const refsValue = readOwnDataValue(construct, "memberClaimRefs", path, issues);
    const refs = asDenseArray(refsValue, `${path}.memberClaimRefs`, issues);
    if (
      typeof constructId !== "string" ||
      !CONSTRUCT_ID_PATTERN.test(constructId) ||
      relationship !== "consolidates" ||
      refs === null ||
      constructIds.has(constructId)
    ) {
      addIssue(
        issues,
        "relationship-record-invalid",
        path,
        "Construct identity, relationship vocabulary or references are invalid."
      );
      continue;
    }
    constructIds.add(constructId);
    for (let memberIndex = 0; memberIndex < refs.length; memberIndex += 1) {
      const bareClaimRef = refs[memberIndex];
      if (typeof bareClaimRef !== "string" || !CLAIM_ID_PATTERN.test(bareClaimRef)) {
        addIssue(
          issues,
          "relationship-record-invalid",
          `${path}.memberClaimRefs[${memberIndex}]`,
          "Relationship references must use the frozen local claim ID grammar."
        );
        continue;
      }
      const matches = candidateByLocalId.get(bareClaimRef) ?? [];
      if (matches.length === 0) {
        addIssue(
          issues,
          "reference-unresolved",
          `${path}.memberClaimRefs[${memberIndex}]`,
          "Candidate-bound relationship reference resolved zero records."
        );
        continue;
      }
      if (matches.length !== 1) {
        addIssue(
          issues,
          "reference-ambiguous",
          `${path}.memberClaimRefs[${memberIndex}]`,
          "Candidate-bound relationship reference resolved multiple records."
        );
        continue;
      }
      relationshipBindings.push({
        relationshipRegistrySchemaVersion: "1.1.0",
        sourceAssetPath: RELATIONSHIP_ASSET_PATH,
        sourceAssetDigestSha256: `sha256-${sourceDigestRaw}`,
        constructId,
        memberIndex,
        bareClaimRef,
        qualifiedKey: matches[0].qualifiedKey,
      });
    }
  }
  relationshipBindings.sort((left, right) =>
    compareOrdinal(left.constructId, right.constructId) ||
    left.memberIndex - right.memberIndex ||
    compareOrdinal(left.qualifiedKey, right.qualifiedKey)
  );
  return relationshipBindings;
}

function createExactResolver(
  overlay: Readonly<QualifiedClaimIdentityOverlayV3>
): QualifiedClaimExactResolverV3 {
  const privateBindings = new Map<string, Readonly<QualifiedClaimReleaseBindingV3>>();
  for (const binding of overlay.claimBindings) {
    privateBindings.set(binding.qualifiedKey, binding);
  }
  const resolver: QualifiedClaimExactResolverV3 = {
    resolve(qualifiedKey: unknown): QualifiedClaimResolutionV3 {
      try {
        const parsed = parseQualifiedClaimKeyV3(qualifiedKey);
        if (parsed.status === "blocked") {
          return deepFreezeQualifiedClaimValueV3({
            status: "blocked" as const,
            binding: null,
            issues: [{
              code: "identity-invalid" as const,
              path: "qualifiedKey",
              detail: "Resolver accepts only a canonical qualified claim key.",
            }],
          });
        }
        const binding = privateBindings.get(parsed.qualifiedKey);
        if (binding === undefined) {
          return deepFreezeQualifiedClaimValueV3({
            status: "blocked" as const,
            binding: null,
            issues: [{
              code: "claim-unknown" as const,
              path: "qualifiedKey",
              detail: "Qualified key resolved zero records; no fallback was attempted.",
            }],
          });
        }
        return deepFreezeQualifiedClaimValueV3({
          status: "resolved" as const,
          binding,
          issues: [] as const,
        });
      } catch {
        return deepFreezeQualifiedClaimValueV3({
          status: "blocked" as const,
          binding: null,
          issues: [{
            code: "identity-invalid" as const,
            path: "qualifiedKey",
            detail: "Unexpected exact-resolution failure was contained.",
          }],
        });
      }
    },
  };
  return deepFreezeQualifiedClaimValueV3(resolver);
}

export async function buildQualifiedClaimIdentityOverlayV3(
  rawInput: unknown
): Promise<QualifiedClaimOverlayBuildResultV3> {
  try {
    const issues: QualifiedClaimOverlayIssueV3[] = [];
    const input = validateBuildInputShape(rawInput, issues);
    if (input === null) {
      return blockedOverlay(issues);
    }
    const assetBindings = validateAssetBindings(input, issues);
    if (issues.length > 0) {
      return blockedOverlay(issues);
    }

    const coreAsset = assetBindings.get(CORE_CLAIM_ASSET_PATH);
    const candidateAsset = assetBindings.get(CANDIDATE_CLAIM_ASSET_PATH);
    const relationshipAsset = assetBindings.get(RELATIONSHIP_ASSET_PATH);
    if (
      coreAsset === undefined ||
      candidateAsset === undefined ||
      relationshipAsset === undefined
    ) {
      return blockedOverlay([{
        code: "asset-binding-invalid",
        path: "overlayInput.manifestAssets",
        detail: "Required claim or relationship asset binding is absent.",
      }]);
    }

    const coreBindings = await deriveCoreBindings(
      input.records[CORE_CLAIM_ASSET_PATH],
      coreAsset.sha256,
      issues
    );
    const candidateBindings = await deriveCandidateBindings(
      input.records[CANDIDATE_CLAIM_ASSET_PATH],
      candidateAsset.sha256,
      issues
    );
    const claimBindings = [...coreBindings, ...candidateBindings].sort(
      (left, right) => compareOrdinal(left.qualifiedKey, right.qualifiedKey)
    );
    const qualifiedKeys = new Set(claimBindings.map((binding) => binding.qualifiedKey));
    if (qualifiedKeys.size !== claimBindings.length) {
      addIssue(
        issues,
        "qualified-key-collision",
        "claimBindings",
        "Qualified claim keys must be globally unique."
      );
    }

    const relationshipBindings = deriveRelationshipBindings(
      input.records[RELATIONSHIP_ASSET_PATH],
      relationshipAsset.sha256,
      candidateBindings,
      issues
    );
    const referencedCandidates = new Set(
      relationshipBindings.map((binding) => binding.qualifiedKey)
    );
    const candidateWithoutConstruct = candidateBindings.filter(
      (binding) => !referencedCandidates.has(binding.qualifiedKey)
    ).length;

    if (
      claimBindings.length !== 150 ||
      coreBindings.length !== 5 ||
      candidateBindings.length !== 145 ||
      qualifiedKeys.size !== 150 ||
      relationshipBindings.length !== 198 ||
      referencedCandidates.size !== 119 ||
      candidateWithoutConstruct !== 26
    ) {
      addIssue(
        issues,
        "overlay-count-invalid",
        "overlay.counts",
        "Frozen claim or relationship counts do not match release 1.1.0."
      );
    }
    if (issues.length > 0) {
      return blockedOverlay(issues);
    }

    const counts: QualifiedClaimIdentityOverlayCountsV3 = {
      totalClaims: 150,
      coreClaims: 5,
      candidateClaims: 145,
      qualifiedKeys: 150,
      relationshipBindings: 198,
      distinctReferencedCandidateClaims: 119,
      candidateClaimsWithoutConstruct: 26,
      qualifiedKeyCollisions: 0,
    };
    const fingerprintPayload = {
      overlaySchemaVersion: STAYOPTI_QUALIFIED_CLAIM_OVERLAY_SCHEMA_VERSION_V3,
      canonicalJsonVersion: STAYOPTI_QUALIFIED_CLAIM_CANONICAL_JSON_VERSION_V3,
      identityNamespace: STAYOPTI_QUALIFIED_CLAIM_NAMESPACE_V3,
      identitySchemaVersion:
        STAYOPTI_QUALIFIED_CLAIM_IDENTITY_SCHEMA_VERSION_V3,
      libraryRelease: STAYOPTI_QUALIFIED_CLAIM_LIBRARY_RELEASE_V3,
      packageFingerprint: STAYOPTI_QUALIFIED_CLAIM_PACKAGE_FINGERPRINT_V3,
      rankingInfluence: "none" as const,
      claimBindings,
      relationshipBindings,
      counts,
    };
    const canonical = canonicalizeQualifiedClaimJsonV3(fingerprintPayload);
    if (canonical.status === "blocked") {
      return blockedOverlay([{
        code: "canonical-json-invalid",
        path: "overlay",
        detail: "Overlay payload could not be canonicalized.",
      }]);
    }
    const calculatedFingerprint = await sha256QualifiedClaimTextV3(
      `${STAYOPTI_QUALIFIED_CLAIM_OVERLAY_SCHEMA_VERSION_V3}\n${canonical.canonicalJson}`
    );
    if (
      calculatedFingerprint !==
      STAYOPTI_QUALIFIED_CLAIM_OVERLAY_FINGERPRINT_V3
    ) {
      return blockedOverlay([{
        code: "overlay-fingerprint-invalid",
        path: "overlay.overlayFingerprintSha256",
        detail:
          `Expected ${STAYOPTI_QUALIFIED_CLAIM_OVERLAY_FINGERPRINT_V3}; ` +
          `calculated ${calculatedFingerprint}.`,
      }]);
    }

    const overlay: QualifiedClaimIdentityOverlayV3 = {
      ...fingerprintPayload,
      overlayFingerprintSha256: calculatedFingerprint,
    };
    deepFreezeQualifiedClaimValueV3(overlay);
    const resolver = createExactResolver(overlay);
    return {
      status: "ready",
      overlay,
      resolver,
      issues: [],
    };
  } catch {
    return blockedOverlay([{
      code: "input-shape-invalid",
      path: "overlay",
      detail: "Unexpected overlay construction failure was contained.",
    }]);
  }
}
