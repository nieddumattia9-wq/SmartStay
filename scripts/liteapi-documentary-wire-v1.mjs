// D-0062: bounded official-documentation wire profile. Pure; no transport/custody.
import {createHash} from 'node:crypto';
import {qualifyDocumentaryPrices,qualifyHotelImportantInformation} from './liteapi-offer-qualification-v1.mjs';

export const DOCUMENTARY_LITEAPI_WIRE_VERSION='stayopti.liteapi-documentary-wire@1';
export const DOCUMENTARY_LITEAPI_SOURCES=Object.freeze({
 rates:'https://docs.liteapi.travel/reference/post_hotels-rates',
 prebook:'https://docs.liteapi.travel/reference/post_rates-prebook',
 retrieval:'https://docs.liteapi.travel/reference/get_prebooks-prebookid',
 hotel:'https://docs.liteapi.travel/reference/get_data-hotel',
 facilities:'https://docs.liteapi.travel/reference/get_data-facilities',
 fiscal:'https://docs.liteapi.travel/docs/hotel-rates-api-json-data-structure',
});
const clone=x=>structuredClone(x),plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>JSON.stringify(x,(_k,v)=>plain(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const same=(a,b)=>canonical(a)===canonical(b),own=(o,k)=>o!=null&&Object.hasOwn(o,k);
const fail=c=>{throw Error('LITEAPI_DOCUMENTARY_'+c);};
const amount=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:typeof x==='string'&&/^\d+(?:\.\d{1,2})?$/.test(x)?Number(x):null;
const round=x=>Math.round((x+Number.EPSILON)*100)/100;
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(x)&&Number.isFinite(Date.parse(x));
// A local safety bound, NOT a claimed provider ID grammar/length. No decoding,
// case folding, truncation or name/price fallback. URL path IDs must be encoded.
export const isOpaqueLiteApiId=x=>typeof x==='string'&&x.length>0&&x.length<=32768&&!/[\x00-\x1f\x7f]/.test(x);
const mapped=x=>Number.isSafeInteger(x)&&x>=0||isOpaqueLiteApiId(x);
export function readDocumentaryResponse(record){
 const r=record?.response,b=r?.body;if(!b)return null;
 if(typeof b.base64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.base64))fail('RESPONSE_ENCODING');
 const bytes=Buffer.from(b.base64,'base64');
 if(bytes.length!==b.byteLength||createHash('sha256').update(bytes).digest('hex')!==b.sha256)fail('RESPONSE_INTEGRITY');
 if(r.status<200||r.status>=300||!String(r.headers?.['content-type']??r.headers?.['Content-Type']??'').includes('application/json'))return null;
 try{return JSON.parse(bytes.toString('utf8'));}catch{return null;}
}
function errors(value,path='response'){
 const out=[];if(!plain(value))return out;
 for(const key of ['error','errors'])if(own(value,key)){
  const v=value[key];if(v===null||Array.isArray(v)&&v.length===0)continue;
  const declared=typeof v==='string'&&v.trim().length>0||Array.isArray(v)&&v.length>0||plain(v)&&Object.keys(v).length>0;
  out.push(path+'.'+key+':'+(declared?'PROVIDER_ERROR':'UNSUPPORTED_ERROR_SHAPE'));
 }
 return out;
}
function request(record){return record?.intent??{kind:record?.kind,hotelId:record?.hotelId,offerId:record?.offerId,prebookId:record?.prebookId};}
function occupancyIssues(rate,scenario){
 const o=scenario?.searchRequest?.occupancies?.[0],issues=[];
 if(!o||rate?.adultCount!==o.adults||rate?.childCount!==o.children.length)issues.push('OCCUPANCY_NOT_EXACT');
 if(rate?.occupancyNumber!==1)issues.push('OCCUPANCY_NUMBER_SEMANTICS_UNRESOLVED');
 for(const key of ['childrenAges','children','childAges'])if(own(rate,key)&&!same(rate[key],o?.children))issues.push('RETURNED_CHILD_AGES_MISMATCH:'+key);
 if(own(rate,'occupancy')&&!same(rate.occupancy,o))issues.push('RETURNED_OCCUPANCY_MISMATCH');
 return issues;
}
/** Selection retains all returned records, including unselectable properties.
 * One deterministic hash sample, not the cheapest/provider-position choice. */
export function selectDocumentaryLiteApiOffers(record,policy,scenario){
 const p=readDocumentaryResponse(record);
 if(request(record).kind!=='SEARCH'||!plain(p)||!Array.isArray(p.data)||errors(p).length)fail('SEARCH_POOL_SCHEMA');
 if(!isOpaqueLiteApiId(policy?.seed)||policy?.maximumHotels!==5||policy?.version!=='HASHED_PROVIDER_IDS_AUDIT_ONLY@1')fail('SELECTION_POLICY');
 const pool=new Map();
 for(const hotel of p.data){if(!plain(hotel)||!isOpaqueLiteApiId(hotel.hotelId)||!Array.isArray(hotel.roomTypes))fail('SEARCH_POOL_IDENTITY');
  if(pool.has(hotel.hotelId)&&!same(pool.get(hotel.hotelId),hotel))fail('DUPLICATE_HOTEL_CONFLICT');pool.set(hotel.hotelId,hotel);}
 const key=(type,h,o=null)=>hash(o===null?[policy.seed,type,h]:[policy.seed,type,h,o]);
 const order=(type,h=null)=>(a,b)=>{const av=h===null?key(type,a):key(type,h,a),bv=h===null?key(type,b):key(type,h,b);return av<bv?-1:av>bv?1:a<b?-1:a>b?1:0;};
 const selected=[...pool.keys()].sort(order('hotel')).slice(0,5).map(hotelId=>{
  const h=pool.get(hotelId),offers=new Map();let anomaly=errors(h,'hotel').length?'PROVIDER_ERROR':null;
  for(const offer of h.roomTypes){if(!plain(offer)||!isOpaqueLiteApiId(offer.offerId)){anomaly='OFFER_IDENTITY_UNPROVEN';continue;}
   if(offers.has(offer.offerId)&&!same(offers.get(offer.offerId),offer))anomaly='DUPLICATE_OFFER_CONFLICT';offers.set(offer.offerId,offer);}
  const bindable=[...offers.values()].filter(o=>Array.isArray(o.rates)&&o.rates.length===1&&
   !occupancyIssues(o.rates[0],scenario).length&&isOpaqueLiteApiId(o.rates[0]?.rateId)&&!errors(o).length&&!errors(o.rates[0]).length).map(o=>o.offerId);
  const offerId=anomaly?null:bindable.sort(order('offer',hotelId))[0]??null;
  return {hotelId,offerId,reason:anomaly??(offerId?'FIXED_HASH_SAMPLE_NOT_MERIT':'OFFER_OCCUPANCY_NOT_BINDABLE')};
 });
 return {version:policy.version,wireVersion:DOCUMENTARY_LITEAPI_WIRE_VERSION,seed:policy.seed,
  searchResponseSha256:record.response.body.sha256,poolFingerprint:hash([...pool.values()].sort((a,b)=>a.hotelId<b.hotelId?-1:1)),
  returnedHotelCount:pool.size,selected,providerOrderUsed:false,meritSelection:false,providerExhaustionCertified:false};
}
export function getDocumentaryPrebookId(record){const p=readDocumentaryResponse(record);return !errors(p).length&&!errors(p?.data).length&&isOpaqueLiteApiId(p?.data?.prebookId)?p.data.prebookId:null;}

/** Decode a documented SEARCH, POST or GET container without rewriting raw
 * bytes. Missing optional echoes are recorded as absent, never manufactured. */
export function decodeDocumentaryOffer(record,{hotelId,offerId,scenario,stage=request(record).kind}={}){
 const payload=readDocumentaryResponse(record),intent=request(record),issues=[];
 if(!plain(payload))return {issue:'RESPONSE_BODY_UNUSABLE',issues:['RESPONSE_BODY_UNUSABLE']};
 issues.push(...errors(payload));let hotel,offer,rate,pointer;
 if(stage==='SEARCH'){
  if(!Array.isArray(payload.data))return {issue:'SEARCH_CONTAINER_UNSUPPORTED',issues:['SEARCH_CONTAINER_UNSUPPORTED']};
  const h=payload.data.map((v,i)=>({v,i})).filter(x=>x.v?.hotelId===hotelId);
  if(h.length!==1)return {issue:'PROPERTY_IDENTITY_MISSING_OR_AMBIGUOUS',issues:['PROPERTY_IDENTITY_MISSING_OR_AMBIGUOUS']};
  hotel=h[0].v;const selected=(hotel.roomTypes??[]).map((v,i)=>({v,i})).filter(x=>x.v?.offerId===offerId);
  if(selected.length!==1)return {issue:'OFFER_IDENTITY_MISSING_OR_AMBIGUOUS',issues:['OFFER_IDENTITY_MISSING_OR_AMBIGUOUS']};
  offer=selected[0].v;pointer=`data[${h[0].i}].roomTypes[${selected[0].i}]`;
 }else{
  hotel=payload.data;
  if(!plain(hotel)||hotel.hotelId!==hotelId||!isOpaqueLiteApiId(hotel.prebookId))return {issue:'PREBOOK_PROPERTY_OR_SESSION_IDENTITY',issues:['PREBOOK_PROPERTY_OR_SESSION_IDENTITY']};
  if(intent.hotelId!==hotelId||intent.offerId!==offerId)issues.push('CAPTURED_OFFER_REQUEST_MISMATCH');
  if(stage==='PREBOOK'&&intent.body&&(!same(intent.body,{offerId,usePaymentSdk:false})))issues.push('PREBOOK_BODY_MISMATCH');
  if(stage==='PREBOOK_GET'&&intent.prebookId!==hotel.prebookId)issues.push('RETRIEVAL_IDENTITY_CONFLICT');
  if(own(hotel,'offerId')&&hotel.offerId!==offerId)issues.push('RETURNED_OFFER_ID_MISMATCH');
  if(!Array.isArray(hotel.roomTypes)||hotel.roomTypes.length!==1)return {issue:'PREBOOK_SINGLE_COMPONENT_UNSUPPORTED',issues:['PREBOOK_SINGLE_COMPONENT_UNSUPPORTED']};
  offer=hotel.roomTypes[0];pointer='data.roomTypes[0]';
  for(const key of ['checkin','checkout','currency'])if(hotel[key]!==scenario.searchRequest[key])issues.push('RETURNED_'+key.toUpperCase()+'_MISMATCH');
 }
 if(!plain(offer)||!Array.isArray(offer.rates)||offer.rates.length!==1||!plain(offer.rates[0]))return {issue:'SINGLE_OCCUPANCY_SHAPE_UNSUPPORTED',issues:['SINGLE_OCCUPANCY_SHAPE_UNSUPPORTED']};
 rate=offer.rates[0];issues.push(...occupancyIssues(rate,scenario));
 if(!isOpaqueLiteApiId(rate.rateId))issues.push('RATE_ID_MISSING');
 for(const [path,object] of [['hotel',hotel],['offer',offer],['rate',rate]]){
  issues.push(...errors(object,path));
  if(object.bookable===false||object.available===false)issues.push('NEGATIVE_AVAILABILITY_IN_RETURNED_RECORD');
  for(const key of ['checkin','checkout','currency'])if(own(object,key)&&object[key]!==scenario.searchRequest[key])issues.push('RETURNED_'+key.toUpperCase()+'_MISMATCH');
  for(const key of ['childrenAges','children','childAges'])if(own(object,key)&&!same(object[key],scenario.searchRequest.occupancies[0].children))issues.push('RETURNED_CHILD_AGES_MISMATCH:'+path+'.'+key);
  if(own(object,'offerId')&&object.offerId!==offerId)issues.push('RETURNED_OFFER_ID_MISMATCH:'+path);
  if(own(object,'mappedRoomId')&&object.mappedRoomId!==null&&!mapped(object.mappedRoomId))issues.push('MAPPED_ROOM_ID_UNSUPPORTED');
 }
 const mappedValues=[hotel,offer,rate].filter(o=>own(o,'mappedRoomId')&&o.mappedRoomId!==null).map(o=>String(o.mappedRoomId));
 if(new Set(mappedValues).size>1)issues.push('MAPPED_ROOM_ID_CONFLICT');
 return {hotel:clone(hotel),offer:clone(offer),rate:clone(rate),issues:[...new Set(issues)],wireVersion:DOCUMENTARY_LITEAPI_WIRE_VERSION,
  binding:{hotelId,selectedOfferId:offerId,prebookId:hotel.prebookId??null,rateId:rate.rateId,
   mappedRoomId:mappedValues[0]??null,occupancyNumber:rate.occupancyNumber,
   childAgesEchoed:own(rate,'childrenAges'),childAgeBinding:own(rate,'childrenAges')?'RETURNED_CHILDREN_AGES':'ORIGINAL_REQUEST_TO_SELECTED_OFFER_NO_ECHO_INVENTED',
   offerIdEchoed:stage==='SEARCH'||own(hotel,'offerId')||own(offer,'offerId'),
   identityBasis:stage==='SEARCH'?'EXACT_RETURNED_OFFER':'CAPTURED_OFFER_REQUEST_AND_PREBOOK_SESSION',pointer,payloadSha256:record.response.body.sha256}};
}

export function documentaryCommercial(decoded){
 if(decoded.issue)return null;
 const {hotel:h,offer:o,rate:r}=decoded;
 return {name:r.name??null,maxOccupancy:r.maxOccupancy??null,adultCount:r.adultCount,childCount:r.childCount,
  childrenAges:own(r,'childrenAges')?r.childrenAges:{omitted:true},mappedRoomId:decoded.binding.mappedRoomId,
  price:h.price??null,currency:h.currency??null,offerRetailRate:o.offerRetailRate??null,retailRate:r.retailRate??null,
  suggestedSellingPrice:h.suggestedSellingPrice??o.suggestedSellingPrice??null,sellingPriceToUser:h.sellingPriceToUser??null,termsAndConditions:h.termsAndConditions??null,
  cancellationPolicies:r.cancellationPolicies??null,remarks:r.remarks??null,boardName:r.boardName??null,
  priceDifferencePercent:h.priceDifferencePercent??null,cancellationChanged:h.cancellationChanged??null,boardChanged:h.boardChanged??null,
  extras:{addonsTotalAmount:h.addonsTotalAmount??null,addonsRequest:h.addonsRequest??null,voucherCode:h.voucherCode??null,voucherTotalAmount:h.voucherTotalAmount??null}};
}
function singleMoney(value){const x=Array.isArray(value)?value.length===1?value[0]:null:value;return plain(x)&&amount(x.amount)!==null&&typeof x.currency==='string'?{amount:amount(x.amount),currency:x.currency}:null;}
export function inspectDocumentaryFiscal(decoded,currency,detail=null){
 const r=decoded.rate??{},o=decoded.offer??{},h=decoded.hotel??{},issues=[],sources=[];
 const retail=singleMoney(r.retailRate?.total),offerRetail=own(o,'offerRetailRate')?singleMoney(o.offerRetailRate):null;
 if(!retail||retail.currency!==currency)issues.push('RATE_RETAIL_AMOUNT_OR_CURRENCY_UNVERIFIED');
 if(own(o,'offerRetailRate')&&(!offerRetail||!same(offerRetail,retail)))issues.push('OFFER_RATE_RETAIL_CONFLICT');
 const prebookPrice=own(h,'prebookId')?amount(h.price):null;
 if(own(h,'prebookId')&&(prebookPrice===null||h.currency!==currency||prebookPrice!==retail?.amount))issues.push('PREBOOK_PRICE_COMPONENT_CONFLICT_OR_UNSUPPORTED_ADJUSTMENT');
 const priceQualification=qualifyDocumentaryPrices(decoded,currency);
 const selling=priceQualification.fields.filter(f=>f.scope.endsWith('PUBLIC_MINIMUM')&&f.presence==='PRESENT');
 issues.push(...priceQualification.issues);
 const importantInformation=qualifyHotelImportantInformation(detail,r.boardName);
 issues.push(...importantInformation.issues);
 for(const [field,object] of [['rate.retailRate.taxesAndFees',r.retailRate],['rate.taxesAndFees',r],['offer.taxesAndFees',o]])if(own(object,'taxesAndFees'))sources.push({field,value:clone(object.taxesAndFees)});
 if(sources.length>1&&sources.some(s=>!same(s.value,sources[0].value)))issues.push('FISCAL_SOURCES_CONFLICT');
 const value=sources[0]?.value,representation=!sources.length?'OMITTED':value===null?'NULL_ALL_INCLUDED':Array.isArray(value)?value.length?'COMPONENT_LIST':'EMPTY_LIST':'UNSUPPORTED';
 if(['OMITTED','EMPTY_LIST','UNSUPPORTED'].includes(representation))issues.push('TAX_COVERAGE_UNDOCUMENTED_'+representation);
 const components=[],payAtProperty=[],amountsByCurrency={};
 if(Array.isArray(value))for(const entry of value){const n=amount(entry?.amount),c=entry?.currency,basis=entry?.basis??entry?.calculationBasis??null;
  components.push({...clone(entry),sourceAmount:n,calculationBasis:basis,interpretation:'PROVIDER_AGGREGATED_COMPONENT_NO_GUEST_OR_NIGHT_MULTIPLICATION'});
  if(n===null||typeof c!=='string'||typeof entry.included!=='boolean')issues.push('FISCAL_COMPONENT_UNSUPPORTED');
  if(c!==currency)issues.push('MIXED_CURRENCY_NO_DOCUMENTED_CONVERSION');
  if(basis!==null&&!['TOTAL_STAY','PER_STAY'].includes(basis))issues.push('COMPONENT_BASIS_NOT_AGGREGATED');
  if(entry?.mandatory===false)issues.push('OPTIONAL_COMPONENT_NOT_COMPLETE_TOTAL_PROOF');
  if(n!==null&&typeof c==='string')amountsByCurrency[c]=round((amountsByCurrency[c]??0)+n);
  if(entry?.included===false)payAtProperty.push(clone(entry));}
 const remarks=[r.remarks,r.cancellationPolicies?.hotelRemarks,o.remarks,h.remarks,h.termsAndConditions].flat(Infinity).filter(x=>typeof x==='string'&&x.trim());
 if(remarks.length)issues.push('REMARKS_REQUIRE_COMMERCIAL_QUALIFICATION');
 if((amount(h.addonsTotalAmount)??0)!==0||Array.isArray(h.addonsRequest)&&h.addonsRequest.length||h.voucherCode||(amount(h.voucherTotalAmount)??0)!==0)issues.push('UNAUTHORIZED_OR_UNSUPPORTED_COMMERCIAL_ADJUSTMENT');
 const base=retail?.amount??null,excluded=payAtProperty.reduce((n,v)=>n+(amount(v.amount)??0),0);
 return {representation,sources,components,payAtProperty,amountsByCurrency,remarks,suggestedSellingPrice:selling,priceQualification,importantInformation,
  observedRetail:clone(r.retailRate?.total??null),offerRetail:clone(o.offerRetailRate??null),observedPrebookPrice:own(h,'price')?h.price:null,
  priceSource:'rate.retailRate.total[0] corroborated by exact prebook data.price when present',baseAmount:base,
  completeTotal:issues.length?null:round(base+excluded),currency,issues:[...new Set(issues)],nullSemanticsSource:DOCUMENTARY_LITEAPI_SOURCES.fiscal,
  excludedPaymentSemantics:'EXCLUDED_COMPONENTS_PAYABLE_AT_PROPERTY_NOT_CHARGED_NOW',internalCacheTtlUsed:false,fxApplied:false,guestAmountsInvented:false};
}

export function documentaryDetail(record,hotelId,facilitiesRecord=null){
 const payload=readDocumentaryResponse(record),p=payload?.data;
 const identityVerified=plain(p)&&p.id===hotelId&&(!own(p,'hotelId')||p.hotelId===hotelId),issues=[...errors(payload),...errors(p,'data')];
 if(own(p,'deletedAt')&&p.deletedAt!==null)issues.push('DETAIL_DELETED_PROPERTY');
 const usable=Boolean(identityVerified&&!issues.length),facilityObservations=[];
 if(usable){
  if(Array.isArray(p.hotelFacilities))for(const [i,value] of p.hotelFacilities.entries())if(typeof value==='string')facilityObservations.push({field:`hotelFacilities[${i}]`,value});
  if(Array.isArray(p.facilities))for(const [i,value] of p.facilities.entries())if(plain(value)&&typeof value.name==='string')facilityObservations.push({field:`facilities[${i}].name`,value:value.name});
 }
 // Catalog is provenance/validation only; it cannot assert property possession.
 const catalogPayload=readDocumentaryResponse(facilitiesRecord),catalog=Array.isArray(catalogPayload?.data)&&!errors(catalogPayload).length?catalogPayload.data:null;
 return {identityVerified,usable,status:!record?'NOT_OBSERVED':!payload?'TRANSPORT_OR_PAYLOAD_UNUSABLE':issues.length?'PROVIDER_ERROR_OR_UNSUPPORTED':identityVerified?'USABLE':'IDENTITY_UNVERIFIED',issues,
  property:usable?clone(p):null,facilityObservations,catalogObserved:catalog!==null,catalogNeverGrantsPropertyFacility:true,
  originalPayload:clone(payload),source:record?.response?[{field:'data',evidence:[{ref:'capture/request/'+record.ordinal+'/response',sha256:record.response.body.sha256}]}]:[]};
}
export function documentaryTiming(payload,record,evaluatedAt){
 const fields=[],walk=(o,p,depth)=>{if(!plain(o)||depth>5)return;for(const key of ['validUntil','expiresAt'])if(own(o,key))fields.push({field:p+'.'+key,value:o[key]});
  if(plain(o.data))walk(o.data,p+'.data',depth+1);for(const k of ['roomTypes','rates'])if(Array.isArray(o[k]))o[k].forEach((v,i)=>walk(v,p+'.'+k+'['+i+']',depth+1));};walk(payload,'response',0);
 const values=fields.map(x=>x.value),status=!values.length?'PROVIDER_EXPIRY_NOT_DECLARED':values.some(x=>!utc(x))?'PROVIDER_EXPIRY_UNINTERPRETABLE':new Set(values).size>1?'PROVIDER_EXPIRY_CONFLICT':Date.parse(values[0])<=Date.parse(evaluatedAt)?'EXPLICITLY_EXPIRED':'EXPLICIT_WINDOW_VALID';
 return {verificationAt:record?.completedAt??null,providerExpiryFields:fields,providerValidUntil:['EXPLICITLY_EXPIRED','EXPLICIT_WINDOW_VALID'].includes(status)?values[0]:null,status,internalTtl:null,evaluatedAt,
  independentTimestampCertified:false,futureAvailabilityGuaranteed:false,qualification:'Only the observed provider instant; no invented TTL or future checkout guarantee.'};
}
