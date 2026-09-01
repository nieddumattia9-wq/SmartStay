param(
  [Parameter(Mandatory = $true)][string]$AuthorizationLiteral,
  [Parameter(Mandatory = $true)][string]$ExpectedHead,
  [Parameter(Mandatory = $true)][string]$CompiledRoot,
  [Parameter(Mandatory = $true)][string]$EvidenceZipPath
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$zipFullPath = [IO.Path]::GetFullPath($EvidenceZipPath)
if ($zipFullPath.StartsWith($repositoryRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'SERPAPI_PILOT_REPOSITORY_OUTPUT_PROHIBITED'
}
if (Test-Path -LiteralPath $zipFullPath) { throw 'SERPAPI_PILOT_EVIDENCE_ZIP_OVERWRITE_PROHIBITED' }

$workRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T2-Evidence-' + [Guid]::NewGuid().ToString('N'))
$evidenceRoot = Join-Path $workRoot 'staging'
$verifyRoot = Join-Path $workRoot 'verify'
[IO.Directory]::CreateDirectory($workRoot) | Out-Null
$secureKey = $null
$unmanaged = [IntPtr]::Zero
$plainKey = $null
$childExit = 1
$childStarted = $false
$node = (Get-Command node -ErrorAction Stop).Source
$runner = Join-Path $PSScriptRoot 'run-v3-17t2-serpapi-google-hotels-pilot.mjs'

try {
  $secureKey = Read-Host 'SerpApi API key' -AsSecureString
  $unmanaged = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($unmanaged)
  if ([string]::IsNullOrWhiteSpace($plainKey)) { throw 'SERPAPI_PILOT_API_KEY_MISSING' }
  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $plainKey, 'Process')
  $childStarted = $true
  & $node @(
    $runner,
    "--authorization=$AuthorizationLiteral",
    "--expected-head=$ExpectedHead",
    "--compiled-root=$CompiledRoot",
    "--evidence-root=$evidenceRoot",
    '--authorize-retention-policy',
    '--single-wave-max-48'
  )
  $childExit = $LASTEXITCODE
}
finally {
  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $null, 'Process')
  $plainKey = $null
  if ($unmanaged -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($unmanaged)
    $unmanaged = [IntPtr]::Zero
  }
  if ($null -ne $secureKey) { $secureKey.Dispose(); $secureKey = $null }
}

try {
  if (-not (Test-Path -LiteralPath $evidenceRoot -PathType Container)) {
    throw 'SERPAPI_PILOT_EVIDENCE_STAGING_NOT_CREATED'
  }
  $postflight = [ordered]@{
    childStarted = $childStarted
    childExitCode = $childExit
    credentialClearedFromProcess = ([Environment]::GetEnvironmentVariable('SERPAPI_API_KEY', 'Process') -eq $null)
    rawPayloadCommitted = $false
    evidenceZipOutsideRepository = $true
  } | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $evidenceRoot 'postflight.json'), $postflight + "`r`n", [Text.UTF8Encoding]::new($false))

  & $node @($runner, "--compiled-root=$CompiledRoot", "--finalize-evidence=$evidenceRoot")
  if ($LASTEXITCODE -ne 0) { throw "SERPAPI_PILOT_EVIDENCE_FINALIZE_FAILED_$LASTEXITCODE" }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
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
  $zipHash = (Get-FileHash -LiteralPath $zipFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  "EVIDENCE_ZIP_PATH=$zipFullPath"
  "EVIDENCE_ZIP_SHA256=$zipHash"
  if ($childExit -ne 0) { exit $childExit }
}
finally {
  if (Test-Path -LiteralPath $workRoot) {
    $resolvedWork = [IO.Path]::GetFullPath($workRoot)
    $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if ($resolvedWork.StartsWith($resolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase) -and
        [IO.Path]::GetFileName($resolvedWork).StartsWith('StayOpti-V3-17T2-Evidence-', [StringComparison]::Ordinal)) {
      Remove-Item -LiteralPath $resolvedWork -Recurse -Force
    }
  }
}
