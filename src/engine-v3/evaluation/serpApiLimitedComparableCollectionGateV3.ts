import { stableSerializeV3 } from "../contract/stableHashV3";

import {
  STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3,
  STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3,
  STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3,
  evaluateComparableSetEvidenceTierV3,
  freezeProviderNeutralComparableSetSelectionV3,
  type StayOptiComparableCandidateV3,
  type StayOptiComparableEvidenceTierV3,
} from "./comparableSetEvidenceGateV3";
import {
  STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
  STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
  type StayOptiSerpApiPilotRequestV3,
  type StayOptiSerpApiPilotTransportV3,
} from "./serpApiGoogleHotelsPilotGateV3";
import {
  createSerpApiSanitizedSnapshotV3,
  validateSerpApiSanitizedSnapshotV3,
  type StayOptiSerpApiSanitizedAlternativeV3,
  type StayOptiSerpApiSanitizedSnapshotV3,
} from "./serpApiGoogleHotelsPilotEvidenceV3";

export const STAYOPTI_T5_GATE_VERSION_V3 =
  "stayopti.v3.serpapi-limited-comparable-collection-gate@1" as const;
export const STAYOPTI_T5_SESSION_REGISTRY_VERSION_V3 =
  "stayopti.v3.serpapi-limited-comparable-session-registry@1" as const;
export const STAYOPTI_T5_CAMPAIGN_MANIFEST_VERSION_V3 =
  "stayopti.v3.serpapi-limited-comparable-campaign-manifest@1" as const;
export const STAYOPTI_T5_STAGE_MANIFEST_VERSION_V3 =
  "stayopti.v3.serpapi-limited-comparable-stage-manifest@1" as const;
export const STAYOPTI_T5_EVIDENCE_CONTRACT_VERSION_V3 =
  "stayopti.v3.serpapi-limited-comparable-canary2-evidence@1" as const;
export const STAYOPTI_T5_SOURCE_SHA_V3 =
  "d99982ab57d80b0d9d78b8e8470bfd6ed80cb821" as const;

export const STAYOPTI_T5_CANARY2_MAX_CALLS_V3 = 2 as const;
export const STAYOPTI_T5_REMAINING10_MAX_CALLS_V3 = 10 as const;
export const STAYOPTI_T5_CAMPAIGN_MAX_CALLS_V3 = 12 as const;
export const STAYOPTI_T5_MAIN_SEARCH_MAX_PER_SESSION_V3 = 1 as const;
export const STAYOPTI_T5_PROPERTY_DETAIL_MAX_PER_SESSION_V3 = 0 as const;
export const STAYOPTI_T5_MAX_CONCURRENCY_V3 = 1 as const;
export const STAYOPTI_T5_RETRIES_V3 = 0 as const;
export const STAYOPTI_T5_PAGINATION_V3 = 0 as const;

export type StayOptiT5StageV3 = "CANARY2" | "REMAINING10";

export interface StayOptiT5SessionRegistryEntryV3 {
  readonly sessionId: string;
  readonly scenarioFingerprint: string;
  readonly normalizedDestination: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly durationNights: number;
  readonly leadTimeDays: number;
  readonly adults: number;
  readonly childAges: readonly number[];
  readonly rooms: number;
  readonly currency: "EUR";
  readonly gl: "it";
  readonly hl: "it";
  readonly budgetMinorUnits: number;
  readonly preferenceProfile: string;
  readonly userContext: string;
  readonly hardConstraints: readonly string[];
  readonly expectedEvidenceTier: "LIMITED_COMPARABLE_JUDGMENT";
  readonly inclusionRationale: string;
}

interface NodeDigestV3 {
  update(value: string, encoding: "utf8"): NodeDigestV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeDigestV3;
}

function nodeCryptoV3() {
  const processValue = (globalThis as typeof globalThis & {
    process?: { getBuiltinModule?: (specifier: string) => unknown };
  }).process;
  const crypto = processValue?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (typeof crypto?.createHash !== "function") throw new Error("T5_NODE_CRYPTO_REQUIRED");
  return crypto;
}

function sha256V3(value: unknown, namespace: string) {
  return nodeCryptoV3().createHash("sha256")
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex");
}

function assertSha256V3(value: string, code: string) {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(code);
}

function assertCommitShaV3(value: string, code: string) {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(code);
}

function registryEntryV3(index: number): StayOptiT5SessionRegistryEntryV3 {
  const source = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[index];
  if (source === undefined) throw new Error("T5_CANONICAL_SESSION_MISSING");
  const fingerprintMaterial = {
    sessionId: source.sessionId,
    normalizedDestination: source.destination,
    checkIn: source.checkIn,
    checkOut: source.checkOut,
    durationNights: source.durationNights,
    leadTimeDays: source.leadTimeDays,
    adults: source.adults,
    childAges: [...source.childAges],
    rooms: source.rooms,
    currency: source.currency,
    gl: source.gl,
    hl: source.hl,
    budgetMinorUnits: source.budgetMinorUnits,
    preferenceProfile: source.preferenceProfile,
    userContext: source.userContext,
    hardConstraints: [...source.hardConstraints].sort(),
  };
  return Object.freeze({
    ...fingerprintMaterial,
    childAges: Object.freeze(fingerprintMaterial.childAges),
    hardConstraints: Object.freeze(fingerprintMaterial.hardConstraints),
    scenarioFingerprint: sha256V3(fingerprintMaterial, "stayopti-v3-t5-session-scenario"),
    expectedEvidenceTier: "LIMITED_COMPARABLE_JUDGMENT",
    inclusionRationale: source.diagnosticPurpose,
  });
}

export const STAYOPTI_T5_SESSION_REGISTRY_V3: readonly StayOptiT5SessionRegistryEntryV3[] =
  Object.freeze(STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.map((_session, index) => registryEntryV3(index)));

if (STAYOPTI_T5_SESSION_REGISTRY_V3.length !== 12) throw new Error("T5_SESSION_REGISTRY_COUNT_INVALID");

export const STAYOPTI_T5_SESSION_REGISTRY_HASH_V3 = sha256V3(
  {
    registryVersion: STAYOPTI_T5_SESSION_REGISTRY_VERSION_V3,
    sourceManifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    sessions: STAYOPTI_T5_SESSION_REGISTRY_V3,
  },
  "stayopti-v3-t5-session-registry",
);

function durationBucketV3(value: number) {
  return value <= 1 ? 0 : value <= 4 ? 1 : 2;
}

function leadBucketV3(value: number) {
  return value < 60 ? 0 : value < 180 ? 1 : 2;
}

function budgetBucketV3(value: number) {
  return value < 50000 ? 0 : value < 100000 ? 1 : 2;
}

function preferenceOrdinalV3(value: string) {
  return ["maximum-savings", "savings", "balanced", "comfort", "maximum-comfort"].indexOf(value);
}

function pairScoreV3(left: StayOptiT5SessionRegistryEntryV3, right: StayOptiT5SessionRegistryEntryV3) {
  const childContrast = Number((left.childAges.length > 0) !== (right.childAges.length > 0));
  const partyContrast = Number(left.userContext !== right.userContext);
  const preferenceContrast = Math.abs(preferenceOrdinalV3(left.preferenceProfile) - preferenceOrdinalV3(right.preferenceProfile));
  const durationContrast = Math.abs(durationBucketV3(left.durationNights) - durationBucketV3(right.durationNights));
  const leadContrast = Math.abs(leadBucketV3(left.leadTimeDays) - leadBucketV3(right.leadTimeDays));
  const budgetContrast = Math.abs(budgetBucketV3(left.budgetMinorUnits) - budgetBucketV3(right.budgetMinorUnits));
  return childContrast * 100000 + partyContrast * 10000 + preferenceContrast * 1000 + durationContrast * 100 + leadContrast * 10 + budgetContrast;
}

export function selectT5Canary2SessionIndexesV3(
  registry: readonly StayOptiT5SessionRegistryEntryV3[] = STAYOPTI_T5_SESSION_REGISTRY_V3,
) {
  if (registry.length !== 12) throw new Error("T5_SESSION_REGISTRY_COUNT_INVALID");
  const pairs: Array<{ indexes: readonly [number, number]; score: number; fingerprint: string }> = [];
  for (let left = 0; left < registry.length; left += 1) {
    for (let right = left + 1; right < registry.length; right += 1) {
      const first = registry[left]!;
      const second = registry[right]!;
      pairs.push({
        indexes: [left, right],
        score: pairScoreV3(first, second),
        fingerprint: sha256V3([first.scenarioFingerprint, second.scenarioFingerprint].sort(), "stayopti-v3-t5-canary2-pair"),
      });
    }
  }
  const winner = pairs.sort((left, right) => right.score - left.score || left.fingerprint.localeCompare(right.fingerprint))[0];
  if (winner === undefined) throw new Error("T5_CANARY2_SELECTION_FAILED");
  return Object.freeze([...winner.indexes].sort((left, right) => left - right));
}

export const STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3 = selectT5Canary2SessionIndexesV3();
export const STAYOPTI_T5_REMAINING10_SESSION_INDEXES_V3 = Object.freeze(
  STAYOPTI_T5_SESSION_REGISTRY_V3.map((_session, index) => index)
    .filter((index) => !STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3.includes(index)),
);

export const STAYOPTI_T5_CAMPAIGN_MANIFEST_V3 = Object.freeze({
  manifestVersion: STAYOPTI_T5_CAMPAIGN_MANIFEST_VERSION_V3,
  sourceSha: STAYOPTI_T5_SOURCE_SHA_V3,
  sourceSessionManifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  sessionRegistryHash: STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
  sessionCount: 12 as const,
  evidenceTier: "LIMITED_COMPARABLE_JUDGMENT" as const,
  collectionStrategy: "MAIN_SEARCH_ONLY" as const,
  minimumComparableSetSize: STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3,
  targetComparableSetSize: STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3,
  maximumComparableSetSize: STAYOPTI_MAXIMUM_COMPARABLE_SET_SIZE_V3,
  maximumCalls: STAYOPTI_T5_CAMPAIGN_MAX_CALLS_V3,
  maximumCallsPerSession: STAYOPTI_T5_MAIN_SEARCH_MAX_PER_SESSION_V3,
  propertyDetailsPerSession: STAYOPTI_T5_PROPERTY_DETAIL_MAX_PER_SESSION_V3,
  concurrency: STAYOPTI_T5_MAX_CONCURRENCY_V3,
  retries: STAYOPTI_T5_RETRIES_V3,
  pagination: STAYOPTI_T5_PAGINATION_V3,
  encryptedPrivateQuarantine: true as const,
  autostop: true as const,
  automaticGoldenAdmission: false as const,
});

export const STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3 = sha256V3(
  STAYOPTI_T5_CAMPAIGN_MANIFEST_V3,
  "stayopti-v3-t5-campaign-manifest",
);

function stageManifestV3(stage: StayOptiT5StageV3) {
  const canary = stage === "CANARY2";
  const indexes = canary ? STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3 : STAYOPTI_T5_REMAINING10_SESSION_INDEXES_V3;
  return Object.freeze({
    stageManifestVersion: STAYOPTI_T5_STAGE_MANIFEST_VERSION_V3,
    stage,
    campaignManifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    sessionRegistryHash: STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
    sessionIndexes: Object.freeze([...indexes]),
    sessionIds: Object.freeze(indexes.map((index) => STAYOPTI_T5_SESSION_REGISTRY_V3[index]!.sessionId)),
    sessionScenarioFingerprints: Object.freeze(indexes.map((index) => STAYOPTI_T5_SESSION_REGISTRY_V3[index]!.scenarioFingerprint)),
    sessionCount: canary ? 2 as const : 10 as const,
    maximumCalls: canary ? STAYOPTI_T5_CANARY2_MAX_CALLS_V3 : STAYOPTI_T5_REMAINING10_MAX_CALLS_V3,
    maximumCallsPerSession: STAYOPTI_T5_MAIN_SEARCH_MAX_PER_SESSION_V3,
    propertyDetailCalls: STAYOPTI_T5_PROPERTY_DETAIL_MAX_PER_SESSION_V3,
    retries: STAYOPTI_T5_RETRIES_V3,
    pagination: STAYOPTI_T5_PAGINATION_V3,
    concurrency: STAYOPTI_T5_MAX_CONCURRENCY_V3,
    autostop: true as const,
    authorized: false as const,
    reachableFromOtherStage: false as const,
  });
}

export const STAYOPTI_T5_CANARY2_MANIFEST_V3 = stageManifestV3("CANARY2");
export const STAYOPTI_T5_REMAINING10_MANIFEST_V3 = stageManifestV3("REMAINING10");
export const STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3 = sha256V3(STAYOPTI_T5_CANARY2_MANIFEST_V3, "stayopti-v3-t5-canary2-manifest");
export const STAYOPTI_T5_REMAINING10_MANIFEST_HASH_V3 = sha256V3(STAYOPTI_T5_REMAINING10_MANIFEST_V3, "stayopti-v3-t5-remaining10-manifest");

export const STAYOPTI_T5_CANARY2_PASS_POLICY_V3 = Object.freeze({
  requiredTransmittedSessions: 2 as const,
  requiredComparableSessions: 2 as const,
  diagnosticOnlySessionAllowance: 0 as const,
  rawEncryptedCoverageBps: 10000 as const,
  propertyDetailCalls: 0 as const,
  retryCalls: 0 as const,
  paginationCalls: 0 as const,
  leakageAllowed: false as const,
  credentialCleanupRequired: true as const,
  observedPriceSemanticRequired: "OBSERVED_AGGREGATED_DISPLAY_PRICE" as const,
  missingPriceStratumRequired: true as const,
  remaining10MayStartAutomatically: false as const,
  automaticGoldenAdmission: false as const,
});

export function createT5Canary2AuthorizationLiteralV3(input: {
  readonly executionHead: string;
  readonly runnerBundleHash: string;
}) {
  assertCommitShaV3(input.executionHead, "T5_EXECUTION_HEAD_INVALID");
  assertSha256V3(input.runnerBundleHash, "T5_RUNNER_BUNDLE_HASH_INVALID");
  return [
    "AUTHORIZE_V3_17T5_CANARY2",
    `SOURCE_SHA_${STAYOPTI_T5_SOURCE_SHA_V3}`,
    `EXECUTION_HEAD_${input.executionHead}`,
    `CAMPAIGN_${STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3}`,
    `CANARY2_${STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3}`,
    `REGISTRY_${STAYOPTI_T5_SESSION_REGISTRY_HASH_V3}`,
    `RUNNER_${input.runnerBundleHash}`,
    "STAGE_CANARY2",
    "SESSIONS2",
    "MAXCALLS2",
    "MAIN1",
    "DETAIL0",
    "CONCURRENCY1",
    "RETRIES0",
    "PAGINATION0",
    "QUARANTINE_AES256GCM_DPAPI_CURRENTUSER",
    "AUTOSTOP",
    "REMAINING10_NO",
    "GOLDEN_NO",
  ].join("_");
}

export interface StayOptiT5Canary2AuthorizationV3 {
  readonly stage: "CANARY2";
  readonly sourceSha: string;
  readonly executionHead: string;
  readonly campaignManifestHash: string;
  readonly canary2ManifestHash: string;
  readonly sessionRegistryHash: string;
  readonly runnerBundleHash: string;
  readonly literal: string;
  readonly authorizationGrantedBySubsequentUserMessage: boolean;
  readonly retentionAuthorized: boolean;
}

export function validateT5Canary2AuthorizationV3(input: {
  readonly authorization: StayOptiT5Canary2AuthorizationV3 | null;
  readonly observedSourceSha: string;
  readonly observedExecutionHead: string;
  readonly observedCampaignManifestHash: string;
  readonly observedCanary2ManifestHash: string;
  readonly observedSessionRegistryHash: string;
  readonly observedRunnerBundleHash: string;
  readonly workingTreeRelevantFilesMatch: boolean;
}) {
  const issues: string[] = [];
  const authorization = input.authorization;
  if (authorization === null) issues.push("T5_AUTHORIZATION_MISSING");
  if (input.observedSourceSha !== STAYOPTI_T5_SOURCE_SHA_V3) issues.push("T5_SOURCE_SHA_MISMATCH");
  if (input.observedCampaignManifestHash !== STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3) issues.push("T5_CAMPAIGN_MANIFEST_MISMATCH");
  if (input.observedCanary2ManifestHash !== STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3) issues.push("T5_CANARY2_MANIFEST_MISMATCH");
  if (input.observedSessionRegistryHash !== STAYOPTI_T5_SESSION_REGISTRY_HASH_V3) issues.push("T5_SESSION_REGISTRY_MISMATCH");
  if (!input.workingTreeRelevantFilesMatch) issues.push("T5_WORKING_TREE_SEAL_MISMATCH");
  if (authorization !== null) {
    if (authorization.stage !== "CANARY2") issues.push("T5_STAGE_NOT_CANARY2");
    if (!authorization.authorizationGrantedBySubsequentUserMessage) issues.push("T5_LITERAL_NOT_ACCEPTED_BY_SUBSEQUENT_USER_MESSAGE");
    if (!authorization.retentionAuthorized) issues.push("T5_RETENTION_NOT_AUTHORIZED");
    if (authorization.sourceSha !== STAYOPTI_T5_SOURCE_SHA_V3 || authorization.sourceSha !== input.observedSourceSha) issues.push("T5_AUTHORIZATION_SOURCE_MISMATCH");
    if (authorization.executionHead !== input.observedExecutionHead) issues.push("T5_EXECUTION_HEAD_MISMATCH");
    if (authorization.campaignManifestHash !== input.observedCampaignManifestHash) issues.push("T5_AUTHORIZATION_CAMPAIGN_MISMATCH");
    if (authorization.canary2ManifestHash !== input.observedCanary2ManifestHash) issues.push("T5_AUTHORIZATION_CANARY2_MISMATCH");
    if (authorization.sessionRegistryHash !== input.observedSessionRegistryHash) issues.push("T5_AUTHORIZATION_REGISTRY_MISMATCH");
    if (authorization.runnerBundleHash !== input.observedRunnerBundleHash) issues.push("T5_AUTHORIZATION_RUNNER_MISMATCH");
    const expected = createT5Canary2AuthorizationLiteralV3({ executionHead: input.observedExecutionHead, runnerBundleHash: input.observedRunnerBundleHash });
    if (authorization.literal !== expected) issues.push("T5_AUTHORIZATION_LITERAL_MISMATCH");
    if (/^AUTHORIZE_V3_17T2(?:B|C|_)/.test(authorization.literal)) issues.push("T5_OLD_AUTHORIZATION_REJECTED");
  }
  return Object.freeze({
    allowed: issues.length === 0,
    credentialPromptAllowed: issues.length === 0,
    networkAllowed: issues.length === 0,
    issues: Object.freeze([...new Set(issues)].sort()),
  });
}

export type StayOptiT5RequestStateV3 = "PLANNED" | "TRANSMITTED" | "VALIDATED" | "FAILED";

export interface StayOptiT5RequestLedgerEntryV3 {
  readonly requestOrdinal: number;
  readonly sessionId: string;
  readonly sessionIndex: number;
  readonly requestKind: "MAIN_SEARCH";
  readonly requestState: StayOptiT5RequestStateV3;
  readonly transmittedAt: string | null;
  readonly sanitizedResponseFingerprint: string | null;
  readonly failureClass: string | null;
  readonly rawEncrypted: boolean;
}

export class StayOptiT5Canary2RequestLedgerV3 {
  readonly #entries: StayOptiT5RequestLedgerEntryV3[] = [];
  readonly #allowedIndexes = new Set<number>(STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3);

  plan(input: { sessionId: string; sessionIndex: number; requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL" }) {
    if (input.requestKind !== "MAIN_SEARCH") throw new Error("T5_PROPERTY_DETAIL_FORBIDDEN");
    if (!this.#allowedIndexes.has(input.sessionIndex)) throw new Error("T5_SESSION_OUTSIDE_CANARY2");
    if (STAYOPTI_T5_SESSION_REGISTRY_V3[input.sessionIndex]?.sessionId !== input.sessionId) throw new Error("T5_SESSION_BINDING_MISMATCH");
    if (this.#entries.some((entry) => entry.requestState === "PLANNED" || entry.requestState === "TRANSMITTED")) throw new Error("T5_CONCURRENCY_LIMIT_EXCEEDED");
    if (this.#entries.some((entry) => entry.sessionId === input.sessionId)) throw new Error("T5_DUPLICATE_SESSION_REQUEST");
    if (this.#entries.filter((entry) => entry.requestState !== "PLANNED").length >= STAYOPTI_T5_CANARY2_MAX_CALLS_V3) throw new Error("T5_CANARY2_REQUEST_CAP_REACHED");
    const requestOrdinal = this.#entries.length + 1;
    this.#entries.push(Object.freeze({ requestOrdinal, sessionId: input.sessionId, sessionIndex: input.sessionIndex, requestKind: "MAIN_SEARCH", requestState: "PLANNED", transmittedAt: null, sanitizedResponseFingerprint: null, failureClass: null, rawEncrypted: false }));
    return requestOrdinal;
  }

  transmit(requestOrdinal: number, transmittedAt: string) {
    const entry = this.#entries[requestOrdinal - 1];
    if (entry?.requestState !== "PLANNED") throw new Error("T5_REQUEST_NOT_PLANNED");
    const transmitted = this.#entries.filter((row) => row.requestState === "TRANSMITTED" || row.requestState === "VALIDATED" || row.requestState === "FAILED").length;
    if (transmitted >= STAYOPTI_T5_CANARY2_MAX_CALLS_V3) throw new Error("T5_CANARY2_REQUEST_CAP_REACHED");
    this.#entries[requestOrdinal - 1] = Object.freeze({ ...entry, requestState: "TRANSMITTED", transmittedAt });
  }

  validate(requestOrdinal: number, sanitizedResponseFingerprint: string, rawEncrypted: boolean) {
    const entry = this.#entries[requestOrdinal - 1];
    if (entry?.requestState !== "TRANSMITTED") throw new Error("T5_REQUEST_NOT_TRANSMITTED");
    if (!rawEncrypted) throw new Error("T5_PRIVATE_QUARANTINE_REQUIRED");
    assertSha256V3(sanitizedResponseFingerprint, "T5_SANITIZED_RESPONSE_FINGERPRINT_INVALID");
    this.#entries[requestOrdinal - 1] = Object.freeze({ ...entry, requestState: "VALIDATED", sanitizedResponseFingerprint, rawEncrypted: true });
  }

  fail(requestOrdinal: number, failureClass: string, rawEncrypted: boolean) {
    const entry = this.#entries[requestOrdinal - 1];
    if (entry === undefined || (entry.requestState !== "PLANNED" && entry.requestState !== "TRANSMITTED")) throw new Error("T5_REQUEST_NOT_ACTIVE");
    this.#entries[requestOrdinal - 1] = Object.freeze({ ...entry, requestState: "FAILED", failureClass, rawEncrypted });
  }

  snapshot() { return Object.freeze(this.#entries.map((entry) => Object.freeze({ ...entry }))); }
  transmittedCount() { return this.#entries.filter((entry) => entry.transmittedAt !== null).length; }
}

export interface StayOptiT5PrivateQuarantineV3 {
  readonly protectionReady: true;
  capture(input: {
    readonly plaintextUtf8: string;
    readonly metadata: {
      readonly sessionReference: string;
      readonly requestKind: "MAIN_SEARCH";
      readonly requestOrdinal: number;
      readonly capturedAt: string;
    };
    readonly disposition: "UNRECOGNIZED_PARTIAL_OR_ERROR";
  }): { readonly entryId: string; readonly envelopeFingerprint: string };
  markProcessedSuccess(handle: { readonly entryId: string; readonly envelopeFingerprint: string }): { readonly entryId: string; readonly envelopeFingerprint: string };
}

export interface StayOptiT5ComparableAlternativeV3 {
  readonly localReference: string;
  readonly priceSemantic: "OBSERVED_AGGREGATED_DISPLAY_PRICE" | "MISSING";
  readonly priceScope: "TOTAL_STAY" | "NIGHTLY" | "MISSING";
  readonly observedPriceMinorUnits: number | null;
  readonly currency: "EUR";
  readonly exactBookable: false;
  readonly sellerSpecific: false;
  readonly verifiedCheckoutTotal: false;
  readonly taxesAndFees: "UNKNOWN_OR_PARTIAL";
  readonly reviewRating: number | null;
  readonly reviewCount: number | null;
  readonly coordinatesObserved: boolean;
  readonly essentialAmenities: readonly string[] | null;
  readonly propertyCategory: string | null;
  readonly reliability: "DISPLAY_CAPTURE_ONLY_RECHECK_REQUIRED";
  readonly missingness: readonly string[];
  readonly semanticFingerprint: string;
}

export interface StayOptiT5SessionEvidenceV3 {
  readonly sessionId: string;
  readonly scenarioFingerprint: string;
  readonly stage: "CANARY2";
  readonly pricePresentStratum: readonly StayOptiT5ComparableAlternativeV3[];
  readonly priceMissingStratum: readonly StayOptiT5ComparableAlternativeV3[];
  readonly limitedComparableSubset: readonly StayOptiT5ComparableAlternativeV3[];
  readonly exclusionLedger: readonly { readonly localReference: string; readonly reasonCodes: readonly string[] }[];
  readonly comparableSelectionFingerprint: string | null;
  readonly resultingTier: StayOptiComparableEvidenceTierV3;
  readonly sessionDecision: "LIMITED_COMPARABLE_PASS" | "DIAGNOSTIC_ONLY";
  readonly propertyDetailCalls: 0;
  readonly propertyTokenExported: false;
  readonly sponsoredUsedForSelection: false;
  readonly originalRankUsedForSelection: false;
  readonly providerIdentityUsedForSelection: false;
  readonly automaticGoldenAdmission: false;
  readonly artifactFingerprint: string;
}

function observedPriceV3(alternative: StayOptiSerpApiSanitizedAlternativeV3) {
  if (alternative.totalStayPrice.state === "OBSERVED" && Number.isFinite(alternative.totalStayPrice.value) && alternative.totalStayPrice.value >= 0) {
    return { scope: "TOTAL_STAY" as const, minorUnits: Math.round(alternative.totalStayPrice.value * 100) };
  }
  if (alternative.nightlyPrice.state === "OBSERVED" && Number.isFinite(alternative.nightlyPrice.value) && alternative.nightlyPrice.value >= 0) {
    return { scope: "NIGHTLY" as const, minorUnits: Math.round(alternative.nightlyPrice.value * 100) };
  }
  return null;
}

function knownValueV3<T>(value: { state: string; value: T | null }) {
  return value.state === "KNOWN" ? value.value : null;
}

function canonicalAlternativesV3(snapshot: StayOptiSerpApiSanitizedSnapshotV3) {
  const semanticRows = snapshot.alternatives.map((alternative) => {
    const price = observedPriceV3(alternative);
    const semantic = {
      priceSemantic: price === null ? "MISSING" as const : "OBSERVED_AGGREGATED_DISPLAY_PRICE" as const,
      priceScope: price?.scope ?? "MISSING" as const,
      observedPriceMinorUnits: price?.minorUnits ?? null,
      currency: "EUR" as const,
      exactBookable: false as const,
      sellerSpecific: false as const,
      verifiedCheckoutTotal: false as const,
      taxesAndFees: "UNKNOWN_OR_PARTIAL" as const,
      reviewRating: knownValueV3(alternative.reviewRating),
      reviewCount: knownValueV3(alternative.reviewCount),
      coordinatesObserved: alternative.coordinates.latitude.state === "OBSERVED" && alternative.coordinates.longitude.state === "OBSERVED",
      essentialAmenities: alternative.amenities.state === "KNOWN" ? Object.freeze([...new Set(alternative.amenities.value)].sort()) : null,
      propertyCategory: knownValueV3(alternative.propertyType),
      reliability: "DISPLAY_CAPTURE_ONLY_RECHECK_REQUIRED" as const,
      missingness: Object.freeze([...new Set(alternative.missingness)].sort()),
    };
    return { semantic, semanticFingerprint: sha256V3(semantic, "stayopti-v3-t5-limited-alternative") };
  }).sort((left, right) => left.semanticFingerprint.localeCompare(right.semanticFingerprint));
  return Object.freeze(semanticRows.map((row, index) => Object.freeze({
    localReference: `ALT_${String(index + 1).padStart(3, "0")}`,
    ...row.semantic,
    semanticFingerprint: row.semanticFingerprint,
  })));
}

function coverageBpsV3(values: readonly StayOptiT5ComparableAlternativeV3[], predicate: (value: StayOptiT5ComparableAlternativeV3) => boolean) {
  return values.length === 0 ? 0 : Math.floor(values.filter(predicate).length * 10000 / values.length);
}

export function createT5LimitedComparableSessionEvidenceV3(input: {
  readonly sessionIndex: number;
  readonly snapshot: StayOptiSerpApiSanitizedSnapshotV3;
}): StayOptiT5SessionEvidenceV3 {
  const session = STAYOPTI_T5_SESSION_REGISTRY_V3[input.sessionIndex];
  if (session === undefined || input.snapshot.sessionId !== session.sessionId) throw new Error("T5_SESSION_SNAPSHOT_BINDING_MISMATCH");
  const alternatives = canonicalAlternativesV3(input.snapshot);
  const pricePresentStratum = alternatives.filter((alternative) => alternative.observedPriceMinorUnits !== null);
  const priceMissingStratum = alternatives.filter((alternative) => alternative.observedPriceMinorUnits === null);
  const counts = new Map<"TOTAL_STAY" | "NIGHTLY", number>([["TOTAL_STAY", 0], ["NIGHTLY", 0]]);
  for (const alternative of pricePresentStratum) {
    if (alternative.priceScope !== "MISSING") counts.set(alternative.priceScope, (counts.get(alternative.priceScope) ?? 0) + 1);
  }
  const preferredScope = (counts.get("TOTAL_STAY") ?? 0) >= (counts.get("NIGHTLY") ?? 0) ? "TOTAL_STAY" as const : "NIGHTLY" as const;
  const scopeConsistent = pricePresentStratum.filter((alternative) => alternative.priceScope === preferredScope);
  const exclusionLedger = alternatives.filter((alternative) => alternative.observedPriceMinorUnits === null || alternative.priceScope !== preferredScope)
    .map((alternative) => Object.freeze({
      localReference: alternative.localReference,
      reasonCodes: Object.freeze(alternative.observedPriceMinorUnits === null
        ? ["T5_PRICE_MISSING_SEPARATE_STRATUM"]
        : ["T5_PRICE_SCOPE_NOT_SELECTED_FOR_COMPARISON"]),
    }));
  let selected: readonly StayOptiT5ComparableAlternativeV3[] = Object.freeze([]);
  let selectionFingerprint: string | null = null;
  if (scopeConsistent.length >= STAYOPTI_MINIMUM_COMPARABLE_SET_SIZE_V3) {
    const candidateByReference = new Map<string, StayOptiT5ComparableAlternativeV3>(
      scopeConsistent.map((alternative) => [alternative.localReference, alternative]),
    );
    const candidates: StayOptiComparableCandidateV3[] = scopeConsistent.map((alternative) => ({
      localReference: alternative.localReference,
      displayPriceMinorUnits: alternative.observedPriceMinorUnits,
      currency: alternative.currency,
      budgetMinorUnits: session.budgetMinorUnits,
      reviewRating: alternative.reviewRating,
      reviewCount: alternative.reviewCount,
      locationDistanceMeters: null,
      essentialAmenities: alternative.essentialAmenities,
      propertyCategory: alternative.propertyCategory,
      stayScopeConsistent: true,
      occupancyScopeConsistent: true,
    }));
    const selection = freezeProviderNeutralComparableSetSelectionV3(candidates, Math.min(STAYOPTI_TARGET_COMPARABLE_SET_SIZE_V3, scopeConsistent.length));
    selected = Object.freeze(selection.selectedLocalReferences.map((reference) => candidateByReference.get(reference)!).filter(Boolean));
    selectionFingerprint = selection.selectionFingerprint;
  }
  const coverage = {
    setSize: selected.length,
    selectionFrozenBeforeDetail: true,
    asymmetricDecisionDetailCoverage: false,
    displayPriceCoverageBps: coverageBpsV3(selected, (alternative) => alternative.observedPriceMinorUnits !== null),
    exactBookablePriceCoverageBps: 0,
    availabilityCoverageBps: 0,
    currencyCoverageBps: coverageBpsV3(selected, (alternative) => alternative.currency === "EUR"),
    stayOccupancyCoverageBps: selected.length === 0 ? 0 : 10000,
    taxFeeStatusCoverageBps: 0,
    freshnessCoverageBps: 0,
    cancellationCoverageBps: 0,
    roomOfferCoverageBps: 0,
    ratingReviewCoverageBps: coverageBpsV3(selected, (alternative) => alternative.reviewRating !== null && alternative.reviewCount !== null),
    locationCoverageBps: coverageBpsV3(selected, (alternative) => alternative.coordinatesObserved),
    amenityCoverageBps: coverageBpsV3(selected, (alternative) => alternative.essentialAmenities !== null),
    propertyCategoryCoverageBps: coverageBpsV3(selected, (alternative) => alternative.propertyCategory !== null),
    detailCoverageBps: 0,
  };
  const tier = evaluateComparableSetEvidenceTierV3(coverage).tier;
  const body = {
    sessionId: session.sessionId,
    scenarioFingerprint: session.scenarioFingerprint,
    stage: "CANARY2" as const,
    pricePresentStratum: Object.freeze(pricePresentStratum),
    priceMissingStratum: Object.freeze(priceMissingStratum),
    limitedComparableSubset: selected,
    exclusionLedger: Object.freeze(exclusionLedger),
    comparableSelectionFingerprint: selectionFingerprint,
    resultingTier: tier,
    sessionDecision: tier === "LIMITED_COMPARABLE_JUDGMENT" ? "LIMITED_COMPARABLE_PASS" as const : "DIAGNOSTIC_ONLY" as const,
    propertyDetailCalls: 0 as const,
    propertyTokenExported: false as const,
    sponsoredUsedForSelection: false as const,
    originalRankUsedForSelection: false as const,
    providerIdentityUsedForSelection: false as const,
    automaticGoldenAdmission: false as const,
  };
  return Object.freeze({ ...body, artifactFingerprint: sha256V3(body, "stayopti-v3-t5-session-evidence") });
}

export const STAYOPTI_T5_CANARY2_EVIDENCE_CONTRACT_V3 = Object.freeze({
  evidenceContractVersion: STAYOPTI_T5_EVIDENCE_CONTRACT_VERSION_V3,
  requiredArtifacts: Object.freeze([
    "campaign-manifest.json",
    "session-registry-receipt.json",
    "canary2-stage-manifest.json",
    "authorization-receipt.json",
    "request-ledger.json",
    "spend-ledger.json",
    "per-session-sanitized-snapshots.json",
    "comparable-subsets.json",
    "missing-price-strata.json",
    "exclusion-ledger.json",
    "quarantine-receipts.json",
    "credential-cleanup-receipt.json",
    "stop-condition-receipt.json",
    "provider-neutrality-receipt.json",
    "final-campaign-decision.json",
    "checksums.sha256",
  ]),
  forbiddenContent: Object.freeze([
    "RAW_PROVIDER_PAYLOAD",
    "ENCRYPTED_RAW_ENVELOPE",
    "API_KEY",
    "PROPERTY_TOKEN",
    "RAW_PROVIDER_ID",
    "FULL_URL",
    "QUERY_STRING",
    "DPAPI_OR_AES_KEY_MATERIAL",
    "REMAINING10_AUTHORIZATION",
  ]),
  sharedEvidenceMayContainRaw: false as const,
  sharedEvidenceMayContainSecrets: false as const,
  remaining10AuthorizationIncluded: false as const,
  automaticGoldenAdmission: false as const,
});

function buildMainSearchUrlV3(sessionIndex: number, apiKey: string) {
  const session = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex];
  if (session === undefined) throw new Error("T5_SESSION_NOT_FOUND");
  const url = new URL(STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3);
  url.searchParams.set("engine", STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3);
  url.searchParams.set("q", session.destination);
  url.searchParams.set("check_in_date", session.checkIn);
  url.searchParams.set("check_out_date", session.checkOut);
  url.searchParams.set("adults", String(session.adults));
  url.searchParams.set("children", String(session.childAges.length));
  url.searchParams.set("rooms", String(session.rooms));
  url.searchParams.set("currency", session.currency);
  url.searchParams.set("gl", session.gl);
  url.searchParams.set("hl", session.hl);
  url.searchParams.set("no_cache", "true");
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function sanitizedFailureClassV3(error: unknown) {
  const message = error instanceof Error ? error.message : "T5_UNKNOWN_FAILURE";
  return /^T5_[A-Z0-9_]+$/.test(message) ? message : "T5_SANITIZED_COLLECTION_FAILURE";
}

export async function executeT5Canary2LimitedComparableCollectionV3(input: {
  readonly authorization: StayOptiT5Canary2AuthorizationV3 | null;
  readonly apiKey: string;
  readonly observedSourceSha: string;
  readonly observedExecutionHead: string;
  readonly observedRunnerBundleHash: string;
  readonly workingTreeRelevantFilesMatch: boolean;
  readonly transport: StayOptiSerpApiPilotTransportV3;
  readonly privateQuarantine: StayOptiT5PrivateQuarantineV3;
  readonly clock: () => string;
}) {
  const preflight = validateT5Canary2AuthorizationV3({
    authorization: input.authorization,
    observedSourceSha: input.observedSourceSha,
    observedExecutionHead: input.observedExecutionHead,
    observedCampaignManifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
    observedCanary2ManifestHash: STAYOPTI_T5_CANARY2_MANIFEST_HASH_V3,
    observedSessionRegistryHash: STAYOPTI_T5_SESSION_REGISTRY_HASH_V3,
    observedRunnerBundleHash: input.observedRunnerBundleHash,
    workingTreeRelevantFilesMatch: input.workingTreeRelevantFilesMatch,
  });
  if (!preflight.allowed) throw new Error(`T5_PREFLIGHT_BLOCKED:${preflight.issues.join(",")}`);
  if (input.apiKey.length === 0) throw new Error("T5_API_KEY_MISSING");
  if (input.privateQuarantine.protectionReady !== true) throw new Error("T5_PRIVATE_QUARANTINE_REQUIRED");
  const ledger = new StayOptiT5Canary2RequestLedgerV3();
  const sessionEvidence: StayOptiT5SessionEvidenceV3[] = [];
  let failureClassification: string | null = null;
  for (const sessionIndex of STAYOPTI_T5_CANARY2_SESSION_INDEXES_V3) {
    const session = STAYOPTI_T5_SESSION_REGISTRY_V3[sessionIndex]!;
    const requestOrdinal = ledger.plan({ sessionId: session.sessionId, sessionIndex, requestKind: "MAIN_SEARCH" });
    let rawEncrypted = false;
    try {
      const url = buildMainSearchUrlV3(sessionIndex, input.apiKey);
      const request: StayOptiSerpApiPilotRequestV3 = {
        requestOrdinal,
        sessionId: session.sessionId,
        requestKind: "MAIN_SEARCH",
        engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
        endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
        url,
        sanitizedUrl: `${STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3}?api_key=[REDACTED]`,
      };
      ledger.transmit(requestOrdinal, input.clock());
      const response = await input.transport.send(request);
      const raw = typeof response.rawBodyText === "string" ? response.rawBodyText : JSON.stringify(response.body ?? null);
      const handle = input.privateQuarantine.capture({
        plaintextUtf8: raw,
        disposition: "UNRECOGNIZED_PARTIAL_OR_ERROR",
        metadata: { sessionReference: session.sessionId, requestKind: "MAIN_SEARCH", requestOrdinal, capturedAt: input.clock() },
      });
      rawEncrypted = true;
      if (response.httpStatus < 200 || response.httpStatus > 299) throw new Error("T5_HTTP_STATUS_FAILURE");
      if (typeof response.contentType !== "string" || !/^application\/json(?:;|$)/i.test(response.contentType)) throw new Error("T5_CONTENT_TYPE_INVALID");
      let body = response.body;
      if (typeof response.rawBodyText === "string") {
        try { body = JSON.parse(response.rawBodyText); } catch { throw new Error("T5_RESPONSE_NOT_PROCESSABLE"); }
      }
      if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error("T5_RESPONSE_NOT_PROCESSABLE");
      const providerBody = body as Record<string, unknown>;
      if (typeof providerBody.error === "string") throw new Error("T5_PROVIDER_ERROR_RESPONSE");
      const metadata = providerBody.search_metadata;
      if (metadata !== null && typeof metadata === "object" && !Array.isArray(metadata)) {
        const status = String((metadata as Record<string, unknown>).status ?? "").toUpperCase();
        if (status === "ERROR" || status === "PROCESSING" || status === "PENDING") throw new Error("T5_PROVIDER_STATUS_NOT_COMPLETE");
      }
      const sourceSession = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[sessionIndex]!;
      const snapshot = createSerpApiSanitizedSnapshotV3({
        pilotId: "V3_17T5_LIMITED_COMPARABLE_CAMPAIGN_001",
        manifestHash: STAYOPTI_T5_CAMPAIGN_MANIFEST_HASH_V3,
        session: sourceSession,
        response: body as Parameters<typeof createSerpApiSanitizedSnapshotV3>[0]["response"],
        captureTimestamp: input.clock(),
      });
      validateSerpApiSanitizedSnapshotV3(snapshot);
      const artifact = createT5LimitedComparableSessionEvidenceV3({ sessionIndex, snapshot });
      input.privateQuarantine.markProcessedSuccess(handle);
      ledger.validate(requestOrdinal, artifact.artifactFingerprint, true);
      sessionEvidence.push(artifact);
    } catch (error) {
      failureClassification = sanitizedFailureClassV3(error);
      try { ledger.fail(requestOrdinal, failureClassification, rawEncrypted); } catch { /* preserve original fail-closed classification */ }
      break;
    }
  }
  const comparableSessionCount = sessionEvidence.filter((session) => session.sessionDecision === "LIMITED_COMPARABLE_PASS").length;
  const campaignPass = ledger.transmittedCount() === 2 && sessionEvidence.length === 2 && comparableSessionCount === STAYOPTI_T5_CANARY2_PASS_POLICY_V3.requiredComparableSessions && failureClassification === null;
  return Object.freeze({
    gateVersion: STAYOPTI_T5_GATE_VERSION_V3,
    stage: "CANARY2" as const,
    status: campaignPass ? "PASS" as const : "ABORTED" as const,
    actualRequestsTransmitted: ledger.transmittedCount(),
    mainSearchRequests: ledger.transmittedCount(),
    propertyDetailRequests: 0 as const,
    remaining10Started: false as const,
    remaining10Authorized: false as const,
    authorizationConsumed: ledger.transmittedCount() > 0,
    requestLedger: ledger.snapshot(),
    spendLedger: Object.freeze({ transmittedCalls: ledger.transmittedCount(), maximumCalls: 2 as const, retries: 0 as const, pagination: 0 as const }),
    sessionEvidence: Object.freeze(sessionEvidence),
    comparableSessionCount,
    credentialCleanupRequired: true as const,
    propertyTokenExported: false as const,
    rawInSharedEvidence: false as const,
    automaticGoldenAdmission: false as const,
    failureClassification,
  });
}

export function validateT5EvidenceArtifactV3(value: unknown) {
  const serialized = stableSerializeV3(value).toLowerCase();
  const forbidden = [
    "api_key=", "property_token", "authorization:", "rawpayload", "rawresponse",
    "encryptedraw", "dpapiprotectedkey", "aeskey", "remaining10authorizationliteral",
  ];
  const violations = forbidden.filter((token) => serialized.includes(token));
  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations.sort()) });
}
