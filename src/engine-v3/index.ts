export {
  adaptV2SearchResultToDecisionV3,
  type AdaptV2SearchResultToDecisionV3Input,
  type StayOptiV3CompatibilityPolicyInput,
} from "./adapter/v2CompatibilityAdapterV3";

export {
  assertCommercialFirewallV3,
  evaluateCommercialFirewallV3,
  type SmartStayCommercialFirewallEvaluationV3,
  type SmartStayCommercialFirewallViolationV3,
} from "./contract/commercialFirewallV3";

export {
  assertStayOptiDecisionV3,
  validateStayOptiDecisionV3,
  type StayOptiDecisionCandidateV3,
  type StayOptiDecisionContextV3,
  type StayOptiDecisionIntegrityV3,
  type StayOptiDecisionPersonalizationV3,
  type StayOptiDecisionRoleV3,
  type StayOptiDecisionStatusV3,
  type StayOptiDecisionV3,
} from "./contract/stayOptiDecisionV3";

export {
  assertStaySolutionV3,
  validateStaySolutionV3,
  type StaySolutionCostV3,
  type StaySolutionSegmentV3,
  type StaySolutionV3,
} from "./contract/staySolutionV3";

export {
  createStableHashV3,
  stableSerializeV3,
} from "./contract/stableHashV3";

export {
  SMARTSTAY_REASON_CODES_V3,
  type SmartStayReasonCodeV3,
} from "./contract/reasonCodesV3";

export {
  SMARTSTAY_V3_VERSIONS,
} from "./contract/versionsV3";

export {
  createStayIntegrityCoverageReportV3,
  type StayIntegrityCoverageReportV3,
  type StayIntegrityGateStatusV3,
  type StayPublicRatesConsistencyV3,
} from "./integrity/integrityCoverageV3";

export {
  assertStayOfferIntegritySnapshotV3,
  createCanonicalOfferKeyV3,
  createStayOfferIntegritySnapshotV3,
  createStayOfferSnapshotFingerprintV3,
  deduplicateStayOfferSnapshotsV3,
  enumerateStayNightsV3,
  parseIsoDateV3,
  validateStayOfferIntegritySnapshotV3,
  type CreateStayOfferIntegritySnapshotInputV3,
  type StayCanonicalCostV3,
  type StayNightEvidenceInputV3,
  type StayOfferIntegritySnapshotV3,
  type StayScopeV3,
  type StayTemporalPriceEvidenceV3,
} from "./integrity/stayOfferIntegrityV3";

export {
  compareStayOfferRecheckV3,
  type StayOfferRecheckDecisionDiffV3,
  type StayOfferRecheckStateV3,
} from "./integrity/recheckDecisionDiffV3";

export {
  createDecisionFingerprintV3,
  runDeterministicDecisionReplayV3,
  verifyDecisionReplayV3,
} from "./replay/decisionReplayV3";

export {
  applyDiminishingReturnsV3,
  createBudgetUtilityV3,
  evaluatePersonalUtilityV3,
  isStayOptiPreferenceIdV3,
  resolvePersonalPreferenceV3,
  validatePersonalUtilityEvaluationV3,
  type EvaluateStayOptiPersonalUtilityInputV3,
  type StayOptiPersonalUtilityContextV3,
  type StayOptiPersonalUtilityEvaluationV3,
  type StayOptiPreferenceIdV3,
  type StayOptiPreferenceOriginV3,
  type StayOptiPreferenceResolutionV3,
  type StayOptiTripTypeV3,
  type StayOptiUtilityContributionV3,
  type StayOptiUtilityDimensionInputV3,
  type StayOptiUtilityDimensionV3,
  type StayOptiUtilityInteractionV3,
} from "./utility/personalUtilityV3";

export {
  evaluatePeerIntelligenceV3,
  validatePeerAssignmentV3,
  type StayOptiPeerAssignmentV3,
  type StayOptiPeerCandidateV3,
  type StayOptiPeerCategoryV3,
  type StayOptiPeerExclusionV3,
  type StayOptiPeerGroupModeV3,
  type StayOptiPeerIntelligenceOptionsV3,
  type StayOptiPeerUnitTypeV3,
} from "./peer/peerIntelligenceV3";
