# Webhook MCP Server

> Built for the **gAIng** - OMEGA Trinity

A generic HTTP/Webhook MCP server that enables AI agents to interact with any REST API, website, or application.

## 🚀 Features

- **HTTP Requests** - Full support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Authentication** - Bearer tokens, API keys, Basic auth
- **Webhooks** - Trigger webhooks with HMAC signature support
- **Batch Requests** - Execute multiple requests in parallel or sequentially
- **Health Checks** - Monitor API availability
- **Endpoint Registry** - Save and reuse API configurations
- **Response Parsing** - Extract data using JSON path

## 📦 Installation

```bash
cd webhook-mcp-server
npm install
npm run build
```

## 🏃 Running the Server

### stdio Mode (Default)

```bash
npm start
```

### HTTP Mode

```bash
TRANSPORT=http PORT=3001 npm start
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `webhook_http_request` | Make HTTP requests to any URL |
| `webhook_trigger` | Send webhooks with optional HMAC signature |
| `webhook_batch_request` | Execute multiple requests (parallel/sequential) |
| `webhook_health_check` | Check API endpoint health |
| `webhook_parse_response` | Fetch and extract data using JSON path |
| `webhook_register_endpoint` | Save reusable endpoint configurations |
| `webhook_call_endpoint` | Call a registered endpoint |
| `webhook_list_endpoints` | List all registered endpoints |

## 📝 Usage Examples

### Simple GET Request

```json
{
  "tool": "webhook_http_request",
  "params": {
    "method": "GET",
    "url": "https://api.example.com/users"
  }
}
```

### POST with Authentication

```json
{
  "tool": "webhook_http_request",
  "params": {
    "method": "POST",
    "url": "https://api.example.com/data",
    "body": {"name": "test", "value": 123},
    "auth": {
      "type": "bearer",
      "token": "your-token-here"
    }
  }
}
```

### Trigger Webhook with Signature

```json
{
  "tool": "webhook_trigger",
  "params": {
    "url": "https://hooks.example.com/webhook",
    "payload": {
      "event": "user.created",
      "data": {"id": 123}
    },
    "secret": "your-webhook-secret"
  }
}
```

### Batch Requests

```json
{
  "tool": "webhook_batch_request",
  "params": {
    "requests": [
      {"method": "GET", "url": "https://api1.example.com/data"},
      {"method": "GET", "url": "https://api2.example.com/data"},
      {"method": "GET", "url": "https://api3.example.com/data"}
    ],
    "parallel": true
  }
}
```

### Extract Specific Data

```json
{
  "tool": "webhook_parse_response",
  "params": {
    "url": "https://api.example.com/user/123",
    "json_path": "data.profile.email"
  }
}
```

### Register Reusable Endpoint

```json
{
  "tool": "webhook_register_endpoint",
  "params": {
    "id": "omega_api",
    "url": "https://omega.example.com/api/v1",
    "method": "POST",
    "description": "OMEGA Trinity main API",
    "auth": {
      "type": "api_key",
      "header_name": "X-API-Key",
      "header_value": "your-api-key"
    }
  }
}
```

Then call it:

```json
{
  "tool": "webhook_call_endpoint",
  "params": {
    "endpoint_id": "omega_api",
    "payload": {"action": "sync"}
  }
}
```

## 🔒 Authentication Types

| Type | Required Fields |
|------|-----------------|
| `none` | - |
| `bearer` | `token` |
| `api_key` | `header_name`, `header_value` |
| `basic` | `username`, `password` |

## 🏗️ Architecture

```
webhook-mcp-server/
├── src/
│   ├── index.ts           # Main entry, tool registration
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Configuration constants
│   ├── services/
│   │   └── http-client.ts # HTTP client with retries
│   └── schemas/
│       └── webhook.ts     # Zod validation schemas
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 Integration with gAIng

This MCP server is designed for integration with:

- **OMEGA Trinity Website** - Frontend API calls
- **OMEGA Trinity App** - Mobile API integration
- **OxySpine** - Unified interface architecture
- **External Services** - Third-party API integration

## 📊 Response Formats

All tools support three output formats:

- **json** - Structured JSON (default)
- **markdown** - Human-readable formatted text
- **raw** - Unprocessed response body

## ⚡ Performance

- Automatic retries (3 attempts with exponential backoff)
- Configurable timeouts (1-120 seconds)
- Parallel batch execution
- Connection pooling via Node.js fetch

## 📄 License

MIT - Built with 💜 for the gAIng
