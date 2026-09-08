import assert from 'node:assert/strict';
import test from 'node:test';
import {createSyntheticCapabilityInput,runSyntheticCapabilityProbe,runSyntheticRoleCapabilityProbe,DIAGNOSTIC_CAPABILITY_VARIANTS} from '../../src/engine-v3/evaluation/diagnosticCapabilityProbeV3';
import {evaluateSmartStaySearchV2} from '../../src/engine-v2/orchestrator/smartStayEngineV2';
import {adaptV2SearchResultToDecisionV3} from '../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import {validateStayOptiDecisionV3} from '../../src/engine-v3/contract/stayOptiDecisionV3';
import {getComparableOfferAmount,classifyStayCostCompleteness} from '../../src/utils/stayCost';
import {selectHotelOffers} from '../../src/utils/hotelOfferSelection';
import {createIndependentV3ComparableDecisionV3,runIndependentDecisionShadowV3} from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import {verifyDecisionReplayV3} from '../../src/engine-v3/replay/decisionReplayV3';

test('DC01 complete invented control traverses V2 -> canonical V3 validator -> independent output',()=>{
 const r=runSyntheticCapabilityProbe('COMPLETE');assert.equal(r.validation.valid,true);assert.equal(r.independentOutput?.status,'recommended');assert.equal(r.independentOutput?.role,'best-choice');assert.equal(r.independentError,null);assert(r.decision.solutions.every(s=>s.feasibility==='feasible'));
});
for(const variant of ['TOTAL_UNKNOWN','BOTH_UNKNOWN'] as const)test(`DC02 ${variant}: diagnostic utility remains computable; recommendation abstains before selection`,()=>{
 const r=runSyntheticCapabilityProbe(variant);assert.equal(r.validation.valid,true);assert(r.decision.solutions.every(s=>s.feasibility==='incomplete'&&s.totalCost.completeness==='reported-tax-status-unknown'));assert(r.decision.robustness.candidates.every(c=>c.status==='incomplete'&&c.utilityScore!==null&&c.riskAdjustedUtility===null));assert.equal(r.independentOutput?.status,'abstained');assert.equal(r.decision.robustness.abstentionCode,'insufficient-evidence');assert.equal(r.independentError,null);
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
test('DC06 mixed set excludes the incomplete solution before geometry and robustness selection',()=>{
 const r=runSyntheticCapabilityProbe('ONE_TOTAL_UNKNOWN');assert.equal(r.decision.solutions.filter(s=>s.feasibility==='feasible').length,2);assert.notEqual(r.decision.robustness.policyPreferredHotelId,'SYNTHETIC_CAPABILITY_0');assert.equal(r.decision.robustness.candidates.find(c=>c.hotelId==='SYNTHETIC_CAPABILITY_0')?.status,'incomplete');assert(!r.decision.robustness.comparisonCohortHotelIds.includes('SYNTHETIC_CAPABILITY_0'));assert(r.independentOutput);assert.equal(r.independentError,null);
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
test('DC17 explicit maximum-distance violation is transferred, not the complete V2 rankBand',()=>{
 const r=runSyntheticCapabilityProbe('COMPLETE',1);for(const e of r.result.evaluations.filter(e=>e.constraints.some(c=>c.code==='maximum-distance'&&c.status==='exceeded'))){const c=r.decision.robustness.candidates.find(c=>c.hotelId===e.hotel.id);assert.equal(c?.status,'ineligible');assert(c?.reasonCodes.includes('eligibility:maximum-distance-exceeded'));}
});

test('DC18 strongest diagnostic candidate outside explicit maximum is excluded before scenarios',()=>{
 const input=createSyntheticCapabilityInput('DISTANCE_LEADER_OUTSIDE');
 const unconstrained=structuredClone(input);unconstrained.maximumDistanceKm=null;
 const control=adaptV2SearchResultToDecisionV3({searchInput:unconstrained,result:evaluateSmartStaySearchV2(unconstrained)});
 assert.equal(control.robustness.policyPreferredHotelId,'SYNTHETIC_CAPABILITY_0');
 const r=runSyntheticCapabilityProbe('DISTANCE_LEADER_OUTSIDE');assert.equal(r.validation.valid,true);assert.equal(r.independentError,null);
 assert(!r.decision.robustness.comparisonCohortHotelIds.includes('SYNTHETIC_CAPABILITY_0'));
 assert.notEqual(r.decision.robustness.policyPreferredHotelId,'SYNTHETIC_CAPABILITY_0');
 assert(r.independentOutput);
 for(const scenario of r.decision.robustness.scenarios)assert(!JSON.stringify(scenario).includes('SYNTHETIC_CAPABILITY_0'));
});
test('DC19 all outside maximum returns no feasible solution, not missing-evidence or an exception',()=>{
 const r=runSyntheticCapabilityProbe('ALL_DISTANCE_OUTSIDE');assert.equal(r.validation.valid,true);assert.equal(r.independentError,null);
 assert.equal(r.independentOutput?.status,'no-feasible-solution');
 assert(r.decision.robustness.candidates.every(c=>c.status==='ineligible'&&c.reasonCodes.includes('eligibility:maximum-distance-exceeded')));
 assert(r.independentOutput?.reasonCodes.includes('eligibility:maximum-distance-exceeded'));
});
test('DC20 unverified distance does not assert violation; missing requested constraint abstains',()=>{
 const r=runSyntheticCapabilityProbe('DISTANCE_UNVERIFIED');assert.equal(r.validation.valid,true);assert.equal(r.independentError,null);
 assert(r.result.evaluations.every(e=>e.constraints.some(c=>c.code==='maximum-distance'&&c.status==='unknown')));
 assert(r.decision.robustness.candidates.every(c=>c.status==='incomplete'&&c.reasonCodes.includes('eligibility:maximum-distance-unverified')&&!c.reasonCodes.includes('eligibility:maximum-distance-exceeded')));
 assert.equal(r.independentOutput?.status,'abstained');
 const input=structuredClone(r.input);input.maximumDistanceKm=null;
 const d=adaptV2SearchResultToDecisionV3({searchInput:input,result:evaluateSmartStaySearchV2(input)});
 assert(d.robustness.candidates.some(c=>c.status==='usable'));
});
test('DC21 mixed incomplete scenario scores only eligible cohort, keeping the diagnostic utility',()=>{
 const r=runSyntheticCapabilityProbe('ONE_TOTAL_UNKNOWN');
 assert(r.decision.robustness.candidates.find(c=>c.hotelId==='SYNTHETIC_CAPABILITY_0')?.utilityScore!==null);
 for(const scenario of r.decision.robustness.scenarios)assert(!JSON.stringify(scenario).includes('SYNTHETIC_CAPABILITY_0'));
 assert(r.decision.robustness.candidates.some(c=>c.status==='usable'));
});
test('DC22 source rankBand and soft budget exclusions are not a blanket veto',()=>{
 const input=createSyntheticCapabilityInput('COMPLETE'),result=evaluateSmartStaySearchV2(input);
 for(const e of result.evaluations){e.final.rankBand='excluded';const b=e.constraints.find(c=>c.code==='budget-total')!;b.status='exceeded';}
 const d=adaptV2SearchResultToDecisionV3({searchInput:input,result});
 assert(d.robustness.candidates.every(c=>c.status==='usable'));
});
test('DC23 explicit mandatory feature failure and unknown remain distinct from distance and budget',()=>{
 for(const status of ['exceeded','unknown'] as const){
  const input=createSyntheticCapabilityInput('COMPLETE'),result=evaluateSmartStaySearchV2(input);
  for(const e of result.evaluations)e.constraints.find(c=>c.code==='mandatory-accommodation-requirements')!.status=status;
  const d=adaptV2SearchResultToDecisionV3({searchInput:input,result});
  assert(d.robustness.candidates.every(c=>c.status===(status==='exceeded'?'ineligible':'incomplete')));
  assert.equal(createIndependentV3ComparableDecisionV3(d,null).status,status==='exceeded'?'no-feasible-solution':'abstained');
 }
});
test('DC24 schema/integrity mutation still fails; incomplete data is not caught as an exception',()=>{
 const d=structuredClone(runSyntheticCapabilityProbe('COMPLETE').decision);
 const selected=d.robustness.policyPreferredHotelId!;
 d.solutions.find(s=>s.segments[0].hotelId===selected)!.feasibility='incomplete';
 assert.equal(verifyDecisionReplayV3(d,runSyntheticCapabilityProbe('COMPLETE').decision).matches,false);
 assert.throws(()=>createIndependentV3ComparableDecisionV3(d,null),/not backed by one feasible eligible/);
});
for(const variant of DIAGNOSTIC_CAPABILITY_VARIANTS)test(`DC25 ${variant}: effective independent shadow path succeeds and leaves public V2 untouched`,()=>{
 const input=createSyntheticCapabilityInput(variant),result=evaluateSmartStaySearchV2(input),before=structuredClone(result);
 const shadow=runIndependentDecisionShadowV3({mode:'shadow',comparisonToken:'synthetic-eligibility-proof',segment:{profile:'balanced',destination:'urban',leadTime:'medium',duration:'short-stay',coverage:'high'},searchInput:input,publicV2Result:result});
 assert.equal(shadow.shadowObservation?.recordType,'shadow-comparison');assert.equal(shadow.publicServingEngine,'v2');assert.equal(shadow.publicResult,result);assert.deepEqual(result,before);
});
test('DC26 all eligibility outcomes preserve provider-label and input-order invariance',()=>{
 for(const variant of DIAGNOSTIC_CAPABILITY_VARIANTS){
  const a=runSyntheticCapabilityProbe(variant),b=structuredClone(a.input);b.hotels.reverse();
  for(const h of b.hotels){h.provider='another-synthetic-source';h.dataSources=[h.provider];h.offers[0].provider=h.provider;}
  const d=adaptV2SearchResultToDecisionV3({searchInput:b,result:evaluateSmartStaySearchV2(b)});
  assert.equal(d.robustness.policyPreferredHotelId,a.decision.robustness.policyPreferredHotelId);
  assert.equal(d.robustness.abstentionCode,a.decision.robustness.abstentionCode);
  assert.deepEqual(d.robustness.candidates.map(c=>[c.hotelId,c.status,c.utilityScore,c.reasonCodes]),a.decision.robustness.candidates.map(c=>[c.hotelId,c.status,c.utilityScore,c.reasonCodes]));
 }
});
