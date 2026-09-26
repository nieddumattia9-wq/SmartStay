// Only a loopback experiment: deliberately no Acquire/credential/live switch.
import http from 'node:http';
import {join,resolve} from 'node:path';
import {createBoundedAcquisitionJournalProfile} from './bounded-acquisition-journal-core-v1.mjs';
import {sendBoundedAcquisitionHttp} from './bounded-acquisition-http-v1.mjs';
import {canonical,hash,sha,same,comparisonRequest} from './liteapi-comparison-plan-v1.mjs';
import {SSP_PROBE_VERSION,SSP_PROBE_CAPS,validateSspProbePlan,sspDiscoveryRequest,prepareSspRequote,assessSspRequote,assessSspPrebook} from './liteapi-ssp-probe-v1.mjs';
import {runSspProbeSequence} from './liteapi-ssp-probe-capture-v1.mjs';
const fail=c=>{throw Error('SSP_PROBE_'+c);};
export const sspProbeJournal=createBoundedAcquisitionJournalProfile({version:'stayopti.ssp-probe-journal@1',registryDirectory:'liteapi-ssp-probe-offline',caps:SSP_PROBE_CAPS,errorPrefix:'SSP_PROBE_',selection:true,
 validateContext(input,c){validateSspProbePlan(c?.plan);if(c.plan.version!==SSP_PROBE_VERSION||input.mode!=='SYNTHETIC_ONLY'||c.plan.caseId!==input.caseId||hash(c)!==input.bindingSha256||input.authorizationSha256!==hash(['OFFLINE_ONLY',c]))fail('OFFLINE_BINDING');},
 validateSelection(s,c){if(s?.status!=='CANDIDATE_REQUOTE_NOT_VERIFIED'||s.planSha256!==hash(c.plan))fail('SELECTION');},
 validateRequest({context,request,kind,snapshot}){
  const p=context.plan,sequence=['DISCOVERY','REQUOTE','PREBOOK'];
  if(kind!==sequence[snapshot.attemptsReserved]||request.kind!==kind||snapshot.requests.some(r=>r.state==='FAILED')||kind!=='DISCOVERY'&&!snapshot.selection)fail('REQUEST_SEQUENCE');
  let expected=sspDiscoveryRequest(p);
  if(kind==='REQUOTE'){
   if(!Number.isFinite(request.body?.margin)||request.body.margin<0)fail('MARGIN_INVALID');
   expected={...expected,kind,body:{...expected.body,margin:request.body.margin}};
  }else if(kind==='PREBOOK')expected=comparisonRequest(p.comparisonPlan,'PREBOOK',{hotelId:p.hotelId,offerId:request.offerId});
  if(!same(request,expected))fail('REQUEST_OUTSIDE_PROFILE');
 }
});
const pack=b=>({base64:b.toString('base64'),byteLength:b.length,sha256:sha(b)});

/** Authenticates every byte before interpreting; no new observations or engine. */
export function readSyntheticSspProbe(input){
 if(input.mode!=='SYNTHETIC_ONLY')fail('OFFLINE_ONLY');
 const journal=sspProbeJournal.verify(input),read=(ordinal,direction)=>{
  const bytes=sspProbeJournal.decrypt({...input,ordinal,direction});try{return JSON.parse(bytes);}finally{bytes.fill(0);}
 };
 const records=journal.requests.map(r=>({request:read(r.ordinal,'request'),response:r.response?read(r.ordinal,'response'):null}));
 for(const [i,r]of records.entries())if(r.response){
  const event=journal.requests[i],time=Date.parse(r.response.completedAt);
  if(!same(r.request,r.response.intent)||r.response.ordinal!==event.ordinal||r.response.kind!==event.kind||r.response.outcome!==event.state||
   !Number.isFinite(time)||time<Date.parse(event.reservedAt)||time>Date.parse(event.completedAt))fail('RECORD_REQUEST_BINDING');
 }
 const p=journal.context.plan,d=records[0]?.response,q=records[1]?.response,b=records[2]?.response;
 let assessment=null;
 if(d?.outcome==='SUCCEEDED'){
  assessment=prepareSspRequote(p,d);
  if(journal.selection&&!same(read(0,'selection'),assessment))fail('DERIVATION_CHANGED');
  if(q?.outcome==='SUCCEEDED')assessment=assessSspRequote(p,d,q);
  if(b?.outcome==='SUCCEEDED')assessment=assessSspPrebook(p,d,q,b);
 }
 return {journal,records,assessment,engineInvocations:0,policyInvocations:0};
}

export async function simulateSspProbe({plan,registryRoot,responses,protector,timeoutMs=2000}){
 validateSspProbePlan(plan);
 if(plan.version!==SSP_PROBE_VERSION||plan.origin!=='SYNTHETIC_ONLY')fail('OFFLINE_ONLY');
 if(!Array.isArray(responses)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>35000)fail('SIMULATION_INPUT');
 const context={plan:structuredClone(plan)},input={registryRoot:resolve(registryRoot),root:join(resolve(registryRoot),'cases',plan.caseId),caseId:plan.caseId,
  mode:'SYNTHETIC_ONLY',bindingSha256:hash(context),authorizationSha256:hash(['OFFLINE_ONLY',context]),context,...(protector?{protector}:{})};
 const journal=sspProbeJournal.create(input);let server,localRequests=0,lastStart=0,failure=null,assessment=null;
 try{
  server=http.createServer((req,res)=>{const chunks=[];req.on('data',b=>chunks.push(b));req.on('end',()=>{
   const row=responses[localRequests++],body=chunks.length?JSON.parse(Buffer.concat(chunks)):null;
   if(!row||row.method!==req.method||row.path!==req.url||!same(row.body,body)){res.writeHead(422);res.end('{"error":"synthetic request mismatch"}');return;}
   if(row.timeout)return;
   res.writeHead(row.status??200,row.headers??{'content-type':'application/json'});res.end(row.raw??canonical(row.response));
  });});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
  const send=async request=>{
   await new Promise(r=>setTimeout(r,Math.max(0,1000-(Date.now()-lastStart))));
   const {ordinal}=journal.reserve({kind:request.kind,hotelId:request.hotelId,offerId:request.offerId??null,requestBytes:Buffer.from(canonical(request)),checkpointSha256:input.bindingSha256});
   const record={ordinal,kind:request.kind,intent:request,outcome:'SUCCEEDED',response:null};let raw;
   try{lastStart=Date.now();raw=await sendBoundedAcquisitionHttp(request,{loopbackPort:port,timeoutMs});
    record.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};
    if(raw.status!==200)fail('HTTP_'+raw.status);
   }catch(e){record.outcome='FAILED';failure=/HTTP_\d+/.exec(e.message)?.[0]??'TRANSPORT_FAILED';}
   finally{raw?.bodyBytes.fill(0);}
   record.completedAt=new Date().toISOString();journal.complete({ordinal,state:record.outcome,statusCode:record.response?.status??null,errorClass:failure,responseBytes:Buffer.from(canonical(record))});
   return record;
  };
  assessment=await runSspProbeSequence(plan,send,a=>journal.sealSelection(a));
 }catch(e){failure=e.message;}
 finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
 const receipt=journal.finish({status:failure?'ABORTED':'COMPLETED'});
 const verified=readSyntheticSspProbe(input);
 return {version:SSP_PROBE_VERSION,status:receipt.status,failure,assessment:verified.assessment??assessment,locator:input,
  attempts:receipt.attemptsReserved,counts:receipt.counts,localHttpRequests:localRequests,providerRequests:0,engineInvocations:0,policyInvocations:0,
  journalVerified:true,production:'HOLD',syntheticOnly:true};
}
