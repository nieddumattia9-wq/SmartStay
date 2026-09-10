import {intentFixture} from './intentRolePolicySyntheticV3';
import {frozenIntentRobustnessExperiments} from './intentRobustnessSyntheticV3';
import type {IntentRoleBridgeInputV3} from '../../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';

// D-0049: observations only, never final policy scores. All hotels/offers invented.
export const UPGRADE_BRIDGE_SPECIFICATION = {
  version:'synthetic-upgrade-bridge@1', syntheticOnly:true,
  sourceCommit:'2dbedcff702420a23a84b6138521f7a82245b9e5',
  baseline:'D0044_MANUAL_BALANCED_FIRST_HOTEL_CLONED_TWICE',
  historicalGridUnchanged:true, noRealDataInput:true,
  expectedControls:{choiceCost:200,upgradeCosts:[400,500],marginalRejectionCost:510,
    experienceA:87.906081,experienceB:94.042027,gain:6.135946,minimumMarginalValue:2},
  limits:['Finite synthetic coverage, not full robustness','Upgrade is not Best Over Budget','No policy tuning or Golden admission'],
} as const;

export function upgradeBridgeInput(cost=400):IntentRoleBridgeInputV3 {
  const f=intentFixture('balanced','manual'),base=structuredClone(f.search.hotels[0]);
  f.caseId='SYNTHETIC_D0049_UPGRADE';
  f.search.hotels=[0,1].map(i=>({...structuredClone(base),id:`SYNTHETIC_UPGRADE_${i}`,name:`Invented private hotel ${i}`,
    stars:i?4:3,reviewScore:i?9.3:8.3,reviewCount:920,distance:i?0.2:0.8,latitude:i?0.0018:0.0072,longitude:0,
    price:i?cost:200,basePrice:i?cost:200,totalKnownCost:i?cost:200,taxesIncluded:true,
    offers:[{...structuredClone(base.offers[0]),id:`offer-${i+1}`,price:i?cost:200,basePrice:i?cost:200,totalKnownCost:i?cost:200,taxesIncluded:true}]}));
  return f;
}
export function frozenUpgradeBridgeCases() {
  const cases:Array<{id:string;expectation:string;input:IntentRoleBridgeInputV3;invariantOf?:string}>=[];
  const add=(id:string,expectation:string,mutate?:(f:IntentRoleBridgeInputV3)=>void,cost=400)=>{
    const input=upgradeBridgeInput(cost);mutate?.(input);cases.push({id,expectation,input});
  };
  add('balanced-400','A Choice, B Upgrade: gain 6.135946 / premium 200');
  add('balanced-500','B Upgrade with existing soft overrun, premium 300',undefined,500);
  add('balanced-510','B comparable; marginal value below 2, not budget exclusion',undefined,510);
  add('same-experience-more-expensive','More expensive alone is not Upgrade',f=>{
    const a=f.search.hotels[0],b=f.search.hotels[1];Object.assign(b,{stars:a.stars,reviewScore:a.reviewScore,distance:a.distance,latitude:a.latitude});
  });
  add('maximum-comfort','B is Choice already; no forced Upgrade',f=>{f.search.preferenceId='maximum-comfort';});
  add('incomplete-total','B incomplete, never Upgrade; display price retained',f=>{
    const b=f.search.hotels[1];b.totalKnownCost=null;b.taxesIncluded=null;b.offers[0].totalKnownCost=null;b.offers[0].taxesIncluded=null;
  });
  for(const [id,text] of [['privacy-negative','Private room without a private bathroom'],['privacy-unknown','Private room'],['privacy-conflict','Private room; private bathroom and shared bathroom']]){
    add(id,'Required private bathroom: negative is violated; unknown/conflict unverified, never Upgrade',f=>{
      f.search.comfortPreferences={requiredFeatureCodes:['private-bathroom']};
      const b=f.search.hotels[1];b.amenities=[];b.facilities=[];b.offers[0].roomName=text;
    });
  }
  add('distance-outside','Known cap violation excludes B from Upgrade',f=>{
    f.distance.semantics='mandatory-cap';f.search.maximumDistanceKm=1;Object.assign(f.search.hotels[1],{distance:2,latitude:0.018});
  });
  add('distance-unknown','Unknown required distance is unverified, not violation',f=>{
    f.distance.semantics='mandatory-cap';f.search.maximumDistanceKm=1;
    Object.assign(f.search.hotels[1],{distance:null,latitude:null,longitude:null});
    Object.assign(f.search.hotels[1].availableData,{hasDistance:false,hasCoordinates:false});
  });
  add('upgrade-equivalence','Two identical B upgrades form a class without an identity winner',f=>{
    const b=structuredClone(f.search.hotels[1]);b.id='SYNTHETIC_UPGRADE_2';b.offers[0].id='offer-3';f.search.hotels.push(b);
  });
  add('choice-equivalence','True primary tie does not force a Choice or dependent Upgrade',f=>{
    const a=structuredClone(f.search.hotels[0]);a.id='SYNTHETIC_UPGRADE_1';a.offers[0].id='offer-2';f.search.hotels[1]=a;
  });
  const f3=structuredClone(frozenIntentRobustnessExperiments().find(e=>e.family==='same-day-F3')!.scenarios[0].input);
  cases.push({id:'same-day-F3',expectation:'Historical non-picked multi-rate candidate: evaluated NRF 420, not independently reselected RFN 437',input:f3});
  for(const id of ['balanced-400','balanced-500','balanced-510','upgrade-equivalence'])for(let seed=1;seed<=6;seed++){
    const input=structuredClone(cases.find(c=>c.id===id)!.input);
    input.search.hotels.forEach((h,i)=>{h.id=`SYNTHETIC_OPAQUE_${seed}_${100-i}`;h.provider=`synthetic-source-${seed}`;h.dataSources=[h.provider];
      h.offers.forEach((o,j)=>{o.id=`offer-${1000+seed*100+i*10+j}`;o.provider=h.provider;});});
    if(seed%2)input.search.hotels.reverse();
    cases.push({id:`${id}-identity-${seed}`,expectation:'Same semantic roles, scores and eligibility; identity/provenance only changes',input,invariantOf:id});
  }
  return cases;
}
