import assert from 'node:assert/strict';
import test from 'node:test';
import {join,resolve,sep,basename} from 'node:path';
import {mkdtempSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const load=new Function('url','return import(url)') as (url:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function context(){
 const [p,d,f]=await Promise.all(['scripts/liteapi-search-coverage-plan-v1.mjs','scripts/liteapi-search-coverage-diagnostics-v1.mjs','tests/engine-v3/fixtures/liteApiCoverageSyntheticV1.mjs'].map(at));
 const x=f.coverageFixture({directory:'C:/invented'}),request=p.coverageRequest('ID_RATES',x.selection);
 const run=(body:any,status=200)=>{const bytes=Buffer.from(typeof body==='string'?body:JSON.stringify(body));return d.inspectCoverageRates({bytes,expectedSha256:p.sha(bytes),status,headers:{'content-type':'application/json'},request,selection:x.selection});};
 return {p,d,x,run};
}
test('CR01 documented Rates2001 is not an unknown JSON root or a provider failure',async()=>{
 const {run}=await context(),body={error:{code:2001,message:'no availability found'}},before=JSON.stringify(body),r=run(body);
 assert.equal(r.classification,'DOCUMENTED_NO_RESULTS');assert.equal(r.status,'NO_AVAILABILITY');assert.equal(r.rawOffers,0);
 assert.equal(r.noResultsBasis,'LITEAPI_RATES_ERROR_CODE_2001');assert.equal(r.semanticErrors.length,0);assert.equal(r.providerNotices[0].code,'2001');assert.equal(JSON.stringify(body),before);
});
for(const code of [2001,'2001'])for(const data of ['absent','null','empty'])test('CR02 equivalent documented code/data '+code+'/'+data,async()=>{
 const {run}=await context(),body:any={metadata:{error:'not an envelope'},error:{message:'no availability found',code},errors:[]};
 if(data!=='absent')body.data=data==='null'?null:[];
 const r=run(body);assert.equal(r.classification,'DOCUMENTED_NO_RESULTS');assert.equal(r.rawOffers,0);assert.equal(r.countsComparable,true);assert.equal(r.providerNotices.length,1);
});
for(const body of [{}, {data:null}, {data:{}}, {data:'none'}, {data:0}, {code:2001}, {message:'no availability found'}, [], null, '{invalid'])test('CR03 missing or unknown format is never zero '+JSON.stringify(body),async()=>{
 const {run}=await context(),r=run(body);assert.equal(r.classification,'UNKNOWN_FORMAT');assert.equal(r.rawRows,null);assert.equal(r.rawOffers,null);assert.equal(r.countsComparable,false);assert.equal(r.hotelFingerprints,null);
});
for(const error of [{code:9999,message:'invented provider failure'}, {code:'02001'}, 'no availability found', false, {}])test('CR04 explicit unknown error precedes missing data '+JSON.stringify(error),async()=>{
 const {run}=await context(),r=run({error});assert.equal(r.classification,'PROVIDER_ERROR');assert.equal(r.reason,'PROVIDER_APPLICATION_ERROR');assert.equal(r.rawOffers,null);assert.deepEqual(r.semanticErrors,['$.error']);
});
test('CR05 preserve success counts and explicit empty array, with neutral extensions',async()=>{
 const {run,x}=await context(),h=x.hotel(x.selection.selectedIds[0]),a=run({data:[h]}),b=run({extra:{error:'not an envelope'},errors:[],error:null,data:[h]});
 assert.equal(a.classification,'SUCCESS');assert.equal(a.rawOffers,1);assert.equal(a.wireBindableOffers,1);assert.equal(b.rawOffers,a.rawOffers);assert.deepEqual(a.rows,b.rows);
 const empty=run({data:[]});assert.equal(empty.classification,'DOCUMENTED_NO_RESULTS');assert.equal(empty.noResultsBasis,'EXPLICIT_EMPTY_DATA_ARRAY');
});
test('CR06 a global no-results code cannot hide returned observations or another scoped error',async()=>{
 const {run,x}=await context(),h=x.hotel(x.selection.selectedIds[0]);
 for(const body of [{error:{code:2001},data:[h]},{error:{code:2001},data:{}},{error:{code:2001},errors:[{code:9999}]}]){
  const r=run(body);assert.equal(r.classification,'PROVIDER_ERROR');assert.equal(r.countsComparable,false);assert.equal(r.noResultsBasis,null);
  if(Array.isArray(body.data)&&body.data.length){assert.equal(r.rawOffers,1);assert.equal(r.wireBindableOffers,0);}
 }
});
for(const scope of ['property','offer','rate'])test('CR07 record-level2001 is not search-level no availability '+scope,async()=>{
 const {run,x}=await context(),h=x.hotel(x.selection.selectedIds[0]);
 const record=scope==='property'?h:scope==='offer'?h.roomTypes[0]:h.roomTypes[0].rates[0];record.error={code:2001,message:'no availability found'};
 const r=run({data:[h]});assert.equal(r.classification,'PROVIDER_ERROR');assert.equal(r.rawRows,1);assert.equal(r.countsComparable,false);
});
test('CR08 HTTP and exact-byte integrity precede semantic interpretation',async()=>{
 const {p,d,run}=await context(),raw=Buffer.from('{"error":{"code":2001}}');
 assert.throws(()=>d.classifyCoverageRatesResponse({bytes:Buffer.concat([raw,Buffer.from(' ')]),expectedSha256:p.sha(raw),status:200}),/ORIGINAL_HASH/);
 assert.equal(run({error:{code:2001}},500).classification,'PROVIDER_ERROR');
 assert.equal(run('',204).classification,'DOCUMENTED_NO_RESULTS');assert.equal(run('',204).noResultsBasis,'HTTP_204');
 assert.equal(run({error:{code:2001}},204).classification,'UNKNOWN_FORMAT');
 assert.equal(run('',200).classification,'UNKNOWN_FORMAT');
 assert.throws(()=>d.selectCoverageCatalog(raw,p.sha(raw)),/PROVIDER_SEMANTIC_ERROR/);
});
test('CR09 unknown/error counts do not become an empty comparable arm',async()=>{
 const {d,run,x}=await context(),city=run({data:[x.hotel(x.selection.selectedIds[0])]});
 for(const other of [run({data:null}),run({error:{code:9999}})]){
  const c=d.coverageComparison({CITY_RATES:city,ID_RATES:other});assert.equal(c.bothArmsObserved,true);assert.equal(c.countsComparable,false);assert.equal(c.overlap,null);assert.equal(c.idsOnly,null);
 }
 const c=d.coverageComparison({CITY_RATES:city,ID_RATES:run({error:{code:2001}})});assert.equal(c.countsComparable,true);assert.equal(c.overlap,0);assert.equal(c.cityOnly,1);assert.equal(c.idsOnly,0);assert.equal(c.providerInventoryExhausted,null);
});
const snapshot=(root:string):any=>readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).map(e=>[e.name,e.isDirectory()?snapshot(join(root,e.name)):readFileSync(join(root,e.name)).toString('base64')]);
for(const which of [1,2])for(const outcome of ['NO_AVAILABILITY','ERROR','UNKNOWN'])test('CR10 actual synthetic acquisition preserves originals and one-shot arm '+which+'/'+outcome,async()=>{
 const [p,j,c,f]=await Promise.all(['scripts/liteapi-search-coverage-plan-v1.mjs','scripts/liteapi-search-coverage-journal-v1.mjs','scripts/liteapi-search-coverage-capture-v1.mjs','tests/engine-v3/fixtures/liteApiCoverageSyntheticV1.mjs'].map(at));
 const temp=mkdtempSync(join(tmpdir(),'StayOpti-D0064-Response-'));
 try{const registry=join(temp,'registry'),x=f.coverageFixture({directory:registry}),checkpoint={head:'a'.repeat(40),branch:p.BRANCH,inventorySha256:'b'.repeat(64)};
 const input={root:join(registry,'cases',x.config.caseId),registryRoot:registry,caseId:x.config.caseId,mode:'SYNTHETIC_ONLY',bindingSha256:p.hash({config:x.config,checkpoint}),authorizationSha256:p.hash({synthetic:true,checkpoint}),protector:f.syntheticProtector};
 const body=outcome==='UNKNOWN'?{data:null}:{error:{code:outcome==='ERROR'?9999:2001,message:'invented fixture response'}};
 x.simulation.responses[which].response=body;const before=JSON.stringify(x.simulation),journal=j.createCoverageJournal(input);
 const result=await c.runCoverageAcquisition({config:x.config,checkpoint,journal,simulation:x.simulation,verifyBeforeSend:()=>{}});
 assert.equal(result.status,outcome==='NO_AVAILABILITY'?'COMPLETE':'ABORTED');assert.equal(result.actualAttempts,outcome==='NO_AVAILABILITY'?3:which+1);
 assert.equal(result.providerHttpRequests,0);assert.equal(result.engineInvocations,0);assert.equal(result.policyInvocations,0);
 assert.equal(result.arms[which===1?'CITY_RATES':'ID_RATES'].classification,outcome==='NO_AVAILABILITY'?'DOCUMENTED_NO_RESULTS':outcome==='ERROR'?'PROVIDER_ERROR':'UNKNOWN_FORMAT');
 const tree=snapshot(registry),opened=c.readCoverageOriginals(input),record=opened.records[which].response.response.body;
 assert.deepEqual(JSON.parse(Buffer.from(record.base64,'base64').toString('utf8')),body);
 assert.throws(()=>j.createCoverageJournal(input),/CASE_ALREADY_EXISTS/);assert.deepEqual(snapshot(registry),tree);assert.equal(JSON.stringify(x.simulation),before);
 }finally{assert(resolve(temp).startsWith(resolve(tmpdir())+sep));assert.match(basename(temp),/^StayOpti-D0064-Response-/);rmSync(temp,{recursive:true,force:true});}
});
