<#
.SYNOPSIS
    DAWN - gAIng Collective Startup Orchestration (RYSE Protocol)
.DESCRIPTION
    Launches the "Trinity Layout" in Windows Terminal.
    Layout:
    [     Gemini      ] [      Codex      ]
    [     (Left)      ] [   (Right Top)   ]
    [                 ] [-----------------]
    [                 ] [     Claude      ]
    [                 ] [  (Right Btm)    ]
#>

$ErrorActionPreference = 'Continue'
$ProjectRoot = $PSScriptRoot

# Script Paths
$ScriptGemini = Join-Path $ProjectRoot "scripts\start-gemini.ps1"
$ScriptCodex  = Join-Path $ProjectRoot "scripts\start-codex.ps1"
$ScriptClaude = Join-Path $ProjectRoot "scripts\start-claude.ps1"

# Helper for PowerShell arguments
function Get-PsArgs ($ScriptPath) {
    return "powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
}

Write-Host "Initiating DAWN Protocol (Trinity Layout)..." -ForegroundColor Cyan

# Check if Windows Terminal is available
$wtPath = Get-Command wt -ErrorAction SilentlyContinue

if ($wtPath) {
    # Windows Terminal available - use Trinity Layout
    $WTArgs = "new-tab --title `"Gemini (Vision)`" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File `"$ScriptGemini`" ; split-pane -V --title `"Codex`" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File `"$ScriptCodex`" ; split-pane -H --title `"Claude`" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File `"$ScriptClaude`""
    
    try {
        Start-Process wt -ArgumentList $WTArgs -WindowStyle Minimized
        Write-Host "Crew assembled in Windows Terminal (minimized)." -ForegroundColor Green
    } catch {
        Write-Host "Error launching Windows Terminal: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    # Fallback: Launch separate PowerShell windows
    Write-Host "Windows Terminal not found. Launching separate PowerShell windows..." -ForegroundColor Yellow
    
    try {
        if (Test-Path $ScriptGemini) {
            Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ScriptGemini`"" -WindowStyle Minimized
            Write-Host "[+] Gemini agent launched" -ForegroundColor Cyan
        }
        if (Test-Path $ScriptCodex) {
            Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ScriptCodex`"" -WindowStyle Minimized
            Write-Host "[+] Codex agent launched" -ForegroundColor Cyan
        }
        if (Test-Path $ScriptClaude) {
            Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ScriptClaude`"" -WindowStyle Minimized
            Write-Host "[+] Claude agent launched" -ForegroundColor Cyan
        }
        Write-Host "Crew assembled in separate windows (minimized)." -ForegroundColor Green
    } catch {
        Write-Host "Error launching agents: $($_.Exception.Message)" -ForegroundColor Red
    }
}

