/**
 * Webhook MCP Server Type Definitions
 * Built for the gAIng - OMEGA Trinity
 */

import type { HttpMethod, AuthType } from "./constants.js";

// Base type for SDK compatibility
export type JsonObject = { [key: string]: unknown };

export interface HttpResponse extends JsonObject {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  timing: {
    total: number;
    dns?: number;
    connect?: number;
    ttfb?: number;
  };
}

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
  header_name?: string;
  header_value?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  method: HttpMethod;
  description?: string;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
}

export interface WebhookRegistry {
  endpoints: Map<string, WebhookEndpoint>;
}

export interface RequestResult extends JsonObject {
  success: boolean;
  response?: HttpResponse;
  error?: string;
  retries?: number;
}

export interface BatchResult extends JsonObject {
  total: number;
  successful: number;
  failed: number;
  results: RequestResult[];
}

export interface ParsedResponse extends JsonObject {
  contentType: string;
  data: unknown;
  size: number;
  truncated: boolean;
}
