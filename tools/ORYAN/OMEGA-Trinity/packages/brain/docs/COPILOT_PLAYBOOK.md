# GitHub Copilot Playbook for gAIng-brAin

## Overview

This playbook provides step-by-step instructions for using GitHub Copilot as a worker in the gAIng-brAin repository. Copilot can help automate code generation, documentation, and issue resolution.

## Prerequisites

### Required Access
- GitHub Copilot Pro, Pro+, Business, or Enterprise license
- Write access to the megas-DIO/gAIng-brAin repository
- Repository Copilot features enabled (see Activation section)

### Current Status
**IMPORTANT**: As of this writing, the repository owner needs an active Copilot license to assign tasks to Copilot. The coding agent feature is available in the repository settings but requires subscription activation.

## Activation Steps

### 1. Enable Copilot for Your Account
1. Go to GitHub Settings → Copilot
2. Subscribe to Copilot Pro or higher
3. Enable Copilot features for your account

### 2. Verify Repository Access
1. Navigate to: `https://github.com/megas-DIO/gAIng-brAin/settings/copilot/coding_agent`
2. Confirm that "Copilot coding agent" is available
3. Review Internet access settings (firewall/allowlist)

### 3. Configure Repository Instructions
The repository already has:
- `.github/copilot-instructions.md` - Core guidelines for Copilot
- This should be automatically picked up by Copilot when working on the repo

## Using Copilot to Work on Issues

### Method 1: Assign Issue to Copilot (Recommended)

1. **Navigate to the Issue**
   - Go to the Issues tab
   - Select the issue you want Copilot to work on

2. **Assign to Copilot**
   - In the issue sidebar, look for "Assignees"
   - If Copilot is available, you should see an option to assign to Copilot
   - Click to assign

3. **Wait for Copilot Response**
   - Copilot will analyze the issue
   - It will post a comment with its plan
   - It may create a PR automatically

4. **Review Copilot's Work**
   - Check the PR for completeness
   - Verify it follows repo guidelines
   - Test the changes locally
   - Review against OMEGA_SYSTEM_SPEC.md requirements

5. **Provide Feedback**
   - Comment on the PR with requested changes
   - Copilot can iterate based on feedback
   - Use clear, specific instructions

### Method 2: Use Copilot Chat in Issues

1. **Open the Issue**
   - Navigate to the specific issue

2. **Start Copilot Chat**
   - Look for the Copilot icon or "Ask Copilot" button
   - This may be in the issue comment area or sidebar

3. **Request Specific Help**
   Examples:
   - "Create a PR to implement this feature"
   - "Generate PowerShell scripts for this task"
   - "Add documentation for this change"

4. **Follow Copilot's Guidance**
   - Review suggested code
   - Ask for modifications if needed
   - Request Copilot to create the PR

### Method 3: Copilot PR Workflow

1. **Create Issue First** (Always)
   - Never start with code
   - Issue should have clear acceptance criteria
   - Link to relevant docs

2. **Comment with Instructions**
   In the issue, add a comment like:
   ```
   @copilot Please create a PR for this issue with the following:
   - Implement the feature as described
   - Add PowerShell scripts in /scripts/
   - Update /docs/DECISIONS.md with rationale
   - Follow .github/copilot-instructions.md guidelines
   ```

3. **Review the Generated PR**
   - Check file completeness (no diffs/patches)
   - Verify PowerShell syntax
   - Ensure documentation is updated
   - Test on Windows

## Best Practices

### Writing Good Issues for Copilot

✅ **Good Issue Structure:**
```markdown
## Goal
Clear, concise description of what needs to be done

## Context
- Link to relevant docs
- Related issues or PRs
- System constraints

## Acceptance Criteria
- [ ] Specific, testable requirement 1
- [ ] Specific, testable requirement 2
- [ ] Documentation updated
- [ ] Tests added

## Technical Notes
- Use PowerShell for scripts
- Follow OMEGA_SYSTEM_SPEC.md
- Update DECISIONS.md
```

❌ **Avoid:**
- Vague descriptions
- Missing context
- No acceptance criteria
- Assuming Copilot knows repo conventions

### Reviewing Copilot's Work

**Always Check:**
1. ✅ Files are complete (not diffs)
2. ✅ PowerShell scripts have proper error handling
3. ✅ Documentation is updated
4. ✅ DECISIONS.md has new entries
5. ✅ No hardcoded secrets or paths
6. ✅ Code follows repo conventions
7. ✅ PR links to issue

**Common Issues to Watch For:**
- Copilot may generate Bash instead of PowerShell
- May forget to update documentation
- Might not follow OMEGA system patterns
- Could create partial files instead of complete ones

### Iterating with Copilot

If the first PR isn't quite right:

1. **Be Specific in Feedback**
   ```
   The script needs to:
   - Use PowerShell approved verbs (Get-, Set-, etc.)
   - Include try/catch blocks
   - Add Write-Host for status updates
   ```

2. **Reference Repo Guidelines**
   ```
   Please update this to follow .github/copilot-instructions.md,
   specifically the PowerShell style guide and error handling patterns.
   ```

3. **Request Complete Rewrites if Needed**
   ```
   This file needs to be completely rewritten. Please provide the full
   file content, not a diff.
   ```

## OMEGA-Specific Workflows

### Creating OMEGA Worker Implementations

1. **Issue Template**
   ```markdown
   ## Worker Role
   [Planner|Builder|Researcher|Critic|Synthesizer]
   
   ## Implementation Requirements
   - Read /docs/WORKERS/[ROLE].md
   - Follow OMEGA_SYSTEM_SPEC.md message schema
   - Implement "propose vs execute" pattern
   - Add logging to DECISIONS.md
   
   ## Deliverables
   - [ ] PowerShell script in /scripts/workers/
   - [ ] Update /docs/WORKERS/[ROLE].md with usage
   - [ ] Add examples to documentation
   - [ ] Test script with sample mission
   ```

2. **Copilot Instruction**
   ```
   @copilot Implement this worker role following the OMEGA system
   specification. Use PowerShell, include complete error handling,
   and update all relevant documentation.
   ```

### Creating MCP Server Configs

1. **Issue Structure**
   ```markdown
   ## MCP Server
   [filesystem|github|web-search]
   
   ## Configuration Needs
   - Server name and command
   - Required environment variables
   - Security considerations
   - Windows compatibility
   
   ## Deliverables
   - [ ] Update /mcp/servers.json
   - [ ] Add to /mcp/.env.example
   - [ ] Create /scripts/start-mcp-[server].ps1
   - [ ] Document in /docs/MCP/README.md
   ```

## Troubleshooting

### Copilot Not Appearing
- Verify your Copilot subscription is active
- Check repository access permissions
- Ensure you're signed in to GitHub
- Try refreshing the page

### Copilot Can't Create PRs
- Confirm you have write access to the repo
- Check if branch protection rules prevent auto-PRs
- Verify Copilot has repo access in settings

### Generated Code Doesn't Follow Guidelines
- Reference `.github/copilot-instructions.md` explicitly
- Provide specific examples in your request
- Break complex tasks into smaller issues
- Iterate with clear feedback

### PowerShell Scripts Don't Work
- Test on Windows PowerShell 5.1+ first
- Check for Bash-isms (e.g., `#!/bin/bash`)
- Verify error handling is present
- Review parameter validation

## Quick Reference Commands

### In Issue Comments
```
@copilot create a PR for this issue
@copilot help me implement [specific feature]
@copilot update the PR based on review feedback
@copilot explain this error: [paste error]
```

### In PR Reviews
```
@copilot fix the linting errors
@copilot add tests for this function
@copilot update documentation for these changes
@copilot make this more efficient
```

## Advanced Usage

### Multi-Step Tasks

1. Break into separate issues
2. Create a tracking issue linking sub-issues
3. Assign each sub-issue to Copilot sequentially
4. Merge PRs in dependency order

### Integration with OMEGA

When using Copilot as an OMEGA worker:

1. **Mission Assignment**
   - Create issue using mission template
   - Tag with `omega:mission` label
   - Assign to Copilot

2. **Worker Response**
   - Copilot should follow OMEGA message schema
   - Check for plan → action → result structure
   - Verify decision logging

3. **Synthesizer Review**
   - Human reviews Copilot's output
   - Provides feedback via OMEGA protocol
   - Merges when acceptance criteria met

## Learning Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- `/docs/OMEGA_SYSTEM_SPEC.md` - System architecture
- `/docs/GAING_WAR_ROOM.md` - Project overview
- `.github/copilot-instructions.md` - Copilot guidelines

## Getting Help

If you encounter issues:
1. Check this playbook
2. Review GitHub Copilot docs
3. Ask in repository Discussions
4. Create an issue with the `question` label

---

**Last Updated**: 2026-01-04
**Maintainer**: @megas-DIO
**Status**: Active - License activation pending
