import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

// D-0061 R1: original providerCapture fixture is left unchanged. All mutations
// below alter newly generated invented wire responses, never normalized truth.
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const kernel=require('../../src/engine-v3/evaluation/observedOfferDiagnosticV3');
const policy=require('../../src/engine-v3/policy/personalUtilityRolePolicyV3');
const bytesHash=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const selected=(p:any)=>p.data.roomTypes[0].rates[0];
const commercial=(q:any)=>['PREBOOK','PREBOOK_GET'].includes(q.kind);
const record=(id:string,value:any)=>{
 const configured=process.env.STAYOPTI_D0061_R1_EVIDENCE_DIR;if(!configured)return;
 const root=resolve(configured),rel=relative(process.cwd(),root);
 assert(isAbsolute(configured)&&rel.startsWith('..')&&!isAbsolute(rel),'Test evidence must stay outside repository');
 assert(existsSync(root),'Explicit fresh synthetic evidence directory required');
 const filename=id.replace(/[<>:"/\\|?*\x00-\x1f]/g,c=>'_'+c.charCodeAt(0).toString(16));
 writeFileSync(join(root,filename+'.json'),JSON.stringify(value,null,2),{encoding:'utf8',flag:'wx'});
};
async function exercise(id:string,options:any={}){
 const f=await at('tests/engine-v3/fixtures/liteApiObservationSyntheticV1.mjs');
 const m=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 const request=await f.providerCapture(options),before=JSON.stringify(request);
 let actualKernel=0,actualPolicy=0;const oldPolicy=policy.runPersonalUtilityRolePolicyV3;
 policy.runPersonalUtilityRolePolicyV3=(...args:any[])=>{actualPolicy++;return oldPolicy(...args);};
 try{
  const preparation=m.prepareLiteApiObservationDiagnostic(request);
  assert.equal(actualKernel,0);assert.equal(actualPolicy,0);assert.equal(preparation.engineInvocations,0);assert.equal(preparation.policyInvocations,0);
  const result=m.executeLiteApiObservationDiagnostic(request,(input:any)=>{actualKernel++;return kernel.computeObservedOfferDiagnosticV3(input);});
  assert.equal(actualKernel,1);assert.equal(actualPolicy,1);assert.equal(result.engineInvocations,1);assert.equal(result.policyInvocations,1);
  assert.equal(JSON.stringify(request),before,'Original request/capture bytes changed');
  assert.equal(result.output.candidates.length,3);assert.equal(result.output.publicIntegrationEnabled,false);assert.equal(result.output.automaticGoldenAdmission,false);
  record(id,{mode:'SYNTHETIC_ONLY',case:id,sourceCheckpoint:'3d94b9f45632260f65784d011c53366dc9f4f2b7',
   code:{adapterSha256:bytesHash(readFileSync(join(process.cwd(),'scripts/liteapi-observation-diagnostic-v1.mjs'))),
    fixtureSha256:bytesHash(readFileSync(join(process.cwd(),'tests/engine-v3/fixtures/liteApiObservationSyntheticV1.mjs'))),
    compiledKernelSha256:bytesHash(readFileSync(require.resolve('../../src/engine-v3/evaluation/observedOfferDiagnosticV3')))},
   inputSha256:bytesHash(before),originalsPreserved:before===JSON.stringify(request),request,preparation,result,
   actualInvocations:{purePreparation:{kernel:0,policy:0},execution:{kernel:actualKernel,policy:actualPolicy}},externalHttpRequests:0});
  return result;
 }finally{policy.runPersonalUtilityRolePolicyV3=oldPolicy;}
}

test('LSI01 A specific second-bed unavailability cannot certify four sleeping places',async()=>{
 const r=await exercise('A_SECOND_BED_UNAVAILABLE',{mutate:(p:any,q:any)=>{if(commercial(q))selected(p).name=
  'Private room; Private bathroom; 2 letti matrimoniali; secondo letto non disponibile';}});
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status!=='SATISFIED'),'Specific negative clause was lost; sleeping incorrectly SATISFIED');
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.documentedLowerBound!==4));
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state==='CONFLICTING'));
 assert(r.observations.every((o:any)=>o.sleepingInterpretation.status==='CONFLICTING_INVENTORY'));
 assert.equal(r.output.decision.status,'abstained');
});
test('LSI02 B pending bed configuration cannot certify four sleeping places',async()=>{
 const r=await exercise('B_BED_CONFIGURATION_PENDING',{mutate:(p:any,q:any)=>{if(commercial(q))selected(p).name=
  'Private room; Private bathroom; 2 letti matrimoniali; configurazione letti da confermare';}});
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status!=='SATISFIED'),'Pending configuration was lost; sleeping incorrectly SATISFIED');
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state==='UNKNOWN'));
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='INSUFFICIENT_INFORMATION'));
 assert.equal(r.output.decision.status,'abstained');
});
test('LSI03 C top-level property detail error cannot supply stars or facilities',async()=>{
 const r=await exercise('C_DETAIL_TOP_ERROR',{mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.error={code:'synthetic-property-details-invalid'};}});
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===null),'Semantically failed detail supplied stars');
 assert(r.input.candidates.every((c:any)=>!c.facts.some((f:any)=>f.code.startsWith('feature.')&&f.value===true)));
 assert(r.observations.every((o:any)=>o.detailIdentityVerified===true&&o.detailUsable===false&&o.detailSemanticStatus==='PROVIDER_ERROR'));
 assert.equal(r.output.decision.status,'abstained');
});
test('LSI04 D nested property detail error cannot supply stars or facilities',async()=>{
 const r=await exercise('D_DETAIL_DATA_ERROR',{mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.error={code:'synthetic-property-details-invalid'};}});
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===null),'Semantically failed detail supplied stars');
 assert(r.input.candidates.every((c:any)=>!c.facts.some((f:any)=>f.code.startsWith('feature.')&&f.value===true)));
 assert(r.observations.every((o:any)=>o.detailIdentityVerified===true&&o.detailUsable===false&&o.detailSemanticStatus==='PROVIDER_ERROR'));
 assert.equal(r.output.decision.status,'abstained');
});
test('LSI05 complete invented control remains usable with real kernel/policy and unchanged originals',async()=>{
 const r=await exercise('E_COMPLETE_CONTROL');assert.equal(r.output.decision.status,'usable');
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='SATISFIED'));
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===4));
});
test('LSI06 prebook semantic error remains commercially invalid but detail facts are independent',async()=>{
 const r=await exercise('F_PREBOOK_ERROR_CONTROL',{mutate:(p:any,q:any)=>{if(commercial(q))p.error={code:'synthetic-rate-invalid'};}});
 assert.equal(r.output.decision.status,'abstained');assert(r.normalization.offers.every((o:any)=>o.availability.bookability.value!==true));
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===4));
});

for(const [label,clause] of [
 ['negative-italian','il secondo letto non disponibile'],
 ['negative-english','second bed not available'],
 ['negative-unavailable','second bed unavailable'],
 ['conditional-italian','configurazione letti su richiesta'],
 ['conditional-english','second bed subject to availability'],
 ['conditional-confirmation','bed configuration to be confirmed'],
 ['unknown','configurazione letti sconosciuta'],
 ['unsupported','letti secondo un piano non documentato'],
] as const)test('LSI07 scoped bed qualification is preserved: '+label,async()=>{
 const r=await exercise('G_'+label,{mutate:(p:any,q:any)=>{if(commercial(q))selected(p).name=
  'Private room; Private bathroom; 2 letti matrimoniali; '+clause;}});
 const negative=label.startsWith('negative');
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state===(negative?'CONFLICTING':'UNKNOWN')));
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status!=='SATISFIED'&&o.accommodation.sleeping.documentedLowerBound!==4));
 assert(r.observations.every((o:any)=>o.sleepingInterpretation.clauses.some((c:any)=>c.text===clause)),'Original limiting clause omitted from interpretation trace');
 assert.equal(r.output.decision.status,'abstained');
});

for(const [label,clause] of [
 ['breakfast-unavailable','colazione non disponibile'],
 ['breakfast-request','colazione su richiesta'],
 ['wifi-unavailable','WiFi non disponibile'],
 ['extra-beds-absent','nessun letto aggiuntivo disponibile'],
 ['extra-beds-english','no extra beds'],
 ['supplementary-beds-absent','nessun letto supplementare disponibile'],
] as const)test('LSI08 unrelated limitation does not erase a valid base inventory: '+label,async()=>{
 const r=await exercise('H_'+label,{mutate:(p:any,q:any)=>{if(commercial(q))selected(p).name=
  'Private room; Private bathroom; 2 letti matrimoniali; '+clause;}});
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state==='KNOWN'));
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='SATISFIED'&&o.accommodation.sleeping.documentedLowerBound===4));
 assert.equal(r.output.decision.status,'usable');
});

for(const qualifier of ['non disponibili','da verificare','da definire','senza garanzia','secondo disponibilità'])test('LSI09 bare unresolved qualifier is insufficient: '+qualifier,async()=>{
 const r=await exercise('I_BARE_'+qualifier.replaceAll(' ','_'),{mutate:(p:any,q:any)=>{if(commercial(q))selected(p).name=
  'Private room; Private bathroom; 2 letti matrimoniali; '+qualifier;}});
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='INSUFFICIENT_INFORMATION'));
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state==='UNKNOWN'&&o.sleeping.value===null));
 assert.equal(r.output.decision.status,'abstained');
});

for(const path of ['root','data'])for(const marker of ['error','errors'])test('LSI10 '+path+'.'+marker+' blocks detail merit while preserving identity and commercial verification',async()=>{
 const r=await exercise('J_'+path+'_'+marker,{mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')(path==='data'?p.data:p)[marker]=
  marker==='errors'?[{code:'synthetic-property-details-invalid'}]:{code:'synthetic-property-details-invalid'};}});
 assert(r.observations.every((o:any)=>o.detailIdentityVerified===true&&o.detailUsable===false&&o.detailSemanticStatus==='PROVIDER_ERROR'));
 assert(r.input.candidates.every((c:any)=>['property.stars','review.count'].every(code=>c.facts.find((f:any)=>f.code===code).value===null)));
 assert(r.input.candidates.every((c:any)=>!c.facts.some((f:any)=>f.code.startsWith('feature.')&&f.value===true)));
 assert(r.normalization.offers.every((o:any)=>o.availability.bookability.state==='KNOWN'&&o.availability.bookability.value===true));
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='SATISFIED'));
 assert.equal(r.output.decision.status,'abstained');
});

for(const markerValue of [null,[]])test('LSI11 explicit empty error marker stays clean: '+JSON.stringify(markerValue),async()=>{
 const r=await exercise(markerValue===null?'K_NULL_ERRORS':'K_EMPTY_ERRORS',{mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL'){
  p.error=markerValue;p.errors=markerValue;p.data.error=markerValue;p.data.errors=markerValue;
 }}});
 assert(r.observations.every((o:any)=>o.detailIdentityVerified===true&&o.detailUsable===true&&o.detailSemanticStatus==='USABLE'));
 assert.equal(r.output.decision.status,'usable');
});

for(const markerValue of [false,0,{},''])test('LSI12 malformed error marker stays explicit and cannot certify detail: '+JSON.stringify(markerValue),async()=>{
 const r=await exercise('L_MARKER_'+typeof markerValue+'_'+JSON.stringify(markerValue),{mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.error=markerValue;}});
 assert(r.observations.every((o:any)=>o.detailIdentityVerified===true&&o.detailUsable===false&&o.detailSemanticStatus==='UNSUPPORTED_ERROR_SHAPE'));
 assert(r.input.candidates.every((c:any)=>c.facts.find((f:any)=>f.code==='property.stars').value===null));
 assert.equal(r.output.decision.status,'abstained');
});

for(const fault of ['bed','detail'])test('LSI13 one invalid '+fault+' candidate remains visible while independent complete candidates remain selectable',async()=>{
 const r=await exercise('M_MIXED_'+fault,{mutate:(p:any,q:any,i:number)=>{if(i!==0)return;
  if(fault==='detail'&&q.kind==='HOTEL_DETAIL')p.data.error={code:'synthetic-property-details-invalid'};
  if(fault==='bed'&&commercial(q))selected(p).name='Private room; Private bathroom; 2 letti matrimoniali; secondo letto non disponibile';
 }});
 const badId=r.observations.find((o:any)=>o.privateIdentity.hotelId==='invented-property-0').alternativeId;
 const bad=r.output.candidates.find((c:any)=>c.hotelId===badId);
 assert(bad,'Invalid candidate disappeared from diagnostic set');
 assert.equal(r.output.decision.status,'usable');
 assert(!r.output.decision.portfolio.bestChoice.equivalentSolutionIds.includes(bad.policy.solutionId));
 assert.equal(r.output.candidates.length,3);
});

test('LSI14 original ordering, names and opaque provider identities do not change mixed-case merit',async()=>{
 const baseMutate=(p:any,q:any,i:number)=>{if(i===0&&q.kind==='HOTEL_DETAIL')p.data.error={code:'synthetic-property-details-invalid'};};
 const a=await exercise('N_NEUTRAL_BASE',{mutate:baseMutate});
 const b=await exercise('N_NEUTRAL_CHANGED',{idPrefix:'opaque-alternate-',mutate:(p:any,q:any,i:number)=>{
  baseMutate(p,q,i);if(q.kind==='SEARCH'){p.data.reverse();for(const h of p.data)h.name='Invented changed display label';}
  if(q.kind==='HOTEL_DETAIL')p.data.name='Another invented display label';
 }});
 const merit=(r:any)=>r.output.candidates.map((c:any)=>({cost:c.policy.totalCost,
  scores:Object.fromEntries(Object.entries(c.policy.dimensions).map(([k,v]:any)=>[k,v.score]))})).sort((a:any,b:any)=>a.cost-b.cost);
 const chosen=(r:any)=>r.output.candidates.filter((c:any)=>r.output.decision.portfolio.bestChoice.equivalentSolutionIds.includes(c.policy.solutionId)).map((c:any)=>c.policy.totalCost).sort();
 assert.deepEqual(merit(b),merit(a));assert.deepEqual(chosen(b),chosen(a));
});

test('LSI15 pure preparation is deterministic, preserves raw bytes, and never invokes the supplied decision path',async()=>{
 const f=await at('tests/engine-v3/fixtures/liteApiObservationSyntheticV1.mjs'),m=await at('scripts/liteapi-observation-diagnostic-v1.mjs');
 const request=await f.providerCapture({mutate:(p:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')p.data.error={code:'synthetic-property-details-invalid'};}});
 const before=JSON.stringify(request);let calls=0;const oldPolicy=policy.runPersonalUtilityRolePolicyV3;
 policy.runPersonalUtilityRolePolicyV3=()=>{calls++;throw new Error('PURE_PREPARATION_MUST_NOT_RUN_POLICY');};
 try{
  const a=m.prepareLiteApiObservationDiagnostic(request),b=m.prepareLiteApiObservationDiagnostic(request);
  assert.deepEqual(a,b);assert.equal(a.engineInvocations,0);assert.equal(a.policyInvocations,0);assert.equal(a.decision,null);assert.equal(calls,0);
  assert.equal(JSON.stringify(request),before);assert(a.observations.every((o:any)=>o.detailValidation.originalPayload.data.error.code==='synthetic-property-details-invalid'));
 }finally{policy.runPersonalUtilityRolePolicyV3=oldPolicy;}
});

test('LSI16 extra-bed mention cannot hide a specific base-bed limitation in the same clause',async()=>{
 const r=await exercise('O_BASE_BED_LIMIT_WITH_EXTRA_MENTION',{mutate:(p:any,q:any)=>{if(commercial(q))selected(p).name=
  'Private room; Private bathroom; 2 letti matrimoniali; secondo letto non disponibile senza letto aggiuntivo';}});
 assert(r.normalization.offers.every((o:any)=>o.sleeping.state==='CONFLICTING'),'An extra-bed mention erased a specific second-bed limitation');
 assert(r.assessment.offers.every((o:any)=>o.accommodation.sleeping.status==='CONFLICTING'&&o.accommodation.sleeping.documentedLowerBound!==4));
 assert(r.observations.every((o:any)=>o.sleepingInterpretation.clauses.some((c:any)=>c.text==='secondo letto non disponibile senza letto aggiuntivo'&&c.kind==='BED_NEGATION')));
 assert.equal(r.output.decision.status,'abstained');
});
