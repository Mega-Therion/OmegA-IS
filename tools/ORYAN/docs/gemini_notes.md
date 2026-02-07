# Gemini Notes: Improvements to ORYAN Orchestration

Based on the initial exploration of approaches, here are several proposed improvements to create a more robust, flexible, and secure ORYAN orchestration system. The core idea is to build a hybrid system that combines the best features of the REPL, State Machine, and Mailbox models.

### 1. Hybrid Model: Interactive REPL + SQLite Backend

Combine the fluid, interactive workflow of a REPL with the persistence and structure of a database.

- **Interactive REPL:** The primary interface for the human orchestrator should be a powerful REPL shell. This allows for rapid task creation, context switching (`use claude`, `use gemini`), and inspection of results.
- **SQLite Persistence:** Every command, prompt, and agent output is automatically logged to the SQLite database. This creates a complete, queryable history of every workflow, preventing the loss of context when a session ends.
- **Asynchronous Tasks:** The REPL should support non-blocking, asynchronous tasks. A command could be submitted to an agent to run in the background (e.g., `gemini "run a full security audit" &`). The orchestrator could check the status later (`oryan tasks --status`) and retrieve the result once it's ready. This combines the interactivity of the REPL with the asynchronous nature of the Mailbox model.

### 2. Standardized Communication Protocol

Define a clear and versioned JSON or YAML schema for tasks, results, and shared context to ensure reliable communication between all components.

- **Task Schema:** A task object could include `task_id`, `target_agent`, `prompt`, `input_context_ids`, `status`, and `creation_timestamp`.
- **Result Schema:** An agent's output would be a standardized object, including `result_id`, `source_task_id`, `content`, `output_type` (e.g., text, file_diff, error), and `status`.
- **Context Referencing:** Instead of passing large blocks of text or code between agents, the database can store them as "context objects." An agent can then be prompted to work on a specific context by reference (e.g., `claude "Review the code in context #47"`), making the workflow more efficient.

### 3. Workspace and Tool Management

Enhance security and capability by giving agents a managed "workspace" and explicit access to tools.

- **Sandboxed Workspaces:** When an agent needs to modify files, it can request a temporary, sandboxed workspace. The orchestrator would copy the relevant files into this space, and the agent's changes would be presented back to the human as a `diff` for approval before being merged into the main repository.
- **Tool Access Control:** The orchestrator should define which tools each agent can use (e.g., linters, compilers, test runners, file system access). When an agent wants to use a tool, it must make a request that the human can approve or deny. This prevents agents from taking unexpected or dangerous actions.

### 4. Human-in-the-Loop (HITL) for Safety

Make human approval the default for any action that has side effects.

- **Change Previews:** No agent should be able to write or modify a file directly. All proposed file changes must be presented to the human orchestrator as a `diff`.
- **Explicit Confirmation:** The orchestrator must explicitly approve the changes before they are applied to the file system. This is the single most important safety feature to prevent unintended consequences and maintain human control.
