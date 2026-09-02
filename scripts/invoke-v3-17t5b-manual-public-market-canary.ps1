[CmdletBinding()]
param(
  [ValidateSet('preflight','dry-run','interactive')]
  [string]$Mode = 'preflight',
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedExecutionHead
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$CompilationRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T5B-Compile-' + [Guid]::NewGuid().ToString('N'))
$LocalData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
$PrivateRoot = Join-Path $LocalData 'StayOpti\private-evidence\manual-market-golden-capture'
$SyntheticPrivateRoot = $null
if ($Mode -cne 'interactive') {
  $SyntheticPrivateRoot = Join-Path ([IO.Path]::GetTempPath()) ('StayOpti-V3-17T5B-Preflight-' + [Guid]::NewGuid().ToString('N'))
  $PrivateRoot = $SyntheticPrivateRoot
}

try {
  Push-Location -LiteralPath $RepositoryRoot
  try {
    $ObservedBranch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $ObservedBranch -cne 'main') { throw 'MANUAL_CAPTURE_BRANCH_MISMATCH' }
    $ObservedHead = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $ObservedHead -cne $ExpectedExecutionHead) { throw 'MANUAL_CAPTURE_HEAD_MISMATCH' }
    $Staged = @(& git diff --cached --name-only)
    if ($LASTEXITCODE -ne 0 -or $Staged.Count -ne 0) { throw 'MANUAL_CAPTURE_STAGED_STATE_REJECTED' }

    [IO.Directory]::CreateDirectory($CompilationRoot) | Out-Null
    & node node_modules/typescript/bin/tsc -p tsconfig.tests.json --outDir $CompilationRoot
    if ($LASTEXITCODE -ne 0) { throw 'MANUAL_CAPTURE_TYPESCRIPT_COMPILE_FAILED' }
    [IO.File]::WriteAllText((Join-Path $CompilationRoot 'package.json'), "{`r`n  `"type`": `"commonjs`"`r`n}`r`n", [Text.UTF8Encoding]::new($false))

    $Arguments = @(
      (Join-Path $RepositoryRoot 'scripts\run-v3-17t5b-manual-public-market-canary.mjs'),
      "--mode=$Mode",
      "--repository-root=$RepositoryRoot",
      "--compiled-root=$CompilationRoot",
      "--private-root=$PrivateRoot"
    )
    & node @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'MANUAL_CAPTURE_RUNNER_FAILED' }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path -LiteralPath $CompilationRoot) {
    $ResolvedCompilationRoot = [IO.Path]::GetFullPath($CompilationRoot).TrimEnd('\')
    $ResolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if ($ResolvedCompilationRoot.StartsWith($ResolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($ResolvedCompilationRoot).StartsWith('StayOpti-V3-17T5B-Compile-')) {
      Remove-Item -LiteralPath $ResolvedCompilationRoot -Recurse -Force
    }
  }
  if ($null -ne $SyntheticPrivateRoot -and (Test-Path -LiteralPath $SyntheticPrivateRoot)) {
    $ResolvedSyntheticRoot = [IO.Path]::GetFullPath($SyntheticPrivateRoot).TrimEnd('\')
    $ResolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if ($ResolvedSyntheticRoot.StartsWith($ResolvedTemp + '\', [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($ResolvedSyntheticRoot).StartsWith('StayOpti-V3-17T5B-Preflight-')) {
      Remove-Item -LiteralPath $ResolvedSyntheticRoot -Recurse -Force
    }
  }
}

if ($Mode -ceq 'interactive') {
  Write-Host ''
  Write-Host 'La finestra resta aperta. Conserva il percorso Evidence mostrato al termine.'
  Read-Host 'Premi INVIO per chiudere'
}
