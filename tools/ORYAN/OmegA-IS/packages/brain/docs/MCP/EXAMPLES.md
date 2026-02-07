# MCP Examples

Examples demonstrating how to use Model Context Protocol servers with OMEGA workers.

## Quick Start

### 1. Setup

```powershell
# Validate your setup
.\scripts\Validate-MCP.ps1

# Copy environment template
Copy-Item .\mcp\.env.example .\mcp\.env

# Edit .env with your tokens
notepad .\mcp\.env
```

### 2. Starting Servers

```powershell
# Start all servers (foreground)
.\scripts\start-mcp.ps1

# Start all servers (background)
.\scripts\start-mcp.ps1 -Background

# Start only filesystem server
.\scripts\start-mcp.ps1 -Server filesystem

# Start only GitHub server
.\scripts\start-mcp.ps1 -Server github
```

### 3. Stopping Servers

```powershell
# Stop all servers
.\scripts\stop-mcp.ps1

# Force stop all servers
.\scripts\stop-mcp.ps1 -Force

# Stop specific server
.\scripts\stop-mcp.ps1 -Server filesystem
```

### 4. Restart Servers

```powershell
# Restart all servers
.\scripts\restart-mcp.ps1

# Restart in background mode
.\scripts\restart-mcp.ps1 -Background
```

---

## Using the MCP Client Library

Import the client library in your PowerShell scripts:

```powershell
# Import the library
. ./scripts/lib/mcp-client.ps1

# Initialize environment
Initialize-McpEnvironment

# Check server status
$status = Get-McpServerStatus
$status | Format-Table Name, Available, Command

# Test specific server
$fsStatus = Test-McpServer -Server "filesystem"
if ($fsStatus.Available) {
    Write-Host "Filesystem server is available!"
}
```

---

## Filesystem Server Examples

The filesystem server provides access to local files and directories.

### List Directory

```powershell
. ./scripts/lib/mcp-client.ps1

# List current directory
Get-McpDirectory

# List specific directory
Get-McpDirectory -Path "./src"
```

### Read Files

```powershell
. ./scripts/lib/mcp-client.ps1

# Read a file
$content = Read-McpFile -Path "README.md"
Write-Host $content
```

### Write Files

```powershell
. ./scripts/lib/mcp-client.ps1

# Write to a file
Write-McpFile -Path "output.txt" -Content "Hello from MCP!"
```

---

## GitHub Server Examples

The GitHub server provides access to repositories, issues, and pull requests.

### Prerequisites

1. Create a GitHub Personal Access Token (PAT)
2. Add to `mcp/.env`:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```

### Get Issues

```powershell
. ./scripts/lib/mcp-client.ps1
Initialize-McpEnvironment

# Get open issues (when implemented)
$issues = Get-McpGitHubIssues -Repo "megas-DIO/gAIng-brAin"
```

---

## Integration with OMEGA Workers

### Worker Script Example

```powershell
# worker-example.ps1
# Example OMEGA worker using MCP

# Import MCP client
. ./scripts/lib/mcp-client.ps1

# Initialize
Initialize-McpEnvironment

# Log start
Write-McpLog -Level "INFO" -Message "Worker starting..."

# Check servers
$status = Get-McpServerStatus
foreach ($srv in $status) {
    if ($srv.Available) {
        Write-McpLog -Level "OK" -Message "$($srv.Name) server ready"
    } else {
        Write-McpLog -Level "WARN" -Message "$($srv.Name) server unavailable"
    }
}

# Read project files
$readme = Read-McpFile -Path "README.md"
Write-McpLog -Level "INFO" -Message "README length: $($readme.Length) chars"

# Write output
Write-McpFile -Path "worker-output.txt" -Content "Worker completed at $(Get-Date)"
Write-McpLog -Level "OK" -Message "Worker finished!"
```

---

## Troubleshooting

### Server won't start

1. Check Node.js is installed:
   ```powershell
   node --version
   ```

2. Check npx is available:
   ```powershell
   npx --version
   ```

3. Validate configuration:
   ```powershell
   .\scripts\Validate-MCP.ps1
   ```

### GitHub authentication fails

1. Verify token is set:
   ```powershell
   $env:GITHUB_TOKEN
   ```

2. Check token has required scopes (repo, read:org)

3. Test token with curl:
   ```powershell
   curl -H "Authorization: token $env:GITHUB_TOKEN" https://api.github.com/user
   ```

### Environment variables not loading

1. Check .env file exists:
   ```powershell
   Test-Path .\mcp\.env
   ```

2. Check file format (should be KEY=value, no quotes)

3. Manually load:
   ```powershell
   Initialize-McpEnvironment
   ```

---

## Server Configuration Reference

### servers.json Format

```json
{
  "servers": [
    {
      "name": "server-name",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-name", "arg1"],
      "env": {
        "ENV_VAR": "${ENV_VAR}"
      }
    }
  ]
}
```

### Adding New Servers

1. Find server package at [MCP Servers](https://github.com/modelcontextprotocol/servers)
2. Add configuration to `mcp/servers.json`
3. Add required env vars to `mcp/.env.example`
4. Test with `.\scripts\start-mcp.ps1 -Server your-server`

---

## Best Practices

1. **Never commit secrets** - Always use .env files
2. **Start in background** - Use `-Background` for production
3. **Check status first** - Validate servers before use
4. **Use the client library** - Consistent error handling
5. **Log operations** - Use `Write-McpLog` for debugging
