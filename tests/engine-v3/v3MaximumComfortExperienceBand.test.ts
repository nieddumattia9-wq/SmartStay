import assert from 'node:assert/strict';
import test from 'node:test';
import {runIntentRolePolicyBridgeV3} from '../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';
import {frozenMaximumComfortBridgeInput,maximumComfortDomainInput,MAXIMUM_COMFORT_BAND_CASES} from './fixtures/maximumComfortBandSyntheticV3';
import {runPersonalUtilityRolePolicyV3,validatePersonalUtilityRolePolicyV3,verifyPersonalUtilityRolePolicyReplayV3,STAYOPTI_ROLE_POLICY_PROFILES_V3} from '../../src/engine-v3/policy/personalUtilityRolePolicyV3';
import {createStableHashV3} from '../../src/engine-v3/contract/stableHashV3';
import {frozenIntentRobustnessExperiments} from './fixtures/intentRobustnessSyntheticV3';
import {privacyNegationInput} from './fixtures/stayPrivacyNegationSyntheticV3';
import {readFileSync} from 'node:fs';

test('MC01 frozen D46 +50m retains 300 EUR: 0.132 experience gain does not justify 100 EUR',()=>{
  const input=frozenMaximumComfortBridgeInput(),result=runIntentRolePolicyBridgeV3(input);
  assert.equal(result.profile.effectivePreferenceId,'maximum-comfort');
  assert.deepEqual(result.decision.candidates.map(c=>c.experienceScore).sort(),[92.330875,92.462875,92.462875]);
  assert.equal(result.decision.portfolio.bestChoice.metrics.totalCost,300);
  assert.deepEqual(input,frozenMaximumComfortBridgeInput());
});

for(const c of MAXIMUM_COMFORT_BAND_CASES)test(`MC boundary/domain ${c.id}`,()=>{
  const input=maximumComfortDomainInput(c.rows),r=runPersonalUtilityRolePolicyV3(input),choice=r.portfolio.bestChoice;
  assert.equal(choice.metrics.totalCost,c.expectedCost);assert.equal(validatePersonalUtilityRolePolicyV3(r).valid,true);
  if(c.id==='true-equivalence'){assert.equal(choice.status,'decisionally-equivalent');assert.equal(choice.solutionId,null);assert.equal(choice.equivalentSolutionIds.length,2);}
  else assert.equal(choice.status,'selected');
  if(c.id==='equal-cost')assert.equal(choice.metrics.experienceScore,90);
  if(c.id==='nontransitive-chain'){assert.equal(choice.explanation.experienceBandComparison!.bandCount,2);assert.equal(choice.metrics.experienceLoss,0.4);}
});
test('MC02 frozen baseline remains 300 with no claimed quality superiority',()=>{
  const r=runIntentRolePolicyBridgeV3(frozenMaximumComfortBridgeInput('baseline'));
  assert.equal(r.decision.portfolio.bestChoice.metrics.totalCost,300);
  assert.equal(r.decision.portfolio.bestChoice.metrics.experienceLoss,0);
});
test('MC03 explanation binds the actual 0.132 position tradeoff and 100 EUR, not quality gain',()=>{
  const r=runIntentRolePolicyBridgeV3(frozenMaximumComfortBridgeInput()),c=r.decision.portfolio.bestChoice;
  const b=c.explanation.experienceBandComparison!,other=b.comparisons.find(x=>x.totalCost===400)!;
  assert.equal(b.experienceLossTolerance,0.5);assert.equal(b.selectedExperienceLoss,0.132);assert.equal(b.maximumExperience,92.462875);
  assert.equal(other.additionalCostVsSelection,100);assert.equal(other.experienceGainVsSelection,0.132);
  assert.equal(other.dimensions.find(d=>d.dimension==='quality')!.scoreDeltaVsSelection,0);
  assert.ok(other.dimensions.find(d=>d.dimension==='location')!.scoreDeltaVsSelection!>0);
  assert.ok(other.dimensions.find(d=>d.dimension==='location')!.evidenceIds.length>0);
  assert.equal(c.explanation.mainSacrifice,'experience-loss-within-profile-band:0.132');
  assert.equal(c.decisionTieClassification,'DECISIONALLY_DISTINCT');assert.equal(b.bandIsEquivalenceClass,false);
  assert.equal(r.decision.portfolio.bestSensibleSaving.status,'not-applicable');assert.equal(r.decision.portfolio.worthwhileComfortUpgrade.status,'not-applicable');
});
function semantics(r:ReturnType<typeof runIntentRolePolicyBridgeV3>){
  return Object.entries(r.decision.portfolio).map(([role,c])=>({role,status:c.status,classification:c.decisionTieClassification,metrics:c.metrics,
    explanation:{...c.explanation,evidenceIds:[],experienceBandComparison:c.explanation.experienceBandComparison?{...c.explanation.experienceBandComparison,
      comparisons:c.explanation.experienceBandComparison.comparisons.map(x=>({...x,solutionId:'OPAQUE',dimensions:x.dimensions.map(d=>({...d,evidenceIds:[]}))}))}:null}}));
}
test('MC04 complete bridge provider, hotel/offer IDs and all six permutations retain decisions and explanation',()=>{
  const f=frozenMaximumComfortBridgeInput(),expected=semantics(runIntentRolePolicyBridgeV3(f));
  for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(const seed of [1,7,91]){
    const c=structuredClone(f);c.search.hotels.forEach((h,i)=>{h.id=`OPAQUE_${seed}_${9-i}`;h.provider=`invented-provider-${seed}`;h.dataSources=[h.provider];h.offers.forEach((o,j)=>{o.id=`offer-${seed*100+i*10+j}`;o.provider=h.provider;});});
    c.search.hotels=order.map(i=>c.search.hotels[i]);assert.deepEqual(semantics(runIntentRolePolicyBridgeV3(c)),expected);
  }
});
test('MC05 anchored three-member band independent of order, IDs, no chained equivalence',()=>{
  const input=maximumComfortDomainInput([[300,89.2],[400,89.6],[500,90]]);
  for(const order of [[0,1,2],[2,1,0],[1,0,2],[0,2,1],[1,2,0],[2,0,1]]){
    const c=structuredClone(input);c.solutions.forEach((s,i)=>s.solutionId=`opaque-${9-i}`);c.solutions=order.map(i=>c.solutions[i]);
    const r=runPersonalUtilityRolePolicyV3(c);assert.equal(r.portfolio.bestChoice.metrics.totalCost,400);assert.equal(r.portfolio.bestChoice.decisionTieClassification,'DECISIONALLY_DISTINCT');
  }
});
for(const kind of ['mandatory-cap','strong-preference'] as const)test(`MC06 full bridge ${kind} cannot be relaxed by band across a 50m crossing`,()=>{
  const f=frozenMaximumComfortBridgeInput('baseline');f.distance.semantics=kind;f.search.maximumDistanceKm=1;
  f.search.hotels.forEach((h,i)=>{h.distance=i?0.98:1.03;h.latitude=h.distance*0.009;h.longitude=0;});
  const r=runIntentRolePolicyBridgeV3(f),first=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.notEqual(r.decision.portfolio.bestChoice.solutionId,first.policy.solutionId);
  assert.equal(r.decision.candidates.find(c=>c.solutionId===first.policy.solutionId)!.status,'ineligible');
  assert.equal(first.policy.hardConstraintsSatisfied,kind==='mandatory-cap'?false:true);
});
for(const id of ['first-total-unknown','all-totals-unknown','rating-scale-unknown'])test(`MC07 full bridge ${id} does not fabricate eligibility`,()=>{
  const r=runIntentRolePolicyBridgeV3(frozenMaximumComfortBridgeInput(id));
  if(id==='all-totals-unknown')assert.equal(r.decision.status,'abstained');
  else if(id==='first-total-unknown'){assert.equal(r.decision.portfolio.bestChoice.metrics.totalCost,400);assert.ok(r.decision.candidates.some(c=>c.status==='incomplete'&&c.totalCost===null));}
  else assert.ok(r.candidates.every(c=>c.policy.dimensions.quality.score!==undefined));
});
test('MC08 offer negation overrides generic privacy and mandatory bathroom remains unmet',()=>{
  const f=privacyNegationInput('Private room without a private bathroom',['Private bathroom']);f.search.preferenceId='maximum-comfort';
  const r=runIntentRolePolicyBridgeV3(f),c=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.equal(c.suitability.facts.bathroomState,'NOT_PRIVATE');assert.equal(c.policy.hardConstraintsSatisfied,false);
  assert.notEqual(r.decision.portfolio.bestChoice.solutionId,c.policy.solutionId);
});
test('MC09 budget expansion keeps global band anchored, no permission to breach ceiling',()=>{
  const f=maximumComfortDomainInput([[300,89.2],[400,89.6],[500,90]]);f.totalBudget=450;
  const before=runPersonalUtilityRolePolicyV3(f);assert.equal(before.portfolio.bestChoice.metrics.totalCost,300);
  f.totalBudget=550;const after=runPersonalUtilityRolePolicyV3(f);assert.equal(after.portfolio.bestChoice.metrics.totalCost,400);
  assert.ok(after.portfolio.bestChoice.metrics.experienceScore!>=before.portfolio.bestChoice.metrics.experienceScore!);
  for(const id of ['budget-0.9','budget-1.1'])assert.equal(runIntentRolePolicyBridgeV3(frozenMaximumComfortBridgeInput(id)).decision.portfolio.bestChoice.metrics.totalCost,300);
});
test('MC10 dominated and incomplete offers excluded BEFORE maximum experience anchoring',()=>{
  const f=maximumComfortDomainInput([[300,89.7],[400,90],[500,100],[350,89.6]]);f.solutions[2].totalCost=null;
  const r=runPersonalUtilityRolePolicyV3(f),b=r.portfolio.bestChoice.explanation.experienceBandComparison!;
  assert.equal(b.maximumExperience,90);assert.equal(b.eligibleCount,2);assert.equal(r.portfolio.bestChoice.metrics.totalCost,300);
  assert.ok(r.candidates.find(c=>c.solutionId===f.solutions[3].solutionId)!.dominatedBySolutionIds.length);
});
test('MC11 partial dimensions stay null, coverage distinct from quality and no invented delta',()=>{
  const f=maximumComfortDomainInput([[300,90],[400,90]]);f.solutions[0].dimensions.location.score=null;
  const r=runPersonalUtilityRolePolicyV3(f),c=r.candidates.find(c=>c.solutionId===f.solutions[0].solutionId)!;
  assert.equal(c.experienceScore,90);assert.ok(c.evidenceCoverage<1);
  assert.ok(r.portfolio.bestChoice.explanation.experienceBandComparison!.comparisons.every(x=>x.dimensions.find(d=>d.dimension==='location')!.scoreDeltaVsSelection===null));
});
test('MC12 different scores inside band are not decision ties; true ties retain class',()=>{
  const f=maximumComfortDomainInput([[300,89.7],[300,89.7],[400,90]]),r=runPersonalUtilityRolePolicyV3(f);
  assert.equal(r.status,'decisionally-equivalent');assert.equal(r.portfolio.bestChoice.equivalentSolutionIds.length,2);
  assert.equal(r.portfolio.bestChoice.explanation.experienceBandComparison!.bandCount,3);
  assert.equal(r.portfolio.bestChoice.explanation.experienceBandComparison!.bandIsEquivalenceClass,false);
});
function rehash(r:ReturnType<typeof runPersonalUtilityRolePolicyV3>){const {fingerprint:_,...p}=r;r.fingerprint=createStableHashV3(p,'stayopti-v3-personal-utility-role-policy-result');return r;}
test('MC13 validator rejects trace/cost/tolerance tampering even with recomputed result fingerprint',()=>{
  const base=runPersonalUtilityRolePolicyV3(maximumComfortDomainInput([[300,89.7],[400,90]]));
  for(const mutate of [
    (r:typeof base)=>{r.portfolio.bestChoice.explanation.experienceBandComparison!.experienceLossTolerance=1;},
    (r:typeof base)=>{r.portfolio.bestChoice.explanation.experienceBandComparison!.comparisons[0].additionalCostVsSelection=900;},
    (r:typeof base)=>{r.profileSettings.choiceExperienceLossTolerance=1;},
    (r:typeof base)=>{r.portfolio.bestChoice.metrics.experienceLoss=0;},
    (r:typeof base)=>{r.portfolio.bestChoice.explanation.mainSacrifice='superior-quality';},
    (r:typeof base)=>{r.portfolio.bestChoice.solutionId='synthetic-band-1';r.portfolio.bestChoice.equivalentSolutionIds=['synthetic-band-1'];},
  ]){const r=structuredClone(base);mutate(r);assert.equal(validatePersonalUtilityRolePolicyV3(rehash(r)).valid,false);}
});
test('MC14 schema/version advance rejects historical payload rather than migrating it',()=>{
  const f=maximumComfortDomainInput([[300,89.7],[400,90]]),r=runPersonalUtilityRolePolicyV3(f);
  assert.equal(r.policyVersion,'3.0.0-personal-utility-role-policy.3');assert.equal(r.schemaVersion,'3.0.0-personal-utility-role-policy-schema.3');
  const old=structuredClone(r);old.policyVersion='3.0.0-personal-utility-role-policy.2' as typeof old.policyVersion;
  assert.equal(validatePersonalUtilityRolePolicyV3(rehash(old)).valid,false);assert.equal(verifyPersonalUtilityRolePolicyReplayV3(f,old),false);
});
test('MC15 all other profiles keep previous selection semantics and no Maximum Comfort trace',()=>{
  for(const profile of STAYOPTI_ROLE_POLICY_PROFILES_V3.filter(p=>p!=='maximum-comfort')){
    const f=maximumComfortDomainInput([[300,89.7],[400,90]]);f.profile=profile;const r=runPersonalUtilityRolePolicyV3(f);
    assert.equal(r.portfolio.bestChoice.metrics.totalCost,300);assert.equal(r.portfolio.bestChoice.explanation.experienceBandComparison,undefined);
    assert.equal(validatePersonalUtilityRolePolicyV3(r).valid,true);
  }
});
test('MC16 frozen 187 inputs and public firewall remain intact',()=>{
  assert.equal(frozenIntentRobustnessExperiments().flatMap(e=>e.scenarios).length,187);
  const r=runIntentRolePolicyBridgeV3(frozenMaximumComfortBridgeInput());assert.equal(r.publicIntegrationEnabled,false);assert.equal(r.goldenAdmission,false);
  const source=readFileSync('src/engine-v3/policy/personalUtilityRolePolicyV3.ts','utf8');
  assert.doesNotMatch(source,/from\s+['"].*(?:server\/providers|liteapi|serpapi|routestack)/i);
});
