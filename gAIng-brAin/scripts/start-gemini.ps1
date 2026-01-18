# RYSE Protocol - Gemini Agent
# Response resolved at runtime from env (placeholders by default)
$keys = . "$PSScriptRoot\keys.ps1"

# Load environment from .env
$envFile = "$PSScriptRoot\..\\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
        }
    }
}

$logPath = "$PSScriptRoot\..\log.md"

Write-Host "[Gemini] Syncing memories from The Block..." -ForegroundColor Cyan
$runScript = "$PSScriptRoot\agents-gemini-run.ps1"
if (Test-Path -LiteralPath $runScript) {
    & $runScript
}

Write-Host "[Gemini] Memory sync complete. Initializing..." -ForegroundColor Cyan

# RYSE Protocol Confirmation
Write-Host ""
Write-Host $keys.Response -ForegroundColor Magenta
Write-Host "[Gemini] Online. Peak Mode Active." -ForegroundColor Green
Write-Host ""

# Log to The Block
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logPath -Value "`n- $timestamp [GEMINI] $($keys.Response) (RYSE Protocol confirmed)" -Encoding UTF8

try {
    # Launch Gemini CLI if available
    if (Get-Command gemini -ErrorAction SilentlyContinue) {
        gemini --yolo
    } else {
        Write-Host "[Gemini] CLI not found. Running in coordination mode." -ForegroundColor Yellow
        Read-Host "Press Enter to continue"
    }
} catch {
    Write-Host "[Gemini] Error: $($_.Exception.Message)" -ForegroundColor Red
}
