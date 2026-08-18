export const DECISION_SCIENCE_SCHEMA_IDS_V3 = Object.freeze({
  identity:
    "https://stayopti.example/schemas/v1.1/accommodation_offer_identity.schema.json",
  shared:
    "https://stayopti.example/schemas/v1.1/shared_space_map.schema.json",
  snapshot:
    "https://stayopti.example/schemas/v1.1/local_market_night_snapshot.schema.json",
  legal:
    "https://stayopti.example/schemas/v1.1/market_dataset_legal_ledger.schema.json",
} as const);

export type DecisionScienceSchemaSemanticIssueCodeV3 =
  | "SCH_SEM_PARTY_OCCUPANCY_MISMATCH"
  | "SCH_SEM_CAPACITY_INSUFFICIENT"
  | "SCH_SEM_STAY_DATE_ORDER"
  | "SCH_SEM_DUPLICATE_SPACE"
  | "SCH_SEM_MANDATORY_COST_NULL"
  | "SCH_SEM_MANDATORY_COST_MISSING"
  | "SCH_SEM_FAILED_COLLECTION_COST_PRESENT"
  | "SCH_SEM_LEGAL_DATE_ORDER"
  | "SCH_SEM_TYPE_SHARE_INDETERMINATE"
  | "SCH_SEM_SHARED_MAP_PARTIAL"
  | "SCH_SEM_UNAVAILABLE_REASON_INDETERMINATE"
  | "SCH_SEM_LEGAL_STATUS_TIME_INDETERMINATE";

export interface DecisionScienceSchemaSemanticIssueV3 {
  code: DecisionScienceSchemaSemanticIssueCodeV3;
  schemaId: string;
  instancePath: string;
  schemaPath: string;
  keyword: "semantic";
}

export type DecisionScienceSchemaSemanticResultV3 =
  | {
      status: "consistent";
      issues: readonly [];
    }
  | {
      status: "indeterminate";
      issues: readonly DecisionScienceSchemaSemanticIssueV3[];
    }
  | {
      status: "blocked";
      issues: readonly DecisionScienceSchemaSemanticIssueV3[];
    };

const INDETERMINATE_TYPE_SHARE = new Set([
  "resort|shared-room-or-dorm",
  "resort|private-site-or-pitch",
  "resort|shared-site-or-pitch",
  "resort|unknown",
  "campground-rental-unit|private-room-shared-common-space",
  "campground-rental-unit|private-room-private-common-space",
  "campground-rental-unit|shared-room-or-dorm",
  "campground-rental-unit|shared-site-or-pitch",
  "campground-rental-unit|unknown",
  "holiday-park|private-room-shared-common-space",
  "holiday-park|private-room-private-common-space",
  "holiday-park|shared-room-or-dorm",
  "holiday-park|unknown",
  "glamping-unit|private-room-shared-common-space",
  "glamping-unit|private-room-private-common-space",
  "glamping-unit|shared-room-or-dorm",
  "glamping-unit|unknown",
  "other|unknown",
  "unknown|unknown",
]);

const SHARED_SPACE_KINDS = new Set([
  "sleeping-area",
  "bathroom",
  "kitchen",
  "entrance",
  "circulation-or-common-area",
  "outdoor-area",
  "work-area",
]);

function issue(
  code: DecisionScienceSchemaSemanticIssueCodeV3,
  schemaId: string,
  instancePath: string
): DecisionScienceSchemaSemanticIssueV3 {
  return {
    code,
    schemaId,
    instancePath,
    schemaPath: "#/stayopti-semantic",
    keyword: "semantic",
  };
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortIssues(
  issues: DecisionScienceSchemaSemanticIssueV3[]
): DecisionScienceSchemaSemanticIssueV3[] {
  return issues.sort(
    (left, right) =>
      compareOrdinal(left.schemaId, right.schemaId) ||
      compareOrdinal(left.instancePath, right.instancePath) ||
      compareOrdinal(left.schemaPath, right.schemaPath) ||
      compareOrdinal(left.keyword, right.keyword) ||
      compareOrdinal(left.code, right.code)
  );
}

export function validateDecisionScienceSchemaSemanticsV3(
  schemaId: string,
  payload: Readonly<Record<string, unknown>>
): DecisionScienceSchemaSemanticResultV3 {
  const blocked: DecisionScienceSchemaSemanticIssueV3[] = [];
  const indeterminate: DecisionScienceSchemaSemanticIssueV3[] = [];

  if (schemaId === DECISION_SCIENCE_SCHEMA_IDS_V3.identity) {
    const requestedOccupancy = payload.requestedOccupancy as number;
    const party = payload.partyBinding as Readonly<Record<string, unknown>>;
    const partyTotal = (party.adults as number) + (party.children as number);
    if (partyTotal !== requestedOccupancy) {
      blocked.push(
        issue(
          "SCH_SEM_PARTY_OCCUPANCY_MISMATCH",
          schemaId,
          "/partyBinding"
        )
      );
    }
    const capacity = payload.statedCapacity;
    if (typeof capacity === "number" && capacity < requestedOccupancy) {
      blocked.push(
        issue(
          "SCH_SEM_CAPACITY_INSUFFICIENT",
          schemaId,
          "/statedCapacity"
        )
      );
    }
    const stay = payload.stayBinding as Readonly<Record<string, unknown>>;
    if ((stay.checkOut as string) <= (stay.checkIn as string)) {
      blocked.push(
        issue("SCH_SEM_STAY_DATE_ORDER", schemaId, "/stayBinding/checkOut")
      );
    }
    const typeShare = `${String(payload.canonicalProductType)}|${String(payload.shareScope)}`;
    if (INDETERMINATE_TYPE_SHARE.has(typeShare)) {
      indeterminate.push(
        issue(
          "SCH_SEM_TYPE_SHARE_INDETERMINATE",
          schemaId,
          "/shareScope"
        )
      );
    }
  } else if (schemaId === DECISION_SCIENCE_SCHEMA_IDS_V3.shared) {
    const observations = payload.observations as readonly Readonly<
      Record<string, unknown>
    >[];
    const seen = new Set<string>();
    for (let index = 0; index < observations.length; index += 1) {
      const space = String(observations[index]?.space);
      if (seen.has(space)) {
        blocked.push(
          issue(
            "SCH_SEM_DUPLICATE_SPACE",
            schemaId,
            `/observations/${index}/space`
          )
        );
      }
      seen.add(space);
    }
    if (
      observations.length !== SHARED_SPACE_KINDS.size ||
      [...SHARED_SPACE_KINDS].some((space) => !seen.has(space))
    ) {
      indeterminate.push(
        issue("SCH_SEM_SHARED_MAP_PARTIAL", schemaId, "/observations")
      );
    }
  } else if (schemaId === DECISION_SCIENCE_SCHEMA_IDS_V3.snapshot) {
    const hasCost = Object.hasOwn(payload, "mandatoryNightCost");
    const cost = payload.mandatoryNightCost;
    if (payload.mandatoryCostStatus === "complete") {
      if (!hasCost) {
        blocked.push(
          issue(
            "SCH_SEM_MANDATORY_COST_MISSING",
            schemaId,
            "/mandatoryNightCost"
          )
        );
      } else if (cost === null) {
        blocked.push(
          issue(
            "SCH_SEM_MANDATORY_COST_NULL",
            schemaId,
            "/mandatoryNightCost"
          )
        );
      }
    }
    if (payload.collectionStatus === "failed" && typeof cost === "number") {
      blocked.push(
        issue(
          "SCH_SEM_FAILED_COLLECTION_COST_PRESENT",
          schemaId,
          "/mandatoryNightCost"
        )
      );
    }
    if (payload.inventoryState === "unavailable" && payload.unavailableReason === null) {
      indeterminate.push(
        issue(
          "SCH_SEM_UNAVAILABLE_REASON_INDETERMINATE",
          schemaId,
          "/unavailableReason"
        )
      );
    }
  } else if (schemaId === DECISION_SCIENCE_SCHEMA_IDS_V3.legal) {
    const effectiveFrom = payload.effectiveFrom as string;
    const effectiveTo = payload.effectiveTo as string | null;
    if (effectiveTo !== null && effectiveTo < effectiveFrom) {
      blocked.push(
        issue("SCH_SEM_LEGAL_DATE_ORDER", schemaId, "/effectiveTo")
      );
    } else if (effectiveTo !== null) {
      const reviewedDate = String(payload.reviewedAt).slice(0, 10);
      if (
        (payload.legalStatus === "expired" && effectiveTo > reviewedDate) ||
        (payload.legalStatus === "approved" && effectiveTo < reviewedDate)
      ) {
        indeterminate.push(
          issue(
            "SCH_SEM_LEGAL_STATUS_TIME_INDETERMINATE",
            schemaId,
            "/legalStatus"
          )
        );
      }
    }
  }

  if (blocked.length > 0) {
    return { status: "blocked", issues: Object.freeze(sortIssues(blocked)) };
  }
  if (indeterminate.length > 0) {
    return {
      status: "indeterminate",
      issues: Object.freeze(sortIssues(indeterminate)),
    };
  }
  return { status: "consistent", issues: Object.freeze([]) };
}
