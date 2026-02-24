'use strict';

function normalizeAgent(agent) {
  return String(agent || '').trim().toLowerCase();
}

function toAgentEnvKey(agent) {
  return normalizeAgent(agent).replace(/[^a-z0-9]+/g, '_').toUpperCase();
}

function readPort(env) {
  const rawPort = env.TELEGRAM_ROUTER_PORT || env.PORT || '8080';
  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8080;
}

function parseIdCsv(input, allowNegative = false) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
  const values = input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => pattern.test(part))
    .map((part) => Number.parseInt(part, 10))
    .filter(Number.isFinite);

  return Array.from(new Set(values));
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function createConfig(env = process.env) {
  const supabaseKey =
    env.TELEGRAM_SUPABASE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_KEY ||
    '';

  const allowedUserIds = parseIdCsv(env.TELEGRAM_ALLOWED_USER_IDS, false);
  const allowedChatIds = parseIdCsv(env.TELEGRAM_ALLOWED_CHAT_IDS, true);
  const maxConversationMessagesRaw = Number.parseInt(env.TELEGRAM_MAX_CONVERSATION_MESSAGES || '20', 10);
  const maxConversationMessages =
    Number.isFinite(maxConversationMessagesRaw) && maxConversationMessagesRaw > 0
      ? Math.min(maxConversationMessagesRaw, 100)
      : 20;

  return {
    port: readPort(env),
    requireWebhookSecret: env.TELEGRAM_REQUIRE_WEBHOOK_SECRET !== '0',
    webhookPathPrefix: pickString(env.TELEGRAM_WEBHOOK_PATH_PREFIX, '/telegram/webhook'),
    allowedUserIds,
    allowedChatIds,
    maxConversationMessages,
    supabase: {
      url: env.TELEGRAM_SUPABASE_URL || env.SUPABASE_URL || '',
      key: supabaseKey,
      table: env.TELEGRAM_MEMORY_TABLE || 'telegram_short_memory'
    },
    getAgentToken(agent) {
      const key = toAgentEnvKey(agent);
      const token =
        env[`TELEGRAM_${key}_BOT_TOKEN`] ||
        env[`${key}_BOT_TOKEN`] ||
        env[`TELEGRAM_${key}_GAING_BOT_TOKEN`] ||
        env[`TELEGRAM_${key}_TOKEN`] ||
        '';

      if (token) {
        return token;
      }

      // Only allow global fallback when explicitly enabled (or for SAFA compatibility).
      if (env.TELEGRAM_ALLOW_GLOBAL_TOKEN_FALLBACK === '1' || key === 'SAFA') {
        return env.TELEGRAM_BOT_TOKEN || env.GAING_TELEGRAM_BOT_TOKEN || '';
      }

      return '';
    },
    getWebhookSecret(agent) {
      const key = toAgentEnvKey(agent);
      return (
        env[`TELEGRAM_SECRET_${key}`] ||
        env[`TELEGRAM_${key}_WEBHOOK_SECRET`] ||
        env[`TELEGRAM_${key}_SECRET`] ||
        env.TELEGRAM_WEBHOOK_SECRET ||
        ''
      );
    },
    getBotUsername(agent) {
      const key = toAgentEnvKey(agent);
      const raw =
        env[`TELEGRAM_${key}_BOT_USERNAME`] ||
        env[`TELEGRAM_${key}_USERNAME`] ||
        env.TELEGRAM_BOT_USERNAME ||
        '';
      return raw.replace(/^@+/, '').trim().toLowerCase();
    },
    isUserAllowed(userId) {
      if (!Array.isArray(allowedUserIds) || allowedUserIds.length === 0) {
        return true;
      }
      return allowedUserIds.includes(Number.parseInt(String(userId), 10));
    },
    isChatAllowed(chatId) {
      if (!Array.isArray(allowedChatIds) || allowedChatIds.length === 0) {
        return true;
      }
      return allowedChatIds.includes(Number.parseInt(String(chatId), 10));
    },
    getAgentModelConfig(agent) {
      const key = toAgentEnvKey(agent);
      const defaultOpenAIBase = pickString(env.OPENAI_BASE_URL, 'https://api.openai.com/v1');

      return {
        apiKey: pickString(env[`TELEGRAM_${key}_API_KEY`], env[`${key}_API_KEY`]),
        model: pickString(env[`TELEGRAM_${key}_MODEL`], env[`${key}_MODEL`]),
        baseUrl: pickString(env[`TELEGRAM_${key}_BASE_URL`], env[`${key}_BASE_URL`]),
        openaiApiKey: pickString(env.OPENAI_API_KEY),
        openaiModel: pickString(env.OPENAI_MODEL, 'gpt-4o-mini'),
        openaiBaseUrl: defaultOpenAIBase,
        systemPrompt: pickString(env[`TELEGRAM_${key}_SYSTEM_PROMPT`], env.TELEGRAM_SYSTEM_PROMPT)
      };
    }
  };
}

module.exports = {
  createConfig,
  normalizeAgent,
  toAgentEnvKey
};
