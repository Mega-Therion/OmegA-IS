# ORYAN Roadmap

Prioritized integration of Gemini's proposed improvements into the existing SQLite-based plan.

---

## Priority Ranking

| Priority | Feature | Rationale |
|----------|---------|-----------|
| **P0** | Human-in-the-Loop (HITL) | Safety is non-negotiable. Must be in place before agents write to the filesystem. |
| **P1** | Standardized Communication Protocol | Foundation for all inter-agent communication. Enables everything else. |
| **P2** | Hybrid REPL + SQLite | Improves UX significantly, but requires P1 to be meaningful. |
| **P3** | Workspace and Tool Management | Important for security at scale, but can be deferred until core workflow is stable. |

---

## Roadmap Phases

### Phase 0: HITL Safety Layer (P0)
**Must ship before any agent writes files.**

| Task | Description |
|------|-------------|
| 0.1 | All agent outputs that modify files produce a unified diff |
| 0.2 | Implement `oryan review <task_id>` to display pending diffs |
| 0.3 | Implement `oryan approve <task_id>` to apply changes |
| 0.4 | Implement `oryan reject <task_id>` to discard changes |
| 0.5 | Block direct filesystem writes from agents by default |

**Deliverables:**
- `lib/diff.py` - Diff generation and application
- Modified `lib/runner.py` - Capture output as pending changes
- New DB table: `pending_changes(task_id, file_path, diff_content, status)`

---

### Phase 1: Standardized Communication Protocol (P1)
**Foundation for reliable multi-agent coordination.**

| Task | Description |
|------|-------------|
| 1.1 | Define JSON schema for `Task` objects |
| 1.2 | Define JSON schema for `Result` objects |
| 1.3 | Define JSON schema for `Context` objects |
| 1.4 | Implement schema validation in `lib/db.py` |
| 1.5 | Add `output_type` field to results (text, file_diff, error, code) |

**Deliverables:**
- `schemas/task.json`
- `schemas/result.json`
- `schemas/context.json`
- `lib/validate.py` - JSON schema validation

**Schema Draft:**
```json
{
  "task": {
    "task_id": "uuid",
    "agent": "claude|codex|gemini",
    "prompt": "string",
    "input_context_ids": ["uuid"],
    "status": "pending|running|completed|failed|review",
    "created_at": "timestamp"
  },
  "result": {
    "result_id": "uuid",
    "task_id": "uuid",
    "content": "string",
    "output_type": "text|file_diff|error|code",
    "created_at": "timestamp"
  }
}
```

---

### Phase 2: Hybrid REPL + SQLite (P2)
**Improved developer experience.**

| Task | Description |
|------|-------------|
| 2.1 | Build interactive REPL shell using `prompt_toolkit` or `cmd` |
| 2.2 | Implement `use <agent>` to switch active agent |
| 2.3 | Support `$last` variable for piping output between agents |
| 2.4 | Implement background tasks with `&` suffix |
| 2.5 | Add `status` command to check running/pending tasks |
| 2.6 | Auto-log all REPL commands to SQLite |

**Deliverables:**
- `lib/repl.py` - Interactive shell implementation
- `oryan shell` subcommand to launch REPL
- Modified `lib/db.py` - Session logging

**Example Session:**
```
oryan> use codex
[codex] > Refactor the auth module for clarity
... (runs in background)
[codex] > use claude
[claude] > Review $last and suggest improvements
```

---

### Phase 3: Workspace and Tool Management (P3)
**Security hardening for production use.**

| Task | Description |
|------|-------------|
| 3.1 | Implement sandboxed workspace creation (`/tmp/oryan-workspace-<id>/`) |
| 3.2 | Copy relevant files into sandbox before agent execution |
| 3.3 | Define tool permissions per agent in `config/agents.yaml` |
| 3.4 | Implement tool request/approval flow |
| 3.5 | Add `oryan sandbox list` and `oryan sandbox clean` commands |

**Deliverables:**
- `lib/sandbox.py` - Workspace management
- `config/agents.yaml` - Agent capability definitions
- `lib/tools.py` - Tool access control

**Example Config:**
```yaml
agents:
  claude:
    tools: [read, write, grep, lint]
    sandbox: true
  codex:
    tools: [read, write, grep, test, build]
    sandbox: true
  gemini:
    tools: [read, grep, web_search]
    sandbox: false
```

---

## Updated Timeline

```
Phase 0 (HITL)       ████████░░░░░░░░░░░░  Foundation
Phase 1 (Protocol)   ░░░░░░░░████████░░░░  Standardization
Phase 2 (REPL)       ░░░░░░░░░░░░░░░░████  UX Enhancement
Phase 3 (Sandboxing) ░░░░░░░░░░░░░░░░░░██  Security Hardening
```

---

## Dependencies

```
Phase 0 (HITL) ─────► Phase 1 (Protocol) ─────► Phase 2 (REPL)
                                │
                                └─────► Phase 3 (Sandboxing)
```

- HITL must exist before any agent can propose file changes
- Protocol must exist before REPL can meaningfully pass context
- Sandboxing can proceed in parallel with REPL once Protocol is stable

---

## Open Questions

1. **Diff format:** Use unified diff or structured JSON patches?
2. **Context size limits:** How large can a context object be before we need chunking?
3. **Agent timeouts:** How long should we wait for an agent before marking a task as failed?
4. **Conflict resolution:** What happens if two agents propose conflicting changes to the same file?

---

## Next Action

Begin **Phase 0.1**: Implement diff generation for agent outputs.

---

Note: The no-ID UX is now implemented (run latest tasks without specifying IDs).
