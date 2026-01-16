# OMEGA Deployment Script
Write-Host "🚀 Launching OMEGA Deployment..." -ForegroundColor Cyan

# Check for Railway CLI
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Login
Write-Host "🔑 Checking Login..." -ForegroundColor Yellow
$whoami = railway whoami 2>$null
if ($getLastError -or $whoami -match "Not logged in") {
    Write-Host "⚠️  Please login in the browser..." -ForegroundColor Cyan
    railway login
}

# Init
if (-not (Test-Path .railway)) {
    Write-Host "🔗 Linking Project (Select 'OMEGA-Trinity' or Create New)..." -ForegroundColor Cyan
    railway init
}

# Sync Env
Write-Host "⚙️  Syncing Environment Variables..." -ForegroundColor Yellow
if (Test-Path "packages/brain/.env") {
    Get-Content "packages/brain/.env" | ForEach-Object {
        # Match lines that look like KEY=VALUE (ignore comments)
        if ($_ -match "^[^#]+=") {
            $parts = $_ -split "=", 2
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            # Set variable using shell arguments to avoid parsing issues
            Write-Host "   Setting $key"
            cmd /c "railway variables --set `"$key=$val`"" > $null
        }
    }
}

# Deploy
Write-Host "🚀 Deploying..." -ForegroundColor Green
railway up --detach
Write-Host "✅ Done! Monitor at https://railway.app/dashboard" -ForegroundColor Cyan
