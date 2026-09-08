param(
  [Parameter(Mandatory = $true)][string]$ArchivePath,
  [Parameter(Mandatory = $true)][string]$ExpectedSha256,
  [Parameter(Mandatory = $true)][string]$ExtractionRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Stop-WithCode([string]$Code) {
  throw [InvalidOperationException]::new($Code)
}

function Test-SafeArchiveName([string]$Name) {
  if ([String]::IsNullOrWhiteSpace($Name) -or $Name.Length -gt 240) { return $false }
  if ($Name -match '[\\\x00-\x1f\x7f:<>"|?*]' -or $Name.StartsWith('/')) { return $false }
  foreach ($Part in $Name.Split('/')) {
    if ([String]::IsNullOrEmpty($Part) -or $Part -eq '.' -or $Part -eq '..' -or $Part -cne $Part.Trim() -or $Part -match '[. ]$') { return $false }
    if ($Part -match '^(CON|PRN|AUX|NUL|COM[1-9\xB9\xB2\xB3]|LPT[1-9\xB9\xB2\xB3])(\.|$)') { return $false }
  }
  return $true
}

function Get-Sha256([string]$Path) {
  $Stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
  try {
    $Hasher = [Security.Cryptography.SHA256]::Create()
    try {
      return ([BitConverter]::ToString($Hasher.ComputeHash($Stream))).Replace('-', '').ToLowerInvariant()
    } finally { $Hasher.Dispose() }
  } finally { $Stream.Dispose() }
}

$ExtractionCreated = $false
$Extract = $null
try {
  $Archive = [IO.Path]::GetFullPath($ArchivePath)
  $Extract = [IO.Path]::GetFullPath($ExtractionRoot).TrimEnd('\')
  if (-not [IO.File]::Exists($Archive)) { Stop-WithCode 'DOSSIER_ARCHIVE_MISSING' }
  if ([IO.Directory]::Exists($Extract) -or [IO.File]::Exists($Extract)) { Stop-WithCode 'DOSSIER_EXTRACTION_ROOT_ALREADY_EXISTS' }
  if ($ExpectedSha256 -cnotmatch '^[a-f0-9]{64}$') { Stop-WithCode 'DOSSIER_EXPECTED_ARCHIVE_HASH_INVALID' }
  $ObservedArchiveHash = Get-Sha256 $Archive
  if ($ObservedArchiveHash -cne $ExpectedSha256) { Stop-WithCode 'DOSSIER_ARCHIVE_HASH_MISMATCH' }
  if ((Get-Item -LiteralPath $Archive).Length -gt 104857600) { Stop-WithCode 'DOSSIER_ARCHIVE_SIZE_LIMIT_EXCEEDED' }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $Zip = [IO.Compression.ZipFile]::OpenRead($Archive)
  try {
    # Legacy archives may encode path separators as backslashes. Normalize
    # once at the ZIP boundary, then reject traversal and normalized aliases.
    $FileEntries = @($Zip.Entries | Where-Object { -not $_.FullName.Replace('\', '/').EndsWith('/') })
    if ($FileEntries.Count -lt 1 -or $FileEntries.Count -gt 512) { Stop-WithCode 'DOSSIER_ARCHIVE_ENTRY_COUNT_INVALID' }
    $FoldedNames = @{}
    $FoldedDirectories = @{}
    [long]$TotalBytes = 0
    foreach ($Entry in $Zip.Entries) {
      $Name = $Entry.FullName.Replace('\', '/')
      $IsDirectory = $Name.EndsWith('/')
      if ($IsDirectory) { $Name = $Name.TrimEnd('/') }
      if (-not (Test-SafeArchiveName $Name)) { Stop-WithCode 'DOSSIER_ARCHIVE_PATH_UNSAFE' }
      if ($IsDirectory) {
        $Folded = $Name.ToLowerInvariant()
        if ($FoldedDirectories.ContainsKey($Folded)) { Stop-WithCode 'DOSSIER_ARCHIVE_ENTRY_COLLISION' }
        $FoldedDirectories[$Folded] = $Name
      }
    }
    foreach ($Entry in $FileEntries) {
      $Name = $Entry.FullName.Replace('\', '/')
      if (-not (Test-SafeArchiveName $Name)) { Stop-WithCode 'DOSSIER_ARCHIVE_PATH_UNSAFE' }
      $Folded = $Name.ToLowerInvariant()
      if ($FoldedNames.ContainsKey($Folded)) { Stop-WithCode 'DOSSIER_ARCHIVE_ENTRY_COLLISION' }
      $FoldedNames[$Folded] = $true
      if ($FoldedDirectories.ContainsKey($Folded)) { Stop-WithCode 'DOSSIER_ARCHIVE_FILE_DIRECTORY_COLLISION' }
      if ($Entry.Length -gt 26214400) { Stop-WithCode 'DOSSIER_ARCHIVE_ENTRY_SIZE_LIMIT_EXCEEDED' }
      $TotalBytes += $Entry.Length
      if ($TotalBytes -gt 262144000) { Stop-WithCode 'DOSSIER_ARCHIVE_EXPANDED_SIZE_LIMIT_EXCEEDED' }
    }
    foreach ($Name in @($FoldedNames.Keys) + @($FoldedDirectories.Keys)) {
      $Parts = $Name.Split('/')
      for ($Index = 1; $Index -lt $Parts.Length; $Index++) {
        $Prefix = [String]::Join('/', $Parts[0..($Index - 1)])
        if ($FoldedNames.ContainsKey($Prefix)) { Stop-WithCode 'DOSSIER_ARCHIVE_FILE_DIRECTORY_COLLISION' }
      }
    }

    [IO.Directory]::CreateDirectory($Extract) | Out-Null
    $ExtractionCreated = $true
    $ResultEntries = @()
    foreach ($Entry in $FileEntries) {
      $Name = $Entry.FullName.Replace('\', '/')
      $Target = [IO.Path]::GetFullPath((Join-Path $Extract $Name.Replace('/', [IO.Path]::DirectorySeparatorChar)))
      if (-not $Target.StartsWith($Extract + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { Stop-WithCode 'DOSSIER_ARCHIVE_PATH_ESCAPE' }
      $Parent = [IO.Path]::GetDirectoryName($Target)
      [IO.Directory]::CreateDirectory($Parent) | Out-Null
      $InputStream = $Entry.Open()
      try {
        $OutputStream = [IO.File]::Open($Target, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try { $InputStream.CopyTo($OutputStream) } finally { $OutputStream.Dispose() }
      } finally { $InputStream.Dispose() }
      $Timestamp = $null
      if ($Entry.LastWriteTime -ne [DateTimeOffset]::MinValue) { $Timestamp = $Entry.LastWriteTime.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffZ') }
      $ResultEntries += [ordered]@{
        path = $Name
        byteLength = [long](Get-Item -LiteralPath $Target).Length
        sha256 = Get-Sha256 $Target
        archiveTimestamp = $Timestamp
      }
    }
    [ordered]@{
      archiveSha256 = $ObservedArchiveHash
      entries = @($ResultEntries | Sort-Object path)
    } | ConvertTo-Json -Depth 6 -Compress
  } finally {
    $Zip.Dispose()
  }
} catch {
  $FailureCode = 'DOSSIER_ARCHIVE_INDEX_FAILED'
  if ($_.Exception.Message -match '^DOSSIER_[A-Z0-9_]+$') { $FailureCode = $_.Exception.Message }
  # Only this invocation's newly created, resolved extraction path is removable.
  # Existing roots are rejected before mutation and must never be cleaned up.
  if ($ExtractionCreated -and $null -ne $Extract -and [IO.Directory]::Exists($Extract)) {
    Remove-Item -LiteralPath $Extract -Recurse -Force
  }
  [Console]::Error.WriteLine($FailureCode)
  exit 41
}
