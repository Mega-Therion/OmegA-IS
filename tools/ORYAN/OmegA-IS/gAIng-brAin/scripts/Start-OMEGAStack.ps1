<# 
.SYNOPSIS
    OMEGA Full Stack Integration - Starts the complete OMEGA ecosystem

.DESCRIPTION
    This script integrates and starts all components of the OMEGA system:
    1. gAIng-brAin Express server (localhost:8080)
    2. OMEGA Gateway via Docker (localhost:8787)
    3. CollectiveBrain API (localhost:8000)
    4. Jarvis UI (localhost:3000)

.PARAMETER Components
    Comma-separated list of components to start: brain,gateway,collective,jarvis,all

.EXAMPLE
    .\Start-OMEGAStack.ps1 -Components all
    .\Start-OMEGAStack.ps1 -Components gateway,jarvis
#>

param(
    [string]$Components = "all"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptDir = $PSScriptRoot
$rootDir = Split-Path -Parent $scriptDir
$workspaceDir = Split-Path -Parent $rootDir

$componentList = $Components.ToLower().Split(",") | ForEach-Object { $_.Trim() }
$startAll = $componentList -contains "all"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          OMEGA Full Stack Integration                ║" -ForegroundColor Cyan
Write-Host "║          gAIng Collective System                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Component paths
$paths = @{
    brain      = $rootDir
    gateway    = Join-Path $workspaceDir "OMEGA_REALITY_KIT"
    collective = Join-Path $workspaceDir "CollectiveBrain_V1"
    jarvis     = Join-Path $workspaceDir "Jarvis"
}

# Verify components exist
function Test-ComponentPath($name, $path) {
    if (-not (Test-Path $path)) {
        Write-Host "  ⚠ $name not found at: $path" -ForegroundColor Yellow
        return $false
    }
    return $true
}

# Start gAIng-brAin
if ($startAll -or $componentList -contains "brain") {
    Write-Host "[BRAIN] Starting gAIng-brAin Express server..." -ForegroundColor Yellow
    if (Test-ComponentPath "gAIng-brAin" $paths.brain) {
        Push-Location $paths.brain
        Start-Process -FilePath "cmd" -ArgumentList "/c npm start" -WindowStyle Minimized
        Pop-Location
        Write-Host "  ✓ gAIng-brAin → http://localhost:8080" -ForegroundColor Green
        Start-Sleep -Seconds 1
    }
}

# Start OMEGA Gateway
if ($startAll -or $componentList -contains "gateway") {
    Write-Host "[GATEWAY] Starting OMEGA Gateway Docker stack..." -ForegroundColor Yellow
    if (Test-ComponentPath "OMEGA_REALITY_KIT" $paths.gateway) {
        Push-Location $paths.gateway
        docker compose up -d --build
        Pop-Location
        Write-Host "  ✓ OMEGA Gateway → http://localhost:8787" -ForegroundColor Green
    }
}

# Start CollectiveBrain
if ($startAll -or $componentList -contains "collective") {
    Write-Host "[COLLECTIVE] Starting CollectiveBrain API..." -ForegroundColor Yellow
    if (Test-ComponentPath "CollectiveBrain_V1" $paths.collective) {
        Push-Location $paths.collective
        
        if (-not (Test-Path "venv")) {
            Write-Host "  Creating virtual environment..." -ForegroundColor Gray
            python -m venv venv
        }
        
        Start-Process -FilePath "cmd" -ArgumentList "/c venv\Scripts\activate && pip install -q -r requirements.txt && python api.py" -WindowStyle Minimized
        Pop-Location
        Write-Host "  ✓ CollectiveBrain → http://localhost:8000" -ForegroundColor Green
    }
}

# Start Jarvis
if ($startAll -or $componentList -contains "jarvis") {
    Write-Host "[JARVIS] Starting Jarvis UI..." -ForegroundColor Yellow
    if (Test-ComponentPath "Jarvis" $paths.jarvis) {
        Push-Location $paths.jarvis
        
        if (-not (Test-Path "node_modules")) {
            Write-Host "  Installing dependencies..." -ForegroundColor Gray
            npm install
        }
        
        Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -WindowStyle Minimized
        Pop-Location
        Write-Host "  ✓ Jarvis UI → http://localhost:3000" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                   OMEGA Stack Ready                  " -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services running:" -ForegroundColor White
Write-Host "    • gAIng-brAin:     http://localhost:8080/health" -ForegroundColor Gray
Write-Host "    • OMEGA Gateway:   http://localhost:8787/healthz" -ForegroundColor Gray
Write-Host "    • CollectiveBrain: http://localhost:8000/health" -ForegroundColor Gray
Write-Host "    • Jarvis UI:       http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Quick test:" -ForegroundColor White
Write-Host '    curl http://localhost:8787/v1/chat -X POST -H "Content-Type: application/json" -d "{\"user\":\"Hello OMEGA\"}"' -ForegroundColor DarkGray
Write-Host ""
