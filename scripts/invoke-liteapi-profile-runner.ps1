# Shared protected prompt/process primitive. Callers supply fixed profile metadata;
# their versioned Node preflight still verifies every config/inventory byte.
. (Join-Path $PSScriptRoot 'liteapi-credential-store.ps1')
function Invoke-StayOptiProtectedProfile {
 param([string]$Mode,[string]$NodePath,[string[]]$NodeArguments,
       [string]$ReadyStatus,[string]$SafetyNotice,[string]$ErrorPrefix)
 Assert-StayOptiCredentialPlatform
 $AcquisitionSecure=$null;$AcquisitionBstr=[IntPtr]::Zero;$AcquisitionPlain=$null;$AcquisitionFrame=$null;$AcquisitionProcess=$null;$AcquisitionStarted=$false
 try {
  if($Mode -cne 'Acquire'){
   & $NodePath @NodeArguments
   if($LASTEXITCODE -ne 0){throw ($ErrorPrefix+'_RUNNER_FAILED')}
  } else {
   $PreflightArgs=@($NodeArguments | Where-Object {$_ -notlike '--OutputPath=*'} | ForEach-Object {if($_ -ceq '--Mode=Acquire'){'--Mode=Preflight'}else{$_}})
   $PreflightText=& $NodePath @PreflightArgs
   if($LASTEXITCODE -ne 0){throw ($ErrorPrefix+'_PREFLIGHT_FAILED')}
   $PreflightResult=($PreflightText -join "`n") | ConvertFrom-Json
   if($PreflightResult.status -cne $ReadyStatus){Write-Output $PreflightText;throw ($ErrorPrefix+'_CONFIGURATION_PENDING')}
   Write-Host $SafetyNotice
   Write-Host $PreflightResult.expectedAuthorization
   $AcquisitionAuthorization=Read-Host 'Incolla la literal soltanto se autorizzi questo singolo tentativo'
   if($AcquisitionAuthorization -cne $PreflightResult.expectedAuthorization){throw ($ErrorPrefix+'_AUTHORIZATION_NOT_ACCEPTED')}
   # These launchers support Production only. No fallback to another profile,
   # no setup prompt, store inspection or decryption before accepted authority.
   $AcquisitionSecure=Get-StayOptiLiteApiCredential -Profile Production
   if($AcquisitionSecure.Length -eq 0){throw ($ErrorPrefix+'_CREDENTIAL_EMPTY')}
   $AcquisitionArgs=@($NodeArguments)+"--Authorization=$AcquisitionAuthorization"
   $Quoted=@($AcquisitionArgs | ForEach-Object {if($_.Contains('"') -or $_.Contains("`r") -or $_.Contains("`n")){throw ($ErrorPrefix+'_ARGUMENT_QUOTING')};'"'+$_.TrimEnd('\')+'"'})
   $Info=New-Object Diagnostics.ProcessStartInfo
   $Info.FileName=$NodePath;$Info.Arguments=$Quoted -join ' ';$Info.UseShellExecute=$false;$Info.CreateNoWindow=$true;$Info.RedirectStandardInput=$true
   $AcquisitionProcess=New-Object Diagnostics.Process;$AcquisitionProcess.StartInfo=$Info
   $AcquisitionStarted=$AcquisitionProcess.Start()
   if(-not $AcquisitionStarted){throw ($ErrorPrefix+'_PROCESS_NOT_STARTED')}
   $AcquisitionBstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($AcquisitionSecure)
   $AcquisitionPlain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($AcquisitionBstr)
   $AcquisitionFrame=@{version='stayopti.liteapi-credential-channel@1';profile='Production';persistence='DPAPI_CURRENT_USER_PROFILE_STORE';credential=$AcquisitionPlain} | ConvertTo-Json -Compress
   $AcquisitionProcess.StandardInput.WriteLine($AcquisitionFrame);$AcquisitionProcess.StandardInput.Close()
   $AcquisitionPlain=$null;$AcquisitionFrame=$null
   [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($AcquisitionBstr);$AcquisitionBstr=[IntPtr]::Zero
   $AcquisitionSecure.Dispose();$AcquisitionSecure=$null
   $AcquisitionProcess.WaitForExit()
   if($AcquisitionProcess.ExitCode -ne 0){throw ($ErrorPrefix+'_RUNNER_FAILED_NO_RETRY')}
  }
 } finally {
  try {
   if($null -ne $AcquisitionProcess){
    try {if($AcquisitionStarted -and -not $AcquisitionProcess.HasExited){$AcquisitionProcess.Kill()}}
    finally {$AcquisitionProcess.Dispose()}
   }
  } finally {
   try {if($AcquisitionBstr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($AcquisitionBstr)}}
   finally {try {if($null -ne $AcquisitionSecure){$AcquisitionSecure.Dispose()}}
    finally {$AcquisitionPlain=$null;$AcquisitionFrame=$null;$AcquisitionAuthorization=$null}}
  }
  Write-Host 'CREDENTIAL_CLEARED_FROM_PROCESS=YES (best-effort memory cleanup; no credential environment variable)'
 }
 # End protected cleanup.
}
