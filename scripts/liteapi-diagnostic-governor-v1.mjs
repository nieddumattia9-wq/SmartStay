// D-0061: in-memory synthetic request ledger. This module has no network,
// credential, filesystem, production authorization or custody implementation.
import crypto from 'node:crypto';

export const LITEAPI_DIAGNOSTIC_GOVERNOR_VERSION='stayopti.liteapi-diagnostic-governor@1';
export const LITEAPI_DIAGNOSTIC_MODE='SYNTHETIC_ONLY';
export const LITEAPI_DIAGNOSTIC_LIMITS=Object.freeze({SEARCH:1,HOTEL_DETAIL:5,FACILITIES:1,PREBOOK:5,PREBOOK_GET:5,total:17,
  concurrency:1,retries:0,redirects:0,pagination:0,selectedHotels:5});
const allowedKinds=['SEARCH','HOTEL_DETAIL','FACILITIES','PREBOOK','PREBOOK_GET'];
const dataHost='api.liteapi.travel',bookHost='book.liteapi.travel';
const forbiddenKeys=/^(?:authorization|x-api-key|apiKey|api_key|cookie|password|credential|credentials|payment|voucher|additionalMarkup|margin)$/i;
const fail=code=>{throw Error('LITEAPI_DIAGNOSTIC_'+code);};
const clone=value=>structuredClone(value);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(value);
const utc=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value));
const compare=(a,b)=>a<b?-1:a>b?1:0;
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(plain(value))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export const canonicalLiteApiDiagnosticJson=value=>JSON.stringify(canonical(value));
export const hashLiteApiDiagnosticValue=value=>crypto.createHash('sha256').update(canonicalLiteApiDiagnosticJson(value)).digest('hex');
const bytesHash=value=>crypto.createHash('sha256').update(value).digest('hex');
const same=(a,b)=>canonicalLiteApiDiagnosticJson(a)===canonicalLiteApiDiagnosticJson(b);
function exactKeys(value,allowed){if(!plain(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail('UNSUPPORTED_FIELD');}
function scan(value){if(Array.isArray(value)){value.forEach(scan);return;}if(!plain(value))return;for(const[k,v]of Object.entries(value)){if(forbiddenKeys.test(k))fail('SECRET_OR_COMMERCIAL_REQUEST_FIELD');scan(v);}}
function pack(value){if(typeof value!=='string'&&!(value instanceof Uint8Array))fail('ORIGINAL_BYTES_REQUIRED');const b=Buffer.from(value);return {base64:b.toString('base64'),sha256:bytesHash(b),byteLength:b.length};}
function unpack(value){exactKeys(value,['base64','sha256','byteLength']);if(typeof value.base64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64))fail('RAW_ENCODING');
 const b=Buffer.from(value.base64,'base64');if(value.byteLength!==b.length||value.sha256!==bytesHash(b))fail('RAW_INTEGRITY');return b;}
export function readSyntheticLiteApiBody(body){try{return JSON.parse(unpack(body).toString('utf8'));}catch(e){if(String(e.message).startsWith('LITEAPI_DIAGNOSTIC_'))throw e;fail('RAW_JSON_INVALID');}}
function checkpointValid(value){exactKeys(value,['branch','head','inventorySha256']);if(!value.branch||typeof value.branch!=='string'||!/^[a-f0-9]{40}$/.test(value.head)||!/^[a-f0-9]{64}$/.test(value.inventorySha256))fail('CHECKPOINT_INVALID');}
function validateBinding(checkpoint,expectedCheckpoint,scenario,selectionPolicy){checkpointValid(checkpoint);checkpointValid(expectedCheckpoint);if(!same(checkpoint,expectedCheckpoint))fail('CHECKPOINT_MISMATCH');
 if(!plain(scenario)||scenario.mode!=='SYNTHETIC_ONLY'||!id(scenario.caseId)||!plain(scenario.searchRequest))fail('SYNTHETIC_SCENARIO_REQUIRED');
 exactKeys(selectionPolicy,['version','seed','maximumHotels']);if(selectionPolicy.version!=='HASHED_PROVIDER_IDS_AUDIT_ONLY@1'||!id(selectionPolicy.seed)||selectionPolicy.maximumHotels!==5)fail('SELECTION_POLICY_INVALID');
 scan(scenario.searchRequest);const q=scenario.searchRequest;
 if(q.limit!==20||q.maxRatesPerHotel!==3||q.includeHotelData!==true||q.roomMapping!==true||
  !Array.isArray(q.occupancies)||q.occupancies.length!==1||!q.currency||!q.checkin||!q.checkout||
  ['offset','page','pageToken','nextPage','cursor','sessionId'].some(k=>Object.hasOwn(q,k)))fail('SEARCH_REQUEST_SCOPE');
 return hashLiteApiDiagnosticValue({checkpoint,scenario,selectionPolicy,limits:LITEAPI_DIAGNOSTIC_LIMITS});}

// Provider identity is used ONLY for pre-result frozen sampling. Neither prices
// nor review scores, names, commissions or provider order influence the sample.
export function selectSyntheticLiteApiOffers(searchRecord,selectionPolicy,scenario){
 if(searchRecord?.kind!=='SEARCH'||searchRecord.state!=='SUCCEEDED')fail('SEARCH_NOT_VALIDATED');
 const payload=readSyntheticLiteApiBody(searchRecord.response.body);if(!plain(payload)||!Array.isArray(payload.data))fail('SEARCH_POOL_SCHEMA');
 const pool=new Map();
 for(const h of payload.data){if(!plain(h)||!id(h.hotelId)||!Array.isArray(h.roomTypes))fail('SEARCH_POOL_IDENTITY');
  if(pool.has(h.hotelId)){if(!same(pool.get(h.hotelId),h))fail('DUPLICATE_HOTEL_CONFLICT');continue;}pool.set(h.hotelId,h);}
 const bySeed=(type,hotelId,offerId=null)=>hashLiteApiDiagnosticValue(offerId===null?[selectionPolicy.seed,type,hotelId]:[selectionPolicy.seed,type,hotelId,offerId]);
 const selected=[...pool.keys()].sort((a,b)=>compare(bySeed('hotel',a),bySeed('hotel',b))||compare(a,b)).slice(0,5).map(hotelId=>{
  const raw=pool.get(hotelId),offers=new Map();let anomaly=null;
  for(const o of raw.roomTypes){if(!plain(o)||!id(o.offerId)){anomaly='OFFER_IDENTITY_UNPROVEN';continue;}
   if(offers.has(o.offerId)&&!same(offers.get(o.offerId),o))anomaly='DUPLICATE_OFFER_CONFLICT';else offers.set(o.offerId,o);}
  // Bind the one requested unit before commercial verification. A selected
  // hotel remains present if none of its offers has a single exact occupancy.
  // Do not sum rates or reinterpret an occupancy number as the guest count.
  const expected=scenario?.searchRequest?.occupancies?.[0];
  const bindable=[...offers.values()].filter(o=>{if(!Array.isArray(o.rates)||o.rates.length!==1)return false;const rate=o.rates[0];
   return rate.occupancyNumber===1&&rate.adultCount===expected?.adults&&rate.childCount===expected?.children?.length&&
    (!Object.hasOwn(rate,'children')||same(rate.children,expected.children))&&
    (!Object.hasOwn(rate,'occupancy')||same(rate.occupancy,expected));}).map(o=>o.offerId);
  const offerId=anomaly?null:bindable.sort((a,b)=>compare(bySeed('offer',hotelId,a),bySeed('offer',hotelId,b))||compare(a,b))[0]??null;
  return {hotelId,offerId,reason:anomaly??(offerId?'FIXED_HASH_SAMPLE_NOT_MERIT':'OFFER_OCCUPANCY_NOT_BINDABLE')};});
 return {version:selectionPolicy.version,seed:selectionPolicy.seed,searchResponseSha256:searchRecord.response.body.sha256,
  poolFingerprint:hashLiteApiDiagnosticValue([...pool.values()].sort((a,b)=>compare(a.hotelId,b.hotelId))),
  returnedHotelCount:pool.size,selected,providerOrderUsed:false,meritSelection:false,providerExhaustionCertified:false};
}

function normalizedIntent(intent){exactKeys(intent,['kind','method','host','path','query','bodyBytes','hotelId','offerId','prebookId','retryOrdinal','redirectCount','concurrency']);
 if(!allowedKinds.includes(intent.kind))fail('ENDPOINT_NOT_ALLOWED');
 if((intent.retryOrdinal??0)!==0)fail('RETRY_PROHIBITED');if((intent.redirectCount??0)!==0)fail('REDIRECT_PROHIBITED');if((intent.concurrency??1)!==1)fail('CONCURRENCY_PROHIBITED');
 const body=pack(intent.bodyBytes??'');let parsedBody=null;if(body.byteLength){parsedBody=readSyntheticLiteApiBody(body);scan(parsedBody);}
 const r={kind:intent.kind,hotelId:intent.hotelId??null,offerId:intent.offerId??null,prebookId:intent.prebookId??null,
  request:{method:intent.method,host:intent.host,path:intent.path,query:clone(intent.query??{}),body}};
 if(r.hotelId!==null&&!id(r.hotelId)||r.offerId!==null&&!id(r.offerId)||r.prebookId!==null&&!id(r.prebookId))fail('REQUEST_IDENTITY');
 return {r,parsedBody};}
function validateIntent(r,parsedBody,capture){
 if(!allowedKinds.includes(r.kind))fail('ENDPOINT_NOT_ALLOWED');
 const expected=r.kind==='SEARCH'?['POST',dataHost,'/v3.0/hotels/rates']:r.kind==='HOTEL_DETAIL'?['GET',dataHost,'/v3.0/data/hotel']:
  r.kind==='FACILITIES'?['GET',dataHost,'/v3.0/data/facilities']:r.kind==='PREBOOK'?['POST',bookHost,'/v3.0/rates/prebook']:
  ['GET',bookHost,'/v3.0/prebooks/'+r.prebookId];
 if(!same([r.request.method,r.request.host,r.request.path],expected))fail('ENDPOINT_NOT_ALLOWED');
 if(!same(r.request.query,r.kind==='HOTEL_DETAIL'?{hotelId:r.hotelId}:{}))fail('QUERY_NOT_ALLOWED');
 if(r.kind==='SEARCH'){
  if(r.hotelId!==null||r.offerId!==null||r.prebookId!==null||!same(parsedBody,capture.scenario.searchRequest))fail('SEARCH_REQUEST_SCOPE');
 }else{
  if(!capture.selection)fail('SEARCH_SELECTION_REQUIRED');
  if(r.kind==='FACILITIES'){if(r.hotelId!==null||r.offerId!==null||r.prebookId!==null)fail('REQUEST_IDENTITY');}
  else{const s=capture.selection.selected.find(x=>x.hotelId===r.hotelId);if(!s)fail('HOTEL_NOT_SELECTED');
   if(r.kind==='HOTEL_DETAIL'){if(r.offerId!==null||r.prebookId!==null)fail('REQUEST_IDENTITY');}
   else if(!s.offerId||r.offerId!==s.offerId)fail('OFFER_NOT_SELECTED');}
  if(r.kind==='PREBOOK'){
   if(r.prebookId!==null||!same(parsedBody,{offerId:r.offerId,usePaymentSdk:false}))fail('PREBOOK_BODY_NOT_ALLOWED');
  }else if(r.request.body.byteLength!==0)fail('GET_BODY_NOT_ALLOWED');
  if(r.kind==='PREBOOK_GET'){
   const prior=capture.requests.find(x=>x.kind==='PREBOOK'&&x.hotelId===r.hotelId&&x.offerId===r.offerId&&x.state==='SUCCEEDED');
   if(!prior||readSyntheticLiteApiBody(prior.response.body)?.data?.prebookId!==r.prebookId)fail('PREBOOK_ID_NOT_RETURNED');
  }
 }
 const duplicate=capture.requests.some(x=>x.kind===r.kind&&x.hotelId===r.hotelId);
 if(duplicate)fail('DUPLICATE_REQUEST');
 if(capture.requests.length>=17)fail('TOTAL_CAP_EXCEEDED');
 if(capture.requests.filter(x=>x.kind===r.kind).length>=LITEAPI_DIAGNOSTIC_LIMITS[r.kind])fail('ENDPOINT_CAP_EXCEEDED');
}
const recordHash=r=>{const{recordSha256,...material}=r;return hashLiteApiDiagnosticValue(material);};
const captureHash=c=>{const{captureSha256,...material}=c;return hashLiteApiDiagnosticValue(material);};
function responseRecord(value){if(!plain(value)||!Number.isInteger(value.status)||value.status<100||value.status>599)fail('RESPONSE_SCHEMA');
 if(value.redirected===true||value.status>=300&&value.status<400)fail('REDIRECT_RESPONSE');
 if(!plain(value.headers)||Object.keys(value.headers).some(k=>!['content-type','date'].includes(k.toLowerCase())))fail('RESPONSE_HEADER_NOT_ALLOWED');
 return {status:value.status,headers:clone(value.headers),body:pack(value.bodyBytes)};}
function rejectedResponse(value){if(!plain(value))return null;return {status:Number.isInteger(value.status)?value.status:null,
 body:typeof value.bodyBytes==='string'||value.bodyBytes instanceof Uint8Array?pack(value.bodyBytes):null,
 headerNames:plain(value.headers)?Object.keys(value.headers).sort():[]};}
function requestState(response){return response.status>=200&&response.status<300?'SUCCEEDED':'FAILED';}
function count(c){return Object.fromEntries([...allowedKinds.map(k=>[k,c.requests.filter(r=>r.kind===k).length]),['total',c.requests.length]]);}

export function createSyntheticLiteApiDiagnosticGovernor(options){
 exactKeys(options,['checkpoint','expectedCheckpoint','scenario','selectionPolicy','now','previousCapture']);
 if(options.previousCapture!==undefined)fail('RESUME_NOT_SUPPORTED_NEW_ATTEMPT_REQUIRED');
 const {checkpoint,expectedCheckpoint,scenario,selectionPolicy}=options;
 const bindingSha256=validateBinding(checkpoint,expectedCheckpoint,scenario,selectionPolicy);
 const now=options.now??(()=>new Date().toISOString());const sealedAt=now();if(!utc(sealedAt))fail('CLOCK_INVALID');
 let busy=false,finished=false,stopped=false;
 const c={version:LITEAPI_DIAGNOSTIC_GOVERNOR_VERSION,mode:LITEAPI_DIAGNOSTIC_MODE,checkpoint:clone(checkpoint),scenario:clone(scenario),
  selectionPolicy:clone(selectionPolicy),bindingSha256,sealedAt,selection:null,requests:[],status:'OPEN',abortReason:null,networkEnabled:false};
 const unchanged=()=>{if(validateBinding(checkpoint,expectedCheckpoint,scenario,selectionPolicy)!==bindingSha256)fail('SEALED_INPUT_CHANGED');};
 const snapshot=()=>{const out={...clone(c),counts:count(c)};return {...out,captureSha256:captureHash(out)};};
 return {
  snapshot,
  sealSelection(candidates){unchanged();if(busy||finished||stopped)fail('CAPTURE_NOT_OPEN');if(c.selection)fail('SELECTION_ALREADY_SEALED');
   let s;try{s=selectSyntheticLiteApiOffers(c.requests.find(r=>r.kind==='SEARCH'),selectionPolicy,scenario);}catch(error){
    stopped=true;c.status='ABORTED';c.abortReason=String(error.message);throw error;}
   if(candidates!==undefined&&!same(candidates,s.selected))fail('CALLER_SELECTION_POOL_MISMATCH');c.selection=s;return clone(s);},
  async send(intent,transport){unchanged();if(finished||stopped)fail('CAPTURE_NOT_OPEN');if(busy)fail('CONCURRENCY_PROHIBITED');
   if(!plain(transport)||transport.mode!=='SYNTHETIC_STUB'||typeof transport.request!=='function')fail('SYNTHETIC_STUB_REQUIRED');
   const{r,parsedBody}=normalizedIntent(intent);validateIntent(r,parsedBody,c);
   const startedAt=now();if(!utc(startedAt)||Date.parse(startedAt)<Date.parse(c.requests.at(-1)?.completedAt??sealedAt))fail('CLOCK_INVALID');
   Object.assign(r,{ordinal:c.requests.length+1,startedAt,completedAt:null,state:'IN_FLIGHT',response:null,rejectedResponse:null,failureClass:null,
    previousSha256:c.requests.at(-1)?.recordSha256??bindingSha256});r.recordSha256=recordHash(r);
   // Synchronous append/reservation precedes the first await and stub invocation.
   c.requests.push(r);busy=true;
   let rawResponse;
   try{rawResponse=await transport.request(clone(r));r.response=responseRecord(rawResponse);r.state=requestState(r.response);
    if(r.state==='SUCCEEDED')readSyntheticLiteApiBody(r.response.body);
    if(r.state==='FAILED')r.failureClass='HTTP_'+r.response.status;
    if([401,403].includes(r.response.status)||r.kind==='SEARCH'&&r.state==='FAILED')stopped=true;
   }catch(error){if(rawResponse!==undefined)r.rejectedResponse=rejectedResponse(rawResponse);r.state='FAILED';r.failureClass=error?.code==='ETIMEDOUT'||error?.name==='AbortError'?'TIMEOUT':
    String(error?.message??'').startsWith('LITEAPI_DIAGNOSTIC_')?String(error.message).slice('LITEAPI_DIAGNOSTIC_'.length):'STUB_TRANSPORT_FAILURE';
   if(r.kind==='SEARCH'||r.failureClass!=='TIMEOUT')stopped=true;
   }finally{busy=false;r.completedAt=now();if(!utc(r.completedAt)||Date.parse(r.completedAt)<Date.parse(r.startedAt)){
     r.completedAt=r.startedAt;r.state='FAILED';r.failureClass='CLOCK_INVALID';stopped=true;}
    r.recordSha256=recordHash(r);if(stopped)c.status='ABORTED';}
   return clone(r);
  },
  finish(){unchanged();if(busy)fail('IN_FLIGHT_REQUEST');if(finished)fail('CAPTURE_ALREADY_FINISHED');if(c.requests.length===0)fail('NO_CAPTURED_ATTEMPT');finished=true;
   c.status=stopped?'ABORTED':'COMPLETE';return snapshot();},
 };
}

/** Pure verifier: validates saved bytes, scope and full ordered attempt ledger.
 * It cannot resume/retry a request and does not certify a real provider capture. */
export function verifySyntheticLiteApiCapture(capture,{checkpoint,scenario,selectionPolicy}={}){
 if(capture?.version!==LITEAPI_DIAGNOSTIC_GOVERNOR_VERSION||capture.mode!==LITEAPI_DIAGNOSTIC_MODE||capture.networkEnabled!==false||
  !['COMPLETE','ABORTED'].includes(capture.status)||!utc(capture.sealedAt)||!Array.isArray(capture.requests)||capture.requests.length===0)fail('CAPTURE_SCHEMA');
 if(captureHash(capture)!==capture.captureSha256)fail('CAPTURE_INTEGRITY');
 const binding=validateBinding(capture.checkpoint,checkpoint,capture.scenario,capture.selectionPolicy);
 if(!same(capture.scenario,scenario)||!same(capture.selectionPolicy,selectionPolicy)||binding!==capture.bindingSha256)fail('CAPTURE_BINDING');
 const replay={...capture,selection:null,requests:[]};let previous=binding,lastAt=capture.sealedAt,aborted=false;
 for(const r of capture.requests){if(aborted)fail('REQUEST_AFTER_ABORT');if(r.ordinal!==replay.requests.length+1||r.previousSha256!==previous||recordHash(r)!==r.recordSha256)fail('LEDGER_CHAIN');
  if(!utc(r.startedAt)||!utc(r.completedAt)||Date.parse(r.startedAt)<Date.parse(lastAt)||Date.parse(r.completedAt)<Date.parse(r.startedAt))fail('LEDGER_TIME');
  if(r.kind!=='SEARCH'&&!replay.selection)replay.selection=selectSyntheticLiteApiOffers(replay.requests[0],selectionPolicy,scenario);
  const parsed=r.request.body.byteLength?readSyntheticLiteApiBody(r.request.body):null;unpack(r.request.body);validateIntent(r,parsed,replay);
  if(!['SUCCEEDED','FAILED'].includes(r.state))fail('LEDGER_STATE');
  if(r.rejectedResponse?.body)unpack(r.rejectedResponse.body);
  if(r.response){unpack(r.response.body);const checked=responseRecord({...r.response,bodyBytes:unpack(r.response.body)});
   const malformed=r.failureClass==='RAW_JSON_INVALID';
   if(malformed){let invalid=false;try{readSyntheticLiteApiBody(r.response.body);}catch{invalid=true;}if(!invalid||r.state!=='FAILED')fail('LEDGER_RESPONSE_STATE');}
   if(!same(checked,r.response)||!malformed&&r.state!==requestState(checked))fail('LEDGER_RESPONSE_STATE');
   if(r.state==='FAILED'&&!malformed&&r.failureClass!=='HTTP_'+r.response.status)fail('LEDGER_FAILURE_CLASS');}
  else if(r.state!=='FAILED'||!['TIMEOUT','STUB_TRANSPORT_FAILURE','RESPONSE_SCHEMA','RESPONSE_HEADER_NOT_ALLOWED','REDIRECT_RESPONSE','CLOCK_INVALID','ORIGINAL_BYTES_REQUIRED'].includes(r.failureClass))fail('LEDGER_FAILURE_CLASS');
  if(r.state==='SUCCEEDED'&&r.failureClass!==null)fail('LEDGER_FAILURE_CLASS');
  replay.requests.push(r);previous=r.recordSha256;lastAt=r.completedAt;
  aborted=r.response?[401,403].includes(r.response.status)||r.failureClass==='RAW_JSON_INVALID'||r.kind==='SEARCH'&&r.state==='FAILED':r.kind==='SEARCH'||r.failureClass!=='TIMEOUT';
 }
 if(capture.selection){const selection=selectSyntheticLiteApiOffers(replay.requests[0],selectionPolicy,scenario);if(!same(selection,capture.selection))fail('CAPTURE_SELECTION');}
 if(capture.abortReason!==null){let actual=null;try{selectSyntheticLiteApiOffers(replay.requests[0],selectionPolicy,scenario);}catch(error){actual=error.message;}
  if(capture.abortReason!==actual||capture.requests.length!==1||capture.selection!==null)fail('CAPTURE_ABORT_REASON');aborted=true;}
 if(!same(count(capture),capture.counts)||capture.status!==(aborted?'ABORTED':'COMPLETE'))fail('CAPTURE_COUNTS_OR_STATUS');
 return {valid:true,mode:LITEAPI_DIAGNOSTIC_MODE,actualStubRequests:capture.requests.length,externalHttpRequests:0,
  capture:clone(capture),kernelInvocations:0,policyInvocations:0};
}

/** Convenience orchestration for invented local fixtures only. Failed individual
 * offer observations remain recorded, with no retry or replacement candidate. */
export async function captureSyntheticLiteApiPlan(options){
 const{transport,...governorOptions}=options,g=createSyntheticLiteApiDiagnosticGovernor(governorOptions);
 await g.send({kind:'SEARCH',method:'POST',host:dataHost,path:'/v3.0/hotels/rates',bodyBytes:JSON.stringify(options.scenario.searchRequest)},transport);
 if(g.snapshot().status==='ABORTED')return g.finish();
 let selection;try{selection=g.sealSelection();}catch{return g.finish();}
 for(const s of selection.selected){await g.send({kind:'HOTEL_DETAIL',method:'GET',host:dataHost,path:'/v3.0/data/hotel',query:{hotelId:s.hotelId},hotelId:s.hotelId},transport);
  if(g.snapshot().status==='ABORTED')return g.finish();}
 await g.send({kind:'FACILITIES',method:'GET',host:dataHost,path:'/v3.0/data/facilities'},transport);
 if(g.snapshot().status==='ABORTED')return g.finish();
 for(const s of selection.selected){if(!s.offerId)continue;
  const p=await g.send({kind:'PREBOOK',method:'POST',host:bookHost,path:'/v3.0/rates/prebook',hotelId:s.hotelId,offerId:s.offerId,
   bodyBytes:JSON.stringify({offerId:s.offerId,usePaymentSdk:false})},transport);
  if(g.snapshot().status==='ABORTED')return g.finish();
  const prebookId=p.state==='SUCCEEDED'?readSyntheticLiteApiBody(p.response.body)?.data?.prebookId:null;
  if(id(prebookId))await g.send({kind:'PREBOOK_GET',method:'GET',host:bookHost,path:'/v3.0/prebooks/'+prebookId,hotelId:s.hotelId,offerId:s.offerId,prebookId},transport);
  if(g.snapshot().status==='ABORTED')return g.finish();
 }
 return g.finish();
}
