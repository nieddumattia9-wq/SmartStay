// D-0054. Pure evaluation-only successor. No filesystem, transport or custody.
import {prepareObservedOfferDiagnostic,reprojectObservedRequirementCandidate,OBSERVED_EXECUTION_VERSION} from './observed-offer-execution-v1.mjs';
import {evaluateDiagnosticOfferRequirements,validateDiagnosticOfferRequirements,normalizeItalianBedInventory} from './diagnostic-offer-requirements-v1.mjs';
import {normalizedCount,childFacts} from './reviewed-intent-input-assessment-v2.mjs';
import {interpretScopedValue} from './diagnostic-scoped-signals-v1.mjs';
import {sha256,json} from './diagnostic-transcription-review-v1.mjs';

export const APPENDIX_VERSION='stayopti.reviewed-evidence-appendix@1.1';
export const POINT_EVIDENCE_VERSION='stayopti.appendix-point-evidence@1';
export const POINT_REVIEW_VERSION='stayopti.appendix-point-review@1';
const hash=x=>sha256(json(x)),copy=x=>structuredClone(x),same=(a,b)=>json(a)===json(b);
const fail=code=>{throw Error('APPENDIX_'+code);};
const text=x=>typeof x==='string'&&x.trim().length>0;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const utc=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19);
const fields=['completeTotal','availability.bookability','availability.unavailable','unitsOffered','internalRooms','capacityGuests','sleeping',
 'privateBathroom','exclusiveUse','children.admitted','children.minimumAge','children.adultPricingFromAge','children.extraBedsAvailable','ratingScale'];
const financial=field=>['completeTotal','availability.bookability','availability.unavailable'].includes(field);
const at=(object,key)=>key.split('.').reduce((o,k)=>o[k],object);
const put=(object,key,value)=>{const ks=key.split('.');const leaf=ks.pop();ks.reduce((o,k)=>o[k],object)[leaf]=value;};
const uncertainty=(old,reason,state='UNKNOWN')=>({...copy(old),state,value:null,reason});
const sorted=x=>[...x].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);

function binding(request,prepared){
 return {caseId:request.normalization.caseId,packetHash:hash(request.reviewed.packet),journalHash:hash(request.reviewed.events),
  eventCount:request.reviewed.events.length,source:copy(prepared.reviewedBinding.source),
  projectionFingerprint:request.normalization.reviewProjectionFingerprint,normalizationFingerprint:hash(request.normalization),
  offers:request.normalization.offers.map(o=>({alternativeId:o.alternativeId,offerBindingFingerprint:o.reviewedOfferBindingFingerprint,scope:copy(o.scope)}))
   .sort((a,b)=>a.alternativeId<b.alternativeId?-1:a.alternativeId>b.alternativeId?1:0)};
}
function prepareBase(request){
 if(request?.kind!=='REVIEWED'||!request.reviewed)fail('ORIGINAL_REVIEWED_ENTRY_REQUIRED');
 // Executes the unchanged original journal, transformations, scope and R1 need checks.
 return prepareObservedOfferDiagnostic(request);
}
export function createReviewedAppendixBinding(request){return binding(request,prepareBase(request));}

/** Bounded, complete-statement decoders. No positive substring shortcuts and no
 * general language interpretation. These decode evidence, not caller claims. */
export function interpretAppendixStatement(field,statement,currency){
 const s=typeof statement==='string'?statement.trim():'';
 if(!fields.includes(field))fail('FIELD_NOT_SUPPORTED');
 if(!s||/^unknown$/i.test(s))return {state:'UNKNOWN',value:null,reason:'EXPLICIT_UNKNOWN_OR_EMPTY_STATEMENT',
  qualifiesFact:Boolean(s)&&['privateBathroom','exclusiveUse'].includes(field)};
 const known=value=>({state:'KNOWN',value,reason:'BOUNDED_SOURCE_MEANING_VERIFIED'});
 if(field==='completeTotal'){
  const m=/^Complete stay cost: base (\d+\.\d{2}) ([A-Z]{3}) \+ mandatory taxes (\d+\.\d{2}) \+ mandatory fees (\d+\.\d{2}) = (\d+\.\d{2}); all mandatory charges quantified$/.exec(s);
  if(m){const minor=v=>Number(v.replace('.',''));const [base,taxes,fees,total]=[m[1],m[3],m[4],m[5]].map(minor);
   if(m[2]!==currency||![base,taxes,fees,total].every(Number.isSafeInteger)||base+taxes+fees!==total)fail('COST_COMPONENTS_OR_CURRENCY');
   return {...known(total/100),components:{baseMinor:base,taxesMinor:taxes,feesMinor:fees,totalMinor:total,currency}};}
 }else if(field==='availability.bookability'){
  if(s==='Selected rate verification: bookable')return known(true);
  if(s==='Selected rate verification: not bookable')return known(false);
 }else if(field==='availability.unavailable'){
  if(s==='Selected rate verification: unavailable')return known(true);
 }else if(['unitsOffered','internalRooms','capacityGuests'].includes(field)){
  const value=normalizedCount(s,field==='unitsOffered'?'units':field==='internalRooms'?'internal':'capacity');
  if(value!==null)return known(value);
 }else if(field==='sleeping'){
  const original=normalizeItalianBedInventory(s);if(original)return known(original);
  // Additional bounded explicit places grammar; sofa/bunk words alone NEVER
  // determine places. Quantities cover the complete offer, not each room/unit.
  const m=/^Complete sleeping inventory: (.+)$/.exec(s);
  if(m){const beds=[];for(const clause of m[1].split('; ')){
   const b=/^(SINGLE|DOUBLE|SOFA|BUNK|OTHER) count (\d+) places each (\d+|UNKNOWN)$/.exec(clause);if(!b)return {state:'UNKNOWN',value:null,reason:'STATEMENT_GRAMMAR_UNSUPPORTED'};
   const count=Number(b[2]),places=b[3]==='UNKNOWN'?null:Number(b[3]);
   if(!Number.isSafeInteger(count)||count<1||places!==null&&(!Number.isSafeInteger(places)||places<1))fail('SLEEPING_INVENTORY');
   beds.push({kind:b[1],count,placesPerBed:places,placeBasis:places===null?'PLACES_UNDOCUMENTED_NO_MULTIPLIER':'EXPLICIT_SOURCE_PLACES_NOT_INFERRED'});
  }return known({complete:true,beds});}
 }else if(['privateBathroom','exclusiveUse'].includes(field)){
  const parsed=interpretScopedValue(s,field==='privateBathroom'?'private-bathroom':'exclusive-use');
  if(parsed.state==='POSITIVE')return known(true);if(parsed.state==='NEGATIVE')return known(false);
  if(parsed.state==='CONFLICTING')return {state:'CONFLICTING',value:null,reason:'SOURCE_STATEMENT_CONFLICT'};
  if(parsed.mentioned&&parsed.state==='UNKNOWN')return {state:'UNKNOWN',value:null,reason:'PRIVACY_CONDITIONAL_OR_UNRESOLVED',qualifiesFact:true};
 }else if(field.startsWith('children.')){
  const parsed=childFacts(s),value=parsed?.[field.split('.')[1]];if(value!==null&&value!==undefined)return known(value);
 }else if(field==='ratingScale'){
  const m=/^Rating scale: 0-(\d+(?:\.\d+)?)$/.exec(s);if(m&&Number(m[1])>0&&Number.isFinite(Number(m[1])))return known(Number(m[1]));
 }
 return {state:'UNKNOWN',value:null,reason:'STATEMENT_GRAMMAR_UNSUPPORTED_OR_CONDITIONAL'};
}

function verifyProof(proof,request,appendix,offer,integration){
 const a=proof?.artifact,t=proof?.transcription,r=proof?.pointReview;
 if(!text(proof?.id)||!a||!text(a.ref)||!text(a.mediaType)||!text(a.base64)||!digest(a.sha256))fail('PROOF_SCHEMA');
 const bytes=Buffer.from(a.base64,'base64');
 if(bytes.toString('base64')!==a.base64||!bytes.length||sha256(bytes)!==a.sha256)fail('PROOF_BYTES_HASH');
 if(!t||!text(t.content)||!digest(t.sha256)||sha256(t.content)!==t.sha256)fail('TRANSCRIPTION_HASH');
 // A machine-readable source must be the very bytes being interpreted. A
 // separately transcribed visual proof instead requires an explicitly named
 // point-transcription review (never silently treated as a raw source copy).
 if(['application/json','text/plain'].includes(a.mediaType)){
  if(bytes.toString('utf8')!==t.content)fail('TRANSCRIPTION_DIFFERS_FROM_MACHINE_READABLE_SOURCE');
 }else if(t.method!=='POINT_TRANSCRIPTION_OF_VISUAL_SOURCE'||!text(t.sourceRegion))fail('VISUAL_SOURCE_POINT_TRANSCRIPTION_REQUIRED');
 let content;try{content=JSON.parse(t.content);}catch{fail('POINT_EVIDENCE_JSON');}
 const expectedScope={alternativeId:offer.alternativeId,offerBindingFingerprint:offer.reviewedOfferBindingFingerprint,...offer.scope};
 if(content.version!==POINT_EVIDENCE_VERSION||!same(content.scope,expectedScope))fail('ROOM_RATE_STAY_PARTY_CURRENCY_SCOPE');
 if(!text(content.sourceRef)||!['PUBLIC_OBSERVATION','RATE_VERIFICATION_RECORD','PROPERTY_DOCUMENT'].includes(content.sourceKind)||
  !text(content.observationId)||!utc(content.observedAt)||!text(content.timeSource)||Date.parse(content.observedAt)>Date.parse(appendix.evaluatedAt)||
  content.validUntil!==null&&(!utc(content.validUntil)||Date.parse(content.validUntil)<Date.parse(content.observedAt)))fail('OBSERVATION_TIME_OR_SOURCE');
 const entries=content.entries??[{field:content.field,statement:content.statement,temporal:content.temporal}];
 if(!Array.isArray(entries)||!entries.length||new Set(entries.map(e=>e.field)).size!==entries.length||
  entries.some(e=>!fields.includes(e.field)||!text(e.statement)))fail('POINT_EVIDENCE_FIELD');
 if(entries.some(e=>Object.keys(e).some(k=>!['field','statement','temporal'].includes(k))))fail('POINT_ENTRY_METADATA_OVERRIDE');
 const selected=entries.find(e=>e.field===integration.field);
 if(!['OFFER_SCOPED','PROPERTY_WIDE','UNVERIFIED'].includes(content.applicability)||!selected)fail('POINT_EVIDENCE_FIELD');
 const continuity=content.continuity;
 if(!continuity||continuity.kind!=='SAME_HISTORICAL_RATE'||continuity.offerBindingFingerprint!==offer.reviewedOfferBindingFingerprint||
  continuity.projectionFingerprint!==appendix.base.projectionFingerprint||!text(continuity.basis))fail('HISTORICAL_RATE_CONTINUITY_UNPROVEN');
 // A point review is a new, separately recorded source/scope verification, not
 // the old blanket transcription confirmation or an independent authenticator.
 const synthetic=request.reviewed.packet.mode==='SYNTHETIC_TEST';
 if(!r||r.version!==POINT_REVIEW_VERSION||r.actorKind!==(synthetic?'SYNTHETIC_TEST':'HUMAN')||!text(r.actorId)||
  r.artifactSha256!==a.sha256||r.transcriptionSha256!==t.sha256||r.observationFingerprint!==hash(content)||
  r.method!=='SOURCE_CONTENT_AND_EXACT_OFFER_SCOPE_CHECK'||!utc(r.reviewedAt)||Date.parse(r.reviewedAt)<Date.parse(content.observedAt)||
  Date.parse(r.reviewedAt)>Date.parse(appendix.evaluatedAt)||!text(r.scopeBasis)||!text(r.meaningBasis)||!text(r.limitations))fail('POINT_REVIEW_BINDING_OR_PENDING');
 const {receiptSha256,...body}=r;if(receiptSha256!==hash(body))fail('POINT_REVIEW_HASH');
 if(!same(selected.temporal,integration.temporal))fail('TEMPORAL_RELATION_NOT_IN_REVIEWED_EVIDENCE');
 const parsed=interpretAppendixStatement(integration.field,selected.statement,offer.scope.stay.currency);
 if(!integration.claim||!same({state:integration.claim.state,value:integration.claim.value},{state:parsed.state,value:parsed.value})||!text(integration.claim.reason))fail('SEMANTIC_TRANSFORMATION_MISMATCH');
 if(content.applicability!=='OFFER_SCOPED'&&!(integration.field==='ratingScale'&&content.applicability==='PROPERTY_WIDE'))fail('FIELD_APPLICABILITY_UNSUPPORTED');
 if(integration.field==='ratingScale'){
  const b=content.ratingObservationBinding;
  if(!b||b.claimSha256!==hash(offer.ratingObserved)||!same(b.observedValue,offer.ratingObserved.value)||
   b.relation!=='SCALE_OF_THIS_PUBLISHED_OBSERVATION'||!text(b.basis))fail('RATING_OBSERVATION_SOURCE_BINDING');
 }
 if(financial(integration.field)&&content.sourceKind!=='RATE_VERIFICATION_RECORD')fail('PUBLIC_OR_GENERIC_PROOF_NOT_RATE_CERTIFICATION');
 // Consume exactly the source/scope/time metadata that was validated above.
 // Entries can supply a fact and its prior relationship, not shadow authority.
 return {content:{...content,field:selected.field,statement:selected.statement,temporal:selected.temporal},parsed,receiptSha256,a,t};
}

function verifyTemporal(v,integration,old,candidate,appendix){
 const rel=integration.temporal;
 if(!rel||!['RESOLVE_UNKNOWN','CORROBORATE_SAME_CONTEXT','DOCUMENTED_SUCCESSOR'].includes(rel.relation)||rel.priorClaimSha256!==hash(old)||
  !Array.isArray(rel.retiredObservations)||!Array.isArray(rel.retiredAvailability))fail('TEMPORAL_PRIOR_BINDING');
 if(rel.relation==='RESOLVE_UNKNOWN'&&old.state!=='UNKNOWN')fail('UNKNOWN_RESOLUTION_REQUIRES_UNKNOWN');
 if(rel.relation==='CORROBORATE_SAME_CONTEXT'&&old.observedAt!==v.content.observedAt)fail('SAME_CONTEXT_TIME_MISMATCH');
 if(rel.relation==='DOCUMENTED_SUCCESSOR'&&(!old.observedAt||Date.parse(v.content.observedAt)<=Date.parse(old.observedAt)))fail('SUCCESSOR_TIME_UNPROVEN');
 // Retirement is fine grained, never a whole amenities/service string. A
 // separate new source cannot erase a same-context negative/conditional clause.
 for(const ref of rel.retiredObservations){
  if(!['privateBathroom','exclusiveUse'].includes(integration.field)||ref.sourceField!==integration.field)fail('RETIREMENT_WOULD_DROP_OTHER_FACTS');
  const record=candidate.scopedObservations?.find(x=>x.sourceField===ref.sourceField);
  if(!record||hash(record)!==ref.sha256)fail('RETIRED_OBSERVATION_BINDING');
  if(record.original.status!=='UNKNOWN')fail('KNOWN_PRIVACY_OBSERVATION_CANNOT_BE_SILENTLY_RETIRED');
 }
 for(const ref of rel.retiredAvailability){
  if(!integration.field.startsWith('availability.')||rel.relation!=='DOCUMENTED_SUCCESSOR'||
   !['availability.observed','availability.bookability','availability.unavailable'].includes(ref.field))fail('AVAILABILITY_RETIREMENT_SCOPE');
  const claim=at(candidate.observations.requirements,ref.field);
  if(hash(claim)!==ref.sha256||!claim.observedAt||Date.parse(claim.observedAt)>=Date.parse(v.content.observedAt))fail('AVAILABILITY_RETIREMENT_BINDING');
 }
 if(new Set(rel.retiredObservations.map(x=>x.sourceField)).size!==rel.retiredObservations.length||
  new Set(rel.retiredAvailability.map(x=>x.field)).size!==rel.retiredAvailability.length)fail('DUPLICATE_RETIREMENT');
 // An explicit source limit applies to every fact, including static facts.
 // Only financial facts require a limit; do not invent a lifetime for others.
 if(v.content.validUntil!==null&&Date.parse(v.content.validUntil)<Date.parse(appendix.evaluatedAt))
  return {status:'INSUFFICIENT',reason:'SOURCE_VALIDITY_EXPIRED'};
 if(financial(integration.field)&&v.content.validUntil===null)
  return {status:'INSUFFICIENT',reason:'VALIDITY_INTERVAL_UNDOCUMENTED'};
 return null;
}

function materializeClaim(old,integration,v){
 return {...copy(old),state:v.parsed.state,value:copy(v.parsed.value),reason:integration.claim.reason,
  applicability:v.content.applicability,observedAt:v.content.observedAt,timeSource:v.content.timeSource,
  links:[{field:'appendix/'+integration.field,evidence:[{ref:integration.proofId,sha256:v.a.sha256}]}],
  ...(v.content.applicability==='PROPERTY_WIDE'?{propertyBinding:{alternativeId:v.content.scope.alternativeId,scope:copy(old.scope),
   reason:v.content.continuity.basis,links:[{field:'appendix/point-review',evidence:[{ref:integration.proofId,sha256:v.receiptSha256}]}]}}:{})};
}

// Each entry in this bounded proof format shares the exact offer, source and
// observation scope. Selection must cover the document, not just favorable
// facts. Byte/meaning/temporal checks still run below for every selected member.
// This inspection grants no authority to the unverified JSON being inspected.
function completeProofSelections(appendix){
 const groups=[];
 for(const proof of appendix.proofs){
  let content;try{content=JSON.parse(proof?.transcription?.content);}catch{continue;}
  if(!Array.isArray(content?.entries)||content.entries.length<2)continue;
  const selected=appendix.integrations.filter(i=>i.proofId===proof.id);
  if(content.entries.some(e=>!selected.some(i=>i.field===e.field&&i.alternativeId===content.scope?.alternativeId))||
   selected.some(i=>i.alternativeId!==content.scope?.alternativeId))fail('MULTI_ENTRY_SELECTION_INCOMPLETE');
  groups.push(selected.map(i=>i.id));
 }
 return groups;
}

/** The public successor accepts ONLY an immutable REVIEWED request. Original
 * source validation precedes every appendix operation, including the empty case. */
export function executeReviewedEvidenceAppendix(request,appendix,compute){
 const base=prepareBase(request),expected=binding(request,base);
 if(!appendix||appendix.version!==APPENDIX_VERSION||appendix.classification!=='DIAGNOSTIC_ONLY'||!text(appendix.id)||
  !same(appendix.base,expected)||!utc(appendix.evaluatedAt)||Date.parse(appendix.evaluatedAt)<Date.parse(request.normalization.evaluatedAt)||
  !Array.isArray(appendix.integrations)||!Array.isArray(appendix.proofs)||
  new Set(appendix.integrations.map(i=>i.id)).size!==appendix.integrations.length||new Set(appendix.proofs.map(p=>p.id)).size!==appendix.proofs.length)fail('BASE_OR_SCHEMA_BINDING');
 if(appendix.proofs.some(p=>!appendix.integrations.some(i=>i.proofId===p.id)))fail('UNREFERENCED_PROOF');
 const proofSelections=completeProofSelections(appendix);
 const n=copy(request.normalization),input=copy(base.input),records=[];n.evaluatedAt=appendix.evaluatedAt;
 const active=new Map();
 for(const integration of sorted(appendix.integrations)){
  const record={id:integration.id,alternativeId:integration.alternativeId,field:integration.field,status:'REJECTED',reason:null};
  records.push(record);
  try{
   if(!text(integration.id)||!fields.includes(integration.field))fail('FIELD_NOT_SUPPORTED');
   const offer=request.normalization.offers.find(o=>o.alternativeId===integration.alternativeId);
   if(!offer)fail('ALTERNATIVE_NOT_IN_REVIEWED_BASE');
   const candidate=base.input.candidates.find(c=>c.alternativeId===offer.alternativeId),old=at(offer,integration.field);
   const proof=appendix.proofs.find(p=>p.id===integration.proofId);if(!proof)fail('PROOF_NOT_FOUND');
   const v=verifyProof(proof,request,appendix,offer,integration),temporal=verifyTemporal(v,integration,old,candidate,appendix);
   Object.assign(record,{originalClaimSha256:hash(old),proofSha256:v.a.sha256,transcriptionSha256:v.t.sha256,pointReviewSha256:v.receiptSha256,
    observationId:v.content.observationId,observedAt:v.content.observedAt,interpretation:copy(v.parsed)});
   if(temporal){Object.assign(record,temporal);continue;}
   if(v.parsed.state==='UNKNOWN'&&!v.parsed.qualifiesFact){Object.assign(record,{status:'INSUFFICIENT',reason:v.parsed.reason});continue;}
   const claim=materializeClaim(old,integration,v),key=offer.alternativeId+'/'+integration.field;
   const check=copy(request.normalization);check.evaluatedAt=appendix.evaluatedAt;
   put(check.offers.find(o=>o.alternativeId===offer.alternativeId),integration.field,claim);
   try{validateDiagnosticOfferRequirements(check);}catch{fail('NORMALIZED_VALUE_INCOMPATIBLE_WITH_REQUIREMENTS_CONTRACT');}
   record.status='VALIDATED'; // Internal only; finalized by fact resolution below.
   if(!active.has(key))active.set(key,[]);active.get(key).push({record,integration,v,claim,old,candidate});
  }catch(error){record.reason=String(error.message).startsWith('APPENDIX_')?error.message:'APPENDIX_INVALID_EVIDENCE_STRUCTURE';}
 }
 // Nominal coverage with a forged/invalid negative member is not complete
 // validation. Reject the request before any projection or policy execution;
 // never apply the favorable subset of a multi-entry document.
 if(proofSelections.some(ids=>records.some(r=>ids.includes(r.id)&&r.status==='REJECTED')))
  fail('MULTI_ENTRY_VALIDATION_FAILED');
 const consumed=[],temporalGaps=[];
 for(const entries of active.values()){
  const first=entries[0],{integration,old}=first,o=n.offers.find(x=>x.alternativeId===integration.alternativeId);
  let claim=copy(first.claim);
  // Multiple assertions for one fact must actually agree on time/validity and
  // meaning. List order/id is never a latest-wins authority.
  const incompatible=entries.some(e=>!same(e.claim.value,claim.value)||e.claim.state!==claim.state||e.claim.observedAt!==claim.observedAt||
   e.v.content.validUntil!==first.v.content.validUntil||e.v.content.observationId!==first.v.content.observationId||
   e.v.content.sourceRef!==first.v.content.sourceRef||financial(integration.field)&&e.v.a.sha256!==first.v.a.sha256||
   !same(e.integration.temporal,integration.temporal));
  const oldConflict=integration.temporal.relation==='CORROBORATE_SAME_CONTEXT'&&old.state!=='UNKNOWN'&&
   (old.state==='CONFLICTING'||claim.state!==old.state||!same(claim.value,old.value));
  if(incompatible||oldConflict)claim=uncertainty(claim,incompatible?'APPENDIX_FACTS_OR_TIMES_CONFLICT':'SAME_CONTEXT_FACT_CONFLICT','CONFLICTING');
  claim.links=entries.flatMap(e=>e.claim.links);
  put(o,integration.field,claim);
  const candidate=input.candidates.find(c=>c.alternativeId===o.alternativeId);
  // Only valid nonconflicting transitions may retire previous active facts.
  if(claim.state!=='CONFLICTING'){
   for(const ref of integration.temporal.retiredAvailability){
    // A retirement targets only the immutable baseline, never another appendix
    // fact (which might document a real simultaneous contradiction).
    if(!active.has(o.alternativeId+'/'+ref.field))put(o,ref.field,uncertainty(at(o,ref.field),'HISTORICAL_AVAILABILITY_SUPERSEDED_IN_ACTIVE_VIEW'));
   }
   for(const ref of integration.temporal.retiredObservations)candidate.scopedObservations=candidate.scopedObservations.filter(r=>r.sourceField!==ref.sourceField);
  }
  if(['privateBathroom','exclusiveUse'].includes(integration.field)&&claim.state==='UNKNOWN'){
   candidate.scopedObservations.push({sourceField:integration.field,scope:'OFFER',offerScope:copy(claim.scope),
    original:{status:'UNKNOWN',value:null,reason:claim.reason,reliability:'UNKNOWN',evidenceRefs:entries.map(e=>e.integration.proofId)},
    links:copy(claim.links),structuredPrivacy:{state:'UNKNOWN'}});
  }
  for(const e of entries){e.record.status=claim.state==='CONFLICTING'?'CONFLICTING':claim.state==='UNKNOWN'?'INSUFFICIENT':'APPLIED';e.record.reason=claim.reason;}
  consumed.push({alternativeId:o.alternativeId,field:integration.field,claim:copy(claim),proofIds:entries.map(e=>e.integration.proofId),
   observationId:first.v.content.observationId,sourceRef:first.v.content.sourceRef,sourceArtifactSha256:first.v.a.sha256,
   validUntil:first.v.content.validUntil,retired:copy(integration.temporal)});
 }
 // No invented temporal tolerance: both usable financial facts need explicit
 // intervals covering this evaluation and matching bound-rate observation time.
 // Different observation times are not fused just because an arbitrary ID agrees.
 for(const o of n.offers){
  const price=consumed.find(c=>c.alternativeId===o.alternativeId&&c.field==='completeTotal'),
   booking=consumed.find(c=>c.alternativeId===o.alternativeId&&c.field==='availability.bookability');
  if((price||booking)&&o.completeTotal.state==='KNOWN'&&o.availability.bookability.state==='KNOWN'&&o.availability.bookability.value===true&&
   (!price||!booking||price.claim.observedAt!==booking.claim.observedAt||price.observationId!==booking.observationId||
    price.sourceArtifactSha256!==booking.sourceArtifactSha256||price.sourceRef!==booking.sourceRef)){
   o.availability.bookability=uncertainty(o.availability.bookability,'PRICE_BOOKABILITY_TEMPORAL_LINK_UNPROVEN');
   temporalGaps.push({alternativeId:o.alternativeId,reason:'PRICE_BOOKABILITY_TEMPORAL_LINK_UNPROVEN'});
   for(const r of records.filter(r=>r.alternativeId===o.alternativeId&&r.field==='availability.bookability'&&r.status==='APPLIED'))
    Object.assign(r,{status:'INSUFFICIENT',reason:'PRICE_BOOKABILITY_TEMPORAL_LINK_UNPROVEN'});
  }
 }
 const evaluation=evaluateDiagnosticOfferRequirements(n);
 for(const fact of consumed){const effective=at(n.offers.find(o=>o.alternativeId===fact.alternativeId),fact.field);
  fact.activeClaim=copy(effective);fact.consumedAsKnownFact=effective.state==='KNOWN';}
 if(consumed.length){
  input.query.capturedAt=appendix.evaluatedAt; // evaluation clock only; historical claim times untouched
  input.candidates=input.candidates.map(c=>{
   const o=n.offers.find(x=>x.alternativeId===c.alternativeId),a=evaluation.offers.find(x=>x.alternativeId===c.alternativeId);
   if(base.input.essentialCoverage!=='ESSENTIAL_COVERAGE_DEFINED'){
    if(a.accommodation.status==='SATISFIED')a.accommodation.status='INSUFFICIENT_INFORMATION';
    a.recommendationBlockers.push('ESSENTIAL_NEED_NOT_REPRESENTABLE');
   }
   const projected=reprojectObservedRequirementCandidate(c,o,a,n);
   projected.observations={historical:copy(c.observations),integratedRequirements:copy(o)};
   projected.provenance={historical:copy(c.provenance),appendixId:appendix.id,base:copy(expected),
    consumedFacts:consumed.filter(f=>f.alternativeId===c.alternativeId),integrations:records.filter(r=>r.alternativeId===c.alternativeId)};
   return projected;
  });
  input.sourceFingerprint=hash({base:base.input.sourceFingerprint,version:APPENDIX_VERSION,appendix:canonicalAppendix(appendix),evaluation});
 }
 const output=compute(input);
 if(output.version!==OBSERVED_EXECUTION_VERSION||output.candidates.length!==n.offers.length)fail('COMPUTATION_OUTPUT');
 return {version:APPENDIX_VERSION,classification:'DIAGNOSTIC_ONLY',base:{...base,normalization:copy(request.normalization)},
  appendixFingerprint:hash(canonicalAppendix(appendix)),integratedProjectionFingerprint:hash(input),input,output,
  integratedRequirements:n,requirementsEvaluation:evaluation,integrations:records,consumedFacts:consumed,temporalGaps,
  originalReviewUnchanged:true,newGeneralReviewCreated:false,pointReviewsIndependentOfOriginalReview:true,
  independentSourceAuthentication:false,feedbackUsed:false,humanComparisonPerformed:false,goldenAdmission:false,fullRobustness:'NOT_EXECUTED'};
}
function canonicalAppendix(a){return {...copy(a),integrations:sorted(a.integrations),proofs:sorted(a.proofs)};}
