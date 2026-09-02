[CmdletBinding()]
param(
  [ValidateSet('initialize','validate')]
  [string]$Mode = 'initialize',
  [string]$OutputDirectory,
  [string]$InputPath
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$CompilationRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('StayOpti-V3-17T5A-' + [Guid]::NewGuid().ToString('N'))

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $LocalData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
  $OutputDirectory = Join-Path $LocalData ('StayOpti\private-evidence\manual-market-golden-capture\workspace-' + [Guid]::NewGuid().ToString('N'))
}

try {
  [System.IO.Directory]::CreateDirectory($CompilationRoot) | Out-Null
  Push-Location -LiteralPath $RepositoryRoot
  try {
    & node node_modules/typescript/bin/tsc -p tsconfig.tests.json --outDir $CompilationRoot
    if ($LASTEXITCODE -ne 0) { throw 'MANUAL_CAPTURE_TYPESCRIPT_COMPILE_FAILED' }
    [System.IO.File]::WriteAllText((Join-Path $CompilationRoot 'package.json'), "{`r`n  `"type`": `"commonjs`"`r`n}`r`n", [Text.UTF8Encoding]::new($false))
    $Arguments = @(
      (Join-Path $RepositoryRoot 'scripts\run-v3-17t5a-manual-public-market-capture.mjs'),
      "--mode=$Mode",
      "--repository-root=$RepositoryRoot",
      "--compiled-root=$CompilationRoot",
      "--output-directory=$OutputDirectory"
    )
    if (-not [string]::IsNullOrWhiteSpace($InputPath)) { $Arguments += "--input=$InputPath" }
    & node @Arguments
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path -LiteralPath $CompilationRoot) {
    $ResolvedCompilationRoot = [IO.Path]::GetFullPath($CompilationRoot)
    $ResolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($ResolvedCompilationRoot.StartsWith($ResolvedTemp, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($ResolvedCompilationRoot).StartsWith('StayOpti-V3-17T5A-')) {
      Remove-Item -LiteralPath $ResolvedCompilationRoot -Recurse -Force
    }
  }
}
