[CmdletBinding()]
param(
 [ValidateSet('Inventory','Preflight','Simulate','Acquire')][string]$Mode='Preflight',
 [Parameter(Mandatory=$true)][string]$ExpectedHead,
 [Parameter(Mandatory=$true)][string]$ExpectedBranch,
 [string]$ConfigPath,[string]$ConfigSha,[string]$InventoryPath,[string]$InventorySha,
 [string]$OutputPath,[string]$SimulationPath,[string]$SimulationSha
)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'BAND_POWERSHELL_51_REQUIRED'}
$BandNode=(Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$BandArgs=@((Join-Path $PSScriptRoot 'run-liteapi-band-comparison.mjs'),"--Mode=$Mode","--ExpectedHead=$ExpectedHead","--ExpectedBranch=$ExpectedBranch","--PowerShellVersion=$($PSVersionTable.PSVersion)")
foreach($Pair in @(@('ConfigPath',$ConfigPath),@('ConfigSha',$ConfigSha),@('InventoryPath',$InventoryPath),@('InventorySha',$InventorySha),@('OutputPath',$OutputPath),@('SimulationPath',$SimulationPath),@('SimulationSha',$SimulationSha))){
 if(-not [string]::IsNullOrWhiteSpace($Pair[1])){$BandArgs+="--$($Pair[0])=$($Pair[1])"}
}
. (Join-Path $PSScriptRoot 'invoke-liteapi-profile-runner.ps1')
Invoke-StayOptiProtectedProfile -Mode $Mode -NodePath $BandNode -NodeArguments $BandArgs -ReadyStatus 'READY_FOR_EXPLICIT_MAX31_AUTHORIZATION' -ErrorPrefix 'BAND' -SafetyNotice 'MAX31: ricerca1, requote10, dettagli10, prebook10. Campione fisso, nessun retry o sostituzione. Nessun motore, booking o pagamento. La fascia di prezzo non autorizza aumenti al prebook.'
