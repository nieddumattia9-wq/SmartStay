[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDirectory,
  [Parameter(Mandatory = $true)]
  [string]$DestinationZip
)

$ErrorActionPreference = 'Stop'
$Source = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $SourceDirectory).Path).TrimEnd('\')
$Destination = [IO.Path]::GetFullPath($DestinationZip)
if (Test-Path -LiteralPath $Destination) { throw 'MANUAL_CAPTURE_EVIDENCE_ZIP_EXISTS' }
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Destination)) | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Source, $Destination, [IO.Compression.CompressionLevel]::Optimal, $false)

$Archive = [IO.Compression.ZipFile]::OpenRead($Destination)
try {
  if ($Archive.Entries.Count -lt 2) { throw 'MANUAL_CAPTURE_EVIDENCE_ZIP_INCOMPLETE' }
  [Console]::Out.Write([string]$Archive.Entries.Count)
} finally {
  $Archive.Dispose()
}
