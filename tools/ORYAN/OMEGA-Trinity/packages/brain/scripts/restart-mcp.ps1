<#
.SYNOPSIS
    Restart MCP (Model Context Protocol) servers.

.DESCRIPTION
    Stops and then starts MCP servers.

.PARAMETER Server
    Optional. Name of specific server to restart. If omitted, restarts all servers.

.PARAMETER Background
    If specified, starts servers in background mode after restart.

.EXAMPLE
    .\restart-mcp.ps1
    Restarts all MCP servers.

.EXAMPLE
    .\restart-mcp.ps1 -Server github -Background
    Restarts only the github server in background mode.
#>

param(
    [string]$Server = "",
    [switch]$Background
)

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[MCP] Restarting MCP Servers" -ForegroundColor Cyan
Write-Host "=" * 50

# Stop servers
Write-Host "`n[PHASE 1] Stopping servers..." -ForegroundColor Yellow
if ($Server -ne "") {
    & "$ScriptRoot\stop-mcp.ps1" -Server $Server
} else {
    & "$ScriptRoot\stop-mcp.ps1"
}

# Brief pause to ensure clean shutdown
Start-Sleep -Seconds 2

# Start servers
Write-Host "`n[PHASE 2] Starting servers..." -ForegroundColor Yellow
if ($Server -ne "" -and $Background) {
    & "$ScriptRoot\start-mcp.ps1" -Server $Server -Background
} elseif ($Server -ne "") {
    & "$ScriptRoot\start-mcp.ps1" -Server $Server
} elseif ($Background) {
    & "$ScriptRoot\start-mcp.ps1" -Background
} else {
    & "$ScriptRoot\start-mcp.ps1"
}

Write-Host "`n" + "=" * 50
Write-Host "[MCP] Restart complete!" -ForegroundColor Green
