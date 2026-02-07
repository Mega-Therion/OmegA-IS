/**
 * Telegram MCP Server Constants
 * Built for the gAIng - OMEGA Trinity
 */

export const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export const CHARACTER_LIMIT = 50000;

export const DEFAULT_TIMEOUT = 30000;

export const MAX_MESSAGE_LENGTH = 4096;

export const MAX_CAPTION_LENGTH = 1024;

export const PARSE_MODES = ["Markdown", "MarkdownV2", "HTML"] as const;

export type ParseMode = typeof PARSE_MODES[number];

export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown"
}
