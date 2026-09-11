// D-0052 R2: only consumed applicable claims participate in scoped fact fusion.
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
// Only this bounded room-name grammar is neutral, not affirmative privacy,
// capacity, unit type or comfort evidence. Unsupported/conditional descriptions
// retain the existing UNKNOWN behavior. Other source fields are not filtered.
function scopedTextEvidence(texts:string[],dimension:'unit'|'bath',roomName=false){
 const neutralDenominations:string[]=[];
 const clauses=texts.flatMap(t=>t.split(/[.,;:|\n]+/)).filter(clause=>{
  const text=clause.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const neutral=roomName&&dimension==='unit'&&(
   /^(?:standard )?(?:(?:single|double|twin|triple|quadruple) )?room(?: standard)?$/.test(text)||
   /^(?:camera|stanza)(?: (?:singola|doppia|tripla|quadrupla))?(?: standard)?$/.test(text));
  if(neutral)neutralDenominations.push(clause);
  return !neutral;
 });
 const parsed=privacyEvidence(clauses,dimension,true);
 // Removing a neutral noun must not orphan a qualifier referring back to it.
 // These fragments are uncertainty, not a newly inferred positive/negative fact.
 // A bathroom-specific qualifier must not negate independent unit privacy.
 const unresolvedPrivacyQualifiers=neutralDenominations.length?clauses.filter(clause=>{
  if(privacyEvidence([clause],'unit',true).mentioned||privacyEvidence([clause],'bath',true).mentioned)return false;
  const text=clause.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  return /\b(?:privacy|private|privata|privato|exclusive|esclusivo|esclusiva|shared|condiviso|condivisa|unknown|sconosciuta)\b/.test(text)||
   /^(?:on request|su richiesta|subject to availability|non disponibile|not available)$/.test(text);
 }):[];
 return {...parsed,...(unresolvedPrivacyQualifiers.length?{mentioned:true,state:parsed.state==='CONFLICTING'?'CONFLICTING' as const:'UNKNOWN' as const}:{}),
  neutralDenominations,unresolvedPrivacyQualifiers};
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
  const activeClaim=claim.state!=='UNKNOWN'&&supportedClaim;
  // An inapplicable claim cannot erase OFFER facts. It still prevents using
  // its generic source as a fallback certificate when no scoped fact exists.
  const blockPropertyFallback=claim.state!=='UNKNOWN';
  const interpreted=records?.map(r=>{
   const values=r.original.status==='KNOWN'?(Array.isArray(r.original.value)?r.original.value:
    typeof r.original.value==='string'?[r.original.value]:[]):[];
   // Canonicalize ONLY these existing feature synonyms; surrounding negations
   // and qualifications remain intact for the polarity parser. Original text
   // stays in the record. No alias is itself affirmative evidence.
   const texts=values.filter((v):v is string=>typeof v==='string').flatMap(v=>v.split(/[;,\n|]+/)).map(v=>
    v.replace(/\bsuite privata\b/gi,'Private room').replace(/\bbagno in camera\b/gi,'Private bathroom')
     .replace(/\bdormitorio condiviso\b/gi,'Shared dormitory'));
   const parsed=scopedTextEvidence(texts,dimension,r.sourceField==='roomName');
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
  const selected=offer.length||blockPropertyFallback?offer:mentioned;
  let states=selected.map(r=>r.parsed.state),unitPhrases=selected.flatMap(r=>r.parsed.affirmativeUnits);
  let propertyFallbackUsed=selected.some(r=>r.scope==='PROPERTY');
  let roomNameInterpretation:ReturnType<typeof scopedTextEvidence>|null=null;
  if(!records){
   const fromOffer=scopedTextEvidence(input.roomText?[input.roomText]:[],dimension,true);
   roomNameInterpretation=fromOffer;
   const fromProperty=privacyEvidence(input.features,dimension,true);
   const parsed=fromOffer.mentioned?fromOffer:blockPropertyFallback?null:fromProperty;
   propertyFallbackUsed=parsed===fromProperty&&fromProperty.mentioned;
   states=parsed?.mentioned?[parsed.state]:[];unitPhrases=parsed?.affirmativeUnits??[];
  }
  if(activeClaim)states.push(claimState);
  const state=merge(states);
  const presentUnsupported=selected.some(r=>r.original.status==='KNOWN'&&r.parsed.state==='UNKNOWN');
  return {dimension,state,unitPhrases,selected,observations:interpreted??[],roomNameInterpretation,claim,claimConsumed:activeClaim,
   claimNonConsumptionReason:activeClaim?null:!supportedClaim?'CLAIM_NOT_OFFER_APPLICABLE':'CLAIM_UNKNOWN_NO_ADDITIONAL_FACT',
   reason:state==='CONFLICTING'?'DATA_PRESENT_CONFLICTING':presentUnsupported?'DATA_PRESENT_GRAMMAR_UNSUPPORTED_OR_CONDITIONAL':
    state==='UNKNOWN'?'DATA_ABSENT_OR_APPLICABILITY_UNVERIFIED':'DOCUMENTED_SUPPORTED',propertyFallbackUsed,
   applicabilityVerified:supportedClaim};
 });
 const [unit,bath]=dimensions;
 // Only affirmative lexical accommodation descriptions support a unit TYPE.
 // An exclusive-use boolean establishes privacy, not category, size or comfort.
 const classified=resolveOfferPrivacyV3({id,provider:'',amenities:unit.unitPhrases,facilities:[]},null,rateKey);
 const typed=['PRIVATE','SHARED'].includes(unit.state)?classified.unitType:'unknown';
 return {...legacy,scopedVersion:'stayopti.evaluation.observed-privacy@1.1',unitState:unit.state,bathroomState:bath.state,
  unitType:typed,unitEvidenceIds:typed==='unknown'?[]:classified.unitEvidenceIds,
  unitSource:'SCOPED_TEXT_AND_STRUCTURED_CLAIMS',bathroomSource:'SCOPED_TEXT_AND_STRUCTURED_CLAIMS',
  evidenceReferences:[...new Set(dimensions.flatMap(d=>[...d.selected.flatMap(r=>r.links),...(d.claimConsumed?d.claim.links:[])])
   .flatMap(l=>l.evidence.map(e=>l.field+':'+e.ref+':'+e.sha256)))],
  resolution:dimensions,exclusiveUseDoesNotDefineUnitType:true};
}
