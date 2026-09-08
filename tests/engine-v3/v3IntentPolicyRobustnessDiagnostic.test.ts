import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frozenIntentRobustnessExperiments,INTENT_ROBUSTNESS_SPECIFICATION} from './fixtures/intentRobustnessSyntheticV3';
import {runIntentPolicyRobustnessDiagnosticV3,compareIntentDiagnosticChoice} from '../../src/engine-v3/evaluation/intentPolicyRobustnessDiagnosticV3';
import {runPersonalUtilityRolePolicyV3} from '../../src/engine-v3/policy/personalUtilityRolePolicyV3';

const fixtures=frozenIntentRobustnessExperiments();
const reports=new Map<string,ReturnType<typeof runIntentPolicyRobustnessDiagnosticV3>>();
function report(family='balanced'){if(!reports.has(family))reports.set(family,runIntentPolicyRobustnessDiagnosticV3(fixtures.find(f=>f.family===family)!));return reports.get(family)!;}
function row(family:string,id:string){return report(family).scenarios.find(s=>s.scenario.id===id)!;}
function key(index:number){return JSON.stringify([`STAY_${index}`,'RATE_1']);}
test('RD01 protocol finite, versioned, deterministic, synthetic and declared before execution',()=>{
  assert.deepEqual(fixtures,frozenIntentRobustnessExperiments());assert.equal(fixtures.length,8);
  for(const f of fixtures){assert.equal(f.protocol,INTENT_ROBUSTNESS_SPECIFICATION.version);assert.equal(f.syntheticOnly,true);assert.equal(f.scenarios[0].kind,'BASELINE');assert.equal(new Set(f.scenarios.map(s=>s.id)).size,f.scenarios.length);}
});
for(const family of INTENT_ROBUSTNESS_SPECIFICATION.families)test(`RD real bridge ${family}: every executed result equals same new policy`,()=>{
  for(const s of report(family).scenarios){if(!s.result)continue;assert.deepEqual(s.result.decision,runPersonalUtilityRolePolicyV3(s.result.policyInput));
    assert.ok(s.result.roleChecks.every(c=>c.coherent));for(const c of s.result.candidates){assert.equal(c.binding.offer!.amount,c.policyInput.totalCost??c.binding.offer!.amount);assert.equal(c.binding.snapshot!.offerId,c.binding.offer!.offerId);}}
});
test('RD02 premium experience not erased by cheap high-review shared dorm',()=>{
  const r=row('premium','baseline').result!;assert.deepEqual(r.choiceSet,[key(2)]);
  const cheap=r.candidates.find(c=>c.key===key(1))!;assert.equal(cheap.policyInput.totalCost,90);assert.equal(cheap.accommodation.unitType,'shared-room');
  assert.equal(r.candidates.find(c=>c.key===key(2))!.policyInput.totalCost,650);
});
test('RD03 manual profiles dominate, budget alone does not force luxury',()=>{
  for(const family of ['premium','automatic-market'])for(const profile of ['balanced','maximum-comfort','maximum-savings']){
    const r=row(family,`manual-${profile}`).result!;assert.equal(r.profile.effectivePreferenceId,profile);assert.equal(r.profile.source,'manual');
    if(profile==='balanced')assert.equal(r.intent.active,false);
  }
});
test('RD04 equal experience and evidence cheaper remains advantageous',()=>{assert.deepEqual(row('equal-experience','baseline').result!.choiceSet,[key(1)]);});
test('RD05 review scale UNKNOWN preserved, not manufactured; existing alternate quality evidence allowed',()=>{
  const s=row('balanced','rating-scale-unknown');assert.ok(s.scenario.input.search.hotels.every(h=>h.reviewScore===null));assert.equal(s.execution,'EXECUTED');
  assert.ok(s.result!.candidates.every(c=>c.policyInput.dimensions.quality.score!==undefined));
});
test('RD06 strong 1km is not a normal 4km recommendation',()=>{
  const r=row('strong-distance','baseline').result!;assert.ok(!r.choiceSet.includes(key(1)));const c=r.candidates.find(c=>c.key===key(1))!;
  assert.equal(c.policyInput.hardConstraintsSatisfied,true);assert.equal(c.metrics.status,'ineligible');
});
test('RD07 explicit maximum remains a hard constraint',()=>{
  const c=row('strong-distance','mandatory-cap').result!.candidates.find(c=>c.key===key(1))!;assert.equal(c.policyInput.hardConstraintsSatisfied,false);
  assert.ok(c.policyInput.contextualEligibility!.reasonCodes.includes('intent:violated:maximum-distance'));
});
test('RD08 supported contextual exception remains specific with actual excess and evidence',()=>{
  const r=row('strong-distance','exception-supported');assert.equal(r.execution,'EXECUTED');const c=r.result!.candidates.find(c=>c.key===key(1))!;
  assert.ok(c.policyInput.contextualEligibility!.reasonCodes.includes('intent:explicit-distance-exception-with-evidence'));
  assert.equal(r.result!.intent.maximumDistanceKm,1);assert.ok(Number(c.constraints.find(c=>c.code==='maximum-distance')!.actualValue)>3);
});
test('RD09 unsupported exception counted, not zero-loss or silently dropped',()=>{
  const r=row('strong-distance','exception-unsupported');assert.equal(r.execution,'NOT_EXECUTED_CONTEXT_CHANGED');assert.equal(r.comparison.outcome,'NOT_EXECUTED');
  assert.ok(r.comparison.references.length>0);assert.ok(r.comparison.references.every(r=>r.policyDisplacementLoss===null));
  assert.equal(report('strong-distance').coverage.PREFERENCE_CHANGE.notExecuted,1);
});
test('RD10 small full-price perturbations far from ceiling preserve clear equal-experience choice',()=>{
  for(const id of ['cost-0.98','cost-1.02'])assert.equal(row('equal-experience',id).comparison.outcome,'STABLE_SET');
});
test('RD11 major price crossing recomputes ceiling and explains exclusion/abstention',()=>{
  const r=row('balanced','cost-1.6');assert.equal(r.comparison.outcome,'ABSTAINED');assert.ok(r.result!.candidates.every(c=>c.metrics.budgetStatus==='over-ceiling'));
  assert.ok(r.comparison.references.every(r=>r.policyDisplacementLoss===null));
});
test('RD12 all unknown totals abstain with null losses and full denominator',()=>{
  for(const family of INTENT_ROBUSTNESS_SPECIFICATION.families){const r=row(family,'all-totals-unknown');assert.equal(r.comparison.outcome,'ABSTAINED');
    assert.ok(r.result!.candidates.every(c=>c.policyInput.totalCost===null));assert.equal(r.comparison.measuredReferences,0);assert.ok(r.comparison.referenceDenominator>0);}
});
test('RD13 mixed incomplete candidate cannot win; missing is not low quality',()=>{
  const r=row('balanced','first-total-unknown');const c=r.result!.candidates.find(c=>c.key===key(1))!;assert.equal(c.metrics.status,'incomplete');
  assert.ok(!r.result!.choiceSet.includes(key(1)));assert.equal(r.comparison.references.find(c=>c.referenceKey===key(1))!.policyDisplacementLoss,null);
});
test('RD14 privacy unknown does not become false or true; high reviews not proof',()=>{
  const c=row('balanced','privacy-required-unknown').result!.candidates.find(c=>c.key===key(1))!;
  assert.equal(c.policyInput.hardConstraintsSatisfied,null);assert.notEqual(c.metrics.status,'comparable');
});
test('RD15 evidence deterioration remains observable with critical missingness',()=>{
  const r=row('balanced','evidence-deteriorated');assert.equal(r.result!.decision.status,'abstained');assert.ok(r.result!.candidates.some(c=>c.metrics.missingDimensions.length>0));
});
test('RD16 F3 same-day evaluated offer retained even for non-pick hotel',()=>{
  const c=row('same-day-F3','baseline').result!.candidates.find(c=>c.key===key(2))!;
  assert.equal(c.binding.offer!.offerId,'offer-2');assert.equal(c.policyInput.totalCost,420);assert.equal(c.binding.snapshot!.cancellation.status,'non-refundable');
});
test('RD17 changed cancellation conditions consumed from actual bound offer',()=>{
  const s=row('balanced','nonrefundable');const c=s.result!.candidates.find(c=>c.key===key(1))!;
  assert.equal(c.binding.snapshot!.cancellation.status,'non-refundable');assert.equal(c.policyInput.totalCost,360);
});
test('RD18 equivalences compared as full sets, not representative',()=>{
  const r=row('equivalence','baseline');assert.equal(r.result!.choiceSet.length,3);assert.equal(r.result!.decision.portfolio.bestChoice.solutionId,null);
  const copy=structuredClone(r);copy.result!.decision.portfolio.bestChoice.presentationRepresentativeSolutionId='synthetic-output-only-change';
  assert.equal(compareIntentDiagnosticChoice(r,copy).outcome,'STABLE_SET');
});
test('RD19 identities/order never change semantic choice, roles, eligibility or merit',()=>{
  for(const family of INTENT_ROBUSTNESS_SPECIFICATION.families){const base=row(family,'baseline').result!;
    for(const seed of [1,2,3]){const s=row(family,`identity-order-${seed}`);assert.equal(s.comparison.outcome,'STABLE_SET');
      assert.deepEqual(s.result!.candidates.map(c=>[c.key,c.metrics.status,c.metrics.totalCost,c.metrics.experienceScore,c.metrics.personalUtilityScore,c.metrics.evidenceCoverage]),base.candidates.map(c=>[c.key,c.metrics.status,c.metrics.totalCost,c.metrics.experienceScore,c.metrics.personalUtilityScore,c.metrics.evidenceCoverage]));
      assert.deepEqual(s.result!.roleChecks.map(r=>[r.role,r.selection.status,r.keys,r.selection.metrics]),base.roleChecks.map(r=>[r.role,r.selection.status,r.keys,r.selection.metrics]));}}
});
test('RD20 displacement is against actual policy class, not utility argmax',()=>{
  // Component-level synthetic adversarial check: actual Maximum Savings chooses
  // cheapest even when the second feasible alternative has greater utility.
  const control=row('maximum-savings','baseline'), p=structuredClone(control.result!.policyInput);
  p.totalBudget=10000;p.solutions=p.solutions.slice(0,2);p.solutions.forEach((s,i)=>{s.totalCost=100+i;s.contextualEligibility={version:'stayopti.intent-context-eligibility@1',status:'eligible',reasonCodes:[]};s.hardConstraintsSatisfied=true;s.offerIntegrity='verified';
    for(const d of Object.values(s.dimensions)){d.score=i?95:70;d.evidenceIds=['synthetic-component'];}});
  const decision=runPersonalUtilityRolePolicyV3(p);assert.equal(decision.portfolio.bestChoice.solutionId,p.solutions[0].solutionId);
  assert.ok(decision.candidates[1].personalUtilityScore!>decision.candidates[0].personalUtilityScore!);
  const unit=structuredClone(control);unit.result!.decision=decision;unit.result!.choiceSet=[key(1)];
  unit.result!.candidates=unit.result!.candidates.slice(0,2).map((c,i)=>({...c,metrics:decision.candidates[i]}));
  const measured=compareIntentDiagnosticChoice(unit,unit);assert.equal(measured.references[0].policyDisplacementLoss,0);
  assert.equal(measured.references[0].components[0].winnerMinusReferenceUtilityPoints,0);
});
test('RD21 no-baseline choice explicit, never silently usable',()=>{
  const unknown=row('balanced','all-totals-unknown');assert.equal(compareIntentDiagnosticChoice(unknown,row('balanced','baseline')).outcome,'NO_BASELINE_CHOICE');
});
test('RD22 unmapped offer and malformed input rejected, not contextual non-execution',()=>{
  const copy=structuredClone(fixtures[0]);copy.scenarios[0].correspondence[0].offers[0].offerId='missing';assert.throws(()=>runIntentPolicyRobustnessDiagnosticV3(copy),/CORRESPONDENCE/);
  const malformed=structuredClone(fixtures[0]);malformed.scenarios[0].input.search.rooms=null;assert.throws(()=>runIntentPolicyRobustnessDiagnosticV3(malformed),/INTENT_CONTEXT_INVALID/);
});
test('RD23 preference changes have separate denominators and no synthetic probability claim',()=>{
  for(const family of INTENT_ROBUSTNESS_SPECIFICATION.families){const r=report(family);for(const [kind,c] of Object.entries(r.coverage)){
    assert.equal(c.scenarioDenominator,c.stable+c.changed+c.abstained+c.notExecuted+c.noBaselineChoice);assert.equal(c.referenceDenominator,c.measuredReferences+c.unmeasured.length);
    assert.equal(c.scenarioDenominator,r.scenarios.filter(s=>s.scenario.kind===kind).length);}
    assert.equal(r.cardinalRegret,'NOT_DEFINED');assert.equal(r.fullRobustnessCertification,false);assert.equal(r.policyWinnerReplaced,false);assert.equal(r.goldenAdmission,false);}
});
test('RD24 pure evaluation does not mutate frozen inputs or import historical diagnostics',()=>{
  const copy=structuredClone(fixtures[0]);runIntentPolicyRobustnessDiagnosticV3(copy);assert.deepEqual(copy,fixtures[0]);
  const code=readFileSync('src/engine-v3/evaluation/intentPolicyRobustnessDiagnosticV3.ts','utf8');assert.doesNotMatch(code,/from\s+['"].*(?:robustness\/|server\/providers|engine-v2)/);
});
test('RD25 Comfort experience band can reject utility argmax without false regret',()=>{
  const control=row('balanced','baseline'),p=structuredClone(control.result!.policyInput);p.profile='comfort';p.totalBudget=1000;
  p.solutions=p.solutions.slice(0,2);p.solutions.forEach((s,i)=>{s.totalCost=i?1000:1;s.contextualEligibility={version:'stayopti.intent-context-eligibility@1',status:'eligible',reasonCodes:[]};
    for(const d of Object.values(s.dimensions)){d.score=i?90:86.5;d.evidenceIds=['synthetic-band'];}});
  const d=runPersonalUtilityRolePolicyV3(p);assert.equal(d.portfolio.bestChoice.solutionId,p.solutions[1].solutionId);
  assert.ok(d.candidates[0].personalUtilityScore!>d.candidates[1].personalUtilityScore!);
  const unit=structuredClone(control);unit.result!.decision=d;unit.result!.choiceSet=[key(2)];unit.result!.candidates=unit.result!.candidates.slice(0,2).map((c,i)=>({...c,metrics:d.candidates[i]}));
  assert.equal(compareIntentDiagnosticChoice(unit,unit).references[0].policyDisplacementLoss,0);
});
test('RD26 changed evaluated offer is not confused with same-hotel stability',()=>{
  const control=row('balanced','baseline'),changed=structuredClone(control);const old=key(1),replacement=JSON.stringify(['STAY_1','RATE_2']);
  changed.result!.candidates.find(c=>c.key===old)!.key=replacement;changed.result!.choiceSet=[replacement];
  const result=compareIntentDiagnosticChoice(control,changed);assert.equal(result.outcome,'CHANGED_SET');
  assert.equal(result.references[0].status,'REFERENCE_OFFER_NOT_EVALUATED');assert.equal(result.references[0].policyDisplacementLoss,null);
});
