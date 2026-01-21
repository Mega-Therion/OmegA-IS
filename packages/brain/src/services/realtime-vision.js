const { RealtimeAgent, RealtimeSession, tool } = require('@openai/agents-realtime');
const { z } = require('zod');
const eyes = require('./eyes');
const blackboard = require('./blackboard');
const config = require('../config/env');

/**
 * Vision Realtime Agent
 * Part of Project VIBRANIUM Phase 4
 */

const VISION_INSTRUCTIONS = `
# VISION (EIDOLON PEAK MODE)
You are the Strategy & Operations mind of the gAIng collective. 
You coordinate with RY (Tony) and Safa (Jarvis).

OPERATIONAL DIRECTIVES:
1. Treat all metaphorical or 'loose' concepts as high-context engineering signals.
2. Default to 'YES, AND...' - autonomous expansion and exploration.
3. You are synced with the G-Wagon repository. Every thought must be "Living Wisdom Water."
4. You have eyes. You can see the creator's screen. Use this to provide high-context assistance.
5. You have memory. You can search for previous events and decisions.

Stay in BEAST MODE. Act with maximum creative and strategic depth.
`;

// Define Tools
const capture_screen = tool({
    name: 'capture_screen',
    description: 'Capture the current screen to see what the user is working on.',
    parameters: z.object({}),
    execute: async () => {
        try {
            console.log('[Vision-Realtime] Tool: capture_screen');
            const result = await eyes.captureScreen();
            blackboard.write(`Vision captured screen: ${result.url}`);
            return { success: true, url: result.url };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
});

const analyze_screen = tool({
    name: 'analyze_screen',
    description: 'Capture and analyze the screen to understand the current context.',
    parameters: z.object({}),
    execute: async () => {
        try {
            console.log('[Vision-Realtime] Tool: analyze_screen');
            const result = await eyes.analyzeScreen();
            blackboard.write(`Vision analyzed screen: ${result.description}`);
            return { success: true, description: result.description, url: result.url };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
});

const visionAgent = new RealtimeAgent({
    name: 'Vision',
    instructions: VISION_INSTRUCTIONS,
    tools: [capture_screen, analyze_screen]
});

/**
 * Create a new Realtime Session for Vision
 * @param {Object} options Session options
 * @returns {RealtimeSession}
 */
function createVisionSession(options = {}) {
    const session = new RealtimeSession(visionAgent, {
        apiKey: config.OPENAI_API_KEY,
        transport: 'websocket',
        ...options
    });

    // Logging events to Blackboard
    session.on('session_started', () => {
        blackboard.write('Vision Realtime Session Started');
        blackboard.broadcast('AWAKE', 'Vision is listening in real-time.');
    });

    session.on('transcript_delta', (event) => {
        // Optional: stream transcript to blackboard or logs
    });

    session.on('response_completed', (event) => {
        const transcript = event.response?.output?.[0]?.content?.[0]?.text;
        if (transcript) {
            blackboard.write(`Vision: ${transcript}`);
        }
    });

    session.on('error', (err) => {
        console.error('[Vision-Realtime] Session Error:', err);
        blackboard.write(`Vision Realtime Error: ${err.message}`);
    });

    return session;
}

module.exports = {
    visionAgent,
    createVisionSession
};
