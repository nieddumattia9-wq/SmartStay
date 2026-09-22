import test from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {resolve,join} from 'node:path';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const moduleAt=(p:string)=>load(pathToFileURL(resolve(p)).href);
async function modules(){return {fixture:await moduleAt('tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs'),capture:await moduleAt('scripts/liteapi-comparison-capture-v1.mjs'),plan:await moduleAt('scripts/liteapi-comparison-plan-v1.mjs')};}
test('MAX11 full actual loopback transport, sealed selection and authenticated reopening; no provider',async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.comparisonFixture({count:5});
 const r=await c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}});
 assert.equal(r.status,'COMPLETE',JSON.stringify(r));assert.equal(r.actualAttempts,11);assert.equal(r.providerHttpRequests,0);assert.equal(r.counts.PREBOOK,5);assert.equal(r.engineInvocations,0);
 const opened=c.readAuthenticatedComparisonCapture({root:r.caseDirectory,registryRoot:r.registryRoot,syntheticProtector:m.comparisonSyntheticProtector});
 assert.equal(opened.records.length,11);const seal=opened.journal.events.find((e:any)=>e.type==='SEAL');assert.ok(seal);
 assert.ok(opened.journal.events.filter((e:any)=>e.type==='RESERVE'&&e.data.kind!=='SEARCH').every((e:any)=>e.sequence>seal.sequence));
 assert.equal(opened.selection.requests.length,10);assert.equal(opened.selection.originalSearchSha256,opened.records[0].response.response.body.sha256);
 await assert.rejects(c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}}),/CASE_ALREADY_EXISTS|CONSUMED/);
});
test('MAX11 twelfth attempt, forbidden operation, interruption and reentry do not reset counters',async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.authenticatedComparisonFixture({count:5,unfinished:true});
 assert.throws(()=>f.journal.reserve({kind:'SEARCH',requestBytes:Buffer.from('{}'),checkpointSha256:f.input.bindingSha256}),/CAP_EXCEEDED/);
 assert.throws(()=>f.journal.reserve({kind:'PREBOOK_GET',requestBytes:Buffer.from('{}'),checkpointSha256:f.input.bindingSha256}),/KIND_NOT_ALLOWED/);
 assert.throws(()=>c.comparisonJournal.create(f.input),/CASE_ALREADY_EXISTS|CONSUMED/);
 assert.equal(c.comparisonJournal.verify(f.input).status,'INCOMPLETE_ONE_SHOT');assert.equal(c.comparisonJournal.verify(f.input).counts.PREBOOK,5);
 f.journal.finish({status:'ABORTED'});
 const changed={...f.input,bindingSha256:'d'.repeat(64)};assert.throws(()=>c.comparisonJournal.verify(changed),/CHECKPOINT/);
});

test('MAX11 concurrent start is refused while the first attempt owns the one-shot registry',async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.comparisonFixture({count:2});
 const args={config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}};
 const first=c.acquireComparison(args);
 await assert.rejects(c.acquireComparison(args),/CASE_ALREADY_EXISTS|CONSUMED/);
 const result=await first;assert.equal(result.status,'COMPLETE');assert.equal(result.actualAttempts,5);assert.equal(result.providerHttpRequests,0);
});
for(const count of [0,1])test('MAX11 pilot sample '+count+' no detail/prebook and no artificial alternative',async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.comparisonFixture({count});
 const r=await c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}});
 assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,1);assert.equal(r.counts.PREBOOK,0);assert.equal(r.engineInvocations,0);
});
for(const [name,status,body]of [['HTTP401',401,{error:'synthetic'}],['redirect',302,{}],['unknown format',200,{unexpected:true}],['semantic error',200,{error:{code:'synthetic-failure'}}],['HTTP204',204,null],['code2001',200,{error:{code:2001,message:'No availability found'}}]] as const)test('MAX11 classification '+name,async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.comparisonFixture();f.simulation.responses[0].status=status;f.simulation.responses[0].response=body;if(status===204)f.simulation.responses[0].raw='';
 const r=await c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}});
 assert.equal(r.status,name==='HTTP204'||name==='code2001'?'COMPLETE':'ABORTED',JSON.stringify(r));assert.equal(r.actualAttempts,1);assert.equal(r.counts.PREBOOK,0);
});
test('MAX11 documented SSP/accommodation stop before creating sessions; no replacement',async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.comparisonFixture({mutate:(b:any,q:any)=>{if(q.kind==='SEARCH')for(const h of b.data)h.roomTypes[0].suggestedSellingPrice.amount=5000;}});
 const r=await c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}});
 assert.equal(r.counts.PREBOOK,0);assert.equal(r.actualAttempts,4);assert.equal(r.skipped.length,3);assert.equal(r.stopReason,'PILOT_FEWER_THAN_TWO_POTENTIAL_PROPERTIES');
});
test('MAX11 prebook timeout is consumed once, remote effect uncertain, no fallback or retry',async()=>{
 const {fixture:m,capture:c}=await modules(),f=m.comparisonFixture({count:2});f.simulation.responses[3].timeout=true;
 const r=await c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{}});
 assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,'TIMEOUT');assert.equal(r.counts.PREBOOK,1);assert.equal(r.actualAttempts,4);assert.equal(r.restartAllowed,false);
});
test('MAX11 changed plan, limits, forbidden operation and production injection fail closed',async()=>{
 const {fixture:m,capture:c,plan}=await modules(),f=m.comparisonFixture();
 for(const [k,v]of [['searchLimit',201],['maxRatesPerHotel',4],['pacingMs',0],['additionalPages',1],['prebookProviderSeconds',31]]){
  const changed=structuredClone(f.config);changed.controls[k]=v;assert.throws(()=>plan.validateComparisonPlan(changed),/CONTROLS/);
 }
 for(const kind of ['FACILITIES','PREBOOK_GET','BOOK','PAYMENT','CATALOG'])assert.throws(()=>plan.comparisonRequest(f.config,kind,f.selection.selected[0]),/FORBIDDEN/);
 const pending=structuredClone(f.config);pending.externalConditions.publicPriceBasis.status='PENDING';assert.equal(plan.validateComparisonPlan(pending).status,'HOLD_CONFIGURATION_PENDING');
 const real=structuredClone(f.config);real.origin='LITEAPI_PRODUCTION';await assert.rejects(c.acquireComparison({config:real,checkpoint:f.checkpoint,simulation:f.simulation,verifyBeforeSend:()=>{}}),/PRODUCTION_INJECTION/);
 let calls=0;const r=await c.acquireComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:m.comparisonSyntheticProtector,verifyBeforeSend:()=>{if(++calls===4)throw Error('COMPARISON_INPUT_CHANGED');}});
 assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,1);
});
test('MAX11 real Windows PowerShell 5.1 launcher Inventory/Simulate + DPAPI CurrentUser, synthetic inputs only',{skip:process.platform!=='win32'},async()=>{
 const {fixture:m,plan}=await modules(),f=m.comparisonFixture({count:2}),ps=join(process.env.SystemRoot!,'System32','WindowsPowerShell','v1.0','powershell.exe'),launcher=resolve('scripts/invoke-liteapi-comparison-max11.ps1');
 const run=(args:string[])=>{const p=spawnSync(ps,['-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',launcher,...args],{encoding:'utf8',windowsHide:true,timeout:120000});assert.ifError(p.error);assert.notEqual(p.status,null);assert.equal(p.status,0,p.stderr+'\n'+p.stdout);return p.stdout;};
 const config=join(f.base,'config.json'),sim=join(f.base,'simulation.json'),inventory=join(f.base,'inventory.json'),output=join(f.base,'result.json');
 fs.writeFileSync(config,JSON.stringify(f.config));fs.writeFileSync(sim,JSON.stringify(f.simulation));
 const head=plan.git(process.cwd(),['rev-parse','HEAD']),branch=plan.git(process.cwd(),['branch','--show-current']);
 run(['-Mode','Inventory','-ExpectedHead',head,'-ExpectedBranch',branch,'-OutputPath',inventory]);
 const args=['-Mode','Simulate','-ExpectedHead',head,'-ExpectedBranch',branch,'-ConfigPath',config,'-ConfigSha',plan.sha(fs.readFileSync(config)),'-InventoryPath',inventory,'-InventorySha',plan.sha(fs.readFileSync(inventory)),'-SimulationPath',sim,'-SimulationSha',plan.sha(fs.readFileSync(sim)),'-OutputPath',output];
 const text=run(args),r=JSON.parse(fs.readFileSync(output,'utf8'));assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,5);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);assert.doesNotMatch(text,/invented-private-api-key/);
 const key=JSON.parse(fs.readFileSync(join(r.caseDirectory,'journal-key.json'),'utf8'));assert.equal(key.protectionClass,'WINDOWS_CURRENT_USER_DPAPI');
 const c=await moduleAt('scripts/liteapi-comparison-capture-v1.mjs');assert.equal(c.readAuthenticatedComparisonCapture({root:r.caseDirectory,registryRoot:r.registryRoot}).journal.status,'COMPLETED');
 const rerun=spawnSync(ps,['-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',launcher,...args],{encoding:'utf8',windowsHide:true});assert.notEqual(rerun.status,0);assert.match(rerun.stderr,/RESULT_ALREADY_EXISTS/);
});
