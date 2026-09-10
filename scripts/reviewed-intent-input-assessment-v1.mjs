import { verifyReviewedTranscription, observedCenterDistanceKm } from './diagnostic-role-feedback-bridge-v1.mjs';
import { fingerprint, sha256, json } from './diagnostic-transcription-review-v1.mjs';

// Pure evaluation pre-adapter. No engine, I/O, journal writer or feedback labels.
// A partial projection is deliberately NOT an IntentRoleBridgeInputV3.
export const REVIEWED_INTENT_ASSESSMENT_VERSION = 'stayopti.reviewed-intent-input-assessment@1';
const hash = x => sha256(json(x));
const fail = code => { throw Error(code); };
const value = (alt, key) => alt.fields.find(f => f.key === key)?.value;
const known = wrapper => wrapper?.status === 'KNOWN' ? wrapper.value : null;
const auditKeys = new Set(['propertyName','selection','advertising','discounts','budgetFit','rateMarketing','roomRateSourceId']);
const targets = {
  currency:'search.currency',stay:'search.checkIn/checkOut',occupancy:'search.adults/children/rooms',
  category:'hotel.accommodationCategory',stars:'hotel.stars',reviewCount:'hotel.reviewCount',
  roomName:'offer.roomName',displayedPrice:'offer.price',completeTotal:'offer.totalKnownCost',
  refundable:'offer.refundable',cancellation:'offer.cancellationPolicy',mealPlan:'offer.mealPlan',
};

export function assessReviewedIntentInput({packet,events,codeHash,originalManifest,
  originalManifestSha256,preparedInput,preparedInputSha256}) {
  const state = verifyReviewedTranscription(packet, events, codeHash);
  if (sha256(json(preparedInput)) !== preparedInputSha256 ||
      hash(originalManifest) !== originalManifestSha256 ||
      preparedInput.originalScenarioManifestSha256 !== originalManifestSha256 ||
      preparedInput.caseId !== packet.caseId || originalManifest.caseId !== packet.caseId ||
      preparedInput.classification !== 'DIAGNOSTIC_ONLY' ||
      json(preparedInput.originalScenario) !== json(packet.scenario)) fail('REVIEWED_INTENT_SOURCE_BINDING_MISMATCH');
  const s = originalManifest.scenario;
  if (!s || originalManifest.profile !== 'Balanced' || !Number.isFinite(s.budgetTotal) || s.budgetTotal <= 0 ||
      !Number.isInteger(s.nights) || s.nights <= 0 || !Number.isInteger(s.adults) || s.adults < 1 ||
      !Number.isInteger(s.children) || s.children < 0 || !Number.isInteger(s.rooms) || s.rooms < 1 ||
      !Array.isArray(s.childAgesAtStay) || s.childAgesAtStay.length !== s.children ||
      s.childAgesAtStay.some(a => !Number.isInteger(a) || a < 0 || a >= 18) ||
      !/^[A-Z]{3}$/.test(s.currency) || [s.checkIn,s.checkOut].some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d)) ||
      (Date.parse(s.checkOut)-Date.parse(s.checkIn))/86400000 !== s.nights) fail('REVIEWED_INTENT_SCENARIO_UNSUPPORTED');
  const contexts = preparedInput.postObservationContexts;
  if (!Array.isArray(contexts) || !contexts.length || new Set(contexts.map(c=>c.contextId)).size !== contexts.length ||
      contexts.some(c => c.prospectivelyFrozen !== false || c.independentCase !== false || c.currency !== s.currency ||
        c.budgetMinorUnits !== s.budgetTotal*100 || c.distancePreference?.semantics !== 'STRONG_PREFERENCE_WITH_JUSTIFIED_EXCEPTIONS' ||
        c.distancePreference.hardMaximum !== false || c.distancePreference.generalToleranceKm !== null ||
        !Number.isFinite(c.distancePreference.kilometers) || c.distancePreference.kilometers <= 0)) fail('REVIEWED_INTENT_CONTEXT_MISMATCH');
  if (preparedInput.alternatives.length !== state.alternatives.length ||
      new Set(preparedInput.alternatives.map(a=>a.alternativeId)).size !== state.alternatives.length) fail('REVIEWED_INTENT_ALTERNATIVES_MISMATCH');
  const evidenceById = new Map(packet.proofs.map(p => [p.ref,p]));
  const mapping = [], missingness = [], candidates = [];
  for (const alt of state.alternatives) {
    const previous = preparedInput.alternatives.find(a=>a.alternativeId === alt.id);
    if (!previous || previous.fields.some(f => json(value(alt,f.key)) !== json(f.value))) fail('REVIEWED_INTENT_FIELDS_MISMATCH');
    const occupancy=known(value(alt,'occupancy')), stay=known(value(alt,'stay'));
    if (!occupancy || occupancy.adults!==s.adults || occupancy.children!==s.children || occupancy.rooms!==s.rooms ||
        json(occupancy.childAges)!==json(s.childAgesAtStay) || !stay || stay.checkIn!==s.checkIn || stay.checkOut!==s.checkOut ||
        known(value(alt,'currency'))!==s.currency) fail('REVIEWED_INTENT_OFFER_SCOPE_MISMATCH');
    for (const field of alt.fields) {
      const refs=field.value.evidenceRefs.map(ref=>({ref,sha256:evidenceById.get(ref).sha256,path:evidenceById.get(ref).path}));
      if (field.value.status==='UNKNOWN') missingness.push({alternativeId:alt.id,field:field.key,wrapper:structuredClone(field.value)});
      let target=targets[field.key] ?? 'retainedObservation.notMapped', transformation='RETAIN_TYPED_VALUE_WITHOUT_SEMANTIC_INFERENCE';
      if (auditKeys.has(field.key)) {target='privateAuditOnly';transformation='EXCLUDED_FROM_DECISION';}
      if (field.key==='rating') {target='hotel.reviewScore';transformation=known(value(alt,'ratingScale'))===null?'OMIT_UNNORMALIZABLE_RATING_KEEP_OBSERVATION':'SCALE_REQUIRES_EXPLICIT_VALIDATED_NORMALIZATION';}
      if (field.key==='distance') {target='distanceEvidence.sourceCentreKm';transformation='PARSE_EXPLICIT_UNIT_ONLY_NOT_SELECTED_LOCATION';}
      if (['beds','roomCapacity','capacity','scenarioNeeds','exclusiveUse','childrenPolicy'].includes(field.key)) {target='accommodationEvidence.notImplementedInExecutableContract';transformation='NO_INFERRED_BED_COUNTS_OR_HARD_CONSTRAINT_PASS';}
      if (field.key==='availability') {target='offer.bookable';transformation='NOT_MAPPABLE_OBSERVED_AVAILABILITY_IS_NOT_BOOLEAN_BOOKABILITY';}
      if (['taxDisplay','taxesIncluded','taxesExcluded','priceUnit'].includes(field.key)) {target='priceEvidence';transformation='RETAIN_OBSERVATION_NO_TAX_OR_CHECKOUT_CERTIFICATION';}
      mapping.push({alternativeId:alt.id,field:field.key,source:field.originalField??field.key,
        value:structuredClone(field.value),target,transformation,evidence:refs});
    }
    candidates.push({alternativeId:alt.id,offerBinding:{roomName:structuredClone(value(alt,'roomName')),
      rateName:structuredClone(value(alt,'rateName')),selectedRateEvidence:structuredClone(value(alt,'selection')),
      priceEvidence:structuredClone(value(alt,'displayedPrice')),cancellationEvidence:structuredClone(value(alt,'cancellation')),
      galleryNotMergedIntoSelectedRate:true},
      sourceCentreKm:observedCenterDistanceKm(value(alt,'distance')),
      projectedRating:known(value(alt,'ratingScale'))===null?null:{observed:known(value(alt,'rating')),scale:known(value(alt,'ratingScale'))},
      policyTotalCost:known(value(alt,'completeTotal')),
      priceSemantics:{displayedIsComplete:false,exactBookable:false,verifiedCheckoutTotal:false},
      bookability:'UNKNOWN',
      recommendationFindings:[
        ...(known(value(alt,'completeTotal'))===null?[{code:'COMPLETE_TOTAL_UNKNOWN',effect:'POLICY_INCOMPLETE_NOT_PARSE_ERROR',rule:'intentRolePolicyBridgeV3.prepare: totalCost only reported-complete; personalUtilityRolePolicyV3 comparable requires totalCost'}]:[]),
        {code:'BOOKABILITY_UNVERIFIED',effect:'EXECUTABLE_BOOLEAN_CANNOT_BE_INFERRED',rule:'HotelOffer.bookable; reliabilityGate no-bookable-offer; createSingleSolution requires bookable'},
      ],
      retainedObservations:structuredClone(alt.fields)});
  }
  // This version supports the reviewed public-display source, NOT a general
  // canonical input serializer. Resolve these boundary gaps before assembling
  // Hotel DTOs; neither `bookable=false` nor invented coordinates are neutral.
  const executionBlockers=[
    {code:'SOURCE_CENTRE_NOT_SELECTED_LOCATION',kind:'EVIDENCE_AND_BOUNDARY',
      rule:'intentRolePolicyBridgeV3.assertContext requires selectedLocation for strong-preference; locationEngine reconciles its geographic reference',
      remedy:'Verified common reference and coordinates, or a separately specified source-reference distance boundary. No generic tolerance.'},
    {code:'OBSERVED_AVAILABILITY_NOT_BOOKABILITY',kind:'EVIDENCE_AND_BOUNDARY',
      rule:'HotelOffer.bookable is boolean; public observation does not establish true or false',
      remedy:'Explicit diagnostic availability contract with unknown, or appropriately authorized verification; do not relabel the source.'},
    ...(s.children?[{code:'CHILD_AGES_NOT_REPRESENTED',kind:'SOFTWARE',
      rule:'SmartStayEngineV2SearchInput/StayScopeV3 retains children count, not ages',
      remedy:'Preserve ages and age-dependent offer scope at the evaluation boundary, without inventing capacity.'}]:[]),
    ...(s.needs?.some(n=>n.essential===true)?[{code:'ESSENTIAL_SLEEPING_CONFIGURATION_NOT_EVALUATED',kind:'SOFTWARE_AND_OFFER_EVIDENCE',
      rule:'Comfort mandatory requirements accept unit/feature codes, not validated sleeping places for the requested party',
      remedy:'Typed per-offer sleeping configuration/unknown constraint. Capacity text is supporting evidence, not a computed verification.'}]:[]),
  ];
  const projection={schemaVersion:REVIEWED_INTENT_ASSESSMENT_VERSION,caseId:packet.caseId,
    kind:'NON_EXECUTABLE_REVIEWED_FIELD_PROJECTION',classification:'DIAGNOSTIC_ONLY',
    sourceBinding:{packetHash:state.packetHash,codeHash,revision:state.revision,lastEventHash:state.lastEventHash,
      contentFingerprint:fingerprint(state),preparedInputSha256,originalManifestSha256},
    query:{preferenceId:'balanced',profileOrigin:'manual',selectedIndex:2,totalBudget:s.budgetTotal,currency:s.currency,
      checkIn:s.checkIn,checkOut:s.checkOut,nights:s.nights,adults:s.adults,children:s.children,rooms:s.rooms},
    requiredScopeNotDropped:{childAges:structuredClone(s.childAgesAtStay),essentialNeeds:structuredClone(s.needs??[])},
    contexts:contexts.map(c=>({contextId:c.contextId,semantics:'strong-preference',kilometers:c.distancePreference.kilometers,
      reference:'SOURCE_CENTRE_UNVERIFIED_AGAINST_SELECTED_LOCATION',generalToleranceKm:null,distanceException:null,
      prospectivelyFrozen:false,independentCase:false})),candidates};
  return {projection,projectionFingerprint:hash(projection),mapping,missingness,
    status:'NON_EXECUTABLE',engineInput:null,engineExecuted:false,executionBlockers,
    roleCoverage:{bestChoice:'SEPARATELY_COMPARABLE_ONLY_AFTER_FAITHFUL_INPUT',bestOverBudget:'UNMAPPED_NOT_UPGRADE'},
    caseCount:1,contextCount:contexts.length,reviewConfirmed:state.reviewConfirmed,
    humanReview:state.humanReview,automaticGoldenAdmission:false,blindJudgment:false,
    comparisonResult:null,abstentionObserved:false,
    limitation:'No engine result is inferred from this assessment. Complete-price/rating UNKNOWN are not universal parser blockers.'};
}
