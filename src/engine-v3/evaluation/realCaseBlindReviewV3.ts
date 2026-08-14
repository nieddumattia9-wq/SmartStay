import {
  buildSmartStayFrontendRuntimeV2,
  type SmartStayFrontendInputV2,
} from "../../engine-v2/frontend/smartStayFrontendAdapterV2";

import type {
  SmartStayEvaluationV2,
} from "../../engine-v2/model/smartStayEvaluationV2";

import {
  adaptV2SearchResultToDecisionV3,
} from "../adapter/v2CompatibilityAdapterV3";

import {
  createStableHashV3,
  stableSerializeV3,
} from "../contract/stableHashV3";

import {
  SMARTSTAY_BLIND_REVIEW_ASSIGNMENT_SCHEMA_VERSION_V3,
  SMARTSTAY_BLIND_REVIEW_PACKET_SCHEMA_VERSION_V3,
  SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3,
} from "../contract/versionsV3";

import {
  deriveBoundPublicRateConsistencyV3,
  createIndependentV3ComparableDecisionV3,
  createV2ComparableDecisionV3,
  runIndependentDecisionShadowV3,
  type StayOptiBoundPublicRateEvidenceInputV3,
} from "../orchestrator/independentDecisionEngineV3";

import type {
  StayOptiComparableDecisionStatusV3,
  StayOptiShadowSafetySignalsV3,
} from "../promotion/shadowCanaryPromotionV3";

import {
  createBlindEvaluationSetV3,
  createEvaluationCalibrationPlanV3,
  type StayOptiBlindEvaluationSetV3,
  type StayOptiBlindEvaluatorTypeV3,
  type StayOptiEvaluationSegmentV3,
  type StayOptiGoldenCaseTypeV3,
} from "./evaluationCalibrationV3";

export interface StayOptiRealCaseSegmentInputV3 {
  destination:
    StayOptiEvaluationSegmentV3["destination"];

  leadTime:
    StayOptiEvaluationSegmentV3["leadTime"];

  duration:
    StayOptiEvaluationSegmentV3["duration"];

  coverage:
    StayOptiEvaluationSegmentV3["coverage"];
}

export interface StayOptiRealCaseBlindReviewSourceV3 {
  caseId:
    string;

  caseType:
    StayOptiGoldenCaseTypeV3;

  segment:
    StayOptiRealCaseSegmentInputV3;

  publicRateEvidence:
    StayOptiBoundPublicRateEvidenceInputV3;

  frontendInput:
    SmartStayFrontendInputV2;
}

export interface StayOptiBlindTripContextV3 {
  profile:
    StayOptiEvaluationSegmentV3["profile"];

  destination:
    StayOptiEvaluationSegmentV3["destination"];

  leadTime:
    StayOptiEvaluationSegmentV3["leadTime"];

  duration:
    StayOptiEvaluationSegmentV3["duration"];

  coverage:
    StayOptiEvaluationSegmentV3["coverage"];

  nights:
    number | null;

  adults:
    number | null;

  children:
    number | null;

  rooms:
    number | null;

  totalBudget:
    number | null;

  maximumDistanceKm:
    number | null;

  currency:
    string | null;

  analyzedOptionCount:
    number;
}

export interface StayOptiBlindDimensionFactsV3 {
  priceValue:
    number | null;

  quality:
    number | null;

  location:
    number | null;

  comfort:
    number | null;

  flexibility:
    number | null;

  userFit:
    number | null;

  reliability:
    number | null;
}

export interface StayOptiBlindOptionFactsV3 {
  status:
    StayOptiComparableDecisionStatusV3;

  totalCost:
    number | null;

  currency:
    string | null;

  starCategory:
    number | null;

  reviewScore:
    number | null;

  reviewCountBand:
    | "none"
    | "few"
    | "established"
    | "many"
    | "very-many";

  distanceKm:
    number | null;

  refundable:
    boolean | null;

  mealIncluded:
    boolean | null;

  taxesStatus:
    | "complete"
    | "partial"
    | "unknown";

  dataConfidence:
    | "none"
    | "low"
    | "medium"
    | "high"
    | null;

  riskLevel:
    | "low"
    | "medium"
    | "high"
    | null;

  rankBand:
    | "top"
    | "strong"
    | "acceptable"
    | "weak"
    | "excluded"
    | null;

  dimensions:
    StayOptiBlindDimensionFactsV3 | null;
}

export interface StayOptiBlindReviewCaseV3 {
  caseId:
    string;

  caseType:
    StayOptiGoldenCaseTypeV3;

  context:
    StayOptiBlindTripContextV3;

  left:
    StayOptiBlindOptionFactsV3;

  right:
    StayOptiBlindOptionFactsV3;

}

export interface StayOptiBlindReviewPacketV3 {
  schemaVersion:
    typeof SMARTSTAY_BLIND_REVIEW_PACKET_SCHEMA_VERSION_V3;

  reviewVersion:
    typeof SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3;

  application:
    "offline-human-review-only";

  labelsHidden:
    true;

  providerIdentityIncluded:
    false;

  propertyIdentityIncluded:
    false;

  piiAllowed:
    false;

  publicProductChanged:
    false;

  thresholdFingerprint:
    string;

  packetId:
    string;

  cases:
    StayOptiBlindReviewCaseV3[];

  counts: {
    total:
      number;

    divergentSelection:
      number;

    divergentStatus:
      number;

    identicalDecision:
      number;
  };

  fingerprint:
    string;
}

export interface StayOptiBlindAssignmentCaseV3 {
  caseId:
    string;

  leftLabel:
    "v2" | "v3";

  rightLabel:
    "v2" | "v3";

  leftDecisionFingerprint:
    string;

  rightDecisionFingerprint:
    string;

  shadowComparisonFingerprint:
    string;

  safety:
    StayOptiShadowSafetySignalsV3;

  selectionAgreement:
    boolean;

  statusAgreement:
    boolean;

}

export interface StayOptiBlindReviewAssignmentsV3 {
  schemaVersion:
    typeof SMARTSTAY_BLIND_REVIEW_ASSIGNMENT_SCHEMA_VERSION_V3;

  reviewVersion:
    typeof SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3;

  application:
    "sealed-offline-assignment-only";

  publicProductChanged:
    false;

  automaticPromotionAllowed:
    false;

  thresholdFingerprint:
    string;

  packetId:
    string;

  assignments:
    StayOptiBlindAssignmentCaseV3[];

  fingerprint:
    string;
}

export interface StayOptiBlindReviewBundleV3 {
  packet:
    StayOptiBlindReviewPacketV3;

  assignments:
    StayOptiBlindReviewAssignmentsV3;
}

export interface StayOptiBlindReviewResponseV3 {
  responseId:
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
    "left" | "right" | "tie";
}

export interface StayOptiBlindReviewValidationV3 {
  valid:
    boolean;

  issues:
    Array<
      | "assignment-mismatch"
      | "duplicate-case"
      | "fingerprint-mismatch"
      | "invalid-assignment"
      | "invalid-packet"
      | "packet-not-blind"
    >;
}

const PROFILE_VALUES =
  new Set<StayOptiEvaluationSegmentV3["profile"]>([
    "maximum-comfort",
    "comfort",
    "balanced",
    "savings",
    "maximum-savings",
  ]);

const CASE_TYPE_VALUES =
  new Set<StayOptiGoldenCaseTypeV3>([
    "baseline",
    "adversarial",
    "counterfactual",
  ]);

const DESTINATION_VALUES =
  new Set<StayOptiEvaluationSegmentV3["destination"]>([
    "urban",
    "resort",
    "rural",
    "airport",
    "mixed",
  ]);

const LEAD_TIME_VALUES =
  new Set<StayOptiEvaluationSegmentV3["leadTime"]>([
    "same-week",
    "short",
    "medium",
    "long",
    "very-long",
  ]);

const DURATION_VALUES =
  new Set<StayOptiEvaluationSegmentV3["duration"]>([
    "one-night",
    "short-stay",
    "medium-stay",
    "long-stay",
    "extended-stay",
  ]);

const COVERAGE_VALUES =
  new Set<StayOptiEvaluationSegmentV3["coverage"]>([
    "high",
    "medium",
    "low",
    "unknown",
  ]);

function round(
  value:
    number,
  digits =
    4
) {
  const factor =
    10 ** digits;

  return Math.round(
    value * factor
  ) / factor;
}

function finiteOrNull(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
    ? round(
        value
      )
    : null;
}

function omitUndefinedValues(
  value:
    unknown
): unknown {
  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      omitUndefinedValues
    );
  }

  if (
    value !==
      null &&
    typeof value ===
      "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>
      )
        .filter(
          ([, child]) =>
            child !==
            undefined
        )
        .map(
          ([key, child]) => [
            key,
            omitUndefinedValues(
              child
            ),
          ]
        )
    );
  }

  return value;
}

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

function reviewCountBand(
  value:
    number | null
): StayOptiBlindOptionFactsV3["reviewCountBand"] {
  if (
    value ===
      null ||
    value <=
      0
  ) {
    return "none";
  }

  if (
    value <
      50
  ) {
    return "few";
  }

  if (
    value <
      250
  ) {
    return "established";
  }

  if (
    value <
      1_000
  ) {
    return "many";
  }

  return "very-many";
}

function resolveMealIncluded(
  mealPlan:
    string | null | undefined
) {
  if (
    mealPlan ===
      null ||
    mealPlan ===
      undefined ||
    mealPlan.trim().length ===
      0
  ) {
    return null;
  }

  return !/(room\s*only|no\s*meal|without\s*(meal|breakfast)|solo\s*pernottamento)/i.test(
    mealPlan
  );
}

function resolveTaxesStatus(
  evaluation:
    SmartStayEvaluationV2
): StayOptiBlindOptionFactsV3["taxesStatus"] {
  const hotel =
    evaluation.hotel;

  const unknown =
    finiteOrNull(
      hotel.unknownTaxes
    );

  if (
    finiteOrNull(
      hotel.totalKnownCost
    ) !==
      null &&
    unknown ===
      0
  ) {
    return "complete";
  }

  if (
    hotel.taxesIncluded !==
      undefined ||
    finiteOrNull(
      hotel.includedTaxes
    ) !==
      null ||
    finiteOrNull(
      hotel.excludedTaxes
    ) !==
      null
  ) {
    return "partial";
  }

  return "unknown";
}

function createAbstentionFacts(
  status:
    Exclude<
      StayOptiComparableDecisionStatusV3,
      "recommended"
  >
): StayOptiBlindOptionFactsV3 {
  return {
    status,
    totalCost:
      null,
    currency:
      null,
    starCategory:
      null,
    reviewScore:
      null,
    reviewCountBand:
      "none",
    distanceKm:
      null,
    refundable:
      null,
    mealIncluded:
      null,
    taxesStatus:
      "unknown",
    dataConfidence:
      null,
    riskLevel:
      null,
    rankBand:
      null,
    dimensions:
      null,
  };
}

function createOptionFacts(
  status:
    StayOptiComparableDecisionStatusV3,
  evaluation:
    SmartStayEvaluationV2 | null
): StayOptiBlindOptionFactsV3 {
  if (
    status !==
      "recommended"
  ) {
    return createAbstentionFacts(
      status
    );
  }

  if (
    evaluation ===
      null
  ) {
    throw new Error(
      "A recommended blind option requires one matching evaluation."
    );
  }

  const hotel =
    evaluation.hotel;

  const selectedOffer =
    hotel.offers.find(
      (offer) =>
        offer.bookable
    ) ??
    hotel.offers[0] ??
    null;

  const totalCost =
    finiteOrNull(
      hotel.totalKnownCost
    ) ??
    finiteOrNull(
      hotel.price
    );

  return {
    status,
    totalCost,
    currency:
      typeof hotel.currency ===
        "string" &&
      /^[A-Z]{3}$/.test(
        hotel.currency
      )
        ? hotel.currency
        : null,
    starCategory:
      finiteOrNull(
        hotel.stars
      ),
    reviewScore:
      finiteOrNull(
        hotel.reviewScore
      ),
    reviewCountBand:
      reviewCountBand(
        finiteOrNull(
          hotel.reviewCount
        )
      ),
    distanceKm:
      finiteOrNull(
        hotel.distance
      ),
    refundable:
      typeof selectedOffer
        ?.refundable ===
        "boolean"
        ? selectedOffer
            .refundable
        : null,
    mealIncluded:
      resolveMealIncluded(
        selectedOffer
          ?.mealPlan
      ),
    taxesStatus:
      resolveTaxesStatus(
        evaluation
      ),
    dataConfidence:
      evaluation
        .dataConfidence
        .level,
    riskLevel:
      evaluation.risk
        .level,
    rankBand:
      evaluation.final
        .rankBand,
    dimensions: {
      priceValue:
        finiteOrNull(
          evaluation.scores
            .priceValue
            .score
        ),
      quality:
        finiteOrNull(
          evaluation.scores
            .quality
            .score
        ),
      location:
        finiteOrNull(
          evaluation.scores
            .location
            .score
        ),
      comfort:
        finiteOrNull(
          evaluation.scores
            .comfort
            .score
        ),
      flexibility:
        finiteOrNull(
          evaluation.scores
            .flexibility
            .score
        ),
      userFit:
        finiteOrNull(
          evaluation.scores
            .userFit
            .score
        ),
      reliability:
        finiteOrNull(
          evaluation.scores
            .reliability
            .score
        ),
    },
  };
}

function createPacketFingerprint(
  packet:
    Omit<
      StayOptiBlindReviewPacketV3,
      "fingerprint"
    >
) {
  return createStableHashV3(
    packet,
    "stayopti-v3-real-case-blind-review-packet"
  );
}

function createAssignmentsFingerprint(
  assignments:
    Omit<
      StayOptiBlindReviewAssignmentsV3,
      "fingerprint"
    >
) {
  return createStableHashV3(
    assignments,
    "stayopti-v3-real-case-blind-review-assignments"
  );
}

function resolveProfile(
  value:
    unknown
): StayOptiEvaluationSegmentV3["profile"] {
  if (
    typeof value ===
      "string" &&
    PROFILE_VALUES.has(
      value as StayOptiEvaluationSegmentV3["profile"]
    )
  ) {
    return value as StayOptiEvaluationSegmentV3["profile"];
  }

  throw new Error(
    "Real-case capture requires an exact supported V2 preference resolution."
  );
}

function findEvaluationByToken(
  evaluations:
    readonly SmartStayEvaluationV2[],
  token:
    string | null
) {
  if (
    token ===
      null
  ) {
    return null;
  }

  const matches =
    evaluations.filter(
      (evaluation) =>
        createStableHashV3(
          {
            hotelId:
              evaluation.hotel.id,
          },
          "stayopti-v3-hotel-selection-token"
        ) ===
          token
    );

  if (
    matches.length !==
      1
  ) {
    throw new Error(
      "Blind review selection token does not map to exactly one evaluated option."
    );
  }

  return matches[0] ??
    null;
}

function shouldPlaceV3OnLeft(
  caseId:
    string,
  thresholdFingerprint:
    string
) {
  const token =
    createStableHashV3(
      {
        caseId,
        thresholdFingerprint,
      },
      "stayopti-v3-blind-side-randomization"
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

function createCase(
  source:
    StayOptiRealCaseBlindReviewSourceV3,
  thresholdFingerprint:
    string
) {
  requireOpaqueToken(
    source.caseId,
    "caseId"
  );

  if (
    !CASE_TYPE_VALUES.has(
      source.caseType
    ) ||
    !DESTINATION_VALUES.has(
      source.segment
        .destination
    ) ||
    !LEAD_TIME_VALUES.has(
      source.segment
        .leadTime
    ) ||
    !DURATION_VALUES.has(
      source.segment
        .duration
    ) ||
    !COVERAGE_VALUES.has(
      source.segment
        .coverage
    )
  ) {
    throw new Error(
      "Real-case capture contains an unknown closed case or segment value."
    );
  }

  if (
    source.frontendInput
      .bookingReferenceAt !==
      null &&
    source.frontendInput
      .bookingReferenceAt !==
      undefined
  ) {
    throw new Error(
      "Real-case capture refuses booking-reference metadata."
    );
  }

  const v2Run =
    buildSmartStayFrontendRuntimeV2(
      source.frontendInput
    );

  const profile =
    resolveProfile(
      v2Run.searchInput
        .preferenceId
    );

  const segment:
    StayOptiEvaluationSegmentV3 = {
      profile,
      destination:
        source.segment
          .destination,
      leadTime:
        source.segment
          .leadTime,
      duration:
        source.segment
          .duration,
      coverage:
        source.segment
          .coverage,
    };

  const v2Decision =
    createV2ComparableDecisionV3(
      v2Run.result
    );

  const v3SourceDecision =
    adaptV2SearchResultToDecisionV3({
      searchInput:
        v2Run.searchInput,
      result:
        v2Run.result,
    });

  const v3Decision =
    createIndependentV3ComparableDecisionV3(
      v3SourceDecision,
      v2Run.result
        .recommendationRoles
        .bestChoiceHotelId
    );

  const publicRateConsistency =
    deriveBoundPublicRateConsistencyV3({
      decision:
        v3SourceDecision,
      comparable:
        v3Decision,
      evidence:
        source.publicRateEvidence,
    });

  const expectedPublicRateConsistency =
    v3Decision.status ===
      "recommended"
      ? "verified"
      : "not-applicable";

  if (
    publicRateConsistency !==
      expectedPublicRateConsistency
  ) {
    throw new Error(
      "Blind evaluation requires verified rate-chain evidence for recommendations or decision-bound not-applicable evidence for abstentions."
    );
  }

  const shadow =
    runIndependentDecisionShadowV3({
      mode:
        "shadow",
      comparisonToken:
        createStableHashV3(
          {
            caseId:
              source.caseId,
          },
          "stayopti-v3-blind-review-comparison-token"
        ),
      segment,
      searchInput:
        v2Run.searchInput,
      publicV2Result:
        v2Run.result,
      publicRateEvidence:
        source.publicRateEvidence,
    });

  if (
    shadow.shadowObservation ===
      null ||
    shadow.shadowObservation
      .recordType !==
      "shadow-comparison"
  ) {
    throw new Error(
      "A real-case blind packet requires one valid independent shadow comparison."
    );
  }

  const v2Facts =
    createOptionFacts(
      v2Decision.status,
      findEvaluationByToken(
        v2Run.result
          .evaluations,
        v2Decision
          .selectedSolutionToken
      )
    );

  const v3Facts =
    createOptionFacts(
      v3Decision.status,
      findEvaluationByToken(
        v2Run.result
          .evaluations,
        v3Decision
          .selectedSolutionToken
      )
    );

  const v3OnLeft =
    shouldPlaceV3OnLeft(
      source.caseId,
      thresholdFingerprint
    );

  const reviewCase:
    StayOptiBlindReviewCaseV3 = {
      caseId:
        source.caseId,
      caseType:
        source.caseType,
      context: {
        ...segment,
        nights:
          finiteOrNull(
            v2Run.searchInput
              .nights
          ),
        adults:
          finiteOrNull(
            v2Run.searchInput
              .adults
          ),
        children:
          finiteOrNull(
            v2Run.searchInput
              .children
          ),
        rooms:
          finiteOrNull(
            v2Run.searchInput
              .rooms
          ),
        totalBudget:
          finiteOrNull(
            v2Run.searchInput
              .totalBudget
          ),
        maximumDistanceKm:
          finiteOrNull(
            v2Run.searchInput
              .maximumDistanceKm
          ),
        currency:
          typeof v2Run
            .searchInput
            .currency ===
            "string" &&
          /^[A-Z]{3}$/.test(
            v2Run.searchInput
              .currency
          )
            ? v2Run.searchInput
                .currency
            : null,
        analyzedOptionCount:
          v2Run.result
            .evaluations
            .length,
      },
      left:
        v3OnLeft
          ? v3Facts
          : v2Facts,
      right:
        v3OnLeft
          ? v2Facts
          : v3Facts,
    };

  const assignment:
    StayOptiBlindAssignmentCaseV3 = {
      caseId:
        source.caseId,
      leftLabel:
        v3OnLeft
          ? "v3"
          : "v2",
      rightLabel:
        v3OnLeft
          ? "v2"
          : "v3",
      leftDecisionFingerprint:
        v3OnLeft
          ? v3Decision
              .decisionFingerprint
          : v2Decision
              .decisionFingerprint,
      rightDecisionFingerprint:
        v3OnLeft
          ? v2Decision
              .decisionFingerprint
          : v3Decision
              .decisionFingerprint,
      shadowComparisonFingerprint:
        shadow.shadowObservation
          .fingerprint,
      safety: {
        ...shadow
          .shadowObservation
          .safety,
      },
      selectionAgreement:
        shadow.shadowObservation
          .diff
          .selectionAgreement,
      statusAgreement:
        shadow.shadowObservation
          .diff
          .statusAgreement,
    };

  return {
    reviewCase,
    assignment,
    sourceFingerprint:
      createStableHashV3(
        {
          caseId:
            source.caseId,
          caseType:
            source.caseType,
          segment,
          searchInput:
            omitUndefinedValues(
              v2Run.searchInput
            ),
          v2ResultFingerprint:
            createStableHashV3(
              v2Run.result,
              "stayopti-v3-blind-review-v2-result"
            ),
        },
        "stayopti-v3-blind-review-source-case"
      ),
  };
}

export function createRealCaseBlindReviewBundleV3(
  sources:
    readonly StayOptiRealCaseBlindReviewSourceV3[]
): StayOptiBlindReviewBundleV3 {
  if (
    sources.length ===
      0
  ) {
    throw new Error(
      "Real-case blind review requires at least one source case."
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
      "Real-case blind review case IDs must be unique."
    );
  }

  const sourceSetFingerprint =
    createStableHashV3(
      sources
        .map(
          (source) => ({
            caseId:
              source.caseId,
            caseType:
              source.caseType,
            segment: {
              ...source.segment,
            },
            publicRateEvidenceFingerprint:
              source.publicRateEvidence
                .evidenceFingerprint,
          })
        )
        .sort(
          (first, second) =>
            first.caseId.localeCompare(
              second.caseId
            )
        ),
      "stayopti-v3-real-case-source-set"
    );

  const plan =
    createEvaluationCalibrationPlanV3({
      sourceDecisionInputFingerprint:
        sourceSetFingerprint,
    });

  const built =
    sources
      .map(
        (source) =>
          createCase(
            source,
            plan.thresholdFreeze
              .thresholdFingerprint
          )
      )
      .sort(
        (first, second) =>
          first.reviewCase
            .caseId
            .localeCompare(
              second.reviewCase
                .caseId
            )
      );

  const packetId =
    createStableHashV3(
      {
        sourceSetFingerprint,
        sourceFingerprints:
          built.map(
            (item) =>
              item.sourceFingerprint
          ),
        thresholdFingerprint:
          plan.thresholdFreeze
            .thresholdFingerprint,
      },
      "stayopti-v3-real-case-blind-review-packet-id"
    );

  const packetWithoutFingerprint:
    Omit<
      StayOptiBlindReviewPacketV3,
      "fingerprint"
    > = {
      schemaVersion:
        SMARTSTAY_BLIND_REVIEW_PACKET_SCHEMA_VERSION_V3,
      reviewVersion:
        SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3,
      application:
        "offline-human-review-only",
      labelsHidden:
        true,
      providerIdentityIncluded:
        false,
      propertyIdentityIncluded:
        false,
      piiAllowed:
        false,
      publicProductChanged:
        false,
      thresholdFingerprint:
        plan.thresholdFreeze
          .thresholdFingerprint,
      packetId,
      cases:
        built.map(
          (item) =>
            item.reviewCase
        ),
      counts: {
        total:
          built.length,
        divergentSelection:
          built.filter(
            (item) =>
              !item.assignment
                .selectionAgreement
          ).length,
        divergentStatus:
          built.filter(
            (item) =>
              !item.assignment
                .statusAgreement
          ).length,
        identicalDecision:
          built.filter(
            (item) =>
              item.assignment
                .selectionAgreement &&
              item.assignment
                .statusAgreement
          ).length,
      },
    };

  const assignmentsWithoutFingerprint:
    Omit<
      StayOptiBlindReviewAssignmentsV3,
      "fingerprint"
    > = {
      schemaVersion:
        SMARTSTAY_BLIND_REVIEW_ASSIGNMENT_SCHEMA_VERSION_V3,
      reviewVersion:
        SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3,
      application:
        "sealed-offline-assignment-only",
      publicProductChanged:
        false,
      automaticPromotionAllowed:
        false,
      thresholdFingerprint:
        plan.thresholdFreeze
          .thresholdFingerprint,
      packetId,
      assignments:
        built.map(
          (item) =>
            item.assignment
        ),
    };

  const bundle = {
    packet: {
      ...packetWithoutFingerprint,
      fingerprint:
        createPacketFingerprint(
          packetWithoutFingerprint
        ),
    },
    assignments: {
      ...assignmentsWithoutFingerprint,
      fingerprint:
        createAssignmentsFingerprint(
          assignmentsWithoutFingerprint
        ),
    },
  } satisfies StayOptiBlindReviewBundleV3;

  const validation =
    validateRealCaseBlindReviewBundleV3(
      bundle
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Generated blind review bundle is invalid: ${validation.issues.join(", ")}.`
    );
  }

  return bundle;
}

function findAssignmentFieldPaths(
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
        findAssignmentFieldPaths(
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
        /^(engine|engineVersion|provider|providerId|providerName|propertyId|propertyName|hotelId|hotelName|leftLabel|rightLabel|decisionFingerprint)$/i.test(
          key
        )
          ? [
              `${path}.${key}`,
            ]
          : []
      ),
      ...findAssignmentFieldPaths(
        child,
        `${path}.${key}`
      ),
    ]
  );
}

export function validateRealCaseBlindReviewBundleV3(
  bundle:
    StayOptiBlindReviewBundleV3
): StayOptiBlindReviewValidationV3 {
  const issues:
    StayOptiBlindReviewValidationV3["issues"] = [];

  const packet =
    bundle.packet;

  const assignments =
    bundle.assignments;

  if (
    packet.schemaVersion !==
      SMARTSTAY_BLIND_REVIEW_PACKET_SCHEMA_VERSION_V3 ||
    packet.reviewVersion !==
      SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3 ||
    packet.application !==
      "offline-human-review-only" ||
    packet.labelsHidden !==
      true ||
    packet.providerIdentityIncluded !==
      false ||
    packet.propertyIdentityIncluded !==
      false ||
    packet.piiAllowed !==
      false ||
    packet.publicProductChanged !==
      false ||
    packet.counts.total !==
      packet.cases.length
  ) {
    issues.push(
      "invalid-packet"
    );
  }

  if (
    assignments.schemaVersion !==
      SMARTSTAY_BLIND_REVIEW_ASSIGNMENT_SCHEMA_VERSION_V3 ||
    assignments.reviewVersion !==
      SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3 ||
    assignments.application !==
      "sealed-offline-assignment-only" ||
    assignments.publicProductChanged !==
      false ||
    assignments.automaticPromotionAllowed !==
      false
  ) {
    issues.push(
      "invalid-assignment"
    );
  }

  const {
    fingerprint:
      packetFingerprint,
    ...packetWithoutFingerprint
  } = packet;

  const {
    fingerprint:
      assignmentsFingerprint,
    ...assignmentsWithoutFingerprint
  } = assignments;

  if (
    packetFingerprint !==
      createPacketFingerprint(
        packetWithoutFingerprint
      ) ||
    assignmentsFingerprint !==
      createAssignmentsFingerprint(
        assignmentsWithoutFingerprint
      )
  ) {
    issues.push(
      "fingerprint-mismatch"
    );
  }

  if (
    packet.packetId !==
      assignments.packetId ||
    packet.thresholdFingerprint !==
      assignments.thresholdFingerprint ||
    packet.cases.length !==
      assignments.assignments.length
  ) {
    issues.push(
      "assignment-mismatch"
    );
  }

  const packetIds =
    packet.cases.map(
      (item) =>
        item.caseId
    );

  const assignmentIds =
    assignments.assignments.map(
      (item) =>
        item.caseId
    );

  if (
    new Set(
      packetIds
    ).size !==
      packetIds.length ||
    new Set(
      assignmentIds
    ).size !==
      assignmentIds.length
  ) {
    issues.push(
      "duplicate-case"
    );
  }

  if (
    stableSerializeV3(
      [...packetIds].sort()
    ) !==
      stableSerializeV3(
        [...assignmentIds].sort()
      )
  ) {
    issues.push(
      "assignment-mismatch"
    );
  }

  if (
    assignments.assignments.some(
      (assignment) =>
        assignment.leftLabel ===
          assignment.rightLabel ||
        ![
          "v2",
          "v3",
        ].includes(
          assignment.leftLabel
        ) ||
        ![
          "v2",
          "v3",
        ].includes(
          assignment.rightLabel
        )
    )
  ) {
    issues.push(
      "invalid-assignment"
    );
  }

  if (
    findAssignmentFieldPaths(
      packet
    ).length >
      0
  ) {
    issues.push(
      "packet-not-blind"
    );
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

export function createBlindEvaluationFromReviewResponsesV3(
  bundle:
    StayOptiBlindReviewBundleV3,
  responses:
    readonly StayOptiBlindReviewResponseV3[]
): StayOptiBlindEvaluationSetV3 {
  const validation =
    validateRealCaseBlindReviewBundleV3(
      bundle
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Blind review bundle is invalid: ${validation.issues.join(", ")}.`
    );
  }

  const validCaseIds =
    new Set(
      bundle.packet
        .cases.map(
          (item) =>
            item.caseId
        )
    );

  const assignmentByCaseId =
    new Map(
      bundle.assignments
        .assignments.map(
          (item) => [
            item.caseId,
            item,
          ] as const
        )
    );

  return createBlindEvaluationSetV3(
    responses.map(
      (response) => {
        if (
          !validCaseIds.has(
            response.caseId
          )
        ) {
          throw new Error(
            `Blind response references unknown case ${response.caseId}.`
          );
        }

        const assignment =
          assignmentByCaseId.get(
            response.caseId
          );

        if (
          assignment ===
            undefined
        ) {
          throw new Error(
            `Blind response has no sealed assignment for ${response.caseId}.`
          );
        }

        return {
          judgmentId:
            response.responseId,
          caseId:
            response.caseId,
          evaluatorToken:
            response.evaluatorToken,
          evaluatorType:
            response.evaluatorType,
          blinded:
            response.blinded,
          leftEngine:
            assignment.leftLabel,
          rightEngine:
            assignment.rightLabel,
          winner:
            response.winner,
        };
      }
    )
  );
}

function escapeEmbeddedJson(
  value:
    unknown
) {
  return JSON.stringify(
    value
  )
    .replaceAll(
      "<",
      "\\u003c"
    )
    .replaceAll(
      ">",
      "\\u003e"
    )
    .replaceAll(
      "&",
      "\\u0026"
    );
}

export function renderBlindReviewHtmlV3(
  packet:
    StayOptiBlindReviewPacketV3
) {
  const {
    fingerprint,
    ...withoutFingerprint
  } = packet;

  const caseIds =
    packet.cases.map(
      (item) =>
        item.caseId
    );

  if (
    packet.schemaVersion !==
      SMARTSTAY_BLIND_REVIEW_PACKET_SCHEMA_VERSION_V3 ||
    packet.reviewVersion !==
      SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3 ||
    packet.application !==
      "offline-human-review-only" ||
    packet.labelsHidden !==
      true ||
    packet.providerIdentityIncluded !==
      false ||
    packet.propertyIdentityIncluded !==
      false ||
    packet.piiAllowed !==
      false ||
    packet.publicProductChanged !==
      false ||
    packet.counts.total !==
      packet.cases.length ||
    new Set(
      caseIds
    ).size !==
      caseIds.length ||
    findAssignmentFieldPaths(
      packet
    ).length >
      0 ||
    fingerprint !==
      createPacketFingerprint(
        withoutFingerprint
      )
  ) {
    throw new Error(
      "Cannot render an invalid or non-blind review packet."
    );
  }

  const serializedPacket =
    escapeEmbeddedJson(
      packet
    );

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>StayOpti - valutazione cieca offline</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, Segoe UI, sans-serif; background: #0b1020; color: #eef2ff; }
    body { margin: 0; padding: 24px; }
    main { max-width: 1050px; margin: 0 auto; }
    .panel { background: #141b31; border: 1px solid #2b3557; border-radius: 16px; padding: 20px; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: #0f162a; border: 1px solid #344168; border-radius: 14px; padding: 18px; }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
    .facts span:nth-child(odd) { color: #aeb9dc; }
    button, select, input { font: inherit; border-radius: 10px; border: 1px solid #50608f; padding: 10px 14px; }
    button { background: #23345f; color: #fff; cursor: pointer; }
    button:hover { background: #304778; }
    .choices { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 18px; }
    .muted { color: #aeb9dc; }
    .hidden { display: none; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } body { padding: 12px; } }
  </style>
</head>
<body>
<main>
  <h1>Valutazione cieca StayOpti</h1>
  <p class="muted">Offline. Le etichette dei due motori non sono incluse in questo file.</p>
  <section id="setup" class="panel">
    <label>Token valutatore (minimo 8 caratteri) <input id="token" autocomplete="off"></label>
    <label>Tipo <select id="kind"><option value="human">Utente</option><option value="expert">Esperto</option></select></label>
    <button id="start">Inizia</button>
  </section>
  <section id="review" class="panel hidden">
    <p id="progress" class="muted"></p>
    <h2 id="caseTitle"></h2>
    <p id="context"></p>
    <div class="grid"><article id="left" class="card"></article><article id="right" class="card"></article></div>
    <div class="choices">
      <button data-winner="left">Preferisco sinistra</button>
      <button data-winner="tie">Pari / equivalenti</button>
      <button data-winner="right">Preferisco destra</button>
    </div>
  </section>
  <section id="done" class="panel hidden">
    <h2>Valutazione completata</h2>
    <button id="download">Scarica risposte JSON</button>
  </section>
</main>
<script>
const packet = ${serializedPacket};
const responses = [];
let index = 0;
let evaluatorToken = "";
let evaluatorType = "human";
const text = (value) => value === null || value === undefined ? "non disponibile" : String(value);
function optionHtml(title, option) {
  if (option.status !== "recommended") return "<h3>" + title + "</h3><p>Il sistema preferisce non raccomandare una struttura con i dati disponibili.</p>";
  const d = option.dimensions || {};
  return [
    "<h3>", title, '</h3><div class="facts">',
    "<span>Costo totale</span><b>", text(option.totalCost), " ", text(option.currency), "</b>",
    "<span>Categoria</span><b>", text(option.starCategory), " stelle</b>",
    "<span>Recensioni</span><b>", text(option.reviewScore), " (", text(option.reviewCountBand), ")</b>",
    "<span>Distanza</span><b>", text(option.distanceKm), " km</b>",
    "<span>Rimborsabile</span><b>", text(option.refundable), "</b>",
    "<span>Pasti inclusi</span><b>", text(option.mealIncluded), "</b>",
    "<span>Tasse</span><b>", text(option.taxesStatus), "</b>",
    "<span>Rischio</span><b>", text(option.riskLevel), "</b>",
    "<span>Prezzo/valore</span><b>", text(d.priceValue), "</b>",
    "<span>Qualita</span><b>", text(d.quality), "</b>",
    "<span>Posizione</span><b>", text(d.location), "</b>",
    "<span>Comfort</span><b>", text(d.comfort), "</b>",
    "<span>Flessibilita</span><b>", text(d.flexibility), "</b>",
    "<span>Fit utente</span><b>", text(d.userFit), "</b></div>"
  ].join("");
}
function showCase() {
  if (index >= packet.cases.length) {
    document.getElementById("review").classList.add("hidden");
    document.getElementById("done").classList.remove("hidden");
    return;
  }
  const item = packet.cases[index];
  document.getElementById("progress").textContent = "Caso " + (index + 1) + " di " + packet.cases.length;
  document.getElementById("caseTitle").textContent = item.caseId;
  document.getElementById("context").textContent = item.context.profile + "; " + item.context.destination + "; " + text(item.context.nights) + " notti; budget " + text(item.context.totalBudget) + " " + text(item.context.currency) + "; " + item.context.analyzedOptionCount + " opzioni analizzate.";
  document.getElementById("left").innerHTML = optionHtml("Opzione sinistra", item.left);
  document.getElementById("right").innerHTML = optionHtml("Opzione destra", item.right);
}
document.getElementById("start").addEventListener("click", () => {
  evaluatorToken = document.getElementById("token").value.trim();
  evaluatorType = document.getElementById("kind").value;
  if (!/^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(evaluatorToken)) { alert("Inserisci un token opaco di almeno 8 caratteri."); return; }
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("review").classList.remove("hidden");
  showCase();
});
document.querySelectorAll("[data-winner]").forEach((button) => button.addEventListener("click", () => {
  const item = packet.cases[index];
  responses.push({ responseId: evaluatorToken + ":" + String(index + 1).padStart(4, "0"), caseId: item.caseId, evaluatorToken, evaluatorType, blinded: true, winner: button.dataset.winner });
  index += 1;
  showCase();
}));
document.getElementById("download").addEventListener("click", () => {
  const payload = JSON.stringify({ packetId: packet.packetId, packetFingerprint: packet.fingerprint, responses }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "stayopti-blind-responses-" + evaluatorToken + ".json";
  anchor.click();
  URL.revokeObjectURL(url);
});
</script>
</body>
</html>`;
}

export const STAYOPTI_REAL_CASE_BLIND_REVIEW_AUDIT_V3 =
  Object.freeze({
    version:
      SMARTSTAY_REAL_CASE_BLIND_REVIEW_VERSION_V3,
    application:
      "offline-human-review-only" as const,
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
