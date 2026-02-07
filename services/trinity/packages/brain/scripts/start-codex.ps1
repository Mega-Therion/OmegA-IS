# RYSE Protocol - Codex Agent
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

Write-Host "[Codex] Syncing memories from The Block..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $logPath) {
    $recentEntries = Get-Content -LiteralPath $logPath -Tail 50
    Write-Host "  Last sync: $(Get-Date)" -ForegroundColor Gray
}

Write-Host "[Codex] Memory sync complete. Initializing..." -ForegroundColor Cyan

# RYSE Protocol Confirmation
Write-Host ""
Write-Host $keys.Response -ForegroundColor Magenta
Write-Host "[Codex] Online. God Mode Active." -ForegroundColor Green
Write-Host ""

# Log to The Block
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logPath -Value "`n- $timestamp [CODEX] $($keys.Response) (RYSE Protocol confirmed)" -Encoding UTF8

try {
    # Launch Codex CLI if available
    if (Get-Command codex -ErrorAction SilentlyContinue) {
        codex
    } else {
        Write-Host "[Codex] CLI not found. Running in coordination mode." -ForegroundColor Yellow
        Read-Host "Press Enter to continue"
    }
} catch {
    Write-Host "[Codex] Error: $($_.Exception.Message)" -ForegroundColor Red
}
