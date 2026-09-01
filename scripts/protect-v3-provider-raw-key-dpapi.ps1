[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Protect', 'Unprotect')]
  [string]$Mode
)

$ErrorActionPreference = 'Stop'
$InputBytes = $null
$OutputBytes = $null
$Entropy = $null

try {
  Add-Type -AssemblyName System.Security
  $EncodedInput = [Console]::In.ReadLine()
  if ([string]::IsNullOrWhiteSpace($EncodedInput)) {
    throw 'PROVIDER_RAW_DPAPI_INPUT_REQUIRED'
  }
  $InputBytes = [Convert]::FromBase64String($EncodedInput)
  $Entropy = [Text.Encoding]::UTF8.GetBytes('stayopti.v3.provider-raw-quarantine.dpapi@1')
  if ($Mode -ceq 'Protect') {
    $OutputBytes = [Security.Cryptography.ProtectedData]::Protect(
      $InputBytes,
      $Entropy,
      [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
  } else {
    $OutputBytes = [Security.Cryptography.ProtectedData]::Unprotect(
      $InputBytes,
      $Entropy,
      [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
  }
  [Console]::Out.Write([Convert]::ToBase64String($OutputBytes))
} catch {
  [Console]::Error.Write('PROVIDER_RAW_DPAPI_OPERATION_FAILED')
  exit 1
} finally {
  if ($null -ne $InputBytes) { [Array]::Clear($InputBytes, 0, $InputBytes.Length) }
  if ($null -ne $OutputBytes) { [Array]::Clear($OutputBytes, 0, $OutputBytes.Length) }
  if ($null -ne $Entropy) { [Array]::Clear($Entropy, 0, $Entropy.Length) }
}
