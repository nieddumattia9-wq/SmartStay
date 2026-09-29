// D-0077. Offline price experiment, NOT an A02 preparation or LIVE capability.
// margin is documented; exact repricing/base stability/rounding are not promised.
import {comparisonRequest,validateComparisonPlan,hash,same} from './liteapi-comparison-plan-v1.mjs';
import {readDocumentaryResponse,decodeDocumentaryOffer,inspectDocumentaryFiscal,documentaryTiming} from './liteapi-documentary-wire-v1.mjs';
import {compareLiteApiCommercialTerms} from './liteapi-cancellation-comparison-v1.mjs';
import {parseExplicitInstant} from '../server/shared/explicit-instant.mjs';
import {compareSspObservedConditions} from './liteapi-ssp-requote-conditions-v1.mjs';
import {qualifyStayPriceBand} from '../server/shared/stay-price-band.mjs';

export const SSP_PROBE_VERSION='stayopti.liteapi-ssp-probe@1';
export const SSP_PROBE_OPERATIONAL_VERSION='stayopti.liteapi-ssp-probe@1.1';
// Explicit opt-in. @1/@1.1 keep their original exact-source-equality policy.
export const SSP_PROBE_DISCREPANCY_VERSION='stayopti.liteapi-ssp-probe@1.2';
export const SSP_PROBE_CONDITIONS_VERSION='stayopti.liteapi-ssp-probe@1.3';
export const SSP_PROBE_BAND_VERSION='stayopti.liteapi-ssp-probe@1.4';
const priceBand=p=>p.version===SSP_PROBE_BAND_VERSION;
// @1.4 is a pure price/matching component of MAX31, not a migration of MAX3.
export const isOperationalSspVersion=v=>[SSP_PROBE_OPERATIONAL_VERSION,SSP_PROBE_DISCREPANCY_VERSION,SSP_PROBE_CONDITIONS_VERSION].includes(v);
const boundedSsp=p=>[SSP_PROBE_DISCREPANCY_VERSION,SSP_PROBE_CONDITIONS_VERSION,SSP_PROBE_BAND_VERSION].includes(p.version);
const conditionsFirst=p=>[SSP_PROBE_CONDITIONS_VERSION,SSP_PROBE_BAND_VERSION].includes(p.version);
export const SSP_PROBE_CAPS=Object.freeze({DISCOVERY:1,REQUOTE:1,PREBOOK:1,total:3,concurrency:1,retries:0,redirects:0});
const fail=c=>{throw Error('SSP_PROBE_'+c);};
const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
const id=x=>typeof x==='string'&&x.length>0&&!/[\x00-\x1f\x7f]/.test(x);
export function validateSspProbePlan(p){
 const operational=isOperationalSspVersion(p?.version)||p?.version===SSP_PROBE_BAND_VERSION;
 if(!p||!same(Object.keys(p).sort(),['version','origin','caseId','comparisonPlan','hotelId','marginDecimals','caps',...(operational?['hotelSource','purpose']:[])].sort())||
  ![SSP_PROBE_VERSION,SSP_PROBE_OPERATIONAL_VERSION,SSP_PROBE_DISCREPANCY_VERSION,SSP_PROBE_CONDITIONS_VERSION,SSP_PROBE_BAND_VERSION].includes(p.version)||
  !(p.origin==='SYNTHETIC_ONLY'&&p.comparisonPlan?.origin==='SYNTHETIC_LOCAL_TRANSPORT'||operational&&p.origin==='LITEAPI_PRODUCTION'&&p.comparisonPlan?.origin==='LITEAPI_PRODUCTION')||
  p.comparisonPlan?.protocol!=='LITEAPI_DOCUMENTARY@1'||!id(p.hotelId)||!/^[-_A-Za-z0-9]{1,120}$/.test(p.caseId??'')||
  p.marginDecimals!==6||!same(p.caps,SSP_PROBE_CAPS))fail('PLAN_UNSUPPORTED');
 const conditions=validateComparisonPlan(p.comparisonPlan);
 if(operational&&(!same(Object.keys(p.hotelSource??{}).sort(),['reference','sha256','pointer'].sort())||
  !id(p.hotelSource.reference)||!/^\/[\w/~-]+$/.test(p.hotelSource.pointer??'')||!(/^[a-f0-9]{64}$/).test(p.hotelSource.sha256??'')||
  p.purpose!=='BOUNDED_REQUEST_MARGIN_FUNCTIONAL_TEST_NO_ENGINE'||p.caseId!==p.comparisonPlan.caseId))fail('OPERATIONAL_PLAN_BINDING');
 // The six decimal places are an explicit LOCAL experiment choice, not a
 // statement of provider precision. Other currency exponents are not guessed.
 if(!['EUR','USD','GBP'].includes(p.comparisonPlan.scenario.currency))fail('CURRENCY_MINOR_UNIT_UNSUPPORTED');
 if(priceBand(p)&&p.comparisonPlan.scenario.currency!=='EUR')fail('PRICE_BAND_EUR_ONLY');
 return {status:operational?(conditions.pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_SSP_PROBE_AUTHORIZATION'):'OFFLINE_EXPERIMENT_ONLY',
  pending:conditions.pending,a02Production:'HOLD',production:operational?'PROBE_AUTHORIZATION_REQUIRED':'HOLD',engineInvocations:0};
}
export function sspDiscoveryRequest(p){
 validateSspProbePlan(p);
 const q=comparisonRequest(p.comparisonPlan,'SEARCH');
 delete q.body.cityName;delete q.body.countryCode;
 return {...q,kind:'DISCOVERY',...(priceBand(p)?{hotelId:p.hotelId}:{}),body:{...q.body,hotelIds:[p.hotelId],limit:1}};
}
function source(record,pointer){return {responseSha256:record.response.body.sha256,requestSha256:hash(record.intent),observedAt:record.completedAt??null,pointer};}
function checked(p,r,q){
 validateSspProbePlan(p);
 if(!same(r?.intent,q))fail('RECORD_REQUEST_MISMATCH');
 if(parseExplicitInstant(r.completedAt).status!=='EXPLICIT_INSTANT')fail('OBSERVATION_TIME_REQUIRED');
 // This checks byte integrity; durable authentication is the journal's job.
 const payload=readDocumentaryResponse(r);
 if(!payload)fail('RESPONSE_UNINTERPRETABLE');
 return payload;
}
const cents=n=>{
 const s=String(n);if(!/^\d+(?:\.\d{1,2})?$/.test(s))return null;
 const [a,b='']=s.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));
};
const money=(x,currency)=>x&&x.currency===currency&&cents(x.amount)!==null?{...x,cents:cents(x.amount)}:null;
function decoded(p,r,target,stage='SEARCH'){
 return decodeDocumentaryOffer(r,{...target,scenario:{searchRequest:sspDiscoveryRequest(p).body},stage});
}
/** Local proposal, not a replacement SSP. Caller supplies only authenticated
 * wire records to the public entry points; scope comes from their decoder and
 * the single-unit request, never a caller assertion about comparable amounts. */
function resolveProbeSsp(p,d,fields){
 const currency=p.comparisonPlan.scenario.currency;
 const all=fields.filter(f=>f.scope.endsWith('PUBLIC_MINIMUM'));
 const present=all.filter(f=>f.presence!=='OMITTED');
 const reasons=[];
 const scope={basis:'SAME_SELECTED_OFFER_SINGLE_RATE_SINGLE_UNIT_TOTAL_STAY',binding:d.binding,
  units:p.comparisonPlan.scenario.units,rateCount:d.offer?.rates?.length};
 if(d.issue||d.issues.length||scope.units!==1||scope.rateCount!==1||d.binding?.occupancyNumber!==1)reasons.push('SSP_SCOPE_NOT_COMPARABLE');
 for(const container of [d.offer,d.rate])for(const k of ['quantity','units','roomCount','numberOfRooms'])
  if(own(container,k)&&container[k]!==1)reasons.push('SSP_EXPLICIT_QUANTITY_UNQUALIFIED');
 if(!present.length)reasons.push('SSP_MISSING');
 for(const f of present){
  const original=Array.isArray(f.original)&&f.original.length===1?f.original[0]:f.original;
  // MONEY plus documented source metadata only. Uninterpreted basis/quantity
  // annotations must not silently become a same-stay/same-unit certificate.
  if(f.presence!=='PRESENT'||!money(f.parsed,currency)||!original||Array.isArray(original)||
   Object.keys(original).some(k=>!['amount','currency','source'].includes(k))||
   own(original,'source')&&typeof original.source!=='string')reasons.push('SSP_AMOUNT_SCOPE_OR_CURRENCY_UNQUALIFIED');
  if(f.source.responseSha256!==d.binding.payloadSha256||f.source.selectedOfferPointer!==d.binding.pointer)reasons.push('SSP_SOURCE_BINDING_UNQUALIFIED');
  if(f.field==='prebook.suggestedSellingPrice'&&(!d.binding.prebookId||d.binding.identityBasis!=='CAPTURED_OFFER_REQUEST_AND_PREBOOK_SESSION'))reasons.push('SSP_PREBOOK_SCOPE_UNQUALIFIED');
 }
 const values=present.map(f=>money(f.parsed,currency)?.cents??null);
 const valid=!reasons.length;
 const low=valid?values.reduce((a,b)=>a<b?a:b):null,high=valid?values.reduce((a,b)=>a>b?a:b):null;
 const difference=valid?high-low:null;
 // A limited discrepancy requires the actual rate and offer observations.
 // Optional PREBOOK SSP, if returned, is also checked; it cannot be discarded.
 if(difference===1n&&!['rate.suggestedSellingPrice','offer.suggestedSellingPrice'].every(k=>present.some(f=>f.field===k)))reasons.push('SSP_DISCREPANCY_PAIR_UNPROVEN');
 if(difference!==null&&difference>1n)reasons.push('SSP_DISCREPANCY_EXCEEDS_ONE_CENT');
 const accepted=!reasons.length;
 const maximum=accepted?present[values.findIndex(v=>v===high)].parsed:null;
 return {version:'stayopti.ssp-source-resolution@1',status:!accepted?'BLOCKED':difference===0n?'EQUAL_OBSERVED_THRESHOLDS':'LIMITED_ONE_CENT_DISCREPANCY',
  reasons:[...new Set(reasons)],scope,sources:all,differenceMinorUnits:difference?.toString()??null,
  localProposal:maximum?{amount:maximum.amount,currency,basis:difference===0n?'OBSERVED_EQUAL_THRESHOLD':'CONSERVATIVE_MAXIMUM_OF_DISTINCT_SSPS',providerReturnedSsp:false}:null,
  cause:'NOT_ESTABLISHED',valuesDeclaredEqual:accepted&&difference===0n,thresholdToleranceMinorUnits:0};
}
const proposalPrice=(p,f)=>boundedSsp(p)?(f.sspResolution.localProposal?{amount:f.sspResolution.localProposal.amount,currency:f.sspResolution.localProposal.currency}:null):f.ssp;
function probePriceIssues(p,f){
 const original=f.fiscal.priceQualification.issues;
 if(!boundedSsp(p))return original;
 const qualified=f.sspResolution.status==='LIMITED_ONE_CENT_DISCREPANCY';
 // Keep the historical qualification in facts.fiscal; supersede ONLY this
 // exact source-conflict issue in the explicitly opted-in probe decision.
 return [...original.filter(x=>!(qualified&&x==='SSP_SOURCES_CONFLICT')),...f.sspResolution.reasons];
}
function thresholdsUnchanged(p,a,b){
 if(!boundedSsp(p))return same(a.ssp,b.ssp);
 // A stable maximum is not permission to conceal a changed lower SSP/source.
 const thresholds=f=>f.sspResolution.sources.map(x=>({field:x.field,scope:x.scope,presence:x.presence,parsed:x.parsed}));
 return same(thresholds(a),thresholds(b));
}
function probeFiscalSummary(p,f){
 const fiscal=f.fiscal,limited=boundedSsp(p)&&f.sspResolution.status==='LIMITED_ONE_CENT_DISCREPANCY';
 const issues=fiscal.issues.filter(x=>!(limited&&x==='SSP_SOURCES_CONFLICT'));
 // Same documented NULL_ALL_INCLUDED rule; no proposal is added/substituted
 // into cost. Only the actual observed retail can be this conditional total.
 const completeCost=fiscal.representation!=='NULL_ALL_INCLUDED'?null:
  limited?(issues.length?null:fiscal.baseAmount):fiscal.completeTotal;
 return {completeCost,remainingFiscalIssues:[...issues,...(fiscal.representation==='COMPONENT_LIST'?['COMPONENT_LIST_EXHAUSTIVENESS_NOT_ATTESTED']:[])]};
}
function priceFacts(p,r,d){
 const fiscal=inspectDocumentaryFiscal(d,p.comparisonPlan.scenario.currency),fields=fiscal.priceQualification.fields;
 const retail=fields.find(f=>f.field==='retailRate.total')?.parsed??null;
 const minima=fields.filter(f=>f.scope.endsWith('PUBLIC_MINIMUM')&&f.presence==='PRESENT');
 const good=minima.length&&minima.every(f=>f.parsed&&same(f.parsed,minima[0].parsed));
 // The old timing helper walks object containers, not Rates' data array.
 // Supply only the selected property/offer, retaining outer explicit limits;
 // an unrelated offer's expiry must neither disappear nor bind this one.
 const timingView={...readDocumentaryResponse(r),data:{...d.hotel,roomTypes:[d.offer]}};
 return {retail,ssp:good?minima[0].parsed:null,commission:fields.find(f=>f.field==='rate.commission')?.parsed??null,
  fields,fiscal,...(boundedSsp(p)?{sspResolution:resolveProbeSsp(p,d,fields)}:{}),
  timing:documentaryTiming(timingView,r,r.completedAt),timingScope:'RESPONSE_AND_SELECTED_PROPERTY_OFFER_RATE_ONLY',source:source(r,d.binding?.pointer??'response')};
}
const timeIssues=f=>['EXPLICITLY_EXPIRED','PROVIDER_EXPIRY_UNINTERPRETABLE','PROVIDER_EXPIRY_CONFLICT'].includes(f.timing.status)?[f.timing.status]:[];
const result=(p,status,reasons,extra={})=>({version:boundedSsp(p)?p.version:SSP_PROBE_VERSION,status,reasons,...extra,engineInvocations:0,providerBehaviorProven:false,checkoutCertified:false});

/** A finite experiment candidate, never a provider-returned net or quote.
 * Selection precedes price interpretation and never substitutes another offer. */
export function prepareSspRequote(p,record){
 const payload=checked(p,record,priceBand(p)&&record.intent?.kind==='SEARCH'?comparisonRequest(p.comparisonPlan,'SEARCH'):sspDiscoveryRequest(p));
 if(!Array.isArray(payload.data))return result(p,'STOP',['DISCOVERY_SCHEMA']);
 const hotels=payload.data.filter(h=>h?.hotelId===p.hotelId);
 if(hotels.length!==1||!Array.isArray(hotels[0].roomTypes))return result(p,'STOP',['PROPERTY_MISSING_OR_AMBIGUOUS']);
 const offers=hotels[0].roomTypes;
 if(!offers.length)return result(p,'STOP',['NO_OFFERS']);
 if(offers.some(o=>!id(o?.offerId))||new Set(offers.map(o=>o.offerId)).size!==offers.length)return result(p,'STOP',['OFFER_IDENTITY_AMBIGUOUS']);
 const seed=p.comparisonPlan.selection.seed;
 const selected=[...offers].sort((a,b)=>hash([seed,p.hotelId,a.offerId]).localeCompare(hash([seed,p.hotelId,b.offerId])))[0];
 const target={hotelId:p.hotelId,offerId:selected.offerId};
 const d=decoded(p,record,target);
 if(d.issue||d.issues.length)return result(p,'STOP',[d.issue??'OBSERVATION_SCOPE',...d.issues],{target});
 if(!d.binding.mappedRoomId)return result(p,'STOP',['MAPPED_ROOM_REQUIRED_FOR_REQUOTE_COMPARISON'],{target});
 const facts=priceFacts(p,record,d),currency=p.comparisonPlan.scenario.currency;
 const band=priceBand(p)?qualifyStayPriceBand(proposalPrice(p,facts),facts.retail):null;
 const r=money(facts.retail,currency),s=money(band?.calculationObjective??proposalPrice(p,facts),currency),c=money(facts.commission,currency);
 const problems=[...probePriceIssues(p,facts).filter(x=>x!=='OBSERVED_PUBLIC_PRICE_BELOW_SSP'),...timeIssues(facts)];
 if(facts.fiscal.issues.includes('OFFER_RATE_RETAIL_CONFLICT'))problems.push('OFFER_RATE_RETAIL_CONFLICT');
 if(!r||!s||!c||problems.length)return result(p,'STOP',['RETAIL_SSP_COMMISSION_SCOPE_OR_CURRENCY_UNSUPPORTED',...problems],{target,facts});
 const base=r.cents-c.cents;
 if(base<=0n||s.cents<base)return result(p,'STOP',['DERIVED_BASE_OR_MARGIN_UNSUPPORTED'],{target,facts});
 const numerator=(s.cents-base)*100n,denominator=base,scale=10n**BigInt(p.marginDecimals);
 const rounded=(numerator*scale*2n+denominator)/(denominator*2n);
 const margin=Number(rounded)/Number(scale);
 if(!Number.isSafeInteger(Number(rounded))||!Number.isFinite(margin))return result(p,'STOP',['MARGIN_NUMERIC_RANGE'],{target,facts});
 const request=sspDiscoveryRequest(p);request.kind='REQUOTE';request.body.margin=margin;
 const predictionNumerator=base*(100n*scale+rounded),predictionDenominator=100n*scale;
 return result(p,'CANDIDATE_REQUOTE_NOT_VERIFIED',[],{planSha256:hash(p),discoverySha256:record.response.body.sha256,
  target,mappedRoomId:d.binding.mappedRoomId,facts,request,...(boundedSsp(p)?{version:p.version,localTarget:band?.calculationObjective??proposalPrice(p,facts),...(band?{priceBand:band}:{} )}:{}),
  calculation:{basis:'DERIVED_RETAIL_MINUS_EXPLICIT_COMMISSION_NOT_PROVIDER_NET',baseMinorUnits:base.toString(),
   currency,retailSource:facts.fields.find(f=>f.field==='retailRate.total'),commissionSource:facts.fields.find(f=>f.field==='rate.commission'),
   assumptions:['Commission and retail cover the same single rate and currency','Linear markup on this derived base','Base and terms may change in the new search'],
   exactMarginPercent:{numerator:numerator.toString(),denominator:denominator.toString()},submittedMargin:margin,
   localRounding:'HALF_UP_TO_6_DECIMAL_PERCENT_NOT_PROVIDER_PRECISION',
   predictedMinorUnits:{numerator:predictionNumerator.toString(),denominator:predictionDenominator.toString()},
   predictedMinusTargetMinorUnits:{numerator:(predictionNumerator-s.cents*predictionDenominator).toString(),denominator:predictionDenominator.toString()},
   providerRounding:'UNKNOWN',guaranteedTarget:false},
  selection:{seed,poolSha256:hash(offers),offerId:selected.offerId,method:'HASH_ONLY_NO_PRICE_FALLBACK'},
 });
}
// Known non-price terms only, retaining absence vs presence. A matching pair is
// a comparison of new observations, NOT evidence of commercial token continuity.
function terms(d){
 const r=d.rate,o=d.offer,h=d.hotel;
 const pick=(x,ks)=>Object.fromEntries(ks.map(k=>[k,own(x,k)?{present:true,value:x[k]}:{present:false}]));
 return {...pick(r,['name','maxOccupancy','maxAdults','maxChildren','boardName','remarks','paymentType','paymentTypes','priceType','paymentPolicies','childrenPolicies','childPolicies','termsAndConditions','cancellationPolicies']),
  rateTaxes:pick(r.retailRate??{},['taxesAndFees']),otherRateTaxes:pick(r,['taxesAndFees']),offer:pick(o,['remarks','taxesAndFees']),
  hotel:pick(h,['hotelImportantInformation','termsAndConditions','remarks','paymentTypes','priceType','priceDifferencePercent','cancellationChanged','boardChanged'])};
}
function compareTerms(a,b){
 const x=terms(a),y=terms(b);
 // Reuse R06 only for valid, explicitly zoned cancellation instants.
 x.cancellationPolicies=a.rate.cancellationPolicies??null;y.cancellationPolicies=b.rate.cancellationPolicies??null;
 const compared=compareLiteApiCommercialTerms(x,y);
 return {...compared,equal:compared.equal&&compared.temporalComparisons.every(t=>t.status==='SAME_INSTANT')};
}
const compareVersionedTerms=(p,a,b)=>conditionsFirst(p)?compareSspObservedConditions(a,b,terms(a),terms(b)):compareTerms(a,b);
function matchObservedVariants(before,variants,record){
 const candidates=variants.map((x,index)=>{
  const d=x.d;
  const base={index,target:x.target,source:source(record,x.pointer),binding:d.binding??null,
   decoderError:d.issue??null,issues:d.issues??[],mappedRoomId:d.binding?.mappedRoomId??null};
  if(!id(x.target.offerId)||d.issue||d.issues.length||!d.binding?.mappedRoomId)return {...base,status:'UNRESOLVED',reasons:[d.issue??'CANDIDATE_SCOPE_OR_ROOM_UNRESOLVED',...(d.issues??[])]};
  if(d.binding.mappedRoomId!==before.binding.mappedRoomId)return {...base,status:'DIFFERENT_ROOM',reasons:['MAPPED_ROOM_DIFFERS']};
  const comparison=compareSspObservedConditions(before,d,terms(before),terms(d));
  return {...base,status:comparison.status,comparison,reasons:[...(comparison.establishedDifferences.length?['OBSERVED_CONDITIONS_DIFFER']:[]),...(comparison.unresolved.length?['CONDITIONS_UNINTERPRETABLE']:[])]};
 });
 const equivalent=candidates.filter(c=>c.status==='EQUIVALENT_OBSERVED_CONDITIONS'),unresolved=candidates.filter(c=>c.status==='UNRESOLVED');
 const selected=equivalent.length===1&&!unresolved.length?variants[equivalent[0].index]:null;
 return {selected,trace:{version:'stayopti.ssp-variant-matching@1',candidates,equivalentCount:equivalent.length,unresolvedCount:unresolved.length,
  selectionBasis:'UNIQUE_OBSERVED_CONDITIONS_NOT_PRICE_TARGET_OR_ORDER',historicalOfferContinuityCertified:false}};
}
export function assessSspRequote(p,discovery,requote){
 const prepared=prepareSspRequote(p,discovery);if(prepared.status!=='CANDIDATE_REQUOTE_NOT_VERIFIED')return prepared;
 const payload=checked(p,requote,prepared.request),before=decoded(p,discovery,prepared.target);
 if(!Array.isArray(payload.data))return result(p,'STOP',['REQUOTE_SCHEMA'],{prepared});
 const hotels=payload.data.filter(h=>h?.hotelId===p.hotelId);
 if(hotels.length!==1||!Array.isArray(hotels[0].roomTypes))return result(p,'STOP',['REQUOTE_PROPERTY_MISSING_OR_AMBIGUOUS'],{prepared});
 const variants=hotels[0].roomTypes.map((o,i)=>{
  const offerId=conditionsFirst(p)?o?.offerId:o.offerId;
  return {target:{hotelId:p.hotelId,offerId},d:decoded(p,requote,{hotelId:p.hotelId,offerId}),pointer:`data[${payload.data.indexOf(hotels[0])}].roomTypes[${i}]`};
 });
 const resolved=conditionsFirst(p)?matchObservedVariants(before,variants,requote):null;
 if(resolved&&!resolved.selected)return result(p,'STOP',[resolved.trace.unresolvedCount?'NEW_OBSERVATION_CONDITIONS_UNRESOLVED':'NEW_OBSERVATION_MATCH_MISSING_OR_AMBIGUOUS'],{prepared,variantMatching:resolved.trace});
 const matching=variants.filter(x=>!x.d.issue&&!x.d.issues.length&&x.d.binding.mappedRoomId===prepared.mappedRoomId);
 if(!resolved&&matching.length!==1)return result(p,'STOP',['NEW_OBSERVATION_MATCH_MISSING_OR_AMBIGUOUS'],{prepared,variantIssues:variants.map(x=>({target:x.target,issues:x.d.issues}))});
 const {target,d}=resolved?.selected??matching[0],comparison=compareVersionedTerms(p,before,d),facts=priceFacts(p,requote,d),reasons=[];
 if(!comparison.equal)reasons.push('NEW_OBSERVATION_CONDITIONS_CHANGED_OR_UNINTERPRETABLE');
 if(!thresholdsUnchanged(p,facts,prepared.facts))reasons.push('NEW_SSP_CHANGED_OR_MISSING');
 const targetPrice=priceBand(p)?prepared.localTarget:boundedSsp(p)?proposalPrice(p,prepared.facts):facts.ssp;
 const band=priceBand(p)?qualifyStayPriceBand(proposalPrice(p,facts),facts.retail):null;
 if(band){if(band.status!=='WITHIN_COMMERCIAL_BAND')reasons.push('RETURNED_PRICE_'+band.status);}
 else if(!facts.retail||!proposalPrice(p,facts)||!same(facts.retail,targetPrice))reasons.push(boundedSsp(p)?'RETURNED_PRICE_NOT_EXACT_LOCAL_TARGET':'RETURNED_PRICE_NOT_EXACT_SSP');
 reasons.push(...probePriceIssues(p,facts),...timeIssues(facts));
 if(facts.fiscal.issues.includes('OFFER_RATE_RETAIL_CONFLICT'))reasons.push('OFFER_RATE_RETAIL_CONFLICT');
 const prebook=comparisonRequest(p.comparisonPlan,'PREBOOK',target);
 return result(p,reasons.length?'STOP':band?'PRICE_IN_BAND_NOT_PREBOOK_VERIFIED':boundedSsp(p)?'EXACT_LOCAL_TARGET_RETURNED_NOT_PREBOOK_VERIFIED':'EXACT_SSP_RETURNED_NOT_PREBOOK_VERIFIED',[...new Set(reasons)],
  {prepared,target,newObservationSha256:requote.response.body.sha256,facts,comparison,...(resolved?{variantMatching:resolved.trace}:{}),prebookRequest:reasons.length?null:prebook,
   historicalOfferContinuityCertified:false,oldOfferId:prepared.target.offerId,newOfferId:target.offerId,
   ...(boundedSsp(p)?{version:p.version,localTarget:targetPrice,returnedPriceMatchesLocalTarget:same(facts.retail,targetPrice),...(band?{priceBand:band,acceptedObservedPrice:facts.retail}: {})}: {})});
}
export function assessSspPrebook(p,discovery,requote,prebook){
 const r=assessSspRequote(p,discovery,requote);if(!r.prebookRequest)return r;
 return compareSspPrebook(p,r,requote,prebook);
}
function compareSspPrebook(p,r,observation,prebook){
 checked(p,prebook,r.prebookRequest);
 const d=decoded(p,prebook,r.target,'PREBOOK'),s=decoded(p,observation,r.target);
 if(d.issue||d.issues.length)return result(p,'STOP',[d.issue??'PREBOOK_SCOPE',...d.issues],{requote:r});
 const facts=priceFacts(p,prebook,d),reasons=[],comparison=compareVersionedTerms(p,s,d);
 // PREBOOK may newly report its own SSP; compare the rate/offer facts exactly
 // and qualify any new session-level SSP separately against the fixed target.
 const previous=boundedSsp(p)?{...r.facts,sspResolution:{...r.facts.sspResolution,sources:r.facts.sspResolution.sources.filter(x=>x.field!=='prebook.suggestedSellingPrice')}}:r.facts;
 const current=boundedSsp(p)?{...facts,sspResolution:{...facts.sspResolution,sources:facts.sspResolution.sources.filter(x=>x.field!=='prebook.suggestedSellingPrice')}}:facts;
 if(!same(facts.retail,r.facts.retail)||!thresholdsUnchanged(p,current,previous))reasons.push('PREBOOK_PRICE_OR_SSP_CHANGED');
 const band=priceBand(p)?qualifyStayPriceBand(proposalPrice(p,facts),facts.retail):null;
 if(band){if(band.status!=='WITHIN_COMMERCIAL_BAND')reasons.push('PREBOOK_PRICE_'+band.status);}
 else if(boundedSsp(p)&&(!same(facts.retail,r.localTarget)||!same(proposalPrice(p,facts),r.localTarget)))reasons.push('PREBOOK_PRICE_NOT_EXACT_LOCAL_TARGET');
 if(d.rate.rateId!==s.rate.rateId)reasons.push('PREBOOK_RATE_ID_CONTINUITY_UNRESOLVED');
 if(d.binding.mappedRoomId!==null&&d.binding.mappedRoomId!==s.binding.mappedRoomId)reasons.push('PREBOOK_ROOM_CONFLICT');
 if(!comparison.equal)reasons.push('PREBOOK_CONDITIONS_CHANGED_OR_UNINTERPRETABLE');
 reasons.push(...probePriceIssues(p,facts),...timeIssues(facts));
 if(facts.fiscal.issues.includes('PREBOOK_PRICE_COMPONENT_CONFLICT_OR_UNSUPPORTED_ADJUSTMENT'))reasons.push('PREBOOK_PAYABLE_PRICE_CONFLICT');
 return result(p,reasons.length?'STOP':band?'PRICE_IN_BAND_AND_UNCHANGED_PREBOOK':boundedSsp(p)?'EXACT_LOCAL_TARGET_AND_PREBOOK_PRICE_MATCHED':'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED',[...new Set(reasons)],
  {requote:r,facts,comparison,...probeFiscalSummary(p,facts),
   fullA02Admission:false,accommodationVerified:false,providerExpiryInvented:false,
   ...(boundedSsp(p)?{version:p.version,localTarget:r.localTarget,returnedPriceMatchesLocalTarget:same(facts.retail,r.localTarget),...(band?{priceBand:band,acceptedObservedPrice:facts.retail}: {})}: {})});
}

// @1.4 only: an already conforming observed price needs no repricing. The same
// price must survive prebook; +5 is NEVER a Rates/prebook change allowance.
export function assessSspDirectObservation(p,record){
 if(!priceBand(p))fail('BAND_VERSION_REQUIRED');
 const payload=checked(p,record,record.intent?.kind==='SEARCH'?comparisonRequest(p.comparisonPlan,'SEARCH'):sspDiscoveryRequest(p));
 const hs=payload.data?.filter(h=>h.hotelId===p.hotelId);
 if(hs?.length!==1||!Array.isArray(hs[0].roomTypes)||!hs[0].roomTypes.length)return result(p,'STOP',['PROPERTY_MISSING_OR_AMBIGUOUS']);
 const offers=hs[0].roomTypes;if(offers.some(o=>!id(o?.offerId))||new Set(offers.map(o=>o.offerId)).size!==offers.length)return result(p,'STOP',['OFFER_IDENTITY_AMBIGUOUS']);
 const o=[...offers].sort((a,b)=>hash([p.comparisonPlan.selection.seed,p.hotelId,a.offerId]).localeCompare(hash([p.comparisonPlan.selection.seed,p.hotelId,b.offerId])))[0],target={hotelId:p.hotelId,offerId:o.offerId};
 const d=decoded(p,record,target);if(d.issue||d.issues.length)return result(p,'STOP',[d.issue??'OBSERVATION_SCOPE',...d.issues],{target});
 const facts=priceFacts(p,record,d),band=qualifyStayPriceBand(proposalPrice(p,facts),facts.retail);
 const reasons=[...probePriceIssues(p,facts),...timeIssues(facts),...(facts.fiscal.issues.includes('OFFER_RATE_RETAIL_CONFLICT')?['OFFER_RATE_RETAIL_CONFLICT']:[])];
 if(!d.binding.mappedRoomId)reasons.push('MAPPED_ROOM_REQUIRED');
 // Unknown terms cannot be upgraded merely because there is only one tariff.
 const comparison=compareVersionedTerms(p,d,d);if(!comparison.equal)reasons.push('OBSERVED_CONDITIONS_UNRESOLVED');
 if(band.status!=='WITHIN_COMMERCIAL_BAND')reasons.push('RETURNED_PRICE_'+band.status);
 return result(p,reasons.length?'STOP':'PRICE_IN_BAND_NOT_PREBOOK_VERIFIED',[...new Set(reasons)],{target,facts,priceBand:band,localTarget:band.calculationObjective,comparison,
  prebookRequest:reasons.length?null:comparisonRequest(p.comparisonPlan,'PREBOOK',target),acceptedObservedPrice:reasons.length?null:facts.retail});
}
export function assessSspDirectPrebook(p,observation,prebook){const a=assessSspDirectObservation(p,observation);return a.prebookRequest?compareSspPrebook(p,a,observation,prebook):a;}
export function inspectedBandPriceFacts(p,record,target,stage='SEARCH'){
 if(!priceBand(p))fail('BAND_VERSION_REQUIRED');return priceFacts(p,record,decoded(p,record,target,stage));
}
