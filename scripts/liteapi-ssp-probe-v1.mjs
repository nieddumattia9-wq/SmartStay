// D-0077. Offline price experiment, NOT an A02 preparation or LIVE capability.
// margin is documented; exact repricing/base stability/rounding are not promised.
import {comparisonRequest,validateComparisonPlan,hash,same} from './liteapi-comparison-plan-v1.mjs';
import {readDocumentaryResponse,decodeDocumentaryOffer,inspectDocumentaryFiscal,documentaryTiming} from './liteapi-documentary-wire-v1.mjs';
import {compareLiteApiCommercialTerms} from './liteapi-cancellation-comparison-v1.mjs';
import {parseExplicitInstant} from '../server/shared/explicit-instant.mjs';

export const SSP_PROBE_VERSION='stayopti.liteapi-ssp-probe@1';
export const SSP_PROBE_OPERATIONAL_VERSION='stayopti.liteapi-ssp-probe@1.1';
export const SSP_PROBE_CAPS=Object.freeze({DISCOVERY:1,REQUOTE:1,PREBOOK:1,total:3,concurrency:1,retries:0,redirects:0});
const fail=c=>{throw Error('SSP_PROBE_'+c);};
const own=(o,k)=>o!=null&&Object.hasOwn(o,k);
const id=x=>typeof x==='string'&&x.length>0&&!/[\x00-\x1f\x7f]/.test(x);
export function validateSspProbePlan(p){
 const operational=p?.version===SSP_PROBE_OPERATIONAL_VERSION;
 if(!p||!same(Object.keys(p).sort(),['version','origin','caseId','comparisonPlan','hotelId','marginDecimals','caps',...(operational?['hotelSource','purpose']:[])].sort())||
  ![SSP_PROBE_VERSION,SSP_PROBE_OPERATIONAL_VERSION].includes(p.version)||
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
 return {status:operational?(conditions.pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_SSP_PROBE_AUTHORIZATION'):'OFFLINE_EXPERIMENT_ONLY',
  pending:conditions.pending,a02Production:'HOLD',production:operational?'PROBE_AUTHORIZATION_REQUIRED':'HOLD',engineInvocations:0};
}
export function sspDiscoveryRequest(p){
 validateSspProbePlan(p);
 const q=comparisonRequest(p.comparisonPlan,'SEARCH');
 delete q.body.cityName;delete q.body.countryCode;
 return {...q,kind:'DISCOVERY',body:{...q.body,hotelIds:[p.hotelId],limit:1}};
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
  fields,fiscal,timing:documentaryTiming(timingView,r,r.completedAt),timingScope:'RESPONSE_AND_SELECTED_PROPERTY_OFFER_RATE_ONLY',source:source(r,d.binding?.pointer??'response')};
}
const timeIssues=f=>['EXPLICITLY_EXPIRED','PROVIDER_EXPIRY_UNINTERPRETABLE','PROVIDER_EXPIRY_CONFLICT'].includes(f.timing.status)?[f.timing.status]:[];
const result=(status,reasons,extra={})=>({version:SSP_PROBE_VERSION,status,reasons,...extra,engineInvocations:0,providerBehaviorProven:false,checkoutCertified:false});

/** A finite experiment candidate, never a provider-returned net or quote.
 * Selection precedes price interpretation and never substitutes another offer. */
export function prepareSspRequote(p,record){
 const payload=checked(p,record,sspDiscoveryRequest(p));
 if(!Array.isArray(payload.data))return result('STOP',['DISCOVERY_SCHEMA']);
 const hotels=payload.data.filter(h=>h?.hotelId===p.hotelId);
 if(hotels.length!==1||!Array.isArray(hotels[0].roomTypes))return result('STOP',['PROPERTY_MISSING_OR_AMBIGUOUS']);
 const offers=hotels[0].roomTypes;
 if(!offers.length)return result('STOP',['NO_OFFERS']);
 if(offers.some(o=>!id(o?.offerId))||new Set(offers.map(o=>o.offerId)).size!==offers.length)return result('STOP',['OFFER_IDENTITY_AMBIGUOUS']);
 const seed=p.comparisonPlan.selection.seed;
 const selected=[...offers].sort((a,b)=>hash([seed,p.hotelId,a.offerId]).localeCompare(hash([seed,p.hotelId,b.offerId])))[0];
 const target={hotelId:p.hotelId,offerId:selected.offerId};
 const d=decoded(p,record,target);
 if(d.issue||d.issues.length)return result('STOP',[d.issue??'OBSERVATION_SCOPE',...d.issues],{target});
 if(!d.binding.mappedRoomId)return result('STOP',['MAPPED_ROOM_REQUIRED_FOR_REQUOTE_COMPARISON'],{target});
 const facts=priceFacts(p,record,d),currency=p.comparisonPlan.scenario.currency;
 const r=money(facts.retail,currency),s=money(facts.ssp,currency),c=money(facts.commission,currency);
 const problems=[...facts.fiscal.priceQualification.issues.filter(x=>x!=='OBSERVED_PUBLIC_PRICE_BELOW_SSP'),...timeIssues(facts)];
 if(facts.fiscal.issues.includes('OFFER_RATE_RETAIL_CONFLICT'))problems.push('OFFER_RATE_RETAIL_CONFLICT');
 if(!r||!s||!c||problems.length)return result('STOP',['RETAIL_SSP_COMMISSION_SCOPE_OR_CURRENCY_UNSUPPORTED',...problems],{target,facts});
 const base=r.cents-c.cents;
 if(base<=0n||s.cents<base)return result('STOP',['DERIVED_BASE_OR_MARGIN_UNSUPPORTED'],{target,facts});
 const numerator=(s.cents-base)*100n,denominator=base,scale=10n**BigInt(p.marginDecimals);
 const rounded=(numerator*scale*2n+denominator)/(denominator*2n);
 const margin=Number(rounded)/Number(scale);
 if(!Number.isSafeInteger(Number(rounded))||!Number.isFinite(margin))return result('STOP',['MARGIN_NUMERIC_RANGE'],{target,facts});
 const request=sspDiscoveryRequest(p);request.kind='REQUOTE';request.body.margin=margin;
 const predictionNumerator=base*(100n*scale+rounded),predictionDenominator=100n*scale;
 return result('CANDIDATE_REQUOTE_NOT_VERIFIED',[],{planSha256:hash(p),discoverySha256:record.response.body.sha256,
  target,mappedRoomId:d.binding.mappedRoomId,facts,request,
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
export function assessSspRequote(p,discovery,requote){
 const prepared=prepareSspRequote(p,discovery);if(prepared.status!=='CANDIDATE_REQUOTE_NOT_VERIFIED')return prepared;
 const payload=checked(p,requote,prepared.request),before=decoded(p,discovery,prepared.target);
 if(!Array.isArray(payload.data))return result('STOP',['REQUOTE_SCHEMA'],{prepared});
 const hotels=payload.data.filter(h=>h?.hotelId===p.hotelId);
 if(hotels.length!==1||!Array.isArray(hotels[0].roomTypes))return result('STOP',['REQUOTE_PROPERTY_MISSING_OR_AMBIGUOUS'],{prepared});
 const variants=hotels[0].roomTypes.map(o=>({target:{hotelId:p.hotelId,offerId:o.offerId},d:decoded(p,requote,{hotelId:p.hotelId,offerId:o.offerId})}));
 const matching=variants.filter(x=>!x.d.issue&&!x.d.issues.length&&x.d.binding.mappedRoomId===prepared.mappedRoomId);
 if(matching.length!==1)return result('STOP',['NEW_OBSERVATION_MATCH_MISSING_OR_AMBIGUOUS'],{prepared,variantIssues:variants.map(x=>({target:x.target,issues:x.d.issues}))});
 const {target,d}=matching[0],comparison=compareTerms(before,d),facts=priceFacts(p,requote,d),reasons=[];
 if(!comparison.equal)reasons.push('NEW_OBSERVATION_CONDITIONS_CHANGED_OR_UNINTERPRETABLE');
 if(!same(facts.ssp,prepared.facts.ssp))reasons.push('NEW_SSP_CHANGED_OR_MISSING');
 if(!facts.retail||!facts.ssp||!same(facts.retail,facts.ssp))reasons.push('RETURNED_PRICE_NOT_EXACT_SSP');
 reasons.push(...facts.fiscal.priceQualification.issues,...timeIssues(facts));
 if(facts.fiscal.issues.includes('OFFER_RATE_RETAIL_CONFLICT'))reasons.push('OFFER_RATE_RETAIL_CONFLICT');
 const prebook=comparisonRequest(p.comparisonPlan,'PREBOOK',target);
 return result(reasons.length?'STOP':'EXACT_SSP_RETURNED_NOT_PREBOOK_VERIFIED',[...new Set(reasons)],
  {prepared,target,newObservationSha256:requote.response.body.sha256,facts,comparison,prebookRequest:reasons.length?null:prebook,
   historicalOfferContinuityCertified:false,oldOfferId:prepared.target.offerId,newOfferId:target.offerId});
}
export function assessSspPrebook(p,discovery,requote,prebook){
 const r=assessSspRequote(p,discovery,requote);if(!r.prebookRequest)return r;
 checked(p,prebook,r.prebookRequest);
 const d=decoded(p,prebook,r.target,'PREBOOK'),s=decoded(p,requote,r.target);
 if(d.issue||d.issues.length)return result('STOP',[d.issue??'PREBOOK_SCOPE',...d.issues],{requote:r});
 const facts=priceFacts(p,prebook,d),reasons=[],comparison=compareTerms(s,d);
 if(!same(facts.retail,r.facts.retail)||!same(facts.ssp,r.facts.ssp))reasons.push('PREBOOK_PRICE_OR_SSP_CHANGED');
 if(d.rate.rateId!==s.rate.rateId)reasons.push('PREBOOK_RATE_ID_CONTINUITY_UNRESOLVED');
 if(d.binding.mappedRoomId!==null&&d.binding.mappedRoomId!==s.binding.mappedRoomId)reasons.push('PREBOOK_ROOM_CONFLICT');
 if(!comparison.equal)reasons.push('PREBOOK_CONDITIONS_CHANGED_OR_UNINTERPRETABLE');
 reasons.push(...facts.fiscal.priceQualification.issues,...timeIssues(facts));
 if(facts.fiscal.issues.includes('PREBOOK_PRICE_COMPONENT_CONFLICT_OR_UNSUPPORTED_ADJUSTMENT'))reasons.push('PREBOOK_PAYABLE_PRICE_CONFLICT');
 return result(reasons.length?'STOP':'EXACT_SSP_OBSERVED_AND_PREBOOK_PRICE_MATCHED',[...new Set(reasons)],
  {requote:r,facts,comparison,completeCost:facts.fiscal.representation==='NULL_ALL_INCLUDED'?facts.fiscal.completeTotal:null,
   remainingFiscalIssues:[...facts.fiscal.issues,...(facts.fiscal.representation==='COMPONENT_LIST'?['COMPONENT_LIST_EXHAUSTIVENESS_NOT_ATTESTED']:[])],
   fullA02Admission:false,accommodationVerified:false,providerExpiryInvented:false});
}
