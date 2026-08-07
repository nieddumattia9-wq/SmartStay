import type {
  SmartStayBudgetIntentEvaluationV2,
  SmartStayBudgetIntentLevelV2,
  SmartStayBudgetIntentStatusV2,
} from "./budgetIntentEngine";

import type {
  SmartStayMarketContextSourceV2,
} from "../market-context/marketContextModel";

import type {
  SmartStayUtilityPreferenceIdV2,
  SmartStayUtilityPreferenceSourceV2,
} from "../utility/userUtilityEngine";

export type SmartStayMarketRelativePreferenceResolutionSourceV2 =
  | "manual"
  | "absolute-extreme-budget"
  | "absolute-fallback"
  | "market-usable"
  | "market-strong-data";

export interface SmartStayMarketRelativePreferenceInputV2 {
  preferenceId?:
    SmartStayUtilityPreferenceIdV2 |
    string |
    null;

  selectedIndex?:
    number |
    null;

  preferenceSource?:
    SmartStayUtilityPreferenceSourceV2 |
    null;

  budgetIntent:
    SmartStayBudgetIntentEvaluationV2;

  fallbackExplanation?:
    string |
    null;
}

export interface SmartStayMarketRelativePreferenceResolutionV2 {
  requestedPreferenceId:
    SmartStayUtilityPreferenceIdV2;

  requestedSelectedIndex:
    number;

  effectivePreferenceId:
    SmartStayUtilityPreferenceIdV2;

  effectiveSelectedIndex:
    number;

  source:
    SmartStayMarketRelativePreferenceResolutionSourceV2;

  wasAdjusted:
    boolean;

  marketStatus:
    SmartStayBudgetIntentStatusV2;

  marketIntentLevel:
    SmartStayBudgetIntentLevelV2;

  marketContextSource:
    SmartStayMarketContextSourceV2 |
    "candidate-fallback";

  marketConfidence:
    number;

  marketSampleSize:
    number;

  budgetPerRoomNight:
    number |
    null;

  budgetPercentile:
    number |
    null;

  budgetToMedianRatio:
    number |
    null;

  explanation:
    string;

  reasonCodes:
    string[];
}

const PREFERENCE_IDS = [
  "maximum-comfort",
  "comfort",
  "balanced",
  "savings",
  "maximum-savings",
] as const satisfies readonly SmartStayUtilityPreferenceIdV2[];

const DEFAULT_PREFERENCE_INDEX =
  2;

const MAXIMUM_SAVINGS_INDEX =
  4;

const EXTREME_BUDGET_PER_ROOM_NIGHT_MAX =
  40;

const MARKET_LEVEL_INDEX:
  Readonly<
    Record<
      SmartStayBudgetIntentLevelV2,
      number
    >
  > = {
    constrained: 4,
    value: 3,
    balanced: 2,
    premium: 1,
    luxury: 0,
  };

function uniqueSorted(
  values:
    string[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort();
}

function clampPreferenceIndex(
  value:
    number
) {
  return Math.min(
    Math.max(
      Math.round(value),
      0
    ),
    PREFERENCE_IDS.length -
      1
  );
}

function getPreferenceId(
  selectedIndex:
    number
): SmartStayUtilityPreferenceIdV2 {
  return PREFERENCE_IDS[
    clampPreferenceIndex(
      selectedIndex
    )
  ] ??
    "balanced";
}

function normalizeRequestedPreference(
  preferenceId:
    SmartStayMarketRelativePreferenceInputV2[
      "preferenceId"
    ],
  selectedIndex:
    SmartStayMarketRelativePreferenceInputV2[
      "selectedIndex"
    ]
) {
  const matchingIndex =
    PREFERENCE_IDS.findIndex(
      (candidate) =>
        candidate ===
        preferenceId
    );

  if (matchingIndex >= 0) {
    return {
      preferenceId:
        getPreferenceId(
          matchingIndex
        ),

      selectedIndex:
        matchingIndex,
    };
  }

  const normalizedIndex =
    typeof selectedIndex ===
      "number" &&
    Number.isFinite(
      selectedIndex
    )
      ? clampPreferenceIndex(
          selectedIndex
        )
      : DEFAULT_PREFERENCE_INDEX;

  return {
    preferenceId:
      getPreferenceId(
        normalizedIndex
      ),

    selectedIndex:
      normalizedIndex,
  };
}

function moveOneStepToward(
  currentIndex:
    number,
  targetIndex:
    number
) {
  if (currentIndex === targetIndex) {
    return currentIndex;
  }

  return currentIndex +
    (
      targetIndex >
      currentIndex
        ? 1
        : -1
    );
}

function normalizeFallbackExplanation(
  value:
    unknown
) {
  return typeof value ===
    "string" &&
    value.trim()
    ? value.trim()
    : "StayOpti is using the trip inputs available before reliable destination-market data is available.";
}

function getPreferenceTitle(
  selectedIndex:
    number
) {
  if (selectedIndex === 0) {
    return "Maximum Comfort";
  }

  if (selectedIndex === 1) {
    return "Comfort";
  }

  if (selectedIndex === 3) {
    return "Savings";
  }

  if (selectedIndex === 4) {
    return "Maximum Savings";
  }

  return "Balanced";
}

function createExtremeBudgetExplanation() {
  return "Your budget per room and night is extremely constrained, so StayOpti is prioritizing Maximum Savings even before destination-market adjustments.";
}

function createMarketExplanation(
  selectedIndex:
    number,
  status:
    "usable" |
    "strong-data"
) {
  const preferenceTitle =
    getPreferenceTitle(
      selectedIndex
    );

  const prefix =
    status ===
      "strong-data"
      ? "For this destination, area and these dates, reliable comparable prices show that your budget"
      : "Available comparable prices for this destination, area and these dates suggest that your budget";

  if (selectedIndex === 0) {
    return (
      prefix +
      ` has very strong purchasing power. StayOpti has set the balance to ${preferenceTitle} to prioritize the strongest coherent experience within budget.`
    );
  }

  if (selectedIndex === 1) {
    return (
      prefix +
      ` has strong purchasing power. StayOpti has set the balance to ${preferenceTitle} while still protecting value.`
    );
  }

  if (selectedIndex === 2) {
    return (
      prefix +
      ` sits near the typical comparable range. StayOpti has kept the balance at ${preferenceTitle} across price, location, quality and reliability.`
    );
  }

  if (selectedIndex === 3) {
    return (
      prefix +
      ` is below typical comparable prices. StayOpti has set the balance to ${preferenceTitle} while still protecting quality and reliability.`
    );
  }

  return (
    prefix +
    ` is highly constrained compared with comparable prices. StayOpti has set the balance to ${preferenceTitle} to protect the lowest reliable totals.`
  );
}

export function resolveMarketRelativeAutomaticPreferenceV2(
  input:
    SmartStayMarketRelativePreferenceInputV2
): SmartStayMarketRelativePreferenceResolutionV2 {
  const requested =
    normalizeRequestedPreference(
      input.preferenceId,
      input.selectedIndex
    );

  const budgetIntent =
    input.budgetIntent;

  const base = {
    requestedPreferenceId:
      requested.preferenceId,

    requestedSelectedIndex:
      requested.selectedIndex,

    marketStatus:
      budgetIntent.status,

    marketIntentLevel:
      budgetIntent.level,

    marketContextSource:
      budgetIntent.market.source,

    marketConfidence:
      budgetIntent.market.confidence,

    marketSampleSize:
      budgetIntent.market.sampleSize,

    budgetPerRoomNight:
      budgetIntent.budgetPerRoomNight,

    budgetPercentile:
      budgetIntent.market.budgetPercentile,

    budgetToMedianRatio:
      budgetIntent.market.budgetToMedianRatio,
  };

  if (
    input.preferenceSource ===
    "manual"
  ) {
    return {
      ...base,

      effectivePreferenceId:
        requested.preferenceId,

      effectiveSelectedIndex:
        requested.selectedIndex,

      source:
        "manual",

      wasAdjusted:
        false,

      explanation:
        normalizeFallbackExplanation(
          input.fallbackExplanation
        ),

      reasonCodes: [
        "market-relative-balance:manual-preserved",
      ],
    };
  }

  const marketIsUsable =
    budgetIntent.status !==
      "unavailable" &&
    budgetIntent.market.source !==
      "candidate-fallback" &&
    budgetIntent.budgetPerRoomNight !==
      null &&
    budgetIntent.market.sampleSize >=
      3 &&
    budgetIntent.market.median !==
      null;

  if (!marketIsUsable) {
    if (
      budgetIntent.budgetPerRoomNight !==
        null &&
      budgetIntent.budgetPerRoomNight <=
        EXTREME_BUDGET_PER_ROOM_NIGHT_MAX
    ) {
      return {
        ...base,

        effectivePreferenceId:
          getPreferenceId(
            MAXIMUM_SAVINGS_INDEX
          ),

        effectiveSelectedIndex:
          MAXIMUM_SAVINGS_INDEX,

        source:
          "absolute-extreme-budget",

        wasAdjusted:
          requested.selectedIndex !==
          MAXIMUM_SAVINGS_INDEX,

        explanation:
          createExtremeBudgetExplanation(),

        reasonCodes:
          uniqueSorted([
            "market-relative-balance:absolute-extreme-budget-fallback",
            requested.selectedIndex ===
              MAXIMUM_SAVINGS_INDEX
              ? "market-relative-balance:requested-already-coherent"
              : "market-relative-balance:preference-adjusted",
          ]),
      };
    }

    return {
      ...base,

      effectivePreferenceId:
        requested.preferenceId,

      effectiveSelectedIndex:
        requested.selectedIndex,

      source:
        "absolute-fallback",

      wasAdjusted:
        false,

      explanation:
        normalizeFallbackExplanation(
          input.fallbackExplanation
        ),

      reasonCodes:
        uniqueSorted([
          "market-relative-balance:fallback",
          `market-relative-balance:status-${budgetIntent.status}`,
        ]),
    };
  }

  const marketStatus:
    "usable" |
    "strong-data" =
      budgetIntent.status ===
        "strong-data"
        ? "strong-data"
        : "usable";

  const targetIndex =
    MARKET_LEVEL_INDEX[
      budgetIntent.level
    ];

  const effectiveSelectedIndex =
    marketStatus ===
      "strong-data"
      ? targetIndex
      : moveOneStepToward(
          requested.selectedIndex,
          targetIndex
        );

  const effectivePreferenceId =
    getPreferenceId(
      effectiveSelectedIndex
    );

  return {
    ...base,

    effectivePreferenceId,
    effectiveSelectedIndex,

    source:
      marketStatus ===
        "strong-data"
        ? "market-strong-data"
        : "market-usable",

    wasAdjusted:
      effectiveSelectedIndex !==
      requested.selectedIndex,

    explanation:
      createMarketExplanation(
        effectiveSelectedIndex,
        marketStatus
      ),

    reasonCodes:
      uniqueSorted([
        `market-relative-balance:level-${budgetIntent.level}`,
        `market-relative-balance:status-${marketStatus}`,
        marketStatus ===
          "strong-data"
          ? "market-relative-balance:full-adjustment"
          : "market-relative-balance:conservative-one-step-adjustment",
        effectiveSelectedIndex ===
          requested.selectedIndex
          ? "market-relative-balance:requested-already-coherent"
          : "market-relative-balance:preference-adjusted",
      ]),
  };
}
