import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import type { StayOptiGoldenCaseTypeV3 } from "./evaluationCalibrationV3";

import {
  validateNormalizedDecisionSourceCapsuleV3,
  type StayOptiNormalizedDecisionAlternativeV3,
  type StayOptiNormalizedDecisionSearchContextV3,
  type StayOptiNormalizedDecisionSourceCapsuleV3,
} from "./normalizedDecisionSourceCapsuleV3";

export const STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3 =
  "3.0.0-measurement-blind-review.1" as const;

export const STAYOPTI_MEASUREMENT_BLIND_PACKET_SCHEMA_VERSION_V3 =
  "3.0.0-measurement-blind-packet.1" as const;

export const STAYOPTI_MEASUREMENT_BLIND_SEALED_SCHEMA_VERSION_V3 =
  "3.0.0-measurement-blind-sealed-mapping.1" as const;

export const STAYOPTI_MEASUREMENT_BLIND_RESPONSE_SCHEMA_VERSION_V3 =
  "3.0.0-measurement-blind-response.1" as const;

export type StayOptiMeasurementBlindVerdictV3 =
  | "option-a"
  | "option-b"
  | "tie"
  | "no-good-option"
  | "insufficient-information";

export type StayOptiMeasurementBlindResolvedRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "abstention-near-tie";

export interface StayOptiMeasurementBlindOptionalAssociationV3 {
  alternativeId: string;
  engineLabel: "v2" | "v3" | null;
  policyVersion: string | null;
  roleLabel: StayOptiMeasurementBlindResolvedRoleV3 | null;
  providerOpaqueReference: string | null;
}

export interface StayOptiMeasurementBlindSourceCaseV3 {
  caseId: string;
  caseType: StayOptiGoldenCaseTypeV3;
  technicalDiagnosticOnly: boolean;
  statisticalUseAllowed: false;
  decisionQuestion: string;
  sourceCapsule: StayOptiNormalizedDecisionSourceCapsuleV3;
  alternativeIds: [string, string];
  optionalSealedAssociations: StayOptiMeasurementBlindOptionalAssociationV3[];
}

export type StayOptiMeasurementBlindVisibleAlternativeV3 =
  Omit<StayOptiNormalizedDecisionAlternativeV3, "alternativeId">;

export interface StayOptiMeasurementBlindReviewCaseV3 {
  caseId: string;
  caseType: StayOptiGoldenCaseTypeV3;
  technicalDiagnosticOnly: boolean;
  statisticalUseAllowed: false;
  decisionQuestion: string;
  context: StayOptiNormalizedDecisionSearchContextV3;
  optionA: StayOptiMeasurementBlindVisibleAlternativeV3;
  optionB: StayOptiMeasurementBlindVisibleAlternativeV3;
  roleAssignedBeforeResponse: false;
  measurementState: "unmeasured";
}

export interface StayOptiMeasurementBlindPacketV3 {
  schemaVersion: typeof STAYOPTI_MEASUREMENT_BLIND_PACKET_SCHEMA_VERSION_V3;
  reviewVersion: typeof STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3;
  application: "offline-human-review-only";
  labelsHidden: true;
  providerIdentityIncluded: false;
  engineIdentityIncluded: false;
  policyIdentityIncluded: false;
  commissionIncluded: false;
  roleAssignedBeforeResponse: false;
  packetId: string;
  reviewCase: StayOptiMeasurementBlindReviewCaseV3;
  fingerprint: string;
}

export interface StayOptiMeasurementBlindSealedMappingCaseV3 {
  packetId: string;
  caseId: string;
  sourceCapsuleFingerprint: string;
  optionAAlternativeId: string;
  optionBAlternativeId: string;
  optionalAssociations: StayOptiMeasurementBlindOptionalAssociationV3[];
}

export interface StayOptiMeasurementBlindSealedMappingV3 {
  schemaVersion: typeof STAYOPTI_MEASUREMENT_BLIND_SEALED_SCHEMA_VERSION_V3;
  reviewVersion: typeof STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3;
  application: "sealed-offline-mapping-only";
  mappingRequiredToCreateQuestion: false;
  automaticPromotionAllowed: false;
  mappings: StayOptiMeasurementBlindSealedMappingCaseV3[];
  fingerprint: string;
}

export interface StayOptiMeasurementBlindReviewBundleV3 {
  reviewVersion: typeof STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3;
  application: "offline-measurement-foundation-only";
  packets: StayOptiMeasurementBlindPacketV3[];
  sealed: StayOptiMeasurementBlindSealedMappingV3;
  counts: {
    sourceCases: number;
    unmeasuredCases: number;
    technicalDiagnosticCases: number;
    eligibleGoldenCases: 0;
    adversarialCasesCounted: 0;
    counterfactualCasesCounted: 0;
    humanJudgmentsCounted: 0;
    expertJudgmentsCounted: 0;
  };
  fingerprint: string;
}

export interface StayOptiMeasurementBlindResponseInputV3 {
  responseId: string;
  packetId: string;
  packetFingerprint: string;
  caseId: string;
  evaluatorToken: string;
  evaluatorCategory: "human" | "expert" | "technical";
  evaluationOrigin: "real-person" | "technical-contract-test";
  blinded: true;
  verdict: StayOptiMeasurementBlindVerdictV3;
  reasoning: string;
  mainSacrificeAccepted: string;
  uncertainty: string;
  decisiveInformation: string;
  reversalCondition: string;
  confidence: "low" | "moderate" | "high";
}

export interface StayOptiMeasurementBlindResponseV3
  extends StayOptiMeasurementBlindResponseInputV3 {
  schemaVersion: typeof STAYOPTI_MEASUREMENT_BLIND_RESPONSE_SCHEMA_VERSION_V3;
  reviewVersion: typeof STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3;
  fingerprint: string;
}

export interface StayOptiMeasurementBlindDeblindResultV3 {
  responseId: string;
  caseId: string;
  verdict: StayOptiMeasurementBlindVerdictV3;
  selectedAlternativeId: string | null;
  resolvedRole: null;
}

export interface StayOptiMeasurementBlindPostResponseRoleAssignmentV3 {
  responseId: string;
  responseFingerprint: string;
  caseId: string;
  resolvedRole: StayOptiMeasurementBlindResolvedRoleV3;
  assignedAfterResponse: true;
  fingerprint: string;
}

export interface StayOptiMeasurementBlindCaseAggregationV3 {
  caseId: string;
  measurementState: "unmeasured" | "measured";
  realHumanJudgments: number;
  realExpertJudgments: number;
  technicalResponsesExcluded: number;
  resolvedRole: null;
  verdicts: Record<StayOptiMeasurementBlindVerdictV3, number>;
}

export interface StayOptiMeasurementBlindAggregationV3 {
  reviewVersion: typeof STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3;
  bundleFingerprint: string;
  cases: StayOptiMeasurementBlindCaseAggregationV3[];
  counts: {
    realHumanJudgments: number;
    realExpertJudgments: number;
    technicalResponsesExcluded: number;
    eligibleGoldenCasesAdded: 0;
    adversarialCasesAdded: 0;
    counterfactualCasesAdded: 0;
  };
  fingerprint: string;
}

export interface StayOptiMeasurementBlindValidationV3 {
  valid: boolean;
  issues: string[];
}

const CASE_TYPES = new Set<StayOptiGoldenCaseTypeV3>([
  "baseline",
  "adversarial",
  "counterfactual",
]);

const VERDICTS = new Set<StayOptiMeasurementBlindVerdictV3>([
  "option-a",
  "option-b",
  "tie",
  "no-good-option",
  "insufficient-information",
]);

const OPAQUE_ID = /^[a-z0-9][a-z0-9:_-]{7,127}$/i;
const FORBIDDEN_QUESTION_LABEL = /\b(?:v2|v3|provider|commission|policy)\b|best-choice|best-sensible-saving|worthwhile-comfort-upgrade|abstention-near-tie/i;
const FORBIDDEN_VISIBLE_KEY = /^(?:engine|engineLabel|engineVersion|policy|policyVersion|provider|providerId|providerName|providerOpaqueReference|commission|markup|role|roleLabel|alternativeId|optionAAlternativeId|optionBAlternativeId)$/i;

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalVisibleAlternative(
  alternative: StayOptiNormalizedDecisionAlternativeV3
): StayOptiMeasurementBlindVisibleAlternativeV3 {
  const { alternativeId: _alternativeId, ...visible } = alternative;
  return {
    ...visible,
    cancellation: { ...visible.cancellation },
    quality: { ...visible.quality },
    featureCodes: [...visible.featureCodes],
    evidence: { ...visible.evidence },
  };
}

function cloneContext(
  context: StayOptiNormalizedDecisionSearchContextV3
): StayOptiNormalizedDecisionSearchContextV3 {
  return {
    destination: { ...context.destination },
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    nights: context.nights,
    occupancy: {
      adults: context.occupancy.adults,
      childAges: [...context.occupancy.childAges],
      rooms: context.occupancy.rooms,
    },
    budget: { ...context.budget },
    maximumDistanceKm: context.maximumDistanceKm,
    profile: context.profile,
  };
}

function canonicalAssociations(
  associations: readonly StayOptiMeasurementBlindOptionalAssociationV3[]
): StayOptiMeasurementBlindOptionalAssociationV3[] {
  return associations
    .map((association) => ({ ...association }))
    .sort((left, right) => left.alternativeId.localeCompare(right.alternativeId));
}

function forbiddenVisiblePaths(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbiddenVisiblePaths(item, `${path}.${index}`));
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(FORBIDDEN_VISIBLE_KEY.test(key) ? [`${path}.${key}`] : []),
    ...forbiddenVisiblePaths(child, `${path}.${key}`),
  ]);
}

function optionAUsesFirstAlternative(
  caseId: string,
  capsuleFingerprint: string,
  decisionQuestion: string
): boolean {
  const hash = createStableHashV3(
    { caseId, capsuleFingerprint, decisionQuestion },
    "stayopti-v3-measurement-blind-side-randomization"
  );
  return Number.parseInt(hash.slice(-2), 16) % 2 === 0;
}

function packetFingerprint(
  packet: Omit<StayOptiMeasurementBlindPacketV3, "fingerprint">
): string {
  return createStableHashV3(packet, "stayopti-v3-measurement-blind-packet");
}

function sealedFingerprint(
  sealed: Omit<StayOptiMeasurementBlindSealedMappingV3, "fingerprint">
): string {
  return createStableHashV3(sealed, "stayopti-v3-measurement-blind-sealed-mapping");
}

function bundleFingerprint(
  bundle: Omit<StayOptiMeasurementBlindReviewBundleV3, "fingerprint">
): string {
  return createStableHashV3(bundle, "stayopti-v3-measurement-blind-bundle");
}

function responseFingerprint(
  response: Omit<StayOptiMeasurementBlindResponseV3, "fingerprint">
): string {
  return createStableHashV3(response, "stayopti-v3-measurement-blind-response");
}

function postResponseRoleAssignmentFingerprint(
  assignment: Omit<StayOptiMeasurementBlindPostResponseRoleAssignmentV3, "fingerprint">
): string {
  return createStableHashV3(
    assignment,
    "stayopti-v3-measurement-blind-post-response-role"
  );
}

function aggregationFingerprint(
  aggregation: Omit<StayOptiMeasurementBlindAggregationV3, "fingerprint">
): string {
  return createStableHashV3(aggregation, "stayopti-v3-measurement-blind-aggregation");
}

function validateAssociation(
  association: StayOptiMeasurementBlindOptionalAssociationV3,
  alternativeIds: Set<string>
): boolean {
  return alternativeIds.has(association.alternativeId) &&
    (association.engineLabel === null || ["v2", "v3"].includes(association.engineLabel)) &&
    (association.policyVersion === null || hasText(association.policyVersion)) &&
    (association.roleLabel === null || [
      "best-choice",
      "best-sensible-saving",
      "worthwhile-comfort-upgrade",
      "abstention-near-tie",
    ].includes(association.roleLabel)) &&
    (association.providerOpaqueReference === null || OPAQUE_ID.test(association.providerOpaqueReference));
}

export function createMeasurementBlindReviewBundleV3(
  sources: readonly StayOptiMeasurementBlindSourceCaseV3[]
): StayOptiMeasurementBlindReviewBundleV3 {
  if (sources.length === 0) {
    throw new Error("Measurement blind review requires at least one source case.");
  }
  const sourceCaseIds = sources.map(({ caseId }) => caseId);
  if (new Set(sourceCaseIds).size !== sourceCaseIds.length) {
    throw new Error("Measurement blind source case IDs must be unique.");
  }

  const packets: StayOptiMeasurementBlindPacketV3[] = [];
  const mappings: StayOptiMeasurementBlindSealedMappingCaseV3[] = [];

  for (const source of [...sources].sort((left, right) => left.caseId.localeCompare(right.caseId))) {
    const capsuleValidation = validateNormalizedDecisionSourceCapsuleV3(source.sourceCapsule);
    const [firstId, secondId] = [...source.alternativeIds].sort((left, right) =>
      left.localeCompare(right)
    );
    const alternativeById = new Map(
      source.sourceCapsule.alternatives.map((alternative) => [alternative.alternativeId, alternative] as const)
    );
    const first = alternativeById.get(firstId);
    const second = alternativeById.get(secondId);
    const associationIds = source.optionalSealedAssociations.map(({ alternativeId }) => alternativeId);
    if (
      !OPAQUE_ID.test(source.caseId) ||
      !CASE_TYPES.has(source.caseType) ||
      source.statisticalUseAllowed !== false ||
      source.technicalDiagnosticOnly !== source.sourceCapsule.technicalDiagnosticOnly ||
      !hasText(source.decisionQuestion) ||
      FORBIDDEN_QUESTION_LABEL.test(source.decisionQuestion) ||
      !capsuleValidation.valid ||
      firstId === secondId ||
      first === undefined ||
      second === undefined ||
      new Set(associationIds).size !== associationIds.length ||
      source.optionalSealedAssociations.some((association) =>
        !validateAssociation(association, new Set([firstId, secondId]))
      )
    ) {
      throw new Error(`Invalid measurement blind source case ${source.caseId}.`);
    }

    const packetId = createStableHashV3(
      {
        caseId: source.caseId,
        sourceCapsuleFingerprint: source.sourceCapsule.fingerprint,
        decisionQuestion: source.decisionQuestion,
      },
      "stayopti-v3-measurement-blind-packet-id"
    );
    const firstOnA = optionAUsesFirstAlternative(
      source.caseId,
      source.sourceCapsule.fingerprint,
      source.decisionQuestion
    );
    const optionA = firstOnA ? first : second;
    const optionB = firstOnA ? second : first;

    const packetPayload: Omit<StayOptiMeasurementBlindPacketV3, "fingerprint"> = {
      schemaVersion: STAYOPTI_MEASUREMENT_BLIND_PACKET_SCHEMA_VERSION_V3,
      reviewVersion: STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3,
      application: "offline-human-review-only",
      labelsHidden: true,
      providerIdentityIncluded: false,
      engineIdentityIncluded: false,
      policyIdentityIncluded: false,
      commissionIncluded: false,
      roleAssignedBeforeResponse: false,
      packetId,
      reviewCase: {
        caseId: source.caseId,
        caseType: source.caseType,
        technicalDiagnosticOnly: source.technicalDiagnosticOnly,
        statisticalUseAllowed: false,
        decisionQuestion: source.decisionQuestion,
        context: cloneContext(source.sourceCapsule.context),
        optionA: canonicalVisibleAlternative(optionA),
        optionB: canonicalVisibleAlternative(optionB),
        roleAssignedBeforeResponse: false,
        measurementState: "unmeasured",
      },
    };
    packets.push({ ...packetPayload, fingerprint: packetFingerprint(packetPayload) });
    mappings.push({
      packetId,
      caseId: source.caseId,
      sourceCapsuleFingerprint: source.sourceCapsule.fingerprint,
      optionAAlternativeId: optionA.alternativeId,
      optionBAlternativeId: optionB.alternativeId,
      optionalAssociations: canonicalAssociations(source.optionalSealedAssociations),
    });
  }

  const sealedPayload: Omit<StayOptiMeasurementBlindSealedMappingV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_MEASUREMENT_BLIND_SEALED_SCHEMA_VERSION_V3,
    reviewVersion: STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3,
    application: "sealed-offline-mapping-only",
    mappingRequiredToCreateQuestion: false,
    automaticPromotionAllowed: false,
    mappings,
  };
  const bundlePayload: Omit<StayOptiMeasurementBlindReviewBundleV3, "fingerprint"> = {
    reviewVersion: STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3,
    application: "offline-measurement-foundation-only",
    packets,
    sealed: { ...sealedPayload, fingerprint: sealedFingerprint(sealedPayload) },
    counts: {
      sourceCases: sources.length,
      unmeasuredCases: sources.length,
      technicalDiagnosticCases: sources.filter(({ technicalDiagnosticOnly }) => technicalDiagnosticOnly).length,
      eligibleGoldenCases: 0,
      adversarialCasesCounted: 0,
      counterfactualCasesCounted: 0,
      humanJudgmentsCounted: 0,
      expertJudgmentsCounted: 0,
    },
  };
  const bundle = { ...bundlePayload, fingerprint: bundleFingerprint(bundlePayload) };
  const validation = validateMeasurementBlindReviewBundleV3(bundle);
  if (!validation.valid) {
    throw new Error(`Generated measurement blind review bundle invalid: ${validation.issues.join(", ")}`);
  }
  return bundle;
}

export function validateMeasurementBlindReviewBundleV3(
  bundle: StayOptiMeasurementBlindReviewBundleV3
): StayOptiMeasurementBlindValidationV3 {
  const issues: string[] = [];
  const { fingerprint: _bundleFingerprint, ...bundlePayload } = bundle;
  const { fingerprint: _sealedFingerprint, ...sealedPayload } = bundle.sealed;
  if (
    bundle.reviewVersion !== STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3 ||
    bundle.application !== "offline-measurement-foundation-only" ||
    bundle.packets.length === 0 ||
    bundle.counts.sourceCases !== bundle.packets.length ||
    bundle.counts.unmeasuredCases !== bundle.packets.length ||
    bundle.counts.technicalDiagnosticCases !==
      bundle.packets.filter(
        ({ reviewCase }) => reviewCase.technicalDiagnosticOnly
      ).length ||
    bundle.counts.eligibleGoldenCases !== 0 ||
    bundle.counts.adversarialCasesCounted !== 0 ||
    bundle.counts.counterfactualCasesCounted !== 0 ||
    bundle.counts.humanJudgmentsCounted !== 0 ||
    bundle.counts.expertJudgmentsCounted !== 0 ||
    !isStableHashV3(bundle.fingerprint) ||
    bundle.fingerprint !== bundleFingerprint(bundlePayload)
  ) {
    issues.push("bundle-invalid");
  }
  if (
    bundle.sealed.schemaVersion !== STAYOPTI_MEASUREMENT_BLIND_SEALED_SCHEMA_VERSION_V3 ||
    bundle.sealed.reviewVersion !== STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3 ||
    bundle.sealed.application !== "sealed-offline-mapping-only" ||
    bundle.sealed.mappingRequiredToCreateQuestion !== false ||
    bundle.sealed.automaticPromotionAllowed !== false ||
    !isStableHashV3(bundle.sealed.fingerprint) ||
    bundle.sealed.fingerprint !== sealedFingerprint(sealedPayload)
  ) {
    issues.push("sealed-mapping-invalid");
  }

  const mappingByKey = new Map(
    bundle.sealed.mappings.map((mapping) => [`${mapping.packetId}:${mapping.caseId}`, mapping] as const)
  );
  if (mappingByKey.size !== bundle.sealed.mappings.length) {
    issues.push("sealed-mapping-duplicate");
  }
  for (const packet of bundle.packets) {
    const { fingerprint: _packetFingerprint, ...packetPayload } = packet;
    const mapping = mappingByKey.get(`${packet.packetId}:${packet.reviewCase.caseId}`);
    const visibleAlternativeIds = new Set([
      mapping?.optionAAlternativeId ?? "",
      mapping?.optionBAlternativeId ?? "",
    ]);
    if (
      packet.schemaVersion !== STAYOPTI_MEASUREMENT_BLIND_PACKET_SCHEMA_VERSION_V3 ||
      packet.reviewVersion !== STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3 ||
      packet.application !== "offline-human-review-only" ||
      packet.labelsHidden !== true ||
      packet.providerIdentityIncluded !== false ||
      packet.engineIdentityIncluded !== false ||
      packet.policyIdentityIncluded !== false ||
      packet.commissionIncluded !== false ||
      packet.roleAssignedBeforeResponse !== false ||
      packet.reviewCase.roleAssignedBeforeResponse !== false ||
      packet.reviewCase.measurementState !== "unmeasured" ||
      packet.reviewCase.statisticalUseAllowed !== false ||
      FORBIDDEN_QUESTION_LABEL.test(packet.reviewCase.decisionQuestion) ||
      forbiddenVisiblePaths(packet).length > 0 ||
      mapping === undefined ||
      mapping.packetId !== packet.packetId ||
      mapping.caseId !== packet.reviewCase.caseId ||
      !isStableHashV3(mapping.sourceCapsuleFingerprint) ||
      !OPAQUE_ID.test(mapping.optionAAlternativeId) ||
      !OPAQUE_ID.test(mapping.optionBAlternativeId) ||
      mapping.optionAAlternativeId === mapping.optionBAlternativeId ||
      mapping.optionalAssociations.some((association) =>
        !validateAssociation(association, visibleAlternativeIds)
      ) ||
      !isStableHashV3(packet.fingerprint) ||
      packet.fingerprint !== packetFingerprint(packetPayload)
    ) {
      issues.push(`packet-invalid:${packet.reviewCase.caseId}`);
    }
  }
  if (mappingByKey.size !== bundle.packets.length) {
    issues.push("packet-sealed-mismatch");
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}

export function createMeasurementBlindResponseV3(
  bundle: StayOptiMeasurementBlindReviewBundleV3,
  input: StayOptiMeasurementBlindResponseInputV3
): StayOptiMeasurementBlindResponseV3 {
  const payload: Omit<StayOptiMeasurementBlindResponseV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_MEASUREMENT_BLIND_RESPONSE_SCHEMA_VERSION_V3,
    reviewVersion: STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3,
    ...input,
  };
  const response = { ...payload, fingerprint: responseFingerprint(payload) };
  const validation = validateMeasurementBlindResponseV3(bundle, response);
  if (!validation.valid) {
    throw new Error(`Measurement blind response invalid: ${validation.issues.join(", ")}`);
  }
  return response;
}

export function validateMeasurementBlindResponseV3(
  bundle: StayOptiMeasurementBlindReviewBundleV3,
  response: StayOptiMeasurementBlindResponseV3
): StayOptiMeasurementBlindValidationV3 {
  const issues: string[] = [];
  const packet = bundle.packets.find(({ packetId }) => packetId === response.packetId);
  const { fingerprint: _responseFingerprint, ...payload } = response;
  if (
    packet === undefined ||
    response.schemaVersion !== STAYOPTI_MEASUREMENT_BLIND_RESPONSE_SCHEMA_VERSION_V3 ||
    response.reviewVersion !== STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3 ||
    !OPAQUE_ID.test(response.responseId) ||
    !OPAQUE_ID.test(response.evaluatorToken) ||
    response.caseId !== packet.reviewCase.caseId ||
    response.packetFingerprint !== packet.fingerprint ||
    response.blinded !== true ||
    !VERDICTS.has(response.verdict) ||
    !hasText(response.reasoning) ||
    !hasText(response.mainSacrificeAccepted) ||
    !hasText(response.uncertainty) ||
    !hasText(response.decisiveInformation) ||
    !hasText(response.reversalCondition) ||
    !["low", "moderate", "high"].includes(response.confidence) ||
    !isStableHashV3(response.fingerprint) ||
    response.fingerprint !== responseFingerprint(payload)
  ) {
    issues.push("response-contract-invalid");
  }
  const technical = packet?.reviewCase.technicalDiagnosticOnly === true;
  if (
    (response.evaluationOrigin === "real-person" && !["human", "expert"].includes(response.evaluatorCategory)) ||
    (technical && response.evaluationOrigin !== "technical-contract-test") ||
    (response.evaluationOrigin === "technical-contract-test" &&
      (response.evaluatorCategory !== "technical" || !technical)) ||
    !["real-person", "technical-contract-test"].includes(response.evaluationOrigin)
  ) {
    issues.push("evaluator-origin-invalid");
  }
  return { valid: issues.length === 0, issues };
}

export function assignMeasurementBlindRoleAfterResponseV3(
  bundle: StayOptiMeasurementBlindReviewBundleV3,
  response: StayOptiMeasurementBlindResponseV3,
  resolvedRole: StayOptiMeasurementBlindResolvedRoleV3
): StayOptiMeasurementBlindPostResponseRoleAssignmentV3 {
  const validation = validateMeasurementBlindResponseV3(bundle, response);
  if (
    !validation.valid ||
    ![
      "best-choice",
      "best-sensible-saving",
      "worthwhile-comfort-upgrade",
      "abstention-near-tie",
    ].includes(resolvedRole)
  ) {
    throw new Error("Cannot assign a role before a valid blind response exists.");
  }
  const payload: Omit<
    StayOptiMeasurementBlindPostResponseRoleAssignmentV3,
    "fingerprint"
  > = {
    responseId: response.responseId,
    responseFingerprint: response.fingerprint,
    caseId: response.caseId,
    resolvedRole,
    assignedAfterResponse: true,
  };
  return {
    ...payload,
    fingerprint: postResponseRoleAssignmentFingerprint(payload),
  };
}

export function deblindMeasurementBlindResponseV3(
  bundle: StayOptiMeasurementBlindReviewBundleV3,
  response: StayOptiMeasurementBlindResponseV3
): StayOptiMeasurementBlindDeblindResultV3 {
  const validation = validateMeasurementBlindResponseV3(bundle, response);
  if (!validation.valid) {
    throw new Error(`Cannot deblind invalid response: ${validation.issues.join(", ")}`);
  }
  const mapping = bundle.sealed.mappings.find(
    ({ packetId, caseId }) => packetId === response.packetId && caseId === response.caseId
  );
  if (mapping === undefined) {
    throw new Error("Measurement blind sealed mapping is missing.");
  }
  return {
    responseId: response.responseId,
    caseId: response.caseId,
    verdict: response.verdict,
    selectedAlternativeId:
      response.verdict === "option-a"
        ? mapping.optionAAlternativeId
        : response.verdict === "option-b"
          ? mapping.optionBAlternativeId
          : null,
    resolvedRole: null,
  };
}

function emptyVerdicts(): Record<StayOptiMeasurementBlindVerdictV3, number> {
  return {
    "option-a": 0,
    "option-b": 0,
    tie: 0,
    "no-good-option": 0,
    "insufficient-information": 0,
  };
}

export function aggregateMeasurementBlindResponsesV3(
  bundle: StayOptiMeasurementBlindReviewBundleV3,
  responses: readonly StayOptiMeasurementBlindResponseV3[]
): StayOptiMeasurementBlindAggregationV3 {
  const bundleValidation = validateMeasurementBlindReviewBundleV3(bundle);
  if (!bundleValidation.valid) {
    throw new Error(`Cannot aggregate invalid measurement blind bundle: ${bundleValidation.issues.join(", ")}`);
  }
  const responseIds = responses.map(({ responseId }) => responseId);
  const evaluatorAssignments = responses.map(({ caseId, evaluatorToken }) => `${caseId}:${evaluatorToken}`);
  if (
    new Set(responseIds).size !== responseIds.length ||
    new Set(evaluatorAssignments).size !== evaluatorAssignments.length
  ) {
    throw new Error("Measurement blind responses contain a duplicate response or evaluator assignment.");
  }
  responses.forEach((response) => {
    const validation = validateMeasurementBlindResponseV3(bundle, response);
    if (!validation.valid) {
      throw new Error(`Cannot aggregate invalid response: ${validation.issues.join(", ")}`);
    }
  });

  const cases = bundle.packets
    .map((packet): StayOptiMeasurementBlindCaseAggregationV3 => {
      const caseResponses = responses.filter(({ caseId }) => caseId === packet.reviewCase.caseId);
      const realResponses = caseResponses.filter(({ evaluationOrigin }) => evaluationOrigin === "real-person");
      const verdicts = emptyVerdicts();
      realResponses.forEach(({ verdict }) => {
        verdicts[verdict] += 1;
      });
      return {
        caseId: packet.reviewCase.caseId,
        measurementState: realResponses.length === 0 ? "unmeasured" : "measured",
        realHumanJudgments: realResponses.filter(({ evaluatorCategory }) => evaluatorCategory === "human").length,
        realExpertJudgments: realResponses.filter(({ evaluatorCategory }) => evaluatorCategory === "expert").length,
        technicalResponsesExcluded: caseResponses.length - realResponses.length,
        resolvedRole: null,
        verdicts,
      };
    })
    .sort((left, right) => left.caseId.localeCompare(right.caseId));

  const payload: Omit<StayOptiMeasurementBlindAggregationV3, "fingerprint"> = {
    reviewVersion: STAYOPTI_MEASUREMENT_BLIND_REVIEW_VERSION_V3,
    bundleFingerprint: bundle.fingerprint,
    cases,
    counts: {
      realHumanJudgments: cases.reduce((sum, item) => sum + item.realHumanJudgments, 0),
      realExpertJudgments: cases.reduce((sum, item) => sum + item.realExpertJudgments, 0),
      technicalResponsesExcluded: cases.reduce((sum, item) => sum + item.technicalResponsesExcluded, 0),
      eligibleGoldenCasesAdded: 0,
      adversarialCasesAdded: 0,
      counterfactualCasesAdded: 0,
    },
  };
  return { ...payload, fingerprint: aggregationFingerprint(payload) };
}

export function verifyMeasurementBlindReviewReplayV3(
  sources: readonly StayOptiMeasurementBlindSourceCaseV3[],
  expected: StayOptiMeasurementBlindReviewBundleV3
): boolean {
  return stableSerializeV3(createMeasurementBlindReviewBundleV3(sources)) ===
    stableSerializeV3(expected);
}

export const STAYOPTI_MEASUREMENT_FOUNDATION_AUDIT_V3 = Object.freeze({
  application: "offline-measurement-foundation-only" as const,
  goldenReceiptsBefore: 115 as const,
  goldenReceiptsAfter: 115 as const,
  decisionResearchUsableBefore: 5 as const,
  decisionResearchUsableAfter: 5 as const,
  newGoldenCases: 0 as const,
  newAdversarialCases: 0 as const,
  newCounterfactualCases: 0 as const,
  newHumanJudgments: 0 as const,
  newExpertJudgments: 0 as const,
  aiJudgmentsCountedAsHumanOrExpert: 0 as const,
  publicV2Changed: false as const,
  publicV3Enabled: false as const,
  splitEnabled: false as const,
  providerCalls: 0 as const,
  bookingOrPaymentChanged: false as const,
  deployChanged: false as const,
});
