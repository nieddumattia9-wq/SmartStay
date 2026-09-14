import assert from 'node:assert/strict';
import test from 'node:test';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {computeObservedOfferDiagnosticV3} from '../../src/engine-v3/evaluation/observedOfferDiagnosticV3';

const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const moduleAt=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const selected=(payload:any)=>payload.data.roomTypes[0].rates[0];
const commercial=(request:any)=>['PREBOOK','PREBOOK_GET'].includes(request.kind);
async function exercise(mutate:(p:any,q:any,index:number)=>void){
  const fixture=await moduleAt('tests/engine-v3/fixtures/liteApiObservationSyntheticV1.mjs');
  const adapter=await moduleAt('scripts/liteapi-observation-diagnostic-v1.mjs');
  const request=await fixture.providerCapture({mutate}),before=JSON.stringify(request);
  let actualKernelCalls=0;
  const result=adapter.executeLiteApiObservationDiagnostic(request,(input:any)=>{actualKernelCalls++;return computeObservedOfferDiagnosticV3(input);});
  assert.equal(JSON.stringify(request),before,'raw source/capture must stay byte-identical');
  assert.equal(actualKernelCalls,1);assert.equal(result.engineInvocations,1);assert.equal(result.policyInvocations,1);
  assert.equal(result.output.candidates.length,3);
  return result;
}

// Initial read-only probes (2026-09-14, before these guards) were usable for all
// five defects below. Original simulated provider fields are changed, rather
// than manufacturing normalized claims or bypassing the capture verifier.
for(const kind of ['TOP_ERROR','DATA_ERROR','RATE_NOT_BOOKABLE','RATE_UNAVAILABLE']){
  test('LI01 HTTP 200 cannot override explicit '+kind,async()=>{
    const result=await exercise((p,q)=>{
      if(!commercial(q))return;
      if(kind==='TOP_ERROR')p.error={code:'synthetic-sold-out'};
      if(kind==='DATA_ERROR')p.data.error={code:'synthetic-rate-invalid'};
      if(kind==='RATE_NOT_BOOKABLE')selected(p).bookable=false;
      if(kind==='RATE_UNAVAILABLE')selected(p).available=false;
    });
    assert(result.normalization.offers.every((o:any)=>o.availability.bookability.value!==true));
    assert.equal(result.output.decision.status,'abstained');
  });
}

test('LI02 explicitly expired selected-rate evidence is not relabelled expiry absent',async()=>{
  const result=await exercise((p,q)=>{if(commercial(q))selected(p).expiresAt='2099-09-01T11:59:00Z';});
  assert(result.normalization.offers.every((o:any)=>o.availability.bookability.value!==true));
  assert.equal(result.output.decision.status,'abstained');
  assert(result.observations.every((o:any)=>o.time.status!=='PROVIDER_EXPIRY_NOT_DECLARED'));
});

test('LI03 explicit future nested expiry remains a documented interval, no invented TTL',async()=>{
  const result=await exercise((p,q)=>{if(commercial(q))selected(p).expiresAt='2099-09-01T12:20:00Z';});
  assert.equal(result.output.decision.status,'usable');
  assert(result.observations.every((o:any)=>o.time.providerValidUntil==='2099-09-01T12:20:00Z'&&o.time.internalTtl===null));
});

test('LI04 capacity contradiction at prebook cannot revive historical suitability',async()=>{
  const result=await exercise((p,q)=>{if(q.kind==='PREBOOK')selected(p).maxOccupancy=1;});
  assert.equal(result.output.decision.status,'abstained');
  assert(result.assessment.offers.every((o:any)=>o.accommodation.status!=='SATISFIED'));
  for(const candidate of result.input.candidates){
    assert.equal(candidate.observations.other.search.rate.maxOccupancy,4);
    assert.equal(candidate.observations.other.prebook.rate.maxOccupancy,1);
    assert.equal(candidate.observations.other.retrieval.rate.maxOccupancy,4);
  }
});

test('LI05 mixed identity fields on property details never certify its stars or services',async()=>{
  const result=await exercise((p,q)=>{if(q.kind==='HOTEL_DETAIL')p.data.hotelId='synthetic-contradictory-property';});
  assert(result.observations.every((o:any)=>o.detailIdentityVerified===false));
  assert(result.input.candidates.every((o:any)=>o.facts.find((f:any)=>f.code==='property.stars').value===null));
  assert.equal(result.output.decision.status,'abstained');
});

test('LI06 contradictory rate and offer retail values do not certify the lower cost',async()=>{
  const result=await exercise((p,q)=>{if(commercial(q))selected(p).offerRetailRate={amount:5000,currency:'EUR'};});
  assert(result.normalization.offers.every((o:any)=>o.completeTotal.value===null));
  assert(result.observations.every((o:any)=>o.fiscal.issues.includes('NESTED_RETAIL_TOTAL_CONFLICT')));
  assert.equal(result.output.decision.status,'abstained');
});

test('LI07 trailing bed limitation cannot be dropped by positive-clause selection',async()=>{
  const result=await exercise((p,q)=>{if(commercial(q))selected(p).name='Private room; Private bathroom; 2 letti matrimoniali; non disponibili';});
  assert(result.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='INSUFFICIENT_INFORMATION'));
  assert.equal(result.output.decision.status,'abstained');
});

test('LI08 nested contradictory occupancy preserves family rather than certifying query counts',async()=>{
  const result=await exercise((p,q)=>{if(commercial(q))selected(p).occupancy={adults:1,children:[]};});
  assert(result.normalization.offers.every((o:any)=>o.availability.bookability.value!==true));
  assert.deepEqual(result.output.party,{adults:2,childAgesAtStay:[7,12],unitsRequested:1});
  assert.equal(result.output.decision.status,'abstained');
});

test('LI09 absent errors and absent expiry remain distinct from an explicit negative',async()=>{
  const result=await exercise(()=>{});
  assert.equal(result.output.decision.status,'usable');
  assert(result.observations.every((o:any)=>o.time.providerValidUntil===null&&o.time.status==='PROVIDER_EXPIRY_NOT_DECLARED'));
});
