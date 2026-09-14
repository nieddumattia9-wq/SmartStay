[CmdletBinding()]
param(
 [ValidateSet('Inventory','Preflight','Simulate','Acquire')][string]$Mode='Preflight',
 [Parameter(Mandatory=$true)][string]$ExpectedHead,
 [Parameter(Mandatory=$true)][string]$ExpectedBranch,
 [string]$ConfigPath,[string]$ConfigSha256,[string]$InventoryPath,[string]$InventorySha256,
 [string]$OutputPath,[string]$SimulationPath,[string]$SimulationSha256
)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'LITEAPI_ACQUISITION_POWERSHELL_51_REQUIRED'}
$AcquisitionNode=(Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$AcquisitionScript=Join-Path $PSScriptRoot 'run-liteapi-controlled-acquisition.mjs'
$AcquisitionArgs=@($AcquisitionScript,"--Mode=$Mode","--ExpectedHead=$ExpectedHead","--ExpectedBranch=$ExpectedBranch","--PowerShellVersion=$($PSVersionTable.PSVersion)")
foreach($Pair in @(@('ConfigPath',$ConfigPath),@('ConfigSha256',$ConfigSha256),@('InventoryPath',$InventoryPath),@('InventorySha256',$InventorySha256),@('OutputPath',$OutputPath),@('SimulationPath',$SimulationPath),@('SimulationSha256',$SimulationSha256))){
 if(-not [string]::IsNullOrWhiteSpace($Pair[1])){$AcquisitionArgs+="--$($Pair[0])=$($Pair[1])"}
}
$AcquisitionSecure=$null;$AcquisitionBstr=[IntPtr]::Zero;$AcquisitionPlain=$null;$AcquisitionProcess=$null;$AcquisitionStarted=$false
try {
 if($Mode -cne 'Acquire'){
  & $AcquisitionNode @AcquisitionArgs
  if($LASTEXITCODE -ne 0){throw 'LITEAPI_ACQUISITION_RUNNER_FAILED'}
 } else {
  # First real preflight is credential-free, without output-file side effects.
  $PreflightArgs=@($AcquisitionArgs | Where-Object {$_ -notlike '--OutputPath=*'} | ForEach-Object {if($_ -ceq '--Mode=Acquire'){'--Mode=Preflight'}else{$_}})
  $PreflightText=& $AcquisitionNode @PreflightArgs
  if($LASTEXITCODE -ne 0){throw 'LITEAPI_ACQUISITION_PREFLIGHT_FAILED'}
  $PreflightResult=($PreflightText -join "`n") | ConvertFrom-Json
  if($PreflightResult.status -cne 'READY_FOR_EXPLICIT_ACQUISITION_AUTHORIZATION'){Write-Output $PreflightText;throw 'LITEAPI_ACQUISITION_CONFIGURATION_PENDING'}
  Write-Host 'Massimo 17 richieste; fino a 5 creazioni prebook. Nessuna prenotazione o esecuzione motore.'
  Write-Host $PreflightResult.expectedAuthorization
  $AcquisitionAuthorization=Read-Host 'Incolla la literal soltanto se autorizzi questo singolo tentativo'
  if($AcquisitionAuthorization -cne $PreflightResult.expectedAuthorization){throw 'LITEAPI_ACQUISITION_AUTHORIZATION_NOT_ACCEPTED'}
  $AcquisitionSecure=Read-Host 'LiteAPI API key (input non visibile)' -AsSecureString
  if($AcquisitionSecure.Length -eq 0){throw 'LITEAPI_ACQUISITION_CREDENTIAL_EMPTY'}
  $AcquisitionArgs+="--Authorization=$AcquisitionAuthorization"
  # Only public arguments. Secret goes directly through an anonymous stdin pipe.
  $Quoted=@($AcquisitionArgs | ForEach-Object {if($_.Contains('"') -or $_.Contains("`r") -or $_.Contains("`n")){throw 'LITEAPI_ACQUISITION_ARGUMENT_QUOTING'};'"'+$_.TrimEnd('\')+'"'})
  $Info=New-Object Diagnostics.ProcessStartInfo
  $Info.FileName=$AcquisitionNode;$Info.Arguments=$Quoted -join ' ';$Info.UseShellExecute=$false;$Info.CreateNoWindow=$true;$Info.RedirectStandardInput=$true
  $AcquisitionProcess=New-Object Diagnostics.Process;$AcquisitionProcess.StartInfo=$Info
  $AcquisitionStarted=$AcquisitionProcess.Start()
  if(-not $AcquisitionStarted){throw 'LITEAPI_ACQUISITION_PROCESS_NOT_STARTED'}
  $AcquisitionBstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($AcquisitionSecure)
  $AcquisitionPlain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($AcquisitionBstr)
  $AcquisitionProcess.StandardInput.WriteLine($AcquisitionPlain);$AcquisitionProcess.StandardInput.Close()
  $AcquisitionPlain=$null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($AcquisitionBstr);$AcquisitionBstr=[IntPtr]::Zero
  $AcquisitionSecure.Dispose();$AcquisitionSecure=$null
  $AcquisitionProcess.WaitForExit()
  if($AcquisitionProcess.ExitCode -ne 0){throw 'LITEAPI_ACQUISITION_RUNNER_FAILED_NO_RETRY'}
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
   finally {$AcquisitionPlain=$null;$AcquisitionAuthorization=$null}}
 }
 # No process/persistent environment variable is ever populated with the key.
 Write-Host 'CREDENTIAL_CLEARED_FROM_PROCESS=YES (best-effort memory cleanup; no credential environment variable)'
}
# Deliberately no exit: failure is visible and the calling console stays open.
