import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,readFileSync,readdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,sep,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
const load=new Function('url','return import(url)') as (url:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function modules(){const [p,d,j,c,f]=await Promise.all(['scripts/liteapi-search-coverage-plan-v1.mjs','scripts/liteapi-search-coverage-diagnostics-v1.mjs','scripts/liteapi-search-coverage-journal-v1.mjs','scripts/liteapi-search-coverage-capture-v1.mjs','tests/engine-v3/fixtures/liteApiCoverageSyntheticV1.mjs'].map(at));return {p,d,j,c,f};}
function clean(root:string){assert(resolve(root).startsWith(resolve(tmpdir())+sep));assert.match(basename(root),/^StayOpti-D0064-/);rmSync(root,{recursive:true,force:true});}
async function fixture(options:any={}){
 const m=await modules(),temp=mkdtempSync(join(tmpdir(),'StayOpti-D0064-Portable-')),registry=join(temp,'registry');
 const x=m.f.coverageFixture({directory:registry,...options}),checkpoint={head:'a'.repeat(40),branch:m.p.BRANCH,inventorySha256:'b'.repeat(64)};
 const input={root:join(registry,'cases',x.config.caseId),registryRoot:registry,caseId:x.config.caseId,mode:'SYNTHETIC_ONLY',bindingSha256:m.p.hash({config:x.config,checkpoint}),authorizationSha256:m.p.hash({synthetic:true,checkpoint}),protector:m.f.syntheticProtector};
 const journal=m.j.createCoverageJournal(input);
 return {...m,...x,temp,input,journal,checkpoint,run:()=>m.c.runCoverageAcquisition({config:x.config,checkpoint,journal,simulation:x.simulation,verifyBeforeSend:()=>{}})};
}
const snap=(root:string):any=>existsSync(root)?readdirSync(root,{withFileTypes:true}).map(e=>[e.name,e.isDirectory()?snap(join(root,e.name)):readFileSync(join(root,e.name)).toString('base64')]):[];

test('CV01 MAX3 is independent of unchanged MAX17 and forbids foreign operations/config fields',async()=>{
 const {p,f}=await modules(),old=await at('scripts/liteapi-controlled-plan-v1.mjs'),x=f.coverageFixture({directory:'C:/invented'});
 assert.equal(p.validateCoveragePlan(x.config,{synthetic:true}).pending.length,0);assert.equal(old.LIMITS.total,17);
 for(const kind of ['SEARCH','PREBOOK','PREBOOK_GET','HOTEL_DETAIL','FACILITIES','BOOKING','total'])assert.throws(()=>p.coverageRequest(kind),/OPERATION_NOT_ALLOWED/);
 for(const change of [(c:any)=>c.controls.limits.total=17,(c:any)=>c.controls.limits.ID_RATES=2,(c:any)=>c.controls.retries=1,(c:any)=>c.controls.clientTimeoutMs=1,(c:any)=>c.controls.seed='',(c:any)=>c.prebook=true]){const c=structuredClone(x.config);change(c);assert.throws(()=>p.validateCoveragePlan(c,{synthetic:true}),/FROZEN_PLAN_CHANGED|CONFIG_SCHEMA/);}
 assert.throws(()=>old.validatePlan(x.config,{synthetic:true}),/CONFIG_VERSION_OR_CASE/);
});
test('CV02 deterministic catalog selection independent of order/names and exact opaque ID bytes',async()=>{
 const {p,d,f}=await modules(),x=f.coverageFixture({count:40,directory:'C:/invented'}),y=structuredClone(x.catalog);y.data.reverse();y.data.forEach((r:any)=>r.name='Other invented label');
 const select=(v:any)=>{const b=Buffer.from(JSON.stringify(v));return d.selectCoverageCatalog(b,p.sha(b));};
 assert.equal(x.selection.selectedIds.length,20);assert.deepEqual(select(y).selectedIds,x.selection.selectedIds);assert.equal(select(y).poolFingerprint,x.selection.poolFingerprint);
 y.data[0].id='  Opaque /+% ID with spaces  ';const s=select(y);assert(s.poolIds.includes(y.data[0].id));assert.equal(s.rows[0].id,y.data[0].id);
});
test('CV03 exact duplicates retained and conflicting duplicates excluded, not replaced by favorable row',async()=>{
 const {p,d}=await modules();const rows=[{id:'invented-A',country:'IT',city:'Bologna'},{id:'invented-A',country:'IT',city:'Bologna'},{id:'invented-B',country:'IT',city:'Bologna'},{id:'invented-B',country:'IT',city:'Elsewhere'},{id:'invented-C',country:'FR',city:'Bologna'},{country:'IT',city:'Bologna'}];const b=Buffer.from(JSON.stringify({data:rows})),s=d.selectCoverageCatalog(b,p.sha(b));
 assert.equal(s.rawRows,6);assert.deepEqual(s.selectedIds,['invented-A']);assert.equal(s.rows.filter((r:any)=>r.reason==='DUPLICATE_ID_CONFLICT').length,2);assert.equal(s.rows.filter((r:any)=>r.duplicate).length,4);
});
for(const variant of ['HASH','JSON','ROOT','OVER_LIMIT','ROW','SEMANTIC'])test('CV04 catalog rejects '+variant,async()=>{
 const {p,d}=await modules();let bytes=Buffer.from(JSON.stringify({data:[]}));
 if(variant==='JSON')bytes=Buffer.from('{');if(variant==='ROOT')bytes=Buffer.from('{"data":{}}');if(variant==='OVER_LIMIT')bytes=Buffer.from(JSON.stringify({data:Array(101).fill({id:'invented'})}));if(variant==='ROW')bytes=Buffer.from('{"data":[null]}');if(variant==='SEMANTIC')bytes=Buffer.from('{"data":[],"error":"invented"}');
 assert.throws(()=>d.selectCoverageCatalog(bytes,variant==='HASH'?'0'.repeat(64):p.sha(bytes)),/LITEAPI_COVERAGE_/);
});
test('CV05 counters preserve incomplete, duplicate and unexpected rows, independent of wire exclusions',async()=>{
 const {p,d,f}=await modules(),x=f.coverageFixture({count:2,directory:'C:/invented'}),q=p.coverageRequest('ID_RATES',x.selection);
 const h=x.hotel(x.selection.selectedIds[0]),wrong=x.hotel('INVENTED_UNEXPECTED');wrong.roomTypes[0].rates[0].occupancyNumber=0;
 const bytes=Buffer.from(JSON.stringify({data:[h,structuredClone(h),wrong,{hotelId:'INVENTED_MISSING'},{roomTypes:[{}]}],partial:true}));
 const r=d.inspectCoverageRates({bytes,status:200,headers:{'content-type':'application/json'},request:q,selection:x.selection});
 assert.equal(r.rawRows,5);assert.equal(r.rawUniqueHotels,3);assert.equal(r.rawOffers,4);assert.equal(r.occupancyLinkedOffers,2);assert.equal(r.wireBindableOffers,0);
 assert(r.rows[2].issues.includes('UNEXPECTED_ID_NOT_IN_REQUEST'));assert(r.rows[3].issues.includes('OFFER_ARRAY_MISSING_OR_UNSUPPORTED'));assert.equal(r.rows[4].offers.length,1);assert.equal(r.totalInventoryOrExhaustionCertified,false);
});
for(const count of [0,1,3])test('CV06 complete loopback '+count+' catalog IDs seals before BOTH Rates, preserves originals and cannot restart',async()=>{
 const x=await fixture({count});try{const before=JSON.stringify(x.simulation),r=await x.run();assert.equal(r.status,'COMPLETE',r.failureClass);assert.equal(r.actualAttempts,count?3:2);assert.equal(r.localHttpRequests,r.actualAttempts);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(r.prebookCreationsAttempted,0);assert.equal(JSON.stringify(x.simulation),before);
 const state=x.j.verifyCoverageJournal(x.input),seal=state.events.find((e:any)=>e.type==='SEAL'),city=state.events.find((e:any)=>e.type==='RESERVE'&&e.data.kind==='CITY_RATES');assert(seal.sequence<city.sequence);assert.equal(state.selection.selectedCount,count);assert.equal(state.restartAllowed,false);
 const original=x.c.readCoverageOriginals(x.input);assert.deepEqual(original.selection,x.selection);assert.deepEqual(JSON.parse(Buffer.from(original.records[0].response.response.body.base64,'base64').toString()),x.catalog);
 const saved=snap(x.input.registryRoot);assert.throws(()=>x.j.createCoverageJournal(x.input),/CASE_ALREADY_EXISTS/);assert.deepEqual(snap(x.input.registryRoot),saved);
 if(count===0)assert.equal(r.idRatesStatus,'SKIPPED_NO_VERIFIED_IDS');if(count===1)assert.equal(r.catalog.limitation,'ONE_ID_LIMITED_DIAGNOSTIC');
 }finally{clean(x.temp);}
});
for(const which of [1,2])test('CV07 Rates204 arm '+which+' allows the other preplanned arm',async()=>{
 const x=await fixture();try{x.simulation.responses[which].status=204;const r=await x.run();assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,3);assert.equal(r.arms[which===1?'CITY_RATES':'ID_RATES'].status,'NO_CONTENT');assert.equal(r.comparison.overlap,0);}finally{clean(x.temp);}
});
for(const variant of ['HTTP','REDIRECT','SEMANTIC','NESTED_ERROR','RESET','BAD_SCHEMA','CATALOG_204'])test('CV08 fail-closed actual loopback '+variant,async()=>{
 const x=await fixture();try{const i=variant==='CATALOG_204'?0:1,row=x.simulation.responses[i];if(variant==='HTTP')row.status=500;if(variant==='REDIRECT')row.status=302;if(variant==='SEMANTIC')row.response.error='INVENTED';if(variant==='NESTED_ERROR')row.response.data[0].errors=['INVENTED'];if(variant==='RESET')row.reset=true;if(variant==='BAD_SCHEMA')row.response={data:{unexpected:true}};if(variant==='CATALOG_204')row.status=204;
 const r=await x.run();assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,i+1);assert.equal(r.localHttpRequests,i+1);assert.equal(r.providerHttpRequests,0);assert.equal(r.idRatesStatus,'NOT_STARTED');const j=x.j.verifyCoverageJournal(x.input);assert.equal(j.requests.at(-1).state,'FAILED');
 }finally{clean(x.temp);}
});
test('CV09 durable governor rejects foreign kind, repeat, fourth attempt, concurrency and missing seal',async()=>{
 const x=await fixture();const reserve=(kind:string)=>x.journal.reserve({kind,requestBytes:Buffer.from('{}'),checkpointSha256:x.input.bindingSha256});const complete=(ordinal:number)=>x.journal.complete({ordinal,state:'SUCCEEDED',responseBytes:Buffer.from('{}'),statusCode:200});
 try{assert.throws(()=>reserve('PREBOOK'),/KIND_NOT_ALLOWED/);assert.throws(()=>reserve('CITY_RATES'),/REQUEST_SEQUENCE/);assert.equal(reserve('CATALOG').ordinal,1);assert.throws(()=>reserve('CITY_RATES'),/CONCURRENCY/);complete(1);assert.throws(()=>reserve('CATALOG'),/CAP_EXCEEDED/);assert.throws(()=>reserve('CITY_RATES'),/REQUEST_SEQUENCE/);x.journal.sealSelection(x.selection);reserve('CITY_RATES');complete(2);reserve('ID_RATES');complete(3);assert.throws(()=>reserve('ID_RATES'),/CAP_EXCEEDED/);assert.equal(x.journal.snapshot().attemptsReserved,3);x.journal.finish({status:'COMPLETED'});}finally{clean(x.temp);}
});
test('CV10 changed checkpoints/seal and incomplete attempts cannot be reset or certified complete',async()=>{
 const x=await fixture();try{assert.throws(()=>x.journal.reserve({kind:'CATALOG',requestBytes:Buffer.from('{}'),checkpointSha256:'c'.repeat(64)}),/CHECKPOINT_MISMATCH/);
 assert.throws(()=>x.j.verifyCoverageJournal({...x.input,bindingSha256:'d'.repeat(64)}),/CHECKPOINT_MISMATCH/);
 const before=snap(x.input.root);assert.throws(()=>x.j.createCoverageJournal(x.input),/CASE_ALREADY_EXISTS/);assert.deepEqual(snap(x.input.root),before);
 x.journal.reserve({kind:'CATALOG',requestBytes:Buffer.from('{}'),checkpointSha256:x.input.bindingSha256});assert.throws(()=>x.journal.finish({status:'COMPLETED'}),/ACTIVE_REQUEST_REMAINS/);x.journal.finish({status:'ABORTED'});assert.equal(x.j.verifyCoverageJournal(x.input).attemptsReserved,1);
 }finally{clean(x.temp);}
});
test('CV11 encrypted file and event tampering fail authentication without changing source inputs',async()=>{
 const x=await fixture();try{await x.run();const j=x.j.verifyCoverageJournal(x.input),file=join(x.input.root,'encrypted',j.selection.original.file),original=readFileSync(file);writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));assert.throws(()=>x.j.verifyCoverageJournal(x.input),/ORIGINAL_FILE_INTEGRITY/);writeFileSync(file,original);
 const event=join(x.input.root,'events','000002.json'),value=JSON.parse(readFileSync(event,'utf8'));value.data.kind='PREBOOK';writeFileSync(event,JSON.stringify(value));assert.throws(()=>x.j.verifyCoverageJournal(x.input),/EVENT_INTEGRITY/);
 }finally{clean(x.temp);}
});
test('CV12 exact transport allowlist rejects host/method/path/query/body and opaque-ID substitutions',async()=>{
 const {p,f}=await modules(),x=f.coverageFixture({directory:'C:/invented'});
 for(const kind of ['CATALOG','CITY_RATES','ID_RATES'])for(const field of ['host','method','path','query','body']){
  const q=p.coverageRequest(kind,x.selection);q[field]=field==='host'?'example.invalid':field==='method'?'DELETE':field==='path'?'/v3.0/rates/prebook':field==='query'?{offset:100}:{hotelIds:['INVENTED_OTHER']};
  assert.throws(()=>p.validateCoverageRequest(q,x.selection),/REQUEST_OUTSIDE_SEALED_PLAN/);
 }
 assert.throws(()=>p.validateCoverageRequest(p.coverageRequest('CITY_RATES'),null),/POOL_NOT_SEALED/);
});
test('CV13 production cannot inject a synthetic journal or transport under a relabelled configuration',async()=>{
 const x=await fixture();try{x.config.origin='LITEAPI_PRODUCTION';x.config.account.environment='LIVE_PRODUCTION';
 await assert.rejects(()=>x.c.runCoverageAcquisition({config:x.config,checkpoint:x.checkpoint,journal:x.journal,credential:'SYNTHETIC_NOT_A_CREDENTIAL',liveApproval:{}}),/PRODUCTION_INJECTION_PROHIBITED/);
 assert.equal(x.journal.snapshot().attemptsReserved,0);x.journal.finish({status:'ABORTED'});
 }finally{clean(x.temp);}
});
test('CV14 code checkpoint changing after catalog prevents either Rates from starting',async()=>{
 const x=await fixture();try{
 const r=await x.c.runCoverageAcquisition({config:x.config,checkpoint:x.checkpoint,journal:x.journal,simulation:x.simulation,verifyBeforeSend:()=>{if(x.journal.snapshot().selection)throw Error('LITEAPI_COVERAGE_TEST_CODE_CHANGED');}});
 assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,1);assert.equal(r.localHttpRequests,1);assert.equal(r.idRatesStatus,'NOT_STARTED');assert.equal(r.engineInvocations,0);
 }finally{clean(x.temp);}
});
