import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,existsSync,rmSync,symlinkSync,realpathSync,unlinkSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const moduleUrl=pathToFileURL(join(process.cwd(),'scripts/liteapi-acquisition-journal-v1.mjs')).href;
const fixedTime=()=> '2099-09-01T12:00:00.000Z';
const wrapping=(v:string)=>{const b=Buffer.from(v,'base64');for(let i=0;i<b.length;i++)b[i]^=0xa5;return b.toString('base64');};
const syntheticProtector={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:wrapping,unprotectDataKey:wrapping};
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
async function fixture(){const m=await load(moduleUrl),base=mkdtempSync(join(tmpdir(),'stayopti-d0062-journal-synthetic-')),
 registryRoot=join(base,'registry'),caseId='SYNTHETIC_CASE_A';
 const input={root:join(registryRoot,'cases',caseId),registryRoot,caseId,bindingSha256:'a'.repeat(64),authorizationSha256:'b'.repeat(64),
  mode:'SYNTHETIC_ONLY',protector:syntheticProtector,now:fixedTime};
 return {m,base,input,create:()=>m.createAcquisitionJournal(input),cleanup:()=>{
  const path=resolve(base),rel=relative(realpathSync(tmpdir()),realpathSync(base));
  assert(rel!==''&&!rel.startsWith('..'+sep)&&!rel.includes(sep),'Cleanup must target only the new synthetic temp directory');rmSync(path,{recursive:true,force:true});}};
}
function reserve(j:any,kind='SEARCH',hotelId:string|null=null,extra:any={}){return j.reserve({kind,hotelId,requestBytes:JSON.stringify({kind,hotelId}),checkpointSha256:'a'.repeat(64),...extra});}
function complete(j:any,ordinal:number,extra:any={}){return j.complete({ordinal,state:'SUCCEEDED',responseBytes:'{"synthetic":true}',statusCode:200,...extra});}
function tree(path:string):Record<string,string>{const result:Record<string,string>={};for(const name of readdirSync(path,{withFileTypes:true})){
 const child=join(path,name.name);if(name.isDirectory())for(const [p,h]of Object.entries(tree(child)))result[name.name+'/'+p]=h;
 else result[name.name]=sha(readFileSync(child));}return result;}

test('AJ01 exact nontransferable caps count seventeen durable attempts before a transport can start',async()=>{const f=await fixture();try{
 const j=f.create();let ordinal=0;
 for(const [kind,count]of [['SEARCH',1],['HOTEL_DETAIL',5],['FACILITIES',1],['PREBOOK',5],['PREBOOK_GET',5]] as const){
  for(let i=0;i<count;i++){const r=reserve(j,kind,['SEARCH','FACILITIES'].includes(kind)?null:'invented-'+i);assert.equal(r.ordinal,++ordinal);
   assert.equal(f.m.verifyAcquisitionJournal(f.input).attemptsReserved,ordinal,'Reservation not durable before send');complete(j,r.ordinal);}
 }
 assert.equal(j.snapshot().attemptsReserved,17);assert.deepEqual(j.snapshot().counts,{SEARCH:1,HOTEL_DETAIL:5,FACILITIES:1,PREBOOK:5,PREBOOK_GET:5});
 assert.throws(()=>reserve(j,'HOTEL_DETAIL','extra'),/CAP_EXCEEDED/);const final=j.finish({status:'COMPLETED'});
 assert.equal(final.status,'COMPLETED');assert.equal(final.lockPresent,false);assert.equal(final.restartAllowed,false);
 assert.equal(f.m.verifyAcquisitionJournal(f.input).attemptsReserved,17);
}finally{f.cleanup();}});

for(const kind of ['SEARCH','FACILITIES','HOTEL_DETAIL','PREBOOK','PREBOOK_GET'])test('AJ02 '+kind+' cannot borrow another endpoint cap',async()=>{const f=await fixture();try{
 const j=f.create(),cap=kind==='SEARCH'||kind==='FACILITIES'?1:5;
 for(let i=0;i<cap;i++)complete(j,reserve(j,kind,cap===1?null:'invented-'+i).ordinal);
 assert.throws(()=>reserve(j,kind,cap===1?null:'invented-next'),/CAP_EXCEEDED/);assert.equal(j.snapshot().attemptsReserved,cap);
}finally{f.cleanup();}});

test('AJ03 duplicate hotel request is forbidden even when the caller changes offer identity',async()=>{const f=await fixture();try{
 const j=f.create();complete(j,reserve(j,'PREBOOK','invented-hotel',{offerId:'invented-offer-a'}).ordinal);
 assert.throws(()=>reserve(j,'PREBOOK','invented-hotel',{offerId:'invented-offer-b'}),/DUPLICATE_REQUEST/);
 assert.equal(j.snapshot().attemptsReserved,1);
}finally{f.cleanup();}});

test('AJ04 concurrency, invalid completion and retry of a failed counted attempt are rejected',async()=>{const f=await fixture();try{
 const j=f.create(),r=reserve(j);assert.throws(()=>reserve(j,'FACILITIES'),/CONCURRENCY_PROHIBITED/);
 assert.throws(()=>complete(j,2),/COMPLETION_INVALID/);complete(j,r.ordinal,{state:'FAILED',responseBytes:null,statusCode:null,errorClass:'TIMEOUT'});
 assert.equal(j.snapshot().attemptsReserved,1);assert.equal(j.snapshot().requests[0].state,'FAILED');assert.throws(()=>reserve(j),/CAP_EXCEEDED/);
}finally{f.cleanup();}});

test('AJ05 raw bytes including error content roundtrip exactly; no raw or request credential is persisted as plaintext',async()=>{const f=await fixture();try{
 const j=f.create(),request='{"synthetic_request":"ORIGINAL_SOURCE_REQUEST_001"}',r=reserve(j,'SEARCH',null,{requestBytes:request});
 const raw=Buffer.from([0,255,10,13,...Buffer.from('SYNTHETIC_ERROR_ORIGINAL_SECRET_BODY_001')]);
 complete(j,r.ordinal,{state:'FAILED',responseBytes:raw,errorClass:'PROVIDER_ERROR'});j.finish({status:'ABORTED'});
 assert.deepEqual(f.m.decryptAcquisitionOriginal({...f.input,ordinal:1,direction:'request'}),Buffer.from(request));
 assert.deepEqual(f.m.decryptAcquisitionOriginal({...f.input,ordinal:1,direction:'response'}),raw);
 const files=tree(f.input.root);for(const path of Object.keys(files)){
  const content=readFileSync(join(f.input.root,path),'utf8');assert(!content.includes('ORIGINAL_SOURCE_REQUEST_001'));assert(!content.includes('SYNTHETIC_ERROR_ORIGINAL_SECRET_BODY_001'));
 }
 assert.equal(f.m.verifyAcquisitionJournal(f.input).keyProtection,'SYNTHETIC_TEST_ONLY');
}finally{f.cleanup();}});

test('AJ06 credential-bearing request rejected before request/event persistence',async()=>{const f=await fixture();try{
 const j=f.create(),before=tree(f.input.root);assert.throws(()=>reserve(j,'SEARCH',null,{requestBytes:JSON.stringify({headers:{authorization:'SYNTHETIC_NOT_A_REAL_KEY'}})}),/CREDENTIAL_IN_REQUEST/);
 assert.deepEqual(tree(f.input.root),before);assert.equal(j.snapshot().attemptsReserved,0);
}finally{f.cleanup();}});

test('AJ07 changed execution binding refuses reservation without mutating the journal',async()=>{const f=await fixture();try{
 const j=f.create(),before=tree(f.input.root);assert.throws(()=>reserve(j,'SEARCH',null,{checkpointSha256:'c'.repeat(64)}),/CHECKPOINT_MISMATCH/);
 assert.deepEqual(tree(f.input.root),before);assert.throws(()=>f.m.verifyAcquisitionJournal({...f.input,bindingSha256:'c'.repeat(64)}),/CHECKPOINT_MISMATCH/);
}finally{f.cleanup();}});

test('AJ08 authorization and case tombstones outlive case contents and output/config changes',async()=>{const f=await fixture();try{
 f.create().finish({status:'ABORTED'});const markers=tree(join(f.input.registryRoot,'authorization-registry'));
 assert.throws(f.create,/CASE_ALREADY_EXISTS/);
 const original=realpathSync(f.input.root);assert.equal(original,resolve(f.input.root));assert(relative(f.base,original).startsWith('registry'+sep));rmSync(original,{recursive:true});
 assert.throws(f.create,/ONE_SHOT_ALREADY_CONSUMED/);
 assert.throws(()=>f.m.createAcquisitionJournal({...f.input,caseId:'SYNTHETIC_CASE_B',root:join(f.input.registryRoot,'cases','SYNTHETIC_CASE_B')}),/ONE_SHOT_ALREADY_CONSUMED/);
 assert.throws(()=>f.m.createAcquisitionJournal({...f.input,authorizationSha256:'d'.repeat(64),bindingSha256:'e'.repeat(64)}),/ONE_SHOT_ALREADY_CONSUMED/);
 assert.deepEqual(tree(join(f.input.registryRoot,'authorization-registry')),markers);
}finally{f.cleanup();}});

test('AJ09 crashed acquisition keeps its lock and consumed reservation; only read-only verification is supported',async()=>{const f=await fixture();try{
 const code=`import {createAcquisitionJournal} from ${JSON.stringify(moduleUrl)};const wrapping=${wrapping.toString()};const p={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:wrapping,unprotectDataKey:wrapping};const input=${JSON.stringify({...f.input,protector:undefined,now:undefined})};const j=createAcquisitionJournal({...input,protector:p,now:()=>${JSON.stringify(fixedTime())}});j.reserve({kind:'SEARCH',requestBytes:'{}',checkpointSha256:input.bindingSha256});process.exit(0);`;
 const exit=await child(code);assert.equal(exit.code,0,exit.stderr);const before=tree(f.input.root),s=f.m.verifyAcquisitionJournal(f.input);
 assert.equal(s.attemptsReserved,1);assert.equal(s.activeOrdinal,1);assert.equal(s.status,'INCOMPLETE_ONE_SHOT');assert.equal(s.lockPresent,true);
 assert.throws(f.create,/CASE_ALREADY_EXISTS/);assert.deepEqual(tree(f.input.root),before);
}finally{f.cleanup();}});

function child(code:string):Promise<{code:number|null;stdout:string;stderr:string}>{return new Promise(resolve=>{
 const p=spawn(process.execPath,['--input-type=module','-e',code],{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 p.stdout.on('data',v=>stdout+=v);p.stderr.on('data',v=>stderr+=v);p.on('error',e=>resolve({code:null,stdout,stderr:e.message}));p.on('exit',code=>resolve({code,stdout,stderr}));
});}

test('AJ10 two actual processes cannot acquire the same one-shot authorization',async()=>{const f=await fixture();try{
 const code=`import {createAcquisitionJournal} from ${JSON.stringify(moduleUrl)};const wrapping=${wrapping.toString()};const input=${JSON.stringify({...f.input,protector:undefined,now:undefined})};try{createAcquisitionJournal({...input,protector:{protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:wrapping,unprotectDataKey:wrapping},now:()=>${JSON.stringify(fixedTime())}});console.log('CREATED')}catch(e){console.log(e.message);process.exitCode=23}`;
 const outcomes=await Promise.all([child(code),child(code)]);assert.deepEqual(outcomes.map(x=>x.code).sort(),[0,23]);
 assert.equal(outcomes.filter(x=>x.stdout.trim()==='CREATED').length,1);assert(outcomes.every(x=>x.stderr===''));
 assert.equal(f.m.verifyAcquisitionJournal(f.input).attemptsReserved,0);
}finally{f.cleanup();}});

for(const changed of ['event','original','key','header','marker'])test('AJ11 '+changed+' tampering is rejected without rewriting evidence',async()=>{const f=await fixture();try{
 const j=f.create();complete(j,reserve(j).ordinal);
 const path=changed==='event'?join(f.input.root,'events','000002.json'):changed==='original'?join(f.input.root,'encrypted','001-response.aesgcm'):
  changed==='key'?join(f.input.root,'journal-key.json'):changed==='header'?join(f.input.root,'header.json'):
  join(f.input.registryRoot,'authorization-registry','authorization-'+f.input.authorizationSha256+'.json');
 const value=JSON.parse(readFileSync(path,'utf8'));value.syntheticTampering=true;writeFileSync(path,JSON.stringify(value));const before=tree(f.input.root);
 assert.throws(()=>f.m.verifyAcquisitionJournal(f.input),/LITEAPI_ACQUISITION_/);assert.throws(()=>reserve(j,'FACILITIES'),/LITEAPI_ACQUISITION_/);assert.deepEqual(tree(f.input.root),before);
}finally{f.cleanup();}});

test('AJ12 missing and truncated records do not become a resumable journal',async()=>{const f=await fixture();try{
 const j=f.create();reserve(j);const path=join(f.input.root,'events','000002.json');writeFileSync(path,'{"incomplete":');
 assert.throws(()=>f.m.verifyAcquisitionJournal(f.input),/JSON_INVALID/);assert.throws(()=>reserve(j,'FACILITIES'),/JSON_INVALID/);assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('AJ13 directory scope and repository targets fail before filesystem creation',async()=>{const f=await fixture();try{
 assert.throws(()=>f.m.createAcquisitionJournal({...f.input,root:join(f.base,'elsewhere')}),/CASE_ROOT_SCOPE/);
 assert.throws(()=>f.m.createAcquisitionJournal({...f.input,registryRoot:join(process.cwd(),'synthetic-never-create'),root:join(process.cwd(),'synthetic-never-create','cases',f.input.caseId)}),/REPOSITORY_PATH_PROHIBITED/);
 assert(!existsSync(join(process.cwd(),'synthetic-never-create')));assert(!existsSync(f.input.registryRoot));
}finally{f.cleanup();}});

test('AJ14 junction/symlink ancestor refuses acquisition and leaves target untouched',async()=>{const f=await fixture();try{
 const target=join(f.base,'target');mkdirSync(target);symlinkSync(target,f.input.registryRoot,process.platform==='win32'?'junction':'dir');
 assert.throws(f.create,/LINK_OR_REPARSE_POINT/);assert.deepEqual(readdirSync(target),[]);
 unlinkSync(f.input.registryRoot);
}finally{f.cleanup();}});

test('AJ15 finish abort records a pending counted timeout and removes only its own lock',async()=>{const f=await fixture();try{
 const j=f.create();reserve(j);const result=j.finish({status:'ABORTED'});assert.equal(result.attemptsReserved,1);assert.equal(result.requests[0].errorClass,'INTERRUPTED_NO_RESPONSE');
 assert.equal(result.lockPresent,false);assert.equal(f.m.verifyAcquisitionJournal(f.input).status,'ABORTED');assert.throws(()=>reserve(j,'FACILITIES'),/JOURNAL_CLOSED/);
 assert(existsSync(join(f.input.registryRoot,'authorization-registry','authorization-'+f.input.authorizationSha256+'.json')));
}finally{f.cleanup();}});

test('AJ16 wrong lock ownership is never removed or replaced',async()=>{const f=await fixture();try{
 const j=f.create(),lock=join(f.input.root,'.lock');writeFileSync(lock,'{"ownerToken":"synthetic-other-owner"}');const before=readFileSync(lock);
 assert.throws(()=>j.finish({status:'ABORTED'}),/LOCK_OWNERSHIP_CHANGED/);assert.deepEqual(readFileSync(lock),before);
}finally{f.cleanup();}});

test('AJ17 incomplete successful response is not certified',async()=>{const f=await fixture();try{
 const j=f.create(),r=reserve(j);assert.throws(()=>complete(j,r.ordinal,{responseBytes:null}),/SUCCESS_RESPONSE_REQUIRED/);
 assert.equal(j.snapshot().activeOrdinal,1);assert.equal(j.snapshot().attemptsReserved,1);
}finally{f.cleanup();}});

test('AJ18 timestamp rollback is rejected with authorization/lock retained',async()=>{const f=await fixture();try{
 let time=fixedTime();const j=f.m.createAcquisitionJournal({...f.input,now:()=>time});time='2099-08-31T12:00:00.000Z';
 assert.throws(()=>reserve(j),/TIME_INVALID/);assert.throws(()=>reserve(j),/JOURNAL_POISONED/);assert(existsSync(join(f.input.root,'.lock')));assert.throws(f.create,/CASE_ALREADY_EXISTS/);
}finally{f.cleanup();}});

test('AJ19 read-only verification on a missing case creates nothing',async()=>{const f=await fixture();try{
 assert.throws(()=>f.m.verifyAcquisitionJournal(f.input),/PATH_MISSING/);assert(!existsSync(f.input.registryRoot));
}finally{f.cleanup();}});

test('AJ20 actual Windows CurrentUser DPAPI protects synthetic-only original bytes',{
 skip:process.platform==='win32'?false:'requires real Windows PowerShell 5.1; enforced by the required windows-latest release job',
},async()=>{const f=await fixture();try{
 const {protector:_unused,...input}=f.input;void _unused;const j=f.m.createAcquisitionJournal(input),r=reserve(j);
 complete(j,r.ordinal,{responseBytes:'{"synthetic":"WINDOWS_CURRENT_USER_ROUNDTRIP"}'});j.finish({status:'COMPLETED'});
 const s=f.m.verifyAcquisitionJournal(input);assert.equal(s.keyProtection,'WINDOWS_CURRENT_USER_DPAPI');assert.equal(s.syntheticProofOnly,true);
 assert.equal(f.m.decryptAcquisitionOriginal({...input,ordinal:1,direction:'response'}).toString('utf8'),'{"synthetic":"WINDOWS_CURRENT_USER_ROUNDTRIP"}');
}finally{f.cleanup();}});

test('AJ21 immutable acquisition context survives crash and is authenticated by START without trusting a replacement object',async()=>{const f=await fixture();try{
 const context={config:{caseId:f.input.caseId,synthetic:true},checkpoint:{head:'c'.repeat(40)},inventory:{files:['synthetic-module-only.mjs']},configFileSha256:'d'.repeat(64)};
 const original=structuredClone(context),j=f.m.createAcquisitionJournal({...f.input,context});reserve(j);
 context.config.caseId='CALLER_CHANGED_CONTEXT';const saved=f.m.verifyAcquisitionJournal(f.input);assert.deepEqual(saved.context,original);
 assert.equal(saved.status,'INCOMPLETE_ONE_SHOT');const headerPath=join(f.input.root,'header.json'),header=JSON.parse(readFileSync(headerPath,'utf8'));
 header.context.config.synthetic=false;writeFileSync(headerPath,JSON.stringify(header));assert.throws(()=>f.m.verifyAcquisitionJournal(f.input),/KEY_BINDING_MISMATCH|START_EVENT_INVALID/);
}finally{f.cleanup();}});

test('AJ22 interruption after encrypted original persistence poisons the journal and preserves evidence/authorization without a false PASS',async()=>{const f=await fixture();try{
 let ticks=0;const j=f.m.createAcquisitionJournal({...f.input,now:()=>{if(++ticks===4)throw new Error('SYNTHETIC_INTERRUPT_BEFORE_RESERVATION_PUBLICATION');return fixedTime();}});
 assert.throws(()=>reserve(j),/SYNTHETIC_INTERRUPT_BEFORE_RESERVATION_PUBLICATION/);
 assert(existsSync(join(f.input.root,'encrypted','001-request.aesgcm')));assert(existsSync(join(f.input.root,'.lock')));
 assert.throws(()=>j.snapshot(),/JOURNAL_POISONED/);assert.throws(()=>reserve(j),/JOURNAL_POISONED/);
 assert.throws(()=>f.m.verifyAcquisitionJournal(f.input),/UNCOMMITTED_ORIGINAL_OR_TEMPORARY_FILE/);assert.throws(f.create,/CASE_ALREADY_EXISTS/);
 assert(existsSync(join(f.input.registryRoot,'authorization-registry','authorization-'+f.input.authorizationSha256+'.json')));
}finally{f.cleanup();}});
