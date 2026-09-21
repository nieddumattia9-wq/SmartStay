import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve,sep,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const PS='C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const WIN=process.platform==='win32'?false:'requires actual Windows PowerShell 5.1 / CurrentUser DPAPI; mandatory Windows release job';
const root=process.cwd(),secret='INVENTED_KEY_D0074_NOT_VALID_A_4817',replacement='INVENTED_KEY_D0074_NOT_VALID_B_6123';
const quote=(s:string)=>s.replaceAll("'","''");
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const load=new Function('p','return import(p)') as (p:string)=>Promise<any>;
function fixture(){
 const temp=mkdtempSync(join(tmpdir(),'StayOpti-D0074-Credential-'));let serial=0;
 const store=join(temp,'synthetic-store');
 function ps(body:string,ok=true,extraEnv:Record<string,string>={}){
  const file=join(temp,'test-'+(++serial)+'.ps1');
  writeFileSync(file,`$ErrorActionPreference='Stop'
. '${quote(join(root,'scripts/invoke-liteapi-profile-runner.ps1'))}'
function Get-StayOptiCredentialBase { return '${quote(store)}' }
Assert-StayOptiCredentialPlatform
${body}
`);
  const r=spawnSync(PS,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',file],{encoding:'utf8',windowsHide:true,timeout:30000,env:{...process.env,...extraEnv}});
  assert.equal(r.error,undefined);assert.notEqual(r.status,null);assert.equal(typeof r.stdout,'string');assert.equal(typeof r.stderr,'string');
  assert.doesNotMatch(r.stdout+r.stderr,new RegExp(secret+'|'+replacement));
  if(ok)assert.equal(r.status,0,r.stdout+r.stderr);else assert.notEqual(r.status,0);
  return r;
 }
 const prompt=(key=secret)=>`function Read-Host { param([string]$Prompt,[switch]$AsSecureString) if(-not $AsSecureString){throw 'PROTECTED_PROMPT_REQUIRED'};ConvertTo-SecureString '${key}' -AsPlainText -Force }`;
 const configure=(profile='Production')=>ps(prompt()+`\nInvoke-StayOptiCredentialManagement -Mode Configure -Profile ${profile}`);
 const check=(key=secret,profile='Production')=>ps(`function Read-Host {throw 'SECOND_PROMPT_FORBIDDEN'}
$secure=Get-StayOptiLiteApiCredential -Profile ${profile}
$b=[IntPtr]::Zero
try{$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);if([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) -cne '${key}'){throw 'WRONG_BYTES'}}finally{if($b -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)};$secure.Dispose()}
Write-Output 'STORED_BYTES_RECOVERED_NO_PROMPT'`);
 const clean=()=>{assert(resolve(temp).startsWith(resolve(tmpdir())+sep));assert.match(basename(temp),/^StayOpti-D0074-Credential-/);rmSync(temp,{recursive:true,force:true});};
 return {temp,store,ps,prompt,configure,check,clean,file:join(store,'Production/private-api-key.dpapi')};
}

test('K01 actual PS5.1 DPAPI store and recovery across distinct processes without a second prompt',{skip:WIN},()=>{
 const f=fixture();try{f.configure();const before=hash(f.file),mtime=statSync(f.file).mtimeMs;
 assert(!readFileSync(f.file).includes(Buffer.from(secret)));assert(!readFileSync(f.file).includes(Buffer.from(secret,'utf16le')));
 assert.match(f.check().stdout,/RECOVERED_NO_PROMPT/);f.check();assert.equal(hash(f.file),before);assert.equal(statSync(f.file).mtimeMs,mtime);
 assert.deepEqual(readdirSync(join(f.store,'Production')),['private-api-key.dpapi']);
 }finally{f.clean();}
});
test('K02 configure refuses existing key before prompt; replace/remove never touch consumed markers',{skip:WIN},()=>{
 const f=fixture();try{f.configure();const initial=hash(f.file);const marker=join(f.temp,'consumed-case.json');writeFileSync(marker,'SYNTHETIC_CONSUMED');const saved=hash(marker);
 const r=f.ps(`function Read-Host {throw 'UNEXPECTED_PROMPT'};Invoke-StayOptiCredentialManagement -Mode Configure`,false);assert.match(r.stderr,/CREDENTIAL_ALREADY_EXISTS/);assert.equal(hash(f.file),initial);
 f.ps(f.prompt(replacement)+'\nInvoke-StayOptiCredentialManagement -Mode Replace');f.check(replacement);assert.notEqual(hash(f.file),initial);
 f.ps(`function Read-Host {throw 'UNEXPECTED_PROMPT'};Invoke-StayOptiCredentialManagement -Mode Remove`);assert(!existsSync(f.file));
 const missing=f.ps('Get-StayOptiLiteApiCredential',false);assert.match(missing.stderr,/CREDENTIAL_NOT_CONFIGURED/);assert.equal(hash(marker),saved);
 }finally{f.clean();}
});
test('K03 corrupt and profile-swapped ciphertext fail closed; explicit replace recovers without a provider check',{skip:WIN},()=>{
 const f=fixture();try{f.configure();f.configure('Sandbox');
 f.ps(`$p=Get-StayOptiCredentialLocation -Profile Production;$s=Get-StayOptiCredentialLocation -Profile Sandbox;[IO.File]::WriteAllBytes($p.File,[IO.File]::ReadAllBytes($s.File))`);
 assert.match(f.ps('Get-StayOptiLiteApiCredential',false).stderr,/CREDENTIAL_CORRUPT_OR_UNREADABLE/);f.check(secret,'Sandbox');
 f.ps(f.prompt()+'\nInvoke-StayOptiCredentialManagement -Mode Replace');f.check();
 f.ps(`$p=Get-StayOptiCredentialLocation;[IO.File]::WriteAllBytes($p.File,[byte[]]@(1,2,3))`);
 const before=hash(f.file);assert.match(f.ps('Get-StayOptiLiteApiCredential',false).stderr,/CREDENTIAL_CORRUPT_OR_UNREADABLE/);assert.equal(hash(f.file),before);
 }finally{f.clean();}
});
test('K04 absent Production never falls back to Sandbox',{skip:WIN},()=>{
 const f=fixture();try{f.configure('Sandbox');assert.match(f.ps('Get-StayOptiLiteApiCredential -Profile Production',false).stderr,/CREDENTIAL_NOT_CONFIGURED/);assert(!existsSync(join(f.store,'Production')));f.check(secret,'Sandbox');}finally{f.clean();}
});
test('K05 permissions, links and concurrent operation are rejected without repair or overwrite',{skip:WIN},()=>{
 const f=fixture();try{f.configure();
 f.ps(`$loc=Get-StayOptiCredentialLocation;$lock=Open-StayOptiCredentialLock $loc;try{$blocked=$false;try{$other=Get-StayOptiLiteApiCredential}catch{$blocked=$_.Exception.Message -match 'CREDENTIAL_BUSY'};if(-not $blocked){throw 'LOCK_NOT_ENFORCED'}}finally{$lock.Dispose()}`);
 const before=hash(f.file);
 f.ps(`$loc=Get-StayOptiCredentialLocation;$acl=[IO.File]::GetAccessControl($loc.File,[Security.AccessControl.AccessControlSections]::Access);$everyone=New-Object Security.Principal.SecurityIdentifier('S-1-1-0');$rule=New-Object Security.AccessControl.FileSystemAccessRule($everyone,'Read','Allow');$acl.AddAccessRule($rule);[IO.File]::SetAccessControl($loc.File,$acl)`);
 assert.match(f.ps('Get-StayOptiLiteApiCredential',false).stderr,/CREDENTIAL_PERMISSIONS_UNSAFE/);assert.equal(hash(f.file),before);
 f.ps(`$target=Join-Path '${quote(f.temp)}' 'other';[void][IO.Directory]::CreateDirectory($target);New-Item -ItemType Junction -Path (Join-Path '${quote(f.store)}' 'Sandbox') -Target $target | Out-Null`);
 assert.match(f.ps('Get-StayOptiLiteApiCredential -Profile Sandbox',false).stderr,/CREDENTIAL_LINK_NOT_ALLOWED/);
 }finally{f.clean();}
});
test('K06 invalid replacement preserves old bytes and ordinary cleanup',{skip:WIN},()=>{
 const f=fixture();try{f.configure();const before=hash(f.file);
 const r=f.ps(`function Read-Host {param([string]$Prompt,[switch]$AsSecureString);return (New-Object Security.SecureString)};Invoke-StayOptiCredentialManagement -Mode Replace`,false);
 assert.match(r.stderr,/CREDENTIAL_EMPTY_OR_INVALID/);assert.equal(hash(f.file),before);f.check();assert.deepEqual(readdirSync(join(f.store,'Production')),['private-api-key.dpapi']);
 }finally{f.clean();}
});
for(const ready of ['READY_FOR_EXPLICIT_ACQUISITION_AUTHORIZATION','READY_FOR_EXPLICIT_COVERAGE_ACQUISITION_AUTHORIZATION','READY_FOR_EXPLICIT_DETAIL_ACQUISITION_AUTHORIZATION'])test('K07 shared production boundary '+ready+' retrieves only after literal; protected stdin; failed key does not retry',{skip:WIN},()=>{
 const f=fixture();try{f.configure();const child=join(f.temp,'synthetic-child.mjs'),marker=join(f.temp,'consumed.json');
 const channel=pathToFileURL(join(root,'scripts/liteapi-credential-channel.mjs')).href;
 writeFileSync(child,`import fs from 'node:fs';import assert from 'node:assert/strict';import {readProtectedCredentialFrame,credentialHandlingReport} from ${JSON.stringify(channel)};
 const mode=process.argv.find(a=>a.startsWith('--Mode='));const marker=${JSON.stringify(marker)};
 if(mode==='--Mode=Preflight'){
  if(fs.existsSync(marker)||process.env.D0074_CASE==='PREFLIGHT_FAIL'){process.exitCode=1;}else process.stdout.write(JSON.stringify({status:${JSON.stringify(ready)},expectedAuthorization:'INVENTED_LITERAL'}));
 }else{
  const frame=await readProtectedCredentialFrame();assert.equal(frame.credential,${JSON.stringify(secret)});assert(!JSON.stringify(process.argv).includes(frame.credential));assert(!JSON.stringify(process.env).includes(frame.credential));frame.credential=null;
  fs.writeFileSync(marker,JSON.stringify({attempts:1,status:'ABORTED',failureClass:'HTTP_401'}),{flag:'wx'});
  process.stdout.write(JSON.stringify({status:'ABORTED',failureClass:'HTTP_401',...credentialHandlingReport(frame.source,'HTTP_401')}));
 }
 `);
 const run=(scenario:string)=>f.ps(`function Read-Host {param([string]$Prompt,[switch]$AsSecureString);if($AsSecureString){throw 'SECOND_SECRET_PROMPT_FORBIDDEN'};if($env:D0074_CASE -eq 'DENY'){return 'NO'};return 'INVENTED_LITERAL'}
Invoke-StayOptiProtectedProfile -Mode Acquire -NodePath '${quote(process.execPath)}' -NodeArguments @('${quote(child)}','--Mode=Acquire') -ReadyStatus '${ready}' -ErrorPrefix LITEAPI_TEST -SafetyNotice 'SYNTHETIC_ONLY_NO_PROVIDER'`,scenario==='ACCEPT',{D0074_CASE:scenario});
 // Missing/corrupt store cannot mask the earlier authorization/preflight errors.
 const originalCipher=readFileSync(f.file);writeFileSync(f.file,Buffer.from('SYNTHETIC_CORRUPTION'));
 const before=hash(f.file);assert.match(run('DENY').stderr,/AUTHORIZATION_NOT_ACCEPTED/);assert.match(run('PREFLIGHT_FAIL').stderr,/PREFLIGHT_FAILED/);assert(!existsSync(marker));assert.equal(hash(f.file),before);writeFileSync(f.file,originalCipher);
 const accepted=run('ACCEPT');assert.match(accepted.stdout,/DPAPI_CURRENT_USER_SEPARATE_PROFILE_STORE/);assert.match(accepted.stdout,/HTTP_401/);assert.match(accepted.stdout,/Nessun retry automatico/);assert.equal(JSON.parse(readFileSync(marker,'utf8')).attempts,1);
 const consumed=hash(marker);f.ps(f.prompt(replacement)+'\nInvoke-StayOptiCredentialManagement -Mode Replace');assert.match(run('CONSUMED').stderr,/PREFLIGHT_FAILED/);assert.equal(hash(marker),consumed);
 }finally{f.clean();}
});
test('K08 stdin frame validation and reporting do not confuse encrypted persistence with acquisition artifacts',async()=>{
 const m=await load(pathToFileURL(join(root,'scripts/liteapi-credential-channel.mjs')).href);
 const valid={version:'stayopti.liteapi-credential-channel@1',profile:'Production',persistence:'DPAPI_CURRENT_USER_PROFILE_STORE',credential:secret};
 const input=(o:any)=>(async function*(){yield Buffer.from(JSON.stringify(o));})();
 assert.equal((await m.readProtectedCredentialFrame(input(valid))).credential,secret);
 for(const change of [{profile:'Sandbox'},{persistence:'PLAINTEXT'},{credential:''},{credential:'a\nb'},{extra:true},{version:'legacy'}])await assert.rejects(()=>m.readProtectedCredentialFrame(input({...valid,...change})),/CREDENTIAL_FRAME_INVALID/);
 const report=m.credentialHandlingReport('DPAPI_CURRENT_USER_PROFILE_STORE');assert.equal(report.credentialPersisted,true);assert.equal(report.credentialInAcquisitionArtifacts,false);assert(!JSON.stringify(report).includes(secret));
 assert.equal(m.credentialHandlingReport('SYNTHETIC_NO_CREDENTIAL').credentialPersisted,false);
});
test('K09 every operational code inventory seals the shared secret code, and CLI has no plaintext or path override parameter',async()=>{
 for(const [p,fn] of [['liteapi-controlled-plan-v1.mjs','acquisitionCodePaths'],['liteapi-search-coverage-plan-v1.mjs','coverageCodePaths'],['liteapi-hotel-detail-plan-v1.mjs','hotelDetailCodePaths']]){
  const m=await load(pathToFileURL(join(root,'scripts',p)).href),paths=m[fn](root);
  for(const dep of ['invoke-liteapi-profile-runner.ps1','liteapi-credential-store.ps1','liteapi-credential-channel.mjs'])assert(paths.includes('scripts/'+dep),p+': '+dep);
 }
 const cli=readFileSync(join(root,'scripts/manage-liteapi-credential.ps1'),'utf8');assert.match(cli,/Invoke-StayOptiCredentialManagement -Mode \$Mode -Profile \$Profile/);assert.doesNotMatch(cli,/\[string\]\$(?:Key|Secret|Root|Path)/);
});
