import assert from 'node:assert/strict';
import test from 'node:test';
import {runIntentRolePolicyBridgeV3} from '../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';
import {evaluateSmartStaySearchV2} from '../../src/engine-v2/orchestrator/smartStayEngineV2';
import {validatePersonalUtilityRolePolicyV3} from '../../src/engine-v3/policy/personalUtilityRolePolicyV3';
import {resolveEvaluatedOfferV3} from '../../src/engine-v3/adapter/evaluatedOfferBindingV3';
import {frozenUpgradeBridgeCases,upgradeBridgeInput,UPGRADE_BRIDGE_SPECIFICATION} from './fixtures/upgradeBridgeSyntheticV3';

const cases=frozenUpgradeBridgeCases();
const run=(id:string)=>runIntentRolePolicyBridgeV3(structuredClone(cases.find(c=>c.id===id)!.input));
const candidate=(r:ReturnType<typeof run>,i=1)=>r.candidates.find(c=>c.hotelId===`SYNTHETIC_UPGRADE_${i}`)!;
const evaluated=(r:ReturnType<typeof run>,i=1)=>r.decision.candidates.find(c=>c.solutionId===candidate(r,i).policy.solutionId)!;
const round=(n:number)=>Math.round((n+Number.EPSILON)*1e6)/1e6;

// Explicit identity-elision: retain all decision metrics, reasons, dimensions,
// eligibility and semantic class membership; omit only opaque references.
function semantic(r:ReturnType<typeof run>) {
  const projection=(id:string)=>{const c=r.decision.candidates.find(c=>c.solutionId===id)!;
    const source=r.candidates.find(s=>s.policy.solutionId===id)!;
    return {status:c.status,cost:c.totalCost,budget:c.budgetStatus,experience:c.experienceScore,quality:c.qualityScore,
      utility:c.personalUtilityScore,opportunity:c.opportunityCostPoints,coverage:c.evidenceCoverage,reasons:c.reasonCodes,
      hard:source.policy.hardConstraintsSatisfied,integrity:source.policy.offerIntegrity,context:source.policy.contextualEligibility,
      dimensions:c.contributions.map(({evidenceIds:_,...d})=>d)};};
  const sort=(a:unknown[])=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return {profile:r.profile,status:r.decision.status,candidates:sort(r.decision.candidates.map(c=>projection(c.solutionId))),
    roles:Object.fromEntries(Object.entries(r.decision.portfolio).map(([k,p])=>[k,{status:p.status,classification:p.decisionTieClassification,
      selected:p.solutionId?projection(p.solutionId):null,equivalent:sort(p.equivalentSolutionIds.map(projection)),
      representative:p.presentationRepresentativeSolutionId?projection(p.presentationRepresentativeSolutionId):null,
      metrics:p.metrics,explanation:{...p.explanation,evidenceIds:[]},reasons:p.reasonCodes}]))};
}

test('UP01 declared exploration input preserves original scenario and raw offers, no injected policy scores',()=>{
  const f=upgradeBridgeInput();assert.equal(f.search.totalBudget,450);assert.equal(f.search.nights,3);assert.equal(f.search.adults,2);assert.equal(f.search.rooms,1);
  assert.equal(f.search.checkIn,'2099-10-10');assert.equal(f.search.checkOut,'2099-10-13');assert.equal(f.search.capturedAt,'2099-09-01T12:00:00Z');
  assert.equal(f.distance.semantics,'not-requested');assert.deepEqual(f.search.selectedLocation,{latitude:0,longitude:0,confidence:1});
  for(const [i,h] of f.search.hotels.entries()){
    assert.equal(h.name,`Invented private hotel ${i}`);assert.equal(h.reviewCount,920);assert.equal(h.offers.length,1);
    assert.equal(h.offers[0].roomName,'Private double room');assert.ok(h.amenities.includes('Private bathroom'));
    assert.equal(h.offers[0].mealPlan,'Breakfast included');assert.equal(h.offers[0].refundable,true);
    assert.deepEqual([h.price,h.basePrice,h.totalKnownCost,h.offers[0].price,h.offers[0].basePrice,h.offers[0].totalKnownCost],Array(6).fill(i?400:200));
  }
  assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);assert.equal(UPGRADE_BRIDGE_SPECIFICATION.syntheticOnly,true);
});
for(const cost of [400,500])test(`UP positive ${cost}: complete bridge chooses A and proves B marginal Upgrade`,()=>{
  const r=run(`balanced-${cost}`),u=r.decision.portfolio.worthwhileComfortUpgrade;
  assert.equal(r.profile.source,'manual');assert.equal(r.profile.effectivePreferenceId,'balanced');assert.equal(r.intent.active,false);
  assert.equal(r.intent.budgetPerRoomNight,150);assert.equal(r.intent.totalBudget,450);
  assert.equal(r.decision.portfolio.bestChoice.solutionId,candidate(r,0).policy.solutionId);
  assert.equal(u.solutionId,candidate(r).policy.solutionId);assert.equal(u.status,'selected');
  assert.equal(evaluated(r,0).experienceScore,87.906081);assert.equal(evaluated(r).experienceScore,94.042027);
  assert.equal(u.metrics.experienceGain,6.135946);assert.equal(u.metrics.upgradePremium,cost-200);
  assert.equal(u.metrics.marginalValuePer100,round(6.135946/(cost-200)*100));assert.equal(u.metrics.marginalValueThreshold,2);
  assert.equal(evaluated(r).status,'comparable');assert.equal(evaluated(r).budgetStatus,cost===500?'soft-overrun':'within');
  assert.equal(candidate(r).policy.hardConstraintsSatisfied,true);assert.equal(candidate(r).policy.offerIntegrity,'verified');
  assert.equal(candidate(r).suitability.status,'eligible');assert.equal(candidate(r).suitability.facts.bathroomState,'PRIVATE');
  assert.ok(u.explanation.evidenceIds.length);assert.equal(u.explanation.mainSacrifice,`additional-cost:${cost-200}`);
});
test('UP04 510 is comparable soft-overrun but marginally insufficient, not over-budget exclusion',()=>{
  const r=run('balanced-510'),b=evaluated(r),u=r.decision.portfolio.worthwhileComfortUpgrade;
  assert.equal(b.status,'comparable');assert.equal(b.budgetStatus,'soft-overrun');assert.equal(b.experienceScore,94.042027);
  assert.equal(round((b.experienceScore!-evaluated(r,0).experienceScore!)/310*100),1.979337);
  assert.equal(r.decision.portfolio.bestChoice.solutionId,candidate(r,0).policy.solutionId);
  assert.equal(u.status,'not-applicable');assert.equal(u.solutionId,null);assert.ok(u.reasonCodes.includes('upgrade:no-option-meets-marginal-value-threshold'));
  assert.ok(!b.reasonCodes.includes('policy:budget-ceiling-exceeded'));
});
test('UP05 more cost without experience gain cannot force Upgrade',()=>{
  const r=run('same-experience-more-expensive');assert.equal(evaluated(r).experienceScore,evaluated(r,0).experienceScore);
  assert.equal(r.decision.portfolio.bestChoice.solutionId,candidate(r,0).policy.solutionId);assert.equal(r.decision.portfolio.worthwhileComfortUpgrade.status,'not-applicable');
});
test('UP06 Maximum Comfort chooses B and does not manufacture a further Upgrade',()=>{
  const r=run('maximum-comfort');assert.equal(r.decision.portfolio.bestChoice.solutionId,candidate(r).policy.solutionId);
  assert.equal(r.decision.portfolio.worthwhileComfortUpgrade.status,'not-applicable');assert.equal(r.profile.effectivePreferenceId,'maximum-comfort');
});
for(const id of ['incomplete-total','privacy-negative','privacy-unknown','privacy-conflict','distance-outside','distance-unknown'])test(`UP exclusion ${id} reaches all recommendation roles`,()=>{
  const r=run(id),c=candidate(r),e=evaluated(r),known=['privacy-negative','distance-outside'].includes(id);
  assert.equal(e.status,known?'ineligible':'incomplete');
  assert.equal(c.policy.hardConstraintsSatisfied,id==='incomplete-total'?true:known?false:null);
  assert.ok(Object.values(r.decision.portfolio).every(p=>!p.equivalentSolutionIds.includes(c.policy.solutionId)));
  assert.equal(r.decision.portfolio.bestChoice.solutionId,candidate(r,0).policy.solutionId);
  if(id==='incomplete-total'){assert.equal(c.policy.totalCost,null);assert.equal(c.policy.offerIntegrity,'partial');assert.ok(e.experienceScore!==null);}
  else assert.ok(c.policy.contextualEligibility!.reasonCodes.some(s=>s.startsWith(known?'intent:violated:':'intent:unverified:')));
});
test('UP13 exact Upgrade equivalence is a class without arbitrary selection',()=>{
  const r=run('upgrade-equivalence'),u=r.decision.portfolio.worthwhileComfortUpgrade;
  assert.equal(u.decisionTieClassification,'DECISIONALLY_EQUIVALENT');assert.equal(u.solutionId,null);
  assert.equal(u.equivalentSolutionIds.length,2);assert.equal(u.presentationRepresentativeSolutionId,null);
  assert.equal(r.decision.portfolio.bestChoice.solutionId,candidate(r,0).policy.solutionId);
});
test('UP14 exact primary equivalence does not force dependent roles',()=>{
  const r=run('choice-equivalence');assert.equal(r.decision.status,'decisionally-equivalent');assert.equal(r.decision.portfolio.bestChoice.solutionId,null);
  assert.equal(r.decision.portfolio.worthwhileComfortUpgrade.status,'abstained');
});
test('UP15 F3 multi-rate binding retains evaluated cost, conditions, dimensions and evidence',()=>{
  const f=cases.find(c=>c.id==='same-day-F3')!.input,r=run('same-day-F3'),v2=evaluateSmartStaySearchV2(f.search),id=f.search.hotels[1].id;
  const c=r.candidates.find(c=>c.hotelId===id)!,e=v2.evaluations.find(e=>e.hotel.id===id)!;
  assert.equal(v2.recommendationRoles.picks.some(p=>p.hotelId===id),false);
  assert.deepEqual(c.selectedOffer,resolveEvaluatedOfferV3(v2,id));assert.equal(c.selectedOffer!.offerId,'offer-2');assert.equal(c.selectedOffer!.amount,420);
  assert.equal(c.policy.totalCost,420);assert.equal(c.snapshot!.offerId,'offer-2');assert.equal(c.snapshot!.cancellation.status,'non-refundable');
  assert.equal(c.selectedOffer!.refundable,false);assert.equal(c.selectedOffer!.freeCancellationUntil,null);
  for(const key of ['quality','comfort','location','flexibility'] as const){
    assert.equal(c.policy.dimensions[key].score,e.scores[key].score);assert.deepEqual(c.policy.dimensions[key].evidenceIds,e.scores[key].evidenceIds);
  }
  assert.equal(f.search.hotels[1].offers[1].totalKnownCost,437);assert.equal(f.search.hotels[1].offers[1].refundable,true);
});
for(const c of cases.filter(c=>c.invariantOf))test(`UP invariance ${c.id}`,()=>{
  assert.deepEqual(semantic(run(c.id)),semantic(run(c.invariantOf!)));
});
test('UP all frozen cases validate, leave inputs unchanged and never enable public/real/Golden execution',()=>{
  for(const c of cases){const before=JSON.stringify(c.input),r=runIntentRolePolicyBridgeV3(c.input);
    assert.equal(JSON.stringify(c.input),before);assert.equal(validatePersonalUtilityRolePolicyV3(r.decision).valid,true,c.id);
    assert.equal(r.publicIntegrationEnabled,false);assert.equal(r.realDataExecutionAuthorized,false);assert.equal(r.goldenAdmission,false);
    assert.equal(r.robustness.fullRobustness,'NOT_AVAILABLE');assert.equal(r.robustness.promotionGatePassed,false);
    assert.equal('bestOverBudget' in r.decision.portfolio,false);assert.equal(r.decision.commercialSignalsUsed,false);
  }
});
