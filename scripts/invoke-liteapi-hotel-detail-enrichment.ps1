[CmdletBinding()]
param(
 [ValidateSet('Inventory','Preflight','Simulate','Acquire')][string]$Mode='Preflight',
 [Parameter(Mandatory=$true)][string]$ExpectedHead,
 [Parameter(Mandatory=$true)][string]$ExpectedBranch,
 [string]$ConfigPath,[string]$ConfigSha256,[string]$InventoryPath,[string]$InventorySha256,
 [string]$OutputPath,[string]$SimulationPath,[string]$SimulationSha256
)
$ErrorActionPreference='Stop'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'LITEAPI_DETAIL_POWERSHELL_51_REQUIRED'}
$DetailNode=(Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$DetailScript=Join-Path $PSScriptRoot 'run-liteapi-hotel-detail-enrichment.mjs'
$DetailArgs=@($DetailScript,"--Mode=$Mode","--ExpectedHead=$ExpectedHead","--ExpectedBranch=$ExpectedBranch","--PowerShellVersion=$($PSVersionTable.PSVersion)")
foreach($Pair in @(@('ConfigPath',$ConfigPath),@('ConfigSha256',$ConfigSha256),@('InventoryPath',$InventoryPath),@('InventorySha256',$InventorySha256),@('OutputPath',$OutputPath),@('SimulationPath',$SimulationPath),@('SimulationSha256',$SimulationSha256))){
 if(-not [string]::IsNullOrWhiteSpace($Pair[1])){$DetailArgs+="--$($Pair[0])=$($Pair[1])"}
}
. (Join-Path $PSScriptRoot 'invoke-liteapi-profile-runner.ps1')
Invoke-StayOptiProtectedProfile -Mode $Mode -NodePath $DetailNode -NodeArguments $DetailArgs -ReadyStatus 'READY_FOR_EXPLICIT_DETAIL_ACQUISITION_AUTHORIZATION' -ErrorPrefix 'LITEAPI_DETAIL' -SafetyNotice 'MAX5: soltanto i GET hotel-detail pianificati. Nessun Rates, facilities, prebook, booking, pagamento o motore. Nessun retry o riavvio.'
