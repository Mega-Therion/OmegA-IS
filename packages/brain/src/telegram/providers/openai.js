const { generateOpenAICompatibleReply } = require('./openai-compatible');
const { pickString } = require('./utils');

async function generateReply(input) {
  return generateOpenAICompatibleReply({
    ...input,
    defaults: {
      name: 'OpenAI',
      apiKey: pickString(process.env.OPENAI_API_KEY),
      baseUrl: pickString(process.env.OPENAI_BASE_URL, 'https://api.openai.com/v1'),
      model: pickString(process.env.OPENAI_MODEL, 'gpt-4o-mini'),
      path: '/chat/completions',
    },
  });
}

module.exports = {
  generateReply,
};
