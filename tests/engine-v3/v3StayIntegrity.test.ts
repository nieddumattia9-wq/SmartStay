import assert from "node:assert/strict";
import test from "node:test";

import {
  compareStayOfferRecheckV3,
  createStayIntegrityCoverageReportV3,
  createStayOfferIntegritySnapshotV3,
  deduplicateStayOfferSnapshotsV3,
  enumerateStayNightsV3,
  parseIsoDateV3,
  validateStayOfferIntegritySnapshotV3,
  type CreateStayOfferIntegritySnapshotInputV3,
  type StayNightEvidenceInputV3,
} from "../../src/engine-v3";

const COMPLETE_NIGHTS:
  StayNightEvidenceInputV3[] = [
    {
      date:
        "2026-10-10",
      amount:
        90,
      currency:
        "EUR",
      available:
        true,
      evidenceIds: [
        "night-1",
      ],
    },
    {
      date:
        "2026-10-11",
      amount:
        100,
      currency:
        "EUR",
      available:
        true,
      evidenceIds: [
        "night-2",
      ],
    },
    {
      date:
        "2026-10-12",
      amount:
        110,
      currency:
        "EUR",
      available:
        true,
      evidenceIds: [
        "night-3",
      ],
    },
    {
      date:
        "2026-10-13",
      amount:
        100,
      currency:
        "EUR",
      available:
        true,
      evidenceIds: [
        "night-4",
      ],
    },
  ];

interface IntegrityFixtureOptions {
  hotelId?:
    string;

  offerId?:
    string;

  amount?:
    number;

  roomName?:
    string |
    null;

  refundable?:
    boolean |
    null;

  bookable?:
    boolean |
    null;

  recheckRequired?:
    boolean;

  observedAt?:
    string |
    null;

  evidenceIds?:
    string[];

  nightlyPrices?:
    StayNightEvidenceInputV3[];

  nights?:
    number;

  checkIn?:
    string;

  checkOut?:
    string;

  feeState?:
    "known" |
    "estimated" |
    "unknown" |
    "not-applicable" |
    "conflicting";
}

function createInput(
  options:
    IntegrityFixtureOptions =
      {}
): CreateStayOfferIntegritySnapshotInputV3 {
  return {
    hotelId:
      options.hotelId ??
      "hotel-a",
    offerId:
      options.offerId ??
      "offer-a",
    scope: {
      checkIn:
        options.checkIn ??
        "2026-10-10",
      checkOut:
        options.checkOut ??
        "2026-10-14",
      nights:
        options.nights ??
        4,
      adults:
        2,
      children:
        0,
      rooms:
        1,
    },
    roomName:
      options.roomName ===
        undefined
        ? "Double room"
        : options.roomName,
    mealPlan:
      "Breakfast",
    cancellation: {
      refundable:
        options.refundable ===
          undefined
          ? true
          : options.refundable,
      freeCancellationUntil:
        "2026-10-08",
      penaltyAmount:
        0,
      penaltyCurrency:
        "EUR",
      policyKnown:
        true,
    },
    payment: {
      timing:
        "pay-now",
      state:
        "known",
    },
    cost: {
      amount:
        options.amount ??
        400,
      currency:
        "EUR",
      completeness:
        "reported-complete",
      taxesIncluded:
        true,
      includedTaxes:
        40,
      excludedTaxes:
        0,
      unknownTaxes:
        0,
      feeAmount:
        0,
      feeState:
        options.feeState ??
        "not-applicable",
    },
    bookable:
      options.bookable ===
        undefined
        ? true
        : options.bookable,
    recheckRequired:
      options.recheckRequired ??
      true,
    observedAt:
      options.observedAt ??
      null,
    freshness:
      "unknown",
    nightlyPrices:
      options.nightlyPrices ??
      COMPLETE_NIGHTS,
    evidenceIds:
      options.evidenceIds ??
      [
        "offer-evidence",
      ],
  };
}

test(
  "strict calendar handling rejects rollover dates and enumerates the exact stay nights",
  () => {
    assert.equal(
      parseIsoDateV3(
        "2026-02-30"
      ),
      null
    );

    assert.deepEqual(
      enumerateStayNightsV3(
        "2026-10-10",
        "2026-10-14"
      ),
      [
        "2026-10-10",
        "2026-10-11",
        "2026-10-12",
        "2026-10-13",
      ]
    );
  }
);

test(
  "canonical stay scope detects a date and night-count conflict",
  () => {
    const snapshot =
      createStayOfferIntegritySnapshotV3(
        createInput({
          nights:
            3,
        })
      );

    assert.equal(
      snapshot.scope.status,
      "conflicting"
    );
    assert.equal(
      validateStayOfferIntegritySnapshotV3(
        snapshot
      ).valid,
      false
    );
  }
);

test(
  "a reported stay total never fabricates nightly prices by division",
  () => {
    const input =
      createInput();

    input.nightlyPrices =
      [];

    const snapshot =
      createStayOfferIntegritySnapshotV3(
        input
      );

    assert.equal(
      snapshot.cost.total
        .amount,
      400
    );
    assert.equal(
      snapshot.temporalPriceEvidence
        .status,
      "not-provided"
    );
    assert.deepEqual(
      snapshot.temporalPriceEvidence
        .nights,
      []
    );
  }
);

test(
  "complete nightly price and availability evidence reconciles to the stay total",
  () => {
    const snapshot =
      createStayOfferIntegritySnapshotV3(
        createInput()
      );

    assert.equal(
      snapshot.scope.status,
      "exact"
    );
    assert.equal(
      snapshot.cost
        .integrityStatus,
      "complete"
    );
    assert.equal(
      snapshot.temporalPriceEvidence
        .status,
      "complete"
    );
    assert.equal(
      snapshot.temporalPriceEvidence
        .totalsReconcile,
      true
    );
    assert.equal(
      validateStayOfferIntegritySnapshotV3(
        snapshot
      ).valid,
      true
    );
  }
);

test(
  "partial nightly evidence stays partial rather than pretending to cover the trip",
  () => {
    const snapshot =
      createStayOfferIntegritySnapshotV3(
        createInput({
          nightlyPrices:
            COMPLETE_NIGHTS.slice(
              0,
              2
            ),
        })
      );

    assert.equal(
      snapshot.temporalPriceEvidence
        .status,
      "partial"
    );
    assert.equal(
      snapshot.temporalPriceEvidence
        .coveredNightCount,
      2
    );
    assert.equal(
      snapshot.temporalPriceEvidence
        .totalsReconcile,
      null
    );
  }
);

test(
  "duplicate nightly dates and a mismatched nightly total are invalid",
  () => {
    const duplicated =
      structuredClone(
        COMPLETE_NIGHTS
      );

    duplicated[3] = {
      ...duplicated[3],
      date:
        "2026-10-12",
    };

    const duplicateSnapshot =
      createStayOfferIntegritySnapshotV3(
        createInput({
          nightlyPrices:
            duplicated,
        })
      );

    assert.equal(
      duplicateSnapshot
        .temporalPriceEvidence
        .status,
      "invalid"
    );

    const mismatched =
      structuredClone(
        COMPLETE_NIGHTS
      );

    mismatched[3] = {
      ...mismatched[3],
      amount:
        101,
    };

    const mismatchSnapshot =
      createStayOfferIntegritySnapshotV3(
        createInput({
          nightlyPrices:
            mismatched,
        })
      );

    assert.equal(
      mismatchSnapshot
        .temporalPriceEvidence
        .status,
      "invalid"
    );
    assert.equal(
      validateStayOfferIntegritySnapshotV3(
        mismatchSnapshot
      ).valid,
      false
    );
  }
);

test(
  "semantic offer deduplication is deterministic and ignores source offer IDs",
  () => {
    const first =
      createStayOfferIntegritySnapshotV3(
        createInput({
          offerId:
            "offer-a",
          evidenceIds: [
            "evidence-a",
          ],
        })
      );

    const second =
      createStayOfferIntegritySnapshotV3(
        createInput({
          offerId:
            "offer-b",
          evidenceIds: [
            "evidence-b",
          ],
        })
      );

    assert.equal(
      first.canonicalOfferKey,
      second.canonicalOfferKey
    );
    assert.notEqual(
      first.snapshotId,
      second.snapshotId
    );

    const forward =
      deduplicateStayOfferSnapshotsV3([
        first,
        second,
      ]);

    const reverse =
      deduplicateStayOfferSnapshotsV3([
        second,
        first,
      ]);

    assert.equal(
      forward.length,
      1
    );
    assert.deepEqual(
      forward,
      reverse
    );
  }
);

test(
  "complete compatible nightly evidence enables offline temporal evaluation only",
  () => {
    const snapshots = [
      createStayOfferIntegritySnapshotV3(
        createInput({
          hotelId:
            "hotel-a",
        })
      ),
      createStayOfferIntegritySnapshotV3(
        createInput({
          hotelId:
            "hotel-b",
          offerId:
            "offer-b",
        })
      ),
    ];

    const coverage =
      createStayIntegrityCoverageReportV3({
        analyzedHotelCount:
          2,
        snapshots,
        publicRatesConsistency:
          "unverified",
      });

    assert.equal(
      coverage.offlineTemporalEvaluation,
      "ready"
    );
    assert.equal(
      coverage.publicV3Promotion,
      "blocked"
    );
    assert.equal(
      coverage.publicSplitPromotion,
      "blocked"
    );
    assert.equal(
      coverage.reasonCodes.includes(
        "integrity:public-rates-unverified"
      ),
      true
    );
  }
);

test(
  "verified public-rate consistency is mandatory for public V3 and Split promotion",
  () => {
    const snapshots = [
      createStayOfferIntegritySnapshotV3(
        createInput({
          hotelId:
            "hotel-a",
        })
      ),
      createStayOfferIntegritySnapshotV3(
        createInput({
          hotelId:
            "hotel-b",
          offerId:
            "offer-b",
        })
      ),
    ];

    const verified =
      createStayIntegrityCoverageReportV3({
        analyzedHotelCount:
          2,
        snapshots,
        publicRatesConsistency:
          "verified",
      });

    assert.equal(
      verified.publicV3Promotion,
      "ready"
    );
    assert.equal(
      verified.publicSplitPromotion,
      "ready"
    );

    const failed =
      createStayIntegrityCoverageReportV3({
        analyzedHotelCount:
          2,
        snapshots,
        publicRatesConsistency:
          "failed",
      });

    assert.equal(
      failed.publicV3Promotion,
      "blocked"
    );
    assert.equal(
      failed.publicSplitPromotion,
      "blocked"
    );
  }
);

test(
  "recheck ignores changed provenance timestamps when the offer semantics are identical",
  () => {
    const original =
      createStayOfferIntegritySnapshotV3(
        createInput({
          observedAt:
            "2026-08-14T00:00:00.000Z",
          evidenceIds: [
            "search-evidence",
          ],
        })
      );

    const confirmed =
      createStayOfferIntegritySnapshotV3(
        createInput({
          observedAt:
            "2026-08-14T00:05:00.000Z",
          evidenceIds: [
            "recheck-evidence",
          ],
        })
      );

    const diff =
      compareStayOfferRecheckV3(
        original,
        confirmed
      );

    assert.equal(
      diff.state,
      "confirmed"
    );
    assert.equal(
      diff.requiresDecisionReplay,
      false
    );
    assert.deepEqual(
      diff.materialChangedFields,
      []
    );
  }
);

test(
  "price, room and cancellation changes require confirmation and deterministic decision replay",
  () => {
    const original =
      createStayOfferIntegritySnapshotV3(
        createInput()
      );

    const changedInput =
      createInput({
        amount:
          430,
        roomName:
          "Twin room",
        refundable:
          false,
        nightlyPrices: [
          {
            ...COMPLETE_NIGHTS[0],
            amount:
              100,
          },
          {
            ...COMPLETE_NIGHTS[1],
            amount:
              110,
          },
          {
            ...COMPLETE_NIGHTS[2],
            amount:
              110,
          },
          {
            ...COMPLETE_NIGHTS[3],
            amount:
              110,
          },
        ],
      });

    changedInput.cancellation
      .freeCancellationUntil =
      null;

    const changed =
      createStayOfferIntegritySnapshotV3(
        changedInput
      );

    const diff =
      compareStayOfferRecheckV3(
        original,
        changed
      );

    assert.equal(
      diff.state,
      "changed"
    );
    assert.equal(
      diff.requiresUserConfirmation,
      true
    );
    assert.equal(
      diff.requiresDecisionReplay,
      true
    );
    assert.deepEqual(
      diff.materialChangedFields,
      [
        "cancellation",
        "room",
        "temporalPriceEvidence",
        "totalCost.amount",
      ]
    );
  }
);

test(
  "sold-out recheck requires a new decision and missing recheck evidence stays pending",
  () => {
    const original =
      createStayOfferIntegritySnapshotV3(
        createInput()
      );

    const soldOut =
      createStayOfferIntegritySnapshotV3(
        createInput({
          bookable:
            false,
        })
      );

    const soldOutDiff =
      compareStayOfferRecheckV3(
        original,
        soldOut
      );

    assert.equal(
      soldOutDiff.state,
      "sold-out"
    );
    assert.equal(
      soldOutDiff.requiresDecisionReplay,
      true
    );

    const pending =
      compareStayOfferRecheckV3(
        original,
        null
      );

    assert.equal(
      pending.state,
      "recheck-required"
    );
    assert.equal(
      pending.requiresDecisionReplay,
      false
    );
  }
);

test(
  "integrity fingerprints detect post-canonicalization mutation",
  () => {
    const snapshot =
      createStayOfferIntegritySnapshotV3(
        createInput()
      );

    const mutated =
      structuredClone(
        snapshot
      );

    mutated.cost.total.amount =
      999;

    const validation =
      validateStayOfferIntegritySnapshotV3(
        mutated
      );

    assert.equal(
      validation.valid,
      false
    );
    assert.equal(
      validation.issues.some(
        (issue) =>
          issue.code ===
          "offer-integrity-fingerprint-mismatch"
      ),
      true
    );
  }
);
