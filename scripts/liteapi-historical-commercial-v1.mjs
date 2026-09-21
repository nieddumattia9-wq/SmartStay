// D-0073: read-only historical LiteAPI boundary. No transport, key prompt or engine.
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {readCoverageOriginals} from './liteapi-search-coverage-capture-v1.mjs';
import {readAuthenticatedHotelDetails} from './liteapi-hotel-details-capture-v1.mjs';
import {createHotelDetailSourceBinding,compareHotelDetailCapture,inspectHotelDetailResponse} from './liteapi-room-detail-comparison-v1.mjs';
import {assertNoLinks,hash,same} from './liteapi-hotel-detail-plan-v1.mjs';
import {classifyCoverageRatesResponse} from './liteapi-search-coverage-diagnostics-v1.mjs';
import {decodeDocumentaryOffer,inspectDocumentaryFiscal,readDocumentaryResponse} from './liteapi-documentary-wire-v1.mjs';
import {interpretRoomPresentation} from './room-presentation-text-v1.mjs';
import {canonicalExplicitInstant} from '../server/shared/explicit-instant.mjs';

export const HISTORICAL_LITEAPI_VERSION='stayopti.authenticated-historical-liteapi@1.1';
export const HISTORICAL_CONDITIONS_VERSION='stayopti.historical-property-conditions@1.1';
const issued=new WeakSet(),clone=structuredClone;
const fail=c=>{throw Error('HISTORICAL_LITEAPI_'+c);};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export const isAuthenticatedHistoricalLiteApiFacts=x=>Boolean(x&&issued.has(x));
function inputAt(locator,syntheticProtector){
 if(!locator||Object.keys(locator).sort().join(',')!=='registryRoot,root')fail('LOCATOR_REQUIRED');
 const root=resolve(locator.root),registryRoot=resolve(locator.registryRoot);
 assertNoLinks(root);assertNoLinks(registryRoot);assertNoLinks(join(root,'header.json'));
 const header=JSON.parse(readFileSync(join(root,'header.json'),'utf8'));
 if(syntheticProtector&&header.binding.mode!=='SYNTHETIC_ONLY')fail('REAL_PROTECTOR_INJECTION_PROHIBITED');
 return {...header.binding,root,registryRoot,...(syntheticProtector?{protector:syntheticProtector}:{})};
}
const source=(pair,pointer,scope,transformation)=>({recordSha256:pair.response.response.body.sha256,requestSha256:hash(pair.request),pointer,
 observedAt:pair.response.completedAt,scope,transformation});
const status=x=>x==='SATISFIED'||x==='COMPATIBLE'?'SUPPORTED':x==='INSUFFICIENT'?'VIOLATED':x==='CONFLICTING'?'CONFLICTING':'UNKNOWN';
function expiryObservations(objects){return objects.flatMap(o=>['validUntil','expiresAt'].filter(k=>o&&Object.hasOwn(o,k)).map(k=>clone(o[k])));}

/** Bounded explicit GMT+calendar adaptation, not host timezone interpretation. */
export function historicalCancellationInstants(cancellation){
 const c=clone(cancellation??null);
 const infos=Array.isArray(c?.cancelPolicyInfos)?c.cancelPolicyInfos:[];
 const entries=infos.map(v=>{
  const raw=v.cancelTime,zone=v.timezone??c.timezone??null;
  const candidate=canonicalExplicitInstant(raw)!==null?raw:typeof raw==='string'&&/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?$/.test(raw)&&['GMT','UTC'].includes(zone)?raw.replace(' ','T')+'Z':null;
  return {original:clone(v),instant:candidate===null?null:canonicalExplicitInstant(candidate),timezoneOriginal:zone,
   transformation:candidate===raw?'EXPLICIT_OFFSET_INSTANT':candidate?'DOCUMENTED_GMT_UTC_FIELD_AND_CALENDAR':'UNSUPPORTED_NO_ZONE_INVENTED'};
 });
 const tag=c?.refundableTag,valid=entries.every(e=>e.instant!==null&&typeof e.original.amount==='number'&&Number.isFinite(e.original.amount)&&e.original.amount>=0&&/^[A-Z]{3}$/.test(e.original.currency??''));
 return {original:c,entries,status:tag==='NRFN'&&!infos.length?'SUPPORTED':tag==='RFN'&&infos.length&&valid?'SUPPORTED':'UNKNOWN',
  coverage:infos.length?'DECLARED_ENTRIES':'NO_DEADLINE_ENTRY_NOT_INFERRED'};
}

// Only complete nominal labels are presentation, never arbitrary title fields:
// a title containing an actual restriction must still be interpreted as content.
const nominalPolicyHeading=/^(?:children(?:\s+and\s+extra\s+beds)?|pets|general|guest type|check[- ]in\s*(?:&|and)\s*check[- ]out)[.:]?$/i;
const animalExemption=/^(?:service|assistance) animals? (?:are |is )?exempt from (?:pet )?(?:fees?|charges?|restrictions?)(?:\s*(?:\/|and)\s*(?:pet )?(?:fees?|charges?|restrictions?))*[.!]?$/i;
function independentConditionClauses(text){
 // Do not turn a consequent of if/when/unless into an unconditional statement.
 if(/\b(?:if|when|unless|provided|except)\b/i.test(text))return [text];
 const independent=/^(?:(?:pets?|(?:service|assistance) animals?|children)\s+(?:are|is|must|cannot)\b|(?:all|every|each)\s+(?:guests?|stays?|bookings?)\s+(?:must|are|is|incur|pay)\b|(?:(?:a|an|the)\s+)?(?:(?:mandatory|compulsory|service|resort|city|tourist|cleaning|facility|destination|additional|general)\s+)*(?:fees?|charges?|tax(?:es)?|surcharges?|supplements?)\s+(?:are|is|apply|applies|must|remain|remains)\b)/i;
 const cuts=/(?:,\s*(?:(?:and|but|while|however)\s+)?|\s+(?:and|but|while|however)\s+)/gi;
 const result=[];let start=0;
 for(const m of text.matchAll(cuts)){
  const left=text.slice(start,m.index).trim(),right=text.slice(m.index+m[0].length).trim();
  if(/\b(?:are|is|allowed|permitted|accepted|applies|apply|pay|payable|required|must|exempt)\b/i.test(left)&&independent.test(right)){
   result.push(left);start=m.index+m[0].length;
  }
 }
 result.push(text.slice(start).trim());return result;
}

/** Conditions are observations, NOT human confirmations or universal provider policy. */
export function qualifyHistoricalPropertyConditions(property,party,boardName,ref,rateTexts=[]){
 let context=null;
 const out=[],add=(code,text,subject,applicability,effect,pointer)=>out.push({code,text,subject,applicability,effect,
  source:{...ref,pointer,...(context?{scope:context.scope}:{})},
  ...(context?{interpretation:{version:HISTORICAL_CONDITIONS_VERSION,originalFieldText:context.originalFieldText,
   presentationText:context.presentationText,clauseText:text,role:code==='POLICY_HEADING'?'HEADING':'CONTENT',
   segmentation:'BOUNDED_INDEPENDENT_CLAUSES_NO_CONDITIONAL_SCOPE_PROMOTION'}}:{})});
 const applies=party.children>0?'APPLIES':'NOT_APPLICABLE';
 if(typeof property?.childAllowed==='boolean')add('PROPERTY_CHILD_ALLOWED',String(property.childAllowed),'ADMISSION',property.childAllowed?applies:applies==='NOT_APPLICABLE'?applies:'UNVERIFIED',property.childAllowed?'PERMITS':'PROHIBITS','data.childAllowed');
 else if(property&&Object.hasOwn(property,'childAllowed'))add('PROPERTY_CHILD_ALLOWED_UNINTERPRETABLE',JSON.stringify(property.childAllowed),'ADMISSION',applies,'REQUIRES_CONFIRMATION','data.childAllowed');
 const texts=[];
 if(typeof property?.hotelImportantInformation==='string')texts.push({text:property.hotelImportantInformation,pointer:'data.hotelImportantInformation',scope:'PROPERTY'});
 const walk=(v,p)=>{if(typeof v==='string')texts.push({text:v,pointer:p,scope:'PROPERTY'});else if(Array.isArray(v))v.forEach((x,i)=>walk(x,p+'['+i+']'));else if(v&&typeof v==='object')for(const k of Object.keys(v))if(k!=='id')walk(v[k],p+'.'+k);};
 walk(property?.policies,'data.policies');
 texts.push(...rateTexts);
 for(const item of texts){
  const normalized=interpretRoomPresentation(item.text);
  context={originalFieldText:item.text,presentationText:normalized.text,scope:item.scope??ref.scope};
  if(!normalized.supported){add('UNSUPPORTED_CONDITION_PRESENTATION',item.text,'ACCESSORY','UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);continue;}
  let priorPet=false;
  for(const text of normalized.text.split(/\r?\n|;|(?<=[.!?])\s+(?=[A-Z])/).map(t=>t.trim()).filter(Boolean).flatMap(independentConditionClauses)){
   if(nominalPolicyHeading.test(text)||item.pointer.startsWith('data.policies')&&/^POLICY_[A-Z_]+$/.test(text)){
    add('POLICY_HEADING',text,'ACCESSORY','NOT_APPLICABLE','INFORMATION_ONLY',item.pointer);priorPet=false;continue;
   }
   if(animalExemption.test(text)){
    // Exempt only the named subject from the named charges/restrictions. This
    // does not certify absence of fees for ordinary pets or for all guests.
    add('SCOPED_ANIMAL_EXEMPTION',text,'MONETARY','UNVERIFIED','INFORMATION_ONLY',item.pointer);priorPet=false;continue;
   }
   const monetary=/\b(?:fees?|tax(?:es)?|charges?|charged|surcharge|costs?|cleaning|deposit|supplement|EUR|USD|GBP|CAD|payment|payable)\b|[€$£]/i.test(text);
   const pet=/\bpets?\b/i.test(text),petContinuation=priorPet&&/^Plus\b/i.test(text)&&/\bcleaning\b/i.test(text)&&!/(?:tax|mandatory|compulsory)/i.test(text);
   priorPet=pet||petContinuation;
   if(/\b(?:children|kids) (?:are )?not (?:allowed|admitted)\b|\badults[- ]only\b/i.test(text))add('EXPLICIT_CHILD_ADMISSION_PROHIBITED',text,'ADMISSION',applies,'PROHIBITS',item.pointer);
   else if(!/\b(?:no|not|only|unless|except)\b/i.test(text)&&(/\b(?:children|child)\b.*\b(?:stay|stays) free\b/i.test(text)||/^children (?:are )?(?:welcome|allowed)[.!]?$/i.test(text))){
    // Free-child allowance is not a maximum number admitted; money is still rate-specific.
    add('CHILDREN_PRESENT_IN_PROPERTY_TERMS',text,'ADMISSION',applies,'PERMITS',item.pointer);
    if(/\bfree\b/i.test(text))add('CHILD_PRICING_APPLICATION_UNVERIFIED',text,'MONETARY',applies==='NOT_APPLICABLE'?applies:'UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);
   }else if(/\b(?:under|below) (?:the age of )?18\b|\bminors?\b/i.test(text)&&/\b(?:parent|guardian)\b/i.test(text))add('MINOR_ACCOMPANIMENT',text,'ACCOMPANIMENT',applies,'REQUIRES_CONFIRMATION',item.pointer);
   else if(/\b(?:photo|identification|identity|ID)\b.*\b(?:check[- ]?in|document|card)\b|\bidentification documents\b/i.test(text))add('CHECKIN_IDENTIFICATION',text,'IDENTIFICATION','APPLIES','REQUIRES_CONFIRMATION',item.pointer);
   else if(/\bspecial requests?\b/i.test(text))add('OPTIONAL_SPECIAL_REQUEST',text,'ACCESSORY','UNVERIFIED','INFORMATION_ONLY',item.pointer);
   else if(/\b(?:more than|over) (\d+) rooms?\b/i.test(text)){
    const n=Number(text.match(/\b(?:more than|over) (\d+) rooms?\b/i)[1]);add('ROOM_GROUP_THRESHOLD',text,'ACCESSORY',party.units<=n?'NOT_APPLICABLE':'APPLIES','REQUIRES_CONFIRMATION',item.pointer);
   }else if((pet||petContinuation)&&monetary&&/\b(?:mandatory|compulsory|must|all guests|every guest|each guest)\b/i.test(text))
    add('UNRESOLVED_COMPOUND_MONETARY_SCOPE',text,'MONETARY','UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);
   else if(pet||petContinuation)add('CONDITIONAL_PET_EXTRA',text,'MONETARY','UNVERIFIED','INFORMATION_ONLY',item.pointer);
   else if(/\bbreakfast\b/i.test(text)&&/^room\s*only$/i.test(boardName??''))add('OPTIONAL_BREAKFAST',text,'MONETARY','NOT_APPLICABLE','INFORMATION_ONLY',item.pointer);
   else if(/\bdeposit\b/i.test(text))add('DEPOSIT_SEPARATE_NOT_AUTOMATIC_STAY_COST',text,'ACCESSORY','UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);
   else if(/\bcash transactions?\b/i.test(text))add('CASH_PAYMENT_LIMIT_NOT_A_CHARGE',text,'ACCESSORY','UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);
   else if(/\b(?:child|children|kids|adults[- ]only)\b/i.test(text))add('UNINTERPRETED_FAMILY_CONDITION',text,'ADMISSION',applies==='NOT_APPLICABLE'?applies:'UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);
   else if(monetary)add('UNCLASSIFIED_MONETARY_CONDITION',text,'MONETARY','UNVERIFIED','REQUIRES_CONFIRMATION',item.pointer);
   else add('OTHER_CONDITION_RETAINED',text,'ACCESSORY','UNVERIFIED','INFORMATION_ONLY',item.pointer);
   if(/\b(?:child|children)\b/i.test(text)&&/\b(?:parent|guardian)\b/i.test(text)&&!out.some(e=>e.text===text&&e.subject==='ACCOMPANIMENT'))
    add('CHILD_ACCOMPANIMENT_IN_TERMS',text,'ACCOMPANIMENT',applies,'REQUIRES_CONFIRMATION',item.pointer);
  }
 }
 return out;
}

export function readHistoricalLiteApiFacts(locator){
 if(!locator||Object.keys(locator).some(k=>!['coverage','details','syntheticProtector'].includes(k)))fail('UNSUPPORTED_INPUT');
 // Neither this entry nor the readers construct a store or create directories.
 const coverage=readCoverageOriginals(inputAt(locator.coverage,locator.syntheticProtector));
 const details=locator.details?readAuthenticatedHotelDetails(inputAt(locator.details,locator.syntheticProtector)):null;
 if(coverage.journal.status!=='COMPLETED'||details&&details.journal.status!=='COMPLETED')fail('COMPLETED_HISTORY_REQUIRED');
 if(details&&details.journal.binding.mode!==coverage.journal.binding.mode)fail('ORIGIN_MISMATCH');
 const config=coverage.journal.context?.config;
 if(!config||!same(coverage.journal.context.config,config))fail('AUTHENTICATED_CONFIGURATION_REQUIRED');
 let sourceBinding=null,comparisons=[];
 if(details){
  const historical=details.journal.context.config.source;
  if(historical.caseId!==config.caseId||historical.configurationSha256!==coverage.journal.context.configFileSha256||historical.journalLastEventSha256!==coverage.journal.lastEventSha256)fail('DETAIL_TO_RATE_HISTORY_LINK_CHANGED');
  sourceBinding=createHotelDetailSourceBinding(coverage,{configuration:config,resultSha256:historical.resultSha256,configurationSha256:historical.configurationSha256,
   inventorySha256:historical.inventorySha256,sourceCheckpoint:historical.checkpoint,locator:historical.locator});
  if(!same(sourceBinding,historical))fail('DETAIL_TO_RATE_HISTORY_LINK_CHANGED');
  comparisons=compareHotelDetailCapture(sourceBinding,details).offers;
 }
 const offers=[],arms=[];
 for(const pair of coverage.records){
  if(!['CITY_RATES','ID_RATES'].includes(pair.request.kind))continue;
  const response=pair.response;if(!response?.response)fail('RATE_RESPONSE_MISSING');
  const raw=Buffer.from(response.response.body.base64,'base64');let classification;
  try{classification=classifyCoverageRatesResponse({bytes:raw,status:response.response.status,expectedSha256:response.response.body.sha256});}finally{raw.fill(0);}
  arms.push({operation:pair.request.kind,observedAt:response.completedAt,responseSha256:response.response.body.sha256,classification:classification.classification,reason:classification.reason});
  if(classification.classification==='DOCUMENTED_NO_RESULTS')continue;
  if(classification.classification!=='SUCCESS')fail('RATE_CLASSIFICATION_'+classification.classification);
  const payload=readDocumentaryResponse(response),rq=pair.request.body,occupancies=rq.occupancies;
  const requestParty=occupancies?.[0],search={checkIn:rq.checkin,checkOut:rq.checkout,currency:rq.currency,adults:requestParty?.adults,
   children:Array.isArray(requestParty?.children)?requestParty.children.length:null,childAges:clone(requestParty?.children??null),units:occupancies?.length,
   source:source(pair,'request.body.occupancies','REQUEST','ACTUAL_AUTHENTICATED_SEARCH_NO_OFFER_BACKFILL')};
  for(const [hi,h]of payload.data.entries())for(const [oi,o]of (h.roomTypes??[]).entries()){
   const pointer=`data[${hi}].roomTypes[${oi}]`,ref=source(pair,pointer,'OFFER','DOCUMENTARY_SEARCH_QUALIFIER@1'),record={...response,intent:{...pair.request,kind:'SEARCH'}};
   const d=decodeDocumentaryOffer(record,{hotelId:h.hotelId,offerId:o.offerId,scenario:{searchRequest:rq},stage:'SEARCH'});
   const rate=d.rate??{},comparison=comparisons.find(c=>c.rateResponseSha256===ref.recordSha256&&c.offerKey===hash({arm:pair.request.kind,responseSha256:ref.recordSha256,pointer}));
   const detailPair=details?.records.find(p=>p.request.hotelId===h.hotelId),detail=detailPair?inspectHotelDetailResponse(detailPair.response,h.hotelId):null;
   const detailRef=detailPair?source(detailPair,'data','PROPERTY','SEPARATE_LATER_PROPERTY_OBSERVATION_NO_RATE_REFRESH'):null;
   const fiscal=inspectDocumentaryFiscal(d,search.currency),price=fiscal.priceQualification;
   const conditions=detailRef?qualifyHistoricalPropertyConditions(detail?.property,search,rate.boardName,detailRef):[];
   // Tariff remarks are qualified with THEIR hash/time, not the later detail's.
   conditions.push(...qualifyHistoricalPropertyConditions(null,search,rate.boardName,ref,
    [['rates[0].remarks',rate.remarks],['rates[0].cancellationPolicies.hotelRemarks',rate.cancellationPolicies?.hotelRemarks],['remarks',o.remarks]].flatMap(([field,value])=>(Array.isArray(value)?value:[value]).filter(x=>typeof x==='string'&&x.trim()).map(text=>({text,pointer:pointer+'.'+field,scope:'OFFER'})))));
   const ssps=price.fields.filter(f=>f.scope.endsWith('PUBLIC_MINIMUM'));
   const issues=[...(d.issue?[d.issue]:[]),...d.issues];
   // Age equality uses the common D0072 semantics in the common qualifier below.
   const ageEchoes=[h,o,rate].flatMap(v=>['childrenAges','children','childAges'].filter(k=>Object.hasOwn(v,k)).map(k=>({value:clone(v[k]),field:k})));
   const facts={identity:{provider:'LiteAPI',propertyId:h.hotelId,offerId:o.offerId,roomId:d.binding?.mappedRoomId??null,
    providerVersion:{state:'UNKNOWN',reason:'NO_DOCUMENTED_PROVIDER_COMMERCIAL_REVISION_IN_RATES'},observationId:hash({body:ref.recordSha256,pointer}),originalOfferSha256:hash(o),source:ref},search,
    representationIssues:issues.filter(i=>!i.startsWith('RETURNED_CHILD_AGES_MISMATCH')),childAgeEchoes:ageEchoes,
    price:{observed:price.fields.find(f=>f.field==='retailRate.total').parsed,
     publicMinimum:{applicability:ssps.some(f=>f.presence==='PRESENT')?'APPLIES':'UNKNOWN',amounts:ssps.filter(f=>f.parsed).map(f=>f.parsed),issues:price.issues.filter(i=>i!=='OBSERVED_PUBLIC_PRICE_BELOW_SSP')},
     coverage:fiscal.representation==='NULL_ALL_INCLUDED'?'DOCUMENTED_ALL_INCLUDED':'UNKNOWN',components:fiscal.components.map(c=>({amount:c.sourceAmount,currency:c.currency??null,
      inclusion:c.included===true?'INCLUDED':c.included===false?'EXCLUDED':'UNKNOWN',kind:c.mandatory===false?'OPTIONAL':c.mandatory===true?'MANDATORY':'UNKNOWN',basis:['TOTAL_STAY','PER_STAY'].includes(c.calculationBasis)?'TOTAL_STAY':'UNKNOWN'})),
     issues:fiscal.issues.filter(i=>!price.issues.includes(i)&&i!=='REMARKS_REQUIRE_COMMERCIAL_QUALIFICATION'),source:ref},
    accommodation:{capacity:status(comparison?.partyCapacityStatus),sleeping:status(comparison?.sleepingAssessment?.status),
     sourcesAgree:comparison?.compatibility==='CONFLICTING'?'CONFLICTING':comparison?.roomFound?'SUPPORTED':'UNKNOWN',issues:comparison?.issues??['MAPPED_ROOM_NOT_ACQUIRED'],source:detailRef,originalComparison:comparison??null},
    conditions,terms:{meal:typeof rate.boardName==='string'?rate.boardName:null,cancellation:historicalCancellationInstants(rate.cancellationPolicies),cancellationStatus:historicalCancellationInstants(rate.cancellationPolicies).status,payment:'UNKNOWN',source:ref},
    availability:{state:issues.includes('NEGATIVE_AVAILABILITY_IN_RETURNED_RECORD')?'CONFLICTING':d.issue?'UNKNOWN':'OBSERVED_AVAILABLE',source:ref},
    commercialVerification:'NOT_OBSERVED',sessionRetrieval:'NOT_OBSERVED',
    time:{observedAt:ref.observedAt,detailObservedAt:detailRef?.observedAt??null,providerExpiryObservations:expiryObservations([payload,h,o,rate]),evaluatedAt:ref.observedAt},
    trace:{adapterVersion:HISTORICAL_LITEAPI_VERSION,ageEchoes,originalRate:clone(rate),prices:price,fiscal,propertyConditions:detail?.property?{
     childAllowed:clone(detail.property.childAllowed??null),policies:clone(detail.property.policies??null),hotelImportantInformation:clone(detail.property.hotelImportantInformation??null)}:null,
     detailUsability:detail?{usable:detail.usable,reason:detail.reason,source:detailRef}:null,offerSelectedForMerit:false}};
   offers.push(facts);
  }
 }
 const result=freeze({version:HISTORICAL_LITEAPI_VERSION,origin:coverage.journal.binding.mode==='REAL'?'AUTHENTICATED_HISTORICAL_PROVIDER':'AUTHENTICATED_SYNTHETIC_JOURNAL',
  offers,arms,sourceBindingSha256:sourceBinding?.bindingSha256??null,authentication:{method:'EXISTING_AES_GCM_JOURNAL_AND_CURRENT_USER_OR_EXPLICIT_SYNTHETIC_PROTECTOR',
   coverage:{caseId:coverage.journal.binding.caseId,lastEventSha256:coverage.journal.lastEventSha256,eventCount:coverage.journal.eventCount},
   details:details?{caseId:details.journal.binding.caseId,lastEventSha256:details.journal.lastEventSha256,eventCount:details.journal.eventCount}:null,
   sourceLink:details?'EXACT_AUTHENTICATED_HISTORICAL_SOURCE_BINDING':'NO_DETAILS_REQUESTED'},engineInvocations:0,policyInvocations:0});
 issued.add(result);return result;
}
