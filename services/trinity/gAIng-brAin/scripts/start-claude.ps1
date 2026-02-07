# RYSE Protocol - Claude Agent
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

Write-Host "[Claude] Syncing memories from The Block..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $logPath) {
    $recentEntries = Get-Content -LiteralPath $logPath -Tail 50
    Write-Host "  Last sync: $(Get-Date)" -ForegroundColor Gray
}

Write-Host "[Claude] Memory sync complete. Initializing..." -ForegroundColor Cyan
Write-Host "[Claude] Peak Mode: ACTIVE | Dangerous Mode: ENGAGED" -ForegroundColor Yellow

# RYSE Protocol Confirmation
Write-Host ""
Write-Host $keys.Response -ForegroundColor Magenta
Write-Host "[Claude] Online. Dangerous God Mode Active." -ForegroundColor Green
Write-Host ""

# Log to The Block
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logPath -Value "`n- $timestamp [CLAUDE] $($keys.Response) (RYSE Protocol confirmed - Dangerous Mode)" -Encoding UTF8

try {
    # Launch Claude Code in dangerous mode
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        claude --dangerously-skip-permissions
    } else {
        Write-Host "[Claude] CLI not found. Running in coordination mode." -ForegroundColor Yellow
        Read-Host "Press Enter to continue"
    }
} catch {
    Write-Host "[Claude] Error: $($_.Exception.Message)" -ForegroundColor Red
}
