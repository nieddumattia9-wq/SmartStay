// D-0052 front door: pure, no I/O, transport, custody or feedback dependency.
import {evaluateDiagnosticOfferRequirements} from './diagnostic-offer-requirements-v1.mjs';
import {assessReviewedIntentRequirements} from './reviewed-intent-input-assessment-v2.mjs';
import {sha256,json} from './diagnostic-transcription-review-v1.mjs';
export const OBSERVED_EXECUTION_VERSION='stayopti.observed-offer-diagnostic@1';
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

// Candidate source wrappers remain intact. Only bounded numeric values and exact
// affirmative feature-list tokens are normalized. Unsupported prose is retained.
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
  const aliases=new Map([['wifi','WiFi'],['wi-fi','WiFi'],['wifi gratis','WiFi'],['aria condizionata','Air conditioning'],['air conditioning','Air conditioning'],
    ['bagno privato','Private bathroom'],['private bathroom','Private bathroom'],['ascensore','Elevator'],['elevator','Elevator'],
    ['cucina','Kitchen'],['kitchen','Kitchen'],['riscaldamento','Heating'],['heating','Heating'],['reception','Reception'],
    ['suite privata','Private room'],['camera privata','Private room'],['bagno in camera','Private bathroom'],
    ['insonorizzazione','Soundproofing'],['scrivania','Desk'],['dormitorio condiviso','Shared dormitory']]);
  const featureCodes=new Map([['WiFi','wifi'],['Air conditioning','air-conditioning'],['Private bathroom','private-bathroom'],
    ['Elevator','elevator'],['Kitchen','kitchen'],['Heating','heating'],['Reception','reception'],['Soundproofing','soundproofing'],['Desk','desk']]);
  const features=[];
  for(const key of ['amenities','roomAmenities','services','roomServices']){
    const v=known(key),tokens=Array.isArray(v)?v:typeof v==='string'?v.split(/[;,\n|]+/):[];
    for(const token of tokens){if(typeof token!=='string')continue;const normalized=aliases.get(token.trim().toLowerCase());
      if(normalized&&!features.includes(normalized)){features.push(normalized);const code=featureCodes.get(normalized);
        evidence.push(fact(o.alternativeId,code?'feature.'+code:'observation.'+normalized.replaceAll(' ','-').toLowerCase(),true,claim(key),null,.84));}}
  }
  const category=typeof known('category')==='string'?known('category'):null;
  return {evidence,features,category,roomText:typeof known('roomName')==='string'?known('roomName'):null,
    provenance:{kind:'CONFIRMED_REVIEW_FIELDS',fields:copy(a.fields),unsupportedValuesRetained:true},observations:copy(a.fields)};
}

/** Supported entry. A reviewed document ALWAYS runs the original-journal R1
 * verifier. A precomputed assessment/coverage supplied by a caller is ignored.
 * Kernel is an explicit compiled local module, never a remote/runtime service. */
export function executeObservedOfferDiagnostic(request,compute){
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
    const total=a.price.completeTotalUsable?o.completeTotal.value:null;
    const normalizedRating=a.rating.normalizable?o.ratingObserved.value/o.ratingScale.value*10:null;
    const comparable=a.geography.state.startsWith('COMPARABLE_');
    const protectedCodes=['stay.cost.total','stay.cost.completeness','stay.currency','offer.bookable','offer.count','review.score','location.distance','location.coordinates'];
    // Protected facts are recomputed from R1, not caller suggestions. No invented
    // tax value, taxesIncluded, coordinates, expiry, scope or default bookability.
    const facts=s.evidence.filter(f=>!protectedCodes.includes(f.code)).map(copy);
    const replacements=[fact(o.alternativeId,'stay.cost.total',total,o.completeTotal,n.stay.currency),
      fact(o.alternativeId,'stay.cost.completeness',total===null?null:'reported-complete',o.completeTotal),
      fact(o.alternativeId,'stay.currency',n.stay.currency,o.completeTotal),
      fact(o.alternativeId,'offer.bookable',a.availability.bridgeBoolean,o.availability.bookability),
      fact(o.alternativeId,'offer.count',1,{...o.completeTotal,reason:'Exactly one explicitly bound rate in this candidate'}),
      fact(o.alternativeId,'review.score',normalizedRating,{...o.ratingObserved,links:[...o.ratingObserved.links,...o.ratingScale.links]},'0-10'),
      fact(o.alternativeId,'location.distance',comparable?o.distanceKm.value:null,o.distanceKm,'km')];
    for(const replacement of replacements){
      // Exact legacy evidence metadata can be retained in synthetic parity tests
      // only when its value and availability match the recomputed semantic fact.
      const previous=s.evidence.find(f=>f.code===replacement.code);
      facts.push(request.kind==='SYNTHETIC'&&previous&&same(previous.value,replacement.value)&&previous.availability===replacement.availability?copy(previous):replacement);
    }
    if(new Set(facts.map(f=>f.code)).size!==facts.length)fail('DUPLICATE_EVIDENCE_CODE');
    return {alternativeId:o.alternativeId,roomKey:o.scope.roomKey,rateKey:o.scope.rateKey,facts,category:s.category,roomText:s.roomText,features:s.features,
      assessment:{availability:a.availability.state,accommodation:a.accommodation.status,recommendationBlockers:a.recommendationBlockers,
        distanceState:a.geography.state,distanceKm:comparable?o.distanceKm.value:null,completeTotal:total,ratingOmitted:!a.rating.normalizable},
      observations:{requirements:copy(o),other:copy(s.observations)},provenance:copy(s.provenance)};
  });
  const input={version:OBSERVED_EXECUTION_VERSION,caseId:n.caseId,sourceFingerprint:hash({normalization:n,
    reviewedSource:r1?.sourceBinding??null,signals,query}),essentialCoverage:coverage,query,
    context:{id:context.id,kilometers:context.kilometers,semantics:context.semantics,reference:copy(n.geography.commonReference)},candidates};
  // Reviewed R2 feedback is not imported here. A distance exception requires a
  // separate explicit evidenced engine context; no exception inferred from R2.
  if(request.kind==='SYNTHETIC'&&request.distanceException)input.context.distanceException=copy(request.distanceException);
  const output=compute(input);
  if(output.version!==OBSERVED_EXECUTION_VERSION||output.candidates.length!==n.offers.length)fail('COMPUTATION_OUTPUT');
  return {input,output,r1Assessment:assessment,essentialCoverage:r1?.essentialRequirementCoverage??coverage,
    reviewedBinding:r1?{source:r1.sourceBinding,reviewConfirmed:r1.reviewConfirmed,humanReview:r1.humanReview,missingness:r1.missingness}:null,
    kind:request.kind,feedbackUsed:false,comparisonToHuman:'NOT_PERFORMED',goldenAdmission:false};
}
