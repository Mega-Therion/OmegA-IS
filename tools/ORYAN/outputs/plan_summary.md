# ORYAN Execution Plan Summary

The ORYAN Execution Plan outlines the development of a local, multi-agent CLI workflow tool. The chosen architecture is a **SQLite-Based State Machine**, which provides a single source of truth for task status, ownership, and results, and allows for structured context sharing between agents.

The development is broken down into four main phases:

1.  **Phase 1: Foundation**
    *   Design and create the SQLite database with `tasks`, `context`, and `agents` tables.
    *   Build the main `oryan` CLI entrypoint with initial commands for initializing the database and managing tasks (`create`, `list`, `show`).

2.  **Phase 2: Agent Integration**
    *   Create wrapper scripts for the three agents (Codex, Claude, Gemini).
    *   Implement the `oryan run <task_id>` command to execute a task with its assigned agent.
    *   Agents will read prompts from the database and write their results back, with status changes from `pending` to `running` to `completed` or `failed`.

3.  **Phase 3: Context & Workflow**
    *   Implement a key-value store for agents to share context (`oryan context set/get`).
    *   Allow prompts to reference context variables.
    *   Introduce task chaining to create dependent workflows.

4.  **Phase 4: Polish & Safety**
    *   Add input validation, error handling, and detailed logging.
    *   Implement a `--dry-run` flag for safe previews.
    *   Create user documentation.

The plan emphasizes keeping a human-in-the-loop, running everything locally, and using the file system as the primary workspace while the database tracks metadata. Key risks include potential changes in agent CLI interfaces and the need for database backups, which will be mitigated by using wrapper scripts and implementing a backup command.
