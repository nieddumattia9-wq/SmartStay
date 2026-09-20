import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSmartStayFrontendRuntimeV2 } from '../../src/engine-v2/frontend/smartStayFrontendAdapterV2';
import { neutralSearch } from './fixtures/providerNeutralRankingSynthetic';
import { LEGACY_RANKING_POLICY_V2, NEUTRAL_RANKING_POLICY_V2, readRankingOrderV2, writeRankingOrderV2 } from '../../src/engine-v2/ranking/rankingPolicyVersionV2';
import { adaptV2SearchResultToDecisionV3 } from '../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import { createIndependentV3ComparableDecisionV3 } from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import { readFileSync } from 'node:fs';

function semantics(runtime: ReturnType<typeof buildSmartStayFrontendRuntimeV2>) {
 const r=runtime.result,v=runtime.view;
 return {list:v.rankedHotels.map(x=>x.hotel.id),base:r.ranking.baseRankingHotelIds,
 scores:r.ranking.evaluations.map(x=>[x.hotelId,x.baseScore,x.diversityPenalty,x.diversityDimensionCodes]).sort(),
 roles:r.recommendationRoles.picks.map(x=>[x.hotelId,x.role,x.assignmentScore,x.reasonCodes]),
 picks:v.recommendationPicks.map(x=>[x.role,x.evaluation.hotel.id]),
 offers:v.rankedHotels.map(x=>[x.hotel.id,x.selectedOffer?.offerId,x.totalCost]).sort()};
}

test('A01 regression: provenance alone cannot reorder the effective frontend list',()=>{
 const original=neutralSearch(),variant=structuredClone(original);
 const h=variant.hotels[5];h.provider='Synthetic Beta';h.dataSources=[h.provider];h.offers!.forEach(o=>o.provider=h.provider);
 const before=buildSmartStayFrontendRuntimeV2(original),after=buildSmartStayFrontendRuntimeV2(variant);
 assert.deepEqual(after.view.rankedHotels.map(x=>x.hotel.id),before.view.rankedHotels.map(x=>x.hotel.id));
});


for(const window of [4,8]) for(const grouping of ['rename','split','merge','absent','singleton']) test(`A01 frontend invariance ${grouping} window ${window}`,()=>{
 const original=neutralSearch();original.maximumVisibleResults=window;
 original.hotels.forEach((h,i)=>{h.provider=i%2?'Synthetic Beta':'Synthetic Alpha';h.dataSources=[h.provider];h.offers!.forEach(o=>o.provider=h.provider);});
 const variant=structuredClone(original);
 variant.hotels.forEach((h,i)=>{h.provider=grouping==='rename'?(i%2?'Other X':'Other Y'):grouping==='split'?`Source ${i%4}`:grouping==='merge'?'Merged':grouping==='absent'?'':`Source ${i}`;h.dataSources=h.provider?[h.provider]:[];h.offers!.forEach(o=>o.provider=h.provider);});
 const before=buildSmartStayFrontendRuntimeV2(original),after=buildSmartStayFrontendRuntimeV2(variant);
 assert.equal(after.result.ranking.policyVersion,NEUTRAL_RANKING_POLICY_V2);
 assert.deepEqual(semantics(after),semantics(before));
 assert.deepEqual(semantics(buildSmartStayFrontendRuntimeV2({...variant,hotels:[...variant.hotels].reverse()})),semantics(before));
 assert.ok(after.result.ranking.evaluations.every(x=>!x.diversityDimensionCodes.includes('provider')));
 const project=(r:typeof before)=>{const d=adaptV2SearchResultToDecisionV3({searchInput:r.searchInput,result:r.result});const c=createIndependentV3ComparableDecisionV3(d,r.result.recommendationRoles.bestChoiceHotelId);return [c.status,c.selectedSolutionToken,d.robustness.policyPreferredHotelId];};
 assert.deepEqual(project(after),project(before));
 assert.equal(after.view.rankedHotels[0].hotel.provider,variant.hotels.find(x=>x.id===after.view.rankedHotels[0].hotel.id)!.provider);
});

test('A01 explicit legacy replay retains the frozen provenance counterexample',()=>{
 const original={...neutralSearch(),rankingPolicyVersion:LEGACY_RANKING_POLICY_V2},variant=structuredClone(original);
 variant.hotels[5].provider='Synthetic Beta';
 const a=buildSmartStayFrontendRuntimeV2(original),b=buildSmartStayFrontendRuntimeV2(variant);
 assert.deepEqual(a.view.rankedHotels.map(x=>x.hotel.id),['synthetic-01','synthetic-02','synthetic-03','synthetic-04','synthetic-05','synthetic-08','synthetic-06','synthetic-07']);
 assert.deepEqual(b.view.rankedHotels.map(x=>x.hotel.id),['synthetic-01','synthetic-02','synthetic-03','synthetic-04','synthetic-05','synthetic-06','synthetic-08','synthetic-07']);
 assert.equal(a.result.ranking.policyVersion,LEGACY_RANKING_POLICY_V2);
});
test('A01 real price differences remain effective; no provider channel criterion added',()=>{
 const original=neutralSearch(),changed=structuredClone(original);
 changed.hotels[0].offers![0].totalKnownCost=800;changed.hotels[0].offers![0].price=800;
 assert.notDeepEqual(semantics(buildSmartStayFrontendRuntimeV2(original)),semantics(buildSmartStayFrontendRuntimeV2(changed)));
});
test('A01 saved order requires same policy; legacy arrays are not silently promoted',()=>{
 const ids=['a','b'],legacy=JSON.stringify(ids),neutral=writeRankingOrderV2(ids,NEUTRAL_RANKING_POLICY_V2);
 assert.deepEqual(readRankingOrderV2(legacy,ids,LEGACY_RANKING_POLICY_V2),{hotelIds:ids,status:'same-policy'});
 assert.deepEqual(readRankingOrderV2(legacy,ids,NEUTRAL_RANKING_POLICY_V2),{hotelIds:[],status:'policy-mismatch'});
 assert.deepEqual(readRankingOrderV2(neutral,ids,NEUTRAL_RANKING_POLICY_V2),{hotelIds:ids,status:'same-policy'});
 assert.equal(readRankingOrderV2(neutral,ids,LEGACY_RANKING_POLICY_V2).status,'policy-mismatch');
 assert.equal(readRankingOrderV2('{}',ids,NEUTRAL_RANKING_POLICY_V2).status,'invalid');
 const input=neutralSearch();
 const result=buildSmartStayFrontendRuntimeV2({...input,previousRankingHotelIds:input.hotels.map(h=>h.id).reverse()});
 assert.equal(result.result.ranking.previousOrderStatus,'policy-mismatch');
 assert.deepEqual(semantics(result),semantics(buildSmartStayFrontendRuntimeV2(input)));
 assert.throws(()=>buildSmartStayFrontendRuntimeV2({...input,rankingPolicyVersion:'invented' as typeof NEUTRAL_RANKING_POLICY_V2}),/VERSION_UNSUPPORTED/);
});
test('A01 actual Results caller pins neutral and isolates saved state without enabling public V3',()=>{
 const source=readFileSync('src/pages/Results/Results.tsx','utf8');
 assert.ok(source.includes('rankingPolicyVersion: NEUTRAL_RANKING_POLICY_V2'));
 assert.ok(source.includes('previousRankingPolicyVersion: NEUTRAL_RANKING_POLICY_V2'));
 assert.ok(source.includes('smartstay_ranking_v2_${NEUTRAL_RANKING_POLICY_V2}_'));
 assert.ok(source.includes('remainingHotels.map'));
});
