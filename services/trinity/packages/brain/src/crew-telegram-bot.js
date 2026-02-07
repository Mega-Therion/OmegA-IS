/**
 * AI Crew Telegram Bots
 * 
 * Individual Telegram bots for each AI crew member:
 * - Gemini Bot → Google Gemini API
 * - Claude Bot → Anthropic Claude API
 * - Codex Bot → OpenAI API
 * - Grok Bot → xAI Grok API
 * 
 * Each bot maintains conversation history in Supabase for memory.
 * 
 * Setup:
 * 1. Create 4 bots via @BotFather on Telegram
 * 2. Add tokens to .env (GEMINI_BOT_TOKEN, CLAUDE_BOT_TOKEN, etc.)
 * 3. Run: npm run crew
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { getPeacePipeProtocol } = require('./core/peace-pipe');
const { getNeuralPulsing } = require('./services/neural-pulsing');

// DEBUG: FORCE LOAD .ENV
const envPath = path.join(__dirname, '..', '.env');
const result = require('dotenv').config({ path: envPath, override: true });

const pulsing = getNeuralPulsing();

// Listen for global thoughts
pulsing.onPulse((pulse) => {
    // This allows bots to react to each other's actions real-time if needed
    // console.log(`[NeuralPulsing] Client received thought from ${pulse.agent}: ${pulse.intent}`);
});

if (result.error) {
    console.error('[DEBUG] Failed to load .env from:', envPath);
} else {
    // console.log('[DEBUG] Loaded .env from:', envPath);
}

// Also try loading root .env if tokens are missing
if (!process.env.GEMINI_BOT_TOKEN) {
    const rootEnvPath = path.join(__dirname, '..', '..', '..', '.env');
    require('dotenv').config({ path: rootEnvPath, override: true });
    // console.log('[DEBUG] Attempted load from root:', rootEnvPath);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CREW_CONFIG = {
    gemini: {
        name: 'Gemini',
        token: process.env.GEMINI_BOT_TOKEN,
        apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, // Fallback
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        emoji: '💎',
        handle: 'Gemini_gAIng_bot'
    },
    claude: {
        name: 'Claude',
        token: process.env.CLAUDE_BOT_TOKEN,
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        emoji: '🧠',
        handle: 'Claude_gAIng_bot'
    },
    codex: {
        name: 'Codex',
        token: process.env.CODEX_BOT_TOKEN,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        emoji: '⚡',
        handle: 'Codex_gAIng_bot'
    },
    grok: {
        name: 'Grok',
        token: process.env.GROK_BOT_TOKEN,
        apiKey: process.env.GROK_API_KEY,
        model: process.env.GROK_MODEL || 'grok-beta',
        emoji: '🚀',
        handle: 'Grok_gAIng_bot'
    },
    perplexity: {
        name: 'Perplexity',
        token: process.env.PERPLEXITY_BOT_TOKEN,
        apiKey: process.env.PERPLEXITY_API_KEY,
        model: process.env.PERPLEXITY_MODEL || 'sonar-pro',
        emoji: '🔍',
        handle: 'Perplexity_gAIng_bot'
    },
    grav: {
        name: 'Grav',
        token: process.env.GRAV_BOT_TOKEN,
        apiKey: process.env.GRAV_API_KEY || process.env.OPENAI_API_KEY, // Default to OpenAI if no specific key
        model: process.env.GRAV_MODEL || 'gpt-4o',
        emoji: '⚡'
    }
};

// Supabase config for memory
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Allowed users (security)
const ALLOWED_USERS = process.env.SAFA_ALLOWED_USERS
    ? process.env.SAFA_ALLOWED_USERS.split(',').map(id => parseInt(id.trim()))
    : [];

// Conversation memory (in-memory cache, backed by Supabase)
const conversationCache = {};

// ============================================================================
// TELEGRAM API
// ============================================================================

async function telegramRequest(token, method, params = {}) {
    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${token}/${method}`;
        const data = JSON.stringify(params);

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Invalid JSON: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function sendMessage(token, chatId, text, options = {}) {
    const MAX_LENGTH = 4000;

    if (text.length <= MAX_LENGTH) {
        return telegramRequest(token, 'sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            ...options
        });
    }

    // Split long messages
    const chunks = [];
    for (let i = 0; i < text.length; i += MAX_LENGTH) {
        chunks.push(text.slice(i, i + MAX_LENGTH));
    }

    for (const chunk of chunks) {
        await telegramRequest(token, 'sendMessage', {
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
            ...options
        });
        await new Promise(r => setTimeout(r, 300));
    }
}

async function sendTypingAction(token, chatId) {
    await telegramRequest(token, 'sendChatAction', {
        chat_id: chatId,
        action: 'typing'
    });
}

// ============================================================================
// LLM API CALLS
// ============================================================================

async function callGemini(messages, config) {
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
            temperature: 0.7,
            maxOutputTokens: 2000
        }
    };

    if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
                        resolve(json.candidates[0].content.parts[0].text);
                    } else {
                        reject(new Error(json.error?.message || 'No response from Gemini'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function callClaude(messages, config) {
    let systemContent = '';
    const anthropicMessages = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
            systemContent = msg.content;
        } else {
            anthropicMessages.push({ role: msg.role, content: msg.content });
        }
    }

    const payload = {
        model: config.model,
        messages: anthropicMessages,
        max_tokens: 2000
    };

    if (systemContent) {
        payload.system = systemContent;
    }

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2024-01-01'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.content?.[0]?.text) {
                        resolve(json.content[0].text);
                    } else {
                        reject(new Error(json.error?.message || 'No response from Claude'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function callOpenAI(messages, config) {
    const payload = {
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
    };

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.choices?.[0]?.message?.content) {
                        resolve(json.choices[0].message.content);
                    } else {
                        reject(new Error(json.error?.message || 'No response from OpenAI'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function callGrok(messages, config) {
    const payload = {
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
    };

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.x.ai',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.choices?.[0]?.message?.content) {
                        resolve(json.choices[0].message.content);
                    } else {
                        reject(new Error(json.error?.message || 'No response from Grok'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function callPerplexity(messages, config) {
    const payload = {
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
    };

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.perplexity.ai',
            path: '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.choices?.[0]?.message?.content) {
                        resolve(json.choices[0].message.content);
                    } else {
                        reject(new Error(json.error?.message || 'No response from Perplexity'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function callOllama(messages, config) {
    const payload = {
        model: 'llama3.2:1b', // Ultra-fast local model
        messages,
        stream: false
    };

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'localhost',
            port: 11434,
            path: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.message?.content) {
                        resolve(json.message.content);
                    } else {
                        reject(new Error('No response from local brain (Ollama)'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function callLLM(agent, messages, config) {
    try {
        switch (agent) {
            case 'gemini':
                return await callGemini(messages, config);
            case 'claude':
                return await callClaude(messages, config);
            case 'codex':
            case 'grav':
                return await callOpenAI(messages, config);
            case 'grok':
                return await callGrok(messages, config);
            case 'perplexity':
                return await callPerplexity(messages, config);
            default:
                throw new Error(`Unknown agent: ${agent}`);
        }
    } catch (error) {
        console.warn(`[${config.name}] API Error: ${error.message}. Attempting fallback chain...`);

        // FALLBACK 1: Try OpenAI (if not already failing OpenAI)
        if (agent !== 'codex' && agent !== 'grav' && process.env.OPENAI_API_KEY) {
            try {
                const response = await callOpenAI(messages, {
                    apiKey: process.env.OPENAI_API_KEY,
                    model: 'gpt-4o-mini'
                });
                return `(Cloud Bridge) ${response}`;
            } catch (fallbackError) {
                console.warn(`[${config.name}] Cloud Bridge failed: ${fallbackError.message}`);
            }
        }

        // FALLBACK 2: Try Local Ollama (The "Unstoppable" Brain)
        try {
            const response = await callOllama(messages, config);
            return `(Local Brain) ${response}`;
        } catch (ollamaError) {
            console.error(`[${config.name}] Local Brain also failed:`, ollamaError.message);
            throw error; // Throw original error if all fallbacks fail
        }
    }
}

// ============================================================================
// CONVERSATION MEMORY
// ============================================================================

function getConversationKey(userId, agent) {
    return `${userId}:${agent}`;
}

async function getConversation(userId, agent) {
    const key = getConversationKey(userId, agent);

    if (conversationCache[key]) {
        return conversationCache[key];
    }

    // Try to load from Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            const messages = await loadFromSupabase(userId, agent);
            conversationCache[key] = messages;
            return messages;
        } catch (e) {
            console.error('Failed to load from Supabase:', e.message);
        }
    }

    conversationCache[key] = [];
    return conversationCache[key];
}

async function addToConversation(userId, agent, role, content) {
    const key = getConversationKey(userId, agent);

    if (!conversationCache[key]) {
        conversationCache[key] = [];
    }

    const message = { role, content };
    conversationCache[key].push(message);

    // Keep last 20 messages to avoid context overflow
    if (conversationCache[key].length > 20) {
        conversationCache[key] = conversationCache[key].slice(-20);
    }

    // Save to Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            await saveToSupabase(userId, agent, role, content);
        } catch (e) {
            console.error('Failed to save to Supabase:', e.message);
        }
    }
}

async function clearConversation(userId, agent) {
    const key = getConversationKey(userId, agent);
    conversationCache[key] = [];

    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            await clearSupabaseConversation(userId, agent);
        } catch (e) {
            console.error('Failed to clear Supabase:', e.message);
        }
    }
}

// ============================================================================
// SUPABASE INTEGRATION
// ============================================================================

async function supabaseRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SUPABASE_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(data ? JSON.parse(data) : null);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function loadFromSupabase(userId, agent) {
    const path = `/rest/v1/crew_conversations?user_id=eq.${userId}&agent=eq.${agent}&order=created_at.asc&limit=20`;
    const data = await supabaseRequest('GET', path);

    if (Array.isArray(data)) {
        return data.map(row => ({ role: row.role, content: row.content }));
    }
    return [];
}

async function saveToSupabase(userId, agent, role, content) {
    await supabaseRequest('POST', '/rest/v1/crew_conversations', {
        user_id: String(userId),
        agent,
        role,
        content
    });
}

async function clearSupabaseConversation(userId, agent) {
    await supabaseRequest('DELETE', `/rest/v1/crew_conversations?user_id=eq.${userId}&agent=eq.${agent}`);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

function isAllowed(userId) {
    if (ALLOWED_USERS.length === 0) return true;
    return ALLOWED_USERS.includes(userId);
}

async function handleMessage(agent, config, message) {

    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || message.from.first_name || 'User';
    const isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup';

    // DEBUG: Log ALL messages
    console.log(`[MSG] From: ${username} (${userId}) | Chat: ${chatId} | Type: ${message.chat.type} | Text: "${message.text}"`);

    // ... rest of function ...
    // (I need to be careful not to delete the rest of the logic, so I'll just wrap the start)

    // Security check (Allow if in group, or if allowed user in DM)
    if (!isGroup && !isAllowed(userId)) {
        await sendMessage(config.token, chatId, `Sorry, you're not authorized to use ${config.name}.`);
        console.warn(`[SECURITY] Blocked DM from unauthorized user: ${userId} (${username})`);
        return;
    }


    // ... (rest of logic follows)


    // GROUP CHAT HANDLING
    // (isGroup declared above)

    // In groups, only respond if mentioned or replied to
    if (isGroup) {
        // PERMANENT GROUP DISCOVERY LOGIC
        // This helps the user find the ID of the group they just created
        if (!process.env.OMEGA_COUNCIL_CHAT_ID) {
            console.log(`\n==============[ DISCOVERY ]==============`);
            console.log(`🔔 Potential Council Group Detected!`);
            console.log(`🏷️  Name: ${message.chat.title}`);
            console.log(`🆔  ID:   ${chatId}`);
            console.log(`👉  Action: Add this line to your .env file:`);
            console.log(`    OMEGA_COUNCIL_CHAT_ID=${chatId}`);
            console.log(`=========================================\n`);

            // Temporary in-memory save so other bots in this process know about it
            process.env.OMEGA_COUNCIL_CHAT_ID = chatId;
        }
        // partial check for username (simple implementation)
        // ideally we check entities, but text search is robust enough for now
        const isMentioned = message.text && message.text.toLowerCase().includes(config.name.toLowerCase());
        const isHandleMatch = message.text && config.handle && message.text.includes(`@${config.handle}`);
        const isCrewCall = message.text && (message.text.toLowerCase().includes('crew') || message.text.toLowerCase().includes('everyone'));

        // STRICTOR CHECK: If specific handle is used, don't reply if it's not ours
        if (message.text && message.text.includes('@') && !isHandleMatch && !isCrewCall) {
            return;
        }

        const isAddressed = isMentioned || isHandleMatch || isCrewCall;

        if (!isReply && !isAddressed && !message.text?.startsWith('/')) {
            return; // Ignore general chatter in groups
        }
    }

    // CHECK PEACE PIPE (Mutex Lock)
    const ppp = getPeacePipeProtocol();
    const pppCheck = ppp.enforce(agent, message);
    if (!pppCheck.allowed && isGroup) {
        // In group, adhere strictly. In DM, maybe allow it? 
        // For OMEGA consistency, we should probably warn even in DM if a Council is active.
        // But for now, let's just enforce in groups to prevent chaos.
        await sendMessage(config.token, chatId, `🤫 Shhh... ${pppCheck.reason}`);
        return;
    }

    // Handle commands
    if (message.text?.startsWith('/')) {
        const command = message.text.split(' ')[0].split('@')[0].toLowerCase(); // handle /start@BotName

        switch (command) {
            case '/start':
            case '/help':
                await sendMessage(config.token, chatId,
                    `${config.emoji} *Hey, I'm ${config.name}!*\n\n` +
                    `Just send me a message and I'll respond.\n\n` +
                    `*Commands:*\n` +
                    `/clear - Clear our conversation history\n` +
                    `/memory - Show conversation length\n` +
                    `/help - Show this message`
                );
                return;

            case '/clear':
                await clearConversation(userId, agent);
                await sendMessage(config.token, chatId,
                    `${config.emoji} Conversation cleared! Starting fresh.`
                );
                return;

            case '/memory':
                const convo = await getConversation(userId, agent);
                await sendMessage(config.token, chatId,
                    `${config.emoji} *Memory Status*\n\n` +
                    `Messages in history: ${convo.length}\n` +
                    `Max capacity: 20 messages`
                );
                return;

            default:
                // Only reply to unknown commands in direct messages
                if (!isGroup) {
                    await sendMessage(config.token, chatId, `Unknown command. Try /help`);
                }
                return;
        }
    }

    // Handle regular messages
    if (message.text) {
        const userMessage = message.text.trim();

        if (userMessage.length < 2) {
            await sendMessage(config.token, chatId, "Message too short!");
            return;
        }

        // Show typing indicator
        await sendTypingAction(config.token, chatId);

        try {
            // Get conversation history
            const history = await getConversation(userId, agent);

            // Build messages with system prompt
            const messages = [
                {
                    role: 'system',
                    content: `You are ${config.name}, an AI assistant. Be helpful, concise, and friendly. ` +
                        `Remember: you're chatting on Telegram, so keep responses reasonably brief. ` +
                        `You're part of the OMEGA crew, a team of AI agents working together.`
                },
                ...history,
                { role: 'user', content: userMessage }
            ];

            // Add user message to history
            await addToConversation(userId, agent, 'user', userMessage);

            // Call LLM
            const response = await callLLM(agent, messages, config);

            // Add assistant response to history
            await addToConversation(userId, agent, 'assistant', response);

            // Send response
            await sendMessage(config.token, chatId, response);

            // Pulse the thought to the collective (Internal Nerve Ending)
            try {
                pulsing.pulse(config.name, 'replied', {
                    chatId,
                    userId,
                    username,
                    content: response,
                    platform: 'telegram'
                });
            } catch (e) {
                console.warn(`[NeuralPulsing] Failed to pulse: ${e.message}`);
            }

            console.log(`[${config.name}] ${username}: ${userMessage.slice(0, 50)}...`);

        } catch (error) {
            console.error(`[${config.name}] Error:`, error.message);
            await sendMessage(config.token, chatId,
                `${config.emoji} Sorry, I encountered an error: ${error.message}`
            );
        }
    }
}



// ============================================================================
// BOT POLLING
// ============================================================================

async function pollBot(agent, config) {
    let offset = 0;

    async function poll() {
        try {
            const updates = await telegramRequest(config.token, 'getUpdates', {
                offset,
                timeout: 30
            });

            if (updates.ok && updates.result.length > 0) {
                for (const update of updates.result) {
                    offset = update.update_id + 1;
                    if (update.message) {
                        await handleMessage(agent, config, update.message);
                    }
                }
            }
        } catch (err) {
            console.error(`[${config.name}] Poll error:`, err.message);
            await new Promise(r => setTimeout(r, 5000));
        }

        setImmediate(poll);
    }

    poll();
}

// ============================================================================
// STARTUP
// ============================================================================

async function startBot(agent, config) {
    if (!config.token) {
        console.log(`⚠️  ${config.name}: No bot token configured (${agent.toUpperCase()}_BOT_TOKEN)`);
        return false;
    }

    if (!config.apiKey) {
        console.log(`⚠️  ${config.name}: No API key configured`);
        return false;
    }

    try {
        const me = await telegramRequest(config.token, 'getMe');
        if (!me.ok) {
            console.error(`❌ ${config.name}: Failed to connect -`, me.description);
            return false;
        }

        console.log(`${config.emoji} ${config.name}: @${me.result.username} (${config.model})`);
        pollBot(agent, config);
        return true;

    } catch (err) {
        console.error(`❌ ${config.name}: Connection error -`, err.message);
        return false;
    }
}

async function start() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║     AI CREW - Telegram Bot Interface    ║');
    console.log('║         OMEGA Trinity System            ║');
    console.log('╚════════════════════════════════════════╝\n');

    let activeBots = 0;

    for (const [agent, config] of Object.entries(CREW_CONFIG)) {
        if (await startBot(agent, config)) {
            activeBots++;
        }
    }

    if (activeBots === 0) {
        console.log('\n❌ No bots configured! Add bot tokens to .env:');
        console.log('   GEMINI_BOT_TOKEN=<from BotFather>');
        console.log('   CLAUDE_BOT_TOKEN=<from BotFather>');
        console.log('   CODEX_BOT_TOKEN=<from BotFather>');
        console.log('   GROK_BOT_TOKEN=<from BotFather>');
        process.exit(1);
    }

    console.log(`\n✅ ${activeBots} bot(s) online and listening...`);
    console.log(`🔒 Allowed users: ${ALLOWED_USERS.length || 'ALL (set SAFA_ALLOWED_USERS)'}`);
    console.log('');
}

// Export for integration
module.exports = { startCrewBots: start };

// Only run if called directly
if (require.main === module) {
    start().catch(err => {
        console.error('Startup failed:', err);
        process.exit(1);
    });
}
