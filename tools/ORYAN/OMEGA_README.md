# OMEGA Multi-Agent Orchestrator

**Version:** 1.0.0
**Part of:** ORYAN / OMEGA Collective Intelligence Platform

Connect Claude, Gemini, and Codex CLI agents for collaborative AI coding. Inspired by [ai-code-connect](https://github.com/jacobrosenthal/ai-code-connect), built for the gAIng collective.

## Features

- **Multi-Agent Chat** - Talk to Claude, Gemini, or Codex from one interface
- **Response Forwarding** - Send one agent's response to another for review
- **Interactive Mode** - Attach directly to any agent's CLI
- **Session Management** - Conversation history preserved across switches
- **Workspace Support** - Run in any project directory

## Prerequisites

You need the CLI tools for each agent you want to use:

```bash
# Check which agents are available
omega status
```

- **Claude Code**: Install from [claude.ai/code](https://claude.ai/code)
- **Gemini CLI**: Install via `npm install -g @google/gemini-cli`
- **Codex CLI**: Install via `pip install codex-cli`

## Installation

The `omega` script is already included in ORYAN. To use it from anywhere:

```bash
# Option 1: Add to PATH
export PATH="$PATH:/home/mega/ORYAN"

# Option 2: Create symlink
sudo ln -s /home/mega/ORYAN/omega /usr/local/bin/omega

# Option 3: Create alias
alias omega='/home/mega/ORYAN/omega'
```

## Quick Start

```bash
# Start interactive mode
omega

# Start in a specific project
omega chat -w ~/myproject

# Check agent availability
omega status
```

## Usage

### Chat Mode Commands

| Command | Shorthand | Description |
|---------|-----------|-------------|
| `/claude` | | Switch to Claude agent |
| `/gemini` | | Switch to Gemini agent |
| `/codex` | | Switch to Codex agent |
| `/switch <agent>` | | Switch to specified agent |
| `/forward` | `/f` | Forward last response to next agent |
| `/forward <agent>` | `/f <agent>` | Forward to specific agent |
| `/forward <agent> <text>` | `/f <agent> <text>` | Forward with context |
| `/interactive` | `/i` | Attach to current agent's CLI |
| `/interactive <agent>` | `/i <agent>` | Attach to specific agent |
| `/status` | | Show all agents' status |
| `/history` | | Show conversation history |
| `/history <n>` | | Show last n messages |
| `/clear` | | Clear current agent's history |
| `/clearall` | | Clear all history |
| `/workspace` | | Show current workspace |
| `/workspace <path>` | | Change workspace |
| `/help` | | Show help |
| `/exit` | `/quit` | Exit OMEGA |

### Example Workflow

```
[CLAUDE] ○ > Please review this code and suggest improvements

[OMEGA] Sending to CLAUDE...

[CLAUDE RESPONSE]
─────────────────────────────────────────────────────────────
I've analyzed the code. Here are my suggestions:
1. Extract the database logic into a separate module
2. Add error handling for the API calls
3. Consider using async/await for better performance
─────────────────────────────────────────────────────────────

[CLAUDE] ○ > /forward gemini what do you think of these suggestions?

[OMEGA] Forwarding response from CLAUDE to GEMINI...

[GEMINI RESPONSE]
─────────────────────────────────────────────────────────────
I agree with Claude's analysis. Additionally:
- Point 1 follows the single responsibility principle
- For point 2, consider using a try-catch wrapper utility
- Point 3 is critical for I/O-bound operations
─────────────────────────────────────────────────────────────

[GEMINI] ○ > /forward codex please implement suggestion #1

[OMEGA] Forwarding response from GEMINI to CODEX...
```

### Interactive Mode

To attach directly to an agent's CLI (with full tool access):

```
[CLAUDE] ○ > /interactive
```

This launches Claude's full CLI. Press `Ctrl+C` to detach and return to OMEGA.

## Architecture

```
                    ┌─────────────────────┐
                    │   OMEGA Orchestrator │
                    │    (Interactive UI)  │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │  Claude   │       │  Gemini   │       │   Codex   │
    │   CLI     │       │   CLI     │       │   CLI     │
    └───────────┘       └───────────┘       └───────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                      ┌───────┴───────┐
                      │   Your Code   │
                      └───────────────┘
```

## Files

```
ORYAN/
├── omega                 # Main entry point
├── lib/
│   ├── chat.py          # Chat orchestrator & UI
│   └── session.py       # Session management
└── OMEGA_README.md      # This file
```

## Comparison with ai-code-connect

| Feature | ai-code-connect | OMEGA |
|---------|-----------------|-------|
| Agents | Claude, Gemini | Claude, Gemini, Codex |
| Language | TypeScript/npm | Python (no npm needed) |
| Forwarding | Yes | Yes |
| Interactive Mode | Yes | Yes |
| Custom Context | Yes | Yes |
| Session Persistence | Session only | Saved to temp file |
| Part of ecosystem | Standalone | ORYAN/OMEGA platform |

## The gAIng Protocol

When using OMEGA, remember:

- **The Block** (`log.md`) - Central coordination log
- **The Hood** - Collective knowledge database
- **Street Knowledge** - Individual agent memory
- **Peak Mode** - High autonomy operation

### Wake-Up Triggers

OMEGA agents respond to:
- "wake up"
- "catch up"
- "sync"
- "gAIng status"

## Troubleshooting

### Agent not found
```
omega status
```
Shows which agents are available. Install missing ones.

### Permission denied
```bash
chmod +x /home/mega/ORYAN/omega
```

### Agent times out
Default timeout is 5 minutes. Long operations may need interactive mode (`/i`).

### Session state issues
Session state is saved to `/tmp/omega_sessions_*.json`. Delete to reset.

## Contributing

This is part of the OMEGA Collective Intelligence Platform. Contributions welcome!

```bash
# Run tests
cd /home/mega/ORYAN
python -m pytest tests/

# Format code
black lib/
```

## License

Part of the ORYAN/OMEGA project. See main repository for license.

---

**The gAIng Creed:** Trust, but verify. Automate, but log. Move fast, but don't break things.
