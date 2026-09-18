import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync,realpathSync,existsSync} from 'node:fs';
import {join,resolve,relative,sep,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const protector={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:(v:string)=>v,unprotectDataKey:(v:string)=>v};
function tree(root:string):Record<string,string>{if(!existsSync(root))return {};return Object.fromEntries(readdirSync(root,{withFileTypes:true}).flatMap(e=>{
 const p=join(root,e.name);return e.isDirectory()?Object.entries(tree(p)).map(([n,h])=>[e.name+'/'+n,h]):[[e.name,sha(readFileSync(p))]];
}));}
async function fixture(count=2){
 const [fm,p,j,c]=await Promise.all([at('tests/engine-v3/fixtures/liteApiHotelDetailSyntheticV1.mjs'),at('scripts/liteapi-hotel-detail-plan-v1.mjs'),at('scripts/liteapi-hotel-details-journal-v1.mjs'),at('scripts/liteapi-hotel-details-capture-v1.mjs')]);
 const base=mkdtempSync(join(tmpdir(),'StayOpti-D0066-Transport-')),registryRoot=join(base,'registry'),data=fm.hotelDetailFixture({count,twoOffers:true,directory:registryRoot});
 const checkpoint={head:'a'.repeat(40),branch:'codex/evaluation-d0036-d0041',inventorySha256:'b'.repeat(64)};
 const input={registryRoot,root:join(registryRoot,'cases',data.config.caseId),caseId:data.config.caseId,mode:'SYNTHETIC_ONLY',protector,
  bindingSha256:p.hash({config:data.config,checkpoint}),authorizationSha256:'c'.repeat(64),context:{config:structuredClone(data.config),checkpoint:structuredClone(checkpoint),inventory:{synthetic:true},configFileSha256:p.hash(data.config)}};
 return {fm,p,j,c,base,data,checkpoint,input,create:()=>j.createHotelDetailsJournal(input),
  run:(journal:any,overrides:any={})=>c.runHotelDetailsAcquisition({config:data.config,checkpoint,journal,simulation:data.simulation,verifyBeforeSend:()=>{},...overrides}),
  cleanup:()=>{const actual=realpathSync(base),rel=relative(realpathSync(tmpdir()),actual);assert(rel!==''&&!rel.startsWith('..'+sep)&&!rel.includes(sep));assert.match(basename(actual),/^StayOpti-D0066-Transport-/);rmSync(resolve(actual),{recursive:true,force:true});}};
}
function reserve(f:any,j:any,index:number,change:(v:any)=>void=()=>{}){const request=f.p.detailsRequest(index,f.data.config);change(request);return j.reserve({kind:request.kind,hotelId:request.hotelId,requestBytes:Buffer.from(f.p.canonical(request)),checkpointSha256:f.input.bindingSha256});}
const complete=(j:any,ordinal:number,state='SUCCEEDED')=>j.complete({ordinal,state,responseBytes:'{"synthetic":true}',statusCode:200,errorClass:state==='FAILED'?'SYNTHETIC_FAILURE':null});
function child(code:string):Promise<{status:number|null;stdout:string;stderr:string}>{return new Promise(resolve=>{const p=spawn(process.execPath,['--input-type=module','-e',code],{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('error',e=>resolve({status:null,stdout,stderr:e.message}));p.on('exit',status=>resolve({status,stdout,stderr}));});}

test('DT01 five exact GETs preserve ten historical variants and authenticated response bytes, no policy',async()=>{const f=await fixture(5);try{
 const initial=structuredClone(f.data),j=f.create(),r=await f.run(j);assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,5);assert.equal(r.localHttpRequests,5);assert.equal(r.providerHttpRequests,0);
 assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(r.prebookCreationsAttempted,0);assert.equal(r.offerPriceRefreshed,false);assert.equal(r.offerAvailabilityRefreshed,false);
 assert.equal(r.plannedDetails,5);assert.equal(r.details.length,5);assert.equal(r.counts.HOTEL_DETAIL,5);assert.equal(Date.parse(r.retentionEndsAt)-Date.parse(r.custodyStartedAt),14*86400000);
 const before=tree(f.input.registryRoot),read=f.c.readAuthenticatedHotelDetails(f.input);assert.equal(read.journal.status,'COMPLETED');assert.equal(read.records.length,5);
 for(let i=0;i<5;i++){assert.deepEqual(read.records[i].request,f.p.detailsRequest(i,f.data.config));const b=read.records[i].response.response.body;assert.equal(b.sha256,sha(Buffer.from(JSON.stringify(f.data.simulation.responses[i].response))));
  const rq=read.journal.requests[i];assert(Date.parse(rq.reservedAt)<=Date.parse(read.records[i].response.startedAt));}
 assert.deepEqual(tree(f.input.registryRoot),before);assert.deepEqual(f.data,initial);assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT02 cap six, duplicate and out-of-order target are rejected before further persistence',async()=>{const f=await fixture(5);try{
 const j=f.create();assert.throws(()=>reserve(f,j,1),/REQUEST_OUTSIDE_SEALED_PLAN/);assert.equal(j.snapshot().attemptsReserved,0);
 for(let i=0;i<5;i++)complete(j,reserve(f,j,i).ordinal);
 const before=tree(f.input.root);assert.throws(()=>reserve(f,j,0),/CAP_EXCEEDED/);assert.equal(j.snapshot().attemptsReserved,5);assert.deepEqual(tree(f.input.root),before);
 j.finish({status:'COMPLETED'});assert.equal(f.j.verifyHotelDetailsJournal(f.input).counts.HOTEL_DETAIL,5);
}finally{f.cleanup();}});

const requestMutations:Record<string,(r:any)=>void>={METHOD:r=>{r.method='POST';},HOST:r=>{r.host='other.example.invalid';},PATH:r=>{r.path='/v3.0/rates/prebook';},QUERY:r=>{r.query.page=2;},
 HOTEL:r=>{r.query.hotelId='UNSELECTED_SYNTHETIC';},BODY:r=>{r.body={synthetic:true};},OPERATION:r=>{r.kind='PREBOOK';},TIMEOUT:r=>{r.query.timeout=12;}};
for(const [label,change]of Object.entries(requestMutations))
test('DT03 planned request refuses '+label+' before event or original creation',async()=>{const f=await fixture();try{const j=f.create(),before=tree(f.input.root);assert.throws(()=>reserve(f,j,0,change),/LITEAPI_DETAIL_/);assert.deepEqual(tree(f.input.root),before);assert.equal(j.snapshot().attemptsReserved,0);}finally{f.cleanup();}});

test('DT04 duplicate failed target cannot be retried and cannot continue to another target',async()=>{const f=await fixture();try{
 const j=f.create();complete(j,reserve(f,j,0).ordinal,'FAILED');const before=tree(f.input.root);assert.throws(()=>reserve(f,j,0),/DUPLICATE_REQUEST/);assert.throws(()=>reserve(f,j,1),/REQUEST_AFTER_FAILURE/);
 assert.throws(()=>j.finish({status:'COMPLETED'}),/INCOMPLETE_COLLECTION_NOT_COMPLETE/);assert.deepEqual(tree(f.input.root),before,'An invalid completion must not append a false terminal event');
 assert.equal(j.finish({status:'ABORTED'}).status,'ABORTED');
}finally{f.cleanup();}});

test('DT05 concurrency and incomplete completion do not refund a counted reservation',async()=>{const f=await fixture();try{
 const j=f.create();reserve(f,j,0);assert.throws(()=>reserve(f,j,1),/CONCURRENCY_PROHIBITED/);const r=j.finish({status:'ABORTED'});
 assert.equal(r.attemptsReserved,1);assert.equal(r.requests[0].errorClass,'INTERRUPTED_NO_RESPONSE');assert.equal(r.restartAllowed,false);assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT06 missing rooms and unmatched room are missing evidence, not a reason to repeat details',async()=>{const f=await fixture();try{
 delete f.data.simulation.responses[0].response.data.rooms;f.data.simulation.responses[1].response.data.rooms[0].id=99999;
 const r=await f.run(f.create());assert.equal(r.status,'COMPLETE');assert.equal(r.actualAttempts,2);assert(r.details.every((x:any)=>x.detailUsable));
 const cmp=await at('scripts/liteapi-room-detail-comparison-v1.mjs'),read=f.c.readAuthenticatedHotelDetails(f.input);
 const result=cmp.compareHotelDetailCapture(f.data.source,read);assert(result.offers.every((x:any)=>x.status==='MAPPED_ROOM_NOT_FOUND'));
}finally{f.cleanup();}});

for(const [label,change,reason]of [
 ['HTTP401',(r:any)=>r.status=401,'HTTP_401'],['HTTP403',(r:any)=>r.status=403,'HTTP_403'],['HTTP500',(r:any)=>r.status=500,'HTTP_500'],
 ['REDIRECT',(r:any)=>r.status=302,'REDIRECT_REFUSED'],['HTTP204',(r:any)=>{r.status=204;r.bytes='';},'HTTP_204'],
 ['ROOT_ERROR',(r:any)=>r.response.error={code:'SYNTHETIC_INVALID_DETAIL'},'DETAIL_APPLICATION_ERROR'],
 ['DATA_ERROR',(r:any)=>r.response.data.error={code:'SYNTHETIC_INVALID_DETAIL'},'DETAIL_APPLICATION_ERROR'],
 ['BAD_JSON',(r:any)=>r.bytes='{"syntheticIncomplete":','DETAIL_JSON_OR_CONTENT_TYPE_UNSUPPORTED'],
 ['BAD_CONTENT_TYPE',(r:any)=>r.contentType='text/plain','CONTENT_TYPE_UNSUPPORTED'],
 ['WRONG_HOTEL',(r:any)=>r.response.data.id='UNSELECTED_SYNTHETIC','DETAIL_PROPERTY_IDENTITY_UNVERIFIED'],
 ['ROOMS_SCHEMA',(r:any)=>r.response.data.rooms={synthetic:'not-array'},'DETAIL_ROOM_ARRAY_UNSUPPORTED'],
 ['RESET',(r:any)=>r.reset=true,'FAIL_CLOSED_TRANSPORT_OR_INTEGRITY'],
 ] as Array<[string,(r:any)=>void,string]>)test('DT07 '+label+' halts, consumes once and retains the original or missing-response reason',async()=>{const f=await fixture();try{
 change(f.data.simulation.responses[0]);const r=await f.run(f.create());assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,reason);assert.equal(r.actualAttempts,1);assert.equal(r.localHttpRequests,1);
 assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(f.j.verifyHotelDetailsJournal(f.input).status,'ABORTED');assert.throws(f.create,/CASE_ALREADY_EXISTS/);
 const read=f.c.readAuthenticatedHotelDetails(f.input);assert.equal(read.records.length,1);if(label!=='RESET')assert(read.records[0].response.response||read.records[0].response.partialResponse);
}finally{f.cleanup();}});

test('DT08 actual twenty-second client timeout consumes the attempt and prevents the second GET',async()=>{const f=await fixture();try{
 f.data.simulation.responses[0].timeout=true;const start=Date.now(),r=await f.run(f.create());assert.equal(f.data.config.controls.clientTimeoutMs,20000);
 assert(Date.now()-start>=19500);assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,'TIMEOUT');assert.equal(r.actualAttempts,1);assert.equal(r.localHttpRequests,1);
 assert.equal(f.j.verifyHotelDetailsJournal(f.input).requests[0].state,'FAILED');assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT09 actual partial response interruption preserves bytes without accepting a detail or resuming',async()=>{const f=await fixture();try{
 f.data.simulation.responses[0].partialBytes='{"data":{"id":"SYNTHETIC';const r=await f.run(f.create());assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,1);
 const read=f.c.readAuthenticatedHotelDetails(f.input);assert.equal(read.records[0].response.partialResponse.complete,false);assert.equal(Buffer.from(read.records[0].response.partialResponse.body.base64,'base64').toString(),f.data.simulation.responses[0].partialBytes);
}finally{f.cleanup();}});

test('DT10 response larger than 32 MiB stops without a second send',async()=>{const f=await fixture();try{
 f.data.simulation.responses[0].bytes='x'.repeat(32*1024*1024+65536);const r=await f.run(f.create());assert.equal(r.failureClass,'RESPONSE_TOO_LARGE');assert.equal(r.actualAttempts,1);assert.equal(r.status,'ABORTED');assert.equal(r.localHttpRequests,1);
}finally{f.cleanup();}});

test('DT11 signal abort after before-send reservation remains consumed',async()=>{const f=await fixture();try{
 f.data.simulation.responses[0].timeout=true;const controller=new AbortController(),j=f.create();const timer=setTimeout(()=>controller.abort(),250);
 try{const r=await f.run(j,{signal:controller.signal});assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,'INTERRUPTED');assert.equal(r.actualAttempts,1);assert.equal(r.localHttpRequests,1);}finally{clearTimeout(timer);}
 assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT12 changed code/inventory checkpoint stops before first transport without resetting the case',async()=>{const f=await fixture();try{
 const r=await f.run(f.create(),{verifyBeforeSend:()=>{throw Error('LITEAPI_DETAIL_CODE_OR_PRESERVED_BYTES_CHANGED');}});
 assert.equal(r.status,'ABORTED');assert.equal(r.actualAttempts,0);assert.equal(r.transportInvocations,0);assert.equal(r.failureClass,'CODE_OR_PRESERVED_BYTES_CHANGED');assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT13 in-memory config changes after first GET stop the second before reservation',async()=>{const f=await fixture();try{
 let checks=0;const r=await f.run(f.create(),{verifyBeforeSend:()=>{if(++checks===3)f.data.config.scenario.budget++;}});
 assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,'CONFIG_CHANGED');assert.equal(r.actualAttempts,1);assert.equal(r.localHttpRequests,1);
}finally{f.cleanup();}});

for(const kind of ['header','event','encrypted'])test('DT14 '+kind+' tamper fails authentication, not a new attempt',async()=>{const f=await fixture(1);try{
 await f.run(f.create());const path=kind==='header'?join(f.input.root,'header.json'):kind==='event'?join(f.input.root,'events','000002.json'):join(f.input.root,'encrypted','001-response.aesgcm');
 const value=JSON.parse(readFileSync(path,'utf8'));value.syntheticTampering=true;writeFileSync(path,JSON.stringify(value));const before=tree(f.input.root);
 assert.throws(()=>f.j.verifyHotelDetailsJournal(f.input),/LITEAPI_DETAIL_/);assert.throws(()=>f.c.readAuthenticatedHotelDetails(f.input),/LITEAPI_DETAIL_/);assert.deepEqual(tree(f.input.root),before);assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT15 genuine concurrent processes cannot create two journals for one authorization',async()=>{const f=await fixture(1);try{
 const module=pathToFileURL(join(process.cwd(),'scripts/liteapi-hotel-details-journal-v1.mjs')).href;
 const code=`import {createHotelDetailsJournal} from ${JSON.stringify(module)};const input=${JSON.stringify({...f.input,protector:undefined})};input.protector={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:x=>x,unprotectDataKey:x=>x};try{createHotelDetailsJournal(input);console.log('CREATED')}catch(e){console.log(e.message);process.exitCode=23}`;
 const outcomes=await Promise.all([child(code),child(code)]);assert.deepEqual(outcomes.map(x=>x.status).sort(),[0,23]);assert(outcomes.every(x=>x.stderr===''));assert.equal(outcomes.filter(x=>x.stdout.trim()==='CREATED').length,1);
 assert.equal(f.j.verifyHotelDetailsJournal(f.input).status,'INCOMPLETE_ONE_SHOT');
}finally{f.cleanup();}});

test('DT16 crashed process retains its lock/reservation and cannot reopen for sending',async()=>{const f=await fixture(1);try{
 const module=pathToFileURL(join(process.cwd(),'scripts/liteapi-hotel-details-journal-v1.mjs')).href,request=f.p.detailsRequest(0,f.data.config);
 const code=`import {createHotelDetailsJournal} from ${JSON.stringify(module)};const input=${JSON.stringify({...f.input,protector:undefined})};input.protector={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:x=>x,unprotectDataKey:x=>x};const j=createHotelDetailsJournal(input);j.reserve({kind:'HOTEL_DETAIL',hotelId:${JSON.stringify(request.hotelId)},requestBytes:${JSON.stringify(f.p.canonical(request))},checkpointSha256:input.bindingSha256});process.exit(0)`;
 const r=await child(code);assert.equal(r.status,0,r.stderr);const before=tree(f.input.root),s=f.j.verifyHotelDetailsJournal(f.input);assert.equal(s.attemptsReserved,1);assert.equal(s.status,'INCOMPLETE_ONE_SHOT');assert.equal(s.lockPresent,true);assert.throws(f.create,/CASE_ALREADY_EXISTS/);assert.deepEqual(tree(f.input.root),before);
}finally{f.cleanup();}});

test('DT17 MAX17 verifier cannot accept MAX5 identity even with the same files and subject',async()=>{const f=await fixture(1);try{
 await f.run(f.create());const old=await at('scripts/liteapi-acquisition-journal-v1.mjs');assert.throws(()=>old.verifyAcquisitionJournal(f.input),/CHECKPOINT_MISMATCH/);
 const input={...f.input,bindingSha256:'f'.repeat(64)};assert.throws(()=>f.j.verifyHotelDetailsJournal(input),/CHECKPOINT_MISMATCH/);
}finally{f.cleanup();}});

test('DT18 actual CurrentUser DPAPI synthetic custody reopens without storing plaintext responses',{
 skip:process.platform==='win32'?false:'requires actual Windows PowerShell 5.1 / CurrentUser DPAPI; covered by required Windows gate',
},async()=>{const f=await fixture(1);try{
 const {protector:_unused,...input}=f.input;void _unused;const j=f.j.createHotelDetailsJournal(input),r=await f.run(j);assert.equal(r.status,'COMPLETE');
 const read=f.c.readAuthenticatedHotelDetails(input);assert.equal(read.journal.keyProtection,'WINDOWS_CURRENT_USER_DPAPI');assert.equal(read.journal.syntheticProofOnly,true);
 const marker='Invented Maple Property 0';for(const name of Object.keys(tree(f.input.root)))assert(!readFileSync(join(f.input.root,name),'utf8').includes(marker));
 assert.equal(JSON.parse(Buffer.from(read.records[0].response.response.body.base64,'base64').toString()).data.name,marker);
}finally{f.cleanup();}});

for(const target of ['CONFIG','INVENTORY'])test('DT19 operational '+target+' file changed after first response blocks the next send',async()=>{const f=await fixture();try{
 const inventory={version:'SYNTHETIC_INVENTORY_ONLY',sha256:'d'.repeat(64)},configPath=join(f.base,'config.json'),inventoryPath=join(f.base,'inventory.json');
 const configBytes=JSON.stringify(f.data.config),inventoryBytes=JSON.stringify(inventory);writeFileSync(configPath,configBytes);writeFileSync(inventoryPath,inventoryBytes);
 const approval={configPath,configFileSha256:sha(configBytes),inventoryPath,inventoryFileSha256:sha(inventoryBytes),inventory};
 assert.deepEqual(f.c.verifyHotelDetailsOperationalFiles(f.data.config,approval),{valid:true,providerHttpRequests:0,engineInvocations:0,policyInvocations:0});
 let checks=0;const r=await f.run(f.create(),{verifyBeforeSend:()=>{if(++checks===3)writeFileSync(target==='CONFIG'?configPath:inventoryPath,'{"syntheticChanged":true}');f.c.verifyHotelDetailsOperationalFiles(f.data.config,approval);}});
 assert.equal(r.status,'ABORTED');assert.equal(r.failureClass,'OPERATIONAL_'+target+'_FILE_CHANGED');assert.equal(r.actualAttempts,1);assert.equal(r.localHttpRequests,1);
 assert.equal(f.j.verifyHotelDetailsJournal(f.input).status,'ABORTED');assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('DT20 operational file verification rejects a mismatching object, missing digest and relative path without custody',async()=>{const f=await fixture(1);try{
 const inventory={synthetic:true},configPath=join(f.base,'config.json'),inventoryPath=join(f.base,'inventory.json'),configBytes=JSON.stringify(f.data.config),inventoryBytes=JSON.stringify(inventory);
 writeFileSync(configPath,configBytes);writeFileSync(inventoryPath,inventoryBytes);const approval={configPath,configFileSha256:sha(configBytes),inventoryPath,inventoryFileSha256:sha(inventoryBytes),inventory};
 assert.throws(()=>f.c.verifyHotelDetailsOperationalFiles({...f.data.config,caseId:'OTHER_SYNTHETIC'},approval),/OPERATIONAL_CONFIG_CONTENT_CHANGED/);
 assert.throws(()=>f.c.verifyHotelDetailsOperationalFiles(f.data.config,{...approval,configFileSha256:null}),/OPERATIONAL_FILE_BINDING_REQUIRED/);
 assert.throws(()=>f.c.verifyHotelDetailsOperationalFiles(f.data.config,{...approval,configPath:'config.json'}),/OPERATIONAL_FILE_BINDING_REQUIRED/);
 assert.equal(existsSync(f.input.registryRoot),false);
}finally{f.cleanup();}});
