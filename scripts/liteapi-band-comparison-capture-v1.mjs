import {readFileSync} from 'node:fs';import {resolve,join} from 'node:path';
import {createBoundedAcquisitionJournalProfile} from './bounded-acquisition-journal-core-v1.mjs';
import {readDocumentaryResponse,getDocumentaryPrebookId} from './liteapi-documentary-wire-v1.mjs';
import {classifyCoverageRatesResponse} from './liteapi-search-coverage-diagnostics-v1.mjs';
import {inspectHotelDetailResponse} from './liteapi-room-detail-comparison-v1.mjs';
import {comparisonPrebookStop,decodeComparisonVerification} from './liteapi-comparison-capture-v1.mjs';
import {assessSspDirectObservation,prepareSspRequote,assessSspRequote,assessSspDirectPrebook,assessSspPrebook} from './liteapi-ssp-probe-v1.mjs';
import {BAND_CAPS,BAND_REGISTRY,validateBandPlan,bandRequest,bandProbePlan,bandComparisonContext,bandAuthorization,hash,same,bandFail,assertNoLinks} from './liteapi-band-comparison-plan-v1.mjs';

export function bandRateClassification(r){const bytes=Buffer.from(r.response.body.base64,'base64');try{return classifyCoverageRatesResponse({bytes,status:r.response.status,expectedSha256:r.response.body.sha256});}finally{bytes.fill(0);}}
export function sealBandSelection(c,r){
 validateBandPlan(c);const b=readDocumentaryResponse(r);if(!Array.isArray(b?.data)||b.data.length>c.controls.searchLimit)bandFail('SEARCH_WINDOW_UNSUPPORTED');
 const groups=new Map(),excluded=[];
 for(const [index,h]of b.data.entries()){
  if(typeof h?.hotelId!=='string'||!h.hotelId.length){excluded.push({index,reason:'PROPERTY_ID_UNINTERPRETABLE'});continue;}
  const g=groups.get(h.hotelId)??[];g.push({index,sha256:hash(h)});groups.set(h.hotelId,g);
 }
 const pool=[...groups].map(([hotelId,records])=>({hotelId,records,conflictingDuplicate:new Set(records.map(x=>x.sha256)).size>1}));
 pool.sort((a,b)=>hash([c.selection.seed,a.hotelId]).localeCompare(hash([c.selection.seed,b.hotelId]))||a.hotelId.localeCompare(b.hotelId));
 return {version:'stayopti.band-selection@1',planSha256:hash(c),searchSha256:r.response.body.sha256,pool,excluded,selected:pool.slice(0,10),
  criteria:'HASHED_PROPERTY_THEN_HASHED_OFFER_NO_PRICE_NO_REPLACEMENT',maximumOffersPerSelectedProperty:1};
}
/** Deterministic, pure progression. Replayed against authenticated originals.
 * No request beyond this prefix can be sent or accepted by the reader. */
export function bandProgress(c,records){
 validateBandPlan(c);let cursor=0,selection=null;const offers=[];
 const take=q=>{if(cursor===records.length)return null;const r=records[cursor++];if(!same(r.intent,q))bandFail('REQUEST_NOT_DERIVED_FROM_AUTHENTICATED_PREFIX');return r;};
 const finish=extra=>{if(cursor!==records.length)bandFail('UNPLANNED_EXTRA_RECORD');return {selection,offers,next:null,engineInvocations:0,...extra};};
 const next=q=>({selection,offers,next:q,engineInvocations:0});
 const searchRequest=bandRequest(c,'SEARCH'),search=take(searchRequest);if(!search)return next(searchRequest);
 if(search.outcome!=='SUCCEEDED')return finish({status:'ABORTED'});
 if(bandRateClassification(search).classification==='DOCUMENTED_NO_RESULTS')return finish({status:'INCOMPLETE_SAMPLE_NO_RESULTS'});
 selection=sealBandSelection(c,search);
 for(const member of selection.selected){
  const p=bandProbePlan(c,member.hotelId,search.response.body.sha256);
  if(member.records.length!==1){offers.push({hotelId:member.hotelId,status:'EXCLUDED',reasons:['DUPLICATE_PROPERTY_REQUIRES_QUALIFICATION'],originalRecords:member.records});continue;}
  const hs=readDocumentaryResponse(search).data[member.records[0].index];
  if(!Array.isArray(hs.roomTypes)||hs.roomTypes.length>c.controls.maxRatesPerHotel){offers.push({hotelId:member.hotelId,status:'EXCLUDED',reasons:['OFFER_WINDOW_UNSUPPORTED']});continue;}
  let a=assessSspDirectObservation(p,search),observation=search,requote=null;
  const entry={hotelId:member.hotelId,initial:a,initialTarget:a.target??null};
  if(!a.prebookRequest){
   const onlyPrice=a.reasons.every(x=>['OBSERVED_PUBLIC_PRICE_BELOW_SSP','RETURNED_PRICE_BELOW_MINIMUM','RETURNED_PRICE_ABOVE_COMMERCIAL_BAND'].includes(x));
   if(!onlyPrice){offers.push({...entry,status:'EXCLUDED',reasons:a.reasons});continue;}
   const prepared=prepareSspRequote(p,search);
   if(!prepared.request){offers.push({...entry,status:'EXCLUDED',reasons:prepared.reasons});continue;}
   requote=take(prepared.request);if(!requote)return next(prepared.request);
   if(requote.outcome!=='SUCCEEDED')return finish({status:'ABORTED'});
   if(bandRateClassification(requote).classification==='DOCUMENTED_NO_RESULTS'){offers.push({...entry,status:'EXCLUDED',reasons:['REQUOTE_DOCUMENTED_NO_RESULTS']});continue;}
   const requoteBody=readDocumentaryResponse(requote);
   if(!Array.isArray(requoteBody.data)||requoteBody.data.length!==1||requoteBody.data[0]?.hotelId!==member.hotelId||
    !Array.isArray(requoteBody.data[0]?.roomTypes)||requoteBody.data[0].roomTypes.length>c.controls.maxRatesPerHotel){
    offers.push({...entry,status:'EXCLUDED',reasons:['REQUOTE_PROPERTY_OR_OFFER_WINDOW_UNSUPPORTED'],responseSha256:requote.response.body.sha256});continue;
   }
   a=assessSspRequote(p,search,requote);observation=requote;
   if(!a.prebookRequest){offers.push({...entry,status:'EXCLUDED',requoteAssessment:a,reasons:a.reasons});continue;}
  }
  const detailRequest=bandRequest(c,'HOTEL_DETAIL',a.target),detail=take(detailRequest);if(!detail)return next(detailRequest);
  if(detail.outcome!=='SUCCEEDED')return finish({status:'ABORTED'});
  const room=comparisonPrebookStop(bandComparisonContext(c),observation,a.target,detail);
  if(room.reasons.length){offers.push({...entry,target:a.target,observationSha256:observation.response.body.sha256,status:'EXCLUDED',reasons:room.reasons});continue;}
  const prebook=take(a.prebookRequest);if(!prebook)return next(a.prebookRequest);
  if(prebook.outcome!=='SUCCEEDED')return finish({status:'ABORTED'});
  const assessment=requote?assessSspPrebook(p,search,requote,prebook):assessSspDirectPrebook(p,observation,prebook);
  offers.push({...entry,target:a.target,observationSha256:observation.response.body.sha256,status:assessment.status==='STOP'?'EXCLUDED':'PREBOOK_OBSERVED_REQUIRES_A02_PREPARATION',reasons:assessment.reasons,assessment});
 }
 const count=offers.filter(o=>o.status==='PREBOOK_OBSERVED_REQUIRES_A02_PREPARATION').length;
 return finish({status:count>=10?'ACQUISITION_SAMPLE_AWAITS_A02_QUALIFICATION':'INCOMPLETE_SAMPLE',commerciallyObservedProperties:count,requiredDistinctProperties:10,qualificationNotCertifiedByAcquisition:true});
}
export const bandJournal=createBoundedAcquisitionJournalProfile({version:'stayopti.band-comparison-journal@1',registryDirectory:BAND_REGISTRY,caps:BAND_CAPS,errorPrefix:'BAND_',selection:true,subjectKinds:['REQUOTE','HOTEL_DETAIL','PREBOOK'],
 validateContext(i,x){validateBandPlan(x?.config);if(i.caseId!==x.config.caseId||hash({config:x.config,checkpoint:x.checkpoint})!==i.bindingSha256||(i.mode==='REAL')!==(x.config.origin==='LITEAPI_PRODUCTION')||i.mode==='REAL'&&i.authorizationSha256!==hash(bandAuthorization(x.config,x.inventory)))bandFail('JOURNAL_CONTEXT');},
 validateSelection(s,x){if(s?.version!=='stayopti.band-selection@1'||s.planSha256!==hash(x.config)||!Array.isArray(s.selected)||s.selected.length>10)bandFail('SELECTION');},
 validateRequest({context,request,kind,snapshot}){
  if(request.kind!==kind||snapshot.requests.some(r=>r.state==='FAILED')||kind==='SEARCH'&&snapshot.attemptsReserved!==0||kind!=='SEARCH'&&!snapshot.selection)bandFail('REQUEST_SEQUENCE');
  let expected;
  if(kind==='REQUOTE'){
   if(typeof request.hotelId!=='string'||!Number.isFinite(request.body?.margin)||request.body.margin<0)bandFail('REQUOTE_SCOPE');
   const initial=bandRequest(context.config,'SEARCH');delete initial.body.cityName;delete initial.body.countryCode;
   expected={...initial,kind,hotelId:request.hotelId,body:{...initial.body,hotelIds:[request.hotelId],limit:1,margin:request.body.margin}};
  }else expected=bandRequest(context.config,kind,kind==='SEARCH'?null:{hotelId:request.hotelId,offerId:request.offerId??'detail-only'});
  if(!same(expected,request))bandFail('REQUEST_OUTSIDE_PROFILE');
 }
});
const issued=new WeakSet(),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export const isAuthenticatedBandCapture=x=>!!x&&issued.has(x);
export function readAuthenticatedBandCapture(locator){
 if(Object.keys(locator).some(k=>!['root','registryRoot','syntheticProtector'].includes(k)))bandFail('LOCATOR');
 const root=resolve(locator.root),registryRoot=resolve(locator.registryRoot);assertNoLinks(root);assertNoLinks(registryRoot);
 const h=JSON.parse(readFileSync(join(root,'header.json')));if(locator.syntheticProtector&&h.binding.mode!=='SYNTHETIC_ONLY')bandFail('REAL_PROTECTOR_INJECTION');
 const input={...h.binding,root,registryRoot,...(locator.syntheticProtector?{protector:locator.syntheticProtector}:{})};
 const journal=bandJournal.verify(input);
 const read=(ordinal,direction)=>{const b=bandJournal.decrypt({...input,ordinal,direction});try{return JSON.parse(b);}finally{b.fill(0);}};
 const records=journal.requests.map(e=>{const request=read(e.ordinal,'request'),response=e.response?read(e.ordinal,'response'):null;
  if(response&&(!same(response.intent,request)||response.ordinal!==e.ordinal||response.kind!==e.kind||response.outcome!==e.state||!Number.isFinite(Date.parse(response.completedAt))||Date.parse(response.completedAt)<Date.parse(e.reservedAt)||Date.parse(response.completedAt)>Date.parse(e.completedAt)))bandFail('RECORD_JOURNAL_LINK');return {request,response};});
 const sequence=records.map(r=>r.response).filter(Boolean),progress=bandProgress(journal.context.config,sequence);
 const selection=journal.selection?read(0,'selection'):null;
 if(selection&&!same(selection,progress.selection))bandFail('SELECTION_CHANGED');
 if(journal.status==='COMPLETED'&&progress.next)bandFail('INCOMPLETE_FINISHED_SEQUENCE');
 const capture=freeze({version:'stayopti.authenticated-band-capture@1',journal,records,selection,progress,origin:input.mode==='REAL'?'AUTHENTICATED_PROVIDER':'AUTHENTICATED_SYNTHETIC',engineInvocations:0});issued.add(capture);return capture;
}
export function qualifyBandResponse(request,r,config){
 if(['SEARCH','REQUOTE'].includes(request.kind)){const x=bandRateClassification(r);if(!['SUCCESS','DOCUMENTED_NO_RESULTS'].includes(x.classification))bandFail(r.response.status>=400?'HTTP_'+r.response.status:x.classification);return;}
 if(r.response.status!==200)bandFail('HTTP_'+r.response.status);
 if(request.kind==='HOTEL_DETAIL'){if(!inspectHotelDetailResponse(r,request.hotelId).usable)bandFail('DETAIL_UNUSABLE');}
 else {
  const d=decodeComparisonVerification(r,request,bandComparisonContext(config));
  if(d.issue||d.issues.some(x=>/PROVIDER_ERROR|UNSUPPORTED_ERROR_SHAPE/.test(x))||!getDocumentaryPrebookId(r))bandFail('PREBOOK_UNINTERPRETABLE_OR_ERROR');
 }
}
