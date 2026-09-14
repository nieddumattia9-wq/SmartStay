// D-0061. Evaluation-only fresh observations, NEVER a REVIEWED/SYNTHETIC bypass.
// No transport, credentials, provider imports, filesystem, or automatic execution.
import {createHash} from 'node:crypto';
import {verifySyntheticLiteApiCapture} from './liteapi-diagnostic-governor-v1.mjs';
import {DIAGNOSTIC_REQUIREMENTS_VERSION,evaluateDiagnosticOfferRequirements,normalizeItalianBedInventory} from './diagnostic-offer-requirements-v1.mjs';
import {OBSERVED_EXECUTION_VERSION,reprojectObservedRequirementCandidate} from './observed-offer-execution-v1.mjs';
import {resolveScopedService,serviceCodes} from './diagnostic-scoped-signals-v1.mjs';

export const LITEAPI_OBSERVATION_VERSION='stayopti.liteapi-fresh-observation-diagnostic@1.1';
export const SUPPORTED_WIRE_PROFILE='liteapi-v3-roomTypes-rates-exact-retrieval@1';
export const LIVE_TRANSPORT_ENABLED=false;
const clone=x=>structuredClone(x);
const canonical=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
export const observationHash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const equal=(a,b)=>canonical(a)===canonical(b);
const fail=c=>{throw Error('LITEAPI_OBSERVATION_'+c);};
const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const text=v=>typeof v==='string'&&v.trim().length>0;
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const present=(o,k)=>o!=null&&Object.prototype.hasOwnProperty.call(o,k);
const amount=v=>num(v)?v:typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)?Number(v):null;
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const requirements=['sleepingPlaces','capacity','childAdmission','exclusiveUse','privateBathroom'];

function body(record){
 if(!record?.response)return null;
 const b=record.response.body,bytes=Buffer.from(b.base64,'base64');
 if(createHash('sha256').update(bytes).digest('hex')!==b.sha256||bytes.length!==b.byteLength)fail('RESPONSE_BYTES');
 if(record.response.status<200||record.response.status>=300)return null;
 if(!String(record.response.headers['content-type']??'').includes('application/json'))return null;
 try{return JSON.parse(bytes.toString('utf8'));}catch{return null;}
}
function requestBody(record){
 try{return JSON.parse(Buffer.from(record.request.body.base64,'base64').toString('utf8'));}catch{fail('REQUEST_JSON');}
}
function link(record,field){return [{field,evidence:[{ref:'capture/request/'+record.ordinal+'/response',sha256:record.response.body.sha256}]}];}
function claim(value,scope,record,field,reason,applicability='OFFER_SCOPED',state=null){
 return {state:state??(value===null?'UNKNOWN':'KNOWN'),value:clone(value),scope:clone(scope),reason,
  applicability,observedAt:record?.completedAt??null,timeSource:record?'LOCAL_CAPTURE_COMPLETED_NOT_INDEPENDENT_TIMESTAMP':null,
  links:record?.response?link(record,field):[]};
}
function unknown(scope,reason,record=null,field='missing'){return claim(null,scope,record,field,reason,'UNVERIFIED');}
function mismatch(condition,code,issues){if(condition)issues.push(code);}

/** Raw fiscal distinctions survive in observations; only explicit supported
 * semantics produce a complete total. No currency conversion or cache expiry. */
export function inspectLiteApiFiscalEvidence(offer,rate,currency,contextRemarks=[]){
 const issues=[],sources=[];
 const retail=offer?.offerRetailRate??rate?.offerRetailRate;
 const base=amount(retail?.amount);
 if(base===null||retail?.currency!==currency)issues.push('RETAIL_AMOUNT_OR_CURRENCY_UNVERIFIED');
 if(offer?.offerRetailRate&&rate?.offerRetailRate&&!equal(offer.offerRetailRate,rate.offerRetailRate))issues.push('NESTED_RETAIL_TOTAL_CONFLICT');
 const suggested=offer?.suggestedSellingPrice??rate?.suggestedSellingPrice;
 if(suggested&&(amount(suggested.amount)!==base||suggested.currency!==currency))issues.push('SELLING_AND_PREBOOK_PRICE_BASIS_DIFFER');
 const nested=rate?.retailRate?.total;
 if(nested!==undefined&&(!Array.isArray(nested)||nested.length!==1||amount(nested[0]?.amount)!==base||nested[0]?.currency!==currency))issues.push('RATE_AND_OFFER_TOTAL_CONFLICT');
 if(present(rate,'taxesAndFees'))sources.push({field:'taxesAndFees',value:rate.taxesAndFees});
 if(present(offer,'taxesAndFees'))sources.push({field:'offer.taxesAndFees',value:offer.taxesAndFees});
 if(rate.retailRate&&present(rate.retailRate,'taxesAndFees'))sources.push({field:'retailRate.taxesAndFees',value:rate.retailRate.taxesAndFees});
 if(sources.length>1&&sources.some(s=>!equal(sources[0].value,s.value)))issues.push('FISCAL_SOURCES_CONFLICT');
 const value=sources[0]?.value;
 const representation=!sources.length?'OMITTED':value===null?'NULL_ALL_INCLUDED':Array.isArray(value)?value.length?'COMPONENT_LIST':'EMPTY_LIST':'UNSUPPORTED';
 if(['OMITTED','EMPTY_LIST','UNSUPPORTED'].includes(representation))issues.push('TAX_COVERAGE_UNDOCUMENTED_'+representation);
 const components=[],byCurrency={},payAtProperty=[];
 if(Array.isArray(value))for(const item of value){
  const n=amount(item?.amount),c=item?.currency;
  const basis=item?.basis??item?.calculationBasis??null;
  components.push({...clone(item),sourceAmount:n,calculationBasis:basis,
   interpretation:'PROVIDER_AGGREGATED_COMPONENT_NO_GUEST_OR_NIGHT_MULTIPLICATION'});
  if(n===null||!text(c)||typeof item?.included!=='boolean')issues.push('FISCAL_COMPONENT_UNSUPPORTED');
  if(c!==currency)issues.push('MIXED_CURRENCY_NO_DOCUMENTED_CONVERSION');
  if(basis!==null&&!['TOTAL_STAY','PER_STAY'].includes(basis))issues.push('COMPONENT_BASIS_NOT_AGGREGATED');
  if(item?.mandatory===false)issues.push('OPTIONAL_COMPONENT_NOT_COMPLETE_TOTAL_PROOF');
  if(n!==null&&text(c))byCurrency[c]=round((byCurrency[c]??0)+n);
  if(item?.included===false)payAtProperty.push(clone(item));
 }
 const remarks=[rate?.remarks,rate?.cancellationPolicies?.hotelRemarks,offer?.remarks,contextRemarks].flat(Infinity).filter(v=>typeof v==='string'&&v.trim());
 // No universal prose interpreter: any additional condition is retained and
 // requires qualification rather than silently certifying all mandatory costs.
 if(remarks.length)issues.push('REMARKS_REQUIRE_COMMERCIAL_QUALIFICATION');
 const excluded=payAtProperty.reduce((n,c)=>n+(amount(c.amount)??0),0);
 return {representation,sources:clone(sources),components,amountsByCurrency:byCurrency,payAtProperty,remarks,
  observedRetail:clone(retail??null),suggestedSellingPrice:clone(suggested??null),baseAmount:base,
  completeTotal:issues.length?null:round(base+excluded),currency,issues:[...new Set(issues)],
  nullSemanticsSource:'https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure',
  excludedPaymentSemantics:'EXCLUDED_COMPONENTS_PAYABLE_AT_PROPERTY_NOT_CHARGED_NOW',
  internalCacheTtlUsed:false,fxApplied:false,guestAmountsInvented:false};
}

function decodeSelected(payload,hotelId,offerId){
 const data=payload?.data;
 const hotels=Array.isArray(data)?data:data&&typeof data==='object'?[data]:[];
 const hotel=hotels.filter(h=>h.hotelId===hotelId);
 if(hotel.length!==1)return {issue:'PROPERTY_IDENTITY_MISSING_OR_AMBIGUOUS'};
 if(!Array.isArray(hotel[0].roomTypes))return {issue:'OFFER_CONTAINER_SHAPE_UNSUPPORTED'};
 const matches=hotel[0].roomTypes.filter(o=>o?.offerId===offerId);
 // Conservative declared profile. Other LiteAPI versions/shapes are retained
 // but not normalized through price-only/single-record fallback.
 if(matches.length!==1||!Array.isArray(matches[0].rates)||matches[0].rates.length!==1)return {issue:'EXACT_OFFER_OR_SINGLE_OCCUPANCY_SHAPE_UNSUPPORTED'};
 return {hotel:hotel[0],offer:matches[0],rate:matches[0].rates[0]};
}
function validateScope(decoded,scenario,prior=null){
 const issues=[],r=decoded.rate,s=scenario.searchRequest,o=s.occupancies[0];
 mismatch(!text(r.rateId)||!text(r.mappedRoomId),'RATE_OR_MAPPED_ROOM_ID_MISSING',issues);
 mismatch(r.occupancyNumber!==1||r.adultCount!==o.adults||r.childCount!==o.children.length,'OCCUPANCY_NOT_EXACT',issues);
 for(const entity of [decoded.hotel,decoded.offer,r]){
  for(const key of ['checkin','checkout','currency'])if(present(entity,key))mismatch(entity[key]!==s[key],'RETURNED_'+key.toUpperCase()+'_MISMATCH',issues);
  if(present(entity,'children'))mismatch(!equal(entity.children,o.children),'RETURNED_CHILD_AGES_MISMATCH',issues);
  if(present(entity,'childAges'))mismatch(!equal(entity.childAges,o.children),'RETURNED_CHILD_AGES_MISMATCH',issues);
  if(present(entity,'adults'))mismatch(entity.adults!==o.adults,'RETURNED_ADULTS_MISMATCH',issues);
  if(present(entity,'occupancy'))mismatch(!equal(entity.occupancy,o),'RETURNED_OCCUPANCY_MISMATCH',issues);
  if(present(entity,'occupancies'))mismatch(!equal(entity.occupancies,s.occupancies),'RETURNED_OCCUPANCIES_MISMATCH',issues);
  if(present(entity,'offerId'))mismatch(entity.offerId!==decoded.offer.offerId,'NESTED_OFFER_ID_CONFLICT',issues);
  if(entity.bookable===false||entity.available===false)mismatch(true,'NEGATIVE_AVAILABILITY_IN_RETURNED_RECORD',issues);
  if(entity.error!=null||Array.isArray(entity.errors)&&entity.errors.length)mismatch(true,'LOGICAL_ERROR_IN_RETURNED_RECORD',issues);
 }
 if(prior){
  mismatch(r.rateId!==prior.rate.rateId||r.mappedRoomId!==prior.rate.mappedRoomId,'RATE_OR_ROOM_CHANGED_NEW_OBSERVATION_NOT_OLD_CERTIFICATE',issues);
 }
 return issues;
}
function commercial(decoded){return {rateId:decoded.rate.rateId,mappedRoomId:decoded.rate.mappedRoomId,
  adultCount:decoded.rate.adultCount,childCount:decoded.rate.childCount,occupancyNumber:decoded.rate.occupancyNumber,
  maxOccupancy:decoded.rate.maxOccupancy??null,children:decoded.rate.children??null,childAges:decoded.rate.childAges??null,
  offerRetailRate:decoded.offer.offerRetailRate??decoded.rate.offerRetailRate??null,
  suggestedSellingPrice:decoded.offer.suggestedSellingPrice??decoded.rate.suggestedSellingPrice??null,
  taxesAndFees:present(decoded.rate,'taxesAndFees')?decoded.rate.taxesAndFees:{omitted:true},offerTaxesAndFees:present(decoded.offer,'taxesAndFees')?decoded.offer.taxesAndFees:{omitted:true},
  retailRate:decoded.rate.retailRate??null,boardName:decoded.rate.boardName??null,name:decoded.rate.name??null,
  cancellationPolicies:decoded.rate.cancellationPolicies??null,remarks:decoded.rate.remarks??null,
  offerRemarks:decoded.offer.remarks??null,hotelRemarks:decoded.hotel.remarks??null};}
function timing(payload,record,evaluatedAt){
 const data=payload?.data,fields=[];
 const locations=[['response',payload],['data',data]];
 for(const [i,offer] of (Array.isArray(data?.roomTypes)?data.roomTypes:[]).entries()){
  locations.push(['data.roomTypes['+i+']',offer]);
  for(const [j,rate] of (Array.isArray(offer?.rates)?offer.rates:[]).entries())locations.push(['data.roomTypes['+i+'].rates['+j+']',rate]);
 }
 for(const [path,object] of locations)if(object&&typeof object==='object')for(const key of ['validUntil','expiresAt'])if(present(object,key))fields.push({field:path+'.'+key,value:object[key]});
 const values=fields.map(f=>f.value);
 const status=!fields.length?'PROVIDER_EXPIRY_NOT_DECLARED':values.some(v=>!utc(v))?'PROVIDER_EXPIRY_UNINTERPRETABLE':
  new Set(values).size>1?'PROVIDER_EXPIRY_CONFLICT':Date.parse(values[0])<=Date.parse(evaluatedAt)?'EXPLICITLY_EXPIRED':'EXPLICIT_WINDOW_VALID';
 return {verificationAt:record?.completedAt??null,providerExpiryFields:fields,providerValidUntil:status==='EXPLICIT_WINDOW_VALID'||status==='EXPLICITLY_EXPIRED'?values[0]:null,
  status,internalTtl:null,evaluatedAt,independentTimestampCertified:false,futureAvailabilityGuaranteed:false,
  qualification:'Absent expiry does not invent a freshness window. Existing diagnostic policy evaluates the bound prebook observation; not future checkout authorization.'};
}
function scalarFact(id,code,value,record,field,unit=null){return {id:id+':'+code,code,value,availability:value===null?'unknown':'known',unit,
 source:'derived',sourceProvider:null,sourceField:field,confidence:value===null?0:.9,severity:value===null?'warning':'information',
 missingReasonCode:value===null?'PROVIDER_FIELD_UNSUPPORTED_OR_MISSING':null,capturedAt:record?.completedAt??null,
 derivedFromEvidenceIds:record?.response?[`request/${record.ordinal}:${record.response.body.sha256}:${field}`]:[]};}
function scoped(record,field,value,scope,level){return {sourceField:field,scope:level,offerScope:clone(scope),
 original:{status:value===null?'UNKNOWN':'KNOWN',value:clone(value),reason:value===null?'Missing provider field':null,reliability:'SOURCE_REPORTED',evidenceRefs:record?.response?['request/'+record.ordinal]:[]},
 links:record?.response?link(record,field):[],structuredPrivacy:null};}
function sleepingText(value){
 const clauses=[],inventories=[];
 // This is a bounded clause grammar, not a whole-description sentiment test.
 // Numeric inventory must not drop a second clause qualifying the same beds.
 const bedSubject=/\b(?:lett[oi]|divan[oi]|beds?|bunks?|sofas?|sleeping|berths?)\b/i;
 const conditional=/\b(?:da confermare|da verificare|da definire|su richiesta|subject to|on request|to be confirmed|pending|may|might|if|se|salvo|secondo disponibilit[aà]|non garantit[oaie]|not guaranteed|oppure|alternativ[ae])\b/i;
 const uncertainty=/\b(?:unknown|unconfirmed|uncertain|undocumented|unverified|sconosciut[oaie]|incert[oaie]|non (?:specificat|documentat|verificat)[oaie])\b/i;
 const bedNegation=/\b(?:non\s+(?:disponibil[ei]|utilizzabil[ei]|present[ei]|previst[oi])|not\s+(?:available|usable|present|provided)|unavailable|unusable|(?:no|without)\s+(?:(?:a|the|any)\s+)?(?:beds?|bunks?|sofas?)|(?:nessun[oa]?|senza)\s+(?:un[oa]?\s+)?(?:lett[oi]|divan[oi]))\b/i;
 const implicitQualification=/^(?:(?:non|not)\s+(?:disponibil[ei]|available|garantit[oaie]|guaranteed|present[ei]|present|confermat[oaie]|confirmed)|unavailable|unconfirmed|unknown|su richiesta|on request|da (?:confermare|verificare|definire)|subject to (?:availability|confirmation)|secondo disponibilit[aà]|senza garanzia|without guarantee)[.!]?$/i;
 let previousBed=false;
 if(typeof value==='string')for(const textValue of value.split(';').map(v=>v.trim()).filter(Boolean)){
  const bed=bedSubject.test(textValue),implicit=previousBed&&implicitQualification.test(textValue);
  const decoded=bed?normalizeItalianBedInventory(textValue):null;
  let kind;
  if(decoded){kind='SUPPORTED_INVENTORY';inventories.push(decoded);}
  else if(bed){
   // A statement about extra beds is not a restriction on the base inventory.
   // The explicit extra/supplementary referent is separate from base beds; its
   // absence or conditional provision must not negate an existing base count.
   // Consume the WHOLE extra-bed statement. Merely mentioning extra beds in a
   // restriction on a base bed must never make that restriction disappear.
   const extraOnly=/^(?:nessun letto (?:aggiuntivo|supplementare)(?: disponibile)?|no (?:extra|supplementary) beds?(?: available)?|(?:letti (?:aggiuntivi|supplementari)|(?:extra|supplementary) beds?) (?:non disponibili|not available|su richiesta|on request|subject to availability))[.!]?$/i.test(textValue);
   kind=extraOnly?'EXTRA_BEDS_NOT_BASE_INVENTORY':conditional.test(textValue)||uncertainty.test(textValue)?'BED_CONDITION_OR_UNCERTAINTY':
    bedNegation.test(textValue)?'BED_NEGATION':'UNSUPPORTED_BED_CLAUSE';
  }else kind=implicit?'UNRESOLVED_BED_QUALIFICATION':'OTHER_SUBJECT';
  clauses.push({text:textValue,kind});previousBed=bed||implicit;
 }
 const negated=clauses.some(c=>c.kind==='BED_NEGATION');
 const uncertain=clauses.some(c=>['BED_CONDITION_OR_UNCERTAINTY','UNSUPPORTED_BED_CLAUSE','UNRESOLVED_BED_QUALIFICATION'].includes(c.kind));
 const status=negated&&inventories.length?'CONFLICTING_INVENTORY':negated?'NEGATED_UNQUANTIFIED_INVENTORY':
  uncertain?'UNVERIFIED_BED_QUALIFICATION':inventories.length?'SUPPORTED_LOWER_BOUND':'MISSING_SUPPORTED_INVENTORY';
 const claimState=status==='CONFLICTING_INVENTORY'?'CONFLICTING':status==='SUPPORTED_LOWER_BOUND'?'KNOWN':'UNKNOWN';
 return {status,claimState,clauses,inventory:claimState==='KNOWN'?{complete:false,beds:inventories.flatMap(v=>v.beds)}:null,
  reason:'SCOPED_BED_CLAUSE_GRAMMAR:'+status,completeInventoryCertified:false};
}

function inspectHotelDetail(record,hotelId){
 const payload=body(record),data=payload?.data,issues=[];
 const identityVerified=Boolean(data&&typeof data==='object'&&!Array.isArray(data)&&
  (data.id===hotelId||data.hotelId===hotelId)&&(!present(data,'id')||data.id===hotelId)&&(!present(data,'hotelId')||data.hotelId===hotelId));
 for(const [path,object] of [['response',payload],['data',data]])if(object&&typeof object==='object'){
  for(const field of ['error','errors'])if(present(object,field)){
   const value=object[field];
   if(value===null||Array.isArray(value)&&value.length===0)continue;
   const declared=typeof value==='string'&&value.trim().length>0||Array.isArray(value)&&value.length>0||
    value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0;
   issues.push({path:path+'.'+field,reason:declared?'PROVIDER_ERROR':'UNSUPPORTED_ERROR_SHAPE'});
  }
 }
 const status=!record?'NOT_OBSERVED':!payload?'TRANSPORT_OR_PAYLOAD_UNUSABLE':
  issues.some(i=>i.reason==='PROVIDER_ERROR')?'PROVIDER_ERROR':issues.length?'UNSUPPORTED_ERROR_SHAPE':
  !identityVerified?'IDENTITY_UNVERIFIED':'USABLE';
 return {identityVerified,status,usable:status==='USABLE',issues,
  property:status==='USABLE'?data:null,originalPayload:payload,
  source:record?.response?link(record,'HOTEL_DETAIL response and data'):[]};
}

function scenarioCheck(s){
 const q=s?.searchRequest,p=s?.party,stay=s?.stay;
 if(!s||s.fixtureOrigin!=='SYNTHETIC_ONLY'||s.wireProfile!==SUPPORTED_WIRE_PROFILE||s.distance?.semantics!=='not-requested'||s.distance.kilometers!==null||
  !p||!stay||!q||p.unitsRequested!==1||!integer(p.adults)||p.adults<1||!Array.isArray(p.childAgesAtStay)||p.childAgesAtStay.some(a=>!integer(a)||a>=18)||
  !requirements.every(k=>typeof p.requirements?.[k]==='boolean')||p.requirements.sleepingPlaces!==true||p.requirements.capacity!==true||
  !equal(s.essentialRequirementBasis,p.requirements)||!equal(q.occupancies,[{adults:p.adults,children:p.childAgesAtStay}])||
  q.checkin!==stay.checkIn||q.checkout!==stay.checkOut||q.currency!==stay.currency||!text(q.guestNationality)||!text(q.cityName)||!text(q.countryCode)||
  !/^\d{4}-\d\d-\d\d$/.test(stay.checkIn)||!/^\d{4}-\d\d-\d\d$/.test(stay.checkOut)||Date.parse(stay.checkOut)<=Date.parse(stay.checkIn)||
  !num(s.totalBudget)||s.totalBudget===0||s.preferenceId!=='balanced'||s.preferenceSource!=='manual'||
  s.account?.environment!=='SYNTHETIC'||s.account?.priceBasis!=='OFFER_RETAIL_RATE_DOCUMENTED_FOR_FIXTURE')fail('SCENARIO_UNREPRESENTABLE');
}

/** Pure preparation. Re-verifies capture, not caller-normalized truth flags.
 * Production intentionally disabled until real raw-schema/account/launcher
 * qualification; stub evidence is never upgraded to a provider attestation. */
export function prepareLiteApiObservationDiagnostic({capture,checkpoint,scenario,selectionPolicy,evaluatedAt}){
 scenarioCheck(scenario);
 verifySyntheticLiteApiCapture(capture,{checkpoint,scenario,selectionPolicy});
 if(!utc(evaluatedAt)||capture.requests.some(r=>!utc(r.completedAt)||Date.parse(r.completedAt)>Date.parse(evaluatedAt)))fail('EVALUATION_TIME');
 const search=capture.requests.find(r=>r.kind==='SEARCH'),rawSearch=body(search);
 if(!rawSearch||!equal(requestBody(search),scenario.searchRequest))fail('SEARCH_UNUSABLE');
 const selected=capture.selection?.selected;
 if(!Array.isArray(selected))fail('SELECTION_NOT_SEALED');
 const records=capture.requests;
 const unknownReference=unknown(null,'NO_DISTANCE_REQUIREMENT_NO_COORDINATES_INVENTED');
 const normalization={version:DIAGNOSTIC_REQUIREMENTS_VERSION,caseId:scenario.caseId,mode:'PROVIDER_OBSERVATION_DIAGNOSTIC',
  evaluatedAt,party:clone(scenario.party),stay:clone(scenario.stay),
  geography:{commonReference:unknownReference,contexts:[{id:'NOT_REQUESTED',semantics:'not-requested',kilometers:null}]},offers:[]};
 const observations=[],signals=[];
 for(const selectedOffer of selected){
  const hotelId=selectedOffer.hotelId,offerId=selectedOffer.offerId;
  const searchOffer=decodeSelected(rawSearch,hotelId,offerId),issues=[];
  const privateIdentity={hotelId,offerId};
  // Pseudonyms are audit bindings, not names, price sorting or provider rank.
  const id='provider-observation-'+observationHash(privateIdentity).slice(0,20);
  const scope={roomKey:'room-'+observationHash([hotelId,searchOffer.rate?.mappedRoomId??null]).slice(0,20),rateKey:'rate-'+observationHash(privateIdentity).slice(0,20)};
  const pre=records.find(r=>r.kind==='PREBOOK'&&r.hotelId===hotelId),get=records.find(r=>r.kind==='PREBOOK_GET'&&r.hotelId===hotelId);
  const prePayload=body(pre),getPayload=body(get),preDecoded=decodeSelected(prePayload,hotelId,offerId),getDecoded=decodeSelected(getPayload,hotelId,offerId);
  let verified=false,active=searchOffer,activeRecord=search,commercialChange=false;
  if(searchOffer.issue)issues.push(searchOffer.issue);else issues.push(...validateScope(searchOffer,scenario));
  for(const payload of [prePayload,getPayload])if(payload?.error!=null||Array.isArray(payload?.errors)&&payload.errors.length)issues.push('LOGICAL_ERROR_IN_COMMERCIAL_RESPONSE');
  if(!prePayload)issues.push(pre?'PREBOOK_FAILED_OR_AMBIGUOUS':'PREBOOK_NOT_ATTEMPTED');
  else if(preDecoded.issue)issues.push(preDecoded.issue);
  else {
   const preIssues=validateScope(preDecoded,scenario,searchOffer.issue?null:searchOffer);
   const prebookId=prePayload.data?.prebookId;
   if(!text(prebookId)||pre?.offerId!==offerId)preIssues.push('PREBOOK_REQUEST_RETURN_BINDING_MISSING');
   if(getDecoded.issue||!getPayload)preIssues.push('PREBOOK_RETRIEVAL_MISSING_OR_UNSUPPORTED');
   else {
    preIssues.push(...validateScope(getDecoded,scenario,preDecoded));
    if(getPayload.data.prebookId!==prebookId||get?.prebookId!==prebookId)preIssues.push('RETRIEVAL_IDENTITY_CONFLICT');
    if(!equal(commercial(preDecoded),commercial(getDecoded)))preIssues.push('PREBOOK_RETRIEVAL_COMMERCIAL_CONFLICT');
   }
   issues.push(...preIssues);
   // A failure/conflict never falls back to a certified historic bookable fact.
   if(!issues.length){verified=true;active=preDecoded;activeRecord=pre;commercialChange=!equal(commercial(searchOffer),commercial(preDecoded));}
  }
  const time=timing(prePayload,pre,evaluatedAt),getTime=timing(getPayload,get,evaluatedAt);
  if(['EXPLICITLY_EXPIRED','PROVIDER_EXPIRY_CONFLICT','PROVIDER_EXPIRY_UNINTERPRETABLE'].includes(time.status)||
    ['EXPLICITLY_EXPIRED','PROVIDER_EXPIRY_CONFLICT','PROVIDER_EXPIRY_UNINTERPRETABLE'].includes(getTime.status)){
   verified=false;issues.push('PROVIDER_TIME_'+time.status+'_'+getTime.status);
  }
  if(time.providerValidUntil&&getTime.providerValidUntil&&time.providerValidUntil!==getTime.providerValidUntil){verified=false;issues.push('EXPIRY_CHANGED_ON_RETRIEVAL');}
  const conflict=issues.some(i=>/CONFLICT|MISMATCH|CHANGED|NOT_EXACT|NEGATIVE_AVAILABILITY|LOGICAL_ERROR/.test(i));
  const r=active.rate??{},o=active.offer??{};
  const c=(v,field,reason)=>claim(v,scope,activeRecord,field,reason);
  const missing=reason=>unknown(scope,reason,activeRecord);
  const fiscal=inspectLiteApiFiscalEvidence(o,r,scenario.stay.currency,active.hotel?.remarks??[]);
  const fiscalUsable=verified&&fiscal.completeTotal!==null;
  const sleeping=sleepingText(r.name);
  const n={alternativeId:id,scope:{...scope,stay:clone(scenario.stay),party:{adults:scenario.party.adults,childAgesAtStay:clone(scenario.party.childAgesAtStay),unitsRequested:1}},
   reference:unknown(scope,'NO_DISTANCE_REQUESTED'),distanceKm:unknown(scope,'NO_DISTANCE_REQUESTED'),
   availability:{observed:searchOffer.issue?missing('SEARCH_OFFER_UNVERIFIABLE'):claim('AVAILABLE',scope,search,'roomTypes/offerId','OBSERVED_RATE_NOT_BOOKABILITY'),
    bookability:verified?c(true,'prebookId + exact retrieved commercial record','BOUND_PREBOOK_VERIFICATION_NOT_SEARCH_BOOLEAN'):
     claim(null,scope,pre??search,'prebook','VERIFICATION_NOT_USABLE:'+issues.join('|'),'OFFER_SCOPED',conflict?'CONFLICTING':'UNKNOWN'),
    unavailable:missing('NO_EXPLICIT_UNAVAILABILITY_ATTESTATION')},
   unitsOffered:!searchOffer.issue&&!validateScope(active,scenario).length?c(1,'rates/occupancyNumber','ONE_RATE_COMPONENT_FOR_ONE_REQUESTED_OCCUPANCY_NOT_INTERNAL_ROOMS'):missing('QUOTED_UNIT_BINDING_UNVERIFIED'),
   internalRooms:missing('INTERNAL_ROOMS_NOT_INFERRED_FROM_UNITS'),
   capacityGuests:integer(r.maxOccupancy)?c(r.maxOccupancy,'rates/maxOccupancy','SOURCE_DECLARED_MAXIMUM_NOT_BEDS'):missing('CAPACITY_MISSING'),
   sleeping:claim(sleeping.inventory,scope,activeRecord,'rates/name',sleeping.reason,'OFFER_SCOPED',sleeping.claimState),
   children:{admitted:!searchOffer.issue&&!validateScope(active,scenario).length?c(true,'rates/adultCount+childCount+occupancyNumber; request/occupancies','QUOTE_FOR_EXACT_SUBMITTED_OCCUPANCY_NOT_GENERAL_CHILD_POLICY'):missing('CHILD_OCCUPANCY_BINDING_UNVERIFIED'),
    minimumAge:missing('MINIMUM_AGE_UNDOCUMENTED'),adultPricingFromAge:missing('AGE_PRICING_UNDOCUMENTED'),extraBedsAvailable:missing('EXTRA_BEDS_UNDOCUMENTED')},
   privateBathroom:missing('PRIVACY_EVALUATED_FROM_SCOPED_ORIGINAL_TEXT'),exclusiveUse:missing('PRIVACY_EVALUATED_FROM_SCOPED_ORIGINAL_TEXT'),
   completeTotal:fiscalUsable?c(fiscal.completeTotal,'offerRetailRate+taxesAndFees','VERIFIED_AGGREGATED_TOTAL:'+fiscal.representation):missing('COMPLETE_TOTAL_NOT_VERIFIED:'+fiscal.issues.concat(issues).join('|')),
   ratingObserved:missing('RATING_SCALE_AND_OBSERVATION_UNQUALIFIED'),ratingScale:missing('NO_SCALE_ASSUMED')};
  if(conflict){
   // SEARCH facts remain in historical observations. A contradicted commercial
   // version cannot revive those facts as the currently verified accommodation.
   for(const key of ['unitsOffered','capacityGuests','sleeping','privateBathroom','exclusiveUse'])
    n[key]=claim(null,scope,pre??search,key,'CURRENT_OFFER_BINDING_OR_FACTS_CONFLICT:'+issues.join('|'),'OFFER_SCOPED','CONFLICTING');
   n.children.admitted=claim(null,scope,pre??search,'occupancy','CURRENT_OCCUPANCY_VERIFICATION_CONFLICT','OFFER_SCOPED','CONFLICTING');
  }
  normalization.offers.push(n);
  const detail=records.find(d=>d.kind==='HOTEL_DETAIL'&&d.hotelId===hotelId);
  const detailValidation=inspectHotelDetail(detail,hotelId),property=detailValidation.property;
  const textValue=!conflict&&typeof r.name==='string'?r.name:null;
  const scopedObservations=[scoped(activeRecord,'roomName',textValue,scope,'OFFER')];
  if(r.remarks!==undefined)scopedObservations.push(scoped(activeRecord,'roomAmenities',r.remarks,scope,'OFFER'));
  if(property?.facilities!==undefined)scopedObservations.push(scoped(detail,'amenities',property.facilities,scope,'PROPERTY'));
  const services=serviceCodes.map(code=>resolveScopedService(scopedObservations,code));
  const facts=[scalarFact(id,'property.stars',num(property?.starRating)&&property.starRating<=5?property.starRating:null,detail,'starRating','stars'),
   scalarFact(id,'review.count',integer(property?.reviewCount)?property.reviewCount:null,detail,'reviewCount','reviews'),
   scalarFact(id,'offer.cancellation',typeof r.cancellationPolicies?.refundableTag==='string'?r.cancellationPolicies.refundableTag:null,activeRecord,'cancellationPolicies/refundableTag')];
  for(const s of services)if(s.state!=='ABSENT'){
   const f=scalarFact(id,'feature.'+s.code,s.value,activeRecord,'scoped-services/'+s.code);
   f.derivedFromEvidenceIds=s.selected.flatMap(x=>x.links.flatMap(l=>l.evidence.map(e=>l.field+':'+e.ref+':'+e.sha256)));
   if(s.state==='CONFLICTING')f.availability='conflicting';facts.push(f);
  }
  signals.push({alternativeId:id,roomKey:scope.roomKey,rateKey:scope.rateKey,facts,features:[],category:null,roomText:textValue,
   scopedObservations,serviceInterpretations:services,observations:{other:{search:clone(searchOffer),prebook:clone(preDecoded),retrieval:clone(getDecoded),detail:clone(property),detailValidation:clone(detailValidation),sleepingInterpretation:clone(sleeping),fiscal,time,getTime}},
   provenance:{kind:'VERIFIED_SYNTHETIC_PROVIDER_CAPTURE',captureSha256:capture.captureSha256,privateIdentity,sourceRecords:[search,pre,get,detail].filter(Boolean).map(x=>({ordinal:x.ordinal,requestHash:x.request.body.sha256,responseHash:x.response?.body.sha256??null})),humanReview:null}});
  observations.push({alternativeId:id,privateIdentity,issues:[...new Set(issues)],detailIdentityVerified:detailValidation.identityVerified,
   detailUsable:detailValidation.usable,detailSemanticStatus:detailValidation.status,detailValidation:clone(detailValidation),sleepingInterpretation:clone(sleeping),
   searchObserved:!searchOffer.issue,prebookVerified:verified,retrievalIsIndependentVerification:false,commercialChange,
   fiscal,time,getTime,rawResponsesRetained:true,occupancyAgeLink:'ORIGINAL_REQUEST_TO_EXACT_OFFER_ID_NO_INVENTED_RESPONSE_ECHO',
   sourceIdentityFieldsOnlyForAudit:true});
 }
 if(!normalization.offers.length)return {version:LITEAPI_OBSERVATION_VERSION,status:'NO_CANDIDATES_NO_ENGINE_INPUT',input:null,observations,normalization,
  engineInvocations:0,policyInvocations:0,decision:null,syntheticProofOnly:true};
 const assessment=evaluateDiagnosticOfferRequirements(normalization);
 const candidates=signals.map(c=>reprojectObservedRequirementCandidate(c,normalization.offers.find(o=>o.alternativeId===c.alternativeId),assessment.offers.find(o=>o.alternativeId===c.alternativeId),normalization));
 const input={version:OBSERVED_EXECUTION_VERSION,caseId:scenario.caseId,sourceFingerprint:observationHash({capture: capture.captureSha256,normalization}),
  essentialCoverage:'ESSENTIAL_COVERAGE_DEFINED',query:{totalBudget:scenario.totalBudget,nights:(Date.parse(scenario.stay.checkOut)-Date.parse(scenario.stay.checkIn))/86400000,
   rooms:scenario.party.unitsRequested,adults:scenario.party.adults,children:scenario.party.childAgesAtStay.length,childAgesAtStay:clone(scenario.party.childAgesAtStay),
   checkIn:scenario.stay.checkIn,checkOut:scenario.stay.checkOut,currency:scenario.stay.currency,capturedAt:evaluatedAt,
   destinationKey:scenario.searchRequest.cityName+'|'+scenario.searchRequest.countryCode,preferenceId:scenario.preferenceId,preferenceSource:scenario.preferenceSource},
  context:{id:'NOT_REQUESTED',semantics:'not-requested',kilometers:null,reference:clone(unknownReference)},candidates};
 return {version:LITEAPI_OBSERVATION_VERSION,status:candidates.length<2?'PREPARED_INSUFFICIENT_CANDIDATES':'PREPARED_DIAGNOSTIC_INPUT',
  kind:'FRESH_PROVIDER_OBSERVATION',input,normalization,assessment,observations,
  limitations:['SYNTHETIC_WIRE_PROFILE_NOT_REAL_ENDPOINT_QUALIFICATION','NO_PRODUCTION_ACCOUNT_OR_NATIONALITY_APPROVAL','NO_FUTURE_BOOKING_GUARANTEE'],
  engineInvocations:0,policyInvocations:0,decision:null,syntheticProofOnly:true,feedbackUsed:false,humanReceiptCreated:false,goldenAdmission:false};
}

export function executeLiteApiObservationDiagnostic(request,compute){
 const prepared=prepareLiteApiObservationDiagnostic(request);
 if(prepared.status!=='PREPARED_DIAGNOSTIC_INPUT')return {...prepared,executionStatus:'NOT_EXECUTED',output:null};
 if(typeof compute!=='function')fail('COMPUTE_CALLBACK_REQUIRED');
 let engineInvocations=0;
 engineInvocations++;
 const output=compute(prepared.input);
 if(output.version!==OBSERVED_EXECUTION_VERSION||output.candidates.length!==prepared.input.candidates.length||
  typeof output.policyExecuted!=='boolean'||output.policyInvocations!==(output.policyExecuted?1:0))fail('KERNEL_OUTPUT_OR_INVOCATION_COUNT');
 return {...prepared,executionStatus:output.policyExecuted?'POLICY_EXECUTED':'KERNEL_ONLY',output,
  engineInvocations,policyInvocations:output.policyInvocations};
}
