import { stableSerializeV3 } from "../contract/stableHashV3";

import {
  type ExternalHotelChoiceSessionV3,
  type StayOptiExternalKnownValueV3,
} from "./externalHotelChoiceContractV3";
import {
  createExternalHotelChoiceSessionFingerprintV3,
  validateExternalHotelChoiceSessionV3,
} from "./externalHotelChoiceReplayV3";
import {
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3,
  STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3,
  adaptSerpApiGoogleHotelsExternalSessionV3,
  type SerpApiGoogleHotelsExternalProjectionV3,
  type SerpApiGoogleHotelsPropertyV3,
  type SerpApiGoogleHotelsResponseV3,
  type SerpApiObservedValueV3,
} from "./serpApiGoogleHotelsExternalAdapterV3";

export const STAYOPTI_SERPAPI_PILOT_SNAPSHOT_SCHEMA_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-sanitized-snapshot@1" as const;
export const STAYOPTI_SERPAPI_PILOT_EVIDENCE_SCHEMA_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-evidence-bundle@1" as const;
export const STAYOPTI_SERPAPI_PILOT_RETENTION_POLICY_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-retention@2" as const;
export const STAYOPTI_SERPAPI_PILOT_T3_INPUT_VERSION_V3 =
  "stayopti.v3.serpapi-google-hotels-t3-input@1" as const;

export type StayOptiSerpApiDetailEnrichmentStatusV3 =
  | "NOT_SELECTED"
  | "SELECTED_PENDING"
  | "MERGED"
  | "FAILED_SANITIZED";

export interface StayOptiSerpApiSanitizedAlternativeV3 {
  anonymousPropertyId: string;
  displayedRank: number;
  sponsored: StayOptiExternalKnownValueV3<boolean>;
  propertyType: StayOptiExternalKnownValueV3<string>;
  hotelClass: StayOptiExternalKnownValueV3<number>;
  reviewRating: StayOptiExternalKnownValueV3<number>;
  reviewCount: StayOptiExternalKnownValueV3<number>;
  nightlyPrice: SerpApiObservedValueV3<number>;
  totalStayPrice: SerpApiObservedValueV3<number>;
  beforeTaxesAndFees: SerpApiObservedValueV3<number>;
  taxesAndFeesKnown: SerpApiObservedValueV3<boolean>;
  lowestObservedPrice: SerpApiObservedValueV3<number>;
  sellerSpecificPrice: SerpApiObservedValueV3<boolean>;
  exactBookableOfferKnown: SerpApiObservedValueV3<boolean>;
  currency: StayOptiExternalKnownValueV3<string>;
  freeCancellation: StayOptiExternalKnownValueV3<boolean>;
  amenities: StayOptiExternalKnownValueV3<string[]>;
  coordinates: {
    latitude: SerpApiObservedValueV3<number>;
    longitude: SerpApiObservedValueV3<number>;
  };
  locationEvidence: "COORDINATES_OBSERVED" | "UNKNOWN";
  sellerAvailabilitySemantics: {
    observedSellerCount: number;
    exactSellerAvailabilityKnown: false;
  };
  availabilitySemantics: StayOptiExternalKnownValueV3<"AVAILABLE" | "UNAVAILABLE">;
  missingness: string[];
  fieldProvenance: Readonly<Record<string, string>>;
  evidenceStrength: "IMPRESSION_ONLY";
  mappingCompleteness: "COMPLETE_FOR_REPLAY" | "PARTIAL_DIAGNOSTIC_ONLY";
  detailEnrichmentStatus: StayOptiSerpApiDetailEnrichmentStatusV3;
}

export interface StayOptiSerpApiSanitizedSnapshotV3 {
  schemaVersion: typeof STAYOPTI_SERPAPI_PILOT_SNAPSHOT_SCHEMA_VERSION_V3;
  pilotId: string;
  manifestHash: string;
  sessionId: string;
  sourceRole: typeof STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3;
  recordClass: typeof STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3;
  upstreamSource: "SERPAPI_GOOGLE_HOTELS";
  captureTimestamp: string;
  searchTimestamp: string;
  destinationToken: string;
  checkIn: string;
  checkOut: string;
  durationNights: number;
  adults: number;
  children: number;
  childAges: number[];
  rooms: number;
  currency: "EUR";
  gl: "it";
  hl: "it";
  budgetMinorUnits: number;
  preferenceProfile: string;
  hardConstraints: string[];
  sortContext: string;
  noCacheRequested: true;
  choiceSetCompleteness: "COMPLETE_VISIBLE_SET" | "PARTIAL_VISIBLE_SET" | "UNKNOWN";
  resultCount: number;
  mappingCompleteness: "COMPLETE_FOR_REPLAY" | "PARTIAL_DIAGNOSTIC_ONLY";
  sessionEvidenceStrength: "IMPRESSION_ONLY";
  sessionBiasFlags: string[];
  missingness: string[];
  alternatives: StayOptiSerpApiSanitizedAlternativeV3[];
  externalSession: ExternalHotelChoiceSessionV3;
  normalizedSnapshotHash: string;
}

export interface StayOptiSerpApiRawDeletionReceiptV3 {
  requestOrdinal: number;
  sessionId: string;
  requestKind: "MAIN_SEARCH" | "PROPERTY_DETAIL";
  ephemeralPayloadSha256: string;
  rawCreated: true;
  rawDeleted: true;
  verifiedAbsent: true;
}

export interface StayOptiSerpApiEvidenceArchiveEntryV3 {
  name: string;
  content: string;
}

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
    throw new Error("SerpApi pilot evidence hashing requires Node crypto.");
  }
  return cryptoModule;
}

export function sha256SerpApiEvidenceV3(value: string) {
  return nodeCrypto().createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalHash(value: unknown, namespace: string) {
  return sha256SerpApiEvidenceV3(`${namespace}\n${stableSerializeV3(value)}`);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function known<T>(value: T, provenance: string): StayOptiExternalKnownValueV3<T> {
  return { state: "KNOWN", value, provenance };
}

function unknown<T>(provenance: string): StayOptiExternalKnownValueV3<T> {
  return { state: "UNKNOWN", value: null, provenance };
}

function propertyType(property: SerpApiGoogleHotelsPropertyV3) {
  return typeof property.type === "string" && property.type.length > 0
    ? known(property.type, "SERPAPI_GOOGLE_HOTELS.type")
    : unknown<string>("SERPAPI_GOOGLE_HOTELS.type.MISSING");
}

function localAlternativeId(sessionId: string, displayedRank: number) {
  const ordinal = String(displayedRank).padStart(3, "0");
  const sessionToken = sha256SerpApiEvidenceV3(
    `stayopti-v3-serpapi-pilot-local-alternative\n${sessionId}`,
  ).slice(0, 16).toUpperCase();
  return `ANON_PILOT_${sessionToken}_${ordinal}`;
}

function remapExternalSession(
  projection: SerpApiGoogleHotelsExternalProjectionV3,
  sessionId: string,
) {
  const session = cloneJson(projection.session);
  const idMap = new Map<string, string>();
  session.alternatives = session.alternatives.map((alternative) => {
    const replacement = localAlternativeId(sessionId, alternative.displayedRank);
    idMap.set(alternative.anonymousPropertyId, replacement);
    return { ...alternative, anonymousPropertyId: replacement };
  });
  session.observedActions = session.observedActions.map((action) => ({
    ...action,
    anonymousPropertyId: action.anonymousPropertyId === null
      ? null
      : idMap.get(action.anonymousPropertyId) ?? null,
  }));
  if (session.choiceSetCompleteness !== "COMPLETE_VISIBLE_SET" && !session.biasFlags.includes("UNOBSERVED_ALTERNATIVES")) {
    session.biasFlags = [...session.biasFlags, "UNOBSERVED_ALTERNATIVES"].sort() as typeof session.biasFlags;
  }
  const material = { ...session, sessionFingerprint: "" };
  session.sessionFingerprint = createExternalHotelChoiceSessionFingerprintV3(material);
  return session;
}

function detailStatusFor(
  displayedRank: number,
  statuses: Readonly<Record<number, StayOptiSerpApiDetailEnrichmentStatusV3>>,
) {
  return statuses[displayedRank] ?? "NOT_SELECTED";
}

export function createSerpApiSanitizedSnapshotV3(input: {
  pilotId: string;
  manifestHash: string;
  session: {
    sessionId: string;
    checkIn: string;
    checkOut: string;
    durationNights: number;
    adults: number;
    childAges: readonly number[];
    rooms: number;
    currency: "EUR";
    gl: "it";
    hl: "it";
    budgetMinorUnits: number;
    preferenceProfile: string;
    hardConstraints: readonly string[];
  };
  response: SerpApiGoogleHotelsResponseV3;
  captureTimestamp: string;
  detailStatuses?: Readonly<Record<number, StayOptiSerpApiDetailEnrichmentStatusV3>>;
}): StayOptiSerpApiSanitizedSnapshotV3 {
  const projection = adaptSerpApiGoogleHotelsExternalSessionV3(input.response);
  const externalSession = remapExternalSession(projection, input.session.sessionId);
  const rawProperties = [...(input.response.ads ?? []), ...(input.response.properties ?? [])];
  const statuses = input.detailStatuses ?? {};
  const alternatives = externalSession.alternatives.map((alternative, index) => {
    const raw = rawProperties[index] ?? {};
    const price = projection.priceSemantics[index];
    const location = projection.locationSemantics[index];
    if (price === undefined || location === undefined) throw new Error("SNAPSHOT_PROJECTION_ALIGNMENT_FAILED");
    const currency = externalSession.currencyKnown.state === "KNOWN"
      ? known(externalSession.currencyKnown.value, externalSession.currencyKnown.provenance)
      : unknown<string>(externalSession.currencyKnown.provenance);
    const missingness = [...new Set(alternative.missingness)].sort();
    const mappingCompleteness = missingness.length === 0
      ? "COMPLETE_FOR_REPLAY" as const
      : "PARTIAL_DIAGNOSTIC_ONLY" as const;
    return {
      anonymousPropertyId: alternative.anonymousPropertyId,
      displayedRank: alternative.displayedRank,
      sponsored: alternative.sponsored,
      propertyType: propertyType(raw),
      hotelClass: alternative.starRating,
      reviewRating: alternative.reviewRating,
      reviewCount: alternative.reviewCount,
      nightlyPrice: price.nightlyPrice,
      totalStayPrice: price.totalStayPrice,
      beforeTaxesAndFees: price.beforeTaxesAndFees,
      taxesAndFeesKnown: price.taxesAndFeesKnown,
      lowestObservedPrice: price.lowestObservedPrice,
      sellerSpecificPrice: price.sellerSpecificPrice,
      exactBookableOfferKnown: price.exactBookableOfferKnown,
      currency,
      freeCancellation: alternative.freeCancellation,
      amenities: alternative.amenities,
      coordinates: { latitude: location.latitude, longitude: location.longitude },
      locationEvidence: location.latitude.state === "OBSERVED" && location.longitude.state === "OBSERVED"
        ? "COORDINATES_OBSERVED" as const
        : "UNKNOWN" as const,
      sellerAvailabilitySemantics: {
        observedSellerCount: Array.isArray(raw.prices)
          ? raw.prices.filter((entry) => typeof entry.source === "string").length
          : 0,
        exactSellerAvailabilityKnown: false as const,
      },
      availabilitySemantics: alternative.availabilityStatus,
      missingness,
      fieldProvenance: Object.fromEntries(Object.entries(alternative.fieldProvenance).sort(([left], [right]) => left.localeCompare(right))),
      evidenceStrength: "IMPRESSION_ONLY" as const,
      mappingCompleteness,
      detailEnrichmentStatus: detailStatusFor(alternative.displayedRank, statuses),
    };
  });
  const missingness = [...new Set(alternatives.flatMap((entry) => entry.missingness))].sort();
  const body: Omit<StayOptiSerpApiSanitizedSnapshotV3, "normalizedSnapshotHash"> = {
    schemaVersion: STAYOPTI_SERPAPI_PILOT_SNAPSHOT_SCHEMA_VERSION_V3,
    pilotId: input.pilotId,
    manifestHash: input.manifestHash,
    sessionId: input.session.sessionId,
    sourceRole: STAYOPTI_SERPAPI_GOOGLE_HOTELS_SOURCE_ROLE_V3,
    recordClass: STAYOPTI_SERPAPI_GOOGLE_HOTELS_RECORD_CLASS_V3,
    upstreamSource: "SERPAPI_GOOGLE_HOTELS",
    captureTimestamp: input.captureTimestamp,
    searchTimestamp: externalSession.searchTimestamp,
    destinationToken: externalSession.destinationToken,
    checkIn: input.session.checkIn,
    checkOut: input.session.checkOut,
    durationNights: input.session.durationNights,
    adults: input.session.adults,
    children: input.session.childAges.length,
    childAges: [...input.session.childAges],
    rooms: input.session.rooms,
    currency: input.session.currency,
    gl: input.session.gl,
    hl: input.session.hl,
    budgetMinorUnits: input.session.budgetMinorUnits,
    preferenceProfile: input.session.preferenceProfile,
    hardConstraints: [...input.session.hardConstraints].sort(),
    sortContext: externalSession.sortType,
    noCacheRequested: true,
    choiceSetCompleteness: externalSession.choiceSetCompleteness,
    resultCount: alternatives.length,
    mappingCompleteness: alternatives.every((entry) => entry.mappingCompleteness === "COMPLETE_FOR_REPLAY")
      ? "COMPLETE_FOR_REPLAY"
      : "PARTIAL_DIAGNOSTIC_ONLY",
    sessionEvidenceStrength: "IMPRESSION_ONLY",
    sessionBiasFlags: [...externalSession.biasFlags].sort(),
    missingness,
    alternatives,
    externalSession,
  };
  return {
    ...body,
    normalizedSnapshotHash: canonicalHash(body, "stayopti-v3-serpapi-sanitized-snapshot"),
  };
}

const forbiddenKeyFragments = [
  "apikey", "propertytoken", "sellertoken", "googletoken", "searchid",
  "hotelid", "offerid", "solutionid", "bookingurl", "redirecturl",
  "imageurl", "logourl", "rawhtml", "cookie",
  "authorizationheader", "payment", "email",
];

function plainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function scanSanitized(value: unknown, path: string, issues: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanSanitized(entry, `${path}[${index}]`, issues));
    return;
  }
  if (value === null || typeof value !== "object") {
    if (typeof value === "string" && /(?:api_key=(?!\[REDACTED\])|property_token=(?!\[REDACTED\])|serpapi\.com\/search\.json\?)/i.test(value)) {
      issues.push(`${path}:SENSITIVE_VALUE`);
    }
    return;
  }
  if (!plainRecord(value)) {
    issues.push(`${path}:NON_PLAIN_OBJECT`);
    return;
  }
  for (const key of Object.keys(value)) {
    const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const forbiddenRaw = (normalized.startsWith("rawpayload") || normalized.startsWith("rawresponse")) &&
      !normalized.endsWith("persisted") && !normalized.endsWith("sha256");
    const forbiddenSensitive = forbiddenKeyFragments.some((fragment) => normalized.includes(fragment)) &&
      normalized !== "apikeypersisted";
    if (forbiddenRaw || forbiddenSensitive) issues.push(`${path}.${key}:FORBIDDEN_KEY`);
    scanSanitized(value[key], `${path}.${key}`, issues);
  }
}

export function validateSerpApiSanitizedSnapshotV3(input: unknown) {
  const issues: string[] = [];
  scanSanitized(input, "snapshot", issues);
  if (!plainRecord(input)) issues.push("snapshot:INVALID_ROOT");
  const snapshot = input as Partial<StayOptiSerpApiSanitizedSnapshotV3>;
  if (snapshot.schemaVersion !== STAYOPTI_SERPAPI_PILOT_SNAPSHOT_SCHEMA_VERSION_V3) issues.push("snapshot.schemaVersion:UNSUPPORTED");
  if (!Array.isArray(snapshot.alternatives) || snapshot.alternatives.length === 0) issues.push("snapshot.alternatives:EMPTY");
  if (snapshot.resultCount !== snapshot.alternatives?.length) issues.push("snapshot.resultCount:MISMATCH");
  if (!plainRecord(snapshot.externalSession)) issues.push("snapshot.externalSession:MISSING");
  else {
    const externalValidation = validateExternalHotelChoiceSessionV3(snapshot.externalSession);
    if (!externalValidation.valid) issues.push("snapshot.externalSession:INVALID");
  }
  if (typeof snapshot.normalizedSnapshotHash !== "string") issues.push("snapshot.normalizedSnapshotHash:MISSING");
  else {
    const { normalizedSnapshotHash: ignored, ...body } = snapshot as StayOptiSerpApiSanitizedSnapshotV3;
    void ignored;
    if (canonicalHash(body, "stayopti-v3-serpapi-sanitized-snapshot") !== snapshot.normalizedSnapshotHash) {
      issues.push("snapshot.normalizedSnapshotHash:MISMATCH");
    }
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}

function fillMissing<T>(base: T | undefined, detail: T | undefined) {
  return base === undefined ? detail : base;
}

export function mergeSerpApiPropertyDetailV3(
  base: SerpApiGoogleHotelsPropertyV3,
  detail: SerpApiGoogleHotelsPropertyV3,
): SerpApiGoogleHotelsPropertyV3 {
  return {
    ...base,
    type: fillMissing(base.type, detail.type),
    name: base.name,
    property_token: base.property_token,
    gps_coordinates: fillMissing(base.gps_coordinates, detail.gps_coordinates),
    hotel_class: fillMissing(base.hotel_class, detail.hotel_class),
    overall_rating: fillMissing(base.overall_rating, detail.overall_rating),
    reviews: fillMissing(base.reviews, detail.reviews),
    rate_per_night: fillMissing(base.rate_per_night, detail.rate_per_night),
    total_rate: fillMissing(base.total_rate, detail.total_rate),
    prices: fillMissing(base.prices, detail.prices),
    amenities: fillMissing(base.amenities, detail.amenities),
    free_cancellation: fillMissing(base.free_cancellation, detail.free_cancellation),
  };
}

export function mergeSerpApiDetailResponseV3(
  response: SerpApiGoogleHotelsResponseV3,
  displayedRank: number,
  detailResponse: SerpApiGoogleHotelsResponseV3,
) {
  const cloned = cloneJson(response);
  const adsCount = cloned.ads?.length ?? 0;
  const target = displayedRank <= adsCount
    ? cloned.ads?.[displayedRank - 1]
    : cloned.properties?.[displayedRank - adsCount - 1];
  const detail = detailResponse.property ?? detailResponse.properties?.[0] ?? detailResponse.ads?.[0];
  if (target === undefined || detail === undefined) throw new Error("SERPAPI_PILOT_DETAIL_RESPONSE_NOT_PROCESSABLE");
  const merged = mergeSerpApiPropertyDetailV3(target, detail);
  if (displayedRank <= adsCount && cloned.ads !== undefined) cloned.ads[displayedRank - 1] = merged;
  else if (cloned.properties !== undefined) cloned.properties[displayedRank - adsCount - 1] = merged;
  return cloned;
}

const exactEvidenceNames = new Set([
  "frozen-manifest.json",
  "authorization-receipt.json",
  "sanitized-request-ledger.json",
  "pilot-summary.json",
  "session-summary.json",
  "raw-deletion-receipts.json",
  "credential-redaction-receipt.json",
  "secret-scan.txt",
  "raw-id-scan.txt",
  "test-results.txt",
  "preflight.json",
  "postflight.json",
  "checksums.sha256",
]);
const snapshotName = /^snapshots\/session-(0[1-9]|1[0-2])\.json$/;

export function isAllowedSerpApiEvidenceEntryNameV3(name: string) {
  if (name.startsWith("/") || name.startsWith("\\") || /^[A-Za-z]:/.test(name)) return false;
  if (name.includes("\\") || name.split("/").some((part) => part === "" || part === "." || part === "..")) return false;
  if (name.split("/").some((part) => part.startsWith("."))) return false;
  return exactEvidenceNames.has(name) || snapshotName.test(name);
}

function checksumMap(content: string) {
  const map = new Map<string, string>();
  for (const line of content.split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  ([^\s].*)$/.exec(line);
    if (match === null) return null;
    map.set(match[2], match[1]);
  }
  return map;
}

export function validateSerpApiEvidenceArchiveEntriesV3(
  entries: readonly StayOptiSerpApiEvidenceArchiveEntryV3[],
) {
  const issues: string[] = [];
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (!isAllowedSerpApiEvidenceEntryNameV3(entry.name)) issues.push(`ENTRY_NOT_ALLOWED:${entry.name}`);
    if (map.has(entry.name)) issues.push(`ENTRY_DUPLICATE:${entry.name}`);
    map.set(entry.name, entry.content);
    if (entry.name.endsWith(".json")) {
      try { scanSanitized(JSON.parse(entry.content), `entry.${entry.name}`, issues); }
      catch { issues.push(`ENTRY_JSON_INVALID:${entry.name}`); }
    } else {
      scanSanitized(entry.content, `entry.${entry.name}`, issues);
    }
  }
  for (const required of exactEvidenceNames) {
    if (!map.has(required)) issues.push(`ENTRY_MISSING:${required}`);
  }
  const checksums = checksumMap(map.get("checksums.sha256") ?? "");
  if (checksums === null) issues.push("CHECKSUMS_INVALID");
  else {
    for (const [name, content] of map) {
      if (name === "checksums.sha256") continue;
      if (checksums.get(name) !== sha256SerpApiEvidenceV3(content)) issues.push(`CHECKSUM_MISMATCH:${name}`);
    }
  }
  let validSnapshots = 0;
  for (const [name, content] of map) {
    if (!snapshotName.test(name)) continue;
    try {
      const validation = validateSerpApiSanitizedSnapshotV3(JSON.parse(content));
      if (validation.valid) validSnapshots += 1;
      else issues.push(`SNAPSHOT_INVALID:${name}`);
    } catch {
      issues.push(`SNAPSHOT_JSON_INVALID:${name}`);
    }
  }
  let summaryStatus: "COMPLETE" | "PARTIAL" | "INVALID" = "INVALID";
  try {
    const summary = JSON.parse(map.get("pilot-summary.json") ?? "null") as { status?: string } | null;
    if (summary?.status === "COMPLETED" && validSnapshots === 12) summaryStatus = "COMPLETE";
    else if (["ABORTED", "PARTIAL"].includes(summary?.status ?? "") && validSnapshots <= 12) summaryStatus = "PARTIAL";
    else issues.push("PILOT_SUMMARY_STATUS_INVALID");
  } catch {
    issues.push("PILOT_SUMMARY_JSON_INVALID");
  }
  let rawDeletionVerifiable = false;
  try {
    const deletions = JSON.parse(map.get("raw-deletion-receipts.json") ?? "null") as unknown;
    rawDeletionVerifiable = Array.isArray(deletions) && deletions.every((entry) =>
      plainRecord(entry) && entry.rawCreated === true && entry.rawDeleted === true &&
      entry.verifiedAbsent === true && typeof entry.ephemeralPayloadSha256 === "string" &&
      /^[0-9a-f]{64}$/.test(entry.ephemeralPayloadSha256)
    );
    if (!rawDeletionVerifiable) issues.push("RAW_DELETION_RECEIPTS_INVALID");
  } catch {
    issues.push("RAW_DELETION_RECEIPTS_JSON_INVALID");
  }
  return {
    validatorVersion: STAYOPTI_SERPAPI_PILOT_T3_INPUT_VERSION_V3,
    valid: issues.length === 0,
    status: issues.length === 0 ? summaryStatus : "INVALID" as const,
    snapshotCount: validSnapshots,
    choiceSetsReconstructable: issues.length === 0 && validSnapshots > 0,
    baseAndDetailsDistinguishable: issues.length === 0,
    replayInputAvailable: issues.length === 0 && validSnapshots > 0,
    blindCapsuleInputAvailable: issues.length === 0 && validSnapshots > 0,
    rawDeletionVerifiable: issues.length === 0 && rawDeletionVerifiable,
    issues: [...new Set(issues)].sort(),
  };
}
