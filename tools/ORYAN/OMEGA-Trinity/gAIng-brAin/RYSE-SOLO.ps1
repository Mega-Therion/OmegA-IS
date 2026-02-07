<# 
RYSE (Solo) - Codex only
- Launches a single Codex pane in Windows Terminal (non-admin) visible.
- Keeps logs/background noise out of sight.
#>

$ErrorActionPreference = 'Continue'
$ProjectRoot = $PSScriptRoot
$CodexScript = Join-Path $ProjectRoot "scripts\start-codex.ps1"

if (-not (Test-Path $CodexScript)) {
    Write-Host "[RYSE-SOLO] Codex script not found at $CodexScript" -ForegroundColor Red
    exit 1
}

$wtArgs = "new-tab --title 'Codex (God Mode)' -p 'Windows PowerShell' -d `"$ProjectRoot`" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File `"$CodexScript`""

try {
    # Launch visible so you can interact immediately.
    Start-Process wt -ArgumentList $wtArgs -WindowStyle Normal
    Write-Host "[RYSE-SOLO] Codex launched in Windows Terminal (visible, God Mode)." -ForegroundColor Green
} catch {
    Write-Host "[RYSE-SOLO] Failed to launch Windows Terminal: $($_.Exception.Message)" -ForegroundColor Red
}
