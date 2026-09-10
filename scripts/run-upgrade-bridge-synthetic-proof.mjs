// D-0049 proof only: no real-input option, network, provider or public integration.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--synthetic-proof')throw Error('USAGE: --synthetic-proof NEW_OUTPUT_DIRECTORY');
const out=path.resolve(args[1]),relative=path.relative(root,out);
if(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))throw Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
if(fs.existsSync(out))throw Error('OUTPUT_EXISTS');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
const codePaths=[];
function walk(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else if(/\.(ts|mjs|ps1)$/.test(p))codePaths.push(p);}}
for(const dir of ['src/engine-v2','src/engine-v3','src/types','src/utils','scripts','tests/engine-v3'])walk(dir);
for(const p of ['package.json','package-lock.json','tsconfig.tests.json'])codePaths.push(p);
const code=codePaths.sort().map(p=>({path:p,sha256:hash(path.join(root,p))}));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stayopti-d0049-compile-')),results=[];
function run(label,args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024});results.push({label,status:r.status,error:r.error?.code??null,signal:r.signal,stdout:r.stdout,stderr:r.stderr});if(r.status!==0||r.error||r.signal)throw Error(label+'_FAILED');}
fs.mkdirSync(out,{recursive:true});let status='FAIL';
try{
  write('code-manifest.json',code);
  run('canonical-tsc',[path.join(root,'node_modules/typescript/bin/tsc'),'-p','tsconfig.tests.json','--outDir',temp]);
  fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
  const require=createRequire(import.meta.url);
  const {frozenUpgradeBridgeCases,UPGRADE_BRIDGE_SPECIFICATION}=require(path.join(temp,'tests/engine-v3/fixtures/upgradeBridgeSyntheticV3.js'));
  const cases=frozenUpgradeBridgeCases();write('upgrade-inputs.json',{specification:UPGRADE_BRIDGE_SPECIFICATION,cases});
  const inputHash=hash(path.join(out,'upgrade-inputs.json'));
  write('input-seal.json',{phase:'SEALED_BEFORE_EVALUATION',inputHash,codeManifestSHA256:hash(path.join(out,'code-manifest.json')),
    inputs:cases.map(c=>({id:c.id,sha256:createHash('sha256').update(JSON.stringify(c.input)).digest('hex')}))});
  const {runIntentRolePolicyBridgeV3}=require(path.join(temp,'src/engine-v3/evaluation/intentRolePolicyBridgeV3.js'));
  write('upgrade-results.json',cases.map(c=>({id:c.id,expectation:c.expectation,result:runIntentRolePolicyBridgeV3(c.input)})));
  run('D0049-targeted',['--test',path.join(temp,'tests/engine-v3/v3UpgradeBridgeCoverage.test.js')]);
  run('V3-15-isolated-role-regression',['--test',path.join(temp,'tests/engine-v3/v3PersonalUtilityRolePolicy.test.js')]);
  // Reuse D-0048's unchanged proof/fixtures for all 187 historical inputs.
  run('D0048-historical-proof',[path.join(root,'scripts/run-maximum-comfort-band-synthetic-proof.mjs'),'--synthetic-proof',path.join(out,'historical')]);
  if(hash(path.join(out,'upgrade-inputs.json'))!==inputHash||!code.every(f=>hash(path.join(root,f.path))===f.sha256))throw Error('FROZEN_INPUT_OR_CODE_CHANGED');
  status='PASS';
}finally{
  write('proof.json',{status,scope:'SYNTHETIC_ONLY',results,realDataExecuted:false,providerRequests:0,policyChanged:false,fullRobustnessCertified:false});
  // Only this invocation's newly created compiler directory, never any custody.
  if(path.dirname(temp)!==path.resolve(os.tmpdir())||!path.basename(temp).startsWith('stayopti-d0049-compile-'))throw Error('UNSAFE_TEMP_CLEANUP');
  fs.rmSync(temp,{recursive:true,force:true});console.log(JSON.stringify({status,outputDirectory:out}));
}
