// Canonical repository tsc -> CommonJS -> node:test; synthetic tests only.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--synthetic-proof')throw Error('USAGE: node scripts/run-intent-role-policy-proof.mjs --synthetic-proof NEW_OUTPUT_DIRECTORY');
const out=path.resolve(args[1]),relative=path.relative(root,out);
if(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))throw Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
if(fs.existsSync(out))throw Error('OUTPUT_EXISTS');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stayopti-intent-role-proof-'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const results=[];
const scope=['scripts/run-intent-role-policy-proof.mjs','src/engine-v3/adapter/v2CompatibilityAdapterV3.ts','src/engine-v3/adapter/evaluatedOfferBindingV3.ts','src/engine-v3/evaluation/intentRolePolicyBridgeV3.ts','src/engine-v3/policy/personalUtilityRolePolicyV3.ts','tests/engine-v3/v3IntentRolePolicyBridge.test.ts','tests/engine-v3/fixtures/intentRolePolicySyntheticV3.ts'];
const frozenCode=scope.map(p=>({path:p,sha256:hash(path.join(root,p))}));
function run(label,argv){const r=spawnSync(process.execPath,argv,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});results.push({label,status:r.status,error:r.error?.code??null,signal:r.signal,stdout:r.stdout,stderr:r.stderr});return r.status===0&&!r.error&&!r.signal;}
try {
  if(!run('canonical-tsc',[path.join(root,'node_modules/typescript/bin/tsc'),'-p',path.join(root,'tsconfig.tests.json'),'--outDir',temp]))throw Error('COMPILE_FAILED');
  fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({type:'commonjs'}));
  fs.mkdirSync(out,{recursive:true});
  const require=createRequire(import.meta.url);
  const {intentFixture,FROZEN_INTENT_CASE_SPECIFICATIONS}=require(path.join(temp,'tests/engine-v3/fixtures/intentRolePolicySyntheticV3.js'));
  const {createSyntheticCapabilityInput}=require(path.join(temp,'src/engine-v3/evaluation/diagnosticCapabilityProbeV3.js'));
  const cases=['maximum-comfort','comfort','balanced','savings','maximum-savings'].flatMap(p=>['manual','automatic'].map(origin=>({name:`${origin}-${p}`,input:intentFixture(p,origin)})));
  for(const variant of ['TOTAL_UNKNOWN','ONE_TOTAL_UNKNOWN','RATING_SCALE_UNKNOWN','BOTH_UNKNOWN'])cases.push({name:variant,input:{...intentFixture(),search:createSyntheticCapabilityInput(variant)}});
  for(const semantics of ['mandatory-cap','strong-preference'])for(const km of [1,3]){const input=intentFixture();input.search.maximumDistanceKm=km;input.distance.semantics=semantics;cases.push({name:`${semantics}-${km}`,input});}
  const frozen=path.join(out,'synthetic-cases.json');
  fs.writeFileSync(frozen,JSON.stringify({specifications:FROZEN_INTENT_CASE_SPECIFICATIONS,cases},null,2)+'\n');
  const frozenSHA256=hash(frozen);
  const ok=run('targeted-synthetic-regression',['--test',path.join(temp,'tests/engine-v3/v3IntentRolePolicyBridge.test.js')]);
  if(!ok)process.exitCode=1;
  const {runIntentRolePolicyBridgeV3}=require(path.join(temp,'src/engine-v3/evaluation/intentRolePolicyBridgeV3.js'));
  const reports=cases.map(({name,input})=>{const r=runIntentRolePolicyBridgeV3(input);return {name,profile:r.profile,intent:r.intent,
    candidates:r.candidates.map(c=>({hotelId:c.hotelId,selectedOffer:c.selectedOffer,policy:c.policy,mapping:c.mapping,constraints:c.constraints})),
    decision:r.decision,contextualExplanation:r.contextualExplanation,robustness:r.robustness,
    legacyDiagnostic:{selectedByV2:r.legacyDiagnostic.selectedByV2,robustness:r.legacyDiagnostic.robustness},limitations:r.limitations};});
  if(hash(frozen)!==frozenSHA256)throw Error('FROZEN_CASES_CHANGED');
  fs.writeFileSync(path.join(out,'synthetic-results.json'),JSON.stringify({scope:'SYNTHETIC_ONLY',frozenSHA256,reports},null,2)+'\n');
}finally{
  fs.mkdirSync(out,{recursive:true});
  const frozenCodeUnchanged=frozenCode.every(f=>hash(path.join(root,f.path))===f.sha256);
  if(!frozenCodeUnchanged)process.exitCode=1;
  fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify({scope:'SYNTHETIC_ONLY',results,code:frozenCode,frozenCodeUnchanged,realDataExecuted:false,networkRequests:0},null,2)+'\n');
  // Only this invocation's unique compiler output, never a user evidence path.
  fs.rmSync(temp,{recursive:true,force:true});
  console.log(JSON.stringify({outputDirectory:out,status:results.every(r=>r.status===0)?'PASS':'FAIL',results:results.map(r=>({label:r.label,status:r.status}))}));
}
