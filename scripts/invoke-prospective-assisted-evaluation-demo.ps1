[CmdletBinding()]
param(
  [ValidateSet('Start','PrepareOnly','Inspect')][string]$Mode = 'Start',
  [string]$DataRoot,
  [string]$ExpectedBranch,
  [string]$ExpectedHead,
  [string]$CodeInventoryPath,
  [string]$CodeInventorySha256
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ExpectedBranch) -or $ExpectedHead -cnotmatch '^[a-f0-9]{40}$' -or [string]::IsNullOrWhiteSpace($CodeInventoryPath) -or $CodeInventorySha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'DEMO_EXPLICIT_CHECKPOINT_REQUIRED' }
if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'DEMO_REQUIRES_WINDOWS_POWERSHELL_51' }
$DemoRepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$DemoNode = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
if ([string]::IsNullOrWhiteSpace($DataRoot)) {
  if ($Mode -eq 'Inspect') { throw 'DEMO_INSPECT_REQUIRES_EXPLICIT_ROOT' }
  $DataRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-Synthetic-Review-' + [guid]::NewGuid().ToString('N'))
}
$DemoArguments = @((Join-Path $PSScriptRoot 'run-prospective-assisted-evaluation-demo.mjs'), "--Mode=$Mode", "--DataRoot=$DataRoot", "--ExpectedBranch=$ExpectedBranch", "--ExpectedHead=$ExpectedHead", "--PowerShellVersion=$($PSVersionTable.PSVersion)")
if (-not [string]::IsNullOrWhiteSpace($CodeInventoryPath)) { $DemoArguments += "--CodeInventoryPath=$CodeInventoryPath"; $DemoArguments += "--CodeInventorySha256=$CodeInventorySha256" }
try {
  Push-Location -LiteralPath $DemoRepositoryRoot
  & $DemoNode @DemoArguments
  if ($LASTEXITCODE -ne 0) { throw 'DEMO_FAILED_NO_REAL_ACTION_PERFORMED' }
} finally { Pop-Location }
# Deliberately no exit: the caller console stays visible after success/failure.
