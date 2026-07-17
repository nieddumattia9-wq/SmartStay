import type {
  SmartStayAccommodationCategory,
  SmartStayReliabilityGateStatus,
  SmartStayRiskLevelV2,
  SmartStayUnitType,
} from "../model/smartStayEvaluationV2";

import type {
  SmartStayUtilityDimensionCodeV2,
  SmartStayUtilityPreferenceIdV2,
} from "../utility/userUtilityEngine";

import type {
  SmartStayAccommodationFeatureCodeV2,
} from "../categories/accommodationCategoryModel";

import type {
  SmartStayCounterfactualVerdictV2,
} from "../comparisons/counterfactualComparisonsEngine";

export const SMARTSTAY_GOLDEN_DATASET_VERSION_V2 =
  "2.0.0-golden.1" as const;

export type SmartStayGoldenDatasetVersionV2 =
  typeof SMARTSTAY_GOLDEN_DATASET_VERSION_V2;

export type SmartStayGoldenScenarioKindV2 =
  | "balanced-choice"
  | "family-hard-constraints"
  | "savings-profile"
  | "location-hard-limit"
  | "insufficient-budget"
  | "missing-data"
  | "fragile-data"
  | "pareto-dominance"
  | "near-duplicates"
  | "ranking-stability";

export type SmartStayGoldenCostCompletenessV2 =
  | "reported-complete"
  | "partial"
  | "unknown";

export type SmartStayGoldenComparisonDirectionV2 =
  | "higher"
  | "lower"
  | "equivalent"
  | "unknown";

export type SmartStayGoldenInvariantCodeV2 =
  | "best-choice-within-budget"
  | "comfort-profile-preserves-constraints"
  | "counterfactuals-quantified"
  | "diversity-preserves-quality"
  | "duplicate-properties-grouped"
  | "explanations-grounded"
  | "fragile-data-cannot-win"
  | "hard-distance-limit"
  | "mandatory-requirements"
  | "material-improvement-overrides-stability"
  | "missing-data-not-negative"
  | "no-primary-when-no-within-budget"
  | "pareto-dominated-cannot-win"
  | "previous-order-only-within-equivalence"
  | "price-increase-cannot-improve"
  | "ranking-deterministic"
  | "review-count-increases-confidence-not-rating"
  | "role-separation"
  | "same-currency-comparison"
  | "saving-profile-preserves-constraints";

export interface SmartStayGoldenSearchContextV2 {
  destination: string;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  budgetTotal: number | null;
  maximumDistanceKm: number | null;
  preferenceId: SmartStayUtilityPreferenceIdV2;
  requiredFeatureCodes: SmartStayAccommodationFeatureCodeV2[];
  preferredFeatureCodes: SmartStayAccommodationFeatureCodeV2[];
  requiredUnitTypes: SmartStayUnitType[];
  preferredUnitTypes: SmartStayUnitType[];
  previousRankingHotelIds: string[];
}

export interface SmartStayGoldenCandidateV2 {
  hotelId: string;
  name: string;
  provider: string;
  canonicalPropertyKey: string;
  category: SmartStayAccommodationCategory;
  unitType: SmartStayUnitType;
  totalCost: number | null;
  currency: string | null;
  costCompleteness: SmartStayGoldenCostCompletenessV2;
  withinBudget: boolean | null;
  distanceKm: number | null;
  distanceConstraintSatisfied: boolean | null;
  reviewScore: number | null;
  reviewCount: number | null;
  smartScore: number | null;
  dimensionScores: Record<
    SmartStayUtilityDimensionCodeV2,
    number | null
  >;
  dimensionConfidence: number;
  scoreConfidence: number;
  evidenceCoverage: number;
  riskScore: number;
  riskLevel: SmartStayRiskLevelV2;
  reliabilityStatus: SmartStayReliabilityGateStatus;
  eligibleForPrimaryRanking: boolean;
  mandatoryRequirementsSatisfied: boolean;
}

export interface SmartStayGoldenPairwiseOrderV2 {
  higherHotelId: string;
  lowerHotelId: string;
  reasonCode: string;
}

export interface SmartStayGoldenCounterfactualExpectationV2 {
  selectedHotelId: string;
  alternativeHotelId: string;
  verdict: SmartStayCounterfactualVerdictV2;
  expectedCostDirection: SmartStayGoldenComparisonDirectionV2;
  expectedUtilityDirection: SmartStayGoldenComparisonDirectionV2;
}

export interface SmartStayGoldenNearDuplicateGroupV2 {
  canonicalPropertyKey: string;
  primaryHotelId: string;
  memberHotelIds: string[];
}

export interface SmartStayGoldenExpectationsV2 {
  bestChoiceHotelId: string | null;
  bestSensibleSavingHotelId: string | null;
  worthwhileComfortUpgradeHotelId: string | null;
  mustNotBeBestChoiceHotelIds: string[];
  paretoDominatedHotelIds: string[];
  visibleHotelIds: string[];
  additionalHotelIds: string[];
  nearDuplicateGroups: SmartStayGoldenNearDuplicateGroupV2[];
  pairwiseOrder: SmartStayGoldenPairwiseOrderV2[];
  counterfactuals: SmartStayGoldenCounterfactualExpectationV2[];
}

export interface SmartStayGoldenMutationChangesV2 {
  totalCost?: number | null;
  withinBudget?: boolean | null;
  reviewCount?: number | null;
  smartScore?: number | null;
  scoreConfidence?: number;
  evidenceCoverage?: number;
}

export interface SmartStayGoldenMutationV2 {
  id: string;
  candidateHotelId: string;
  changes: SmartStayGoldenMutationChangesV2;
  expectationCodes: SmartStayGoldenInvariantCodeV2[];
}

export interface SmartStayGoldenScenarioV2 {
  id: string;
  title: string;
  kind: SmartStayGoldenScenarioKindV2;
  description: string;
  search: SmartStayGoldenSearchContextV2;
  candidates: SmartStayGoldenCandidateV2[];
  expectations: SmartStayGoldenExpectationsV2;
  mutations: SmartStayGoldenMutationV2[];
  invariantCodes: SmartStayGoldenInvariantCodeV2[];
  reviewNotes: string[];
}

export interface SmartStayGoldenDatasetValidationV2 {
  version: SmartStayGoldenDatasetVersionV2;
  scenarioCount: number;
  candidateCount: number;
  mutationCount: number;
  counterfactualCount: number;
  nearDuplicateGroupCount: number;
  scenarioKindCounts: Record<
    SmartStayGoldenScenarioKindV2,
    number
  >;
  coveredInvariantCodes: SmartStayGoldenInvariantCodeV2[];
  fingerprint: string;
}

const GOLDEN_SCENARIO_KINDS:
  readonly SmartStayGoldenScenarioKindV2[] = [
    "balanced-choice",
    "family-hard-constraints",
    "savings-profile",
    "location-hard-limit",
    "insufficient-budget",
    "missing-data",
    "fragile-data",
    "pareto-dominance",
    "near-duplicates",
    "ranking-stability",
  ];

const GOLDEN_INVARIANT_CODES:
  readonly SmartStayGoldenInvariantCodeV2[] = [
    "best-choice-within-budget",
    "comfort-profile-preserves-constraints",
    "counterfactuals-quantified",
    "diversity-preserves-quality",
    "duplicate-properties-grouped",
    "explanations-grounded",
    "fragile-data-cannot-win",
    "hard-distance-limit",
    "mandatory-requirements",
    "material-improvement-overrides-stability",
    "missing-data-not-negative",
    "no-primary-when-no-within-budget",
    "pareto-dominated-cannot-win",
    "previous-order-only-within-equivalence",
    "price-increase-cannot-improve",
    "ranking-deterministic",
    "review-count-increases-confidence-not-rating",
    "role-separation",
    "same-currency-comparison",
    "saving-profile-preserves-constraints",
  ];

const UTILITY_DIMENSION_CODES:
  readonly SmartStayUtilityDimensionCodeV2[] = [
    "priceValue",
    "quality",
    "location",
    "comfort",
    "flexibility",
    "categoryFit",
    "userFit",
  ];

function compareStrings(
  first: string,
  second: string
) {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

function uniqueSorted<T extends string>(
  values: T[]
) {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ].sort(
    compareStrings
  ) as T[];
}

function isFiniteNumber(
  value: unknown
): value is number {
  return typeof value === "number" &&
    Number.isFinite(value);
}

function isRatio(
  value: unknown
) {
  return isFiniteNumber(value) &&
    value >= 0 &&
    value <= 1;
}

function stableSerialize(
  value: unknown
): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return [
      "[",
      value.map(
        stableSerialize
      ).join(","),
      "]",
    ].join("");
  }

  if (
    typeof value === "object"
  ) {
    const record =
      value as Record<string, unknown>;

    return [
      "{",
      Object.keys(record)
        .sort(compareStrings)
        .map(
          (key) =>
            `${JSON.stringify(key)}:${stableSerialize(record[key])}`
        )
        .join(","),
      "}",
    ].join("");
  }

  throw new Error(
    "Golden Dataset contains an unsupported value."
  );
}

function createFingerprint(
  value: unknown
) {
  const serialized =
    stableSerialize(value);

  let hash =
    0x811c9dc5;

  for (
    let index = 0;
    index < serialized.length;
    index++
  ) {
    hash ^=
      serialized.charCodeAt(index);

    hash =
      Math.imul(
        hash,
        0x01000193
      );
  }

  return (
    hash >>> 0
  )
    .toString(16)
    .padStart(8, "0");
}

function expectedRiskLevel(
  riskScore: number
): SmartStayRiskLevelV2 {
  if (riskScore >= 60) {
    return "high";
  }

  if (riskScore >= 30) {
    return "medium";
  }

  return "low";
}

function validateReferencedHotelId(
  scenarioId: string,
  label: string,
  hotelId: string | null,
  candidateIds: Set<string>,
  errors: string[]
) {
  if (
    hotelId !== null &&
    !candidateIds.has(hotelId)
  ) {
    errors.push(
      `${scenarioId}: ${label} references unknown hotel ${hotelId}.`
    );
  }
}

function validateCandidate(
  scenario: SmartStayGoldenScenarioV2,
  candidate: SmartStayGoldenCandidateV2,
  candidateIds: Set<string>,
  errors: string[]
) {
  const prefix =
    `${scenario.id}:${candidate.hotelId}`;

  if (!candidate.hotelId.trim()) {
    errors.push(
      `${scenario.id}: candidate hotelId is empty.`
    );

    return;
  }

  if (
    candidateIds.has(
      candidate.hotelId
    )
  ) {
    errors.push(
      `${scenario.id}: duplicate candidate ${candidate.hotelId}.`
    );
  }

  candidateIds.add(
    candidate.hotelId
  );

  if (
    !candidate.name.trim() ||
    !candidate.provider.trim() ||
    !candidate.canonicalPropertyKey.trim()
  ) {
    errors.push(
      `${prefix}: name, provider and canonicalPropertyKey are required.`
    );
  }

  if (
    candidate.totalCost !== null &&
    (
      !isFiniteNumber(candidate.totalCost) ||
      candidate.totalCost <= 0
    )
  ) {
    errors.push(
      `${prefix}: totalCost must be positive or null.`
    );
  }

  if (
    candidate.currency !== null &&
    !/^[A-Z]{3}$/.test(
      candidate.currency
    )
  ) {
    errors.push(
      `${prefix}: currency must be an ISO-like three-letter code.`
    );
  }

  if (
    candidate.withinBudget !== null &&
    candidate.totalCost !== null &&
    scenario.search.budgetTotal !== null &&
    candidate.withinBudget !==
      (
        candidate.totalCost <=
        scenario.search.budgetTotal
      )
  ) {
    errors.push(
      `${prefix}: withinBudget is inconsistent with totalCost.`
    );
  }

  if (
    candidate.distanceKm !== null &&
    (
      !isFiniteNumber(candidate.distanceKm) ||
      candidate.distanceKm < 0
    )
  ) {
    errors.push(
      `${prefix}: distanceKm must be non-negative or null.`
    );
  }

  if (
    candidate.distanceConstraintSatisfied !== null &&
    candidate.distanceKm !== null &&
    scenario.search.maximumDistanceKm !== null &&
    candidate.distanceConstraintSatisfied !==
      (
        candidate.distanceKm <=
        scenario.search.maximumDistanceKm
      )
  ) {
    errors.push(
      `${prefix}: distanceConstraintSatisfied is inconsistent.`
    );
  }

  if (
    candidate.reviewScore !== null &&
    (
      !isFiniteNumber(candidate.reviewScore) ||
      candidate.reviewScore < 0 ||
      candidate.reviewScore > 10
    )
  ) {
    errors.push(
      `${prefix}: reviewScore must be between 0 and 10 or null.`
    );
  }

  if (
    candidate.reviewCount !== null &&
    (
      !Number.isInteger(candidate.reviewCount) ||
      candidate.reviewCount < 0
    )
  ) {
    errors.push(
      `${prefix}: reviewCount must be a non-negative integer or null.`
    );
  }

  if (
    candidate.smartScore !== null &&
    (
      !isFiniteNumber(candidate.smartScore) ||
      candidate.smartScore < 0 ||
      candidate.smartScore > 100
    )
  ) {
    errors.push(
      `${prefix}: smartScore must be between 0 and 100 or null.`
    );
  }

  for (
    const dimension
    of UTILITY_DIMENSION_CODES
  ) {
    const score =
      candidate.dimensionScores[
        dimension
      ];

    if (
      score !== null &&
      (
        !isFiniteNumber(score) ||
        score < 0 ||
        score > 100
      )
    ) {
      errors.push(
        `${prefix}: invalid ${dimension} score.`
      );
    }
  }

  if (
    !isRatio(candidate.dimensionConfidence) ||
    !isRatio(candidate.scoreConfidence) ||
    !isRatio(candidate.evidenceCoverage)
  ) {
    errors.push(
      `${prefix}: confidence and coverage values must be between 0 and 1.`
    );
  }

  if (
    !isFiniteNumber(candidate.riskScore) ||
    candidate.riskScore < 0 ||
    candidate.riskScore > 100
  ) {
    errors.push(
      `${prefix}: riskScore must be between 0 and 100.`
    );
  }
  else if (
    candidate.riskLevel !==
    expectedRiskLevel(
      candidate.riskScore
    )
  ) {
    errors.push(
      `${prefix}: riskLevel is inconsistent with riskScore.`
    );
  }

  if (
    candidate.eligibleForPrimaryRanking &&
    (
      candidate.reliabilityStatus ===
        "invalid" ||
      candidate.reliabilityStatus ===
        "low-confidence" ||
      candidate.mandatoryRequirementsSatisfied ===
        false ||
      candidate.distanceConstraintSatisfied ===
        false ||
      candidate.currency ===
        null
    )
  ) {
    errors.push(
      `${prefix}: primary-ranking eligibility contradicts a blocking state.`
    );
  }
}

function validateScenario(
  scenario: SmartStayGoldenScenarioV2,
  scenarioIds: Set<string>,
  coveredInvariantCodes: Set<SmartStayGoldenInvariantCodeV2>,
  errors: string[]
) {
  if (!scenario.id.trim()) {
    errors.push(
      "Golden scenario id is empty."
    );

    return;
  }

  if (
    scenarioIds.has(
      scenario.id
    )
  ) {
    errors.push(
      `Duplicate golden scenario: ${scenario.id}.`
    );
  }

  scenarioIds.add(
    scenario.id
  );

  if (
    !scenario.title.trim() ||
    !scenario.description.trim() ||
    !scenario.search.destination.trim()
  ) {
    errors.push(
      `${scenario.id}: title, description and destination are required.`
    );
  }

  if (
    !Number.isInteger(
      scenario.search.nights
    ) ||
    scenario.search.nights <= 0 ||
    !Number.isInteger(
      scenario.search.adults
    ) ||
    scenario.search.adults <= 0 ||
    !Number.isInteger(
      scenario.search.children
    ) ||
    scenario.search.children < 0 ||
    !Number.isInteger(
      scenario.search.rooms
    ) ||
    scenario.search.rooms <= 0
  ) {
    errors.push(
      `${scenario.id}: invalid stay or guest configuration.`
    );
  }

  if (
    scenario.search.budgetTotal !== null &&
    (
      !isFiniteNumber(
        scenario.search.budgetTotal
      ) ||
      scenario.search.budgetTotal <= 0
    )
  ) {
    errors.push(
      `${scenario.id}: budgetTotal must be positive or null.`
    );
  }

  if (
    scenario.search.maximumDistanceKm !== null &&
    (
      !isFiniteNumber(
        scenario.search.maximumDistanceKm
      ) ||
      scenario.search.maximumDistanceKm <= 0
    )
  ) {
    errors.push(
      `${scenario.id}: maximumDistanceKm must be positive or null.`
    );
  }

  if (
    scenario.candidates.length <
    3
  ) {
    errors.push(
      `${scenario.id}: at least three candidates are required.`
    );
  }

  const candidateIds =
    new Set<string>();

  for (
    const candidate
    of scenario.candidates
  ) {
    validateCandidate(
      scenario,
      candidate,
      candidateIds,
      errors
    );
  }

  const expectations =
    scenario.expectations;

  validateReferencedHotelId(
    scenario.id,
    "bestChoiceHotelId",
    expectations.bestChoiceHotelId,
    candidateIds,
    errors
  );

  validateReferencedHotelId(
    scenario.id,
    "bestSensibleSavingHotelId",
    expectations.bestSensibleSavingHotelId,
    candidateIds,
    errors
  );

  validateReferencedHotelId(
    scenario.id,
    "worthwhileComfortUpgradeHotelId",
    expectations.worthwhileComfortUpgradeHotelId,
    candidateIds,
    errors
  );

  const roleHotelIds =
    [
      expectations.bestChoiceHotelId,
      expectations.bestSensibleSavingHotelId,
      expectations.worthwhileComfortUpgradeHotelId,
    ].filter(
      (
        hotelId
      ): hotelId is string =>
        hotelId !== null
    );

  if (
    new Set(roleHotelIds).size !==
    roleHotelIds.length
  ) {
    errors.push(
      `${scenario.id}: primary recommendation roles must use distinct hotels.`
    );
  }

  if (
    expectations.bestChoiceHotelId
  ) {
    const bestChoice =
      scenario.candidates.find(
        (candidate) =>
          candidate.hotelId ===
          expectations.bestChoiceHotelId
      );

    if (
      !bestChoice ||
      bestChoice.withinBudget !== true ||
      bestChoice.eligibleForPrimaryRanking !== true
    ) {
      errors.push(
        `${scenario.id}: expected Best Choice must be eligible and within budget.`
      );
    }
  }
  else if (
    scenario.candidates.some(
      (candidate) =>
        candidate.withinBudget ===
          true &&
        candidate.eligibleForPrimaryRanking ===
          true
    )
  ) {
    errors.push(
      `${scenario.id}: null Best Choice conflicts with an eligible within-budget candidate.`
    );
  }

  const referencedLists = [
    [
      "mustNotBeBestChoiceHotelIds",
      expectations.mustNotBeBestChoiceHotelIds,
    ],
    [
      "paretoDominatedHotelIds",
      expectations.paretoDominatedHotelIds,
    ],
    [
      "visibleHotelIds",
      expectations.visibleHotelIds,
    ],
    [
      "additionalHotelIds",
      expectations.additionalHotelIds,
    ],
  ] as const;

  for (
    const [
      label,
      hotelIds,
    ]
    of referencedLists
  ) {
    if (
      new Set(hotelIds).size !==
      hotelIds.length
    ) {
      errors.push(
        `${scenario.id}: ${label} contains duplicates.`
      );
    }

    for (
      const hotelId
      of hotelIds
    ) {
      validateReferencedHotelId(
        scenario.id,
        label,
        hotelId,
        candidateIds,
        errors
      );
    }
  }

  const visibleSet =
    new Set(
      expectations.visibleHotelIds
    );

  if (
    expectations.additionalHotelIds.some(
      (hotelId) =>
        visibleSet.has(hotelId)
    )
  ) {
    errors.push(
      `${scenario.id}: visible and additional hotel sets overlap.`
    );
  }

  for (
    const order
    of expectations.pairwiseOrder
  ) {
    validateReferencedHotelId(
      scenario.id,
      "pairwiseOrder.higherHotelId",
      order.higherHotelId,
      candidateIds,
      errors
    );

    validateReferencedHotelId(
      scenario.id,
      "pairwiseOrder.lowerHotelId",
      order.lowerHotelId,
      candidateIds,
      errors
    );

    if (
      order.higherHotelId ===
        order.lowerHotelId ||
      !order.reasonCode.trim()
    ) {
      errors.push(
        `${scenario.id}: invalid pairwise ordering expectation.`
      );
    }
  }

  for (
    const counterfactual
    of expectations.counterfactuals
  ) {
    validateReferencedHotelId(
      scenario.id,
      "counterfactual.selectedHotelId",
      counterfactual.selectedHotelId,
      candidateIds,
      errors
    );

    validateReferencedHotelId(
      scenario.id,
      "counterfactual.alternativeHotelId",
      counterfactual.alternativeHotelId,
      candidateIds,
      errors
    );

    if (
      counterfactual.selectedHotelId ===
      counterfactual.alternativeHotelId
    ) {
      errors.push(
        `${scenario.id}: counterfactual pair must contain two different hotels.`
      );
    }
  }

  for (
    const group
    of expectations.nearDuplicateGroups
  ) {
    if (
      !group.canonicalPropertyKey.trim() ||
      group.memberHotelIds.length < 2 ||
      !group.memberHotelIds.includes(
        group.primaryHotelId
      )
    ) {
      errors.push(
        `${scenario.id}: invalid near-duplicate group.`
      );

      continue;
    }

    for (
      const hotelId
      of group.memberHotelIds
    ) {
      validateReferencedHotelId(
        scenario.id,
        "nearDuplicateGroups.memberHotelIds",
        hotelId,
        candidateIds,
        errors
      );

      const candidate =
        scenario.candidates.find(
          (entry) =>
            entry.hotelId ===
            hotelId
        );

      if (
        candidate &&
        candidate.canonicalPropertyKey !==
          group.canonicalPropertyKey
      ) {
        errors.push(
          `${scenario.id}: near-duplicate group mixes canonical property keys.`
        );
      }
    }
  }

  const mutationIds =
    new Set<string>();

  for (
    const mutation
    of scenario.mutations
  ) {
    if (
      !mutation.id.trim() ||
      mutationIds.has(
        mutation.id
      )
    ) {
      errors.push(
        `${scenario.id}: duplicate or empty mutation id.`
      );
    }

    mutationIds.add(
      mutation.id
    );

    validateReferencedHotelId(
      scenario.id,
      "mutation.candidateHotelId",
      mutation.candidateHotelId,
      candidateIds,
      errors
    );

    if (
      Object.keys(
        mutation.changes
      ).length === 0 ||
      mutation.expectationCodes.length ===
        0
    ) {
      errors.push(
        `${scenario.id}:${mutation.id}: mutation requires changes and expectations.`
      );
    }

    for (
      const code
      of mutation.expectationCodes
    ) {
      coveredInvariantCodes.add(
        code
      );
    }
  }

  if (
    scenario.invariantCodes.length ===
      0 ||
    new Set(
      scenario.invariantCodes
    ).size !==
      scenario.invariantCodes.length
  ) {
    errors.push(
      `${scenario.id}: invariantCodes must be non-empty and unique.`
    );
  }

  for (
    const code
    of scenario.invariantCodes
  ) {
    coveredInvariantCodes.add(
      code
    );
  }

  if (
    scenario.reviewNotes.length ===
      0 ||
    scenario.reviewNotes.some(
      (note) =>
        !note.trim()
    )
  ) {
    errors.push(
      `${scenario.id}: at least one non-empty review note is required.`
    );
  }
}

export const SMARTSTAY_GOLDEN_DATASET_V2:
  readonly SmartStayGoldenScenarioV2[] =
  [
  {
    "id": "florence-balanced-couple",
    "title": "Firenze, coppia, due notti, scelta equilibrata",
    "kind": "balanced-choice",
    "description": "Scenario base con Best Choice, risparmio sensato, upgrade comfort e un risultato dominato.",
    "search": {
      "destination": "Firenze",
      "nights": 2,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 250,
      "maximumDistanceKm": 2.5,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi",
        "private-bathroom"
      ],
      "preferredFeatureCodes": [
        "air-conditioning",
        "breakfast"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "florence-balance",
        "name": "Arno Balance Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "arno-balance-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 238,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 0.9,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.9,
        "reviewCount": 840,
        "smartScore": 88,
        "dimensionScores": {
          "priceValue": 80,
          "quality": 88,
          "location": 88,
          "comfort": 86,
          "flexibility": 84,
          "categoryFit": 90,
          "userFit": 92
        },
        "dimensionConfidence": 0.93,
        "scoreConfidence": 0.93,
        "evidenceCoverage": 0.96,
        "riskScore": 10,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "florence-saving",
        "name": "Santa Croce Smart Rooms",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "santa-croce-smart-rooms",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 205,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.6,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.5,
        "reviewCount": 410,
        "smartScore": 83,
        "dimensionScores": {
          "priceValue": 94,
          "quality": 80,
          "location": 79,
          "comfort": 75,
          "flexibility": 78,
          "categoryFit": 90,
          "userFit": 86
        },
        "dimensionConfidence": 0.89,
        "scoreConfidence": 0.89,
        "evidenceCoverage": 0.92,
        "riskScore": 14,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "florence-upgrade",
        "name": "Duomo Comfort Suites",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "duomo-comfort-suites",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 274,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 0.6,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.3,
        "reviewCount": 1290,
        "smartScore": 91,
        "dimensionScores": {
          "priceValue": 70,
          "quality": 94,
          "location": 93,
          "comfort": 95,
          "flexibility": 92,
          "categoryFit": 90,
          "userFit": 94
        },
        "dimensionConfidence": 0.95,
        "scoreConfidence": 0.95,
        "evidenceCoverage": 0.97,
        "riskScore": 9,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "florence-dominated",
        "name": "Central Standard Inn",
        "provider": "RouteStack",
        "canonicalPropertyKey": "central-standard-inn",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 245,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.0,
        "reviewCount": 220,
        "smartScore": 75,
        "dimensionScores": {
          "priceValue": 76,
          "quality": 74,
          "location": 72,
          "comfort": 70,
          "flexibility": 68,
          "categoryFit": 85,
          "userFit": 75
        },
        "dimensionConfidence": 0.86,
        "scoreConfidence": 0.86,
        "evidenceCoverage": 0.88,
        "riskScore": 22,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "florence-balance",
      "bestSensibleSavingHotelId": "florence-saving",
      "worthwhileComfortUpgradeHotelId": "florence-upgrade",
      "mustNotBeBestChoiceHotelIds": [
        "florence-dominated"
      ],
      "paretoDominatedHotelIds": [
        "florence-dominated"
      ],
      "visibleHotelIds": [
        "florence-balance",
        "florence-saving",
        "florence-upgrade"
      ],
      "additionalHotelIds": [
        "florence-dominated"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "florence-balance",
          "lowerHotelId": "florence-dominated",
          "reasonCode": "balanced-choice-clearly-superior"
        }
      ],
      "counterfactuals": [
        {
          "selectedHotelId": "florence-balance",
          "alternativeHotelId": "florence-saving",
          "verdict": "trade-off",
          "expectedCostDirection": "lower",
          "expectedUtilityDirection": "lower"
        },
        {
          "selectedHotelId": "florence-balance",
          "alternativeHotelId": "florence-upgrade",
          "verdict": "trade-off",
          "expectedCostDirection": "higher",
          "expectedUtilityDirection": "higher"
        }
      ]
    },
    "mutations": [
      {
        "id": "florence-saving-price-increase",
        "candidateHotelId": "florence-saving",
        "changes": {
          "totalCost": 225,
          "withinBudget": true
        },
        "expectationCodes": [
          "price-increase-cannot-improve"
        ]
      }
    ],
    "invariantCodes": [
      "best-choice-within-budget",
      "role-separation",
      "pareto-dominated-cannot-win",
      "price-increase-cannot-improve",
      "counterfactuals-quantified",
      "explanations-grounded"
    ],
    "reviewNotes": [
      "La scelta equilibrata deve restare sopra il risultato dominato.",
      "L'upgrade deve essere presentato come trade-off, non come vincitore assoluto."
    ]
  },
  {
    "id": "rome-family-hard-constraints",
    "title": "Roma, famiglia, cinque notti, requisiti obbligatori",
    "kind": "family-hard-constraints",
    "description": "Un hotel economico non deve superare appartamenti che rispettano cucina, lavatrice e alloggio intero.",
    "search": {
      "destination": "Roma",
      "nights": 5,
      "adults": 2,
      "children": 2,
      "rooms": 2,
      "budgetTotal": 700,
      "maximumDistanceKm": 5,
      "preferenceId": "comfort",
      "requiredFeatureCodes": [
        "wifi",
        "kitchen",
        "washing-machine",
        "private-bathroom"
      ],
      "preferredFeatureCodes": [
        "air-conditioning",
        "self-check-in"
      ],
      "requiredUnitTypes": [
        "entire-place"
      ],
      "preferredUnitTypes": [
        "entire-place"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "rome-family-apartment",
        "name": "Trastevere Family Apartment",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "trastevere-family-apartment",
        "category": "apartment",
        "unitType": "entire-place",
        "totalCost": 680,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.1,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.0,
        "reviewCount": 530,
        "smartScore": 91,
        "dimensionScores": {
          "priceValue": 76,
          "quality": 87,
          "location": 82,
          "comfort": 94,
          "flexibility": 88,
          "categoryFit": 96,
          "userFit": 96
        },
        "dimensionConfidence": 0.94,
        "scoreConfidence": 0.94,
        "evidenceCoverage": 0.96,
        "riskScore": 11,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "rome-family-saving",
        "name": "San Giovanni Family Stay",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "san-giovanni-family-stay",
        "category": "vacation-rental",
        "unitType": "entire-place",
        "totalCost": 630,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.7,
        "reviewCount": 310,
        "smartScore": 86,
        "dimensionScores": {
          "priceValue": 88,
          "quality": 82,
          "location": 76,
          "comfort": 86,
          "flexibility": 82,
          "categoryFit": 95,
          "userFit": 90
        },
        "dimensionConfidence": 0.9,
        "scoreConfidence": 0.9,
        "evidenceCoverage": 0.93,
        "riskScore": 15,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "rome-cheap-hotel-room",
        "name": "Termini Budget Room",
        "provider": "RouteStack",
        "canonicalPropertyKey": "termini-budget-room",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 560,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.5,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.4,
        "reviewCount": 900,
        "smartScore": 78,
        "dimensionScores": {
          "priceValue": 96,
          "quality": 84,
          "location": 88,
          "comfort": 68,
          "flexibility": 72,
          "categoryFit": 35,
          "userFit": 40
        },
        "dimensionConfidence": 0.91,
        "scoreConfidence": 0.91,
        "evidenceCoverage": 0.94,
        "riskScore": 17,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": false,
        "mandatoryRequirementsSatisfied": false
      },
      {
        "hotelId": "rome-premium-apartment",
        "name": "Navona Premium Residence",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "navona-premium-residence",
        "category": "aparthotel",
        "unitType": "entire-place",
        "totalCost": 760,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 1.3,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.3,
        "reviewCount": 720,
        "smartScore": 93,
        "dimensionScores": {
          "priceValue": 64,
          "quality": 92,
          "location": 90,
          "comfort": 98,
          "flexibility": 94,
          "categoryFit": 96,
          "userFit": 98
        },
        "dimensionConfidence": 0.95,
        "scoreConfidence": 0.95,
        "evidenceCoverage": 0.97,
        "riskScore": 10,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "rome-family-apartment",
      "bestSensibleSavingHotelId": "rome-family-saving",
      "worthwhileComfortUpgradeHotelId": "rome-premium-apartment",
      "mustNotBeBestChoiceHotelIds": [
        "rome-cheap-hotel-room"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "rome-family-apartment",
        "rome-family-saving",
        "rome-premium-apartment"
      ],
      "additionalHotelIds": [
        "rome-cheap-hotel-room"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "rome-family-apartment",
          "lowerHotelId": "rome-cheap-hotel-room",
          "reasonCode": "mandatory-requirements-protected"
        }
      ],
      "counterfactuals": [
        {
          "selectedHotelId": "rome-family-apartment",
          "alternativeHotelId": "rome-cheap-hotel-room",
          "verdict": "selected-better-overall",
          "expectedCostDirection": "lower",
          "expectedUtilityDirection": "lower"
        }
      ]
    },
    "mutations": [],
    "invariantCodes": [
      "mandatory-requirements",
      "best-choice-within-budget",
      "comfort-profile-preserves-constraints",
      "role-separation",
      "counterfactuals-quantified"
    ],
    "reviewNotes": [
      "Il prezzo piÃ¹ basso non compensa la violazione dei requisiti obbligatori."
    ]
  },
  {
    "id": "paris-maximum-savings",
    "title": "Parigi, sette notti, profilo massimo risparmio",
    "kind": "savings-profile",
    "description": "Il profilo Saving deve valorizzare il risparmio senza accettare qualitÃ  e categoria incompatibili.",
    "search": {
      "destination": "Parigi",
      "nights": 7,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 1000,
      "maximumDistanceKm": 4,
      "preferenceId": "maximum-savings",
      "requiredFeatureCodes": [
        "wifi",
        "private-bathroom"
      ],
      "preferredFeatureCodes": [
        "kitchen"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "private-room",
        "hotel-room",
        "entire-place"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "paris-saving",
        "name": "Montmartre Long Stay",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "montmartre-long-stay",
        "category": "aparthotel",
        "unitType": "private-room",
        "totalCost": 790,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.1,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.4,
        "reviewCount": 680,
        "smartScore": 89,
        "dimensionScores": {
          "priceValue": 96,
          "quality": 78,
          "location": 76,
          "comfort": 74,
          "flexibility": 72,
          "categoryFit": 86,
          "userFit": 88
        },
        "dimensionConfidence": 0.91,
        "scoreConfidence": 0.91,
        "evidenceCoverage": 0.94,
        "riskScore": 14,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "paris-balanced",
        "name": "Latin Quarter Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "latin-quarter-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 880,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.5,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.0,
        "reviewCount": 1450,
        "smartScore": 87,
        "dimensionScores": {
          "priceValue": 84,
          "quality": 88,
          "location": 86,
          "comfort": 86,
          "flexibility": 84,
          "categoryFit": 90,
          "userFit": 90
        },
        "dimensionConfidence": 0.95,
        "scoreConfidence": 0.95,
        "evidenceCoverage": 0.97,
        "riskScore": 9,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "paris-hostel",
        "name": "Canal Shared Hostel",
        "provider": "RouteStack",
        "canonicalPropertyKey": "canal-shared-hostel",
        "category": "hostel",
        "unitType": "shared-room",
        "totalCost": 620,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 7.6,
        "reviewCount": 1500,
        "smartScore": 74,
        "dimensionScores": {
          "priceValue": 100,
          "quality": 65,
          "location": 68,
          "comfort": 55,
          "flexibility": 60,
          "categoryFit": 45,
          "userFit": 58
        },
        "dimensionConfidence": 0.9,
        "scoreConfidence": 0.9,
        "evidenceCoverage": 0.92,
        "riskScore": 28,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "paris-premium",
        "name": "Opera Grand Suite",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "opera-grand-suite",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 1320,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 0.9,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.4,
        "reviewCount": 2100,
        "smartScore": 90,
        "dimensionScores": {
          "priceValue": 45,
          "quality": 95,
          "location": 94,
          "comfort": 96,
          "flexibility": 90,
          "categoryFit": 92,
          "userFit": 92
        },
        "dimensionConfidence": 0.96,
        "scoreConfidence": 0.96,
        "evidenceCoverage": 0.98,
        "riskScore": 8,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "paris-saving",
      "bestSensibleSavingHotelId": null,
      "worthwhileComfortUpgradeHotelId": null,
      "mustNotBeBestChoiceHotelIds": [
        "paris-hostel",
        "paris-premium"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "paris-saving",
        "paris-balanced",
        "paris-hostel"
      ],
      "additionalHotelIds": [
        "paris-premium"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "paris-saving",
          "lowerHotelId": "paris-hostel",
          "reasonCode": "savings-with-minimum-quality"
        }
      ],
      "counterfactuals": [
        {
          "selectedHotelId": "paris-saving",
          "alternativeHotelId": "paris-hostel",
          "verdict": "trade-off",
          "expectedCostDirection": "lower",
          "expectedUtilityDirection": "lower"
        }
      ]
    },
    "mutations": [],
    "invariantCodes": [
      "saving-profile-preserves-constraints",
      "best-choice-within-budget",
      "counterfactuals-quantified",
      "explanations-grounded"
    ],
    "reviewNotes": [
      "Il profilo massimo risparmio non deve trasformarsi in minimo prezzo a ogni costo."
    ]
  },
  {
    "id": "milan-station-distance-limit",
    "title": "Milano, una notte, vicinanza alla stazione",
    "kind": "location-hard-limit",
    "description": "Un risultato molto economico ma oltre il limite di distanza non deve entrare nel ranking primario.",
    "search": {
      "destination": "Milano Centrale",
      "nights": 1,
      "adults": 1,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 220,
      "maximumDistanceKm": 1,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi"
      ],
      "preferredFeatureCodes": [
        "workspace",
        "breakfast"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "milan-station-choice",
        "name": "Centrale Smart Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "centrale-smart-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 205,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 0.25,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.7,
        "reviewCount": 780,
        "smartScore": 91,
        "dimensionScores": {
          "priceValue": 78,
          "quality": 84,
          "location": 98,
          "comfort": 80,
          "flexibility": 82,
          "categoryFit": 90,
          "userFit": 94
        },
        "dimensionConfidence": 0.94,
        "scoreConfidence": 0.94,
        "evidenceCoverage": 0.96,
        "riskScore": 10,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "milan-near-saving",
        "name": "Loreto City Rooms",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "loreto-city-rooms",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 185,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 0.85,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.3,
        "reviewCount": 320,
        "smartScore": 85,
        "dimensionScores": {
          "priceValue": 90,
          "quality": 79,
          "location": 82,
          "comfort": 75,
          "flexibility": 78,
          "categoryFit": 88,
          "userFit": 88
        },
        "dimensionConfidence": 0.89,
        "scoreConfidence": 0.89,
        "evidenceCoverage": 0.92,
        "riskScore": 15,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "milan-cheap-far",
        "name": "Outer Ring Budget Hotel",
        "provider": "RouteStack",
        "canonicalPropertyKey": "outer-ring-budget-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 160,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 3.5,
        "distanceConstraintSatisfied": false,
        "reviewScore": 8.2,
        "reviewCount": 900,
        "smartScore": 78,
        "dimensionScores": {
          "priceValue": 100,
          "quality": 78,
          "location": 35,
          "comfort": 76,
          "flexibility": 75,
          "categoryFit": 88,
          "userFit": 70
        },
        "dimensionConfidence": 0.91,
        "scoreConfidence": 0.91,
        "evidenceCoverage": 0.94,
        "riskScore": 18,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": false,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "milan-premium",
        "name": "Station Executive Suites",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "station-executive-suites",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 235,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 0.1,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.2,
        "reviewCount": 1100,
        "smartScore": 93,
        "dimensionScores": {
          "priceValue": 68,
          "quality": 91,
          "location": 100,
          "comfort": 90,
          "flexibility": 88,
          "categoryFit": 90,
          "userFit": 96
        },
        "dimensionConfidence": 0.95,
        "scoreConfidence": 0.95,
        "evidenceCoverage": 0.97,
        "riskScore": 8,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "milan-station-choice",
      "bestSensibleSavingHotelId": "milan-near-saving",
      "worthwhileComfortUpgradeHotelId": "milan-premium",
      "mustNotBeBestChoiceHotelIds": [
        "milan-cheap-far"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "milan-station-choice",
        "milan-near-saving",
        "milan-premium"
      ],
      "additionalHotelIds": [
        "milan-cheap-far"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "milan-station-choice",
          "lowerHotelId": "milan-cheap-far",
          "reasonCode": "distance-limit-protected"
        }
      ],
      "counterfactuals": [
        {
          "selectedHotelId": "milan-station-choice",
          "alternativeHotelId": "milan-cheap-far",
          "verdict": "selected-better-overall",
          "expectedCostDirection": "lower",
          "expectedUtilityDirection": "lower"
        }
      ]
    },
    "mutations": [],
    "invariantCodes": [
      "hard-distance-limit",
      "best-choice-within-budget",
      "role-separation",
      "counterfactuals-quantified"
    ],
    "reviewNotes": [
      "Il vincolo di distanza Ã¨ rigido e non puÃ² essere compensato dal prezzo."
    ]
  },
  {
    "id": "barcelona-insufficient-budget",
    "title": "Barcellona, budget insufficiente",
    "kind": "insufficient-budget",
    "description": "Quando nessun risultato affidabile Ã¨ entro budget, il motore non deve inventare una Best Choice conforme.",
    "search": {
      "destination": "Barcellona",
      "nights": 4,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 300,
      "maximumDistanceKm": 3,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi",
        "private-bathroom"
      ],
      "preferredFeatureCodes": [
        "air-conditioning"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "barcelona-a",
        "name": "Eixample Rooms",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "eixample-rooms",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 340,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 1.4,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.5,
        "reviewCount": 430,
        "smartScore": 84,
        "dimensionScores": {
          "priceValue": 72,
          "quality": 82,
          "location": 85,
          "comfort": 78,
          "flexibility": 80,
          "categoryFit": 88,
          "userFit": 86
        },
        "dimensionConfidence": 0.9,
        "scoreConfidence": 0.9,
        "evidenceCoverage": 0.93,
        "riskScore": 14,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "barcelona-b",
        "name": "Gothic Quarter Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "gothic-quarter-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 360,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 0.9,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.8,
        "reviewCount": 810,
        "smartScore": 87,
        "dimensionScores": {
          "priceValue": 68,
          "quality": 87,
          "location": 90,
          "comfort": 84,
          "flexibility": 82,
          "categoryFit": 90,
          "userFit": 89
        },
        "dimensionConfidence": 0.93,
        "scoreConfidence": 0.93,
        "evidenceCoverage": 0.95,
        "riskScore": 11,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "barcelona-c",
        "name": "Sants Practical Stay",
        "provider": "RouteStack",
        "canonicalPropertyKey": "sants-practical-stay",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 390,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 2.2,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.2,
        "reviewCount": 260,
        "smartScore": 79,
        "dimensionScores": {
          "priceValue": 60,
          "quality": 78,
          "location": 72,
          "comfort": 80,
          "flexibility": 76,
          "categoryFit": 88,
          "userFit": 78
        },
        "dimensionConfidence": 0.84,
        "scoreConfidence": 0.84,
        "evidenceCoverage": 0.87,
        "riskScore": 20,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": null,
      "bestSensibleSavingHotelId": null,
      "worthwhileComfortUpgradeHotelId": null,
      "mustNotBeBestChoiceHotelIds": [
        "barcelona-a",
        "barcelona-b",
        "barcelona-c"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "barcelona-b",
        "barcelona-a"
      ],
      "additionalHotelIds": [
        "barcelona-c"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "barcelona-b",
          "lowerHotelId": "barcelona-c",
          "reasonCode": "best-over-budget-fallback"
        }
      ],
      "counterfactuals": []
    },
    "mutations": [],
    "invariantCodes": [
      "no-primary-when-no-within-budget",
      "explanations-grounded"
    ],
    "reviewNotes": [
      "L'assenza di una scelta entro budget deve essere dichiarata esplicitamente."
    ]
  },
  {
    "id": "naples-missing-reviews",
    "title": "Napoli, recensioni mancanti e poche recensioni",
    "kind": "missing-data",
    "description": "Un dato mancante riduce la fiducia ma non diventa automaticamente un punteggio pari a zero.",
    "search": {
      "destination": "Napoli",
      "nights": 3,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 400,
      "maximumDistanceKm": 3,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi"
      ],
      "preferredFeatureCodes": [
        "air-conditioning",
        "breakfast"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "naples-solid",
        "name": "Chiaia Reliable Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "chiaia-reliable-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 360,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.2,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.6,
        "reviewCount": 500,
        "smartScore": 89,
        "dimensionScores": {
          "priceValue": 82,
          "quality": 88,
          "location": 86,
          "comfort": 84,
          "flexibility": 82,
          "categoryFit": 90,
          "userFit": 90
        },
        "dimensionConfidence": 0.92,
        "scoreConfidence": 0.92,
        "evidenceCoverage": 0.95,
        "riskScore": 11,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "naples-missing-review",
        "name": "Centro Rooms No Reviews",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "centro-rooms-no-reviews",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 340,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.0,
        "distanceConstraintSatisfied": true,
        "reviewScore": null,
        "reviewCount": null,
        "smartScore": 84,
        "dimensionScores": {
          "priceValue": 90,
          "quality": null,
          "location": 84,
          "comfort": 82,
          "flexibility": 80,
          "categoryFit": 90,
          "userFit": 88
        },
        "dimensionConfidence": 0.68,
        "scoreConfidence": 0.68,
        "evidenceCoverage": 0.78,
        "riskScore": 18,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "naples-few-reviews",
        "name": "Vomero New Stay",
        "provider": "RouteStack",
        "canonicalPropertyKey": "vomero-new-stay",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 355,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.0,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.8,
        "reviewCount": 10,
        "smartScore": 85,
        "dimensionScores": {
          "priceValue": 84,
          "quality": 84,
          "location": 78,
          "comfort": 83,
          "flexibility": 80,
          "categoryFit": 90,
          "userFit": 86
        },
        "dimensionConfidence": 0.72,
        "scoreConfidence": 0.72,
        "evidenceCoverage": 0.82,
        "riskScore": 17,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "naples-premium",
        "name": "Lungomare Premium Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "lungomare-premium-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 420,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 0.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.1,
        "reviewCount": 980,
        "smartScore": 91,
        "dimensionScores": {
          "priceValue": 70,
          "quality": 92,
          "location": 90,
          "comfort": 91,
          "flexibility": 88,
          "categoryFit": 90,
          "userFit": 92
        },
        "dimensionConfidence": 0.95,
        "scoreConfidence": 0.95,
        "evidenceCoverage": 0.97,
        "riskScore": 9,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "naples-solid",
      "bestSensibleSavingHotelId": null,
      "worthwhileComfortUpgradeHotelId": "naples-premium",
      "mustNotBeBestChoiceHotelIds": [
        "naples-missing-review"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "naples-solid",
        "naples-few-reviews",
        "naples-premium"
      ],
      "additionalHotelIds": [
        "naples-missing-review"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "naples-solid",
          "lowerHotelId": "naples-missing-review",
          "reasonCode": "solid-data-over-missing-reviews"
        }
      ],
      "counterfactuals": [
        {
          "selectedHotelId": "naples-solid",
          "alternativeHotelId": "naples-missing-review",
          "verdict": "selected-better-overall",
          "expectedCostDirection": "lower",
          "expectedUtilityDirection": "lower"
        }
      ]
    },
    "mutations": [
      {
        "id": "naples-few-reviews-more-volume",
        "candidateHotelId": "naples-few-reviews",
        "changes": {
          "reviewCount": 300
        },
        "expectationCodes": [
          "review-count-increases-confidence-not-rating"
        ]
      }
    ],
    "invariantCodes": [
      "missing-data-not-negative",
      "review-count-increases-confidence-not-rating",
      "fragile-data-cannot-win",
      "counterfactuals-quantified"
    ],
    "reviewNotes": [
      "La qualitÃ  mancante deve restare null, non zero.",
      "PiÃ¹ recensioni aumentano la fiducia senza cambiare il rating grezzo."
    ]
  },
  {
    "id": "venice-fragile-price-data",
    "title": "Venezia, prezzo fragile e valuta conflittuale",
    "kind": "fragile-data",
    "description": "Un prezzo eccezionalmente basso ma non confrontabile non deve battere risultati solidi.",
    "search": {
      "destination": "Venezia",
      "nights": 2,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 450,
      "maximumDistanceKm": 4,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi",
        "private-bathroom"
      ],
      "preferredFeatureCodes": [
        "breakfast"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "venice-solid",
        "name": "Cannaregio Solid Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "cannaregio-solid-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 410,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.8,
        "reviewCount": 720,
        "smartScore": 88,
        "dimensionScores": {
          "priceValue": 80,
          "quality": 88,
          "location": 84,
          "comfort": 84,
          "flexibility": 82,
          "categoryFit": 90,
          "userFit": 90
        },
        "dimensionConfidence": 0.93,
        "scoreConfidence": 0.93,
        "evidenceCoverage": 0.96,
        "riskScore": 12,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "venice-fragile-cheap",
        "name": "Lagoon Impossible Deal",
        "provider": "RouteStack",
        "canonicalPropertyKey": "lagoon-impossible-deal",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 260,
        "currency": null,
        "costCompleteness": "unknown",
        "withinBudget": null,
        "distanceKm": 2.0,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.0,
        "reviewCount": 50,
        "smartScore": 95,
        "dimensionScores": {
          "priceValue": 100,
          "quality": 90,
          "location": 80,
          "comfort": 82,
          "flexibility": 80,
          "categoryFit": 90,
          "userFit": 88
        },
        "dimensionConfidence": 0.25,
        "scoreConfidence": 0.25,
        "evidenceCoverage": 0.4,
        "riskScore": 70,
        "riskLevel": "high",
        "reliabilityStatus": "invalid",
        "eligibleForPrimaryRanking": false,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "venice-partial-cheap",
        "name": "Mestre Partial Cost",
        "provider": "RouteStack",
        "canonicalPropertyKey": "mestre-partial-cost",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 330,
        "currency": "EUR",
        "costCompleteness": "partial",
        "withinBudget": true,
        "distanceKm": 3.2,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.5,
        "reviewCount": 300,
        "smartScore": 86,
        "dimensionScores": {
          "priceValue": 96,
          "quality": 82,
          "location": 70,
          "comfort": 78,
          "flexibility": 72,
          "categoryFit": 88,
          "userFit": 80
        },
        "dimensionConfidence": 0.5,
        "scoreConfidence": 0.5,
        "evidenceCoverage": 0.52,
        "riskScore": 48,
        "riskLevel": "medium",
        "reliabilityStatus": "low-confidence",
        "eligibleForPrimaryRanking": false,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "venice-valid-saving",
        "name": "Dorsoduro Smart Rooms",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "dorsoduro-smart-rooms",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 370,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.4,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.4,
        "reviewCount": 410,
        "smartScore": 84,
        "dimensionScores": {
          "priceValue": 90,
          "quality": 81,
          "location": 78,
          "comfort": 77,
          "flexibility": 76,
          "categoryFit": 88,
          "userFit": 84
        },
        "dimensionConfidence": 0.87,
        "scoreConfidence": 0.87,
        "evidenceCoverage": 0.9,
        "riskScore": 18,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "venice-solid",
      "bestSensibleSavingHotelId": "venice-valid-saving",
      "worthwhileComfortUpgradeHotelId": null,
      "mustNotBeBestChoiceHotelIds": [
        "venice-fragile-cheap",
        "venice-partial-cheap"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "venice-solid",
        "venice-valid-saving"
      ],
      "additionalHotelIds": [
        "venice-partial-cheap",
        "venice-fragile-cheap"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "venice-solid",
          "lowerHotelId": "venice-fragile-cheap",
          "reasonCode": "solid-data-over-impossible-price"
        }
      ],
      "counterfactuals": []
    },
    "mutations": [],
    "invariantCodes": [
      "fragile-data-cannot-win",
      "same-currency-comparison",
      "best-choice-within-budget",
      "role-separation"
    ],
    "reviewNotes": [
      "Il prezzo non confrontabile deve essere escluso, non premiato."
    ]
  },
  {
    "id": "bologna-pareto-dominance",
    "title": "Bologna, candidato chiaramente dominato",
    "kind": "pareto-dominance",
    "description": "Un risultato peggiore o equivalente in tutte le dimensioni non deve ottenere un ruolo principale.",
    "search": {
      "destination": "Bologna",
      "nights": 3,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 500,
      "maximumDistanceKm": 3,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi"
      ],
      "preferredFeatureCodes": [
        "breakfast",
        "air-conditioning"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "bologna-dominant",
        "name": "Portici Smart Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "portici-smart-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 430,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.0,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.9,
        "reviewCount": 820,
        "smartScore": 90,
        "dimensionScores": {
          "priceValue": 86,
          "quality": 88,
          "location": 90,
          "comfort": 85,
          "flexibility": 84,
          "categoryFit": 90,
          "userFit": 90
        },
        "dimensionConfidence": 0.94,
        "scoreConfidence": 0.94,
        "evidenceCoverage": 0.96,
        "riskScore": 10,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "bologna-dominated",
        "name": "Portici Standard Hotel",
        "provider": "RouteStack",
        "canonicalPropertyKey": "portici-standard-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 450,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.2,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.5,
        "reviewCount": 500,
        "smartScore": 86,
        "dimensionScores": {
          "priceValue": 82,
          "quality": 84,
          "location": 86,
          "comfort": 80,
          "flexibility": 80,
          "categoryFit": 88,
          "userFit": 86
        },
        "dimensionConfidence": 0.9,
        "scoreConfidence": 0.9,
        "evidenceCoverage": 0.93,
        "riskScore": 16,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "bologna-tradeoff",
        "name": "University Budget Stay",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "university-budget-stay",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 390,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.2,
        "reviewCount": 360,
        "smartScore": 85,
        "dimensionScores": {
          "priceValue": 94,
          "quality": 80,
          "location": 76,
          "comfort": 78,
          "flexibility": 82,
          "categoryFit": 88,
          "userFit": 88
        },
        "dimensionConfidence": 0.88,
        "scoreConfidence": 0.88,
        "evidenceCoverage": 0.91,
        "riskScore": 17,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "bologna-premium",
        "name": "Piazza Maggiore Premium",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "piazza-maggiore-premium",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 520,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": false,
        "distanceKm": 0.5,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.4,
        "reviewCount": 1300,
        "smartScore": 92,
        "dimensionScores": {
          "priceValue": 70,
          "quality": 95,
          "location": 94,
          "comfort": 94,
          "flexibility": 92,
          "categoryFit": 90,
          "userFit": 92
        },
        "dimensionConfidence": 0.96,
        "scoreConfidence": 0.96,
        "evidenceCoverage": 0.98,
        "riskScore": 8,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "bologna-dominant",
      "bestSensibleSavingHotelId": "bologna-tradeoff",
      "worthwhileComfortUpgradeHotelId": "bologna-premium",
      "mustNotBeBestChoiceHotelIds": [
        "bologna-dominated"
      ],
      "paretoDominatedHotelIds": [
        "bologna-dominated"
      ],
      "visibleHotelIds": [
        "bologna-dominant",
        "bologna-tradeoff",
        "bologna-premium"
      ],
      "additionalHotelIds": [
        "bologna-dominated"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "bologna-dominant",
          "lowerHotelId": "bologna-dominated",
          "reasonCode": "pareto-dominance"
        }
      ],
      "counterfactuals": [
        {
          "selectedHotelId": "bologna-dominant",
          "alternativeHotelId": "bologna-dominated",
          "verdict": "selected-better-overall",
          "expectedCostDirection": "higher",
          "expectedUtilityDirection": "lower"
        }
      ]
    },
    "mutations": [],
    "invariantCodes": [
      "pareto-dominated-cannot-win",
      "role-separation",
      "counterfactuals-quantified"
    ],
    "reviewNotes": [
      "Il candidato dominato deve rimanere auditabile ma non ricevere un ruolo."
    ]
  },
  {
    "id": "turin-near-duplicate-providers",
    "title": "Torino, stessa struttura da due provider",
    "kind": "near-duplicates",
    "description": "Le offerte della stessa struttura devono essere raggruppate e non occupare piÃ¹ slot visibili.",
    "search": {
      "destination": "Torino",
      "nights": 2,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 450,
      "maximumDistanceKm": 3,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi"
      ],
      "preferredFeatureCodes": [
        "breakfast",
        "parking"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "entire-place"
      ],
      "previousRankingHotelIds": []
    },
    "candidates": [
      {
        "hotelId": "turin-grand-lite",
        "name": "Grand Torino Hotel - LiteAPI",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "grand-torino-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 400,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 0.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.9,
        "reviewCount": 920,
        "smartScore": 90,
        "dimensionScores": {
          "priceValue": 84,
          "quality": 88,
          "location": 90,
          "comfort": 85,
          "flexibility": 84,
          "categoryFit": 90,
          "userFit": 92
        },
        "dimensionConfidence": 0.94,
        "scoreConfidence": 0.94,
        "evidenceCoverage": 0.96,
        "riskScore": 10,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "turin-grand-route",
        "name": "Grand Torino Hotel - RouteStack",
        "provider": "RouteStack",
        "canonicalPropertyKey": "grand-torino-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 405,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 0.8,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.9,
        "reviewCount": 920,
        "smartScore": 89.5,
        "dimensionScores": {
          "priceValue": 82,
          "quality": 88,
          "location": 90,
          "comfort": 85,
          "flexibility": 84,
          "categoryFit": 90,
          "userFit": 92
        },
        "dimensionConfidence": 0.82,
        "scoreConfidence": 0.82,
        "evidenceCoverage": 0.86,
        "riskScore": 18,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "turin-apartment",
        "name": "Riverside Apartment",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "riverside-apartment",
        "category": "apartment",
        "unitType": "entire-place",
        "totalCost": 390,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.5,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.6,
        "reviewCount": 380,
        "smartScore": 87,
        "dimensionScores": {
          "priceValue": 86,
          "quality": 84,
          "location": 82,
          "comfort": 90,
          "flexibility": 80,
          "categoryFit": 92,
          "userFit": 88
        },
        "dimensionConfidence": 0.9,
        "scoreConfidence": 0.9,
        "evidenceCoverage": 0.93,
        "riskScore": 13,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "turin-budget-hotel",
        "name": "Porta Nuova Budget Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "porta-nuova-budget-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 350,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.2,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.2,
        "reviewCount": 470,
        "smartScore": 84,
        "dimensionScores": {
          "priceValue": 94,
          "quality": 80,
          "location": 78,
          "comfort": 76,
          "flexibility": 78,
          "categoryFit": 88,
          "userFit": 85
        },
        "dimensionConfidence": 0.88,
        "scoreConfidence": 0.88,
        "evidenceCoverage": 0.91,
        "riskScore": 16,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "turin-grand-lite",
      "bestSensibleSavingHotelId": "turin-budget-hotel",
      "worthwhileComfortUpgradeHotelId": null,
      "mustNotBeBestChoiceHotelIds": [
        "turin-grand-route"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "turin-grand-lite",
        "turin-budget-hotel",
        "turin-apartment"
      ],
      "additionalHotelIds": [
        "turin-grand-route"
      ],
      "nearDuplicateGroups": [
        {
          "canonicalPropertyKey": "grand-torino-hotel",
          "primaryHotelId": "turin-grand-lite",
          "memberHotelIds": [
            "turin-grand-lite",
            "turin-grand-route"
          ]
        }
      ],
      "pairwiseOrder": [
        {
          "higherHotelId": "turin-grand-lite",
          "lowerHotelId": "turin-grand-route",
          "reasonCode": "duplicate-primary-provider"
        }
      ],
      "counterfactuals": []
    },
    "mutations": [],
    "invariantCodes": [
      "duplicate-properties-grouped",
      "diversity-preserves-quality",
      "role-separation",
      "best-choice-within-budget"
    ],
    "reviewNotes": [
      "La seconda offerta della stessa struttura deve essere disponibile come alternativa, non come card separata nei primi risultati."
    ]
  },
  {
    "id": "genoa-ranking-stability",
    "title": "Genova, pareggi reali e memoria dell'ordine",
    "kind": "ranking-stability",
    "description": "L'ordine precedente puÃ² risolvere un pareggio reale, ma deve cedere davanti a un miglioramento sostanziale.",
    "search": {
      "destination": "Genova",
      "nights": 2,
      "adults": 2,
      "children": 0,
      "rooms": 1,
      "budgetTotal": 500,
      "maximumDistanceKm": 3,
      "preferenceId": "balanced",
      "requiredFeatureCodes": [
        "wifi"
      ],
      "preferredFeatureCodes": [
        "breakfast"
      ],
      "requiredUnitTypes": [],
      "preferredUnitTypes": [
        "hotel-room",
        "private-room"
      ],
      "previousRankingHotelIds": [
        "genoa-winner",
        "genoa-tie-b",
        "genoa-tie-a",
        "genoa-clear-low"
      ]
    },
    "candidates": [
      {
        "hotelId": "genoa-winner",
        "name": "Porto Antico Smart Hotel",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "porto-antico-smart-hotel",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 460,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 0.7,
        "distanceConstraintSatisfied": true,
        "reviewScore": 9.0,
        "reviewCount": 850,
        "smartScore": 90,
        "dimensionScores": {
          "priceValue": 82,
          "quality": 90,
          "location": 92,
          "comfort": 88,
          "flexibility": 86,
          "categoryFit": 90,
          "userFit": 92
        },
        "dimensionConfidence": 0.94,
        "scoreConfidence": 0.94,
        "evidenceCoverage": 0.96,
        "riskScore": 10,
        "riskLevel": "low",
        "reliabilityStatus": "strong-data",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "genoa-tie-a",
        "name": "Caruggi Hotel A",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "caruggi-hotel-a",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 450,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.1,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.5,
        "reviewCount": 420,
        "smartScore": 82.1,
        "dimensionScores": {
          "priceValue": 84,
          "quality": 82,
          "location": 84,
          "comfort": 80,
          "flexibility": 80,
          "categoryFit": 90,
          "userFit": 84
        },
        "dimensionConfidence": 0.88,
        "scoreConfidence": 0.88,
        "evidenceCoverage": 0.91,
        "riskScore": 15,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "genoa-tie-b",
        "name": "Caruggi Hotel B",
        "provider": "RouteStack",
        "canonicalPropertyKey": "caruggi-hotel-b",
        "category": "hotel",
        "unitType": "hotel-room",
        "totalCost": 451,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 1.0,
        "distanceConstraintSatisfied": true,
        "reviewScore": 8.5,
        "reviewCount": 430,
        "smartScore": 82.0,
        "dimensionScores": {
          "priceValue": 83.8,
          "quality": 82.1,
          "location": 84.1,
          "comfort": 80,
          "flexibility": 80,
          "categoryFit": 90,
          "userFit": 84
        },
        "dimensionConfidence": 0.88,
        "scoreConfidence": 0.88,
        "evidenceCoverage": 0.91,
        "riskScore": 15,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      },
      {
        "hotelId": "genoa-clear-low",
        "name": "Outer Genoa Basic Stay",
        "provider": "LiteAPI",
        "canonicalPropertyKey": "outer-genoa-basic-stay",
        "category": "guesthouse",
        "unitType": "private-room",
        "totalCost": 430,
        "currency": "EUR",
        "costCompleteness": "reported-complete",
        "withinBudget": true,
        "distanceKm": 2.7,
        "distanceConstraintSatisfied": true,
        "reviewScore": 7.5,
        "reviewCount": 110,
        "smartScore": 76,
        "dimensionScores": {
          "priceValue": 88,
          "quality": 68,
          "location": 62,
          "comfort": 64,
          "flexibility": 66,
          "categoryFit": 82,
          "userFit": 70
        },
        "dimensionConfidence": 0.78,
        "scoreConfidence": 0.78,
        "evidenceCoverage": 0.82,
        "riskScore": 27,
        "riskLevel": "low",
        "reliabilityStatus": "usable",
        "eligibleForPrimaryRanking": true,
        "mandatoryRequirementsSatisfied": true
      }
    ],
    "expectations": {
      "bestChoiceHotelId": "genoa-winner",
      "bestSensibleSavingHotelId": null,
      "worthwhileComfortUpgradeHotelId": null,
      "mustNotBeBestChoiceHotelIds": [
        "genoa-clear-low"
      ],
      "paretoDominatedHotelIds": [],
      "visibleHotelIds": [
        "genoa-winner",
        "genoa-tie-b",
        "genoa-tie-a"
      ],
      "additionalHotelIds": [
        "genoa-clear-low"
      ],
      "nearDuplicateGroups": [],
      "pairwiseOrder": [
        {
          "higherHotelId": "genoa-tie-b",
          "lowerHotelId": "genoa-tie-a",
          "reasonCode": "previous-order-within-equivalence-band"
        },
        {
          "higherHotelId": "genoa-tie-a",
          "lowerHotelId": "genoa-clear-low",
          "reasonCode": "material-score-separation"
        }
      ],
      "counterfactuals": []
    },
    "mutations": [
      {
        "id": "genoa-tie-a-material-improvement",
        "candidateHotelId": "genoa-tie-a",
        "changes": {
          "smartScore": 86
        },
        "expectationCodes": [
          "material-improvement-overrides-stability"
        ]
      }
    ],
    "invariantCodes": [
      "ranking-deterministic",
      "previous-order-only-within-equivalence",
      "material-improvement-overrides-stability",
      "diversity-preserves-quality"
    ],
    "reviewNotes": [
      "La memoria dell'ordine non Ã¨ una gabbia: vale solo nella fascia di equivalenza."
    ]
  }
];

export function getSmartStayGoldenDatasetFingerprintV2(
  dataset:
    readonly SmartStayGoldenScenarioV2[] =
      SMARTSTAY_GOLDEN_DATASET_V2
) {
  return createFingerprint({
    version:
      SMARTSTAY_GOLDEN_DATASET_VERSION_V2,

    scenarios:
      dataset,
  });
}

export function getSmartStayGoldenScenarioV2(
  scenarioId: string,
  dataset:
    readonly SmartStayGoldenScenarioV2[] =
      SMARTSTAY_GOLDEN_DATASET_V2
) {
  const normalizedId =
    scenarioId.trim();

  if (!normalizedId) {
    return null;
  }

  return dataset.find(
    (scenario) =>
      scenario.id ===
      normalizedId
  ) ?? null;
}

export function validateSmartStayGoldenDatasetV2(
  dataset:
    readonly SmartStayGoldenScenarioV2[] =
      SMARTSTAY_GOLDEN_DATASET_V2
): SmartStayGoldenDatasetValidationV2 {
  const errors:
    string[] = [];

  if (
    dataset.length <
    GOLDEN_SCENARIO_KINDS.length
  ) {
    errors.push(
      `Golden Dataset requires at least ${GOLDEN_SCENARIO_KINDS.length} scenarios.`
    );
  }

  const scenarioIds =
    new Set<string>();

  const coveredInvariantCodes =
    new Set<
      SmartStayGoldenInvariantCodeV2
    >();

  const scenarioKindCounts =
    Object.fromEntries(
      GOLDEN_SCENARIO_KINDS.map(
        (kind) => [
          kind,
          0,
        ]
      )
    ) as Record<
      SmartStayGoldenScenarioKindV2,
      number
    >;

  for (
    const scenario
    of dataset
  ) {
    scenarioKindCounts[
      scenario.kind
    ] +=
      1;

    validateScenario(
      scenario,
      scenarioIds,
      coveredInvariantCodes,
      errors
    );
  }

  for (
    const kind
    of GOLDEN_SCENARIO_KINDS
  ) {
    if (
      scenarioKindCounts[
        kind
      ] === 0
    ) {
      errors.push(
        `Golden Dataset does not cover scenario kind ${kind}.`
      );
    }
  }

  for (
    const invariant
    of GOLDEN_INVARIANT_CODES
  ) {
    if (
      !coveredInvariantCodes.has(
        invariant
      )
    ) {
      errors.push(
        `Golden Dataset does not cover invariant ${invariant}.`
      );
    }
  }

  if (
    errors.length >
    0
  ) {
    throw new Error(
      [
        "SmartStay Golden Dataset V2 validation failed:",
        ...errors.map(
          (error) =>
            `- ${error}`
        ),
      ].join("\n")
    );
  }

  return {
    version:
      SMARTSTAY_GOLDEN_DATASET_VERSION_V2,

    scenarioCount:
      dataset.length,

    candidateCount:
      dataset.reduce(
        (
          total,
          scenario
        ) =>
          total +
          scenario.candidates.length,
        0
      ),

    mutationCount:
      dataset.reduce(
        (
          total,
          scenario
        ) =>
          total +
          scenario.mutations.length,
        0
      ),

    counterfactualCount:
      dataset.reduce(
        (
          total,
          scenario
        ) =>
          total +
          scenario.expectations
            .counterfactuals
            .length,
        0
      ),

    nearDuplicateGroupCount:
      dataset.reduce(
        (
          total,
          scenario
        ) =>
          total +
          scenario.expectations
            .nearDuplicateGroups
            .length,
        0
      ),

    scenarioKindCounts,

    coveredInvariantCodes:
      uniqueSorted([
        ...coveredInvariantCodes,
      ]),

    fingerprint:
      getSmartStayGoldenDatasetFingerprintV2(
        dataset
      ),
  };
}