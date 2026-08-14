import type {
  SmartStayReasonCodeV3,
} from "../contract/reasonCodesV3";

import {
  uniqueReasonCodesV3,
} from "../contract/reasonCodesV3";

import type {
  StayOfferIntegritySnapshotV3,
} from "./stayOfferIntegrityV3";

export type StayPublicRatesConsistencyV3 =
  | "unverified"
  | "verified"
  | "not-applicable"
  | "failed";

export type StayIntegrityGateStatusV3 =
  | "ready"
  | "blocked";

export interface StayIntegrityCoverageRatioV3 {
  numerator:
    number;

  denominator:
    number;

  ratio:
    number;
}

export interface StayIntegrityCoverageReportV3 {
  scopeLabel:
    "current-search-result-set";

  analyzedHotelCount:
    number;

  mappedHotelCount:
    number;

  offerSnapshotCount:
    number;

  exactStayScopeCount:
    number;

  knownTotalCostCount:
    number;

  completeCostIntegrityCount:
    number;

  knownTaxCount:
    number;

  knownOrNotApplicableFeeCount:
    number;

  canonicalRoomCount:
    number;

  canonicalCancellationCount:
    number;

  canonicalPaymentCount:
    number;

  searchBookableCount:
    number;

  recheckRequiredCount:
    number;

  completeNightlyEvidenceCount:
    number;

  decisionReadySnapshotCount:
    number;

  invalidIntegrityCount:
    number;

  duplicateCanonicalOfferCount:
    number;

  stayScopeCoverage:
    StayIntegrityCoverageRatioV3;

  totalCostCoverage:
    StayIntegrityCoverageRatioV3;

  nightlyEvidenceCoverage:
    StayIntegrityCoverageRatioV3;

  publicRatesConsistency:
    StayPublicRatesConsistencyV3;

  offlineTemporalEvaluation:
    StayIntegrityGateStatusV3;

  publicV3Promotion:
    StayIntegrityGateStatusV3;

  publicSplitPromotion:
    StayIntegrityGateStatusV3;

  reasonCodes:
    SmartStayReasonCodeV3[];
}

export interface CreateStayIntegrityCoverageReportInputV3 {
  analyzedHotelCount:
    number;

  snapshots:
    readonly StayOfferIntegritySnapshotV3[];

  publicRatesConsistency:
    StayPublicRatesConsistencyV3;
}

function ratio(
  numerator:
    number,
  denominator:
    number
): StayIntegrityCoverageRatioV3 {
  return {
    numerator,
    denominator,
    ratio:
      denominator ===
        0
        ? 0
        : Number(
            (
              numerator /
              denominator
            ).toFixed(
              6
            )
          ),
  };
}

function shareSameStayScope(
  first:
    StayOfferIntegritySnapshotV3,
  second:
    StayOfferIntegritySnapshotV3
) {
  return first.scope.status ===
      "exact" &&
    second.scope.status ===
      "exact" &&
    first.scope.checkIn ===
      second.scope.checkIn &&
    first.scope.checkOut ===
      second.scope.checkOut &&
    first.scope.nights ===
      second.scope.nights &&
    first.scope.adults ===
      second.scope.adults &&
    first.scope.children ===
      second.scope.children &&
    first.scope.rooms ===
      second.scope.rooms;
}

function hasCompatibleTemporalPair(
  snapshots:
    readonly StayOfferIntegritySnapshotV3[]
) {
  const eligible =
    snapshots.filter(
      (snapshot) =>
        snapshot.temporalPriceEvidence
          .status ===
          "complete" &&
        snapshot.cost
          .integrityStatus ===
          "complete" &&
        snapshot.room.state ===
          "known" &&
        snapshot.cancellation
          .state ===
          "known" &&
        snapshot.payment.state ===
          "known" &&
        snapshot.bookability
          .searchBookable ===
          true &&
        snapshot.cost.total
          .amount !==
          null &&
        snapshot.cost.total
          .currency !==
          null
    );

  for (
    let firstIndex = 0;
    firstIndex <
      eligible.length;
    firstIndex +=
      1
  ) {
    for (
      let secondIndex =
        firstIndex +
        1;
      secondIndex <
        eligible.length;
      secondIndex +=
        1
    ) {
      const first =
        eligible[
          firstIndex
        ];

      const second =
        eligible[
          secondIndex
        ];

      if (
        first &&
        second &&
        first.hotelId !==
          second.hotelId &&
        first.cost.total
          .currency ===
          second.cost.total
            .currency &&
        shareSameStayScope(
          first,
          second
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function createStayIntegrityCoverageReportV3(
  input:
    CreateStayIntegrityCoverageReportInputV3
): StayIntegrityCoverageReportV3 {
  const snapshots = [
    ...input.snapshots,
  ].sort(
    (
      first,
      second
    ) =>
      first.snapshotId.localeCompare(
        second.snapshotId
      )
  );

  const analyzedHotelCount =
    Number.isInteger(
      input.analyzedHotelCount
    ) &&
    input.analyzedHotelCount >=
      0
      ? input.analyzedHotelCount
      : 0;

  const mappedHotelCount =
    new Set(
      snapshots.map(
        (snapshot) =>
          snapshot.hotelId
      )
    ).size;

  const exactStayScopeCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.scope.status ===
          "exact"
    ).length;

  const knownTotalCostCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.cost.total
          .state ===
          "known"
    ).length;

  const completeCostIntegrityCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.cost
          .integrityStatus ===
          "complete"
    ).length;

  const knownTaxCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.cost.taxes
          .state ===
          "known"
    ).length;

  const knownOrNotApplicableFeeCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.cost.fees
          .state ===
          "known" ||
        snapshot.cost.fees
          .state ===
          "not-applicable"
    ).length;

  const canonicalRoomCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.room.state ===
          "known"
    ).length;

  const canonicalCancellationCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.cancellation
          .state ===
          "known"
    ).length;

  const canonicalPaymentCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.payment.state ===
          "known"
    ).length;

  const searchBookableCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.bookability
          .searchBookable ===
          true
    ).length;

  const recheckRequiredCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.bookability
          .recheckRequired
    ).length;

  const completeNightlyEvidenceCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.temporalPriceEvidence
          .status ===
          "complete"
    ).length;

  const decisionReadySnapshotCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.scope.status ===
          "exact" &&
        snapshot.cost
          .integrityStatus ===
          "complete" &&
        snapshot.room.state ===
          "known" &&
        snapshot.cancellation
          .state ===
          "known" &&
        snapshot.payment.state ===
          "known" &&
        snapshot.bookability
          .searchBookable ===
          true
    ).length;

  const invalidIntegrityCount =
    snapshots.filter(
      (snapshot) =>
        snapshot.scope.status ===
          "conflicting" ||
        snapshot.cost.integrityStatus ===
          "conflicting" ||
        snapshot.temporalPriceEvidence
          .status ===
          "invalid"
    ).length;

  const duplicateCanonicalOfferCount =
    snapshots.length -
    new Set(
      snapshots.map(
        (snapshot) =>
          snapshot.canonicalOfferKey
      )
    ).size;

  const compatibleTemporalPair =
    hasCompatibleTemporalPair(
      snapshots
    );

  const offlineTemporalEvaluation:
    StayIntegrityGateStatusV3 =
      compatibleTemporalPair
        ? "ready"
        : "blocked";

  const publicV3Ready =
    input.publicRatesConsistency ===
      "verified" &&
    decisionReadySnapshotCount >
      0 &&
    invalidIntegrityCount ===
      0;

  const publicV3Promotion:
    StayIntegrityGateStatusV3 =
      publicV3Ready
        ? "ready"
        : "blocked";

  const publicSplitPromotion:
    StayIntegrityGateStatusV3 =
      publicV3Ready &&
        compatibleTemporalPair
        ? "ready"
        : "blocked";

  const reasonCodes:
    SmartStayReasonCodeV3[] = [
      "integrity:coverage-computed",
    ];

  if (
    input.publicRatesConsistency ===
      "unverified"
  ) {
    reasonCodes.push(
      "integrity:public-rates-unverified"
    );
  }

  if (
    input.publicRatesConsistency ===
      "failed"
  ) {
    reasonCodes.push(
      "integrity:public-rates-failed"
    );
  }

  if (
    exactStayScopeCount <
      snapshots.length
  ) {
    reasonCodes.push(
      "integrity:scope-incomplete"
    );
  }

  if (
    completeCostIntegrityCount <
      snapshots.length
  ) {
    reasonCodes.push(
      "integrity:cost-incomplete"
    );
  }

  if (
    completeNightlyEvidenceCount <
      snapshots.length
  ) {
    reasonCodes.push(
      invalidIntegrityCount >
        0
        ? "integrity:nightly-prices-invalid"
        : "integrity:nightly-prices-not-provided"
    );
  }
  else if (
    snapshots.length >
      0
  ) {
    reasonCodes.push(
      "integrity:temporal-evidence-complete"
    );
  }

  if (
    !compatibleTemporalPair
  ) {
    reasonCodes.push(
      "integrity:compatible-temporal-pair-unavailable"
    );
  }

  if (
    recheckRequiredCount >
      0
  ) {
    reasonCodes.push(
      "integrity:availability-recheck-required"
    );
  }

  if (
    publicV3Promotion ===
      "blocked"
  ) {
    reasonCodes.push(
      "integrity:public-v3-promotion-blocked"
    );
  }

  if (
    publicSplitPromotion ===
      "blocked"
  ) {
    reasonCodes.push(
      "integrity:public-split-promotion-blocked"
    );
  }

  return {
    scopeLabel:
      "current-search-result-set",
    analyzedHotelCount,
    mappedHotelCount,
    offerSnapshotCount:
      snapshots.length,
    exactStayScopeCount,
    knownTotalCostCount,
    completeCostIntegrityCount,
    knownTaxCount,
    knownOrNotApplicableFeeCount,
    canonicalRoomCount,
    canonicalCancellationCount,
    canonicalPaymentCount,
    searchBookableCount,
    recheckRequiredCount,
    completeNightlyEvidenceCount,
    decisionReadySnapshotCount,
    invalidIntegrityCount,
    duplicateCanonicalOfferCount,
    stayScopeCoverage:
      ratio(
        exactStayScopeCount,
        snapshots.length
      ),
    totalCostCoverage:
      ratio(
        knownTotalCostCount,
        snapshots.length
      ),
    nightlyEvidenceCoverage:
      ratio(
        completeNightlyEvidenceCount,
        snapshots.length
      ),
    publicRatesConsistency:
      input.publicRatesConsistency,
    offlineTemporalEvaluation,
    publicV3Promotion,
    publicSplitPromotion,
    reasonCodes:
      uniqueReasonCodesV3(
        reasonCodes
      ),
  };
}
