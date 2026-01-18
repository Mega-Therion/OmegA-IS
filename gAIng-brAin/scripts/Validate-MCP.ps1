<#
.SYNOPSIS
    Validate and Diagnose MCP Server Configuration
.DESCRIPTION
    Comprehensive diagnostics for MCP server startup failures
#>

param(
    [string]$Workspace = (Get-Location).Path,
    [switch]$LaunchInspector
)

$ErrorActionPreference = 'Continue'

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  MCP SERVER DIAGNOSTICS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Workspace: $Workspace" -ForegroundColor Gray
Write-Host ""

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "    [ERROR] Node.js not found. Install with:" -ForegroundColor Red
    Write-Host "    winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = node --version
Write-Host "    [OK] Node.js $nodeVersion" -ForegroundColor Green

# 2. Check npx
Write-Host ""
Write-Host "[2/5] Checking npx..." -ForegroundColor Yellow
try {
    $npxVersion = npx --version
    Write-Host "    [OK] npx $npxVersion" -ForegroundColor Green
} catch {
    Write-Host "    [ERROR] npx not available" -ForegroundColor Red
    exit 1
}

# 3. Test filesystem MCP server
Write-Host ""
Write-Host "[3/5] Testing MCP filesystem server..." -ForegroundColor Yellow
Write-Host "    Installing/checking @modelcontextprotocol/server-filesystem..." -ForegroundColor Gray
try {
    $testCmd = "npx -y @modelcontextprotocol/server-filesystem --version 2>&1"
    $output = Invoke-Expression $testCmd
    Write-Host "    [OK] Filesystem server is available" -ForegroundColor Green
} catch {
    Write-Host "    [WARN] Could not verify server (may still work)" -ForegroundColor Yellow
}

# 4. Check MCP config
Write-Host ""
Write-Host "[4/5] Checking MCP configuration..." -ForegroundColor Yellow
$mcpConfigPath = Join-Path (Split-Path -Parent $PSScriptRoot) ".vscode\mcp.json"
if (Test-Path $mcpConfigPath) {
    Write-Host "    [OK] Found: $mcpConfigPath" -ForegroundColor Green
    $config = Get-Content $mcpConfigPath | ConvertFrom-Json
    Write-Host "    Servers configured: $($config.servers.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
} else {
    Write-Host "    [WARN] MCP config not found" -ForegroundColor Yellow
}

# 5. Check PATH configuration
Write-Host ""
Write-Host "[5/5] Checking PATH for Node.js..." -ForegroundColor Yellow
$nodePath = (Get-Command node).Source
$nodeDir = Split-Path -Parent $nodePath
$systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($systemPath -like "*$nodeDir*") {
    Write-Host "    [OK] Node.js is in System PATH" -ForegroundColor Green
} else {
    Write-Host "    [WARN] Node.js not in System PATH (only User PATH)" -ForegroundColor Yellow
    Write-Host "    This may cause MCP servers to fail at login" -ForegroundColor Yellow
    Write-Host "    Fix: Add to System PATH or run scripts after login" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  COMMON FAILURE CAUSES" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Node.js not in System PATH" -ForegroundColor White
Write-Host "   MCP servers start before User PATH is loaded" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Network not ready" -ForegroundColor White
Write-Host "   HTTP-based MCP servers need network at startup" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Package not cached" -ForegroundColor White
Write-Host "   First npx run needs network to download packages" -ForegroundColor Gray
Write-Host ""

if ($LaunchInspector) {
    Write-Host ""
    Write-Host "Launching MCP Inspector..." -ForegroundColor Cyan
    Write-Host "Close with Ctrl+C when done." -ForegroundColor Gray
    Write-Host ""
    npx -y @modelcontextprotocol/inspector npx -y @modelcontextprotocol/server-filesystem "$Workspace"
} else {
    Write-Host "Tip: Run with -LaunchInspector to test MCP servers interactively" -ForegroundColor Gray
    Write-Host ""
}
