// Pure coverage accounting; no merit, price qualification, kernel or policy.
import {canonical,sha,hash,fail,PROPOSED_PLAN,validateCoverageMechanismPlan,coverageRequest} from './liteapi-search-coverage-plan-v1.mjs';
import {decodeDocumentaryOffer} from './liteapi-documentary-wire-v1.mjs';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const opaque=x=>typeof x==='string'&&x.trim().length>0&&!/[\x00-\x1f\x7f]/.test(x);
const normal=x=>typeof x==='string'?x.normalize('NFKC').trim().toUpperCase():null;
const cmp=(a,b)=>a<b?-1:a>b?1:0;
export function semanticErrors(value,pointer='$'){
 const out=[];if(Array.isArray(value)){value.forEach((v,i)=>out.push(...semanticErrors(v,pointer+'['+i+']')));return out;}
 if(!plain(value))return out;
 for(const [k,v] of Object.entries(value)){
  if(['error','errors'].includes(k)&&v!==null&&!(Array.isArray(v)&&v.length===0))out.push(pointer+'.'+k);
  // Error semantics apply to the documented envelope/property/offer/rate
  // containers, not an unrelated extension object's arbitrarily named field.
  else if(['data','roomTypes','rates'].includes(k)&&v&&typeof v==='object')out.push(...semanticErrors(v,pointer+'.'+k));
 }return out;
}
export function parseCoverageBody(bytes,expectedSha256){
 if(sha(bytes)!==expectedSha256)fail('ORIGINAL_HASH');let p;
 try{p=JSON.parse(Buffer.from(bytes).toString('utf8'));}catch{fail('JSON_UNSUPPORTED');}
 if(!plain(p)||!Array.isArray(p.data))fail('ROOT_SCHEMA_UNSUPPORTED');return p;
}
export function selectCoverageCatalog(bytes,expectedSha256,plan=PROPOSED_PLAN){
 validateCoverageMechanismPlan(plan);const {scenario,controls}=plan;
 const p=parseCoverageBody(bytes,expectedSha256);if(semanticErrors(p).length)fail('CATALOG_SEMANTIC_ERROR');
 if(p.data.length>controls.catalogLimit||p.data.some(r=>!plain(r)))fail('CATALOG_SCHEMA_UNSUPPORTED');
 const rows=p.data.map((r,index)=>({index,id:r.id??null,recordSha256:hash(r),
  selectionFactSha256:hash({id:r.id??null,country:normal(r.country),city:normal(r.city)}),
  reason:!opaque(r.id)?'ID_UNSUPPORTED':normal(r.country)!==normal(scenario.countryCode)?'COUNTRY_NOT_VERIFIED':normal(r.city)!==normal(scenario.destination)?'CITY_NOT_VERIFIED':null,duplicate:false,nonSelectionDifferences:false,nonSelectionDifferingFields:[]}));
 const groups=new Map();for(const r of rows)if(opaque(r.id))groups.set(r.id,[...(groups.get(r.id)??[]),r]);
 for(const group of groups.values())if(group.length>1){for(const r of group)r.duplicate=true;
  if(new Set(group.map(r=>r.selectionFactSha256)).size>1)for(const r of group)r.reason='DUPLICATE_ID_CONFLICT';
  else if(new Set(group.map(r=>r.recordSha256)).size>1){
   const fields=[...new Set(group.flatMap(r=>Object.keys(p.data[r.index])))].filter(k=>!['id','country','city'].includes(k)).sort();
   const differing=fields.filter(k=>new Set(group.map(r=>canonical({present:Object.hasOwn(p.data[r.index],k),value:p.data[r.index][k]??null}))).size>1);
   for(const r of group){r.nonSelectionDifferences=true;r.nonSelectionDifferingFields=[...differing];}
  }}
 const ids=[...new Set(rows.filter(r=>!r.reason).map(r=>r.id))];
 ids.sort((a,b)=>cmp(hash([controls.seed,a]),hash([controls.seed,b]))||cmp(a,b));
 const selection={version:'stayopti.verified-catalog-sample@1.1',catalogSha256:expectedSha256,seed:controls.seed,planFingerprint:hash({caseId:plan.caseId,scenario,controls}),rawRows:rows.length,
  eligibleUniqueIds:ids.length,poolIds:[...ids].sort(cmp),poolFingerprint:hash([...ids].sort(cmp)),selectedIds:ids.slice(0,controls.maximumSelectedIds),rows,
  catalogComplete:false,availabilityCertified:false,meritSelection:false,geographyBasis:'PROVIDER_CATALOG_CITY_COUNTRY_NOT_INDEPENDENT_GEOCODING'};
 return {...selection,derivedRequest:selection.selectedIds.length?coverageRequest('ID_RATES',selection,plan):null};
}
/** Every source row/offer retains its index and issues, even if the older wire
 * rejects the whole candidate. Raw opaque IDs remain only in encrypted originals. */
export function inspectCoverageRates({bytes,status,headers,request,selection}){
 if(status===204){if(bytes.length)fail('NO_CONTENT_WITH_BYTES');return {status:'NO_CONTENT',rawRows:0,rawUniqueHotels:0,rawOffers:0,occupancyLinkedOffers:0,wireBindableOffers:0,rows:[],hotelFingerprints:[],semanticErrors:[]};}
 const p=parseCoverageBody(bytes,sha(bytes)),errors=semanticErrors(p);
 const record={intent:{...request,kind:'SEARCH'},response:{status,headers,body:{base64:Buffer.from(bytes).toString('base64'),byteLength:bytes.length,sha256:sha(bytes)}}};
 const rows=p.data.map((hotel,index)=>{
  const hotelId=hotel?.hotelId,issues=[];if(!opaque(hotelId))issues.push('PROPERTY_ID_UNSUPPORTED');
  if(request.kind==='ID_RATES'&&(!opaque(hotelId)||!selection.selectedIds.includes(hotelId)))issues.push('UNEXPECTED_ID_NOT_IN_REQUEST');
  if(!Array.isArray(hotel?.roomTypes))issues.push('OFFER_ARRAY_MISSING_OR_UNSUPPORTED');
  const offers=(Array.isArray(hotel?.roomTypes)?hotel.roomTypes:[]).map((offer,offerIndex)=>{
   const reasons=[...issues];let d;
   if(!opaque(offer?.offerId))reasons.push('OFFER_ID_UNSUPPORTED');
   try{d=decodeDocumentaryOffer(record,{hotelId,offerId:offer?.offerId,scenario:{searchRequest:request.body},stage:'SEARCH'});reasons.push(...(d.issue?[d.issue]:[]),...(d.issues??[]));}
   catch{reasons.push('WIRE_SHAPE_UNSUPPORTED');}
   const rates=offer?.rates,rate=Array.isArray(rates)&&rates.length===1?rates[0]:null,o=request.body.occupancies[0];
   const occupancyLinked=Boolean(rate&&rate.adultCount===o.adults&&rate.childCount===o.children.length&&rate.occupancyNumber===1&&
    ['childrenAges','children','childAges'].every(k=>!Object.hasOwn(rate,k)||canonical(rate[k])===canonical(o.children))&&
    (!Object.hasOwn(rate,'occupancy')||canonical(rate.occupancy)===canonical(o)));
   return {offerIndex,offerFingerprint:opaque(offer?.offerId)?hash(offer.offerId):null,rateComponents:Array.isArray(rates)?rates.length:null,
    occupancyLinked,occupancyBasis:occupancyLinked?'EXACT_REQUEST_COUNTS_AND_ANY_RETURNED_AGES_NO_AGE_ECHO_INVENTED':'NOT_EXACT_OR_UNSUPPORTED',wireBindable:reasons.length===0,issues:[...new Set(reasons)]};
  });
  return {index,hotelFingerprint:opaque(hotelId)?hash(hotelId):null,recordSha256:hash(hotel),issues,offers};
 });
 const fingerprints=[...new Set(rows.map(r=>r.hotelFingerprint).filter(Boolean))].sort();
 return {status:errors.length?'SEMANTIC_ERROR':'OBSERVATIONS_COUNTED',rawRows:rows.length,rawUniqueHotels:fingerprints.length,
  rawOffers:rows.reduce((n,r)=>n+r.offers.length,0),occupancyLinkedOffers:rows.reduce((n,r)=>n+r.offers.filter(o=>o.occupancyLinked).length,0),
  wireBindableOffers:rows.reduce((n,r)=>n+r.offers.filter(o=>o.wireBindable).length,0),rows,hotelFingerprints:fingerprints,semanticErrors:errors,
  rootMetadata:Object.fromEntries(Object.entries(p).filter(([k])=>k!=='data').map(([k,v])=>[k,{sha256:hash(v),type:Array.isArray(v)?'array':typeof v}])),
  totalInventoryOrExhaustionCertified:false,bookabilityCertified:false};
}
export function coverageComparison(arms){
 const c=arms.CITY_RATES,d=arms.ID_RATES,a=c?.hotelFingerprints??[],b=d?.hotelFingerprints??[];
 return {bothArmsObserved:Boolean(c&&d),overlap:c&&d?a.filter(x=>b.includes(x)).length:null,cityOnly:c&&d?a.filter(x=>!b.includes(x)).length:null,
  idsOnly:c&&d?b.filter(x=>!a.includes(x)).length:null,simultaneous:false,providerInventoryExhausted:null,
  inference:'BOUNDED_DIFFERENT_SELECTION_WINDOWS_NOT_MARKET_EXHAUSTION_OR_CAUSAL_PROOF',engineInvocations:0,policyInvocations:0};
}
