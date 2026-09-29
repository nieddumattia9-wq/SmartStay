import {writeFileSync,existsSync} from 'node:fs';import {resolve,join,dirname} from 'node:path';import {tmpdir} from 'node:os';import {fileURLToPath} from 'node:url';
import {validateBandPlan,bandInventory,verifyBandInventory,verifyBandEvidence,loadBandFile,bandAuthorization,BAND_REGISTRY,hash,sha,same,bandFail,outside,assertNoLinks} from './liteapi-band-comparison-plan-v1.mjs';
import {acquireBandComparison} from './liteapi-band-comparison-acquire-v1.mjs';
import {createWindowsCurrentUserDpapiProtectorV3} from './provider-raw-quarantine-store.mjs';
import {readProtectedCredentialFrame,credentialHandlingReport} from './liteapi-credential-channel.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const emit=(a,x)=>{const text=JSON.stringify(x,null,2)+'\n';if(a.OutputPath){outside(root,a.OutputPath);assertNoLinks(a.OutputPath);writeFileSync(a.OutputPath,text,{flag:'wx'});}process.stdout.write(text);};
export function bandPreflight(a){
 if(!/^5\.1\./.test(a.PowerShellVersion??'')||!['Preflight','Simulate','Acquire'].includes(a.Mode))bandFail('POWERSHELL_MODE');
 if(a.OutputPath){outside(root,a.OutputPath);assertNoLinks(a.OutputPath);if(existsSync(a.OutputPath))bandFail('RESULT_ALREADY_EXISTS');}
 const config=loadBandFile(a.ConfigPath,a.ConfigSha),inventory=loadBandFile(a.InventoryPath,a.InventorySha),synthetic=config.origin==='SYNTHETIC_LOCAL_TRANSPORT';
 if(a.Mode==='Acquire'&&synthetic||a.Mode==='Simulate'&&!synthetic||!synthetic&&(a.SimulationPath||a.SimulationSha))bandFail('MODE_ORIGIN');
 const checkpoint=verifyBandInventory(root,inventory,a.ExpectedHead,a.ExpectedBranch,synthetic),state=validateBandPlan(config),evidence=verifyBandEvidence(config,root);
 const dir=resolve(config.retention.directory),allowed=synthetic?resolve(tmpdir()):resolve(process.env.LOCALAPPDATA??'','StayOpti','private-evidence',BAND_REGISTRY);
 if(synthetic?!dir.startsWith(allowed+'\\')&&!dir.startsWith(allowed+'/'):dir!==allowed)bandFail('DESTINATION');outside(root,dir);assertNoLinks(dir);
 if(existsSync(join(dir,'cases',config.caseId))||existsSync(join(dir,'authorization-registry','case-'+sha(config.caseId)+'.json')))bandFail('CASE_CONSUMED');
 const protector=createWindowsCurrentUserDpapiProtectorV3(),probe=Buffer.from('synthetic MAX31 DPAPI test').toString('base64');if(protector.unprotectDataKey(protector.protectDataKey(probe))!==probe)bandFail('DPAPI_PROBE');
 return {config,inventory,checkpoint,protector,result:{...state,...(synthetic&&!state.pending.length?{status:'READY_FOR_SYNTHETIC_MAX31_SIMULATION'}:{}),code:checkpoint,evidence,configSha256:a.ConfigSha,inventorySha256:a.InventorySha,expectedAuthorization:state.pending.length||synthetic?null:bandAuthorization(config,inventory),rawCustodyCreated:false,credentialLoaded:false,providerRequests:0,engineInvocations:0,policyInvocations:0,dpapiProbe:'PASS_SYNTHETIC_BYTES',syntheticProofOnly:synthetic}};
}
async function main(){
 const a={};for(const v of process.argv.slice(2)){const m=/^--([A-Za-z]+)=(.*)$/s.exec(v);if(!m||Object.hasOwn(a,m[1]))bandFail('ARGUMENTS');a[m[1]]=m[2];}
 if(Object.keys(a).some(k=>!['Mode','ExpectedHead','ExpectedBranch','ConfigPath','ConfigSha','InventoryPath','InventorySha','OutputPath','SimulationPath','SimulationSha','PowerShellVersion','Authorization'].includes(k)))bandFail('ARGUMENTS');
 if(a.Mode==='Inventory'){if(!/^5\.1\./.test(a.PowerShellVersion??'')||!a.OutputPath)bandFail('INVENTORY_ARGUMENTS');emit(a,bandInventory(root,a.ExpectedHead,a.ExpectedBranch));return;}
 const p=bandPreflight(a);if(a.Mode==='Preflight'){emit(a,p.result);return;}
 if(p.result.pending.length)bandFail('CONFIGURATION_PENDING');const synthetic=a.Mode==='Simulate';
 if(!synthetic&&a.Authorization!==p.result.expectedAuthorization)bandFail('AUTHORIZATION');
 const simulation=synthetic?loadBandFile(a.SimulationPath,a.SimulationSha):null;let credential=null,source='SYNTHETIC_NO_CREDENTIAL';
 const abort=new AbortController(),stop=()=>abort.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{
  if(!synthetic)({credential,source}=await readProtectedCredentialFrame());
  const verify=()=>{if(!same(loadBandFile(a.ConfigPath,a.ConfigSha),p.config)||!same(loadBandFile(a.InventoryPath,a.InventorySha),p.inventory)||!same(loadBandFile(a.SimulationPath,a.SimulationSha),simulation))bandFail('INPUT_CHANGED');verifyBandInventory(root,p.inventory,a.ExpectedHead,a.ExpectedBranch,true);verifyBandEvidence(p.config,root);};
  const r=await acquireBandComparison({config:p.config,checkpoint:p.checkpoint,simulation,signal:abort.signal,...(synthetic?{syntheticProtector:p.protector,verifyBeforeSend:verify}:{}),
   approval:synthetic?null:{credential,authorization:a.Authorization,inventory:p.inventory,repositoryRoot:root,configPath:resolve(a.ConfigPath),configSha256:a.ConfigSha,inventoryPath:resolve(a.InventoryPath),inventorySha256:a.InventorySha}});
  credential=null;emit(a,{...r,...credentialHandlingReport(source,r.failureClass)});
 }finally{credential=null;process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{process.stderr.write((/^BAND_[A-Z0-9_]+$/.test(e.message)?e.message:'BAND_CONTROLLED_FAILURE')+'\n');process.exitCode=1;});
