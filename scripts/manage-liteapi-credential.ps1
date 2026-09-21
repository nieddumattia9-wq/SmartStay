[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][ValidateSet('Configure','Replace','Remove')][string]$Mode,
 [ValidateSet('Production','Sandbox')][string]$Profile='Production'
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'liteapi-credential-store.ps1')
try { Invoke-StayOptiCredentialManagement -Mode $Mode -Profile $Profile }
catch {
 # Do not print exception internals, locals or an object containing a key.
 $message=$_.Exception.Message
 if($message -notmatch '^CREDENTIAL_[A-Z_]+'){ $message='CREDENTIAL_LOCAL_OPERATION_FAILED: nessuna richiesta provider; controllare accesso locale e riprovare solo esplicitamente.' }
 Write-Error $message -ErrorAction Continue
 exit 1
}
