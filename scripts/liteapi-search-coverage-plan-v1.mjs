// D-0064 independent MAX3 profile. Legacy D0062 remains byte-identical.
import {readFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {canonical,sha,hash,same,git,outside,assertNoLinks} from './liteapi-controlled-plan-v1.mjs';
export {canonical,sha,hash,same,git,outside,assertNoLinks};
export const fail=code=>{throw Error('LITEAPI_COVERAGE_'+code);};
export const COVERAGE_VERSION='stayopti.liteapi-search-coverage@1';
export const BRANCH='codex/evaluation-d0036-d0041';
export const CASE_ID='D0064_LITEAPI_BOLOGNA_COVERAGE_001';
export const LIMITS=Object.freeze({CATALOG:1,CITY_RATES:1,ID_RATES:1,total:3});
export const SEED='D0064_BOLOGNA_COVERAGE_001_HASH_SAMPLE_V1';
export const SCENARIO=Object.freeze({destination:'Bologna',countryCode:'IT',checkin:'2027-01-10',checkout:'2027-01-17',nights:7,adults:2,childAges:[6,11],units:1,currency:'EUR',guestNationality:'IT',budget:1400,profile:'BALANCED',profileSource:'manual',distancePreference:'NOT_REQUESTED'});
export const CONTROLS=Object.freeze({limits:LIMITS,concurrency:1,retries:0,redirects:0,additionalPages:0,pacingMs:1000,clientTimeoutMs:20000,providerTimeoutSeconds:12,catalogLimit:100,maximumSelectedIds:20,seed:SEED});
const safePath=x=>typeof x==='string'&&!isAbsolute(x)&&!x.split(/[\\/]/).includes('..')&&!x.includes(':');
const entry=root=>p=>({path:p,sha256:sha(readFileSync(join(root,p)))});
export function coverageCodePaths(root){
 // All executable source dependencies, plus launcher and protector, not arbitrary
 // caller-selected subsets. Kernel is deliberately absent from acquisition.
 const seen=new Set(),visit=p=>{if(seen.has(p))return;seen.add(p);const text=readFileSync(join(root,p),'utf8');
  for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
   const q=relative(root,resolve(root,dirname(p),m[1])).replaceAll('\\','/');if(!safePath(q))fail('CODE_IMPORT_SCOPE');visit(q);
  }};
 visit('scripts/run-liteapi-search-coverage.mjs');
 seen.add('scripts/invoke-liteapi-search-coverage.ps1');seen.add('scripts/protect-v3-provider-raw-key-dpapi.ps1');
 return [...seen].sort();
}
export function createCoverageInventory(root,{expectedHead,expectedBranch}){
 if(git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['branch','--show-current'])!==expectedBranch)fail('CHECKPOINT_MISMATCH');
 if(git(root,['diff','--cached','--name-only']))fail('STAGING_NOT_EMPTY');
 const code=coverageCodePaths(root).map(entry(root));
 const dirty=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(line=>line.slice(3));
 // Inventory records exceptions, but relevant executable dirty files are NEVER
 // permitted in a production preflight. Synthetic candidate proof is separate.
 return {version:COVERAGE_VERSION,expectedHead,expectedBranch,nodeSha256:sha(readFileSync(process.execPath)),code,
  preserved:dirty.filter(p=>!code.some(c=>c.path===p)).sort().map(entry(root))};
}
export function verifyCoverageInventory(root,inventory,expectedHead,expectedBranch,{synthetic=false}={}){
 if(inventory.version!==COVERAGE_VERSION||inventory.expectedHead!==expectedHead||inventory.expectedBranch!==expectedBranch||expectedBranch!==BRANCH||
  git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['branch','--show-current'])!==expectedBranch)fail('CHECKPOINT_MISMATCH');
 if(git(root,['diff','--cached','--name-only']))fail('STAGING_NOT_EMPTY');
 if(inventory.nodeSha256!==sha(readFileSync(process.execPath)))fail('NODE_CHANGED');
 if(!same(inventory.code.map(x=>x.path).sort(),coverageCodePaths(root)))fail('CODE_INVENTORY_INCOMPLETE');
 for(const e of [...inventory.code,...inventory.preserved])if(!safePath(e.path)||sha(readFileSync(join(root,e.path)))!==e.sha256)fail('CODE_OR_PRESERVED_BYTES_CHANGED');
 const changed=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(line=>line.slice(3));
 if(changed.some(p=>!inventory.preserved.some(e=>e.path===p)&&!(synthetic&&inventory.code.some(e=>e.path===p))))fail('UNAPPROVED_WORKTREE_CHANGE');
 if(!synthetic)for(const e of inventory.code){
  const p=spawnSync('git',['show',expectedHead+':'+e.path],{cwd:root,windowsHide:true,maxBuffer:20*1024*1024});
  const working=readFileSync(join(root,e.path));
  // Git on Windows may check out LF source as CRLF. This comparison permits
  // only that exact textual equivalence to the commit; the approved inventory
  // above still binds every actual executable byte (including line endings).
  const utf8=b=>Buffer.from(b.toString('utf8'),'utf8').equals(b);
  if(p.error||p.status!==0||!utf8(p.stdout)||!utf8(working)||
   p.stdout.toString('utf8').replaceAll('\r\n','\n')!==working.toString('utf8').replaceAll('\r\n','\n'))fail('EXECUTABLE_NOT_COMMITTED');
 }
 return {codeSha256:hash(inventory),head:expectedHead,branch:expectedBranch};
}

export function validateCoveragePlan(config,{synthetic=false}={}){
 const keys=['version','origin','caseId','scenario','controls','scenarioConfirmed','account','retention'];
 if(!config||!same(Object.keys(config).sort(),keys.sort())||config.version!==COVERAGE_VERSION)fail('CONFIG_SCHEMA');
 if(config.origin!==(synthetic?'SYNTHETIC_LOCAL_TRANSPORT':'LITEAPI_PRODUCTION')||config.caseId!==CASE_ID)fail('CASE_OR_ORIGIN');
 if(!same(config.scenario,SCENARIO)||!same(config.controls,CONTROLS))fail('FROZEN_PLAN_CHANGED');
 const pending=[];
 if(config.scenarioConfirmed!==true)pending.push('SCENARIO_NOT_CONFIRMED');
 const a=config.account;
 if(!a||!same(Object.keys(a).sort(),['environment','accountReference','evidenceBasis','commercialTermsReference','maximumUsageCostEur','conditionsConfirmed'].sort()))fail('ACCOUNT_SCHEMA');
 if(a.environment!==(synthetic?'SYNTHETIC':'LIVE_PRODUCTION')||!a.accountReference||!a.evidenceBasis||!a.commercialTermsReference||a.maximumUsageCostEur!==0||a.conditionsConfirmed!==true)pending.push('ACCOUNT_CONDITIONS_PENDING');
 const r=config.retention;
 if(!r||!same(Object.keys(r).sort(),['directory','days','responsible','access','noAutomaticDeletionAcknowledged','confirmed'].sort()))fail('RETENTION_SCHEMA');
 if(!r.directory||r.days!==14||r.responsible!=='Mattia'||r.access!=='WINDOWS_CURRENT_USER_DPAPI'||r.noAutomaticDeletionAcknowledged!==true||r.confirmed!==true)pending.push('RETENTION_PENDING');
 return {status:pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_COVERAGE_ACQUISITION_AUTHORIZATION',pending,providerRequests:0,credentialLoaded:false};
}
export const ratesBody=()=>({checkin:SCENARIO.checkin,checkout:SCENARIO.checkout,currency:'EUR',guestNationality:'IT',occupancies:[{adults:2,children:[6,11]}],limit:20,offset:0,timeout:12,maxRatesPerHotel:3,includeHotelData:true,roomMapping:true});
export function coverageRequest(kind,selection=null){
 if(!Object.hasOwn(LIMITS,kind)||kind==='total')fail('OPERATION_NOT_ALLOWED');
 if(kind==='ID_RATES'&&(!selection||selection.selectedIds.length<1||selection.selectedIds.length>20))fail('SELECTED_IDS_REQUIRED');
 return {kind,method:kind==='CATALOG'?'GET':'POST',host:'api.liteapi.travel',path:kind==='CATALOG'?'/v3.0/data/hotels':'/v3.0/hotels/rates',
 query:kind==='CATALOG'?{countryCode:'IT',cityName:'Bologna',limit:100,offset:0,timeout:12}:{},
 body:kind==='CATALOG'?null:kind==='CITY_RATES'?{...ratesBody(),cityName:'Bologna',countryCode:'IT'}:{...ratesBody(),hotelIds:[...selection.selectedIds]}};
}
export function validateCoverageRequest(request,selection){
 if(!same(request,coverageRequest(request?.kind,selection)))fail('REQUEST_OUTSIDE_SEALED_PLAN');
 if(request.kind!=='CATALOG'&&!selection)fail('POOL_NOT_SEALED');return true;
}
export const coverageAuthorization=(config,inventory)=>'AUTHORIZE_D0064_CASE_'+config.caseId+'_HEAD_'+inventory.expectedHead+'_INVENTORY_'+hash(inventory)+'_CONFIG_'+hash(config)+'_MAX3_CATALOG1_CITY1_IDS1_NO_RETRY_NO_PREBOOK_NO_ENGINE';
