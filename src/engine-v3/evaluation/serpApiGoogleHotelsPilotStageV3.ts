import { stableSerializeV3 } from "../contract/stableHashV3";

export const STAYOPTI_SERPAPI_PILOT_STAGE_POLICY_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-stage-policy@1" as const;

export const STAYOPTI_SERPAPI_PILOT_STAGES_V3 = ["CANARY", "REMAINING_11"] as const;
export type StayOptiSerpApiPilotStageV3 = typeof STAYOPTI_SERPAPI_PILOT_STAGES_V3[number];

export const STAYOPTI_SERPAPI_CANARY_SESSION_INDEX_V3 = 0 as const;
export const STAYOPTI_SERPAPI_PRIOR_CONSUMED_CANARY_CALLS_V3 = 2 as const;
export const STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3 = 2 as const;
export const STAYOPTI_SERPAPI_CANARY_MAIN_SEARCH_MAX_V3 = 1 as const;
export const STAYOPTI_SERPAPI_CANARY_PROPERTY_DETAIL_MAX_V3 = 1 as const;
export const STAYOPTI_SERPAPI_CANARY_SESSIONS_MAX_V3 = 1 as const;
export const STAYOPTI_SERPAPI_CANARY_CONCURRENCY_V3 = 1 as const;
export const STAYOPTI_SERPAPI_CANARY_RETRY_BUDGET_V3 = 0 as const;
export const STAYOPTI_SERPAPI_CANARY_PAGINATION_BUDGET_V3 = 0 as const;
export const STAYOPTI_SERPAPI_REMAINING_MAX_CALLS_V3 = 44 as const;
export const STAYOPTI_SERPAPI_STAGED_MAX_TOTAL_CALLS_V3 = 48 as const;

export const STAYOPTI_SERPAPI_REQUEST_STATES_V3 = [
  "PLANNED", "TRANSMITTED", "VALIDATED", "FAILED",
] as const;
export type StayOptiSerpApiRequestStateV3 = typeof STAYOPTI_SERPAPI_REQUEST_STATES_V3[number];

export type StayOptiSerpApiStagedRequestTypeV3 = "MAIN_SEARCH" | "PROPERTY_DETAIL";

export interface StayOptiSerpApiStagedLedgerEntryV3 {
  pilotId: string;
  manifestHash: string;
  runnerBundleHash: string;
  stage: StayOptiSerpApiPilotStageV3;
  sessionId: string;
  sessionIndex: number;
  requestOrdinal: number;
  requestType: StayOptiSerpApiStagedRequestTypeV3;
  alternativeRank: number | null;
  requestState: StayOptiSerpApiRequestStateV3;
  transmittedAt: string | null;
  sanitizedResponseFingerprint: string | null;
  failureClass: string | null;
  rawDeleted: boolean;
  snapshotExported: boolean;
}

export interface StayOptiSerpApiValidatedCanaryEvidenceV3 {
  evidenceVersion: "stayopti.v3.serpapi-google-hotels-canary-resume@1";
  valid: true;
  status: "PASS";
  pilotId: string;
  manifestHash: string;
  runnerBundleHash: string;
  canaryEvidenceZipSha256: string;
  canarySessionId: string;
  canarySessionIndex: 0;
  actualRequestsTransmitted: number;
  remainingStageNotStarted: true;
  rawDeletionVerified: true;
  t3Compatible: true;
}

export function createSerpApiCanaryAuthorizationLiteralV3(
  manifestHash: string,
  runnerBundleHash: string,
) {
  return `AUTHORIZE_V3_17T2_CANARY_${manifestHash}_RUNNER_${runnerBundleHash}_RETENTION_V2_MAX2`;
}

export function createSerpApiT2BMax2AuthorizationLiteralV3(input: {
  sourceSha: string;
  manifestHash: string;
  runnerBundleHash: string;
}) {
  for (const [field, value] of Object.entries(input)) {
    if (!/^[0-9a-f]{40}$/.test(value) && !/^[0-9a-f]{64}$/.test(value)) {
      throw new Error(`SERPAPI_PILOT_${field.toUpperCase()}_INVALID`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(input.sourceSha)) throw new Error("SERPAPI_PILOT_SOURCE_SHA_INVALID");
  if (!/^[0-9a-f]{64}$/.test(input.manifestHash)) throw new Error("SERPAPI_PILOT_MANIFEST_HASH_INVALID");
  if (!/^[0-9a-f]{64}$/.test(input.runnerBundleHash)) throw new Error("SERPAPI_PILOT_RUNNER_BUNDLE_HASH_INVALID");
  return [
    "AUTHORIZE_V3_17T2B_MAX2",
    `HEAD_${input.sourceSha}`,
    `MANIFEST_${input.manifestHash}`,
    `RUNNER_${input.runnerBundleHash}`,
    "MAIN1",
    "DETAIL1",
    "SESSIONS1",
    "CONCURRENCY1",
    "RETRIES0",
    "PAGINATION0",
    "QUARANTINE_AES256GCM_DPAPI_CURRENTUSER",
    "AUTOSTOP",
    "REMAINING_NO",
  ].join("_");
}

export const STAYOPTI_SERPAPI_T2B_MAX2_STAGE_POLICY_V3 = Object.freeze({
  maximumTotalRequests: STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3,
  mainSearchMaximum: STAYOPTI_SERPAPI_CANARY_MAIN_SEARCH_MAX_V3,
  propertyDetailMaximum: STAYOPTI_SERPAPI_CANARY_PROPERTY_DETAIL_MAX_V3,
  sessionsMaximum: STAYOPTI_SERPAPI_CANARY_SESSIONS_MAX_V3,
  maximumConcurrency: STAYOPTI_SERPAPI_CANARY_CONCURRENCY_V3,
  retryBudget: STAYOPTI_SERPAPI_CANARY_RETRY_BUDGET_V3,
  paginationBudget: STAYOPTI_SERPAPI_CANARY_PAGINATION_BUDGET_V3,
  propertyDetailSelectionMaximum: STAYOPTI_SERPAPI_CANARY_PROPERTY_DETAIL_MAX_V3,
  autostop: true as const,
  remainingStageAuthorized: false as const,
  automaticGoldenAdmission: false as const,
  encryptedPrivateQuarantineRequired: true as const,
});

export function createSerpApiRemainingAuthorizationLiteralV3(input: {
  manifestHash: string;
  runnerBundleHash: string;
  canaryEvidenceZipSha256: string;
}) {
  if (!/^[0-9a-f]{64}$/.test(input.canaryEvidenceZipSha256)) {
    throw new Error("SERPAPI_PILOT_CANARY_ZIP_HASH_INVALID");
  }
  return `AUTHORIZE_V3_17T2_REMAINING_11_${input.manifestHash}_RUNNER_${input.runnerBundleHash}_CANARY_${input.canaryEvidenceZipSha256}_RETENTION_V2_MAX44`;
}

export function stageSessionIndexesV3(stage: StayOptiSerpApiPilotStageV3, sessionCount: number) {
  if (sessionCount !== 12) throw new Error("SERPAPI_PILOT_SESSION_COUNT_INVALID");
  return stage === "CANARY"
    ? [STAYOPTI_SERPAPI_CANARY_SESSION_INDEX_V3]
    : Array.from({ length: 11 }, (_, index) => index + 1);
}

export function stageRequestCapV3(stage: StayOptiSerpApiPilotStageV3) {
  return stage === "CANARY"
    ? STAYOPTI_SERPAPI_CANARY_MAX_CALLS_V3
    : STAYOPTI_SERPAPI_REMAINING_MAX_CALLS_V3;
}

function sha256(value: string) {
  const runtimeProcess = (globalThis as typeof globalThis & {
    process?: { getBuiltinModule?: (specifier: string) => unknown };
  }).process;
  const crypto = runtimeProcess?.getBuiltinModule?.("node:crypto") as {
    createHash?: (algorithm: string) => { update(value: string, encoding: string): unknown; digest(encoding: string): string };
  } | undefined;
  if (typeof crypto?.createHash !== "function") throw new Error("SERPAPI_PILOT_LEDGER_HASH_UNAVAILABLE");
  const digest = crypto.createHash("sha256");
  digest.update(value, "utf8");
  return digest.digest("hex");
}

export class StayOptiSerpApiStagedRequestLedgerV3 {
  readonly #entries: StayOptiSerpApiStagedLedgerEntryV3[] = [];
  readonly #keys = new Set<string>();
  #active = 0;
  readonly #policy: {
    pilotId: string;
    manifestHash: string;
    runnerBundleHash: string;
    stage: StayOptiSerpApiPilotStageV3;
    allowedSessionIndexes: readonly number[];
    maximumRequests: number;
  };

  constructor(policy: {
    pilotId: string;
    manifestHash: string;
    runnerBundleHash: string;
    stage: StayOptiSerpApiPilotStageV3;
    allowedSessionIndexes: readonly number[];
    maximumRequests: number;
  }) {
    if (policy.maximumRequests !== stageRequestCapV3(policy.stage)) {
      throw new Error("SERPAPI_PILOT_STAGE_REQUEST_CAP_INVALID");
    }
    this.#policy = policy;
  }

  plan(input: {
    sessionId: string;
    sessionIndex: number;
    requestType: StayOptiSerpApiStagedRequestTypeV3;
    alternativeRank?: number | null;
  }) {
    if (this.#active !== 0) throw new Error("SERPAPI_PILOT_CONCURRENCY_LIMIT_EXCEEDED");
    if (!this.#policy.allowedSessionIndexes.includes(input.sessionIndex)) {
      throw new Error("SERPAPI_PILOT_STAGE_SESSION_NOT_ALLOWED");
    }
    if (this.#entries.length >= this.#policy.maximumRequests) throw new Error("ABORT_REQUEST_CAP_REACHED");
    const alternativeRank = input.alternativeRank ?? null;
    const key = `${input.sessionIndex}:${input.requestType}:${alternativeRank ?? "MAIN"}`;
    if (this.#keys.has(key)) throw new Error("SERPAPI_PILOT_DUPLICATE_REQUEST");
    if (this.#policy.stage === "CANARY") {
      const mainEntries = this.#entries.filter((entry) => entry.requestType === "MAIN_SEARCH");
      const detailEntries = this.#entries.filter((entry) => entry.requestType === "PROPERTY_DETAIL");
      if (input.requestType === "MAIN_SEARCH" && mainEntries.length >= STAYOPTI_SERPAPI_CANARY_MAIN_SEARCH_MAX_V3) {
        throw new Error("SERPAPI_PILOT_MAIN_SEARCH_CAP_REACHED");
      }
      if (input.requestType === "PROPERTY_DETAIL") {
        if (mainEntries.length !== 1 || mainEntries[0]?.requestState !== "VALIDATED") {
          throw new Error("SERPAPI_PILOT_MAIN_SEARCH_VALIDATION_REQUIRED");
        }
        if (detailEntries.length >= STAYOPTI_SERPAPI_CANARY_PROPERTY_DETAIL_MAX_V3) {
          throw new Error("SERPAPI_PILOT_PROPERTY_DETAIL_CAP_REACHED");
        }
      }
    }
    this.#keys.add(key);
    this.#active = 1;
    const entry: StayOptiSerpApiStagedLedgerEntryV3 = {
      pilotId: this.#policy.pilotId,
      manifestHash: this.#policy.manifestHash,
      runnerBundleHash: this.#policy.runnerBundleHash,
      stage: this.#policy.stage,
      sessionId: input.sessionId,
      sessionIndex: input.sessionIndex,
      requestOrdinal: this.#entries.length + 1,
      requestType: input.requestType,
      alternativeRank,
      requestState: "PLANNED",
      transmittedAt: null,
      sanitizedResponseFingerprint: null,
      failureClass: null,
      rawDeleted: false,
      snapshotExported: false,
    };
    this.#entries.push(entry);
    return entry.requestOrdinal;
  }

  transmit(ordinal: number, transmittedAt: string) {
    const entry = this.entry(ordinal);
    if (entry.requestState !== "PLANNED") throw new Error("SERPAPI_PILOT_LEDGER_TRANSITION_INVALID");
    entry.requestState = "TRANSMITTED";
    entry.transmittedAt = transmittedAt;
  }

  validate(ordinal: number, responseFingerprint: string, snapshotExported: boolean, rawDeleted: boolean) {
    const entry = this.entry(ordinal);
    if (entry.requestState !== "TRANSMITTED") throw new Error("SERPAPI_PILOT_LEDGER_TRANSITION_INVALID");
    if (!/^[0-9a-f]{64}$/.test(responseFingerprint)) throw new Error("SERPAPI_PILOT_RESPONSE_FINGERPRINT_INVALID");
    entry.requestState = "VALIDATED";
    entry.sanitizedResponseFingerprint = responseFingerprint;
    entry.snapshotExported = snapshotExported;
    entry.rawDeleted = rawDeleted;
    this.#active = 0;
  }

  fail(ordinal: number, failureClass: string, rawDeleted: boolean, snapshotExported: boolean) {
    const entry = this.entry(ordinal);
    if (!["PLANNED", "TRANSMITTED"].includes(entry.requestState)) throw new Error("SERPAPI_PILOT_LEDGER_TRANSITION_INVALID");
    entry.requestState = "FAILED";
    entry.failureClass = /^SERPAPI_PILOT_[A-Z0-9_]+$/.test(failureClass)
      ? failureClass
      : "SERPAPI_PILOT_SANITIZED_ABORT";
    entry.rawDeleted = rawDeleted;
    entry.snapshotExported = snapshotExported;
    this.#active = 0;
  }

  snapshot() {
    return this.#entries.map((entry) => Object.freeze({ ...entry }));
  }

  transmittedCount() {
    return this.#entries.filter((entry) => entry.transmittedAt !== null).length;
  }

  hash() {
    return sha256(`stayopti-v3-serpapi-staged-request-ledger\n${stableSerializeV3(this.snapshot())}`);
  }

  private entry(ordinal: number) {
    const entry = this.#entries[ordinal - 1];
    if (entry === undefined) throw new Error("SERPAPI_PILOT_LEDGER_ENTRY_MISSING");
    return entry;
  }
}
