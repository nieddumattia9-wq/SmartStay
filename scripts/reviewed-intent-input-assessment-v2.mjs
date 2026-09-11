import {assessReviewedIntentInput} from './reviewed-intent-input-assessment-v1.mjs';
import {evaluateDiagnosticOfferRequirements,validateDiagnosticOfferRequirements,normalizeItalianBedInventory,DIAGNOSTIC_REQUIREMENTS_VERSION} from './diagnostic-offer-requirements-v1.mjs';
import {sha256,json} from './diagnostic-transcription-review-v1.mjs';
import {verifyReviewedPrivacyClaim} from './diagnostic-scoped-signals-v1.mjs';

// Forward-only successor: v1 and all original review events remain unchanged.
// The explicit normalization document is evidence-linked, NOT a human review,
// engine input, source-independent certification or permission to execute V3.
export const REVIEWED_REQUIREMENTS_VERSION='stayopti.reviewed-intent-input-assessment@2.3';
const hash=x=>sha256(json(x));
const same=(a,b)=>json(a)===json(b);
const fail=code=>{throw Error('REVIEWED_REQUIREMENTS_'+code);};
// Bounded source language, not a general intent interpreter. Unknown essential
// wording stays visible and prevents an accommodation PASS. Caller flags cannot
// define away (or invent) an original need. No implicit privacy requirement.
const supportedNeeds=new Map([
  ['invented adequate sleeping places and guest capacity',['sleepingPlaces','capacity']],
  ['adequate sleeping places and guest capacity',['sleepingPlaces','capacity']],
  ['posti letto e capienza adeguati',['sleepingPlaces','capacity']],
  ['sistemazione e posti letto adeguati per tutti gli ospiti',['sleepingPlaces','capacity']],
  ['adequate sleeping places',['sleepingPlaces']],['posti letto adeguati',['sleepingPlaces']],
  ['adequate guest capacity',['capacity']],['capienza adeguata',['capacity']],
  ['children admitted',['childAdmission']],['bambini ammessi',['childAdmission']],
  ['private bathroom',['privateBathroom']],['bagno privato',['privateBathroom']],
  ['exclusive use',['exclusiveUse']],['uso esclusivo',['exclusiveUse']],
]);
function essentialCoverage(basis){
  const interpret=text=>{
    if(typeof text!=='string')return [];
    const t=text.trim().toLowerCase();
    return supportedNeeds.get(t)??(/^(?:configurazione|sistemazione) e posti letto (?:coerenti con|adeguati per) tutti gli ospiti$/.test(t)?
      ['sleepingPlaces','capacity']:[]);
  };
  const needs=basis.flatMap((n,index)=>n.essential===true?[{index,requirement:n.requirement,
    checks:interpret(n.requirement)}]:[]);
  const unresolved=needs.filter(n=>!n.checks.length);
  return {status:unresolved.length?'UNREPRESENTED_ESSENTIAL_NEEDS':'ESSENTIAL_COVERAGE_DEFINED',needs,unrepresentedNeedIndexes:unresolved.map(n=>n.index),
    interpretationVersion:'bounded-original-need-coverage@1.1',callerMappingIsNotAuthority:true};
}
const countWords={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,un:1,una:1,uno:1,due:2,tre:3,quattro:4,cinque:5,sei:6,sette:7,otto:8};
const countToken=t=>/^\d+$/.test(t)?Number(t):countWords[t]??null;
export function normalizedCount(v,kind){
  if(Number.isSafeInteger(v)&&v>=0)return v;
  if(typeof v!=='string')return null;
  const t=v.trim().toLowerCase().replace(/\.$/,'');
  // Explicit published capacity + family-use annotation, not an age/pricing
  // conversion. Conflicting stated totals are not interpreted as a known count.
  const annotated=kind==='capacity'?/^(\d+) (?:persone|adulti); ideale per (\d+) adulti e (\d+) bambini$/.exec(t):null;
  if(annotated)return Number(annotated[1])===Number(annotated[2])+Number(annotated[3])?Number(annotated[1]):null;
  const suffix=kind==='capacity'?'(?:guests?|ospiti)':kind==='units'?'(?:units?|unità)':'(?:internal rooms?|locali interni)';
  const match=new RegExp('^(?:(?:capacity|capienza):\\s*)?([a-z]+|[0-9]+) '+suffix+'$').exec(t);
  if(match)return countToken(match[1]);
  const family=kind==='capacity'?/^(\d+) adulti (?:e|\+) (\d+) bambini$/.exec(t):null;
  return family?Number(family[1])+Number(family[2]):null;
}
export function suiteCounts(v){
  if(typeof v!=='string')return null;
  const t=v.trim().toLowerCase().replace(/\.$/,'');
  const m=/^suite with ([a-z]+|\d+) internal rooms, ([a-z]+|\d+) units?$/.exec(t)??/^suite con ([a-z]+|\d+) locali interni, ([a-z]+|\d+) unità$/.exec(t);
  if(m&&countToken(m[1])!==null&&countToken(m[2])!==null)return {internalRooms:countToken(m[1]),unitsOffered:countToken(m[2])};
  const described=/^(una|\d+) suite privat[ae] con ([a-z]+|\d+) camere interne, (?:un|[a-z]+|\d+) matrimoniale e (?:[a-z]+|\d+) singoli; capienza ([a-z]+|\d+) dichiarata$/.exec(t);
  return described&&countToken(described[1])!==null&&countToken(described[2])!==null&&countToken(described[3])!==null?
    {unitsOffered:countToken(described[1]),internalRooms:countToken(described[2])}:null;
}
export function childFacts(v){
  if(typeof v!=='string')return null;
  const facts={admitted:null,minimumAge:null,adultPricingFromAge:null,extraBedsAvailable:null};
  let admissionQualified=false;
  const set=(key,value)=>{if(facts[key]!==null&&facts[key]!==value)return false;facts[key]=value;return true;};
  for(const part of v.trim().replace(/\.$/,'').split(/\s*;\s*/)){
    if(/^(?:children of all ages admitted|bambini di tutte le età ammessi)$/i.test(part)){if(!set('admitted',true)||!set('minimumAge',0))return null;}
    else if(/^(?:children not admitted|bambini non ammessi)$/i.test(part)){if(!set('admitted',false))return null;}
    else {const minimum=/^(?:minimum child age|età minima bambini): (\d+)$/i.exec(part);
      const price=/^(?:from (\d+) years charged as adults|da (\d+) anni pagano come adulti)$/i.exec(part);
      if(minimum){if(!set('minimumAge',Number(minimum[1])))return null;}
      else if(price){if(!set('adultPricingFromAge',Number(price[1]??price[2])))return null;}
      else if(/^(?:extra beds available|letti supplementari disponibili)$/i.test(part)){if(!set('extraBedsAvailable',true))return null;}
      else if(/^(?:extra beds not available|letti supplementari non disponibili|nessun letto supplementare(?: disponibile)?)$/i.test(part)){if(!set('extraBedsAvailable',false))return null;}
      // A qualification preserves uncertainty about admission and selected-rate
      // application; it is not discarded to certify admission from a price rule.
      else if(/^per minori selezionare tariffa con condizioni esplicite$/i.test(part)){admissionQualified=true;}
      else return null;
    }
  }
  if(admissionQualified){facts.admitted=null;facts.minimumAge=null;}
  return facts;
}
function verifyScalar(c,value,field,code){
  if(c.state!=='KNOWN')return;
  if(value===null)fail(code+'_NORMALIZATION_UNSUPPORTED');
  if(!c.links.some(l=>l.field===field))fail(code+'_SOURCE_FIELD');
  if(!same(c.value,value))fail(code+'_NORMALIZATION_CHANGED');
}
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
  const coverage=essentialCoverage(n.requirementBasis);
  for(const r of n.requirementMapping){
    const expected=coverage.needs.filter(need=>need.checks.includes(r.key)).map(need=>need.index);
    if(!same([...r.needIndexes].sort((a,b)=>a-b),expected)||n.party.requirements[r.key]!==Boolean(expected.length))fail('ESSENTIAL_REQUIREMENT_COVERAGE');
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
    for(const [target,c]of Object.entries(cs)){validateLinks(c,o.alternativeId);if(c.propertyBinding)validateLinks({...c.propertyBinding,state:'KNOWN'},o.alternativeId);maps.push({alternativeId:o.alternativeId,target,claim:structuredClone(c),offerBindingFingerprint:rateBinding});}
    const fieldValue=key=>{const f=previous.retainedObservations.find(f=>f.key===key)?.value;return f?.status==='KNOWN'?f.value:null;};
    for(const key of ['privateBathroom','exclusiveUse'])verifyReviewedPrivacyClaim(o[key],key,previous.retainedObservations);
    // A matching proof hash is not sufficient to legitimize a changed number.
    // Recompute bounded supported transformations from the actual reviewed text.
    const beds=normalizeItalianBedInventory(fieldValue('beds'));
    if(o.sleeping.state==='KNOWN'&&(!beds||!same(o.sleeping.value,beds)))fail('SLEEPING_NORMALIZATION_CHANGED');
    verifyScalar(o.capacityGuests,normalizedCount(fieldValue('roomCapacity'),'capacity'),'roomCapacity','CAPACITY');
    const explicitSuite=suiteCounts(fieldValue('unitConfiguration')),sourceSuite=suiteCounts(fieldValue('scenarioNeeds'));
    if(explicitSuite&&sourceSuite&&!same(explicitSuite,sourceSuite))fail('UNITS_SOURCE_CONFLICT');
    const suite=explicitSuite??sourceSuite,suiteField=explicitSuite?'unitConfiguration':'scenarioNeeds';
    for(const [key,kind,code]of [['unitsOffered','units','UNITS'],['internalRooms','internal','INTERNAL_ROOMS']]){
      const direct=normalizedCount(fieldValue(key),kind);
      if(o[key].state==='KNOWN'&&direct!==null&&suite&&direct!==suite[key])fail(code+'_SOURCE_CONFLICT');
      verifyScalar(o[key],direct??suite?.[key]??null,direct!==null?key:suiteField,code);
    }
    const children=childFacts(fieldValue('childrenPolicy'));
    for(const [key,code]of [['admitted','CHILD_ADMISSION'],['minimumAge','CHILD_MINIMUM_AGE'],['adultPricingFromAge','CHILD_PRICING'],['extraBedsAvailable','CHILD_EXTRA_BEDS']])
      verifyScalar(o.children[key],children?.[key]??null,'childrenPolicy',code);
    if((o.ratingObserved.state==='KNOWN'?o.ratingObserved.value:null)!==fieldValue('rating'))fail('RATING_OBSERVATION_CHANGED');
    if((o.distanceKm.state==='KNOWN'?o.distanceKm.value:null)!==previous.sourceCentreKm||
      (o.completeTotal.state==='KNOWN'?o.completeTotal.value:null)!==previous.policyTotalCost||
      (o.ratingScale.state==='KNOWN'?o.ratingScale.value:null)!==(previous.projectedRating?.scale??null))fail('NUMERIC_OBSERVATION_PROMOTED_OR_CHANGED');
    // This successor still consumes reviewed public-display observations, not
    // verified provider recheck claims. Such evidence needs a separate input.
    if(o.availability.bookability.state==='KNOWN')fail('PUBLIC_OBSERVATION_NOT_BOOKABILITY_VERIFICATION');
  }
  const evaluation=evaluateDiagnosticOfferRequirements(n);
  // An uninterpreted original hard need must not disappear behind NOT_REQUIRED.
  // Keep diagnostic facts, including proven violations, but never claim a PASS.
  if(coverage.unrepresentedNeedIndexes.length)for(const o of evaluation.offers){
    o.accommodation.essentialNeeds={status:'INSUFFICIENT_INFORMATION',reason:'ESSENTIAL_NEED_NOT_REPRESENTABLE',needIndexes:coverage.unrepresentedNeedIndexes};
    if(o.accommodation.status==='SATISFIED')o.accommodation.status='INSUFFICIENT_INFORMATION';
    o.conversionBlockers.push('ESSENTIAL_NEED_NOT_REPRESENTABLE');
    o.recommendationBlockers.push('ESSENTIAL_NEED_NOT_REPRESENTABLE');
  }
  return {version:REVIEWED_REQUIREMENTS_VERSION,classification:'DIAGNOSTIC_ONLY',
    originalProjectionFingerprint:original.projectionFingerprint,normalizationFingerprint:hash(n),
    sourceBinding:p.sourceBinding,query:structuredClone(p.query),party:structuredClone(n.party),
    contexts:structuredClone(p.contexts),caseCount:1,contextCount:p.contexts.length,
    originalMapping:original.mapping,missingness:original.missingness,requirementMapping:maps,essentialRequirementCoverage:coverage,evaluation,
    engineInput:null,engineExecuted:false,decision:null,abstention:null,reviewConfirmed:original.reviewConfirmed,
    humanReview:original.humanReview,newHumanReviewCreated:false,feedbackUsed:false,
    bestOverBudget:'UNMAPPED_NOT_UPGRADE',goldenAdmission:false,
    status:'REQUIREMENTS_EVALUATED_NOT_DECISION_EXECUTED'};
}
