export type SmartStayMarketContextModeV2 =
  | "off"
  | "current-search"
  | "local-only"
  | "hybrid";

export type SmartStayMarketContextSourceV2 =
  | "unavailable"
  | "current-search"
  | "local-memory"
  | "local-seed"
  | "hybrid";

export type SmartStayMarketContextStatusV2 =
  | "unavailable"
  | "usable"
  | "strong-data";

export type SmartStayMarketSegmentKindV2 =
  | "overall"
  | "category"
  | "star-band";

export type SmartStayMarketObservationSourceV2 =
  | "current-search"
  | "local-memory"
  | "local-seed";

export interface SmartStayMarketDistributionV2 {
  sampleSize: number;
  minimum: number | null;
  firstQuartile: number | null;
  median: number | null;
  thirdQuartile: number | null;
  ninetiethPercentile: number | null;
  maximum: number | null;
}

export interface SmartStayMarketSegmentDescriptorV2 {
  key: string;
  kind: SmartStayMarketSegmentKindV2;
  category: string | null;
  starBand: string | null;
}

export interface SmartStayMarketSegmentSnapshotV2
  extends SmartStayMarketSegmentDescriptorV2 {
  status: SmartStayMarketContextStatusV2;
  source: SmartStayMarketContextSourceV2;
  confidence: number;
  distribution: SmartStayMarketDistributionV2;
  currentSearchDistribution: SmartStayMarketDistributionV2;
  matchingObservationCount: number;
  reasonCodes: string[];
}

export interface SmartStayMarketContextCandidateV2 {
  hotelId: string;
  eligibleForPrimaryRanking: boolean;
  totalCost: number | null;
  currency: string | null;
  accommodationCategory?: string | null;
  stars?: number | null;
}

export interface SmartStayMarketContextObservationV2 {
  id: string;
  destinationKey: string;
  currency: string;
  stayMonth: number | null;
  segmentKey: string;
  distribution: SmartStayMarketDistributionV2;
  seasonalIndex: number | null;
  source: SmartStayMarketObservationSourceV2;
  confidence: number;
  observedAt: string | null;
  leadTimeDays: number | null;
}

export interface SmartStayMarketContextInputV2 {
  candidates: SmartStayMarketContextCandidateV2[];
  totalBudget?: number | null;
  nights?: number | null;
  rooms?: number | null;
  destinationKey?: string | null;
  currency?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  capturedAt?: string | null;
  mode?: SmartStayMarketContextModeV2;
  observations?: readonly SmartStayMarketContextObservationV2[];
}

export interface SmartStayMarketContextSnapshotV2 {
  status: SmartStayMarketContextStatusV2;
  mode: SmartStayMarketContextModeV2;
  source: SmartStayMarketContextSourceV2;
  destinationKey: string | null;
  currency: string | null;
  checkIn: string | null;
  checkOut: string | null;
  stayMonth: number | null;
  nights: number;
  rooms: number;
  budgetPerRoomNight: number | null;
  confidence: number;
  seasonalIndex: number | null;
  distribution: SmartStayMarketDistributionV2;
  currentSearchDistribution: SmartStayMarketDistributionV2;
  segments: SmartStayMarketSegmentSnapshotV2[];
  currentSearchSampleSize: number;
  matchingObservationCount: number;
  generatedObservations: SmartStayMarketContextObservationV2[];
  reasonCodes: string[];
}
