import {applyStrongDistancePreferenceV3} from './strongDistancePreferenceV3';
// Evaluation-only bridge. No public registry/export, transport, or real-data runner.
import { evaluateSmartStaySearchV2, type SmartStayEngineV2SearchInput } from '../../engine-v2/orchestrator/smartStayEngineV2';
import { resolveMarketRelativeAutomaticPreferenceV2 } from '../../engine-v2/intent/marketRelativePreferenceV2';
import { evaluateComfortFlexibilityV2 } from '../../engine-v2/comfort/comfortFlexibilityEngine';
import { adaptV2SearchResultToDecisionV3 } from '../adapter/v2CompatibilityAdapterV3';
import { resolveEvaluatedOfferV3 } from '../adapter/evaluatedOfferBindingV3';
import { createStableHashV3 } from '../contract/stableHashV3';
import {resolveStayExpectationV3,resolveOfferPrivacyV3,evaluateStaySuitabilityV3} from './staySuitabilityContextV3';
import { runPersonalUtilityRolePolicyV3, validatePersonalUtilityRolePolicyV3,
  type RunStayOptiPersonalUtilityRolePolicyInputV3, type StayOptiRolePolicySolutionInputV3,
} from '../policy/personalUtilityRolePolicyV3';

export const INTENT_ROLE_BRIDGE_VERSION = 'stayopti.evaluation.intent-role-bridge@3' as const;
export interface IntentRoleBridgeInputV3 {
  caseId: string;
  search: SmartStayEngineV2SearchInput;
  profileOrigin: 'manual' | 'automatic';
  distance: {
    semantics: 'not-requested' | 'mandatory-cap' | 'strong-preference';
    reference: 'selected-location';
    provenance: string;
  };
  // A case-specific exception, not a tolerance in km. Opaque IDs are lookup only.
  distanceException?: {
    hotelId: string;
    comparedWithHotelId: string;
    dimension: 'quality' | 'comfort' | 'room';
    reason: 'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED';
    evidenceIds: string[];
  };
}

function assertContext(input: IntentRoleBridgeInputV3) {
  const s = input.search;
  if (!input.caseId || !['manual', 'automatic'].includes(input.profileOrigin) ||
      !Number.isFinite(s.totalBudget) || !(s.totalBudget! > 0) ||
      !Number.isInteger(s.nights) || !(s.nights! > 0) ||
      !Number.isInteger(s.rooms) || !(s.rooms! > 0) || !s.currency ||
      s.hotels.length < 2 || new Set(s.hotels.map(h => h.id)).size !== s.hotels.length) {
    throw new Error('INTENT_CONTEXT_INVALID');
  }
  if (!['not-requested', 'mandatory-cap', 'strong-preference'].includes(input.distance.semantics) ||
      input.distance.reference !== 'selected-location' || !input.distance.provenance.trim()) throw new Error('DISTANCE_SEMANTICS_REQUIRED');
  if (input.distance.semantics === 'not-requested' ? s.maximumDistanceKm != null :
      !(Number.isFinite(s.maximumDistanceKm) && s.maximumDistanceKm! > 0 && s.selectedLocation)) {
    throw new Error('DISTANCE_SCOPE_MISMATCH');
  }
  if (input.distanceException && input.distance.semantics !== 'strong-preference') throw new Error('HARD_CAP_EXCEPTION_FORBIDDEN');
}

function resolveSource(input: IntentRoleBridgeInputV3) {
  const requested = {...input.search, preferenceSource: input.profileOrigin};
  const preliminary = evaluateSmartStaySearchV2(input.profileOrigin === 'automatic'
    ? {...requested, preferenceId: 'balanced', selectedIndex: 2} : requested);
  const resolution = resolveMarketRelativeAutomaticPreferenceV2({
    preferenceId: requested.preferenceId, selectedIndex: requested.selectedIndex,
    preferenceSource: input.profileOrigin, budgetIntent: preliminary.budgetIntent,
  });
  // Same resolver and frozen-market second pass as the existing frontend.
  // Explicit accommodation requirements are retained (not dropped by a view DTO).
  const search = {...requested, preferenceId: resolution.effectivePreferenceId, selectedIndex: resolution.effectiveSelectedIndex};
  if (input.profileOrigin === 'automatic' && resolution.source !== 'absolute-fallback' && resolution.effectiveSelectedIndex !== 2) {
    const mode = requested.marketContextMode ?? 'hybrid';
    const observations = [
      ...(mode === 'hybrid' || mode === 'local-only' ? requested.marketContextObservations ?? [] : []),
      ...(mode === 'hybrid' || mode === 'current-search' ? preliminary.marketContext.generatedObservations : []),
    ];
    search.marketContextMode = 'local-only';
    search.marketContextObservations = [...new Map(observations.filter(o => o.id?.trim()).map(o => [o.id,o])).values()]
      .sort((a,b) => a.id.localeCompare(b.id));
  }
  const result = input.profileOrigin === 'manual' || (input.profileOrigin === 'automatic' && resolution.effectiveSelectedIndex === 2)
    ? preliminary : evaluateSmartStaySearchV2(search);
  return {search, result, resolution};
}

function prepare(input: IntentRoleBridgeInputV3) {
  assertContext(input);
  const {search, result, resolution} = resolveSource(input);
  const legacy = adaptV2SearchResultToDecisionV3({searchInput: search, result});
  const intent = result.budgetIntent;
  const stayExpectation=resolveStayExpectationV3(search,intent);
  const candidates = result.evaluations.map(e => {
    const selected = resolveEvaluatedOfferV3(result, e.hotel.id);
    const suitability=evaluateStaySuitabilityV3(stayExpectation,resolveOfferPrivacyV3(e.hotel,selected?.roomName,selected?.offerId??null));
    const solution = legacy.solutions.find(s => s.kind === 'single' && s.segments[0].hotelId === e.hotel.id);
    const snapshot = legacy.integrity.offerSnapshots.find(s => s.hotelId === e.hotel.id && s.offerId === selected?.offerId);
    // Offer privacy can differ from a property's inventory (e.g. a private room
    // in a hostel). Preserve the existing hotel/private room fit equivalence
    // for hotel inventory; never borrow a shared inventory fit for a private offer.
    const boundUnit=suitability.facts.unitType==='private-room'&&e.accommodation.unitType==='hotel-room'?
      'hotel-room':suitability.facts.unitType;
    const comfort = evaluateComfortFlexibilityV2({targetHotelId: e.hotel.id,
      accommodation:{...e.accommodation,unitType:boundUnit,evidenceIds:suitability.facts.unitEvidenceIds},
      evidence: e.evidence, reliabilityGate: e.reliabilityGate,
      stayContext: {nights: search.nights, adults: search.adults, children: search.children, rooms: search.rooms, tripProfile: search.tripProfile},
      preferences: search.comfortPreferences});
    const mandatory={...comfort.mandatoryRequirements,
      unmetFeatureCodes:[...comfort.mandatoryRequirements.unmetFeatureCodes],
      unverifiedFeatureCodes:[...comfort.mandatoryRequirements.unverifiedFeatureCodes]};
    // A known nonprivate offer violates a required private unit, but does not
    // identify any specific shared unit type. Unknown/conflicting remains unverified.
    const requiredUnits=search.comfortPreferences?.requiredUnitTypes??[];
    if(suitability.facts.unitState==='NOT_PRIVATE'&&requiredUnits.length&&!requiredUnits.includes('shared-room'))
      mandatory.requiredUnitTypeStatus='unmet';
    if(search.comfortPreferences?.requiredFeatureCodes?.includes('private-bathroom')){
      mandatory.unmetFeatureCodes=mandatory.unmetFeatureCodes.filter(c=>c!=='private-bathroom');
      mandatory.unverifiedFeatureCodes=mandatory.unverifiedFeatureCodes.filter(c=>c!=='private-bathroom');
      if(['UNKNOWN','CONFLICTING'].includes(suitability.facts.bathroomState))mandatory.unverifiedFeatureCodes.push('private-bathroom');
      else if(suitability.facts.bathroomState!=='PRIVATE')mandatory.unmetFeatureCodes.push('private-bathroom');
    }
    const mandatoryStatus=mandatory.unmetFeatureCodes.length||mandatory.requiredUnitTypeStatus==='unmet'?'exceeded':
      mandatory.unverifiedFeatureCodes.length||mandatory.requiredUnitTypeStatus==='unverified'?'unknown':'satisfied';
    mandatory.satisfied=mandatoryStatus==='satisfied';
    const applicable=e.constraints.filter(c=>c.code==='mandatory-accommodation-requirements'||
      (c.code==='maximum-distance'&&input.distance.semantics==='mandatory-cap')).map(c=>
      c.code==='mandatory-accommodation-requirements'&&c.status!=='not-set'?{...c,status:mandatoryStatus,actualValue:mandatory.satisfied,
        evidenceIds:[...c.evidenceIds,...suitability.facts.evidenceReferences]}:c);
    const missing = applicable.filter(c => c.status === 'unknown').map(c => `intent:unverified:${c.code}`);
    const violated = applicable.filter(c => c.status === 'exceeded').map(c => `intent:violated:${c.code}`);
    // Not true by default: constraint evaluations must exist, even when not-set.
    if (!applicable.some(c => c.code === 'mandatory-accommodation-requirements')) missing.push('intent:constraints-not-evaluated');
    if (input.distance.semantics === 'mandatory-cap' && !applicable.some(c => c.code === 'maximum-distance')) missing.push('intent:distance-not-evaluated');
    const hard = violated.length ? false : missing.length ? null : true;
    const target = intent.candidateEvaluations.find(c => c.hotelId === e.hotel.id);
    const reasons = [...missing, ...violated];
    let contextStatus: 'eligible' | 'ineligible' | 'incomplete' = 'eligible';
    if (intent.policy.active && intent.policy.experienceTargetRequired) {
      if (!target || target.experienceScore === null || intent.targetExperienceFloor === null || target.experienceTier === 'unknown') {
        contextStatus = 'incomplete'; reasons.push('intent:experience-target-unverified');
      } else if (!target.reasonCodes.includes('experience-floor-satisfied') || !target.reasonCodes.includes('experience-tier-floor-satisfied')) {
        contextStatus = 'ineligible'; reasons.push('intent:experience-target-not-met');
      } else reasons.push('intent:experience-target-met');
    }
    // Known privacy facts do not disappear when the V2 leisure/mixed fit is null.
    // This is contextual eligibility, NOT a fabricated human hard requirement or
    // a numeric quality penalty. Existing costs, profile weights and F3 stay intact.
    reasons.push(...suitability.reasonCodes.map(code=>`intent:${code}`));
    if(suitability.status==='ineligible')contextStatus='ineligible';
    else if(suitability.status==='incomplete'&&contextStatus!=='ineligible')contextStatus='incomplete';
    const dim = (key: 'quality' | 'comfort' | 'location' | 'flexibility') => ({score: e.scores[key].score, evidenceIds: [...e.scores[key].evidenceIds]});
    const policy: StayOptiRolePolicySolutionInputV3 = {
      solutionId: solution?.solutionId ?? `intent-unresolved:${e.hotel.id}`, solutionType: 'single-stay',
      totalCost: solution?.totalCost.completeness === 'reported-complete' ? solution.totalCost.amount : null,
      currency: search.currency!, hardConstraintsSatisfied: hard,
      offerIntegrity: !e.reliabilityGate.eligible || selected?.bookable === false ? 'invalid' :
        solution?.feasibility === 'feasible' && snapshot?.scope.status === 'exact' ? 'verified' : 'partial',
      contextualEligibility: {version: 'stayopti.intent-context-eligibility@1', status: contextStatus, reasonCodes: reasons},
      dimensions: {quality: dim('quality'), comfort: dim('comfort'), location: dim('location'), flexibility: dim('flexibility'),
        room: {score: comfort.unitType.unitType === 'unknown' ? null : comfort.unitType.score, evidenceIds: comfort.unitType.evidenceIds},
        'long-stays': {score: search.nights! >= 7 ? comfort.dimensions.practicality.score : null, evidenceIds: comfort.dimensions.practicality.evidenceIds}},
      evidenceIds: e.evidence.map(f => f.id),
    };
    if (solution?.totalCost.currency && solution.totalCost.currency !== search.currency) throw new Error('INTENT_CURRENCY_MISMATCH');
    return {hotelId: e.hotel.id, policy, selectedOffer: selected, snapshot: snapshot ?? null,suitability,
      accommodation: e.accommodation, mandatoryRequirements: mandatory,applicableConstraints:applicable,
      target: target ?? null, constraints: e.constraints,
      distance: e.constraints.find(c => c.code === 'maximum-distance') ?? null,
      mapping: {categoryFit: 'CLASSIFICATION_CONFIDENCE_AUDIT_ONLY', room: 'V2_CONTEXTUAL_UNIT_TYPE_FIT_NOT_ROOM_LUXURY',
        longStays: 'V2_PRACTICALITY_WHEN_SEVEN_OR_MORE_NIGHTS', missing: 'NULL_NOT_FALSE_OR_ZERO',
        roomAttributes: selected?.roomName ?? null} as const};
  });
  const policyInput: RunStayOptiPersonalUtilityRolePolicyInputV3 = {caseId: input.caseId, profile: resolution.effectivePreferenceId,
    totalBudget: search.totalBudget!, currency: search.currency!, nights: search.nights!, solutions: candidates.map(c => c.policy)};
  if (input.distance.semantics === 'strong-preference') applyStrongDistancePreferenceV3(candidates,policyInput,input.distanceException);
  return {search, result, resolution, candidates, policyInput, legacy,stayExpectation};
}

export function runIntentRolePolicyBridgeV3(input: IntentRoleBridgeInputV3) {
  const prepared = prepare(input);
  const decision = runPersonalUtilityRolePolicyV3(prepared.policyInput);
  if (!validatePersonalUtilityRolePolicyV3(decision).valid) throw new Error('INTENT_POLICY_OUTPUT_INVALID');
  // Same policy, recomputed intent/eligibility, existing +/-10% budget scenarios.
  // Deliberately not the legacy weighted-utility robustness or a promotion PASS.
  const robustness = [0.9, 1.1].map(multiplier => {
    let probe: ReturnType<typeof prepare>;
    try { probe = prepare({...input, search: {...input.search, totalBudget: input.search.totalBudget! * multiplier}}); }
    catch (error) {
      // An accepted baseline exception may no longer have an admissible reference
      // under the changed budget. Do not invent a substitute or fail the baseline.
      if (!(error instanceof Error) || error.message !== 'DISTANCE_EXCEPTION_UNSUPPORTED') throw error;
      return {scenario: multiplier < 1 ? 'budget-tight' : 'budget-relaxed', multiplier, policyVersion: decision.policyVersion,
        computationStatus: 'NOT_EXECUTED_CONTEXT_CHANGED', reason: error.message, bestChoice: null, status: null, fingerprint: null};
    }
    const output = runPersonalUtilityRolePolicyV3(probe.policyInput);
    return {scenario: multiplier < 1 ? 'budget-tight' : 'budget-relaxed', multiplier, policyVersion: output.policyVersion,
      computationStatus: 'EXECUTED', reason: null, bestChoice: output.portfolio.bestChoice, status: output.status, fingerprint: output.fingerprint};
  });
  return {
    version: INTENT_ROLE_BRIDGE_VERSION, scope: 'OFFLINE_EVALUATION_ONLY' as const,
    inputFingerprint: createStableHashV3(input, INTENT_ROLE_BRIDGE_VERSION),
    profile: prepared.resolution,
    stayExpectation:prepared.stayExpectation,
    intent: {budgetBasis: 'PER_ROOM_NIGHT' as const, totalBudget: prepared.search.totalBudget,
      nights: prepared.search.nights, rooms: prepared.search.rooms, budgetPerRoomNight: prepared.result.budgetIntent.budgetPerRoomNight,
      market: prepared.result.budgetIntent.market, targetExperienceFloor: prepared.result.budgetIntent.targetExperienceFloor,
      targetExperienceTier: prepared.result.budgetIntent.targetExperienceTier, active: prepared.result.budgetIntent.policy.active,
      provenance: 'V2_BUDGET_INTENT_EVALUATED_SAME_OFFERS', aspirationalPricePercentileVetoImported: false,
      explicitPreferences: prepared.search.comfortPreferences ?? null, distance: input.distance,
      maximumDistanceKm: prepared.search.maximumDistanceKm ?? null, distanceException: input.distanceException ?? null},
    candidates: prepared.candidates, policyInput: prepared.policyInput, decision,
    contextualExplanation: {
      policyVersion: decision.policyVersion,
      roles: Object.fromEntries(Object.entries(decision.portfolio).map(([role, selection]) => [role, {
        policyExplanation: selection.explanation,
        alternatives: prepared.candidates.filter(c => selection.equivalentSolutionIds.includes(c.policy.solutionId)).map(c => ({
          solutionId: c.policy.solutionId, intentReasons: c.policy.contextualEligibility!.reasonCodes,
          distanceSemantics: input.distance.semantics, actualDistanceKm: c.distance?.actualValue ?? null,
          requestedMaximumKm: prepared.search.maximumDistanceKm ?? null,
          excessKm: typeof c.distance?.actualValue === 'number' && prepared.search.maximumDistanceKm != null ?
            Math.max(0, c.distance.actualValue - prepared.search.maximumDistanceKm) : null,
          exceptionIsCaseSpecific: c.policy.contextualEligibility!.reasonCodes.includes('intent:explicit-distance-exception-with-evidence'),
        })),
      }])),
      abstentionReasons: decision.status === 'abstained' ? prepared.candidates.map(c => ({solutionId:c.policy.solutionId,
        reasons:[...c.policy.contextualEligibility!.reasonCodes,...decision.candidates.find(x=>x.solutionId===c.policy.solutionId)!.reasonCodes]})) : [],
    },
    robustness: {scope: 'BOUNDED_BUDGET_SENSITIVITY_SAME_POLICY_NOT_FULL_ROBUSTNESS', scenarios: robustness,
      fullRobustness: 'NOT_AVAILABLE', regret: 'NOT_AVAILABLE', promotionGatePassed: false},
    legacyDiagnostic: {utility: prepared.legacy.personalization.utilityEvaluations,
      robustness: prepared.legacy.robustness, selectedByV2: prepared.result.recommendationRoles.picks},
    legacyOutputUsedForNewSelection: false, publicIntegrationEnabled: false,
    realDataExecutionAuthorized: false, goldenAdmission: false,
    limitations: ['Room dimension is contextual unit-type fit, not measured privacy/room luxury.',
      'V2 intent aggregate retains its historical classification-confidence term; no premium inference is added.',
      'Experience floor is conservatively common to all roles in this candidate; role-specific relaxation is not invented.',
      'Full multi-axis robustness and regret require a separately validated role-policy implementation.'],
  };
}
