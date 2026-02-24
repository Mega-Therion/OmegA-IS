const {
  buildMessages,
  extractOpenAIContent,
  pickString,
  postJson,
  resolveGenerationConfig,
  trimTrailingSlash,
} = require('./utils');

async function generateOpenAICompatibleReply({
  userMessage,
  history,
  context,
  config = {},
  defaults,
}) {
  const apiKey = pickString(config.apiKey, defaults.apiKey);
  if (!apiKey) {
    throw new Error(`${defaults.name}: missing API key`);
  }

  const baseUrl = trimTrailingSlash(pickString(config.baseUrl, defaults.baseUrl));
  const model = pickString(config.model, defaults.model);
  const endpoint = defaults.path || '/chat/completions';
  const { temperature, maxTokens, timeoutMs } = resolveGenerationConfig(config, defaults);

  const messages = buildMessages({ userMessage, history, context, config });
  if (messages.length === 0) {
    throw new Error(`${defaults.name}: no messages to send`);
  }

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const json = await postJson(`${baseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(defaults.headers || {}),
    },
    body: payload,
    timeoutMs,
  });

  const reply = extractOpenAIContent(json);
  if (!reply) {
    throw new Error(`${defaults.name}: empty reply`);
  }

  return reply;
}

module.exports = {
  generateOpenAICompatibleReply,
};
