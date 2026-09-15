// D-0064: versioned MAX3 derivative of the D0062 durable journal primitives.
// Legacy journal is not modified; its markers/root/caps cannot enter this profile. No transport, credential
// loading, provider calls, runtime integration or implicit restart is provided.
import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {openSync,closeSync,writeFileSync,readFileSync,fsyncSync,mkdirSync,existsSync,lstatSync,realpathSync,
 readdirSync,linkSync,unlinkSync} from 'node:fs';
import {resolve,relative,isAbsolute,join,dirname,sep,parse} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWindowsCurrentUserDpapiProtectorV3} from './provider-raw-quarantine-store.mjs';
import {COVERAGE_CAPS} from './liteapi-search-coverage-plan-v1.mjs';

export const LITEAPI_COVERAGE_JOURNAL_VERSION='stayopti.liteapi-search-coverage-journal@1';
export const LITEAPI_COVERAGE_CAPS=COVERAGE_CAPS;
const kinds=['CATALOG','CITY_RATES','ID_RATES'];
const repository=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fail=code=>{throw Error('LITEAPI_COVERAGE_'+code);};
const clone=v=>structuredClone(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const caseName=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(v);
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const order=v=>Array.isArray(v)?v.map(order):plain(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,order(v[k])])):v;
const json=v=>JSON.stringify(order(v));
const hash=v=>createHash('sha256').update(v).digest('hex');
export const hashCoverageJournalValue=v=>hash(json(v));
const mac=(key,v)=>createHmac('sha256',key).update(json(v)).digest('hex');
const equal=(a,b)=>json(a)===json(b);
const pathEqual=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
const inside=(root,path)=>{const rel=relative(root,path);return rel!==''&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep);};
function safePath(path,{directory=false,missing=false}={}){
 if(typeof path!=='string'||!isAbsolute(path)||!pathEqual(resolve(path),path))fail('CANONICAL_ABSOLUTE_PATH_REQUIRED');
 let cursor=parse(path).root;const parts=relative(cursor,path).split(sep).filter(Boolean);
 for(const part of parts){cursor=join(cursor,part);if(!existsSync(cursor)){if(missing)continue;fail('PATH_MISSING');}
  const s=lstatSync(cursor);if(s.isSymbolicLink()||!pathEqual(realpathSync.native(cursor),cursor))fail('LINK_OR_REPARSE_POINT');
  if(!s.isDirectory()&&!s.isFile()||s.isFile()&&s.nlink!==1)fail('UNSAFE_FILE_TYPE');
 }
 if(existsSync(path)&&directory&&!lstatSync(path).isDirectory())fail('DIRECTORY_REQUIRED');return path;
}
function paths(input){
 const {root,registryRoot,caseId}=input;if(!caseName(caseId))fail('CASE_ID_INVALID');
 safePath(registryRoot,{directory:true,missing:true});safePath(root,{directory:true,missing:true});
 if(!pathEqual(root,join(registryRoot,'cases',caseId)))fail('CASE_ROOT_SCOPE');
 const blocked=[repository,...(input.repositoryRoot?[resolve(input.repositoryRoot)]:[])];
 if(blocked.some(p=>pathEqual(root,p)||inside(p,root)||pathEqual(registryRoot,p)||inside(p,registryRoot)))fail('REPOSITORY_PATH_PROHIBITED');
 if(!hex(input.bindingSha256)||!hex(input.authorizationSha256))fail('BINDING_INVALID');
 if(!['SYNTHETIC_ONLY','REAL'].includes(input.mode))fail('MODE_INVALID');
 if(input.mode==='REAL'){
  if(process.platform!=='win32'||!process.env.LOCALAPPDATA)fail('WINDOWS_CURRENT_USER_REQUIRED');
  const expected=join(process.env.LOCALAPPDATA,'StayOpti','private-evidence','liteapi-search-coverage');
  if(!pathEqual(registryRoot,expected))fail('REAL_REGISTRY_ROOT_MISMATCH');
 }
 return {root,registryRoot,registry:join(registryRoot,'authorization-registry'),caseMarker:join(registryRoot,'authorization-registry','case-'+hash(caseId)+'.json'),
  authorizationMarker:join(registryRoot,'authorization-registry','authorization-'+input.authorizationSha256+'.json')};
}
function protectorFor(input){
 if(input.mode==='REAL'&&input.protector)fail('REAL_PROTECTOR_INJECTION_PROHIBITED');
 const p=input.protector??createWindowsCurrentUserDpapiProtectorV3();
 if(!p||typeof p.protectDataKey!=='function'||typeof p.unprotectDataKey!=='function'||
  !['WINDOWS_CURRENT_USER_DPAPI','SYNTHETIC_TEST_ONLY'].includes(p.protectionClass))fail('KEY_PROTECTOR_INVALID');
 if(input.mode==='REAL'&&p.protectionClass!=='WINDOWS_CURRENT_USER_DPAPI')fail('WINDOWS_CURRENT_USER_REQUIRED');return p;
}
function durableExclusive(path,bytes){
 safePath(dirname(path),{directory:true});if(existsSync(path))fail('FILE_ALREADY_EXISTS');
 const temp=path+'.'+randomBytes(12).toString('hex')+'.tmp';let fd;
 try{fd=openSync(temp,'wx',0o600);writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined;
  // Hard-link publication is atomic/no-replace; unlike rename it cannot replace
  // a destination created by another process between the check and publication.
  linkSync(temp,path);unlinkSync(temp);
 }catch{if(fd!==undefined)closeSync(fd);fail('DURABLE_WRITE_FAILED');}
}
const readJson=path=>{safePath(path);try{return JSON.parse(readFileSync(path,'utf8'));}catch{fail('JSON_INVALID');}};
const writeJson=(path,v)=>durableExclusive(path,Buffer.from(json(v)+'\n'));
function markerData(input){return {version:LITEAPI_COVERAGE_JOURNAL_VERSION,caseId:input.caseId,root:input.root,
 bindingSha256:input.bindingSha256,authorizationSha256:input.authorizationSha256,mode:input.mode,oneShotConsumed:true};}
function checkedKey(p,wrapped){let b;try{b=Buffer.from(p.unprotectDataKey(wrapped),'base64');}catch{fail('KEY_UNPROTECT_FAILED');}
 if(b.length!==32){b.fill(0);fail('KEY_SIZE');}return b;}
const subkey=(key,label)=>createHmac('sha256',key).update(label).digest();
function keyAndHeader(input,p){const pths=paths(input),header=readJson(join(pths.root,'header.json'));
 if(!equal(header.binding,markerData(input))||!equal(header.limits,LITEAPI_COVERAGE_CAPS)||!utc(header.startedAt))fail('CHECKPOINT_MISMATCH');
 if(!equal(readJson(pths.caseMarker),header.binding)||!equal(readJson(pths.authorizationMarker),header.binding))fail('AUTHORIZATION_MARKER_MISMATCH');
 const protectedKey=readJson(join(pths.root,'journal-key.json'));
 if(!equal(Object.keys(protectedKey).sort(),['protectionClass','wrappedKey','headerSha256'].sort())||typeof protectedKey.wrappedKey!=='string'||
  protectedKey.protectionClass!==p.protectionClass||protectedKey.headerSha256!==hashCoverageJournalValue(header))fail('KEY_BINDING_MISMATCH');
 return {pths,header,key:checkedKey(p,protectedKey.wrappedKey),keyFileSha256:hash(readFileSync(join(pths.root,'journal-key.json')))};
}
function validateSummary(events,header){
 const requests=[],counts=Object.fromEntries(kinds.map(k=>[k,0])),seen=new Set();let active=null,terminal=null,selection=null;
 for(const e of events){const d=e.data;
  if(e.type==='START'){if(e.sequence!==1||!equal(d,{headerSha256:hashCoverageJournalValue(header)}))fail('START_EVENT_INVALID');continue;}
  if(terminal)fail('EVENT_AFTER_FINISH');
  if(e.type==='SEAL'){
   if(selection||active!==null||requests.length!==1||requests[0].kind!=='CATALOG'||requests[0].state!=='SUCCEEDED'||!Number.isInteger(d.selectedCount)||d.selectedCount<0||d.selectedCount>20||!hex(d.selectionSha256)||!equal(Object.keys(d).sort(),['original','selectedCount','selectionSha256'].sort()))fail('SELECTION_SEAL_INVALID');
   selection=clone(d);
  }else if(e.type==='RESERVE'){
   if(active!==null||!kinds.includes(d.kind)||d.ordinal!==requests.length+1||d.ordinal>header.limits.total||!hex(d.subjectSha256)||seen.has(d.kind+':'+d.subjectSha256))fail('RESERVATION_INTEGRITY');
   if(d.kind!==kinds[requests.length]||requests.some(r=>r.state==='FAILED')||d.kind!=='CATALOG'&&!selection||d.kind==='ID_RATES'&&selection.selectedCount===0)fail('REQUEST_SEQUENCE');
   if(++counts[d.kind]>header.limits[d.kind])fail('CAP_EXCEEDED');
   if(!equal(Object.keys(d).sort(),['kind','ordinal','request','subjectSha256'].sort()))fail('RESERVATION_FIELDS');
   seen.add(d.kind+':'+d.subjectSha256);requests.push({...d,state:'RESERVED',reservedAt:e.at});active=d.ordinal;
  }else if(e.type==='COMPLETE'){
   if(d.ordinal!==active||!['SUCCEEDED','FAILED'].includes(d.state)||!(d.statusCode===null||Number.isInteger(d.statusCode)&&d.statusCode>=100&&d.statusCode<=599)||
    !(d.errorClass===null||typeof d.errorClass==='string'&&/^[A-Z][A-Z0-9_]{0,99}$/.test(d.errorClass)))fail('COMPLETION_INTEGRITY');
   if(!equal(Object.keys(d).sort(),['ordinal','state','response','statusCode','errorClass'].sort()))fail('COMPLETION_FIELDS');
   Object.assign(requests[active-1],d,{completedAt:e.at});active=null;
  }else if(e.type==='FINISH'){
   if(d.status==='COMPLETED'&&(!selection||requests.length!==(selection.selectedCount?3:2)||requests.some(r=>r.state!=='SUCCEEDED')))fail('INCOMPLETE_CANNOT_FINISH');
   if(active!==null||!['COMPLETED','ABORTED'].includes(d.status)||!equal(Object.keys(d),['status']))fail('FINISH_INVALID');terminal=d.status;
  }else fail('EVENT_TYPE_INVALID');
 }
 if(!events.length||events[0].type!=='START')fail('START_EVENT_MISSING');
 return {attemptsReserved:requests.length,counts,requests,selection,activeOrdinal:active,status:terminal??'INCOMPLETE_ONE_SHOT',
  restartAllowed:false,authorizationConsumed:true,syntheticProofOnly:header.binding.mode==='SYNTHETIC_ONLY'};
}
function verifyWithKey(input,context){
 const {pths,header,key}=context;safePath(pths.root,{directory:true});
 if(!equal(readJson(join(pths.root,'header.json')),header))fail('HEADER_CHANGED');
 if(hash(readFileSync(safePath(join(pths.root,'journal-key.json'))))!==context.keyFileSha256)fail('KEY_FILE_CHANGED');
 if(!equal(readJson(pths.caseMarker),header.binding)||!equal(readJson(pths.authorizationMarker),header.binding))fail('AUTHORIZATION_MARKER_MISMATCH');
 const eventRoot=join(pths.root,'events'),names=readdirSync(safePath(eventRoot,{directory:true})).sort(),events=[];let prior=null,lastAt=header.startedAt;
 const journalKey=subkey(key,'journal-mac');try{
  for(let i=0;i<names.length;i++){
   if(names[i]!==String(i+1).padStart(6,'0')+'.json')fail('EVENT_SEQUENCE_OR_TEMPORARY_FILE');
   const e=readJson(join(eventRoot,names[i])),{eventSha256,eventMac,...value}=e;
   if(!equal(Object.keys(value).sort(),['sequence','priorSha256','type','at','data'].sort())||value.sequence!==i+1||value.priorSha256!==prior||
    !utc(value.at)||Date.parse(value.at)<Date.parse(lastAt)||eventSha256!==hashCoverageJournalValue(value)||!hex(eventMac)||
    !timingSafeEqual(Buffer.from(eventMac,'hex'),Buffer.from(mac(journalKey,{...value,eventSha256}),'hex')))fail('EVENT_INTEGRITY');
   prior=eventSha256;lastAt=value.at;events.push(e);
  }
 }finally{journalKey.fill(0);}
 const summary=validateSummary(events,header),files=new Set();
 for(const r of [...(summary.selection?[{ordinal:0,selection:summary.selection.original}]:[]),...summary.requests])for(const direction of (r.ordinal===0?['selection']:['request','response'])){
  const ref=r[direction];if(!ref){if(direction==='request')fail('ORIGINAL_MISSING');continue;}
  if(!plain(ref)||!equal(Object.keys(ref).sort(),['file','fileSha256','rawSha256','byteLength'].sort())||
   ref.file!==String(r.ordinal).padStart(3,'0')+'-'+direction+'.aesgcm'||!hex(ref.fileSha256)||!hex(ref.rawSha256)||!Number.isInteger(ref.byteLength)||ref.byteLength<0)fail('ORIGINAL_REFERENCE_INVALID');
  const originalPath=join(pths.root,'encrypted',ref.file);safePath(originalPath);
  if(hash(readFileSync(originalPath))!==ref.fileSha256)fail('ORIGINAL_FILE_INTEGRITY');files.add(ref.file);
 }
 if(!equal(readdirSync(safePath(join(pths.root,'encrypted'),{directory:true})).sort(),[...files].sort()))fail('UNCOMMITTED_ORIGINAL_OR_TEMPORARY_FILE');
 const rootNames=readdirSync(pths.root).sort(),expected=['header.json','journal-key.json','events','encrypted'];
 const lock=join(pths.root,'.lock');if(existsSync(lock)){safePath(lock);expected.push('.lock');}
 if(!equal(rootNames,expected.sort()))fail('UNEXPECTED_CASE_FILE');
 if(summary.status==='INCOMPLETE_ONE_SHOT'&&!existsSync(lock))fail('INCOMPLETE_LOCK_MISSING');
 return {version:LITEAPI_COVERAGE_JOURNAL_VERSION,binding:clone(header.binding),startedAt:header.startedAt,
  context:clone(header.context),keyProtection:context.protectionClass??null,lastEventSha256:prior,eventCount:events.length,events,...summary,lockPresent:existsSync(lock)};
}

/** Read-only integrity verification; does not create/open an acquisition store. */
export function verifyCoverageJournal(input){const p=protectorFor(input),context=keyAndHeader(input,p);
 try{return verifyWithKey(input,{...context,protectionClass:p.protectionClass});}finally{context.key.fill(0);}}

function bytes(v){if(typeof v!=='string'&&!(v instanceof Uint8Array))fail('ORIGINAL_BYTES_REQUIRED');return Buffer.from(v);}
function scanRequest(v){if(Array.isArray(v))return v.forEach(scanRequest);if(!plain(v))return;
 for(const [k,value] of Object.entries(v)){if(/^(?:authorization|x-api-key|api_key|apiKey|password|cookie|credentials?|secret)$/i.test(k))fail('CREDENTIAL_IN_REQUEST');scanRequest(value);}}

/** Creates one genuinely new case. Failure/crash never refunds its one-shot
 * authorization. Call reserve synchronously BEFORE starting the transport. */
export function createCoverageJournal(input){
 const pths=paths(input),p=protectorFor(input),now=input.now??(()=>new Date().toISOString());
 if(input.mode==='REAL'&&!plain(input.context))fail('ACQUISITION_CONTEXT_REQUIRED');
 if(input.context!==undefined){if(!plain(input.context))fail('ACQUISITION_CONTEXT_INVALID');scanRequest(input.context);}
 if(existsSync(pths.root))fail('CASE_ALREADY_EXISTS');
 if(existsSync(pths.caseMarker)||existsSync(pths.authorizationMarker))fail('ONE_SHOT_ALREADY_CONSUMED');
 const startedAt=now();if(!utc(startedAt))fail('TIME_INVALID');
 const key=randomBytes(32);let wrappedKey;try{wrappedKey=p.protectDataKey(key.toString('base64'));const probe=checkedKey(p,wrappedKey);
  const ok=timingSafeEqual(probe,key);probe.fill(0);if(!ok)fail('DPAPI_ROUNDTRIP_FAILED');}catch{key.fill(0);fail('KEY_PROTECTION_UNAVAILABLE');}
 let context,poisoned=false,closed=false,lockHash;
 const header={version:LITEAPI_COVERAGE_JOURNAL_VERSION,binding:markerData(input),limits:LITEAPI_COVERAGE_CAPS,startedAt,context:clone(input.context??null)};
 const append=(type,data,previous)=>{
  const at=now();if(!utc(at)||Date.parse(at)<Date.parse(previous?.events?.at(-1)?.at??startedAt))fail('TIME_INVALID');
  const value={sequence:(previous?.eventCount??0)+1,priorSha256:previous?.lastEventSha256??null,type,at,data};
  const eventSha256=hashCoverageJournalValue(value),journalKey=subkey(key,'journal-mac');
  try{writeJson(join(pths.root,'events',String(value.sequence).padStart(6,'0')+'.json'),{...value,eventSha256,eventMac:mac(journalKey,{...value,eventSha256})});}
  finally{journalKey.fill(0);}
 };
 try{
  mkdirSync(pths.registryRoot,{recursive:true});safePath(pths.registryRoot,{directory:true});
  mkdirSync(pths.registry,{recursive:true});safePath(pths.registry,{directory:true});
  writeJson(pths.authorizationMarker,header.binding);writeJson(pths.caseMarker,header.binding);
  mkdirSync(join(pths.registryRoot,'cases'),{recursive:true});safePath(join(pths.registryRoot,'cases'),{directory:true});
  mkdirSync(pths.root);mkdirSync(join(pths.root,'events'));mkdirSync(join(pths.root,'encrypted'));
  const lock={caseId:input.caseId,ownerToken:randomBytes(32).toString('hex')};writeJson(join(pths.root,'.lock'),lock);lockHash=hash(readFileSync(join(pths.root,'.lock')));
  writeJson(join(pths.root,'header.json'),header);
  writeJson(join(pths.root,'journal-key.json'),{protectionClass:p.protectionClass,wrappedKey,headerSha256:hashCoverageJournalValue(header)});
  append('START',{headerSha256:hashCoverageJournalValue(header)},null);
  context={pths,header,key,protectionClass:p.protectionClass,keyFileSha256:hash(readFileSync(join(pths.root,'journal-key.json')))};
 }catch(e){key.fill(0);throw e;}
 const current=()=>{if(closed)fail('JOURNAL_CLOSED');if(poisoned)fail('JOURNAL_POISONED');
  const snapshot=verifyWithKey(input,context),lock=join(pths.root,'.lock');
  if(!existsSync(lock)||hash(readFileSync(lock))!==lockHash)fail('LOCK_OWNERSHIP_CHANGED');return snapshot;};
 const persistOriginal=(ordinal,direction,value)=>{
  const raw=bytes(value),file=String(ordinal).padStart(3,'0')+'-'+direction+'.aesgcm';
  const metadata={version:LITEAPI_COVERAGE_JOURNAL_VERSION,caseId:input.caseId,bindingSha256:input.bindingSha256,authorizationSha256:input.authorizationSha256,
   ordinal,direction,rawSha256:hash(raw),byteLength:raw.length,at:now(),mode:input.mode,keyProtection:p.protectionClass};
  if(!utc(metadata.at)){raw.fill(0);fail('TIME_INVALID');}
  const encryptionKey=subkey(key,'original-aes-256-gcm'),iv=randomBytes(12);
  try{const cipher=createCipheriv('aes-256-gcm',encryptionKey,iv);cipher.setAAD(Buffer.from(json(metadata)));
   const encrypted=Buffer.concat([cipher.update(raw),cipher.final()]),envelope={metadata,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')};
   const serialized=Buffer.from(json(envelope)+'\n');durableExclusive(join(pths.root,'encrypted',file),serialized);
   return {file,fileSha256:hash(serialized),rawSha256:metadata.rawSha256,byteLength:metadata.byteLength};
  }finally{raw.fill(0);encryptionKey.fill(0);}
 };
 return Object.freeze({root:pths.root,mode:input.mode,
  sealSelection(selection){
   const s=current();if(s.selection||s.activeOrdinal!==null||s.requests.length!==1||s.requests[0].state!=='SUCCEEDED'||!Array.isArray(selection?.selectedIds)||selection.selectedIds.length>20)fail('SELECTION_SEAL_INVALID');
   try{const original=persistOriginal(0,'selection',Buffer.from(json(selection)));
    append('SEAL',{original,selectedCount:selection.selectedIds.length,selectionSha256:hashCoverageJournalValue(selection)},s);return current().selection;
   }catch(e){poisoned=true;throw e;}
  },
  reserve({kind,hotelId=null,offerId=null,requestBytes,checkpointSha256}){
   const s=current();if(checkpointSha256!==input.bindingSha256)fail('CHECKPOINT_MISMATCH');
   if(!kinds.includes(kind))fail('KIND_NOT_ALLOWED');if(s.activeOrdinal!==null)fail('CONCURRENCY_PROHIBITED');
   if(s.attemptsReserved>=header.limits.total||s.counts[kind]>=header.limits[kind])fail('CAP_EXCEEDED');
   if(hotelId!==null||offerId!==null)fail('FOREIGN_SUBJECT');
   if(kind!==kinds[s.attemptsReserved]||s.requests.some(r=>r.state==='FAILED')||kind!=='CATALOG'&&!s.selection||kind==='ID_RATES'&&s.selection.selectedCount===0)fail('REQUEST_SEQUENCE');
   if(offerId!==null&&(typeof offerId!=='string'||!offerId.length))fail('OFFER_INVALID');
   const subjectSha256=hashCoverageJournalValue(null);
   if(s.requests.some(r=>r.kind===kind&&r.subjectSha256===subjectSha256))fail('DUPLICATE_REQUEST');
   const raw=bytes(requestBytes);try{let parsed;try{parsed=JSON.parse(raw.toString('utf8'));}catch{fail('REQUEST_JSON_REQUIRED');}scanRequest(parsed);}finally{raw.fill(0);}
   try{const ordinal=s.attemptsReserved+1,request=persistOriginal(ordinal,'request',requestBytes);append('RESERVE',{ordinal,kind,subjectSha256,request},s);return {ordinal};}
   catch(e){poisoned=true;throw e;}
  },
  complete({ordinal,state,responseBytes=null,statusCode=null,errorClass=null}){
   const s=current();if(s.activeOrdinal!==ordinal||!['SUCCEEDED','FAILED'].includes(state))fail('COMPLETION_INVALID');
   if(state==='SUCCEEDED'&&(responseBytes===null||!Number.isInteger(statusCode)))fail('SUCCESS_RESPONSE_REQUIRED');
   if(!(statusCode===null||Number.isInteger(statusCode)&&statusCode>=100&&statusCode<=599)||!(errorClass===null||typeof errorClass==='string'&&/^[A-Z][A-Z0-9_]{0,99}$/.test(errorClass)))fail('COMPLETION_INVALID');
   try{const response=responseBytes===null?null:persistOriginal(ordinal,'response',responseBytes);append('COMPLETE',{ordinal,state,response,statusCode,errorClass},s);return verifyWithKey(input,context);}
   catch(e){poisoned=true;throw e;}
  },
  snapshot(){return current();},
  finish({status}){
   let s=current();if(!['COMPLETED','ABORTED'].includes(status))fail('FINISH_INVALID');
   if(s.activeOrdinal!==null&&status!=='ABORTED')fail('ACTIVE_REQUEST_REMAINS');
   try{if(s.activeOrdinal!==null){append('COMPLETE',{ordinal:s.activeOrdinal,state:'FAILED',response:null,statusCode:null,errorClass:'INTERRUPTED_NO_RESPONSE'},s);s=verifyWithKey(input,context);}
    append('FINISH',{status},s);const result=verifyWithKey(input,context);safePath(join(pths.root,'.lock'));
    if(hash(readFileSync(join(pths.root,'.lock')))!==lockHash)fail('LOCK_OWNERSHIP_CHANGED');unlinkSync(join(pths.root,'.lock'));closed=true;key.fill(0);return {...result,lockPresent:false};
   }catch(e){poisoned=true;throw e;}
  },
 });
}

/** Explicit offline byte reopening; never called by a preflight or constructor. */
export function decryptCoverageOriginal(input){const p=protectorFor(input),context=keyAndHeader(input,p);
 try{const s=verifyWithKey(input,context),r=s.requests.find(r=>r.ordinal===input.ordinal),ref=input.ordinal===0&&input.direction==='selection'?s.selection?.original:r?.[input.direction];
  if(!['request','response','selection'].includes(input.direction)||!ref)fail('ORIGINAL_NOT_FOUND');
  const envelope=readJson(join(context.pths.root,'encrypted',ref.file)),m=envelope.metadata;
  if(m.caseId!==input.caseId||m.bindingSha256!==input.bindingSha256||m.authorizationSha256!==input.authorizationSha256||m.ordinal!==input.ordinal||m.direction!==input.direction||
   m.rawSha256!==ref.rawSha256||m.byteLength!==ref.byteLength||m.mode!==input.mode||m.keyProtection!==p.protectionClass)fail('ENVELOPE_BINDING');
  const encryptionKey=subkey(context.key,'original-aes-256-gcm');try{
   const decipher=createDecipheriv('aes-256-gcm',encryptionKey,Buffer.from(envelope.iv,'base64'));decipher.setAAD(Buffer.from(json(m)));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
   const raw=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);
   if(hash(raw)!==ref.rawSha256||raw.length!==ref.byteLength){raw.fill(0);fail('RAW_INTEGRITY');}return raw;
  }catch{fail('RAW_AUTHENTICATION_FAILED');}finally{encryptionKey.fill(0);}
 }finally{context.key.fill(0);}}
