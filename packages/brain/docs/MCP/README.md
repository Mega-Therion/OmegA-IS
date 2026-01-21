# Model Context Protocol (MCP) Integration

## Overview

The Model Context Protocol (MCP) is an open standard that enables AI applications to securely connect to local and remote data sources. In the gAIng-brAin ecosystem, MCP servers provide OMEGA workers with controlled access to:

- **File System**: Read/write project files, logs, and configurations
- **GitHub**: Query repositories, create issues, manage PRs
- **Web Resources**: Search the web, fetch documentation, access APIs

MCP acts as the "nervous system" connecting AI workers to their tools and data.

## Architecture

```
[OMEGA Workers] <--> [MCP Client] <--> [MCP Servers] <--> [Resources]
                                           |
                                           +-- filesystem-server
                                           +-- github-server
                                           +-- web-search-server
```

## Configured Servers

### 1. Filesystem Server
**Purpose**: Access project files for reading/writing code, docs, and data

**Capabilities**:
- Read file contents
- Write/update files
- List directory contents
- Search files by pattern

**Use Cases**:
- Reading OMEGA specs and worker definitions
- Writing generated code and documentation
- Updating DECISIONS.md and CANON.md
- Managing project structure

**Security**:
- Limited to repository root and subdirectories
- No access to system files or parent directories
- All operations logged

### 2. GitHub Server
**Purpose**: Interact with GitHub repositories, issues, and pull requests

**Capabilities**:
- Search repositories and code
- Read/create/update issues
- Create and manage pull requests
- Read repository contents
- Manage labels and milestones

**Use Cases**:
- OMEGA workers creating issues for sub-tasks
- Automated PR creation
- Issue triage and labeling
- Repository analysis

**Authentication**:
- Requires GitHub Personal Access Token (PAT)
- Token stored in environment variable
- Minimum scopes: `repo`, `read:org`

### 3. Web Search Server (Optional)
**Purpose**: Search the web for information and documentation

**Capabilities**:
- Perform web searches
- Fetch webpage content
- Extract structured data

**Use Cases**:
- Research tasks
- Finding documentation
- Gathering context for decisions

**Rate Limiting**:
- Respects search engine rate limits
- Caches results when possible

## Configuration

### Server Configuration File

MCP servers are configured in `/mcp/servers.json` (or similar). Example structure:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "<ROOT_PATH>"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Environment Variables

Secrets are managed via environment variables. Copy `/mcp/.env.example` to `/mcp/.env` and fill in values:

```bash
# GitHub Access
GITHUB_TOKEN=ghp_YourPersonalAccessTokenHere

# Optional: Web Search
SEARCH_API_KEY=your_search_api_key_here
```

**NEVER commit `.env` files to the repository!**

## Setup Instructions (Windows)

### Prerequisites

1. **Node.js**: Version 18 or higher
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **PowerShell**: Version 5.1 or higher (included in Windows)
   - Verify: `$PSVersionTable.PSVersion`

3. **GitHub Personal Access Token**
   - Generate at: Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Required scopes: `repo`, `read:org`

### Step-by-Step Setup

1. **Clone Repository** (if not already done)
   ```powershell
   git clone https://github.com/megas-DIO/gAIng-brAin.git
   cd gAIng-brAin
   ```

2. **Configure Environment**
   ```powershell
   # Copy environment template
   Copy-Item mcp\.env.example mcp\.env
   
   # Edit .env file with your tokens
   notepad mcp\.env
   ```

3. **Validate Configuration**
   ```powershell
   # Run validation script
   .\scripts\validate-mcp.ps1
   ```

4. **Start MCP Servers**
   ```powershell
   # Start all configured servers
   .\scripts\start-mcp.ps1
   ```

### Verification

To verify MCP is working:

1. Check server processes are running
2. Review logs in `/logs/mcp-*.log`
3. Test with a simple filesystem read operation
4. Verify GitHub API access

## PowerShell Scripts

The repository includes PowerShell scripts for MCP management:

### start-mcp.ps1
**Purpose**: Start all configured MCP servers

```powershell
.\scripts\start-mcp.ps1

# Start specific server
.\scripts\start-mcp.ps1 -Server filesystem

# Verbose output
.\scripts\start-mcp.ps1 -Verbose
```

### stop-mcp.ps1
**Purpose**: Stop all running MCP servers

```powershell
.\scripts\stop-mcp.ps1

# Stop specific server
.\scripts\stop-mcp.ps1 -Server github
```

### validate-mcp.ps1
**Purpose**: Validate configuration and connectivity

```powershell
.\scripts\validate-mcp.ps1

# Output:
# ✅ Node.js installed (v18.17.0)
# ✅ Environment file exists
# ✅ GITHUB_TOKEN configured
# ✅ Filesystem server accessible
# ✅ GitHub API connection successful
```

### restart-mcp.ps1
**Purpose**: Restart servers (useful after config changes)

```powershell
.\scripts\restart-mcp.ps1
```

## Integration with OMEGA

### Worker Access Patterns

OMEGA workers access MCP through structured requests:

```powershell
# Example: Planner reads mission spec
$spec = Invoke-McpRequest -Server filesystem -Action read -Path "docs/OMEGA_SYSTEM_SPEC.md"

# Example: Builder creates issue
Invoke-McpRequest -Server github -Action create-issue -Title "Implement feature X" -Body $description

# Example: Researcher searches web
$results = Invoke-McpRequest -Server web-search -Action search -Query "MCP protocol best practices"
```

### Security Model

1. **Least Privilege**: Each worker has minimal necessary access
2. **Audit Logging**: All MCP operations are logged
3. **Request Validation**: Worker requests are validated against schema
4. **Rate Limiting**: Prevents abuse of external APIs

## Troubleshooting

### Common Issues

**Problem**: "Node.js not found"
```powershell
# Solution: Install Node.js
winget install OpenJS.NodeJS
# Or download from https://nodejs.org/
```

**Problem**: "GITHUB_TOKEN not configured"
```powershell
# Solution: Set in .env file
Set-Content -Path mcp\.env -Value "GITHUB_TOKEN=ghp_YourTokenHere"
```

**Problem**: "Server won't start"
```powershell
# Check logs
Get-Content logs\mcp-*.log -Tail 50

# Verify configuration
.\scripts\validate-mcp.ps1

# Try manual start for debugging
npx -y @modelcontextprotocol/server-filesystem .
```

**Problem**: "GitHub API rate limit exceeded"
- Wait for rate limit reset (check headers in logs)
- Use authenticated token (higher limits)
- Implement request caching

### Debug Mode

Enable detailed logging:

```powershell
$env:MCP_DEBUG = "true"
.\scripts\start-mcp.ps1
```

Log files will include:
- All requests and responses
- Timing information
- Error stack traces

## Best Practices

### Security

1. **Never commit secrets**
   - Use `.env` files (gitignored)
   - Rotate tokens regularly
   - Use minimal scopes

2. **Validate all inputs**
   - Check file paths
   - Sanitize user input
   - Validate API responses

3. **Monitor access**
   - Review logs regularly
   - Alert on suspicious patterns
   - Track API usage

### Performance

1. **Cache responses** where appropriate
2. **Batch requests** to reduce overhead
3. **Use async operations** for I/O
4. **Implement timeouts** for all requests

### Reliability

1. **Handle errors gracefully**
   - Retry transient failures
   - Fall back to alternatives
   - Log all errors

2. **Health checks**
   - Monitor server availability
   - Test connectivity regularly
   - Alert on failures

## Future Enhancements

Planned additions:

- **Database Server**: For structured data storage
- **Slack Server**: For team notifications
- **Email Server**: For automated communications
- **Analytics Server**: For metrics and monitoring

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [OMEGA System Spec](/docs/OMEGA_SYSTEM_SPEC.md)
- [gAIng War Room](/docs/GAING_WAR_ROOM.md)

## Support

For issues:
1. Check this documentation
2. Review logs in `/logs/`
3. Run validation script
4. Create issue with `mcp` label

---

**Last Updated**: 2026-01-04
**Status**: Active Development
**Maintainer**: @megas-DIO
