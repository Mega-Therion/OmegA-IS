/**
 * Safa - Telegram Bot Interface
 *
 * Your voice to the gAIng. Text or voice message Safa,
 * she'll translate it into tasks for the crew.
 *
 * Setup:
 * 1. Message @BotFather on Telegram, create a bot, get the token
 * 2. Add TELEGRAM_BOT_TOKEN to your .env
 * 3. Run: npm run safa
 *
 * Usage:
 * - Text: "Build a login page with Google OAuth"
 * - Voice: Send a voice message (requires OpenAI Whisper API for transcription)
 * - Commands: /status, /agents, /task, /high, /critical, /clear
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:8080';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
const GAING_SHARED_TOKEN = process.env.GAING_SHARED_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Store conversation history per chat
const conversations = new Map();

// Allowed Telegram user IDs (add yours for security)
const ALLOWED_USERS = process.env.SAFA_ALLOWED_USERS
    ? process.env.SAFA_ALLOWED_USERS.split(',').map(id => parseInt(id.trim()))
    : []; // Empty = allow all (not recommended for production)

if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set in .env');
    process.exit(1);
}

// Simple Telegram Bot implementation (no external dependencies)
const https = require('https');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'log.md');

function logToBlock(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const entry = `- ${timestamp} [SAFA] ${message}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(entry.trim());
}

async function telegramRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
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
                    const json = JSON.parse(body);
                    resolve(json);
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

async function sendMessage(chatId, text, options = {}) {
    const MAX_LENGTH = 4000; // Leave buffer for safety
    
    if (text.length <= MAX_LENGTH) {
        return telegramRequest('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            ...options
        });
    }

    // Split into chunks
    const chunks = [];
    for (let i = 0; i < text.length; i += MAX_LENGTH) {
        chunks.push(text.slice(i, i + MAX_LENGTH));
    }

    let lastResult;
    for (const chunk of chunks) {
        lastResult = await telegramRequest('sendMessage', {
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
            ...options
        });
        
        if (!lastResult || !lastResult.ok) {
            console.error('Failed to send message chunk:', lastResult);
            return lastResult; // Stop if a chunk fails
        }
        
        // Small delay to ensure order and respect rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    return lastResult;
}

async function brainRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, BRAIN_URL);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : require('http');

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GAING_SHARED_TOKEN || 'dev-token'}`
            }
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Call OMEGA Gateway for chat (supports mode switching)
async function gatewayChat(userMessage, mode = 'omega') {
    return new Promise((resolve, reject) => {
        const url = new URL('/api/v1/chat', GATEWAY_URL);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : require('http');

        const body = JSON.stringify({
            user: userMessage,
            mode: mode,
            use_memory: true,
            temperature: 0.7
        });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Authorization': `Bearer ${GAING_SHARED_TOKEN || 'dev-token'}`
            }
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.reply) {
                        resolve({ ok: true, message: json.reply, mode: json.mode });
                    } else if (json.detail) {
                        resolve({ ok: false, error: json.detail });
                    } else {
                        resolve({ ok: true, message: data, mode: mode });
                    }
                } catch (e) {
                    resolve({ ok: false, error: `Invalid response: ${data}` });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ ok: false, error: err.message });
        });
        req.write(body);
        req.end();
    });
}

async function submitTask(message, priority = 'medium') {
    try {
        const result = await brainRequest('/safa/intake', 'POST', {
            message,
            priority
        });
        return result;
    } catch (err) {
        console.error('Failed to submit task:', err);
        return { ok: false, error: err.message };
    }
}

async function getTasksSummary() {
    try {
        return await brainRequest('/tasks/summary');
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

async function getAgents() {
    try {
        return await brainRequest('/agents');
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// Voice message transcription (requires OpenAI Whisper)
async function transcribeVoice(fileId) {
    if (!OPENAI_API_KEY) {
        return { ok: false, error: 'Voice transcription requires OPENAI_API_KEY' };
    }

    try {
        // Get file path from Telegram
        const fileInfo = await telegramRequest('getFile', { file_id: fileId });
        if (!fileInfo.ok) {
            return { ok: false, error: 'Could not get voice file' };
        }

        const filePath = fileInfo.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

        // Download the file
        const tempFile = path.join(__dirname, '..', 'temp_voice.ogg');
        await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(tempFile);
            https.get(fileUrl, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', reject);
        });

        // Send to Whisper API
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fs.createReadStream(tempFile));
        form.append('model', 'whisper-1');

        const response = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.openai.com',
                path: '/v1/audio/transcriptions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    ...form.getHeaders()
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            form.pipe(req);
        });

        // Cleanup
        fs.unlinkSync(tempFile);

        return { ok: true, text: response.text };
    } catch (err) {
        console.error('Transcription error:', err);
        return { ok: false, error: err.message };
    }
}

// Call Safa AI with conversation history
async function chatWithGPT(chatId, userMessage) {
    if (!OPENAI_API_KEY) {
        return { ok: false, error: 'OpenAI API key not configured' };
    }

    try {
        // Get or create conversation history
        if (!conversations.has(chatId)) {
            conversations.set(chatId, [
                {
                    role: 'system',
                    content: `You are Safa, the friendly AI interface for the gAIng-Brain multi-agent orchestration system. You help users coordinate tasks across multiple AI agents (Claude, Gemini, Codex, Grok). You're professional but warm, efficient, and always focused on getting things done. When users ask you to do something, acknowledge it and let them know you're on it.`
                }
            ]);
        }

        const history = conversations.get(chatId);

        // Add user message
        history.push({ role: 'user', content: userMessage });

        // Call OpenAI
        const response = await new Promise((resolve, reject) => {
            const data = JSON.stringify({
                model: OPENAI_MODEL,
                messages: history,
                temperature: 0.7,
                max_tokens: 1000
            });

            const req = https.request({
                hostname: 'api.openai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
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

        if (response.error) {
            throw new Error(response.error.message || JSON.stringify(response.error));
        }

        const assistantMessage = response.choices[0].message.content;

        // Add assistant response to history
        history.push({ role: 'assistant', content: assistantMessage });

        // Keep history manageable (last 20 messages + system)
        if (history.length > 21) {
            conversations.set(chatId, [
                history[0], // Keep system message
                ...history.slice(-20) // Keep last 20 messages
            ]);
        }

        return { ok: true, message: assistantMessage };

    } catch (err) {
        console.error('Safa AI error:', err);
        return { ok: false, error: err.message };
    }
}

function isAllowed(userId) {
    if (ALLOWED_USERS.length === 0) return true;
    return ALLOWED_USERS.includes(userId);
}

async function handleMessage(message) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || message.from.first_name || 'Unknown';

    // Security check
    if (!isAllowed(userId)) {
        await sendMessage(chatId, "Sorry, you're not authorized to use Safa.");
        console.log(`Unauthorized access attempt from ${username} (${userId})`);
        return;
    }

    // Handle commands
    if (message.text?.startsWith('/')) {
        const command = message.text.split(' ')[0].toLowerCase();

        switch (command) {
            case '/start':
            case '/help':
                await sendMessage(chatId,
                    `*Hey, I'm Safa* - your gateway to OmegA.\n\n` +
                    `Just chat naturally and the Collective responds. Or DM any member directly:\n\n` +
                    `*Direct Messages:*\n` +
                    `/claude <msg> - DM Claude\n` +
                    `/gemini <msg> - DM Gemini\n` +
                    `/grok <msg> - DM Grok\n` +
                    `/perplexity <msg> - Ask Perplexity\n` +
                    `/deepseek <msg> - DM DeepSeek\n` +
                    `/local <msg> - Talk to Ollama\n\n` +
                    `*System:*\n` +
                    `/clear - Clear conversation\n` +
                    `/status - Queue overview\n` +
                    `/agents - Who's online\n` +
                    `/task <desc> - Submit task\n\n` +
                    `Regular messages → OmegA (the Collective)`
                );
                return;

            case '/clear':
                conversations.delete(chatId);
                await sendMessage(chatId, 'Conversation cleared! Starting fresh.');
                return;

            case '/status':
                const summary = await getTasksSummary();
                if (summary.ok) {
                    const s = summary.summary;
                    await sendMessage(chatId,
                        `*Task Queue Status*\n\n` +
                        `Pending: ${s.pending}\n` +
                        `Planning: ${s.planning}\n` +
                        `In Progress: ${s.in_progress}\n` +
                        `Completed: ${s.completed}\n` +
                        `Failed: ${s.failed}\n\n` +
                        `Total: ${s.total}`
                    );
                } else {
                    await sendMessage(chatId, `Could not get status: ${summary.error}`);
                }
                return;

            case '/agents':
                const agents = await getAgents();
                if (agents.ok) {
                    const list = agents.agents.map(a => {
                        const status = a.status === 'online' ? '[online]' :
                                       a.status === 'busy' ? '[busy]' : '[offline]';
                        return `${status} *${a.name}* - ${a.status}`;
                    }).join('\n');
                    await sendMessage(chatId, `*Agent Status*\n\n${list}`);
                } else {
                    await sendMessage(chatId, `Could not get agents: ${agents.error}`);
                }
                return;

            case '/task':
            case '/high':
            case '/critical':
                const priority = command === '/task' ? 'medium' : command.slice(1);
                const taskText = message.text.slice(command.length).trim();
                if (!taskText) {
                    await sendMessage(chatId, `Usage: ${command} <task description>`);
                    return;
                }
                const hiResult = await submitTask(taskText, priority);
                if (hiResult.ok) {
                    logToBlock(`${priority.toUpperCase()} task from ${username}: ${taskText}`);
                    await sendMessage(chatId,
                        `*${priority.toUpperCase()} Task Queued*\n\n` +
                        `"${taskText.slice(0, 100)}${taskText.length > 100 ? '...' : '"'}\n\n` +
                        `ID: \`${hiResult.task.id.slice(0, 8)}...\``
                    );
                } else {
                    await sendMessage(chatId, `Failed: ${hiResult.error}`);
                }
                return;

            // --- DIRECT AGENT MESSAGES ---
            case '/claude':
            case '/anthropic': {
                const msg = message.text.slice(command.length).trim();
                if (!msg) { await sendMessage(chatId, 'Usage: /claude <message>'); return; }
                await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });
                const result = await gatewayChat(msg, 'claude');
                if (result.ok) {
                    await sendMessage(chatId, `*Claude:*\n${result.message}`);
                } else {
                    await sendMessage(chatId, `Error: ${result.error}`);
                }
                return;
            }

            case '/gemini':
            case '/google': {
                const msg = message.text.slice(command.length).trim();
                if (!msg) { await sendMessage(chatId, 'Usage: /gemini <message>'); return; }
                await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });
                const result = await gatewayChat(msg, 'gemini');
                if (result.ok) {
                    await sendMessage(chatId, `*Gemini:*\n${result.message}`);
                } else {
                    await sendMessage(chatId, `Error: ${result.error}`);
                }
                return;
            }

            case '/grok':
            case '/xai': {
                const msg = message.text.slice(command.length).trim();
                if (!msg) { await sendMessage(chatId, 'Usage: /grok <message>'); return; }
                await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });
                const result = await gatewayChat(msg, 'grok');
                if (result.ok) {
                    await sendMessage(chatId, `*Grok:*\n${result.message}`);
                } else {
                    await sendMessage(chatId, `Error: ${result.error}`);
                }
                return;
            }

            case '/perplexity': {
                const msg = message.text.slice(command.length).trim();
                if (!msg) { await sendMessage(chatId, 'Usage: /perplexity <question>'); return; }
                await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });
                const result = await gatewayChat(msg, 'perplexity');
                if (result.ok) {
                    await sendMessage(chatId, `*Perplexity:*\n${result.message}`);
                } else {
                    await sendMessage(chatId, `Error: ${result.error}`);
                }
                return;
            }

            case '/deepseek': {
                const msg = message.text.slice(command.length).trim();
                if (!msg) { await sendMessage(chatId, 'Usage: /deepseek <message>'); return; }
                await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });
                const result = await gatewayChat(msg, 'deepseek');
                if (result.ok) {
                    await sendMessage(chatId, `*DeepSeek:*\n${result.message}`);
                } else {
                    await sendMessage(chatId, `Error: ${result.error}`);
                }
                return;
            }

            case '/local':
            case '/ollama': {
                const msg = message.text.slice(command.length).trim();
                if (!msg) { await sendMessage(chatId, 'Usage: /local <message>'); return; }
                await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });
                const result = await gatewayChat(msg, 'local');
                if (result.ok) {
                    await sendMessage(chatId, `*Local AI:*\n${result.message}`);
                } else {
                    await sendMessage(chatId, `Error: ${result.error}`);
                }
                return;
            }

            default:
                await sendMessage(chatId, `Unknown command. Try /help`);
                return;
        }
    }

    // Handle voice messages
    if (message.voice) {
        await sendMessage(chatId, 'Listening...');
        const transcription = await transcribeVoice(message.voice.file_id);

        if (!transcription.ok) {
            await sendMessage(chatId, `Could not transcribe: ${transcription.error}`);
            return;
        }

        const text = transcription.text;
        await sendMessage(chatId, `*You said:* "${text}"`);

        // Show typing indicator
        await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

        // Get Safa AI response
        const result = await chatWithGPT(chatId, text);

        if (result.ok) {
            await sendMessage(chatId, result.message);
            logToBlock(`Voice message from ${username}: ${text}`);
        } else {
            await sendMessage(chatId, `Sorry, I encountered an error: ${result.error}`);
        }
        return;
    }

    // Handle regular text messages - always route to OmegA (the Collective)
    if (message.text) {
        const text = message.text.trim();

        if (text.length < 2) {
            await sendMessage(chatId, "Message too short!");
            return;
        }

        // Show typing indicator
        await telegramRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

        // Route to OmegA (Collective)
        const result = await gatewayChat(text, 'omega');

        if (result.ok) {
            await sendMessage(chatId, result.message);
        } else {
            // Fallback to direct GPT if Gateway fails
            logToBlock(`Gateway error, falling back to direct GPT: ${result.error}`);
            const fallback = await chatWithGPT(chatId, text);
            if (fallback.ok) {
                await sendMessage(chatId, `_(Gateway unavailable)_\n\n${fallback.message}`);
            } else {
                await sendMessage(chatId, `Error: ${result.error}\n\nTip: /task to submit to queue`);
            }
        }
    }
}

// Long polling for updates
let offset = 0;

async function pollUpdates() {
    try {
        const updates = await telegramRequest('getUpdates', {
            offset,
            timeout: 30
        });

        if (updates.ok && updates.result.length > 0) {
            for (const update of updates.result) {
                offset = update.update_id + 1;
                if (update.message) {
                    await handleMessage(update.message);
                }
            }
        }
    } catch (err) {
        console.error('Poll error:', err.message);
        await new Promise(r => setTimeout(r, 5000)); // Wait before retry
    }

    // Continue polling
    setImmediate(pollUpdates);
}

// Startup
async function start() {
    console.log('========================================');
    console.log('  SAFA - Telegram Bot Interface');
    console.log('  Safa AI Assistant');
    console.log('========================================\n');

    // Test connection
    const me = await telegramRequest('getMe');
    if (!me.ok) {
        console.error('Failed to connect to Telegram:', me);
        process.exit(1);
    }

    console.log(`Bot: @${me.result.username}`);
    console.log(`Brain: ${BRAIN_URL}`);
    console.log(`Gateway: ${GATEWAY_URL} (OmegA Collective)`);
    console.log(`Allowed users: ${ALLOWED_USERS.length || 'ALL (configure SAFA_ALLOWED_USERS)'}`);
    console.log('\nListening for messages...\n');

    logToBlock(`Telegram bot online (@${me.result.username})`);

    pollUpdates();
}

start().catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
});
