import type {
  SmartStayFrontendRuntimeV2,
} from "../../engine-v2/frontend/smartStayFrontendAdapterV2";

import {
  createStableHashV3,
} from "../contract/stableHashV3";

import {
  runIndependentDecisionShadowV3,
  type RunIndependentDecisionShadowResultV3,
  type StayOptiBoundPublicRateEvidenceV3,
} from "../orchestrator/independentDecisionEngineV3";

import type {
  StayOptiEvaluationSegmentV3,
} from "../evaluation/evaluationCalibrationV3";

import type {
  StayOptiShadowObservationV3,
} from "../promotion/shadowCanaryPromotionV3";

export type StayOptiFrontendShadowRuntimeModeV3 =
  | "off"
  | "shadow";

export interface RunFrontendIndependentShadowRuntimeInputV3 {
  mode:
    StayOptiFrontendShadowRuntimeModeV3;
  sourceToken:
    string;
  runtime:
    SmartStayFrontendRuntimeV2;
  publicRateEvidence?:
    StayOptiBoundPublicRateEvidenceV3;
}

const MAX_BUFFERED_OBSERVATIONS =
  100;

const shadowBuffer:
  StayOptiShadowObservationV3[] =
    [];

function resolveProfile(
  preferenceId: unknown
): StayOptiEvaluationSegmentV3["profile"] {
  return preferenceId ===
      "maximum-comfort" ||
    preferenceId ===
      "comfort" ||
    preferenceId ===
      "balanced" ||
    preferenceId ===
      "savings" ||
    preferenceId ===
      "maximum-savings"
    ? preferenceId
    : "balanced";
}

function resolveDuration(
  nights: unknown
): StayOptiEvaluationSegmentV3["duration"] {
  if (
    typeof nights !==
      "number" ||
    !Number.isInteger(
      nights
    ) ||
    nights <
      1
  ) {
    return "medium-stay";
  }

  if (
    nights ===
      1
  ) {
    return "one-night";
  }

  if (
    nights <=
      4
  ) {
    return "short-stay";
  }

  if (
    nights <=
      9
  ) {
    return "medium-stay";
  }

  if (
    nights <=
      20
  ) {
    return "long-stay";
  }

  return "extended-stay";
}

function parseDateOnlyUtc(
  value: unknown
) {
  if (
    typeof value !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      `${value}T00:00:00.000Z`
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : null;
}

function resolveLeadTime(
  checkIn: unknown,
  bookingReferenceAt: unknown
): StayOptiEvaluationSegmentV3["leadTime"] {
  const checkInTimestamp =
    parseDateOnlyUtc(
      checkIn
    );

  const referenceTimestamp =
    typeof bookingReferenceAt ===
      "string"
      ? Date.parse(
          bookingReferenceAt
        )
      : Number.NaN;

  if (
    checkInTimestamp ===
      null ||
    !Number.isFinite(
      referenceTimestamp
    )
  ) {
    return "medium";
  }

  const days =
    Math.max(
      0,
      Math.floor(
        (
          checkInTimestamp -
          referenceTimestamp
        ) /
          86_400_000
      )
    );

  if (
    days <=
      6
  ) {
    return "same-week";
  }

  if (
    days <=
      20
  ) {
    return "short";
  }

  if (
    days <=
      60
  ) {
    return "medium";
  }

  if (
    days <=
      180
  ) {
    return "long";
  }

  return "very-long";
}

function resolveCoverage(
  runtime:
    SmartStayFrontendRuntimeV2
): StayOptiEvaluationSegmentV3["coverage"] {
  const evaluations =
    runtime.result
      .evaluations;

  if (
    evaluations.length ===
      0
  ) {
    return "unknown";
  }

  const eligibleRatio =
    evaluations.filter(
      (evaluation) =>
        evaluation
          .reliabilityGate
          .eligible
    ).length /
    evaluations.length;

  if (
    eligibleRatio >=
      0.8
  ) {
    return "high";
  }

  if (
    eligibleRatio >=
      0.5
  ) {
    return "medium";
  }

  return "low";
}

export function deriveFrontendShadowSegmentV3(
  runtime:
    SmartStayFrontendRuntimeV2
): StayOptiEvaluationSegmentV3 {
  return {
    profile:
      resolveProfile(
        runtime.searchInput
          .preferenceId
      ),
    destination:
      "mixed",
    leadTime:
      resolveLeadTime(
        runtime.searchInput
          .checkIn,
        runtime.searchInput
          .bookingReferenceAt
      ),
    duration:
      resolveDuration(
        runtime.searchInput
          .nights
      ),
    coverage:
      resolveCoverage(
        runtime
      ),
  };
}

function createComparisonToken(
  sourceToken: string,
  runtime:
    SmartStayFrontendRuntimeV2
) {
  if (
    typeof sourceToken !==
      "string" ||
    sourceToken.trim().length ===
      0 ||
    sourceToken.length >
      512
  ) {
    throw new Error(
      "V3 frontend shadow runtime requires one bounded opaque source token."
    );
  }

  return createStableHashV3(
    {
      sourceToken,
      engineVersion:
        runtime.result
          .engineVersion,
      pipelineVersion:
        runtime.result
          .pipelineVersion,
      hotelCount:
        runtime.result
          .evaluations
          .length,
    },
    "stayopti-v3-frontend-shadow-comparison"
  );
}

function recordObservation(
  observation:
    StayOptiShadowObservationV3 |
    null
) {
  if (
    observation ===
      null
  ) {
    return;
  }

  shadowBuffer.push(
    structuredClone(
      observation
    )
  );

  if (
    shadowBuffer.length >
      MAX_BUFFERED_OBSERVATIONS
  ) {
    shadowBuffer.splice(
      0,
      shadowBuffer.length -
        MAX_BUFFERED_OBSERVATIONS
    );
  }
}

export function runFrontendIndependentShadowRuntimeV3(
  input:
    RunFrontendIndependentShadowRuntimeInputV3
): RunIndependentDecisionShadowResultV3 {
  const result =
    runIndependentDecisionShadowV3({
      mode:
        input.mode,
      comparisonToken:
        createComparisonToken(
          input.sourceToken,
          input.runtime
        ),
      segment:
        deriveFrontendShadowSegmentV3(
          input.runtime
        ),
      searchInput:
        input.runtime
          .searchInput,
      publicV2Result:
        input.runtime
          .result,
      publicRateEvidence:
        input.publicRateEvidence,
    });

  recordObservation(
    result.shadowObservation
  );

  return result;
}

export function readFrontendShadowBufferV3() {
  return structuredClone(
    shadowBuffer
  );
}

export function resetFrontendShadowBufferV3() {
  shadowBuffer.splice(
    0,
    shadowBuffer.length
  );
}

export const STAYOPTI_FRONTEND_SHADOW_RUNTIME_AUDIT_V3 =
  Object.freeze({
    defaultMode:
      "off" as const,
    publicServingEngine:
      "v2" as const,
    externalTransmission:
      false as const,
    maximumBufferedObservations:
      MAX_BUFFERED_OBSERVATIONS,
    splitEnabled:
      false as const,
  });
