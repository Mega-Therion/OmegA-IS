const express = require('express');
const router = express.Router();
const { createGrokVoiceSession, VOICES } = require('../services/grok-voice');

/**
 * Grok Voice Agent Route
 * WebSocket handler for real-time voice conversations with Grok
 */

// HTTP status endpoint
router.get('/status', (req, res) => {
    const hasApiKey = !!process.env.GROK_API_KEY;
    res.json({
        ok: hasApiKey,
        message: hasApiKey ? 'Grok Voice service ready' : 'GROK_API_KEY not configured',
        voices: Object.values(VOICES)
    });
});

// List available voices
router.get('/voices', (req, res) => {
    res.json({
        voices: [
            { id: 'Ara', type: 'Female', tone: 'Warm, friendly', description: 'Default voice, balanced and conversational' },
            { id: 'Rex', type: 'Male', tone: 'Confident, clear', description: 'Professional and articulate, ideal for business' },
            { id: 'Sal', type: 'Neutral', tone: 'Smooth, balanced', description: 'Versatile voice suitable for various contexts' },
            { id: 'Eve', type: 'Female', tone: 'Energetic, upbeat', description: 'Engaging and enthusiastic' },
            { id: 'Leo', type: 'Male', tone: 'Authoritative, strong', description: 'Decisive and commanding' }
        ]
    });
});

/**
 * Handle a new WebSocket connection for Grok Voice
 * @param {WebSocket} ws The client WebSocket connection
 * @param {Object} options Connection options from query params
 */
async function handleGrokVoiceConnection(ws, options = {}) {
    console.log('[Grok-Voice Route] New client connected');

    const session = createGrokVoiceSession({
        voice: options.voice || VOICES.REX,
        instructions: options.instructions
    });

    // Connect to Grok
    try {
        await session.connect();
        console.log('[Grok-Voice Route] Connected to Grok Realtime API');

        // Send ready signal to client
        ws.send(JSON.stringify({ type: 'ready', voice: session.voice }));
    } catch (err) {
        console.error('[Grok-Voice Route] Failed to connect to Grok:', err);
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
        ws.close(1011, 'Failed to connect to Grok');
        return;
    }

    // Relay from Client to Grok
    ws.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
            // Binary audio data
            session.sendAudio(data);
        } else {
            try {
                const msg = JSON.parse(data.toString());
                switch (msg.type) {
                    case 'text':
                        session.sendText(msg.text);
                        break;
                    case 'interrupt':
                        session.interrupt();
                        break;
                    case 'commit':
                        session.commitAudio();
                        break;
                    case 'config':
                        // Allow runtime config updates
                        if (msg.voice) session.voice = msg.voice;
                        break;
                }
            } catch (e) {
                // Ignore invalid JSON
            }
        }
    });

    // Relay from Grok to Client
    session.on('audio_output', (event) => {
        if (ws.readyState === 1) { // OPEN
            ws.send(event.audio);
        }
    });

    session.on('transcript_delta', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'transcript_delta', delta: event.delta }));
        }
    });

    session.on('transcript_done', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'transcript', text: event.transcript }));
        }
    });

    session.on('user_transcript', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'user_transcript', text: event.transcript }));
        }
    });

    session.on('speech_started', () => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'listening' }));
        }
    });

    session.on('speech_stopped', () => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'processing' }));
        }
    });

    session.on('response_completed', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'response_done', response: event.response }));
        }
    });

    session.on('error', (err) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'error', message: err.message || err }));
        }
    });

    // Cleanup
    ws.on('close', () => {
        console.log('[Grok-Voice Route] Client disconnected');
        session.close();
    });

    ws.on('error', (err) => {
        console.error('[Grok-Voice Route] WebSocket error:', err);
        session.close();
    });

    session.on('close', () => {
        console.log('[Grok-Voice Route] Grok session closed');
        if (ws.readyState === 1) {
            ws.close();
        }
    });
}

module.exports = {
    router,
    handleGrokVoiceConnection
};
