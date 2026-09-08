[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidateSet('CodeManifest','Preflight','Import','Reopen')][string]$Mode,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedHead,
  [string]$CodeManifestPath, [string]$CodeManifestSha256,
  [string]$ArchivePath, [string]$ArchiveSha256,
  [string]$DescriptorPath, [string]$DescriptorSha256,
  [string]$DataMapPath, [string]$DataMapSha256,
  [string]$ReviewReceiptPath, [string]$ReviewReceiptSha256,
  [string]$SessionId, [string]$PrivateRoot,
  [string]$AuthorizationLiteral, [string]$OutputPath,
  [switch]$SyntheticFixture
)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1 -or $PSVersionTable.PSEdition -ne 'Desktop') {
  throw 'DOSSIER_POWERSHELL_51_REQUIRED'
}
$RepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$Arguments = @((Join-Path $PSScriptRoot 'run-browser-assisted-dossier-handoff.mjs'))
foreach ($Key in @('Mode','ExpectedHead','CodeManifestPath','CodeManifestSha256','ArchivePath','ArchiveSha256','DescriptorPath','DescriptorSha256','DataMapPath','DataMapSha256','ReviewReceiptPath','ReviewReceiptSha256','SessionId','PrivateRoot','AuthorizationLiteral','OutputPath')) {
  $Value = Get-Variable -Name $Key -ValueOnly
  if (-not [string]::IsNullOrEmpty($Value)) { $Arguments += "--$Key=$Value" }
}
$Arguments += "--SyntheticFixture=$($SyntheticFixture.IsPresent.ToString().ToLowerInvariant())"
$Arguments += "--LauncherPowerShellVersion=$($PSVersionTable.PSVersion.ToString())"
try {
  Push-Location -LiteralPath $RepositoryRoot
  $Node = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
  & $Node @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'DOSSIER_HANDOFF_FAILED' }
} finally {
  Pop-Location
}
