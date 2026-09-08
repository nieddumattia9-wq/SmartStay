import { initialReview, applyReview, fingerprint, sha256, json, VERSION } from './diagnostic-transcription-review-v1.mjs';

// Preparation only. No engine, provider, custody, journal writer or filesystem import.
export const ROLE_FEEDBACK_BRIDGE_VERSION = 'stayopti.diagnostic-role-feedback-preparation@1';
const HASH=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code);};
const hash=value=>sha256(json(value));
const same=(a,b)=>json(a)===json(b);
const FIELDS=['currency','stay','occupancy','category','stars','rating','ratingScale','reviewCount','location','distance','roomName','rateName','beds','capacity','roomCapacity','exclusiveUse','displayedPrice','priceUnit','completeTotal','taxDisplay','taxesIncluded','taxesExcluded','payNow','payAtProperty','paymentTiming','deposit','mealPlan','breakfast','refundable','refundability','cancellation','cancellationDeadline','deadlineTimezone','roomServices','propertyServices','availability','childrenPolicy','importantConditions'];

export function verifyReviewedTranscription(packet, events, codeHash) {
  let state=initialReview(packet,codeHash);
  if (!Array.isArray(events)||!events.length) fail('FEEDBACK_HISTORY_EMPTY');
  for(const [index,event] of events.entries()){
    const {eventHash,...body}=event;
    if(event.schemaVersion!==VERSION||event.ordinal!==index+1||event.packetHash!==state.packetHash||event.codeHash!==codeHash||event.previousHash!==state.lastEventHash||hash(body)!==eventHash||!Number.isFinite(Date.parse(event.recordedAt))||event.actor!==(packet.mode==='SYNTHETIC_TEST'?'SYNTHETIC_TEST':'LOCAL_HUMAN_TRANSCRIPTION')) fail('FEEDBACK_HISTORY_INVALID');
    state=applyReview(state,event.action,packet);state.lastEventHash=eventHash;
  }
  if(!state.reviewConfirmed||state.humanReview!=='TRANSCRIPTION_REVIEWED_DIAGNOSTIC_ONLY') fail('FEEDBACK_TRANSCRIPTION_NOT_CONFIRMED');
  return state;
}

export function observedCenterDistanceKm(wrapper){
  if(wrapper?.status!=='KNOWN'||typeof wrapper.value!=='string')return null;
  // Only explicit distance to centre; landmarks, approximations and ranges stay unmapped.
  const match=/^\s*(\d+(?:[.,]\d+)?)\s*(km|m)\s+dal centro\s*$/i.exec(wrapper.value);
  if(!match)return null;
  return Number(match[1].replace(',','.'))/(match[2].toLowerCase()==='m'?1000:1);
}

export function prepareDiagnosticRoleFeedback({packet,events,codeHash,reviewArchiveSha256,feedback,feedbackSha256,originalManifestSha256,budgetMinorUnits,currency}){
  for(const digest of [codeHash,reviewArchiveSha256,feedbackSha256,originalManifestSha256])if(!HASH.test(digest))fail('FEEDBACK_HASH_REQUIRED');
  if(hash(feedback)!==feedbackSha256)fail('FEEDBACK_CONTENT_HASH_MISMATCH');
  const state=verifyReviewedTranscription(packet,events,codeHash),binding=feedback.sourceBinding;
  if(feedback.documentType!=='ASSISTANT_RECORD_OF_USER_DIAGNOSTIC_ROLE_FEEDBACK'||feedback.noteRevision!==2||feedback.activeInterpretation!==true||feedback.classification!=='DIAGNOSTIC_ONLY'||feedback.caseId!==packet.caseId||feedback.roleLabelsAreUserFeedbackNotEngineOutput!==true)fail('FEEDBACK_SCOPE_INVALID');
  const expected={sourceFinalArchiveSha256:reviewArchiveSha256,sourcePacketSha256:state.packetHash,sourceCodeManifestSha256:codeHash,sourceReviewLastEventHash:state.lastEventHash,sourceContentFingerprint:fingerprint(state),sourceReviewRevision:state.revision,sourceReviewStatus:state.humanReview,originalScenarioManifestSha256:originalManifestSha256};
  if(!binding||Object.entries(expected).some(([k,v])=>binding[k]!==v))fail('FEEDBACK_REVIEW_BINDING_MISMATCH');
  if(feedback.scope?.variantsFormulatedAfterObservingOffers!==true||feedback.scope?.originalScenarioModified!==false||feedback.scope?.independentBlindJudgment!==false||feedback.scope?.goldenAdmission!==false||feedback.distancePolicyAsClarifiedByUser?.numericExceptionTolerance!==null||!HASH.test(feedback.supersedes?.archiveSha256)||feedback.supersedes?.noteRevision!==1)fail('FEEDBACK_POSTHOC_SCOPE_INVALID');
  if(!Number.isSafeInteger(budgetMinorUnits)||budgetMinorUnits<=0||!/^[A-Z]{3}$/.test(currency)||currency!==packet.scenario.currency)fail('FEEDBACK_BUDGET_INVALID');
  const variants=feedback.scenarioRoleAssignments;
  if(!Array.isArray(variants)||variants.length!==2||new Set(variants.map(v=>v.distanceReferenceKm)).size!==2)fail('FEEDBACK_VARIANTS_INVALID');
  const byId=new Map(state.alternatives.map(a=>[a.id,a]));
  const validateRole=role=>{
    if(!role||!byId.has(role.alternativeId))fail('FEEDBACK_ALTERNATIVE_REFERENCE_INVALID');
    const name=byId.get(role.alternativeId).fields.find(f=>f.key==='propertyName')?.value;
    if(role.name!==undefined&&name?.status==='KNOWN'&&typeof name.value==='string'&&role.name.normalize('NFC')!==name.value.normalize('NFC'))fail('FEEDBACK_ALTERNATIVE_NAME_MISMATCH');
  };
  validateRole(feedback.bestChoiceAcrossTheTwoStatedDistanceVariants);
  for(const variant of variants){
    if(typeof variant.distanceReferenceKm!=='number'||!Number.isFinite(variant.distanceReferenceKm)||variant.distanceReferenceKm<=0)fail('FEEDBACK_DISTANCE_INVALID');
    validateRole(variant.bestChoice);
    if(variant.bestChoice.alternativeId!==feedback.bestChoiceAcrossTheTwoStatedDistanceVariants.alternativeId)fail('FEEDBACK_ROLE_CONTRADICTION');
    if(variant.bestOverBudget!==null)validateRole(variant.bestOverBudget);
    else if(variant.bestOverBudgetStatus!=='NOT_ASSIGNED_BY_USER_FOR_THIS_VARIANT')fail('FEEDBACK_NULL_ROLE_AMBIGUOUS');
  }
  const refs=new Set(packet.proofs.map(p=>p.ref));
  for(const note of feedback.assistantFactualNotes||[])if(!Array.isArray(note.evidenceRefs)||note.evidenceRefs.some(ref=>!refs.has(ref)))fail('FEEDBACK_PROOF_REFERENCE_INVALID');
  const missingness=state.alternatives.flatMap(a=>a.fields.filter(f=>f.value.status==='UNKNOWN').map(f=>({alternativeId:a.id,field:f.key,critical:f.critical===true,reason:f.value.unknownReason||f.value.reason,evidenceRefs:[...f.value.evidenceRefs]})));
  const engineFields=state.alternatives.map(a=>({alternativeId:a.id,fields:a.fields.filter(f=>FIELDS.includes(f.key)).map(f=>({key:f.key,value:structuredClone(f.value),sourceKind:f.sourceKind})),distanceNormalization:{sourceField:'distance',kilometers:observedCenterDistanceKm(a.fields.find(f=>f.key==='distance')?.value),reference:'EXPLICIT_SOURCE_CENTRE_ONLY'},priceClaims:{exactBookable:false,verifiedCheckoutTotal:false,displayedPriceIsCompleteTotal:false}}));
  const input={schemaVersion:ROLE_FEEDBACK_BRIDGE_VERSION,caseId:packet.caseId,classification:'DIAGNOSTIC_ONLY',originalScenario:structuredClone(packet.scenario),originalScenarioManifestSha256:originalManifestSha256,alternatives:engineFields,postObservationContexts:variants.map(v=>({contextId:`DISTANCE_PREFERENCE_${v.distanceReferenceKm}_KM`,budgetMinorUnits,currency,distancePreference:{kilometers:v.distanceReferenceKm,semantics:'STRONG_PREFERENCE_WITH_JUSTIFIED_EXCEPTIONS',hardMaximum:false,generalToleranceKm:null},prospectivelyFrozen:false,independentCase:false})),engineInputType:'PREPARATION_NOT_STAYOPTI_DECISION_INPUT'};
  const inputHash=hash(input);
  const feedbackRecord={schemaVersion:ROLE_FEEDBACK_BRIDGE_VERSION,sourceFeedbackSha256:feedbackSha256,noteRevision:2,supersedes:structuredClone(feedback.supersedes),qualification:packet.mode==='SYNTHETIC_TEST'?'SYNTHETIC_DIAGNOSTIC_FEEDBACK':'EXPOSED_HUMAN_DIAGNOSTIC_FEEDBACK_RECORDED_BY_ASSISTANT',humanIdentityIndependentlyVerified:false,blind:false,expert:false,caseCount:1,variantCount:2,inputFingerprint:inputHash,assignments:variants.map(v=>({contextId:`DISTANCE_PREFERENCE_${v.distanceReferenceKm}_KM`,bestChoice:structuredClone(v.bestChoice),bestOverBudget:structuredClone(v.bestOverBudget),bestOverBudgetStatus:v.bestOverBudget===null?'NOT_ASSIGNED_BY_USER_FOR_THIS_VARIANT':'ASSIGNED_BY_USER',overBudgetDistanceDeviationKm:v.bestOverBudget===null?null:(()=>{const km=observedCenterDistanceKm(byId.get(v.bestOverBudget.alternativeId).fields.find(f=>f.key==='distance')?.value);return km===null?null:Math.round((km-v.distanceReferenceKm)*1e6)/1e6;})(),distanceExceptionJustification:'USER_ROLE_ASSIGNMENT_RETAINED_NOT_A_GENERAL_TOLERANCE',engineRoleMapping:{bestChoice:'best-choice',bestOverBudget:null}})),engineOutput:null};
  const blockers=missingness.filter(m=>m.critical).map(m=>({code:'MISSING_REVIEWED_CRITICAL_FIELD',alternativeId:m.alternativeId,field:m.field,reason:m.reason}));
  for(const a of state.alternatives)for(const key of ['completeTotal','ratingScale'])if(!a.fields.some(f=>f.key===key))blockers.push({code:'REQUIRED_FIELD_ABSENT',alternativeId:a.id,field:key});
  return {diagnosticInput:input,diagnosticInputFingerprint:inputHash,feedbackRecord,reviewedObservations:structuredClone(state.alternatives),missingness,bindings:expected,prerequisites:{transcriptionConfirmed:true,feedbackBindingVerified:true,unknownCount:missingness.length,comparisonExecutable:false,dataBlockers:blockers,softwareBlockers:['REAL_REVIEW_TO_CANONICAL_V3_INPUT_NOT_IMPLEMENTED','POSTHOC_SOFT_DISTANCE_POLICY_MAPPING_NOT_VALIDATED','BEST_OVER_BUDGET_IS_NOT_CANONICAL_V3_ROLE'],existingContracts:{transcription:VERSION,prospectiveBridge:'SYNTHETIC_ONLY_ENGINE_REPLAY_DISABLED',v3Compatibility:'AdaptV2SearchResultToDecisionV3Input requires canonical V2 searchInput/result, not a review packet',externalReplay:'ExternalHotelChoiceSessionV3 is not created: no license/observational labels/complete session inferred'},researchCompleteness:'NOT_CERTIFIED',custody:'NOT_ASSESSED_NOT_REQUIRED_FOR_THIS_PREPARATION',blindEligibility:false,goldenAdmission:false,engineExecuted:false}};
}
