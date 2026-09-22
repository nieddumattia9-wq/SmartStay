// Offline Prepare/Execute, deliberately separate from acquisition authority.
// Same local tsc -> CommonJS execution mechanism as the official V3 runner.
import {readFileSync,writeFileSync,readdirSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {comparisonCodePaths,COMPARISON_BRANCH,git,sha,same,outside,assertNoLinks,fail} from './liteapi-comparison-plan-v1.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const walk=p=>readdirSync(join(root,p),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(p+'/'+x.name):[p+'/'+x.name]);
export function commercialRunnerInventory(expectedHead,expectedBranch){
 if(expectedBranch!==COMPARISON_BRANCH||git(root,['branch','--show-current'])!==expectedBranch||git(root,['rev-parse','HEAD'])!==expectedHead||git(root,['diff','--cached','--name-only']))fail('EXECUTION_CHECKPOINT');
 const files=[...new Set([...walk('src'),...walk('server/shared'),...walk('tests'),...comparisonCodePaths(root),
  'scripts/run-authenticated-commercial-comparison.mjs','scripts/liteapi-comparison-facts-v1.mjs','scripts/liteapi-historical-commercial-v1.mjs',
  'package.json','package-lock.json','tsconfig.tests.json','node_modules/typescript/bin/tsc','node_modules/typescript/lib/_tsc.js','node_modules/typescript/lib/tsc.js','node_modules/typescript/package.json'])].sort();
 return {version:'stayopti.commercial-runner-code@2',expectedHead,expectedBranch,nodeSha256:sha(readFileSync(process.execPath)),files:files.map(path=>({path,sha256:sha(readFileSync(join(root,path)))}))};
}
const load=(p,h)=>{assertNoLinks(p);const b=readFileSync(p);if(sha(b)!==h)fail('EXECUTION_INPUT_HASH');return JSON.parse(b);};
async function main(){
 const a={};for(const v of process.argv.slice(2)){const m=/^--([A-Za-z]+)=(.*)$/s.exec(v);if(!m||Object.hasOwn(a,m[1]))fail('ARGUMENTS');a[m[1]]=m[2];}
 if(Object.keys(a).some(k=>!['Mode','ExpectedHead','ExpectedBranch','InventoryPath','InventorySha','LocatorPath','LocatorSha','OutputPath','Authorization'].includes(k))||!['Inventory','Prepare','Execute'].includes(a.Mode))fail('ARGUMENTS');
 if(!a.OutputPath)fail('EXPLICIT_PRIVATE_OUTPUT_REQUIRED');outside(root,a.OutputPath);assertNoLinks(a.OutputPath);if(existsSync(a.OutputPath))fail('RESULT_ALREADY_EXISTS');
 const inventory=commercialRunnerInventory(a.ExpectedHead,a.ExpectedBranch);
 const emit=v=>writeFileSync(a.OutputPath,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
 if(a.Mode==='Inventory'){emit(inventory);process.stdout.write('INVENTORY_CREATED_NO_CREDENTIAL_NO_CUSTODY\n');return;}
 if(a.Mode==='Prepare'&&a.Authorization)fail('PREPARE_HAS_NO_EXECUTION_AUTHORITY');
 if(!same(load(a.InventoryPath,a.InventorySha),inventory))fail('EXECUTION_CODE_CHANGED');
 const locator=load(a.LocatorPath,a.LocatorSha);
 if(!locator||!same(Object.keys(locator).sort(),['registryRoot','root']))fail('LOCATOR_NO_CALLER_VERIFIER');
 const temporary=mkdtempSync(join(tmpdir(),'stayopti-commercial-compile-'));
 try{
  const compilation=spawnSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'-p',join(root,'tsconfig.tests.json'),'--outDir',temporary],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if(compilation.error||compilation.status!==0)fail('EXECUTION_COMPILE_FAILED');
  writeFileSync(join(temporary,'package.json'),'{"type":"commonjs"}',{flag:'wx'});
  if(!same(inventory,commercialRunnerInventory(a.ExpectedHead,a.ExpectedBranch)))fail('EXECUTION_CODE_CHANGED');
  process.chdir(root);
  const req=createRequire(join(temporary,'package.json')),prepare=req(join(temporary,'src/engine-v3/evaluation/authenticatedCommercialPreparationV3.js'));
  const p=await prepare.prepareAuthenticatedCommercialSetV3(locator);
  const executor=req(join(temporary,'src/engine-v3/evaluation/executeAuthenticatedCommercialV3.js'));
  // Prepare does not call this executor. JSON serialization is not an issued token.
  const execution=a.Mode==='Execute'?executor.executeAuthenticatedCommercialV3(p,a.Authorization):null;
  if(!same(inventory,commercialRunnerInventory(a.ExpectedHead,a.ExpectedBranch)))fail('EXECUTION_CODE_CHANGED');
  if(!same(locator,load(a.LocatorPath,a.LocatorSha)))fail('EXECUTION_INPUT_CHANGED');
  emit({version:'stayopti.private-commercial-run@2',mode:a.Mode,code:inventory,locatorSha256:a.LocatorSha,preparation:p,
   executionAuthorization:executor.commercialExecutionAuthorizationV3(p),execution,counts:execution?.counts??{v2Evaluations:0,v3Constructions:0,bindingCreations:0,shadowRuns:0,replayVerifications:0},currentBookabilityGuaranteed:false});
  process.stdout.write(a.Mode==='Prepare'?'PREPARATION_WRITTEN_ENGINE_ZERO\n':'EXECUTION_RESULT_WRITTEN_PRIVATE\n');
 }finally{
  // Only this invocation's generated compiler directory, never custody/output.
  if(dirname(resolve(temporary))!==resolve(tmpdir())||!temporary.includes('stayopti-commercial-compile-'))fail('COMPILER_CLEANUP_SCOPE');
  rmSync(temporary,{recursive:true});
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{process.stderr.write(/^COMPARISON_[A-Z0-9_]+$/.test(e?.message)?e.message+'\n':'COMPARISON_PRIVATE_RUN_FAILED\n');process.exitCode=1;});
