import {assessReviewedIntentInput} from './reviewed-intent-input-assessment-v1.mjs';
import {evaluateDiagnosticOfferRequirements,validateDiagnosticOfferRequirements,normalizeItalianBedInventory,DIAGNOSTIC_REQUIREMENTS_VERSION} from './diagnostic-offer-requirements-v1.mjs';
import {sha256,json} from './diagnostic-transcription-review-v1.mjs';

// Forward-only successor: v1 and all original review events remain unchanged.
// The explicit normalization document is evidence-linked, NOT a human review,
// engine input, source-independent certification or permission to execute V3.
export const REVIEWED_REQUIREMENTS_VERSION='stayopti.reviewed-intent-input-assessment@2';
const hash=x=>sha256(json(x));
const same=(a,b)=>json(a)===json(b);
const fail=code=>{throw Error('REVIEWED_REQUIREMENTS_'+code);};
export function assessReviewedIntentRequirements(args,normalization){
  const original=assessReviewedIntentInput(args),p=original.projection,n=normalization;
  try { validateDiagnosticOfferRequirements(n); }
  catch(error) { fail('CONTRACT_'+error.message); }
  if(!n||n.version!==DIAGNOSTIC_REQUIREMENTS_VERSION||n.reviewProjectionFingerprint!==original.projectionFingerprint||
    n.caseId!==p.caseId||n.mode!==(args.packet.mode==='SYNTHETIC_TEST'?'SYNTHETIC':'REVIEWED_DIAGNOSTIC')||
    !same(n.party?.childAgesAtStay,p.requiredScopeNotDropped.childAges)||n.party.adults!==p.query.adults||n.party.unitsRequested!==p.query.rooms||
    !same(n.stay,{checkIn:p.query.checkIn,checkOut:p.query.checkOut,currency:p.query.currency})||
    !same(n.geography?.contexts,p.contexts.map(c=>({id:c.contextId,semantics:c.semantics,kilometers:c.kilometers}))))fail('SOURCE_OR_CONTEXT_BINDING');
  // The normalized requirement selection is explicit and bound to the scenario,
  // not inferred from rooms observed afterwards. No extra privacy obligation.
  if(!Array.isArray(n.requirementBasis)||!same(n.requirementBasis,p.requiredScopeNotDropped.essentialNeeds))fail('REQUIREMENT_BASIS');
  const requiredKeys=['sleepingPlaces','capacity','childAdmission','exclusiveUse','privateBathroom'];
  if(!Array.isArray(n.requirementMapping)||n.requirementMapping.length!==requiredKeys.length||new Set(n.requirementMapping.map(r=>r.key)).size!==requiredKeys.length)fail('REQUIREMENT_MAPPING');
  for(const r of n.requirementMapping){
    if(!requiredKeys.includes(r.key)||!Array.isArray(r.needIndexes)||r.needIndexes.some(i=>!Number.isInteger(i)||!n.requirementBasis[i]?.essential)||
      n.party.requirements[r.key]!==Boolean(r.needIndexes.length)||typeof r.reason!=='string'||!r.reason.trim())fail('UNSUPPORTED_ADDED_REQUIREMENT');
  }
  if(n.offers.length!==p.candidates.length||new Set(n.offers.map(o=>o.alternativeId)).size!==p.candidates.length)fail('ALTERNATIVE_SET');
  const byId=new Map(p.candidates.map(o=>[o.alternativeId,o]));
  function validateLinks(c,owner){
    if(!c||!Array.isArray(c.links))fail('CLAIM_LINKS');
    for(const l of c.links){
      const parts=l.field.split('/'),id=owner??parts[0],key=owner?l.field:parts[1];
      const field=byId.get(id)?.retainedObservations.find(f=>f.key===key);
      if(!field||!Array.isArray(l.evidence)||l.evidence.some(e=>!field.value.evidenceRefs.includes(e.ref)||
        args.packet.proofs.find(p=>p.ref===e.ref)?.sha256!==e.sha256))fail('FIELD_EVIDENCE_LINK');
      if(c.state==='KNOWN'&&field.value.status==='UNKNOWN')fail('UNKNOWN_PROMOTED');
    }
  }
  validateLinks(n.geography.commonReference,null);
  const maps=[];
  for(const o of n.offers){
    const previous=byId.get(o.alternativeId);if(!previous)fail('ALTERNATIVE_ID');
    const rateBinding=hash(previous.offerBinding);
    if(o.reviewedOfferBindingFingerprint!==rateBinding||o.scope.roomKey!==previous.offerBinding.roomName.value||
      o.scope.rateKey!=='REVIEWED_RATE_'+rateBinding)fail('SELECTED_RATE_BINDING');
    const cs={reference:o.reference,distanceKm:o.distanceKm,...Object.fromEntries(Object.entries(o.availability).map(([k,v])=>['availability.'+k,v])),
      unitsOffered:o.unitsOffered,internalRooms:o.internalRooms,capacityGuests:o.capacityGuests,sleeping:o.sleeping,
      ...Object.fromEntries(Object.entries(o.children).map(([k,v])=>['children.'+k,v])),exclusiveUse:o.exclusiveUse,privateBathroom:o.privateBathroom,
      completeTotal:o.completeTotal,ratingScale:o.ratingScale,ratingObserved:o.ratingObserved};
    for(const [target,c]of Object.entries(cs)){validateLinks(c,o.alternativeId);maps.push({alternativeId:o.alternativeId,target,claim:structuredClone(c),offerBindingFingerprint:rateBinding});}
    const fieldValue=key=>{const f=previous.retainedObservations.find(f=>f.key===key)?.value;return f?.status==='KNOWN'?f.value:null;};
    // A matching proof hash is not sufficient to legitimize a changed number.
    // Recompute bounded supported transformations from the actual reviewed text.
    const beds=normalizeItalianBedInventory(fieldValue('beds'));
    if(o.sleeping.state==='KNOWN'&&(!beds||!same(o.sleeping.value,beds)))fail('SLEEPING_NORMALIZATION_CHANGED');
    if((o.ratingObserved.state==='KNOWN'?o.ratingObserved.value:null)!==fieldValue('rating'))fail('RATING_OBSERVATION_CHANGED');
    const ageText=fieldValue('childrenPolicy');
    const age=typeof ageText==='string'?/^(?:Bambini di tutte le età ammessi;\s*)?Da (\d+) anni pagano come adulti/i.exec(ageText):null;
    if(o.children.adultPricingFromAge.state==='KNOWN'&&(!age||o.children.adultPricingFromAge.value!==Number(age[1])))fail('CHILD_PRICING_NORMALIZATION_CHANGED');
    if((o.distanceKm.state==='KNOWN'?o.distanceKm.value:null)!==previous.sourceCentreKm||
      (o.completeTotal.state==='KNOWN'?o.completeTotal.value:null)!==previous.policyTotalCost||
      (o.ratingScale.state==='KNOWN'?o.ratingScale.value:null)!==(previous.projectedRating?.scale??null))fail('NUMERIC_OBSERVATION_PROMOTED_OR_CHANGED');
    // This successor still consumes reviewed public-display observations, not
    // verified provider recheck claims. Such evidence needs a separate input.
    if(o.availability.bookability.state==='KNOWN')fail('PUBLIC_OBSERVATION_NOT_BOOKABILITY_VERIFICATION');
  }
  const evaluation=evaluateDiagnosticOfferRequirements(n);
  return {version:REVIEWED_REQUIREMENTS_VERSION,classification:'DIAGNOSTIC_ONLY',
    originalProjectionFingerprint:original.projectionFingerprint,normalizationFingerprint:hash(n),
    sourceBinding:p.sourceBinding,query:structuredClone(p.query),party:structuredClone(n.party),
    contexts:structuredClone(p.contexts),caseCount:1,contextCount:p.contexts.length,
    originalMapping:original.mapping,missingness:original.missingness,requirementMapping:maps,evaluation,
    engineInput:null,engineExecuted:false,decision:null,abstention:null,reviewConfirmed:original.reviewConfirmed,
    humanReview:original.humanReview,newHumanReviewCreated:false,feedbackUsed:false,
    bestOverBudget:'UNMAPPED_NOT_UPGRADE',goldenAdmission:false,
    status:'REQUIREMENTS_EVALUATED_NOT_DECISION_EXECUTED'};
}
