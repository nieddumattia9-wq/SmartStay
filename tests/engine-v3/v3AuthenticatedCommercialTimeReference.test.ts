import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {prepareAuthenticatedCommercialSetV3} from '../../src/engine-v3/evaluation/authenticatedCommercialPreparationV3';
import {executeAuthenticatedCommercialV3,commercialExecutionAuthorizationV3} from '../../src/engine-v3/evaluation/executeAuthenticatedCommercialV3';
import {authenticatedDecisionInputV3} from '../../src/engine-v3/evaluation/authenticatedCommercialDecisionInputV3';
import {verifyBoundAuthenticatedCommercialV3} from '../../src/engine-v3/evaluation/boundAuthenticatedCommercialV3';
import * as independent from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import * as frontend from '../../src/engine-v2/frontend/smartStayFrontendAdapterV2';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const fixture=()=>load(pathToFileURL(resolve('tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs')).href);
type Wire=any; // Invented wire data, modified before authenticated registration.
const missingRates=(reverse:boolean)=>(b:Wire,q:Wire)=>{
 if(q.kind!=='SEARCH')return;
 b.data.find((h:Wire)=>h.hotelId==='invented-wire-property-0').roomTypes[0].rates=[];
 if(reverse)b.data.reverse();
};
for(const reverse of [false,true])test(`AC2 R1 excluded null observation ${reverse?'last':'first'} reaches actual shadow/replay`,async t=>{
 const m=await fixture(),f=m.authenticatedComparisonFixture({mutate:missingRates(reverse)}),before=m.syntheticOriginalTree(f.base);
 const p=await prepareAuthenticatedCommercialSetV3(f.locator),shadow=t.mock.method(independent,'runIndependentDecisionShadowV3');
 assert.equal(p.engineInvocations,0);assert.equal(p.assessment.status,'PREPARED_PILOT_SET');assert.equal(p.assessment.distinctQualifiedProperties,2);
 assert.equal(p.facts.offers.length,3);assert.equal(p.facts.offers[reverse?2:0].observed,null);
 assert.ok(p.assessment.offers[reverse?2:0].qualification.reasons.includes('OBSERVATION_UNREPRESENTABLE'));
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 t.diagnostic(JSON.stringify({status:r.status,counts:r.counts,actualShadowCalls:shadow.mock.callCount(),error:'error' in r?r.error:null,choice:r.decision?.robustness.policyPreferredHotelId}));
 assert.equal(r.counts.shadowRuns,shadow.mock.callCount());
 assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED');
 assert.deepEqual(r.counts,{v2Evaluations:1,v3Constructions:3,bindingCreations:1,shadowRuns:1,replayVerifications:1});
 assert.ok('evidence' in r&&r.evidence&&'comparable' in r&&r.comparable&&r.decision);
 assert.equal(r.evidence.prepared,p);assert.equal(r.evidence.setFingerprint,p.assessment.fullSetFingerprint);
 assert.equal(r.evidence.prepared.facts.offers.length,3);
 assert.equal(verifyBoundAuthenticatedCommercialV3({decision:r.decision,comparable:r.comparable,searchInput:authenticatedDecisionInputV3(p),evidence:r.evidence}),'verified');
 const o=r.shadow?.shadowObservation;assert.equal(o?.recordType,'shadow-comparison');
 assert.ok(o?.recordType==='shadow-comparison');assert.equal(o.safety.deterministicReplay,'pass');assert.equal(o.safety.publicRateConsistency,'verified');
 assert.equal(shadow.mock.calls[0].arguments[0].segment.leadTime,'medium');
 assert.deepEqual(m.syntheticOriginalTree(f.base),before);
});
test('AC2 R1 reordered excluded observation preserves qualified identities, decision and segment, not byte provenance',async t=>{
 const m=await fixture(),results=[];
 const shadow=t.mock.method(independent,'runIndependentDecisionShadowV3');
 for(const reverse of [false,true]){
  const p=await prepareAuthenticatedCommercialSetV3(m.authenticatedComparisonFixture({mutate:missingRates(reverse)}).locator);
  const input=authenticatedDecisionInputV3(p),r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
  assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED');
  results.push({ids:input.hotels.map(h=>h.id),input,decision:r.decision,counts:r.counts,fingerprint:p.assessment.fullSetFingerprint});
 }
 assert.deepEqual(results[0].ids,['invented-wire-property-1','invented-wire-property-2']);
 assert.deepEqual(results[0].input,results[1].input);assert.deepEqual(results[0].decision,results[1].decision);
 assert.deepEqual(results[0].counts,results[1].counts);assert.notEqual(results[0].fingerprint,results[1].fingerprint);
 assert.equal(shadow.mock.callCount(),2);assert.deepEqual(shadow.mock.calls[0].arguments[0].segment,shadow.mock.calls[1].arguments[0].segment);
});
for(const [reference,reason]of [
 [null,'INVALID'],['not an instant','INVALID'],['2099-09-01T12:00:02-00:00','INVALID'],
 ['2099-09-02T12:00:00Z','MISMATCH'],
] as const)test(`AC2 R1 invalid or substituted decision reference rejected before shadow: ${reference}`,async t=>{
 const p=await prepareAuthenticatedCommercialSetV3((await fixture()).authenticatedComparisonFixture().locator);
 // Deliberate fault at the actual frontend boundary, not forged issued facts.
 const build=frontend.buildSmartStayFrontendRuntimeV2;
 t.mock.method(frontend,'buildSmartStayFrontendRuntimeV2',(input:Parameters<typeof build>[0])=>{
  const runtime=build(input);return {...runtime,searchInput:{...runtime.searchInput,bookingReferenceAt:reference}};
 });
 const shadow=t.mock.method(independent,'runIndependentDecisionShadowV3');
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 assert.equal(r.status,'EXECUTED_BUT_BINDING_OR_SAFETY_FAILED');assert.ok('error' in r);
 assert.equal(r.error,'AUTHENTICATED_SEGMENT_TIME_'+reason);
 assert.equal(shadow.mock.callCount(),0);
 assert.deepEqual(r.counts,{v2Evaluations:1,v3Constructions:1,bindingCreations:0,shadowRuns:0,replayVerifications:0});
});
test('AC2 R1 counts a real shadow invocation even when that invocation throws',async t=>{
 const p=await prepareAuthenticatedCommercialSetV3((await fixture()).authenticatedComparisonFixture().locator);
 const shadow=t.mock.method(independent,'runIndependentDecisionShadowV3',()=>{throw Error('SYNTHETIC_SHADOW_FAILURE');});
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 assert.equal(r.status,'EXECUTED_BUT_BINDING_OR_SAFETY_FAILED');assert.ok('error' in r);assert.equal(r.error,'SYNTHETIC_SHADOW_FAILURE');
 assert.equal(shadow.mock.callCount(),1);assert.deepEqual(r.counts,{v2Evaluations:1,v3Constructions:1,bindingCreations:1,shadowRuns:1,replayVerifications:0});
});
