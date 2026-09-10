// Evaluation-only, pure and deterministic. No engine execution, I/O or custody.
// A supported conversion is not a recommendation, blind judgment or Golden gate.
export const DIAGNOSTIC_REQUIREMENTS_VERSION = 'stayopti.diagnostic-offer-requirements@1.1';
const copy = x => structuredClone(x);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const fail = code => { throw Error(`REQUIREMENTS_${code}`); };
const integer = (x,min=0) => Number.isSafeInteger(x) && x >= min;
const number = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const text = x => typeof x === 'string' && x.trim().length > 0;
const utc = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT.*Z$/.test(x) && Number.isFinite(Date.parse(x));
const day = x => typeof x === 'string' && /^\d{4}-\d\d-\d\d$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10)===x;
const known = c => c.state === 'KNOWN' ? c.value : null;
const refs = cs => copy(cs.flatMap(c=>c.links));
const result = (status,reason,claims,details={}) => ({status,reason,links:refs(claims),...details});
const insufficient = (cs,reason) => result(cs.some(c=>c.state==='CONFLICTING')?'CONFLICTING':'INSUFFICIENT_INFORMATION',reason,cs);

// R1: observation truth and applicability are different axes. A property-wide
// total is never the selected tariff's complete total. Spatial/rating facts may
// apply across its rooms only with an explicit evidenced property/offer link.
function usable(c,kind,offer){
  if(c.state!=='KNOWN')return false;
  if(c.applicability==='OFFER_SCOPED')return true;
  if(c.applicability!=='PROPERTY_WIDE'||!['reference','distance','rating'].includes(kind))return false;
  const b=c.propertyBinding;
  return Boolean(offer&&b&&b.alternativeId===offer.alternativeId&&same(b.scope,{roomKey:offer.scope.roomKey,rateKey:offer.scope.rateKey})&&
    text(b.reason)&&Array.isArray(b.links)&&b.links.length&&b.links.every(l=>text(l.field)&&Array.isArray(l.evidence)&&l.evidence.length&&
      l.evidence.every(e=>text(e.ref)&&/^[a-f0-9]{64}$/.test(e.sha256))));
}

// Claim format: {state:KNOWN|UNKNOWN|CONFLICTING,value,reason,observedAt,
// timeSource,scope:{roomKey,rateKey}|null,links:[{field,evidence:[{ref,sha256}]}]}.
// UNKNOWN/conflict never contains a chosen value. Date is declared evidence time,
// not an independent timestamp certificate, freshness threshold or bookability.
function claim(c,check,scope,evaluatedAt){
  if(!c || !['KNOWN','UNKNOWN','CONFLICTING'].includes(c.state) || !text(c.reason) ||
      !Array.isArray(c.links) || !same(c.scope,scope) ||
      !['OFFER_SCOPED','PROPERTY_WIDE','SET_DOCUMENTED','UNVERIFIED'].includes(c.applicability)) fail('CLAIM_SCOPE_OR_SCHEMA');
  if(c.links.some(l=>!text(l.field)||!Array.isArray(l.evidence)||l.evidence.some(e=>!text(e.ref)||!/^[a-f0-9]{64}$/.test(e.sha256)))) fail('EVIDENCE_LINK');
  if(c.state==='KNOWN'){
    if(!check(c.value)||!c.links.length||c.links.some(l=>!l.evidence.length)||!utc(c.observedAt)||!text(c.timeSource))fail('KNOWN_CLAIM_UNSUPPORTED');
  } else if(c.value!==null)fail('UNKNOWN_OR_CONFLICT_VALUE');
  if(c.observedAt!==null && (!utc(c.observedAt)||Date.parse(c.observedAt)>Date.parse(evaluatedAt)))fail('EVIDENCE_TIME');
  if(c.observedAt!==null&&!text(c.timeSource))fail('EVIDENCE_TIME_SOURCE');
}
const point = x => x && Number.isFinite(x.latitude)&&Math.abs(x.latitude)<=90&&Number.isFinite(x.longitude)&&Math.abs(x.longitude)<=180;
const reference = x => x && ['SELECTED_LOCATION','SOURCE_CENTRE'].includes(x.kind) && text(x.id) && text(x.provenance) &&
  (x.kind==='SOURCE_CENTRE'?x.point===null:(x.point===null||point(x.point)));
const bedInventory = x => x && typeof x.complete==='boolean' && Array.isArray(x.beds) && x.beds.length>0 &&
  x.beds.every(b=>['SINGLE','DOUBLE','SOFA','BUNK','OTHER'].includes(b.kind)&&integer(b.count,1)&&
    (b.placesPerBed===null||integer(b.placesPerBed,1))&&text(b.placeBasis));

// Bounded lexical normalization only. Unsupported prose is not partially read as
// a complete inventory. Sofa/bunk terms do not define places per item; dimensions
// and exclusive allocation are never inferred. Original text remains upstream.
export function normalizeItalianBedInventory(value){
  if(typeof value!=='string'||/\b(non|senza|nessun|oppure|o)\b/i.test(value))return null;
  let remaining=value.toLowerCase().replace(/camera\s+\d+\s*:/g,'').replace(/\(dicitura testuale del sito\)/g,'');
  const beds=[];
  remaining=remaining.replace(/(\d+)\s+(divano letto|divani letto|lett[oi] matrimonial[ei](?: large)?|lett[oi] singol[oi]|lett[oi] a castello)/g,(_match,count,type)=>{
    const kind=type.includes('matrimonial')?'DOUBLE':type.includes('singol')?'SINGLE':type.includes('divan')?'SOFA':'BUNK';
    beds.push({kind,count:Number(count),placesPerBed:kind==='DOUBLE'?2:kind==='SINGLE'?1:null,
      placeBasis:kind==='DOUBLE'?'LEXICAL_DOUBLE_TWO_PLACES_NOT_DIMENSIONS':kind==='SINGLE'?'LEXICAL_SINGLE_ONE_PLACE':'PLACES_UNDOCUMENTED_NO_MULTIPLIER'});
    return '';
  });
  if(remaining.replace(/[\s;,]/g,'').replace(/^e$/,'')!==''||!beds.length||beds.some(b=>!integer(b.count,1)))return null;
  return {complete:true,beds};
}
export function validateDiagnosticOfferRequirements(input){
  if(!input||input.version!==DIAGNOSTIC_REQUIREMENTS_VERSION||!text(input.caseId)||!utc(input.evaluatedAt)||
    !['SYNTHETIC','REVIEWED_DIAGNOSTIC'].includes(input.mode))fail('INPUT_SCHEMA');
  const p=input.party,s=input.stay;
  if(!p||!integer(p.adults,1)||!Array.isArray(p.childAgesAtStay)||p.childAgesAtStay.some(a=>!integer(a)||a>=18)||
    !integer(p.unitsRequested,1)||!p.requirements||['sleepingPlaces','capacity','childAdmission','exclusiveUse','privateBathroom'].some(k=>typeof p.requirements[k]!=='boolean'))fail('PARTY_SCHEMA');
  if(!s||!day(s.checkIn)||!day(s.checkOut)||s.checkOut<=s.checkIn||!/^[A-Z]{3}$/.test(s.currency))fail('STAY_SCHEMA');
  const g=input.geography;
  if(!g||!Array.isArray(g.contexts)||!g.contexts.length||new Set(g.contexts.map(c=>c.id)).size!==g.contexts.length||
    g.contexts.some(c=>!text(c.id)||c.semantics!=='strong-preference'||!number(c.kilometers)||c.kilometers===0))fail('DISTANCE_CONTEXT');
  claim(g.commonReference,reference,null,input.evaluatedAt);
  if(!Array.isArray(input.offers)||!input.offers.length||new Set(input.offers.map(o=>o.alternativeId)).size!==input.offers.length)fail('OFFERS_SCHEMA');
  for(const o of input.offers){
    if(!text(o.alternativeId)||!o.scope||!text(o.scope.roomKey)||!text(o.scope.rateKey)||
      !same(o.scope.stay,s)||!same(o.scope.party,{adults:p.adults,childAgesAtStay:p.childAgesAtStay,unitsRequested:p.unitsRequested}))fail('OFFER_SCOPE');
    const sc={roomKey:o.scope.roomKey,rateKey:o.scope.rateKey};
    if(!o.availability||!o.children)fail('OFFER_SCHEMA');
    for(const [c,check]of [[o.reference,reference],[o.distanceKm,number],
      [o.availability.observed,v=>v==='AVAILABLE'],[o.availability.bookability,v=>typeof v==='boolean'],
      [o.availability.unavailable,v=>v===true],[o.unitsOffered,v=>integer(v,1)],[o.internalRooms,v=>integer(v,1)],
      [o.capacityGuests,v=>integer(v)],[o.sleeping,bedInventory],[o.children.admitted,v=>typeof v==='boolean'],
      [o.children.minimumAge,v=>integer(v)],[o.children.adultPricingFromAge,v=>integer(v)],
      [o.children.extraBedsAvailable,v=>typeof v==='boolean'],[o.exclusiveUse,v=>typeof v==='boolean'],
      [o.privateBathroom,v=>typeof v==='boolean'],[o.completeTotal,number],[o.ratingScale,v=>number(v)&&v>0],[o.ratingObserved,number]])claim(c,check,sc,input.evaluatedAt);
    if(o.ratingScale.state==='KNOWN'&&o.ratingObserved.state==='KNOWN'&&o.ratingObserved.value>o.ratingScale.value)fail('RATING_OUTSIDE_DOCUMENTED_SCALE');
  }
  return true;
}

export function evaluateGeographicReference(common,offerReference,distance,contexts,offer){
  const cs=[common,offerReference,distance];
  let state,reason;
  if(cs.some(c=>c.state==='CONFLICTING')){state='CONFLICTING';reason='REFERENCE_OR_DISTANCE_CONFLICT';}
  else if(common.state!=='KNOWN'||common.applicability!=='SET_DOCUMENTED'||!usable(offerReference,'reference',offer)){state='REFERENCE_UNVERIFIED';reason='COMMON_REFERENCE_NOT_DOCUMENTED';}
  else if(common.value.kind!==offerReference.value.kind||common.value.id!==offerReference.value.id){state='NON_COMPARABLE';reason='REFERENCE_IDENTITY_MISMATCH';}
  else if(!same(common.value.point,offerReference.value.point)){state='CONFLICTING';reason='SAME_ID_DIFFERENT_POINT';}
  else if(distance.state!=='KNOWN'){state='DISTANCE_UNKNOWN';reason='REPORTED_DISTANCE_MISSING';}
  else if(!usable(distance,'distance',offer)){state='DISTANCE_UNVERIFIED';reason='DISTANCE_APPLICABILITY_UNVERIFIED';}
  else {state=common.value.kind==='SOURCE_CENTRE'?'COMPARABLE_SOURCE_DECLARED':'COMPARABLE_SELECTED_LOCATION';reason='SAME_DOCUMENTED_REFERENCE';}
  const comparable=state.startsWith('COMPARABLE_');
  return {state,reason,links:refs(cs),reference:copy(known(offerReference)),reportedKilometers:known(distance),
    selectedLocationEquivalenceVerified:false, // identity matching alone never verifies geographic equivalence
    contexts:contexts.map(c=>({contextId:c.id,kilometers:c.kilometers,semantics:c.semantics,
      status:!comparable?'UNVERIFIED':distance.value<=c.kilometers?'WITHIN_PREFERENCE':'OUTSIDE_REQUIRES_JUSTIFIED_EXCEPTION',
      excessKilometers:comparable?Math.max(0,Math.round((distance.value-c.kilometers)*1e9)/1e9):null,
      hardViolation:false,generalToleranceKm:null,exceptionAuthorized:false})),
    policyRule:'intentRolePolicyBridgeV3: satisfied distance retained; exceeded strong preference requires case-specific evidenced gain; unknown remains incomplete',
    comparisonNotASelection:true};
}

export function evaluateAvailability(a){
  const cs=Object.values(a),scoped=c=>c.applicability==='OFFER_SCOPED'?known(c):null;
  const observed=scoped(a.observed),bookable=scoped(a.bookability),unavailable=scoped(a.unavailable);
  // No implicit latest-wins: two contradictory scoped claims require resolution.
  const conflict=cs.some(c=>c.state==='CONFLICTING')||(unavailable===true&&(observed==='AVAILABLE'||bookable===true))||(bookable===false&&observed==='AVAILABLE');
  const state=conflict?'CONFLICTING':unavailable===true?'KNOWN_UNAVAILABLE':bookable===false?'VERIFIED_NOT_BOOKABLE':
    bookable===true?'VERIFIED_BOOKABLE':observed==='AVAILABLE'?'OBSERVED_AVAILABLE':'UNKNOWN';
  return {state,observed:copy(a.observed),bookability:copy(a.bookability),unavailable:copy(a.unavailable),
    bridgeBoolean:conflict?null:bookable,qualityEffect:'NONE',freshnessCertified:false,
    conversionBlocker:conflict?'AVAILABILITY_CONFLICT':bookable===null?'BOOLEAN_BOOKABILITY_UNSUPPORTED_BY_EVIDENCE':null};
}

const compareRequired = (required,c,predicate,reason) => !required?result('NOT_REQUIRED','NO_ADDITIONAL_REQUIREMENT',[c]):
  c.state!=='KNOWN'||c.applicability!=='OFFER_SCOPED'?insufficient([c],reason+'_OR_OFFER_SCOPE_UNVERIFIED'):result(predicate(c.value)?'SATISFIED':'DOCUMENTED_VIOLATION',reason,[c]);
export function evaluateAccommodation(p,o){
  const guests=p.adults+p.childAgesAtStay.length,r=p.requirements;
  const units=compareRequired(true,o.unitsOffered,v=>v===p.unitsRequested,'REQUESTED_UNITS');
  const capacity=compareRequired(r.capacity,o.capacityGuests,v=>v>=guests,'DECLARED_CAPACITY');
  let sleeping;
  if(!r.sleepingPlaces)sleeping=result('NOT_REQUIRED','NO_SLEEPING_PLACE_REQUIREMENT',[o.sleeping]);
  else if(o.sleeping.state!=='KNOWN'||o.sleeping.applicability!=='OFFER_SCOPED')sleeping=insufficient([o.sleeping],'SLEEPING_INVENTORY_UNVERIFIED');
  else {
    const inventory=o.sleeping.value,lower=inventory.beds.reduce((n,b)=>n+b.count*(b.placesPerBed??0),0);
    const unknown=inventory.beds.some(b=>b.placesPerBed===null),exact=inventory.complete&&!unknown;
    // Per-offer totals, already covering the requested units. Never multiply by
    // internal rooms, requested units, capacity text or the word "bunk".
    sleeping=result(lower>=guests?'SATISFIED':exact?'DOCUMENTED_VIOLATION':'INSUFFICIENT_INFORMATION',
      lower>=guests?'DOCUMENTED_PLACES_COVER_PARTY':exact?'DOCUMENTED_PLACES_BELOW_PARTY':'SLEEPING_PLACES_NOT_FULLY_DOCUMENTED',[o.sleeping],
      {documentedLowerBound:lower,exactPlaces:exact?lower:null,requiredGuests:guests,unknownPlaceComponents:unknown});
  }
  const applicable=r.childAdmission&&p.childAgesAtStay.length>0;
  let ageAdmission=compareRequired(applicable,o.children.admitted,v=>v,'SELECTED_RATE_CHILD_ADMISSION');
  if(applicable&&o.children.minimumAge.state==='CONFLICTING')ageAdmission=insufficient([o.children.admitted,o.children.minimumAge],'CHILD_AGE_RULE_CONFLICT');
  else if(applicable&&o.children.minimumAge.state==='KNOWN'&&o.children.minimumAge.applicability==='OFFER_SCOPED'&&p.childAgesAtStay.some(a=>a<o.children.minimumAge.value))
    ageAdmission=result(o.children.admitted.state==='KNOWN'&&o.children.admitted.applicability==='OFFER_SCOPED'&&o.children.admitted.value?'CONFLICTING':'DOCUMENTED_VIOLATION','CHILD_BELOW_DOCUMENTED_MINIMUM',[o.children.admitted,o.children.minimumAge]);
  const priceRule=o.children.adultPricingFromAge;
  const childPricing=priceRule.state==='KNOWN'?result(priceRule.applicability==='OFFER_SCOPED'?'EVALUATED_TARIFF_TREATMENT':'EVALUATED_POLICY_RATE_APPLICABILITY_UNVERIFIED','ADULT_PRICE_IS_NOT_ADULT_COMPOSITION',[priceRule],
    {childIndexesChargedAtAdultRate:p.childAgesAtStay.flatMap((a,i)=>a>=priceRule.value?[i]:[]),ageThreshold:priceRule.value,rateApplicabilityVerified:priceRule.applicability==='OFFER_SCOPED'}):
    insufficient([priceRule],'CHILD_PRICING_NOT_DOCUMENTED');
  const privacy={exclusiveUse:compareRequired(r.exclusiveUse,o.exclusiveUse,v=>v,'REQUESTED_EXCLUSIVE_USE'),
    privateBathroom:compareRequired(r.privateBathroom,o.privateBathroom,v=>v,'REQUESTED_PRIVATE_BATHROOM')};
  const required=[units,capacity,sleeping,ageAdmission,...Object.values(privacy)];
  const status=required.some(x=>x.status==='CONFLICTING')?'CONFLICTING':required.some(x=>x.status==='DOCUMENTED_VIOLATION')?'DOCUMENTED_VIOLATION':
    required.some(x=>x.status==='INSUFFICIENT_INFORMATION')?'INSUFFICIENT_INFORMATION':'SATISFIED';
  return {status,units,capacity,sleeping,ageAdmission,childPricing,privacy,
    partyUnchanged:copy(p),internalRooms:copy(o.internalRooms),extraBeds:copy(o.children.extraBedsAvailable),
    qualityEffect:'NONE',notEvaluated:['bed dimensions','unrequested accessibility or privacy'],
    lowerConfidenceIsNotLowerQuality:true};
}

export function evaluateDiagnosticOfferRequirements(input){
  validateDiagnosticOfferRequirements(input);
  const offers=input.offers.map(o=>{
    const geography=evaluateGeographicReference(input.geography.commonReference,o.reference,o.distanceKm,input.geography.contexts,o);
    const availability=evaluateAvailability(o.availability),accommodation=evaluateAccommodation(input.party,o);
    const completeTotalUsable=usable(o.completeTotal,'completeTotal',o);
    const conversionBlockers=[...(availability.conversionBlocker?[availability.conversionBlocker]:[]),
      ...(o.completeTotal.state==='KNOWN'&&!completeTotalUsable?['COMPLETE_TOTAL_APPLICABILITY_UNVERIFIED']:[]),
      ...(geography.state==='DISTANCE_UNVERIFIED'?['DISTANCE_APPLICABILITY_UNVERIFIED']:[]),
      ...(geography.state!=='COMPARABLE_SELECTED_LOCATION'?[geography.state==='COMPARABLE_SOURCE_DECLARED'?'SOURCE_REFERENCE_DIAGNOSABLE_NOT_SELECTED_LOCATION_INPUT':'GEOGRAPHIC_INPUT_'+geography.reason]:[]),
      ...(accommodation.status!=='SATISFIED'?[`ACCOMMODATION_${accommodation.status}`]:[])];
    const recommendationBlockers=[...(!completeTotalUsable?[o.completeTotal.state==='KNOWN'?'COMPLETE_TOTAL_APPLICABILITY_UNVERIFIED':'COMPLETE_TOTAL_UNVERIFIED']:[]),
      ...(availability.state!=='VERIFIED_BOOKABLE'?['BOOKABILITY_NOT_VERIFIED']:[]),
      ...(accommodation.status!=='SATISFIED'?[`ACCOMMODATION_${accommodation.status}`]:[])];
    return {alternativeId:o.alternativeId,scope:copy(o.scope),geography,availability,accommodation,conversionBlockers,recommendationBlockers,
      price:{completeTotal:copy(o.completeTotal),completeTotalUsable,observedPromotedToComplete:false},
      rating:{observation:copy(o.ratingObserved),scale:copy(o.ratingScale),normalizable:usable(o.ratingObserved,'rating',o)&&usable(o.ratingScale,'rating',o),
        missingScaleEffect:'OMIT_NORMALIZED_RATING_RETAIN_OBSERVATION_NOT_GLOBAL_INPUT_REJECTION'},
      engineResult:null};
  });
  return {version:DIAGNOSTIC_REQUIREMENTS_VERSION,caseId:input.caseId,evaluatedAt:input.evaluatedAt,
    classification:'DIAGNOSTIC_ONLY',offers,engineExecuted:false,decision:null,abstention:null,
    feedbackUsed:false,bestOverBudgetMappedToUpgrade:false,automaticGoldenAdmission:false,
    recommendationEligibilityNotCertified:true};
}

// Validates an explicitly supplied existing bridge input, never manufactures its
// required booleans/coordinates or changes its scores. Complete-cost UNKNOWN can
// still reach diagnostic computation; the unchanged policy excludes it later.
// All alternative/offer scopes must be covered: no selector can borrow evidence
// from a different rate, and no incomplete accommodation is silently dropped.
export function prepareSupportedIntentBridgeInput(requirements,bridgeInput){
  const assessment=evaluateDiagnosticOfferRequirements(requirements),blockers=[];
  for(const o of assessment.offers)for(const code of o.conversionBlockers)blockers.push({alternativeId:o.alternativeId,code});
  if(!bridgeInput)return {assessment,status:'NON_EXECUTABLE',input:null,blockers:[...blockers,{code:'CANONICAL_BRIDGE_INPUT_NOT_SUPPLIED'}]};
  const s=bridgeInput.search,p=requirements.party;
  if(!s||bridgeInput.caseId!==requirements.caseId||s.adults!==p.adults||s.children!==p.childAgesAtStay.length||s.rooms!==p.unitsRequested||
    s.checkIn!==requirements.stay.checkIn||s.checkOut!==requirements.stay.checkOut||s.currency!==requirements.stay.currency||
    !Array.isArray(s.hotels)||s.hotels.length!==requirements.offers.length||new Set(s.hotels.map(h=>h.id)).size!==s.hotels.length)fail('BRIDGE_SCOPE_MISMATCH');
  if(bridgeInput.distance?.reference!=='selected-location'||bridgeInput.distance.semantics!=='strong-preference'||
    !requirements.geography.contexts.some(c=>c.kilometers===s.maximumDistanceKm)||!s.selectedLocation)blockers.push({code:'SELECTED_LOCATION_BRIDGE_CONTEXT_UNSUPPORTED'});
  // Actual coordinates/equivalence need independent support at the caller. The
  // reference id binds the explicitly selected point; no source-centre fallback.
  if(requirements.geography.commonReference.state==='KNOWN'&&requirements.geography.commonReference.value.kind==='SELECTED_LOCATION'){
    const expected=requirements.geography.commonReference.value.point;
    if(!expected)blockers.push({code:'SELECTED_POINT_COORDINATES_UNVERIFIED'});
    else if(expected.latitude!==s.selectedLocation?.latitude||expected.longitude!==s.selectedLocation?.longitude)fail('SELECTED_REFERENCE_POINT_MISMATCH');
  }
  for(const o of requirements.offers){
    const h=s.hotels.find(h=>h.id===o.alternativeId);
    if(!h||h.offers?.length!==1||h.offers[0].id!==o.scope.rateKey||h.offers[0].roomName!==o.scope.roomKey)fail('BRIDGE_RATE_SCOPE_UNSUPPORTED');
    const rate=h.offers[0],a=assessment.offers.find(a=>a.alternativeId===o.alternativeId);
    if(a.availability.bridgeBoolean!==null&&rate.bookable!==a.availability.bridgeBoolean)fail('BRIDGE_BOOKABILITY_MISMATCH');
    if(o.distanceKm.state==='KNOWN'&&h.distance!==o.distanceKm.value)fail('BRIDGE_DISTANCE_MISMATCH');
    if(o.completeTotal.state!=='KNOWN'?(rate.totalKnownCost!=null||h.totalKnownCost!=null||rate.taxesIncluded===true||h.taxesIncluded===true):rate.totalKnownCost!==o.completeTotal.value)fail('BRIDGE_COMPLETE_TOTAL_PROMOTION_OR_MISMATCH');
    if(o.ratingScale.state!=='KNOWN'&&h.reviewScore!=null)fail('BRIDGE_RATING_SCALE_INVENTED');
    if(!a.rating.normalizable&&h.reviewScore!=null)fail('BRIDGE_RATING_APPLICABILITY_UNVERIFIED');
    if(o.ratingScale.state==='KNOWN'&&o.ratingObserved.state==='KNOWN'&&h.reviewScore!=null&&
      Math.abs(h.reviewScore-o.ratingObserved.value/o.ratingScale.value*10)>1e-9)fail('BRIDGE_RATING_NORMALIZATION_MISMATCH');
  }
  return {assessment,status:blockers.length?'NON_EXECUTABLE':'SUPPORTED_DIAGNOSTIC_INPUT',input:blockers.length?null:copy(bridgeInput),blockers,
    separatelyEvaluatedParty:copy(requirements.party),policyUnmodified:true,realExecutionAuthorized:false};
}
