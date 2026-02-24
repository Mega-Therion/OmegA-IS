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
    else if (provider === 'ollama') {
        apiKey = 'ollama'; // dummy
        baseUrl = config.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';
        model = payload.model || config.OLLAMA_MODEL || 'llama3';
    }
    else if (provider === 'gemini') {
        apiKey = config.GEMINI_API_KEY;
        // Point to the Gemini OpenAI-compatible endpoint if available, 
        // OR we use the specialized logic. 
        // For now, let's assume we want to use the OpenAI-compatible one if possible, 
        // but most users use the standard Google AI SDK or a bridge.
        // Let's implement the Google AI format if it's easier, but many people use an OpenAI-bridge for Gemini.
        // Given this is a simple fetch, I'll add the Google AI fetch logic below.
        baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        model = payload.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    }
    else {
        throw new Error(`Unknown LLM Provider: ${provider}`);
    }

    if (!apiKey) throw new Error(`Missing API Key for provider: ${provider}`);

    // --- API CALL ---
    try {
        let url, fetchBody, fetchHeaders;

        if (provider === 'gemini') {
            url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;
            fetchHeaders = { 'Content-Type': 'application/json' };
            fetchBody = JSON.stringify({
                contents: payload.messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                })),
                generationConfig: {
                    maxOutputTokens: payload.maxTokens || 2048,
                    temperature: payload.temperature || 0.7
                }
            });
        } else {
            url = `${baseUrl}/chat/completions`;
            fetchHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            fetchBody = JSON.stringify({
                model: model,
                messages: payload.messages,
                temperature: payload.temperature || 0.7,
                max_tokens: payload.maxTokens
            });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: fetchHeaders,
            body: fetchBody
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`${provider} API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();

        // Standardize output format to OpenAI-like
        if (provider === 'gemini') {
            return {
                choices: [{
                    message: {
                        role: 'assistant',
                        content: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    }
                }]
            };
        }
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
