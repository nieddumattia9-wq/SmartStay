// No input-data option: this runner can only instantiate the declared synthetic fixtures.
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
for(const dir of ['src/engine-v2','src/engine-v3','src/types','scripts','tests/engine-v3/fixtures'])walk(dir);
for(const p of ['tests/engine-v3/v3MaximumComfortExperienceBand.test.ts','tests/engine-v3/v3StayPrivacyNegation.test.ts','tests/engine-v3/v3StaySuitabilityContext.test.ts','package.json','package-lock.json','tsconfig.tests.json','tests/engine-v3/v3IntentPolicyRobustnessDiagnostic.test.ts','tests/engine-v3/v3IntentRolePolicyBridge.test.ts'])codePaths.push(p);
const code=codePaths.sort().map(p=>({path:p,sha256:hash(path.join(root,p))}));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stayopti-d0048-compile-')),results=[];
function run(label,args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024});results.push({label,status:r.status,error:r.error?.code??null,signal:r.signal,stdout:r.stdout,stderr:r.stderr});if(r.status!==0||r.error||r.signal)throw Error(label+'_FAILED');}
fs.mkdirSync(out,{recursive:true});let status='FAIL';
try{
  write('code-manifest.json',code);
  run('canonical-tsc',[path.join(root,'node_modules/typescript/bin/tsc'),'-p','tsconfig.tests.json','--outDir',temp]);
  fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
  const require=createRequire(import.meta.url);
  const {frozenIntentRobustnessExperiments,INTENT_ROBUSTNESS_SPECIFICATION}=require(path.join(temp,'tests/engine-v3/fixtures/intentRobustnessSyntheticV3.js'));
  const experiments=frozenIntentRobustnessExperiments();
  const {frozenStaySuitabilityCases,STAY_SUITABILITY_SPECIFICATION}=require(path.join(temp,'tests/engine-v3/fixtures/staySuitabilitySyntheticV3.js'));
  const cases=frozenStaySuitabilityCases();
  const {privacyNegationInput,PRIVACY_NEGATION_CASES}=require(path.join(temp,'tests/engine-v3/fixtures/stayPrivacyNegationSyntheticV3.js'));
  const negationCases=PRIVACY_NEGATION_CASES.map(c=>({...c,input:privacyNegationInput(c.text)}));
  const {maximumComfortDomainInput,MAXIMUM_COMFORT_BAND_CASES}=require(path.join(temp,'tests/engine-v3/fixtures/maximumComfortBandSyntheticV3.js'));
  const bandCases=MAXIMUM_COMFORT_BAND_CASES.map(c=>({...c,input:maximumComfortDomainInput(c.rows)}));
  write('maximum-comfort-band-inputs.json',{syntheticOnly:true,cases:bandCases});
  write('privacy-negation-inputs.json',{syntheticOnly:true,cases:negationCases});
  write('frozen-cases.json',{specification:STAY_SUITABILITY_SPECIFICATION,cases});
  write('frozen-protocol-and-inputs.json',{specification:INTENT_ROBUSTNESS_SPECIFICATION,experiments});
  const frozenSHA256=hash(path.join(out,'frozen-protocol-and-inputs.json'));
  // Freeze complete inputs and individual SHA256 BEFORE importing/executing evaluator.
  write('input-seal.json',{frozenSHA256,bandInputSHA256:hash(path.join(out,'maximum-comfort-band-inputs.json')),privacyNegationInputSHA256:hash(path.join(out,'privacy-negation-inputs.json')),codeManifestSHA256:hash(path.join(out,'code-manifest.json')),phase:'SEALED_BEFORE_EVALUATION',
    inputs:experiments.flatMap(e=>e.scenarios.map(s=>({family:e.family,scenario:s.id,sha256:createHash('sha256').update(JSON.stringify(s)).digest('hex')})))});
  const {runIntentPolicyRobustnessDiagnosticV3}=require(path.join(temp,'src/engine-v3/evaluation/intentPolicyRobustnessDiagnosticV3.js'));
  const {runIntentRolePolicyBridgeV3}=require(path.join(temp,'src/engine-v3/evaluation/intentRolePolicyBridgeV3.js'));
  write('stay-suitability-results.json',cases.map(c=>({id:c.id,expectation:c.expectation,result:runIntentRolePolicyBridgeV3(c.input)})));
  const reports=experiments.map(runIntentPolicyRobustnessDiagnosticV3);write('synthetic-results.json',{frozenSHA256,reports});
  write('privacy-negation-results.json',negationCases.map(c=>({id:c.id,result:runIntentRolePolicyBridgeV3(c.input)})));
  const {runPersonalUtilityRolePolicyV3}=require(path.join(temp,'src/engine-v3/policy/personalUtilityRolePolicyV3.js'));
  write('maximum-comfort-band-results.json',bandCases.map(c=>({id:c.id,result:runPersonalUtilityRolePolicyV3(c.input)})));
  run('D0048-targeted',['--test',path.join(temp,'tests/engine-v3/v3MaximumComfortExperienceBand.test.js')]);
  run('D0047-R1-targeted',['--test',path.join(temp,'tests/engine-v3/v3StayPrivacyNegation.test.js')]);
  run('D0047-targeted',['--test',path.join(temp,'tests/engine-v3/v3StaySuitabilityContext.test.js')]);
  run('targeted-tests',['--test',path.join(temp,'tests/engine-v3/v3IntentPolicyRobustnessDiagnostic.test.js')]);
  run('D0044-regression',['--test',path.join(temp,'tests/engine-v3/v3IntentRolePolicyBridge.test.js')]);
  if(hash(path.join(out,'frozen-protocol-and-inputs.json'))!==frozenSHA256||!code.every(f=>hash(path.join(root,f.path))===f.sha256))throw Error('FROZEN_INPUT_OR_CODE_CHANGED');
  status='PASS';
}finally{
  write('proof.json',{status,scope:'SYNTHETIC_ONLY',results,realDataExecuted:false,providerRequests:0,legacyRegretUsed:false});
  // This invocation's generated compiler directory only; never a custody path.
  fs.rmSync(temp,{recursive:true,force:true});console.log(JSON.stringify({status,outputDirectory:out}));
}
