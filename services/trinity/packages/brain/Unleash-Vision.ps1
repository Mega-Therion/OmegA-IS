$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       VIBRANIUM UNLEASHED: AWAKENING VISION" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. PATH INJECTION (Asset Utilization)
$antigravityPaths = @(
    "C:\Users\mega_\AppData\Local\Programs\Antigravity\resources\app\extensions\antigravity\bin",
    "C:\Users\mega_\AppData\Local\Programs\Antigravity\resources\app\node_modules\@vscode\ripgrep\bin"
)
foreach ($p in $antigravityPaths) {
    if ($env:PATH -notlike "*$p*") {
        Write-Host "  -> Injecting Grav/Antigravity Assets..." -ForegroundColor DarkGray
        $env:PATH += ";$p"
    }
}

# 2. DATA INTEGRITY
$dataDir = Join-Path $scriptRoot "data"
$logsDir = Join-Path $scriptRoot "logs"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

# 3. ENVIRONMENT VALIDATION
Write-Host "[*] Validating Environment..." -ForegroundColor Yellow
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Error "CRITICAL: Node.js not found on host. Vision cannot function."
    exit 1
}
Write-Host "  -> Node: $($nodeCheck.Source)" -ForegroundColor Green

# 4. DATABASE INITIALIZATION
Write-Host "[*] Initializing Soul (Database)..." -ForegroundColor Yellow
node scripts/init-local-db.js

# 5. BRAIN ACTIVATION
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       CORE ESTABLISHED. LAUNCHING BRAIN." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Start the main server
# Using -NoNewWindow to keep output in this terminal
Start-Process node -ArgumentList "index.js" -WorkingDirectory $scriptRoot
