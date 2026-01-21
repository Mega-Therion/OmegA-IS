const express = require('express');
const router = express.Router();
const { createVisionSession } = require('../services/realtime-vision');
const wsManager = require('../services/websocket');

/**
 * Realtime Agent Route
 * Proxies/Manages Realtime sessions
 */

// This isn't a standard HTTP route, but a handler for the WebSocket upgrade in index.js
// However, we can expose some control endpoints here if needed.

router.get('/status', (req, res) => {
    res.json({ ok: true, message: 'Realtime service active' });
});

/**
 * Handle a new WebSocket connection for the Realtime Agent
 * @param {WebSocket} ws The client WebSocket connection (e.g., from iPhone)
 */
async function handleRealtimeConnection(ws) {
    console.log('[Realtime Route] New client connected for Vision');
    
    const session = createVisionSession();

    // 1. Connect to OpenAI
    try {
        await session.connect();
        console.log('[Realtime Route] Connected to OpenAI Realtime API');
    } catch (err) {
        console.error('[Realtime Route] Failed to connect to OpenAI:', err);
        ws.close(1011, 'Failed to connect to OpenAI');
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
                    session.sendMessage({ type: 'text', text: msg.text });
                } else if (msg.type === 'image') {
                    session.addImage(msg.data);
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
