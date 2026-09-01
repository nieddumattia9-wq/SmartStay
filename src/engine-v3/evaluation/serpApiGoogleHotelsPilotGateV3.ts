import { stableSerializeV3 } from "../contract/stableHashV3";

import {
  adaptSerpApiGoogleHotelsExternalSessionV3,
  type SerpApiGoogleHotelsExternalProjectionV3,
  type SerpApiGoogleHotelsResponseV3,
} from "./serpApiGoogleHotelsExternalAdapterV3";
import {
  createSerpApiCanaryAuthorizationLiteralV3,
  type StayOptiSerpApiPilotStageV3,
} from "./serpApiGoogleHotelsPilotStageV3";

export const STAYOPTI_SERPAPI_PILOT_MANIFEST_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-pilot-manifest@1" as const;

export const STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-pilot-authorization@1" as const;

export const STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-pilot-receipt@1" as const;

export const STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3 =
  "640570740317cd36901fb605d73e6b7aeeadaff5" as const;

export const STAYOPTI_SERPAPI_PILOT_ID_V3 =
  "V3_17T2_SERPAPI_GOOGLE_HOTELS_12_SESSION_PILOT_001" as const;

export const STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3 =
  "https://serpapi.com/search.json" as const;

export const STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3 = "google_hotels" as const;
export const STAYOPTI_SERPAPI_MAX_API_CALLS_V3 = 48 as const;
export const STAYOPTI_SERPAPI_MAX_CONCURRENCY_V3 = 1 as const;
export const STAYOPTI_SERPAPI_AUTOMATIC_RETRY_BUDGET_V3 = 0 as const;
export const STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3 = 3 as const;

export const STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_STATES_V3 = [
  "DRAFT",
  "READY_FOR_EXPLICIT_AUTHORIZATION",
  "AUTHORIZED_NOT_STARTED",
  "RUNNING",
  "COMPLETED",
  "ABORTED",
  "INVALIDATED",
] as const;

export type StayOptiSerpApiPilotAuthorizationStateV3 =
  typeof STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_STATES_V3[number];

export interface StayOptiSerpApiPilotSessionV3 {
  sessionId: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  leadTimeDays: number;
  durationNights: number;
  adults: number;
  childAges: number[];
  rooms: number;
  currency: "EUR";
  gl: "it";
  hl: "it";
  userContext: "SOLO" | "SOLO_BUSINESS" | "COUPLE" | "FAMILY" | "THREE_ADULT_GROUP";
  budgetMinorUnits: number;
  preferenceProfile: "maximum-comfort" | "comfort" | "balanced" | "savings" | "maximum-savings";
  hardConstraints: string[];
  diagnosticPurpose: string;
  noCache: true;
}

export interface StayOptiSerpApiPilotManifestV3 {
  manifestVersion: typeof STAYOPTI_SERPAPI_PILOT_MANIFEST_VERSION_V3;
  pilotId: typeof STAYOPTI_SERPAPI_PILOT_ID_V3;
  materializedAt: string;
  sourceCommitSha: typeof STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3;
  sessions: StayOptiSerpApiPilotSessionV3[];
  maximumMainQueries: 12;
  maximumPropertyDetailsPerSession: 3;
  maximumApiCalls: 48;
  maximumConcurrency: 1;
  retryBudget: 0;
  automaticPaginationAllowed: false;
  reviewsAllowed: false;
  photosAllowed: false;
}

const SESSIONS: StayOptiSerpApiPilotSessionV3[] = [
  {
    sessionId: "SERP_PILOT_01_FLORENCE_COUPLE_BALANCED",
    destination: "Florence, Italy",
    checkIn: "2026-10-15", checkOut: "2026-10-17", leadTimeDays: 44,
    durationNights: 2, adults: 2, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "COUPLE",
    budgetMinorUnits: 70000, preferenceProfile: "balanced",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_700_EUR"],
    diagnosticPurpose: "ITALIAN_MEDIUM_MARKET_BALANCED_TWO_NIGHT_CHOICE_SET",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_02_ROME_SOLO_BUDGET",
    destination: "Rome, Italy",
    checkIn: "2026-10-29", checkOut: "2026-10-30", leadTimeDays: 58,
    durationNights: 1, adults: 1, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "SOLO",
    budgetMinorUnits: 22000, preferenceProfile: "maximum-savings",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_220_EUR"],
    diagnosticPurpose: "ITALIAN_HIGH_DEMAND_MARKET_SOLO_ONE_NIGHT_BUDGET",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_03_MILAN_BUSINESS_CANCELLATION",
    destination: "Milan, Italy",
    checkIn: "2027-07-10", checkOut: "2027-07-12", leadTimeDays: 312,
    durationNights: 2, adults: 1, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "SOLO_BUSINESS",
    budgetMinorUnits: 52000, preferenceProfile: "comfort",
    hardConstraints: ["ONE_ROOM", "FREE_CANCELLATION_REQUIRED", "TOTAL_BUDGET_520_EUR"],
    diagnosticPurpose: "ITALIAN_BUSINESS_MARKET_LONG_LEAD_CANCELLATION",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_04_PARIS_COUPLE_QUALITY",
    destination: "Paris, France",
    checkIn: "2026-11-12", checkOut: "2026-11-15", leadTimeDays: 72,
    durationNights: 3, adults: 2, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "COUPLE",
    budgetMinorUnits: 105000, preferenceProfile: "maximum-comfort",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_1050_EUR"],
    diagnosticPurpose: "EXPENSIVE_MARKET_COUPLE_QUALITY_PRIORITY",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_05_LONDON_COUPLE_VALUE",
    destination: "London, United Kingdom",
    checkIn: "2027-06-05", checkOut: "2027-06-09", leadTimeDays: 277,
    durationNights: 4, adults: 2, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "COUPLE",
    budgetMinorUnits: 120000, preferenceProfile: "savings",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_1200_EUR"],
    diagnosticPurpose: "EXPENSIVE_NON_EURO_MARKET_LONG_LEAD_VALUE",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_06_BARCELONA_FAMILY_COMFORT",
    destination: "Barcelona, Spain",
    checkIn: "2027-01-16", checkOut: "2027-01-20", leadTimeDays: 137,
    durationNights: 4, adults: 2, childAges: [8, 12], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "FAMILY",
    budgetMinorUnits: 110000, preferenceProfile: "comfort",
    hardConstraints: ["ONE_FAMILY_ROOM", "CHILDREN_AGES_8_12", "TOTAL_BUDGET_1100_EUR"],
    diagnosticPurpose: "FAMILY_OCCUPANCY_COMFORT_AND_ROOM_EVIDENCE",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_07_LISBON_COUPLE_LONG_STAY",
    destination: "Lisbon, Portugal",
    checkIn: "2027-07-17", checkOut: "2027-07-24", leadTimeDays: 319,
    durationNights: 7, adults: 2, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "COUPLE",
    budgetMinorUnits: 140000, preferenceProfile: "savings",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_1400_EUR"],
    diagnosticPurpose: "LONG_STAY_TOTAL_VERSUS_NIGHTLY_PRICE_SEMANTICS",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_08_AMSTERDAM_COUPLE_LOCATION",
    destination: "Amsterdam, Netherlands",
    checkIn: "2026-11-26", checkOut: "2026-11-28", leadTimeDays: 86,
    durationNights: 2, adults: 2, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "COUPLE",
    budgetMinorUnits: 65000, preferenceProfile: "balanced",
    hardConstraints: ["ONE_ROOM", "CENTRAL_LOCATION_PRIORITY", "TOTAL_BUDGET_650_EUR"],
    diagnosticPurpose: "EXPENSIVE_MARKET_LOCATION_PRIORITY_AND_COORDINATE_MISSINGNESS",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_09_PRAGUE_THREE_ADULTS_VALUE",
    destination: "Prague, Czechia",
    checkIn: "2027-02-13", checkOut: "2027-02-16", leadTimeDays: 165,
    durationNights: 3, adults: 3, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "THREE_ADULT_GROUP",
    budgetMinorUnits: 60000, preferenceProfile: "savings",
    hardConstraints: ["THREE_ADULT_OCCUPANCY", "TOTAL_BUDGET_600_EUR"],
    diagnosticPurpose: "LOWER_PRICE_MARKET_THREE_ADULT_OCCUPANCY",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_10_VIENNA_FAMILY_COMFORT",
    destination: "Vienna, Austria",
    checkIn: "2027-08-07", checkOut: "2027-08-12", leadTimeDays: 340,
    durationNights: 5, adults: 2, childAges: [5], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "FAMILY",
    budgetMinorUnits: 130000, preferenceProfile: "maximum-comfort",
    hardConstraints: ["ONE_FAMILY_ROOM", "CHILD_AGE_5", "TOTAL_BUDGET_1300_EUR"],
    diagnosticPurpose: "FAMILY_LONG_STAY_COMFORT_AMENITY_REVIEW_RELIABILITY",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_11_BERLIN_SOLO_LONG_VALUE",
    destination: "Berlin, Germany",
    checkIn: "2027-03-06", checkOut: "2027-03-12", leadTimeDays: 186,
    durationNights: 6, adults: 1, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "SOLO",
    budgetMinorUnits: 90000, preferenceProfile: "maximum-savings",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_900_EUR"],
    diagnosticPurpose: "LARGE_CHOICE_SET_LONG_STAY_BUDGET_AND_PAGINATION_DIAGNOSTIC",
    noCache: true,
  },
  {
    sessionId: "SERP_PILOT_12_COPENHAGEN_COUPLE_QUALITY",
    destination: "Copenhagen, Denmark",
    checkIn: "2026-12-12", checkOut: "2026-12-13", leadTimeDays: 102,
    durationNights: 1, adults: 2, childAges: [], rooms: 1,
    currency: "EUR", gl: "it", hl: "it", userContext: "COUPLE",
    budgetMinorUnits: 40000, preferenceProfile: "comfort",
    hardConstraints: ["ONE_ROOM", "TOTAL_BUDGET_400_EUR"],
    diagnosticPurpose: "EXPENSIVE_NON_EURO_MARKET_ONE_NIGHT_QUALITY",
    noCache: true,
  },
];

export const STAYOPTI_SERPAPI_PILOT_MANIFEST_V3: StayOptiSerpApiPilotManifestV3 =
  Object.freeze({
    manifestVersion: STAYOPTI_SERPAPI_PILOT_MANIFEST_VERSION_V3,
    pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
    materializedAt: "2026-09-01T14:51:15+02:00",
    sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
    sessions: Object.freeze(SESSIONS.map((session) => Object.freeze({
      ...session,
      childAges: Object.freeze([...session.childAges]),
      hardConstraints: Object.freeze([...session.hardConstraints]),
    }))) as unknown as StayOptiSerpApiPilotSessionV3[],
    maximumMainQueries: 12,
    maximumPropertyDetailsPerSession: STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3,
    maximumApiCalls: STAYOPTI_SERPAPI_MAX_API_CALLS_V3,
    maximumConcurrency: STAYOPTI_SERPAPI_MAX_CONCURRENCY_V3,
    retryBudget: STAYOPTI_SERPAPI_AUTOMATIC_RETRY_BUDGET_V3,
    automaticPaginationAllowed: false,
    reviewsAllowed: false,
    photosAllowed: false,
  });

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
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") {
    throw new Error("SerpApi pilot hashing requires the Node built-in crypto module.");
  }
  return cryptoModule;
}

function sha256(value: unknown, namespace: string) {
  return nodeCrypto().createHash("sha256")
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex");
}

export function createSerpApiPilotManifestHashV3(
  manifest: StayOptiSerpApiPilotManifestV3 = STAYOPTI_SERPAPI_PILOT_MANIFEST_V3,
) {
  return sha256(manifest, "stayopti-v3-serpapi-google-hotels-pilot-manifest");
}

export const STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3 =
  createSerpApiPilotManifestHashV3();

export const STAYOPTI_SERPAPI_REVOKED_AUTHORIZATION_LITERAL_V3 =
  `AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_MAX48` as const;

export const STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3 =
  /* RUNNER_BUNDLE_HASH_START */ "f4649a0229b60e18908a09f5cf580bbf8e0648cadf987e0b442c6ce225e52e13" /* RUNNER_BUNDLE_HASH_END */ as const;

export const STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-retention@2" as const;

export const STAYOPTI_SERPAPI_REVOKED_MAX48_AUTHORIZATION_LITERAL_V3 =
  `AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_RUNNER_67cfd073efbc3177590c9a05feafb1612cc09c359421791414a3c5fadd901cd6_RETENTION_V2_MAX48` as const;

export const STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3 = Object.freeze([
  `AUTHORIZE_V3_17T2_CANARY_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_RUNNER_c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01_RETENTION_V2_MAX4`,
  `AUTHORIZE_V3_17T2_CANARY_${STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3}_RUNNER_d3176600f3d028c450174b7e14de87084a3eab549eb60350f260043539a08683_RETENTION_V2_MAX4`,
]);

export const STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3 =
  createSerpApiCanaryAuthorizationLiteralV3(
    STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,
  );

/** Current executable authorization is Stage A only. */
export const STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3 =
  STAYOPTI_SERPAPI_CANARY_AUTHORIZATION_LITERAL_V3;

export const STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3 = Object.freeze({
  retentionPolicyVersion: STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_VERSION_V3,
  rawPayloadRetention: "EPHEMERAL_UNTIL_VALIDATED" as const,
  rawPayloadStorage: "UNIQUE_TEMP_DIRECTORY_OUTSIDE_REPOSITORY" as const,
  rawHtmlRetention: "NONE" as const,
  imageRetention: "NONE" as const,
  urlTokenRetention: "NONE" as const,
  normalizedSanitizedSnapshotRetention: "UNTIL_V3_17_CLOSURE" as const,
  redistribution: "PROHIBITED" as const,
  publication: "PROHIBITED" as const,
  modelTraining: "PROHIBITED" as const,
  useScope: "INTERNAL_NON_REDISTRIBUTED_EVALUATION" as const,
  authorizationGranted: false as const,
});

export const STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_CONTRACT_V3 = Object.freeze({
  authorizationVersion: STAYOPTI_SERPAPI_PILOT_AUTHORIZATION_VERSION_V3,
  pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
  sourceCommitSha: STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3,
  manifestVersion: STAYOPTI_SERPAPI_PILOT_MANIFEST_VERSION_V3,
  manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
  executionModel: "STAGED_CANARY_THEN_REMAINING" as const,
  canaryQueryCount: 1 as const,
  priorConsumedCanaryApiCalls: 2 as const,
  canaryMaximumApiCalls: 2 as const,
  remainingQueryCount: 11 as const,
  remainingMaximumApiCalls: 44 as const,
  maximumApiCallsAcrossStages: STAYOPTI_SERPAPI_MAX_API_CALLS_V3,
  maximumConcurrency: STAYOPTI_SERPAPI_MAX_CONCURRENCY_V3,
  retryBudget: STAYOPTI_SERPAPI_AUTOMATIC_RETRY_BUDGET_V3,
  allowedEngine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
  allowedEndpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
  forbiddenEndpoints: Object.freeze([
    "google_hotels_reviews",
    "google_hotels_photos",
    "google_search",
    "liteapi",
    "booking",
    "prebook",
    "payment",
  ]),
  accountPlan: "FREE" as const,
  dataUseScope: "INTERNAL_NON_REDISTRIBUTED_EVALUATION" as const,
  retentionPolicy: STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_V3,
  rawPayloadPolicy: "EPHEMERAL_TEMP_DELETE_ALWAYS" as const,
  sanitizedSnapshotPolicy: "PERSIST_PROVIDER_NEUTRAL_ONLY" as const,
  authorizationState: "READY_FOR_EXPLICIT_AUTHORIZATION" as const,
  requiredAuthorizationLiteral: STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3,
  revokedAuthorizationLiteral: STAYOPTI_SERPAPI_REVOKED_MAX48_AUTHORIZATION_LITERAL_V3,
  remainingAuthorizationRequiresCanaryZipHash: true as const,
  stagesRequireSeparateProcesses: true as const,
  abortConditions: Object.freeze([
    "SOURCE_SHA_MISMATCH",
    "MANIFEST_HASH_MISMATCH",
    "MANIFEST_EXPIRED",
    "AUTHORIZATION_LITERAL_MISMATCH",
    "RETENTION_NOT_AUTHORIZED",
    "STAGE_INVALID",
    "CANARY_EVIDENCE_REQUIRED",
    "CANARY_EVIDENCE_INVALID",
    "CANARY_MANUAL_REVIEW_REQUIRED",
    "DUPLICATE_REQUEST",
    "API_KEY_MISSING",
    "ENDPOINT_NOT_ALLOWLISTED",
    "ABORT_REQUEST_CAP_REACHED",
    "CONCURRENCY_LIMIT_EXCEEDED",
    "HTTP_OR_TRANSPORT_FAILURE",
    "RESPONSE_NOT_PROCESSABLE",
  ]),
  startedAt: null,
  completedAt: null,
  requestLedgerHash: null,
  receiptHash: null,
});

export interface StayOptiSerpApiPilotAuthorizationEnvelopeV3 {
  authorizationState: "AUTHORIZED_NOT_STARTED";
  literal: string;
  stage: StayOptiSerpApiPilotStageV3;
  sourceCommitSha: string;
  manifestHash: string;
  accountPlan: "FREE";
  retentionAuthorized: true;
  canaryEvidenceZipSha256?: string;
}

export interface StayOptiSerpApiPilotRequestV3 {
  requestOrdinal: number;
  sessionId: string;
  requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL";
  engine: typeof STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3;
  endpoint: typeof STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3;
  url: string;
  sanitizedUrl: string;
}

export interface StayOptiSerpApiPilotTransportResponseV3 {
  httpStatus: number;
  body: unknown;
  bodyParsed?: boolean;
  contentType?: string | null;
  responseByteLength?: number | null;
}

export interface StayOptiSerpApiPilotTransportV3 {
  send(request: StayOptiSerpApiPilotRequestV3): Promise<StayOptiSerpApiPilotTransportResponseV3>;
}

export interface StayOptiSerpApiPilotRawStoreV3 {
  writeEphemeral(name: string, value: string): void;
  removeEphemeral(name: string): void;
  removeAllEphemeral(): void;
  existsEphemeral?(name: string): boolean;
}

export interface StayOptiSerpApiDetailCandidateV3 {
  localReference: string;
  propertyToken: string;
  selectedByV2: boolean;
  selectedByV3: boolean;
  decisionScoreBps: number;
  evidenceCompletenessBps: number;
  totalPriceMinorUnits: number | null;
  ratingNormalizedBps: number | null;
}

export interface StayOptiSerpApiPilotReceiptV3 {
  receiptVersion: typeof STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3;
  pilotId: typeof STAYOPTI_SERPAPI_PILOT_ID_V3;
  status: "COMPLETED" | "ABORTED";
  manifestHash: string;
  authorizationConsumed: boolean;
  requestCount: number;
  mainSearchCount: number;
  propertyDetailCount: number;
  requestLedgerHash: string;
  requestDiagnostics: Array<{
    requestOrdinal: number;
    sessionId: string;
    requestedAt: string;
    completedAt: string;
    noCacheRequested: true;
    processingStatus: string;
    cacheMetadata: "UNKNOWN_NOT_INFERRED";
    sourceFreshness: "REQUESTED_FRESH_RESULT_UNVERIFIED";
    sanitizedParameters: {
      checkIn: string;
      checkOut: string;
      adults: number;
      childCount: number;
      rooms: number;
      currency: "EUR";
      gl: "it";
      hl: "it";
    };
  }>;
  sanitizedSnapshotFingerprints: string[];
  rawPayloadsPersisted: 0;
  apiKeyPersisted: false;
  automaticGoldenAdmission: false;
  v3_17GateMet: false;
  v3_18EntryAllowed: false;
  failureClassification: string | null;
  receiptHash: string;
}

function dateIsValidFuture(date: string, nowIso: string) {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  const now = Date.parse(nowIso);
  return Number.isFinite(parsed) && Number.isFinite(now) && parsed > now;
}

export function redactSerpApiDiagnosticV3(value: string) {
  return value
    .replace(/([?&]api_key=)[^&\s]*/gi, "$1[REDACTED]")
    .replace(/([?&]property_token=)[^&\s]*/gi, "$1[REDACTED]")
    .replace(/\b(?:api[_-]?key)\s*[:=]\s*[^\s&,]+/gi, "api_key=[REDACTED]");
}

function buildMainSearchUrl(session: StayOptiSerpApiPilotSessionV3, apiKey: string) {
  const url = new URL(STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3);
  const children = session.childAges.join(",");
  url.searchParams.set("engine", STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3);
  url.searchParams.set("q", session.destination);
  url.searchParams.set("check_in_date", session.checkIn);
  url.searchParams.set("check_out_date", session.checkOut);
  url.searchParams.set("adults", String(session.adults));
  if (children.length > 0) url.searchParams.set("children", children);
  url.searchParams.set("currency", session.currency);
  url.searchParams.set("gl", session.gl);
  url.searchParams.set("hl", session.hl);
  url.searchParams.set("no_cache", "true");
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function validateEnvelope(
  envelope: StayOptiSerpApiPilotAuthorizationEnvelopeV3 | null,
  apiKey: string,
  observedSourceSha: string,
  nowIso: string,
) {
  if (envelope === null) throw new Error("SERPAPI_PILOT_AUTHORIZATION_REQUIRED");
  if (envelope.authorizationState !== "AUTHORIZED_NOT_STARTED") throw new Error("SERPAPI_PILOT_AUTHORIZATION_STATE_INVALID");
  if (envelope.stage !== "CANARY") throw new Error("SERPAPI_PILOT_STAGE_SESSION_NOT_ALLOWED");
  if (envelope.literal !== STAYOPTI_SERPAPI_REQUIRED_AUTHORIZATION_LITERAL_V3) throw new Error("SERPAPI_PILOT_AUTHORIZATION_LITERAL_MISMATCH");
  if (observedSourceSha !== STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3 || envelope.sourceCommitSha !== STAYOPTI_SERPAPI_PILOT_SOURCE_SHA_V3) throw new Error("SERPAPI_PILOT_SOURCE_SHA_MISMATCH");
  if (envelope.manifestHash !== STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3 || createSerpApiPilotManifestHashV3() !== envelope.manifestHash) throw new Error("SERPAPI_PILOT_MANIFEST_HASH_MISMATCH");
  if (envelope.accountPlan !== "FREE") throw new Error("SERPAPI_PILOT_ACCOUNT_PLAN_MISMATCH");
  if (envelope.retentionAuthorized !== true) throw new Error("SERPAPI_PILOT_RETENTION_NOT_AUTHORIZED");
  if (typeof apiKey !== "string" || apiKey.length === 0) throw new Error("SERPAPI_PILOT_API_KEY_MISSING");
  if (STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.some((session) => !dateIsValidFuture(session.checkIn, nowIso))) throw new Error("SERPAPI_PILOT_MANIFEST_EXPIRED");
}

export class StayOptiSerpApiRequestLedgerV3 {
  readonly #entries: Array<{ ordinal: number; sessionId: string; requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL" }> = [];
  #active = 0;

  reserve(sessionId: string, requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL") {
    if (this.#active >= STAYOPTI_SERPAPI_MAX_CONCURRENCY_V3) throw new Error("SERPAPI_PILOT_CONCURRENCY_LIMIT_EXCEEDED");
    if (this.#entries.length >= STAYOPTI_SERPAPI_MAX_API_CALLS_V3) throw new Error("ABORT_REQUEST_CAP_REACHED");
    this.#active += 1;
    const entry = { ordinal: this.#entries.length + 1, sessionId, requestKind };
    this.#entries.push(entry);
    return Object.freeze({ ...entry });
  }

  complete() {
    if (this.#active !== 1) throw new Error("SERPAPI_PILOT_LEDGER_COMPLETION_INVALID");
    this.#active = 0;
  }

  snapshot() {
    return Object.freeze(this.#entries.map((entry) => Object.freeze({ ...entry })));
  }

  hash() {
    return sha256(this.#entries, "stayopti-v3-serpapi-pilot-request-ledger");
  }
}

function detailProjection(candidate: StayOptiSerpApiDetailCandidateV3) {
  return {
    selectedByV2: candidate.selectedByV2,
    selectedByV3: candidate.selectedByV3,
    decisionScoreBps: candidate.decisionScoreBps,
    evidenceCompletenessBps: candidate.evidenceCompletenessBps,
    totalPriceMinorUnits: candidate.totalPriceMinorUnits,
    ratingNormalizedBps: candidate.ratingNormalizedBps,
  };
}

export function selectSerpApiPropertyDetailCandidatesV3(
  candidates: readonly StayOptiSerpApiDetailCandidateV3[],
) {
  const ordered = [...candidates].sort((left, right) =>
    Number(right.selectedByV2) - Number(left.selectedByV2) ||
    Number(right.selectedByV3) - Number(left.selectedByV3) ||
    right.decisionScoreBps - left.decisionScoreBps ||
    right.evidenceCompletenessBps - left.evidenceCompletenessBps ||
    (left.totalPriceMinorUnits ?? Number.MAX_SAFE_INTEGER) - (right.totalPriceMinorUnits ?? Number.MAX_SAFE_INTEGER) ||
    (right.ratingNormalizedBps ?? -1) - (left.ratingNormalizedBps ?? -1)
  );
  const selected: StayOptiSerpApiDetailCandidateV3[] = [];
  for (const candidate of ordered) {
    if (selected.some((entry) => stableSerializeV3(detailProjection(entry)) === stableSerializeV3(detailProjection(candidate)))) continue;
    selected.push(candidate);
    if (selected.length === STAYOPTI_SERPAPI_MAX_DETAILS_PER_SESSION_V3) break;
  }
  return selected;
}

export function assertSerpApiPilotRequestAllowedV3(request: {
  endpoint: string;
  engine: string;
  requestKind: string;
  paginationToken?: string | null;
}) {
  if (request.endpoint !== STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3 || request.engine !== STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3) throw new Error("SERPAPI_PILOT_ENDPOINT_NOT_ALLOWLISTED");
  if (!['MAIN_SEARCH', 'PROPERTY_DETAIL'].includes(request.requestKind)) throw new Error("SERPAPI_PILOT_ENDPOINT_NOT_ALLOWLISTED");
  if (request.paginationToken !== undefined && request.paginationToken !== null) throw new Error("SERPAPI_PILOT_AUTOMATIC_PAGINATION_PROHIBITED");
}

function receipt(
  status: "COMPLETED" | "ABORTED",
  ledger: StayOptiSerpApiRequestLedgerV3,
  projections: readonly SerpApiGoogleHotelsExternalProjectionV3[],
  requestDiagnostics: StayOptiSerpApiPilotReceiptV3["requestDiagnostics"],
  failureClassification: string | null,
): StayOptiSerpApiPilotReceiptV3 {
  const entries = ledger.snapshot();
  const body: Omit<StayOptiSerpApiPilotReceiptV3, "receiptHash"> = {
    receiptVersion: STAYOPTI_SERPAPI_PILOT_RECEIPT_VERSION_V3,
    pilotId: STAYOPTI_SERPAPI_PILOT_ID_V3,
    status,
    manifestHash: STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,
    authorizationConsumed: entries.length > 0,
    requestCount: entries.length,
    mainSearchCount: entries.filter((entry) => entry.requestKind === "MAIN_SEARCH").length,
    propertyDetailCount: entries.filter((entry) => entry.requestKind === "PROPERTY_DETAIL").length,
    requestLedgerHash: ledger.hash(),
    requestDiagnostics: [...requestDiagnostics],
    sanitizedSnapshotFingerprints: projections.map((projection) => projection.session.sessionFingerprint).sort(),
    rawPayloadsPersisted: 0,
    apiKeyPersisted: false,
    automaticGoldenAdmission: false,
    v3_17GateMet: false,
    v3_18EntryAllowed: false,
    failureClassification,
  };
  return { ...body, receiptHash: sha256(body, "stayopti-v3-serpapi-pilot-receipt") };
}

export async function executeSerpApiGoogleHotelsPilotV3(input: {
  authorization: StayOptiSerpApiPilotAuthorizationEnvelopeV3 | null;
  apiKey: string;
  observedSourceSha: string;
  nowIso: string;
  transport: StayOptiSerpApiPilotTransportV3;
  rawStore: StayOptiSerpApiPilotRawStoreV3;
  clock?: () => string;
}): Promise<StayOptiSerpApiPilotReceiptV3> {
  validateEnvelope(input.authorization, input.apiKey, input.observedSourceSha, input.nowIso);
  const ledger = new StayOptiSerpApiRequestLedgerV3();
  const projections: SerpApiGoogleHotelsExternalProjectionV3[] = [];
  const requestDiagnostics: StayOptiSerpApiPilotReceiptV3["requestDiagnostics"] = [];
  const clock = input.clock ?? (() => input.nowIso);
  try {
    for (const session of STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions.slice(0, 1)) {
      assertSerpApiPilotRequestAllowedV3({
        endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
        engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
        requestKind: "MAIN_SEARCH",
      });
      const reserved = ledger.reserve(session.sessionId, "MAIN_SEARCH");
      const url = buildMainSearchUrl(session, input.apiKey);
      const rawName = `request-${String(reserved.ordinal).padStart(2, "0")}.json`;
      const requestedAt = clock();
      try {
        const response = await input.transport.send({
          requestOrdinal: reserved.ordinal,
          sessionId: session.sessionId,
          requestKind: "MAIN_SEARCH",
          engine: STAYOPTI_SERPAPI_ALLOWED_ENGINE_V3,
          endpoint: STAYOPTI_SERPAPI_SEARCH_ENDPOINT_V3,
          url,
          sanitizedUrl: redactSerpApiDiagnosticV3(url),
        });
        if (!Number.isInteger(response.httpStatus) || response.httpStatus < 200 || response.httpStatus >= 300) throw new Error("SERPAPI_PILOT_HTTP_OR_TRANSPORT_FAILURE");
        if (response.body === null || typeof response.body !== "object" || Array.isArray(response.body)) throw new Error("SERPAPI_PILOT_RESPONSE_NOT_PROCESSABLE");
        const responseBody = response.body as SerpApiGoogleHotelsResponseV3;
        input.rawStore.writeEphemeral(rawName, JSON.stringify(response.body));
        const projection = adaptSerpApiGoogleHotelsExternalSessionV3(responseBody);
        projections.push(projection);
        requestDiagnostics.push({
          requestOrdinal: reserved.ordinal,
          sessionId: session.sessionId,
          requestedAt,
          completedAt: clock(),
          noCacheRequested: true,
          processingStatus: typeof responseBody.search_metadata?.status === "string"
            ? responseBody.search_metadata.status
            : "UNKNOWN",
          cacheMetadata: "UNKNOWN_NOT_INFERRED",
          sourceFreshness: "REQUESTED_FRESH_RESULT_UNVERIFIED",
          sanitizedParameters: {
            checkIn: session.checkIn,
            checkOut: session.checkOut,
            adults: session.adults,
            childCount: session.childAges.length,
            rooms: session.rooms,
            currency: session.currency,
            gl: session.gl,
            hl: session.hl,
          },
        });
        input.rawStore.removeEphemeral(rawName);
      } finally {
        ledger.complete();
      }
    }
    input.rawStore.removeAllEphemeral();
    return receipt("COMPLETED", ledger, projections, requestDiagnostics, null);
  } catch (error) {
    input.rawStore.removeAllEphemeral();
    const message = error instanceof Error && /^SERPAPI_PILOT_[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "SERPAPI_PILOT_SANITIZED_ABORT";
    return receipt("ABORTED", ledger, projections, requestDiagnostics, message);
  }
}

export const STAYOPTI_SERPAPI_PILOT_GATE_AUDIT_V3 = Object.freeze({
  authorizationState: "READY_FOR_EXPLICIT_AUTHORIZATION" as const,
  explicitCallAuthorizationGranted: false as const,
  retentionAuthorizationGranted: false as const,
  collectorNetworkEnabledInT1: false as const,
  credentialSource: "PROCESS_ENVIRONMENT_ONLY" as const,
  apiKeyPersisted: false as const,
  apiKeyPrinted: false as const,
  automaticRetries: 0 as const,
  automaticPagination: false as const,
  maximumConcurrency: 1 as const,
  publicRuntimeChanged: false as const,
  providerRegistryChanged: false as const,
  automaticGoldenAdmission: false as const,
  v3_17GateMet: false as const,
  v3_18EntryAllowed: false as const,
});
