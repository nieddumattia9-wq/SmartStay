import {frozenIntentRobustnessExperiments} from './intentRobustnessSyntheticV3';
import type {IntentRoleBridgeInputV3} from '../../../src/engine-v3/evaluation/intentRolePolicyBridgeV3';

// D-0047: authored and SHA-sealed before the policy correction or its execution.
// All data invented. Expectations are semantic, never a hotel ID, brand or 650 EUR.
export const STAY_SUITABILITY_SPECIFICATION = {version:'stayopti.synthetic.stay-suitability@1',
  source:'D0046_FROZEN_SYNTHETIC_FAMILIES',syntheticOnly:true,
  unchangedPolicy:['profile weights','experience curves','budget ceilings','distance exceptions','F3'],
  expectations:['Manual Balanced stays Balanced; shared occupancy not silently accepted',
    'Context inference is not a human hard requirement', 'No premium floor from insufficient market',
    'Known privacy facts survive missing fit; missing relevant privacy is unverified',
    'Explicit shared preference can permit sharing; low budget alone cannot',
    'Private hostel offer not excluded by property category', 'Equivalent adequate experience preserves cheaper advantage'],
} as const;
export function frozenStaySuitabilityCases() {
  const families=frozenIntentRobustnessExperiments();
  const source=(family:string,id='baseline')=>structuredClone(families.find(f=>f.family===family)!.scenarios.find(s=>s.id===id)!.input);
  const cases:{id:string;expectation:string;input:IntentRoleBridgeInputV3}[]=[];
  const add=(id:string,expectation:string,input:IntentRoleBridgeInputV3,change?:(f:IntentRoleBridgeInputV3)=>void)=>{
    change?.(input);input.caseId=`SYNTHETIC_D0047_${id}`;cases.push({id,expectation,input});
  };
  const premium=()=>source('premium','manual-balanced');
  add('balanced-dorm-reproduction','Adequate documented private choice within budget, Balanced unchanged',premium());
  for(const [nights,rooms,adults,children] of [[3,1,2,0],[12,1,2,0],[3,4,8,0],[12,4,8,2]])
    add(`capacity-${nights}-${rooms}-${adults}-${children}`,'Budget divided by nights/rooms; guests separately recorded, no sharing consent',premium(),f=>{
      Object.assign(f.search,{nights,rooms,adults,children,checkOut:`2099-10-${10+nights}`});
    });
  add('market-strong','Existing strong market interpretation retained without changing manual Balanced',source('automatic-market'),f=>{
    f.profileOrigin='manual';f.search.preferenceSource='manual';f.search.preferenceId='balanced';
  });
  add('market-insufficient','Candidate fallback not a premium certificate',premium(),f=>{
    f.search.marketContextMode='local-only';f.search.marketContextObservations=[];
  });
  add('explicit-shared','Preferred shared unit allowed and retained as known, not renamed private',premium(),f=>{
    f.search.comfortPreferences={preferredUnitTypes:['shared-room']};
  });
  add('private-hostel','Actual private hostel offer can win; property inventory is not the selected unit',source('equal-experience'),f=>{
    f.search.preferenceId='balanced';const h=f.search.hotels[0];h.name='Invented hostel';h.accommodationCategory='hostel';
    h.amenities=['Shared dormitory','Private bathroom','WiFi','Air conditioning','Breakfast','Reception','Elevator'];h.offers[0].roomName='Private room';
  });
  add('room-unknown','Unknown unit not eligible by hotel category or good rating alone',source('balanced'),f=>{
    const h=f.search.hotels[0];h.name='Invented hotel';h.accommodationCategory='hotel';h.amenities=h.amenities.filter(a=>a!=='Hotel room');h.offers[0].roomName=null;
  });
  add('bath-unknown-required','Explicit private-bath requirement remains unverified',source('balanced'),f=>{
    f.search.comfortPreferences={requiredFeatureCodes:['private-bathroom']};f.search.hotels[0].amenities=f.search.hotels[0].amenities.filter(a=>a!=='Private bathroom');
  });
  add('bath-shared-contextual','Known shared bath distinct from unknown under a family context',source('balanced'),f=>{
    f.search.children=1;f.search.hotels[0].amenities=f.search.hotels[0].amenities.filter(a=>a!=='Private bathroom').concat('Shared bathroom');
  });
  add('bath-unknown-contextual','Family-relevant unknown bath unverified, not a proved shared bath',source('balanced'),f=>{
    f.search.children=1;f.search.hotels[0].amenities=f.search.hotels[0].amenities.filter(a=>a!=='Private bathroom');
  });
  add('bath-unknown-neutral','Non-required bath missing in weak-market leisure stays unknown, not false',source('balanced'),f=>{
    f.search.hotels[0].amenities=f.search.hotels[0].amenities.filter(a=>a!=='Private bathroom');
  });
  add('equal-experience-cheaper','Equal private experience/evidence: less cost remains advantageous',source('equal-experience'),f=>{f.search.preferenceId='balanced';});
  add('modest-private','Adequate private modest option can beat more expensive premium',source('balanced'),f=>{
    f.search.totalBudget=1500;f.search.hotels[0].stars=3;
    const h=f.search.hotels[1];h.stars=5;h.price=h.basePrice=h.totalKnownCost=1000;
    h.offers[0].price=h.offers[0].basePrice=h.offers[0].totalKnownCost=1000;
  });
  add('low-budget','No generic premium floor; documented modest private can be chosen',source('equal-experience'),f=>{
    f.search.preferenceId='balanced';f.search.totalBudget=120;for(const [i,h]of f.search.hotels.entries()){
      h.stars=2;h.price=h.basePrice=h.totalKnownCost=60+i*20;h.offers[0].price=h.offers[0].basePrice=h.offers[0].totalKnownCost=60+i*20;
    }
  });
  add('low-budget-all-shared','Low budget alone never becomes consent to sharing',source('equal-experience'),f=>{
    f.search.preferenceId='balanced';f.search.totalBudget=120;for(const [i,h]of f.search.hotels.entries()){
      h.name='Invented hostel';h.amenities=['Shared dormitory','WiFi'];h.facilities=[];h.offers[0].roomName='Shared dormitory';
      h.price=h.basePrice=h.totalKnownCost=60+i*20;h.offers[0].price=h.offers[0].basePrice=h.offers[0].totalKnownCost=60+i*20;
    }
  });
  for(const [family,id]of [['balanced','all-totals-unknown'],['balanced','rating-scale-unknown'],['strong-distance','baseline'],
    ['strong-distance','mandatory-cap'],['strong-distance','exception-supported'],['same-day-F3','baseline'],['equal-experience','distance-small']])
    add(`preserve-${family}-${id}`,'Preserve existing cost, rating, distance, F3 and separate Comfort sensitivity',source(family,id));
  for(const seed of [1,2,3])add(`identity-${seed}`,'Opaque identity/provider/order changes cannot change semantic merit',premium(),f=>{
    f.search.hotels.forEach((h,i)=>{h.id=`OPAQUE_SUITABILITY_${seed}_${30-i}`;h.provider=`synthetic-${seed}`;h.dataSources=[h.provider];
      h.offers.forEach((o,j)=>{o.provider=h.provider;o.id=`offer-${500+seed*20+i*3+j}`;});});
    if(seed%2)f.search.hotels.reverse();
  });
  add('name','Brand labels with unchanged documented category/facts do not select the winner',premium(),f=>{
    f.search.hotels.forEach((h,i)=>{h.accommodationCategory=i===0?'hostel':i===1?'hotel':'unknown';h.name=`Invented label ${30-i}`;});
  });
  return cases;
}
