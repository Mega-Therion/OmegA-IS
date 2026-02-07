/**
 * Webhook MCP Server
 * Built for the gAIng - OMEGA Trinity
 * 
 * A generic HTTP/Webhook MCP server for web and app integration,
 * enabling AI agents to communicate with any REST API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import crypto from "crypto";

import {
  makeRequest,
  formatResponseMarkdown,
  parseResponse,
  isValidUrl
} from "./services/http-client.js";
import { ResponseFormat, AuthType } from "./constants.js";
import type { WebhookEndpoint, HttpRequest, BatchResult } from "./types.js";
import {
  HttpRequestInputSchema,
  WebhookTriggerInputSchema,
  BatchRequestInputSchema,
  HealthCheckInputSchema,
  ParseResponseInputSchema,
  RegisterEndpointInputSchema,
  CallEndpointInputSchema,
  ListEndpointsInputSchema,
  type HttpRequestInput,
  type WebhookTriggerInput,
  type BatchRequestInput,
  type HealthCheckInput,
  type ParseResponseInput,
  type RegisterEndpointInput,
  type CallEndpointInput,
  type ListEndpointsInput
} from "./schemas/webhook.js";

// Initialize MCP Server
const server = new McpServer({
  name: "webhook-mcp-server",
  version: "1.0.0"
});

// In-memory endpoint registry
const endpointRegistry = new Map<string, WebhookEndpoint>();

// ============================================================================
// TOOL: webhook_http_request
// ============================================================================
server.registerTool(
  "webhook_http_request",
  {
    title: "HTTP Request",
    description: `Make an HTTP request to any URL.

Supports all HTTP methods, custom headers, authentication, and request bodies.

Args:
  - method ('GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS'): HTTP method
  - url (string): Target URL
  - headers (object): Custom headers
  - body (any): Request body (JSON serialized)
  - timeout (number): Timeout in ms (1000-120000, default: 30000)
  - auth (object): Authentication config { type, token, username, password, header_name, header_value }
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Response with status, headers, body, and timing info

Examples:
  - GET request: method="GET", url="https://api.example.com/data"
  - POST with auth: method="POST", url="...", body={...}, auth={type:"bearer", token:"..."}
  - Custom headers: headers={"X-Custom": "value"}`,
    inputSchema: HttpRequestInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: HttpRequestInput) => {
    try {
      if (!isValidUrl(params.url)) {
        return {
          isError: true,
          content: [{ type: "text", text: "Error: Invalid URL. Must be a valid HTTP/HTTPS URL." }]
        };
      }

      const request: HttpRequest = {
        method: params.method,
        url: params.url,
        headers: params.headers,
        body: params.body,
        timeout: params.timeout,
        auth: params.auth ? {
          type: params.auth.type as AuthType,
          token: params.auth.token,
          username: params.auth.username,
          password: params.auth.password,
          header_name: params.auth.header_name,
          header_value: params.auth.header_value
        } : undefined
      };

      const result = await makeRequest(request);

      if (params.response_format === ResponseFormat.MARKDOWN) {
        return { content: [{ type: "text", text: formatResponseMarkdown(result) }] };
      }

      if (params.response_format === ResponseFormat.RAW && result.response) {
        return {
          content: [{ type: "text", text: typeof result.response.body === "string" 
            ? result.response.body 
            : JSON.stringify(result.response.body) 
          }]
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_trigger
// ============================================================================
server.registerTool(
  "webhook_trigger",
  {
    title: "Trigger Webhook",
    description: `Send a webhook request with optional HMAC signature.

Designed for triggering webhooks in external services (GitHub, Slack, custom apps, etc.)

Args:
  - url (string): Webhook URL
  - method ('GET'|'POST'|...): HTTP method (default: POST)
  - payload (object): Webhook payload data
  - headers (object): Custom headers
  - auth (object): Authentication config
  - secret (string): Secret for HMAC-SHA256 signature (adds X-Webhook-Signature header)
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Webhook response with status and body

Examples:
  - Simple webhook: url="https://hooks.example.com/abc", payload={event: "test"}
  - With signature: url="...", payload={...}, secret="my-secret"`,
    inputSchema: WebhookTriggerInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: WebhookTriggerInput) => {
    try {
      if (!isValidUrl(params.url)) {
        return {
          isError: true,
          content: [{ type: "text", text: "Error: Invalid webhook URL." }]
        };
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...params.headers
      };

      // Add HMAC signature if secret provided
      if (params.secret && params.payload) {
        const payload = JSON.stringify(params.payload);
        const signature = crypto
          .createHmac("sha256", params.secret)
          .update(payload)
          .digest("hex");
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
        headers["X-Hub-Signature-256"] = `sha256=${signature}`; // GitHub compatible
      }

      const request: HttpRequest = {
        method: params.method,
        url: params.url,
        headers,
        body: params.payload,
        auth: params.auth ? {
          type: params.auth.type as AuthType,
          token: params.auth.token,
          username: params.auth.username,
          password: params.auth.password,
          header_name: params.auth.header_name,
          header_value: params.auth.header_value
        } : undefined
      };

      const result = await makeRequest(request);

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const status = result.success ? "✅ Webhook Triggered" : "❌ Webhook Failed";
        return { content: [{ type: "text", text: `${status}\n\n${formatResponseMarkdown(result)}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_batch_request
// ============================================================================
server.registerTool(
  "webhook_batch_request",
  {
    title: "Batch HTTP Requests",
    description: `Execute multiple HTTP requests in parallel or sequentially.

Args:
  - requests (array): Array of {method, url, headers, body} objects (max 10)
  - parallel (boolean): Execute in parallel (true) or sequential (false)
  - auth (object): Shared authentication for all requests
  - timeout (number): Timeout per request in ms
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Batch results with success count and individual responses

Examples:
  - Parallel fetch: requests=[{url:"..."}, {url:"..."}], parallel=true
  - Sequential: requests=[...], parallel=false`,
    inputSchema: BatchRequestInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: BatchRequestInput) => {
    try {
      const requests: HttpRequest[] = params.requests.map(r => ({
        method: r.method,
        url: r.url,
        headers: r.headers,
        body: r.body,
        timeout: params.timeout,
        auth: params.auth ? {
          type: params.auth.type as AuthType,
          token: params.auth.token,
          username: params.auth.username,
          password: params.auth.password,
          header_name: params.auth.header_name,
          header_value: params.auth.header_value
        } : undefined
      }));

      let results;
      if (params.parallel) {
        results = await Promise.all(requests.map(r => makeRequest(r)));
      } else {
        results = [];
        for (const r of requests) {
          results.push(await makeRequest(r));
        }
      }

      const batchResult: BatchResult = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `📦 **Batch Request Results**

**Total:** ${batchResult.total}
**Successful:** ${batchResult.successful} ✅
**Failed:** ${batchResult.failed} ❌
**Mode:** ${params.parallel ? "Parallel" : "Sequential"}

---

${results.map((r, i) => `### Request ${i + 1}\n${formatResponseMarkdown(r)}`).join("\n\n")}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(batchResult, null, 2) }],
        structuredContent: batchResult
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_health_check
// ============================================================================
server.registerTool(
  "webhook_health_check",
  {
    title: "API Health Check",
    description: `Check if an API endpoint is healthy and responding.

Args:
  - url (string): URL to check
  - expected_status (number): Expected HTTP status (default: 200)
  - timeout (number): Timeout in ms (default: 5000)
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Health status with latency

Examples:
  - Simple check: url="https://api.example.com/health"
  - Custom status: url="...", expected_status=204`,
    inputSchema: HealthCheckInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: HealthCheckInput) => {
    try {
      const startTime = Date.now();
      const result = await makeRequest({
        method: "GET",
        url: params.url,
        timeout: params.timeout
      });
      const latency = Date.now() - startTime;

      const isHealthy = result.success && result.response?.status === params.expected_status;
      const output = {
        healthy: isHealthy,
        url: params.url,
        status: result.response?.status || 0,
        expected_status: params.expected_status,
        latency_ms: latency,
        error: result.error
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const emoji = isHealthy ? "🟢" : "🔴";
        const text = `${emoji} **Health Check: ${isHealthy ? "HEALTHY" : "UNHEALTHY"}**

**URL:** ${params.url}
**Status:** ${output.status} (expected: ${params.expected_status})
**Latency:** ${latency}ms
${output.error ? `**Error:** ${output.error}` : ""}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_parse_response
// ============================================================================
server.registerTool(
  "webhook_parse_response",
  {
    title: "Fetch and Parse Response",
    description: `Fetch a URL and optionally extract data using JSON path.

Args:
  - url (string): URL to fetch
  - method ('GET'|...): HTTP method (default: GET)
  - headers (object): Custom headers
  - auth (object): Authentication config
  - json_path (string): Optional path to extract (e.g., 'data.items[0].name')
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Parsed response or extracted value

Examples:
  - Extract field: url="...", json_path="data.user.email"
  - Array access: json_path="results[0].id"`,
    inputSchema: ParseResponseInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: ParseResponseInput) => {
    try {
      const result = await makeRequest({
        method: params.method,
        url: params.url,
        headers: params.headers,
        auth: params.auth ? {
          type: params.auth.type as AuthType,
          token: params.auth.token,
          username: params.auth.username,
          password: params.auth.password,
          header_name: params.auth.header_name,
          header_value: params.auth.header_value
        } : undefined
      });

      if (!result.success || !result.response) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${result.error || "Request failed"}` }]
        };
      }

      let data = result.response.body;

      // Extract using JSON path if provided
      if (params.json_path && typeof data === "object" && data !== null) {
        const pathParts = params.json_path.split(/\.|\[|\]/).filter(Boolean);
        let current: unknown = data;
        
        for (const part of pathParts) {
          if (current === null || current === undefined) break;
          if (typeof current === "object") {
            current = (current as Record<string, unknown>)[part];
          }
        }
        data = current;
      }

      const output = {
        url: params.url,
        json_path: params.json_path || null,
        extracted: data
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `📋 **Parsed Response**

**URL:** ${params.url}
${params.json_path ? `**Path:** ${params.json_path}` : ""}

**Value:**
\`\`\`json
${JSON.stringify(data, null, 2).substring(0, 1000)}
\`\`\``;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_register_endpoint
// ============================================================================
server.registerTool(
  "webhook_register_endpoint",
  {
    title: "Register Endpoint",
    description: `Register a reusable API endpoint with preset configuration.

Saves endpoint config for easy reuse with webhook_call_endpoint.

Args:
  - id (string): Unique identifier (alphanumeric, underscores, hyphens)
  - url (string): Endpoint URL
  - method ('GET'|...): HTTP method (default: POST)
  - description (string): What this endpoint does
  - headers (object): Default headers
  - auth (object): Default authentication
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Confirmation of registered endpoint

Examples:
  - Register API: id="my_api", url="https://api.example.com/v1/data", method="GET"
  - With auth: id="secure_api", url="...", auth={type:"bearer", token:"..."}`,
    inputSchema: RegisterEndpointInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: RegisterEndpointInput) => {
    try {
      const endpoint: WebhookEndpoint = {
        id: params.id,
        url: params.url,
        method: params.method,
        description: params.description,
        headers: params.headers,
        auth: params.auth ? {
          type: params.auth.type as AuthType,
          token: params.auth.token,
          username: params.auth.username,
          password: params.auth.password,
          header_name: params.auth.header_name,
          header_value: params.auth.header_value
        } : undefined
      };

      endpointRegistry.set(params.id, endpoint);

      const output = {
        success: true,
        id: params.id,
        url: params.url,
        method: params.method,
        description: params.description
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `✅ **Endpoint Registered**

**ID:** \`${params.id}\`
**URL:** ${params.url}
**Method:** ${params.method}
${params.description ? `**Description:** ${params.description}` : ""}

Use \`webhook_call_endpoint\` with endpoint_id="${params.id}" to call this endpoint.`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_call_endpoint
// ============================================================================
server.registerTool(
  "webhook_call_endpoint",
  {
    title: "Call Registered Endpoint",
    description: `Call a previously registered endpoint by ID.

Args:
  - endpoint_id (string): ID of registered endpoint
  - payload (any): Request payload
  - override_headers (object): Headers to override defaults
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  Response from the endpoint

Examples:
  - Call endpoint: endpoint_id="my_api"
  - With payload: endpoint_id="my_api", payload={data: "..."}`,
    inputSchema: CallEndpointInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: CallEndpointInput) => {
    try {
      const endpoint = endpointRegistry.get(params.endpoint_id);
      
      if (!endpoint) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: Endpoint '${params.endpoint_id}' not found. Use webhook_list_endpoints to see registered endpoints.` }]
        };
      }

      const request: HttpRequest = {
        method: endpoint.method,
        url: endpoint.url,
        headers: { ...endpoint.headers, ...params.override_headers },
        body: params.payload,
        auth: endpoint.auth
      };

      const result = await makeRequest(request);

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `📡 **Calling: ${endpoint.id}**
${endpoint.description ? `_${endpoint.description}_` : ""}

${formatResponseMarkdown(result)}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// TOOL: webhook_list_endpoints
// ============================================================================
server.registerTool(
  "webhook_list_endpoints",
  {
    title: "List Registered Endpoints",
    description: `List all registered API endpoints.

Args:
  - response_format ('json'|'markdown'|'raw'): Output format

Returns:
  List of registered endpoints with their configurations`,
    inputSchema: ListEndpointsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params: ListEndpointsInput) => {
    try {
      const endpoints = Array.from(endpointRegistry.values());
      
      const output = {
        count: endpoints.length,
        endpoints: endpoints.map(e => ({
          id: e.id,
          url: e.url,
          method: e.method,
          description: e.description,
          has_auth: !!e.auth
        }))
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        if (endpoints.length === 0) {
          return { content: [{ type: "text", text: "📭 No endpoints registered.\n\nUse `webhook_register_endpoint` to add one." }] };
        }

        const text = `📋 **Registered Endpoints (${endpoints.length})**\n\n` +
          endpoints.map(e => `- **${e.id}** - \`${e.method}\` ${e.url}\n  ${e.description || "_No description_"}`).join("\n\n");
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
      };
    }
  }
);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Webhook MCP Server running on stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "webhook-mcp-server" });
  });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3001");
  app.listen(port, () => {
    console.error(`Webhook MCP Server running on http://localhost:${port}/mcp`);
  });
}

// Choose transport based on environment
const transport = process.env.TRANSPORT || "stdio";
if (transport === "http") {
  runHTTP().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch(error => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
