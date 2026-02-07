/**
 * LLM Client - OMEGA Core
 * 
 * Unified LLM client supporting multiple providers:
 * - OpenAI (GPT-4, Codex)
 * - Anthropic (Claude)
 * - Google (Gemini)
 * - xAI (Grok)
 * - GitHub Models
 * - DeepSeek
 * - Perplexity
 * 
 * Ported and enhanced from bridge/llm_client.py
 */

const https = require('https');

const PROVIDERS = {
    openai: {
        baseUrl: 'api.openai.com',
        path: '/v1/chat/completions',
        model: 'gpt-4o-mini',
        envKey: 'OPENAI_API_KEY'
    },
    anthropic: {
        baseUrl: 'api.anthropic.com',
        path: '/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        envKey: 'ANTHROPIC_API_KEY'
    },
    gemini: {
        baseUrl: 'generativelanguage.googleapis.com',
        path: '/v1beta/models',
        model: 'gemini-2.0-flash',
        envKey: 'GEMINI_API_KEY'
    },
    grok: {
        baseUrl: 'api.x.ai',
        path: '/v1/chat/completions',
        model: 'grok-beta',
        envKey: 'GROK_API_KEY'
    },
    github: {
        baseUrl: 'models.inference.ai.azure.com',
        path: '/chat/completions',
        model: 'gpt-4o-mini',
        envKey: 'GITHUB_TOKEN'
    },
    deepseek: {
        baseUrl: 'api.deepseek.com',
        path: '/v1/chat/completions',
        model: 'deepseek-chat',
        envKey: 'DEEPSEEK_API_KEY'
    },
    perplexity: {
        baseUrl: 'api.perplexity.ai',
        path: '/chat/completions',
        model: 'llama-3.1-sonar-small-128k-online',
        envKey: 'PERPLEXITY_API_KEY'
    }
};

class LLMClient {
    /**
     * @param {string} provider - Provider name (openai, anthropic, gemini, grok, etc.)
     */
    constructor(provider = null) {
        this.provider = provider || process.env.LLM_PROVIDER || 'openai';
        this._configure();
    }

    _configure() {
        const config = PROVIDERS[this.provider] || PROVIDERS.openai;
        this.apiKey = process.env[config.envKey];
        this.baseUrl = config.baseUrl;
        this.path = config.path;
        this.model = process.env[`${this.provider.toUpperCase()}_MODEL`] || config.model;
    }

    get isAvailable() {
        return !!this.apiKey;
    }

    /**
     * Send a chat completion request
     * @param {Array} messages - Array of {role, content} objects
     * @param {Object} options - Additional options (temperature, max_tokens)
     * @returns {Promise<string|null>} Response text or null on failure
     */
    async complete(messages, options = {}) {
        if (!this.isAvailable) {
            return null;
        }

        try {
            if (this.provider === 'gemini') {
                return await this._completeGemini(messages, options);
            } else if (this.provider === 'anthropic') {
                return await this._completeAnthropic(messages, options);
            } else {
                return await this._completeOpenAI(messages, options);
            }
        } catch (error) {
            console.error(`[LLM] ${this.provider} error:`, error.message);
            return null;
        }
    }

    async _completeOpenAI(messages, options) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        const payload = {
            model: this.model,
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 2000
        };

        return this._request(this.baseUrl, this.path, headers, payload,
            data => data.choices?.[0]?.message?.content);
    }

    async _completeAnthropic(messages, options) {
        let systemContent = '';
        const anthropicMessages = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemContent = msg.content;
            } else {
                anthropicMessages.push({ role: msg.role, content: msg.content });
            }
        }

        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2024-01-01'
        };

        const payload = {
            model: this.model,
            messages: anthropicMessages,
            max_tokens: options.max_tokens || 2000
        };

        if (systemContent) {
            payload.system = systemContent;
        }

        return this._request(this.baseUrl, this.path, headers, payload,
            data => data.content?.[0]?.text);
    }

    async _completeGemini(messages, options) {
        const contents = [];
        let systemInstruction = null;

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = msg.content;
            } else {
                const role = msg.role === 'user' ? 'user' : 'model';
                contents.push({ role, parts: [{ text: msg.content }] });
            }
        }

        const payload = {
            contents,
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.max_tokens || 2000
            }
        };

        if (systemInstruction) {
            payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const path = `${this.path}/${this.model}:generateContent?key=${this.apiKey}`;

        return this._request(this.baseUrl, path, { 'Content-Type': 'application/json' }, payload,
            data => data.candidates?.[0]?.content?.parts?.[0]?.text);
    }

    _request(hostname, path, headers, payload, extractor) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);

            const req = https.request({
                hostname,
                path,
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(data)
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        const result = extractor(json);
                        if (result) {
                            resolve(result);
                        } else {
                            reject(new Error(json.error?.message || 'No response'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Get list of all available providers with their status
     */
    static getProvidersStatus() {
        const status = {};
        for (const [name, config] of Object.entries(PROVIDERS)) {
            status[name] = {
                available: !!process.env[config.envKey],
                model: config.model,
                envKey: config.envKey
            };
        }
        return status;
    }
}

/**
 * Decompose an objective into actionable sub-goals using LLM
 */
async function decomposeWithLLM(objective, maxGoals = 5, provider = null) {
    const client = new LLMClient(provider);

    if (!client.isAvailable) {
        return fallbackDecomposition(objective);
    }

    const systemPrompt = `You are an expert project decomposer for a multi-agent AI system.
Your task is to break down objectives into 3-5 distinct, actionable sub-goals.

Rules:
1. Each sub-goal should be specific and actionable
2. Sub-goals should cover different aspects: research, design, implementation, testing
3. Return ONLY a JSON array of strings, no other text
4. Keep each sub-goal concise (under 100 characters)

Example output:
["Research existing solutions", "Design system architecture", "Implement core modules", "Write tests", "Document the API"]`;

    const response = await client.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Decompose this objective into ${maxGoals} sub-goals:\n\n${objective}` }
    ]);

    if (response) {
        try {
            let clean = response.trim();
            if (clean.startsWith('```')) {
                clean = clean.split('\n', 2)[1].split('```')[0];
            }
            const goals = JSON.parse(clean);
            if (Array.isArray(goals) && goals.every(g => typeof g === 'string')) {
                return goals.slice(0, maxGoals);
            }
        } catch (e) {
            // Fall through to fallback
        }
    }

    return fallbackDecomposition(objective);
}

/**
 * Template-based decomposition when LLM is unavailable
 */
function fallbackDecomposition(objective) {
    return [
        `Research requirements for: ${objective}`,
        `Design architecture for: ${objective}`,
        `Create implementation plan for: ${objective}`,
        `Develop and test: ${objective}`,
        `Document and deploy: ${objective}`
    ];
}

module.exports = { LLMClient, PROVIDERS, decomposeWithLLM, fallbackDecomposition };
