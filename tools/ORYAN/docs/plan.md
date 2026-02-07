# ORYAN Execution Plan

## Decision: SQLite-Based State Machine (Option 3)

### Why This Approach

The **SQLite-Based State Machine** is the best fit for a local multi-agent CLI workflow with human orchestration. Here's the reasoning:

#### Core Strengths

1. **Single Source of Truth** - A central database eliminates ambiguity about task status, ownership, and results. When three agents operate on a shared codebase, knowing "who did what and when" is essential.

2. **Structured Context Sharing** - The key-value context store allows agents to share rich, typed information (not just raw file contents). One agent can flag concerns, another can reference them.

3. **Queryable History** - The human orchestrator can inspect past tasks, filter by agent, search results, and replay workflows. This is invaluable for debugging and iteration.

4. **Graceful Scaling** - Adding a fourth agent, introducing task dependencies, or building automation on top becomes straightforward with a relational schema.

---

### Tradeoffs Against Other Options

| Option | Why Not Primary | What We Borrow |
|--------|-----------------|----------------|
| **Shell Orchestrator** | Too manual for multi-agent coordination. Copy-paste errors compound. No persistent state across sessions. | Keep the CLI-first UX. Commands should feel like shell invocations. |
| **Mailbox Messaging** | File polling is fragile. No standard message format leads to parsing drift. Debugging requires grepping through scattered files. | Adopt the decoupled agent model. Agents don't call each other directly. |
| **Interactive REPL** | Ephemeral context is a dealbreaker. Long-running tasks block the session. Building a custom REPL is high effort for uncertain gain. | Support a `--interactive` mode later for quick exploration. |

The SQLite approach absorbs the best ideas (CLI simplicity, agent decoupling, optional interactivity) while providing the structural backbone the others lack.

---

## Execution Plan

### Phase 1: Foundation

**Goal:** Establish the database schema and core CLI entrypoint.

| Step | Description |
|------|-------------|
| 1.1 | Design the SQLite schema: `tasks`, `context`, `agents` tables |
| 1.2 | Create the main CLI entrypoint (`oryan`) with subcommands |
| 1.3 | Implement `oryan init` to bootstrap the database |
| 1.4 | Implement `oryan task create --agent <name> --prompt "..."` |
| 1.5 | Implement `oryan task list` and `oryan task show <id>` |

**Files to Create:**
- `oryan` - Main CLI script (Python or Bash wrapper)
- `lib/db.py` - Database connection and helpers
- `lib/schema.sql` - Table definitions
- `config/oryan.db` - SQLite database (generated)

---

### Phase 2: Agent Integration

**Goal:** Connect each agent to the task system.

| Step | Description |
|------|-------------|
| 2.1 | Create agent runner scripts: `agents/codex.sh`, `agents/claude.sh`, `agents/gemini.sh` |
| 2.2 | Implement `oryan run <task_id>` to execute the assigned agent |
| 2.3 | Agents read prompt from DB, execute, write result back |
| 2.4 | Add status transitions: `pending` → `running` → `completed` / `failed` |

**Files to Create:**
- `agents/codex.sh` - Codex CLI wrapper
- `agents/claude.sh` - Claude Code invocation
- `agents/gemini.sh` - Gemini CLI wrapper
- `lib/runner.py` - Task execution logic

---

### Phase 3: Context & Workflow

**Goal:** Enable shared context and multi-step workflows.

| Step | Description |
|------|-------------|
| 3.1 | Implement `oryan context set <key> <value>` and `oryan context get <key>` |
| 3.2 | Allow tasks to reference context variables in prompts (`{{key}}`) |
| 3.3 | Implement `oryan chain` to create dependent task sequences |
| 3.4 | Add `oryan history` for querying past tasks |

**Files to Modify:**
- `lib/db.py` - Add context table operations
- `oryan` - Add context and chain subcommands

---

### Phase 4: Polish & Safety

**Goal:** Make the system robust for daily use.

| Step | Description |
|------|-------------|
| 4.1 | Add input validation and error handling |
| 4.2 | Implement `oryan log <task_id>` for detailed execution logs |
| 4.3 | Add `--dry-run` flag to preview without execution |
| 4.4 | Create `docs/usage.md` with examples |

---

## Proposed Directory Structure

```
ORYAN/
├── oryan                   # Main CLI entrypoint
├── config/
│   └── oryan.db            # SQLite database
├── lib/
│   ├── db.py               # Database operations
│   ├── runner.py           # Task execution
│   └── schema.sql          # Table definitions
├── agents/
│   ├── codex.sh            # Codex agent wrapper
│   ├── claude.sh           # Claude agent wrapper
│   └── gemini.sh           # Gemini agent wrapper
├── docs/
│   ├── options.md          # This analysis
│   ├── plan.md             # This plan
│   └── usage.md            # User guide (Phase 4)
└── test.txt                # Agent introductions
```

---

## Risks & Assumptions

### Assumptions
- All three agents have functional CLI access (Codex CLI, Claude Code, Gemini CLI/API)
- The human orchestrator is comfortable with terminal workflows
- SQLite is sufficient (no need for concurrent multi-user access)

### Risks

| Risk | Mitigation |
|------|------------|
| Agent CLI interfaces change | Isolate agent-specific logic in wrapper scripts |
| Database corruption | Implement `oryan backup` command; use WAL mode |
| Prompt injection via context | Sanitize context values before interpolation |
| Scope creep toward full automation | Maintain human-in-the-loop as a design principle |

### Constraints
- No external services (everything runs locally)
- Human approval required before any agent executes
- File system remains the shared workspace; DB tracks metadata only

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Validate with a simple end-to-end task before proceeding to Phase 2
