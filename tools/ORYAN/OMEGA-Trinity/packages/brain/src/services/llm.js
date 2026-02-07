const config = require('../config/env');

function getLlmStatus() {
  if (!config.LLM_PROVIDER) {
    return { provider: null, ready: false, missing: ['LLM_PROVIDER'] };
  }
  return { provider: config.LLM_PROVIDER, ready: true };
}

async function callLlm(payload) {
    // Determine provider based on payload override or config default
    let provider = payload.provider || config.LLM_PROVIDER;
    let apiKey, baseUrl, model;

    // --- PROVIDER CONFIGURATION ---
    if (provider === 'openai') {
        apiKey = config.OPENAI_API_KEY;
        baseUrl = config.OPENAI_BASE_URL || 'https://api.openai.com/v1';
        model = payload.model || config.OPENAI_MODEL || 'gpt-4o-mini';
    } 
    else if (provider === 'grok') {
        apiKey = config.GROK_API_KEY;
        baseUrl = 'https://api.x.ai/v1';
        model = payload.model || 'grok-beta';
    } 
    else if (provider === 'deepseek') {
        apiKey = config.DEEPSEEK_API_KEY;
        baseUrl = config.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
        model = payload.model || 'deepseek-chat';
    }
    else if (provider === 'perplexity') {
        apiKey = config.PERPLEXITY_API_KEY;
        baseUrl = 'https://api.perplexity.ai';
        model = payload.model || 'sonar';
    }
    else {
        throw new Error(`Unknown LLM Provider: ${provider}`);
    }

    if (!apiKey) throw new Error(`Missing API Key for provider: ${provider}`);

    // --- API CALL ---
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: payload.messages,
                temperature: payload.temperature || 0.7,
                max_tokens: payload.maxTokens
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`${provider} API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data;

    } catch (err) {
        console.error(`[LLM] Call failed (${provider}):`, err);
        throw err;
    }
}

module.exports = {
  getLlmStatus,
  callLlm
};
