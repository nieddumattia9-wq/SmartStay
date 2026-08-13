import {
  createStableHashV3,
  isStableHashV3,
} from "../contract/stableHashV3";

import type {
  StayCostCompletenessV3,
} from "../contract/staySolutionV3";

const DAY_MS =
  24 * 60 * 60 * 1000;

const MONEY_TOLERANCE =
  0.01;

export type StayEvidenceStateV3 =
  | "known"
  | "estimated"
  | "unknown"
  | "not-applicable"
  | "conflicting";

export type StayScopeStatusV3 =
  | "exact"
  | "incomplete"
  | "conflicting";

export interface StayScopeV3 {
  checkIn:
    string |
    null;

  checkOut:
    string |
    null;

  nights:
    number |
    null;

  adults:
    number |
    null;

  children:
    number |
    null;

  rooms:
    number |
    null;

  status:
    StayScopeStatusV3;
}

export interface StayMoneyEvidenceV3 {
  amount:
    number |
    null;

  currency:
    string |
    null;

  state:
    StayEvidenceStateV3;

  evidenceIds:
    string[];
}

export interface StayTaxEvidenceV3 {
  taxesIncluded:
    boolean |
    null;

  includedAmount:
    number;

  excludedAmount:
    number;

  unknownAmount:
    number;

  currency:
    string |
    null;

  state:
    StayEvidenceStateV3;

  evidenceIds:
    string[];
}

export type StayCostIntegrityStatusV3 =
  | "complete"
  | "provisional"
  | "incomplete"
  | "conflicting";

export interface StayCanonicalCostV3 {
  priceScope:
    | "reported-stay-total"
    | "nightly-total"
    | "unknown";

  total:
    StayMoneyEvidenceV3;

  taxes:
    StayTaxEvidenceV3;

  fees:
    StayMoneyEvidenceV3;

  sourceCompleteness:
    StayCostCompletenessV3;

  integrityStatus:
    StayCostIntegrityStatusV3;
}

export interface StayCanonicalRoomV3 {
  name:
    string |
    null;

  state:
    StayEvidenceStateV3;
}

export interface StayCanonicalMealPlanV3 {
  name:
    string |
    null;

  state:
    StayEvidenceStateV3;
}

export interface StayCanonicalCancellationV3 {
  status:
    | "refundable"
    | "non-refundable"
    | "conditional"
    | "unknown";

  freeCancellationUntil:
    string |
    null;

  penaltyAmount:
    number |
    null;

  penaltyCurrency:
    string |
    null;

  state:
    StayEvidenceStateV3;
}

export interface StayCanonicalPaymentV3 {
  timing:
    | "pay-now"
    | "pay-later"
    | "mixed"
    | "unknown";

  state:
    StayEvidenceStateV3;
}

export interface StayBookabilityEvidenceV3 {
  status:
    | "bookable"
    | "recheck-required"
    | "sold-out"
    | "unknown";

  searchBookable:
    boolean |
    null;

  observedAt:
    string |
    null;

  freshness:
    | "fresh"
    | "stale"
    | "unknown";

  recheckRequired:
    boolean;

  evidenceIds:
    string[];
}

export interface StayNightEvidenceV3 {
  date:
    string;

  amount:
    number |
    null;

  currency:
    string |
    null;

  amountState:
    StayEvidenceStateV3;

  availability:
    | "available"
    | "unavailable"
    | "unknown";

  evidenceIds:
    string[];
}

export interface StayTemporalPriceEvidenceV3 {
  status:
    | "complete"
    | "partial"
    | "not-provided"
    | "invalid";

  expectedNightCount:
    number |
    null;

  coveredNightCount:
    number;

  nights:
    StayNightEvidenceV3[];

  totalsReconcile:
    boolean |
    null;

  reasonCodes:
    string[];
}

export interface StayOfferIntegritySnapshotV3 {
  snapshotId:
    string;

  canonicalOfferKey:
    string;

  hotelId:
    string;

  offerId:
    string;

  scope:
    StayScopeV3;

  room:
    StayCanonicalRoomV3;

  mealPlan:
    StayCanonicalMealPlanV3;

  cancellation:
    StayCanonicalCancellationV3;

  payment:
    StayCanonicalPaymentV3;

  cost:
    StayCanonicalCostV3;

  bookability:
    StayBookabilityEvidenceV3;

  temporalPriceEvidence:
    StayTemporalPriceEvidenceV3;

  evidenceIds:
    string[];
}

export interface StayNightEvidenceInputV3 {
  date:
    unknown;

  amount?:
    unknown;

  currency?:
    unknown;

  amountState?:
    StayEvidenceStateV3;

  available?:
    boolean |
    null;

  evidenceIds?:
    readonly string[];
}

export interface CreateStayOfferIntegritySnapshotInputV3 {
  hotelId:
    unknown;

  offerId:
    unknown;

  scope: {
    checkIn:
      unknown;

    checkOut:
      unknown;

    nights:
      unknown;

    adults:
      unknown;

    children:
      unknown;

    rooms:
      unknown;
  };

  roomName:
    unknown;

  mealPlan:
    unknown;

  cancellation: {
    refundable:
      boolean |
      null;

    freeCancellationUntil:
      unknown;

    penaltyAmount:
      unknown;

    penaltyCurrency:
      unknown;

    policyKnown:
      boolean;
  };

  payment?: {
    timing?:
      | "pay-now"
      | "pay-later"
      | "mixed"
      | "unknown";

    state?:
      StayEvidenceStateV3;
  };

  cost: {
    amount:
      unknown;

    currency:
      unknown;

    completeness:
      StayCostCompletenessV3;

    taxesIncluded:
      boolean |
      null;

    includedTaxes:
      unknown;

    excludedTaxes:
      unknown;

    unknownTaxes:
      unknown;

    feeAmount?:
      unknown;

    feeState?:
      StayEvidenceStateV3;
  };

  bookable:
    boolean |
    null;

  recheckRequired:
    boolean;

  observedAt?:
    unknown;

  freshness?:
    | "fresh"
    | "stale"
    | "unknown";

  nightlyPrices?:
    readonly StayNightEvidenceInputV3[];

  evidenceIds:
    readonly string[];
}

export type StayOfferIntegrityValidationIssueCodeV3 =
  | "offer-integrity-id-invalid"
  | "offer-integrity-scope-invalid"
  | "offer-integrity-cost-invalid"
  | "offer-integrity-bookability-invalid"
  | "offer-integrity-temporal-invalid"
  | "offer-integrity-fingerprint-mismatch";

export interface StayOfferIntegrityValidationIssueV3 {
  code:
    StayOfferIntegrityValidationIssueCodeV3;

  path:
    string;

  message:
    string;
}

export interface StayOfferIntegrityValidationV3 {
  valid:
    boolean;

  issues:
    StayOfferIntegrityValidationIssueV3[];
}

function uniqueSorted(
  values:
    readonly string[]
) {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim()
        )
        .filter(
          Boolean
        )
    ),
  ].sort();
}

function normalizeText(
  value:
    unknown
) {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function normalizeCurrency(
  value:
    unknown
) {
  const normalized =
    normalizeText(
      value
    )?.toUpperCase() ??
    null;

  return normalized !==
      null &&
    /^[A-Z]{3}$/.test(
      normalized
    )
    ? normalized
    : null;
}

function normalizePositiveNumber(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value > 0
    ? value
    : null;
}

function normalizeNonNegativeNumber(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value
    ) &&
    value >= 0
    ? value
    : null;
}

function normalizePositiveInteger(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    value > 0
    ? value
    : null;
}

function normalizeNonNegativeInteger(
  value:
    unknown
) {
  return typeof value ===
      "number" &&
    Number.isInteger(
      value
    ) &&
    value >= 0
    ? value
    : null;
}

export function parseIsoDateV3(
  value:
    unknown
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return null;
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
    ? {
        value,
        timestamp,
      }
    : null;
}

function formatIsoDate(
  timestamp:
    number
) {
  return new Date(
    timestamp
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

export function enumerateStayNightsV3(
  checkIn:
    string |
    null,
  checkOut:
    string |
    null
) {
  const start =
    parseIsoDateV3(
      checkIn
    );

  const end =
    parseIsoDateV3(
      checkOut
    );

  if (
    start ===
      null ||
    end ===
      null ||
    end.timestamp <=
      start.timestamp
  ) {
    return [];
  }

  const dates:
    string[] =
      [];

  for (
    let timestamp =
      start.timestamp;
    timestamp <
      end.timestamp;
    timestamp +=
      DAY_MS
  ) {
    dates.push(
      formatIsoDate(
        timestamp
      )
    );
  }

  return dates;
}

function createScope(
  input:
    CreateStayOfferIntegritySnapshotInputV3["scope"]
): StayScopeV3 {
  const checkIn =
    parseIsoDateV3(
      input.checkIn
    )?.value ??
    null;

  const checkOut =
    parseIsoDateV3(
      input.checkOut
    )?.value ??
    null;

  const nights =
    normalizePositiveInteger(
      input.nights
    );

  const adults =
    normalizePositiveInteger(
      input.adults
    );

  const children =
    normalizeNonNegativeInteger(
      input.children
    );

  const rooms =
    normalizePositiveInteger(
      input.rooms
    );

  const expectedDates =
    enumerateStayNightsV3(
      checkIn,
      checkOut
    );

  const hasDatePair =
    checkIn !==
      null &&
    checkOut !==
      null;

  const dateConflict =
    hasDatePair &&
    expectedDates.length ===
      0;

  const nightConflict =
    hasDatePair &&
    nights !==
      null &&
    expectedDates.length !==
      nights;

  const status:
    StayScopeStatusV3 =
      dateConflict ||
      nightConflict
        ? "conflicting"
        : hasDatePair &&
            nights !==
              null &&
            adults !==
              null &&
            children !==
              null &&
            rooms !==
              null
          ? "exact"
          : "incomplete";

  return {
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    rooms,
    status,
  };
}

function stateForTotal(
  completeness:
    StayCostCompletenessV3,
  amount:
    number |
    null,
  currency:
    string |
    null
): StayEvidenceStateV3 {
  if (
    amount ===
      null ||
    currency ===
      null
  ) {
    return "unknown";
  }

  if (
    completeness ===
      "reported-complete"
  ) {
    return "known";
  }

  if (
    completeness ===
      "reported-tax-status-unknown" ||
    completeness ===
      "partial"
  ) {
    return "estimated";
  }

  return "unknown";
}

function stateForTaxes(
  input:
    CreateStayOfferIntegritySnapshotInputV3["cost"]
): StayEvidenceStateV3 {
  const included =
    normalizeNonNegativeNumber(
      input.includedTaxes
    );

  const excluded =
    normalizeNonNegativeNumber(
      input.excludedTaxes
    );

  const unknown =
    normalizeNonNegativeNumber(
      input.unknownTaxes
    );

  if (
    included ===
      null ||
    excluded ===
      null ||
    unknown ===
      null
  ) {
    return "conflicting";
  }

  if (
    unknown >
      0 ||
    input.completeness ===
      "partial"
  ) {
    return "estimated";
  }

  if (
    input.taxesIncluded ===
      true ||
    input.taxesIncluded ===
      false &&
      excluded >
        0
  ) {
    return "known";
  }

  return "unknown";
}

function createCost(
  input:
    CreateStayOfferIntegritySnapshotInputV3["cost"],
  scope:
    StayScopeV3,
  evidenceIds:
    string[]
): StayCanonicalCostV3 {
  const amount =
    normalizePositiveNumber(
      input.amount
    );

  const currency =
    normalizeCurrency(
      input.currency
    );

  const totalState =
    stateForTotal(
      input.completeness,
      amount,
      currency
    );

  const includedTaxes =
    normalizeNonNegativeNumber(
      input.includedTaxes
    ) ??
    0;

  const excludedTaxes =
    normalizeNonNegativeNumber(
      input.excludedTaxes
    ) ??
    0;

  const unknownTaxes =
    normalizeNonNegativeNumber(
      input.unknownTaxes
    ) ??
    0;

  const taxState =
    stateForTaxes(
      input
    );

  const feeAmount =
    normalizeNonNegativeNumber(
      input.feeAmount
    );

  const feeState =
    input.feeState ??
    "unknown";

  const hasConflict =
    scope.status ===
      "conflicting" ||
    taxState ===
      "conflicting" ||
    totalState ===
      "conflicting" ||
    feeState ===
      "conflicting" ||
    feeAmount !==
      null &&
      amount !==
        null &&
      feeAmount >
        amount +
        MONEY_TOLERANCE;

  const complete =
    scope.status ===
      "exact" &&
    totalState ===
      "known" &&
    taxState ===
      "known" &&
    (
      feeState ===
        "known" ||
      feeState ===
        "not-applicable"
    );

  const provisional =
    amount !==
      null &&
    currency !==
      null &&
    scope.status !==
      "conflicting";

  return {
    priceScope:
      scope.checkIn !==
          null &&
        scope.checkOut !==
          null
        ? "reported-stay-total"
        : "unknown",
    total: {
      amount,
      currency,
      state:
        totalState,
      evidenceIds,
    },
    taxes: {
      taxesIncluded:
        input.taxesIncluded,
      includedAmount:
        includedTaxes,
      excludedAmount:
        excludedTaxes,
      unknownAmount:
        unknownTaxes,
      currency,
      state:
        taxState,
      evidenceIds,
    },
    fees: {
      amount:
        feeAmount,
      currency:
        feeAmount ===
          null
          ? null
          : currency,
      state:
        feeState,
      evidenceIds,
    },
    sourceCompleteness:
      input.completeness,
    integrityStatus:
      hasConflict
        ? "conflicting"
        : complete
          ? "complete"
          : provisional
            ? "provisional"
            : "incomplete",
  };
}

function createCancellation(
  input:
    CreateStayOfferIntegritySnapshotInputV3["cancellation"]
): StayCanonicalCancellationV3 {
  const freeCancellationUntil =
    normalizeText(
      input.freeCancellationUntil
    );

  const penaltyAmount =
    normalizeNonNegativeNumber(
      input.penaltyAmount
    );

  const penaltyCurrency =
    normalizeCurrency(
      input.penaltyCurrency
    );

  const status =
    input.refundable ===
      true
      ? freeCancellationUntil ===
          null
        ? "refundable"
        : "conditional"
      : input.refundable ===
          false
        ? "non-refundable"
        : freeCancellationUntil !==
            null
          ? "conditional"
          : "unknown";

  const state:
    StayEvidenceStateV3 =
      input.refundable !==
          null ||
        input.policyKnown ||
        freeCancellationUntil !==
          null
        ? "known"
        : "unknown";

  return {
    status,
    freeCancellationUntil,
    penaltyAmount,
    penaltyCurrency,
    state,
  };
}

function createBookability(
  input:
    CreateStayOfferIntegritySnapshotInputV3,
  evidenceIds:
    string[]
): StayBookabilityEvidenceV3 {
  const observedAt =
    normalizeText(
      input.observedAt
    );

  return {
    status:
      input.bookable ===
        false
        ? "sold-out"
        : input.bookable ===
            true
          ? input.recheckRequired
            ? "recheck-required"
            : "bookable"
          : "unknown",
    searchBookable:
      input.bookable,
    observedAt,
    freshness:
      input.freshness ??
      "unknown",
    recheckRequired:
      input.recheckRequired,
    evidenceIds,
  };
}

function normalizeNight(
  input:
    StayNightEvidenceInputV3
): StayNightEvidenceV3 | null {
  const date =
    parseIsoDateV3(
      input.date
    )?.value ??
    null;

  if (
    date ===
      null
  ) {
    return null;
  }

  const amount =
    normalizePositiveNumber(
      input.amount
    );

  const currency =
    normalizeCurrency(
      input.currency
    );

  const amountState =
    input.amountState ??
    (
      amount !==
          null &&
        currency !==
          null
        ? "known"
        : "unknown"
    );

  return {
    date,
    amount,
    currency,
    amountState,
    availability:
      input.available ===
        true
        ? "available"
        : input.available ===
            false
          ? "unavailable"
          : "unknown",
    evidenceIds:
      uniqueSorted(
        input.evidenceIds ??
        []
      ),
  };
}

function createTemporalEvidence(
  input:
    readonly StayNightEvidenceInputV3[] |
    undefined,
  scope:
    StayScopeV3,
  total:
    StayMoneyEvidenceV3
): StayTemporalPriceEvidenceV3 {
  const expectedDates =
    enumerateStayNightsV3(
      scope.checkIn,
      scope.checkOut
    );

  if (
    input ===
      undefined ||
    input.length ===
      0
  ) {
    return {
      status:
        "not-provided",
      expectedNightCount:
        scope.nights,
      coveredNightCount:
        0,
      nights:
        [],
      totalsReconcile:
        null,
      reasonCodes: [
        "nightly-prices-not-provided",
      ],
    };
  }

  const normalized =
    input.map(
      normalizeNight
    );

  const invalidDate =
    normalized.some(
      (night) =>
        night ===
          null
    );

  const nights =
    normalized
      .filter(
        (
          night
        ): night is StayNightEvidenceV3 =>
          night !==
          null
      )
      .sort(
        (
          first,
          second
        ) =>
          first.date.localeCompare(
            second.date
          )
      );

  const dates =
    nights.map(
      (night) =>
        night.date
    );

  const duplicateDate =
    new Set(
      dates
    ).size !==
      dates.length;

  const unexpectedDate =
    dates.some(
      (date) =>
        !expectedDates.includes(
          date
        )
    );

  const currencyConflict =
    nights.some(
      (night) =>
        night.currency !==
          null &&
        total.currency !==
          null &&
        night.currency !==
          total.currency
    );

  const allAmountsKnown =
    nights.length >
      0 &&
    nights.every(
      (night) =>
        night.amount !==
          null &&
        night.currency !==
          null &&
        night.amountState ===
          "known"
    );

  const amountSum =
    nights.reduce(
      (
        totalAmount,
        night
      ) =>
        totalAmount +
        (
          night.amount ??
          0
        ),
      0
    );

  const fullDateCoverage =
    expectedDates.length >
      0 &&
    expectedDates.length ===
      nights.length &&
    expectedDates.every(
      (
        date,
        index
      ) =>
        nights[index]
          ?.date ===
        date
    );

  const totalsReconcile =
    allAmountsKnown &&
      total.amount !==
        null &&
      fullDateCoverage
      ? Math.abs(
          amountSum -
          total.amount
        ) <=
        MONEY_TOLERANCE
      : null;

  const allAvailable =
    nights.every(
      (night) =>
        night.availability ===
          "available"
    );

  const invalid =
    invalidDate ||
    duplicateDate ||
    unexpectedDate ||
    currencyConflict ||
    totalsReconcile ===
      false;

  const complete =
    !invalid &&
    scope.status ===
      "exact" &&
    fullDateCoverage &&
    allAmountsKnown &&
    allAvailable &&
    totalsReconcile ===
      true;

  const reasonCodes =
    invalid
      ? [
          "nightly-prices-invalid",
        ]
      : complete
        ? [
            "nightly-prices-complete",
          ]
        : [
            "nightly-prices-partial",
          ];

  return {
    status:
      invalid
        ? "invalid"
        : complete
          ? "complete"
          : "partial",
    expectedNightCount:
      scope.nights,
    coveredNightCount:
      new Set(
        dates
      ).size,
    nights,
    totalsReconcile,
    reasonCodes,
  };
}

function createCanonicalOfferKeyInput(
  snapshot:
    Omit<
      StayOfferIntegritySnapshotV3,
      "snapshotId" |
      "canonicalOfferKey"
    >
) {
  return {
    hotelId:
      snapshot.hotelId,
    scope:
      snapshot.scope,
    room:
      snapshot.room,
    mealPlan:
      snapshot.mealPlan,
    cancellation:
      snapshot.cancellation,
    payment:
      snapshot.payment,
    total: {
      amount:
        snapshot.cost.total
          .amount,
      currency:
        snapshot.cost.total
          .currency,
      state:
        snapshot.cost.total
          .state,
    },
    taxes: {
      taxesIncluded:
        snapshot.cost.taxes
          .taxesIncluded,
      includedAmount:
        snapshot.cost.taxes
          .includedAmount,
      excludedAmount:
        snapshot.cost.taxes
          .excludedAmount,
      unknownAmount:
        snapshot.cost.taxes
          .unknownAmount,
      currency:
        snapshot.cost.taxes
          .currency,
      state:
        snapshot.cost.taxes
          .state,
    },
    fees: {
      amount:
        snapshot.cost.fees
          .amount,
      currency:
        snapshot.cost.fees
          .currency,
      state:
        snapshot.cost.fees
          .state,
    },
    bookability: {
      status:
        snapshot.bookability
          .status,
      searchBookable:
        snapshot.bookability
          .searchBookable,
      freshness:
        snapshot.bookability
          .freshness,
      recheckRequired:
        snapshot.bookability
          .recheckRequired,
    },
    temporalPriceEvidence: {
      status:
        snapshot.temporalPriceEvidence
          .status,
      expectedNightCount:
        snapshot.temporalPriceEvidence
          .expectedNightCount,
      coveredNightCount:
        snapshot.temporalPriceEvidence
          .coveredNightCount,
      totalsReconcile:
        snapshot.temporalPriceEvidence
          .totalsReconcile,
      nights:
        snapshot.temporalPriceEvidence
          .nights.map(
            (night) => ({
              date:
                night.date,
              amount:
                night.amount,
              currency:
                night.currency,
              amountState:
                night.amountState,
              availability:
                night.availability,
            })
          ),
    },
  };
}

export function createCanonicalOfferKeyV3(
  snapshot:
    Omit<
      StayOfferIntegritySnapshotV3,
      "snapshotId" |
      "canonicalOfferKey"
    >
) {
  return createStableHashV3(
    createCanonicalOfferKeyInput(
      snapshot
    ),
    "stayopti-v3-canonical-offer"
  );
}

export function createStayOfferSnapshotFingerprintV3(
  snapshot:
    Omit<
      StayOfferIntegritySnapshotV3,
      "snapshotId"
    >
) {
  return createStableHashV3(
    snapshot,
    "stayopti-v3-offer-snapshot"
  );
}

export function createStayOfferIntegritySnapshotV3(
  input:
    CreateStayOfferIntegritySnapshotInputV3
): StayOfferIntegritySnapshotV3 {
  const hotelId =
    normalizeText(
      input.hotelId
    ) ??
    "";

  const offerId =
    normalizeText(
      input.offerId
    ) ??
    "";

  const evidenceIds =
    uniqueSorted(
      input.evidenceIds
    );

  const scope =
    createScope(
      input.scope
    );

  const cost =
    createCost(
      input.cost,
      scope,
      evidenceIds
    );

  const roomName =
    normalizeText(
      input.roomName
    );

  const mealPlan =
    normalizeText(
      input.mealPlan
    );

  const paymentTiming =
    input.payment
      ?.timing ??
    "unknown";

  const withoutKeys:
    Omit<
      StayOfferIntegritySnapshotV3,
      "snapshotId" |
      "canonicalOfferKey"
    > = {
    hotelId,
    offerId,
    scope,
    room: {
      name:
        roomName,
      state:
        roomName ===
          null
          ? "unknown"
          : "known",
    },
    mealPlan: {
      name:
        mealPlan,
      state:
        mealPlan ===
          null
          ? "unknown"
          : "known",
    },
    cancellation:
      createCancellation(
        input.cancellation
      ),
    payment: {
      timing:
        paymentTiming,
      state:
        input.payment
          ?.state ??
        (
          paymentTiming ===
            "unknown"
            ? "unknown"
            : "known"
        ),
    },
    cost,
    bookability:
      createBookability(
        input,
        evidenceIds
      ),
    temporalPriceEvidence:
      createTemporalEvidence(
        input.nightlyPrices,
        scope,
        cost.total
      ),
    evidenceIds,
  };

  const canonicalOfferKey =
    createCanonicalOfferKeyV3(
      withoutKeys
    );

  const withCanonicalKey = {
    canonicalOfferKey,
    ...withoutKeys,
  };

  const snapshotId =
    createStayOfferSnapshotFingerprintV3(
      withCanonicalKey
    );

  return {
    snapshotId,
    ...withCanonicalKey,
  };
}

function addIssue(
  issues:
    StayOfferIntegrityValidationIssueV3[],
  code:
    StayOfferIntegrityValidationIssueCodeV3,
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

function isValidMoneyEvidence(
  evidence:
    StayMoneyEvidenceV3
) {
  const amountValid =
    evidence.amount ===
      null ||
    typeof evidence.amount ===
      "number" &&
      Number.isFinite(
        evidence.amount
      ) &&
      evidence.amount >=
        0;

  const currencyValid =
    evidence.currency ===
      null ||
    normalizeCurrency(
      evidence.currency
    ) ===
      evidence.currency;

  const knownPairValid =
    evidence.state !==
      "known" ||
    evidence.amount !==
      null &&
      evidence.currency !==
        null;

  return amountValid &&
    currencyValid &&
    knownPairValid;
}

export function validateStayOfferIntegritySnapshotV3(
  snapshot:
    StayOfferIntegritySnapshotV3
): StayOfferIntegrityValidationV3 {
  const issues:
    StayOfferIntegrityValidationIssueV3[] =
      [];

  if (
    !snapshot.hotelId.trim() ||
    !snapshot.offerId.trim() ||
    !isStableHashV3(
      snapshot.snapshotId
    ) ||
    !isStableHashV3(
      snapshot.canonicalOfferKey
    )
  ) {
    addIssue(
      issues,
      "offer-integrity-id-invalid",
      "ids",
      "Hotel, offer and stable integrity identifiers are required."
    );
  }

  const expectedDates =
    enumerateStayNightsV3(
      snapshot.scope
        .checkIn,
      snapshot.scope
        .checkOut
    );

  const exactScopeValid =
    snapshot.scope.status !==
      "exact" ||
    snapshot.scope.nights !==
      null &&
    expectedDates.length ===
      snapshot.scope.nights &&
    snapshot.scope.adults !==
      null &&
    snapshot.scope.children !==
      null &&
    snapshot.scope.rooms !==
      null;

  if (
    !exactScopeValid ||
    snapshot.scope.status ===
      "conflicting"
  ) {
    addIssue(
      issues,
      "offer-integrity-scope-invalid",
      "scope",
      "Stay dates, nights and occupancy must be internally coherent."
    );
  }

  const taxesValid = [
    snapshot.cost.taxes
      .includedAmount,
    snapshot.cost.taxes
      .excludedAmount,
    snapshot.cost.taxes
      .unknownAmount,
  ].every(
    (value) =>
      typeof value ===
        "number" &&
      Number.isFinite(
        value
      ) &&
      value >=
        0
  );

  if (
    !isValidMoneyEvidence(
      snapshot.cost.total
    ) ||
    !isValidMoneyEvidence(
      snapshot.cost.fees
    ) ||
    !taxesValid ||
    snapshot.cost.integrityStatus ===
      "conflicting"
  ) {
    addIssue(
      issues,
      "offer-integrity-cost-invalid",
      "cost",
      "Canonical stay cost is invalid or conflicting."
    );
  }

  if (
    snapshot.bookability.status ===
        "bookable" &&
      snapshot.bookability
        .searchBookable !==
        true ||
    snapshot.bookability.status ===
        "sold-out" &&
      snapshot.bookability
        .searchBookable !==
        false ||
    snapshot.bookability.status ===
        "recheck-required" &&
      (
        snapshot.bookability
          .searchBookable !==
          true ||
        !snapshot.bookability
          .recheckRequired
      )
  ) {
    addIssue(
      issues,
      "offer-integrity-bookability-invalid",
      "bookability",
      "Bookability status contradicts the observed search state."
    );
  }

  if (
    snapshot.temporalPriceEvidence
      .status ===
      "invalid"
  ) {
    addIssue(
      issues,
      "offer-integrity-temporal-invalid",
      "temporalPriceEvidence",
      "Nightly price or availability evidence is internally inconsistent."
    );
  }

  const {
    snapshotId:
      ignoredSnapshotId,
    canonicalOfferKey:
      ignoredCanonicalOfferKey,
    ...withoutKeys
  } = snapshot;

  void ignoredSnapshotId;
  void ignoredCanonicalOfferKey;

  const expectedCanonicalKey =
    createCanonicalOfferKeyV3(
      withoutKeys
    );

  const expectedSnapshotId =
    createStayOfferSnapshotFingerprintV3({
      canonicalOfferKey:
        snapshot.canonicalOfferKey,
      ...withoutKeys,
    });

  if (
    expectedCanonicalKey !==
      snapshot.canonicalOfferKey ||
    expectedSnapshotId !==
      snapshot.snapshotId
  ) {
    addIssue(
      issues,
      "offer-integrity-fingerprint-mismatch",
      "snapshotId/canonicalOfferKey",
      "Offer integrity fingerprints do not match the canonical content."
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

export function assertStayOfferIntegritySnapshotV3(
  snapshot:
    StayOfferIntegritySnapshotV3
) {
  const validation =
    validateStayOfferIntegritySnapshotV3(
      snapshot
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `Invalid StayOfferIntegritySnapshotV3: ${validation.issues.map((issue) => issue.code).join(", ")}.`
    );
  }

  return snapshot;
}

function snapshotPreference(
  snapshot:
    StayOfferIntegritySnapshotV3
) {
  const bookabilityRank =
    snapshot.bookability
      .searchBookable ===
      true
      ? 0
      : snapshot.bookability
          .searchBookable ===
          null
        ? 1
        : 2;

  const costRank =
    snapshot.cost.total
      .state ===
      "known"
      ? 0
      : snapshot.cost.total
          .state ===
          "estimated"
        ? 1
        : 2;

  return {
    bookabilityRank,
    costRank,
    amount:
      snapshot.cost.total
        .amount ??
      Number.POSITIVE_INFINITY,
  };
}

export function deduplicateStayOfferSnapshotsV3(
  snapshots:
    readonly StayOfferIntegritySnapshotV3[]
) {
  const byCanonicalKey =
    new Map<
      string,
      StayOfferIntegritySnapshotV3
    >();

  for (
    const snapshot
    of [
      ...snapshots,
    ].sort(
      (
        first,
        second
      ) =>
        first.snapshotId.localeCompare(
          second.snapshotId
        )
    )
  ) {
    const current =
      byCanonicalKey.get(
        snapshot.canonicalOfferKey
      );

    if (!current) {
      byCanonicalKey.set(
        snapshot.canonicalOfferKey,
        snapshot
      );
      continue;
    }

    const first =
      snapshotPreference(
        snapshot
      );

    const second =
      snapshotPreference(
        current
      );

    const shouldReplace =
      first.bookabilityRank <
        second.bookabilityRank ||
      first.bookabilityRank ===
          second.bookabilityRank &&
        first.costRank <
          second.costRank ||
      first.bookabilityRank ===
          second.bookabilityRank &&
        first.costRank ===
          second.costRank &&
        first.amount <
          second.amount ||
      first.bookabilityRank ===
          second.bookabilityRank &&
        first.costRank ===
          second.costRank &&
        first.amount ===
          second.amount &&
        snapshot.snapshotId.localeCompare(
          current.snapshotId
        ) <
          0;

    if (
      shouldReplace
    ) {
      byCanonicalKey.set(
        snapshot.canonicalOfferKey,
        snapshot
      );
    }
  }

  return [
    ...byCanonicalKey.values(),
  ].sort(
    (
      first,
      second
    ) =>
      first.canonicalOfferKey.localeCompare(
        second.canonicalOfferKey
      )
  );
}
