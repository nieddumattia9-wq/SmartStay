[CmdletBinding()]
param(
  [ValidateSet('Start','PrepareOnly','Inspect')][string]$Mode = 'Start',
  [string]$DataRoot,
  [string]$ExpectedHead = '7ae65543a8940dc2dbc93f2c72cbdd89ba8fcffe',
  [string]$CodeInventoryPath,
  [string]$CodeInventorySha256
)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'DEMO_REQUIRES_WINDOWS_POWERSHELL_51' }
$DemoRepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$DemoNode = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
if ([string]::IsNullOrWhiteSpace($DataRoot)) {
  if ($Mode -eq 'Inspect') { throw 'DEMO_INSPECT_REQUIRES_EXPLICIT_ROOT' }
  $DataRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-Synthetic-Review-' + [guid]::NewGuid().ToString('N'))
}
$DemoArguments = @((Join-Path $PSScriptRoot 'run-prospective-assisted-evaluation-demo.mjs'), "--Mode=$Mode", "--DataRoot=$DataRoot", "--ExpectedHead=$ExpectedHead", "--PowerShellVersion=$($PSVersionTable.PSVersion)")
if (-not [string]::IsNullOrWhiteSpace($CodeInventoryPath)) { $DemoArguments += "--CodeInventoryPath=$CodeInventoryPath"; $DemoArguments += "--CodeInventorySha256=$CodeInventorySha256" }
try {
  Push-Location -LiteralPath $DemoRepositoryRoot
  & $DemoNode @DemoArguments
  if ($LASTEXITCODE -ne 0) { throw 'DEMO_FAILED_NO_REAL_ACTION_PERFORMED' }
} finally { Pop-Location }
# Deliberately no exit: the caller console stays visible after success/failure.
