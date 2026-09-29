import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {exactEuroCents,qualifyStayPriceBand} from '../../server/shared/stay-price-band';
import {prepareAuthenticatedCommercialSetV3} from '../../src/engine-v3/evaluation/authenticatedCommercialPreparationV3';
import {executeAuthenticatedCommercialV3,commercialExecutionAuthorizationV3} from '../../src/engine-v3/evaluation/executeAuthenticatedCommercialV3';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(resolve(p)).href);
const money=(amount:number,currency='EUR')=>({amount,currency});
const policy={version:'stayopti.public-price-policy@2',mode:'OBSERVED_EUR_STAY_BAND',maximumAboveMinimumMinorUnits:500,calculationOffsetMinorUnits:100} as const;
for(const [p,status]of [[999.99,'BELOW_MINIMUM'],[1000,'WITHIN_COMMERCIAL_BAND'],[1002.47,'WITHIN_COMMERCIAL_BAND'],[1005,'WITHIN_COMMERCIAL_BAND'],[1005.01,'ABOVE_COMMERCIAL_BAND']] as const)test('exact whole-stay EUR band '+p,()=>{
 const r=qualifyStayPriceBand(money(1000),money(p));assert.equal(r.status,status);assert.deepEqual(r.calculationObjective,money(1001));
});
test('no epsilon, sub-cent amounts, inferred currency or FX',()=>{
 for(const m of [money(1000.001),money(1000,'USD'),{amount:1000} as any,money(NaN),money(-1)])assert.equal(exactEuroCents(m),null);
 assert.equal(qualifyStayPriceBand(money(1000),money(1001,'USD')).status,'NOT_COMPARABLE');
});
for(const delta of [0,1,2,5,5.01,-0.01])test('actual probe @1.4 qualification '+delta,async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs'),f=m.bandFixture({count:1,delta});
 assert.equal(f.progress.commerciallyObservedProperties,delta>=0&&delta<=5?1:0,JSON.stringify(f.progress));
 assert.equal(f.requests.filter((q:any)=>q.kind==='REQUOTE').length,1);assert.equal(f.requests.filter((q:any)=>q.kind==='PREBOOK').length,delta>=0&&delta<=5?1:0);
});
test('legacy exact target is preserved; @1.4 accepts actual price, not local aim',async()=>{
 const m=await at('tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs'),p=await at('scripts/liteapi-ssp-probe-v1.mjs');
 const f=m.sspProbeFixture({returned:1152,plan:(x:any)=>{x.version='stayopti.liteapi-ssp-probe@1.3';x.comparisonPlan.caseId=x.caseId;x.hotelSource={reference:'C:/invented/source.json',sha256:'a'.repeat(64),pointer:'/hotel'};x.purpose='BOUNDED_REQUEST_MARGIN_FUNCTIONAL_TEST_NO_ENGINE';}});
 assert.equal(p.assessSspRequote(f.plan,f.first,f.second).status,'STOP');
 const g=(await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs')).bandFixture({count:1});assert.equal(g.progress.commerciallyObservedProperties,1);
 const prepared=p.prepareSspRequote((await at('scripts/liteapi-band-comparison-plan-v1.mjs')).bandProbePlan(g.config,g.progress.offers[0].hotelId,g.records[0].response.body.sha256),g.records[0]);
 const wire=JSON.parse(Buffer.from(g.records[1].response.body.base64,'base64').toString());assert.equal(wire.data[0].roomTypes[0].offerRetailRate.amount,902);assert.equal(prepared.localTarget.amount,901);
});
for(const [name,mutate,expected]of [
 ['one cent rate higher',(b:any)=>{b.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice.amount+=0.01;},1],
 ['one cent offer higher',(b:any)=>{b.data[0].roomTypes[0].suggestedSellingPrice.amount+=0.01;},1],
 ['larger SSP conflict',(b:any)=>{b.data[0].roomTypes[0].suggestedSellingPrice.amount+=0.02;},0],
 ['SSP different currency',(b:any)=>{b.data[0].roomTypes[0].suggestedSellingPrice.currency='USD';},0],
 ['two rates are not one unit scope',(b:any)=>{b.data[0].roomTypes[0].rates.push(structuredClone(b.data[0].roomTypes[0].rates[0]));},0],
 ['missing SSP',(b:any)=>{delete b.data[0].roomTypes[0].suggestedSellingPrice;delete b.data[0].roomTypes[0].rates[0].retailRate.suggestedSellingPrice;},0],
] as const)test('qualified source restriction: '+name,async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs');
 const f=m.bandFixture({count:1,mutate:(b:any,q:any)=>{if(['SEARCH','REQUOTE'].includes(q.kind))mutate(b);if(q.kind==='PREBOOK'&&name.includes('one cent')){const wrapped={data:[b.data]};mutate(wrapped);}}});
 assert.equal(f.progress.commerciallyObservedProperties,expected,JSON.stringify(f.progress));
});
test('price cannot disambiguate equivalent competitors; uncertainty cannot manufacture uniqueness',async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs');
 for(const unknown of [false,true]){
  const f=m.bandFixture({count:1,mutate:(b:any,q:any)=>{if(q.kind==='REQUOTE'){const other=structuredClone(b.data[0].roomTypes[0]);other.offerId='different-opaque-token';other.offerRetailRate.amount=1200;other.rates[0].retailRate.total[0].amount=1200;if(unknown)delete other.rates[0].boardName;b.data[0].roomTypes.push(other);}}});
  assert.equal(f.progress.commerciallyObservedProperties,0);assert.equal(f.requests.some((q:any)=>q.kind==='PREBOOK'),false);
 }
});
for(const [name,mutate]of [
 ['price moved inside band',(b:any)=>{b.data.price+=0.01;b.data.roomTypes[0].offerRetailRate.amount+=0.01;b.data.roomTypes[0].rates[0].retailRate.total[0].amount+=0.01;}],
 ['cancellation changed',(b:any)=>{b.data.roomTypes[0].rates[0].cancellationPolicies.refundableTag='RFN';}],
 ['different ages',(b:any)=>{b.data.roomTypes[0].rates[0].childrenAges=[4,8];}],
] as const)test('prebook remains a distinct exact continuation: '+name,async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs'),f=m.bandFixture({count:1,mutate:(b:any,q:any)=>{if(q.kind==='PREBOOK')mutate(b);}});
 assert.equal(f.progress.commerciallyObservedProperties,0);assert.equal(f.requests.filter((q:any)=>q.kind==='PREBOOK').length,1);
});
test('MAX31 authenticated originals -> pure preparation -> actual A02 decision/binding/shadow/replay',async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs'),tree=(await at('tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs')).syntheticOriginalTree;
 const f=m.authenticatedBandFixture(),before=tree(f.base),p=await prepareAuthenticatedCommercialSetV3(f.locator,policy);
 assert.equal(p.engineInvocations,0);assert.equal(p.assessment.status,'PREPARED_PILOT_SET',JSON.stringify(p.assessment.offers.map(x=>({selected:x.facts.selected,reasons:x.qualification.reasons}))));
 assert.equal(p.assessment.distinctQualifiedProperties,10);assert.equal(p.facts.offers.length,20);assert.equal(p.facts.offers.filter(o=>o.selected).length,10);
 for(const o of p.assessment.offers.filter(o=>o.qualification.status==='QUALIFIED_AT_OBSERVATION'))assert.equal(o.qualification.verified?.cost.completeTotal,o.facts.verified?.price.observed?.amount);
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));
 assert.equal(r.status,'COMPARISON_EXECUTED_RECOMMENDED',JSON.stringify(r));assert.deepEqual(r.counts,{v2Evaluations:1,v3Constructions:3,bindingCreations:1,shadowRuns:1,replayVerifications:1});
 assert.deepEqual(tree(f.base),before);assert.equal(f.requests.length,31);
});
test('nine complete properties remain pilot incomplete, not a policy abstention',async()=>{
 const f=(await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs')).authenticatedBandFixture({count:9,direct:true}),p=await prepareAuthenticatedCommercialSetV3(f.locator,policy);
 assert.equal(p.assessment.distinctQualifiedProperties,9);assert.notEqual(p.assessment.status,'PREPARED_PILOT_SET');
 const r=executeAuthenticatedCommercialV3(p,commercialExecutionAuthorizationV3(p));assert.equal(r.status,'PILOT_SAMPLE_INCOMPLETE');assert.equal(r.counts.shadowRuns,0);assert.equal(r.counts.v2Evaluations,0);
});
for(const variant of ['bounded discrepancy','new verification threshold','unqualified scalar threshold','missing total coverage','missing mapped beds','changed verified price'])test('authenticated A02 consumes rather than merely records: '+variant,async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs');
 const f=m.authenticatedBandFixture({count:1,direct:true,mutate:(b:any,q:any)=>{
  if(variant==='bounded discrepancy')for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[])h.roomTypes[0].rates[0].retailRate.suggestedSellingPrice.amount+=0.01;
  if(variant==='new verification threshold'&&q.kind==='PREBOOK')b.data.suggestedSellingPrice={amount:900,currency:'EUR'};
  if(variant==='unqualified scalar threshold'&&q.kind==='PREBOOK')b.data.suggestedSellingPrice=900;
  if(variant==='missing total coverage'&&q.kind==='PREBOOK')delete b.data.roomTypes[0].rates[0].retailRate.taxesAndFees;
  if(variant==='missing mapped beds'){
   if(q.kind==='HOTEL_DETAIL'){delete b.data.rooms[0].bedTypes;b.data.rooms[0].roomName='Unknown inventory';}
   for(const h of q.kind==='SEARCH'?b.data:q.kind==='PREBOOK'?[b.data]:[])h.roomTypes[0].rates[0].name='Private room; Private bathroom';
  }
  if(variant==='changed verified price'&&q.kind==='PREBOOK'){b.data.price+=0.01;b.data.roomTypes[0].offerRetailRate.amount+=0.01;b.data.roomTypes[0].rates[0].retailRate.total[0].amount+=0.01;}
 }}),p=await prepareAuthenticatedCommercialSetV3(f.locator,policy);
 assert.equal(p.assessment.distinctQualifiedProperties,['bounded discrepancy','new verification threshold'].includes(variant)?1:0,JSON.stringify(p.assessment.offers.map(o=>o.qualification.reasons)));
 assert.equal(p.engineInvocations,0);
});
for(const malformed of [null,{unexpected:true},[]])test('excluded malformed/empty records remain explicit without crashing preparation: '+JSON.stringify(malformed),async()=>{
 const m=await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs');
 const f=m.authenticatedBandFixture({count:1,mutate:(b:any,q:any)=>{if(q.kind==='SEARCH')b.data[0].roomTypes=malformed;}}),p=await prepareAuthenticatedCommercialSetV3(f.locator,policy);
 assert.equal(p.facts.offers.length,0);assert.equal(p.facts.normalizationExclusions?.length,1);assert.deepEqual((p.facts.normalizationExclusions![0].original as any).roomTypes,malformed);
 assert.equal(p.assessment.status,'PILOT_SAMPLE_INCOMPLETE');assert.equal(p.engineInvocations,0);
});
