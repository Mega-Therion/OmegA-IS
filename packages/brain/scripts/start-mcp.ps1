<#
.SYNOPSIS
    Start MCP (Model Context Protocol) servers for OMEGA workers.

.DESCRIPTION
    Starts one or all MCP servers defined in mcp/servers.json.
    Loads environment variables from mcp/.env if it exists.

.PARAMETER Server
    Optional. Name of specific server to start. If omitted, starts all servers.

.PARAMETER Background
    If specified, runs servers in background mode.

.EXAMPLE
    .\start-mcp.ps1
    Starts all MCP servers.

.EXAMPLE
    .\start-mcp.ps1 -Server filesystem
    Starts only the filesystem server.

.EXAMPLE
    .\start-mcp.ps1 -Background
    Starts all servers in background mode.
#>

param(
    [string]$Server = "",
    [switch]$Background
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot
$McpDir = Join-Path $RepoRoot "mcp"
$ConfigFile = Join-Path $McpDir "servers.json"
$EnvFile = Join-Path $McpDir ".env"
$PidFile = Join-Path $McpDir "mcp-servers.pid"

Write-Host "`n[MCP] Starting MCP Servers" -ForegroundColor Cyan
Write-Host "=" * 50

# Validate configuration exists
if (-not (Test-Path $ConfigFile)) {
    Write-Host "[ERROR] Config file not found: $ConfigFile" -ForegroundColor Red
    Write-Host "Run: .\scripts\Validate-MCP.ps1 to check setup" -ForegroundColor Yellow
    exit 1
}

# Load environment variables from .env file
if (Test-Path $EnvFile) {
    Write-Host "[INFO] Loading environment from $EnvFile" -ForegroundColor Gray
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "[WARN] No .env file found at $EnvFile" -ForegroundColor Yellow
    Write-Host "       Some servers may require environment variables" -ForegroundColor Yellow
}

# Parse server configuration
$config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$servers = $config.servers

if ($Server -ne "") {
    $servers = $servers | Where-Object { $_.name -eq $Server }
    if ($servers.Count -eq 0) {
        Write-Host "[ERROR] Server '$Server' not found in configuration" -ForegroundColor Red
        Write-Host "Available servers:" -ForegroundColor Yellow
        $config.servers | ForEach-Object { Write-Host "  - $($_.name)" }
        exit 1
    }
}

# Track started processes
$startedProcesses = @()

foreach ($srv in $servers) {
    Write-Host "`n[MCP] Starting $($srv.name)..." -ForegroundColor Cyan
    
    # Build command arguments
    $cmdArgs = $srv.args -join " "
    
    # Set server-specific environment variables
    if ($srv.env) {
        $srv.env.PSObject.Properties | ForEach-Object {
            $envValue = $_.Value
            # Expand environment variable references
            if ($envValue -match '\$\{(\w+)\}') {
                $envVar = $matches[1]
                $actualValue = [Environment]::GetEnvironmentVariable($envVar)
                if ($actualValue) {
                    $envValue = $envValue -replace '\$\{' + $envVar + '\}', $actualValue
                }
            }
            [Environment]::SetEnvironmentVariable($_.Name, $envValue, "Process")
        }
    }
    
    try {
        if ($Background) {
            # Start in background
            $process = Start-Process -FilePath $srv.command -ArgumentList $srv.args `
                -WindowStyle Hidden -PassThru
            $startedProcesses += @{
                Name = $srv.name
                PID = $process.Id
            }
            Write-Host "[OK] $($srv.name) started (PID: $($process.Id))" -ForegroundColor Green
        } else {
            # Start in foreground (for single server)
            Write-Host "[INFO] Running $($srv.command) $cmdArgs" -ForegroundColor Gray
            if ($servers.Count -eq 1) {
                & $srv.command $srv.args
            } else {
                # For multiple servers, start in separate windows
                Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", 
                    "Write-Host '[MCP] $($srv.name) Server' -ForegroundColor Cyan; & $($srv.command) $cmdArgs"
                Write-Host "[OK] $($srv.name) started in new window" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "[ERROR] Failed to start $($srv.name): $_" -ForegroundColor Red
    }
}

# Save PIDs if running in background
if ($Background -and $startedProcesses.Count -gt 0) {
    $startedProcesses | ConvertTo-Json | Out-File $PidFile -Encoding UTF8
    Write-Host "`n[INFO] Process IDs saved to $PidFile" -ForegroundColor Gray
}

Write-Host "`n" + "=" * 50
Write-Host "[MCP] Startup complete!" -ForegroundColor Green
Write-Host "Use .\scripts\stop-mcp.ps1 to stop servers" -ForegroundColor Gray
