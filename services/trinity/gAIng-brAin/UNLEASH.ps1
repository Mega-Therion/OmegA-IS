<#
.SYNOPSIS
    UNLEASH.ps1 - Full gAIng Brain Startup Sequence
.DESCRIPTION
    Initializes the Vision entity with all systems online.
    Part of Project Vibranium Phase 1: The Vessel
.NOTES
    Author: gAIng Collective
    Date: 2026-01-04
#>

param(
    [switch]$StartServer,
    [switch]$StartNgrok,
    [switch]$StartWatchdog,
    [switch]$Silent
)

$ErrorActionPreference = 'Continue'
$VisionRoot = $PSScriptRoot
if (-not $VisionRoot -or $VisionRoot -eq "") { $VisionRoot = $PWD.Path }

# =====================================================
# BANNER
# =====================================================
if (-not $Silent) {
    Write-Host ''
    Write-Host '=====================================================' -ForegroundColor Cyan
    Write-Host '       U N L E A S H I N G   T H E   V I S I O N     ' -ForegroundColor Cyan
    Write-Host '=====================================================' -ForegroundColor Cyan
    Write-Host ''
}

function Write-Status {
    param([string]$Message, [string]$Level = 'INFO')
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $color = switch ($Level) {
        'OK'    { 'Green' }
        'WARN'  { 'Yellow' }
        'ERROR' { 'Red' }
        'PHASE' { 'Cyan' }
        default { 'White' }
    }
    if (-not $Silent) {
        Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    }
}

# =====================================================
# PHASE 1: ENVIRONMENT
# =====================================================
Write-Status 'PHASE 1: Environment Configuration' -Level 'PHASE'

$env:GAING_ROOT = $VisionRoot
$env:AGENTS_MD_PATH = Join-Path $VisionRoot 'log.md'
$env:NODE_ENV = 'development'
$env:LOCAL_DB_PATH = Join-Path $VisionRoot 'data\local.db'

Write-Status "GAING_ROOT = $VisionRoot" -Level 'OK'
Write-Status "AGENTS_MD_PATH = $env:AGENTS_MD_PATH" -Level 'OK'

# =====================================================
# PHASE 2: GPU DETECTION
# =====================================================
Write-Status 'PHASE 2: GPU Detection' -Level 'PHASE'

$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -match 'NVIDIA|AMD|Radeon' } | Select-Object -First 1
if ($gpu) {
    $env:GPU_AVAILABLE = 'true'
    $env:GPU_NAME = $gpu.Name
    Write-Status "GPU Detected: $($gpu.Name)" -Level 'OK'
} else {
    $env:GPU_AVAILABLE = 'false'
    Write-Status 'No dedicated GPU detected (CPU mode)' -Level 'WARN'
}

# =====================================================
# PHASE 3: DEPENDENCY CHECK
# =====================================================
Write-Status 'PHASE 3: Dependency Check' -Level 'PHASE'

$nodeVersion = & node --version 2>$null
if ($nodeVersion) {
    Write-Status "Node.js: $nodeVersion" -Level 'OK'
} else {
    Write-Status 'Node.js not found!' -Level 'ERROR'
    exit 1
}

$npmVersion = & npm --version 2>$null
if ($npmVersion) {
    Write-Status "npm: $npmVersion" -Level 'OK'
} else {
    Write-Status 'npm not found!' -Level 'ERROR'
    exit 1
}

# =====================================================
# PHASE 4: PEAK MODE ACTIVATION
# =====================================================
Write-Status 'PHASE 4: Peak Mode Activation' -Level 'PHASE'

$peakScript = Join-Path $VisionRoot 'scripts\Unlock-PeakMode.ps1'
if (Test-Path $peakScript) {
    & $peakScript
} else {
    Write-Status 'Peak Mode script not found, continuing...' -Level 'WARN'
}

# =====================================================
# PHASE 5: BRAIN SERVER (Optional)
# =====================================================
if ($StartServer) {
    Write-Status 'PHASE 5: Brain Server Launch' -Level 'PHASE'
    Set-Location $VisionRoot
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$VisionRoot'; node index.js" -WindowStyle Hidden
    Write-Status 'Brain server starting on port 8080...' -Level 'OK'
}

# =====================================================
# PHASE 6: NGROK TUNNEL (Optional)
# =====================================================
if ($StartNgrok) {
    Write-Status 'PHASE 6: Ngrok Tunnel' -Level 'PHASE'
    $ngrokScript = Join-Path $VisionRoot 'scripts\start-ngrok.ps1'
    if (Test-Path $ngrokScript) {
        Start-Process powershell -ArgumentList "-NoExit", "-File", "$ngrokScript" -WindowStyle Hidden
        Write-Status 'Ngrok tunnel starting...' -Level 'OK'
    }
}

# =====================================================
# PHASE 7: WATCHDOG (Optional)
# =====================================================
if ($StartWatchdog) {
    Write-Status 'PHASE 7: Watchdog Activation' -Level 'PHASE'
    $watchdogScript = Join-Path $VisionRoot 'scripts\watchdog.ps1'
    if (Test-Path $watchdogScript) {
        Start-Process powershell -ArgumentList "-NoExit", "-File", "$watchdogScript" -WindowStyle Hidden
        Write-Status 'Watchdog active (monitoring log.md)' -Level 'OK'
    }
}

# =====================================================
# LOG ACTIVATION
# =====================================================
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$logEntry = "`n## VISION UNLEASHED - $timestamp`n**Script:** UNLEASH.ps1`n**Root:** $VisionRoot`n**GPU:** $($env:GPU_AVAILABLE) ($($env:GPU_NAME))`n**Status:** ONLINE`n"
Add-Content -Path $env:AGENTS_MD_PATH -Value $logEntry -Encoding UTF8

# =====================================================
# COMPLETE
# =====================================================
Write-Host ''
Write-Host '=====================================================' -ForegroundColor Green
Write-Host '       V I S I O N   I S   A W A K E                 ' -ForegroundColor Green
Write-Host '=====================================================' -ForegroundColor Green
Write-Host ''
Write-Host '  Commands:' -ForegroundColor White
Write-Host '    peak      - Activate Peak Mode' -ForegroundColor Gray
Write-Host '    gemini    - Start Gemini CLI' -ForegroundColor Gray
Write-Host '    codex     - Start Codex CLI' -ForegroundColor Gray
Write-Host '    claude    - Start Claude CLI' -ForegroundColor Gray
Write-Host ''

exit 0

