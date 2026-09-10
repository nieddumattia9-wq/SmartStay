// Shared evaluation-only rule extracted verbatim from the intent bridge.
import {runPersonalUtilityRolePolicyV3, type RunStayOptiPersonalUtilityRolePolicyInputV3,
  type StayOptiRolePolicySolutionInputV3} from '../policy/personalUtilityRolePolicyV3';
export interface DiagnosticDistanceExceptionV3 {
  hotelId:string; comparedWithHotelId:string; dimension:'quality'|'comfort'|'room';
  reason:'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED'; evidenceIds:string[];
}
export function applyStrongDistancePreferenceV3(
  candidates:{hotelId:string;policy:StayOptiRolePolicySolutionInputV3;distance:{status:string}|null}[],
  policyInput:RunStayOptiPersonalUtilityRolePolicyInputV3, exception?:DiagnosticDistanceExceptionV3,
) {
  const unrestricted=runPersonalUtilityRolePolicyV3(policyInput);
  const comparable=new Set(unrestricted.candidates.filter(c=>c.status==='comparable').map(c=>c.solutionId));
  const inRange=candidates.filter(c=>c.distance?.status==='satisfied'&&comparable.has(c.policy.solutionId));
  let acceptedException:string|null=null;
  if(exception){
    const out=candidates.find(c=>c.hotelId===exception.hotelId),base=inRange.find(c=>c.hotelId===exception.comparedWithHotelId);
    if(exception.reason!=='EXPLICIT_EXPERIENCE_GAIN_ACCEPTED'||!['quality','comfort','room'].includes(exception.dimension)||
      !out||!base||out.distance?.status!=='exceeded'||!comparable.has(out.policy.solutionId)||!exception.evidenceIds.length||
      exception.evidenceIds.some(id=>![...out.policy.dimensions[exception.dimension].evidenceIds,...base.policy.dimensions[exception.dimension].evidenceIds].includes(id))||
      out.policy.dimensions[exception.dimension].score===null||base.policy.dimensions[exception.dimension].score===null||
      out.policy.dimensions[exception.dimension].score!<=base.policy.dimensions[exception.dimension].score!)throw Error('DISTANCE_EXCEPTION_UNSUPPORTED');
    acceptedException=out.hotelId;
  }
  for(const c of candidates){
    const gate=c.policy.contextualEligibility!;
    if(c.distance?.status==='satisfied')continue;
    if(c.hotelId===acceptedException){gate.reasonCodes.push('intent:explicit-distance-exception-with-evidence');continue;}
    const unknown=c.distance?.status!=='exceeded';
    if(gate.status!=='ineligible')gate.status=unknown?'incomplete':'ineligible';
    gate.reasonCodes.push(unknown?'intent:preferred-distance-unverified':inRange.length?
      'intent:in-range-comparable-alternative-available':'intent:distance-exception-not-authorized');
  }
}
