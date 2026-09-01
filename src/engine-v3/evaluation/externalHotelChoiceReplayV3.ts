import { stableSerializeV3 } from "../contract/stableHashV3";

import {
  type ExternalHotelChoiceSessionV3,
  STAYOPTI_EXTERNAL_BIAS_FLAGS_V3,
  STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3,
  STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3,
  STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3,
  STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3,
  STAYOPTI_EXTERNAL_HOTEL_CHOICE_VALIDATOR_VERSION_V3,
  STAYOPTI_EXTERNAL_PROVIDER_NEUTRAL_REPLAY_VERSION_V3,
  type StayOptiExternalBiasFlagV3,
  type StayOptiExternalEvidenceStrengthV3,
  type StayOptiExternalHotelAlternativeV3,
  type StayOptiExternalObservedActionTypeV3,
  type StayOptiExternalProviderNeutralReplayV3,
  type StayOptiExternalSessionValidationResultV3,
  type StayOptiExternalValidationIssueV3,
} from "./externalHotelChoiceContractV3";

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const LOCAL_DATASET_ID = /^[A-Z][A-Z0-9_]{2,79}$/;
const ANONYMOUS_PROPERTY_ID = /^ANON_[A-Z0-9_]{3,80}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const forbiddenKeys = new Set([
  "providerid", "hotelid", "propertyid", "rateid", "offerid", "bookingid",
  "prebookid", "continuationid", "rawpayload", "rawresponse", "apikey",
  "accesstoken", "refreshtoken", "secret", "password", "commission", "markup",
  "email", "phone", "firstname", "lastname", "fullname", "ipaddress", "userid",
  "__proto__", "prototype", "constructor",
]);

const labelKeys = new Set([
  "clicked", "booked", "bookingobserved", "numclicks", "num_clicks", "istrans",
  "is_trans", "observedactions", "evaluationlabels",
]);

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
    throw new Error("External hotel-choice hashing requires the Node built-in crypto module.");
  }
  return cryptoModule;
}

const actionStrength: Readonly<Record<StayOptiExternalObservedActionTypeV3, StayOptiExternalEvidenceStrengthV3>> = {
  IMPRESSION: "IMPRESSION_ONLY",
  NO_ACTION: "IMPRESSION_ONLY",
  DETAIL_VIEW: "DETAIL_VIEW",
  CLICK_OUT: "CLICK_OUT",
  BOOKING: "BOOKING_OBSERVED",
  POST_STAY_SATISFIED: "POST_STAY_SATISFIED",
  WOULD_CHOOSE_AGAIN: "WOULD_CHOOSE_AGAIN",
};

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value: unknown, namespace: string) {
  return `sha256:${nodeCrypto().createHash("sha256")
    .update(`${namespace}\n${stableSerializeV3(value)}`, "utf8")
    .digest("hex")}`;
}

function sortedUnique<T extends string>(values: readonly T[]) {
  return [...new Set(values)].sort(compareStrings);
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.getPrototypeOf(value) === Object.prototype;
}

function issue(
  issues: StayOptiExternalValidationIssueV3[],
  reasonCode: StayOptiExternalValidationIssueV3["reasonCode"],
  path: string,
) {
  issues.push({ reasonCode, path });
}

function sortedIssues(issues: readonly StayOptiExternalValidationIssueV3[]) {
  return [...new Map(issues.map((entry) => [`${entry.path}\u0000${entry.reasonCode}`, entry])).values()]
    .sort((left, right) => compareStrings(left.path, right.path) || compareStrings(left.reasonCode, right.reasonCode));
}

function scanKeys(
  value: unknown,
  path: string,
  issues: StayOptiExternalValidationIssueV3[],
  featureOnly = false,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanKeys(entry, `${path}[${index}]`, issues, featureOnly));
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (!plainRecord(value)) {
    issue(issues, "EXTERNAL_UNSAFE_FIELD_PRESENT", path);
    return;
  }
  for (const key of Object.keys(value)) {
    const normalized = key.replace(/[^a-z0-9_]/gi, "").toLowerCase();
    if (forbiddenKeys.has(normalized)) issue(issues, "EXTERNAL_UNSAFE_FIELD_PRESENT", `${path}.${key}`);
    if (featureOnly && labelKeys.has(normalized)) issue(issues, "EXTERNAL_LABEL_FEATURE_LEAKAGE", `${path}.${key}`);
    scanKeys(value[key], `${path}.${key}`, issues, featureOnly);
  }
}

function canonicalKnownValue(value: { state: string; value: unknown; provenance: string }) {
  const material = Array.isArray(value.value) ? [...value.value].sort() : value.value;
  return { state: value.state, value: material, provenance: value.provenance };
}

function canonicalAlternative(alternative: StayOptiExternalHotelAlternativeV3) {
  return {
    anonymousPropertyId: alternative.anonymousPropertyId,
    displayedRank: alternative.displayedRank,
    sponsored: canonicalKnownValue(alternative.sponsored),
    starRating: canonicalKnownValue(alternative.starRating),
    reviewRating: canonicalKnownValue(alternative.reviewRating),
    reviewCount: canonicalKnownValue(alternative.reviewCount),
    exactPriceMinorUnits: canonicalKnownValue(alternative.exactPriceMinorUnits),
    priceBucket: canonicalKnownValue(alternative.priceBucket),
    ...(alternative.observedAggregatedDisplayPrice === undefined ? {} : {
      observedAggregatedDisplayPrice: canonicalKnownValue(alternative.observedAggregatedDisplayPrice),
    }),
    freeCancellation: canonicalKnownValue(alternative.freeCancellation),
    amenities: canonicalKnownValue(alternative.amenities),
    availabilityStatus: canonicalKnownValue(alternative.availabilityStatus),
    clicked: alternative.clicked,
    booked: alternative.booked,
    missingness: sortedUnique(alternative.missingness),
    fieldProvenance: Object.fromEntries(Object.entries(alternative.fieldProvenance).sort(([left], [right]) => compareStrings(left, right))),
  };
}

function validObservedDisplayPrice(value: unknown) {
  if (!validKnownValue(value)) return false;
  const wrapper = value as { state: string; value: unknown };
  if (wrapper.state === "UNKNOWN") return true;
  if (!plainRecord(wrapper.value)) return false;
  const price = wrapper.value;
  const amountValid = (entry: unknown) => entry === null || (typeof entry === "number" && Number.isFinite(entry) && entry >= 0);
  return price.semantics === "OBSERVED_AGGREGATED_DISPLAY_PRICE" &&
    (price.currency === null || (typeof price.currency === "string" && /^[A-Z]{3}$/.test(price.currency))) &&
    amountValid(price.nightlyAmount) && amountValid(price.totalStayAmount) && amountValid(price.beforeTaxesAndFeesAmount) &&
    [price.nightlyAmount, price.totalStayAmount, price.beforeTaxesAndFeesAmount].some((entry) => entry !== null) &&
    price.exactBookable === false && price.sellerSpecific === false &&
    price.reliability === "DISPLAYED_AGGREGATED_NOT_CHECKOUT_VERIFIED";
}

function canonicalSession(session: ExternalHotelChoiceSessionV3) {
  const { sessionFingerprint: ignoredSessionFingerprint, ...withoutFingerprint } = session;
  void ignoredSessionFingerprint;
  return {
    ...withoutFingerprint,
    filters: sortedUnique(session.filters),
    alternatives: [...session.alternatives]
      .sort((left, right) => left.displayedRank - right.displayedRank || compareStrings(left.anonymousPropertyId, right.anonymousPropertyId))
      .map(canonicalAlternative),
    observedActions: [...session.observedActions]
      .sort((left, right) => left.ordinal - right.ordinal || compareStrings(left.actionType, right.actionType)),
    biasFlags: sortedUnique(session.biasFlags),
    allowedUses: sortedUnique(session.allowedUses),
    prohibitedClaims: sortedUnique(session.prohibitedClaims),
  };
}

export function createExternalHotelChoiceSessionFingerprintV3(
  session: Omit<ExternalHotelChoiceSessionV3, "sessionFingerprint"> | ExternalHotelChoiceSessionV3,
) {
  const material = session as ExternalHotelChoiceSessionV3;
  return sha256(canonicalSession(material), "stayopti-v3-external-choice-session");
}

export function classifyExternalHotelChoiceEvidenceV3(
  actions: readonly { actionType: StayOptiExternalObservedActionTypeV3 }[],
) {
  let index = 0;
  for (const action of actions) {
    index = Math.max(index, STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3.indexOf(actionStrength[action.actionType]));
  }
  return STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3[index];
}

export function classifyExternalHotelChoiceBiasesV3(
  session: ExternalHotelChoiceSessionV3,
): StayOptiExternalBiasFlagV3[] {
  const flags = new Set(session.biasFlags);
  if (session.alternatives.some((entry) => Number.isInteger(entry.displayedRank))) flags.add("POSITION_BIAS");
  if (session.alternatives.some((entry) => entry.sponsored.state === "KNOWN" && entry.sponsored.value === true)) flags.add("ADVERTISING_BIAS");
  if (session.sortType !== "USER_SELECTED") flags.add("DEFAULT_SORT_BIAS");
  if (session.choiceSetCompleteness !== "COMPLETE_VISIBLE_SET") flags.add("UNOBSERVED_ALTERNATIVES");
  if (!session.exactPriceAvailable) flags.add("EXACT_PRICE_NOT_RECONSTRUCTABLE");
  if (session.alternatives.some((entry) => entry.missingness.length > 0)) flags.add("MISSING_DATA_BIAS");
  if (session.alternatives.some((entry) => entry.clicked && !entry.booked)) flags.add("CLICK_WITHOUT_BOOKING");
  return sortedUnique([...flags].filter((entry): entry is StayOptiExternalBiasFlagV3 =>
    STAYOPTI_EXTERNAL_BIAS_FLAGS_V3.includes(entry as StayOptiExternalBiasFlagV3)));
}

function validKnownValue(value: unknown) {
  if (!plainRecord(value) || !["KNOWN", "BUCKETED", "UNKNOWN"].includes(String(value.state))) return false;
  if (typeof value.provenance !== "string" || value.provenance.length === 0) return false;
  return value.state === "UNKNOWN" ? value.value === null : value.value !== null && value.value !== undefined;
}

export function validateExternalHotelChoiceSessionV3(input: unknown): StayOptiExternalSessionValidationResultV3 {
  const issues: StayOptiExternalValidationIssueV3[] = [];
  scanKeys(input, "session", issues);
  if (!plainRecord(input)) {
    issue(issues, "EXTERNAL_FIELD_INVALID", "session");
    return {
      validatorVersion: STAYOPTI_EXTERNAL_HOTEL_CHOICE_VALIDATOR_VERSION_V3,
      valid: false,
      persistentIngestionAllowed: false,
      issues: sortedIssues(issues),
      computedFingerprint: null,
      evidenceStrength: null,
      biasFlags: [],
      preferenceLabelAvailable: false,
      automaticGoldenAdmission: false,
      v3WeightsChanged: false,
    };
  }
  const session = input as unknown as ExternalHotelChoiceSessionV3;
  if (session.schemaVersion !== STAYOPTI_EXTERNAL_HOTEL_CHOICE_SCHEMA_VERSION_V3) issue(issues, "EXTERNAL_SCHEMA_UNSUPPORTED", "session.schemaVersion");
  if (!LOCAL_DATASET_ID.test(session.sourceDatasetId ?? "")) issue(issues, "EXTERNAL_FIELD_INVALID", "session.sourceDatasetId");
  if (!plainRecord(session.provenance) || session.provenance.authority === "UNVERIFIED_MIRROR") issue(issues, "EXTERNAL_SOURCE_NOT_PRIMARY", "session.provenance.authority");
  if (!plainRecord(session.sourceLicense)) issue(issues, "EXTERNAL_FIELD_INVALID", "session.sourceLicense");
  if (session.corpusClass !== "EXTERNAL_OBSERVATIONAL_CORPUS" || session.automaticGoldenAdmission !== false) issue(issues, "EXTERNAL_GOLDEN_BOUNDARY_VIOLATION", "session.corpusClass");
  if (!Array.isArray(session.alternatives) || session.alternatives.length === 0) issue(issues, "EXTERNAL_SESSION_EMPTY", "session.alternatives");
  if (!Array.isArray(session.observedActions)) issue(issues, "EXTERNAL_FIELD_INVALID", "session.observedActions");
  if (!Array.isArray(session.filters) || !Array.isArray(session.biasFlags) || !Array.isArray(session.allowedUses) || !Array.isArray(session.prohibitedClaims)) issue(issues, "EXTERNAL_FIELD_INVALID", "session.collections");
  if (typeof session.searchTimestamp !== "string" || typeof session.historicalPeriod !== "string" || typeof session.destinationToken !== "string") issue(issues, "EXTERNAL_FIELD_INVALID", "session.context");
  if (session.checkin !== null && !DATE.test(session.checkin)) issue(issues, "EXTERNAL_FIELD_INVALID", "session.checkin");
  if (session.checkout !== null && !DATE.test(session.checkout)) issue(issues, "EXTERNAL_FIELD_INVALID", "session.checkout");

  const alternatives = Array.isArray(session.alternatives) ? session.alternatives : [];
  const alternativeIds = new Set<string>();
  const ranks = new Set<number>();
  alternatives.forEach((alternative, index) => {
    const path = `session.alternatives[${index}]`;
    if (!plainRecord(alternative) || !ANONYMOUS_PROPERTY_ID.test(String(alternative.anonymousPropertyId))) issue(issues, "EXTERNAL_FIELD_INVALID", `${path}.anonymousPropertyId`);
    if (alternativeIds.has(alternative.anonymousPropertyId)) issue(issues, "EXTERNAL_DUPLICATE_ALTERNATIVE", `${path}.anonymousPropertyId`);
    alternativeIds.add(alternative.anonymousPropertyId);
    if (!Number.isInteger(alternative.displayedRank) || alternative.displayedRank < 1 || ranks.has(alternative.displayedRank)) issue(issues, "EXTERNAL_DISPLAY_RANK_INVALID", `${path}.displayedRank`);
    ranks.add(alternative.displayedRank);
    for (const key of ["sponsored", "starRating", "reviewRating", "reviewCount", "exactPriceMinorUnits", "priceBucket", "freeCancellation", "amenities", "availabilityStatus"] as const) {
      if (!validKnownValue(alternative[key])) issue(issues, "EXTERNAL_FIELD_INVALID", `${path}.${key}`);
    }
    if (alternative.observedAggregatedDisplayPrice !== undefined && !validObservedDisplayPrice(alternative.observedAggregatedDisplayPrice)) {
      issue(issues, "EXTERNAL_FIELD_INVALID", `${path}.observedAggregatedDisplayPrice`);
    }
    if (alternative.exactPriceMinorUnits.state !== "UNKNOWN" && alternative.priceBucket.state !== "UNKNOWN") issue(issues, "EXTERNAL_PRICE_REPRESENTATION_CONFLICT", `${path}.price`);
    if (alternative.exactPriceMinorUnits.state !== "UNKNOWN" && (!Number.isInteger(alternative.exactPriceMinorUnits.value) || Number(alternative.exactPriceMinorUnits.value) < 0)) issue(issues, "EXTERNAL_FIELD_INVALID", `${path}.exactPriceMinorUnits.value`);
    if (typeof alternative.clicked !== "boolean" || typeof alternative.booked !== "boolean") issue(issues, "EXTERNAL_FIELD_INVALID", `${path}.labels`);
  });

  const actions = Array.isArray(session.observedActions) ? session.observedActions : [];
  for (const [index, action] of actions.entries()) {
    if (!plainRecord(action) || !Number.isInteger(action.ordinal) || action.ordinal < 1) issue(issues, "EXTERNAL_FIELD_INVALID", `session.observedActions[${index}]`);
    if (action.anonymousPropertyId !== null && !alternativeIds.has(action.anonymousPropertyId)) issue(issues, "EXTERNAL_ACTION_REFERENCE_INVALID", `session.observedActions[${index}].anonymousPropertyId`);
  }
  const evidenceStrength = actions.length > 0 ? classifyExternalHotelChoiceEvidenceV3(actions) : "IMPRESSION_ONLY";
  if (session.evidenceStrength !== evidenceStrength) issue(issues, "EXTERNAL_EVIDENCE_STRENGTH_MISMATCH", "session.evidenceStrength");
  const bookingObserved = alternatives.some((entry) => entry.booked) || actions.some((entry) => entry.actionType === "BOOKING");
  if (session.bookingObserved !== bookingObserved) issue(issues, "EXTERNAL_BOOKING_LABEL_INCONSISTENT", "session.bookingObserved");

  const biasFlags = classifyExternalHotelChoiceBiasesV3(session);
  for (const required of biasFlags) {
    if (!session.biasFlags.includes(required)) issue(issues, "EXTERNAL_BIAS_FLAG_MISSING", `session.biasFlags.${required}`);
  }

  let computedFingerprint: string | null = null;
  try {
    computedFingerprint = createExternalHotelChoiceSessionFingerprintV3(session);
    if (!SHA256.test(session.sessionFingerprint) || session.sessionFingerprint !== computedFingerprint) issue(issues, "EXTERNAL_FINGERPRINT_MISMATCH", "session.sessionFingerprint");
  } catch {
    issue(issues, "EXTERNAL_FIELD_INVALID", "session.canonicalization");
  }

  const licenseAllowsPersistence = session.sourceLicense?.persistentIngestionAllowed === true &&
    ["VERIFIED_PERMISSIVE", "SYNTHETIC_FIXTURE_ONLY"].includes(session.sourceLicense.status);
  if (!licenseAllowsPersistence) issue(issues, "EXTERNAL_LICENSE_BLOCKS_PERSISTENCE", "session.sourceLicense");

  return {
    validatorVersion: STAYOPTI_EXTERNAL_HOTEL_CHOICE_VALIDATOR_VERSION_V3,
    valid: issues.every((entry) => entry.reasonCode === "EXTERNAL_LICENSE_BLOCKS_PERSISTENCE"),
    persistentIngestionAllowed: licenseAllowsPersistence && issues.length === 0,
    issues: sortedIssues(issues),
    computedFingerprint,
    evidenceStrength,
    biasFlags,
    preferenceLabelAvailable: STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3.indexOf(evidenceStrength) >= STAYOPTI_EXTERNAL_EVIDENCE_STRENGTHS_V3.indexOf("CLICK_OUT"),
    automaticGoldenAdmission: false,
    v3WeightsChanged: false,
  };
}

function replayMaterial(session: ExternalHotelChoiceSessionV3): Omit<StayOptiExternalProviderNeutralReplayV3, "replayFingerprint"> {
  const clickedAlternativeIds = sortedUnique(session.alternatives.filter((entry) => entry.clicked).map((entry) => entry.anonymousPropertyId));
  const bookedAlternativeIds = sortedUnique(session.alternatives.filter((entry) => entry.booked).map((entry) => entry.anonymousPropertyId));
  return {
    replayVersion: STAYOPTI_EXTERNAL_PROVIDER_NEUTRAL_REPLAY_VERSION_V3,
    sessionFingerprint: session.sessionFingerprint,
    sourceDatasetId: session.sourceDatasetId,
    datasetPartition: session.datasetPartition,
    historicalPeriod: session.historicalPeriod,
    context: {
      destinationToken: session.destinationToken,
      checkin: session.checkin,
      checkout: session.checkout,
      adults: session.adults,
      children: session.children,
      rooms: session.rooms,
      filters: sortedUnique(session.filters),
      sortType: session.sortType,
      deviceContext: session.deviceContext,
      currencyKnown: session.currencyKnown,
    },
    preDecisionFeatures: {
      choiceSetCompleteness: session.choiceSetCompleteness,
      alternatives: [...session.alternatives]
        .sort((left, right) => left.displayedRank - right.displayedRank)
        .map((entry) => ({
          anonymousPropertyId: entry.anonymousPropertyId,
          displayedRank: entry.displayedRank,
          sponsored: entry.sponsored,
          starRating: entry.starRating,
          reviewRating: entry.reviewRating,
          reviewCount: entry.reviewCount,
          exactPriceMinorUnits: entry.exactPriceMinorUnits,
          priceBucket: entry.priceBucket,
          ...(entry.observedAggregatedDisplayPrice === undefined ? {} : {
            observedAggregatedDisplayPrice: entry.observedAggregatedDisplayPrice,
          }),
          freeCancellation: entry.freeCancellation,
          amenities: entry.amenities,
          availabilityStatus: entry.availabilityStatus,
          missingness: sortedUnique(entry.missingness),
        })),
      biasFlags: sortedUnique(session.biasFlags),
    },
    evaluationLabels: {
      clickedAlternativeIds,
      bookedAlternativeIds,
      evidenceStrength: session.evidenceStrength,
      bookingClassification: bookedAlternativeIds.length > 0 ? STAYOPTI_EXTERNAL_BOOKING_CLASSIFICATION_V3 : null,
      clickClassification: clickedAlternativeIds.length > 0 ? STAYOPTI_EXTERNAL_CLICK_CLASSIFICATION_V3 : null,
    },
    allowedUses: sortedUnique(session.allowedUses),
    prohibitedClaims: sortedUnique(session.prohibitedClaims),
    automaticGoldenAdmission: false,
    automaticV3WeightChange: false,
    splitOutcomeObserved: false,
  };
}

export function auditExternalReplayFeatureLeakageV3(replay: StayOptiExternalProviderNeutralReplayV3) {
  const issues: StayOptiExternalValidationIssueV3[] = [];
  scanKeys(replay.preDecisionFeatures, "replay.preDecisionFeatures", issues, true);
  scanKeys(replay.context, "replay.context", issues, true);
  return { valid: issues.length === 0, issues: sortedIssues(issues) };
}

export function createExternalProviderNeutralReplayV3(session: ExternalHotelChoiceSessionV3) {
  const validation = validateExternalHotelChoiceSessionV3(session);
  if (!validation.valid || !validation.persistentIngestionAllowed) throw new Error("EXTERNAL_SESSION_NOT_ADMITTED_FOR_PERSISTENT_REPLAY");
  const material = replayMaterial(session);
  const replay: StayOptiExternalProviderNeutralReplayV3 = {
    ...material,
    replayFingerprint: sha256(material, "stayopti-v3-external-provider-neutral-replay"),
  };
  if (!auditExternalReplayFeatureLeakageV3(replay).valid) throw new Error("EXTERNAL_LABEL_FEATURE_LEAKAGE");
  return replay;
}

export function deduplicateExternalChoiceSessionsV3(sessions: readonly ExternalHotelChoiceSessionV3[]) {
  const sorted = [...sessions].sort((left, right) => compareStrings(left.sessionFingerprint, right.sessionFingerprint));
  const unique = new Map<string, ExternalHotelChoiceSessionV3>();
  const duplicateFingerprints: string[] = [];
  for (const session of sorted) {
    if (unique.has(session.sessionFingerprint)) duplicateFingerprints.push(session.sessionFingerprint);
    else unique.set(session.sessionFingerprint, session);
  }
  return {
    sessions: [...unique.values()],
    duplicateFingerprints: sortedUnique(duplicateFingerprints),
    sessionDenominator: unique.size,
    sourceRowDenominator: sessions.reduce((count, session) => count + session.alternatives.length, 0),
    oneSessionNotOneHotel: true as const,
  };
}

export function validateExternalDatasetPartitionIsolationV3(sessions: readonly ExternalHotelChoiceSessionV3[]) {
  const issues: StayOptiExternalValidationIssueV3[] = [];
  const sessionPartitions = new Map<string, string>();
  const userPartitions = new Map<string, string>();
  for (const [index, session] of sessions.entries()) {
    const priorSession = sessionPartitions.get(session.sessionFingerprint);
    if (priorSession !== undefined && priorSession !== session.datasetPartition) issue(issues, "EXTERNAL_PARTITION_LEAKAGE", `sessions[${index}].sessionFingerprint`);
    sessionPartitions.set(session.sessionFingerprint, session.datasetPartition);
    if (session.anonymousUserCluster !== null) {
      const priorUser = userPartitions.get(session.anonymousUserCluster);
      if (priorUser !== undefined && priorUser !== session.datasetPartition) issue(issues, "EXTERNAL_PARTITION_LEAKAGE", `sessions[${index}].anonymousUserCluster`);
      userPartitions.set(session.anonymousUserCluster, session.datasetPartition);
    }
  }
  return { valid: issues.length === 0, issues: sortedIssues(issues), temporalSplitRequired: true as const, userAndSessionIsolationRequired: true as const };
}
