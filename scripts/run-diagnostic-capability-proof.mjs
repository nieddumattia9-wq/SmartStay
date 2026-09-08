// Same local tsc/CommonJS execution model as run-engine-v3-tests.mjs.
// No real input option, providers, credentials, custody or network transport.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--synthetic-proof')throw Error('USAGE: node scripts/run-diagnostic-capability-proof.mjs --synthetic-proof NEW_OUTPUT_DIRECTORY');
const out=path.resolve(args[1]),relative=path.relative(root,out);
if(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))throw Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
if(fs.existsSync(out))throw Error('OUTPUT_ALREADY_EXISTS_NO_OVERWRITE');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stayopti-diagnostic-capability-'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function run(command,argv){const r=spawnSync(command,argv,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.error||r.signal||r.status!==0)throw Error(`LOCAL_PROOF_COMMAND_FAILED: ${r.error?.code||r.status}\n${r.stdout||''}\n${r.stderr||''}`);return r.stdout.trim();}
try {
 run(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-p',path.join(root,'tsconfig.tests.json'),'--outDir',temp]);
 fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({type:'commonjs'}));
 const p=createRequire(import.meta.url)(path.join(temp,'src/engine-v3/evaluation/diagnosticCapabilityProbeV3.js'));
 const tests=run(process.execPath,['--test',path.join(temp,'tests/engine-v3/v3DiagnosticCapabilityProbe.test.js'),path.join(temp,'tests/engine-v3/v3DiagnosticRoleFeedbackBridge.test.js')]);
 const matrix=p.DIAGNOSTIC_CAPABILITY_VARIANTS.map(v=>p.runSyntheticCapabilityProbe(v));
 const distance=[1,3].map(k=>p.runSyntheticCapabilityProbe('COMPLETE',k));
 const roles=[false,true].map(x=>p.runSyntheticRoleCapabilityProbe(x));
 if([...matrix,...distance].some(r=>!r.validation.valid)||roles.some(r=>!r.validation.valid))throw Error('CANONICAL_VALIDATION_FAILED');
 fs.mkdirSync(out,{recursive:true});
 write('synthetic-inputs.json',matrix.map(r=>({variant:r.variant,input:r.input,sourceUnknowns:r.sourceUnknowns,sourceRatingObservations:r.sourceRatingObservations,ratingHandling:r.ratingHandling})));
 write('capability-results.json',{scope:'SYNTHETIC_ONLY',matrix:matrix.map(p.summarizeSyntheticCapability),distance:distance.map(p.summarizeSyntheticCapability),roles,realDataExecuted:false});
 fs.writeFileSync(path.join(out,'targeted-tests.tap'),tests+'\n',{flag:'wx'});
 // Identify the actual module dependency bytes loaded by the proof, not merely HEAD.
 const require=createRequire(import.meta.url);
 const dependencies=Object.keys(require.cache).filter(f=>f.startsWith(temp+path.sep)&&f.endsWith('.js')).map(f=>path.relative(temp,f).replace(/\.js$/,'.ts')).filter(f=>fs.existsSync(path.join(root,f)));
 const files=[...new Set([...dependencies,'scripts/run-diagnostic-capability-proof.mjs','scripts/diagnostic-role-feedback-bridge-v1.mjs','scripts/diagnostic-transcription-review-v1.mjs','tests/engine-v3/v3DiagnosticCapabilityProbe.test.ts','tests/engine-v3/v3DiagnosticRoleFeedbackBridge.test.ts','tsconfig.tests.json','package.json','package-lock.json'])].sort();
 write('code-manifest.json',{head:run('git',['rev-parse','HEAD']),files:files.map(f=>({path:f.replaceAll('\\','/'),sha256:hash(path.join(root,f))})),compilerSha256:hash(path.join(root,'node_modules/typescript/lib/_tsc.js')),node:process.version});
 const names=fs.readdirSync(out).sort();
 fs.writeFileSync(path.join(out,'checksums.sha256'),names.map(n=>`${hash(path.join(out,n))}  ${n}`).join('\n')+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'PASS_SYNTHETIC_PROOF',outputDirectory:out,variants:matrix.length,distanceControls:distance.length,roleControls:roles.length,realComparisonExecuted:false,httpRequests:0}));
}finally{
 // Only the unique compiler directory created by this process is removed.
 fs.rmSync(temp,{recursive:true,force:true});
}
