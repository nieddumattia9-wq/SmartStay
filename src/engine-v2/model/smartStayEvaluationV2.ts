import type {
  Hotel,
} from "../../types/hotel";

export const SMARTSTAY_ENGINE_V2_VERSION =
  "2.0.0" as const;

export type SmartStayEngineV2Version =
  typeof SMARTSTAY_ENGINE_V2_VERSION;

export type SmartStayAccommodationCategory =
  | "hotel"
  | "bed-and-breakfast"
  | "apartment"
  | "vacation-rental"
  | "aparthotel"
  | "hostel"
  | "guesthouse"
  | "villa"
  | "resort"
  | "camping"
  | "other"
  | "unknown";

export type SmartStayUnitType =
  | "entire-place"
  | "private-room"
  | "shared-room"
  | "hotel-room"
  | "unknown";

export type SmartStayEvidenceSource =
  | "provider"
  | "derived"
  | "user"
  | "system";

export type SmartStayEvidenceAvailability =
  | "known"
  | "unknown"
  | "not-applicable"
  | "conflicting";

export type SmartStayEvidenceValueV2 =
  | string
  | number
  | boolean
  | null;

export type SmartStayEvidenceSeverity =
  | "information"
  | "warning"
  | "blocking";

export type SmartStayReliabilityGateStatus =
  | "invalid"
  | "low-confidence"
  | "usable"
  | "strong-data";

export type SmartStayConstraintStatus =
  | "not-set"
  | "satisfied"
  | "exceeded"
  | "unknown"
  | "not-applicable";

export type SmartStayRiskLevelV2 =
  | "low"
  | "medium"
  | "high";

export type SmartStayDataConfidenceLevelV2 =
  | "none"
  | "low"
  | "medium"
  | "high";

export type SmartStayParetoStatus =
  | "frontier"
  | "dominated"
  | "unknown";

export type SmartStayPeerGroupMode =
  | "same-category"
  | "compatible-category"
  | "cross-category"
  | "unavailable";

export type SmartStayRecommendationRoleV2 =
  | "unassigned"
  | "best-choice"
  | "best-sensible-saving"
  | "worthwhile-comfort-upgrade"
  | "best-location";

export type SmartStayRankBand =
  | "top"
  | "strong"
  | "acceptable"
  | "weak"
  | "excluded";

export interface SmartStayEvidenceFactV2 {
  id: string;

  code: string;

  availability:
    SmartStayEvidenceAvailability;

  value:
    SmartStayEvidenceValueV2;

  unit:
    string | null;

  source:
    SmartStayEvidenceSource;

  sourceProvider:
    string | null;

  sourceField:
    string | null;

  confidence:
    number;

  severity:
    SmartStayEvidenceSeverity;

  missingReasonCode:
    string | null;

  capturedAt:
    string | null;

  derivedFromEvidenceIds:
    string[];
}

export interface SmartStayAccommodationProfileV2 {
  category:
    SmartStayAccommodationCategory;

  unitType:
    SmartStayUnitType;

  originalCategory:
    string | null;

  confidence:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayReliabilityGateV2 {
  status:
    SmartStayReliabilityGateStatus;

  eligible:
    boolean;

  blockingReasonCodes:
    string[];

  warningCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayConstraintEvaluationV2 {
  code:
    string;

  kind:
    | "budget"
    | "distance"
    | "mandatory-feature";

  status:
    SmartStayConstraintStatus;

  actualValue:
    string | number | boolean | null;

  limitValue:
    string | number | boolean | null;

  evidenceIds:
    string[];
}

export interface SmartStayPeerGroupV2 {
  id:
    string | null;

  mode:
    SmartStayPeerGroupMode;

  category:
    SmartStayAccommodationCategory;

  sampleSize:
    number;

  referencePriceCount:
    number;

  confidence:
    number;

  evidenceIds:
    string[];
}

export interface SmartStayDimensionScoreV2 {
  score:
    number | null;

  confidence:
    number;

  signalCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayScoreBreakdownV2 {
  priceValue:
    SmartStayDimensionScoreV2;

  quality:
    SmartStayDimensionScoreV2;

  location:
    SmartStayDimensionScoreV2;

  comfort:
    SmartStayDimensionScoreV2;

  flexibility:
    SmartStayDimensionScoreV2;

  categoryFit:
    SmartStayDimensionScoreV2;

  userFit:
    SmartStayDimensionScoreV2;

  reliability:
    SmartStayDimensionScoreV2;
}

export interface SmartStayDataConfidenceV2 {
  score:
    number;

  level:
    SmartStayDataConfidenceLevelV2;

  knownFieldCodes:
    string[];

  unknownFieldCodes:
    string[];

  notApplicableFieldCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayRiskAssessmentV2 {
  score:
    number;

  level:
    SmartStayRiskLevelV2;

  factorCodes:
    string[];

  evidenceIds:
    string[];
}

export interface SmartStayParetoEvaluationV2 {
  status:
    SmartStayParetoStatus;

  dominatedByHotelIds:
    string[];

  dominatesHotelIds:
    string[];

  reasonCodes:
    string[];
}

export interface SmartStayComparisonFactV2 {
  code:
    string;

  messageKey:
    string;

  value:
    string | number | boolean | null;

  unit:
    string | null;

  targetHotelId:
    string | null;

  direction:
    | "better"
    | "worse"
    | "neutral"
    | "unknown";

  evidenceIds:
    string[];
}

export interface SmartStayExplanationV2 {
  strengthFacts:
    SmartStayComparisonFactV2[];

  weaknessFacts:
    SmartStayComparisonFactV2[];

  comparisonFacts:
    SmartStayComparisonFactV2[];

  evidenceIds:
    string[];
}

export interface SmartStayRecommendationV2 {
  role:
    SmartStayRecommendationRoleV2;

  eligible:
    boolean;

  reasonCodes:
    string[];

  comparisonTargetHotelId:
    string | null;

  evidenceIds:
    string[];
}

export interface SmartStayFinalScoreV2 {
  smartScore:
    number;

  utilityScore:
    number;

  scoreConfidence:
    number;

  rank:
    number | null;

  rankBand:
    SmartStayRankBand;

  tieGroupId:
    string | null;

  deterministicKey:
    string;
}

export interface SmartStayEvaluationFlexibilityContextV2 {
  leadTimeDays:
    number | null;

  leadTimeBand:
    | "same-day"
    | "last-minute"
    | "short-notice"
    | "standard"
    | "advance"
    | "unknown";

  marketAvailability:
    | "scarce"
    | "limited"
    | "mixed"
    | "common"
    | "unknown";

  nonRefundablePenaltyMultiplier:
    number;

  reasonCodes:
    string[];
}

export interface SmartStayEvaluationV2 {
  engineVersion:
    SmartStayEngineV2Version;

  hotel:
    Hotel;

  accommodation:
    SmartStayAccommodationProfileV2;

  evidence:
    SmartStayEvidenceFactV2[];

  reliabilityGate:
    SmartStayReliabilityGateV2;

  constraints:
    SmartStayConstraintEvaluationV2[];

  peerGroup:
    SmartStayPeerGroupV2;

  scores:
    SmartStayScoreBreakdownV2;

  dataConfidence:
    SmartStayDataConfidenceV2;

  risk:
    SmartStayRiskAssessmentV2;

  flexibilityContext:
    SmartStayEvaluationFlexibilityContextV2 | null;

  pareto:
    SmartStayParetoEvaluationV2;

  recommendation:
    SmartStayRecommendationV2;

  explanation:
    SmartStayExplanationV2;

  final:
    SmartStayFinalScoreV2;
}
