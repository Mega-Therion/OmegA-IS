/**
 * Telegram MCP Server Type Definitions
 * Built for the gAIng - OMEGA Trinity
 */

// Base type for SDK compatibility (index signature required)
export type JsonObject = { [key: string]: unknown };

export interface TelegramUser extends JsonObject {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat extends JsonObject {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage extends JsonObject {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  reply_to_message?: TelegramMessage;
}

export interface TelegramMessageEntity extends JsonObject {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

export interface TelegramUpdate extends JsonObject {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface WebhookInfo extends JsonObject {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface BotInfo extends JsonObject {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

export interface SendMessageResult extends JsonObject {
  message_id: number;
  chat: TelegramChat;
  date: number;
  text: string;
}

export interface InlineKeyboardButton extends JsonObject {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface InlineKeyboardMarkup extends JsonObject {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface ReplyKeyboardMarkup extends JsonObject {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}
