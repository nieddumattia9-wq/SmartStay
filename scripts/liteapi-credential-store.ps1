# Local credential store @1. No provider I/O, acquisition state or environment secrets.
# Dot sourcing defines functions only. In particular it never reads a credential.
function Assert-StayOptiCredentialPlatform {
 if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5 -or $PSVersionTable.PSVersion.Minor -ne 1){throw 'CREDENTIAL_POWERSHELL_51_REQUIRED'}
 # A parent PowerShell 7 can leave its module path in the child environment.
 # Load the actual Windows 5.1 built-in, without editing PSModulePath or profiles.
 Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
}
function Get-StayOptiCredentialBase {
 # KnownFolder is not a caller-selected repository/custody destination.
 $local=[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
 if([string]::IsNullOrWhiteSpace($local)){throw 'CREDENTIAL_LOCALAPPDATA_UNAVAILABLE'}
 return (Join-Path $local 'StayOpti\credentials\liteapi')
}
function Assert-StayOptiCredentialPath([string]$Path) {
 $part=[IO.Path]::GetFullPath($Path)
 while($part){
  if(Test-Path -LiteralPath $part){
   if(((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'CREDENTIAL_LINK_NOT_ALLOWED'}
  }
  $parent=[IO.Path]::GetDirectoryName($part);if($parent -eq $part){break};$part=$parent
 }
}
function New-StayOptiCredentialAcl([bool]$Directory) {
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
 if($Directory){$acl=New-Object Security.AccessControl.DirectorySecurity}else{$acl=New-Object Security.AccessControl.FileSecurity}
 $acl.SetOwner($sid);$acl.SetAccessRuleProtection($true,$false)
 $inherit=if($Directory){[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'}else{[Security.AccessControl.InheritanceFlags]::None}
 foreach($who in @($sid,(New-Object Security.Principal.SecurityIdentifier('S-1-5-18')))){
  $rule=New-Object Security.AccessControl.FileSystemAccessRule($who,[Security.AccessControl.FileSystemRights]::FullControl,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
  $acl.AddAccessRule($rule)
 }
 return $acl
}
function Assert-StayOptiCredentialAcl([string]$Path) {
 Assert-StayOptiCredentialPath $Path
 $acl=Get-Acl -LiteralPath $Path
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid -or -not $acl.AreAccessRulesProtected){throw 'CREDENTIAL_PERMISSIONS_UNSAFE'}
 $ownerAllowed=$false
 foreach($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){
  if($rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or $rule.IdentityReference.Value -notin @($sid,'S-1-5-18')){throw 'CREDENTIAL_PERMISSIONS_UNSAFE'}
  if($rule.IdentityReference.Value -eq $sid -and ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl){$ownerAllowed=$true}
 }
 if(-not $ownerAllowed){throw 'CREDENTIAL_PERMISSIONS_UNSAFE'}
}
function Get-StayOptiCredentialLocation {
 param([ValidateSet('Production','Sandbox')][string]$Profile='Production',[switch]$Create)
 Assert-StayOptiCredentialPlatform
 $base=Get-StayOptiCredentialBase
 $dir=Join-Path $base $Profile
 Assert-StayOptiCredentialPath $dir
 if(-not (Test-Path -LiteralPath $dir)){
  if(-not $Create){throw 'CREDENTIAL_NOT_CONFIGURED: eseguire manage-liteapi-credential.ps1 -Mode Configure -Profile Production (o il profilo richiesto).'}
  # Create the final directory with its restrictive ACL, before any ciphertext.
  [void][IO.Directory]::CreateDirectory($dir,(New-StayOptiCredentialAcl $true))
 }
 Assert-StayOptiCredentialAcl $dir
 return @{Directory=$dir;File=(Join-Path $dir 'private-api-key.dpapi');Profile=$Profile}
}
function Open-StayOptiCredentialLock($Location) {
 $lock=Join-Path $Location.Directory 'operation.lock'
 Assert-StayOptiCredentialPath $lock
 if(Test-Path -LiteralPath $lock){Assert-StayOptiCredentialAcl $lock}
 try {
  $stream=New-Object IO.FileStream($lock,[IO.FileMode]::OpenOrCreate,[Security.AccessControl.FileSystemRights]::FullControl,[IO.FileShare]::None,4096,[IO.FileOptions]::DeleteOnClose,(New-StayOptiCredentialAcl $false))
  return $stream
 }catch{throw 'CREDENTIAL_BUSY_OR_LOCK_DENIED: nessun retry automatico.'}
}
function ConvertTo-StayOptiCredentialBytes([Security.SecureString]$Secure) {
 if($null -eq $Secure -or $Secure.Length -eq 0 -or $Secure.Length -gt 16000){throw 'CREDENTIAL_EMPTY_OR_INVALID'}
 $ptr=[IntPtr]::Zero;$bytes=$null
 try {
  $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  $bytes=New-Object byte[] ($Secure.Length*2)
  [Runtime.InteropServices.Marshal]::Copy($ptr,$bytes,0,$bytes.Length)
  $nonSpace=$false
  for($i=0;$i -lt $bytes.Length;$i+=2){
   $char=[char]([int]$bytes[$i]+256*[int]$bytes[$i+1])
   if([char]::IsControl($char)){throw 'CREDENTIAL_EMPTY_OR_INVALID'}
   if(-not [char]::IsWhiteSpace($char)){$nonSpace=$true}
  }
  if(-not $nonSpace){throw 'CREDENTIAL_EMPTY_OR_INVALID'}
  return ,$bytes
 }catch{if($null -ne $bytes){[Array]::Clear($bytes,0,$bytes.Length)};throw}
 finally{if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}}
}
function Get-StayOptiCredentialEntropy([string]$Profile) {
 return ,[Text.Encoding]::UTF8.GetBytes('stayopti.liteapi-private-api-key@1/'+$Profile.ToLowerInvariant())
}
function Get-StayOptiLiteApiCredential {
 param([ValidateSet('Production','Sandbox')][string]$Profile='Production')
 $loc=Get-StayOptiCredentialLocation -Profile $Profile
 $lock=$null;$clear=$null;$secure=$null
 try {
  $lock=Open-StayOptiCredentialLock $loc
  if(-not (Test-Path -LiteralPath $loc.File)){throw 'CREDENTIAL_NOT_CONFIGURED: configurare la chiave nel profilo richiesto.'}
  Assert-StayOptiCredentialAcl $loc.File
  if((Get-Item -LiteralPath $loc.File).Length -gt 131072){throw 'CREDENTIAL_CORRUPT_OR_UNREADABLE: sostituire esplicitamente la chiave.'}
  try {
   Add-Type -AssemblyName System.Security
   $clear=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($loc.File),(Get-StayOptiCredentialEntropy $Profile),[Security.Cryptography.DataProtectionScope]::CurrentUser)
   if($clear.Length -eq 0 -or $clear.Length%2 -ne 0 -or $clear.Length -gt 32000){throw 'INVALID'}
   $secure=New-Object Security.SecureString
   for($i=0;$i -lt $clear.Length;$i+=2){$secure.AppendChar([char]([int]$clear[$i]+256*[int]$clear[$i+1]))}
   $probe=ConvertTo-StayOptiCredentialBytes $secure
   [Array]::Clear($probe,0,$probe.Length)
   $secure.MakeReadOnly()
  }catch{if($null -ne $secure){$secure.Dispose()};throw 'CREDENTIAL_CORRUPT_OR_UNREADABLE: file indecifrabile per questo utente/profilo; usare Replace, senza retry.'}
  return $secure
 }finally{if($null -ne $clear){[Array]::Clear($clear,0,$clear.Length)};if($null -ne $lock){$lock.Dispose()}}
}
function Invoke-StayOptiCredentialManagement {
 param([ValidateSet('Configure','Replace','Remove')][string]$Mode,[ValidateSet('Production','Sandbox')][string]$Profile='Production')
 $loc=Get-StayOptiCredentialLocation -Profile $Profile -Create:($Mode -eq 'Configure')
 $lock=$null;$secure=$null;$clear=$null;$temp=$null;$fileStream=$null
 try {
  $lock=Open-StayOptiCredentialLock $loc
  $exists=Test-Path -LiteralPath $loc.File
  if($exists){Assert-StayOptiCredentialAcl $loc.File}
  if($Mode -eq 'Configure' -and $exists){throw 'CREDENTIAL_ALREADY_EXISTS: Configure non sovrascrive; usare Replace.'}
  if($Mode -ne 'Configure' -and -not $exists){throw 'CREDENTIAL_NOT_CONFIGURED: nessuna chiave da sostituire o rimuovere.'}
  if($Mode -eq 'Remove'){
   # Exact credential file only: never directories, journals, markers or results.
   [IO.File]::Delete($loc.File)
   if(Test-Path -LiteralPath $loc.File){throw 'CREDENTIAL_REMOVE_INCOMPLETE'}
   Write-Output ('CREDENTIAL_REMOVED='+$Profile+'; revoca provider e cancellazione sicura dei backup non eseguite.');return
  }
  $secure=Read-Host ('LiteAPI '+$Profile+' Private API Key (input non visibile; salvataggio DPAPI CurrentUser)') -AsSecureString
  $clear=ConvertTo-StayOptiCredentialBytes $secure
  Add-Type -AssemblyName System.Security
  $encrypted=[Security.Cryptography.ProtectedData]::Protect($clear,(Get-StayOptiCredentialEntropy $Profile),[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Array]::Clear($clear,0,$clear.Length);$clear=$null
  $temp=Join-Path $loc.Directory ([Guid]::NewGuid().ToString('N')+'.dpapi.tmp')
  $fileStream=New-Object IO.FileStream($temp,[IO.FileMode]::CreateNew,[Security.AccessControl.FileSystemRights]::FullControl,[IO.FileShare]::None,4096,[IO.FileOptions]::WriteThrough,(New-StayOptiCredentialAcl $false))
  $fileStream.Write($encrypted,0,$encrypted.Length);$fileStream.Flush($true);$fileStream.Dispose();$fileStream=$null
  Assert-StayOptiCredentialPath $loc.File
  # PS5.1 coerces $null to an empty string for this overload: explicitly pass
  # a null string to avoid an unintended backup path while retaining atomicity.
  if($Mode -eq 'Replace'){[IO.File]::Replace($temp,$loc.File,[NullString]::Value)}else{[IO.File]::Move($temp,$loc.File)}
  $temp=$null
  Assert-StayOptiCredentialAcl $loc.File
  Write-Output ('CREDENTIAL_STORED_DPAPI_CURRENT_USER='+$Profile+'; VALIDITY_NOT_TESTED; PROVIDER_REQUESTS=0')
 }finally{
  if($null -ne $fileStream){$fileStream.Dispose()}
  if($null -ne $clear){[Array]::Clear($clear,0,$clear.Length)}
  if($null -ne $secure){$secure.Dispose()}
  if($null -ne $temp -and [IO.File]::Exists($temp)){[IO.File]::Delete($temp)}
  if($null -ne $lock){$lock.Dispose()}
 }
}
