// D-0063. Pure, evaluation-only documentary qualification. No transport or policy.
export const LITEAPI_QUALIFICATION_VERSION='stayopti.liteapi-offer-qualification@1';
const clone=x=>structuredClone(x),own=(o,k)=>o!=null&&Object.hasOwn(o,k);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const canonical=x=>JSON.stringify(x,(_k,v)=>plain(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const same=(a,b)=>canonical(a)===canonical(b);
const amount=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:typeof x==='string'&&/^\d+(?:\.\d{1,2})?$/.test(x)?Number(x):null;
const currency=x=>typeof x==='string'&&/^[A-Z]{3}$/.test(x);
const money=x=>{const v=Array.isArray(x)&&x.length===1?x[0]:x;return plain(v)&&amount(v.amount)!==null&&currency(v.currency)?{amount:amount(v.amount),currency:v.currency}:null;};
const source=(d,field)=>({field,responseSha256:d.binding?.payloadSha256??null,selectedOfferPointer:d.binding?.pointer??null});

/** SSP >= threshold is a public-channel qualification, not a price rewrite.
 * Current POST/GET schemas specify money-object SSP. A scalar observed there is
 * preserved, NOT silently borrowed from the /rates/alternatives schema. */
export function qualifyDocumentaryPrices(d,requestedCurrency){
 const r=d.rate??{},o=d.offer??{},h=d.hotel??{},isPrebook=own(h,'prebookId'),issues=[];
 const definitions=[
  ['retailRate.total',r.retailRate,'total','RATE_TRANSACTION','MONEY'],
  ['offerRetailRate',o,'offerRetailRate','OFFER_TRANSACTION','MONEY'],
  ['price',h,'price','PREBOOK_TRANSACTION','SCALAR_CURRENCY'],
  ['sellingPriceToUser',h,'sellingPriceToUser','OBSERVED_USER_PRICE_UNQUALIFIED','OBSERVED_SCALAR'],
  ['rate.suggestedSellingPrice',r.retailRate,'suggestedSellingPrice','RATE_PUBLIC_MINIMUM','MONEY'],
  ['offer.suggestedSellingPrice',o,'suggestedSellingPrice','OFFER_PUBLIC_MINIMUM','MONEY'],
  ['prebook.suggestedSellingPrice',h,'suggestedSellingPrice','PREBOOK_PUBLIC_MINIMUM','MONEY'],
  ['rate.commission',r,'commission','RATE_COMMISSION_NOT_COST','MONEY'],
  ['prebook.commission',h,'commission','PREBOOK_COMMISSION_NOT_COST','SCALAR_CURRENCY'],
  ['providerCommission',r,'providerCommission','PROVIDER_COMMISSION_NOT_COST','MONEY'],
 ];
 const fields=definitions.map(([field,obj,key,scope,format])=>{
  const present=own(obj,key),original=present?clone(obj[key]):null;
  const parsed=!present||original===null?null:format==='MONEY'?money(original):isPrebook&&amount(original)!==null&&currency(h.currency)?{amount:amount(original),currency:h.currency}:null;
  const scalarSSP=field==='prebook.suggestedSellingPrice'&&typeof original==='number';
  return {field,scope,presence:!present?'OMITTED':original===null?'NULL':'PRESENT',original,
   parsed,qualification:!present?'NOT_OBSERVED':original===null?'NULL_UNQUALIFIED':scalarSSP?'SCALAR_PREBOOK_SSP_NOT_IN_ENDPOINT_SCHEMA':
    format==='OBSERVED_SCALAR'?'FIELD_NOT_IN_POST_GET_ENDPOINT_SCHEMA':parsed?'DOCUMENTED_SHAPE':'UNSUPPORTED_SHAPE_OR_CURRENCY',
   currencyBasis:parsed?(format==='MONEY'?'EXPLICIT_MONEY_CURRENCY':'PREBOOK_DATA_CURRENCY_PRICES_AND_FEES'):null,
   containerCurrencyObservation:isPrebook?{value:clone(h.currency??null),source:source(d,'data.currency'),assignedToUnsupportedScalar:false}:null,
   source:source(d,field)};
 });
 const retail=fields[0].parsed,ssps=fields.filter(f=>f.scope.endsWith('PUBLIC_MINIMUM')&&f.presence==='PRESENT');
 const comparisons=ssps.map(f=>{
  const comparable=retail&&retail.currency===requestedCurrency&&f.parsed&&f.parsed.currency===retail.currency;
  const status=!comparable?'NOT_COMPARABLE':retail.amount<f.parsed.amount?'BELOW_PUBLIC_MINIMUM':'AT_OR_ABOVE_PUBLIC_MINIMUM';
  if(status==='NOT_COMPARABLE')issues.push(f.qualification==='SCALAR_PREBOOK_SSP_NOT_IN_ENDPOINT_SCHEMA'?f.qualification:'SSP_AMOUNT_SCOPE_OR_CURRENCY_UNQUALIFIED');
  if(status==='BELOW_PUBLIC_MINIMUM')issues.push('OBSERVED_PUBLIC_PRICE_BELOW_SSP');
  return {field:f.field,status,retail:clone(retail),ssp:clone(f.parsed),scopeBasis:'EXACT_SINGLE_RATE_SINGLE_OFFER_ONLY',source:f.source};
 });
 const comparableSSPs=ssps.filter(f=>f.parsed&&f.parsed.currency===requestedCurrency);
 if(comparableSSPs.some(f=>f.parsed.amount!==comparableSSPs[0].parsed.amount))issues.push('SSP_SOURCES_CONFLICT');
 const selling=fields.find(f=>f.field==='sellingPriceToUser');
 if(selling.presence==='PRESENT'&&(!selling.parsed||!retail||!same(selling.parsed,retail)))issues.push('SELLING_PRICE_TO_USER_DIFFERENCE_OR_SCOPE_UNQUALIFIED');
 return {version:LITEAPI_QUALIFICATION_VERSION,fields,comparisons,issues:[...new Set(issues)],
  priceBasis:'OBSERVED_RETAIL_NO_AUTOMATIC_MARKUP_OR_SSP_REPLACEMENT',taxCompletenessCertified:false,commissionUsedForMerit:false,
  sources:['https://docs.liteapi.travel/docs/revenue-management-and-commission','https://docs.liteapi.travel/reference/post_rates-prebook','https://docs.liteapi.travel/reference/get_prebooks-prebookid']};
}

/** Deliberately separate session identity, occupancy labels and actual terms.
 * No claim that a changed opaque ID proves a price/room purchase change. */
export function compareDocumentaryRetrieval(post,get,commercial){
 const differences=keys=>keys.filter(k=>!same(post[k],get[k])).map(k=>({field:k,before:clone(post[k]),after:clone(get[k])}));
 if(post.issue||get.issue)return {status:'NOT_COMPARABLE',issues:['RETRIEVAL_NOT_COMPARABLE']};
 const pa=post,ga=get;post={session:pa.binding.prebookId,property:pa.binding.hotelId,selectedOffer:pa.binding.selectedOfferId,
  occupancyNumber:pa.rate.occupancyNumber,adultCount:pa.rate.adultCount,childCount:pa.rate.childCount,
  rateId:pa.rate.rateId,priceType:pa.hotel.priceType??null,ratePriceType:pa.rate.priceType??null,
  paymentTypes:pa.hotel.paymentTypes??null,ratePaymentTypes:pa.rate.paymentTypes??null};
 get={session:ga.binding.prebookId,property:ga.binding.hotelId,selectedOffer:ga.binding.selectedOfferId,
  occupancyNumber:ga.rate.occupancyNumber,adultCount:ga.rate.adultCount,childCount:ga.rate.childCount,
  rateId:ga.rate.rateId,priceType:ga.hotel.priceType??null,ratePriceType:ga.rate.priceType??null,
  paymentTypes:ga.hotel.paymentTypes??null,ratePaymentTypes:ga.rate.paymentTypes??null};
 const identityDiff=differences(['session','property','selectedOffer']),occupancyDiff=differences(['occupancyNumber','adultCount','childCount']),rateDiff=differences(['rateId']);
 const metadataDiff=differences(['priceType','ratePriceType','paymentTypes','ratePaymentTypes']);
 const ca=commercial(pa),cg=commercial(ga),termsDiff=Object.keys(ca).filter(k=>!same(ca[k],cg[k])).map(k=>({field:k,before:clone(ca[k]),after:clone(cg[k])}));
 const issues=[...(identityDiff.length?['RETRIEVAL_IDENTITY_CONFLICT']:[]),...(occupancyDiff.length?['RETRIEVAL_OCCUPANCY_LINK_UNRESOLVED']:[]),
  ...(rateDiff.length?['RETRIEVAL_RATE_IDENTITY_UNRESOLVED']:[]),...(metadataDiff.length?['RETRIEVAL_COMMERCIAL_METADATA_UNRESOLVED']:[]),...(termsDiff.length?['PREBOOK_RETRIEVAL_COMMERCIAL_CONFLICT']:[])];
 return {status:issues.length?'UNRESOLVED_OR_CONFLICTING':'MATCH',
  identity:{status:identityDiff.length?'CONFLICTING':'MATCH',differences:identityDiff},
  occupancy:{status:occupancyDiff.length?'UNRESOLVED_DIFFERENCE':'MATCH',differences:occupancyDiff,numberIsGuestCount:false,indexConversionApplied:false},
  rateIdentity:{status:rateDiff.length?'UNRESOLVED_DIFFERENCE':'MATCH',differences:rateDiff,equivalenceAssumed:false},
  commercial:{status:termsDiff.length?'CONFLICTING':'MATCH',differences:termsDiff},
  commercialMetadata:{status:metadataDiff.length?'UNRESOLVED_DIFFERENCE':'MATCH',differences:metadataDiff},
  providerExplanationAvailable:false,independentAvailabilityVerification:false,issues,
  sources:[source(pa,'POST record'),source(ga,'GET record')]};
}

/** Bounded classification only. Original text is always retained. Property-wide
 * conditions do not magically acquire tariff/guest applicability or an amount. */
export function qualifyHotelImportantInformation(detail,boardName){
 const original=detail?.property?.hotelImportantInformation;
 const supplied=original!==undefined&&original!==null;
 const entries=[],issues=[];
 if(supplied&&typeof original!=='string')issues.push('PROPERTY_IMPORTANT_INFORMATION_UNSUPPORTED_SHAPE');
 if(typeof original==='string')for(const text of original.split(/\r?\n|;|(?<=[.!?])\s+(?=[A-Z])/).map(s=>s.trim()).filter(Boolean)){
  // An untranslated/unsupported arrival direction is not evidence of an
  // unknown charge. Keep it unconsumed without inventing a fiscal obstacle.
  const monetary=/\b(?:fees?|tax(?:es)?|charges?|charged|surcharge|costs?|amount|pay(?:ment|able)?|cleaning|deposit|bond|hold|supplement|money|EUR|USD|GBP|CHF|AUD|CAD|NZD|JPY|CNY|AED|INR|spes[ae]|tass[ae]|costi|pagament\w*)\b|[€$£¥]/i.test(text);
  let category=monetary?'UNCLASSIFIED':'NON_MONETARY_UNINTERPRETED',applicability='UNVERIFIED',blocking=monetary,reason=monetary?'UNSUPPORTED_PROPERTY_CONDITION':'NO_MONETARY_ASSERTION_CONSUMED';
  if(/\bdeposit\b/i.test(text)){
   category='DEPOSIT_SEPARATE_FROM_STAY_PRICE';reason='REFUNDABILITY_AMOUNT_AND_RATE_SCOPE_NOT_ASSUMED';
   if(/\b(?:fully )?refundable\b/i.test(text)&&!/(?:non[- ]|not )refundable/i.test(text)){blocking=false;reason='EXPLICITLY_REFUNDABLE_NOT_ADDED_TO_STAY_COST';}
  }else if(monetary&&/\b(?:mandatory|required|compulsory|obbligator\w*)\b/i.test(text)){
   category='MANDATORY_OR_CONDITIONED_CHARGE';reason='AMOUNT_BASIS_AND_APPLICABILITY_REQUIRE_QUALIFICATION';
  }else if(/\b(?:pet|pets|animali)\b/i.test(text)){
   category='CONDITIONAL_EXTRA';applicability='NOT_REQUESTED_NO_APPLICABILITY_ASSUMED';blocking=false;reason='PET_CONDITION_RETAINED_NOT_ADDED_TO_FAMILY_STAY';
  }else if(/\bbreakfast\b/i.test(text)&&(/\boptional\b/i.test(text)||/^room\s*only$/i.test(boardName??''))){
   category='OPTIONAL_EXTRA';applicability='NOT_INCLUDED_IN_ROOM_ONLY';blocking=false;reason='BREAKFAST_NOT_REQUESTED_OR_INCLUDED';
  }else if(/\brestaurant (?:will )?(?:only )?(?:be |is )?(?:open|serves|only)/i.test(text)&&!monetary){
   category='NON_MONETARY_CONDITION';blocking=false;reason='HOURS_NOT_A_MONETARY_COMPONENT';
  }
  // Optionality/refundability concerns its subject, not every amount in the
  // sentence. A second monetary subject is not silently made optional too.
  // This bounded guard declines mixed clauses; it neither sums them nor
  // purports to parse their tax/guest/booking applicability.
  const subject=category==='DEPOSIT_SEPARATE_FROM_STAY_PRICE'?/\bdeposit\b/i:
   category==='OPTIONAL_EXTRA'?/\bbreakfast\b/i:category==='CONDITIONAL_EXTRA'?/\b(?:pet|pets|animali)\b/i:null;
  const secondMonetarySubject=subject&&text.split(/\b(?:and|plus|but|also)\b/i).slice(1).some(clause=>
   /\b(?:fees?|tax(?:es)?|charges?|surcharge|supplement)\b/i.test(clause)&&!subject.test(clause));
  if(secondMonetarySubject){blocking=true;category='MIXED_MONETARY_CONDITIONS';applicability='UNVERIFIED';reason='SECOND_CHARGE_NOT_COVERED_BY_EXTRA_OR_REFUNDABILITY_QUALIFIER';}
  entries.push({text,category,applicability,blocking,reason,amountAdded:0,scope:'PROPERTY_WIDE_NOT_TARIFF_CERTIFICATION',
   source:{field:'data.hotelImportantInformation',links:clone(detail.source??[])}});
  if(blocking)issues.push(category==='DEPOSIT_SEPARATE_FROM_STAY_PRICE'?'PROPERTY_DEPOSIT_TREATMENT_UNVERIFIED':'PROPERTY_IMPORTANT_INFORMATION_REQUIRES_QUALIFICATION');
 }
 return {presence:!supplied?'NOT_OBSERVED':'OBSERVED',original:clone(original??null),entries,issues:[...new Set(issues)],
  automaticChargeSum:0,optionalExtrasIncluded:false,propertyScopeDoesNotCertifyTariff:true};
}

// Explicit English bed vocabulary. Numbers and count/type alternatives survive;
// neither dimensions nor maxOccupancy supplies extra sleeping places.
export function normalizeEnglishBedInventory(text){
 if(typeof text!=='string')return null;
 const names={one:1,two:2,three:3,four:4,five:5,six:6};
 const s=text.trim().toLowerCase().replace(/[.!]$/,'');
 const part='(\\d+|one|two|three|four|five|six)\\s+(super[- ]king|king|queen|double|single|twin|sofa|bunk)(?:[- ]size)?(?:\\s+beds?)?';
 const parse=t=>{const beds=[];let rest=t;const re=new RegExp('^'+part+'(?=\\s|,|\\+|$)');
  while(rest){const m=rest.match(re);if(!m)return null;const count=names[m[1]]??Number(m[1]);if(!Number.isSafeInteger(count)||count<1||count>100)return null;
   const type=m[2].toUpperCase().replace(/ /g,'-'),kind=/^(?:SINGLE|TWIN)$/.test(type)?'SINGLE':/^(?:SOFA|BUNK)$/.test(type)?type:'DOUBLE';
   beds.push({kind,count,placesPerBed:kind==='SINGLE'?1:kind==='DOUBLE'?2:null,placeBasis:'LEXICAL_ENGLISH_BED_TYPE_NOT_CAPACITY',documentedType:type});
   rest=rest.slice(m[0].length).trim();if(rest.startsWith(',')||rest.startsWith('+'))rest=rest.slice(1).trim();
   if(/^and\b/.test(rest))rest=rest.slice(3).trim();if(!rest&&/(?:[,+]|\band)$/.test(t))return null;
  }return beds.length?{complete:false,beds}:null;};
 const branches=s.split(/\s+or\s+/),alternatives=branches.map(parse);
 if(alternatives.some(x=>x===null))return null;
 return branches.length>1?{relation:'OR',alternatives,inventory:null}:{relation:'AND',alternatives,inventory:alternatives[0]};
}

export const ROOM_DESCRIPTION_BED_VERSION='stayopti.room-description-bed-inventory@1';
const roomDenomination='(?:(?:standard|superior|deluxe|executive|family|junior|classic|premium|economy|basic)\\s+){0,3}(?:room|suite|studio|apartment)';
const roomInventoryForms=[
 new RegExp('^\\s*'+roomDenomination+'(?:\\s+-\\s+|\\s*[:,]\\s*|\\s+(?:with\\s+)?)(?<inventory>.+?)\\s*$','id'),
 new RegExp('^\\s*'+roomDenomination+'\\s*\\(\\s*(?<inventory>[^()]+?)\\s*\\)\\s*[.!]?\\s*$','id'),
 new RegExp('^\\s*(?<inventory>.+?)(?:\\s*[-:,]\\s*|\\s+)'+roomDenomination+'\\s*[.!]?\\s*$','id'),
];

/** Evaluation-only wrapper, deliberately separate from whole-label parsing of
 * structured bedTypes. A complete, bounded room denomination may surround one
 * contiguous inventory. Every surrounding character must match a known form;
 * unknown adjectives, qualifications, negation and OR are never stripped.
 * Offsets are UTF-16, end-exclusive, relative to the exact original text. */
export function qualifyEnglishRoomDescriptionBeds(text){
 const originalText=typeof text==='string'?text:null;
 const result={version:ROOM_DESCRIPTION_BED_VERSION,originalText,status:'UNSUPPORTED',
  reason:originalText===null?'NOT_TEXT':'NO_COMPLETE_BOUNDED_INVENTORY_AND_ROOM_DENOMINATION',
  parsed:null,interpretedSpan:null,surroundingSpans:[],
  uninterpretedSpans:originalText===null?[]:[{start:0,end:text.length,text}],
  limits:{language:'BOUNDED_ENGLISH',maximumDescriptorTextLength:1024,offsetUnit:'UTF16_END_EXCLUSIVE',
   denominationMeaning:'NAME_ONLY_NO_UNIT_TYPE_PRIVACY_OR_COMFORT_FACT',
   descriptorRequiresExplicitBedNounPerAlternative:true,
   completeInventoryCertified:false,capacityUsedAsBedEvidence:false,unknownSurroundingTextDiscarded:false}};
 if(originalText===null)return result;
 const accept=(parsed,start,end,reason)=>({...result,status:'SUPPORTED',reason,parsed,
  interpretedSpan:{start,end,text:text.slice(start,end)},uninterpretedSpans:[],
  surroundingSpans:[[0,start],[end,text.length]].filter(([a,b])=>b>a).map(([start,end])=>
   ({start,end,text:text.slice(start,end),meaning:'RECOGNIZED_DENOMINATION_OR_SEPARATOR_NOT_BED_EVIDENCE'}))});
 const direct=normalizeEnglishBedInventory(text);
 if(direct){const start=text.length-text.trimStart().length,end=text.trimEnd().length;
  return accept(direct,start,end,'WHOLE_CLAUSE_ENGLISH_INVENTORY');}
 if(text.length>result.limits.maximumDescriptorTextLength)return {...result,reason:'ROOM_DESCRIPTION_EXCEEDS_BOUNDED_LENGTH'};
 for(const form of roomInventoryForms){
  const match=form.exec(text);if(!match)continue;
  // Omitted bed nouns are legacy shorthand only for a whole inventory clause.
  // In a room name, "one king suite" counts a suite, not a king bed. Require
  // an explicit bed noun in every OR branch before consuming a denomination.
  if(match.groups.inventory.split(/\s+or\s+/i).some(branch=>!/\bbeds?\b/i.test(branch)))continue;
  const parsed=normalizeEnglishBedInventory(match.groups.inventory);if(!parsed)continue;
  const [start,end]=match.indices.groups.inventory;
  return accept(parsed,start,end,'INVENTORY_WITH_COMPLETE_RECOGNIZED_ROOM_DENOMINATION');
 }
 return result;
}

/** Compare each documented maximum with the requested group, not with another
 * source's maximum. Missing optional sublimits remain individually UNKNOWN;
 * they are not invented requirements. Both total limits are needed here. */
export function assessRoomCapacityLimits(rate,room,party){
 const required={maxOccupancy:party.adults+party.childAgesAtStay.length,maxAdults:party.adults,maxChildren:party.childAgesAtStay.length};
 const checks=['RATE','MAPPED_ROOM'].flatMap(origin=>Object.entries(required).map(([field,count])=>{
  const record=origin==='RATE'?rate:room,value=record?.[field],present=own(record,field);
  const valid=Number.isSafeInteger(value)&&value>=0;
  return {origin,field,original:clone(value??null),presence:!present?'OMITTED':value===null?'NULL':'PRESENT',required:count,
   status:!valid?'UNKNOWN':value<count?'INSUFFICIENT':'SATISFIED',
   reason:!valid?(present?'INVALID_OR_UNDOCUMENTED_LIMIT':'LIMIT_NOT_DOCUMENTED'):value<count?'DOCUMENTED_LIMIT_BELOW_GROUP':'DOCUMENTED_MAXIMUM_COVERS_GROUP',
   blocksVerification:!valid&&(field==='maxOccupancy'||present)};
 }));
 const differences=Object.keys(required).flatMap(field=>{
  const [a,b]=checks.filter(c=>c.field===field);return a.status!=='UNKNOWN'&&b.status!=='UNKNOWN'&&a.original!==b.original?[{field,rate:a.original,mapped:b.original,reasonForDifference:'NOT_ESTABLISHED'}]:[];
 });
 return {version:'stayopti.room-capacity-assessment@1',checks,differences,
  sourceAgreement:differences.length?'DIFFERENT_LIMITS':checks.filter(c=>c.field==='maxOccupancy').some(c=>c.status==='UNKNOWN')?'UNKNOWN':'EQUAL_LIMITS',
  status:checks.some(c=>c.status==='INSUFFICIENT')?'INSUFFICIENT':checks.some(c=>c.blocksVerification)?'UNKNOWN':'SATISFIED',
  scope:'OBSERVED_APPLICABLE_MAXIMA_ONLY_NOT_UNDOCUMENTED_RULES',bedPlacesInferred:false};
}

export function compareMappedRoom(detail,decoded,searchDecoded,sleeping,party){
 const selectedId=decoded.binding?.mappedRoomId??searchDecoded.binding?.mappedRoomId??null;
 const result={version:'stayopti.mapped-room-comparison@2',status:'NOT_DOCUMENTED',mappedRoomId:selectedId,issues:[],capacityConflict:false,sleepingConflict:false,
  room:null,rateCapacity:decoded.rate?.maxOccupancy??null,rateInventory:clone(sleeping.inventory),roomInventories:[],
  sources:[source(decoded,'rate.name + maxOccupancy + mappedRoomId'),source(searchDecoded,'selected offer mappedRoomId'),...clone(detail.source??[])]};
 if(selectedId===null||!detail.usable)return result;
 const rooms=detail.property?.rooms;if(!Array.isArray(rooms))return {...result,status:'MAPPED_CONTENT_UNAVAILABLE'};
 const matches=rooms.map((room,index)=>({room,index})).filter(x=>String(x.room?.id)===selectedId);
 if(matches.length!==1)return {...result,status:'MAPPED_IDENTITY_UNVERIFIED',issues:['MAPPED_ROOM_MISSING_OR_AMBIGUOUS'],capacityUnverified:true,sleepingUnverified:true};
 const {room,index}=matches[0];result.room=clone(room);result.roomPointer='data.rooms['+index+']';
 if(own(room,'hotelId')&&room.hotelId!==decoded.binding?.hotelId)return {...result,status:'MAPPED_IDENTITY_CONFLICT',issues:['MAPPED_ROOM_PROPERTY_IDENTITY_CONFLICT'],capacityConflict:true,sleepingConflict:true};
 if((room.error!=null&&!(Array.isArray(room.error)&&room.error.length===0))||(room.errors!=null&&!(Array.isArray(room.errors)&&room.errors.length===0)))return {...result,status:'MAPPED_RECORD_UNUSABLE',issues:['MAPPED_ROOM_SEMANTIC_ERROR'],capacityUnverified:true,sleepingUnverified:true};
 result.capacityAssessment=assessRoomCapacityLimits(decoded.rate??{},room,party);
 result.capacityAssessment.sources=clone(result.sources);
 result.capacityConflict=result.capacityAssessment.status==='INSUFFICIENT';
 result.capacityUnverified=result.capacityAssessment.status==='UNKNOWN';
 for(const check of result.capacityAssessment.checks){
  const code=(check.origin==='RATE'?'RATE':'MAPPED')+'_'+({maxOccupancy:'MAX_OCCUPANCY',maxAdults:'MAX_ADULTS',maxChildren:'MAX_CHILDREN'}[check.field]);
  if(check.status==='INSUFFICIENT')result.issues.push(check.origin==='MAPPED_ROOM'&&check.field==='maxOccupancy'?'MAPPED_ROOM_BELOW_REQUESTED_PARTY':code+'_BELOW_PARTY');
  if(check.blocksVerification)result.issues.push(code+'_INVALID_OR_UNSUPPORTED');
 }
 const inventory=Array.isArray(room.bedTypes)?room.bedTypes.map(b=>{
  // Whole label must be one supported lexical type, not a substring in a denial.
  const type=typeof b?.bedType==='string'?b.bedType.replace(/^extra-large double bed \(super-king size\)$/i,'Super-king bed'):null;
  return Number.isSafeInteger(b?.quantity)&&b.quantity>0&&type?normalizeEnglishBedInventory(b.quantity+' '+type)?.inventory:null;
 }):[];
 const relation=room.bedRelation;
 if(inventory.length&&inventory.every(Boolean)&&(['AND','OR'].includes(relation)||relation==='NONE'&&inventory.length===1)){
  result.roomInventories=relation==='OR'?inventory:[{complete:true,beds:inventory.flatMap(i=>i.beds)}];
  const counts=i=>Object.fromEntries(['SINGLE','DOUBLE','SOFA','BUNK','OTHER'].map(k=>[k,i.beds.filter(b=>b.kind===k).reduce((n,b)=>n+b.count,0)]));
  if(sleeping.inventory){const rateCounts=counts(sleeping.inventory);
   // A rate's lower bound must fit at least one documented configuration. A
   // lower bound is not a statement that the detail may contain no extra beds.
   const compatible=i=>{
    const c=counts(i);if(!Object.keys(c).every(k=>c[k]>=rateCounts[k]))return false;
    // Generic DOUBLE permits KING/QUEEN, but two explicitly different types
    // cannot be reconciled merely because both happen to sleep two people.
    const specific=b=>b.kind==='DOUBLE'&&b.documentedType&&b.documentedType!=='DOUBLE';
    const available=i.beds.filter(b=>b.kind==='DOUBLE').map(b=>({...b}));
    for(const b of sleeping.inventory.beds.filter(specific)){
     let remaining=b.count;
     for(const x of available.filter(x=>x.documentedType===b.documentedType||!specific(x))){const take=Math.min(remaining,x.count);x.count-=take;remaining-=take;}
     if(remaining)return false;
    }return true;
   };
   if(!result.roomInventories.some(compatible)){
    result.sleepingConflict=true;result.issues.push('RATE_MAPPED_ROOM_BED_INVENTORY_CONFLICT');
   }
  }
 }else if(inventory.length||room.bedTypes!=null){result.issues.push('MAPPED_BED_CONFIGURATION_UNSUPPORTED');result.sleepingUnverified=true;}
 result.status=result.capacityConflict||result.sleepingConflict?'CONFLICTING':result.sleepingUnverified||result.capacityUnverified?'UNVERIFIED':'COMPATIBLE_OBSERVATIONS_NOT_COMMERCIAL_CERTIFICATION';
 return result;
}
