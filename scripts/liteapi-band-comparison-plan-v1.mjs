// D-0078. Scenario/configuration are data; historical MAX11 is unchanged.
import {readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {COMPARISON_PLAN,CONTROLS,validateComparisonPlan,comparisonRequest,createComparisonInventory,verifyComparisonInventory,hash,same,sha,outside,assertNoLinks} from './liteapi-comparison-plan-v1.mjs';
export {hash,same,sha,outside,assertNoLinks};
export const BAND_PLAN='stayopti.band-comparison-max31@1';
export const BAND_REGISTRY='liteapi-band-comparison-max31';
export const BAND_CAPS=Object.freeze({SEARCH:1,REQUOTE:10,HOTEL_DETAIL:10,PREBOOK:10,total:31,concurrency:1,retries:0,redirects:0});
export const BAND_CONTROLS=Object.freeze({...CONTROLS,caps:BAND_CAPS});
export const BAND_PRICE_POLICY=Object.freeze({version:'stayopti.public-price-policy@2',mode:'OBSERVED_EUR_STAY_BAND',maximumAboveMinimumMinorUnits:500,calculationOffsetMinorUnits:100});
export const bandFail=c=>{throw Error('BAND_'+c);};
// Internal schema-compatible context for unchanged single-request/party helpers.
// NOT a legacy acquisition plan, authorization, journal or replay replacement.
export function bandComparisonContext(c){const {pricePolicy,pilotMinimumDistinctProperties,...base}=c;return {...base,version:COMPARISON_PLAN,selection:{...c.selection,maximumHotels:5},controls:CONTROLS};}
export function validateBandPlan(c){
 if(!c||c.version!==BAND_PLAN||!same(Object.keys(c).sort(),['version','origin','protocol','caseId','scenario','selection','controls','externalConditions','retention','pricePolicy','pilotMinimumDistinctProperties'].sort())||
  c.protocol!=='LITEAPI_DOCUMENTARY@1'||c.scenario?.currency!=='EUR'||c.scenario?.units!==1||c.selection?.maximumHotels!==10||c.pilotMinimumDistinctProperties!==10||!same(c.pricePolicy,BAND_PRICE_POLICY)||!same(c.controls,BAND_CONTROLS))bandFail('PLAN_UNSUPPORTED');
 const x=validateComparisonPlan(bandComparisonContext(c));return {...x,status:x.pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_MAX31_AUTHORIZATION',engineInvocations:0,a02Production:'HOLD'};
}
export function bandProbePlan(c,hotelId,sourceSha){
 validateBandPlan(c);return {version:'stayopti.liteapi-ssp-probe@1.4',origin:c.origin==='LITEAPI_PRODUCTION'?'LITEAPI_PRODUCTION':'SYNTHETIC_ONLY',caseId:c.caseId,
  comparisonPlan:bandComparisonContext(c),hotelId,marginDecimals:6,caps:{DISCOVERY:1,REQUOTE:1,PREBOOK:1,total:3,concurrency:1,retries:0,redirects:0},
  hotelSource:{reference:'AUTHENTICATED_MAX31_SEARCH_NOT_EXTERNAL_ASSERTION',sha256:sourceSha,pointer:'/data'},purpose:'BOUNDED_REQUEST_MARGIN_FUNCTIONAL_TEST_NO_ENGINE'};
}
export function bandRequest(c,kind,target){validateBandPlan(c);return comparisonRequest(bandComparisonContext(c),kind,target??null);}
const profile={entry:'scripts/run-liteapi-band-comparison.mjs',launcher:'invoke-liteapi-band-comparison.ps1',version:BAND_PLAN};
export const bandInventory=(r,h,b)=>createComparisonInventory(r,h,b,profile);
export const verifyBandInventory=(r,i,h,b,synthetic=false)=>verifyComparisonInventory(r,i,h,b,{synthetic,profile});
export const bandAuthorization=(c,i)=>'AUTHORIZE_MAX31_'+c.caseId+'_HEAD_'+i.expectedHead+'_INVENTORY_'+hash(i)+'_CONFIG_'+hash(c)+'_SEARCH1_REQUOTE10_DETAILS10_PREBOOK10_NO_RETRY_NO_ENGINE';
export function loadBandFile(p,h){assertNoLinks(p);const b=readFileSync(p);try{if(sha(b)!==h)bandFail('FILE_HASH');return JSON.parse(b);}finally{b.fill(0);}}
export function verifyBandEvidence(c,root){
 validateBandPlan(c);const refs=[];
 for(const [name,v]of Object.entries(c.externalConditions).filter(([,v])=>v?.status==='DOCUMENTED')){
  if(!isAbsolute(v.reference)||!/\.(md|json)$/i.test(v.reference)||/private-evidence|credentials|private-api-key/i.test(v.reference))bandFail('EVIDENCE_REFERENCE_SCOPE');
  outside(root,v.reference);assertNoLinks(v.reference);const b=readFileSync(v.reference);
  try{if(b.length>4194304||sha(b)!==v.sha256)bandFail('EVIDENCE_HASH');refs.push({name,sha256:v.sha256});}finally{b.fill(0);}
 }
 return refs;
}
