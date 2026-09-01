param(
  [Parameter(Mandatory = $true)][ValidateSet('CANARY', 'REMAINING_11')][string]$Stage,
  [Parameter(Mandatory = $true)][string]$AuthorizationLiteral,
  [Parameter(Mandatory = $true)][string]$ExpectedHead,
  [Parameter(Mandatory = $true)][string]$CompiledRoot,
  [Parameter(Mandatory = $true)][string]$EvidenceZipPath,
  [Parameter(Mandatory = $false)][string]$CanaryEvidenceZipPath,
  [Parameter(Mandatory = $false)][switch]$HandoffPreflightOnly,
  [Parameter(Mandatory = $false)][switch]$UseProcessEnvironmentCredential
)

$ErrorActionPreference = 'Stop'

function Get-StayOptiSha256 {
  param([Parameter(Mandatory = $true)][string]$LiteralPath)
  $stream = [IO.File]::OpenRead($LiteralPath)
  try {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
  }
  finally { $stream.Dispose() }
}

function Remove-StayOptiPilotWorkRoot {
  param([Parameter(Mandatory = $true)][string]$LiteralPath)
  if (-not (Test-Path -LiteralPath $LiteralPath)) { return }
  $resolvedWork = [IO.Path]::GetFullPath($LiteralPath)
  $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if ($resolvedWork.StartsWith($resolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase) -and
      [IO.Path]::GetFileName($resolvedWork).StartsWith('StayOpti-V3-17T2-Evidence-', [StringComparison]::Ordinal)) {
    Remove-Item -LiteralPath $resolvedWork -Recurse -Force
  }
}

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$zipFullPath = [IO.Path]::GetFullPath($EvidenceZipPath)
if ($zipFullPath.StartsWith($repositoryRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'SERPAPI_PILOT_REPOSITORY_OUTPUT_PROHIBITED'
}
if (Test-Path -LiteralPath $zipFullPath) { throw 'SERPAPI_PILOT_EVIDENCE_ZIP_OVERWRITE_PROHIBITED' }

$workRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T2-Evidence-' + [Guid]::NewGuid().ToString('N'))
$evidenceRoot = Join-Path $workRoot 'staging'
$verifyRoot = Join-Path $workRoot 'verify'
$canaryVerifyRoot = Join-Path $workRoot 'canary-verify'
[IO.Directory]::CreateDirectory($workRoot) | Out-Null
$secureKey = $null
$unmanaged = [IntPtr]::Zero
$plainKey = $null
$childExit = 1
$childStarted = $false
$node = (Get-Command node -ErrorAction Stop).Source
$runner = Join-Path $PSScriptRoot 'run-v3-17t2-serpapi-google-hotels-pilot.mjs'
$canaryZipHash = $null

try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if ($Stage -eq 'REMAINING_11') {
  if ([string]::IsNullOrWhiteSpace($CanaryEvidenceZipPath)) { throw 'SERPAPI_PILOT_CANARY_EVIDENCE_REQUIRED' }
  $canaryZipFullPath = [IO.Path]::GetFullPath($CanaryEvidenceZipPath)
  if (-not (Test-Path -LiteralPath $canaryZipFullPath -PathType Leaf)) { throw 'SERPAPI_PILOT_CANARY_EVIDENCE_REQUIRED' }
  [IO.Directory]::CreateDirectory($canaryVerifyRoot) | Out-Null
  $canaryArchive = [IO.Compression.ZipFile]::OpenRead($canaryZipFullPath)
  try {
    if ($canaryArchive.Entries.Count -gt 256) { throw 'SERPAPI_PILOT_CANARY_EVIDENCE_ENTRY_CAP_EXCEEDED' }
    $canaryExpandedBytes = [int64]0
    foreach ($entry in $canaryArchive.Entries) {
      $entryName = $entry.FullName.Replace('\', '/')
      if ([string]::IsNullOrWhiteSpace($entryName) -or $entryName.StartsWith('/') -or
          $entryName.Contains(':') -or $entryName.Split('/') -contains '..') {
        throw 'SERPAPI_PILOT_CANARY_EVIDENCE_PATH_INVALID'
      }
      $entryTarget = [IO.Path]::GetFullPath((Join-Path $canaryVerifyRoot $entryName.Replace('/', '\')))
      if (-not $entryTarget.StartsWith([IO.Path]::GetFullPath($canaryVerifyRoot).TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'SERPAPI_PILOT_CANARY_EVIDENCE_PATH_INVALID'
      }
      $canaryExpandedBytes += $entry.Length
      if ($canaryExpandedBytes -gt 52428800) { throw 'SERPAPI_PILOT_CANARY_EVIDENCE_SIZE_CAP_EXCEEDED' }
    }
  }
  finally { $canaryArchive.Dispose() }
  [IO.Compression.ZipFile]::ExtractToDirectory($canaryZipFullPath, $canaryVerifyRoot)
    $canaryZipHash = Get-StayOptiSha256 -LiteralPath $canaryZipFullPath
  }
  elseif (-not [string]::IsNullOrWhiteSpace($CanaryEvidenceZipPath)) {
    throw 'SERPAPI_PILOT_CANARY_RESUME_INPUT_PROHIBITED'
  }

$stageCapArgument = if ($Stage -eq 'CANARY') { '--single-stage-max-4' } else { '--single-stage-max-44' }
$preflightArguments = @(
  $runner,
  "--stage=$Stage",
  "--authorization=$AuthorizationLiteral",
  "--expected-head=$ExpectedHead",
  "--compiled-root=$CompiledRoot",
  '--authorize-retention-policy',
  $stageCapArgument,
  '--preflight-only'
)
if ($Stage -eq 'REMAINING_11') {
  $preflightArguments += "--canary-evidence-root=$canaryVerifyRoot"
  $preflightArguments += "--canary-evidence-zip-sha256=$canaryZipHash"
  $preflightArguments += '--manual-canary-review-confirmed'
}
  & $node $preflightArguments
  if ($LASTEXITCODE -ne 0) { throw "SERPAPI_PILOT_PREFLIGHT_FAILED_$LASTEXITCODE" }

  if ($HandoffPreflightOnly) {
    'READY_FOR_SECURE_KEY_PROMPT=YES'
    'SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0'
    return
  }

  if ($UseProcessEnvironmentCredential) {
    $plainKey = [Environment]::GetEnvironmentVariable('SERPAPI_API_KEY', 'Process')
  }
  else {
    $secureKey = Read-Host 'SerpApi API key' -AsSecureString
    $unmanaged = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($unmanaged)
  }
  if ([string]::IsNullOrWhiteSpace($plainKey)) { throw 'SERPAPI_PILOT_API_KEY_MISSING' }
  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $plainKey, 'Process')
  $childStarted = $true
  $childArguments = @(
    $runner,
    "--stage=$Stage",
    "--authorization=$AuthorizationLiteral",
    "--expected-head=$ExpectedHead",
    "--compiled-root=$CompiledRoot",
    "--evidence-root=$evidenceRoot",
    '--authorize-retention-policy',
    $stageCapArgument
  )
  if ($Stage -eq 'REMAINING_11') {
    $childArguments += "--canary-evidence-root=$canaryVerifyRoot"
    $childArguments += "--canary-evidence-zip-sha256=$canaryZipHash"
    $childArguments += '--manual-canary-review-confirmed'
  }
  & $node $childArguments
  $childExit = $LASTEXITCODE
  if (-not (Test-Path -LiteralPath $evidenceRoot -PathType Container)) {
    throw 'SERPAPI_PILOT_EVIDENCE_STAGING_NOT_CREATED'
  }
  $postflight = [ordered]@{
    childStarted = $childStarted
    childExitCode = $childExit
    credentialClearedFromProcess = ([Environment]::GetEnvironmentVariable('SERPAPI_API_KEY', 'Process') -eq $null)
    rawPayloadCommitted = $false
    evidenceZipOutsideRepository = $true
    stage = $Stage
    remainingStageNotStarted = ($Stage -eq 'CANARY')
  } | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $evidenceRoot 'postflight.json'), $postflight + "`r`n", [Text.UTF8Encoding]::new($false))

  & $node @($runner, "--compiled-root=$CompiledRoot", "--finalize-evidence=$evidenceRoot")
  if ($LASTEXITCODE -ne 0) { throw "SERPAPI_PILOT_EVIDENCE_FINALIZE_FAILED_$LASTEXITCODE" }

  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($zipFullPath)) | Out-Null
  [IO.Compression.ZipFile]::CreateFromDirectory(
    $evidenceRoot,
    $zipFullPath,
    [IO.Compression.CompressionLevel]::Optimal,
    $false
  )

  $archive = [IO.Compression.ZipFile]::OpenRead($zipFullPath)
  try {
    foreach ($entry in $archive.Entries) {
      $name = $entry.FullName.Replace('\', '/')
      if ($name.StartsWith('/') -or $name.Contains('../') -or $name.Contains('/..') -or $name -match '^[A-Za-z]:') {
        throw 'SERPAPI_PILOT_EVIDENCE_ZIP_PATH_TRAVERSAL'
      }
    }
  }
  finally { $archive.Dispose() }

  [IO.Directory]::CreateDirectory($verifyRoot) | Out-Null
  [IO.Compression.ZipFile]::ExtractToDirectory($zipFullPath, $verifyRoot)
  & $node @($runner, "--compiled-root=$CompiledRoot", "--validate-evidence=$verifyRoot")
  if ($LASTEXITCODE -ne 0) { throw "SERPAPI_PILOT_EVIDENCE_ZIP_VALIDATION_FAILED_$LASTEXITCODE" }
  $zipHash = Get-StayOptiSha256 -LiteralPath $zipFullPath
  "EVIDENCE_ZIP_PATH=$zipFullPath"
  "EVIDENCE_ZIP_SHA256=$zipHash"
  if ($childExit -ne 0) { throw "SERPAPI_PILOT_CHILD_FAILED_$childExit" }
}
finally {
  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $null, 'Process')
  $plainKey = $null
  if ($unmanaged -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($unmanaged)
    $unmanaged = [IntPtr]::Zero
  }
  if ($null -ne $secureKey) { $secureKey.Dispose(); $secureKey = $null }
  Remove-StayOptiPilotWorkRoot -LiteralPath $workRoot
}
