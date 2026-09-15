// D-0064 transport uses the D0062 raw Node HTTPS mechanism, version-isolated.
// No import of acquisition MAX17, preparation/engine or public runtime.
import http from 'node:http';
import https from 'node:https';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonical,sha,hash,same,fail,validateCoveragePlan,coverageRequest,validateCoverageRequest,verifyCoverageInventory,coverageAuthorization} from './liteapi-search-coverage-plan-v1.mjs';
import {selectCoverageCatalog,inspectCoverageRates,semanticErrors,coverageComparison} from './liteapi-search-coverage-diagnostics-v1.mjs';
import {createCoverageJournal,verifyCoverageJournal,decryptCoverageOriginal} from './liteapi-search-coverage-journal-v1.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const pack=b=>({base64:Buffer.from(b).toString('base64'),sha256:sha(b),byteLength:b.length});
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

export async function runCoverageAcquisition({config,checkpoint,journal,credential=null,simulation=null,verifyBeforeSend,signal,liveApproval=null}){
 const synthetic=config?.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(validateCoveragePlan(config,{synthetic}).pending.length)fail('CONFIGURATION_PENDING');
 if(synthetic!==Boolean(simulation)||!synthetic&&(typeof credential!=='string'||!credential.trim()))fail('TRANSPORT_OR_CREDENTIAL_ORIGIN');
 const bindingSha256=hash({config,checkpoint});
 if(!synthetic){
  if(journal||verifyBeforeSend||!liveApproval)fail('PRODUCTION_INJECTION_PROHIBITED');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),inventory=liveApproval.inventory;
  verifyBeforeSend=()=>{
   const cp=verifyCoverageInventory(root,inventory,checkpoint.head,checkpoint.branch);
   if(cp.codeSha256!==checkpoint.inventorySha256||liveApproval.authorization!==coverageAuthorization(config,inventory)||hash({config,checkpoint})!==bindingSha256)fail('PRODUCTION_BINDING_CHANGED');
  };
  verifyBeforeSend();
  journal=createCoverageJournal({root:join(config.retention.directory,'cases',config.caseId),registryRoot:config.retention.directory,repositoryRoot:root,caseId:config.caseId,
   mode:'REAL',bindingSha256,authorizationSha256:hash(liveApproval.authorization),context:{config:structuredClone(config),checkpoint:structuredClone(checkpoint),inventory:structuredClone(inventory),configFileSha256:liveApproval.configFileSha256}});
 }
 if(typeof verifyBeforeSend!=='function'||!journal)fail('VERIFIED_JOURNAL_REQUIRED');
 let server=null,port=null,localHttpRequests=0,transportInvocations=0,lastStart=0,selection=null,selectionHash=null,stopped=false,failureClass=null;
 const records=[],arms={},timings={};
 if(synthetic){
  if(simulation.origin!=='SYNTHETIC_ONLY'||!Array.isArray(simulation.responses))fail('SIMULATION_REQUIRED');
  server=http.createServer((req,res)=>{
   const chunks=[];req.on('data',b=>chunks.push(b));req.on('end',()=>{
    const row=simulation.responses[localHttpRequests++];
    let body=null;try{body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):null;}catch{}
    if(!row||row.method!==req.method||row.path!==req.url||row.body!==undefined&&!same(row.body,body)){res.writeHead(422);res.end('{"error":"SYNTHETIC_REQUEST_MISMATCH"}');return;}
    if(row.timeout)return;
    if(row.reset){req.socket.destroy();return;}
    res.writeHead(row.status??200,{'content-type':row.contentType??'application/json',...(row.status>=300&&row.status<400?{location:'https://example.invalid/never-follow'}:{})});
    res.end(typeof row.bytes==='string'?row.bytes:row.status===204?'':JSON.stringify(row.response));
   });
  });
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});port=server.address().port;
 }
 const send=async request=>{
  if(stopped||signal?.aborted)fail('INTERRUPTED');
  verifyBeforeSend();if(hash({config,checkpoint})!==bindingSha256)fail('CONFIG_CHANGED');
  validateCoverageRequest(request,selection,config);
  if(request.kind!=='CATALOG'&&(hash(selection)!==selectionHash||journal.snapshot().selection?.selectionSha256!==selectionHash))fail('SELECTION_CHANGED');
  await wait(Math.max(0,config.controls.pacingMs-(Date.now()-lastStart)));
  if(signal?.aborted)fail('INTERRUPTED');verifyBeforeSend();
  const {ordinal}=journal.reserve({kind:request.kind,requestBytes:Buffer.from(canonical(request)),checkpointSha256:bindingSha256});
  const r={ordinal,kind:request.kind,startedAt:new Date().toISOString(),completedAt:null,outcome:'FAILED',failureClass:null,response:null};
  let diagnostic=null,raw;
  lastStart=Date.now();
  try{
   transportInvocations++;
   raw=await sendHttp(request,{credential,loopbackPort:port,timeoutMs:config.controls.clientTimeoutMs,signal});
   if(!synthetic&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential))){
    r.withheldOriginal={sha256:sha(raw.bodyBytes),byteLength:raw.bodyBytes.length,reason:'CREDENTIAL_ECHO_WITHHELD'};raw.bodyBytes.fill(0);fail('CREDENTIAL_ECHO_WITHHELD');
   }
   r.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};
   if(raw.status>=300&&raw.status<400)fail('REDIRECT_REFUSED');
   if(raw.status!==200&&!(raw.status===204&&request.kind!=='CATALOG'))fail('HTTP_'+raw.status);
   if(raw.status!==204&&!String(raw.headers['content-type']??'').includes('application/json'))fail('CONTENT_TYPE_UNSUPPORTED');
   if(request.kind==='CATALOG')diagnostic=selectCoverageCatalog(raw.bodyBytes,sha(raw.bodyBytes),config);
   else{
    diagnostic=inspectCoverageRates({bytes:raw.bodyBytes,status:raw.status,headers:raw.headers,request,selection});
    arms[request.kind]=diagnostic;
    if(diagnostic.semanticErrors.length)fail('RATES_SEMANTIC_ERROR');
   }
   r.outcome='SUCCEEDED';
  }catch(e){
   r.failureClass=/^LITEAPI_COVERAGE_[A-Z0-9_]+$/.test(e.message)?e.message.slice('LITEAPI_COVERAGE_'.length):e.code==='ETIMEDOUT'?'TIMEOUT':e.code==='ABORTED'?'INTERRUPTED':e.code==='RESPONSE_TOO_LARGE'?'RESPONSE_TOO_LARGE':'TRANSPORT_FAILED';
   if(e.partialResponse){
    const partial=e.partialResponse;
    if(!synthetic&&partial.bodyBytes.includes(Buffer.from(credential)))r.withheldOriginal={sha256:sha(partial.bodyBytes),byteLength:partial.bodyBytes.length,reason:'PARTIAL_CREDENTIAL_ECHO_WITHHELD'};
    else r.partialResponse={status:partial.status,headers:partial.headers,body:pack(partial.bodyBytes),complete:false};
    partial.bodyBytes.fill(0);
   }
   stopped=true;failureClass=r.failureClass;
  }finally{raw?.bodyBytes.fill(0);}
  r.completedAt=new Date().toISOString();
  journal.complete({ordinal,state:r.outcome,statusCode:r.response?.status??null,errorClass:r.failureClass,responseBytes:Buffer.from(canonical(r))});
  records.push(r);timings[request.kind]={startedAt:r.startedAt,completedAt:r.completedAt,elapsedMs:Date.parse(r.completedAt)-Date.parse(r.startedAt)};
  return diagnostic;
 };
 let receipt;
 try{
  const catalog=await send(coverageRequest('CATALOG',null,config));
  if(!stopped){
   selection=catalog;selectionHash=hash(selection);
   journal.sealSelection(selection); // durable, authenticated, encrypted BEFORE CITY_RATES.
   await send(coverageRequest('CITY_RATES',selection,config));
   if(!stopped&&selection.selectedIds.length)await send(coverageRequest('ID_RATES',selection,config));
  }
 }catch(e){stopped=true;failureClass=/^LITEAPI_[A-Z0-9_]+$/.test(e.message)?e.message:'FAIL_CLOSED_INTERNAL';}
 finally{
  credential=null;
  if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  receipt=journal.finish({status:stopped?'ABORTED':'COMPLETED'});
 }
 return {version:'stayopti.liteapi-search-coverage-result@1',status:stopped?'ABORTED':'COMPLETE',failureClass,origin:config.origin,syntheticProofOnly:synthetic,
  actualAttempts:receipt.attemptsReserved,transportInvocations,localHttpRequests,providerHttpRequests:synthetic?0:transportInvocations,counts:receipt.counts,
  custodyStartedAt:receipt.startedAt,retentionEndsAt:new Date(Date.parse(receipt.startedAt)+config.retention.days*86400000).toISOString(),
  selectionSealSha256:selectionHash,selectionEventBeforeRates:Boolean(receipt.selection),
  catalog:selection?{rawRows:selection.rawRows,eligibleUniqueIds:selection.eligibleUniqueIds,selectedCount:selection.selectedIds.length,
   excludedRows:selection.rows.filter(r=>r.reason).length,duplicates:selection.rows.filter(r=>r.duplicate).length,
   rows:selection.rows.map(({id,...r})=>({...r,idFingerprint:typeof id==='string'?hash(id):null})),
   limitation:selection.selectedIds.length===0?'NO_VERIFIED_IDS_CITY_ONLY':selection.selectedIds.length===1?'ONE_ID_LIMITED_DIAGNOSTIC':'FIRST_PAGE_HASH_SAMPLE_NOT_COMPLETE_CITY_INVENTORY'}:null,
  idRatesStatus:selection?.selectedIds.length===0?'SKIPPED_NO_VERIFIED_IDS':records.some(r=>r.kind==='ID_RATES')?'ATTEMPTED':'NOT_STARTED',
  requests:records.map(({response,partialResponse,...r})=>({...r,httpStatus:response?.status??partialResponse?.status??null,responseSha256:response?.body.sha256??partialResponse?.body.sha256??null})),
  arms,timings,comparison:coverageComparison(arms),journalVerified:true,authorizationConsumed:!synthetic,restartAllowed:false,
  engineInvocations:0,policyInvocations:0,prebookCreationsAttempted:0};
}
/** Read-only verification/reconstruction, never an acquisition restart. */
export function readCoverageOriginals(input){
 const journal=verifyCoverageJournal(input),records=journal.requests.map(r=>{
  const request=decryptCoverageOriginal({...input,ordinal:r.ordinal,direction:'request'});let response=null;
  try{if(r.response)response=decryptCoverageOriginal({...input,ordinal:r.ordinal,direction:'response'});
   return {request:JSON.parse(request.toString('utf8')),response:response?JSON.parse(response.toString('utf8')):null};}
  finally{request.fill(0);response?.fill(0);}
 });
 let selection=null;if(journal.selection){const b=decryptCoverageOriginal({...input,ordinal:0,direction:'selection'});try{selection=JSON.parse(b.toString('utf8'));}finally{b.fill(0);}}
 return {journal,records,selection,engineInvocations:0,policyInvocations:0};
}
