/**
 * HTTP Client Service
 * Built for the gAIng - OMEGA Trinity
 */

import {
  DEFAULT_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
  COMMON_HEADERS,
  CHARACTER_LIMIT,
  AuthType
} from "../constants.js";
import type {
  HttpRequest,
  HttpResponse,
  RequestResult,
  AuthConfig,
  ParsedResponse
} from "../types.js";

/**
 * Build authorization header based on auth config
 */
function buildAuthHeader(auth: AuthConfig): Record<string, string> {
  switch (auth.type) {
    case AuthType.BEARER:
      if (!auth.token) throw new Error("Bearer auth requires token");
      return { Authorization: `Bearer ${auth.token}` };
    
    case AuthType.API_KEY:
      if (!auth.header_name || !auth.header_value) {
        throw new Error("API key auth requires header_name and header_value");
      }
      return { [auth.header_name]: auth.header_value };
    
    case AuthType.BASIC:
      if (!auth.username || !auth.password) {
        throw new Error("Basic auth requires username and password");
      }
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
      return { Authorization: `Basic ${credentials}` };
    
    default:
      return {};
  }
}

/**
 * Make an HTTP request with retries
 */
export async function makeRequest(request: HttpRequest): Promise<RequestResult> {
  const timeout = request.timeout || DEFAULT_TIMEOUT;
  let lastError: string | undefined;
  let retries = 0;

  const headers: Record<string, string> = {
    ...COMMON_HEADERS,
    ...request.headers
  };

  // Add auth headers
  if (request.auth && request.auth.type !== AuthType.NONE) {
    const authHeaders = buildAuthHeader(request.auth);
    Object.assign(headers, authHeaders);
  }

  // Add Content-Type for requests with body
  if (request.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  while (retries <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startTime = Date.now();

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();

      // Parse response body
      let body: unknown;
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const httpResponse: HttpResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        timing: {
          total: endTime - startTime
        }
      };

      return {
        success: response.ok,
        response: httpResponse,
        retries
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = `Request timed out after ${timeout}ms`;
        } else {
          lastError = error.message;
        }
      } else {
        lastError = "Unknown error";
      }

      retries++;
      
      if (retries <= MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
      }
    }
  }

  return {
    success: false,
    error: lastError || "Request failed after max retries",
    retries
  };
}

/**
 * Parse and format response for display
 */
export function parseResponse(response: HttpResponse): ParsedResponse {
  const contentType = response.headers["content-type"] || "unknown";
  let data = response.body;
  let size = 0;
  let truncated = false;

  if (typeof data === "string") {
    size = data.length;
    if (size > CHARACTER_LIMIT) {
      data = data.substring(0, CHARACTER_LIMIT);
      truncated = true;
    }
  } else if (typeof data === "object") {
    const str = JSON.stringify(data);
    size = str.length;
    if (size > CHARACTER_LIMIT) {
      data = JSON.parse(str.substring(0, CHARACTER_LIMIT) + "...");
      truncated = true;
    }
  }

  return { contentType, data, size, truncated };
}

/**
 * Format HTTP response for markdown output
 */
export function formatResponseMarkdown(result: RequestResult): string {
  if (!result.success || !result.response) {
    return `❌ **Request Failed**

**Error:** ${result.error || "Unknown error"}
**Retries:** ${result.retries || 0}`;
  }

  const r = result.response;
  const parsed = parseResponse(r);
  const statusEmoji = r.status < 300 ? "✅" : r.status < 400 ? "↪️" : "❌";

  let bodyPreview: string;
  if (typeof parsed.data === "object") {
    bodyPreview = JSON.stringify(parsed.data, null, 2).substring(0, 500);
  } else {
    bodyPreview = String(parsed.data).substring(0, 500);
  }

  return `${statusEmoji} **${r.status} ${r.statusText}**

**Timing:** ${r.timing.total}ms
**Content-Type:** ${parsed.contentType}
**Size:** ${parsed.size} bytes${parsed.truncated ? " (truncated)" : ""}

**Response Body:**
\`\`\`json
${bodyPreview}${bodyPreview.length >= 500 ? "\n..." : ""}
\`\`\``;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
