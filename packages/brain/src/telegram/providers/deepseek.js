const { generateOpenAICompatibleReply } = require('./openai-compatible');
const { pickString } = require('./utils');

async function generateReply(input) {
  return generateOpenAICompatibleReply({
    ...input,
    defaults: {
      name: 'DeepSeek',
      apiKey: pickString(process.env.DEEPSEEK_API_KEY),
      baseUrl: pickString(process.env.DEEPSEEK_BASE_URL, 'https://api.deepseek.com/v1'),
      model: pickString(process.env.DEEPSEEK_MODEL, 'deepseek-chat'),
      path: '/chat/completions',
    },
  });
}

module.exports = {
  generateReply,
};
