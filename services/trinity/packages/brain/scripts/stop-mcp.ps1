<#
.SYNOPSIS
    Stop MCP (Model Context Protocol) servers.

.DESCRIPTION
    Stops one or all running MCP server processes.

.PARAMETER Server
    Optional. Name of specific server to stop. If omitted, stops all servers.

.PARAMETER Force
    If specified, forcefully terminates processes.

.EXAMPLE
    .\stop-mcp.ps1
    Stops all MCP servers.

.EXAMPLE
    .\stop-mcp.ps1 -Server filesystem
    Stops only the filesystem server.
#>

param(
    [string]$Server = "",
    [switch]$Force
)

$ErrorActionPreference = "Continue"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot
$McpDir = Join-Path $RepoRoot "mcp"
$PidFile = Join-Path $McpDir "mcp-servers.pid"

Write-Host "`n[MCP] Stopping MCP Servers" -ForegroundColor Cyan
Write-Host "=" * 50

$stoppedCount = 0

# Try to use saved PID file first
if (Test-Path $PidFile) {
    Write-Host "[INFO] Reading saved process IDs..." -ForegroundColor Gray
    $savedProcesses = Get-Content $PidFile -Raw | ConvertFrom-Json
    
    foreach ($proc in $savedProcesses) {
        if ($Server -ne "" -and $proc.Name -ne $Server) {
            continue
        }
        
        try {
            $process = Get-Process -Id $proc.PID -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "[STOP] Stopping $($proc.Name) (PID: $($proc.PID))..." -ForegroundColor Yellow
                if ($Force) {
                    Stop-Process -Id $proc.PID -Force
                } else {
                    Stop-Process -Id $proc.PID
                }
                $stoppedCount++
                Write-Host "[OK] $($proc.Name) stopped" -ForegroundColor Green
            } else {
                Write-Host "[INFO] $($proc.Name) (PID: $($proc.PID)) already stopped" -ForegroundColor Gray
            }
        } catch {
            Write-Host "[WARN] Could not stop $($proc.Name): $_" -ForegroundColor Yellow
        }
    }
    
    # Clean up PID file if all stopped
    if ($Server -eq "") {
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
}

# Also try to find any running MCP-related npx processes
Write-Host "`n[INFO] Checking for any remaining MCP processes..." -ForegroundColor Gray

$mcpProcesses = Get-Process -Name "node", "npx" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "modelcontextprotocol" -or 
    $_.MainWindowTitle -match "MCP"
}

foreach ($proc in $mcpProcesses) {
    try {
        Write-Host "[STOP] Stopping orphan process (PID: $($proc.Id))..." -ForegroundColor Yellow
        if ($Force) {
            Stop-Process -Id $proc.Id -Force
        } else {
            Stop-Process -Id $proc.Id
        }
        $stoppedCount++
    } catch {
        Write-Host "[WARN] Could not stop process $($proc.Id): $_" -ForegroundColor Yellow
    }
}

Write-Host "`n" + "=" * 50
if ($stoppedCount -gt 0) {
    Write-Host "[MCP] Stopped $stoppedCount process(es)" -ForegroundColor Green
} else {
    Write-Host "[MCP] No running MCP processes found" -ForegroundColor Gray
}
