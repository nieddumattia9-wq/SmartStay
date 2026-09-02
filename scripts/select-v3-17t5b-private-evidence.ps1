[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$Dialog = New-Object System.Windows.Forms.OpenFileDialog
$Dialog.Title = 'Seleziona una prova privata (opzionale)'
$Dialog.Filter = 'Immagini o pagine salvate|*.png;*.jpg;*.jpeg;*.webp;*.pdf;*.html;*.htm|Tutti i file|*.*'
$Dialog.Multiselect = $false
$Dialog.CheckFileExists = $true

try {
  if ($Dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::Out.Write($Dialog.FileName)
  }
} finally {
  $Dialog.Dispose()
}
