import { createGoldenBlindSha256DigestV3 } from "./goldenBlindCapsuleV3";
import { stableSerializeV3 } from "../contract/stableHashV3";
import type { StayOptiGoldenEvidenceValueV3 } from "./goldenCaseContractV3";
import {
  normalizeManualMarketUnknownTextV3,
  validateManualMarketPaymentDecompositionV3,
  validateManualMarketTextConditionV3,
} from "./manualPublicMarketDecisionGoldenCaptureV3";

/** Prospective rehearsal only: never a conversion of diagnostic custody into Golden. */
export const PROSPECTIVE_ASSISTED_VERSION_V3 = "stayopti.v3.prospective-assisted-rehearsal@1" as const;
export const PROSPECTIVE_ASSISTED_FIELDS_V3 = [
  "totalStayPriceMinorUnits", "payNowMinorUnits", "payAtPropertyMinorUnits",
  "taxInclusionStatement", "taxBreakdown", "rating", "ratingScale", "reviewCount",
  "distanceMeters", "locationText", "category", "room", "mealPlan", "cancellation",
  "refundability", "amenities", "availability",
] as const;
export type ProspectiveAssistedFieldV3 = typeof PROSPECTIVE_ASSISTED_FIELDS_V3[number];
export const PROSPECTIVE_ASSISTED_CRITICAL_FIELDS_V3: readonly ProspectiveAssistedFieldV3[] = [
  "totalStayPriceMinorUnits", "rating", "ratingScale", "reviewCount", "category", "room",
  "mealPlan", "cancellation", "refundability", "availability",
];
export type ProspectiveAssistedValueV3 = string | number | readonly string[];
export type ProspectiveAssistedEvidenceV3 = StayOptiGoldenEvidenceValueV3<ProspectiveAssistedValueV3>;
export const PROSPECTIVE_ASSISTED_REASON_CODES_V3 = [
  "BETTER_CONTEXTUAL_FIT", "SENSIBLE_SAVING", "JUSTIFIED_COMFORT", "BETTER_LOCATION",
  "BETTER_FLEXIBILITY", "LOWER_DECISION_RISK", "OPTIONS_EQUIVALENT",
  "HARD_CONSTRAINT_NOT_MET", "EVIDENCE_TOO_INCOMPLETE", "TRADEOFF_NOT_JUSTIFIED",
] as const;
type Exposure = { caseDataSeen: boolean; caseRecognized: boolean; engineRecommendationSeen: boolean };
export interface ProspectiveAssistedInputV3 {
  schemaVersion: typeof PROSPECTIVE_ASSISTED_VERSION_V3;
  synthetic: true;
  sessionId: string;
  acquisition: {
    mode: "BROWSER_ASSISTED_AGENT";
    browserAutomation: "ASSISTED_BROWSER_INTERACTION_DISCLOSED";
    loggedOut: "VERIFIED" | "DECLARED" | "UNKNOWN";
    incognito: "VERIFIED" | "DECLARED" | "UNKNOWN";
    personalizationAbsent: "VERIFIED" | "DECLARED" | "UNKNOWN";
  };
  scenario: {
    frozenAt: string; timezone: string; checkIn: string; checkOut: string;
    adults: number; childAges: number[]; rooms: number; currency: string;
    destinationToken: string; budgetMinorUnits: number;
    budgetScope: "ACCOMMODATION_MANDATORY_COSTS";
    profile: "maximum-savings" | "savings" | "balanced" | "comfort" | "maximum-comfort";
    hardConstraints: string[]; declaredNeeds: string[];
  };
  selection: {
    frozenAt: string; rule: "FIRST_ELIGIBLE_ORGANIC_WITHIN_CAP";
    alternativesTarget: 5 | 6 | 7 | 8; maximumCandidates: number;
    sourceSurface: "SYNTHETIC_PUBLIC_CONSUMER";
    insufficientSetPolicy: "RETAIN_DIAGNOSTIC_NO_REPLACEMENT";
    maximumCollectionWindowSeconds: number;
  };
  collectionWindow: { start: string; end: string };
  sourceBindings: {
    archiveSha256: string; descriptorSha256: string; dataMapSha256: string;
    reviewReceiptSha256: string; codeManifestSha256: string;
  };
  evidence: {
    evidenceRef: string; alternativeId: string; sha256: string;
    capturedAt: string; captureTimeSourceRef: string;
    kind: "SYNTHETIC_SCREENSHOT" | "SYNTHETIC_CAPTURE_LOG";
  }[];
  alternatives: {
    alternativeId: string; observedAt: string; observedLocalDate: string; observedLocalDateTime: string;
    sourceSurface: "SYNTHETIC_PUBLIC_CONSUMER";
    guestConfigurationFingerprint: string;
    fields: Record<ProspectiveAssistedFieldV3, ProspectiveAssistedEvidenceV3>;
    detailCoverageKeys: ProspectiveAssistedFieldV3[];
  }[];
}
export interface ProspectiveAssistedJudgmentV3 {
  judgmentVersion: "stayopti.v3.prospective-assisted-judgment@1";
  judgmentId: string; sessionId: string; contentFingerprint: string;
  evaluatorPseudonym: string; evaluatorClass: "HUMAN_SIMULATION";
  choice: "SELECT" | "TIE" | "NO_GOOD_OPTION" | "INSUFFICIENT_EVIDENCE";
  selectedAlternativeIds: string[];
  confidence: number; reasonCodes: string[]; consentVersion: string;
  createdAtBucket: string;
  blockingField: ProspectiveAssistedFieldV3 | "hardConstraints" | null;
}
type EventBase = { eventId: string; at: string; expectedRevision: number };
export type ProspectiveAssistedEventV3 = EventBase & (
  | { type: "REVIEW_FIELD"; alternativeId: string; field: ProspectiveAssistedFieldV3; status: "CONFIRMED" | "NOT_VERIFIABLE"; reviewerId: string }
  | { type: "CORRECT_FIELD"; alternativeId: string; field: ProspectiveAssistedFieldV3; value: ProspectiveAssistedEvidenceV3; reasonCode: "TRANSCRIPTION_CORRECTION" | "EVIDENCE_NOT_DOCUMENTED" }
  | { type: "CONFIRM_REVIEW"; reviewerId: string; contentFingerprint: string }
  | { type: "RECORD_EXPOSURE"; reviewerId: string; exposure: Exposure }
  | { type: "RECORD_JUDGMENT"; judgment: ProspectiveAssistedJudgmentV3 }
  | { type: "REVEAL_DECISION"; responseHash: string }
);
export interface ProspectiveAssistedEventRecordV3 {
  ordinal: number; previousHash: string; event: ProspectiveAssistedEventV3; eventHash: string;
}
export interface ProspectiveAssistedStateV3 {
  stateVersion: typeof PROSPECTIVE_ASSISTED_VERSION_V3;
  input: ProspectiveAssistedInputV3;
  originalInput: ProspectiveAssistedInputV3;
  revision: number; dataRevision: number;
  events: ProspectiveAssistedEventRecordV3[];
  fieldReviews: Record<string, { status: "CONFIRMED" | "NOT_VERIFIABLE"; reviewerId: string }>;
  reviewedFingerprint: string | null;
  exposures: Record<string, Exposure>;
  judgments: { recordedAt: string; dataRevision: number; judgment: ProspectiveAssistedJudgmentV3; qualification: "SYNTHETIC_EXPOSED_DIAGNOSTIC" | "SYNTHETIC_UNEXPOSED_REHEARSAL" }[];
  invalidatedJudgmentIds: string[];
  decisionRevealed: boolean;
  classification: "DIAGNOSTIC_ONLY";
  automaticGoldenAdmission: false;
  realHumanJudgmentCount: 0;
  realExpertJudgmentCount: 0;
  stateFingerprint: string;
}
const HEX = /^[a-f0-9]{64}$/;
const ID = /^SYNTHETIC_[A-Z0-9_]{2,96}$/;
const REF = /^EVIDENCE_[A-Z0-9_]{2,96}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_KEY = /^(?:__proto__|constructor|prototype|provider|providerId|hotelId|offerId|solutionId|propertyToken|apiKey|password|secret|commission|markup|originalOrder|originalRank|sponsored|rawPayload|rawResponse|url|privateRealName|privateSourceUrl)$/i;
const FORBIDDEN_TEXT = /(?:https?:\/\/|\bBearer\s+|\bsk-[a-z0-9_-]{12,}|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;
const verifiedImmutableStates = new WeakSet<object>();
function fail(code: string): never { throw new Error(code); }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function compare(a: string, b: string) { return a < b ? -1 : a > b ? 1 : 0; }
function same(a: unknown, b: unknown) { return stableSerializeV3(a) === stableSerializeV3(b); }
function exact(value: object, expected: readonly string[]) { return same(Object.keys(value).sort(compare), [...expected].sort(compare)); }
function integer(value: unknown, minimum = 0): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum; }
function instant(value: string) { return ISO.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
function day(value: string) { return DAY.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
function safeJson(value: unknown, active = new Set<object>()): void {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") { if (FORBIDDEN_TEXT.test(value)) fail("PROSPECTIVE_UNSAFE_TEXT"); return; }
  if (typeof value === "number") { if (!Number.isFinite(value)) fail("PROSPECTIVE_NON_JSON_VALUE"); return; }
  if (typeof value !== "object" || active.has(value)) fail("PROSPECTIVE_NON_JSON_VALUE");
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) fail("PROSPECTIVE_NON_PLAIN_OBJECT");
  active.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || FORBIDDEN_KEY.test(key)) fail("PROSPECTIVE_UNSAFE_FIELD");
    if (Array.isArray(value) && key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, "value")) fail("PROSPECTIVE_ACCESSOR_REJECTED");
    safeJson(descriptor.value, active);
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) fail("PROSPECTIVE_SPARSE_ARRAY");
  active.delete(value);
}
export function fingerprintProspectiveAssistedV3(value: unknown, domain = "prospective-assisted") {
  safeJson(value);
  return createGoldenBlindSha256DigestV3(value, domain);
}
export function prospectiveAssistedLocalDateV3(at: string, timezone: string): string {
  if (!instant(at) || !timezone.includes("/")) fail("PROSPECTIVE_TIMESTAMP_OR_IANA_ZONE_INVALID");
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at));
    return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)!.value).join("-");
  } catch { return fail("PROSPECTIVE_TIMESTAMP_OR_IANA_ZONE_INVALID"); }
}
export function prospectiveAssistedLocalDateTimeV3(at: string, timezone: string): string {
  const localDate = prospectiveAssistedLocalDateV3(at, timezone);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at));
  return `${localDate}T${["hour", "minute", "second"].map((key) => parts.find((part) => part.type === key)!.value).join(":")}.${at.slice(20, 23)}`;
}
export function prospectiveAssistedLeadTimeDaysV3(observedAt: string, checkIn: string, timezone: string) {
  if (!day(checkIn)) fail("PROSPECTIVE_CHECKIN_INVALID");
  return (Date.parse(`${checkIn}T00:00:00Z`) - Date.parse(`${prospectiveAssistedLocalDateV3(observedAt, timezone)}T00:00:00Z`)) / 86_400_000;
}
export function normalizeProspectiveAssistedEvidenceV3(value: ProspectiveAssistedEvidenceV3): ProspectiveAssistedEvidenceV3 {
  safeJson(value);
  const normalized = clone(value);
  if (typeof normalized.value === "string" && normalizeManualMarketUnknownTextV3(normalized.value) === null) {
    normalized.status = "UNKNOWN"; normalized.value = null; normalized.reliability = "UNKNOWN";
    normalized.unknownReason = normalized.unknownReason ?? "EXPLICIT_UNKNOWN_TEXT";
  }
  return normalized;
}
function validateInput(input: ProspectiveAssistedInputV3) {
  safeJson(input);
  const issues: string[] = [];
  const invalid = (test: boolean, code: string) => { if (test) issues.push(code); };
  invalid(!exact(input, ["schemaVersion", "synthetic", "sessionId", "acquisition", "scenario", "selection", "collectionWindow", "sourceBindings", "evidence", "alternatives"]), "INPUT_KEYS_INVALID");
  invalid(input.schemaVersion !== PROSPECTIVE_ASSISTED_VERSION_V3 || input.synthetic !== true || !ID.test(input.sessionId), "SYNTHETIC_BOUNDARY_REQUIRED");
  const scenario = input.scenario; const selection = input.selection;
  invalid(!exact(scenario, ["frozenAt", "timezone", "checkIn", "checkOut", "adults", "childAges", "rooms", "currency", "destinationToken", "budgetMinorUnits", "budgetScope", "profile", "hardConstraints", "declaredNeeds"]), "SCENARIO_KEYS_INVALID");
  invalid(!exact(selection, ["frozenAt", "rule", "alternativesTarget", "maximumCandidates", "sourceSurface", "insufficientSetPolicy", "maximumCollectionWindowSeconds"]), "SELECTION_KEYS_INVALID");
  invalid(!instant(scenario.frozenAt) || !instant(selection.frozenAt) || !instant(input.collectionWindow.start) || !instant(input.collectionWindow.end), "INSTANT_INVALID");
  invalid(!day(scenario.checkIn) || !day(scenario.checkOut) || scenario.checkOut <= scenario.checkIn, "STAY_DATES_INVALID");
  invalid(!integer(scenario.adults, 1) || !integer(scenario.rooms, 1) || !scenario.childAges.every((age) => integer(age) && age <= 17), "OCCUPANCY_INVALID");
  invalid(!/^[A-Z]{3}$/.test(scenario.currency) || !integer(scenario.budgetMinorUnits) || scenario.budgetScope !== "ACCOMMODATION_MANDATORY_COSTS", "BUDGET_OR_CURRENCY_INVALID");
  invalid(!ID.test(scenario.destinationToken) || !["maximum-savings", "savings", "balanced", "comfort", "maximum-comfort"].includes(scenario.profile), "SCENARIO_CONTEXT_INVALID");
  invalid(![...scenario.hardConstraints, ...scenario.declaredNeeds].every((code) => /^[A-Z][A-Z0-9_]{2,80}$/.test(code)), "NEED_CODE_INVALID");
  invalid(selection.rule !== "FIRST_ELIGIBLE_ORGANIC_WITHIN_CAP" || ![5, 6, 7, 8].includes(selection.alternativesTarget) || !integer(selection.maximumCandidates, selection.alternativesTarget) || selection.maximumCandidates > 100 || !integer(selection.maximumCollectionWindowSeconds, 1) || selection.maximumCollectionWindowSeconds > 86400 || selection.sourceSurface !== "SYNTHETIC_PUBLIC_CONSUMER" || selection.insufficientSetPolicy !== "RETAIN_DIAGNOSTIC_NO_REPLACEMENT", "SELECTION_INVALID");
  invalid(input.alternatives.length < 5 || input.alternatives.length > 8 || input.alternatives.length !== selection.alternativesTarget, "ALTERNATIVE_COUNT_INVALID");
  invalid(!exact(input.sourceBindings, ["archiveSha256", "descriptorSha256", "dataMapSha256", "reviewReceiptSha256", "codeManifestSha256"]) || Object.values(input.sourceBindings).some((hash) => !HEX.test(hash)), "SOURCE_BINDINGS_INVALID");
  invalid(!exact(input.acquisition, ["mode", "browserAutomation", "loggedOut", "incognito", "personalizationAbsent"]) || input.acquisition.mode !== "BROWSER_ASSISTED_AGENT" || input.acquisition.browserAutomation !== "ASSISTED_BROWSER_INTERACTION_DISCLOSED" || ![input.acquisition.loggedOut, input.acquisition.incognito, input.acquisition.personalizationAbsent].every((status) => ["VERIFIED", "DECLARED", "UNKNOWN"].includes(status)), "ACQUISITION_DISCLOSURE_INVALID");
  invalid(!exact(input.collectionWindow, ["start", "end"]) || input.collectionWindow.end < input.collectionWindow.start || scenario.frozenAt >= input.collectionWindow.start || selection.frozenAt >= input.collectionWindow.start || Date.parse(input.collectionWindow.end) - Date.parse(input.collectionWindow.start) > selection.maximumCollectionWindowSeconds * 1000, "PROSPECTIVE_WINDOW_INVALID");
  const altIds = new Set(input.alternatives.map((alternative) => alternative.alternativeId));
  invalid(altIds.size !== input.alternatives.length || [...altIds].some((id) => !ID.test(id)), "ALTERNATIVE_ID_INVALID_OR_DUPLICATE");
  const refs = new Map(input.evidence.map((evidence) => [evidence.evidenceRef, evidence]));
  invalid(refs.size !== input.evidence.length || input.evidence.length === 0, "EVIDENCE_DUPLICATE_OR_EMPTY");
  for (const evidence of input.evidence) {
    invalid(!exact(evidence, ["evidenceRef", "alternativeId", "sha256", "capturedAt", "captureTimeSourceRef", "kind"]) || !REF.test(evidence.evidenceRef) || !altIds.has(evidence.alternativeId) || !HEX.test(evidence.sha256) || !instant(evidence.capturedAt) || evidence.capturedAt < input.collectionWindow.start || evidence.capturedAt > input.collectionWindow.end || !["SYNTHETIC_SCREENSHOT", "SYNTHETIC_CAPTURE_LOG"].includes(evidence.kind), "EVIDENCE_BINDING_INVALID");
    const timeSource = refs.get(evidence.captureTimeSourceRef);
    invalid(timeSource?.kind !== "SYNTHETIC_CAPTURE_LOG" || timeSource.alternativeId !== evidence.alternativeId, "CAPTURE_TIME_SOURCE_INVALID");
  }
  const missingness: { alternativeId: string; field: ProspectiveAssistedFieldV3; reason: string }[] = [];
  const leadTimes: { alternativeId: string; days: number; localObservationDate: string }[] = [];
  const critical = new Set(PROSPECTIVE_ASSISTED_CRITICAL_FIELDS_V3);
  for (const alternative of input.alternatives) {
    invalid(!exact(alternative, ["alternativeId", "observedAt", "observedLocalDate", "observedLocalDateTime", "sourceSurface", "guestConfigurationFingerprint", "fields", "detailCoverageKeys"]), "ALTERNATIVE_KEYS_INVALID");
    invalid(alternative.sourceSurface !== selection.sourceSurface || alternative.guestConfigurationFingerprint !== `${scenario.adults}|${scenario.childAges.join(",")}|${scenario.rooms}`, "ALTERNATIVE_SCOPE_MISMATCH");
    invalid(!instant(alternative.observedAt) || alternative.observedAt < input.collectionWindow.start || alternative.observedAt > input.collectionWindow.end, "OBSERVATION_OUTSIDE_WINDOW");
    try {
      const localDate = prospectiveAssistedLocalDateV3(alternative.observedAt, scenario.timezone);
      const lead = prospectiveAssistedLeadTimeDaysV3(alternative.observedAt, scenario.checkIn, scenario.timezone);
      invalid(localDate !== alternative.observedLocalDate || prospectiveAssistedLocalDateTimeV3(alternative.observedAt, scenario.timezone) !== alternative.observedLocalDateTime || lead < 1, "LOCAL_DATE_OR_LEAD_TIME_INVALID");
      leadTimes.push({ alternativeId: alternative.alternativeId, days: lead, localObservationDate: localDate });
    } catch { issues.push("TIMEZONE_INVALID"); }
    invalid(!exact(alternative.fields, PROSPECTIVE_ASSISTED_FIELDS_V3), "FIELD_SET_INVALID");
    invalid(!input.evidence.some((evidence) => evidence.alternativeId === alternative.alternativeId && evidence.kind === "SYNTHETIC_SCREENSHOT"), "ALTERNATIVE_SCREENSHOT_REQUIRED");
    invalid(!Array.isArray(alternative.detailCoverageKeys) || new Set(alternative.detailCoverageKeys).size !== alternative.detailCoverageKeys.length || alternative.detailCoverageKeys.some((key) => !PROSPECTIVE_ASSISTED_FIELDS_V3.includes(key)), "DETAIL_COVERAGE_INVALID");
    for (const field of PROSPECTIVE_ASSISTED_FIELDS_V3) {
      const wrapper = alternative.fields[field];
      if (!wrapper || !exact(wrapper, ["status", "reliability", "value", "unknownReason", "evidenceRefs"])) { issues.push("EVIDENCE_WRAPPER_REQUIRED"); continue; }
      invalid(!["KNOWN", "UNKNOWN"].includes(wrapper.status) || !["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(wrapper.reliability) || !Array.isArray(wrapper.evidenceRefs) || new Set(wrapper.evidenceRefs).size !== wrapper.evidenceRefs.length, "EVIDENCE_WRAPPER_INVALID");
      invalid(wrapper.evidenceRefs.some((ref) => refs.get(ref)?.alternativeId !== alternative.alternativeId), "FIELD_EVIDENCE_REFERENCE_INVALID");
      if (wrapper.status === "UNKNOWN") {
        invalid(wrapper.value !== null || typeof wrapper.unknownReason !== "string" || !wrapper.unknownReason.trim(), "UNKNOWN_WRAPPER_INVALID");
        missingness.push({ alternativeId: alternative.alternativeId, field, reason: wrapper.unknownReason ?? "INVALID_REASON" });
        continue;
      }
      invalid(wrapper.value === null || wrapper.unknownReason !== null || wrapper.evidenceRefs.length === 0 || wrapper.reliability === "UNKNOWN", "KNOWN_WRAPPER_INVALID");
      if (["totalStayPriceMinorUnits", "payNowMinorUnits", "payAtPropertyMinorUnits", "reviewCount", "distanceMeters"].includes(field)) invalid(!integer(wrapper.value), "NUMERIC_FIELD_INVALID");
      else if (["rating", "ratingScale"].includes(field)) invalid(typeof wrapper.value !== "number" || wrapper.value < 0 || (field === "ratingScale" && wrapper.value === 0), "RATING_INVALID");
      else if (field === "amenities") {
        invalid(!Array.isArray(wrapper.value) || wrapper.value.some((code) => !/^[A-Z][A-Z0-9_]{2,80}$/.test(code)), "AMENITIES_INVALID");
        if (Array.isArray(wrapper.value)) invalid(wrapper.value.some((code) => code.startsWith("ABSENT_") && (wrapper.value as readonly string[]).includes(code.slice(7))), "AMENITY_PRESENCE_CONTRADICTION");
      }
      else invalid(typeof wrapper.value !== "string" || normalizeManualMarketUnknownTextV3(wrapper.value) === null, "TEXT_FIELD_INVALID");
      if ((field === "cancellation" || field === "refundability") && typeof wrapper.value === "string") invalid(!validateManualMarketTextConditionV3(wrapper.value).valid, "CONDITION_TEXT_INVALID");
      if (field === "availability") invalid(wrapper.value !== "OBSERVED_AVAILABLE", "AVAILABILITY_NOT_CONFIRMED");
    }
    const value = (field: ProspectiveAssistedFieldV3) => alternative.fields[field]?.status === "KNOWN" ? alternative.fields[field]!.value : null;
    if (typeof value("rating") === "number" && typeof value("ratingScale") === "number") invalid((value("rating") as number) > (value("ratingScale") as number), "RATING_EXCEEDS_SCALE");
    if (typeof value("totalStayPriceMinorUnits") === "number") {
      const result = validateManualMarketPaymentDecompositionV3(value("totalStayPriceMinorUnits") as number, value("payNowMinorUnits") as number | null, value("payAtPropertyMinorUnits") as number | null);
      invalid(!result.valid, "PAYMENT_DECOMPOSITION_INVALID");
    }
  }
  const blockers = missingness.filter((entry) => critical.has(entry.field)).map((entry) => `MISSING_CRITICAL:${entry.alternativeId}:${entry.field}`);
  const hardConstraintAssessment: { alternativeId: string; requirement: string; status: "VERIFIED_PRESENT" | "VERIFIED_ABSENT" | "UNKNOWN" }[] = [];
  for (const alternative of input.alternatives) {
    if (alternative.fields.distanceMeters?.status !== "KNOWN" && alternative.fields.locationText?.status !== "KNOWN") blockers.push(`MISSING_LOCATION:${alternative.alternativeId}`);
    if (!same([...alternative.detailCoverageKeys].sort(compare), [...(input.alternatives[0]?.detailCoverageKeys ?? [])].sort(compare))) blockers.push("ASYMMETRIC_DETAIL_COVERAGE");
    // Constraint codes need explicit documented evidence; a room title never proves them.
    const amenities = alternative.fields.amenities;
    for (const requirement of scenario.hardConstraints) {
      const codes = amenities?.status === "KNOWN" && Array.isArray(amenities.value) ? amenities.value : [];
      const status = codes.includes(requirement) ? "VERIFIED_PRESENT" : codes.includes(`ABSENT_${requirement}`) ? "VERIFIED_ABSENT" : "UNKNOWN";
      hardConstraintAssessment.push({ alternativeId: alternative.alternativeId, requirement, status });
      if (status !== "VERIFIED_PRESENT") blockers.push(`${status === "VERIFIED_ABSENT" ? "HARD_CONSTRAINT_VIOLATED" : "HARD_CONSTRAINT_UNVERIFIED"}:${alternative.alternativeId}:${requirement}`);
    }
  }
  if (input.acquisition.loggedOut !== "VERIFIED" || input.acquisition.personalizationAbsent !== "VERIFIED") blockers.push("CONSUMER_CONDITIONS_NOT_VERIFIED");
  return { valid: issues.length === 0, eligible: issues.length === 0 && blockers.length === 0, issues: [...new Set(issues)].sort(compare), eligibilityBlockers: [...new Set(blockers)].sort(compare), missingness, hardConstraintAssessment, leadTimes, classification: "DIAGNOSTIC_ONLY" as const, exactBookable: false as const, verifiedCheckoutTotal: false as const, automaticGoldenAdmission: false as const, engineReplayAllowed: false as const };
}
export function prospectiveAssistedContentFingerprintV3(input: ProspectiveAssistedInputV3) {
  return fingerprintProspectiveAssistedV3(input, "prospective-reviewed-content");
}
function sealState(state: Omit<ProspectiveAssistedStateV3, "stateFingerprint">): ProspectiveAssistedStateV3 {
  const result = { ...state, stateFingerprint: fingerprintProspectiveAssistedV3(state, "prospective-state") };
  const freeze = (value: unknown): void => { if (value !== null && typeof value === "object" && !Object.isFrozen(value)) { for (const entry of Object.values(value)) freeze(entry); Object.freeze(value); } };
  freeze(result); verifiedImmutableStates.add(result); return result;
}
export function createProspectiveAssistedSessionV3(input: ProspectiveAssistedInputV3): ProspectiveAssistedStateV3 {
  const validation = validateInput(input);
  if (!validation.valid) fail(`PROSPECTIVE_INPUT_INVALID:${validation.issues.join(",")}`);
  return sealState({ stateVersion: PROSPECTIVE_ASSISTED_VERSION_V3, input: clone(input), originalInput: clone(input), revision: 0, dataRevision: 0, events: [], fieldReviews: {}, reviewedFingerprint: null, exposures: {}, judgments: [], invalidatedJudgmentIds: [], decisionRevealed: false, classification: "DIAGNOSTIC_ONLY", automaticGoldenAdmission: false, realHumanJudgmentCount: 0, realExpertJudgmentCount: 0 });
}
function assertState(state: ProspectiveAssistedStateV3) {
  if (verifiedImmutableStates.has(state)) return;
  safeJson(state);
  const { stateFingerprint, ...material } = state;
  if (fingerprintProspectiveAssistedV3(material, "prospective-state") !== stateFingerprint) fail("PROSPECTIVE_STATE_FINGERPRINT_INVALID");
  let replay = createProspectiveAssistedSessionV3(state.originalInput);
  for (const record of state.events) {
    replay = applyEvent(replay, record.event);
    if (!same(replay.events[replay.events.length - 1], record)) fail("PROSPECTIVE_EVENT_CHAIN_INVALID");
  }
  if (!same(replay, state)) fail("PROSPECTIVE_STATE_REPLAY_MISMATCH");
}
export function validateProspectiveAssistedSessionV3(state: ProspectiveAssistedStateV3) {
  assertState(state);
  return { ...validateInput(state.input), transcriptReviewed: state.reviewedFingerprint === prospectiveAssistedContentFingerprintV3(state.input), revision: state.revision, dataRevision: state.dataRevision };
}
function mergeExposure(before: Exposure | undefined, after: Exposure): Exposure {
  if (!exact(after, ["caseDataSeen", "caseRecognized", "engineRecommendationSeen"]) || Object.values(after).some((value) => typeof value !== "boolean")) fail("PROSPECTIVE_EXPOSURE_INVALID");
  if (before && Object.keys(before).some((key) => before[key as keyof Exposure] && !after[key as keyof Exposure])) fail("PROSPECTIVE_EXPOSURE_CANNOT_BE_ERASED");
  return clone(after);
}
function validateJudgment(state: ProspectiveAssistedStateV3, judgment: ProspectiveAssistedJudgmentV3) {
  if (!exact(judgment, ["judgmentVersion", "judgmentId", "sessionId", "contentFingerprint", "evaluatorPseudonym", "evaluatorClass", "choice", "selectedAlternativeIds", "confidence", "reasonCodes", "consentVersion", "createdAtBucket", "blockingField"]) || judgment.judgmentVersion !== "stayopti.v3.prospective-assisted-judgment@1" || !ID.test(judgment.judgmentId) || !ID.test(judgment.evaluatorPseudonym) || judgment.evaluatorClass !== "HUMAN_SIMULATION") fail("PROSPECTIVE_JUDGMENT_SCHEMA_INVALID");
  if (state.reviewedFingerprint === null || state.reviewedFingerprint !== judgment.contentFingerprint || judgment.sessionId !== state.input.sessionId || !validateInput(state.input).eligible) fail("PROSPECTIVE_JUDGMENT_INPUT_NOT_READY");
  if (state.decisionRevealed) fail("PROSPECTIVE_JUDGMENT_AFTER_REVEAL_REJECTED");
  // Reviewing fields records knowledge, not answers to the independent questions
  // about recognition and prior engine advice. Only an explicit declaration by
  // this evaluator satisfies the judgment gate; inferred defaults never do.
  if (!state.exposures[judgment.evaluatorPseudonym] || !state.events.some((record) => record.event.type === "RECORD_EXPOSURE" && record.event.reviewerId === judgment.evaluatorPseudonym)) fail("PROSPECTIVE_EXPOSURE_DECLARATION_REQUIRED");
  if (state.judgments.some((record) => record.judgment.judgmentId === judgment.judgmentId || (record.judgment.evaluatorPseudonym === judgment.evaluatorPseudonym && (record.dataRevision === state.dataRevision || !state.invalidatedJudgmentIds.includes(record.judgment.judgmentId))))) fail("PROSPECTIVE_DUPLICATE_JUDGMENT_REJECTED");
  const choices = judgment.selectedAlternativeIds;
  const ids = new Set(state.input.alternatives.map((alternative) => alternative.alternativeId));
  if (!Array.isArray(choices) || new Set(choices).size !== choices.length || choices.some((id) => !ids.has(id)) || !["SELECT", "TIE", "NO_GOOD_OPTION", "INSUFFICIENT_EVIDENCE"].includes(judgment.choice) || (judgment.choice === "SELECT" && choices.length !== 1) || (judgment.choice === "TIE" && choices.length < 2) || (["NO_GOOD_OPTION", "INSUFFICIENT_EVIDENCE"].includes(judgment.choice) && choices.length !== 0)) fail("PROSPECTIVE_JUDGMENT_CHOICE_INVALID");
  if (!integer(judgment.confidence, 1) || judgment.confidence > 5 || !Array.isArray(judgment.reasonCodes) || judgment.reasonCodes.length === 0 || judgment.reasonCodes.length > 3 || new Set(judgment.reasonCodes).size !== judgment.reasonCodes.length || judgment.reasonCodes.some((reason) => !(PROSPECTIVE_ASSISTED_REASON_CODES_V3 as readonly string[]).includes(reason)) || !/^[a-zA-Z0-9][a-zA-Z0-9.@_-]{2,80}$/.test(judgment.consentVersion) || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(judgment.createdAtBucket)) fail("PROSPECTIVE_JUDGMENT_METADATA_INVALID");
  const requiredReason = judgment.choice === "TIE" ? "OPTIONS_EQUIVALENT" : judgment.choice === "NO_GOOD_OPTION" ? "TRADEOFF_NOT_JUSTIFIED" : judgment.choice === "INSUFFICIENT_EVIDENCE" ? "EVIDENCE_TOO_INCOMPLETE" : null;
  if (requiredReason !== null && !judgment.reasonCodes.includes(requiredReason)) fail("PROSPECTIVE_JUDGMENT_REASON_MISMATCH");
  if (judgment.blockingField !== null && judgment.blockingField !== "hardConstraints" && !PROSPECTIVE_ASSISTED_FIELDS_V3.includes(judgment.blockingField)) fail("PROSPECTIVE_BLOCKING_FIELD_INVALID");
  // The unchanged eligibility gate requires verified essential constraints for
  // every alternative. A judgment must not fabricate a violation to abstain.
  if (judgment.reasonCodes.includes("HARD_CONSTRAINT_NOT_MET") || judgment.blockingField === "hardConstraints") fail("PROSPECTIVE_JUDGMENT_CONTRADICTS_ELIGIBILITY");
  if (judgment.choice === "NO_GOOD_OPTION") {
    if (judgment.reasonCodes.some((reason) => ["OPTIONS_EQUIVALENT", "EVIDENCE_TOO_INCOMPLETE"].includes(reason))) fail("PROSPECTIVE_JUDGMENT_REASON_MISMATCH");
    // No-good-option may describe the overall trade-off without a single field.
    // An optional focus must be observable set-wide, not missing evidence posed
    // as an unacceptable characteristic. Insufficient evidence remains separate.
    if (judgment.blockingField !== null && state.input.alternatives.some((alternative) => alternative.fields[judgment.blockingField as ProspectiveAssistedFieldV3].status !== "KNOWN")) fail("PROSPECTIVE_TRADEOFF_FIELD_NOT_COMPARABLE");
  }
  if (judgment.choice === "INSUFFICIENT_EVIDENCE" && judgment.blockingField === null) fail("PROSPECTIVE_BLOCKING_FIELD_REQUIRED");
}
function applyEvent(state: ProspectiveAssistedStateV3, event: ProspectiveAssistedEventV3): ProspectiveAssistedStateV3 {
  safeJson(event);
  if (!ID.test(event.eventId) || !instant(event.at) || event.expectedRevision !== state.revision || state.events.some((record) => record.event.eventId === event.eventId) || event.at < (state.events.at(-1)?.event.at ?? state.input.collectionWindow.end)) fail("PROSPECTIVE_EVENT_ORDER_INVALID");
  const next = clone(state); const base = ["eventId", "at", "expectedRevision", "type"];
  if (event.type === "REVIEW_FIELD" || event.type === "CORRECT_FIELD") {
    const alternative = next.input.alternatives.find((entry) => entry.alternativeId === event.alternativeId);
    if (!alternative || !PROSPECTIVE_ASSISTED_FIELDS_V3.includes(event.field)) fail("PROSPECTIVE_CORRECTION_TARGET_INVALID");
    if (event.type === "REVIEW_FIELD") {
      if (!exact(event, [...base, "alternativeId", "field", "status", "reviewerId"]) || !ID.test(event.reviewerId) || !["CONFIRMED", "NOT_VERIFIABLE"].includes(event.status)) fail("PROSPECTIVE_FIELD_REVIEW_INVALID");
      if (event.status === "NOT_VERIFIABLE" && alternative.fields[event.field].status !== "UNKNOWN") fail("PROSPECTIVE_UNVERIFIABLE_FIELD_MUST_BE_UNKNOWN");
      next.fieldReviews[`${event.alternativeId}.${event.field}`] = { status: event.status, reviewerId: event.reviewerId };
      next.exposures[event.reviewerId] = { ...(next.exposures[event.reviewerId] ?? { caseDataSeen: false, caseRecognized: false, engineRecommendationSeen: false }), caseDataSeen: true };
    } else {
      if (!exact(event, [...base, "alternativeId", "field", "value", "reasonCode"]) || !["TRANSCRIPTION_CORRECTION", "EVIDENCE_NOT_DOCUMENTED"].includes(event.reasonCode)) fail("PROSPECTIVE_CORRECTION_INVALID");
      alternative.fields[event.field] = normalizeProspectiveAssistedEvidenceV3(event.value);
      const result = validateInput(next.input);
      if (!result.valid) fail(`PROSPECTIVE_CORRECTION_REJECTED:${result.issues.join(",")}`);
      if (same(next.input, state.input)) fail("PROSPECTIVE_NO_OP_CORRECTION_REJECTED");
      next.dataRevision += 1; next.reviewedFingerprint = null; delete next.fieldReviews[`${event.alternativeId}.${event.field}`];
      next.invalidatedJudgmentIds = [...new Set([...next.invalidatedJudgmentIds, ...next.judgments.map((record) => record.judgment.judgmentId)])].sort(compare);
    }
  } else if (event.type === "CONFIRM_REVIEW") {
    if (!exact(event, [...base, "reviewerId", "contentFingerprint"]) || !ID.test(event.reviewerId) || event.contentFingerprint !== prospectiveAssistedContentFingerprintV3(next.input)) fail("PROSPECTIVE_REVIEW_BINDING_INVALID");
    if (next.input.alternatives.some((alternative) => PROSPECTIVE_ASSISTED_FIELDS_V3.some((field) => next.fieldReviews[`${alternative.alternativeId}.${field}`]?.reviewerId !== event.reviewerId))) fail("PROSPECTIVE_ALL_FIELDS_REVIEW_REQUIRED");
    next.reviewedFingerprint = event.contentFingerprint;
    next.exposures[event.reviewerId] = { ...(next.exposures[event.reviewerId] ?? { caseDataSeen: false, caseRecognized: false, engineRecommendationSeen: false }), caseDataSeen: true };
  } else if (event.type === "RECORD_EXPOSURE") {
    if (!exact(event, [...base, "reviewerId", "exposure"]) || !ID.test(event.reviewerId)) fail("PROSPECTIVE_EXPOSURE_INVALID");
    next.exposures[event.reviewerId] = mergeExposure(next.exposures[event.reviewerId], event.exposure);
  } else if (event.type === "RECORD_JUDGMENT") {
    if (!exact(event, [...base, "judgment"])) fail("PROSPECTIVE_EVENT_KEYS_INVALID");
    validateJudgment(next, event.judgment);
    if (event.judgment.createdAtBucket !== event.at.slice(0, 7)) fail("PROSPECTIVE_JUDGMENT_TIME_BUCKET_MISMATCH");
    const exposure = next.exposures[event.judgment.evaluatorPseudonym]!;
    next.judgments.push({ recordedAt: event.at, dataRevision: next.dataRevision, judgment: clone(event.judgment), qualification: Object.values(exposure).some(Boolean) ? "SYNTHETIC_EXPOSED_DIAGNOSTIC" : "SYNTHETIC_UNEXPOSED_REHEARSAL" });
  } else if (event.type === "REVEAL_DECISION") {
    if (!exact(event, [...base, "responseHash"]) || !HEX.test(event.responseHash) || next.decisionRevealed || !next.judgments.some((record) => !next.invalidatedJudgmentIds.includes(record.judgment.judgmentId))) fail("PROSPECTIVE_REVEAL_BEFORE_VALID_JUDGMENT_REJECTED");
    next.decisionRevealed = true;
    for (const exposure of Object.values(next.exposures)) exposure.engineRecommendationSeen = true;
  } else fail("PROSPECTIVE_EVENT_TYPE_INVALID");
  const previousHash = state.events.at(-1)?.eventHash ?? fingerprintProspectiveAssistedV3(state.originalInput, "prospective-event-genesis");
  const record = { ordinal: state.revision + 1, previousHash, event: clone(event) };
  next.events.push({ ...record, eventHash: fingerprintProspectiveAssistedV3(record, "prospective-event") });
  next.revision += 1;
  const { stateFingerprint: _discard, ...material } = next;
  return sealState(material);
}
export function transitionProspectiveAssistedSessionV3(state: ProspectiveAssistedStateV3, event: ProspectiveAssistedEventV3) {
  assertState(state);
  return applyEvent(state, event);
}
export function replayProspectiveAssistedEventsV3(input: ProspectiveAssistedInputV3, events: readonly ProspectiveAssistedEventRecordV3[]) {
  let state = createProspectiveAssistedSessionV3(input);
  for (const record of events) {
    state = applyEvent(state, record.event);
    if (!same(state.events.at(-1), record)) fail("PROSPECTIVE_EVENT_CHAIN_INVALID");
  }
  return state;
}
/** Private mapping is returned separately; publicView contains no evidence/source identities. */
export function createProspectiveAssistedComparisonV3(state: ProspectiveAssistedStateV3) {
  const validation = validateProspectiveAssistedSessionV3(state);
  if (!validation.eligible || !validation.transcriptReviewed) fail("PROSPECTIVE_COMPARISON_NOT_READY");
  const excludedFromComparison = PROSPECTIVE_ASSISTED_FIELDS_V3.filter((field) => {
    const knownCount = state.input.alternatives.filter((alternative) => alternative.fields[field].status === "KNOWN").length;
    return knownCount > 0 && knownCount < state.input.alternatives.length && !["distanceMeters", "locationText"].includes(field);
  });
  const ordered = state.input.alternatives.map((alternative) => {
    const fields = Object.fromEntries(PROSPECTIVE_ASSISTED_FIELDS_V3.map((field) => {
      const { evidenceRefs: _privateRefs, ...value } = alternative.fields[field];
      return [field, { ...value, comparativeEligibility: excludedFromComparison.includes(field) ? "AUDIT_ONLY_NOT_COMPARABLE" : value.status === "UNKNOWN" ? "UNKNOWN_NOT_NEGATIVE_EVIDENCE" : "COMPARABLE_ACROSS_SET" }];
    }));
    return { alternativeId: alternative.alternativeId, fields, semantic: fingerprintProspectiveAssistedV3(fields, "prospective-neutral-order") };
  }).sort((a, b) => compare(a.semantic, b.semantic));
  const privateMapping = ordered.map((entry, index) => ({ label: `ALT_${String.fromCharCode(65 + index)}`, alternativeId: entry.alternativeId }));
  return {
    publicView: { schemaVersion: PROSPECTIVE_ASSISTED_VERSION_V3, classification: "DIAGNOSTIC_ONLY" as const, synthetic: true as const, scenario: clone(state.input.scenario), alternatives: ordered.map((entry, index) => ({ label: privateMapping[index]!.label, fields: entry.fields })), excludedFromComparison, priceSemantics: "PUBLIC_PRECHECKOUT_VERIFIED_PRICE" as const, exactBookable: false as const, verifiedCheckoutTotal: false as const, decisionOutputShown: false as const, allowedChoices: ["SELECT", "TIE", "NO_GOOD_OPTION", "INSUFFICIENT_EVIDENCE"] as const },
    privateMapping,
  };
}

/** Only fake inputs. The durable runner must separately prove a prior on-disk seal. */
export function createSyntheticProspectiveAssistedPlanV3(count: 5 | 6 | 7 | 8, frozenAt: string) {
  const timezone = "Europe/Rome";
  const localDate = prospectiveAssistedLocalDateV3(frozenAt, timezone);
  const checkIn = new Date(Date.parse(`${localDate}T00:00:00Z`) + 30 * 86400000).toISOString().slice(0, 10);
  const familyScenario = count === 8;
  const checkOut = new Date(Date.parse(`${localDate}T00:00:00Z`) + (familyScenario ? 37 : 33) * 86400000).toISOString().slice(0, 10);
  const scenario: ProspectiveAssistedInputV3["scenario"] = { frozenAt, timezone, checkIn, checkOut, adults: 2, childAges: familyScenario ? [8, 12] : [], rooms: 1, currency: "EUR", destinationToken: familyScenario ? "SYNTHETIC_FAMILY_DESTINATION" : "SYNTHETIC_COUPLE_DESTINATION", budgetMinorUnits: familyScenario ? 120000 : 60000, budgetScope: "ACCOMMODATION_MANDATORY_COSTS", profile: familyScenario ? "comfort" : "balanced", hardConstraints: ["PRIVATE_ROOM", "PRIVATE_BATHROOM"], declaredNeeds: familyScenario ? ["DECLARED_FAMILY_COMFORT"] : ["COMPARABLE_LOCATION"] };
  const selection: ProspectiveAssistedInputV3["selection"] = { frozenAt, rule: "FIRST_ELIGIBLE_ORGANIC_WITHIN_CAP", alternativesTarget: count, maximumCandidates: 20, sourceSurface: "SYNTHETIC_PUBLIC_CONSUMER", insufficientSetPolicy: "RETAIN_DIAGNOSTIC_NO_REPLACEMENT", maximumCollectionWindowSeconds: 3600 };
  return { scenario, selection };
}

export function createSyntheticProspectiveAssistedInputV3(count: 5 | 6 | 7 | 8, options: { frozenAt?: string; observedAt?: string; sessionId?: string } = {}): ProspectiveAssistedInputV3 {
  const frozenAt = options.frozenAt ?? "2030-01-01T10:00:00.000Z";
  const observedAt = options.observedAt ?? "2030-01-01T10:01:00.000Z";
  const timezone = "Europe/Rome";
  const localDate = prospectiveAssistedLocalDateV3(observedAt, timezone);
  const plan = createSyntheticProspectiveAssistedPlanV3(count, frozenAt);
  const input: ProspectiveAssistedInputV3 = {
    schemaVersion: PROSPECTIVE_ASSISTED_VERSION_V3, synthetic: true, sessionId: options.sessionId ?? (count === 8 ? "SYNTHETIC_PROSPECTIVE_FAMILY_CASE_002" : "SYNTHETIC_PROSPECTIVE_COUPLE_CASE_001"),
    acquisition: { mode: "BROWSER_ASSISTED_AGENT", browserAutomation: "ASSISTED_BROWSER_INTERACTION_DISCLOSED", loggedOut: "VERIFIED", incognito: "UNKNOWN", personalizationAbsent: "VERIFIED" },
    scenario: plan.scenario,
    selection: plan.selection,
    collectionWindow: { start: observedAt, end: observedAt },
    sourceBindings: { archiveSha256: "1".repeat(64), descriptorSha256: "2".repeat(64), dataMapSha256: "3".repeat(64), reviewReceiptSha256: "4".repeat(64), codeManifestSha256: "5".repeat(64) }, evidence: [], alternatives: [],
  };
  for (let index = 0; index < count; index += 1) {
    const alternativeId = `SYNTHETIC_ALTERNATIVE_${index + 1}`;
    const screenshot = `EVIDENCE_SCREEN_${index + 1}`; const log = `EVIDENCE_TIME_${index + 1}`;
    input.evidence.push({ evidenceRef: log, alternativeId, sha256: fingerprintProspectiveAssistedV3({ log }), capturedAt: observedAt, captureTimeSourceRef: log, kind: "SYNTHETIC_CAPTURE_LOG" }, { evidenceRef: screenshot, alternativeId, sha256: fingerprintProspectiveAssistedV3({ screenshot }), capturedAt: observedAt, captureTimeSourceRef: log, kind: "SYNTHETIC_SCREENSHOT" });
    const known = (value: ProspectiveAssistedValueV3): ProspectiveAssistedEvidenceV3 => ({ status: "KNOWN", reliability: "MEDIUM", value, unknownReason: null, evidenceRefs: [screenshot] });
    const unknown = (reason: string): ProspectiveAssistedEvidenceV3 => ({ status: "UNKNOWN", reliability: "UNKNOWN", value: null, unknownReason: reason, evidenceRefs: [screenshot] });
    input.alternatives.push({ alternativeId, observedAt, observedLocalDate: localDate, observedLocalDateTime: prospectiveAssistedLocalDateTimeV3(observedAt, timezone), sourceSurface: "SYNTHETIC_PUBLIC_CONSUMER", guestConfigurationFingerprint: `${plan.scenario.adults}|${plan.scenario.childAges.join(",")}|${plan.scenario.rooms}`, detailCoverageKeys: [...PROSPECTIVE_ASSISTED_FIELDS_V3], fields: {
      totalStayPriceMinorUnits: known((count === 8 ? 85000 : 40000) + index * 1000), payNowMinorUnits: unknown("NOT_DOCUMENTED"), payAtPropertyMinorUnits: unknown("NOT_DOCUMENTED"), taxInclusionStatement: known("Include tasse e costi"), taxBreakdown: unknown("ITEMIZED_TAX_BREAKDOWN_NOT_DOCUMENTED"), rating: known(8 + index / 10), ratingScale: known(10), reviewCount: known(200 + index * 10), distanceMeters: unknown("REFERENCE_DISTANCE_NOT_DOCUMENTED"), locationText: known("Posizione testuale verificata nell'area centrale sintetica"), category: known("Hotel"), room: known(count === 8 ? "Camera privata per due adulti e due bambini di 8 e 12 anni con bagno privato" : "Camera privata per due adulti con bagno privato"), mealPlan: known("Solo pernottamento"), cancellation: known("Cancellazione gratuita secondo termine sintetico documentato"), refundability: known("Rimborsabile secondo condizioni sintetiche"), amenities: known(["PRIVATE_ROOM", "PRIVATE_BATHROOM", "WIFI"]), availability: known("OBSERVED_AVAILABLE"),
    } });
  }
  return input;
}
