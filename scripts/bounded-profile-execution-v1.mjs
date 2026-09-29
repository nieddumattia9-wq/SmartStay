// Shared bounded transport lifecycle. Fixed profiles supply request derivation;
// journal reservation ALWAYS precedes I/O. No retry, redirect or resume.
import http from 'node:http';
import {sendBoundedAcquisitionHttp} from './bounded-acquisition-http-v1.mjs';
import {canonical,sha,same} from './liteapi-controlled-plan-v1.mjs';
const pack=b=>({base64:b.toString('base64'),sha256:sha(b),byteLength:b.length});
export async function runBoundedProfile({journal,simulation,credential,signal,controls,verifyBeforeSend,progress,qualify,fail}){
 let server,port,lastStart=0,localRequests=0,transportInvocations=0,failureClass=null,assessment=null;const records=[];
 try{
  if(simulation){
   if(simulation.origin!=='SYNTHETIC_ONLY'||!Array.isArray(simulation.responses))fail('SIMULATION');
   server=http.createServer((q,s)=>{const chunks=[];q.on('data',b=>chunks.push(b));q.on('end',()=>{const row=simulation.responses[localRequests++],body=Buffer.concat(chunks);
    if(!row||row.method!==q.method||row.path!==q.url||!same(body.length?JSON.parse(body):null,row.body??null)){s.writeHead(422);s.end('{"error":"synthetic mismatch"}');return;}
    if(row.timeout)return;s.writeHead(row.status??200,row.headers??{'content-type':'application/json'});s.end(row.raw??canonical(row.response));});});
   await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;
  }
  let sealed=false;
  while(true){
   assessment=progress(records);
   if(assessment.selection&&!sealed){journal.sealSelection(assessment.selection);sealed=true;}
   if(!assessment.next)break;
   const request=assessment.next;
   verifyBeforeSend();if(signal?.aborted)fail('INTERRUPTED');
   await new Promise(r=>setTimeout(r,Math.max(0,controls.pacingMs-(Date.now()-lastStart))));verifyBeforeSend();if(signal?.aborted)fail('INTERRUPTED');
   const {ordinal}=journal.reserve({kind:request.kind,hotelId:request.hotelId,offerId:request.offerId??null,requestBytes:Buffer.from(canonical(request)),checkpointSha256:journal.bindingSha256});
   const r={ordinal,kind:request.kind,intent:request,outcome:'SUCCEEDED',failureClass:null};let raw;
   try{
    lastStart=Date.now();transportInvocations++;
    raw=await sendBoundedAcquisitionHttp(request,{credential,loopbackPort:port,timeoutMs:request.kind==='PREBOOK'?controls.prebookClientMs:controls.clientMs,signal});
    if(credential&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential)))fail('CREDENTIAL_ECHO_WITHHELD');
    r.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};qualify(request,r);
   }catch(e){
    failureClass=e.code==='ETIMEDOUT'?'TIMEOUT':e.code==='ABORTED'?'INTERRUPTED':/^BAND_[A-Z0-9_]+$/.test(e.message)?e.message.slice(5):'TRANSPORT_OR_INTEGRITY_FAILED';r.outcome='FAILED';r.failureClass=failureClass;
    const partial=e.partialResponse;if(partial){try{if(!credential||!partial.bodyBytes.includes(Buffer.from(credential))&&!canonical(partial.headers).includes(credential))r.response={status:partial.status,headers:partial.headers,body:pack(partial.bodyBytes),partial:true};}finally{partial.bodyBytes.fill(0);}}
   }finally{raw?.bodyBytes.fill(0);}
   r.completedAt=new Date().toISOString();journal.complete({ordinal,state:r.outcome,statusCode:r.response?.status??null,errorClass:r.failureClass,responseBytes:Buffer.from(canonical(r))});records.push(r);
   if(failureClass)break;
  }
 }catch(e){failureClass=/^BAND_[A-Z0-9_]+$/.test(e.message)?e.message.slice(5):'CONTROL_OR_INTEGRITY_FAILED';}
 finally{credential=null;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
 const receipt=journal.finish({status:failureClass?'ABORTED':'COMPLETED'});
 return {receipt,assessment,failureClass,transportInvocations,localRequests};
}
