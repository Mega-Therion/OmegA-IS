/**
 * Webhook MCP Server Constants
 * Built for the gAIng - OMEGA Trinity
 */

export const CHARACTER_LIMIT = 100000;

export const DEFAULT_TIMEOUT = 30000;

export const MAX_RETRIES = 3;

export const RETRY_DELAY = 1000;

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

export type HttpMethod = typeof HTTP_METHODS[number];

export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
  RAW = "raw"
}

export enum AuthType {
  NONE = "none",
  BEARER = "bearer",
  API_KEY = "api_key",
  BASIC = "basic"
}

export const COMMON_HEADERS: Record<string, string> = {
  "User-Agent": "OMEGA-Trinity-gAIng/1.0",
  "Accept": "application/json"
};
