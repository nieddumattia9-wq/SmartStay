import {
  isSmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  stableSerializeV3,
} from "../contract/stableHashV3";

import {
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
} from "../policy/personalUtilityRolePolicyV3";

import {
  createFreshRoleAwareSha256V3,
} from "./freshReplayableRoleAwareCapsuleV3";

import {
  STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
  STAYOPTI_GOLDEN_CASE_SOURCE_KINDS_V3,
  STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3,
  STAYOPTI_GOLDEN_COUNTERFACTUAL_DIMENSIONS_V3,
  type StayOptiGoldenAlternativeV3,
  type StayOptiGoldenCaseV3,
  type StayOptiGoldenCaseValidationResultV3,
  type StayOptiGoldenCounterfactualDimensionV3,
  type StayOptiGoldenCounterfactualValidationResultV3,
  type StayOptiGoldenDecisionRecordV3,
  type StayOptiGoldenEvidenceValueV3,
  type StayOptiGoldenTransformationV3,
  type StayOptiGoldenValidationIssueV3,
  type StayOptiGoldenValidationReasonCodeV3,
} from "./goldenCaseContractV3";

type PlainRecord = Record<string, unknown>;

type InternalSeverity =
  | "QUARANTINE"
  | "REJECT";

interface InternalIssue extends StayOptiGoldenValidationIssueV3 {
  severity: InternalSeverity;
}

const REQUIRED_TOP_LEVEL_KEYS = [
  "abstentionEligibility",
  "alternatives",
  "caseVersion",
  "createdAtBucket",
  "decisions",
  "evidenceRefs",
  "expectedRole",
  "goldenCaseId",
  "provenance",
  "schemaVersion",
  "searchFamilyId",
  "sourceKind",
  "travelerContext",
  "tripContext",
] as const;

const OPTIONAL_TOP_LEVEL_KEYS = [
  "counterfactual",
  "declaredFingerprint",
  "transformations",
] as const;

const RAW_PROVIDER_FIELD_KEYS = new Set([
  "providerid",
  "hotelid",
  "rateid",
  "offerid",
  "bookingid",
  "prebookid",
  "continuationid",
  "correlationid",
  "nextresultskey",
  "searchid",
]);

const RAW_PAYLOAD_FIELD_KEYS = new Set([
  "rawpayload",
  "rawproviderpayload",
  "rawrequest",
  "rawresponse",
]);

const SECRET_FIELD_KEYS = new Set([
  "apikey",
  "accesstoken",
  "refreshtoken",
  "secret",
  "password",
  "authorization",
  "credential",
  "credentials",
]);

const COMMERCIAL_FIELD_KEYS = new Set([
  "commission",
  "markup",
  "affiliaterevenue",
  "providerpriority",
  "commercialorder",
  "commercialordering",
  "clickprobability",
  "usereconomicvalue",
]);

const PII_FIELD_KEYS = new Set([
  "name",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "firstname",
  "lastname",
  "fullname",
  "address",
  "postaladdress",
  "ip",
  "ipaddress",
  "passport",
  "passportnumber",
  "identitydocument",
]);

const PROTOTYPE_FIELD_KEYS = new Set([
  "proto",
  "prototype",
  "constructor",
]);

const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
// A leading international marker avoids classifying ISO dates or local numeric
// decision codes as phone numbers. Phone-shaped fields remain blocked by name.
const PHONE_VALUE = /^\+(?:\d[\s().-]*){7,15}$/;
const SECRET_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~-]+|\bsk-[A-Za-z0-9_-]{12,}|\bghp_[A-Za-z0-9]{12,}|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i;
const CURRENCY = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._@-]{2,127}$/;
const GOLDEN_CASE_ID = /^GOLDEN_CASE_[A-Z0-9_]{4,96}$/;
const SEARCH_FAMILY_ID = /^SEARCH_FAMILY_[A-Z0-9_]{4,96}$/;
const LOCAL_ALTERNATIVE_ID = /^ALT_[A-Z0-9_]{1,64}$/;
const LOCAL_REFERENCE = /^(?:EVIDENCE|TRANSFORM|PAIR|SOURCE|CODE)_[A-Z0-9_]{2,96}$/;
const CREATED_BUCKET = /^\d{4}-(?:Q[1-4]|\d{2})$/;
const SHA256_FINGERPRINT = /^sha256:[0-9a-f]{64}$/;

const SINGLE_STAY_ROLES = new Set([
  "best-choice",
  "best-sensible-saving",
  "worthwhile-comfort-upgrade",
  "abstention-near-tie",
]);

function normalizeFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function compareStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function issueKey(issue: StayOptiGoldenValidationIssueV3) {
  return `${issue.path}\u0000${issue.reasonCode}`;
}

function sortIssues<T extends StayOptiGoldenValidationIssueV3>(
  issues: readonly T[]
) {
  return [...new Map(issues.map((issue) => [issueKey(issue), issue])).values()]
    .sort((left, right) =>
      compareStrings(left.path, right.path) ||
      compareStrings(left.reasonCode, right.reasonCode)
    );
}

function addIssue(
  issues: InternalIssue[],
  severity: InternalSeverity,
  reasonCode: StayOptiGoldenValidationReasonCodeV3,
  path: string
) {
  issues.push({ severity, reasonCode, path });
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: PlainRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

function nightsBetween(checkIn: string, checkOut: string) {
  return (Date.parse(`${checkOut}T00:00:00Z`) -
    Date.parse(`${checkIn}T00:00:00Z`)) /
    86_400_000;
}

function keysMatch(value: PlainRecord, required: readonly string[]) {
  const actual = Object.keys(value).sort(compareStrings);
  const expected = [...required].sort(compareStrings);
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function keysAllowed(
  value: PlainRecord,
  required: readonly string[],
  optional: readonly string[] = []
) {
  const allowed = new Set([...required, ...optional]);
  return Object.keys(value).every((key) => allowed.has(key));
}

function reasonCodesValid(value: unknown): value is string[] {
  return isStringArray(value) &&
    new Set(value).size === value.length &&
    value.every(isSmartStayReasonCodeV3);
}

function referencesValid(value: unknown): value is string[] {
  return isStringArray(value) &&
    new Set(value).size === value.length &&
    value.every((entry) => LOCAL_REFERENCE.test(entry));
}

function scanJsonSafety(value: unknown): InternalIssue[] {
  const issues: InternalIssue[] = [];
  const active = new Set<object>();

  function visit(current: unknown, path: string) {
    if (typeof current === "string") {
      if (EMAIL_VALUE.test(current) || PHONE_VALUE.test(current)) {
        addIssue(issues, "REJECT", "GOLDEN_PII_PRESENT", path);
      }
      if (SECRET_VALUE.test(current)) {
        addIssue(issues, "REJECT", "GOLDEN_SECRET_OR_TOKEN_PRESENT", path);
      }
      return;
    }

    if (typeof current === "number") {
      if (!Number.isFinite(current)) {
        addIssue(
          issues,
          "REJECT",
          /minorunits/i.test(path)
            ? "GOLDEN_PRICE_INVALID"
            : "GOLDEN_JSON_VALUE_INVALID",
          path
        );
      }
      return;
    }

    if (current === null || typeof current === "boolean") return;

    if (current === undefined ||
      typeof current === "function" ||
      typeof current === "symbol" ||
      typeof current === "bigint") {
      addIssue(issues, "REJECT", "GOLDEN_JSON_VALUE_INVALID", path);
      return;
    }

    if (typeof current !== "object") return;

    if (active.has(current)) {
      addIssue(issues, "REJECT", "GOLDEN_JSON_VALUE_INVALID", path);
      return;
    }
    active.add(current);

    if (!Array.isArray(current)) {
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) {
        addIssue(issues, "REJECT", "GOLDEN_OBJECT_PROTOTYPE_INVALID", path);
        active.delete(current);
        return;
      }
    }

    for (const key of Reflect.ownKeys(current)) {
      if (typeof key !== "string") {
        addIssue(issues, "REJECT", "GOLDEN_JSON_VALUE_INVALID", path);
        continue;
      }
      const nestedPath = Array.isArray(current)
        ? `${path}[${key}]`
        : `${path}.${key}`;
      const normalized = normalizeFieldKey(key);
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor === undefined ||
        typeof descriptor.get === "function" ||
        typeof descriptor.set === "function") {
        addIssue(issues, "REJECT", "GOLDEN_UNSAFE_FIELD_PRESENT", nestedPath);
        continue;
      }
      if (PROTOTYPE_FIELD_KEYS.has(normalized)) {
        addIssue(issues, "REJECT", "GOLDEN_UNSAFE_FIELD_PRESENT", nestedPath);
      }
      if (RAW_PROVIDER_FIELD_KEYS.has(normalized)) {
        addIssue(issues, "REJECT", "GOLDEN_RAW_PROVIDER_IDENTIFIER_PRESENT", nestedPath);
      }
      if (RAW_PAYLOAD_FIELD_KEYS.has(normalized)) {
        addIssue(issues, "REJECT", "GOLDEN_UNSAFE_FIELD_PRESENT", nestedPath);
      }
      if (SECRET_FIELD_KEYS.has(normalized)) {
        addIssue(issues, "REJECT", "GOLDEN_SECRET_OR_TOKEN_PRESENT", nestedPath);
      }
      if (COMMERCIAL_FIELD_KEYS.has(normalized)) {
        addIssue(issues, "REJECT", "GOLDEN_COMMERCIAL_FIELD_PRESENT", nestedPath);
      }
      if (PII_FIELD_KEYS.has(normalized)) {
        addIssue(issues, "REJECT", "GOLDEN_PII_PRESENT", nestedPath);
      }
      visit(descriptor.value, nestedPath);
    }
    active.delete(current);
  }

  visit(value, "case");
  return sortIssues(issues);
}

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort(compareStrings);
}

function canonicalEvidence<T>(
  evidence: StayOptiGoldenEvidenceValueV3<T>,
  canonicalValue: (value: T) => T = (value) => value
): StayOptiGoldenEvidenceValueV3<T> {
  return {
    status: evidence.status,
    reliability: evidence.reliability,
    value: evidence.value === null ? null : canonicalValue(evidence.value),
    unknownReason: evidence.unknownReason,
    evidenceRefs: sortedUnique(evidence.evidenceRefs),
  };
}

function canonicalAlternative(
  alternative: StayOptiGoldenAlternativeV3
): StayOptiGoldenAlternativeV3 {
  return {
    localAlternativeId: alternative.localAlternativeId,
    totalTripCostMinorUnits: alternative.totalTripCostMinorUnits,
    currency: alternative.currency,
    taxFeeEvidence: canonicalEvidence(alternative.taxFeeEvidence, (value) => ({ ...value })),
    ratingEvidence: canonicalEvidence(alternative.ratingEvidence, (value) => ({ ...value })),
    reviewEvidence: canonicalEvidence(alternative.reviewEvidence, (value) => ({ ...value })),
    distanceEvidence: canonicalEvidence(alternative.distanceEvidence, (value) => ({ ...value })),
    accommodationCategoryEvidence: canonicalEvidence(alternative.accommodationCategoryEvidence),
    roomEvidence: canonicalEvidence(alternative.roomEvidence, (value) => ({
      ...value,
      childAges: [...value.childAges].sort((left, right) => left - right),
    })),
    cancellationEvidence: canonicalEvidence(alternative.cancellationEvidence, (value) => ({ ...value })),
    comfortEvidence: canonicalEvidence(alternative.comfortEvidence, (value) => ({
      featureCodes: sortedUnique(value.featureCodes),
    })),
    dataReliability: alternative.dataReliability,
    costCompleteness: alternative.costCompleteness,
    bookabilityStatus: alternative.bookabilityStatus,
    missingEvidence: sortedUnique(alternative.missingEvidence),
    reasonCodes: sortedUnique(alternative.reasonCodes) as typeof alternative.reasonCodes,
  };
}

function canonicalDecision(
  decision: StayOptiGoldenDecisionRecordV3
): StayOptiGoldenDecisionRecordV3 {
  return {
    ...decision,
    selectedAlternativeIds: sortedUnique(decision.selectedAlternativeIds),
    reasonCodes: sortedUnique(decision.reasonCodes) as typeof decision.reasonCodes,
    evidenceRefs: sortedUnique(decision.evidenceRefs),
  };
}

function canonicalTransformation(
  transformation: StayOptiGoldenTransformationV3
): StayOptiGoldenTransformationV3 {
  return { ...transformation };
}

function canonicalCaseWithoutFingerprint(candidate: StayOptiGoldenCaseV3) {
  return {
    schemaVersion: candidate.schemaVersion,
    caseVersion: candidate.caseVersion,
    // The corpus-local identifier is an address, not decision evidence. Its
    // omission lets the corpus validator detect equal content under new IDs.
    searchFamilyId: candidate.searchFamilyId,
    sourceKind: candidate.sourceKind,
    createdAtBucket: candidate.createdAtBucket,
    provenance: { ...candidate.provenance },
    tripContext: {
      ...candidate.tripContext,
      childAges: [...candidate.tripContext.childAges].sort((left, right) => left - right),
    },
    travelerContext: {
      ...candidate.travelerContext,
      essentialConstraintCodes: sortedUnique(candidate.travelerContext.essentialConstraintCodes),
      distancePreference: { ...candidate.travelerContext.distancePreference },
      comfortRequirements: {
        ...candidate.travelerContext.comfortRequirements,
        requiredCodes: sortedUnique(candidate.travelerContext.comfortRequirements.requiredCodes),
      },
      flexibilityRequirements: { ...candidate.travelerContext.flexibilityRequirements },
    },
    alternatives: candidate.alternatives
      .map(canonicalAlternative)
      .sort((left, right) => compareStrings(left.localAlternativeId, right.localAlternativeId)),
    decisions: {
      v2: canonicalDecision(candidate.decisions.v2),
      v3Candidate: canonicalDecision(candidate.decisions.v3Candidate),
    },
    expectedRole: candidate.expectedRole,
    abstentionEligibility: {
      ...candidate.abstentionEligibility,
      reasonCodes: sortedUnique(candidate.abstentionEligibility.reasonCodes) as typeof candidate.abstentionEligibility.reasonCodes,
    },
    evidenceRefs: sortedUnique(candidate.evidenceRefs),
    ...(candidate.transformations === undefined
      ? {}
      : { transformations: candidate.transformations.map(canonicalTransformation) }),
    ...(candidate.counterfactual === undefined
      ? {}
      : {
          counterfactual: {
            ...candidate.counterfactual,
            changedPaths: sortedUnique(candidate.counterfactual.changedPaths),
          },
        }),
  };
}

export function canonicalSerializeGoldenCaseV3(candidate: StayOptiGoldenCaseV3) {
  return stableSerializeV3(canonicalCaseWithoutFingerprint(candidate));
}

export function createGoldenCaseFingerprintV3(candidate: StayOptiGoldenCaseV3) {
  return createFreshRoleAwareSha256V3(
    canonicalCaseWithoutFingerprint(candidate),
    "stayopti-v3-golden-case"
  );
}

function validateEvidenceWrapper(
  value: unknown,
  path: string,
  evidenceRefs: ReadonlySet<string>,
  issues: InternalIssue[],
  validateKnown: (known: unknown, knownPath: string) => boolean
) {
  if (!isPlainRecord(value) ||
    !keysMatch(value, ["evidenceRefs", "reliability", "status", "unknownReason", "value"])) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    return { explicitUnknown: false };
  }
  const status = value.status;
  const reliability = value.reliability;
  if (!["KNOWN", "UNKNOWN"].includes(String(status)) ||
    !["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(String(reliability)) ||
    !referencesValid(value.evidenceRefs)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
  }
  if (isStringArray(value.evidenceRefs) &&
    value.evidenceRefs.some((reference) => !evidenceRefs.has(reference))) {
    addIssue(issues, "QUARANTINE", "GOLDEN_EVIDENCE_REFERENCE_UNRESOLVED", `${path}.evidenceRefs`);
  }
  if (status === "UNKNOWN") {
    if (value.value !== null || !hasText(value.unknownReason)) {
      addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    }
    return { explicitUnknown: true };
  }
  if (status === "KNOWN") {
    if (value.value === null || value.unknownReason !== null ||
      !validateKnown(value.value, `${path}.value`)) {
      addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    }
  }
  return { explicitUnknown: false };
}

function validateTripContext(value: unknown, issues: InternalIssue[]) {
  const path = "case.tripContext";
  if (!isPlainRecord(value) || !keysMatch(value, [
    "adults", "bookingLeadTimeBucket", "checkIn", "checkOut", "childAges",
    "destinationBucket", "expectedCurrency", "nights", "rooms", "seasonBucket",
    "stayLengthBucket",
  ])) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    return;
  }
  if (!isIsoDate(value.checkIn) || !isIsoDate(value.checkOut) ||
    !isPositiveInteger(value.nights) ||
    (isIsoDate(value.checkIn) && isIsoDate(value.checkOut) &&
      isPositiveInteger(value.nights) && nightsBetween(value.checkIn, value.checkOut) !== value.nights) ||
    !isPositiveInteger(value.adults) || !isPositiveInteger(value.rooms) ||
    !Array.isArray(value.childAges) ||
    value.childAges.some((age) => !isNonNegativeInteger(age) || age > 17) ||
    typeof value.expectedCurrency !== "string" || !CURRENCY.test(value.expectedCurrency) ||
    typeof value.destinationBucket !== "string" || !/^DESTINATION_[A-Z0-9_]{2,64}$/.test(value.destinationBucket) ||
    !["LAST_MINUTE", "NEAR_TERM", "MID_TERM", "ADVANCE"].includes(String(value.bookingLeadTimeBucket)) ||
    !["VERY_SHORT", "SHORT", "MEDIUM", "LONG", "EXTENDED"].includes(String(value.stayLengthBucket)) ||
    !["LOW", "SHOULDER", "HIGH", "EVENT_OR_HOLIDAY"].includes(String(value.seasonBucket))) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
  }
}

function validateTravelerContext(value: unknown, issues: InternalIssue[]) {
  const path = "case.travelerContext";
  if (!isPlainRecord(value) || !keysMatch(value, [
    "budgetMinorUnits", "comfortRequirements", "distancePreference",
    "essentialConstraintCodes", "flexibilityRequirements", "profile",
  ])) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    return;
  }
  if (!isNonNegativeInteger(value.budgetMinorUnits)) {
    addIssue(issues, "REJECT", "GOLDEN_PRICE_INVALID", `${path}.budgetMinorUnits`);
  }
  if (!STAYOPTI_ROLE_POLICY_PROFILES_V3.includes(value.profile as never) ||
    !isStringArray(value.essentialConstraintCodes) ||
    new Set(value.essentialConstraintCodes as string[]).size !== (value.essentialConstraintCodes as string[]).length) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
  }
  const distance = value.distancePreference;
  if (!isPlainRecord(distance) || !keysMatch(distance, ["maximumDistanceMeters", "status", "unknownReason"]) ||
    !["KNOWN", "UNKNOWN"].includes(String(distance.status)) ||
    (distance.status === "KNOWN" && (!isNonNegativeInteger(distance.maximumDistanceMeters) || distance.unknownReason !== null)) ||
    (distance.status === "UNKNOWN" && (distance.maximumDistanceMeters !== null || !hasText(distance.unknownReason)))) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", `${path}.distancePreference`);
  }
  const comfort = value.comfortRequirements;
  if (!isPlainRecord(comfort) || !keysMatch(comfort, ["requiredCodes", "status", "unknownReason"]) ||
    !["KNOWN", "UNKNOWN"].includes(String(comfort.status)) ||
    !isStringArray(comfort.requiredCodes) ||
    (comfort.status === "KNOWN" && comfort.unknownReason !== null) ||
    (comfort.status === "UNKNOWN" && (!hasText(comfort.unknownReason) || comfort.requiredCodes.length !== 0))) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", `${path}.comfortRequirements`);
  }
  const flexibility = value.flexibilityRequirements;
  if (!isPlainRecord(flexibility) || !keysMatch(flexibility, [
    "minimumRefundability", "payLaterRequired", "status", "unknownReason",
  ]) || !["KNOWN", "UNKNOWN"].includes(String(flexibility.status)) ||
    (flexibility.status === "KNOWN" &&
      (!['REFUNDABLE', 'NON_REFUNDABLE_ACCEPTABLE'].includes(String(flexibility.minimumRefundability)) ||
        typeof flexibility.payLaterRequired !== "boolean" || flexibility.unknownReason !== null)) ||
    (flexibility.status === "UNKNOWN" &&
      (flexibility.minimumRefundability !== null || flexibility.payLaterRequired !== null || !hasText(flexibility.unknownReason)))) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", `${path}.flexibilityRequirements`);
  }
}

function validateAlternative(
  value: unknown,
  index: number,
  expectedCurrency: string | null,
  evidenceRefs: ReadonlySet<string>,
  issues: InternalIssue[]
) {
  const path = `case.alternatives[${index}]`;
  let explicitUnknown = false;
  const requiredKeys = [
    "accommodationCategoryEvidence", "bookabilityStatus", "cancellationEvidence",
    "comfortEvidence", "costCompleteness", "currency", "dataReliability",
    "distanceEvidence", "localAlternativeId", "missingEvidence", "ratingEvidence",
    "reasonCodes", "reviewEvidence", "roomEvidence", "taxFeeEvidence",
    "totalTripCostMinorUnits",
  ] as const;
  if (!isPlainRecord(value)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    return { explicitUnknown, localAlternativeId: null as string | null };
  }
  const missingKeys = requiredKeys.filter((key) => !hasOwn(value, key));
  const extraKeys = Object.keys(value).filter((key) => !requiredKeys.includes(key as never));
  if (missingKeys.length > 0) {
    for (const key of missingKeys) {
      addIssue(issues, "QUARANTINE", "GOLDEN_REQUIRED_FIELD_MISSING", `${path}.${key}`);
    }
    return {
      explicitUnknown,
      localAlternativeId: typeof value.localAlternativeId === "string"
        ? value.localAlternativeId
        : null,
    };
  }
  if (extraKeys.length > 0) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    return {
      explicitUnknown,
      localAlternativeId: typeof value.localAlternativeId === "string"
        ? value.localAlternativeId
        : null,
    };
  }
  if (typeof value.localAlternativeId !== "string" ||
    !LOCAL_ALTERNATIVE_ID.test(value.localAlternativeId)) {
    addIssue(issues, "REJECT", "GOLDEN_ID_INVALID", `${path}.localAlternativeId`);
  }
  if (!isNonNegativeInteger(value.totalTripCostMinorUnits)) {
    addIssue(issues, "REJECT", "GOLDEN_PRICE_INVALID", `${path}.totalTripCostMinorUnits`);
  }
  if (typeof value.currency !== "string" || !CURRENCY.test(value.currency) ||
    (expectedCurrency !== null && value.currency !== expectedCurrency)) {
    addIssue(issues, "REJECT", "GOLDEN_CURRENCY_MISMATCH", `${path}.currency`);
  }
  if (!["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(String(value.dataReliability)) ||
    !["COMPLETE", "PARTIAL", "UNKNOWN"].includes(String(value.costCompleteness)) ||
    !["AVAILABLE", "REQUIRES_RECHECK", "UNKNOWN"].includes(String(value.bookabilityStatus)) ||
    !isStringArray(value.missingEvidence) ||
    new Set(value.missingEvidence as string[]).size !== (value.missingEvidence as string[]).length ||
    !reasonCodesValid(value.reasonCodes)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
  }

  const wrappers: Array<[string, unknown, (known: unknown) => boolean]> = [
    ["taxFeeEvidence", value.taxFeeEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, ["feesIncluded", "taxesIncluded", "totalKnownMinorUnits"]) &&
      isNonNegativeInteger(known.totalKnownMinorUnits) &&
      typeof known.taxesIncluded === "boolean" && typeof known.feesIncluded === "boolean"],
    ["ratingEvidence", value.ratingEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, ["scale", "score"]) &&
      typeof known.score === "number" && Number.isFinite(known.score) && known.score >= 0 &&
      typeof known.scale === "number" && Number.isFinite(known.scale) && known.scale > 0 && known.score <= known.scale],
    ["reviewEvidence", value.reviewEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, ["count", "sourceClass"]) &&
      isNonNegativeInteger(known.count) && ["VERIFIED_GUESTS", "MIXED", "UNKNOWN"].includes(String(known.sourceClass))],
    ["distanceEvidence", value.distanceEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, ["measurement", "meters"]) &&
      isNonNegativeInteger(known.meters) &&
      ["TRAVEL_TIME", "WALKING_DISTANCE", "STRAIGHT_LINE"].includes(String(known.measurement))],
    ["accommodationCategoryEvidence", value.accommodationCategoryEvidence, (known) =>
      typeof known === "string" && /^CATEGORY_[A-Z0-9_]{2,64}$/.test(known)],
    ["roomEvidence", value.roomEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, ["adults", "childAges", "rooms", "roomTypeCode"]) &&
      typeof known.roomTypeCode === "string" && /^ROOM_[A-Z0-9_]{2,64}$/.test(known.roomTypeCode) &&
      isPositiveInteger(known.adults) && isPositiveInteger(known.rooms) &&
      Array.isArray(known.childAges) && known.childAges.every((age) => isNonNegativeInteger(age) && age <= 17)],
    ["cancellationEvidence", value.cancellationEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, [
        "freeCancellationUntilBucket", "penaltyCurrency", "penaltyMinorUnits", "refundability",
      ]) && ["REFUNDABLE", "NON_REFUNDABLE"].includes(String(known.refundability)) &&
      (known.freeCancellationUntilBucket === null || typeof known.freeCancellationUntilBucket === "string") &&
      (known.penaltyMinorUnits === null || isNonNegativeInteger(known.penaltyMinorUnits)) &&
      (known.penaltyCurrency === null || (typeof known.penaltyCurrency === "string" && CURRENCY.test(known.penaltyCurrency))) &&
      ((known.penaltyMinorUnits === null) === (known.penaltyCurrency === null))],
    ["comfortEvidence", value.comfortEvidence, (known) =>
      isPlainRecord(known) && keysMatch(known, ["featureCodes"]) &&
      isStringArray(known.featureCodes) && new Set(known.featureCodes).size === known.featureCodes.length],
  ];

  for (const [name, wrapper, validateKnown] of wrappers) {
    const result = validateEvidenceWrapper(wrapper, `${path}.${name}`, evidenceRefs, issues, validateKnown);
    explicitUnknown ||= result.explicitUnknown;
  }

  const room = isPlainRecord(value.roomEvidence) && isPlainRecord(value.roomEvidence.value)
    ? value.roomEvidence.value
    : null;
  return {
    explicitUnknown,
    localAlternativeId: typeof value.localAlternativeId === "string" ? value.localAlternativeId : null,
    room,
  };
}

function validateDecision(
  value: unknown,
  path: string,
  expectedEngineKey: string,
  expectedRole: string | null,
  alternativeIds: ReadonlySet<string>,
  evidenceRefs: ReadonlySet<string>,
  issues: InternalIssue[]
) {
  if (!isPlainRecord(value) || !keysMatch(value, [
    "confidenceBps", "engineKey", "evidenceRefs", "fallbackStatus", "policyVersion",
    "reasonCodes", "role", "selectedAlternativeIds", "status",
  ])) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    return;
  }
  if (value.engineKey !== expectedEngineKey || !hasText(value.policyVersion) ||
    !["SELECTED", "ABSTAINED"].includes(String(value.status)) ||
    !isStringArray(value.selectedAlternativeIds) ||
    !SINGLE_STAY_ROLES.has(String(value.role)) || value.role !== expectedRole ||
    !isNonNegativeInteger(value.confidenceBps) || value.confidenceBps > 10_000 ||
    !reasonCodesValid(value.reasonCodes) || !referencesValid(value.evidenceRefs) ||
    !["NOT_USED", "USED", "NOT_APPLICABLE"].includes(String(value.fallbackStatus))) {
    addIssue(issues, "REJECT", "GOLDEN_DECISION_AMBIGUOUS", path);
  }
  if (value.role === "split-saver") {
    addIssue(issues, "REJECT", "GOLDEN_SPLIT_SINGLE_STAY_PROHIBITED", `${path}.role`);
  }
  if (Array.isArray(value.selectedAlternativeIds)) {
    if ((value.status === "SELECTED" && value.selectedAlternativeIds.length !== 1) ||
      (value.status === "ABSTAINED" && value.selectedAlternativeIds.length !== 0) ||
      value.selectedAlternativeIds.some((id) => typeof id !== "string" || !alternativeIds.has(id))) {
      addIssue(issues, "REJECT", "GOLDEN_DECISION_REFERENCE_INVALID", `${path}.selectedAlternativeIds`);
    }
  }
  if (isStringArray(value.evidenceRefs) &&
    value.evidenceRefs.some((reference) => !evidenceRefs.has(reference))) {
    addIssue(issues, "QUARANTINE", "GOLDEN_EVIDENCE_REFERENCE_UNRESOLVED", `${path}.evidenceRefs`);
  }
}

function validateProvenance(
  value: unknown,
  sourceKind: string | null,
  issues: InternalIssue[]
) {
  const path = "case.provenance";
  if (!isPlainRecord(value) || !keysMatch(value, [
    "collectionBoundary", "evidenceSchemaVersion", "freshnessBucket", "normalizerVersion",
    "origin", "parentGoldenCaseId", "providerSourceKey", "transformationProcess",
  ])) {
    addIssue(issues, "QUARANTINE", "GOLDEN_PROVENANCE_INCOMPLETE", path);
    return;
  }
  if (value.origin !== sourceKind ||
    !["PROVIDER_EXHAUSTED_WITHIN_CAP", "DEPTH_CAPPED_DIAGNOSTIC_ONLY", "CONTROLLED_OFFLINE_DERIVATION"].includes(String(value.collectionBoundary)) ||
    !hasText(value.normalizerVersion) || !hasText(value.evidenceSchemaVersion) ||
    typeof value.providerSourceKey !== "string" || !/^SOURCE_[A-Z0-9_]{3,64}$/.test(value.providerSourceKey) ||
    !hasText(value.freshnessBucket) || !hasText(value.transformationProcess) ||
    !(value.parentGoldenCaseId === null ||
      (typeof value.parentGoldenCaseId === "string" && GOLDEN_CASE_ID.test(value.parentGoldenCaseId)))) {
    addIssue(issues, "QUARANTINE", "GOLDEN_PROVENANCE_INCOMPLETE", path);
  }
}

function validateTransformations(
  value: unknown,
  sourceKind: string | null,
  issues: InternalIssue[]
) {
  if (value === undefined) {
    if (sourceKind !== "REAL_NORMALIZED_SNAPSHOT") {
      addIssue(issues, "QUARANTINE", "GOLDEN_PROVENANCE_INCOMPLETE", "case.transformations");
    }
    return;
  }
  if (!Array.isArray(value)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case.transformations");
    return;
  }
  if (sourceKind !== "REAL_NORMALIZED_SNAPSHOT" && value.length === 0) {
    addIssue(issues, "QUARANTINE", "GOLDEN_PROVENANCE_INCOMPLETE", "case.transformations");
  }
  value.forEach((entry, index) => {
    const path = `case.transformations[${index}]`;
    if (!isPlainRecord(entry) || !keysMatch(entry, [
      "changedDimension", "descriptionCode", "kind", "ordinal", "precommitted", "transformationId",
    ]) || entry.ordinal !== index ||
      typeof entry.transformationId !== "string" || !LOCAL_REFERENCE.test(entry.transformationId) ||
      !["ADVERSARIAL", "COUNTERFACTUAL"].includes(String(entry.kind)) ||
      !(entry.changedDimension === null || STAYOPTI_GOLDEN_COUNTERFACTUAL_DIMENSIONS_V3.includes(entry.changedDimension as never)) ||
      typeof entry.descriptionCode !== "string" || !/^CODE_[A-Z0-9_]{2,96}$/.test(entry.descriptionCode) ||
      entry.precommitted !== true) {
      addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", path);
    }
  });
}

function validateCounterfactual(
  value: unknown,
  sourceKind: string | null,
  issues: InternalIssue[]
) {
  if (sourceKind !== "COUNTERFACTUAL_DERIVED") {
    if (value !== undefined) {
      addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "case.counterfactual");
    }
    return;
  }
  if (!isPlainRecord(value) || !keysMatch(value, [
    "changedDimension", "changedPaths", "counterfactualPairId", "parentGoldenCaseId",
    "precommittedBeforeEvaluation", "sameSearchFamilyRequired",
  ]) || typeof value.counterfactualPairId !== "string" ||
    !/^PAIR_[A-Z0-9_]{3,96}$/.test(value.counterfactualPairId) ||
    typeof value.parentGoldenCaseId !== "string" || !GOLDEN_CASE_ID.test(value.parentGoldenCaseId) ||
    !STAYOPTI_GOLDEN_COUNTERFACTUAL_DIMENSIONS_V3.includes(value.changedDimension as never) ||
    !isStringArray(value.changedPaths) || value.changedPaths.length === 0 ||
    new Set(value.changedPaths as string[]).size !== (value.changedPaths as string[]).length ||
    value.precommittedBeforeEvaluation !== true || value.sameSearchFamilyRequired !== true) {
    addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "case.counterfactual");
    return;
  }
  const allowedPath = (() => {
    switch (value.changedDimension) {
      case "BUDGET": return /^travelerContext\.budgetMinorUnits$/;
      case "PROFILE": return /^travelerContext\.profile$/;
      case "DISTANCE_PREFERENCE": return /^travelerContext\.distancePreference(?:\.|$)/;
      case "COMFORT_REQUIREMENT": return /^travelerContext\.comfortRequirements(?:\.|$)/;
      case "FLEXIBILITY_REQUIREMENT": return /^travelerContext\.flexibilityRequirements(?:\.|$)/;
      case "PRICE": return /^alternatives\[\*\]\.totalTripCostMinorUnits$/;
      case "QUALITY": return /^alternatives\[\*\]\.(?:ratingEvidence|reviewEvidence|accommodationCategoryEvidence)(?:\.|$)/;
      case "EVIDENCE_AVAILABILITY": return /^alternatives\[\*\]\.(?:missingEvidence|[A-Za-z]+Evidence\.status)$/;
      default: return /^$/;
    }
  })();
  if (!(value.changedPaths as string[]).every((changedPath) => allowedPath.test(changedPath))) {
    addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "case.counterfactual.changedPaths");
  }
}

function publicIssues(issues: readonly InternalIssue[]) {
  return sortIssues(issues).map(({ reasonCode, path }) => ({ reasonCode, path }));
}

export function validateGoldenCaseV3(value: unknown): StayOptiGoldenCaseValidationResultV3 {
  const issues = scanJsonSafety(value);
  let computedFingerprint: string | null = null;
  let explicitUnknownEvidenceAccepted = false;
  let providerNeutralReplayEligible = false;
  let evaluableAbstention = false;

  if (issues.some((issue) => issue.severity === "REJECT")) {
    return {
      validatorVersion: STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3,
      schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
      disposition: "REJECTED_CONTRACT",
      issues: publicIssues(issues),
      computedFingerprint,
      explicitUnknownEvidenceAccepted,
      providerNeutralReplayEligible,
      evaluableAbstention,
    };
  }

  if (!isPlainRecord(value)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case");
  }
  if (!isPlainRecord(value)) {
    return {
      validatorVersion: STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3,
      schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
      disposition: "REJECTED_CONTRACT",
      issues: publicIssues(issues),
      computedFingerprint,
      explicitUnknownEvidenceAccepted,
      providerNeutralReplayEligible,
      evaluableAbstention,
    };
  }

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!hasOwn(value, key)) {
      addIssue(issues, "QUARANTINE", "GOLDEN_REQUIRED_FIELD_MISSING", `case.${key}`);
    }
  }
  if (!keysAllowed(value, REQUIRED_TOP_LEVEL_KEYS, OPTIONAL_TOP_LEVEL_KEYS)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case");
  }
  if (value.schemaVersion !== STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3) {
    addIssue(issues, "REJECT", "GOLDEN_SCHEMA_UNSUPPORTED", "case.schemaVersion");
  }

  const missingRequired = REQUIRED_TOP_LEVEL_KEYS.some((key) => !hasOwn(value, key));
  if (missingRequired) {
    return {
      validatorVersion: STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3,
      schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
      disposition: issues.some((issue) => issue.severity === "REJECT")
        ? "REJECTED_CONTRACT"
        : "QUARANTINED_INCOMPLETE",
      issues: publicIssues(issues),
      computedFingerprint,
      explicitUnknownEvidenceAccepted,
      providerNeutralReplayEligible,
      evaluableAbstention,
    };
  }

  const sourceKind = typeof value.sourceKind === "string" ? value.sourceKind : null;
  const expectedRole = typeof value.expectedRole === "string" ? value.expectedRole : null;
  if (!hasText(value.caseVersion) || !VERSION.test(value.caseVersion)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case.caseVersion");
  }
  if (typeof value.goldenCaseId !== "string" || !GOLDEN_CASE_ID.test(value.goldenCaseId)) {
    addIssue(issues, "REJECT", "GOLDEN_ID_INVALID", "case.goldenCaseId");
  }
  if (typeof value.searchFamilyId !== "string" || !SEARCH_FAMILY_ID.test(value.searchFamilyId)) {
    addIssue(issues, "REJECT", "GOLDEN_ID_INVALID", "case.searchFamilyId");
  }
  if (!STAYOPTI_GOLDEN_CASE_SOURCE_KINDS_V3.includes(sourceKind as never)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case.sourceKind");
  }
  if (typeof value.createdAtBucket !== "string" || !CREATED_BUCKET.test(value.createdAtBucket)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case.createdAtBucket");
  }
  if (!SINGLE_STAY_ROLES.has(String(expectedRole))) {
    addIssue(
      issues,
      "REJECT",
      expectedRole === "split-saver" ? "GOLDEN_SPLIT_SINGLE_STAY_PROHIBITED" : "GOLDEN_ROLE_INVALID",
      "case.expectedRole"
    );
  }

  validateProvenance(value.provenance, sourceKind, issues);
  validateTripContext(value.tripContext, issues);
  validateTravelerContext(value.travelerContext, issues);

  const evidenceRefs = referencesValid(value.evidenceRefs)
    ? new Set(value.evidenceRefs)
    : new Set<string>();
  if (!referencesValid(value.evidenceRefs) || value.evidenceRefs.length === 0) {
    addIssue(issues, "QUARANTINE", "GOLDEN_EVIDENCE_REFERENCE_UNRESOLVED", "case.evidenceRefs");
  }

  const alternativeIds = new Set<string>();
  if (!Array.isArray(value.alternatives) || value.alternatives.length < 2) {
    addIssue(issues, "QUARANTINE", "GOLDEN_REQUIRED_FIELD_MISSING", "case.alternatives");
  } else {
    const currency = isPlainRecord(value.tripContext) &&
      typeof value.tripContext.expectedCurrency === "string"
      ? value.tripContext.expectedCurrency
      : null;
    for (const [index, alternative] of value.alternatives.entries()) {
      const result = validateAlternative(alternative, index, currency, evidenceRefs, issues);
      explicitUnknownEvidenceAccepted ||= result.explicitUnknown;
      if (result.localAlternativeId !== null) {
        if (alternativeIds.has(result.localAlternativeId)) {
          addIssue(issues, "REJECT", "GOLDEN_DUPLICATE_ALTERNATIVE_ID", `case.alternatives[${index}].localAlternativeId`);
        }
        alternativeIds.add(result.localAlternativeId);
      }
      const room = result.room ?? null;
      if (room !== null && isPlainRecord(value.tripContext)) {
        if (room.adults !== value.tripContext.adults ||
          room.rooms !== value.tripContext.rooms ||
          stableSerializeV3([...(room.childAges as unknown[])].sort()) !==
            stableSerializeV3([...(value.tripContext.childAges as unknown[])].sort())) {
          addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", `case.alternatives[${index}].roomEvidence`);
        }
      }
    }
  }

  if (!isPlainRecord(value.decisions) || !keysMatch(value.decisions, ["v2", "v3Candidate"])) {
    addIssue(issues, "REJECT", "GOLDEN_DECISION_AMBIGUOUS", "case.decisions");
  } else {
    validateDecision(value.decisions.v2, "case.decisions.v2", "V2_BASELINE", expectedRole, alternativeIds, evidenceRefs, issues);
    validateDecision(value.decisions.v3Candidate, "case.decisions.v3Candidate", "V3_CANDIDATE", expectedRole, alternativeIds, evidenceRefs, issues);
  }

  if (!isPlainRecord(value.abstentionEligibility) ||
    !keysMatch(value.abstentionEligibility, ["reasonCodes", "status"]) ||
    !["EVALUABLE", "NOT_EVALUABLE"].includes(String(value.abstentionEligibility.status)) ||
    !reasonCodesValid(value.abstentionEligibility.reasonCodes)) {
    addIssue(issues, "REJECT", "GOLDEN_FIELD_TYPE_INVALID", "case.abstentionEligibility");
  } else {
    evaluableAbstention = value.abstentionEligibility.status === "EVALUABLE";
  }

  validateTransformations(value.transformations, sourceKind, issues);
  validateCounterfactual(value.counterfactual, sourceKind, issues);

  if (Array.isArray(value.transformations)) {
    const expectedTransformationKind = sourceKind === "CONTROLLED_ADVERSARIAL"
      ? "ADVERSARIAL"
      : sourceKind === "COUNTERFACTUAL_DERIVED"
        ? "COUNTERFACTUAL"
        : null;
    if (expectedTransformationKind !== null && value.transformations.some((entry) =>
      !isPlainRecord(entry) || entry.kind !== expectedTransformationKind ||
      (expectedTransformationKind === "ADVERSARIAL" && entry.changedDimension !== null) ||
      (expectedTransformationKind === "COUNTERFACTUAL" &&
        isPlainRecord(value.counterfactual) &&
        entry.changedDimension !== value.counterfactual.changedDimension)
    )) {
      addIssue(issues, "REJECT", "GOLDEN_SOURCE_REQUIREMENT_INVALID", "case.transformations");
    }
  }

  if (isPlainRecord(value.provenance)) {
    if (sourceKind === "REAL_NORMALIZED_SNAPSHOT" &&
      (value.provenance.collectionBoundary !== "PROVIDER_EXHAUSTED_WITHIN_CAP" ||
        value.provenance.parentGoldenCaseId !== null || value.counterfactual !== undefined)) {
      addIssue(issues, "REJECT", "GOLDEN_SOURCE_REQUIREMENT_INVALID", "case.provenance");
    }
    if ((sourceKind === "CONTROLLED_ADVERSARIAL" || sourceKind === "COUNTERFACTUAL_DERIVED") &&
      (value.provenance.collectionBoundary !== "CONTROLLED_OFFLINE_DERIVATION" ||
        typeof value.provenance.parentGoldenCaseId !== "string")) {
      addIssue(issues, "QUARANTINE", "GOLDEN_PROVENANCE_INCOMPLETE", "case.provenance");
    }
  }

  const fingerprintComputable = !issues.some((issue) =>
    issue.severity === "QUARANTINE" &&
    issue.reasonCode !== "GOLDEN_EXPLICIT_UNKNOWN_EVIDENCE_ACCEPTED"
  );
  if (fingerprintComputable) {
    try {
      computedFingerprint = createGoldenCaseFingerprintV3(value as unknown as StayOptiGoldenCaseV3);
    } catch {
      addIssue(issues, "REJECT", "GOLDEN_JSON_VALUE_INVALID", "case");
    }
  }
  if (!hasOwn(value, "declaredFingerprint")) {
    addIssue(issues, "QUARANTINE", "GOLDEN_REQUIRED_FIELD_MISSING", "case.declaredFingerprint");
  } else if (typeof value.declaredFingerprint !== "string" ||
    !SHA256_FINGERPRINT.test(value.declaredFingerprint) ||
    (computedFingerprint !== null && value.declaredFingerprint !== computedFingerprint)) {
    addIssue(issues, "REJECT", "GOLDEN_FINGERPRINT_MISMATCH", "case.declaredFingerprint");
  }

  if (explicitUnknownEvidenceAccepted) {
    addIssue(issues, "QUARANTINE", "GOLDEN_EXPLICIT_UNKNOWN_EVIDENCE_ACCEPTED", "case.alternatives");
  }

  const sorted = sortIssues(issues);
  const rejected = sorted.some((issue) => issue.severity === "REJECT");
  const quarantined = sorted.some((issue) =>
    issue.severity === "QUARANTINE" &&
    issue.reasonCode !== "GOLDEN_EXPLICIT_UNKNOWN_EVIDENCE_ACCEPTED"
  );
  const disposition = rejected
    ? "REJECTED_CONTRACT"
    : quarantined
      ? "QUARANTINED_INCOMPLETE"
      : "GOLDEN_VALID";
  providerNeutralReplayEligible = disposition === "GOLDEN_VALID" &&
    isPlainRecord(value.provenance) &&
    value.provenance.collectionBoundary === "PROVIDER_EXHAUSTED_WITHIN_CAP";

  return {
    validatorVersion: STAYOPTI_GOLDEN_CASE_VALIDATOR_VERSION_V3,
    schemaVersion: STAYOPTI_GOLDEN_CASE_SCHEMA_VERSION_V3,
    disposition,
    issues: publicIssues(sorted),
    computedFingerprint,
    explicitUnknownEvidenceAccepted,
    providerNeutralReplayEligible,
    evaluableAbstention: disposition === "GOLDEN_VALID" && evaluableAbstention,
  };
}

function counterfactualDimensionProjection(
  candidate: StayOptiGoldenCaseV3,
  dimension: StayOptiGoldenCounterfactualDimensionV3
): unknown {
  switch (dimension) {
    case "BUDGET": return candidate.travelerContext.budgetMinorUnits;
    case "PROFILE": return candidate.travelerContext.profile;
    case "DISTANCE_PREFERENCE": return candidate.travelerContext.distancePreference;
    case "COMFORT_REQUIREMENT": return candidate.travelerContext.comfortRequirements;
    case "FLEXIBILITY_REQUIREMENT": return candidate.travelerContext.flexibilityRequirements;
    case "PRICE": return candidate.alternatives.map((alternative) => ({
      localAlternativeId: alternative.localAlternativeId,
      totalTripCostMinorUnits: alternative.totalTripCostMinorUnits,
    })).sort((left, right) => compareStrings(left.localAlternativeId, right.localAlternativeId));
    case "QUALITY": return candidate.alternatives.map((alternative) => ({
      localAlternativeId: alternative.localAlternativeId,
      ratingEvidence: alternative.ratingEvidence,
      reviewEvidence: alternative.reviewEvidence,
      accommodationCategoryEvidence: alternative.accommodationCategoryEvidence,
    })).sort((left, right) => compareStrings(left.localAlternativeId, right.localAlternativeId));
    case "EVIDENCE_AVAILABILITY": return candidate.alternatives.map((alternative) => ({
      localAlternativeId: alternative.localAlternativeId,
      missingEvidence: sortedUnique(alternative.missingEvidence),
      states: [
        alternative.taxFeeEvidence.status,
        alternative.ratingEvidence.status,
        alternative.reviewEvidence.status,
        alternative.distanceEvidence.status,
        alternative.accommodationCategoryEvidence.status,
        alternative.roomEvidence.status,
        alternative.cancellationEvidence.status,
        alternative.comfortEvidence.status,
      ],
    })).sort((left, right) => compareStrings(left.localAlternativeId, right.localAlternativeId));
  }
}

function counterfactualOtherProjection(
  candidate: StayOptiGoldenCaseV3,
  dimension: StayOptiGoldenCounterfactualDimensionV3
) {
  const canonical = canonicalCaseWithoutFingerprint(candidate);
  const projection = {
    tripContext: canonical.tripContext,
    travelerContext: { ...canonical.travelerContext },
    alternatives: canonical.alternatives.map((alternative) => ({ ...alternative })),
    expectedRole: canonical.expectedRole,
    abstentionEligibility: canonical.abstentionEligibility,
    evidenceRefs: canonical.evidenceRefs,
  };
  if (dimension === "BUDGET") delete (projection.travelerContext as Partial<typeof projection.travelerContext>).budgetMinorUnits;
  if (dimension === "PROFILE") delete (projection.travelerContext as Partial<typeof projection.travelerContext>).profile;
  if (dimension === "DISTANCE_PREFERENCE") delete (projection.travelerContext as Partial<typeof projection.travelerContext>).distancePreference;
  if (dimension === "COMFORT_REQUIREMENT") delete (projection.travelerContext as Partial<typeof projection.travelerContext>).comfortRequirements;
  if (dimension === "FLEXIBILITY_REQUIREMENT") delete (projection.travelerContext as Partial<typeof projection.travelerContext>).flexibilityRequirements;
  for (const alternative of projection.alternatives) {
    if (dimension === "PRICE") delete (alternative as Partial<typeof alternative>).totalTripCostMinorUnits;
    if (dimension === "QUALITY") {
      delete (alternative as Partial<typeof alternative>).ratingEvidence;
      delete (alternative as Partial<typeof alternative>).reviewEvidence;
      delete (alternative as Partial<typeof alternative>).accommodationCategoryEvidence;
    }
    if (dimension === "EVIDENCE_AVAILABILITY") {
      delete (alternative as Partial<typeof alternative>).missingEvidence;
    }
  }
  return projection;
}

export function validateCounterfactualPairV3(
  first: StayOptiGoldenCaseV3,
  second: StayOptiGoldenCaseV3
): StayOptiGoldenCounterfactualValidationResultV3 {
  const issues: InternalIssue[] = [];
  const firstResult = validateGoldenCaseV3(first);
  const secondResult = validateGoldenCaseV3(second);
  if (firstResult.disposition !== "GOLDEN_VALID" || secondResult.disposition !== "GOLDEN_VALID") {
    addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "pair.cases");
  }
  const firstMetadata = first.counterfactual;
  const secondMetadata = second.counterfactual;
  const pairId = firstMetadata?.counterfactualPairId ?? null;
  const dimension = firstMetadata?.changedDimension ?? null;
  if (first.sourceKind !== "COUNTERFACTUAL_DERIVED" || second.sourceKind !== "COUNTERFACTUAL_DERIVED" ||
    firstMetadata === undefined || secondMetadata === undefined ||
    pairId === null || pairId !== secondMetadata.counterfactualPairId ||
    dimension === null || dimension !== secondMetadata.changedDimension ||
    first.searchFamilyId !== second.searchFamilyId ||
    firstMetadata.sameSearchFamilyRequired !== true || secondMetadata.sameSearchFamilyRequired !== true ||
    firstMetadata.precommittedBeforeEvaluation !== true || secondMetadata.precommittedBeforeEvaluation !== true ||
    firstMetadata.parentGoldenCaseId !== secondMetadata.parentGoldenCaseId ||
    stableSerializeV3(sortedUnique(firstMetadata.changedPaths)) !==
      stableSerializeV3(sortedUnique(secondMetadata.changedPaths)) ||
    first.provenance.parentGoldenCaseId !== firstMetadata.parentGoldenCaseId ||
    second.provenance.parentGoldenCaseId !== secondMetadata.parentGoldenCaseId) {
    addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "pair.metadata");
  }
  if (dimension !== null) {
    if (stableSerializeV3(counterfactualDimensionProjection(first, dimension)) ===
      stableSerializeV3(counterfactualDimensionProjection(second, dimension))) {
      addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "pair.changedDimension");
    }
    if (stableSerializeV3(counterfactualOtherProjection(first, dimension)) !==
      stableSerializeV3(counterfactualOtherProjection(second, dimension))) {
      addIssue(issues, "REJECT", "GOLDEN_COUNTERFACTUAL_INVALID", "pair.materialDimensions");
    }
  }
  return {
    valid: issues.length === 0,
    issues: publicIssues(issues),
    counterfactualPairId: pairId,
    changedDimension: dimension,
  };
}
