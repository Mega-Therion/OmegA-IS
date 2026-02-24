const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TIMEOUT_MS = Number.parseInt(
  process.env.TELEGRAM_PROVIDER_TIMEOUT_MS || '45000',
  10
);

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function pickNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(message => message && typeof message.content === 'string')
    .map(message => ({
      role: ['system', 'user', 'assistant'].includes(message.role)
        ? message.role
        : 'user',
      content: message.content.trim(),
    }))
    .filter(message => Boolean(message.content));
}

function buildMessages({ userMessage, history = [], context = {}, config = {} }) {
  const messages = [];
  const systemPrompt = pickString(
    context.systemPrompt,
    context.system,
    config.systemPrompt,
    config.system
  );

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push(...normalizeHistory(history));

  const prompt = pickString(userMessage);
  if (prompt) {
    messages.push({ role: 'user', content: prompt });
  }

  return messages;
}

function extractOpenAIContent(json) {
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const merged = content
      .map(part => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join(' ')
      .trim();

    if (merged) {
      return merged;
    }
  }

  return '';
}

async function postJson(url, { headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();
    let json = null;

    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const detail =
        json?.error?.message ||
        json?.message ||
        (raw ? raw.slice(0, 400) : response.statusText);
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    if (json) {
      return json;
    }

    return raw;
  } finally {
    clearTimeout(timer);
  }
}

function resolveGenerationConfig(config = {}, defaults = {}) {
  return {
    temperature: pickNumber(config.temperature, defaults.temperature, DEFAULT_TEMPERATURE),
    maxTokens: pickNumber(config.maxTokens, config.max_tokens, defaults.maxTokens, DEFAULT_MAX_TOKENS),
    timeoutMs: pickNumber(config.timeoutMs, defaults.timeoutMs, DEFAULT_TIMEOUT_MS),
  };
}

module.exports = {
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIMEOUT_MS,
  buildMessages,
  extractOpenAIContent,
  pickString,
  pickNumber,
  postJson,
  resolveGenerationConfig,
  trimTrailingSlash,
};
