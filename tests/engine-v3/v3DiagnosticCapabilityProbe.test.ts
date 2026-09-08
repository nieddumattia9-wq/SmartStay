import assert from 'node:assert/strict';
import test from 'node:test';
import {createSyntheticCapabilityInput,runSyntheticCapabilityProbe,runSyntheticRoleCapabilityProbe,DIAGNOSTIC_CAPABILITY_VARIANTS} from '../../src/engine-v3/evaluation/diagnosticCapabilityProbeV3';
import {evaluateSmartStaySearchV2} from '../../src/engine-v2/orchestrator/smartStayEngineV2';
import {adaptV2SearchResultToDecisionV3} from '../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import {validateStayOptiDecisionV3} from '../../src/engine-v3/contract/stayOptiDecisionV3';
import {getComparableOfferAmount,classifyStayCostCompleteness} from '../../src/utils/stayCost';
import {selectHotelOffers} from '../../src/utils/hotelOfferSelection';

test('DC01 complete invented control traverses V2 -> canonical V3 validator -> independent output',()=>{
 const r=runSyntheticCapabilityProbe('COMPLETE');assert.equal(r.validation.valid,true);assert.equal(r.independentOutput?.status,'recommended');assert.equal(r.independentOutput?.role,'best-choice');assert.equal(r.independentError,null);assert(r.decision.solutions.every(s=>s.feasibility==='feasible'));
});
for(const variant of ['TOTAL_UNKNOWN','BOTH_UNKNOWN'] as const)test(`DC02 ${variant}: computable utility is NOT an extractable feasible recommendation`,()=>{
 const r=runSyntheticCapabilityProbe(variant);assert.equal(r.validation.valid,true);assert(r.decision.solutions.every(s=>s.feasibility==='incomplete'&&s.totalCost.completeness==='reported-tax-status-unknown'));assert(r.decision.robustness.candidates.every(c=>c.status==='usable'&&c.utilityScore!==null));assert.equal(r.independentOutput,null);assert.equal(r.independentError,'Independent V3 recommendation is not backed by one feasible eligible single-stay solution.');
});
test('DC03 unknown rating scale omitted, not invented or assumed ten; lower evidence but recommendation possible',()=>{
 const a=runSyntheticCapabilityProbe('COMPLETE'),b=runSyntheticCapabilityProbe('RATING_SCALE_UNKNOWN');assert(b.input.hotels.every(h=>h.reviewScore===null&&!h.availableData.hasReviewScore));assert.equal(b.validation.valid,true);assert.equal(b.independentOutput?.status,'recommended');for(const c of b.decision.robustness.candidates)assert(c.evidenceStrength<a.decision.robustness.candidates.find(x=>x.hotelId===c.hotelId)!.evidenceStrength);assert(b.result.evaluations.every(e=>e.reliabilityGate.warningCodes.includes('review-evidence-limited')));
});
test('DC04 missing total retains displayed amount AND unknown completeness; legacy numeric zero fields are not tax proof',()=>{
 const r=runSyntheticCapabilityProbe('TOTAL_UNKNOWN');for(const h of r.input.hotels){assert.equal(h.offers[0].totalKnownCost,null);assert.equal(h.offers[0].taxesIncluded,null);assert.equal(h.offers[0].unknownTaxes,undefined);assert.equal(getComparableOfferAmount(h.offers[0]),h.price);}assert(r.decision.solutions.every(s=>s.totalCost.taxesIncluded===null));
});
test('DC05 literal tax-included boolean is not equivalent to unknown complete total',()=>{
 assert.equal(classifyStayCostCompleteness(null,undefined,undefined),'reported-tax-status-unknown');assert.equal(classifyStayCostCompleteness(true,undefined,undefined),'reported-complete');
 // Boundary warning: a display slogan must not automatically become this boolean.
});
test('DC06 mixed set does not silently remove an incomplete robust winner or substitute another winner',()=>{
 const r=runSyntheticCapabilityProbe('ONE_TOTAL_UNKNOWN');assert.equal(r.decision.solutions.filter(s=>s.feasibility==='feasible').length,2);assert.equal(r.decision.robustness.policyPreferredHotelId,'SYNTHETIC_CAPABILITY_0');assert.equal(r.independentOutput,null);assert(r.independentError);
});
test('DC07 no bookable offer: real eligibility rejection and no-feasible-solution abstention',()=>{
 const r=runSyntheticCapabilityProbe('NOT_BOOKABLE');assert(r.result.evaluations.every(e=>!e.reliabilityGate.eligible&&e.reliabilityGate.blockingReasonCodes.includes('no-bookable-offer')));assert(r.decision.robustness.candidates.every(c=>c.status==='ineligible'));assert.equal(r.independentOutput?.status,'no-feasible-solution');
});
test('DC08 malformed canonical decision is rejected, unlike valid incomplete representations',()=>{
 const d=structuredClone(runSyntheticCapabilityProbe('COMPLETE').decision);d.schemaVersion='INVALID' as typeof d.schemaVersion;const v=validateStayOptiDecisionV3(d);assert.equal(v.valid,false);assert(v.issues.some(i=>i.code==='decision-version-mismatch'));
});
test('DC09 technical public offer ID boundary rejects malformed references independently from hotel merit',()=>{
 const h=createSyntheticCapabilityInput('COMPLETE').hotels[0];assert(selectHotelOffers(h).primary);h.offers[0].id='not-a-canonical-offer-reference';assert.equal(selectHotelOffers(h).primary,null);
});
for(const km of [1,3])test(`DC10 maximumDistanceKm=${km} is an explicit constraint, not R2 soft preference`,()=>{
 const r=runSyntheticCapabilityProbe('COMPLETE',km);const inside=r.result.evaluations.filter(e=>e.constraints.some(c=>c.code==='maximum-distance'&&c.status==='satisfied'));const outside=r.result.evaluations.filter(e=>e.constraints.some(c=>c.code==='maximum-distance'&&c.status==='exceeded'));assert.equal(inside.length,km===1?1:2);assert.equal(outside.length,km===1?2:1);assert(outside.every(e=>e.final.rankBand==='excluded'));assert.equal(r.validation.valid,true);
});
test('DC11 omitting distance cap does not represent a 1km or 3km preference',()=>{
 const r=runSyntheticCapabilityProbe('COMPLETE');assert(r.result.evaluations.every(e=>e.constraints.find(c=>c.code==='maximum-distance')?.status==='not-set'));assert.equal(r.input.maximumDistanceKm,null);
});
test('DC12 exact unknowns remain deterministic with no input mutation',()=>{
 for(const v of DIAGNOSTIC_CAPABILITY_VARIANTS)assert.deepEqual(runSyntheticCapabilityProbe(v),runSyntheticCapabilityProbe(v));
});
test('DC13 offline role policy permits independent Best Choice without assigning an upgrade',()=>{
 const r=runSyntheticRoleCapabilityProbe();assert.equal(r.validation.valid,true);assert.equal(r.result.portfolio.bestChoice.status,'selected');assert.equal(r.result.portfolio.worthwhileComfortUpgrade.status,'not-applicable');assert.equal(r.bestOverBudgetMapping,null);assert.equal(r.result.application,'offline-policy-candidate-only');assert.equal(r.result.runtimeIntegrationEnabled,false);
});
test('DC14 role policy incomplete total abstains rather than coercing missing price to zero',()=>{
 const r=runSyntheticRoleCapabilityProbe(true);assert.equal(r.validation.valid,true);assert.equal(r.result.status,'abstained');assert.equal(r.result.counts.comparable,0);assert(r.result.candidates.every(c=>c.status==='incomplete'&&c.totalCost===null));
});
test('DC15 no real packet entrypoint, Golden promotion or implicit soft-distance tolerance',()=>{
 assert.throws(()=>createSyntheticCapabilityInput('REAL' as any),/SYNTHETIC_VARIANT_REQUIRED/);assert.throws(()=>createSyntheticCapabilityInput('COMPLETE',3.8),/SYNTHETIC_DISTANCE_CONTROL_REQUIRED/);const r=runSyntheticCapabilityProbe('COMPLETE');assert.equal(r.goldenAdmission,false);assert.equal(r.realDataExecuted,false);
});
test('DC16 provider label changes and input permutation preserve robust choice and utility',()=>{
 const a=runSyntheticCapabilityProbe('COMPLETE');const b=createSyntheticCapabilityInput('COMPLETE');b.hotels.reverse();for(const h of b.hotels){h.provider='other-invented-source';h.dataSources=[h.provider];h.offers[0].provider=h.provider;}const d=adaptV2SearchResultToDecisionV3({searchInput:b,result:evaluateSmartStaySearchV2(b)});assert.equal(d.robustness.policyPreferredHotelId,a.decision.robustness.policyPreferredHotelId);assert.deepEqual(d.robustness.candidates.map(c=>[c.hotelId,c.utilityScore]).sort(),a.decision.robustness.candidates.map(c=>[c.hotelId,c.utilityScore]).sort());
});
test('DC17 V2 distance exclusion is not automatically V3 robustness exclusion: record the boundary discrepancy',()=>{
 const r=runSyntheticCapabilityProbe('COMPLETE',1);for(const e of r.result.evaluations.filter(e=>e.final.rankBand==='excluded'))assert.equal(r.decision.robustness.candidates.find(c=>c.hotelId===e.hotel.id)?.status,'usable');
});
