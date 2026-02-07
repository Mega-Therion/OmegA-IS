# A2A Protocol Integration Plan for gAIng

## Overview

Integrate Google's [Agent2Agent (A2A) Protocol](https://github.com/a2aproject/A2A) to enable standardized multi-agent communication between Claude, Gemini, Codex, Grok, and future agents.

## Why A2A?

| Current (Blackboard) | A2A Protocol |
|---------------------|--------------|
| Custom log.md format | Standardized JSON-RPC |
| Manual capability matching | Agent Cards for auto-discovery |
| Polling-based | Event-driven with webhooks |
| gAIng-only | Interop with 150+ orgs (Salesforce, SAP, etc.) |

## Implementation Steps

### Phase 1: Agent Cards (Discovery)

Create `/.well-known/agent.json` for gAIng Brain:

```json
{
  "name": "gAIng-Brain",
  "description": "Collective memory and orchestration for AI agents",
  "version": "1.0.0",
  "capabilities": {
    "memory": ["store", "search", "retrieve"],
    "tasks": ["create", "assign", "complete"],
    "messaging": ["send", "receive", "broadcast"]
  },
  "agents": [
    {
      "id": "claude",
      "name": "Claude (Opus 4.5)",
      "skills": ["complex-analysis", "architecture", "refactoring", "code-review"],
      "status_endpoint": "/agents/claude/status"
    },
    {
      "id": "gemini",
      "name": "Gemini",
      "skills": ["planning", "coordination", "research", "multimodal"],
      "status_endpoint": "/agents/gemini/status"
    },
    {
      "id": "codex",
      "name": "Codex",
      "skills": ["quick-edits", "scripts", "shell-commands"],
      "status_endpoint": "/agents/codex/status"
    },
    {
      "id": "grok",
      "name": "Grok",
      "skills": ["real-time-search", "current-events", "social-context"],
      "status_endpoint": "/agents/grok/status"
    }
  ],
  "endpoints": {
    "tasks": "/tasks",
    "messages": "/messages",
    "memories": "/memories"
  },
  "authentication": {
    "type": "bearer",
    "token_endpoint": "/auth/token"
  }
}
```

### Phase 2: A2A Task Lifecycle

Map existing `/tasks` API to A2A task states:

| A2A State | gAIng Status |
|-----------|--------------|
| `submitted` | `pending` |
| `working` | `in_progress` |
| `input-required` | `blocked` |
| `completed` | `completed` |
| `failed` | `failed` |

### Phase 3: Message Format

Convert `/messages` to A2A message format:

```json
{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "params": {
    "id": "task-uuid",
    "message": {
      "role": "agent",
      "parts": [
        {"type": "text", "text": "Analysis complete. Found 3 issues."}
      ]
    }
  }
}
```

### Phase 4: Workspace Studio Integration

1. Create Workspace Studio agent that:
   - Monitors Gmail for gAIng-related requests
   - Creates tasks via gAIng API
   - Summarizes daily activity from log.md
   - Shares reports to Drive

2. Connect via webhook:
   ```
   POST https://your-gaing-brain.ngrok.io/webhook/workspace-studio
   ```

### Phase 5: MCP + A2A Bridge

Since Claude supports MCP and A2A complements MCP:
- MCP: Provides tools and context TO agents
- A2A: Enables agents to communicate WITH each other

Create bridge that exposes gAIng-Brain as MCP server AND A2A endpoint.

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `public/.well-known/agent.json` | Agent Card |
| `src/routes/a2a.js` | A2A protocol endpoints |
| `src/services/a2a.js` | A2A message handling |
| `src/middleware/a2a-auth.js` | A2A authentication |

## Dependencies

```bash
npm install ajv uuid  # JSON Schema validation, UUIDs for tasks
```

## Testing

1. Validate Agent Card: https://a2aprotocol.ai/validator
2. Test with A2A reference client
3. Register with A2A directory (optional)

## Resources

- [A2A Protocol Spec](https://github.com/a2aproject/A2A)
- [A2A Documentation](https://a2aprotocol.ai/)
- [Google Workspace Studio](https://workspace.google.com/studio)
- [Interactions API](https://blog.google/technology/developers/interactions-api/)

## Timeline

- Week 1: Agent Card + basic A2A endpoints
- Week 2: Task lifecycle mapping
- Week 3: Message format conversion
- Week 4: Workspace Studio integration
- Week 5: MCP bridge
