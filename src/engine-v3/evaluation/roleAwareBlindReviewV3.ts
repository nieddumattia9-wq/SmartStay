import {
  createStableHashV3,
  isStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import type {
  StayOptiComparableDecisionStatusV3,
} from "../promotion/shadowCanaryPromotionV3";

import {
  evaluateRoleComparisonInvariantV3,
  type StayOptiConstitutionRoleV3,
} from "./decisionConstitutionV3";

import type {
  StayOptiBlindEvaluatorTypeV3,
  StayOptiGoldenCaseTypeV3,
} from "./evaluationCalibrationV3";

import type {
  StayOptiBlindOptionFactsV3,
  StayOptiBlindTripContextV3,
} from "./realCaseBlindReviewV3";

export const STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3 =
  "3.0.0-role-aware-blind-review.2" as const;

export const STAYOPTI_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3 =
  "3.0.0-role-aware-blind-packet.1" as const;

export const STAYOPTI_ROLE_AWARE_BLIND_ASSIGNMENT_SCHEMA_VERSION_V3 =
  "3.0.0-role-aware-blind-assignment.1" as const;

export const STAYOPTI_ROLE_AWARE_DEBLIND_SCHEMA_VERSION_V3 =
  "3.0.0-role-aware-deblind.1" as const;

export type StayOptiBlindEvaluationRoleV3 =
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "abstention-near-tie";

export type StayOptiBlindEngineV3 =
  | "v2"
  | "v3";

export interface StayOptiRoleAwareCandidateV3 {
  engine:
    StayOptiBlindEngineV3;

  role:
    StayOptiBlindEvaluationRoleV3;

  status:
    StayOptiComparableDecisionStatusV3;

  decisionFingerprint:
    string;

  reasonCodes:
    string[];

  facts:
    StayOptiBlindOptionFactsV3;
}

export interface StayOptiRoleAwareBlindSourceCaseV3 {
  caseId:
    string;

  caseType:
    StayOptiGoldenCaseTypeV3;

  evaluationQuestionRole:
    StayOptiBlindEvaluationRoleV3;

  context:
    StayOptiBlindTripContextV3;

  v2:
    StayOptiRoleAwareCandidateV3;

  v3:
    StayOptiRoleAwareCandidateV3;
}

export interface StayOptiRoleAwareBlindCaseV3 {
  caseId:
    string;

  caseType:
    StayOptiGoldenCaseTypeV3;

  evaluationQuestionRole:
    StayOptiBlindEvaluationRoleV3;

  evaluationQuestion:
    string;

  context:
    StayOptiBlindTripContextV3;

  left:
    StayOptiBlindOptionFactsV3;

  right:
    StayOptiBlindOptionFactsV3;
}

export interface StayOptiRoleAwareBlindPacketV3 {
  schemaVersion:
    typeof STAYOPTI_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3;

  reviewVersion:
    typeof STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3;

  application:
    "offline-human-review-only";

  evaluationQuestionRole:
    StayOptiBlindEvaluationRoleV3;

  labelsHidden:
    true;

  sideRolesHidden:
    true;

  providerIdentityIncluded:
    false;

  propertyIdentityIncluded:
    false;

  piiAllowed:
    false;

  publicProductChanged:
    false;

  packetId:
    string;

  cases:
    StayOptiRoleAwareBlindCaseV3[];

  fingerprint:
    string;
}

export interface StayOptiRoleAwareBlindAssignmentCaseV3 {
  packetId:
    string;

  caseId:
    string;

  evaluationQuestionRole:
    StayOptiBlindEvaluationRoleV3;

  leftLabel:
    StayOptiBlindEngineV3;

  rightLabel:
    StayOptiBlindEngineV3;

  leftRole:
    StayOptiBlindEvaluationRoleV3;

  rightRole:
    StayOptiBlindEvaluationRoleV3;

  leftDecisionFingerprint:
    string;

  rightDecisionFingerprint:
    string;

  leftReasonCodes:
    string[];

  rightReasonCodes:
    string[];
}

export type StayOptiRoleAwareRejectionReasonV3 =
  | "role-mismatch"
  | "status-question-mismatch";

export interface StayOptiRoleAwareBlindRejectionV3 {
  caseId:
    string;

  evaluationQuestionRole:
    StayOptiBlindEvaluationRoleV3;

  v2Role:
    StayOptiBlindEvaluationRoleV3;

  v3Role:
    StayOptiBlindEvaluationRoleV3;

  v2Status:
    StayOptiComparableDecisionStatusV3;

  v3Status:
    StayOptiComparableDecisionStatusV3;

  reason:
    StayOptiRoleAwareRejectionReasonV3;
}

export interface StayOptiRoleAwareBlindAssignmentsV3 {
  schemaVersion:
    typeof STAYOPTI_ROLE_AWARE_BLIND_ASSIGNMENT_SCHEMA_VERSION_V3;

  reviewVersion:
    typeof STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3;

  application:
    "sealed-offline-assignment-only";

  automaticPromotionAllowed:
    false;

  assignments:
    StayOptiRoleAwareBlindAssignmentCaseV3[];

  rejections:
    StayOptiRoleAwareBlindRejectionV3[];

  fingerprint:
    string;
}

export interface StayOptiRoleAwareBlindBundleV3 {
  reviewVersion:
    typeof STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3;

  roleAwareGateEligible:
    true;

  packets:
    StayOptiRoleAwareBlindPacketV3[];

  sealed:
    StayOptiRoleAwareBlindAssignmentsV3;

  counts: {
    source:
      number;

    evaluable:
      number;

    rejected:
      number;

    rolePackets:
      number;
  };

  fingerprint:
    string;
}

export interface StayOptiRoleAwareBlindResponseV3 {
  responseId:
    string;

  packetId:
    string;

  packetFingerprint:
    string;

  caseId:
    string;

  evaluatorToken:
    string;

  evaluatorType:
    StayOptiBlindEvaluatorTypeV3;

  blinded:
    true;

  winner:
    "left" | "right" | "tie" | "neither";
}

export interface StayOptiRoleAwareReasonDiffV3 {
  shared:
    string[];

  v2Only:
    string[];

  v3Only:
    string[];
}

export interface StayOptiRoleAwareDeblindJudgmentV3 {
  responseId:
    string;

  caseId:
    string;

  evaluationQuestionRole:
    StayOptiBlindEvaluationRoleV3;

  evaluatorToken:
    string;

  evaluatorType:
    StayOptiBlindEvaluatorTypeV3;

  blinded:
    true;

  winner:
    "left" | "right" | "tie" | "neither";

  winningEngine:
    StayOptiBlindEngineV3 | null;

  reasonDiff:
    StayOptiRoleAwareReasonDiffV3;
}

export interface StayOptiRoleAwareDeblindRoleSummaryV3 {
  role:
    StayOptiBlindEvaluationRoleV3;

  judgments:
    number;

  v2Wins:
    number;

  v3Wins:
    number;

  ties:
    number;

  neither:
    number;
}

export interface StayOptiRoleAwareDeblindReportV3 {
  schemaVersion:
    typeof STAYOPTI_ROLE_AWARE_DEBLIND_SCHEMA_VERSION_V3;

  reviewVersion:
    typeof STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3;

  application:
    "offline-evaluation-only";

  roleAwareGateEligible:
    true;

  bundleFingerprint:
    string;

  judgments:
    StayOptiRoleAwareDeblindJudgmentV3[];

  byRole:
    StayOptiRoleAwareDeblindRoleSummaryV3[];

  fingerprint:
    string;
}

export interface StayOptiRoleAwareBlindValidationV3 {
  valid:
    boolean;

  issues:
    Array<
      | "assignment-mismatch"
      | "duplicate-case"
      | "fingerprint-mismatch"
      | "invalid-assignment"
      | "invalid-bundle"
      | "invalid-packet"
      | "packet-not-blind"
      | "role-mismatch"
    >;
}

const ROLE_ORDER:
  readonly StayOptiBlindEvaluationRoleV3[] = [
    "best-choice",
    "best-sensible-saving",
    "worthwhile-comfort-upgrade",
    "abstention-near-tie",
  ];

const ROLE_VALUES =
  new Set<StayOptiBlindEvaluationRoleV3>(
    ROLE_ORDER
  );

const STATUS_VALUES =
  new Set<StayOptiComparableDecisionStatusV3>([
    "recommended",
    "abstained",
    "no-feasible-solution",
  ]);

const CASE_TYPE_VALUES =
  new Set<StayOptiGoldenCaseTypeV3>([
    "baseline",
    "adversarial",
    "counterfactual",
  ]);

const QUESTION_COPY:
  Readonly<Record<StayOptiBlindEvaluationRoleV3, string>> = {
    "best-choice":
      "Quale opzione e la migliore esperienza coerente con intenzione, budget e vincoli?",
    "best-sensible-saving":
      "Quale opzione offre il risparmio piu sensato con una perdita di esperienza accettabile?",
    "worthwhile-comfort-upgrade":
      "Quale opzione rappresenta un miglioramento di comfort che giustifica il sovrapprezzo?",
    "abstention-near-tie":
      "Quale lato gestisce meglio l'incertezza e l'eventuale astensione senza forzare una raccomandazione?",
  };

function requireOpaqueToken(
  value:
    unknown,
  label:
    string
) {
  if (
    typeof value !==
      "string" ||
    !/^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(
      value
    )
  ) {
    throw new Error(
      `${label} must be an opaque token.`
    );
  }

  return value;
}

function sortedUnique(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values
    ),
  ].sort();
}

function normalizeReasonCodes(
  values:
    readonly string[]
) {
  if (
    !Array.isArray(
      values
    ) ||
    values.some(
      (value) =>
        typeof value !==
          "string" ||
        !/^[a-z0-9][a-z0-9:._-]{2,127}$/i.test(
          value
        )
    )
  ) {
    throw new Error(
      "Role-aware blind candidates require opaque reason codes."
    );
  }

  return sortedUnique(
    values
  );
}

function cloneContext(
  context:
    StayOptiBlindTripContextV3
): StayOptiBlindTripContextV3 {
  return {
    profile:
      context.profile,
    destination:
      context.destination,
    leadTime:
      context.leadTime,
    duration:
      context.duration,
    coverage:
      context.coverage,
    nights:
      context.nights,
    adults:
      context.adults,
    children:
      context.children,
    rooms:
      context.rooms,
    totalBudget:
      context.totalBudget,
    maximumDistanceKm:
      context.maximumDistanceKm,
    currency:
      context.currency,
    analyzedOptionCount:
      context.analyzedOptionCount,
  };
}

function cloneFacts(
  facts:
    StayOptiBlindOptionFactsV3
): StayOptiBlindOptionFactsV3 {
  return {
    status:
      facts.status,
    totalCost:
      facts.totalCost,
    currency:
      facts.currency,
    starCategory:
      facts.starCategory,
    reviewScore:
      facts.reviewScore,
    reviewCountBand:
      facts.reviewCountBand,
    distanceKm:
      facts.distanceKm,
    refundable:
      facts.refundable,
    mealIncluded:
      facts.mealIncluded,
    taxesStatus:
      facts.taxesStatus,
    dataConfidence:
      facts.dataConfidence,
    riskLevel:
      facts.riskLevel,
    rankBand:
      facts.rankBand,
    dimensions:
      facts.dimensions ===
        null
        ? null
        : {
            priceValue:
              facts.dimensions.priceValue,
            quality:
              facts.dimensions.quality,
            location:
              facts.dimensions.location,
            comfort:
              facts.dimensions.comfort,
            flexibility:
              facts.dimensions.flexibility,
            userFit:
              facts.dimensions.userFit,
            reliability:
              facts.dimensions.reliability,
          },
  };
}

function validateCandidate(
  candidate:
    StayOptiRoleAwareCandidateV3,
  expectedEngine:
    StayOptiBlindEngineV3
) {
  if (
    candidate.engine !==
      expectedEngine ||
    !ROLE_VALUES.has(
      candidate.role
    ) ||
    !STATUS_VALUES.has(
      candidate.status
    ) ||
    !isStableHashV3(
      candidate.decisionFingerprint
    ) ||
    candidate.facts.status !==
      candidate.status
  ) {
    throw new Error(
      `Invalid ${expectedEngine} role-aware blind candidate.`
    );
  }

  normalizeReasonCodes(
    candidate.reasonCodes
  );

  stableSerializeV3(
    cloneFacts(
      candidate.facts
    )
  );
}

function determineRejection(
  source:
    StayOptiRoleAwareBlindSourceCaseV3
): StayOptiRoleAwareRejectionReasonV3 | null {
  const invariant =
    evaluateRoleComparisonInvariantV3({
      evaluationQuestionRole:
        source.evaluationQuestionRole as StayOptiConstitutionRoleV3,
      leftRole:
        source.v2.role as StayOptiConstitutionRoleV3,
      rightRole:
        source.v3.role as StayOptiConstitutionRoleV3,
      labelsHidden:
        true,
    });

  if (
    !invariant.pass
  ) {
    return "role-mismatch";
  }

  const expectsAbstention =
    source.evaluationQuestionRole ===
      "abstention-near-tie";

  const statusesMatchQuestion =
    expectsAbstention
      ? source.v2.status !==
          "recommended" &&
        source.v3.status !==
          "recommended"
      : source.v2.status ===
          "recommended" &&
        source.v3.status ===
          "recommended";

  return statusesMatchQuestion
    ? null
    : "status-question-mismatch";
}

function v3OnLeft(
  caseId:
    string,
  role:
    StayOptiBlindEvaluationRoleV3
) {
  const token =
    createStableHashV3(
      {
        caseId,
        role,
        reviewVersion:
          STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
      },
      "stayopti-v3-role-aware-side-randomization"
    );

  return Number.parseInt(
    token.slice(
      -2
    ),
    16
  ) %
    2 ===
    0;
}

function createPacketFingerprint(
  packet:
    Omit<StayOptiRoleAwareBlindPacketV3, "fingerprint">
) {
  return createStableHashV3(
    packet,
    "stayopti-v3-role-aware-blind-packet"
  );
}

function createAssignmentsFingerprint(
  sealed:
    Omit<StayOptiRoleAwareBlindAssignmentsV3, "fingerprint">
) {
  return createStableHashV3(
    sealed,
    "stayopti-v3-role-aware-blind-assignments"
  );
}

function createBundleFingerprint(
  bundle:
    Omit<StayOptiRoleAwareBlindBundleV3, "fingerprint">
) {
  return createStableHashV3(
    bundle,
    "stayopti-v3-role-aware-blind-bundle"
  );
}

function createReportFingerprint(
  report:
    Omit<StayOptiRoleAwareDeblindReportV3, "fingerprint">
) {
  return createStableHashV3(
    report,
    "stayopti-v3-role-aware-deblind-report"
  );
}

function forbiddenVisiblePaths(
  value:
    unknown,
  path =
    "root"
): string[] {
  if (
    Array.isArray(
      value
    )
  ) {
    return value.flatMap(
      (item, index) =>
        forbiddenVisiblePaths(
          item,
          `${path}.${index}`
        )
    );
  }

  if (
    value ===
      null ||
    typeof value !==
      "object"
  ) {
    return [];
  }

  return Object.entries(
    value as Record<string, unknown>
  ).flatMap(
    ([key, child]) => [
      ...(
        /^(engine|engineVersion|provider|providerId|providerName|propertyId|propertyName|hotelId|hotelName|leftLabel|rightLabel|leftRole|rightRole|decisionFingerprint|reasonCodes)$/i.test(
          key
        )
          ? [
              `${path}.${key}`,
            ]
          : []
      ),
      ...forbiddenVisiblePaths(
        child,
        `${path}.${key}`
      ),
    ]
  );
}

export function createRoleAwareBlindReviewBundleV3(
  sources:
    readonly StayOptiRoleAwareBlindSourceCaseV3[]
): StayOptiRoleAwareBlindBundleV3 {
  if (
    sources.length ===
      0
  ) {
    throw new Error(
      "Role-aware blind review requires at least one source case."
    );
  }

  const caseIds =
    sources.map(
      (source) =>
        requireOpaqueToken(
          source.caseId,
          "caseId"
        )
    );

  if (
    new Set(
      caseIds
    ).size !==
      caseIds.length
  ) {
    throw new Error(
      "Role-aware blind source case IDs must be unique."
    );
  }

  const accepted:
    Array<{
      reviewCase:
        StayOptiRoleAwareBlindCaseV3;
      assignment:
        Omit<StayOptiRoleAwareBlindAssignmentCaseV3, "packetId">;
    }> = [];

  const rejections:
    StayOptiRoleAwareBlindRejectionV3[] = [];

  for (
    const source
    of sources
  ) {
    if (
      !CASE_TYPE_VALUES.has(
        source.caseType
      ) ||
      !ROLE_VALUES.has(
        source.evaluationQuestionRole
      )
    ) {
      throw new Error(
        "Role-aware blind source contains an unknown closed value."
      );
    }

    validateCandidate(
      source.v2,
      "v2"
    );
    validateCandidate(
      source.v3,
      "v3"
    );
    stableSerializeV3(
      cloneContext(
        source.context
      )
    );

    const rejection =
      determineRejection(
        source
      );

    if (
      rejection !==
        null
    ) {
      rejections.push({
        caseId:
          source.caseId,
        evaluationQuestionRole:
          source.evaluationQuestionRole,
        v2Role:
          source.v2.role,
        v3Role:
          source.v3.role,
        v2Status:
          source.v2.status,
        v3Status:
          source.v3.status,
        reason:
          rejection,
      });
      continue;
    }

    const placeV3OnLeft =
      v3OnLeft(
        source.caseId,
        source.evaluationQuestionRole
      );

    const left =
      placeV3OnLeft
        ? source.v3
        : source.v2;

    const right =
      placeV3OnLeft
        ? source.v2
        : source.v3;

    accepted.push({
      reviewCase: {
        caseId:
          source.caseId,
        caseType:
          source.caseType,
        evaluationQuestionRole:
          source.evaluationQuestionRole,
        evaluationQuestion:
          QUESTION_COPY[
            source.evaluationQuestionRole
          ],
        context:
          cloneContext(
            source.context
          ),
        left:
          cloneFacts(
            left.facts
          ),
        right:
          cloneFacts(
            right.facts
          ),
      },
      assignment: {
        caseId:
          source.caseId,
        evaluationQuestionRole:
          source.evaluationQuestionRole,
        leftLabel:
          left.engine,
        rightLabel:
          right.engine,
        leftRole:
          left.role,
        rightRole:
          right.role,
        leftDecisionFingerprint:
          left.decisionFingerprint,
        rightDecisionFingerprint:
          right.decisionFingerprint,
        leftReasonCodes:
          normalizeReasonCodes(
            left.reasonCodes
          ),
        rightReasonCodes:
          normalizeReasonCodes(
            right.reasonCodes
          ),
      },
    });
  }

  accepted.sort(
    (first, second) =>
      first.reviewCase.caseId.localeCompare(
        second.reviewCase.caseId
      )
  );
  rejections.sort(
    (first, second) =>
      first.caseId.localeCompare(
        second.caseId
      )
  );

  const packets:
    StayOptiRoleAwareBlindPacketV3[] = [];
  const assignments:
    StayOptiRoleAwareBlindAssignmentCaseV3[] = [];

  for (
    const role
    of ROLE_ORDER
  ) {
    const roleCases =
      accepted.filter(
        (item) =>
          item.reviewCase.evaluationQuestionRole ===
            role
      );

    if (
      roleCases.length ===
        0
    ) {
      continue;
    }

    const packetId =
      createStableHashV3(
        {
          role,
          caseIds:
            roleCases.map(
              (item) =>
                item.reviewCase.caseId
            ),
          reviewVersion:
            STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
        },
        "stayopti-v3-role-aware-blind-packet-id"
      );

    const packetWithoutFingerprint:
      Omit<StayOptiRoleAwareBlindPacketV3, "fingerprint"> = {
        schemaVersion:
          STAYOPTI_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3,
        reviewVersion:
          STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
        application:
          "offline-human-review-only",
        evaluationQuestionRole:
          role,
        labelsHidden:
          true,
        sideRolesHidden:
          true,
        providerIdentityIncluded:
          false,
        propertyIdentityIncluded:
          false,
        piiAllowed:
          false,
        publicProductChanged:
          false,
        packetId,
        cases:
          roleCases.map(
            (item) =>
              item.reviewCase
          ),
      };

    packets.push({
      ...packetWithoutFingerprint,
      fingerprint:
        createPacketFingerprint(
          packetWithoutFingerprint
        ),
    });

    assignments.push(
      ...roleCases.map(
        (item) => ({
          packetId,
          ...item.assignment,
        })
      )
    );
  }

  const sealedWithoutFingerprint:
    Omit<StayOptiRoleAwareBlindAssignmentsV3, "fingerprint"> = {
      schemaVersion:
        STAYOPTI_ROLE_AWARE_BLIND_ASSIGNMENT_SCHEMA_VERSION_V3,
      reviewVersion:
        STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
      application:
        "sealed-offline-assignment-only",
      automaticPromotionAllowed:
        false,
      assignments,
      rejections,
    };

  const bundleWithoutFingerprint:
    Omit<StayOptiRoleAwareBlindBundleV3, "fingerprint"> = {
      reviewVersion:
        STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
      roleAwareGateEligible:
        true,
      packets,
      sealed: {
        ...sealedWithoutFingerprint,
        fingerprint:
          createAssignmentsFingerprint(
            sealedWithoutFingerprint
          ),
      },
      counts: {
        source:
          sources.length,
        evaluable:
          accepted.length,
        rejected:
          rejections.length,
        rolePackets:
          packets.length,
      },
    };

  const bundle = {
    ...bundleWithoutFingerprint,
    fingerprint:
      createBundleFingerprint(
        bundleWithoutFingerprint
      ),
  } satisfies StayOptiRoleAwareBlindBundleV3;

  const validation =
    validateRoleAwareBlindReviewBundleV3(
      bundle
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Generated role-aware blind bundle is invalid: ${validation.issues.join(", ")}.`
    );
  }

  return bundle;
}

export function validateRoleAwareBlindReviewBundleV3(
  bundle:
    StayOptiRoleAwareBlindBundleV3
): StayOptiRoleAwareBlindValidationV3 {
  const issues:
    StayOptiRoleAwareBlindValidationV3["issues"] = [];

  if (
    bundle.reviewVersion !==
      STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3 ||
    bundle.roleAwareGateEligible !==
      true ||
    bundle.counts.evaluable !==
      bundle.sealed.assignments.length ||
    bundle.counts.rejected !==
      bundle.sealed.rejections.length ||
    bundle.counts.source !==
      bundle.counts.evaluable +
        bundle.counts.rejected ||
    bundle.counts.rolePackets !==
      bundle.packets.length
  ) {
    issues.push(
      "invalid-bundle"
    );
  }

  const {
    fingerprint:
      bundleFingerprint,
    ...bundleWithoutFingerprint
  } = bundle;

  if (
    bundleFingerprint !==
      createBundleFingerprint(
        bundleWithoutFingerprint
      )
  ) {
    issues.push(
      "fingerprint-mismatch"
    );
  }

  const {
    fingerprint:
      sealedFingerprint,
    ...sealedWithoutFingerprint
  } = bundle.sealed;

  if (
    bundle.sealed.schemaVersion !==
      STAYOPTI_ROLE_AWARE_BLIND_ASSIGNMENT_SCHEMA_VERSION_V3 ||
    bundle.sealed.reviewVersion !==
      STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3 ||
    bundle.sealed.application !==
      "sealed-offline-assignment-only" ||
    bundle.sealed.automaticPromotionAllowed !==
      false ||
    sealedFingerprint !==
      createAssignmentsFingerprint(
        sealedWithoutFingerprint
      )
  ) {
    issues.push(
      "invalid-assignment"
    );
  }

  const assignmentKey =
    (packetId: string, caseId: string) =>
      `${packetId}:${caseId}`;

  const packetKeys:
    string[] = [];

  for (
    const packet
    of bundle.packets
  ) {
    const {
      fingerprint:
        packetFingerprint,
      ...packetWithoutFingerprint
    } = packet;

    if (
      packet.schemaVersion !==
        STAYOPTI_ROLE_AWARE_BLIND_PACKET_SCHEMA_VERSION_V3 ||
      packet.reviewVersion !==
        STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3 ||
      packet.application !==
        "offline-human-review-only" ||
      !ROLE_VALUES.has(
        packet.evaluationQuestionRole
      ) ||
      packet.labelsHidden !==
        true ||
      packet.sideRolesHidden !==
        true ||
      packet.providerIdentityIncluded !==
        false ||
      packet.propertyIdentityIncluded !==
        false ||
      packet.piiAllowed !==
        false ||
      packet.publicProductChanged !==
        false ||
      packet.cases.length ===
        0 ||
      packetFingerprint !==
        createPacketFingerprint(
          packetWithoutFingerprint
        )
    ) {
      issues.push(
        "invalid-packet"
      );
    }

    if (
      forbiddenVisiblePaths(
        packet
      ).length >
        0
    ) {
      issues.push(
        "packet-not-blind"
      );
    }

    for (
      const reviewCase
      of packet.cases
    ) {
      packetKeys.push(
        assignmentKey(
          packet.packetId,
          reviewCase.caseId
        )
      );

      if (
        reviewCase.evaluationQuestionRole !==
          packet.evaluationQuestionRole ||
        reviewCase.evaluationQuestion !==
          QUESTION_COPY[
            packet.evaluationQuestionRole
          ]
      ) {
        issues.push(
          "role-mismatch"
        );
      }
    }
  }

  const sealedKeys =
    bundle.sealed.assignments.map(
      (assignment) =>
        assignmentKey(
          assignment.packetId,
          assignment.caseId
        )
    );

  if (
    new Set(
      packetKeys
    ).size !==
      packetKeys.length ||
    new Set(
      sealedKeys
    ).size !==
      sealedKeys.length
  ) {
    issues.push(
      "duplicate-case"
    );
  }

  if (
    stableSerializeV3(
      [...packetKeys].sort()
    ) !==
      stableSerializeV3(
        [...sealedKeys].sort()
      )
  ) {
    issues.push(
      "assignment-mismatch"
    );
  }

  const packetRoleById =
    new Map(
      bundle.packets.map(
        (packet) => [
          packet.packetId,
          packet.evaluationQuestionRole,
        ] as const
      )
    );

  for (
    const assignment
    of bundle.sealed.assignments
  ) {
    const invariant =
      evaluateRoleComparisonInvariantV3({
        evaluationQuestionRole:
          assignment.evaluationQuestionRole,
        leftRole:
          assignment.leftRole,
        rightRole:
          assignment.rightRole,
        labelsHidden:
          true,
      });

    if (
      assignment.leftLabel ===
        assignment.rightLabel ||
      !isStableHashV3(
        assignment.leftDecisionFingerprint
      ) ||
      !isStableHashV3(
        assignment.rightDecisionFingerprint
      ) ||
      packetRoleById.get(
        assignment.packetId
      ) !==
        assignment.evaluationQuestionRole
    ) {
      issues.push(
        "invalid-assignment"
      );
    }

    if (
      !invariant.pass
    ) {
      issues.push(
        "role-mismatch"
      );
    }
  }

  return {
    valid:
      issues.length ===
        0,
    issues: [
      ...new Set(
        issues
      ),
    ].sort(),
  };
}

function createReasonDiff(
  assignment:
    StayOptiRoleAwareBlindAssignmentCaseV3
): StayOptiRoleAwareReasonDiffV3 {
  const v2Reasons =
    new Set(
      assignment.leftLabel ===
        "v2"
        ? assignment.leftReasonCodes
        : assignment.rightReasonCodes
    );

  const v3Reasons =
    new Set(
      assignment.leftLabel ===
        "v3"
        ? assignment.leftReasonCodes
        : assignment.rightReasonCodes
    );

  return {
    shared:
      [...v2Reasons].filter(
        (reason) =>
          v3Reasons.has(
            reason
          )
      ).sort(),
    v2Only:
      [...v2Reasons].filter(
        (reason) =>
          !v3Reasons.has(
            reason
          )
      ).sort(),
    v3Only:
      [...v3Reasons].filter(
        (reason) =>
          !v2Reasons.has(
            reason
          )
      ).sort(),
  };
}

export function createRoleAwareDeblindReportV3(
  bundle:
    StayOptiRoleAwareBlindBundleV3,
  responses:
    readonly StayOptiRoleAwareBlindResponseV3[]
): StayOptiRoleAwareDeblindReportV3 {
  const validation =
    validateRoleAwareBlindReviewBundleV3(
      bundle
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Role-aware blind bundle is invalid: ${validation.issues.join(", ")}.`
    );
  }

  if (
    new Set(
      responses.map(
        (response) =>
          requireOpaqueToken(
            response.responseId,
            "responseId"
          )
      )
    ).size !==
      responses.length
  ) {
    throw new Error(
      "Role-aware blind response IDs must be unique."
    );
  }

  const packetById =
    new Map(
      bundle.packets.map(
        (packet) => [
          packet.packetId,
          packet,
        ] as const
      )
    );

  const assignmentByKey =
    new Map(
      bundle.sealed.assignments.map(
        (assignment) => [
          `${assignment.packetId}:${assignment.caseId}`,
          assignment,
        ] as const
      )
    );

  const judgments =
    responses.map(
      (response): StayOptiRoleAwareDeblindJudgmentV3 => {
        requireOpaqueToken(
          response.evaluatorToken,
          "evaluatorToken"
        );

        const packet =
          packetById.get(
            response.packetId
          );

        const assignment =
          assignmentByKey.get(
            `${response.packetId}:${response.caseId}`
          );

        if (
          packet ===
            undefined ||
          assignment ===
            undefined ||
          response.packetFingerprint !==
            packet.fingerprint ||
          response.blinded !==
            true ||
          ![
            "human",
            "expert",
          ].includes(
            response.evaluatorType
          ) ||
          ![
            "left",
            "right",
            "tie",
            "neither",
          ].includes(
            response.winner
          )
        ) {
          throw new Error(
            `Invalid or unbound role-aware blind response ${response.responseId}.`
          );
        }

        if (
          response.winner ===
            "neither" &&
          assignment.evaluationQuestionRole !==
            "abstention-near-tie"
        ) {
          throw new Error(
            "The neither verdict is allowed only for the abstention-near-tie question."
          );
        }

        const winningEngine =
          response.winner ===
            "left"
            ? assignment.leftLabel
            : response.winner ===
                "right"
              ? assignment.rightLabel
              : null;

        return {
          responseId:
            response.responseId,
          caseId:
            response.caseId,
          evaluationQuestionRole:
            assignment.evaluationQuestionRole,
          evaluatorToken:
            response.evaluatorToken,
          evaluatorType:
            response.evaluatorType,
          blinded:
            true,
          winner:
            response.winner,
          winningEngine,
          reasonDiff:
            createReasonDiff(
              assignment
            ),
        };
      }
    )
      .sort(
        (first, second) =>
          first.responseId.localeCompare(
            second.responseId
          )
      );

  const byRole =
    ROLE_ORDER.map(
      (role): StayOptiRoleAwareDeblindRoleSummaryV3 => {
        const roleJudgments =
          judgments.filter(
            (judgment) =>
              judgment.evaluationQuestionRole ===
                role
          );

        return {
          role,
          judgments:
            roleJudgments.length,
          v2Wins:
            roleJudgments.filter(
              (judgment) =>
                judgment.winningEngine ===
                  "v2"
            ).length,
          v3Wins:
            roleJudgments.filter(
              (judgment) =>
                judgment.winningEngine ===
                  "v3"
            ).length,
          ties:
            roleJudgments.filter(
              (judgment) =>
                judgment.winner ===
                  "tie"
            ).length,
          neither:
            roleJudgments.filter(
              (judgment) =>
                judgment.winner ===
                  "neither"
            ).length,
        };
      }
    );

  const reportWithoutFingerprint:
    Omit<StayOptiRoleAwareDeblindReportV3, "fingerprint"> = {
      schemaVersion:
        STAYOPTI_ROLE_AWARE_DEBLIND_SCHEMA_VERSION_V3,
      reviewVersion:
        STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
      application:
        "offline-evaluation-only",
      roleAwareGateEligible:
        true,
      bundleFingerprint:
        bundle.fingerprint,
      judgments,
      byRole,
    };

  return {
    ...reportWithoutFingerprint,
    fingerprint:
      createReportFingerprint(
        reportWithoutFingerprint
      ),
  };
}

export const STAYOPTI_ROLE_AWARE_BLIND_REVIEW_AUDIT_V3 =
  Object.freeze({
    version:
      STAYOPTI_ROLE_AWARE_BLIND_REVIEW_VERSION_V3,
    application:
      "offline-human-review-only" as const,
    legacyRealCaseReviewRoleAwareGateEligible:
      false as const,
    roleMismatchHandling:
      "reject-and-audit" as const,
    packetsSeparatedByRole:
      true as const,
    deterministicDeblind:
      true as const,
    abstentionEvaluatedSeparately:
      true as const,
    liveProviderCalls:
      false as const,
    bookingCalls:
      false as const,
    publicV2Changed:
      false as const,
    publicV3Enabled:
      false as const,
    splitEnabled:
      false as const,
    automaticPromotionAllowed:
      false as const,
  });
