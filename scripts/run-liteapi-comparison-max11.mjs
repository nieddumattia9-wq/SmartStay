import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {validateComparisonPlan,createComparisonInventory,verifyComparisonInventory,comparisonAuthorization,COMPARISON_REGISTRY,hash,sha,same,fail,outside,assertNoLinks} from './liteapi-comparison-plan-v1.mjs';
import {acquireComparison} from './liteapi-comparison-capture-v1.mjs';
import {createWindowsCurrentUserDpapiProtectorV3} from './provider-raw-quarantine-store.mjs';
import {readProtectedCredentialFrame,credentialHandlingReport} from './liteapi-credential-channel.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function args(values){const a={};for(const v of values){const m=/^--([A-Za-z]+)=(.*)$/s.exec(v);if(!m||Object.hasOwn(a,m[1]))fail('ARGUMENTS');a[m[1]]=m[2];}
 if(Object.keys(a).some(k=>!['Mode','ExpectedHead','ExpectedBranch','ConfigPath','ConfigSha','InventoryPath','InventorySha','OutputPath','SimulationPath','SimulationSha','PowerShellVersion','Authorization'].includes(k)))fail('ARGUMENTS');return a;}
const load=(path,digest)=>{assertNoLinks(path);const b=readFileSync(path);try{if(sha(b)!==digest)fail('FILE_HASH');return JSON.parse(b);}finally{b.fill(0);}};
const emit=(a,value)=>{const text=JSON.stringify(value,null,2)+'\n';if(a.OutputPath){outside(root,a.OutputPath);assertNoLinks(a.OutputPath);writeFileSync(a.OutputPath,text,{flag:'wx'});}process.stdout.write(text);};
export function comparisonPreflight(a){
 if(!/^5\.1\./.test(a.PowerShellVersion??'')||!['Preflight','Simulate','Acquire'].includes(a.Mode))fail('POWERSHELL_51_MODE');
 if(a.OutputPath){outside(root,a.OutputPath);assertNoLinks(a.OutputPath);if(existsSync(a.OutputPath))fail('RESULT_ALREADY_EXISTS');}
 const config=load(a.ConfigPath,a.ConfigSha),inventory=load(a.InventoryPath,a.InventorySha),synthetic=a.Mode==='Simulate';
 if(synthetic!==(config.origin==='SYNTHETIC_LOCAL_TRANSPORT'))fail('MODE_ORIGIN');
 if(!synthetic&&(a.SimulationPath||a.SimulationSha))fail('SIMULATION_PROHIBITED');
 const checkpoint=verifyComparisonInventory(root,inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic}),result=validateComparisonPlan(config),directory=resolve(config.retention.directory);
 const allowed=synthetic?resolve(tmpdir()):resolve(process.env.LOCALAPPDATA??'', 'StayOpti','private-evidence',COMPARISON_REGISTRY);
 if(synthetic?!directory.startsWith(allowed+'\\')&&!directory.startsWith(allowed+'/'):directory!==allowed)fail('DESTINATION');
 outside(root,directory);assertNoLinks(directory);
 if(existsSync(join(directory,'cases',config.caseId))||existsSync(join(directory,'authorization-registry','case-'+sha(config.caseId)+'.json')))fail('CASE_CONSUMED');
 const protector=createWindowsCurrentUserDpapiProtectorV3(),probe=Buffer.from('invented MAX11 DPAPI probe').toString('base64');
 if(protector.unprotectDataKey(protector.protectDataKey(probe))!==probe)fail('DPAPI_PROBE');
 return {config,inventory,checkpoint,protector,result:{...result,configSha256:a.ConfigSha,inventorySha256:a.InventorySha,expectedAuthorization:result.pending.length?null:comparisonAuthorization(config,inventory),rawCustodyCreated:false,engineInvocations:0,policyInvocations:0,credentialLoaded:false,dpapiProbe:'PASS_SYNTHETIC_BYTES'}};
}
async function main(){const a=args(process.argv.slice(2));
 if(a.Mode==='Inventory'){if(!/^5\.1\./.test(a.PowerShellVersion??'')||!a.OutputPath)fail('INVENTORY_EXPLICIT_OUTPUT');emit(a,createComparisonInventory(root,a.ExpectedHead,a.ExpectedBranch));return;}
 const p=comparisonPreflight(a);if(a.Mode==='Preflight'){emit(a,p.result);return;}
 if(p.result.pending.length)fail('CONFIGURATION_PENDING');
 const synthetic=a.Mode==='Simulate';if(!synthetic&&a.Authorization!==p.result.expectedAuthorization)fail('AUTHORIZATION');
 const simulation=synthetic?load(a.SimulationPath,a.SimulationSha):null;let credential=null,source='SYNTHETIC_NO_CREDENTIAL';
 const abort=new AbortController(),stop=()=>abort.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{if(!synthetic)({credential,source}=await readProtectedCredentialFrame());
  const verify=()=>{if(!same(load(a.ConfigPath,a.ConfigSha),p.config)||!same(load(a.InventoryPath,a.InventorySha),p.inventory)||!same(load(a.SimulationPath,a.SimulationSha),simulation))fail('INPUT_CHANGED');verifyComparisonInventory(root,p.inventory,a.ExpectedHead,a.ExpectedBranch,{synthetic:true});};
  const result=await acquireComparison({config:p.config,checkpoint:p.checkpoint,simulation,signal:abort.signal,...(synthetic?{syntheticProtector:p.protector,verifyBeforeSend:verify}:{}),
   approval:synthetic?null:{credential,authorization:a.Authorization,inventory:p.inventory,repositoryRoot:root,configPath:resolve(a.ConfigPath),configSha256:a.ConfigSha,inventoryPath:resolve(a.InventoryPath),inventorySha256:a.InventorySha}});
  credential=null;emit(a,{...result,...credentialHandlingReport(source,result.failureClass)});
 }finally{credential=null;process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{process.stderr.write((/^COMPARISON_[A-Z0-9_]+$/.test(e?.message)?e.message:'COMPARISON_CONTROLLED_FAILURE')+'\n');process.exitCode=1;});
