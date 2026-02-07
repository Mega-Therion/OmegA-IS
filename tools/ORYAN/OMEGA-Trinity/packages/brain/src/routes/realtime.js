const express = require('express');
const router = express.Router();
const { createRealtimeSession } = require('../services/realtime-multimodal');
const wsManager = require('../services/websocket');

/**
 * Realtime Agent Route
 * Proxies/Manages Realtime sessions
 */

// This isn't a standard HTTP route, but a handler for the WebSocket upgrade in index.js
// However, we can expose some control endpoints here if needed.

router.get('/status', (req, res) => {
    res.json({
        ok: true,
        message: 'Realtime service active',
        providers: {
            openai: Boolean(process.env.OPENAI_API_KEY),
            gemini: Boolean(process.env.GEMINI_API_KEY),
        },
    });
});

/**
 * Handle a new WebSocket connection for the Realtime Agent
 * @param {WebSocket} ws The client WebSocket connection (e.g., from iPhone)
 */
async function handleRealtimeConnection(ws, options = {}) {
    console.log('[Realtime Route] New client connected for realtime multimodal');
    const provider = options.provider || null;
    const session = createRealtimeSession({
        provider,
    });

    // 1. Connect to OpenAI
    try {
        await session.connect();
        console.log('[Realtime Route] Connected to realtime provider');
    } catch (err) {
        console.error('[Realtime Route] Failed to connect to realtime provider:', err);
        ws.close(1011, 'Failed to connect to realtime provider');
        return;
    }

    // 2. Relay from Client to OpenAI
    ws.on('message', (data) => {
        // Assume data is audio buffer or JSON control message
        if (Buffer.isBuffer(data)) {
            session.sendAudio(data);
        } else {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'interrupt') {
                    session.interrupt();
                } else if (msg.type === 'text') {
                    session.sendMessage({ text: msg.text, temperature: msg.temperature });
                } else if (msg.type === 'image') {
                    session.addImage(msg.data, msg.mimeType);
                }
            } catch (e) {
                // Ignore non-json or invalid
            }
        }
    });

    // 3. Relay from OpenAI to Client
    session.on('audio_output', (event) => {
        // Send audio buffer back to client
        if (ws.readyState === 1) { // OPEN
            ws.send(event.audio);
        }
    });

    session.on('transcript_delta', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'transcript', delta: event.delta }));
        }
    });

    session.on('response_delta', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'response_delta', delta: event.text }));
        }
    });

    session.on('response_completed', (event) => {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'response_done', response: event.response }));
        }
    });

    // Cleanup
    ws.on('close', () => {
        console.log('[Realtime Route] Client disconnected');
        session.close();
    });

    session.on('close', () => {
        console.log('[Realtime Route] OpenAI session closed');
        ws.close();
    });
}

module.exports = {
    router,
    handleRealtimeConnection
};
