# CANON: Single Source of Truth

**Status**: Living Document  
**Last Updated**: January 4, 2026  
**Owner**: Ryan (megas-DIO)  
**Purpose**: The definitive reference for all gAIng project decisions, standards, and constraints

---

## What is Canon?

The Canon is the **single source of truth** for the gAIng project. When agents need to know:
- What decisions have been made
- What standards to follow
- What constraints exist
- What the project structure is

...they come here first.

## Project Overview

### Primary Goal
Create a **War Room** where Ryan dictates instructions **once** and the entire AI crew executes in coordination without repetition or divergence.

### Repository
- **Name**: `gAIng-brAin`
- **Owner**: megas-DIO
- **URL**: https://github.com/megas-DIO/gAIng-brAin
- **Purpose**: Collective memory and task coordination hub for AI crew

### AI Crew Members
- Safa (ChatGPT)
- Gemini
- Claude
- DeepSeek
- Perplexity
- Comet
- Grok
- Kimi
- Sora

## Architecture Decisions

### Core Stack
- **Hub**: GitHub (native features first)
- **Shared Context**: GitHub Copilot Spaces
- **Task Queue**: GitHub Issues
- **Execution**: GitHub Copilot coding agent
- **Quality Gate**: Pull Request reviews
- **Memory**: Supabase database (existing)

### Why GitHub?
1. Native integration with development workflow
2. Copilot Spaces provide shared context bundle
3. Issues provide structured task queue
4. PRs provide audit trail and review process
5. All agents can read/write via API or UI
6. Ryan already uses it

### Future: MCP Integration
- After GitHub workflow is solid, add Model Context Protocol
- Will enable cross-agent tool/data sharing
- Not implemented yet - don't build for it prematurely

## File Structure

```
gAIng-brAin/
├── docs/
│   ├── GAING_WAR_ROOM.md    # War Room charter and operating rules
│   ├── CANON.md              # This file - single source of truth
│   └── MCP_ROADMAP.md        # Future MCP integration plan (coming soon)
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── mission.md        # Template for creating Missions
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── scripts/                   # Utility scripts
├── supabase/                  # Database schema and migrations
├── CONTRIBUTING.md            # How to contribute
├── README.md                  # Public-facing documentation
└── [existing application files]
```

## Coding Standards

### General Principles
1. **Clarity over cleverness**: Write code humans can understand
2. **No premature optimization**: Make it work, then make it fast
3. **Test critical paths**: Not everything needs 100% coverage, but core flows do
4. **Document why, not what**: Code shows what it does, comments explain why

### Language-Specific

#### JavaScript/Node.js
- Use ES6+ features (async/await, destructuring, arrow functions)
- Prefer `const` over `let`, never use `var`
- Use meaningful variable names: `userId` not `uid`
- Handle errors explicitly, don't swallow them
- Keep functions small (< 50 lines ideally)

#### Markdown
- Use ATX-style headers (`#` not underlines)
- Include table of contents for docs > 200 lines
- Code blocks must specify language: ```javascript not ```
- Keep line length reasonable (80-120 chars)

### File Naming
- Use kebab-case for files: `my-file.js` not `MyFile.js` or `my_file.js`
- Exception: React components use PascalCase: `MyComponent.jsx`
- Constants files: `ALLCAPS.md` or `ALLCAPS.js`

## Git Workflow

### Branching Strategy
- `main` - production-ready code
- `feature/*` - new features
- `fix/*` - bug fixes
- `docs/*` - documentation updates

### Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- First line < 72 characters
- Reference issue numbers: "Fix login bug (#42)"
- Copilot suggestions are acceptable but should be reviewed

### PR Requirements
1. Must link to originating Issue
2. Must have clear description of changes
3. Must pass any automated checks
4. Should be reviewable (not 1000+ lines)
5. One logical change per PR

## Issue Standards

### All Issues Must Include
- **Objective**: What needs to be accomplished
- **Definition of Done**: Clear acceptance criteria
- **Context**: Why this matters
- **Constraints**: What NOT to do

### Labels (to be created)
- `war-room-foundation` - Core infrastructure
- `agent-pipeline` - Agent execution improvements
- `memory-discipline` - Memory/context management
- `mcp-integration` - MCP work
- `bug` - Something's broken
- `enhancement` - Improvement to existing feature
- `documentation` - Docs only
- `question` - Discussion needed

### Assignment
- `@copilot` - GitHub Copilot coding agent
- `@megas-DIO` - Ryan (for review or manual work)
- Unassigned - backlog

## Security & Privacy

### Sensitive Data
- **Never commit**: API keys, passwords, tokens, credentials
- **Use `.env` files**: Environment variables only, add to `.gitignore`
- **Supabase keys**: Service role key stays secret, anon key can be public

### Authentication
- All API endpoints require Supabase Auth bearer token
- Row-level security (RLS) policies enforce data isolation
- Each user sees only their own data

## Dependencies

### Current Stack
- **Runtime**: Node.js (v18+)
- **Database**: Supabase (PostgreSQL)
- **Memory**: Mem0 API (optional, for /addMemory and /searchMemory)
- **Tunneling**: ngrok (optional, for exposing local dev)

### Adding New Dependencies
- Must have clear justification
- Prefer well-maintained packages (>1k GitHub stars, recent updates)
- Check license compatibility (MIT, Apache 2.0, BSD preferred)
- Document why in PR description

## Testing Philosophy

### What to Test
- API endpoints (happy path + error cases)
- Authentication/authorization logic
- Database operations
- Critical business logic

### What NOT to Test
- Trivial getters/setters
- Third-party library internals
- UI snapshots (unless critical)

### Test Naming
```javascript
// Good
test('POST /memories creates new memory for authenticated user')

// Bad  
test('test1')
```

## Performance Guidelines

### Database
- Index foreign keys and commonly queried columns
- Use `LIMIT` on queries that could return large result sets
- Avoid N+1 queries (use JOINs or batch fetches)
- Consider pagination for lists >100 items

### API
- Return only needed fields, not entire database rows
- Use proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Set appropriate cache headers where applicable

## Documentation Standards

### Code Comments
- Explain **why**, not **what**
- Update comments when code changes
- Remove commented-out code (use git history instead)

### README Files
- Every major directory should have a README
- Include: purpose, how to use, examples
- Keep in sync with actual code

### API Documentation
- Document all endpoints in README.md
- Include: method, path, auth requirements, body schema, response schema
- Provide example curl commands or requests

## Decision Log

### 2026-01-04: GitHub as War Room Hub
**Decision**: Use GitHub Issues + Copilot Spaces as primary coordination mechanism  
**Rationale**: Native integration, familiar to Ryan, supports all required workflows  
**Alternatives Considered**: Notion (lacks execution layer), Discord (too ephemeral), Custom dashboard (overkill)  

### 2026-01-04: Supabase for Memory
**Decision**: Keep existing Supabase database for memory storage  
**Rationale**: Already implemented, works well, supports RLS, has good API  
**Alternatives Considered**: Firebase (vendor lock-in), PostgreSQL on VPS (more ops burden)  

### 2026-01-04: MCP as Future Enhancement
**Decision**: Design for GitHub-native first, add MCP later  
**Rationale**: GitHub workflow sufficient for MVP, MCP adds complexity, can be added incrementally  
**Alternatives Considered**: MCP-first (premature), hybrid (too complex)  

## Constraints

### Hard Constraints (NEVER violate)
1. No work without an Issue
2. No merging your own PRs
3. No committing secrets
4. No breaking changes without migration path
5. All API endpoints require authentication

### Soft Constraints (prefer but not absolute)
1. Keep PRs under 500 lines
2. Respond to PR feedback within 24 hours
3. Write tests for new API endpoints
4. Update docs when behavior changes

## Communication Norms

### Where to Communicate
- **Issues**: Task-specific updates, questions, blockers
- **PR comments**: Code review feedback
- **Discussions**: Design questions, architecture decisions
- **Commit messages**: What changed and why

### Tone
- Be direct and clear
- Assume good intent
- Focus on the problem, not the person
- Ask questions rather than making demands

## Updating Canon

### Who Can Update
- Ryan approves all changes
- Agents can propose changes via PR

### How to Propose Changes
1. Create Issue with `[CANON]` prefix
2. Explain what should change and why
3. Wait for Ryan's approval
4. Submit PR with changes
5. Link PR to Issue

### Change Format
When adding to Decision Log:
```markdown
### YYYY-MM-DD: Decision Title
**Decision**: What was decided
**Rationale**: Why this makes sense
**Alternatives Considered**: What else was evaluated
```

---

## Quick Reference

**Need to know project direction?** → Read "Project Overview"  
**Starting a new task?** → Check "Issue Standards" and create Issue  
**Writing code?** → Follow "Coding Standards"  
**Submitting PR?** → Review "PR Requirements"  
**Not sure about something?** → Search this doc, then ask in Issue  
**Something seems wrong in Canon?** → Propose change via Issue  

---

**This is a living document. When in doubt, this is the source of truth.**
