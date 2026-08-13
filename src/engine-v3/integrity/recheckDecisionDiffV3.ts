import type {
  SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  uniqueReasonCodesV3,
} from "../contract/reasonCodesV3";

import {
  stableSerializeV3,
} from "../contract/stableHashV3";

import type {
  StayOfferIntegritySnapshotV3,
} from "./stayOfferIntegrityV3";

export type StayOfferRecheckStateV3 =
  | "confirmed"
  | "changed"
  | "sold-out"
  | "recheck-required";

export interface StayOfferRecheckDecisionDiffV3 {
  state:
    StayOfferRecheckStateV3;

  originalSnapshotId:
    string;

  confirmedSnapshotId:
    string |
    null;

  changedFields:
    string[];

  materialChangedFields:
    string[];

  requiresUserConfirmation:
    boolean;

  requiresDecisionReplay:
    boolean;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

function moneyChanged(
  first:
    number |
    null,
  second:
    number |
    null
) {
  if (
    first ===
      null ||
    second ===
      null
  ) {
    return first !==
      second;
  }

  return Math.abs(
    first -
    second
  ) >
    0.01;
}

function addIfChanged(
  changedFields:
    string[],
  field:
    string,
  changed:
    boolean
) {
  if (
    changed
  ) {
    changedFields.push(
      field
    );
  }
}

export function compareStayOfferRecheckV3(
  original:
    StayOfferIntegritySnapshotV3,
  confirmed:
    StayOfferIntegritySnapshotV3 |
    null
): StayOfferRecheckDecisionDiffV3 {
  if (
    confirmed ===
      null
  ) {
    return {
      state:
        "recheck-required",
      originalSnapshotId:
        original.snapshotId,
      confirmedSnapshotId:
        null,
      changedFields:
        [],
      materialChangedFields:
        [],
      requiresUserConfirmation:
        false,
      requiresDecisionReplay:
        false,
      reasonCodes: [
        "integrity:availability-recheck-required",
      ],
    };
  }

  if (
    confirmed.bookability
      .searchBookable ===
      false ||
    confirmed.bookability
      .status ===
      "sold-out"
  ) {
    return {
      state:
        "sold-out",
      originalSnapshotId:
        original.snapshotId,
      confirmedSnapshotId:
        confirmed.snapshotId,
      changedFields: [
        "bookability",
      ],
      materialChangedFields: [
        "bookability",
      ],
      requiresUserConfirmation:
        false,
      requiresDecisionReplay:
        true,
      reasonCodes: [
        "integrity:recheck-decision-replay-required",
      ],
    };
  }

  const changedFields:
    string[] =
      [];

  addIfChanged(
    changedFields,
    "scope",
    stableSerializeV3(
      original.scope
    ) !==
      stableSerializeV3(
        confirmed.scope
      )
  );

  addIfChanged(
    changedFields,
    "totalCost.amount",
    moneyChanged(
      original.cost.total
        .amount,
      confirmed.cost.total
        .amount
    )
  );

  addIfChanged(
    changedFields,
    "totalCost.currency",
    original.cost.total
      .currency !==
      confirmed.cost.total
        .currency
  );

  addIfChanged(
    changedFields,
    "costCompleteness",
    original.cost
      .integrityStatus !==
      confirmed.cost
        .integrityStatus ||
    original.cost
      .sourceCompleteness !==
      confirmed.cost
        .sourceCompleteness
  );

  addIfChanged(
    changedFields,
    "taxes",
    stableSerializeV3(
      {
        taxesIncluded:
          original.cost.taxes
            .taxesIncluded,
        includedAmount:
          original.cost.taxes
            .includedAmount,
        excludedAmount:
          original.cost.taxes
            .excludedAmount,
        unknownAmount:
          original.cost.taxes
            .unknownAmount,
        currency:
          original.cost.taxes
            .currency,
        state:
          original.cost.taxes
            .state,
      }
    ) !==
      stableSerializeV3(
        {
          taxesIncluded:
            confirmed.cost.taxes
              .taxesIncluded,
          includedAmount:
            confirmed.cost.taxes
              .includedAmount,
          excludedAmount:
            confirmed.cost.taxes
              .excludedAmount,
          unknownAmount:
            confirmed.cost.taxes
              .unknownAmount,
          currency:
            confirmed.cost.taxes
              .currency,
          state:
            confirmed.cost.taxes
              .state,
        }
      )
  );

  addIfChanged(
    changedFields,
    "fees",
    stableSerializeV3(
      {
        amount:
          original.cost.fees
            .amount,
        currency:
          original.cost.fees
            .currency,
        state:
          original.cost.fees
            .state,
      }
    ) !==
      stableSerializeV3(
        {
          amount:
            confirmed.cost.fees
              .amount,
          currency:
            confirmed.cost.fees
              .currency,
          state:
            confirmed.cost.fees
              .state,
        }
      )
  );

  addIfChanged(
    changedFields,
    "room",
    stableSerializeV3(
      original.room
    ) !==
      stableSerializeV3(
        confirmed.room
      )
  );

  addIfChanged(
    changedFields,
    "mealPlan",
    stableSerializeV3(
      original.mealPlan
    ) !==
      stableSerializeV3(
        confirmed.mealPlan
      )
  );

  addIfChanged(
    changedFields,
    "cancellation",
    stableSerializeV3(
      original.cancellation
    ) !==
      stableSerializeV3(
        confirmed.cancellation
      )
  );

  addIfChanged(
    changedFields,
    "payment",
    stableSerializeV3(
      original.payment
    ) !==
      stableSerializeV3(
        confirmed.payment
      )
  );

  addIfChanged(
    changedFields,
    "bookability",
    stableSerializeV3(
      {
        status:
          original.bookability
            .status,
        searchBookable:
          original.bookability
            .searchBookable,
        freshness:
          original.bookability
            .freshness,
        recheckRequired:
          original.bookability
            .recheckRequired,
      }
    ) !==
      stableSerializeV3(
        {
          status:
            confirmed.bookability
              .status,
          searchBookable:
            confirmed.bookability
              .searchBookable,
          freshness:
            confirmed.bookability
              .freshness,
          recheckRequired:
            confirmed.bookability
              .recheckRequired,
        }
      )
  );

  addIfChanged(
    changedFields,
    "temporalPriceEvidence",
    stableSerializeV3(
      {
        status:
          original.temporalPriceEvidence
            .status,
        expectedNightCount:
          original.temporalPriceEvidence
            .expectedNightCount,
        coveredNightCount:
          original.temporalPriceEvidence
            .coveredNightCount,
        totalsReconcile:
          original.temporalPriceEvidence
            .totalsReconcile,
        nights:
          original.temporalPriceEvidence
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
      }
    ) !==
      stableSerializeV3(
        {
          status:
            confirmed.temporalPriceEvidence
              .status,
          expectedNightCount:
            confirmed.temporalPriceEvidence
              .expectedNightCount,
          coveredNightCount:
            confirmed.temporalPriceEvidence
              .coveredNightCount,
          totalsReconcile:
            confirmed.temporalPriceEvidence
              .totalsReconcile,
          nights:
            confirmed.temporalPriceEvidence
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
        }
      )
  );

  const sortedChangedFields =
    [
      ...new Set(
        changedFields
      ),
    ].sort();

  const materialFieldSet =
    new Set([
      "scope",
      "totalCost.amount",
      "totalCost.currency",
      "costCompleteness",
      "taxes",
      "fees",
      "room",
      "mealPlan",
      "cancellation",
      "payment",
      "bookability",
      "temporalPriceEvidence",
    ]);

  const materialChangedFields =
    sortedChangedFields.filter(
      (field) =>
        materialFieldSet.has(
          field
        )
    );

  const requiresDecisionReplay =
    materialChangedFields.length >
      0;

  const reasonCodes:
    SmartStayReasonCodeV3[] =
      requiresDecisionReplay
        ? [
            "integrity:recheck-decision-replay-required",
          ]
        : [];

  return {
    state:
      sortedChangedFields.length >
        0
        ? "changed"
        : "confirmed",
    originalSnapshotId:
      original.snapshotId,
    confirmedSnapshotId:
      confirmed.snapshotId,
    changedFields:
      sortedChangedFields,
    materialChangedFields,
    requiresUserConfirmation:
      requiresDecisionReplay,
    requiresDecisionReplay,
    reasonCodes:
      uniqueReasonCodesV3(
        reasonCodes
      ),
  };
}
