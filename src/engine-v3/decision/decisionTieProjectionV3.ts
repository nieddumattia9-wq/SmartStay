import {
  stableSerializeV3,
} from "../contract/stableHashV3";

export const STAYOPTI_DECISION_TIE_CLASSIFICATIONS_V3 = [
  "DECISIONALLY_DISTINCT",
  "DECISIONALLY_EQUIVALENT",
] as const;

export type StayOptiDecisionTieClassificationV3 =
  typeof STAYOPTI_DECISION_TIE_CLASSIFICATIONS_V3[number];

export type StayOptiDecisionTieProjectionV3 = Readonly<
  Record<string, unknown>
>;

export interface StayOptiDecisionTieResolutionV3<Candidate> {
  ordered: Candidate[];
  leaders: Candidate[];
  classification: StayOptiDecisionTieClassificationV3;
  presentationRepresentative: Candidate | null;
}

const OPAQUE_OR_FORBIDDEN_KEY = /^(?:id|ids|provider|sourceProvider|providerName|hotelId|offerId|solutionId|providerId|rawPayload|rawResponse|commission|markup|affiliateRevenue|providerPriority|clickProbability|userEconomicValue)$/i;

function isOpaqueOrForbiddenKey(key: string): boolean {
  return OPAQUE_OR_FORBIDDEN_KEY.test(key) ||
    /(?:Id|Ids)$/.test(key) ||
    /_(?:id|ids)$/i.test(key);
}

export function createDecisionTieProjectionV3(
  value: unknown
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(createDecisionTieProjectionV3);
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Decision tie projection accepts only plain objects.");
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !isOpaqueOrForbiddenKey(key))
        .map(([key, entry]) => [key, createDecisionTieProjectionV3(entry)])
    );
  }

  throw new Error(`Decision tie projection does not accept ${typeof value}.`);
}

export function compareDecisionTieProjectionV3(
  first: StayOptiDecisionTieProjectionV3,
  second: StayOptiDecisionTieProjectionV3
): number {
  const firstSerialized = stableSerializeV3(first);
  const secondSerialized = stableSerializeV3(second);

  return firstSerialized < secondSerialized
    ? -1
    : firstSerialized > secondSerialized
      ? 1
      : 0;
}

/**
 * Resolves only decision-authorized comparisons. Provider identity is not an
 * accepted projection input and must remain outside `compareDecision` and
 * `projectForPresentation`.
 *
 * An exact decision tie is kept as an equivalence class. A single presentation
 * representative is exposed only when a provider-neutral semantic projection
 * distinguishes one member. When those projections are also identical the
 * representative is intentionally null: identity and arrival order must not
 * manufacture superiority.
 */
export function resolveDecisionTieV3<Candidate>(
  candidates: readonly Candidate[],
  compareDecision: (first: Candidate, second: Candidate) => number,
  projectForPresentation: (
    candidate: Candidate
  ) => StayOptiDecisionTieProjectionV3
): StayOptiDecisionTieResolutionV3<Candidate> {
  const ordered = [...candidates].sort(compareDecision);
  const first = ordered[0];

  if (first === undefined) {
    return {
      ordered,
      leaders: [],
      classification: "DECISIONALLY_DISTINCT",
      presentationRepresentative: null,
    };
  }

  const leaders = ordered.filter(
    (candidate) => compareDecision(first, candidate) === 0
  );

  if (leaders.length === 1) {
    return {
      ordered,
      leaders,
      classification: "DECISIONALLY_DISTINCT",
      presentationRepresentative: leaders[0],
    };
  }

  const presentationOrdered = [...leaders].sort((left, right) =>
    compareDecisionTieProjectionV3(
      projectForPresentation(left),
      projectForPresentation(right)
    )
  );
  const firstProjection = projectForPresentation(presentationOrdered[0]);
  const secondProjection = projectForPresentation(presentationOrdered[1]);

  return {
    ordered,
    leaders,
    classification: "DECISIONALLY_EQUIVALENT",
    presentationRepresentative:
      compareDecisionTieProjectionV3(firstProjection, secondProjection) === 0
        ? null
        : presentationOrdered[0],
  };
}

export function takeDecisionTopWithBoundaryTiesV3<Candidate>(
  candidates: readonly Candidate[],
  limit: number,
  compareDecision: (first: Candidate, second: Candidate) => number
): Candidate[] {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Decision top limit must be a positive integer.");
  }

  const ordered = [...candidates].sort(compareDecision);
  const boundary = ordered[Math.min(limit, ordered.length) - 1];
  return boundary === undefined
    ? []
    : ordered.filter(
        (candidate, index) =>
          index < limit || compareDecision(candidate, boundary) === 0
      );
}
