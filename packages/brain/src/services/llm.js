const config = require('../config/env');

function getLlmStatus() {
  if (!config.LLM_PROVIDER) {
    return { provider: null, ready: false, missing: ['LLM_PROVIDER'] };
  }
  return { provider: config.LLM_PROVIDER, ready: true };
}

async function callLlm(payload, options = {}) {
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

    // --- API CALL WITH TIMEOUT AND RETRY ---
    const maxRetries = options.maxRetries || 3;
    const timeoutMs = options.timeout || 30000; // 30 second default timeout

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errText = await response.text();
                    const statusCode = response.status;

                    // Don't retry on client errors (4xx)
                    if (statusCode >= 400 && statusCode < 500) {
                        throw new Error(`${provider} API Error ${statusCode}: ${errText.substring(0, 200)}`);
                    }

                    // Retry on server errors (5xx)
                    if (attempt === maxRetries) {
                        throw new Error(`${provider} API Error ${statusCode} (after ${maxRetries} attempts): ${errText.substring(0, 200)}`);
                    }

                    console.warn(`[LLM] ${provider} returned ${statusCode}, retrying (${attempt}/${maxRetries})...`);
                    // Exponential backoff: 2s, 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                }

                const data = await response.json();

                if (attempt > 1) {
                    console.log(`[LLM] ${provider} call succeeded on attempt ${attempt}`);
                }

                return data;

            } finally {
                clearTimeout(timeoutId);
            }

        } catch (err) {
            // Handle timeout
            if (err.name === 'AbortError') {
                if (attempt === maxRetries) {
                    console.error(`[LLM] ${provider} request timeout after ${maxRetries} attempts (${timeoutMs}ms each)`);
                    throw new Error(`${provider} request timeout after ${timeoutMs}ms`);
                }
                console.warn(`[LLM] ${provider} request timeout, retrying (${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                continue;
            }

            // Handle network errors
            if (err.message.includes('fetch failed') || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
                if (attempt === maxRetries) {
                    console.error(`[LLM] ${provider} network error after ${maxRetries} attempts:`, err.message);
                    throw new Error(`${provider} network error: ${err.message}`);
                }
                console.warn(`[LLM] ${provider} network error, retrying (${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                continue;
            }

            // Don't retry on other errors (validation, etc.)
            console.error(`[LLM] ${provider} call failed:`, err.message);
            throw err;
        }
    }

    throw new Error(`${provider} call failed after ${maxRetries} attempts`);
}

module.exports = {
  getLlmStatus,
  callLlm
};
