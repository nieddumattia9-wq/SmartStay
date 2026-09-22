[CmdletBinding()]
param(
 [ValidateSet('Inventory','Preflight','Simulate','Acquire')][string]$Mode='Preflight',
 [Parameter(Mandatory=$true)][string]$ExpectedHead,
 [Parameter(Mandatory=$true)][string]$ExpectedBranch,
 [string]$ConfigPath,[string]$ConfigSha,[string]$InventoryPath,[string]$InventorySha,
 [string]$OutputPath,[string]$SimulationPath,[string]$SimulationSha
)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'COMPARISON_POWERSHELL_51_REQUIRED'}
$ComparisonNode=(Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$ComparisonArgs=@((Join-Path $PSScriptRoot 'run-liteapi-comparison-max11.mjs'),"--Mode=$Mode","--ExpectedHead=$ExpectedHead","--ExpectedBranch=$ExpectedBranch","--PowerShellVersion=$($PSVersionTable.PSVersion)")
foreach($Pair in @(@('ConfigPath',$ConfigPath),@('ConfigSha',$ConfigSha),@('InventoryPath',$InventoryPath),@('InventorySha',$InventorySha),@('OutputPath',$OutputPath),@('SimulationPath',$SimulationPath),@('SimulationSha',$SimulationSha))){
 if(-not [string]::IsNullOrWhiteSpace($Pair[1])){$ComparisonArgs+="--$($Pair[0])=$($Pair[1])"}
}
. (Join-Path $PSScriptRoot 'invoke-liteapi-profile-runner.ps1')
Invoke-StayOptiProtectedProfile -Mode $Mode -NodePath $ComparisonNode -NodeArguments $ComparisonArgs -ReadyStatus 'READY_FOR_EXPLICIT_MAX11_AUTHORIZATION' -ErrorPrefix 'COMPARISON' -SafetyNotice 'MAX11: Rates1, dettagli5, creazioni prebook5. Nessun GET sessione, retry, booking, pagamento o motore. La misura privata richiede autorizzazione separata.'
