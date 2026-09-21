// D-0066. A separately authorized, details-only bounded profile. No engine.
import {readFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {canonical,sha,hash,same,git,outside,assertNoLinks} from './liteapi-controlled-plan-v1.mjs';
export {canonical,sha,hash,same,git,outside,assertNoLinks};
export const DETAIL_VERSION='stayopti.liteapi-hotel-detail-enrichment@1';
export const DETAIL_SOURCE_VERSION='stayopti.liteapi-hotel-detail-source@1';
export const BRANCH='codex/evaluation-d0036-d0041';
export const fail=code=>{throw Error('LITEAPI_DETAIL_'+code);};
export const DETAIL_CONTROLS=Object.freeze({limits:{HOTEL_DETAIL:5,total:5},host:'api.liteapi.travel',path:'/v3.0/data/hotel',concurrency:1,retries:0,redirects:0,additionalPages:0,pacingMs:1000,clientTimeoutMs:20000,maximumResponseBytes:32*1024*1024,providerTimeoutSeconds:4,providerTimeoutBasis:'EXPLICIT_DOCUMENTED_OPERATION_DEFAULT_SECONDS',language:'en'});
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),opaque=v=>typeof v==='string'&&v.length>0&&v.length<=32768&&!/[\x00-\x1f\x7f]/.test(v);
const mapped=v=>Number.isSafeInteger(v)&&v>=0||opaque(v);
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...allowed].sort());
const utc=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const sorted=a=>[...a].sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0);
export function validateHotelDetailSource(source){
 if(!source||source.version!==DETAIL_SOURCE_VERSION||!opaque(source.caseId)||!hex(source.bindingSha256)||
  !hex(source.journalLastEventSha256)||!Number.isSafeInteger(source.journalEventCount)||source.journalEventCount<1||
  !hex(source.resultSha256)||!hex(source.configurationSha256)||!hex(source.inventorySha256)||!/^([a-f0-9]{40})$/.test(source.checkpoint??''))fail('SOURCE_BINDING');
 const {bindingSha256,...unsigned}=source;if(hash(unsigned)!==bindingSha256)fail('SOURCE_BINDING');
 if(!Array.isArray(source.offers)||!source.offers.length||!Array.isArray(source.targets)||!source.targets.length||source.targets.length>5)fail('SOURCE_TARGETS');
 const offerKeys=new Set();
 for(const o of source.offers){
  if(!hex(o.offerKey)||offerKeys.has(o.offerKey)||!opaque(o.hotelId)||!opaque(o.offerId)||!opaque(o.rateId)||!mapped(o.mappedRoomId)||
   !utc(o.observedAt)||!hex(o.responseSha256)||!hex(o.rateSha256)||!hex(o.offerSha256)||!hex(o.requestSha256)||typeof o.pointer!=='string'||
   !['CITY_RATES','ID_RATES'].includes(o.arm)||typeof o.roomText!=='string'||!Array.isArray(o.issues))fail('SOURCE_OFFER');
  offerKeys.add(o.offerKey);
 }
 const targets=[...new Set(source.offers.map(o=>o.hotelId))].sort().map(hotelId=>({hotelId,
  mappedRoomIds:sorted([...new Map(source.offers.filter(o=>o.hotelId===hotelId).map(o=>[canonical(o.mappedRoomId),o.mappedRoomId])).values()]),
  offerKeys:source.offers.filter(o=>o.hotelId===hotelId).map(o=>o.offerKey).sort()}));
 if(!same(source.targets,targets))fail('SOURCE_TARGETS');
 const s=source.scenario;
 if(!s||!Number.isInteger(s.adults)||s.adults<1||!Array.isArray(s.childAges)||s.childAges.some(a=>!Number.isInteger(a)||a<0||a>17)||!Number.isInteger(s.units)||s.units<1)fail('SOURCE_SCENARIO');
 return true;
}
export function validateHotelDetailPlan(config,{synthetic=false}={}){
 if(!keys(config,['version','origin','caseId','source','targets','scenario','controls','account','retention'])||config.version!==DETAIL_VERSION)fail('CONFIG_SCHEMA');
 if(config.origin!==(synthetic?'SYNTHETIC_LOCAL_TRANSPORT':'LITEAPI_PRODUCTION')||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(config.caseId??''))fail('CASE_OR_ORIGIN');
 validateHotelDetailSource(config.source);
 if(config.source.origin!==config.origin)fail('SOURCE_ORIGIN');
 if(config.caseId===config.source.caseId||!same(config.targets,config.source.targets)||!same(config.scenario,config.source.scenario))fail('SOURCE_PLAN_MISMATCH');
 const c=config.controls;
 if(!keys(c,Object.keys(DETAIL_CONTROLS))||!same({...c,pacingMs:1000},DETAIL_CONTROLS)||!Number.isInteger(c.pacingMs)||c.pacingMs<1000||c.pacingMs>60000)fail('CONTROLS_OUTSIDE_PROFILE');
 const a=config.account,r=config.retention,pending=[];
 if(!keys(a,['environment','accountReference','evidenceBasis','commercialTermsReference','maximumUsageCostEur','conditionsConfirmed']))fail('ACCOUNT_SCHEMA');
 if(a.environment!==(synthetic?'SYNTHETIC':'LIVE_PRODUCTION')||!opaque(a.accountReference)||!opaque(a.evidenceBasis)||!opaque(a.commercialTermsReference)||a.maximumUsageCostEur!==0||a.conditionsConfirmed!==true)pending.push('ACCOUNT_CONDITIONS_PENDING');
 if(!keys(r,['directory','days','responsible','access','noAutomaticDeletionAcknowledged','confirmed']))fail('RETENTION_SCHEMA');
 if(!opaque(r.directory)||r.days!==14||!opaque(r.responsible)||r.access!=='WINDOWS_CURRENT_USER_DPAPI'||r.noAutomaticDeletionAcknowledged!==true||r.confirmed!==true)pending.push('RETENTION_PENDING');
 return {status:pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_DETAIL_ACQUISITION_AUTHORIZATION',pending,providerRequests:0,credentialLoaded:false};
}
export function detailsRequest(index,config){
 validateHotelDetailPlan(config,{synthetic:config?.origin==='SYNTHETIC_LOCAL_TRANSPORT'});
 if(!Number.isInteger(index)||index<0||index>=config.targets.length||index>=5)fail('TARGET_INDEX_OUTSIDE_PLAN');
 const hotelId=config.targets[index].hotelId;
 return {kind:'HOTEL_DETAIL',method:'GET',host:config.controls.host,path:config.controls.path,query:{hotelId,timeout:config.controls.providerTimeoutSeconds,language:config.controls.language},body:null,hotelId};
}
export function validateDetailsRequest(request,index,config){if(!same(request,detailsRequest(index,config)))fail('REQUEST_OUTSIDE_SEALED_PLAN');return true;}
export const hotelDetailRequest=detailsRequest;
export const validateHotelDetailRequest=validateDetailsRequest;
const safePath=x=>typeof x==='string'&&!isAbsolute(x)&&!x.split(/[\\/]/).includes('..')&&!x.includes(':');
const entry=root=>p=>({path:p,sha256:sha(readFileSync(join(root,p)))});
export function hotelDetailCodePaths(root){
 const seen=new Set(),visit=p=>{if(seen.has(p))return;seen.add(p);const text=readFileSync(join(root,p),'utf8');
  for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
   const q=relative(root,resolve(root,dirname(p),m[1])).replaceAll('\\','/');if(!safePath(q))fail('CODE_IMPORT_SCOPE');visit(q);
  }};
 visit('scripts/run-liteapi-hotel-detail-enrichment.mjs');
 seen.add('scripts/invoke-liteapi-hotel-detail-enrichment.ps1');seen.add('scripts/invoke-liteapi-profile-runner.ps1');seen.add('scripts/liteapi-credential-store.ps1');seen.add('scripts/protect-v3-provider-raw-key-dpapi.ps1');return [...seen].sort();
}
export function createHotelDetailInventory(root,{expectedHead,expectedBranch}){
 if(git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['branch','--show-current'])!==expectedBranch||expectedBranch!==BRANCH)fail('CHECKPOINT_MISMATCH');
 if(git(root,['diff','--cached','--name-only']))fail('STAGING_NOT_EMPTY');
 const code=hotelDetailCodePaths(root).map(entry(root));
 const dirty=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(line=>line.slice(3));
 return {version:DETAIL_VERSION,expectedHead,expectedBranch,nodeSha256:sha(readFileSync(process.execPath)),code,preserved:dirty.filter(p=>!code.some(c=>c.path===p)).sort().map(entry(root))};
}
export function verifyHotelDetailInventory(root,inventory,expectedHead,expectedBranch,{synthetic=false}={}){
 if(inventory.version!==DETAIL_VERSION||inventory.expectedHead!==expectedHead||inventory.expectedBranch!==expectedBranch||expectedBranch!==BRANCH||git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['branch','--show-current'])!==expectedBranch)fail('CHECKPOINT_MISMATCH');
 if(git(root,['diff','--cached','--name-only']))fail('STAGING_NOT_EMPTY');
 if(inventory.nodeSha256!==sha(readFileSync(process.execPath)))fail('NODE_CHANGED');
 if(!same(inventory.code.map(x=>x.path).sort(),hotelDetailCodePaths(root)))fail('CODE_INVENTORY_INCOMPLETE');
 for(const e of [...inventory.code,...inventory.preserved])if(!safePath(e.path)||sha(readFileSync(join(root,e.path)))!==e.sha256)fail('CODE_OR_PRESERVED_BYTES_CHANGED');
 const changed=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(line=>line.slice(3));
 if(changed.some(p=>!inventory.preserved.some(e=>e.path===p)&&!(synthetic&&inventory.code.some(e=>e.path===p))))fail('UNAPPROVED_WORKTREE_CHANGE');
 if(!synthetic)for(const e of inventory.code){const p=spawnSync('git',['show',expectedHead+':'+e.path],{cwd:root,windowsHide:true,maxBuffer:20*1024*1024}),working=readFileSync(join(root,e.path));
  const utf8=b=>Buffer.from(b.toString('utf8'),'utf8').equals(b);
  if(p.error||p.status!==0||!utf8(p.stdout)||!utf8(working)||p.stdout.toString('utf8').replaceAll('\r\n','\n')!==working.toString('utf8').replaceAll('\r\n','\n'))fail('EXECUTABLE_NOT_COMMITTED');
 }
 return {codeSha256:hash(inventory),head:expectedHead,branch:expectedBranch};
}
export const hotelDetailAuthorization=(config,inventory)=>'AUTHORIZE_D0066_CASE_'+config.caseId+'_HEAD_'+inventory.expectedHead+'_INVENTORY_'+hash(inventory)+'_CONFIG_'+hash(config)+'_SOURCE_'+config.source.bindingSha256+'_MAX5_DETAILS_ONLY_NO_RETRY_NO_PREBOOK_NO_ENGINE';
