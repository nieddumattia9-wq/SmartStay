// D-0077 operational boundary. No endpoint, account or historical-case mutation.
import {readFileSync} from 'node:fs';
import {resolve,relative,dirname,join,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {canonical,sha,hash,same,git,outside,assertNoLinks,COMPARISON_BRANCH} from './liteapi-comparison-plan-v1.mjs';
import {validateSspProbePlan,SSP_PROBE_OPERATIONAL_VERSION,isOperationalSspVersion} from './liteapi-ssp-probe-v1.mjs';
export {canonical,sha,hash,same,git,outside,assertNoLinks,validateSspProbePlan};
export const SSP_REGISTRY='liteapi-ssp-price-probe-max3';
export const fail=c=>{throw Error('SSP_PROBE_'+c);};
export const sspAuthorization=(c,i)=>'AUTHORIZE_SSP_MAX3_'+c.caseId+'_HEAD_'+i.expectedHead+'_INVENTORY_'+hash(i)+'_CONFIG_'+hash(c)+'_RATES1_REQUOTE1_PREBOOK1_NO_RETRY_NO_ENGINE';
export function loadSspFile(file,digest){
 assertNoLinks(file);const b=readFileSync(file);try{if(sha(b)!==digest)fail('FILE_HASH');return JSON.parse(b);}finally{b.fill(0);}
}
/** Integrity of already-reviewed non-secret documentary references. Not a
 * provider permission oracle: documented scope and limitations stay in refs. */
export function verifySspPlanEvidence(c,root){
 validateSspProbePlan(c);if(!isOperationalSspVersion(c.version))fail('OPERATIONAL_VERSION_REQUIRED');
 const evidence=[];
 for(const [name,v]of [['hotelSource',c.hotelSource],...Object.entries(c.comparisonPlan.externalConditions).filter(([,v])=>v?.status==='DOCUMENTED')]){
  if(!isAbsolute(v.reference)||!(/\.(json|md)$/i).test(v.reference)||/private-evidence|credentials|private-api-key/i.test(v.reference))fail('EVIDENCE_REFERENCE_SCOPE');
  outside(root,v.reference);assertNoLinks(v.reference);const b=readFileSync(v.reference);
  try{if(b.length>4194304||sha(b)!==v.sha256)fail('EVIDENCE_HASH');
   if(name==='hotelSource'){
    let value=JSON.parse(b);for(const token of v.pointer.slice(1).split('/'))value=value?.[token.replaceAll('~1','/').replaceAll('~0','~')];
    if(value!==c.hotelId)fail('HOTEL_SOURCE_BINDING');
   }
   evidence.push({name,sha256:v.sha256});
  }finally{b.fill(0);}
 }
 return evidence;
}
export function sspCodePaths(root){
 const seen=new Set(),visit=p=>{if(seen.has(p))return;seen.add(p);for(const m of readFileSync(join(root,p),'utf8').matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
  const q=relative(root,resolve(root,dirname(p),m[1])).replaceAll('\\','/');if(isAbsolute(q)||q.includes(':')||q.split('/').includes('..'))fail('IMPORT_SCOPE');visit(q);}};
 visit('scripts/run-liteapi-ssp-probe.mjs');
 for(const p of ['invoke-liteapi-ssp-probe.ps1','invoke-liteapi-profile-runner.ps1','liteapi-credential-store.ps1','protect-v3-provider-raw-key-dpapi.ps1'])seen.add('scripts/'+p);
 return [...seen].sort();
}
export function createSspInventory(root,expectedHead,expectedBranch){
 if(expectedBranch!==COMPARISON_BRANCH||git(root,['branch','--show-current'])!==expectedBranch||git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['diff','--cached','--name-only']))fail('CHECKPOINT');
 const code=sspCodePaths(root).map(path=>({path,sha256:sha(readFileSync(join(root,path)))}));
 const preserved=git(root,['status','--porcelain=v1','--untracked-files=all']).split('\n').filter(Boolean).map(x=>x.slice(3)).filter(p=>!code.some(x=>x.path===p)).sort().map(path=>({path,sha256:sha(readFileSync(join(root,path)))}));
 return {version:SSP_PROBE_OPERATIONAL_VERSION,expectedHead,expectedBranch,nodeSha256:sha(readFileSync(process.execPath)),code,preserved};
}
export function verifySspInventory(root,i,head,branch,{synthetic=false}={}){
 if(!same(i,createSspInventory(root,head,branch)))fail('INVENTORY_OR_WORKTREE_CHANGED');
 if(!synthetic)for(const f of i.code){const r=spawnSync('git',['show',head+':'+f.path],{cwd:root,windowsHide:true});
  if(r.status!==0||r.stdout.toString('utf8').replaceAll('\r\n','\n')!==readFileSync(join(root,f.path),'utf8').replaceAll('\r\n','\n'))fail('CODE_NOT_COMMITTED');}
 return {head,branch,inventorySha256:hash(i)};
}
