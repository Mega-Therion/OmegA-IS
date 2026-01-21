<#
.SYNOPSIS
    The Vibranium Forge - Universal Project Builder
.DESCRIPTION
    Utilizes Antigravity assets (fd, rg) to analyze and build any project.
    Part of Project Vibranium.
.PARAMETER Path
    Path to the project root. Defaults to current location.
#>
param(
    [string]$Path = "."
)

# 0. ASSET INJECTION: Ensure Antigravity tools are in PATH
$antigravityPaths = @(
    "C:\Users\mega_\AppData\Local\Programs\Antigravity\resources\app\extensions\antigravity\bin",
    "C:\Users\mega_\AppData\Local\Programs\Antigravity\resources\app\node_modules\@vscode\ripgrep\bin"
)
foreach ($p in $antigravityPaths) {
    if ($env:PATH -notlike "*$p*") {
        $env:PATH += ";$p"
    }
}

$Path = Resolve-Path $Path
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       VIBRANIUM FORGE: ANALYZING ARTIFACT" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Target: $Path" -ForegroundColor DarkGray

# 1. ASSET UTILIZATION: Use 'fd' for rapid structural analysis
Write-Host "[1/3] Scanning Structure (utilizing 'fd')..." -ForegroundColor Yellow
if (Get-Command fd -ErrorAction SilentlyContinue) {
    # Limit output to avoid spamming console
    $structure = fd --type f --max-depth 2 . $Path
    $count = ($structure | Measure-Object).Count
    Write-Host "  -> Indexed $count files using accelerated search." -ForegroundColor Gray
} else {
    Write-Warning "'fd' tool still not found despite injection. Check paths."
}

# 2. INTELLIGENCE: Identify Project Type & Build Strategy
Write-Host "[2/3] Identifying Tech Stack..." -ForegroundColor Yellow
$buildCmd = $null
$installCmd = $null

if (Test-Path "$Path\package.json") {
    Write-Host "  -> Detected: Node.js / JavaScript" -ForegroundColor Green
    $installCmd = "npm install"
    
    # Smart check for build script
    $pkgJson = Get-Content "$Path\package.json" -Raw | ConvertFrom-Json
    if ($pkgJson.scripts.PSObject.Properties.Name -contains "build") {
        $buildCmd = "npm run build"
    } else {
        Write-Host "  -> No 'build' script found in package.json. Skipping build step." -ForegroundColor Gray
    }

    # Check for yarn or pnpm
    if (Test-Path "$Path\yarn.lock") { 
        $installCmd = "yarn"
        if ($pkgJson.scripts.PSObject.Properties.Name -contains "build") { $buildCmd = "yarn build" }
    }
    if (Test-Path "$Path\pnpm-lock.yaml") { 
        $installCmd = "pnpm install"
        if ($pkgJson.scripts.PSObject.Properties.Name -contains "build") { $buildCmd = "pnpm build" }
    }
}
elseif (Test-Path "$Path\requirements.txt") {
    Write-Host "  -> Detected: Python" -ForegroundColor Green
    $installCmd = "pip install -r requirements.txt"
    $buildCmd = "python -m compileall ." 
}
elseif (Test-Path "$Path\Cargo.toml") {
    Write-Host "  -> Detected: Rust" -ForegroundColor Green
    $buildCmd = "cargo build --release"
}
elseif (Test-Path "$Path\go.mod") {
    Write-Host "  -> Detected: Go" -ForegroundColor Green
    $buildCmd = "go build ."
}

# 3. EXECUTION: The Hands
Write-Host "[3/3] Executing Forge Sequence..." -ForegroundColor Yellow

if ($null -ne $installCmd) {
    Write-Host "  -> Installing Dependencies: $installCmd" -ForegroundColor Cyan
    Invoke-Expression "cd '$Path'; $installCmd"
}

if ($null -ne $buildCmd) {
    Write-Host "  -> Building: $buildCmd" -ForegroundColor Cyan
    try {
        Invoke-Expression "cd '$Path'; $buildCmd"
        Write-Host "=====================================================" -ForegroundColor Cyan
        Write-Host "       BUILD COMPLETE. ARTIFACT READY." -ForegroundColor Cyan
        Write-Host "=====================================================" -ForegroundColor Cyan
    } catch {
        Write-Error "Build Failed: $_"
    }
} else {
    if ($null -eq $installCmd) {
        Write-Warning "No standard build pattern detected. Manual intervention required."
        if (Get-Command rg -ErrorAction SilentlyContinue) {
            Write-Host "  -> Searching for 'build' scripts with 'rg'..."
            rg "build" "$Path" | Select-Object -First 5
        }
    } else {
         Write-Host "=====================================================" -ForegroundColor Cyan
         Write-Host "       SETUP COMPLETE (No Build Step). READY." -ForegroundColor Cyan
         Write-Host "=====================================================" -ForegroundColor Cyan
    }
}
