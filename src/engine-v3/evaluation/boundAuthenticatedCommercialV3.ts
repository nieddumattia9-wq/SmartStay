import {createStableHashV3} from '../contract/stableHashV3';
import {validateStayOptiDecisionV3,type StayOptiDecisionV3} from '../contract/stayOptiDecisionV3';
import type {StayOptiComparableDecisionV3} from '../promotion/shadowCanaryPromotionV3';
import type {SmartStayEngineV2SearchInput} from '../../engine-v2/orchestrator/smartStayEngineV2';
import {sameChildAgeGroup} from '../../utils/searchParty';
import {isAuthenticatedCommercialPreparationV3,type AuthenticatedCommercialPreparationV3} from './authenticatedCommercialPreparationV3';
import {authenticatedDecisionInputV3,authenticatedInputFingerprintV3} from './authenticatedCommercialDecisionInputV3';
import {COMMERCIAL_EVIDENCE_DELTA_V3,commercialEqualV3} from '../contract/commercialEvidenceV3';
import {commercialFactsTermsV3,authenticatedQualifiedCostV3} from '../contract/authenticatedCommercialSetV3';
import {createStayOfferIntegritySnapshotV3,enumerateStayNightsV3} from '../integrity/stayOfferIntegrityV3';
const issued=new WeakSet<object>();
export interface BoundAuthenticatedCommercialV3 {
 version:'stayopti.bound-authenticated-commercial@2'|'stayopti.bound-authenticated-commercial@2.1';evidenceType:'authenticated-commercial-alternative-set';
 prepared:AuthenticatedCommercialPreparationV3;decisionFingerprint:string;comparableFingerprint:string;inputFingerprint:string;setFingerprint:string;evidenceFingerprint:string;
}
type Input={decision:StayOptiDecisionV3;comparable:StayOptiComparableDecisionV3;searchInput:SmartStayEngineV2SearchInput};
function problems(i:Input,p:AuthenticatedCommercialPreparationV3){
 const reasons:string[]=[];
 if(!isAuthenticatedCommercialPreparationV3(p)||p.assessment.status!=='PREPARED_PILOT_SET')return ['ISSUED_QUALIFIED_SET_REQUIRED'];
 if(!validateStayOptiDecisionV3(i.decision).valid)return ['DECISION_INVALID'];
 if(i.decision.integrity.coverage.invalidIntegrityCount>0)return ['DECISION_INTEGRITY_INVALID'];
 if(authenticatedInputFingerprintV3(i.searchInput)!==authenticatedInputFingerprintV3(authenticatedDecisionInputV3(p)))return ['ENTIRE_ALTERNATIVE_SET_OR_CONTEXT_CHANGED'];
 const s=p.facts.scenario,c=i.decision.context;
 if(c.totalBudget!==s.budget||c.maximumDistanceKm!==null)reasons.push('DECISION_CONTEXT_CHANGED');
 if(c.adults!==s.adults||c.children!==s.childAges.length||c.rooms!==s.units||c.checkIn!==s.checkin||c.checkOut!==s.checkout||c.currency!==s.currency||!c.party||!sameChildAgeGroup(c.party.ageInformation.ages,s.childAges,s.childAges.length))reasons.push('DECISION_FAMILY_SCOPE_CHANGED');
 const expected=p.assessment.offers.filter(o=>p.assessment.qualifiedKeys.includes(o.key));
 if(i.decision.integrity.offerSnapshots.length!==expected.length)reasons.push('DECISION_ALTERNATIVE_SET_CHANGED');
 for(const o of expected){const f=o.facts.verified!,snap=i.decision.integrity.offerSnapshots.filter(x=>x.hotelId===f.identity.propertyId&&x.offerId===o.facts.decisionOfferId);
  if(snap.length!==1||snap[0].cost.total.amount===null||Math.abs(snap[0].cost.total.amount-authenticatedQualifiedCostV3(o.qualification).completeTotal!)>COMMERCIAL_EVIDENCE_DELTA_V3||snap[0].cost.total.currency!==s.currency)reasons.push('ALTERNATIVE_PRICE_OR_IDENTITY_CHANGED');
  const t=commercialFactsTermsV3(f),proof=createStayOfferIntegritySnapshotV3({hotelId:f.identity.propertyId,offerId:o.facts.decisionOfferId,
   scope:{checkIn:s.checkin,checkOut:s.checkout,nights:enumerateStayNightsV3(s.checkin,s.checkout).length,adults:s.adults,children:s.childAges.length,rooms:s.units},
   roomName:t.roomName,mealPlan:t.mealPlan,cancellation:{refundable:t.cancellation.refundable,freeCancellationUntil:t.cancellation.until,penaltyAmount:t.cancellation.penalty,penaltyCurrency:t.cancellation.currency,policyKnown:true},
   cost:{amount:authenticatedQualifiedCostV3(o.qualification).completeTotal,currency:s.currency,completeness:'reported-complete',taxesIncluded:true,includedTaxes:0,excludedTaxes:0,unknownTaxes:0},bookable:true,recheckRequired:false,evidenceIds:[]});
  if(snap.length===1&&(!commercialEqualV3(snap[0].scope,proof.scope)||!commercialEqualV3(snap[0].room,proof.room)||!commercialEqualV3(snap[0].mealPlan,proof.mealPlan)||!commercialEqualV3(snap[0].cancellation,proof.cancellation)))reasons.push('ALTERNATIVE_ROOM_OR_CONDITIONS_CHANGED');
 }
 const selected=expected.find(o=>o.facts.verified!.identity.propertyId===i.decision.robustness.policyPreferredHotelId);
 if(i.comparable.status!=='recommended'||!selected||i.comparable.selectedSolutionToken!==createStableHashV3({hotelId:selected.facts.verified!.identity.propertyId},'stayopti-v3-hotel-selection-token'))reasons.push('SELECTED_OFFER_NOT_QUALIFIED');
 if(selected){const solutions=i.decision.solutions.filter(x=>x.kind==='single'&&x.segments.length===1&&x.segments[0].hotelId===selected.facts.verified!.identity.propertyId&&x.segments[0].offerId===selected.facts.decisionOfferId);
  if(solutions.length!==1||solutions[0].feasibility!=='feasible'||solutions[0].totalCost.completeness!=='reported-complete'||solutions[0].totalCost.currency!==s.currency||solutions[0].totalCost.amount===null||Math.abs(solutions[0].totalCost.amount-authenticatedQualifiedCostV3(selected.qualification).completeTotal!)>COMMERCIAL_EVIDENCE_DELTA_V3)reasons.push('SELECTED_SOLUTION_COST_OR_FEASIBILITY_CHANGED');
 }
 return reasons;
}
export function createBoundAuthenticatedCommercialV3(i:Input&{prepared:AuthenticatedCommercialPreparationV3}):BoundAuthenticatedCommercialV3{
 const errors=problems(i,i.prepared);if(errors.length)throw Error('AUTHENTICATED_BINDING_REJECTED:'+errors.join('|'));
 const body={version:i.prepared.version==='stayopti.issued-commercial-preparation@2.1'?'stayopti.bound-authenticated-commercial@2.1' as const:'stayopti.bound-authenticated-commercial@2' as const,evidenceType:'authenticated-commercial-alternative-set' as const,prepared:i.prepared,
  decisionFingerprint:i.decision.replay.decisionFingerprint,comparableFingerprint:i.comparable.decisionFingerprint,inputFingerprint:authenticatedInputFingerprintV3(i.searchInput),setFingerprint:i.prepared.assessment.fullSetFingerprint};
 const bound=Object.freeze({...body,evidenceFingerprint:createStableHashV3(body,'bound-authenticated-commercial')});issued.add(bound);return bound;
}
export function verifyBoundAuthenticatedCommercialV3(i:{decision:StayOptiDecisionV3;comparable:StayOptiComparableDecisionV3;searchInput?:SmartStayEngineV2SearchInput;evidence:BoundAuthenticatedCommercialV3}):'verified'|'failed'{
 const e=i.evidence;
 if(e.version!==(e.prepared?.version==='stayopti.issued-commercial-preparation@2.1'?'stayopti.bound-authenticated-commercial@2.1':'stayopti.bound-authenticated-commercial@2'))return 'failed';
 if(!issued.has(e)||!i.searchInput||e.decisionFingerprint!==i.decision.replay.decisionFingerprint||e.comparableFingerprint!==i.comparable.decisionFingerprint||e.setFingerprint!==e.prepared.assessment.fullSetFingerprint)return 'failed';
 return problems({...i,searchInput:i.searchInput},e.prepared).length?'failed':'verified';
}
