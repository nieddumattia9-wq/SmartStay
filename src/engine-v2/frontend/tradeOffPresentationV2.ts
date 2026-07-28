import type { HotelOffer } from "../../types/hotel";
import type {
  SmartStayDataConfidenceLevelV2,
  SmartStayRiskLevelV2,
} from "../model/smartStayEvaluationV2";
import type { SmartStaySelectedOfferV2 } from "../offers/intentAwareOfferSelectionV2";

export type SmartStayTradeOffSemanticCategoryV2 =
  | "refundability"
  | "tax-completeness"
  | "data-confidence"
  | "booking-risk"
  | "budget"
  | "location"
  | "quality"
  | "comfort";

export interface SmartStayRiskCoverageV2 {
  refundability?: boolean;
  taxCompleteness?: boolean;
  dataConfidence?: boolean;
  budget?: boolean;
  location?: boolean;
  quality?: boolean;
  comfort?: boolean;
}

export interface BuildDisplayedTradeOffsV2Input {
  tradeOffs: string[];
  selectedOffer: SmartStaySelectedOfferV2 | null;
  displayOfferOverride: HotelOffer | null;
  riskLevel?: SmartStayRiskLevelV2;
  dataConfidenceLevel: SmartStayDataConfidenceLevelV2;
}

const NON_REFUNDABLE_FALLBACK =
  "The selected offer is non-refundable.";
const TAX_CONFIRMATION_FALLBACK =
  "Some mandatory taxes or fees may still need final confirmation.";
const HIGH_RISK_FALLBACK =
  "This option has important booking trade-offs.";
const MEDIUM_RISK_FALLBACK =
  "Review the booking conditions before checkout.";
const LIMITED_DATA_FALLBACK =
  "Some supporting accommodation data is limited.";

const GENERIC_MESSAGE_PENALTY = new Map<string, number>([
  [NON_REFUNDABLE_FALLBACK.toLowerCase(), 50],
  [TAX_CONFIRMATION_FALLBACK.toLowerCase(), 40],
  [HIGH_RISK_FALLBACK.toLowerCase(), 60],
  [MEDIUM_RISK_FALLBACK.toLowerCase(), 60],
  [LIMITED_DATA_FALLBACK.toLowerCase(), 40],
  [
    "available evidence indicates a higher level of booking uncertainty.",
    60,
  ],
  [
    "available evidence indicates some booking uncertainty.",
    60,
  ],
]);

function normalizeMessage(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ");
}

export function getTradeOffSemanticCategoryV2(
  message: string
): SmartStayTradeOffSemanticCategoryV2 | null {
  const normalized = normalizeMessage(message);

  if (
    /non[- ]?refundable|refundab|cancellation|free cancellation|flexible alternatives|cancellation flexibility/.test(
      normalized
    )
  ) {
    return "refundability";
  }

  if (
    /\btax(?:es)?\b|tax inclusion|mandatory (?:charges|fees)|final total may be higher|amount.*inclusion was not confirmed/.test(
      normalized
    )
  ) {
    return "tax-completeness";
  }

  if (
    /supporting accommodation data|important information is missing|data is limited|limited data|information is missing or uncertain|evidence is limited/.test(
      normalized
    )
  ) {
    return "data-confidence";
  }

  if (
    /booking uncertainty|booking conditions before checkout|important booking trade-offs/.test(
      normalized
    )
  ) {
    return "booking-risk";
  }

  if (/\bbudget\b|over[- ]budget|exceeds your total budget/.test(normalized)) {
    return "budget";
  }

  if (/\bdistance\b|selected point|location|centre|center/.test(normalized)) {
    return "location";
  }

  if (/guest rating|review|quality/.test(normalized)) {
    return "quality";
  }

  if (
    /comfort|amenit|room|bed|meal|breakfast|air conditioning|parking|wifi|wi-fi/.test(
      normalized
    )
  ) {
    return "comfort";
  }

  return null;
}

function getSemanticKey(message: string) {
  const category = getTradeOffSemanticCategoryV2(message);

  // Refundability, tax, confidence, generic risk, budget, location, and
  // quality each represent one decision concept in the card. Comfort can
  // contain genuinely different requirements (for example parking and room
  // type), so it is deduplicated only when the message itself repeats.
  if (category && category !== "comfort") {
    return `category:${category}`;
  }

  return `message:${normalizeMessage(message)}`;
}

function getInformationScore(message: string) {
  const normalized = normalizeMessage(message);
  const wordCount = normalized.split(" ").filter(Boolean).length;
  const contextBonus =
    /\bbut\b|because|short booking window|close-in dates|limited for these dates|final total may be higher|selected point/.test(
      normalized
    )
      ? 30
      : 0;

  return (
    wordCount * 4 +
    Math.min(normalized.length, 180) +
    contextBonus -
    (GENERIC_MESSAGE_PENALTY.get(normalized) ?? 0)
  );
}

function getPresentationPriority(message: string) {
  const category = getTradeOffSemanticCategoryV2(message);
  if (category === "booking-risk") return 90;
  if (category === "data-confidence") return 70;
  return 10;
}

export function selectDistinctTradeOffMessagesV2(
  values: Array<string | null | undefined>,
  maximumItems = 2
) {
  const entries: Array<{
    message: string;
    informationScore: number;
    order: number;
  }> = [];
  const indexByKey = new Map<string, number>();

  for (const value of values) {
    const message = typeof value === "string" ? value.trim() : "";
    if (!message) continue;

    const key = getSemanticKey(message);
    const score = getInformationScore(message);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, entries.length);
      entries.push({ message, informationScore: score, order: entries.length });
      continue;
    }

    if (score > entries[existingIndex].informationScore) {
      entries[existingIndex] = {
        ...entries[existingIndex],
        message,
        informationScore: score,
      };
    }
  }

  const safeMaximum = Number.isFinite(maximumItems)
    ? Math.max(0, Math.floor(maximumItems))
    : entries.length;

  return entries
    .sort(
      (first, second) =>
        getPresentationPriority(first.message) -
          getPresentationPriority(second.message) ||
        first.order - second.order
    )
    .slice(0, safeMaximum)
    .map((entry) => entry.message);
}

function getRiskFactorCategory(
  factorCode: string
): SmartStayTradeOffSemanticCategoryV2 | null {
  const normalized = factorCode.trim().toLowerCase();

  if (
    normalized.includes("refund") ||
    normalized.includes("cancellation") ||
    normalized.includes("non-refundable")
  ) {
    return "refundability";
  }

  if (
    normalized.includes("tax") ||
    normalized.startsWith("cost-completeness") ||
    normalized === "cost-partially-known"
  ) {
    return "tax-completeness";
  }

  if (
    normalized.startsWith("reliability") ||
    normalized.includes("data-confidence") ||
    normalized.includes("critical-data-coverage") ||
    normalized.includes("evidence-conflicting") ||
    normalized.includes("review-count") ||
    normalized.includes("review-history")
  ) {
    return "data-confidence";
  }

  if (
    normalized.startsWith("price-warning") ||
    normalized.includes("budget")
  ) {
    return "budget";
  }

  if (
    normalized.startsWith("location-") ||
    normalized.includes("distance")
  ) {
    return "location";
  }

  if (
    normalized.startsWith("quality-warning") ||
    normalized.includes("review")
  ) {
    return "quality";
  }

  if (
    normalized.startsWith("comfort-warning") ||
    normalized.includes("mandatory-feature") ||
    normalized.includes("required-unit-type") ||
    normalized.includes("amenit") ||
    normalized.includes("room")
  ) {
    return "comfort";
  }

  return null;
}

const NON_MATERIAL_RISK_FACTOR_CODES_V2 = new Set<string>([
  "data-confidence-medium",
  "moderate-review-history",
  "free-cancellation-deadline-unavailable",
  "refundability-unavailable",
  "location-evidence-unavailable",

  // These location warnings describe which fallback evidence path was used.
  // They do not, by themselves, mean that the displayed distance or booking
  // conditions are uncertain. Material conflicts, an unverifiable hard limit,
  // and an unavailable distance remain independent risk factors.
  "location-warning:selected-location-coordinates-unavailable",
  "location-warning:property-coordinates-unavailable",
  "location-warning:provider-distance-reference-unverified",
]);

function isMaterialRiskFactorV2(
  factorCode: string
) {
  const normalized =
    factorCode
      .trim()
      .toLowerCase();

  return !NON_MATERIAL_RISK_FACTOR_CODES_V2.has(
    normalized
  );
}

export function hasIndependentRiskFactorsV2(
  factorCodes: string[],
  coverage: SmartStayRiskCoverageV2
) {
  if (factorCodes.length === 0) {
    return !Object.values(coverage).some(Boolean);
  }

  const materialFactorCodes =
    factorCodes.filter(
      isMaterialRiskFactorV2
    );

  if (materialFactorCodes.length === 0) {
    return false;
  }

  return materialFactorCodes.some((factorCode) => {
    const category = getRiskFactorCategory(factorCode);

    switch (category) {
      case "refundability":
        return !coverage.refundability;
      case "tax-completeness":
        return !coverage.taxCompleteness;
      case "data-confidence":
        return !coverage.dataConfidence;
      case "budget":
        return !coverage.budget;
      case "location":
        return !coverage.location;
      case "quality":
        return !coverage.quality;
      case "comfort":
        return !coverage.comfort;
      default:
        return true;
    }
  });
}

function resolveCurrentRefundability(
  selectedOffer: SmartStaySelectedOfferV2 | null,
  displayOfferOverride: HotelOffer | null
) {
  if (displayOfferOverride?.refundable !== undefined) {
    return displayOfferOverride.refundable ?? null;
  }
  return selectedOffer?.refundable ?? null;
}

function resolveCurrentTaxStatus(
  selectedOffer: SmartStaySelectedOfferV2 | null,
  displayOfferOverride: HotelOffer | null
) {
  if (displayOfferOverride?.taxesIncluded !== undefined) {
    return displayOfferOverride.taxesIncluded ?? null;
  }
  return selectedOffer?.taxesIncluded ?? null;
}

function removeCategory(
  messages: string[],
  category: SmartStayTradeOffSemanticCategoryV2
) {
  return messages.filter(
    (message) => getTradeOffSemanticCategoryV2(message) !== category
  );
}

export function buildDisplayedTradeOffsV2({
  tradeOffs,
  selectedOffer,
  displayOfferOverride,
  riskLevel,
  dataConfidenceLevel,
}: BuildDisplayedTradeOffsV2Input) {
  const selectedRefundable = selectedOffer?.refundable ?? null;
  const currentRefundable = resolveCurrentRefundability(
    selectedOffer,
    displayOfferOverride
  );
  const selectedTaxStatus = selectedOffer?.taxesIncluded ?? null;
  const currentTaxStatus = resolveCurrentTaxStatus(
    selectedOffer,
    displayOfferOverride
  );
  const hasVerifiedRefundability =
    displayOfferOverride?.refundable !== undefined;
  const hasVerifiedTaxStatus =
    displayOfferOverride?.taxesIncluded !== undefined;

  let providedTradeOffs = tradeOffs
    .map((message) => message.trim())
    .filter(Boolean);

  if (
    hasVerifiedRefundability &&
    (currentRefundable !== false || selectedRefundable !== false)
  ) {
    providedTradeOffs = removeCategory(
      providedTradeOffs,
      "refundability"
    );
  }

  if (
    hasVerifiedTaxStatus &&
    (currentTaxStatus !== null || selectedTaxStatus !== null)
  ) {
    providedTradeOffs = removeCategory(
      providedTradeOffs,
      "tax-completeness"
    );
  }

  // Current verified offer conditions must stay ahead of older secondary
  // trade-offs. Semantic selection will replace these generic fallbacks with
  // a richer message when an equivalent contextual explanation is present.
  const candidates: Array<string | null> = [
    currentRefundable === false
      ? NON_REFUNDABLE_FALLBACK
      : null,

    (selectedOffer !== null || displayOfferOverride !== null) &&
    currentTaxStatus === null
      ? TAX_CONFIRMATION_FALLBACK
      : null,

    ...providedTradeOffs,

    dataConfidenceLevel === "low" || dataConfidenceLevel === "none"
      ? LIMITED_DATA_FALLBACK
      : null,
  ];

  const hasVisibleCandidate = candidates.some(
    (candidate) =>
      typeof candidate === "string" && candidate.trim().length > 0
  );

  // The risk level belongs to the original evaluation. Once a verified offer
  // override exists, do not reconstruct a generic risk warning from stale
  // pre-verification state.
  if (
    displayOfferOverride === null &&
    providedTradeOffs.length === 0 &&
    !hasVisibleCandidate
  ) {
    if (riskLevel === "high") {
      candidates.push(HIGH_RISK_FALLBACK);
    } else if (riskLevel === "medium") {
      candidates.push(MEDIUM_RISK_FALLBACK);
    }
  }

  return selectDistinctTradeOffMessagesV2(candidates, 2);
}
