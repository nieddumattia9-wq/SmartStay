import {frozenIntentRobustnessExperiments} from './intentRobustnessSyntheticV3';
import type {RunStayOptiPersonalUtilityRolePolicyInputV3} from '../../../src/engine-v3/policy/personalUtilityRolePolicyV3';

// Synthetic only. D-0046 inputs are returned unchanged, never rewritten.
export function frozenMaximumComfortBridgeInput(id = 'distance-small') {
  return structuredClone(frozenIntentRobustnessExperiments().find(f => f.family === 'equal-experience')!.scenarios.find(s => s.id === id)!.input);
}
export function maximumComfortDomainInput(rows: readonly (readonly [number, number])[]): RunStayOptiPersonalUtilityRolePolicyInputV3 {
  return {caseId:'SYNTHETIC_D0048_BAND',profile:'maximum-comfort',totalBudget:1200,currency:'EUR',nights:7,
    solutions:rows.map(([cost,score],i)=>({solutionId:`synthetic-band-${i}`,solutionType:'single-stay',totalCost:cost,currency:'EUR',
      hardConstraintsSatisfied:true,offerIntegrity:'verified',evidenceIds:[`synthetic-band-evidence-${i}`],
      dimensions:{quality:{score,evidenceIds:['synthetic-quality']},comfort:{score,evidenceIds:['synthetic-comfort']},
        location:{score,evidenceIds:['synthetic-location']},room:{score,evidenceIds:['synthetic-room']},
        flexibility:{score,evidenceIds:['synthetic-flexibility']},'long-stays':{score,evidenceIds:['synthetic-long-stays']}}}))};
}
export const MAXIMUM_COMFORT_BAND_CASES = [
  {id:'below',rows:[[300,89.500001],[400,90]],expectedCost:300},
  {id:'exact',rows:[[300,89.5],[400,90]],expectedCost:300},
  {id:'above',rows:[[300,89.499999],[400,90]],expectedCost:400},
  {id:'substantial',rows:[[300,85],[400,90]],expectedCost:400},
  {id:'equal-cost',rows:[[300,89.8],[300,90]],expectedCost:300},
  {id:'nontransitive-chain',rows:[[300,89.2],[400,89.6],[500,90]],expectedCost:400},
  {id:'true-equivalence',rows:[[300,90],[300,90],[400,90]],expectedCost:null},
] as const;
