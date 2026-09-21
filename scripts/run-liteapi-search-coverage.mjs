import {readFileSync,writeFileSync,existsSync,mkdtempSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {COVERAGE_VERSION,BRANCH,sha,hash,same,fail,validateCoveragePlan,createCoverageInventory,verifyCoverageInventory,coverageAuthorization,outside,assertNoLinks} from './liteapi-search-coverage-plan-v1.mjs';
import {createCoverageJournal,verifyCoverageJournal} from './liteapi-search-coverage-journal-v1.mjs';
import {runCoverageAcquisition} from './liteapi-search-coverage-capture-v1.mjs';
import {createWindowsCurrentUserDpapiProtectorV3} from './provider-raw-quarantine-store.mjs';
import {readProtectedCredentialFrame,credentialHandlingReport} from './liteapi-credential-channel.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function parse(args){const out={};for(const a of args){const m=/^--([A-Za-z][A-Za-z0-9]*)=(.*)$/s.exec(a);if(!m||out[m[1]]!==undefined)fail('CLI_ARGUMENT');out[m[1]]=m[2];}
 const allowed=['Mode','ConfigPath','ConfigSha256','ExpectedHead','ExpectedBranch','InventoryPath','InventorySha256','OutputPath','SimulationPath','SimulationSha256','Authorization','PowerShellVersion'];
 if(Object.keys(out).some(k=>!allowed.includes(k)))fail('CLI_ARGUMENT');return out;}
const load=(p,digest)=>{if(!/^[a-f0-9]{64}$/.test(digest??'')||sha(readFileSync(p))!==digest)fail('INPUT_FILE_HASH');return JSON.parse(readFileSync(p,'utf8'));};
export function coveragePreflight(a){
 if(!['Preflight','Simulate','Acquire'].includes(a.Mode)||!/^5\.1\./.test(a.PowerShellVersion??''))fail('POWERSHELL_51_REQUIRED');
 if(a.OutputPath){outside(root,a.OutputPath);if(existsSync(a.OutputPath))fail('OUTPUT_ALREADY_PRESENT');if(!existsSync(dirname(resolve(a.OutputPath))))fail('OUTPUT_PARENT_MISSING');}
 const synthetic=a.Mode==='Simulate',config=load(a.ConfigPath,a.ConfigSha256),inventory=load(a.InventoryPath,a.InventorySha256);
 const checkpoint=verifyCoverageInventory(root,inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic});
 const status=validateCoveragePlan(config,{synthetic});
 if(!synthetic&&config.retention?.directory){const fixed=join(process.env.LOCALAPPDATA??'', 'StayOpti','private-evidence','liteapi-search-coverage');
  if(!process.env.LOCALAPPDATA||resolve(config.retention.directory)!==resolve(fixed))fail('PRIVATE_REGISTRY_NOT_CURRENT_USER_ROOT');}
 if(config.retention?.directory){outside(root,config.retention.directory);
  if(existsSync(join(config.retention.directory,'cases',config.caseId)))fail('CASE_ALREADY_PRESENT');
  if(existsSync(join(config.retention.directory,'authorization-registry','case-'+sha(config.caseId)+'.json')))fail('CASE_ALREADY_CONSUMED');
 }
 if(synthetic){outside(root,config.retention.directory);const r=resolve(config.retention.directory),t=resolve(tmpdir());if(!r.startsWith(t+'\\')&&!r.startsWith(t+'/'))fail('SYNTHETIC_TEMP_ROOT_REQUIRED');}
 // Probe encrypts only freshly generated invented bytes, no store constructor,
 // directory/session creation or existing private evidence access.
 const protector=createWindowsCurrentUserDpapiProtectorV3(),probe=Buffer.from('D0064 synthetic in-memory DPAPI probe').toString('base64');
 if(protector.unprotectDataKey(protector.protectDataKey(probe))!==probe)fail('DPAPI_NOT_AVAILABLE');
 return {config,inventory,checkpoint:{head:checkpoint.head,branch:checkpoint.branch,inventorySha256:checkpoint.codeSha256},protector,
  result:{...status,codeSha256:checkpoint.codeSha256,configSha256:hash(config),rawCustodyCreated:false,dpapiProbe:'PASS_SYNTHETIC_BYTES_CURRENT_USER',
   expectedAuthorization:status.pending.length?null:coverageAuthorization(config,inventory),authorizationConsumed:false,engineInvocations:0,policyInvocations:0}};
}
function output(a,value){const s=JSON.stringify(value,null,2)+'\n';if(a.OutputPath){outside(root,a.OutputPath);if(existsSync(a.OutputPath))fail('OUTPUT_ALREADY_PRESENT');writeFileSync(a.OutputPath,s,{flag:'wx'});}process.stdout.write(s);}
async function main(){
 const a=parse(process.argv.slice(2));
 if(a.Mode==='Inventory'){
  if(!/^5\.1\./.test(a.PowerShellVersion??'')||!a.OutputPath)fail('INVENTORY_EXPLICIT_OUTPUT_REQUIRED');
  const inventory=createCoverageInventory(root,{expectedHead:a.ExpectedHead,expectedBranch:a.ExpectedBranch});output(a,inventory);return;
 }
 const initial=coveragePreflight(a);
 if(a.Mode==='Preflight'){output(a,initial.result);return;}
 if(initial.result.pending.length)fail('PENDING_CONFIGURATION_NO_CREDENTIAL_OR_TRANSPORT');
 const synthetic=a.Mode==='Simulate';
 if(!synthetic&&a.Authorization!==initial.result.expectedAuthorization)fail('EXPLICIT_AUTHORIZATION_MISMATCH');
 if(!synthetic&&(a.SimulationPath||a.SimulationSha256))fail('SIMULATION_OPTION_IN_PRODUCTION');
 const simulation=synthetic?load(a.SimulationPath,a.SimulationSha256):null;
 if(synthetic&&simulation.origin!=='SYNTHETIC_ONLY')fail('SYNTHETIC_PROOF_REQUIRED');
 let credential=null,credentialSource='SYNTHETIC_NO_CREDENTIAL';
 const signal=new AbortController(),abort=()=>signal.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try{
  if(!synthetic)({credential,source:credentialSource}=await readProtectedCredentialFrame());
  const p=coveragePreflight(a);if(!same(p.result,initial.result))fail('PREFLIGHT_CHANGED');
  const registryRoot=resolve(p.config.retention.directory),caseRoot=join(registryRoot,'cases',p.config.caseId),bindingSha256=hash({config:p.config,checkpoint:p.checkpoint});
  const authorizationSha256=hash(synthetic?{synthetic:true,config:p.config,checkpoint:p.checkpoint}:a.Authorization);
  const journal=synthetic?createCoverageJournal({root:caseRoot,registryRoot,repositoryRoot:root,caseId:p.config.caseId,bindingSha256,authorizationSha256,
   mode:'SYNTHETIC_ONLY',context:{config:p.config,checkpoint:p.checkpoint,inventory:p.inventory,configFileSha256:a.ConfigSha256},protector:p.protector}):undefined;
  const verifyBeforeSend=synthetic?()=>{const fresh=coveragePreflightWithoutProbe(a,p);if(!fresh)fail('CHECKPOINT_CHANGED');}:undefined;
  const collected=await runCoverageAcquisition({config:p.config,checkpoint:p.checkpoint,journal,credential,simulation,verifyBeforeSend,signal:signal.signal,
   liveApproval:synthetic?null:{inventory:p.inventory,authorization:a.Authorization,configFileSha256:a.ConfigSha256}});
  credential=null;
  const receipt=verifyCoverageJournal({root:caseRoot,registryRoot,repositoryRoot:root,caseId:p.config.caseId,mode:synthetic?'SYNTHETIC_ONLY':'REAL',bindingSha256,authorizationSha256,...(synthetic?{protector:p.protector}:{})});
  output(a,{...collected,caseId:p.config.caseId,privateDirectory:caseRoot,codeInventorySha256:a.InventorySha256,configFileSha256:a.ConfigSha256,
   journalVerified:['COMPLETED','ABORTED'].includes(receipt.status),retentionDays:p.config.retention.days,retentionResponsibility:p.config.retention.responsible,automaticDeletion:false,
   ...credentialHandlingReport(credentialSource,collected.failureClass)});
 }finally{credential=null;process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
function coveragePreflightWithoutProbe(a,p){
 if(sha(readFileSync(a.ConfigPath))!==a.ConfigSha256||sha(readFileSync(a.InventoryPath))!==a.InventorySha256)fail('INPUT_CHANGED');
 verifyCoverageInventory(root,p.inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic:a.Mode==='Simulate'});assertNoLinks(p.config.retention.directory);return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{
 process.stderr.write((/^LITEAPI_[A-Z0-9_]+$/.test(e?.message)?e.message:'LITEAPI_COVERAGE_CONTROLLED_FAILURE')+'\n');process.exitCode=1;
});
