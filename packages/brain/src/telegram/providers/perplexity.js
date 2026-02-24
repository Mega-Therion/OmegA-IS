const { generateOpenAICompatibleReply } = require('./openai-compatible');
const { pickString } = require('./utils');

async function generateReply(input) {
  return generateOpenAICompatibleReply({
    ...input,
    defaults: {
      name: 'Perplexity',
      apiKey: pickString(process.env.PERPLEXITY_API_KEY),
      baseUrl: 'https://api.perplexity.ai',
      model: pickString(process.env.PERPLEXITY_MODEL, 'sonar-pro'),
      path: '/chat/completions',
    },
  });
}

module.exports = {
  generateReply,
};
