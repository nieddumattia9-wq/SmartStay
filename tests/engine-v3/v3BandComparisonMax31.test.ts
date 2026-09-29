import test from 'node:test';import assert from 'node:assert/strict';import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const load=new Function('u','return import(u)') as (u:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(resolve(p)).href);
async function modules(){return {m:await at('tests/engine-v3/fixtures/bandComparisonSyntheticV1.mjs'),p:await at('scripts/liteapi-band-comparison-plan-v1.mjs'),c:await at('scripts/liteapi-band-comparison-capture-v1.mjs'),a:await at('scripts/liteapi-band-comparison-acquire-v1.mjs'),old:await at('tests/engine-v3/fixtures/authenticatedComparisonSyntheticV3.mjs')};}
test('MAX31 actual loopback transport reserves 31 attempts and seals fixed sample before any commercial follow-up',async()=>{
 const {m,c,a,old}=await modules(),f=m.bandFixture(),args={config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:old.comparisonSyntheticProtector,verifyBeforeSend:()=>{}};
 const r=await a.acquireBandComparison(args);assert.equal(r.status,'COMPLETE',JSON.stringify(r));assert.equal(r.actualAttempts,31);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);
 assert.equal(r.counts.SEARCH,1);for(const kind of ['REQUOTE','HOTEL_DETAIL','PREBOOK'])assert.equal(r.counts[kind],10);
 const reopened=c.readAuthenticatedBandCapture({root:r.caseDirectory,registryRoot:r.registryRoot,syntheticProtector:old.comparisonSyntheticProtector});assert.equal(reopened.progress.commerciallyObservedProperties,10);
 const seal=reopened.journal.events.find((e:any)=>e.type==='SEAL');assert.ok(seal);assert.ok(reopened.journal.events.filter((e:any)=>e.type==='RESERVE'&&e.data.kind!=='SEARCH').every((e:any)=>e.sequence>seal.sequence));
 assert.equal(reopened.selection.selected.length,10);await assert.rejects(a.acquireBandComparison(args),/CONSUMED|ALREADY_EXISTS/);
});
test('fixed deterministic sample and offer choice do not use price, result order or success; no replacement',async()=>{
 const {m}=await modules(),a=m.bandFixture({count:11,direct:true}),b=m.bandFixture({count:11,direct:true,mutate:(x:any,q:any)=>{if(q.kind==='SEARCH')x.data.reverse();}});
 assert.deepEqual(a.progress.selection.selected.map((x:any)=>x.hotelId),b.progress.selection.selected.map((x:any)=>x.hotelId));assert.equal(a.progress.selection.pool.length,11);assert.equal(a.progress.offers.length,10);
 const selected=a.progress.selection.selected[0].hotelId,c=m.bandFixture({count:11,direct:true,mutate:(x:any,q:any)=>{if(q.kind==='SEARCH'){const h=x.data.find((h:any)=>h.hotelId===selected);h.roomTypes[0].rates=[];}}});
 assert.deepEqual(a.progress.selection.selected.map((x:any)=>x.hotelId),c.progress.selection.selected.map((x:any)=>x.hotelId));assert.equal(c.progress.commerciallyObservedProperties,9);assert.equal(c.progress.status,'INCOMPLETE_SAMPLE');
});
test('request-level margin is scoped to one fixed property; accepted original prices need no requote',async()=>{
 const {m}=await modules(),f=m.bandFixture(),direct=m.bandFixture({direct:true});
 assert.equal(direct.requests.length,21);assert.equal(direct.requests.some((q:any)=>q.kind==='REQUOTE'),false);
 const requotes=f.requests.filter((q:any)=>q.kind==='REQUOTE');assert.equal(new Set(requotes.map((q:any)=>q.body.margin)).size,10);
 for(const q of requotes){assert.deepEqual(q.body.hotelIds,[q.hotelId]);assert.equal(q.body.limit,1);assert.equal(q.body.cityName,undefined);assert.equal(q.body.occupancies[0].children.length,2);}
 assert.equal(f.requests[0].body.margin,undefined);assert.equal(f.requests[0].body.limit,200);assert.equal(f.requests[0].body.maxRatesPerHotel,3);assert.equal(f.requests[0].body.budget,undefined);
});
test('unexpected requote properties and more than three offers are retained but cannot widen the window',async()=>{
 const {m}=await modules();for(const variant of ['property','offers']){
  const f=m.bandFixture({count:1,mutate:(b:any,q:any)=>{if(q.kind==='REQUOTE'){
   if(variant==='property'){const other=structuredClone(b.data[0]);other.hotelId='unrequested-invented-property';b.data.push(other);}
   else for(let i=1;i<4;i++){const o=structuredClone(b.data[0].roomTypes[0]);o.offerId='invented-additional-'+i;b.data[0].roomTypes.push(o);}
  }}});
  assert.equal(f.records.length,2);assert.equal(f.progress.commerciallyObservedProperties,0);assert.ok(f.progress.offers[0].reasons.includes('REQUOTE_PROPERTY_OR_OFFER_WINDOW_UNSUPPORTED'));
 }
});
test('mechanism works with another synthetic scenario and conserves missing facts',async()=>{
 const {m}=await modules(),f=m.bandFixture({count:1,direct:true,configure:(c:any)=>{c.scenario.city='Invented River City';c.scenario.country='DE';c.scenario.guestNationality='ES';c.scenario.childAges=[5,9];c.scenario.budget=1900;},mutate:(b:any,q:any)=>{if(q.kind==='HOTEL_DETAIL')delete b.data.rooms[0].bedTypes;}});
 assert.equal(f.requests[0].body.cityName,'Invented River City');assert.deepEqual(f.requests[0].body.occupancies,[{adults:2,children:[5,9]}]);assert.equal(f.progress.offers.length,1);
});
for(const [key,value]of [['searchLimit',201],['maxRatesPerHotel',4],['additionalPages',1],['pacingMs',0],['clientMs',21000]])test('MAX31 fixed profile refuses '+key,async()=>{
 const {m,p}=await modules(),f=m.bandFixture({count:0});f.config.controls[key]=value;assert.throws(()=>p.validateBandPlan(f.config),/PLAN_UNSUPPORTED/);
});
test('governor refuses 32nd, transferable limits, other operations, reentry and changed checkpoint',async()=>{
 const {m,c}=await modules(),f=m.authenticatedBandFixture({unfinished:true});
 for(const kind of ['SEARCH','REQUOTE','HOTEL_DETAIL','PREBOOK'])assert.throws(()=>f.journal.reserve({kind,requestBytes:Buffer.from('{}'),checkpointSha256:f.input.bindingSha256}),/CAP_EXCEEDED/);
 for(const kind of ['BOOK','PAYMENT','FACILITIES','PREBOOK_GET','CATALOG'])assert.throws(()=>f.journal.reserve({kind,requestBytes:Buffer.from('{}'),checkpointSha256:f.input.bindingSha256}),/KIND_NOT_ALLOWED/);
 assert.throws(()=>c.bandJournal.create(f.input),/CONSUMED|ALREADY_EXISTS/);assert.equal(c.bandJournal.verify(f.input).status,'INCOMPLETE_ONE_SHOT');
 assert.throws(()=>c.bandJournal.verify({...f.input,bindingSha256:'e'.repeat(64)}),/CHECKPOINT/);f.journal.finish({status:'ABORTED'});
});
test('concurrent start cannot create a second registry or acquire twice',async()=>{
 const {m,a,old}=await modules(),f=m.bandFixture({count:1,direct:true}),args={config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:old.comparisonSyntheticProtector,verifyBeforeSend:()=>{}};
 const first=a.acquireBandComparison(args);await assert.rejects(a.acquireBandComparison(args),/CONSUMED|ALREADY_EXISTS/);assert.equal((await first).actualAttempts,3);
});
for(const [name,status,body]of [['204',204,null],['2001',200,{error:{code:2001,message:'No availability found'}}],['HTTP error',401,{error:'synthetic'}],['redirect',302,{}],['schema unknown',200,{unexpected:true}],['conflicting empty/error',200,{data:[],error:{code:400,message:'invalid'}}]] as const)test('MAX31 response classification '+name,async()=>{
 const {m,a,old}=await modules(),f=m.bandFixture({count:1});Object.assign(f.simulation.responses[0],{status,response:body,...(status===204?{raw:''}:{})});
 const r=await a.acquireBandComparison({config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:old.comparisonSyntheticProtector,verifyBeforeSend:()=>{}});
 assert.equal(r.status,['204','2001'].includes(name)?'COMPLETE':'ABORTED',JSON.stringify(r));assert.equal(r.actualAttempts,1);assert.equal(r.counts.PREBOOK,0);
});
test('timeout consumes one prebook, no retry; interrupted and changed-input executions cannot resume',async()=>{
 const {m,a,old}=await modules();
 for(const variant of ['timeout','changed','interrupted']){
  const f=m.bandFixture({count:1,direct:true});if(variant==='timeout')f.simulation.responses[2].timeout=true;
  let checks=0;const controller=new AbortController();if(variant==='interrupted')controller.abort();
  const args={config:f.config,checkpoint:f.checkpoint,simulation:f.simulation,syntheticProtector:old.comparisonSyntheticProtector,signal:controller.signal,verifyBeforeSend:()=>{if(variant==='changed'&&++checks===4)throw Error('BAND_INPUT_CHANGED');}};
  const r=await a.acquireBandComparison(args);assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,variant==='timeout'?3:variant==='changed'?1:0);assert.equal(r.counts.PREBOOK,variant==='timeout'?1:0);
  await assert.rejects(a.acquireBandComparison({...args,verifyBeforeSend:()=>{}}),/CONSUMED|ALREADY_EXISTS/);
 }
});
test('altered original bytes reject before interpretation, no caller-object promotion',async()=>{
 const {m,c}=await modules(),f=m.authenticatedBandFixture({count:1,direct:true});const file=join(f.input.root,'encrypted','001-response.aesgcm');fs.appendFileSync(file,' ');
 assert.throws(()=>c.readAuthenticatedBandCapture(f.locator),/INTEGRITY/);assert.equal(c.isAuthenticatedBandCapture({origin:'AUTHENTICATED_PROVIDER'}),false);
});
test('real Windows PS5.1 Inventory/Preflight/Simulate, DPAPI CurrentUser and unchanged protected runner',{skip:process.platform!=='win32'},async()=>{
 const {m,p,c}=await modules(),f=m.bandFixture({count:2}),ps=join(process.env.SystemRoot!,'System32','WindowsPowerShell','v1.0','powershell.exe'),launcher=resolve('scripts/invoke-liteapi-band-comparison.ps1');
 const git=(args:string[])=>{const r=spawnSync('git',args,{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);return r.stdout.trim();};
 const head=git(['rev-parse','HEAD']),branch=git(['branch','--show-current']),config=join(f.base,'config.json'),inventory=join(f.base,'inventory.json'),sim=join(f.base,'simulation.json'),output=join(f.base,'result.json');
 const evidence=join(f.base,'invented-terms.md');fs.writeFileSync(evidence,'SYNTHETIC ONLY: no real permissions or commercial authority.');for(const x of Object.values(f.config.externalConditions) as any[])if(x?.status==='DOCUMENTED'){x.reference=evidence;x.sha256=p.sha(fs.readFileSync(evidence));}
 fs.writeFileSync(config,JSON.stringify(f.config));fs.writeFileSync(sim,JSON.stringify(f.simulation));
 const run=(args:string[],ok=true)=>{const r=spawnSync(ps,['-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',launcher,...args],{encoding:'utf8',input:'NOT_AUTHORIZED\n',windowsHide:true,timeout:180000});assert.ifError(r.error);if(ok)assert.equal(r.status,0,r.stdout+'\n'+r.stderr);else assert.notEqual(r.status,0);return r;};
 run(['-Mode','Inventory','-ExpectedHead',head,'-ExpectedBranch',branch,'-OutputPath',inventory]);
 const args=['-ExpectedHead',head,'-ExpectedBranch',branch,'-ConfigPath',config,'-ConfigSha',p.sha(fs.readFileSync(config)),'-InventoryPath',inventory,'-InventorySha',p.sha(fs.readFileSync(inventory))];
 const preflight=run(['-Mode','Preflight',...args]);assert.match(preflight.stdout,/READY_FOR_SYNTHETIC_MAX31_SIMULATION/);assert.match(preflight.stdout,/"credentialLoaded": false/);assert.equal(fs.existsSync(join(f.registryRoot,'cases')),false);
 assert.match(run(['-Mode','Acquire',...args],false).stderr,/CONFIGURATION_PENDING/);assert.equal(fs.existsSync(join(f.registryRoot,'cases')),false); // Synthetic authority cannot reach the Production store, even by accepting its own literal.
 const result=run(['-Mode','Simulate',...args,'-SimulationPath',sim,'-SimulationSha',p.sha(fs.readFileSync(sim)),'-OutputPath',output]);
 const r=JSON.parse(fs.readFileSync(output,'utf8'));assert.equal(r.status,'COMPLETE',JSON.stringify(r));assert.equal(r.actualAttempts,7);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);
 assert.equal(JSON.parse(fs.readFileSync(join(r.caseDirectory,'journal-key.json'),'utf8')).protectionClass,'WINDOWS_CURRENT_USER_DPAPI');
 assert.equal(c.readAuthenticatedBandCapture({root:r.caseDirectory,registryRoot:r.registryRoot}).records.length,7);assert.doesNotMatch(result.stdout+result.stderr,/INVENTED_PRIVATE_SECRET/);
 const changed=[...args];changed[changed.indexOf('-ConfigSha')+1]='0'.repeat(64);assert.match(run(['-Mode','Preflight',...changed],false).stderr,/FILE_HASH|RUNNER_FAILED/);
 run(['-Mode','Simulate',...args,'-SimulationPath',sim,'-SimulationSha',p.sha(fs.readFileSync(sim)),'-OutputPath',output],false);
});
