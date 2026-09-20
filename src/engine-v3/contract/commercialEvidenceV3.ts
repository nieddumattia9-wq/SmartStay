import { createStableHashV3, stableSerializeV3 } from './stableHashV3';
import { interpretChildAges } from '../../utils/searchParty';
import { createStayOfferIntegritySnapshotV3, enumerateStayNightsV3, validateStayOfferIntegritySnapshotV3, type StayOfferIntegritySnapshotV3 } from '../integrity/stayOfferIntegrityV3';
import { canonicalExplicitInstant, orderExplicitInstants } from '../../../server/shared/explicit-instant';

export const COMMERCIAL_EVIDENCE_VERSION_V3 = 'stayopti.offer-commercial-evidence@1' as const;
export const FAMILY_COMMERCIAL_EVIDENCE_VERSION_V3 = 'stayopti.offer-commercial-evidence@1.1' as const;
export type CommercialEvidenceVersionV3 = typeof COMMERCIAL_EVIDENCE_VERSION_V3 | typeof FAMILY_COMMERCIAL_EVIDENCE_VERSION_V3;
// Same monetary boundary as historical decision-bound evidence; not a price policy.
export const COMMERCIAL_EVIDENCE_DELTA_V3 = 0.02;
export interface CommercialScopeV3 {
 propertyId: string; offerId: string; offerVersion: string; roomId: string;
 checkIn: string; checkOut: string; adults: number; childAges: number[]; units: number; currency: string;
}
export interface CommercialComponentV3 {
 id: string; amount: number | null; currency: string | null;
 kind: 'MANDATORY' | 'OPTIONAL' | 'REFUNDABLE_DEPOSIT' | 'UNKNOWN';
 category: 'TAX' | 'FEE' | 'OTHER' | 'UNKNOWN';
 inclusion: 'INCLUDED' | 'EXCLUDED' | 'UNKNOWN'; basis: 'TOTAL_STAY_ALL_GUESTS' | 'UNKNOWN';
 payable: 'NOW' | 'AT_PROPERTY' | 'UNKNOWN';
}
export interface CommercialTermsV3 {
 roomName: string | null; mealPlan: string | null;
 cancellation: { refundable: boolean | null; until: string | null; penalty: number | null; currency: string | null };
 payment: 'pay-now' | 'pay-later' | 'mixed' | 'unknown'; restrictions: string[];
}
export interface CommercialEventV3 {
 id: string; kind: 'OFFER_OBSERVED' | 'COMMERCIAL_VERIFICATION' | 'SESSION_RETRIEVAL';
 scope: CommercialScopeV3; source: { recordId: string; sha256: string; pointer: string; transformation: string };
 observedAt: string; providerVerifiedAt: string | null; providerValidUntil: string | null; internalExpiresAt: string | null;
 sessionId: string | null; refersToVerificationId: string | null;
 amount: number | null; currency: string | null;
 mandatoryCoverage: 'DOCUMENTED' | 'UNKNOWN'; components: CommercialComponentV3[];
 availability: 'OBSERVED_AVAILABLE' | 'VERIFIED_BOOKABLE' | 'UNAVAILABLE' | 'UNKNOWN' | 'CONFLICTING';
 terms: CommercialTermsV3; issues: string[]; contraryObservations: string[];
}
export interface CommercialEvidenceV3 {
 version: CommercialEvidenceVersionV3;
 scope: CommercialScopeV3; evaluatedAt: string; events: CommercialEventV3[];
 provenance: { origin: 'SYNTHETIC_ONLY'; profile: string; manifestSha256: string; originalSha256s: string[] };
}
export interface CommercialAssessmentV3 {
 version: CommercialEvidenceVersionV3;
 status: 'SUPPORTED_AT_OBSERVATION' | 'INCOMPLETE' | 'CONFLICTING' | 'EXPIRED' | 'INVALID';
 reasons: string[]; scope: CommercialScopeV3; observedTotal: number | null; verifiedTotal: number | null;
 snapshot: StayOfferIntegritySnapshotV3 | null; verificationCount: number; retrievalCount: number;
 providerValidUntil: string | null; freshness: 'EXPLICIT_EXPIRY_VALID' | 'EXPIRED' | 'UNKNOWN';
 semanticFingerprint: string; provenanceFingerprint: string;
 engineInvocations: 0; policyInvocations: 0; goldenAdmission: false;
}
export const commercialEqualV3=(a:unknown,b:unknown)=>stableSerializeV3(a)===stableSerializeV3(b);
export function commercialScopeMeaningV3(scope: CommercialScopeV3, version: CommercialEvidenceVersionV3) {
 // Legacy @1 retains ordered equality. @1.1 has a single-unit age multiset;
 // multi-unit wire scopes still do not attest a per-room allocation.
 return version === FAMILY_COMMERCIAL_EVIDENCE_VERSION_V3 && scope.units === 1
  ? {...scope, childAges: interpretChildAges(scope.childAges, scope.childAges.length).ages} : scope;
}
export function commercialScopesEqualV3(a: CommercialScopeV3, b: CommercialScopeV3, version: CommercialEvidenceVersionV3) {
 return commercialEqualV3(commercialScopeMeaningV3(a, version), commercialScopeMeaningV3(b, version));
}
export function commercialTermsMeaningV3(terms:CommercialTermsV3):CommercialTermsV3 {
 const at=commercialInstantV3(terms.cancellation.until);
 return {...terms,restrictions:[...new Set(terms.restrictions)].sort(),cancellation:{...terms.cancellation,until:at??terms.cancellation.until}};
}
function componentMeanings(components:CommercialComponentV3[]) {
 // Component identifiers/order are provenance, not monetary or contractual facts.
 return components.map(({id:_id,...fact})=>fact).sort((a,b)=>stableSerializeV3(a).localeCompare(stableSerializeV3(b)));
}
// Canonical exact instant, not a millisecond number. Uses the R06 grammar;
// raw timestamps remain in the authenticated events and snapshot.
export const commercialInstantV3=canonicalExplicitInstant;
const money=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const opaque=(v:unknown)=>typeof v==='string'&&v.length>0;
export function validCommercialScopeV3(s: CommercialScopeV3): boolean {
 return !!s&&[s.propertyId,s.offerId,s.offerVersion,s.roomId].every(opaque)&&/^[A-Z]{3}$/.test(s.currency)&&
 enumerateStayNightsV3(s.checkIn,s.checkOut).length>0&&Number.isSafeInteger(s.adults)&&s.adults>0&&Number.isSafeInteger(s.units)&&s.units>0&&
 Array.isArray(s.childAges)&&interpretChildAges(s.childAges,s.childAges.length).state==='KNOWN'&&s.childAges.every(x=>x<18);
}
function eventTotal(e: CommercialEventV3): number | null {
 if(!money(e.amount)||e.currency!==e.scope.currency||e.mandatoryCoverage!=='DOCUMENTED')return null;
 let total=e.amount!;
 for(const c of e.components){
  if(c.kind==='UNKNOWN')return null;
  if(c.kind!=='MANDATORY')continue; // Optional extras and refundable deposits are NOT stay cost.
  if(!money(c.amount)||c.category==='UNKNOWN'||c.currency!==e.currency||c.basis!=='TOTAL_STAY_ALL_GUESTS'||c.inclusion==='UNKNOWN')return null;
  if(c.inclusion==='EXCLUDED')total+=c.amount!;
 }
 return Math.round((total+Number.EPSILON)*100)/100;
}
/** Provider-neutral semantic validation. Not an authentication API or a decision. */
export function validateCommercialEvidenceV3(evidence: CommercialEvidenceV3): CommercialAssessmentV3 {
 const reasons: string[]=[],invalid:string[]=[],conflicts:string[]=[],expired:string[]=[];
 const {scope,events}=evidence;
 if(![COMMERCIAL_EVIDENCE_VERSION_V3,FAMILY_COMMERCIAL_EVIDENCE_VERSION_V3].includes(evidence.version)||!validCommercialScopeV3(scope)||commercialInstantV3(evidence.evaluatedAt)===null)invalid.push('SCHEMA_OR_SCOPE_INVALID');
 const ids=new Set<string>();let previous:string|null=null;
 const evaluated=commercialInstantV3(evidence.evaluatedAt);
 let expiryUninterpretable=false;
 for(const e of events){
  if(!opaque(e.id)||ids.has(e.id))invalid.push('EVENT_ID_INVALID');ids.add(e.id);
  if(!commercialScopesEqualV3(e.scope,scope,evidence.version))conflicts.push('EVENT_SCOPE_MISMATCH:'+e.id);
  const at=commercialInstantV3(e.observedAt);
  if(at===null||evaluated===null||previous!==null&&orderExplicitInstants(e.observedAt,previous)===-1||orderExplicitInstants(e.observedAt,evidence.evaluatedAt)===1)invalid.push('OBSERVATION_TIME_INVALID:'+e.id);
  if(at!==null)previous=e.observedAt;
  if(e.providerVerifiedAt!==null&&(commercialInstantV3(e.providerVerifiedAt)===null||at===null||orderExplicitInstants(e.providerVerifiedAt,e.observedAt)===1))invalid.push('PROVIDER_VERIFICATION_TIME_INVALID:'+e.id);
  if(e.providerValidUntil!==null){
   const until=commercialInstantV3(e.providerValidUntil);
   if(until===null){expiryUninterpretable=true;invalid.push('PROVIDER_EXPIRY_UNINTERPRETABLE:'+e.id);}
   else if(evaluated!==null&&orderExplicitInstants(e.providerValidUntil,evidence.evaluatedAt)===-1)expired.push('PROVIDER_EXPLICIT_EXPIRY:'+e.id);
  }
  if(!/^[a-f0-9]{64}$/.test(e.source.sha256)||!e.source.pointer||!e.source.transformation)invalid.push('SOURCE_REFERENCE_INVALID:'+e.id);
  if(e.components.some(c=>!opaque(c.id))||new Set(e.components.map(c=>c.id)).size!==e.components.length)invalid.push('COMPONENT_ID_AMBIGUOUS:'+e.id);
  if(e.currency!==scope.currency)conflicts.push('CURRENCY_MISMATCH:'+e.id);
  if(e.issues.length||e.contraryObservations.length)reasons.push(...e.issues.map(x=>e.id+':'+x),...e.contraryObservations.map(x=>e.id+':CONTRARY:'+x));
  if(e.availability==='CONFLICTING'||e.availability==='UNAVAILABLE')conflicts.push('AVAILABILITY_'+e.availability+':'+e.id);
 }
 const observed=events.filter(e=>e.kind==='OFFER_OBSERVED'),verifications=events.filter(e=>e.kind==='COMMERCIAL_VERIFICATION'),retrievals=events.filter(e=>e.kind==='SESSION_RETRIEVAL');
 if(observed.length!==1)invalid.push('ONE_OBSERVATION_REQUIRED');
 if(verifications.length===0)reasons.push('COMMERCIAL_VERIFICATION_MISSING');
 const first=observed[0],verified=verifications[0];
 const observedTotal=first?eventTotal(first):null,verifiedTotal=verified?eventTotal(verified):null;
 if(observedTotal===null)reasons.push('OBSERVED_COMPLETE_COST_UNPROVEN');
 if(verifiedTotal===null)reasons.push('VERIFIED_COMPLETE_COST_UNPROVEN');
 for(const v of verifications){
  if(v.availability!=='VERIFIED_BOOKABLE')reasons.push('VERIFIED_BOOKABILITY_MISSING:'+v.id);
  if(first&&!commercialEqualV3(commercialTermsMeaningV3(first.terms),commercialTermsMeaningV3(v.terms)))conflicts.push('COMMERCIAL_TERMS_CHANGED:'+v.id);
  if(first&&!commercialEqualV3(componentMeanings(first.components),componentMeanings(v.components)))conflicts.push('COMMERCIAL_COMPONENTS_CHANGED:'+v.id);
  const cost=eventTotal(v);
  if(cost===null)reasons.push('VERIFIED_COMPLETE_COST_UNPROVEN:'+v.id);
  if(first&&orderExplicitInstants(v.observedAt,first.observedAt)===-1)invalid.push('VERIFICATION_PRECEDES_OBSERVATION');
  if(cost!==null&&observedTotal!==null&&cost>observedTotal+COMMERCIAL_EVIDENCE_DELTA_V3)conflicts.push('TRAVELER_PRICE_INCREASE:'+v.id);
  if(verified&&(!commercialEqualV3(commercialTermsMeaningV3(v.terms),commercialTermsMeaningV3(verified.terms))||cost!==verifiedTotal))conflicts.push('VERIFICATIONS_DISAGREE:'+v.id);
 }
 for(const r of retrievals){
  const v=verifications.find(e=>e.id===r.refersToVerificationId);
  if(!v||!v.sessionId||r.sessionId!==v.sessionId||orderExplicitInstants(r.observedAt,v.observedAt)===-1)conflicts.push('RETRIEVAL_BINDING_INVALID:'+r.id);
  else if(!commercialEqualV3(commercialTermsMeaningV3(r.terms),commercialTermsMeaningV3(v.terms))||!commercialEqualV3(componentMeanings(r.components),componentMeanings(v.components))||eventTotal(r)===null||eventTotal(v)===null||Math.abs(eventTotal(r)!-eventTotal(v)!)>COMMERCIAL_EVIDENCE_DELTA_V3||r.availability!==v.availability||commercialInstantV3(r.providerValidUntil)!==commercialInstantV3(v.providerValidUntil))conflicts.push('RETRIEVAL_CONFLICT:'+r.id);
 }
 let snapshot:StayOfferIntegritySnapshotV3|null=null;
 if(verified&&validCommercialScopeV3(scope)){
  const taxes=verified.components.filter(c=>c.kind==='MANDATORY'&&c.category==='TAX');
  const fees=verified.components.filter(c=>c.kind==='MANDATORY'&&(c.category==='FEE'||c.category==='OTHER'));
  snapshot=createStayOfferIntegritySnapshotV3({hotelId:scope.propertyId,offerId:scope.offerId,
   scope:{checkIn:scope.checkIn,checkOut:scope.checkOut,nights:enumerateStayNightsV3(scope.checkIn,scope.checkOut).length,adults:scope.adults,children:scope.childAges.length,rooms:scope.units},
   roomName:verified.terms.roomName,mealPlan:verified.terms.mealPlan,cancellation:{refundable:verified.terms.cancellation.refundable,freeCancellationUntil:verified.terms.cancellation.until,penaltyAmount:verified.terms.cancellation.penalty,penaltyCurrency:verified.terms.cancellation.currency,policyKnown:verified.terms.cancellation.refundable!==null},
   payment:{timing:verified.terms.payment,state:verified.terms.payment==='unknown'?'unknown':'known'},
   cost:{amount:verifiedTotal,currency:scope.currency,completeness:verifiedTotal===null?'unknown':'reported-complete',taxesIncluded:verifiedTotal===null?null:!taxes.some(c=>c.inclusion==='EXCLUDED'),includedTaxes:taxes.filter(c=>c.inclusion==='INCLUDED').reduce((n,c)=>n+(c.amount??0),0),excludedTaxes:taxes.filter(c=>c.inclusion==='EXCLUDED').reduce((n,c)=>n+(c.amount??0),0),unknownTaxes:0,feeAmount:fees.reduce((n,c)=>n+(c.amount??0),0),feeState:verifiedTotal===null?'unknown':'known'},
   bookable:verified.availability==='VERIFIED_BOOKABLE'?true:verified.availability==='UNAVAILABLE'?false:null,recheckRequired:false,observedAt:verified.observedAt,freshness:'unknown',evidenceIds:events.map(e=>e.source.sha256+e.source.pointer)});
  const check=validateStayOfferIntegritySnapshotV3(snapshot);if(!check.valid)invalid.push(...check.issues.map(x=>x.code));
  if(snapshot.cost.integrityStatus!=='complete')reasons.push('CANONICAL_COST_NOT_COMPLETE');
  if(snapshot.room.state!=='known'||snapshot.mealPlan.state!=='known'||snapshot.cancellation.state!=='known')reasons.push('COMMERCIAL_CONDITIONS_INCOMPLETE');
 }
 const all=[...new Set([...invalid,...conflicts,...expired,...reasons])].sort();
 return {version:evidence.version,status:invalid.length?'INVALID':conflicts.length?'CONFLICTING':expired.length?'EXPIRED':reasons.length?'INCOMPLETE':'SUPPORTED_AT_OBSERVATION',reasons:all,scope:structuredClone(scope),observedTotal,verifiedTotal,snapshot,
  verificationCount:verifications.length,retrievalCount:retrievals.length,providerValidUntil:verified?.providerValidUntil??null,
  freshness:expiryUninterpretable||evaluated===null?'UNKNOWN':expired.length?'EXPIRED':verified?.providerValidUntil?'EXPLICIT_EXPIRY_VALID':'UNKNOWN',
  semanticFingerprint:createStableHashV3({scope:commercialScopeMeaningV3(scope,evidence.version),observedTotal,verifiedTotal,components:componentMeanings(verified?.components??[]),terms:verified?commercialTermsMeaningV3(verified.terms):null,availability:verified?.availability??'UNKNOWN',providerValidUntil:commercialInstantV3(verified?.providerValidUntil),reasons:all},'stayopti-common-commercial-semantics'),
  provenanceFingerprint:createStableHashV3({provenance:evidence.provenance,events},'stayopti-common-commercial-provenance'),engineInvocations:0,policyInvocations:0,goldenAdmission:false};
}
