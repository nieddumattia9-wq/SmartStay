[CmdletBinding()]
param(
  [ValidateSet('Start','Inspect')][string]$Mode = 'Start',
  [Parameter(Mandatory=$true)][string]$Packet,
  [Parameter(Mandatory=$true)][string]$PacketSha256,
  [Parameter(Mandatory=$true)][string]$CodeManifest,
  [Parameter(Mandatory=$true)][string]$CodeManifestSha256,
  [Parameter(Mandatory=$true)][string]$ProgressRoot,
  [Parameter(Mandatory=$true)][string]$RepositoryRoot
)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1) { throw 'REVIEW_REQUIRES_WINDOWS_POWERSHELL_51' }
function Get-ReviewHash([string]$Path) {
  $Hasher = [Security.Cryptography.SHA256]::Create()
  $Stream = [IO.File]::OpenRead($Path)
  try { return ([BitConverter]::ToString($Hasher.ComputeHash($Stream))).Replace('-','').ToLowerInvariant() }
  finally { $Stream.Dispose(); $Hasher.Dispose() }
}
if ((Get-ReviewHash $CodeManifest) -ne $CodeManifestSha256 -or (Get-ReviewHash $Packet) -ne $PacketSha256) { throw 'REVIEW_MATERIAL_BINDING_CHANGED' }
$ManifestObject = [IO.File]::ReadAllText($CodeManifest) | ConvertFrom-Json
$BundleRoot = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($CodeManifest))
foreach ($Entry in $ManifestObject.files) {
  $EntryPath = [IO.Path]::GetFullPath((Join-Path $BundleRoot $Entry.path))
  if (-not $EntryPath.StartsWith($BundleRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'REVIEW_UNSAFE_CODE_PATH' }
  if ((Get-ReviewHash $EntryPath) -ne $Entry.sha256) { throw 'REVIEW_CODE_CHANGED' }
}
$LauncherExpected = Join-Path $BundleRoot 'scripts\invoke-diagnostic-transcription-review.ps1'
if ([IO.Path]::GetFullPath($PSCommandPath) -ne [IO.Path]::GetFullPath($LauncherExpected)) { throw 'REVIEW_LAUNCHER_NOT_BOUND' }
$ReviewNode = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
if ((Get-ReviewHash $ReviewNode) -ne $ManifestObject.nodeSha256) { throw 'REVIEW_RUNTIME_CHANGED' }
& $ReviewNode (Join-Path $PSScriptRoot 'run-diagnostic-transcription-review.mjs') "--Mode=$Mode" "--Packet=$Packet" "--PacketSha256=$PacketSha256" "--CodeManifest=$CodeManifest" "--CodeManifestSha256=$CodeManifestSha256" "--ProgressRoot=$ProgressRoot" "--RepositoryRoot=$RepositoryRoot"
if ($LASTEXITCODE -ne 0) { throw 'REVIEW_RUNNER_FAILED_NO_IMPORT_PERFORMED' }
# No exit, browser navigation, credential loading, import or automatic review action.
