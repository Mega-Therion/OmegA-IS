# GitHub Copilot Instructions for gAIng-brAin

This file provides instructions for GitHub Copilot when working on this repository.

## Repository Context

This is the **gAIng-brAin** repository - a collective memory and archive database for AI collaboration. The repository implements the OMEGA (Orchestrated Multi-agent Execution & Goal Alignment) system for managing AI worker coordination.

## Core Principles

### 1. PowerShell First
- All automation scripts MUST be written in PowerShell (.ps1)
- Windows is the primary development environment
- Include proper error handling and validation
- Use Write-Host for user feedback

### 2. Complete Files Only
- NEVER generate diffs or patches
- ALWAYS provide complete, working files
- Include all necessary imports and dependencies
- Ensure files are production-ready

### 3. Documentation Standards
- Every code change requires documentation updates
- Update /docs/DECISIONS.md for architectural decisions
- Follow the OMEGA system specification in /docs/OMEGA_SYSTEM_SPEC.md
- Keep CANON.md updated for system-wide truths

### 4. Minimal Changes
- Make the smallest possible change to achieve the goal
- Don't refactor unless explicitly requested
- Preserve existing patterns and conventions
- Comment why, not what

### 5. Testing Requirements
- Include tests for new functionality where applicable
- PowerShell scripts should include validation checks
- Document test procedures in PR description

## File Organization

```
/docs/               # All documentation
  /WORKERS/          # Worker role definitions
  /MCP/              # Model Context Protocol docs
  OMEGA_SYSTEM_SPEC.md
  CANON.md
  DECISIONS.md
  GAING_WAR_ROOM.md
/.github/
  /ISSUE_TEMPLATE/
  /workflows/        # GitHub Actions
  CODEOWNERS
  copilot-instructions.md (this file)
/scripts/            # PowerShell automation
/mcp/                # MCP server configurations
/src/                # Source code
/public/             # Public assets
```

## Issue & PR Workflow

1. **Read the Issue First**: Always check /docs/GAING_WAR_ROOM.md and the issue description
2. **Plan Before Coding**: Comment your approach in the issue before creating PR
3. **Link to Issue**: Every PR must reference an issue
4. **Update DECISIONS.md**: Document why you made key choices
5. **Test Locally**: Especially for PowerShell scripts on Windows

## Key System Concepts

### OMEGA System
- Mission-based task execution
- Worker roles: Planner, Builder, Researcher, Critic, Synthesizer
- "Propose vs Execute" paradigm (always propose destructive actions first)
- Decision logging for all architectural choices

### MCP Integration
- Model Context Protocol servers for tool access
- Secure environment variable management
- Never commit secrets or API keys
- Use .env.example for templates

## Code Style

### PowerShell
```powershell
# Use approved verbs
function Get-McpServerStatus {}

# Include parameter validation
param(
    [Parameter(Mandatory=$true)]
    [string]$ServerName
)

# Proper error handling
try {
    # Logic here
} catch {
    Write-Error "Failed: $_"
    exit 1
}
```

### Markdown
- Use ATX-style headers (# ## ###)
- Include code fences with language tags
- Link to related docs
- Keep line length reasonable for readability

## Security

- NO hardcoded credentials or tokens
- Use environment variables for secrets
- Include .env.example, never .env
- Validate all user inputs in scripts
- Document required permissions

## When in Doubt

1. Check /docs/OMEGA_SYSTEM_SPEC.md for system architecture
2. Review /docs/CANON.md for ground truths
3. Look at existing code patterns
4. Ask for clarification in the issue
5. Document assumptions in your PR

## What NOT to Do

- ❌ Don't create diffs/patches - provide complete files
- ❌ Don't skip documentation updates
- ❌ Don't hardcode Windows-specific paths without checks
- ❌ Don't commit secrets or .env files
- ❌ Don't make breaking changes without discussion
- ❌ Don't ignore existing code patterns

## Success Criteria

✅ Code runs on Windows PowerShell 5.1+
✅ Documentation is updated
✅ DECISIONS.md includes rationale
✅ Tests pass (or test plan provided)
✅ PR links to issue
✅ No secrets committed
