param(
  [Parameter(Mandatory = $true)]
  [string]$AuthorizationLiteral,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedHead,

  [Parameter(Mandatory = $true)]
  [string]$CompiledRoot,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$secureKey = Read-Host 'SerpApi API key' -AsSecureString
$unmanaged = [IntPtr]::Zero
$plainKey = $null
$priorProcessKey = [Environment]::GetEnvironmentVariable('SERPAPI_API_KEY', 'Process')

try {
  $unmanaged = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($unmanaged)
  if ([string]::IsNullOrWhiteSpace($plainKey)) {
    throw 'SERPAPI_PILOT_API_KEY_MISSING'
  }

  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $plainKey, 'Process')
  $node = (Get-Command node -ErrorAction Stop).Source
  $runnerArguments = @(
    (Join-Path $PSScriptRoot 'run-v3-17t2-serpapi-google-hotels-pilot.mjs'),
    "--authorization=$AuthorizationLiteral",
    "--expected-head=$ExpectedHead",
    "--compiled-root=$CompiledRoot",
    "--output=$OutputPath",
    '--authorize-retention-policy',
    '--single-wave-max-48'
  )
  & $node $runnerArguments
  if ($LASTEXITCODE -ne 0) { throw "SERPAPI_PILOT_CHILD_FAILED_$LASTEXITCODE" }
}
finally {
  [Environment]::SetEnvironmentVariable('SERPAPI_API_KEY', $priorProcessKey, 'Process')
  $plainKey = $null
  if ($unmanaged -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($unmanaged)
  }
  if ($null -ne $secureKey) { $secureKey.Dispose() }
}
