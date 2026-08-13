import {
  createStableHashV3,
} from "../contract/stableHashV3";

export type StayOptiPeerCategoryV3 =
  | "hotel"
  | "bed-and-breakfast"
  | "apartment"
  | "vacation-rental"
  | "aparthotel"
  | "hostel"
  | "guesthouse"
  | "villa"
  | "resort"
  | "camping"
  | "other"
  | "unknown";

export type StayOptiPeerUnitTypeV3 =
  | "entire-place"
  | "private-room"
  | "shared-room"
  | "hotel-room"
  | "unknown";

export type StayOptiPeerGroupModeV3 =
  | "exact-context"
  | "compatible-context"
  | "declared-fallback"
  | "unavailable";

export interface StayOptiPeerCandidateV3 {
  hotelId:
    string;

  scopeFingerprint:
    string;

  destinationKey:
    string;

  category:
    StayOptiPeerCategoryV3;

  unitType:
    StayOptiPeerUnitTypeV3;

  roomName:
    string |
    null;

  mealPlan:
    string |
    null;

  refundable:
    boolean |
    null;

  totalCost:
    number |
    null;

  currency:
    string |
    null;

  qualityScore:
    number |
    null;

  distanceKm:
    number |
    null;

  eligible:
    boolean;

  evidenceIds:
    string[];
}

export interface StayOptiPeerIntelligenceOptionsV3 {
  minimumExactSize?:
    number;

  minimumCompatibleSize?:
    number;

  minimumFallbackSize?:
    number;
}

export interface StayOptiPeerExclusionV3 {
  hotelId:
    string;

  reasonCodes:
    string[];
}

export interface StayOptiPeerAssignmentV3 {
  assignmentId:
    string;

  hotelId:
    string;

  groupId:
    string |
    null;

  mode:
    StayOptiPeerGroupModeV3;

  directComparisonAllowed:
    boolean;

  memberHotelIds:
    string[];

  sampleSize:
    number;

  medianTotalCost:
    number |
    null;

  medianQualityScore:
    number |
    null;

  medianDistanceKm:
    number |
    null;

  confidence:
    number;

  reasonCodes:
    string[];

  exclusions:
    StayOptiPeerExclusionV3[];

  evidenceIds:
    string[];

  fingerprint:
    string;
}

const CATEGORY_COMPATIBILITY:
  Readonly<
    Record<
      StayOptiPeerCategoryV3,
      readonly StayOptiPeerCategoryV3[]
    >
  > = {
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
    camping: [
      "camping",
    ],
    other: [
      "other",
    ],
    unknown: [
      "unknown",
    ],
  };

function round(
  value:
    number,
  digits =
    4
) {
  const factor =
    10 ** digits;

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
    factor
  ) /
  factor;
}

function uniqueSorted(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values.filter(
        Boolean
      )
    ),
  ].sort();
}

function normalizeText(
  value:
    string |
    null
) {
  if (
    value ===
      null
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .trim();

  return normalized ||
    null;
}

function normalizeRoomClass(
  candidate:
    StayOptiPeerCandidateV3
) {
  const text =
    normalizeText(
      candidate.roomName
    );

  if (
    text?.includes(
      "shared"
    ) ||
    candidate.unitType ===
      "shared-room"
  ) {
    return "shared-room";
  }

  if (
    text?.includes(
      "apartment"
    ) ||
    text?.includes(
      "entire"
    ) ||
    candidate.unitType ===
      "entire-place"
  ) {
    return "entire-place";
  }

  if (
    text?.includes(
      "suite"
    )
  ) {
    return "suite";
  }

  if (
    text?.includes(
      "family"
    ) ||
    text?.includes(
      "quadruple"
    ) ||
    text?.includes(
      "triple"
    )
  ) {
    return "group-room";
  }

  if (
    text?.includes(
      "single"
    )
  ) {
    return "single-room";
  }

  if (
    candidate.unitType ===
      "hotel-room" ||
    candidate.unitType ===
      "private-room"
  ) {
    return "private-sleeping-unit";
  }

  return "unknown";
}

function normalizeMealClass(
  value:
    string |
    null
) {
  const text =
    normalizeText(
      value
    );

  if (
    text ===
      null
  ) {
    return "unknown";
  }

  if (
    text.includes(
      "breakfast"
    )
  ) {
    return "breakfast";
  }

  if (
    text.includes(
      "half board"
    ) ||
    text.includes(
      "full board"
    ) ||
    text.includes(
      "all inclusive"
    )
  ) {
    return "board";
  }

  if (
    text.includes(
      "room only"
    ) ||
    text.includes(
      "no meal"
    )
  ) {
    return "room-only";
  }

  return `known:${text}`;
}

function areCategoriesCompatible(
  target:
    StayOptiPeerCategoryV3,
  candidate:
    StayOptiPeerCategoryV3
) {
  if (
    target ===
      "unknown" ||
    target ===
      "other" ||
    candidate ===
      "unknown" ||
    candidate ===
      "other"
  ) {
    return target ===
      candidate;
  }

  return CATEGORY_COMPATIBILITY[
    target
  ].includes(
    candidate
  );
}

function areUnitsCompatible(
  target:
    StayOptiPeerUnitTypeV3,
  candidate:
    StayOptiPeerUnitTypeV3
) {
  if (
    target ===
      candidate
  ) {
    return true;
  }

  return (
    target ===
      "hotel-room" &&
    candidate ===
      "private-room"
  ) ||
    (
      target ===
        "private-room" &&
      candidate ===
        "hotel-room"
    );
}

function sameSearchScope(
  target:
    StayOptiPeerCandidateV3,
  candidate:
    StayOptiPeerCandidateV3
) {
  return target.scopeFingerprint ===
      candidate.scopeFingerprint &&
    target.destinationKey ===
      candidate.destinationKey &&
    target.currency !==
      null &&
    target.currency ===
      candidate.currency;
}

function isComparableBase(
  candidate:
    StayOptiPeerCandidateV3
) {
  return candidate.eligible &&
    candidate.totalCost !==
      null &&
    Number.isFinite(
      candidate.totalCost
    ) &&
    candidate.totalCost > 0 &&
    candidate.currency !==
      null &&
    candidate.scopeFingerprint
      .trim()
      .length > 0 &&
    candidate.destinationKey
      .trim()
      .length > 0;
}

function hasConcretePeerIdentity(
  candidate:
    StayOptiPeerCandidateV3
) {
  return candidate.category !==
      "unknown" &&
    candidate.category !==
      "other" &&
    candidate.unitType !==
      "unknown";
}

function comparableSemantics(
  target:
    StayOptiPeerCandidateV3,
  candidate:
    StayOptiPeerCandidateV3
) {
  const targetMeal =
    normalizeMealClass(
      target.mealPlan
    );

  const candidateMeal =
    normalizeMealClass(
      candidate.mealPlan
    );

  const mealCompatible =
    targetMeal !==
      "unknown" &&
    targetMeal ===
      candidateMeal;

  const refundableCompatible =
    target.refundable !==
      null &&
    target.refundable ===
      candidate.refundable;

  const targetRoomClass =
    normalizeRoomClass(
      target
    );

  const candidateRoomClass =
    normalizeRoomClass(
      candidate
    );

  return mealCompatible &&
    refundableCompatible &&
    targetRoomClass !==
      "unknown" &&
    targetRoomClass ===
      candidateRoomClass;
}

function qualityCompatible(
  target:
    StayOptiPeerCandidateV3,
  candidate:
    StayOptiPeerCandidateV3,
  maximumDifference:
    number
) {
  return target.qualityScore ===
      null ||
    candidate.qualityScore ===
      null ||
    Math.abs(
      target.qualityScore -
      candidate.qualityScore
    ) <= maximumDifference;
}

function median(
  values:
    Array<
      number |
      null
    >
) {
  const known =
    values
      .filter(
        (
          value
        ): value is number =>
          typeof value ===
            "number" &&
          Number.isFinite(
            value
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

  if (
    known.length ===
      0
  ) {
    return null;
  }

  const middle =
    Math.floor(
      known.length /
      2
    );

  return round(
    known.length % 2 ===
      0
      ? (
          known[
            middle -
            1
          ] +
          known[
            middle
          ]
        ) /
        2
      : known[
          middle
        ],
    4
  );
}

function normalizeMinimum(
  value:
    unknown,
  fallback:
    number
) {
  return typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    value > 0
    ? value
    : fallback;
}

function createFingerprint(
  assignment:
    Omit<
      StayOptiPeerAssignmentV3,
      "fingerprint"
    >
) {
  return createStableHashV3(
    assignment,
    "stayopti-v3-peer-assignment"
  );
}

function exclusionReasons(
  target:
    StayOptiPeerCandidateV3,
  candidate:
    StayOptiPeerCandidateV3
) {
  const reasons:
    string[] =
      [];

  if (
    !isComparableBase(
      candidate
    )
  ) {
    reasons.push(
      "peer:excluded-ineligible-or-cost-incomplete"
    );
  }

  if (
    !sameSearchScope(
      target,
      candidate
    )
  ) {
    reasons.push(
      "peer:excluded-search-scope-mismatch"
    );
  }

  if (
    !areCategoriesCompatible(
      target.category,
      candidate.category
    )
  ) {
    reasons.push(
      "peer:excluded-category-incompatible"
    );
  }

  if (
    !areUnitsCompatible(
      target.unitType,
      candidate.unitType
    )
  ) {
    reasons.push(
      "peer:excluded-unit-incompatible"
    );
  }

  if (
    !comparableSemantics(
      target,
      candidate
    )
  ) {
    reasons.push(
      "peer:excluded-offer-semantics-incompatible"
    );
  }

  return uniqueSorted(
    reasons
  );
}

function createAssignment(
  target:
    StayOptiPeerCandidateV3,
  allCandidates:
    StayOptiPeerCandidateV3[],
  members:
    StayOptiPeerCandidateV3[],
  mode:
    StayOptiPeerGroupModeV3
) {
  const directComparisonAllowed =
    mode ===
      "exact-context" ||
    mode ===
      "compatible-context";

  const memberHotelIds =
    uniqueSorted(
      members.map(
        (member) =>
          member.hotelId
      )
    );

  const reasonCodes =
    uniqueSorted([
      mode ===
        "exact-context"
        ? "peer:exact-context"
        : mode ===
            "compatible-context"
          ? "peer:compatible-context"
          : mode ===
              "declared-fallback"
            ? "peer:declared-fallback"
            : "peer:unavailable",
      ...(
        directComparisonAllowed
          ? [
              "peer:direct-comparison-allowed",
            ]
          : mode ===
              "declared-fallback"
            ? [
                "peer:direct-comparison-blocked",
                "peer:fallback-explicit",
              ]
            : [
                "peer:direct-comparison-blocked",
              ]
      ),
    ]);

  const exclusions =
    allCandidates
      .filter(
        (candidate) =>
          !memberHotelIds.includes(
            candidate.hotelId
          )
      )
      .map(
        (candidate) => ({
          hotelId:
            candidate.hotelId,
          reasonCodes:
            exclusionReasons(
              target,
              candidate
            ),
        }))
      .filter(
        (exclusion) =>
          exclusion
            .reasonCodes
            .length > 0
      )
      .sort(
        (
          first,
          second
        ) =>
          first.hotelId.localeCompare(
            second.hotelId
          )
      );

  const confidenceBase =
    mode ===
      "exact-context"
      ? 0.92
      : mode ===
          "compatible-context"
        ? 0.76
        : mode ===
            "declared-fallback"
          ? 0.42
          : 0;

  const confidence =
    members.length ===
      0
      ? 0
      : round(
          Math.min(
            1,
            confidenceBase +
            Math.min(
              members.length,
              8
            ) *
            0.01
          ),
          4
        );

  const groupId =
    mode ===
      "unavailable"
      ? null
      : createStableHashV3(
          {
            mode,
            scopeFingerprint:
              target.scopeFingerprint,
            destinationKey:
              target.destinationKey,
            memberHotelIds,
          },
          "stayopti-v3-peer-group"
        );

  const assignmentWithoutFingerprint:
    Omit<
      StayOptiPeerAssignmentV3,
      "fingerprint"
    > = {
      assignmentId:
        createStableHashV3(
          {
            hotelId:
              target.hotelId,
            mode,
            memberHotelIds,
          },
          "stayopti-v3-peer-assignment-id"
        ),
      hotelId:
        target.hotelId,
      groupId,
      mode,
      directComparisonAllowed,
      memberHotelIds,
      sampleSize:
        memberHotelIds.length,
      medianTotalCost:
        median(
          members.map(
            (member) =>
              member.totalCost
          )
        ),
      medianQualityScore:
        median(
          members.map(
            (member) =>
              member.qualityScore
          )
        ),
      medianDistanceKm:
        median(
          members.map(
            (member) =>
              member.distanceKm
          )
        ),
      confidence,
      reasonCodes,
      exclusions,
      evidenceIds:
        uniqueSorted(
          members.flatMap(
            (member) =>
              member.evidenceIds
          )
        ),
    };

  return {
    ...assignmentWithoutFingerprint,
    fingerprint:
      createFingerprint(
        assignmentWithoutFingerprint
      ),
  };
}

export function evaluatePeerIntelligenceV3(
  inputCandidates:
    StayOptiPeerCandidateV3[],
  options:
    StayOptiPeerIntelligenceOptionsV3 =
      {}
) {
  const ids =
    new Set<string>();

  for (
    const candidate
    of inputCandidates
  ) {
    const hotelId =
      candidate.hotelId.trim();

    if (
      !hotelId ||
      ids.has(
        hotelId
      )
    ) {
      throw new Error(
        `Peer Intelligence requires unique hotel IDs: ${hotelId || "<empty>"}.`
      );
    }

    ids.add(
      hotelId
    );
  }

  const candidates =
    inputCandidates
      .map(
        (candidate) => ({
          ...candidate,
          hotelId:
            candidate.hotelId
              .trim(),
          destinationKey:
            candidate.destinationKey
              .trim()
              .toLowerCase(),
          currency:
            candidate.currency
              ?.trim()
              .toUpperCase() ??
            null,
          evidenceIds:
            uniqueSorted(
              candidate.evidenceIds
            ),
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          first.hotelId.localeCompare(
            second.hotelId
          )
      );

  const minimumExactSize =
    normalizeMinimum(
      options.minimumExactSize,
      3
    );

  const minimumCompatibleSize =
    normalizeMinimum(
      options.minimumCompatibleSize,
      3
    );

  const minimumFallbackSize =
    normalizeMinimum(
      options.minimumFallbackSize,
      3
    );

  return candidates.map(
    (target) => {
      if (
        !isComparableBase(
          target
        )
      ) {
        return createAssignment(
          target,
          candidates,
          [],
          "unavailable"
        );
      }

      const scopedCandidates =
        candidates.filter(
          (candidate) =>
            isComparableBase(
              candidate
            ) &&
            sameSearchScope(
              target,
              candidate
            )
        );

      const exactMembers =
        scopedCandidates.filter(
          (candidate) =>
            hasConcretePeerIdentity(
              target
            ) &&
            hasConcretePeerIdentity(
              candidate
            ) &&
            candidate.category ===
              target.category &&
            candidate.unitType ===
              target.unitType &&
            comparableSemantics(
              target,
              candidate
            ) &&
            qualityCompatible(
              target,
              candidate,
              20
            )
        );

      if (
        exactMembers.length >=
          minimumExactSize
      ) {
        return createAssignment(
          target,
          candidates,
          exactMembers,
          "exact-context"
        );
      }

      const compatibleMembers =
        scopedCandidates.filter(
          (candidate) =>
            hasConcretePeerIdentity(
              target
            ) &&
            hasConcretePeerIdentity(
              candidate
            ) &&
            areCategoriesCompatible(
              target.category,
              candidate.category
            ) &&
            areUnitsCompatible(
              target.unitType,
              candidate.unitType
            ) &&
            comparableSemantics(
              target,
              candidate
            ) &&
            qualityCompatible(
              target,
              candidate,
              30
            )
        );

      if (
        compatibleMembers.length >=
          minimumCompatibleSize
      ) {
        return createAssignment(
          target,
          candidates,
          compatibleMembers,
          "compatible-context"
        );
      }

      if (
        scopedCandidates.length >=
          minimumFallbackSize
      ) {
        return createAssignment(
          target,
          candidates,
          scopedCandidates,
          "declared-fallback"
        );
      }

      return createAssignment(
        target,
        candidates,
        [],
        "unavailable"
      );
    }
  );
}

export function validatePeerAssignmentV3(
  assignment:
    StayOptiPeerAssignmentV3
) {
  const {
    fingerprint:
      ignoredFingerprint,
    ...withoutFingerprint
  } = assignment;

  void ignoredFingerprint;

  const uniqueMembers =
    uniqueSorted(
      assignment.memberHotelIds
    );

  const valid =
    assignment.fingerprint ===
      createFingerprint(
        withoutFingerprint
      ) &&
    assignment.hotelId.trim()
      .length > 0 &&
    assignment.sampleSize ===
      assignment
        .memberHotelIds
        .length &&
    assignment.sampleSize ===
      uniqueMembers.length &&
    assignment.confidence >=
      0 &&
    assignment.confidence <=
      1 &&
    (
      assignment.directComparisonAllowed
        ? assignment.mode ===
            "exact-context" ||
          assignment.mode ===
            "compatible-context"
        : assignment.mode ===
            "declared-fallback" ||
          assignment.mode ===
            "unavailable"
    ) &&
    (
      assignment.mode ===
        "unavailable"
        ? assignment.groupId ===
            null &&
          assignment.sampleSize ===
            0
        : assignment.groupId !==
            null &&
          assignment.sampleSize >
            0
    );

  return {
    valid,
  };
}
