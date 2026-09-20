import { createStableHashV3 } from '../contract/stableHashV3';
import { validateStayOptiDecisionV3, type StayOptiDecisionV3 } from '../contract/stayOptiDecisionV3';
import { COMMERCIAL_EVIDENCE_DELTA_V3, commercialEqualV3, commercialInstantV3, validateCommercialEvidenceV3 } from '../contract/commercialEvidenceV3';
import type { StayOptiComparableDecisionV3 } from '../promotion/shadowCanaryPromotionV3';
import { isPreparedCommercialEvidenceV3, type PreparedCommercialEvidenceV3 } from './syntheticCommercialProtocolsV3';

export const BOUND_COMMERCIAL_EVIDENCE_VERSION_V3='stayopti.bound-commercial-evidence@1' as const;
export interface BoundCommercialEvidenceV3 {
  version: typeof BOUND_COMMERCIAL_EVIDENCE_VERSION_V3;
  evidenceType: 'protocol-neutral-commercial-evidence'; origin: 'SYNTHETIC_ONLY';
  decisionFingerprint: string; comparableFingerprint: string; hotelSelectionToken: string;
  prepared: PreparedCommercialEvidenceV3; evidenceFingerprint: string;
}
const issued=new WeakSet<object>();
function cancellationMeaning<T extends {freeCancellationUntil:string|null}>(value:T):T {
  const at=commercialInstantV3(value.freeCancellationUntil);
  return {...value,freeCancellationUntil:at===null?value.freeCancellationUntil:new Date(at).toISOString()};
}
function bindingProblems(decision:StayOptiDecisionV3,comparable:StayOptiComparableDecisionV3,prepared:PreparedCommercialEvidenceV3):string[] {
  if(!isPreparedCommercialEvidenceV3(prepared))return ['AUTHENTICATED_PREPARATION_REQUIRED'];
  const assessment=validateCommercialEvidenceV3(prepared.evidence);
  if(assessment.status!=='SUPPORTED_AT_OBSERVATION')return [assessment.status,...assessment.reasons];
  if(!validateStayOptiDecisionV3(decision).valid)return ['DECISION_INVALID'];
  const scope=assessment.scope,context=decision.context;
  // Historical decision DTO has a count, not the ages: do not silently certify that missing binding.
  if(scope.childAges.length>0)return ['DECISION_CHILD_AGE_BINDING_UNREPRESENTABLE'];
  if(context.checkIn!==scope.checkIn||context.checkOut!==scope.checkOut||context.adults!==scope.adults||context.children!==scope.childAges.length||context.rooms!==scope.units||context.currency!==scope.currency)return ['DECISION_SCOPE_MISMATCH'];
  const token=createStableHashV3({hotelId:scope.propertyId},'stayopti-v3-hotel-selection-token');
  if(comparable.status!=='recommended'||comparable.selectedSolutionToken!==token||decision.robustness.policyPreferredHotelId!==scope.propertyId)return ['DECISION_SELECTION_MISMATCH'];
  const solutions=decision.solutions.filter(s=>s.kind==='single'&&s.segments.length===1&&s.segments[0].hotelId===scope.propertyId&&s.segments[0].offerId===scope.offerId);
  if(solutions.length!==1||solutions[0].feasibility!=='feasible')return ['DECISION_OFFER_MISMATCH'];
  const solution=solutions[0];
  if(assessment.observedTotal===null||assessment.observedTotal<=0||assessment.verifiedTotal===null||assessment.verifiedTotal<=0||solution.totalCost.amount===null||solution.totalCost.currency!==scope.currency||Math.abs(solution.totalCost.amount-assessment.observedTotal)>COMMERCIAL_EVIDENCE_DELTA_V3)return ['DECISION_COST_MISMATCH'];
  const snapshots=decision.integrity.offerSnapshots.filter(s=>s.hotelId===scope.propertyId&&s.offerId===scope.offerId);
  const proof=assessment.snapshot;
  if(snapshots.length!==1||!proof)return ['DECISION_SNAPSHOT_MISSING'];
  const snapshot=snapshots[0];
  if(!commercialEqualV3(snapshot.scope,proof.scope)||!commercialEqualV3(snapshot.room,proof.room)||!commercialEqualV3(snapshot.mealPlan,proof.mealPlan)||!commercialEqualV3(cancellationMeaning(snapshot.cancellation),cancellationMeaning(proof.cancellation)))return ['DECISION_CONDITIONS_MISMATCH'];
  if(snapshot.cost.taxes.state==='known'&&proof.cost.taxes.state==='known'&&
    (snapshot.cost.taxes.taxesIncluded!==proof.cost.taxes.taxesIncluded||Math.abs(snapshot.cost.taxes.includedAmount-proof.cost.taxes.includedAmount)>COMMERCIAL_EVIDENCE_DELTA_V3||Math.abs(snapshot.cost.taxes.excludedAmount-proof.cost.taxes.excludedAmount)>COMMERCIAL_EVIDENCE_DELTA_V3))return ['DECISION_COST_COMPONENT_MISMATCH'];
  if(snapshot.cost.fees.state==='known'&&proof.cost.fees.state==='known'&&snapshot.cost.fees.amount!==null&&proof.cost.fees.amount!==null&&Math.abs(snapshot.cost.fees.amount-proof.cost.fees.amount)>COMMERCIAL_EVIDENCE_DELTA_V3)return ['DECISION_COST_COMPONENT_MISMATCH'];
  if(prepared.evidence.events.some(e=>e.terms.restrictions.length>0))return ['DECISION_RESTRICTION_BINDING_UNREPRESENTABLE'];
  if(proof.payment.state==='known'&&(snapshot.payment.state!=='known'||!commercialEqualV3(snapshot.payment,proof.payment)))return ['DECISION_PAYMENT_MISMATCH'];
  return [];
}
export function createBoundCommercialEvidenceV3(input:{decision:StayOptiDecisionV3;comparable:StayOptiComparableDecisionV3;prepared:PreparedCommercialEvidenceV3}):BoundCommercialEvidenceV3 {
  const problems=bindingProblems(input.decision,input.comparable,input.prepared);
  if(problems.length)throw new Error('COMMERCIAL_DECISION_BINDING_REJECTED:'+problems.join('|'));
  const body={version:BOUND_COMMERCIAL_EVIDENCE_VERSION_V3,evidenceType:'protocol-neutral-commercial-evidence' as const,origin:'SYNTHETIC_ONLY' as const,
    decisionFingerprint:input.decision.replay.decisionFingerprint,comparableFingerprint:input.comparable.decisionFingerprint,
    hotelSelectionToken:input.comparable.selectedSolutionToken!,prepared:input.prepared};
  const bound=Object.freeze({...body,evidenceFingerprint:createStableHashV3(body,'stayopti-common-commercial-binding')});issued.add(bound);return bound;
}
export function verifyBoundCommercialEvidenceV3(input:{decision:StayOptiDecisionV3;comparable:StayOptiComparableDecisionV3;evidence:BoundCommercialEvidenceV3}):'verified'|'failed' {
  const e=input.evidence;
  if(!issued.has(e)||e.version!==BOUND_COMMERCIAL_EVIDENCE_VERSION_V3||e.origin!=='SYNTHETIC_ONLY'||e.decisionFingerprint!==input.decision.replay.decisionFingerprint||e.comparableFingerprint!==input.comparable.decisionFingerprint)return 'failed';
  return bindingProblems(input.decision,input.comparable,e.prepared).length===0?'verified':'failed';
}
