// Evaluation-only suitability, not a change to the public V2 preference resolver.
import {classifyAccommodationV2} from '../../engine-v2/categories/accommodationCategoryModel';
import type {SmartStayBudgetIntentEvaluationV2} from '../../engine-v2/intent/budgetIntentEngine';
import type {SmartStayEngineV2SearchInput} from '../../engine-v2/orchestrator/smartStayEngineV2';
import type {SmartStayUnitType} from '../../engine-v2/model/smartStayEvaluationV2';
import type {Hotel} from '../../types/hotel';

export const STAY_SUITABILITY_VERSION='stayopti.evaluation.stay-suitability@1' as const;
type PrivacyState='PRIVATE'|'SHARED'|'NOT_PRIVATE'|'UNKNOWN'|'CONFLICTING';
function normalize(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}

// Reuse canonical unit types/rules, excluding brand/category inference. Only the
// evaluated offer's room text, then explicit features, may support its privacy.
// A few bounded room adjectives are accepted; this is not an unrestricted NLP parser.
export function resolveOfferPrivacyV3(hotel:Hotel,roomName:string|null|undefined,offerId:string|null) {
  const classify=(values:string[])=>classifyAccommodationV2({hotel:{id:hotel.id,name:'',provider:hotel.provider,
    amenities:values.map(t=>normalize(t).replace(/\bprivate (?:double |superior |single |twin |standard |deluxe ){1,3}room\b/g,'private room')),
    facilities:[]},explicitCategory:'unknown'});
  const offered=classify(roomName?[roomName]:[]),features=classify([...hotel.amenities,...hotel.facilities]);
  // Conflicting explicit offer evidence cannot fall back to a reassuring property feature.
  const conflict=offered.evidence.some(e=>e.availability==='conflicting');
  const fromOffer=conflict||offered.profile.unitType!=='unknown';
  const chosen=fromOffer?offered:features;
  const unit:SmartStayUnitType=chosen.profile.unitType;
  const unitState:PrivacyState=chosen.evidence.some(e=>e.availability==='conflicting')?'CONFLICTING':
    unit==='unknown'?'UNKNOWN':unit==='shared-room'?'SHARED':'PRIVATE';
  const bathroom=(texts:string[]):PrivacyState=>{
    const t=texts.map(normalize).join(' | ');
    const shared=/\b(shared bathroom|communal bathroom|bagno condiviso)\b/.test(t);
    const negative=/\b(no private bathroom|without private bathroom|senza bagno privato)\b/.test(t);
    const positive=/\b(private bathroom|bagno privato|en suite bathroom)\b/.test(t.replace(/\b(no private bathroom|without private bathroom|senza bagno privato)\b/g,''));
    return positive&&(negative||shared)?'CONFLICTING':shared?'SHARED':negative?'NOT_PRIVATE':positive?'PRIVATE':'UNKNOWN';
  };
  const offerBath=bathroom(roomName?[roomName]:[]),bathFromOffer=offerBath!=='UNKNOWN';
  const bath=bathFromOffer?offerBath:bathroom([...hotel.amenities,...hotel.facilities]);
  return {version:STAY_SUITABILITY_VERSION,unitType:unit,unitState,bathroomState:bath,
    unitSource:fromOffer?'EVALUATED_OFFER_ROOM_TEXT':'DOCUMENTED_FEATURES_OR_UNKNOWN',
    bathroomSource:bathFromOffer?'EVALUATED_OFFER_ROOM_TEXT':'DOCUMENTED_FEATURES_OR_UNKNOWN',
    offerId, // Opaque F3 binding only; never a comparator.
    unitEvidenceIds:chosen.profile.evidenceIds,
    evidenceReferences:[`${hotel.id}:${offerId??'unknown-offer'}:roomName`,`${hotel.id}:amenities|facilities`],
    limitations:['Feature evidence is not an independent room inspection','Unrecognized text stays UNKNOWN',
      'Property category and name do not certify room or bathroom privacy']};
}

export function resolveStayExpectationV3(search:SmartStayEngineV2SearchInput,intent:SmartStayBudgetIntentEvaluationV2) {
  const p=search.comfortPreferences??{};
  // Same reliability boundary as the existing market-relative resolver. Strong
  // here describes the available comparable sample, never the entire market.
  const marketUsable=intent.status!=='unavailable'&&intent.market.source!=='candidate-fallback'&&
    intent.market.sampleSize>=3&&intent.market.median!==null;
  const strongMarket=marketUsable&&intent.status==='strong-data';
  const explicitShared=[...(p.requiredUnitTypes??[]),...(p.preferredUnitTypes??[])].includes('shared-room');
  const explicitPrivate=(p.requiredUnitTypes?.length??0)>0&&!p.requiredUnitTypes!.includes('shared-room');
  const bathroomRequired=p.requiredFeatureCodes?.includes('private-bathroom')??false;
  const bathroomPreferred=p.preferredFeatureCodes?.includes('private-bathroom')??false;
  const bathroomAvoided=p.avoidedFeatureCodes?.includes('private-bathroom')??false;
  const contextualBathReasons=[
    ...((search.children??0)>0?['CHILDREN_PRESENT']:[]),
    ...((search.adults??0)>=3?['GROUP_OCCUPANCY']:[]),
    ...(search.tripProfile==='business'?['BUSINESS_CONTEXT']:[]),
    ...((search.nights??0)>=7?['LONG_STAY_CONTEXT']:[]),
    ...(strongMarket&&['premium','luxury'].includes(intent.level)?['STRONG_COMPARABLE_MARKET_PURCHASING_POWER']:[]),
  ];
  const adults=search.adults,children=search.children;
  const occupancyKnown=Number.isInteger(adults)&&adults!>0&&Number.isInteger(children)&&children!>=0;
  const guests=occupancyKnown?adults!+children!:null;
  return {version:STAY_SUITABILITY_VERSION,preferenceId:search.preferenceId,preferenceSource:search.preferenceSource,
    explicitPreferences:p,unitExpectation:explicitPrivate?'EXPLICIT_PRIVATE_UNIT_REQUIREMENT':explicitShared?
      'EXPLICIT_SHARED_UNIT_ALLOWED':'INFERRED_NONSHARED_STAY_NOT_A_HUMAN_REQUIREMENT',
    privateBathroomRelevant:bathroomRequired||bathroomPreferred||(!bathroomAvoided&&contextualBathReasons.length>0),
    bathroomBasis:bathroomRequired?'EXPLICIT_REQUIRED':bathroomPreferred?'EXPLICIT_PREFERRED':bathroomAvoided?
      'EXPLICIT_AVOIDED_NO_INFERRED_PRIVATE_BATH':contextualBathReasons.length?'CONTEXTUAL_NOT_A_HUMAN_REQUIREMENT':'UNKNOWN_NEUTRAL_NOT_CERTIFIED',
    contextualBathReasons,budgetPerRoomNight:intent.budgetPerRoomNight,nights:search.nights,rooms:search.rooms,
    occupancy:{adults:adults??null,children:children??null,guests,
      guestsPerRoom:guests===null?null:guests/search.rooms!,
      budgetPerGuestNight:guests===null?null:search.totalBudget!/(search.nights!*guests),
      interpretation:'CAPACITY_DESCRIPTOR_NOT_A_PER_PERSON_PRICE_OR_SHARING_PERMISSION'},
    market:{source:intent.market.source,status:intent.status,confidence:intent.market.confidence,sampleSize:intent.market.sampleSize,
      reportedIntentLevel:intent.level,supportedExpectationLevel:marketUsable?intent.level:null,
      basis:strongMarket?'STRONG_COMPARABLE_SAMPLE':marketUsable?'LIMITED_COMPARABLE_SAMPLE':'FALLBACK_NO_MARKET_PREMIUM_CERTIFICATE',
      wholeMarketCertified:false},
    premiumStandardRequired:false,minimumSpendRequired:false,
    inference:'Unit privacy precaution applies also with a small budget; explicit unit preferences prevail, hard requirements remain separate'} as const;
}

export function evaluateStaySuitabilityV3(expectation:ReturnType<typeof resolveStayExpectationV3>,facts:ReturnType<typeof resolveOfferPrivacyV3>) {
  const missing:string[]=[],mismatch:string[]=[];
  if(['UNKNOWN','CONFLICTING'].includes(facts.unitState))missing.push('suitability:unit-privacy-unverified');
  else if(facts.unitState==='SHARED'&&expectation.unitExpectation!=='EXPLICIT_SHARED_UNIT_ALLOWED')
    mismatch.push('suitability:known-shared-unit-outside-context-not-human-hard-violation');
  if(expectation.privateBathroomRelevant){
    if(['UNKNOWN','CONFLICTING'].includes(facts.bathroomState))missing.push('suitability:bathroom-privacy-unverified');
    else if(facts.bathroomState!=='PRIVATE')mismatch.push('suitability:known-nonprivate-bathroom-outside-context');
  }
  return {version:STAY_SUITABILITY_VERSION,status:mismatch.length?'ineligible':missing.length?'incomplete':'eligible',
    reasonCodes:[...mismatch,...missing,...(!mismatch.length&&!missing.length?['suitability:applicable-privacy-evidence-satisfied']:[])],
    facts,expectation,missing,mismatch,changesQualityScore:false,inventedHumanRequirements:false} as const;
}
