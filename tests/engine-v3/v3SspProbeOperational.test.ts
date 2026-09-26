import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const mod=(p:string)=>load(pathToFileURL(resolve(p)).href);
async function fixture(options:any={}){
 const m=await mod('tests/engine-v3/fixtures/sspProbeSyntheticV1.mjs'),f=m.sspProbeFixture(options),p=await mod('scripts/liteapi-ssp-probe-plan-v1.mjs'),capture=await mod('scripts/liteapi-ssp-probe-capture-v1.mjs');
 f.plan.version='stayopti.liteapi-ssp-probe@1.1';f.plan.comparisonPlan.caseId=f.plan.caseId;f.plan.comparisonPlan.retention.directory=f.registryRoot;
 const evidence=join(f.registryRoot,'invented-evidence.json');writeFileSync(evidence,JSON.stringify({hotel:f.plan.hotelId,scope:'SYNTHETIC_FUNCTIONAL_TEST_NOT_PROVIDER_PERMISSION'}));
 const reference={reference:evidence,sha256:p.sha(readFileSync(evidence))};f.plan.hotelSource={...reference,pointer:'/hotel'};f.plan.purpose='BOUNDED_REQUEST_MARGIN_FUNCTIONAL_TEST_NO_ENGINE';
 for(const k of ['publicPriceBasis','permittedUse','retentionPermission'])f.plan.comparisonPlan.externalConditions[k]={...reference,status:'DOCUMENTED'};
 const checkpoint={head:'a'.repeat(40),branch:'codex/evaluation-d0036-d0041',inventorySha256:'b'.repeat(64)};
 const args={config:f.plan,checkpoint,simulation:{origin:'SYNTHETIC_ONLY',responses:f.responses},syntheticProtector:f.protector,verifyBeforeSend:()=>{}};
 return {...f,p,capture,args};
}
test('OP01 shared sequence through operational profile, authentication, new offer token, immutable originals',async()=>{
 const f=await fixture(),before=f.p.hash(f.args),r=await f.capture.acquireSspProbe(f.args);
 assert.equal(r.status,'COMPLETE',JSON.stringify(r));assert.equal(r.assessment.status,'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED');assert.equal(r.actualAttempts,3);assert.equal(r.providerHttpRequests,0);assert.equal(r.engineInvocations,0);assert.equal(r.a02Production,'HOLD');assert.equal(f.p.hash(f.args),before);
 const v=f.capture.readAuthenticatedSspProbe({root:r.caseDirectory,registryRoot:r.registryRoot,syntheticProtector:f.protector});assert.equal(v.records[2].request.body.offerId,f.assessed.newOfferId);
 const seal=v.journal.events.find((x:any)=>x.type==='SEAL');assert(v.journal.events.filter((x:any)=>x.type==='RESERVE'&&x.data.ordinal>1).every((x:any)=>x.sequence>seal.sequence));
 await assert.rejects(f.capture.acquireSspProbe(f.args),/CASE_ALREADY_EXISTS|CONSUMED/);
 const changed=join(r.caseDirectory,'encrypted','001-response.aesgcm');writeFileSync(changed,Buffer.concat([readFileSync(changed),Buffer.from('x')]));assert.throws(()=>f.capture.readAuthenticatedSspProbe({root:r.caseDirectory,registryRoot:r.registryRoot,syntheticProtector:f.protector}),/INTEGRITY/);
});
for(const change of ['above','below','conditions','ambiguous'])test('OP02 no prebook or repeated quote on '+change,async()=>{
 const f=await fixture(change==='above'?{returned:1150.01}:change==='below'?{returned:1149.99}:{requote:(b:any)=>{const o=b.data[0].roomTypes[0];if(change==='conditions')o.rates[0].remarks='Mandatory changed condition';else b.data[0].roomTypes.push({...structuredClone(o),offerId:'second-new-token'});}});
 const r=await f.capture.acquireSspProbe(f.args);assert.equal(r.actualAttempts,2);assert.equal(r.counts.PREBOOK,0);assert.equal(r.assessment.status,'STOP');
});
for(const [status,body,outcome]of [[204,null,'COMPLETE'],[200,{error:{code:2001,message:'No availability found'}},'COMPLETE'],[200,{error:{code:'invented'}},'ABORTED'],[200,{unknown:true},'ABORTED'],[401,{},'ABORTED'],[302,{},'ABORTED']] as const)test('OP03 HTTP/application classification '+status+JSON.stringify(body),async()=>{
 const f=await fixture();Object.assign(f.responses[0],{status,response:body,...(status===204?{raw:''}:{})});
 const r=await f.capture.acquireSspProbe(f.args);assert.equal(r.status,outcome,JSON.stringify(r));assert.equal(r.actualAttempts,1);assert.equal(r.counts.PREBOOK,0);assert.equal(r.providerHttpRequests,0);
 if(outcome==='COMPLETE')assert.deepEqual(r.assessment.reasons,['DOCUMENTED_NO_RESULTS']);
});
test('OP04 timeout consumed, new simultaneous process cannot start, no automatic restart',async()=>{
 const f=await fixture();f.responses[0].timeout=true;const first=f.capture.acquireSspProbe(f.args);
 await assert.rejects(f.capture.acquireSspProbe(f.args),/CASE_ALREADY_EXISTS|CONSUMED/);
 const r=await first;assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,'TIMEOUT');assert.equal(r.actualAttempts,1);assert.equal(r.transportInvocations,1);assert.equal(r.restartAllowed,false);
});
test('OP05 hash change or interruption after first request prevents second request',async()=>{
 for(const mode of ['hash','interrupt']){const f=await fixture(),abort=new AbortController();let checks=0;
  const r=await f.capture.acquireSspProbe({...f.args,signal:abort.signal,verifyBeforeSend:()=>{if(++checks===4){if(mode==='hash')throw Error('SSP_PROBE_INPUT_CHANGED');abort.abort();}}});
  assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,1);assert.equal(r.counts.REQUOTE,0);assert.equal(r.failureClass,mode==='hash'?'INPUT_CHANGED':'INTERRUPTED');
 }
});
test('OP06 independent MAX3 caps, fourth attempt, foreign operation, unfinished case, historical isolation',async()=>{
 const f=await fixture(),context={config:f.plan,checkpoint:f.args.checkpoint,inventory:null};
 const input={root:join(f.registryRoot,'cases',f.plan.caseId),registryRoot:f.registryRoot,caseId:f.plan.caseId,mode:'SYNTHETIC_ONLY',bindingSha256:f.p.hash({config:f.plan,checkpoint:f.args.checkpoint}),authorizationSha256:f.p.hash(context),context,protector:f.protector};
 const j=f.capture.operationalSspJournal.create(input),reserve=(r:any)=>j.reserve({kind:r.kind,hotelId:r.hotelId,offerId:r.offerId??null,requestBytes:Buffer.from(f.p.canonical(r)),checkpointSha256:input.bindingSha256});
 assert.throws(()=>reserve({...f.first.intent,kind:'HOTEL_DETAIL'}),/KIND_NOT_ALLOWED/);assert.throws(()=>reserve(f.second.intent),/SEQUENCE/);
 const p=await mod('scripts/liteapi-ssp-probe-v1.mjs');const prepared=p.prepareSspRequote(f.plan,f.first);
 for(const [i,r]of [f.first,f.second,f.third].entries()){reserve(r.intent);j.complete({ordinal:i+1,state:'SUCCEEDED',statusCode:200,responseBytes:Buffer.from(f.p.canonical(r))});if(!i)j.sealSelection(prepared);}
 assert.throws(()=>reserve(f.third.intent),/CAP_EXCEEDED/);assert.throws(()=>f.capture.operationalSspJournal.create(input),/CASE_ALREADY_EXISTS/);j.finish({status:'COMPLETED'});
 assert.equal(f.capture.operationalSspJournal.verify(input).attemptsReserved,3);
 const old=await mod('scripts/simulate-liteapi-ssp-probe-v1.mjs');await assert.rejects(old.simulateSspProbe(f),/OFFLINE_ONLY/);
 const historical=await fixture(),oldContext={plan:historical.plan};assert.throws(()=>old.sspProbeJournal.create({root:join(historical.registryRoot,'cases',historical.plan.caseId),registryRoot:historical.registryRoot,caseId:historical.plan.caseId,mode:'SYNTHETIC_ONLY',context:oldContext,bindingSha256:f.p.hash(oldContext),authorizationSha256:f.p.hash(['OFFLINE_ONLY',oldContext]),protector:historical.protector}),/OFFLINE_BINDING/);
 const g=await fixture();const real=structuredClone(g.plan);real.origin='LITEAPI_PRODUCTION';real.comparisonPlan.origin='LITEAPI_PRODUCTION';await assert.rejects(g.capture.acquireSspProbe({...g.args,config:real}),/PRODUCTION_INJECTION/);
});
test('OP07 real Windows PS5.1 Inventory, Preflight, Simulate, DPAPI and unchanged credential boundary',{skip:process.platform!=='win32'},async()=>{
 const f=await fixture(),launcher=resolve('scripts/invoke-liteapi-ssp-probe.ps1'),ps=join(process.env.SystemRoot!,'System32/WindowsPowerShell/v1.0/powershell.exe');
 const config=join(f.registryRoot,'config.json'),inventory=join(f.registryRoot,'inventory.json'),simulation=join(f.registryRoot,'simulation.json'),output=join(f.registryRoot,'result.json');
 writeFileSync(config,JSON.stringify(f.plan));writeFileSync(simulation,JSON.stringify(f.args.simulation));
 const head=f.p.git(process.cwd(),['rev-parse','HEAD']),branch=f.p.git(process.cwd(),['branch','--show-current']);
 const run=(a:string[],ok=true)=>{const r=spawnSync(ps,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',launcher,...a],{encoding:'utf8',windowsHide:true,timeout:120000});assert.ifError(r.error);if(ok)assert.equal(r.status,0,r.stderr+r.stdout);else assert.notEqual(r.status,0);return r;};
 const checkpoint=['-ExpectedHead',head,'-ExpectedBranch',branch];run(['-Mode','Inventory',...checkpoint,'-OutputPath',inventory]);
 const input=[...checkpoint,'-ConfigPath',config,'-ConfigSha',f.p.sha(readFileSync(config)),'-InventoryPath',inventory,'-InventorySha',f.p.sha(readFileSync(inventory))];
 const before=f.p.sha(readFileSync(config)),prePath=join(f.registryRoot,'preflight.json');run(['-Mode','Preflight',...input,'-OutputPath',prePath]);const pre=JSON.parse(readFileSync(prePath,'utf8'));assert.equal(pre.status,'READY_FOR_EXPLICIT_SSP_PROBE_AUTHORIZATION');assert.equal(pre.credentialLoaded,false);assert.equal(pre.rawCustodyCreated,false);assert(!existsSync(join(f.registryRoot,'cases')));
 const bad=[...input];bad[bad.indexOf('-ConfigSha')+1]='f'.repeat(64);assert.match(run(['-Mode','Simulate',...bad],false).stderr,/FILE_HASH/);assert(!existsSync(join(f.registryRoot,'cases')));
 const badInventory=[...input];badInventory[badInventory.indexOf('-InventorySha')+1]='f'.repeat(64);assert.match(run(['-Mode','Preflight',...badInventory],false).stderr,/FILE_HASH/);
 const altered=JSON.parse(readFileSync(inventory,'utf8'));altered.code[0].sha256='0'.repeat(64);const alteredPath=join(f.registryRoot,'altered-inventory.json');writeFileSync(alteredPath,JSON.stringify(altered));
 const alteredArgs=[...input];alteredArgs[alteredArgs.indexOf('-InventoryPath')+1]=alteredPath;alteredArgs[alteredArgs.indexOf('-InventorySha')+1]=f.p.sha(readFileSync(alteredPath));assert.match(run(['-Mode','Preflight',...alteredArgs],false).stderr,/INVENTORY_OR_WORKTREE_CHANGED/);
 const wrongHead=[...input];wrongHead[wrongHead.indexOf('-ExpectedHead')+1]='0'.repeat(40);assert.match(run(['-Mode','Preflight',...wrongHead],false).stderr,/CHECKPOINT/);assert(!existsSync(join(f.registryRoot,'cases')));
 run(['-Mode','Simulate',...input,'-SimulationPath',simulation,'-SimulationSha',f.p.sha(readFileSync(simulation)),'-OutputPath',output]);
 const r=JSON.parse(readFileSync(output,'utf8'));assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,3);assert.equal(r.providerHttpRequests,0);assert.equal(r.credentialPersisted,false);assert.equal(f.p.sha(readFileSync(config)),before);
 assert.equal(JSON.parse(readFileSync(join(r.caseDirectory,'journal-key.json'),'utf8')).protectionClass,'WINDOWS_CURRENT_USER_DPAPI');assert.equal(f.capture.readAuthenticatedSspProbe({root:r.caseDirectory,registryRoot:r.registryRoot}).journal.status,'COMPLETED');
 assert.match(run(['-Mode','Preflight',...input],false).stderr,/CASE_CONSUMED/);assert.match(run(['-Mode','Simulate',...input,'-OutputPath',output],false).stderr,/RESULT_ALREADY_EXISTS/);
});
test('OP08 evidence binds exact hotel and bytes; pending external condition remains pending',async()=>{
 const f=await fixture();assert.equal(f.p.verifySspPlanEvidence(f.plan,process.cwd()).length,4);
 const changed=structuredClone(f.plan);changed.hotelId+='different';assert.throws(()=>f.p.verifySspPlanEvidence(changed,process.cwd()),/HOTEL_SOURCE_BINDING/);
 changed.hotelId=f.plan.hotelId;changed.hotelSource.sha256='0'.repeat(64);assert.throws(()=>f.p.verifySspPlanEvidence(changed,process.cwd()),/EVIDENCE_HASH/);
 changed.hotelSource=f.plan.hotelSource;changed.comparisonPlan.externalConditions.permittedUse.status='PENDING';assert.equal(f.p.validateSspProbePlan(changed).status,'HOLD_CONFIGURATION_PENDING');
 for(const k of ['total','DISCOVERY','REQUOTE','PREBOOK']){const x=structuredClone(f.plan);x.caps[k]++;assert.throws(()=>f.p.validateSspProbePlan(x),/PLAN_UNSUPPORTED/);}
});
test('OP09 semantic prebook failure is explicit, consumes creation, never falls back',async()=>{
 const f=await fixture({prebook:(b:any)=>{b.data.error={code:'invented-prebook-error'};}});
 const r=await f.capture.acquireSspProbe(f.args);assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,3);assert.equal(r.counts.PREBOOK,1);assert.equal(r.failureClass,'PREBOOK_UNINTERPRETABLE_OR_ERROR');
 assert.equal(r.assessment.status,'EXACT_SSP_RETURNED_NOT_PREBOOK_VERIFIED');assert.equal(r.restartAllowed,false);
});
