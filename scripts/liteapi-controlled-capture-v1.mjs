import http from 'node:http';
import https from 'node:https';
import {canonical,sha,hash,same,fail,LIMITS,intent,validateIntent,validatePlan,verifyAcquisitionInventory,authorizationLiteral} from './liteapi-controlled-plan-v1.mjs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectDocumentaryLiteApiOffers,getDocumentaryPrebookId} from './liteapi-documentary-wire-v1.mjs';
import {createAcquisitionJournal,verifyAcquisitionJournal,decryptAcquisitionOriginal} from './liteapi-acquisition-journal-v1.mjs';
export const CAPTURE_VERSION='stayopti.liteapi-controlled-capture@1';
const clone=x=>structuredClone(x);
const pack=b=>({base64:Buffer.from(b).toString('base64'),sha256:sha(b),byteLength:Buffer.byteLength(b)});
const recordHash=r=>{const {recordSha256,...v}=r;return hash(v);};
const captureHash=c=>{const {captureSha256,...v}=c;return hash(v);};
const utc=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))&&t.endsWith('Z');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// An origin string and recomputed hashes are not an acquisition receipt. Real
// captures enter through this transport or authenticated read-only journal load.
const authenticatedProduction=new WeakMap();
export function verifyControlledCapture(capture,{config,checkpoint}){
 const synthetic=capture?.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(!synthetic&&authenticatedProduction.get(capture)!==capture?.captureSha256)fail('AUTHENTICATED_PRODUCTION_CAPTURE_REQUIRED');
 if(capture?.version!==CAPTURE_VERSION||capture.origin!==config.origin||!same(capture.config,config)||!same(capture.checkpoint,checkpoint)||
  capture.bindingSha256!==hash({config,checkpoint})||captureHash(capture)!==capture.captureSha256||!['COMPLETE','ABORTED'].includes(capture.status))fail('CAPTURE_BINDING_OR_HASH');
 const plan=validatePlan(config,{synthetic});if(plan.pending.length)fail('CAPTURE_UNAPPROVED_CONFIG');
 if(!utc(capture.sealedAt)||!Array.isArray(capture.requests)||capture.requests.length>17)fail('CAPTURE_SCHEMA');
 let previous=capture.bindingSha256,last=capture.sealedAt,selection=null;const seen=new Set(),counts={};
 for(const r of capture.requests){
  if(r.ordinal!==seen.size+1||r.previousSha256!==previous||recordHash(r)!==r.recordSha256||!utc(r.startedAt)||!utc(r.completedAt)||
   Date.parse(r.startedAt)<Date.parse(last)||Date.parse(r.completedAt)<Date.parse(r.startedAt))fail('CAPTURE_CHAIN_OR_TIME');
  if(r.intent.kind!=='SEARCH'&&!selection)selection=selectDocumentaryLiteApiOffers(capture.requests[0],config.selection,config.scenario);
  validateIntent(r.intent,config,selection,capture.requests.slice(0,r.ordinal-1));
  const key=canonical([r.intent.kind,r.intent.hotelId]);if(seen.has(key)||((counts[r.intent.kind]=(counts[r.intent.kind]??0)+1)>LIMITS[r.intent.kind]))fail('CAPTURE_DUPLICATE_OR_CAP');seen.add(key);
  for(const saved of [r.response,r.partialResponse].filter(Boolean)){const b=saved.body,bytes=Buffer.from(b.base64,'base64');if(sha(bytes)!==b.sha256||bytes.length!==b.byteLength)fail('CAPTURE_RESPONSE_HASH');}
  if(r.response){
   if(r.outcome==='SUCCEEDED'&&(r.response.status<200||r.response.status>=300))fail('CAPTURE_HTTP_STATE');
  }else if(r.outcome!=='FAILED')fail('CAPTURE_MISSING_RESPONSE');
  if(!['SUCCEEDED','FAILED'].includes(r.outcome))fail('CAPTURE_STATE');
  if(r.returnedPrebookId!==(r.intent.kind==='PREBOOK'?getDocumentaryPrebookId(r):null))fail('CAPTURE_PREBOOK_RETURN');
  if(r.ordinal<capture.requests.length&&(r.response&&([401,403].includes(r.response.status)||r.response.status>=300&&r.response.status<400)||r.intent.kind==='SEARCH'&&r.outcome==='FAILED'))fail('CAPTURE_AFTER_TERMINAL_ERROR');
  previous=r.recordSha256;last=r.completedAt;
 }
 if(capture.selection){const expected=selectDocumentaryLiteApiOffers(capture.requests[0],config.selection,config.scenario);if(!same(expected,capture.selection))fail('CAPTURE_SELECTION');}
 return {valid:true,capture:clone(capture),syntheticProofOnly:synthetic,engineInvocations:0,policyInvocations:0};
}

/** Explicit future read-only preparation boundary. It authenticates all journal
 * files with CurrentUser DPAPI/HMAC before opening encrypted original records.
 * Never called by Preflight; never resumes transport or invokes the engine. */
export function readAuthenticatedAcquisitionCapture(journalInput,{config,checkpoint}){
 const j=verifyAcquisitionJournal(journalInput);
 if(!['COMPLETED','ABORTED'].includes(j.status)||!same(j.context?.config,config)||!same(j.context?.checkpoint,checkpoint))fail('AUTHENTICATED_CONTEXT_MISMATCH');
 const requests=j.requests.map(r=>{if(!r.response)fail('INTERRUPTED_RECORD_NOT_PREPARABLE');
  const bytes=decryptAcquisitionOriginal({...journalInput,ordinal:r.ordinal,direction:'response'});
  try{return JSON.parse(bytes.toString('utf8'));}finally{bytes.fill(0);}});
 const capture={version:CAPTURE_VERSION,origin:config.origin,config:clone(config),checkpoint:clone(checkpoint),bindingSha256:hash({config,checkpoint}),
  sealedAt:j.startedAt,selection:null,requests,status:j.status==='COMPLETED'?'COMPLETE':'ABORTED'};
 try{capture.selection=selectDocumentaryLiteApiOffers(requests[0],config.selection,config.scenario);}catch{if(capture.status==='COMPLETE')fail('SELECTION_NOT_RECONSTRUCTIBLE');}
 capture.captureSha256=captureHash(capture);
 if(config.origin==='LITEAPI_PRODUCTION'){
  if(journalInput.mode!=='REAL'||j.binding.mode!=='REAL')fail('SYNTHETIC_JOURNAL_CANNOT_CERTIFY_PRODUCTION');authenticatedProduction.set(capture,capture.captureSha256);
 }
 verifyControlledCapture(capture,{config,checkpoint});return capture;
}

/** Node's raw request API never follows redirects or retries. The only test
 * destination is a server created by this process on IPv4 loopback. No proxy,
 * arbitrary URL, caller headers, agent or transport callback is accepted live. */
function sendHttp(request,{credential,loopbackPort,timeoutMs,signal}){
 return new Promise((resolve,reject)=>{
  let received=null;const chunks=[];
  const rejectWithPartial=error=>{if(received)error.partialResponse={...received,bodyBytes:Buffer.concat(chunks)};reject(error);};
  const synthetic=Number.isInteger(loopbackPort),query=new URLSearchParams(request.query).toString();
  const bytes=request.body===null?null:Buffer.from(canonical(request.body));
  const headers={'accept':'application/json',...(bytes?{'content-type':'application/json','content-length':bytes.length}:{})};
  if(!synthetic)headers['X-API-Key']=credential;
  const req=(synthetic?http:https).request({hostname:synthetic?'127.0.0.1':request.host,port:synthetic?loopbackPort:443,
   method:request.method,path:request.path+(query?'?'+query:''),headers,agent:false,rejectUnauthorized:true},res=>{
   received={status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).filter(([k])=>['content-type','date'].includes(k)))};
   let n=0;res.on('data',b=>{chunks.push(b);n+=b.length;if(n>32*1024*1024){req.destroy(Object.assign(Error('RESPONSE_TOO_LARGE'),{code:'RESPONSE_TOO_LARGE'}));return;}});
   res.on('end',()=>resolve({status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).filter(([k])=>['content-type','date'].includes(k))),bodyBytes:Buffer.concat(chunks)}));
   res.on('error',rejectWithPartial);
  });
  const timer=setTimeout(()=>req.destroy(Object.assign(Error('TIMEOUT'),{code:'ETIMEDOUT'})),timeoutMs);
  const abort=()=>req.destroy(Object.assign(Error('INTERRUPTED'),{code:'ABORTED'}));signal?.addEventListener('abort',abort,{once:true});
  req.on('error',rejectWithPartial);req.on('close',()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);});
  if(bytes)req.write(bytes);req.end();
 });
}
export async function runControlledAcquisition({config,checkpoint,journal,credential=null,simulation=null,verifyBeforeSend,signal,liveApproval=null}){
 const synthetic=config.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(synthetic!==Boolean(simulation)||!synthetic&&(typeof credential!=='string'||!credential.trim()))fail('TRANSPORT_OR_CREDENTIAL_ORIGIN');
 if(validatePlan(config,{synthetic}).pending.length)fail('PENDING_CONFIGURATION');
 if(!synthetic){
  // Production cannot inject a journal, checkpoint verifier or transport. This
  // gate is enforced here too, not only in the outer PowerShell/CLI wrapper.
  if(journal||verifyBeforeSend||!liveApproval)fail('PRODUCTION_DEPENDENCY_INJECTION_PROHIBITED');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),inventory=liveApproval.inventory;
  verifyBeforeSend=()=>{
   const cp=verifyAcquisitionInventory(root,inventory,checkpoint.head,checkpoint.branch);
   if(cp.codeSha256!==checkpoint.inventorySha256||liveApproval.authorization!==authorizationLiteral(config,inventory))fail('PRODUCTION_AUTHORIZATION_MISMATCH');
  };
  verifyBeforeSend();
  journal=createAcquisitionJournal({root:join(config.retention.directory,'cases',config.caseId),registryRoot:config.retention.directory,repositoryRoot:root,
   caseId:config.caseId,mode:'REAL',bindingSha256:hash({config,checkpoint}),authorizationSha256:hash(liveApproval.authorization),
   context:{config:clone(config),checkpoint:clone(checkpoint),inventory:clone(inventory),configFileSha256:liveApproval.configFileSha256}});
 }
 let server=null,port=null,stubInvocations=0;
 if(synthetic){
  if(simulation.origin!=='SYNTHETIC_ONLY'||!Array.isArray(simulation.responses))fail('SIMULATION_REQUIRED');
  server=http.createServer((req,res)=>{const chunks=[];req.on('data',b=>chunks.push(b));req.on('end',()=>{
   const row=simulation.responses[stubInvocations++];
   if(!row||row.method!==req.method||row.path!==req.url){res.writeHead(422,{'content-type':'application/json'});res.end('{"error":"SIMULATION_REQUEST_MISMATCH"}');return;}
   if(row.body!==undefined&&!same(row.body,JSON.parse(Buffer.concat(chunks).toString('utf8')))){res.writeHead(422);res.end();return;}
   if(row.timeout)return;
   if(typeof row.partialBytes==='string'){res.writeHead(row.status??200,{'content-type':'application/json'});res.write(row.partialBytes);setTimeout(()=>res.destroy(),50);return;}
   res.writeHead(row.status??200,{'content-type':row.contentType??'application/json',...(row.status>=300&&row.status<400?{location:'https://example.invalid/never-followed'}:{})});
   res.end(typeof row.bytes==='string'?row.bytes:JSON.stringify(row.response));
  });});
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});port=server.address().port;
 }
 const c={version:CAPTURE_VERSION,origin:config.origin,config:clone(config),checkpoint:clone(checkpoint),bindingSha256:hash({config,checkpoint}),
  sealedAt:journal.snapshot().startedAt,selection:null,requests:[],status:'COMPLETE'};
 let stopped=false,lastStart=0;
 const send=async request=>{
  if(stopped||signal?.aborted)fail('ATTEMPT_INTERRUPTED');
  verifyBeforeSend();validateIntent(request,config,c.selection,c.requests);
  await wait(Math.max(0,config.pacingMs-(Date.now()-lastStart)));if(signal?.aborted)fail('ATTEMPT_INTERRUPTED');
  verifyBeforeSend();
  const reserved=journal.reserve({kind:request.kind,hotelId:request.hotelId,offerId:request.offerId,requestBytes:Buffer.from(canonical(request)),checkpointSha256:c.bindingSha256});
  const ordinal=reserved.ordinal??reserved;
  const r={ordinal,intent:clone(request),startedAt:new Date().toISOString(),completedAt:null,outcome:'FAILED',failureClass:null,response:null,returnedPrebookId:null,
   previousSha256:c.requests.at(-1)?.recordSha256??c.bindingSha256};lastStart=Date.now();
  try{
   const raw=await sendHttp(request,{credential,loopbackPort:port,timeoutMs:config.timeoutMs[request.kind],signal});
   if(!synthetic&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential))){
    // Do not persist an echoed credential, even encrypted. Preserve only its
    // byte digest and explicitly report that this original is NOT retained.
    r.withheldOriginal={sha256:sha(raw.bodyBytes),byteLength:raw.bodyBytes.length,reason:'CREDENTIAL_ECHO_RESPONSE_NOT_PERSISTED'};
    raw.bodyBytes.fill(0);r.failureClass='CREDENTIAL_ECHO_RESPONSE_NOT_PERSISTED';stopped=true;
    throw Object.assign(Error('CREDENTIAL_ECHO'),{code:'CREDENTIAL_ECHO'});
   }
   r.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};
   r.outcome=raw.status>=200&&raw.status<300?'SUCCEEDED':'FAILED';
   if(r.outcome==='FAILED')r.failureClass='HTTP_'+raw.status;
   if(raw.status>=300&&raw.status<400){r.failureClass='REDIRECT_REFUSED';stopped=true;}
   if([401,403].includes(raw.status)||request.kind==='SEARCH'&&r.outcome==='FAILED')stopped=true;
   // Semantic errors remain source evidence. They can never authorize a GET.
   if(request.kind==='PREBOOK')r.returnedPrebookId=getDocumentaryPrebookId(r);
  }catch(error){r.failureClass=error.code==='CREDENTIAL_ECHO'?'CREDENTIAL_ECHO_RESPONSE_NOT_PERSISTED':error.code==='RESPONSE_TOO_LARGE'?'RESPONSE_TOO_LARGE':error.code==='ETIMEDOUT'?'TIMEOUT':error.code==='ABORTED'?'INTERRUPTED':'TRANSPORT_FAILED';
   if(error.partialResponse){const raw=error.partialResponse;
    if(!synthetic&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential))){r.withheldOriginal={sha256:sha(raw.bodyBytes),byteLength:raw.bodyBytes.length,reason:'PARTIAL_CREDENTIAL_ECHO_NOT_PERSISTED'};raw.bodyBytes.fill(0);stopped=true;}
    else r.partialResponse={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes),complete:false};
   }
   if(request.kind==='SEARCH'||r.failureClass==='INTERRUPTED')stopped=true;
  }
  r.completedAt=new Date().toISOString();r.recordSha256=recordHash(r);c.requests.push(r);
  journal.complete({ordinal,state:r.outcome,statusCode:r.response?.status??null,errorClass:r.failureClass,
   responseBytes:Buffer.from(canonical(r))});
  return r;
 };
 try{
  await send(intent('SEARCH',{config}));
  if(!stopped){try{c.selection=selectDocumentaryLiteApiOffers(c.requests[0],config.selection,config.scenario);}catch{stopped=true;}}
  if(!stopped)for(const s of c.selection.selected){await send(intent('HOTEL_DETAIL',{hotelId:s.hotelId,config}));if(stopped)break;}
  if(!stopped&&c.selection.selected.length)await send(intent('FACILITIES',{config}));
  if(!stopped)for(const s of c.selection.selected){if(!s.offerId)continue;
   const r=await send(intent('PREBOOK',{...s,config}));if(stopped)break;
   if(r.returnedPrebookId)await send(intent('PREBOOK_GET',{...s,prebookId:r.returnedPrebookId,config}));if(stopped)break;
  }
 }catch{stopped=true;}finally{
  credential=null;
  if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
 }
 c.status=stopped?'ABORTED':'COMPLETE';c.captureSha256=captureHash(c);
 journal.finish({status:c.status==='COMPLETE'?'COMPLETED':'ABORTED'});
 if(!synthetic)authenticatedProduction.set(c,c.captureSha256);
 return {capture:c,actualAttempts:c.requests.length,localHttpRequests:stubInvocations,providerHttpRequests:synthetic?0:c.requests.length,
  engineInvocations:0,policyInvocations:0,prebookCreationsAttempted:c.requests.filter(r=>r.intent.kind==='PREBOOK').length,
  // A transmitted creation without a usable returned session ID is not proof
  // of no remote effect: timeout, reset, partial response and abort can follow
  // creation. Even semantic/HTTP rejection is not treated as a rollback receipt.
  remotePrebookEffectUncertain:c.requests.some(r=>r.intent.kind==='PREBOOK'&&!r.returnedPrebookId)};
}
