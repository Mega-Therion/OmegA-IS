/**
 * Webhook MCP Server - Zod Validation Schemas
 * Built for the gAIng - OMEGA Trinity
 */

import { z } from "zod";
import { ResponseFormat, AuthType, HTTP_METHODS } from "../constants.js";

// Common schemas
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.JSON)
  .describe("Output format: 'json' for structured, 'markdown' for human-readable, 'raw' for unprocessed");

export const HttpMethodSchema = z.enum(HTTP_METHODS)
  .describe("HTTP method to use");

export const UrlSchema = z.string()
  .url("Must be a valid HTTP/HTTPS URL")
  .describe("Target URL for the request");

export const HeadersSchema = z.record(z.string(), z.string())
  .optional()
  .describe("Custom HTTP headers as key-value pairs");

export const AuthConfigSchema = z.object({
  type: z.nativeEnum(AuthType)
    .describe("Authentication type: none, bearer, api_key, or basic"),
  token: z.string()
    .optional()
    .describe("Bearer token (for type=bearer)"),
  username: z.string()
    .optional()
    .describe("Username (for type=basic)"),
  password: z.string()
    .optional()
    .describe("Password (for type=basic)"),
  header_name: z.string()
    .optional()
    .describe("Header name (for type=api_key, e.g., 'X-API-Key')"),
  header_value: z.string()
    .optional()
    .describe("Header value (for type=api_key)")
}).optional().describe("Authentication configuration");

// HTTP Request Schema
export const HttpRequestInputSchema = z.object({
  method: HttpMethodSchema.default("GET"),
  url: UrlSchema,
  headers: HeadersSchema,
  body: z.unknown()
    .optional()
    .describe("Request body (will be JSON serialized)"),
  timeout: z.number()
    .int()
    .min(1000)
    .max(120000)
    .default(30000)
    .describe("Request timeout in milliseconds (1000-120000)"),
  auth: AuthConfigSchema,
  response_format: ResponseFormatSchema
}).strict();

// Webhook Trigger Schema
export const WebhookTriggerInputSchema = z.object({
  url: UrlSchema,
  method: HttpMethodSchema.default("POST"),
  payload: z.record(z.string(), z.unknown())
    .optional()
    .describe("Webhook payload data"),
  headers: HeadersSchema,
  auth: AuthConfigSchema,
  secret: z.string()
    .optional()
    .describe("Webhook secret for HMAC signature"),
  response_format: ResponseFormatSchema
}).strict();

// Batch Request Schema
export const BatchRequestInputSchema = z.object({
  requests: z.array(z.object({
    method: HttpMethodSchema.default("GET"),
    url: UrlSchema,
    headers: HeadersSchema,
    body: z.unknown().optional()
  }))
    .min(1, "At least one request required")
    .max(10, "Maximum 10 requests per batch")
    .describe("Array of requests to execute"),
  parallel: z.boolean()
    .default(true)
    .describe("Execute requests in parallel (true) or sequentially (false)"),
  auth: AuthConfigSchema,
  timeout: z.number()
    .int()
    .min(1000)
    .max(120000)
    .default(30000)
    .describe("Timeout per request in milliseconds"),
  response_format: ResponseFormatSchema
}).strict();

// API Health Check Schema
export const HealthCheckInputSchema = z.object({
  url: UrlSchema,
  expected_status: z.number()
    .int()
    .min(100)
    .max(599)
    .default(200)
    .describe("Expected HTTP status code"),
  timeout: z.number()
    .int()
    .min(1000)
    .max(30000)
    .default(5000)
    .describe("Timeout in milliseconds"),
  response_format: ResponseFormatSchema
}).strict();

// Parse Response Schema
export const ParseResponseInputSchema = z.object({
  url: UrlSchema,
  method: HttpMethodSchema.default("GET"),
  headers: HeadersSchema,
  auth: AuthConfigSchema,
  json_path: z.string()
    .optional()
    .describe("JSON path to extract (e.g., 'data.items[0].name')"),
  response_format: ResponseFormatSchema
}).strict();

// Register Endpoint Schema
export const RegisterEndpointInputSchema = z.object({
  id: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "ID must be alphanumeric with underscores/hyphens")
    .describe("Unique identifier for this endpoint"),
  url: UrlSchema,
  method: HttpMethodSchema.default("POST"),
  description: z.string()
    .max(200)
    .optional()
    .describe("Description of what this endpoint does"),
  headers: HeadersSchema,
  auth: AuthConfigSchema,
  response_format: ResponseFormatSchema
}).strict();

// Call Registered Endpoint Schema
export const CallEndpointInputSchema = z.object({
  endpoint_id: z.string()
    .min(1)
    .describe("ID of the registered endpoint to call"),
  payload: z.unknown()
    .optional()
    .describe("Request payload"),
  override_headers: HeadersSchema,
  response_format: ResponseFormatSchema
}).strict();

// List Endpoints Schema
export const ListEndpointsInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

// Inferred types
export type HttpRequestInput = z.infer<typeof HttpRequestInputSchema>;
export type WebhookTriggerInput = z.infer<typeof WebhookTriggerInputSchema>;
export type BatchRequestInput = z.infer<typeof BatchRequestInputSchema>;
export type HealthCheckInput = z.infer<typeof HealthCheckInputSchema>;
export type ParseResponseInput = z.infer<typeof ParseResponseInputSchema>;
export type RegisterEndpointInput = z.infer<typeof RegisterEndpointInputSchema>;
export type CallEndpointInput = z.infer<typeof CallEndpointInputSchema>;
export type ListEndpointsInput = z.infer<typeof ListEndpointsInputSchema>;
