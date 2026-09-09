import test from 'node:test';
import assert from 'node:assert/strict';
import {frozenStaySuitabilityCases,STAY_SUITABILITY_SPECIFICATION} from './fixtures/staySuitabilitySyntheticV3';
import {runIntentRolePolicyBridgeV3} from '../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';
import {resolveOfferPrivacyV3} from '../../src/engine-v3/evaluation/staySuitabilityContextV3';
import {runPersonalUtilityRolePolicyV3} from '../../src/engine-v3/policy/personalUtilityRolePolicyV3';

const cases=frozenStaySuitabilityCases();
const results=new Map<string,ReturnType<typeof runIntentRolePolicyBridgeV3>>();
function result(id:string){if(!results.has(id))results.set(id,runIntentRolePolicyBridgeV3(cases.find(c=>c.id===id)!.input));return results.get(id)!;}
function first(id:string){const r=result(id);return r.candidates.find(c=>c.hotelId===cases.find(c=>c.id===id)!.input.search.hotels[0].id)!;}
function selected(id:string){const r=result(id);return r.candidates.filter(c=>r.decision.portfolio.bestChoice.equivalentSolutionIds.includes(c.policy.solutionId));}

test('SC01 predeclared synthetic cases are unique and deterministic',()=>{
  const cases=frozenStaySuitabilityCases();assert.equal(cases.length,29);
  assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
  assert.deepEqual(cases,frozenStaySuitabilityCases());assert.equal(STAY_SUITABILITY_SPECIFICATION.syntheticOnly,true);
});

test('SC02 manual Balanced corrects dorm choice without importing Comfort target or human requirements',()=>{
  const r=result('balanced-dorm-reproduction'),dorm=first('balanced-dorm-reproduction');
  assert.equal(r.profile.effectivePreferenceId,'balanced');assert.equal(r.profile.source,'manual');assert.equal(r.intent.active,false);
  assert.equal(dorm.suitability.facts.unitState,'SHARED');assert.equal(dorm.policy.dimensions.room.score,null);
  assert.equal(dorm.policy.hardConstraintsSatisfied,true);assert.equal(dorm.suitability.status,'ineligible');
  assert.equal(dorm.suitability.inventedHumanRequirements,false);assert.ok(dorm.policy.dimensions.quality.score!>0);
  assert.ok(selected('balanced-dorm-reproduction').length>0);
  for(const c of selected('balanced-dorm-reproduction')){assert.equal(c.suitability.facts.unitState,'PRIVATE');assert.ok(c.policy.totalCost!<=1500);}
});
for(const c of cases.filter(c=>c.id.startsWith('capacity-')))test(`SC capacity ${c.id}`,()=>{
  const r=result(c.id),s=c.input.search;
  assert.equal(r.stayExpectation.budgetPerRoomNight,Math.round(s.totalBudget!/(s.nights!*s.rooms!)*100)/100);
  assert.equal(r.stayExpectation.occupancy.budgetPerGuestNight,s.totalBudget!/(s.nights!*(s.adults!+s.children!)));
  assert.equal(r.stayExpectation.occupancy.guestsPerRoom,(s.adults!+s.children!)/s.rooms!);
  assert.equal(r.profile.effectivePreferenceId,'balanced');assert.notEqual(r.stayExpectation.unitExpectation,'EXPLICIT_SHARED_UNIT_ALLOWED');
});
test('SC03 strong comparable market has bounded provenance, not whole-market or a luxury floor',()=>{
  const r=result('market-strong');assert.equal(r.stayExpectation.market.basis,'STRONG_COMPARABLE_SAMPLE');
  assert.equal(r.profile.effectivePreferenceId,'balanced');assert.equal(r.stayExpectation.market.wholeMarketCertified,false);
  assert.equal(r.stayExpectation.premiumStandardRequired,false);assert.equal(r.stayExpectation.minimumSpendRequired,false);
});
test('SC04 candidate fallback does not license a premium inference',()=>{
  const r=result('market-insufficient');assert.equal(r.stayExpectation.market.basis,'FALLBACK_NO_MARKET_PREMIUM_CERTIFICATE');
  assert.equal(r.stayExpectation.market.supportedExpectationLevel,null);assert.equal(r.stayExpectation.privateBathroomRelevant,false);
  assert.ok(r.stayExpectation.market.confidence<0.6);
});
test('SC05 explicit shared preference is preserved and can choose a shared offer',()=>{
  assert.equal(result('explicit-shared').stayExpectation.unitExpectation,'EXPLICIT_SHARED_UNIT_ALLOWED');
  assert.equal(first('explicit-shared').suitability.status,'eligible');
  assert.ok(selected('explicit-shared').some(c=>c.suitability.facts.unitState==='SHARED'));
});
test('SC06 private hostel offer is not the property shared inventory',()=>{
  const c=first('private-hostel');assert.equal(c.accommodation.category,'hostel');
  assert.equal(c.suitability.facts.unitState,'PRIVATE');assert.equal(c.suitability.facts.unitSource,'EVALUATED_OFFER_ROOM_TEXT');
  assert.equal(c.suitability.status,'eligible');assert.equal(result('private-hostel').decision.candidates.find(x=>x.solutionId===c.policy.solutionId)!.status,'comparable');
});
test('SC07 category hotel cannot certify an unknown unit',()=>{
  const c=first('room-unknown');assert.equal(c.suitability.facts.unitState,'UNKNOWN');assert.equal(c.suitability.status,'incomplete');
  assert.equal(c.policy.hardConstraintsSatisfied,true);assert.equal(selected('room-unknown').includes(c),false);
});
test('SC08 explicit bath requirement unknown remains unverified, not violated',()=>{
  const c=first('bath-unknown-required');assert.equal(c.suitability.facts.bathroomState,'UNKNOWN');
  assert.equal(c.policy.hardConstraintsSatisfied,null);assert.equal(c.suitability.status,'incomplete');assert.equal(c.suitability.mismatch.length,0);
});
test('SC09 contextual shared bath and unknown bath have different reasons, no zero quality',()=>{
  const shared=first('bath-shared-contextual'),unknown=first('bath-unknown-contextual');
  assert.equal(shared.suitability.facts.bathroomState,'SHARED');assert.equal(shared.suitability.status,'ineligible');
  assert.equal(unknown.suitability.facts.bathroomState,'UNKNOWN');assert.equal(unknown.suitability.status,'incomplete');
  assert.ok(shared.suitability.mismatch.length);assert.equal(unknown.suitability.mismatch.length,0);
  for(const c of [shared,unknown]){assert.equal(c.policy.hardConstraintsSatisfied,true);assert.ok(c.policy.dimensions.quality.score!>0);}
});
test('SC10 nonpertinent missing bath is neutral unknown, not a privacy certificate',()=>{
  const c=first('bath-unknown-neutral');assert.equal(c.suitability.facts.bathroomState,'UNKNOWN');
  assert.equal(c.suitability.expectation.privateBathroomRelevant,false);assert.equal(c.suitability.status,'eligible');
});
test('SC11 equal private experience and evidence still favor the cheaper total',()=>{
  assert.equal(selected('equal-experience-cheaper')[0].policy.totalCost,300);
});
test('SC12 adequate modest private can beat expensive premium; low budget no premium standard',()=>{
  assert.equal(selected('modest-private')[0].policy.totalCost,360);
  assert.equal(selected('low-budget')[0].policy.totalCost,60);
  assert.equal(result('low-budget').stayExpectation.premiumStandardRequired,false);
});
test('SC13 low budget does not grant consent to all-shared inventory',()=>{
  const r=result('low-budget-all-shared');assert.equal(r.decision.status,'abstained');
  assert.ok(r.candidates.every(c=>c.suitability.facts.unitState==='SHARED'&&c.suitability.status==='ineligible'));
});
function merit(id:string){const r=result(id);return {profile:r.profile.effectivePreferenceId,status:r.decision.status,
  choices:selected(id).map(c=>({cost:c.policy.totalCost,unit:c.suitability.facts.unitState})),
  candidates:r.decision.candidates.map(c=>({cost:c.totalCost,status:c.status,experience:c.experienceScore,utility:c.personalUtilityScore,quality:c.qualityScore})).sort((a,b)=>a.cost!-b.cost!),
  roles:Object.fromEntries(Object.entries(r.decision.portfolio).map(([k,p])=>[k,{status:p.status,metrics:p.metrics}]))};}
test('SC14 provider hotel offer IDs and input order do not affect semantic merit',()=>{
  for(const seed of [1,2,3])assert.deepEqual(merit(`identity-${seed}`),merit('balanced-dorm-reproduction'));
});
test('SC15 documented category and offer facts, not a brand label, govern suitability',()=>{
  assert.deepEqual(merit('name'),merit('balanced-dorm-reproduction'));
});
test('SC16 all missing totals still abstain; rating-scale UNKNOWN not invented',()=>{
  const r=result('preserve-balanced-all-totals-unknown');assert.equal(r.decision.status,'abstained');assert.ok(r.candidates.every(c=>c.policy.totalCost===null));
  assert.ok(result('preserve-balanced-rating-scale-unknown').candidates.every(c=>c.policy.dimensions.quality.score!==undefined));
});
test('SC17 strong distance, hard maximum and motivated exceptions remain separate',()=>{
  const strong=first('preserve-strong-distance-baseline'),hard=first('preserve-strong-distance-mandatory-cap'),exception=first('preserve-strong-distance-exception-supported');
  assert.equal(strong.policy.hardConstraintsSatisfied,true);assert.equal(strong.policy.contextualEligibility!.status,'ineligible');
  assert.equal(hard.policy.hardConstraintsSatisfied,false);assert.ok(exception.policy.contextualEligibility!.reasonCodes.includes('intent:explicit-distance-exception-with-evidence'));
});
test('SC18 F3 privacy is bound to the same evaluated offer as cost/cancellation',()=>{
  const r=result('preserve-same-day-F3-baseline'),c=r.candidates.find(c=>c.selectedOffer?.offerId==='offer-2')!;
  assert.equal(c.suitability.facts.offerId,'offer-2');assert.equal(c.policy.totalCost,420);assert.equal(c.snapshot?.cancellation.status,'non-refundable');
});
test('SC19 D0048 applies existing Maximum Comfort band; original D0047 failure stays historical',()=>{
  const r=result('preserve-equal-experience-distance-small');assert.equal(r.profile.effectivePreferenceId,'maximum-comfort');
  assert.equal(selected('preserve-equal-experience-distance-small')[0].policy.totalCost,300);
});
test('SC20 every result still equals the unchanged numerical role policy; no public/Golden activation',()=>{
  for(const c of cases){const r=result(c.id);assert.deepEqual(r.decision,runPersonalUtilityRolePolicyV3(r.policyInput));
    assert.equal(r.publicIntegrationEnabled,false);assert.equal(r.realDataExecutionAuthorized,false);assert.equal(r.goldenAdmission,false);}
});
test('SC21 all frozen input facts/preferences preserved byte-semantically during execution',()=>{
  const f=frozenStaySuitabilityCases();for(const c of f)runIntentRolePolicyBridgeV3(c.input);assert.deepEqual(f,frozenStaySuitabilityCases());
});
test('SC22 negated/private/shared bathroom statements do not conflate',()=>{
  const h=structuredClone(cases[0].input.search.hotels[1]);h.amenities=[];h.facilities=[];
  for(const [text,state]of [['No private bathroom','NOT_PRIVATE'],['Shared bathroom','SHARED'],['Private bathroom and shared bathroom','CONFLICTING'],['Unreported','UNKNOWN']])
    assert.equal(resolveOfferPrivacyV3(h,text,'offer-2').bathroomState,state);
});
test('SC23 room and bathroom sharing independent; property name cannot fill unknown',()=>{
  const h=structuredClone(cases[0].input.search.hotels[1]);h.name='Hotel Private room';h.amenities=[];h.facilities=[];
  assert.equal(resolveOfferPrivacyV3(h,null,'offer-2').unitState,'UNKNOWN');
  const f=resolveOfferPrivacyV3(h,'Private room with shared bathroom','offer-2');assert.equal(f.unitState,'PRIVATE');assert.equal(f.bathroomState,'SHARED');
});
test('SC24 explicit private requirement is verified on private hostel offer, not shared inventory',()=>{
  const f=structuredClone(cases.find(c=>c.id==='private-hostel')!.input);
  f.search.comfortPreferences={requiredUnitTypes:['private-room','hotel-room'],requiredFeatureCodes:['private-bathroom']};
  const r=runIntentRolePolicyBridgeV3(f),c=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.equal(c.accommodation.unitType,'shared-room');assert.equal(c.suitability.facts.unitType,'private-room');
  assert.equal(c.policy.hardConstraintsSatisfied,true);assert.equal(c.mandatoryRequirements.requiredUnitTypeStatus,'satisfied');
  assert.equal(r.decision.candidates.find(x=>x.solutionId===c.policy.solutionId)!.status,'comparable');
});
test('SC25 required private bath: known shared is a violation, unknown is not',()=>{
  const f=structuredClone(cases.find(c=>c.id==='bath-unknown-required')!.input);f.search.hotels[0].offers[0].roomName='Private room with shared bathroom';
  const r=runIntentRolePolicyBridgeV3(f),c=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.equal(c.policy.hardConstraintsSatisfied,false);assert.ok(c.mandatoryRequirements.unmetFeatureCodes.includes('private-bathroom'));
  assert.equal(first('bath-unknown-required').policy.hardConstraintsSatisfied,null);
});
test('SC26 explicit unit fit uses private offer rather than shared hostel feature when preferences present',()=>{
  const f=structuredClone(cases.find(c=>c.id==='private-hostel')!.input);f.search.comfortPreferences={preferredUnitTypes:['shared-room']};
  const r=runIntentRolePolicyBridgeV3(f),c=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.equal(c.suitability.facts.unitState,'PRIVATE');assert.equal(c.policy.dimensions.room.score,25);
});
