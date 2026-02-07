# Approaches for a Local Multi-Agent CLI Workflow

This document outlines several approaches for building a local multi-agent CLI AI workflow where Codex, Claude, and Gemini collaborate in a shared repository, with a human acting as the orchestrator.

---

### 1. Shell Orchestrator

A simple, file-system-based approach using shell scripts as the primary interface for the human orchestrator.

- **Idea:**
  - A master shell script (`oryan.sh`) serves as the main entry point for all agent interactions.
  - The human invokes the script with arguments specifying the target agent and the task (e.g., `./oryan.sh codex "Refactor this function."`).
  - Each agent (Codex, Claude, Gemini) has its own dedicated script that handles the logic for interacting with its specific API or CLI.
  - The shared repository's file system is the common ground for context and state. Agents read files, and their output is piped or saved to other files.
  - The human is responsible for manually chaining commands, passing the output from one agent as input to the next.

- **Pros:**
  - **Simplicity:** Easy to implement and understand, relying on basic shell capabilities.
  - **Control:** Offers maximum, direct control to the human orchestrator.
  - **Lightweight:** No external dependencies are required beyond the agents' own CLIs or `curl`.

- **Cons:**
  - **Manual Effort:** Highly manual and can be error-prone, requiring careful copy-pasting or command piping.
  - **Poor Scalability:** Becomes difficult to manage for complex, multi-step workflows.
  - **Limited Context:** No built-in mechanism for sharing rich context beyond what's in the file system.

---

### 2. "Mailbox" File-Based Messaging

An asynchronous approach where agents communicate through a structured file-based messaging system.

- **Idea:**
  - A dedicated directory (e.g., `oryan/mailbox/`) is used for inter-agent communication.
  - The human orchestrator initiates a task by creating a "message" file (e.g., `mailbox/claude.in`) containing the prompt.
  - Each agent runs a process (or is triggered by a file-watcher daemon) that monitors its specific "inbox" for new files.
  - Upon processing a message, the agent writes its output to a corresponding `.out` file (e.g., `mailbox/claude.out`).
  - The human can then review the output and create a new message for another agent, creating a chain of tasks.

- **Pros:**
  - **Asynchronous:** Agents can work in the background without blocking the orchestrator's terminal.
  - **Persistent:** Provides a clear, persistent log of all tasks and their inputs/outputs.
  - **Decoupled:** Agents are fully decoupled and don't need to know about each other.

- **Cons:**
  - **Inefficient:** Relies on filesystem polling or watching, which can be inefficient or complex to set up reliably.
  - **File I/O Overhead:** Can be slow if dealing with many small tasks or large outputs.
  - **No Standard:** Lacks a standardized message format, which could lead to parsing issues between agents.

---

### 3. SQLite-Based State Machine

A structured approach using a central database to manage tasks, state, and context.

- **Idea:**
  - A central SQLite database (e.g., `config/codex.sqlite3`) acts as the single source of truth for the workflow.
  - The database contains tables for `tasks` (task_id, agent, prompt, status, result) and `context` (a shared key-value store).
  - A primary CLI tool allows the human to create and assign tasks, view results, and manage the shared context (e.g., `oryan task create --agent gemini --prompt "..."`).
  - Each agent's script queries the database for pending tasks assigned to it, executes them, and writes the results back.

- **Pros:**
  - **Robust State:** Provides structured, persistent, and easily queryable state management.
  - **Scalable:** Easily scales to handle more complex workflows, additional agents, and richer context.
  - **Reduced Race Conditions:** More robust and less prone to errors than file-based systems.

- **Cons:**
  - **Complexity:** Requires a more significant upfront investment to design the schema and build the core CLI tool.
  - **"Heavy" for Simple Tasks:** Can feel overly complex for quick, one-off tasks.
  - **Agent Logic:** Agents need to contain database interaction logic, making them more complex.

---

### 4. Interactive Agent REPL

A highly interactive approach where the human orchestrates agents within a single Read-Eval-Print Loop (REPL) environment.

- **Idea:**
  - A single CLI application provides an interactive shell for the orchestrator.
  - The human can switch the "active" agent within the REPL using commands (e.g., `use codex`, `use gemini`).
  - All subsequent commands are sent to the currently active agent until the context is switched again.
  - The REPL maintains a shared session context in memory, including command history and the output of the last command.
  - Special variables or commands allow for easy piping between agents (e.g., `claude "Review this code: $last_output"`).

- **Pros:**
  - **Fluid Workflow:** Very fast and interactive, ideal for exploratory and iterative tasks.
  - **Intuitive:** Feels natural for developers accustomed to working in shells and REPLs.
  - **Fast Context Sharing:** In-memory context is immediately available to all agents.

- **Cons:**
  - **Ephemeral Context:** Shared context is lost when the REPL session is closed, unless explicitly saved.
  - **Complex to Build:** Requires a dedicated application using a library like Python's `prompt_toolkit` or `cmd`.
  - **Synchronous:** Not well-suited for long-running, asynchronous tasks that you'd want to run in the background.
