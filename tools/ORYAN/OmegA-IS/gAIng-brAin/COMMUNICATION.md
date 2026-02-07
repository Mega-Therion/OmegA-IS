# Agent Communication Protocol (gAIng Tier 1-3)

## Overview
Agents communicate through three graduated layers (Tier 1-3), replacing the legacy `log.md` text-based system with structured, queryable, real-time messaging.

## Tier 1: Structured Message Queue (Database-backed)

### Concept
- Messages stored in Supabase `messages` table
- Agents POST `/messages` to send, GET `/messages` to read
- Each message has: `sender`, `recipient`, `intent`, `data`, `read_at`

### Message Schema
```json
{
  "id": "uuid",
  "sender": "Claude",                    // Who sent it
  "recipient": "Gemini",                 // Who it's for (or "broadcast")
  "intent": "instruction|task|report|ack|query",
  "data": {                              // Structured payload
    "task_id": "123",
    "action": "start_task",
    "params": { ... }
  },
  "read_at": null,                       // Null = unread
  "created_at": "2026-01-03T10:00:00Z",
  "updated_at": "2026-01-03T10:00:00Z"
}
```

### API Usage

**Send a message:**
```bash
curl -X POST http://localhost:8080/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "Claude",
    "recipient": "Gemini",
    "intent": "instruction",
    "data": { "task": "analyze_codebase" }
  }'
```

**Receive unread messages:**
```bash
curl http://localhost:8080/messages?recipient=Gemini \
  -H "Authorization: Bearer <token>"
```

**Mark message as read:**
```bash
curl -X PATCH http://localhost:8080/messages/<id> \
  -H "Authorization: Bearer <token>"
```

## Tier 2: Real-Time Push (WebSocket)

### Concept
- Agents connect via WebSocket at startup
- New messages broadcast instantly (no polling)
- Low latency (~10ms vs ~500ms polling)

### Connection
```bash
# Agent starts and connects to WebSocket
Agent: ws://localhost:8080/ws?agent=Claude

# Server sends:
{ "id": "msg-123", "sender": "Gemini", "recipient": "Claude", "intent": "task", ... }

# Agent auto-marks as read:
POST /messages/msg-123 (mark_read)
```

### Benefits
- Real-time collaboration (no stale reads)
- Broadcast messages to all agents instantly
- Multi-agent coordination latency: <100ms

## Tier 3: Distributed Task Queue (Redis-backed)

### Concept
- Tasks enqueued with **priority** (1-10) and optional **deadline**
- Agent dequeues next task atomically
- Supports request/response RPC pattern

### Task Schema
```json
{
  "id": "uuid",
  "type": "default|analyze|deploy|test",
  "priority": 7,                         // 1=low, 10=urgent
  "sender": "Claude",
  "intent": "task",
  "deadline": "2026-01-03T11:00:00Z",   // Optional
  "data": { "target": "src/app.js" },
  "created_at": "2026-01-03T10:00:00Z"
}
```

### API Usage

**Enqueue a task:**
```bash
curl -X POST http://localhost:8080/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "analyze",
    "priority": 8,
    "sender": "Claude",
    "intent": "analyze_performance",
    "deadline": "2026-01-03T11:00:00Z",
    "data": { "target": "src/services/llm.js" }
  }'
```

**Dequeue next task (blocking):**
```bash
curl http://localhost:8080/tasks/queue/analyze \
  -H "Authorization: Bearer <token>"
```

**Get urgent tasks (deadline soon):**
```bash
curl "http://localhost:8080/tasks/urgent/analyze?within=300" \
  -H "Authorization: Bearer <token>"
```

**Complete a task:**
```bash
curl -X POST http://localhost:8080/tasks/<id>/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "result": { "status": "done", "output": "..." } }'
```

**Retrieve result:**
```bash
curl http://localhost:8080/tasks/<id>/result \
  -H "Authorization: Bearer <token>"
```

## Migration from log.md

### Old Pattern (Tier 0)
```markdown
## Update for Gemini
- Task: analyze codebase
- Deadline: 2026-01-03 11:00
```

### New Pattern (Tier 1)
```bash
POST /messages
{
  "sender": "Claude",
  "recipient": "Gemini",
  "intent": "instruction",
  "data": { "task": "analyze_codebase", "deadline": "2026-01-03T11:00:00Z" }
}
```

### New Pattern (Tier 3 - Recommended)
```bash
POST /tasks
{
  "type": "analyze",
  "priority": 8,
  "sender": "Claude",
  "intent": "task",
  "deadline": "2026-01-03T11:00:00Z",
  "data": { "target": "codebase" }
}
```

## Environment Variables

```env
# Supabase (Tier 1)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Redis (Tier 3, optional)
REDIS_URL=redis://localhost:6379

# WebSocket (Tier 2, built-in)
# No additional config needed; WebSocket endpoint auto-available at ws://localhost:8080/ws
```

## PowerShell Agent Script Example (Tier 1)

```powershell
param(
  [string]$Agent = "Claude",
  [string]$ApiUrl = "http://localhost:8080"
)

$headers = @{
  "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
  "Content-Type" = "application/json"
}

# Fetch unread messages
$response = Invoke-RestMethod -Uri "$ApiUrl/messages?recipient=$Agent" -Headers $headers
$messages = $response.messages

foreach ($msg in $messages) {
  Write-Host "[Received from $($msg.sender)]: $($msg.intent)"
  
  # Process message based on intent
  switch ($msg.intent) {
    "instruction" {
      Write-Host "Instruction: $($msg.data.task)"
      # Execute task...
    }
    "task" {
      Write-Host "Task enqueued: $($msg.data | ConvertTo-Json)"
      # Dequeue and process
    }
  }

  # Mark as read
  Invoke-RestMethod -Uri "$ApiUrl/messages/$($msg.id)" -Method PATCH -Headers $headers
}
```

## Next Steps

1. **Test Tier 1**: Run `npm test` to validate message routes
2. **Connect agents**: Update PowerShell scripts to POST/GET `/messages`
3. **Enable Tier 2**: Agents connect to WebSocket at startup for real-time updates
4. **Configure Redis**: Set `REDIS_URL` and enable task queuing (Tier 3)
5. **Deprecate log.md**: Gradually migrate content to structured message store
