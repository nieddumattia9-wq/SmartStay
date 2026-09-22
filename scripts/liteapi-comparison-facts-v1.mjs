// Authenticated bytes -> documentary facts. No engine and no authenticity from labels.
import {readAuthenticatedComparisonCapture,isAuthenticatedComparisonCapture,comparisonDocumentRecord,decodeComparisonVerification,decodeComparisonObservation} from './liteapi-comparison-capture-v1.mjs';
import {hash,same,fail} from './liteapi-comparison-plan-v1.mjs';
import {readDocumentaryResponse,inspectDocumentaryFiscal,documentaryDetail} from './liteapi-documentary-wire-v1.mjs';
import {compareMappedRoomObservation,inspectHotelDetailResponse} from './liteapi-room-detail-comparison-v1.mjs';
import {historicalCancellationInstants,qualifyHistoricalPropertyConditions} from './liteapi-historical-commercial-v1.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;},issued=new WeakSet();
export const isIssuedComparisonFacts=x=>Boolean(x&&issued.has(x));
const status=x=>['SATISFIED','COMPATIBLE'].includes(x)?'SUPPORTED':x==='INSUFFICIENT'?'VIOLATED':x==='CONFLICTING'?'CONFLICTING':'UNKNOWN';
const source=(p,pointer,scope='OFFER')=>({recordSha256:p.response.response.body.sha256,requestSha256:hash(p.request),pointer,observedAt:p.response.completedAt,scope,transformation:'AUTHENTICATED_DOCUMENTARY_COMPARISON@2'});
function terms(d){
 const c=historicalCancellationInstants(d.rate?.cancellationPolicies),tag=d.rate?.cancellationPolicies?.refundableTag;
 const infos=c.entries,first=infos.length===1?infos[0]:null;
 const texts=[d.hotel?.termsAndConditions,d.rate?.paymentTerms].filter(x=>typeof x==='string'&&x.trim());
 const payments=texts.flatMap(t=>[...t.matchAll(/(?:^|[;\n])\s*Payment: (pay now|pay later|mixed)\.?\s*(?=$|[;\n])/gi)].map(m=>m[1].toLowerCase()));
 return {roomName:typeof d.rate?.name==='string'?d.rate.name:null,mealPlan:d.rate?.boardName??null,
  cancellation:{refundable:tag==='RFN'?true:tag==='NRFN'?false:null,until:first?.instant??null,penalty:first?.original.amount??null,currency:first?.original.currency??null},
  cancellationStatus:c.status,payment:payments.length&&new Set(payments).size===1?payments[0].replace(' ','-'):'unknown',paymentTexts:texts};
}
function comparableCommercial(d){
 return {roomName:d.rate.name??null,meal:d.rate.boardName??null,rateId:d.rate.rateId,cancellation:historicalCancellationInstants(d.rate.cancellationPolicies),
  occupancy:[d.rate.occupancyNumber,d.rate.adultCount,d.rate.childCount],remarks:d.rate.remarks??null};
}
export function readComparisonFacts(locator){return normalizeAuthenticatedComparisonCapture(readAuthenticatedComparisonCapture(locator));}
export function normalizeAuthenticatedComparisonCapture(capture){
 if(!isAuthenticatedComparisonCapture(capture))fail('AUTHENTICATED_CAPTURE_REQUIRED');
 const {journal,records,selection}=capture,config=journal.context.config,s=config.scenario;
 if(journal.status!=='COMPLETED')fail('COMPLETED_CAPTURE_REQUIRED');
 const searchPair=records.find(p=>p.request.kind==='SEARCH');if(!searchPair?.response)fail('SEARCH_REQUIRED');
 const searchDoc=comparisonDocumentRecord(searchPair.response,config.protocol),payload=readDocumentaryResponse(searchDoc);
 const offers=[],seen=new Set();
 // Documented zero results has no invented candidates. Unknown schemas failed acquisition.
 const data=Array.isArray(payload?.data)?payload.data:[];
 for(const [hi,h]of data.entries())for(const [oi,o]of (h.roomTypes??[]).entries()){
  const target={hotelId:h.hotelId,offerId:o.offerId},pointer=`data[${hi}].roomTypes[${oi}]`,ref=source(searchPair,pointer);
  const observed=decodeComparisonObservation(searchPair.response,config,target),identity=hash(target),duplicate=seen.has(identity);seen.add(identity);
  const dp=records.find(p=>p.request.kind==='HOTEL_DETAIL'&&p.request.hotelId===h.hotelId),vp=records.find(p=>p.request.kind==='PREBOOK'&&p.request.hotelId===h.hotelId&&p.request.offerId===o.offerId);
  const detailRecord=dp?.response?comparisonDocumentRecord(dp.response,config.protocol):null,detail=detailRecord?inspectHotelDetailResponse(detailRecord,h.hotelId):null,detailRef=dp?source(dp,'data','PROPERTY'):null;
  const vd=vp?comparisonDocumentRecord(vp.response,config.protocol):null,verified=vd?decodeComparisonVerification(vp.response,vp.request,config):null;
  const selected=Boolean(selection?.selected.some(t=>t.hotelId===h.hotelId&&t.offerId===o.offerId));
  const compare=d=>d&&!d.issue?compareMappedRoomObservation({scenario:s},{...target,offerKey:hash(target),mappedRoomId:d.binding.mappedRoomId??observed.binding?.mappedRoomId,rateId:d.rate.rateId,rate:d.rate,roomText:d.rate.name??'',observedAt:ref.observedAt,responseSha256:ref.recordSha256,pointer,issues:d.issues},detailRecord):null;
  const base=(d,p,r)=>{
   if(!d||d.issue)return null;
   const rate=d.rate,fiscal=inspectDocumentaryFiscal(d,s.currency),prices=fiscal.priceQualification,cmp=compare(d),termsValue=terms(d);
   const party={adults:s.adults,children:s.childAges.length,childAges:[...s.childAges],units:s.units,checkIn:s.checkin,checkOut:s.checkout,currency:s.currency,source:source(searchPair,'request.body.occupancies','REQUEST')};
   const remarks=[rate.remarks,rate.cancellationPolicies?.hotelRemarks,d.offer.remarks,d.hotel.remarks].flat(Infinity).filter(x=>typeof x==='string'&&x.trim()).map(text=>({text,pointer:r.pointer+'.remarks',scope:'OFFER'}));
   const rest=termsValue.paymentTexts.map(text=>text.replace(/(?:^|[;\n])\s*Payment: (?:pay now|pay later|mixed)\.?\s*(?=$|[;\n])/gi,'').trim()).filter(Boolean);
   remarks.push(...rest.map(text=>({text,pointer:r.pointer+'.termsAndConditions',scope:'OFFER'})));
   const conditions=[...(detailRef?qualifyHistoricalPropertyConditions(detail?.property,party,rate.boardName,detailRef):[]),...qualifyHistoricalPropertyConditions(null,party,rate.boardName,r,remarks)];
   const minima=prices.fields.filter(f=>f.scope.endsWith('PUBLIC_MINIMUM'));
   return {identity:{provider:config.protocol==='LITEAPI_DOCUMENTARY@1'?'LiteAPI':'Synthetic Attestation',propertyId:h.hotelId,offerId:o.offerId,roomId:observed.binding?.mappedRoomId??null,providerVersion:{state:'UNKNOWN',reason:'NO_PROVIDER_REVISION_ATTESTED'},observationId:hash({sha256:ref.recordSha256,pointer}),originalOfferSha256:hash(o),source:ref},search:party,
    representationIssues:[...d.issues.filter(x=>!x.startsWith('RETURNED_CHILD_AGES_MISMATCH'))],childAgeEchoes:[d.hotel,d.offer,rate].flatMap(v=>['childrenAges','children','childAges'].filter(k=>Object.hasOwn(v,k)).map(k=>({field:k,value:v[k]}))),
    price:{observed:prices.fields.find(f=>f.field==='retailRate.total')?.parsed??null,publicMinimum:{applicability:minima.some(m=>m.presence==='PRESENT')?'APPLIES':'UNKNOWN',amounts:minima.filter(m=>m.parsed).map(m=>m.parsed),issues:prices.issues.filter(x=>x!=='OBSERVED_PUBLIC_PRICE_BELOW_SSP')},coverage:fiscal.representation==='NULL_ALL_INCLUDED'?'DOCUMENTED_ALL_INCLUDED':'UNKNOWN',components:fiscal.components.map(c=>({amount:c.sourceAmount,currency:c.currency??null,inclusion:c.included===true?'INCLUDED':c.included===false?'EXCLUDED':'UNKNOWN',kind:c.mandatory===false?'OPTIONAL':c.mandatory===true?'MANDATORY':'UNKNOWN',basis:['TOTAL_STAY','PER_STAY'].includes(c.calculationBasis)?'TOTAL_STAY':'UNKNOWN'})),issues:[...fiscal.issues.filter(x=>!prices.issues.includes(x)&&x!=='REMARKS_REQUIRE_COMMERCIAL_QUALIFICATION'),...(fiscal.representation==='COMPONENT_LIST'?['COMPONENT_LIST_EXHAUSTIVENESS_NOT_ATTESTED']:[])],source:r},
    accommodation:{capacity:status(cmp?.partyCapacityStatus),sleeping:status(cmp?.sleepingAssessment?.status),sourcesAgree:cmp?.compatibility==='CONFLICTING'?'CONFLICTING':cmp?.roomFound?'SUPPORTED':'UNKNOWN',issues:cmp?.issues??['MAPPED_ROOM_MISSING'],source:detailRef,originalComparison:cmp},conditions,
    terms:{meal:termsValue.mealPlan,cancellation:historicalCancellationInstants(rate.cancellationPolicies),cancellationStatus:termsValue.cancellationStatus,payment:termsValue.payment==='unknown'?'UNKNOWN':'KNOWN',source:r},
    availability:{state:d.issues.includes('NEGATIVE_AVAILABILITY_IN_RETURNED_RECORD')?'UNAVAILABLE':'OBSERVED_AVAILABLE',source:r},commercialVerification:'NOT_OBSERVED',sessionRetrieval:'NOT_OBSERVED',
    time:{observedAt:p.response.completedAt,detailObservedAt:dp?.response.completedAt??null,providerExpiryObservations:[readDocumentaryResponse(p===searchPair?searchDoc:vd),d.hotel,d.offer,rate].flatMap(x=>x?['validUntil','expiresAt'].filter(k=>Object.hasOwn(x,k)).map(k=>x[k]):[]),evaluatedAt:journal.events.at(-1).at},trace:{prices,fiscal,terms:termsValue,room:cmp,originalRate:structuredClone(rate)}};
  };
  const a=base(observed,searchPair,ref),b=vp?base(verified,vp,source(vp,'data.roomTypes[0]')):null;
  const continuityIssues=duplicate?['DUPLICATE_OBSERVATION_RETAINED_NOT_ANOTHER_ALTERNATIVE']:[];
  if(vp){if(vp.request.body.offerId!==o.offerId)continuityIssues.push('EXACT_OBSERVED_OFFER_REQUEST_REQUIRED');
   if(verified?.issue)continuityIssues.push(verified.issue);
   if(observed.rate&&verified?.rate){
    const ac=comparableCommercial(observed),bc=comparableCommercial(verified);
    // The shared cancellation comparator handles explicit-zone equivalent instants.
    const normalize=c=>({...c,cancellation:{status:c.cancellation.status,tag:c.cancellation.original?.refundableTag,entries:c.cancellation.entries.map(x=>({instant:x.instant,amount:x.original.amount,currency:x.original.currency}))}});
    if(!same(normalize(ac),normalize(bc)))continuityIssues.push('KNOWN_COMMERCIAL_TERMS_CHANGED_OR_UNRESOLVED');
    const at=terms(observed),bt=terms(verified);
    if(at.payment!=='unknown'&&at.payment!==bt.payment)continuityIssues.push('KNOWN_PAYMENT_TERMS_CHANGED');
    if(verified.binding.mappedRoomId!==null&&verified.binding.mappedRoomId!==observed.binding.mappedRoomId)continuityIssues.push('ROOM_CHANGED');
    if(verified.hotel.cancellationChanged===true||verified.hotel.boardChanged===true||Number(verified.hotel.priceDifferencePercent??0)!==0)continuityIssues.push('PROVIDER_DECLARED_COMMERCIAL_CHANGE');
   }
  }
  const prop=detail?.usable?detail.property:null;
  offers.push({key:hash({record:ref.recordSha256,pointer}),decisionOfferId:'offer-'+hash({propertyId:h.hotelId,providerOfferId:o.offerId}).slice(0,24),decisionIdMeaning:'LOCAL_ROUTING_ALIAS_NOT_PROVIDER_REVISION',selected,observed:a,verified:b,issues:[...(observed.issue?[observed.issue]:[]),...continuityIssues],
   continuity:{kind:'EXACT_OBSERVATION_REQUEST_RESPONSE',providerVersion:{state:'UNKNOWN'},observationSha256:hash(o),verificationRequest:vp?.request??null,verificationSource:vp?source(vp,'data'):null,sessionId:verified?.hotel?.prebookId??null,retrievalCount:0},
   merit:{name:typeof prop?.name==='string'?prop.name:h.hotelId,stars:typeof prop?.starRating==='number'?prop.starRating:null,features:prop?documentaryDetail(detailRecord,h.hotelId).facilityObservations.map(x=>x.value):[],reviewScore:null,reviewCount:null,ratingReason:'SCALE_LINK_NOT_QUALIFIED_BY_THIS_INGRESS'},
   originalSources:[ref,...(detailRef?[detailRef]:[]),...(vp?[source(vp,'data')]:[])]});
 }
 const result=freeze({version:'stayopti.authenticated-commercial-facts@2',origin:capture.origin,scenario:config.scenario,offers,sourceSetFingerprint:hash({journal:journal.lastEventSha256,selection}),journalFingerprint:journal.lastEventSha256,selection,observationWindow:records.filter(r=>r.response).map(r=>({kind:r.request.kind,at:r.response.completedAt})),engineInvocations:0,policyInvocations:0});issued.add(result);return result;
}
