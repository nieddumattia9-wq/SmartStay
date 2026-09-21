// D-0062: approval-bound acquisition only; no public provider integration.
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';

export const PLAN_VERSION='stayopti.liteapi-controlled-acquisition@1';
export const LIMITS=Object.freeze({SEARCH:1,HOTEL_DETAIL:5,FACILITIES:1,PREBOOK:5,PREBOOK_GET:5,total:17});
export const BRANCH='codex/evaluation-d0036-d0041';
export const canonical=x=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
export const sha=x=>createHash('sha256').update(x).digest('hex');
export const hash=x=>sha(canonical(x));
export const same=(a,b)=>canonical(a)===canonical(b);
export const fail=code=>{throw Error('LITEAPI_ACQUISITION_'+code);};
export const opaque=x=>typeof x==='string'&&x.length>0&&!/[\x00-\x1f\x7f]/.test(x);
export const kinds=Object.keys(LIMITS).filter(x=>x!=='total');
export function git(root,args){const p=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});if(p.status!==0||p.error)fail('GIT_CHECK');return p.stdout.trimEnd();}
export function assertNoLinks(target){
 let p=resolve(target);for(;;){if(existsSync(p)){const s=lstatSync(p);if(s.isSymbolicLink()||realpathSync.native(p).toLowerCase()!==p.toLowerCase())fail('PATH_LINK_OR_ALIAS');}const parent=dirname(p);if(parent===p)break;p=parent;}
 return resolve(target);
}
export function outside(root,target){if(!isAbsolute(target))fail('PRIVATE_ABSOLUTE_PATH_REQUIRED');const r=relative(root,resolve(target));if(!r||(!r.startsWith('..')&&!isAbsolute(r)))fail('PRIVATE_PATH_IN_REPOSITORY');return assertNoLinks(target);}
const safePath=x=>typeof x==='string'&&!isAbsolute(x)&&!x.split(/[\\/]/).includes('..')&&!x.includes(':');
const entry=root=>p=>({path:p,sha256:sha(readFileSync(join(root,p)))});
export function acquisitionCodePaths(root){
 // All executable source dependencies, plus launcher and protector, not arbitrary
 // caller-selected subsets. Kernel is deliberately absent from acquisition.
 const seen=new Set(),visit=p=>{if(seen.has(p))return;seen.add(p);const text=readFileSync(join(root,p),'utf8');
  for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
   const q=relative(root,resolve(root,dirname(p),m[1])).replaceAll('\\','/');if(!safePath(q))fail('CODE_IMPORT_SCOPE');visit(q);
  }};
 visit('scripts/run-liteapi-controlled-acquisition.mjs');
 seen.add('scripts/invoke-liteapi-controlled-acquisition.ps1');seen.add('scripts/invoke-liteapi-profile-runner.ps1');seen.add('scripts/liteapi-credential-store.ps1');seen.add('scripts/protect-v3-provider-raw-key-dpapi.ps1');
 return [...seen].sort();
}
export function createAcquisitionInventory(root,{expectedHead,expectedBranch}){
 if(git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['branch','--show-current'])!==expectedBranch)fail('CHECKPOINT_MISMATCH');
 if(git(root,['diff','--cached','--name-only']))fail('STAGING_NOT_EMPTY');
 const code=acquisitionCodePaths(root).map(entry(root));
 const dirty=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(line=>line.slice(3));
 // Inventory records exceptions, but relevant executable dirty files are NEVER
 // permitted in a production preflight. Synthetic candidate proof is separate.
 return {version:PLAN_VERSION,expectedHead,expectedBranch,nodeSha256:sha(readFileSync(process.execPath)),code,
  preserved:dirty.filter(p=>!code.some(c=>c.path===p)).sort().map(entry(root))};
}
export function verifyAcquisitionInventory(root,inventory,expectedHead,expectedBranch,{synthetic=false}={}){
 if(inventory.version!==PLAN_VERSION||inventory.expectedHead!==expectedHead||inventory.expectedBranch!==expectedBranch||expectedBranch!==BRANCH||
  git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['branch','--show-current'])!==expectedBranch)fail('CHECKPOINT_MISMATCH');
 if(git(root,['diff','--cached','--name-only']))fail('STAGING_NOT_EMPTY');
 if(inventory.nodeSha256!==sha(readFileSync(process.execPath)))fail('NODE_CHANGED');
 if(!same(inventory.code.map(x=>x.path).sort(),acquisitionCodePaths(root)))fail('CODE_INVENTORY_INCOMPLETE');
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
export function validatePlan(config,{synthetic=false}={}){
 if(config?.version!==PLAN_VERSION||!/^D006[02]_[A-Z0-9_]+$/.test(config.caseId??''))fail('CONFIG_VERSION_OR_CASE');
 if(config.origin!==(synthetic?'SYNTHETIC_LOCAL_TRANSPORT':'LITEAPI_PRODUCTION'))fail('ORIGIN_MISMATCH');
 if(!same(config.limits,LIMITS)||config.concurrency!==1||config.retries!==0||config.redirects!==0||config.pagination!==0||config.pacingMs!==1000||
  !same(config.timeoutMs,{SEARCH:15000,HOTEL_DETAIL:15000,FACILITIES:15000,PREBOOK:30000,PREBOOK_GET:15000}))fail('LIMITS_CHANGED');
 if(!same(config.selection,{version:'HASHED_PROVIDER_IDS_AUDIT_ONLY@1',seed:'D0060_CASE_001_SELECTION_V1',maximumHotels:5}))fail('SELECTION_CHANGED');
 const s=config.scenario,q=s?.searchRequest,p=s?.party;
 if(!q||!p||q.limit!==20||q.maxRatesPerHotel!==3||q.roomMapping!==true||q.includeHotelData!==true||q.currency!=='EUR'||
  !same(q.occupancies,[{adults:p.adults,children:p.childAgesAtStay}])||p.unitsRequested!==1||s.distance?.semantics!=='not-requested'||s.distance.kilometers!==null||
  s.preferenceId!=='balanced'||s.preferenceSource!=='manual'||!same(p.requirements,s.essentialRequirementBasis)||
  !same(p.requirements,{sleepingPlaces:true,capacity:true,childAdmission:true,exclusiveUse:false,privateBathroom:false})||
  !same(s.stay,{checkIn:q.checkin,checkOut:q.checkout,currency:q.currency}))fail('SCENARIO_SCOPE');
 if(Object.keys(q).some(k=>!['cityName','countryCode','checkin','checkout','currency','guestNationality','occupancies','limit','maxRatesPerHotel','includeHotelData','roomMapping'].includes(k)))fail('SEARCH_EXTRA_FIELD');
 if(!synthetic&&(!same([q.cityName,q.countryCode,q.checkin,q.checkout,p.adults,p.childAgesAtStay,s.totalBudget],['Bologna','IT','2027-01-10','2027-01-17',2,[6,11],1400])||config.caseId!=='D0060_LITEAPI_NEW_BOLOGNA_20270110_CASE_001'))fail('D0060_SCENARIO_CHANGED');
 const pending=[];
 if(!/^[A-Z]{2}$/.test(q.guestNationality??''))pending.push('NATIONALITY_NOT_CONFIRMED');
 if(config.account?.environment!==(synthetic?'SYNTHETIC':'LIVE_PRODUCTION')||config.account?.conditionsConfirmed!==true||
  !opaque(config.account?.accountReference)||!opaque(config.account?.commercialTermsReference)||config.account?.priceBasis!=='PUBLIC_CONSUMER_PAYABLE_OFFER_RETAIL'||
  !Number.isFinite(config.account?.maximumUsageCostEur)||config.account.maximumUsageCostEur<0||config.account?.fivePrebookCreationsAcknowledged!==true)pending.push('ACCOUNT_COST_AND_PREBOOK_EFFECTS_NOT_CONFIRMED');
 if(!opaque(config.retention?.directory)||!Number.isInteger(config.retention?.days)||config.retention.days<1||config.retention?.responsible!=='Mattia'||
  config.retention?.access!=='WINDOWS_CURRENT_USER_DPAPI'||config.retention?.noAutomaticDeletionAcknowledged!==true)pending.push('PRIVATE_RETENTION_NOT_CONFIRMED');
 if(config.scenarioConfirmed!==true)pending.push('SCENARIO_NOT_CONFIRMED');
 return {status:pending.length?'HOLD_CONFIGURATION_PENDING':'READY_FOR_EXPLICIT_ACQUISITION_AUTHORIZATION',pending,providerRequests:0,credentialLoaded:false};
}
export function authorizationLiteral(config,inventory){return 'AUTHORIZE_D0062_PRODUCTION_CASE_'+config.caseId+'_HEAD_'+inventory.expectedHead+'_CODE_'+hash(inventory)+'_CONFIG_'+hash(config)+'_MAX17_RATES1_DETAIL5_FACILITIES1_PREBOOK5_GET5_NO_RETRY_NO_REDIRECT_NO_ENGINE';}
export function intent(kind,{hotelId=null,offerId=null,prebookId=null,config}={}){
 const read=kind==='SEARCH'||kind==='HOTEL_DETAIL'||kind==='FACILITIES';
 const path=kind==='SEARCH'?'/v3.0/hotels/rates':kind==='HOTEL_DETAIL'?'/v3.0/data/hotel':kind==='FACILITIES'?'/v3.0/data/facilities':kind==='PREBOOK'?'/v3.0/rates/prebook':'/v3.0/prebooks/'+encodeURIComponent(prebookId);
 return {kind,hotelId,offerId,prebookId,method:['SEARCH','PREBOOK'].includes(kind)?'POST':'GET',host:read?'api.liteapi.travel':'book.liteapi.travel',path,
  query:kind==='HOTEL_DETAIL'?{hotelId}:{},body:kind==='SEARCH'?config.scenario.searchRequest:kind==='PREBOOK'?{offerId,usePaymentSdk:false}:null};
}
export function validateIntent(request,config,selection,records){
 if(!kinds.includes(request.kind)||!same(request,intent(request.kind,{...request,config})))fail('ENDPOINT_OR_REQUEST_NOT_ALLOWED');
 for(const id of [request.hotelId,request.offerId,request.prebookId])if(id!==null&&!opaque(id))fail('OPAQUE_IDENTIFIER_INVALID');
 if(request.kind==='SEARCH')return;
 if(!selection)fail('SELECTION_NOT_SEALED');
 if(request.kind==='FACILITIES')return;
 const s=selection.selected.find(s=>s.hotelId===request.hotelId);if(!s)fail('HOTEL_NOT_SELECTED');
 if(['PREBOOK','PREBOOK_GET'].includes(request.kind)&&(!s.offerId||s.offerId!==request.offerId))fail('OFFER_NOT_SELECTED');
 if(request.kind==='PREBOOK_GET'&&!records.some(r=>r.intent.kind==='PREBOOK'&&r.intent.offerId===request.offerId&&r.returnedPrebookId===request.prebookId&&r.outcome==='SUCCEEDED'))fail('PREBOOK_ID_NOT_RETURNED');
}
