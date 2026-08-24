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

export type SplitF0ComparabilityLevelV1 =
  | "STRICT_COMPARABLE"
  | "CONDITIONAL_COMPARABLE"
  | "NON_COMPARABLE";

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

export type SplitF0OutlierFlagV1 =
  | "PRICE_LEVEL_OUTLIER"
  | "SAVING_RATIO_OUTLIER"
  | "CROSS_CAPTURE_INSTABILITY";

export type SplitF0OutlierClassificationV1 =
  | "NONE"
  | SplitF0OutlierFlagV1
  | "MULTIPLE_FLAGS";

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
  paymentTiming: SplitF0PaymentTimingV1;
  totalCostCompleteness: "complete";
  minimumRating: number;
  minimumReviewCount: number;
  maximumDistanceKm: number;
  roomClass: SplitF0RoomClassV1;
}

export interface SplitF0ComparabilityResultV1 {
  comparable: boolean;
  comparabilityLevel: SplitF0ComparabilityLevelV1;
  bucket: SplitF0ComparabilityBucketV1 | null;
  issues: SplitF0ComparabilityIssueV1[];
  evidenceLimits: string[];
  knownIncompatibilities: SplitF0ComparabilityIssueV1[];
}

export interface SplitF0FrictionSensitivityResultV1 {
  hypotheticalFrictionEur: SplitF0FrictionSensitivityEurV1;
  netSavingAtFriction: number;
  netSavingAtFrictionMinorUnits: number;
  netSavingAtFrictionFormatted: string;
}

export interface SplitF0FixedBaselineBucketV1 {
  currency: string;
  occupancy: string;
  boardClass: SplitF0BoardClassV1;
  cancellationClass: SplitF0CancellationClassV1;
  paymentTiming: SplitF0PaymentTimingV1;
  roomClass: SplitF0RoomClassV1;
  totalCostCompleteness: "complete";
}

export interface SplitF0FixedSingleBaselineV1 {
  offerSnapshotId: string;
  total: number;
  totalMinorUnits: number;
  totalFormatted: string;
  perNight: number;
  perNightMinorUnits: number;
  perNightFormatted: string;
  bucket: SplitF0FixedBaselineBucketV1;
  evidenceLimits: string[];
  eligibleFullStayOfferCount: number;
  cheaperEligibleFullStayOfferCount: number;
  selectedPercentile: number;
  localMedianTotal: number;
  localMedianTotalMinorUnits: number;
  localMedianTotalFormatted: string;
}

export interface SplitF0OutlierAssessmentV1 {
  classification: SplitF0OutlierClassificationV1;
  flags: SplitF0OutlierFlagV1[];
  selectedPricePerNight: number | null;
  localMedianPricePerNight: number | null;
  selectedPercentile: number | null;
  grossSavingRatio: number | null;
  productionReconfirmationRequired: boolean;
}

export interface SplitF0MatchedBucketDiagnosticV1 {
  comparabilityLevel: Exclude<
    SplitF0ComparabilityLevelV1,
    "NON_COMPARABLE"
  >;
  bucket: SplitF0ComparabilityBucketV1;
  singleOfferSnapshotId: string;
  splitOfferSnapshotIds: [string, string];
  singleTotal: number;
  splitTotal: number;
  grossSavingAmount: number;
  grossSavingRatio: number;
  evidenceLimits: string[];
  outlierAssessment: SplitF0OutlierAssessmentV1;
}

export interface SplitF0ComparisonResultV1 {
  scenarioId: string;
  splitPointId: string;
  technicalValidity: boolean;
  comparability: "COMPARABLE" | "NO_COMPARABLE_DATA";
  comparabilityLevel: SplitF0ComparabilityLevelV1;
  issues: string[];
  knownIncompatibilities: string[];
  bucket: SplitF0ComparabilityBucketV1 | null;
  fixedBaseline: SplitF0FixedSingleBaselineV1 | null;
  baselineSelectionMode: "PRIMARY_FIXED_BEST_SINGLE";
  singleOfferSnapshotId: string | null;
  splitOfferSnapshotIds: [string, string] | null;
  singleTotal: number | null;
  singleTotalMinorUnits: number | null;
  singleTotalFormatted: string | null;
  splitTotal: number | null;
  splitTotalMinorUnits: number | null;
  splitTotalFormatted: string | null;
  grossSavingAmount: number | null;
  grossSavingMinorUnits: number | null;
  grossSavingAmountFormatted: string | null;
  grossSavingRatio: number | null;
  frictionSensitivity: SplitF0FrictionSensitivityResultV1[];
  economicSignal: SplitF0EconomicSignalV1;
  matchedBucketDiagnostic: SplitF0MatchedBucketDiagnosticV1 | null;
  outlierAssessment: SplitF0OutlierAssessmentV1;
  evidenceLimits: string[];
  publicRecommendationProduced: false;
}

export interface SplitF0EconomicEvaluationInputV1 {
  scenario: SplitF0ScenarioV1;
  splitPointId: string;
  singleStayOffers: SplitF0OfferSnapshotV1[];
  fixedSingleBaseline?: SplitF0OfferSnapshotV1 | null;
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

export function splitF0MoneyToMinorUnitsV1(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("split-f0-money-invalid");
  }
  const representation = value.toString();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(representation);
  if (match === null) {
    throw new Error("split-f0-money-precision-unsupported");
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const minorUnits = whole * 100 + fraction;
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error("split-f0-money-out-of-range");
  }
  return minorUnits;
}

export function splitF0MinorUnitsToMoneyV1(minorUnits: number): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error("split-f0-minor-units-invalid");
  }
  const sign = minorUnits < 0 ? "-" : "";
  const absolute = Math.abs(minorUnits);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function minorUnitsToNumber(minorUnits: number): number {
  return Number(splitF0MinorUnitsToMoneyV1(minorUnits));
}

function medianMinorUnits(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error("split-f0-median-empty");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
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
  let totalCostMinorUnits: number | null = null;
  try {
    totalCostMinorUnits = splitF0MoneyToMinorUnitsV1(offer.totalCost);
  }
  catch {
    totalCostMinorUnits = null;
  }
  if (
    totalCostMinorUnits === null ||
    totalCostMinorUnits <= 0 ||
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

const NON_ESSENTIAL_FIXED_BASELINE_ISSUES =
  new Set<SplitF0ComparabilityIssueV1>([
    "board-incompatible",
    "cancellation-incompatible",
  ]);

function eligibleFixedSingleOffers(
  scenario: SplitF0ScenarioV1,
  offers: readonly SplitF0OfferSnapshotV1[]
): SplitF0OfferSnapshotV1[] {
  return offers
    .filter((offer) =>
      validateOfferForPeriod(
        scenario,
        offer,
        scenario,
        "single-period-invalid"
      ).every((issue) => NON_ESSENTIAL_FIXED_BASELINE_ISSUES.has(issue))
    )
    .sort((left, right) =>
      splitF0MoneyToMinorUnitsV1(left.totalCost) -
        splitF0MoneyToMinorUnitsV1(right.totalCost) ||
      left.offerSnapshotId.localeCompare(right.offerSnapshotId)
    );
}

export function selectSplitF0FixedSingleBaselineV1(
  scenario: SplitF0ScenarioV1,
  offers: readonly SplitF0OfferSnapshotV1[]
): SplitF0OfferSnapshotV1 | null {
  return eligibleFixedSingleOffers(scenario, offers)[0] ?? null;
}

function fixedBaselineEvidenceLimits(
  offer: SplitF0OfferSnapshotV1
): string[] {
  const limits: string[] = [];
  if (offer.boardClass === "unknown") {
    limits.push("fixed-baseline-board-unknown");
  }
  if (offer.cancellationClass === "unknown") {
    limits.push("fixed-baseline-cancellation-unknown");
  }
  if (offer.paymentTiming === "unknown") {
    limits.push("payment-timing-unknown");
  }
  if (offer.roomClass === "unknown" || offer.roomClass === "other") {
    limits.push("fixed-baseline-room-class-incomplete");
  }
  return uniqueSorted(limits);
}

function summarizeFixedBaseline(
  scenario: SplitF0ScenarioV1,
  offers: readonly SplitF0OfferSnapshotV1[],
  selected: SplitF0OfferSnapshotV1
): SplitF0FixedSingleBaselineV1 {
  const eligible = eligibleFixedSingleOffers(scenario, offers);
  const selectedIndex = eligible.findIndex(
    (offer) => offer.offerSnapshotId === selected.offerSnapshotId
  );
  if (selectedIndex < 0) {
    throw new Error("split-f0-fixed-baseline-not-eligible");
  }
  const totalMinorUnits = splitF0MoneyToMinorUnitsV1(selected.totalCost);
  const medianMinor = medianMinorUnits(
    eligible.map((offer) => splitF0MoneyToMinorUnitsV1(offer.totalCost))
  );
  const perNightMinorUnits = Math.round(totalMinorUnits / scenario.nights);
  return {
    offerSnapshotId: selected.offerSnapshotId,
    total: minorUnitsToNumber(totalMinorUnits),
    totalMinorUnits,
    totalFormatted: splitF0MinorUnitsToMoneyV1(totalMinorUnits),
    perNight: minorUnitsToNumber(perNightMinorUnits),
    perNightMinorUnits,
    perNightFormatted: splitF0MinorUnitsToMoneyV1(perNightMinorUnits),
    bucket: {
      currency: selected.currency,
      occupancy: occupancyKey(selected.occupancy),
      boardClass: selected.boardClass,
      cancellationClass: selected.cancellationClass,
      paymentTiming: selected.paymentTiming,
      roomClass: selected.roomClass,
      totalCostCompleteness: "complete",
    },
    evidenceLimits: fixedBaselineEvidenceLimits(selected),
    eligibleFullStayOfferCount: eligible.length,
    cheaperEligibleFullStayOfferCount: selectedIndex,
    selectedPercentile:
      eligible.length === 1 ? 0 : selectedIndex / (eligible.length - 1),
    localMedianTotal: minorUnitsToNumber(medianMinor),
    localMedianTotalMinorUnits: medianMinor,
    localMedianTotalFormatted: splitF0MinorUnitsToMoneyV1(medianMinor),
  };
}

function outlierClassification(
  flags: readonly SplitF0OutlierFlagV1[]
): SplitF0OutlierClassificationV1 {
  const uniqueFlags = uniqueSorted(flags);
  if (uniqueFlags.length === 0) {
    return "NONE";
  }
  return uniqueFlags.length === 1 ? uniqueFlags[0] : "MULTIPLE_FLAGS";
}

function assessLocalOutlier(
  scenario: SplitF0ScenarioV1,
  fixedBaseline: SplitF0FixedSingleBaselineV1 | null,
  selectedSingle: SplitF0OfferSnapshotV1 | null,
  eligibleSingles: readonly SplitF0OfferSnapshotV1[],
  grossSavingRatio: number | null
): SplitF0OutlierAssessmentV1 {
  if (selectedSingle === null || eligibleSingles.length === 0) {
    return {
      classification: "NONE",
      flags: [],
      selectedPricePerNight: null,
      localMedianPricePerNight: null,
      selectedPercentile: null,
      grossSavingRatio,
      productionReconfirmationRequired: false,
    };
  }
  const ordered = [...eligibleSingles].sort((left, right) =>
    splitF0MoneyToMinorUnitsV1(left.totalCost) -
      splitF0MoneyToMinorUnitsV1(right.totalCost) ||
    left.offerSnapshotId.localeCompare(right.offerSnapshotId)
  );
  const selectedIndex = ordered.findIndex(
    (offer) => offer.offerSnapshotId === selectedSingle.offerSnapshotId
  );
  const selectedMinor = splitF0MoneyToMinorUnitsV1(selectedSingle.totalCost);
  const medianMinor = medianMinorUnits(
    ordered.map((offer) => splitF0MoneyToMinorUnitsV1(offer.totalCost))
  );
  const selectedPercentile =
    selectedIndex < 0
      ? null
      : ordered.length === 1
        ? 0
        : selectedIndex / (ordered.length - 1);
  const selectedPricePerNight = minorUnitsToNumber(
    Math.round(selectedMinor / scenario.nights)
  );
  const localMedianPricePerNight = minorUnitsToNumber(
    Math.round(medianMinor / scenario.nights)
  );
  const flags: SplitF0OutlierFlagV1[] = [];
  const priceLevelOutlier =
    ordered.length >= 5 &&
    selectedPercentile !== null &&
    selectedPercentile >= 0.9 &&
    selectedMinor >= medianMinor * 3;
  if (priceLevelOutlier) {
    flags.push("PRICE_LEVEL_OUTLIER");
  }
  if (
    grossSavingRatio !== null &&
    grossSavingRatio >= 0.5 &&
    (priceLevelOutlier ||
      (selectedPercentile !== null && selectedPercentile >= 0.9))
  ) {
    flags.push("SAVING_RATIO_OUTLIER");
  }
  if (
    fixedBaseline !== null &&
    selectedSingle.offerSnapshotId === fixedBaseline.offerSnapshotId
  ) {
    return {
      classification: "NONE",
      flags: [],
      selectedPricePerNight,
      localMedianPricePerNight,
      selectedPercentile,
      grossSavingRatio,
      productionReconfirmationRequired: false,
    };
  }
  const normalizedFlags = uniqueSorted(flags);
  return {
    classification: outlierClassification(normalizedFlags),
    flags: normalizedFlags,
    selectedPricePerNight,
    localMedianPricePerNight,
    selectedPercentile,
    grossSavingRatio,
    productionReconfirmationRequired: normalizedFlags.length > 0,
  };
}

const COMPARABLE_ROOM_CLASSES = new Set<SplitF0RoomClassV1>([
  "standard",
  "superior",
  "suite",
  "apartment",
]);

function paymentCompatibility(
  offers: readonly [
    SplitF0OfferSnapshotV1,
    SplitF0OfferSnapshotV1,
    SplitF0OfferSnapshotV1,
  ]
): {
  compatible: boolean;
  level: Exclude<SplitF0ComparabilityLevelV1, "NON_COMPARABLE"> | null;
  bucketValue: SplitF0PaymentTimingV1;
  evidenceLimits: string[];
} {
  const values = offers.map((offer) => offer.paymentTiming);
  const knownValues = uniqueSorted(
    values.filter(
      (value): value is Exclude<SplitF0PaymentTimingV1, "unknown"> =>
        value !== "unknown"
    )
  );
  if (knownValues.length > 1) {
    return {
      compatible: false,
      level: null,
      bucketValue: "unknown",
      evidenceLimits: [],
    };
  }
  if (knownValues.length === 1 && values.every((value) => value !== "unknown")) {
    return {
      compatible: true,
      level: "STRICT_COMPARABLE",
      bucketValue: knownValues[0],
      evidenceLimits: [],
    };
  }
  if (knownValues.length === 0) {
    return {
      compatible: true,
      level: "CONDITIONAL_COMPARABLE",
      bucketValue: "unknown",
      evidenceLimits: ["payment-timing-unknown"],
    };
  }
  return {
    compatible: true,
    level: "CONDITIONAL_COMPARABLE",
    bucketValue: "unknown",
    evidenceLimits: ["payment-timing-known-unknown"],
  };
}

export function classifySplitF0OfferComparabilityV1(
  scenario: SplitF0ScenarioV1,
  segments: readonly [SplitF0SegmentV1, SplitF0SegmentV1],
  singleOffer: SplitF0OfferSnapshotV1,
  splitOffers: readonly [SplitF0OfferSnapshotV1, SplitF0OfferSnapshotV1]
): SplitF0ComparabilityResultV1 {
  const issues: SplitF0ComparabilityIssueV1[] = [];
  const evidenceLimits: string[] = [];
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
    if (
      !COMPARABLE_ROOM_CLASSES.has(singleOffer.roomClass) ||
      !COMPARABLE_ROOM_CLASSES.has(splitOffer.roomClass) ||
      singleOffer.roomClass !== splitOffer.roomClass
    ) {
      issues.push("room-class-incompatible");
    }
  }
  const payment = paymentCompatibility([
    singleOffer,
    splitOffers[0],
    splitOffers[1],
  ]);
  if (!payment.compatible || payment.level === null) {
    issues.push("payment-incompatible");
  }
  evidenceLimits.push(...payment.evidenceLimits);
  const normalizedIssues = uniqueSorted(issues);
  if (normalizedIssues.length > 0) {
    return {
      comparable: false,
      comparabilityLevel: "NON_COMPARABLE",
      bucket: null,
      issues: normalizedIssues,
      evidenceLimits: uniqueSorted(evidenceLimits),
      knownIncompatibilities: normalizedIssues,
    };
  }
  return {
    comparable: true,
    comparabilityLevel: payment.level ?? "NON_COMPARABLE",
    bucket: {
      currency: singleOffer.currency,
      occupancy: occupancyKey(singleOffer.occupancy),
      boardClass: singleOffer.boardClass as Exclude<SplitF0BoardClassV1, "unknown">,
      cancellationClass: singleOffer.cancellationClass as Exclude<
        SplitF0CancellationClassV1,
        "unknown"
      >,
      paymentTiming: payment.bucketValue,
      totalCostCompleteness: "complete",
      minimumRating: scenario.constraints.minimumRating,
      minimumReviewCount: scenario.constraints.minimumReviewCount,
      maximumDistanceKm: scenario.constraints.maximumDistanceKm,
      roomClass: singleOffer.roomClass,
    },
    issues: [],
    evidenceLimits: uniqueSorted(evidenceLimits),
    knownIncompatibilities: [],
  };
}

function bucketKey(bucket: SplitF0ComparabilityBucketV1): string {
  return JSON.stringify(bucket);
}

function economicSignal(grossSavingMinorUnits: number): SplitF0EconomicSignalV1 {
  if (grossSavingMinorUnits <= 0) {
    return "NO_GROSS_SAVING";
  }
  if (grossSavingMinorUnits < 5_000) {
    return "POSITIVE_BELOW_50";
  }
  if (grossSavingMinorUnits < 15_000) {
    return "POSITIVE_50_TO_149";
  }
  if (grossSavingMinorUnits < 30_000) {
    return "POSITIVE_150_TO_299";
  }
  return "POSITIVE_300_PLUS";
}

interface SplitF0CandidateV1 {
  single: SplitF0OfferSnapshotV1;
  split: [SplitF0OfferSnapshotV1, SplitF0OfferSnapshotV1];
  bucket: SplitF0ComparabilityBucketV1;
  singleTotalMinorUnits: number;
  splitTotalMinorUnits: number;
  grossSavingMinorUnits: number;
  comparabilityLevel: Exclude<
    SplitF0ComparabilityLevelV1,
    "NON_COMPARABLE"
  >;
  evidenceLimits: string[];
}

function candidateFromClassification(
  single: SplitF0OfferSnapshotV1,
  split: [SplitF0OfferSnapshotV1, SplitF0OfferSnapshotV1],
  classification: SplitF0ComparabilityResultV1
): SplitF0CandidateV1 | null {
  if (
    !classification.comparable ||
    classification.bucket === null ||
    classification.comparabilityLevel === "NON_COMPARABLE"
  ) {
    return null;
  }
  const singleTotalMinorUnits = splitF0MoneyToMinorUnitsV1(single.totalCost);
  const splitTotalMinorUnits =
    splitF0MoneyToMinorUnitsV1(split[0].totalCost) +
    splitF0MoneyToMinorUnitsV1(split[1].totalCost);
  return {
    single,
    split,
    bucket: classification.bucket,
    singleTotalMinorUnits,
    splitTotalMinorUnits,
    grossSavingMinorUnits: singleTotalMinorUnits - splitTotalMinorUnits,
    comparabilityLevel: classification.comparabilityLevel,
    evidenceLimits: classification.evidenceLimits,
  };
}

function sortCandidates(
  left: SplitF0CandidateV1,
  right: SplitF0CandidateV1
): number {
  return (
    Number(left.comparabilityLevel !== "STRICT_COMPARABLE") -
      Number(right.comparabilityLevel !== "STRICT_COMPARABLE") ||
    right.grossSavingMinorUnits - left.grossSavingMinorUnits ||
    left.splitTotalMinorUnits - right.splitTotalMinorUnits ||
    left.single.offerSnapshotId.localeCompare(right.single.offerSnapshotId) ||
    left.split[0].offerSnapshotId.localeCompare(
      right.split[0].offerSnapshotId
    ) ||
    left.split[1].offerSnapshotId.localeCompare(
      right.split[1].offerSnapshotId
    )
  );
}

function buildMatchedBucketDiagnostic(
  scenario: SplitF0ScenarioV1,
  segments: readonly [SplitF0SegmentV1, SplitF0SegmentV1],
  singleStayOffers: readonly SplitF0OfferSnapshotV1[],
  firstSegmentOffers: readonly SplitF0OfferSnapshotV1[],
  secondSegmentOffers: readonly SplitF0OfferSnapshotV1[],
  fixedBaseline: SplitF0FixedSingleBaselineV1 | null
): SplitF0MatchedBucketDiagnosticV1 | null {
  const candidates: SplitF0CandidateV1[] = [];
  const structuralKey = (
    offer: SplitF0OfferSnapshotV1,
    period: Pick<SplitF0SegmentV1, "checkIn" | "checkOut" | "nights">,
    periodIssue: "single-period-invalid" | "split-period-invalid"
  ): string | null => {
    if (
      validateOfferForPeriod(
        scenario,
        offer,
        period,
        periodIssue
      ).length > 0 ||
      !COMPARABLE_ROOM_CLASSES.has(offer.roomClass)
    ) {
      return null;
    }
    return JSON.stringify([
      offer.currency,
      occupancyKey(offer.occupancy),
      offer.boardClass,
      offer.cancellationClass,
      offer.roomClass,
    ]);
  };
  const singlesByStructuralKey = new Map<
    string,
    SplitF0OfferSnapshotV1[]
  >();
  for (const single of singleStayOffers) {
    const key = structuralKey(
      single,
      scenario,
      "single-period-invalid"
    );
    if (key !== null) {
      const values = singlesByStructuralKey.get(key) ?? [];
      values.push(single);
      singlesByStructuralKey.set(key, values);
    }
  }
  for (const first of firstSegmentOffers) {
    const firstKey = structuralKey(
      first,
      segments[0],
      "split-period-invalid"
    );
    if (firstKey === null) {
      continue;
    }
    for (const second of secondSegmentOffers) {
      const secondKey = structuralKey(
        second,
        segments[1],
        "split-period-invalid"
      );
      if (secondKey === null || secondKey !== firstKey) {
        continue;
      }
      for (const single of singlesByStructuralKey.get(firstKey) ?? []) {
        const classification = classifySplitF0OfferComparabilityV1(
          scenario,
          segments,
          single,
          [first, second]
        );
        const candidate = candidateFromClassification(
          single,
          [first, second],
          classification
        );
        if (candidate !== null) {
          candidates.push(candidate);
        }
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  const cheapestSingleByBucket = new Map<string, number>();
  for (const candidate of candidates) {
    const key = bucketKey(candidate.bucket);
    const current = cheapestSingleByBucket.get(key);
    if (
      current === undefined ||
      candidate.singleTotalMinorUnits < current
    ) {
      cheapestSingleByBucket.set(key, candidate.singleTotalMinorUnits);
    }
  }
  const selected = candidates
    .filter(
      (candidate) =>
        candidate.singleTotalMinorUnits ===
        cheapestSingleByBucket.get(bucketKey(candidate.bucket))
    )
    .sort(sortCandidates)[0];
  if (selected === undefined) {
    return null;
  }
  const grossSavingRatio =
    selected.grossSavingMinorUnits / selected.singleTotalMinorUnits;
  return {
    comparabilityLevel: selected.comparabilityLevel,
    bucket: selected.bucket,
    singleOfferSnapshotId: selected.single.offerSnapshotId,
    splitOfferSnapshotIds: [
      selected.split[0].offerSnapshotId,
      selected.split[1].offerSnapshotId,
    ],
    singleTotal: minorUnitsToNumber(selected.singleTotalMinorUnits),
    splitTotal: minorUnitsToNumber(selected.splitTotalMinorUnits),
    grossSavingAmount: minorUnitsToNumber(selected.grossSavingMinorUnits),
    grossSavingRatio,
    evidenceLimits: uniqueSorted([
      "matched-bucket-diagnostic-only",
      "not-best-single-stay-headline",
      ...selected.evidenceLimits,
    ]),
    outlierAssessment: assessLocalOutlier(
      scenario,
      fixedBaseline,
      selected.single,
      eligibleFixedSingleOffers(scenario, singleStayOffers),
      grossSavingRatio
    ),
  };
}

function emptyOutlierAssessment(): SplitF0OutlierAssessmentV1 {
  return {
    classification: "NONE",
    flags: [],
    selectedPricePerNight: null,
    localMedianPricePerNight: null,
    selectedPercentile: null,
    grossSavingRatio: null,
    productionReconfirmationRequired: false,
  };
}

function noComparableResult(
  scenarioId: string,
  splitPointId: string,
  issues: readonly string[],
  technicalValidity: boolean,
  fixedBaseline: SplitF0FixedSingleBaselineV1 | null = null,
  matchedBucketDiagnostic: SplitF0MatchedBucketDiagnosticV1 | null = null
): SplitF0ComparisonResultV1 {
  return {
    scenarioId,
    splitPointId,
    technicalValidity,
    comparability: "NO_COMPARABLE_DATA",
    comparabilityLevel: "NON_COMPARABLE",
    issues: uniqueSorted(issues),
    knownIncompatibilities: uniqueSorted(issues),
    bucket: null,
    fixedBaseline,
    baselineSelectionMode: "PRIMARY_FIXED_BEST_SINGLE",
    singleOfferSnapshotId: fixedBaseline?.offerSnapshotId ?? null,
    splitOfferSnapshotIds: null,
    singleTotal: fixedBaseline?.total ?? null,
    singleTotalMinorUnits: fixedBaseline?.totalMinorUnits ?? null,
    singleTotalFormatted: fixedBaseline?.totalFormatted ?? null,
    splitTotal: null,
    splitTotalMinorUnits: null,
    splitTotalFormatted: null,
    grossSavingAmount: null,
    grossSavingMinorUnits: null,
    grossSavingAmountFormatted: null,
    grossSavingRatio: null,
    frictionSensitivity: [],
    economicSignal: "NO_COMPARABLE_DATA",
    matchedBucketDiagnostic,
    outlierAssessment: emptyOutlierAssessment(),
    evidenceLimits: [
      "calibration-set-not-market-evidence",
      "no-public-or-policy-use",
      ...(fixedBaseline?.evidenceLimits ?? []),
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
  const eligibleSingles = eligibleFixedSingleOffers(
    input.scenario,
    input.singleStayOffers
  );
  const automaticallySelectedBaseline = eligibleSingles[0] ?? null;
  const fixedSingle =
    input.fixedSingleBaseline === undefined
      ? automaticallySelectedBaseline
      : input.fixedSingleBaseline;
  if (
    fixedSingle !== null &&
    !eligibleSingles.some(
      (offer) => offer.offerSnapshotId === fixedSingle.offerSnapshotId
    )
  ) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      ["fixed-single-baseline-invalid"],
      false
    );
  }
  const fixedBaseline =
    fixedSingle === null
      ? null
      : summarizeFixedBaseline(
          input.scenario,
          input.singleStayOffers,
          fixedSingle
        );
  const matchedBucketDiagnostic = buildMatchedBucketDiagnostic(
    input.scenario,
    segments,
    input.singleStayOffers,
    input.firstSegmentOffers,
    input.secondSegmentOffers,
    fixedBaseline
  );
  if (fixedSingle === null || fixedBaseline === null) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      ["no-eligible-fixed-single-baseline"],
      true,
      null,
      matchedBucketDiagnostic
    );
  }
  const candidates: SplitF0CandidateV1[] = [];
  const rejectedIssues: SplitF0ComparabilityIssueV1[] = [];
  for (const first of input.firstSegmentOffers) {
    for (const second of input.secondSegmentOffers) {
      const classification = classifySplitF0OfferComparabilityV1(
        input.scenario,
        segments,
        fixedSingle,
        [first, second]
      );
      const candidate = candidateFromClassification(
        fixedSingle,
        [first, second],
        classification
      );
      if (candidate === null) {
        rejectedIssues.push(...classification.issues);
        continue;
      }
      candidates.push(candidate);
    }
  }
  if (candidates.length === 0) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      [
        "NO_COMPARABLE_SPLIT_FOR_FIXED_BASELINE",
        ...(rejectedIssues.length > 0
          ? uniqueSorted(rejectedIssues)
          : ["no-offers"]),
      ],
      true,
      fixedBaseline,
      matchedBucketDiagnostic
    );
  }
  const selected = candidates.sort(sortCandidates)[0];
  if (selected === undefined) {
    return noComparableResult(
      input.scenario.scenarioId,
      input.splitPointId,
      ["no-comparable-split-for-fixed-baseline"],
      true,
      fixedBaseline,
      matchedBucketDiagnostic
    );
  }
  const grossSavingRatio =
    selected.grossSavingMinorUnits / selected.singleTotalMinorUnits;
  const outlierAssessment = assessLocalOutlier(
    input.scenario,
    fixedBaseline,
    selected.single,
    eligibleSingles,
    grossSavingRatio
  );
  return {
    scenarioId: input.scenario.scenarioId,
    splitPointId: input.splitPointId,
    technicalValidity: true,
    comparability: "COMPARABLE",
    comparabilityLevel: selected.comparabilityLevel,
    issues: [],
    knownIncompatibilities: [],
    bucket: selected.bucket,
    fixedBaseline,
    baselineSelectionMode: "PRIMARY_FIXED_BEST_SINGLE",
    singleOfferSnapshotId: selected.single.offerSnapshotId,
    splitOfferSnapshotIds: [
      selected.split[0].offerSnapshotId,
      selected.split[1].offerSnapshotId,
    ],
    singleTotal: minorUnitsToNumber(selected.singleTotalMinorUnits),
    singleTotalMinorUnits: selected.singleTotalMinorUnits,
    singleTotalFormatted: splitF0MinorUnitsToMoneyV1(
      selected.singleTotalMinorUnits
    ),
    splitTotal: minorUnitsToNumber(selected.splitTotalMinorUnits),
    splitTotalMinorUnits: selected.splitTotalMinorUnits,
    splitTotalFormatted: splitF0MinorUnitsToMoneyV1(
      selected.splitTotalMinorUnits
    ),
    grossSavingAmount: minorUnitsToNumber(selected.grossSavingMinorUnits),
    grossSavingMinorUnits: selected.grossSavingMinorUnits,
    grossSavingAmountFormatted: splitF0MinorUnitsToMoneyV1(
      selected.grossSavingMinorUnits
    ),
    grossSavingRatio,
    frictionSensitivity: SPLIT_F0_FRICTION_SENSITIVITY_EUR_V1.map(
      (hypotheticalFrictionEur) => {
        const netSavingAtFrictionMinorUnits =
          selected.grossSavingMinorUnits -
          splitF0MoneyToMinorUnitsV1(hypotheticalFrictionEur);
        return {
          hypotheticalFrictionEur,
          netSavingAtFriction: minorUnitsToNumber(
            netSavingAtFrictionMinorUnits
          ),
          netSavingAtFrictionMinorUnits,
          netSavingAtFrictionFormatted: splitF0MinorUnitsToMoneyV1(
            netSavingAtFrictionMinorUnits
          ),
        };
      }
    ),
    economicSignal: economicSignal(selected.grossSavingMinorUnits),
    matchedBucketDiagnostic,
    outlierAssessment,
    evidenceLimits: uniqueSorted([
      "calibration-set-not-market-evidence",
      "hypothetical-friction-not-scientifically-calibrated",
      "production-read-only-results-required-for-economic-feasibility",
      "no-public-or-policy-use",
      ...fixedBaseline.evidenceLimits,
      ...selected.evidenceLimits,
      ...(outlierAssessment.productionReconfirmationRequired
        ? ["outlier-production-reconfirmation-required"]
        : []),
    ]),
    publicRecommendationProduced: false,
  };
}

export interface SplitF0SavingsSummaryV1 {
  positiveComparisonCount: number;
  rawMaximumSaving: number | null;
  robustMaximumSaving: number | null;
  rawMedianSaving: number | null;
  robustMedianSaving: number | null;
  quarantinedComparisonCount: number;
}

export interface SplitF0CrossCaptureComparisonV1 {
  scenarioId: string;
  splitPointId: string;
  baselineStable: boolean;
  splitStable: boolean;
  savingStable: boolean;
  matchedBucketBaselineStable: boolean;
  matchedBucketSplitStable: boolean;
  matchedBucketSavingStable: boolean;
  flags: SplitF0OutlierFlagV1[];
  classification: SplitF0OutlierClassificationV1;
}

export interface SplitF0CrossCaptureAnalysisV1 {
  comparisons: SplitF0CrossCaptureComparisonV1[];
  unstableScenarioIds: string[];
  quarantinedScenarioIds: string[];
  capture1Summary: SplitF0SavingsSummaryV1;
  capture2Summary: SplitF0SavingsSummaryV1;
}

function positiveSavingMinorUnits(
  comparisons: readonly SplitF0ComparisonResultV1[]
): number[] {
  return comparisons
    .map((comparison) => comparison.grossSavingMinorUnits)
    .filter(
      (value): value is number =>
        typeof value === "number" && value > 0
    )
    .sort((left, right) => left - right);
}

function medianSavingAmount(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : minorUnitsToNumber(medianMinorUnits(values));
}

export function summarizeSplitF0PrimarySavingsV1(
  comparisons: readonly SplitF0ComparisonResultV1[],
  quarantinedScenarioIds: readonly string[] = []
): SplitF0SavingsSummaryV1 {
  const quarantine = new Set(quarantinedScenarioIds);
  const rawValues = positiveSavingMinorUnits(comparisons);
  const robustComparisons = comparisons.filter(
    (comparison) =>
      !quarantine.has(comparison.scenarioId) &&
      comparison.outlierAssessment.classification === "NONE"
  );
  const robustValues = positiveSavingMinorUnits(robustComparisons);
  return {
    positiveComparisonCount: rawValues.length,
    rawMaximumSaving:
      rawValues.length === 0
        ? null
        : minorUnitsToNumber(rawValues[rawValues.length - 1]),
    robustMaximumSaving:
      robustValues.length === 0
        ? null
        : minorUnitsToNumber(robustValues[robustValues.length - 1]),
    rawMedianSaving: medianSavingAmount(rawValues),
    robustMedianSaving: medianSavingAmount(robustValues),
    quarantinedComparisonCount: comparisons.filter(
      (comparison) =>
        quarantine.has(comparison.scenarioId) ||
        comparison.outlierAssessment.classification !== "NONE"
    ).length,
  };
}

function materiallyUnstableMinorUnits(
  left: number | null,
  right: number | null
): boolean {
  if (left === null || right === null) {
    return left !== right;
  }
  const difference = Math.abs(left - right);
  const denominator = Math.max(1, Math.min(Math.abs(left), Math.abs(right)));
  return difference >= 10_000 && difference / denominator >= 0.5;
}

function optionalMoneyMinorUnits(value: number | null | undefined): number | null {
  return typeof value === "number"
    ? splitF0MoneyToMinorUnitsV1(Math.abs(value)) * Math.sign(value)
    : null;
}

export function analyzeSplitF0CrossCaptureStabilityV1(
  capture1: readonly SplitF0ComparisonResultV1[],
  capture2: readonly SplitF0ComparisonResultV1[]
): SplitF0CrossCaptureAnalysisV1 {
  const capture2ByKey = new Map(
    capture2.map((comparison) => [
      `${comparison.scenarioId}|${comparison.splitPointId}`,
      comparison,
    ])
  );
  const comparisons: SplitF0CrossCaptureComparisonV1[] = [];
  for (const left of capture1) {
    const right = capture2ByKey.get(
      `${left.scenarioId}|${left.splitPointId}`
    );
    if (right === undefined) {
      comparisons.push({
        scenarioId: left.scenarioId,
        splitPointId: left.splitPointId,
        baselineStable: false,
        splitStable: false,
        savingStable: false,
        matchedBucketBaselineStable: false,
        matchedBucketSplitStable: false,
        matchedBucketSavingStable: false,
        flags: ["CROSS_CAPTURE_INSTABILITY"],
        classification: "CROSS_CAPTURE_INSTABILITY",
      });
      continue;
    }
    const baselineStable = !materiallyUnstableMinorUnits(
      left.singleTotalMinorUnits,
      right.singleTotalMinorUnits
    );
    const splitStable = !materiallyUnstableMinorUnits(
      left.splitTotalMinorUnits,
      right.splitTotalMinorUnits
    );
    const savingStable = !materiallyUnstableMinorUnits(
      left.grossSavingMinorUnits,
      right.grossSavingMinorUnits
    );
    const matchedBucketBaselineStable = !materiallyUnstableMinorUnits(
      optionalMoneyMinorUnits(
        left.matchedBucketDiagnostic?.singleTotal
      ),
      optionalMoneyMinorUnits(
        right.matchedBucketDiagnostic?.singleTotal
      )
    );
    const matchedBucketSplitStable = !materiallyUnstableMinorUnits(
      optionalMoneyMinorUnits(left.matchedBucketDiagnostic?.splitTotal),
      optionalMoneyMinorUnits(right.matchedBucketDiagnostic?.splitTotal)
    );
    const matchedBucketSavingStable = !materiallyUnstableMinorUnits(
      optionalMoneyMinorUnits(
        left.matchedBucketDiagnostic?.grossSavingAmount
      ),
      optionalMoneyMinorUnits(
        right.matchedBucketDiagnostic?.grossSavingAmount
      )
    );
    const flags = uniqueSorted([
      ...left.outlierAssessment.flags,
      ...right.outlierAssessment.flags,
      ...(left.matchedBucketDiagnostic?.outlierAssessment.flags ?? []),
      ...(right.matchedBucketDiagnostic?.outlierAssessment.flags ?? []),
      ...(!baselineStable ||
      !splitStable ||
      !savingStable ||
      !matchedBucketBaselineStable ||
      !matchedBucketSplitStable ||
      !matchedBucketSavingStable
        ? (["CROSS_CAPTURE_INSTABILITY"] as const)
        : []),
    ]);
    comparisons.push({
      scenarioId: left.scenarioId,
      splitPointId: left.splitPointId,
      baselineStable,
      splitStable,
      savingStable,
      matchedBucketBaselineStable,
      matchedBucketSplitStable,
      matchedBucketSavingStable,
      flags,
      classification: outlierClassification(flags),
    });
  }
  const unstableScenarioIds = uniqueSorted(
    comparisons
      .filter((comparison) =>
        comparison.flags.includes("CROSS_CAPTURE_INSTABILITY")
      )
      .map((comparison) => comparison.scenarioId)
  );
  const quarantinedScenarioIds = uniqueSorted(
    comparisons
      .filter((comparison) => comparison.flags.length > 0)
      .map((comparison) => comparison.scenarioId)
  );
  return {
    comparisons,
    unstableScenarioIds,
    quarantinedScenarioIds,
    capture1Summary: summarizeSplitF0PrimarySavingsV1(
      capture1,
      quarantinedScenarioIds
    ),
    capture2Summary: summarizeSplitF0PrimarySavingsV1(
      capture2,
      quarantinedScenarioIds
    ),
  };
}
