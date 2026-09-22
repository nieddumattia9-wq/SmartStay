import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createBoundedAcquisitionJournalProfile} from './bounded-acquisition-journal-core-v1.mjs';
import {sendBoundedAcquisitionHttp} from './bounded-acquisition-http-v1.mjs';
import {CAPS,COMPARISON_REGISTRY,validateComparisonPlan,comparisonRequest,comparisonAuthorization,verifyComparisonInventory,hash,sha,same,canonical,fail,assertNoLinks} from './liteapi-comparison-plan-v1.mjs';
import {classifyCoverageRatesResponse} from './liteapi-search-coverage-diagnostics-v1.mjs';
import {readDocumentaryResponse,selectDocumentaryLiteApiOffers,decodeDocumentaryOffer,inspectDocumentaryFiscal,getDocumentaryPrebookId} from './liteapi-documentary-wire-v1.mjs';
import {inspectHotelDetailResponse,compareMappedRoomObservation} from './liteapi-room-detail-comparison-v1.mjs';

export const comparisonJournal=createBoundedAcquisitionJournalProfile({version:'stayopti.comparison-journal@1',caps:CAPS,registryDirectory:COMPARISON_REGISTRY,errorPrefix:'COMPARISON_',selection:true,
 validateContext(input,c){validateComparisonPlan(c?.config);if(c.config.caseId!==input.caseId||hash({config:c.config,checkpoint:c.checkpoint})!==input.bindingSha256||
  (input.mode==='REAL')!==(c.config.origin==='LITEAPI_PRODUCTION')||input.mode==='REAL'&&input.authorizationSha256!==hash(comparisonAuthorization(c.config,c.inventory)))fail('JOURNAL_CONTEXT');},
 validateRequest({context,request,kind,snapshot}){
  if(snapshot.requests.some(r=>r.state==='FAILED')||kind!==request.kind||kind!=='SEARCH'&&!snapshot.selection||kind==='SEARCH'&&snapshot.attemptsReserved!==0||kind==='HOTEL_DETAIL'&&snapshot.requests.some(r=>r.kind==='PREBOOK'))fail('REQUEST_SEQUENCE');
  const expected=comparisonRequest(context.config,kind,kind==='SEARCH'?null:{hotelId:request.hotelId,offerId:request.offerId??'detail-only'});
  if(!same(request,expected))fail('REQUEST_OUTSIDE_PROFILE');
 },validateSelection(s,c){if(!s||s.version!=='stayopti.comparison-selection@1'||s.planSha256!==hash(c.config)||!Array.isArray(s.selected)||s.selected.length>5||!Array.isArray(s.requests))fail('SELECTION');}
});
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const issued=new WeakSet();
export const isAuthenticatedComparisonCapture=x=>Boolean(x&&issued.has(x));
const pack=bytes=>({base64:bytes.toString('base64'),sha256:sha(bytes),byteLength:bytes.length});
// A second, explicitly synthetic protocol. Its wrapper is authenticated before
// interpretation; it cannot be selected for a REAL journal.
export function comparisonDocumentRecord(record,protocol){
 if(protocol==='LITEAPI_DOCUMENTARY@1')return record;
 if(protocol!=='SYNTHETIC_ATTESTED_QUOTE@1')fail('PROTOCOL');
 const raw=readDocumentaryResponse(record);
 if(!raw||raw.format!=='invented-observation-and-attestation@1'||raw.operation!==(record.kind==='PREBOOK'?'ATTEST_QUOTE':record.kind))fail('SYNTHETIC_PROTOCOL_SCHEMA');
 // Different envelopes/operation vocabulary, identical documentary facts. This
// is a protocol adapter, not a caller-authored normalized-fact acceptance path.
 const document=record.kind==='PREBOOK'?{data:raw.quote}:raw.document;
 if(!document||typeof document!=='object')fail('SYNTHETIC_PROTOCOL_SCHEMA');
 const bytes=Buffer.from(canonical(document));
 return {...record,response:{...record.response,body:pack(bytes)},originalProtocolSource:{sha256:record.response.body.sha256,transformation:'AUTHENTICATED_SYNTHETIC_DOCUMENT_ENVELOPE@1'}};
}
/** The alternate protocol is a verification attestation, NOT session creation
 * or retrieval. No prebookId/version is invented to enter the LiteAPI decoder. */
export function decodeComparisonVerification(record,request,config){
 const doc=comparisonDocumentRecord(record,config.protocol),scenario={searchRequest:comparisonRequest(config,'SEARCH').body};
 if(config.protocol==='LITEAPI_DOCUMENTARY@1')return decodeDocumentaryOffer({...doc,intent:request},{hotelId:request.hotelId,offerId:request.offerId,scenario,stage:'PREBOOK'});
 const raw=readDocumentaryResponse(record),q=raw.quote,v=raw.verification;
 if(v?.kind!=='COMMERCIAL_VERIFICATION'||typeof v.id!=='string'||!v.id||v.offerToken!==request.offerId||v.property!==request.hotelId||q?.hotelId!==request.hotelId||q?.offerId!==request.offerId)
  return {issue:'ATTESTATION_IDENTITY_UNVERIFIED',issues:['ATTESTATION_IDENTITY_UNVERIFIED']};
 const payload={data:[{...q,roomTypes:q.roomTypes?.map(o=>({...o,offerId:q.offerId}))}]},bytes=Buffer.from(canonical(payload));
 const d=decodeDocumentaryOffer({...doc,intent:{kind:'SEARCH'},response:{...doc.response,body:pack(bytes)}},{hotelId:request.hotelId,offerId:request.offerId,scenario,stage:'SEARCH'});
 if(d.issue)return d;
 for(const k of ['checkin','checkout','currency'])if(q[k]!==scenario.searchRequest[k])d.issues.push('ATTESTATION_'+k.toUpperCase()+'_MISMATCH');
 if(q.price!==d.rate?.retailRate?.total?.[0]?.amount)d.issues.push('ATTESTED_PAYABLE_PRICE_CONFLICT');
 return {...d,hotel:q,verificationId:v.id,binding:{...d.binding,prebookId:null,identityBasis:'AUTHENTICATED_REQUEST_AND_VERIFICATION_ATTESTATION_NO_SESSION'}};
}
export function sealComparisonSelection(config,record){
 const doc=selectionAgeView(comparisonDocumentRecord(record,config.protocol),config),selection=selectDocumentaryLiteApiOffers({...doc,intent:comparisonRequest(config,'SEARCH')},config.selection,{searchRequest:comparisonRequest(config,'SEARCH').body});
 return {version:'stayopti.comparison-selection@1',planSha256:hash(config),...selection,version:'stayopti.comparison-selection@1',
  originalSearchSha256:record.response.body.sha256,rawPoolFingerprint:hash(readDocumentaryResponse(comparisonDocumentRecord(record,config.protocol))),ageEquivalence:doc.ageEquivalence,requests:selection.selected.filter(t=>t.offerId!==null).flatMap(t=>[comparisonRequest(config,'HOTEL_DETAIL',t),comparisonRequest(config,'PREBOOK',t)])};
}
export function decodeComparisonObservation(record,config,target){
 const doc=comparisonDocumentRecord(record,config.protocol),p=structuredClone(readDocumentaryResponse(doc));
 // Only byte-equivalent JSON records are deduplicated for the legacy decoder.
 // Every raw occurrence is retained by the facts adapter; conflicts are not merged.
 const unique=xs=>xs.filter((x,i)=>xs.findIndex(y=>same(x,y))===i);
 if(Array.isArray(p?.data)){p.data=unique(p.data);for(const h of p.data)if(Array.isArray(h.roomTypes))h.roomTypes=unique(h.roomTypes);}
 return decodeDocumentaryOffer({...doc,intent:comparisonRequest(config,'SEARCH'),response:{...doc.response,body:pack(Buffer.from(canonical(p)))}},{...target,scenario:{searchRequest:comparisonRequest(config,'SEARCH').body},stage:'SEARCH'});
}
// Only a complete, equal single-unit age multiset is representation-equivalent.
// The original record and all non-equivalent echoes remain untouched.
function selectionAgeView(record,config){
 const payload=readDocumentaryResponse(record),p=structuredClone(payload),ages=config.scenario.childAges,changes=[];
 const equivalent=v=>Array.isArray(v)&&v.length===ages.length&&v.every(a=>Number.isInteger(a)&&a>=0&&a<=17)&&same([...v].sort((a,b)=>a-b),[...ages].sort((a,b)=>a-b));
 for(const [hi,h]of (p?.data??[]).entries())for(const [oi,o]of (h.roomTypes??[]).entries())for(const [ri,r]of (o.rates??[]).entries()){
  for(const key of ['childrenAges','children','childAges'])if(equivalent(r[key])&&!same(r[key],ages)){changes.push({pointer:`data[${hi}].roomTypes[${oi}].rates[${ri}].${key}`,original:r[key],comparison:ages});r[key]=[...ages];}
 }
 return {...record,response:{...record.response,body:pack(Buffer.from(canonical(p)))},ageEquivalence:changes};
}
export function inspectComparisonRate(record,config){
 const doc=comparisonDocumentRecord(record,config.protocol),bytes=Buffer.from(doc.response.body.base64,'base64');
 try{return classifyCoverageRatesResponse({bytes,status:doc.response.status,expectedSha256:doc.response.body.sha256});}finally{bytes.fill(0);}
}
export function comparisonPrebookStop(config,search,target,detail){
 const d=decodeComparisonObservation(selectionAgeView(comparisonDocumentRecord(search,config.protocol),config),{...config,protocol:'LITEAPI_DOCUMENTARY@1'},target);
 if(d.issue||d.issues.length)return {reasons:[d.issue??'SEARCH_SCOPE_UNRESOLVED',...d.issues]};
 const fiscal=inspectDocumentaryFiscal(d,config.scenario.currency);
 const reasons=fiscal.priceQualification.issues.filter(x=>x==='OBSERVED_PUBLIC_PRICE_BELOW_SSP');
 if(detail){const r=comparisonDocumentRecord(detail,config.protocol),inspection=inspectHotelDetailResponse(r,target.hotelId);
  if(!inspection.usable)reasons.push('DETAIL_UNUSABLE');
  const o={...target,mappedRoomId:d.binding.mappedRoomId,rateId:d.rate.rateId,rate:d.rate,roomText:d.rate.name??'',observedAt:search.completedAt,responseSha256:search.response.body.sha256,pointer:d.binding.pointer,issues:d.issues,offerKey:hash(target)};
  const c=compareMappedRoomObservation({scenario:config.scenario},o,r);
  if(c.compatibility==='CONFLICTING'||['INSUFFICIENT'].includes(c.sleepingAssessment?.status)||c.partyCapacityStatus==='INSUFFICIENT')reasons.push('DOCUMENTED_ACCOMMODATION_CONTRADICTION');
 }
 return {reasons};
}
export function readAuthenticatedComparisonCapture(locator){
 if(!locator||Object.keys(locator).some(k=>!['root','registryRoot','syntheticProtector'].includes(k)))fail('LOCATOR');
 const root=resolve(locator.root),registryRoot=resolve(locator.registryRoot);assertNoLinks(root);assertNoLinks(registryRoot);
 const header=JSON.parse(readFileSync(join(root,'header.json'),'utf8'));
 if(locator.syntheticProtector&&header.binding.mode!=='SYNTHETIC_ONLY')fail('REAL_PROTECTOR_INJECTION');
 const input={...header.binding,root,registryRoot,...(locator.syntheticProtector?{protector:locator.syntheticProtector}:{})};
 const journal=comparisonJournal.verify(input); // all originals authenticated before parsing
 const read=(ordinal,direction)=>{const b=comparisonJournal.decrypt({...input,ordinal,direction});try{return JSON.parse(b.toString('utf8'));}finally{b.fill(0);}};
 const records=journal.requests.map(r=>{const request=read(r.ordinal,'request'),response=r.response?read(r.ordinal,'response'):null;
  if(response&&(response.ordinal!==r.ordinal||response.kind!==r.kind||response.outcome!==r.state||Date.parse(response.completedAt)>Date.parse(r.completedAt)||Date.parse(response.completedAt)<Date.parse(r.reservedAt)))fail('RECORD_JOURNAL_LINK');
  if(response?.response)readDocumentaryResponse(response);return {request,response};});
 const selection=journal.selection?read(0,'selection'):null;
 if(selection){if(hash(selection)!==journal.selection.selectionSha256||!same(selection,sealComparisonSelection(journal.context.config,records[0].response)))fail('SELECTION_CHANGED');
  for(const p of records.slice(1))if(!selection.requests.some(r=>same(r,p.request)))fail('REQUEST_NOT_SELECTED');}
 const result=freeze({version:'stayopti.authenticated-comparison-capture@1',journal,records,selection,origin:input.mode==='REAL'?'AUTHENTICATED_PROVIDER':'AUTHENTICATED_SYNTHETIC',engineInvocations:0,policyInvocations:0});issued.add(result);return result;
}
const classify=e=>e?.code==='ETIMEDOUT'?'TIMEOUT':e?.code==='ABORTED'?'INTERRUPTED':/^COMPARISON_[A-Z0-9_]+$/.test(e?.message)?e.message.slice(11):'TRANSPORT_OR_INTEGRITY_FAILED';
export async function acquireComparison({config,checkpoint,approval,simulation=null,syntheticProtector,verifyBeforeSend,signal}){
 const synthetic=config.origin==='SYNTHETIC_LOCAL_TRANSPORT',status=validateComparisonPlan(config);
 if(status.pending.length)fail('CONFIGURATION_PENDING');
 if(synthetic!==Boolean(simulation)||!synthetic&&(syntheticProtector||verifyBeforeSend))fail('PRODUCTION_INJECTION');
 // REAL capability comes only from the launcher after its protected stdin.
 let credential=approval?.credential??null;
 if(!synthetic){if(!approval||approval.authorization!==comparisonAuthorization(config,approval.inventory)||typeof credential!=='string'||!credential.trim())fail('AUTHORIZATION_REQUIRED');
  verifyBeforeSend=()=>{for(const [p,h,v]of [[approval.configPath,approval.configSha256,config],[approval.inventoryPath,approval.inventorySha256,approval.inventory]]){assertNoLinks(p);const b=readFileSync(p);if(sha(b)!==h||!same(JSON.parse(b),v))fail('OPERATIONAL_INPUT_CHANGED');}
   const cp=verifyComparisonInventory(approval.repositoryRoot,approval.inventory,checkpoint.head,checkpoint.branch);if(!same(cp,checkpoint))fail('CHECKPOINT_CHANGED');};}
 if(typeof verifyBeforeSend!=='function')fail('BEFORE_SEND_REQUIRED');verifyBeforeSend();
 const registryRoot=resolve(config.retention.directory),input={root:join(registryRoot,'cases',config.caseId),registryRoot,caseId:config.caseId,mode:synthetic?'SYNTHETIC_ONLY':'REAL',bindingSha256:hash({config,checkpoint}),authorizationSha256:hash(synthetic?{config,checkpoint}:approval.authorization),...(syntheticProtector?{protector:syntheticProtector}:{}),context:{config:structuredClone(config),checkpoint,inventory:approval?.inventory??null}};
 const journal=comparisonJournal.create(input);let server,port,lastStart=0,localRequests=0,attempts=0,stopped=false,failureClass=null,selection=null,stopReason=null;const records=[],skipped=[];
 try{
  if(synthetic){if(simulation.origin!=='SYNTHETIC_ONLY'||!Array.isArray(simulation.responses))fail('SIMULATION_REQUIRED');
   server=http.createServer((q,s)=>{const chunks=[];q.on('data',b=>chunks.push(b));q.on('end',()=>{const row=simulation.responses[localRequests++];
    if(!row||row.method!==q.method||row.path!==q.url||!same(Buffer.concat(chunks).length?JSON.parse(Buffer.concat(chunks)):null,row.body??null)){s.writeHead(422);s.end('{"error":"synthetic request mismatch"}');return;}
    if(row.timeout)return;s.writeHead(row.status??200,row.headers??{'content-type':'application/json'});s.end(row.raw??JSON.stringify(row.response));});});
   await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;}
  const send=async request=>{
   verifyBeforeSend();if(signal?.aborted)fail('INTERRUPTED');await new Promise(r=>setTimeout(r,Math.max(0,config.controls.pacingMs-(Date.now()-lastStart))));verifyBeforeSend();
   const {ordinal}=journal.reserve({kind:request.kind,hotelId:request.hotelId,offerId:request.offerId??null,requestBytes:Buffer.from(canonical(request)),checkpointSha256:input.bindingSha256});
   let raw,r={ordinal,kind:request.kind,intent:request,outcome:'SUCCEEDED',failureClass:null};
   try{lastStart=Date.now();attempts++;raw=await sendBoundedAcquisitionHttp(request,{credential,loopbackPort:port,timeoutMs:request.kind==='PREBOOK'?35000:20000,signal});
    if(credential&&(raw.bodyBytes.includes(Buffer.from(credential))||canonical(raw.headers).includes(credential)))fail('CREDENTIAL_ECHO_WITHHELD');
    r.response={status:raw.status,headers:raw.headers,body:pack(raw.bodyBytes)};
    if(request.kind==='SEARCH'){const c=inspectComparisonRate(r,config);if(!['SUCCESS','DOCUMENTED_NO_RESULTS'].includes(c.classification))fail(c.classification);}
    else if(raw.status!==200)fail('HTTP_'+raw.status);
    else if(request.kind==='HOTEL_DETAIL'){const c=inspectHotelDetailResponse(comparisonDocumentRecord(r,config.protocol),request.hotelId);if(!c.usable)fail(c.classification);}
    else {const d=decodeComparisonVerification(r,request,config);
     if(d.issue||d.issues.some(x=>/PROVIDER_ERROR|UNSUPPORTED_ERROR_SHAPE/.test(x))||config.protocol==='LITEAPI_DOCUMENTARY@1'&&!getDocumentaryPrebookId(comparisonDocumentRecord(r,config.protocol)))fail('PREBOOK_UNINTERPRETABLE_OR_ERROR');
    }
   }catch(e){
    const partial=e?.partialResponse;
    if(partial){try{if(!credential||!partial.bodyBytes.includes(Buffer.from(credential)))r.response={status:partial.status,headers:partial.headers,body:pack(partial.bodyBytes),partial:true};}finally{partial.bodyBytes.fill(0);}}
    r.outcome='FAILED';r.failureClass=classify(e);stopped=true;failureClass=r.failureClass;
   }
   finally{raw?.bodyBytes.fill(0);}
   // Same declared completion instant in record and authenticated journal event.
   r.completedAt=new Date().toISOString();
   journal.complete({ordinal,state:r.outcome,statusCode:r.response?.status??null,errorClass:r.failureClass,responseBytes:Buffer.from(canonical(r))});records.push(r);
   return r;
  };
  const search=await send(comparisonRequest(config,'SEARCH'));
  if(!stopped){const classification=inspectComparisonRate(search,config);
   if(classification.classification==='DOCUMENTED_NO_RESULTS')stopReason='DOCUMENTED_NO_RESULTS';
   else{selection=sealComparisonSelection(config,search);journal.sealSelection(selection);
    const targets=selection.selected.filter(t=>t.offerId!==null);
    if(targets.length<2)stopReason='PILOT_FEWER_THAN_TWO_BINDABLE_PROPERTIES';
    else{const details=new Map();for(const target of targets){details.set(target.hotelId,await send(comparisonRequest(config,'HOTEL_DETAIL',target)));if(stopped)break;}
     if(!stopped){const potential=targets.filter(t=>{const x=comparisonPrebookStop(config,search,t,details.get(t.hotelId));if(x.reasons.length)skipped.push({...t,...x});return !x.reasons.length;});
      if(potential.length<2)stopReason='PILOT_FEWER_THAN_TWO_POTENTIAL_PROPERTIES';
      else for(const t of potential){await send(comparisonRequest(config,'PREBOOK',t));if(stopped)break;}
     }
    }
   }
  }
 }catch(e){stopped=true;failureClass=classify(e);}finally{credential=null;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
 const receipt=journal.finish({status:stopped?'ABORTED':'COMPLETED'});
 return {version:'stayopti.comparison-acquisition-result@1',status:stopped?'ABORTED':'COMPLETE',failureClass,stopReason,skipped,actualAttempts:receipt.attemptsReserved,counts:receipt.counts,transportInvocations:attempts,localHttpRequests:localRequests,providerHttpRequests:synthetic?0:attempts,caseDirectory:input.root,registryRoot,journalVerified:true,custodyStartedAt:receipt.startedAt,retentionEndsAt:new Date(Date.parse(receipt.startedAt)+14*86400000).toISOString(),retentionResponsible:config.retention.responsible,automaticDeletion:false,engineInvocations:0,policyInvocations:0,restartAllowed:false,syntheticProofOnly:synthetic};
}
