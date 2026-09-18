// D-0066. Sequential, one-shot HOTEL_DETAIL acquisition only. No engine imports.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,dirname,join,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sendBoundedAcquisitionHttp} from './bounded-acquisition-http-v1.mjs';
import {canonical,sha,hash,same,fail,assertNoLinks,validateHotelDetailPlan,detailsRequest,validateDetailsRequest,
 verifyHotelDetailInventory,hotelDetailAuthorization} from './liteapi-hotel-detail-plan-v1.mjs';
import {inspectHotelDetailResponse,verifyHotelDetailSourceFiles} from './liteapi-room-detail-comparison-v1.mjs';
import {createHotelDetailsJournal,verifyHotelDetailsJournal,decryptHotelDetailsOriginal} from './liteapi-hotel-details-journal-v1.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const pack=b=>({base64:Buffer.from(b).toString('base64'),sha256:sha(b),byteLength:b.length});
const classify=e=>/^LITEAPI_DETAIL_[A-Z0-9_]+$/.test(e?.message)?e.message.slice('LITEAPI_DETAIL_'.length):
 e?.code==='ETIMEDOUT'?'TIMEOUT':e?.code==='ABORTED'?'INTERRUPTED':e?.code==='RESPONSE_TOO_LARGE'?'RESPONSE_TOO_LARGE':'FAIL_CLOSED_TRANSPORT_OR_INTEGRITY';

/** Read-only byte check shared by live before-send and synthetic mutation tests. */
export function verifyHotelDetailsOperationalFiles(config,liveApproval){
 for(const [name,path,digest,expected]of [
  ['CONFIG',liveApproval?.configPath,liveApproval?.configFileSha256,config],
  ['INVENTORY',liveApproval?.inventoryPath,liveApproval?.inventoryFileSha256,liveApproval?.inventory],
 ]){
  if(typeof path!=='string'||!isAbsolute(path)||!/^([a-f0-9]{64})$/.test(digest??''))fail('OPERATIONAL_FILE_BINDING_REQUIRED');
  assertNoLinks(path);const bytes=readFileSync(path);
  try{
   if(sha(bytes)!==digest)fail('OPERATIONAL_'+name+'_FILE_CHANGED');
   let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{fail('OPERATIONAL_'+name+'_JSON_INVALID');}
   if(!same(value,expected))fail('OPERATIONAL_'+name+'_CONTENT_CHANGED');
  }finally{bytes.fill(0);}
 }
 return {valid:true,providerHttpRequests:0,engineInvocations:0,policyInvocations:0};
}

export async function runHotelDetailsAcquisition({config,checkpoint,journal,credential=null,simulation=null,verifyBeforeSend,signal,liveApproval=null}){
 const synthetic=config?.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(validateHotelDetailPlan(config,{synthetic}).pending.length)fail('CONFIGURATION_PENDING');
 if(synthetic!==Boolean(simulation)||!synthetic&&(typeof credential!=='string'||!credential.trim()))fail('TRANSPORT_OR_CREDENTIAL_ORIGIN');
 const bindingSha256=hash({config,checkpoint});
 if(!synthetic){
  if(journal||verifyBeforeSend||!liveApproval)fail('PRODUCTION_INJECTION_PROHIBITED');
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),inventory=liveApproval.inventory;
  verifyBeforeSend=()=>{
   verifyHotelDetailsOperationalFiles(config,liveApproval);
   const cp=verifyHotelDetailInventory(root,inventory,checkpoint.head,checkpoint.branch);
   if(cp.codeSha256!==checkpoint.inventorySha256||liveApproval.authorization!==hotelDetailAuthorization(config,inventory)||hash({config,checkpoint})!==bindingSha256)fail('PRODUCTION_BINDING_CHANGED');
   verifyHotelDetailSourceFiles(config.source);
  };
  verifyBeforeSend();
  journal=createHotelDetailsJournal({root:join(config.retention.directory,'cases',config.caseId),registryRoot:config.retention.directory,repositoryRoot:root,
   caseId:config.caseId,mode:'REAL',bindingSha256,authorizationSha256:hash(liveApproval.authorization),
   context:{config:structuredClone(config),checkpoint:structuredClone(checkpoint),inventory:structuredClone(inventory),configFileSha256:liveApproval.configFileSha256}});
 }
 if(typeof verifyBeforeSend!=='function'||!journal)fail('VERIFIED_JOURNAL_REQUIRED');
 let server=null,port=null,localHttpRequests=0,transportInvocations=0,lastStart=0,stopped=false,failureClass=null,receipt;
 const records=[],detailResults=[];
 try{
  if(synthetic){
   if(simulation.origin!=='SYNTHETIC_ONLY'||!Array.isArray(simulation.responses))fail('SIMULATION_REQUIRED');
   server=http.createServer((req,res)=>{
    const chunks=[];req.on('data',b=>chunks.push(b));req.on('end',()=>{
     const row=simulation.responses[localHttpRequests++];
     if(!row||row.method!==req.method||row.path!==req.url||Buffer.concat(chunks).length){res.writeHead(422);res.end('{"error":"SYNTHETIC_REQUEST_MISMATCH"}');return;}
     if(row.timeout)return;
     if(row.reset){req.socket.destroy();return;}
     const finish=()=>{
      res.writeHead(row.status??200,{'content-type':row.contentType??'application/json',...(row.status>=300&&row.status<400?{location:'https://example.invalid/not-followed'}:{})});
      if(typeof row.partialBytes==='string'){res.write(row.partialBytes);setTimeout(()=>res.destroy(),20);return;}
      res.end(typeof row.bytes==='string'?row.bytes:JSON.stringify(row.response));
     };
     if(row.delayMs)setTimeout(finish,row.delayMs);else finish();
    });
   });
   await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});port=server.address().port;
  }
  for(let index=0;index<config.targets.length;index++){
   if(stopped||signal?.aborted)fail('INTERRUPTED');
   verifyBeforeSend();if(hash({config,checkpoint})!==bindingSha256)fail('CONFIG_CHANGED');
   const request=detailsRequest(index,config);validateDetailsRequest(request,index,config);
   await wait(Math.max(0,config.controls.pacingMs-(Date.now()-lastStart)));
   if(signal?.aborted)fail('INTERRUPTED');verifyBeforeSend();if(hash({config,checkpoint})!==bindingSha256)fail('CONFIG_CHANGED');
   const {ordinal}=journal.reserve({kind:request.kind,hotelId:request.hotelId,requestBytes:Buffer.from(canonical(request)),checkpointSha256:bindingSha256});
   const r={version:'stayopti.liteapi-hotel-detail-record@1',ordinal,kind:request.kind,startedAt:new Date().toISOString(),completedAt:null,outcome:'FAILED',failureClass:null,response:null};
   let raw=null,inspection=null;lastStart=Date.now();
   try{
    transportInvocations++;
    raw=await sendBoundedAcquisitionHttp(request,{credential,loopbackPort:port,timeoutMs:config.controls.clientTimeoutMs,signal});
    if(!synthetic&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential))){
     r.withheldOriginal={sha256:sha(raw.bodyBytes),byteLength:raw.bodyBytes.length,reason:'CREDENTIAL_ECHO_WITHHELD'};fail('CREDENTIAL_ECHO_WITHHELD');
    }
    r.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};
    if(raw.status>=300&&raw.status<400)fail('REDIRECT_REFUSED');
    if(raw.status!==200)fail('HTTP_'+raw.status);
    if(!String(raw.headers['content-type']??'').includes('application/json'))fail('CONTENT_TYPE_UNSUPPORTED');
    inspection=inspectHotelDetailResponse(r,request.hotelId);
    if(!inspection.usable)fail(/^[A-Z][A-Z0-9_]*$/.test(inspection.reason??'')?inspection.reason:'DETAIL_NOT_USABLE');
    r.outcome='SUCCEEDED';
   }catch(e){
    r.failureClass=classify(e);stopped=true;failureClass=r.failureClass;
    if(e.partialResponse){const partial=e.partialResponse;
     if(!synthetic&&(partial.bodyBytes.includes(Buffer.from(credential))||canonical(partial.headers).includes(credential)))r.withheldOriginal={sha256:sha(partial.bodyBytes),byteLength:partial.bodyBytes.length,reason:'PARTIAL_CREDENTIAL_ECHO_WITHHELD'};
     else r.partialResponse={status:partial.status,headers:partial.headers,body:pack(partial.bodyBytes),complete:false};
     partial.bodyBytes.fill(0);
    }
   }finally{raw?.bodyBytes.fill(0);}
   r.completedAt=new Date().toISOString();
   journal.complete({ordinal,state:r.outcome,statusCode:r.response?.status??null,errorClass:r.failureClass,responseBytes:Buffer.from(canonical(r))});
   records.push(r);detailResults.push({ordinal,hotelIdFingerprint:hash(request.hotelId),classification:inspection?.classification??'NOT_INTERPRETED',reason:inspection?.reason??r.failureClass,
    identityVerified:inspection?.identityVerified??false,detailUsable:inspection?.usable??false});
   if(stopped)break;
  }
 }catch(e){stopped=true;failureClass=classify(e);}
 finally{
  credential=null;
  if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
  receipt=journal.finish({status:stopped?'ABORTED':'COMPLETED'});
 }
 return {version:'stayopti.liteapi-hotel-detail-result@1',status:stopped?'ABORTED':'COMPLETE',failureClass,origin:config.origin,syntheticProofOnly:synthetic,
  actualAttempts:receipt.attemptsReserved,transportInvocations,localHttpRequests,providerHttpRequests:synthetic?0:transportInvocations,counts:receipt.counts,
  custodyStartedAt:receipt.startedAt,retentionEndsAt:new Date(Date.parse(receipt.startedAt)+config.retention.days*86400000).toISOString(),
  sourceBindingSha256:config.source.bindingSha256,plannedDetails:config.targets.length,details:detailResults,
  requests:records.map(({response,partialResponse,...r})=>({...r,httpStatus:response?.status??partialResponse?.status??null,responseSha256:response?.body.sha256??partialResponse?.body.sha256??null})),
  journalVerified:true,authorizationConsumed:!synthetic,restartAllowed:false,engineInvocations:0,policyInvocations:0,prebookCreationsAttempted:0,
  offerPriceRefreshed:false,offerAvailabilityRefreshed:false,providerOfferExpiryInferred:false};
}

/** Authenticates first, then returns in-memory originals. Never starts/resumes transport. */
export function readAuthenticatedHotelDetails(input){
 const journal=verifyHotelDetailsJournal(input),records=journal.requests.map(r=>{
  const request=decryptHotelDetailsOriginal({...input,ordinal:r.ordinal,direction:'request'});let response=null;
  try{
   if(r.response)response=decryptHotelDetailsOriginal({...input,ordinal:r.ordinal,direction:'response'});
   const parsed=response?JSON.parse(response.toString('utf8')):null;
   if(parsed&&(parsed.ordinal!==r.ordinal||parsed.kind!==r.kind||parsed.outcome!==r.state))fail('RECORD_JOURNAL_MISMATCH');
   for(const saved of [parsed?.response,parsed?.partialResponse].filter(Boolean)){
    const b=saved.body,bytes=Buffer.from(b.base64,'base64');try{if(bytes.length!==b.byteLength||sha(bytes)!==b.sha256)fail('RESPONSE_ORIGINAL_HASH');}finally{bytes.fill(0);}
   }
   return {request:JSON.parse(request.toString('utf8')),response:parsed};
  }finally{request.fill(0);response?.fill(0);}
 });
 return {journal,records,engineInvocations:0,policyInvocations:0,providerHttpRequests:0};
}
