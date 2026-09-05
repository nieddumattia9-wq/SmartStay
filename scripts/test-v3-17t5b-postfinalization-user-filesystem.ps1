[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^V3_17T5[A-Z0-9_]+$')]
  [string]$SessionId,
  [string]$DiagnosticPrivateRoot = '',
  [switch]$SyntheticFixture
)

$ErrorActionPreference = 'Stop'
function Get-StayOptiSha256([string]$LiteralPath) {
  $Stream = [IO.File]::OpenRead($LiteralPath)
  try {
    $Hasher = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($Hasher.ComputeHash($Stream))).Replace('-', '').ToLowerInvariant() }
    finally { $Hasher.Dispose() }
  } finally { $Stream.Dispose() }
}
if ($SessionId -eq 'V3_17T5B_FLORENCE_20261015_001' -or $SessionId -eq 'V3_17T5B_FLORENCE_20261015_002') {
  throw 'MANUAL_CAPTURE_LEGACY_DIAGNOSTIC_SESSION_IMMUTABLE'
}

$LocalData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
$CanonicalPrivateRoot = [IO.Path]::GetFullPath((Join-Path $LocalData 'StayOpti\private-evidence\manual-market-golden-capture')).TrimEnd('\')
$PrivateRoot = $CanonicalPrivateRoot
if (-not [string]::IsNullOrWhiteSpace($DiagnosticPrivateRoot)) {
  if (-not $SyntheticFixture) { throw 'MANUAL_CAPTURE_DIAGNOSTIC_ROOT_REQUIRES_SYNTHETIC_FIXTURE' }
  $PrivateRoot = [IO.Path]::GetFullPath($DiagnosticPrivateRoot).TrimEnd('\')
  $TempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if (-not $PrivateRoot.StartsWith($TempRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'MANUAL_CAPTURE_DIAGNOSTIC_ROOT_OUTSIDE_TEMP'
  }
} elseif ($SyntheticFixture) {
  throw 'MANUAL_CAPTURE_SYNTHETIC_FIXTURE_ROOT_REQUIRED'
}

$SessionRoot = [IO.Path]::GetFullPath((Join-Path $PrivateRoot $SessionId))
$StatePath = Join-Path $SessionRoot 'session-state.json'
$RecoveryPath = Join-Path $SessionRoot 'session-state.recovery.json'
$ManifestPath = Join-Path $SessionRoot 'private-manifest.json'
$EncryptedRoot = Join-Path $SessionRoot 'encrypted'
$HistoryRoot = Join-Path $SessionRoot 'state-history'

foreach ($RequiredPath in @($SessionRoot, $EncryptedRoot, $HistoryRoot)) {
  if (-not (Test-Path -LiteralPath $RequiredPath -PathType Container)) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_DIRECTORY_MISSING' }
}
foreach ($RequiredFile in @($StatePath, $RecoveryPath, $ManifestPath)) {
  if (-not (Test-Path -LiteralPath $RequiredFile -PathType Leaf)) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_FILE_MISSING' }
}

$State = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
$ManifestText = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8
$Manifest = $ManifestText | ConvertFrom-Json
if ($State.stateVersion -cne 'stayopti.v3.manual-public-market-canary-state@2') { throw 'MANUAL_CAPTURE_POSTFINALIZATION_STATE_VERSION_INVALID' }
if ($State.sessionId -cne $SessionId -or $Manifest.sessionId -cne $SessionId) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_SESSION_MISMATCH' }
if ($State.finalized -ne $true -or $State.finalizedCustodyVerified -ne $true) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_NOT_FINALIZED' }
if (@($State.alternatives).Count -ne 5 -or @($Manifest.alternativeBindings).Count -ne 5) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ALTERNATIVE_COUNT_INVALID' }
$ManifestHash = Get-StayOptiSha256 $ManifestPath
if ($State.privateManifestFileSha256 -cne $ManifestHash -or $State.finalizedPrivateManifestFileSha256 -cne $ManifestHash) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_MANIFEST_HASH_MISMATCH' }

$EnvelopeCount = 0
foreach ($AlternativeBinding in @($Manifest.alternativeBindings)) {
  $StateAlternative = @($State.alternatives | Where-Object { $_.publicData.localCaptureId -ceq $AlternativeBinding.localCaptureId })
  if ($StateAlternative.Count -ne 1) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ALTERNATIVE_BINDING_INVALID' }
  $Kinds = @($AlternativeBinding.envelopes | ForEach-Object { $_.evidenceKind } | Sort-Object)
  if (($Kinds -join '|') -cne 'PROPERTY_NAME|SCREENSHOT|SOURCE_URL') { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_KINDS_INVALID' }
  foreach ($Binding in @($AlternativeBinding.envelopes)) {
    $EnvelopeCount += 1
    if ($Binding.relativePath -cnotmatch '^encrypted/[A-Za-z0-9_-]+\.stayopti-rawq$') { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_PATH_INVALID' }
    $EnvelopePath = [IO.Path]::GetFullPath((Join-Path $SessionRoot ($Binding.relativePath -replace '/', '\')))
    if (-not $EnvelopePath.StartsWith([IO.Path]::GetFullPath($EncryptedRoot).TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_ESCAPE' }
    if (-not (Test-Path -LiteralPath $EnvelopePath -PathType Leaf)) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_MISSING' }
    $FileHash = Get-StayOptiSha256 $EnvelopePath
    if ($FileHash -cne $Binding.envelopeFileSha256) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_FILE_HASH_MISMATCH' }
    $Envelope = Get-Content -LiteralPath $EnvelopePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($Envelope.entryId -cne $Binding.entryId -or $Envelope.envelopeFingerprint -cne $Binding.envelopeFingerprint) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_FINGERPRINT_MISMATCH' }
    if ($Envelope.sessionReference -cne $SessionId -or $Envelope.requestKind -cne $Binding.evidenceKind) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_METADATA_MISMATCH' }
  }
}
if ($EnvelopeCount -ne 15) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENVELOPE_COUNT_INVALID' }
$EncryptedFiles = @(Get-ChildItem -LiteralPath $EncryptedRoot -File -Filter '*.stayopti-rawq')
if ($EncryptedFiles.Count -ne 15) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_ENCRYPTED_FILE_COUNT_INVALID' }
$HistoryFiles = @(Get-ChildItem -LiteralPath $HistoryRoot -File -Filter 'session-state-r*.json')
if ($HistoryFiles.Count -lt 1) { throw 'MANUAL_CAPTURE_POSTFINALIZATION_HISTORY_MISSING' }

$IsRealRoot = [string]::IsNullOrWhiteSpace($DiagnosticPrivateRoot) -and $PrivateRoot.Equals($CanonicalPrivateRoot, [StringComparison]::OrdinalIgnoreCase)
[ordered]@{
  status = 'PASS'
  sessionId = $SessionId
  verificationOrigin = if ($IsRealRoot) { 'DIRECT_USER_WINDOWS_POWERSHELL_FILESYSTEM' } else { 'SYNTHETIC_TEMP_FIXTURE' }
  eligibleAsRealOperationalProof = $IsRealRoot
  stateVersion = $State.stateVersion
  finalized = $State.finalized
  stateFileExists = $true
  stateRecoveryExists = $true
  immutableStateHistoryCount = $HistoryFiles.Count
  privateManifestVerified = $true
  alternativeCount = 5
  envelopeCount = $EnvelopeCount
  envelopeFileByFileIntegrity = $true
  noDecryptionPerformed = $true
  noNetworkPerformed = $true
  fixtureOrTempResultPromotableToRealProof = $false
} | ConvertTo-Json -Compress
