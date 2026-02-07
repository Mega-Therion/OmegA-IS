/**
 * Telegram MCP Server
 * Built for the gAIng - OMEGA Trinity
 * 
 * A comprehensive MCP server for Telegram Bot API integration,
 * enabling AI agents to communicate via Telegram.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { getTelegramClient, formatApiError } from "./services/telegram-client.js";
import { ResponseFormat } from "./constants.js";
import type {
  TelegramMessage,
  TelegramUpdate,
  BotInfo,
  TelegramChat,
  WebhookInfo
} from "./types.js";
import {
  SendMessageInputSchema,
  GetUpdatesInputSchema,
  GetMeInputSchema,
  GetChatInputSchema,
  GetChatMemberCountInputSchema,
  ForwardMessageInputSchema,
  SetWebhookInputSchema,
  DeleteWebhookInputSchema,
  GetWebhookInfoInputSchema,
  SendPhotoInputSchema,
  SendDocumentInputSchema,
  DeleteMessageInputSchema,
  EditMessageTextInputSchema,
  type SendMessageInput,
  type GetUpdatesInput,
  type GetMeInput,
  type GetChatInput,
  type GetChatMemberCountInput,
  type ForwardMessageInput,
  type SetWebhookInput,
  type DeleteWebhookInput,
  type GetWebhookInfoInput,
  type SendPhotoInput,
  type SendDocumentInput,
  type DeleteMessageInput,
  type EditMessageTextInput
} from "./schemas/telegram.js";

// Initialize MCP Server
const server = new McpServer({
  name: "telegram-mcp-server",
  version: "1.0.0"
});

// ============================================================================
// TOOL: telegram_send_message
// ============================================================================
server.registerTool(
  "telegram_send_message",
  {
    title: "Send Telegram Message",
    description: `Send a text message to a Telegram chat, group, or channel.

This tool sends messages via the Telegram Bot API. Supports Markdown, MarkdownV2, and HTML formatting.

Args:
  - chat_id (number|string): Target chat ID or @channelname
  - text (string): Message text (max 4096 chars)
  - parse_mode ('Markdown'|'MarkdownV2'|'HTML'): Optional formatting mode
  - disable_notification (boolean): Send silently
  - reply_to_message_id (number): Original message ID if replying
  - bot_token (string): Optional bot token (uses env var if not provided)
  - response_format ('json'|'markdown'): Output format

Returns:
  JSON: { message_id, chat, date, text }
  Markdown: Formatted confirmation with message details

Examples:
  - Send to chat: chat_id=123456789, text="Hello gAIng!"
  - Send to channel: chat_id="@mychannel", text="*Bold* announcement"
  - Silent reply: chat_id=123, text="Reply", reply_to_message_id=456, disable_notification=true`,
    inputSchema: SendMessageInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: SendMessageInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      
      const response = await client.request<TelegramMessage>("sendMessage", {
        chat_id: params.chat_id,
        text: params.text,
        parse_mode: params.parse_mode,
        disable_notification: params.disable_notification,
        reply_to_message_id: params.reply_to_message_id
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const msg = response.result;
      const output = {
        message_id: msg.message_id,
        chat: msg.chat,
        date: msg.date,
        text: msg.text
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `✅ **Message Sent Successfully**

**Message ID:** ${msg.message_id}
**Chat:** ${msg.chat.title || msg.chat.first_name || msg.chat.id}
**Date:** ${new Date(msg.date * 1000).toISOString()}

**Content:**
> ${msg.text?.substring(0, 200)}${(msg.text?.length || 0) > 200 ? '...' : ''}`;
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
// TOOL: telegram_get_updates
// ============================================================================
server.registerTool(
  "telegram_get_updates",
  {
    title: "Get Telegram Updates",
    description: `Receive incoming updates for the bot using long polling.

Retrieves a list of new messages, edits, and other events for the bot.

Args:
  - offset (number): First update ID to return (use last update_id + 1 to acknowledge)
  - limit (number): Max updates to retrieve (1-100, default: 20)
  - timeout (number): Long polling timeout in seconds (0-60)
  - allowed_updates (string[]): Update types to receive
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Array of update objects with messages, edits, etc.

Examples:
  - Get recent: limit=10
  - Long poll: timeout=30
  - Acknowledge: offset=lastUpdateId+1`,
    inputSchema: GetUpdatesInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: GetUpdatesInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      
      const response = await client.request<TelegramUpdate[]>("getUpdates", {
        offset: params.offset,
        limit: params.limit,
        timeout: params.timeout,
        allowed_updates: params.allowed_updates
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const updates = response.result;
      const output = {
        count: updates.length,
        updates: updates.map(u => ({
          update_id: u.update_id,
          type: u.message ? "message" : u.edited_message ? "edited_message" : "other",
          message: u.message || u.edited_message,
        }))
      };

      if (params.response_format === ResponseFormat.MARKDOWN) {
        if (updates.length === 0) {
          return { content: [{ type: "text", text: "📭 No new updates" }] };
        }
        
        const text = `📬 **${updates.length} Update(s)**\n\n` +
          updates.slice(0, 10).map(u => {
            const msg = u.message || u.edited_message;
            if (!msg) return `- Update ${u.update_id}: (non-message update)`;
            return `- **${u.update_id}**: ${msg.from?.first_name || "Unknown"}: "${msg.text?.substring(0, 50) || "(no text)"}..."`;
          }).join("\n") +
          (updates.length > 10 ? `\n\n_...and ${updates.length - 10} more_` : "");
        
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
// TOOL: telegram_get_me
// ============================================================================
server.registerTool(
  "telegram_get_me",
  {
    title: "Get Bot Info",
    description: `Get information about the bot.

Returns basic info about the bot including username, name, and capabilities.

Args:
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Bot information including id, username, first_name, capabilities`,
    inputSchema: GetMeInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: GetMeInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<BotInfo>("getMe");

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const bot = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `🤖 **Bot Information**

**Name:** ${bot.first_name}
**Username:** @${bot.username}
**ID:** ${bot.id}

**Capabilities:**
- Can join groups: ${bot.can_join_groups ? "✅" : "❌"}
- Can read all messages: ${bot.can_read_all_group_messages ? "✅" : "❌"}
- Inline queries: ${bot.supports_inline_queries ? "✅" : "❌"}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(bot, null, 2) }],
        structuredContent: bot
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
// TOOL: telegram_get_chat
// ============================================================================
server.registerTool(
  "telegram_get_chat",
  {
    title: "Get Chat Info",
    description: `Get information about a chat.

Returns detailed info about a chat, group, supergroup, or channel.

Args:
  - chat_id (number|string): Target chat ID or @username
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Chat information including id, type, title, username`,
    inputSchema: GetChatInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: GetChatInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<TelegramChat>("getChat", {
        chat_id: params.chat_id
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const chat = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `💬 **Chat Information**

**ID:** ${chat.id}
**Type:** ${chat.type}
**Title/Name:** ${chat.title || chat.first_name || "N/A"}
**Username:** ${chat.username ? "@" + chat.username : "N/A"}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(chat, null, 2) }],
        structuredContent: chat
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
// TOOL: telegram_get_chat_member_count
// ============================================================================
server.registerTool(
  "telegram_get_chat_member_count",
  {
    title: "Get Chat Member Count",
    description: `Get the number of members in a chat.

Args:
  - chat_id (number|string): Target chat ID or @username
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Number of members in the chat`,
    inputSchema: GetChatMemberCountInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: GetChatMemberCountInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<number>("getChatMemberCount", {
        chat_id: params.chat_id
      });

      if (!response.ok || response.result === undefined) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const count = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        return { content: [{ type: "text", text: `👥 **Member Count:** ${count}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ count }, null, 2) }],
        structuredContent: { count }
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
// TOOL: telegram_forward_message
// ============================================================================
server.registerTool(
  "telegram_forward_message",
  {
    title: "Forward Message",
    description: `Forward a message from one chat to another.

Args:
  - chat_id (number|string): Target chat to forward to
  - from_chat_id (number|string): Source chat
  - message_id (number): Message to forward
  - disable_notification (boolean): Forward silently
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  The forwarded message object`,
    inputSchema: ForwardMessageInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: ForwardMessageInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<TelegramMessage>("forwardMessage", {
        chat_id: params.chat_id,
        from_chat_id: params.from_chat_id,
        message_id: params.message_id,
        disable_notification: params.disable_notification
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const msg = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `📤 **Message Forwarded**

**New Message ID:** ${msg.message_id}
**To Chat:** ${msg.chat.title || msg.chat.id}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(msg, null, 2) }],
        structuredContent: msg
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
// TOOL: telegram_set_webhook
// ============================================================================
server.registerTool(
  "telegram_set_webhook",
  {
    title: "Set Webhook",
    description: `Configure a webhook URL for receiving updates.

Sets up push-based updates instead of polling. URL must be HTTPS.

Args:
  - url (string): HTTPS webhook URL
  - max_connections (number): Max simultaneous connections (1-100, default: 40)
  - allowed_updates (string[]): Update types to receive
  - drop_pending_updates (boolean): Drop queued updates
  - secret_token (string): Verification token for requests
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Success status`,
    inputSchema: SetWebhookInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: SetWebhookInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<boolean>("setWebhook", {
        url: params.url,
        max_connections: params.max_connections,
        allowed_updates: params.allowed_updates,
        drop_pending_updates: params.drop_pending_updates,
        secret_token: params.secret_token
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      if (params.response_format === ResponseFormat.MARKDOWN) {
        return { content: [{ type: "text", text: `✅ **Webhook Set Successfully**\n\n**URL:** ${params.url}` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, url: params.url }, null, 2) }],
        structuredContent: { success: true, url: params.url }
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
// TOOL: telegram_delete_webhook
// ============================================================================
server.registerTool(
  "telegram_delete_webhook",
  {
    title: "Delete Webhook",
    description: `Remove the webhook integration and switch to getUpdates.

Args:
  - drop_pending_updates (boolean): Drop queued updates
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Success status`,
    inputSchema: DeleteWebhookInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: DeleteWebhookInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<boolean>("deleteWebhook", {
        drop_pending_updates: params.drop_pending_updates
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      if (params.response_format === ResponseFormat.MARKDOWN) {
        return { content: [{ type: "text", text: "✅ **Webhook Deleted**\n\nBot is now using long polling for updates." }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }],
        structuredContent: { success: true }
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
// TOOL: telegram_get_webhook_info
// ============================================================================
server.registerTool(
  "telegram_get_webhook_info",
  {
    title: "Get Webhook Info",
    description: `Get current webhook status and configuration.

Args:
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Webhook configuration including URL, pending updates, errors`,
    inputSchema: GetWebhookInfoInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: GetWebhookInfoInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<WebhookInfo>("getWebhookInfo");

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const info = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `🔗 **Webhook Information**

**URL:** ${info.url || "Not set"}
**Pending Updates:** ${info.pending_update_count}
**Max Connections:** ${info.max_connections || "Default"}
${info.last_error_message ? `**Last Error:** ${info.last_error_message}` : ""}
${info.ip_address ? `**IP:** ${info.ip_address}` : ""}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
        structuredContent: info
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
// TOOL: telegram_send_photo
// ============================================================================
server.registerTool(
  "telegram_send_photo",
  {
    title: "Send Photo",
    description: `Send a photo to a chat.

Args:
  - chat_id (number|string): Target chat
  - photo (string): Photo file_id, HTTP URL, or file path
  - caption (string): Optional caption (max 1024 chars)
  - parse_mode: Formatting for caption
  - disable_notification (boolean): Send silently
  - reply_to_message_id (number): Reply to message
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Sent message object`,
    inputSchema: SendPhotoInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: SendPhotoInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<TelegramMessage>("sendPhoto", {
        chat_id: params.chat_id,
        photo: params.photo,
        caption: params.caption,
        parse_mode: params.parse_mode,
        disable_notification: params.disable_notification,
        reply_to_message_id: params.reply_to_message_id
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const msg = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `📷 **Photo Sent**

**Message ID:** ${msg.message_id}
**Chat:** ${msg.chat.title || msg.chat.id}
${msg.caption ? `**Caption:** ${msg.caption}` : ""}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(msg, null, 2) }],
        structuredContent: msg
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
// TOOL: telegram_send_document
// ============================================================================
server.registerTool(
  "telegram_send_document",
  {
    title: "Send Document",
    description: `Send a document/file to a chat.

Args:
  - chat_id (number|string): Target chat
  - document (string): Document file_id, HTTP URL, or file path
  - caption (string): Optional caption (max 1024 chars)
  - parse_mode: Formatting for caption
  - disable_notification (boolean): Send silently
  - reply_to_message_id (number): Reply to message
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Sent message object`,
    inputSchema: SendDocumentInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  async (params: SendDocumentInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<TelegramMessage>("sendDocument", {
        chat_id: params.chat_id,
        document: params.document,
        caption: params.caption,
        parse_mode: params.parse_mode,
        disable_notification: params.disable_notification,
        reply_to_message_id: params.reply_to_message_id
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const msg = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `📄 **Document Sent**

**Message ID:** ${msg.message_id}
**Chat:** ${msg.chat.title || msg.chat.id}
${msg.caption ? `**Caption:** ${msg.caption}` : ""}`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(msg, null, 2) }],
        structuredContent: msg
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
// TOOL: telegram_delete_message
// ============================================================================
server.registerTool(
  "telegram_delete_message",
  {
    title: "Delete Message",
    description: `Delete a message from a chat.

Bot must have appropriate permissions. Messages older than 48h cannot be deleted.

Args:
  - chat_id (number|string): Target chat
  - message_id (number): Message to delete
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Success status`,
    inputSchema: DeleteMessageInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: DeleteMessageInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<boolean>("deleteMessage", {
        chat_id: params.chat_id,
        message_id: params.message_id
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      if (params.response_format === ResponseFormat.MARKDOWN) {
        return { content: [{ type: "text", text: `🗑️ **Message ${params.message_id} Deleted**` }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, message_id: params.message_id }, null, 2) }],
        structuredContent: { success: true, message_id: params.message_id }
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
// TOOL: telegram_edit_message_text
// ============================================================================
server.registerTool(
  "telegram_edit_message_text",
  {
    title: "Edit Message Text",
    description: `Edit the text of a sent message.

Args:
  - chat_id (number|string): Target chat
  - message_id (number): Message to edit
  - text (string): New message text
  - parse_mode: Formatting mode
  - bot_token (string): Optional bot token
  - response_format ('json'|'markdown'): Output format

Returns:
  Edited message object`,
    inputSchema: EditMessageTextInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: EditMessageTextInput) => {
    try {
      const client = getTelegramClient(params.bot_token);
      const response = await client.request<TelegramMessage>("editMessageText", {
        chat_id: params.chat_id,
        message_id: params.message_id,
        text: params.text,
        parse_mode: params.parse_mode
      });

      if (!response.ok || !response.result) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${formatApiError(response)}` }]
        };
      }

      const msg = response.result;

      if (params.response_format === ResponseFormat.MARKDOWN) {
        const text = `✏️ **Message Edited**

**Message ID:** ${msg.message_id}
**New Text:** ${msg.text?.substring(0, 100)}...`;
        return { content: [{ type: "text", text }] };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(msg, null, 2) }],
        structuredContent: msg
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
  console.error("Telegram MCP Server running on stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "telegram-mcp-server" });
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

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    console.error(`Telegram MCP Server running on http://localhost:${port}/mcp`);
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
