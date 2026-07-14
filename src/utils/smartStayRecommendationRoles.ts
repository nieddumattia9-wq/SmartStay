import type {
  SmartStayEvaluation,
} from "./smartStayEngine";

export type SmartStayRecommendationRole =
  | "best-choice"
  | "cheaper-alternative"
  | "comfort-upgrade";

export type SmartStayRecommendationPick = {
  role: SmartStayRecommendationRole;
  label: string;
  reason: string;
  evaluation: SmartStayEvaluation;

  metrics: {
    priceDifferenceAmount: number | null;
    priceDifferencePercent: number | null;
    comfortDifference: number | null;
  };
};

type ComparableCost = {
  amount: number;
  currency: string;
};

type ComfortComponent =
  | "reviews"
  | "location"
  | "stars"
  | "amenities";

const ROLE_LABELS:
  Record<
    SmartStayRecommendationRole,
    string
  > = {
    "best-choice":
      "Best choice for you",

    "cheaper-alternative":
      "Best cheaper alternative",

    "comfort-upgrade":
      "Best comfort upgrade",
  };

const COMFORT_COMPONENT_LABELS:
  Record<
    ComfortComponent,
    string
  > = {
    reviews:
      "guest-review profile",

    location:
      "location",

    stars:
      "property category",

    amenities:
      "amenity profile",
  };

function hasPositiveNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function normalizeCurrency(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function roundMetric(
  value: number
) {
  return Math.round(value * 10) / 10;
}

function getComparableCost(
  evaluation: SmartStayEvaluation
): ComparableCost | null {
  const hotel =
    evaluation.hotel;

  const hotelCurrency =
    normalizeCurrency(
      hotel.currency
    );

  if (
    hasPositiveNumber(
      hotel.totalKnownCost
    ) &&
    hotelCurrency
  ) {
    return {
      amount:
        hotel.totalKnownCost,

      currency:
        hotelCurrency,
    };
  }

  const completeOfferCosts =
    (hotel.offers ?? [])
      .filter(
        (offer) =>
          hasPositiveNumber(
            offer.totalKnownCost
          )
      )
      .map((offer) => ({
        amount:
          offer.totalKnownCost as number,

        currency:
          normalizeCurrency(
            offer.currency ??
            hotel.currency
          ),
      }))
      .filter(
        (cost) =>
          Boolean(cost.currency)
      )
      .sort(
        (firstCost, secondCost) =>
          firstCost.amount -
          secondCost.amount
      );

  if (
    completeOfferCosts.length > 0
  ) {
    return completeOfferCosts[0];
  }

  if (
    hasPositiveNumber(
      hotel.price
    ) &&
    hotelCurrency
  ) {
    return {
      amount:
        hotel.price,

      currency:
        hotelCurrency,
    };
  }

  const offerPrices =
    (hotel.offers ?? [])
      .filter(
        (offer) =>
          hasPositiveNumber(
            offer.price
          )
      )
      .map((offer) => ({
        amount:
          offer.price,

        currency:
          normalizeCurrency(
            offer.currency ??
            hotel.currency
          ),
      }))
      .filter(
        (cost) =>
          Boolean(cost.currency)
      )
      .sort(
        (firstCost, secondCost) =>
          firstCost.amount -
          secondCost.amount
      );

  return offerPrices[0] ?? null;
}

function calculateComfortScore(
  evaluation: SmartStayEvaluation
) {
  const breakdown =
    evaluation.breakdown;

  return (
    breakdown.reviews * 0.28 +
    breakdown.stars * 0.24 +
    breakdown.amenities * 0.2 +
    breakdown.location * 0.16 +
    breakdown.reliability * 0.08 +
    breakdown.dataQuality * 0.04
  );
}

function getStrongestComfortGain(
  candidate: SmartStayEvaluation,
  bestChoice: SmartStayEvaluation
) {
  const components:
    ComfortComponent[] = [
      "reviews",
      "location",
      "stars",
      "amenities",
    ];

  return components
    .map((component) => ({
      component,

      difference:
        candidate.breakdown[
          component
        ] -
        bestChoice.breakdown[
          component
        ],
    }))
    .sort(
      (firstGain, secondGain) =>
        secondGain.difference -
        firstGain.difference
    )[0];
}

function isReliableAlternative(
  evaluation: SmartStayEvaluation
) {
  return (
    evaluation.riskLevel !== "high" &&
    evaluation.hotel
      .dataConfidence !== "limited" &&
    evaluation.breakdown
      .reliability >= 55
  );
}

function isDistanceCompatible(
  evaluation: SmartStayEvaluation,
  bestChoice: SmartStayEvaluation
) {
  if (
    evaluation.comparison
      .isWithinDistance === false
  ) {
    return false;
  }

  if (
    bestChoice.hotel.distance !==
      null &&
    evaluation.hotel.distance ===
      null
  ) {
    return false;
  }

  return true;
}

function createBestChoicePick(
  evaluation: SmartStayEvaluation
): SmartStayRecommendationPick {
  return {
    role:
      "best-choice",

    label:
      ROLE_LABELS[
        "best-choice"
      ],

    reason:
      "Strongest overall match for your budget, distance and selected SmartStay balance.",

    evaluation,

    metrics: {
      priceDifferenceAmount:
        null,

      priceDifferencePercent:
        null,

      comfortDifference:
        null,
    },
  };
}

function findCheaperAlternative(
  evaluations: SmartStayEvaluation[],
  bestChoice: SmartStayEvaluation
): SmartStayRecommendationPick | null {
  const bestCost =
    getComparableCost(
      bestChoice
    );

  if (!bestCost) {
    return null;
  }

  const candidates =
    evaluations
      .slice(1)
      .map(
        (evaluation, index) => {
          const candidateCost =
            getComparableCost(
              evaluation
            );

          if (
            !candidateCost ||
            candidateCost.currency !==
              bestCost.currency
          ) {
            return null;
          }

          const savingAmount =
            bestCost.amount -
            candidateCost.amount;

          const savingPercent =
            (
              savingAmount /
              bestCost.amount
            ) * 100;

          return {
            evaluation,
            originalIndex: index,
            savingAmount,
            savingPercent,
          };
        }
      )
      .filter(
        (
          candidate
        ): candidate is NonNullable<
          typeof candidate
        > =>
          candidate !== null
      )
      .filter((candidate) => {
        const minimumSavingAmount =
          Math.max(
            10,
            bestCost.amount * 0.05
          );

        return (
          candidate.savingAmount >=
            minimumSavingAmount &&
          candidate.evaluation
            .smartScore >=
            Math.max(
              65,
              bestChoice.smartScore -
                10
            ) &&
          isReliableAlternative(
            candidate.evaluation
          ) &&
          isDistanceCompatible(
            candidate.evaluation,
            bestChoice
          )
        );
      })
      .sort(
        (
          firstCandidate,
          secondCandidate
        ) => {
          if (
            secondCandidate
              .evaluation.smartScore !==
            firstCandidate
              .evaluation.smartScore
          ) {
            return (
              secondCandidate
                .evaluation.smartScore -
              firstCandidate
                .evaluation.smartScore
            );
          }

          if (
            secondCandidate
              .savingPercent !==
            firstCandidate
              .savingPercent
          ) {
            return (
              secondCandidate
                .savingPercent -
              firstCandidate
                .savingPercent
            );
          }

          return (
            firstCandidate
              .originalIndex -
            secondCandidate
              .originalIndex
          );
        }
      );

  const selected =
    candidates[0];

  if (!selected) {
    return null;
  }

  const savingPercent =
    roundMetric(
      selected.savingPercent
    );

  return {
    role:
      "cheaper-alternative",

    label:
      ROLE_LABELS[
        "cheaper-alternative"
      ],

    reason:
      `Costs ${savingPercent}% less than the best choice while keeping a competitive overall match.`,

    evaluation:
      selected.evaluation,

    metrics: {
      priceDifferenceAmount:
        roundMetric(
          -selected.savingAmount
        ),

      priceDifferencePercent:
        -savingPercent,

      comfortDifference:
        roundMetric(
          calculateComfortScore(
            selected.evaluation
          ) -
          calculateComfortScore(
            bestChoice
          )
        ),
    },
  };
}

function findComfortUpgrade(
  evaluations: SmartStayEvaluation[],
  bestChoice: SmartStayEvaluation,
  excludedHotelIds: Set<string>
): SmartStayRecommendationPick | null {
  const bestComfortScore =
    calculateComfortScore(
      bestChoice
    );

  const bestCost =
    getComparableCost(
      bestChoice
    );

  const candidates =
    evaluations
      .slice(1)
      .filter(
        (evaluation) =>
          !excludedHotelIds.has(
            evaluation.hotel.id
          )
      )
      .map(
        (evaluation, index) => {
          const comfortScore =
            calculateComfortScore(
              evaluation
            );

          const strongestGain =
            getStrongestComfortGain(
              evaluation,
              bestChoice
            );

          const candidateCost =
            getComparableCost(
              evaluation
            );

          return {
            evaluation,
            originalIndex: index,

            comfortDifference:
              comfortScore -
              bestComfortScore,

            strongestGain,
            candidateCost,
          };
        }
      )
      .filter((candidate) => {
        if (
          !isReliableAlternative(
            candidate.evaluation
          ) ||
          !isDistanceCompatible(
            candidate.evaluation,
            bestChoice
          )
        ) {
          return false;
        }

        if (
          candidate.evaluation
            .smartScore <
          Math.max(
            65,
            bestChoice.smartScore - 12
          )
        ) {
          return false;
        }

        if (
          candidate
            .comfortDifference < 5 ||
          candidate
            .strongestGain
            .difference < 8
        ) {
          return false;
        }

        const budgetDifferencePercent =
          candidate.evaluation
            .comparison
            .budgetDifferencePercent;

        if (
          budgetDifferencePercent !==
            null &&
          budgetDifferencePercent > 25
        ) {
          return false;
        }

        if (
          bestCost &&
          candidate.candidateCost &&
          bestCost.currency ===
            candidate.candidateCost
              .currency &&
          candidate.candidateCost
            .amount >
            bestCost.amount * 1.35
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (
          firstCandidate,
          secondCandidate
        ) => {
          if (
            secondCandidate
              .comfortDifference !==
            firstCandidate
              .comfortDifference
          ) {
            return (
              secondCandidate
                .comfortDifference -
              firstCandidate
                .comfortDifference
            );
          }

          if (
            secondCandidate
              .evaluation.smartScore !==
            firstCandidate
              .evaluation.smartScore
          ) {
            return (
              secondCandidate
                .evaluation.smartScore -
              firstCandidate
                .evaluation.smartScore
            );
          }

          return (
            firstCandidate
              .originalIndex -
            secondCandidate
              .originalIndex
          );
        }
      );

  const selected =
    candidates[0];

  if (!selected) {
    return null;
  }

  const componentLabel =
    COMFORT_COMPONENT_LABELS[
      selected.strongestGain
        .component
    ];

  let priceDifferenceAmount:
    number | null = null;

  let priceDifferencePercent:
    number | null = null;

  if (
    bestCost &&
    selected.candidateCost &&
    bestCost.currency ===
      selected.candidateCost.currency
  ) {
    priceDifferenceAmount =
      roundMetric(
        selected.candidateCost.amount -
        bestCost.amount
      );

    priceDifferencePercent =
      roundMetric(
        (
          priceDifferenceAmount /
          bestCost.amount
        ) * 100
      );
  }

  return {
    role:
      "comfort-upgrade",

    label:
      ROLE_LABELS[
        "comfort-upgrade"
      ],

    reason:
      `Offers a stronger ${componentLabel} while remaining a competitive overall match.`,

    evaluation:
      selected.evaluation,

    metrics: {
      priceDifferenceAmount,
      priceDifferencePercent,

      comfortDifference:
        roundMetric(
          selected
            .comfortDifference
        ),
    },
  };
}

export function selectSmartStayRecommendationRoles(
  rankedEvaluations:
    SmartStayEvaluation[]
): SmartStayRecommendationPick[] {
  if (
    rankedEvaluations.length === 0
  ) {
    return [];
  }

  const bestChoice =
    rankedEvaluations[0];

  const picks:
    SmartStayRecommendationPick[] = [
      createBestChoicePick(
        bestChoice
      ),
    ];

  const excludedHotelIds =
    new Set<string>([
      bestChoice.hotel.id,
    ]);

  const cheaperAlternative =
    findCheaperAlternative(
      rankedEvaluations,
      bestChoice
    );

  if (cheaperAlternative) {
    picks.push(
      cheaperAlternative
    );

    excludedHotelIds.add(
      cheaperAlternative
        .evaluation.hotel.id
    );
  }

  const comfortUpgrade =
    findComfortUpgrade(
      rankedEvaluations,
      bestChoice,
      excludedHotelIds
    );

  if (comfortUpgrade) {
    picks.push(
      comfortUpgrade
    );
  }

  return picks;
}
