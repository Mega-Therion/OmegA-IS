'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeAgent } = require('./config');
const { generateReply: generateProviderReply } = require('./providers');

const SUPPORTED_COMMANDS = new Set(['/start', '/help', '/clear', '/memory', '/id']);

function createTelegramRouter({ config, telegramClient, memoryStore }) {
  const router = express.Router();
  const deadLetterFile = process.env.TELEGRAM_DEAD_LETTER_FILE || path.join(process.cwd(), 'logs', 'telegram_dead_letters.jsonl');

  router.get('/healthz', (req, res) => {
    res.json({
      ok: true,
      service: 'gaing-telegram-router',
      supabase_memory: memoryStore.isSupabaseEnabled(),
      timestamp: new Date().toISOString()
    });
  });

  router.post('/webhook/:agent', async (req, res) => {
    const traceId = createTraceId();

    try {
      const agent = normalizeAgent(req.params.agent);
      if (!agent) {
        return res.status(400).json({ ok: false, error: 'Missing agent in path.', traceId });
      }

      const token = config.getAgentToken(agent);
      if (!token) {
        return res.status(404).json({ ok: false, error: `Unknown agent "${agent}".`, traceId });
      }

      const authError = verifySecretHeader(req, config, agent);
      if (authError) {
        return res.status(401).json({ ok: false, error: authError, traceId });
      }

      const update = req.body || {};
      const message = update.message || update.edited_message || update.channel_post;
      if (!message) {
        return res.json({ ok: true, ignored: true, reason: 'No message payload.', traceId });
      }

      const text = extractText(message);
      if (!text) {
        return res.json({ ok: true, ignored: true, reason: 'No text payload.', traceId });
      }

      const chatId = message.chat && message.chat.id;
      const userId = message.from && message.from.id;
      if (!chatId || !userId) {
        return res.json({ ok: true, ignored: true, reason: 'Missing chat or sender.', traceId });
      }

      if (!config.isUserAllowed(userId)) {
        return res.status(403).json({ ok: false, error: `User ${userId} is not allowed.`, traceId });
      }

      if (!config.isChatAllowed(chatId)) {
        return res.status(403).json({ ok: false, error: `Chat ${chatId} is not allowed.`, traceId });
      }

      let botProfile = null;
      try {
        botProfile = await resolveBotProfile(agent, config, telegramClient);
      } catch (err) {
        botProfile = {
          id: null,
          username: config.getBotUsername(agent) || ''
        };
      }

      const command = parseCommand(text);
      if (command && command.target && botProfile.username && command.target !== botProfile.username) {
        return res.json({ ok: true, ignored: true, reason: 'Command addressed to another bot.', traceId });
      }

      if (!shouldHandleMessage(message, text, botProfile)) {
        return res.json({ ok: true, ignored: true, reason: 'Mention required in group.', traceId });
      }

      const reply = await buildReply({
        agent,
        chatId,
        userId,
        text,
        command,
        config,
        memoryStore
      });

      if (!reply) {
        return res.json({ ok: true, ignored: true, reason: 'No reply generated.', traceId });
      }

      await sendReplyWithRetry(telegramClient, {
        agent,
        chatId,
        reply,
        messageId: message.message_id
      });

      console.log(JSON.stringify({
        event: 'telegram_router_delivery',
        ok: true,
        traceId,
        agent,
        chatId,
        userId,
        ts: Date.now()
      }));

      return res.json({ ok: true, traceId });
    } catch (err) {
      await writeDeadLetter(deadLetterFile, {
        traceId,
        error: err.message,
        ts: new Date().toISOString(),
        route: '/telegram/webhook/:agent'
      });
      return res.status(502).json({ ok: false, error: err.message, traceId });
    }
  });

  return router;
}

async function sendReplyWithRetry(telegramClient, { agent, chatId, reply, messageId }) {
  const maxAttempts = Math.max(1, Number.parseInt(process.env.TELEGRAM_SEND_MAX_ATTEMPTS || '3', 10));
  const baseDelayMs = Math.max(100, Number.parseInt(process.env.TELEGRAM_SEND_RETRY_BASE_MS || '300', 10));
  let lastError = null;
  let useReplyTarget = Boolean(messageId);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const extra = useReplyTarget ? { reply_to_message_id: messageId } : {};
      await telegramClient.sendMessage(agent, chatId, reply, extra);
      return;
    } catch (err) {
      if (useReplyTarget && shouldRetryWithoutReplyTarget(err)) {
        useReplyTarget = false;
        continue;
      }
      lastError = err;
      if (attempt >= maxAttempts) {
        break;
      }
      const jitterMs = Math.floor(Math.random() * 120);
      const waitMs = (baseDelayMs * attempt) + jitterMs;
      await sleep(waitMs);
    }
  }

  throw lastError || new Error('Telegram send failed after retries');
}

function shouldRetryWithoutReplyTarget(error) {
  const text = String((error && error.message) || '').toLowerCase();
  return text.includes('message to be replied not found');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeDeadLetter(filePath, payload) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (err) {
    // Dead-letter writing must not crash webhook handling.
  }
}

function verifySecretHeader(req, config, agent) {
  const expectedSecret = config.getWebhookSecret(agent);
  const providedSecret = req.get('x-telegram-bot-api-secret-token') || '';

  if (!expectedSecret && !config.requireWebhookSecret) {
    return '';
  }

  if (!expectedSecret) {
    return `Missing webhook secret for agent "${agent}".`;
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return 'Invalid webhook secret header.';
  }

  return '';
}

async function resolveBotProfile(agent, config, telegramClient) {
  const me = await telegramClient.getMe(agent);
  return {
    id: me && me.id ? me.id : null,
    username: normalizeUsername((me && me.username) || config.getBotUsername(agent))
  };
}

function shouldHandleMessage(message, text, botProfile) {
  const chatType = message.chat && message.chat.type;
  if (chatType === 'private') {
    return true;
  }

  if (chatType !== 'group' && chatType !== 'supergroup') {
    return false;
  }

  if (text.startsWith('/')) {
    return true;
  }

  if (isReplyToBot(message, botProfile)) {
    return true;
  }

  if (hasMention(message, text, botProfile.username)) {
    return true;
  }

  return false;
}

function isReplyToBot(message, botProfile) {
  if (!message.reply_to_message || !message.reply_to_message.from) {
    return false;
  }

  const replyAuthor = message.reply_to_message.from;
  if (botProfile.id && replyAuthor.id === botProfile.id) {
    return true;
  }

  if (botProfile.username && normalizeUsername(replyAuthor.username) === botProfile.username) {
    return true;
  }

  return false;
}

function hasMention(message, text, username) {
  if (!username) {
    return false;
  }

  const normalizedUsername = normalizeUsername(username);
  const mentionPattern = new RegExp(`(^|\\s)@${escapeRegex(normalizedUsername)}(\\b|\\s|$)`, 'i');
  if (mentionPattern.test(text)) {
    return true;
  }

  const entities = Array.isArray(message.entities) ? message.entities : [];
  for (const entity of entities) {
    if (entity.type === 'mention') {
      const slice = text.slice(entity.offset, entity.offset + entity.length);
      if (normalizeUsername(slice) === normalizedUsername) {
        return true;
      }
    }

    if (entity.type === 'text_mention' && entity.user && normalizeUsername(entity.user.username) === normalizedUsername) {
      return true;
    }
  }

  return false;
}

async function buildReply({ agent, chatId, userId, text, command, config, memoryStore }) {
  if (command && SUPPORTED_COMMANDS.has(command.name)) {
    return handleCommand({ agent, chatId, userId, command, memoryStore });
  }

  if (command && !SUPPORTED_COMMANDS.has(command.name)) {
    return 'Unknown command. Use /help for supported commands.';
  }

  const cleanUserMessage = stripBotMentions(text);
  const history = await memoryStore.getConversation(agent, chatId, userId, config.maxConversationMessages);

  const context = {
    systemPrompt: config.getAgentModelConfig(agent).systemPrompt || buildDefaultSystemPrompt(agent)
  };

  const reply = await generateProviderReply({
    agent,
    userMessage: cleanUserMessage,
    history,
    context,
    config: config.getAgentModelConfig(agent)
  });

  await memoryStore.appendConversation(agent, chatId, userId, 'user', cleanUserMessage, config.maxConversationMessages);
  await memoryStore.appendConversation(agent, chatId, userId, 'assistant', reply, config.maxConversationMessages);
  await memoryStore.setShort(agent, chatId, userId, cleanUserMessage);

  return reply;
}

async function handleCommand({ agent, chatId, userId, command, memoryStore }) {
  if (command.name === '/start') {
    return `GAING router is online for "${agent}". Use /help for available commands.`;
  }

  if (command.name === '/help') {
    return [
      'Commands:',
      '/start - router status',
      '/help - this message',
      '/id - show your Telegram user/chat IDs',
      '/clear - clear conversation + short memory',
      '/memory - show short memory',
      '/memory <text> - set short memory'
    ].join('\n');
  }

  if (command.name === '/id') {
    return `user_id=${userId}\nchat_id=${chatId}\nagent=${agent}`;
  }

  if (command.name === '/clear') {
    await memoryStore.clear(agent, chatId, userId);
    return 'Conversation and short memory cleared.';
  }

  if (command.name === '/memory') {
    if (!command.args) {
      const current = await memoryStore.getShort(agent, chatId, userId);
      const history = await memoryStore.getConversation(agent, chatId, userId);
      return current
        ? `Short memory: "${truncate(current, 240)}"\nHistory messages: ${history.length}`
        : `No short memory set.\nHistory messages: ${history.length}`;
    }

    const arg = command.args.trim();
    if (arg === 'clear' || arg === 'reset') {
      await memoryStore.clear(agent, chatId, userId);
      return 'Conversation and short memory cleared.';
    }

    const saved = await memoryStore.setShort(agent, chatId, userId, arg);
    return `Short memory saved: "${truncate(saved, 240)}"`;
  }

  return '';
}

function parseCommand(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const firstSpaceIndex = trimmed.indexOf(' ');
  const commandToken = firstSpaceIndex === -1 ? trimmed : trimmed.slice(0, firstSpaceIndex);
  const args = firstSpaceIndex === -1 ? '' : trimmed.slice(firstSpaceIndex + 1).trim();

  const raw = commandToken.slice(1);
  const atIndex = raw.indexOf('@');
  const name = atIndex === -1 ? raw : raw.slice(0, atIndex);
  const target = atIndex === -1 ? '' : raw.slice(atIndex + 1);

  return {
    name: `/${name.toLowerCase()}`,
    target: normalizeUsername(target),
    args
  };
}

function extractText(message) {
  return String(message.text || message.caption || '').trim();
}

function stripBotMentions(text) {
  return String(text || '').replace(/@\w+/g, '').trim() || String(text || '').trim();
}

function buildDefaultSystemPrompt(agent) {
  return `You are ${agent}, a GAING assistant responding in Telegram. Keep replies concise, useful, and action-oriented.`;
}

function truncate(value, limit) {
  const normalized = String(value || '').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, limit - 3))}...`;
}

function normalizeUsername(value) {
  return String(value || '').replace(/^@+/, '').trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTraceId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = {
  createTelegramRouter
};
