// D-0075: a separate finite capability, never a reinterpretation of MAX17/3/5.
import {readFileSync} from 'node:fs';
import {resolve,relative,dirname,join,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {canonical,sha,hash,same,git,outside,assertNoLinks} from './liteapi-controlled-plan-v1.mjs';
export {canonical,sha,hash,same,git,outside,assertNoLinks};
export const COMPARISON_PLAN='stayopti.authenticated-comparison-max11@1';
export const COMPARISON_REGISTRY='liteapi-comparison-max11';
export const COMPARISON_BRANCH='codex/evaluation-d0036-d0041';
export const CAPS=Object.freeze({SEARCH:1,HOTEL_DETAIL:5,PREBOOK:5,total:11,concurrency:1,retries:0,redirects:0});
export const CONTROLS=Object.freeze({caps:CAPS,pacingMs:1000,searchLimit:200,offset:0,maxRatesPerHotel:3,searchProviderSeconds:12,detailProviderSeconds:4,prebookProviderSeconds:30,clientMs:20000,prebookClientMs:35000,responseBytes:33554432,additionalPages:0});
export const fail=c=>{throw Error('COMPARISON_'+c);};
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&same(Object.keys(o).sort(),[...k].sort());
const text=s=>typeof s==='string'&&s.trim().length>0&&!/[\x00-\x1f\x7f]/.test(s);
const date=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function validateComparisonPlan(c){
 if(!keys(c,['version','origin','protocol','caseId','scenario','selection','controls','externalConditions','retention'])||c.version!==COMPARISON_PLAN||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(c.caseId??''))fail('PLAN_SCHEMA');
 const synthetic=c.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(!synthetic&&c.origin!=='LITEAPI_PRODUCTION'||!['LITEAPI_DOCUMENTARY@1',...(synthetic?['SYNTHETIC_ATTESTED_QUOTE@1']:[])].includes(c.protocol))fail('ORIGIN_PROTOCOL');
 const s=c.scenario;
 if(!keys(s,['city','country','checkin','checkout','currency','guestNationality','adults','childAges','units','budget','preference','distance'])||
  !text(s.city)||!(/^[A-Z]{2}$/).test(s.country)||!(/^[A-Z]{3}$/).test(s.currency)||!(/^[A-Z]{2}$/).test(s.guestNationality)||
  !date(s.checkin)||!date(s.checkout)||Date.parse(s.checkout)<=Date.parse(s.checkin)||
  !Number.isInteger(s.adults)||s.adults<1||!Array.isArray(s.childAges)||s.childAges.some(a=>!Number.isInteger(a)||a<0||a>17)||s.units!==1||
  !Number.isFinite(s.budget)||s.budget<=0||s.preference!=='balanced-manual'||s.distance!=='NOT_REQUESTED')fail('SCENARIO_UNSUPPORTED');
 if(!keys(c.selection,['version','seed','maximumHotels'])||c.selection.version!=='HASHED_PROVIDER_IDS_AUDIT_ONLY@1'||!text(c.selection.seed)||c.selection.maximumHotels!==5||!same(c.controls,CONTROLS))fail('CONTROLS');
 const e=c.externalConditions,r=c.retention;
 if(!keys(e,['accountReference','maximumUsageCostEur','publicPriceBasis','permittedUse','retentionPermission'])||e.maximumUsageCostEur!==0)fail('EXTERNAL_CONDITIONS_SCHEMA');
 const pending=[];
 if(!text(e.accountReference))pending.push('ACCOUNT_REFERENCE_MISSING');
 for(const k of ['publicPriceBasis','permittedUse','retentionPermission']){
  const v=e[k];if(!keys(v,['status','reference','sha256'])||!['PENDING','DOCUMENTED'].includes(v.status))fail('EXTERNAL_CONDITION_SCHEMA');
  if(v.status!=='DOCUMENTED'||!text(v.reference)||!/^[a-f0-9]{64}$/.test(v.sha256??''))pending.push(k.toUpperCase()+'_PENDING');
 }
 if(!keys(r,['directory','days','responsible','access','noAutomaticDeletionAcknowledged'])||!isAbsolute(r.directory??'')||r.days!==14||!text(r.responsible)||r.access!=='WINDOWS_CURRENT_USER_DPAPI'||r.noAutomaticDeletionAcknowledged!==true)fail('RETENTION');
 return {status:pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_MAX11_AUTHORIZATION',pending,providerRequests:0,credentialLoaded:false};
}
export function comparisonRequest(config,kind,target=null){
 validateComparisonPlan(config);const s=config.scenario;
 if(kind==='SEARCH'&&target===null)return {kind,hotelId:null,method:'POST',host:'api.liteapi.travel',path:'/v3.0/hotels/rates',query:{},body:{cityName:s.city,countryCode:s.country,checkin:s.checkin,checkout:s.checkout,currency:s.currency,guestNationality:s.guestNationality,occupancies:[{adults:s.adults,children:[...s.childAges]}],limit:config.controls.searchLimit,offset:0,maxRatesPerHotel:3,roomMapping:true,includeHotelData:true,timeout:12}};
 if(!target||!text(target.hotelId)||!text(target.offerId))fail('SELECTED_TARGET_REQUIRED');
 if(kind==='HOTEL_DETAIL')return {kind,hotelId:target.hotelId,method:'GET',host:'api.liteapi.travel',path:'/v3.0/data/hotel',query:{hotelId:target.hotelId,timeout:4,language:'en'},body:null};
 if(kind==='PREBOOK')return {kind,hotelId:target.hotelId,offerId:target.offerId,method:'POST',host:'book.liteapi.travel',path:'/v3.0/rates/prebook',query:{timeout:30},body:{offerId:target.offerId,usePaymentSdk:false}};
 fail('OPERATION_FORBIDDEN');
}
export const comparisonAuthorization=(c,i)=>'AUTHORIZE_MAX11_'+c.caseId+'_HEAD_'+i.expectedHead+'_INVENTORY_'+hash(i)+'_CONFIG_'+hash(c)+'_RATES1_DETAILS5_PREBOOK5_NO_RETRY_NO_ENGINE';
const safe=p=>!isAbsolute(p)&&!p.includes(':')&&!p.split(/[\\/]/).includes('..');
export function comparisonCodePaths(root){
 const seen=new Set(),visit=p=>{if(seen.has(p))return;seen.add(p);for(const m of readFileSync(join(root,p),'utf8').matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
  const q=relative(root,resolve(root,dirname(p),m[1])).replaceAll('\\','/');if(!safe(q))fail('IMPORT_SCOPE');visit(q);}};
 visit('scripts/run-liteapi-comparison-max11.mjs');
 for(const p of ['invoke-liteapi-comparison-max11.ps1','invoke-liteapi-profile-runner.ps1','liteapi-credential-store.ps1','protect-v3-provider-raw-key-dpapi.ps1'])seen.add('scripts/'+p);
 return [...seen].sort();
}
export function createComparisonInventory(root,expectedHead,expectedBranch){
 if(expectedBranch!==COMPARISON_BRANCH||git(root,['branch','--show-current'])!==expectedBranch||git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['diff','--cached','--name-only']))fail('CHECKPOINT');
 const code=comparisonCodePaths(root).map(path=>({path,sha256:sha(readFileSync(join(root,path)))}));
 const preserved=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(x=>x.slice(3)).filter(p=>!code.some(x=>x.path===p)).sort().map(path=>({path,sha256:sha(readFileSync(join(root,path)))}));
 return {version:COMPARISON_PLAN,expectedHead,expectedBranch,nodeSha256:sha(readFileSync(process.execPath)),code,preserved};
}
export function verifyComparisonInventory(root,i,head,branch,{synthetic=false}={}){
 const actual=createComparisonInventory(root,head,branch);
 if(!same(i,actual))fail('INVENTORY_OR_WORKTREE_CHANGED');
 if(!synthetic)for(const f of i.code){const r=spawnSync('git',['show',head+':'+f.path],{cwd:root,windowsHide:true});
  if(r.status!==0||r.stdout.toString('utf8').replaceAll('\r\n','\n')!==readFileSync(join(root,f.path),'utf8').replaceAll('\r\n','\n'))fail('CODE_NOT_COMMITTED');}
 return {head,branch,inventorySha256:hash(i)};
}
