import { stableSerializeV3 } from '../contract/stableHashV3';
import {
  COMMERCIAL_EVIDENCE_VERSION_V3, commercialEqualV3, validCommercialScopeV3,
  validateCommercialEvidenceV3,
  type CommercialAssessmentV3, type CommercialComponentV3, type CommercialEventV3,
  type CommercialEvidenceV3, type CommercialScopeV3, type CommercialTermsV3,
} from '../contract/commercialEvidenceV3';

/** Two documented INVENTED protocols. Neither is a LIVE provider adapter. */
export type SyntheticCommercialProfileV3 = 'synthetic-session@1' | 'synthetic-attested-quote@1';
export interface SyntheticCommercialOriginalV3 { id: string; operation: string; capturedAt: string; body: string; sha256: string }
export interface SyntheticCommercialPacketV3 {
  version: 'synthetic-commercial-packet@1'; origin: 'SYNTHETIC_ONLY'; profile: SyntheticCommercialProfileV3;
  expectedScope: CommercialScopeV3; evaluatedAt: string;
  records: SyntheticCommercialOriginalV3[]; manifestSha256: string;
}
export interface PreparedCommercialEvidenceV3 {
  evidence: CommercialEvidenceV3; assessment: CommercialAssessmentV3;
  authenticatedOriginals: readonly SyntheticCommercialOriginalV3[];
}
const issued = new WeakSet<object>();
export async function commercialSha256V3(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export async function commercialPacketManifestV3(packet: Omit<SyntheticCommercialPacketV3, 'manifestSha256'>): Promise<string> {
  return commercialSha256V3(stableSerializeV3(packet));
}
export function isPreparedCommercialEvidenceV3(value: unknown): value is PreparedCommercialEvidenceV3 {
  return !!value && typeof value === 'object' && issued.has(value);
}
function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('COMMERCIAL_WIRE_RECORD_REQUIRED');
  return value as RecordValue;
}
function text(value: unknown): string | null { return typeof value === 'string' && value.length > 0 ? value : null; }
function number(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function list(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('COMMERCIAL_WIRE_ARRAY_REQUIRED'); return value; }
function strings(value: unknown): string[] { return list(value).map(v => { if (typeof v !== 'string') throw new Error('COMMERCIAL_WIRE_TEXT_REQUIRED'); return v; }); }
function scope(value: unknown): CommercialScopeV3 {
  const v=record(value);
  const result: CommercialScopeV3={propertyId:text(v.propertyId)??'',offerId:text(v.offerId)??'',offerVersion:text(v.offerVersion)??'',roomId:text(v.roomId)??'',
    checkIn:text(v.checkIn)??'',checkOut:text(v.checkOut)??'',adults:number(v.adults)??NaN,childAges:list(v.childAges).map(x=>number(x)??NaN),units:number(v.units)??NaN,currency:text(v.currency)??''};
  if(!validCommercialScopeV3(result))throw new Error('COMMERCIAL_WIRE_SCOPE_INVALID');return result;
}
function terms(value: unknown): CommercialTermsV3 {
  const v=record(value),c=record(v.cancellation),payment=v.payment;
  return {roomName:text(v.roomName),mealPlan:text(v.mealPlan),cancellation:{refundable:typeof c.refundable==='boolean'?c.refundable:null,until:text(c.until),penalty:number(c.penalty),currency:text(c.currency)},
    payment:payment==='pay-now'||payment==='pay-later'||payment==='mixed'?payment:'unknown',restrictions:strings(v.restrictions)};
}
function component(value: unknown, minor: boolean): CommercialComponentV3 {
  const c=record(value),raw=number(minor?c.minor:c.amount),kind=c.kind,inclusion=c.inclusion,payable=c.payable;
  if(minor&&raw!==null&&!Number.isSafeInteger(raw))throw new Error('COMMERCIAL_MINOR_AMOUNT_INVALID');
  return {id:text(c.id)??'',amount:raw===null?null:minor?raw/100:raw,currency:text(c.currency),
    kind:kind==='MANDATORY'||kind==='OPTIONAL'||kind==='REFUNDABLE_DEPOSIT'?kind:'UNKNOWN',
    category:c.category==='TAX'||c.category==='FEE'||c.category==='OTHER'?c.category:'UNKNOWN',
    inclusion:inclusion==='INCLUDED'||inclusion==='EXCLUDED'?inclusion:'UNKNOWN',basis:c.basis==='TOTAL_STAY_ALL_GUESTS'?'TOTAL_STAY_ALL_GUESTS':'UNKNOWN',
    payable:payable==='NOW'||payable==='AT_PROPERTY'?payable:'UNKNOWN'};
}
function meaningfulError(v: unknown): boolean { return v!==undefined && v!==null && v!==false && v!=='' && !(Array.isArray(v)&&v.length===0); }
function normalize(profile: SyntheticCommercialProfileV3, original: SyntheticCommercialOriginalV3): CommercialEventV3 {
  const root=record(JSON.parse(original.body)),minor=profile==='synthetic-attested-quote@1';
  const allowed=minor?['LIST','VERIFY']:['SEARCH','CREATE_SESSION','READ_SESSION'];
  if(!allowed.includes(original.operation))throw new Error('COMMERCIAL_OPERATION_NOT_SUPPORTED');
  const data=record(minor?root.quote:root.data),issues:string[]=[];
  if(meaningfulError(root.error)||meaningfulError(root.errors)||meaningfulError(data.error)||meaningfulError(data.errors))issues.push('RESPONSE_SEMANTIC_ERROR');
  const kind:CommercialEventV3['kind']=original.operation==='SEARCH'||original.operation==='LIST'?'OFFER_OBSERVED':original.operation==='READ_SESSION'?'SESSION_RETRIEVAL':'COMMERCIAL_VERIFICATION';
  const money=record(minor?data.money:data.price),raw=number(minor?money.minor:money.amount);
  if(minor&&raw!==null&&!Number.isSafeInteger(raw))throw new Error('COMMERCIAL_MINOR_AMOUNT_INVALID');
  const status=minor?data.verdict:data.status;
  // A request label alone cannot certify availability: the protocol's response must assert it.
  const availability:CommercialEventV3['availability']=status==='unavailable'?'UNAVAILABLE':status==='conflicting'?'CONFLICTING':
    kind==='OFFER_OBSERVED'&&status==='available'?'OBSERVED_AVAILABLE':
    kind!=='OFFER_OBSERVED'&&status==='confirmed'?'VERIFIED_BOOKABLE':'UNKNOWN';
  return {id:original.id,kind,scope:scope(data.scope),source:{recordId:original.id,sha256:original.sha256,pointer:minor?'/quote':'/data',transformation:profile},
    observedAt:original.capturedAt,providerVerifiedAt:text(data.verifiedAt),providerValidUntil:text(data.validUntil),internalExpiresAt:text(data.cacheExpiresAt),
    sessionId:text(data.sessionId),refersToVerificationId:text(data.verificationRecordId),amount:raw===null?null:minor?raw/100:raw,currency:text(money.currency),
    mandatoryCoverage:money.mandatoryCoverage==='enumerated-all-compulsory-stay-charges'?'DOCUMENTED':'UNKNOWN',components:list(money.components).map(c=>component(c,minor)),
    availability,terms:terms(data.terms),issues,contraryObservations:strings(data.adverse)};
}
/** Authentication -> normalization -> pure qualification. No engine, policy, network or HUMAN receipt. */
export async function prepareSyntheticCommercialEvidenceV3(packet: SyntheticCommercialPacketV3): Promise<PreparedCommercialEvidenceV3> {
  const copy=structuredClone(packet),{manifestSha256,...manifest}=copy;
  if(copy.version!=='synthetic-commercial-packet@1'||copy.origin!=='SYNTHETIC_ONLY'||!['synthetic-session@1','synthetic-attested-quote@1'].includes(copy.profile))throw new Error('COMMERCIAL_PROFILE_UNSUPPORTED');
  if(await commercialPacketManifestV3(manifest)!==manifestSha256)throw new Error('COMMERCIAL_MANIFEST_HASH_MISMATCH');
  const ids=new Set<string>();
  for(const r of copy.records){
    if(!r.id||ids.has(r.id))throw new Error('COMMERCIAL_ORIGINAL_ID_INVALID');ids.add(r.id);
    if(await commercialSha256V3(r.body)!==r.sha256)throw new Error('COMMERCIAL_ORIGINAL_HASH_MISMATCH');
  }
  // Interpret only after ALL originals have passed authentication, not progressively.
  const events=copy.records.map(r=>normalize(copy.profile,r));
  if(!validCommercialScopeV3(copy.expectedScope))throw new Error('COMMERCIAL_EXPECTED_SCOPE_INVALID');
  if(events.some(e=>!commercialEqualV3(e.scope,copy.expectedScope)))throw new Error('COMMERCIAL_EXPECTED_SCOPE_MISMATCH');
  const evidence:CommercialEvidenceV3={version:COMMERCIAL_EVIDENCE_VERSION_V3,scope:copy.expectedScope,evaluatedAt:copy.evaluatedAt,events,
    provenance:{origin:'SYNTHETIC_ONLY',profile:copy.profile,manifestSha256,originalSha256s:copy.records.map(r=>r.sha256)}};
  const prepared=freezeDeep({evidence,assessment:validateCommercialEvidenceV3(evidence),authenticatedOriginals:copy.records});issued.add(prepared);return prepared;
}
