[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)][string]$AuthorizationLiteral,
  [Parameter(Mandatory = $false)][switch]$HandoffPreflightOnly,
  [Parameter(Mandatory = $false)][switch]$OfflineTestMode,
  [Parameter(Mandatory = $false)]
  [ValidateSet('NONE', 'HEAD', 'DIRTY', 'BUNDLE', 'COMPILE', 'MANIFEST', 'LITERAL', 'RUNNER_PREFLIGHT', 'LAUNCHER_PREFLIGHT', 'EMPTY_KEY')]
  [string]$InjectedFailure = 'NONE',
  [Parameter(Mandatory = $false)][string]$DiagnosticDirectory,
  [Parameter(Mandatory = $false)][switch]$SkipFinalPause
)

$ErrorActionPreference = 'Stop'

$SourceSha = 'ed2633c1fc700a9d9199ce920b826d2909543ab8'
$GateCommitSha = '17432a19083403492e3dd28c62affad405c70737'
$ExpectedBranch = 'main'
$ExpectedManifestHash = 'e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88'
$ExpectedRunnerBundleHash =
  # HANDOFF_BUNDLE_HASH_START
  '3f2e27c8f5bb557bd388d89e73b62e6ced9016c6b43ac768faab19fa19b0af6b'
  # HANDOFF_BUNDLE_HASH_END
$ExpectedCanarySession = 'SERP_PILOT_01_FLORENCE_COUPLE_BALANCED'
$ExpectedCanaryIndex = 0
$ExpectedCanaryCap = 2
$ExpectedRevokedCanaryLiterals = @(
  'AUTHORIZE_V3_17T2_CANARY_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_c41204302c80bfd2a0433056ddced79facdf2bcc1197e2ec13dc6556a26d9f01_RETENTION_V2_MAX4',
  'AUTHORIZE_V3_17T2_CANARY_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_d3176600f3d028c450174b7e14de87084a3eab549eb60350f260043539a08683_RETENTION_V2_MAX4',
  'AUTHORIZE_V3_17T2_CANARY_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_e48525178e847c30e0c597ab67671327d5f972763b00882f33fdef111365ddde_RETENTION_V2_MAX2',
  'AUTHORIZE_V3_17T2B_MAX2_HEAD_ed2633c1fc700a9d9199ce920b826d2909543ab8_MANIFEST_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_891a8c2cbf564ab433ec6553f3dffe880981137797fda9ed3fbb513a5d3e7f9c_MAIN1_DETAIL1_SESSIONS1_CONCURRENCY1_RETRIES0_PAGINATION0_QUARANTINE_AES256GCM_DPAPI_CURRENTUSER_AUTOSTOP_REMAINING_NO'
)
$ExpectedNewCanaryLiteral = $null
$ExpectedRevokedMax48Literal = 'AUTHORIZE_V3_17T2_SERPAPI_12_SESSION_PILOT_e0981d4540194e3c918a3eeb0669063e8697dd849abbbd6dcbfd3cfb9658cd88_RUNNER_67cfd073efbc3177590c9a05feafb1612cc09c359421791414a3c5fadd901cd6_RETENTION_V2_MAX48'
$RepositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$NodeRunner = Join-Path $PSScriptRoot 'run-v3-17t2-serpapi-google-hotels-pilot.mjs'
$PilotLauncher = Join-Path $PSScriptRoot 'invoke-v3-17t2-serpapi-google-hotels-pilot.ps1'
$TypeScript = Join-Path $RepositoryRoot 'node_modules\typescript\bin\tsc'
$PowerShell51 = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$WorkRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T2-Canary-Handoff-' + [Guid]::NewGuid().ToString('N'))
$CompiledRoot = Join-Path $WorkRoot 'compiled'
$CurrentStep = 'INITIALIZE'
$LastCompletedStep = 'NONE'
$CurrentCommand = 'NONE'
$FailureClassification = 'NONE'
$SanitizedExceptionType = 'NONE'
$ResultCode = 1
$ApiKeyPromptReached = $false
$EvidenceZipFound = $false
$ActualRequestsTransmitted = 0
$CanaryResult = 'NOT_STARTED'
$CollectionResult = 'NOT_STARTED'
$EvidenceResult = 'NOT_CREATED'
$SecureKey = $null
$UnmanagedSecret = [IntPtr]::Zero
$PlainKey = $null
$ObservedHead = 'NOT_OBSERVED'
$ObservedBundleHash = 'NOT_OBSERVED'
$DiagnosticLogPath = $null

function Set-StayOptiStep {
  param([Parameter(Mandatory = $true)][string]$Step)
  $script:CurrentStep = $Step
  $script:CurrentCommand = $Step
}

function Complete-StayOptiStep {
  $script:LastCompletedStep = $script:CurrentStep
}

function Invoke-StayOptiInjectedFailure {
  param([Parameter(Mandatory = $true)][string]$Point, [Parameter(Mandatory = $true)][string]$Code)
  if ($OfflineTestMode -and $InjectedFailure -eq $Point) { throw $Code }
}

function Get-SanitizedFailureClassification {
  param([Parameter(Mandatory = $true)]$Failure)
  $candidate = if ($Failure.Exception) { [string]$Failure.Exception.Message } else { '' }
  if ($candidate -match '^(?:STAYOPTI_T1C_|SERPAPI_PILOT_)[A-Z0-9_]+(?:_[0-9]+)?$') { return $candidate }
  return 'STAYOPTI_T1C_SANITIZED_HANDOFF_FAILURE'
}

function Remove-StayOptiHandoffWorkRoot {
  if (-not (Test-Path -LiteralPath $WorkRoot)) { return }
  $resolvedWork = [IO.Path]::GetFullPath($WorkRoot)
  $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if ($resolvedWork.StartsWith($resolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase) -and
      [IO.Path]::GetFileName($resolvedWork).StartsWith('StayOpti-V3-17T2-Canary-Handoff-', [StringComparison]::Ordinal)) {
    Remove-Item -LiteralPath $resolvedWork -Recurse -Force
  }
}

function Write-StayOptiDiagnosticLog {
  $targetDirectory = if ([string]::IsNullOrWhiteSpace($DiagnosticDirectory)) {
    Join-Path $env:USERPROFILE 'Downloads'
  } else {
    [IO.Path]::GetFullPath($DiagnosticDirectory)
  }
  if ($OfflineTestMode -and -not [string]::IsNullOrWhiteSpace($DiagnosticDirectory)) {
    $resolvedTarget = [IO.Path]::GetFullPath($targetDirectory).TrimEnd('\')
    $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if (-not $resolvedTarget.StartsWith($resolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase)) {
      throw 'STAYOPTI_T1C_TEST_DIAGNOSTIC_PATH_UNSAFE'
    }
  }
  [IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
  $leaf = "StayOpti-V3-17T2-Canary-Handoff-Diagnostic-$stamp-$([Guid]::NewGuid().ToString('N')).log"
  $finalPath = Join-Path $targetDirectory $leaf
  $temporaryPath = "$finalPath.tmp"
  $lines = @(
    "TIMESTAMP_UTC=$((Get-Date).ToUniversalTime().ToString('o'))",
    "HEAD=$ObservedHead",
    "MANIFEST_HASH=$ExpectedManifestHash",
    "RUNNER_BUNDLE_HASH=$ObservedBundleHash",
    'STAGE=CANARY',
    "LAST_COMPLETED_STEP=$LastCompletedStep",
    "FAILED_COMMAND=$CurrentCommand",
    "FAILURE_CLASSIFICATION=$FailureClassification",
    "EXCEPTION_TYPE=$SanitizedExceptionType",
    "RESULT_CODE=$ResultCode",
    "HANDOFF_RESULT=$(if ($ResultCode -eq 0) { 'PASS' } else { 'FAIL' })",
    "CANARY_RESULT=$CanaryResult",
    "COLLECTION_RESULT=$CollectionResult",
    "EVIDENCE_RESULT=$EvidenceResult",
    "EVIDENCE_ZIP_FOUND=$(if ($EvidenceZipFound) { 'YES' } else { 'NO' })",
    "ACTUAL_REQUESTS_TRANSMITTED=$ActualRequestsTransmitted",
    "API_KEY_PROMPT_REACHED=$(if ($ApiKeyPromptReached) { 'YES' } else { 'NO' })",
    "SERPAPI_CALLS_CONFIRMED_BY_RUNNER=$ActualRequestsTransmitted"
  )
  [IO.File]::WriteAllText($temporaryPath, ($lines -join "`r`n") + "`r`n", [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporaryPath -Destination $finalPath
  $script:DiagnosticLogPath = $finalPath
}

try {
  if ($OfflineTestMode -and -not $HandoffPreflightOnly -and $InjectedFailure -ne 'EMPTY_KEY') {
    throw 'STAYOPTI_T1C_OFFLINE_TEST_REQUIRES_PREFLIGHT_ONLY'
  }
  if (($InjectedFailure -ne 'NONE' -or $SkipFinalPause -or -not [string]::IsNullOrWhiteSpace($DiagnosticDirectory)) -and -not $OfflineTestMode) {
    throw 'STAYOPTI_T1C_TEST_CONTROLS_PROHIBITED'
  }
  Set-StayOptiStep 'REPOSITORY_CHECKPOINT'
  Set-Location -LiteralPath $RepositoryRoot
  $ObservedHead = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'STAYOPTI_T1C_HEAD_UNAVAILABLE' }
  $observedBranch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or $observedBranch -ne $ExpectedBranch) { throw 'STAYOPTI_T1C_BRANCH_MISMATCH' }
  $parent = (& git rev-parse "$ObservedHead^").Trim()
  $gateParent = (& git rev-parse "$GateCommitSha^").Trim()
  if ($LASTEXITCODE -ne 0 -or $gateParent -ne $SourceSha) { throw 'STAYOPTI_T2C_SOURCE_GATE_CHAIN_MISMATCH' }
  & git merge-base --is-ancestor $GateCommitSha $ObservedHead
  if ($LASTEXITCODE -ne 0) { throw 'STAYOPTI_T2C_EXECUTION_HEAD_NOT_DESCENDED_FROM_GATE' }
  $ExpectedNewCanaryLiteral = "AUTHORIZE_V3_17T2C_MAX2_SOURCE_SHA_${SourceSha}_EXECUTION_HEAD_${ObservedHead}_MANIFEST_${ExpectedManifestHash}_RUNNER_${ExpectedRunnerBundleHash}_MAIN1_DETAIL1_SESSIONS1_CONCURRENCY1_RETRIES0_PAGINATION0_QUARANTINE_AES256GCM_DPAPI_CURRENTUSER_AUTOSTOP_REMAINING_NO"
  Invoke-StayOptiInjectedFailure 'HEAD' 'STAYOPTI_T1C_HEAD_MISMATCH'
  if (@(& git diff --cached --name-only).Count -ne 0) { throw 'STAYOPTI_T1C_STAGED_NOT_ZERO' }
  foreach ($operation in @('MERGE_HEAD', 'REBASE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD')) {
    $operationPath = (& git rev-parse --git-path $operation).Trim()
    if (Test-Path -LiteralPath $operationPath) { throw 'STAYOPTI_T1C_GIT_OPERATION_IN_PROGRESS' }
  }
  Complete-StayOptiStep

  Set-StayOptiStep 'DIRTY_PATH_INTEGRITY'
  $observedDirty = @(& git status --porcelain=v1 --untracked-files=all)
  if ($observedDirty.Count -ne 0) { throw 'STAYOPTI_T1C_DIRTY_SET_MISMATCH' }
  Invoke-StayOptiInjectedFailure 'DIRTY' 'STAYOPTI_T1C_DIRTY_CONTENT_MISMATCH'
  Complete-StayOptiStep

  Set-StayOptiStep 'PROTECTED_FILE_INTEGRITY'
  foreach ($relativePath in @('package.json', 'package-lock.json')) {
    & git ls-files --error-unmatch -- $relativePath *> $null
    if ($LASTEXITCODE -ne 0) { throw 'STAYOPTI_T1C_PROTECTED_FILE_MISMATCH' }
    & git diff --quiet HEAD -- $relativePath
    if ($LASTEXITCODE -ne 0) {
      throw 'STAYOPTI_T1C_PROTECTED_FILE_MISMATCH'
    }
  }
  Complete-StayOptiStep

  Set-StayOptiStep 'RUNNER_BUNDLE_HASH'
  $node = (Get-Command node -ErrorAction Stop).Source
  $bundleProgram = "import { computeV317T2RunnerBundleHash } from './scripts/run-v3-17t2-serpapi-google-hotels-pilot.mjs'; process.stdout.write(computeV317T2RunnerBundleHash(process.cwd()));"
  $ObservedBundleHash = (& $node --input-type=module -e $bundleProgram).Trim()
  if ($LASTEXITCODE -ne 0 -or $ObservedBundleHash -ne $ExpectedRunnerBundleHash) { throw 'STAYOPTI_T1C_RUNNER_BUNDLE_HASH_MISMATCH' }
  Invoke-StayOptiInjectedFailure 'BUNDLE' 'STAYOPTI_T1C_RUNNER_BUNDLE_HASH_MISMATCH'
  Complete-StayOptiStep

  Set-StayOptiStep 'TYPESCRIPT_TEMP_COMPILE'
  [IO.Directory]::CreateDirectory($CompiledRoot) | Out-Null
  $compileOutput = @(& $node $TypeScript -p (Join-Path $RepositoryRoot 'tsconfig.tests.json') --outDir $CompiledRoot 2>&1)
  if ($LASTEXITCODE -ne 0) { throw 'STAYOPTI_T1C_TYPESCRIPT_COMPILE_FAILED' }
  Invoke-StayOptiInjectedFailure 'COMPILE' 'STAYOPTI_T1C_TYPESCRIPT_COMPILE_FAILED'
  [IO.File]::WriteAllText((Join-Path $CompiledRoot 'package.json'), "{`r`n  `"type`": `"commonjs`"`r`n}`r`n", [Text.UTF8Encoding]::new($false))
  Complete-StayOptiStep

  Set-StayOptiStep 'COMPILED_CONTRACT_INSPECTION'
  $gateModule = Join-Path $CompiledRoot 'src\engine-v3\evaluation\serpApiGoogleHotelsPilotGateV3.js'
  $stageModule = Join-Path $CompiledRoot 'src\engine-v3\evaluation\serpApiGoogleHotelsPilotStageV3.js'
  $inspectionProgram = "const gate=require(process.argv[1]);const stage=require(process.argv[2]);const head=process.argv[3];process.stdout.write(JSON.stringify({manifestHash:gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_HASH_V3,bundleHash:gate.STAYOPTI_SERPAPI_PILOT_RUNNER_BUNDLE_HASH_V3,literal:gate.createSerpApiT2CRequiredAuthorizationLiteralV3(head),revokedCanary:gate.STAYOPTI_SERPAPI_REVOKED_CANARY_AUTHORIZATION_LITERALS_V3,revokedMax48:gate.STAYOPTI_SERPAPI_REVOKED_MAX48_AUTHORIZATION_LITERAL_V3,sessionId:gate.STAYOPTI_SERPAPI_PILOT_MANIFEST_V3.sessions[0].sessionId,indexes:stage.stageSessionIndexesV3('CANARY',12),cap:stage.stageRequestCapV3('CANARY'),policy:stage.STAYOPTI_SERPAPI_T2B_MAX2_STAGE_POLICY_V3,source:gate.STAYOPTI_SERPAPI_T2B_SOURCE_SHA_V3}));"
  $contractJson = & $node -e $inspectionProgram $gateModule $stageModule $ObservedHead
  if ($LASTEXITCODE -ne 0) { throw 'STAYOPTI_T1C_CONTRACT_INSPECTION_FAILED' }
  $contract = $contractJson | ConvertFrom-Json
  if ($contract.manifestHash -ne $ExpectedManifestHash) { throw 'STAYOPTI_T1C_MANIFEST_HASH_MISMATCH' }
  Invoke-StayOptiInjectedFailure 'MANIFEST' 'STAYOPTI_T1C_MANIFEST_HASH_MISMATCH'
  if ($contract.bundleHash -ne $ExpectedRunnerBundleHash -or $contract.literal -cne $ExpectedNewCanaryLiteral) { throw 'STAYOPTI_T1C_LITERAL_MISMATCH' }
  if ($contract.source -ne $SourceSha -or $contract.policy.maximumTotalRequests -ne 2 -or
      $contract.policy.mainSearchMaximum -ne 1 -or $contract.policy.propertyDetailMaximum -ne 1 -or
      $contract.policy.sessionsMaximum -ne 1 -or $contract.policy.maximumConcurrency -ne 1 -or
      $contract.policy.retryBudget -ne 0 -or $contract.policy.paginationBudget -ne 0 -or
      -not $contract.policy.autostop -or $contract.policy.remainingStageAuthorized -or
      $contract.policy.automaticGoldenAdmission -or -not $contract.policy.encryptedPrivateQuarantineRequired) {
    throw 'STAYOPTI_T2B_MAX2_POLICY_MISMATCH'
  }
  foreach ($revokedLiteral in $ExpectedRevokedCanaryLiterals) {
    if ($contract.revokedCanary -notcontains $revokedLiteral) { throw 'STAYOPTI_T1C_REVOCATION_MISMATCH' }
  }
  if ($contract.revokedMax48 -cne $ExpectedRevokedMax48Literal) { throw 'STAYOPTI_T1C_REVOCATION_MISMATCH' }
  if ($contract.sessionId -ne $ExpectedCanarySession -or $contract.indexes.Count -ne 1 -or $contract.indexes[0] -ne $ExpectedCanaryIndex -or $contract.cap -ne $ExpectedCanaryCap) {
    throw 'STAYOPTI_T1C_CANARY_CONTRACT_MISMATCH'
  }
  Invoke-StayOptiInjectedFailure 'LITERAL' 'STAYOPTI_T1C_LITERAL_MISMATCH'
  Complete-StayOptiStep

  Set-StayOptiStep 'NODE_RUNNER_PREFLIGHT'
  $runnerOutput = @(& $node $NodeRunner '--stage=CANARY' "--authorization=$ExpectedNewCanaryLiteral" "--expected-head=$ObservedHead" "--compiled-root=$CompiledRoot" '--authorize-retention-policy' '--single-stage-max-2' '--preflight-only' 2>&1)
  if ($LASTEXITCODE -ne 0 -or ($runnerOutput -join "`n") -notmatch '"status":"PREFLIGHT_VALID"') { throw 'STAYOPTI_T1C_NODE_RUNNER_PREFLIGHT_FAILED' }
  Invoke-StayOptiInjectedFailure 'RUNNER_PREFLIGHT' 'STAYOPTI_T1C_NODE_RUNNER_PREFLIGHT_FAILED'
  Complete-StayOptiStep

  $downloads = Join-Path $env:USERPROFILE 'Downloads'
  $evidenceZipPath = Join-Path $downloads ("StayOpti-V3-17T2-Canary-Evidence-$((Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss'))-$([Guid]::NewGuid().ToString('N')).zip")

  Set-StayOptiStep 'POWERSHELL_LAUNCHER_PREFLIGHT'
  $launcherOutput = @(& $PowerShell51 -NoLogo -NoProfile -ExecutionPolicy Bypass -File $PilotLauncher -Stage 'CANARY' -AuthorizationLiteral $ExpectedNewCanaryLiteral -ExpectedHead $ObservedHead -CompiledRoot $CompiledRoot -EvidenceZipPath $evidenceZipPath -HandoffPreflightOnly 2>&1)
  if ($LASTEXITCODE -ne 0 -or ($launcherOutput -join "`n") -notmatch 'READY_FOR_SECURE_KEY_PROMPT=YES') { throw 'STAYOPTI_T1C_POWERSHELL_LAUNCHER_PREFLIGHT_FAILED' }
  Invoke-StayOptiInjectedFailure 'LAUNCHER_PREFLIGHT' 'STAYOPTI_T1C_POWERSHELL_LAUNCHER_PREFLIGHT_FAILED'
  Complete-StayOptiStep

  if ($HandoffPreflightOnly) {
    'READY_FOR_SECURE_KEY_PROMPT=YES'
    'AUTHORIZATION_CONSUMED=NO'
    'CREDENTIALS_LOADED=NO'
    'SERPAPI_CALLS_CONFIRMED_BY_RUNNER=0'
    $ResultCode = 0
  }
  else {
    if ([string]::IsNullOrWhiteSpace($AuthorizationLiteral) -or $AuthorizationLiteral -cne $ExpectedNewCanaryLiteral) { throw 'STAYOPTI_T1C_LITERAL_MISMATCH' }
    Set-StayOptiStep 'SECURE_KEY_PROMPT'
    $ApiKeyPromptReached = $true
    if ($OfflineTestMode -and $InjectedFailure -eq 'EMPTY_KEY') { throw 'STAYOPTI_T1C_API_KEY_MISSING' }
    $SecureKey = Read-Host 'SerpApi API key' -AsSecureString
    $UnmanagedSecret = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureKey)
    $PlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($UnmanagedSecret)
    if ([string]::IsNullOrWhiteSpace($PlainKey)) { throw 'STAYOPTI_T1C_API_KEY_MISSING' }
    [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $PlainKey, 'Process')
    Complete-StayOptiStep

    Set-StayOptiStep 'CANARY_LAUNCHER_EXECUTION'
    $executionOutput = @(& $PowerShell51 -NoLogo -NoProfile -ExecutionPolicy Bypass -File $PilotLauncher -Stage 'CANARY' -AuthorizationLiteral $ExpectedNewCanaryLiteral -ExpectedHead $ObservedHead -CompiledRoot $CompiledRoot -EvidenceZipPath $evidenceZipPath -UseProcessEnvironmentCredential 2>&1)
    $launcherResultCode = $LASTEXITCODE
    $EvidenceZipFound = Test-Path -LiteralPath $evidenceZipPath -PathType Leaf
    if ($EvidenceZipFound) {
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      $archive = [IO.Compression.ZipFile]::OpenRead($evidenceZipPath)
      try {
        $summaryEntry = $archive.GetEntry('pilot-summary.json')
        if ($null -eq $summaryEntry) { throw 'STAYOPTI_T1C_EVIDENCE_SUMMARY_MISSING' }
        $reader = New-Object IO.StreamReader($summaryEntry.Open(), [Text.Encoding]::UTF8)
        try { $summary = $reader.ReadToEnd() | ConvertFrom-Json }
        finally { $reader.Dispose() }
        $ActualRequestsTransmitted = [int]$summary.actualRequestsTransmitted
        if ($summary.status -eq 'COMPLETED') {
          $CanaryResult = 'PASS'
          $CollectionResult = 'COMPLETE'
          $FailureClassification = 'NONE'
        }
        elseif ($summary.status -eq 'ABORTED') {
          $CanaryResult = 'ABORTED'
          $CollectionResult = if ([int]$summary.mainSearchCount -eq 1) { 'PARTIAL' } else { 'FAIL' }
          $FailureClassification = [string]$summary.failureClassification
        }
        else {
          $CanaryResult = 'FAIL'
          $CollectionResult = 'FAIL'
          $FailureClassification = 'STAYOPTI_T2B_CANARY_RESULT_INVALID'
        }
        $EvidenceResult = 'PASS'
      }
      finally { $archive.Dispose() }
    }
    if ($launcherResultCode -ne 0) { throw "STAYOPTI_T1C_LAUNCHER_FAILED_$launcherResultCode" }
    if (-not $EvidenceZipFound) { throw 'STAYOPTI_T1C_EVIDENCE_ZIP_MISSING' }
    Complete-StayOptiStep
    $ResultCode = 0
  }
}
catch {
  $FailureClassification = Get-SanitizedFailureClassification -Failure $_
  $SanitizedExceptionType = if ($_.Exception) { $_.Exception.GetType().FullName } else { 'System.Management.Automation.RuntimeException' }
  $ResultCode = 1
}
finally {
  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $null, 'Process')
  $PlainKey = $null
  if ($UnmanagedSecret -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($UnmanagedSecret)
    $UnmanagedSecret = [IntPtr]::Zero
  }
  if ($null -ne $SecureKey) { $SecureKey.Dispose(); $SecureKey = $null }
  Remove-StayOptiHandoffWorkRoot
  try { Write-StayOptiDiagnosticLog }
  catch { $DiagnosticLogPath = 'DIAGNOSTIC_LOG_WRITE_FAILED' }
  "HANDOFF_RESULT=$(if ($ResultCode -eq 0) { 'PASS' } else { 'FAIL' })"
  "CANARY_RESULT=$CanaryResult"
  "COLLECTION_RESULT=$CollectionResult"
  "EVIDENCE_RESULT=$EvidenceResult"
  "RESULT_CODE=$ResultCode"
  "FAILURE_CLASSIFICATION=$FailureClassification"
  "LAST_COMPLETED_STEP=$LastCompletedStep"
  "API_KEY_PROMPT_REACHED=$(if ($ApiKeyPromptReached) { 'YES' } else { 'NO' })"
  "EVIDENCE_ZIP_FOUND=$(if ($EvidenceZipFound) { 'YES' } else { 'NO' })"
  "ACTUAL_REQUESTS_TRANSMITTED=$ActualRequestsTransmitted"
  "SERPAPI_CALLS_CONFIRMED_BY_RUNNER=$ActualRequestsTransmitted"
  "DIAGNOSTIC_LOG_PATH=$DiagnosticLogPath"
  if (-not ($OfflineTestMode -and $SkipFinalPause)) {
    [void](Read-Host 'Premi Invio dopo aver copiato il risultato')
  }
}
