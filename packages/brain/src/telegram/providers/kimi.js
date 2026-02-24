const { generateOpenAICompatibleReply } = require('./openai-compatible');
const { pickString } = require('./utils');

async function generateReply(input) {
  return generateOpenAICompatibleReply({
    ...input,
    defaults: {
      name: 'Kimi',
      apiKey: pickString(process.env.KIMI_API_KEY, process.env.MOONSHOT_API_KEY),
      baseUrl: pickString(process.env.KIMI_BASE_URL, 'https://api.moonshot.cn/v1'),
      model: pickString(process.env.KIMI_MODEL, 'moonshot-v1-8k'),
      path: '/chat/completions',
    },
  });
}

module.exports = {
  generateReply,
};
