# Summary of docs/options.md

The document outlines four approaches for a local multi-agent CLI workflow where Codex, Claude, and Gemini collaborate in a shared repo with a human orchestrator.

1. Shell orchestrator
- Single entry script routes tasks to agent-specific scripts.
- Pros: simple, lightweight, high human control.
- Cons: manual, error-prone, hard to scale, limited context sharing.

2. "Mailbox" file-based messaging
- Agents exchange prompts/results via inbox/outbox files in a shared directory.
- Pros: asynchronous, persistent logs, decoupled agents.
- Cons: filesystem polling overhead, slower I/O, no standard message format.

3. SQLite-based state machine
- Central SQLite DB holds tasks and shared context; agents read/write task status and results.
- Pros: robust, queryable state; scalable; fewer race conditions.
- Cons: higher complexity, heavier than needed for simple tasks, agents need DB logic.

4. Interactive agent REPL
- Single interactive CLI lets user switch active agent and share in-memory context.
- Pros: fast, fluid, intuitive, easy context sharing.
- Cons: context is ephemeral, requires building a REPL app, not good for long-running async tasks.
