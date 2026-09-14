import {readFileSync,writeFileSync,existsSync,mkdtempSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {PLAN_VERSION,BRANCH,sha,hash,same,fail,validatePlan,createAcquisitionInventory,verifyAcquisitionInventory,authorizationLiteral,outside,assertNoLinks} from './liteapi-controlled-plan-v1.mjs';
import {createAcquisitionJournal,verifyAcquisitionJournal} from './liteapi-acquisition-journal-v1.mjs';
import {runControlledAcquisition,verifyControlledCapture} from './liteapi-controlled-capture-v1.mjs';
import {prepareLiteApiProviderObservation} from './liteapi-observation-diagnostic-v1.mjs';
import {createWindowsCurrentUserDpapiProtectorV3} from './provider-raw-quarantine-store.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function parse(args){const out={};for(const a of args){const m=/^--([A-Za-z][A-Za-z0-9]*)=(.*)$/s.exec(a);if(!m||out[m[1]]!==undefined)fail('CLI_ARGUMENT');out[m[1]]=m[2];}
 const allowed=['Mode','ConfigPath','ConfigSha256','ExpectedHead','ExpectedBranch','InventoryPath','InventorySha256','OutputPath','SimulationPath','SimulationSha256','Authorization','PowerShellVersion'];
 if(Object.keys(out).some(k=>!allowed.includes(k)))fail('CLI_ARGUMENT');return out;}
const load=(p,digest)=>{if(!/^[a-f0-9]{64}$/.test(digest??'')||sha(readFileSync(p))!==digest)fail('INPUT_FILE_HASH');return JSON.parse(readFileSync(p,'utf8'));};
export function controlledPreflight(a){
 if(!['Preflight','Simulate','Acquire'].includes(a.Mode)||!/^5\.1\./.test(a.PowerShellVersion??''))fail('POWERSHELL_51_REQUIRED');
 if(a.OutputPath){outside(root,a.OutputPath);if(existsSync(a.OutputPath))fail('OUTPUT_ALREADY_PRESENT');if(!existsSync(dirname(resolve(a.OutputPath))))fail('OUTPUT_PARENT_MISSING');}
 const synthetic=a.Mode==='Simulate',config=load(a.ConfigPath,a.ConfigSha256),inventory=load(a.InventoryPath,a.InventorySha256);
 const checkpoint=verifyAcquisitionInventory(root,inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic});
 const status=validatePlan(config,{synthetic});
 if(!synthetic&&config.retention?.directory){const fixed=join(process.env.LOCALAPPDATA??'', 'StayOpti','private-evidence','liteapi-controlled-acquisition');
  if(!process.env.LOCALAPPDATA||resolve(config.retention.directory)!==resolve(fixed))fail('PRIVATE_REGISTRY_NOT_CURRENT_USER_ROOT');}
 if(config.retention?.directory){outside(root,config.retention.directory);if(existsSync(join(config.retention.directory,'cases',config.caseId)))fail('CASE_ALREADY_PRESENT');}
 if(synthetic){outside(root,config.retention.directory);const r=resolve(config.retention.directory),t=resolve(tmpdir());if(!r.startsWith(t+'\\')&&!r.startsWith(t+'/'))fail('SYNTHETIC_TEMP_ROOT_REQUIRED');}
 // Probe encrypts only freshly generated invented bytes, no store constructor,
 // directory/session creation or existing private evidence access.
 const protector=createWindowsCurrentUserDpapiProtectorV3(),probe=Buffer.from('D0062 synthetic in-memory DPAPI probe').toString('base64');
 if(protector.unprotectDataKey(protector.protectDataKey(probe))!==probe)fail('DPAPI_NOT_AVAILABLE');
 return {config,inventory,checkpoint:{head:checkpoint.head,branch:checkpoint.branch,inventorySha256:checkpoint.codeSha256},protector,
  result:{...status,codeSha256:checkpoint.codeSha256,configSha256:hash(config),rawCustodyCreated:false,dpapiProbe:'PASS_SYNTHETIC_BYTES_CURRENT_USER',
   expectedAuthorization:status.pending.length?null:authorizationLiteral(config,inventory),authorizationConsumed:false,engineInvocations:0,policyInvocations:0}};
}
async function readCredential(){let data='';for await(const c of process.stdin){data+=c.toString('utf8');if(data.length>65536)fail('CREDENTIAL_INPUT_TOO_LARGE');if(data.includes('\n'))break;}
 const value=data.replace(/[\r\n]+$/,'');data='';if(!value.trim()||/[\r\n]/.test(value))fail('CREDENTIAL_EMPTY_OR_INVALID');return value;}
function output(a,value){const s=JSON.stringify(value,null,2)+'\n';if(a.OutputPath){outside(root,a.OutputPath);if(existsSync(a.OutputPath))fail('OUTPUT_ALREADY_PRESENT');writeFileSync(a.OutputPath,s,{flag:'wx'});}process.stdout.write(s);}
async function main(){
 const a=parse(process.argv.slice(2));
 if(a.Mode==='Inventory'){
  if(!/^5\.1\./.test(a.PowerShellVersion??'')||!a.OutputPath)fail('INVENTORY_EXPLICIT_OUTPUT_REQUIRED');
  const inventory=createAcquisitionInventory(root,{expectedHead:a.ExpectedHead,expectedBranch:a.ExpectedBranch});output(a,inventory);return;
 }
 const initial=controlledPreflight(a);
 if(a.Mode==='Preflight'){output(a,initial.result);return;}
 if(initial.result.pending.length)fail('PENDING_CONFIGURATION_NO_CREDENTIAL_OR_TRANSPORT');
 const synthetic=a.Mode==='Simulate';
 if(!synthetic&&a.Authorization!==initial.result.expectedAuthorization)fail('EXPLICIT_AUTHORIZATION_MISMATCH');
 if(!synthetic&&(a.SimulationPath||a.SimulationSha256))fail('SIMULATION_OPTION_IN_PRODUCTION');
 const simulation=synthetic?load(a.SimulationPath,a.SimulationSha256):null;
 if(synthetic&&simulation.origin!=='SYNTHETIC_ONLY')fail('SYNTHETIC_PROOF_REQUIRED');
 let credential=null;
 const signal=new AbortController(),abort=()=>signal.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try{
  if(!synthetic)credential=await readCredential();
  const p=controlledPreflight(a);if(!same(p.result,initial.result))fail('PREFLIGHT_CHANGED');
  const registryRoot=resolve(p.config.retention.directory),caseRoot=join(registryRoot,'cases',p.config.caseId),bindingSha256=hash({config:p.config,checkpoint:p.checkpoint});
  const authorizationSha256=hash(synthetic?{synthetic:true,config:p.config,checkpoint:p.checkpoint}:a.Authorization);
  const journal=synthetic?createAcquisitionJournal({root:caseRoot,registryRoot,repositoryRoot:root,caseId:p.config.caseId,bindingSha256,authorizationSha256,
   mode:'SYNTHETIC_ONLY',context:{config:p.config,checkpoint:p.checkpoint,inventory:p.inventory,configFileSha256:a.ConfigSha256},protector:p.protector}):undefined;
  const verifyBeforeSend=synthetic?()=>{const fresh=controlledPreflightWithoutProbe(a,p);if(!fresh)fail('CHECKPOINT_CHANGED');}:undefined;
  const collected=await runControlledAcquisition({config:p.config,checkpoint:p.checkpoint,journal,credential,simulation,verifyBeforeSend,signal:signal.signal,
   liveApproval:synthetic?null:{inventory:p.inventory,authorization:a.Authorization,configFileSha256:a.ConfigSha256}});
  credential=null;
  // Capture is a reconstructed verified view, NOT original HTTP bytes. Original
  // individual requests/responses are encrypted in the journal before use.
  const captureText=JSON.stringify(collected.capture);
  // Summary contains no provider IDs, URLs, response text or credential.
  let preparationStatus='NOT_PREPARED',issues=[];
  try{verifyControlledCapture(collected.capture,{config:p.config,checkpoint:p.checkpoint});
   const prepared=prepareLiteApiProviderObservation({capture:collected.capture,config:p.config,checkpoint:p.checkpoint,evaluatedAt:new Date().toISOString()});
   preparationStatus=prepared.status;issues=prepared.limitations??[];
  }catch(e){issues=[/^LITEAPI_[A-Z0-9_]+$/.test(e.message)?e.message:'CAPTURE_OR_WIRE_NOT_SUPPORTED'];}
  const receipt=verifyAcquisitionJournal({root:caseRoot,registryRoot,repositoryRoot:root,caseId:p.config.caseId,mode:synthetic?'SYNTHETIC_ONLY':'REAL',bindingSha256,authorizationSha256,...(synthetic?{protector:p.protector}:{})});
  output(a,{version:PLAN_VERSION,status:collected.capture.status,origin:p.config.origin,caseId:p.config.caseId,privateDirectory:caseRoot,
   actualAttempts:collected.actualAttempts,providerHttpRequests:collected.providerHttpRequests,localHttpRequests:collected.localHttpRequests,
   requestCountBasis:'RESERVED_TRANSMISSION_ATTEMPTS_NOT_PROVIDER_RECEIPTS',
   prebookCreationsAttempted:collected.prebookCreationsAttempted,remotePrebookEffectUncertain:collected.remotePrebookEffectUncertain,
   captureSha256:sha(captureText),preparationStatus,issues,engineInvocations:0,policyInvocations:0,
   retentionDays:p.config.retention.days,retentionResponsibility:p.config.retention.responsible,automaticDeletion:false,
   custodyStartedAt:receipt.startedAt,retentionEndsAt:new Date(Date.parse(receipt.startedAt)+p.config.retention.days*86400000).toISOString(),
   credentialPersisted:false,credentialPrinted:false,credentialClearedFromProcess:true,syntheticProofOnly:synthetic,
   journalVerified:receipt.status==='COMPLETED'||receipt.status==='ABORTED',authorizationConsumed:!synthetic});
 }finally{credential=null;process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
function controlledPreflightWithoutProbe(a,p){
 if(sha(readFileSync(a.ConfigPath))!==a.ConfigSha256||sha(readFileSync(a.InventoryPath))!==a.InventorySha256)fail('INPUT_CHANGED');
 verifyAcquisitionInventory(root,p.inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic:a.Mode==='Simulate'});assertNoLinks(p.config.retention.directory);return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{
 process.stderr.write((/^LITEAPI_[A-Z0-9_]+$/.test(e?.message)?e.message:'LITEAPI_ACQUISITION_CONTROLLED_FAILURE')+'\n');process.exitCode=1;
});
