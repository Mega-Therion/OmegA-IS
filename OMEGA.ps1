®J<#
.SYNOPSIS
    OMEGA Ecosystem Master Controller

.DESCRIPTION
    Master orchestration script for the complete OMEGA ecosystem.
    Manages all four repositories as a unified system.

.PARAMETER Action
    start   - Start all services
    stop    - Stop all services  
    status  - Check status of all services
    test    - Run connectivity tests
    logs    - Show combined logs

.EXAMPLE
    .\OMEGA.ps1 start
    .\OMEGA.ps1 status
    .\OMEGA.ps1 test
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "status", "test", "logs", "help")]
    [string]$Action = "help"
)

$ErrorActionPreference = "Stop"

$workspace = $PSScriptRoot
$repos = @{
    OmegaKit        = Join-Path $workspace "OMEGA_REALITY_KIT"
    Jarvis          = Join-Path $workspace "Jarvis"
    CollectiveBrain = Join-Path $workspace "CollectiveBrain_V1"
    GaingBrain      = Join-Path $workspace "gAIng-brAin"
}

function Write-Banner {
    Write-Host ""
    Write-Host "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—" -ForegroundColor Cyan
    Write-Host "â•‘   ___  __  __ _____ ____    _                              â•‘" -ForegroundColor Cyan
    Write-Host "â•‘  / _ \|  \/  | ____/ ___|  / \                             â•‘" -ForegroundColor Cyan
    Write-Host "â•‘ | | | | |\/| |  _|| |  _  / _ \                            â•‘" -ForegroundColor Cyan
    Write-Host "â•‘ | |_| | |  | | |__| |_| |/ ___ \                           â•‘" -ForegroundColor Cyan
    Write-Host "â•‘  \___/|_|  |_|_____\____/_/   \_\                          â•‘" -ForegroundColor Cyan
    Write-Host "â•‘                                                            â•‘" -ForegroundColor Cyan
    Write-Host "â•‘   Multi-Agent AI Ecosystem Controller                      â•‘" -ForegroundColor Cyan
    Write-Host "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor Cyan
    Write-Host ""
}

function Test-ServiceHealth {
    param($url, $name)
    $ErrorActionPreference = 'SilentlyContinue'
    $response = $null
    $response = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing
    if ($response -and $response.StatusCode -eq 200) {
        Write-Host "  âœ“ $name" -ForegroundColor Green -NoNewline
        Write-Host " ($url)" -ForegroundColor DarkGray
        return $true
    }
    Write-Host "  âœ— $name" -ForegroundColor Red -NoNewline
    Write-Host " ($url)" -ForegroundColor DarkGray
    return $false
}

function Start-OmegaStack {
    Write-Banner
    Write-Host "Starting OMEGA Ecosystem..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start OMEGA Gateway (Docker)
    if (Test-Path $repos.OmegaKit) {
        Write-Host "[1/4] Starting OMEGA Gateway..." -ForegroundColor Cyan
        Push-Location $repos.OmegaKit
        docker compose up -d --build 2>&1 | Out-Null
        Pop-Location
        Write-Host "      â†’ Gateway on http://localhost:8787" -ForegroundColor Gray
    }
    
    # Start gAIng-brAin
    if (Test-Path $repos.GaingBrain) {
        Write-Host "[2/4] Starting gAIng-brAin..." -ForegroundColor Cyan
        Push-Location $repos.GaingBrain
        Start-Process -FilePath "cmd" -ArgumentList "/c npm start" -WindowStyle Minimized
        Pop-Location
        Write-Host "      â†’ Brain on http://localhost:8080" -ForegroundColor Gray
    }
    
    # Start CollectiveBrain
    if (Test-Path $repos.CollectiveBrain) {
        Write-Host "[3/4] Starting CollectiveBrain..." -ForegroundColor Cyan
        Push-Location $repos.CollectiveBrain
        if (-not (Test-Path "venv")) { python -m venv venv }
        Start-Process -FilePath "cmd" -ArgumentList "/c venv\Scripts\activate && pip install -q -r requirements.txt && python api.py" -WindowStyle Minimized
        Pop-Location
        Write-Host "      â†’ Collective on http://localhost:8000" -ForegroundColor Gray
    }
    
    # Start Jarvis
    if (Test-Path $repos.Jarvis) {
        Write-Host "[4/4] Starting Jarvis UI..." -ForegroundColor Cyan
        Push-Location $repos.Jarvis
        if (-not (Test-Path "node_modules")) { npm install 2>&1 | Out-Null }
        Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -WindowStyle Minimized
        Pop-Location
        Write-Host "      â†’ Jarvis on http://localhost:3000" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Stack starting... run " -NoNewline
    Write-Host ".\OMEGA.ps1 status" -ForegroundColor Yellow -NoNewline
    Write-Host " to verify."
    Write-Host ""
}

function Stop-OmegaStack {
    Write-Banner
    Write-Host "Stopping OMEGA Ecosystem..." -ForegroundColor Yellow
    
    # Stop Docker containers
    if (Test-Path $repos.OmegaKit) {
        Push-Location $repos.OmegaKit
        docker compose down 2>&1 | Out-Null
        Pop-Location
        Write-Host "  âœ“ OMEGA Gateway stopped" -ForegroundColor Green
    }
    
    # Kill Node processes (Jarvis, gAIng-brAin)
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  âœ“ Node processes stopped" -ForegroundColor Green
    
    # Kill Python processes (CollectiveBrain)
    Get-Process -Name "python" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $_ | Stop-Process -Force -ErrorAction SilentlyContinue
        }
        catch {}
    }
    Write-Host "  âœ“ Python processes stopped" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "All services stopped." -ForegroundColor Gray
    Write-Host ""
}

function Show-OmegaStatus {
    Write-Banner
    Write-Host "Checking OMEGA Ecosystem Status..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Service Health:" -ForegroundColor White
    $g = Test-ServiceHealth "http://localhost:8787/healthz" "OMEGA Gateway"
    $b = Test-ServiceHealth "http://localhost:8080/health" "gAIng-brAin"
    $c = Test-ServiceHealth "http://localhost:8000/health" "CollectiveBrain"
    $j = Test-ServiceHealth "http://localhost:3000" "Jarvis UI"
    
    Write-Host ""
    Write-Host "Repository Status:" -ForegroundColor White
    foreach ($name in $repos.Keys) {
        $path = $repos[$name]
        if (Test-Path $path) {
            Write-Host "  âœ“ $name" -ForegroundColor Green -NoNewline
            Write-Host " ($path)" -ForegroundColor DarkGray
        }
        else {
            Write-Host "  âœ— $name not found" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Test-OmegaConnectivity {
    Write-Banner
    Write-Host "Running OMEGA Connectivity Tests..." -ForegroundColor Yellow
    Write-Host ""
    
    # Test Gateway chat
    Write-Host "Testing OMEGA Gateway Chat..." -ForegroundColor Cyan
    try {
        $body = @{ user = "Test message from OMEGA controller" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:8787/v1/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
        Write-Host "  âœ“ Gateway responded: $($response.mode)" -ForegroundColor Green
    }
    catch {
        Write-Host "  âœ— Gateway test failed: $_" -ForegroundColor Red
    }
    
    # Test CollectiveBrain orchestration
    Write-Host "Testing CollectiveBrain Orchestration..." -ForegroundColor Cyan
    try {
        $body = @{ objective = "Test task decomposition" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:8000/orchestrate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
        Write-Host "  âœ“ Orchestrator responded with $($response.sub_goals.Count) sub-goals" -ForegroundColor Green
    }
    catch {
        Write-Host "  âœ— Orchestrator test failed: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Show-Help {
    Write-Banner
    Write-Host "OMEGA Ecosystem Controller" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage: .\OMEGA.ps1 <action>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor White
    Write-Host "  start   - Start all OMEGA services" -ForegroundColor Gray
    Write-Host "  stop    - Stop all OMEGA services" -ForegroundColor Gray
    Write-Host "  status  - Check health of all services" -ForegroundColor Gray
    Write-Host "  test    - Run connectivity tests" -ForegroundColor Gray
    Write-Host "  help    - Show this help message" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Components:" -ForegroundColor White
    Write-Host "  OMEGA Gateway     - FastAPI backend (port 8787)" -ForegroundColor Gray
    Write-Host "  gAIng-brAin       - Express memory API (port 8080)" -ForegroundColor Gray
    Write-Host "  CollectiveBrain   - Multi-agent orchestrator (port 8000)" -ForegroundColor Gray
    Write-Host "  Jarvis            - Next.js UI (port 3000)" -ForegroundColor Gray
    Write-Host ""
}

# Main router
switch ($Action) {
    "start" { Start-OmegaStack }
    "stop" { Stop-OmegaStack }
    "status" { Show-OmegaStatus }
    "test" { Test-OmegaConnectivity }
    "help" { Show-Help }
    default { Show-Help }
}
… *cascade08…†*cascade08†‡ *cascade08‡ˆ*cascade08ˆÕ *cascade08ÕÖ*cascade08ÖŒ *cascade08Œ*cascade08‹ *cascade08‹Œ*cascade08ŒÉ *cascade08ÉÖÖé *cascade08éñ*cascade08ñò *cascade08òö*cascade08ö÷ *cascade08÷ÿ*cascade08ÿ€ *cascade08€”*cascade08”š *cascade08š­*cascade08­Š *cascade08Š™*cascade08™Á *cascade08ÁÇ *cascade08ÇÜ+ *cascade08Ü+â+*cascade08â+ì+ *cascade08ì+ð+*cascade08ð+ñ+ *cascade08ñ+‰, *cascade08‰,‹,*cascade08‹,Œ, *cascade08Œ,,*cascade08,Ž, *cascade08Ž,¿, *cascade08¿,ã,*cascade08ã,Ø4 *cascade08Ø4á4*cascade08á4£: *cascade08£:¨:*cascade08¨:î> *cascade08î>ó>*cascade08ó>®J *cascade082Dfile:///c:/Users/mega_/Downloads/OMEGA_REALITY_KIT_UPDATED/OMEGA.ps1