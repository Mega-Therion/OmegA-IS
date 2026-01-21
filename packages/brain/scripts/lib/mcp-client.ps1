<#
.SYNOPSIS
    MCP Client helper functions for OMEGA workers.

.DESCRIPTION
    PowerShell library providing helper functions for interacting with MCP servers.
    Import this file in your scripts using: . ./scripts/lib/mcp-client.ps1

.EXAMPLE
    . ./scripts/lib/mcp-client.ps1
    $status = Test-McpServer -Server "filesystem"
    Read-McpFile -Path "README.md"
#>

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

$script:McpConfigPath = Join-Path $PSScriptRoot "../../mcp/servers.json"
$script:McpEnvPath = Join-Path $PSScriptRoot "../../mcp/.env"

function Get-McpConfig {
    <#
    .SYNOPSIS
        Get MCP server configuration.
    #>
    if (-not (Test-Path $script:McpConfigPath)) {
        throw "MCP configuration not found at $script:McpConfigPath"
    }
    return Get-Content $script:McpConfigPath -Raw | ConvertFrom-Json
}

function Initialize-McpEnvironment {
    <#
    .SYNOPSIS
        Load MCP environment variables from .env file.
    #>
    if (Test-Path $script:McpEnvPath) {
        Get-Content $script:McpEnvPath | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
        return $true
    }
    return $false
}

# -----------------------------------------------------------------------------
# Server Management
# -----------------------------------------------------------------------------

function Test-McpServer {
    <#
    .SYNOPSIS
        Test if an MCP server is available.
    .PARAMETER Server
        Name of the server to test.
    #>
    param([string]$Server)
    
    $config = Get-McpConfig
    $serverConfig = $config.servers | Where-Object { $_.name -eq $Server }
    
    if (-not $serverConfig) {
        return @{
            Available = $false
            Error = "Server '$Server' not found in configuration"
        }
    }
    
    # Check if command is available
    $command = $serverConfig.command
    $available = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    
    return @{
        Available = $available
        Server = $Server
        Command = $command
        Error = if (-not $available) { "Command '$command' not found" } else { $null }
    }
}

function Get-McpServerStatus {
    <#
    .SYNOPSIS
        Get status of all MCP servers.
    #>
    $config = Get-McpConfig
    $results = @()
    
    foreach ($srv in $config.servers) {
        $status = Test-McpServer -Server $srv.name
        $results += @{
            Name = $srv.name
            Available = $status.Available
            Command = $srv.command
        }
    }
    
    return $results
}

# -----------------------------------------------------------------------------
# Filesystem Operations (via MCP filesystem server)
# -----------------------------------------------------------------------------

function Read-McpFile {
    <#
    .SYNOPSIS
        Read a file through MCP filesystem server.
    .PARAMETER Path
        Path to the file to read.
    #>
    param([string]$Path)
    
    # For now, use direct file access
    # TODO: Implement MCP protocol communication
    if (Test-Path $Path) {
        return Get-Content $Path -Raw
    }
    throw "File not found: $Path"
}

function Write-McpFile {
    <#
    .SYNOPSIS
        Write content to a file through MCP filesystem server.
    .PARAMETER Path
        Path to the file to write.
    .PARAMETER Content
        Content to write.
    #>
    param(
        [string]$Path,
        [string]$Content
    )
    
    # For now, use direct file access
    # TODO: Implement MCP protocol communication
    $Content | Out-File $Path -Encoding UTF8
}

function Get-McpDirectory {
    <#
    .SYNOPSIS
        List directory contents through MCP filesystem server.
    .PARAMETER Path
        Path to the directory to list.
    #>
    param([string]$Path = ".")
    
    # For now, use direct directory access
    # TODO: Implement MCP protocol communication
    return Get-ChildItem $Path | Select-Object Name, Mode, Length, LastWriteTime
}

# -----------------------------------------------------------------------------
# GitHub Operations (via MCP GitHub server)
# -----------------------------------------------------------------------------

function Get-McpGitHubIssues {
    <#
    .SYNOPSIS
        Get GitHub issues through MCP GitHub server.
    .PARAMETER Repo
        Repository in format "owner/repo".
    .PARAMETER State
        Issue state: "open", "closed", or "all".
    #>
    param(
        [string]$Repo,
        [string]$State = "open"
    )
    
    # TODO: Implement MCP protocol communication
    # For now, return placeholder
    return @{
        Error = "GitHub MCP operations not yet implemented"
        Suggestion = "Use GitHub CLI: gh issue list"
    }
}

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------

function Write-McpLog {
    <#
    .SYNOPSIS
        Write a log entry for MCP operations.
    #>
    param(
        [string]$Level,
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { "Gray" }
        "OK" { "Green" }
        "WARN" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# Export functions
Export-ModuleMember -Function @(
    'Get-McpConfig',
    'Initialize-McpEnvironment',
    'Test-McpServer',
    'Get-McpServerStatus',
    'Read-McpFile',
    'Write-McpFile',
    'Get-McpDirectory',
    'Get-McpGitHubIssues',
    'Write-McpLog'
) -ErrorAction SilentlyContinue

Write-Host "[MCP] Client library loaded" -ForegroundColor Cyan
