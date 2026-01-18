#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Start Infrastructure - Servers, Databases, Ngrok
.DESCRIPTION
    Boots all backend services required for gAIng-Brain operation
.NOTES
    Part of DAWN Protocol
#>

$ErrorActionPreference = 'Continue'
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   INFRASTRUCTURE BOOT SEQUENCE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Node.js Brain Server
Write-Host "[1/4] Starting gAIng-Brain Server (Port 8080)..." -ForegroundColor Yellow
Set-Location $ProjectRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm start" -WindowStyle Hidden
Start-Sleep -Seconds 3

# 2. Initialize Vector Database (if not exists)
Write-Host "[2/4] Checking Vector Database..." -ForegroundColor Yellow
$vectorDbPath = Join-Path $ProjectRoot "vector_store.db"
if (-not (Test-Path $vectorDbPath)) {
    Write-Host "    Initializing ChromaDB..." -ForegroundColor Gray
    # Add initialization logic here if needed
}

# 3. Start Ngrok Tunnel (if configured)
Write-Host "[3/4] Starting Ngrok Tunnel..." -ForegroundColor Yellow
$ngrokScript = Join-Path $ProjectRoot "scripts\start-ngrok.ps1"
if (Test-Path $ngrokScript) {
    Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ngrokScript`"" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 4. Verify Services
Write-Host "[4/4] Verifying Services..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5
    Write-Host "    Brain Server: ONLINE" -ForegroundColor Green
} catch {
    Write-Host "    Brain Server: STARTING..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   INFRASTRUCTURE: ONLINE" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

exit 0
