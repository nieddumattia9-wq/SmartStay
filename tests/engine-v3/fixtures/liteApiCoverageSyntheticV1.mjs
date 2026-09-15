// Synthetic provider content only. Frozen search parameters are public plan
// constants, NOT evidence of a live account, property or availability.
import {COVERAGE_VERSION,CASE_ID,SCENARIO,CONTROLS,coverageRequest,sha} from '../../../scripts/liteapi-search-coverage-plan-v1.mjs';
import {selectCoverageCatalog} from '../../../scripts/liteapi-search-coverage-diagnostics-v1.mjs';
export function coverageFixture({count=3,directory,mutateCatalog,mutatePlan}={}){
 const config={version:COVERAGE_VERSION,origin:'SYNTHETIC_LOCAL_TRANSPORT',caseId:CASE_ID,scenario:structuredClone(SCENARIO),controls:structuredClone(CONTROLS),scenarioConfirmed:true,
  account:{environment:'SYNTHETIC',accountReference:'INVENTED_ACCOUNT_NOT_AUTHORITY',evidenceBasis:'SYNTHETIC_ONLY',commercialTermsReference:'SYNTHETIC_ONLY',maximumUsageCostEur:0,conditionsConfirmed:true},
  retention:{directory,days:14,responsible:'Mattia',access:'WINDOWS_CURRENT_USER_DPAPI',noAutomaticDeletionAcknowledged:true,confirmed:true}};
 mutatePlan?.(config);const s=config.scenario;
 const catalog={data:Array.from({length:count},(_,i)=>({id:'SYNTHETIC_OPAQUE_'+i+'+/=',name:'Invented catalog property '+i,country:s.countryCode,city:s.destination}))};
 mutateCatalog?.(catalog);
 const bytes=Buffer.from(JSON.stringify(catalog));let selection=null;try{selection=selectCoverageCatalog(bytes,sha(bytes),config);}catch{}
 const hotel=id=>({hotelId:id,roomTypes:[{offerId:'INVENTED_OFFER_'+id,rates:[{rateId:'INVENTED_RATE_'+id,occupancyNumber:1,adultCount:s.adults,childCount:s.childAges.length,childrenAges:[...s.childAges],name:'Invented room',retailRate:{total:[{amount:777,currency:s.currency}]}}]}]});
 const build=(kind,response)=>{const q=coverageRequest(kind,selection,config);return {method:q.method,path:q.path+(Object.keys(q.query).length?'?'+new URLSearchParams(q.query):''),body:q.body,response};};
 const responses=[build('CATALOG',catalog),build('CITY_RATES',{data:catalog.data.filter(r=>typeof r?.id==='string').slice(0,2).map(r=>hotel(r.id))})];
 if(selection?.selectedIds.length)responses.push(build('ID_RATES',{data:selection.selectedIds.map(hotel)}));
 return {config,selection,catalog,simulation:{origin:'SYNTHETIC_ONLY',responses},hotel};
}
export const syntheticProtector={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:x=>x,unprotectDataKey:x=>x};
