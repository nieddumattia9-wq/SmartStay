import { interpretChildAges } from '../../utils/searchParty';
import { canonicalExplicitInstant, orderExplicitInstants } from '../../../server/shared/explicit-instant';
import { stableSerializeV3 } from './stableHashV3';
import { enumerateStayNightsV3 } from '../integrity/stayOfferIntegrityV3';

/** Additive diagnostic contract. NOT A02 @1/@1.1 or a decision-binding receipt. */
export const HISTORICAL_COMMERCIAL_VERSION_V3 = 'stayopti.historical-commercial-matrix@1' as const;
export type HistoricalStatusV3 = 'SUPPORTED' | 'UNKNOWN' | 'CONFLICTING' | 'VIOLATED' | 'NOT_APPLICABLE';
export interface HistoricalSourceV3 {
 recordSha256: string; requestSha256: string; pointer: string; observedAt: string;
 scope: 'OFFER' | 'ROOM' | 'PROPERTY' | 'REQUEST'; transformation: string;
}
export interface HistoricalConditionV3 {
 code: string; text: string; subject: 'ADMISSION' | 'ACCOMPANIMENT' | 'IDENTIFICATION' | 'MONETARY' | 'ACCESSORY';
 applicability: 'APPLIES' | 'NOT_APPLICABLE' | 'UNVERIFIED';
 effect: 'PERMITS' | 'PROHIBITS' | 'REQUIRES_CONFIRMATION' | 'INFORMATION_ONLY'; source: HistoricalSourceV3;
}
export interface HistoricalOfferFactsV3 {
 identity: { provider: string; propertyId: string; offerId: string; roomId: string | null;
  providerVersion: {state: 'KNOWN'; value: string; source: HistoricalSourceV3} | {state: 'UNKNOWN'; reason: string};
  observationId: string; originalOfferSha256: string; source: HistoricalSourceV3 };
 search: { checkIn: string; checkOut: string; currency: string; adults: number; children: number; childAges: unknown; units: number; source: HistoricalSourceV3 };
 representationIssues: string[];
 childAgeEchoes: Array<{value:unknown;field:string}>;
 price: { observed: {amount: number; currency: string} | null; publicMinimum: {
  applicability: 'APPLIES' | 'NOT_APPLICABLE' | 'UNKNOWN'; amounts: Array<{amount: number; currency: string}>; issues: string[];
 }; coverage: 'DOCUMENTED_ALL_INCLUDED' | 'UNKNOWN'; components: Array<{
  amount: number | null; currency: string | null; inclusion: 'INCLUDED' | 'EXCLUDED' | 'UNKNOWN';
  kind: 'MANDATORY' | 'OPTIONAL' | 'REFUNDABLE_DEPOSIT' | 'UNKNOWN'; basis: 'TOTAL_STAY' | 'UNKNOWN';
 }>; issues: string[]; source: HistoricalSourceV3 };
 accommodation: { capacity: HistoricalStatusV3; sleeping: HistoricalStatusV3; sourcesAgree: HistoricalStatusV3;
  issues: string[]; source: HistoricalSourceV3 | null; originalComparison: unknown };
 conditions: HistoricalConditionV3[];
 terms: { meal: string | null; cancellation: unknown; cancellationStatus: HistoricalStatusV3; payment: 'KNOWN' | 'UNKNOWN'; source: HistoricalSourceV3 };
 availability: {state: 'OBSERVED_AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN' | 'CONFLICTING'; source: HistoricalSourceV3};
 /** This lot only ingests observations. No endpoint name can manufacture verification. */
 commercialVerification: 'NOT_OBSERVED'; sessionRetrieval: 'NOT_OBSERVED';
 time: { observedAt: string; detailObservedAt: string | null; providerExpiryObservations: unknown[]; evaluatedAt: string };
 trace: unknown;
}
const unique=(xs:string[])=>[...new Set(xs)].sort();
const money=(x:number|null)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const sourceValid=(s:HistoricalSourceV3)=>s&&/^[a-f0-9]{64}$/.test(s.recordSha256)&&/^[a-f0-9]{64}$/.test(s.requestSha256)&&
 typeof s.pointer==='string'&&s.pointer.length>0&&typeof s.transformation==='string'&&s.transformation.length>0&&canonicalExplicitInstant(s.observedAt)!==null;
const combine=(xs:HistoricalStatusV3[]):HistoricalStatusV3=>xs.includes('CONFLICTING')?'CONFLICTING':xs.includes('VIOLATED')?'VIOLATED':xs.includes('UNKNOWN')?'UNKNOWN':'SUPPORTED';

/** Semantic qualification ONLY. Caller-supplied facts never acquire authenticity here. */
export function qualifyHistoricalCommercialFactsV3(f:HistoricalOfferFactsV3) {
 const invalid:string[]=[],blockers:string[]=[];
 const ages=interpretChildAges(f.search.childAges,f.search.children);
 for(const echo of f.childAgeEchoes){const parsed=interpretChildAges(echo.value,f.search.children);
  if(parsed.state!=='KNOWN'||ages.state!=='KNOWN'||stableSerializeV3(parsed.ages)!==stableSerializeV3(ages.ages))invalid.push('RETURNED_CHILD_AGES_UNVERIFIED_OR_DIFFERENT:'+echo.field);}
 if(ages.state!=='KNOWN'||!Number.isSafeInteger(f.search.adults)||f.search.adults<1||!Number.isSafeInteger(f.search.units)||f.search.units<1)invalid.push('SEARCH_PARTY_UNREPRESENTABLE');
 if(f.search.units!==1)blockers.push('MULTI_UNIT_ASSIGNMENT_NOT_SUPPORTED_BY_THIS_INGRESS');
 if(enumerateStayNightsV3(f.search.checkIn,f.search.checkOut).length===0||!/^[A-Z]{3}$/.test(f.search.currency))invalid.push('STAY_SCOPE_INVALID');
 for(const s of [f.identity.source,f.search.source,f.price.source,f.terms.source,f.availability.source,...f.conditions.map(c=>c.source),...(f.accommodation.source?[f.accommodation.source]:[])])if(!sourceValid(s))invalid.push('FACT_PROVENANCE_INVALID');
 if(!f.identity.provider||!f.identity.propertyId||!f.identity.offerId||!/^[a-f0-9]{64}$/.test(f.identity.originalOfferSha256)||!f.identity.observationId)invalid.push('IDENTITY_UNREPRESENTABLE');
 if(f.identity.providerVersion.state==='KNOWN'&&(!f.identity.providerVersion.value||!sourceValid(f.identity.providerVersion.source)))invalid.push('PROVIDER_VERSION_SOURCE_INVALID');
 // A local fingerprint is deliberately NOT a commercial revision.
 if(f.identity.providerVersion.state==='UNKNOWN')blockers.push('PROVIDER_REVISION_OR_FUTURE_CONTINUITY_PROOF_MISSING');
 if(f.identity.roomId===null)blockers.push('ROOM_IDENTITY_UNKNOWN');
 invalid.push(...f.representationIssues);
 const retail=f.price.observed,minimum=f.price.publicMinimum;
 let publicPrice:HistoricalStatusV3=minimum.applicability==='NOT_APPLICABLE'?'NOT_APPLICABLE':minimum.applicability==='UNKNOWN'?'UNKNOWN':'SUPPORTED';
 if(minimum.applicability==='APPLIES'){
  if(!retail||!money(retail.amount)||retail.currency!==f.search.currency||!minimum.amounts.length||minimum.issues.length||minimum.amounts.some(m=>!money(m.amount)||m.currency!==retail.currency))publicPrice='UNKNOWN';
  else if(minimum.amounts.some(m=>m.amount!==minimum.amounts[0].amount))publicPrice='CONFLICTING';
  else if(retail.amount<minimum.amounts[0].amount)publicPrice='VIOLATED';
 }
 if(!['SUPPORTED','NOT_APPLICABLE'].includes(publicPrice))blockers.push('PUBLIC_PRICE_'+publicPrice);
 const monetary=f.conditions.filter(c=>c.subject==='MONETARY'&&c.applicability!=='NOT_APPLICABLE'&&c.effect!=='INFORMATION_ONLY');
 let cost:HistoricalStatusV3=f.price.coverage==='DOCUMENTED_ALL_INCLUDED'&&retail&&money(retail.amount)&&retail.currency===f.search.currency&&!f.price.issues.length&&!monetary.length?'SUPPORTED':'UNKNOWN';
 let total=retail?.amount??null;
 for(const c of f.price.components){
  if(c.kind==='UNKNOWN'){cost='UNKNOWN';continue;}
  if(c.kind!=='MANDATORY')continue;
  if(!money(c.amount)||c.currency!==f.search.currency||c.basis!=='TOTAL_STAY'||c.inclusion==='UNKNOWN'){cost='UNKNOWN';continue;}
  if(c.inclusion==='EXCLUDED'&&total!==null)total+=c.amount!;
 }
 if(cost!=='SUPPORTED')blockers.push('COMPLETE_COST_UNPROVEN');
 const relevant=f.conditions.filter(c=>c.subject==='ADMISSION'&&c.applicability!=='NOT_APPLICABLE');
 const admissionApplies=f.search.children>0;
 const permits=relevant.some(c=>c.effect==='PERMITS'&&c.applicability==='APPLIES');
 const prohibits=relevant.some(c=>c.effect==='PROHIBITS');
 const uncertain=relevant.some(c=>c.applicability==='UNVERIFIED'||c.effect==='REQUIRES_CONFIRMATION');
 const explicitProhibition=relevant.some(c=>c.effect==='PROHIBITS'&&c.applicability==='APPLIES');
 const family:HistoricalStatusV3=!admissionApplies?'NOT_APPLICABLE':permits&&prohibits?'CONFLICTING':prohibits?(explicitProhibition?'VIOLATED':uncertain?'UNKNOWN':'VIOLATED'):permits&&!uncertain?'SUPPORTED':'UNKNOWN';
 if(!['SUPPORTED','NOT_APPLICABLE'].includes(family))blockers.push('FAMILY_ADMISSION_'+family);
 const pendingConditions=f.conditions.filter(c=>c.applicability!=='NOT_APPLICABLE'&&c.effect==='REQUIRES_CONFIRMATION');
 // Accompaniment/ID conditions remain scoped and do not change bed/tax facts.
 if(pendingConditions.length)blockers.push('APPLICABLE_CONDITIONS_REQUIRE_QUALIFICATION');
 const accommodation=combine([f.accommodation.capacity,f.accommodation.sleeping,f.accommodation.sourcesAgree,family]);
 if(accommodation!=='SUPPORTED')blockers.push('ACCOMMODATION_'+accommodation);
 const at=canonicalExplicitInstant(f.time.observedAt),evaluated=canonicalExplicitInstant(f.time.evaluatedAt);
 if(at===null||evaluated===null||orderExplicitInstants(f.time.observedAt,f.time.evaluatedAt)===1)invalid.push('OBSERVATION_TIME_UNINTERPRETABLE_OR_FUTURE');
 const expiries=f.time.providerExpiryObservations.map(x=>canonicalExplicitInstant(typeof x==='string'?x:''));
 const freshness=!expiries.length?'UNKNOWN':expiries.some(x=>x===null)?'UNINTERPRETABLE':new Set(expiries).size>1?'CONFLICTING':orderExplicitInstants(expiries[0]!,f.time.evaluatedAt)===-1?'EXPIRED':'EXPLICIT_WINDOW_AT_EVALUATION';
 if(freshness==='UNINTERPRETABLE'||freshness==='CONFLICTING'||freshness==='EXPIRED')blockers.push('PROVIDER_EXPIRY_'+freshness);
 blockers.push('COMMERCIAL_VERIFICATION_MISSING','REAL_DECISION_BINDING_OUT_OF_SCOPE');
 if(f.availability.state!=='OBSERVED_AVAILABLE')blockers.push('AVAILABILITY_'+f.availability.state);
 if(f.terms.meal===null||f.terms.payment==='UNKNOWN')blockers.push('COMMERCIAL_TERMS_INCOMPLETE');
 if(f.terms.cancellationStatus!=='SUPPORTED')blockers.push('CANCELLATION_'+f.terms.cancellationStatus);
 const commercial=combine([publicPrice,cost,f.availability.state==='UNAVAILABLE'?'VIOLATED':f.availability.state==='CONFLICTING'?'CONFLICTING':'UNKNOWN']);
 return {version:HISTORICAL_COMMERCIAL_VERSION_V3,authentication:'NOT_ATTESTED_BY_SEMANTIC_QUALIFIER' as const,
  representability:invalid.length?'PARTIAL':'REPRESENTABLE',representationIssues:unique(invalid),searchAges:ages,
  publicPrice,cost:{status:cost,completeTotal:cost==='SUPPORTED'&&total!==null?Math.round((total+Number.EPSILON)*100)/100:null,currency:f.search.currency},
  familyAdmission:family,capacity:f.accommodation.capacity,sleeping:f.accommodation.sleeping,accommodation,commercialCompleteness:commercial,
  pendingConditions:pendingConditions.map(c=>c.code),freshness,providerValidUntil:expiries.length&&expiries.every(x=>x!==null)&&new Set(expiries).size===1?expiries[0]:null,
  observationAt:at,detailObservedAt:f.time.detailObservedAt,verificationCount:0,retrievalCount:0,
  futureBindingRequirements:unique([...blockers,...invalid]),decisionProduced:false,engineInvocations:0,policyInvocations:0,goldenAdmission:false,
  semanticKey:stableSerializeV3({search:{checkIn:f.search.checkIn,checkOut:f.search.checkOut,currency:f.search.currency,adults:f.search.adults,children:f.search.children,units:f.search.units,childAges:ages},publicPrice,cost,family,accommodation,commercial,freshness})};
}
