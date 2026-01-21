/**
 * Telegram MCP Server - Zod Validation Schemas
 * Built for the gAIng - OMEGA Trinity
 */

import { z } from "zod";
import { ResponseFormat, MAX_MESSAGE_LENGTH, MAX_CAPTION_LENGTH } from "../constants.js";

// Common schemas
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.JSON)
  .describe("Output format: 'json' for structured data, 'markdown' for human-readable");

export const ChatIdSchema = z.union([
  z.number().int(),
  z.string().min(1)
]).describe("Unique identifier for the target chat or username of the target channel (in the format @channelusername)");

export const ParseModeSchema = z.enum(["Markdown", "MarkdownV2", "HTML"])
  .optional()
  .describe("Message formatting mode: Markdown, MarkdownV2, or HTML");

export const BotTokenSchema = z.string()
  .optional()
  .describe("Bot token (optional if TELEGRAM_BOT_TOKEN env var is set)");

// Send Message Schema
export const SendMessageInputSchema = z.object({
  chat_id: ChatIdSchema,
  text: z.string()
    .min(1, "Message text cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
    .describe("Text of the message to be sent"),
  parse_mode: ParseModeSchema,
  disable_notification: z.boolean()
    .optional()
    .describe("Sends the message silently. Users will receive a notification with no sound"),
  reply_to_message_id: z.number().int()
    .optional()
    .describe("If the message is a reply, ID of the original message"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Get Updates Schema
export const GetUpdatesInputSchema = z.object({
  offset: z.number().int()
    .optional()
    .describe("Identifier of the first update to be returned"),
  limit: z.number().int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Limits the number of updates to be retrieved (1-100, default: 20)"),
  timeout: z.number().int()
    .min(0)
    .max(60)
    .default(0)
    .describe("Timeout in seconds for long polling (0-60)"),
  allowed_updates: z.array(z.string())
    .optional()
    .describe("List of update types to receive (e.g., message, edited_message, channel_post)"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Get Me Schema
export const GetMeInputSchema = z.object({
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Get Chat Schema
export const GetChatInputSchema = z.object({
  chat_id: ChatIdSchema,
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Get Chat Members Count Schema
export const GetChatMemberCountInputSchema = z.object({
  chat_id: ChatIdSchema,
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Forward Message Schema
export const ForwardMessageInputSchema = z.object({
  chat_id: ChatIdSchema,
  from_chat_id: ChatIdSchema.describe("Unique identifier for the chat where the original message was sent"),
  message_id: z.number().int()
    .describe("Message identifier in the chat specified in from_chat_id"),
  disable_notification: z.boolean()
    .optional()
    .describe("Sends the message silently"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Set Webhook Schema
export const SetWebhookInputSchema = z.object({
  url: z.string()
    .url("Must be a valid HTTPS URL")
    .describe("HTTPS URL to send updates to"),
  max_connections: z.number().int()
    .min(1)
    .max(100)
    .default(40)
    .describe("Maximum allowed number of simultaneous HTTPS connections (1-100)"),
  allowed_updates: z.array(z.string())
    .optional()
    .describe("List of update types to receive"),
  drop_pending_updates: z.boolean()
    .optional()
    .describe("Pass True to drop all pending updates"),
  secret_token: z.string()
    .max(256)
    .optional()
    .describe("Secret token to be sent in X-Telegram-Bot-Api-Secret-Token header"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Delete Webhook Schema
export const DeleteWebhookInputSchema = z.object({
  drop_pending_updates: z.boolean()
    .optional()
    .describe("Pass True to drop all pending updates"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Get Webhook Info Schema
export const GetWebhookInfoInputSchema = z.object({
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Send Photo Schema
export const SendPhotoInputSchema = z.object({
  chat_id: ChatIdSchema,
  photo: z.string()
    .describe("Photo to send. Pass a file_id, HTTP URL, or file path"),
  caption: z.string()
    .max(MAX_CAPTION_LENGTH)
    .optional()
    .describe("Photo caption (0-1024 characters)"),
  parse_mode: ParseModeSchema,
  disable_notification: z.boolean()
    .optional()
    .describe("Sends the message silently"),
  reply_to_message_id: z.number().int()
    .optional()
    .describe("If the message is a reply, ID of the original message"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Send Document Schema
export const SendDocumentInputSchema = z.object({
  chat_id: ChatIdSchema,
  document: z.string()
    .describe("File to send. Pass a file_id, HTTP URL, or file path"),
  caption: z.string()
    .max(MAX_CAPTION_LENGTH)
    .optional()
    .describe("Document caption (0-1024 characters)"),
  parse_mode: ParseModeSchema,
  disable_notification: z.boolean()
    .optional()
    .describe("Sends the message silently"),
  reply_to_message_id: z.number().int()
    .optional()
    .describe("If the message is a reply, ID of the original message"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Delete Message Schema
export const DeleteMessageInputSchema = z.object({
  chat_id: ChatIdSchema,
  message_id: z.number().int()
    .describe("Identifier of the message to delete"),
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Edit Message Text Schema
export const EditMessageTextInputSchema = z.object({
  chat_id: ChatIdSchema,
  message_id: z.number().int()
    .describe("Identifier of the message to edit"),
  text: z.string()
    .min(1)
    .max(MAX_MESSAGE_LENGTH)
    .describe("New text of the message"),
  parse_mode: ParseModeSchema,
  bot_token: BotTokenSchema,
  response_format: ResponseFormatSchema
}).strict();

// Inferred types from schemas
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
export type GetUpdatesInput = z.infer<typeof GetUpdatesInputSchema>;
export type GetMeInput = z.infer<typeof GetMeInputSchema>;
export type GetChatInput = z.infer<typeof GetChatInputSchema>;
export type GetChatMemberCountInput = z.infer<typeof GetChatMemberCountInputSchema>;
export type ForwardMessageInput = z.infer<typeof ForwardMessageInputSchema>;
export type SetWebhookInput = z.infer<typeof SetWebhookInputSchema>;
export type DeleteWebhookInput = z.infer<typeof DeleteWebhookInputSchema>;
export type GetWebhookInfoInput = z.infer<typeof GetWebhookInfoInputSchema>;
export type SendPhotoInput = z.infer<typeof SendPhotoInputSchema>;
export type SendDocumentInput = z.infer<typeof SendDocumentInputSchema>;
export type DeleteMessageInput = z.infer<typeof DeleteMessageInputSchema>;
export type EditMessageTextInput = z.infer<typeof EditMessageTextInputSchema>;
