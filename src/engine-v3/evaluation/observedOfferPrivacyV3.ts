// D-0052 R1: property fallback never overwrites an offer-specific limitation.
import {privacyEvidence,resolveOfferPrivacyV3,type PrivacyState} from './staySuitabilityContextV3';
export interface ScopedObservationV3 {
 sourceField:string;scope:'PROPERTY'|'OFFER';offerScope:{roomKey:string;rateKey:string};
 original:{status:string;value:unknown;reason:string|null;reliability:string;evidenceRefs:string[]};
 links:{field:string;evidence:{ref:string;sha256:string}[]}[];
 structuredPrivacy?:{state:string}|null;
}
export interface ObservedPrivacyClaimV3 {
 state:'KNOWN'|'UNKNOWN'|'CONFLICTING';value:boolean|null;reason:string;applicability:string;
 scope:{roomKey:string;rateKey:string};observedAt:string|null;timeSource:string|null;
 links:{field:string;evidence:{ref:string;sha256:string}[]}[];
}
function merge(states:PrivacyState[]):PrivacyState {
 if(states.includes('CONFLICTING')||(states.includes('PRIVATE')&&states.some(s=>['SHARED','NOT_PRIVATE'].includes(s))))return 'CONFLICTING';
 if(states.includes('UNKNOWN'))return 'UNKNOWN';
 return states.includes('SHARED')?'SHARED':states.includes('NOT_PRIVATE')?'NOT_PRIVATE':states.includes('PRIVATE')?'PRIVATE':'UNKNOWN';
}
export function resolveObservedOfferPrivacyV3(input:{id:string;roomKey:string;rateKey:string;roomText:string|null;features:string[];
 scopedObservations:ScopedObservationV3[]|null;privacyClaims:{privateBathroom:ObservedPrivacyClaimV3;exclusiveUse:ObservedPrivacyClaimV3}}){
 const {id,roomKey,rateKey}=input;
 const legacy=resolveOfferPrivacyV3({id,provider:'',amenities:input.features,facilities:[]},input.roomText,rateKey);
 const records=input.scopedObservations;
 if(records?.some(r=>r.offerScope.roomKey!==roomKey||r.offerScope.rateKey!==rateKey||!Array.isArray(r.links)))throw Error('OBSERVED_PRIVACY_RECORD_SCOPE');
 const dimensions=(['unit','bath'] as const).map(dimension=>{
  const key=dimension==='unit'?'exclusiveUse':'privateBathroom',claim=input.privacyClaims[key];
  if(claim.scope.roomKey!==roomKey||claim.scope.rateKey!==rateKey)throw Error('OBSERVED_PRIVACY_CLAIM_SCOPE');
  const supportedClaim=claim.applicability==='OFFER_SCOPED';
  const claimState:PrivacyState=claim.state==='CONFLICTING'?'CONFLICTING':claim.state==='KNOWN'&&supportedClaim?
    claim.value===true?'PRIVATE':'NOT_PRIVATE':'UNKNOWN';
  // UNKNOWN default claim is not evidence that an independently documented
  // text fact is false. Explicit field UNKNOWN/conditional text still survives.
  const activeClaim=claim.state!=='UNKNOWN';
  const interpreted=records?.map(r=>{
   const values=r.original.status==='KNOWN'?(Array.isArray(r.original.value)?r.original.value:
    typeof r.original.value==='string'?[r.original.value]:[]):[];
   // Canonicalize ONLY these existing feature synonyms; surrounding negations
   // and qualifications remain intact for the polarity parser. Original text
   // stays in the record. No alias is itself affirmative evidence.
   const texts=values.filter((v):v is string=>typeof v==='string').flatMap(v=>v.split(/[;,\n|]+/)).map(v=>
    v.replace(/\bsuite privata\b/gi,'Private room').replace(/\bbagno in camera\b/gi,'Private bathroom')
     .replace(/\bdormitorio condiviso\b/gi,'Shared dormitory'));
   const parsed=privacyEvidence(texts,dimension,true);
   if(r.sourceField===key&&r.structuredPrivacy)return {...r,parsed:{mentioned:true,affirmativeUnits:[],
    state:(r.structuredPrivacy.state==='POSITIVE'?'PRIVATE':r.structuredPrivacy.state==='NEGATIVE'?'NOT_PRIVATE':
     r.structuredPrivacy.state==='CONFLICTING'?'CONFLICTING':'UNKNOWN') as PrivacyState}};
   if(r.sourceField===key&&r.original.status==='UNKNOWN')return {...r,parsed:{...parsed,mentioned:true,state:'UNKNOWN' as const}};
   // A typed source field is separately present even if the caller omits a
   // normalized claim. Consume only its exact boolean meaning, no unit type.
   if(r.sourceField===key&&r.original.status==='KNOWN'&&typeof r.original.value==='boolean')
    return {...r,parsed:{state:r.original.value?'PRIVATE' as const:'NOT_PRIVATE' as const,mentioned:true,affirmativeUnits:[]}};
   return {...r,parsed};
  });
  const mentioned=interpreted?.filter(r=>r.parsed.mentioned)??[];
  const offer=mentioned.filter(r=>r.scope==='OFFER');
  const selected=offer.length||activeClaim?offer:mentioned;
  let states=selected.map(r=>r.parsed.state),unitPhrases=selected.flatMap(r=>r.parsed.affirmativeUnits);
  if(!records){
   const fromOffer=privacyEvidence(input.roomText?[input.roomText]:[],dimension,true);
   const fromProperty=privacyEvidence(input.features,dimension,true);
   const parsed=fromOffer.mentioned?fromOffer:activeClaim?null:fromProperty;
   states=parsed?.mentioned?[parsed.state]:[];unitPhrases=parsed?.affirmativeUnits??[];
  }
  if(activeClaim)states.push(claimState);
  const state=merge(states);
  const presentUnsupported=selected.some(r=>r.original.status==='KNOWN'&&r.parsed.state==='UNKNOWN');
  return {dimension,state,unitPhrases,selected,observations:interpreted??[],claim,claimConsumed:activeClaim&&supportedClaim,
   reason:state==='CONFLICTING'?'DATA_PRESENT_CONFLICTING':presentUnsupported?'DATA_PRESENT_GRAMMAR_UNSUPPORTED_OR_CONDITIONAL':
    state==='UNKNOWN'?'DATA_ABSENT_OR_APPLICABILITY_UNVERIFIED':'DOCUMENTED_SUPPORTED',propertyFallbackUsed:!offer.length&&!activeClaim,
   applicabilityVerified:supportedClaim};
 });
 const [unit,bath]=dimensions;
 // Only affirmative lexical accommodation descriptions support a unit TYPE.
 // An exclusive-use boolean establishes privacy, not category, size or comfort.
 const classified=resolveOfferPrivacyV3({id,provider:'',amenities:unit.unitPhrases,facilities:[]},null,rateKey);
 const typed=['PRIVATE','SHARED'].includes(unit.state)?classified.unitType:'unknown';
 return {...legacy,scopedVersion:'stayopti.evaluation.observed-privacy@1',unitState:unit.state,bathroomState:bath.state,
  unitType:typed,unitEvidenceIds:typed==='unknown'?[]:classified.unitEvidenceIds,
  unitSource:'SCOPED_TEXT_AND_STRUCTURED_CLAIMS',bathroomSource:'SCOPED_TEXT_AND_STRUCTURED_CLAIMS',
  evidenceReferences:[...new Set(dimensions.flatMap(d=>[...d.selected.flatMap(r=>r.links),...(d.claimConsumed?d.claim.links:[])])
   .flatMap(l=>l.evidence.map(e=>l.field+':'+e.ref+':'+e.sha256)))],
  resolution:dimensions,exclusiveUseDoesNotDefineUnitType:true};
}
