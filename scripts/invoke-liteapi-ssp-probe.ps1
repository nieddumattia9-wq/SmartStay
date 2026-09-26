[CmdletBinding()]
param(
 [ValidateSet('Inventory','Preflight','Simulate','Acquire')][string]$Mode='Preflight',
 [Parameter(Mandatory=$true)][string]$ExpectedHead,
 [Parameter(Mandatory=$true)][string]$ExpectedBranch,
 [string]$ConfigPath,[string]$ConfigSha,[string]$InventoryPath,[string]$InventorySha,
 [string]$OutputPath,[string]$SimulationPath,[string]$SimulationSha
)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'SSP_PROBE_POWERSHELL_51_REQUIRED'}
$SspNode=(Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$SspArgs=@((Join-Path $PSScriptRoot 'run-liteapi-ssp-probe.mjs'),"--Mode=$Mode","--ExpectedHead=$ExpectedHead","--ExpectedBranch=$ExpectedBranch","--PowerShellVersion=$($PSVersionTable.PSVersion)")
foreach($Pair in @(@('ConfigPath',$ConfigPath),@('ConfigSha',$ConfigSha),@('InventoryPath',$InventoryPath),@('InventorySha',$InventorySha),@('OutputPath',$OutputPath),@('SimulationPath',$SimulationPath),@('SimulationSha',$SimulationSha))){
 if(-not [string]::IsNullOrWhiteSpace($Pair[1])){$SspArgs+="--$($Pair[0])=$($Pair[1])"}
}
. (Join-Path $PSScriptRoot 'invoke-liteapi-profile-runner.ps1')
Invoke-StayOptiProtectedProfile -Mode $Mode -NodePath $SspNode -NodeArguments $SspArgs -ReadyStatus 'READY_FOR_EXPLICIT_SSP_PROBE_AUTHORIZATION' -ErrorPrefix 'SSP_PROBE' -SafetyNotice 'Sonda SSP MAX3: una Rates, una Rates con margin candidato, al massimo un prebook. Nessun retry, sostituzione, booking, pagamento o motore. Nessuna garanzia di SSP esatto; A02 rimane HOLD.'
