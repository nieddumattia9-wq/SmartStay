import {
  stableSerializeV3,
} from "../contract/stableHashV3";

export const STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_SCHEMA_VERSION_V3 =
  "stayopti.v3.fresh-role-aware-source-capsule@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_CANONICALIZATION_VERSION_V3 =
  "stayopti.canonical-json@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3 =
  "sha256:canonical-json@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3 = [
  "best-choice",
  "best-sensible-saving",
  "worthwhile-comfort-upgrade",
  "split-saver",
  "abstention-near-tie",
] as const;

export type StayOptiFreshRoleAwareRoleV3 =
  typeof STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3[number];

export const STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3:
  Readonly<Record<StayOptiFreshRoleAwareRoleV3, string>> = Object.freeze({
    "best-choice":
      "Which complete stay solution is the best overall fit for this trip?",
    "best-sensible-saving":
      "Which complete stay solution provides the most sensible saving without unacceptable experience loss?",
    "worthwhile-comfort-upgrade":
      "Which complete stay solution provides enough material comfort gain to justify its premium?",
    "split-saver":
      "Which split solution creates more verified net value after switching friction and risk?",
    "abstention-near-tie":
      "Is the evidence sufficient to decide, or should the decision abstain?",
  });

export type StayOptiFreshKnowledgeStateV3 =
  | "known"
  | "estimated"
  | "unknown";

export type StayOptiFreshJsonV3 =
  | null
  | boolean
  | number
  | string
  | StayOptiFreshJsonV3[]
  | {
      [key: string]: StayOptiFreshJsonV3;
    };

export interface StayOptiFreshRoleAwareConstraintV3 {
  constraintId: string;
  value: string | number | boolean;
}

export interface StayOptiFreshRoleAwareSoftConstraintV3 {
  preferenceId: string;
  weight: 1 | 2 | 3 | 4 | 5;
  value: string | number | boolean;
}

export interface StayOptiFreshRoleAwareEvidenceV3 {
  evidenceId: string;
  fieldCodes: string[];
  observedAt: string;
  freshness: "fresh" | "stale" | "unknown";
  reliability: "high" | "medium" | "low" | "unknown";
}

export interface StayOptiFreshRoleAwareOfferV3 {
  canonicalOfferRef: string;
  cost: {
    total: number;
    currency: string;
    taxes: {
      status: "complete" | "partial" | "unknown";
      amount: number | null;
    };
    mandatoryCosts: {
      status: "complete" | "partial" | "unknown";
      amount: number | null;
    };
  };
  room: {
    typeCode: string;
    adults: number;
    childAges: number[];
    rooms: number;
  };
  treatment: {
    boardCode: string;
    included: boolean;
  };
  cancellation: {
    refundability: "refundable" | "non-refundable" | "unknown";
    freeCancellationUntil: string | null;
    penaltyAmount: number | null;
    currency: string | null;
  };
  payment: {
    timing: "pay-now" | "pay-later" | "mixed" | "unknown";
    status: "complete" | "partial" | "unknown";
  };
  availability: {
    state: "available" | "requires-recheck" | "unknown";
    checkedAt: string;
  };
}

export interface StayOptiFreshRoleAwareStaySegmentV3 {
  segmentId: string;
  accommodationToken: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  offer: StayOptiFreshRoleAwareOfferV3;
}

export interface StayOptiFreshRoleAwareStaySolutionV3 {
  solutionId: string;
  segments: StayOptiFreshRoleAwareStaySegmentV3[];
  totalCost: number;
  currency: string;
  quality: {
    starCategory: number | null;
  };
  reviews: {
    score: number | null;
    scale: number | null;
    count: number | null;
  };
  location: {
    distanceKm: number | null;
  };
  comfort: {
    featureCodes: string[];
  };
  dataStatus: {
    price: StayOptiFreshKnowledgeStateV3;
    taxes: StayOptiFreshKnowledgeStateV3;
    mandatoryCosts: StayOptiFreshKnowledgeStateV3;
    room: StayOptiFreshKnowledgeStateV3;
    treatment: StayOptiFreshKnowledgeStateV3;
    cancellation: StayOptiFreshKnowledgeStateV3;
    payment: StayOptiFreshKnowledgeStateV3;
    availability: StayOptiFreshKnowledgeStateV3;
    quality: StayOptiFreshKnowledgeStateV3;
    reviews: StayOptiFreshKnowledgeStateV3;
    location: StayOptiFreshKnowledgeStateV3;
    comfort: StayOptiFreshKnowledgeStateV3;
  };
  evidenceRefs: string[];
}

export interface StayOptiFreshRoleAwareCapsuleInputV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_SCHEMA_VERSION_V3;
  caseId: string;
  captureVersion: string;
  provenanceVersion: string;
  canonicalizationVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_CANONICALIZATION_VERSION_V3;
  createdAt: string;
  evaluationIntent: {
    role: StayOptiFreshRoleAwareRoleV3;
    question: string;
  };
  searchContext: {
    destination: {
      label: string;
      countryCode: string;
      latitude: number | null;
      longitude: number | null;
    };
    checkIn: string;
    checkOut: string;
    nights: number;
    occupancy: {
      adults: number;
      childAges: number[];
      rooms: number;
    };
    budget: {
      total: number;
      currency: string;
    };
    maximumDistanceKm: number;
  };
  preferences: {
    profile:
      | "maximum-comfort"
      | "comfort"
      | "balanced"
      | "savings"
      | "maximum-savings";
    essentialFeatureCodes: string[];
    preferredFeatureCodes: string[];
  };
  hardConstraints: StayOptiFreshRoleAwareConstraintV3[];
  softConstraints: StayOptiFreshRoleAwareSoftConstraintV3[];
  staySolutions: StayOptiFreshRoleAwareStaySolutionV3[];
  sanitizedReplayInput: {
    mediaType: "application/json";
    sourceDigest: string;
    byteLength: number;
    representation: {
      [key: string]: StayOptiFreshJsonV3;
    };
  };
  provenance: {
    captureId: string;
    sourceKind:
      | "synthetic-contract-fixture"
      | "sanitized-forward-capture";
    capturedAt: string;
    freshness: "fresh" | "stale" | "unknown";
    transformations: Array<{
      transformationId: string;
      version: string;
      description: string;
    }>;
    evidence: StayOptiFreshRoleAwareEvidenceV3[];
  };
  engineBindings: Array<{
    engineKey: "baseline-engine" | "candidate-engine";
    policyVersion: string;
    configHash: string;
  }>;
  expectedReplayPreconditions: {
    providerCallsRequired: false;
    networkRequired: false;
    samePolicyAndConfigRequired: true;
    sourceComplete: true;
  };
  assurances: {
    piiIncluded: false;
    secretsIncluded: false;
    providerPrivateIdentifiersIncluded: false;
    commercialSignalsIncluded: false;
    technicalDiagnosticOnly: true;
    humanVerdictIncluded: false;
    goldenAdmissionAllowed: false;
    tuningAllowed: false;
    scoringAllowed: false;
    rankingAllowed: false;
    promotionAllowed: false;
  };
}

export interface StayOptiFreshRoleAwareCapsuleV3
  extends StayOptiFreshRoleAwareCapsuleInputV3 {
  application: "private-offline-forward-only-replay";
  providerNeutral: true;
  forwardOnly: true;
  replayable: true;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitPublicEnabled: false;
  contentDigestAlgorithm:
    typeof STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3;
  fingerprintAlgorithm:
    typeof STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3;
  contentDigest: string;
  fingerprint: string;
}

export interface StayOptiFreshRoleAwareCapsuleValidationV3 {
  valid: boolean;
  issues: string[];
}

interface NodeHashV3 {
  update(value: string, encoding: "utf8"): NodeHashV3;
  digest(encoding: "hex"): string;
}

interface NodeCryptoV3 {
  createHash(algorithm: "sha256"): NodeHashV3;
}

interface NodeProcessWithBuiltinsV3 {
  getBuiltinModule?: (specifier: string) => unknown;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const OPAQUE_TOKEN = /^[a-z0-9][a-z0-9:._-]{7,127}$/i;
const CODE = /^[a-z0-9][a-z0-9:._-]{2,127}$/i;
const CURRENCY = /^[A-Z]{3}$/;
const COUNTRY = /^[A-Z]{2}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SHA256_BINDING = /^sha256:[0-9a-f]{64}$/;
const LEGACY_FINGERPRINT = /^case-[0-9a-f]{20}$/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SECRET_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~-]+|\bsk-[A-Za-z0-9_-]{12,}|\bghp_[A-Za-z0-9]{12,})/i;
const FORBIDDEN_KEY = /^(?:name|email|phone|address|guestName|firstName|lastName|credential|credentials|secret|password|apiKey|accessToken|bookingToken|prebookId|rateId|provider|providerId|providerName|providerSlug|providerPrivateId|commission|markup|affiliateRevenue|revenue|clickProbability|userEconomicValue|commercialOrder|commercialOrdering|originalProviderOrder|rawProviderPayload)$/i;

const TOP_LEVEL_INPUT_KEYS = [
  "assurances",
  "canonicalizationVersion",
  "captureVersion",
  "caseId",
  "createdAt",
  "engineBindings",
  "evaluationIntent",
  "expectedReplayPreconditions",
  "hardConstraints",
  "preferences",
  "provenance",
  "provenanceVersion",
  "sanitizedReplayInput",
  "schemaVersion",
  "searchContext",
  "softConstraints",
  "staySolutions",
] as const;

const TOP_LEVEL_CAPSULE_KEYS = [
  ...TOP_LEVEL_INPUT_KEYS,
  "application",
  "contentDigest",
  "contentDigestAlgorithm",
  "fingerprint",
  "fingerprintAlgorithm",
  "forwardOnly",
  "providerNeutral",
  "publicV2Changed",
  "publicV3Enabled",
  "replayable",
  "splitPublicEnabled",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: unknown,
  keys: readonly string[]
): value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    ISO_TIMESTAMP.test(value) &&
    !Number.isNaN(Date.parse(value));
}

function isDate(value: unknown): value is string {
  return typeof value === "string" &&
    ISO_DATE.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function dateDistance(first: string, second: string) {
  return (Date.parse(`${second}T00:00:00Z`) -
    Date.parse(`${first}T00:00:00Z`)) / (24 * 60 * 60 * 1_000);
}

function forbiddenPaths(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      forbiddenPaths(child, `${path}.${index}`)
    );
  }
  if (typeof value === "string") {
    return EMAIL_VALUE.test(value) ||
      SECRET_VALUE.test(value) ||
      LEGACY_FINGERPRINT.test(value)
      ? [path]
      : [];
  }
  if (!isPlainRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => [
    ...(FORBIDDEN_KEY.test(key) ? [`${path}.${key}`] : []),
    ...forbiddenPaths(child, `${path}.${key}`),
  ]);
}

function validJsonValue(value: unknown): value is StayOptiFreshJsonV3 {
  try {
    stableSerializeV3(value);
    return true;
  }
  catch {
    return false;
  }
}

function isKnowledgeState(value: unknown): value is StayOptiFreshKnowledgeStateV3 {
  return value === "known" || value === "estimated" || value === "unknown";
}

function hasRequiredContainers(value: unknown, capsule: boolean): boolean {
  const rootKeys = capsule ? TOP_LEVEL_CAPSULE_KEYS : TOP_LEVEL_INPUT_KEYS;
  if (!hasExactKeys(value, rootKeys)) {
    return false;
  }
  const root = value;
  if (
    !hasExactKeys(root.evaluationIntent, ["question", "role"]) ||
    !hasExactKeys(root.searchContext, [
      "budget",
      "checkIn",
      "checkOut",
      "destination",
      "maximumDistanceKm",
      "nights",
      "occupancy",
    ]) ||
    !hasExactKeys(root.searchContext.destination, [
      "countryCode",
      "label",
      "latitude",
      "longitude",
    ]) ||
    !hasExactKeys(root.searchContext.occupancy, ["adults", "childAges", "rooms"]) ||
    !hasExactKeys(root.searchContext.budget, ["currency", "total"]) ||
    !hasExactKeys(root.preferences, [
      "essentialFeatureCodes",
      "preferredFeatureCodes",
      "profile",
    ]) ||
    !hasExactKeys(root.sanitizedReplayInput, [
      "byteLength",
      "mediaType",
      "representation",
      "sourceDigest",
    ]) ||
    !isPlainRecord(root.sanitizedReplayInput.representation) ||
    !hasExactKeys(root.provenance, [
      "captureId",
      "capturedAt",
      "evidence",
      "freshness",
      "sourceKind",
      "transformations",
    ]) ||
    !hasExactKeys(root.expectedReplayPreconditions, [
      "networkRequired",
      "providerCallsRequired",
      "samePolicyAndConfigRequired",
      "sourceComplete",
    ]) ||
    !hasExactKeys(root.assurances, [
      "commercialSignalsIncluded",
      "goldenAdmissionAllowed",
      "humanVerdictIncluded",
      "piiIncluded",
      "promotionAllowed",
      "providerPrivateIdentifiersIncluded",
      "rankingAllowed",
      "scoringAllowed",
      "secretsIncluded",
      "technicalDiagnosticOnly",
      "tuningAllowed",
    ])
  ) {
    return false;
  }
  if (
    !Array.isArray(root.hardConstraints) ||
    !root.hardConstraints.every((item) => hasExactKeys(item, ["constraintId", "value"])) ||
    !Array.isArray(root.softConstraints) ||
    !root.softConstraints.every((item) => hasExactKeys(item, ["preferenceId", "value", "weight"])) ||
    !Array.isArray(root.engineBindings) ||
    !root.engineBindings.every((item) => hasExactKeys(item, ["configHash", "engineKey", "policyVersion"])) ||
    !Array.isArray(root.provenance.transformations) ||
    !root.provenance.transformations.every((item) => hasExactKeys(item, ["description", "transformationId", "version"])) ||
    !Array.isArray(root.provenance.evidence) ||
    !root.provenance.evidence.every((item) => hasExactKeys(item, ["evidenceId", "fieldCodes", "freshness", "observedAt", "reliability"])) ||
    !Array.isArray(root.staySolutions)
  ) {
    return false;
  }
  for (const solutionValue of root.staySolutions) {
    if (!hasExactKeys(solutionValue, [
      "comfort",
      "currency",
      "dataStatus",
      "evidenceRefs",
      "location",
      "quality",
      "reviews",
      "segments",
      "solutionId",
      "totalCost",
    ]) ||
      !hasExactKeys(solutionValue.quality, ["starCategory"]) ||
      !hasExactKeys(solutionValue.reviews, ["count", "scale", "score"]) ||
      !hasExactKeys(solutionValue.location, ["distanceKm"]) ||
      !hasExactKeys(solutionValue.comfort, ["featureCodes"]) ||
      !hasExactKeys(solutionValue.dataStatus, [
        "availability",
        "cancellation",
        "comfort",
        "location",
        "mandatoryCosts",
        "payment",
        "price",
        "quality",
        "reviews",
        "room",
        "taxes",
        "treatment",
      ]) ||
      !Array.isArray(solutionValue.segments)) {
      return false;
    }
    for (const segmentValue of solutionValue.segments) {
      if (!hasExactKeys(segmentValue, [
        "accommodationToken",
        "checkIn",
        "checkOut",
        "nights",
        "offer",
        "segmentId",
      ]) ||
        !hasExactKeys(segmentValue.offer, [
          "availability",
          "cancellation",
          "canonicalOfferRef",
          "cost",
          "payment",
          "room",
          "treatment",
        ]) ||
        !hasExactKeys(segmentValue.offer.cost, ["currency", "mandatoryCosts", "taxes", "total"]) ||
        !hasExactKeys(segmentValue.offer.cost.taxes, ["amount", "status"]) ||
        !hasExactKeys(segmentValue.offer.cost.mandatoryCosts, ["amount", "status"]) ||
        !hasExactKeys(segmentValue.offer.room, ["adults", "childAges", "rooms", "typeCode"]) ||
        !hasExactKeys(segmentValue.offer.treatment, ["boardCode", "included"]) ||
        !hasExactKeys(segmentValue.offer.cancellation, [
          "currency",
          "freeCancellationUntil",
          "penaltyAmount",
          "refundability",
        ]) ||
        !hasExactKeys(segmentValue.offer.payment, ["status", "timing"]) ||
        !hasExactKeys(segmentValue.offer.availability, ["checkedAt", "state"])) {
        return false;
      }
    }
  }
  return true;
}

function validateCostCompleteness(
  value: { status: "complete" | "partial" | "unknown"; amount: number | null }
) {
  return ["complete", "partial", "unknown"].includes(value.status) &&
    (value.amount === null || (Number.isFinite(value.amount) && value.amount >= 0)) &&
    (value.status !== "complete" || value.amount !== null);
}

function validateInputValue(value: unknown): string[] {
  const issues: string[] = [];
  if (!hasRequiredContainers(value, false)) {
    return ["capsule-structure-invalid"];
  }
  const input = value as unknown as StayOptiFreshRoleAwareCapsuleInputV3;
  const forbidden = forbiddenPaths(input);
  if (forbidden.length > 0) {
    issues.push(
      forbidden.some((path) => LEGACY_FINGERPRINT.test(String(path)))
        ? "legacy-input-prohibited"
        : "sensitive-or-commercial-field-prohibited"
    );
  }
  if (LEGACY_FINGERPRINT.test(input.caseId)) {
    issues.push("legacy-input-prohibited");
  }
  if (
    input.schemaVersion !== STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_SCHEMA_VERSION_V3 ||
    input.canonicalizationVersion !== STAYOPTI_FRESH_ROLE_AWARE_CANONICALIZATION_VERSION_V3 ||
    !OPAQUE_TOKEN.test(input.caseId) ||
    !hasText(input.captureVersion) ||
    !hasText(input.provenanceVersion) ||
    !isTimestamp(input.createdAt) ||
    !STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3.includes(input.evaluationIntent.role) ||
    input.evaluationIntent.question !== STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3[input.evaluationIntent.role]
  ) {
    issues.push("capsule-header-invalid");
  }
  const context = input.searchContext;
  if (
    !hasText(context.destination.label) ||
    !COUNTRY.test(context.destination.countryCode) ||
    (context.destination.latitude !== null && (!Number.isFinite(context.destination.latitude) || context.destination.latitude < -90 || context.destination.latitude > 90)) ||
    (context.destination.longitude !== null && (!Number.isFinite(context.destination.longitude) || context.destination.longitude < -180 || context.destination.longitude > 180)) ||
    !isDate(context.checkIn) ||
    !isDate(context.checkOut) ||
    !Number.isInteger(context.nights) ||
    context.nights <= 0 ||
    (isDate(context.checkIn) && isDate(context.checkOut) && dateDistance(context.checkIn, context.checkOut) !== context.nights) ||
    !Number.isInteger(context.occupancy.adults) ||
    context.occupancy.adults <= 0 ||
    !Array.isArray(context.occupancy.childAges) ||
    context.occupancy.childAges.some((age) => !Number.isInteger(age) || age < 0 || age > 17) ||
    !Number.isInteger(context.occupancy.rooms) ||
    context.occupancy.rooms <= 0 ||
    !Number.isFinite(context.budget.total) ||
    context.budget.total < 0 ||
    !CURRENCY.test(context.budget.currency) ||
    !Number.isFinite(context.maximumDistanceKm) ||
    context.maximumDistanceKm <= 0
  ) {
    issues.push("search-context-invalid");
  }
  if (
    !["maximum-comfort", "comfort", "balanced", "savings", "maximum-savings"].includes(input.preferences.profile) ||
    input.preferences.essentialFeatureCodes.some((code) => !CODE.test(code)) ||
    input.preferences.preferredFeatureCodes.some((code) => !CODE.test(code))
  ) {
    issues.push("preferences-invalid");
  }
  const constraints = [...input.hardConstraints, ...input.softConstraints];
  if (
    input.hardConstraints.some((item) => !OPAQUE_TOKEN.test(item.constraintId) || !validJsonValue(item.value)) ||
    input.softConstraints.some((item) => !OPAQUE_TOKEN.test(item.preferenceId) || !Number.isInteger(item.weight) || item.weight < 1 || item.weight > 5 || !validJsonValue(item.value)) ||
    new Set(constraints.map((item) => "constraintId" in item ? item.constraintId : item.preferenceId)).size !== constraints.length
  ) {
    issues.push("constraints-invalid");
  }
  if (input.staySolutions.length < 2 || new Set(input.staySolutions.map((item) => item.solutionId)).size !== input.staySolutions.length) {
    issues.push("stay-solutions-invalid");
  }
  const evidenceIds = new Set(input.provenance.evidence.map((item) => item.evidenceId));
  for (const solution of input.staySolutions) {
    const statusValues = Object.values(solution.dataStatus);
    const segmentIds = solution.segments.map((segment) => segment.segmentId);
    const segmentTotal = solution.segments.reduce((sum, segment) => sum + segment.offer.cost.total, 0);
    if (
      !OPAQUE_TOKEN.test(solution.solutionId) ||
      solution.segments.length === 0 ||
      new Set(segmentIds).size !== segmentIds.length ||
      !Number.isFinite(solution.totalCost) ||
      solution.totalCost < 0 ||
      Math.abs(segmentTotal - solution.totalCost) > 0.000001 ||
      !CURRENCY.test(solution.currency) ||
      statusValues.some((status) => !isKnowledgeState(status)) ||
      solution.evidenceRefs.length === 0 ||
      solution.evidenceRefs.some((reference) => !evidenceIds.has(reference)) ||
      solution.comfort.featureCodes.some((code) => !CODE.test(code)) ||
      (solution.quality.starCategory !== null && (!Number.isFinite(solution.quality.starCategory) || solution.quality.starCategory < 0 || solution.quality.starCategory > 7)) ||
      (solution.reviews.score !== null && (!Number.isFinite(solution.reviews.score) || solution.reviews.score < 0)) ||
      (solution.reviews.scale !== null && (!Number.isFinite(solution.reviews.scale) || solution.reviews.scale <= 0)) ||
      (solution.reviews.score !== null && solution.reviews.scale !== null && solution.reviews.score > solution.reviews.scale) ||
      (solution.reviews.count !== null && (!Number.isInteger(solution.reviews.count) || solution.reviews.count < 0)) ||
      (solution.location.distanceKm !== null && (!Number.isFinite(solution.location.distanceKm) || solution.location.distanceKm < 0))
    ) {
      issues.push(`stay-solution-invalid:${solution.solutionId}`);
    }
    for (const segment of solution.segments) {
      const offer = segment.offer;
      if (
        !OPAQUE_TOKEN.test(segment.segmentId) ||
        !OPAQUE_TOKEN.test(segment.accommodationToken) ||
        !isDate(segment.checkIn) ||
        !isDate(segment.checkOut) ||
        !Number.isInteger(segment.nights) ||
        segment.nights <= 0 ||
        (isDate(segment.checkIn) && isDate(segment.checkOut) && dateDistance(segment.checkIn, segment.checkOut) !== segment.nights) ||
        !OPAQUE_TOKEN.test(offer.canonicalOfferRef) ||
        !Number.isFinite(offer.cost.total) ||
        offer.cost.total < 0 ||
        !CURRENCY.test(offer.cost.currency) ||
        offer.cost.currency !== solution.currency ||
        !validateCostCompleteness(offer.cost.taxes) ||
        !validateCostCompleteness(offer.cost.mandatoryCosts) ||
        !CODE.test(offer.room.typeCode) ||
        !Number.isInteger(offer.room.adults) ||
        offer.room.adults <= 0 ||
        offer.room.childAges.some((age) => !Number.isInteger(age) || age < 0 || age > 17) ||
        !Number.isInteger(offer.room.rooms) ||
        offer.room.rooms <= 0 ||
        !CODE.test(offer.treatment.boardCode) ||
        typeof offer.treatment.included !== "boolean" ||
        !["refundable", "non-refundable", "unknown"].includes(offer.cancellation.refundability) ||
        (offer.cancellation.freeCancellationUntil !== null && !isTimestamp(offer.cancellation.freeCancellationUntil)) ||
        (offer.cancellation.penaltyAmount !== null && (!Number.isFinite(offer.cancellation.penaltyAmount) || offer.cancellation.penaltyAmount < 0)) ||
        ((offer.cancellation.penaltyAmount === null) !== (offer.cancellation.currency === null)) ||
        (offer.cancellation.currency !== null && !CURRENCY.test(offer.cancellation.currency)) ||
        !["pay-now", "pay-later", "mixed", "unknown"].includes(offer.payment.timing) ||
        !["complete", "partial", "unknown"].includes(offer.payment.status) ||
        !["available", "requires-recheck", "unknown"].includes(offer.availability.state) ||
        !isTimestamp(offer.availability.checkedAt)
      ) {
        issues.push(`stay-segment-invalid:${segment.segmentId}`);
      }
    }
  }
  if (
    input.sanitizedReplayInput.mediaType !== "application/json" ||
    !SHA256.test(input.sanitizedReplayInput.sourceDigest) ||
    !Number.isInteger(input.sanitizedReplayInput.byteLength) ||
    input.sanitizedReplayInput.byteLength <= 0 ||
    !validJsonValue(input.sanitizedReplayInput.representation)
  ) {
    issues.push("replay-source-invalid");
  }
  if (
    !OPAQUE_TOKEN.test(input.provenance.captureId) ||
    !["synthetic-contract-fixture", "sanitized-forward-capture"].includes(input.provenance.sourceKind) ||
    !isTimestamp(input.provenance.capturedAt) ||
    !["fresh", "stale", "unknown"].includes(input.provenance.freshness) ||
    input.provenance.transformations.length === 0 ||
    input.provenance.evidence.length === 0 ||
    new Set(input.provenance.transformations.map((item) => item.transformationId)).size !== input.provenance.transformations.length ||
    new Set(input.provenance.evidence.map((item) => item.evidenceId)).size !== input.provenance.evidence.length ||
    input.provenance.transformations.some((item) => !OPAQUE_TOKEN.test(item.transformationId) || !hasText(item.version) || !hasText(item.description)) ||
    input.provenance.evidence.some((item) => !OPAQUE_TOKEN.test(item.evidenceId) || item.fieldCodes.length === 0 || item.fieldCodes.some((code) => !CODE.test(code)) || !isTimestamp(item.observedAt) || !["fresh", "stale", "unknown"].includes(item.freshness) || !["high", "medium", "low", "unknown"].includes(item.reliability))
  ) {
    issues.push("provenance-invalid");
  }
  if (
    input.engineBindings.length !== 2 ||
    new Set(input.engineBindings.map((item) => item.engineKey)).size !== 2 ||
    input.engineBindings.some((item) => !["baseline-engine", "candidate-engine"].includes(item.engineKey) || !hasText(item.policyVersion) || !SHA256.test(item.configHash))
  ) {
    issues.push("engine-binding-invalid");
  }
  if (
    input.expectedReplayPreconditions.providerCallsRequired !== false ||
    input.expectedReplayPreconditions.networkRequired !== false ||
    input.expectedReplayPreconditions.samePolicyAndConfigRequired !== true ||
    input.expectedReplayPreconditions.sourceComplete !== true ||
    input.assurances.piiIncluded !== false ||
    input.assurances.secretsIncluded !== false ||
    input.assurances.providerPrivateIdentifiersIncluded !== false ||
    input.assurances.commercialSignalsIncluded !== false ||
    input.assurances.technicalDiagnosticOnly !== true ||
    input.assurances.humanVerdictIncluded !== false ||
    input.assurances.goldenAdmissionAllowed !== false ||
    input.assurances.tuningAllowed !== false ||
    input.assurances.scoringAllowed !== false ||
    input.assurances.rankingAllowed !== false ||
    input.assurances.promotionAllowed !== false
  ) {
    issues.push("offline-boundary-invalid");
  }
  return [...new Set(issues)].sort();
}

function canonicalJsonClone<T>(value: T): T {
  return JSON.parse(stableSerializeV3(value)) as T;
}

function canonicalInput(
  input: StayOptiFreshRoleAwareCapsuleInputV3
): StayOptiFreshRoleAwareCapsuleInputV3 {
  const canonical = canonicalJsonClone(input);
  canonical.searchContext.occupancy.childAges.sort((left, right) => left - right);
  canonical.preferences.essentialFeatureCodes = [...new Set(canonical.preferences.essentialFeatureCodes)].sort();
  canonical.preferences.preferredFeatureCodes = [...new Set(canonical.preferences.preferredFeatureCodes)].sort();
  canonical.hardConstraints.sort((left, right) => left.constraintId.localeCompare(right.constraintId));
  canonical.softConstraints.sort((left, right) => left.preferenceId.localeCompare(right.preferenceId));
  canonical.engineBindings.sort((left, right) => left.engineKey.localeCompare(right.engineKey));
  canonical.provenance.transformations.sort((left, right) => left.transformationId.localeCompare(right.transformationId));
  canonical.provenance.evidence.sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  for (const evidence of canonical.provenance.evidence) {
    evidence.fieldCodes = [...new Set(evidence.fieldCodes)].sort();
  }
  canonical.staySolutions.sort((left, right) => left.solutionId.localeCompare(right.solutionId));
  for (const solution of canonical.staySolutions) {
    solution.segments.sort((left, right) => left.segmentId.localeCompare(right.segmentId));
    solution.comfort.featureCodes = [...new Set(solution.comfort.featureCodes)].sort();
    solution.evidenceRefs = [...new Set(solution.evidenceRefs)].sort();
    for (const segment of solution.segments) {
      segment.offer.room.childAges.sort((left, right) => left - right);
    }
  }
  return canonical;
}

function projectCapsuleToInput(
  capsule: StayOptiFreshRoleAwareCapsuleV3
): StayOptiFreshRoleAwareCapsuleInputV3 {
  return {
    assurances: capsule.assurances,
    canonicalizationVersion: capsule.canonicalizationVersion,
    captureVersion: capsule.captureVersion,
    caseId: capsule.caseId,
    createdAt: capsule.createdAt,
    engineBindings: capsule.engineBindings,
    evaluationIntent: capsule.evaluationIntent,
    expectedReplayPreconditions: capsule.expectedReplayPreconditions,
    hardConstraints: capsule.hardConstraints,
    preferences: capsule.preferences,
    provenance: capsule.provenance,
    provenanceVersion: capsule.provenanceVersion,
    sanitizedReplayInput: capsule.sanitizedReplayInput,
    schemaVersion: capsule.schemaVersion,
    searchContext: capsule.searchContext,
    softConstraints: capsule.softConstraints,
    staySolutions: capsule.staySolutions,
  };
}

function sha256Text(value: string) {
  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: NodeProcessWithBuiltinsV3;
    }
  ).process;
  const cryptoModule = runtimeProcess?.getBuiltinModule?.("node:crypto") as
    NodeCryptoV3 | undefined;
  if (typeof cryptoModule?.createHash !== "function") {
    throw new Error("Fresh role-aware SHA-256 requires the Node built-in crypto module.");
  }
  return cryptoModule.createHash("sha256").update(value, "utf8").digest("hex");
}

export function createFreshRoleAwareSha256V3(
  value: unknown,
  namespace: string
) {
  if (!hasText(namespace)) {
    throw new Error("Fresh role-aware SHA-256 requires a namespace.");
  }
  return `sha256:${sha256Text(`${namespace}\n${stableSerializeV3(value)}`)}`;
}

function capsuleBody(input: StayOptiFreshRoleAwareCapsuleInputV3) {
  return {
    application: "private-offline-forward-only-replay" as const,
    providerNeutral: true as const,
    forwardOnly: true as const,
    replayable: true as const,
    publicV2Changed: false as const,
    publicV3Enabled: false as const,
    splitPublicEnabled: false as const,
    contentDigestAlgorithm: STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3,
    fingerprintAlgorithm: STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3,
    ...canonicalInput(input),
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function createFreshReplayableRoleAwareCapsuleV3(
  value: unknown
): StayOptiFreshRoleAwareCapsuleV3 {
  const issues = validateInputValue(value);
  if (issues.length > 0) {
    throw new Error(`Fresh role-aware source capsule invalid: ${issues.join(", ")}.`);
  }
  const input = canonicalInput(value as StayOptiFreshRoleAwareCapsuleInputV3);
  const body = capsuleBody(input);
  const capsule: StayOptiFreshRoleAwareCapsuleV3 = {
    ...body,
    contentDigest: createFreshRoleAwareSha256V3(body, "stayopti-v3-fresh-role-aware-content"),
    fingerprint: createFreshRoleAwareSha256V3(body, "stayopti-v3-fresh-role-aware-fingerprint"),
  };
  return deepFreeze(capsule);
}

export function validateFreshReplayableRoleAwareCapsuleV3(
  value: unknown
): StayOptiFreshRoleAwareCapsuleValidationV3 {
  if (!hasRequiredContainers(value, true)) {
    return { valid: false, issues: ["capsule-structure-invalid"] };
  }
  const capsule = value as unknown as StayOptiFreshRoleAwareCapsuleV3;
  const input = canonicalInput(projectCapsuleToInput(capsule));
  const issues = validateInputValue(input);
  const body = capsuleBody(input);
  if (
    capsule.application !== "private-offline-forward-only-replay" ||
    capsule.providerNeutral !== true ||
    capsule.forwardOnly !== true ||
    capsule.replayable !== true ||
    capsule.publicV2Changed !== false ||
    capsule.publicV3Enabled !== false ||
    capsule.splitPublicEnabled !== false ||
    capsule.contentDigestAlgorithm !== STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3 ||
    capsule.fingerprintAlgorithm !== STAYOPTI_FRESH_ROLE_AWARE_DIGEST_ALGORITHM_V3
  ) {
    issues.push("capsule-boundary-invalid");
  }
  if (
    !SHA256_BINDING.test(capsule.contentDigest) ||
    !SHA256_BINDING.test(capsule.fingerprint) ||
    capsule.contentDigest !== createFreshRoleAwareSha256V3(body, "stayopti-v3-fresh-role-aware-content") ||
    capsule.fingerprint !== createFreshRoleAwareSha256V3(body, "stayopti-v3-fresh-role-aware-fingerprint")
  ) {
    issues.push("capsule-content-binding-invalid");
  }
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

export function verifyFreshReplayableRoleAwareCapsuleReplayV3(
  input: unknown,
  expected: unknown
) {
  const expectedValidation = validateFreshReplayableRoleAwareCapsuleV3(expected);
  if (!expectedValidation.valid) {
    return false;
  }
  return stableSerializeV3(createFreshReplayableRoleAwareCapsuleV3(input)) ===
    stableSerializeV3(expected);
}

export const STAYOPTI_FRESH_ROLE_AWARE_CAPSULE_AUDIT_V3 = Object.freeze({
  application: "private-offline-forward-only-replay" as const,
  providerNeutral: true as const,
  usesFullSha256ContentBinding: true as const,
  fnvContentBindingUsed: false as const,
  legacyCasesAccepted: false as const,
  realCorpusCreated: false as const,
  humanVerdictsCreated: false as const,
  goldenAdmissionAllowed: false as const,
  tuningAllowed: false as const,
  scoringAllowed: false as const,
  rankingAllowed: false as const,
  promotionAllowed: false as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitPublicEnabled: false as const,
});
