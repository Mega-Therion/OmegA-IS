const openai = require('./openai');
const gemini = require('./gemini');
const claude = require('./claude');
const grok = require('./grok');
const perplexity = require('./perplexity');
const deepseek = require('./deepseek');
const kimi = require('./kimi');
const localSafe = require('./local-safe');
const { pickString } = require('./utils');

const providerMap = Object.freeze({
  codex: openai,
  openai,
  grav: openai,
  gemini,
  claude,
  anthropic: claude,
  grok,
  perplexity,
  deepseek,
  kimi,
});

function normalizeAgent(agent) {
  return pickString(agent, 'codex').toLowerCase();
}

function getProvider(agent) {
  const normalized = normalizeAgent(agent);
  return providerMap[normalized] || providerMap.codex;
}

function getOpenAIFallbackConfig(config = {}) {
  const apiKey = pickString(
    config.openaiApiKey,
    config.fallbackOpenAIApiKey,
    config?.fallback?.openaiApiKey,
    process.env.OPENAI_API_KEY
  );

  if (!apiKey) {
    return null;
  }

  return {
    ...config,
    apiKey,
    model: pickString(config.openaiModel, process.env.OPENAI_MODEL, 'gpt-4o-mini'),
    baseUrl: pickString(config.openaiBaseUrl, process.env.OPENAI_BASE_URL, 'https://api.openai.com/v1'),
  };
}

async function generateReply(input = {}) {
  const agent = normalizeAgent(input.agent);
  const provider = getProvider(agent);

  try {
    return await provider.generateReply({
      ...input,
      agent,
    });
  } catch (primaryError) {
    console.warn(`[TelegramProviders] ${agent} failed: ${primaryError.message}`);

    if (agent !== 'openai' && agent !== 'codex') {
      const fallbackConfig = getOpenAIFallbackConfig(input.config || {});
      if (fallbackConfig) {
        try {
          const fallbackReply = await providerMap.openai.generateReply({
            ...input,
            agent: 'openai',
            config: fallbackConfig,
          });
          return `(Cloud Bridge) ${fallbackReply}`;
        } catch (fallbackError) {
          console.warn(`[TelegramProviders] OpenAI fallback failed: ${fallbackError.message}`);
        }
      }
    }

    return localSafe.generateReply({
      ...input,
      agent,
      error: primaryError,
    });
  }
}

module.exports = {
  providerMap,
  getProvider,
  generateReply,
};
