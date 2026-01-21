# Wake-The-Crew.ps1
# Automates the gAIng startup sequence at logon
# Launches Gemini (Master Unlock), Codex, and Claude in separate terminals.

Write-Host '---------------------------------------------------' -ForegroundColor Cyan
Write-Host '       WAKING THE CREW... (gAIng Brain)            ' -ForegroundColor Cyan
Write-Host '---------------------------------------------------' -ForegroundColor Cyan

# 0. PREP THE BLOCK (Infrastructure)
# Start Server and Ngrok silently in the background
$root = (Split-Path -Parent $PSScriptRoot)
Write-Host '[0/3] Prepping The Block (Server + Ngrok)...'
if (Test-Path "$root\scripts\start-brain.ps1") {
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File "$root\scripts\start-brain.ps1"" -WindowStyle Minimized
}
if (Test-Path "$root\scripts\start-ngrok.ps1") {
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File "$root\scripts\start-ngrok.ps1"" -WindowStyle Minimized
}
Start-Sleep -Seconds 5

# 1. Start GEMINI (The Architect + GOD MODE UNLOCK)
# Only Gemini runs the 'Unlock-PeakMode.ps1' to set the environment.
Write-Host '[1/3] Waking GEMINI (Architect Mode)...'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '(Split-Path -Parent $PSScriptRoot)\scripts\Unlock-PeakMode.ps1'; Write-Host 'Gemini Waking...'; gemini" -Verb RunAs -WindowStyle Normal

# Small pause to let the system unlock before the others wake up
Start-Sleep -Seconds 3

# 2. Start CODEX (The Engineer)
# Just wakes up and syncs.
Write-Host '[2/3] Waking CODEX...'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "codex 'Wake up. Run the shell command sync. Report status.'" -WindowStyle Normal

# 3. Start CLAUDE (The Analyst)
# Just wakes up and syncs.
Write-Host '[3/3] Waking CLAUDE...'
Start-Process powershell -ArgumentList "-NoExit", "-Command", "claude 'Wake up. Run the shell command sync. Report status.'" -WindowStyle Normal

Write-Host '---------------------------------------------------' -ForegroundColor Green
Write-Host '       CREW ASSEMBLED. THE BLOCK IS HOT.           ' -ForegroundColor Green
Write-Host '---------------------------------------------------' -ForegroundColor Green

