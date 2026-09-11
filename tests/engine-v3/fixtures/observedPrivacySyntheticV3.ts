import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixture,reviewedFixture} from './observedOfferRequirementsSyntheticV3';
import {evaluateSmartStaySearchV2} from '../../../src/engine-v2/orchestrator/smartStayEngineV2';
import {computeObservedOfferDiagnosticV3} from '../../../src/engine-v3/evaluation/observedOfferDiagnosticV3';
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
export async function privacyControl(){
 const x=await fixture(),m=await load(pathToFileURL(join(process.cwd(),'scripts/observed-offer-execution-v1.mjs')).href);
 for(const h of x.b.search.hotels){h.latitude=null;h.longitude=null;h.availableData.hasCoordinates=false;}
 const previous=evaluateSmartStaySearchV2(x.b.search);
 const request:any={kind:'SYNTHETIC',normalization:x.n,contextId:'PREFERENCE',syntheticRequirementBasis:structuredClone(x.n.party.requirements),
  syntheticQuery:{...x.b.search,tripProfile:'business',childAgesAtStay:[],destinationKey:'INVENTED',preferenceSource:'manual'},
  syntheticSignals:previous.evaluations.map(e=>({alternativeId:e.hotel.id,evidence:structuredClone(e.evidence),features:[...e.hotel.amenities,...e.hotel.facilities],
   roomText:e.hotel.offers[0].roomName,category:null,observations:{synthetic:true},provenance:{kind:'SYNTHETIC'}}))};
 delete request.syntheticQuery.hotels;
 return {x,request,run:()=>m.executeObservedOfferDiagnostic(request,computeObservedOfferDiagnosticV3)};
}
export async function reviewedPrivacy(fields:any){
 const f=await reviewedFixture({fields:{roomName:'Unità A',...fields}}),m=await load(pathToFileURL(join(process.cwd(),'scripts/observed-offer-execution-v1.mjs')).href);
 return {...f,run:()=>m.executeObservedOfferDiagnostic({kind:'REVIEWED',reviewed:f.args,normalization:f.n,contextId:'PREFERENCE'},computeObservedOfferDiagnosticV3)};
}
