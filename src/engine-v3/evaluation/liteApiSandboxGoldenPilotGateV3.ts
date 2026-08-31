import { stableSerializeV3 } from "../contract/stableHashV3";
import type { StayOptiGoldenProjectionCaseResultV3 } from "./goldenNormalizedSearchProjectionV3";

export const STAYOPTI_V3_17R_GATE_VERSION =
  "stayopti.v3.liteapi-sandbox-golden-pilot-gate@1" as const;

export const STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION =
  "SANDBOX_DIAGNOSTIC_NOT_REAL_GOLDEN" as const;

export const STAYOPTI_V3_17R_EVIDENCE_BOUNDARY = Object.freeze({
  goldenCasesRealCollected: 0,
  realJudgmentsCollected: 0,
  v3_17GateMet: false,
  v3_18EntryAllowed: false,
  globalOptimumClaimAllowed: false,
  marketFrequencyClaimAllowed: false,
  productionCollectionAuthorized: false,
});

export const STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE =
  "https://api.liteapi.travel/v3.0" as const;

export const STAYOPTI_V3_17R_RATES_PATH = "/hotels/rates" as const;

interface NodeDigestV3 {
  update(value: string, encoding: "utf8"): NodeDigestV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeDigestV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

function nodeCrypto() {
  const runtimeProcess = (
    globalThis as typeof globalThis & { process?: NodeProcessWithBuiltinsV3 }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as
    NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") {
    throw new Error("V3-17R plan hashing requires the Node built-in crypto module.");
  }
  return cryptoModule;
}

function sha256(value: unknown, namespace: string) {
  return nodeCrypto().createHash("sha256")
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex");
}

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export interface StayOptiV317RSearchFamilyV3 {
  familyId: string;
  destination: {
    cityName: string;
    countryCode: string;
  };
  checkin: string;
  checkout: string;
  occupancies: readonly {
    adults: number;
    children: readonly number[];
  }[];
  currency: "EUR";
  guestNationality: "IT";
  limit: 80;
  maxRatesPerHotel: 3;
  includeHotelData: true;
  roomMapping: true;
  diagnosticPurpose: string;
}

export interface StayOptiV317RFrozenPlanV3 {
  planVersion: typeof STAYOPTI_V3_17R_GATE_VERSION;
  environmentClassification: "LITEAPI_SANDBOX_IDENTITY_REQUIRES_EXTERNAL_ATTESTATION";
  baseUrlCandidate: typeof STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE;
  endpointPath: typeof STAYOPTI_V3_17R_RATES_PATH;
  method: "POST";
  waveCount: 1;
  maxHttpRequests: 5;
  maxCases: 20;
  minimumRequestIntervalMs: 1_000;
  maxConcurrency: 1;
  retryMax: 0;
  redirectMax: 0;
  families: readonly StayOptiV317RSearchFamilyV3[];
}

export const STAYOPTI_V3_17R_FROZEN_PLAN = deepFreeze<StayOptiV317RFrozenPlanV3>({
  planVersion: STAYOPTI_V3_17R_GATE_VERSION,
  environmentClassification: "LITEAPI_SANDBOX_IDENTITY_REQUIRES_EXTERNAL_ATTESTATION",
  baseUrlCandidate: STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE,
  endpointPath: STAYOPTI_V3_17R_RATES_PATH,
  method: "POST",
  waveCount: 1,
  maxHttpRequests: 5,
  maxCases: 20,
  minimumRequestIntervalMs: 1_000,
  maxConcurrency: 1,
  retryMax: 0,
  redirectMax: 0,
  families: [
    {
      familyId: "SEARCH_FAMILY_V3_17R_001",
      destination: { cityName: "Rome", countryCode: "IT" },
      checkin: "2027-02-10",
      checkout: "2027-02-12",
      occupancies: [{ adults: 1, children: [] }],
      currency: "EUR",
      guestNationality: "IT",
      limit: 80,
      maxRatesPerHotel: 3,
      includeHotelData: true,
      roomMapping: true,
      diagnosticPurpose: "short solo stay and dense urban inventory",
    },
    {
      familyId: "SEARCH_FAMILY_V3_17R_002",
      destination: { cityName: "Vienna", countryCode: "AT" },
      checkin: "2027-03-08",
      checkout: "2027-03-13",
      occupancies: [{ adults: 2, children: [] }],
      currency: "EUR",
      guestNationality: "IT",
      limit: 80,
      maxRatesPerHotel: 3,
      includeHotelData: true,
      roomMapping: true,
      diagnosticPurpose: "medium couple stay and cross-border EUR normalization",
    },
    {
      familyId: "SEARCH_FAMILY_V3_17R_003",
      destination: { cityName: "Lisbon", countryCode: "PT" },
      checkin: "2027-04-19",
      checkout: "2027-04-26",
      occupancies: [{ adults: 2, children: [] }],
      currency: "EUR",
      guestNationality: "IT",
      limit: 80,
      maxRatesPerHotel: 3,
      includeHotelData: true,
      roomMapping: true,
      diagnosticPurpose: "longer stay and accumulated tax/cancellation evidence",
    },
    {
      familyId: "SEARCH_FAMILY_V3_17R_004",
      destination: { cityName: "Prague", countryCode: "CZ" },
      checkin: "2027-05-17",
      checkout: "2027-05-21",
      occupancies: [{ adults: 2, children: [8] }],
      currency: "EUR",
      guestNationality: "IT",
      limit: 80,
      maxRatesPerHotel: 3,
      includeHotelData: true,
      roomMapping: true,
      diagnosticPurpose: "family occupancy and explicit child-age handling",
    },
    {
      familyId: "SEARCH_FAMILY_V3_17R_005",
      destination: { cityName: "Barcelona", countryCode: "ES" },
      checkin: "2027-06-14",
      checkout: "2027-06-17",
      occupancies: [
        { adults: 2, children: [] },
        { adults: 2, children: [] },
      ],
      currency: "EUR",
      guestNationality: "IT",
      limit: 80,
      maxRatesPerHotel: 3,
      includeHotelData: true,
      roomMapping: true,
      diagnosticPurpose: "two-room occupancy and multi-room normalized evidence",
    },
  ],
});

export const STAYOPTI_V3_17R_FROZEN_PLAN_SHA256 = sha256(
  STAYOPTI_V3_17R_FROZEN_PLAN,
  STAYOPTI_V3_17R_GATE_VERSION,
);

export interface StayOptiV317RPreNetworkEvidenceV3 {
  repositoryPreflightPassed: boolean;
  sandboxIdentityVerified: boolean;
  sandboxBaseUrlVerified: boolean;
  productionEndpointExcluded: boolean;
  ratesOnlyEnforced: boolean;
  accountSpecificZeroCostVerified: boolean;
  paidEndpointsExcluded: boolean;
  httpHardCapEnforced: boolean;
  retryDisabled: boolean;
  redirectDisabled: boolean;
  concurrencyOneEnforced: boolean;
  minimumIntervalEnforced: boolean;
  singleWaveEnforced: boolean;
}

export type StayOptiV317RPreNetworkStatusV3 =
  | "READY_FOR_SINGLE_BOUNDED_WAVE"
  | "SAFE_HOLD_PRE_NETWORK";

export interface StayOptiV317RPreNetworkDecisionV3 {
  status: StayOptiV317RPreNetworkStatusV3;
  sandboxIdentityVerified: boolean;
  sandboxBaseUrlVerified: boolean;
  productionEndpointExcluded: boolean;
  ratesOnlyEnforced: boolean;
  accountSpecificZeroCostVerified: boolean;
  paidEndpointsExcluded: boolean;
  httpHardCapEnforced: boolean;
  retryDisabled: boolean;
  redirectDisabled: boolean;
  concurrencyOneEnforced: boolean;
  minimumIntervalEnforced: boolean;
  singleWaveEnforced: boolean;
  credentialReadAuthorized: boolean;
  networkAuthorized: boolean;
  missingEvidence: string[];
}

const PRE_NETWORK_KEYS = [
  ["repositoryPreflightPassed", "REPOSITORY_PREFLIGHT_NOT_PASSED"],
  ["sandboxIdentityVerified", "SANDBOX_IDENTITY_ATTESTATION_MISSING"],
  ["sandboxBaseUrlVerified", "SANDBOX_BASE_URL_ACCOUNT_BINDING_MISSING"],
  ["productionEndpointExcluded", "PRODUCTION_ENDPOINT_EXCLUSION_NOT_ENFORCED"],
  ["ratesOnlyEnforced", "RATES_ONLY_ALLOWLIST_NOT_ENFORCED"],
  ["accountSpecificZeroCostVerified", "ACCOUNT_SPECIFIC_ZERO_COST_ATTESTATION_MISSING"],
  ["paidEndpointsExcluded", "PAID_ENDPOINT_EXCLUSION_NOT_ENFORCED"],
  ["httpHardCapEnforced", "HTTP_HARD_CAP_NOT_ENFORCED"],
  ["retryDisabled", "RETRY_ZERO_NOT_ENFORCED"],
  ["redirectDisabled", "REDIRECT_ZERO_NOT_ENFORCED"],
  ["concurrencyOneEnforced", "CONCURRENCY_ONE_NOT_ENFORCED"],
  ["minimumIntervalEnforced", "MINIMUM_INTERVAL_NOT_ENFORCED"],
  ["singleWaveEnforced", "SINGLE_WAVE_NOT_ENFORCED"],
] as const satisfies readonly (readonly [keyof StayOptiV317RPreNetworkEvidenceV3, string])[];

export function evaluateV317RPreNetworkGateV3(
  evidence: StayOptiV317RPreNetworkEvidenceV3,
): StayOptiV317RPreNetworkDecisionV3 {
  const missingEvidence = PRE_NETWORK_KEYS
    .filter(([key]) => evidence[key] !== true)
    .map(([, reason]) => reason)
    .sort(compareStrings);
  const ready = missingEvidence.length === 0;
  return {
    status: ready ? "READY_FOR_SINGLE_BOUNDED_WAVE" : "SAFE_HOLD_PRE_NETWORK",
    sandboxIdentityVerified: evidence.sandboxIdentityVerified,
    sandboxBaseUrlVerified: evidence.sandboxBaseUrlVerified,
    productionEndpointExcluded: evidence.productionEndpointExcluded,
    ratesOnlyEnforced: evidence.ratesOnlyEnforced,
    accountSpecificZeroCostVerified: evidence.accountSpecificZeroCostVerified,
    paidEndpointsExcluded: evidence.paidEndpointsExcluded,
    httpHardCapEnforced: evidence.httpHardCapEnforced,
    retryDisabled: evidence.retryDisabled,
    redirectDisabled: evidence.redirectDisabled,
    concurrencyOneEnforced: evidence.concurrencyOneEnforced,
    minimumIntervalEnforced: evidence.minimumIntervalEnforced,
    singleWaveEnforced: evidence.singleWaveEnforced,
    credentialReadAuthorized: ready,
    networkAuthorized: ready,
    missingEvidence,
  };
}

export const STAYOPTI_V3_17R_OBSERVED_PRE_NETWORK_DECISION = deepFreeze(
  evaluateV317RPreNetworkGateV3({
    repositoryPreflightPassed: true,
    sandboxIdentityVerified: false,
    sandboxBaseUrlVerified: false,
    productionEndpointExcluded: true,
    ratesOnlyEnforced: true,
    accountSpecificZeroCostVerified: false,
    paidEndpointsExcluded: true,
    httpHardCapEnforced: true,
    retryDisabled: true,
    redirectDisabled: true,
    concurrencyOneEnforced: true,
    minimumIntervalEnforced: true,
    singleWaveEnforced: true,
  }),
);

export type StayOptiV317RProviderOutcomeV3 =
  | "SUCCESS"
  | "NO_RESULTS"
  | "HTTP_ERROR"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "MALFORMED_RESPONSE";

export interface StayOptiV317RDispatchIntentV3 {
  familyId: string;
  planSha256: string;
  method: "POST";
  baseUrl: string;
  endpointPath: string;
  retryOrdinal: number;
  redirectCount: number;
  waveOrdinal: number;
  monotonicStartMs: number;
  credentialsLoadedAfterGate: boolean;
}

export interface StayOptiV317RDispatchAuthorizationV3 {
  requestOrdinal: number;
  familyId: string;
  transportAuthorized: true;
}

export interface StayOptiV317RGovernorSnapshotV3 {
  waveStarted: boolean;
  waveCompleted: boolean;
  aborted: boolean;
  httpRequests: number;
  ratesHttpRequests: number;
  retries: 0;
  redirects: 0;
  maxObservedConcurrency: number;
  minimumObservedRequestIntervalMs: number | null;
  noResultsCount: number;
  attemptedFamilies: string[];
}

export class StayOptiV317RBoundedGovernorV3 {
  readonly #decision: StayOptiV317RPreNetworkDecisionV3;
  readonly #familyIds = new Set(STAYOPTI_V3_17R_FROZEN_PLAN.families.map(({ familyId }) => familyId));
  readonly #attemptedFamilies = new Set<string>();
  #waveStarted = false;
  #waveCompleted = false;
  #aborted = false;
  #httpRequests = 0;
  #inFlight = 0;
  #maxObservedConcurrency = 0;
  #lastStartMs: number | null = null;
  #minimumObservedRequestIntervalMs: number | null = null;
  #activeRequestOrdinal: number | null = null;
  #noResultsCount = 0;

  constructor(decision: StayOptiV317RPreNetworkDecisionV3) {
    this.#decision = decision;
  }

  beginWave(waveOrdinal = 1) {
    if (this.#decision.networkAuthorized !== true) throw new Error("V3_17R_SAFE_HOLD_PRE_NETWORK");
    if (waveOrdinal !== 1 || this.#waveStarted || this.#waveCompleted) {
      throw new Error("V3_17R_SECOND_WAVE_PROHIBITED");
    }
    this.#waveStarted = true;
  }

  authorizeRatesRequest(intent: StayOptiV317RDispatchIntentV3): StayOptiV317RDispatchAuthorizationV3 {
    if (!this.#waveStarted || this.#waveCompleted || this.#aborted) throw new Error("V3_17R_WAVE_NOT_ACTIVE");
    if (intent.waveOrdinal !== 1) throw new Error("V3_17R_SECOND_WAVE_PROHIBITED");
    if (intent.credentialsLoadedAfterGate !== true) throw new Error("V3_17R_CREDENTIALS_UNAVAILABLE_BEFORE_TRANSPORT");
    if (intent.planSha256 !== STAYOPTI_V3_17R_FROZEN_PLAN_SHA256) throw new Error("V3_17R_FROZEN_PLAN_MISMATCH");
    if (intent.method !== "POST" || intent.endpointPath !== STAYOPTI_V3_17R_RATES_PATH) {
      throw new Error("V3_17R_ENDPOINT_NOT_ALLOWLISTED");
    }
    if (intent.baseUrl !== STAYOPTI_V3_17R_RATES_BASE_URL_CANDIDATE) {
      throw new Error("V3_17R_BASE_URL_NOT_ALLOWLISTED");
    }
    if (this.#httpRequests >= STAYOPTI_V3_17R_FROZEN_PLAN.maxHttpRequests) {
      throw new Error("V3_17R_HTTP_HARD_CAP_EXCEEDED");
    }
    if (!this.#familyIds.has(intent.familyId)) throw new Error("V3_17R_FAMILY_NOT_FROZEN");
    if (this.#attemptedFamilies.has(intent.familyId)) throw new Error("V3_17R_SECOND_REQUEST_FOR_FAMILY_PROHIBITED");
    if (intent.retryOrdinal !== 0) throw new Error("V3_17R_RETRY_PROHIBITED");
    if (intent.redirectCount !== 0) throw new Error("V3_17R_REDIRECT_PROHIBITED");
    if (this.#inFlight !== 0) throw new Error("V3_17R_CONCURRENCY_LIMIT_EXCEEDED");
    if (!Number.isFinite(intent.monotonicStartMs) || intent.monotonicStartMs < 0) {
      throw new Error("V3_17R_MONOTONIC_TIME_INVALID");
    }
    if (this.#lastStartMs !== null) {
      const interval = intent.monotonicStartMs - this.#lastStartMs;
      if (interval < STAYOPTI_V3_17R_FROZEN_PLAN.minimumRequestIntervalMs) {
        throw new Error("V3_17R_MINIMUM_REQUEST_INTERVAL_NOT_MET");
      }
      this.#minimumObservedRequestIntervalMs = this.#minimumObservedRequestIntervalMs === null
        ? interval
        : Math.min(this.#minimumObservedRequestIntervalMs, interval);
    }
    this.#lastStartMs = intent.monotonicStartMs;
    this.#httpRequests += 1;
    this.#inFlight = 1;
    this.#maxObservedConcurrency = Math.max(this.#maxObservedConcurrency, this.#inFlight);
    this.#activeRequestOrdinal = this.#httpRequests;
    this.#attemptedFamilies.add(intent.familyId);
    return { requestOrdinal: this.#httpRequests, familyId: intent.familyId, transportAuthorized: true };
  }

  recordResponse(input: {
    requestOrdinal: number;
    outcome: StayOptiV317RProviderOutcomeV3;
    sessionIdConsistent: boolean;
  }) {
    if (this.#activeRequestOrdinal !== input.requestOrdinal || this.#inFlight !== 1) {
      throw new Error("V3_17R_RESPONSE_BINDING_INVALID");
    }
    this.#inFlight = 0;
    this.#activeRequestOrdinal = null;
    if (input.sessionIdConsistent !== true) {
      this.#aborted = true;
      throw new Error("V3_17R_SESSION_ID_INCOHERENT");
    }
    if (input.outcome === "NO_RESULTS") {
      this.#noResultsCount += 1;
      return;
    }
    if (input.outcome !== "SUCCESS") {
      this.#aborted = true;
      throw new Error("V3_17R_PROVIDER_OR_TRANSPORT_ABORT");
    }
  }

  finishWave() {
    if (!this.#waveStarted || this.#waveCompleted || this.#inFlight !== 0) {
      throw new Error("V3_17R_WAVE_FINISH_INVALID");
    }
    this.#waveCompleted = true;
  }

  snapshot(): StayOptiV317RGovernorSnapshotV3 {
    return {
      waveStarted: this.#waveStarted,
      waveCompleted: this.#waveCompleted,
      aborted: this.#aborted,
      httpRequests: this.#httpRequests,
      ratesHttpRequests: this.#httpRequests,
      retries: 0,
      redirects: 0,
      maxObservedConcurrency: this.#maxObservedConcurrency,
      minimumObservedRequestIntervalMs: this.#minimumObservedRequestIntervalMs,
      noResultsCount: this.#noResultsCount,
      attemptedFamilies: [...this.#attemptedFamilies].sort(compareStrings),
    };
  }
}

export interface StayOptiV317RSandboxDiagnosticCaseV3 {
  classification: typeof STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION;
  countsTowardRealGolden: false;
  goldenCase: StayOptiGoldenProjectionCaseResultV3["goldenCase"];
  validation: StayOptiGoldenProjectionCaseResultV3["validation"];
}

export function selectV317RSandboxDiagnosticCasesV3(
  projected: readonly StayOptiGoldenProjectionCaseResultV3[],
): StayOptiV317RSandboxDiagnosticCaseV3[] {
  return [...projected]
    .sort((left, right) =>
      compareStrings(left.goldenCase.goldenCaseId, right.goldenCase.goldenCaseId) ||
      compareStrings(left.goldenCase.declaredFingerprint ?? "", right.goldenCase.declaredFingerprint ?? ""))
    .slice(0, STAYOPTI_V3_17R_FROZEN_PLAN.maxCases)
    .map(({ goldenCase, validation }) => ({
      classification: STAYOPTI_V3_17R_SANDBOX_CASE_CLASSIFICATION,
      countsTowardRealGolden: false,
      goldenCase: structuredClone(goldenCase),
      validation: structuredClone(validation),
    }));
}

export function assertV317RNoRawProviderMaterialV3(value: unknown) {
  const serialized = stableSerializeV3(value);
  const unsafe = /(?:rawPayload|rawResponse|providerId|hotelId|rateId|offerId|prebookId|bookingId|continuationId|accessToken|apiKey|x-api-key|authorization)/i;
  if (unsafe.test(serialized)) throw new Error("V3_17R_RAW_PROVIDER_OR_SECRET_MATERIAL_PRESENT");
  return true;
}
