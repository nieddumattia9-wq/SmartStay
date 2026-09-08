// Evaluation-only executable evidence. All values below are invented controls,
// not observations, defaults for missing real fields, or a real-data adapter.
import type { Hotel } from '../../types/hotel';
import { evaluateSmartStaySearchV2, type SmartStayEngineV2SearchInput } from '../../engine-v2/orchestrator/smartStayEngineV2';
import { adaptV2SearchResultToDecisionV3 } from '../adapter/v2CompatibilityAdapterV3';
import { validateStayOptiDecisionV3 } from '../contract/stayOptiDecisionV3';
import { createIndependentV3ComparableDecisionV3 } from '../orchestrator/independentDecisionEngineV3';
import { runPersonalUtilityRolePolicyV3, validatePersonalUtilityRolePolicyV3, type RunStayOptiPersonalUtilityRolePolicyInputV3 } from '../policy/personalUtilityRolePolicyV3';

export const DIAGNOSTIC_CAPABILITY_VARIANTS = ['COMPLETE', 'TOTAL_UNKNOWN', 'RATING_SCALE_UNKNOWN', 'BOTH_UNKNOWN', 'ONE_TOTAL_UNKNOWN', 'NOT_BOOKABLE', 'DISTANCE_LEADER_OUTSIDE', 'ALL_DISTANCE_OUTSIDE', 'DISTANCE_UNVERIFIED'] as const;
export type DiagnosticCapabilityVariant = typeof DIAGNOSTIC_CAPABILITY_VARIANTS[number];

export function createSyntheticCapabilityInput(variant: DiagnosticCapabilityVariant, maximumDistanceKm: number | null = null): SmartStayEngineV2SearchInput {
  if (!DIAGNOSTIC_CAPABILITY_VARIANTS.includes(variant)) throw Error('SYNTHETIC_VARIANT_REQUIRED');
  if (![null, 1, 3].includes(maximumDistanceKm)) throw Error('SYNTHETIC_DISTANCE_CONTROL_REQUIRED');
  const hotels: Hotel[] = [0, 1, 2].map(i => {
    const missingTotal = variant === 'TOTAL_UNKNOWN' || variant === 'BOTH_UNKNOWN' || (variant === 'ONE_TOTAL_UNKNOWN' && i === 0);
    const missingRating = variant === 'RATING_SCALE_UNKNOWN' || variant === 'BOTH_UNKNOWN';
    const amount = [360, 420, 390][i];
    return {
      id: `SYNTHETIC_CAPABILITY_${i}`, name: `Invented accommodation ${i}`, provider: 'synthetic-source', dataSources: ['synthetic-source'], dataConfidence: 'full',
      availableData: {hasPrice:true,hasBasePrice:true,hasSaving:true,hasStars:true,hasReviewScore:!missingRating,hasReviewCount:true,hasDistance:true,hasImage:false,hasAddress:true,hasCoordinates:true,hasAmenities:true},
      // V2's public-offer boundary requires offer-N (not a raw provider ID).
      offers: [{id:`offer-${i+1}`,provider:'synthetic-source',price:amount,basePrice:amount,saving:0,currency:'EUR',totalKnownCost:missingTotal?null:amount,taxesIncluded:missingTotal?null:true,
        cancellationPolicy:'Free cancellation until 2099-09-01',refundable:true,refundableTag:'RFN',freeCancellationUntil:'2099-09-01',cancellationPenalty:0,cancellationPenaltyCurrency:'EUR',cancellationPenaltyType:'amount',cancellationTimezone:'Europe/Rome',
        roomName:'Private double room',mealPlan:'Breakfast included',bookable:variant!=='NOT_BOOKABLE'}],
      stars:[4,4,3][i],reviewScore:missingRating?null:[8.9,8.2,8.5][i],reviewCount:[920,320,650][i],reviewCountRelation:'equal',reviewText:'Synthetic reviewed evidence',
      price:amount,basePrice:amount,saving:0,currency:'EUR',totalKnownCost:missingTotal?null:amount,taxesIncluded:missingTotal?null:true,
      distance:[0.5,2,3.8][i],image:'',address:`Invented street ${i}`,city:'Synthetic city',country:'Synthetic country',latitude:[0.0045,0.018,0.0342][i],longitude:0,
      amenities:['Hotel room','Private bathroom','WiFi','Air conditioning','Breakfast','Reception','Elevator'],facilities:['Front desk','Daily housekeeping'],
    };
  });
  if (variant === 'DISTANCE_LEADER_OUTSIDE') {
    // A highly rated, cheaper option is outside the explicit cap. Its attractive
    // diagnostic utility must never license a hard-constraint violation.
    hotels.forEach((h,i)=>{h.distance=i===0?4:0.5;h.latitude=i===0?0.036:0.0045;h.stars=i===0?5:2;h.reviewScore=i===0?9.8:7;});
  }
  if (variant === 'ALL_DISTANCE_OUTSIDE') hotels.forEach(h=>{h.distance=4;h.latitude=0.036;});
  if (variant === 'DISTANCE_UNVERIFIED') hotels.forEach(h=>{h.latitude=null;h.longitude=null;h.distance=null;h.availableData.hasDistance=false;h.availableData.hasCoordinates=false;});
  const cap=variant.startsWith('DISTANCE_')||variant==='ALL_DISTANCE_OUTSIDE'?maximumDistanceKm??1:maximumDistanceKm;
  return {hotels,preferenceId:'balanced',preferenceSource:'manual',totalBudget:450,maximumDistanceKm:cap,selectedLocation:{latitude:0,longitude:0,confidence:1},nights:3,adults:2,children:0,rooms:1,checkIn:'2099-10-10',checkOut:'2099-10-13',currency:'EUR',capturedAt:'2099-09-01T12:00:00Z',bookingReferenceAt:'2099-09-01T12:00:00Z'};
}

export function runSyntheticCapabilityProbe(variant: DiagnosticCapabilityVariant, maximumDistanceKm: number | null = null) {
  const input = createSyntheticCapabilityInput(variant, maximumDistanceKm);
  const result = evaluateSmartStaySearchV2(input);
  const decision = adaptV2SearchResultToDecisionV3({searchInput:input,result});
  let independentOutput: ReturnType<typeof createIndependentV3ComparableDecisionV3> | null = null;
  let independentError: string | null = null;
  try { independentOutput = createIndependentV3ComparableDecisionV3(decision, null); }
  catch (error) { independentError = error instanceof Error ? error.message : 'UNEXPECTED_SYNTHETIC_ERROR'; }
  return {
    proofScope:'SYNTHETIC_ONLY_NOT_REAL_FEEDBACK_EXECUTION' as const,
    variant, maximumDistanceKm:input.maximumDistanceKm,
    sourceUnknowns:{completeTotal:variant.includes('TOTAL')||variant==='BOTH_UNKNOWN',ratingScale:variant==='RATING_SCALE_UNKNOWN'||variant==='BOTH_UNKNOWN'},
    sourceRatingObservations:input.hotels.map((h,i)=>({alternativeId:h.id,observedValue:h.reviewScore??[8.9,8.2,8.5][i],sourceScale:h.reviewScore===null?{status:'UNKNOWN',value:null,reason:'Synthetic source does not document the scale'}:{status:'KNOWN',value:10,reason:'Explicit synthetic control fact'},usedAsCanonicalScore:h.reviewScore!==null})),
    ratingHandling:'UNKNOWN_SOURCE_SCALE_OMITS_CANONICAL_SCORE; OBSERVATION_NOT_RESCALED',
    input, result, decision, validation:validateStayOptiDecisionV3(decision),
    independentOutput, independentError,
    goldenAdmission:false, realDataExecuted:false,
  };
}

// A second, distinct V3 path: the existing offline role-policy candidate.
// These dimension scores are explicitly invented test facts, NOT a mapping
// from the reviewed transcription or from raw ratings to policy dimensions.
export function runSyntheticRoleCapabilityProbe(totalUnknown = false) {
  const input: RunStayOptiPersonalUtilityRolePolicyInputV3 = {
    caseId:'SYNTHETIC_ROLE_CAPABILITY',profile:'balanced',totalBudget:450,currency:'EUR',nights:3,
    solutions:[0,1].map(i=>({solutionId:`synthetic-role-${i}`,solutionType:'single-stay',totalCost:totalUnknown?null:[360,420][i],currency:'EUR',hardConstraintsSatisfied:true,offerIntegrity:totalUnknown?'partial':'verified',
      dimensions:{quality:{score:[85,80][i],evidenceIds:['synthetic-quality']},comfort:{score:80,evidenceIds:['synthetic-comfort']},location:{score:[85,65][i],evidenceIds:['synthetic-location']},room:{score:80,evidenceIds:['synthetic-room']},flexibility:{score:80,evidenceIds:['synthetic-flexibility']},'long-stays':{score:null,evidenceIds:[]}},evidenceIds:['synthetic-only']})),
  };
  const result=runPersonalUtilityRolePolicyV3(input);
  return {input,result,validation:validatePersonalUtilityRolePolicyV3(result),scope:'SYNTHETIC_OFFLINE_POLICY_CANDIDATE_NOT_REVIEW_MAPPING',bestOverBudgetMapping:null};
}

export function summarizeSyntheticCapability(probe: ReturnType<typeof runSyntheticCapabilityProbe>) {
  const d=probe.decision;
  return {
    variant:probe.variant,maximumDistanceKm:probe.maximumDistanceKm,inputRejected:false,decisionSchemaValid:probe.validation.valid,decisionIssues:probe.validation.issues,
    compatibilityDecisionStatus:d.status,solutions:d.solutions.map(s=>({id:s.solutionId,feasibility:s.feasibility,cost:s.totalCost})),
    reliability:probe.result.evaluations.map(e=>({id:e.hotel.id,gate:e.reliabilityGate,constraints:e.constraints,quality:e.scores.quality,location:e.scores.location,confidence:e.final.scoreConfidence,rankBand:e.final.rankBand})),
    v3Utility:d.personalization.utilityEvaluations,integrity:d.integrity.offerSnapshots,
    robustness:{status:d.robustness.status,policy:d.robustness.recommendationPolicy,abstention:d.robustness.abstentionCode,candidates:d.robustness.candidates,selectedHotel:d.robustness.policyPreferredHotelId},
    independentOutput:probe.independentOutput,independentError:probe.independentError,
    diagnosticComputationCompleted:true,independentComparisonExtractable:probe.independentOutput!==null,
    realComparisonAuthorized:false,goldenAdmission:false,
  };
}
