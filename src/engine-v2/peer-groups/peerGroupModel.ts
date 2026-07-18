import type {
  SmartStayAccommodationCategory,
  SmartStayAccommodationProfileV2,
  SmartStayEvidenceFactV2,
  SmartStayPeerGroupMode,
  SmartStayPeerGroupV2,
  SmartStayReliabilityGateV2,
  SmartStayUnitType,
} from "../model/smartStayEvaluationV2";

export interface SmartStayPeerGroupCandidateV2 {
  hotelId:
    string;

  accommodation:
    SmartStayAccommodationProfileV2;

  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;
}

export interface SmartStayPeerGroupOptionsV2 {
  minimumSameCategorySize?:
    number;

  minimumCompatibleCategorySize?:
    number;

  minimumCrossCategorySize?:
    number;

  minimumPriceConfidence?:
    number;
}

export interface SmartStayPeerGroupAssignmentV2 {
  hotelId:
    string;

  peerGroup:
    SmartStayPeerGroupV2;

  memberHotelIds:
    string[];
}

type ComparableCandidate = {
  candidate:
    SmartStayPeerGroupCandidateV2;

  costFact:
    SmartStayEvidenceFactV2;
};

const DEFAULT_MINIMUM_SAME_CATEGORY_SIZE =
  3;

const DEFAULT_MINIMUM_COMPATIBLE_CATEGORY_SIZE =
  3;

const DEFAULT_MINIMUM_CROSS_CATEGORY_SIZE =
  4;

const DEFAULT_MINIMUM_PRICE_CONFIDENCE =
  0.6;

const CATEGORY_COMPATIBILITY:
  Readonly<
    Record<
      SmartStayAccommodationCategory,
      readonly SmartStayAccommodationCategory[]
    >
  > = {
    camping: [
      "camping",
    ],

    hotel: [
      "hotel",
      "bed-and-breakfast",
      "guesthouse",
      "aparthotel",
      "resort",
    ],

    "bed-and-breakfast": [
      "bed-and-breakfast",
      "guesthouse",
      "hotel",
    ],

    apartment: [
      "apartment",
      "vacation-rental",
      "aparthotel",
      "villa",
    ],

    "vacation-rental": [
      "vacation-rental",
      "apartment",
      "villa",
      "aparthotel",
    ],

    aparthotel: [
      "aparthotel",
      "apartment",
      "vacation-rental",
      "hotel",
    ],

    hostel: [
      "hostel",
      "guesthouse",
    ],

    guesthouse: [
      "guesthouse",
      "bed-and-breakfast",
      "hotel",
      "hostel",
    ],

    villa: [
      "villa",
      "vacation-rental",
      "apartment",
    ],

    resort: [
      "resort",
      "hotel",
    ],

    other: [
      "other",
    ],

    unknown: [
      "unknown",
    ],
  };

function clamp(
  value:
    number
) {
  return Math.min(
    Math.max(
      value,
      0
    ),
    1
  );
}

function normalizeMinimum(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value)
  );
}

function normalizeConfidence(
  value:
    unknown,
  fallback:
    number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return clamp(value);
}

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

function average(
  values:
    number[]
) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total + value,
      0
    ) /
    values.length
  );
}

function isConcreteCategory(
  category:
    SmartStayAccommodationCategory
) {
  return (
    category !== "unknown" &&
    category !== "other"
  );
}

function areCategoriesCompatible(
  target:
    SmartStayAccommodationCategory,
  candidate:
    SmartStayAccommodationCategory
) {
  if (
    target === candidate
  ) {
    return true;
  }

  if (
    !isConcreteCategory(target) ||
    !isConcreteCategory(candidate)
  ) {
    return false;
  }

  return CATEGORY_COMPATIBILITY[
    target
  ].includes(
    candidate
  );
}

function areUnitTypesCompatible(
  target:
    SmartStayUnitType,
  candidate:
    SmartStayUnitType
) {
  if (
    target === candidate
  ) {
    return true;
  }

  if (
    target === "unknown" ||
    candidate === "unknown"
  ) {
    return true;
  }

  const hotelRoomAndPrivateRoom =
    (
      target === "hotel-room" &&
      candidate === "private-room"
    ) ||
    (
      target === "private-room" &&
      candidate === "hotel-room"
    );

  return hotelRoomAndPrivateRoom;
}

function isEligibleForPeerBaseline(
  gate:
    SmartStayReliabilityGateV2
) {
  return (
    gate.eligible === true &&
    (
      gate.status === "usable" ||
      gate.status === "strong-data"
    )
  );
}

function getKnownComparableCostFact(
  evidence:
    SmartStayEvidenceFactV2[],
  minimumConfidence:
    number
) {
  return evidence
    .filter(
      (fact) =>
        fact.code ===
          "stay.cost.total" &&
        fact.availability ===
          "known" &&
        typeof fact.value ===
          "number" &&
        Number.isFinite(
          fact.value
        ) &&
        fact.value > 0 &&
        fact.confidence >=
          minimumConfidence
    )
    .sort(
      (
        firstFact,
        secondFact
      ) =>
        secondFact.confidence -
        firstFact.confidence
    )[0] ??
    null;
}

function getReliabilityWeight(
  gate:
    SmartStayReliabilityGateV2
) {
  if (
    gate.status ===
    "strong-data"
  ) {
    return 1;
  }

  if (
    gate.status ===
    "usable"
  ) {
    return 0.82;
  }

  if (
    gate.status ===
    "low-confidence"
  ) {
    return 0.35;
  }

  return 0;
}

function createComparableCandidates(
  candidates:
    SmartStayPeerGroupCandidateV2[],
  minimumPriceConfidence:
    number
) {
  const comparable:
    ComparableCandidate[] = [];

  for (
    const candidate
    of candidates
  ) {
    if (
      !isEligibleForPeerBaseline(
        candidate.reliabilityGate
      )
    ) {
      continue;
    }

    const costFact =
      getKnownComparableCostFact(
        candidate.evidence,
        minimumPriceConfidence
      );

    if (!costFact) {
      continue;
    }

    comparable.push({
      candidate,
      costFact,
    });
  }

  return comparable.sort(
    (
      firstCandidate,
      secondCandidate
    ) =>
      firstCandidate
        .candidate
        .hotelId
        .localeCompare(
          secondCandidate
            .candidate
            .hotelId
        )
  );
}

function getModeBaseConfidence(
  mode:
    SmartStayPeerGroupMode
) {
  if (
    mode === "same-category"
  ) {
    return 0.95;
  }

  if (
    mode ===
    "compatible-category"
  ) {
    return 0.78;
  }

  if (
    mode === "cross-category"
  ) {
    return 0.56;
  }

  return 0;
}

function createGroupId(
  mode:
    SmartStayPeerGroupMode,
  target:
    SmartStayPeerGroupCandidateV2,
  members:
    ComparableCandidate[]
) {
  if (
    mode === "unavailable"
  ) {
    return null;
  }

  const categories =
    uniqueSorted(
      members.map(
        ({ candidate }) =>
          candidate
            .accommodation
            .category
      )
    )
      .join("+")
      .replace(
        /[^a-z0-9+-]/g,
        "-"
      );

  return [
    "peer",
    mode,
    target.accommodation.unitType,
    categories ||
      target.accommodation.category,
  ].join(":");
}

function calculateGroupConfidence(
  mode:
    SmartStayPeerGroupMode,
  members:
    ComparableCandidate[],
  requiredSampleSize:
    number
) {
  if (
    mode === "unavailable" ||
    members.length === 0
  ) {
    return 0;
  }

  const base =
    getModeBaseConfidence(
      mode
    );

  const priceCoverage =
    members.filter(
      ({ costFact }) =>
        costFact.availability ===
        "known"
    ).length /
    members.length;

  const sampleStrength =
    Math.min(
      members.length /
      Math.max(
        requiredSampleSize,
        1
      ),
      1
    );

  const categoryConfidence =
    average(
      members.map(
        ({ candidate }) =>
          clamp(
            candidate
              .accommodation
              .confidence
          )
      )
    );

  const reliabilityStrength =
    average(
      members.map(
        ({ candidate }) =>
          getReliabilityWeight(
            candidate.reliabilityGate
          )
      )
    );

  return clamp(
    base * 0.45 +
    priceCoverage * 0.2 +
    sampleStrength * 0.15 +
    categoryConfidence * 0.1 +
    reliabilityStrength * 0.1
  );
}

function createEvidenceIds(
  members:
    ComparableCandidate[]
) {
  return uniqueSorted(
    members.flatMap(
      ({
        candidate,
        costFact,
      }) => [
        ...candidate
          .accommodation
          .evidenceIds,

        costFact.id,

        ...candidate
          .reliabilityGate
          .evidenceIds,
      ]
    )
  );
}

function createUnavailableAssignment(
  candidate:
    SmartStayPeerGroupCandidateV2
): SmartStayPeerGroupAssignmentV2 {
  return {
    hotelId:
      candidate.hotelId,

    peerGroup: {
      id:
        null,

      mode:
        "unavailable",

      category:
        candidate
          .accommodation
          .category,

      sampleSize:
        0,

      referencePriceCount:
        0,

      confidence:
        0,

      evidenceIds:
        uniqueSorted([
          ...candidate
            .accommodation
            .evidenceIds,

          ...candidate
            .reliabilityGate
            .evidenceIds,
        ]),
    },

    memberHotelIds:
      [],
  };
}

function createAssignment(
  target:
    SmartStayPeerGroupCandidateV2,
  mode:
    SmartStayPeerGroupMode,
  members:
    ComparableCandidate[],
  requiredSampleSize:
    number
): SmartStayPeerGroupAssignmentV2 {
  return {
    hotelId:
      target.hotelId,

    peerGroup: {
      id:
        createGroupId(
          mode,
          target,
          members
        ),

      mode,

      category:
        target
          .accommodation
          .category,

      sampleSize:
        members.length,

      referencePriceCount:
        members.filter(
          ({ costFact }) =>
            costFact.availability ===
            "known"
        ).length,

      confidence:
        calculateGroupConfidence(
          mode,
          members,
          requiredSampleSize
        ),

      evidenceIds:
        createEvidenceIds(
          members
        ),
    },

    memberHotelIds:
      uniqueSorted(
        members.map(
          ({ candidate }) =>
            candidate.hotelId
        )
      ),
  };
}

function validateCandidateIds(
  candidates:
    SmartStayPeerGroupCandidateV2[]
) {
  const ids =
    new Set<string>();

  for (
    const candidate
    of candidates
  ) {
    if (
      !candidate.hotelId.trim()
    ) {
      throw new Error(
        "Peer-group candidate requires a hotelId."
      );
    }

    if (
      ids.has(
        candidate.hotelId
      )
    ) {
      throw new Error(
        `Duplicate peer-group candidate: ${candidate.hotelId}`
      );
    }

    ids.add(
      candidate.hotelId
    );
  }
}

export function buildPeerGroupsV2(
  candidates:
    SmartStayPeerGroupCandidateV2[],
  options:
    SmartStayPeerGroupOptionsV2 = {}
): SmartStayPeerGroupAssignmentV2[] {
  validateCandidateIds(
    candidates
  );

  const minimumSameCategorySize =
    normalizeMinimum(
      options.minimumSameCategorySize,
      DEFAULT_MINIMUM_SAME_CATEGORY_SIZE
    );

  const minimumCompatibleCategorySize =
    normalizeMinimum(
      options.minimumCompatibleCategorySize,
      DEFAULT_MINIMUM_COMPATIBLE_CATEGORY_SIZE
    );

  const minimumCrossCategorySize =
    normalizeMinimum(
      options.minimumCrossCategorySize,
      DEFAULT_MINIMUM_CROSS_CATEGORY_SIZE
    );

  const minimumPriceConfidence =
    normalizeConfidence(
      options.minimumPriceConfidence,
      DEFAULT_MINIMUM_PRICE_CONFIDENCE
    );

  const comparableCandidates =
    createComparableCandidates(
      candidates,
      minimumPriceConfidence
    );

  const sortedCandidates =
    candidates
      .slice()
      .sort(
        (
          firstCandidate,
          secondCandidate
        ) =>
          firstCandidate
            .hotelId
            .localeCompare(
              secondCandidate
                .hotelId
            )
      );

  return sortedCandidates.map(
    (target) => {
      const targetComparable =
        comparableCandidates.find(
          ({ candidate }) =>
            candidate.hotelId ===
            target.hotelId
        );

      if (!targetComparable) {
        return createUnavailableAssignment(
          target
        );
      }

      const sameCategoryMembers =
        comparableCandidates.filter(
          ({ candidate }) =>
            candidate
              .accommodation
              .category ===
              target
                .accommodation
                .category &&
            areUnitTypesCompatible(
              target
                .accommodation
                .unitType,
              candidate
                .accommodation
                .unitType
            )
        );

      if (
        isConcreteCategory(
          target
            .accommodation
            .category
        ) &&
        sameCategoryMembers.length >=
          minimumSameCategorySize
      ) {
        return createAssignment(
          target,
          "same-category",
          sameCategoryMembers,
          minimumSameCategorySize
        );
      }

      const compatibleCategoryMembers =
        comparableCandidates.filter(
          ({ candidate }) =>
            areCategoriesCompatible(
              target
                .accommodation
                .category,
              candidate
                .accommodation
                .category
            ) &&
            areUnitTypesCompatible(
              target
                .accommodation
                .unitType,
              candidate
                .accommodation
                .unitType
            )
        );

      if (
        isConcreteCategory(
          target
            .accommodation
            .category
        ) &&
        compatibleCategoryMembers.length >=
          minimumCompatibleCategorySize
      ) {
        return createAssignment(
          target,
          "compatible-category",
          compatibleCategoryMembers,
          minimumCompatibleCategorySize
        );
      }

      const crossCategoryMembers =
        comparableCandidates.filter(
          ({ candidate }) =>
            areUnitTypesCompatible(
              target
                .accommodation
                .unitType,
              candidate
                .accommodation
                .unitType
            )
        );

      if (
        crossCategoryMembers.length >=
        minimumCrossCategorySize
      ) {
        return createAssignment(
          target,
          "cross-category",
          crossCategoryMembers,
          minimumCrossCategorySize
        );
      }

      return createUnavailableAssignment(
        target
      );
    }
  );
}
