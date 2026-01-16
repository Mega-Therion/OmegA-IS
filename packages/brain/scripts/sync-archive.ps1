param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$ArchiveDir = "$ProjectRoot\archive"
)

Set-Location $ProjectRoot
$env:ARCHIVE_DIR = $ArchiveDir
node scripts\export-supabase.js

