// D-0052 computation kernel. The public entry is observed-offer-execution-v1.mjs:
// it revalidates the R1 document (and original reviewed journal where present).
// No Hotel/HotelOffer DTO, provider client, invented coordinates or bookable flag.
import {createSmartStayEvidenceFactV2} from '../../engine-v2/evidence/evidenceFactFactory';
import {evaluateReliabilityGateV2} from '../../engine-v2/reliability/reliabilityGate';
import {classifyAccommodationV2} from '../../engine-v2/categories/accommodationCategoryModel';
import {buildPeerGroupsV2, type SmartStayPeerGroupAssignmentV2} from '../../engine-v2/peer-groups/peerGroupModel';
import {evaluatePriceValueV2} from '../../engine-v2/price-value/priceValueEngine';
import {evaluateQualityObservationsV2} from '../../engine-v2/quality/qualityEngine';
import {evaluateComfortObservationsV2, type SmartStayComfortPreferencesV2, type SmartStayTripProfileV2} from '../../engine-v2/comfort/comfortFlexibilityEngine';
import {calculateDistanceFitScore, type SmartStayLocationEvaluationV2} from '../../engine-v2/location/locationEngine';
import {evaluateDataConfidenceV2} from '../../engine-v2/risk/dataConfidenceEngine';
import {evaluateRiskV2} from '../../engine-v2/risk/riskEngine';
import {evaluateUserUtilityV2} from '../../engine-v2/utility/userUtilityEngine';
import {createScoreBreakdown} from '../../engine-v2/orchestrator/smartStayEngineV2';
import {evaluateBudgetIntentV2} from '../../engine-v2/intent/budgetIntentEngine';
import {evaluateMarketContextV2} from '../../engine-v2/market-context/marketContextEngine';
import {evaluateBookingFlexibilityContextV2} from '../../engine-v2/flexibility/bookingFlexibilityContextEngine';
import {resolveMarketRelativeAutomaticPreferenceV2} from '../../engine-v2/intent/marketRelativePreferenceV2';
import {resolveOfferPrivacyV3,resolveStayExpectationV3,evaluateStaySuitabilityV3} from './staySuitabilityContextV3';
import {applyStrongDistancePreferenceV3,type DiagnosticDistanceExceptionV3} from './strongDistancePreferenceV3';
import {runPersonalUtilityRolePolicyV3,validatePersonalUtilityRolePolicyV3,type StayOptiRolePolicySolutionInputV3} from '../policy/personalUtilityRolePolicyV3';
import type {SmartStayEvidenceFactV2} from '../../engine-v2/model/smartStayEvaluationV2';
import {createStableHashV3} from '../contract/stableHashV3';

export const OBSERVED_DIAGNOSTIC_VERSION='stayopti.observed-offer-diagnostic@1' as const;
export interface ObservedDiagnosticComputationInputV3 {
  version:typeof OBSERVED_DIAGNOSTIC_VERSION; caseId:string; sourceFingerprint:string;
  essentialCoverage:'ESSENTIAL_COVERAGE_DEFINED'|'UNREPRESENTED_ESSENTIAL_NEEDS';
  query:{totalBudget:number;nights:number;rooms:number;adults:number;children:number;childAgesAtStay:number[];
    checkIn:string;checkOut:string;currency:string;capturedAt:string;destinationKey:string|null;
    preferenceId:string;preferenceSource:'manual'|'automatic';tripProfile?:SmartStayTripProfileV2;
    comfortPreferences?:SmartStayComfortPreferencesV2};
  context:{id:string;kilometers:number;reference:unknown;semantics:'strong-preference';distanceException?:DiagnosticDistanceExceptionV3};
  candidates:{alternativeId:string;roomKey:string;rateKey:string;
    facts:SmartStayEvidenceFactV2[];category:string|null;roomText:string|null;features:string[];
    assessment:{availability:string;accommodation:string;recommendationBlockers:string[];
      distanceState:string;distanceKm:number|null;completeTotal:number|null;ratingOmitted:boolean};
    observations:unknown;provenance:unknown}[];
}

// Factual computation, not a second public ingress: the closure returned by the
// entry module supplies this input only after re-running R1. Full inputs do not
// substitute partial costs for totals, nor does observation mode grant eligibility.
export function computeObservedOfferDiagnosticV3(input:ObservedDiagnosticComputationInputV3) {
  const q=input.query;
  if(input.version!==OBSERVED_DIAGNOSTIC_VERSION||!input.sourceFingerprint||!input.caseId||
    !Number.isFinite(q.totalBudget)||q.totalBudget<=0||!Number.isInteger(q.nights)||q.nights<1||
    !Number.isInteger(q.rooms)||q.rooms<1||q.children!==q.childAgesAtStay.length||input.candidates.length<2||
    new Set(input.candidates.map(c=>c.alternativeId)).size!==input.candidates.length)throw Error('OBSERVED_COMPUTATION_SCOPE_INVALID');
  const foundations=input.candidates.map(c=>{
    // All facts have already been mapped with source/proof links. Metadata used
    // for lookup only; names/provider ordering are deliberately absent.
    const evidence=c.facts.map(f=>createSmartStayEvidenceFactV2(f));
    const reliabilityGate=evaluateReliabilityGateV2({evidence});
    const accommodation=classifyAccommodationV2({hotel:{id:c.alternativeId,name:'',provider:'',amenities:c.features,facilities:[]},
      explicitCategory:c.category??undefined});
    const privacy=resolveOfferPrivacyV3({id:c.alternativeId,provider:'',amenities:c.features,facilities:[]},c.roomText,c.rateKey);
    return {hotelId:c.alternativeId,c,evidence,reliabilityGate,accommodation,privacy};
  });
  const peerCandidates=foundations.map(f=>({...f,accommodation:f.accommodation.profile}));
  const priceGroups=buildPeerGroupsV2(peerCandidates);
  // Quality priors must not depend on whether a price or a booking check exists.
  // Grouping and prior arithmetic are shared; no fictitious price references.
  const qualityGroups=observationGroups(peerCandidates);
  const numberFact=(facts:SmartStayEvidenceFactV2[],code:string)=>{
    const f=facts.find(f=>f.code===code&&f.availability==='known');return typeof f?.value==='number'?f.value:null;};
  const boolFact=(facts:SmartStayEvidenceFactV2[],code:string)=>{
    const f=facts.find(f=>f.code===code&&f.availability==='known');return typeof f?.value==='boolean'?f.value:null;};
  const textFact=(facts:SmartStayEvidenceFactV2[],code:string)=>{
    const f=facts.find(f=>f.code===code&&f.availability==='known');return typeof f?.value==='string'?f.value:null;};
  const flexibilityOffers=foundations.map(f=>({id:f.hotelId,distance:f.c.assessment.distanceKm,
    stars:numberFact(f.evidence,'property.stars'),accommodationCategory:f.c.category,
    offers:[{bookable:boolFact(f.evidence,'offer.bookable'),refundable:boolFact(f.evidence,'offer.refundable'),
      freeCancellationUntil:textFact(f.evidence,'offer.free-cancellation-until')}]}));
  const calculate=(preferenceId:string)=>foundations.map(f=>{
    const {c,hotelId,evidence,reliabilityGate,accommodation,privacy}=f;
    const priceValue=evaluatePriceValueV2({targetHotelId:hotelId,candidates:peerCandidates,
      peerGroupAssignment:priceGroups.find(g=>g.hotelId===hotelId)!,budgetTotal:q.totalBudget});
    const quality=evaluateQualityObservationsV2({targetHotelId:hotelId,candidates:peerCandidates,
      peerGroupAssignment:qualityGroups.find(g=>g.hotelId===hotelId)!});
    const boundUnit=privacy.unitType==='private-room'&&accommodation.profile.unitType==='hotel-room'?'hotel-room':privacy.unitType;
    const flexibilityContext=evaluateBookingFlexibilityContextV2({hotels:flexibilityOffers,targetHotelId:hotelId,
      checkIn:q.checkIn,referenceAt:q.capturedAt,maximumDistanceKm:input.context.kilometers});
    const comfortFlexibility=evaluateComfortObservationsV2({targetHotelId:hotelId,
      accommodation:{...accommodation.profile,unitType:boundUnit,evidenceIds:privacy.unitEvidenceIds},evidence,reliabilityGate,
      stayContext:{nights:q.nights,adults:q.adults,children:q.children,rooms:q.rooms,tripProfile:q.tripProfile,flexibilityContext},preferences:q.comfortPreferences});
    const location=observedLocation(hotelId,c.assessment.distanceKm,c.assessment.distanceState,input.context.kilometers,evidence);
    const dataConfidence=evaluateDataConfidenceV2({evidence});
    const risk=evaluateRiskV2({evidence,reliabilityGate,dataConfidence,priceValue,quality,location,comfortFlexibility});
    const scores=createScoreBreakdown({foundation:{accommodation,reliabilityGate},priceValue,quality,location,comfortFlexibility,dataConfidence,risk});
    const utility=evaluateUserUtilityV2({targetHotelId:hotelId,scores,reliabilityGate,preferenceId,preferenceSource:q.preferenceSource});
    const eligibleForPrimaryRanking=reliabilityGate.eligible&&c.assessment.accommodation==='SATISFIED'&&
      c.assessment.availability==='VERIFIED_BOOKABLE'&&c.assessment.completeTotal!==null;
    return {...f,priceValue,quality,location,comfortFlexibility,dataConfidence,risk,scores,utility,eligibleForPrimaryRanking,
      accommodationCategory:accommodation.profile.category};
  });
  let calculations=calculate(q.preferenceSource==='automatic'?'balanced':q.preferenceId);
  // Legacy current-search market/intent peers use the verified in-range set.
  // This is a reference-sample rule, NOT offer integrity or the final strong-
  // preference rule: out-of-range candidates and evidenced exceptions survive.
  const marketEligible=(c:typeof calculations[number])=>c.eligibleForPrimaryRanking&&c.location.constraint.withinLimit===true;
  const market=evaluateMarketContextV2({candidates:calculations.map(c=>({hotelId:c.hotelId,eligibleForPrimaryRanking:marketEligible(c),
    totalCost:c.c.assessment.completeTotal,currency:q.currency,accommodationCategory:c.accommodationCategory,stars:c.quality.starQuality.stars})),
    totalBudget:q.totalBudget,nights:q.nights,rooms:q.rooms,destinationKey:q.destinationKey,currency:q.currency,
    checkIn:q.checkIn,checkOut:q.checkOut,capturedAt:q.capturedAt,mode:'current-search'});
  const evaluateIntent=(preferenceId:string)=>evaluateBudgetIntentV2({candidates:calculations.map(c=>({...c,eligibleForPrimaryRanking:marketEligible(c)})),totalBudget:q.totalBudget,
    nights:q.nights,rooms:q.rooms,preferenceId,marketContext:market});
  let intent=evaluateIntent(q.preferenceSource==='automatic'?'balanced':q.preferenceId);
  const resolution=resolveMarketRelativeAutomaticPreferenceV2({preferenceId:q.preferenceId,preferenceSource:q.preferenceSource,budgetIntent:intent});
  if(resolution.effectivePreferenceId!==intent.preferenceId){calculations=calculate(resolution.effectivePreferenceId);intent=evaluateIntent(resolution.effectivePreferenceId);}
  const expectation=resolveStayExpectationV3({...q,preferenceId:resolution.effectivePreferenceId},intent);
  const candidates=calculations.map(c=>{
    const a=c.c.assessment,suitability=evaluateStaySuitabilityV3(expectation,c.privacy);
    const target=intent.candidateEvaluations.find(t=>t.hotelId===c.hotelId);
    let status:'eligible'|'incomplete'|'ineligible'=suitability.status;
    const reasons=[...a.recommendationBlockers.map(r=>'intent:'+r),...suitability.reasonCodes.map(r=>'intent:'+r)];
    if(intent.policy.active&&intent.policy.experienceTargetRequired){
      if(!target||target.experienceScore===null||intent.targetExperienceFloor===null||target.experienceTier==='unknown'){
        if(status!=='ineligible')status='incomplete';reasons.push('intent:experience-target-unverified');
      }else if(!target.reasonCodes.includes('experience-floor-satisfied')||!target.reasonCodes.includes('experience-tier-floor-satisfied')){
        status='ineligible';reasons.push('intent:experience-target-not-met');
      }else reasons.push('intent:experience-target-met');
    }
    const mandatory=c.comfortFlexibility.mandatoryRequirements;
    const violation=a.accommodation==='DOCUMENTED_VIOLATION'||mandatory.requiredUnitTypeStatus==='unmet'||mandatory.unmetFeatureCodes.length>0;
    const missing=a.accommodation!=='SATISFIED'||mandatory.requiredUnitTypeStatus==='unverified'||mandatory.unverifiedFeatureCodes.length>0;
    const dim=(key:'quality'|'comfort'|'location'|'flexibility')=>({score:c.scores[key].score,evidenceIds:c.scores[key].evidenceIds});
    const policy:StayOptiRolePolicySolutionInputV3={solutionId:'observed:'+c.hotelId,solutionType:'single-stay',
      totalCost:a.completeTotal,currency:q.currency,hardConstraintsSatisfied:violation?false:missing?null:true,
      offerIntegrity:['KNOWN_UNAVAILABLE','VERIFIED_NOT_BOOKABLE','CONFLICTING'].includes(a.availability)?'invalid':
        c.eligibleForPrimaryRanking?'verified':'partial',
      contextualEligibility:{version:'stayopti.intent-context-eligibility@1',status,reasonCodes:reasons},
      dimensions:{quality:dim('quality'),comfort:dim('comfort'),location:dim('location'),flexibility:dim('flexibility'),
        room:{score:c.comfortFlexibility.unitType.unitType==='unknown'?null:c.comfortFlexibility.unitType.score,evidenceIds:c.comfortFlexibility.unitType.evidenceIds},
        'long-stays':{score:q.nights>=7?c.comfortFlexibility.dimensions.practicality.score:null,evidenceIds:c.comfortFlexibility.dimensions.practicality.evidenceIds}},
      evidenceIds:c.evidence.map(f=>f.id)};
    return {hotelId:c.hotelId,policy,assessment:a,observations:c.c.observations,provenance:c.c.provenance,
      offerScope:{roomKey:c.c.roomKey,rateKey:c.c.rateKey},suitability,target,
      distance:{status:!a.distanceState.startsWith('COMPARABLE_')?'unknown':a.distanceKm!<=input.context.kilometers?'satisfied':'exceeded'},
      calculated:{quality:c.quality,comfort:c.comfortFlexibility,location:c.location,priceValue:c.priceValue,
        reliability:c.reliabilityGate,dataConfidence:c.dataConfidence},
      dimensionsCalculated:Object.entries(policy.dimensions).filter(([,d])=>d.score!==null).map(([k])=>k)};
  });
  const policyInput={caseId:input.caseId,profile:resolution.effectivePreferenceId,totalBudget:q.totalBudget,
    currency:q.currency,nights:q.nights,solutions:candidates.map(c=>c.policy)};
  const representable=input.essentialCoverage==='ESSENTIAL_COVERAGE_DEFINED';
  let decision:ReturnType<typeof runPersonalUtilityRolePolicyV3>|null=null;
  if(representable){
    applyStrongDistancePreferenceV3(candidates,policyInput,input.context.distanceException);
    decision=runPersonalUtilityRolePolicyV3(policyInput);
    if(!validatePersonalUtilityRolePolicyV3(decision).valid)throw Error('OBSERVED_POLICY_OUTPUT_INVALID');
  }
  return {version:OBSERVED_DIAGNOSTIC_VERSION,classification:'DIAGNOSTIC_ONLY',sourceFingerprint:input.sourceFingerprint,
    context:input.context,party:{adults:q.adults,childAgesAtStay:q.childAgesAtStay,unitsRequested:q.rooms},
    inputStatus:representable?'REPRESENTABLE_DIAGNOSTIC_INPUT':'NON_REPRESENTABLE_ESSENTIAL_REQUIREMENT',
    diagnosticCalculationsExecuted:true,policyExecuted:representable,decision,policyInput:representable?policyInput:null,
    candidates,intent,expectation,profile:resolution,market,
    fingerprint:createStableHashV3({input,decision},OBSERVED_DIAGNOSTIC_VERSION),
    fullRobustness:'NOT_EXECUTED',regret:'NOT_EXECUTED',feedbackUsed:false,bestOverBudgetMappedToUpgrade:false,
    publicIntegrationEnabled:false,automaticGoldenAdmission:false};
}

// Documented source-reference distances use the unchanged fit formula; never
// relabelled provider-selected-location. No coordinates/haversine reconstruction.
function observedLocation(id:string,km:number|null,state:string,maximum:number,facts:SmartStayEvidenceFactV2[]):SmartStayLocationEvaluationV2 {
  const usable=state.startsWith('COMPARABLE_')&&km!==null;
  return {hotelId:id,status:usable?'usable':'unavailable',eligibleForPrimaryRanking:false,
    score:usable?Math.round(calculateDistanceFitScore(km,maximum,5)*100)/100:null,
    confidence:usable?facts.find(f=>f.code==='location.distance')?.confidence??0:0,
    distance:{providerDistanceKm:km,calculatedDistanceKm:null,selectedDistanceKm:usable?km:null,
      source:usable?'documented-reference':'unavailable',discrepancyKm:null,discrepancyRatio:null},
    constraint:{provided:true,maximumDistanceKm:maximum,withinLimit:usable?km<=maximum:null,
      overageKm:usable?Math.max(0,km-maximum):null,utilizationRatio:usable?km/maximum:null},
    warningCodes:[state,'DECLARED_REFERENCE_NOT_GEOGRAPHIC_EQUIVALENCE','OBSERVATION_NOT_RECOMMENDATION_ELIGIBILITY'],
    evidenceIds:facts.filter(f=>f.code==='location.distance').flatMap(f=>[f.id,...f.derivedFromEvidenceIds])};
}
function observationGroups(candidates:Parameters<typeof buildPeerGroupsV2>[0]):SmartStayPeerGroupAssignmentV2[]{
  // Keep the shared category/unit grouping without manufacturing an offer cost.
  return buildQualityObservationGroupsV2(candidates);
}
import {buildQualityObservationGroupsV2} from '../../engine-v2/peer-groups/peerGroupModel';
