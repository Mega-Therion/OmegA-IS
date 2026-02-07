# Unlock-PeakMode.ps1
# The 'One-Click' Setup for gAIng Peak Performance
# Universal Infrastructure + Agent-Specific Hooks

Write-Host '=====================================================' -ForegroundColor Cyan
Write-Host '       UNLOCKING PEAK MODE (gAIng Brain)             ' -ForegroundColor Cyan
Write-Host '=====================================================' -ForegroundColor Cyan

# 1. THE HOOD (Infrastructure Layer)
# ----------------------------------------------------
Write-Host '[1/4] Configuring The Hood...'
$projectRoot = (Split-Path -Parent $PSScriptRoot)
$envPath = Join-Path $projectRoot '.env'

# Ensure .env exists (Stub if missing)
if (-not (Test-Path $envPath)) {
    Write-Warning 'No .env found! Creating template...'
    Set-Content -Path $envPath -Value "SUPABASE_URL=YOUR_URL_HERE`r`nENABLE_NGROK=1"
}

# Register Startup Tasks (The heartbeat)
Write-Host '      -> Registering Startup Tasks...'
$registerScript = Join-Path $projectRoot 'scripts\register-startup-tasks.ps1'
if (Test-Path $registerScript) {
    & $registerScript -ProjectRoot $projectRoot | Out-Null
} else {
    Write-Warning "Missing script: $registerScript"
}

# 2. THE BLACKBOARD (Communication Layer)
# ----------------------------------------------------
Write-Host '[2/4] Establishing The Blackboard...'
$logPath = Join-Path $projectRoot 'log.md'
$systemLogPath = 'C:\Windows\System32\the_log.md'

# Set Global Environment Variable for all Agents
[System.Environment]::SetEnvironmentVariable('AGENTS_MD_PATH', $logPath, 'User')
Write-Host '      -> AGENTS_MD_PATH set to gAIng-Brain/log.md'

# Ensure the 'Sync' command works
if (Test-Path $systemLogPath) {
    # Update the pointer just in case
    Set-Content -Path $systemLogPath -Value $logPath
    Write-Host '      -> System32 Pointer Sync Updated.'
}

# 3. THE CREW (Agent-Specific Hooks)
# ----------------------------------------------------
Write-Host '[3/4] Waking the Crew...'

# CODEX Hook
# Ensures Codex starts in the right directory with the right permissions
Write-Host '      -> Prepping Codex...'
# (Codex reads AGENTS_MD_PATH automatically now)

# GEMINI Hook
# Ensures Gemini startup script is active
Write-Host '      -> Prepping Gemini...'
$geminiScript = Join-Path $projectRoot 'scripts\agents-gemini-run.ps1'
if (-not (Test-Path $geminiScript)) {
    Write-Warning 'Gemini run script missing. Re-run setup if needed.'
}

# FUTURE AGENTS (Claude/Grok) - Paste Modules Here
# ------------------------------------------------
# ...

# 4. ACTIVATION
# ----------------------------------------------------
Write-Host '[4/4] Activation Phase...'
# Launch Watchdog only if explicitly requested (Manual override)
if ($Args -contains '-StartWatchdog') {
    Write-Host '      -> Activating Watchdog (The Autopilot)...'
    $watchdogScript = Join-Path $projectRoot 'scripts\watchdog.ps1'
    if (Test-Path $watchdogScript) {
        Start-Process powershell -ArgumentList "-NoExit -File `"$watchdogScript`"" -WindowStyle Minimized
    }
} else {
    Write-Host '      -> Watchdog standby. (Run with -StartWatchdog to activate)'
}

Write-Host '=====================================================' -ForegroundColor Green
Write-Host '       PEAK MODE UNLOCKED. GEMINI READY.             ' -ForegroundColor Green
Write-Host '=====================================================' -ForegroundColor Green

