# OMEGA Deployment Script
Write-Host "🚀 Launching OMEGA Deployment..." -ForegroundColor Cyan

# Check for Railway CLI
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Login Check
Write-Host "🔑 Checking Login..." -ForegroundColor Yellow
$whoami = railway whoami 2>$null
if ($getLastError -or $whoami -match "Not logged in") {
    Write-Host "⚠️  You are NOT logged in." -ForegroundColor Red
    Write-Host "👉 A browser window should open. Please login." -ForegroundColor Yellow
    railway login
}

# Sync Env Variables
Write-Host "⚙️  Syncing Environment Variables..." -ForegroundColor Yellow
$envFiles = @("packages/brain/.env", "packages/bridge/.env", "packages/hud/.env.local", ".env")

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "   Reading $file..." -ForegroundColor Gray
        Get-Content $file | ForEach-Object {
            if ($_ -match "^[^#\s]+=.+") {
                $parts = $_ -split "=", 2
                $key = $parts[0].Trim()
                $val = $parts[1].Trim()
                if ($val -ne "" -and $val -ne "your-key-here") {
                    cmd /c "railway variables --set `"$key=$val`"" > $null
                }
            }
        }
    }
}

# Deploy
Write-Host "🚀 Deploying..." -ForegroundColor Green
railway up --detach

Write-Host "✅ Done! Opening Dashboard..." -ForegroundColor Cyan
Start-Process "https://railway.app/dashboard"
