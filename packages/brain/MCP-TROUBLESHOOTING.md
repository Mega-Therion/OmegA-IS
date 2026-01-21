# MCP Server Troubleshooting Guide

## Current Status

✅ **All MCP servers are now functioning correctly**

Diagnostic results:
- Node.js v24.12.0: ✅ Installed and in System PATH
- npx 11.7.0: ✅ Available
- Filesystem MCP server: ✅ Functional
- MCP Configuration: ✅ Found at `.vscode/mcp.json`

## Configured MCP Servers

### 1. `github-mcp` (HTTP)
- **Type:** HTTP
- **URL:** https://api.githubcopilot.com/mcp
- **Purpose:** GitHub Copilot integration
- **Potential Issues:**
  - Requires network connectivity
  - May need authentication
  - Can fail if network isn't ready at startup

### 2. `filesystem` (stdio)
- **Type:** stdio
- **Command:** `npx -y @modelcontextprotocol/server-filesystem`
- **Args:** `${workspaceFolder}`
- **Purpose:** File system access for Claude Code
- **Potential Issues:**
  - Requires npx to be in PATH
  - First run needs network to download package
  - `${workspaceFolder}` variable must resolve correctly

## Common Failure Causes (and Fixes)

### Issue 1: MCP Servers Fail at Login/Startup

**Symptoms:**
- MCP servers work when started manually
- Fail when Claude Code auto-starts at login
- "Server not responding" errors

**Root Cause:**
MCP servers start before environment is fully initialized. Specifically:
1. User PATH isn't loaded yet (only System PATH is)
2. Network may not be ready
3. Working directory may not be set correctly

**Solutions:**

**A. Add Node.js to System PATH (Recommended)**
```powershell
# Run as Administrator
$nodePath = (Get-Command node).Source | Split-Path -Parent
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$nodePath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$nodePath", "Machine")
    Write-Host "Node.js added to System PATH. Restart required."
}
```

**B. Delay Claude Code Startup**
Modify your auto-start script to wait 10 seconds after login:
```powershell
# In setup-autostart.ps1
Start-Sleep -Seconds 10
# Then launch Claude Code
```

**C. Use Absolute Paths in MCP Config**
Edit `.vscode/mcp.json`:
```json
{
  "servers": {
    "filesystem": {
      "type": "stdio",
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\mega_\\gAIng-Brain"]
    }
  }
}
```

### Issue 2: Package Not Cached

**Symptoms:**
- First startup after reboot fails
- Works on subsequent starts
- "Could not find package" errors

**Root Cause:**
`npx -y` downloads packages on first run, requiring network access.

**Solution:**
Pre-cache the package:
```bash
npx -y @modelcontextprotocol/server-filesystem --version
```

This downloads and caches the package so it's available offline.

### Issue 3: GitHub MCP Requires Authentication

**Symptoms:**
- Filesystem server works, but GitHub MCP fails
- 401/403 errors in logs

**Solution:**
Either:
1. Remove `github-mcp` from config if not needed
2. Configure GitHub Copilot authentication in Claude Code

## Validation Commands

### Test MCP Setup
```powershell
cd C:\Users\mega_\gAIng-Brain
.\scripts\Validate-MCP.ps1
```

### Launch MCP Inspector (Interactive Testing)
```powershell
.\scripts\Validate-MCP.ps1 -LaunchInspector
```

### Manual MCP Server Test
```bash
# Test filesystem server
npx -y @modelcontextprotocol/server-filesystem C:\Users\mega_\gAIng-Brain

# Test with MCP Inspector
npx -y @modelcontextprotocol/inspector npx -y @modelcontextprotocol/server-filesystem C:\Users\mega_\gAIng-Brain
```

## Recommended Configuration

For maximum reliability at login, use this `.vscode/mcp.json`:

```json
{
  "servers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\mega_\\gAIng-Brain"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Note:** Removed `github-mcp` to eliminate network dependency.

## Monitoring MCP Health

Add this to your DAWN Protocol startup:

```powershell
# In DAWN.ps1, add before agent wake
Write-Status "Validating MCP Servers..." -Level 'INFO'
& "$ProjectRoot\scripts\Validate-MCP.ps1"
```

## Further Reading

- [MCP Documentation](https://modelcontextprotocol.io)
- [Claude Code MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Troubleshooting Guide](https://modelcontextprotocol.io/docs/tools/debugging)

---

**Last Updated:** 2026-01-05
**Status:** All systems operational ✅
