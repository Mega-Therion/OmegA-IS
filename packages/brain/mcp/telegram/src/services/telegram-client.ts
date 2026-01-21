/**
 * Telegram API Client Service
 * Built for the gAIng - OMEGA Trinity
 */

import { TELEGRAM_API_BASE, DEFAULT_TIMEOUT } from "../constants.js";
import type { TelegramApiResponse } from "../types.js";

export class TelegramClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = `${TELEGRAM_API_BASE}${token}`;
  }

  /**
   * Make a request to the Telegram Bot API
   */
  async request<T>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<TelegramApiResponse<T>> {
    const url = `${this.baseUrl}/${method}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: params ? JSON.stringify(params) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const data = await response.json() as TelegramApiResponse<T>;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            ok: false,
            description: "Request timed out after " + DEFAULT_TIMEOUT + "ms",
          };
        }
        return {
          ok: false,
          description: `Network error: ${error.message}`,
        };
      }
      return {
        ok: false,
        description: "Unknown error occurred",
      };
    }
  }

  /**
   * Validate bot token by calling getMe
   */
  async validateToken(): Promise<boolean> {
    const response = await this.request("getMe");
    return response.ok;
  }
}

/**
 * Get Telegram client from environment or provided token
 */
export function getTelegramClient(providedToken?: string): TelegramClient {
  const token = providedToken || process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    throw new Error(
      "Telegram bot token not provided. Set TELEGRAM_BOT_TOKEN environment variable or provide token in request."
    );
  }
  
  return new TelegramClient(token);
}

/**
 * Format API error for user-friendly display
 */
export function formatApiError(response: TelegramApiResponse<unknown>): string {
  if (response.error_code === 401) {
    return "Invalid bot token. Please check your TELEGRAM_BOT_TOKEN.";
  }
  if (response.error_code === 400) {
    return `Bad request: ${response.description || "Invalid parameters"}`;
  }
  if (response.error_code === 403) {
    return `Forbidden: ${response.description || "Bot lacks required permissions"}`;
  }
  if (response.error_code === 429) {
    return `Rate limited: ${response.description || "Too many requests. Please slow down."}`;
  }
  return response.description || "Unknown API error";
}
