# OmegaEvent (Canonical Schema)

```json
{
  "id": "evt_01HXYZ...",
  "ts": "2026-02-02T20:14:00Z",
  "source": "github|vercel|n8n|zapier|manual",
  "type": "push|pull_request|deployment|intent|scheduled|alert",
  "tenant": "default",
  "actor": {
    "id": "string",
    "name": "string",
    "email": "string"
  },
  "context": {
    "repo": "owner/name",
    "ref": "refs/heads/main",
    "sha": "abcdef...",
    "project": "omega-trinity",
    "environment": "preview|production|private",
    "request_id": "trace id / correlation id"
  },
  "security": {
    "signature_valid": true,
    "signature_kind": "hmac|provider",
    "idempotency_key": "string",
    "consent_token": "optional-string"
  },
  "payload": {},
  "routing": {
    "priority": 0,
    "targets": ["orchestrator", "notifier", "diagnoser"],
    "labels": ["deploy", "ui", "infra"]
  }
}
```

## Minimal JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "ts", "source", "type", "payload"],
  "properties": {
    "id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "source": { "type": "string" },
    "type": { "type": "string" },
    "payload": { "type": "object" },
    "context": { "type": "object" },
    "security": { "type": "object" },
    "routing": { "type": "object" }
  }
}
```
