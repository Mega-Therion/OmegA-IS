const { buildMessages, pickString, postJson, resolveGenerationConfig } = require('./utils');

async function generateReply({ userMessage, history, context, config = {} }) {
  const apiKey = pickString(config.apiKey, process.env.ANTHROPIC_API_KEY);
  if (!apiKey) {
    throw new Error('Claude: missing API key');
  }

  const model = pickString(config.model, process.env.ANTHROPIC_MODEL, 'claude-3-5-sonnet-20241022');
  const { temperature, maxTokens, timeoutMs } = resolveGenerationConfig(config);
  const messages = buildMessages({ userMessage, history, context, config });

  let system = '';
  const claudeMessages = [];

  for (const message of messages) {
    if (message.role === 'system') {
      system = message.content;
      continue;
    }
    claudeMessages.push({ role: message.role, content: message.content });
  }

  if (claudeMessages.length === 0) {
    throw new Error('Claude: no user or assistant messages to send');
  }

  const payload = {
    model,
    messages: claudeMessages,
    max_tokens: maxTokens,
    temperature,
  };

  if (system) {
    payload.system = system;
  }

  const json = await postJson('https://api.anthropic.com/v1/messages', {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2024-01-01',
    },
    body: payload,
    timeoutMs,
  });

  const blocks = Array.isArray(json?.content) ? json.content : [];
  const reply = blocks
    .filter(block => block && block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim();

  if (!reply) {
    throw new Error('Claude: empty reply');
  }

  return reply;
}

module.exports = {
  generateReply,
};
