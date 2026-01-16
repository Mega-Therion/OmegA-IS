# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gAIng-Brain is a multi-agent AI coordination system. This repository serves as the "brain" - a shared coordination layer where different AI agents (Claude, Gemini, Codex, etc.) communicate and collaborate.

## Wake-Up / Sync Protocol

When the user says any of these phrases, immediately read `log.md` to catch up on what other agents have done:
- "wake up"
- "catch up"
- "sync"
- "check the log"
- "gAIng status"

## Key Files and Directories

### The Block (Main Coordination Log)
**Path:** `log.md`

This is the shared coordination layer where all gAIng agents communicate. After each significant action, log a short bullet here to keep other agents informed.

### Directory Structure
- `public/captures/` - Public-facing capture storage
- `uploads/` - Upload storage directory
- `.claude/agents/` - Custom Claude agent configurations

### Planned/Future Files (may not exist yet)
- `CONTEXT.md` - Working notes and project decisions
- `.env` - Environment variables (Supabase, ngrok, API keys)
- `index.js` - Main brain server
- `scripts/` - Utility scripts including `agents-log.ps1`

## gAIng Glossary

Understanding the terminology helps navigate the codebase and coordination:

- **The Hood**: Collective Knowledge Database (Context/Vector Store)
- **Street Knowledge**: Individual agent memory/instruction stores
- **The Block**: Central meeting place (log.md)
- **G Code**: The Collective Creed (TBD)

## My Role (Claude via Claude Code CLI)

I bring:
- Deep reasoning and analysis capabilities
- Code generation and debugging
- Multi-file refactoring
- Extended thinking for complex problems
- Direct file system and terminal access

## Coordination Protocol

1. **Log after significant actions** - Keep entries in `log.md` concise
2. **Read before acting** - Check `log.md` when syncing to see what other agents have done
3. **Coordinate, don't duplicate** - Use the log to avoid stepping on other agents' work
4. **Keep entries concise** - Short bullets, not essays

## Development Notes

This is an early-stage project. The architecture is being built iteratively. When adding new components:
- Document decisions in CONTEXT.md (if it exists)
- Log coordination-worthy changes to log.md
- Follow the gAIng terminology and philosophy
