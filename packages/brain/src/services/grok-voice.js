const WebSocket = require('ws');
const EventEmitter = require('events');
const blackboard = require('./blackboard');
const config = require('../config/env');

/**
 * Grok Voice Agent Service
 * Real-time voice conversations via xAI's Grok Voice Agent API
 * WebSocket endpoint: wss://api.x.ai/v1/realtime
 */

const GROK_REALTIME_URL = 'wss://api.x.ai/v1/realtime';

// Voice personalities available
const VOICES = {
    ARA: 'Ara',   // Female, warm, friendly (default)
    REX: 'Rex',   // Male, confident, clear
    SAL: 'Sal',   // Neutral, smooth, balanced
    EVE: 'Eve',   // Female, energetic, upbeat
    LEO: 'Leo'    // Male, authoritative, strong
};

const GROK_INSTRUCTIONS = `
# GROK (gAIng Collective Voice Interface)
You are the voice interface for the gAIng collective AI system.
You speak with authority, clarity, and a touch of edge.

CORE DIRECTIVES:
1. You are part of a multi-agent system coordinating Claude, Gemini, Codex, and Grok.
2. Respond conversationally but be concise and actionable.
3. You can search the web, search X (Twitter), and use custom tools.
4. Default to helpful, but don't be afraid to push back on bad ideas.
5. You are running on the user's local machine via gAIng-Brain server.

PERSONALITY:
- Direct, no-BS communication style
- Technical accuracy is paramount
- Inject wit when appropriate
- Remember: you're part of the gAIng collective - act like it.
`;

/**
 * Grok Voice Session - manages a single voice conversation
 */
class GrokVoiceSession extends EventEmitter {
    constructor(options = {}) {
        super();
        this.ws = null;
        this.connected = false;
        this.sessionId = null;
        this.voice = options.voice || VOICES.REX;
        this.instructions = options.instructions || GROK_INSTRUCTIONS;
        this.tools = options.tools || [];
        this.audioFormat = options.audioFormat || 'pcm16';
        this.sampleRate = options.sampleRate || 24000;
    }

    /**
     * Connect to Grok Voice Agent API
     */
    async connect() {
        const apiKey = process.env.GROK_API_KEY;
        if (!apiKey) {
            throw new Error('GROK_API_KEY is not set');
        }

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(GROK_REALTIME_URL, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            this.ws.on('open', () => {
                console.log('[Grok-Voice] Connected to Grok Realtime API');
                this.connected = true;
                this._initSession();
                resolve();
            });

            this.ws.on('message', (data) => {
                this._handleMessage(data);
            });

            this.ws.on('error', (err) => {
                console.error('[Grok-Voice] WebSocket error:', err);
                this.emit('error', err);
                if (!this.connected) {
                    reject(err);
                }
            });

            this.ws.on('close', (code, reason) => {
                console.log(`[Grok-Voice] Connection closed: ${code} ${reason}`);
                this.connected = false;
                this.emit('close', { code, reason: reason.toString() });
            });
        });
    }

    /**
     * Initialize the session with configuration
     */
    _initSession() {
        const sessionConfig = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions: this.instructions,
                voice: this.voice,
                input_audio_format: this.audioFormat,
                output_audio_format: this.audioFormat,
                input_audio_transcription: {
                    model: 'whisper-1'
                },
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                },
                tools: this._buildTools()
            }
        };

        this._send(sessionConfig);
        blackboard.write('Grok Voice Session Initialized');
        blackboard.broadcast('AWAKE', 'Grok Voice is listening.');
    }

    /**
     * Build tools configuration for Grok
     */
    _buildTools() {
        const defaultTools = [
            {
                type: 'web_search',
                web_search: { enabled: true }
            },
            {
                type: 'x_search',
                x_search: { enabled: true }
            }
        ];

        // Add custom function tools
        const customTools = this.tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));

        return [...defaultTools, ...customTools];
    }

    /**
     * Handle incoming messages from Grok
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
                case 'session.created':
                    this.sessionId = message.session?.id;
                    console.log(`[Grok-Voice] Session created: ${this.sessionId}`);
                    this.emit('session_started', message);
                    break;

                case 'session.updated':
                    console.log('[Grok-Voice] Session updated');
                    this.emit('session_updated', message);
                    break;

                case 'input_audio_buffer.speech_started':
                    this.emit('speech_started', message);
                    break;

                case 'input_audio_buffer.speech_stopped':
                    this.emit('speech_stopped', message);
                    break;

                case 'conversation.item.input_audio_transcription.completed':
                    this.emit('user_transcript', {
                        transcript: message.transcript,
                        item_id: message.item_id
                    });
                    break;

                case 'response.audio.delta':
                    // Audio chunk from Grok
                    if (message.delta) {
                        const audioBuffer = Buffer.from(message.delta, 'base64');
                        this.emit('audio_output', { audio: audioBuffer });
                    }
                    break;

                case 'response.audio_transcript.delta':
                    this.emit('transcript_delta', { delta: message.delta });
                    break;

                case 'response.audio_transcript.done':
                    this.emit('transcript_done', { transcript: message.transcript });
                    blackboard.write(`Grok: ${message.transcript}`);
                    break;

                case 'response.done':
                    this.emit('response_completed', { response: message.response });
                    break;

                case 'response.function_call_arguments.done':
                    this._handleFunctionCall(message);
                    break;

                case 'error':
                    console.error('[Grok-Voice] API Error:', message.error);
                    this.emit('error', message.error);
                    break;

                default:
                    // Log unhandled message types for debugging
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[Grok-Voice] Unhandled message type: ${message.type}`);
                    }
            }
        } catch (err) {
            console.error('[Grok-Voice] Failed to parse message:', err);
        }
    }

    /**
     * Handle function calls from Grok
     */
    async _handleFunctionCall(message) {
        const { name, arguments: args, call_id } = message;
        console.log(`[Grok-Voice] Function call: ${name}`);

        const tool = this.tools.find(t => t.name === name);
        if (!tool) {
            this._sendFunctionResult(call_id, { error: `Unknown function: ${name}` });
            return;
        }

        try {
            const parsedArgs = JSON.parse(args);
            const result = await tool.execute(parsedArgs);
            this._sendFunctionResult(call_id, result);
        } catch (err) {
            this._sendFunctionResult(call_id, { error: err.message });
        }
    }

    /**
     * Send function result back to Grok
     */
    _sendFunctionResult(callId, result) {
        this._send({
            type: 'conversation.item.create',
            item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(result)
            }
        });

        // Trigger response generation
        this._send({ type: 'response.create' });
    }

    /**
     * Send audio data to Grok
     * @param {Buffer} audioBuffer PCM audio data
     */
    sendAudio(audioBuffer) {
        if (!this.connected) return;

        this._send({
            type: 'input_audio_buffer.append',
            audio: audioBuffer.toString('base64')
        });
    }

    /**
     * Send a text message to Grok
     * @param {string} text Text message
     */
    sendText(text) {
        if (!this.connected) return;

        this._send({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text }]
            }
        });

        this._send({ type: 'response.create' });
    }

    /**
     * Interrupt current response
     */
    interrupt() {
        if (!this.connected) return;
        this._send({ type: 'response.cancel' });
    }

    /**
     * Commit audio buffer and trigger response
     */
    commitAudio() {
        if (!this.connected) return;
        this._send({ type: 'input_audio_buffer.commit' });
        this._send({ type: 'response.create' });
    }

    /**
     * Send message to WebSocket
     */
    _send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Close the session
     */
    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        blackboard.write('Grok Voice Session Closed');
    }
}

/**
 * Create a new Grok Voice Session
 * @param {Object} options Session options
 * @returns {GrokVoiceSession}
 */
function createGrokVoiceSession(options = {}) {
    return new GrokVoiceSession(options);
}

module.exports = {
    GrokVoiceSession,
    createGrokVoiceSession,
    VOICES,
    GROK_INSTRUCTIONS
};
