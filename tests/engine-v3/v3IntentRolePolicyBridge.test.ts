import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyntheticCapabilityInput } from '../../src/engine-v3/evaluation/diagnosticCapabilityProbeV3';
import { evaluateSmartStaySearchV2 } from '../../src/engine-v2/orchestrator/smartStayEngineV2';
import { adaptV2SearchResultToDecisionV3 } from '../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import {runIntentRolePolicyBridgeV3, type IntentRoleBridgeInputV3} from '../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';
import {intentFixture, FROZEN_INTENT_CASE_SPECIFICATIONS} from './fixtures/intentRolePolicySyntheticV3';
import {runPersonalUtilityRolePolicyV3, validatePersonalUtilityRolePolicyV3} from '../../src/engine-v3/policy/personalUtilityRolePolicyV3';
import {resolveEvaluatedOfferV3} from '../../src/engine-v3/adapter/evaluatedOfferBindingV3';
import {createStableHashV3} from '../../src/engine-v3/contract/stableHashV3';
import {buildSmartStayFrontendViewV2} from '../../src/engine-v2/frontend/smartStayFrontendAdapterV2';

// Frozen before repair: reproduces R2 F3, not a real hotel/feedback case.
function offerBindingFixture() {
  const input = createSyntheticCapabilityInput('COMPLETE');
  Object.assign(input, {preferenceId:'comfort',totalBudget:1500,nights:2,checkOut:'2099-10-12',bookingReferenceAt:'2099-10-10T12:00:00Z',capturedAt:'2099-10-10T12:00:00Z'});
  const h=input.hotels[1],o=h.offers[0];
  h.offers=[{...o,id:'offer-2',price:420,basePrice:420,totalKnownCost:420,refundable:false,refundableTag:'NRF',freeCancellationUntil:null,cancellationPolicy:'Synthetic non-refundable',cancellationPenalty:420},
    {...o,id:'offer-4',price:437,basePrice:437,totalKnownCost:437,freeCancellationUntil:'2099-10-10T23:59:59Z',cancellationPolicy:'Synthetic cancellation before 2099-10-10T23:59:59Z'}];
  return input;
}
test('IR01 F3 non-picked hotel retains the evaluated same-day offer and all dependent dimensions',()=>{
  const input=offerBindingFixture(),result=evaluateSmartStaySearchV2(input),id=input.hotels[1].id;
  assert.equal(result.recommendationRoles.picks.some(p=>p.hotelId===id),false);
  const selected=result.recommendationRoles.evaluations.find(e=>e.hotelId===id)!.metrics.selectedOffer!;
  assert.equal(selected.offerId,'offer-2');assert.equal(selected.amount,420);
  const d=adaptV2SearchResultToDecisionV3({searchInput:input,result});
  const s=d.solutions.find(s=>s.segments.some(x=>x.hotelId===id))!;
  const u=d.personalization.utilityEvaluations.find(u=>u.hotelId===id)!;
  assert.equal(s.segments[0].offerId,selected.offerId);assert.equal(u.context.totalCost,420);
  const e=result.evaluations.find(e=>e.hotel.id===id)!;
  for(const key of Object.keys(u.dimensions) as (keyof typeof u.dimensions)[])assert.deepEqual(u.dimensions[key].score,e.scores[key].score);
});
test('IR02 single-offer control retains evaluated offer for every candidate',()=>{
  const input=createSyntheticCapabilityInput('COMPLETE'),result=evaluateSmartStaySearchV2(input);
  const d=adaptV2SearchResultToDecisionV3({searchInput:input,result});
  for(const e of result.recommendationRoles.evaluations){const s=d.solutions.find(s=>s.segments.some(x=>x.hotelId===e.hotelId))!;assert.equal(s.segments[0].offerId,e.metrics.selectedOffer!.offerId);}
});

test('IR03 frozen case specifications are unique and hashable before executing bridge',()=>{
  assert.equal(new Set(FROZEN_INTENT_CASE_SPECIFICATIONS).size,FROZEN_INTENT_CASE_SPECIFICATIONS.length);
  assert.match(createStableHashV3(FROZEN_INTENT_CASE_SPECIFICATIONS,'d0044-frozen-cases'),/^fnv1a32-[a-f0-9]{8}$/);
});
for(const profile of ['maximum-comfort','comfort','balanced','savings','maximum-savings']) {
  test(`IR profile manual ${profile} preserved, same policy for selection roles explanations`,()=>{
    const r=runIntentRolePolicyBridgeV3(intentFixture(profile));
    assert.equal(r.profile.effectivePreferenceId,profile);assert.equal(r.profile.source,'manual');
    assert.equal(validatePersonalUtilityRolePolicyV3(r.decision).valid,true);
    assert.deepEqual(r.decision,runPersonalUtilityRolePolicyV3(r.policyInput));
    assert.equal(r.legacyOutputUsedForNewSelection,false);assert.equal(r.publicIntegrationEnabled,false);
  });
  test(`IR profile automatic ${profile} reuses existing resolver with explicit provenance`,()=>{
    const r=runIntentRolePolicyBridgeV3(intentFixture(profile,'automatic'));
    assert.equal(r.decision.profile,r.profile.effectivePreferenceId);assert.notEqual(r.profile.source,'manual');
    assert.equal(r.intent.budgetPerRoomNight,150);assert.ok(r.profile.reasonCodes.length>0);
  });
}
for(const [nights,rooms] of [[3,1],[3,2],[7,1]])test(`IR budget basis ${nights} nights ${rooms} rooms`,()=>{
  const f=intentFixture();f.search.nights=nights;f.search.rooms=rooms;f.search.checkOut=`2099-10-${10+nights}`;
  const r=runIntentRolePolicyBridgeV3(f);assert.equal(r.intent.budgetPerRoomNight,Math.round(450/(nights*rooms)*100)/100);
  assert.equal(r.policyInput.nights,nights);assert.equal(r.intent.rooms,rooms);
});
test('IR manual Balanced high budget does not silently turn into premium profile',()=>{
  const f=intentFixture();f.search.totalBudget=3000;const r=runIntentRolePolicyBridgeV3(f);
  assert.equal(r.profile.effectivePreferenceId,'balanced');assert.equal(r.intent.active,false);
});
test('IR insufficient market preserves explicit fallback, not an invented market confidence',()=>{
  const f=intentFixture('balanced','automatic');f.search.marketContextMode='local-only';f.search.marketContextObservations=[];
  const r=runIntentRolePolicyBridgeV3(f);assert.equal(r.profile.source,'absolute-fallback');
  // A candidate fallback can be usable for diagnosis, yet too weak to adjust intent.
  assert.equal(r.profile.marketContextSource,'candidate-fallback');assert.equal(r.intent.aspirationalPricePercentileVetoImported,false);
});
test('IR equivalent experience prefers cheaper offer without copying aspirational price veto',()=>{
  const f=intentFixture('maximum-comfort');f.search.totalBudget=1200;
  f.search.hotels=f.search.hotels.map((h,i)=>({...structuredClone(f.search.hotels[0]),id:h.id,name:`Invented equivalent ${i}`,
    offers:[{...structuredClone(f.search.hotels[0].offers[0]),id:`offer-${i+1}`,price:300+i*100,basePrice:300+i*100,totalKnownCost:300+i*100}],
    price:300+i*100,basePrice:300+i*100,totalKnownCost:300+i*100}));
  const r=runIntentRolePolicyBridgeV3(f),picked=r.candidates.find(c=>c.policy.solutionId===r.decision.portfolio.bestChoice.solutionId);
  assert.equal(picked?.policy.totalCost,300);assert.equal(r.intent.aspirationalPricePercentileVetoImported,false);
});
test('IR explicit privacy is evidence-gated; missing bathroom is not true',()=>{
  const f=intentFixture();f.search.comfortPreferences={requiredFeatureCodes:['private-bathroom']};
  f.search.hotels[0].amenities=f.search.hotels[0].amenities.filter(a=>a!=='Private bathroom');
  const r=runIntentRolePolicyBridgeV3(f),c=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.equal(c.policy.hardConstraintsSatisfied,null);
  assert.notEqual(r.decision.portfolio.bestChoice.solutionId,c.policy.solutionId);
  assert.ok(c.policy.contextualEligibility!.reasonCodes.includes('intent:unverified:mandatory-accommodation-requirements'));
});
test('IR category confidence is not projected as room suitability',()=>{
  const r=runIntentRolePolicyBridgeV3(intentFixture());
  for(const c of r.candidates){assert.equal(c.mapping.categoryFit,'CLASSIFICATION_CONFIDENCE_AUDIT_ONLY');assert.equal(c.mapping.room,'V2_CONTEXTUAL_UNIT_TYPE_FIT_NOT_ROOM_LUXURY');}
});
test('IR all incomplete totals retain diagnostic calculation but abstain, D43 semantics',()=>{
  const f=intentFixture();f.search=createSyntheticCapabilityInput('TOTAL_UNKNOWN');const r=runIntentRolePolicyBridgeV3(f);
  assert.equal(r.decision.status,'abstained');assert.equal(r.decision.portfolio.bestChoice.solutionId,null);
  for(const c of r.candidates){assert.equal(c.policy.totalCost,null);assert.equal(c.policy.offerIntegrity,'partial');}
  assert.ok(r.decision.candidates.every(c=>c.status==='incomplete'));assert.ok(r.legacyDiagnostic.utility.length>0);
});
test('IR incomplete apparently attractive alternative never replaces admissible candidates',()=>{
  const f=intentFixture();f.search=createSyntheticCapabilityInput('ONE_TOTAL_UNKNOWN');const r=runIntentRolePolicyBridgeV3(f);
  const partial=r.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  assert.notEqual(r.decision.portfolio.bestChoice.solutionId,partial.policy.solutionId);
  assert.equal(r.decision.candidates.find(c=>c.solutionId===partial.policy.solutionId)!.status,'incomplete');
});
test('IR rating scale UNKNOWN is not rescaled or defaulted',()=>{
  const f=intentFixture();f.search=createSyntheticCapabilityInput('RATING_SCALE_UNKNOWN');const r=runIntentRolePolicyBridgeV3(f);
  const source=evaluateSmartStaySearchV2(f.search);
  for(const c of r.candidates)assert.equal(c.policy.dimensions.quality.score,source.evaluations.find(e=>e.hotel.id===c.hotelId)!.scores.quality.score);
  assert.equal(validatePersonalUtilityRolePolicyV3(r.decision).valid,true);
});
for(const semantics of ['mandatory-cap','strong-preference'] as const)for(const maximum of [1,3])test(`IR ${semantics} ${maximum} km excludes outside without arbitrary tolerance`,()=>{
  const f=intentFixture();f.search.maximumDistanceKm=maximum;f.distance.semantics=semantics;
  const r=runIntentRolePolicyBridgeV3(f);
  for(const c of r.candidates.filter(c=>c.distance?.status==='exceeded')){
    assert.notEqual(r.decision.portfolio.bestChoice.solutionId,c.policy.solutionId);
    assert.equal(c.policy.hardConstraintsSatisfied,semantics==='mandatory-cap'?false:true);
  }
  assert.equal(r.intent.maximumDistanceKm,maximum);
});
test('IR all outside strong preference needs a motivated exception, not an implicit tolerance',()=>{
  const f=intentFixture();f.search=createSyntheticCapabilityInput('ALL_DISTANCE_OUTSIDE');f.distance.semantics='strong-preference';
  const r=runIntentRolePolicyBridgeV3(f);assert.equal(r.decision.status,'abstained');
  assert.ok(r.candidates.every(c=>c.policy.hardConstraintsSatisfied===true));
});
test('IR unverified distance is incomplete not a proved violation',()=>{
  const f=intentFixture();f.search=createSyntheticCapabilityInput('DISTANCE_UNVERIFIED');f.distance.semantics='mandatory-cap';
  const r=runIntentRolePolicyBridgeV3(f);assert.ok(r.candidates.every(c=>c.policy.hardConstraintsSatisfied===null));assert.equal(r.decision.status,'abstained');
});
test('IR unsupported exception cannot weaken a hard cap or invent an experience gain',()=>{
  const f=intentFixture();f.search.maximumDistanceKm=1;f.distance.semantics='mandatory-cap';
  f.distanceException={hotelId:f.search.hotels[2].id,comparedWithHotelId:f.search.hotels[0].id,dimension:'quality',reason:'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED',evidenceIds:['invented-reference']};
  assert.throws(()=>runIntentRolePolicyBridgeV3(f),/HARD_CAP_EXCEPTION_FORBIDDEN/);
  f.distance.semantics='strong-preference';assert.throws(()=>runIntentRolePolicyBridgeV3(f),/DISTANCE_EXCEPTION_UNSUPPORTED/);
});
function elide(r:ReturnType<typeof runIntentRolePolicyBridgeV3>){
  const semantic=(id:string|null)=>id===null?null:r.decision.candidates.find(c=>c.solutionId===id);
  return {status:r.decision.status,roles:Object.fromEntries(Object.entries(r.decision.portfolio).map(([k,p])=>[k,{status:p.status,metrics:p.metrics,
    selected:semantic(p.solutionId)?{totalCost:semantic(p.solutionId)!.totalCost,experience:semantic(p.solutionId)!.experienceScore}:null,
    equivalent:p.equivalentSolutionIds.map(id=>({cost:semantic(id)!.totalCost,experience:semantic(id)!.experienceScore})),
    explanation:{...p.explanation,evidenceIds:[]},reasons:p.reasonCodes}]))};
}
test('IR order provider hotel and offer IDs do not affect the identity-elided decision',()=>{
  const f=intentFixture(),baseline=elide(runIntentRolePolicyBridgeV3(f));
  for(let seed=1;seed<=6;seed++){
    const copy=structuredClone(f);copy.search.hotels.forEach((h,i)=>{h.id=`opaque-${seed}-${9-i}`;h.provider=`synthetic-${seed}`;h.dataSources=[`synthetic-${seed}`];h.offers.forEach(o=>{o.provider=`synthetic-${seed}`;o.id=`offer-${30+seed+i}`;});});
    if(seed%2)copy.search.hotels.reverse();assert.deepEqual(elide(runIntentRolePolicyBridgeV3(copy)),baseline);
  }
});
test('IR exactly equal alternatives remain decisionally equivalent, never lexical winners',()=>{
  const f=intentFixture();f.search.hotels=f.search.hotels.map((h,i)=>({...structuredClone(f.search.hotels[0]),id:h.id,offers:[{...structuredClone(f.search.hotels[0].offers[0]),id:`offer-${i+1}`}]}));
  const r=runIntentRolePolicyBridgeV3(f);assert.equal(r.decision.portfolio.bestChoice.status,'decisionally-equivalent');
  assert.equal(r.decision.portfolio.bestChoice.solutionId,null);assert.equal(r.decision.portfolio.bestChoice.equivalentSolutionIds.length,3);
});
test('IR bounded robustness recomputes same policy; full robustness and regret not inherited PASS',()=>{
  const r=runIntentRolePolicyBridgeV3(intentFixture());
  for(const s of r.robustness.scenarios)assert.equal(s.policyVersion,r.decision.policyVersion);
  assert.equal(r.robustness.fullRobustness,'NOT_AVAILABLE');assert.equal(r.robustness.promotionGatePassed,false);
  assert.equal(r.goldenAdmission,false);assert.equal(r.realDataExecutionAuthorized,false);
});
test('IR ambiguous evaluated-offer rows and pick mismatch remain integrity errors',()=>{
  const result=evaluateSmartStaySearchV2(createSyntheticCapabilityInput('COMPLETE'));const id=result.recommendationRoles.evaluations[0].hotelId;
  const duplicate=structuredClone(result);duplicate.recommendationRoles.evaluations.push(duplicate.recommendationRoles.evaluations[0]);
  assert.throws(()=>resolveEvaluatedOfferV3(duplicate,id),/AMBIGUOUS/);
  const altered=structuredClone(result);altered.recommendationRoles.picks[0].metrics={...altered.recommendationRoles.picks[0].metrics,
    selectedOffer:{...altered.recommendationRoles.picks[0].metrics.selectedOffer!,amount:999}};
  assert.throws(()=>resolveEvaluatedOfferV3(altered,altered.recommendationRoles.picks[0].hotelId),/PICK_MISMATCH/);
});
test('IR F3 new policy also consumes the very same evaluated offer, not just compatibility output',()=>{
  const f:IntentRoleBridgeInputV3={...intentFixture('comfort'),search:offerBindingFixture()};const r=runIntentRolePolicyBridgeV3(f);
  const c=r.candidates.find(c=>c.hotelId===f.search.hotels[1].id)!;
  assert.equal(c.selectedOffer?.offerId,'offer-2');assert.equal(c.policy.totalCost,420);
  assert.equal(c.snapshot?.cancellation.status,'non-refundable');
});
test('IR Comfort compares expected experience before rewarding a cheap high-review dormitory',()=>{
  const f=intentFixture('maximum-comfort');f.search.totalBudget=1500;
  const cheap=f.search.hotels[0];cheap.name='Invented shared dorm hostel';cheap.stars=1;cheap.reviewScore=9.8;
  cheap.amenities=['Shared dormitory','WiFi'];cheap.facilities=[];
  cheap.price=90;cheap.totalKnownCost=90;cheap.offers[0]={...cheap.offers[0],price:90,basePrice:90,totalKnownCost:90,roomName:'Shared dormitory bunk'};
  const premium=f.search.hotels[1];premium.name='Invented premium hotel';premium.stars=5;premium.reviewScore=9.4;
  premium.price=650;premium.totalKnownCost=650;premium.offers[0]={...premium.offers[0],price:650,basePrice:650,totalKnownCost:650,roomName:'Private superior double room'};
  const r=runIntentRolePolicyBridgeV3(f);
  assert.notEqual(r.decision.portfolio.bestChoice.solutionId,r.candidates.find(c=>c.hotelId===cheap.id)!.policy.solutionId);
  assert.equal(r.decision.portfolio.bestChoice.solutionId,r.candidates.find(c=>c.hotelId===premium.id)!.policy.solutionId);
});
test('IR case-specific distance exception records measured excess and evidence, never a general tolerance',()=>{
  const f=intentFixture();f.search=createSyntheticCapabilityInput('DISTANCE_LEADER_OUTSIDE');f.distance.semantics='strong-preference';
  const baseline=runIntentRolePolicyBridgeV3(f),out=baseline.candidates.find(c=>c.hotelId===f.search.hotels[0].id)!;
  const base=baseline.candidates.find(c=>c.hotelId===f.search.hotels[1].id)!;
  f.distanceException={hotelId:out.hotelId,comparedWithHotelId:base.hotelId,dimension:'quality',reason:'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED',
    evidenceIds:[...out.policy.dimensions.quality.evidenceIds,...base.policy.dimensions.quality.evidenceIds]};
  const r=runIntentRolePolicyBridgeV3(f),accepted=r.candidates.find(c=>c.hotelId===out.hotelId)!;
  assert.equal(typeof accepted.distance!.actualValue,'number');assert.ok(Number(accepted.distance!.actualValue)>1);
  assert.equal(accepted.policy.hardConstraintsSatisfied,true);
  assert.ok(accepted.policy.contextualEligibility!.reasonCodes.includes('intent:explicit-distance-exception-with-evidence'));
  assert.equal(r.intent.maximumDistanceKm,1);
});
test('IR no exception, invalid metadata and unknown semantic mode fail before policy execution',()=>{
  const f=intentFixture();f.search.maximumDistanceKm=1;assert.throws(()=>runIntentRolePolicyBridgeV3(f),/DISTANCE_SCOPE_MISMATCH/);
  f.search.maximumDistanceKm=null;f.search.rooms=null;assert.throws(()=>runIntentRolePolicyBridgeV3(f),/INTENT_CONTEXT_INVALID/);
});
test('IR explicit private unit requirement rejects a verified shared-room candidate',()=>{
  const f=intentFixture('maximum-savings');f.search.comfortPreferences={requiredUnitTypes:['hotel-room','private-room','entire-place']};
  const h=f.search.hotels[0];h.name='Invented hostel';h.amenities=['Shared dormitory','WiFi'];h.facilities=[];
  h.offers[0].roomName='Shared dormitory bunk';
  const r=runIntentRolePolicyBridgeV3(f),c=r.candidates.find(c=>c.hotelId===h.id)!;
  assert.equal(c.accommodation.unitType,'shared-room');assert.equal(c.policy.hardConstraintsSatisfied,false);
  assert.ok(c.policy.contextualEligibility!.reasonCodes.includes('intent:violated:mandatory-accommodation-requirements'));
  assert.notEqual(r.decision.portfolio.bestChoice.solutionId,c.policy.solutionId);
});
test('IR reliable invented market triggers the same automatic profile as the existing frontend',()=>{
  const f=intentFixture('balanced','automatic');f.search.totalBudget=750;f.search.destinationKey='invented-intent-market';
  f.search.marketContextMode='current-search';
  const base=structuredClone(f.search.hotels[0]);
  f.search.hotels=Array.from({length:10},(_,i)=>({...structuredClone(base),id:`synthetic-market-${i}`,name:`Invented market stay ${i}`,
    address:`Invented market street ${i}`,latitude:0.001*(i+1),longitude:0,price:180+i*12,totalKnownCost:180+i*12,
    offers:[{...structuredClone(base.offers[0]),id:`offer-${i+1}`,price:180+i*12,basePrice:180+i*12,totalKnownCost:180+i*12}]}));
  // An unrelated observation must NOT leak into a current-search-only second pass.
  f.search.marketContextObservations=[{id:'synthetic-ignored-local',destinationKey:'invented-intent-market',currency:'EUR',stayMonth:10,
    segmentKey:'overall',source:'local-seed',confidence:1,observedAt:f.search.capturedAt!,leadTimeDays:39,seasonalIndex:null,
    distribution:{sampleSize:100,minimum:1000,firstQuartile:2000,median:3000,thirdQuartile:4000,ninetiethPercentile:5000,maximum:6000}}];
  const r=runIntentRolePolicyBridgeV3(f);
  const frontend=buildSmartStayFrontendViewV2({...f.search,marketRelativeAutomaticBalance:true});
  assert.equal(r.profile.effectivePreferenceId,frontend.preferenceResolution!.effectivePreferenceId);
  assert.equal(r.profile.source,frontend.preferenceResolution!.source);
  assert.equal(r.profile.source,'market-strong-data');assert.notEqual(r.profile.effectivePreferenceId,'balanced');
  assert.equal(r.intent.market.median,frontend.marketContext.distribution.median);
});
