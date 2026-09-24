import type {HistoricalOfferFactsV3, HistoricalSourceV3} from './historicalCommercialEvidenceV3';
import {qualifyHistoricalCommercialFactsV3} from './historicalCommercialEvidenceV3';
import {stableSerializeV3} from './stableHashV3';
import {interpretChildAges} from '../../utils/searchParty';
import type {CommercialComponentV3} from './commercialEvidenceV3';

/** Provider-neutral semantics. Extraction of public minima stays in adapters.
 * A local proposal is a choice, never an authenticated commercial observation. */
export const PUBLIC_PRICE_POLICY_V3 = 'stayopti.public-price-policy@1' as const;
export const PUBLIC_PRICE_PERSPECTIVE_V3 = 'stayopti.public-price-perspective@1' as const;
export interface PriceMoneyV3 { amount:number; currency:string }
export interface PublicPriceScopeV3 {
 propertyId:string; offerId:string; roomId:string|null; checkIn:string; checkOut:string;
 adults:number; children:number; childAges:number[]|null; units:number; currency:string;
}
export interface PublicPriceVerificationV3 {
 version:'stayopti.public-price-verification@1'; scope:PublicPriceScopeV3; money:PriceMoneyV3|null;
 source:HistoricalSourceV3; coverage:'DOCUMENTED_EXHAUSTIVE_COMPONENTS'|'UNKNOWN';
 components:CommercialComponentV3[]; issues:string[];
}
export type PublicPricePolicyV3 =
 | {version:typeof PUBLIC_PRICE_POLICY_V3; mode:'DOCUMENTED_MINIMUM'; additionalMarkup:0}
 | {version:typeof PUBLIC_PRICE_POLICY_V3; mode:'EXPLICIT_PROPOSALS'; proposals:Array<{scope:PublicPriceScopeV3; money:PriceMoneyV3}>};
const equal=(a:unknown,b:unknown)=>stableSerializeV3(a)===stableSerializeV3(b);
const money=(v:PriceMoneyV3|null|undefined)=>!!v&&typeof v.amount==='number'&&Number.isFinite(v.amount)&&v.amount>=0&&/^[A-Z]{3}$/.test(v.currency);
const keys=(v:object,k:string[])=>equal(Object.keys(v).sort(),[...k].sort());
const unique=(v:string[])=>[...new Set(v)].sort();
const normalizedScope=(s:PublicPriceScopeV3)=>({...s,childAges:interpretChildAges(s.childAges,s.children).ages});
export function publicPriceScopeV3(f:HistoricalOfferFactsV3):PublicPriceScopeV3 {
 const ages=interpretChildAges(f.search.childAges,f.search.children);
 return {propertyId:f.identity.propertyId,offerId:f.identity.offerId,roomId:f.identity.roomId,
  checkIn:f.search.checkIn,checkOut:f.search.checkOut,adults:f.search.adults,children:f.search.children,
  childAges:ages.state==='KNOWN'?[...ages.ages!].sort((a,b)=>a-b):null,units:f.search.units,currency:f.search.currency};
}
export function validatePublicPricePolicyV3(p:PublicPricePolicyV3):void {
 if(!p||p.version!==PUBLIC_PRICE_POLICY_V3)throw Error('PUBLIC_PRICE_POLICY_VERSION');
 if(p.mode==='DOCUMENTED_MINIMUM'){
  if(!keys(p,['version','mode','additionalMarkup'])||p.additionalMarkup!==0)throw Error('PUBLIC_PRICE_POLICY_MARKUP');
 }else if(p.mode==='EXPLICIT_PROPOSALS'){
  if(!keys(p,['version','mode','proposals'])||!Array.isArray(p.proposals)||!p.proposals.length)throw Error('PUBLIC_PRICE_PROPOSALS_REQUIRED');
  const scopes=new Set<string>();
  for(const x of p.proposals){
   const s=x?.scope;
   if(!x||!keys(x,['scope','money'])||!money(x.money)||!keys(x.money,['amount','currency'])||!s||
    !keys(s,['propertyId','offerId','roomId','checkIn','checkOut','adults','children','childAges','units','currency'])||
    typeof s.propertyId!=='string'||!s.propertyId||typeof s.offerId!=='string'||!s.offerId||typeof s.roomId!=='string'||!s.roomId||!/^\d{4}-\d{2}-\d{2}$/.test(s.checkIn)||!/^\d{4}-\d{2}-\d{2}$/.test(s.checkOut)||
    !Number.isSafeInteger(s.adults)||s.adults<1||!Number.isSafeInteger(s.units)||s.units<1||!/^[A-Z]{3}$/.test(s.currency)||
    interpretChildAges(s.childAges,s.children).state!=='KNOWN')throw Error('PUBLIC_PRICE_PROPOSAL_INVALID');
   const id=stableSerializeV3(normalizedScope(s));
   if(scopes.has(id))throw Error('PUBLIC_PRICE_PROPOSAL_DUPLICATE_SCOPE');scopes.add(id);
  }
 }else throw Error('PUBLIC_PRICE_POLICY_MODE');
}
type Assessment=ReturnType<typeof qualifyHistoricalCommercialFactsV3>;
function threshold(f:HistoricalOfferFactsV3|null){
 if(!f)return {state:'UNKNOWN' as const,money:null as PriceMoneyV3|null,scope:null as PublicPriceScopeV3|null,source:null as HistoricalSourceV3|null,observations:[] as PriceMoneyV3[],issues:['OBSERVATION_MISSING']};
 const t=f.price.publicMinimum,scope=publicPriceScopeV3(f),source=f.price.source;
 const valid=qualifyHistoricalCommercialFactsV3(f).representability==='REPRESENTABLE';
 if(t.applicability==='NOT_APPLICABLE')return {state:valid?'NOT_APPLICABLE' as const:'UNKNOWN' as const,money:null,scope,source,observations:t.amounts,issues:valid?[]:['SOURCE_OR_SCOPE_UNVERIFIED']};
 const issues=[...t.issues];
 if(!valid)issues.push('SOURCE_OR_SCOPE_UNVERIFIED');
 if(t.applicability!=='APPLIES'||!t.amounts.length)issues.push('PUBLIC_MINIMUM_NOT_DOCUMENTED');
 if(t.amounts.some(x=>!money(x)||x.currency!==f.search.currency))issues.push('PUBLIC_MINIMUM_CURRENCY_OR_AMOUNT');
 if(t.amounts.some(x=>!equal(x,t.amounts[0])))issues.push('PUBLIC_MINIMUM_CONFLICT');
 return {state:issues.length?'UNKNOWN' as const:'KNOWN' as const,money:issues.length?null:t.amounts[0],scope,source,observations:t.amounts,issues:unique(issues)};
}
function conforms(proposed:PriceMoneyV3|null,t:ReturnType<typeof threshold>){
 if(!proposed||!money(proposed))return 'UNKNOWN' as const;
 if(t.state==='NOT_APPLICABLE')return proposed.currency===t.scope?.currency?'NOT_APPLICABLE' as const:'NOT_COMPARABLE' as const;
 if(t.state!=='KNOWN'||!t.money)return 'UNKNOWN' as const;
 if(proposed.currency!==t.money.currency)return 'NOT_COMPARABLE' as const;
 return proposed.amount<t.money.amount?'BELOW_MINIMUM' as const:'AT_OR_ABOVE_MINIMUM' as const;
}

export function qualifyPublicPricePerspectiveV3(observed:HistoricalOfferFactsV3|null,verified:HistoricalOfferFactsV3|null,policy:PublicPricePolicyV3,publicQuote?:PublicPriceVerificationV3|null){
 validatePublicPricePolicyV3(policy);
 const original=observed?qualifyHistoricalCommercialFactsV3(observed):null;
 const verification:Assessment|null=verified?qualifyHistoricalCommercialFactsV3(verified):null;
 const atObservation=threshold(observed),atVerification=threshold(verified),scope=observed?publicPriceScopeV3(observed):null;
 const specified=policy.mode==='EXPLICIT_PROPOSALS'&&scope?policy.proposals.find(p=>equal(normalizedScope(p.scope),scope)):null;
 const proposed=policy.mode==='DOCUMENTED_MINIMUM'?atObservation.money:specified?.money??null;
 const proposalCompliance=conforms(proposed,atObservation),verifiedThresholdCompliance=conforms(proposed,atVerification);
 const reasons:string[]=[];
 if(!proposed)reasons.push(policy.mode==='EXPLICIT_PROPOSALS'?'PROPOSAL_EXACT_SCOPE_MISSING':'PROPOSAL_MINIMUM_UNAVAILABLE');
 if(!['AT_OR_ABOVE_MINIMUM','NOT_APPLICABLE'].includes(proposalCompliance))reasons.push('PUBLIC_PROPOSAL_'+proposalCompliance);
 if(verified&&!['AT_OR_ABOVE_MINIMUM','NOT_APPLICABLE'].includes(verifiedThresholdCompliance))reasons.push('VERIFIED_PUBLIC_PROPOSAL_'+verifiedThresholdCompliance);
 const scopeMatches=!!verified&&!!scope&&equal(publicPriceScopeV3(verified),scope);
 // An invalid explicit quote is not absence and must never fall back to retail.
 const quote=publicQuote?publicQuote.money:verified?.price.observed??null;
 const publicScopeMatches=!publicQuote||!!scope&&equal(normalizedScope(publicQuote.scope),scope);
 const proofIssues=publicQuote?[...publicQuote.issues]:[];
 if(publicQuote&&publicQuote.version!=='stayopti.public-price-verification@1')proofIssues.push('PUBLIC_QUOTE_VERSION');
 if(publicQuote&&(!verified||publicQuote.source.scope!=='OFFER'||
  publicQuote.source.recordSha256!==verified.price.source.recordSha256||publicQuote.source.requestSha256!==verified.price.source.requestSha256||
  publicQuote.source.observedAt!==verified.price.source.observedAt))proofIssues.push('PUBLIC_QUOTE_VERIFICATION_SOURCE_CONFLICT');
 if(!publicScopeMatches)proofIssues.push('PUBLIC_QUOTE_SCOPE_CONFLICT');
 if(publicQuote&&(new Set(publicQuote.components.map(c=>c.id)).size!==publicQuote.components.length||publicQuote.components.some(c=>!c.id)))proofIssues.push('PUBLIC_QUOTE_COMPONENT_ID_AMBIGUOUS');
 if(publicQuote?.components.some(c=>c.kind==='MANDATORY'&&c.category==='UNKNOWN'))proofIssues.push('PUBLIC_QUOTE_COMPONENT_CATEGORY_UNKNOWN');
 // A separately evidenced public quote can differ from the transaction retail.
 // Reuse the historical common cost rules on a NEW price view, never mutate
 // the original facts, original assessment or transaction continuity checks.
 // The legacy cost evaluator's completeness switch is an internal compatibility
 // projection, NOT an assertion that excluded charges are included in the quote.
 // The authenticated new proof keeps EXHAUSTIVE_COMPONENTS and every inclusion.
 const publicAssessment=publicQuote&&verified&&scopeMatches&&publicScopeMatches?qualifyHistoricalCommercialFactsV3({...verified,
  price:{observed:publicQuote.money,publicMinimum:verified.price.publicMinimum,
   coverage:publicQuote.coverage==='DOCUMENTED_EXHAUSTIVE_COMPONENTS'?'DOCUMENTED_ALL_INCLUDED':'UNKNOWN',source:publicQuote.source,
   components:publicQuote.components.map(c=>({amount:c.amount,currency:c.currency,inclusion:c.inclusion,kind:c.kind,basis:c.basis==='TOTAL_STAY_ALL_GUESTS'?'TOTAL_STAY':'UNKNOWN'})),issues:proofIssues}}):null;
 if(publicAssessment?.representationIssues.length)proofIssues.push(...publicAssessment.representationIssues);
 // Exact amount AND scope: commercial verification of a transaction quote can
 // support an identical proposed amount, but cannot certify a different price.
 // No addition of commission, minimum, markup, included tax or deposit here.
 const quoteMatches=scopeMatches&&publicScopeMatches&&!proofIssues.length&&money(quote)&&money(proposed)&&equal(quote,proposed);
 if(!verified)reasons.push('PUBLIC_PROPOSAL_VERIFICATION_MISSING');
 else if(!scopeMatches)reasons.push('PUBLIC_PROPOSAL_VERIFICATION_SCOPE_CONFLICT');
 else if(!quoteMatches)reasons.push('PUBLIC_PROPOSAL_AMOUNT_NOT_VERIFIED');
 reasons.push(...proofIssues);
 const quoteAssessment=publicQuote?publicAssessment:verification;
 const complete=!!quoteMatches&&quoteAssessment?.cost.status==='SUPPORTED';
 if(!complete)reasons.push('PUBLIC_PROPOSAL_COMPLETE_COST_UNPROVEN');
 const completeCost={status:complete?'SUPPORTED' as const:'UNKNOWN' as const,completeTotal:complete?quoteAssessment!.cost.completeTotal:null,currency:observed?.search.currency??null};
 return {version:PUBLIC_PRICE_PERSPECTIVE_V3,
  originalRetail:{money:observed?.price.observed??null,source:observed?.price.source??null,historicalPublicMinimumQualification:original?.publicPrice??'UNKNOWN'},
  documentedMinimum:{atObservation,atVerification},
  proposal:{money:proposed,scope,origin:'LOCAL_ANALYTICAL_CHOICE' as const,policy,providerObservation:false},
  proposalCompliance,verifiedThresholdCompliance,
  verifiedPrice:verified?{money:quote,scope:publicQuote?.scope??publicPriceScopeV3(verified),source:publicQuote?.source??verified.price.source,
   kind:publicQuote?'AUTHENTICATED_PUBLIC_QUOTE' as const:'AUTHENTICATED_TRANSACTION_QUOTE' as const,
   originalTransactionQuote:{money:verified.price.observed,source:verified.price.source,completeCost:verification!.cost},
   quoteCompleteCost:quoteAssessment?.cost??null,components:publicQuote?.components??verified.price.components,proposalAmountMatched:quoteMatches}:null,
  proposalVerification:quoteMatches?'SAME_AMOUNT_AND_SCOPE_AS_VERIFIED_QUOTE' as const:'NOT_VERIFIED' as const,
  completeCost,reasons:unique(reasons),status:reasons.length?'INCOMPLETE_OR_CONFLICTING' as const:'SUPPORTED_AT_OBSERVATION' as const,
  checkoutPriceCertified:false,currentBookabilityGuaranteed:false,commissionChanged:false,automaticMarkupApplied:false,
  additionalLocalMarkupAdded:0,retailPlusMinimumSummed:false,completeCostRule:'VERIFIED_QUOTE_PLUS_MANDATORY_EXCLUDED_ONCE' as const};
}
