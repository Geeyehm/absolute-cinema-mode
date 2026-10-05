# Builds the store upload zip: dist/absolute-cinema-mode-<version>.zip
# Only the files the extension needs at runtime are included (no README, store assets, SVG source or .git).
# Entry names use forward slashes, which the Chrome Web Store requires.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$outDir = Join-Path $root 'dist'
$zipPath = Join-Path $outDir "absolute-cinema-mode-$($manifest.version).zip"

$files = @('manifest.json') +
  (Get-ChildItem (Join-Path $root 'src') -File | ForEach-Object { "src/$($_.Name)" }) +
  (Get-ChildItem (Join-Path $root 'popup') -File | ForEach-Object { "popup/$($_.Name)" }) +
  (Get-ChildItem (Join-Path $root 'changelog') -File | ForEach-Object { "changelog/$($_.Name)" }) +
  (Get-ChildItem (Join-Path $root 'icons') -Filter 'icon-*.png' | ForEach-Object { "icons/$($_.Name)" })

New-Item -ItemType Directory -Force $outDir | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($file in $files) {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $file), $file) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Write-Host "Built $zipPath"
$files | ForEach-Object { Write-Host "  $_" }
