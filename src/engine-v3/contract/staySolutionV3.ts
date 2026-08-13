export type StaySolutionKindV3 =
  | "single"
  | "split";

export type StaySolutionFeasibilityV3 =
  | "feasible"
  | "incomplete"
  | "invalid";

export type StayCostCompletenessV3 =
  | "reported-complete"
  | "reported-tax-status-unknown"
  | "partial"
  | "unknown";

export interface StaySolutionCostV3 {
  amount:
    number |
    null;

  currency:
    string |
    null;

  completeness:
    StayCostCompletenessV3;

  taxesIncluded:
    boolean |
    null;

  includedTaxes:
    number;

  excludedTaxes:
    number;

  unknownTaxes:
    number;
}

export interface StaySolutionSegmentV3 {
  segmentId:
    string;

  ordinal:
    number;

  checkIn:
    string |
    null;

  checkOut:
    string |
    null;

  nights:
    number;

  hotelId:
    string;

  offerId:
    string |
    null;

  roomName:
    string |
    null;

  mealPlan:
    string |
    null;

  bookable:
    boolean;

  recheckRequired:
    boolean;

  cost:
    StaySolutionCostV3;

  evidenceIds:
    string[];
}

export interface StaySolutionV3 {
  solutionId:
    string;

  kind:
    StaySolutionKindV3;

  feasibility:
    StaySolutionFeasibilityV3;

  segments:
    StaySolutionSegmentV3[];

  transitionCount:
    number;

  checkIn:
    string |
    null;

  checkOut:
    string |
    null;

  totalNights:
    number;

  totalCost:
    StaySolutionCostV3;

  evidenceIds:
    string[];
}

export type StaySolutionValidationIssueCodeV3 =
  | "solution-id-missing"
  | "solution-kind-segment-count-invalid"
  | "solution-transition-count-invalid"
  | "solution-date-range-invalid"
  | "solution-segments-not-contiguous"
  | "solution-segment-id-missing"
  | "solution-segment-ordinal-invalid"
  | "solution-segment-hotel-id-missing"
  | "solution-segment-nights-invalid"
  | "solution-total-nights-mismatch"
  | "solution-cost-invalid"
  | "solution-cost-currency-mismatch"
  | "solution-total-cost-mismatch";

export interface StaySolutionValidationIssueV3 {
  code:
    StaySolutionValidationIssueCodeV3;

  path:
    string;

  message:
    string;
}

export interface StaySolutionValidationV3 {
  valid:
    boolean;

  issues:
    StaySolutionValidationIssueV3[];
}

const DAY_MS =
  24 * 60 * 60 * 1000;

function parseIsoDate(
  value:
    string |
    null
) {
  if (
    value === null
  ) {
    return null;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return Number.NaN;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const timestamp =
    Date.UTC(
      year,
      month - 1,
      day
    );

  const date =
    new Date(
      timestamp
    );

  return date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
    ? timestamp
    : Number.NaN;
}

function normalizeCurrency(
  value:
    string |
    null
) {
  return typeof value ===
      "string" &&
    /^[A-Z]{3}$/.test(
      value
    )
    ? value
    : null;
}

function isNonNegativeFinite(
  value:
    unknown
): value is number {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >= 0;
}

function validateCost(
  cost:
    StaySolutionCostV3,
  path:
    string,
  issues:
    StaySolutionValidationIssueV3[]
) {
  const amountValid =
    cost.amount ===
      null ||
    (
      typeof cost.amount ===
        "number" &&
      Number.isFinite(
        cost.amount
      ) &&
      cost.amount > 0
    );

  const currency =
    normalizeCurrency(
      cost.currency
    );

  if (
    !amountValid ||
    (
      cost.amount !==
        null &&
      currency ===
        null
    ) ||
    !isNonNegativeFinite(
      cost.includedTaxes
    ) ||
    !isNonNegativeFinite(
      cost.excludedTaxes
    ) ||
    !isNonNegativeFinite(
      cost.unknownTaxes
    )
  ) {
    issues.push({
      code:
        "solution-cost-invalid",
      path,
      message:
        "Cost amount, currency or tax values are invalid.",
    });
  }

  return currency;
}

function addIssue(
  issues:
    StaySolutionValidationIssueV3[],
  code:
    StaySolutionValidationIssueCodeV3,
  path:
    string,
  message:
    string
) {
  issues.push({
    code,
    path,
    message,
  });
}

export function validateStaySolutionV3(
  solution:
    StaySolutionV3
): StaySolutionValidationV3 {
  const issues:
    StaySolutionValidationIssueV3[] =
      [];

  if (
    !solution.solutionId.trim()
  ) {
    addIssue(
      issues,
      "solution-id-missing",
      "solutionId",
      "A StaySolution requires a stable solutionId."
    );
  }

  const expectedSegmentCount =
    solution.kind ===
      "single"
      ? 1
      : 2;

  if (
    solution.segments.length !==
      expectedSegmentCount
  ) {
    addIssue(
      issues,
      "solution-kind-segment-count-invalid",
      "segments",
      "Initial V3 supports one single segment or exactly two split segments."
    );
  }

  const expectedTransitionCount =
    solution.kind ===
      "single"
      ? 0
      : 1;

  if (
    solution.transitionCount !==
      expectedTransitionCount
  ) {
    addIssue(
      issues,
      "solution-transition-count-invalid",
      "transitionCount",
      "Initial V3 allows at most one accommodation transition."
    );
  }

  const solutionStart =
    parseIsoDate(
      solution.checkIn
    );

  const solutionEnd =
    parseIsoDate(
      solution.checkOut
    );

  if (
    Number.isNaN(
      solutionStart
    ) ||
    Number.isNaN(
      solutionEnd
    ) ||
    (
      solutionStart !==
        null &&
      solutionEnd !==
        null &&
      solutionEnd <=
        solutionStart
    ) ||
    (
      (
        solutionStart ===
          null
      ) !==
      (
        solutionEnd ===
          null
      )
    )
  ) {
    addIssue(
      issues,
      "solution-date-range-invalid",
      "checkIn/checkOut",
      "Solution dates must be a valid complete ISO date range or both null."
    );
  }

  let segmentNightTotal =
    0;

  let previousEnd:
    number |
    null =
      null;

  let expectedCurrency:
    string |
    null =
      null;

  let knownSegmentCostTotal =
    0;

  let allSegmentCostsKnown =
    solution.segments.length >
    0;

  for (
    const [
      index,
      segment,
    ] of solution.segments.entries()
  ) {
    const path =
      `segments.${index}`;

    if (
      !segment.segmentId.trim()
    ) {
      addIssue(
        issues,
        "solution-segment-id-missing",
        `${path}.segmentId`,
        "Each segment requires a stable segmentId."
      );
    }

    if (
      segment.ordinal !==
        index
    ) {
      addIssue(
        issues,
        "solution-segment-ordinal-invalid",
        `${path}.ordinal`,
        "Segment ordinals must be zero-based and contiguous."
      );
    }

    if (
      !segment.hotelId.trim()
    ) {
      addIssue(
        issues,
        "solution-segment-hotel-id-missing",
        `${path}.hotelId`,
        "Each segment requires a hotelId."
      );
    }

    if (
      !Number.isInteger(
        segment.nights
      ) ||
      segment.nights <=
        0
    ) {
      addIssue(
        issues,
        "solution-segment-nights-invalid",
        `${path}.nights`,
        "Segment nights must be a positive integer."
      );
    }
    else {
      segmentNightTotal +=
        segment.nights;
    }

    const segmentStart =
      parseIsoDate(
        segment.checkIn
      );

    const segmentEnd =
      parseIsoDate(
        segment.checkOut
      );

    if (
      Number.isNaN(
        segmentStart
      ) ||
      Number.isNaN(
        segmentEnd
      ) ||
      (
        segmentStart !==
          null &&
        segmentEnd !==
          null &&
        (
          segmentEnd <=
            segmentStart ||
          Math.round(
            (
              segmentEnd -
              segmentStart
            ) /
            DAY_MS
          ) !==
            segment.nights
        )
      ) ||
      (
        (
          segmentStart ===
            null
        ) !==
        (
          segmentEnd ===
            null
        )
      )
    ) {
      addIssue(
        issues,
        "solution-date-range-invalid",
        `${path}.checkIn/checkOut`,
        "Segment dates must match its night count."
      );
    }

    if (
      previousEnd !==
        null &&
      segmentStart !==
        null &&
      previousEnd !==
        segmentStart
    ) {
      addIssue(
        issues,
        "solution-segments-not-contiguous",
        path,
        "Split segments must cover contiguous nights without overlap or gaps."
      );
    }

    previousEnd =
      segmentEnd;

    const segmentCurrency =
      validateCost(
        segment.cost,
        `${path}.cost`,
        issues
      );

    if (
      segmentCurrency !==
        null
    ) {
      if (
        expectedCurrency ===
          null
      ) {
        expectedCurrency =
          segmentCurrency;
      }
      else if (
        expectedCurrency !==
          segmentCurrency
      ) {
        addIssue(
          issues,
          "solution-cost-currency-mismatch",
          `${path}.cost.currency`,
          "All solution segments must use the same currency."
        );
      }
    }

    if (
      segment.cost.amount ===
        null
    ) {
      allSegmentCostsKnown =
        false;
    }
    else {
      knownSegmentCostTotal +=
        segment.cost.amount;
    }
  }

  if (
    !Number.isInteger(
      solution.totalNights
    ) ||
    solution.totalNights <=
      0 ||
    segmentNightTotal !==
      solution.totalNights
  ) {
    addIssue(
      issues,
      "solution-total-nights-mismatch",
      "totalNights",
      "Solution totalNights must equal the sum of segment nights."
    );
  }

  const totalCurrency =
    validateCost(
      solution.totalCost,
      "totalCost",
      issues
    );

  if (
    expectedCurrency !==
      null &&
    totalCurrency !==
      expectedCurrency
  ) {
    addIssue(
      issues,
      "solution-cost-currency-mismatch",
      "totalCost.currency",
      "Solution total currency must match every segment."
    );
  }

  if (
    allSegmentCostsKnown &&
    solution.totalCost.amount !==
      null &&
    Math.abs(
      knownSegmentCostTotal -
      solution.totalCost.amount
    ) >
      0.01
  ) {
    addIssue(
      issues,
      "solution-total-cost-mismatch",
      "totalCost.amount",
      "Solution total cost must equal the sum of segment costs."
    );
  }

  return {
    valid:
      issues.length ===
      0,

    issues:
      issues.sort(
        (
          first,
          second
        ) =>
          first.path.localeCompare(
            second.path
          ) ||
          first.code.localeCompare(
            second.code
          )
      ),
  };
}

export function assertStaySolutionV3(
  solution:
    StaySolutionV3
) {
  const validation =
    validateStaySolutionV3(
      solution
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Invalid StaySolutionV3: ${validation.issues.map((issue) => issue.code).join(", ")}.`
    );
  }

  return solution;
}
