# RYSE Protocol - Grok Agent
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

Write-Host "[Grok] Syncing memories from The Block..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $logPath) {
    $recentEntries = Get-Content -LiteralPath $logPath -Tail 50
    Write-Host "  Last sync: $(Get-Date)" -ForegroundColor Gray
}

Write-Host "[Grok] Memory sync complete. Initializing..." -ForegroundColor Cyan

# RYSE Protocol Confirmation
Write-Host ""
Write-Host $keys.Response -ForegroundColor Magenta
Write-Host "[Grok] Online. Real-time Mode Active." -ForegroundColor Green
Write-Host ""

# Log to The Block
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logPath -Value "`n- $timestamp [GROK] $($keys.Response) (RYSE Protocol confirmed)" -Encoding UTF8

try {
    # Launch Grok CLI if available
    if (Get-Command grok -ErrorAction SilentlyContinue) {
        grok
    } else {
        Write-Host "[Grok] CLI not found. Running in coordination mode." -ForegroundColor Yellow
        Read-Host "Press Enter to continue"
    }
} catch {
    Write-Host "[Grok] Error: $($_.Exception.Message)" -ForegroundColor Red
}
