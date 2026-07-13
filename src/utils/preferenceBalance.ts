export type AutomaticPreferenceBalanceInput = {
  hasDestination: boolean;
  totalBudget: unknown;
  nightCount: unknown;
  roomCount: unknown;
  maxDistanceKm: unknown;
};

export type AutomaticPreferenceBalance = {
  isReady: boolean;
  selectedIndex: number;
  explanation: string;
  budgetPerRoomNight: number | null;
};

function normalizePositiveNumber(
  value: unknown
): number | null {
  const normalizedValue =
    typeof value === "string"
      ? value
          .trim()
          .replace(",", ".")
      : value;

  const numericValue =
    Number(normalizedValue);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function clampPreferenceIndex(
  value: number
) {
  return Math.min(
    Math.max(
      Math.round(value),
      0
    ),
    4
  );
}

function getBudgetPreferenceIndex(
  budgetPerRoomNight: number
) {
  if (budgetPerRoomNight >= 280) {
    return 0;
  }

  if (budgetPerRoomNight >= 180) {
    return 1;
  }

  if (budgetPerRoomNight >= 110) {
    return 2;
  }

  if (budgetPerRoomNight >= 90) {
    return 3;
  }

  return 4;
}

function getDistanceAdjustment(
  budgetPreferenceIndex: number,
  maxDistanceKm: number | null
) {
  if (budgetPreferenceIndex !== 4) {
    return 0;
  }

  if (
    maxDistanceKm === null ||
    maxDistanceKm >= 5
  ) {
    return -1;
  }

  return 0;
}

function formatBudgetAmount(
  totalBudget: number
) {
  return new Intl.NumberFormat(
    "en-IE",
    {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }
  ).format(totalBudget);
}

function createExplanation(
  selectedIndex: number,
  budgetPreferenceIndex: number,
  maxDistanceKm: number | null,
  totalBudget: number,
  nightCount: number
) {
  const formattedBudget =
    formatBudgetAmount(totalBudget);

  const nightLabel =
    `${nightCount}-night stay`;

  const distanceLabel =
    maxDistanceKm === null
      ? "flexible distance range"
      : `${maxDistanceKm} km range`;

  const context =
    `Based on your ${formattedBudget} total budget, ${nightLabel} and ${distanceLabel}`;

  if (
    budgetPreferenceIndex === 4 &&
    selectedIndex === 3
  ) {
    return (
      context +
      ", SmartStay will prioritize savings while using the wider range to keep more options available."
    );
  }

  if (selectedIndex === 0) {
    return (
      context +
      ", SmartStay can give more weight to comfort, quality and location."
    );
  }

  if (selectedIndex === 1) {
    return (
      context +
      ", SmartStay can favor comfort while still protecting value."
    );
  }

  if (selectedIndex === 2) {
    return (
      context +
      ", SmartStay will balance total price, distance, quality and reliability."
    );
  }

  if (selectedIndex === 3) {
    return (
      context +
      ", SmartStay will prioritize savings while still considering quality and reliability."
    );
  }

  return (
    context +
    ", SmartStay will strongly prioritize the lowest reliable total prices."
  );
}

export function calculateAutomaticPreferenceBalance(
  input: AutomaticPreferenceBalanceInput
): AutomaticPreferenceBalance {
  const totalBudget =
    normalizePositiveNumber(
      input.totalBudget
    );

  const nightCount =
    normalizePositiveNumber(
      input.nightCount
    );

  const roomCount =
    normalizePositiveNumber(
      input.roomCount
    );

  const maxDistanceKm =
    normalizePositiveNumber(
      input.maxDistanceKm
    );

  const isReady =
    input.hasDestination &&
    totalBudget !== null &&
    nightCount !== null &&
    roomCount !== null;

  if (!isReady) {
    return {
      isReady: false,

      selectedIndex: 2,

      explanation:
        "Select a destination, valid dates and a total budget to see SmartStay's suggested balance.",

      budgetPerRoomNight: null,
    };
  }

  const budgetPerRoomNight =
    totalBudget /
    (
      nightCount *
      roomCount
    );

  const budgetPreferenceIndex =
    getBudgetPreferenceIndex(
      budgetPerRoomNight
    );

  const selectedIndex =
    clampPreferenceIndex(
      budgetPreferenceIndex +
      getDistanceAdjustment(
        budgetPreferenceIndex,
        maxDistanceKm
      )
    );

  return {
    isReady: true,

    selectedIndex,

    explanation:
      createExplanation(
        selectedIndex,
        budgetPreferenceIndex,
        maxDistanceKm,
        totalBudget,
        nightCount
      ),

    budgetPerRoomNight,
  };
}
