const { generateOpenAICompatibleReply } = require('./openai-compatible');
const { pickString } = require('./utils');

async function generateReply(input) {
  return generateOpenAICompatibleReply({
    ...input,
    defaults: {
      name: 'Grok',
      apiKey: pickString(process.env.GROK_API_KEY),
      baseUrl: 'https://api.x.ai/v1',
      model: pickString(process.env.GROK_MODEL, 'grok-beta'),
      path: '/chat/completions',
    },
  });
}

module.exports = {
  generateReply,
};
