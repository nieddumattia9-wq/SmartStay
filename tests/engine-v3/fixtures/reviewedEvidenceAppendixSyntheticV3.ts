import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {reviewedFixture} from './observedOfferRequirementsSyntheticV3';
import {computeObservedOfferDiagnosticV3} from '../../../src/engine-v3/evaluation/observedOfferDiagnosticV3';

// Entirely invented source statements. No private packet, screenshot or custody.
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(value:any,key:string)=>key.split('.').reduce((a,k)=>a[k],value);
export const APPENDIX_OBSERVED_AT='2099-09-01T12:01:00Z';
export const APPENDIX_EVALUATED_AT='2099-09-01T12:02:00Z';
export const APPENDIX_VALID_UNTIL='2099-09-01T12:10:00Z';
export async function appendixFixture(options:any={}){
 const f=await reviewedFixture({fields:{category:'Hotel',stars:4,reviewCount:360,
  roomName:'Private room with private bathroom',roomAmenities:'Camera privata; Bagno privato; WiFi; Aria condizionata',
  ...options.fields},...(options.needs?{needs:options.needs}:{})});
 for(const o of f.n.offers)for(const key of options.unknown??[]){Object.assign(at(o,key),{state:'UNKNOWN',value:null});}
 for(const o of f.n.offers)for(const [key,value]of Object.entries(options.normalizedClaims??{})){
  Object.assign(at(o,key),{state:'KNOWN',value});at(o,key).links[0].field=key;
 }
 if(options.unrepresented)for(const r of f.n.requirementMapping){r.needIndexes=[];f.n.party.requirements[r.key]=false;}
 const m=await load(pathToFileURL(join(process.cwd(),'scripts/reviewed-evidence-appendix-v1.mjs')).href);
 const original=await load(pathToFileURL(join(process.cwd(),'scripts/observed-offer-execution-v1.mjs')).href);
 const d=await load(pathToFileURL(join(process.cwd(),'scripts/diagnostic-transcription-review-v1.mjs')).href);
 const hash=(v:any)=>d.sha256(d.json(v));
 const request:any={kind:'REVIEWED',reviewed:f.args,normalization:f.n,contextId:'PREFERENCE'};
 const appendix:any={version:m.APPENDIX_VERSION,id:'SYNTHETIC_APPENDIX_001',classification:'DIAGNOSTIC_ONLY',
  base:m.createReviewedAppendixBinding(request),evaluatedAt:APPENDIX_EVALUATED_AT,proofs:[],integrations:[]};
 // Explicitly rebuilding these bindings is available only to construct adversarial
 // synthetic evidence. It is not a trust grant and never changes original review.
 const seal=(proof:any,content:any)=>{
  const serialized=d.json(content),bytes=Buffer.from(serialized,'utf8');
  proof.artifact.base64=bytes.toString('base64');proof.artifact.sha256=d.sha256(bytes);
  proof.transcription={content:serialized,sha256:d.sha256(serialized)};
  const body={version:m.POINT_REVIEW_VERSION,actorKind:'SYNTHETIC_TEST',actorId:'SYNTHETIC_POINT_REVIEWER',
   artifactSha256:proof.artifact.sha256,transcriptionSha256:proof.transcription.sha256,observationFingerprint:hash(content),
   method:'SOURCE_CONTENT_AND_EXACT_OFFER_SCOPE_CHECK',reviewedAt:APPENDIX_EVALUATED_AT,
   scopeBasis:'Invented source explicitly identifies this exact rate and party',meaningBasis:'Exact invented statement, not inferred from hash',
   limitations:'Synthetic test only; not independent source authentication or a real human review'};
  proof.pointReview={...body,receiptSha256:hash(body)};return proof;
 };
 const add=(field:string,statement:string,offerIndex=0,overrides:any={})=>{
  const offer=f.n.offers[offerIndex],prior=at(offer,field),id=overrides.id??'SYNTHETIC_INTEGRATION_'+(appendix.integrations.length+1);
  const temporal={relation:prior.state==='UNKNOWN'?'RESOLVE_UNKNOWN':'DOCUMENTED_SUCCESSOR',priorClaimSha256:hash(prior),retiredObservations:[],retiredAvailability:[],...overrides.temporal};
  const parsed=m.interpretAppendixStatement(field,statement,offer.scope.stay.currency);
  const integration={id,alternativeId:offer.alternativeId,field,proofId:id+'_PROOF',claim:{state:parsed.state,value:parsed.value,reason:'Explicit invented appendix statement'},temporal};
  const content={version:m.POINT_EVIDENCE_VERSION,scope:{alternativeId:offer.alternativeId,offerBindingFingerprint:offer.reviewedOfferBindingFingerprint,...structuredClone(offer.scope)},
   sourceRef:'SYNTHETIC_SOURCE_'+offerIndex,sourceKind:['completeTotal','availability.bookability','availability.unavailable'].includes(field)?'RATE_VERIFICATION_RECORD':'PROPERTY_DOCUMENT',
   observationId:'SYNTHETIC_RATE_OBSERVATION_'+offerIndex,observedAt:APPENDIX_OBSERVED_AT,timeSource:'SYNTHETIC_EXPLICIT_CLOCK',validUntil:APPENDIX_VALID_UNTIL,
   applicability:'OFFER_SCOPED',field,statement,continuity:{kind:'SAME_HISTORICAL_RATE',offerBindingFingerprint:offer.reviewedOfferBindingFingerprint,
    projectionFingerprint:appendix.base.projectionFingerprint,basis:'Invented exact room/rate/party continuation record'},temporal,
   ...(field==='ratingScale'?{ratingObservationBinding:{claimSha256:hash(offer.ratingObserved),observedValue:offer.ratingObserved.value,
    relation:'SCALE_OF_THIS_PUBLISHED_OBSERVATION',basis:'Synthetic source explicitly identifies the scale of this retained published rating'}}:{}),...overrides.content};
  const proof=seal({id:integration.proofId,artifact:{ref:integration.proofId,mediaType:'application/json'}},content);
  appendix.integrations.push(integration);appendix.proofs.push(proof);return {integration,proof,content};
 };
 const financial=(offerIndex=0,bundled=true)=>{
  // Retain the historical synthetic control's own offer cost, not a price
  // chosen to manufacture agreement or a new budget/profile.
  const total=f.x.b.search.hotels[offerIndex].offers[0].totalKnownCost!;
  const cost=add('completeTotal',`Complete stay cost: base ${(total-30).toFixed(2)} EUR + mandatory taxes 20.00 + mandatory fees 10.00 = ${total.toFixed(2)}; all mandatory charges quantified`,offerIndex);
  const booking=add('availability.bookability','Selected rate verification: bookable',offerIndex);
  if(bundled){
   const {field,statement,temporal,...content}=cost.content;
   const combined={...content,entries:[{field,statement,temporal},{field:booking.content.field,statement:booking.content.statement,temporal:booking.content.temporal}]};
   booking.integration.proofId=cost.proof.id;
   appendix.proofs=appendix.proofs.filter((p:any)=>p.id!==booking.proof.id);
   seal(cost.proof,combined);
  }
 };
 const complete=()=>{for(let i=0;i<f.n.offers.length;i++){financial(i);add('ratingScale','Rating scale: 0-10',i);}return appendix;};
 const run=(compute:any=computeObservedOfferDiagnosticV3)=>m.executeReviewedEvidenceAppendix(request,appendix,compute);
 return {...f,m,original,d,hash,request,appendix,add,seal,financial,complete,run,baseRun:()=>original.executeObservedOfferDiagnostic(request,computeObservedOfferDiagnosticV3)};
}
