import type {
  Hotel,
  HotelOffer,
} from "../../types/hotel";

import {
  selectHotelOffers,
} from "../../utils/hotelOfferSelection";

import {
  getStayCostCompletenessPriority,
} from "../../utils/stayCost";

import type {
  ComparableHotelOffer,
  HotelOfferCompleteness,
} from "../../utils/hotelOfferSelection";

import type {
  SmartStayBookingFlexibilityContextV2,
} from "../flexibility/bookingFlexibilityContextEngine";

export type SmartStayOfferSelectionPreferenceIdV2 =
  | "maximum-comfort"
  | "comfort"
  | "balanced"
  | "savings"
  | "maximum-savings";

export type SmartStayOfferSelectionModeV2 =
  | "lowest-price"
  | "intent-aware-flexibility";

export type SmartStayRoomTierV2 =
  | "unknown"
  | "economy"
  | "standard"
  | "superior"
  | "premium"
  | "executive"
  | "suite";

export interface SmartStayOfferSelectionOptionsV2 {
  preferenceId?: string | null;

  flexibilityContext?:
    SmartStayBookingFlexibilityContextV2 |
    null;
}

export interface SmartStaySelectedOfferV2 {
  hotelId: string;
  offerId: string;
  provider: string;
  roomName: string | null;
  amount: number;
  currency: string;
  completeness: HotelOfferCompleteness;
  bookable: boolean;
  refundable: boolean | null;
  freeCancellationUntil: string | null;
  cancellationPolicyKnown: boolean;
  taxesIncluded: boolean | null;
  excludedTaxes: number;
  unknownTaxes: number;
  roomTier: SmartStayRoomTierV2;
  roomTierRank: number;
  selectionMode: SmartStayOfferSelectionModeV2;
  reasonCodes: string[];
}

export interface SmartStayOfferSelectionV2 {
  hotelId: string;
  primary: ComparableHotelOffer | null;
  offers: ComparableHotelOffer[];
  alternativeCount: number;
  selectionMode: SmartStayOfferSelectionModeV2;
  selectedOffer: SmartStaySelectedOfferV2 | null;
  reasonCodes: string[];
}

export interface SmartStayOfferComparabilityEvaluationV2 {
  comparable: boolean;
  sameCurrency: boolean;
  refundabilityCompatible: boolean;
  cancellationDeadlineCompatible: boolean;
  costCompletenessCompatible: boolean;
  roomTierCompatible: boolean;
  reasonCodes: string[];
}

type ResolvedPolicy = {
  preferenceId: SmartStayOfferSelectionPreferenceIdV2;
  preferFlexibleMarginalUpgrade: boolean;
  maximumPremiumRatio: number;
  maximumPremiumAmount: number;
};

const PREFERENCE_IDS: readonly SmartStayOfferSelectionPreferenceIdV2[] = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
];

const ROOM_TIER_RANK: Readonly<Record<SmartStayRoomTierV2, number>> = {
  unknown: 0,
  economy: 1,
  standard: 2,
  superior: 3,
  premium: 4,
  executive: 5,
  suite: 6,
};

function getNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizePreferenceId(
  value: unknown
): SmartStayOfferSelectionPreferenceIdV2 {
  return typeof value === "string" &&
    (PREFERENCE_IDS as readonly string[]).includes(value)
    ? (value as SmartStayOfferSelectionPreferenceIdV2)
    : "balanced";
}

function resolvePolicy(
  options: SmartStayOfferSelectionOptionsV2
): ResolvedPolicy {
  const preferenceId = normalizePreferenceId(options.preferenceId);
  const premiumMultiplier =
    options.flexibilityContext?.flexibilityPremiumMultiplier ??
    1;

  if (preferenceId === "maximum-comfort") {
    return {
      preferenceId,
      preferFlexibleMarginalUpgrade: true,
      maximumPremiumRatio: 0.08 * premiumMultiplier,
      maximumPremiumAmount: 75 * premiumMultiplier,
    };
  }

  if (preferenceId === "comfort") {
    return {
      preferenceId,
      preferFlexibleMarginalUpgrade: true,
      maximumPremiumRatio: 0.05 * premiumMultiplier,
      maximumPremiumAmount: 50 * premiumMultiplier,
    };
  }

  if (preferenceId === "balanced") {
    return {
      preferenceId,
      preferFlexibleMarginalUpgrade: true,
      maximumPremiumRatio: 0.025 * premiumMultiplier,
      maximumPremiumAmount: 25 * premiumMultiplier,
    };
  }

  return {
    preferenceId,
    preferFlexibleMarginalUpgrade: false,
    maximumPremiumRatio: 0,
    maximumPremiumAmount: 0,
  };
}

function getCompletenessPriority(
  completeness:
    HotelOfferCompleteness
) {
  return getStayCostCompletenessPriority(
    completeness
  );
}

function classifyRoomTier(roomName: unknown): SmartStayRoomTierV2 {
  const normalized = normalizeText(roomName);
  if (!normalized) return "unknown";
  if (/\b(presidential|royal|penthouse|suite)\b/.test(normalized)) return "suite";
  if (/\b(executive|club|business)\b/.test(normalized)) return "executive";
  if (/\b(deluxe|premium|prestige)\b/.test(normalized)) return "premium";
  if (/\bsuperior\b/.test(normalized)) return "superior";
  if (/\b(economy|budget|basic)\b/.test(normalized)) return "economy";
  if (/\b(standard|classic|double|twin|single|room)\b/.test(normalized)) {
    return "standard";
  }
  return "unknown";
}

function getRoomTierRank(roomName: unknown) {
  return ROOM_TIER_RANK[classifyRoomTier(roomName)];
}

function hasValidCancellationDeadline(
  offer: HotelOffer,
  referenceAt: string | null
) {
  if (
    typeof offer.freeCancellationUntil !== "string" ||
    offer.freeCancellationUntil.trim().length === 0
  ) {
    return false;
  }

  const deadlineTimestamp =
    Date.parse(offer.freeCancellationUntil.trim());

  if (!Number.isFinite(deadlineTimestamp)) {
    return false;
  }

  if (referenceAt === null) {
    return true;
  }

  const referenceTimestamp =
    Date.parse(referenceAt);

  return !Number.isFinite(referenceTimestamp) ||
    deadlineTimestamp > referenceTimestamp;
}

function isRoomTierCompatibleForUpgrade(
  candidate: ComparableHotelOffer,
  baseline: ComparableHotelOffer
) {
  const candidateRank = getRoomTierRank(candidate.offer.roomName);
  const baselineRank = getRoomTierRank(baseline.offer.roomName);

  if (candidateRank === 0 || baselineRank === 0) {
    return normalizeText(candidate.offer.roomName) ===
      normalizeText(baseline.offer.roomName);
  }

  return candidateRank >= baselineRank;
}

function isMarginalPremium(
  candidate: ComparableHotelOffer,
  baseline: ComparableHotelOffer,
  policy: ResolvedPolicy
) {
  const premiumAmount = candidate.amount - baseline.amount;
  if (premiumAmount < 0) return true;
  const premiumRatio = premiumAmount / baseline.amount;
  return premiumAmount <= policy.maximumPremiumAmount &&
    premiumRatio <= policy.maximumPremiumRatio;
}

function choosePrimary(
  offers: ComparableHotelOffer[],
  policy: ResolvedPolicy,
  flexibilityContext:
    SmartStayBookingFlexibilityContextV2 |
    null
) {
  const baseline = offers[0] ?? null;

  if (
    !baseline ||
    !policy.preferFlexibleMarginalUpgrade ||
    baseline.offer.refundable === true
  ) {
    return {
      primary: baseline,
      selectionMode: "lowest-price" as const,
      reasonCodes: [
        "offer-selection-lowest-price",
        `offer-selection-preference:${policy.preferenceId}`,
      ],
    };
  }

  const upgrades = offers
    .filter(
      (candidate) =>
        candidate.offer.bookable === true &&
        candidate.currency === baseline.currency &&
        candidate.offer.refundable === true &&
        isMarginalPremium(candidate, baseline, policy) &&
        getCompletenessPriority(candidate.completeness) <=
          getCompletenessPriority(baseline.completeness) &&
        isRoomTierCompatibleForUpgrade(candidate, baseline)
    )
    .sort(
      (first, second) =>
        Number(
          hasValidCancellationDeadline(
            second.offer,
            flexibilityContext?.referenceAt ?? null
          )
        ) -
          Number(
            hasValidCancellationDeadline(
              first.offer,
              flexibilityContext?.referenceAt ?? null
            )
          ) ||
        getCompletenessPriority(first.completeness) -
          getCompletenessPriority(second.completeness) ||
        getRoomTierRank(second.offer.roomName) -
          getRoomTierRank(first.offer.roomName) ||
        first.amount - second.amount ||
        first.originalIndex - second.originalIndex
    );

  const selected = upgrades[0] ?? null;
  if (!selected) {
    return {
      primary: baseline,
      selectionMode: "lowest-price" as const,
      reasonCodes: [
        "offer-selection-lowest-price",
        "offer-selection-no-coherent-flexible-upgrade",
        `offer-selection-preference:${policy.preferenceId}`,
      ],
    };
  }

  return {
    primary: selected,
    selectionMode: "intent-aware-flexibility" as const,
    reasonCodes: [
      "offer-selection-intent-aware",
      "offer-selection-refundable-upgrade",
      "offer-selection-marginal-premium",
      "offer-selection-room-tier-preserved",
      hasValidCancellationDeadline(
        selected.offer,
        flexibilityContext?.referenceAt ?? null
      )
        ? "offer-selection-free-cancellation-verified"
        : "offer-selection-refundability-verified",
      `offer-selection-preference:${policy.preferenceId}`,
    ],
  };
}

function createSelectedOffer(
  hotel: Hotel,
  primary: ComparableHotelOffer | null,
  selectionMode: SmartStayOfferSelectionModeV2,
  reasonCodes: string[]
): SmartStaySelectedOfferV2 | null {
  if (!primary) return null;
  const roomTier = classifyRoomTier(primary.offer.roomName);

  return {
    hotelId: hotel.id,
    offerId: primary.offer.id,
    provider: primary.offer.provider,
    roomName: primary.offer.roomName,
    amount: primary.amount,
    currency: primary.currency,
    completeness: primary.completeness,
    bookable: primary.offer.bookable === true,
    refundable:
      typeof primary.offer.refundable === "boolean"
        ? primary.offer.refundable
        : null,
    freeCancellationUntil:
      typeof primary.offer.freeCancellationUntil === "string" &&
      primary.offer.freeCancellationUntil.trim()
        ? primary.offer.freeCancellationUntil.trim()
        : null,
    cancellationPolicyKnown: Boolean(primary.offer.cancellationPolicy),
    taxesIncluded: primary.offer.taxesIncluded ?? null,
    excludedTaxes: getNonNegativeNumber(primary.offer.excludedTaxes),
    unknownTaxes: getNonNegativeNumber(primary.offer.unknownTaxes),
    roomTier,
    roomTierRank: ROOM_TIER_RANK[roomTier],
    selectionMode,
    reasonCodes: uniqueSorted(reasonCodes),
  };
}

export function selectIntentAwareHotelOfferV2(
  hotel: Hotel,
  options: SmartStayOfferSelectionOptionsV2 = {}
): SmartStayOfferSelectionV2 {
  const baseSelection = selectHotelOffers(hotel);
  const flexibilityContext =
    options.flexibilityContext ??
    null;
  const selected = choosePrimary(
    baseSelection.offers,
    resolvePolicy(options),
    flexibilityContext
  );
  const contextReasonCodes =
    flexibilityContext?.reasonCodes ?? [];

  return {
    hotelId: hotel.id,
    primary: selected.primary,
    offers: baseSelection.offers,
    alternativeCount: baseSelection.alternativeCount,
    selectionMode: selected.selectionMode,
    selectedOffer: createSelectedOffer(
      hotel,
      selected.primary,
      selected.selectionMode,
      [
        ...selected.reasonCodes,
        ...contextReasonCodes,
      ]
    ),
    reasonCodes: uniqueSorted([
      ...selected.reasonCodes,
      ...contextReasonCodes,
    ]),
  };
}

export function compareSelectedOffersV2(
  candidateSelection: SmartStayOfferSelectionV2 | null | undefined,
  baselineSelection: SmartStayOfferSelectionV2 | null | undefined
): SmartStayOfferComparabilityEvaluationV2 {
  const candidate = candidateSelection?.selectedOffer ?? null;
  const baseline = baselineSelection?.selectedOffer ?? null;

  if (!candidate || !baseline) {
    return {
      comparable: false,
      sameCurrency: false,
      refundabilityCompatible: false,
      cancellationDeadlineCompatible: false,
      costCompletenessCompatible: false,
      roomTierCompatible: false,
      reasonCodes: ["offer-comparison-selected-offer-unavailable"],
    };
  }

  const sameCurrency = candidate.currency === baseline.currency;
  const refundabilityCompatible =
    baseline.refundable !== true || candidate.refundable === true;
  const baselineHasDeadline =
    baseline.refundable === true && baseline.freeCancellationUntil !== null;
  const cancellationDeadlineCompatible =
    !baselineHasDeadline ||
    (candidate.refundable === true && candidate.freeCancellationUntil !== null);
  const costCompletenessCompatible =
    getCompletenessPriority(candidate.completeness) <=
      getCompletenessPriority(baseline.completeness) &&
    candidate.unknownTaxes <= baseline.unknownTaxes;
  const roomTierCompatible =
    baseline.roomTierRank > 0 && candidate.roomTierRank > 0
      ? candidate.roomTierRank >= baseline.roomTierRank
      : normalizeText(candidate.roomName) !== "" &&
        normalizeText(candidate.roomName) === normalizeText(baseline.roomName);
  const comparable =
    baseline.bookable &&
    candidate.bookable &&
    sameCurrency &&
    refundabilityCompatible &&
    cancellationDeadlineCompatible &&
    costCompletenessCompatible &&
    roomTierCompatible;

  return {
    comparable,
    sameCurrency,
    refundabilityCompatible,
    cancellationDeadlineCompatible,
    costCompletenessCompatible,
    roomTierCompatible,
    reasonCodes: uniqueSorted([
      comparable
        ? "offer-comparison-commercially-comparable"
        : "offer-comparison-commercially-incompatible",
      sameCurrency
        ? "offer-comparison-same-currency"
        : "offer-comparison-currency-mismatch",
      refundabilityCompatible
        ? "offer-comparison-refundability-compatible"
        : "offer-comparison-refundability-downgrade",
      cancellationDeadlineCompatible
        ? "offer-comparison-cancellation-compatible"
        : "offer-comparison-cancellation-deadline-missing",
      costCompletenessCompatible
        ? "offer-comparison-cost-completeness-compatible"
        : "offer-comparison-cost-completeness-worse",
      roomTierCompatible
        ? "offer-comparison-room-tier-compatible"
        : "offer-comparison-room-tier-downgrade",
    ]),
  };
}
