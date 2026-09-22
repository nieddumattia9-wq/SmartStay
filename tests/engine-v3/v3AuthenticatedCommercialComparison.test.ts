import test from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {prepareAuthenticatedCommercialSetV3,isAuthenticatedCommercialPreparationV3} from '../../src/engine-v3/evaluation/authenticatedCommercialPreparationV3';
import {executeAuthenticatedCommercialV3,commercialExecutionAuthorizationV3} from '../../src/engine-v3/evaluation/executeAuthenticatedCommercialV3';
import {authenticatedDecisionInputV3} from '../../src/engine-v3/evaluation/authenticatedCommercialDecisionInputV3';
import {createBoundAuthenticatedCommercialV3,verifyBoundAuthenticatedCommercialV3} from '../../src/engine-v3/evaluation/boundAuthenticatedCommercialV3';
import {buildSmartStayFrontendRuntimeV2} from '../../src/engine-v2/frontend/smartStayFrontendAdapterV2';
import {adaptV2SearchResultToDecisionV3} from '../../src/engine-v3/adapter/v2CompatibilityAdapterV3';
import {createIndependentV3ComparableDecisionV3,runIndependentDecisionShadowV3} from '../../src/engine-v3/orchestrator/independentDecisionEngineV3';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const fixture=()=>load(pathToFileURL(resolve('tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs')).href);
test('AC2 complete authenticated capture -> pure prepare -> independent A02 binding -> actual shadow/replay',async()=>{
 const m=await fixture(),f=m.authenticatedComparisonFixture(),before=m.syntheticOriginalTree(f.base),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.engineInvocations,0);assert.equal(p.assessment.status,'PREPARED_PILOT_SET',JSON.stringify(p.assessment.offers.map(x=>x.qualification.reasons)));
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED',JSON.stringify({status:r.status,counts:r.counts,error:'error' in r?r.error:null,shadow:r.shadow}));
 assert.deepEqual(r.counts,{v2Evaluations:1,v3Constructions:3,bindingCreations:1,shadowRuns:1,replayVerifications:1});
 assert.deepEqual(m.syntheticOriginalTree(f.base),before);
 assert.equal(p.facts.offers[0].continuity.providerVersion.state,'UNKNOWN');
});
test('AC2 no verification is preparation stopped, never a manufactured abstention',async()=>{
 const f=(await fixture()).authenticatedComparisonFixture({noVerification:true}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));assert.equal(r.status,'PREPARATION_STOPPED');assert.equal(r.counts.v3Constructions,0);
 assert.ok(p.assessment.offers.every(x=>x.qualification.reasons.includes('COMMERCIAL_VERIFICATION_MISSING')));
});
test('AC2 caller objects/copies do not become issued or executable by rehashing',async()=>{
 const f=(await fixture()).authenticatedComparisonFixture(),p=await prepareAuthenticatedCommercialSetV3(f.locator),copy=structuredClone(p);
 assert.equal(isAuthenticatedCommercialPreparationV3(copy),false);assert.throws(()=>authenticatedDecisionInputV3(copy),/ISSUED/);
 assert.throws(()=>executeAuthenticatedCommercialV3(p,'acquisition is not execution'),/SEPARATE_EXECUTION/);
});
test('AC2 two authenticated protocols, one without a session, have equivalent decisions and distinct provenance',async()=>{
 const m=await fixture(),a=await prepareAuthenticatedCommercialSetV3(m.authenticatedComparisonFixture().locator),b=await prepareAuthenticatedCommercialSetV3(m.authenticatedComparisonFixture({protocol:'SYNTHETIC_ATTESTED_QUOTE@1'}).locator);
 const x=executeAuthenticatedCommercialV3(a,commercialExecutionAuthorizationV3(a)),y=executeAuthenticatedCommercialV3(b,commercialExecutionAuthorizationV3(b));
 assert.equal(x.status,'COMPARISON_EXECUTED_RECOMMENDED');assert.equal(y.status,x.status);
 assert.equal(y.decision?.robustness.policyPreferredHotelId,x.decision?.robustness.policyPreferredHotelId);
 assert.notEqual(a.facts.sourceSetFingerprint,b.facts.sourceSetFingerprint);assert.equal(b.facts.offers[0].continuity.sessionId,null);
 assert.deepEqual(a.assessment.offers.map(o=>o.qualification.verified?.cost),b.assessment.offers.map(o=>o.qualification.verified?.cost));
});
type Wire=any; // Raw, intentionally malformed wire fixtures, not application DTOs.
const mutations:Array<[string,(b:Wire,q:Wire)=>void,RegExp]>=[
 ['SSP below public minimum',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].suggestedSellingPrice.amount=5000;},/PUBLIC_PRICE/],
 ['unknown verified tax coverage',(b,q)=>{if(q.kind==='PREBOOK')delete b.data.roomTypes[0].rates[0].retailRate.taxesAndFees;},/COMPLETE_VERIFIED_COST/],
 ['empty tax list is not exhaustive',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].retailRate.taxesAndFees=[];},/COMPLETE_VERIFIED_COST/],
 ['nonempty component list alone is not exhaustive',(b,q)=>{for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[])h.roomTypes[0].rates[0].retailRate.taxesAndFees=[{amount:15,currency:'EUR',included:false,mandatory:true,basis:'TOTAL_STAY'}];},/COMPLETE_VERIFIED_COST/],
 ['foreign currency component',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].retailRate.taxesAndFees=[{amount:20,currency:'USD',included:false,mandatory:true,basis:'TOTAL_STAY'}];},/COST/],
 ['known price changed',(b,q)=>{if(q.kind==='PREBOOK'){b.data.price+=12;b.data.roomTypes[0].rates[0].retailRate.total[0].amount+=12;}},/KNOWN_PRICE_CHANGED/],
 ['known cancellation changed',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].cancellationPolicies.refundableTag='RFN';},/TERMS_CHANGED/],
 ['known payment changed',(b,q)=>{if(q.kind==='SEARCH')for(const h of b.data)h.termsAndConditions='Payment: pay later';},/PAYMENT_TERMS_CHANGED/],
 ['unverified occupancy index',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].occupancyNumber=0;},/OCCUPANCY/],
 ['different ages same count',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].childrenAges=[4,8];},/CHILD_AGES/],
 ['partial age echo',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].childrenAges=[6];},/CHILD_AGES/],
 ['different room',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].mappedRoomId=999;},/ROOM_CHANGED/],
 ['different rate',(b,q)=>{if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].rateId='another-rate';},/TERMS_CHANGED/],
 ['negative availability',(b,q)=>{if(q.kind==='PREBOOK')b.data.available=false;},/AVAILABILITY/],
 ['insufficient room capacity',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.rooms[0].maxOccupancy=3;},/ACCOMMODATION/],
 ['adult limit',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.rooms[0].maxAdults=1;},/ACCOMMODATION/],
 ['children limit',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.rooms[0].maxChildren=1;},/ACCOMMODATION/],
 ['unquantified sofa',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.rooms[0].bedTypes=[{quantity:1,bedType:'Sofa bed'}];},/ACCOMMODATION/],
 ['OR remains OR',(b,q)=>{if(q.kind==='HOTEL_DETAIL'){b.data.rooms[0].bedTypes=[{quantity:1,bedType:'Double bed'},{quantity:1,bedType:'Twin bed'}];b.data.rooms[0].bedRelation='OR';}},/ACCOMMODATION/],
 ['real bed restriction',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.rooms[0].description='Second bed is not available';},/ACCOMMODATION/],
 ['family prohibited',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.policies={children:'Children are not allowed'};},/FAMILY_ADMISSION/],
 ['independent general charge',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.hotelImportantInformation='Pets are allowed and all guests must pay a service fee';},/CONDITION|COST/],
 ['deposit not stay cost or automatic consent',(b,q)=>{if(q.kind==='HOTEL_DETAIL')b.data.hotelImportantInformation='A refundable deposit is required';},/CONDITION/],
 ['expired explicit evidence',(b,q)=>{if(q.kind==='PREBOOK')b.data.validUntil='2099-09-01T11:00:00Z';},/EXPIRY_EXPIRED/],
 ['uninterpretable unknown offset',(b,q)=>{if(q.kind==='PREBOOK')b.data.validUntil='2099-09-01T13:00:00-00:00';},/UNINTERPRETABLE/],
 ['internal TTL does not fix invalid provider expiry',(b,q)=>{if(q.kind==='PREBOOK'){b.data.validUntil='tomorrow';b.data.internalExpiresAt='2099-09-01T13:00:00Z';}},/UNINTERPRETABLE/],
];
for(const [name,mutate,reason]of mutations)test('AC2 substantive guard consumed: '+name,async()=>{
 const f=(await fixture()).authenticatedComparisonFixture({mutate}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.status,'PREPARATION_STOPPED');assert.ok(p.assessment.offers.every(x=>reason.test(x.qualification.reasons.join('|'))),JSON.stringify(p.assessment.offers.map(x=>x.qualification.reasons)));
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));assert.equal(r.counts.v2Evaluations,0);assert.equal(r.counts.v3Constructions,0);
});
test('AC2 incomplete observation can be completed by verification, not overwritten',async()=>{
 const f=(await fixture()).authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='SEARCH')for(const h of b.data)delete h.roomTypes[0].rates[0].retailRate.taxesAndFees;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.status,'PREPARED_PILOT_SET');assert.ok(p.assessment.offers.every(o=>o.facts.observed?.price.coverage==='UNKNOWN'&&o.qualification.knowledge==='KNOWLEDGE_COMPLETED_BY_VERIFICATION'));
 assert.equal(executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p)).status,'COMPARISON_EXECUTED_RECOMMENDED');
});
test('AC2 conditions headings/scoped exemptions do not become blanket restrictions',async()=>{
 const f=(await fixture()).authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='HOTEL_DETAIL')b.data.policies={children:'Children',pets:'Service animals are exempt from fees'};}}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.status,'PREPARED_PILOT_SET');assert.ok(p.facts.offers[0].verified?.conditions.some(c=>c.code==='SCOPED_ANIMAL_EXEMPTION'));
});
test('AC2 failed alternatives retained, independent complete properties still enter actual engine',async()=>{
 const f=(await fixture()).authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='PREBOOK'&&q.hotelId.endsWith('-0'))delete b.data.roomTypes[0].rates[0].retailRate.taxesAndFees;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.offers.length,3);assert.equal(p.assessment.distinctQualifiedProperties,2);
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED');assert.notEqual(r.decision?.robustness.policyPreferredHotelId,'invented-wire-property-0');
});
test('AC2 entire alternatives set, not only winner, is checked by binding and actual shadow',async()=>{
 const p=await prepareAuthenticatedCommercialSetV3((await fixture()).authenticatedComparisonFixture().locator),runtime=buildSmartStayFrontendRuntimeV2(authenticatedDecisionInputV3(p));
 const decision=adaptV2SearchResultToDecisionV3({searchInput:runtime.searchInput,result:runtime.result}),comparable=createIndependentV3ComparableDecisionV3(decision,runtime.result.recommendationRoles.bestChoiceHotelId);
 const bound=createBoundAuthenticatedCommercialV3({prepared:p,searchInput:runtime.searchInput,decision,comparable});
 const changed=structuredClone(runtime.searchInput),other=changed.hotels.find(h=>h.id!==decision.robustness.policyPreferredHotelId)!;other.stars=1;
 assert.equal(verifyBoundAuthenticatedCommercialV3({decision,comparable,searchInput:changed,evidence:bound}),'failed');
 const wrong=buildSmartStayFrontendRuntimeV2(changed),shadow=runIndependentDecisionShadowV3({mode:'shadow',comparisonToken:'synthetic-set-tamper',segment:{destination:'mixed',leadTime:'long',duration:'medium-stay',coverage:'unknown',profile:'balanced'},searchInput:wrong.searchInput,publicV2Result:wrong.result,publicRateEvidence:bound});
 assert.equal(shadow.shadowObservation?.recordType,'shadow-comparison');
 if(shadow.shadowObservation?.recordType==='shadow-comparison')assert.equal(shadow.shadowObservation.safety.publicRateConsistency,'failed');
 assert.equal(verifyBoundAuthenticatedCommercialV3({decision,comparable,searchInput:runtime.searchInput,evidence:structuredClone(bound)}),'failed');
});
test('AC2 originals altered: fail authentication before semantic preparation',async()=>{
 const f=(await fixture()).authenticatedComparisonFixture(),file=resolve(f.input.root,'encrypted','001-response.aesgcm');
 const raw=readFileSync(file);writeFileSync(file,Buffer.concat([raw,Buffer.from(' ')]));
 await assert.rejects(prepareAuthenticatedCommercialSetV3(f.locator),/INTEGRITY/);
});

test('AC2 order-equivalent ages/records and irrelevant fields preserve results, not original provenance',async()=>{
 const m=await fixture(),a=await prepareAuthenticatedCommercialSetV3(m.authenticatedComparisonFixture().locator);
 const f=m.authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{
  if(q.kind==='SEARCH'){b.data.reverse();for(const h of b.data){h.roomTypes[0].rates[0].childrenAges=[11,6];h.unrelatedPresentation='not merit';}}
  if(q.kind==='PREBOOK')b.data.roomTypes[0].rates[0].childrenAges=[11,6];
 }}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.status,'PREPARED_PILOT_SET');assert.notEqual(a.facts.sourceSetFingerprint,p.facts.sourceSetFingerprint);
 assert.deepEqual(p.facts.offers[0].observed?.childAgeEchoes[0].value,[11,6]);
 const x=executeAuthenticatedCommercialV3(a,commercialExecutionAuthorizationV3(a)),y=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 assert.equal(y.status,'COMPARISON_EXECUTED_RECOMMENDED');assert.equal(x.decision?.robustness.policyPreferredHotelId,y.decision?.robustness.policyPreferredHotelId);
});

test('AC2 explicit temporal precision/equivalence and absent expiry, no clock renewal',async()=>{
 const m=await fixture();const results=[];
 for(const expiry of ['2099-09-01T13:00:00.123Z','2099-09-01T14:00:00.123000+01:00','2099-09-01T13:00:00.123001Z']){
  const f=m.authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='PREBOOK')b.data.validUntil=expiry;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
  assert.equal(p.assessment.status,'PREPARED_PILOT_SET');results.push(p.assessment.offers[0].qualification.verified?.providerValidUntil);
  assert.equal(authenticatedDecisionInputV3(p).bookingReferenceAt,p.facts.offers[0].verified?.time.evaluatedAt);
 }
 assert.equal(results[0],results[1]);assert.notEqual(results[0],results[2]);
 const p=await prepareAuthenticatedCommercialSetV3(m.authenticatedComparisonFixture().locator);
 assert.equal(p.assessment.offers[0].qualification.verified?.freshness,'UNKNOWN');
});

test('AC2 multiplicity and absent provider age echoes retain search scope, multiunit not fabricated',async()=>{
 const m=await fixture(),f=m.authenticatedComparisonFixture({configure:(c:Wire)=>{c.scenario.childAges=[6,6];},mutate:(b:Wire,q:Wire)=>{if(q.kind==='PREBOOK')delete b.data.roomTypes[0].rates[0].childrenAges;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.status,'PREPARED_PILOT_SET');const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED');
 assert.deepEqual(r.decision?.context.party?.ageInformation.ages,[6,6]);
 assert.throws(()=>m.authenticatedComparisonFixture({configure:(c:Wire)=>{c.scenario.units=2;}}),/SCENARIO_UNSUPPORTED/);
});

test('AC2 actual policy abstention remains distinct from insufficient preparation',async()=>{
 const m=await fixture(),p=await prepareAuthenticatedCommercialSetV3(m.authenticatedComparisonFixture({configure:(c:Wire)=>{c.scenario.budget=1;}}).locator);
 assert.equal(p.assessment.status,'PREPARED_PILOT_SET');const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 assert.equal(r.status,'COMPARISON_EXECUTED_ABSTAINED');assert.equal(r.counts.v2Evaluations,1);assert.equal(r.counts.v3Constructions,1);assert.equal(r.counts.bindingCreations,0);
});

test('AC2 identical duplicates retained with exclusion, not extra properties; contradictory duplicates rejected',async()=>{
 const m=await fixture(),f=m.authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='SEARCH')b.data.push(structuredClone(b.data[0]));}}),p=await prepareAuthenticatedCommercialSetV3(f.locator);
 assert.equal(p.assessment.offers.length,4);assert.equal(p.assessment.distinctQualifiedProperties,3);assert.equal(p.assessment.qualifiedKeys.length,3);
 assert.ok(p.assessment.offers[3].qualification.reasons.includes('DUPLICATE_OBSERVATION_RETAINED_NOT_ANOTHER_ALTERNATIVE'));
 assert.equal(executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p)).status,'COMPARISON_EXECUTED_RECOMMENDED');
 assert.throws(()=>m.authenticatedComparisonFixture({mutate:(b:Wire,q:Wire)=>{if(q.kind==='SEARCH'){const h=structuredClone(b.data[0]);h.roomTypes[0].rates[0].retailRate.total[0].amount+=100;b.data.push(h);}}}),/DUPLICATE_HOTEL_CONFLICT/);
});

test('AC2 offline runner: authentic DPAPI Prepare zero, separate Execute/replay, no JSON-token promotion',{skip:process.platform!=='win32'},async()=>{
 const m=await fixture(),f=m.authenticatedComparisonFixture({count:2,dpapi:true}),plan=await load(pathToFileURL(resolve('scripts/liteapi-comparison-plan-v1.mjs')).href);
 const code=resolve('scripts/run-authenticated-commercial-comparison.mjs'),inventory=resolve(f.base,'inventory.json'),locator=resolve(f.base,'locator.json'),prepared=resolve(f.base,'prepared.json'),executed=resolve(f.base,'executed.json');
 writeFileSync(locator,JSON.stringify(f.locator));
 const checkpoint=['--ExpectedHead='+plan.git(process.cwd(),['rev-parse','HEAD']),'--ExpectedBranch='+plan.git(process.cwd(),['branch','--show-current'])];
 const run=(args:string[],success=true)=>{const r=spawnSync(process.execPath,[code,...checkpoint,...args],{encoding:'utf8',windowsHide:true,timeout:120000});assert.ifError(r.error);assert.notEqual(r.status,null);if(success)assert.equal(r.status,0,r.stderr);else assert.notEqual(r.status,0);return r;};
 run(['--Mode=Inventory','--OutputPath='+inventory]);
 const inputs=['--InventoryPath='+inventory,'--InventorySha='+plan.sha(readFileSync(inventory)),'--LocatorPath='+locator,'--LocatorSha='+plan.sha(readFileSync(locator))];
 run(['--Mode=Prepare',...inputs,'--OutputPath='+prepared]);const p=JSON.parse(readFileSync(prepared,'utf8'));
 assert.equal(p.counts.v3Constructions,0);assert.equal(p.execution,null);assert.equal(isAuthenticatedCommercialPreparationV3(p.preparation),false);
 run(['--Mode=Execute',...inputs,'--OutputPath='+executed,'--Authorization='+p.executionAuthorization]);const e=JSON.parse(readFileSync(executed,'utf8'));
 assert.equal(e.execution.status,'COMPARISON_EXECUTED_RECOMMENDED');assert.equal(e.counts.v3Constructions,3);assert.equal(e.counts.replayVerifications,1);
 run(['--Mode=Execute',...inputs,'--OutputPath='+resolve(f.base,'denied.json'),'--Authorization=DENIED'],false);
});
