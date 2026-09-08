import {intentFixture} from './intentRolePolicySyntheticV3';
import {createSyntheticCapabilityInput} from '../../../src/engine-v3/evaluation/diagnosticCapabilityProbeV3';
import {INTENT_DIAGNOSTIC_PROTOCOL,type IntentDiagnosticExperiment,type IntentDiagnosticScenario,type DiagnosticScenarioKind} from '../../../src/engine-v3/evaluation/intentPolicyRobustnessDiagnosticV3';
import type {IntentRoleBridgeInputV3} from '../../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';

// Frozen specification before execution. Values/IDs are invented; no real input.
export const INTENT_ROBUSTNESS_SPECIFICATION = {
  version:INTENT_DIAGNOSTIC_PROTOCOL,syntheticOnly:true,reference:'FIRST_PREDECLARED_ALTERNATIVE_NOT_CHOSEN_AFTER_RESULTS',
  fixtureRevision:2,revisionReason:'Correct declared evidence IDs to canonical hyphen normalization; no observation/amplitude/expected behavior changed',
  budgetMultipliers:[0.9,1.1],completeCostMultipliers:[0.98,1.02,1.6],ratingDelta:-0.2,reviewCountMultiplier:0.1,
  distanceDeltaKm:0.05,distanceCrossingKm:4,coordinateRule:'LATITUDE_KM_TIMES_0.009_LONGITUDE_ZERO_REFERENCE_ZERO',
  families:['balanced','premium','equal-experience','equivalence','strong-distance','maximum-savings','same-day-F3','automatic-market'],
  limits:['No probability model or market frequency','One-axis probes, not exhaustive interactions','No cardinal post-stay regret','No policy or Golden certification'],
} as const;
function price(f:IntentRoleBridgeInputV3,index:number,amount:number|null) {
  const h=f.search.hotels[index];h.totalKnownCost=amount;h.taxesIncluded=amount===null?null:true;
  if(amount!==null){h.price=amount;h.basePrice=amount;}
  for(const o of h.offers){o.totalKnownCost=amount;o.taxesIncluded=amount===null?null:true;if(amount!==null){o.price=amount;o.basePrice=amount;}}
}
function scenario(id:string,kind:DiagnosticScenarioKind,input:IntentRoleBridgeInputV3,change:string,expectedProperty:string):IntentDiagnosticScenario {
  return {id,kind,input,change,expectedProperty,correspondence:input.search.hotels.map((h,i)=>({alternativeKey:`STAY_${i+1}`,hotelId:h.id,
    offers:h.offers.map((o,j)=>({offerKey:`RATE_${j+1}`,offerId:o.id}))}))};
}
export function frozenIntentRobustnessExperiments():IntentDiagnosticExperiment[] {
  return INTENT_ROBUSTNESS_SPECIFICATION.families.map(family=>{
    const f=intentFixture(family==='premium'||family==='equal-experience'?'maximum-comfort':family==='maximum-savings'?'maximum-savings':'balanced');
    f.caseId=`SYNTHETIC_D0046_${family}`;
    if(family==='premium'){
      f.search.totalBudget=1500;
      Object.assign(f.search.hotels[0],{name:'Invented shared dorm hostel',stars:1,reviewScore:9.8,reviewCount:1800,amenities:['Shared dormitory','WiFi'],facilities:[]});
      f.search.hotels[0].offers[0].roomName='Shared dormitory bunk';price(f,0,90);
      Object.assign(f.search.hotels[1],{name:'Invented premium hotel',stars:5,reviewScore:9.4});f.search.hotels[1].offers[0].roomName='Private superior double room';price(f,1,650);
    }
    if(family==='equal-experience'||family==='equivalence'){
      const base=structuredClone(f.search.hotels[0]);f.search.totalBudget=1200;
      f.search.hotels=f.search.hotels.map((h,i)=>({...structuredClone(base),id:h.id,offers:[{...structuredClone(base.offers[0]),id:`offer-${i+1}`}]}));
      f.search.hotels.forEach((_,i)=>price(f,i,family==='equivalence'?360:300+i*100));
    }
    if(family==='strong-distance'){f.search=createSyntheticCapabilityInput('DISTANCE_LEADER_OUTSIDE');f.distance.semantics='strong-preference';}
    if(family==='same-day-F3'){
      Object.assign(f.search,{preferenceId:'comfort',totalBudget:1500,nights:2,checkOut:'2099-10-12',capturedAt:'2099-10-10T12:00:00Z',bookingReferenceAt:'2099-10-10T12:00:00Z'});
      const h=f.search.hotels[1],o=h.offers[0];h.offers=[{...o,price:420,basePrice:420,totalKnownCost:420,refundable:false,refundableTag:'NRF',freeCancellationUntil:null,cancellationPolicy:'Synthetic non-refundable',cancellationPenalty:420},
        {...o,id:'offer-4',price:437,basePrice:437,totalKnownCost:437,freeCancellationUntil:'2099-10-10T23:59:59Z',cancellationPolicy:'Synthetic cancellation until 2099-10-10T23:59:59Z'}];
    }
    if(family==='automatic-market'){
      f.profileOrigin='automatic';Object.assign(f.search,{preferenceSource:'automatic',totalBudget:750,destinationKey:'invented-d0046-market',marketContextMode:'current-search'});
      const h=structuredClone(f.search.hotels[0]);f.search.hotels=Array.from({length:10},(_,i)=>({...structuredClone(h),id:`SYNTHETIC_MARKET_${i}`,name:`Invented market ${i}`,address:`Invented street ${i}`,latitude:0.001*(i+1),distance:(i+1)/9,
        offers:[{...structuredClone(h.offers[0]),id:`offer-${i+1}`}]}));f.search.hotels.forEach((_,i)=>price(f,i,180+i*12));
    }
    const scenarios=[scenario('baseline','BASELINE',f,'Declared invented control; no measured data','Record actual choice, intent and admissibility; do not adjust fixtures to force PASS')];
    const add=(id:string,kind:DiagnosticScenarioKind,change:string,property:string,mutate:(c:IntentRoleBridgeInputV3)=>void)=>{const c=structuredClone(f);mutate(c);scenarios.push(scenario(id,kind,c,change,property));};
    for(const multiplier of INTENT_ROBUSTNESS_SPECIFICATION.budgetMultipliers)add(`budget-${multiplier}`,'USER_CONTEXT_CHANGE',`Total user budget x ${multiplier}, rooms/nights unchanged`,'Recompute intent, target and same policy; threshold changes permitted',c=>{c.search.totalBudget=c.search.totalBudget!*multiplier;});
    // Complete price changes retain each rate differential (F3); no new offer chosen in the harness.
    for(const multiplier of INTENT_ROBUSTNESS_SPECIFICATION.completeCostMultipliers)add(`cost-${multiplier}`,'DATA_PERTURBATION',`All full offer totals x ${multiplier}; tax completeness retained`,'Small distant-from-threshold changes coherent; ceiling crossings may abstain',c=>{for(const h of c.search.hotels){h.price=h.price!*multiplier;h.basePrice=h.basePrice!*multiplier;h.totalKnownCost=h.totalKnownCost!*multiplier;for(const o of h.offers){o.price=o.price!*multiplier;o.basePrice=o.basePrice!*multiplier;o.totalKnownCost=o.totalKnownCost!*multiplier;if(o.cancellationPenalty)o.cancellationPenalty*=multiplier;}}});
    add('rating-minus-0.2','DATA_PERTURBATION','First declared rating -0.2 on documented synthetic /10 scale','Not a claim about category/privacy',c=>{c.search.hotels[0].reviewScore!-=0.2;});
    add('reviews-one-tenth','DATA_PERTURBATION','First review count x0.1 rounded down','Review reliability recomputed, not a premium certificate',c=>{c.search.hotels[0].reviewCount=Math.floor(c.search.hotels[0].reviewCount!*0.1);});
    add('distance-small','DATA_PERTURBATION','First distance +0.05km with coherent synthetic coordinates','Record any threshold crossings; no arbitrary tolerance',c=>{const h=c.search.hotels[0];h.distance!+=0.05;h.latitude=h.distance!*0.009;});
    add('distance-four-km','DATA_PERTURBATION','First distance=4km latitude=.036','Strong/cap policy retains distinction; outside not ordinary choice',c=>{Object.assign(c.search.hotels[0],{distance:4,latitude:0.036,longitude:0});});
    add('shared-unit','DATA_PERTURBATION','First documented unit changes to shared dorm, services evidence replaced','Review count cannot certify privacy or unit quality',c=>{const h=c.search.hotels[0];h.name='Invented shared dorm';h.amenities=['Shared dormitory','Shared bathroom','WiFi'];h.facilities=[];h.offers.forEach(o=>{o.roomName='Shared dormitory bunk';});});
    add('privacy-required-unknown','PREFERENCE_CHANGE','Require private bathroom; first bathroom evidence now unknown (explicit compound stress)','Missing requirement unverified, never false/true default',c=>{c.search.comfortPreferences={requiredFeatureCodes:['private-bathroom']};c.search.hotels[0].amenities=c.search.hotels[0].amenities.filter(a=>a!=='Private bathroom');});
    add('nonrefundable','DATA_PERTURBATION','All offers of first alternative become nonrefundable, same costs','Recompute bound offer flexibility; do not reuse old dimensions',c=>{c.search.hotels[0].offers.forEach(o=>{Object.assign(o,{refundable:false,refundableTag:'NRF',freeCancellationUntil:null,cancellationPolicy:'Synthetic non-refundable',cancellationPenalty:o.totalKnownCost});});});
    add('first-total-unknown','DATA_PERTURBATION','Only first complete total/tax knowledge removed; observed display price retained','Incomplete reference receives null loss, not zero',c=>price(c,0,null));
    add('all-totals-unknown','DATA_PERTURBATION','All complete totals/tax knowledge removed','Abstain; null losses and explicit denominator',c=>c.search.hotels.forEach((_,i)=>price(c,i,null)));
    add('rating-scale-unknown','DATA_PERTURBATION','All source rating scales unknown; canonical scores omitted','No invented /10 normalization; remaining evidence may support quality',c=>c.search.hotels.forEach(h=>{h.reviewScore=null;h.availableData.hasReviewScore=false;}));
    add('evidence-deteriorated','DATA_PERTURBATION','All quality/unit/location/services evidence removed; prices retained','Report incompleteness/abstention, no low-quality fiction',c=>c.search.hotels.forEach(h=>{Object.assign(h,{stars:null,reviewScore:null,reviewCount:null,amenities:[],facilities:[],latitude:null,longitude:null,distance:null,name:'Invented undocumented stay'});Object.assign(h.availableData,{hasStars:false,hasReviewScore:false,hasReviewCount:false,hasAmenities:false,hasCoordinates:false,hasDistance:false});h.offers.forEach(o=>{o.roomName=null;});}));
    for(const profile of ['balanced','maximum-comfort','maximum-savings'])add(`manual-${profile}`,'PREFERENCE_CHANGE',`Manual preference ${profile}, unchanged observations`,'Explicit profile preserved; budget alone not universal luxury',c=>{c.profileOrigin='manual';c.search.preferenceSource='manual';c.search.preferenceId=profile;});
    if(family==='strong-distance'){
      add('mandatory-cap','PREFERENCE_CHANGE','Explicit hard maximum 1km replaces strong preference','Known violation hard=false, no exception',c=>{c.distance.semantics='mandatory-cap';});
      add('exception-supported','PREFERENCE_CHANGE','Only STAY_1 accepted vs STAY_2 on positive quality gain with explicit evidence','Case-specific exception, not universal 4km tolerance',c=>{c.distanceException={hotelId:c.search.hotels[0].id,comparedWithHotelId:c.search.hotels[1].id,dimension:'quality',reason:'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED',evidenceIds:['synthetic-capability-0:review-score','synthetic-capability-1:review-score']};});
      add('exception-unsupported','PREFERENCE_CHANGE','Unsupported exception evidence, intentionally non-executable contextual case','Count non-execution with null loss',c=>{c.distanceException={hotelId:c.search.hotels[0].id,comparedWithHotelId:c.search.hotels[1].id,dimension:'quality',reason:'EXPLICIT_EXPERIENCE_GAIN_ACCEPTED',evidenceIds:['unsupported-synthetic-reference']};});
    }
    for(const seed of [1,2,3]){
      const c=structuredClone(f);c.search.hotels.forEach((h,i)=>{h.id=`OPAQUE_${seed}_${100-i}`;h.provider=`synthetic-${seed}`;h.dataSources=[h.provider];h.offers.forEach((o,j)=>{o.id=`offer-${1000+seed*100+i*10+j}`;o.provider=h.provider;});});
      const s=scenario(`identity-order-${seed}`,'INVARIANCE_CONTROL',c,'Rename all opaque hotel/offer/provider references and reverse order','Same semantic choice class, roles, metrics and eligibility');if(seed%2)c.search.hotels.reverse();scenarios.push(s);
    }
    return {protocol:INTENT_DIAGNOSTIC_PROTOCOL,syntheticOnly:true,family,scenarios};
  });
}
