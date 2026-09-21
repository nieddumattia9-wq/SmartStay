import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import https from 'node:https';
import {tmpdir} from 'node:os';
import {basename,join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';

// Ordinary bounded code-boundary regression, not a live-provider proof or a
// formal security scan. Every response below is wholly invented fixture data.
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
const at=(p:string)=>load(pathToFileURL(join(process.cwd(),p)).href);
async function fixture(count=3){
 const [f,p,c]=await Promise.all([at('tests/engine-v3/fixtures/liteApiDocumentarySyntheticV1.mjs'),at('scripts/liteapi-controlled-plan-v1.mjs'),at('scripts/liteapi-controlled-capture-v1.mjs')]);
 return {...f.documentaryCaptureFixture({count}),p,c};
}
function reseal(x:any){
 const c=x.capture;c.config=structuredClone(x.config);c.checkpoint=structuredClone(x.checkpoint);
 c.bindingSha256=x.p.hash({config:x.config,checkpoint:x.checkpoint});let previous=c.bindingSha256,time=Date.parse(c.sealedAt);
 c.requests.forEach((r:any,i:number)=>{delete r.recordSha256;r.ordinal=i+1;r.previousSha256=previous;
  r.startedAt=new Date(time+=1000).toISOString();r.completedAt=new Date(time+=1000).toISOString();r.recordSha256=x.p.hash(r);previous=r.recordSha256;});
 delete c.captureSha256;c.captureSha256=x.p.hash(c);
}
const verify=(x:any)=>x.c.verifyControlledCapture(x.capture,{config:x.config,checkpoint:x.checkpoint});

test('CB01 complete 17-record synthetic capture verifies without executing kernel or policy',async()=>{
 const x=await fixture(5),before=JSON.stringify(x.capture),r=verify(x);
 assert.equal(x.capture.requests.length,17);assert.equal(r.valid,true);assert.equal(r.syntheticProofOnly,true);
 assert.equal(r.engineInvocations,0);assert.equal(r.policyInvocations,0);assert.equal(JSON.stringify(x.capture),before);
});
test('CB02 eighteenth attempt is rejected even with freshly recomputed valid capture hashes',async()=>{
 const x=await fixture(5);x.capture.requests.push(structuredClone(x.capture.requests.at(-1)));reseal(x);
 assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_CAPTURE_SCHEMA/);
});
for(const kind of ['SEARCH','HOTEL_DETAIL','FACILITIES','PREBOOK','PREBOOK_GET'])test('CB03 duplicate '+kind+' cannot obtain a fresh budget via a resealed record',async()=>{
 const x=await fixture(),r=x.capture.requests.find((r:any)=>r.intent.kind===kind);
 x.capture.requests.push(structuredClone(r));reseal(x);
 assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_CAPTURE_DUPLICATE_OR_CAP/);
});
for(const [field,value] of [['total',18],['SEARCH',2],['HOTEL_DETAIL',6],['FACILITIES',2],['PREBOOK',6],['PREBOOK_GET',6]] as const)test('CB04 nontransferable plan cap '+field+' cannot be enlarged',async()=>{
 const x=await fixture();x.config.limits[field]=value;reseal(x);
 assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_LIMITS_CHANGED/);
});
for(const defect of ['host','path','query','body'])test('CB05 '+defect+' mutation is rejected despite a coherent capture hash',async()=>{
 const x=await fixture(),r=x.capture.requests.find((r:any)=>r.intent.kind==='PREBOOK');
 if(defect==='host')r.intent.host='unexpected.invalid';
 if(defect==='path')r.intent.path='/v3.0/rates/book';
 if(defect==='query')r.intent.query={retry:'1'};
 if(defect==='body')r.intent.body.usePaymentSdk=true;
 reseal(x);assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_ENDPOINT_OR_REQUEST_NOT_ALLOWED/);
});
test('CB06 a recomputed origin label cannot certify production acquisition',async()=>{
 const x=await fixture();x.config.origin=x.capture.origin='LITEAPI_PRODUCTION';reseal(x);
 assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_AUTHENTICATED_PRODUCTION_CAPTURE_REQUIRED/);
});
test('CB07 checkpoint mismatch cannot be hidden in a separately supplied expected checkpoint',async()=>{
 const x=await fixture();assert.throws(()=>x.c.verifyControlledCapture(x.capture,{config:x.config,checkpoint:{...x.checkpoint,head:'c'.repeat(40)}}),/CAPTURE_BINDING_OR_HASH/);
});
test('CB08 selected offer and returned prebook identity remain binding',async()=>{
 const x=await fixture(),r=x.capture.requests.find((r:any)=>r.intent.kind==='PREBOOK_GET');r.intent.prebookId='OTHER_INVENTED_SESSION';
 r.intent.path='/v3.0/prebooks/'+encodeURIComponent(r.intent.prebookId);reseal(x);
 assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_PREBOOK_ID_NOT_RETURNED/);
});
test('CB09 failed response original and partial bytes remain hashed and cannot be silently changed',async()=>{
 const x=await fixture(),r=x.capture.requests.find((r:any)=>r.intent.kind==='HOTEL_DETAIL');
 r.outcome='FAILED';r.failureClass='TIMEOUT';r.partialResponse={...r.response,complete:false};r.response=null;reseal(x);
 assert.equal(verify(x).valid,true);r.partialResponse.body.base64=Buffer.from('OTHER_SYNTHETIC_BYTES').toString('base64');reseal(x);
 assert.throws(()=>verify(x),/LITEAPI_ACQUISITION_CAPTURE_RESPONSE_HASH/);
});
test('CB10 production rejects injected journal or verifier before filesystem or transport authority',async()=>{
 const x=await fixture();x.config.origin='LITEAPI_PRODUCTION';x.config.caseId='D0060_LITEAPI_NEW_BOLOGNA_20270110_CASE_001';
 // Public frozen proposal constants, not provider results or private case data.
 const s=x.config.scenario;s.searchRequest.cityName='Bologna';s.searchRequest.checkin='2027-01-10';s.searchRequest.checkout='2027-01-17';
 s.searchRequest.occupancies[0].children=[6,11];s.party.childAgesAtStay=[6,11];s.totalBudget=1400;
 s.stay.checkIn='2027-01-10';s.stay.checkOut='2027-01-17';x.config.account.environment='LIVE_PRODUCTION';
 assert.deepEqual(x.p.validatePlan(x.config).pending,[]);
 let transportCalls=0,callbackCalls=0;const originalRequest=https.request;
 // Fail before I/O even if a future regression removes the expected guard.
 (https as any).request=()=>{transportCalls++;throw Error('SYNTHETIC_TEST_EXTERNAL_TRANSPORT_FORBIDDEN');};
 try{
  for(const injection of [{journal:{}},{verifyBeforeSend:()=>{callbackCalls++;}},{liveApproval:null}]){
   await assert.rejects(()=>x.c.runControlledAcquisition({config:x.config,checkpoint:x.checkpoint,credential:'SYNTHETIC_NOT_A_CREDENTIAL',liveApproval:{},...injection}),/LITEAPI_ACQUISITION_PRODUCTION_DEPENDENCY_INJECTION_PROHIBITED/);
  }
 }finally{(https as any).request=originalRequest;}
 assert.equal(transportCalls,0);assert.equal(callbackCalls,0);
});

test('CB11 actual PowerShell 5.1 finally disposes synthetic secret when Process.Start fails',{
 skip:process.platform==='win32'?false:'requires real Windows PowerShell 5.1; required windows-latest release job executes this test'
},()=>{
 const temp=mkdtempSync(join(tmpdir(),'StayOpti-D0062-Cleanup-'));
 try{
  const wrapper=readFileSync(join(process.cwd(),'scripts/invoke-liteapi-controlled-acquisition.ps1'),'utf8');
  assert.match(wrapper,/Invoke-StayOptiProtectedProfile/);
  const launcher=readFileSync(join(process.cwd(),'scripts/invoke-liteapi-profile-runner.ps1'),'utf8');
  const matches=[...launcher.matchAll(/^ } finally \{/gm)];assert.equal(matches.length,1,'extract actual shared outer finally, not a hand-maintained copy');
  const end=launcher.indexOf('# End protected cleanup.',matches[0].index);assert(end>matches[0].index!);
  const actualFinally=launcher.slice(matches[0].index!+3,end).trim();
  assert.match(actualFinally,/AcquisitionStarted/);assert.match(actualFinally,/ZeroFreeBSTR/);
  const script=join(temp,'synthetic-cleanup.ps1');
  const missing=join(temp,'deliberately-nonexistent-process.exe').replaceAll("'","''");
  writeFileSync(script,`$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'WINDOWS_POWERSHELL_51_NOT_EXECUTED'}
$AcquisitionSecure=New-Object Security.SecureString
foreach($SyntheticCharacter in 'SYNTHETIC_DISPOSAL_ONLY'.ToCharArray()){$AcquisitionSecure.AppendChar($SyntheticCharacter)}
$ProbeSecure=$AcquisitionSecure
$AcquisitionBstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($AcquisitionSecure)
$AcquisitionPlain='SYNTHETIC_DISPOSAL_ONLY';$AcquisitionAuthorization='SYNTHETIC_AUTHORIZATION_ONLY'
$AcquisitionProcess=New-Object Diagnostics.Process
$AcquisitionProcess.StartInfo.FileName='${missing}'
$AcquisitionProcess.StartInfo.UseShellExecute=$false;$AcquisitionProcess.StartInfo.CreateNoWindow=$true
$AcquisitionStarted=$false;$FailureObserved=$false
try {
 try {$AcquisitionStarted=$AcquisitionProcess.Start()}
 ${actualFinally}
} catch {$FailureObserved=$true}
$Disposed=$false
try {$ProbeSecure.AppendChar([char]65)} catch {$Disposed=$_.Exception -is [ObjectDisposedException] -or $_.Exception.InnerException -is [ObjectDisposedException]}
if(-not $FailureObserved -or -not $Disposed -or $null -ne $AcquisitionPlain -or $null -ne $AcquisitionAuthorization){throw 'SYNTHETIC_CREDENTIAL_CLEANUP_FAILED'}
Write-Output 'SYNTHETIC_START_FAILED_SECURESTRING_DISPOSED=YES'
`);
  const r=spawnSync('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{encoding:'utf8',windowsHide:true,timeout:30000});
  assert.equal(r.error,undefined,'powershell.exe must actually start');assert.notEqual(r.status,null);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  assert.equal(typeof r.stdout,'string');assert.equal(typeof r.stderr,'string');assert.match(r.stdout,/SYNTHETIC_START_FAILED_SECURESTRING_DISPOSED=YES/);
 }finally{
  const target=resolve(temp);assert(target.startsWith(resolve(tmpdir())+sep));assert.match(basename(target),/^StayOpti-D0062-Cleanup-/);
  rmSync(target,{recursive:true,force:true});
 }
});
