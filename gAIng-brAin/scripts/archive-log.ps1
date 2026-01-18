# archive-log.ps1
# Rotates log.md to an archive folder and creates a fresh start.

$logFile = "log.md"
$archiveDir = "archive"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveFile = Join-Path $archiveDir "log-archive-$timestamp.md"

if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
    Write-Host "Created archive directory." -ForegroundColor Cyan
}

if (Test-Path $logFile) {
    # Move current log to archive
    Move-Item -Path $logFile -Destination $archiveFile
    Write-Host "Archived $logFile to $archiveFile" -ForegroundColor Green

    # Start a fresh log with the header
    $header = @"
# 🧠 The Block (Continuous Log)
## Session Start: $(Get-Date)
---
"@
    Set-Content -Path $logFile -Value $header
    Write-Host "Started fresh log.md" -ForegroundColor Green
} else {
    Write-Host "log.md not found. Nothing to archive." -ForegroundColor Yellow
}
