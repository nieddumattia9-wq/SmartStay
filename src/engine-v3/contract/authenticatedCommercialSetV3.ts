import {qualifyHistoricalCommercialFactsV3,type HistoricalOfferFactsV3,type HistoricalSourceV3} from './historicalCommercialEvidenceV3';
import {COMMERCIAL_EVIDENCE_DELTA_V3,type CommercialTermsV3} from './commercialEvidenceV3';
import {createStableHashV3,stableSerializeV3} from './stableHashV3';
import {orderExplicitInstants} from '../../../server/shared/explicit-instant';
import {qualifyPublicPricePerspectiveV3,validatePublicPricePolicyV3,type PublicPricePolicyV3,type PublicPriceVerificationV3} from './publicPricePerspectiveV3';

/** Additive @2: local observation identity never becomes a provider revision.
 * This is a pure qualifier, not an authentication or decision factory. */
export const AUTHENTICATED_COMMERCIAL_SET_V3='stayopti.authenticated-commercial-set@2' as const;
export interface ComparisonOfferFactsV3 {
 publicPriceVerification?:PublicPriceVerificationV3|null;
 key:string;decisionOfferId:string;decisionIdMeaning:'LOCAL_ROUTING_ALIAS_NOT_PROVIDER_REVISION';selected:boolean;observed:HistoricalOfferFactsV3|null;verified:HistoricalOfferFactsV3|null;issues:string[];
 continuity:{kind:'EXACT_OBSERVATION_REQUEST_RESPONSE';providerVersion:{state:'UNKNOWN'};observationSha256:string;
  verificationRequest:unknown;verificationSource:HistoricalSourceV3|null;sessionId:string|null;retrievalCount:number};
 merit:{name:string;stars:number|null;features:string[];reviewScore:null;reviewCount:null;ratingReason:string};originalSources:HistoricalSourceV3[];
}
export interface AuthenticatedComparisonFactsV3 {
 version:'stayopti.authenticated-commercial-facts@2'|'stayopti.authenticated-commercial-facts@2.1';origin:'AUTHENTICATED_PROVIDER'|'AUTHENTICATED_SYNTHETIC';
 scenario:{city:string;country:string;checkin:string;checkout:string;currency:string;adults:number;childAges:number[];units:number;budget:number;preference:'balanced-manual';distance:'NOT_REQUESTED'};
 offers:ComparisonOfferFactsV3[];sourceSetFingerprint:string;journalFingerprint:string;selection:unknown;observationWindow:unknown;
}
export function commercialFactsTermsV3(f:HistoricalOfferFactsV3):CommercialTermsV3 {
 // Fixed adapter output, authenticated before this function is reachable.
 return (f.trace as {terms:CommercialTermsV3}).terms;
}
const eq=(a:unknown,b:unknown)=>stableSerializeV3(a)===stableSerializeV3(b);
const unique=(a:string[])=>[...new Set(a)].sort();
function qualifyAuthenticatedCommercialOfferLegacyV3(f:ComparisonOfferFactsV3){
 const reasons=[...f.issues];
 const observed=f.observed?qualifyHistoricalCommercialFactsV3(f.observed):null,verified=f.verified?qualifyHistoricalCommercialFactsV3(f.verified):null;
 if(!f.selected)reasons.push('NOT_SELECTED_FOR_VERIFICATION_ALL_VARIANTS_RETAINED');
 if(!observed)reasons.push('OBSERVATION_UNREPRESENTABLE');
 if(!verified||!f.continuity.verificationSource||!f.continuity.verificationRequest)reasons.push('COMMERCIAL_VERIFICATION_MISSING');
 for(const [phase,facts,q]of [['OBSERVED',f.observed,observed],['VERIFIED',f.verified,verified]] as const){
  if(!facts||!q)continue;
  reasons.push(...q.representationIssues.map(r=>phase+':'+r));
  if(facts.identity.roomId===null)reasons.push(phase+':ROOM_IDENTITY_UNKNOWN');
  if(!['SUPPORTED','NOT_APPLICABLE'].includes(q.publicPrice))reasons.push(phase+':PUBLIC_PRICE_'+q.publicPrice);
  if(facts.availability.state!=='OBSERVED_AVAILABLE')reasons.push(phase+':AVAILABILITY_'+facts.availability.state);
  if(['EXPIRED','UNINTERPRETABLE','CONFLICTING'].includes(q.freshness))reasons.push(phase+':EXPIRY_'+q.freshness);
 }
 let knowledge:'NOT_VERIFIED'|'UNCHANGED'|'KNOWLEDGE_COMPLETED_BY_VERIFICATION'='NOT_VERIFIED';
 if(f.observed&&f.verified&&observed&&verified){
  const a=f.observed,b=f.verified;
  const scope=(x:HistoricalOfferFactsV3)=>({property:x.identity.propertyId,offer:x.identity.offerId,room:x.identity.roomId,checkIn:x.search.checkIn,checkOut:x.search.checkOut,currency:x.search.currency,adults:x.search.adults,units:x.search.units,ages:qualifyHistoricalCommercialFactsV3(x).searchAges});
  if(!eq(scope(a),scope(b)))reasons.push('VERIFICATION_SCOPE_CONFLICT');
  if(orderExplicitInstants(a.time.observedAt,b.time.observedAt)===1)reasons.push('VERIFICATION_PRECEDES_OBSERVATION');
  if(verified.cost.status!=='SUPPORTED'||verified.cost.completeTotal===null)reasons.push('COMPLETE_VERIFIED_COST_UNPROVEN');
  if(verified.accommodation!=='SUPPORTED')reasons.push('ACCOMMODATION_'+verified.accommodation);
  if(!['SUPPORTED','NOT_APPLICABLE'].includes(verified.familyAdmission))reasons.push('FAMILY_ADMISSION_'+verified.familyAdmission);
  if(verified.pendingConditions.length)reasons.push(...verified.pendingConditions.map(x=>'CONDITION_REQUIRES_QUALIFICATION:'+x));
  if(b.terms.cancellationStatus!=='SUPPORTED'||!b.terms.meal||b.terms.payment!=='KNOWN')reasons.push('COMMERCIAL_TERMS_INCOMPLETE');
  // Do not erase known money or terms when knowledge is completed. Existing
  // tolerance is reused; foreign currencies are never compared numerically.
  if(!a.price.observed||!b.price.observed||a.price.observed.currency!==b.price.observed.currency||Math.abs(a.price.observed.amount-b.price.observed.amount)>COMMERCIAL_EVIDENCE_DELTA_V3)reasons.push('KNOWN_PRICE_CHANGED_OR_UNREPRESENTABLE');
  for(const c of a.price.components)if(!b.price.components.some(v=>eq(c,v)))reasons.push('KNOWN_COMPONENT_CHANGED');
  if(observed.cost.status==='SUPPORTED'&&(!eq(a.price.components,b.price.components)||Math.abs(observed.cost.completeTotal!-verified.cost.completeTotal!)>COMMERCIAL_EVIDENCE_DELTA_V3))reasons.push('KNOWN_COMPLETE_COST_CHANGED');
  knowledge=observed.cost.status==='SUPPORTED'?'UNCHANGED':'KNOWLEDGE_COMPLETED_BY_VERIFICATION';
 }
 const problems=unique(reasons);
 return {status:problems.length?'INCOMPLETE_OR_CONFLICTING':'QUALIFIED_AT_OBSERVATION',reasons:problems,observed,verified,knowledge,
  providerVersion:f.continuity.providerVersion,verificationCount:verified?1:0,retrievalCount:f.continuity.retrievalCount,
  currentBookabilityGuaranteed:false,engineInvocations:0,policyInvocations:0,semanticFingerprint:createStableHashV3({observed:observed?.semanticKey??null,verified:verified?.semanticKey??null,knowledge,reasons:problems},'authenticated-commercial-facts-v2')};
}
export function qualifyAuthenticatedCommercialOfferV3(f:ComparisonOfferFactsV3,pricePolicy?:PublicPricePolicyV3){
 const historical=qualifyAuthenticatedCommercialOfferLegacyV3(f);
 if(!pricePolicy)return historical;
 const pricePerspective=qualifyPublicPricePerspectiveV3(f.observed,f.verified,pricePolicy,f.publicPriceVerification);
 // Only the conflated public-minimum gate is superseded. Original facts and
 // both legacy qualifications stay visible; every other substantive gate stays.
 const reasons=unique([...historical.reasons.filter(r=>!/^((OBSERVED|VERIFIED):PUBLIC_PRICE_)/.test(r)&&
  !(r==='COMPLETE_VERIFIED_COST_UNPROVEN'&&pricePerspective.completeCost.status==='SUPPORTED')),...pricePerspective.reasons]);
 return {...historical,status:reasons.length?'INCOMPLETE_OR_CONFLICTING':'QUALIFIED_AT_OBSERVATION',reasons,pricePerspective,
  historicalStatus:historical.status,historicalReasons:historical.reasons,
  semanticFingerprint:createStableHashV3({historical:historical.semanticFingerprint,pricePerspective,reasons},'authenticated-public-price-facts-v2.1')};
}
export function authenticatedQualifiedCostV3(q:ReturnType<typeof qualifyAuthenticatedCommercialOfferV3>){
 return 'pricePerspective' in q?q.pricePerspective!.completeCost:q.verified?.cost??{status:'UNKNOWN' as const,completeTotal:null,currency:null};
}
export function qualifyAuthenticatedCommercialSetV3(facts:AuthenticatedComparisonFactsV3,pricePolicy?:PublicPricePolicyV3){
 if(facts.version!==(pricePolicy?'stayopti.authenticated-commercial-facts@2.1':'stayopti.authenticated-commercial-facts@2'))throw Error('COMMERCIAL_FACTS_PRICE_VERSION_MISMATCH');
 if(pricePolicy)validatePublicPricePolicyV3(pricePolicy);
 const offers=facts.offers.map(f=>({key:f.key,facts:f,qualification:qualifyAuthenticatedCommercialOfferV3(f,pricePolicy)}));
 const qualified=offers.filter(o=>o.qualification.status==='QUALIFIED_AT_OBSERVATION');
 const properties=new Set(qualified.map(o=>o.facts.observed!.identity.propertyId));
 return {version:pricePolicy?'stayopti.authenticated-commercial-set@2.1' as const:AUTHENTICATED_COMMERCIAL_SET_V3,offers,qualifiedKeys:qualified.map(o=>o.key).sort(),distinctQualifiedProperties:properties.size,
  status:properties.size>=2?'PREPARED_PILOT_SET':properties.size===1?'TECHNICAL_SINGLE_PROPERTY_ONLY':'PREPARATION_STOPPED',
  minimumTwoPropertiesIsPilotOnly:true,sourceSetFingerprint:facts.sourceSetFingerprint,
  fullSetFingerprint:pricePolicy?createStableHashV3({facts,pricePolicy},'authenticated-public-price-alternative-set-v2.1'):createStableHashV3(facts,'authenticated-full-alternative-set'),engineInvocations:0,policyInvocations:0,goldenAdmission:false};
}
