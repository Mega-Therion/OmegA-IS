Implemented the ORYAN SQLite-backed CLI with schema, database helpers, task runner, agent wrappers, and documentation. Added CLI commands for init, task management, run (with approval and dry-run), context, chaining, history, and logs, plus prompt interpolation. Created a usage guide and seeded agent scripts.
Added auto-approval for non-interactive task execution with a logged assumption in runner.
Updated codex agent wrapper to use `codex exec` instead of `-p` to avoid profile parsing errors.
Switched Claude and Gemini agent wrappers to explicit non-interactive flags (--print, --prompt).
Updated codex wrapper to pass --skip-git-repo-check for non-git directories.
Added a migration in lib/db.py to rename legacy tasks tables lacking the agent column and recreate the Phase 1 schema.
