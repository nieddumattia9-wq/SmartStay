import {
  STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3,
  STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3,
  createFreshRoleAwareSha256V3,
  validateFreshReplayableRoleAwareCapsuleV3,
  type StayOptiFreshRoleAwareCapsuleV3,
  type StayOptiFreshRoleAwareRoleV3,
  type StayOptiFreshRoleAwareStaySolutionV3,
} from "./freshReplayableRoleAwareCapsuleV3";

export const STAYOPTI_FRESH_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3 =
  "stayopti.v3.fresh-role-aware-blind-packet@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_SEALED_ASSIGNMENT_SCHEMA_VERSION_V3 =
  "stayopti.v3.fresh-role-aware-sealed-assignment@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_VERDICT_RECEIPT_SCHEMA_VERSION_V3 =
  "stayopti.v3.fresh-role-aware-verdict-receipt@1" as const;

export const STAYOPTI_FRESH_ROLE_AWARE_DEBLIND_SCHEMA_VERSION_V3 =
  "stayopti.v3.fresh-role-aware-deblind@1" as const;

export type StayOptiFreshBlindEngineKeyV3 =
  | "baseline-engine"
  | "candidate-engine";

export type StayOptiFreshBlindSideV3 =
  | "option-a"
  | "option-b";

export interface StayOptiFreshBlindAlternativeV3 {
  engineKey: StayOptiFreshBlindEngineKeyV3;
  role: StayOptiFreshRoleAwareRoleV3;
  decisionState: "recommended" | "abstained";
  solutionId: string | null;
  decisionFingerprint: string;
  reasonCodes: string[];
}

export interface StayOptiFreshBlindSourceV3 {
  caseId: string;
  capsule: StayOptiFreshRoleAwareCapsuleV3;
  evaluationRole: StayOptiFreshRoleAwareRoleV3;
  alternatives: [
    StayOptiFreshBlindAlternativeV3,
    StayOptiFreshBlindAlternativeV3,
  ];
}

export interface StayOptiFreshBlindVisibleFactsV3 {
  decisionState: "recommended" | "abstained";
  totalCost: number | null;
  currency: string | null;
  segments: number | null;
  taxesStatus: "complete" | "partial" | "unknown" | null;
  mandatoryCostStatus: "complete" | "partial" | "unknown" | null;
  roomCount: number | null;
  refundability: "refundable" | "non-refundable" | "unknown" | null;
  paymentTiming: "pay-now" | "pay-later" | "mixed" | "unknown" | null;
  starCategory: number | null;
  reviewScore: number | null;
  reviewScale: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  comfortFeatureCodes: string[];
  evidenceStates: Array<{
    field: string;
    state: "known" | "estimated" | "unknown";
  }>;
}

export interface StayOptiFreshBlindVisibleSideV3 {
  label: StayOptiFreshBlindSideV3;
  facts: StayOptiFreshBlindVisibleFactsV3;
}

export interface StayOptiFreshRoleAwareBlindPacketV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3;
  application: "private-offline-blind-evaluation-only";
  packetId: string;
  capsuleFingerprint: string;
  evaluationRole: StayOptiFreshRoleAwareRoleV3;
  evaluationQuestion: string;
  labelsOpaque: true;
  sides: [
    StayOptiFreshBlindVisibleSideV3,
    StayOptiFreshBlindVisibleSideV3,
  ];
  fingerprint: string;
}

export interface StayOptiFreshSealedAlternativeV3 {
  side: StayOptiFreshBlindSideV3;
  engineKey: StayOptiFreshBlindEngineKeyV3;
  role: StayOptiFreshRoleAwareRoleV3;
  decisionState: "recommended" | "abstained";
  solutionId: string | null;
  decisionFingerprint: string;
  reasonCodes: string[];
}

export interface StayOptiFreshRoleAwareSealedAssignmentV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_SEALED_ASSIGNMENT_SCHEMA_VERSION_V3;
  application: "sealed-private-offline-assignment-only";
  packetId: string;
  packetFingerprint: string;
  capsuleFingerprint: string;
  evaluationRole: StayOptiFreshRoleAwareRoleV3;
  alternatives: [
    StayOptiFreshSealedAlternativeV3,
    StayOptiFreshSealedAlternativeV3,
  ];
  originalOrderIncluded: false;
  automaticPromotionAllowed: false;
  goldenAdmissionAllowed: false;
  scoringAllowed: false;
  rankingAllowed: false;
  fingerprint: string;
}

export interface StayOptiFreshRoleAwareBlindBundleV3 {
  application: "private-offline-role-aware-bundle";
  capsule: StayOptiFreshRoleAwareCapsuleV3;
  packet: StayOptiFreshRoleAwareBlindPacketV3;
  sealedAssignment: StayOptiFreshRoleAwareSealedAssignmentV3;
  fingerprint: string;
}

export interface StayOptiFreshVerdictInputV3 {
  verdictId: string;
  evaluatorToken: string;
  evaluatorClass: "technical-contract-test" | "human" | "expert";
  selected: StayOptiFreshBlindSideV3 | "tie" | "abstain";
  recordedAt: string;
}

export interface StayOptiFreshRoleAwareVerdictReceiptV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_VERDICT_RECEIPT_SCHEMA_VERSION_V3;
  application: "immutable-private-offline-verdict-receipt";
  verdictId: string;
  packetId: string;
  packetFingerprint: string;
  capsuleFingerprint: string;
  evaluationRole: StayOptiFreshRoleAwareRoleV3;
  evaluatorToken: string;
  evaluatorClass: "technical-contract-test" | "human" | "expert";
  blinded: true;
  selected: StayOptiFreshBlindSideV3 | "tie" | "abstain";
  recordedAt: string;
  humanEvidenceCounted: false;
  goldenAdmissionAllowed: false;
  tuningAllowed: false;
  scoringAllowed: false;
  rankingAllowed: false;
  promotionAllowed: false;
  fingerprint: string;
}

export interface StayOptiFreshReasonDiffV3 {
  shared: string[];
  selectedOnly: string[];
  otherOnly: string[];
}

export interface StayOptiFreshRoleAwareDeblindReportV3 {
  schemaVersion:
    typeof STAYOPTI_FRESH_ROLE_AWARE_DEBLIND_SCHEMA_VERSION_V3;
  application: "private-offline-deterministic-deblind";
  packetId: string;
  packetFingerprint: string;
  capsuleFingerprint: string;
  receiptFingerprint: string;
  evaluationRole: StayOptiFreshRoleAwareRoleV3;
  selected: StayOptiFreshBlindSideV3 | "tie" | "abstain";
  selectedEngineKey: StayOptiFreshBlindEngineKeyV3 | null;
  selectedDecisionFingerprint: string | null;
  reasonDiff: StayOptiFreshReasonDiffV3;
  sameRoleComparison: true;
  deterministic: true;
  humanEvidenceCounted: false;
  goldenAdmissionAllowed: false;
  tuningAllowed: false;
  scoringAllowed: false;
  rankingAllowed: false;
  promotionAllowed: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitPublicEnabled: false;
  fingerprint: string;
}

export interface StayOptiFreshRoleAwareBlindValidationV3 {
  valid: boolean;
  issues: string[];
}

const OPAQUE_TOKEN = /^[a-z0-9][a-z0-9:._-]{7,127}$/i;
const CODE = /^[a-z0-9][a-z0-9:._-]{2,127}$/i;
const SHA256_BINDING = /^sha256:[0-9a-f]{64}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const FORBIDDEN_VISIBLE_KEY = /^(?:engine|engineKey|engineLabel|policyVersion|provider|providerId|providerName|providerSlug|originalOrder|currentChoice|commission|markup|commercialOrder|commercialOrdering|engineFingerprint|decisionFingerprint|reasonCodes|solutionId|accommodationToken|canonicalOfferRef|verdict|verdicts)$/i;

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    ISO_TIMESTAMP.test(value) &&
    !Number.isNaN(Date.parse(value));
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

function sortedUnique(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function visibleForbiddenPaths(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      visibleForbiddenPaths(child, `${path}.${index}`)
    );
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(FORBIDDEN_VISIBLE_KEY.test(key) ? [`${path}.${key}`] : []),
    ...visibleForbiddenPaths(child, `${path}.${key}`),
  ]);
}

function solutionById(
  capsule: StayOptiFreshRoleAwareCapsuleV3,
  solutionId: string | null
) {
  if (solutionId === null) {
    return null;
  }
  return capsule.staySolutions.find((solution) => solution.solutionId === solutionId) ?? null;
}

function visibleFacts(
  alternative: StayOptiFreshBlindAlternativeV3,
  solution: StayOptiFreshRoleAwareStaySolutionV3 | null
): StayOptiFreshBlindVisibleFactsV3 {
  if (alternative.decisionState === "abstained") {
    return {
      decisionState: "abstained",
      totalCost: null,
      currency: null,
      segments: null,
      taxesStatus: null,
      mandatoryCostStatus: null,
      roomCount: null,
      refundability: null,
      paymentTiming: null,
      starCategory: null,
      reviewScore: null,
      reviewScale: null,
      reviewCount: null,
      distanceKm: null,
      comfortFeatureCodes: [],
      evidenceStates: [],
    };
  }
  if (solution === null) {
    throw new Error("A recommended blind alternative requires a bound stay solution.");
  }
  const firstOffer = solution.segments[0]?.offer;
  if (firstOffer === undefined) {
    throw new Error("A recommended blind alternative requires complete offer facts.");
  }
  return {
    decisionState: "recommended",
    totalCost: solution.totalCost,
    currency: solution.currency,
    segments: solution.segments.length,
    taxesStatus: firstOffer.cost.taxes.status,
    mandatoryCostStatus: firstOffer.cost.mandatoryCosts.status,
    roomCount: solution.segments.reduce((sum, segment) => sum + segment.offer.room.rooms, 0),
    refundability: firstOffer.cancellation.refundability,
    paymentTiming: firstOffer.payment.timing,
    starCategory: solution.quality.starCategory,
    reviewScore: solution.reviews.score,
    reviewScale: solution.reviews.scale,
    reviewCount: solution.reviews.count,
    distanceKm: solution.location.distanceKm,
    comfortFeatureCodes: [...solution.comfort.featureCodes].sort(),
    evidenceStates: Object.entries(solution.dataStatus)
      .map(([field, state]) => ({ field, state }))
      .sort((left, right) => left.field.localeCompare(right.field)),
  };
}

function validateAlternative(
  alternative: StayOptiFreshBlindAlternativeV3,
  capsule: StayOptiFreshRoleAwareCapsuleV3,
  role: StayOptiFreshRoleAwareRoleV3
) {
  if (
    !["baseline-engine", "candidate-engine"].includes(alternative.engineKey) ||
    alternative.role !== role ||
    !["recommended", "abstained"].includes(alternative.decisionState) ||
    !SHA256_BINDING.test(alternative.decisionFingerprint) ||
    !Array.isArray(alternative.reasonCodes) ||
    alternative.reasonCodes.some((code) => !CODE.test(code)) ||
    new Set(alternative.reasonCodes).size !== alternative.reasonCodes.length
  ) {
    throw new Error("Fresh blind alternative is invalid or role-mismatched.");
  }
  const solution = solutionById(capsule, alternative.solutionId);
  if (
    role === "abstention-near-tie"
      ? alternative.decisionState === "recommended" && solution === null
      : alternative.decisionState !== "recommended" || solution === null
  ) {
    throw new Error("Fresh blind alternative decision state does not match its role.");
  }
  if (role === "split-saver" && solution !== null && solution.segments.length < 2) {
    throw new Error("Split evaluation requires a complete multi-segment stay solution.");
  }
}

function vCandidateOnLeft(
  caseId: string,
  role: StayOptiFreshRoleAwareRoleV3,
  capsuleFingerprint: string
) {
  const binding = createFreshRoleAwareSha256V3(
    { caseId, role, capsuleFingerprint },
    "stayopti-v3-fresh-role-aware-side-assignment"
  );
  return Number.parseInt(binding.slice(-2), 16) % 2 === 0;
}

function packetFingerprint(
  packet: Omit<StayOptiFreshRoleAwareBlindPacketV3, "fingerprint">
) {
  return createFreshRoleAwareSha256V3(
    packet,
    "stayopti-v3-fresh-role-aware-blind-packet"
  );
}

function assignmentFingerprint(
  assignment: Omit<StayOptiFreshRoleAwareSealedAssignmentV3, "fingerprint">
) {
  return createFreshRoleAwareSha256V3(
    assignment,
    "stayopti-v3-fresh-role-aware-sealed-assignment"
  );
}

function bundleFingerprint(
  bundle: Omit<StayOptiFreshRoleAwareBlindBundleV3, "fingerprint">
) {
  return createFreshRoleAwareSha256V3(
    bundle,
    "stayopti-v3-fresh-role-aware-bundle"
  );
}

function receiptFingerprint(
  receipt: Omit<StayOptiFreshRoleAwareVerdictReceiptV3, "fingerprint">
) {
  return createFreshRoleAwareSha256V3(
    receipt,
    "stayopti-v3-fresh-role-aware-verdict-receipt"
  );
}

function reportFingerprint(
  report: Omit<StayOptiFreshRoleAwareDeblindReportV3, "fingerprint">
) {
  return createFreshRoleAwareSha256V3(
    report,
    "stayopti-v3-fresh-role-aware-deblind"
  );
}

export function createFreshRoleAwareBlindBundleV3(
  source: StayOptiFreshBlindSourceV3
): StayOptiFreshRoleAwareBlindBundleV3 {
  const capsuleValidation = validateFreshReplayableRoleAwareCapsuleV3(source.capsule);
  if (!capsuleValidation.valid) {
    throw new Error(`Fresh blind source capsule invalid: ${capsuleValidation.issues.join(", ")}.`);
  }
  if (
    source.caseId !== source.capsule.caseId ||
    source.evaluationRole !== source.capsule.evaluationIntent.role ||
    !STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3.includes(source.evaluationRole) ||
    source.alternatives.length !== 2 ||
    source.alternatives[0].engineKey === source.alternatives[1].engineKey
  ) {
    throw new Error("Fresh blind source is unbound or role-mismatched.");
  }
  for (const alternative of source.alternatives) {
    validateAlternative(alternative, source.capsule, source.evaluationRole);
  }
  const canonicalAlternatives = [...source.alternatives]
    .map((alternative) => ({
      ...alternative,
      reasonCodes: sortedUnique(alternative.reasonCodes),
    }))
    .sort((left, right) => left.engineKey.localeCompare(right.engineKey));
  const candidateOnLeft = vCandidateOnLeft(
    source.caseId,
    source.evaluationRole,
    source.capsule.fingerprint
  );
  const leftAlternative = candidateOnLeft
    ? canonicalAlternatives[1]
    : canonicalAlternatives[0];
  const rightAlternative = candidateOnLeft
    ? canonicalAlternatives[0]
    : canonicalAlternatives[1];
  if (leftAlternative === undefined || rightAlternative === undefined) {
    throw new Error("Fresh blind source alternatives are incomplete.");
  }
  const packetId = createFreshRoleAwareSha256V3(
    {
      caseId: source.caseId,
      capsuleFingerprint: source.capsule.fingerprint,
      evaluationRole: source.evaluationRole,
    },
    "stayopti-v3-fresh-role-aware-packet-id"
  );
  const packetBody: Omit<StayOptiFreshRoleAwareBlindPacketV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_FRESH_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3,
    application: "private-offline-blind-evaluation-only",
    packetId,
    capsuleFingerprint: source.capsule.fingerprint,
    evaluationRole: source.evaluationRole,
    evaluationQuestion: STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3[source.evaluationRole],
    labelsOpaque: true,
    sides: [
      {
        label: "option-a",
        facts: visibleFacts(leftAlternative, solutionById(source.capsule, leftAlternative.solutionId)),
      },
      {
        label: "option-b",
        facts: visibleFacts(rightAlternative, solutionById(source.capsule, rightAlternative.solutionId)),
      },
    ],
  };
  const packet: StayOptiFreshRoleAwareBlindPacketV3 = {
    ...packetBody,
    fingerprint: packetFingerprint(packetBody),
  };
  const sealedBody: Omit<StayOptiFreshRoleAwareSealedAssignmentV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_FRESH_ROLE_AWARE_SEALED_ASSIGNMENT_SCHEMA_VERSION_V3,
    application: "sealed-private-offline-assignment-only",
    packetId,
    packetFingerprint: packet.fingerprint,
    capsuleFingerprint: source.capsule.fingerprint,
    evaluationRole: source.evaluationRole,
    alternatives: [
      { side: "option-a", ...leftAlternative },
      { side: "option-b", ...rightAlternative },
    ],
    originalOrderIncluded: false,
    automaticPromotionAllowed: false,
    goldenAdmissionAllowed: false,
    scoringAllowed: false,
    rankingAllowed: false,
  };
  const sealedAssignment: StayOptiFreshRoleAwareSealedAssignmentV3 = {
    ...sealedBody,
    fingerprint: assignmentFingerprint(sealedBody),
  };
  const body: Omit<StayOptiFreshRoleAwareBlindBundleV3, "fingerprint"> = {
    application: "private-offline-role-aware-bundle",
    capsule: source.capsule,
    packet,
    sealedAssignment,
  };
  const bundle = deepFreeze({
    ...body,
    fingerprint: bundleFingerprint(body),
  });
  const validation = validateFreshRoleAwareBlindBundleV3(bundle);
  if (!validation.valid) {
    throw new Error(`Generated fresh role-aware blind bundle invalid: ${validation.issues.join(", ")}.`);
  }
  return bundle;
}

export function validateFreshRoleAwareBlindBundleV3(
  value: unknown
): StayOptiFreshRoleAwareBlindValidationV3 {
  const issues: string[] = [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, issues: ["bundle-structure-invalid"] };
  }
  const bundle = value as StayOptiFreshRoleAwareBlindBundleV3;
  try {
    const capsuleValidation = validateFreshReplayableRoleAwareCapsuleV3(bundle.capsule);
    if (!capsuleValidation.valid) {
      issues.push("capsule-invalid");
    }
    const packet = bundle.packet;
    const sealed = bundle.sealedAssignment;
    const { fingerprint: _packetFingerprint, ...packetBody } = packet;
    const { fingerprint: _assignmentFingerprint, ...assignmentBody } = sealed;
    const { fingerprint: _bundleFingerprint, ...bundleBody } = bundle;
    if (
      bundle.application !== "private-offline-role-aware-bundle" ||
      bundle.fingerprint !== bundleFingerprint(bundleBody)
    ) {
      issues.push("bundle-binding-invalid");
    }
    if (
      packet.schemaVersion !== STAYOPTI_FRESH_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3 ||
      packet.application !== "private-offline-blind-evaluation-only" ||
      packet.capsuleFingerprint !== bundle.capsule.fingerprint ||
      packet.evaluationRole !== bundle.capsule.evaluationIntent.role ||
      packet.evaluationQuestion !== STAYOPTI_FRESH_ROLE_AWARE_QUESTIONS_V3[packet.evaluationRole] ||
      packet.labelsOpaque !== true ||
      packet.sides.length !== 2 ||
      packet.fingerprint !== packetFingerprint(packetBody) ||
      visibleForbiddenPaths(packet).length > 0
    ) {
      issues.push("packet-invalid-or-not-blind");
    }
    if (
      sealed.schemaVersion !== STAYOPTI_FRESH_ROLE_AWARE_SEALED_ASSIGNMENT_SCHEMA_VERSION_V3 ||
      sealed.application !== "sealed-private-offline-assignment-only" ||
      sealed.packetId !== packet.packetId ||
      sealed.packetFingerprint !== packet.fingerprint ||
      sealed.capsuleFingerprint !== bundle.capsule.fingerprint ||
      sealed.evaluationRole !== packet.evaluationRole ||
      sealed.alternatives.length !== 2 ||
      sealed.alternatives[0].side !== "option-a" ||
      sealed.alternatives[1].side !== "option-b" ||
      sealed.alternatives.some((alternative) => alternative.role !== packet.evaluationRole) ||
      sealed.alternatives[0].engineKey === sealed.alternatives[1].engineKey ||
      sealed.originalOrderIncluded !== false ||
      sealed.automaticPromotionAllowed !== false ||
      sealed.goldenAdmissionAllowed !== false ||
      sealed.scoringAllowed !== false ||
      sealed.rankingAllowed !== false ||
      sealed.fingerprint !== assignmentFingerprint(assignmentBody)
    ) {
      issues.push("sealed-assignment-invalid");
    }
  }
  catch {
    issues.push("bundle-structure-invalid");
  }
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)].sort(),
  };
}

export function createFreshRoleAwareVerdictReceiptV3(
  bundle: StayOptiFreshRoleAwareBlindBundleV3,
  input: StayOptiFreshVerdictInputV3
): StayOptiFreshRoleAwareVerdictReceiptV3 {
  const bundleValidation = validateFreshRoleAwareBlindBundleV3(bundle);
  if (!bundleValidation.valid) {
    throw new Error(`Cannot receipt an invalid blind bundle: ${bundleValidation.issues.join(", ")}.`);
  }
  if (
    !OPAQUE_TOKEN.test(input.verdictId) ||
    !OPAQUE_TOKEN.test(input.evaluatorToken) ||
    !["technical-contract-test", "human", "expert"].includes(input.evaluatorClass) ||
    !["option-a", "option-b", "tie", "abstain"].includes(input.selected) ||
    !isTimestamp(input.recordedAt) ||
    (input.selected === "abstain" && bundle.packet.evaluationRole !== "abstention-near-tie")
  ) {
    throw new Error("Fresh role-aware verdict input is invalid or role-mismatched.");
  }
  const body: Omit<StayOptiFreshRoleAwareVerdictReceiptV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_FRESH_ROLE_AWARE_VERDICT_RECEIPT_SCHEMA_VERSION_V3,
    application: "immutable-private-offline-verdict-receipt",
    verdictId: input.verdictId,
    packetId: bundle.packet.packetId,
    packetFingerprint: bundle.packet.fingerprint,
    capsuleFingerprint: bundle.capsule.fingerprint,
    evaluationRole: bundle.packet.evaluationRole,
    evaluatorToken: input.evaluatorToken,
    evaluatorClass: input.evaluatorClass,
    blinded: true,
    selected: input.selected,
    recordedAt: input.recordedAt,
    humanEvidenceCounted: false,
    goldenAdmissionAllowed: false,
    tuningAllowed: false,
    scoringAllowed: false,
    rankingAllowed: false,
    promotionAllowed: false,
  };
  return deepFreeze({
    ...body,
    fingerprint: receiptFingerprint(body),
  });
}

function validateReceipt(
  bundle: StayOptiFreshRoleAwareBlindBundleV3,
  value: unknown
): value is StayOptiFreshRoleAwareVerdictReceiptV3 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    const receipt = value as StayOptiFreshRoleAwareVerdictReceiptV3;
    const { fingerprint, ...body } = receipt;
    return receipt.schemaVersion === STAYOPTI_FRESH_ROLE_AWARE_VERDICT_RECEIPT_SCHEMA_VERSION_V3 &&
      receipt.application === "immutable-private-offline-verdict-receipt" &&
      receipt.packetId === bundle.packet.packetId &&
      receipt.packetFingerprint === bundle.packet.fingerprint &&
      receipt.capsuleFingerprint === bundle.capsule.fingerprint &&
      receipt.evaluationRole === bundle.packet.evaluationRole &&
      receipt.blinded === true &&
      receipt.humanEvidenceCounted === false &&
      receipt.goldenAdmissionAllowed === false &&
      receipt.tuningAllowed === false &&
      receipt.scoringAllowed === false &&
      receipt.rankingAllowed === false &&
      receipt.promotionAllowed === false &&
      receipt.fingerprint === receiptFingerprint(body);
  }
  catch {
    return false;
  }
}

function reasonDiff(
  selected: StayOptiFreshSealedAlternativeV3 | null,
  other: StayOptiFreshSealedAlternativeV3 | null
): StayOptiFreshReasonDiffV3 {
  if (selected === null || other === null) {
    return { shared: [], selectedOnly: [], otherOnly: [] };
  }
  if (selected.role !== other.role) {
    throw new Error("Reason diff is allowed only within the same evaluation role.");
  }
  const selectedReasons = new Set(selected.reasonCodes);
  const otherReasons = new Set(other.reasonCodes);
  return {
    shared: [...selectedReasons].filter((reason) => otherReasons.has(reason)).sort(),
    selectedOnly: [...selectedReasons].filter((reason) => !otherReasons.has(reason)).sort(),
    otherOnly: [...otherReasons].filter((reason) => !selectedReasons.has(reason)).sort(),
  };
}

export function createFreshRoleAwareDeblindReportV3(
  bundle: StayOptiFreshRoleAwareBlindBundleV3,
  receiptValue: unknown,
  previousDeblindFingerprint: string | null = null
): StayOptiFreshRoleAwareDeblindReportV3 {
  if (previousDeblindFingerprint !== null) {
    throw new Error("Fresh role-aware deblind has already been recorded.");
  }
  const bundleValidation = validateFreshRoleAwareBlindBundleV3(bundle);
  if (!bundleValidation.valid) {
    throw new Error(`Cannot deblind an invalid bundle: ${bundleValidation.issues.join(", ")}.`);
  }
  if (!validateReceipt(bundle, receiptValue)) {
    throw new Error("Fresh role-aware verdict receipt is missing, altered or unbound.");
  }
  const receipt = receiptValue;
  const selectedAlternative = receipt.selected === "option-a"
    ? bundle.sealedAssignment.alternatives[0]
    : receipt.selected === "option-b"
      ? bundle.sealedAssignment.alternatives[1]
      : null;
  const otherAlternative = receipt.selected === "option-a"
    ? bundle.sealedAssignment.alternatives[1]
    : receipt.selected === "option-b"
      ? bundle.sealedAssignment.alternatives[0]
      : null;
  const body: Omit<StayOptiFreshRoleAwareDeblindReportV3, "fingerprint"> = {
    schemaVersion: STAYOPTI_FRESH_ROLE_AWARE_DEBLIND_SCHEMA_VERSION_V3,
    application: "private-offline-deterministic-deblind",
    packetId: bundle.packet.packetId,
    packetFingerprint: bundle.packet.fingerprint,
    capsuleFingerprint: bundle.capsule.fingerprint,
    receiptFingerprint: receipt.fingerprint,
    evaluationRole: bundle.packet.evaluationRole,
    selected: receipt.selected,
    selectedEngineKey: selectedAlternative?.engineKey ?? null,
    selectedDecisionFingerprint: selectedAlternative?.decisionFingerprint ?? null,
    reasonDiff: reasonDiff(selectedAlternative, otherAlternative),
    sameRoleComparison: true,
    deterministic: true,
    humanEvidenceCounted: false,
    goldenAdmissionAllowed: false,
    tuningAllowed: false,
    scoringAllowed: false,
    rankingAllowed: false,
    promotionAllowed: false,
    publicV2Changed: false,
    publicV3Enabled: false,
    splitPublicEnabled: false,
  };
  return deepFreeze({
    ...body,
    fingerprint: reportFingerprint(body),
  });
}

export const STAYOPTI_FRESH_ROLE_AWARE_BLIND_PIPELINE_AUDIT_V3 = Object.freeze({
  application: "private-offline-role-aware-evaluation-only" as const,
  roles: STAYOPTI_FRESH_ROLE_AWARE_ROLES_V3,
  sameRoleOnly: true as const,
  visibleEngineLabels: false as const,
  visiblePolicyVersions: false as const,
  visibleProviderIdentity: false as const,
  visibleCommercialSignals: false as const,
  verdictReceiptImmutable: true as const,
  deterministicDeblind: true as const,
  reasonDiffIntraRoleOnly: true as const,
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
