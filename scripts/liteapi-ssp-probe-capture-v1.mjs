import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createBoundedAcquisitionJournalProfile} from './bounded-acquisition-journal-core-v1.mjs';
import {sendBoundedAcquisitionHttp} from './bounded-acquisition-http-v1.mjs';
import {comparisonRequest} from './liteapi-comparison-plan-v1.mjs';
import {readDocumentaryResponse,decodeDocumentaryOffer} from './liteapi-documentary-wire-v1.mjs';
import {classifyCoverageRatesResponse} from './liteapi-search-coverage-diagnostics-v1.mjs';
import {isOperationalSspVersion,SSP_PROBE_CAPS,sspDiscoveryRequest,prepareSspRequote,assessSspRequote,assessSspPrebook} from './liteapi-ssp-probe-v1.mjs';
import {SSP_REGISTRY,validateSspProbePlan,verifySspInventory,verifySspPlanEvidence,loadSspFile,sspAuthorization,canonical,hash,sha,same,fail,assertNoLinks} from './liteapi-ssp-probe-plan-v1.mjs';

/** One sequence shared by the original offline simulator and operational profile. */
export async function runSspProbeSequence(plan,send,seal){
 const d=await send(sspDiscoveryRequest(plan));if(d.outcome!=='SUCCEEDED')return null;
 if(d.noResults)return {status:'STOP',reasons:['DOCUMENTED_NO_RESULTS'],engineInvocations:0};
 let a=prepareSspRequote(plan,d);if(a.status!=='CANDIDATE_REQUOTE_NOT_VERIFIED')return a;
 seal(a);const q=await send(a.request);if(q.outcome!=='SUCCEEDED')return a;
 if(q.noResults)return {status:'STOP',reasons:['DOCUMENTED_NO_RESULTS_REQUOTE'],engineInvocations:0};
 a=assessSspRequote(plan,d,q);if(!a.prebookRequest)return a;
 const b=await send(a.prebookRequest);return b.outcome==='SUCCEEDED'?assessSspPrebook(plan,d,q,b):a;
}
export const operationalSspJournal=createBoundedAcquisitionJournalProfile({version:'stayopti.ssp-operational-journal@1',registryDirectory:SSP_REGISTRY,caps:SSP_PROBE_CAPS,errorPrefix:'SSP_PROBE_',selection:true,
 validateContext(input,c){validateSspProbePlan(c?.config);
  if(!isOperationalSspVersion(c.config.version)||c.config.caseId!==input.caseId||hash({config:c.config,checkpoint:c.checkpoint})!==input.bindingSha256||
   (input.mode==='REAL')!==(c.config.origin==='LITEAPI_PRODUCTION')||input.mode==='REAL'&&input.authorizationSha256!==hash(sspAuthorization(c.config,c.inventory)))fail('JOURNAL_CONTEXT');},
 validateSelection(s,c){if(s?.status!=='CANDIDATE_REQUOTE_NOT_VERIFIED'||s.planSha256!==hash(c.config))fail('SELECTION');},
 validateRequest({context,request,kind,snapshot}){
  const p=context.config;
  if(kind!==['DISCOVERY','REQUOTE','PREBOOK'][snapshot.attemptsReserved]||request.kind!==kind||snapshot.requests.some(r=>r.state==='FAILED')||kind!=='DISCOVERY'&&!snapshot.selection)fail('REQUEST_SEQUENCE');
  let expected=sspDiscoveryRequest(p);
  if(kind==='REQUOTE'){
   if(!Number.isFinite(request.body?.margin)||request.body.margin<0)fail('MARGIN_INVALID');
   expected={...expected,kind,body:{...expected.body,margin:request.body.margin}};
  }else if(kind==='PREBOOK')expected=comparisonRequest(p.comparisonPlan,'PREBOOK',{hotelId:p.hotelId,offerId:request.offerId});
  if(!same(request,expected))fail('REQUEST_OUTSIDE_PROFILE');
 }
});
const pack=b=>({base64:b.toString('base64'),sha256:sha(b),byteLength:b.length});
const classify=e=>e?.code==='ETIMEDOUT'?'TIMEOUT':e?.code==='ABORTED'?'INTERRUPTED':/^SSP_PROBE_[A-Z0-9_]+$/.test(e?.message)?e.message.slice(10):'TRANSPORT_OR_INTEGRITY_FAILED';
export function readAuthenticatedSspProbe({root,registryRoot,syntheticProtector}){
 assertNoLinks(root);assertNoLinks(registryRoot);
 const header=JSON.parse(readFileSync(join(root,'header.json')));
 if(syntheticProtector&&header.binding.mode!=='SYNTHETIC_ONLY')fail('REAL_PROTECTOR_INJECTION');
 const input={...header.binding,root,registryRoot,...(syntheticProtector?{protector:syntheticProtector}:{})};
 const journal=operationalSspJournal.verify(input); // authenticate BEFORE parsing originals
 const read=(ordinal,direction)=>{const b=operationalSspJournal.decrypt({...input,ordinal,direction});try{return JSON.parse(b);}finally{b.fill(0);}};
 const records=journal.requests.map(e=>({request:read(e.ordinal,'request'),response:e.response?read(e.ordinal,'response'):null}));
 for(const [i,r]of records.entries())if(r.response){const e=journal.requests[i],t=Date.parse(r.response.completedAt);
  if(!same(r.request,r.response.intent)||r.response.ordinal!==e.ordinal||r.response.kind!==e.kind||r.response.outcome!==e.state||!Number.isFinite(t)||t<Date.parse(e.reservedAt)||t>Date.parse(e.completedAt))fail('RECORD_JOURNAL_LINK');
 }
 const p=journal.context.config,d=records[0]?.response,q=records[1]?.response,b=records[2]?.response;
 let assessment=null;
 if(d?.outcome==='SUCCEEDED'&&!d.noResults){assessment=prepareSspRequote(p,d);
  if(journal.selection&&!same(read(0,'selection'),assessment))fail('DERIVATION_CHANGED');
  if(q){if(!same(q.intent,assessment.request))fail('DERIVED_REQUEST_CHANGED');if(q.outcome==='SUCCEEDED'&&!q.noResults)assessment=assessSspRequote(p,d,q);}
  if(b){if(!same(b.intent,assessment.prebookRequest))fail('PREBOOK_TARGET_CHANGED');if(b.outcome==='SUCCEEDED')assessment=assessSspPrebook(p,d,q,b);}
 }
 if(d?.noResults||q?.noResults)assessment={status:'STOP',reasons:[q?.noResults?'DOCUMENTED_NO_RESULTS_REQUOTE':'DOCUMENTED_NO_RESULTS'],engineInvocations:0};
 return {journal,records,assessment,engineInvocations:0,policyInvocations:0};
}
export async function acquireSspProbe({config,checkpoint,approval,simulation=null,syntheticProtector,verifyBeforeSend,signal}){
 const status=validateSspProbePlan(config),synthetic=config.origin==='SYNTHETIC_ONLY';
 if(!isOperationalSspVersion(config.version)||status.pending.length)fail('CONFIGURATION_PENDING');
 if(synthetic!==Boolean(simulation)||!synthetic&&(syntheticProtector||verifyBeforeSend)||synthetic&&(simulation.origin!=='SYNTHETIC_ONLY'||!Array.isArray(simulation.responses)))fail('PRODUCTION_INJECTION');
 let credential=approval?.credential??null;
 if(!synthetic){if(!approval||approval.authorization!==sspAuthorization(config,approval.inventory)||typeof credential!=='string'||!credential.trim())fail('AUTHORIZATION_REQUIRED');
  verifyBeforeSend=()=>{
   if(!same(loadSspFile(approval.configPath,approval.configSha256),config)||!same(loadSspFile(approval.inventoryPath,approval.inventorySha256),approval.inventory))fail('INPUT_CHANGED');
   if(!same(verifySspInventory(approval.repositoryRoot,approval.inventory,checkpoint.head,checkpoint.branch),checkpoint))fail('CHECKPOINT_CHANGED');
   verifySspPlanEvidence(config,approval.repositoryRoot);
  };
 }else if(credential!==null)fail('SYNTHETIC_CREDENTIAL_INJECTION');
 if(typeof verifyBeforeSend!=='function')fail('BEFORE_SEND_REQUIRED');verifyBeforeSend();
 const registryRoot=resolve(config.comparisonPlan.retention.directory),input={root:join(registryRoot,'cases',config.caseId),registryRoot,caseId:config.caseId,mode:synthetic?'SYNTHETIC_ONLY':'REAL',
  bindingSha256:hash({config,checkpoint}),authorizationSha256:hash(synthetic?{config,checkpoint}:approval.authorization),...(syntheticProtector?{protector:syntheticProtector}:{}),context:{config:structuredClone(config),checkpoint,inventory:approval?.inventory??null}};
 const journal=operationalSspJournal.create(input);let server,port,lastStart=0,localRequests=0,transportInvocations=0,failureClass=null,assessment=null;
 try{
  if(synthetic){server=http.createServer((req,res)=>{const chunks=[];req.on('data',b=>chunks.push(b));req.on('end',()=>{
   const row=simulation.responses[localRequests++],body=Buffer.concat(chunks);
   if(!row||row.method!==req.method||row.path!==req.url||!same(body.length?JSON.parse(body):null,row.body??null)){res.writeHead(422);res.end('{"error":"synthetic mismatch"}');return;}
   if(row.timeout)return;res.writeHead(row.status??200,row.headers??{'content-type':'application/json'});res.end(row.raw??canonical(row.response));
  });});await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;}
  const send=async request=>{
   verifyBeforeSend();if(signal?.aborted)fail('INTERRUPTED');await new Promise(r=>setTimeout(r,Math.max(0,1000-(Date.now()-lastStart))));verifyBeforeSend();
   if(signal?.aborted)fail('INTERRUPTED');
   const {ordinal}=journal.reserve({kind:request.kind,hotelId:request.hotelId,offerId:request.offerId??null,requestBytes:Buffer.from(canonical(request)),checkpointSha256:input.bindingSha256});
   let raw;const r={ordinal,kind:request.kind,intent:request,outcome:'SUCCEEDED',failureClass:null};
   try{lastStart=Date.now();transportInvocations++;raw=await sendBoundedAcquisitionHttp(request,{credential,loopbackPort:port,timeoutMs:request.kind==='PREBOOK'?35000:20000,signal});
    if(credential&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential)))fail('CREDENTIAL_ECHO_WITHHELD');
    r.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};
    if(request.kind!=='PREBOOK'){const c=classifyCoverageRatesResponse({bytes:raw.bodyBytes,status:raw.status,expectedSha256:r.response.body.sha256});
     if(!['SUCCESS','DOCUMENTED_NO_RESULTS'].includes(c.classification))fail(raw.status>=400?'HTTP_'+raw.status:c.classification);
     r.noResults=c.classification==='DOCUMENTED_NO_RESULTS';
    }else{if(raw.status!==200)fail('HTTP_'+raw.status);if(!readDocumentaryResponse(r))fail('PREBOOK_SCHEMA');
     const d=decodeDocumentaryOffer(r,{hotelId:request.hotelId,offerId:request.offerId,scenario:{searchRequest:sspDiscoveryRequest(config).body},stage:'PREBOOK'});
     if(d.issue||d.issues.some(x=>/PROVIDER_ERROR|UNSUPPORTED_ERROR_SHAPE/.test(x)))fail('PREBOOK_UNINTERPRETABLE_OR_ERROR');
    }
   }catch(e){failureClass=classify(e);r.failureClass=failureClass;r.outcome='FAILED';
    const partial=e?.partialResponse;if(partial){try{if(!credential||!partial.bodyBytes.includes(Buffer.from(credential))&&!canonical(partial.headers).includes(credential))r.response={status:partial.status,headers:partial.headers,body:pack(partial.bodyBytes),partial:true};}finally{partial.bodyBytes.fill(0);}}
   }finally{raw?.bodyBytes.fill(0);}
   r.completedAt=new Date().toISOString();journal.complete({ordinal,state:r.outcome,statusCode:r.response?.status??null,errorClass:r.failureClass,responseBytes:Buffer.from(canonical(r))});return r;
  };
  assessment=await runSspProbeSequence(config,send,a=>journal.sealSelection(a));
 }catch(e){failureClass=classify(e);}finally{credential=null;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
 const receipt=journal.finish({status:failureClass?'ABORTED':'COMPLETED'});
 const verified=readAuthenticatedSspProbe({root:input.root,registryRoot,...(syntheticProtector?{syntheticProtector}:{})});
 return {version:'stayopti.ssp-probe-acquisition-result@1',status:failureClass?'ABORTED':'COMPLETE',failureClass,assessment:verified.assessment??assessment,
  actualAttempts:receipt.attemptsReserved,counts:receipt.counts,transportInvocations,localHttpRequests:localRequests,providerHttpRequests:synthetic?0:transportInvocations,
  caseDirectory:input.root,registryRoot,journalVerified:true,custodyStartedAt:receipt.startedAt,retentionEndsAt:new Date(Date.parse(receipt.startedAt)+14*86400000).toISOString(),
  retentionResponsible:config.comparisonPlan.retention.responsible,automaticDeletion:false,engineInvocations:0,policyInvocations:0,restartAllowed:false,syntheticProofOnly:synthetic,a02Production:'HOLD'};
}
