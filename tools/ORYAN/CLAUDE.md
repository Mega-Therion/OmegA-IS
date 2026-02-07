# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ORYAN

ORYAN is a multi-agent task orchestration system that coordinates AI agents (Claude, Codex, Gemini) through two interfaces:

1. **Task Queue** (`./oryan`) - SQLite-backed task management for batch operations
2. **OMEGA Chat** (`./omega`) - Interactive multi-agent chat orchestrator

## OMEGA Multi-Agent Orchestrator (NEW)

The `omega` command provides real-time interactive coordination between Claude, Gemini, and Codex CLI agents. Forward responses between agents, attach to interactive sessions, and maintain conversation context.

### Quick Start

```bash
# Start interactive mode
./omega

# Or with workspace
./omega chat -w ~/myproject

# Check which agents are available
./omega status
```

### Chat Commands

| Command | Description |
|---------|-------------|
| `/claude`, `/gemini`, `/codex` | Switch to agent |
| `/forward` or `/f` | Forward last response to next agent |
| `/f <agent> <context>` | Forward with additional context |
| `/interactive` or `/i` | Attach to agent's CLI directly |
| `/status` | Show all agents' status |
| `/history` | Show conversation history |
| `/help` | Full command list |
| `/exit` | Quit OMEGA |

### Example Workflow

```
[CLAUDE] > please review this code

[CLAUDE RESPONSE]
Here are my suggestions...

[CLAUDE] > /f gemini what do you think?

[OMEGA] Forwarding from CLAUDE to GEMINI...

[GEMINI RESPONSE]
I agree with Claude. Additionally...

[GEMINI] > /f codex please implement
```

See `OMEGA_README.md` for full documentation.

---

## ORYAN Task Queue

The original task-based interface for batch operations.

### Common Commands

```bash
# Initialize database
./oryan init

# Create and run tasks
./oryan task create --agent claude --prompt "Your prompt here"
./oryan task create-run --agent codex --prompt "Your prompt" --dry-run
./oryan run <task_id>
./oryan run latest
./oryan run-latest --agent gemini

# View tasks
./oryan task list
./oryan task show <task_id>
```

### Task Lifecycle

Tasks flow through states: `pending` → `running` → `done`/`failed`

Output stored in `omega_runs/<timestamp>/<task_id>_<agent>.out` and `.err` files.

---

## Architecture

### Directory Structure

```
ORYAN/
├── omega                 # Interactive multi-agent orchestrator
├── oryan                 # Task queue CLI
├── lib/
│   ├── chat.py          # OMEGA chat orchestrator & UI
│   ├── session.py       # Agent session management
│   ├── db.py            # SQLite database operations
│   ├── env.py           # Environment configuration
│   └── schema.sql       # Database schema
├── agents/
│   ├── claude.sh        # Claude CLI wrapper
│   ├── codex.sh         # Codex CLI wrapper
│   └── gemini.sh        # Gemini CLI wrapper
├── config/
│   └── oryan.db         # SQLite database
├── omega_runs/          # Task output files
├── OMEGA_README.md      # OMEGA documentation
├── ERGON.md             # Shared work log
├── ROLES.md             # Agent role definitions
└── TELOS.md             # Current objectives
```

### Agent System

Agents defined in both systems:
- `claude`: Claude Code CLI
- `codex`: Codex CLI
- `gemini`: Gemini CLI

### Key Files

- **ERGON.md** - Shared work log for agents to append proposed work
- **ROLES.md** - Agent role definitions (Claude: reasoning, Gemini: research, Codex: implementation)
- **TELOS.md** - Current objective/task description
- **OMEGA_README.md** - Full OMEGA orchestrator documentation

## Database Schema

The `tasks` table stores:
- `id`, `agent`, `prompt`, `status`
- `created_at`, `updated_at` (ISO timestamps)
- `output_path`, `error_path` (set after execution)

## Development Notes

- Database uses WAL journal mode for reliability
- Task runner auto-approves in non-interactive shells
- Use `--dry-run` to preview execution without running
- The `--db` flag overrides the default database path
- OMEGA sessions saved to `/tmp/omega_sessions_*.json`

## The gAIng Protocol

When using ORYAN/OMEGA:

- **The Block** (`log.md`) - Central coordination log
- **The Hood** - Collective knowledge database
- **Street Knowledge** - Individual agent memory
- **Peak Mode** - High autonomy operation

**The gAIng Creed:** Trust, but verify. Automate, but log. Move fast, but don't break things.
