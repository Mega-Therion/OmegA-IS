$ErrorActionPreference = "Stop"

Write-Host "OMEGA SETUP 🧩 (frontend)" -ForegroundColor Cyan

if (-not (Test-Path ".\frontend")) {
  throw "frontend/ directory not found. It should exist after the Omega integration."
}

Push-Location ".\frontend"
try {
  Write-Host "Installing frontend deps..." -ForegroundColor Green
  npm install
  Write-Host "✅ frontend install complete" -ForegroundColor Green
} finally {
  Pop-Location
}
