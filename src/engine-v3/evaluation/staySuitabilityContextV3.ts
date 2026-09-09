// Evaluation-only suitability, not a change to the public V2 preference resolver.
import {classifyAccommodationV2} from '../../engine-v2/categories/accommodationCategoryModel';
import type {SmartStayBudgetIntentEvaluationV2} from '../../engine-v2/intent/budgetIntentEngine';
import type {SmartStayEngineV2SearchInput} from '../../engine-v2/orchestrator/smartStayEngineV2';
import type {SmartStayUnitType} from '../../engine-v2/model/smartStayEvaluationV2';
import type {Hotel} from '../../types/hotel';

export const STAY_SUITABILITY_VERSION='stayopti.evaluation.stay-suitability@2' as const;
type PrivacyState='PRIVATE'|'SHARED'|'NOT_PRIVATE'|'UNKNOWN'|'CONFLICTING';
function normalize(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}

// Bounded lexical evidence, not NLP or a room inspection. Polarity is attached
// to each feature occurrence BEFORE the canonical classifier sees any phrase.
// Clause/feature boundaries stop "no breakfast" or "without a private bathroom"
// from negating an independently affirmative private room. Unsupported/conditional
// claims remain unknown; absence of a shared feature never proves privacy.
const PRIVATE_UNIT='private (?:double |superior |single |twin |standard |deluxe ){0,3}room|camera privata|stanza privata';
const OTHER_PRIVATE_UNIT='hotel room|camera hotel|camera d hotel|entire place|entire apartment|entire home|entire house|whole apartment|whole house|intero appartamento|intera casa|alloggio intero';
const SHARED_UNIT='shared room|shared dormitory|dormitory room|dorm room|posto letto|camera condivisa';
const PRIVATE_BATH='private bathroom|bagno privato|en suite bathroom|ensuite bathroom';
const SHARED_BATH='shared bathroom|communal bathroom|bagno condiviso';
function privacyEvidence(texts:string[],feature:'unit'|'bath') {
  let positive=false,negative=false,shared=false,uncertain=false,mentioned=false;
  const affirmativeUnits:string[]=[];
  const terms=new RegExp(`\\b(?:${PRIVATE_UNIT}|${OTHER_PRIVATE_UNIT}|${SHARED_UNIT}|${PRIVATE_BATH}|${SHARED_BATH})\\b`,'g');
  for(const raw of texts)for(const clause of raw.split(/[.,;:|\n]+/)){
    const text=normalize(clause),matches=[...text.matchAll(terms)];
    mentioned ||= (feature==='bath'?/\b(bathroom|bagno|en suite|ensuite)\b/:
      /\b(room|camera|stanza|dormitory|dorm|apartment|appartamento|place|house|home|casa|alloggio|posto letto)\b/).test(text);
    for(let i=0;i<matches.length;i++){
      const match=matches[i],phrase=match[0];
      const bath=new RegExp(`^(?:${PRIVATE_BATH}|${SHARED_BATH})$`).test(phrase);
      if(bath!==(feature==='bath'))continue;
      const isShared=new RegExp(`^(?:${feature==='bath'?SHARED_BATH:SHARED_UNIT})$`).test(phrase);
      const before=text.slice(i?matches[i-1].index!+matches[i-1][0].length:0,match.index);
      const after=text.slice(match.index!+phrase.length,matches[i+1]?.index??text.length);
      const conditional=/\b(maybe|possibly|perhaps|possible|potential|forse|eventuale)\s+(?:(?:a|an|the|un|una|il|la)\s+)?$/.test(before)||
        /^\s*(?:(?:is|are|e)\s+)?(?:(?:not|non)\s+(?:guaranteed|confirmed|documented|verified|garantito|documentato)|(?:availability\s+)?unknown|on request|su richiesta|subject to availability)/.test(after)||
        /\bor\b/.test(text)||clause.includes('?');
      const negated=/\b(no|not|without|non|senza|nessun|nessuna)\s+(?:(?:a|an|the|un|una|il|la|un|uno)\s+)?$/.test(before)||
        /^\s*(?:(?:is|are|e)\s+)?(?:not|non)\s+(?:available|provided|included|present|disponibile|incluso|presente)\b/.test(after)||
        /^\s*(?:isn t|aren t)\s+(?:available|provided|included)\b/.test(after);
      // Unrecognized trailing negation is not affirmative evidence either.
      const ambiguous=conditional||(!negated&&/^\s*(?:(?:is|are|e)\s+)?(?:not|non|isn t|aren t)\b/.test(after));
      if(ambiguous){uncertain=true;continue;}
      if(negated){
        // No hotel room/entire apartment does not prove no private accommodation.
        if(!isShared&&(feature==='bath'||new RegExp(`^(?:${PRIVATE_UNIT})$`).test(phrase)))negative=true;
        continue;
      }
      if(isShared)shared=true;else positive=true;
      if(feature==='unit')affirmativeUnits.push(phrase.replace(new RegExp(`^(?:${PRIVATE_UNIT})$`),'private room'));
    }
  }
  const state:PrivacyState=positive&&(negative||shared)?'CONFLICTING':uncertain?'UNKNOWN':
    shared?'SHARED':negative?'NOT_PRIVATE':positive?'PRIVATE':'UNKNOWN';
  return {state,mentioned,affirmativeUnits};
}

// Only the evaluated offer, then documented property features where the offer
// is silent, can support privacy. Explicit unknown/negative/conflicting offer
// evidence blocks fallback as well as an affirmative offer assertion does.
export function resolveOfferPrivacyV3(hotel:Hotel,roomName:string|null|undefined,offerId:string|null) {
  const classify=(values:string[])=>classifyAccommodationV2({hotel:{id:hotel.id,name:'',provider:hotel.provider,
    amenities:values,
    facilities:[]},explicitCategory:'unknown'});
  const offerText=roomName?[roomName]:[],features=[...hotel.amenities,...hotel.facilities];
  const offerUnit=privacyEvidence(offerText,'unit'),fromOffer=offerUnit.mentioned;
  const unitFacts=fromOffer?offerUnit:privacyEvidence(features,'unit');
  const chosen=classify(unitFacts.affirmativeUnits);
  const unitState:PrivacyState=chosen.evidence.some(e=>e.availability==='conflicting')&&unitFacts.state==='PRIVATE'?'CONFLICTING':unitFacts.state;
  const unit:SmartStayUnitType=['PRIVATE','SHARED'].includes(unitState)?chosen.profile.unitType:'unknown';
  const offerBath=privacyEvidence(offerText,'bath'),bathFromOffer=offerBath.mentioned;
  const bath=(bathFromOffer?offerBath:privacyEvidence(features,'bath')).state;
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
  else if(facts.unitState==='NOT_PRIVATE'){
    if(expectation.unitExpectation==='EXPLICIT_SHARED_UNIT_ALLOWED')missing.push('suitability:shared-unit-type-unverified');
    else mismatch.push('suitability:known-nonprivate-unit-outside-context-not-human-hard-violation');
  }
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
