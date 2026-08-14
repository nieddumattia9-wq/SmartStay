import {
  isStableHashV3,
  createStableHashV3,
} from "../contract/stableHashV3";

import {
  uniqueReasonCodesV3,
  type SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import type {
  StayOptiPreferenceIdV3,
  StayOptiTripTypeV3,
} from "../utility/personalUtilityV3";

export type StayOptiContextualEvidenceSourceV3 =
  | "provider-structured"
  | "routing-engine"
  | "transit-timetable"
  | "provider-travel-time"
  | "user-declared"
  | "calibrated-model"
  | "derived-canonical"
  | "semantic-inference"
  | "straight-line"
  | "unverified"
  | "unknown";

export interface StayOptiContextualEvidenceV3 {
  source: StayOptiContextualEvidenceSourceV3;
  confidence: number;
  evidenceIds: string[];
}

export type StayOptiTravelPointCategoryV3 =
  | "primary"
  | "transport"
  | "business"
  | "venue"
  | "beach"
  | "family"
  | "grocery"
  | "other";

export type StayOptiTravelModeV3 =
  | "walk"
  | "transit"
  | "drive"
  | "cycle"
  | "mixed"
  | "unknown";

export interface StayOptiTravelPointInputV3
  extends StayOptiContextualEvidenceV3 {
  pointId: string;
  category: StayOptiTravelPointCategoryV3;
  importance: number;
  travelTimeMinutes: number | null;
  mode: StayOptiTravelModeV3;
}

export interface StayOptiDestinationContextV3
  extends StayOptiContextualEvidenceV3 {
  contextId: string;
  travelCategoryWeightOverrides?: Partial<
    Record<StayOptiTravelPointCategoryV3, number>
  >;
  capabilityWeightMultipliers?: Partial<
    Record<StayOptiContextualCapabilityCodeV3, number>
  >;
}

export type StayOptiContextualCapabilityCodeV3 =
  | "kitchen"
  | "laundry"
  | "workspace"
  | "family-room"
  | "private-bathroom"
  | "crib"
  | "elevator"
  | "front-desk"
  | "luggage-storage"
  | "self-check-in"
  | "air-conditioning";

export interface StayOptiContextualCapabilityInputV3
  extends StayOptiContextualEvidenceV3 {
  code: StayOptiContextualCapabilityCodeV3;
  state: boolean | null;
}

export type StayOptiRoomAttributeCodeV3 =
  | "floor-area"
  | "bed-capacity"
  | "private-bathroom"
  | "kitchen"
  | "workspace"
  | "view"
  | "balcony"
  | "accessibility";

export interface StayOptiRoomAttributeInputV3
  extends StayOptiContextualEvidenceV3 {
  code: StayOptiRoomAttributeCodeV3;
  state: boolean | null;
}

export interface StayOptiRoomOptionInputV3 {
  offerId: string;
  roomName: string | null;
  totalCost: number | null;
  currency: string | null;
  bookable: boolean;
  comparisonScopeFingerprint: string;
  tierRank: number | null;
  tierSource:
    | "provider-structured"
    | "semantic-inference"
    | "unknown";
  attributes: StayOptiRoomAttributeInputV3[];
  evidenceIds: string[];
}

export interface StayOptiCancellationInputV3
  extends StayOptiContextualEvidenceV3 {
  policyKnown: boolean;
  refundable: boolean | null;
  freeCancellationUntil: string | null;
  penaltyAmount: number | null;
  penaltyCurrency: string | null;
  changeProbability: {
    value: number;
    source: "user-declared" | "calibrated-model";
    confidence: number;
    evidenceIds: string[];
  } | null;
}

export interface StayOptiPaymentInputV3
  extends StayOptiContextualEvidenceV3 {
  timing:
    | "pay-now"
    | "pay-later"
    | "pay-at-property"
    | "unknown";
  deferralDays: number | null;
  annualValueRate: {
    value: number;
    source: "user-declared" | "calibrated-model";
    confidence: number;
    evidenceIds: string[];
  } | null;
}

export type StayOptiFrictionSignalCodeV3 =
  | "front-desk"
  | "self-check-in"
  | "luggage-storage"
  | "elevator"
  | "arrival-window"
  | "transport-changes"
  | "property-access"
  | "rules-complexity";

export interface StayOptiFrictionSignalInputV3
  extends StayOptiContextualEvidenceV3 {
  code: StayOptiFrictionSignalCodeV3;
  convenienceImpact: number;
  weight: number;
}

export interface EvaluateStayOptiContextualCandidateInputV3 {
  hotelId: string;
  totalCost: number | null;
  currency: string | null;
  straightLineDistanceKm: number | null;
  straightLineEvidenceIds: string[];
  travelPoints: StayOptiTravelPointInputV3[];
  selectedRoom: StayOptiRoomOptionInputV3 | null;
  roomAlternatives: StayOptiRoomOptionInputV3[];
  cancellation: StayOptiCancellationInputV3 | null;
  payment: StayOptiPaymentInputV3 | null;
  capabilities: StayOptiContextualCapabilityInputV3[];
  frictionSignals: StayOptiFrictionSignalInputV3[];
  evidenceIds: string[];
}

export interface StayOptiContextualStayContextV3 {
  preferenceId: StayOptiPreferenceIdV3;
  tripType: StayOptiTripTypeV3;
  nights: number | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  leadTimeDays: number | null;
  destination: StayOptiDestinationContextV3 | null;
}

export interface EvaluateStayOptiContextualStayValueInputV3 {
  context: StayOptiContextualStayContextV3;
  candidates: EvaluateStayOptiContextualCandidateInputV3[];
}

export interface StayOptiTripSpecificLocationV3 {
  status: "usable" | "unavailable";
  weightedTravelTimeMinutes: number | null;
  locationScore: number | null;
  usedPointIds: string[];
  excludedPointIds: string[];
  straightLineDistanceKm: number | null;
  destinationAdjusted: boolean;
  evidenceIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiRoomUpgradeEvaluationV3 {
  status: "worthwhile" | "not-worthwhile" | "unavailable";
  selectedOfferId: string | null;
  alternativeOfferId: string | null;
  premiumAmount: number | null;
  premiumRatio: number | null;
  tierGain: number | null;
  attributeGain: number | null;
  maximumPremiumRatio: number | null;
  evidenceIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiFlexibilityValueV3 {
  status: "usable" | "partial" | "unavailable";
  cancellationProtectionAmount: number | null;
  cancellationProtectionScore: number | null;
  expectedCancellationValue: number | null;
  paymentTiming:
    | "pay-now"
    | "pay-later"
    | "pay-at-property"
    | "unknown";
  paymentTimingValue: number | null;
  currency: string | null;
  evidenceIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiContextInteractionV3 {
  code:
    | "group-utility"
    | "family-utility"
    | "long-stay-utility";
  capabilityCode: StayOptiContextualCapabilityCodeV3;
  state: boolean;
  utilityDelta: number;
  destinationAdjusted: boolean;
  evidenceIds: string[];
}

export interface StayOptiContextInteractionEvaluationV3 {
  status: "usable" | "unavailable";
  utilityDelta: number | null;
  interactions: StayOptiContextInteractionV3[];
  evidenceIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export interface StayOptiConvenienceEvaluationV3 {
  status: "usable" | "partial" | "unavailable";
  convenienceIndex: number | null;
  decisionFrictionScore: number | null;
  usableSignalCount: number;
  suppliedSignalCount: number;
  evidenceIds: string[];
  reasonCodes: SmartStayReasonCodeV3[];
}

export type StayOptiContextualSignalIdV3 =
  | "travel-time-location"
  | "room-upgrade"
  | "cancellation-value"
  | "payment-timing-value"
  | "group-long-stay-utility"
  | "decision-friction";

export interface StayOptiContextualCandidateEvaluationV3 {
  hotelId: string;
  status: "usable" | "partial" | "unavailable";
  location: StayOptiTripSpecificLocationV3;
  roomUpgrade: StayOptiRoomUpgradeEvaluationV3;
  flexibility: StayOptiFlexibilityValueV3;
  contextInteractions: StayOptiContextInteractionEvaluationV3;
  convenience: StayOptiConvenienceEvaluationV3;
  activeSignals: StayOptiContextualSignalIdV3[];
  inactiveSignals: StayOptiContextualSignalIdV3[];
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiContextualStayValueEvaluationV3 {
  evaluationId: string;
  phase: "v3-06";
  rankingApplication: "shadow-only";
  publicPresentation: "disabled";
  decisionGainGate: {
    status: "pending-golden-dataset";
    rankingEnabled: false;
    publicCopyEnabled: false;
  };
  context: StayOptiContextualStayContextV3;
  candidates: StayOptiContextualCandidateEvaluationV3[];
  usableCandidateCount: number;
  activeSignalCount: number;
  reasonCodes: SmartStayReasonCodeV3[];
  fingerprint: string;
}

export interface StayOptiContextualStayValueValidationV3 {
  valid: boolean;
  issues: string[];
}

const MINIMUM_EVIDENCE_CONFIDENCE = 0.6;
const MINIMUM_CONVENIENCE_SIGNALS = 2;

const DIRECT_TRAVEL_SOURCES = new Set<StayOptiContextualEvidenceSourceV3>([
  "routing-engine",
  "transit-timetable",
  "provider-travel-time",
]);

const STRONG_CONTEXT_SOURCES = new Set<StayOptiContextualEvidenceSourceV3>([
  "provider-structured",
  "routing-engine",
  "transit-timetable",
  "provider-travel-time",
  "user-declared",
  "calibrated-model",
  "derived-canonical",
]);

const TRIP_POINT_WEIGHTS: Readonly<
  Record<StayOptiTripTypeV3, Readonly<Record<StayOptiTravelPointCategoryV3, number>>>
> = {
  leisure: { primary: 1.3, transport: 1, business: 0.6, venue: 1.2, beach: 1.1, family: 0.8, grocery: 0.7, other: 0.7 },
  business: { primary: 1.2, transport: 1.25, business: 1.5, venue: 0.8, beach: 0.5, family: 0.5, grocery: 0.7, other: 0.6 },
  family: { primary: 1.1, transport: 1.1, business: 0.5, venue: 0.9, beach: 1, family: 1.5, grocery: 1, other: 0.8 },
  group: { primary: 1.2, transport: 1.15, business: 0.6, venue: 1.1, beach: 0.9, family: 0.8, grocery: 0.9, other: 0.8 },
  "long-stay": { primary: 1.1, transport: 1.1, business: 0.7, venue: 0.8, beach: 0.9, family: 0.8, grocery: 1.4, other: 0.8 },
  mixed: { primary: 1.2, transport: 1.1, business: 0.8, venue: 1, beach: 0.9, family: 0.9, grocery: 0.9, other: 0.8 },
};

const ROOM_PREMIUM_LIMITS: Readonly<Record<StayOptiPreferenceIdV3, number>> = {
  "maximum-comfort": 0.14,
  comfort: 0.1,
  balanced: 0.07,
  savings: 0.04,
  "maximum-savings": 0.02,
};

const LONG_STAY_CAPABILITY_DELTAS: Partial<Record<StayOptiContextualCapabilityCodeV3, number>> = {
  kitchen: 6,
  laundry: 6,
  workspace: 3,
  "air-conditioning": 2,
};

const GROUP_CAPABILITY_DELTAS: Partial<Record<StayOptiContextualCapabilityCodeV3, number>> = {
  "family-room": 6,
  "private-bathroom": 4,
  elevator: 2,
  "luggage-storage": 2,
};

const FAMILY_CAPABILITY_DELTAS: Partial<Record<StayOptiContextualCapabilityCodeV3, number>> = {
  ...GROUP_CAPABILITY_DELTAS,
  crib: 4,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegative(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function normalizeCurrency(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value.trim().toUpperCase())
    ? value.trim().toUpperCase()
    : null;
}

function hasUsableEvidence(input: StayOptiContextualEvidenceV3) {
  return STRONG_CONTEXT_SOURCES.has(input.source) &&
    isFiniteNumber(input.confidence) &&
    input.confidence >= MINIMUM_EVIDENCE_CONFIDENCE &&
    input.confidence <= 1 &&
    uniqueSorted(input.evidenceIds).length > 0;
}

function destinationIsUsable(destination: StayOptiDestinationContextV3 | null) {
  return destination !== null && hasUsableEvidence(destination);
}

function evaluateLocation(
  candidate: EvaluateStayOptiContextualCandidateInputV3,
  context: StayOptiContextualStayContextV3
): StayOptiTripSpecificLocationV3 {
  const destinationUsable = destinationIsUsable(context.destination);
  const usable = candidate.travelPoints
    .filter((point) =>
      point.pointId.trim().length > 0 &&
      DIRECT_TRAVEL_SOURCES.has(point.source) &&
      hasUsableEvidence(point) &&
      isNonNegative(point.travelTimeMinutes) &&
      isFiniteNumber(point.importance) &&
      point.importance > 0 &&
      point.importance <= 1
    )
    .sort((first, second) => first.pointId.localeCompare(second.pointId));

  const usedIds = new Set(usable.map((point) => point.pointId));
  const excludedPointIds = uniqueSorted(
    candidate.travelPoints
      .filter((point) => !usedIds.has(point.pointId))
      .map((point) => point.pointId)
  );
  const straightLineDistanceKm = isNonNegative(candidate.straightLineDistanceKm)
    ? round(candidate.straightLineDistanceKm)
    : null;

  if (usable.length === 0) {
    return {
      status: "unavailable",
      weightedTravelTimeMinutes: null,
      locationScore: null,
      usedPointIds: [],
      excludedPointIds,
      straightLineDistanceKm,
      destinationAdjusted: false,
      evidenceIds: uniqueSorted(candidate.straightLineEvidenceIds),
      reasonCodes: uniqueReasonCodesV3([
        "location:travel-time-unavailable",
        ...(straightLineDistanceKm === null
          ? []
          : ["location:straight-line-fallback-only" as const]),
        "context:unknown-not-penalty",
      ]),
    };
  }

  let weightedMinutes = 0;
  let weightedScore = 0;
  let totalWeight = 0;
  const evidenceIds: string[] = [];

  for (const point of usable) {
    const tripWeight = TRIP_POINT_WEIGHTS[context.tripType][point.category];
    const override = destinationUsable
      ? context.destination?.travelCategoryWeightOverrides?.[point.category]
      : undefined;
    const destinationWeight = isFiniteNumber(override) && override >= 0.5 && override <= 2
      ? override
      : 1;
    const weight = point.importance * tripWeight * destinationWeight;
    const minutes = point.travelTimeMinutes as number;
    const pointScore = 100 / (1 + minutes / 20);
    totalWeight += weight;
    weightedMinutes += minutes * weight;
    weightedScore += pointScore * weight;
    evidenceIds.push(...point.evidenceIds);
  }

  return {
    status: "usable",
    weightedTravelTimeMinutes: round(weightedMinutes / totalWeight, 2),
    locationScore: round(weightedScore / totalWeight, 2),
    usedPointIds: usable.map((point) => point.pointId),
    excludedPointIds,
    straightLineDistanceKm,
    destinationAdjusted: destinationUsable && usable.some((point) => {
      const override = context.destination?.travelCategoryWeightOverrides?.[point.category];
      return isFiniteNumber(override) && override >= 0.5 && override <= 2 && override !== 1;
    }),
    evidenceIds: uniqueSorted([
      ...evidenceIds,
      ...(destinationUsable ? context.destination?.evidenceIds ?? [] : []),
    ]),
    reasonCodes: uniqueReasonCodesV3([
      "location:travel-time-evaluated",
      "location:trip-specific",
      ...(destinationUsable
        ? ["location:destination-aware" as const]
        : []),
      "context:shadow-only",
    ]),
  };
}

function usableRoomTier(room: StayOptiRoomOptionInputV3) {
  return room.tierSource === "provider-structured" &&
    Number.isInteger(room.tierRank) &&
    (room.tierRank as number) > 0
    ? room.tierRank as number
    : null;
}

function roomAttributeGain(
  selected: StayOptiRoomOptionInputV3,
  alternative: StayOptiRoomOptionInputV3
) {
  const selectedByCode = new Map(
    selected.attributes
      .filter(hasUsableEvidence)
      .map((attribute) => [attribute.code, attribute] as const)
  );
  let gain = 0;
  const evidenceIds: string[] = [];

  for (const attribute of alternative.attributes.filter(hasUsableEvidence)) {
    const baseline = selectedByCode.get(attribute.code);
    if (attribute.state === true && baseline?.state === false) gain += 1;
    if (attribute.state === false && baseline?.state === true) gain -= 1;
    if (attribute.state !== null && baseline?.state !== null && baseline !== undefined) {
      evidenceIds.push(...attribute.evidenceIds, ...baseline.evidenceIds);
    }
  }

  return { gain, evidenceIds: uniqueSorted(evidenceIds) };
}

function evaluateRoomUpgrade(
  candidate: EvaluateStayOptiContextualCandidateInputV3,
  context: StayOptiContextualStayContextV3
): StayOptiRoomUpgradeEvaluationV3 {
  const selected = candidate.selectedRoom;
  const selectedTier = selected === null ? null : usableRoomTier(selected);
  const selectedCost = selected?.totalCost;
  const currency = normalizeCurrency(selected?.currency);

  if (
    selected === null ||
    selectedTier === null ||
    !isNonNegative(selectedCost) ||
    selectedCost === 0 ||
    currency === null ||
    selected.comparisonScopeFingerprint.trim().length === 0
  ) {
    return {
      status: "unavailable",
      selectedOfferId: selected?.offerId ?? null,
      alternativeOfferId: null,
      premiumAmount: null,
      premiumRatio: null,
      tierGain: null,
      attributeGain: null,
      maximumPremiumRatio: null,
      evidenceIds: uniqueSorted(selected?.evidenceIds ?? []),
      reasonCodes: ["room:upgrade-unavailable"],
    };
  }

  const alternatives = candidate.roomAlternatives
    .filter((room) =>
      room.bookable &&
      room.offerId !== selected.offerId &&
      room.comparisonScopeFingerprint === selected.comparisonScopeFingerprint &&
      normalizeCurrency(room.currency) === currency &&
      isNonNegative(room.totalCost) &&
      usableRoomTier(room) !== null &&
      (usableRoomTier(room) as number) > selectedTier
    )
    .map((room) => {
      const tierGain = (usableRoomTier(room) as number) - selectedTier;
      const premiumAmount = (room.totalCost as number) - selectedCost;
      const premiumRatio = premiumAmount / selectedCost;
      const attributes = roomAttributeGain(selected, room);
      const maximumPremiumRatio = ROOM_PREMIUM_LIMITS[context.preferenceId] * Math.min(tierGain, 2);
      const worthwhile = premiumRatio <= maximumPremiumRatio && attributes.gain >= -1;
      return {
        room,
        tierGain,
        premiumAmount,
        premiumRatio,
        attributeGain: attributes.gain,
        attributeEvidenceIds: attributes.evidenceIds,
        maximumPremiumRatio,
        worthwhile,
      };
    })
    .sort((first, second) =>
      Number(second.worthwhile) - Number(first.worthwhile) ||
      second.tierGain - first.tierGain ||
      second.attributeGain - first.attributeGain ||
      first.premiumRatio - second.premiumRatio ||
      first.room.offerId.localeCompare(second.room.offerId)
    );

  const best = alternatives[0];
  if (best === undefined) {
    return {
      status: "unavailable",
      selectedOfferId: selected.offerId,
      alternativeOfferId: null,
      premiumAmount: null,
      premiumRatio: null,
      tierGain: null,
      attributeGain: null,
      maximumPremiumRatio: null,
      evidenceIds: uniqueSorted(selected.evidenceIds),
      reasonCodes: ["room:upgrade-unavailable"],
    };
  }

  return {
    status: best.worthwhile ? "worthwhile" : "not-worthwhile",
    selectedOfferId: selected.offerId,
    alternativeOfferId: best.room.offerId,
    premiumAmount: round(best.premiumAmount, 2),
    premiumRatio: round(best.premiumRatio),
    tierGain: best.tierGain,
    attributeGain: best.attributeGain,
    maximumPremiumRatio: round(best.maximumPremiumRatio),
    evidenceIds: uniqueSorted([
      ...selected.evidenceIds,
      ...best.room.evidenceIds,
      ...best.attributeEvidenceIds,
    ]),
    reasonCodes: [
      best.worthwhile
        ? "room:upgrade-worthwhile"
        : "room:upgrade-not-worthwhile",
      "context:shadow-only",
    ],
  };
}

function validProbability(
  value: StayOptiCancellationInputV3["changeProbability"]
): value is NonNullable<StayOptiCancellationInputV3["changeProbability"]> {
  return value !== null &&
    value.value >= 0 &&
    value.value <= 1 &&
    value.confidence >= MINIMUM_EVIDENCE_CONFIDENCE &&
    value.confidence <= 1 &&
    value.evidenceIds.length > 0;
}

function validAnnualValueRate(
  value: StayOptiPaymentInputV3["annualValueRate"]
): value is NonNullable<StayOptiPaymentInputV3["annualValueRate"]> {
  return value !== null &&
    value.value >= 0 &&
    value.value <= 1 &&
    value.confidence >= MINIMUM_EVIDENCE_CONFIDENCE &&
    value.confidence <= 1 &&
    value.evidenceIds.length > 0;
}

function evaluateFlexibility(
  candidate: EvaluateStayOptiContextualCandidateInputV3
): StayOptiFlexibilityValueV3 {
  const totalCost = isNonNegative(candidate.totalCost) ? candidate.totalCost : null;
  const currency = normalizeCurrency(candidate.currency);
  const cancellation = candidate.cancellation;
  const payment = candidate.payment;
  const cancellationUsable = cancellation !== null &&
    cancellation.policyKnown &&
    hasUsableEvidence(cancellation);
  const paymentUsable = payment !== null &&
    payment.timing !== "unknown" &&
    hasUsableEvidence(payment);
  let protectedAmount: number | null = null;
  let protectionScore: number | null = null;
  let expectedCancellationValue: number | null = null;
  let paymentTimingValue: number | null = null;
  const evidenceIds: string[] = [];
  const reasonCodes: SmartStayReasonCodeV3[] = [];

  if (cancellationUsable) {
    evidenceIds.push(...cancellation.evidenceIds);
    if (cancellation.refundable === false) {
      protectedAmount = totalCost === null ? null : 0;
      protectionScore = totalCost === null ? null : 0;
    }
    else if (cancellation.refundable === true && totalCost !== null && currency !== null) {
      const penaltyCurrency = normalizeCurrency(cancellation.penaltyCurrency);
      const hasFreeWindow = typeof cancellation.freeCancellationUntil === "string" &&
        cancellation.freeCancellationUntil.trim().length > 0;
      if (hasFreeWindow) {
        protectedAmount = totalCost;
      }
      else if (
        isNonNegative(cancellation.penaltyAmount) &&
        penaltyCurrency === currency
      ) {
        protectedAmount = Math.max(0, totalCost - cancellation.penaltyAmount);
      }
      if (protectedAmount !== null) {
        protectionScore = round(clamp(protectedAmount / totalCost, 0, 1) * 100, 2);
      }
    }

    if (protectedAmount !== null && validProbability(cancellation.changeProbability)) {
      expectedCancellationValue = round(
        protectedAmount * cancellation.changeProbability.value,
        2
      );
      evidenceIds.push(...cancellation.changeProbability.evidenceIds);
      reasonCodes.push("flexibility:monetary-value-available");
    }
    else {
      reasonCodes.push("flexibility:monetary-value-unavailable");
    }
    reasonCodes.push("flexibility:cancellation-protection-evaluated");
  }

  if (paymentUsable && payment !== null) {
    evidenceIds.push(...payment.evidenceIds);
    if (
      (payment.timing === "pay-later" || payment.timing === "pay-at-property") &&
      totalCost !== null &&
      isNonNegative(payment.deferralDays) &&
      validAnnualValueRate(payment.annualValueRate)
    ) {
      paymentTimingValue = round(
        totalCost * payment.annualValueRate.value * payment.deferralDays / 365,
        2
      );
      evidenceIds.push(...payment.annualValueRate.evidenceIds);
      reasonCodes.push("flexibility:pay-later-value-available");
    }
    else if (payment.timing === "unknown") {
      reasonCodes.push("flexibility:payment-timing-unknown");
    }
  }
  else {
    reasonCodes.push("flexibility:payment-timing-unknown");
  }

  const usableParts = Number(cancellationUsable) + Number(paymentUsable);
  return {
    status: usableParts === 2
      ? "usable"
      : usableParts === 1
        ? "partial"
        : "unavailable",
    cancellationProtectionAmount: protectedAmount === null ? null : round(protectedAmount, 2),
    cancellationProtectionScore: protectionScore,
    expectedCancellationValue,
    paymentTiming: paymentUsable && payment !== null ? payment.timing : "unknown",
    paymentTimingValue,
    currency,
    evidenceIds: uniqueSorted(evidenceIds),
    reasonCodes: uniqueReasonCodesV3([
      ...reasonCodes,
      ...(usableParts === 0
        ? ["flexibility:context-unavailable" as const]
        : ["context:shadow-only" as const]),
      "context:unknown-not-penalty",
    ]),
  };
}

function evaluateContextInteractions(
  candidate: EvaluateStayOptiContextualCandidateInputV3,
  context: StayOptiContextualStayContextV3
): StayOptiContextInteractionEvaluationV3 {
  const destinationUsable = destinationIsUsable(context.destination);
  const isLongStay = context.tripType === "long-stay" ||
    (context.nights !== null && context.nights >= 7);
  const isFamily = context.tripType === "family" ||
    (context.children !== null && context.children > 0);
  const isGroup = context.tripType === "group" ||
    (context.adults !== null && context.adults >= 3) ||
    (context.rooms !== null && context.rooms >= 2);
  const interactions: StayOptiContextInteractionV3[] = [];

  const addInteractions = (
    code: StayOptiContextInteractionV3["code"],
    enabled: boolean,
    deltas: Partial<Record<StayOptiContextualCapabilityCodeV3, number>>
  ) => {
    if (!enabled) return;
    for (const capability of candidate.capabilities.filter(hasUsableEvidence)) {
      const base = deltas[capability.code];
      if (base === undefined || capability.state === null) continue;
      const rawMultiplier = destinationUsable
        ? context.destination?.capabilityWeightMultipliers?.[capability.code]
        : undefined;
      const multiplier = isFiniteNumber(rawMultiplier) && rawMultiplier >= 0.5 && rawMultiplier <= 2
        ? rawMultiplier
        : 1;
      interactions.push({
        code,
        capabilityCode: capability.code,
        state: capability.state,
        utilityDelta: round((capability.state ? base : -base) * multiplier, 2),
        destinationAdjusted: multiplier !== 1,
        evidenceIds: uniqueSorted([
          ...capability.evidenceIds,
          ...(multiplier !== 1 ? context.destination?.evidenceIds ?? [] : []),
        ]),
      });
    }
  };

  addInteractions("long-stay-utility", isLongStay, LONG_STAY_CAPABILITY_DELTAS);
  addInteractions("family-utility", isFamily, FAMILY_CAPABILITY_DELTAS);
  addInteractions("group-utility", isGroup && !isFamily, GROUP_CAPABILITY_DELTAS);

  interactions.sort((first, second) =>
    first.code.localeCompare(second.code) ||
    first.capabilityCode.localeCompare(second.capabilityCode)
  );

  if (interactions.length === 0) {
    return {
      status: "unavailable",
      utilityDelta: null,
      interactions: [],
      evidenceIds: [],
      reasonCodes: uniqueReasonCodesV3([
        "interaction:context-unavailable",
        "context:unknown-not-penalty",
      ]),
    };
  }

  const reasonCodes: SmartStayReasonCodeV3[] = [];
  if (interactions.some((item) => item.code === "long-stay-utility")) {
    reasonCodes.push("interaction:long-stay");
  }
  if (interactions.some((item) => item.code === "group-utility" || item.code === "family-utility")) {
    reasonCodes.push("interaction:group");
  }
  if (interactions.some((item) => item.destinationAdjusted)) {
    reasonCodes.push("interaction:destination-aware");
  }

  return {
    status: "usable",
    utilityDelta: round(clamp(
      interactions.reduce((total, item) => total + item.utilityDelta, 0),
      -20,
      20
    ), 2),
    interactions,
    evidenceIds: uniqueSorted(interactions.flatMap((item) => item.evidenceIds)),
    reasonCodes: uniqueReasonCodesV3([
      ...reasonCodes,
      "context:shadow-only",
    ]),
  };
}

function evaluateConvenience(
  candidate: EvaluateStayOptiContextualCandidateInputV3
): StayOptiConvenienceEvaluationV3 {
  const suppliedSignalCount = candidate.frictionSignals.length;
  const usable = candidate.frictionSignals
    .filter((signal) =>
      hasUsableEvidence(signal) &&
      isFiniteNumber(signal.convenienceImpact) &&
      signal.convenienceImpact >= -1 &&
      signal.convenienceImpact <= 1 &&
      isFiniteNumber(signal.weight) &&
      signal.weight > 0 &&
      signal.weight <= 1
    )
    .sort((first, second) => first.code.localeCompare(second.code));
  const evidenceIds = uniqueSorted(usable.flatMap((signal) => signal.evidenceIds));

  if (usable.length < MINIMUM_CONVENIENCE_SIGNALS) {
    return {
      status: usable.length === 0 ? "unavailable" : "partial",
      convenienceIndex: null,
      decisionFrictionScore: null,
      usableSignalCount: usable.length,
      suppliedSignalCount,
      evidenceIds,
      reasonCodes: uniqueReasonCodesV3([
        "convenience:insufficient-coverage",
        "context:unknown-not-penalty",
      ]),
    };
  }

  const totalWeight = usable.reduce((total, signal) => total + signal.weight, 0);
  const weightedImpact = usable.reduce(
    (total, signal) => total + signal.convenienceImpact * signal.weight,
    0
  ) / totalWeight;
  const convenienceIndex = round(50 + weightedImpact * 50, 2);

  return {
    status: "usable",
    convenienceIndex,
    decisionFrictionScore: round(100 - convenienceIndex, 2),
    usableSignalCount: usable.length,
    suppliedSignalCount,
    evidenceIds,
    reasonCodes: uniqueReasonCodesV3([
      "convenience:evaluated",
      "friction:evaluated",
      "context:shadow-only",
      "context:unknown-not-penalty",
    ]),
  };
}

function createCandidateFingerprint(
  candidate: Omit<StayOptiContextualCandidateEvaluationV3, "fingerprint">
) {
  return createStableHashV3(candidate, "stayopti-v3-contextual-candidate");
}

function evaluateCandidate(
  candidate: EvaluateStayOptiContextualCandidateInputV3,
  context: StayOptiContextualStayContextV3
): StayOptiContextualCandidateEvaluationV3 {
  const location = evaluateLocation(candidate, context);
  const roomUpgrade = evaluateRoomUpgrade(candidate, context);
  const flexibility = evaluateFlexibility(candidate);
  const contextInteractions = evaluateContextInteractions(candidate, context);
  const convenience = evaluateConvenience(candidate);
  const activeSignals: StayOptiContextualSignalIdV3[] = [];

  if (location.status === "usable") activeSignals.push("travel-time-location");
  if (roomUpgrade.status !== "unavailable") activeSignals.push("room-upgrade");
  if (flexibility.cancellationProtectionScore !== null) activeSignals.push("cancellation-value");
  if (flexibility.paymentTiming !== "unknown") activeSignals.push("payment-timing-value");
  if (contextInteractions.status === "usable") activeSignals.push("group-long-stay-utility");
  if (convenience.status === "usable") activeSignals.push("decision-friction");

  activeSignals.sort();
  const allSignals: StayOptiContextualSignalIdV3[] = [
    "travel-time-location",
    "room-upgrade",
    "cancellation-value",
    "payment-timing-value",
    "group-long-stay-utility",
    "decision-friction",
  ];
  const inactiveSignals = allSignals.filter((signal) => !activeSignals.includes(signal));
  const status = activeSignals.length >= 2
    ? "usable"
    : activeSignals.length === 1
      ? "partial"
      : "unavailable";
  const withoutFingerprint: Omit<StayOptiContextualCandidateEvaluationV3, "fingerprint"> = {
    hotelId: candidate.hotelId,
    status,
    location,
    roomUpgrade,
    flexibility,
    contextInteractions,
    convenience,
    activeSignals,
    inactiveSignals,
    reasonCodes: uniqueReasonCodesV3([
      ...(status === "usable"
        ? ["context:evaluated" as const]
        : status === "partial"
          ? ["context:partial" as const]
          : ["context:unavailable" as const]),
      "context:shadow-only",
      "context:golden-gate-pending",
      "context:unknown-not-penalty",
    ]),
  };

  return {
    ...withoutFingerprint,
    fingerprint: createCandidateFingerprint(withoutFingerprint),
  };
}

function evaluationFingerprintInput(
  evaluation: Omit<StayOptiContextualStayValueEvaluationV3, "evaluationId" | "fingerprint">
) {
  return evaluation;
}

export function evaluateContextualStayValueV3(
  input: EvaluateStayOptiContextualStayValueInputV3
): StayOptiContextualStayValueEvaluationV3 {
  const candidates = [...input.candidates]
    .sort((first, second) => first.hotelId.localeCompare(second.hotelId))
    .map((candidate) => evaluateCandidate(candidate, input.context));
  const withoutIdentity: Omit<
    StayOptiContextualStayValueEvaluationV3,
    "evaluationId" | "fingerprint"
  > = {
    phase: "v3-06",
    rankingApplication: "shadow-only",
    publicPresentation: "disabled",
    decisionGainGate: {
      status: "pending-golden-dataset",
      rankingEnabled: false,
      publicCopyEnabled: false,
    },
    context: input.context,
    candidates,
    usableCandidateCount: candidates.filter((candidate) => candidate.status === "usable").length,
    activeSignalCount: candidates.reduce(
      (total, candidate) => total + candidate.activeSignals.length,
      0
    ),
    reasonCodes: uniqueReasonCodesV3([
      ...(candidates.some((candidate) => candidate.status !== "unavailable")
        ? ["context:evaluated" as const]
        : ["context:unavailable" as const]),
      "context:shadow-only",
      "context:golden-gate-pending",
      "context:unknown-not-penalty",
    ]),
  };
  const fingerprint = createStableHashV3(
    evaluationFingerprintInput(withoutIdentity),
    "stayopti-v3-contextual-evaluation"
  );

  return {
    ...withoutIdentity,
    evaluationId: createStableHashV3(
      { fingerprint },
      "stayopti-v3-contextual-evaluation-id"
    ),
    fingerprint,
  };
}

export function validateContextualStayValueV3(
  evaluation: StayOptiContextualStayValueEvaluationV3
): StayOptiContextualStayValueValidationV3 {
  const issues: string[] = [];
  if (
    evaluation.phase !== "v3-06" ||
    evaluation.rankingApplication !== "shadow-only" ||
    evaluation.publicPresentation !== "disabled" ||
    evaluation.decisionGainGate.status !== "pending-golden-dataset" ||
    evaluation.decisionGainGate.rankingEnabled !== false ||
    evaluation.decisionGainGate.publicCopyEnabled !== false
  ) {
    issues.push("contextual-rollout-gate-invalid");
  }
  if (!isStableHashV3(evaluation.evaluationId) || !isStableHashV3(evaluation.fingerprint)) {
    issues.push("contextual-fingerprint-format-invalid");
  }
  const hotelIds = evaluation.candidates.map((candidate) => candidate.hotelId);
  if (new Set(hotelIds).size !== hotelIds.length ||
    hotelIds.some((hotelId) => hotelId.trim().length === 0)) {
    issues.push("contextual-candidate-identity-invalid");
  }
  for (const candidate of evaluation.candidates) {
    const { fingerprint, ...withoutFingerprint } = candidate;
    if (fingerprint !== createCandidateFingerprint(withoutFingerprint)) {
      issues.push(`contextual-candidate-fingerprint-mismatch:${candidate.hotelId}`);
    }
    const numbers = [
      candidate.location.weightedTravelTimeMinutes,
      candidate.location.locationScore,
      candidate.roomUpgrade.premiumRatio,
      candidate.roomUpgrade.maximumPremiumRatio,
      candidate.flexibility.cancellationProtectionScore,
      candidate.convenience.convenienceIndex,
      candidate.convenience.decisionFrictionScore,
    ].filter((value): value is number => value !== null);
    if (numbers.some((value) => !Number.isFinite(value))) {
      issues.push(`contextual-number-invalid:${candidate.hotelId}`);
    }
    if (candidate.location.status === "unavailable" &&
      (candidate.location.locationScore !== null || candidate.location.weightedTravelTimeMinutes !== null)) {
      issues.push(`contextual-location-availability-invalid:${candidate.hotelId}`);
    }
    if (candidate.convenience.status !== "usable" &&
      (candidate.convenience.convenienceIndex !== null || candidate.convenience.decisionFrictionScore !== null)) {
      issues.push(`contextual-convenience-coverage-invalid:${candidate.hotelId}`);
    }
  }
  const expectedUsable = evaluation.candidates.filter((candidate) => candidate.status === "usable").length;
  const expectedSignals = evaluation.candidates.reduce(
    (total, candidate) => total + candidate.activeSignals.length,
    0
  );
  if (evaluation.usableCandidateCount !== expectedUsable ||
    evaluation.activeSignalCount !== expectedSignals) {
    issues.push("contextual-coverage-count-mismatch");
  }
  const {
    evaluationId,
    fingerprint,
    ...withoutIdentity
  } = evaluation;
  const expectedFingerprint = createStableHashV3(
    evaluationFingerprintInput(withoutIdentity),
    "stayopti-v3-contextual-evaluation"
  );
  const expectedId = createStableHashV3(
    { fingerprint: expectedFingerprint },
    "stayopti-v3-contextual-evaluation-id"
  );
  if (fingerprint !== expectedFingerprint || evaluationId !== expectedId) {
    issues.push("contextual-evaluation-fingerprint-mismatch");
  }
  return { valid: issues.length === 0, issues };
}

export function assertContextualStayValueV3(
  evaluation: StayOptiContextualStayValueEvaluationV3
) {
  const validation = validateContextualStayValueV3(evaluation);
  if (!validation.valid) {
    throw new Error(`Invalid StayOpti V3 contextual evaluation: ${validation.issues.join(", ")}`);
  }
}
