// D-0046: bounded evaluation, never a replacement selector or a promotion gate.
import {runIntentRolePolicyBridgeV3, type IntentRoleBridgeInputV3} from './intentRolePolicyBridgeV3';
import {validatePersonalUtilityRolePolicyV3} from '../policy/personalUtilityRolePolicyV3';

export const INTENT_DIAGNOSTIC_PROTOCOL = 'stayopti.synthetic.intent-policy-robustness@1' as const;
export type DiagnosticScenarioKind = 'BASELINE' | 'DATA_PERTURBATION' | 'USER_CONTEXT_CHANGE' | 'PREFERENCE_CHANGE' | 'INVARIANCE_CONTROL';
export interface IntentDiagnosticScenario {
  id: string;
  kind: DiagnosticScenarioKind;
  change: string;
  expectedProperty: string;
  input: IntentRoleBridgeInputV3;
  // Explicit experiment correspondence, not a ranking feature. Offers are distinct.
  correspondence: {alternativeKey: string; hotelId: string; offers: {offerKey: string; offerId: string}[]}[];
}
export interface IntentDiagnosticExperiment {
  protocol: typeof INTENT_DIAGNOSTIC_PROTOCOL;
  syntheticOnly: true;
  family: string;
  scenarios: IntentDiagnosticScenario[];
}
type Bridge = ReturnType<typeof runIntentRolePolicyBridgeV3>;

function assertScenario(s: IntentDiagnosticScenario) {
  if (!s.id || !s.change || !s.expectedProperty || !['BASELINE','DATA_PERTURBATION','USER_CONTEXT_CHANGE','PREFERENCE_CHANGE','INVARIANCE_CONTROL'].includes(s.kind)) throw Error('DIAGNOSTIC_SCENARIO_INVALID');
  const hotels = s.input.search.hotels, refs = s.correspondence;
  if (refs.length !== hotels.length || new Set(refs.map(r=>r.alternativeKey)).size !== refs.length ||
      new Set(refs.map(r=>r.hotelId)).size !== refs.length) throw Error('DIAGNOSTIC_CORRESPONDENCE_INVALID');
  for (const r of refs) {
    const hotel = hotels.find(h=>h.id===r.hotelId);
    if (!r.alternativeKey || !hotel || r.offers.length!==hotel.offers.length ||
      new Set(r.offers.map(o=>o.offerKey)).size!==r.offers.length || new Set(r.offers.map(o=>o.offerId)).size!==r.offers.length ||
      r.offers.some(o=>!o.offerKey || !hotel.offers.some(h=>h.id===o.offerId))) throw Error('DIAGNOSTIC_CORRESPONDENCE_INVALID');
  }
}

function evaluate(s: IntentDiagnosticScenario) {
  assertScenario(s);
  let r: Bridge;
  try { r = runIntentRolePolicyBridgeV3(structuredClone(s.input)); }
  catch (error) {
    // Only this explicit contextual failure is non-execution; schema/integrity
    // errors still throw. No arbitrary substitute for an invalidated exception.
    if (!(error instanceof Error) || error.message!=='DISTANCE_EXCEPTION_UNSUPPORTED') throw error;
    return {scenario:s, execution:'NOT_EXECUTED_CONTEXT_CHANGED' as const, reason:error.message, result:null};
  }
  const validation = validatePersonalUtilityRolePolicyV3(r.decision);
  if (!validation.valid) throw Error('DIAGNOSTIC_POLICY_INVALID');
  const key = (id: string) => {
    const c = r.candidates.find(c=>c.policy.solutionId===id);
    const ref = s.correspondence.find(ref=>ref.hotelId===c?.hotelId);
    const offer = ref?.offers.find(o=>o.offerId===c?.selectedOffer?.offerId);
    if (!c || !ref || !offer) throw Error('DIAGNOSTIC_SELECTED_OFFER_UNMAPPED');
    return JSON.stringify([ref.alternativeKey,offer.offerKey]);
  };
  const candidates = r.candidates.map(c=>{
    const metrics = r.decision.candidates.find(d=>d.solutionId===c.policy.solutionId)!;
    return {key:key(c.policy.solutionId), binding:{hotelId:c.hotelId,offer:c.selectedOffer,snapshot:c.snapshot},
      policyInput:c.policy, metrics, intentTarget:c.target, constraints:c.constraints,
      accommodation:c.accommodation, mandatoryRequirements:c.mandatoryRequirements};
  }).sort((a,b)=>a.key.localeCompare(b.key)); // Output enumeration only, after decision.
  const roleChecks = (['bestSensibleSaving','worthwhileComfortUpgrade'] as const).map(role=>{
    const selection=r.decision.portfolio[role];
    const selected=selection.solutionId===null?null:r.decision.candidates.find(c=>c.solutionId===selection.solutionId)!;
    const choice=r.decision.portfolio.bestChoice.solutionId===null?null:r.decision.candidates.find(c=>c.solutionId===r.decision.portfolio.bestChoice.solutionId)!;
    const coherent=selection.status!=='selected' || (!!choice && !!selected && selected.status==='comparable' &&
      selected.solutionId!==choice.solutionId && selected.evidenceCoverage>=0.6 && (role==='bestSensibleSaving'
        ? selected.totalCost!<choice.totalCost! && choice.qualityScore!-selected.qualityScore!<=r.decision.profileSettings.savingQualityLossTolerance &&
          choice.experienceScore!-selected.experienceScore!<=r.decision.profileSettings.savingExperienceLossTolerance
        : selected.totalCost!>choice.totalCost! && selected.experienceScore!-choice.experienceScore!>=r.decision.profileSettings.upgradeMinimumExperienceGain &&
          (selected.experienceScore!-choice.experienceScore!)/(selected.totalCost!-choice.totalCost!)*100>=r.decision.profileSettings.upgradeMinimumMarginalValuePer100));
    if (!coherent) throw Error('DIAGNOSTIC_ROLE_INCOHERENT');
    return {role,coherent,selection,keys:selection.equivalentSolutionIds.map(key).sort()};
  });
  return {scenario:s,execution:'EXECUTED' as const,reason:null,result:{
    policyVersion:r.decision.policyVersion, profile:r.profile,intent:r.intent,
    policyInput:r.policyInput,decision:r.decision,candidates,roleChecks,
    choiceSet:r.decision.portfolio.bestChoice.equivalentSolutionIds.map(key).sort(),
    explanation:r.contextualExplanation,
    // Deliberately no legacyDiagnostic/legacy regret/winner or bridge sensitivity.
  }};
}
export type IntentDiagnosticEvaluation = ReturnType<typeof evaluate>;

export function compareIntentDiagnosticChoice(baseline: IntentDiagnosticEvaluation, scenario: IntentDiagnosticEvaluation) {
  const b=baseline.result, s=scenario.result;
  const outcome = !s ? 'NOT_EXECUTED' : !s.choiceSet.length ? 'ABSTAINED' : !b?.choiceSet.length ? 'NO_BASELINE_CHOICE' :
    JSON.stringify(b.choiceSet)===JSON.stringify(s.choiceSet) ? 'STABLE_SET' : 'CHANGED_SET';
  const references=(b?.choiceSet??[]).map(referenceKey=>{
    const current=s?.candidates.find(c=>c.key===referenceKey);
    const status=!s?'SCENARIO_NOT_EXECUTED':!s.choiceSet.length?'SCENARIO_ABSTAINED':!current?'REFERENCE_OFFER_NOT_EVALUATED':
      current.metrics.status!=='comparable'?`REFERENCE_${current.metrics.status.toUpperCase()}`:'MEASURED';
    const measured=status==='MEASURED';
    return {referenceKey,status,
      // A policy membership loss, NOT cardinal welfare/post-stay regret. Applies
      // to the actual choice class, including Comfort band and cost-first rules.
      policyDisplacementLoss:measured?(s!.choiceSet.includes(referenceKey)?0:1):null,
      reasons:current?[...current.metrics.reasonCodes,...(current.policyInput.contextualEligibility?.reasonCodes??[])]:[status],
      components:measured?s!.choiceSet.map(winnerKey=>{
        const winner=s!.candidates.find(c=>c.key===winnerKey)!;
        return {winnerKey,currency:scenario.scenario.input.search.currency,
          referenceMinusWinnerCost:current!.metrics.totalCost!-winner.metrics.totalCost!,
          winnerMinusReferenceExperiencePoints:winner.metrics.experienceScore!-current!.metrics.experienceScore!,
          winnerMinusReferenceUtilityPoints:winner.metrics.personalUtilityScore!-current!.metrics.personalUtilityScore!,
          winnerMinusReferenceEvidenceCoverage:winner.metrics.evidenceCoverage-current!.metrics.evidenceCoverage};
      }):[],
    };
  });
  return {outcome,references,referenceDenominator:references.length,measuredReferences:references.filter(r=>r.status==='MEASURED').length,
    cause:{declaredIntervention:scenario.scenario.change,
      candidateChanges:s?.candidates.flatMap<{key:string;field:string;before:unknown;after:unknown}>(c=>{
        const previous=b?.candidates.find(p=>p.key===c.key);if(!previous)return [{key:c.key,field:'evaluated-offer',before:null,after:c.key}];
        const fields=['status','totalCost','experienceScore','personalUtilityScore','evidenceCoverage','qualityScore','budgetStatus'] as const;
        return fields.filter(field=>previous.metrics[field]!==c.metrics[field]).map(field=>({key:c.key,field,before:previous.metrics[field],after:c.metrics[field]}));
      })??[],
      baselineProfile:b?.profile??null,scenarioProfile:s?.profile??null,
      baselineTarget:b?.intent.targetExperienceFloor??null,scenarioTarget:s?.intent.targetExperienceFloor??null,
      baselineChoice:b?.choiceSet??[],scenarioChoice:s?.choiceSet??[],
      evidence:s?.candidates.map(c=>({key:c.key,status:c.metrics.status,reasons:[...c.metrics.reasonCodes,...(c.policyInput.contextualEligibility?.reasonCodes??[])],
        totalCost:c.metrics.totalCost,experience:c.metrics.experienceScore,utility:c.metrics.personalUtilityScore,dimensions:c.policyInput.dimensions,
        distance:c.constraints.find(x=>x.code==='maximum-distance')??null}))??[]}};
}

export function runIntentPolicyRobustnessDiagnosticV3(experiment: IntentDiagnosticExperiment) {
  if (experiment.protocol!==INTENT_DIAGNOSTIC_PROTOCOL || experiment.syntheticOnly!==true || !experiment.family ||
      experiment.scenarios.length<2 || experiment.scenarios[0].kind!=='BASELINE' ||
      experiment.scenarios.slice(1).some(s=>s.kind==='BASELINE') || new Set(experiment.scenarios.map(s=>s.id)).size!==experiment.scenarios.length) throw Error('DIAGNOSTIC_PROTOCOL_INVALID');
  // Validate the entire experiment before any evaluation.
  experiment.scenarios.forEach(assertScenario);
  const evaluations=experiment.scenarios.map(evaluate), baseline=evaluations[0];
  const scenarios=evaluations.map(e=>({...e,comparison:compareIntentDiagnosticChoice(baseline,e)}));
  const coverage=Object.fromEntries((['DATA_PERTURBATION','USER_CONTEXT_CHANGE','PREFERENCE_CHANGE','INVARIANCE_CONTROL'] as const).map(kind=>{
    const rows=scenarios.filter(s=>s.scenario.kind===kind);
    return [kind,{scenarioDenominator:rows.length,executed:rows.filter(r=>r.execution==='EXECUTED').length,
      stable:rows.filter(r=>r.comparison.outcome==='STABLE_SET').length,changed:rows.filter(r=>r.comparison.outcome==='CHANGED_SET').length,
      abstained:rows.filter(r=>r.comparison.outcome==='ABSTAINED').length,notExecuted:rows.filter(r=>r.comparison.outcome==='NOT_EXECUTED').length,
      noBaselineChoice:rows.filter(r=>r.comparison.outcome==='NO_BASELINE_CHOICE').length,
      referenceDenominator:rows.reduce((n,r)=>n+r.comparison.referenceDenominator,0),measuredReferences:rows.reduce((n,r)=>n+r.comparison.measuredReferences,0),
      unmeasured:rows.flatMap(r=>r.comparison.references.filter(x=>x.status!=='MEASURED').map(x=>({scenario:r.scenario.id,key:x.referenceKey,reason:x.status})))}];
  }));
  return {protocol:experiment.protocol,family:experiment.family,scope:'FINITE_SYNTHETIC_SAME_POLICY_DIAGNOSTIC',scenarios,coverage,
    lossDefinition:'POLICY_DISPLACEMENT_MEMBERSHIP_0_OR_1_WITH_SEPARATE_SIGNED_COMPONENTS',
    cardinalRegret:'NOT_DEFINED',fullRobustnessCertification:false,policyWinnerReplaced:false,
    legacyMetricsUsed:false,publicIntegrationEnabled:false,goldenAdmission:false,realDataExecuted:false};
}
