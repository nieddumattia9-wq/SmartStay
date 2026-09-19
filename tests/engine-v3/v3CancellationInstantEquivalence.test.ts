import assert from 'node:assert/strict';
import test from 'node:test';
import {join,isAbsolute,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';

const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const kernel=require('../../src/engine-v3/evaluation/observedOfferDiagnosticV3');
const policy=require('../../src/engine-v3/policy/personalUtilityRolePolicyV3');
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const beforeTime='2099-09-25T12:00:00Z';

async function exercise(id:string,afterTime:string,documentary=true,change?:any){
 const f=await at(documentary?'tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs':'tests/engine-v3/fixtures/liteApiObservationSyntheticV1.mjs');
 const m=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 const mutate=(p:any,q:any)=>{
  const hotels=q.kind==='SEARCH'?p.data:['PREBOOK','PREBOOK_GET'].includes(q.kind)?[p.data]:[];
  for(const h of hotels)for(const o of h.roomTypes)for(const r of o.rates){
   r.cancellationPolicies={refundableTag:'RFN',cancelPolicyInfos:[{cancelTime:q.kind==='PREBOOK_GET'?afterTime:beforeTime,amount:35,currency:'EUR',type:'amount'}],hotelRemarks:[]};
   if(q.kind==='PREBOOK_GET')change?.(r.cancellationPolicies,r,p);
  }
 };
 const request=documentary?f.documentaryCaptureFixture({mutate}):await f.providerCapture({mutate});
 const original=JSON.stringify(request);let kernelCalls=0,policyCalls=0;
 const old=policy.runPersonalUtilityRolePolicyV3;policy.runPersonalUtilityRolePolicyV3=(...args:any[])=>{policyCalls++;return old(...args);};
 try{
  const prepared=documentary?m.prepareLiteApiProviderObservation(request):m.prepareLiteApiObservationDiagnostic(request);
  assert.equal(policyCalls,0);
  const output=prepared.status==='PREPARED_DIAGNOSTIC_INPUT'?(kernelCalls++,kernel.computeObservedOfferDiagnosticV3(prepared.input)):null;
  assert.equal(policyCalls,output?.policyInvocations??0);assert.equal(JSON.stringify(request),original);
  const directory=process.env.STAYOPTI_D0068_R06_EVIDENCE_DIR;
  if(directory){assert(isAbsolute(directory)&&relative(process.cwd(),resolve(directory)).startsWith('..')&&existsSync(directory));
   writeFileSync(join(directory,id+'.json'),JSON.stringify({syntheticOnly:true,id,request,prepared,output,originalsPreserved:true,inputSha256:sha(original),
    sourceSha256:sha(readFileSync('scripts/liteapi-observation-diagnostic-v1.mjs','utf8')),kernelCalls,policyCalls,providerRequests:0},null,2)+'\n',{flag:'wx'});}
  return {...prepared,output,kernelCalls,policyCalls};
 }finally{policy.runPersonalUtilityRolePolicyV3=old;}
}

test('CT01 documentary equivalent offset must not become a material cancellation change',async()=>{
 const r=await exercise('ct01-equivalent-documentary','2099-09-25T13:00:00+01:00');
 assert(r.observations.every((o:any)=>o.prebookVerified),JSON.stringify(r.observations.map((o:any)=>o.issues)));
 assert.equal(r.output.decision.status,'usable');assert.equal(r.kernelCalls,1);assert.equal(r.policyCalls,1);
});
test('CT02 synthetic capture comparison shares equivalent-instant semantics',async()=>{
 const r=await exercise('ct02-equivalent-synthetic','2099-09-25T08:00:00-04:00',false);
 assert(r.observations.every((o:any)=>o.prebookVerified));assert.equal(r.output.decision.status,'usable');
});
test('CT03 a truly later deadline remains a material difference',async()=>{
 const r=await exercise('ct03-later','2099-09-25T13:00:01+01:00');
 assert(r.observations.every((o:any)=>!o.prebookVerified&&o.issues.includes('PREBOOK_RETRIEVAL_COMMERCIAL_CONFLICT')));
 assert.equal(r.output.decision.status,'abstained');assert.equal(r.policyCalls,1);
});
test('CT04 missing timezone cannot be promoted to equivalent cancellation',async()=>{
 const r=await exercise('ct04-no-zone','2099-09-25T12:00:00');
 assert(r.observations.every((o:any)=>!o.prebookVerified));assert.equal(r.output.decision.status,'abstained');
});
test('CT05 equivalent time does not erase a changed fee',async()=>{
 const r=await exercise('ct05-fee','2099-09-25T13:00:00+01:00',true,(c:any)=>{c.cancelPolicyInfos[0].amount=90;});
 assert(r.observations.every((o:any)=>!o.prebookVerified&&o.issues.includes('PREBOOK_RETRIEVAL_COMMERCIAL_CONFLICT')));
 assert.equal(r.output.decision.status,'abstained');
});

for(const [id,a,b] of [
 ['positive-offset','2099-09-25T12:00:00Z','2099-09-25T13:00:00+01:00'],
 ['negative-offset','2099-09-25T12:00:00Z','2099-09-25T08:00:00-04:00'],
 ['day-and-year-boundary','2099-12-31T23:30:00Z','2100-01-01T01:30:00+02:00'],
 ['leap-day','2096-02-29T23:30:00Z','2096-03-01T00:30:00+01:00'],
 ['fraction-trailing-zero','2099-09-25T12:00:00.125Z','2099-09-25T13:00:00.125000+01:00'],
 ['sub-millisecond','2099-09-25T12:00:00.0001234Z','2099-09-25T13:00:00.000123400+01:00'],
 ['minute-precision','2099-09-25T12:00Z','2099-09-25T13:00:00+01:00'],
 ['explicit-zero','2099-09-25T12:00:00Z','2099-09-25T12:00:00+00:00'],
 ['case-variants','2099-09-25t12:00:00z','2099-09-25T13:00:00+01:00'],
 ['early-year','0099-09-25T12:00:00Z','0099-09-25T13:00:00+01:00'],
] as const)test('CT06 explicit valid equivalence '+id,async()=>{
 const m=await at('server/shared/explicit-instant.mjs'),r=m.compareExplicitInstants(a,b);
 assert.equal(r.status,'SAME_INSTANT');assert.equal(r.equivalent,true);assert.equal(r.before.original,a);assert.equal(r.after.original,b);
 assert.deepEqual(m.compareExplicitInstants(b,a).status,r.status);
});

for(const [id,a,b] of [
 ['second','2099-09-25T12:00:00Z','2099-09-25T13:00:01+01:00'],
 ['fraction','2099-09-25T12:00:00.0001Z','2099-09-25T12:00:00.0002Z'],
 ['sub-millisecond','2099-09-25T12:00:00.000000001Z','2099-09-25T12:00:00.000000002Z'],
 ['offset','2099-09-25T12:00:00Z','2099-09-25T12:00:00+01:00'],
 ['minute','2099-09-25T12:00Z','2099-09-25T12:01Z'],
] as const)test('CT07 genuine instant difference '+id,async()=>{
 const m=await at('server/shared/explicit-instant.mjs'),r=m.compareExplicitInstants(a,b);
 assert.equal(r.status,'DIFFERENT_INSTANT');assert.equal(r.equivalent,false);
});

for(const value of [
 '2099-09-25','2099-09-25T12:00:00','25/09/2099 12:00','2099-09-25T12:00:00 Europe/Rome',
 '2099-09-25T12:00:00-00:00','2099-02-29T12:00:00Z','2100-02-29T12:00:00Z','2099-02-30T12:00:00Z',
 '2099-04-31T12:00:00Z','2099-13-01T12:00:00Z','2099-00-01T12:00:00Z','2099-09-00T12:00:00Z',
 '2099-09-25T24:00:00Z','2099-09-25T12:60:00Z','2099-09-25T12:00:60Z',
 '2099-09-25T12:00:00+24:00','2099-09-25T12:00:00+01:60','2099-09-25T12:00:00+0100',
 '2099-09-25T12:00:00Z if confirmed','2099-09-25 12:00:00Z','0000-09-25T12:00:00Z',null,undefined,0,
])test('CT08 no inferred or normalized timestamp '+String(value),async()=>{
 const m=await at('server/shared/explicit-instant.mjs'),r=m.compareExplicitInstants(value,beforeTime);
 assert.equal(r.status,'INSUFFICIENT_INFORMATION');assert.equal(r.equivalent,false);assert.equal(r.before.original,value);
 const identical=m.compareExplicitInstants(value,value);
 assert.equal(identical.equivalent,true);assert.equal(identical.status,'INSUFFICIENT_INFORMATION');
});

test('CT09 documentary comparison retains original policies, amounts and timestamp provenance',async()=>{
 const r=await exercise('ct09-trace','2099-09-25T13:00:00+01:00');
 for(const o of r.observations){const c=o.retrievalComparison.commercial.cancellationTimeComparison[0];
  assert.equal(c.status,'SAME_INSTANT');assert.equal(c.before.original,beforeTime);assert.equal(c.after.original,'2099-09-25T13:00:00+01:00');
  assert.equal(o.retrievalComparison.sources.length,2);assert(o.retrievalComparison.sources.every((s:any)=>s.responseSha256.length===64));
 }
});

for(const [id,change] of [
 ['currency',(c:any)=>{c.cancelPolicyInfos[0].currency='USD';}],
 ['penalty-type',(c:any)=>{c.cancelPolicyInfos[0].type='percent';}],
 ['refundable-tag',(c:any)=>{c.refundableTag='NRFN';}],
 ['additional-rule',(c:any)=>{c.cancelPolicyInfos.push({cancelTime:'2099-09-26T12:00:00Z',amount:70,currency:'EUR',type:'amount'});}],
 ['commercial-condition',(c:any)=>{c.extraCondition='Subject to commercial confirmation';}],
] as const)test('CT10 equivalent timestamp never hides another commercial change '+id,async()=>{
 const r=await exercise('ct10-'+id,'2099-09-25T13:00:00+01:00',true,change);
 assert(r.observations.every((o:any)=>!o.prebookVerified));assert.equal(r.output.decision.status,'abstained');
});

test('CT11 unknown date-like fields and free policy text are not reinterpreted',async()=>{
 const m=await at('scripts/liteapi-cancellation-comparison-v1.mjs');
 const a={cancellationPolicies:{cancelPolicyInfos:[{cancelTime:beforeTime,amount:20,currency:'EUR',auditTime:beforeTime}],policyText:'until '+beforeTime}};
 const b=structuredClone(a);b.cancellationPolicies.cancelPolicyInfos[0].auditTime='2099-09-25T13:00:00+01:00';
 assert.equal(m.compareLiteApiCommercialTerms(a,b).equal,false);
 b.cancellationPolicies.cancelPolicyInfos[0].auditTime=beforeTime;b.cancellationPolicies.policyText='until 2099-09-25T13:00:00+01:00';
 assert.equal(m.compareLiteApiCommercialTerms(a,b).equal,false);
});

test('CT12 unchanged ambiguous data is not certified as temporal equivalence',async()=>{
 const m=await at('scripts/liteapi-cancellation-comparison-v1.mjs');
 const a={cancellationPolicies:{cancelPolicyInfos:[{cancelTime:'2099-09-25T12:00:00',amount:20,currency:'EUR'}]}};
 const b=structuredClone(a),r=m.compareLiteApiCommercialTerms(a,b);
 assert.equal(r.equal,true);assert.equal(r.temporalComparisons[0].status,'INSUFFICIENT_INFORMATION');
 assert.deepEqual(a,b);assert.equal(r.originalsRewritten,false);assert.equal(r.nonTemporalTermsReinterpreted,false);
});
