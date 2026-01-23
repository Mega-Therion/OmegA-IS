#!/usr/bin/env pwsh
# OMEGA-Trinity Unified Startup Script
# Starts all services for local development

Write-Host "="*60 -ForegroundColor Cyan
Write-Host "  OMEGA-Trinity Startup" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""

# Check if running in correct directory
if (!(Test-Path "package.json")) {
    Write-Host "Error: Must be run from OMEGA-Trinity root directory" -ForegroundColor Red
    exit 1
}

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Node.js not found. Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js found: $(node --version)" -ForegroundColor Green

# Check Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Python not found. Please install Python >= 3.11" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python found: $(python --version)" -ForegroundColor Green

# Check for .env files
if (!(Test-Path ".env")) {
    Write-Host "✗ Root .env file not found" -ForegroundColor Red
    Write-Host "  Run: cp .env.example .env" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Root .env file found" -ForegroundColor Green

# Check if ports are available
Write-Host ""
Write-Host "Checking ports..." -ForegroundColor Yellow

$ports = @(
    @{Port=8787; Service="Gateway"},
    @{Port=8080; Service="Brain"},
    @{Port=8000; Service="Bridge"}
)

$portsInUse = @()
foreach ($p in $ports) {
    if (Test-Port $p.Port) {
        Write-Host "✗ Port $($p.Port) ($($p.Service)) is already in use" -ForegroundColor Red
        $portsInUse += $p
    } else {
        Write-Host "✓ Port $($p.Port) ($($p.Service)) is available" -ForegroundColor Green
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host ""
    Write-Host "Ports in use. Options:" -ForegroundColor Yellow
    Write-Host "1. Stop services using these ports" -ForegroundColor White
    Write-Host "2. Use different ports (edit .env files)" -ForegroundColor White
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne 'y') {
        exit 1
    }
}

# Install dependencies if needed
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow

if (!(Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
    npm install
}

if (!(Test-Path "packages/bridge/venv")) {
    Write-Host "Setting up Python virtual environment..." -ForegroundColor Cyan
    Push-Location packages/bridge
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    deactivate
    Pop-Location
}

Write-Host "✓ Dependencies ready" -ForegroundColor Green

# Start services
Write-Host ""
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "  Starting Services" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

# Start Gateway
Write-Host ""
Write-Host "Starting Gateway (Port 8787)..." -ForegroundColor Magenta
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd gateway; npm run dev" -WorkingDirectory $PWD

Start-Sleep -Seconds 2

# Start Brain
Write-Host "Starting Brain (Port 8080)..." -ForegroundColor Magenta
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd packages/brain; npm start" -WorkingDirectory $PWD

Start-Sleep -Seconds 2

# Start Bridge
Write-Host "Starting Bridge (Port 8000)..." -ForegroundColor Magenta
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd packages/bridge; .\venv\Scripts\Activate.ps1; python main.py" -WorkingDirectory $PWD

Write-Host ""
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "  OMEGA-Trinity Started!" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  Gateway: http://localhost:8787" -ForegroundColor White
Write-Host "  Brain:   http://localhost:8080" -ForegroundColor White
Write-Host "  Bridge:  http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "Health Checks:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:8787/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:8080/health" -ForegroundColor Gray
Write-Host "  curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Wait for user interrupt
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    # Services will close when their terminal windows are closed
}
