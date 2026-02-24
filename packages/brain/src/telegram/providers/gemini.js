const { buildMessages, pickString, postJson, resolveGenerationConfig } = require('./utils');

async function generateReply({ userMessage, history, context, config = {} }) {
  const apiKey = pickString(config.apiKey, process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error('Gemini: missing API key');
  }

  const model = pickString(config.model, process.env.GEMINI_MODEL, 'gemini-2.0-flash');
  const { temperature, maxTokens, timeoutMs } = resolveGenerationConfig(config);
  const messages = buildMessages({ userMessage, history, context, config });

  let systemPrompt = '';
  const contents = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemPrompt = message.content;
      continue;
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    });
  }

  if (contents.length === 0) {
    throw new Error('Gemini: no user or assistant messages to send');
  }

  const payload = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const json = await postJson(url, {
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    timeoutMs,
  });

  const reply = json?.candidates?.[0]?.content?.parts
    ?.map(part => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  if (!reply) {
    throw new Error('Gemini: empty reply');
  }

  return reply;
}

module.exports = {
  generateReply,
};
