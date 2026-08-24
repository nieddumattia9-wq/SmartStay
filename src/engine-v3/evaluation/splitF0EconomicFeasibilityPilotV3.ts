export const SPLIT_F0_SCENARIO_MATRIX_VERSION_V1 =
  "stayopti.split-f0.scenario-matrix@1" as const;

export const SPLIT_F0_SUPPORTED_DURATIONS_V1 = [
  5,
  7,
  10,
  12,
  14,
  21,
  28,
  30,
] as const;

export const SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1 = [
  0,
  25,
  50,
  75,
  100,
  150,
] as const;

export type SplitF0SupportedDurationV1 =
  typeof SPLIT_F0_SUPPORTED_DURATIONS_V1[number];

export type SplitF0FrictionSensitivityEurV1 =
  typeof SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1[number];

export type SplitF0BoardClassV1 =
  | "room-only"
  | "breakfast-included"
  | "half-board"
  | "full-board"
  | "all-inclusive"
  | "unknown";

export type SplitF0CancellationClassV1 =
  | "fully-refundable"
  | "partially-refundable"
  | "non-refundable"
  | "unknown";

export type SplitF0PaymentTimingV1 =
  | "pay-now"
  | "pay-later"
  | "pay-at-property"
  | "unknown";

export type SplitF0RoomClassV1 =
  | "standard"
  | "superior"
  | "suite"
  | "apartment"
  | "other"
  | "unknown";

export type SplitF0ComparabilityIssueV1 =
  | "scenario-invalid"
  | "segment-coverage-invalid"
  | "single-period-invalid"
  | "split-period-invalid"
  | "date-data-missing"
  | "currency-mismatch"
  | "occupancy-mismatch"
  | "board-incompatible"
  | "cancellation-incompatible"
  | "payment-incompatible"
  | "room-class-incompatible"
  | "total-cost-incomplete"
  | "unknown-taxes-or-mandatory-costs"
  | "quality-floor-not-met"
  | "review-evidence-floor-not-met"
  | "location-constraint-not-met"
  | "duplicate-hotel"
  | "rate-stale-or-unknown"
  | "offer-not-bookable"
  | "provenance-incomplete";

export type SplitF0EconomicSignalV1 =
  | "NO_COMPARABLE_DATA"
  | "NO_GROSS_SAVING"
  | "POSITIVE_BELOW_50"
  | "POSITIVE_50_TO_149"
  | "POSITIVE_150_TO_299"
  | "POSITIVE_300_PLUS";

export interface SplitF0OccupancyV1 {
  adults: number;
  childAges: number[];
  rooms: 1;
  pets: 0;
}

export interface SplitF0ScenarioV1 {
  schemaVersion: typeof SPLIT_F0_SCENARIO_MATRIX_VERSION_V1;
  scenarioId: string;
  purpose: "technical-calibration-and-initial-signal-search";
  destination: {
    canonicalId: string;
    label: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    providerDestinationIds: [];
  };
  checkIn: string;
  checkOut: string;
  nights: SplitF0SupportedDurationV1;
  currency: "EUR";
  guestNationality: "IT";
  occupancy: SplitF0OccupancyV1;
  constraints: {
    maximumDistanceKm: number;
    minimumRating: number;
    minimumReviewCount: number;
  };
  splitPoints: [
    {
      splitPointId: string;
      nightsFromStart: number;
      rationale: "near-half";
    },
    {
      splitPointId: string;
      nightsFromStart: number;
      rationale: "weekly-or-weekend-boundary";
    },
  ];
  providerOfferIdsFrozen: false;
  sandboxMarketEvidence: false;
  publicRecommendationAllowed: false;
}

export interface SplitF0ScenarioMatrixV1 {
  schemaVersion: typeof SPLIT_F0_SCENARIO_MATRIX_VERSION_V1;
  sourceSha: string;
  purpose: "technical-calibration-and-initial-signal-search";
  representativeMarketSample: false;
  providerNeutral: true;
  networkRequired: false;
  prebookAllowed: false;
  bookingAllowed: false;
  paymentAllowed: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  publicSplitEnabled: false;
  scenarios: SplitF0ScenarioV1[];
}

export interface SplitF0SegmentV1 {
  ordinal: 0 | 1;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: "EUR";
  occupancy: SplitF0OccupancyV1;
}

export interface SplitF0OfferSnapshotV1 {
  offerSnapshotId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  occupancy: SplitF0OccupancyV1;
  currency: string;
  totalCost: number;
  totalCostCompleteness: "complete" | "incomplete";
  taxes: "included" | "excluded-known-in-total" | "unknown";
  mandatoryCosts: "included" | "known-zero" | "unknown";
  boardClass: SplitF0BoardClassV1;
  cancellationClass: SplitF0CancellationClassV1;
  paymentTiming: SplitF0PaymentTimingV1;
  roomClass: SplitF0RoomClassV1;
  rating: number | null;
  reviewCount: number | null;
  distanceKm: number | null;
  bookable: boolean;
  freshness: "fresh" | "stale" | "unknown";
  provenance: {
    sourceKind:
      | "synthetic-contract-fixture"
      | "sandbox-read-only"
      | "production-read-only";
    captureId: string;
    observedAt: string;
    contentDigest: string;
  };
}

export interface SplitF0ComparabilityBucketV1 {
  currency: string;
  occupancy: string;
  boardClass: Exclude<SplitF0BoardClassV1, "unknown">;
  cancellationClass: Exclude<SplitF0CancellationClassV1, "unknown">;
  paymentTiming: Exclude<SplitF0PaymentTimingV1, "unknown">;
  totalCostCompleteness: "complete";
  minimumRating: number;
  minimumReviewCount: number;
  maximumDistanceKm: number;
  roomClass: SplitF0RoomClassV1;
}

export interface SplitF0ComparabilityResultV1 {
  comparable: boolean;
  bucket: SplitF0ComparabilityBucketV1 | null;
  issues: SplitF0ComparabilityIssueV1[];
}

export interface SplitF0FrictionSensitivityResultV1 {
  hypotheticalFrictionEur: SplitF0FrictionSensitivityEurV1;
  netSavingAtFriction: number;
}

export interface SplitF0ComparisonResultV1 {
  scenarioId: string;
  splitPointId: string;
  technicalValidity: boolean;
  comparability: "COMPARABLE" | "NO_COMPARABLE_DATA";
  issues: string[];
  bucket: SplitF0ComparabilityBucketV1 | null;
  singleOfferSnapshotId: string | null;
  splitOfferSnapshotIds: [string, string] | null;
  singleTotal: number | null;
  splitTotal: number | null;
  grossSavingAmount: number | null;
  grossSavingRatio: number | null;
  frictionSensitivity: SplitF0FrictionSensitivityResultV1[];
  economicSignal: SplitF0EconomicSignalV1;
  evidenceLimits: string[];
  publicRecommendationProduced: false;
}

export interface SplitF0EconomicEvaluationInputV1 {
  scenario: SplitF0ScenarioV1;
  splitPointId: string;
  singleStayOffers: SplitF0OfferSnapshotV1[];
  firstSegmentOffers: SplitF0OfferSnapshotV1[];
  secondSegmentOffers: SplitF0OfferSnapshotV1[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const CONTENT_DIGEST = /^sha256:[0-9a-f]{64}$/;
const OPAQUE_ID = /^[a-z0-9][a-z0-9._:-]{2,127}$/;

function parseIsoDate(value: string): number | null {
  if (!ISO_DATE.test(value)) {
    return null;
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}

function addUtcDays(value: string, days: number): string {
  const timestamp = parseIsoDate(value);
  if (timestamp === null) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return new Date(timestamp + days * 86_400_000).toISOString().slice(0, 10);
}

function daysBetween(checkIn: string, checkOut: string): number | null {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  if (start === null || end === null) {
    return null;
  }
  return (end - start) / 86_400_000;
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

function occupancyKey(occupancy: SplitF0OccupancyV1): string {
  return `${occupancy.adults}:${occupancy.childAges.join(",")}:${occupancy.rooms}:${occupancy.pets}`;
}

function sameOccupancy(
  left: SplitF0OccupancyV1,
  right: SplitF0OccupancyV1
): boolean {
  return occupancyKey(left) === occupancyKey(right);
}

export function validateSplitF0ScenarioV1(
  scenario: SplitF0ScenarioV1
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (scenario.schemaVersion !== SPLIT_F0_SCENARIO_MATRIX_VERSION_V1) {
    issues.push("scenario-schema-version-invalid");
  }
  if (!OPAQUE_ID.test(scenario.scenarioId)) {
    issues.push("scenario-id-invalid");
  }
  if (scenario.purpose !== "technical-calibration-and-initial-signal-search") {
    issues.push("scenario-purpose-invalid");
  }
  if (
    !OPAQUE_ID.test(scenario.destination.canonicalId) ||
    scenario.destination.label.trim().length === 0 ||
    !/^[A-Z]{2}$/.test(scenario.destination.countryCode) ||
    !Number.isFinite(scenario.destination.latitude) ||
    scenario.destination.latitude < -90 ||
    scenario.destination.latitude > 90 ||
    !Number.isFinite(scenario.destination.longitude) ||
    scenario.destination.longitude < -180 ||
    scenario.destination.longitude > 180 ||
    scenario.destination.providerDestinationIds.length !== 0
  ) {
    issues.push("scenario-destination-invalid");
  }
  const duration = daysBetween(scenario.checkIn, scenario.checkOut);
  if (
    duration !== scenario.nights ||
    !SPLIT_F0_SUPPORTED_DURATIONS_V1.includes(scenario.nights)
  ) {
    issues.push("scenario-duration-invalid");
  }
  if (scenario.currency !== "EUR" || scenario.guestNationality !== "IT") {
    issues.push("scenario-market-contract-invalid");
  }
  if (
    !Number.isInteger(scenario.occupancy.adults) ||
    scenario.occupancy.adults < 1 ||
    scenario.occupancy.adults > 2 ||
    scenario.occupancy.childAges.length !== 0 ||
    scenario.occupancy.rooms !== 1 ||
    scenario.occupancy.pets !== 0
  ) {
    issues.push("scenario-occupancy-invalid");
  }
  if (
    !Number.isFinite(scenario.constraints.maximumDistanceKm) ||
    scenario.constraints.maximumDistanceKm <= 0 ||
    !Number.isFinite(scenario.constraints.minimumRating) ||
    scenario.constraints.minimumRating <= 0 ||
    !Number.isInteger(scenario.constraints.minimumReviewCount) ||
    scenario.constraints.minimumReviewCount <= 0
  ) {
    issues.push("scenario-constraints-invalid");
  }
  if (
    scenario.splitPoints.length !== 2 ||
    new Set(scenario.splitPoints.map((point) => point.splitPointId)).size !== 2 ||
    new Set(scenario.splitPoints.map((point) => point.nightsFromStart)).size !== 2 ||
    scenario.splitPoints[0]?.rationale !== "near-half" ||
    scenario.splitPoints[1]?.rationale !== "weekly-or-weekend-boundary" ||
    scenario.splitPoints.some(
      (point) =>
        !OPAQUE_ID.test(point.splitPointId) ||
        !Number.isInteger(point.nightsFromStart) ||
        point.nightsFromStart < 2 ||
        scenario.nights - point.nightsFromStart < 2
    )
  ) {
    issues.push("scenario-split-points-invalid");
  }
  if (
    scenario.providerOfferIdsFrozen !== false ||
    scenario.sandboxMarketEvidence !== false ||
    scenario.publicRecommendationAllowed !== false
  ) {
    issues.push("scenario-boundary-invalid");
  }
  return {
    valid: issues.length === 0,
    issues: uniqueSorted(issues),
  };
}

export function buildSplitF0SegmentsV1(
  scenario: SplitF0ScenarioV1,
  splitPointId: string
): [SplitF0SegmentV1, SplitF0SegmentV1] {
  const validation = validateSplitF0ScenarioV1(scenario);
  if (!validation.valid) {
    throw new Error(`Split F0 scenario invalid: ${validation.issues.join(",")}`);
  }
  const splitPoint = scenario.splitPoints.find(
    (candidate) => candidate.splitPointId === splitPointId
  );
  if (splitPoint === undefined) {
    throw new Error(`Unknown Split F0 split point: ${splitPointId}`);
  }
  const boundary = addUtcDays(scenario.checkIn, splitPoint.nightsFromStart);
  return [
    {
      ordinal: 0,
      checkIn: scenario.checkIn,
      checkOut: boundary,
      nights: splitPoint.nightsFromStart,
      currency: scenario.currency,
      occupancy: scenario.occupancy,
    },
    {
      ordinal: 1,
      checkIn: boundary,
      checkOut: scenario.checkOut,
      nights: scenario.nights - splitPoint.nightsFromStart,
      currency: scenario.currency,
      occupancy: scenario.occupancy,
    },
  ];
}

function validateOfferForPeriod(
  scenario: SplitF0ScenarioV1,
  offer: SplitF0OfferSnapshotV1,
  period: Pick<SplitF0SegmentV1, "checkIn" | "checkOut" | "nights">,
  periodIssue: "single-period-invalid" | "split-period-invalid"
): SplitF0ComparabilityIssueV1[] {
  const issues: SplitF0ComparabilityIssueV1[] = [];
  if (
    parseIsoDate(offer.checkIn) === null ||
    parseIsoDate(offer.checkOut) === null ||
    offer.checkIn !== period.checkIn ||
    offer.checkOut !== period.checkOut ||
    offer.nights !== period.nights ||
    daysBetween(offer.checkIn, offer.checkOut) !== offer.nights
  ) {
    issues.push(periodIssue, "date-data-missing");
  }
  if (
    !OPAQUE_ID.test(offer.offerSnapshotId) ||
    !OPAQUE_ID.test(offer.propertyId)
  ) {
    issues.push("provenance-incomplete");
  }
  if (offer.currency !== scenario.currency) {
    issues.push("currency-mismatch");
  }
  if (!sameOccupancy(offer.occupancy, scenario.occupancy)) {
    issues.push("occupancy-mismatch");
  }
  if (
    !Number.isFinite(offer.totalCost) ||
    offer.totalCost <= 0 ||
    offer.totalCostCompleteness !== "complete"
  ) {
    issues.push("total-cost-incomplete");
  }
  if (
    offer.taxes === "unknown" ||
    offer.mandatoryCosts === "unknown"
  ) {
    issues.push("unknown-taxes-or-mandatory-costs");
  }
  if (offer.boardClass === "unknown") {
    issues.push("board-incompatible");
  }
  if (offer.cancellationClass === "unknown") {
    issues.push("cancellation-incompatible");
  }
  if (offer.paymentTiming === "unknown") {
    issues.push("payment-incompatible");
  }
  if (offer.rating === null || offer.rating < scenario.constraints.minimumRating) {
    issues.push("quality-floor-not-met");
  }
  if (
    offer.reviewCount === null ||
    offer.reviewCount < scenario.constraints.minimumReviewCount
  ) {
    issues.push("review-evidence-floor-not-met");
  }
  if (
    offer.distanceKm === null ||
    offer.distanceKm > scenario.constraints.maximumDistanceKm
  ) {
    issues.push("location-constraint-not-met");
  }
  if (offer.freshness !== "fresh") {
    issues.push("rate-stale-or-unknown");
  }
  if (!offer.bookable) {
    issues.push("offer-not-bookable");
  }
  if (
    !OPAQUE_ID.test(offer.provenance.captureId) ||
    !ISO_TIMESTAMP.test(offer.provenance.observedAt) ||
    !CONTENT_DIGEST.test(offer.provenance.contentDigest)
  ) {
    issues.push("provenance-incomplete");
  }
  return uniqueSorted(issues);
}

function roomsCompatible(
  single: SplitF0OfferSnapshotV1,
  split: SplitF0OfferSnapshotV1
): boolean {
  return (
    single.roomClass === "unknown" ||
    split.roomClass === "unknown" ||
    single.roomClass === split.roomClass
  );
}

export function classifySplitF0OfferComparabilityV1(
  scenario: SplitF0ScenarioV1,
  segments: readonly [SplitF0SegmentV1, SplitF0SegmentV1],
  singleOffer: SplitF0OfferSnapshotV1,
  splitOffers: readonly [SplitF0OfferSnapshotV1, SplitF0OfferSnapshotV1]
): SplitF0ComparabilityResultV1 {
  const issues: SplitF0ComparabilityIssueV1[] = [];
  if (!validateSplitF0ScenarioV1(scenario).valid) {
    issues.push("scenario-invalid");
  }
  if (
    segments[0].checkIn !== scenario.checkIn ||
    segments[0].checkOut !== segments[1].checkIn ||
    segments[1].checkOut !== scenario.checkOut ||
    segments[0].nights < 2 ||
    segments[1].nights < 2 ||
    segments[0].nights + segments[1].nights !== scenario.nights
  ) {
    issues.push("segment-coverage-invalid");
  }
  issues.push(
    ...validateOfferForPeriod(
      scenario,
      singleOffer,
      scenario,
      "single-period-invalid"
    ),
    ...validateOfferForPeriod(
      scenario,
      splitOffers[0],
      segments[0],
      "split-period-invalid"
    ),
    ...validateOfferForPeriod(
      scenario,
      splitOffers[1],
      segments[1],
      "split-period-invalid"
    )
  );
  if (splitOffers[0].propertyId === splitOffers[1].propertyId) {
    issues.push("duplicate-hotel");
  }
  for (const splitOffer of splitOffers) {
    if (splitOffer.currency !== singleOffer.currency) {
      issues.push("currency-mismatch");
    }
    if (!sameOccupancy(splitOffer.occupancy, singleOffer.occupancy)) {
      issues.push("occupancy-mismatch");
    }
    if (splitOffer.boardClass !== singleOffer.boardClass) {
      issues.push("board-incompatible");
    }
    if (splitOffer.cancellationClass !== singleOffer.cancellationClass) {
      issues.push("cancellation-incompatible");
    }
    if (splitOffer.paymentTiming !== singleOffer.paymentTiming) {
      issues.push("payment-incompatible");
    }
    if (!roomsCompatible(singleOffer, splitOffer)) {
      issues.push("room-class-incompatible");
    }
  }
  const normalizedIssues = uniqueSorted(issues);
  if (normalizedIssues.length > 0) {
    return {
      comparable: false,
      bucket: null,
      issues: normalizedIssues,
    };
  }
  return {
    comparable: true,
    bucket: {
      currency: singleOffer.currency,
      occupancy: occupancyKey(singleOffer.occupancy),
      boardClass: singleOffer.boardClass as Exclude<SplitF0BoardClassV1, "unknown">,
      cancellationClass: singleOffer.cancellationClass as Exclude<
        SplitF0CancellationClassV1,
        "unknown"
      >,
      paymentTiming: singleOffer.paymentTiming as Exclude<
        SplitF0PaymentTimingV1,
        "unknown"
      >,
      totalCostCompleteness: "complete",
      minimumRating: scenario.constraints.minimumRating,
      minimumReviewCount: scenario.constraints.minimumReviewCount,
      maximumDistanceKm: scenario.constraints.maximumDistanceKm,
      roomClass: singleOffer.roomClass,
    },
    issues: [],
  };
}

function bucketKey(bucket: SplitF0ComparabilityBucketV1): string {
  return JSON.stringify(bucket);
}

function economicSignal(grossSavingAmount: number): SplitF0EconomicSignalV1 {
  if (grossSavingAmount <= 0) {
    return "NO_GROSS_SAVING";
  }
  if (grossSavingAmount < 50) {
    return "POSITIVE_BELOW_50";
  }
  if (grossSavingAmount < 150) {
    return "POSITIVE_50_TO_149";
  }
  if (grossSavingAmount < 300) {
    return "POSITIVE_150_TO_299";
  }
  return "POSITIVE_300_PLUS";
}

function noComparableResult(
  scenarioId: string,
  splitPointId: string,
  issues: readonly string[],
  technicalValidity: boolean
): SplitF0ComparisonResultV1 {
  return {
    scenarioId,
    splitPointId,
    technicalValidity,
    comparability: "NO_COMPARABLE_DATA",
    issues: uniqueSorted(issues),
    bucket: null,
    singleOfferSnapshotId: null,
    splitOfferSnapshotIds: null,
    singleTotal: null,
    splitTotal: null,
    grossSavingAmount: null,
    grossSavingRatio: null,
    frictionSensitivity: [],
    economicSignal: "NO_COMPARABLE_DATA",
    evidenceLimits: [
      "calibration-set-not-market-evidence",
      "no-public-or-policy-use",
    ],
    publicRecommendationProduced: false,
  };
}

export function evaluateSplitF0EconomicOpportunityV1(
  input: SplitF0EconomicEvaluationInputV1
): SplitF0ComparisonResultV1 {
  const scenarioValidation = validateSplitF0ScenarioV1(input.scenario);
  if (!scenarioValidation.valid) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      scenarioValidation.issues,
      false
    );
  }
  let segments: [SplitF0SegmentV1, SplitF0SegmentV1];
  try {
    segments = buildSplitF0SegmentsV1(input.scenario, input.splitPointId);
  }
  catch (caught) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      [caught instanceof Error ? caught.message : String(caught)],
      false
    );
  }
  const candidates: Array<{
    single: SplitF0OfferSnapshotV1;
    split: [SplitF0OfferSnapshotV1, SplitF0OfferSnapshotV1];
    bucket: SplitF0ComparabilityBucketV1;
    splitTotal: number;
    grossSavingAmount: number;
  }> = [];
  const rejectedIssues: SplitF0ComparabilityIssueV1[] = [];
  for (const first of input.firstSegmentOffers) {
    for (const second of input.secondSegmentOffers) {
      for (const single of input.singleStayOffers) {
        const classification = classifySplitF0OfferComparabilityV1(
          input.scenario,
          segments,
          single,
          [first, second]
        );
        if (!classification.comparable || classification.bucket === null) {
          rejectedIssues.push(...classification.issues);
          continue;
        }
        const splitTotal = first.totalCost + second.totalCost;
        candidates.push({
          single,
          split: [first, second],
          bucket: classification.bucket,
          splitTotal,
          grossSavingAmount: single.totalCost - splitTotal,
        });
      }
    }
  }
  if (candidates.length === 0) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      rejectedIssues.length > 0 ? uniqueSorted(rejectedIssues) : ["no-offers"],
      true
    );
  }
  const cheapestSingleByBucket = new Map<string, number>();
  for (const candidate of candidates) {
    const key = bucketKey(candidate.bucket);
    const current = cheapestSingleByBucket.get(key);
    if (current === undefined || candidate.single.totalCost < current) {
      cheapestSingleByBucket.set(key, candidate.single.totalCost);
    }
  }
  const eligible = candidates.filter(
    (candidate) =>
      candidate.single.totalCost === cheapestSingleByBucket.get(bucketKey(candidate.bucket))
  );
  eligible.sort((left, right) =>
    right.grossSavingAmount - left.grossSavingAmount ||
    left.splitTotal - right.splitTotal ||
    left.single.offerSnapshotId.localeCompare(right.single.offerSnapshotId) ||
    left.split[0].offerSnapshotId.localeCompare(right.split[0].offerSnapshotId) ||
    left.split[1].offerSnapshotId.localeCompare(right.split[1].offerSnapshotId)
  );
  const selected = eligible[0];
  if (selected === undefined) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      ["no-cheapest-single-baseline"],
      true
    );
  }
  return {
    scenarioId: input.scenario.scenarioId,
    splitPointId: input.splitPointId,
    technicalValidity: true,
    comparability: "COMPARABLE",
    issues: [],
    bucket: selected.bucket,
    singleOfferSnapshotId: selected.single.offerSnapshotId,
    splitOfferSnapshotIds: [
      selected.split[0].offerSnapshotId,
      selected.split[1].offerSnapshotId,
    ],
    singleTotal: selected.single.totalCost,
    splitTotal: selected.splitTotal,
    grossSavingAmount: selected.grossSavingAmount,
    grossSavingRatio: selected.grossSavingAmount / selected.single.totalCost,
    frictionSensitivity: SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1.map(
      (hypotheticalFrictionEur) => ({
        hypotheticalFrictionEur,
        netSavingAtFriction: selected.grossSavingAmount - hypotheticalFrictionEur,
      })
    ),
    economicSignal: economicSignal(selected.grossSavingAmount),
    evidenceLimits: [
      "calibration-set-not-market-evidence",
      "hypothetical-friction-not-scientifically-calibrated",
      "production-read-only-results-required-for-economic-feasibility",
      "no-public-or-policy-use",
    ],
    publicRecommendationProduced: false,
  };
}
