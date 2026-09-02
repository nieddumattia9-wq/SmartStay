param(
  [Parameter(Mandatory = $true)]
  [string]$ExpectedExecutionHead,
  [Parameter(Mandatory = $true)]
  [string]$ExpectedRunnerBundleHash,
  [Parameter(Mandatory = $true)]
  [string]$AuthorizationLiteral,
  [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = 'C:\Users\Mattia\SmartStay'
$SourceSha = 'd99982ab57d80b0d9d78b8e8470bfd6ed80cb821'
$NodeRunner = Join-Path $RepositoryRoot 'scripts\run-v3-17t5-serpapi-limited-comparable-canary2.mjs'
$TypeScriptCompiler = Join-Path $RepositoryRoot 'node_modules\typescript\bin\tsc'
$ExpectedDirty = [ordered]@{
  'src/engine-v3/index.ts' = 'f0fa3161f0e0aefba4ce09db9289094353ed0550537eb36a49d4527d5357b772'
  '.codex-remote-attachments/01a0101e-d030-75f3-8d0a-f3c56dff8ce8/787761a2-8b1d-46ff-b461-9cd5f5310cee/1-Photo-1.jpg' = '0b73878c9c97b6a050d6fce02196caa954295cf23641e8a2063ffe289def196d'
  '.codex-remote-attachments/01a0101e-d030-75f3-8d0a-f3c56dff8ce8/787761a2-8b1d-46ff-b461-9cd5f5310cee/2-Photo-2.jpg' = 'e974d0d6774e0434621ceee9f7009d161b9d67ccc53c58335726ab4e326d3978'
  '.codex-remote-attachments/01a0101e-d030-75f3-8d0a-f3c56dff8ce8/787761a2-8b1d-46ff-b461-9cd5f5310cee/3-Photo-3.jpg' = 'b14697c3ae052488dd9d706e42e5d33e420934cf49fff467c6b11b52ed561966'
  'src/engine-v3/evaluation/realMeasurementCapturePilotV3.ts' = 'faf457951c1a2a2b92fa02f4718f1d2f4a49fc678d131f14f5a940bd18eeecf8'
  'tests/engine-v3/fixtures/v3-17-real-measurement-capture-pilot-001-source-v1.json' = 'a132db53db47f1c7008ba96b4963c143a8c70f916f9d4edd69fb38d9589c55d3'
  'tests/engine-v3/v3RealMeasurementCapturePilot.test.ts' = 'b70bd31ab5d279685672bc2162d8e9342bd4317f92ea2c4524ddd5b225bb1041'
}

function Invoke-NativeChecked {
  param([string]$FilePath, [string[]]$ArgumentList)
  $output = & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "T5_NATIVE_COMMAND_FAILED"
  }
  return $output
}

function Assert-RepositoryState {
  Set-Location -LiteralPath $RepositoryRoot
  $branch = (Invoke-NativeChecked -FilePath 'git.exe' -ArgumentList @('branch', '--show-current') | Select-Object -First 1)
  $head = (Invoke-NativeChecked -FilePath 'git.exe' -ArgumentList @('rev-parse', 'HEAD') | Select-Object -First 1)
  $parent = (Invoke-NativeChecked -FilePath 'git.exe' -ArgumentList @('rev-parse', 'HEAD^') | Select-Object -First 1)
  if ($branch -ne 'main') { throw 'T5_BRANCH_MISMATCH' }
  if ($head -ne $ExpectedExecutionHead) { throw 'T5_EXECUTION_HEAD_MISMATCH' }
  if ($parent -ne $SourceSha) { throw 'T5_SOURCE_EXECUTION_CHAIN_MISMATCH' }
  $staged = @(Invoke-NativeChecked -FilePath 'git.exe' -ArgumentList @('diff', '--cached', '--name-only'))
  if (@($staged | Where-Object { $_ }).Count -ne 0) { throw 'T5_STAGED_NOT_ZERO' }
  $status = @(Invoke-NativeChecked -FilePath 'git.exe' -ArgumentList @('status', '--porcelain=v1', '--untracked-files=all'))
  $observedPaths = @($status | Where-Object { $_ } | ForEach-Object { $_.Substring(3).Replace('\', '/') } | Sort-Object -Unique)
  $expectedPaths = @($ExpectedDirty.Keys | Sort-Object)
  if ([string]::Join("`n", $observedPaths) -ne [string]::Join("`n", $expectedPaths)) { throw 'T5_WORKING_TREE_DIRTY_SET_MISMATCH' }
  foreach ($entry in $ExpectedDirty.GetEnumerator()) {
    $path = Join-Path $RepositoryRoot $entry.Key
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'T5_EXPECTED_DIRTY_PATH_MISSING' }
    $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $entry.Value) { throw 'T5_EXPECTED_DIRTY_PATH_HASH_MISMATCH' }
  }
}

if (-not (Test-Path -LiteralPath $NodeRunner -PathType Leaf)) { throw 'T5_RUNNER_MISSING' }
if (-not (Test-Path -LiteralPath $TypeScriptCompiler -PathType Leaf)) { throw 'T5_TYPESCRIPT_COMPILER_MISSING' }
if ($ExpectedExecutionHead -notmatch '^[0-9a-f]{40}$') { throw 'T5_EXECUTION_HEAD_INVALID' }
if ($ExpectedRunnerBundleHash -notmatch '^[0-9a-f]{64}$') { throw 'T5_RUNNER_BUNDLE_HASH_INVALID' }

$CompiledRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T5-Compiled-' + [Guid]::NewGuid().ToString('N'))
$EvidenceRoot = $null
$SecureKey = $null
$Bstr = [IntPtr]::Zero
$PlainKey = $null
try {
  Assert-RepositoryState
  [IO.Directory]::CreateDirectory($CompiledRoot) | Out-Null
  Invoke-NativeChecked -FilePath 'node.exe' -ArgumentList @($TypeScriptCompiler, '-p', (Join-Path $RepositoryRoot 'tsconfig.tests.json'), '--outDir', $CompiledRoot) | Out-Null
  [IO.File]::WriteAllText((Join-Path $CompiledRoot 'package.json'), "{`r`n  `"type`": `"commonjs`"`r`n}`r`n", [Text.UTF8Encoding]::new($false))
  $CommonArguments = @(
    $NodeRunner,
    "--compiled-root=$CompiledRoot",
    "--expected-head=$ExpectedExecutionHead",
    "--expected-runner-bundle-hash=$ExpectedRunnerBundleHash",
    "--authorization=$AuthorizationLiteral"
  )
  $preflight = Invoke-NativeChecked -FilePath 'node.exe' -ArgumentList @($CommonArguments + '--preflight-only')
  $preflightText = [string]::Join("`n", @($preflight))
  if ($preflightText -notmatch '"status":"PREFLIGHT_VALID"') { throw 'T5_PREFLIGHT_RESULT_INVALID' }
  if ($PreflightOnly) {
    Write-Output 'V3_17T5_PREFLIGHT=PASS'
    Write-Output 'CREDENTIALS_LOADED=NO'
    Write-Output 'HTTP_REQUESTS=0'
    return
  }

  $SecureKey = Read-Host 'SerpApi API key' -AsSecureString
  if ($SecureKey.Length -eq 0) { throw 'T5_API_KEY_MISSING' }
  $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureKey)
  $PlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
  if ([string]::IsNullOrEmpty($PlainKey)) { throw 'T5_API_KEY_MISSING' }
  $env:SERPAPI_API_KEY = $PlainKey
  $EvidenceRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T5-Canary2-Evidence-' + [Guid]::NewGuid().ToString('N'))
  $result = Invoke-NativeChecked -FilePath 'node.exe' -ArgumentList @($CommonArguments + "--evidence-root=$EvidenceRoot")
  $resultText = [string]::Join("`n", @($result))
  if ($resultText -notmatch '"requestCount":(?:1|2)') { throw 'T5_EXECUTION_RESULT_INVALID' }
  $downloads = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'
  $stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
  $zipPath = Join-Path $downloads ("StayOpti-V3-17T5-Canary2-Evidence-$stamp.zip")
  if (Test-Path -LiteralPath $zipPath) { throw 'T5_EVIDENCE_ZIP_ALREADY_EXISTS' }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($EvidenceRoot, $zipPath, [IO.Compression.CompressionLevel]::Optimal, $false)
  Write-Output $resultText
  Write-Output "EVIDENCE_ZIP_PATH=$zipPath"
  Write-Output "EVIDENCE_ZIP_SHA256=$((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant())"
} finally {
  Remove-Item Env:SERPAPI_API_KEY -ErrorAction SilentlyContinue
  $PlainKey = $null
  if ($Bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }
  if ($null -ne $SecureKey) { $SecureKey.Dispose() }
  if ($null -ne $EvidenceRoot -and (Test-Path -LiteralPath $EvidenceRoot)) {
    $resolvedEvidence = [IO.Path]::GetFullPath($EvidenceRoot)
    $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedEvidence.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolvedEvidence).StartsWith('StayOpti-V3-17T5-Canary2-Evidence-')) {
      Remove-Item -LiteralPath $resolvedEvidence -Recurse -Force
    }
  }
  if (Test-Path -LiteralPath $CompiledRoot) {
    $resolvedCompiled = [IO.Path]::GetFullPath($CompiledRoot)
    $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedCompiled.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolvedCompiled).StartsWith('StayOpti-V3-17T5-Compiled-')) {
      Remove-Item -LiteralPath $resolvedCompiled -Recurse -Force
    }
  }
}
