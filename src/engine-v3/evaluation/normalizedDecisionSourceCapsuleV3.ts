import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import {
  STAYOPTI_ROLE_POLICY_PROFILES_V3,
  type StayOptiRolePolicyProfileV3,
} from "../policy/personalUtilityRolePolicyV3";

export const STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_VERSION_V3 =
  "3.0.0-normalized-decision-source-capsule.1" as const;

export const STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_SCHEMA_VERSION_V3 =
  "3.0.0-normalized-decision-source-capsule-schema.1" as const;

export type StayOptiNormalizedEvidenceStateV3 =
  | "available"
  | "partial"
  | "missing";

export type StayOptiNormalizedEvidenceReliabilityV3 =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type StayOptiNormalizedEvidenceFreshnessV3 =
  | "fresh"
  | "stale"
  | "unknown";

export interface StayOptiNormalizedDecisionSearchContextV3 {
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
  profile: StayOptiRolePolicyProfileV3;
}

export interface StayOptiNormalizedDecisionEvidenceV3 {
  state: StayOptiNormalizedEvidenceStateV3;
  reliability: StayOptiNormalizedEvidenceReliabilityV3;
  freshness: StayOptiNormalizedEvidenceFreshnessV3;
  observedAt: string;
  validUntil: string | null;
  absenceReason: string | null;
}

export interface StayOptiNormalizedDecisionAlternativeV3 {
  alternativeId: string;
  totalPrice: number;
  currency: string;
  mandatoryCostStatus: "complete" | "partial" | "unknown";
  mandatoryCostAbsenceReason: string | null;
  cancellation: {
    refundability: "refundable" | "non-refundable" | "unknown";
    freeCancellationUntil: string | null;
    penaltyAmount: number | null;
    penaltyCurrency: string | null;
    evidenceState: StayOptiNormalizedEvidenceStateV3;
    absenceReason: string | null;
  };
  quality: {
    starCategory: number | null;
    reviewScore: number | null;
    reviewScale: number | null;
    reviewCount: number | null;
  };
  distanceKm: number | null;
  featureCodes: string[];
  availabilityState: "available" | "requires-recheck" | "unavailable" | "unknown";
  recheckState: "verified" | "not-rechecked" | "changed" | "failed";
  evidence: StayOptiNormalizedDecisionEvidenceV3;
}

export interface StayOptiNormalizedDecisionSourceVersionsV3 {
  adapterVersion: string;
  normalizerVersion: string;
  policyVersion: string;
}

export interface StayOptiNormalizedDecisionTransformationV3 {
  transformationId: string;
  version: string;
  description: string;
}

export interface StayOptiNormalizedDecisionSourceCapsuleInputV3 {
  capsuleId: string;
  technicalDiagnosticOnly: boolean;
  context: StayOptiNormalizedDecisionSearchContextV3;
  alternatives: StayOptiNormalizedDecisionAlternativeV3[];
  versions: StayOptiNormalizedDecisionSourceVersionsV3;
  collectedAt: string;
  sourceArtifact: {
    sha256: string;
    byteLength: number;
    mediaType: string;
  };
  provenanceManifest: {
    manifestId: string;
    sourceArtifactSha256: string;
    transformations: StayOptiNormalizedDecisionTransformationV3[];
  };
}

export interface StayOptiNormalizedDecisionSourceCapsuleV3
  extends StayOptiNormalizedDecisionSourceCapsuleInputV3 {
  schemaVersion:
    typeof STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_SCHEMA_VERSION_V3;
  capsuleVersion:
    typeof STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_VERSION_V3;
  application: "offline-forward-only-source-capture";
  statisticalUseAllowed: false;
  rawProviderPayloadIncluded: false;
  providerCallsRequiredForReplay: false;
  commercialSignalsUsed: false;
  publicProductChanged: false;
  normalizedPayloadFingerprint: string;
  provenanceFingerprint: string;
  fingerprint: string;
}

export interface StayOptiNormalizedDecisionSourceCapsuleValidationV3 {
  valid: boolean;
  violations: string[];
}

const CURRENCY = /^[A-Z]{3}$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const OPAQUE_ID = /^[a-z0-9][a-z0-9:_-]{7,127}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FEATURE_CODE = /^[a-z0-9][a-z0-9:._-]{2,127}$/i;

const FORBIDDEN_KEY = /^(?:name|email|phone|address|guestName|firstName|lastName|credential|credentials|secret|password|apiKey|accessToken|bookingToken|prebookId|rateId|provider|providerId|providerName|providerSlug|commission|markup|affiliateRevenue|clickProbability|userEconomicValue|rawProviderPayload)$/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SECRET_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~-]+|\bsk-[A-Za-z0-9_-]{12,})/i;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function daysBetween(first: string, second: string): number {
  return (Date.parse(`${second}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) /
    (24 * 60 * 60 * 1_000);
}

function forbiddenPaths(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbiddenPaths(item, `${path}.${index}`));
  }

  if (typeof value === "string") {
    return EMAIL_VALUE.test(value) || SECRET_VALUE.test(value) ? [path] : [];
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(FORBIDDEN_KEY.test(key) ? [`${path}.${key}`] : []),
    ...forbiddenPaths(child, `${path}.${key}`),
  ]);
}

function canonicalEvidence(
  evidence: StayOptiNormalizedDecisionEvidenceV3
): StayOptiNormalizedDecisionEvidenceV3 {
  return { ...evidence };
}

function canonicalAlternative(
  alternative: StayOptiNormalizedDecisionAlternativeV3
): StayOptiNormalizedDecisionAlternativeV3 {
  return {
    ...alternative,
    cancellation: { ...alternative.cancellation },
    quality: { ...alternative.quality },
    featureCodes: [...new Set(alternative.featureCodes)].sort(),
    evidence: canonicalEvidence(alternative.evidence),
  };
}

function canonicalInput(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3
): StayOptiNormalizedDecisionSourceCapsuleInputV3 {
  return {
    capsuleId: input.capsuleId,
    technicalDiagnosticOnly: input.technicalDiagnosticOnly,
    context: {
      destination: { ...input.context.destination },
      checkIn: input.context.checkIn,
      checkOut: input.context.checkOut,
      nights: input.context.nights,
      occupancy: {
        adults: input.context.occupancy.adults,
        childAges: [...input.context.occupancy.childAges].sort((left, right) => left - right),
        rooms: input.context.occupancy.rooms,
      },
      budget: { ...input.context.budget },
      maximumDistanceKm: input.context.maximumDistanceKm,
      profile: input.context.profile,
    },
    alternatives: input.alternatives
      .map(canonicalAlternative)
      .sort((left, right) => left.alternativeId.localeCompare(right.alternativeId)),
    versions: { ...input.versions },
    collectedAt: input.collectedAt,
    sourceArtifact: { ...input.sourceArtifact },
    provenanceManifest: {
      manifestId: input.provenanceManifest.manifestId,
      sourceArtifactSha256: input.provenanceManifest.sourceArtifactSha256,
      transformations: input.provenanceManifest.transformations.map((item) => ({ ...item })),
    },
  };
}

function normalizedPayloadFingerprint(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3
): string {
  const canonical = canonicalInput(input);
  return createStableHashV3(
    {
      capsuleId: canonical.capsuleId,
      context: canonical.context,
      alternatives: canonical.alternatives,
      versions: canonical.versions,
      collectedAt: canonical.collectedAt,
      sourceArtifact: canonical.sourceArtifact,
    },
    "stayopti-v3-normalized-decision-source-payload"
  );
}

function provenanceFingerprint(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3,
  payloadFingerprint: string
): string {
  return createStableHashV3(
    {
      ...canonicalInput(input).provenanceManifest,
      normalizedPayloadFingerprint: payloadFingerprint,
    },
    "stayopti-v3-normalized-decision-source-provenance"
  );
}

function capsuleFingerprint(
  capsule: Omit<StayOptiNormalizedDecisionSourceCapsuleV3, "fingerprint">
): string {
  return createStableHashV3(capsule, "stayopti-v3-normalized-decision-source-capsule");
}

function validateEvidence(
  evidence: StayOptiNormalizedDecisionEvidenceV3,
  alternativeId: string,
  violations: string[]
) {
  if (
    !["available", "partial", "missing"].includes(evidence.state) ||
    !["high", "medium", "low", "unknown"].includes(evidence.reliability) ||
    !["fresh", "stale", "unknown"].includes(evidence.freshness) ||
    !isIsoTimestamp(evidence.observedAt) ||
    (evidence.validUntil !== null && !isIsoTimestamp(evidence.validUntil)) ||
    (evidence.state === "missing" && !hasText(evidence.absenceReason)) ||
    (evidence.state !== "missing" && evidence.absenceReason !== null && !hasText(evidence.absenceReason))
  ) {
    violations.push(`evidence-invalid:${alternativeId}`);
  }
}

function validateAlternative(
  alternative: StayOptiNormalizedDecisionAlternativeV3,
  violations: string[]
) {
  const cancellation = alternative.cancellation;
  const quality = alternative.quality;
  if (
    !OPAQUE_ID.test(alternative.alternativeId) ||
    !Number.isFinite(alternative.totalPrice) ||
    alternative.totalPrice < 0 ||
    !CURRENCY.test(alternative.currency) ||
    !["complete", "partial", "unknown"].includes(alternative.mandatoryCostStatus) ||
    (alternative.mandatoryCostStatus !== "complete" && !hasText(alternative.mandatoryCostAbsenceReason)) ||
    (alternative.mandatoryCostStatus === "complete" && alternative.mandatoryCostAbsenceReason !== null) ||
    !["refundable", "non-refundable", "unknown"].includes(cancellation.refundability) ||
    (cancellation.freeCancellationUntil !== null && !isIsoTimestamp(cancellation.freeCancellationUntil)) ||
    (cancellation.penaltyAmount !== null && (!Number.isFinite(cancellation.penaltyAmount) || cancellation.penaltyAmount < 0)) ||
    (cancellation.penaltyCurrency !== null && !CURRENCY.test(cancellation.penaltyCurrency)) ||
    !["available", "partial", "missing"].includes(cancellation.evidenceState) ||
    (cancellation.evidenceState === "missing" && !hasText(cancellation.absenceReason)) ||
    (quality.starCategory !== null && (!Number.isFinite(quality.starCategory) || quality.starCategory < 0 || quality.starCategory > 7)) ||
    (quality.reviewScore !== null && (!Number.isFinite(quality.reviewScore) || quality.reviewScore < 0)) ||
    (quality.reviewScale !== null && (!Number.isFinite(quality.reviewScale) || quality.reviewScale <= 0)) ||
    (quality.reviewScore !== null && quality.reviewScale !== null && quality.reviewScore > quality.reviewScale) ||
    (quality.reviewCount !== null && (!Number.isInteger(quality.reviewCount) || quality.reviewCount < 0)) ||
    (alternative.distanceKm !== null && (!Number.isFinite(alternative.distanceKm) || alternative.distanceKm < 0)) ||
    alternative.featureCodes.some((value) => !FEATURE_CODE.test(value)) ||
    new Set(alternative.featureCodes).size !== alternative.featureCodes.length ||
    !["available", "requires-recheck", "unavailable", "unknown"].includes(alternative.availabilityState) ||
    !["verified", "not-rechecked", "changed", "failed"].includes(alternative.recheckState)
  ) {
    violations.push(`alternative-invalid:${alternative.alternativeId}`);
  }
  validateEvidence(alternative.evidence, alternative.alternativeId, violations);
}

function validateInput(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3
): string[] {
  const violations: string[] = [];
  const context = input.context;
  if (
    !OPAQUE_ID.test(input.capsuleId) ||
    typeof input.technicalDiagnosticOnly !== "boolean" ||
    !hasText(context.destination.label) ||
    !COUNTRY_CODE.test(context.destination.countryCode) ||
    (context.destination.latitude !== null && (!Number.isFinite(context.destination.latitude) || context.destination.latitude < -90 || context.destination.latitude > 90)) ||
    (context.destination.longitude !== null && (!Number.isFinite(context.destination.longitude) || context.destination.longitude < -180 || context.destination.longitude > 180)) ||
    !isIsoDate(context.checkIn) ||
    !isIsoDate(context.checkOut) ||
    !Number.isInteger(context.nights) ||
    context.nights <= 0 ||
    (isIsoDate(context.checkIn) && isIsoDate(context.checkOut) && daysBetween(context.checkIn, context.checkOut) !== context.nights) ||
    !Number.isInteger(context.occupancy.adults) ||
    context.occupancy.adults <= 0 ||
    !Number.isInteger(context.occupancy.rooms) ||
    context.occupancy.rooms <= 0 ||
    context.occupancy.childAges.some((age) => !Number.isInteger(age) || age < 0 || age > 17) ||
    !Number.isFinite(context.budget.total) ||
    context.budget.total < 0 ||
    !CURRENCY.test(context.budget.currency) ||
    !Number.isFinite(context.maximumDistanceKm) ||
    context.maximumDistanceKm <= 0 ||
    !STAYOPTI_ROLE_POLICY_PROFILES_V3.includes(context.profile)
  ) {
    violations.push("context-invalid");
  }

  if (input.alternatives.length < 2) {
    violations.push("alternatives-insufficient");
  }
  const alternativeIds = input.alternatives.map(({ alternativeId }) => alternativeId);
  if (new Set(alternativeIds).size !== alternativeIds.length) {
    violations.push("alternative-duplicate");
  }
  input.alternatives.forEach((alternative) => validateAlternative(alternative, violations));

  if (
    !hasText(input.versions.adapterVersion) ||
    !hasText(input.versions.normalizerVersion) ||
    !hasText(input.versions.policyVersion) ||
    !isIsoTimestamp(input.collectedAt) ||
    !SHA256.test(input.sourceArtifact.sha256) ||
    !Number.isInteger(input.sourceArtifact.byteLength) ||
    input.sourceArtifact.byteLength <= 0 ||
    !hasText(input.sourceArtifact.mediaType)
  ) {
    violations.push("source-contract-invalid");
  }

  const transformations = input.provenanceManifest.transformations;
  if (
    !OPAQUE_ID.test(input.provenanceManifest.manifestId) ||
    input.provenanceManifest.sourceArtifactSha256 !== input.sourceArtifact.sha256 ||
    transformations.length === 0 ||
    new Set(transformations.map(({ transformationId }) => transformationId)).size !== transformations.length ||
    transformations.some(({ transformationId, version, description }) =>
      !OPAQUE_ID.test(transformationId) || !hasText(version) || !hasText(description)
    )
  ) {
    violations.push("provenance-invalid");
  }

  if (forbiddenPaths(input).length > 0) {
    violations.push("forbidden-sensitive-or-commercial-field");
  }

  return [...new Set(violations)].sort();
}

export function createNormalizedDecisionSourcePayloadFingerprintV3(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3
): string {
  return normalizedPayloadFingerprint(input);
}

export function createNormalizedDecisionSourceCapsuleV3(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3
): StayOptiNormalizedDecisionSourceCapsuleV3 {
  const inputViolations = validateInput(input);
  if (inputViolations.length > 0) {
    throw new Error(`Normalized Decision Source Capsule V3 invalid: ${inputViolations.join(", ")}`);
  }

  const canonical = canonicalInput(input);
  const payloadFingerprint = normalizedPayloadFingerprint(canonical);
  const provenance = provenanceFingerprint(canonical, payloadFingerprint);
  const payload: Omit<StayOptiNormalizedDecisionSourceCapsuleV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_SCHEMA_VERSION_V3,
    capsuleVersion: STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_VERSION_V3,
    application: "offline-forward-only-source-capture",
    statisticalUseAllowed: false,
    rawProviderPayloadIncluded: false,
    providerCallsRequiredForReplay: false,
    commercialSignalsUsed: false,
    publicProductChanged: false,
    ...canonical,
    normalizedPayloadFingerprint: payloadFingerprint,
    provenanceFingerprint: provenance,
  };
  const capsule = { ...payload, fingerprint: capsuleFingerprint(payload) };
  const validation = validateNormalizedDecisionSourceCapsuleV3(capsule);
  if (!validation.valid) {
    throw new Error(`Generated Normalized Decision Source Capsule V3 invalid: ${validation.violations.join(", ")}`);
  }
  return capsule;
}

export function validateNormalizedDecisionSourceCapsuleV3(
  capsule: StayOptiNormalizedDecisionSourceCapsuleV3
): StayOptiNormalizedDecisionSourceCapsuleValidationV3 {
  const violations = validateInput(capsule);
  if (
    capsule.schemaVersion !== STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_SCHEMA_VERSION_V3 ||
    capsule.capsuleVersion !== STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_VERSION_V3 ||
    capsule.application !== "offline-forward-only-source-capture" ||
    capsule.statisticalUseAllowed !== false ||
    capsule.rawProviderPayloadIncluded !== false ||
    capsule.providerCallsRequiredForReplay !== false ||
    capsule.commercialSignalsUsed !== false ||
    capsule.publicProductChanged !== false
  ) {
    violations.push("capsule-boundary-invalid");
  }

  const expectedPayloadFingerprint = normalizedPayloadFingerprint(capsule);
  const expectedProvenanceFingerprint = provenanceFingerprint(capsule, expectedPayloadFingerprint);
  const { fingerprint: _fingerprint, ...payload } = capsule;
  if (
    capsule.normalizedPayloadFingerprint !== expectedPayloadFingerprint ||
    capsule.provenanceFingerprint !== expectedProvenanceFingerprint ||
    !isStableHashV3(capsule.fingerprint) ||
    capsule.fingerprint !== capsuleFingerprint(payload)
  ) {
    violations.push("fingerprint-invalid");
  }

  return {
    valid: violations.length === 0,
    violations: [...new Set(violations)].sort(),
  };
}

export function verifyNormalizedDecisionSourceArtifactHashV3(
  capsule: StayOptiNormalizedDecisionSourceCapsuleV3,
  actualSha256: string
): boolean {
  return SHA256.test(actualSha256) &&
    capsule.sourceArtifact.sha256 === actualSha256 &&
    capsule.provenanceManifest.sourceArtifactSha256 === actualSha256;
}

export function verifyNormalizedDecisionSourceCapsuleReplayV3(
  input: StayOptiNormalizedDecisionSourceCapsuleInputV3,
  expected: StayOptiNormalizedDecisionSourceCapsuleV3
): boolean {
  const replay = createNormalizedDecisionSourceCapsuleV3(input);
  return stableSerializeV3(replay) === stableSerializeV3(expected);
}

export const STAYOPTI_NORMALIZED_DECISION_SOURCE_CAPSULE_AUDIT_V3 =
  Object.freeze({
    application: "offline-forward-only-source-capture" as const,
    forwardOnly: true as const,
    rawProviderPayloadIncluded: false as const,
    providerCallsRequiredForReplay: false as const,
    commercialSignalsUsed: false as const,
    statisticalUseAllowed: false as const,
    publicV2Changed: false as const,
    publicV3Enabled: false as const,
    splitEnabled: false as const,
  });
