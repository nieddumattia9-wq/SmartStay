// D-0066. Credential-free preparation; acquisition only after the protected
// PowerShell prompt. Reuses the bounded transport and authenticated custody.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {sha,hash,same,fail,validateHotelDetailPlan,createHotelDetailInventory,verifyHotelDetailInventory,hotelDetailAuthorization,outside,assertNoLinks} from './liteapi-hotel-detail-plan-v1.mjs';
import {createHotelDetailsJournal,verifyHotelDetailsJournal} from './liteapi-hotel-details-journal-v1.mjs';
import {runHotelDetailsAcquisition,readAuthenticatedHotelDetails} from './liteapi-hotel-details-capture-v1.mjs';
import {verifyHotelDetailSourceFiles,compareHotelDetailCapture} from './liteapi-room-detail-comparison-v1.mjs';
import {createWindowsCurrentUserDpapiProtectorV3} from './provider-raw-quarantine-store.mjs';
import {readProtectedCredentialFrame,credentialHandlingReport} from './liteapi-credential-channel.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function parse(args){const out={};for(const a of args){const m=/^--([A-Za-z][A-Za-z0-9]*)=(.*)$/s.exec(a);if(!m||out[m[1]]!==undefined)fail('CLI_ARGUMENT');out[m[1]]=m[2];}
 const allowed=['Mode','ConfigPath','ConfigSha256','ExpectedHead','ExpectedBranch','InventoryPath','InventorySha256','OutputPath','SimulationPath','SimulationSha256','Authorization','PowerShellVersion'];
 if(Object.keys(out).some(k=>!allowed.includes(k)))fail('CLI_ARGUMENT');return out;}
const load=(p,digest)=>{const bytes=readFileSync(p);try{if(!/^[a-f0-9]{64}$/.test(digest??'')||sha(bytes)!==digest)fail('INPUT_FILE_HASH');return JSON.parse(bytes.toString('utf8'));}finally{bytes.fill(0);}};
export function hotelDetailsPreflight(a){
 if(!['Preflight','Simulate','Acquire'].includes(a.Mode)||!/^5\.1\./.test(a.PowerShellVersion??''))fail('POWERSHELL_51_REQUIRED');
 if(a.OutputPath){outside(root,a.OutputPath);assertNoLinks(a.OutputPath);if(existsSync(a.OutputPath))fail('OUTPUT_ALREADY_PRESENT');if(!existsSync(dirname(resolve(a.OutputPath))))fail('OUTPUT_PARENT_MISSING');}
 const synthetic=a.Mode==='Simulate',config=load(a.ConfigPath,a.ConfigSha256),inventory=load(a.InventoryPath,a.InventorySha256);
 const cp=verifyHotelDetailInventory(root,inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic});
 const status=validateHotelDetailPlan(config,{synthetic});
 if(!synthetic&&(a.SimulationPath||a.SimulationSha256))fail('SIMULATION_OPTION_IN_PRODUCTION');
 if(!synthetic&&config.retention?.directory){const fixed=join(process.env.LOCALAPPDATA??'','StayOpti','private-evidence','liteapi-hotel-detail-enrichment');
  if(!process.env.LOCALAPPDATA||resolve(config.retention.directory)!==resolve(fixed))fail('PRIVATE_REGISTRY_NOT_CURRENT_USER_ROOT');}
 if(config.retention?.directory){outside(root,config.retention.directory);assertNoLinks(config.retention.directory);
  if(existsSync(join(config.retention.directory,'cases',config.caseId)))fail('CASE_ALREADY_PRESENT');
  if(existsSync(join(config.retention.directory,'authorization-registry','case-'+sha(config.caseId)+'.json')))fail('CASE_ALREADY_CONSUMED');
 }
 if(synthetic){const r=resolve(config.retention.directory),t=resolve(tmpdir());if(!r.startsWith(t+'\\')&&!r.startsWith(t+'/'))fail('SYNTHETIC_TEMP_ROOT_REQUIRED');}
 const sourceVerification=synthetic?{status:'SYNTHETIC_SOURCE_ONLY',offerCount:config.source.offers.length,hotelCount:config.targets.length}:verifyHotelDetailSourceFiles(config.source);
 // Fresh invented bytes only; no store constructor, directory or marker.
 const protector=createWindowsCurrentUserDpapiProtectorV3(),probe=Buffer.from('D0066 synthetic in-memory DPAPI probe').toString('base64');
 if(protector.unprotectDataKey(protector.protectDataKey(probe))!==probe)fail('DPAPI_NOT_AVAILABLE');
 return {config,inventory,checkpoint:{head:cp.head,branch:cp.branch,inventorySha256:cp.codeSha256},protector,
  result:{...status,codeSha256:cp.codeSha256,configSha256:hash(config),sourceVerification,sourceBindingSha256:config.source.bindingSha256,
   plannedDetailRequests:config.targets.length,offerCount:config.source.offers.length,rawCustodyCreated:false,dpapiProbe:'PASS_SYNTHETIC_BYTES_CURRENT_USER',
   expectedAuthorization:status.pending.length?null:hotelDetailAuthorization(config,inventory),authorizationConsumed:false,engineInvocations:0,policyInvocations:0}};
}
function output(a,value){const s=JSON.stringify(value,null,2)+'\n';if(a.OutputPath){outside(root,a.OutputPath);assertNoLinks(a.OutputPath);writeFileSync(a.OutputPath,s,{flag:'wx'});}process.stdout.write(s);}
function verifySyntheticFiles(a,p){
 if(sha(readFileSync(a.ConfigPath))!==a.ConfigSha256||sha(readFileSync(a.InventoryPath))!==a.InventorySha256||sha(readFileSync(a.SimulationPath))!==a.SimulationSha256)fail('INPUT_CHANGED');
 verifyHotelDetailInventory(root,p.inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic:true});assertNoLinks(p.config.retention.directory);
}
async function main(){
 const a=parse(process.argv.slice(2));
 if(a.Mode==='Inventory'){
  if(!/^5\.1\./.test(a.PowerShellVersion??'')||!a.OutputPath)fail('INVENTORY_EXPLICIT_OUTPUT_REQUIRED');
  output(a,createHotelDetailInventory(root,{expectedHead:a.ExpectedHead,expectedBranch:a.ExpectedBranch}));return;
 }
 const initial=hotelDetailsPreflight(a);
 if(a.Mode==='Preflight'){output(a,initial.result);return;}
 if(initial.result.pending.length)fail('PENDING_CONFIGURATION_NO_CREDENTIAL_OR_TRANSPORT');
 const synthetic=a.Mode==='Simulate';
 if(!synthetic&&a.Authorization!==initial.result.expectedAuthorization)fail('EXPLICIT_AUTHORIZATION_MISMATCH');
 const simulation=synthetic?load(a.SimulationPath,a.SimulationSha256):null;
 if(synthetic&&simulation.origin!=='SYNTHETIC_ONLY')fail('SYNTHETIC_PROOF_REQUIRED');
 let credential=null,credentialSource='SYNTHETIC_NO_CREDENTIAL';
 const signal=new AbortController(),abort=()=>signal.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try{
  if(!synthetic)({credential,source:credentialSource}=await readProtectedCredentialFrame());
  const p=hotelDetailsPreflight(a);if(!same(p.result,initial.result))fail('PREFLIGHT_CHANGED');
  const registryRoot=resolve(p.config.retention.directory),caseRoot=join(registryRoot,'cases',p.config.caseId),bindingSha256=hash({config:p.config,checkpoint:p.checkpoint});
  const authorizationSha256=hash(synthetic?{synthetic:true,config:p.config,checkpoint:p.checkpoint}:a.Authorization);
  const journalInput={root:caseRoot,registryRoot,repositoryRoot:root,caseId:p.config.caseId,mode:synthetic?'SYNTHETIC_ONLY':'REAL',bindingSha256,authorizationSha256,...(synthetic?{protector:p.protector}:{})};
  const journal=synthetic?createHotelDetailsJournal({...journalInput,context:{config:p.config,checkpoint:p.checkpoint,inventory:p.inventory,configFileSha256:a.ConfigSha256}}):undefined;
  const collected=await runHotelDetailsAcquisition({config:p.config,checkpoint:p.checkpoint,journal,credential,simulation,
   verifyBeforeSend:synthetic?()=>verifySyntheticFiles(a,p):undefined,signal:signal.signal,
   liveApproval:synthetic?null:{inventory:p.inventory,authorization:a.Authorization,configPath:resolve(a.ConfigPath),configFileSha256:a.ConfigSha256,
    inventoryPath:resolve(a.InventoryPath),inventoryFileSha256:a.InventorySha256}});
  credential=null;
  const receipt=verifyHotelDetailsJournal(journalInput);
  const authenticated=readAuthenticatedHotelDetails(journalInput);
  const comparison=compareHotelDetailCapture(p.config.source,authenticated);
  output(a,{...collected,caseId:p.config.caseId,privateDirectory:caseRoot,codeInventorySha256:a.InventorySha256,configFileSha256:a.ConfigSha256,
   journalVerified:['COMPLETED','ABORTED'].includes(receipt.status),comparison,retentionDays:p.config.retention.days,retentionResponsibility:p.config.retention.responsible,automaticDeletion:false,
   previousSourceRetentionRenewed:false,...credentialHandlingReport(credentialSource,collected.failureClass)});
 }finally{credential=null;process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{
 process.stderr.write((/^LITEAPI_[A-Z0-9_]+$/.test(e?.message)?e.message:'LITEAPI_DETAIL_CONTROLLED_FAILURE')+'\n');process.exitCode=1;
});
