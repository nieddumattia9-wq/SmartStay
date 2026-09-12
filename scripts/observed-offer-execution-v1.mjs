// D-0052 front door: pure, no I/O, transport, custody or feedback dependency.
import {evaluateDiagnosticOfferRequirements} from './diagnostic-offer-requirements-v1.mjs';
import {assessReviewedIntentRequirements} from './reviewed-intent-input-assessment-v2.mjs';
import {sha256,json} from './diagnostic-transcription-review-v1.mjs';
import {reviewedScopedObservations,resolveScopedService,serviceCodes} from './diagnostic-scoped-signals-v1.mjs';
export const OBSERVED_EXECUTION_VERSION='stayopti.observed-offer-diagnostic@1.2';
const hash=x=>sha256(json(x));
const fail=c=>{throw Error('OBSERVED_EXECUTION_'+c);};
const copy=x=>structuredClone(x);
const same=(a,b)=>json(a)===json(b);
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const codes=['sleepingPlaces','capacity','childAdmission','exclusiveUse','privateBathroom'];

function fact(id,code,value,claim,unit=null,confidence=.95){
  return {id:id+':'+code,code,availability:value===null?'unknown':'known',value,unit,source:'derived',sourceProvider:null,
    sourceField:claim.links.map(l=>l.field).join('|')||null,confidence:value===null?0:confidence,severity:value===null?'warning':'information',
    missingReasonCode:value===null?claim.reason:null,capturedAt:claim.observedAt,
    derivedFromEvidenceIds:claim.links.flatMap(l=>l.evidence.map(e=>e.ref+':'+e.sha256))};
}
function sourceClaim(field){return {reason:field?.value.reason??'Reviewed source field unavailable',observedAt:null,
  links:field?[{field:field.key,evidence:field.value.evidenceRefs.map(ref=>({ref,sha256:'unresolved'}))}]:[]};}

// Preserve the entire observed clauses, source wrappers and property/offer scope.
// Service facts are resolved BEFORE scoring; privacy uses the shared evaluator.
function reviewedSignals(reviewed,r1,o){
  // Use the confirmed final values, not a stale initial packet after corrections.
  const a={fields:r1.originalMapping.filter(f=>f.alternativeId===o.alternativeId).map(f=>({key:f.field,value:f.value}))};
  const field=key=>a.fields.find(f=>f.key===key);
  const known=key=>field(key)?.value.status==='KNOWN'?field(key).value.value:null;
  const claim=key=>{const c=sourceClaim(field(key));for(const l of c.links)for(const e of l.evidence){
    const proof=reviewed.packet.proofs.find(p=>p.ref===e.ref);if(!proof)fail('SIGNAL_PROOF_MISSING');e.sha256=proof.sha256;}return c;};
  const evidence=[];
  const add=(code,key,convert,unit=null,confidence=.95)=>evidence.push(fact(o.alternativeId,code,convert(known(key)),claim(key),unit,confidence));
  add('review.count','reviewCount',v=>Number.isSafeInteger(v)&&v>=0?v:null,'reviews');
  add('property.stars','stars',v=>numeric(v)&&v<=5?v:null,'stars',.9);
  // Cancellation prose is preserved as prose; it is not a fabricated deadline,
  // fee, refundability boolean or a certified fully flexible tariff.
  add('offer.cancellation','cancellation',v=>typeof v==='string'?v:null);
  add('offer.refundable','refundable',v=>typeof v==='boolean'?v:null);
  const scopedObservations=reviewedScopedObservations(a.fields,reviewed.packet.proofs,{roomKey:o.scope.roomKey,rateKey:o.scope.rateKey});
  const serviceInterpretations=serviceCodes.map(code=>resolveScopedService(scopedObservations,code));
  const features=[]; // Raw text is never sent to the positive-substring category classifier.
  for(const s of serviceInterpretations){if(s.state==='ABSENT')continue;
    const f=fact(o.alternativeId,'feature.'+s.code,s.value,{reason:s.state,observedAt:null,links:s.selected.flatMap(x=>x.links)},null,.84);
    if(s.state==='CONFLICTING')f.availability='conflicting';evidence.push(f);
  }
  const category=typeof known('category')==='string'?known('category'):null;
  return {evidence,features,category,scopedObservations,serviceInterpretations,roomText:typeof known('roomName')==='string'?known('roomName'):null,
    provenance:{kind:'CONFIRMED_REVIEW_FIELDS',fields:copy(a.fields),unsupportedValuesRetained:true},observations:copy(a.fields)};
}

/** Reproject only already-validated requirement claims onto an existing
 * candidate. This computation helper does not validate an original review or
 * authorize an appendix; supported entry points must do both before calling it.
 * Protected facts are always regenerated, including their source/proof metadata.
 */
export function reprojectObservedRequirementCandidate(candidate,o,a,n){
  const total=a.price.completeTotalUsable?o.completeTotal.value:null;
  const normalizedRating=a.rating.normalizable?o.ratingObserved.value/o.ratingScale.value*10:null;
  const comparable=a.geography.state.startsWith('COMPARABLE_');
  const protectedCodes=['stay.cost.total','stay.cost.completeness','stay.currency','offer.bookable','offer.count','review.score','location.distance','location.coordinates'];
  const facts=candidate.facts.filter(f=>!protectedCodes.includes(f.code)).map(copy);
  facts.push(fact(o.alternativeId,'stay.cost.total',total,o.completeTotal,n.stay.currency),
    fact(o.alternativeId,'stay.cost.completeness',total===null?null:'reported-complete',o.completeTotal),
    fact(o.alternativeId,'stay.currency',n.stay.currency,o.completeTotal),
    fact(o.alternativeId,'offer.bookable',a.availability.bridgeBoolean,o.availability.bookability),
    fact(o.alternativeId,'offer.count',1,{...o.completeTotal,reason:'Exactly one explicitly bound rate in this candidate'}),
    fact(o.alternativeId,'review.score',normalizedRating,{...o.ratingObserved,links:[...o.ratingObserved.links,...o.ratingScale.links]},'0-10'),
    fact(o.alternativeId,'location.distance',comparable?o.distanceKm.value:null,o.distanceKm,'km'));
  if(new Set(facts.map(f=>f.code)).size!==facts.length)fail('DUPLICATE_EVIDENCE_CODE');
  return {...candidate,facts,privacyClaims:{privateBathroom:copy(o.privateBathroom),exclusiveUse:copy(o.exclusiveUse)},
    assessment:{availability:a.availability.state,accommodation:a.accommodation.status,recommendationBlockers:a.recommendationBlockers,
      privacyRequirements:{privateBathroom:n.party.requirements.privateBathroom,exclusiveUse:n.party.requirements.exclusiveUse},
      distanceState:a.geography.state,distanceKm:comparable?o.distanceKm.value:null,completeTotal:total,ratingOmitted:!a.rating.normalizable},
    observations:{requirements:copy(o),other:copy(candidate.observations.other)}};
}

/** Supported entry. A reviewed document ALWAYS runs the original-journal R1
 * verifier. A precomputed assessment/coverage supplied by a caller is ignored.
 * Preparation does not invoke a kernel, write a journal or certify eligibility. */
export function prepareObservedOfferDiagnostic(request){
  const n=request.normalization;
  let r1,assessment,query,coverage,signals;
  if(request.kind==='REVIEWED'){
    if(!request.reviewed)fail('REVIEWED_SOURCE_REQUIRED');
    r1=assessReviewedIntentRequirements(request.reviewed,n);
    assessment=r1.evaluation;coverage=r1.essentialRequirementCoverage.status;
    query={...r1.query,preferenceId:r1.query.preferenceId,preferenceSource:'manual',childAgesAtStay:copy(n.party.childAgesAtStay),
      capturedAt:n.evaluatedAt,destinationKey:'documented-reviewed-destination'};
    signals=n.offers.map(o=>({alternativeId:o.alternativeId,...reviewedSignals(request.reviewed,r1,o)}));
  }else if(request.kind==='SYNTHETIC'){
    if(n?.mode!=='SYNTHETIC'||request.reviewed||n?.reviewProjectionFingerprint)fail('SYNTHETIC_CANNOT_REPLACE_REVIEWED_ENTRY');
    assessment=evaluateDiagnosticOfferRequirements(n);
    const b=request.syntheticRequirementBasis;
    // Explicit synthetic scenario basis, independent from normalized flags.
    if(!b||codes.some(k=>typeof b[k]!=='boolean'||b[k]!==n.party.requirements[k]))fail('SYNTHETIC_ESSENTIAL_BASIS_MISMATCH');
    coverage='ESSENTIAL_COVERAGE_DEFINED';query=copy(request.syntheticQuery);signals=copy(request.syntheticSignals);
  }else fail('EXPLICIT_ENTRY_KIND_REQUIRED');
  const context=n.geography.contexts.find(c=>c.id===request.contextId);
  if(!context||!query||query.adults!==n.party.adults||query.children!==n.party.childAgesAtStay.length||
    query.rooms!==n.party.unitsRequested||!same(query.childAgesAtStay,n.party.childAgesAtStay)||query.currency!==n.stay.currency||
    query.checkIn!==n.stay.checkIn||query.checkOut!==n.stay.checkOut||query.nights!==(Date.parse(n.stay.checkOut)-Date.parse(n.stay.checkIn))/86400000||
    !numeric(query.totalBudget)||query.totalBudget===0||!['manual','automatic'].includes(query.preferenceSource))fail('QUERY_SCOPE');
  if(!Array.isArray(signals)||signals.length!==n.offers.length||new Set(signals.map(s=>s.alternativeId)).size!==n.offers.length)fail('SIGNAL_SET');
  const candidates=n.offers.map(o=>{
    const a=assessment.offers.find(a=>a.alternativeId===o.alternativeId),s=signals.find(s=>s.alternativeId===o.alternativeId);
    if(!s||!Array.isArray(s.evidence)||!Array.isArray(s.features))fail('SIGNAL_SCOPE');
    // Protected facts are recomputed from R1, not caller suggestions. No invented
    // tax value, taxesIncluded, coordinates, expiry, scope or default bookability.
    const candidate=reprojectObservedRequirementCandidate({alternativeId:o.alternativeId,roomKey:o.scope.roomKey,rateKey:o.scope.rateKey,
      facts:s.evidence,category:s.category,roomText:s.roomText,features:s.features,
      scopedObservations:s.scopedObservations??null,privacyClaims:null,serviceInterpretations:s.serviceInterpretations??[],
      assessment:null,observations:{requirements:null,other:s.observations},provenance:copy(s.provenance)},o,a,n);
    for(let i=0;request.kind==='SYNTHETIC'&&i<candidate.facts.length;i++){
      // Exact legacy evidence metadata can be retained in synthetic parity tests
      // only when its value and availability match the recomputed semantic fact.
      const replacement=candidate.facts[i];
      if(!['stay.cost.total','stay.cost.completeness','stay.currency','offer.bookable','offer.count','review.score','location.distance'].includes(replacement.code))continue;
      const previous=s.evidence.find(f=>f.code===replacement.code);
      if(previous&&same(previous.value,replacement.value)&&previous.availability===replacement.availability)candidate.facts[i]=copy(previous);
    }
    return candidate;
  });
  const input={version:OBSERVED_EXECUTION_VERSION,caseId:n.caseId,sourceFingerprint:hash({normalization:n,
    reviewedSource:r1?.sourceBinding??null,signals,query}),essentialCoverage:coverage,query,
    context:{id:context.id,kilometers:context.kilometers,semantics:context.semantics,reference:copy(n.geography.commonReference)},candidates};
  // Reviewed R2 feedback is not imported here. A distance exception requires a
  // separate explicit evidenced engine context; no exception inferred from R2.
  if(request.kind==='SYNTHETIC'&&request.distanceException)input.context.distanceException=copy(request.distanceException);
  return {input,r1Assessment:assessment,essentialCoverage:r1?.essentialRequirementCoverage??coverage,
    reviewedBinding:r1?{source:r1.sourceBinding,reviewConfirmed:r1.reviewConfirmed,humanReview:r1.humanReview,missingness:r1.missingness}:null,
    kind:request.kind,feedbackUsed:false,comparisonToHuman:'NOT_PERFORMED',goldenAdmission:false};
}

/** Kernel is an explicit compiled local module, never a remote/runtime service. */
export function executeObservedOfferDiagnostic(request,compute){
  const prepared=prepareObservedOfferDiagnostic(request),output=compute(prepared.input);
  if(output.version!==OBSERVED_EXECUTION_VERSION||output.candidates.length!==request.normalization.offers.length)fail('COMPUTATION_OUTPUT');
  return {input:prepared.input,output,r1Assessment:prepared.r1Assessment,essentialCoverage:prepared.essentialCoverage,
    reviewedBinding:prepared.reviewedBinding,kind:prepared.kind,feedbackUsed:prepared.feedbackUsed,
    comparisonToHuman:prepared.comparisonToHuman,goldenAdmission:prepared.goldenAdmission};
}
